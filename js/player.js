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
        this.vx = 0;
        this.vy = 0;
        
        // Veraltet durch Joystick, aber für Compat:
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
    
    setMovement(vx, vy) {
        this.vx = vx;
        this.vy = vy;
        this.isMoving = (vx !== 0 || vy !== 0);
        // Dash logik? Vorerst einfach laufen.
    }

    // Für Kompatibilität mit altem Code (OnAttacked, etc)
    setTarget(x, y, targetEntity = null) {
        // Ignorieren wir für Movement, aber Target setzen wir
        this.interactionTarget = targetEntity;
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

        // Bewegung (Velocity Based)
        if (this.isMoving) {
            const currentSpeed = this.isDashing ? this.dashSpeed : this.speed;
            this.x += this.vx * currentSpeed * dt;
            this.y += this.vy * currentSpeed * dt;
            
            // Bounds Check? Canvas Grenzen
            // Wird eigentlich im Map-Code handled? Nein, aktuell darf Player rauslaufen (für Room Switch).
            // Room Switch passiert in Map.loadRoom, aber Trigger ist in Map.switchRoom (Input).
            // Wenn wir manuell laufen, müssen wir manuell Room Switch triggern oder Bounds checken.
            // Aber Map.switchRoom wird vom Input aufgerufen.
            // Also alles gut.
        }

        // Auto-Attack Logic
        // Wenn wir manuell laufen, greifen wir an, wenn ein Gegner nah ist.
        // Wir scannen nach Gegnern, wenn kein Interaktionsziel da ist oder das alte tot ist.
        
        // Wenn wir uns bewegen, brechen wir fokussierte Interaktion ab, es sei denn wir wollen "Kiting".
        // Auto-Battler Logic: Attack nearest enemy in range.
        
        // Wir brauchen Zugriff auf die Map (Gegner Liste).
        // update(dt) wird von main.js aufgerufen, wir haben hier keine Map-Referenz direkt, außer wir übergeben sie oder Player hat sie.
        // Player hat sie nicht.
        // Wir machen Auto-Attack im main.js oder übergeben map an update.
    }
    
    // Neue Methode für Auto-Attack, aufzurufen von main.js
    autoAttack(dt, enemies) {
        if (!enemies) return;
        
        // Suche nächsten Gegner
        let nearest = null;
        let minDist = Infinity;
        
        const cx = this.x + this.width/2;
        const cy = this.y + this.height/2;

        enemies.forEach(e => {
            const ex = e.x + e.width/2;
            const ey = e.y + e.height/2;
            const d = getDistance(cx, cy, ex, ey);
            if (d < minDist) {
                minDist = d;
                nearest = e;
            }
        });
        
        if (nearest && minDist <= this.interactionRange) {
             if (this.attackCooldownTimer <= 0) {
                this.attack(nearest);
                this.attackCooldownTimer = this.attackCooldownMs / 1000;
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
