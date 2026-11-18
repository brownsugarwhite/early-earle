// Gegenprüfung, Schritt G4 (10.11.2026): Was kostet ein neuer Löser mitten im Zug? Im Fenster entsteht er bei jedem Neuaufsetzen und
// bei jedem Einwechseln (mit der fertigen Zerlegung als Vorlage). Gemessen: das Anlegen (ohne Zerlegen) und die ersten Runden des
// neuen Lösers gegen die Runden des alten (Zeit und Schritte des Verteilens der Krümmung), mitten im Ohr-Zug.
// DREIECKE=6000  HALB=15 (Mausschritte bis zum Wechsel)  JE=1
import { LoopZug, festlegen } from '../../../../../../packages/shape/src/dicht/loops';
import { dreiLoops, zugFuer } from './gemeinsam';

const dreiecke = Number(process.env.DREIECKE ?? 6000);
const HALB = Number(process.env.HALB ?? 15);
const JE = Number(process.env.JE ?? 1);
const st = dreiLoops(dreiecke);
const h = st.h;
const zug = zugFuer(st, 'ohr');
const t0 = performance.now();
const z = new LoopZug(h, st.loops, null, true, 'kurven', 'geometrie', {});
const tAnlegen = performance.now() - t0;
const zeiten = (x: LoopZug) => (x.loeser as unknown as { zeiten: Record<string, number> }).zeiten;
const runde = (x: LoopZug, d: (Float64Array | null)[]): string => {
  const s0 = zeiten(x).schritte!;
  const t = performance.now();
  x.schritt(d, 1);
  return `${(performance.now() - t).toFixed(1)} ms/${zeiten(x).schritte! - s0}`;
};
let d: (Float64Array | null)[] = [];
const alt: string[] = [];
for (let k = 1; k <= HALB; k++) {
  d = zug(k / 30);
  for (let j = 0; j < JE; j++) {
    const r = runde(z, d);
    if (k > HALB - 4) alt.push(r);
  }
}
console.log(`\n=== ${h.n} Punkte: Anlegen mit Zerlegen ${tAnlegen.toFixed(0)} ms; die letzten Runden des alten Lösers (Zeit/Schritte beim Verteilen): ${alt.join(' ')} ===`);
// wie beim Neuaufsetzen: Linien festlegen, neuer Löser auf demselben Netz mit der Zerlegung des alten
const vorlage = z.vorlage!;
for (const l of st.loops) festlegen(h, l, true);
const t1 = performance.now();
const z2 = new LoopZug(h, st.loops, null, true, 'kurven', 'geometrie', { vorlage });
const tNeu = performance.now() - t1;
const null4 = st.loops.map(() => null);
const neu: string[] = [];
for (let k = 0; k < 6; k++) neu.push(runde(z2, null4));
console.log(`  neuer Löser mit Vorlage: Anlegen ${tNeu.toFixed(1)} ms; seine ersten Runden: ${neu.join(' ')}`);
