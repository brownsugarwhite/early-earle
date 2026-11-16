// Ausschnitte des Logos mit Raster (alle 50 Punkte, beschriftet alle 100) und dem nachgezeichneten Umriss in Rot, zum Ablesen
// von Koordinaten.  node scripts/maskottchen/raster.mjs <ausgabe-ordner> [zusatz.svg-teile.json]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const ordner = process.argv[2];
const zusatz = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
// BILD: Hintergrund (Standard: das Logo), BILD_TRANSFORM: SVG-Transform dafür; SPUR: Umrisse in Logo-Koordinaten (rot),
// SPUR2: zweite Umrisse zum Vergleich (grün)
const logo = fs.readFileSync(path.resolve(process.env.BILD ?? '../../docs/look/maskottchen/ozzy-logo.png')).toString('base64');
const bildTransform = process.env.BILD_TRANSFORM ?? '';
const spur = JSON.parse(fs.readFileSync(path.resolve(process.env.SPUR ?? '../../docs/look/maskottchen/spur.json'), 'utf8'));
const spur2 = process.env.SPUR2 ? JSON.parse(fs.readFileSync(path.resolve(process.env.SPUR2), 'utf8')) : null;
const W = spur.breite;
const H = spur.hoehe;
const pfad = (s) =>
  s.stuecke.map((c, i) => (i === 0 ? `M${c[0][0]},${c[0][1]}` : '') + `C${c[1][0]},${c[1][1]} ${c[2][0]},${c[2][1]} ${c[3][0]},${c[3][1]}`).join('') + 'Z';
let gitter = '';
for (let x = 0; x <= W; x += 50)
  gitter += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${x % 100 ? '#0bf' : '#06c'}" stroke-width="${x % 100 ? 0.6 : 1.2}" opacity="0.55"/>`;
for (let y = 0; y <= H; y += 50)
  gitter += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${y % 100 ? '#0bf' : '#06c'}" stroke-width="${y % 100 ? 0.6 : 1.2}" opacity="0.55"/>`;
let schrift = '';
for (let x = 0; x <= W; x += 100) for (let y = 0; y <= H; y += 100) schrift += `<text x="${x + 3}" y="${y + 13}" font-size="12" fill="#c06" font-family="monospace">${x},${y}</text>`;
const extra = zusatz ? zusatz.map((z) => `<path d="${z.d}" fill="${z.fill ?? 'none'}" stroke="${z.stroke ?? '#0a0'}" stroke-width="${z.w ?? 2}" opacity="${z.o ?? 0.8}"/>`).join('') : '';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<image href="data:image/png;base64,${logo}" ${bildTransform ? `transform="${bildTransform}"` : `width="${W}" height="${H}"`} opacity="0.35"/>
${gitter}${spur2 ? `<path d="${spur2.umrisse.map(pfad).join('')}" fill="none" stroke="#2a2" stroke-width="1.5" opacity="0.7"/>` : ''}<path d="${spur.umrisse.map(pfad).join('')}" fill="none" stroke="#e00" stroke-width="1.2"/>${extra}${schrift}</svg>`;
const ausschnitte = JSON.parse(process.env.AUSSCHNITTE ?? '[]');
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await seite.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
fs.mkdirSync(ordner, { recursive: true });
for (const [name, x, y, w, h, zoom] of ausschnitte) {
  await seite.setViewportSize({ width: W, height: H });
  if (zoom && zoom !== 1) {
    await seite.evaluate((z) => {
      document.body.style.zoom = String(z);
    }, zoom);
  } else {
    await seite.evaluate(() => {
      document.body.style.zoom = '1';
    });
  }
  const z = zoom ?? 1;
  await seite.setViewportSize({ width: Math.ceil(W * z), height: Math.ceil(H * z) });
  await seite.screenshot({ path: path.join(ordner, name + '.png'), clip: { x: x * z, y: y * z, width: w * z, height: h * z } });
}
await browser.close();
console.log('fertig', ausschnitte.length);
