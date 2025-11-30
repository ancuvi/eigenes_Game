// Enemy Klasse: Gegner mit Position und Stats
import { randomNumber, getDistance, pushBack } from './utils.js';
import { Projectile } from './projectile.js';
import { ENEMY_SIZE, BOSS_SIZE } from './constants.js';

export class Enemy {
    constructor(stats, x, y, isBoss = false) {
        this.isBoss = isBoss;
        this.type = 'melee'; // 'melee' | 'ranged'
        
        // Stats übernehmen
        this.maxHp = stats.hp;
        this.hp = this.maxHp;
        this.damage = stats.damage;
        this.level = 1; // Placeholder für Name Gen
        
        // Name & Flavor
        if (isBoss) {
            this.name = 'Eisen-Golem (Boss)';
            this.width = BOSS_SIZE;
            this.height = BOSS_SIZE;
            this.expReward = 200;
            this.goldReward = 0; // Loot wird separat gewürfelt (RollLoot im Map)
            this.attackSpeed = 0.5;
        } else {
            this.name = this.generateName(randomNumber(1, 5));
            this.width = ENEMY_SIZE;
            this.height = ENEMY_SIZE;
            this.expReward = 10 + randomNumber(1, 10);
            this.goldReward = 0; // Loot via Map
            this.attackSpeed = 0.6;
        }
        this.defense = 0;

        // Position & Größe
        this.x = x;
        this.y = y;
        // Width/Height already set above

        // Kampf
        this.attackCooldown = 0;
        this.attackRange = 60;
        this.speed = 80;
        this.aggroRange = 200; // Bereich in dem der Gegner den Spieler bemerkt
        this.leashRange = 450; // Abbruchdistanz, falls Spieler sehr weit weg läuft
        this.isAggro = false;
        this.target = null;
        this.telegraphTimer = 0;
        this.attackWindup = 0.5;
        
        this.statusEffects = {
            stun: { timer: 0 },
            slow: { timer: 0, strength: 0 }
        };
    }

    update(dt, player, map) {
        if (this.isDead()) return;

        // Process Status Effects
        if (this.statusEffects.stun.timer > 0) {
            this.statusEffects.stun.timer -= dt;
            return; // Stunned: No movement, no attack
        }
        if (this.statusEffects.slow.timer > 0) {
            this.statusEffects.slow.timer -= dt;
        } else {
            this.statusEffects.slow.strength = 0;
        }

        // Cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        const distToPlayer = getDistance(this.x, this.y, player.x, player.y);
        
        // Aggro Logic
        if (distToPlayer <= this.aggroRange) {
            this.isAggro = true;
            this.target = player;
        }
        if (this.isAggro && distToPlayer > this.leashRange) {
            this.isAggro = false;
            this.target = null;
        }

        if (this.isAggro && !player.isDead()) {
            if (this.type === 'ranged') {
                this.updateRanged(dt, player, distToPlayer, map);
            } else {
                this.updateMelee(dt, player, distToPlayer, map);
            }
        }
    }

    updateMelee(dt, player, dist, map) {
        if (dist <= this.attackRange) {
            if (this.attackCooldown <= 0) {
                this.performMeleeAttack(player, map);
            }
        } else {
            // Chase
            this.moveTowards(player.x, player.y, dt);
        }
    }

    updateRanged(dt, player, dist, map) {
        const kiteDist = 150;
        const shootDist = 350;

        if (dist < kiteDist) {
            // Weglaufen
            // Vektor vom Spieler weg: this - player
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            // Zielpunkt berechnen
            this.moveTowards(this.x + dx, this.y + dy, dt);
        } else if (dist < shootDist) {
            // Stehen bleiben und schießen
            if (this.attackCooldown <= 0 && map) {
                this.performRangedAttack(player, map);
            }
        } else {
            // Annähern
            this.moveTowards(player.x, player.y, dt);
        }
    }

    moveTowards(tx, ty, dt) {
        let speed = this.speed;
        if (this.statusEffects.slow.timer > 0) {
            speed *= (1 - this.statusEffects.slow.strength);
        }
        
        const moveDist = speed * dt;
        const dirX = tx - this.x;
        const dirY = ty - this.y;
        const len = Math.max(1, Math.sqrt(dirX * dirX + dirY * dirY));
        this.x += (dirX / len) * moveDist;
        this.y += (dirY / len) * moveDist;
    }

    applyStatus(type, duration, strength = 0) {
        if (type === 'stun') {
            this.statusEffects.stun.timer = Math.max(this.statusEffects.stun.timer, duration);
        } else if (type === 'slow') {
            this.statusEffects.slow.timer = Math.max(this.statusEffects.slow.timer, duration);
            this.statusEffects.slow.strength = Math.max(this.statusEffects.slow.strength, strength);
        }
    }

    performMeleeAttack(player, map) {
        player.takeDamage(this.damage, this);
        pushBack(player, this, 20, map ? map.currentRoom : null);
        this.attackCooldown = 1.0 / this.attackSpeed;
    }

    performRangedAttack(player, map) {
        const p = new Projectile(
            this.x + this.width/2, 
            this.y + this.height/2, 
            player.x + player.width/2, 
            player.y + player.height/2, 
            300, // Speed
            this.damage, 
            'enemy'
        );
        map.addProjectile(p);
        this.attackCooldown = 1.5 / this.attackSpeed; // Etwas langsamer schießen
    }

    takeDamage(amount, attacker = null, map = null) {
        const effective = Math.max(0, amount - (this.defense || 0));
        this.hp -= effective;
        if (this.hp < 0) this.hp = 0;
        
        // On Hit Effects from Attacker
        if (attacker && attacker.constructor.name === 'Player') {
            // Knockback
            if (attacker.knockbackChance > 0 && Math.random() < attacker.knockbackChance) {
                pushBack(this, attacker, 50, map ? map.currentRoom : null);
            }
            // Stun
            if (attacker.stunChance > 0 && Math.random() < attacker.stunChance) {
                const duration = attacker.stunDuration || 1.0;
                this.applyStatus('stun', duration);
            }
            // Slow
            if (attacker.slowChance > 0 && Math.random() < attacker.slowChance) {
                const duration = 2.0; // Fixed duration for now
                const strength = attacker.slowStrength || 0.2;
                this.applyStatus('slow', duration, strength);
            }
        }
        
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
