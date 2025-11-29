export class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
    }

    update(player, roomWidth, roomHeight) {
        // Ziel: Spieler zentrieren
        // targetX = player.x + player.width/2 - this.width/2
        // targetY = player.y + player.height/2 - this.height/2
        
        let targetX = player.x + player.width / 2 - this.width / 2;
        let targetY = player.y + player.height / 2 - this.height / 2;

        // Clamping
        // Min: 0
        // Max: roomWidth - this.width
        
        // Wenn der Raum kleiner als Canvas ist, zentrieren wir den Raum im Canvas
        if (roomWidth <= this.width) {
            targetX = -(this.width - roomWidth) / 2;
        } else {
            targetX = Math.max(0, Math.min(targetX, roomWidth - this.width));
        }

        if (roomHeight <= this.height) {
            targetY = -(this.height - roomHeight) / 2;
        } else {
            targetY = Math.max(0, Math.min(targetY, roomHeight - this.height));
        }

        this.x = targetX;
        this.y = targetY;
    }
}
