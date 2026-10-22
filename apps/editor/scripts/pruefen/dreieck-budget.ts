// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/dreieck-budget.ts
// Umgebung: KOERPER (Liste der Extremreihe, Röhre), TEILE (Liste, Körperart „Teile“), FAELLE (Maulfälle körper/anfang/form)
// Dreiecksbudget fürs Spiel (Plan „Wesen-Editor 2“: Brett = Stufe 1, höchstens 8 000 Dreiecke je Wesen): Käfiggröße wie im
// Editor (Startkugel → Körper) und Dreiecke je Catmull-Clark-Stufe; dazu der Maul-Einsatz nach dem Standard (Feld auf K2, Teil A),
// der den ganzen Käfig zweimal verfeinert. Stufe 0 = Käfigflächen trianguliert, Stufe 1 = Summe der Eckenzahlen als Vierecke,
// danach je Stufe × 4. „Teile“: Flächen ≈ Punkte (geschlossenes Vierecksnetz), also geschätzt.
import { einsatzAblauf, einsatzFall } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { editorBauen, editorPlan, imAblauf } from '../../../../packages/shape/src/kern/pruefen/extremMessung';
import { EXTREMREIHE } from '../../../../packages/shape/src/kern/pruefen/extremreihe';

type K = { n: number; nF: number; fVerts: Uint32Array };
const dreiecke = (k: K, L: number) => (L === 0 ? 2 * k.nF : 2 * k.fVerts.length * 4 ** (L - 1));
const BUDGET = 8000;
const marke = (d: number) => (d <= BUDGET ? '' : ' (über Budget)');

console.log('Röhre (Editor-Ablauf) | Käfigpunkte | Flächen | Dreiecke Stufe 0 / 1 / 2 / 3');
for (const name of (process.env.KOERPER ?? 'kugel,rex,langhals,robbe,tigerkopf').split(',')) {
  const k = EXTREMREIHE.find((e) => e.name === name);
  if (!k) continue;
  const kk = editorBauen(imAblauf(k.dok(), 'roehre', 'kugel'), editorPlan('roehre')).stand.abl?.kaefig as K | undefined;
  if (!kk) continue;
  console.log(`${name.padEnd(11)} | ${kk.n} | ${kk.nF} | ${[0, 1, 2, 3].map((L) => dreiecke(kk, L)).join(' / ')}${marke(dreiecke(kk, 1))}`);
}

console.log('\nTeile (Editor-Ablauf) | Käfigpunkte | ≈ Dreiecke Stufe 1 / 2 / 3');
for (const name of (process.env.TEILE ?? 'ente,vierbeiner,fisch,zweihals,krabbe').split(',')) {
  const k = EXTREMREIHE.find((e) => e.name === name);
  if (!k) continue;
  const bau = editorBauen(imAblauf(k.dok(), 'teile', 'kugel'), editorPlan('teile'));
  const n = (bau.stand as unknown as { baum?: { netz?: { kaefigPunkte?: number } } }).baum?.netz?.kaefigPunkte;
  if (!n) continue;
  console.log(`${name.padEnd(11)} | ${n} | ${8 * n} / ${32 * n} / ${128 * n}${marke(8 * n)}`);
}

console.log('\nMaul-Einsatz (Standard, Feld auf K2) | A0 | K2 | mit Maul | Dreiecke mit Maul Stufe 0 / 1 / 2');
for (const fall of (process.env.FAELLE ?? 'kugel/mittel/gerade,rex/mittel/j').split(',')) {
  const [a, b, c] = fall.split('/') as [never, never, never];
  const f = einsatzFall(a, b, c);
  if (!f || 'fehler' in f) continue;
  const k0 = f.abl.kaefig as K;
  const k2 = f.v.kaefig as K;
  const km = einsatzAblauf(f).t.kaefig as K;
  console.log(`${fall.padEnd(20)} | ${k0.n} P / ${k0.nF} F | ${k2.n} P / ${k2.nF} F | ${km.n} P / ${km.nF} F | ${[0, 1, 2].map((L) => dreiecke(km, L)).join(' / ')}${marke(dreiecke(km, 0))}`);
}
