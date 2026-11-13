// Plan vom 12.11.2026, Anhang A.3, „B als Schalter im Bau-Fenster“ (13.11.): der Löser eines Zugs, der fertige Haut direkt bewegt
// (`HautDirekt` mit festem Stand). Einmal angelegt für eine Haut und ihre Loops (das hängt nicht daran, was gezogen wird, und kann
// deshalb nach jeder Änderung vorbereitet werden); je Bild `schritt`: die Drehung der Linien bestimmen, die Normalen der Haut
// mitdrehen, in wenigen Schritten nachführen. Neu zerlegt wird dabei nichts. Neue Haut runden kann dieser Löser nicht (Bericht
// `docs/research/2026-11-13-beweis-haut-direkt.md`).

import { HautDirekt, linienDrehung } from './direkt';
import { type Haut, hautNormalenMax } from './kurven';
import type { BindungsPlan, Loop } from './loops';
import { linienRichtung } from './richtung';

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = (): number => (uhr ? uhr.now() : Date.now());

/** Schritte des Nachführens je Runde (eine Runde ist ein Aufruf von `schritt` mit `runden` = 1) */
const SCHRITTE_JE_RUNDE = 2;

export class DirektLoeser {
  /** so lange hat das Anlegen gedauert (Zerlegen eingeschlossen, ms) */
  readonly zeitZerlegen: number;
  /** freie Punkte der Haut */
  readonly anzahl: number;
  private readonly d: HautDirekt;
  /** die Haut beim Anlegen: An ihr liest `linienRichtung` die mittlere Kantenlänge (gleiche Linien geben so immer dieselbe Richtung) */
  private readonly h0: Haut;
  private readonly nor: Float64Array;
  private readonly ruhe: Float64Array[];
  private readonly rAlt: Float64Array;
  /** die Ziele des letzten Schritts (ändern sie sich nicht, bleibt die Drehung, wie sie ist) */
  private letzte: Float64Array | null = null;
  /** zum Messen: Zeit des letzten Schritts für die Drehung und für das Nachführen (ms), Rest danach */
  readonly zeiten = { drehung: 0, nachfuehren: 0, rest: 0 };

  /** `ziele`: die Ziele der Bindungen, wie die Linien jetzt liegen; `hart`: Punkte auf harten Linien (Kante an) */
  constructor(
    h: Haut,
    private readonly loops: readonly Loop[],
    private readonly plan: BindungsPlan,
    ziele: Float64Array,
    hart: Uint8Array | null,
  ) {
    const t0 = jetzt();
    this.h0 = { ...h, pos: Float64Array.from(h.pos) };
    this.nor = hautNormalenMax(h);
    this.ruhe = loops.map((l) => Float64Array.from(l.ruhe));
    this.rAlt = linienRichtung(this.h0, loops, plan, this.ruhe, this.nor);
    this.d = new HautDirekt(h, plan.bind, { hart, stand: true });
    this.d.bereiten(ziele);
    // auch die Matrix zum Verteilen der Drehung jetzt (sonst wartete das erste gedrehte Bild darauf)
    this.d.drehungBereiten(linienDrehung(this.h0, loops, plan, this.ruhe, this.ruhe, this.rAlt, this.rAlt));
    this.anzahl = this.d.freie;
    this.zeitZerlegen = Math.round(jetzt() - t0);
  }

  /**
   * Die Haut zu den Lagen der Linien rechnen (`lagen` je Loop, `ziele` je Bindung). `runden`: so viele Runden Nachführen; die Haut
   * ist nach jeder Runde näher an der Lösung, bei ruhenden Zielen nach wenigen fertig.
   */
  schritt(lagen: readonly Float64Array[], ziele: Float64Array, runden = 1): void {
    const t0 = jetzt();
    let gleich = this.letzte !== null && this.letzte.length === ziele.length;
    if (gleich) for (let k = 0; k < ziele.length; k++) if (ziele[k] !== this.letzte![k]) {
      gleich = false;
      break;
    }
    if (!gleich) {
      const rNeu = linienRichtung(this.h0, this.loops, this.plan, lagen, this.nor);
      this.d.drehungSetzen(linienDrehung(this.h0, this.loops, this.plan, this.ruhe, lagen, this.rAlt, rNeu));
      this.letzte = Float64Array.from(ziele);
    }
    const t1 = jetzt();
    this.zeiten.rest = this.d.nachfuehrenSchnell(ziele, Math.max(1, runden) * SCHRITTE_JE_RUNDE);
    this.zeiten.drehung = t1 - t0;
    this.zeiten.nachfuehren = jetzt() - t1;
  }
}
