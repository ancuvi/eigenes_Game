import { ITEM_DEFINITIONS, RARITY_LEVELS } from './items/itemData.js';

export class Item {
    constructor(x, y, type, width = 20, height = 20) {
        this.x = x;
        this.y = y;
        this.type = type; // itemId for gear, or 'potion_hp', 'next_floor'
        this.width = width;
        this.height = height;
        this.active = true;
        this.rarity = 'grey'; // default
    }

    getStats() {
        const def = ITEM_DEFINITIONS[this.type];
        if (!def) return {};

        const stats = { ...def.baseStats };
        const rarityIdx = RARITY_LEVELS.indexOf(this.rarity);
        
        // Accumulate stats from grey up to current rarity
        for (let i = 1; i <= rarityIdx; i++) {
            const r = RARITY_LEVELS[i];
            const rStats = def.rarityStats[r];
            if (rStats) {
                for (let key in rStats) {
                    if (stats[key]) {
                        stats[key] += rStats[key];
                    } else {
                        stats[key] = rStats[key];
                    }
                }
            }
        }
        return stats;
    }
}
