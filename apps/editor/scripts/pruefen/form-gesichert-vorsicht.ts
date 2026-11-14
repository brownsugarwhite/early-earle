// Form zuerst (10.11.2026): Was kostet die Vorsicht bei Unruhe im Löser (`dicht/ausKurven.ts`)? An einer gesicherten Form derselbe Zug
// ohne und mit ihr (alle Punkte, je Richtung; wie `form-gesichert-stabil.ts`), gezeigt werden die Fälle, in denen sie eingreift:
// Runden bis zur Ruhe, größter Weg in einer Runde, Summe der Wege, wie weit die zwei Häute am Ende auseinander liegen, und die Knicke
// der Haut am Ende (Kanten, über die sich die Fläche um mehr als 60° bzw. 120° dreht).
// Aufruf aus packages/shape: NAME="strange bird" npx vite-node ../../apps/editor/scripts/pruefen/form-gesichert-vorsicht.ts
//   WEIT="60,150"   SCHRITTE=10   RUNDEN=80
import fs from 'node:fs';
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, LoopZug, verschiebungLaengs } from '../../../../packages/shape/src/dicht/loops';
import { type WesenStand, entpacken } from '../../src/form/ablage';

const datei = new URL(`../../../../wesen/${process.env.NAME ?? 'strange bird'}.eewesen`, import.meta.url).pathname.replace(/%20/g, ' ');
const WEIT = (process.env.WEIT ?? '60,150').split(',').map(Number);
const SCHRITTE = Number(process.env.SCHRITTE ?? 10);
const RUNDEN = Number(process.env.RUNDEN ?? 80);
const st: WesenStand = entpacken(new Uint8Array(fs.readFileSync(datei)));
const f = st.haut;
const nachbarn: number[][] = new Array<number[]>(f.n);
for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(f.nb.subarray(f.nbStart[v]!, f.nbStart[v + 1]!));
const pos0 = Float64Array.from(f.pos);
const loops: Loop[] = st.loops;
const haut = (): Haut => ({ pos: Float64Array.from(pos0), tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel });
const vorlage = new LoopZug(haut(), loops, null, true, 'kurven', 'geometrie').vorlage!;
type Fall = { l: Loop; i: number; D: V3; name: string };
const faelle: Fall[] = [];
const gesehen = new Set<number>();
const punkte: { l: Loop; i: number }[] = [];
for (const l of loops)
  l.punkte.forEach((p, i) => {
    if (p.vonSelbst) return;
    if (p.kreuzung !== undefined) {
      if (gesehen.has(p.kreuzung)) return;
      gesehen.add(p.kreuzung);
    }
    punkte.push({ l, i });
  });
punkte.sort((a, b) => b.l.punkte[b.i]!.ref.y - a.l.punkte[a.i]!.ref.y);
for (const { l, i } of punkte) {
  const p = l.punkte[i]!;
  const aufMitte = Math.abs(p.ref.z) < 1e-6;
  for (const w of WEIT) {
    const r: [string, V3][] = [
      ['hinauf', { x: 0, y: w, z: 0 }],
      ['hinab', { x: 0, y: -w, z: 0 }],
      ['vor', { x: -w, y: 0, z: 0 }],
      ['zurück', { x: w, y: 0, z: 0 }],
    ];
    if (!aufMitte) r.push(['außen', { x: 0, y: 0, z: w }], ['innen', { x: 0, y: 0, z: -Math.min(w, 0.8 * Math.abs(p.ref.z)) }]);
    for (const [n, D] of r) faelle.push({ l, i, D, name: `${l.id}:${i} ${n} ${w}` });
  }
}
const lauf = (fall: Fall, vorsicht: boolean) => {
  const h = haut();
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorlage, vorsicht });
  const k = fall.l.punkte[fall.i]!.kreuzung;
  const ziel = (anteil: number) =>
    loops.map((l) => {
      const i = k === undefined ? (l === fall.l ? fall.i : -1) : l.punkte.findIndex((p) => p.kreuzung === k);
      if (i < 0) return null;
      const d = verschiebungLaengs(
        l,
        l.punkte.map((_, q) => (q === i ? { x: fall.D.x * anteil, y: fall.D.y * anteil, z: fall.D.z * anteil } : { x: 0, y: 0, z: 0 })),
      );
      if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
      return d;
    });
  const vor = new Float64Array(h.pos.length);
  let w = 0;
  let summe = 0;
  const runde = (d: (Float64Array | null)[]): void => {
    vor.set(h.pos);
    z.schritt(d, 1);
    w = 0;
    for (let i = 0; i < vor.length; i += 3) {
      const a = Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!);
      if (a > w || a !== a) w = a;
    }
  };
  let d = ziel(0);
  for (let s = 1; s <= SCHRITTE; s++) {
    d = ziel(s / SCHRITTE);
    runde(d);
  }
  let runden = 0;
  let groesster = 0;
  for (; runden < RUNDEN; runden++) {
    runde(d);
    summe += w;
    groesster = Math.max(groesster, w);
    if (w < 0.02) break;
  }
  return { h, runden: runden + (w < 0.02 ? 1 : 0), steht: w < 0.02, ende: w, summe, groesster, unruhe: z.unruhe };
};
/** Knicke der Haut: Kanten, über die sich die Fläche um mehr als 60° bzw. 120° dreht (120°: umgeklappt) */
const kanten: [number, number][] = [];
{
  const von = new Map<string, number>();
  for (let t = 0; t < f.tri.length / 3; t++)
    for (let e = 0; e < 3; e++) {
      const a = f.tri[3 * t + e]!;
      const b = f.tri[3 * t + ((e + 1) % 3)]!;
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      const o = von.get(k);
      if (o === undefined) von.set(k, t);
      else kanten.push([o, t]);
    }
}
const knicke = (h: Haut): [number, number] => {
  const P = h.pos;
  const N = new Float64Array(f.tri.length);
  for (let t = 0; t < f.tri.length / 3; t++) {
    const a = f.tri[3 * t]!;
    const b = f.tri[3 * t + 1]!;
    const c = f.tri[3 * t + 2]!;
    const ux = P[3 * b]! - P[3 * a]!;
    const uy = P[3 * b + 1]! - P[3 * a + 1]!;
    const uz = P[3 * b + 2]! - P[3 * a + 2]!;
    const vx = P[3 * c]! - P[3 * a]!;
    const vy = P[3 * c + 1]! - P[3 * a + 1]!;
    const vz = P[3 * c + 2]! - P[3 * a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    N[3 * t] = nx / l;
    N[3 * t + 1] = ny / l;
    N[3 * t + 2] = nz / l;
  }
  let k60 = 0;
  let k120 = 0;
  for (const [s, t] of kanten) {
    const c = N[3 * s]! * N[3 * t]! + N[3 * s + 1]! * N[3 * t + 1]! + N[3 * s + 2]! * N[3 * t + 2]!;
    if (c < 0.5) k60++;
    if (c < -0.5) k120++;
  }
  return [k60, k120];
};
const ruheKnicke = knicke(haut());
console.log(`Knicke der gesicherten Form: über 60° ${ruheKnicke[0]}, über 120° ${ruheKnicke[1]}`);
let n = 0;
const mehr: number[] = [];
const besser = { mit: 0, ohne: 0, gleich: 0 };
for (const fall of faelle) {
  const b = lauf(fall, true);
  if (b.unruhe.stufen === 0 && !b.unruhe.fest) continue;
  n++;
  const a = lauf(fall, false);
  let weg = 0;
  for (let i = 0; i < a.h.pos.length; i++) weg = Math.max(weg, Math.abs(a.h.pos[i]! - b.h.pos[i]!));
  if (a.steht && b.steht) mehr.push(b.runden - a.runden);
  const ka = knicke(a.h);
  const kb = knicke(b.h);
  if (kb[1] < ka[1] || (kb[1] === ka[1] && kb[0] < ka[0])) besser.mit++;
  else if (kb[1] === ka[1] && kb[0] === ka[0]) besser.gleich++;
  else besser.ohne++;
  console.log(
    `${fall.name.padEnd(20)} ohne: ${a.steht ? `steht nach ${a.runden}` : `steht nicht (${a.ende.toFixed(2)})`}, größter Weg ${a.groesster.toFixed(1)}, Summe ${a.summe.toFixed(0)} · ` +
      `mit: ${b.steht ? `steht nach ${b.runden}` : `steht nicht (${b.ende.toFixed(2)})`}, größter Weg ${b.groesster.toFixed(1)}, Summe ${b.summe.toFixed(0)}, ${b.unruhe.stufen}-mal halbiert${b.unruhe.fest ? ', stehen geblieben' : ''} · Häute am Ende bis ${weg.toFixed(2)} auseinander · Knicke über 60°/120°: ohne ${ka[0]}/${ka[1]}, mit ${kb[0]}/${kb[1]}`,
  );
}
console.log(`Knicke am Ende: mit Vorsicht weniger in ${besser.mit} Fällen, gleich in ${besser.gleich}, mehr in ${besser.ohne}`);
console.log(`${n} von ${faelle.length} Fällen mit Vorsicht; wo beide stehen (${mehr.length}): Runden mehr im Mittel ${(mehr.reduce((s, v) => s + v, 0) / Math.max(1, mehr.length)).toFixed(1)}, höchstens ${Math.max(0, ...mehr)}`);
