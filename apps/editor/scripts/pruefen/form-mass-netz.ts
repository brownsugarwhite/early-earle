// Form zuerst (09.11.2026), Florians Frage: „warum das verdichtete Mesh überhaupt eine andere Form annimmt … sollte einfach nur abrunden,
// aber in exakt der gleichen Form“. Gemessen: das Krümmungsmaß des heutigen Lösers (gleiche Gewichte: Normalanteil des Laplace durch das
// Kantenquadrat, Normalen nach Fläche) und das nach der Geometrie (Kotangens auf der intrinsischen Delaunay-Triangulierung) an denselben
// Punkten derselben Fläche, vor und nach dem Verfeinern. Das Verfeinern bewegt die alten Punkte nicht; jede Änderung des Maßes dort kommt
// also nur vom Netz um sie herum. Ablauf: Kugel mit drei Loops, Hörner 170 hinaus (wie `form-richtung-horn.ts`, ohne Verdichten im Zug),
// dann verdichtet wie das Fenster nach dem Loslassen. Ausgabe je Bereich (Horn: y > 170, Rest): Seitenverhältnis der Dreiecke, Maß vorher
// und nachher (×300, Kugel 1) und wie stark es sich ändert.
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-mass-netz.ts
import { intrinsischeGewichte } from '../../../../packages/shape/src/dicht/intrinsisch';
import { type Haut, gewichteAus, hautNormalen, vermessen } from '../../../../packages/shape/src/dicht/kurven';
import { dreiLoops } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type V3, LoopZug, festlegen, mittlereKante, punktEinfuegen, verschiebungLaengs } from '../../../../packages/shape/src/dicht/loops';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';

const start = dreiLoops();
const h0 = start.h;
const loops = start.loops;
const ring = loops.find((l) => l.art === 'ring' && !l.punkte.every((p) => Math.abs(p.ref.y) < 30))!;
const R = ring.ruhe;
const winkelVon = (j: number) => (Math.atan2(R[3 * j + 2]!, R[3 * j + 1]!) * 180) / Math.PI;
const gezogen = new Set<unknown>();
for (const w of [45, 65]) {
  let best = 0;
  for (let j = 0; j < ring.s.length; j++) if (Math.abs(winkelVon(j) - w) < Math.abs(winkelVon(best) - w)) best = j;
  gezogen.add(punktEinfuegen(ring, ring.s[best]!));
}
const wi = (35 * Math.PI) / 180;
const z = new LoopZug(h0, loops, null, true, 'kurven', 'gleich');
const ri = loops.indexOf(ring);
for (let k = 1; k <= 30; k++) {
  const f = (170 * k) / 30;
  const D: V3[] = ring.punkte.map((p) => (gezogen.has(p) ? { x: 0, y: Math.cos(wi) * f, z: Math.sin(wi) * f } : { x: 0, y: 0, z: 0 }));
  z.schritt(
    loops.map((_, i) => (i === ri ? verschiebungLaengs(ring, D) : null)),
    2,
  );
}
for (const l of loops) festlegen(h0, l, false);

// Maße auf einer Haut: gleiche Gewichte (wie der Löser) und nach der Geometrie
const masse = (h: Haut) => {
  const nor = hautNormalen(h);
  const gleich = vermessen(h, gewichteAus(h, null), nor).kap;
  const ig = intrinsischeGewichte(h, null);
  const geo = new Float64Array(h.n);
  for (let v = 0; v < h.n; v++) {
    let s = 0;
    let hh = 0;
    let e2 = 0;
    for (let k = ig.start[v]!; k < ig.start[v + 1]!; k++) {
      const j = ig.nb[k]!;
      const w = ig.w[k]!;
      s += w;
      hh += w * ((h.pos[3 * v]! - h.pos[3 * j]!) * nor[3 * v]! + (h.pos[3 * v + 1]! - h.pos[3 * j + 1]!) * nor[3 * v + 1]! + (h.pos[3 * v + 2]! - h.pos[3 * j + 2]!) * nor[3 * v + 2]!);
      e2 += w * ig.l2[k]!;
    }
    geo[v] = s > 0 && e2 > 0 ? hh / e2 : 0;
  }
  return { gleich, geo };
};
// größtes Seitenverhältnis (längste / kürzeste Kante) je Dreieck, gemittelt je Punkt
const streckung = (h: Haut) => {
  const st = new Float64Array(h.n);
  const zahl = new Float64Array(h.n);
  const P = h.pos;
  const l = (a: number, b: number) => Math.hypot(P[3 * a]! - P[3 * b]!, P[3 * a + 1]! - P[3 * b + 1]!, P[3 * a + 2]! - P[3 * b + 2]!);
  for (let t = 0; t < h.tri.length; t += 3) {
    const a = h.tri[t]!;
    const b = h.tri[t + 1]!;
    const c = h.tri[t + 2]!;
    const e = [l(a, b), l(b, c), l(c, a)];
    const r = Math.max(...e) / Math.max(1e-9, Math.min(...e));
    for (const v of [a, b, c]) {
      st[v] = st[v]! + r;
      zahl[v] = zahl[v]! + 1;
    }
  }
  for (let v = 0; v < h.n; v++) st[v] = st[v]! / Math.max(1, zahl[v]!);
  return st;
};
const vorher = masse(h0);
const stVor = streckung(h0);
const MK = mittlereKante(h0);
const v = verdichten(h0, loops, 1.75 * MK, { kurz: 0.5 * MK, genau: MK / 40 })!;
const h1 = v.haut;
const nachher = masse(h1);
const stNach = streckung(h1);
// alte Punkte, die bleiben (nicht auf einer Linie, nicht bewegt)
const zeilen: Record<string, { n: number; stV: number; stN: number; gV: number; gN: number; dG: number; eV: number; eN: number; dE: number }> = {};
for (let q = 0; q < h1.n; q++) {
  const p = v.alt[q]!;
  if (p < 0) continue;
  const bewegt = Math.hypot(h1.pos[3 * q]! - h0.pos[3 * p]!, h1.pos[3 * q + 1]! - h0.pos[3 * p + 1]!, h1.pos[3 * q + 2]! - h0.pos[3 * p + 2]!);
  if (bewegt > 1e-9) continue;
  const bereich = h0.pos[3 * p + 1]! > 170 ? 'Horn (y > 170)' : 'Rest';
  const z2 = (zeilen[bereich] ??= { n: 0, stV: 0, stN: 0, gV: 0, gN: 0, dG: 0, eV: 0, eN: 0, dE: 0 });
  z2.n++;
  z2.stV += stVor[p]!;
  z2.stN += stNach[q]!;
  z2.gV += vorher.gleich[p]! * 300;
  z2.gN += nachher.gleich[q]! * 300;
  z2.dG += Math.abs(nachher.gleich[q]! - vorher.gleich[p]!) * 300;
  z2.eV += vorher.geo[p]! * 300;
  z2.eN += nachher.geo[q]! * 300;
  z2.dE += Math.abs(nachher.geo[q]! - vorher.geo[p]!) * 300;
}
console.log(`verdichtet: ${h0.n} → ${h1.n} Punkte; gemessen an alten Punkten, die nicht bewegt wurden (gleiche Fläche, nur anderes Netz drumherum)`);
for (const [b, s] of Object.entries(zeilen)) {
  const n = s.n;
  console.log(
    `${b} (${n} Punkte): Seitenverhältnis der Dreiecke ${(s.stV / n).toFixed(2)} → ${(s.stN / n).toFixed(2)}; ` +
      `heutiges Maß im Mittel ${(s.gV / n).toFixed(3)} → ${(s.gN / n).toFixed(3)}, je Punkt geändert um ${(s.dG / n).toFixed(3)}; ` +
      `nach der Geometrie ${(s.eV / n).toFixed(3)} → ${(s.eN / n).toFixed(3)}, je Punkt um ${(s.dE / n).toFixed(3)}`,
  );
}
