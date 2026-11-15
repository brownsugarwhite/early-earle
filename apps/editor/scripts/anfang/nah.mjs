// Nahbilder des Abrisses (Probe „Anfang einer Form“, Runde 2): dieselbe Form, Momente um das Hängen und den Abriss, groß.
// Aufruf aus apps/editor, Server auf 5203: node scripts/anfang/nah.mjs <ziel.png> [fassung] [momente, kommagetrennt]
import { chromium } from '@playwright/test';
import { FISCH } from './fisch.mjs';

const ziel = process.argv[2];
const fassung = Number(process.argv[3] ?? 0);
const MOMENTE = (process.argv[4] ?? '0.45,0.65,0.8,0.86,0.9,0.95,1.02,1.15,1.35,1.7').split(',').map(Number);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5203/anfang.html?bild=1');
await page.waitForFunction(() => window.__anfang);
await page.evaluate(([f, fisch]) => {
  window.__anfang.fassung(f);
  window.__anfang.form(fisch);
}, [fassung, FISCH]);
const bilder = [];
for (const T of MOMENTE) {
  await page.evaluate((T) => {
    window.__anfang.zeit(T);
    window.__anfang.bild();
  }, T);
  await page.waitForTimeout(50);
  const clip = process.env.CLIP === 'ganz' ? { x: 0, y: 0, width: 1200, height: 800 } : { x: 260, y: 170, width: 680, height: 460 };
  bilder.push((await page.screenshot({ clip, scale: process.env.CLIP === 'ganz' ? 'css' : 'device' })).toString('base64'));
}
const p = await browser.newPage({ viewport: { width: process.env.CLIP === 'ganz' ? 2 * 910 + 40 : 5 * 470 + 40, height: 900 } });
await p.setContent(`<style>body{margin:0;padding:16px;font:14px -apple-system,sans-serif;color:#555;display:flex;flex-wrap:wrap;gap:10px}img{width:${process.env.CLIP === 'ganz' ? 900 : 460}px;border:1px solid #eee;display:block}</style>${bilder.map((b, i) => `<div><img src="data:image/png;base64,${b}"><div>${MOMENTE[i].toFixed(2).replace('.', ',')} s</div></div>`).join('')}`);
await p.waitForTimeout(150);
await p.screenshot({ path: ziel, fullPage: true });
await browser.close();
console.log('geschrieben:', ziel);
