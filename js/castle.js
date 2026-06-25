/**
 * FREE EMPIRE - Castle Level System
 * Manages keep/castle progression from wooden keep → royal castle
 * Each level expands buildable area, unlocks buildings, changes visuals
 */

export const CASTLE_LEVELS = {
  1: {
    name: 'Wooden Keep',
    desc: 'A rough timber fort. The beginning of your empire.',
    gi: '🪵',
    bodyColor: '#9a7140',
    roofColor: '#5a3c1e',
    gridRadius: 8,        // usable radius from center
    popCapBonus: 5,
    storageBonus: { wood: 400, stone: 200, food: 400 },
    unlocks: ['house', 'woodcutter', 'farm', 'innerwall'],
    cost: {},             // Level 1 is free (starting state)
    buildTime: 0,
    prestigeGain: 0,
  },
  2: {
    name: 'Stone Keep',
    desc: 'Reinforced with stone. Your people take notice.',
    gi: '🏯',
    bodyColor: '#9aa0a8',
    roofColor: '#4a5a7a',
    gridRadius: 9,
    popCapBonus: 10,
    storageBonus: { wood: 600, stone: 600, food: 600 },
    unlocks: ['quarry', 'market', 'storehouse', 'tower'],
    cost: { wood: 300, stone: 200 },
    buildTime: 120,       // 2 minutes
    prestigeGain: 50,
  },
  3: {
    name: 'Fortified Keep',
    desc: 'Towers rise. Enemies think twice before attacking.',
    gi: '🏰',
    bodyColor: '#8a9098',
    roofColor: '#3c5fa0',
    gridRadius: 10,
    popCapBonus: 15,
    storageBonus: { wood: 800, stone: 800, food: 800 },
    unlocks: ['barracks', 'windmill'],
    cost: { wood: 600, stone: 500, gold: 100 },
    buildTime: 300,       // 5 minutes
    prestigeGain: 150,
  },
  4: {
    name: 'Castle',
    desc: 'A true castle. Your banner flies from the highest tower.',
    gi: '⚔️',
    bodyColor: '#788088',
    roofColor: '#2c4890',
    gridRadius: 11,
    popCapBonus: 25,
    storageBonus: { wood: 1200, stone: 1200, food: 1200 },
    unlocks: [],          // Future: research, hero
    cost: { wood: 1200, stone: 1000, gold: 300 },
    buildTime: 900,       // 15 minutes
    prestigeGain: 400,
  },
  5: {
    name: 'Grand Castle',
    desc: 'A grand castle, feared across the realm.',
    gi: '🛡️',
    bodyColor: '#687078',
    roofColor: '#1c3870',
    gridRadius: 11,
    popCapBonus: 40,
    storageBonus: { wood: 2000, stone: 2000, food: 2000 },
    unlocks: [],
    cost: { wood: 2400, stone: 2000, gold: 800 },
    buildTime: 1800,      // 30 minutes
    prestigeGain: 1000,
  },
  6: {
    name: 'Royal Castle',
    desc: 'The Royal Castle. You stand supreme among lords.',
    gi: '👑',
    bodyColor: '#c8a840',
    roofColor: '#8a7020',
    gridRadius: 11,
    popCapBonus: 60,
    storageBonus: { wood: 3500, stone: 3500, food: 3500 },
    unlocks: [],
    cost: { wood: 5000, stone: 4000, gold: 2000 },
    buildTime: 3600,      // 1 hour
    prestigeGain: 3000,
  },
};

export const MAX_CASTLE_LEVEL = 6;

export class CastleSystem {
  /**
   * Get castle level data
   */
  static getLevelData(level) {
    return CASTLE_LEVELS[Math.max(1, Math.min(level, MAX_CASTLE_LEVEL))];
  }

  /**
   * Can the castle be upgraded?
   */
  static canUpgrade(currentLevel) {
    return currentLevel < MAX_CASTLE_LEVEL;
  }

  /**
   * Get upgrade cost for next castle level
   */
  static getUpgradeCost(currentLevel) {
    const next = currentLevel + 1;
    if (next > MAX_CASTLE_LEVEL) return null;
    return CASTLE_LEVELS[next].cost;
  }

  /**
   * Get upgrade time for next castle level (ms)
   */
  static getUpgradeTime(currentLevel) {
    const next = currentLevel + 1;
    if (next > MAX_CASTLE_LEVEL) return 0;
    return CASTLE_LEVELS[next].buildTime * 1000;
  }

  /**
   * Check if a building type is unlocked at given castle level
   */
  static isBuildingUnlocked(buildingType, castleLevel) {
    // Keep itself is always unlocked
    if (buildingType === 'keep') return true;

    for (let lvl = 1; lvl <= castleLevel; lvl++) {
      if (CASTLE_LEVELS[lvl] && CASTLE_LEVELS[lvl].unlocks.includes(buildingType)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all unlocked buildings for a given castle level
   */
  static getUnlockedBuildings(castleLevel) {
    const unlocked = new Set(['keep']);
    for (let lvl = 1; lvl <= castleLevel; lvl++) {
      if (CASTLE_LEVELS[lvl]) {
        for (const b of CASTLE_LEVELS[lvl].unlocks) unlocked.add(b);
      }
    }
    return [...unlocked];
  }

  /**
   * Get total storage bonus from castle level
   */
  static getStorageBonus(castleLevel) {
    return CASTLE_LEVELS[castleLevel]?.storageBonus || {};
  }

  /**
   * Get population cap bonus from castle level
   */
  static getPopCapBonus(castleLevel) {
    return CASTLE_LEVELS[castleLevel]?.popCapBonus || 0;
  }
}
