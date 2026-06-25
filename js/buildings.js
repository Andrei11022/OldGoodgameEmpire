/**
 * FREE EMPIRE - Building System
 * Handles building placement, levels, production, capacity
 */

import { BUILDINGS, TOOLS } from './config.js';
import { ConstructionSystem } from './construction.js';

export class BuildingSystem {
  /**
   * Get building definition by type
   */
  static getBuilding(buildingType) {
    return BUILDINGS[buildingType] || null;
  }

  /**
   * Get current level of a building at tile
   */
  static getLevel(buildingLevels, x, y) {
    const key = `${x},${y}`;
    return buildingLevels[key] || 1;
  }

  /**
   * Set building level
   */
  static setLevel(buildingLevels, x, y, level) {
    const key = `${x},${y}`;
    buildingLevels[key] = Math.max(1, level);
  }

  /**
   * Increment building level (upgrade)
   */
  static incrementLevel(buildingLevels, x, y) {
    const key = `${x},${y}`;
    const current = buildingLevels[key] || 1;
    buildingLevels[key] = current + 1;
  }

  /**
   * Can this building be upgraded?
   */
  static canUpgrade(buildingDef, currentLevel) {
    if (!buildingDef.maxLevel) return false;
    return currentLevel < buildingDef.maxLevel;
  }

  /**
   * Get next upgrade level
   */
  static getNextLevel(buildingDef, currentLevel) {
    if (!this.canUpgrade(buildingDef, currentLevel)) return null;
    return currentLevel + 1;
  }

  /**
   * Get total production from all buildings
   */
  static getTotalProduction(tiles, buildingLevels, buildings = BUILDINGS) {
    const prod = { wood: 0, stone: 0, food: 0, gold: 0 };

    for (const key in tiles) {
      const tile = tiles[key];
      const buildingDef = buildings[tile.type];

      if (!buildingDef || !buildingDef.baseProd) continue;

      const [x, y] = key.split(',').map(Number);
      const level = this.getLevel(buildingLevels, x, y);
      const production = ConstructionSystem.getProduction(buildingDef, level);

      for (const resource in production) {
        prod[resource] = (prod[resource] || 0) + production[resource];
      }
    }

    return prod;
  }

  /**
   * Get total storage capacity
   */
  static getTotalCapacity(tiles, buildingLevels, buildings = BUILDINGS) {
    const caps = { wood: 0, stone: 0, food: 0 };

    for (const key in tiles) {
      const tile = tiles[key];
      const buildingDef = buildings[tile.type];

      if (!buildingDef || !buildingDef.baseCaps) continue;

      const [x, y] = key.split(',').map(Number);
      const level = this.getLevel(buildingLevels, x, y);
      const capacity = ConstructionSystem.getCapacity(buildingDef, level);

      for (const resource in capacity) {
        caps[resource] = (caps[resource] || 0) + capacity[resource];
      }
    }

    return caps;
  }

  /**
   * Get total population capacity from houses
   */
  static getTotalPopCap(tiles, buildingLevels, buildings = BUILDINGS) {
    let cap = 0;

    for (const key in tiles) {
      const tile = tiles[key];
      const buildingDef = buildings[tile.type];

      if (!buildingDef || !buildingDef.popCap) continue;

      cap += buildingDef.popCap;
    }

    return cap;
  }

  /**
   * Get total defense from towers/walls
   */
  static getTotalDefense(tiles, buildings = BUILDINGS) {
    let defense = 0;

    for (const key in tiles) {
      const tile = tiles[key];
      const buildingDef = buildings[tile.type];

      if (!buildingDef || !buildingDef.defense) continue;

      defense += buildingDef.defense;
    }

    return defense;
  }

  /**
   * Get workers used (population needed)
   */
  static getPopulationUsed(tiles, buildings = BUILDINGS) {
    let used = 0;

    for (const key in tiles) {
      const tile = tiles[key];
      const buildingDef = buildings[tile.type];

      if (!buildingDef || !buildingDef.needsWorker) continue;

      used += buildingDef.needsWorker;
    }

    return used;
  }

  /**
   * Can player afford to build/upgrade a building?
   */
  static canAfford(buildingDef, resources, level = 1) {
    const cost = ConstructionSystem.getCost(buildingDef, level);

    for (const resource in cost) {
      if ((resources[resource] || 0) < cost[resource]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Deduct building cost from resources
   */
  static pay(buildingDef, resources, level = 1) {
    const cost = ConstructionSystem.getCost(buildingDef, level);

    for (const resource in cost) {
      resources[resource] = (resources[resource] || 0) - cost[resource];
    }
  }

  /**
   * Refund 50% of building cost
   */
  static refund(buildingDef, resources, level = 1) {
    const cost = ConstructionSystem.getCost(buildingDef, level);

    for (const resource in cost) {
      resources[resource] = (resources[resource] || 0) + Math.floor(cost[resource] * 0.5);
    }
  }

  /**
   * Get info string for a building at a level
   */
  static getInfoString(buildingDef, level) {
    let info = `${buildingDef.gi} ${buildingDef.name} Lvl ${level}`;

    if (buildingDef.baseProd) {
      const prod = ConstructionSystem.getProduction(buildingDef, level);
      const prodStr = Object.entries(prod)
        .map(([res, val]) => `+${val} ${res}/s`)
        .join(', ');
      if (prodStr) info += ` (${prodStr})`;
    }

    return info;
  }

  /**
   * Check if a building is at max level
   */
  static isMaxLevel(buildingDef, level) {
    if (!buildingDef.maxLevel) return true;
    return level >= buildingDef.maxLevel;
  }
}
