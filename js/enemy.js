import { randomNumber, getDistance, pushBack, checkCollision, approach, clampLength } from './utils.js';
import { Projectile } from './projectile.js';
import { 
    ENEMY_SPRITE_SIZE, ENEMY_HITBOX_SIZE, ENEMY_HITBOX_OFFSET,
    MINIBOSS_SPRITE_SIZE, MINIBOSS_HITBOX_SIZE, MINIBOSS_HITBOX_OFFSET,
    BOSS_SPRITE_SIZE, BOSS_HITBOX_SIZE, BOSS_HITBOX_OFFSET,
    PLAYER_SIZE 
} from './constants.js';
import { CONSTANTS, BalanceManager } from './balanceManager.js';

// Base Enemy Class
export class Enemy {
    constructor(stats, x, y, rank = 'normal') {
        this.x = x;
        this.y = y;
        
        // Default to Normal Enemy size
        this.width = ENEMY_SPRITE_SIZE;
        this.height = ENEMY_SPRITE_SIZE;
        this.hitboxWidth = ENEMY_HITBOX_SIZE;
        this.hitboxHeight = ENEMY_HITBOX_SIZE;
        this.hitboxOffset = ENEMY_HITBOX_OFFSET;

        this.rank = rank;
        this.level = 1; // Used for display
        this.name = "Enemy";
        this.color = '#e53935'; // Default Red

        // Stats
        this.maxHp = stats.hp;
        this.hp = this.maxHp;
        this.damage = stats.damage;
        this.expReward = 10;
        this.goldReward = 0;

        // Physics
        this.vel = { x: 0, y: 0 };
        this.maxSpeed = 240;   // Target Max Speed
        this.accel = 1600;     // Acceleration
        this.drag = 6;        // Exponential Drag
        this.knockbackTimer = 0;
        this.ignoresWalls = false;

        // State Machine
        this.state = 'IDLE';
        this.stateTimer = 0;
        this.target = null;
        this.aggroRange = 800;
        
        // Attack
        this.attackCooldown = 0;
        this.attackRange = 160;
        this.telegraphTimer = 0;
    }

    update(dt, player, map) {
        if (this.isDead()) return;

        // 1. Cooldowns & Timers
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.telegraphTimer > 0) this.telegraphTimer -= dt;
        if (this.knockbackTimer > 0) this.knockbackTimer -= dt;

        // 2. State Machine Logic
        this.updateState(dt, player, map);

        // 3. Physics (Velocity & Friction)
        this.updatePhysics(dt, map);
        
        // 4. Combat (Contact Damage)
        // Check collision with player for simple contact damage
        if (checkCollision(this, player)) {
            this.onPlayerContact(player, map);
        }
    }
    
    updateState(dt, player, map) {
        // Override in subclasses
        const dist = getDistance(this.x, this.y, player.x, player.y);
        if (dist < this.aggroRange) {
            this.moveTowards(player.x, player.y, dt);
        }
    }

    updatePhysics(dt, map) {
        // Exponential Drag
        const dragFactor = Math.exp(-this.drag * dt);
        this.vel.x *= dragFactor;
        this.vel.y *= dragFactor;

        // Zero-cutoff
        if (Math.abs(this.vel.x) < 0.5) this.vel.x = 0;
        if (Math.abs(this.vel.y) < 0.5) this.vel.y = 0;

        // Apply Position
        this.x += this.vel.x * dt;
        this.y += this.vel.y * dt;
    }

    moveTowards(tx, ty, dt) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 1) {
            const dirX = dx / dist;
            const dirY = dy / dist;
            
            // Desired Velocity
            const targetVx = dirX * this.maxSpeed;
            const targetVy = dirY * this.maxSpeed;
            
            // Approach Target Velocity
            this.vel.x = approach(this.vel.x, targetVx, this.accel * dt);
            this.vel.y = approach(this.vel.y, targetVy, this.accel * dt);
            
            // Clamp Length
            const clamped = clampLength(this.vel.x, this.vel.y, this.maxSpeed);
            this.vel.x = clamped.x;
            this.vel.y = clamped.y;
        }
    }

    onPlayerContact(player, map) {
        if (this.attackCooldown <= 0) {
            player.takeDamage(this.damage, this);
            pushBack(player, this, 80, map ? map.currentRoom : null);
            this.attackCooldown = 1.0;
        }
    }

    takeDamage(amount, attacker = null, map = null) {
        // Defense check?
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        
        // Aggro
        if (attacker && !this.isDead()) {
            this.target = attacker;
            if (this.state === 'IDLE' || this.state === 'WANDER') {
                this.state = 'CHASE';
            }
        }
    }

    isDead() {
        return this.hp <= 0;
    }

    getHitbox() {
        return {
            x: this.x + this.hitboxOffset,
            y: this.y + this.hitboxOffset,
            width: this.hitboxWidth,
            height: this.hitboxHeight
        };
    }
}

// ---------------- SUBCLASSES ----------------

// Type 1: Glibber (Torkler)
export class Glibber extends Enemy {
    constructor(stats, x, y, rank) {
        super(stats, x, y, rank);
        this.name = "Glibber";
        this.color = '#00bcd4'; // Cyan
        this.hp = Math.floor(stats.hp * 0.8);
        
        // Glibber: Slippery (Low drag, Low accel)
        this.maxSpeed = 200;
        this.accel = 400;
        this.drag = 1.0; 
        
        this.state = 'WANDER';
        this.wanderTimer = 0;
        this.wanderDir = { x: 0, y: 0 };
    }

    updateState(dt, player, map) {
        const dist = getDistance(this.x, this.y, player.x, player.y);

        if (this.state === 'WANDER') {
            this.wanderTimer -= dt;
            if (this.wanderTimer <= 0) {
                // Pick new direction
                const angle = Math.random() * Math.PI * 2;
                this.wanderDir.x = Math.cos(angle);
                this.wanderDir.y = Math.sin(angle);
                this.wanderTimer = randomNumber(1, 3);
            }
            
            // Apply drift force via moveTowards logic (manual approach)
            const targetVx = this.wanderDir.x * this.maxSpeed;
            const targetVy = this.wanderDir.y * this.maxSpeed;
            
            this.vel.x = approach(this.vel.x, targetVx, this.accel * dt);
            this.vel.y = approach(this.vel.y, targetVy, this.accel * dt);

            // Check aggro
            if (dist < 600) {
                this.state = 'CHASE';
            }
        } else if (this.state === 'CHASE') {
            // Slide towards player slowly
            this.moveTowards(player.x, player.y, dt);
            
            if (dist > 1000) {
                this.state = 'WANDER';
            }
        }
    }
}

// Type 2: Spucker (Turret)
export class Spucker extends Enemy {
    constructor(stats, x, y, rank) {
        super(stats, x, y, rank);
        this.name = "Spucker";
        this.color = '#4caf50'; // Green
        
        // Stationary
        this.maxSpeed = 0;
        this.accel = 0;
        this.drag = 10; // Stops instantly
        
        this.state = 'IDLE';
        this.stateTimer = randomNumber(1, 2);
    }

    updateState(dt, player, map) {
        if (this.state === 'IDLE') {
            this.stateTimer -= dt;
            const dist = getDistance(this.x, this.y, player.x, player.y);
            
            if (this.stateTimer <= 0 && dist < 1200) {
                this.state = 'CHARGE';
                this.stateTimer = 1.0; // 1s Telegraph
                this.telegraphTimer = 1.0; // Visual indicator
            }
        } else if (this.state === 'CHARGE') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.shoot(player, map);
                this.state = 'IDLE';
                this.stateTimer = 2.0; // Cooldown
            }
        }
    }

    shoot(player, map) {
        const p = new Projectile(
            this.x + this.width/2, 
            this.y + this.height/2, 
            player.x + player.width/2, 
            player.y + player.height/2, 
            1000, // Speed
            this.damage, 
            'enemy'
        );
        map.addProjectile(p);
    }
}

// Type 3: Bull (Sprinter)
export class Bull extends Enemy {
    constructor(stats, x, y, rank) {
        super(stats, x, y, rank);
        this.name = "Bull";
        this.color = '#795548'; // Brown
        this.hp = Math.floor(stats.hp * 1.5);
        
        // Normal movement
        this.maxSpeed = 240;
        this.accel = 1600;
        this.drag = 4;
        
        this.state = 'WANDER';
        this.stateTimer = randomNumber(1, 3);
        this.chargeDir = { x: 0, y: 0 };
    }

    updateState(dt, player, map) {
        if (this.state === 'STUNNED') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) this.state = 'WANDER';
            return;
        }

        if (this.state === 'WANDER') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                // Random wander impulse
                const angle = Math.random() * Math.PI * 2;
                this.vel.x += Math.cos(angle) * 400; // Small burst
                this.vel.y += Math.sin(angle) * 400;
                this.stateTimer = randomNumber(1, 2);
            }

            // Raycast Check (Axis Aligned)
            const dx = Math.abs((this.x + this.width/2) - (player.x + player.width/2));
            const dy = Math.abs((this.y + this.height/2) - (player.y + player.height/2));
            const alignTolerance = 96; // Width of ray

            if ((dx < alignTolerance || dy < alignTolerance) && getDistance(this.x,this.y,player.x,player.y) < 1200) {
                this.state = 'PRE_DASH';
                this.stateTimer = 0.5; // Telegraph
                this.telegraphTimer = 0.5;
            }

        } else if (this.state === 'PRE_DASH') {
            this.vel.x *= 0.1; // Stop moving
            this.vel.y *= 0.1;
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'DASH';
                // Calculate Charge Direction towards Player ONCE
                const pdx = (player.x + player.width/2) - (this.x + this.width/2);
                const pdy = (player.y + player.height/2) - (this.y + this.height/2);
                const len = Math.max(1, Math.sqrt(pdx*pdx + pdy*pdy));
                this.chargeDir = { x: pdx/len, y: pdy/len };
                this.stateTimer = 2.0; // Max dash time
            }
        } else if (this.state === 'DASH') {
            // Dash logic handled in updatePhysics override
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'WANDER'; // Timeout
            }
        }
    }
    
    updatePhysics(dt, map) {
        if (this.state === 'DASH') {
            const dashSpeed = 1800;
            this.vel.x = this.chargeDir.x * dashSpeed;
            this.vel.y = this.chargeDir.y * dashSpeed;

            // Lookahead for BONK
            const nextX = this.x + this.vel.x * dt;
            const nextY = this.y + this.vel.y * dt;
            
            // Build simple AABB for next pos
            const nextBounds = {
                x: nextX, 
                y: nextY, 
                width: this.width, 
                height: this.height 
            };

            if (map && map.rectCollidesWithSolids(nextBounds)) {
                // BONK
                this.state = 'STUNNED';
                this.stateTimer = 2.0;
                this.vel.x = -this.vel.x * 0.3; // Slight bounce
                this.vel.y = -this.vel.y * 0.3;
                return; // Stop updatePhysics for this frame (avoid moving into wall)
            }
        }
        
        super.updatePhysics(dt, map);
    }
}

// Type 4: Surrer (Die Fliege)
export class Surrer extends Enemy {
    constructor(stats, x, y, rank) {
        super(stats, x, y, rank);
        this.name = "Surrer";
        this.color = '#ff9800'; // Orange
        this.hp = Math.floor(stats.hp * 0.4);
        this.ignoresWalls = true;
        
        this.maxSpeed = 320;
        this.accel = 800;
        this.drag = 2;
        
        this.time = Math.random() * 100;
    }

    updateState(dt, player, map) {
        this.time += dt;
        
        // Fly towards player but with sine wave offset
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Base direction
        const dirX = dx / dist;
        const dirY = dy / dist;
        
        // Perpendicular (Sine)
        const perpX = -dirY;
        const perpY = dirX;
        
        const sine = Math.sin(this.time * 5) * 200; // Amplitude
        
        // Target velocity construction (manual to override base moveTowards)
        const moveSpeed = this.maxSpeed;
        
        const targetVx = (dirX * moveSpeed * 0.8 + perpX * sine);
        const targetVy = (dirY * moveSpeed * 0.8 + perpY * sine);
        
        this.vel.x = approach(this.vel.x, targetVx, this.accel * dt);
        this.vel.y = approach(this.vel.y, targetVy, this.accel * dt);
    }
}

// Type 5: Skelett (Smart Range)
export class Skelett extends Enemy {
    constructor(stats, x, y, rank) {
        super(stats, x, y, rank);
        this.name = "Skelett";
        this.color = '#9e9e9e'; // Grey
        
        this.maxSpeed = 200;
        this.accel = 1200;
        this.drag = 5;
        
        this.state = 'MAINTAIN_DIST';
        this.attackTimer = 2.0;
    }

    updateState(dt, player, map) {
        const dist = getDistance(this.x, this.y, player.x, player.y);
        const preferredDist = 800;
        
        // Movement
        if (dist < preferredDist - 200) {
            // Flee
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            this.moveTowards(this.x + dx, this.y + dy, dt);
        } else if (dist > preferredDist + 200) {
            // Chase
            this.moveTowards(player.x, player.y, dt);
        } else {
            // Strafe / Stand
            // Drag handles stopping if no moveTowards called
        }

        // Attack
        this.attackTimer -= dt;
        if (this.attackTimer <= 0 && dist < 1600) {
            this.predictiveShoot(player, map);
            this.attackTimer = 2.5;
        }
    }

    predictiveShoot(player, map) {
        // Fix: Use player.vx/vy
        const leadTime = 0.5; // 0.5s prediction
        const pVx = player.vx || 0; 
        const pVy = player.vy || 0;
        
        const tx = player.x + pVx * leadTime;
        const ty = player.y + pVy * leadTime;
        
        const p = new Projectile(
            this.x + this.width/2, 
            this.y + this.height/2, 
            tx + player.width/2, 
            ty + player.height/2, 
            1000, 
            this.damage, 
            'enemy'
        );
        map.addProjectile(p);
    }
}

// ---------------- BOSSES ----------------

// Miniboss: Nest-Block
export class NestBlock extends Enemy {
    constructor(stats, x, y, rank) {
        super(stats, x, y, 'miniboss');
        this.name = "Nest-Block";
        this.width = MINIBOSS_SPRITE_SIZE;
        this.height = MINIBOSS_SPRITE_SIZE;
        this.hitboxWidth = MINIBOSS_HITBOX_SIZE;
        this.hitboxHeight = MINIBOSS_HITBOX_SIZE;
        this.hitboxOffset = MINIBOSS_HITBOX_OFFSET;
        
        this.color = '#8d6e63'; // Wood/Nest color
        
        this.maxSpeed = 80;
        this.accel = 200;
        this.drag = 5;
        
        this.spawnTimer = 3.0;
        this.children = [];
    }

    updateState(dt, player, map) {
        // Clean up dead children
        this.children = this.children.filter(c => !c.isDead());
        
        // Invulnerability
        if (this.children.length > 0) {
            this.defense = 999; // High defense
            this.color = '#3e2723'; // Darker (Shielded)
        } else {
            this.defense = 0;
            this.color = '#8d6e63';
            
            // Attack when alone
            this.attackCooldown -= dt;
            if (this.attackCooldown <= 0) {
                this.spreadShot(player, map);
                this.attackCooldown = 2.0;
            }
        }
        
        // Spawn Logic
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.children.length < 5) {
            this.spawnChild(map);
            this.spawnTimer = 4.0;
        }
    }
    
    spawnChild(map) {
        // Spawn Surrer
        const stats = { hp: CONSTANTS.BASE_ENEMY_HP * 0.4, damage: CONSTANTS.BASE_ENEMY_DMG }; // Weak stats
        const child = new Surrer(stats, this.x, this.y, 'normal');
        map.currentRoom.enemies.push(child);
        this.children.push(child);
    }
    
    spreadShot(player, map) {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const tx = this.x + Math.cos(angle) * 400;
            const ty = this.y + Math.sin(angle) * 400;
            const p = new Projectile(
                this.x + this.width/2, this.y + this.height/2,
                tx, ty,
                800, this.damage, 'enemy'
            );
            map.addProjectile(p);
        }
    }
}

// Main Boss: Ironhead
export class Ironhead extends Enemy {
    constructor(stats, x, y, rank) {
        super(stats, x, y, 'boss');
        this.name = "Ironhead";
        this.width = BOSS_SPRITE_SIZE;
        this.height = BOSS_SPRITE_SIZE;
        this.hitboxWidth = BOSS_HITBOX_SIZE;
        this.hitboxHeight = BOSS_HITBOX_SIZE;
        this.hitboxOffset = BOSS_HITBOX_OFFSET;

        this.color = '#607d8b'; // Blue Grey
        
        this.maxSpeed = 160;
        this.accel = 800;
        this.drag = 4;
        
        this.phase = 1;
        this.actionTimer = 2.0;
        this.jumpTarget = { x: 0, y: 0 };
    }

    updateState(dt, player, map) {
        this.actionTimer -= dt;
        
        if (this.phase === 1) {
            if (this.hp < this.maxHp * 0.5) {
                this.phase = 2;
                this.actionTimer = 1.0;
                this.color = '#d32f2f'; // Enraged Red
                return;
            }
            
            if (this.actionTimer <= 0) {
                if (this.state === 'IDLE') {
                    // Prepare Jump
                    this.state = 'JUMP_PREP';
                    this.telegraphTimer = 0.5;
                    this.actionTimer = 0.5;
                    this.jumpTarget = { x: player.x, y: player.y };
                } else if (this.state === 'JUMP_PREP') {
                    // Jump!
                    this.state = 'AIR';
                    this.ignoresWalls = true; // Fly over walls
                    this.actionTimer = 1.0; // Air time
                    this.vel.x = (this.jumpTarget.x - this.x); 
                    this.vel.y = (this.jumpTarget.y - this.y); 
                } else if (this.state === 'AIR') {
                    // Land
                    this.state = 'LAND';
                    this.ignoresWalls = false;
                    this.vel.x = 0;
                    this.vel.y = 0;
                    this.slamAttack(map);
                    this.actionTimer = 0.5; // Recovery
                } else if (this.state === 'LAND') {
                    this.state = 'IDLE';
                    this.actionTimer = 2.0;
                }
            }
        } else {
            // Phase 2: Bullet Hell Center
            if (this.state !== 'CENTERING') {
                // Move to center
                const cx = map.currentRoom.width / 2 - this.width/2;
                const cy = map.currentRoom.height / 2 - this.height/2;
                const dist = getDistance(this.x, this.y, cx, cy);
                if (dist > 20) {
                    this.moveTowards(cx, cy, dt);
                } else {
                    this.state = 'CENTERING';
                    this.spiralAngle = 0;
                }
            } else {
                // Spiral Shoot
                if (this.actionTimer <= 0) {
                    this.spiralShoot(map);
                    this.actionTimer = 0.1; // Rapid fire
                }
            }
        }
    }
    
    slamAttack(map) {
        // Shockwave
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const tx = this.x + Math.cos(angle) * 400;
            const ty = this.y + Math.sin(angle) * 400;
            const p = new Projectile(
                this.x + this.width/2, this.y + this.height/2,
                tx, ty,
                1000, this.damage, 'enemy'
            );
            map.addProjectile(p);
        }
    }
    
    spiralShoot(map) {
        this.spiralAngle += 0.2;
        const angle = this.spiralAngle;
        const tx = this.x + Math.cos(angle) * 400;
        const ty = this.y + Math.sin(angle) * 400;
        
        // Twin spiral
        const angle2 = this.spiralAngle + Math.PI;
        const tx2 = this.x + Math.cos(angle2) * 400;
        const ty2 = this.y + Math.sin(angle2) * 400;

        const p1 = new Projectile(this.x + this.width/2, this.y + this.height/2, tx, ty, 800, this.damage, 'enemy');
        const p2 = new Projectile(this.x + this.width/2, this.y + this.height/2, tx2, ty2, 800, this.damage, 'enemy');
        
        map.addProjectile(p1);
        map.addProjectile(p2);
    }
}

// Factory Function
export function createEnemy(type, x, y, stage, floor, rank = 'normal') {
    // 1. Determine Rank/Boss status based on Type if not explicitly provided
    if (type === 'Ironhead') rank = 'boss';
    if (type === 'NestBlock') rank = 'miniboss';

    const isBoss = (rank === 'boss');
    const isMiniboss = (rank === 'miniboss');

    // 2. Calculate Stats
    const stats = BalanceManager.getEnemyStats(stage, floor, isMiniboss, isBoss);

    // 3. Instantiate specific class
    switch (type) {
        case 'Glibber': return new Glibber(stats, x, y, rank);
        case 'Spucker': return new Spucker(stats, x, y, rank);
        case 'Bull':    return new Bull(stats, x, y, rank);
        case 'Surrer':  return new Surrer(stats, x, y, rank);
        case 'Skelett': return new Skelett(stats, x, y, rank);
        case 'NestBlock': return new NestBlock(stats, x, y, rank);
        case 'Ironhead': return new Ironhead(stats, x, y, rank);
        default: return new Enemy(stats, x, y, rank); // Fallback
    }
}
