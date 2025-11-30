// Haupt-Einstiegspunkt des Spiels (Phase 2: Canvas)

import { Player } from './player.js';
import { GameMap } from './map.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { MapOverlay } from './mapOverlay.js';
import { StatsOverlay } from './statsOverlay.js';
import * as UI from './ui.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) console.error("Canvas element not found!");

        this.player = new Player();
        this.map = new GameMap(this.player, this.canvas); 
        this.map.onStageComplete = (stage) => this.handleStageComplete(stage);
        
        // InputHandler nur aktivieren, wenn Spiel läuft? 
        // Aktuell fängt er Events auf dem Canvas ab. Im Start-Screen ignorieren wir das einfach im Update.
        this.inputHandler = new InputHandler(this.canvas, this.player, this.map);
        
        // Kamera (wird in init erstellt)
        this.camera = null;
        
        // Renderer bekommt Kamera später
        this.renderer = null; 

        this.lastTime = 0;
        this.isRunning = false;
        this.mapOverlay = null;
        this.statsOverlay = null;
        this.isAutoMode = false; // Auto-Pilot Status
        this.timeScale = 1; // 1x Speed
        
        // Progression
        this.currentStage = 1;
        this.currentFloor = 1;
        this.selectedStage = 1;
        this.unlockedStage = parseInt(localStorage.getItem('unlockedStage') || '1', 10);

        // State Management
        this.gameState = 'START'; // 'START' oder 'PLAYING'
        this.menuTime = 0; // Für Animationen im Menü

        // UI Elements
        this.startScreen = document.getElementById('start-screen');
        this.startBtn = document.getElementById('start-btn');
        this.stageButtons = Array.from(document.querySelectorAll('.stage-btn'));
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
        const container = document.getElementById('game-area');
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        } else {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
        
        if (this.camera) {
            this.camera.width = this.canvas.width;
            this.camera.height = this.canvas.height;
        }
        
        console.log(`Resized to ${this.canvas.width}x${this.canvas.height}`);
        
        if (!this.isRunning && this.renderer) {
            this.renderer.draw();
        }
    }

    init() {
        console.log('Initializing Game...');
        
        // 1. Größe korrekt setzen
        this.handleResize();
        
        // Kamera erstellen
        this.camera = new Camera(this.canvas.width, this.canvas.height);
        this.inputHandler.camera = this.camera; // Link Camera to InputHandler
        this.renderer = new Renderer(this.canvas, this.player, this.map, this.inputHandler, this.camera);

        // 2. Player initial in die Mitte setzen
        this.centerPlayer();

        // 3. Map Overlay & Stats Overlay vorbereiten (aber noch nicht anzeigen/nutzen)
        this.mapOverlay = new MapOverlay(this.map);
        this.statsOverlay = new StatsOverlay(this.player);

        // 4. Navigation UI Events binden (entfernt, da Canvas-basiert)
        // this.bindNavigation();

        // 5. Start Button binden
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startGame());
        }
        this.bindStageButtons();
        
        // Auto Button
        const autoBtn = document.getElementById('auto-btn');
        if (autoBtn) {
            autoBtn.addEventListener('click', () => this.toggleAutoMode());
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
        
        // Map Progression setzen
        this.currentStage = this.selectedStage;
        this.currentFloor = 1;
        this.map.setStage(this.currentStage, this.currentFloor);
        this.map.grid = {};
        this.map.dungeonLayout = {};
        this.map.currentRoom = null;
        this.map.currentGridX = 0;
        this.map.currentGridY = 0;

        // Map laden (Gegner spawnen) falls noch leer
        if (!this.map.currentRoom) {
            this.map.loadRoom(0, 0);
        }
        
        if (this.mapOverlay) this.mapOverlay.draw();
        UI.log(`Stage ${this.currentStage} - Floor ${this.currentFloor}`, '#00ff00');
    }

    centerPlayer() {
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height / 2 - this.player.height / 2;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
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

    bindStageButtons() {
        if (!this.stageButtons || this.stageButtons.length === 0) return;
        this.stageButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const s = parseInt(btn.dataset.stage, 10);
                if (s > this.unlockedStage) return;
                this.selectedStage = s;
                this.updateStageButtons();
            });
        });
        this.updateStageButtons();
    }

    updateStageButtons() {
        this.stageButtons.forEach(btn => {
            const s = parseInt(btn.dataset.stage, 10);
            const locked = s > this.unlockedStage;
            btn.disabled = locked;
            btn.style.display = locked ? 'none' : '';
            btn.classList.toggle('active', s === this.selectedStage);
        });
    }

    handleStageComplete(stage) {
        const newlyUnlocked = Math.min(stage + 1, 5);
        if (newlyUnlocked > this.unlockedStage) {
            this.unlockedStage = newlyUnlocked;
            localStorage.setItem('unlockedStage', String(this.unlockedStage));
        }
        this.selectedStage = Math.min(this.unlockedStage, stage + 1);
        this.gameState = 'START';
        this.toggleUI(false);
        if (this.startScreen) this.startScreen.classList.remove('hidden');
        this.updateStageButtons();
        UI.log(`Stage ${stage} abgeschlossen! Stage ${this.unlockedStage} freigeschaltet.`, '#ffd700');
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const safeDt = Math.min(dt, 0.1);

        // Bei 10x Speed: Update mehrmals pro Frame ausführen
        const loops = Math.floor(this.timeScale);
        for (let i = 0; i < loops; i++) {
            this.update(safeDt);
        }
        
        this.renderer.draw();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    update(dt) {
        if (this.gameState === 'START') {
            // Animation für Start Screen
            this.menuTime += dt;
            const centerY = this.canvas.height / 2 - this.player.height / 2;
            const bounce = Math.abs(Math.sin(this.menuTime * 5) * 60); 
            this.player.x = this.canvas.width / 2 - this.player.width / 2;
            this.player.y = centerY - bounce;
            this.player.targetX = this.player.x;
            this.player.targetY = this.player.y;
            this.player.isMoving = false;
            return;
        }

        // PLAYING State
        
        // Auto-Pilot Logic
        if (this.isAutoMode) {
            this.player.updateAutoPilot(this.map, dt);
        }

        this.player.update(dt);
        
        // Kamera Update
        if (this.map.currentRoom) {
            this.camera.update(this.player, this.map.currentRoom.width, this.map.currentRoom.height);
        }
        
        // Auto-Attack triggern (auch im Auto-Mode relevant)
        this.player.autoAttack(dt, this.map.getEnemies(), this.map);
        
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
        
        this.isAutoMode = false;
        this.timeScale = 1;
        this.updateAutoButton();

        // Reset Player (behält Gold/XP)
        this.player.reset();
        
        // Reset Progression
        this.currentStage = 1;
        this.currentFloor = 1;
        
        // Reset Map (Gegner weg, alles frisch)
        this.map.grid = {}; 
        this.map.dungeonLayout = {}; // Reset Dungeon Layout too!
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
        if (this.map.getEnemies().length === 0) {
             // Eventuell Sound abspielen oder so
        }
    }

    toggleAutoMode() {
        if (!this.isAutoMode) {
            // Aus -> An (1x)
            this.isAutoMode = true;
            this.timeScale = 1;
            UI.log("Auto-Pilot aktiviert.", "#aaa");
        } else if (this.timeScale === 1) {
            // An (1x) -> An (10x)
            this.timeScale = 10;
            UI.log("Auto-Pilot: 10x Speed!", "#ffaa00");
        } else {
            // An (10x) -> Aus
            this.isAutoMode = false;
            this.timeScale = 1;
            UI.log("Auto-Pilot deaktiviert.", "#aaa");
        }
        this.updateAutoButton();
    }

    updateAutoButton() {
        const btn = document.getElementById('auto-btn');
        if (!btn) return;
        
        // Reset classes
        btn.classList.remove('auto-on', 'auto-fast');
        
        if (!this.isAutoMode) {
            btn.textContent = "Auto: OFF";
        } else if (this.timeScale === 1) {
            btn.textContent = "Auto: ON";
            btn.classList.add('auto-on');
        } else {
            btn.textContent = "Auto: 10x";
            btn.classList.add('auto-on', 'auto-fast');
        }
    }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
