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
        
        // Return currently equipped item to inventory if any
        if (data.equipment[slot]) {
            const old = data.equipment[slot];
            if (!data.inventory[old.itemId]) data.inventory[old.itemId] = {};
            if (!data.inventory[old.itemId][old.rarity]) data.inventory[old.itemId][old.rarity] = 0;
            data.inventory[old.itemId][old.rarity]++;
        }

        // Remove new item from inventory (1 count)
        if (data.inventory[itemId] && data.inventory[itemId][rarity] > 0) {
            data.inventory[itemId][rarity]--;
            if (data.inventory[itemId][rarity] <= 0) {
                delete data.inventory[itemId][rarity];
            }
            
            // Equip
            data.equipment[slot] = { itemId, rarity };
            this.save(data);
            return true; // Success
        }
        return false; // Failed (not in inventory)
    }

    static unequipItem(slot) {
        const data = this.load();
        if (data.equipment[slot]) {
            const old = data.equipment[slot];
            if (!data.inventory[old.itemId]) data.inventory[old.itemId] = {};
            if (!data.inventory[old.itemId][old.rarity]) data.inventory[old.itemId][old.rarity] = 0;
            data.inventory[old.itemId][old.rarity]++;
            
            data.equipment[slot] = null;
            this.save(data);
            return true;
        }
        return false;
    }

    static getInventory() {
        return this.load().inventory;
    }

    static getEquipment() {
        return this.load().equipment;
    }
}
