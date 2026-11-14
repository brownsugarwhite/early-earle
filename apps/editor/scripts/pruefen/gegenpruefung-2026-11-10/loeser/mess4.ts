 
// Gegenprüfung „Löser-Mathematik“: Messung 4. Prüft die Abschätzung für die Schwingung des Felds zwischen den Linien beim Löser mit
// gleichen Gewichten: Eigenwert ≈ 1 − s / f mit
//   f = Anteil der Nachbarn eines Linienpunkts, die nicht auf der Linie liegen (so viel „sieht“ seine Zeile vom Feld),
//   s = Kantenquadrat im Feld / Kantenquadrat an den Linienpunkten (mit so viel wird die an der Linie gemessene Krümmung im Feld gestreckt).
// Gemessen wird der Eigenwert als (d_{k+1}·d_k)/(d_k·d_k) der Bewegungen aufeinander folgender Runden nach dem Zug.
// FALL, DREIECKE
import { gewichteAus, vermessen } from '../../../../../../packages/shape/src/dicht/kurven';
import { LoopZug, kantenGewichte } from '../../../../../../packages/shape/src/dicht/loops';
import { dreiLoops, f2 } from './gemeinsam';

const fall = process.env.FALL ?? 'ohr';
const dreiecke = Number(process.env.DREIECKE ?? 6000);
const st = dreiLoops(dreiecke);
const zugF = (await import('./gemeinsam')).zugFuer(st, fall);
const z = new LoopZug(st.h, st.loops, null, true, 'kurven', 'gleich', {});
let d: (Float64Array | null)[] = [];
for (let k = 1; k <= 30; k++) {
  d = zugF(k / 30);
  z.schritt(d, 1);
}
const h = st.h;
// Eigenwert aus den Runden 4…9 nach dem Zug
let vor = Float64Array.from(h.pos);
let dVor: Float64Array | null = null;
const lam: number[] = [];
let amp: Float64Array = new Float64Array(h.n);
for (let k = 1; k <= 9; k++) {
  z.schritt(d, 1);
  const dd = Float64Array.from(h.pos, (x, i) => x - vor[i]!);
  if (dVor && k >= 4) {
    let ab = 0;
    let aa = 0;
    for (let i = 0; i < dd.length; i++) {
      ab += dd[i]! * dVor[i]!;
      aa += dVor[i]! * dVor[i]!;
    }
    lam.push(ab / aa);
  }
  if (k === 9) amp = Float64Array.from({ length: h.n }, (_, v) => Math.hypot(dd[3 * v]!, dd[3 * v + 1]!, dd[3 * v + 2]!));
  dVor = dd;
  vor = Float64Array.from(h.pos);
}
// Linienpunkte, f und Kantenquadrate
const gew = gewichteAus(h, kantenGewichte(h, st.loops));
const m = vermessen(h, gew);
const linie = new Uint8Array(h.n);
for (const v of z.plan.bind.ecken) linie[v] = 1;
const fVon = (v: number) => {
  let s = 0;
  h.nachbarn[v]!.forEach((j, k) => {
    if (!linie[j]) s += gew[v]![k]!;
  });
  return s;
};
// heißes Feld: die 5 % der Punkte mit der größten Bewegung; sein Rand: die Linienpunkte, die man von dort erreicht, ohne eine Linie zu kreuzen
const ordnung = Array.from({ length: h.n }, (_, v) => v).sort((a, b) => amp[b]! - amp[a]!);
const heiss = ordnung.slice(0, Math.max(10, Math.floor(0.05 * h.n)));
const gesehen = new Uint8Array(h.n);
const schlange = [...heiss];
for (const v of heiss) gesehen[v] = 1;
const rand: number[] = [];
const feld: number[] = [];
for (let i = 0; i < schlange.length; i++) {
  const v = schlange[i]!;
  if (linie[v]) {
    rand.push(v);
    continue;
  }
  feld.push(v);
  for (const j of h.nachbarn[v]!)
    if (!gesehen[j]) {
      gesehen[j] = 1;
      schlange.push(j);
    }
}
const mittel = (l: number[], f: (v: number) => number) => l.reduce((s, v) => s + f(v), 0) / Math.max(1, l.length);
const alleLinie = Array.from({ length: h.n }, (_, v) => v).filter((v) => linie[v]);
const alleFeld = Array.from({ length: h.n }, (_, v) => v).filter((v) => !linie[v]);
const e2 = (v: number) => m.kante2[v]!;
const zeile = (name: string, L: number[], F: number[]) => {
  const f = mittel(L, fVon);
  const s = mittel(F, e2) / mittel(L, e2);
  return `${name}: f ${f2(f)}, Kantenquadrat Feld ${f2(mittel(F, e2))} / Linie ${f2(mittel(L, e2))} = s ${f2(s)} → Abschätzung 1 − s/f = ${f2(1 - s / f)}`;
};
console.log(`\n${fall}, ${h.n} Punkte, gleiche Gewichte: Eigenwert gemessen (Runden 4…9 nach dem Zug): ${lam.map((x) => x.toFixed(2)).join(', ')}`);
console.log(`  ${zeile('ganze Haut', alleLinie, alleFeld)}`);
console.log(`  ${zeile(`Feld der Schwingung (${feld.length} Punkte, Rand ${rand.length} Linienpunkte)`, rand, feld)}`);
console.log(`  ${zeile('nur die heißesten 5 %', rand, heiss.filter((v) => !linie[v]))}`);
