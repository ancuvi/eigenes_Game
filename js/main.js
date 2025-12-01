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
import { RENDER_SCALE, TILE_SIZE, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, setActualScale } from './constants.js';
import { AutoPilot } from './autopilot.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) console.error("Canvas element not found!");

        this.player = new Player();
        this.map = new GameMap(this.player, this.canvas); 
        this.map.onStageComplete = (stage) => this.handleStageComplete(stage);
        this.autopilot = new AutoPilot(this.player, this.map);
        
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
        this.startUpgradeBtn = document.getElementById('start-upgrade-btn');
        this.bagBtn = document.getElementById('bag-btn'); // In-Game Bag
        this.actionBtn = document.getElementById('action-btn');
        
        // Modals
        this.stageModal = document.getElementById('stage-modal');
        this.inventoryModal = document.getElementById('inventory-modal');
        this.startUpgradeModal = document.getElementById('start-upgrade-modal');
        this.inventoryGrid = document.getElementById('inventory-grid');
        this.stageList = document.getElementById('stage-list');
        
        // Inventory UI State
        this.selectedItem = null; // { itemId, rarity }
        this.selectedSlot = null; // 'weapon', etc. if equipped item selected

        this.itemIcons = {
            weapon: '⚔️',
            armor: '🛡️',
            helmet: '🪖',
            accessory: '💍'
        };

        this.uiElements = [
            document.getElementById('log-toggle'),
            document.getElementById('map-toggle'),
            document.getElementById('stats-toggle'),
            document.getElementById('stats-panel'),
            document.getElementById('nav-overlay'),
            document.getElementById('upgrade-panel')
        ];

        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        // Keep the logical canvas fixed at the virtual Isaac-style resolution.
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const scale = Math.floor(
            Math.min(screenW / VIRTUAL_WIDTH, screenH / VIRTUAL_HEIGHT)
        );
        const safeScale = Math.max(1, scale);
        setActualScale(safeScale);

        const displayWidth = VIRTUAL_WIDTH * safeScale;
        const displayHeight = VIRTUAL_HEIGHT * safeScale;

        // Canvas Internal Resolution (Fixed)
        this.canvas.width = VIRTUAL_WIDTH;
        this.canvas.height = VIRTUAL_HEIGHT;

        // Canvas Styles (Display Size)
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
        this.canvas.style.imageRendering = 'pixelated';
        
        // Debug output to verify the calculated integer scale in the browser console.
        console.log("Resize:", {screenW,screenH,scale,safeScale,display: {w:this.canvas.style.width, h:this.canvas.style.height}});

        // Update Camera Viewport
        if (this.camera) {
            this.camera.width = VIRTUAL_WIDTH;
            this.camera.height = VIRTUAL_HEIGHT;
        }
        
        if (!this.isRunning && this.renderer) {
            this.renderer.draw();
        }
    }

    init() {
        console.log('Initializing Game...');
        this.handleResize();
        
        // Camera operates in Virtual Units
        this.camera = new Camera(VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        this.inputHandler.camera = this.camera;
        this.renderer = new Renderer(this.canvas, this.player, this.map, this.inputHandler, this.camera);

        this.centerPlayer();

        this.mapOverlay = new MapOverlay(this.map);
        this.statsOverlay = new StatsOverlay(this.player);

        UI.initUpgradeUI(this.player);

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

        if (this.startUpgradeBtn) {
            this.startUpgradeBtn.addEventListener('click', () => {
                UI.updateUpgrades(this.player);
                const goldDisplay = document.getElementById('start-gold-display');
                if (goldDisplay) goldDisplay.textContent = this.player.gold;
                this.toggleModal(this.startUpgradeModal, true);
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
        this.actionBtn.addEventListener('click', () => this.handleAction());
        document.getElementById('merge-btn').addEventListener('click', () => this.handleMerge());
        
        // Equipment Slots
        document.querySelectorAll('.equip-slot').forEach(slotEl => {
            slotEl.addEventListener('click', () => {
                const slot = slotEl.dataset.slot;
                this.selectEquippedItem(slot);
            });
        });

        // In-Game Bag
        if (this.bagBtn) {
            this.bagBtn.addEventListener('click', () => {
                this.renderInventory(this.player.runLoot, true);
                this.toggleModal(this.inventoryModal, true);
            });
        }

        // Auto Button
        const autoBtn = document.getElementById('auto-btn');
        if (autoBtn) autoBtn.addEventListener('click', () => this.toggleAutoMode());
    }

    loadPlayerEquipment() {
        // Reset Player Equipment
        this.player.equipment = {
            weapon: null,
            armor: null,
            helmet: null,
            accessory: null
        };

        const equip = this.saveData.equipment;
        for (const slot in equip) {
            const data = equip[slot];
            if (data) {
                const item = new Item(0, 0, data.itemId);
                item.rarity = data.rarity;
                this.player.equipItem(item);
            }
        }
        this.player.recalculateStats();
    }

    toggleModal(modal, show) {
        if (show) {
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }

    renderInventory(source = null, viewOnly = false) {
        const inv = source || SaveManager.getInventory();
        const equipmentPanel = document.getElementById('equipment-panel');
        const actionBtn = this.actionBtn;
        const mergeBtn = document.getElementById('merge-btn');
        const modalHeader = this.inventoryModal.querySelector('h2');

        if (viewOnly) {
            equipmentPanel.style.display = 'none';
            actionBtn.style.display = 'none';
            mergeBtn.style.display = 'none';
            modalHeader.textContent = "Current Run Loot";
        } else {
            equipmentPanel.style.display = 'flex';
            actionBtn.style.display = 'inline-block';
            mergeBtn.style.display = 'inline-block';
            modalHeader.textContent = "Inventory & Merge";
            this.renderEquipment();
        }
        
        this.inventoryGrid.innerHTML = '';
        
        // If empty
        if (Object.keys(inv).length === 0) {
            this.inventoryGrid.innerHTML = '<div style="padding:20px; color:#888;">Empty</div>';
            return;
        }

        for (const itemId in inv) {
            const def = ITEM_DEFINITIONS[itemId];
            if (!def) continue;
            
            for (const rarity in inv[itemId]) {
                const count = inv[itemId][rarity];
                if (count <= 0) continue;

                const card = document.createElement('div');
                card.className = `item-card rarity-${rarity}`;
                const icon = this.itemIcons[def.type] || '❓';
                card.innerHTML = `
                    <div class="item-icon">${icon}</div>
                    <div class="item-count">${count}</div>
                `;
                card.title = `${rarity.toUpperCase()} ${def.name}`;
                
                card.addEventListener('click', () => {
                    // Deselect Slot UI
                    document.querySelectorAll('.equip-slot').forEach(s => s.classList.remove('selected'));
                    // Select Card
                    document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    
                    if (!viewOnly) {
                        this.selectItem(itemId, rarity, count);
                    } else {
                        // View Only Details (no actions)
                        this.selectItemViewOnly(itemId, rarity, count);
                    }
                });
                
                this.inventoryGrid.appendChild(card);
            }
        }
    }

    selectItemViewOnly(itemId, rarity, count) {
        const def = ITEM_DEFINITIONS[itemId];
        const dummyItem = new Item(0, 0, itemId);
        dummyItem.rarity = rarity;
        const stats = dummyItem.getStats();
        
        let statText = `<strong class="text-rarity-${rarity}">${def.name}</strong> <span class="text-rarity-${rarity}">(${rarity})</span><br>`;
        statText += `<small>${def.set} Set</small><br>`;
        statText += `Count: ${count}<br><br>`;
        for (const key in stats) {
            statText += `${key}: ${stats[key]}<br>`;
        }
        document.getElementById('selected-item-info').innerHTML = statText;
    }

    renderEquipment() {
        const equip = SaveManager.getEquipment();
        for (const slot in equip) {
            const el = document.querySelector(`.equip-slot[data-slot="${slot}"] .slot-content`);
            const slotEl = document.querySelector(`.equip-slot[data-slot="${slot}"]`);
            if (!el) continue;
            
            slotEl.classList.remove('selected'); // Reset selection vis
            
            const item = equip[slot];
            if (item) {
                const def = ITEM_DEFINITIONS[item.itemId];
                const icon = def ? (this.itemIcons[def.type] || '❓') : '❓';
                el.innerHTML = icon;
                el.className = `slot-content filled rarity-${item.rarity}`;
                // We could use rarity color border here if CSS supports it on slot-content
            } else {
                el.innerHTML = '';
                el.className = 'slot-content';
            }
        }
    }

    selectItem(itemId, rarity, count) {
        this.selectedItem = { itemId, rarity, count };
        this.selectedSlot = null; // Reset slot selection
        
        const def = ITEM_DEFINITIONS[itemId];
        const dummyItem = new Item(0, 0, itemId);
        dummyItem.rarity = rarity;
        const stats = dummyItem.getStats();
        
        let statText = `<strong class="text-rarity-${rarity}">${def.name}</strong> <span class="text-rarity-${rarity}">(${rarity})</span><br>`;
        statText += `<small>${def.set} Set</small><br><br>`;
        for (const key in stats) {
            statText += `${key}: ${stats[key]}<br>`;
        }
        document.getElementById('selected-item-info').innerHTML = statText;
        
        // Update Action Button -> Equip
        this.actionBtn.textContent = "Equip";
        this.actionBtn.disabled = false;
        this.actionBtn.onclick = () => this.handleEquip(); // Direct bind or use flag
        
        // Update Merge
        const mergeBtn = document.getElementById('merge-btn');
        const rarityIdx = RARITY_LEVELS.indexOf(rarity);
        const canMerge = count >= 3 && rarityIdx < RARITY_LEVELS.length - 1;
        mergeBtn.disabled = !canMerge;
        mergeBtn.textContent = canMerge ? `Merge to ${RARITY_LEVELS[rarityIdx + 1]}` : "Merge (3 required)";
    }

    selectEquippedItem(slot) {
        // Highlight slot
        document.querySelectorAll('.equip-slot').forEach(s => s.classList.remove('selected'));
        document.querySelector(`.equip-slot[data-slot="${slot}"]`).classList.add('selected');
        document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));

        const item = SaveManager.getEquipment()[slot];
        this.selectedItem = null;
        this.selectedSlot = slot;
        
        const mergeBtn = document.getElementById('merge-btn');
        mergeBtn.disabled = true;
        mergeBtn.textContent = "Merge";

        if (!item) {
            document.getElementById('selected-item-info').innerHTML = "Empty Slot";
            this.actionBtn.textContent = "Unequip";
            this.actionBtn.disabled = true;
            return;
        }

        const def = ITEM_DEFINITIONS[item.itemId];
        const dummyItem = new Item(0, 0, item.itemId);
        dummyItem.rarity = item.rarity;
        const stats = dummyItem.getStats();
        
        let statText = `<strong class="text-rarity-${item.rarity}">${def.name}</strong> <span class="text-rarity-${item.rarity}">(${item.rarity})</span> [Equipped]<br>`;
        statText += `<small>${def.set} Set</small><br><br>`;
        for (const key in stats) {
            statText += `${key}: ${stats[key]}<br>`;
        }
        document.getElementById('selected-item-info').innerHTML = statText;

        // Update Action Button -> Unequip
        this.actionBtn.textContent = "Unequip";
        this.actionBtn.disabled = false;
    }

    handleAction() {
        if (this.selectedSlot) {
            this.handleUnequip();
        } else if (this.selectedItem) {
            this.handleEquip();
        }
    }

    handleEquip() {
        if (!this.selectedItem) return;
        const { itemId, rarity } = this.selectedItem;
        const def = ITEM_DEFINITIONS[itemId];
        
        let slot = null;
        if (def.type === 'weapon') slot = 'weapon';
        if (def.type === 'armor') slot = 'armor';
        if (def.type === 'helmet') slot = 'helmet';
        if (def.type === 'accessory') slot = 'accessory';
        
        if (slot) {
            if (SaveManager.equipItem(slot, itemId, rarity)) {
                this.saveData = SaveManager.load();
                this.loadPlayerEquipment(); // Updates player stats & equipment
                this.renderInventory(); // Refresh UI (moves item from inv to equip)
                UI.log(`Equipped ${def.name}!`);
                
                // Select the slot we just equipped to? Or clear?
                this.selectEquippedItem(slot);
            }
        }
    }

    handleUnequip() {
        if (!this.selectedSlot) return;
        
        if (SaveManager.unequipItem(this.selectedSlot)) {
            this.saveData = SaveManager.load();
            this.loadPlayerEquipment();
            this.renderInventory();
            UI.log(`Unequipped item!`);
            
            // Refresh selection (now empty)
            this.selectEquippedItem(this.selectedSlot);
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

        // Spawn Player correctly in Room Center
        if (this.map.currentRoom) {
            const tiles = this.map.currentRoom.tiles;
            // Center spawn using Virtual Resolution
            this.player.x = (VIRTUAL_WIDTH - this.player.width) / 2;
            this.player.y = (VIRTUAL_HEIGHT - this.player.height) / 2;
            
            // Force Camera Update immediately
            if (this.camera) {
                this.camera.update(this.player, this.map.currentRoom.width, this.map.currentRoom.height);
            }
        }
        
        if (this.mapOverlay) this.mapOverlay.draw();
        UI.log(`Stage ${this.currentStage} - Floor ${this.currentFloor}`, '#00ff00');
    }

    centerPlayer() {
        // Center in World Space
        const worldW = VIRTUAL_WIDTH;
        const worldH = VIRTUAL_HEIGHT;
        this.player.x = (worldW - this.player.width) / 2;
        this.player.y = (worldH - this.player.height) / 2;
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
            const worldW = VIRTUAL_WIDTH;
            const worldH = VIRTUAL_HEIGHT;
            const centerY = (worldH - this.player.height) / 2;
            
            // Bounce in World Units (reduce bounce height to match scale?)
            // 60px bounce is huge in 16x16 world if scale is 3 (180px screen).
            // Let's reduce it to 20 world units.
            const bounce = Math.abs(Math.sin(this.menuTime * 5) * 20); 
            
            this.player.x = (worldW - this.player.width) / 2;
            this.player.y = centerY - bounce;
            this.player.targetX = this.player.x;
            this.player.targetY = this.player.y;
            this.player.isMoving = false;
            return;
        }

        if (this.isAutoMode) {
            this.autopilot.update(dt);
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
