// Overlay für Spieler-Stats
import { formatNumber } from './utils.js';

export class StatsOverlay {
    constructor(player) {
        this.player = player;
        this.overlay = document.getElementById('stats-overlay');
        this.toggleBtn = document.getElementById('stats-toggle');
        this.closeBtn = document.getElementById('stats-close');
        this.bindEvents();
    }

    bindEvents() {
        if (this.toggleBtn && this.overlay) {
            this.toggleBtn.addEventListener('click', () => {
                this.overlay.classList.add('open');
                this.refresh();
            });
        }
        if (this.closeBtn && this.overlay) {
            this.closeBtn.addEventListener('click', () => this.overlay.classList.remove('open'));
        }
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.overlay.classList.remove('open');
            });
        }
    }

    refresh() {
        const p = this.player;
        const byId = (id) => document.getElementById(id);

        const setText = (id, val) => {
            const el = byId(id);
            if (el) el.textContent = val;
        };

        setText('stat-level-overlay', p.level);
        setText('stat-hp-overlay', formatNumber(Math.ceil(p.hp)));
        setText('stat-maxhp-overlay', formatNumber(p.maxHp));
        setText('stat-dmg-overlay', formatNumber(p.damage));
        setText('stat-as-overlay', `${p.attackSpeed.toFixed(2)}/s`);
        setText('stat-ms-overlay', formatNumber(p.speed));
        setText('stat-gold-overlay', formatNumber(p.gold));
        setText('stat-exp-overlay', formatNumber(p.exp));
    }
}
