export const DOOR_MASK = {
    NORTH: 1,
    EAST: 2,
    SOUTH: 4,
    WEST: 8
};

export function maskFromNeighbors(neighbors = {}) {
    let mask = 0;
    if (neighbors.up || neighbors.north) mask |= DOOR_MASK.NORTH;
    if (neighbors.right || neighbors.east) mask |= DOOR_MASK.EAST;
    if (neighbors.down || neighbors.south) mask |= DOOR_MASK.SOUTH;
    if (neighbors.left || neighbors.west) mask |= DOOR_MASK.WEST;
    return mask;
}

export class RoomPattern {
    constructor({ id, grid, doorMask, type = 'Normal', potentialSpawnPoints = [] }) {
        this.id = id;
        this.grid = grid;
        this.doorMask = doorMask;
        this.type = type;
        this.potentialSpawnPoints = potentialSpawnPoints;
        this.rows = grid.length;
        this.cols = grid[0].length;
    }

    static fromLegacy(grid, doorMask, type = 'Normal', idPrefix = 'legacy', processGrid) {
        const spawns = [];
        const cleaned = grid.map((row, r) =>
            row.map((cell, c) => {
                if (cell === 2 || cell === 5) {
                    spawns.push({ row: r, col: c, isBoss: cell === 5 });
                    return 0;
                }
                return cell;
            })
        );
        const finalGrid = processGrid ? processGrid(cleaned.map(r => [...r]), doorMask) : cleaned;
        return new RoomPattern({
            id: `${idPrefix}-${doorMask}-${Math.random().toString(36).slice(2, 7)}`,
            grid: finalGrid,
            doorMask,
            type,
            potentialSpawnPoints: spawns
        });
    }
}
