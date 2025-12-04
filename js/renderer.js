// Renderer: Zeichnet alles auf das Canvas
import { TILE, TILE_WORLD, WALL_LIKE_TILES, DEBUG_HITBOX, PLAYER_HEAD_OFFSET, PROJECTILE_RADIUS } from './constants.js';
import { getWallNeighborMask } from './utils.js';

const SHOW_GRID = false; // Debug-Grid ausblenden

// Statisches Boden-Layout (15 x 9) für alle Räume; füllt den gesamten Raum
const ROOM_FLOOR_COLS = 15;
const ROOM_FLOOR_ROWS = 9;
const ROOM_FLOOR_MAP = Array.from(
    { length: ROOM_FLOOR_COLS * ROOM_FLOOR_ROWS },
    (_, i) => i + 1 // 1..135
);

// Vorladen der Boden-Sprites (floor_walls_01..135)
function loadFloorSprites() {
    const total = ROOM_FLOOR_COLS * ROOM_FLOOR_ROWS; // 135
    const sprites = new Array(total + 1); // Index 1..135
    for (let i = 1; i <= total; i++) {
        const img = new Image();
        const padded = i.toString().padStart(2, '0');
        img.src = `assets/floor_walls/images/floor_wall_${padded}.png`;
        sprites[i] = img;
    }
    return sprites;
}

// Stone Sprites for obstacles
function loadStoneSprites() {
    const stone1 = new Image();
    stone1.src = 'assets/stones/stone1.png';
    const stone3 = new Image();
    stone3.src = 'assets/stones/stone3.png';
    return { stone1, stone3 };
}

export class Renderer {
    constructor(canvas, player, map, inputHandler, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.player = player;
        this.map = map;
        this.inputHandler = inputHandler;
        this.camera = camera;
        
        this.joystickOpacity = 0;

        // Render State
        this.worldScale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        this.floorSprites = loadFloorSprites();
        this.stoneSprites = loadStoneSprites();
    }

    updateScale(scale, ox, oy) {
        this.worldScale = scale;
        this.offsetX = ox;
        this.offsetY = oy;
    }

    drawWorld() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;

        // Clear full canvas in screen space
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply World Transform (Scale + Letterbox Offset)
        ctx.setTransform(dpr * this.worldScale, 0, 0, dpr * this.worldScale, this.offsetX * dpr, this.offsetY * dpr);

        const camX = this.camera ? this.camera.x : 0;
        const camY = this.camera ? this.camera.y : 0;

        // 2. Background
        const roomW = this.map.currentRoom ? this.map.currentRoom.width : 500;
        const roomH = this.map.currentRoom ? this.map.currentRoom.height : 500;

        const bgX = 0 - camX;
        const bgY = 0 - camY;
        const bgW = roomW;
        const bgH = roomH;

        ctx.fillStyle = '#2a2a2a'; 
        ctx.fillRect(bgX, bgY, bgW, bgH);

        // 2b. Boden/Wände (gesamtes 15x9 Grid mit neuen Assets)
        this.drawFloor(camX, camY);

        // Draw World Elements
        if (SHOW_GRID) {
            this.drawGrid(roomW, roomH, camX, camY);
        }
        this.drawWallsAndDoors(camX, camY);
        this.drawObstacles(camX, camY);
        this.drawItems(camX, camY);
        this.drawProjectiles(camX, camY);

        // 3. Enemies
        const enemies = this.map.getEnemies();
        if (enemies) {
            enemies.forEach(enemy => {
                this.drawEntity(enemy, enemy.color || '#e53935', camX, camY);
            });
        }

        // 4. Player
        this.drawEntity(this.player, '#43a047', camX, camY); 
    }

    drawFloor(camX, camY) {
        if (!this.map.currentRoom) return;
        const ctx = this.ctx;

        const startCol = 0;
        const startRow = 0;

        for (let r = 0; r < ROOM_FLOOR_ROWS; r++) {
            for (let c = 0; c < ROOM_FLOOR_COLS; c++) {
                const idx = r * ROOM_FLOOR_COLS + c;
                const tileId = ROOM_FLOOR_MAP[idx];
                const img = this.floorSprites[tileId];
                const worldX = (c + startCol) * TILE_WORLD;
                const worldY = (r + startRow) * TILE_WORLD;
                const sx = worldX - camX;
                const sy = worldY - camY;

                if (img && img.complete) {
                    ctx.drawImage(img, sx, sy, TILE_WORLD, TILE_WORLD);
                } else {
                    // Fallback: flacher Farbton, falls nicht geladen
                    ctx.fillStyle = '#1c1c1c';
                    ctx.fillRect(sx, sy, TILE_WORLD, TILE_WORLD);
                }
            }
        }
    }

    drawUI() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;
        const camX = this.camera ? this.camera.x : 0;
        const camY = this.camera ? this.camera.y : 0;

        // World-gebundene UI (Healthbars/Labels direkt über Entities)
        ctx.setTransform(dpr * this.worldScale, 0, 0, dpr * this.worldScale, this.offsetX * dpr, this.offsetY * dpr);
        
        const enemies = this.map.getEnemies();
        if (enemies) {
            enemies.forEach(enemy => {
                this.drawHealthBar(enemy, camX, camY, ctx);
                this.drawLabel(enemy, `${enemy.name} (Lvl ${enemy.level})`, camX, camY, ctx);
                if (enemy.telegraphTimer > 0) {
                    this.drawTelegraph(enemy, camX, camY, ctx);
                }
            });
        }

        // Screen-gebundene UI/HUD (Joystick, feste HUD-Texte wie HP/Gold)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // HUD-Texte/Icons würden hier im Screen-Space gezeichnet

        // Joystick (Opacity Logic)
        if (this.inputHandler && this.inputHandler.isDragging) {
            this.joystickOpacity = 1.0;
        } else {
            this.joystickOpacity -= 0.05; 
            if (this.joystickOpacity < 0) this.joystickOpacity = 0;
        }

        if (this.joystickOpacity > 0 && this.inputHandler) {
            // InputHandler coords are CSS Pixels (1:1 with Screen Transform)
            // No scaling needed if ACTUAL_SCALE is 1
            const startX = this.inputHandler.startX;
            const startY = this.inputHandler.startY;
            const currX = this.inputHandler.currentX;
            const currY = this.inputHandler.currentY;
            
            const outerRadius = 34; 
            const innerRadius = 14;
            
            ctx.save();
            ctx.globalAlpha = this.joystickOpacity;
            
            // Outer Circle (Base)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(startX, startY, outerRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Calculate Knob Position
            const dx = currX - startX;
            const dy = currY - startY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            let knobX = currX;
            let knobY = currY;
            
            if (dist > outerRadius) {
                knobX = startX + (dx / dist) * outerRadius;
                knobY = startY + (dy / dist) * outerRadius;
            }
            
            // Inner Circle (Knob)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(knobX, knobY, innerRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    drawGrid(w, h, camX, camY) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;

        ctx.beginPath();
        const step = 200;
        
        // Vertikale Linien
        for (let x = 0; x <= w; x += step) {
            const sx = (x - camX);
            const syStart = (0 - camY);
            const syEnd = (h - camY);
            ctx.moveTo(sx, syStart);
            ctx.lineTo(sx, syEnd);
        }
        
        // Horizontale Linien
        for (let y = 0; y <= h; y += step) {
            const sy = (y - camY);
            const sxStart = (0 - camX);
            const sxEnd = (w - camX);
            ctx.moveTo(sxStart, sy);
            ctx.lineTo(sxEnd, sy);
        }
        ctx.stroke();
    }
    
    drawObstacles(camX, camY) {
        const obstacles = this.map.getObstacles();
        if (!obstacles) return;
        
        const ctx = this.ctx;
        ctx.lineWidth = 8;
        
        obstacles.forEach(obs => {
            const sx = Math.floor(obs.x) - camX;
            const sy = Math.floor(obs.y) - camY;
            const sw = Math.floor(obs.width);
            const sh = Math.floor(obs.height);
            
            if (obs.type === 'void') {
                // Abgrund / Void
                ctx.fillStyle = '#000';
                ctx.strokeStyle = '#111';
                ctx.fillRect(sx, sy, sw, sh);
                ctx.strokeRect(sx, sy, sw, sh);
            } else {
                // Wand / Stein
                ctx.fillStyle = '#555';
                ctx.strokeStyle = '#222';
                
                ctx.fillRect(sx, sy, sw, sh);
                ctx.strokeRect(sx, sy, sw, sh);
                
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(sx, sy, sw, 20);
            }
        });
    }

    drawProjectiles(camX, camY) {
        const projectiles = this.map.getProjectiles();
        if (!projectiles) return;

        const ctx = this.ctx;
        projectiles.forEach(p => {
            const sx = p.x - camX;
            const sy = p.y - camY;
            const sRadius = PROJECTILE_RADIUS;

            ctx.beginPath();
            ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
            if (p.owner === 'player') {
                ctx.fillStyle = '#ffeb3b'; // Gelb
            } else {
                ctx.fillStyle = '#f44336'; // Rot
            }
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.stroke();
        });
    }

    drawItems(camX, camY) {
        const items = this.map.getItems();
        if (!items) return;

        const ctx = this.ctx;
        items.forEach(item => {
            const sx = item.x - camX;
            const sy = item.y - camY;
            const sw = item.width;
            const sh = item.height;
            
            // Glow Effekt
            const time = Date.now() / 200;
            ctx.shadowBlur = (40 + Math.sin(time) * 20);
            ctx.shadowColor = 'white';

            if (item.type === 'treasure_chest') {
                // Goldene Kiste
                ctx.fillStyle = '#DAA520'; 
                ctx.fillRect(sx, sy + 40, sw, sh - 40);
                
                ctx.fillStyle = '#FFD700'; 
                ctx.fillRect(sx, sy, sw, 40); 
                
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 8;
                ctx.strokeRect(sx, sy + 40, sw, sh - 40);
                ctx.strokeRect(sx, sy, sw, 40);
                
                // Schloss
                ctx.fillStyle = '#C0C0C0';
                const lockSize = 32;
                ctx.fillRect(sx + sw/2 - lockSize/2, sy + 32, lockSize, lockSize);
                
            } else if (item.type === 'potion_hp') {
                ctx.fillStyle = '#f00';
                ctx.beginPath();
                ctx.arc(sx + sw/2, sy + sh/2 + 8, 32, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillRect(sx + sw/2 - 8, sy + sh/2 - 32, 16, 24);
            } else if (item.type === 'weapon_sword') {
                ctx.fillStyle = '#ccc';
                ctx.fillRect(sx + sw/2 - 8, sy, 16, sh);
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(sx, sy + sh - 24, sw, 16);
            } else if (item.type === 'weapon_wand') {
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(sx + sw/2 - 8, sy, 16, sh); 
                ctx.fillStyle = '#00ffff';
                ctx.beginPath();
                ctx.arc(sx + sw/2, sy + 8, 20, 0, Math.PI * 2);
                ctx.fill();
            } else if (item.type === 'next_floor') {
                const cx = sx + sw/2;
                const cy = sy + sh/2;
                const radius = Math.min(sw, sh) / 2;
                const grd = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
                grd.addColorStop(0, '#111');
                grd.addColorStop(1, 'rgba(0,0,0,0.8)');
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#00bfff';
                ctx.lineWidth = 12;
                ctx.beginPath();
                ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#00bfff';
                ctx.font = `bold 56px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('↓', cx, cy + 20);
            }
            
            ctx.shadowBlur = 0;
        });
    }

    drawWallsAndDoors(camX, camY) {
        if (!this.map.currentRoom || !this.map.currentRoom.tiles) return;

        const ctx = this.ctx;
        const tiles = this.map.currentRoom.tiles;
        const rows = tiles.length;
        const cols = tiles[0].length;
        const isClear = this.map.currentRoom.enemies.length === 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tile = tiles[r][c];
                
                // Manual Scale Calculation
                const worldX = c * TILE_WORLD;
                const worldY = r * TILE_WORLD;
                const sx = worldX - camX;
                const sy = worldY - camY;
                const sTile = TILE_WORLD;
                
                if (tile === TILE.WALL || tile === TILE.VOID) {
                    if (tile === TILE.VOID) {
                        ctx.fillStyle = '#050505';
                        ctx.fillRect(sx, sy, sTile, sTile);
                    }
                } else if (tile === TILE.OBSTACLE) {
                    // Deterministischer Pick basierend auf Position
                    const hash = (r * 73856093) ^ (c * 19349663);
                    const useStone3 = (hash & 1) === 1;
                    const img = useStone3 ? this.stoneSprites.stone3 : this.stoneSprites.stone1;

                    if (img && img.complete) {
                        ctx.drawImage(img, sx, sy, sTile, sTile);
                    } else {
                        // Fallback: simple Box, falls Image noch lädt
                        ctx.fillStyle = '#555';
                        ctx.fillRect(sx, sy, sTile, sTile);
                        ctx.strokeStyle = '#222';
                        ctx.strokeRect(sx, sy, sTile, sTile);
                    }
                } else if (tile === TILE.DOOR_NORTH || tile === TILE.DOOR_SOUTH || 
                           tile === TILE.DOOR_EAST || tile === TILE.DOOR_WEST) {
                    
                    // Door Logic
                    if (isClear) {
                        // Check if neighbor is visited
                        let visited = false;
                        const gx = this.map.currentGridX;
                        const gy = this.map.currentGridY;
                        let nKey = null;

                        if (tile === TILE.DOOR_NORTH) nKey = `${gx},${gy+1}`;
                        if (tile === TILE.DOOR_SOUTH) nKey = `${gx},${gy-1}`;
                        if (tile === TILE.DOOR_EAST) nKey = `${gx+1},${gy}`;
                        if (tile === TILE.DOOR_WEST) nKey = `${gx-1},${gy}`;

                        if (nKey && this.map.grid[nKey]) {
                            visited = true; // Loaded implies visited in simple model
                        }

                        if (visited) {
                            ctx.fillStyle = '#888'; // Light/Gray for visited
                        } else {
                            ctx.fillStyle = '#000'; // Black/Dark for unknown
                        }
                        ctx.fillRect(sx, sy, sTile, sTile);
                    } else {
                        ctx.fillStyle = '#8d6e63'; // Closed Door (Wood color)
                        ctx.fillRect(sx, sy, sTile, sTile);
                        ctx.strokeStyle = '#3e2723';
                        ctx.strokeRect(sx, sy, sTile, sTile);
                    }
                }
            }
        }
    }

    drawEntity(entity, color, camX, camY) {
        const ctx = this.ctx;
        const sx = Math.floor(entity.x) - camX;
        const sy = Math.floor(entity.y) - camY;
        const sw = entity.width;
        const sh = entity.height;
        
        // Shadow
        let shadowX, shadowY;
        if (entity.getShadowAnchor) {
            const anchor = entity.getShadowAnchor();
            shadowX = anchor.x - camX;
            shadowY = anchor.y - camY;
        } else {
            shadowX = entity.x + entity.width/2 - camX;
            shadowY = entity.y + entity.height - camY;
        }
        
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, sw * 0.3, sh * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        if (entity === this.player && entity.sprites) {
            // Player Rendering (Paper Doll)
            const bodyImg = entity.isMoving ? entity.sprites.body['walk' + entity.walkFrame] : entity.sprites.body.idle;
            // Use attack direction if available (not yet implemented fully), else movement direction
            const headImg = entity.sprites.head[entity.headDirection] || entity.sprites.head.front;
            
            // Draw Body
            if (bodyImg && bodyImg.complete) {
                ctx.drawImage(bodyImg, sx, sy, sw, sh);
            } else {
                // Fallback if image not loaded
                ctx.fillStyle = color;
                ctx.fillRect(sx, sy, sw, sh);
            }

            // Draw Head
            if (headImg && headImg.complete) {
                // Head sits slightly higher (PLAYER_HEAD_OFFSET) + Bobbing (+offset)
                const headOffset = (PLAYER_HEAD_OFFSET + entity.bobbingOffset);
                ctx.drawImage(headImg, sx, sy + headOffset, sw, sh);
            }
        } else {
            // Default Rendering (Enemies)
            ctx.fillStyle = color;
            ctx.fillRect(sx, sy, sw, sh);
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 8;
            ctx.strokeRect(sx, sy, sw, sh);
            
            ctx.fillStyle = '#000';
            // Eyes proportional to size
            const eyeSize = sw * 0.15;
            const eyeY = sy + sh * 0.3;
            ctx.fillRect(sx + sw * 0.25, eyeY, eyeSize, eyeSize); 
            ctx.fillRect(sx + sw * 0.75 - eyeSize, eyeY, eyeSize, eyeSize); 
        }
        
        // Debug Hitbox
        if (DEBUG_HITBOX) {
             const hb = entity.getHitbox ? entity.getHitbox() : {x:entity.x, y:entity.y, width:entity.width, height:entity.height};
             const hx = hb.x - camX;
             const hy = hb.y - camY;
             const hw = hb.width;
             const hh = hb.height;
             ctx.strokeStyle = '#00ff00';
             ctx.lineWidth = 4;
             ctx.strokeRect(hx, hy, hw, hh);
        }
    }

    drawHealthBar(entity, camX, camY, ctx) {
        this.drawBars(entity, false, camX, camY, ctx);
    }

    drawBars(entity, showExp, camX, camY, targetCtx) {
        const ctx = targetCtx || this.ctx;
        
        // Calculate Screen Positions
        const sx = Math.floor(entity.x) - camX;
        const sy = Math.floor(entity.y) - camY;
        const barWidth = entity.width;
        const barHeight = 12;
        
        let hpY = sy - 20;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(sx, hpY, barWidth, barHeight);

        const hpPercent = Math.max(0, entity.hp / entity.maxHp);
        ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : (hpPercent > 0.2 ? '#ffff00' : '#ff0000');
        ctx.fillRect(sx, hpY, barWidth * hpPercent, barHeight);
        
        if (showExp && entity === this.player) {
            let expY = hpY - 16;
            
            ctx.fillStyle = '#000';
            ctx.fillRect(sx, expY, barWidth, barHeight);
            
            const maxExp = entity.getNextLevelExp(entity.level);
            const expPercent = Math.max(0, Math.min(1, entity.exp / maxExp));
            ctx.fillStyle = '#00e5ff'; 
            ctx.fillRect(sx, expY, barWidth * expPercent, barHeight);
        }
    }

    drawLabel(entity, text, camX, camY, targetCtx) {
        const ctx = targetCtx || this.ctx;
        const sx = entity.x - camX;
        const sy = entity.y - camY;
        const sw = entity.width;

        ctx.fillStyle = '#fff';
        // Scaled Font size for sharpness
        const fontSize = 32;
        ctx.font = `bold ${fontSize}px monospace`; 
        ctx.textAlign = 'center';
        
        let yOffset = -40;
        if (entity === this.player) yOffset = -60;
        
        ctx.fillText(text, sx + sw / 2, sy + yOffset);
        ctx.textAlign = 'start';
    }

    drawTelegraph(enemy, camX, camY, targetCtx) {
        const ctx = targetCtx || this.ctx;
        const cx = enemy.x + enemy.width / 2 - camX;
        const cy = enemy.y - 100 - camY;
        
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        const fontSize = 48;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('!', cx, cy + (fontSize/3));
        ctx.textAlign = 'start';
    }
}
