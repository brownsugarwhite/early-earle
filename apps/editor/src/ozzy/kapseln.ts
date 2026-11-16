/**
 * Ozzy: Kapseln für die flüssige Anzeige (`../linien/fluessig.ts`), in Gerätepunkten. Eine fertige Szene der Linien-Studie (das
 * Blatt mit P) lässt sich übernehmen und um eigene Kapseln ergänzen (Freihand, Formen, Wände, Felder, Teiler).
 *
 * Aufbau je Kapsel wie in der Anzeige: x0, y0, x1, y1 | r0, r1, Gruppe, Art | z0, z1, –, –. Art = Schicht (0 Tinte, 1 verdeckt,
 * 2 nach Tiefe) + 4 · Form (0 Linie, hart vereinigt; 1 Punkt, Tropfen, Hals, weich vereinigt).
 */

import { PRIM_FELDER, type Szene } from '../linien/fluessig';

export class Kapseln {
  puffer = new Float32Array(PRIM_FELDER * 4096);
  n = 0;
  /** Felder der Weichheit: je x, y, Radius, Stärke (Gerätepunkte) */
  felder: number[] = [];
  /** eigene Gruppen beginnen weit hinter denen einer übernommenen Szene */
  private gruppe = 1_000_000;

  leeren(): void {
    this.n = 0;
    this.felder = [];
    this.gruppe = 1_000_000;
  }

  neueGruppe(): number {
    return this.gruppe++;
  }

  private platz(mehr: number): void {
    const noetig = (this.n + mehr) * PRIM_FELDER;
    if (noetig <= this.puffer.length) return;
    let laenge = this.puffer.length;
    while (laenge < noetig) laenge *= 2;
    const neu = new Float32Array(laenge);
    neu.set(this.puffer.subarray(0, this.n * PRIM_FELDER));
    this.puffer = neu;
  }

  /** die Kapseln und Felder einer fertigen Szene übernehmen (die Gruppen bleiben, wie sie sind) */
  uebernehmen(sz: Szene): void {
    this.platz(sz.anzahl);
    this.puffer.set(sz.prim.subarray(0, sz.anzahl * PRIM_FELDER), this.n * PRIM_FELDER);
    this.n += sz.anzahl;
    for (const f of sz.felder) this.felder.push(f);
  }

  /** eine Kapsel; `weich`: Punkt, Tropfen oder Hals (weich vereinigt), sonst ein Stück Linie (hart) */
  push(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, gruppe: number, schicht: number, weich: boolean, z0 = 0, z1 = 0): void {
    if (!(r0 > 0.001 || r1 > 0.001)) return;
    this.platz(1);
    const o = this.n * PRIM_FELDER;
    const b = this.puffer;
    b[o] = x0;
    b[o + 1] = y0;
    b[o + 2] = x1;
    b[o + 3] = y1;
    b[o + 4] = r0;
    b[o + 5] = r1;
    b[o + 6] = gruppe;
    b[o + 7] = schicht + 4 * (weich ? 1 : 0);
    b[o + 8] = z0;
    b[o + 9] = z1;
    b[o + 10] = 0;
    b[o + 11] = 0;
    this.n++;
  }

  /** ein Streckenzug als eine Linie (eine Gruppe); `zu`: geschlossen */
  zug(x: ArrayLike<number>, y: ArrayLike<number>, r: number, zu: boolean, schicht = 0): void {
    const m = Math.min(x.length, y.length);
    if (m < 2) return;
    const g = this.neueGruppe();
    for (let i = 0; i + 1 < m; i++) this.push(x[i]!, y[i]!, x[i + 1]!, y[i + 1]!, r, r, g, schicht, false);
    if (zu) this.push(x[m - 1]!, y[m - 1]!, x[0]!, y[0]!, r, r, g, schicht, false);
  }

  /** ein Punkt (weich) */
  punkt(x: number, y: number, r: number, schicht = 0): void {
    this.push(x, y, x, y, r, r, this.neueGruppe(), schicht, true);
  }
}
