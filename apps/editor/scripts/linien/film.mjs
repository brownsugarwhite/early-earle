// Film der Probe „Linien, Punkte, Zeiger“: ein festgelegter Ablauf, Bild für Bild gerechnet (60 Bilder je Sekunde, unabhängig vom
// Takt des Browsers), dann mit ffmpeg zu MP4. Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/linien/film.mp4';
const URL = process.env.URL ?? 'http://localhost:5199';
const FPS = 60;
const B = 1000;
const H = 640;
const Z = 3.2;
const MITTE = [432, 196];
// Ablauf: Zeit (s), Lage (Punkte des Entwurfs), Ereignis
const BAHN = [
  [0.0, [505, 150]],
  [1.3, [441, 181]],
  [2.2, [438, 193]],
  [2.8, [436.5, 201]],
  [3.4, [437.5, 202.5], 'druecken'],
  [4.6, [452, 214]],
  [4.7, [452, 214], 'loslassen'],
  [5.3, [452.5, 214.5]],
  [5.75, [404, 214]],
  [6.6, [393, 199]],
  [7.2, [382, 187.5]],
  [7.8, [382.5, 188]],
  [8.6, [469, 214]],
  [9.0, [469.5, 214.5], 'druecken'],
  [10.0, [471, 199]],
  [10.1, [471, 199], 'loslassen'],
  [10.6, [471.5, 199.5]],
  [11.6, [515, 150]],
  [12.4, [515, 150]],
];
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lage = (t) => {
  for (let i = 0; i + 1 < BAHN.length; i++) {
    const [t0, p0] = BAHN[i];
    const [t1, p1] = BAHN[i + 1];
    if (t <= t1) {
      const f = ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
      return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
    }
  }
  return BAHN[BAHN.length - 1][1];
};

const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'linien-film-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 2 });
await page.goto(`${URL}/linien.html?bild=1`);
await page.waitForFunction(() => window.__linien !== undefined);
await page.evaluate(
  ({ Z, MITTE, B, H }) => {
    const L = window.__linien;
    L.ansicht.z = Z;
    L.ansicht.ox = B / 2 - MITTE[0] * Z;
    L.ansicht.oy = H / 2 - MITTE[1] * Z;
    L.vorspulen(50);
  },
  { Z, MITTE, B, H },
);
const ende = BAHN[BAHN.length - 1][0];
const ereignisse = BAHN.filter((b) => b[2]).map((b) => ({ t: b[0], art: b[2], fertig: false }));
let n = 0;
for (let t = 0; t <= ende; t += 1 / FPS) {
  const [x, y] = lage(t);
  const jetzt = ereignisse.filter((e) => !e.fertig && e.t <= t);
  for (const e of jetzt) e.fertig = true;
  await page.evaluate(
    ({ x, y, Z, MITTE, B, H, arten, dt }) => {
      const L = window.__linien;
      L.zeigerHin(B / 2 + (x - MITTE[0]) * Z, H / 2 + (y - MITTE[1]) * Z, dt);
      for (const a of arten) {
        if (a === 'druecken') L.verhalten.druecken();
        else L.verhalten.loslassen();
      }
      L.vorspulen(dt);
    },
    { x, y, Z, MITTE, B, H, arten: jetzt.map((e) => e.art), dt: 1000 / FPS },
  );
  await page.screenshot({ path: path.join(ordner, `b${String(n).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  n++;
}
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(ordner, 'b%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log('Film:', ziel, n, 'Bilder');
