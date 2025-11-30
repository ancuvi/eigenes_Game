export const RARITY_LEVELS = ['grey', 'green', 'blue', 'purple', 'gold', 'red'];

export const ITEM_SETS = {
    CASTER: {
        id: 'caster_set',
        name: 'Caster Set',
        items: ['meteor_staff', 'magic_robe', 'magic_hat', 'ring_of_wisdom'],
        bonuses: {
            2: {
                description: "Cooldown of active skills is additionally reduced by 40%",
                statMod: { cooldownReduction: 0.40 }
            },
            4: {
                description: "Damage-dealing skills increase final damage by 200%. Crowd control skills increase control effect by 20%",
                statMod: { finalDamageMultiplier: 2.0, controlEffectiveness: 0.20 }
            }
        }
    },
    ARCHER: {
        id: 'archer_set',
        name: 'Archer Set',
        items: ['archer_bow', 'archer_cloak', 'archer_headring', 'archer_bracelet'],
        bonuses: {
            2: {
                description: "The longer the attack range, the higher the final damage (up to 20%)",
                statMod: { distanceDamageBonus: 0.20 }
            },
            4: {
                description: "Multi Attack has a 10% chance to lock onto the same target for attack (up to 10 attacks)",
                statMod: { multiAttackFocusChance: 0.10 }
            }
        }
    },
    SELLSWORD: {
        id: 'sellsword_set',
        name: "Sellsword's Set",
        items: ['sellsword_sword', 'sellsword_armor', 'sellsword_helmet', 'sellsword_talisman'],
        bonuses: {
            2: {
                description: "Gold bonus in battle +5%",
                statMod: { goldMultiplier: 0.05 }
            },
            4: {
                description: "After killing an enemy, there is a 4% chance to increase final damage by 1% (up to 50%)",
                specialEffect: 'sellsword_kill_stack'
            }
        }
    },
    BARBARIAN: {
        id: 'barbarian_set',
        name: "Barbarian Set",
        items: ['barbarian_axe', 'barbarian_armor', 'barbarian_horned_helmet', 'wolf_fang_necklace'],
        bonuses: {
            2: {
                description: "For every 4 attacks received, gain 1 stack of Perseverance (up to 5, +5% dmg reduction each) for 10s",
                specialEffect: 'barbarian_perseverance'
            },
            4: {
                description: "When Perseverance reaches full stacks, gain a 30% ATK bonus",
                specialEffect: 'barbarian_rage'
            }
        }
    },
    HUNTER: {
        id: 'hunter_set',
        name: "Hunter Set",
        items: ['hunter_sword', 'hunter_armor', 'hunter_helmet', 'hunter_talisman'],
        bonuses: {
            2: {
                description: "Equipped gears ATK & HP get an additional 100% bonus",
                specialEffect: 'hunter_gear_mastery'
            },
            4: {
                description: "Damage dealt by Allies Talents increased by 50%, and allies HP increased by 50%",
                statMod: { allyDamageMultiplier: 0.50, allyHpMultiplier: 0.50 } // Interpreted as Player buff for now
            }
        }
    },
    ASSASSIN: {
        id: 'assassin_set',
        name: "Assassin Set",
        items: ['assassin_dagger', 'assassin_cloak', 'assassin_hood', 'assassin_amulet'],
        bonuses: {
            2: {
                description: "For each enemy attack dodged, damage increases by 5% for 10s (stackable up to 5 times)",
                specialEffect: 'assassin_dodge_buff'
            },
            4: {
                description: "When triggering a critical hit, 30% chance to increase final damage by 60%",
                specialEffect: 'assassin_lethal_crit'
            }
        }
    }
};

export const ITEM_DEFINITIONS = {
    // CASTER SET
    meteor_staff: {
        id: 'meteor_staff',
        name: 'Meteor Staff',
        type: 'weapon',
        set: 'CASTER',
        baseStats: { attackPower: 15, range: 300, weaponType: 'wand' }, 
        rarityStats: {
            green: { attackPowerPercent: 0.10 },
            blue: { splashChance: 0.05 },
            purple: { attackPowerPercent: 0.20 },
            gold: { splashChance: 0.10 },
            red: { splashTargets: 1 }
        }
    },
    magic_robe: {
        id: 'magic_robe',
        name: 'Magic Robe',
        type: 'armor',
        set: 'CASTER',
        baseStats: { hp: 20 },
        rarityStats: {
            green: { hpPercent: 0.10 },
            blue: { shieldHpPercent: 1.00 }, // +100%
            purple: { hpPercent: 0.20 },
            gold: { shieldSpawnTimeReduction: 0.30 },
            red: { lifeSteal: 0.10 }
        }
    },
    magic_hat: {
        id: 'magic_hat',
        name: 'Magic Hat',
        type: 'helmet',
        set: 'CASTER',
        baseStats: { attackPower: 5 },
        rarityStats: {
            green: { attackPowerPercent: 0.05 },
            blue: { attackRangePercent: 0.05 },
            purple: { attackPowerPercent: 0.10 },
            gold: { attackRangePercent: 0.10 },
            red: { critDamageBonus: 0.50 }
        }
    },
    ring_of_wisdom: {
        id: 'ring_of_wisdom',
        name: 'Ring of Wisdom',
        type: 'accessory',
        set: 'CASTER',
        baseStats: { hp: 10 },
        rarityStats: {
            green: { hpPercent: 0.05 },
            blue: { coinBonusPer50Kills: 10 },
            purple: { hpPercent: 0.10 },
            gold: { goldBonusPerWave: 10 },
            red: { shopDiscount: 0.05 }
        }
    },

    // ARCHER SET
    archer_bow: {
        id: 'archer_bow',
        name: "Archer's Bow",
        type: 'weapon',
        set: 'ARCHER',
        baseStats: { attackPower: 12, range: 400, weaponType: 'bow' },
        rarityStats: {
            green: { attackPowerPercent: 0.10 },
            blue: { attackSpeedPercent: 0.10 },
            purple: { attackPowerPercent: 0.20 },
            gold: { attackSpeedPercent: 0.20 },
            red: { attackRangePercent: 0.15 }
        }
    },
    archer_cloak: {
        id: 'archer_cloak',
        name: "Archer's Cloak",
        type: 'armor',
        set: 'ARCHER',
        baseStats: { hp: 15 },
        rarityStats: {
            green: { hpPercent: 0.10 },
            blue: { damageResistance: 0.10 },
            purple: { hpPercent: 0.20 },
            gold: { shieldHpPercent: 1.50 },
            red: { dodgeChance: 0.20 }
        }
    },
    archer_headring: {
        id: 'archer_headring',
        name: "Archer's Headring",
        type: 'helmet',
        set: 'ARCHER',
        baseStats: { attackPower: 5 },
        rarityStats: {
            green: { attackPowerPercent: 0.05 },
            blue: { multiAttackChance: 0.10 },
            purple: { attackPowerPercent: 0.10 },
            gold: { multiAttackChance: 0.10 },
            red: { multiAttackTargets: 1 }
        }
    },
    archer_bracelet: {
        id: 'archer_bracelet',
        name: "Archer's Bracelet",
        type: 'accessory',
        set: 'ARCHER',
        baseStats: { hp: 10 },
        rarityStats: {
            green: { hpPercent: 0.05 },
            blue: { coinBonusPer50Kills: 10 },
            purple: { hpPercent: 0.10 },
            gold: { goldBonusPer100Kills: 10 },
            red: { rangeDamagePercent: 0.50 }
        }
    },

    // SELLSWORD SET
    sellsword_sword: {
        id: 'sellsword_sword',
        name: "Sellsword's Sword",
        type: 'weapon',
        set: 'SELLSWORD',
        baseStats: { attackPower: 12, weaponType: 'sword' }, // Assuming sword type
        rarityStats: {
            green: { attackPowerPercent: 0.10 },
            blue: { critChance: 0.10 },
            purple: { attackPowerPercent: 0.20 },
            gold: { critDamageBonus: 0.40 },
            red: { lifeSteal: 0.10 }
        }
    },
    sellsword_armor: {
        id: 'sellsword_armor',
        name: "Sellsword's Armor",
        type: 'armor',
        set: 'SELLSWORD',
        baseStats: { hp: 20 },
        rarityStats: {
            green: { hpPercent: 0.10 },
            blue: { hpRegenPercent: 0.50 }, // +50% Regen
            purple: { hpPercent: 0.20 },
            gold: { shieldHpPercent: 1.50 },
            red: { damageResistance: 0.20 }
        }
    },
    sellsword_helmet: {
        id: 'sellsword_helmet',
        name: "Sellsword's Helmet",
        type: 'helmet',
        set: 'SELLSWORD',
        baseStats: { attackPower: 5 },
        rarityStats: {
            green: { attackPowerPercent: 0.05 },
            blue: { slowChance: 0.05 },
            purple: { attackPowerPercent: 0.10 },
            gold: { slowStrength: 0.20 },
            red: { attackSpeedPercent: 0.30 }
        }
    },
    sellsword_talisman: {
        id: 'sellsword_talisman',
        name: "Sellsword's Talisman",
        type: 'accessory',
        set: 'SELLSWORD',
        baseStats: { hp: 10 },
        rarityStats: {
            green: { hpPercent: 0.05 },
            blue: { goldBonusPerWave: 10 },
            purple: { hpPercent: 0.10 },
            gold: { goldBonusPer100Kills: 10 },
            red: { goldBonusBossKilled: 50 }
        }
    },

    // BARBARIAN SET
    barbarian_axe: {
        id: 'barbarian_axe',
        name: "Barbarian's Axe",
        type: 'weapon',
        set: 'BARBARIAN',
        baseStats: { attackPower: 14, weaponType: 'sword' }, // Axe acts as melee (sword)
        rarityStats: {
            green: { attackPowerPercent: 0.10 },
            blue: { stunChance: 0.10 },
            purple: { attackPowerPercent: 0.20 },
            gold: { stunDuration: 0.5 },
            red: { knockbackChance: 0.10 }
        }
    },
    barbarian_armor: {
        id: 'barbarian_armor',
        name: "Barbarian's Armor",
        type: 'armor',
        set: 'BARBARIAN',
        baseStats: { hp: 25 },
        rarityStats: {
            green: { hpPercent: 0.10 },
            blue: { damageResistance: 0.10 },
            purple: { hpPercent: 0.20 },
            gold: { damageReturnMultiplier: 0.40 },
            red: { damageResistance: 0.20 }
        }
    },
    barbarian_horned_helmet: {
        id: 'barbarian_horned_helmet',
        name: "Barbarian's Horned Helmet",
        type: 'helmet',
        set: 'BARBARIAN',
        baseStats: { attackPower: 6 },
        rarityStats: {
            green: { attackPowerPercent: 0.05 },
            blue: { attackSpeedPercent: 0.10 },
            purple: { attackPowerPercent: 0.10 },
            gold: { attackSpeedPercent: 0.20 },
            red: { critDamageBonus: 0.50 }
        }
    },
    wolf_fang_necklace: {
        id: 'wolf_fang_necklace',
        name: "Wolf Fang Necklace",
        type: 'accessory',
        set: 'BARBARIAN',
        baseStats: { hp: 10 },
        rarityStats: {
            green: { hpPercent: 0.05 },
            blue: { coinBonusPer50Kills: 10 },
            purple: { hpPercent: 0.10 },
            gold: { goldBonusPer100Kills: 10 },
            red: { goldBonusBossKilled: 50 }
        }
    },

    // HUNTER SET
    hunter_sword: {
        id: 'hunter_sword',
        name: "Best Sword in the Village",
        type: 'weapon',
        set: 'HUNTER',
        baseStats: { attackPower: 13, weaponType: 'sword' },
        rarityStats: {
            green: { attackPowerPercent: 0.10 },
            blue: { slowChance: 0.10 },
            purple: { attackPowerPercent: 0.20 },
            gold: { slowStrength: 0.20 },
            red: { lifeSteal: 0.10 }
        }
    },
    hunter_armor: {
        id: 'hunter_armor',
        name: "Hunter's Armor",
        type: 'armor',
        set: 'HUNTER',
        baseStats: { hp: 18 },
        rarityStats: {
            green: { hpPercent: 0.10 },
            blue: { dodgeChance: 0.10 },
            purple: { hpPercent: 0.20 },
            gold: { dodgeChance: 0.10 },
            red: { damageResistance: 0.20 }
        }
    },
    hunter_helmet: {
        id: 'hunter_helmet',
        name: "Hunter's Helmet",
        type: 'helmet',
        set: 'HUNTER',
        baseStats: { attackPower: 4 },
        rarityStats: {
            green: { attackPowerPercent: 0.05 },
            blue: { doubleStrikeChance: 0.20 },
            purple: { attackPowerPercent: 0.10 },
            gold: { doubleStrikeDamageMultiplier: 0.30 },
            red: { attackRangePercent: 0.15 }
        }
    },
    hunter_talisman: {
        id: 'hunter_talisman',
        name: "Hunter's Talisman",
        type: 'accessory',
        set: 'HUNTER',
        baseStats: { hp: 12 },
        rarityStats: {
            green: { hpPercent: 0.05 },
            blue: { goldBonusPerWave: 10 },
            purple: { hpPercent: 0.10 },
            gold: { goldBonusPerWave: 10 },
            red: { hpRegenPercent: 1.00 } // +100% Regen
        }
    },

    // ASSASSIN SET
    assassin_dagger: {
        id: 'assassin_dagger',
        name: "Assassin's Dagger",
        type: 'weapon',
        set: 'ASSASSIN',
        baseStats: { attackPower: 11, weaponType: 'sword' }, // Dagger = Fast Sword
        rarityStats: {
            green: { attackPowerPercent: 0.10 },
            blue: { critChance: 0.10 },
            purple: { attackPowerPercent: 0.20 },
            gold: { critChance: 0.20 },
            red: { critDamageBonus: 0.80 }
        }
    },
    assassin_cloak: {
        id: 'assassin_cloak',
        name: "Assassin's Cloak",
        type: 'armor',
        set: 'ASSASSIN',
        baseStats: { hp: 15 },
        rarityStats: {
            green: { hpPercent: 0.10 },
            blue: { dodgeChance: 0.10 },
            purple: { hpPercent: 0.20 },
            gold: { dodgeChance: 0.20 },
            red: { lifeSteal: 0.10 }
        }
    },
    assassin_hood: {
        id: 'assassin_hood',
        name: "Assassin's Hood",
        type: 'helmet',
        set: 'ASSASSIN',
        baseStats: { attackPower: 6 },
        rarityStats: {
            green: { attackPowerPercent: 0.05 },
            blue: { deadHitChance: 0.03 }, // 3%
            purple: { attackPowerPercent: 0.10 },
            gold: { deadHitChance: 0.05 }, // +5% -> Total 8%? Or replace? Usually accumulate. 8% total.
            red: { attackSpeedPercent: 0.30 }
        }
    },
    assassin_amulet: {
        id: 'assassin_amulet',
        name: "Assassin's Amulet",
        type: 'accessory',
        set: 'ASSASSIN',
        baseStats: { hp: 10 },
        rarityStats: {
            green: { hpPercent: 0.05 },
            blue: { goldBonusPerWave: 10 },
            purple: { hpPercent: 0.10 },
            gold: { coinBonusPer50Kills: 20 },
            red: { goldBonusBossKilled: 50 }
        }
    }
};
