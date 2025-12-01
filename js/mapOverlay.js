// Weltkarten-Overlay: Darstellung erkundeter Räume

export class MapOverlay {
    constructor(map) {
        this.map = map;
        this.canvas = document.getElementById('map-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        if (this.ctx) this.ctx.imageSmoothingEnabled = false;
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

        // Wir wollen auch unbesuchte Nachbarn anzeigen
        const knownRooms = {}; // Key: "x,y", Value: {x, y, status: 'visited' | 'seen'}
        
        // 1. Besuchte Räume hinzufügen
        Object.entries(this.map.grid).forEach(([key, val]) => {
            const [x, y] = key.split(',').map(Number);
            knownRooms[key] = { x, y, status: 'visited' };
            
            // 2. Nachbarn prüfen (aus Dungeon Layout)
            // val.layout ist in map.js gespeichert
            if (val.layout && val.layout.neighbors) {
                if (val.layout.neighbors.up) knownRooms[`${x},${y+1}`] = knownRooms[`${x},${y+1}`] || { x, y: y+1, status: 'seen' };
                if (val.layout.neighbors.down) knownRooms[`${x},${y-1}`] = knownRooms[`${x},${y-1}`] || { x, y: y-1, status: 'seen' };
                if (val.layout.neighbors.left) knownRooms[`${x-1},${y}`] = knownRooms[`${x-1},${y}`] || { x: x-1, y, status: 'seen' };
                if (val.layout.neighbors.right) knownRooms[`${x+1},${y}`] = knownRooms[`${x+1},${y}`] || { x: x+1, y, status: 'seen' };
            }
        });
        
        const roomList = Object.values(knownRooms);
        if (roomList.length === 0) return;

        const minX = Math.min(...roomList.map(r => r.x));
        const maxX = Math.max(...roomList.map(r => r.x));
        const minY = Math.min(...roomList.map(r => r.y));
        const maxY = Math.max(...roomList.map(r => r.y));

        const spanX = maxX - minX + 1;
        const spanY = maxY - minY + 1;
        const padding = 20;
        // Zelle quadratisch halten
        const cellSize = Math.min(
            (this.canvas.width - padding * 2) / spanX,
            (this.canvas.height - padding * 2) / spanY,
            40 // Max Cell Size etwas kleiner, da Dungeon größer sein kann
        );
        
        // Zentrieren
        const offsetX = (this.canvas.width - (spanX * cellSize)) / 2;
        const offsetY = (this.canvas.height - (spanY * cellSize)) / 2;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#181818';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        roomList.forEach(room => {
            const sx = offsetX + (room.x - minX) * cellSize;
            // y invertieren, damit "up" oben angezeigt wird
            const sy = offsetY + (maxY - room.y) * cellSize;

            // Rahmen
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(sx, sy, cellSize, cellSize);

            if (room.status === 'visited') {
                this.ctx.fillStyle = '#555';
                this.ctx.fillRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4);
                
                // Türen andeuten? (Optional, aber nett)
                
            } else if (room.status === 'seen') {
                this.ctx.fillStyle = '#222'; // Dunkler für unbesucht
                this.ctx.fillRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4);
                
                this.ctx.fillStyle = '#444';
                this.ctx.font = '10px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('?', sx + cellSize/2, sy + cellSize/2 + 3);
            }

            if (room.x === this.map.currentGridX && room.y === this.map.currentGridY) {
                this.ctx.fillStyle = '#43a047'; // Player Color
                this.ctx.fillRect(sx + 6, sy + 6, cellSize - 12, cellSize - 12);
            }
            
            // Boss Icon / Treasure Icon
            const layout = this.map.dungeonLayout[`${room.x},${room.y}`];
            if (layout) {
                if (layout.type === 'boss') {
                    this.ctx.fillStyle = '#e53935'; // Red for Boss
                    this.ctx.beginPath();
                    this.ctx.arc(sx + cellSize/2, sy + cellSize/2, 4, 0, Math.PI*2);
                    this.ctx.fill();
                } else if (layout.type === 'treasure') {
                    this.ctx.fillStyle = '#ffd700'; // Yellow/Gold for Treasure
                    this.ctx.beginPath();
                    this.ctx.arc(sx + cellSize/2, sy + cellSize/2, 4, 0, Math.PI*2);
                    this.ctx.fill();
                }
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
