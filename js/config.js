/**
 * FREE EMPIRE - Configuration & Constants
 * Game balance, building definitions, costs, production rates
 */

// Canvas & Display
export const TILE_W = 64;
export const TILE_H = 32;
export const GRID = 22;
export const MARGIN = 9;

// Timing
export const TICK_MS = 1000;  // Game tick every second
export const SAVE_KEY = 'free_empire_save_v4';  // v4 for new timer system

// Castle Grid
export const GATE = { x: Math.floor(GRID / 2), y: GRID - 1 };

// Playable radius per castle level (Chebyshev distance from keep center)
// Castle starts tiny (lvl1 = 4 tiles out from center) and grows with upgrades
export const CASTLE_RADIUS = {
  1: 4,   // 9x9 area — Wooden Keep
  2: 5,   // 11x11 — Stone Keep
  3: 6,   // 13x13 — Fortified Keep
  4: 7,   // 15x15 — Castle
  5: 8,   // 17x17 — Grand Castle
  6: 9,   // 19x19 — Royal Castle (nearly full grid)
};

/**
 * BUILDING DEFINITIONS with LEVELS
 * Each building can be upgraded to level 1-20
 * Costs and production scale with level
 */
export const BUILDINGS = {
  keep: {
    name: 'Keep',
    shape: 'keep',
    gi: '🏰',
    h: 54,
    body: '#9aa0a8',
    roof: '#3c5fa0',
    maxLevel: 1,  // Keep is not upgradeable in Phase 1
    caps: { wood: 600, stone: 600, food: 600 },
    popCap: 6,
    unique: true,
    desc: 'Your stronghold. Storage & people. Cannot be demolished.',
    buildTime: 0,  // Instant
  },

  house: {
    name: 'House',
    shape: 'house',
    gi: '🏠',
    h: 26,
    body: '#caa06a',
    roof: '#8a3a26',
    maxLevel: 20,
    baseCost: { wood: 50, stone: 20 },
    popCap: 5,
    baseTime: 15,  // 15 seconds base
    desc: 'Homes for your people.',
    levelFormula: {
      cost: (level) => ({
        wood: Math.ceil(50 * Math.pow(1.15, level - 1)),
        stone: Math.ceil(20 * Math.pow(1.15, level - 1)),
      }),
      time: (level) => Math.ceil(15 * (1 + (level - 1) * 0.3)),
    },
  },

  woodcutter: {
    name: 'Woodcutter',
    shape: 'house',
    gi: '🪓',
    h: 24,
    body: '#9a7140',
    roof: '#5a3c1e',
    maxLevel: 20,
    baseCost: { wood: 30 },
    needsWorker: 1,
    baseProd: { wood: 2 },
    baseTime: 20,
    desc: 'Chops timber.',
    levelFormula: {
      cost: (level) => ({
        wood: Math.ceil(30 * Math.pow(1.12, level - 1)),
      }),
      prod: (level) => ({
        wood: Math.ceil(2 + (level - 1) * 0.8),
      }),
      time: (level) => Math.ceil(20 * (1 + (level - 1) * 0.25)),
    },
  },

  quarry: {
    name: 'Quarry',
    shape: 'quarry',
    gi: '⛏️',
    h: 18,
    body: '#a8a496',
    roof: '#6a665a',
    maxLevel: 20,
    baseCost: { wood: 40 },
    needsWorker: 1,
    baseProd: { stone: 2 },
    baseTime: 20,
    desc: 'Cuts stone.',
    levelFormula: {
      cost: (level) => ({
        wood: Math.ceil(40 * Math.pow(1.12, level - 1)),
      }),
      prod: (level) => ({
        stone: Math.ceil(2 + (level - 1) * 0.8),
      }),
      time: (level) => Math.ceil(20 * (1 + (level - 1) * 0.25)),
    },
  },

  farm: {
    name: 'Farm',
    shape: 'farm',
    gi: '🌾',
    h: 20,
    body: '#c79a48',
    roof: '#8a6a28',
    maxLevel: 20,
    baseCost: { wood: 30 },
    needsWorker: 1,
    baseProd: { food: 3 },
    baseTime: 25,
    desc: 'Grows crops.',
    levelFormula: {
      cost: (level) => ({
        wood: Math.ceil(30 * Math.pow(1.12, level - 1)),
      }),
      prod: (level) => ({
        food: Math.ceil(3 + (level - 1) * 1),
      }),
      time: (level) => Math.ceil(25 * (1 + (level - 1) * 0.25)),
    },
  },

  windmill: {
    name: 'Windmill',
    shape: 'mill',
    gi: '🌬️',
    h: 46,
    body: '#d8bd86',
    roof: '#5a3c1e',
    maxLevel: 20,
    baseCost: { wood: 80, stone: 40 },
    needsWorker: 1,
    baseProd: { food: 6 },
    baseTime: 45,
    desc: 'Mills grain.',
    levelFormula: {
      cost: (level) => ({
        wood: Math.ceil(80 * Math.pow(1.15, level - 1)),
        stone: Math.ceil(40 * Math.pow(1.15, level - 1)),
      }),
      prod: (level) => ({
        food: Math.ceil(6 + (level - 1) * 1.5),
      }),
      time: (level) => Math.ceil(45 * (1 + (level - 1) * 0.3)),
    },
  },

  market: {
    name: 'Market',
    shape: 'house',
    gi: '🪙',
    h: 26,
    body: '#cf953c',
    roof: '#8a3a26',
    maxLevel: 20,
    baseCost: { wood: 60, stone: 30 },
    needsWorker: 1,
    baseProd: { gold: 2 },
    baseTime: 30,
    desc: 'Collects taxes.',
    levelFormula: {
      cost: (level) => ({
        wood: Math.ceil(60 * Math.pow(1.15, level - 1)),
        stone: Math.ceil(30 * Math.pow(1.15, level - 1)),
      }),
      prod: (level) => ({
        gold: Math.ceil(2 + (level - 1) * 0.6),
      }),
      time: (level) => Math.ceil(30 * (1 + (level - 1) * 0.3)),
    },
  },

  storehouse: {
    name: 'Storehouse',
    shape: 'house',
    gi: '📦',
    h: 28,
    body: '#a87a44',
    roof: '#4a3018',
    maxLevel: 20,
    baseCost: { wood: 70, stone: 50 },
    baseCaps: { wood: 500, stone: 500, food: 500 },
    baseTime: 40,
    desc: 'Increases storage.',
    levelFormula: {
      cost: (level) => ({
        wood: Math.ceil(70 * Math.pow(1.15, level - 1)),
        stone: Math.ceil(50 * Math.pow(1.15, level - 1)),
      }),
      caps: (level) => ({
        wood: Math.ceil(500 + (level - 1) * 300),
        stone: Math.ceil(500 + (level - 1) * 300),
        food: Math.ceil(500 + (level - 1) * 300),
      }),
      time: (level) => Math.ceil(40 * (1 + (level - 1) * 0.35)),
    },
  },

  barracks: {
    name: 'Barracks',
    shape: 'house',
    gi: '⚔️',
    h: 32,
    body: '#7a6a58',
    roof: '#8a2a26',
    maxLevel: 1,  // No upgrades for Phase 1
    baseCost: { wood: 100, stone: 60 },
    baseTime: 60,
    recruits: true,
    desc: 'Required to recruit soldiers.',
  },

  tower: {
    name: 'Tower',
    shape: 'tower',
    gi: '🗼',
    h: 56,
    body: '#9a948a',
    roof: '#3c5fa0',
    maxLevel: 1,
    baseCost: { wood: 20, stone: 40 },
    baseTime: 30,
    defense: 5,
    desc: 'Guard tower.',
  },

  innerwall: {
    name: 'Wall',
    shape: 'wall',
    gi: '🧱',
    h: 20,
    body: '#a89a86',
    maxLevel: 1,
    baseCost: { stone: 10 },
    baseTime: 5,
    defense: 1,
    desc: 'Inner stone wall.',
  },

  tree: {
    name: 'Tree',
    shape: 'tree',
    gi: '🌲',
    h: 30,
    body: '#5a3a1e',
    roof: '#2f7a3a',
    deco: true,
    maxLevel: 1,
    baseCost: { wood: 5 },
    baseTime: 2,
    desc: 'Decoration.',
  },

  // ---- DECORATIONS (prestige buildings) ----
  garden: {
    name: 'Garden',
    shape: 'farm',
    gi: '🌸',
    h: 16,
    body: '#7a9a5a',
    roof: '#4a7a2a',
    deco: true,
    maxLevel: 1,
    baseCost: { wood: 20, gold: 10 },
    baseTime: 10,
    prestige: 5,
    desc: 'A pleasant garden. +5 prestige.',
  },
  statue: {
    name: 'Statue',
    shape: 'tower',
    gi: '🗿',
    h: 24,
    body: '#a8a298',
    roof: '#888080',
    deco: true,
    maxLevel: 1,
    baseCost: { stone: 60, gold: 30 },
    baseTime: 60,
    prestige: 20,
    desc: 'A grand statue. +20 prestige.',
  },
  fountain: {
    name: 'Fountain',
    shape: 'quarry',
    gi: '⛲',
    h: 18,
    body: '#7aaccc',
    roof: '#4a7ca0',
    deco: true,
    maxLevel: 1,
    baseCost: { stone: 80, gold: 50 },
    baseTime: 90,
    prestige: 30,
    desc: 'A marble fountain. +30 prestige.',
  },
  flagpole: {
    name: 'Flagpole',
    shape: 'tower',
    gi: '🚩',
    h: 36,
    body: '#5a3a1e',
    roof: '#c83a3a',
    deco: true,
    maxLevel: 1,
    baseCost: { wood: 30 },
    baseTime: 15,
    prestige: 10,
    desc: 'Your banner flies high. +10 prestige.',
  },
};

export const TOOLS = ['house', 'woodcutter', 'quarry', 'farm', 'windmill', 'market', 'storehouse', 'barracks', 'tower', 'innerwall', 'tree', 'garden', 'statue', 'fountain', 'flagpole'];

/**
 * UNITS for combat
 */
export const UNITS = {
  spear: {
    name: 'Spearman',
    gi: '🪖',
    power: 2,
    cost: { food: 20, gold: 5 },
  },
  archer: {
    name: 'Archer',
    gi: '🏹',
    power: 3,
    cost: { wood: 15, gold: 20 },
  },
  knight: {
    name: 'Knight',
    gi: '🐎',
    power: 6,
    cost: { gold: 30, food: 20, stone: 10 },
  },
};

/**
 * World targets (NPCs, bandits, outposts)
 */
export function freshWorld() {
  return [
    { id: 'camp', name: 'Robber Camp', icon: '🏕️', x: 26, y: 30, strength: 10, loot: { gold: 80, wood: 40 } },
    { id: 'watch', name: 'Border Watchtower', icon: '🗼', x: 71, y: 24, strength: 18, outpost: true, income: { wood: 1 } },
    { id: 'bandit', name: 'Bandit Outpost', icon: '⚑', x: 19, y: 64, strength: 25, outpost: true, income: { gold: 1 } },
    { id: 'coast', name: 'Coastal Raiders', icon: '⛵', x: 80, y: 67, strength: 35, loot: { food: 200, gold: 120 } },
    { id: 'fort', name: 'Mountain Fort', icon: '⛰️', x: 48, y: 14, strength: 45, outpost: true, income: { stone: 1 } },
    { id: 'rival', name: 'Rival Lord\'s Keep', icon: '🏰', x: 62, y: 50, strength: 65, loot: { gold: 300, stone: 150 } },
  ];
}
