// Map Klasse: Verwaltet das Grid und den aktuellen Raum
import { Enemy } from './enemy.js';
import { Projectile } from './projectile.js';
import { Item } from './item.js';
import { randomNumber, checkCollision } from './utils.js';
import { BalanceManager } from './balanceManager.js';
import * as UI from './ui.js';
import PATTERN_REGISTRY, { makeFallbackPattern, DOOR_MASK, maskFromNeighbors } from './roomPatterns/index.js';
import { RoomDistributionManager, FLOOR_CONFIG } from './roomDistributionManager.js';
import { ITEM_DEFINITIONS } from './items/itemData.js';
import { SaveManager } from './saveManager.js';
import { TILE, TILE_SIZE } from './constants.js';

// Utility: Fisher-Yates Shuffle
function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Utility: Difficulty label from enemy count
function difficultyFromCount(count) {
    if (count <= 2) return 'Easy';
    if (count === 3) return 'Standard';
    return 'Hard';
}

// Spawn System based on pattern spawn points + difficulty
function spawnEnemiesInRoom(spawnPointsWorld, difficulty, stage, floor, forcedCount) {
    const counts = { Easy: 2, Standard: 3, Hard: 4 };
    let count = forcedCount ?? counts[difficulty] ?? counts.Standard;
    count = Math.min(count, spawnPointsWorld.length);

    const shuffled = shuffleInPlace([...spawnPointsWorld]).slice(0, count);
    const enemies = [];

    shuffled.forEach((pt) => {
        const stats = BalanceManager.getEnemyStats(stage, floor, false, pt.isBoss);
        const enemy = new Enemy(stats, pt.x, pt.y, pt.isBoss);
        enemy.rank = pt.isBoss ? 'boss' : 'normal';
        enemy.type = Math.random() < 0.3 ? 'ranged' : 'melee';
        enemies.push(enemy);
    });

    return enemies;
}

// Pattern selection by neighbor mask with fallback carving
function getRoomForGridPosition(dungeonLayout, gx, gy, typeOverride = null) {
    const layout = dungeonLayout[`${gx},${gy}`];
    const type = typeOverride
        || (layout.type === 'boss' ? 'Boss'
        : layout.type === 'start' ? 'Start'
        : layout.type === 'treasure' ? 'Treasure'
        : 'Normal');
    const requiredMask = maskFromNeighbors(layout.neighbors);

    const candidates = PATTERN_REGISTRY.filter(
        (p) => p.type === type && p.doorMask === requiredMask
    );
    if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    return makeFallbackPattern(requiredMask, type);
}

export class GameMap {
    constructor(player, canvas) {
        this.player = player;
        this.canvas = canvas; 
        this.grid = {}; 
        this.dungeonLayout = {}; 
        this.currentGridX = 0;
        this.currentGridY = 0;
        
        this.targetRoomCount = FLOOR_CONFIG.ROOMS_PER_FLOOR + 2; // Start + 8 weitere + Boss-platzhalter
        this.stage = 1;
        this.floor = 1;
        this.roomDistributor = new RoomDistributionManager();
        this.onStageComplete = null; // callback vom Game
    }
    
    setStage(stage, floor) {
        this.stage = stage;
        this.floor = floor;
    }

    generateDungeon() {
        console.log("Generiere Dungeon...");
        this.grid = {};
        this.dungeonLayout = {};
        
            this.dungeonLayout['0,0'] = { type: 'start', category: 'Start', distance: 0, neighbors: {} };
        
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

        // Raum-Typen pro Floor verteilen (Deck-System)
        this.assignRoomTypes();
        
        console.log(`Dungeon generiert: ${roomCount} Räume.`);
    }

    assignRoomTypes() {
        const deck = this.roomDistributor.generateFloorRoomTypes(this.stage, this.floor);
        const normals = Object.entries(this.dungeonLayout).filter(([k, v]) => v.type !== 'start' && v.type !== 'boss');
        if (normals.length === 0) return;
        const pool = [...deck];
        // Falls weniger Räume als Pool-Einträge vorhanden sind, trimmen
        if (pool.length > normals.length) pool.length = normals.length;

        // Shuffle normals für zufällige Zuordnung
        pool.sort(() => Math.random() - 0.5);
        normals.sort(() => Math.random() - 0.5);

        normals.forEach(([key, room], idx) => {
            const entry = pool[idx % pool.length];
            if (!entry) return;
            room.category = entry.type; // Combat / Treasure / Event / Empty
            if (entry.type === 'Combat') {
                room.type = 'normal';
                room.combatDifficulty = this.roomDistributor.drawDifficulty(this.stage);
            } else if (entry.type === 'Treasure') {
                room.type = 'treasure';
            } else if (entry.type === 'Event' || entry.type === 'Empty') {
                room.type = 'normal';
            }
        });
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
            const projectiles = [];
            const items = [];

            const isTreasure = layout.type === 'treasure';
            const patternTypeOverride = isTreasure ? 'Treasure' : null;

            const pattern = getRoomForGridPosition(this.dungeonLayout, gx, gy, patternTypeOverride);
            UI.log(`Pattern: ${pattern.id} (mask ${pattern.doorMask})`, '#999999');
            if (pattern.type === 'Start') UI.log('Ein sicherer Ort.');
            if (pattern.type === 'Boss') UI.log('BOSS RAUM! Mach dich bereit!', '#ff0000');

            const forceNoEnemies = (pattern.type === 'Start' || pattern.type === 'Treasure' || layout.category === 'Event' || layout.category === 'Empty');
            const parsed = this.parsePattern(pattern, forceNoEnemies);

            let enemies = [];
            if (!forceNoEnemies) {
                const difficulty = layout.combatDifficulty || 'Standard';
                const forcedCountMap = { Easy: 2, Standard: 3, Hard: 4 };
                enemies = spawnEnemiesInRoom(parsed.spawnPointsWorld, difficulty, this.stage, this.floor, forcedCountMap[difficulty]);
                if (enemies.length > 0) UI.log(`${enemies.length} Gegner lauern hier.`);
            }

            if (parsed.items) {
                parsed.items.forEach(i => {
                    const it = new Item(i.x, i.y, i.type, 40, 40);
                    items.push(it);
                });
            }
            
            this.grid[key] = {
                enemies: enemies,
                obstacles: [], // Legacy obstacles removed, relying on tiles
                tiles: parsed.tiles,
                projectiles: projectiles,
                items: items,
                visited: true,
                layout: layout,
                width: parsed.roomW,
                height: parsed.roomH,
                doorMask: pattern.doorMask,
                patternId: pattern.id,
                patternType: pattern.type,
                category: layout.category,
                combatDifficulty: layout.combatDifficulty
            };
        }

        this.currentGridX = gx;
        this.currentGridY = gy;
        this.currentRoom = this.grid[key];
        this.currentRoom.visited = true;
    }

    pickEnemyCount() {
        return BalanceManager.pickEnemyCount();
    }
    
    parsePattern(pattern, forceNoEnemies = false) {
        const { grid } = pattern;
        const rows = grid.length; 
        const cols = grid[0].length;
        
        const roomW = cols * TILE_SIZE;
        const roomH = rows * TILE_SIZE;
        
        this.lastParsedWidth = roomW;
        this.lastParsedHeight = roomH;

        const tiles = [];
        const spawnPointsWorld = [];
        const items = [];
        
        for (let r = 0; r < rows; r++) {
            const rowTiles = [];
            for (let c = 0; c < cols; c++) {
                let cell = grid[r][c];
                const x = c * TILE_SIZE;
                const y = r * TILE_SIZE;
                
                // Handle special logic tiles (spawns, items)
                // Note: WALL and DOORS are kept as tiles
                if (cell === TILE.TREASURE) { // Treasure
                    items.push({
                        x: x + TILE_SIZE/2 - 10, // approximate centering
                        y: y + TILE_SIZE/2 - 10,
                        type: 'treasure_chest'
                    });
                    cell = TILE.FLOOR; // Clear tile under item
                } else if (cell === TILE.ENEMY_SPAWN || cell === TILE.BOSS_SPAWN) {
                    // This logic might be redundant if pattern already extracted potentialSpawnPoints
                    // But if they are in the grid:
                    // We handle them here if they are not in potentialSpawnPoints list?
                    // The RoomPattern class extracts them to potentialSpawnPoints.
                    // But in patterns.js we might have put them back?
                    // Assuming they are handled via potentialSpawnPoints property of pattern.
                    // But if the grid has them, we turn them to floor.
                    cell = TILE.FLOOR;
                }
                
                rowTiles.push(cell);
            }
            tiles.push(rowTiles);
        }

        if (!forceNoEnemies && pattern.potentialSpawnPoints) {
            pattern.potentialSpawnPoints.forEach((pt) => {
                spawnPointsWorld.push({
                    x: pt.col * TILE_SIZE + TILE_SIZE / 2 - 10,
                    y: pt.row * TILE_SIZE + TILE_SIZE / 2 - 10,
                    isBoss: pt.isBoss
                });
            });
        }
        
        // Return tiles instead of obstacles
        return { roomW, roomH, tiles, spawnPointsWorld, items, obstacles: [] };
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
        const playerSize = this.player.width;
        
        // Place player near the door they came from
        // Assuming 16x16 tiles, we want to place them 2 tiles in?
        const offset = TILE_SIZE * 2.5;

        switch(direction) {
            case 'up':
                this.player.x = w / 2 - playerSize / 2;
                this.player.y = h - offset - playerSize;
                break;
            case 'down':
                this.player.x = w / 2 - playerSize / 2;
                this.player.y = offset;
                break;
            case 'left':
                this.player.x = w - offset - playerSize;
                this.player.y = h / 2 - playerSize / 2;
                break;
            case 'right':
                this.player.x = offset;
                this.player.y = h / 2 - playerSize / 2;
                break;
        }

        this.player.interactionTarget = null;
    }
    
    getDoorAt(x, y) {
        if (!this.currentRoom || this.currentRoom.enemies.length > 0) return null;
        
        const tiles = this.currentRoom.tiles;
        if (!tiles) return null;

        const c = Math.floor(x / TILE_SIZE);
        const r = Math.floor(y / TILE_SIZE);
        
        if (r >= 0 && r < tiles.length && c >= 0 && c < tiles[0].length) {
            const tile = tiles[r][c];
            if (tile === TILE.DOOR_NORTH) return 'up';
            if (tile === TILE.DOOR_SOUTH) return 'down';
            if (tile === TILE.DOOR_WEST) return 'left';
            if (tile === TILE.DOOR_EAST) return 'right';
        }
        
        return null;
    }

    /**
     * BFS über das Dungeon-Layout, um den nächsten unbesuchten Raum zu finden.
     * startKey: `${gx},${gy}`
     * Rückgabe: Array von Richtungen ['up','right',...], oder [] wenn nichts offen ist.
     */
    findPathToUnvisited(startKey, excludeBoss = false) {
        const visited = new Set();
        const queue = [{ key: startKey, path: [] }];
        
        while (queue.length > 0) {
            const { key, path } = queue.shift();
            if (visited.has(key)) continue;
            visited.add(key);
            
            const layout = this.dungeonLayout[key];
            if (!layout) continue;

            // Unvisited Ziel?
            const roomObj = this.grid[key];
            if (!roomObj || !roomObj.visited) {
                // Wenn excludeBoss aktiv ist, überspringen wir Boss-Räume als Ziel
                if (!excludeBoss || layout.type !== 'boss') {
                    if (path.length > 0) return path;
                }
            }
            
            const [gx, gy] = key.split(',').map(Number);
            const neighbors = layout.neighbors || {};
            
            if (neighbors.up) queue.push({ key: `${gx},${gy+1}`, path: [...path, 'up'] });
            if (neighbors.down) queue.push({ key: `${gx},${gy-1}`, path: [...path, 'down'] });
            if (neighbors.left) queue.push({ key: `${gx-1},${gy}`, path: [...path, 'left'] });
            if (neighbors.right) queue.push({ key: `${gx+1},${gy}`, path: [...path, 'right'] });
        }
        return [];
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
                this.player.onKill(e);
                UI.log(`${e.name} wurde besiegt! +${e.goldReward} Gold, +${expReward} EXP.`, '#90ee90');
                
                this.trySpawnItem(e); // Pass Enemy for rank/loot logic
                if (e.rank === 'boss') {
                    this.spawnHoleToNextFloor(e.x, e.y);
                }

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

    trySpawnItem(enemy) {
        // Roll Loot via Manager
        const drop = BalanceManager.rollLoot(this.stage, enemy.rank || 'normal');
        
        if (drop) {
            let type = 'potion_hp'; // Fallback
            
            if (drop.type === 'gold') {
                this.player.gainGold(drop.value);
                UI.log(`Gegner droppt ${drop.value} Gold!`, '#ffd700');
                return;
            } else if (drop.type === 'material') {
                // Mats noch nicht implementiert -> Fallback zu Potion oder Gold
                this.player.gainGold(5); 
                return;
            } else if (drop.type === 'gear') {
                // Random Item from Definitions
                const keys = Object.keys(ITEM_DEFINITIONS);
                type = keys[Math.floor(Math.random() * keys.length)];
            }
            
            const item = new Item(enemy.x, enemy.y, type);
            item.rarity = drop.rarity; 
            
            if (this.currentRoom.items) this.currentRoom.items.push(item);
            console.log("Item dropped:", type, drop.rarity);
        }
    }

    spawnHoleToNextFloor(x, y) {
        const size = 80;
        const item = new Item(x - size/2, y - size/2, 'next_floor', size, size);
        if (this.currentRoom.items) this.currentRoom.items.push(item);
        UI.log('Ein Loch zum nächsten Floor erscheint!', '#00bfff');
    }

    pickupItem(item) {
        if (item.type === 'treasure_chest') {
             // Chest Interaction
             UI.log("Schatzkiste geöffnet!", "#ffd700");
             
             // Roll loot specially for Treasure
             const drop = BalanceManager.rollLoot(this.stage, 'treasure');
             if (drop) {
                 if (drop.type === 'gear') {
                    // Spawn Gear Item
                    const keys = Object.keys(ITEM_DEFINITIONS);
                    const randKey = keys[Math.floor(Math.random() * keys.length)];
                    const lootItem = new Item(item.x, item.y, randKey);
                    lootItem.rarity = drop.rarity;
                    
                    // Remove chest, add item
                    // But we are in a loop in update(), so we can't easily replace current item in iteration?
                    // actually update() filters items. If we return false (or not strictly), item is removed.
                    // We can just push new item to list.
                    
                    // Better: Remove chest immediately (it happens via filter in update)
                    // And push new item
                    if (this.currentRoom.items) {
                        this.currentRoom.items.push(lootItem);
                    }
                    
                    const colors = {
                        grey: '#9e9e9e', green: '#4caf50', blue: '#2196f3', 
                        purple: '#9c27b0', gold: '#ffc107', red: '#f44336'
                    };
                    UI.log(`Inhalt: ${drop.rarity} Item!`, colors[drop.rarity]);
                 }
             }
             return; // Chest is consumed
        }

        if (ITEM_DEFINITIONS[item.type]) {
            // Add to persistent inventory & run loot
            SaveManager.addItem(item.type, item.rarity);
            this.player.addLoot(item.type, item.rarity);
            
            const colors = {
                grey: '#9e9e9e',
                green: '#4caf50',
                blue: '#2196f3',
                purple: '#9c27b0',
                gold: '#ffc107',
                red: '#f44336'
            };
            const color = colors[item.rarity] || '#ffffff';
            
            UI.log(`Gefunden: ${ITEM_DEFINITIONS[item.type].name} (${item.rarity})`, color);
            
            this.player.equipItem(item); 
        } else if (item.type === 'potion_hp') {
            this.player.heal(30);
            UI.log("Trank gefunden! +30 HP", "#00ff00");
        } else if (item.type === 'next_floor') {
            this.advanceFloor();
            return;
        } else if (item.type === 'weapon_sword') {
            // Legacy Fallback
            this.player.switchWeapon('sword');
            UI.log("Altes Schwert ausgerüstet!", "#ffff00");
        } else if (item.type === 'weapon_wand') {
            // Legacy Fallback
            this.player.switchWeapon('wand');
            UI.log("Alter Zauberstab ausgerüstet!", "#00ffff");
        }
    }

    advanceFloor() {
        this.floor += 1;
        if (this.floor > FLOOR_CONFIG.FLOORS_PER_STAGE) {
            const completedStage = this.stage;
            this.floor = 1;
            this.stage = Math.min(this.stage + 1, 5);
            UI.log(`Stage ${completedStage} abgeschlossen!`, '#ffd700');
            if (this.onStageComplete) this.onStageComplete(completedStage);
            return;
        }

        UI.log(`Weiter zu Floor ${this.floor} in Stage ${this.stage}`, '#00bfff');
        this.grid = {};
        this.dungeonLayout = {};
        this.currentRoom = null;
        this.currentGridX = 0;
        this.currentGridY = 0;
        this.loadRoom(0, 0);
        if (this.currentRoom) {
            this.player.x = this.currentRoom.width / 2 - this.player.width / 2;
            this.player.y = this.currentRoom.height / 2 - this.player.height / 2;
        }
    }

    // Allgemeine Kollision für alle Entities (Player & Enemies)
    checkEntityCollision(ent) {
        const tiles = this.currentRoom.tiles;
        if (!tiles) return;

        // Bounding box of entity
        const minC = Math.floor(ent.x / TILE_SIZE);
        const minR = Math.floor(ent.y / TILE_SIZE);
        const maxC = Math.floor((ent.x + ent.width) / TILE_SIZE);
        const maxR = Math.floor((ent.y + ent.height) / TILE_SIZE);

        const rows = tiles.length;
        const cols = tiles[0].length;
        const isClear = this.currentRoom.enemies.length === 0;

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
                
                const tile = tiles[r][c];
                let solid = false;
                
                if (tile === TILE.WALL || tile === TILE.OBSTACLE) {
                    solid = true;
                } else if (tile === TILE.DOOR_NORTH || tile === TILE.DOOR_SOUTH || 
                           tile === TILE.DOOR_EAST || tile === TILE.DOOR_WEST) {
                    // Doors are solid if not clear
                    if (!isClear) solid = true;
                }

                if (solid) {
                    const rect = {
                        x: c * TILE_SIZE,
                        y: r * TILE_SIZE,
                        width: TILE_SIZE,
                        height: TILE_SIZE
                    };
                    if (checkCollision(ent, rect)) {
                        this.resolveAABB(ent, rect);
                    }
                }
            }
        }
    }

    // Spezielle Logik für Player (Türen)
    checkPlayerCollisions() {
        const p = this.player;
        
        // Zuerst Doors checken
        if (this.checkDoors(p)) return;
        
        // Dann normale Kollision (Wände/Steine)
        this.checkEntityCollision(p);
    }
    
    checkDoors(p) {
        const tiles = this.currentRoom.tiles;
        if (!tiles) return false;
        
        const isClear = this.currentRoom.enemies.length === 0;
        if (!isClear) return false;

        // Check center of player
        const cx = p.x + p.width / 2;
        const cy = p.y + p.height / 2;
        
        const c = Math.floor(cx / TILE_SIZE);
        const r = Math.floor(cy / TILE_SIZE);
        
        if (r >= 0 && r < tiles.length && c >= 0 && c < tiles[0].length) {
            const tile = tiles[r][c];
            
            if (tile === TILE.DOOR_NORTH) {
                this.switchRoom('up');
                return true;
            }
            if (tile === TILE.DOOR_SOUTH) {
                this.switchRoom('down');
                return true;
            }
            if (tile === TILE.DOOR_WEST) {
                this.switchRoom('left');
                return true;
            }
            if (tile === TILE.DOOR_EAST) {
                this.switchRoom('right');
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
