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
        
        // InputHandler nur aktivieren, wenn Spiel läuft? 
        // Aktuell fängt er Events auf dem Canvas ab. Im Start-Screen ignorieren wir das einfach im Update.
        this.inputHandler = new InputHandler(this.canvas, this.player, this.map);
        this.renderer = new Renderer(this.canvas, this.player, this.map);

        this.lastTime = 0;
        this.isRunning = false;
        this.mapOverlay = null;
        this.statsOverlay = null;

        // State Management
        this.gameState = 'START'; // 'START' oder 'PLAYING'
        this.menuTime = 0; // Für Animationen im Menü

        // UI Elements
        this.startScreen = document.getElementById('start-screen');
        this.startBtn = document.getElementById('start-btn');
        this.uiElements = [
            document.getElementById('map-toggle'),
            document.getElementById('stats-toggle'),
            document.getElementById('stats-panel'),
            document.getElementById('nav-overlay'),
            document.getElementById('combat-log')
        ];

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

        // 3. Map Overlay & Stats Overlay vorbereiten (aber noch nicht anzeigen/nutzen)
        this.mapOverlay = new MapOverlay(this.map);
        this.statsOverlay = new StatsOverlay(this.player);

        // 4. Navigation UI Events binden
        this.bindNavigation();

        // 5. Start Button binden
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startGame());
        }

        // 6. UI verstecken & Start Screen zeigen
        this.toggleUI(false);
        if (this.startScreen) this.startScreen.classList.remove('hidden');

        // 7. Start Loop
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    startGame() {
        console.log('Game Started!');
        this.gameState = 'PLAYING';
        
        // Start Screen weg, UI her
        if (this.startScreen) this.startScreen.classList.add('hidden');
        this.toggleUI(true);

        // Map laden (Gegner spawnen) falls noch leer
        if (!this.map.currentRoom) {
            this.map.loadRoom(0, 0);
        }
        
        if (this.mapOverlay) this.mapOverlay.draw();
        UI.log('Das Abenteuer beginnt!', '#00ff00');
    }

    centerPlayer() {
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height / 2 - this.player.height / 2;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
    }

    bindNavigation() {
        const navCallback = (direction) => {
            if (this.gameState !== 'PLAYING') return;
            
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

    toggleUI(show) {
        const display = show ? '' : 'none'; // '' fällt auf default zurück (block/flex/etc via CSS)
        // Aber manche sind flex, manche block. 'none' versteckt, '' entfernt inline style.
        // Wenn CSS Klassen display regeln, reicht style.display = '' oft nicht, wenn wir vorher 'none' gesetzt haben.
        // Besser: explizit setzen oder css klassen togglen.
        // Da die Elemente im HTML/CSS definiert sind, reicht es, wenn wir 'none' entfernen, 
        // dann greift wieder die CSS Regel.
        
        this.uiElements.forEach(el => {
            if (el) el.style.display = show ? '' : 'none';
        });
        
        // Nav Overlay braucht spezielle Behandlung, da es flex ist im CSS
        // Wenn wir style.display = '' setzen, greift CSS #nav-overlay { ... }
        // Das passt.
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const safeDt = Math.min(dt, 0.1);

        this.update(safeDt);
        this.renderer.draw();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    update(dt) {
        if (this.gameState === 'START') {
            // Animation für Start Screen
            this.menuTime += dt;
            // Player hüpft in der Mitte
            const centerY = this.canvas.height / 2 - this.player.height / 2;
            const bounce = Math.abs(Math.sin(this.menuTime * 5) * 60); // Schnelles Hüpfen
            
            this.player.x = this.canvas.width / 2 - this.player.width / 2;
            this.player.y = centerY - bounce;
            
            // Verhindern dass Player wegrennt falls Input noch aktiv war
            this.player.targetX = this.player.x;
            this.player.targetY = this.player.y;
            this.player.isMoving = false;
            
            return;
        }

        // PLAYING State
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
        UI.log('DU BIST GESTORBEN! Zurück zum Start...', '#ff0000');
        
        // Reset Player (behält Gold/XP)
        this.player.reset();
        
        // Reset Map (Gegner weg, alles frisch)
        this.map.grid = {}; 
        this.map.currentGridX = 0;
        this.map.currentGridY = 0;
        this.map.currentRoom = null; // Wichtig damit update nicht auf null zugreift

        // Wechsel zu Start Screen
        this.gameState = 'START';
        this.toggleUI(false);
        if (this.startScreen) this.startScreen.classList.remove('hidden');
        
        this.menuTime = 0;
        this.centerPlayer(); // Setzt Basis-Position für Animation
    }

    checkRoomClear() {
        if (this.gameState !== 'PLAYING') return;

        const enemies = this.map.getEnemies();
        const navOverlay = document.getElementById('nav-overlay');
        
        if (navOverlay) {
             // Wenn keine Gegner, zeige Pfeile (falls UI generell an ist)
             // Wir müssen aufpassen, dass wir display='none' vom toggleUI nicht überschreiben, 
             // aber toggleUI setzt style auf nav-overlay container.
             // Hier setzen wir style auf die Pfeile (.nav-arrow).
             
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
