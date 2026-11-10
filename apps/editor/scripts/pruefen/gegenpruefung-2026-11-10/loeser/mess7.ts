// Gegenprüfung, Schritt G3 (10.11.2026): Kommt der Löser nach einem Zug zur Ruhe, wenn man ihn weiterrechnen lässt?
// Nach dem Zug (SCHRITTE Mausschritte mit JE Runden; FALL=ruhe: gar kein Zug, die Kugel mit drei Loops) laufen NACH Runden mit festen
// Zielen. Je Abschnitt (Runden a → b): wie weit sich die Haut netto bewegt hat (größter Punkt, quadratisches Mittel), wo, in welche
// Richtung (Anteil längs der Flächennormalen: + nach außen), dazu Rauminhalt und Oberfläche. Eine Haut, die zur Ruhe kommt, bewegt sich
// je Abschnitt immer weniger; eine, die wandert, je Runde gleich viel.
// FALL=ruhe|hals|ohr|ruessel  GEWICHTE=gleich|geometrie  DREIECKE=6000  SCHRITTE=30  JE=3  NACH=400
import { LoopZug } from '../../../../../../packages/shape/src/dicht/loops';
import { dreiLoops, punktAbstand, zugFuer } from './gemeinsam';

const fall = process.env.FALL ?? 'ohr';
const gewichte = (process.env.GEWICHTE ?? 'geometrie') as 'gleich' | 'geometrie';
const dreiecke = Number(process.env.DREIECKE ?? 6000);
const SCHRITTE = Number(process.env.SCHRITTE ?? 30);
const JE = Number(process.env.JE ?? 3);
const NACH = Number(process.env.NACH ?? 400);

const st = dreiLoops(dreiecke);
const zug = fall === 'ruhe' ? () => st.loops.map(() => null) : zugFuer(st, fall);
const z = new LoopZug(st.h, st.loops, null, true, 'kurven', gewichte, {});
const h = st.h;

const inhalt = (): { v: number; a: number } => {
  const P = h.pos;
  const T = h.tri;
  let v = 0;
  let a = 0;
  for (let t = 0; t < T.length; t += 3) {
    const i = 3 * T[t]!;
    const j = 3 * T[t + 1]!;
    const k = 3 * T[t + 2]!;
    const ax = P[i]!;
    const ay = P[i + 1]!;
    const az = P[i + 2]!;
    const bx = P[j]! - ax;
    const by = P[j + 1]! - ay;
    const bz = P[j + 2]! - az;
    const cx = P[k]! - ax;
    const cy = P[k + 1]! - ay;
    const cz = P[k + 2]! - az;
    const nx = by * cz - bz * cy;
    const ny = bz * cx - bx * cz;
    const nz = bx * cy - by * cx;
    a += 0.5 * Math.hypot(nx, ny, nz);
    v += (ax * nx + ay * ny + az * nz) / 6;
  }
  return { v, a };
};
/** Flächennormale je Punkt (flächengewichtet) */
const normalen = (): Float64Array => {
  const P = h.pos;
  const T = h.tri;
  const N = new Float64Array(P.length);
  for (let t = 0; t < T.length; t += 3) {
    const i = 3 * T[t]!;
    const j = 3 * T[t + 1]!;
    const k = 3 * T[t + 2]!;
    const bx = P[j]! - P[i]!;
    const by = P[j + 1]! - P[i + 1]!;
    const bz = P[j + 2]! - P[i + 2]!;
    const cx = P[k]! - P[i]!;
    const cy = P[k + 1]! - P[i + 1]!;
    const cz = P[k + 2]! - P[i + 2]!;
    const nx = by * cz - bz * cy;
    const ny = bz * cx - bx * cz;
    const nz = bx * cy - by * cx;
    for (const e of [i, j, k]) {
      N[e] = N[e]! + nx;
      N[e + 1] = N[e + 1]! + ny;
      N[e + 2] = N[e + 2]! + nz;
    }
  }
  for (let v = 0; v < N.length; v += 3) {
    const l = Math.hypot(N[v]!, N[v + 1]!, N[v + 2]!) || 1;
    N[v] = N[v]! / l;
    N[v + 1] = N[v + 1]! / l;
    N[v + 2] = N[v + 2]! / l;
  }
  return N;
};
/** Abstand jedes Punkts zur nächsten Linie (Proben aller Loops, beide Spiegelhälften) */
const linienAbstand = (p: [number, number, number]): number => {
  let best = Infinity;
  for (const l of st.loops) {
    const R = l.ruhe;
    for (let j = 0; j < R.length; j += 3) {
      const d = Math.min(Math.hypot(p[0] - R[j]!, p[1] - R[j + 1]!, p[2] - R[j + 2]!), Math.hypot(p[0] - R[j]!, p[1] - R[j + 1]!, p[2] + R[j + 2]!));
      if (d < best) best = d;
    }
  }
  return best;
};

const i0 = inhalt();
console.log(`\n=== ${fall}, ${gewichte}, ${h.n} Punkte, ${SCHRITTE} Mausschritte mit je ${JE} Runden, dann ${NACH} Runden ===`);
console.log(`  Anfang: Rauminhalt ${i0.v.toFixed(0)}, Oberfläche ${i0.a.toFixed(0)}`);
let d: (Float64Array | null)[] = st.loops.map(() => null);
if (fall !== 'ruhe')
  for (let k = 1; k <= SCHRITTE; k++) {
    d = zug(k / SCHRITTE);
    z.schritt(d, JE);
  }
const iz = inhalt();
console.log(`  nach dem Zug: Rauminhalt ${iz.v.toFixed(0)}, Oberfläche ${iz.a.toFixed(0)}`);

const marken = [0, 10, 25, 50, 100, 200, 400, 800, 1600].filter((m) => m <= NACH);
let vor = Float64Array.from(h.pos);
let runde = 0;
for (let m = 1; m < marken.length; m++) {
  const t0 = performance.now();
  let wegSumme = 0;
  let wegMax = 0;
  let formSumme = 0;
  let formMax = 0;
  const einzeln: string[] = [];
  for (; runde < marken[m]!; runde++) {
    const a = Float64Array.from(h.pos);
    const Na = normalen();
    z.schritt(d, 1);
    const w = punktAbstand(a, h.pos).max;
    wegSumme += w;
    wegMax = Math.max(wegMax, w);
    // dieselbe Runde längs der Normalen (Form)
    let fo = 0;
    let foWo = 0;
    let fo2 = 0;
    let ueber = 0;
    for (let v = 0; v < h.n; v++) {
      const f = Math.abs((h.pos[3 * v]! - a[3 * v]!) * Na[3 * v]! + (h.pos[3 * v + 1]! - a[3 * v + 1]!) * Na[3 * v + 1]! + (h.pos[3 * v + 2]! - a[3 * v + 2]!) * Na[3 * v + 2]!);
      fo2 += f * f;
      if (f > 0.18) ueber++;
      if (f > fo) {
        fo = f;
        foWo = v;
      }
    }
    formSumme += fo;
    formMax = Math.max(formMax, fo);
    if (runde < 12) {
      const q: [number, number, number] = [h.pos[3 * foWo]!, h.pos[3 * foWo + 1]!, h.pos[3 * foWo + 2]!];
      einzeln.push(
        `    Runde ${runde + 1}: Bewegung ${w.toFixed(3)}, davon Form ${fo.toFixed(3)} (rms ${Math.sqrt(fo2 / h.n).toFixed(3)}, ${ueber} Punkte über 0,18) bei (${q.map((x) => x.toFixed(0)).join(', ')}), ${linienAbstand(q).toFixed(0)} von der nächsten Linie`,
      );
    }
  }
  if (einzeln.length) console.log(`  die ersten Runden einzeln:\n${einzeln.join('\n')}`);
  const ms = (performance.now() - t0) / (marken[m]! - marken[m - 1]!);
  const jetzt = Float64Array.from(h.pos);
  const N = normalen();
  let max = 0;
  let wo = 0;
  let s = 0;
  let aussen = 0;
  // größte Bewegung längs der Flächennormalen (das sieht man als Formänderung; längs der Fläche gleiten nur die Punkte)
  let normalMax = 0;
  let normalWo = 0;
  for (let v = 0; v < h.n; v++) {
    const dx = jetzt[3 * v]! - vor[3 * v]!;
    const dy = jetzt[3 * v + 1]! - vor[3 * v + 1]!;
    const dz = jetzt[3 * v + 2]! - vor[3 * v + 2]!;
    const l = Math.hypot(dx, dy, dz);
    s += l * l;
    const dnv = dx * N[3 * v]! + dy * N[3 * v + 1]! + dz * N[3 * v + 2]!;
    aussen += dnv;
    if (Math.abs(dnv) > Math.abs(normalMax)) {
      normalMax = dnv;
      normalWo = v;
    }
    if (l > max) {
      max = l;
      wo = v;
    }
  }
  const p: [number, number, number] = [jetzt[3 * wo]!, jetzt[3 * wo + 1]!, jetzt[3 * wo + 2]!];
  const dn = (jetzt[3 * wo]! - vor[3 * wo]!) * N[3 * wo]! + (jetzt[3 * wo + 1]! - vor[3 * wo + 1]!) * N[3 * wo + 1]! + (jetzt[3 * wo + 2]! - vor[3 * wo + 2]!) * N[3 * wo + 2]!;
  const i = inhalt();
  const n = marken[m]! - marken[m - 1]!;
  console.log(
    `  Runden ${marken[m - 1]} → ${marken[m]}: netto bis ${max.toFixed(3)} (${(max / n).toFixed(4)} je Runde; rms ${Math.sqrt(s / h.n).toFixed(3)}) bei (${p.map((x) => x.toFixed(0)).join(', ')}), ` +
      `${linienAbstand(p).toFixed(0)} von der nächsten Linie, davon längs der Normalen ${dn.toFixed(3)}; im Mittel nach außen ${(aussen / h.n).toFixed(4)} · ` +
      `FORM (längs der Normalen) bis ${normalMax.toFixed(3)} (${(Math.abs(normalMax) / n).toFixed(4)} je Runde) bei (${[0, 1, 2].map((c) => jetzt[3 * normalWo + c]!.toFixed(0)).join(', ')}) · ` +
      `je Runde größte Bewegung im Mittel ${(wegSumme / n).toFixed(4)} (höchstens ${wegMax.toFixed(4)}), davon Form im Mittel ${(formSumme / n).toFixed(4)} (höchstens ${formMax.toFixed(4)}) · Rauminhalt ${i.v.toFixed(0)} (${(100 * (i.v / iz.v - 1)).toFixed(2)} %), Oberfläche ${i.a.toFixed(0)} · ${ms.toFixed(1)} ms je Runde`,
  );
  vor = jetzt;
}
