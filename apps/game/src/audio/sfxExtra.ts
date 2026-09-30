import type { AudioGraph } from './graph';
import type { SfxParams } from './sfx';

/**
 * Klänge der Iteration 4 (Loader, Möwe, Sammlung, Klassik, Aufbruch). Die IDs stehen fest, damit alle Baustellen sie
 * aufrufen können; bis die Audio-Baustelle die echten Rezepte baut, spielen Platzhalter aus dem Grundkatalog.
 * Neue Rezepte bekommen dieselbe Signatur wie in `sfx.ts` und landen hier (nicht in `sfx.ts`).
 */
type Player = (g: AudioGraph, t: number, p: SfxParams) => void;

/** Die Grundklänge, auf die die Platzhalter zurückgreifen (werden von `sfx.ts` hereingereicht). */
export type BasePlayers = Record<
  'creatureVoice' | 'diveWhoosh' | 'heroJump' | 'splash' | 'stomp' | 'childPop' | 'uiTick' | 'rise' | 'popOut' | 'release' | 'land' | 'lost' | 'won',
  Player
>;

export const EXTRA_SFX_IDS = [
  /** Möwenruf (Loader und Spiel), Pan über `p.pan`. */
  'gullCall',
  /** Flügelschlag / Vorbeiflug der Möwe. */
  'gullWings',
  /** Fallender Blob (kurzes Pfeifen). */
  'dropFall',
  /** Nasses Aufklatschen ("Flatsch"), `p.tier` / `p.kind: 'big'` für Größe. */
  'splat',
  /** Harter Stempel (Logo-Teile, NEU!). */
  'stamp',
  /** Ein neues Wesen für den Setzkasten. */
  'newCreature',
  /** Holziges Klacken (Setzkasten, Loader-Ziffern). */
  'clack',
  /** Die Flamme im Logo zündet. */
  'flameIgnite',
  /** Ein Stern springt ein, `p.step` 0/1/2 steigt. */
  'starPop',
  /** Ein Wesen verlässt das Plateau und zieht auf die Map. */
  'creatureRelease',
  /** Der Held landet auf einem Knoten oder Pfadpunkt. */
  'heroLand',
  /** Tipp auf einen gesperrten Knoten. */
  'locked',
  /** Klassik: kein Zug mehr. */
  'gameOver',
  /** Klassik: neuer Bestwert. */
  'newBest',
] as const;

export type ExtraSfxId = (typeof EXTRA_SFX_IDS)[number];

export function extraPlayers(b: BasePlayers): Record<ExtraSfxId, Player> {
  return {
    gullCall: (g, t, p) => b.creatureVoice(g, t, { ...p, tier: 3 }),
    gullWings: b.diveWhoosh,
    dropFall: b.heroJump,
    splat: b.splash,
    stamp: b.stomp,
    newCreature: b.childPop,
    clack: b.uiTick,
    flameIgnite: b.rise,
    starPop: b.popOut,
    creatureRelease: b.release,
    heroLand: b.land,
    locked: b.uiTick,
    gameOver: b.lost,
    newBest: b.won,
  };
}

/** Lautheitsausgleich (dB) der neuen Klänge, wie `TRIM_DB` in `sfx.ts`. */
export const EXTRA_TRIM_DB: Partial<Record<ExtraSfxId, number>> = {};
