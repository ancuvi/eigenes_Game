import { checkCollision, getDistance } from './utils.js';

export class Projectile {
    constructor(x, y, targetX, targetY, speed, damage, owner) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.speed = speed;
        this.damage = damage;
        this.owner = owner; // 'player' oder 'enemy'
        
        // Vektor berechnen
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
        
        this.active = true;
        this.maxDistance = 600; // Max Reichweite
        this.traveled = 0;
    }

    update(dt, map) {
        if (!this.active) return;

        const dx = this.vx * dt;
        const dy = this.vy * dt;
        
        this.x += dx;
        this.y += dy;
        this.traveled += Math.sqrt(dx*dx + dy*dy);
        
        if (this.traveled > this.maxDistance) {
            this.active = false;
            return;
        }

        // Kollision mit Wänden/Obstacles
        // Map Boundaries (20px Wanddicke)
        const w = map.currentRoom.width;
        const h = map.currentRoom.height;
        const wall = 20;
        
        if (this.x < wall || this.x > w - wall || this.y < wall || this.y > h - wall) {
            this.active = false;
            return;
        }
        
        // Obstacles
        const obstacles = map.getObstacles();
        for (let obs of obstacles) {
            if (checkCollision(this, obs)) {
                this.active = false;
                return;
            }
        }

        // Kollision mit Zielen
        if (this.owner === 'player') {
            const enemies = map.getEnemies();
            for (let e of enemies) {
                if (checkCollision(this, e)) {
                    e.takeDamage(this.damage, map.player); // Player als Source übergeben
                    this.active = false;
                    return;
                }
            }
        } else if (this.owner === 'enemy') {
            const p = map.player;
            if (checkCollision(this, p)) {
                p.takeDamage(this.damage);
                this.active = false;
                return;
            }
        }
    }
}
