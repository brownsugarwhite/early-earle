// Gegenprüfung, Schritt G3 (10.11.2026): Steht die Haut wirklich, wenn der Löser zur Ruhe gekommen ist, oder hält ihn nur seine Bremse?
// Ablauf: Zug (SCHRITTE Mausschritte mit JE Runden), dann RUHE Runden mit demselben Löser (Stand S1). Danach wie im Fenster beim
// Setzen und bei jedem neuen Greifen: Linien festlegen, ein NEUER Löser auf derselben Haut (seine Bremse je Punkt beginnt von vorn),
// NEU Runden mit festen Zielen (Stand S2); dasselbe noch einmal (S3). Gemessen wird die Form (Bewegung längs der Flächennormalen):
//   S1 → S2 groß, S2 → S3 klein: Der erste Löser stand nicht, seine Bremse hielt ihn fest.
//   S1 → S2 groß, S2 → S3 auch groß: Jeder neue Löser landet woanders (sein Anlauf bleibt als Rest stehen).
//   beide klein: Die Haut stand.
// FALL=ohr|hals|ruessel|ruhe  GEWICHTE=geometrie  DREIECKE=6000  SCHRITTE=30  JE=3  RUHE=100  NEU=30
import { LoopZug, festlegen } from '../../../../../../packages/shape/src/dicht/loops';
import { hautNormalen } from '../../../../../../packages/shape/src/dicht/kurven';
import { dreiLoops, zugFuer } from './gemeinsam';

const fall = process.env.FALL ?? 'ohr';
const gewichte = (process.env.GEWICHTE ?? 'geometrie') as 'gleich' | 'geometrie';
const dreiecke = Number(process.env.DREIECKE ?? 6000);
const SCHRITTE = Number(process.env.SCHRITTE ?? 30);
const JE = Number(process.env.JE ?? 3);
const RUHE = Number(process.env.RUHE ?? 100);
const NEU = Number(process.env.NEU ?? 30);

const st = dreiLoops(dreiecke);
const h = st.h;
const zug = fall === 'ruhe' ? () => st.loops.map(() => null) : zugFuer(st, fall);
let z = new LoopZug(h, st.loops, null, true, 'kurven', gewichte, {});
console.log(`\n=== ${fall}, ${gewichte}, ${h.n} Punkte: ${SCHRITTE} Mausschritte mit je ${JE} Runden, ${RUHE} Runden Ruhe, dann zweimal ein neuer Löser mit ${NEU} Runden ===`);

/** Form zwischen zwei Ständen: größte Bewegung längs der Normalen, quadratisches Mittel, Zahl der Punkte über 0,18 (½ px bei 300 %) und über 1 */
const form = (a: Float64Array, b: Float64Array, N: Float64Array) => {
  let max = 0;
  let s = 0;
  let halb = 0;
  let eins = 0;
  let wo = 0;
  for (let v = 0; v < h.n; v++) {
    const d = Math.abs((b[3 * v]! - a[3 * v]!) * N[3 * v]! + (b[3 * v + 1]! - a[3 * v + 1]!) * N[3 * v + 1]! + (b[3 * v + 2]! - a[3 * v + 2]!) * N[3 * v + 2]!);
    s += d * d;
    if (d > 0.18) halb++;
    if (d > 1) eins++;
    if (d > max) {
      max = d;
      wo = v;
    }
  }
  return `${max.toFixed(2)} (rms ${Math.sqrt(s / h.n).toFixed(3)}, ${halb} Punkte über 0,18, ${eins} über 1) bei (${[0, 1, 2].map((c) => b[3 * wo + c]!.toFixed(0)).join(', ')})`;
};
/** n Runden; je Runde die Form-Bewegung, dazu der Stand der Bremse */
const runden = (d: (Float64Array | null)[], n: number, zeigen = 0): string => {
  const je: string[] = [];
  for (let k = 0; k < n; k++) {
    const a = Float64Array.from(h.pos);
    const N = hautNormalen(h);
    z.schritt(d, 1);
    if (k < zeigen) je.push(form(a, h.pos, N).split(' ')[0]!);
  }
  return je.join(' ');
};
const bremse = (): string => {
  const b = (z.loeser as unknown as { beta: Float64Array | null }).beta;
  if (!b) return 'keine Bremse';
  const w = Array.from(b).sort((x, y) => x - y);
  const q = (p: number) => w[Math.floor(p * (w.length - 1))]!;
  return `Bremse je Punkt: kleinste ${q(0).toFixed(3)}, Viertel ${q(0.25).toFixed(3)}, Mitte ${q(0.5).toFixed(3)}, drei Viertel ${q(0.75).toFixed(3)}, größte ${q(1).toFixed(3)}; am Boden (0,02) ${w.filter((x) => x <= 0.0201).length} von ${w.length}`;
};

let d: (Float64Array | null)[] = st.loops.map(() => null);
if (fall !== 'ruhe')
  for (let k = 1; k <= SCHRITTE; k++) {
    d = zug(k / SCHRITTE);
    z.schritt(d, JE);
  }
const S0 = Float64Array.from(h.pos);
runden(d, RUHE);
const S1 = Float64Array.from(h.pos);
console.log(`  ${RUHE} Runden Ruhe mit dem Löser des Zugs: Form ${form(S0, S1, hautNormalen(h))}`);
console.log(`    ${bremse()}`);
{
  const a = Float64Array.from(h.pos);
  const N = hautNormalen(h);
  runden(d, 20);
  console.log(`  weitere 20 Runden mit demselben Löser: Form ${form(a, h.pos, N)}`);
}
let vor = Float64Array.from(h.pos);
for (let neu = 1; neu <= 3; neu++) {
  for (const l of st.loops) festlegen(h, l, true);
  z = new LoopZug(h, st.loops, null, true, 'kurven', gewichte, {});
  d = st.loops.map(() => null);
  const N = hautNormalen(h);
  const je = runden(d, NEU, 8);
  console.log(`  neuer Löser ${neu}, ${NEU} Runden: Form gegen vorher ${form(vor, h.pos, N)}`);
  console.log(`    die ersten Runden: ${je}`);
  console.log(`    ${bremse()}`);
  vor = Float64Array.from(h.pos);
}
