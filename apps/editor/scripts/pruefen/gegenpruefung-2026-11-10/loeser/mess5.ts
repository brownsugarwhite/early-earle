/* eslint-disable */
// Gegenprüfung „Löser-Mathematik“: Messung 5 (Messkopie).
// MODE=halt     wie viel der Krümmungskorrektur HALT = 1e-6 bei „gleich“ zurückhält (gegen HALT = 1e-12), je Netzdichte
// MODE=k2       geometrie: Verhältnis geo.kante2 / m.kante2 (Maß der Korrektur gegen Maß der Matrix)
// MODE=sprung   gleich: Sprung nach dem Verfeinern (wie form-netzunabhaengig.ts A → B) mit und ohne Dämpfung je Punkt
import { type Haut, vermessen } from '../../../../../../packages/shape/src/dicht/kurven';
import {
  type Loop,
  bindungenAus,
  festlegen,
  kantenGewichte,
  kruemmungsKetten,
  mittlereKante,
  zieleAus,
} from '../../../../../../packages/shape/src/dicht/loops';
import { verdichten } from '../../../../../../packages/shape/src/dicht/verdichten';
import { HautAusKurvenP, PROBE, haltSetzen } from './ausKurvenKopie';
import { dreiLoops, einRing, f2, f3, flaechenAbstand, punktAbstand, schnapp, zugFuer } from './gemeinsam';

const mode = process.env.MODE ?? 'halt';
const fall = process.env.FALL ?? 'hals';

class ZugP {
  readonly plan;
  readonly start: Float64Array[];
  readonly loeser: HautAusKurvenP;
  constructor(h: Haut, loops: readonly Loop[], g: 'gleich' | 'geometrie') {
    this.plan = bindungenAus(h, loops);
    this.start = loops.map((l) => Float64Array.from(l.ruhe));
    const ketten = kruemmungsKetten(this.plan, loops);
    const ziele = zieleAus(this.plan, this.start);
    this.loeser = new HautAusKurvenP(h, this.plan.bind, ziele, null, 100, kantenGewichte(h, loops), ketten, g, {});
  }
  lagen(versch: readonly (Float64Array | null)[]): Float64Array[] {
    return this.start.map((s, i) => {
      const d = versch[i];
      if (!d) return s;
      const out = new Float64Array(s.length);
      for (let k = 0; k < s.length; k++) out[k] = s[k]! + d[k]!;
      return out;
    });
  }
  schritt(versch: readonly (Float64Array | null)[], it: number): void {
    this.loeser.schritt(zieleAus(this.plan, this.lagen(versch)), it);
  }
}
const zurueck = () => {
  PROBE.beta = 1;
  PROBE.adaptiv = false;
  PROBE.quellen = 'frei';
  PROBE.kante2M = false;
  PROBE.sammeln = false;
  PROBE.verh = [];
  haltSetzen(1e-6);
};

if (mode === 'halt') {
  for (const art of ['drei Loops', 'ein Ring'] as const)
    for (const dreiecke of [6000, 24000]) {
      zurueck();
      const st = art === 'ein Ring' ? einRing(dreiecke) : dreiLoops(dreiecke);
      const h = st.h;
      // ein Stand neben dem Fixpunkt: obere Hälfte 10 % höher (glatte Störung über das ganze Feld)
      for (let v = 0; v < h.n; v++) if (h.pos[3 * v + 1]! > 0) h.pos[3 * v + 1] = h.pos[3 * v + 1]! * 1.1;
      haltSetzen(1e-6);
      const a = new ZugP(h, st.loops, 'gleich');
      const gew = (a.loeser as unknown as { gew: Float64Array[] }).gew;
      const m = vermessen(h, gew);
      type K = { kruemmung(kap: Float64Array): Float64Array; cNr: Int32Array };
      const cA = (a.loeser as unknown as K).kruemmung(m.kap);
      haltSetzen(1e-12);
      const b = new ZugP(h, st.loops, 'gleich');
      const cB = (b.loeser as unknown as K).kruemmung(m.kap);
      haltSetzen(1e-6);
      const cNr = (a.loeser as unknown as K).cNr;
      let dz = 0;
      let dn = 0;
      let sA = 0;
      let sB = 0;
      let nF = 0;
      for (let v = 0; v < h.n; v++) {
        if (cNr[v]! < 0) continue;
        dz += (cA[v]! - cB[v]!) ** 2;
        dn += (cB[v]! - m.kap[v]!) ** 2;
        // glatter Anteil: Mittel der Korrektur über das Feld
        sA += cA[v]! - m.kap[v]!;
        sB += cB[v]! - m.kap[v]!;
        nF++;
      }
      console.log(
        `HALT, ${art}, ${h.n} Punkte: |c(1e-6) − c(1e-12)| / |c(1e-12) − gemessen| = ${f3(Math.sqrt(dz / dn))} (quadratisches Mittel über das Feld); mittlere Korrektur (glatter Anteil) mit HALT 1e-6: ${((100 * sA) / sB).toFixed(1)} % der Korrektur ohne HALT`,
      );
    }
}

if (mode === 'k2') {
  for (const f of ['hals', 'ohr', 'ruessel']) {
    zurueck();
    const st = dreiLoops(6000);
    const zug = zugFuer(st, f);
    const z = new ZugP(st.h, st.loops, 'geometrie');
    let d: (Float64Array | null)[] = [];
    for (let k = 1; k <= 30; k++) {
      d = zug(k / 30);
      z.schritt(d, 1);
    }
    PROBE.sammeln = true;
    PROBE.verh = [];
    z.schritt(d, 1);
    PROBE.sammeln = false;
    const w = [...PROBE.verh].sort((a, b) => a - b);
    const q = (p: number) => w[Math.floor(p * (w.length - 1))]!;
    const beta = (z.loeser as unknown as { beta: Float64Array }).beta;
    const bs = [...beta].sort((a, b) => a - b);
    const bq = (p: number) => bs[Math.floor(p * (bs.length - 1))]!;
    console.log(
      `geometrie ${f}: geo.kante2 / m.kante2 nach dem Zug: 5 % ${f2(q(0.05))}, Median ${f2(q(0.5))}, 95 % ${f2(q(0.95))}, 99 % ${f2(q(0.99))}, größtes ${f2(q(1))}; Dämpfung je Punkt (beta): 5 % ${f2(bq(0.05))}, Median ${f2(bq(0.5))}, Mittel ${f2(bs.reduce((s, x) => s + x, 0) / bs.length)}, Anteil unter 0,5: ${((100 * bs.filter((x) => x < 0.5).length) / bs.length).toFixed(0)} %`,
    );
  }
}

if (mode === 'sprung') {
  for (const variante of ['original', 'adaptiv'] as const) {
    zurueck();
    PROBE.adaptiv = variante === 'adaptiv';
    const st = dreiLoops(6000);
    const MK = mittlereKante(st.h);
    const zug = zugFuer(st, fall);
    const z = new ZugP(st.h, st.loops, 'gleich');
    let d: (Float64Array | null)[] = [];
    for (let k = 1; k <= 30; k++) {
      d = zug(k / 30);
      z.schritt(d, 1);
    }
    const A0 = schnapp(st.h);
    // die Endrunden einzeln (das Fenster rechnet vier)
    const einzel: string[] = [];
    for (let k = 1; k <= 4; k++) {
      const vor = Float64Array.from(st.h.pos);
      z.schritt(d, 1);
      einzel.push(f2(punktAbstand(vor, st.h.pos).max));
    }
    const A = schnapp(st.h);
    const e4 = punktAbstand(A0.P, A.P).max;
    for (const l of st.loops) festlegen(st.h, l);
    const hA = { ...st.h, pos: Float64Array.from(st.h.pos) };
    const zA = new ZugP(hA, st.loops, 'gleich');
    zA.schritt(
      st.loops.map(() => null),
      30,
    );
    const Aplus = schnapp(hA);
    const v = verdichten(st.h, st.loops, 1.75 * MK, { kurz: 0.5 * MK });
    let h2 = st.h;
    let l2 = st.loops;
    if (v) {
      h2 = v.haut;
      l2 = v.loops;
    }
    const zB = new ZugP(h2, l2, 'gleich');
    zB.schritt(
      l2.map(() => null),
      4,
    );
    const B = schnapp(h2);
    zB.schritt(
      l2.map(() => null),
      30,
    );
    const Bplus = schnapp(h2);
    const ab = flaechenAbstand(A, B);
    const apbp = flaechenAbstand(Aplus, Bplus);
    const aap = flaechenAbstand(A0, Aplus);
    console.log(
      `Sprung ${fall}/gleich, ${variante}: vier Endrunden einzeln ${einzel.join(' / ')}, zusammen ${f2(e4)}; Nachhinken (letzter Mausschritt → 30 Runden weiter) ${f2(aap.max)}; verdichtet ${A.P.length / 3} → ${B.P.length / 3} Punkte; A → B (Sprung wie im Fenster) ${f2(ab.max)} (99 % ${f2(ab.p99)}, Mittel ${f2(ab.mittel)}); A+ → B+ (Form hängt am Netz) ${f2(apbp.max)} (99 % ${f2(apbp.p99)})`,
    );
  }
}
