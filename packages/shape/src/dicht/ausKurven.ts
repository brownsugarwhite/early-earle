// Form zuerst (06.11.2026), Beweis B (Florian: „Haut im Einflussbereich bei jedem Zug neu aus den Kurven rechnen (wie FiberMesh,
// gleichmäßiges Netz)“). Der Löser `HautZiele` behält beim Ziehen die Krümmung jedes Punkts, so weit die Loops sie nicht vorgeben
// (Gedächtnis). Vermutet war: Deshalb erzeugt Härte keinen Knick, wirkt nachträglich nicht, und eine gelöschte Linie hinterlässt
// ihre Form. Hier ist die Haut im Bereich die Fläche, die aus den Kurven folgt (FiberMesh, Nealen u. a. 2007, Abschnitt 3.2), in
// Runden, bis sie steht:
// 1. Krümmung c je Punkt (Normalanteil des Laplace durch das Kantenquadrat; auf einer Kugel 1/(2R)) harmonisch verteilt aus den Punkten
//    der Loops (dort gemessen, wie die Haut jetzt ist) und aus dem Rand des Bereichs (die Haut, die stehen bleibt, wie sie beim
//    Anfassen war). Ein Loop gibt so viel weiter, wie er weich ist (1 − Härte/3): Über einen harten fließt nichts, jede Seite rundet
//    sich für sich (scharf: nur die Lage ist fest, C0). Ein Punkt mit Ecke gibt nichts weiter (sein Knick ist keine Rundung).
// 2. Lagen: Laplace = sein Anteil in der Fläche, wie er jetzt ist, + Kantenquadrat · c · Normale; die Loops als Bindungen.
// Die Verteilung der Punkte in der Fläche bleibt, wie sie ist: Nur in Normalenrichtung (wie FiberMesh auf seinem gleichmäßigen Netz)
// ließ auf dem Netz aus Surface Nets die Kugel zusammenfallen (gemessen am 05.11.: Radius 52–157). Gleichmäßig hält das Netz das
// Verdichten nach jedem Zug.
//
// Ergebnis (Prüffälle `kurvenFaelle.ts`, Test `ausKurven.test.ts`, Bilder `docs/progress/editor/form-b-*-2026-11-06.jpg`): Die
// Vermutung stimmt nicht. Eine Kante entsteht, wo die Linien quer über die harte Linie knicken, mit beiden Lösern gleich (Pilz mit
// geknickten Querlinien: Knick 77° mit Gedächtnis, 78° hier, Soll ≈ 78°; Linse 64° bzw. 70°, Soll ≈ 67°). Knicken sie nicht (heute
// knickt eine Ecke von selbst nur die Verschiebung, nicht die Linie), entsteht mit keinem eine Kante (Pilz 10° bzw. 25°, hier mit 34
// umgeklappten Dreiecken). Nachträglich gesetzte Härte und gelöschte Linien wirken mit beiden erst, wenn neu gerechnet wird; eine
// gelöschte Form verschwindet hier ganz (Beule 24 → 0,7), mit Gedächtnis bleibt ein Rest (→ 7). Im Fenster (Bereiche, Stufen,
// Verdichten) besser am Überhang (Knicke über 60° / umgeklappt 28/10 → 4/0) und je Mausbewegung schneller, schlechter, wo wenige
// Linien ein Feld spannen: Unter dem Rand eines Pilzes hängen zwischen den Querlinien Lappen (12 umgeklappt; die Krümmung zwischen
// weit entfernten Linien ist die, die die Linien an sich messen, und das ist die alte), langer Hammer 7/0 → 18/6. Deshalb bleibt
// `HautZiele` der Löser des Fensters; dieser liegt als Vergleich bereit (`LoopZug` mit Art `kurven`, im Fenster `?haut=kurven`).
// Gemessen und verworfen: die Krümmung aus den Kurven, die Verteilung wie beim Anlegen (wie `HautZiele`): Die Haut verknittert
// (Linse und Pilz voller Beulen), weil die gemessene Krümmung an den Loops und die alte Verteilung nicht zueinander passen.

import { type NormalSystem, type NormalZeile, normalSystem } from '../loeser/normalSystem';
import type { KruemmungsKetten } from './kruemmung';
import { type Bindungen, type Haut, type Vermessung, gewichteAus, vermessen } from './kurven';

/** Gewicht, mit dem die Krümmung eines Punkts bei ihrem jetzigen Wert bleibt, wo keine Kurve hinreicht (hält das System lösbar) */
const HALT = 1e-6;

/**
 * Löser der Haut aus den Kurven: einmal zerlegt (Lagen und Krümmung; nur die Punkte im Bereich sind Unbekannte), je Schritt Runden
 * aus Messen, Verteilen der Krümmung und Lösen der Lagen. Gleiche Bindungen und Kantengewichte wie `HautZiele`.
 */
export class HautAusKurven {
  private readonly sys: NormalSystem;
  /** Unbekannte → Punkt der Haut */
  private readonly frei: Int32Array;
  /** Punkt der Haut → Unbekannte (−1: bleibt) */
  private readonly nr: Int32Array;
  /** Punkte, deren Laplace-Zeile eine Unbekannte enthält */
  private readonly zeilen: Int32Array;
  /** Bindungen mit einer Unbekannten, ihr Punkt der Haut und ihr Ziel beim Anlegen */
  private readonly js: Int32Array;
  private readonly haut0: Float64Array;
  private readonly ziel0: Float64Array;
  /** Gewichte je Punkt und Nachbar (normiert; über harte Linien kleiner) */
  private readonly gew: Float64Array[];
  /** je Punkt: wie stark er seine Krümmung weitergibt (−1: keine Quelle; Loops 1 − Härte/3, Rand des Bereichs 1) */
  private readonly quelle: Float64Array;
  /** Unbekannte der Krümmung: freie Punkte, die keine Quelle sind */
  private readonly cFrei: Int32Array;
  private readonly cNr: Int32Array;
  /** Diagonale je Zeile der Krümmung (1 weniger das Gewicht, das über Quellen nicht weitergegeben wird) */
  private readonly cDiag: Float64Array;
  private readonly sysC: NormalSystem | null;
  readonly zeitZerlegen: number;
  /** Haut beim Anlegen, vermessen (Krümmung für den Rand des Bereichs) */
  private readonly ruhe: Vermessung;
  /** Krümmung je Punkt im letzten Schritt (zum Messen) */
  letzteKruemmung: Float64Array | null = null;

  constructor(
    private readonly h: Haut,
    private readonly bind: Bindungen,
    ziele0: Float64Array,
    /** 1 = darf sich bewegen; fehlt: die ganze Haut */
    bereich: Uint8Array | null = null,
    private readonly gewicht = 100,
    /** Gewicht je Kante über eine harte Linie (Schlüssel `kantenSchluessel`); fehlt: 1 */
    kanten: ReadonlyMap<number, number> | null = null,
    /** Ketten der Loops: welche Bindungen Punkte eines eingesetzten Loops sind und wie hart er dort ist */
    ketten: KruemmungsKetten | null = null,
  ) {
    const n = h.n;
    const P = h.pos;
    const nr = new Int32Array(n).fill(-1);
    const frei: number[] = [];
    for (let v = 0; v < n; v++) {
      if (bereich && !bereich[v]) continue;
      nr[v] = frei.length;
      frei.push(v);
    }
    this.nr = nr;
    this.frei = Int32Array.from(frei);
    this.gew = gewichteAus(h, kanten);
    // Lagen: Laplace-Zeilen und Bindungen (wie HautZiele)
    const zeilen: NormalZeile[] = [];
    const lapZeilen: number[] = [];
    for (let i = 0; i < n; i++) {
      const nb = h.nachbarn[i]!;
      const g = this.gew[i]!;
      const index: number[] = [];
      const wert: number[] = [];
      if (nr[i]! >= 0) {
        index.push(nr[i]!);
        wert.push(1);
      }
      nb.forEach((j, k) => {
        if (nr[j]! < 0 || g[k] === 0) return;
        index.push(nr[j]!);
        wert.push(-g[k]!);
      });
      if (index.length === 0) continue;
      lapZeilen.push(i);
      zeilen.push({ index, wert, gewicht: 1 });
    }
    this.zeilen = Int32Array.from(lapZeilen);
    const js: number[] = [];
    const m = bind.ecken.length / 3;
    for (let j = 0; j < m; j++) {
      const index: number[] = [];
      const wert: number[] = [];
      for (let e = 0; e < 3; e++) {
        const v = bind.ecken[3 * j + e]!;
        if (nr[v]! < 0 || bind.b[3 * j + e] === 0) continue;
        index.push(nr[v]!);
        wert.push(bind.b[3 * j + e]!);
      }
      if (index.length === 0) continue;
      js.push(j);
      zeilen.push({ index, wert, gewicht });
    }
    this.js = Int32Array.from(js);
    this.haut0 = new Float64Array(3 * js.length);
    this.ziel0 = new Float64Array(3 * js.length);
    js.forEach((j, u) => {
      for (let c = 0; c < 3; c++) this.ziel0[3 * u + c] = ziele0[3 * j + c]!;
      for (let e = 0; e < 3; e++) {
        const v = bind.ecken[3 * j + e]!;
        for (let c = 0; c < 3; c++) this.haut0[3 * u + c] = this.haut0[3 * u + c]! + bind.b[3 * j + e]! * P[3 * v + c]!;
      }
    });
    const t0 = Date.now();
    this.sys = normalSystem(
      frei.length,
      zeilen,
      frei.map((v) => h.nachbarn[v]!.filter((j) => nr[j]! >= 0).map((j) => nr[j]!)),
      1e-9,
    );
    this.ruhe = vermessen(h, this.gew);
    // Quellen der Krümmung: Punkte eingesetzter Loops (so weich, wie der Loop dort ist; an einer Kreuzung der härteste; an einer Ecke
    // nichts), die Haut, die stehen bleibt (ganz)
    const quelle = new Float64Array(n).fill(-1);
    if (ketten)
      for (let j = 0; j < m; j++) {
        const v = bind.ecken[3 * j]!;
        if (bind.ecken[3 * j + 1] !== v || bind.ecken[3 * j + 2] !== v || !ketten.kette[j]) continue;
        const w = ketten.ecke[j] ? 0 : 1 - Math.min(3, Math.max(0, ketten.haerte[j]!)) / 3;
        quelle[v] = quelle[v]! < 0 ? w : Math.min(quelle[v]!, w);
      }
    for (let v = 0; v < n; v++) if (nr[v]! < 0 && quelle[v]! < 0) quelle[v] = 1;
    this.quelle = quelle;
    const cNr = new Int32Array(n).fill(-1);
    const cFrei: number[] = [];
    for (const v of frei) {
      if (quelle[v]! >= 0) continue;
      cNr[v] = cFrei.length;
      cFrei.push(v);
    }
    this.cNr = cNr;
    this.cFrei = Int32Array.from(cFrei);
    this.cDiag = Float64Array.from(cFrei, (v) => {
      const g = this.gew[v]!;
      let d = 1;
      h.nachbarn[v]!.forEach((w, k) => {
        const q = quelle[w]!;
        if (q >= 0) d -= g[k]! * (1 - q);
      });
      return d;
    });
    const zc: NormalZeile[] = [];
    cFrei.forEach((v, u) => {
      const g = this.gew[v]!;
      const index: number[] = [u];
      const wert: number[] = [this.cDiag[u]!];
      h.nachbarn[v]!.forEach((w, k) => {
        if (cNr[w]! < 0 || g[k] === 0) return;
        index.push(cNr[w]!);
        wert.push(-g[k]!);
      });
      zc.push({ index, wert, gewicht: 1 });
      zc.push({ index: [u], wert: [1], gewicht: HALT });
    });
    this.sysC = cFrei.length
      ? normalSystem(
          cFrei.length,
          zc,
          cFrei.map((v) => h.nachbarn[v]!.filter((w) => cNr[w]! >= 0).map((w) => cNr[w]!)),
          1e-12,
        )
      : null;
    this.zeitZerlegen = Date.now() - t0;
  }

  get anzahl(): number {
    return this.frei.length;
  }

  /**
   * Krümmung je Punkt: an den Punkten im Bereich, die auf keinem Loop liegen, harmonisch aus den Quellen (Loops wie jetzt gemessen,
   * `kap`; der Rand des Bereichs wie beim Anlegen); an Punkten eines Loops ihr eigener Wert, außerhalb des Bereichs der beim Anlegen.
   */
  private kruemmung(kap: Float64Array): Float64Array {
    const h = this.h;
    const c = Float64Array.from(kap);
    for (let v = 0; v < h.n; v++) if (this.nr[v]! < 0) c[v] = this.ruhe.kap[v]!;
    const nc = this.cFrei.length;
    if (!this.sysC || nc === 0) return c;
    const b = new Float64Array(nc);
    for (let u = 0; u < nc; u++) {
      const i = this.cFrei[u]!;
      const g = this.gew[i]!;
      const nb = h.nachbarn[i]!;
      for (let k = 0; k < nb.length; k++) {
        const w = nb[k]!;
        const q = this.quelle[w]!;
        if (q > 0) b[u] = b[u]! + g[k]! * q * c[w]!;
      }
    }
    const rhs = new Float64Array(nc);
    for (let u = 0; u < nc; u++) {
      const i = this.cFrei[u]!;
      const g = this.gew[i]!;
      rhs[u] = rhs[u]! + HALT * kap[i]! + this.cDiag[u]! * b[u]!;
      const nb = h.nachbarn[i]!;
      for (let k = 0; k < nb.length; k++) {
        const q = this.cNr[nb[k]!]!;
        if (q < 0 || g[k] === 0) continue;
        rhs[q] = rhs[q]! - g[k]! * b[u]!;
      }
    }
    const x = this.sysC.loesenSpalte(rhs);
    for (let u = 0; u < nc; u++) c[this.cFrei[u]!] = x[u]!;
    return c;
  }

  /** `iterationen` Runden zu den Zielen `ziele` (3 je Bindung) */
  schritt(ziele: Float64Array, iterationen = 2): void {
    const h = this.h;
    const P = h.pos;
    const nr = this.nr;
    const nf = this.frei.length;
    for (let it = 0; it < iterationen; it++) {
      const m = vermessen(h, this.gew);
      const c = this.kruemmung(m.kap);
      this.letzteKruemmung = c;
      const rhs = new Float64Array(3 * nf);
      for (const i of this.zeilen) {
        const nb = h.nachbarn[i]!;
        const g = this.gew[i]!;
        const k = m.kante2[i]! * c[i]!;
        let dx = m.tang[3 * i]! + k * m.nor[3 * i]!;
        let dy = m.tang[3 * i + 1]! + k * m.nor[3 * i + 1]!;
        let dz = m.tang[3 * i + 2]! + k * m.nor[3 * i + 2]!;
        // was fest bleibt, auf die rechte Seite
        if (nr[i]! < 0) {
          dx -= P[3 * i]!;
          dy -= P[3 * i + 1]!;
          dz -= P[3 * i + 2]!;
        }
        nb.forEach((j, kk) => {
          if (nr[j]! >= 0) return;
          dx += g[kk]! * P[3 * j]!;
          dy += g[kk]! * P[3 * j + 1]!;
          dz += g[kk]! * P[3 * j + 2]!;
        });
        const u = nr[i]!;
        if (u >= 0) {
          rhs[3 * u] = rhs[3 * u]! + dx;
          rhs[3 * u + 1] = rhs[3 * u + 1]! + dy;
          rhs[3 * u + 2] = rhs[3 * u + 2]! + dz;
        }
        nb.forEach((j, kk) => {
          const w = nr[j]!;
          if (w < 0) return;
          rhs[3 * w] = rhs[3 * w]! - g[kk]! * dx;
          rhs[3 * w + 1] = rhs[3 * w + 1]! - g[kk]! * dy;
          rhs[3 * w + 2] = rhs[3 * w + 2]! - g[kk]! * dz;
        });
      }
      const { ecken, b } = this.bind;
      this.js.forEach((j, u) => {
        let zx = this.haut0[3 * u]! + ziele[3 * j]! - this.ziel0[3 * u]!;
        let zy = this.haut0[3 * u + 1]! + ziele[3 * j + 1]! - this.ziel0[3 * u + 1]!;
        let zz = this.haut0[3 * u + 2]! + ziele[3 * j + 2]! - this.ziel0[3 * u + 2]!;
        for (let e = 0; e < 3; e++) {
          const v = ecken[3 * j + e]!;
          if (nr[v]! >= 0) continue;
          const w = b[3 * j + e]!;
          zx -= w * P[3 * v]!;
          zy -= w * P[3 * v + 1]!;
          zz -= w * P[3 * v + 2]!;
        }
        for (let e = 0; e < 3; e++) {
          const v = nr[ecken[3 * j + e]!]!;
          if (v < 0) continue;
          const w = this.gewicht * b[3 * j + e]!;
          rhs[3 * v] = rhs[3 * v]! + w * zx;
          rhs[3 * v + 1] = rhs[3 * v + 1]! + w * zy;
          rhs[3 * v + 2] = rhs[3 * v + 2]! + w * zz;
        }
      });
      const x = this.sys.loesen(rhs);
      for (let u = 0; u < nf; u++) {
        const v = this.frei[u]!;
        P[3 * v] = x[3 * u]!;
        P[3 * v + 1] = x[3 * u + 1]!;
        P[3 * v + 2] = x[3 * u + 2]!;
      }
      // genau spiegelgleich halten (wie HautZiele)
      for (let u = 0; u < nf; u++) {
        const v = this.frei[u]!;
        const w = h.spiegel[v]!;
        if (w < 0 || w < v) continue;
        if (w === v) {
          P[3 * v + 2] = 0;
          continue;
        }
        if (nr[w]! < 0) continue;
        const mx = 0.5 * (P[3 * v]! + P[3 * w]!);
        const my = 0.5 * (P[3 * v + 1]! + P[3 * w + 1]!);
        const mz = 0.5 * (P[3 * v + 2]! - P[3 * w + 2]!);
        P[3 * v] = mx;
        P[3 * v + 1] = my;
        P[3 * v + 2] = mz;
        P[3 * w] = mx;
        P[3 * w + 1] = my;
        P[3 * w + 2] = -mz;
      }
    }
  }
}
