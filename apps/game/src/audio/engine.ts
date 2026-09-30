import { Capacitor } from '@capacitor/core';
import { AudioGraph, BUS_NAMES } from './graph';
import { playSfx, type SfxId, type SfxParams } from './sfx';
import { babble, BABBLE_MAX_S, chirp, rexSchedule, type RexChirp, type RexMood } from './rex';
import { MusicLayer, type MusicMode } from './music';
import { AMBIENT_PRESETS, AmbientBed, type WorldId } from './ambient';
import type { ZoneKey } from './scales';
import type { PlannedSound } from './timeline';
import { useAudioSettings, type AudioSettings } from './settings';

/**
 * The live audio engine (one per page). The `AudioContext` is created lazily inside the first user gesture
 * (iOS/WKWebView and Chrome's autoplay rules), suspended while the page is hidden or the sound is off, and
 * resumed on return. Sounds are queued on a small look-ahead scheduler (a 25 ms timer that only runs while
 * something is queued) so a move's sounds can be cancelled or hurried like the board's tweens. Music and
 * ambience are pumped every half second while the context runs. No per-frame work anywhere.
 *
 * iOS: the session is 'ambient' on purpose (AppDelegate + `navigator.audioSession`): the silent switch mutes the
 * game like most games, other apps' music keeps playing (docs/IOS.md, "Ton"). In the app the web view needs no
 * gesture, so the context starts at once (`arm`); a resume() that WebKit leaves pending re-arms the gesture
 * listeners after 400 ms (`watch`), and native pill taps unlock too (native/liquidGlass.ts).
 */

export type SceneMode = 'silent' | 'map' | 'level';

export interface AudioScene {
  zone: ZoneKey;
  world: WorldId;
  mode: SceneMode;
}

export interface EngineStats {
  state: string;
  sampleRate: number;
  latencyMs: number;
  voices: number;
  peak: number;
  started: number;
  stolen: number;
  dropped: number;
  nodes: number;
  queued: number;
  music: string;
  ambient: string;
  /** Main-thread milliseconds spent building sounds, per second (last window). */
  mainMsPerS: number;
  /** Audio render load 0..1 where the browser reports it (Chrome's renderCapacity), else null. */
  load: number | null;
}

interface Job {
  at: number;
  group: number;
  run: (t: number) => void;
}

const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'mousedown', 'keydown', 'click'] as const;
const LOOKAHEAD = 0.1;
const MOVE_GROUP = 1;
/** How long a resume() may stay pending before the gesture listeners are armed again (WebKit never rejects it). */
const RESUME_WATCH_MS = 400;

/** iOS app (Capacitor): WKWebView plays without a user gesture (no media types require user action). */
const NATIVE_APP = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

type AudioContextCtor = new (options?: AudioContextOptions) => AudioContext;

export class AudioEngine {
  ctx: AudioContext | null = null;
  graph: AudioGraph | null = null;
  musicEnabled = true;
  ambientEnabled = true;
  private settings: AudioSettings;
  private armed = false;
  private suspendedByUs = false;
  private queue: Job[] = [];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private pumpTimer: ReturnType<typeof setInterval> | null = null;
  private scene: AudioScene = { zone: 'tjorizo', world: 'w09', mode: 'silent' };
  private music: MusicLayer | null = null;
  private ambient: AmbientBed | null = null;
  private seed = 1;
  private lastSayText = '';
  private lastSayAt = -10;
  private waitSince = 0;
  private mainAcc = 0;
  private mainWindow = 0;
  private mainMsPerS = 0;
  private load: number | null = null;
  private readonly listeners = new Set<() => void>();
  private docListeners = false;
  private unsubscribe: (() => void) | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.settings = useAudioSettings.getState();
    this.unsubscribe = useAudioSettings.subscribe((s, prev) => this.onSettings(s, prev));
  }

  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  get muted(): boolean {
    return this.settings.muted;
  }

  /** Notifies the lab about state changes (context state, scene). */
  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    for (const cb of this.listeners) cb();
  }

  // ---------------------------------------------------------------------------------------- lifecycle

  /**
   * Installs the unlock listeners (first gesture creates/resumes the context) and the page listeners. In the iOS
   * app the context starts right away (no gesture needed there), so the splash is heard without a tap; the
   * listeners stay as the fallback.
   */
  arm(autoUnlock = NATIVE_APP): void {
    if (typeof window === 'undefined') return;
    if (!this.docListeners) {
      this.docListeners = true;
      document.addEventListener('visibilitychange', this.onVisibility);
      window.addEventListener('pagehide', this.onPageHide);
      window.addEventListener('pageshow', this.onVisibility);
    }
    if (this.armed || this.running) return;
    this.armed = true;
    for (const type of GESTURES) window.addEventListener(type, this.onGesture, { capture: true, passive: true });
    if (autoUnlock && !this.ctx) this.unlock();
  }

  private disarm(): void {
    if (!this.armed) return;
    this.armed = false;
    for (const type of GESTURES) window.removeEventListener(type, this.onGesture, { capture: true });
  }

  private readonly onGesture = (): void => {
    this.unlock();
  };

  /** Creates or resumes the context. Must run inside a user gesture on iOS; a no-op while muted. */
  unlock(): void {
    if (this.settings.muted) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!this.ctx && !this.create()) return;
    const ctx = this.ctx!;
    if (ctx.state === 'running') {
      this.onRunning();
      return;
    }
    this.suspendedByUs = false;
    this.silentKick();
    ctx.resume().then(
      () => this.onRunning(),
      () => this.arm(false),
    );
    this.watch();
  }

  /**
   * WebKit keeps a resume() without a gesture pending forever (it neither resolves nor rejects): if the context is
   * not running `RESUME_WATCH_MS` later, arm the gesture listeners again so the next tap finishes the job.
   */
  private watch(): void {
    if (typeof window === 'undefined') return;
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => {
      this.watchdog = null;
      if (this.running || this.settings.muted || !this.ctx) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      this.arm(false);
    }, RESUME_WATCH_MS);
  }

  private create(): boolean {
    const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return false;
    // Safari 16.4+/WKWebView: ambient = respect the silent switch and mix with other apps' audio.
    try {
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'ambient';
    } catch {
      // not supported
    }
    try {
      this.ctx = new Ctor({ latencyHint: 'interactive' });
    } catch {
      this.ctx = null;
      return false;
    }
    this.seed = (Date.now() & 0xffff) + 1;
    this.graph = new AudioGraph(this.ctx, { seed: this.seed });
    this.graph.warm();
    this.graph.out.gain.value = 0;
    this.applyVolumes(0);
    this.ctx.onstatechange = () => this.onStateChange();
    return true;
  }

  /** iOS < 15 needed a sound started inside the gesture to really unlock; harmless elsewhere. */
  private silentKick(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
    } catch {
      // ignore
    }
  }

  private onRunning(): void {
    const g = this.graph;
    if (!g || !this.running) return;
    this.disarm();
    const now = g.now;
    g.out.gain.cancelScheduledValues(now);
    g.out.gain.setTargetAtTime(1, now, 0.05);
    this.music?.resync(now);
    this.startPump();
    this.applyScene();
    this.tick();
    this.emit();
  }

  private onStateChange(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    // iOS may interrupt (calls, Siri) or the system may suspend: the next tap resumes.
    if (ctx.state !== 'running' && !this.suspendedByUs && !this.settings.muted) this.arm(false);
    if (ctx.state === 'running') this.onRunning();
    this.emit();
  }

  private readonly onVisibility = (): void => {
    if (document.hidden) {
      this.pause();
      return;
    }
    if (this.settings.muted || !this.ctx) return;
    this.suspendedByUs = false;
    this.ctx.resume().then(
      () => this.onRunning(),
      () => this.arm(false),
    );
    // Some WebViews need a fresh gesture after returning from the background.
    this.watch();
  };

  private readonly onPageHide = (): void => {
    this.pause();
  };

  /** Silences and suspends (page hidden). Queued sounds are dropped; music/ambience resume later. */
  private pause(): void {
    this.stopPump();
    this.queue.length = 0;
    this.stopTick();
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    this.suspendedByUs = true;
    void ctx.suspend().catch(() => undefined);
    this.emit();
  }

  private onSettings(s: AudioSettings, prev: AudioSettings): void {
    this.settings = s;
    if (!this.graph) {
      // Unmuting from the toggle is itself a gesture: unlock right here.
      if (prev.muted && !s.muted) this.unlock();
      return;
    }
    this.applyVolumes();
    if (s.muted === prev.muted) return;
    const g = this.graph;
    const ctx = this.ctx!;
    if (s.muted) {
      const now = g.now;
      g.out.gain.cancelScheduledValues(now);
      g.out.gain.setTargetAtTime(0, now, 0.025);
      this.queue.length = 0;
      this.stopTick();
      this.stopPump();
      this.suspendedByUs = true;
      setTimeout(() => {
        if (this.settings.muted && this.ctx?.state === 'running') void this.ctx.suspend().catch(() => undefined);
        this.emit();
      }, 150);
      this.disarm();
    } else {
      this.suspendedByUs = false;
      this.silentKick();
      ctx.resume().then(
        () => {
          this.onRunning();
          this.sfx('soundOn', {}, 0.05);
        },
        () => this.arm(false),
      );
      this.watch();
    }
    this.emit();
  }

  private applyVolumes(glide = 0.05): void {
    const g = this.graph;
    if (!g) return;
    const s = this.settings;
    const at = g.now;
    g.setMaster(s.master, at);
    for (const bus of BUS_NAMES) g.setBusVolume(bus, s[bus], at, glide || 0.001);
  }

  // ---------------------------------------------------------------------------------------- scheduler

  /** Queues `run` at `delay` s from now (context clock). Dropped while muted or before the first gesture. */
  schedule(delay: number, run: (t: number) => void, group = 0): void {
    const g = this.graph;
    if (!g || this.settings.muted) return;
    const job: Job = { at: g.now + Math.max(0, delay), group, run };
    let i = this.queue.length;
    while (i > 0 && this.queue[i - 1]!.at > job.at) i--;
    this.queue.splice(i, 0, job);
    this.tick();
  }

  private readonly tick = (): void => {
    const g = this.graph;
    if (!g || !this.running) {
      // Waiting for resume(): keep polling a moment, then give up (the context clock does not run).
      if (!this.queue.length) {
        this.stopTick();
        return;
      }
      if (!this.waitSince) this.waitSince = performance.now();
      if (performance.now() - this.waitSince > 1500) {
        this.queue.length = 0;
        this.waitSince = 0;
        this.stopTick();
        return;
      }
      this.ensureTick();
      return;
    }
    this.waitSince = 0;
    const now = g.now;
    const horizon = now + LOOKAHEAD;
    const t0 = performance.now();
    while (this.queue.length && this.queue[0]!.at <= horizon) {
      const job = this.queue.shift()!;
      if (job.at < now - 0.3) continue; // stale (the page stalled): skip rather than pile up
      try {
        job.run(Math.max(job.at, now + 0.004));
      } catch {
        // a broken recipe must never take the game down
      }
    }
    this.account(performance.now() - t0);
    if (this.queue.length) this.ensureTick();
    else this.stopTick();
  };

  private ensureTick(): void {
    if (!this.tickTimer) this.tickTimer = setInterval(this.tick, 25);
  }

  private stopTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private account(ms: number): void {
    const now = performance.now();
    this.mainAcc += ms;
    if (now - this.mainWindow >= 1000) {
      this.mainMsPerS = (this.mainAcc * 1000) / Math.max(1000, now - this.mainWindow);
      this.mainAcc = 0;
      this.mainWindow = now;
    }
  }

  // ---------------------------------------------------------------------------------------- sounds

  sfx(id: SfxId, p: SfxParams = {}, delay = 0): void {
    this.schedule(delay, (t) => {
      if (this.graph) playSfx(this.graph, id, t, p);
    });
  }

  /** Plays a planned move (replaces whatever is left of the previous one, like the board does). */
  playMove(sounds: readonly PlannedSound[], lead = 0.012): void {
    this.cancelMove();
    if (!this.graph || this.settings.muted) return;
    for (const s of sounds) {
      this.schedule(
        s.t + lead,
        (t) => {
          if (this.graph) playSfx(this.graph, s.id, t, s.p);
        },
        MOVE_GROUP,
      );
    }
  }

  cancelMove(): void {
    if (this.queue.some((j) => j.group === MOVE_GROUP)) this.queue = this.queue.filter((j) => j.group !== MOVE_GROUP);
  }

  /** A queued swipe hurries the running move (the board plays the rest `factor`× faster). */
  hurry(factor = 5): void {
    const g = this.graph;
    if (!g) return;
    const now = g.now;
    for (const j of this.queue) if (j.group === MOVE_GROUP && j.at > now) j.at = now + (j.at - now) / factor;
    this.queue.sort((a, b) => a.at - b.at);
  }

  /**
   * Who starts REX's babble: `store` = the wiring babbles when the displayed line changes (timed like the
   * REX character's talk delays); `external` = the REX character calls `say()` itself at its `talk()`
   * moment (exact lip sync), the wiring stays quiet.
   */
  rexDriver: 'store' | 'external' = 'store';

  /** REX says a line (same line twice within 1.5 s is ignored). Returns the babble length (s). */
  say(text: string, mood: RexMood, delay = 0.06): number {
    const g = this.graph;
    if (!g || this.settings.muted || !text.trim()) return 0;
    const now = g.now;
    if (text === this.lastSayText && now - this.lastSayAt < 1.5) return 0;
    this.lastSayText = text;
    this.lastSayAt = now;
    const len = Math.min(BABBLE_MAX_S, rexSchedule(text).duration);
    this.schedule(delay, (t) => {
      if (!this.graph) return;
      this.graph.hush('voice', t);
      babble(this.graph, t + 0.016, text, mood);
      this.graph.duckBus('music', t, 0.28, len, 0.08, 0.6);
    });
    return len;
  }

  chirp(kind: RexChirp, delay = 0): void {
    this.schedule(delay, (t) => {
      if (!this.graph) return;
      this.graph.hush('voice', t);
      chirp(this.graph, t + 0.016, kind);
      this.graph.duckBus('music', t, 0.25, 0.4);
    });
  }

  ui(kind: 'tick' | 'glass'): void {
    if (!this.graph || this.settings.muted) return;
    this.sfx(kind === 'glass' ? 'glassTap' : 'uiTick', { zone: this.scene.zone });
  }

  // ---------------------------------------------------------------------------------------- music & ambience

  get currentScene(): AudioScene {
    return this.scene;
  }

  setScene(scene: Partial<AudioScene>): void {
    this.scene = { ...this.scene, ...scene };
    this.applyScene();
    this.emit();
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on;
    this.applyScene();
    this.emit();
  }

  setAmbientEnabled(on: boolean): void {
    this.ambientEnabled = on;
    this.applyScene();
    this.emit();
  }

  private applyScene(): void {
    const g = this.graph;
    if (!g || !this.running) return;
    const now = g.now;
    const sc = this.scene;
    const mode: MusicMode = sc.mode === 'level' ? 'level' : 'map';
    const wantMusic = this.musicEnabled && sc.mode !== 'silent';
    if (!wantMusic) {
      if (this.music) this.retireMusic(now, 2.5);
    } else if (!this.music || this.music.zone !== sc.zone) {
      const crossing = this.music !== null;
      if (this.music) this.retireMusic(now, 2.2);
      this.music = new MusicLayer(g, sc.zone, mode, now + (crossing ? 1.1 : 0.15), crossing ? 3 : 4, this.seed);
    } else this.music.setMode(mode, now);

    const wantAmbient = this.ambientEnabled && sc.mode !== 'silent';
    if (!wantAmbient) {
      if (this.ambient) {
        this.ambient.stop(now, 2.5);
        this.ambient = null;
      }
    } else if (!this.ambient || this.ambient.preset.id !== sc.world) {
      const crossing = this.ambient !== null;
      if (this.ambient) this.ambient.stop(now, 3);
      this.ambient = new AmbientBed(g, AMBIENT_PRESETS[sc.world], now + 0.05, crossing ? 3 : 4);
    }
    // In a level the bed steps back a little.
    const level = g.ambientScene.gain;
    level.cancelScheduledValues(now);
    level.setTargetAtTime(sc.mode === 'level' ? 0.7 : 1, now, 0.8);
    this.pump();
  }

  private retireMusic(now: number, fade: number): void {
    const m = this.music;
    if (!m) return;
    m.stop(now, fade);
    this.music = null;
    setTimeout(() => m.dispose(), (fade + 6) * 1000);
  }

  private readonly pump = (): void => {
    const g = this.graph;
    if (!g || !this.running) return;
    const now = g.now;
    const t0 = performance.now();
    // After a main-thread stall, skip what was missed instead of firing it all at once.
    this.music?.resync(now);
    this.music?.pump(now + 1.4);
    this.ambient?.skipBefore(now);
    this.ambient?.pump(now + 1.5);
    this.account(performance.now() - t0);
  };

  private startPump(): void {
    if (!this.pumpTimer) this.pumpTimer = setInterval(this.pump, 500);
  }

  private stopPump(): void {
    if (this.pumpTimer) {
      clearInterval(this.pumpTimer);
      this.pumpTimer = null;
    }
  }

  // ---------------------------------------------------------------------------------------- lab

  /** Auditions a rendered buffer (offline preview) through the live output, bypassing the mixer. */
  playBuffer(buf: AudioBuffer): void {
    const g = this.graph;
    if (!g || this.settings.muted) return;
    this.schedule(0, (t) => {
      const src = g.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(g.out);
      src.start(t);
    });
  }

  private loadMeter = false;

  /** Starts Chrome's render-capacity meter where available (lab only). */
  enableLoadMeter(): void {
    const rc = (this.ctx as unknown as { renderCapacity?: EventTarget & { start?: (o: { updateInterval: number }) => void } } | null)?.renderCapacity;
    if (this.loadMeter || !rc || typeof rc.start !== 'function') return;
    this.loadMeter = true;
    rc.addEventListener('update', (e) => {
      const load = (e as unknown as { averageLoad?: number }).averageLoad;
      if (typeof load === 'number') this.load = load;
    });
    try {
      rc.start({ updateInterval: 1 });
    } catch {
      // unsupported
    }
  }

  stats(): EngineStats {
    const g = this.graph;
    const ctx = this.ctx;
    const st = g?.stats;
    if (g) g.activeVoices();
    return {
      state: ctx ? ctx.state : 'none',
      sampleRate: ctx?.sampleRate ?? 0,
      latencyMs: ctx ? Math.round(((ctx.baseLatency ?? 0) + (ctx.outputLatency ?? 0)) * 1000) : 0,
      voices: st?.voices ?? 0,
      peak: st?.peak ?? 0,
      started: st?.started ?? 0,
      stolen: st?.stolen ?? 0,
      dropped: st?.dropped ?? 0,
      nodes: st?.nodes ?? 0,
      queued: this.queue.length,
      music: this.music ? `${this.music.zone} · ${this.music.mode}` : '–',
      ambient: this.ambient ? this.ambient.preset.name : '–',
      mainMsPerS: Math.round(this.mainMsPerS * 100) / 100,
      load: this.load,
    };
  }

  /** Tears everything down (HMR). */
  dispose(): void {
    this.disarm();
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
    this.stopTick();
    this.stopPump();
    this.queue.length = 0;
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.docListeners) {
      document.removeEventListener('visibilitychange', this.onVisibility);
      window.removeEventListener('pagehide', this.onPageHide);
      window.removeEventListener('pageshow', this.onVisibility);
      this.docListeners = false;
    }
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.graph = null;
    this.music = null;
    this.ambient = null;
  }
}

/** The page's engine. */
export const audio = new AudioEngine();

// Handle for poking at the engine from the console (`__eeAudio.stats()`): dev server, and the iOS app for the
// Safari Web Inspector (debug builds are inspectable, docs/IOS.md "Ton").
if ((import.meta.env.DEV || NATIVE_APP) && typeof window !== 'undefined') (window as unknown as { __eeAudio?: AudioEngine }).__eeAudio = audio;

if (import.meta.hot) import.meta.hot.dispose(() => audio.dispose());
