// Renderer: Zeichnet alles auf das Canvas
import { TILE, TILE_SIZE, RENDER_SCALE, WALL_LIKE_TILES } from './constants.js';
import { getWallNeighborMask } from './utils.js';

export class Renderer {
    constructor(canvas, player, map, inputHandler, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.player = player;
        this.map = map;
        this.inputHandler = inputHandler;
        this.camera = camera;
    }

    draw() {
        if (!this.ctx) return;

        // 1. Clear Screen (Screen Space)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Manual Scaling Logic
        // ScreenX = (WorldX - CameraX) * RENDER_SCALE
        // ScreenY = (WorldY - CameraY) * RENDER_SCALE
        
        const camX = this.camera ? this.camera.x : 0;
        const camY = this.camera ? this.camera.y : 0;

        // 2. Background (World Space -> Screen Space)
        const roomW = this.map.currentRoom ? this.map.currentRoom.width : (this.canvas.width / RENDER_SCALE);
        const roomH = this.map.currentRoom ? this.map.currentRoom.height : (this.canvas.height / RENDER_SCALE);

        // Background covers the whole room area
        const bgX = (0 - camX) * RENDER_SCALE;
        const bgY = (0 - camY) * RENDER_SCALE;
        const bgW = roomW * RENDER_SCALE;
        const bgH = roomH * RENDER_SCALE;

        this.ctx.fillStyle = '#2a2a2a'; 
        this.ctx.fillRect(bgX, bgY, bgW, bgH);

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
        
        // 5. Joystick (Visual Feedback) - Screen Space (Unchanged)
        if (this.inputHandler && this.inputHandler.isDragging) {
            const startX = this.inputHandler.startX;
            const startY = this.inputHandler.startY;
            const currX = this.inputHandler.currentX;
            const currY = this.inputHandler.currentY;
            
            // Outer Circle (Static)
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(startX, startY, 40, 0, Math.PI * 2);
            this.ctx.stroke();
            
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
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(knobX, knobY, 15, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawGrid(w, h, camX, camY) {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1 * RENDER_SCALE; // Thicker lines? Or keep 1px screen? Let's scale lineWidth slightly or keep 1.
        // Actually keep 1 screen pixel for grid lines looks better usually.
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        const step = 50; // World Units Step
        
        // Vertikale Linien
        for (let x = 0; x <= w; x += step) {
            const sx = (x - camX) * RENDER_SCALE;
            const syStart = (0 - camY) * RENDER_SCALE;
            const syEnd = (h - camY) * RENDER_SCALE;
            this.ctx.moveTo(sx, syStart);
            this.ctx.lineTo(sx, syEnd);
        }
        
        // Horizontale Linien
        for (let y = 0; y <= h; y += step) {
            const sy = (y - camY) * RENDER_SCALE;
            const sxStart = (0 - camX) * RENDER_SCALE;
            const sxEnd = (w - camX) * RENDER_SCALE;
            this.ctx.moveTo(sxStart, sy);
            this.ctx.lineTo(sxEnd, sy);
        }
        this.ctx.stroke();
    }
    
    drawObstacles(camX, camY) {
        const obstacles = this.map.getObstacles();
        if (!obstacles) return;
        
        this.ctx.lineWidth = 2 * RENDER_SCALE;
        
        obstacles.forEach(obs => {
            const sx = (Math.floor(obs.x) - camX) * RENDER_SCALE;
            const sy = (Math.floor(obs.y) - camY) * RENDER_SCALE;
            const sw = Math.floor(obs.width) * RENDER_SCALE;
            const sh = Math.floor(obs.height) * RENDER_SCALE;
            
            if (obs.type === 'void') {
                // Abgrund / Void
                this.ctx.fillStyle = '#000';
                this.ctx.strokeStyle = '#111';
                this.ctx.fillRect(sx, sy, sw, sh);
                this.ctx.strokeRect(sx, sy, sw, sh);
            } else {
                // Wand / Stein
                this.ctx.fillStyle = '#555';
                this.ctx.strokeStyle = '#222';
                
                this.ctx.fillRect(sx, sy, sw, sh);
                this.ctx.strokeRect(sx, sy, sw, sh);
                
                this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
                this.ctx.fillRect(sx, sy, sw, 5 * RENDER_SCALE);
            }
        });
    }

    drawProjectiles(camX, camY) {
        const projectiles = this.map.getProjectiles();
        if (!projectiles) return;

        projectiles.forEach(p => {
            const sx = (p.x - camX) * RENDER_SCALE;
            const sy = (p.y - camY) * RENDER_SCALE;
            const sRadius = 5 * RENDER_SCALE;

            this.ctx.beginPath();
            this.ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
            if (p.owner === 'player') {
                this.ctx.fillStyle = '#ffeb3b'; // Gelb
            } else {
                this.ctx.fillStyle = '#f44336'; // Rot
            }
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1 * RENDER_SCALE;
            this.ctx.stroke();
        });
    }

    drawItems(camX, camY) {
        const items = this.map.getItems();
        if (!items) return;

        items.forEach(item => {
            const sx = (item.x - camX) * RENDER_SCALE;
            const sy = (item.y - camY) * RENDER_SCALE;
            const sw = item.width * RENDER_SCALE;
            const sh = item.height * RENDER_SCALE;
            
            // Glow Effekt
            const time = Date.now() / 200;
            this.ctx.shadowBlur = (10 + Math.sin(time) * 5) * RENDER_SCALE; // Scaled shadow blur?
            this.ctx.shadowColor = 'white';

            if (item.type === 'treasure_chest') {
                // Goldene Kiste
                this.ctx.fillStyle = '#DAA520'; 
                this.ctx.fillRect(sx, sy + 10 * RENDER_SCALE, sw, sh - 10 * RENDER_SCALE); // Body
                
                this.ctx.fillStyle = '#FFD700'; 
                this.ctx.fillRect(sx, sy, sw, 10 * RENDER_SCALE); // Deckel
                
                this.ctx.strokeStyle = '#8B4513';
                this.ctx.lineWidth = 2 * RENDER_SCALE;
                this.ctx.strokeRect(sx, sy + 10 * RENDER_SCALE, sw, sh - 10 * RENDER_SCALE);
                this.ctx.strokeRect(sx, sy, sw, 10 * RENDER_SCALE);
                
                // Schloss
                this.ctx.fillStyle = '#C0C0C0';
                const lockSize = 8 * RENDER_SCALE;
                this.ctx.fillRect(sx + sw/2 - lockSize/2, sy + 8 * RENDER_SCALE, lockSize, lockSize);
                
            } else if (item.type === 'potion_hp') {
                this.ctx.fillStyle = '#f00';
                this.ctx.beginPath();
                this.ctx.arc(sx + sw/2, sy + sh/2 + 2 * RENDER_SCALE, 8 * RENDER_SCALE, 0, Math.PI * 2); // Flasche
                this.ctx.fill();
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(sx + sw/2 - 2 * RENDER_SCALE, sy + sh/2 - 8 * RENDER_SCALE, 4 * RENDER_SCALE, 6 * RENDER_SCALE); // Hals
            } else if (item.type === 'weapon_sword') {
                this.ctx.fillStyle = '#ccc';
                this.ctx.fillRect(sx + sw/2 - 2 * RENDER_SCALE, sy, 4 * RENDER_SCALE, sh); // Klinge
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(sx, sy + sh - 6 * RENDER_SCALE, sw, 4 * RENDER_SCALE); // Griff
            } else if (item.type === 'weapon_wand') {
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(sx + sw/2 - 2 * RENDER_SCALE, sy, 4 * RENDER_SCALE, sh); // Stab
                this.ctx.fillStyle = '#00ffff';
                this.ctx.beginPath();
                this.ctx.arc(sx + sw/2, sy + 2 * RENDER_SCALE, 5 * RENDER_SCALE, 0, Math.PI * 2); // Gem
                this.ctx.fill();
            } else if (item.type === 'next_floor') {
                const cx = sx + sw/2;
                const cy = sy + sh/2;
                const radius = Math.min(sw, sh) / 2;
                const grd = this.ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
                grd.addColorStop(0, '#111');
                grd.addColorStop(1, 'rgba(0,0,0,0.8)');
                this.ctx.fillStyle = grd;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#00bfff';
                this.ctx.lineWidth = 3 * RENDER_SCALE;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.fillStyle = '#00bfff';
                this.ctx.font = `bold ${14 * RENDER_SCALE}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText('↓', cx, cy + 5 * RENDER_SCALE);
            }
            
            this.ctx.shadowBlur = 0;
        });
    }

    drawWallsAndDoors(camX, camY) {
        if (!this.map.currentRoom || !this.map.currentRoom.tiles) return;

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

                // Draw Floor (everywhere?)
                // Maybe optimize later, but for now draw floor then object on top if needed
                // Or just background is enough (already drawn in draw())
                
                if (tile === TILE.WALL || tile === TILE.VOID) {
                    // Autotile: einfache Kanten-Hervorhebung basierend auf Nachbarn
                    const mask = getWallNeighborMask(tiles, r, c, WALL_LIKE_TILES);
                    const isVoid = tile === TILE.VOID;
                    this.ctx.fillStyle = isVoid ? '#050505' : '#2e7d32';
                    this.ctx.fillRect(sx, sy, sTile, sTile);

                    // Außenkanten hervorheben, wenn kein Nachbar anliegt
                    this.ctx.lineWidth = 1 * RENDER_SCALE;
                    this.ctx.strokeStyle = isVoid ? '#0a0a0a' : '#1b5e20';
                    if (!mask.up) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(sx, sy);
                        this.ctx.lineTo(sx + sTile, sy);
                        this.ctx.stroke();
                    }
                    if (!mask.down) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(sx, sy + sTile);
                        this.ctx.lineTo(sx + sTile, sy + sTile);
                        this.ctx.stroke();
                    }
                    if (!mask.left) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(sx, sy);
                        this.ctx.lineTo(sx, sy + sTile);
                        this.ctx.stroke();
                    }
                    if (!mask.right) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(sx + sTile, sy);
                        this.ctx.lineTo(sx + sTile, sy + sTile);
                        this.ctx.stroke();
                    }
                    // Inner-Corner Schattierung als kleiner Hauch Autowall
                    this.ctx.fillStyle = isVoid ? 'rgba(20,20,20,0.2)' : 'rgba(255,255,255,0.08)';
                    if (!mask.up && !mask.left) this.ctx.fillRect(sx, sy, sTile * 0.25, sTile * 0.25);
                    if (!mask.up && !mask.right) this.ctx.fillRect(sx + sTile * 0.75, sy, sTile * 0.25, sTile * 0.25);
                    if (!mask.down && !mask.left) this.ctx.fillRect(sx, sy + sTile * 0.75, sTile * 0.25, sTile * 0.25);
                    if (!mask.down && !mask.right) this.ctx.fillRect(sx + sTile * 0.75, sy + sTile * 0.75, sTile * 0.25, sTile * 0.25);
                } else if (tile === TILE.OBSTACLE) {
                    this.ctx.fillStyle = '#555';
                    this.ctx.fillRect(sx, sy, sTile, sTile);
                    this.ctx.strokeStyle = '#222';
                    this.ctx.strokeRect(sx, sy, sTile, sTile);
                    // 3D effect highlight
                    this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    this.ctx.fillRect(sx, sy, sTile, sTile/3);
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
                            this.ctx.fillStyle = '#888'; // Light/Gray for visited
                        } else {
                            this.ctx.fillStyle = '#000'; // Black/Dark for unknown
                        }
                        this.ctx.fillRect(sx, sy, sTile, sTile);
                    } else {
                        this.ctx.fillStyle = '#8d6e63'; // Closed Door (Wood color)
                        this.ctx.fillRect(sx, sy, sTile, sTile);
                        this.ctx.strokeStyle = '#3e2723';
                        this.ctx.strokeRect(sx, sy, sTile, sTile);
                    }
                }
            }
        }
    }

    drawEntity(entity, color, camX, camY) {
        const sx = (Math.floor(entity.x) - camX) * RENDER_SCALE;
        const sy = (Math.floor(entity.y) - camY) * RENDER_SCALE;
        const sw = entity.width * RENDER_SCALE;
        const sh = entity.height * RENDER_SCALE;
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(sx, sy, sw, sh);
        
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2 * RENDER_SCALE;
        this.ctx.strokeRect(sx, sy, sw, sh);
        
        this.ctx.fillStyle = '#000';
        // Eyes proportional to size
        const eyeSize = sw * 0.15;
        const eyeY = sy + sh * 0.3;
        this.ctx.fillRect(sx + sw * 0.25, eyeY, eyeSize, eyeSize); 
        this.ctx.fillRect(sx + sw * 0.75 - eyeSize, eyeY, eyeSize, eyeSize); 
    }

    drawHealthBar(entity, camX, camY) {
        this.drawBars(entity, false, camX, camY);
    }

    drawBars(entity, showExp = true, camX, camY) {
        const sx = (Math.floor(entity.x) - camX) * RENDER_SCALE;
        const sy = (Math.floor(entity.y) - camY) * RENDER_SCALE;
        const barWidth = entity.width * RENDER_SCALE;
        const barHeight = 3 * RENDER_SCALE; // Smaller bars
        
        let hpY = sy - 5 * RENDER_SCALE; // Closer to entity
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(sx, hpY, barWidth, barHeight);

        const hpPercent = Math.max(0, entity.hp / entity.maxHp);
        this.ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : (hpPercent > 0.2 ? '#ffff00' : '#ff0000');
        this.ctx.fillRect(sx, hpY, barWidth * hpPercent, barHeight);
        
        if (showExp && entity === this.player) {
            let expY = hpY - 4 * RENDER_SCALE; // Closer stack
            
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(sx, expY, barWidth, barHeight);
            
            const maxExp = entity.getNextLevelExp(entity.level);
            const expPercent = Math.max(0, Math.min(1, entity.exp / maxExp));
            this.ctx.fillStyle = '#00e5ff'; 
            this.ctx.fillRect(sx, expY, barWidth * expPercent, barHeight);
        }
    }

    drawLabel(entity, text, camX, camY) {
        const sx = (entity.x - camX) * RENDER_SCALE;
        const sy = (entity.y - camY) * RENDER_SCALE;
        const sw = entity.width * RENDER_SCALE;

        this.ctx.fillStyle = '#fff';
        this.ctx.font = `${8 * RENDER_SCALE}px monospace`; // Smaller font
        this.ctx.textAlign = 'center';
        let yOffset = -10 * RENDER_SCALE;
        if (entity === this.player) yOffset = -15 * RENDER_SCALE;
        
        this.ctx.fillText(text, sx + sw / 2, sy + yOffset);
        this.ctx.textAlign = 'start';
    }

    drawTelegraph(enemy, camX, camY) {
        const cx = (enemy.x + enemy.width / 2 - camX) * RENDER_SCALE;
        const cy = (enemy.y - 25 - camY) * RENDER_SCALE;
        
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 10 * RENDER_SCALE, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.font = `bold ${12 * RENDER_SCALE}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('!', cx, cy + 4 * RENDER_SCALE);
        this.ctx.textAlign = 'start';
    }
}
