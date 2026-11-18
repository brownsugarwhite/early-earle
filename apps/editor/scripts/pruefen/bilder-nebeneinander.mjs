// Bilder nebeneinander auf ein Blatt, jedes mit einer Überschrift (für Vergleiche vorher und nachher). Aufruf aus apps/editor:
//   node scripts/pruefen/bilder-nebeneinander.mjs <ziel.jpg> "<Überschrift>=<bild>" "<Überschrift>=<bild>" …
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const [ziel, ...paare] = process.argv.slice(2);
if (!ziel || paare.length === 0) throw new Error('Aufruf: <ziel.jpg> "<Überschrift>=<bild>" …');
const bilder = paare.map((p) => {
  const i = p.indexOf('=');
  const pfad = p.slice(i + 1);
  const art = extname(pfad).toLowerCase() === '.png' ? 'png' : 'jpeg';
  return { titel: p.slice(0, i), daten: `data:image/${art};base64,${readFileSync(pfad).toString('base64')}` };
});
const browser = await chromium.launch();
const mass = await browser.newPage();
const breiten = [];
for (const b of bilder) {
  breiten.push(
    await mass.evaluate(
      (d) =>
        new Promise((fertig) => {
          const img = new Image();
          img.onload = () => fertig(img.naturalWidth);
          img.src = d;
        }),
      b.daten,
    ),
  );
}
await mass.close();
const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#efe9dd;font:15px/1.3 -apple-system,'Helvetica Neue',sans-serif;color:#1f1a17}
  .reihe{display:flex;gap:6px;padding:6px}
  figure{margin:0}
  figcaption{padding:4px 2px 6px;font-weight:600}
  img{display:block;border:1px solid rgba(31,26,23,.3)}
</style><div class="reihe">${bilder.map((b) => `<figure><figcaption>${b.titel}</figcaption><img src="${b.daten}"></figure>`).join('')}</div>`;
const blatt = await browser.newPage({ viewport: { width: breiten.reduce((a, b) => a + b, 0) + 8 * bilder.length + 12, height: 400 }, deviceScaleFactor: 1 });
await blatt.setContent(html);
await blatt.waitForTimeout(300);
await blatt.screenshot({ path: ziel, type: 'jpeg', quality: 88, fullPage: true });
await browser.close();
console.log(ziel);
