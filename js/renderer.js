// Renderer: Zeichnet alles auf das Canvas

export class Renderer {
    constructor(canvas, player, map) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.player = player;
        this.map = map;
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
        this.drawHealthBar(this.player);

        // 5. Ziel-Marker
        if (this.player.isMoving) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(this.player.targetX, this.player.targetY, 5, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Linie zum Ziel
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
            this.ctx.lineTo(this.player.targetX, this.player.targetY);
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
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
        const x = Math.floor(entity.x);
        const y = Math.floor(entity.y);
        const barWidth = entity.width;
        const barHeight = 5;
        const yOffset = -10;

        // Hintergrund
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x, y + yOffset, barWidth, barHeight);

        // Füllung
        const hpPercent = Math.max(0, entity.hp / entity.maxHp);
        this.ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : (hpPercent > 0.2 ? '#ffff00' : '#ff0000');
        this.ctx.fillRect(x, y + yOffset, barWidth * hpPercent, barHeight);
    }

    drawLabel(entity, text) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        // Über der Lebensanzeige platzieren
        this.ctx.fillText(text, entity.x + entity.width / 2, entity.y - 18);
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
