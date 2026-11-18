// Ansichten der Probe „Anfang einer Form“ (Runde 5): Raum, Seite, Front, Top (und, falls gebaut, die Viereransicht), je nach der
// Fahrt der Ansicht. Aufruf aus apps/editor, Server auf 5203: node scripts/anfang/ansichten.mjs <ziel.png> [fassung]
import { chromium } from '@playwright/test';
import { FISCH } from './fisch.mjs';

const ziel = process.argv[2];
const fassung = Number(process.argv[3] ?? 0);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1.5 });
await page.goto('http://localhost:5203/anfang.html?bild=1');
await page.waitForFunction(() => window.__anfang);
await page.evaluate(([f, fisch]) => {
  const a = window.__anfang;
  a.film(true);
  a.fassung(f);
  a.form(fisch);
  a.aufblasen();
  a.vorspulen(3200);
}, [fassung, FISCH]);
const bilder = [];
const schritte = [
  ['Raum', null],
  ['1 · Seite', 'seite'],
  ['3 · Front', 'front'],
  ['7 · Top', 'top'],
  ['halb zur Seite (0,3 s)', 'seite-halb'],
  ['4 · vier Ansichten', 'vier'],
];
for (const [titel, a] of schritte) {
  const da = await page.evaluate((a) => {
    const A = window.__anfang;
    if (a === 'seite-halb') {
      A.ansicht('raum');
      A.vorspulen(800);
      A.ansicht('seite');
      A.vorspulen(300);
      return true;
    }
    if (a === 'vier') {
      if (!A.vier) return false;
      A.ansicht('raum');
      A.vorspulen(800);
      A.vier(true);
      A.vorspulen(900);
      return true;
    }
    if (a) A.ansicht(a);
    A.vorspulen(800);
    return true;
  }, a);
  if (!da) continue;
  await page.waitForTimeout(60);
  bilder.push([titel, (await page.screenshot({ type: 'png' })).toString('base64')]);
}
const p = await browser.newPage({ viewport: { width: 2 * 610 + 40, height: 900 } });
await p.setContent(`<style>body{margin:0;padding:16px;font:14px -apple-system,sans-serif;color:#555;display:flex;flex-wrap:wrap;gap:10px}img{width:600px;border:1px solid #eee;display:block}</style>${bilder.map(([t, b]) => `<div><img src="data:image/png;base64,${b}"><div>${t}</div></div>`).join('')}`);
await p.waitForTimeout(150);
await p.screenshot({ path: ziel, fullPage: true });
await browser.close();
console.log('geschrieben:', ziel);
