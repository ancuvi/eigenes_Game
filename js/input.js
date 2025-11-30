// Input Handling: Maus-Interaktion mit Canvas

import { isPointInRect } from './utils.js';
import * as UI from './ui.js';
import { RENDER_SCALE } from './constants.js';

export class InputHandler {
    constructor(canvas, player, map) {
        this.canvas = canvas;
        this.player = player;
        this.map = map;
        this.camera = null; // Set by main.js

        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.dragThreshold = 10; // Pixel, ab denen es als Drag gilt

        // Event Listener hinzufügen
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch Support für Mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleTouchStart(event) {
        event.preventDefault(); 
        const touch = event.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.startDrag(touch.clientX - rect.left, touch.clientY - rect.top);
    }

    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.startDrag(event.clientX - rect.left, event.clientY - rect.top);
    }
    
    startDrag(x, y) {
        this.isDragging = true;
        this.startX = x;
        this.startY = y;
        this.currentX = x;
        this.currentY = y;
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;
        const rect = this.canvas.getBoundingClientRect();
        this.updateDrag(event.clientX - rect.left, event.clientY - rect.top);
    }
    
    handleTouchMove(event) {
        if (!this.isDragging) return;
        event.preventDefault();
        const touch = event.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.updateDrag(touch.clientX - rect.left, touch.clientY - rect.top);
    }
    
    updateDrag(x, y) {
        this.currentX = x;
        this.currentY = y;
        
        const dx = this.currentX - this.startX;
        const dy = this.currentY - this.startY;
        
        // Vektor normalisieren
        const len = Math.sqrt(dx*dx + dy*dy);
        
        if (len > this.dragThreshold) {
            // Nur bewegen wenn wir über Threshold sind
            this.player.setMovement(dx/len, dy/len);
            
            // Optional: Visueller Joystick hier zeichnen? Besser im Renderer.
            // Wir könnten die Joystick-Daten im InputHandler speichern und Renderer liest sie.
        }
    }

    handleMouseUp(event) {
        this.endDrag();
    }
    
    handleTouchEnd(event) {
        this.endDrag();
    }
    
    endDrag() {
        if (!this.isDragging) return;
        
        const dx = this.currentX - this.startX;
        const dy = this.currentY - this.startY;
        const len = Math.sqrt(dx*dx + dy*dy);
        
        this.isDragging = false;
        this.player.setMovement(0, 0); // Stoppen
        
        if (len < this.dragThreshold) {
            // Es war ein Klick/Tap
            this.processClick(this.startX, this.startY);
        }
    }

    processClick(screenX, screenY) {
        // Adjust for Render Scale
        let x = screenX / RENDER_SCALE;
        let y = screenY / RENDER_SCALE;
        
        // Transform to World Space if camera exists
        if (this.camera) {
            x += this.camera.x;
            y += this.camera.y;
        }
        
        console.log(`Click at ${x}, ${y} (Screen: ${screenX}, ${screenY})`);

        // 0. Prüfen ob Tür angeklickt wurde
        const doorDir = this.map.getDoorAt(x, y);
        if (doorDir) {
            console.log(`Tür angeklickt: ${doorDir}`);
            this.map.switchRoom(doorDir);
            return;
        }

        // 1. Prüfen ob Gegner angeklickt wurden (Optional: Ziel markieren)
        const enemies = this.map.getEnemies();
        let clickedEnemy = null;

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const hitBox = {
                x: enemy.x - 10,
                y: enemy.y - 10,
                width: enemy.width + 20,
                height: enemy.height + 20
            };

            if (isPointInRect(x, y, hitBox)) {
                clickedEnemy = enemy;
                break;
            }
        }

        if (clickedEnemy) {
            UI.log(`Gegner anvisiert: ${clickedEnemy.name}`);
            
            if (this.player.weapon === 'wand') {
                // Zauberstab: Direkt angreifen (schießen)
                this.player.attack(clickedEnemy, this.map);
            } else {
                // Schwert: Hinlaufen und hauen (Auto-Target)
                // Wir zielen auf die Mitte des Gegners
                const tx = clickedEnemy.x + clickedEnemy.width / 2;
                const ty = clickedEnemy.y + clickedEnemy.height / 2;
                this.player.setTarget(tx, ty, clickedEnemy);
            }
        } else {
            // Bodenklick: Hinlaufen
            this.player.setTarget(x, y, null);
        }
    }
}
