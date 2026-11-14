// Form zuerst (09.11.2026), Beweis „Linien mit Richtung“: Wie genau misst das Maß des Lösers mit gleichen Gewichten (Normalanteil des
// Laplace durch das Kantenquadrat) die Krümmung einer Kugel? Einmal mit den Normalen des Lösers (aus den Dreiecken gemittelt), einmal mit
// den genauen Normalen der Kugel, einmal mit der Normale aus einer Höhenanpassung (Paraboloid mit Neigung über die Nachbarn). Kugel
// R 150 mit einem Ring, ×300 (Soll 1); ohne die Punkte des Rings und ihre Nachbarn.
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-normalen-mass.ts
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { gewichteAus, hautAus, hautNormalen } from '../../../../packages/shape/src/dicht/kurven';
import { griffeAnlegen, loopAusSchnitt } from '../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';

const netz = rundAusSeite(
  [
    { x: 150, y: 0 },
    { x: 0, y: 150 },
    { x: -150, y: 0 },
    { x: 0, y: -150 },
  ],
  { dreiecke: 6000 },
);
let h = hautAus(netz.positionen, netz.indizes);
const ring = loopAusSchnitt(h, 'seite', [-200, 0], [200, 0], 1, 8)!;
const r = loopEinsetzen(h, [ring], 0)!;
h = r.haut;
griffeAnlegen(r.loops[0]!);
const P = h.pos;
const gew = gewichteAus(h, null);
const nDreieck = hautNormalen(h);
const nKugel = new Float64Array(3 * h.n);
for (let v = 0; v < h.n; v++) {
  const l = Math.hypot(P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!);
  for (let c = 0; c < 3; c++) nKugel[3 * v + c] = P[3 * v + c]! / l;
}
// Abstand zur Kugel (Lagefehler des Netzes)
let lmax = 0;
for (let v = 0; v < h.n; v++) lmax = Math.max(lmax, Math.abs(Math.hypot(P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!) - 150));
// Ring und Nachbarn auslassen
const aus = new Uint8Array(h.n);
for (let v = 0; v < h.n; v++)
  if (Math.abs(P[3 * v + 1]!) < 0.5) {
    aus[v] = 1;
    for (const j of h.nachbarn[v]!) aus[j] = 1;
  }
const mass = (nor: Float64Array) => {
  const werte: number[] = [];
  for (let i = 0; i < h.n; i++) {
    if (aus[i]) continue;
    const g = gew[i]!;
    let lx = P[3 * i]!;
    let ly = P[3 * i + 1]!;
    let lz = P[3 * i + 2]!;
    let e2 = 0;
    h.nachbarn[i]!.forEach((j, k) => {
      lx -= g[k]! * P[3 * j]!;
      ly -= g[k]! * P[3 * j + 1]!;
      lz -= g[k]! * P[3 * j + 2]!;
      e2 += g[k]! * ((P[3 * j]! - P[3 * i]!) ** 2 + (P[3 * j + 1]! - P[3 * i + 1]!) ** 2 + (P[3 * j + 2]! - P[3 * i + 2]!) ** 2);
    });
    werte.push(((lx * nor[3 * i]! + ly * nor[3 * i + 1]! + lz * nor[3 * i + 2]!) / e2) * 300);
  }
  werte.sort((a, b) => a - b);
  const m = werte.reduce((a, b) => a + b, 0) / werte.length;
  return `Mittel ${m.toFixed(3)}, 5 % ${werte[Math.floor(0.05 * werte.length)]!.toFixed(3)}, 95 % ${werte[Math.floor(0.95 * werte.length)]!.toFixed(3)}`;
};
// Normalen nach Max (1999): je Dreieck (a × b) / (|a|² |b|²) mit den Kanten a, b ab dem Punkt; auf einer Kugel genau
const nMax = new Float64Array(3 * h.n);
for (let t = 0; t < h.tri.length; t += 3)
  for (let e = 0; e < 3; e++) {
    const i = h.tri[t + e]!;
    const j = h.tri[t + ((e + 1) % 3)]!;
    const k = h.tri[t + ((e + 2) % 3)]!;
    const ax = P[3 * j]! - P[3 * i]!;
    const ay = P[3 * j + 1]! - P[3 * i + 1]!;
    const az = P[3 * j + 2]! - P[3 * i + 2]!;
    const bx = P[3 * k]! - P[3 * i]!;
    const by = P[3 * k + 1]! - P[3 * i + 1]!;
    const bz = P[3 * k + 2]! - P[3 * i + 2]!;
    const q = (ax * ax + ay * ay + az * az) * (bx * bx + by * by + bz * bz);
    if (!(q > 0)) continue;
    nMax[3 * i] = nMax[3 * i]! + (ay * bz - az * by) / q;
    nMax[3 * i + 1] = nMax[3 * i + 1]! + (az * bx - ax * bz) / q;
    nMax[3 * i + 2] = nMax[3 * i + 2]! + (ax * by - ay * bx) / q;
  }
for (let v = 0; v < h.n; v++) {
  const l = Math.hypot(nMax[3 * v]!, nMax[3 * v + 1]!, nMax[3 * v + 2]!) || 1;
  for (let c = 0; c < 3; c++) nMax[3 * v + c] = nMax[3 * v + c]! / l;
}
console.log(`${h.n} Punkte, Lage höchstens ${lmax.toFixed(3)} neben der Kugel`);
console.log(`Normalen aus den Dreiecken: ${mass(nDreieck)}`);
console.log(`genaue Normalen der Kugel: ${mass(nKugel)}`);
console.log(`Normalen nach Max: ${mass(nMax)}`);
