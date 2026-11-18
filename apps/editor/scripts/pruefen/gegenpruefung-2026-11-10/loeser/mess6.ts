 
// Gegenprüfung „Löser-Mathematik“: Messung 6. Wie stark ändert Verfeinern das Krümmungsmaß auf derselben Fläche (wie
// apps/editor/scripts/pruefen/form-mass-netz.ts, hier für Hals/Ohr/Rüssel)? Verglichen an alten Punkten, die das Verfeinern nicht
// bewegt und die auf keiner Linie liegen:
//   gleich   Normalanteil des Laplace mit gleichen Gewichten durch das mittlere Kantenquadrat (Standard-Löser)
//   jeKante  Mittel über die Kanten von (Normalanteil der Kante) / Kantenlänge² (jede Kante einzeln normiert; hängt nur an den
//            Richtungen der Kanten, nicht an ihren Längen) — kein Maß im Code, nur zum Vergleich
//   geo      Kotangens auf der intrinsischen Delaunay-Triangulierung (Löser „geometrie“)
// je mit Normalen nach Fläche und nach Max. FALL=hals|ohr|ruessel
import { intrinsischeGewichte } from '../../../../../../packages/shape/src/dicht/intrinsisch';
import { type Haut, gewichteAus, hautNormalen, hautNormalenMax, vermessen } from '../../../../../../packages/shape/src/dicht/kurven';
import { LoopZug, festlegen, mittlereKante } from '../../../../../../packages/shape/src/dicht/loops';
import { verdichten } from '../../../../../../packages/shape/src/dicht/verdichten';
import { dreiLoops, zugFuer } from './gemeinsam';

const fall = process.env.FALL ?? 'hals';
const st = dreiLoops(6000);
const zug = zugFuer(st, fall);
const z = new LoopZug(st.h, st.loops, null, true, 'kurven', 'gleich', {});
let d: (Float64Array | null)[] = [];
for (let k = 1; k <= 30; k++) {
  d = zug(k / 30);
  z.schritt(d, 2);
}
z.schritt(d, 20);
for (const l of st.loops) festlegen(st.h, l, false);
const h0 = st.h;

const masse = (h: Haut, nor: Float64Array) => {
  const gleich = vermessen(h, gewichteAus(h, null), nor).kap;
  const P = h.pos;
  const jeKante = new Float64Array(h.n);
  for (let v = 0; v < h.n; v++) {
    let s = 0;
    const nb = h.nachbarn[v]!;
    for (const j of nb) {
      const dx = P[3 * v]! - P[3 * j]!;
      const dy = P[3 * v + 1]! - P[3 * j + 1]!;
      const dz = P[3 * v + 2]! - P[3 * j + 2]!;
      s += (dx * nor[3 * v]! + dy * nor[3 * v + 1]! + dz * nor[3 * v + 2]!) / Math.max(1e-12, dx * dx + dy * dy + dz * dz);
    }
    jeKante[v] = s / Math.max(1, nb.length);
  }
  const ig = intrinsischeGewichte(h, null);
  const geo = new Float64Array(h.n);
  for (let v = 0; v < h.n; v++) {
    let hh = 0;
    let e2 = 0;
    for (let k = ig.start[v]!; k < ig.start[v + 1]!; k++) {
      const j = ig.nb[k]!;
      const w = ig.w[k]!;
      hh += w * ((P[3 * v]! - P[3 * j]!) * nor[3 * v]! + (P[3 * v + 1]! - P[3 * j + 1]!) * nor[3 * v + 1]! + (P[3 * v + 2]! - P[3 * j + 2]!) * nor[3 * v + 2]!);
      e2 += w * ig.l2[k]!;
    }
    geo[v] = e2 > 0 ? hh / e2 : 0;
  }
  return { gleich, jeKante, geo };
};
const MK = mittlereKante(h0);
const linie0 = new Uint8Array(h0.n);
for (const v of z.plan.bind.ecken) linie0[v] = 1;
const v = verdichten(h0, st.loops, 1.75 * MK, { kurz: 0.5 * MK, genau: MK / 40 })!;
const h1 = v.haut;
console.log(`\n${fall}: verdichtet ${h0.n} → ${h1.n} Punkte; Maß ×300 (Kugel R 150 = 1) an alten, unbewegten Punkten abseits der Linien, deren Nachbarschaft sich geändert hat`);
for (const [name, nf] of [
  ['Normalen nach Fläche', hautNormalen],
  ['Normalen nach Max', hautNormalenMax],
] as const) {
  const a = masse(h0, nf(h0));
  const b = masse(h1, nf(h1));
  const sum = { n: 0, g0: 0, g1: 0, dg: 0, k0: 0, k1: 0, dk: 0, e0: 0, e1: 0, de: 0 };
  for (let q = 0; q < h1.n; q++) {
    const p = v.alt[q]!;
    if (p < 0 || linie0[p]) continue;
    if (Math.hypot(h1.pos[3 * q]! - h0.pos[3 * p]!, h1.pos[3 * q + 1]! - h0.pos[3 * p + 1]!, h1.pos[3 * q + 2]! - h0.pos[3 * p + 2]!) > 1e-9) continue;
    // nur Punkte, deren Nachbarn sich geändert haben
    if (h1.nachbarn[q]!.length === h0.nachbarn[p]!.length && h1.nachbarn[q]!.every((j) => v.alt[j]! >= 0 && h0.nachbarn[p]!.includes(v.alt[j]!))) continue;
    sum.n++;
    sum.g0 += a.gleich[p]! * 300;
    sum.g1 += b.gleich[q]! * 300;
    sum.dg += Math.abs(b.gleich[q]! - a.gleich[p]!) * 300;
    sum.k0 += a.jeKante[p]! * 300;
    sum.k1 += b.jeKante[q]! * 300;
    sum.dk += Math.abs(b.jeKante[q]! - a.jeKante[p]!) * 300;
    sum.e0 += a.geo[p]! * 300;
    sum.e1 += b.geo[q]! * 300;
    sum.de += Math.abs(b.geo[q]! - a.geo[p]!) * 300;
  }
  const n = sum.n;
  const zl = (x0: number, x1: number, dx: number) => `${(x0 / n).toFixed(3)} → ${(x1 / n).toFixed(3)} (${(100 * (x1 / x0 - 1)).toFixed(1)} %), je Punkt ${(dx / n).toFixed(3)}`;
  console.log(`  ${name}, ${n} Punkte: gleich ${zl(sum.g0, sum.g1, sum.dg)} · je Kante normiert ${zl(sum.k0, sum.k1, sum.dk)} · geometrie ${zl(sum.e0, sum.e1, sum.de)}`);
}
