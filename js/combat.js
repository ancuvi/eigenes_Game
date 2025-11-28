// Combat Logik: Automatischer Kampf
import * as UI from './ui.js';
import { sleep } from './utils.js';

export class CombatSystem {
    constructor(player, onCombatEnd) {
        this.player = player;
        this.enemy = null;
        this.onCombatEnd = onCombatEnd;
        this.isFighting = false;
        this.combatSpeed = 1000; // ms pro Tick (Attacke)
    }

    startCombat(enemy) {
        this.enemy = enemy;
        this.isFighting = true;
        UI.log(`Ein wildes ${enemy.name} taucht auf!`, '#ffaa00');
        UI.updateEnemyStats(this.enemy);
        
        // Startet den Kampf-Loop
        this.combatLoop();
    }

    async combatLoop() {
        while (this.isFighting && !this.player.isDead() && !this.enemy.isDead()) {
            await sleep(this.combatSpeed);
            
            // Spieler greift an
            const playerDmg = this.player.attack();
            this.enemy.takeDamage(playerDmg);
            UI.log(`Du triffst ${this.enemy.name} für ${playerDmg} Schaden.`);
            UI.updateEnemyStats(this.enemy);

            if (this.enemy.isDead()) {
                this.endCombat(true);
                break;
            }

            await sleep(200); // Kleine Pause zwischen Attacken für "Game Feel"

            // Gegner greift an
            const enemyDmg = this.enemy.attack();
            this.player.takeDamage(enemyDmg);
            UI.log(`${this.enemy.name} trifft dich für ${enemyDmg} Schaden.`, '#ff5555');
            UI.updatePlayerStats(this.player);

            if (this.player.isDead()) {
                this.endCombat(false);
                break;
            }
        }
    }

    endCombat(playerWon) {
        this.isFighting = false;
        
        if (playerWon) {
            UI.log(`${this.enemy.name} besiegt!`, '#00ff00');
            UI.log(`Du erhältst ${this.enemy.goldReward} Gold.`, '#ffff00');
            this.player.gainGold(this.enemy.goldReward);
            
            // Kleine Heilung nach Kampf (optional)
            const healAmount = Math.floor(this.player.maxHp * 0.1);
            this.player.heal(healAmount);
            UI.log(`Du regenerierst ${healAmount} HP.`);
            
            // Player wird vielleicht stärker (einfaches Level-Up System)
            this.player.exp += 10;
            if (this.player.exp >= 100) {
                this.player.level++;
                this.player.exp = 0;
                this.player.maxHp += 20;
                this.player.damage += 2;
                this.player.hp = this.player.maxHp;
                UI.log(`LEVEL UP! Du bist jetzt Level ${this.player.level}!`, '#00ffff');
            }

            UI.updatePlayerStats(this.player);
            // Callback an main.js, dass Kampf vorbei ist
            this.onCombatEnd(true);
        } else {
            UI.log('Du wurdest besiegt...', '#ff0000');
            this.onCombatEnd(false);
        }
    }
}
