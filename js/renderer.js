// Renderer: Zeichnet alles auf das Canvas
import { TILE, TILE_SIZE, RENDER_SCALE, WALL_LIKE_TILES, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from './constants.js';
import { getWallNeighborMask } from './utils.js';

export class Renderer {
    constructor(canvas, player, map, inputHandler, camera) {
        this.canvas = canvas;
        // Ensure the onscreen canvas matches the fixed virtual resolution.
        this.canvas.width = VIRTUAL_WIDTH;
        this.canvas.height = VIRTUAL_HEIGHT;
        this.ctx = canvas.getContext('2d');
        if (this.ctx) this.ctx.imageSmoothingEnabled = false;
        
        // Offscreen Buffer
        this.buffer = document.createElement('canvas');
        this.buffer.width = VIRTUAL_WIDTH;
        this.buffer.height = VIRTUAL_HEIGHT;
        this.bufferCtx = this.buffer.getContext('2d');
        if (this.bufferCtx) this.bufferCtx.imageSmoothingEnabled = false;

        this.player = player;
        this.map = map;
        this.inputHandler = inputHandler;
        this.camera = camera;
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.bufferCtx;

        // 1. Clear Buffer
        ctx.clearRect(0, 0, this.buffer.width, this.buffer.height);
        
        // Manual Scaling Logic (RENDER_SCALE is now 1 for Virtual)
        const camX = this.camera ? this.camera.x : 0;
        const camY = this.camera ? this.camera.y : 0;

        // 2. Background
        const roomW = this.map.currentRoom ? this.map.currentRoom.width : (this.buffer.width / RENDER_SCALE);
        const roomH = this.map.currentRoom ? this.map.currentRoom.height : (this.buffer.height / RENDER_SCALE);

        // Background covers the whole room area
        const bgX = (0 - camX) * RENDER_SCALE;
        const bgY = (0 - camY) * RENDER_SCALE;
        const bgW = roomW * RENDER_SCALE;
        const bgH = roomH * RENDER_SCALE;

        ctx.fillStyle = '#2a2a2a'; 
        ctx.fillRect(bgX, bgY, bgW, bgH);

        // Grid-Hilfslinien für Tiefe
        this.drawGrid(roomW, roomH, camX, camY);

        // Wände und Türen zeichnen (Dungeon-Struktur)
        this.drawWallsAndDoors(camX, camY);
        
        // Hindernisse zeichnen
        this.drawObstacles(camX, camY);
        
        // Items zeichnen
        this.drawItems(camX, camY);

        // Projektile zeichnen
        this.drawProjectiles(camX, camY);

        // 3. Enemies
        const enemies = this.map.getEnemies();
        if (enemies) {
            enemies.forEach(enemy => {
                this.drawEntity(enemy, '#e53935', camX, camY); // Kräftiges Rot
                this.drawHealthBar(enemy, camX, camY);
                this.drawLabel(enemy, `${enemy.name} (Lvl ${enemy.level})`, camX, camY);
                if (enemy.telegraphTimer > 0) {
                    this.drawTelegraph(enemy, camX, camY);
                }
            });
        }

        // 4. Player
        this.drawEntity(this.player, '#43a047', camX, camY); // Kräftiges Grün
        this.drawBars(this.player, true, camX, camY); // HP + EXP
        
        // 5. Joystick (Visual Feedback)
        // Note: Joystick coords from Input are now scaled to Virtual space in updateDrag?
        // Actually InputHandler logic needs to be checked. 
        // If we draw joystick on Buffer, coords must be in Virtual Space.
        if (this.inputHandler && this.inputHandler.isDragging) {
            const startX = this.inputHandler.startX;
            const startY = this.inputHandler.startY;
            const currX = this.inputHandler.currentX;
            const currY = this.inputHandler.currentY;
            
            // Outer Circle (Static)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(startX, startY, 40, 0, Math.PI * 2);
            ctx.stroke();
            
            // Calculate Knob Position (Clamped)
            const dx = currX - startX;
            const dy = currY - startY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const maxDist = 40;
            
            let knobX = currX;
            let knobY = currY;
            
            if (dist > maxDist) {
                knobX = startX + (dx / dist) * maxDist;
                knobY = startY + (dy / dist) * maxDist;
            }
            
            // Inner Circle (Knob)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(knobX, knobY, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Final Blit to Screen Canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.buffer, 0, 0);
    }

    drawGrid(w, h, camX, camY) {
        const ctx = this.bufferCtx;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;

        ctx.beginPath();
        const step = 50; // World Units Step
        
        // Vertikale Linien
        for (let x = 0; x <= w; x += step) {
            const sx = (x - camX) * RENDER_SCALE;
            const syStart = (0 - camY) * RENDER_SCALE;
            const syEnd = (h - camY) * RENDER_SCALE;
            ctx.moveTo(sx, syStart);
            ctx.lineTo(sx, syEnd);
        }
        
        // Horizontale Linien
        for (let y = 0; y <= h; y += step) {
            const sy = (y - camY) * RENDER_SCALE;
            const sxStart = (0 - camX) * RENDER_SCALE;
            const sxEnd = (w - camX) * RENDER_SCALE;
            ctx.moveTo(sxStart, sy);
            ctx.lineTo(sxEnd, sy);
        }
        ctx.stroke();
    }
    
    drawObstacles(camX, camY) {
        const obstacles = this.map.getObstacles();
        if (!obstacles) return;
        
        const ctx = this.bufferCtx;
        ctx.lineWidth = 2 * RENDER_SCALE;
        
        obstacles.forEach(obs => {
            const sx = (Math.floor(obs.x) - camX) * RENDER_SCALE;
            const sy = (Math.floor(obs.y) - camY) * RENDER_SCALE;
            const sw = Math.floor(obs.width) * RENDER_SCALE;
            const sh = Math.floor(obs.height) * RENDER_SCALE;
            
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
                ctx.fillRect(sx, sy, sw, 5 * RENDER_SCALE);
            }
        });
    }

    drawProjectiles(camX, camY) {
        const projectiles = this.map.getProjectiles();
        if (!projectiles) return;

        const ctx = this.bufferCtx;
        projectiles.forEach(p => {
            const sx = (p.x - camX) * RENDER_SCALE;
            const sy = (p.y - camY) * RENDER_SCALE;
            const sRadius = 5 * RENDER_SCALE;

            ctx.beginPath();
            ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
            if (p.owner === 'player') {
                ctx.fillStyle = '#ffeb3b'; // Gelb
            } else {
                ctx.fillStyle = '#f44336'; // Rot
            }
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1 * RENDER_SCALE;
            ctx.stroke();
        });
    }

    drawItems(camX, camY) {
        const items = this.map.getItems();
        if (!items) return;

        const ctx = this.bufferCtx;
        items.forEach(item => {
            const sx = (item.x - camX) * RENDER_SCALE;
            const sy = (item.y - camY) * RENDER_SCALE;
            const sw = item.width * RENDER_SCALE;
            const sh = item.height * RENDER_SCALE;
            
            // Glow Effekt
            const time = Date.now() / 200;
            ctx.shadowBlur = (10 + Math.sin(time) * 5) * RENDER_SCALE;
            ctx.shadowColor = 'white';

            if (item.type === 'treasure_chest') {
                // Goldene Kiste
                ctx.fillStyle = '#DAA520'; 
                ctx.fillRect(sx, sy + 10 * RENDER_SCALE, sw, sh - 10 * RENDER_SCALE); // Body
                
                ctx.fillStyle = '#FFD700'; 
                ctx.fillRect(sx, sy, sw, 10 * RENDER_SCALE); // Deckel
                
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 2 * RENDER_SCALE;
                ctx.strokeRect(sx, sy + 10 * RENDER_SCALE, sw, sh - 10 * RENDER_SCALE);
                ctx.strokeRect(sx, sy, sw, 10 * RENDER_SCALE);
                
                // Schloss
                ctx.fillStyle = '#C0C0C0';
                const lockSize = 8 * RENDER_SCALE;
                ctx.fillRect(sx + sw/2 - lockSize/2, sy + 8 * RENDER_SCALE, lockSize, lockSize);
                
            } else if (item.type === 'potion_hp') {
                ctx.fillStyle = '#f00';
                ctx.beginPath();
                ctx.arc(sx + sw/2, sy + sh/2 + 2 * RENDER_SCALE, 8 * RENDER_SCALE, 0, Math.PI * 2); // Flasche
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillRect(sx + sw/2 - 2 * RENDER_SCALE, sy + sh/2 - 8 * RENDER_SCALE, 4 * RENDER_SCALE, 6 * RENDER_SCALE); // Hals
            } else if (item.type === 'weapon_sword') {
                ctx.fillStyle = '#ccc';
                ctx.fillRect(sx + sw/2 - 2 * RENDER_SCALE, sy, 4 * RENDER_SCALE, sh); // Klinge
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(sx, sy + sh - 6 * RENDER_SCALE, sw, 4 * RENDER_SCALE); // Griff
            } else if (item.type === 'weapon_wand') {
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(sx + sw/2 - 2 * RENDER_SCALE, sy, 4 * RENDER_SCALE, sh); // Stab
                ctx.fillStyle = '#00ffff';
                ctx.beginPath();
                ctx.arc(sx + sw/2, sy + 2 * RENDER_SCALE, 5 * RENDER_SCALE, 0, Math.PI * 2); // Gem
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
                ctx.lineWidth = 3 * RENDER_SCALE;
                ctx.beginPath();
                ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#00bfff';
                ctx.font = `bold ${14 * RENDER_SCALE}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('↓', cx, cy + 5 * RENDER_SCALE);
            }
            
            ctx.shadowBlur = 0;
        });
    }

    drawWallsAndDoors(camX, camY) {
        if (!this.map.currentRoom || !this.map.currentRoom.tiles) return;

        const ctx = this.bufferCtx;
        const tiles = this.map.currentRoom.tiles;
        const rows = tiles.length;
        const cols = tiles[0].length;
        const isClear = this.map.currentRoom.enemies.length === 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tile = tiles[r][c];
                
                // Manual Scale Calculation
                const worldX = c * TILE_SIZE;
                const worldY = r * TILE_SIZE;
                const sx = (worldX - camX) * RENDER_SCALE;
                const sy = (worldY - camY) * RENDER_SCALE;
                const sTile = TILE_SIZE * RENDER_SCALE;
                
                if (tile === TILE.WALL || tile === TILE.VOID) {
                    // Autotile: einfache Kanten-Hervorhebung basierend auf Nachbarn
                    const mask = getWallNeighborMask(tiles, r, c, WALL_LIKE_TILES);
                    const isVoid = tile === TILE.VOID;
                    ctx.fillStyle = isVoid ? '#050505' : '#2e7d32';
                    ctx.fillRect(sx, sy, sTile, sTile);

                    // Außenkanten hervorheben, wenn kein Nachbar anliegt
                    ctx.lineWidth = 1 * RENDER_SCALE;
                    ctx.strokeStyle = isVoid ? '#0a0a0a' : '#1b5e20';
                    if (!mask.up) {
                        ctx.beginPath();
                        ctx.moveTo(sx, sy);
                        ctx.lineTo(sx + sTile, sy);
                        ctx.stroke();
                    }
                    if (!mask.down) {
                        ctx.beginPath();
                        ctx.moveTo(sx, sy + sTile);
                        ctx.lineTo(sx + sTile, sy + sTile);
                        ctx.stroke();
                    }
                    if (!mask.left) {
                        ctx.beginPath();
                        ctx.moveTo(sx, sy);
                        ctx.lineTo(sx, sy + sTile);
                        ctx.stroke();
                    }
                    if (!mask.right) {
                        ctx.beginPath();
                        ctx.moveTo(sx + sTile, sy);
                        ctx.lineTo(sx + sTile, sy + sTile);
                        ctx.stroke();
                    }
                    // Inner-Corner Schattierung als kleiner Hauch Autowall
                    ctx.fillStyle = isVoid ? 'rgba(20,20,20,0.2)' : 'rgba(255,255,255,0.08)';
                    if (!mask.up && !mask.left) ctx.fillRect(sx, sy, sTile * 0.25, sTile * 0.25);
                    if (!mask.up && !mask.right) ctx.fillRect(sx + sTile * 0.75, sy, sTile * 0.25, sTile * 0.25);
                    if (!mask.down && !mask.left) ctx.fillRect(sx, sy + sTile * 0.75, sTile * 0.25, sTile * 0.25);
                    if (!mask.down && !mask.right) ctx.fillRect(sx + sTile * 0.75, sy + sTile * 0.75, sTile * 0.25, sTile * 0.25);
                } else if (tile === TILE.OBSTACLE) {
                    ctx.fillStyle = '#555';
                    ctx.fillRect(sx, sy, sTile, sTile);
                    ctx.strokeStyle = '#222';
                    ctx.strokeRect(sx, sy, sTile, sTile);
                    // 3D effect highlight
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.fillRect(sx, sy, sTile, sTile/3);
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
        const ctx = this.bufferCtx;
        const sx = (Math.floor(entity.x) - camX) * RENDER_SCALE;
        const sy = (Math.floor(entity.y) - camY) * RENDER_SCALE;
        const sw = entity.width * RENDER_SCALE;
        const sh = entity.height * RENDER_SCALE;
        
        ctx.fillStyle = color;
        ctx.fillRect(sx, sy, sw, sh);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 * RENDER_SCALE;
        ctx.strokeRect(sx, sy, sw, sh);
        
        ctx.fillStyle = '#000';
        // Eyes proportional to size
        const eyeSize = sw * 0.15;
        const eyeY = sy + sh * 0.3;
        ctx.fillRect(sx + sw * 0.25, eyeY, eyeSize, eyeSize); 
        ctx.fillRect(sx + sw * 0.75 - eyeSize, eyeY, eyeSize, eyeSize); 
    }

    drawHealthBar(entity, camX, camY) {
        this.drawBars(entity, false, camX, camY);
    }

    drawBars(entity, showExp = true, camX, camY) {
        const ctx = this.bufferCtx;
        const sx = (Math.floor(entity.x) - camX) * RENDER_SCALE;
        const sy = (Math.floor(entity.y) - camY) * RENDER_SCALE;
        const barWidth = entity.width * RENDER_SCALE;
        const barHeight = 3 * RENDER_SCALE; // Smaller bars
        
        let hpY = sy - 5 * RENDER_SCALE; // Closer to entity
        
        ctx.fillStyle = '#000';
        ctx.fillRect(sx, hpY, barWidth, barHeight);

        const hpPercent = Math.max(0, entity.hp / entity.maxHp);
        ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : (hpPercent > 0.2 ? '#ffff00' : '#ff0000');
        ctx.fillRect(sx, hpY, barWidth * hpPercent, barHeight);
        
        if (showExp && entity === this.player) {
            let expY = hpY - 4 * RENDER_SCALE; // Closer stack
            
            ctx.fillStyle = '#000';
            ctx.fillRect(sx, expY, barWidth, barHeight);
            
            const maxExp = entity.getNextLevelExp(entity.level);
            const expPercent = Math.max(0, Math.min(1, entity.exp / maxExp));
            ctx.fillStyle = '#00e5ff'; 
            ctx.fillRect(sx, expY, barWidth * expPercent, barHeight);
        }
    }

    drawLabel(entity, text, camX, camY) {
        const ctx = this.bufferCtx;
        const sx = (entity.x - camX) * RENDER_SCALE;
        const sy = (entity.y - camY) * RENDER_SCALE;
        const sw = entity.width * RENDER_SCALE;

        ctx.fillStyle = '#fff';
        ctx.font = `${8 * RENDER_SCALE}px monospace`; // Smaller font
        ctx.textAlign = 'center';
        let yOffset = -10 * RENDER_SCALE;
        if (entity === this.player) yOffset = -15 * RENDER_SCALE;
        
        ctx.fillText(text, sx + sw / 2, sy + yOffset);
        ctx.textAlign = 'start';
    }

    drawTelegraph(enemy, camX, camY) {
        const ctx = this.bufferCtx;
        const cx = (enemy.x + enemy.width / 2 - camX) * RENDER_SCALE;
        const cy = (enemy.y - 25 - camY) * RENDER_SCALE;
        
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(cx, cy, 10 * RENDER_SCALE, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `bold ${12 * RENDER_SCALE}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('!', cx, cy + 4 * RENDER_SCALE);
        ctx.textAlign = 'start';
    }
}
