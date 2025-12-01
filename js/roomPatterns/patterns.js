import { RoomPattern, DOOR_MASK } from './RoomPattern.js';
import { TILE } from '../constants.js';
import { NORMAL_LAYOUTS, TREASURE_LAYOUTS, BOSS_LAYOUTS } from './layouts.js';

const ALL_MASKS = [
    DOOR_MASK.NORTH,
    DOOR_MASK.EAST,
    DOOR_MASK.SOUTH,
    DOOR_MASK.WEST,
    DOOR_MASK.NORTH | DOOR_MASK.EAST,
    DOOR_MASK.NORTH | DOOR_MASK.SOUTH,
    DOOR_MASK.NORTH | DOOR_MASK.WEST,
    DOOR_MASK.EAST | DOOR_MASK.SOUTH,
    DOOR_MASK.EAST | DOOR_MASK.WEST,
    DOOR_MASK.SOUTH | DOOR_MASK.WEST,
    DOOR_MASK.NORTH | DOOR_MASK.EAST | DOOR_MASK.SOUTH,
    DOOR_MASK.NORTH | DOOR_MASK.EAST | DOOR_MASK.WEST,
    DOOR_MASK.NORTH | DOOR_MASK.SOUTH | DOOR_MASK.WEST,
    DOOR_MASK.EAST | DOOR_MASK.SOUTH | DOOR_MASK.WEST,
    DOOR_MASK.NORTH | DOOR_MASK.EAST | DOOR_MASK.SOUTH | DOOR_MASK.WEST
];

function generatePatterns(layouts, masks, type = 'Normal', idPrefix = 'room') {
    return masks.flatMap((mask) =>
        layouts.map((layout) =>
            RoomPattern.fromLegacy(
                layout.grid,
                mask,
                type,
                `${idPrefix}-${layout.id}-${mask}`,
                (g) => applyWallsAndDoors(g, mask)
            )
        )
    );
}

function applyWallsAndDoors(grid, mask) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Target Dimensions: 15 x 9
    // Mid Col = 7
    // Mid Row = 4

    // 1. Set walls on edges
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                grid[r][c] = TILE.WALL;
            }
        }
    }

    // 2. Set Doors (Single Tile)
    const midCol = 7;
    const midRow = 4;

    // North (7, 0)
    if (mask & DOOR_MASK.NORTH) {
        grid[0][midCol] = TILE.DOOR_NORTH;
        grid[1][midCol] = TILE.FLOOR; // Walkable inside
    }

    // South (7, 8)
    if (mask & DOOR_MASK.SOUTH) {
        grid[rows - 1][midCol] = TILE.DOOR_SOUTH;
        grid[rows - 2][midCol] = TILE.FLOOR; // Walkable inside
    }

    // West (0, 4)
    if (mask & DOOR_MASK.WEST) {
        grid[midRow][0] = TILE.DOOR_WEST;
        grid[midRow][1] = TILE.FLOOR; // Walkable inside
    }

    // East (14, 4)
    if (mask & DOOR_MASK.EAST) {
        grid[midRow][cols - 1] = TILE.DOOR_EAST;
        grid[midRow][cols - 2] = TILE.FLOOR; // Walkable inside
    }

    return grid;
}

export function makeFallbackPattern(mask, type = 'Normal', rows = 9, cols = 15) {
    const base = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => 0) // Initialize with 0 (FLOOR)
    );
    const walled = applyWallsAndDoors(base, mask);
    return new RoomPattern({
        id: `fallback-${type}-${mask}`,
        grid: walled,
        doorMask: mask,
        type,
        potentialSpawnPoints: [{ row: Math.floor(rows / 2), col: Math.floor(cols / 2) }]
    });
}

const PATTERN_REGISTRY = [
    // Alle Normalen Layouts mit allen Masken kombinieren
    ...generatePatterns(NORMAL_LAYOUTS, ALL_MASKS, 'Normal', 'normal'),
    
    // Boss und Treasure
    ...generatePatterns(BOSS_LAYOUTS, ALL_MASKS, 'Boss', 'boss'),
    ...generatePatterns(TREASURE_LAYOUTS, ALL_MASKS, 'Treasure', 'treasure'),
    
    // Start (nutzt auch normale Layouts, aber Map-Logic verhindert Gegner)
    ...generatePatterns(NORMAL_LAYOUTS, ALL_MASKS, 'Start', 'start')
];

export default PATTERN_REGISTRY;
