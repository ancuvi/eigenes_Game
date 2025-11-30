// Renderer: Zeichnet alles auf das Canvas

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
        
        this.ctx.save();
        
        // Camera Transform
        if (this.camera) {
            this.ctx.translate(-this.camera.x, -this.camera.y);
        }

        // 2. Background (World Space)
        // Sollte so groß sein wie der Raum.
        const roomW = this.map.currentRoom ? this.map.currentRoom.width : this.canvas.width;
        const roomH = this.map.currentRoom ? this.map.currentRoom.height : this.canvas.height;

        this.ctx.fillStyle = '#2a2a2a'; 
        this.ctx.fillRect(0, 0, roomW, roomH);

        // Grid-Hilfslinien für Tiefe
        this.drawGrid(roomW, roomH);

        // Wände und Türen zeichnen (Dungeon-Struktur)
        this.drawWallsAndDoors(roomW, roomH);
        
        // Hindernisse zeichnen
        this.drawObstacles();
        
        // Items zeichnen
        this.drawItems();

        // Projektile zeichnen
        this.drawProjectiles();

        // 3. Enemies
        const enemies = this.map.getEnemies();
        if (enemies) {
            enemies.forEach(enemy => {
                this.drawEntity(enemy, '#e53935'); // Kräftiges Rot
                this.drawHealthBar(enemy);
                this.drawLabel(enemy, `${enemy.name} (Lvl ${enemy.level})`);
                if (enemy.telegraphTimer > 0) {
                    this.drawTelegraph(enemy);
                }
            });
        }

        // 4. Player
        this.drawEntity(this.player, '#43a047'); // Kräftiges Grün
        this.drawBars(this.player); // HP + EXP
        
        this.ctx.restore();

        // 5. Joystick (Visual Feedback) - Screen Space
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

    drawGrid(w, h) {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        const step = 50;
        
        // Vertikale Linien
        for (let x = 0; x <= w; x += step) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
        }
        
        // Horizontale Linien
        for (let y = 0; y <= h; y += step) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
        }
        this.ctx.stroke();
    }
    
    drawObstacles() {
        const obstacles = this.map.getObstacles();
        if (!obstacles) return;
        
        this.ctx.lineWidth = 2;
        
        obstacles.forEach(obs => {
            const x = Math.floor(obs.x);
            const y = Math.floor(obs.y);
            const w = Math.floor(obs.width);
            const h = Math.floor(obs.height);
            
            if (obs.type === 'void') {
                // Abgrund / Void
                this.ctx.fillStyle = '#000';
                this.ctx.strokeStyle = '#111';
                this.ctx.fillRect(x, y, w, h);
                this.ctx.strokeRect(x, y, w, h);
            } else {
                // Wand / Stein
                this.ctx.fillStyle = '#555';
                this.ctx.strokeStyle = '#222';
                
                this.ctx.fillRect(x, y, w, h);
                this.ctx.strokeRect(x, y, w, h);
                
                this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
                this.ctx.fillRect(x, y, w, 5);
            }
        });
    }

    drawProjectiles() {
        const projectiles = this.map.getProjectiles();
        if (!projectiles) return;

        projectiles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            if (p.owner === 'player') {
                this.ctx.fillStyle = '#ffeb3b'; // Gelb
            } else {
                this.ctx.fillStyle = '#f44336'; // Rot
            }
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }

    drawItems() {
        const items = this.map.getItems();
        if (!items) return;

        items.forEach(item => {
            const x = item.x;
            const y = item.y;
            const w = item.width;
            const h = item.height;
            
            // Glow Effekt
            const time = Date.now() / 200;
            this.ctx.shadowBlur = 10 + Math.sin(time) * 5;
            this.ctx.shadowColor = 'white';

            if (item.type === 'potion_hp') {
                this.ctx.fillStyle = '#f00';
                this.ctx.beginPath();
                this.ctx.arc(x + w/2, y + h/2 + 2, 8, 0, Math.PI * 2); // Flasche
                this.ctx.fill();
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(x + w/2 - 2, y + h/2 - 8, 4, 6); // Hals
            } else if (item.type === 'weapon_sword') {
                this.ctx.fillStyle = '#ccc';
                this.ctx.fillRect(x + w/2 - 2, y, 4, h); // Klinge
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(x, y + h - 6, w, 4); // Griff
            } else if (item.type === 'weapon_wand') {
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(x + w/2 - 2, y, 4, h); // Stab
                this.ctx.fillStyle = '#00ffff';
                this.ctx.beginPath();
                this.ctx.arc(x + w/2, y + 2, 5, 0, Math.PI * 2); // Gem
                this.ctx.fill();
            } else if (item.type === 'next_floor') {
                const cx = x + w/2;
                const cy = y + h/2;
                const radius = Math.min(w, h) / 2;
                const grd = this.ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
                grd.addColorStop(0, '#111');
                grd.addColorStop(1, 'rgba(0,0,0,0.8)');
                this.ctx.fillStyle = grd;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#00bfff';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.fillStyle = '#00bfff';
                this.ctx.font = 'bold 14px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('↓', cx, cy + 5);
            }
            
            this.ctx.shadowBlur = 0;
        });
    }

    drawWallsAndDoors(roomW, roomH) {
        if (!this.map.currentRoom) return;

        const w = roomW;
        const h = roomH;
        const wallThick = 20;
        const doorSize = 100;
        const isClear = this.map.currentRoom.enemies.length === 0;
        const layout = this.map.currentRoom.layout;

        // Wände (Grün)
        this.ctx.fillStyle = '#2e7d32'; 
        
        this.ctx.fillRect(0, 0, w, wallThick); // Top
        this.ctx.fillRect(0, h - wallThick, w, wallThick); // Bottom
        this.ctx.fillRect(0, 0, wallThick, h); // Left
        this.ctx.fillRect(w - wallThick, 0, wallThick, h); // Right

        const cx = this.map.currentGridX;
        const cy = this.map.currentGridY;

        const getDoorColor = (dx, dy) => {
            const key = `${cx + dx},${cy + dy}`;
            return this.map.grid[key] ? '#666' : '#222'; 
        };

        // Türen zentriert an den Wänden des RAUMES
        if (layout.neighbors.up) {
            this.ctx.fillStyle = getDoorColor(0, 1);
            this.ctx.fillRect(w/2 - doorSize/2, 0, doorSize, wallThick);
            if (isClear) this.drawArrow(w/2, wallThick + 20, 'up');
        }
        if (layout.neighbors.down) {
            this.ctx.fillStyle = getDoorColor(0, -1);
            this.ctx.fillRect(w/2 - doorSize/2, h - wallThick, doorSize, wallThick);
            if (isClear) this.drawArrow(w/2, h - wallThick - 20, 'down');
        }
        if (layout.neighbors.left) {
            this.ctx.fillStyle = getDoorColor(-1, 0);
            this.ctx.fillRect(0, h/2 - doorSize/2, wallThick, doorSize);
            if (isClear) this.drawArrow(wallThick + 20, h/2, 'left');
        }
        if (layout.neighbors.right) {
            this.ctx.fillStyle = getDoorColor(1, 0);
            this.ctx.fillRect(w - wallThick, h/2 - doorSize/2, wallThick, doorSize);
            if (isClear) this.drawArrow(w - wallThick - 20, h/2, 'right');
        }
    }

    drawArrow(x, y, dir) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.beginPath();
        const s = 15;
        if (dir === 'up') {
            this.ctx.moveTo(x, y - s);
            this.ctx.lineTo(x - s, y + s);
            this.ctx.lineTo(x + s, y + s);
        } else if (dir === 'down') {
            this.ctx.moveTo(x, y + s);
            this.ctx.lineTo(x - s, y - s);
            this.ctx.lineTo(x + s, y - s);
        } else if (dir === 'left') {
            this.ctx.moveTo(x - s, y);
            this.ctx.lineTo(x + s, y - s);
            this.ctx.lineTo(x + s, y + s);
        } else if (dir === 'right') {
            this.ctx.moveTo(x + s, y);
            this.ctx.lineTo(x - s, y - s);
            this.ctx.lineTo(x - s, y + s);
        }
        this.ctx.fill();
        
        const time = Date.now() / 200;
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time)*0.2})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawEntity(entity, color) {
        const x = Math.floor(entity.x);
        const y = Math.floor(entity.y);
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, entity.width, entity.height);
        
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, entity.width, entity.height);
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 10, y + 10, 5, 5); 
        this.ctx.fillRect(x + 25, y + 10, 5, 5); 
    }

    drawHealthBar(entity) {
        this.drawBars(entity, false);
    }

    drawBars(entity, showExp = true) {
        const x = Math.floor(entity.x);
        const y = Math.floor(entity.y);
        const barWidth = entity.width;
        const barHeight = 5;
        
        let hpY = y - 10;
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x, hpY, barWidth, barHeight);

        const hpPercent = Math.max(0, entity.hp / entity.maxHp);
        this.ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : (hpPercent > 0.2 ? '#ffff00' : '#ff0000');
        this.ctx.fillRect(x, hpY, barWidth * hpPercent, barHeight);
        
        if (showExp && entity === this.player) {
            let expY = hpY - 7; 
            
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(x, expY, barWidth, barHeight);
            
            const maxExp = entity.getNextLevelExp(entity.level);
            const expPercent = Math.max(0, Math.min(1, entity.exp / maxExp));
            this.ctx.fillStyle = '#00e5ff'; 
            this.ctx.fillRect(x, expY, barWidth * expPercent, barHeight);
        }
    }

    drawLabel(entity, text) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        let yOffset = -20;
        if (entity === this.player) yOffset = -28;
        
        this.ctx.fillText(text, entity.x + entity.width / 2, entity.y + yOffset);
        this.ctx.textAlign = 'start';
    }

    drawTelegraph(enemy) {
        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y - 25;
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('!', cx, cy + 4);
        this.ctx.textAlign = 'start';
    }
}
