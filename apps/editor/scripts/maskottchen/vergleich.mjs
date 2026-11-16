// Vergleicht ein SVG (oder eine Seite mit Canvas) mit dem Logo: rendert im Browser auf Logo-Größe, misst die Abweichung je
// Bildpunkt und schreibt ein Differenzbild (rot = nur im Logo dunkel, blau = nur im Nachbau dunkel).
//   node scripts/maskottchen/vergleich.mjs <svg-datei> [differenz.png]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { lesePng, schreibePng } from './png.mjs';

const svgDatei = process.argv[2];
const diffDatei = process.argv[3];
const logo = lesePng(path.resolve('../../docs/look/maskottchen/ozzy-logo.png'));
const { breite: W, hoehe: H } = logo;
const svg = fs.readFileSync(svgDatei, 'utf8');
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await seite.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
const bild = await seite.screenshot({ clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();
const tmp = path.join(path.dirname(diffDatei ?? svgDatei), '.vergleich-tmp.png');
fs.writeFileSync(tmp, bild);
const nach = lesePng(tmp);
fs.unlinkSync(tmp);
let summe = 0;
let falsch = 0;
let nurLogo = 0;
let nurNach = 0;
const diff = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const a = (logo.rgba[i * 4] + logo.rgba[i * 4 + 1] + logo.rgba[i * 4 + 2]) / 3;
  const b = (nach.rgba[i * 4] + nach.rgba[i * 4 + 1] + nach.rgba[i * 4 + 2]) / 3;
  const dd = Math.abs(a - b);
  summe += dd;
  if (dd > 96) {
    falsch++;
    if (a < b) nurLogo++;
    else nurNach++;
  }
  const g = 255 - Math.min(255, (255 - Math.min(a, b)) * 0.15);
  diff[i * 4] = dd > 96 && a < b ? 230 : g;
  diff[i * 4 + 1] = dd > 96 ? 40 : g;
  diff[i * 4 + 2] = dd > 96 && a > b ? 230 : g;
  diff[i * 4 + 3] = 255;
}
let dunkelLogo = 0;
for (let i = 0; i < W * H; i++) if (logo.rgba[i * 4] < 128) dunkelLogo++;
console.log(
  `mittlere Abweichung ${(summe / (W * H)).toFixed(3)} von 255; falsche Punkte ${falsch} (${((100 * falsch) / dunkelLogo).toFixed(3)} % der dunklen Fläche): nur im Logo ${nurLogo}, nur im Nachbau ${nurNach}`,
);
if (diffDatei) schreibePng(diffDatei, W, H, diff);
