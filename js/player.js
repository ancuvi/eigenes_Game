// Player Klasse: Verwaltet Stats, Position und Bewegung
import { getDistance, pushBack } from './utils.js';
import * as UI from './ui.js';

export class Player {
    constructor() {
        // Stats
        this.level = 1;
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.damage = 10;
        this.gold = 0;
        this.exp = 0;

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
        this.interactionRange = 60; // Pixel
        this.attackCooldown = 0;
        this.attackSpeed = 1.0; // Angriffe pro Sekunde
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
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
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
            if (this.attackCooldown <= 0) {
                this.attack(target);
                this.attackCooldown = 1.0 / this.attackSpeed;
            }
        }
    }

    attack(enemy) {
        // Hier simpler Angriff, UI Logs können später über Events gefeuert werden
        let dmg = this.damage;
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
        if (this.exp >= 100) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.exp = 0;
        this.maxHp += 20;
        this.damage += 2;
        this.hp = this.maxHp;
        UI.log(`LEVEL UP! Du bist jetzt Level ${this.level}!`, '#00ffff');
    }

    isDead() {
        return this.hp <= 0;
    }

    reset() {
        this.level = 1;
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.damage = 10;
        this.gold = 0;
        this.exp = 0;
        this.isMoving = false;
        this.interactionTarget = null;
        this.attackCooldown = 0;
        this.isDashing = false;
        this.dashBonusReady = false;
    }
}
