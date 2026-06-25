/**
 * FREE EMPIRE - Hero / Lord System
 * Your lord gains XP, levels up, and provides bonuses to the empire
 */

export const HERO_SKILLS = {
  attack: {
    id: 'attack',
    name: 'Attack',
    gi: '⚔️',
    desc: 'Increases army combat power by 5% per point.',
    maxPoints: 20,
    effect: (pts) => ({ armyAttackMult: 1 + pts * 0.05 }),
  },
  defense: {
    id: 'defense',
    name: 'Defense',
    gi: '🛡️',
    desc: 'Reduces army casualties by 3% per point.',
    maxPoints: 20,
    effect: (pts) => ({ casualtyReduction: pts * 0.03 }),
  },
  gathering: {
    id: 'gathering',
    name: 'Gathering',
    gi: '🌾',
    desc: '+5% all resource production per point.',
    maxPoints: 20,
    effect: (pts) => ({ gatheringMult: 1 + pts * 0.05 }),
  },
  construction: {
    id: 'construction',
    name: 'Construction',
    gi: '🔨',
    desc: '-4% construction time per point.',
    maxPoints: 20,
    effect: (pts) => ({ constructionTimeMult: 1 - pts * 0.04 }),
  },
};

// XP required to reach each level (cumulative)
const XP_TABLE = [
  0,      // Level 1 (starting)
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  900,    // Level 5
  1500,   // Level 6
  2400,   // Level 7
  3700,   // Level 8
  5500,   // Level 9
  8000,   // Level 10
  11500,  // Level 11
  16000,  // Level 12
  22000,  // Level 13
  30000,  // Level 14
  40000,  // Level 15
  53000,  // Level 16
  70000,  // Level 17
  92000,  // Level 18
  120000, // Level 19
  155000, // Level 20
];

export const MAX_HERO_LEVEL = 20;

export function freshHero(name = 'Lord') {
  return {
    name,
    level: 1,
    xp: 0,
    skillPoints: 0,  // unspent
    skills: { attack: 0, defense: 0, gathering: 0, construction: 0 },
  };
}

export class HeroSystem {
  /**
   * XP needed for a given level (0-indexed next level threshold)
   */
  static xpForLevel(level) {
    return XP_TABLE[Math.min(level, MAX_HERO_LEVEL - 1)] || 0;
  }

  /**
   * Add XP, handle level-ups, return levels gained
   */
  static addXP(hero, amount) {
    if (hero.level >= MAX_HERO_LEVEL) return 0;
    hero.xp += amount;
    let levelsGained = 0;
    while (hero.level < MAX_HERO_LEVEL && hero.xp >= HeroSystem.xpForLevel(hero.level)) {
      hero.level++;
      hero.skillPoints++;
      levelsGained++;
    }
    return levelsGained;
  }

  /**
   * Spend a skill point
   */
  static spendSkillPoint(hero, skillId) {
    if (hero.skillPoints <= 0) return { success: false, error: 'No skill points available' };
    const skill = HERO_SKILLS[skillId];
    if (!skill) return { success: false, error: 'Unknown skill' };
    if ((hero.skills[skillId] || 0) >= skill.maxPoints) return { success: false, error: 'Skill already maxed' };
    hero.skills[skillId] = (hero.skills[skillId] || 0) + 1;
    hero.skillPoints--;
    return { success: true };
  }

  /**
   * Get all active hero effects
   */
  static getEffects(hero) {
    if (!hero) return {};
    const effects = {};
    for (const [skillId, pts] of Object.entries(hero.skills || {})) {
      if (pts <= 0) continue;
      const skill = HERO_SKILLS[skillId];
      if (!skill) continue;
      const skillEffects = skill.effect(pts);
      Object.assign(effects, skillEffects);
    }
    return effects;
  }

  /**
   * XP gained from winning a battle
   */
  static battleXP(targetStrength, result) {
    if (result === 'victory') return Math.floor(targetStrength * 1.5);
    return Math.floor(targetStrength * 0.3);  // Even defeat gives some XP
  }

  /**
   * XP gained from construction completion
   */
  static constructionXP(buildingType, level) {
    return Math.floor(10 * level * 1.2);
  }
}
