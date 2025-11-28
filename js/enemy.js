// Enemy Klasse: Gegner mit Position und Stats
import { randomNumber, getDistance, pushBack } from './utils.js';

export class Enemy {
    /**
     * Erstellt einen Gegner basierend auf dem Spieler-Level
     * @param {number} playerLevel 
     * @param {number} x Position X
     * @param {number} y Position Y
     * @param {boolean} isBoss Boss-Flag
     */
    constructor(playerLevel, x, y, isBoss = false) {
        // Basis-Werte
        const scaleFactor = 1.2;
        const isStarterSlime = !isBoss && playerLevel <= 1;

        if (isBoss) {
            this.level = 5;
            this.maxHp = 400;
            this.hp = this.maxHp;
            this.damage = 25;
            this.attackSpeed = 0.5; // alle ~2s
            this.goldReward = 500;
            this.expReward = 200;
            this.name = 'Eisen-Golem (Boss)';
            this.defense = 4;
        } else if (isStarterSlime) {
            // Vorgaben für kleinen Schleim
            this.level = 1;
            this.maxHp = 30;
            this.hp = this.maxHp;
            this.damage = 8;
            this.attackSpeed = 0.8; // ~1.25s pro Angriff
            this.goldReward = 15;
            this.expReward = 10;
            this.name = 'Kleiner Schleim';
            this.defense = 0;
        } else {
            this.level = playerLevel;
            this.maxHp = Math.floor(50 * Math.pow(scaleFactor, playerLevel - 1)) + randomNumber(0, 10 * playerLevel);
            this.hp = this.maxHp;
            this.damage = Math.floor(5 * Math.pow(scaleFactor, playerLevel - 1)) + randomNumber(0, 2 * playerLevel);
            this.goldReward = Math.floor(10 * Math.pow(1.1, playerLevel - 1));
            this.expReward = 20 + playerLevel * 5;
            this.name = this.generateName(playerLevel);
            this.attackSpeed = 0.5; // Default langsam
            this.defense = 0;
        }

        // Position & Größe
        this.x = x;
        this.y = y;
        if (isBoss) {
            this.width = 70;
            this.height = 70;
        } else {
            this.width = 40;
            this.height = 40;
        }

        // Kampf
        this.attackCooldown = 0;
        this.attackRange = 60;
        this.speed = 140;
        this.aggroRange = 200; // Bereich in dem der Gegner den Spieler bemerkt
        this.leashRange = 450; // Abbruchdistanz, falls Spieler sehr weit weg läuft
        this.isAggro = false;
        this.target = null;
        this.telegraphTimer = 0;
        this.attackWindup = 0.5;
    }

    update(dt, player) {
        if (this.isDead()) return;

        // Cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        // Aggro, falls Spieler in Reichweite oder bereits Ziel
        const distToPlayer = getDistance(this.x, this.y, player.x, player.y);
        if (distToPlayer <= this.aggroRange) {
            this.isAggro = true;
            this.target = player;
        }

        const target = this.target || player;
        const distToTarget = getDistance(this.x, this.y, target.x, target.y);

        // Leash: wenn zu weit weg, Aggro verlieren
        if (this.isAggro && distToTarget > this.leashRange) {
            this.isAggro = false;
            this.target = null;
            this.telegraphTimer = 0;
        }

        // Bewegung Richtung Ziel oder Angriff, wenn aggro
        if (this.isAggro && !target.isDead()) {
            if (distToTarget <= this.attackRange) {
                // Telegraph und dann schlagen
                if (this.telegraphTimer > 0) {
                    this.telegraphTimer -= dt;
                    if (this.telegraphTimer <= 0) {
                        // Wenn noch in Reichweite schlagen
                        if (getDistance(this.x, this.y, target.x, target.y) <= this.attackRange) {
                            this.performAttack(target);
                        } else {
                            // Ziel entkommen
                            this.attackCooldown = 0.2;
                        }
                    }
                } else if (this.attackCooldown <= 0) {
                    this.telegraphTimer = this.attackWindup;
                }
            } else {
                const moveDist = this.speed * dt;
                const dirX = target.x - this.x;
                const dirY = target.y - this.y;
                const len = Math.max(1, Math.sqrt(dirX * dirX + dirY * dirY));
                this.x += (dirX / len) * moveDist;
                this.y += (dirY / len) * moveDist;
            }
        }
    }

    performAttack(player) {
        player.takeDamage(this.damage, this);
        pushBack(player, this, 20);
        this.attackCooldown = 1.0 / this.attackSpeed;
        this.telegraphTimer = 0;
    }

    takeDamage(amount, attacker = null) {
        const effective = Math.max(0, amount - (this.defense || 0));
        this.hp -= effective;
        if (this.hp < 0) this.hp = 0;
        // Aggro setzen, wenn angegriffen
        if (attacker && !this.isDead()) {
            this.isAggro = true;
            this.target = attacker;
        }
    }

    isDead() {
        return this.hp <= 0;
    }

    generateName(level) {
        const types = ['Schleim', 'Ratte', 'Goblin', 'Wolf', 'Skelett', 'Ork', 'Drache'];
        const prefixes = ['Schwacher', 'Normaler', 'Starker', 'Wütender', 'Elite', 'Boss'];
        const typeIndex = Math.min(Math.floor(level / 5), types.length - 1);
        const prefixIndex = randomNumber(0, Math.min(Math.floor(level / 3), prefixes.length - 1));
        return `${prefixes[prefixIndex]} ${types[typeIndex]}`;
    }
}
