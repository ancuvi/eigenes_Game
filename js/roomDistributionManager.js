export const FLOOR_CONFIG = {
    ROOMS_PER_FLOOR: 8, // ohne Start/Boss
    COMBAT_ROOMS_TARGET: 5,
    FLOORS_PER_STAGE: 10,
    DIFFICULTY_WEIGHTS: {
        EASY: 0.5,
        STANDARD: 0.35,
        HARD: 0.15
    }
};

function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export class RoomDistributionManager {
    constructor() {
        this.stagePlans = {}; // stage -> { treasureFloors: Set, difficultyDeck: [], difficultyIdx: number }
    }

    ensureStagePlan(stage) {
        if (this.stagePlans[stage]) return;

        // Schatzkammern: immer eine, 30% Chance auf eine zweite (andere) Ebene
        const treasureFloors = new Set();
        treasureFloors.add(this.randomFloor());
        if (Math.random() < 0.3) {
            let second = this.randomFloor();
            while (treasureFloors.has(second)) second = this.randomFloor();
            treasureFloors.add(second);
        }

        const difficultyDeck = this.buildDifficultyDeck();
        shuffleInPlace(difficultyDeck);

        this.stagePlans[stage] = {
            treasureFloors,
            difficultyDeck,
            difficultyIdx: 0
        };
    }

    randomFloor() {
        return Math.floor(Math.random() * FLOOR_CONFIG.FLOORS_PER_STAGE) + 1;
    }

    buildDifficultyDeck() {
        const totalCombats = FLOOR_CONFIG.COMBAT_ROOMS_TARGET * FLOOR_CONFIG.FLOORS_PER_STAGE; // 5 * 10 = 50
        const counts = {
            Easy: Math.round(totalCombats * FLOOR_CONFIG.DIFFICULTY_WEIGHTS.EASY),
            Standard: Math.round(totalCombats * FLOOR_CONFIG.DIFFICULTY_WEIGHTS.STANDARD)
        };
        counts.Hard = totalCombats - counts.Easy - counts.Standard;

        const deck = [];
        for (let i = 0; i < counts.Easy; i++) deck.push('Easy');
        for (let i = 0; i < counts.Standard; i++) deck.push('Standard');
        for (let i = 0; i < counts.Hard; i++) deck.push('Hard');
        return deck;
    }

    drawDifficulty(stage) {
        this.ensureStagePlan(stage);
        const plan = this.stagePlans[stage];
        const { difficultyDeck } = plan;
        if (difficultyDeck.length === 0) return 'Standard';
        const idx = plan.difficultyIdx % difficultyDeck.length;
        const diff = difficultyDeck[idx];
        plan.difficultyIdx = idx + 1;
        return diff;
    }

    generateFloorRoomTypes(stage, floor) {
        this.ensureStagePlan(stage);
        const plan = this.stagePlans[stage];
        const hasTreasure = plan.treasureFloors.has(floor);

        const pool = [];
        for (let i = 0; i < FLOOR_CONFIG.COMBAT_ROOMS_TARGET; i++) {
            pool.push({ type: 'Combat' });
        }
        pool.push({ type: hasTreasure ? 'Treasure' : 'Event' });
        pool.push({ type: 'Event' });
        pool.push({ type: 'Empty' });

        shuffleInPlace(pool);
        return pool;
    }
}
