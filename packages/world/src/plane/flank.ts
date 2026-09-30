import type { WorldLayout } from './layout';
import { smoothstep } from './noise2';

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
