/**
 * FREE EMPIRE - Animation Manager
 * Centralized per-instance animation state/timing.
 * Renderer should query this manager for frame selection.
 */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function frameRectForSheet(frameIndex, frameSize, columns = null) {
  if (!frameSize) return null;
  const cols = Math.max(1, columns || Number.MAX_SAFE_INTEGER);
  const col = frameIndex % cols;
  const row = Math.floor(frameIndex / cols);
  return {
    x: col * frameSize.width,
    y: row * frameSize.height,
    width: frameSize.width,
    height: frameSize.height,
  };
}

export const ANIMATION_TYPES = {
  IDLE: 'Idle',
  CONSTRUCTION: 'Construction',
  UPGRADE: 'Upgrade',
  DESTROYED: 'Destroyed',
  ATTACK: 'Attack',
  WALK: 'Walk',
  DEATH: 'Death',
  HARVEST: 'Harvest',
  SMOKE: 'Smoke',
  WATER: 'Water',
  FIRE: 'Fire',
  FLAGS: 'Flags',
  WINDMILL: 'Windmill',
};

export class AnimationManager {
  constructor() {
    this.instances = new Map();
    this.paused = false;
    this.lastUpdateTime = performance.now();
    this.eventQueue = [];
    this.defaultBlendMs = 120;
  }

  /**
   * AnimationManager.play(instanceId, options)
   */
  play(instanceId, options = {}) {
    if (!instanceId) return null;

    const now = performance.now();
    const frameCount = Math.max(1, options.frameCount || 1);
    const frameMs = Math.max(1, options.frameMs || 120);
    const speed = Math.max(0.01, options.speedMultiplier || 1);

    const existing = this.instances.get(instanceId);

    const base = {
      id: instanceId,
      clip: options.clip || 'idle',
      assetId: options.assetId || null,
      sourceType: options.sourceType || 'single', // single | sheet | atlas | skeletal
      frameCount,
      frameMs,
      frameRate: 1000 / frameMs,
      frameSize: options.frameSize || null,
      atlasFrames: Array.isArray(options.atlasFrames) ? options.atlasFrames : null,
      skeletalData: options.skeletalData || null,
      loop: options.loop !== false,
      playOnce: !!options.playOnce,
      reverse: !!options.reverse,
      speedMultiplier: speed,
      randomIdleOffset: !!options.randomIdleOffset,
      speedModifier: options.speedModifier == null ? 1 : Math.max(0.01, options.speedModifier),
      perInstanceSpeed: options.perInstanceSpeed == null ? 1 : Math.max(0.01, options.perInstanceSpeed),
      paused: false,
      stopped: false,
      elapsedMs: 0,
      currentFrame: 0,
      currentCycle: 0,
      completed: false,
      startedAt: now,
      updatedAt: now,
      frameEvents: options.frameEvents || {}, // { frameIndex: [{ type, payload }] }
      eventHandler: typeof options.eventHandler === 'function' ? options.eventHandler : null,
      blend: options.blend || null,
      blendTimeMs: 0,
      blendDurationMs: Math.max(1, options.blendDurationMs || this.defaultBlendMs),
    };

    if (base.randomIdleOffset && base.clip.toLowerCase() === 'idle' && base.frameCount > 1) {
      base.elapsedMs = Math.random() * base.frameCount * base.frameMs;
    }

    if (existing && options.blend) {
      base.blend = {
        fromClip: existing.clip,
        toClip: base.clip,
      };
      base.blendTimeMs = 0;
    }

    this.instances.set(instanceId, base);
    return base;
  }

  /**
   * AnimationManager.stop(instanceId)
   */
  stop(instanceId) {
    this.instances.delete(instanceId);
  }

  /**
   * AnimationManager.pause(instanceId?)
   */
  pause(instanceId = null) {
    if (!instanceId) {
      this.paused = true;
      return;
    }
    const inst = this.instances.get(instanceId);
    if (inst) inst.paused = true;
  }

  /**
   * AnimationManager.resume(instanceId?)
   */
  resume(instanceId = null) {
    if (!instanceId) {
      this.paused = false;
      this.lastUpdateTime = performance.now();
      return;
    }
    const inst = this.instances.get(instanceId);
    if (inst) inst.paused = false;
  }

  /**
   * AnimationManager.update(nowMs)
   */
  update(nowMs = performance.now()) {
    const dt = Math.max(0, nowMs - this.lastUpdateTime);
    this.lastUpdateTime = nowMs;
    if (this.paused) return;

    for (const [id, inst] of this.instances.entries()) {
      if (inst.paused || inst.stopped || inst.completed) continue;

      const speed = inst.speedMultiplier * inst.speedModifier * inst.perInstanceSpeed;
      const delta = dt * speed;
      inst.elapsedMs += delta;
      inst.updatedAt = nowMs;

      if (inst.blend) {
        inst.blendTimeMs = clamp(inst.blendTimeMs + delta, 0, inst.blendDurationMs);
        if (inst.blendTimeMs >= inst.blendDurationMs) {
          inst.blend = null;
          inst.blendTimeMs = 0;
        }
      }

      const totalDuration = inst.frameCount * inst.frameMs;
      if (totalDuration <= 0) {
        inst.currentFrame = 0;
        continue;
      }

      if (inst.loop) {
        const beforeCycle = Math.floor(inst.elapsedMs / totalDuration);
        inst.elapsedMs = inst.elapsedMs % totalDuration;
        const afterCycle = Math.floor(inst.elapsedMs / totalDuration);
        if (afterCycle < beforeCycle) {
          inst.currentCycle += 1;
        }
      } else {
        inst.elapsedMs = Math.min(inst.elapsedMs, totalDuration - 1);
      }

      let frame = Math.floor(inst.elapsedMs / inst.frameMs);
      frame = clamp(frame, 0, inst.frameCount - 1);
      if (inst.reverse) frame = inst.frameCount - 1 - frame;

      const prevFrame = inst.currentFrame;
      inst.currentFrame = frame;

      if (frame !== prevFrame) {
        this.#emitFrameEvents(inst, frame);
      }

      if ((inst.playOnce || !inst.loop) && inst.elapsedMs >= totalDuration - 1) {
        inst.completed = true;
      }
    }

    for (const [id, inst] of this.instances.entries()) {
      if (inst.completed && inst.playOnce) {
        this.instances.delete(id);
      }
    }
  }

  /**
   * AnimationManager.getFrame(instanceId)
   */
  getFrame(instanceId) {
    const inst = this.instances.get(instanceId);
    if (!inst) return null;

    let rect = null;
    if (inst.sourceType === 'sheet') {
      rect = frameRectForSheet(inst.currentFrame, inst.frameSize, inst.columns || null);
    } else if (inst.sourceType === 'atlas') {
      if (inst.atlasFrames && inst.atlasFrames[inst.currentFrame]) {
        rect = inst.atlasFrames[inst.currentFrame];
      }
    } else if (inst.sourceType === 'skeletal') {
      rect = null;
    }

    return {
      instanceId: inst.id,
      clip: inst.clip,
      sourceType: inst.sourceType,
      frameIndex: inst.currentFrame,
      frameRate: inst.frameRate,
      frameRect: rect,
      elapsedMs: inst.elapsedMs,
      durationMs: inst.frameCount * inst.frameMs,
      blend: inst.blend
        ? {
            fromClip: inst.blend.fromClip,
            toClip: inst.blend.toClip,
            t: clamp(inst.blendTimeMs / Math.max(1, inst.blendDurationMs), 0, 1),
          }
        : null,
    };
  }

  getInstance(instanceId) {
    return this.instances.get(instanceId) || null;
  }

  getActiveAnimations() {
    return [...this.instances.values()].map((inst) => ({
      id: inst.id,
      clip: inst.clip,
      frameIndex: inst.currentFrame,
      frameRate: inst.frameRate,
      sourceType: inst.sourceType,
      elapsedMs: inst.elapsedMs,
      durationMs: inst.frameCount * inst.frameMs,
      speedMultiplier: inst.speedMultiplier,
      reverse: inst.reverse,
      loop: inst.loop,
      blendActive: !!inst.blend,
      paused: inst.paused,
    }));
  }

  getDebugStats() {
    const active = this.getActiveAnimations();
    const atlasUsage = active.filter((a) => a.sourceType === 'atlas').length;
    return {
      activeCount: active.length,
      atlasUsage,
      animations: active,
    };
  }

  drainEvents() {
    const out = this.eventQueue;
    this.eventQueue = [];
    return out;
  }

  #emitFrameEvents(inst, frameIndex) {
    const events = inst.frameEvents?.[frameIndex];
    if (!events || events.length === 0) return;
    for (const e of events) {
      const payload = {
        instanceId: inst.id,
        clip: inst.clip,
        frameIndex,
        type: e.type || 'frame',
        payload: e.payload || null,
        timestamp: performance.now(),
      };
      this.eventQueue.push(payload);
      if (inst.eventHandler) {
        try {
          inst.eventHandler(payload);
        } catch {
          // Do not break render loop on event handler errors.
        }
      }
    }
  }
}
