// Autopilot: eigenständige Steuerlogik für automatisches Farmen
import { getDistance } from './utils.js';
import { TILE, TILE_SIZE } from './constants.js';

export class AutoPilot {
    constructor(player, map) {
        this.player = player;
        this.map = map;

        this._lastPos = { x: player.x, y: player.y };
        this._stuckTimer = 0;
        this._stuckSide = 1;
        this.avoidTimer = 0;
    }

    update(dt) {
        const room = this.map.currentRoom;
        if (!room) return;

        if (this.avoidTimer > 0) {
            this.avoidTimer -= dt;
        }

        this.handleStuck(dt);
        if (this.avoidTimer > 0) return;

        const cx = this.player.x + this.player.width / 2;
        const cy = this.player.y + this.player.height / 2;

        // 1) Items priorisieren (Loch zuerst)
        const items = this.map.getItems();
        if (items.length > 0) {
            const holes = items.filter(i => i.type === 'next_floor');
            const search = holes.length > 0 ? holes : items;

            let nearest = null;
            let minDist = Infinity;
            search.forEach(item => {
                const d = getDistance(
                    cx,
                    cy,
                    item.x + item.width / 2,
                    item.y + item.height / 2
                );
                if (d < minDist) {
                    minDist = d;
                    nearest = item;
                }
            });

            if (nearest) {
                this.player.setTarget(
                    nearest.x + nearest.width / 2,
                    nearest.y + nearest.height / 2,
                    null
                );
                return;
            }
        }

        // 2) Gegner fokussieren (immer Nahkampf-Range anlaufen)
        const enemies = this.map.getEnemies();
        if (enemies.length > 0) {
            let nearestEnemy = null;
            let minDist = Infinity;
            enemies.forEach(e => {
                const d = getDistance(
                    cx,
                    cy,
                    e.x + e.width / 2,
                    e.y + e.height / 2
                );
                if (d < minDist) {
                    minDist = d;
                    nearestEnemy = e;
                }
            });

            if (nearestEnemy) {
                const ex = nearestEnemy.x + nearestEnemy.width / 2;
                const ey = nearestEnemy.y + nearestEnemy.height / 2;
                this.player.setTarget(ex, ey, nearestEnemy);
            }
            return;
        }

        // 3) Raumwechsel wenn leer
        if (room.layout && room.enemies.length === 0) {
            let path = this.map.findPathToUnvisited(`${this.map.currentGridX},${this.map.currentGridY}`, true);
            if (path.length === 0) {
                path = this.map.findPathToUnvisited(`${this.map.currentGridX},${this.map.currentGridY}`, false);
            }
            const nextDir = path.length > 0 ? path[0] : null;

            const doorTargets = this.computeDoorTargets(room);
            const neighbors = room.layout.neighbors || {};
            const gx = this.map.currentGridX;
            const gy = this.map.currentGridY;
            const neighborList = [];

            if (neighbors.up && doorTargets.up) neighborList.push({ dir: 'up', key: `${gx},${gy + 1}`, ...doorTargets.up });
            if (neighbors.down && doorTargets.down) neighborList.push({ dir: 'down', key: `${gx},${gy - 1}`, ...doorTargets.down });
            if (neighbors.left && doorTargets.left) neighborList.push({ dir: 'left', key: `${gx - 1},${gy}`, ...doorTargets.left });
            if (neighbors.right && doorTargets.right) neighborList.push({ dir: 'right', key: `${gx + 1},${gy}`, ...doorTargets.right });

            let candidate = nextDir ? neighborList.find(n => n.dir === nextDir) || null : null;
            if (!candidate) {
                const unvisited = neighborList.filter(n => {
                    const targetRoom = this.map.grid[n.key];
                    return !targetRoom || !targetRoom.visited;
                });
                candidate = (unvisited.length > 0 ? unvisited : neighborList)[0] || null;
            }

            if (candidate) {
                this.player.setTarget(candidate.x, candidate.y, null);
            }
        }
    }

    handleStuck(dt) {
        if (this.player.moveMode !== 'auto' || !this.player.isMoving) {
            this.resetStuck();
            return;
        }

        const moved = getDistance(this.player.x, this.player.y, this._lastPos.x, this._lastPos.y);
        if (moved < 2) {
            this._stuckTimer += dt;
            if (this._stuckTimer > 0.6) {
                if (this.player.interactionTarget && !this.player.interactionTarget.isDead()) {
                    const tx = this.player.interactionTarget.x + this.player.interactionTarget.width / 2;
                    const ty = this.player.interactionTarget.y + this.player.interactionTarget.height / 2;
                    const dx = tx - (this.player.x + this.player.width / 2);
                    const dy = ty - (this.player.y + this.player.height / 2);
                    const len = Math.max(1e-3, Math.sqrt(dx * dx + dy * dy));
                    const offX = (dy / len) * 140 * this._stuckSide;
                    const offY = (-dx / len) * 140 * this._stuckSide;
                    this._stuckSide *= -1;
                    this.player.setTarget(tx + offX, ty + offY, this.player.interactionTarget);
                    this.avoidTimer = 1.25;
                } else {
                    const jitter = 120;
                    const nx = this.player.x + (Math.random() - 0.5) * jitter;
                    const ny = this.player.y + (Math.random() - 0.5) * jitter;
                    this.player.setTarget(nx, ny, null);
                    this.avoidTimer = 0.5;
                }
                this._stuckTimer = 0;
            }
        } else {
            this._stuckTimer = 0;
        }

        this._lastPos.x = this.player.x;
        this._lastPos.y = this.player.y;
    }

    resetStuck() {
        this._stuckTimer = 0;
        this._lastPos.x = this.player.x;
        this._lastPos.y = this.player.y;
    }

    computeDoorTargets(room) {
        const tiles = room.tiles || [];
        const rows = tiles.length;
        const cols = rows > 0 ? tiles[0].length : 0;

        const buckets = { up: [], down: [], left: [], right: [] };

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tile = tiles[r][c];
                if (tile === TILE.DOOR_NORTH || tile === TILE.DOOR_SOUTH || tile === TILE.DOOR_WEST || tile === TILE.DOOR_EAST) {
                    const center = {
                        x: c * TILE_SIZE + TILE_SIZE / 2,
                        y: r * TILE_SIZE + TILE_SIZE / 2
                    };
                    if (tile === TILE.DOOR_NORTH) buckets.up.push(center);
                    if (tile === TILE.DOOR_SOUTH) buckets.down.push(center);
                    if (tile === TILE.DOOR_WEST) buckets.left.push(center);
                    if (tile === TILE.DOOR_EAST) buckets.right.push(center);
                }
            }
        }

        const average = (arr) => {
            if (arr.length === 0) return null;
            const sum = arr.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
            return { x: sum.x / arr.length, y: sum.y / arr.length };
        };

        const fallback = {
            up: { x: room.width / 2, y: TILE_SIZE * 0.6 },
            down: { x: room.width / 2, y: room.height - TILE_SIZE * 0.6 },
            left: { x: TILE_SIZE * 0.6, y: room.height / 2 },
            right: { x: room.width - TILE_SIZE * 0.6, y: room.height / 2 }
        };

        return {
            up: average(buckets.up) || fallback.up,
            down: average(buckets.down) || fallback.down,
            left: average(buckets.left) || fallback.left,
            right: average(buckets.right) || fallback.right
        };
    }
}
