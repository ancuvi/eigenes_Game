// UI Modul: Aktualisiert die HTML-Elemente

import { formatNumber } from './utils.js';

// Cache DOM Elemente
const els = {
    playerHp: document.getElementById('stat-hp'),
    playerMaxHp: document.getElementById('stat-max-hp'),
    playerGold: document.getElementById('stat-gold'),
    playerLevel: document.getElementById('stat-level'),
    playerHpBar: document.getElementById('player-hp-bar'),
    enemyHpBar: document.getElementById('enemy-hp-bar'),
    enemyName: document.getElementById('enemy-name'),
    combatLog: document.getElementById('combat-log'),
    navBtns: {
        up: document.getElementById('btn-up'),
        down: document.getElementById('btn-down'),
        left: document.getElementById('btn-left'),
        right: document.getElementById('btn-right')
    }
};

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
    const div = document.createElement('div');
    div.textContent = `> ${message}`;
    div.style.color = color;
    els.combatLog.appendChild(div);
    els.combatLog.scrollTop = els.combatLog.scrollHeight; // Auto-Scroll nach unten
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
