// Input Handling: Maus-Interaktion mit Canvas

import { isPointInRect } from './utils.js';
import * as UI from './ui.js';
import { RENDER_SCALE, ACTUAL_SCALE } from './constants.js';

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
        this.dragThreshold = 5; // Reduziert für schnelleres Ansprechen
        this.maxRadius = 34;    // Max Radius für den Joystick (größerer Bewegungsraum)

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
        this.startDrag(
            (touch.clientX - rect.left) / ACTUAL_SCALE, 
            (touch.clientY - rect.top) / ACTUAL_SCALE
        );
    }

    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.startDrag(
            (event.clientX - rect.left) / ACTUAL_SCALE, 
            (event.clientY - rect.top) / ACTUAL_SCALE
        );
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
        this.updateDrag(
            (event.clientX - rect.left) / ACTUAL_SCALE, 
            (event.clientY - rect.top) / ACTUAL_SCALE
        );
    }
    
    handleTouchMove(event) {
        if (!this.isDragging) return;
        event.preventDefault();
        const touch = event.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.updateDrag(
            (touch.clientX - rect.left) / ACTUAL_SCALE, 
            (touch.clientY - rect.top) / ACTUAL_SCALE
        );
    }
    
    updateDrag(x, y) {
        this.currentX = x;
        this.currentY = y;
        
        let dx = this.currentX - this.startX;
        let dy = this.currentY - this.startY;
        let len = Math.sqrt(dx*dx + dy*dy);
        
        // Dynamic Joystick Logic: Base follows finger
        if (len > this.maxRadius) {
            const dirX = dx / len;
            const dirY = dy / len;
            
            // Move start position so that distance stays at maxRadius
            this.startX = this.currentX - dirX * this.maxRadius;
            this.startY = this.currentY - dirY * this.maxRadius;
            
            // Recalculate delta (will be exactly maxRadius * dir)
            dx = this.currentX - this.startX;
            dy = this.currentY - this.startY;
            len = this.maxRadius;
        }
        
        if (len > this.dragThreshold) {
            // Normalize movement vector
            this.player.setMovement(dx/len, dy/len);
        } else {
            // Stop if within deadzone/threshold (optional, or keep moving slightly?)
            // Better to allow micro-movement if user intends, but usually threshold is for click detection.
            // If dragging started, we might want continuous movement.
            // But if we are in dynamic mode, we are usually moving.
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

    screenToWorld(screenX, screenY) {
        if (!this.renderer) return { x: screenX, y: screenY };
        const { offsetX, offsetY, worldScale } = this.renderer;
        const camX = this.camera ? this.camera.x : 0;
        const camY = this.camera ? this.camera.y : 0;
        
        const worldX = (screenX - offsetX) / worldScale + camX;
        const worldY = (screenY - offsetY) / worldScale + camY;
        return { x: worldX, y: worldY };
    }

    processClick(screenX, screenY) {
        const worldPos = this.screenToWorld(screenX, screenY);
        const x = worldPos.x;
        const y = worldPos.y;
        
        console.log(`Click at World: ${x}, ${y} (Screen: ${screenX}, ${screenY})`);

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
                x: enemy.x - 40, // 10 * 4
                y: enemy.y - 40,
                width: enemy.width + 80, // 20 * 4
                height: enemy.height + 80
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
