// Film: der Raum gedreht (S21 im Plan „wie es weitergeht“, 17.11.2026), an „strange bird“ (NAME), in echter Geschwindigkeit (60 Bilder je
// Sekunde, Bild für Bild gerechnet): einmal um 360° um die Hochachse, dann unter den Boden und zurück, dann Tab auf und zu.
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/raum-dreh-film.mjs <ziel.mp4> [zusatz der Adresse]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/raum-dreh.mp4';
const zusatz = process.argv[3] ? `&${process.argv[3]}` : '';
const NAME = process.env.NAME ?? 'strange bird';
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-dreh-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await s.goto(`${URL}?form=${encodeURIComponent(NAME)}${zusatz}`);
await s.waitForFunction(() => !!window.__ozzy);
await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
await s.waitForTimeout(500);
await s.mouse.move(150, 790);
await s.evaluate(() => window.__ozzy.film(true));
let nr = 0;
const bild = async (n = 1) => {
  for (let i = 0; i < n; i++) {
    await s.evaluate(() => window.__ozzy.bild(1 / 60));
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 85 });
  }
};
await bild(10);
await s.mouse.down();
let x = 150;
let y = 790;
// 360° um die Hochachse (1040 px), 6 px je Bild
for (let k = 0; k < 174; k++) {
  x += 6;
  await s.mouse.move(x, y);
  await bild(1);
}
// unter den Boden (Neigung um 54° nach unten) und zurück
for (let k = 0; k < 52; k++) {
  y -= 3;
  await s.mouse.move(x, y);
  await bild(1);
}
for (let k = 0; k < 52; k++) {
  y += 3;
  await s.mouse.move(x, y);
  await bild(1);
}
await bild(30);
await s.mouse.up();
await bild(20);
await s.mouse.move(1430, 890);
await s.keyboard.press('Tab');
await bild(60);
await s.keyboard.press('Tab');
await bild(60);
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder → ${ziel}`);
