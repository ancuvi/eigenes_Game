export const TILE_SIZE = 16;
export const RENDER_SCALE = 1; // Skaliert 16px Tiles auf VIRTUAL Pixels (1:1 wenn VIRTUAL_WIDTH klein ist)

export const ROOM_TILES_W = 15;
export const ROOM_TILES_H = 9;

export const VIRTUAL_WIDTH = ROOM_TILES_W * TILE_SIZE; // 240
export const VIRTUAL_HEIGHT = ROOM_TILES_H * TILE_SIZE; // 144

export let ACTUAL_SCALE = 1; 
export function setActualScale(s) { ACTUAL_SCALE = s; }

// Entity Sizes (in World Pixels)
export const PLAYER_SIZE = 16;
export const PLAYER_SPRITE_SIZE = 16;
export const PLAYER_HITBOX_SIZE = 12;
export const PLAYER_HITBOX_OFFSET = (PLAYER_SPRITE_SIZE - PLAYER_HITBOX_SIZE) / 2;
export const PLAYER_HEAD_OFFSET = -14; // Verschiebung des Kopfes nach oben (negativ) oder unten (positiv)

export const ENEMY_SIZE = 16;
export const MINIBOSS_SIZE = 24;
export const BOSS_SIZE = 40;

export const DEBUG_HITBOX = false;

// Movement Physics
export const PLAYER_MAX_SPEED = 100;     // Wie schnell der Charakter maximal läuft
export const PLAYER_ACCEL = 400;       // Wie schnell er auf Höchstgeschwindigkeit kommt (Beschleunigung)
export const PLAYER_FRICTION = 400;    // Wie schnell er bremst, wenn man loslässt (Reibung)
export const PLAYER_INPUT_DEADZONE = 0.15; // Ignoriert leichte Stick-Bewegungen (Deadzone)
export const PLAYER_STOP_EPS = 2;       // Ab welcher Geschwindigkeit er sofort stoppt (verhindert Rutschen)

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
