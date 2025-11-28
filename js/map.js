// Map Klasse: Verwaltet das Grid und den aktuellen Raum
import { Enemy } from './enemy.js';
import { randomNumber } from './utils.js';
import * as UI from './ui.js';

export class GameMap {
    constructor(player, canvas) {
        this.player = player;
        this.canvas = canvas; 
        this.grid = {}; 
        this.currentGridX = 0;
        this.currentGridY = 0;
    }

    /**
     * Lädt einen Raum basierend auf Grid-Koordinaten.
     */
    loadRoom(gx, gy) {
        const key = `${gx},${gy}`;
        
        console.log(`Loading Room ${key}... Canvas Size: ${this.canvas.width}x${this.canvas.height}`);

        if (!this.grid[key]) {
            const enemies = [];
            const w = this.canvas.width;
            const h = this.canvas.height;

            const spawnBoss = (gx !== 0 || gy !== 0) && Math.random() < 0.15;

            if (spawnBoss) {
                const paddingX = 120;
                const paddingY = 170;
                const safeW = Math.max(w, 500);
                const safeH = Math.max(h, 500);
                const ex = randomNumber(paddingX, safeW - paddingX - 70);
                const ey = randomNumber(paddingY, safeH - paddingY - 70); 
                const boss = new Enemy(5, ex, ey, true);
                enemies.push(boss);
                UI.log('Ein mächtiger Boss erscheint!', '#ff8800');
            } else {
                // Immer kleine Schleime (fix Level 1)
                const enemyCount = this.pickEnemyCount();
                UI.log(`Es erscheinen ${enemyCount} Gegner im Gebiet.`);
                
                for (let i = 0; i < enemyCount; i++) {
                    // Sicherstellen, dass Koordinaten im sichtbaren Bereich sind
                    const paddingX = 100;
                    const paddingY = 150; // Mehr Platz oben/unten für UI
                    
                    // Fallback falls Canvas zu klein (z.B. Test-Environment)
                    const safeW = Math.max(w, 400);
                    const safeH = Math.max(h, 400);

                    const ex = randomNumber(paddingX, safeW - paddingX - 40);
                    const ey = randomNumber(paddingY, safeH - paddingY - 40); 
                    
                    const enemy = new Enemy(1, ex, ey);
                    enemies.push(enemy);
                    console.log(`Spawned Enemy at ${ex}, ${ey}`);
                }
            }
            
            this.grid[key] = {
                enemies: enemies,
                visited: true
            };
        }

        this.currentGridX = gx;
        this.currentGridY = gy;
        this.currentRoom = this.grid[key];
        // Markiere Raum als besucht, falls er schon existierte
        if (this.currentRoom) {
            this.currentRoom.visited = true;
        }
        
        // Debug Log
        console.log(`Current Room Enemies:`, this.currentRoom.enemies);
    }

    pickEnemyCount() {
        // Gewichtete Wahrscheinlichkeiten für 1-5 Gegner, Bias auf 3
        // 1:10%, 2:20%, 3:40%, 4:20%, 5:10%
        const roll = Math.random();
        if (roll < 0.10) return 1;
        if (roll < 0.30) return 2;
        if (roll < 0.70) return 3;
        if (roll < 0.90) return 4;
        return 5;
    }

    switchRoom(direction) {
        let newGx = this.currentGridX;
        let newGy = this.currentGridY;
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        const margin = 80; // Etwas mehr Abstand vom Rand beim Spawn
        const playerSize = this.player.width;

        switch(direction) {
            case 'up':
                newGy++;
                this.player.x = w / 2 - playerSize / 2;
                this.player.y = h - margin - playerSize - 100;
                break;
            case 'down':
                newGy--;
                this.player.x = w / 2 - playerSize / 2;
                this.player.y = margin + 100;
                break;
            case 'left':
                newGx--;
                this.player.x = w - margin - playerSize;
                this.player.y = h / 2 - playerSize / 2;
                break;
            case 'right':
                newGx++;
                this.player.x = margin;
                this.player.y = h / 2 - playerSize / 2;
                break;
        }

        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
        this.player.isMoving = false;
        this.player.interactionTarget = null;

        this.loadRoom(newGx, newGy);
    }

    update(dt) {
        if (!this.currentRoom) return;

        this.currentRoom.enemies.forEach(enemy => {
            enemy.update(dt, this.player);
        });

        this.currentRoom.enemies = this.currentRoom.enemies.filter(e => {
            if (e.isDead()) {
                const expReward = e.expReward !== undefined ? e.expReward : (20 + e.level * 5);
                this.player.gainGold(e.goldReward);
                this.player.gainExp(expReward);
                UI.log(`${e.name} wurde besiegt! +${e.goldReward} Gold, +${expReward} EXP.`, '#90ee90');
                
                if (this.player.interactionTarget === e) {
                    this.player.interactionTarget = null;
                }
                return false;
            }
            return true;
        });
    }

    getEnemies() {
        return this.currentRoom ? this.currentRoom.enemies : [];
    }
}
