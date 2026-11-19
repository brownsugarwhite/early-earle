// Ozzy als Modell gegen Florians Zeichnungen (Kopf): je Ansicht 3D, Zeichnung, Unterschied mit Deckung.
//   node scripts/ozzy-figur/modell-vergleich.mjs <aus.png> [Adresszusatz, z. B. "?rand=8"]
// Erwartet den Vite-Server des Arbeitsbaums auf Port 5213 (Eintrag ozzy-figur).
import { chromium } from '@playwright/test';

const [aus, zusatz = ''] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
const p = await b.newPage({ viewport: { width: 1200, height: 1000 } });
const fehler = [];
p.on('pageerror', (e) => fehler.push(String(e)));
p.on('console', (m) => (m.type() === 'error' || m.text().startsWith('Ozzy')) && fehler.push(m.text()));
await p.goto('http://localhost:5213/ozzy-modell.html' + zusatz);
await p.waitForFunction(() => window.__ozzyModell, null, { timeout: 60000 });
await p.evaluate(() => window.__ozzyModell.bereit());
const bilder = [];
for (const [psi, a, s, titel] of [[0, 'front', false, 'Front'], [45, 'viertel', false, '3/4'], [90, 'profil', false, 'Seite'], [180, 'back', false, 'Rücken']]) {
  const r = await p.evaluate(([psi, a, s]) => window.__ozzyModell.vergleich(psi, a, 420, 420, s, true), [psi, a, s]);
  await p.evaluate((psi) => window.__ozzyModell.zeigen(psi, 420, 420, true), psi);
  const bild = await p.evaluate(() => window.__ozzyModell.bild());
  bilder.push([`${titel} 3D`, bild], [`${titel} Florian`, r.zeichnung], [`${(r.deckung * 100).toFixed(1)} % (rot nur 3D, blau nur Zeichnung)`, r.bild]);
  console.log(titel, (r.deckung * 100).toFixed(1), r.nur3D, r.nurVorlage);
}
const html = `<html><body style="margin:0;background:#fff;font:13px Helvetica"><div id="r" style="display:grid;grid-template-columns:repeat(3,300px);gap:6px;padding:6px">${bilder.map(([t, u]) => `<div><img src="${u}" width="300" style="border:1px solid #eee;display:block"><div style="color:#888;text-align:center">${t}</div></div>`).join('')}</div></body></html>`;
const q = await b.newPage({ viewport: { width: 1000, height: 1400 } });
await q.setContent(html);
await q.waitForTimeout(150);
await (await q.$('#r')).screenshot({ path: aus });
if (fehler.length) console.log('Meldungen', JSON.stringify(fehler.slice(0, 4)).slice(0, 1500));
await b.close();
