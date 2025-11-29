// Enemy Klasse: Gegner mit Position und Stats
import { randomNumber, getDistance, pushBack } from './utils.js';
import { Projectile } from './projectile.js';

export class Enemy {
    constructor(playerLevel, x, y, isBoss = false) {
        this.isBoss = isBoss;
        this.type = 'melee'; // 'melee' | 'ranged'

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

    update(dt, player, map) {
        if (this.isDead()) return;

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
                this.updateMelee(dt, player, distToPlayer);
            }
        }
    }

    updateMelee(dt, player, dist) {
        if (dist <= this.attackRange) {
            if (this.attackCooldown <= 0) {
                this.performMeleeAttack(player);
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
        const moveDist = this.speed * dt;
        const dirX = tx - this.x;
        const dirY = ty - this.y;
        const len = Math.max(1, Math.sqrt(dirX * dirX + dirY * dirY));
        this.x += (dirX / len) * moveDist;
        this.y += (dirY / len) * moveDist;
    }

    performMeleeAttack(player) {
        player.takeDamage(this.damage, this);
        pushBack(player, this, 20);
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
