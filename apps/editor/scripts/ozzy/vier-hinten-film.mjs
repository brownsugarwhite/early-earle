// Film: von hinten in die Vier Ansichten und zurück (S16 im Plan „wie es weitergeht“, 17.11.2026), an „strange bird“ (NAME). Der Raum wird
// erst ins Leere gezogen (GRAD um die Hochachse, Standard 150), dann Tab, BILDER Bilder, Tab, 110 Bilder; Bild für Bild mit 1/120 s, im
// Film 60 je Sekunde (zweifach langsamer). Aufruf aus apps/editor, Ozzy auf 5205: [GRAD=150] [BILDER=160] node scripts/ozzy/vier-hinten-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/vier-hinten.mp4';
const NAME = process.env.NAME ?? 'strange bird';
const GRAD = Number(process.env.GRAD ?? 150);
const BILDER = Number(process.env.BILDER ?? 160);
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-hinten-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await s.goto(`${URL}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const ruhig = async () => {
  await s.waitForTimeout(250);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.waitForTimeout(250);
};
await ruhig();
// ins Leere ziehen, langsam loslassen (ohne Schwung)
const px = (GRAD * 520) / 180;
await s.mouse.move(200, 760);
await s.mouse.down();
for (let k = 1; k <= 40; k++) {
  await s.mouse.move(200 + (px * k) / 40, 760 - k);
  await s.waitForTimeout(20);
}
await s.waitForTimeout(400);
await s.mouse.up();
await s.waitForTimeout(800);
await ruhig();
await s.mouse.move(1350, 850);
await s.evaluate(() => window.__ozzy.film(true));
let nr = 0;
const bilder = async (n) => {
  for (let i = 0; i < n; i++) {
    await s.evaluate(() => window.__ozzy.bild(1 / 120));
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 85 });
  }
};
await bilder(15);
await s.keyboard.press('Tab');
await bilder(BILDER);
await s.keyboard.press('Tab');
await bilder(110);
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder → ${ziel}`);
