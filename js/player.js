// Player Klasse: Verwaltet Stats, Position und Bewegung
import { getDistance, pushBack, checkCollision } from './utils.js';
import { Projectile } from './projectile.js';
import * as UI from './ui.js';
import { ITEM_DEFINITIONS, ITEM_SETS } from './items/itemData.js';
import { SaveManager } from './saveManager.js';
import { 
    PLAYER_SIZE, PLAYER_HITBOX_SIZE, PLAYER_HITBOX_OFFSET,
    PLAYER_MAX_SPEED, PLAYER_ACCEL, PLAYER_FRICTION, PLAYER_STOP_EPS 
} from './constants.js';

export const UPGRADE_CONFIG = {
    attack: { baseCost: 50, costMult: 1.5, perLevel: 1, name: "Attack Damage" },
    hp: { baseCost: 50, costMult: 1.5, perLevel: 5, name: "Max HP" },
    attackSpeed: { baseCost: 100, costMult: 1.6, perLevel: 0.01, name: "Attack Speed" }, // +1%
    regen: { baseCost: 100, costMult: 1.6, perLevel: 0.2, name: "HP Regen" }
};

export class Player {
    constructor() {
        // Load persistent data
        const savedData = SaveManager.load();
        this.gold = savedData.gold || 0;
        this.upgrades = savedData.upgrades || { attack: 0, hp: 0, attackSpeed: 0, regen: 0 };
        
        // Equipment
        this.equipment = {
            weapon: null,
            armor: null,
            helmet: null,
            accessory: null
        };
        
        // Stats
        this.level = 1;
        this.baseMaxHp = 100;
        this.maxHp = this.baseMaxHp;
        this.hp = this.maxHp;
        this.hpRegen = 1; // pro Sekunde
        this.baseAttackPower = 10;
        this.attackPower = this.baseAttackPower;
        this.attackRate = 1; // Angriffe pro Sekunde
        this.attackCooldownMs = 1000 / this.attackRate; // ms
        this.critChance = 0.05;
        this.critMultiplier = 1.5;
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
        
        // New Set Stats
        this.goldMultiplier = 1.0;
        this.hpRegenPercent = 0;
        this.slowChance = 0;
        this.slowStrength = 0;
        this.deadHitChance = 0;
        
        this.activeSetBonuses = new Set();
        this.hitCounter = 0;
        this.buffs = {
            perseverance: { stacks: 0, timer: 0 },
            sellsword: { stacks: 0 },
            assassinDodge: { stacks: 0, timer: 0 }
        };
        
        // Loot collected in current run
        this.runLoot = {}; 

        // Position & Größe
        this.width = PLAYER_SIZE;
        this.height = PLAYER_SIZE;
        this.x = 0; 
        this.y = 0;
        
        // Bewegung
        this.speed = PLAYER_MAX_SPEED; // Base Max Speed
        this.vx = 0; // Actual Velocity X
        this.vy = 0; // Actual Velocity Y
        this.inputX = 0; // Input Direction X
        this.inputY = 0; // Input Direction Y
        
        this.targetX = this.x;
        this.targetY = this.y;
        this.isMoving = false;
        this.moveMode = 'manual'; // 'manual' (Joystick) or 'auto' (Click/Bot)

        this.isDashing = false;
        this.dashRange = 100;
        this.dashSpeed = 480;
        this.dashBonusReady = false;

        // Interaktion
        this.interactionTarget = null; // Enemy oder Resource
        this.interactionRange = this.range; // Pixel
        this.attackCooldownTimer = 0;
        this.weapon = 'fist'; // Default weapon
    }
    
    addLoot(itemId, rarity) {
        if (!this.runLoot[itemId]) {
            this.runLoot[itemId] = {};
        }
        if (!this.runLoot[itemId][rarity]) {
            this.runLoot[itemId][rarity] = 0;
        }
        this.runLoot[itemId][rarity]++;
    }

    equipItem(item) {
        const def = ITEM_DEFINITIONS[item.type];
        if (!def) return;
        
        // Slot bestimmen
        let slot = null;
        if (def.type === 'weapon') slot = 'weapon';
        if (def.type === 'armor') slot = 'armor';
        if (def.type === 'helmet') slot = 'helmet';
        if (def.type === 'accessory') slot = 'accessory';
        
        if (slot) {
            this.equipment[slot] = item;
            UI.log(`${def.name} ausgerüstet!`, '#00ff00');
            this.recalculateStats();
        }
    }

    recalculateStats() {
        // Reset to base + level + upgrades
        const upgHp = this.upgrades.hp * UPGRADE_CONFIG.hp.perLevel;
        const upgAtk = this.upgrades.attack * UPGRADE_CONFIG.attack.perLevel;
        
        this.maxHp = this.baseMaxHp + (this.level - 1) * 25 + upgHp;
        if (this.level >= 5) this.maxHp += 20;
        
        this.attackPower = this.baseAttackPower + (this.level - 1) * 3 + upgAtk;
        if (this.level >= 5) this.attackPower += 3;
        
        this.hpRegen = 1 + (this.upgrades.regen * UPGRADE_CONFIG.regen.perLevel);
        
        this.range = 35; // Default Melee (Reduced for better feel)
        this.weapon = 'fist';
        this.critMultiplier = 1.5;
        this.attackRate = this.level >= 10 ? 1.2 : 1.0;
        
        // Reset secondary stats
        this.splashChance = 0;
        this.splashTargets = 0;
        this.multiStrikeChance = 0; // mapped from multiAttack
        this.multiStrikeTargets = 0;
        this.damageResistance = 0;
        this.damageReturnMultiplier = 0;
        this.dodgeChance = 0;
        this.lifeSteal = 0;
        this.cooldownReduction = 0;
        this.finalDamageMultiplier = 1.0;
        this.distanceDamageBonus = 0;
        
        this.goldMultiplier = 1.0;
        this.hpRegenPercent = 0;
        this.slowChance = 0;
        this.slowStrength = 0;
        this.activeSetBonuses.clear();
        this.stunChance = 0;
        this.stunDuration = 0;
        this.knockbackChance = 0;
        
        this.deadHitChance = 0;
        this.doubleStrikeChance = 0;
        this.doubleStrikeDamageMultiplier = 0;
        
        let atkPercent = 0;
        let hpPercent = 0;
        let attackSpeedPercent = 0;
        let rangePercent = 0;

        const setCounts = {};
        
        // Temporary Accumulators for Gear
        let gearAtk = 0;
        let gearHp = 0;

        // 1. Count Sets first (Need 2-pass or just loop for stats and count)
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (!item) continue;
            const def = ITEM_DEFINITIONS[item.type];
            if (def && def.set) {
                setCounts[def.set] = (setCounts[def.set] || 0) + 1;
            }
        }

        // 2. Iterate Equipment and accumulate
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (!item) continue;
            
            const stats = item.getStats();
            
            if (stats.attackPower) gearAtk += stats.attackPower;
            if (stats.hp) gearHp += stats.hp;
            
            if (stats.attackPowerPercent) atkPercent += stats.attackPowerPercent;
            if (stats.hpPercent) hpPercent += stats.hpPercent;
            if (stats.attackSpeedPercent) attackSpeedPercent += stats.attackSpeedPercent;
            if (stats.attackRangePercent) rangePercent += stats.attackRangePercent;
            
            if (stats.critDamageBonus) this.critMultiplier += stats.critDamageBonus;
            if (stats.critChance) this.critChance += stats.critChance; // Forgot this in previous updates?
            
            if (stats.splashChance) this.splashChance += stats.splashChance;
            if (stats.splashTargets) this.splashTargets += stats.splashTargets;
            if (stats.multiAttackChance) this.multiStrikeChance += stats.multiAttackChance;
            if (stats.multiAttackTargets) this.multiStrikeTargets += stats.multiAttackTargets;
            if (stats.damageResistance) this.damageResistance += stats.damageResistance;
            if (stats.damageReturnMultiplier) this.damageReturnMultiplier += stats.damageReturnMultiplier;
            if (stats.dodgeChance) this.dodgeChance += stats.dodgeChance;
            if (stats.lifeSteal) this.lifeSteal += stats.lifeSteal;
            if (stats.rangeDamagePercent) this.distanceDamageBonus += stats.rangeDamagePercent; 
            
            if (stats.hpRegenPercent) this.hpRegenPercent += stats.hpRegenPercent;
            if (stats.goldMultiplier) this.goldMultiplier += stats.goldMultiplier; 
            
            if (stats.slowChance) this.slowChance += stats.slowChance;
            if (stats.slowStrength) this.slowStrength += stats.slowStrength;
            if (stats.stunChance) this.stunChance += stats.stunChance;
            if (stats.stunDuration) this.stunDuration += stats.stunDuration;
            if (stats.knockbackChance) this.knockbackChance += stats.knockbackChance;
            
            if (stats.deadHitChance) this.deadHitChance += stats.deadHitChance;
            if (stats.doubleStrikeChance) this.doubleStrikeChance += stats.doubleStrikeChance;
            if (stats.doubleStrikeDamageMultiplier) this.doubleStrikeDamageMultiplier += stats.doubleStrikeDamageMultiplier;

            if (stats.weaponType) {
                this.weapon = stats.weaponType;
                if (stats.range) this.range = stats.range;
            }
        }

        // Apply Hunter 2-Set Bonus (Double Gear Stats)
        if (setCounts['HUNTER'] >= 2) {
            this.activeSetBonuses.add('HUNTER_2');
            gearAtk *= 2;
            gearHp *= 2;
        }
        
        // Add Gear Stats to Base
        this.attackPower += gearAtk;
        this.maxHp += gearHp;

        // 3. Apply Set Bonuses (Mods)
        for (const [setKey, count] of Object.entries(setCounts)) {
            const setDef = ITEM_SETS[setKey];
            if (!setDef) continue;
            
            // Check 2-Set
            if (count >= 2) {
                this.activeSetBonuses.add(`${setKey}_2`);
                const bonus = setDef.bonuses[2];
                if (bonus.statMod) {
                     const mod = bonus.statMod;
                     if (mod.cooldownReduction) this.cooldownReduction += mod.cooldownReduction;
                     if (mod.distanceDamageBonus) this.distanceDamageBonus += mod.distanceDamageBonus;
                     if (mod.goldMultiplier) this.goldMultiplier += mod.goldMultiplier;
                }
            }
            // Check 4-Set
            if (count >= 4) {
                this.activeSetBonuses.add(`${setKey}_4`);
                const bonus = setDef.bonuses[4];
                if (bonus.statMod) {
                    const mod = bonus.statMod;
                    if (mod.finalDamageMultiplier) this.finalDamageMultiplier += mod.finalDamageMultiplier;
                    if (mod.allyDamageMultiplier) this.finalDamageMultiplier += mod.allyDamageMultiplier; // Hunter 4
                    if (mod.allyHpMultiplier) hpPercent += mod.allyHpMultiplier; // Hunter 4
                }
            }
        }

        // 4. Apply Percent Multipliers
        this.attackPower = Math.floor(this.attackPower * (1 + atkPercent));
        this.maxHp = Math.floor(this.maxHp * (1 + hpPercent));
        this.range = Math.floor(this.range * (1 + rangePercent));
        
        const upgAS = this.upgrades.attackSpeed * UPGRADE_CONFIG.attackSpeed.perLevel;
        this.attackRate = this.attackRate * (1 + attackSpeedPercent + upgAS);
        
        // Update derived
        this.updateAttackCooldown();
        this.interactionRange = this.range;
        
        // Cap HP to Max (optional, but good practice if equipping gear heals you? No, keeps ratio usually, but here simple clamp)
        this.hp = Math.min(this.hp, this.maxHp);
    }

    switchWeapon(type) {
        // Deprecated manual switch, only used by old items if any remain
        // But for compatibility with map.js pickupItem:
        if (type === 'sword' || type === 'wand') {
            // Do nothing, let equipItem handle it via real items
            // Or if map calls this with string, ignore or warn.
        }
    }

    updateAttackCooldown() {
        let baseMs = 1000 / this.attackRate;
        if (this.cooldownReduction > 0) {
            baseMs *= (1 - this.cooldownReduction);
        }
        this.attackCooldownMs = baseMs;
    }
    
    setMovement(ix, iy) {
        this.inputX = ix;
        this.inputY = iy;
        // isMoving determines if we are logically moving (e.g. for animations)
        // But for physics, we use velocity magnitude check
        this.isMoving = (ix !== 0 || iy !== 0); 
        this.moveMode = 'manual';
    }
    
    moveTowards(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + Math.sign(target - current) * maxDelta;
    }

    setTarget(x, y, targetEntity = null) {
        this.targetX = x - this.width/2;
        this.targetY = y - this.height/2;
        this.interactionTarget = targetEntity;
        this.isMoving = true;
        this.moveMode = 'auto';
    }

    getHitbox() {
        return {
            x: this.x + PLAYER_HITBOX_OFFSET,
            y: this.y + PLAYER_HITBOX_OFFSET,
            width: PLAYER_HITBOX_SIZE,
            height: PLAYER_HITBOX_SIZE
        };
    }

    getHitboxCenter() {
        return {
            x: this.x + PLAYER_HITBOX_OFFSET + PLAYER_HITBOX_SIZE / 2,
            y: this.y + PLAYER_HITBOX_OFFSET + PLAYER_HITBOX_SIZE / 2
        };
    }

    getShadowAnchor() {
        return {
            x: this.x + PLAYER_HITBOX_OFFSET + PLAYER_HITBOX_SIZE / 2,
            y: this.y + PLAYER_HITBOX_OFFSET + PLAYER_HITBOX_SIZE 
        };
    }

    update(dt, map) {
        // Cooldown reduzieren
        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= dt;
        }

        // Buff Timers
        if (this.buffs.perseverance.stacks > 0) {
            this.buffs.perseverance.timer -= dt;
            if (this.buffs.perseverance.timer <= 0) {
                this.buffs.perseverance.stacks = 0;
                UI.log("Perseverance ausgelaufen.", "#cccccc");
            }
        }
        if (this.buffs.assassinDodge.stacks > 0) {
            this.buffs.assassinDodge.timer -= dt;
            if (this.buffs.assassinDodge.timer <= 0) {
                this.buffs.assassinDodge.stacks = 0;
            }
        }

        // Regeneration
        if (this.hp < this.maxHp) {
            const regen = this.hpRegen * (1 + this.hpRegenPercent);
            this.hp = Math.min(this.maxHp, this.hp + regen * dt);
        }

        // Bewegung
        const maxSpeed = this.isDashing ? this.dashSpeed : this.speed;

        if (this.moveMode === 'manual') {
            // Physics Update with Accel/Friction
            let targetVx = this.inputX * maxSpeed;
            let targetVy = this.inputY * maxSpeed;
            
            // Apply Acceleration or Friction
            // If input is zero, we approach 0 with FRICTION
            // If input is non-zero, we approach target with ACCEL
            const accel = (this.inputX === 0 && this.inputY === 0) ? PLAYER_FRICTION : PLAYER_ACCEL;
            
            this.vx = this.moveTowards(this.vx, targetVx, accel * dt);
            this.vy = this.moveTowards(this.vy, targetVy, accel * dt);
            
            // Snap to 0 if very slow
            if (Math.abs(this.vx) < PLAYER_STOP_EPS) this.vx = 0;
            if (Math.abs(this.vy) < PLAYER_STOP_EPS) this.vy = 0;

            // Axis-Separated Movement & Collision
            // X Axis
            if (this.vx !== 0) {
                const nextX = this.x + this.vx * dt;
                this.x = nextX;
                if (map) {
                    const hb = this.getHitbox();
                    if (map.rectCollidesWithSolids(hb)) {
                        map.checkEntityCollision(this); // Pushes back
                        this.vx = 0; // Stop on wall collision
                    }
                }
            }
            
            // Y Axis
            if (this.vy !== 0) {
                const nextY = this.y + this.vy * dt;
                this.y = nextY;
                if (map) {
                    const hb = this.getHitbox();
                    if (map.rectCollidesWithSolids(hb)) {
                        map.checkEntityCollision(this); // Pushes back
                        this.vy = 0; // Stop on wall collision
                    }
                }
            }
            
            // Update isMoving flag based on actual velocity for animations
            this.isMoving = (this.vx !== 0 || this.vy !== 0);

        } else if (this.isMoving) { // Auto Mode Logic (Legacy/Click)
                const dist = getDistance(this.x, this.y, this.targetX, this.targetY);
                let stopDistance = 2;
                
                // Wenn wir ein Interaktionsziel haben, stoppen wir in Range
                if (this.interactionTarget && !this.interactionTarget.isDead()) {
                    const tx = this.interactionTarget.x + this.interactionTarget.width/2;
                    const ty = this.interactionTarget.y + this.interactionTarget.height/2;
                    const d = getDistance(this.x + this.width/2, this.y + this.height/2, tx, ty);
                    const meleeWeapons = ['sword', 'dagger', 'fist'];
                    const useMelee = meleeWeapons.includes(this.weapon);

                    if (useMelee) {
                        // Für Nahkampf nur stoppen, wenn wir den Gegner wirklich berühren
                        if (checkCollision(this, this.interactionTarget)) {
                            this.isMoving = false;
                        }
                    } else {
                        if (d <= this.interactionRange) {
                            this.isMoving = false;
                        }
                    }
                }

                if (this.isMoving) {
                    if (dist <= stopDistance) {
                        this.isMoving = false;
                    } else {
                        const moveDist = maxSpeed * dt;
                        const ratio = moveDist / dist;
                        this.x += (this.targetX - this.x) * ratio;
                        this.y += (this.targetY - this.y) * ratio;
                    }
                }
        } else if (this.interactionTarget && !this.interactionTarget.isDead() && this.moveMode === 'auto') {
             // Re-Engage logic in auto mode (wenn Ziel wegläuft)
             const tx = this.interactionTarget.x + this.interactionTarget.width/2;
             const ty = this.interactionTarget.y + this.interactionTarget.height/2;
             const dist = getDistance(this.x + this.width/2, this.y + this.height/2, tx, ty);
             
             if (dist > this.interactionRange) {
                 this.isMoving = true; 
                 this.setTarget(tx, ty, this.interactionTarget);
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
        
        const meleeWeapons = ['sword', 'dagger', 'fist'];
        const useMelee = meleeWeapons.includes(this.weapon);
        const overlap = nearest ? checkCollision(this, nearest) : false;
        const allowedRange = useMelee ? 0 : 160; // ranged window halbiert

        if (nearest && (overlap || (!useMelee && minDist <= allowedRange))) {
            if (this.attackCooldownTimer <= 0) {
                this.attack(nearest, map);
                this.attackCooldownTimer = this.attackCooldownMs / 1000;
            }
        }
    }

    interact(target, map) {
    }

    attack(enemy, map) {
        // Double Strike Logic
        let attacks = 1;
        if (this.doubleStrikeChance > 0 && Math.random() < this.doubleStrikeChance) {
            attacks = 2;
            UI.log("Double Strike!", "#00ffff");
        }
        
        for (let i = 0; i < attacks; i++) {
            let dmg = this.attackPower;
            
            // Hunter Helmet Double Strike Damage Bonus
            if (i === 1 && this.doubleStrikeDamageMultiplier > 0) {
                dmg *= (1 + this.doubleStrikeDamageMultiplier);
            }

            // Assassin Dodge Buff
            if (this.activeSetBonuses.has('ASSASSIN_2') && this.buffs.assassinDodge.stacks > 0) {
                dmg *= (1 + this.buffs.assassinDodge.stacks * 0.05);
            }
            
            // Dynamic Buffs (Barbarian Rage)
            if (this.activeSetBonuses.has('BARBARIAN_4') && this.buffs.perseverance.stacks >= 5) {
                dmg *= 1.30;
            }
            
            // Dynamic Buffs (Sellsword Kill Stack)
            if (this.activeSetBonuses.has('SELLSWORD_4') && this.buffs.sellsword.stacks > 0) {
                dmg *= (1 + this.buffs.sellsword.stacks * 0.01);
            }

            // Distance Bonus (Archer Set)
            if (this.distanceDamageBonus > 0) {
                const dist = getDistance(this.x + this.width/2, this.y + this.height/2, enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                const ratio = Math.min(1.0, dist / 400);
                dmg *= (1 + this.distanceDamageBonus * ratio);
            }

            // Final Damage Multiplier (Caster / Hunter)
            if (this.finalDamageMultiplier !== 1.0) {
                dmg *= this.finalDamageMultiplier;
            }

            const isCrit = Math.random() < this.critChance;
            if (isCrit) {
                dmg *= this.critMultiplier;
                // Assassin 4/4 Lethal Crit
                if (this.activeSetBonuses.has('ASSASSIN_4') && Math.random() < 0.30) {
                    dmg *= 1.60;
                    UI.log("Lethal Crit!", "#ff00ff");
                }
            }
            
            // Dead Hit (Assassin)
            if (this.deadHitChance > 0 && Math.random() < this.deadHitChance && !enemy.isBoss) {
                dmg = enemy.maxHp * 10; // Overkill
                UI.log("DEAD HIT!", "#ff0000");
            }

            if (this.dashBonusReady) {
                dmg *= 2;
                if (i === attacks - 1) this.dashBonusReady = false; // Consume on last hit? or first? Consume once per attack action.
            }

            if (this.weapon === 'sword' || this.weapon === 'dagger' || this.weapon === 'fist') { 
                // Nahkampf + Knockback (Fist behaves like Sword)
                enemy.takeDamage(dmg, this, map); // Pass map for knockback bounds
                if (!enemy.isBoss) { 
                    pushBack(enemy, this, 50, map ? map.currentRoom : null); 
                }
            } else if (this.weapon === 'wand' || this.weapon === 'bow') {
                // Fernkampf Projektil
                if (map) {
                    // Small delay for second shot?
                    // Simplified: Spawn both immediately but with slight offset or just 2 projectiles
                    const offset = i * 10;
                    const tx = enemy.x + enemy.width/2 + offset;
                    const ty = enemy.y + enemy.height/2 + offset;
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
        if (this.dashBonusReady) this.dashBonusReady = false; 
    }

    takeDamage(amount, attacker = null) {
        // Dodge Logic (Assassin / Hunter)
        if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
            UI.log("Ausgewichen!", "#aaffaa");
            
            // Assassin 2/4 Buff
            if (this.activeSetBonuses.has('ASSASSIN_2')) {
                if (this.buffs.assassinDodge.stacks < 5) {
                    this.buffs.assassinDodge.stacks++;
                }
                this.buffs.assassinDodge.timer = 10;
            }
            return;
        }

        // Barbarian Perseverance Logic
        if (this.activeSetBonuses.has('BARBARIAN_2')) {
            this.hitCounter++;
            if (this.hitCounter >= 4) {
                this.hitCounter = 0;
                if (this.buffs.perseverance.stacks < 5) {
                    this.buffs.perseverance.stacks++;
                    UI.log(`Perseverance Stack: ${this.buffs.perseverance.stacks}`, '#ffaa00');
                }
                this.buffs.perseverance.timer = 10; // Refresh timer
            }
        }
        
        // Apply Damage Resistance from Buffs
        let resist = this.damageResistance;
        if (this.buffs.perseverance.stacks > 0) {
            resist += this.buffs.perseverance.stacks * 0.05;
        }
        
        // Cap resist?
        resist = Math.min(0.90, resist);
        
        const finalDamage = Math.max(0, amount * (1 - resist));
        this.hp -= finalDamage;
        
        if (this.hp < 0) this.hp = 0;
        
        // Damage Return
        if (attacker && this.damageReturnMultiplier > 0) {
            const retDmg = amount * this.damageReturnMultiplier; // Return raw damage or final? Usually raw or post-mitigation. Let's do pre-mitigation for stronger feel.
            attacker.takeDamage(retDmg, this);
        }
        
        if (attacker && !this.isDead()) {
            this.onAttacked(attacker);
        }
    }

    onKill(enemy) {
        // Sellsword Kill Stack Logic
        if (this.activeSetBonuses.has('SELLSWORD_4')) {
            if (Math.random() < 0.04) {
                if (this.buffs.sellsword.stacks < 50) {
                    this.buffs.sellsword.stacks++;
                    UI.log(`Sellsword Dmg Bonus: +${this.buffs.sellsword.stacks}%`, '#ffd700');
                }
            }
        }
    }

    onAttacked(attacker) {
        this.interactionTarget = attacker;
    }

    heal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
    }

    gainGold(amount) {
        const bonus = Math.floor(amount * this.goldMultiplier);
        this.gold += bonus;
        SaveManager.saveGold(this.gold);
    }
    
    getUpgradeCost(type) {
        const lvl = this.upgrades[type];
        const cfg = UPGRADE_CONFIG[type];
        if (!cfg) return 0;
        return Math.floor(cfg.baseCost * Math.pow(cfg.costMult, lvl));
    }
    
    buyUpgrade(type) {
        const cost = this.getUpgradeCost(type);
        if (this.gold >= cost) {
            this.gold -= cost;
            this.upgrades[type]++;
            SaveManager.saveGold(this.gold);
            SaveManager.saveUpgrades(this.upgrades);
            this.recalculateStats();
            UI.log(`${UPGRADE_CONFIG[type].name} auf Level ${this.upgrades[type]} verbessert!`, '#00ff00');
            return true;
        }
        return false;
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
        this.maxHp += 25;
        this.attackPower += 3;

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

        if (this.level % 5 === 0) {
            this.hpRegen += 1;
            UI.log(`Deine Regeneration steigt auf ${this.hpRegen}/s.`, '#00ffcc');
        }

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
        this.hp = this.maxHp;
        this.isMoving = false;
        this.interactionTarget = null;
        this.attackCooldownTimer = 0;
        this.isDashing = false;
        this.dashBonusReady = false;
        this.moveMode = 'manual';
        this.runLoot = {}; // Clear run loot
    }
}
