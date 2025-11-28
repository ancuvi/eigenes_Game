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

        const pct = (v) => `${Math.round(v * 100)}%`;
        const pctRaw = (v) => `${v}%`;

        setText('stat-level-overlay', p.level);
        setText('stat-hp-overlay', formatNumber(Math.ceil(p.hp)));
        setText('stat-maxhp-overlay', formatNumber(p.maxHp));
        setText('stat-regen-overlay', `${p.hpRegen}/s`);
        setText('stat-gold-overlay', formatNumber(p.gold));
        setText('stat-exp-overlay', formatNumber(p.exp));
        if (p.getNextLevelExp) {
            setText('stat-exp-max-overlay', formatNumber(p.getNextLevelExp(p.level)));
        }
        setText('stat-ms-overlay', formatNumber(p.speed));

        setText('stat-attack', formatNumber(p.attackPower));
        setText('stat-attackrate', `${p.attackRate.toFixed(2)}/s`);
        setText('stat-attackcd', `${Math.round(p.attackCooldownMs)} ms`);
        setText('stat-crit-chance', pct(p.critChance));
        setText('stat-crit-mult', pctRaw(Math.round(p.critMultiplier * 100)));
        setText('stat-range', formatNumber(p.range));
        setText('stat-range-mult', pctRaw(p.rangeDamageMultiplier));
        setText('stat-slow-chance', pctRaw(p.slowChance));
        setText('stat-slow-strength', pctRaw(p.slowStrength));
        setText('stat-hit-rate', pctRaw(p.hitRate));
        setText('stat-double-chance', pctRaw(p.doubleStrikeChance));
        setText('stat-double-mult', pctRaw(p.doubleStrikeDamageMultiplier));
        setText('stat-multistrike-chance', pctRaw(p.multiStrikeChance));
        setText('stat-multistrike-targets', formatNumber(p.multiStrikeTargets));
        setText('stat-splash-chance', pctRaw(p.splashChance));
        setText('stat-splash-mult', pctRaw(p.splashDamageMultiplier));
        setText('stat-splash-targets', formatNumber(p.splashTargets));
        setText('stat-stun-chance', pctRaw(p.stunChance));
        setText('stat-stun-duration', `${p.stunDuration}s`);
        setText('stat-knockback-chance', pctRaw(p.knockbackChance));
        setText('stat-lethal', pctRaw(p.lethalStrike));
        setText('stat-ability-crit', pctRaw(p.abilityCritChance));
        setText('stat-ability-crit-mult', pctRaw(p.abilityCritMultiplier));
        setText('stat-heavy-wound', pctRaw(p.heavyWound));

        setText('stat-dmg-resist', pctRaw(p.damageResistance));
        setText('stat-dodge', pctRaw(p.dodgeChance));
        setText('stat-dmg-return', pctRaw(p.damageReturnMultiplier));
        setText('stat-shield-hp', formatNumber(p.shieldHp));
        setText('stat-shield-cd', `${p.shieldCooldown}s`);
        setText('stat-status-resist', pctRaw(p.statusResistance));
        setText('stat-lifesteal', pctRaw(p.lifeSteal));
        setText('stat-crit-resist', formatNumber(p.critResistance));
        setText('stat-additional-resist', pctRaw(p.additionalDamageResistance));
        setText('stat-shield-dmg-reduction', pctRaw(p.shieldDamageReduction));
    }
}
