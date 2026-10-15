// Teil A, Schritte A5/A6: Varianten der Lippenstellen und des Hautgitters über die ganze Einsatz-Reihe (54 Fälle), getrennt
// nach Feldgröße (m ≤ 10 / m > 10): Hautvierecke (kleinster Winkel ohne Mundwinkel, Fälle unter 20°, Streckung über 4) und
// die Anpassung der Lippe an die gezeichnete Linie (größter Fehler in einem Blatt, Fälle über 1 px und über 0,3 px).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/einsatz-vergleich.ts
import { abtasten3 } from '../../../../packages/shape/src/versuch/linie3d';
import { einsatzFaelle, einsatzFall, type EinsatzFall } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { einsatzTopologie, hautGuete, type EinsatzOptionen } from '../../../../packages/shape/src/kern/einsatz/topologie';
import { lippeAnpassen } from '../../../../packages/shape/src/kern/einsatz/lippe';

type V3 = [number, number, number];
const faelle = einsatzFaelle()
  .map(([a, b, c]) => einsatzFall(a, b, c))
  .filter((f): f is EinsatzFall => !!f && !('fehler' in f));
const varianten: [string, EinsatzOptionen][] = [];
for (const lippeKruemmung of [0, 0.3, 0.5, 0.7, 1]) varianten.push([`κ ${lippeKruemmung}`, { lippeKruemmung }]);
for (const [name, opt] of varianten) {
  const z = { klein: { w: 180, f20: 0, f4: 0, n: 0, lip: 0, l1: 0, l03: 0 }, gross: { w: 180, f20: 0, f4: 0, n: 0, lip: 0, l1: 0, l03: 0 } };
  for (const f of faelle) {
    const linie = abtasten3(f.maulLinie, 64) as V3[];
    const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { ...opt, linie });
    const g = hautGuete(t);
    const fit = lippeAnpassen(linie, t.m, t.lippenAnteile);
    const w = Math.max(fit.fehler.seite, fit.fehler.front, fit.fehler.top, fit.fehler.raum);
    const b = t.m <= 10 ? z.klein : z.gross;
    b.n++;
    b.w = Math.min(b.w, g.winkelMin);
    b.f20 += g.winkelMin < 20 ? 1 : 0;
    b.f4 += g.seitenMax > 4 ? 1 : 0;
    b.lip = Math.max(b.lip, w);
    b.l1 += w > 1 ? 1 : 0;
    b.l03 += w > 0.3 ? 1 : 0;
  }
  const t = (b: typeof z.klein) => `n ${b.n}: Haut min ${b.w.toFixed(0)}°, ${b.f20} < 20°, ${b.f4} > 4:1; Lippe max ${b.lip.toFixed(2)} px, ${b.l1} > 1 px, ${b.l03} > 0,3 px`;
  console.log(`${name.padEnd(8)} | klein ${t(z.klein)} | groß ${t(z.gross)}`);
}
