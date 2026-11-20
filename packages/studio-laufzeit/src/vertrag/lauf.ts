// Vertrag: der Lauf (Plan 4.3) und was ihn anfordert (4.4). Der Lauf ist der ganze veränderliche Zustand des Takts in vorab angelegten
// Feldern; Indizes beziehen sich auf den OrdnungPlan (vertrag/bauplan.ts). Ein Schlüsselstand sichert ihn samt Welt, nie als Datei.
//
// Hand an einem Regler (`regler/hand.ts`, M1.3; Ergänzung M0, damit M1.3 und M1.7 dieselbe Regel bauen):
//   handSetzen(p: ReglerPlan, lauf: Lauf, i: number, wert: number): void   // lauf.regler.hand[i]: ein Linienregler auf seinen Bereich
//                                     // geklemmt, ein Kreisregler in [bereich[0], bereich[1]) gefaltet; keine endliche Zahl: RangeError
//   handLoesen(lauf: Lauf, i: number): void                                 // lauf.regler.hand[i] = NaN
// Sonst schreibt niemand `lauf.regler.hand`. `regler/durchlauf.ts` (M1.7) liest es nur (NaN: keine Hand) und klemmt nicht noch einmal;
// `Laufzeit.hand` ruft handSetzen und danach den Durchlauf ohne Zeit.
import type { Band } from '@ee/studio-format/typen/logik';
import type { EingabeEintrag } from '@ee/studio-format/typen/lauf';
import type { Ereignis } from './ereignis';

export interface Lauf {
  takt: number; saat: number; zeitfaktor: number;
  /** je Regler; `hand`: von Hand gesetzter Wert, NaN = keine Hand; `vorher`: gezeigter Wert des vorigen Takts (zum Mischen) */
  regler: { soll: Float64Array; ist: Float64Array; versatz: Float64Array; tempo: Float64Array; vorher: Float64Array; hand: Float64Array };
  schichten: Float64Array;                            // je Schicht: Übergang, Zeit, Leitpunkt, Variante
  figur: Float64Array;                                // Stände der Chips der Figurphysik, je Chip ab PhysikPlan.chipStand (vertrag/chip.ts)
  logik: Float64Array;                                // Gedächtnis je Regel und Ding, Ruhezeiten, Launen
  bausteine: Float64Array;                            // Stände der Bausteine, je Baustein ab LogikPlan.bausteinStand (vertrag/baustein.ts)
  stroeme: Uint32Array; protokoll: EingabeEintrag[]; postfach: Ereignis[]; ereignisse: Ereignis[]; pruefsummen: Uint32Array;
}
export interface Schluesselstand { takt: number; lauf: ArrayBuffer; welt: Uint8Array }   // nie als Datei
export interface Mitschnitt { takte: number; werte: Float32Array; ereignisse: Ereignis[] }   // gezeigte Werte der letzten 20 s

/**
 * eine Pose für eine Schicht anfordern (4.4; `Laufzeit.anfordern`, Regeln, Bausteine); Indizes nach dem OrdnungPlan. Der Typ liegt hier
 * im Vertrag (Plan 4.4 zeigt ihn im Block `posen/`): `posen/schichten.ts` (M4) nimmt ihn von hier und legt ihn nicht neu an.
 */
export interface Anforderung { schicht: number; pose: number; band: Band | 'hand'; variante?: string }
