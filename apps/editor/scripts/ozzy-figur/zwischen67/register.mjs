// Florians Übermalung (67°, Szene „kopf“) auf meine Darstellung legen: Maßstab und Versatz per Überdeckung der schwarzen Flächen
// in Bereichen, die er nicht übermalt hat (linke Kopfhälfte, Ohren, Körper links). Ausgabe: Abbildung Figur → seine Pixel.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const flo = 'data:image/png;base64,' + readFileSync(new URL('../../../../../docs/look/ozzy-figur/vorlagen/ozzy_kopf67_florian.png', import.meta.url)).toString('base64');
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto('http://localhost:5213/ozzy-figur.html?modus=exakt');
await p.waitForFunction(() => window.__ozzyFigur);
const r = await p.evaluate(async ([flo]) => {
  const H = window.__ozzyFigur;
  // meine Darstellung groß: 2000 × 2000
  const a = H.zeigen('kopf', 67 / 90, true, 0, 2000, 2000);
  const meinUrl = H.bild();
  const lade = async (s) => { const im = new Image(); await new Promise((ok) => { im.onload = ok; im.src = s; }); return im; };
  const mein = await lade(meinUrl), fl = await lade(flo);
  const W = fl.width, Hh = fl.height;
  const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(fl, 0, 0); const F = g.getImageData(0, 0, W, Hh).data;
  const schwarzF = new Uint8Array(W * Hh); for (let i = 0; i < W * Hh; i++) schwarzF[i] = F[i * 4] < 128 ? 1 : 0;
  // Kandidat: seine Pixel = (Figur - (x0,y0)) * S + (tx, ty)  → mein Bild mit S/a.massstab skaliert und verschoben zeichnen
  const bewerte = (S, tx, ty, maske) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, Hh);
    const k = S / a.massstab; g.setTransform(k, 0, 0, k, tx, ty); g.drawImage(mein, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
    const M = g.getImageData(0, 0, W, Hh).data; let gleich = 0, n = 0;
    for (let y = 0; y < Hh; y += 3) for (let x = 0; x < W; x += 3) { if (!maske(x, y)) continue; const i = y * W + x; n++; if ((M[i * 4] < 128 ? 1 : 0) === schwarzF[i]) gleich++; }
    return gleich / n;
  };
  const links = (x, y) => x < 900 && y < 1150; // nicht übermalt: linke Seite, Ohren, Stirn
  let best = { q: -1 };
  for (let S = 3.7; S <= 4.5; S += 0.02) {
    // Startversatz grob über die Ohrspitze: seine (835, 37) ↔ meine Figur-Koordinate der rechten Ohrspitze (aus meinem Bild unbekannt) → Gitter
    for (let tx = -900; tx <= 0; tx += 20) for (let ty = -400; ty <= 100; ty += 20) {
      const q = bewerte(S, tx, ty, links); if (q > best.q) best = { q, S, tx, ty };
    }
  }
  // verfeinern
  let fein = best;
  for (let S = best.S - 0.03; S <= best.S + 0.03; S += 0.005) for (let tx = best.tx - 24; tx <= best.tx + 24; tx += 2) for (let ty = best.ty - 24; ty <= best.ty + 24; ty += 2) {
    const q = bewerte(S, tx, ty, links); if (q > fein.q) fein = { q, S, tx, ty };
  }
  // Überlagerung: seine Übermalung grau, meine Kanten rot
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, Hh);
  const k = fein.S / a.massstab; g.setTransform(k, 0, 0, k, fein.tx, fein.ty); g.drawImage(mein, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
  const M = g.getImageData(0, 0, W, Hh); const o = g.createImageData(W, Hh);
  for (let i = 0; i < W * Hh; i++) { const sf = schwarzF[i], sm = M.data[i * 4] < 128 ? 1 : 0; const v = sf ? 160 : 255; o.data[i * 4] = v; o.data[i * 4 + 1] = v; o.data[i * 4 + 2] = v; o.data[i * 4 + 3] = 255; if (sf !== sm) { o.data[i * 4] = sm ? 30 : 230; o.data[i * 4 + 1] = sm ? 60 : 30; o.data[i * 4 + 2] = sm ? 230 : 30; } }
  g.putImageData(o, 0, 0);
  return { ansicht: a, fein, ueberlagerung: c.toDataURL('image/png') };
}, [flo]);
writeFileSync(new URL('ueberlagerung.png', import.meta.url), Buffer.from(r.ueberlagerung.split(',')[1], 'base64'));
// Abbildung Figur → seine Pixel: u = (X - x0) * S + tx, v = (Y - y0) * S + ty  (Y nach unten wie im Bild)
const abb = { S: r.fein.S, tx: r.fein.tx, ty: r.fein.ty, x0: r.ansicht.x0, y0: r.ansicht.y0, massstab: r.ansicht.massstab, guete: r.fein.q };
writeFileSync(new URL('abbildung.json', import.meta.url), JSON.stringify(abb, null, 1));
console.log(JSON.stringify(abb));
await b.close();
