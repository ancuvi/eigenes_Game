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
 * Stößt ein Ziel von einer Quelle weg.
 * @param {object} target {x, y, width, height}
 * @param {object} source {x, y, width, height}
 * @param {number} force Pixel die geschoben werden
 */
export function pushBack(target, source, force) {
    const tx = target.x + target.width / 2;
    const ty = target.y + target.height / 2;
    const sx = source.x + source.width / 2;
    const sy = source.y + source.height / 2;
    const angle = Math.atan2(ty - sy, tx - sx);
    target.x += Math.cos(angle) * force;
    target.y += Math.sin(angle) * force;
}
