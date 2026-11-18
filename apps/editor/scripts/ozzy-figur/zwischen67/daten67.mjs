// Daten für den 67°-Schlüssel: meine Kopfteile bei 67° (Körper- und Kopfkoordinaten), Florians Kontur der fernen Bartkante
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const abb = JSON.parse(readFileSync(new URL('abbildung.json', import.meta.url), 'utf8'));
const flo = 'data:image/png;base64,' + readFileSync(new URL('../../../../../docs/look/ozzy-figur/vorlagen/ozzy_kopf67_florian.png', import.meta.url)).toString('base64');
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5213/ozzy-figur.html?modus=exakt');
await p.waitForFunction(() => window.__ozzyFigur);
const teile = await p.evaluate(() => window.__ozzyFigur.rasterTeile('kopf', 67 / 90));
// seine Maske: je Zeile alle Übergänge (x-Positionen mit Richtung), Bereich rechts
const zeilen = await p.evaluate(async ([flo]) => {
  const im = new Image(); await new Promise((ok) => { im.onload = ok; im.src = flo; });
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, im.width, im.height).data; const W = im.width;
  const out = [];
  for (let y = 380; y < 1200; y++) { const u = []; let vor = d[(y * W + 1000) * 4] < 128; for (let x = 1001; x < 1330; x++) { const s = d[(y * W + x) * 4] < 128; if (s !== vor) { u.push([x - 0.5, s ? 'ws' : 'sw']); vor = s; } } out.push([y, u]); }
  return out;
}, [flo]);
writeFileSync(new URL('daten67.json', import.meta.url), JSON.stringify({ abb, teile, zeilen }));
console.log('Teile', teile.length, 'Zeilen', zeilen.length);
await b.close();
