// Labor für „Eine Linie“ (20.11.2026): die Rechnung (`src/ozzy/shader/linieSim.ts`) ohne Fenster an einer erfundenen Form (Kugeln
// in einer Blase, von oben links beleuchtet), Bilder als PNG nach N Schritten, dazu Zeit je Schritt und Zahl der Punkte.
// Aufruf aus apps/editor: npx vite-node scripts/ozzy/linie-labor.ts <ordner> [schritte …]
//   DREH=1: die Form dreht sich langsam (Bewegung mitnehmen, Licht wandert)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { LinienSim } from '../../src/ozzy/shader/linieSim';

const ordner = process.argv[2] ?? '.';
const marken = (process.argv.slice(3).length ? process.argv.slice(3) : ['150', '400', '900']).map(Number);
fs.mkdirSync(ordner, { recursive: true });
const B = 1200, H = 800, S = 3;
const kb = B / S, kh = Math.round(H / S);

/** eine Form: Kugeln (Mitte, Radius in CSS-Bildpunkten), Höhe als glatte Vereinigung; Licht von oben links */
function karte(drehung: number): { hell: Float32Array; maske: Float32Array } {
  const kugeln = [
    [600, 400, 190],
    [480, 520, 120],
    [720, 560, 110],
    [610, 230, 95],
  ];
  const hell = new Float32Array(kb * kh), maske = new Float32Array(kb * kh);
  const L = [-0.55 * Math.cos(drehung) - 0.3 * Math.sin(drehung), 0.62, 0.55];
  const ll = Math.hypot(L[0]!, L[1]!, L[2]!);
  for (let j = 0; j < kh; j++)
    for (let i = 0; i < kb; i++) {
      const x = (i + 0.5) * S, y = (j + 0.5) * S;
      let h = 0, nx = 0, ny = 0;
      for (const [cx, cy, r] of kugeln) {
        const dx = (x - cx!) / r!, dy = (y - cy!) / r!;
        const q = 1 - dx * dx - dy * dy;
        if (q > 0) {
          const z = Math.sqrt(q);
          if (z > h) {
            h = z;
            nx = dx;
            ny = dy;
          }
        }
      }
      const k = j * kb + i;
      if (h <= 0) continue;
      maske[k] = 1;
      const nz = h;
      const ndl = (nx * L[0]! + ny * L[1]! + nz * L[2]!) / ll;
      let v = Math.min(1, Math.max(0, 0.5 + 0.62 * ndl));
      v *= 1 - 0.75 * Math.pow(1 - nz, 2.5);
      hell[k] = v;
    }
  return { hell, maske };
}

const sim = new LinienSim(40000);
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: B, height: H } });
let zeit = 0;
let summeMs = 0;
let schritte = 0;
const dreh = process.env.DREH === '1';
let k0 = karte(0);
sim.felderSetzen(k0.hell, k0.maske, kb, kh, S, 0);
for (let s = 1; s <= Math.max(...marken); s++) {
  zeit += 1 / 30;
  if (dreh && s % 3 === 0) {
    k0 = karte(zeit * 0.4);
    sim.felderSetzen(k0.hell, k0.maske, kb, kh, S, zeit);
  } else sim.zeit = zeit;
  const t = performance.now();
  sim.schritt();
  summeMs += performance.now() - t;
  schritte++;
  if (marken.includes(s)) {
    const pfad: string[] = [];
    for (let i = 0; i < sim.n; i++) pfad.push(`${sim.x[i]!.toFixed(2)},${(H - sim.y[i]!).toFixed(2)}`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}"><rect width="100%" height="100%" fill="#fbfaf6"/><polygon points="${pfad.join(' ')}" fill="none" stroke="#141214" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
    await seite.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await seite.screenshot({ path: path.join(ordner, `linie-${s}.png`) });
    console.log(`Schritt ${s}: ${sim.n} Punkte, ${(summeMs / schritte).toFixed(1)} ms je Schritt, Maßstab ${sim.massstab.toFixed(2)}`);
    summeMs = 0;
    schritte = 0;
  }
}
await browser.close();
