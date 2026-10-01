import type { WorldLayout } from './layout';
import { hash2, smoothstep } from './noise2';

/**
 * Steilhang neben dem Pfad (Welt 12, Ebene 7): ein langer Bergrücken parallel zum Pfad, dessen dem Pfad zugewandte
 * Flanke steil ansteigt — die dunkle, mit Schuppenbüschen bedeckte Wand des Bilds, auf deren Grat die Tannen stehen.
 * Profil quer zum Pfad (u = Abstand vom Rückgrat, auf der Seite `side`): flach bis `from`, steil hinauf bis `crest`,
 * dahinter sanft hinab bis `to`. Zu den Enden des Pfadabschnitts läuft der Hang über `taper` Einheiten aus — keine
 * Wand an der Grenze zur nächsten Welt; jenseits von `to` (Seitenzellen) ist er null.
 */
export interface FlankSpec {
  /** Seite des Hangs: 1 = rechts vom Pfad (+x), −1 = links. */
  side: 1 | -1;
  /** Höhe des Grats über dem Gelände (Welteinheiten). */
  height: number;
  /** Querabstände (Welteinheiten): Hangfuß, Grat, Ende des Rückens. */
  from: number;
  crest: number;
  to: number;
  /** Auslauf zu den Abschnittsenden (Welteinheiten, Standard 12). */
  taper?: number;
  /**
   * Relief statt Höhe (Welt 06): die relative Höhe 0..1 (Licht der Kuppen, Täler der Schneefelder) misst nur das
   * Hügelrauschen, nicht den Hang — sonst stünde der ganze Hang als „Kamm“ im Licht. Standard aus (Welt 12).
   */
  relief?: boolean;
}

/** Ausrundung des Hangfußes und des Grats (Anteil der Flanke). */
const T0 = 0.08;
const T1 = 0.94;

/** Zusatzhöhe des Steilhangs an (x, z) für die Pfadwelt des Abschnitts, in dem z liegt. */
export function flankHeight(layout: WorldLayout, flank: FlankSpec, x: number, z: number): number {
  const u = (x - layout.backbone(z)) * flank.side;
  if (u <= flank.from || u >= flank.to) return 0;
  // Flanke: eine fast ebene, steile Wand (linear, am Fuß kurz ausgerundet, am Grat knapp gerundet), Rücken: weich
  const t = Math.min(1, Math.max(0, (u - flank.from) / (flank.crest - flank.from)));
  // gerade Rampe mit quadratisch ausgerundetem Fuß (bis T0) und Grat (ab T1), stetig in Wert und Steigung
  const a = 2 / (1 + T1 - T0);
  const up = t < T0 ? (a / (2 * T0)) * t * t : t > T1 ? 1 - (a / (2 * (1 - T1))) * (1 - t) * (1 - t) : a * t - (a * T0) / 2;
  const down = 1 - smoothstep(flank.crest, flank.to, u);
  const seg = layout.segment(layout.segmentAtDistance(-z));
  const inside = Math.min(seg.zStart - z, z - seg.zEnd);
  const taper = smoothstep(0, flank.taper ?? 12, inside);
  return flank.height * up * down * taper;
}

/**
 * Hügelstaffel (Welt 11, Ebene 20): Kämme quer zum Blick, in regelmäßigen Abständen längs z — Hügel hinter Hügel, jeder
 * Kamm eine eigene dunkle Masse, dazwischen Täler für die Nebelbänke. Der Kamm wellt sich seitlich (Phase aus einem
 * langsamen Rauschen) und ist je Reihe unterschiedlich hoch; Profil gerundet oben, weich im Tal.
 */
export interface RidgeTrainSpec {
  /** Abstand der Kämme längs z (Welteinheiten). */
  period: number;
  /** Höhe eines Kamms (Welteinheiten); je Reihe ±`vary` gestreut. */
  height: number;
  vary?: number;
  /** Seitliches Wellen der Kammlinie (Anteil der Periode, Standard 0.3) und seine Wellenlänge in x (Standard 3 × Periode). */
  wobble?: number;
  wobbleLength?: number;
}

/** Phase der Hügelstaffel an (x, z): ganzzahlig im Tal, +0,5 auf dem Kamm. */
function ridgePhase(spec: RidgeTrainSpec, seed: number, x: number, z: number): number {
  const p = Math.max(1, spec.period);
  const wl = spec.wobbleLength ?? p * 3;
  const w = spec.wobble ?? 0.3;
  return z / p + w * (Math.sin((x / wl) * Math.PI * 2 + seed * 0.001) * 0.7 + Math.sin((x / wl) * Math.PI * 4.3 + 1.7) * 0.3);
}

/** Nächstes Tal der Hügelstaffel längs z an der Stelle x (für die Nebelbänke zwischen den Kämmen). */
export function ridgeTrainValley(spec: RidgeTrainSpec, seed: number, x: number, z: number): number {
  const u = ridgePhase(spec, seed, x, z);
  return z + (Math.round(u) - u) * Math.max(1, spec.period);
}

/** Zusatzhöhe der Hügelstaffel an (x, z). */
export function ridgeTrainHeight(spec: RidgeTrainSpec, seed: number, x: number, z: number): number {
  const u = ridgePhase(spec, seed, x, z);
  const row = Math.floor(u);
  const t = u - row;
  const vary = spec.vary ?? 0.3;
  const k = 1 - vary + 2 * vary * hash2(row, 17, seed);
  // gerundeter Kamm (t = 0.5), weiches Tal an den Reihengrenzen
  const s = Math.sin(Math.PI * t);
  return spec.height * k * s * s * (1.4 - 0.4 * s);
}
