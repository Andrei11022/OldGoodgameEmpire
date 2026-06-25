/**
 * FREE EMPIRE - Save System
 * Persistent game state to localStorage
 * Handles migrations from old save format to new
 */

import { SAVE_KEY, BUILDINGS, UNITS } from './config.js';

export class SaveSystem {
  /**
   * Save game state to localStorage
   */
  static save(state, silent = false) {
    try {
      const saveData = {
        version: 4,
        timestamp: Date.now(),
        res: state.res,
        army: state.army,
        tiles: state.tiles,
        cam: state.cam,
        world: state.world,
        view: state.view,
        construction: state.construction.toJSON(),
        buildingLevels: state.buildingLevels || {},
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));

      if (!silent) {
        return { success: true, message: 'Empire saved! 💾' };
      }
      return { success: true };
    } catch (e) {
      const msg = "Couldn't save (storage blocked)";
      if (!silent) {
        return { success: false, message: msg };
      }
      return { success: false, message: msg };
    }
  }

  /**
   * Load game state from localStorage
   */
  static load() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) return null;

      const save = JSON.parse(data);

      // Version 3 (old format without timers)
      if (!save.version || save.version < 4) {
        return SaveSystem.migrateV3toV4(save);
      }

      // Ensure new v4+ fields exist (forward-compat for sessions started before new systems)
      save.castleLevel = save.castleLevel || 1;
      save.prestige = save.prestige || 0;
      save.researched = save.researched || [];
      save.activeResearch = save.activeResearch || null;
      save.questsCompleted = save.questsCompleted || [];
      save.inbox = save.inbox || [];
      if (!save.hero) {
        save.hero = { name: 'Lord', level: 1, xp: 0, skillPoints: 0, skills: { attack: 0, defense: 0, gathering: 0, construction: 0 } };
      }

      return save;
    } catch (e) {
      console.error('Save load error:', e);
      return null;
    }
  }

  /**
   * Migrate old save (v3 no timers) to new format (v4 with timers)
   */
  static migrateV3toV4(oldSave) {
    console.log('Migrating save from v3 to v4...');

    return {
      version: 4,
      timestamp: Date.now(),
      res: oldSave.res || { wood: 200, stone: 150, food: 200, gold: 100 },
      army: oldSave.army || { spear: 0, archer: 0, knight: 0 },
      tiles: oldSave.tiles || {},
      cam: oldSave.cam || { x: 0, y: 0, set: false },
      world: oldSave.world || [],
      view: oldSave.view || 'castle',
      construction: {
        queue: [],
        nextId: 1,
      },
      buildingLevels: {}, // All buildings start at level 1
    };
  }

  /**
   * Delete save (for reset)
   */
  static delete() {
    try {
      localStorage.removeItem(SAVE_KEY);
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  }

  /**
   * Get save info (for debug)
   */
  static getInfo() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) return null;
      const save = JSON.parse(data);
      return {
        version: save.version,
        timestamp: new Date(save.timestamp).toLocaleString(),
        resources: save.res,
        army: save.army,
        buildingCount: Object.keys(save.tiles).length,
      };
    } catch (e) {
      return null;
    }
  }
}
