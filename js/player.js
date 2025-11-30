// Player Klasse: Verwaltet Stats, Position und Bewegung
import { getDistance, pushBack } from './utils.js';
import { Projectile } from './projectile.js';
import * as UI from './ui.js';
import { ITEM_DEFINITIONS, ITEM_SETS } from './items/itemData.js';
import { SaveManager } from './saveManager.js';

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
        this.width = 40;
        this.height = 40;
        this.x = 400 - this.width / 2; // Mitte
        this.y = 300 - this.height / 2;
        
        // Bewegung
        this.speed = 400; // Pixel pro Sekunde (doppelt so schnell)
        this.vx = 0;
        this.vy = 0;
        
        this.targetX = this.x;
        this.targetY = this.y;
        this.isMoving = false;
        this.moveMode = 'manual'; // 'manual' (Joystick) or 'auto' (Click/Bot)

        this.isDashing = false;
        this.dashRange = 100;
        this.dashSpeed = 480;
        this.dashBonusReady = false;

        // Autopilot Stuck Detection
        this._lastAutoCheck = { x: this.x, y: this.y };
        this._stuckTimer = 0;
        this._stuckSide = 1;
        this.avoidanceTimer = 0; // Wie lange wir das Hindernis umgehen, bevor wir das Ziel neu setzen

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
        
        this.range = 60; // Default Melee
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
        // Avoidance Timer reduzieren
        if (this.avoidanceTimer > 0) {
            this.avoidanceTimer -= dt;
        }

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
        if (this.isMoving) {
            const currentSpeed = this.isDashing ? this.dashSpeed : this.speed;
            
            if (this.moveMode === 'manual') {
                this.x += this.vx * currentSpeed * dt;
                this.y += this.vy * currentSpeed * dt;
            } else {
                // Auto Mode (Click to Move)
                const dist = getDistance(this.x, this.y, this.targetX, this.targetY);
                let stopDistance = 2;
                
                // Wenn wir ein Interaktionsziel haben, stoppen wir in Range
                if (this.interactionTarget && !this.interactionTarget.isDead()) {
                    // Checke Distanz zum Ziel (Mitte)
                    const tx = this.interactionTarget.x + this.interactionTarget.width/2;
                    const ty = this.interactionTarget.y + this.interactionTarget.height/2;
                    const d = getDistance(this.x + this.width/2, this.y + this.height/2, tx, ty);
                    
                    if (d <= this.interactionRange) {
                        this.isMoving = false;
                        // Angreifen passiert in autoAttack
                    } else {
                        // Weiterlaufen
                    }
                }

                if (this.isMoving) {
                    if (dist <= stopDistance) {
                        this.isMoving = false;
                    } else {
                        const moveDist = currentSpeed * dt;
                        const ratio = moveDist / dist;
                        this.x += (this.targetX - this.x) * ratio;
                        this.y += (this.targetY - this.y) * ratio;
                    }
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

        // Stuck-Detection für Autopilot: wenn wir im Auto-Mode kaum vorankommen, einen kleinen Sidestep machen
        this.handleAutoStuck(dt);
    }

    handleAutoStuck(dt) {
        if (this.moveMode !== 'auto' || !this.isMoving) {
            this._stuckTimer = 0;
            this._lastAutoCheck.x = this.x;
            this._lastAutoCheck.y = this.y;
            return;
        }

        const moved = getDistance(this.x, this.y, this._lastAutoCheck.x, this._lastAutoCheck.y);
        // Schwellenwert etwas anpassen, da bei sehr hohen FPS 1px vllt unterschritten wird? 
        // Nein, bei dt Summe sollte es passen. Aber machen wir es etwas toleranter.
        if (moved < 2) {
            this._stuckTimer += dt;
            if (this._stuckTimer > 0.6) {
                // Wenn wir ein Ziel haben, versuche seitlich am Hindernis vorbei zu laufen
                if (this.interactionTarget && !this.interactionTarget.isDead()) {
                    const tx = this.interactionTarget.x + this.interactionTarget.width/2;
                    const ty = this.interactionTarget.y + this.interactionTarget.height/2;
                    const dx = tx - (this.x + this.width/2);
                    const dy = ty - (this.y + this.height/2);
                    const len = Math.max(1e-3, Math.sqrt(dx*dx + dy*dy));
                    // Perpendicular Offset (links/rechts abwechseln)
                    const offX = (dy / len) * 140 * this._stuckSide;
                    const offY = (-dx / len) * 140 * this._stuckSide;
                    this._stuckSide *= -1;
                    this.setTarget(tx + offX, ty + offY, this.interactionTarget);
                    // Wir geben dem Spieler Zeit, diesen Ausweichpfad zu laufen
                    this.avoidanceTimer = 1.5; 
                } else {
                    // kleiner Jitter
                    const jitter = 120;
                    const nx = this.x + (Math.random() - 0.5) * jitter;
                    const ny = this.y + (Math.random() - 0.5) * jitter;
                    this.setTarget(nx, ny, null);
                    this.avoidanceTimer = 0.5;
                }
                this._stuckTimer = 0;
            }
        } else {
            this._stuckTimer = 0;
        }

        this._lastAutoCheck.x = this.x;
        this._lastAutoCheck.y = this.y;
    }
    
    updateAutoPilot(map, dt) {
        // Wenn wir gerade einem Hindernis ausweichen, nicht das Ziel überschreiben!
        if (this.avoidanceTimer > 0) return;

        const cx = this.x + this.width/2;
        const cy = this.y + this.height/2;

        // 1. Items sammeln (Höchste Prio) – Loch (next_floor) bevorzugen
        const items = map.getItems();
        if (items.length > 0) {
            let nearestItem = null;
            let minDist = Infinity;
            // Next floor hat Vorrang
            const holes = items.filter(i => i.type === 'next_floor');
            const searchList = holes.length > 0 ? holes : items;
            searchList.forEach(item => {
                const d = getDistance(cx, cy, item.x + item.width/2, item.y + item.height/2);
                if (d < minDist) {
                    minDist = d;
                    nearestItem = item;
                }
            });
            
            if (nearestItem) {
                this.setTarget(nearestItem.x + nearestItem.width/2, nearestItem.y + nearestItem.height/2, null);
                return;
            }
        }

        // 2. Kampf
        const enemies = map.getEnemies();
        if (enemies.length > 0) {
            let nearestEnemy = null;
            let minDist = Infinity;
            enemies.forEach(e => {
                const d = getDistance(cx, cy, e.x + e.width/2, e.y + e.height/2);
                if (d < minDist) {
                    minDist = d;
                    nearestEnemy = e;
                }
            });

            if (nearestEnemy) {
                if (this.weapon === 'sword') {
                    // Schwert: Drauf laufen
                    this.setTarget(nearestEnemy.x + nearestEnemy.width/2, nearestEnemy.y + nearestEnemy.height/2, nearestEnemy);
                } else {
                    // Zauberstab: Kiting / Positioning
                    if (minDist > 300) {
                        // Annähern
                        this.setTarget(nearestEnemy.x + nearestEnemy.width/2, nearestEnemy.y + nearestEnemy.height/2, nearestEnemy);
                    } else if (minDist < 150) {
                        // Weglaufen
                        const dx = this.x - nearestEnemy.x;
                        const dy = this.y - nearestEnemy.y;
                        this.setTarget(this.x + dx, this.y + dy, null);
                    } else {
                        // Stehen bleiben und feuern
                        this.isMoving = false;
                        this.setTarget(this.x, this.y, nearestEnemy); // Target für AutoAttack setzen
                    }
                }
            }
            return;
        }

        // 3. Raumwechsel (Wenn leer) – nur zu unbekannten Räumen, sonst keine Bewegung
        const room = map.currentRoom;
        if (room && room.layout && room.enemies.length === 0) {
            // Erst normale Räume suchen (ohne Boss)
            let path = map.findPathToUnvisited(`${map.currentGridX},${map.currentGridY}`, true);
            
            // Wenn keine normalen mehr da sind, dann zum Boss
            if (path.length === 0) {
                path = map.findPathToUnvisited(`${map.currentGridX},${map.currentGridY}`, false);
            }
            
            const nextDir = path.length > 0 ? path[0] : null;

            const neighbors = room.layout.neighbors || {};
            const w = room.width;
            const h = room.height;
            const border = 30; // Zielpunkt etwas in den Ausgang rein
            const neighborList = [];
            const gx = map.currentGridX;
            const gy = map.currentGridY;
            
            if (neighbors.up) neighborList.push({ dir: 'up', x: w/2, y: border, key: `${gx},${gy+1}` });
            if (neighbors.down) neighborList.push({ dir: 'down', x: w/2, y: h - border, key: `${gx},${gy-1}` });
            if (neighbors.left) neighborList.push({ dir: 'left', x: border, y: h/2, key: `${gx-1},${gy}` });
            if (neighbors.right) neighborList.push({ dir: 'right', x: w - border, y: h/2, key: `${gx+1},${gy}` });

            let candidate = null;
            if (nextDir) {
                candidate = neighborList.find(n => n.dir === nextDir) || null;
            }

            if (!candidate) {
                // Falls keine ungeklärte Route gefunden, versuche unbesuchte Nachbarn direkt
                const unvisited = neighborList.filter(n => {
                    const targetRoom = map.grid[n.key];
                    return !targetRoom || !targetRoom.visited;
                });
                candidate = (unvisited.length > 0 ? unvisited : neighborList)[0] || null;
            }

            if (candidate) {
                this.setTarget(candidate.x, candidate.y, null);
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
        // Nicht mehr genutzt durch updateAutoPilot Logic?
        // Doch, wenn isMoving false wird und target gesetzt ist.
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
                enemy.takeDamage(dmg, this);
                if (!enemy.isBoss) { 
                    pushBack(enemy, this, 50); 
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
