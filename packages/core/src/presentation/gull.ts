/**
 * Möwe im Spiel — nur Darstellung.
 *
 * Alle paar Züge bringt eine Möwe, die man nur als Schatten sieht, den neuen kleinsten oder zweitkleinsten Blob und
 * lässt ihn von oben aufs Feld klatschen. Diese Datei entscheidet, **welcher** Spawn die Möwe bekommt und **wann**
 * sie ruft, loslässt und aufschlägt. Die Funktionen sind rein: sie lesen das Zugergebnis, ziehen nie aus dem Zufall
 * des Bretts und verändern nichts — mit und ohne Möwe entsteht exakt derselbe Spielstand.
 *
 * Rhythmus: Die Züge zerfallen in Fenster zu vier Zügen; in Fenster `w` kommt die Möwe auf Zug `4w + 1` oder
 * `4w + 2` (Münzwurf aus Level-ID, Seed und Fenster). Abstände daher 3–5 Züge, die erste Möwe auf Zug 1 oder 2.
 * Hat dieser Zug keinen passenden Spawn, fällt das Fenster aus (kein Nachholen). Rückspulen spielt dieselbe
 * Zugnummer mit demselben Seed → dieselbe Möwe. In Level 1 bringt sie den ersten Nachschub (Zug 1): die Brücke vom
 * Splash, wo ihr Schatten den ersten Blob fallen lässt.
 *
 * Zeiten: `gullTimes()` ist die eine gemeinsame Quelle für Brett (Schatten, Fall, Aufprall), Audio und Haptik.
 */

import type { Coord, LevelState } from '../model';
import type { MoveEvent, MoveResult, SpawnEvent } from '../events';
import type { LevelDef } from '../schema/level';
import { hash32, mulberry32Value } from '../rng';

/** `auto` = Regel und Rhythmus, `always` = jeder Spawn (Lab, Tests), `off` = nie. */
export type GullMode = 'auto' | 'always' | 'off';

/** Züge je Fenster; pro Fenster höchstens eine Möwe. */
export const GULL_WINDOW = 4;
/** In diesem Level bringt die Möwe den ersten Nachschub (Zug 1). */
export const GULL_FIRST_LEVEL = 'tjorizo-001';

/** Frühester Aufprall nach Zugbeginn (s): Zeit, damit der Schatten hereinfliegen kann. */
export const GULL_IMPACT_MIN_S = 1.0;
/** Fallzeit vom Loslassen bis zum Aufprall (s). */
export const GULL_FALL_S = 0.42;
/** Der Schatten erscheint so lange vor dem Loslassen (s). */
export const GULL_ENTER_S = 0.8;
/** Der Ruf setzt so lange vor dem Loslassen ein (s). */
export const GULL_CALL_S = 0.55;
/** Der Schatten ist so lange nach dem Loslassen aus dem Bild (s). */
export const GULL_EXIT_S = 1.1;
/** Der Zug endet frühestens so lange nach dem Aufprall (Brett und Audio markieren dasselbe Ende). */
export const GULL_SETTLE_S = 0.3;

export interface GullDrop {
  /** Blob-ID des Spawns, den die Möwe bringt. */
  spawnId: number;
  /** Zielzelle (x, y). */
  at: Coord;
  tier: number;
  /** Flug quer zum Bildschirm: −1 nach links, 1 nach rechts (Panorama des Rufs läuft mit). */
  side: -1 | 1;
  /** Flugschneise 0..2 (Winkel zur Bildschirm-Senkrechten und Bogen). */
  corridor: 0 | 1 | 2;
  /** Rufvariante 0..2. */
  call: 0 | 1 | 2;
  /** Die Möwe lacht beim Abflug. */
  laugh: boolean;
}

/** Zeiten eines Möwenflugs in Sekunden ab Zugbeginn. */
export interface GullTimes {
  /** Der Schatten fliegt ins Bild. */
  enterAt: number;
  /** Der Ruf beginnt. */
  callAt: number;
  /** Der Schatten steht genau über der Zielzelle, der Blob fällt. */
  releaseAt: number;
  /** Der Blob klatscht auf ("Flatsch"). */
  impactAt: number;
  /** Der Schatten hat das Bild verlassen. */
  exitAt: number;
}

let mode: GullMode = 'auto';

/** Schaltet die Möwe um (Lab-Knopf, `?gull=always|off`). Gilt für alle Bretter, Audio und Haptik. */
export function setGullMode(next: GullMode): void {
  mode = next;
}

export function getGullMode(): GullMode {
  return mode;
}

/** `'always'`, `'off'`, `'auto'` aus einem URL-Wert; alles andere → null. */
export function parseGullMode(value: string | null | undefined): GullMode | null {
  return value === 'auto' || value === 'always' || value === 'off' ? value : null;
}

/** Die zwei niedrigsten verschiedenen Stufen der Spawn-Tabelle (nur deren Spawns bringt die Möwe). */
export function gullTiers(level: Pick<LevelDef, 'spawn'>): number[] {
  const tiers = [...new Set(level.spawn.table.map((row) => row.tier))].sort((a, b) => a - b);
  return tiers.slice(0, 2);
}

/** Gemischter Hash (FNV-1a allein hat schwache niedrige Bits). */
function mixed(...parts: readonly (string | number)[]): number {
  return mulberry32Value(hash32(...parts));
}

/** Zugnummer (1-basiert) der Möwe in Fenster `w`. */
export function gullWindowMove(levelId: string, seed: number, w: number): number {
  if (w === 0 && levelId === GULL_FIRST_LEVEL) return 1;
  return GULL_WINDOW * w + 1 + (mixed('gull', levelId, seed, w) & 1);
}

/** Ist Zug `moveNo` (1-basiert) im Rhythmus der Möwe dran? */
export function isGullMove(levelId: string, seed: number, moveNo: number): boolean {
  if (moveNo < 1) return false;
  const w = Math.floor((moveNo - 1) / GULL_WINDOW);
  return moveNo === gullWindowMove(levelId, seed, w);
}

function spawnsOf(events: readonly MoveEvent[]): SpawnEvent[] {
  return events.filter((e): e is SpawnEvent => e.type === 'spawn');
}

/**
 * Bringt die Möwe den Spawn dieses Zugs? Liefert den Abwurf (Zelle, Stufe, Aussehen des Flugs) oder null.
 * Liest nur Level-ID, Seed, Zugnummer und Spawn-Ereignis — nie den Zufall des Bretts.
 */
export function gullDropFor(res: MoveResult<LevelState>, which: GullMode = mode): GullDrop | null {
  if (which === 'off') return null;
  const spawns = spawnsOf(res.events);
  if (spawns.length === 0) return null;
  // Synthetische Züge (Audio-Lab, Tests) tragen evtl. kein Level: ohne Level entscheidet nur `always`.
  const st = res.state as Partial<LevelState>;
  const level = st.level;
  const levelId = level?.id ?? '';
  const seed = st.seed ?? 0;
  const moveNo = st.moveNo ?? 0;
  let spawn: SpawnEvent | undefined;
  if (which === 'always') spawn = spawns[0];
  else {
    if (!level || !isGullMove(levelId, seed, moveNo)) return null;
    const tiers = gullTiers(level);
    spawn = spawns.find((s) => tiers.includes(s.tier));
  }
  if (!spawn) return null;
  const h = mixed('gullLook', levelId, seed, moveNo);
  return {
    spawnId: spawn.id,
    at: [spawn.at[0], spawn.at[1]],
    tier: spawn.tier,
    side: h & 1 ? 1 : -1,
    corridor: ((h >>> 1) % 3) as 0 | 1 | 2,
    call: ((h >>> 3) % 3) as 0 | 1 | 2,
    laugh: ((h >>> 5) & 3) === 0,
  };
}

/**
 * Die gemeinsamen Zeiten eines Möwenflugs aus dem Moment, in dem der Spawn sonst aufploppen würde (`spawnAt`, s ab
 * Zugbeginn, aus dem Zeitmodell des Bretts): Aufprall frühestens 1,0 s nach Zugbeginn und nie vor dem normalen Pop.
 */
export function gullTimes(spawnAt: number): GullTimes {
  const impactAt = Math.max(spawnAt + 0.12, GULL_IMPACT_MIN_S);
  const releaseAt = impactAt - GULL_FALL_S;
  return {
    enterAt: Math.max(0, releaseAt - GULL_ENTER_S),
    callAt: Math.max(0, releaseAt - GULL_CALL_S),
    releaseAt,
    impactAt,
    exitAt: releaseAt + GULL_EXIT_S,
  };
}
