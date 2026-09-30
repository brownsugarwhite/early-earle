import type { GameMode, ProgressState } from './progress';

/**
 * Entwickler-Schalter für den Fortschritt über die Adresse (nur mit Werkstatt, also Dev, Testbuilds und die iOS-App;
 * `earlyearle://play?mode=free` kommt über die Deep-Links unverändert an):
 *
 * - `?mode=real|free` (auch `echt|frei`) — Modus umschalten
 * - `?reset=real|free` — diesen Stand leeren
 * - `?level=N` — im aktiven Stand bis Level N freischalten, der Held steht dort
 * - `?intro=1` — Intro nochmal (echter Stand, schaltet ohne `mode` auf echt)
 * - `?story=afterLevel1` — REX erzählt die Szene, sobald die Map steht
 *
 * FlowView wendet sie an, bevor der Flow-Store zurückgesetzt wird (der Held startet dann schon am richtigen Knoten).
 */
export interface ProgressParams {
  mode?: GameMode;
  reset?: GameMode;
  /** 1-basierte Levelnummer. */
  level?: number;
  intro?: boolean;
  story?: string;
}

const modeOf = (v: string | null): GameMode | undefined => {
  const s = v?.trim().toLowerCase();
  if (s === 'real' || s === 'echt') return 'real';
  if (s === 'free' || s === 'frei') return 'free';
  return undefined;
};

export function parseProgressParams(search: string): ProgressParams {
  const q = new URLSearchParams(search);
  const out: ProgressParams = {};
  const mode = modeOf(q.get('mode'));
  if (mode) out.mode = mode;
  const reset = modeOf(q.get('reset'));
  if (reset) out.reset = reset;
  const level = Number.parseInt(q.get('level') ?? '', 10);
  if (Number.isFinite(level) && level >= 1) out.level = level;
  const intro = q.get('intro');
  if (intro === '1' || intro === 'true') out.intro = true;
  const story = q.get('story')?.trim();
  if (story && /^[A-Za-z0-9_-]{1,40}$/.test(story)) out.story = story;
  return out;
}

type ProgressActions = Pick<ProgressState, 'setMode' | 'resetSlot' | 'unlockTo' | 'resetIntro'>;

export interface ApplyOptions {
  /** Werkstatt erreichbar (sonst wird nichts angewendet). */
  enabled: boolean;
  /** Id von Level 1 (für `intro`). */
  firstLevelId: string | undefined;
  nodeCount: number;
  /** REX-Szenen, die `intro` wieder ungesehen macht. */
  introStories?: string[];
}

/** Wendet die Schalter an; liefert die Szene, die auf der Map erzählt werden soll (oder null). */
export function applyProgressParams(p: ProgressParams, progress: ProgressActions, opts: ApplyOptions): { story: string | null } {
  if (!opts.enabled) return { story: null };
  if (p.reset) progress.resetSlot(p.reset);
  const mode = p.mode ?? (p.intro ? 'real' : undefined);
  if (mode) progress.setMode(mode);
  if (p.level !== undefined) progress.unlockTo(Math.min(p.level, Math.max(1, opts.nodeCount)) - 1);
  if (p.intro && opts.firstLevelId) progress.resetIntro(opts.firstLevelId, opts.introStories ?? []);
  return { story: p.story ?? null };
}
