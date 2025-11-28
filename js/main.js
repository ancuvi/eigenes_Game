// Haupt-Einstiegspunkt des Spiels (Phase 2: Canvas)

import { Player } from './player.js';
import { GameMap } from './map.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { MapOverlay } from './mapOverlay.js';
import { StatsOverlay } from './statsOverlay.js';
import * as UI from './ui.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) console.error("Canvas element not found!");

        this.player = new Player();
        this.map = new GameMap(this.player, this.canvas); 
        
        this.inputHandler = new InputHandler(this.canvas, this.player, this.map);
        this.renderer = new Renderer(this.canvas, this.player, this.map);

        this.lastTime = 0;
        this.isRunning = false;
        this.mapOverlay = null;
        this.statsOverlay = null;

        // Resize Handling
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        // Setze Canvas-Auflösung auf Fenstergröße
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        console.log(`Resized to ${this.canvas.width}x${this.canvas.height}`);
        
        // Render sofort einmal, damit man nicht auf nächsten Frame wartet (optional)
        if (!this.isRunning && this.renderer) {
            this.renderer.draw();
        }
    }

    init() {
        console.log('Initializing Game...');
        
        // 1. Größe korrekt setzen
        this.handleResize();

        // 2. Player initial in die Mitte setzen
        this.centerPlayer();

        console.log(`Player Pos: ${this.player.x}, ${this.player.y}`);

        // 3. Map laden (Gegner spawnen)
        this.map.loadRoom(0, 0);
        this.mapOverlay = new MapOverlay(this.map);
        this.mapOverlay.draw(); // Initial zeichnen
        this.statsOverlay = new StatsOverlay(this.player);

        // 4. Navigation UI
        this.bindNavigation();

        // 5. Start Loop
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    centerPlayer() {
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height / 2 - this.player.height / 2;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
    }

    bindNavigation() {
        const navCallback = (direction) => {
            this.map.switchRoom(direction);
            UI.log(`Raum gewechselt: ${direction}`);
            this.checkRoomClear();
            if (this.mapOverlay) this.mapOverlay.draw();
        };

        const ids = ['nav-up', 'nav-down', 'nav-left', 'nav-right'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => navCallback(el.dataset.dir));
        });
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        // Delta Time in Sekunden
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Sicherheit: Falls dt zu groß ist (z.B. Tab gewechselt), cappen
        const safeDt = Math.min(dt, 0.1);

        this.update(safeDt);
        this.renderer.draw();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    update(dt) {
        this.player.update(dt);
        this.map.update(dt);
        UI.updatePlayerStats(this.player);
        this.checkRoomClear();
        if (this.statsOverlay) this.statsOverlay.refresh();
        
        if (this.player.isDead()) {
             this.handleGameOver();
        }
    }

    handleGameOver() {
        UI.log('DU BIST GESTORBEN! Neustart...', '#ff0000');
        
        // Reset Logic
        // 1. Player Reset (zurück auf Basiswerte)
        this.player.reset();
        this.centerPlayer();

        // 2. Map Reset (Grid leeren, neuer Startraum)
        this.map.grid = {}; 
        this.map.currentGridX = 0;
        this.map.currentGridY = 0;
        this.map.loadRoom(0, 0);
        if (this.mapOverlay) this.mapOverlay.draw();
        if (this.statsOverlay) this.statsOverlay.refresh();

        UI.log('Alles auf Anfang. Viel Glück!', '#ffffff');
    }

    checkRoomClear() {
        const enemies = this.map.getEnemies();
        const navOverlay = document.getElementById('nav-overlay');
        // Zeige Pfeile nur wenn Raum leer
        if (navOverlay) {
             const display = enemies.length === 0 ? 'flex' : 'none';
             navOverlay.querySelectorAll('.nav-arrow').forEach(a => a.style.display = display);
        }
    }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
