import { RoomPattern, DOOR_MASK } from './RoomPattern.js';
import { ONE_DOOR } from './1_door.js';
import { TWO_DOORS } from './2_doors.js';
import { THREE_DOORS } from './3_doors.js';
import { FOUR_DOORS } from './4_doors.js';
import { BOSS } from './boss.js';
import { SECRET } from './treasure.js';

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

const ONE_DOOR_MASKS = [
    DOOR_MASK.NORTH,
    DOOR_MASK.EAST,
    DOOR_MASK.SOUTH,
    DOOR_MASK.WEST
];

const TWO_DOOR_STRAIGHT = [
    DOOR_MASK.NORTH | DOOR_MASK.SOUTH,
    DOOR_MASK.EAST | DOOR_MASK.WEST
];

const TWO_DOOR_CORNERS = [
    DOOR_MASK.NORTH | DOOR_MASK.EAST,
    DOOR_MASK.EAST | DOOR_MASK.SOUTH,
    DOOR_MASK.SOUTH | DOOR_MASK.WEST,
    DOOR_MASK.WEST | DOOR_MASK.NORTH
];

const THREE_DOOR_MASKS = [
    DOOR_MASK.EAST | DOOR_MASK.SOUTH | DOOR_MASK.WEST,
    DOOR_MASK.SOUTH | DOOR_MASK.WEST | DOOR_MASK.NORTH,
    DOOR_MASK.WEST | DOOR_MASK.NORTH | DOOR_MASK.EAST,
    DOOR_MASK.NORTH | DOOR_MASK.EAST | DOOR_MASK.SOUTH
];

function mapLegacy(legacyList, masks, type = 'Normal', idPrefix = 'legacy') {
    return masks.flatMap((mask) =>
        legacyList.map((tpl, idx) =>
            RoomPattern.fromLegacy(
                tpl.grid,
                mask,
                type,
                `${idPrefix}-${idx}`,
                (g) => carveDoors(g, mask)
            )
        )
    );
}

function carveDoors(grid, mask) {
    const rows = grid.length;
    const cols = grid[0].length;
    const open = (r, c, width = 3, height = 3) => {
        for (let y = r; y < r + height; y++) {
            for (let x = c; x < c + width; x++) {
                if (grid[y] && grid[y][x] !== undefined) grid[y][x] = 0;
            }
        }
    };

    if (mask & DOOR_MASK.NORTH) open(0, Math.floor(cols / 2) - 1, 3, 2);
    if (mask & DOOR_MASK.SOUTH) open(rows - 2, Math.floor(cols / 2) - 1, 3, 2);
    if (mask & DOOR_MASK.WEST) open(Math.floor(rows / 2) - 1, 0, 2, 3);
    if (mask & DOOR_MASK.EAST) open(Math.floor(rows / 2) - 1, cols - 2, 2, 3);

    return grid;
}

export function makeFallbackPattern(mask, type = 'Normal', rows = 9, cols = 13) {
    const base = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) =>
            r === 0 || c === 0 || r === rows - 1 || c === cols - 1 ? 1 : 0
        )
    );
    const carved = carveDoors(base, mask);
    return new RoomPattern({
        id: `fallback-${type}-${mask}`,
        grid: carved,
        doorMask: mask,
        type,
        potentialSpawnPoints: [{ row: Math.floor(rows / 2), col: Math.floor(cols / 2) }]
    });
}

const PATTERN_REGISTRY = [
    ...mapLegacy(ONE_DOOR, ONE_DOOR_MASKS, 'Normal', '1door'),
    ...mapLegacy(TWO_DOORS, TWO_DOOR_STRAIGHT, 'Normal', '2door-straight'),
    ...mapLegacy(TWO_DOORS, TWO_DOOR_CORNERS, 'Normal', '2door-corner'),
    ...mapLegacy(THREE_DOORS, THREE_DOOR_MASKS, 'Normal', '3door'),
    ...mapLegacy(FOUR_DOORS, [DOOR_MASK.NORTH | DOOR_MASK.EAST | DOOR_MASK.SOUTH | DOOR_MASK.WEST], 'Normal', '4door'),
    ...mapLegacy(BOSS, ALL_MASKS, 'Boss', 'boss'),
    ...mapLegacy(SECRET, ALL_MASKS, 'Secret', 'secret'),
    ...mapLegacy(ONE_DOOR, ONE_DOOR_MASKS, 'Start', 'start')
];

export default PATTERN_REGISTRY;
