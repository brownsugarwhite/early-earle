// Bild zu Werkzeug P (Florian, 15.11.): dieselbe Stelle des Fischs dreimal, vergrößert: ohne P nur die Schwellung, mit P der Punkt
// auf der Linie, mit P der Tropfen am Zeiger. Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/stift-bild.mjs <ziel.png>
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const ziel = process.argv[2] ?? '../../docs/progress/linien/stift.png';
const URL = process.env.URL ?? 'http://localhost:5199';
const Z = 4;
// Stelle auf der Rückenlinie, weit weg von Punkten (Punkte des Entwurfs), und der Zeiger je Bild relativ dazu
const STELLE = [425.6, 82.4];
const BILDER = [
  { titel: 'ohne P: nur die Verdickung', stift: false, zeiger: [0.4, 0.5] },
  { titel: 'mit P: der Punkt, der gesetzt wird', stift: true, zeiger: [0.4, 0.5] },
  { titel: 'mit P: Tropfen am Zeiger', stift: true, zeiger: [3.2, 4.4] },
];
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 });
await page.goto(`${URL}/linien.html?bild=1`);
await page.waitForFunction(() => window.__linien);
const teile = [];
for (const b of BILDER) {
  await page.evaluate(
    ({ b, STELLE, Z }) => {
      const L = window.__linien;
      L.ansicht.wachsen = true;
      L.ansicht.z = Z;
      L.ansicht.ox = 500 - STELLE[0] * Z;
      L.ansicht.oy = 320 - STELLE[1] * Z;
      L.verhalten.stift = b.stift;
      L.verhalten.tropfen = [];
      L.verhalten.setzeAnsicht(L.ansicht);
      // anfliegen, damit Schwellung und Tropfen in Ruhe sind
      const ziel = [STELLE[0] + b.zeiger[0], STELLE[1] + b.zeiger[1]];
      for (let i = 0; i <= 20; i++) {
        const f = i / 20;
        const x = ziel[0] + 18 * (1 - f);
        const y = ziel[1] + 12 * (1 - f);
        L.zeigerHin(x * Z + L.ansicht.ox, y * Z + L.ansicht.oy, 16);
        L.vorspulen(16);
      }
      L.vorspulen(1200);
    },
    { b, STELLE, Z },
  );
  const png = await page.screenshot({ clip: { x: 380, y: 230, width: 240, height: 180 } });
  teile.push({ titel: b.titel, bild: png.toString('base64') });
}
// zusammensetzen
const html = `<html><body style="margin:0;background:#fff;font:15px -apple-system,Helvetica,sans-serif;color:#1f1a17">
<div style="display:flex;gap:18px;padding:18px">${teile
  .map((t) => `<figure style="margin:0"><img src="data:image/png;base64,${t.bild}" style="width:360px;height:270px;border:1px solid #e4e0da;display:block"><figcaption style="margin-top:8px">${t.titel}</figcaption></figure>`)
  .join('')}</div></body></html>`;
const seite = await browser.newPage({ viewport: { width: 1172, height: 340 }, deviceScaleFactor: 2 });
await seite.setContent(html);
fs.writeFileSync(ziel, await seite.screenshot({ fullPage: true }));
console.log('geschrieben', ziel);
await browser.close();
