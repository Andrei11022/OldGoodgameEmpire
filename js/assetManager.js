/**
 * FREE EMPIRE - Asset Manager
 * Preloads and caches assets with catalog-driven ID resolution.
 * Renderer/gameplay should address assets by ID and type, not file names.
 */

import { getCatalogEntry, listCatalogEntries } from './assetCatalog.js';

const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

function makeFallbackImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const c = canvas.getContext('2d');
  c.fillStyle = '#ff00ff';
  c.fillRect(0, 0, 2, 2);
  c.fillStyle = '#000000';
  c.fillRect(0, 0, 1, 1);
  c.fillRect(1, 1, 1, 1);

  const img = new Image();
  img.src = canvas.toDataURL('image/png');
  return img;
}

function makeFallbackAudio() {
  const audio = new Audio();
  audio.src = SILENT_WAV_DATA_URI;
  audio.preload = 'auto';
  return audio;
}

export class AssetManager {
  constructor() {
    this.imageCache = new Map();
    this.audioCache = new Map();
    this.pendingLoads = new Map();

    this.fallbackImage = makeFallbackImage();
    this.fallbackAudio = makeFallbackAudio();

    this.totalAssets = 0;
    this.loadedAssets = 0;
    this.finished = false;
    this.errors = [];

    this.imageStatus = new Map(); // path -> loading|loaded|missing
    this.imageMeta = new Map();   // path -> { assetId, group, key, level, sourceType }

    this.discoveryCompleted = false;

    this.registry = {
      audio: {
        theme: 'assets/music/theme.mp3',
      },
    };
  }

  getPreloadManifest() {
    return {
      images: [],
      audio: [this.registry.audio.theme],
    };
  }

  getMusicPath(name) {
    return this.registry.audio[name] || null;
  }

  /**
   * Preload asset manifest.
   * manifest = { images: string[], audio: string[] }
   */
  async load(manifest = {}) {
    const images = Array.isArray(manifest.images) ? manifest.images : [];
    const audio = Array.isArray(manifest.audio) ? manifest.audio : [];

    const uniqueImages = [...new Set(images.filter(Boolean))];
    const uniqueAudio = [...new Set(audio.filter(Boolean))];

    const toLoadImages = uniqueImages.filter((path) => this.imageStatus.get(path) !== 'loaded');
    const toLoadAudio = uniqueAudio.filter((path) => !this.audioCache.has(path));

    const queued = toLoadImages.length + toLoadAudio.length;
    if (queued === 0) {
      this.totalAssets = 0;
      this.loadedAssets = 0;
      this.finished = true;
      return;
    }

    this.totalAssets = queued;
    this.loadedAssets = 0;
    this.finished = false;
    this.errors = [];

    const jobs = [];

    for (const path of toLoadImages) {
      jobs.push(this.#loadImage(path, { lazy: false }));
    }
    for (const path of toLoadAudio) {
      jobs.push(this.#loadAudio(path));
    }

    await Promise.all(jobs);
    this.finished = true;
  }

  getSprite(path) {
    return this.imageCache.get(path) || this.fallbackImage;
  }

  tryGetSprite(path, { lazyLoad = true } = {}) {
    const status = this.imageStatus.get(path);
    if (status === 'loaded') {
      return this.imageCache.get(path) || null;
    }
    if (status === 'missing' || status === 'loading') {
      return null;
    }
    if (lazyLoad) {
      this.#loadImage(path, { lazy: true });
    }
    return null;
  }

  getAudio(path) {
    return this.audioCache.get(path) || this.fallbackAudio;
  }

  getNamedAudio(name) {
    const path = this.getMusicPath(name);
    if (!path) return this.fallbackAudio;
    return this.getAudio(path);
  }

  has(path) {
    return this.imageStatus.get(path) === 'loaded' || this.audioCache.has(path);
  }

  getTextureCount() {
    return this.imageCache.size;
  }

  getLoadedTexturePaths() {
    return [...this.imageCache.keys()];
  }

  getProgress() {
    if (this.totalAssets <= 0) return this.finished ? 1 : 0;
    return Math.max(0, Math.min(1, this.loadedAssets / this.totalAssets));
  }

  isFinished() {
    return this.finished;
  }

  getErrors() {
    return [...this.errors];
  }

  async discoverCatalogAssets() {
    const rows = listCatalogEntries();
    const jobs = [];

    for (const row of rows) {
      if (row.sourceType === 'atlas') {
        // Atlas files are data manifests, not PNG textures; skip image probing here.
        continue;
      }
      if (row.supportedLevels.length > 0) {
        for (const level of row.supportedLevels) {
          const path = this.#renderCatalogPath(row, level, null, false);
          jobs.push(this.#loadImage(path, {
            lazy: true,
            meta: {
              assetId: row.id,
              group: row.group,
              key: row.key,
              level,
              sourceType: row.sourceType,
            },
          }));
        }
      } else {
        const path = this.#renderCatalogPath(row, null, null, false);
        jobs.push(this.#loadImage(path, {
          lazy: true,
          meta: {
            assetId: row.id,
            group: row.group,
            key: row.key,
            level: null,
            sourceType: row.sourceType,
          },
        }));
      }
    }

    await Promise.all(jobs);
    this.discoveryCompleted = true;
  }

  getCatalogDebugRows() {
    return listCatalogEntries().map((row) => {
      const levels = row.supportedLevels.length > 0 ? row.supportedLevels : [null];
      const discovered = row.sourceType === 'atlas'
        ? [{ level: null, path: this.#atlasImagePath(row.source), status: this.imageStatus.get(this.#atlasImagePath(row.source)) || 'unknown' }]
        : levels.map((level) => {
          const path = this.#renderCatalogPath(row, level, null, false);
          const status = this.imageStatus.get(path) || 'unknown';
          return { level, path, status };
        });
      const loaded = discovered.filter((d) => d.status === 'loaded').length;
      const missing = discovered.filter((d) => d.status === 'missing').length;
      return {
        ...row,
        discovered,
        loaded,
        missing,
        fallbackActive: loaded === 0,
      };
    });
  }

  getBuildingSprite(type, level, options = {}) {
    const row = this.#getEntryRow('buildings', type);
    return this.#getLevelSprite(row, level, options);
  }

  getCastleSprite(level, options = {}) {
    const row = this.#getEntryRow('castle', 'core');
    return this.#getLevelSprite(row, level, options);
  }

  getWallSprite(level, options = {}) {
    const row = this.#getEntryRow('castle', 'wall');
    return this.#getLevelSprite(row, level, options);
  }

  getUnitSprite(type, options = {}) {
    const row = this.#getEntryRow('units', type);
    return this.#getSimpleSprite(row, options);
  }

  getDecorationSprite(type, options = {}) {
    const row = this.#getEntryRow('decorations', type);
    return this.#getSimpleSprite(row, options);
  }

  getEffectSprite(type, options = {}) {
    const row = this.#getEntryRow('effects', type);
    return this.#getSimpleSprite(row, options);
  }

  getSpriteMeta(group, key) {
    const entry = getCatalogEntry(group, key);
    if (!entry) return null;
    return {
      id: entry.id,
      group,
      key,
      category: entry.category,
      animation: !!entry.animation,
      animationClips: entry.animationClips || [],
      sourceType: entry.sourceType,
      spriteSize: entry.spriteSize,
      anchor: entry.anchor,
      supportedLevels: entry.supportedLevels || [],
      frameSize: entry.frameSize || null,
      frameCount: entry.frameCount || 1,
      frameMs: entry.frameMs || 120,
    };
  }

  #markDone() {
    this.loadedAssets += 1;
    if (this.loadedAssets >= this.totalAssets) {
      this.finished = true;
    }
  }

  #loadImage(path, options = {}) {
    const lazy = !!options.lazy;
    const meta = options.meta || null;

    const pendingKey = `img:${path}`;
    if (this.pendingLoads.has(pendingKey)) {
      return this.pendingLoads.get(pendingKey);
    }

    if (meta) {
      this.imageMeta.set(path, meta);
    }

    this.imageStatus.set(path, 'loading');

    const shouldTrackProgress = !lazy;
    if (shouldTrackProgress) {
      this.totalAssets += 1;
      this.finished = false;
    }

    const promise = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        this.imageCache.set(path, image);
        this.imageStatus.set(path, 'loaded');
        if (shouldTrackProgress) this.#markDone();
        this.pendingLoads.delete(pendingKey);
        resolve();
      };
      image.onerror = () => {
        this.imageStatus.set(path, 'missing');
        this.errors.push({ type: 'image', path });
        if (shouldTrackProgress) this.#markDone();
        this.pendingLoads.delete(pendingKey);
        resolve();
      };
      image.src = path;
    });

    this.pendingLoads.set(pendingKey, promise);
    return promise;
  }

  #loadAudio(path) {
    const pendingKey = `audio:${path}`;
    if (this.pendingLoads.has(pendingKey)) {
      return this.pendingLoads.get(pendingKey);
    }

    this.totalAssets += 1;
    this.finished = false;

    const promise = new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'auto';
      const done = (ok) => {
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('loadeddata', onReady);
        audio.removeEventListener('error', onError);

        if (!ok) {
          this.audioCache.set(path, this.fallbackAudio);
          this.errors.push({ type: 'audio', path });
        } else {
          this.audioCache.set(path, audio);
        }

        this.#markDone();
        this.pendingLoads.delete(pendingKey);
        resolve();
      };
      const onReady = () => done(true);
      const onError = () => done(false);

      audio.addEventListener('canplaythrough', onReady, { once: true });
      audio.addEventListener('loadeddata', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.src = path;
      audio.load();
    });

    this.pendingLoads.set(pendingKey, promise);
    return promise;
  }

  #getEntryRow(group, key) {
    const entry = getCatalogEntry(group, key);
    if (!entry) return null;
    return {
      ...entry,
      group,
      key,
    };
  }

  #getSimpleSprite(row, options) {
    if (!row) return null;

    const path = row.sourceType === 'atlas'
      ? this.#atlasImagePath(row.source)
      : this.#renderCatalogPath(row, null, options.variation || null, !!options.night);

    return this.#resolveImage(path, {
      assetId: row.id,
      group: row.group,
      key: row.key,
      level: null,
      sourceType: row.sourceType,
    });
  }

  #getLevelSprite(row, requestedLevel, options) {
    if (!row || row.sourceType === 'atlas') return null;
    const level = Number(requestedLevel) || 1;
    const supported = row.supportedLevels && row.supportedLevels.length > 0
      ? [...row.supportedLevels].sort((a, b) => b - a)
      : [1];
    const candidates = supported.filter((v) => v <= level);
    if (candidates.length === 0) candidates.push(supported[supported.length - 1]);

    for (const candidateLevel of candidates) {
      const path = this.#renderCatalogPath(row, candidateLevel, options.variation || null, !!options.night);
      const sprite = this.#resolveImage(path, {
        assetId: row.id,
        group: row.group,
        key: row.key,
        level: candidateLevel,
        sourceType: row.sourceType,
      });
      if (sprite) return sprite;
    }
    return null;
  }

  #resolveImage(path, meta) {
    const status = this.imageStatus.get(path);
    if (status === 'loaded') {
      return this.imageCache.get(path) || null;
    }
    if (status === 'loading' || status === 'missing') {
      return null;
    }
    this.#loadImage(path, { lazy: true, meta });
    return null;
  }

  #renderCatalogPath(row, level = null, variation = null, night = false) {
    let path = row.source || '';
    const variantSuffix = this.#variantSuffix(variation, night);
    path = path.replaceAll('{variant}', variantSuffix);
    if (level == null) {
      path = path.replaceAll('_lvl{level}', '');
      path = path.replaceAll('{level}', '1');
    } else {
      path = path.replaceAll('{level}', String(level));
    }
    return path;
  }

  #variantSuffix(variation, night) {
    let suffix = '';
    if (variation) suffix += `_${variation}`;
    if (night) suffix += '_night';
    return suffix;
  }

  #atlasImagePath(source) {
    if (!source) return '';
    if (source.endsWith('.atlas.json')) {
      return source.replace(/\.atlas\.json$/i, '.png');
    }
    return source;
  }
}
