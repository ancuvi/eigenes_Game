export class Item {
    constructor(x, y, type, width = 20, height = 20) {
        this.x = x;
        this.y = y;
        this.type = type; // 'weapon_sword', 'weapon_wand', 'potion_hp', 'next_floor'
        this.width = width;
        this.height = height;
        this.active = true;
    }
}
