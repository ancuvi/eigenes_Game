// Map Klasse: Verwaltet das Grid und den aktuellen Raum
import { Enemy } from './enemy.js';
import { randomNumber } from './utils.js';
import * as UI from './ui.js';

export class GameMap {
    constructor(player, canvas) {
        this.player = player;
        this.canvas = canvas; 
        this.grid = {}; // Speichert generierte/besuchte Räume
        this.dungeonLayout = {}; // Speichert das statische Layout
        this.currentGridX = 0;
        this.currentGridY = 0;
        
        // Konstanten für das Dungeon
        this.targetRoomCount = 15;
    }

    /**
     * Generiert einen festen Dungeon-Layout.
     */
    generateDungeon() {
        console.log("Generiere Dungeon...");
        this.grid = {};
        this.dungeonLayout = {};
        
        // Queue für BFS/Expansion
        let queue = [{x: 0, y: 0, dist: 0}];
        this.dungeonLayout['0,0'] = { type: 'start', distance: 0, neighbors: {} };
        
        let roomCount = 1;
        
        while (queue.length > 0 && roomCount < this.targetRoomCount) {
            // Zufällig einen Raum aus der Queue nehmen für organische Struktur
            const idx = Math.floor(Math.random() * queue.length);
            const current = queue[idx];
            // Wir entfernen es nicht sofort, damit wir von hier mehrfach abzweigen können,
            // aber wir müssen aufpassen, dass wir nicht stecken bleiben.
            // Besser: Wir nehmen den Raum und versuchen, einen Nachbarn anzufügen.
            
            const dirs = [
                { dx: 0, dy: 1, key: 'up' },
                { dx: 0, dy: -1, key: 'down' },
                { dx: -1, dy: 0, key: 'left' },
                { dx: 1, dy: 0, key: 'right' }
            ];
            
            // Mische Richtungen
            dirs.sort(() => Math.random() - 0.5);
            
            let added = false;
            
            for (let d of dirs) {
                const nx = current.x + d.dx;
                const ny = current.y + d.dy;
                const nKey = `${nx},${ny}`;
                
                if (!this.dungeonLayout[nKey]) {
                    // Neuer Raum
                    this.dungeonLayout[nKey] = {
                        type: 'normal',
                        distance: current.dist + 1,
                        neighbors: {}
                    };
                    
                    // Verknüpfe
                    this.dungeonLayout[`${current.x},${current.y}`].neighbors[d.key] = true;
                    // Rückverknüpfung (Gegenrichtung)
                    const opp = d.key === 'up' ? 'down' : (d.key === 'down' ? 'up' : (d.key === 'left' ? 'right' : 'left'));
                    this.dungeonLayout[nKey].neighbors[opp] = true;
                    
                    queue.push({x: nx, y: ny, dist: current.dist + 1});
                    roomCount++;
                    added = true;
                    break; // Nur einen Raum pro Step hinzufügen
                } else {
                    // Raum existiert schon, evtl. verbinden? (Loop closure)
                    // Für "Binding of Isaac"-Feel sind Loops okay, aber selten.
                    if (Math.random() < 0.1) {
                         this.dungeonLayout[`${current.x},${current.y}`].neighbors[d.key] = true;
                         const opp = d.key === 'up' ? 'down' : (d.key === 'down' ? 'up' : (d.key === 'left' ? 'right' : 'left'));
                         this.dungeonLayout[nKey].neighbors[opp] = true;
                    }
                }
            }
            
            if (!added) {
                // Wenn von diesem Raum nichts mehr wachsen kann (oder Zufall), entfernen
                queue.splice(idx, 1);
            }
        }
        
        // Boss Raum bestimmen (weiteste Distanz)
        let maxDist = -1;
        let bossKey = null;
        Object.entries(this.dungeonLayout).forEach(([k, room]) => {
            if (room.distance > maxDist) {
                maxDist = room.distance;
                bossKey = k;
            }
        });
        if (bossKey && bossKey !== '0,0') {
            this.dungeonLayout[bossKey].type = 'boss';
        }
        
        console.log(`Dungeon generiert: ${roomCount} Räume. Boss bei ${bossKey}`);
    }

    /**
     * Lädt einen Raum basierend auf Grid-Koordinaten.
     */
    loadRoom(gx, gy) {
        const key = `${gx},${gy}`;
        
        // Stelle sicher, dass Dungeon existiert
        if (Object.keys(this.dungeonLayout).length === 0) {
            this.generateDungeon();
        }

        const layout = this.dungeonLayout[key];
        if (!layout) {
            console.error(`Raum ${key} existiert nicht im Dungeon Layout!`);
            return;
        }
        
        console.log(`Loading Room ${key} (${layout.type})...`);

        if (!this.grid[key]) {
            const enemies = [];
            const w = this.canvas.width;
            const h = this.canvas.height;
            const paddingX = 100;
            const paddingY = 150;
            const safeW = Math.max(w, 400);
            const safeH = Math.max(h, 400);

            if (layout.type === 'start') {
                // Keine Gegner
                UI.log('Ein sicherer Ort.');
            } else if (layout.type === 'boss') {
                const ex = w / 2 - 35; // Mitte-ish
                const ey = h / 2 - 35; 
                const boss = new Enemy(5, ex, ey, true);
                enemies.push(boss);
                UI.log('BOSS RAUM! Mach dich bereit!', '#ff0000');
            } else {
                // Normaler Raum
                const enemyCount = this.pickEnemyCount();
                // UI Log nur wenn wirklich Gegner da sind
                if (enemyCount > 0) UI.log(`${enemyCount} Gegner lauern hier.`);
                
                for (let i = 0; i < enemyCount; i++) {
                    const ex = randomNumber(paddingX, safeW - paddingX - 40);
                    const ey = randomNumber(paddingY, safeH - paddingY - 40); 
                    const enemy = new Enemy(1, ex, ey);
                    enemies.push(enemy);
                }
            }
            
            this.grid[key] = {
                enemies: enemies,
                visited: true,
                layout: layout // Referenz auf Layout für Türen
            };
        }

        this.currentGridX = gx;
        this.currentGridY = gy;
        this.currentRoom = this.grid[key];
        this.currentRoom.visited = true;
        
        // Debug Log
        console.log(`Current Room Enemies:`, this.currentRoom.enemies.length);
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
        // Bei Dungeon Crawler: Spieler spawnt direkt "vor" der Tür, durch die er kam
        // Wir nehmen an, Wände sind ca 20px dick, Türen sind am Rand.
        const spawnMargin = 60; 
        const playerSize = this.player.width;

        switch(direction) {
            case 'up':
                newGy++;
                this.player.x = w / 2 - playerSize / 2;
                this.player.y = h - spawnMargin - playerSize;
                break;
            case 'down':
                newGy--;
                this.player.x = w / 2 - playerSize / 2;
                this.player.y = spawnMargin;
                break;
            case 'left':
                newGx--;
                this.player.x = w - spawnMargin - playerSize;
                this.player.y = h / 2 - playerSize / 2;
                break;
            case 'right':
                newGx++;
                this.player.x = spawnMargin;
                this.player.y = h / 2 - playerSize / 2;
                break;
        }

        // Velocity beibehalten für flüssigen Übergang
        // this.player.targetX = this.player.x;
        // this.player.targetY = this.player.y;
        // this.player.isMoving = false;
        this.player.interactionTarget = null;

        this.loadRoom(newGx, newGy);
    }
    
    getDoorAt(x, y) {
        if (!this.currentRoom || this.currentRoom.enemies.length > 0) return null;
        
        const layout = this.currentRoom.layout;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const doorSize = 100; // Muss mit Renderer übereinstimmen
        const wallThick = 20;

        // Prüfen ob Klick auf Tür-Area war
        
        // Top Door
        if (layout.neighbors.up) {
            if (y <= 50 && x >= w/2 - doorSize/2 && x <= w/2 + doorSize/2) return 'up';
        }
        
        // Bottom Door
        if (layout.neighbors.down) {
            if (y >= h - 50 && x >= w/2 - doorSize/2 && x <= w/2 + doorSize/2) return 'down';
        }
        
        // Left Door
        if (layout.neighbors.left) {
            if (x <= 50 && y >= h/2 - doorSize/2 && y <= h/2 + doorSize/2) return 'left';
        }
        
        // Right Door
        if (layout.neighbors.right) {
            if (x >= w - 50 && y >= h/2 - doorSize/2 && y <= h/2 + doorSize/2) return 'right';
        }
        
        return null;
    }

    update(dt) {
        if (!this.currentRoom) return;
        
        // Kollisionen prüfen (Wände/Türen)
        this.checkCollisions();

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

    checkCollisions() {
        const p = this.player;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const wall = 20; // Wanddicke
        const doorW = 100; // Türbreite
        
        const layout = this.currentRoom.layout;
        const isClear = this.currentRoom.enemies.length === 0;

        // Links
        if (p.x < wall) {
            // Check Door
            const inDoorRange = p.y + p.height/2 > h/2 - doorW/2 && p.y + p.height/2 < h/2 + doorW/2;
            if (layout.neighbors.left && isClear && inDoorRange) {
                this.switchRoom('left');
                return;
            }
            p.x = wall;
        }
        
        // Rechts
        if (p.x + p.width > w - wall) {
            const inDoorRange = p.y + p.height/2 > h/2 - doorW/2 && p.y + p.height/2 < h/2 + doorW/2;
            if (layout.neighbors.right && isClear && inDoorRange) {
                this.switchRoom('right');
                return;
            }
            p.x = w - wall - p.width;
        }
        
        // Oben
        if (p.y < wall) {
            const inDoorRange = p.x + p.width/2 > w/2 - doorW/2 && p.x + p.width/2 < w/2 + doorW/2;
            if (layout.neighbors.up && isClear && inDoorRange) {
                this.switchRoom('up');
                return;
            }
            p.y = wall;
        }
        
        // Unten
        if (p.y + p.height > h - wall) {
            const inDoorRange = p.x + p.width/2 > w/2 - doorW/2 && p.x + p.width/2 < w/2 + doorW/2;
            if (layout.neighbors.down && isClear && inDoorRange) {
                this.switchRoom('down');
                return;
            }
            p.y = h - wall - p.height;
        }
    }

    getEnemies() {
        return this.currentRoom ? this.currentRoom.enemies : [];
    }
}
