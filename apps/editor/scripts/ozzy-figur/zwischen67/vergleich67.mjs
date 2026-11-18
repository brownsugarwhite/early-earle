// Mein Bild bei 67° (Szene kopf) auf Florians Rahmen gelegt: Unterschied zu seiner Übermalung (blau: bei mir schwarz, bei ihm weiß; rot: umgekehrt)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const abb = JSON.parse(readFileSync(new URL('abbildung.json', import.meta.url), 'utf8'));
const flo = 'data:image/png;base64,' + readFileSync(new URL('../../../../../docs/look/ozzy-figur/vorlagen/ozzy_kopf67_florian.png', import.meta.url)).toString('base64');
const [aus = 'vergleich67.png', winkel = '67'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto('http://localhost:5213/ozzy-figur.html?modus=exakt');
await p.waitForFunction(() => window.__ozzyFigur);
const r = await p.evaluate(async ([flo, abb, w]) => {
  const H = window.__ozzyFigur;
  const a = H.zeigen('kopf', w / 90, true, 0, 2000, 2000);
  const lade = async (s) => { const im = new Image(); await new Promise((ok) => { im.onload = ok; im.src = s; }); return im; };
  const mein = await lade(H.bild()), fl = await lade(flo);
  const W = fl.width, Hh = fl.height; const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  g.drawImage(fl, 0, 0); const F = g.getImageData(0, 0, W, Hh).data;
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, Hh);
  // gleiche Abbildung wie beim Abgleich: seine Pixel = (Figur − x0) · S + t; mein Bild hat a.massstab und a.x0
  const k = abb.S / a.massstab; const dx = (a.x0 - abb.x0) * abb.S + abb.tx, dy = (a.y0 - abb.y0) * abb.S + abb.ty;
  g.setTransform(k, 0, 0, k, dx, dy); g.drawImage(mein, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
  const M = g.getImageData(0, 0, W, Hh).data; const o = g.createImageData(W, Hh); let anders = 0;
  for (let i = 0; i < W * Hh; i++) { const sf = F[i * 4] < 128, sm = M[i * 4] < 128; const v = sm ? 150 : 255; o.data[i * 4] = v; o.data[i * 4 + 1] = v; o.data[i * 4 + 2] = v; o.data[i * 4 + 3] = 255; if (sf !== sm) { anders++; o.data[i * 4] = sm ? 30 : 230; o.data[i * 4 + 1] = sm ? 60 : 30; o.data[i * 4 + 2] = sm ? 230 : 30; } }
  g.putImageData(o, 0, 0); return { anders, u: c.toDataURL('image/png') };
}, [flo, abb, Number(winkel)]);
writeFileSync(aus, Buffer.from(r.u.split(',')[1], 'base64'));
console.log('abweichende Bildpunkte', r.anders);
await b.close();
