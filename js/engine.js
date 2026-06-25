/**
 * FREE EMPIRE - Game Engine
 * Core game loop, state management, and system integration
 */

import { TICK_MS, BUILDINGS, UNITS, GATE, GRID, freshWorld } from './config.js';
import { ConstructionSystem } from './construction.js';
import { SaveSystem } from './save.js';
import { BuildingSystem } from './buildings.js';

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

  /**
   * Place a building
   */
  placeBuilding(x, y, buildingType) {
    const def = BUILDINGS[buildingType];
    if (!def) return { success: false, error: 'Invalid building' };

    const key = `${x},${y}`;

    // Check tile empty
    if (this.state.tiles[key]) {
      return { success: false, error: 'Tile occupied' };
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
   * Process construction queue
   */
  tickConstruction() {
    const completed = this.construction.tick();

    if (completed) {
      if (completed.type === 'build') {
        const key = `${completed.x},${completed.y}`;
        this.state.tiles[key] = { type: completed.buildingType };
        this.building.setLevel(this.state.buildingLevels, completed.x, completed.y, 1);
        return completed;
      } else if (completed.type === 'upgrade') {
        this.building.incrementLevel(this.state.buildingLevels, completed.x, completed.y);
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

    this.tickCount++;

    // Save every 10 ticks
    if (this.tickCount % 10 === 0) {
      this.save(true);
    }

    return { stats, constructionDone };
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

    // Adjust food production by population
    prod.food -= popUsed * 0.5;

    return { caps, prod, popCap, popUsed, defense };
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

    if (win) {
      // Calculate losses (lower if strong)
      const casualtyRate = Math.min(0.5, target.strength / (power * 2.2));
      this.applyLosses(casualtyRate);

      if (target.outpost) {
        target.owned = true;
      } else {
        for (const r in target.loot) {
          this.state.res[r] = (this.state.res[r] || 0) + target.loot[r];
        }
      }

      this.save(true);
      return { success: true, result: 'victory', targetName: target.name };
    } else {
      // Calculate losses (higher if weak)
      const casualtyRate = Math.min(0.85, 0.4 + target.strength / (power * 3));
      this.applyLosses(casualtyRate);

      this.save(true);
      return { success: true, result: 'defeat', targetName: target.name };
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
