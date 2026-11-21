// Ozzy, Shader (21.11.2026): Kennzahlen eines Materialbilds gegen eine Vorlage (Florian: „kannst du versuchen dieses material
// wirklich genauso hinzubekommen?“). Gezählt wird nur, was grün ist (Grün deutlich über Rot und Blau; für andere Farben anpassen).
// Aufruf aus apps/editor:
//   node scripts/ozzy/kugel-messen.mjs <vorlage.png|webp> <bild.png> [<bild2.png> …]
// Ausgabe je Bild: Mittel der Farbe (sRGB 0 … 255), Helligkeit (10 / 50 / 90 % der Bildpunkte), Rot zu Grün, Verhältnis senkrechter
// zu waagerechten Kanten (Tropfen gegen Lagen), Kanten je Bildpunkt (wie hart oder weich), Streuung der senkrechten Kanten über ein
// Raster von 6 × 6 Feldern (wie gleichmäßig die Tropfen verteilt sind; kleiner ist gleichmäßiger).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const dateien = process.argv.slice(2);
if (dateien.length < 1) {
  console.log('Aufruf: node scripts/ozzy/kugel-messen.mjs <vorlage> <bild> [<bild> …]');
  process.exit(1);
}
const browser = await chromium.launch();
const s = await browser.newPage();
try {
  for (const d of dateien) {
    const typ = path.extname(d).toLowerCase() === '.webp' ? 'image/webp' : 'image/png';
    const url = `data:${typ};base64,${fs.readFileSync(d).toString('base64')}`;
    const m = await s.evaluate(async (u) => {
      const G = 600;
      const img = new Image();
      img.src = u;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = G;
      cv.height = G;
      const cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0, G, G);
      const px = cx.getImageData(0, 0, G, G).data;
      const n = G * G;
      const L = new Float32Array(n);
      const M = new Uint8Array(n);
      let sr = 0, sg = 0, sb = 0, z = 0, gelb = 0;
      const lum = [];
      for (let i = 0; i < n; i++) {
        const r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255;
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        L[i] = l;
        if (g - Math.max(r, b) > 0.12) {
          M[i] = 1;
          sr += r; sg += g; sb += b; z++;
          lum.push(l);
          gelb += r / Math.max(g, 1e-3);
        }
      }
      lum.sort((a, b) => a - b);
      const p = (q) => lum[Math.floor(q * (lum.length - 1))].toFixed(2);
      let H = 0, V = 0;
      const F = 6;
      const vz = new Float64Array(F * F), az = new Float64Array(F * F);
      const innen = (x, y) => {
        for (let dy = -4; dy <= 4; dy += 4) for (let dx = -4; dx <= 4; dx += 4) if (!M[(y + dy) * G + x + dx]) return false;
        return true;
      };
      const a = (x, y) => L[y * G + x];
      for (let y = 5; y < G - 5; y++)
        for (let x = 5; x < G - 5; x++) {
          if (!innen(x, y)) continue;
          const gx = a(x + 1, y - 1) + 2 * a(x + 1, y) + a(x + 1, y + 1) - a(x - 1, y - 1) - 2 * a(x - 1, y) - a(x - 1, y + 1);
          const gy = a(x - 1, y + 1) + 2 * a(x, y + 1) + a(x + 1, y + 1) - a(x - 1, y - 1) - 2 * a(x, y - 1) - a(x + 1, y - 1);
          const ex = Math.abs(gx), ey = Math.abs(gy);
          if (ex > 2 * ey) V += ex;
          else if (ey > 2 * ex) H += ey;
          const c = Math.min(F - 1, Math.floor((y / G) * F)) * F + Math.min(F - 1, Math.floor((x / G) * F));
          if (ex > 2 * ey) vz[c] += ex;
          az[c] += 1;
        }
      const w = [];
      for (let c = 0; c < F * F; c++) if (az[c] > 400) w.push(vz[c] / az[c]);
      const mw = w.reduce((t, v) => t + v, 0) / w.length;
      const sd = Math.sqrt(w.reduce((t, v) => t + (v - mw) ** 2, 0) / w.length);
      return {
        farbe: [sr / z, sg / z, sb / z].map((v) => Math.round(v * 255)).join(','),
        hell: `${p(0.1)} / ${p(0.5)} / ${p(0.9)}`,
        rotZuGruen: (gelb / z).toFixed(2),
        senkrechtZuWaagerecht: (V / H).toFixed(2),
        kanten: ((V + H) / z).toFixed(3),
        streuung: (sd / mw).toFixed(2),
      };
    }, url);
    console.log(`${path.basename(d).padEnd(28)} ${JSON.stringify(m)}`);
  }
} finally {
  await browser.close();
}
