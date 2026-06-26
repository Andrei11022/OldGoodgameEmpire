/**
 * FREE EMPIRE - Sprite Renderer
 * Pure rendering adapter: sprite-first, procedural-fallback.
 * No gameplay logic is allowed in this module.
 */

function identity(value) {
  return value;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

export class SpriteRenderer {
  constructor(assetManager, options = {}) {
    this.assets = assetManager;
    this.animationManager = options.animationManager || null;
    this.tileW = options.tileW || 64;
    this.tileH = options.tileH || 32;

    this.toScreen = options.toScreen || ((x, y) => ({ sx: x, sy: y }));

    this.fallbacks = {
      building: options.fallbackBuilding || identity,
      castle: options.fallbackCastle || options.fallbackBuilding || identity,
      wall: options.fallbackWall || options.fallbackBuilding || identity,
      decoration: options.fallbackDecoration || options.fallbackBuilding || identity,
      unit: options.fallbackUnit || identity,
      effect: options.fallbackEffect || identity,
      construction: options.fallbackConstruction || options.fallbackBuilding || identity,
    };

    this.nightTint = 'rgba(22,35,68,0.25)';
    this.selectionColor = '#f2c14e';

    this.debug = {
      frameDrawCalls: 0,
      frameSpriteDraws: 0,
      frameFallbackDraws: 0,
      lastAssetId: null,
      lastStatus: 'none',
      lastPath: null,
      lastAnimationFrame: null,
      lastAnimationFps: null,
      lastAnimationTimeMs: null,
    };
  }

  beginFrame() {
    this.debug.frameDrawCalls = 0;
    this.debug.frameSpriteDraws = 0;
    this.debug.frameFallbackDraws = 0;
  }

  getDebugStats() {
    return {
      drawCalls: this.debug.frameDrawCalls,
      spriteDraws: this.debug.frameSpriteDraws,
      fallbackDraws: this.debug.frameFallbackDraws,
      lastAssetId: this.debug.lastAssetId,
      lastStatus: this.debug.lastStatus,
      lastPath: this.debug.lastPath,
      lastAnimationFrame: this.debug.lastAnimationFrame,
      lastAnimationFps: this.debug.lastAnimationFps,
      lastAnimationTimeMs: this.debug.lastAnimationTimeMs,
    };
  }

  drawBuilding(ctx, payload = {}) {
    this.debug.frameDrawCalls += 1;
    const type = payload.type;
    const level = payload.level || 1;
    const meta = this.assets.getSpriteMeta('buildings', type);
    const image = this.assets.getBuildingSprite(type, level, {
      season: payload.season || null,
      night: !!payload.night,
      variation: payload.variation || null,
    });

    if (!image) {
      this.debug.frameFallbackDraws += 1;
      this.debug.lastAssetId = meta?.id || null;
      this.debug.lastStatus = 'fallback';
      return this.fallbacks.building(payload);
    }

    this.debug.frameSpriteDraws += 1;
    this.debug.lastAssetId = meta?.id || null;
    this.debug.lastStatus = 'sprite';
    this.#drawSprite(ctx, image, payload, meta, 'Idle');
    return true;
  }

  drawCastle(ctx, payload = {}) {
    this.debug.frameDrawCalls += 1;
    const meta = this.assets.getSpriteMeta('castle', 'core');
    const image = this.assets.getCastleSprite(payload.level || 1, {
      season: payload.season || null,
      night: !!payload.night,
      variation: payload.variation || null,
    });

    if (!image) {
      this.debug.frameFallbackDraws += 1;
      this.debug.lastAssetId = meta?.id || null;
      this.debug.lastStatus = 'fallback';
      return this.fallbacks.castle(payload);
    }

    this.debug.frameSpriteDraws += 1;
    this.debug.lastAssetId = meta?.id || null;
    this.debug.lastStatus = 'sprite';
    this.#drawSprite(ctx, image, payload, meta, 'Idle');
    return true;
  }

  drawWall(ctx, payload = {}) {
    this.debug.frameDrawCalls += 1;
    const meta = this.assets.getSpriteMeta('castle', 'wall');
    const image = this.assets.getWallSprite(payload.level || 1, {
      season: payload.season || null,
      night: !!payload.night,
      variation: payload.variation || null,
    });

    if (!image) {
      this.debug.frameFallbackDraws += 1;
      this.debug.lastAssetId = meta?.id || null;
      this.debug.lastStatus = 'fallback';
      return this.fallbacks.wall(payload);
    }

    this.debug.frameSpriteDraws += 1;
    this.debug.lastAssetId = meta?.id || null;
    this.debug.lastStatus = 'sprite';
    this.#drawSprite(ctx, image, payload, meta, 'Idle');
    return true;
  }

  drawDecoration(ctx, payload = {}) {
    this.debug.frameDrawCalls += 1;
    const meta = this.assets.getSpriteMeta('decorations', payload.type);
    const image = this.assets.getDecorationSprite(payload.type, {
      season: payload.season || null,
      night: !!payload.night,
      variation: payload.variation || null,
    });

    if (!image) {
      this.debug.frameFallbackDraws += 1;
      this.debug.lastAssetId = meta?.id || null;
      this.debug.lastStatus = 'fallback';
      return this.fallbacks.decoration(payload);
    }

    this.debug.frameSpriteDraws += 1;
    this.debug.lastAssetId = meta?.id || null;
    this.debug.lastStatus = 'sprite';
    this.#drawSprite(ctx, image, payload, meta, this.#inferAnimationType(payload.type, 'Idle'));
    return true;
  }

  drawUnit(ctx, payload = {}) {
    this.debug.frameDrawCalls += 1;
    const meta = this.assets.getSpriteMeta('units', payload.type);
    const image = this.assets.getUnitSprite(payload.type, {
      season: payload.season || null,
      night: !!payload.night,
      variation: payload.variation || null,
    });

    if (!image) {
      this.debug.frameFallbackDraws += 1;
      this.debug.lastAssetId = meta?.id || null;
      this.debug.lastStatus = 'fallback';
      return this.fallbacks.unit(payload);
    }

    this.debug.frameSpriteDraws += 1;
    this.debug.lastAssetId = meta?.id || null;
    this.debug.lastStatus = 'sprite';
    this.#drawSprite(ctx, image, payload, meta, this.#inferAnimationType(payload.type, 'Walk'));
    return true;
  }

  drawEffect(ctx, payload = {}) {
    this.debug.frameDrawCalls += 1;
    const meta = this.assets.getSpriteMeta('effects', payload.type);
    const image = this.assets.getEffectSprite(payload.type, {
      season: payload.season || null,
      night: !!payload.night,
      variation: payload.variation || null,
    });

    if (!image) {
      this.debug.frameFallbackDraws += 1;
      this.debug.lastAssetId = meta?.id || null;
      this.debug.lastStatus = 'fallback';
      return this.fallbacks.effect(payload);
    }

    this.debug.frameSpriteDraws += 1;
    this.debug.lastAssetId = meta?.id || null;
    this.debug.lastStatus = 'sprite';
    this.#drawSprite(ctx, image, payload, meta, this.#inferAnimationType(payload.type, 'Smoke'));
    return true;
  }

  drawConstruction(ctx, payload = {}) {
    this.debug.frameDrawCalls += 1;
    const meta = this.assets.getSpriteMeta('buildings', payload.type);
    const image = this.assets.getBuildingSprite(payload.type, payload.level || 1, {
      season: payload.season || null,
      night: !!payload.night,
      variation: 'construction',
    });

    if (!image) {
      this.debug.frameFallbackDraws += 1;
      this.debug.lastAssetId = meta?.id || null;
      this.debug.lastStatus = 'fallback';
      return this.fallbacks.construction(payload);
    }

    this.debug.frameSpriteDraws += 1;
    this.debug.lastAssetId = meta?.id || null;
    this.debug.lastStatus = 'sprite';
    this.#drawSprite(ctx, image, {
      ...payload,
      constructionProgress: payload.progress,
    }, meta, 'Construction');
    return true;
  }

  #drawSprite(ctx, image, payload, meta = null, animationType = 'Idle') {
    const pos = this.toScreen(payload.x || 0, payload.y || 0);
    const anchorX = pos.sx;
    const anchorY = pos.sy + this.tileH;

    const rotation = payload.rotation || 0;
    const scale = payload.scale || 1;
    const alpha = payload.alpha == null ? 1 : clamp01(payload.alpha);

    const frameState = this.#resolveFrameState(payload, meta, animationType);
    const spriteSheet = frameState.spriteSheet;
    const frameRect = frameState.frameRect;

    const drawWidth = payload.drawWidth || image.width;
    const drawHeight = payload.drawHeight || image.height;
    const width = drawWidth * scale;
    const height = drawHeight * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(anchorX, anchorY);
    if (rotation) ctx.rotate(rotation);

    if (spriteSheet && frameRect) {
      ctx.drawImage(
        image,
        frameRect.x,
        frameRect.y,
        frameRect.width,
        frameRect.height,
        -width / 2,
        -height,
        width,
        height
      );
    } else {
      ctx.drawImage(image, -width / 2, -height, width, height);
    }

    if (payload.highlightTint) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = payload.highlightTint;
      ctx.fillRect(-width / 2, -height, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }

    if (payload.damageOverlay) {
      const intensity = clamp01(payload.damageOverlay);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(120,0,0,${0.2 + intensity * 0.45})`;
      ctx.fillRect(-width / 2, -height, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }

    if (payload.night) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = this.nightTint;
      ctx.fillRect(-width / 2, -height, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }

    if (payload.constructionProgress != null) {
      const progress = clamp01(payload.constructionProgress);
      const hiddenHeight = height * (1 - progress);
      ctx.fillStyle = 'rgba(30,20,10,0.5)';
      ctx.fillRect(-width / 2, -height, width, hiddenHeight);
    }

    if (payload.selected) {
      ctx.strokeStyle = this.selectionColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(-width / 2, -height, width, height);
    }

    if (payload.selectionOutline) {
      ctx.strokeStyle = payload.selectionOutline;
      ctx.lineWidth = 2;
      ctx.strokeRect(-width / 2, -height, width, height);
    }

    ctx.restore();
  }

  #resolveFrameState(payload, meta, animationType) {
    const sourceType = payload.sourceType || meta?.sourceType || 'single';
    const frameCount = Math.max(1, payload.frameCount || meta?.frameCount || 1);
    const frameSize = payload.frameSize || meta?.frameSize || null;

    if (!this.animationManager || frameCount <= 1) {
      this.debug.lastAnimationFrame = 0;
      this.debug.lastAnimationFps = frameCount > 1 ? Math.round(1000 / Math.max(1, meta?.frameMs || 120)) : null;
      this.debug.lastAnimationTimeMs = 0;
      return {
        spriteSheet: sourceType === 'sheet' || sourceType === 'atlas',
        frameRect: frameSize ? { x: 0, y: 0, width: frameSize.width, height: frameSize.height } : null,
      };
    }

    const instanceId = payload.instanceId || this.#buildInstanceId(payload, meta, animationType);
    const existing = this.animationManager.getInstance(instanceId);
    if (!existing) {
      this.animationManager.play(instanceId, {
        clip: animationType,
        assetId: meta?.id || null,
        sourceType,
        frameCount,
        frameMs: payload.frameMs || meta?.frameMs || 120,
        frameSize,
        atlasFrames: payload.atlasFrames || null,
        loop: payload.loop !== false,
        playOnce: !!payload.playOnce,
        reverse: !!payload.reverse,
        speedMultiplier: payload.speedMultiplier || 1,
        frameEvents: payload.frameEvents || {},
        randomIdleOffset: payload.randomIdleOffset !== false,
        speedModifier: payload.speedModifier || 1,
        perInstanceSpeed: payload.perInstanceSpeed || 1,
        blend: payload.blend || null,
      });
    }

    const frame = this.animationManager.getFrame(instanceId);
    this.debug.lastAnimationFrame = frame?.frameIndex ?? null;
    this.debug.lastAnimationFps = frame?.frameRate ?? null;
    this.debug.lastAnimationTimeMs = frame?.elapsedMs ?? null;

    return {
      spriteSheet: sourceType === 'sheet' || sourceType === 'atlas',
      frameRect: frame?.frameRect || (frameSize ? { x: 0, y: 0, width: frameSize.width, height: frameSize.height } : null),
    };
  }

  #buildInstanceId(payload, meta, animationType) {
    const aid = meta?.id || payload.type || 'asset';
    const px = payload.x ?? 'na';
    const py = payload.y ?? 'na';
    const level = payload.level ?? 1;
    return `${aid}|${animationType}|${level}|${px},${py}`;
  }

  #inferAnimationType(type, fallback = 'Idle') {
    const t = String(type || '').toLowerCase();
    if (t.includes('water')) return 'Water';
    if (t.includes('fire')) return 'Fire';
    if (t.includes('smoke')) return 'Smoke';
    if (t.includes('flag')) return 'Flags';
    if (t.includes('windmill')) return 'Windmill';
    return fallback;
  }
}
