/**
 * FREE EMPIRE - Audio Manager
 * Handles background music and SFX playback with volume, mute, fade, pause/resume.
 */

const DEFAULT_SETTINGS = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muteMusic: false,
  muteSfx: false,
};

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export class AudioManager {
  constructor(assetManager, options = {}) {
    this.assetManager = assetManager;
    this.onSettingsChanged = typeof options.onSettingsChanged === 'function'
      ? options.onSettingsChanged
      : null;

    this.settings = { ...DEFAULT_SETTINGS };
    this.initialized = false;
    this.music = new Map();
    this.activeMusicKey = null;
  }

  init(initialSettings = {}) {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...initialSettings,
      musicVolume: clamp01(initialSettings.musicVolume ?? DEFAULT_SETTINGS.musicVolume),
      sfxVolume: clamp01(initialSettings.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
      muteMusic: !!initialSettings.muteMusic,
      muteSfx: !!initialSettings.muteSfx,
    };

    this.initialized = true;
    this.#emitSettings();
  }

  playMusic(path, { loop = true, fadeInMs = 0, key = path } = {}) {
    if (!this.initialized) return null;

    const source = this.assetManager.getAudio(path);
    const track = source.cloneNode(true);
    track.loop = loop;
    track.preload = 'auto';

    const targetVolume = this.settings.muteMusic ? 0 : this.settings.musicVolume;
    track.volume = fadeInMs > 0 ? 0 : targetVolume;

    this.music.set(key, track);
    this.activeMusicKey = key;

    const playPromise = track.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Browser may still reject if no valid source or policy conflicts.
      });
    }

    if (fadeInMs > 0) {
      this.#fade(track, 0, targetVolume, fadeInMs);
    }

    return key;
  }

  playSFX(path) {
    if (!this.initialized || this.settings.muteSfx) return null;

    const source = this.assetManager.getAudio(path);
    const sfx = source.cloneNode(true);
    sfx.loop = false;
    sfx.volume = this.settings.sfxVolume;

    const playPromise = sfx.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore playback rejections in unsupported contexts.
      });
    }
    return sfx;
  }

  stop(key, { fadeOutMs = 0 } = {}) {
    const track = this.music.get(key);
    if (!track) return;

    if (fadeOutMs > 0) {
      const start = track.volume;
      this.#fade(track, start, 0, fadeOutMs, () => {
        track.pause();
        track.currentTime = 0;
        this.music.delete(key);
        if (this.activeMusicKey === key) this.activeMusicKey = null;
      });
      return;
    }

    track.pause();
    track.currentTime = 0;
    this.music.delete(key);
    if (this.activeMusicKey === key) this.activeMusicKey = null;
  }

  pauseAll() {
    for (const track of this.music.values()) {
      track.pause();
    }
  }

  resumeAll() {
    if (!this.initialized) return;
    for (const track of this.music.values()) {
      const p = track.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }

  setMusicVolume(value) {
    this.settings.musicVolume = clamp01(value);
    this.#applyMusicVolume();
    this.#emitSettings();
  }

  setSfxVolume(value) {
    this.settings.sfxVolume = clamp01(value);
    this.#emitSettings();
  }

  setMuteMusic(muted) {
    this.settings.muteMusic = !!muted;
    this.#applyMusicVolume();
    this.#emitSettings();
  }

  setMuteSfx(muted) {
    this.settings.muteSfx = !!muted;
    this.#emitSettings();
  }

  resetAudio() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.#applyMusicVolume();
    this.#emitSettings();
    return this.getSettings();
  }

  getSettings() {
    return { ...this.settings };
  }

  isInitialized() {
    return this.initialized;
  }

  isPlaying(key = this.activeMusicKey) {
    if (!key) return false;
    const track = this.music.get(key);
    if (!track) return false;
    return !track.paused;
  }

  #applyMusicVolume() {
    const volume = this.settings.muteMusic ? 0 : this.settings.musicVolume;
    for (const track of this.music.values()) {
      track.volume = volume;
    }
  }

  #emitSettings() {
    if (this.onSettingsChanged) {
      this.onSettingsChanged(this.getSettings());
    }
  }

  #fade(audio, from, to, durationMs, onDone = null) {
    const startTime = performance.now();
    const diff = to - from;

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / Math.max(1, durationMs));
      audio.volume = clamp01(from + diff * t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else if (onDone) {
        onDone();
      }
    };

    requestAnimationFrame(step);
  }
}
