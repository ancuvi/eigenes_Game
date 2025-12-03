// HD World Setup
export const TILE_WORLD = 64; 
export const TILE_SIZE = TILE_WORLD; // Alias for compatibility, eventually replace all

export const ROOM_TILES_W = 15;
export const ROOM_TILES_H = 9;

export const ROOM_WORLD_W = ROOM_TILES_W * TILE_WORLD;
export const ROOM_WORLD_H = ROOM_TILES_H * TILE_WORLD;

export const COORD_SCALE = 1; // Logic == World now (kept for legacy references)

export const RENDER_SCALE = 1; // Legacy

export const VIRTUAL_WIDTH = ROOM_WORLD_W; 
export const VIRTUAL_HEIGHT = ROOM_WORLD_H; 

export const ACTUAL_SCALE = 1;

// Entity Sizes (in World Pixels)
export const HITBOX_SCALE = 0.65;

export const PLAYER_SPRITE_SIZE = TILE_WORLD; // 64
export const PLAYER_HITBOX_SIZE = PLAYER_SPRITE_SIZE * HITBOX_SCALE; // ~41.6
export const PLAYER_HITBOX_OFFSET = (PLAYER_SPRITE_SIZE - PLAYER_HITBOX_SIZE) / 2;
export const PLAYER_SIZE = PLAYER_SPRITE_SIZE; // Alias for legacy code
export const PLAYER_HEAD_OFFSET = -TILE_WORLD * 0.8; 

export const ENEMY_SPRITE_SIZE = TILE_WORLD; // 64
export const ENEMY_HITBOX_SIZE = ENEMY_SPRITE_SIZE * HITBOX_SCALE;
export const ENEMY_HITBOX_OFFSET = (ENEMY_SPRITE_SIZE - ENEMY_HITBOX_SIZE) / 2;
export const ENEMY_SIZE = ENEMY_SPRITE_SIZE; // Alias

export const MINIBOSS_SPRITE_SIZE = TILE_WORLD * 1.5; // 96
export const MINIBOSS_HITBOX_SIZE = MINIBOSS_SPRITE_SIZE * HITBOX_SCALE;
export const MINIBOSS_HITBOX_OFFSET = (MINIBOSS_SPRITE_SIZE - MINIBOSS_HITBOX_SIZE) / 2;
export const MINIBOSS_SIZE = MINIBOSS_SPRITE_SIZE; // Alias

export const BOSS_SPRITE_SIZE = TILE_WORLD * 2.5; // 160
export const BOSS_HITBOX_SIZE = BOSS_SPRITE_SIZE * HITBOX_SCALE;
export const BOSS_HITBOX_OFFSET = (BOSS_SPRITE_SIZE - BOSS_HITBOX_SIZE) / 2;
export const BOSS_SIZE = BOSS_SPRITE_SIZE; // Alias

export const PROJECTILE_RADIUS = TILE_WORLD * 0.25; // 16

export const DEBUG_HITBOX = false;

// Movement Physics
export const PLAYER_MAX_SPEED = 400;     // 100 * 4
export const PLAYER_ACCEL = 1600;       // 400 * 4
export const PLAYER_FRICTION = 1600;    // 400 * 4
export const PLAYER_INPUT_DEADZONE = 0.15;
export const PLAYER_STOP_EPS = 8;       // 2 * 4

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
