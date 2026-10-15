// Teil A, Schritt A5: Varianten des Hautgitters über die ganze Einsatz-Reihe (54 Fälle), getrennt nach Feldgröße (m ≤ 10 /
// m > 10): kleinster Winkel (ohne Mundwinkel), Fälle und Vierecke unter 20°, größtes Seitenverhältnis, Fälle über 4:1.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/einsatz-vergleich.ts
import { einsatzFaelle, einsatzFall, type EinsatzFall } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { einsatzTopologie, hautGuete, type EinsatzOptionen } from '../../../../packages/shape/src/kern/einsatz/topologie';

const faelle = einsatzFaelle()
  .map(([a, b, c]) => einsatzFall(a, b, c))
  .filter((f): f is EinsatzFall => !!f && !('fehler' in f));
const varianten: [string, EinsatzOptionen][] = [];
for (const lippeBogen of [0, 0.3]) for (const glaettung of ['konform', 'laenge'] as const) for (const winkelReihen of [0, 1, 2]) varianten.push([`β ${lippeBogen} ${glaettung} w${winkelReihen}`, { lippeBogen, glaettung, winkelReihen }]);
for (const [name, opt] of varianten) {
  const z = { klein: { w: 180, s: 0, f20: 0, f4: 0, n: 0, q20: 0 }, gross: { w: 180, s: 0, f20: 0, f4: 0, n: 0, q20: 0 } };
  for (const f of faelle) {
    const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, opt);
    const g = hautGuete(t);
    const b = t.m <= 10 ? z.klein : z.gross;
    b.n++;
    b.w = Math.min(b.w, g.winkelMin);
    b.s = Math.max(b.s, g.seitenMax);
    b.f20 += g.winkelMin < 20 ? 1 : 0;
    b.f4 += g.seitenMax > 4 ? 1 : 0;
    b.q20 += g.unter20;
  }
  const t = (b: typeof z.klein) => `n ${b.n}: min ${b.w.toFixed(0)}°, ${b.f20} Fälle < 20° (${b.q20} Vierecke), max ${b.s.toFixed(1)}:1, ${b.f4} Fälle > 4:1`;
  console.log(`${name.padEnd(18)} | klein ${t(z.klein)} | groß ${t(z.gross)}`);
}
