/**
 * FREE EMPIRE - Asset Catalog
 * Central catalog for all drawable assets using stable IDs and metadata.
 * The rest of the game should address assets by ID, never raw filenames.
 */

function entry(config) {
  return {
    animation: false,
    animationClips: [],
    variants: [],
    supportedLevels: [],
    spriteSize: { width: 64, height: 64 },
    anchor: { x: 0.5, y: 1 },
    sourceType: 'single', // single | sheet | atlas
    source: null,
    ...config,
  };
}

const BUILDING_LEVELS = [1, 5, 10, 15, 20];

export const ASSET_CATALOG = {
  buildings: {
    keep: entry({
      id: 'building.keep',
      category: 'buildings',
      supportedLevels: [1, 2, 3, 4, 5, 6],
      spriteSize: { width: 192, height: 192 },
      source: 'assets/sprites/castle/castle_lvl{level}{variant}.png',
      sourceType: 'single',
    }),
    house: entry({
      id: 'building.house',
      category: 'buildings',
      supportedLevels: BUILDING_LEVELS,
      source: 'assets/sprites/buildings/house_lvl{level}{variant}.png',
    }),
    woodcutter: entry({
      id: 'building.woodcutter',
      category: 'buildings',
      supportedLevels: BUILDING_LEVELS,
      source: 'assets/sprites/buildings/woodcutter_lvl{level}{variant}.png',
    }),
    quarry: entry({
      id: 'building.quarry',
      category: 'buildings',
      supportedLevels: BUILDING_LEVELS,
      source: 'assets/sprites/buildings/quarry_lvl{level}{variant}.png',
    }),
    farm: entry({
      id: 'building.farm',
      category: 'buildings',
      supportedLevels: BUILDING_LEVELS,
      source: 'assets/sprites/buildings/farm_lvl{level}{variant}.png',
    }),
    windmill: entry({
      id: 'building.windmill',
      category: 'buildings',
      supportedLevels: BUILDING_LEVELS,
      animation: true,
      animationClips: ['Idle', 'Windmill'],
      sourceType: 'sheet',
      source: 'assets/sprites/buildings/windmill_lvl{level}{variant}.png',
      frameSize: { width: 128, height: 128 },
      frameCount: 8,
      frameMs: 120,
    }),
    market: entry({
      id: 'building.market',
      category: 'buildings',
      supportedLevels: BUILDING_LEVELS,
      source: 'assets/sprites/buildings/market_lvl{level}{variant}.png',
    }),
    storehouse: entry({
      id: 'building.storehouse',
      category: 'buildings',
      supportedLevels: BUILDING_LEVELS,
      source: 'assets/sprites/buildings/storehouse_lvl{level}{variant}.png',
    }),
    barracks: entry({
      id: 'building.barracks',
      category: 'buildings',
      supportedLevels: [1, 5, 10, 15, 20],
      source: 'assets/sprites/buildings/barracks_lvl{level}{variant}.png',
    }),
    tower: entry({
      id: 'building.tower',
      category: 'buildings',
      supportedLevels: [1, 2, 3, 4, 5],
      source: 'assets/sprites/buildings/tower_lvl{level}{variant}.png',
    }),
    innerwall: entry({
      id: 'building.innerwall',
      category: 'buildings',
      supportedLevels: [1, 2, 3, 4, 5],
      source: 'assets/sprites/buildings/wall_lvl{level}{variant}.png',
    }),
  },

  castle: {
    core: entry({
      id: 'castle.core',
      category: 'castle',
      supportedLevels: [1, 2, 3, 4, 5, 6],
      spriteSize: { width: 224, height: 224 },
      source: 'assets/sprites/castle/castle_lvl{level}{variant}.png',
    }),
    wall: entry({
      id: 'castle.wall',
      category: 'walls',
      supportedLevels: [1, 2, 3, 4, 5],
      source: 'assets/sprites/buildings/wall_lvl{level}{variant}.png',
    }),
  },

  decorations: {
    tree: entry({ id: 'decoration.tree', category: 'decorations', source: 'assets/sprites/decorations/tree{variant}.png' }),
    bushes: entry({ id: 'decoration.bushes', category: 'decorations', source: 'assets/sprites/decorations/bushes{variant}.png' }),
    flowers: entry({ id: 'decoration.flowers', category: 'decorations', source: 'assets/sprites/decorations/flowers{variant}.png' }),
    roads: entry({ id: 'decoration.roads', category: 'decorations', source: 'assets/sprites/decorations/roads{variant}.png' }),
    water: entry({ id: 'decoration.water', category: 'decorations', animation: true, animationClips: ['Idle', 'Water'], sourceType: 'sheet', source: 'assets/sprites/decorations/water{variant}.png', frameSize: { width: 128, height: 64 }, frameCount: 6, frameMs: 140 }),
    bridges: entry({ id: 'decoration.bridges', category: 'decorations', source: 'assets/sprites/decorations/bridges{variant}.png' }),
    torches: entry({ id: 'decoration.torches', category: 'decorations', animation: true, animationClips: ['Idle', 'Fire'], sourceType: 'sheet', source: 'assets/sprites/decorations/torches{variant}.png', frameSize: { width: 64, height: 96 }, frameCount: 5, frameMs: 90 }),
    market_stalls: entry({ id: 'decoration.market_stalls', category: 'decorations', source: 'assets/sprites/decorations/market_stalls{variant}.png' }),
    garden: entry({ id: 'decoration.garden', category: 'decorations', source: 'assets/sprites/decorations/garden{variant}.png' }),
    statue: entry({ id: 'decoration.statue', category: 'decorations', source: 'assets/sprites/decorations/statue{variant}.png' }),
    fountain: entry({ id: 'decoration.fountain', category: 'decorations', animation: true, animationClips: ['Idle', 'Water'], sourceType: 'sheet', source: 'assets/sprites/decorations/fountain{variant}.png', frameSize: { width: 96, height: 96 }, frameCount: 8, frameMs: 110 }),
    flagpole: entry({ id: 'decoration.flagpole', category: 'decorations', animation: true, animationClips: ['Idle', 'Flags'], sourceType: 'sheet', source: 'assets/sprites/decorations/flagpole{variant}.png', frameSize: { width: 64, height: 96 }, frameCount: 6, frameMs: 100 }),
  },

  units: {
    spear: entry({ id: 'unit.spear', category: 'units', animation: true, animationClips: ['Idle', 'Walk', 'Attack', 'Death', 'Harvest'], spriteSize: { width: 64, height: 64 }, sourceType: 'sheet', source: 'assets/sprites/units/spear{variant}.png', frameSize: { width: 64, height: 64 }, frameCount: 6, frameMs: 110 }),
    archer: entry({ id: 'unit.archer', category: 'units', animation: true, animationClips: ['Idle', 'Walk', 'Attack', 'Death', 'Harvest'], spriteSize: { width: 64, height: 64 }, sourceType: 'sheet', source: 'assets/sprites/units/archer{variant}.png', frameSize: { width: 64, height: 64 }, frameCount: 6, frameMs: 110 }),
    knight: entry({ id: 'unit.knight', category: 'units', animation: true, animationClips: ['Idle', 'Walk', 'Attack', 'Death'], spriteSize: { width: 80, height: 80 }, sourceType: 'sheet', source: 'assets/sprites/units/knight{variant}.png', frameSize: { width: 80, height: 80 }, frameCount: 6, frameMs: 110 }),
  },

  effects: {
    construction_dust: entry({ id: 'effect.construction_dust', category: 'effects', animation: true, animationClips: ['Construction'], sourceType: 'atlas', source: 'assets/effects/construction_dust.atlas.json' }),
    upgrade_sparkles: entry({ id: 'effect.upgrade_sparkles', category: 'effects', animation: true, animationClips: ['Upgrade'], sourceType: 'atlas', source: 'assets/effects/upgrade_sparkles.atlas.json' }),
    smoke: entry({ id: 'effect.smoke', category: 'effects', animation: true, animationClips: ['Smoke'], sourceType: 'sheet', source: 'assets/effects/smoke{variant}.png', frameSize: { width: 64, height: 64 }, frameCount: 10, frameMs: 80 }),
    fire: entry({ id: 'effect.fire', category: 'effects', animation: true, animationClips: ['Fire'], sourceType: 'sheet', source: 'assets/effects/fire{variant}.png', frameSize: { width: 64, height: 64 }, frameCount: 8, frameMs: 90 }),
  },

  ui: {
    panel_frame: entry({ id: 'ui.panel_frame', category: 'ui', source: 'assets/sprites/ui/panel_frame{variant}.png' }),
    button_wood: entry({ id: 'ui.button_wood', category: 'ui', source: 'assets/sprites/ui/button_wood{variant}.png' }),
    tooltip_parchment: entry({ id: 'ui.tooltip_parchment', category: 'ui', source: 'assets/sprites/ui/tooltip_parchment{variant}.png' }),
  },
};

export function getCatalogEntry(group, key) {
  const bucket = ASSET_CATALOG[group];
  if (!bucket) return null;
  return bucket[key] || null;
}

export function listCatalogEntries() {
  const rows = [];
  for (const [group, bucket] of Object.entries(ASSET_CATALOG)) {
    for (const [key, value] of Object.entries(bucket)) {
      rows.push({
        group,
        key,
        id: value.id,
        category: value.category,
        sourceType: value.sourceType,
        supportedLevels: value.supportedLevels || [],
        animation: !!value.animation,
        animationClips: value.animationClips || [],
        spriteSize: value.spriteSize,
        anchor: value.anchor,
        frameSize: value.frameSize || null,
        frameCount: value.frameCount || 1,
        frameMs: value.frameMs || 120,
        variants: value.variants || [],
        source: value.source,
      });
    }
  }
  return rows;
}
