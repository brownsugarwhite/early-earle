 
// Gegenprüfung „Löser-Mathematik“: Messung 3 mit der Messkopie des Lösers (ausKurvenKopie.ts, erzeugt von gen.py).
// MODE=gleichheit  Kopie mit Standardwerten bitgleich zum Original?
// MODE=kosten      feine Anteile einer Runde (gleich und geometrie)
// MODE=varianten   nach dem Zug: Bewegung und Defekt je Runde für Varianten (Dämpfung bei „gleich“, Quellen fest, HALT, kante2M)
// MODE=ort         wo sitzt die Schwingung (Abstand zur Linie in Kanten, Krümmung · Kante)
// FALL, GEWICHTE, DREIECKE, VARIANTE, NACH
import { type Haut } from '../../../../../../packages/shape/src/dicht/kurven';
import {
  type Loop,
  LoopZug,
  bindungenAus,
  kantenGewichte,
  kruemmungsKetten,
  zieleAus,
} from '../../../../../../packages/shape/src/dicht/loops';
import { HautAusKurvenP, PROBE, haltSetzen } from './ausKurvenKopie';
import { type Schnapp, dreiLoops, f2, f3, flaechenAbstand, punktAbstand, schnapp, zugFuer } from './gemeinsam';

const fall = process.env.FALL ?? 'hals';
const gewichte = (process.env.GEWICHTE ?? 'gleich') as 'gleich' | 'geometrie';
const dreiecke = Number(process.env.DREIECKE ?? 6000);
const NACH = Number(process.env.NACH ?? 100);
const mode = process.env.MODE ?? 'gleichheit';

/** wie LoopZug (Art `kurven`, ganze Haut), aber mit der Messkopie des Lösers */
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

const probeZurueck = () => {
  PROBE.beta = 1;
  PROBE.adaptiv = false;
  PROBE.quellen = 'frei';
  PROBE.kante2M = false;
  PROBE.quellenBeta = 1;
  PROBE.sammeln = false;
  PROBE.verh = [];
  PROBE.t.kruemmung = 0;
  PROBE.t.rhs = 0;
  PROBE.t.spiegel = 0;
  haltSetzen(1e-6);
};

if (mode === 'gleichheit') {
  for (const g of ['gleich', 'geometrie'] as const) {
    const a = dreiLoops(dreiecke);
    const za = zugFuer(a, fall);
    const A = new LoopZug(a.h, a.loops, null, true, 'kurven', g, {});
    const b = dreiLoops(dreiecke);
    const zb = zugFuer(b, fall);
    probeZurueck();
    const B = new ZugP(b.h, b.loops, g);
    for (let k = 1; k <= 30; k++) {
      A.schritt(za(k / 30), 1);
      B.schritt(zb(k / 30), 1);
    }
    console.log(`Gleichheit ${fall}/${g}: größter Unterschied Original ↔ Messkopie nach 30 Mausschritten: ${punktAbstand(a.h.pos, b.h.pos).max}`);
  }
}

if (mode === 'kosten') {
  for (const g of ['gleich', 'geometrie'] as const) {
    probeZurueck();
    const st = dreiLoops(dreiecke);
    const zug = zugFuer(st, fall);
    const z = new ZugP(st.h, st.loops, g);
    const zt = z.loeser.zeiten;
    // einlaufen (JIT), dann messen
    for (let k = 1; k <= 10; k++) z.schritt(zug(k / 60), 1);
    const r0 = { ...zt };
    PROBE.t.kruemmung = 0;
    PROBE.t.rhs = 0;
    PROBE.t.spiegel = 0;
    const t0 = performance.now();
    for (let k = 11; k <= 60; k++) z.schritt(zug(k / 60), 1);
    const ges = performance.now() - t0;
    const r = zt.runden - r0.runden;
    const verm = zt.vermessen - r0.vermessen;
    const intr = zt.intrinsisch - r0.intrinsisch;
    const kr = g === 'gleich' ? PROBE.t.kruemmung : zt.kruemmung - r0.kruemmung;
    const loes = zt.loesen - r0.loesen;
    const rhs = PROBE.t.rhs;
    const sp = PROBE.t.spiegel;
    const rest = ges - verm - intr - kr - loes - rhs - sp;
    const p = (x: number) => `${((100 * x) / ges).toFixed(0)} %`;
    console.log(
      `Kosten ${fall}/${g}, ${st.h.n} Punkte, ${r} Runden, ${(ges / r).toFixed(2)} ms je Runde (Vorbehalt): vermessen+Normalen ${p(verm)} · intrinsisch ${p(intr)} · Krümmung verteilen ${p(kr)}${g === 'geometrie' ? ` (${((zt.schritte - r0.schritte) / r).toFixed(2)} PCG-Schritte, je Schritt eine Lösung mit dem Vorkonditionierer + eine am Anfang)` : ' (eine Spalte)'} · rechte Seite ${p(rhs)} · Lagen lösen (3 Spalten) ${p(loes)} · Übernehmen+Spiegel ${p(sp)} · Rest ${p(rest)}`,
    );
  }
}

type Variante = { name: string; setze: () => void; nachZug?: () => void };
const varianten: Record<string, Variante> = {
  original: { name: 'Original', setze: () => {} },
  beta05: { name: 'Korrektur ×0,5 (alle Punkte)', setze: () => (PROBE.beta = 0.5) },
  beta07: { name: 'Korrektur ×0,7 (alle Punkte)', setze: () => (PROBE.beta = 0.7) },
  adaptiv: { name: 'Korrektur je Punkt (halbieren bei Vorzeichenwechsel, wie geometrie)', setze: () => (PROBE.adaptiv = true) },
  qfest: { name: 'Quellen nach dem Zug festgehalten', setze: () => {}, nachZug: () => (PROBE.quellen = 'merken') },
  halt0: { name: 'HALT 1e-12', setze: () => haltSetzen(1e-12) },
  halt4: { name: 'HALT 1e-4', setze: () => haltSetzen(1e-4) },
  k2m: { name: 'geometrie: Korrektur mit m.kante2', setze: () => (PROBE.kante2M = true) },
  q05: { name: 'nur die Quellen gedämpft (×0,5)', setze: () => (PROBE.quellenBeta = 0.5) },
  q03: { name: 'nur die Quellen gedämpft (×0,3)', setze: () => (PROBE.quellenBeta = 0.3) },
};

if (mode === 'varianten') {
  const liste = (process.env.VARIANTE ?? 'original,beta05,adaptiv,qfest').split(',');
  const enden: { name: string; nachZug: Schnapp; ende: Schnapp }[] = [];
  const SCHRITTE = Number(process.env.SCHRITTE ?? 30);
  for (const key of liste) {
    const v = varianten[key]!;
    probeZurueck();
    v.setze();
    const st = dreiLoops(dreiecke);
    const zug = zugFuer(st, fall);
    const z = new ZugP(st.h, st.loops, gewichte);
    let d: (Float64Array | null)[] = [];
    for (let k = 1; k <= SCHRITTE; k++) {
      d = zug(k / SCHRITTE);
      z.schritt(d, 1);
    }
    const nachZug = schnapp(st.h);
    v.nachZug?.();
    const marken = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300];
    let vor = Float64Array.from(st.h.pos);
    const teile: string[] = [];
    let dVor: Float64Array | null = null;
    for (let k = 1; k <= NACH; k++) {
      z.schritt(d, 1);
      const jetzt = Float64Array.from(st.h.pos);
      const a = punktAbstand(vor, jetzt);
      const dd = jetzt.map((x, i) => x - vor[i]!);
      let cos = NaN;
      if (dVor) {
        let ab = 0;
        let aa = 0;
        let bb = 0;
        for (let i = 0; i < dd.length; i++) {
          ab += dd[i]! * dVor[i]!;
          aa += dd[i]! * dd[i]!;
          bb += dVor[i]! * dVor[i]!;
        }
        cos = ab / Math.sqrt(aa * bb);
      }
      dVor = dd;
      if (marken.includes(k)) teile.push(`${k}: ${a.max.toFixed(3)} (cos ${cos.toFixed(2)}, Defekt ${PROBE.defektMax.toFixed(3)})`);
      vor = jetzt;
    }
    const ende = schnapp(st.h);
    const nh = flaechenAbstand(nachZug, ende);
    console.log(`\n${fall}/${gewichte}, Variante „${v.name}“: Bewegung je Runde nach dem Zug (größte; cos zum Schritt davor; größter Krümmungsdefekt in Längeneinheiten)`);
    console.log(`  ${teile.join(' · ')}`);
    console.log(`  Stand nach dem letzten Mausschritt → nach ${NACH} Runden: Fläche bis ${f2(nh.max)} (99 % ${f2(nh.p99)}, Mittel ${f3(nh.mittel)})`);
    enden.push({ name: v.name, nachZug, ende });
  }
  console.log(`\nEndformen gegeneinander (${fall}/${gewichte}; Fläche größter / 99 % / Mittel):`);
  for (let i = 0; i < enden.length; i++)
    for (let j = i + 1; j < enden.length; j++) {
      const fl = flaechenAbstand(enden[i]!.ende, enden[j]!.ende);
      console.log(`  ${enden[i]!.name} ↔ ${enden[j]!.name}: ${f3(fl.max)} / ${f3(fl.p99)} / ${f3(fl.mittel)}`);
    }
  if (PROBE.verh.length) console.log('');
}

if (mode === 'ort') {
  probeZurueck();
  const st = dreiLoops(dreiecke);
  const zug = zugFuer(st, fall);
  const z = new ZugP(st.h, st.loops, gewichte);
  let d: (Float64Array | null)[] = [];
  for (let k = 1; k <= 30; k++) {
    d = zug(k / 30);
    z.schritt(d, 1);
  }
  const h = st.h;
  // Abstand zur nächsten Linie in Kanten (Breitensuche ab den Punkten der Bindungen)
  const hop = new Int32Array(h.n).fill(-1);
  let rand: number[] = [];
  for (const v of z.plan.bind.ecken) {
    if (hop[v] === 0) continue;
    hop[v] = 0;
    rand.push(v);
  }
  for (let t = 1; rand.length; t++) {
    const neu: number[] = [];
    for (const v of rand)
      for (const j of h.nachbarn[v]!)
        if (hop[j]! < 0) {
          hop[j] = t;
          neu.push(j);
        }
    rand = neu;
  }
  for (let k = 1; k <= 6; k++) z.schritt(d, 1);
  const a = Float64Array.from(h.pos);
  z.schritt(d, 1);
  const b = Float64Array.from(h.pos);
  z.schritt(d, 1);
  const c2 = Float64Array.from(h.pos);
  const kap = z.loeser.letzteKruemmung!;
  // Bewegung je Punkt in Runde 7 → 8 und wie weit Runde 8 → 9 sie zurücknimmt
  const bew = Array.from({ length: h.n }, (_, v) => {
    const d1 = [0, 1, 2].map((q) => b[3 * v + q]! - a[3 * v + q]!);
    const d2 = [0, 1, 2].map((q) => c2[3 * v + q]! - b[3 * v + q]!);
    const l1 = Math.hypot(...d1);
    const l2 = Math.hypot(...d2);
    const cos = l1 > 0 && l2 > 0 ? (d1[0]! * d2[0]! + d1[1]! * d2[1]! + d1[2]! * d2[2]!) / (l1 * l2) : 0;
    return { v, l1, l2, cos };
  });
  const jeHop = new Map<number, { n: number; sum: number; max: number }>();
  for (const x of bew) {
    const t = Math.min(hop[x.v]!, 12);
    const e = jeHop.get(t) ?? { n: 0, sum: 0, max: 0 };
    e.n++;
    e.sum += x.l1;
    e.max = Math.max(e.max, x.l1);
    jeHop.set(t, e);
  }
  console.log(`Ort der Schwingung ${fall}/${gewichte} (Runde 7→8 nach dem Zug; Abstand zur Linie in Kanten: Anzahl, Mittel, größte Bewegung):`);
  for (const t of [...jeHop.keys()].sort((x, y) => x - y)) {
    const e = jeHop.get(t)!;
    console.log(`  ${t === 12 ? '≥12' : t} Kanten: ${e.n} Punkte, Mittel ${(e.sum / e.n).toFixed(3)}, größte ${e.max.toFixed(3)}`);
  }
  bew.sort((x, y) => y.l1 - x.l1);
  let mk = 0;
  let kz = 0;
  for (let v = 0; v < h.n; v++)
    for (const j of h.nachbarn[v]!) {
      if (j < v) continue;
      mk += Math.hypot(h.pos[3 * j]! - h.pos[3 * v]!, h.pos[3 * j + 1]! - h.pos[3 * v + 1]!, h.pos[3 * j + 2]! - h.pos[3 * v + 2]!);
      kz++;
    }
  mk /= kz;
  console.log(`  die zehn Punkte mit der größten Bewegung (mittlere Kante ${f2(mk)}):`);
  for (const x of bew.slice(0, 10)) {
    const v = x.v;
    let kmin = Infinity;
    let kmax = 0;
    for (const j of h.nachbarn[v]!) {
      const l = Math.hypot(h.pos[3 * j]! - h.pos[3 * v]!, h.pos[3 * j + 1]! - h.pos[3 * v + 1]!, h.pos[3 * j + 2]! - h.pos[3 * v + 2]!);
      kmin = Math.min(kmin, l);
      kmax = Math.max(kmax, l);
    }
    console.log(
      `    Punkt ${v} bei (${[0, 1, 2].map((q) => h.pos[3 * v + q]!.toFixed(0)).join(', ')}): ${x.l1.toFixed(3)}, nächste Runde ${x.l2.toFixed(3)} (cos ${x.cos.toFixed(2)}); ${hop[v]} Kanten von der Linie, ${h.nachbarn[v]!.length} Nachbarn, Kanten ${f2(kmin)}–${f2(kmax)}, Krümmungsradius nach dem Maß ${kap[v]! !== 0 ? (1 / (2 * kap[v]!)).toFixed(1) : '∞'}`,
    );
  }
}
