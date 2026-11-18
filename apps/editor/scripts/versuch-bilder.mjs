// Vergleichsbilder der Versuche (Subdivision mit verjüngten Kanten gegen den Platzhalter-Loft).
//   node scripts/versuch-bilder.mjs [url]   (Web-Modus muss laufen)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const aus = path.resolve(hier, '../../../docs/progress/editor');
const url = process.argv[2] ?? 'http://localhost:5180';
const faelle = [
  ['', 'Platzhalter-Loft (heute)'],
  ['glatt', 'Subdivision, angepasst'],
  ['ring', 'Querkante: oben scharf → Flanken rund'],
  ['laengs', 'Rückenkante: Mitte scharf → Enden rund'],
  ['beide', 'beide Kanten'],
];
const formen = ['kugel', 'ei'];
const kaesten = [
  ['kasten-rund', 'Kasten: alle Kanten rund (Schärfe 0)'],
  ['kasten-scharf', 'Kasten: alle Kanten scharf'],
  ['kasten-verjuengt', 'Kasten: vorn oben scharf → hinten/unten rund'],
];

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
const bilder = [];
for (const form of formen) {
  for (const [fall, titel] of faelle) {
    await page.goto(fall ? `${url}/?versuch=subd&fall=${fall}&form=${form}` : `${url}/?versuch=loft&form=${form}`);
    await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 30_000 });
    await page.click('[data-maximieren="creation"]');
    await page.waitForFunction(() => !window.__stores.rahmen.getState().bewegt);
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
    const bild = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    bilder.push({ form, titel, b64: bild.toString('base64') });
  }
}
for (const [fall, titel] of kaesten) {
  await page.goto(`${url}/?versuch=subd&fall=${fall}`);
  await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 30_000 });
  await page.click('[data-maximieren="creation"]');
  await page.waitForFunction(() => !window.__stores.rahmen.getState().bewegt);
  // näher heran und etwas von oben, damit die Kanten zu sehen sind
  await page.evaluate(() => {
    const ui = window.__stores.ui.getState();
    ui.setzeKamera({ ...ui.kamera, distanz: 1.55, elevation: 0.42, azimut: -0.95, ziel: [0, 0.17, 0] });
  });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const bild = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  bilder.push({ form: 'kasten', titel, b64: bild.toString('base64') });
}
const montage = await browser.newPage({ viewport: { width: 800, height: 600 } });
const png = await montage.evaluate(async ({ bilder, spalten }) => {
  const lade = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  const imgs = await Promise.all(bilder.map((b) => lade(`data:image/png;base64,${b.b64}`)));
  const w = 520, h = 520, kopf = 34;
  const zeilen = Math.ceil(imgs.length / spalten);
  const c = document.createElement('canvas');
  c.width = spalten * w; c.height = zeilen * (h + kopf);
  const g = c.getContext('2d');
  g.fillStyle = '#19232b'; g.fillRect(0, 0, c.width, c.height);
  imgs.forEach((im, i) => {
    const x = (i % spalten) * w, y = Math.floor(i / spalten) * (h + kopf);
    const s = Math.min(w / im.width, h / im.height);
    const sw = im.width * s, sh = im.height * s;
    g.drawImage(im, x + (w - sw) / 2, y + kopf + (h - sh) / 2, sw, sh);
    g.fillStyle = '#fff'; g.font = '18px sans-serif';
    g.fillText(`${bilder[i].form}: ${bilder[i].titel}`, x + 10, y + 23);
  });
  return c.toDataURL('image/png');
}, { bilder, spalten: faelle.length });
fs.writeFileSync(path.join(aus, 'versuch-subdivision.png'), Buffer.from(png.split(',')[1], 'base64'));
console.log('geschrieben: docs/progress/editor/versuch-subdivision.png');
await browser.close();
