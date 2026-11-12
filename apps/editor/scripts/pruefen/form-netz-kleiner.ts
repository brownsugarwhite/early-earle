// Plan vom 12.11., Schritt 2 „kleines Rechennetz“, im Kern ohne Fenster: eine gesicherte Form (`wesen/<Name>.eewesen`) auf ein
// gröberes Netz bringen und vergleichen.
//   1  die Form auf ihrem Netz rechnen, bis sie steht (Löser aus den Kurven, nach der Geometrie): Zeit je Runde
//   2  das Netz vergröbern: `verdichten` mit der größeren Startkante (FAKTOR × die gesicherte), bis nichts mehr zu tun ist
//   3  die Form auf dem neuen Netz rechnen, bis sie steht: Zeit je Runde, Runden
//   4  Abstand der beiden Häute: die neuen Punkte gegen die alte Fläche und die alten gegen die neue (Mittel, 95 %, größter)
// Aufruf aus packages/shape: NAME="strange bird" FAKTOR=1.73 npx vite-node ../../apps/editor/scripts/pruefen/form-netz-kleiner.ts
//   GENAU=fest|mit (Genauigkeit der Linien in Einheiten wie bisher, oder mit der Startkante gewachsen; Standard fest)
//   KURZ=0.5 (Kanten unter diesem Anteil der neuen Startkante fallen zusammen)   RUNDEN=80   DATEI=<pfad zu einer .eewesen>
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Haut } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, LoopZug, mittlereKante } from '../../../../packages/shape/src/dicht/loops';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';
import { type WesenStand, entpacken } from '../../src/form/ablage';
import { flaechenAbstand } from './flaechenabstand';

const datei = process.env.DATEI ?? fileURLToPath(new URL(`../../../../wesen/${process.env.NAME ?? 'strange bird'}.eewesen`, import.meta.url));
const FAKTOR = Number(process.env.FAKTOR ?? Math.sqrt(3));
const KURZ = Number(process.env.KURZ ?? 0.5);
const RUNDEN = Number(process.env.RUNDEN ?? 80);
const GENAU_MIT = process.env.GENAU === 'mit';
const st: WesenStand = entpacken(new Uint8Array(fs.readFileSync(datei)));
if (st.grund) throw new Error('Die Form ist in der Pose gesichert; diese Probe rechnet nur die Grundform.');
const f = st.haut;
const nachbarn: number[][] = new Array<number[]>(f.n);
for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(f.nb.subarray(f.nbStart[v]!, f.nbStart[v + 1]!));
const alt: Haut = { pos: Float64Array.from(f.pos), tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel };
const loopsAlt: Loop[] = st.loops;
const z3 = (x: number): string => x.toFixed(2).replace('.', ',');
const ort = (x: number, y: number, z: number): string => `(${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)})`;

/** die Haut rechnen, bis sie in einer Runde weniger als 0,02 geht */
function setzen(h: Haut, loops: readonly Loop[]): { anlegen: number; runden: number; msRunde: number; weg: number; wo: string; steht: boolean } {
  let t = performance.now();
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
  const anlegen = performance.now() - t;
  const ruhig = loops.map(() => null);
  const anfang = Float64Array.from(h.pos);
  const vor = new Float64Array(h.pos.length);
  const dauer: number[] = [];
  let steht = false;
  for (let r = 0; r < RUNDEN && !steht; r++) {
    vor.set(h.pos);
    t = performance.now();
    z.schritt(ruhig, 1);
    dauer.push(performance.now() - t);
    let w = 0;
    for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!));
    if (!Number.isFinite(w)) throw new Error(`Lagen nicht endlich in Runde ${r + 1}`);
    steht = w < 0.02;
  }
  let weg = 0;
  let wo = '';
  for (let i = 0; i < anfang.length; i += 3) {
    const w = Math.hypot(h.pos[i]! - anfang[i]!, h.pos[i + 1]! - anfang[i + 1]!, h.pos[i + 2]! - anfang[i + 2]!);
    if (w > weg) {
      weg = w;
      wo = ort(anfang[i]!, anfang[i + 1]!, anfang[i + 2]!);
    }
  }
  const ohneErste = dauer.length > 2 ? dauer.slice(1) : dauer;
  return { anlegen, runden: dauer.length, msRunde: ohneErste.reduce((s, v) => s + v, 0) / ohneErste.length, weg, wo, steht };
}

const punkte = (h: Haut): [number, number, number][] => Array.from({ length: h.n }, (_, v) => [h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!]);
const dreiecke = (h: Haut): number[][] => Array.from({ length: h.tri.length / 3 }, (_, t) => [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!]);
/** Mittel, 95 %, größter Abstand; dazu die Orte der größten (je einer, mindestens 30 Einheiten auseinander) und wie viele Punkte über 2 liegen */
function masse(d: Float64Array, wo: readonly [number, number, number][]): string {
  const s = Array.from(d).sort((a, b) => a - b);
  const nach = Array.from(d.keys()).sort((a, b) => d[b]! - d[a]!);
  const orte: number[] = [];
  for (const i of nach) {
    if (orte.length >= 4 || d[i]! < 2) break;
    if (orte.every((j) => Math.hypot(wo[i]![0] - wo[j]![0], wo[i]![1] - wo[j]![1], wo[i]![2] - wo[j]![2]) > 30)) orte.push(i);
  }
  const ueber = s.filter((x) => x > 2).length;
  return `Mittel ${z3(s.reduce((a, b) => a + b, 0) / s.length)}, 95 % ${z3(s[Math.floor(0.95 * (s.length - 1))]!)}, größter ${z3(s[s.length - 1]!)}${ueber ? `; ${ueber} Punkte über 2, bei ${orte.map((i) => `${ort(...wo[i]!)} ${z3(d[i]!)}`).join(' · ')}` : ''}`;
}
const kettenPunkte = (loops: readonly Loop[]): number => loops.reduce((s, l) => s + l.proben.length, 0);

console.log(`${datei.split('/').pop()}: ${alt.n} Punkte, ${loopsAlt.length} Loops (${kettenPunkte(loopsAlt)} Punkte auf Linien), Startkante ${z3(st.mk)}, mittlere Kante ${z3(mittlereKante(alt))}`);

// 1 auf dem alten Netz
const gesichert = punkte(alt);
const a = setzen(alt, loopsAlt);
console.log(`1  altes Netz: Löser anlegen ${a.anlegen.toFixed(0)} ms, ${a.runden} Runden bis zur Ruhe${a.steht ? '' : ' (steht noch nicht)'}, ${a.msRunde.toFixed(1)} ms je Runde, dabei bis ${z3(a.weg)} gegangen (bei ${a.wo})`);

// 2 vergröbern (vom gesicherten Stand aus, wie beim Laden; `VON=ruhe`: von der Ruhe des alten Netzes aus)
const MK = FAKTOR * st.mk;
const genau = GENAU_MIT ? MK / 40 : st.mk / 40;
let h: Haut = { ...alt, pos: process.env.VON === 'ruhe' ? Float64Array.from(alt.pos) : Float64Array.from(gesichert.flat()) };
let loops: Loop[] = loopsAlt;
const t0 = performance.now();
const gaenge: string[] = [];
for (let g = 0; g < 12; g++) {
  const v = verdichten(h, loops, 1.75 * MK, { kurz: KURZ * MK, genau, flachSchutz: true });
  if (!v) break;
  h = v.haut;
  loops = v.loops;
  gaenge.push(`${h.n} (−${v.gelegt} +${v.neu})`);
  if (v.gelegt === 0 && v.neu === 0) break;
}
console.log(`2  vergröbert auf Startkante ${z3(MK)} (× ${z3(FAKTOR)}), Linien auf ${z3(genau)} genau: ${(performance.now() - t0).toFixed(0)} ms, Punkte je Gang ${gaenge.join(' → ')}`);
console.log(`   ${alt.n} → ${h.n} Punkte (${((100 * h.n) / alt.n).toFixed(0)} %), auf Linien ${kettenPunkte(loopsAlt)} → ${kettenPunkte(loops)}, mittlere Kante ${z3(mittlereKante(h))} (${z3(mittlereKante(h) / MK)} der neuen Startkante)`);
console.log(`   neue Punkte gegen die gesicherte Fläche, vor dem Rechnen: ${masse(flaechenAbstand(punkte(h), gesichert, dreiecke(alt), 2 * st.mk), punkte(h))}`);

// 3 auf dem neuen Netz
const n = setzen(h, loops);
console.log(`3  neues Netz: Löser anlegen ${n.anlegen.toFixed(0)} ms, ${n.runden} Runden bis zur Ruhe${n.steht ? '' : ' (steht noch nicht)'}, ${n.msRunde.toFixed(1)} ms je Runde (alt ${a.msRunde.toFixed(1)}), dabei bis ${z3(n.weg)} gegangen (bei ${n.wo})`);

// 4 Abstand der Häute
console.log(`4  gegen die gesicherte Form: neue Punkte ${masse(flaechenAbstand(punkte(h), gesichert, dreiecke(alt), 2 * st.mk), punkte(h))}`);
console.log(`   gesicherte Punkte gegen die neue Fläche: ${masse(flaechenAbstand(gesichert, punkte(h), dreiecke(h), 2 * MK), gesichert)}`);
console.log('   gegen die Ruhe des alten Netzes:');
console.log(`   neue Punkte gegen die alte Fläche: ${masse(flaechenAbstand(punkte(h), punkte(alt), dreiecke(alt), 2 * st.mk), punkte(h))}`);
console.log(`   alte Punkte gegen die neue Fläche (darin die Sehne der größeren Dreiecke): ${masse(flaechenAbstand(punkte(alt), punkte(h), dreiecke(h), 2 * MK), punkte(alt))}`);
