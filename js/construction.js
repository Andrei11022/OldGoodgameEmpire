/**
 * FREE EMPIRE - Construction Timer System
 * Manages building construction, upgrades, and queues
 */

/**
 * Construction Queue Entry
 * {
 *   id: unique identifier
 *   type: 'build' | 'upgrade'
 *   x, y: tile position (for build)
 *   buildingType: which building (house, farm, etc)
 *   level: target level (for upgrades)
 *   startTime: timestamp when started
 *   duration: milliseconds to complete
 *   completed: boolean
 * }
 */

export class ConstructionSystem {
  constructor() {
    this.queue = [];
    this.nextId = 1;
  }

  /**
   * Get construction cost for a building at given level
   */
  static getCost(buildingDef, level = 1) {
    if (level < 1 || (buildingDef.maxLevel && level > buildingDef.maxLevel)) {
      return null;
    }

    // Level 1 = base cost
    if (level === 1) {
      return buildingDef.baseCost || buildingDef.cost || {};
    }

    // Use formula if available
    if (buildingDef.levelFormula?.cost) {
      return buildingDef.levelFormula.cost(level);
    }

    return buildingDef.baseCost || buildingDef.cost || {};
  }

  /**
   * Get production for a building at given level
   */
  static getProduction(buildingDef, level = 1) {
    if (level < 1 || (buildingDef.maxLevel && level > buildingDef.maxLevel)) {
      return {};
    }

    if (level === 1) {
      return buildingDef.baseProd || buildingDef.prod || {};
    }

    if (buildingDef.levelFormula?.prod) {
      return buildingDef.levelFormula.prod(level);
    }

    return buildingDef.baseProd || buildingDef.prod || {};
  }

  /**
   * Get storage capacity for a building at given level
   */
  static getCapacity(buildingDef, level = 1) {
    if (level < 1 || (buildingDef.maxLevel && level > buildingDef.maxLevel)) {
      return {};
    }

    if (level === 1) {
      return buildingDef.baseCaps || buildingDef.caps || {};
    }

    if (buildingDef.levelFormula?.caps) {
      return buildingDef.levelFormula.caps(level);
    }

    return buildingDef.baseCaps || buildingDef.caps || {};
  }

  /**
   * Get construction time in milliseconds for a building at given level
   */
  static getConstructionTime(buildingDef, level = 1) {
    if (level < 1 || (buildingDef.maxLevel && level > buildingDef.maxLevel)) {
      return 0;
    }

    if (buildingDef.buildTime === 0) {
      return 0; // Instant (keep, barracks in Phase 1)
    }

    const baseTime = buildingDef.baseTime || buildingDef.buildTime || 10;

    if (level === 1) {
      return baseTime * 1000; // Convert to ms
    }

    if (buildingDef.levelFormula?.time) {
      return buildingDef.levelFormula.time(level) * 1000;
    }

    return baseTime * 1000;
  }

  /**
   * Queue a new building construction
   */
  queueBuild(x, y, buildingType, buildingDef) {
    const duration = ConstructionSystem.getConstructionTime(buildingDef, 1);
    const item = {
      id: this.nextId++,
      type: 'build',
      x,
      y,
      buildingType,
      level: 1,
      startTime: Date.now(),
      duration,
      completed: false,
    };
    this.queue.push(item);
    return item;
  }

  /**
   * Queue a building upgrade
   */
  queueUpgrade(x, y, buildingType, currentLevel, buildingDef) {
    const nextLevel = currentLevel + 1;
    if (!buildingDef.maxLevel || nextLevel > buildingDef.maxLevel) {
      return null; // Can't upgrade beyond max
    }

    const duration = ConstructionSystem.getConstructionTime(buildingDef, nextLevel);
    const item = {
      id: this.nextId++,
      type: 'upgrade',
      x,
      y,
      buildingType,
      level: nextLevel,
      startTime: Date.now(),
      duration,
      completed: false,
    };
    this.queue.push(item);
    return item;
  }

  /**
   * Get current construction item (building action in progress)
   */
  getCurrentConstruction() {
    return this.queue[0] || null;
  }

  /**
   * Get all active construction items
   */
  getActiveConstruction() {
    return this.queue.filter((item) => !item.completed);
  }

  /**
   * Get construction progress (0-1) for first item
   */
  getProgress() {
    const current = this.getCurrentConstruction();
    if (!current || current.completed) return 1;

    const elapsed = Date.now() - current.startTime;
    const progress = Math.min(1, elapsed / current.duration);
    return progress;
  }

  /**
   * Get remaining time in milliseconds for current construction
   */
  getRemainingTime() {
    const current = this.getCurrentConstruction();
    if (!current || current.completed) return 0;

    const elapsed = Date.now() - current.startTime;
    const remaining = Math.max(0, current.duration - elapsed);
    return remaining;
  }

  /**
   * Format remaining time as human-readable string
   */
  formatTime(ms) {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.ceil(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.ceil(hours / 24);
    return `${days}d`;
  }

  /**
   * Check if first construction is done and remove it
   */
  tick() {
    // Purge any stale completed items from the front first
    while (this.queue.length > 0 && this.queue[0].completed) {
      this.queue.shift();
    }

    const current = this.queue[0];
    if (current && !current.completed) {
      const elapsed = Date.now() - current.startTime;
      if (elapsed >= current.duration) {
        current.completed = true;
        this.queue.shift(); // Remove from queue immediately
        return current;     // Return to engine for processing
      }
    }
    return null;
  }

  /**
   * Clear queue (debug/reset)
   */
  clear() {
    this.queue = [];
  }

  /**
   * Serialize for save
   */
  toJSON() {
    return {
      queue: this.queue,
      nextId: this.nextId,
    };
  }

  /**
   * Deserialize from save
   */
  fromJSON(data) {
    if (!data) return;
    this.queue = data.queue || [];
    this.nextId = data.nextId || 1;
  }
}
