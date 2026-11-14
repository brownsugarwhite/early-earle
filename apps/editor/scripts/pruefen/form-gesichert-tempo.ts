// Form zuerst (10.11.2026): Wohin geht die Zeit an einer gesicherten Form (`wesen/<Name>.eewesen`)? Im Kern, ohne Fenster:
//   1  Löser anlegen mit Zerlegen (so beginnt ein Zug ohne fertige Zerlegung) und mit fertiger Zerlegung (so beginnt er sonst)
//   2  eine Runde im Zug (der oberste Punkt ein Stück hinauf), nach Teilen: vermessen, intrinsisch, Krümmung, lösen
//   3  wie viele Runden die Haut braucht, bis sie steht (größter Weg je Runde), und wie weit sie dabei geht
//   4  Verdichten des Stands (ohne dass etwas zu tun ist: reine Prüfung aller Kanten)
// Aufruf aus packages/shape: NAME="teat firefish" npx vite-node ../../apps/editor/scripts/pruefen/form-gesichert-tempo.ts
//   DATEI=<pfad zu einer .eewesen>   ZUG="0,60,0"   RUNDEN=40
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, LoopZug, mittlereKante, verschiebungLaengs } from '../../../../packages/shape/src/dicht/loops';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';
import { type WesenStand, entpacken } from '../../src/form/ablage';

const datei = process.env.DATEI ?? fileURLToPath(new URL(`../../../../wesen/${process.env.NAME ?? 'teat firefish'}.eewesen`, import.meta.url));
const [zx, zy, zz] = (process.env.ZUG ?? '0,60,0').split(',').map(Number) as [number, number, number];
const RUNDEN = Number(process.env.RUNDEN ?? 40);
const st: WesenStand = entpacken(new Uint8Array(fs.readFileSync(datei)));
const f = st.haut;
const nachbarn: number[][] = new Array<number[]>(f.n);
for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(f.nb.subarray(f.nbStart[v]!, f.nbStart[v + 1]!));
const h: Haut = { pos: f.pos, tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel };
const loops: Loop[] = st.loops;
const ms = (t: number): string => `${(performance.now() - t).toFixed(0)} ms`;
console.log(`${datei.split('/').pop()}: ${h.n} Punkte, ${h.tri.length / 3} Dreiecke, ${loops.length} Loops, mittlere Kante ${mittlereKante(h).toFixed(2)} (Startkante ${st.mk.toFixed(2)})`);

// 1 Löser anlegen
let t = performance.now();
const erster = new LoopZug(h, loops, null, true, 'kurven', 'geometrie');
console.log(`1  Löser anlegen mit Zerlegen: ${ms(t)}`);
const vorlage = erster.vorlage!;
t = performance.now();
const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorlage });
console.log(`   Löser anlegen mit fertiger Zerlegung (so beginnt ein Zug): ${ms(t)}`);

// 2 Runden im Zug: der oberste Punkt hinauf
let wer: { l: Loop; i: number } | null = null;
for (const l of loops) l.punkte.forEach((p, i) => (!wer || p.ref.y > wer.l.punkte[wer.i]!.ref.y ? (wer = { l, i }) : 0));
const oben = wer!.l.punkte[wer!.i]!;
const k = oben.kreuzung;
const D: V3 = { x: zx, y: zy, z: zz };
const versch = loops.map((l) => {
  const i = k === undefined ? (l === wer!.l ? wer!.i : -1) : l.punkte.findIndex((p) => p.kreuzung === k);
  if (i < 0) return null;
  const d = verschiebungLaengs(
    l,
    l.punkte.map((_, q) => (q === i ? D : { x: 0, y: 0, z: 0 })),
  );
  if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
  return d;
});
const lz = (z.loeser as unknown as { zeiten: Record<string, number> }).zeiten;
const vor = new Float64Array(h.pos.length);
const wege: number[] = [];
const dauer: number[] = [];
for (let r = 0; r < RUNDEN; r++) {
  vor.set(h.pos);
  t = performance.now();
  z.schritt(versch, 1);
  dauer.push(performance.now() - t);
  let w = 0;
  for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!));
  wege.push(w);
}
const mittel = dauer.slice(2).reduce((s, v) => s + v, 0) / Math.max(1, dauer.length - 2);
console.log(`2  eine Runde im Zug (oberster Punkt ${oben.ref.x.toFixed(0)}, ${oben.ref.y.toFixed(0)} um ${zx}, ${zy}, ${zz}): im Mittel ${mittel.toFixed(1)} ms (erste ${dauer[0]!.toFixed(0)} ms)`);
console.log(`   Teile über ${lz.runden} Runden, je Runde: ${Object.entries(lz).filter(([n]) => n !== 'runden' && n !== 'schritte').map(([n, v]) => `${n} ${(v / lz.runden!).toFixed(1)} ms`).join(', ')}; Schritte der Krümmung je Runde ${(lz.schritte! / lz.runden!).toFixed(1)}`);
const steht = wege.findIndex((w) => w < 0.02);
console.log(`3  größter Weg je Runde: ${wege.slice(0, 12).map((w) => w.toFixed(2)).join(' ')} … Runde ${RUNDEN}: ${wege[RUNDEN - 1]!.toFixed(3)} · unter 0,02 nach ${steht < 0 ? `mehr als ${RUNDEN}` : steht + 1} Runden`);

// 4 Verdichten (Prüfung aller Kanten)
t = performance.now();
const MK = st.mk;
const v = verdichten(h, loops, 1.75 * MK, { kurz: 0.5 * MK, genau: MK / 40 });
console.log(`4  Verdichten nach dem Zug: ${ms(t)} (${v ? `neu ${v.neu}, gelegt ${v.gelegt}, gedreht ${v.gedreht}` : 'nichts zu tun'})`);
