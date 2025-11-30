export class SaveManager {
    static load() {
        const data = localStorage.getItem('slime_game_save');
        if (data) {
            return JSON.parse(data);
        }
        return this.getDefaultSave();
    }

    static save(data) {
        localStorage.setItem('slime_game_save', JSON.stringify(data));
    }

    static getDefaultSave() {
        return {
            inventory: {
                'sellsword_sword': { 'grey': 1 } // Starter Weapon
            }, 
            equipment: {
                weapon: { itemId: 'sellsword_sword', rarity: 'grey' },
                armor: null,
                helmet: null,
                accessory: null
            },
            unlockedStages: 1,
            gold: 0
        };
    }

    static addItem(itemId, rarity) {
        const data = this.load();
        if (!data.inventory[itemId]) {
            data.inventory[itemId] = {};
        }
        if (!data.inventory[itemId][rarity]) {
            data.inventory[itemId][rarity] = 0;
        }
        data.inventory[itemId][rarity]++;
        this.save(data);
    }

    static removeItem(itemId, rarity, count = 1) {
        const data = this.load();
        if (data.inventory[itemId] && data.inventory[itemId][rarity]) {
            data.inventory[itemId][rarity] -= count;
            if (data.inventory[itemId][rarity] <= 0) {
                delete data.inventory[itemId][rarity];
            }
            this.save(data);
            return true;
        }
        return false;
    }

    static equipItem(slot, itemId, rarity) {
        const data = this.load();
        data.equipment[slot] = { itemId, rarity };
        this.save(data);
    }

    static getInventory() {
        return this.load().inventory;
    }

    static getEquipment() {
        return this.load().equipment;
    }
}
