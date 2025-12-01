export const TILE_SIZE = 16;
export const RENDER_SCALE = 3; // Skaliert 16px Tiles auf 48px Bildschirmgröße

// Entity Sizes (in World Pixels)
export const PLAYER_SIZE = 16;
export const ENEMY_SIZE = 16;
export const MINIBOSS_SIZE = 24;
export const BOSS_SIZE = 40;

// Tile-IDs (Autotile/Isaac Setup)
// Basis
export const TILE = {
    FLOOR: 0,
    WALL: 1,
    ENEMY_SPAWN: 2,
    TREASURE: 3,
    BOSS_SPAWN: 5,
    OBSTACLE: 8, // feste Hindernisse (Säulen)
    VOID: 9,     // Abgrund/Loch (vorher 9 als Wasser/Void genutzt)
    // Türen
    DOOR_NORTH: 10,
    DOOR_SOUTH: 11,
    DOOR_EAST: 12,
    DOOR_WEST: 13
};

// Tile-Kategorien für Logik/Autotile
export const WALL_LIKE_TILES = new Set([TILE.WALL, TILE.VOID]);
export const SOLID_TILES = new Set([TILE.WALL, TILE.OBSTACLE, TILE.VOID]);
