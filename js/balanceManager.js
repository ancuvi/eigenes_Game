// BalanceManager: Zentrale Konfiguration und Berechnungslogik für das Spiel

export const CONSTANTS = {
    FLOORS_PER_STAGE: 10,
    ROOMS_PER_FLOOR: 8,
    COMBAT_ROOM_RATIO: 0.6,
    
    // Room Weights (Enemy Count per Room)
    ROOM_WEIGHTS: {
        EASY: 0.5,      // 2 Enemies
        STANDARD: 0.35, // 3 Enemies
        HARD: 0.15      // 4 Enemies
    },
    ENEMY_COUNTS: {
        EASY: 2,
        STANDARD: 3,
        HARD: 4
    },

    // Enemy Base Stats
    BASE_ENEMY_HP: 20,
    HP_STAGE_FACTOR: 0.5, // +50% per Stage
    HP_FLOOR_FACTOR: 0.1, // +10% per Floor
    
    BASE_ENEMY_DMG: 5,
    DMG_STAGE_FACTOR: 0.4, // +40% per Stage
    DMG_FLOOR_FACTOR: 0.08, // +8% per Floor
    
    // Boss Multipliers
    MINIBOSS_HP_MULT: 4.0,
    MINIBOSS_DMG_MULT: 1.8,
    BOSS_HP_MULT: 8.0,
    BOSS_DMG_MULT: 2.5,
    
    // Loot Config
    DROP_CHANCE_GLOBAL: 0.35,
    LOOT_WEIGHTS: {
        GOLD: 0.8,
        MATS: 0.15,
        GEAR: 0.05
    },
    // Gold Values (Avg)
    GOLD_AVG: {
        NORMAL: 3,
        MINIBOSS: 5,
        BOSS: 60
    }
};

// Loot Tabellen (Wahrscheinlichkeiten 0.0 - 1.0)
// Format: { grey, green, blue, purple, gold }
const LOOT_TABLES = {
    NORMAL: [
        { stage: 1, weights: { grey: 0.80, green: 0.18, blue: 0.02, purple: 0.00, gold: 0.00 } },
        { stage: 2, weights: { grey: 0.65, green: 0.25, blue: 0.08, purple: 0.02, gold: 0.00 } },
        { stage: 3, weights: { grey: 0.50, green: 0.30, blue: 0.12, purple: 0.06, gold: 0.02 } },
        { stage: 4, weights: { grey: 0.40, green: 0.35, blue: 0.15, purple: 0.08, gold: 0.02 } },
        { stage: 5, weights: { grey: 0.30, green: 0.40, blue: 0.20, purple: 0.08, gold: 0.02 } }
    ],
    MINIBOSS: [
        { stage: 1, weights: { grey: 0.00, green: 0.70, blue: 0.25, purple: 0.05, gold: 0.00 } },
        { stage: 2, weights: { grey: 0.00, green: 0.60, blue: 0.30, purple: 0.10, gold: 0.00 } },
        { stage: 3, weights: { grey: 0.00, green: 0.50, blue: 0.35, purple: 0.15, gold: 0.00 } },
        { stage: 4, weights: { grey: 0.00, green: 0.40, blue: 0.40, purple: 0.20, gold: 0.00 } },
        { stage: 5, weights: { grey: 0.00, green: 0.30, blue: 0.45, purple: 0.25, gold: 0.00 } }
    ],
    BOSS: [
        { stage: 1, weights: { grey: 0.00, green: 0.50, blue: 0.40, purple: 0.10, gold: 0.00 } },
        { stage: 2, weights: { grey: 0.00, green: 0.40, blue: 0.45, purple: 0.15, gold: 0.00 } },
        { stage: 3, weights: { grey: 0.00, green: 0.30, blue: 0.50, purple: 0.18, gold: 0.02 } },
        { stage: 4, weights: { grey: 0.00, green: 0.20, blue: 0.50, purple: 0.25, gold: 0.05 } },
        { stage: 5, weights: { grey: 0.00, green: 0.10, blue: 0.50, purple: 0.30, gold: 0.10 } }
    ],
    TREASURE: [
        // Treasure Chests (Updated from Tabelle4)
        // Grey calculated as remainder to 1.0
        { stage: 1, weights: { grey: 0.40, green: 0.40, blue: 0.18, purple: 0.02, gold: 0.00 } },
        { stage: 2, weights: { grey: 0.35, green: 0.35, blue: 0.25, purple: 0.05, gold: 0.00 } },
        { stage: 3, weights: { grey: 0.32, green: 0.30, blue: 0.30, purple: 0.08, gold: 0.00 } },
        { stage: 4, weights: { grey: 0.30, green: 0.25, blue: 0.35, purple: 0.10, gold: 0.00 } },
        { stage: 5, weights: { grey: 0.25, green: 0.20, blue: 0.40, purple: 0.15, gold: 0.00 } }
    ]
};

export class BalanceManager {
    
    /**
     * Berechnet HP und Damage für einen Gegner.
     */
    static getEnemyStats(stage, floor, isMiniboss, isBoss) {
        const sIdx = Math.max(0, stage - 1);
        const fIdx = Math.max(0, floor - 1);

        let hp = CONSTANTS.BASE_ENEMY_HP * 
                 (1 + CONSTANTS.HP_STAGE_FACTOR * sIdx) * 
                 (1 + CONSTANTS.HP_FLOOR_FACTOR * fIdx);

        // Reverse-Engineered Formula from Spreadsheet:
        // DMG scales with HP, FloorFactor, and half of StageFactor
        // DMG = (HP / 4) * (1 + DMG_FLOOR * f) * (1 + DMG_STAGE/2 * s)
        let dmg = (hp / 4) * 
                  (1 + CONSTANTS.DMG_FLOOR_FACTOR * fIdx) * 
                  (1 + (CONSTANTS.DMG_STAGE_FACTOR * 0.5) * sIdx);

        if (isBoss) {
            hp *= CONSTANTS.BOSS_HP_MULT;
            dmg *= CONSTANTS.BOSS_DMG_MULT;
        } else if (isMiniboss) {
            hp *= CONSTANTS.MINIBOSS_HP_MULT;
            dmg *= CONSTANTS.MINIBOSS_DMG_MULT;
        }

        return {
            hp: Math.floor(hp),
            damage: Math.floor(dmg)
        };
    }

    /**
     * Bestimmt den Loot-Drop.
     * @param {number} stage Aktuelle Stage (1-5)
     * @param {string} enemyRank 'normal', 'miniboss', 'boss', 'treasure'
     * @returns {object|null} Loot Objekt { type: 'gold'|'mats'|'gear', value?, rarity? } oder null
     */
    static rollLoot(stage, enemyRank = 'normal') {
        const isBoss = (enemyRank === 'boss' || enemyRank === 'miniboss' || enemyRank === 'treasure');
        
        // 1. Drop Chance Check (Boss/Treasure immer, sonst 35%)
        if (!isBoss && Math.random() > CONSTANTS.DROP_CHANCE_GLOBAL) {
            return null;
        }

        // Special Case: Treasure Chest -> Always Gear
        if (enemyRank === 'treasure') {
            const rarity = this.rollRarity(stage, enemyRank);
            return { type: 'gear', rarity: rarity };
        }

        // 2. Loot Typ bestimmen
        const randType = Math.random();
        
        if (randType < CONSTANTS.LOOT_WEIGHTS.GOLD) {
            // Gold Drop
            let avg = CONSTANTS.GOLD_AVG.NORMAL;
            if (enemyRank === 'miniboss') avg = CONSTANTS.GOLD_AVG.MINIBOSS;
            if (enemyRank === 'boss') avg = CONSTANTS.GOLD_AVG.BOSS;
            
            // Varianz +/- 20%
            const min = Math.floor(avg * 0.8);
            const max = Math.ceil(avg * 1.2);
            const amount = Math.floor(Math.random() * (max - min + 1)) + min;
            
            return { type: 'gold', value: amount };
        } else if (randType < CONSTANTS.LOOT_WEIGHTS.GOLD + CONSTANTS.LOOT_WEIGHTS.MATS) {
            // Material Drop
            return { type: 'material', value: 1 };
        } else {
            // Gear Drop -> Rarity bestimmen
            const rarity = this.rollRarity(stage, enemyRank);
            return { type: 'gear', rarity: rarity };
        }
    }

    static rollRarity(stage, enemyRank) {
        let tableKey = 'NORMAL';
        if (enemyRank === 'miniboss') tableKey = 'MINIBOSS';
        if (enemyRank === 'boss') tableKey = 'BOSS';
        if (enemyRank === 'treasure') tableKey = 'TREASURE';

        const tableList = LOOT_TABLES[tableKey] || LOOT_TABLES.NORMAL;
        const sIdx = Math.min(Math.max(0, stage - 1), tableList.length - 1);
        const weights = tableList[sIdx].weights;

        const rand = Math.random();
        let sum = 0;
        
        const rarities = ['grey', 'green', 'blue', 'purple', 'gold', 'red'];
        
        for (let r of rarities) {
            if (weights[r]) {
                sum += weights[r];
                if (rand <= sum) return r;
            }
        }
        return 'grey'; 
    }
    
    /**
     * Wählt Anzahl der Gegner pro Raum basierend auf Gewichtung.
     */
    static pickEnemyCount() {
        const rand = Math.random();
        // Easy 0.5, Standard 0.35, Hard 0.15
        if (rand < CONSTANTS.ROOM_WEIGHTS.EASY) return CONSTANTS.ENEMY_COUNTS.EASY;
        if (rand < CONSTANTS.ROOM_WEIGHTS.EASY + CONSTANTS.ROOM_WEIGHTS.STANDARD) return CONSTANTS.ENEMY_COUNTS.STANDARD;
        return CONSTANTS.ENEMY_COUNTS.HARD;
    }
}
