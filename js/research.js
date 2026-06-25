/**
 * FREE EMPIRE - Research / Technology Tree
 * Timed research upgrades that globally boost production, defense, economy
 */

export const RESEARCH_TREE = {
  // === ECONOMY ===
  forestry: {
    id: 'forestry',
    name: 'Advanced Forestry',
    category: 'economy',
    gi: '🌲',
    desc: '+20% wood production from all woodcutters.',
    effect: { woodProdMult: 1.20 },
    cost: { wood: 100, gold: 30 },
    time: 60,           // seconds
    requires: [],
    castleRequired: 1,
  },
  masonry: {
    id: 'masonry',
    name: 'Stone Masonry',
    category: 'economy',
    gi: '🪨',
    desc: '+20% stone production from all quarries.',
    effect: { stoneProdMult: 1.20 },
    cost: { stone: 100, gold: 30 },
    time: 60,
    requires: [],
    castleRequired: 1,
  },
  agriculture: {
    id: 'agriculture',
    name: 'Agriculture',
    category: 'economy',
    gi: '🌾',
    desc: '+20% food production from farms and windmills.',
    effect: { foodProdMult: 1.20 },
    cost: { food: 100, gold: 30 },
    time: 60,
    requires: [],
    castleRequired: 1,
  },
  commerce: {
    id: 'commerce',
    name: 'Commerce',
    category: 'economy',
    gi: '🪙',
    desc: '+30% gold production from all markets.',
    effect: { goldProdMult: 1.30 },
    cost: { gold: 80, wood: 60 },
    time: 90,
    requires: ['forestry'],
    castleRequired: 2,
  },
  larderExpansion: {
    id: 'larderExpansion',
    name: 'Larder Expansion',
    category: 'economy',
    gi: '📦',
    desc: '+500 storage capacity for all resources.',
    effect: { storageBonus: 500 },
    cost: { wood: 150, stone: 100 },
    time: 120,
    requires: ['masonry'],
    castleRequired: 2,
  },

  // === MILITARY ===
  weaponSmithing: {
    id: 'weaponSmithing',
    name: 'Weapon Smithing',
    category: 'military',
    gi: '⚔️',
    desc: '+1 attack power per soldier.',
    effect: { armyAttackBonus: 1 },
    cost: { stone: 120, gold: 50 },
    time: 120,
    requires: [],
    castleRequired: 2,
  },
  arrowFletching: {
    id: 'arrowFletching',
    name: 'Arrow Fletching',
    category: 'military',
    gi: '🏹',
    desc: '+2 power for all archers.',
    effect: { archerPowerBonus: 2 },
    cost: { wood: 100, gold: 40 },
    time: 90,
    requires: ['weaponSmithing'],
    castleRequired: 2,
  },
  horseBreeding: {
    id: 'horseBreeding',
    name: 'Horse Breeding',
    category: 'military',
    gi: '🐎',
    desc: '+3 power for all knights.',
    effect: { knightPowerBonus: 3 },
    cost: { food: 200, gold: 100 },
    time: 180,
    requires: ['weaponSmithing'],
    castleRequired: 3,
  },
  militaryTraining: {
    id: 'militaryTraining',
    name: 'Military Training',
    category: 'military',
    gi: '🪖',
    desc: '-25% army casualties in all battles.',
    effect: { casualtyReduction: 0.25 },
    cost: { gold: 150, food: 100 },
    time: 180,
    requires: ['weaponSmithing', 'arrowFletching'],
    castleRequired: 3,
  },

  // === CONSTRUCTION ===
  engineering: {
    id: 'engineering',
    name: 'Engineering',
    category: 'construction',
    gi: '⚙️',
    desc: '-20% construction time for all buildings.',
    effect: { constructionTimeMult: 0.80 },
    cost: { wood: 120, stone: 80 },
    time: 150,
    requires: ['masonry'],
    castleRequired: 2,
  },
  castleEngineering: {
    id: 'castleEngineering',
    name: 'Castle Engineering',
    category: 'construction',
    gi: '🏰',
    desc: '-30% upgrade time for castle and walls.',
    effect: { castleTimeMult: 0.70 },
    cost: { stone: 300, gold: 150 },
    time: 300,
    requires: ['engineering'],
    castleRequired: 3,
  },
};

export const RESEARCH_CATEGORIES = ['economy', 'military', 'construction'];

export class ResearchSystem {
  /**
   * Check if research can be started
   */
  static canResearch(techId, researchedSet, castleLevel) {
    const tech = RESEARCH_TREE[techId];
    if (!tech) return false;
    if (researchedSet.has(techId)) return false;
    if ((castleLevel || 1) < tech.castleRequired) return false;

    for (const req of tech.requires) {
      if (!researchedSet.has(req)) return false;
    }
    return true;
  }

  /**
   * Get all available (researchable but not yet done) techs
   */
  static getAvailable(researchedSet, castleLevel) {
    return Object.values(RESEARCH_TREE).filter(
      tech => ResearchSystem.canResearch(tech.id, researchedSet, castleLevel)
    );
  }

  /**
   * Get all completed research effects merged into one object
   */
  static getEffects(researchedSet) {
    const effects = {};
    for (const id of researchedSet) {
      const tech = RESEARCH_TREE[id];
      if (!tech) continue;
      for (const [key, val] of Object.entries(tech.effect)) {
        if (typeof val === 'number') {
          // Multiplicative: stack as multiplier
          effects[key] = (effects[key] !== undefined) ? effects[key] * val : val;
        }
      }
    }
    return effects;
  }

  /**
   * Apply research effects to a production value
   */
  static applyProductionEffects(prod, effects) {
    const result = { ...prod };
    if (effects.woodProdMult && result.wood) result.wood = Math.floor(result.wood * effects.woodProdMult);
    if (effects.stoneProdMult && result.stone) result.stone = Math.floor(result.stone * effects.stoneProdMult);
    if (effects.foodProdMult && result.food) result.food = Math.floor(result.food * effects.foodProdMult);
    if (effects.goldProdMult && result.gold) result.gold = Math.floor(result.gold * effects.goldProdMult);
    return result;
  }
}
