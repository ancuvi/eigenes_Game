// Weltkarten-Overlay: Darstellung erkundeter Räume

export class MapOverlay {
    constructor(map) {
        this.map = map;
        this.canvas = document.getElementById('map-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.overlay = document.getElementById('map-overlay');
        this.toggleBtn = document.getElementById('map-toggle');
        this.closeBtn = document.getElementById('map-close');
        this.bindEvents();
    }

    bindEvents() {
        if (this.toggleBtn && this.overlay) {
            this.toggleBtn.addEventListener('click', () => {
                this.overlay.classList.add('open');
                this.draw();
            });
        }
        if (this.closeBtn && this.overlay) {
            this.closeBtn.addEventListener('click', () => this.overlay.classList.remove('open'));
        }
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.overlay.classList.remove('open');
                }
            });
        }
    }

    draw() {
        if (!this.ctx || !this.canvas) return;

        const rooms = Object.entries(this.map.grid).map(([key, val]) => {
            const [x, y] = key.split(',').map(Number);
            return { x, y, visited: val.visited };
        });
        if (rooms.length === 0) return;

        const minX = Math.min(...rooms.map(r => r.x));
        const maxX = Math.max(...rooms.map(r => r.x));
        const minY = Math.min(...rooms.map(r => r.y));
        const maxY = Math.max(...rooms.map(r => r.y));

        const spanX = maxX - minX + 1;
        const spanY = maxY - minY + 1;
        const padding = 20;
        const cellSize = Math.min(
            (this.canvas.width - padding * 2) / spanX,
            (this.canvas.height - padding * 2) / spanY,
            60
        );

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#181818';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        rooms.forEach(room => {
            const sx = padding + (room.x - minX) * cellSize;
            // y invertieren, damit "up" oben angezeigt wird
            const sy = padding + (maxY - room.y) * cellSize;

            // Rahmen
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(sx, sy, cellSize, cellSize);

            if (room.visited) {
                this.ctx.fillStyle = '#4a4a4a';
                this.ctx.fillRect(sx, sy, cellSize, cellSize);
            }

            if (room.x === this.map.currentGridX && room.y === this.map.currentGridY) {
                this.ctx.fillStyle = '#43a047';
                this.ctx.fillRect(sx + 4, sy + 4, cellSize - 8, cellSize - 8);
            }
        });

        // Achsenmittel anzeigen
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.moveTo(0, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }
}
