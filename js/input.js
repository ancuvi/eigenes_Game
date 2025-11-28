// Input Handling: Maus-Interaktion mit Canvas

import { isPointInRect } from './utils.js';
import * as UI from './ui.js';

export class InputHandler {
    constructor(canvas, player, map) {
        this.canvas = canvas;
        this.player = player;
        this.map = map;

        // Event Listener hinzufügen
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        
        // Touch Support für Mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    }

    handleTouchStart(event) {
        event.preventDefault(); // Scrollen verhindern
        const touch = event.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.processInput(x, y);
    }

    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.processInput(x, y);
    }

    processInput(x, y) {
        console.log(`Input at ${x}, ${y}`);

        // 1. Prüfen ob Gegner angeklickt wurden
        const enemies = this.map.getEnemies();
        let clickedEnemy = null;

        // Rückwärts loopen, falls sich Dinge überlappen (der oberste zuerst)
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            // Wir erweitern die Klickbox etwas, damit man leichter trifft
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
            console.log("Gegner angeklickt:", clickedEnemy.name);
            // Zielpunkt ist Mitte des Gegners
            this.player.setTarget(clickedEnemy.x + clickedEnemy.width / 2, clickedEnemy.y + clickedEnemy.height / 2, clickedEnemy);
            UI.log(`Du rennst auf ${clickedEnemy.name} zu!`);
        } else {
            // 2. Bewegung zum Punkt
            console.log("Bewegung zu Boden");
            this.player.setTarget(x, y, null);
            UI.log('Du bewegst dich zur gewählten Position.');
        }
    }
}
