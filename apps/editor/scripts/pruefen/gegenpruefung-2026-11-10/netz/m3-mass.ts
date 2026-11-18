 
// Gegenprüfung Frage 4: Was liest das Krümmungsmaß des Lösers (vermessen: Normalanteil des gleich gewichteten Laplace durch das
// mittlere Kantenquadrat) auf einer GENAU bekannten Fläche, und wie ändert es sich allein durch das Netz?
//  (a) genaue Kugel R = 150: Startnetz, mit drei eingesetzten Loops (wo liegen die eingesetzten Punkte?), nach dem Teilen
//  (b) genaues Ellipsoid (Kugel in x × S): gestrecktes Netz, dann geteilt wie nach einem Zug; alle Punkte genau auf der Fläche
// Jeweils mit den Normalen des Lösers (nach Fläche gemittelt) und mit den wahren Normalen.
import { loopEinsetzen } from '../../../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, gewichteAus, hautAus, hautNormalen, vermessen } from '../../../../../../packages/shape/src/dicht/kurven';
import { type Loop, loopAusSchnitt, mittlereKante } from '../../../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../../../packages/shape/src/dicht/rund';
import { verdichten } from '../../../../../../packages/shape/src/dicht/verdichten';
import { quantil } from './netzstat';

const R = 150;
const f = (x: number, d = 3) => x.toFixed(d);
const roh = (() => {
  const n = rundAusSeite(
    [
      { x: R, y: 0 },
      { x: 0, y: R },
      { x: -R, y: 0 },
      { x: 0, y: -R },
    ],
    { dreiecke: 6000 },
  );
  return hautAus(n.positionen, n.indizes);
})();
/** alle Punkte radial genau auf die Kugel */
const aufKugel = (h: Haut): Haut => {
  const pos = Float64Array.from(h.pos);
  for (let v = 0; v < h.n; v++) {
    const l = Math.hypot(pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!);
    for (let k = 0; k < 3; k++) pos[3 * v + k] = (pos[3 * v + k]! * R) / l;
    if (Math.abs(pos[3 * v + 2]!) < 1e-9) pos[3 * v + 2] = 0;
  }
  return hautAus(pos, h.tri);
};
const kugelNormalen = (h: Haut): Float64Array => {
  const n = new Float64Array(3 * h.n);
  for (let v = 0; v < h.n; v++) {
    const l = Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!);
    for (let k = 0; k < 3; k++) n[3 * v + k] = h.pos[3 * v + k]! / l;
  }
  return n;
};
const stat = (w: number[]) => {
  const m = w.reduce((s, x) => s + x, 0) / Math.max(1, w.length);
  const sd = Math.sqrt(w.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, w.length));
  return `Mittel ${f(m)}, Streuung ${f(sd)}, 5 % ${f(quantil(w, 0.05))}, 95 % ${f(quantil(w, 0.95))}, kleinstes ${f(Math.min(...w))}, größtes ${f(Math.max(...w))} (${w.length} Punkte)`;
};
/** Maß des Lösers × 2R (Kugel: 1) */
const mass = (h: Haut, nor?: Float64Array): Float64Array => vermessen(h, gewichteAus(h, null), nor).kap.map((k) => k * 2 * R);

console.log('=== (a) genaue Kugel R = 150 ===');
const k0 = aufKugel(roh);
const MK = mittlereKante(k0);
console.log(`Startnetz ${k0.n} Punkte, mittlere Kante ${f(MK, 2)}`);
console.log(`  Maß × 2R mit Normalen nach Fläche: ${stat(Array.from(mass(k0)))}`);
console.log(`  Maß × 2R mit wahren Normalen:      ${stat(Array.from(mass(k0, kugelNormalen(k0))))}`);
{
  // Anteile des Laplace: normal (= Krümmung · Kante²) gegen tangential (Verteilung der Punkte)
  const m = vermessen(k0, gewichteAus(k0, null), kugelNormalen(k0));
  const nrm: number[] = [];
  const tg: number[] = [];
  for (let v = 0; v < k0.n; v++) {
    nrm.push(Math.abs(m.kap[v]! * m.kante2[v]!));
    tg.push(Math.hypot(m.tang[3 * v]!, m.tang[3 * v + 1]!, m.tang[3 * v + 2]!));
  }
  console.log(`  Laplace je Punkt: Normalanteil Median ${f(quantil(nrm, 0.5))}, Tangentialanteil Median ${f(quantil(tg, 0.5))}, 95 % ${f(quantil(tg, 0.95))} (Einheiten)`);
}

// drei Loops einsetzen wie das Fenster / dreiLoops (ohne Griffe; hier zählt nur das Netz)
let h = k0;
let loops: Loop[] = [];
for (const [a, A, B] of [
  ['seite', [-200, 0], [200, 0]],
  ['top', [-200, 0], [200, 0]],
  ['seite', [10, 200], [10, -200]],
] as const) {
  loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
  const r = loopEinsetzen(h, loops, loops.length - 1)!;
  h = r.haut;
  loops = r.loops;
}
const aufLinie = new Set<number>();
for (const l of loops)
  for (const p of l.proben) {
    aufLinie.add(p.ecken[0]);
    const s = h.spiegel[p.ecken[0]]!;
    if (s >= 0) aufLinie.add(s);
  }
const neben = new Set<number>();
for (const v of aufLinie) for (const w of h.nachbarn[v]!) if (!aufLinie.has(w)) neben.add(w);
{
  const dist = (v: number) => Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!) - R;
  const dl = [...aufLinie].map(dist);
  const dn = [...neben].map(dist);
  const neuAnz = h.n - k0.n;
  console.log(`\nmit drei eingesetzten Loops: ${h.n} Punkte (+${neuAnz}); ${aufLinie.size} Punkte auf Linien, ${neben.size} daneben`);
  console.log(`  Punkte auf den Linien von der Kugel (− = innen): ${stat(dl)}`);
  console.log(`  Punkte neben den Linien von der Kugel:           ${stat(dn)}`);
  const m = mass(h);
  const mw = mass(h, kugelNormalen(h));
  const rest: number[] = [];
  const restW: number[] = [];
  for (let v = 0; v < h.n; v++)
    if (!aufLinie.has(v) && !neben.has(v)) {
      rest.push(m[v]!);
      restW.push(mw[v]!);
    }
  console.log(`  Maß × 2R (Normalen nach Fläche) auf den Linien: ${stat([...aufLinie].map((v) => m[v]!))}`);
  console.log(`  Maß × 2R (Normalen nach Fläche) neben den Linien: ${stat([...neben].map((v) => m[v]!))}`);
  console.log(`  Maß × 2R (Normalen nach Fläche) sonst: ${stat(rest)}`);
  console.log(`  Maß × 2R (wahre Normalen) auf den Linien: ${stat([...aufLinie].map((v) => mw[v]!))}`);
  console.log(`  Maß × 2R (wahre Normalen) neben den Linien: ${stat([...neben].map((v) => mw[v]!))}`);
  console.log(`  Maß × 2R (wahre Normalen) sonst: ${stat(restW)}`);
  // dieselbe Topologie, alle Punkte genau auf der Kugel: was bleibt, ist nur das Netz
  const hk = aufKugel(h);
  const m2 = mass(hk);
  console.log(`  alle Punkte genau auf die Kugel gelegt, Maß × 2R (Normalen nach Fläche) auf den Linien: ${stat([...aufLinie].map((v) => m2[v]!))}`);
  console.log(`  alle Punkte genau auf die Kugel gelegt, Maß × 2R (Normalen nach Fläche) sonst: ${stat(Array.from(m2).filter((_, v) => !aufLinie.has(v) && !neben.has(v)))}`);
}

// Teilen auf der genauen Kugel: Maß an den alten Punkten vorher / nachher (neue Punkte genau auf die Kugel gelegt)
{
  const v = verdichten(k0, [], 1.0 * MK, {})!;
  const hk = aufKugel(v.haut);
  const vor = mass(k0);
  const nach = mass(hk);
  const d: number[] = [];
  const nv: number[] = [];
  for (let q = 0; q < hk.n; q++) {
    const a = v.alt[q]!;
    if (a < 0) {
      nv.push(nach[q]!);
      continue;
    }
    d.push(Math.abs(nach[q]! - vor[a]!));
  }
  console.log(`\nKugel geteilt (Kanten über 1,0 MK), alle Punkte genau auf der Kugel: ${k0.n} → ${hk.n}`);
  console.log(`  Maß × 2R (Normalen nach Fläche) nachher, alle: ${stat(Array.from(nach))}`);
  console.log(`  an den alten Punkten geändert um: Mittel ${f(d.reduce((s, x) => s + x, 0) / d.length)}, 95 % ${f(quantil(d, 0.95))}, größtes ${f(Math.max(...d))}`);
  console.log(`  an den neuen Punkten: ${stat(nv)}`);
}

// (b) Ellipsoid
for (const S of [2, 4]) {
  const a = S * R;
  const b = R;
  const strecken = (hh: Haut): Haut => {
    const pos = Float64Array.from(hh.pos);
    for (let v = 0; v < hh.n; v++) pos[3 * v] = pos[3 * v]! * S;
    return hautAus(pos, hh.tri);
  };
  /** radial zur Mitte auf das Ellipsoid (für fast aufliegende Punkte) */
  const aufEll = (hh: Haut): Haut => {
    const pos = Float64Array.from(hh.pos);
    for (let v = 0; v < hh.n; v++) {
      const q = Math.sqrt((pos[3 * v]! / a) ** 2 + (pos[3 * v + 1]! / b) ** 2 + (pos[3 * v + 2]! / b) ** 2);
      for (let k = 0; k < 3; k++) pos[3 * v + k] = pos[3 * v + k]! / q;
      if (Math.abs(pos[3 * v + 2]!) < 1e-9) pos[3 * v + 2] = 0;
    }
    return hautAus(pos, hh.tri);
  };
  const ellNormalen = (hh: Haut): Float64Array => {
    const n = new Float64Array(3 * hh.n);
    for (let v = 0; v < hh.n; v++) {
      const g = [hh.pos[3 * v]! / (a * a), hh.pos[3 * v + 1]! / (b * b), hh.pos[3 * v + 2]! / (b * b)];
      const l = Math.hypot(g[0]!, g[1]!, g[2]!);
      for (let k = 0; k < 3; k++) n[3 * v + k] = g[k]! / l;
    }
    return n;
  };
  /** wahre mittlere Krümmung H = (κ1 + κ2)/2; das Maß des Lösers wäre auf einem gleichmäßigen Netz H/2 */
  const H = (hh: Haut, v: number): number => {
    const x = hh.pos[3 * v]!;
    const y = hh.pos[3 * v + 1]!;
    const z = hh.pos[3 * v + 2]!;
    const hs = 1 / Math.sqrt((x * x) / a ** 4 + (y * y + z * z) / b ** 4);
    return (hs ** 3 * (a * a + 2 * b * b - (x * x + y * y + z * z))) / (2 * a * a * b * b * b * b);
  };
  const e0 = strecken(k0);
  const verh = (hh: Haut, nor?: Float64Array): number[] => {
    const m = vermessen(hh, gewichteAus(hh, null), nor).kap;
    return Array.from(m, (k, v) => k / (H(hh, v) / 2));
  };
  // nur der Rumpf (|x| < 0,8 a): an den Polen ist das Netz kaum gestreckt
  const rumpf = (hh: Haut, w: number[]) => w.filter((_, v) => Math.abs(hh.pos[3 * v]!) < 0.8 * a);
  console.log(`\n=== (b) genaues Ellipsoid, Kugelnetz in x × ${S} ===`);
  console.log(`  gestreckt: Maß / (H/2), wahre Normalen, Rumpf: ${stat(rumpf(e0, verh(e0, ellNormalen(e0))))}`);
  console.log(`  gestreckt: Maß / (H/2), Normalen nach Fläche, Rumpf: ${stat(rumpf(e0, verh(e0)))}`);
  const v = verdichten(e0, [], 1.75 * MK, { kurz: 0.5 * MK })!;
  const e1 = aufEll(v.haut);
  console.log(`  verdichtet wie nach einem Zug: ${e0.n} → ${e1.n} Punkte (+${v.neu}, ${v.gelegt} zusammengelegt, ${v.gedreht} gedreht), alle genau auf der Fläche`);
  console.log(`  verdichtet: Maß / (H/2), wahre Normalen, Rumpf: ${stat(rumpf(e1, verh(e1, ellNormalen(e1))))}`);
  console.log(`  verdichtet: Maß / (H/2), Normalen nach Fläche, Rumpf: ${stat(rumpf(e1, verh(e1)))}`);
  // an den alten Punkten, die blieben
  const vorW = vermessen(e0, gewichteAus(e0, null), ellNormalen(e0)).kap;
  const nachW = vermessen(e1, gewichteAus(e1, null), ellNormalen(e1)).kap;
  const vorF = vermessen(e0, gewichteAus(e0, null)).kap;
  const nachF = vermessen(e1, gewichteAus(e1, null)).kap;
  const rw: number[] = [];
  const rf: number[] = [];
  for (let q = 0; q < e1.n; q++) {
    const p = v.alt[q]!;
    if (p < 0 || Math.abs(e0.pos[3 * p]!) > 0.8 * a) continue;
    if (Math.hypot(e1.pos[3 * q]! - e0.pos[3 * p]!, e1.pos[3 * q + 1]! - e0.pos[3 * p + 1]!, e1.pos[3 * q + 2]! - e0.pos[3 * p + 2]!) > 1e-6) continue;
    rw.push(nachW[q]! / vorW[p]!);
    rf.push(nachF[q]! / vorF[p]!);
  }
  console.log(`  alte, unbewegte Punkte im Rumpf: Maß nachher / vorher, wahre Normalen: ${stat(rw)}`);
  console.log(`  alte, unbewegte Punkte im Rumpf: Maß nachher / vorher, Normalen nach Fläche: ${stat(rf)}`);
  void hautNormalen;
}
