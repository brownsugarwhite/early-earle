// Film: Wechsel in die Vier Ansichten und zurück (S10 im Plan „wie es weitergeht“, 16.11.2026), an „strange bird“ (NAME). Bild für Bild
// (60 je Sekunde), dann MP4. Aufruf aus apps/editor, Ozzy auf 5205: [ZEITLUPE=3] node scripts/ozzy/vier-film.mjs <ziel.mp4> [zusatz der Adresse, z. B. ohneLinie=0]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/vier.mp4';
const zusatz = process.argv[3] ? `&${process.argv[3]}` : '';
const NAME = process.env.NAME ?? 'strange bird';
/** so viel langsamer als echt (die Fahrt dauert dann so viel länger im Film) */
const ZEITLUPE = Number(process.env.ZEITLUPE ?? 1);
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const B = 1440;
const H = 900;
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-vier-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 1.5 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
await s.goto(`${URL}?form=${encodeURIComponent(NAME)}${zusatz}`);
await s.waitForFunction(() => !!window.__ozzy);
await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
await s.waitForTimeout(600);
await s.mouse.move(1300, 820);
await s.evaluate(() => window.__ozzy.film(true));
let nr = 0;
const warten = async (sek) => {
  for (let i = 0; i < Math.round(sek * 60); i++) {
    await s.evaluate((z) => window.__ozzy.bild(1 / 60 / z), ZEITLUPE);
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
  }
};
await warten(0.5);
await s.keyboard.press('Tab');
await warten(2.0);
await warten(0.6);
await s.keyboard.press('Tab');
await warten(2.0);
await browser.close();
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-vf', `scale=${B}:${H}:flags=lanczos`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder, geschrieben: ${ziel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
