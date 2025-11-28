// Player Klasse: Verwaltet Stats, Position und Bewegung
import { getDistance, pushBack } from './utils.js';
import * as UI from './ui.js';

export class Player {
    constructor() {
        // Stats
        this.level = 1;
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.hpRegen = 1; // pro Sekunde
        this.attackPower = 10;
        this.attackRate = 1; // Angriffe pro Sekunde
        this.attackCooldownMs = 1000 / this.attackRate; // ms
        this.critChance = 0.05;
        this.critMultiplier = 1.5;
        this.gold = 0;
        this.exp = 0;

        // Offensive Zusatzwerte (vorerst 0)
        this.range = 60;
        this.rangeDamageMultiplier = 0;
        this.slowChance = 0;
        this.slowStrength = 0;
        this.hitRate = 0;
        this.doubleStrikeChance = 0;
        this.doubleStrikeDamageMultiplier = 0;
        this.multiStrikeChance = 0;
        this.multiStrikeTargets = 0;
        this.splashChance = 0;
        this.splashDamageMultiplier = 0;
        this.splashTargets = 0;
        this.stunChance = 0;
        this.stunDuration = 0;
        this.knockbackChance = 0;
        this.lethalStrike = 0;
        this.abilityCritChance = 0;
        this.abilityCritMultiplier = 0;
        this.heavyWound = 0;

        // Defensive Zusatzwerte (vorerst 0)
        this.damageResistance = 0;
        this.dodgeChance = 0;
        this.damageReturnMultiplier = 0;
        this.shieldHp = 0;
        this.shieldCooldown = 0;
        this.statusResistance = 0;
        this.lifeSteal = 0;
        this.critResistance = 0;
        this.additionalDamageResistance = 0;
        this.shieldDamageReduction = 0;

        // Position & Größe
        this.width = 40;
        this.height = 40;
        this.x = 400 - this.width / 2; // Mitte
        this.y = 300 - this.height / 2;
        
        // Bewegung
        this.speed = 200; // Pixel pro Sekunde
        this.targetX = this.x;
        this.targetY = this.y;
        this.isMoving = false;
        this.isDashing = false;
        this.dashRange = 100;
        this.dashSpeed = 480;
        this.dashBonusReady = false;

        // Interaktion
        this.interactionTarget = null; // Enemy oder Resource
        this.interactionRange = this.range; // Pixel
        this.attackCooldownTimer = 0;
    }

    updateAttackCooldown() {
        this.attackCooldownMs = 1000 / this.attackRate;
    }

    setTarget(x, y, targetEntity = null) {
        // Zielkoordinaten zentrieren (Mausklick ist Punkt, Player ist Box)
        this.targetX = x - this.width / 2;
        this.targetY = y - this.height / 2;
        this.interactionTarget = targetEntity;
        this.isMoving = true;

        // Dash, falls nah genug am Gegner
        if (targetEntity) {
            const myCx = this.x + this.width / 2;
            const myCy = this.y + this.height / 2;
            const tx = targetEntity.x + targetEntity.width / 2;
            const ty = targetEntity.y + targetEntity.height / 2;
            const dist = getDistance(myCx, myCy, tx, ty);
            if (dist <= this.dashRange) {
                this.isDashing = true;
                this.dashBonusReady = true;
            }
        } else {
            this.isDashing = false;
            this.dashBonusReady = false;
        }
    }

    update(dt) {
        // Cooldown reduzieren
        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= dt;
        }

        // Regeneration
        if (this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
        }

        // Bewegung
        if (this.isMoving) {
            const dist = getDistance(this.x, this.y, this.targetX, this.targetY);
            
            // Wenn wir nah genug am Ziel sind (oder am Interaktionsziel)
            let stopDistance = 2;
            if (this.interactionTarget) {
                stopDistance = this.interactionRange;
            }

            if (dist <= stopDistance) {
                this.isMoving = false;
                this.isDashing = false;
                // Wenn wir ein Target haben, und in Range sind -> Aktion ausführen
                if (this.interactionTarget) {
                    this.interact(this.interactionTarget);
                }
            } else {
                // Bewegen
                const currentSpeed = this.isDashing ? this.dashSpeed : this.speed;
                const moveDist = currentSpeed * dt;
                const ratio = moveDist / dist;
                
                this.x += (this.targetX - this.x) * ratio;
                this.y += (this.targetY - this.y) * ratio;
            }
        } else if (this.interactionTarget && !this.interactionTarget.isDead()) {
            // Wenn wir schon stehen und ein Target haben -> Weiter kämpfen
             const dist = getDistance(this.x, this.y, this.interactionTarget.x, this.interactionTarget.y);
             if (dist <= this.interactionRange) {
                 this.interact(this.interactionTarget);
             }
        }
    }

    interact(target) {
        if (target.constructor.name === 'Enemy') {
            // Kampf
            if (this.attackCooldownTimer <= 0) {
                this.attack(target);
                this.attackCooldownTimer = this.attackCooldownMs / 1000;
            }
        }
    }

    attack(enemy) {
        // Krit berechnen
        let dmg = this.attackPower;
        const roll = Math.random();
        if (roll < this.critChance) {
            dmg *= this.critMultiplier;
        }
        if (this.dashBonusReady) {
            dmg *= 2;
            this.dashBonusReady = false;
        }
        enemy.takeDamage(dmg, this);
        pushBack(enemy, this, 20);
        // console.log(`Player hits ${enemy.name} for ${dmg}`);
    }

    takeDamage(amount, attacker = null) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        if (attacker && !this.isDead()) {
            this.onAttacked(attacker);
        }
    }

    onAttacked(attacker) {
        // Ziel wie bei Klick setzen: zur Gegner-Mitte laufen und kämpfen
        const targetX = attacker.x + attacker.width / 2;
        const targetY = attacker.y + attacker.height / 2;
        this.setTarget(targetX, targetY, attacker);
    }

    heal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
    }

    gainGold(amount) {
        this.gold += amount;
    }

    gainExp(amount) {
        this.exp += amount;
        let needed = this.getNextLevelExp(this.level);
        while (this.exp >= needed) {
            this.exp -= needed;
            this.levelUp();
            needed = this.getNextLevelExp(this.level);
        }
    }

    levelUp() {
        this.level++;
        // Standard-Erhöhungen
        this.maxHp += 25;
        this.attackPower += 3;

        // Meilensteine
        if (this.level === 5) {
            this.maxHp += 20;
            this.attackPower += 3;
            this.critChance = 0.10;
            UI.log('MEILENSTEIN: Level 5 erreicht! Crit erhöht!', '#00ffcc');
        }

        if (this.level === 10) {
            this.attackRate = 1.2;
            this.updateAttackCooldown();
            UI.log('MEILENSTEIN: Level 10 erreicht! Angriffsgeschwindigkeit erhöht!', '#00ffcc');
        }

        // Regeneration alle 5 Level leicht erhöhen
        if (this.level % 5 === 0) {
            this.hpRegen += 1;
            UI.log(`Deine Regeneration steigt auf ${this.hpRegen}/s.`, '#00ffcc');
        }

        // Voll heilen
        this.hp = this.maxHp;
        UI.log(`LEVEL UP! Du bist jetzt Level ${this.level}!`, '#00ffff');
    }

    getNextLevelExp(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    isDead() {
        return this.hp <= 0;
    }

    reset() {
        // Stats behalten! (Progression)
        // this.level = 1;
        // this.maxHp = 100;
        // this.damage = 10;
        // this.gold = 0;
        // this.exp = 0;
        
        // HP vollheilen
        this.hp = this.maxHp;
        
        // States reset
        this.isMoving = false;
        this.interactionTarget = null;
        this.attackCooldownTimer = 0;
        this.isDashing = false;
        this.dashBonusReady = false;
    }
}
