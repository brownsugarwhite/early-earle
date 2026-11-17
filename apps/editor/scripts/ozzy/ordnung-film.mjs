// Film: Ordnungslinien als feine Fäden (S13, Idee 9, 17.11.2026), an „strange bird“ (NAME): einen Punkt an der Wand der Seite im Raum
// ziehen (Fäden vom Punkt auf der Haut zu seinen Bildern an den Wänden), dann in den Vier Ansichten (Fäden zwischen Seite, Front und Top).
// Bild für Bild (60 je Sekunde), dann MP4. Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/ordnung-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/ordnung.mp4';
const NAME = process.env.NAME ?? 'strange bird';
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-ordnung-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
await s.goto(`${URL}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(250);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.waitForTimeout(150);
};
let nr = 0;
const bild = async () => {
  await s.evaluate(() => window.__ozzy.bild(1 / 60));
  await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
};
/** einen Punkt fassen und langsam im Kreis ziehen, Bild für Bild */
const ziehen = async (c, n) => {
  await s.mouse.move(c.x, c.y);
  await s.waitForTimeout(400);
  await s.mouse.down();
  await s.waitForTimeout(300);
  await s.evaluate(() => window.__ozzy.film(true));
  for (let k = 1; k <= n; k++) {
    const w = (2 * Math.PI * k) / n;
    await s.mouse.move(c.x + 30 * Math.sin(w), c.y - 30 * (1 - Math.cos(w)) * 0.6);
    await bild();
  }
  await s.mouse.up();
  for (let k = 0; k < 20; k++) await bild();
  await s.evaluate(() => window.__ozzy.film(false));
  await ruhig();
};
await ruhig();
const A = { id: 2, i: 1 };
const c1 = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
await ziehen(c1, 90);
await s.keyboard.press('Meta+z');
await ruhig();
await s.keyboard.press('Tab');
await s.waitForTimeout(1500);
await ruhig();
const c2 = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
await ziehen(c2, 90);
await browser.close();
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(ordner, '%05d.jpg'), '-vf', 'scale=1440:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder, geschrieben: ${ziel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
