// Map Klasse: Verwaltet das Grid und den aktuellen Raum
import { Enemy } from './enemy.js';
import { Projectile } from './projectile.js';
import { Item } from './item.js';
import { randomNumber, checkCollision } from './utils.js';
import * as UI from './ui.js';
import ROOM_TEMPLATES from './roomPatterns.js';

export class GameMap {
    constructor(player, canvas) {
        this.player = player;
        this.canvas = canvas; 
        this.grid = {}; 
        this.dungeonLayout = {}; 
        this.currentGridX = 0;
        this.currentGridY = 0;
        
        this.targetRoomCount = 15;
    }

    generateDungeon() {
        console.log("Generiere Dungeon...");
        this.grid = {};
        this.dungeonLayout = {};
        
        this.dungeonLayout['0,0'] = { type: 'start', distance: 0, neighbors: {} };
        
        let queue = [{x: 0, y: 0}];
        let roomCount = 1;
        
        // Phase 1: Random Walker Generation
        while (queue.length > 0 && roomCount < this.targetRoomCount) {
            const idx = Math.floor(Math.random() * queue.length);
            const current = queue[idx];
            
            const dirs = [
                { dx: 0, dy: 1, key: 'up' },
                { dx: 0, dy: -1, key: 'down' },
                { dx: -1, dy: 0, key: 'left' },
                { dx: 1, dy: 0, key: 'right' }
            ];
            dirs.sort(() => Math.random() - 0.5); 
            
            let added = false;
            
            for (let d of dirs) {
                const nx = current.x + d.dx;
                const ny = current.y + d.dy;
                const nKey = `${nx},${ny}`;
                
                if (!this.dungeonLayout[nKey]) {
                    this.dungeonLayout[nKey] = {
                        type: 'normal',
                        distance: 0, 
                        neighbors: {}
                    };
                    
                    this.dungeonLayout[`${current.x},${current.y}`].neighbors[d.key] = true;
                    const opp = d.key === 'up' ? 'down' : (d.key === 'down' ? 'up' : (d.key === 'left' ? 'right' : 'left'));
                    this.dungeonLayout[nKey].neighbors[opp] = true;
                    
                    queue.push({x: nx, y: ny});
                    roomCount++;
                    added = true;
                    break; 
                } else {
                    if (Math.random() < 0.1) {
                         this.dungeonLayout[`${current.x},${current.y}`].neighbors[d.key] = true;
                         const opp = d.key === 'up' ? 'down' : (d.key === 'down' ? 'up' : (d.key === 'left' ? 'right' : 'left'));
                         this.dungeonLayout[nKey].neighbors[opp] = true;
                    }
                }
            }
            
            if (!added && Math.random() < 0.5) { 
                queue.splice(idx, 1);
            }
        }
        
        // Phase 2: Distanzen berechnen (BFS) für Boss-Platzierung
        this.calculateDistances();
        
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
            console.log(`Boss Raum gesetzt bei ${bossKey} (Distanz: ${maxDist})`);
        }
        
        console.log(`Dungeon generiert: ${roomCount} Räume.`);
    }
    
    calculateDistances() {
        Object.values(this.dungeonLayout).forEach(r => r.distance = -1);
        
        const queue = [{key: '0,0', dist: 0}];
        this.dungeonLayout['0,0'].distance = 0;
        
        while (queue.length > 0) {
            const current = queue.shift();
            const [cx, cy] = current.key.split(',').map(Number);
            const room = this.dungeonLayout[current.key];
            
            if (room.neighbors.up) this.visitNeighbor(cx, cy + 1, current.dist + 1, queue);
            if (room.neighbors.down) this.visitNeighbor(cx, cy - 1, current.dist + 1, queue);
            if (room.neighbors.left) this.visitNeighbor(cx - 1, cy, current.dist + 1, queue);
            if (room.neighbors.right) this.visitNeighbor(cx + 1, cy, current.dist + 1, queue);
        }
    }
    
    visitNeighbor(x, y, dist, queue) {
        const key = `${x},${y}`;
        if (this.dungeonLayout[key] && this.dungeonLayout[key].distance === -1) {
            this.dungeonLayout[key].distance = dist;
            queue.push({key, dist});
        }
    }

    loadRoom(gx, gy) {
        const key = `${gx},${gy}`;
        
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
            const obstacles = [];
            const projectiles = [];
            const items = [];
            let roomWidth = this.canvas.width;
            let roomHeight = this.canvas.height;
            let template = null;
            
            if (layout.type === 'start') {
                UI.log('Ein sicherer Ort.');
                const tpl = ROOM_TEMPLATES['1_Door'][0]; 
                this.parseTemplate(tpl.grid, enemies, obstacles, true); 
                roomWidth = this.lastParsedWidth;
                roomHeight = this.lastParsedHeight;
                
            } else if (layout.type === 'boss') {
                UI.log('BOSS RAUM! Mach dich bereit!', '#ff0000');
                const templates = ROOM_TEMPLATES['BOSS'];
                template = templates[Math.floor(Math.random() * templates.length)];
                this.parseTemplate(template.grid, enemies, obstacles);
                roomWidth = this.lastParsedWidth;
                roomHeight = this.lastParsedHeight;
                
            } else {
                const neighborCount = Object.keys(layout.neighbors).length;
                
                if (neighborCount === 1 && Math.random() < 0.1) {
                    UI.log('Du hast einen versteckten Raum gefunden!', '#ffd700');
                    const templates = ROOM_TEMPLATES['SECRET'];
                    template = templates[Math.floor(Math.random() * templates.length)];
                } else {
                    let templateKey = '1_Door';
                    if (neighborCount === 2) templateKey = '2_Doors';
                    if (neighborCount === 3) templateKey = '3_Doors';
                    if (neighborCount === 4) templateKey = '4_Doors';
                    
                    const templates = ROOM_TEMPLATES[templateKey];
                    
                    const largeTemplates = templates.filter(t => t.size !== '1x1');
                    const normalTemplates = templates.filter(t => t.size === '1x1');
                    
                    if (largeTemplates.length > 0 && Math.random() < 0.2) {
                        template = largeTemplates[Math.floor(Math.random() * largeTemplates.length)];
                    } else {
                        if (normalTemplates.length > 0) {
                            template = normalTemplates[Math.floor(Math.random() * normalTemplates.length)];
                        } else {
                            template = templates[Math.floor(Math.random() * templates.length)];
                        }
                    }
                }
                
                this.parseTemplate(template.grid, enemies, obstacles);
                roomWidth = this.lastParsedWidth;
                roomHeight = this.lastParsedHeight;
                
                if (enemies.length > 0) UI.log(`${enemies.length} Gegner lauern hier.`);
            }
            
            this.grid[key] = {
                enemies: enemies,
                obstacles: obstacles,
                projectiles: projectiles,
                items: items,
                visited: true,
                layout: layout,
                width: roomWidth,
                height: roomHeight
            };
        }

        this.currentGridX = gx;
        this.currentGridY = gy;
        this.currentRoom = this.grid[key];
        this.currentRoom.visited = true;
    }
    
    parseTemplate(grid, enemies, obstacles, forceNoEnemies = false) {
        const rows = grid.length; 
        const cols = grid[0].length;
        
        const wall = 20;
        
        const screenW = this.canvas.width;
        const screenH = this.canvas.height;
        
        const baseCols = 13;
        const baseRows = 9;
        
        const tileW = (screenW - 2 * wall) / baseCols;
        const tileH = (screenH - 2 * wall) / baseRows;
        
        const roomW = cols * tileW + 2 * wall;
        const roomH = rows * tileH + 2 * wall;
        
        this.lastParsedWidth = roomW;
        this.lastParsedHeight = roomH;
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                const x = wall + c * tileW;
                const y = wall + r * tileH;
                
                if (cell === 1 || cell === 9) {
                    obstacles.push({
                        x: x,
                        y: y,
                        width: tileW,
                        height: tileH,
                        type: cell === 9 ? 'void' : 'wall'
                    });
                } else if (!forceNoEnemies) {
                    if (cell === 2) { 
                        const ex = x + tileW/2 - 20; 
                        const ey = y + tileH/2 - 20;
                        const enemy = new Enemy(1, ex, ey);
                        enemy.type = Math.random() < 0.3 ? 'ranged' : 'melee';
                        enemies.push(enemy);
                    } else if (cell === 5) {
                        const ex = x + tileW/2 - 35; 
                        const ey = y + tileH/2 - 35;
                        const boss = new Enemy(5, ex, ey, true);
                        boss.type = 'melee'; 
                        enemies.push(boss);
                    }
                }
            }
        }
        
        return { width: roomW, height: roomH };
    }

    switchRoom(direction) {
        let newGx = this.currentGridX;
        let newGy = this.currentGridY;
        
        switch(direction) {
            case 'up': newGy++; break;
            case 'down': newGy--; break;
            case 'left': newGx--; break;
            case 'right': newGx++; break;
        }
        
        this.loadRoom(newGx, newGy);
        
        const w = this.currentRoom.width;
        const h = this.currentRoom.height;
        const spawnMargin = 60; 
        const playerSize = this.player.width;

        switch(direction) {
            case 'up':
                this.player.x = w / 2 - playerSize / 2;
                this.player.y = h - spawnMargin - playerSize;
                break;
            case 'down':
                this.player.x = w / 2 - playerSize / 2;
                this.player.y = spawnMargin;
                break;
            case 'left':
                this.player.x = w - spawnMargin - playerSize;
                this.player.y = h / 2 - playerSize / 2;
                break;
            case 'right':
                this.player.x = spawnMargin;
                this.player.y = h / 2 - playerSize / 2;
                break;
        }

        this.player.interactionTarget = null;
    }
    
    getDoorAt(x, y) {
        if (!this.currentRoom || this.currentRoom.enemies.length > 0) return null;
        const layout = this.currentRoom.layout;
        const w = this.currentRoom.width; 
        const h = this.currentRoom.height;
        const doorSize = 100;
        
        if (layout.neighbors.up && y <= 50 && x >= w/2 - doorSize/2 && x <= w/2 + doorSize/2) return 'up';
        if (layout.neighbors.down && y >= h - 50 && x >= w/2 - doorSize/2 && x <= w/2 + doorSize/2) return 'down';
        if (layout.neighbors.left && x <= 50 && y >= h/2 - doorSize/2 && y <= h/2 + doorSize/2) return 'left';
        if (layout.neighbors.right && x >= w - 50 && y >= h/2 - doorSize/2 && y <= h/2 + doorSize/2) return 'right';
        
        return null;
    }

    update(dt) {
        if (!this.currentRoom) return;
        
        // Player Collision
        this.checkPlayerCollisions();

        // Projectiles Update
        if (this.currentRoom.projectiles) {
            this.currentRoom.projectiles.forEach(p => p.update(dt, this));
            this.currentRoom.projectiles = this.currentRoom.projectiles.filter(p => p.active);
        }

        // Items Update
        if (this.currentRoom.items) {
            this.currentRoom.items = this.currentRoom.items.filter(item => {
                if (checkCollision(this.player, item)) {
                    this.pickupItem(item);
                    return false;
                }
                return true;
            });
        }

        // Enemies Update & Collision
        this.currentRoom.enemies.forEach(enemy => {
            enemy.update(dt, this.player, this);
            this.checkEntityCollision(enemy); // Auch Gegner kollidieren mit Wänden
        });

        this.currentRoom.enemies = this.currentRoom.enemies.filter(e => {
            if (e.isDead()) {
                const expReward = e.expReward !== undefined ? e.expReward : (20 + e.level * 5);
                this.player.gainGold(e.goldReward);
                this.player.gainExp(expReward);
                UI.log(`${e.name} wurde besiegt! +${e.goldReward} Gold, +${expReward} EXP.`, '#90ee90');
                
                this.trySpawnItem(e.x, e.y);

                if (this.player.interactionTarget === e) {
                    this.player.interactionTarget = null;
                }
                return false;
            }
            return true;
        });
    }

    addProjectile(proj) {
        if (this.currentRoom && this.currentRoom.projectiles) {
            this.currentRoom.projectiles.push(proj);
        }
    }

    trySpawnItem(x, y) {
        if (Math.random() < 0.2) { 
            const types = ['weapon_sword', 'weapon_wand', 'potion_hp'];
            const type = types[Math.floor(Math.random() * types.length)];
            const item = new Item(x, y, type);
            if (this.currentRoom.items) this.currentRoom.items.push(item);
            console.log("Item dropped:", type);
        }
    }

    pickupItem(item) {
        if (item.type === 'potion_hp') {
            this.player.heal(30);
            UI.log("Trank gefunden! +30 HP", "#00ff00");
        } else if (item.type === 'weapon_sword') {
            this.player.switchWeapon('sword');
            UI.log("Schwert ausgerüstet!", "#ffff00");
        } else if (item.type === 'weapon_wand') {
            this.player.switchWeapon('wand');
            UI.log("Zauberstab ausgerüstet!", "#00ffff");
        }
    }

    // Allgemeine Kollision für alle Entities (Player & Enemies)
    checkEntityCollision(ent) {
        const w = this.currentRoom.width; 
        const h = this.currentRoom.height;
        const wall = 20; 
        
        // Grenzen / Walls (Clamping)
        if (ent.x < wall) ent.x = wall;
        if (ent.x + ent.width > w - wall) ent.x = w - wall - ent.width;
        if (ent.y < wall) ent.y = wall;
        if (ent.y + ent.height > h - wall) ent.y = h - wall - ent.height;
        
        // Hindernisse
        if (this.currentRoom.obstacles) {
            for (let obs of this.currentRoom.obstacles) {
                if (checkCollision(ent, obs)) {
                    this.resolveAABB(ent, obs);
                }
            }
        }
    }

    // Spezielle Logik für Player (Türen)
    checkPlayerCollisions() {
        const p = this.player;
        
        // Zuerst Doors checken (bevor wir clamped werden)
        if (this.checkDoors(p)) return;
        
        // Dann normale Kollision (Wände/Steine)
        this.checkEntityCollision(p);
    }
    
    checkDoors(p) {
        const w = this.currentRoom.width; 
        const h = this.currentRoom.height;
        const wall = 20; 
        const doorW = 100; 
        
        const layout = this.currentRoom.layout;
        const isClear = this.currentRoom.enemies.length === 0;

        // Links
        if (p.x < wall) {
            const inDoorRange = p.y + p.height/2 > h/2 - doorW/2 && p.y + p.height/2 < h/2 + doorW/2;
            if (layout.neighbors.left && isClear && inDoorRange) {
                this.switchRoom('left');
                return true;
            }
        }
        // Rechts
        if (p.x + p.width > w - wall) {
            const inDoorRange = p.y + p.height/2 > h/2 - doorW/2 && p.y + p.height/2 < h/2 + doorW/2;
            if (layout.neighbors.right && isClear && inDoorRange) {
                this.switchRoom('right');
                return true;
            }
        }
        // Oben
        if (p.y < wall) {
            const inDoorRange = p.x + p.width/2 > w/2 - doorW/2 && p.x + p.width/2 < w/2 + doorW/2;
            if (layout.neighbors.up && isClear && inDoorRange) {
                this.switchRoom('up');
                return true;
            }
        }
        // Unten
        if (p.y + p.height > h - wall) {
            const inDoorRange = p.x + p.width/2 > w/2 - doorW/2 && p.x + p.width/2 < w/2 + doorW/2;
            if (layout.neighbors.down && isClear && inDoorRange) {
                this.switchRoom('down');
                return true;
            }
        }
        return false;
    }
    
    resolveAABB(p, rect) {
        const overlapX = (p.width + rect.width) / 2 - Math.abs((p.x + p.width/2) - (rect.x + rect.width/2));
        const overlapY = (p.height + rect.height) / 2 - Math.abs((p.y + p.height/2) - (rect.y + rect.height/2));
        
        if (overlapX < overlapY) {
            if (p.x < rect.x) {
                p.x -= overlapX;
            } else {
                p.x += overlapX;
            }
        } else {
            if (p.y < rect.y) {
                p.y -= overlapY;
            } else {
                p.y += overlapY;
            }
        }
    }

    getEnemies() {
        return this.currentRoom ? this.currentRoom.enemies : [];
    }
    
    getObstacles() {
        return this.currentRoom ? this.currentRoom.obstacles : [];
    }

    getProjectiles() {
        return this.currentRoom ? this.currentRoom.projectiles : [];
    }

    getItems() {
        return this.currentRoom ? this.currentRoom.items : [];
    }
}
