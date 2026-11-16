// Ausschnitt eines PNG mit Raster (Abstand und Beschriftung wählbar), vergrößert, zum Ablesen von Koordinaten.
//   AUSSCHNITTE='[["name",x,y,w,h,zoom,raster]]' node scripts/maskottchen/ausschnitt.mjs <bild.png> <ordner>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const [bildDatei, ordner] = process.argv.slice(2);
const b64 = fs.readFileSync(bildDatei).toString('base64');
const ausschnitte = JSON.parse(process.env.AUSSCHNITTE ?? '[]');
const browser = await chromium.launch();
const seite = await browser.newPage();
fs.mkdirSync(ordner, { recursive: true });
for (const [name, x, y, w, h, zoom = 2, raster = 20] of ausschnitte) {
  const W = Math.round(w * zoom);
  const H = Math.round(h * zoom);
  await seite.setViewportSize({ width: W, height: H });
  let linien = '';
  for (let gx = Math.ceil(x / raster) * raster; gx <= x + w; gx += raster) {
    const stark = gx % (raster * 5) === 0;
    linien += `<line x1="${gx}" y1="${y}" x2="${gx}" y2="${y + h}" stroke="${stark ? '#06c' : '#0bf'}" stroke-width="${(stark ? 1.2 : 0.5) / zoom}" opacity="0.6"/>`;
  }
  for (let gy = Math.ceil(y / raster) * raster; gy <= y + h; gy += raster) {
    const stark = gy % (raster * 5) === 0;
    linien += `<line x1="${x}" y1="${gy}" x2="${x + w}" y2="${gy}" stroke="${stark ? '#06c' : '#0bf'}" stroke-width="${(stark ? 1.2 : 0.5) / zoom}" opacity="0.6"/>`;
  }
  let schrift = '';
  for (let gx = Math.ceil(x / (raster * 5)) * raster * 5; gx <= x + w; gx += raster * 5)
    for (let gy = Math.ceil(y / (raster * 5)) * raster * 5; gy <= y + h; gy += raster * 5)
      schrift += `<text x="${gx + 2 / zoom}" y="${gy + 11 / zoom}" font-size="${10 / zoom}" fill="#c06" font-family="monospace">${gx},${gy}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${W}" height="${H}"><image href="data:image/png;base64,${b64}" x="0" y="0" opacity="0.45"/>${linien}${schrift}</svg>`;
  await seite.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
  await seite.screenshot({ path: path.join(ordner, name + '.png'), clip: { x: 0, y: 0, width: W, height: H } });
}
await browser.close();
console.log('fertig', ausschnitte.length);
