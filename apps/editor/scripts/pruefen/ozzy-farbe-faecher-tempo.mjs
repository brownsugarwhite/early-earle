// Ozzy, Paint-Modus, Etappe 6 (19.11.2026; Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 18): das Tempo der
// Ebenen-Ansicht an Florians Form „strange bird“ mit drei Ebenen (der Verlauf, die Punkte, ein oranger Fleck), bei 2880 × 1800
// Gerätepunkten (gemalt wird im kleinen Fenster der Filme, gemessen im großen).
//   87  Auf Wachs kosten drei Kopien je Bild höchstens 3 ms mehr als die Form allein (samt Grafikkarte, die Farblinien werden bedient).
// Dazu, ohne Kriterium: dasselbe auf dem hellen Solid (ein Bild seines Renderers, während gedreht wird; in Ruhe zeichnet er nicht neu).
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/pruefen/ozzy-farbe-faecher-tempo.mjs
import { ebeneDrei, ebeneEins, ebeneZwei, oeffnen } from '../ozzy/paint-ebenen-szene.mjs';
import { mitKarte } from './ozzy-teile.mjs';

const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');
const t = await oeffnen({ fuellen: '0', dichte: 2 });
const { s, O } = t;
await ebeneEins(t);
await ebeneZwei(t);
await ebeneDrei(t);
await s.setViewportSize({ width: 1440, height: 900 });
await s.waitForTimeout(1500);
const steht = async (ziel) => {
  await s.waitForFunction((z) => Math.abs(window.__ozzy.faecher().f - z) < 1e-6, ziel, { timeout: 8000 });
  await s.waitForTimeout(900);
};
/** ein Bild des hellen Solids, während gedreht wird (Verzerren und Zeichnen, bis die Grafikkarte fertig ist; Median, ms) */
const gastBild = () =>
  s.evaluate(() => {
    const o = window.__ozzy;
    o.gast(true);
    o.film(true);
    const b = o.blickSetzen({});
    const z = [];
    for (let i = 0; i < 30; i++) {
      o.blickSetzen({ gier: b.gier + 0.002 * (i + 1) });
      o.bild(1 / 60);
      const m = o.gast();
      z.push(m.verzerren + m.zeichnen);
    }
    o.blickSetzen({ gier: b.gier });
    o.bild(1 / 60);
    o.film(false);
    o.gast(false);
    return z.sort((p, q) => p - q)[15];
  });
const gross = await s.evaluate(() => `${document.getElementById('haut').width} × ${document.getElementById('haut').height}`);
// Wachs
const zu = await mitKarte(s, 60);
// (zum Vergleich: die Form allein, ohne die Ebenen zu sammeln, und ohne Paint-Modus)
await O('farbSammeln', false);
const ohneSammeln = await mitKarte(s, 60);
await O('farbSammeln', true);
await s.keyboard.press('b');
await s.waitForTimeout(600);
const ohneMalen = await mitKarte(s, 60);
await s.keyboard.press('b');
await s.waitForTimeout(600);
await s.keyboard.press('x');
await steht(1);
const kopien = (await O('faecher')).kopien.length;
const auf = await mitKarte(s, 60);
await s.keyboard.press('x');
await steht(0);
const mehr = auf.gesamt - zu.gesamt;
const gut = kopien === 3 && mehr <= 3;
console.log(`${gut ? 'gut ' : 'FEHL'} 87 Wachs: drei Kopien kosten je Bild höchstens 3 ms mehr als die Form allein: ${gross} Gerätepunkte; zusammen ${z2(zu.gesamt)} ms (davon Rechnen ${z2(zu.rechnen)}), aufgefächert mit ${kopien} Kopien ${z2(auf.gesamt)} ms (Rechnen ${z2(auf.rechnen)}): ${mehr >= 0 ? '+' : '−'}${z2(Math.abs(mehr))} ms`);
console.log(`     zum Vergleich, die Form allein: ohne die Ebenen zu sammeln ${z2(ohneSammeln.gesamt)} ms, außerhalb des Paint-Modus ${z2(ohneMalen.gesamt)} ms`);
// helles Solid
await O('material', 'Helles Solid');
await s.waitForTimeout(1200);
const hellZu = await gastBild();
await s.keyboard.press('x');
await steht(1);
const hellAuf = await gastBild();
console.log(`     helles Solid (kein Kriterium): ein Bild seines Renderers beim Drehen zusammen ${z2(hellZu)} ms, aufgefächert mit ${(await O('faecher')).kopien.length} Kopien ${z2(hellAuf)} ms`);
console.log(`     Fehler in der Konsole: ${t.fehler.length}${t.fehler.length ? ` (${t.fehler[0]})` : ''}`);
await t.browser.close();
console.log(gut && !t.fehler.length ? 'alles gut' : 'FEHL');
process.exit(gut && !t.fehler.length ? 0 : 1);
