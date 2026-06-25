/**
 * FREE EMPIRE - Quest System
 * Daily quests, story quests, achievement quests
 * Rewards: gold, resources, gems (prestige), XP
 */

export const QUEST_TYPES = {
  STORY: 'story',
  DAILY: 'daily',
  ACHIEVEMENT: 'achievement',
};

/** All available quest definitions */
export const QUEST_DEFS = {
  // ---- STORY QUESTS ----
  story_first_house: {
    id: 'story_first_house',
    type: QUEST_TYPES.STORY,
    title: 'A Place to Call Home',
    desc: 'Build your first House to shelter your people.',
    gi: '🏠',
    condition: (state) => Object.values(state.tiles).some(t => t.type === 'house'),
    reward: { gold: 50, wood: 100 },
    xp: 30,
  },
  story_first_woodcutter: {
    id: 'story_first_woodcutter',
    type: QUEST_TYPES.STORY,
    title: 'Into the Forest',
    desc: 'Build a Woodcutter to harvest timber.',
    gi: '🪓',
    condition: (state) => Object.values(state.tiles).some(t => t.type === 'woodcutter'),
    reward: { wood: 200 },
    xp: 30,
    requires: ['story_first_house'],
  },
  story_first_farm: {
    id: 'story_first_farm',
    type: QUEST_TYPES.STORY,
    title: 'Feed Your People',
    desc: 'Build a Farm to grow crops.',
    gi: '🌾',
    condition: (state) => Object.values(state.tiles).some(t => t.type === 'farm'),
    reward: { food: 200, gold: 30 },
    xp: 30,
    requires: ['story_first_house'],
  },
  story_barracks: {
    id: 'story_barracks',
    type: QUEST_TYPES.STORY,
    title: 'Raise Your Banner',
    desc: 'Construct a Barracks to train your army.',
    gi: '⚔️',
    condition: (state) => Object.values(state.tiles).some(t => t.type === 'barracks'),
    reward: { gold: 100, food: 100 },
    xp: 60,
    requires: ['story_first_woodcutter', 'story_first_farm'],
  },
  story_first_soldier: {
    id: 'story_first_soldier',
    type: QUEST_TYPES.STORY,
    title: 'The First Warrior',
    desc: 'Recruit at least one soldier.',
    gi: '🪖',
    condition: (state) => (state.army.spear || 0) + (state.army.archer || 0) + (state.army.knight || 0) >= 1,
    reward: { gold: 80 },
    xp: 40,
    requires: ['story_barracks'],
  },
  story_first_battle: {
    id: 'story_first_battle',
    type: QUEST_TYPES.STORY,
    title: 'Baptism of Fire',
    desc: 'Win your first battle on the World Map.',
    gi: '🏆',
    condition: (state) => (state.world || []).some(n => n.owned),
    reward: { gold: 200, prestige: 50 },
    xp: 100,
    requires: ['story_first_soldier'],
  },
  story_castle_2: {
    id: 'story_castle_2',
    type: QUEST_TYPES.STORY,
    title: 'Stone and Mortar',
    desc: 'Upgrade your castle to a Stone Keep.',
    gi: '🏯',
    condition: (state) => (state.castleLevel || 1) >= 2,
    reward: { gold: 300, prestige: 100 },
    xp: 200,
    requires: ['story_first_battle'],
  },

  // ---- DAILY QUESTS (reset every 24h) ----
  daily_produce_wood: {
    id: 'daily_produce_wood',
    type: QUEST_TYPES.DAILY,
    title: 'Timber Run',
    desc: 'Have at least 300 wood in storage.',
    gi: '🪵',
    condition: (state) => (state.res?.wood || 0) >= 300,
    reward: { gold: 25 },
    xp: 15,
  },
  daily_train_troops: {
    id: 'daily_train_troops',
    type: QUEST_TYPES.DAILY,
    title: 'Drill the Men',
    desc: 'Have at least 5 soldiers in your army.',
    gi: '🪖',
    condition: (state) => {
      const a = state.army;
      return (a.spear || 0) + (a.archer || 0) + (a.knight || 0) >= 5;
    },
    reward: { food: 100, gold: 15 },
    xp: 20,
  },

  // ---- ACHIEVEMENTS ----
  ach_100_wood: {
    id: 'ach_100_wood',
    type: QUEST_TYPES.ACHIEVEMENT,
    title: 'Lumberjack',
    desc: 'Accumulate 100 wood at once.',
    gi: '🌲',
    condition: (state) => (state.res?.wood || 0) >= 100,
    reward: { gold: 20 },
    xp: 10,
  },
  ach_level5_building: {
    id: 'ach_level5_building',
    type: QUEST_TYPES.ACHIEVEMENT,
    title: 'Master Builder',
    desc: 'Upgrade any building to Level 5.',
    gi: '⬆️',
    condition: (state) => Object.values(state.buildingLevels || {}).some(lvl => lvl >= 5),
    reward: { gold: 150, prestige: 30 },
    xp: 80,
  },
  ach_10_soldiers: {
    id: 'ach_10_soldiers',
    type: QUEST_TYPES.ACHIEVEMENT,
    title: 'Warband',
    desc: 'Field an army of 10 or more soldiers.',
    gi: '⚔️',
    condition: (state) => {
      const a = state.army;
      return (a.spear || 0) + (a.archer || 0) + (a.knight || 0) >= 10;
    },
    reward: { gold: 200 },
    xp: 100,
  },
};

export class QuestSystem {
  /**
   * Check all pending quests against game state, return newly completed quests
   */
  static checkQuests(state) {
    const completed = state.questsCompleted || [];
    const completedSet = new Set(completed);
    const inProgress = state.questsInProgress || [];
    const newly = [];

    for (const [id, def] of Object.entries(QUEST_DEFS)) {
      if (completedSet.has(id)) continue;

      // Check prerequisites
      if (def.requires) {
        if (!def.requires.every(r => completedSet.has(r))) continue;
      }

      // Check condition
      if (def.condition(state)) {
        newly.push(def);
        completedSet.add(id);
      }
    }

    return newly;
  }

  /**
   * Apply quest rewards to state, return reward description
   */
  static applyRewards(state, questDef) {
    const { reward, xp } = questDef;
    if (reward) {
      for (const [r, v] of Object.entries(reward)) {
        if (r === 'prestige') {
          state.prestige = (state.prestige || 0) + v;
        } else {
          state.res[r] = (state.res[r] || 0) + v;
        }
      }
    }
    if (xp && state.hero) {
      const { HeroSystem } = require('./hero.js');
      HeroSystem.addXP(state.hero, xp);
    }
    state.questsCompleted = state.questsCompleted || [];
    if (!state.questsCompleted.includes(questDef.id)) {
      state.questsCompleted.push(questDef.id);
    }
    return reward;
  }

  /**
   * Get available quests (prerequisites met, not completed)
   */
  static getAvailable(state) {
    const completedSet = new Set(state.questsCompleted || []);
    return Object.values(QUEST_DEFS).filter(def => {
      if (completedSet.has(def.id)) return false;
      if (def.requires && !def.requires.every(r => completedSet.has(r))) return false;
      return true;
    });
  }
}
