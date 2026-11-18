 
// Gegenprüfung „Löser-Mathematik“: Messung 2, Pfadabhängigkeit (unveränderter Löser). Dieselben Endziele auf verschiedenen Wegen,
// danach je NACH Runden mit festen Zielen. Sind die Endformen verschieden und bewegt sich je Runde fast nichts mehr, hat das Verfahren
// keinen eindeutigen Fixpunkt (die Form hängt am Weg).
//  Weg a: 30 Mausschritte × 1 Runde (wie das Fenster)      Weg b: 1 Schritt (Ziel auf einmal)
//  Weg c: 120 Mausschritte × 2 Runden (langsam, gründlich)  Weg d: 30 Schritte bis 150 %, 30 Schritte zurück auf 100 %
// FALL=hals|ohr|ruessel  GEWICHTE=gleich|geometrie  NACH=300
import { LoopZug } from '../../../../../../packages/shape/src/dicht/loops';
import { type Schnapp, dreiLoops, f2, f3, flaechenAbstand, punktAbstand, schnapp, zugFuer } from './gemeinsam';

const fall = process.env.FALL ?? 'hals';
const gewichte = (process.env.GEWICHTE ?? 'gleich') as 'gleich' | 'geometrie';
const NACH = Number(process.env.NACH ?? 300);

type Weg = { name: string; anteile: number[]; je: number };
const linear = (n: number, bis = 1) => Array.from({ length: n }, (_, k) => (bis * (k + 1)) / n);
const wege: Weg[] = [
  { name: 'a 30×1', anteile: linear(30), je: 1 },
  { name: 'b 1×1', anteile: [1], je: 1 },
  { name: 'c 120×2', anteile: linear(120), je: 2 },
  { name: 'd 150 % und zurück', anteile: [...linear(30, 1.5), ...Array.from({ length: 30 }, (_, k) => 1.5 - (0.5 * (k + 1)) / 30)], je: 1 },
];

const ergebnisse: { name: string; ende: Schnapp; nachZug: Schnapp; letzte: number; letzte10: number }[] = [];
for (const w of wege) {
  const st = dreiLoops(6000);
  const zug = zugFuer(st, fall);
  const z = new LoopZug(st.h, st.loops, null, true, 'kurven', gewichte, {});
  let d: (Float64Array | null)[] = [];
  for (const a of w.anteile) {
    d = zug(a);
    z.schritt(d, w.je);
  }
  d = zug(1);
  const nachZug = schnapp(st.h);
  let vor10 = Float64Array.from(st.h.pos);
  let letzte = 0;
  let letzte10 = 0;
  for (let k = 1; k <= NACH; k++) {
    const vor = Float64Array.from(st.h.pos);
    if (k === NACH - 9) vor10 = vor;
    z.schritt(d, 1);
    if (k === NACH) letzte = punktAbstand(vor, st.h.pos).max;
  }
  letzte10 = punktAbstand(vor10, st.h.pos).max;
  const ende = schnapp(st.h);
  const nh = flaechenAbstand(nachZug, ende);
  console.log(
    `  Weg ${w.name}: nach dem Zug → nach ${NACH} Runden: Fläche bis ${f2(nh.max)} (99 % ${f2(nh.p99)}); letzte Runde bewegt ${letzte.toFixed(4)}, letzte 10 Runden zusammen ${letzte10.toFixed(4)}`,
  );
  ergebnisse.push({ name: w.name, ende, nachZug, letzte, letzte10 });
}
console.log(`\n=== ${fall}, ${gewichte}: Endformen gegeneinander (Fläche: größter / 99 % / Mittel; Punkt für Punkt: größter) ===`);
for (let i = 0; i < ergebnisse.length; i++)
  for (let j = i + 1; j < ergebnisse.length; j++) {
    const A = ergebnisse[i]!;
    const B = ergebnisse[j]!;
    const fl = flaechenAbstand(A.ende, B.ende);
    const pk = punktAbstand(A.ende.P, B.ende.P);
    console.log(`  ${A.name} ↔ ${B.name}: Fläche ${f3(fl.max)} / ${f3(fl.p99)} / ${f3(fl.mittel)}; Punkte ${f3(pk.max)}`);
  }
