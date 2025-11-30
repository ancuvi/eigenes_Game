// UI Modul: Aktualisiert die HTML-Elemente

import { formatNumber } from './utils.js';
import { UPGRADE_CONFIG } from './player.js';

// Cache DOM Elemente
const els = {
    playerHp: document.getElementById('stat-hp'),
    playerMaxHp: document.getElementById('stat-max-hp'),
    playerGold: document.getElementById('stat-gold'),
    playerLevel: document.getElementById('stat-level'),
    playerHpBar: document.getElementById('player-hp-bar'),
    enemyHpBar: document.getElementById('enemy-hp-bar'),
    enemyName: document.getElementById('enemy-name'),
    msAtk: document.getElementById('ms-atk'),
    msHp: document.getElementById('ms-hp'),
    msDef: document.getElementById('ms-def'),
    msSpd: document.getElementById('ms-spd'),
    logContent: document.getElementById('log-content'),
    logModal: document.getElementById('log-modal'),
    logToggle: document.getElementById('log-toggle'),
    upgradePanel: document.getElementById('upgrade-panel'),
    upgradeBtns: document.querySelectorAll('.upgrade-btn'), // In-game
    startUpgradeBtns: document.querySelectorAll('#start-upgrade-grid .upgrade-btn'), // Start screen (will be generated dynamically if needed, but easier to just bind via delegation or ID)
    startGold: document.getElementById('start-gold-display'),
    navBtns: {
        up: document.getElementById('btn-up'),
        down: document.getElementById('btn-down'),
        left: document.getElementById('btn-left'),
        right: document.getElementById('btn-right')
    }
};

// Initialize Log Toggle
if (els.logToggle && els.logModal) {
    els.logToggle.addEventListener('click', () => {
        els.logModal.classList.remove('hidden');
    });
}

// Close Modals logic (generic)
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('data-target');
        const modal = document.getElementById(targetId);
        if (modal) modal.classList.add('hidden');
    });
});

/**
 * Aktualisiert alle Spieler-Stats im UI
 * @param {object} player 
 */
export function updatePlayerStats(player) {
    if (els.playerHp) els.playerHp.textContent = formatNumber(Math.ceil(player.hp));
    if (els.playerMaxHp) els.playerMaxHp.textContent = formatNumber(player.maxHp);
    if (els.playerGold) els.playerGold.textContent = formatNumber(player.gold);
    if (els.playerLevel) els.playerLevel.textContent = player.level;
    
    const hpPercent = (player.hp / player.maxHp) * 100;
    if (els.playerHpBar) {
        els.playerHpBar.style.width = `${Math.max(0, hpPercent)}%`;
    }

    // Mini Stats Update
    if (els.msAtk) els.msAtk.textContent = formatNumber(player.attackPower);
    if (els.msHp) els.msHp.textContent = `${formatNumber(Math.ceil(player.hp))}/${formatNumber(player.maxHp)}`;
    if (els.msDef) els.msDef.textContent = `${Math.floor(player.damageResistance * 100)}%`;
    if (els.msSpd) els.msSpd.textContent = `${player.attackRate.toFixed(1)}/s`;
}

/**
 * Aktualisiert die Gegner-Anzeige
 * @param {object} enemy 
 */
export function updateEnemyStats(enemy) {
    if (!enemy) return;
    
    if (els.enemyName) {
        els.enemyName.textContent = `${enemy.name} (Lvl ${enemy.level})`;
    }
    
    const hpPercent = (enemy.hp / enemy.maxHp) * 100;
    if (els.enemyHpBar) {
        els.enemyHpBar.style.width = `${Math.max(0, hpPercent)}%`;
    }
}

/**
 * Fügt eine Nachricht zum Combat-Log hinzu
 * @param {string} message 
 * @param {string} color (optional) CSS Farbe
 */
export function log(message, color = '#ccc') {
    if (!els.logContent) return;
    const div = document.createElement('div');
    div.textContent = `> ${message}`;
    div.style.color = color;
    els.logContent.appendChild(div);
    els.logContent.scrollTop = els.logContent.scrollHeight; // Auto-Scroll nach unten
}

export function initUpgradeUI(player) {
    // Generate Start Screen Upgrade Grid content if empty (copy from main panel logic or generate both)
    const startGrid = document.getElementById('start-upgrade-grid');
    const gameGrid = document.querySelector('#upgrade-panel .upgrade-grid');
    
    // We expect HTML to be static or we generate it. 
    // The HTML currently has static buttons for game grid. We should duplicate for start grid.
    if (startGrid && startGrid.children.length === 0 && gameGrid) {
        startGrid.innerHTML = gameGrid.innerHTML;
    }

    const bindUpgradeBtn = (btn) => {
        const type = btn.getAttribute('data-type');
        btn.addEventListener('click', () => {
            if (player.buyUpgrade(type)) {
                updateUpgrades(player);
                if (els.startGold) els.startGold.textContent = formatNumber(player.gold);
                // Also update stats panel if visible
                updatePlayerStats(player);
            }
        });
    };

    // Bind both sets of buttons
    document.querySelectorAll('.upgrade-btn').forEach(bindUpgradeBtn);
    
    updateUpgrades(player);
}

export function updateUpgrades(player) {
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
        const type = btn.getAttribute('data-type');
        const cfg = UPGRADE_CONFIG[type];
        const lvl = player.upgrades[type];
        const cost = player.getUpgradeCost(type);
        
        btn.querySelector('.upg-name').textContent = cfg.name;
        btn.querySelector('.upg-lvl').textContent = `Lvl ${lvl}`;
        btn.querySelector('.upg-cost').textContent = `${formatNumber(cost)} G`;
        
        // Disable if too expensive
        if (player.gold < cost) {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
}

/**
 * Aktiviert oder deaktiviert die Navigations-Pfeile
 * @param {boolean} enabled 
 */
export function toggleNavigation(enabled) {
    Object.values(els.navBtns).forEach(btn => {
        btn.disabled = !enabled;
    });
}

/**
 * Registriert Event Listener für die Navigation
 * @param {function} callback Funktion die bei Klick aufgerufen wird mit Richtung als Argument
 */
export function bindNavigationButtons(callback) {
    els.navBtns.up.addEventListener('click', () => callback('up'));
    els.navBtns.down.addEventListener('click', () => callback('down'));
    els.navBtns.left.addEventListener('click', () => callback('left'));
    els.navBtns.right.addEventListener('click', () => callback('right'));
}
