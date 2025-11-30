// Haupt-Einstiegspunkt des Spiels (Phase 2: Canvas)

import { Player } from './player.js';
import { GameMap } from './map.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { MapOverlay } from './mapOverlay.js';
import { StatsOverlay } from './statsOverlay.js';
import * as UI from './ui.js';
import { SaveManager } from './saveManager.js';
import { ITEM_DEFINITIONS, RARITY_LEVELS } from './items/itemData.js';
import { Item } from './item.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) console.error("Canvas element not found!");

        this.player = new Player();
        this.map = new GameMap(this.player, this.canvas); 
        this.map.onStageComplete = (stage) => this.handleStageComplete(stage);
        
        this.inputHandler = new InputHandler(this.canvas, this.player, this.map);
        this.camera = null;
        this.renderer = null; 

        this.lastTime = 0;
        this.isRunning = false;
        this.mapOverlay = null;
        this.statsOverlay = null;
        this.isAutoMode = false;
        this.timeScale = 1;
        
        // Progression
        this.saveData = SaveManager.load();
        this.currentStage = 1;
        this.currentFloor = 1;
        this.selectedStage = 1;
        this.unlockedStage = this.saveData.unlockedStages;

        // State Management
        this.gameState = 'START'; 
        this.menuTime = 0;

        // UI Elements
        this.startScreen = document.getElementById('start-screen');
        this.startBtn = document.getElementById('start-btn');
        this.stageSelectBtn = document.getElementById('stage-select-btn');
        this.inventoryBtn = document.getElementById('inventory-btn');
        
        // Modals
        this.stageModal = document.getElementById('stage-modal');
        this.inventoryModal = document.getElementById('inventory-modal');
        this.inventoryGrid = document.getElementById('inventory-grid');
        this.stageList = document.getElementById('stage-list');
        
        // Inventory UI State
        this.selectedItem = null; // { itemId, rarity }

        this.uiElements = [
            document.getElementById('map-toggle'),
            document.getElementById('stats-toggle'),
            document.getElementById('stats-panel'),
            document.getElementById('nav-overlay'),
            document.getElementById('combat-log')
        ];

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
        
        if (!this.isRunning && this.renderer) {
            this.renderer.draw();
        }
    }

    init() {
        console.log('Initializing Game...');
        this.handleResize();
        
        this.camera = new Camera(this.canvas.width, this.canvas.height);
        this.inputHandler.camera = this.camera;
        this.renderer = new Renderer(this.canvas, this.player, this.map, this.inputHandler, this.camera);

        this.centerPlayer();

        this.mapOverlay = new MapOverlay(this.map);
        this.statsOverlay = new StatsOverlay(this.player);

        this.bindEvents();
        this.loadPlayerEquipment();

        this.toggleUI(false);
        if (this.startScreen) this.startScreen.classList.remove('hidden');

        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    bindEvents() {
        // Main Menu Buttons
        if (this.startBtn) this.startBtn.addEventListener('click', () => this.startGame());
        
        if (this.inventoryBtn) {
            this.inventoryBtn.addEventListener('click', () => {
                this.renderInventory();
                this.toggleModal(this.inventoryModal, true);
            });
        }
        
        if (this.stageSelectBtn) {
            this.stageSelectBtn.addEventListener('click', () => {
                this.renderStageSelect();
                this.toggleModal(this.stageModal, true);
            });
        }

        // Close Modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.dataset.target;
                const modal = document.getElementById(targetId);
                if (modal) this.toggleModal(modal, false);
            });
        });

        // Inventory Actions
        document.getElementById('equip-btn').addEventListener('click', () => this.handleEquip());
        document.getElementById('merge-btn').addEventListener('click', () => this.handleMerge());

        // Auto Button
        const autoBtn = document.getElementById('auto-btn');
        if (autoBtn) autoBtn.addEventListener('click', () => this.toggleAutoMode());
    }

    loadPlayerEquipment() {
        const equip = this.saveData.equipment;
        let hasGear = false;
        for (const slot in equip) {
            const data = equip[slot];
            if (data) {
                const item = new Item(0, 0, data.itemId);
                item.rarity = data.rarity;
                this.player.equipItem(item);
                hasGear = true;
            }
        }
        // Ensure stats are recalculated even if no gear, to set defaults correctly
        this.player.recalculateStats();
    }

    toggleModal(modal, show) {
        if (show) {
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }

    renderInventory() {
        this.inventoryGrid.innerHTML = '';
        const inv = SaveManager.getInventory();
        
        for (const itemId in inv) {
            const def = ITEM_DEFINITIONS[itemId];
            if (!def) continue;
            
            for (const rarity in inv[itemId]) {
                const count = inv[itemId][rarity];
                if (count <= 0) continue;

                const card = document.createElement('div');
                card.className = `item-card rarity-${rarity}`;
                card.innerHTML = `
                    <div class="item-icon">⚔️</div> <!-- Placeholder Icon -->
                    <div class="item-count">${count}</div>
                `;
                // Simple tooltip logic via title for now
                card.title = `${rarity.toUpperCase()} ${def.name}`;
                
                card.addEventListener('click', () => {
                    document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    this.selectItem(itemId, rarity, count);
                });
                
                this.inventoryGrid.appendChild(card);
            }
        }
    }

    selectItem(itemId, rarity, count) {
        this.selectedItem = { itemId, rarity, count };
        const def = ITEM_DEFINITIONS[itemId];
        
        // Show Stats
        const dummyItem = new Item(0, 0, itemId);
        dummyItem.rarity = rarity;
        const stats = dummyItem.getStats();
        
        let statText = `<strong>${def.name}</strong> (${rarity})<br>`;
        statText += `<small>${def.set} Set</small><br><br>`;
        
        for (const key in stats) {
            statText += `${key}: ${stats[key]}<br>`;
        }
        
        document.getElementById('selected-item-info').innerHTML = statText;
        
        // Update Buttons
        const equipBtn = document.getElementById('equip-btn');
        const mergeBtn = document.getElementById('merge-btn');
        
        equipBtn.disabled = false;
        
        // Merge Logic
        const rarityIdx = RARITY_LEVELS.indexOf(rarity);
        const canMerge = count >= 3 && rarityIdx < RARITY_LEVELS.length - 1;
        mergeBtn.disabled = !canMerge;
        mergeBtn.textContent = canMerge ? `Merge to ${RARITY_LEVELS[rarityIdx + 1]}` : "Merge (3 required)";
    }

    handleEquip() {
        if (!this.selectedItem) return;
        const { itemId, rarity } = this.selectedItem;
        const def = ITEM_DEFINITIONS[itemId];
        
        // Slot
        let slot = null;
        if (def.type === 'weapon') slot = 'weapon';
        if (def.type === 'armor') slot = 'armor';
        if (def.type === 'helmet') slot = 'helmet';
        if (def.type === 'accessory') slot = 'accessory';
        
        if (slot) {
            SaveManager.equipItem(slot, itemId, rarity);
            this.saveData = SaveManager.load(); // Reload to sync
            
            // Update Player
            const item = new Item(0, 0, itemId);
            item.rarity = rarity;
            this.player.equipItem(item);
            
            UI.log(`Equipped ${def.name}!`);
        }
    }

    handleMerge() {
        if (!this.selectedItem) return;
        const { itemId, rarity, count } = this.selectedItem;
        const rarityIdx = RARITY_LEVELS.indexOf(rarity);
        
        if (count >= 3 && rarityIdx < RARITY_LEVELS.length - 1) {
            const nextRarity = RARITY_LEVELS[rarityIdx + 1];
            
            SaveManager.removeItem(itemId, rarity, 3);
            SaveManager.addItem(itemId, nextRarity);
            
            this.saveData = SaveManager.load();
            this.renderInventory(); // Refresh
            
            // Clear selection
            this.selectedItem = null;
            document.getElementById('selected-item-info').innerHTML = 'Select an item...';
            document.getElementById('equip-btn').disabled = true;
            document.getElementById('merge-btn').disabled = true;
            
            UI.log(`Merged to ${nextRarity}!`);
        }
    }

    renderStageSelect() {
        this.stageList.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const btn = document.createElement('div');
            btn.className = 'stage-btn';
            btn.textContent = `Stage ${i}`;
            
            if (i > this.unlockedStage) {
                btn.classList.add('locked');
                btn.textContent += ' (Locked)';
            }
            
            if (i === this.selectedStage) {
                btn.style.border = '1px solid #4caf50';
                btn.style.color = '#4caf50';
            }
            
            btn.addEventListener('click', () => {
                if (i <= this.unlockedStage) {
                    this.selectedStage = i;
                    this.renderStageSelect(); // Refresh highlight
                }
            });
            
            this.stageList.appendChild(btn);
        }
    }

    startGame() {
        console.log('Game Started!');
        this.gameState = 'PLAYING';
        
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
        this.uiElements.forEach(el => {
            if (el) el.style.display = show ? '' : 'none';
        });
    }

    handleStageComplete(stage) {
        const newlyUnlocked = Math.min(stage + 1, 5);
        if (newlyUnlocked > this.unlockedStage) {
            this.unlockedStage = newlyUnlocked;
            // Update Save
            const save = SaveManager.load();
            save.unlockedStages = this.unlockedStage;
            SaveManager.save(save);
            this.saveData = save;
        }
        
        this.gameState = 'START';
        this.toggleUI(false);
        if (this.startScreen) this.startScreen.classList.remove('hidden');
        UI.log(`Stage ${stage} abgeschlossen!`, '#ffd700');
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const safeDt = Math.min(dt, 0.1);

        const loops = Math.floor(this.timeScale);
        for (let i = 0; i < loops; i++) {
            this.update(safeDt);
        }
        
        this.renderer.draw();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    update(dt) {
        if (this.gameState === 'START') {
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

        if (this.isAutoMode) {
            this.player.updateAutoPilot(this.map, dt);
        }

        this.player.update(dt);
        
        if (this.map.currentRoom) {
            this.camera.update(this.player, this.map.currentRoom.width, this.map.currentRoom.height);
        }
        
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

        this.player.reset();
        
        this.currentStage = 1;
        this.currentFloor = 1;
        
        this.map.grid = {}; 
        this.map.dungeonLayout = {}; 
        this.map.currentGridX = 0;
        this.map.currentGridY = 0;
        this.map.currentRoom = null; 

        this.gameState = 'START';
        this.toggleUI(false);
        if (this.startScreen) this.startScreen.classList.remove('hidden');
        
        this.menuTime = 0;
        this.centerPlayer(); 
    }

    checkRoomClear() {
        if (this.gameState !== 'PLAYING') return;
        if (this.map.getEnemies().length === 0) {
        }
    }

    toggleAutoMode() {
        if (!this.isAutoMode) {
            this.isAutoMode = true;
            this.timeScale = 1;
            UI.log("Auto-Pilot aktiviert.", "#aaa");
        } else if (this.timeScale === 1) {
            this.timeScale = 10;
            UI.log("Auto-Pilot: 10x Speed!", "#ffaa00");
        } else {
            this.isAutoMode = false;
            this.timeScale = 1;
            UI.log("Auto-Pilot deaktiviert.", "#aaa");
        }
        this.updateAutoButton();
    }

    updateAutoButton() {
        const btn = document.getElementById('auto-btn');
        if (!btn) return;
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

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
