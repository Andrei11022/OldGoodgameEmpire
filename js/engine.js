/**
 * FREE EMPIRE - Game Engine
 * Core game loop, state management, and system integration
 */

import { TICK_MS, BUILDINGS, UNITS, GATE, GRID, freshWorld } from './config.js';
import { CASTLE_RADIUS } from './config.js';
import { ConstructionSystem } from './construction.js';
import { SaveSystem } from './save.js';
import { BuildingSystem } from './buildings.js';
import { CastleSystem, CASTLE_LEVELS, MAX_CASTLE_LEVEL } from './castle.js';
import { ResearchSystem, RESEARCH_TREE } from './research.js';
import { HeroSystem, freshHero } from './hero.js';
import { MessageSystem, createBattleReport, createConstructionMessage, createSystemMessage } from './messages.js';
import { QuestSystem, QUEST_DEFS } from './quests.js';

export class GameEngine {
  constructor() {
    this.state = this.freshState();
    this.construction = new ConstructionSystem();
    this.building = BuildingSystem;
    this.tickCount = 0;
  }

  /**
   * Create fresh game state
   */
  freshState() {
    return {
      res: { wood: 200, stone: 150, food: 200, gold: 100 },
      army: { spear: 0, archer: 0, knight: 0 },
      tiles: {},
      cam: { x: 0, y: 0, set: false },
      world: freshWorld(),
      view: 'castle',
      buildingLevels: {},
      castleLevel: 1,
      prestige: 0,
      researched: [],        // array of completed tech IDs
      activeResearch: null,  // { id, startTime, duration }
    };
  }

  /**
   * Initialize game
   */
  init() {
    // Try to load save
    const saved = SaveSystem.load();
    if (saved) {
      this.state = saved;
      if (saved.construction) {
        this.construction.fromJSON(saved.construction);
      }
    }

    // Ensure keep exists
    this.ensureKeep();

    return this.state;
  }

  /**
   * Ensure keep is placed in center
   */
  ensureKeep() {
    const c = Math.floor(GRID / 2);
    const key = `${c},${c}`;
    if (!this.state.tiles[key]) {
      this.state.tiles[key] = { type: 'keep' };
      this.building.setLevel(this.state.buildingLevels, c, c, 1);
    }
  }

  isInCastleArea(x, y) {
    const center = Math.floor(GRID / 2);
    const level = this.state.castleLevel || 1;
    const radius = CASTLE_RADIUS[level] || 4;
    return Math.abs(x - center) <= radius && Math.abs(y - center) <= radius;
  }

  placeBuilding(x, y, buildingType) {
    const def = BUILDINGS[buildingType];
    if (!def) return { success: false, error: 'Invalid building' };

    const key = `${x},${y}`;

    // Check tile empty
    if (this.state.tiles[key]) {
      return { success: false, error: 'Tile occupied' };
    }

    // Check castle radius
    if (!this.isInCastleArea(x, y)) {
      return { success: false, error: 'Outside castle grounds! Upgrade your castle to expand.' };
    }

    // Check unique
    if (def.unique) {
      for (const k in this.state.tiles) {
        if (this.state.tiles[k].type === buildingType) {
          return { success: false, error: `Only one ${def.name}!` };
        }
      }
    }

    // Check afford
    if (!this.building.canAfford(def, this.state.res, 1)) {
      return { success: false, error: `Can't afford ${def.name}!` };
    }

    // Check population
    if (def.needsWorker) {
      const stats = this.getStats();
      if (stats.popUsed + def.needsWorker > stats.popCap) {
        return { success: false, error: 'Not enough people!' };
      }
    }

    // Pay
    this.building.pay(def, this.state.res, 1);

    // Queue construction
    const item = this.construction.queueBuild(x, y, buildingType, def);

    // If instant, place immediately
    if (item.duration === 0) {
      this.state.tiles[key] = { type: buildingType };
      this.building.setLevel(this.state.buildingLevels, x, y, 1);
      item.completed = true;
    }

    this.save(true);
    return { success: true, item };
  }

  /**
   * Upgrade a building
   */
  upgradeBuilding(x, y) {
    const key = `${x},${y}`;
    const tile = this.state.tiles[key];

    if (!tile) return { success: false, error: 'No building here' };

    const def = BUILDINGS[tile.type];
    if (!def) return { success: false, error: 'Invalid building' };

    const level = this.building.getLevel(this.state.buildingLevels, x, y);

    if (!this.building.canUpgrade(def, level)) {
      return { success: false, error: 'Cannot upgrade further' };
    }

    const nextLevel = level + 1;

    // Check afford
    if (!this.building.canAfford(def, this.state.res, nextLevel)) {
      return { success: false, error: `Can't afford upgrade to level ${nextLevel}!` };
    }

    // Pay
    this.building.pay(def, this.state.res, nextLevel);

    // Queue construction
    const item = this.construction.queueUpgrade(x, y, tile.type, level, def);

    // If instant, upgrade immediately
    if (item.duration === 0) {
      this.building.incrementLevel(this.state.buildingLevels, x, y);
      item.completed = true;
    }

    this.save(true);
    return { success: true, item };
  }

  /**
   * Demolish a building
   */
  demolishBuilding(x, y) {
    const key = `${x},${y}`;
    const tile = this.state.tiles[key];

    if (!tile) return { success: false, error: 'No building here' };

    const def = BUILDINGS[tile.type];
    if (!def) return { success: false, error: 'Invalid building' };

    if (def.unique) {
      return { success: false, error: "Can't demolish unique buildings!" };
    }

    const level = this.building.getLevel(this.state.buildingLevels, x, y);

    // Refund 50%
    this.building.refund(def, this.state.res, level);

    delete this.state.tiles[key];
    delete this.state.buildingLevels[key];

    this.save(true);
    return { success: true };
  }

  /**
   * Move a building from one tile to another
   */
  moveBuilding(fromX, fromY, toX, toY) {
    const fromKey = `${fromX},${fromY}`;
    const toKey = `${toX},${toY}`;
    const tile = this.state.tiles[fromKey];

    if (!tile) return { success: false, error: 'No building at source tile' };
    if (this.state.tiles[toKey]) return { success: false, error: 'Destination occupied' };
    if (!this.isInCastleArea(toX, toY)) return { success: false, error: 'Destination outside castle grounds' };

    const def = BUILDINGS[tile.type];
    if (def?.unique) return { success: false, error: 'Cannot move unique buildings' };

    const blocked = this.construction.queue.some((q) => !q.completed && q.x === toX && q.y === toY);
    if (blocked) return { success: false, error: 'Destination tile is under construction' };

    // Move tile
    this.state.tiles[toKey] = { ...tile };
    delete this.state.tiles[fromKey];

    // Move level data
    if (this.state.buildingLevels[fromKey] !== undefined) {
      this.state.buildingLevels[toKey] = this.state.buildingLevels[fromKey];
      delete this.state.buildingLevels[fromKey];
    }

    this.save(true);
    return { success: true };
  }

  /**
   * Process construction queue
   */
  tickConstruction() {
    const completed = this.construction.tick();

    if (completed) {
      if (completed.type === 'build') {
        const key = `${completed.x},${completed.y}`;
        this.state.tiles[key] = { type: completed.buildingType };
        this.building.setLevel(this.state.buildingLevels, completed.x, completed.y, 1);
        if (this.state.hero) HeroSystem.addXP(this.state.hero, HeroSystem.constructionXP(completed.buildingType, 1));
        const bDef = BUILDINGS[completed.buildingType];
        this.state.inbox = MessageSystem.add(this.state.inbox, createConstructionMessage(bDef?.name || completed.buildingType, 1));
        if (bDef?.prestige) this.state.prestige = (this.state.prestige || 0) + bDef.prestige;
        return completed;
      }

      if (completed.type === 'upgrade') {
        this.building.incrementLevel(this.state.buildingLevels, completed.x, completed.y);
        const lvl = this.building.getLevel(this.state.buildingLevels, completed.x, completed.y);
        if (this.state.hero) HeroSystem.addXP(this.state.hero, HeroSystem.constructionXP(completed.buildingType, lvl));
        const bDef = BUILDINGS[completed.buildingType];
        this.state.inbox = MessageSystem.add(this.state.inbox, createConstructionMessage((bDef?.name || completed.buildingType) + ` Lvl ${lvl}`, lvl));
        return completed;
      }

      if (completed.type === 'castle-upgrade') {
        this.state.castleLevel = completed.level;
        this.state.prestige = (this.state.prestige || 0) + (CASTLE_LEVELS[completed.level]?.prestigeGain || 0);
        return completed;
      }
    }

    return null;
  }

  /**
   * Main game tick (production, resources, etc)
   */
  tick() {
    const stats = this.getStats();

    // Production
    for (const res in stats.prod) {
      this.state.res[res] = (this.state.res[res] || 0) + stats.prod[res];

      // Cap non-gold resources
      if (res !== 'gold' && stats.caps[res]) {
        this.state.res[res] = Math.min(this.state.res[res], stats.caps[res]);
      }
    }

    // Round resources
    for (const res in this.state.res) {
      this.state.res[res] = Math.round(this.state.res[res] * 10) / 10;
    }

    // Process construction
    const constructionDone = this.tickConstruction();

    // Process active research
    const researchDone = this.tickResearch();

    // Check quests
    const questsCompleted = this.tickQuests();

    this.tickCount++;

    // Save every 10 ticks
    if (this.tickCount % 10 === 0) {
      this.save(true);
    }

    return { stats, constructionDone, researchDone, questsCompleted };
  }

  /**
   * Get game statistics
   */
  getStats() {
    const caps = this.building.getTotalCapacity(this.state.tiles, this.state.buildingLevels);
    const prod = this.building.getTotalProduction(this.state.tiles, this.state.buildingLevels);
    const popCap = this.building.getTotalPopCap(this.state.tiles);
    const popUsed = this.building.getPopulationUsed(this.state.tiles);
    const defense = this.building.getTotalDefense(this.state.tiles);

    // Apply castle level bonuses
    const castleLvl = this.state.castleLevel || 1;
    const storageBonus = CastleSystem.getStorageBonus(castleLvl);
    for (const r in storageBonus) caps[r] = (caps[r] || 0) + storageBonus[r];
    const popBonus = CastleSystem.getPopCapBonus(castleLvl);

    // Apply research effects
    const researchedSet = new Set(this.state.researched || []);
    const resEffects = ResearchSystem.getEffects(researchedSet);
    ResearchSystem.applyProductionEffects(prod, resEffects);
    if (resEffects.storageBonus) {
      caps.wood = (caps.wood || 0) + resEffects.storageBonus;
      caps.stone = (caps.stone || 0) + resEffects.storageBonus;
      caps.food = (caps.food || 0) + resEffects.storageBonus;
    }

    // Apply hero gathering effect
    const heroEffects = HeroSystem.getEffects(this.state.hero);
    if (heroEffects.gatheringMult) {
      for (const r of ['wood', 'stone', 'food', 'gold']) {
        if (prod[r]) prod[r] = Math.floor(prod[r] * heroEffects.gatheringMult);
      }
    }

    // Outpost income
    for (const node of (this.state.world || [])) {
      if (node.owned && node.income) {
        for (const r in node.income) prod[r] = (prod[r] || 0) + node.income[r];
      }
    }

    // Adjust food production by population
    prod.food -= popUsed * 0.5;

    return { caps, prod, popCap: popCap + popBonus, popUsed, defense, castleLevel: castleLvl };
  }

  /**
   * Check and complete quests
   */
  tickQuests() {
    const newlyCompleted = QuestSystem.checkQuests(this.state);
    if (newlyCompleted.length === 0) return [];

    for (const quest of newlyCompleted) {
      // Apply rewards
      const reward = quest.reward || {};
      for (const [r, v] of Object.entries(reward)) {
        if (r === 'prestige') {
          this.state.prestige = (this.state.prestige || 0) + v;
        } else {
          this.state.res[r] = (this.state.res[r] || 0) + v;
        }
      }
      // Hero XP
      if (quest.xp && this.state.hero) HeroSystem.addXP(this.state.hero, quest.xp);
      // Mark completed
      if (!this.state.questsCompleted) this.state.questsCompleted = [];
      if (!this.state.questsCompleted.includes(quest.id)) this.state.questsCompleted.push(quest.id);
      // Inbox notification
      const rewardStr = Object.entries(reward).map(([r, v]) => `+${v} ${r}`).join(', ') || 'XP';
      this.state.inbox = MessageSystem.add(this.state.inbox, {
        id: Date.now() + Math.random(),
        type: 'system',
        subject: `📜 Quest: ${quest.title}`,
        body: `Completed!
Reward: ${rewardStr}${quest.xp ? ` · +${quest.xp} XP` : ''}`,
        timestamp: Date.now(),
        read: false,
      });
    }

    return newlyCompleted;
  }

  /**
   * Tick active research
   */
  tickResearch() {
    const active = this.state.activeResearch;
    if (!active) return null;
    const elapsed = Date.now() - active.startTime;
    if (elapsed >= active.duration) {
      if (!this.state.researched) this.state.researched = [];
      if (!this.state.researched.includes(active.id)) {
        this.state.researched.push(active.id);
      }
      this.state.activeResearch = null;
      return active;
    }
    return null;
  }

  /**
   * Start a research
   */
  startResearch(techId) {
    if (this.state.activeResearch) {
      return { success: false, error: 'Already researching something!' };
    }

    const tech = RESEARCH_TREE[techId];
    if (!tech) return { success: false, error: 'Unknown technology' };

    const researchedSet = new Set(this.state.researched || []);
    if (!ResearchSystem.canResearch(techId, researchedSet, this.state.castleLevel)) {
      return { success: false, error: 'Requirements not met for this research' };
    }

    // Check afford
    for (const r in tech.cost) {
      if ((this.state.res[r] || 0) < tech.cost[r]) {
        return { success: false, error: `Need more ${r} to research ${tech.name}` };
      }
    }

    // Deduct cost
    for (const r in tech.cost) this.state.res[r] -= tech.cost[r];

    // Start research
    this.state.activeResearch = {
      id: techId,
      startTime: Date.now(),
      duration: tech.time * 1000,
    };

    this.save(true);
    return { success: true };
  }

  /**
   * Upgrade the castle to next level
   */
  upgradeCastle() {
    const currentLevel = this.state.castleLevel || 1;
    if (!CastleSystem.canUpgrade(currentLevel)) {
      return { success: false, error: 'Castle is already at max level!' };
    }

    const nextLevel = currentLevel + 1;
    const cost = CastleSystem.getUpgradeCost(currentLevel);
    const time = CastleSystem.getUpgradeTime(currentLevel);

    // Check afford
    for (const r in cost) {
      if ((this.state.res[r] || 0) < cost[r]) {
        return { success: false, error: `Need more ${r} to upgrade Castle!` };
      }
    }

    // Deduct cost
    for (const r in cost) this.state.res[r] -= cost[r];

    // Queue castle upgrade
    const item = {
      id: this.construction.nextId++,
      type: 'castle-upgrade',
      buildingType: 'keep',
      x: Math.floor(GRID / 2),
      y: Math.floor(GRID / 2),
      level: nextLevel,
      startTime: Date.now(),
      duration: time,
      completed: false,
    };
    this.construction.queue.push(item);

    if (time === 0) {
      this.state.castleLevel = nextLevel;
      this.state.prestige = (this.state.prestige || 0) + CASTLE_LEVELS[nextLevel].prestigeGain;
      item.completed = true;
    }

    this.save(true);
    return { success: true, item, nextLevel, time };
  }

  /**
   * Get army power
   */
  getArmyPower() {
    let power = 0;
    for (const u in UNITS) {
      power += (this.state.army[u] || 0) * UNITS[u].power;
    }
    return power;
  }

  /**
   * Get total army count
   */
  getArmyCount() {
    return (this.state.army.spear || 0) + (this.state.army.archer || 0) + (this.state.army.knight || 0);
  }

  /**
   * Recruit a unit
   */
  recruitUnit(unitType, quantity = 1) {
    const def = UNITS[unitType];
    if (!def) return { success: false, error: 'Invalid unit' };

    for (let i = 0; i < quantity; i++) {
      // Check afford
      for (const res in def.cost) {
        if ((this.state.res[res] || 0) < def.cost[res]) {
          return { success: false, error: 'Not enough resources', recruited: i };
        }
      }

      // Pay
      for (const res in def.cost) {
        this.state.res[res] -= def.cost[res];
      }

      // Recruit
      this.state.army[unitType] = (this.state.army[unitType] || 0) + 1;
    }

    this.save(true);
    return { success: true, recruited: quantity };
  }

  /**
   * Attack a world target
   */
  attack(targetId) {
    const target = this.state.world.find((n) => n.id === targetId);
    if (!target) return { success: false, error: 'Target not found' };

    const power = this.getArmyPower();

    if (power <= 0) {
      return { success: false, error: 'No army!' };
    }

    const win = power >= target.strength;

    // Get hero effects for combat
    const heroEffects = HeroSystem.getEffects(this.state.hero);
    const heroAttackMult = heroEffects.armyAttackMult || 1;
    const effectivePower = Math.floor(power * heroAttackMult);
    const casualtyReduction = heroEffects.casualtyReduction || 0;
    const winWithHero = effectivePower >= target.strength;

    if (win || winWithHero) {
      // Calculate losses (lower if strong)
      const casualtyRate = Math.max(0.01, Math.min(0.5, target.strength / (effectivePower * 2.2)) - casualtyReduction);
      this.applyLosses(casualtyRate);

      if (target.outpost) {
        target.owned = true;
      } else {
        for (const r in target.loot) {
          this.state.res[r] = (this.state.res[r] || 0) + target.loot[r];
        }
      }

      // Award XP
      const xpGained = HeroSystem.battleXP(target.strength, 'victory');
      let levelsGained = 0;
      if (this.state.hero) levelsGained = HeroSystem.addXP(this.state.hero, xpGained);

      // Battle report
      const totalArmy = this.getArmyCount();
      const lootGained = target.loot || null;
      this.state.inbox = MessageSystem.add(this.state.inbox, createBattleReport({
        attacker: this.state.hero?.name || 'You',
        defender: target.name,
        attackerArmy: totalArmy,
        defenderStrength: target.strength,
        result: 'victory',
        casualties: Math.round(totalArmy * casualtyRate),
        loot: lootGained,
        targetName: target.name,
      }));

      this.save(true);
      return { success: true, result: 'victory', targetName: target.name, xpGained, levelsGained };
    } else {
      const casualtyRate = Math.max(0.05, Math.min(0.85, 0.4 + target.strength / (effectivePower * 3)) - casualtyReduction);
      this.applyLosses(casualtyRate);

      const xpGained = HeroSystem.battleXP(target.strength, 'defeat');
      if (this.state.hero) HeroSystem.addXP(this.state.hero, xpGained);

      const totalArmy = this.getArmyCount();
      this.state.inbox = MessageSystem.add(this.state.inbox, createBattleReport({
        attacker: this.state.hero?.name || 'You',
        defender: target.name,
        attackerArmy: totalArmy,
        defenderStrength: target.strength,
        result: 'defeat',
        casualties: Math.round(totalArmy * casualtyRate),
        loot: null,
        targetName: target.name,
      }));

      this.save(true);
      return { success: true, result: 'defeat', targetName: target.name, xpGained };
    }
  }

  /**
   * Apply losses to army
   */
  applyLosses(fraction) {
    for (const u in UNITS) {
      const lost = Math.round((this.state.army[u] || 0) * fraction);
      this.state.army[u] = Math.max(0, (this.state.army[u] || 0) - lost);
    }
  }

  /**
   * Save game
   */
  save(silent = false) {
    this.state.construction = this.construction;
    return SaveSystem.save(this.state, silent);
  }

  /**
   * Load game
   */
  load() {
    const saved = SaveSystem.load();
    if (saved) {
      this.state = saved;
      if (saved.construction) {
        this.construction.fromJSON(saved.construction);
      }
      return true;
    }
    return false;
  }

  /**
   * Reset game
   */
  reset() {
    SaveSystem.delete();
    this.state = this.freshState();
    this.construction = new ConstructionSystem();
    this.ensureKeep();
    this.save(true);
  }
}
