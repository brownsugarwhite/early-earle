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
  [2.9, [441, 212]],
  // die Kreuzung springt zum Zeiger; Drücken: der Zeiger gleitet auf die Kreuzung, dann folgt sie der Maus
  [3.4, [436, 208]],
  [3.9, [436.2, 208.2], 'druecken'],
  [4.4, [436.2, 208.2]],
  [5.5, [450, 220]],
  [5.6, [450, 220], 'loslassen'],
  [6.2, [450.5, 220.5]],
  [6.7, [404, 212]],
  [7.4, [390, 200]],
  [8.0, [382, 187.5]],
  [8.6, [382.5, 188]],
  // an der Linie entlang, dann eine Stelle der Linie greifen und ziehen
  [9.3, [387, 214]],
  [9.7, [385.5, 215]],
  [10.1, [385.6, 215.1], 'druecken'],
  [10.55, [385.6, 215.1]],
  [11.4, [371, 212]],
  [11.5, [371, 212], 'loslassen'],
  [12.05, [371.5, 212.5]],
  [13.0, [515, 150]],
  [13.8, [515, 150]],
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
    // vergrößert gezeigt wie Florians Nahbild: die Linie wächst mit
    L.ansicht.wachsen = true;
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
