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
        // Avoidance Timer reduzieren
        if (this.avoidanceTimer > 0) {
            this.avoidanceTimer -= dt;
        }

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
            const path = map.findPathToUnvisited(`${map.currentGridX},${map.currentGridY}`);
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
            if (!enemy.isBoss) { 
                pushBack(enemy, this, 50); 
            }
        } else if (this.weapon === 'wand') {
            // Fernkampf Projektil
            if (map) {
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
    }
}
