// Hilfsfunktionen für das Spiel

/**
 * Erzeugt eine Zufallszahl zwischen min und max (inklusive).
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Formatiert große Zahlen für bessere Lesbarkeit (z.B. 1000 -> 1k).
 * @param {number} num 
 * @returns {string}
 */
export function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return Math.floor(num).toString();
}

/**
 * Verzögerung für asynchrone Operationen.
 * @param {number} ms Millisekunden
 * @returns {Promise}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Berechnet die Distanz zwischen zwei Punkten.
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
export function getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Überprüft Kollision zwischen zwei Rechtecken (AABB).
 * @param {object} rect1 {x, y, width, height}
 * @param {object} rect2 {x, y, width, height}
 * @returns {boolean}
 */
export function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// Autotile: 8-Way-Neighbor-Check für Wände/Void/etc.
// wallLikeIds: Set oder Array der IDs, die als "wandartig" gelten
export function getWallNeighborMask(grid, row, col, wallLikeIds) {
    const rows = grid.length;
    const cols = grid[0].length;
    const isWallish = (r, c) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
        return wallLikeIds.has ? wallLikeIds.has(grid[r][c]) : wallLikeIds.includes(grid[r][c]);
    };

    const mask = {
        up: isWallish(row - 1, col),
        down: isWallish(row + 1, col),
        left: isWallish(row, col - 1),
        right: isWallish(row, col + 1),
        upLeft: isWallish(row - 1, col - 1),
        upRight: isWallish(row - 1, col + 1),
        downLeft: isWallish(row + 1, col - 1),
        downRight: isWallish(row + 1, col + 1)
    };

    return mask;
}

/**
 * Überprüft ob ein Punkt in einem Rechteck liegt.
 * @param {number} px Punkt X
 * @param {number} py Punkt Y
 * @param {object} rect {x, y, width, height}
 * @returns {boolean}
 */
export function isPointInRect(px, py, rect) {
    return (
        px >= rect.x &&
        px <= rect.x + rect.width &&
        py >= rect.y &&
        py <= rect.y + rect.height
    );
}

/**
 * Stößt ein Ziel von einer Quelle weg (Velocity-basiert).
 * @param {object} target Entity mit Velocity-Support (vel oder vx/vy)
 * @param {object} source {x, y, width, height}
 * @param {number} force Stärke des Stoßes (wird in Geschwindigkeit umgerechnet)
 * @param {object} bounds Veraltet, wird ignoriert da Collision Logic das übernimmt
 */
export function pushBack(target, source, force, bounds = null) {
    const tx = target.x + target.width / 2;
    const ty = target.y + target.height / 2;
    const sx = source.x + source.width / 2;
    const sy = source.y + source.height / 2;
    
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
    const dirX = dx / len;
    const dirY = dy / len;

    // Umrechnung von "Teleport-Pixeln" in "Geschwindigkeit"
    // Heuristik: Pixel * 5 entspricht etwa der Initialgeschwindigkeit für ähnliche Distanz
    const power = force * 6; 

    // Case 1: Enemy (hat vel object und knockbackTimer)
    if (target.vel && typeof target.knockbackTimer === 'number') {
        target.vel.x = dirX * power;
        target.vel.y = dirY * power;
        target.knockbackTimer = 0.2; // 200ms Rückstoß
    }
    // Case 2: Player (hat vx, vy und nutzt Friction im Update)
    else if (typeof target.vx === 'number' && typeof target.vy === 'number') {
        target.vx += dirX * power;
        target.vy += dirY * power;
        // Player braucht keinen Timer, da seine Physik engine friction anwendet
    }
    // Fallback: Teleport (falls Entity keine Physik hat)
    else {
        target.x += dirX * force;
        target.y += dirY * force;
    }
}

/**
 * Bewegt einen Wert in Richtung Zielwert um maxDelta.
 */
export function approach(current, target, maxDelta) {
    if (Math.abs(target - current) <= maxDelta) {
        return target;
    }
    return current + Math.sign(target - current) * maxDelta;
}

/**
 * Begrenzt die Länge eines Vektors auf maxLen.
 * @returns {object} {x, y}
 */
export function clampLength(x, y, maxLen) {
    const lenSq = x*x + y*y;
    if (lenSq > maxLen * maxLen && lenSq > 0) {
        const len = Math.sqrt(lenSq);
        return { x: (x / len) * maxLen, y: (y / len) * maxLen };
    }
    return { x, y };
}
