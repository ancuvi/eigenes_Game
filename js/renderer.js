// Renderer: Zeichnet alles auf das Canvas

export class Renderer {
    constructor(canvas, player, map, inputHandler) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.player = player;
        this.map = map;
        this.inputHandler = inputHandler;
    }

    draw() {
        if (!this.ctx) return;

        // 1. Clear Screen
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Background
        // Ein leicht anderer Farbton als CSS Background, damit wir sehen ob Canvas aktiv ist
        this.ctx.fillStyle = '#2a2a2a'; // Dunkelgrau
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid-Hilfslinien für Tiefe
        this.drawGrid();

        // Wände und Türen zeichnen (Dungeon-Struktur)
        this.drawWallsAndDoors();

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

        // 5. Joystick (Visual Feedback)
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

    drawGrid() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        const step = 50;
        
        // Vertikale Linien
        for (let x = 0; x < this.canvas.width; x += step) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        
        // Horizontale Linien
        for (let y = 0; y < this.canvas.height; y += step) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        this.ctx.stroke();
    }

    drawWallsAndDoors() {
        if (!this.map.currentRoom) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const wallThick = 20;
        const doorSize = 100;
        const isClear = this.map.currentRoom.enemies.length === 0;
        const layout = this.map.currentRoom.layout;

        // Wände (Grün)
        this.ctx.fillStyle = '#2e7d32'; // Dunkelgrün
        
        // Top Wall (Left part & Right part)
        this.ctx.fillRect(0, 0, w, wallThick);
        // Bottom Wall
        this.ctx.fillRect(0, h - wallThick, w, wallThick);
        // Left Wall
        this.ctx.fillRect(0, 0, wallThick, h);
        // Right Wall
        this.ctx.fillRect(w - wallThick, 0, wallThick, h);

        // Türen / Löcher in den Wänden
        const cx = this.map.currentGridX;
        const cy = this.map.currentGridY;

        // Helper zum Prüfen ob Nachbar besucht
        const getDoorColor = (dx, dy) => {
            const key = `${cx + dx},${cy + dy}`;
            return this.map.grid[key] ? '#666' : '#222'; // Hell für besucht, Dunkel für unbekannt
        };

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
        
        // Pulsierender Effekt
        const time = Date.now() / 200;
        const offset = Math.sin(time) * 5;
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time)*0.2})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawEntity(entity, color) {
        // Sicherstellen, dass Koordinaten valide sind
        const x = Math.floor(entity.x);
        const y = Math.floor(entity.y);
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, entity.width, entity.height);
        
        // Rahmen
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, entity.width, entity.height);
        
        // Einfaches "Gesicht"
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 10, y + 10, 5, 5); // Auge links
        this.ctx.fillRect(x + 25, y + 10, 5, 5); // Auge rechts
    }

    drawHealthBar(entity) {
        // Wrapper für drawBars (nur HP)
        this.drawBars(entity, false);
    }

    drawBars(entity, showExp = true) {
        const x = Math.floor(entity.x);
        const y = Math.floor(entity.y);
        const barWidth = entity.width;
        const barHeight = 5;
        
        // HP Bar (Unten)
        let hpY = y - 10;
        
        // Background HP
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x, hpY, barWidth, barHeight);

        // Fill HP
        const hpPercent = Math.max(0, entity.hp / entity.maxHp);
        this.ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : (hpPercent > 0.2 ? '#ffff00' : '#ff0000');
        this.ctx.fillRect(x, hpY, barWidth * hpPercent, barHeight);
        
        // EXP Bar (Oben drauf, nur für Player)
        if (showExp && entity === this.player) {
            let expY = hpY - 7; // Über HP Bar
            
            // Background EXP
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(x, expY, barWidth, barHeight);
            
            // Fill EXP
            const maxExp = entity.getNextLevelExp(entity.level);
            const expPercent = Math.max(0, Math.min(1, entity.exp / maxExp));
            this.ctx.fillStyle = '#00e5ff'; // Türkis
            this.ctx.fillRect(x, expY, barWidth * expPercent, barHeight);
        }
    }

    drawLabel(entity, text) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        // Label noch höher setzen, falls EXP Bar da ist
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
