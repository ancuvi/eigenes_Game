// Player Klasse: Verwaltet Stats, Position und Bewegung
import { getDistance, pushBack } from './utils.js';
import { Projectile } from './projectile.js';
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
        this.vx = 0;
        this.vy = 0;
        
        this.targetX = this.x;
        this.targetY = this.y;
        this.isMoving = false;
        this.moveMode = 'manual'; // 'manual' (Joystick) or 'auto' (Click)

        this.isDashing = false;
        this.dashRange = 100;
        this.dashSpeed = 480;
        this.dashBonusReady = false;

        // Interaktion
        this.interactionTarget = null; // Enemy oder Resource
        this.interactionRange = this.range; // Pixel
        this.attackCooldownTimer = 0;
        this.weapon = 'sword'; // 'sword', 'wand'
    }
    
    switchWeapon(type) {
        if (type === 'sword') {
            this.weapon = 'sword';
            this.range = 60; // Nahkampf
        } else if (type === 'wand') {
            this.weapon = 'wand';
            this.range = 300; // Fernkampf
        }
        this.interactionRange = this.range;
    }

    updateAttackCooldown() {
        this.attackCooldownMs = 1000 / this.attackRate;
    }
    
    setMovement(vx, vy) {
        this.vx = vx;
        this.vy = vy;
        this.isMoving = (vx !== 0 || vy !== 0);
        this.moveMode = 'manual';
    }

    setTarget(x, y, targetEntity = null) {
        this.targetX = x - this.width/2;
        this.targetY = y - this.height/2;
        this.interactionTarget = targetEntity;
        this.isMoving = true;
        this.moveMode = 'auto';
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
            const currentSpeed = this.isDashing ? this.dashSpeed : this.speed;
            
            if (this.moveMode === 'manual') {
                this.x += this.vx * currentSpeed * dt;
                this.y += this.vy * currentSpeed * dt;
            } else {
                // Auto Mode (Click to Move)
                const dist = getDistance(this.x, this.y, this.targetX, this.targetY);
                let stopDistance = 2;
                if (this.interactionTarget) {
                    stopDistance = this.interactionRange;
                }

                if (dist <= stopDistance) {
                    this.isMoving = false;
                } else {
                    const moveDist = currentSpeed * dt;
                    const ratio = moveDist / dist;
                    this.x += (this.targetX - this.x) * ratio;
                    this.y += (this.targetY - this.y) * ratio;
                }
            }
        } else if (this.interactionTarget && !this.interactionTarget.isDead() && this.moveMode === 'auto') {
             // Re-Engage logic in auto mode
             const dist = getDistance(this.x, this.y, this.interactionTarget.x, this.interactionTarget.y);
             if (dist > this.interactionRange) {
                 this.isMoving = true; 
                 this.setTarget(this.interactionTarget.x + this.interactionTarget.width/2, this.interactionTarget.y + this.interactionTarget.height/2, this.interactionTarget);
             }
        }
    }
    
    autoAttack(dt, enemies, map) {
        if (!enemies) return;
        
        // Suche nächsten Gegner
        let nearest = null;
        let minDist = Infinity;
        
        const cx = this.x + this.width/2;
        const cy = this.y + this.height/2;

        // Priorisiere Interaktionsziel
        if (this.interactionTarget && !this.interactionTarget.isDead()) {
            const d = getDistance(cx, cy, this.interactionTarget.x + this.interactionTarget.width/2, this.interactionTarget.y + this.interactionTarget.height/2);
            if (d <= this.interactionRange) {
                nearest = this.interactionTarget;
                minDist = d;
            }
        }

        if (!nearest) {
            enemies.forEach(e => {
                const ex = e.x + e.width/2;
                const ey = e.y + e.height/2;
                const d = getDistance(cx, cy, ex, ey);
                if (d < minDist) {
                    minDist = d;
                    nearest = e;
                }
            });
        }
        
        if (nearest && minDist <= this.interactionRange) {
             if (this.attackCooldownTimer <= 0) {
                this.attack(nearest, map);
                this.attackCooldownTimer = this.attackCooldownMs / 1000;
            }
        }
    }

    interact(target, map) {
        if (target.constructor.name === 'Enemy') {
            // Kampf
            if (this.attackCooldownTimer <= 0) {
                this.attack(target, map);
                this.attackCooldownTimer = this.attackCooldownMs / 1000;
            }
        }
    }

    attack(enemy, map) {
        let dmg = this.attackPower;
        const roll = Math.random();
        if (roll < this.critChance) {
            dmg *= this.critMultiplier;
        }
        if (this.dashBonusReady) {
            dmg *= 2;
            this.dashBonusReady = false;
        }

        if (this.weapon === 'sword') {
            // Nahkampf + Knockback
            enemy.takeDamage(dmg, this);
            if (!enemy.isBoss) { // Boss ist immun gegen Knockback
                pushBack(enemy, this, 50); 
            }
        } else if (this.weapon === 'wand') {
            // Fernkampf Projektil
            if (map) {
                // Target Mitte
                const tx = enemy.x + enemy.width/2;
                const ty = enemy.y + enemy.height/2;
                const p = new Projectile(
                    this.x + this.width/2, 
                    this.y + this.height/2, 
                    tx, ty, 
                    400, // Speed
                    dmg, 
                    'player'
                );
                map.addProjectile(p);
            }
        }
    }

    takeDamage(amount, attacker = null) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        if (attacker && !this.isDead()) {
            this.onAttacked(attacker);
        }
    }

    onAttacked(attacker) {
        // Bei Angriff Fokus wechseln?
        // Wenn wir manuell laufen, ignorieren wir das vielleicht.
        // Aber Target setzen ist okay für Auto-Attack Priority.
        this.interactionTarget = attacker;
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
