export class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'weapon_sword', 'weapon_wand', 'potion_hp'
        this.width = 20;
        this.height = 20;
        this.active = true;
    }
}
