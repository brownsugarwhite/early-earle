// Film: Meldungen tropfen in die Hinweiszeile und verdunsten (S13, Idee 7, 17.11.2026), an „strange bird“ (NAME) im Raum. Eine Meldung
// kommt (Schalter „Linie an der Spiegelkante“), steht und verdunstet; danach kommt der Hinweis leise zurück. Bild für Bild (60 je
// Sekunde; die CSS-Bewegungen werden dafür angehalten und je Bild weitergeschoben), Ausschnitt um die Hinweiszeile, dann MP4.
// Aufruf aus apps/editor, Ozzy auf 5205: [ZEITLUPE=2] node scripts/ozzy/meldung-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/meldung.mp4';
const NAME = process.env.NAME ?? 'strange bird';
const ZEITLUPE = Number(process.env.ZEITLUPE ?? 1);
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-meldung-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
await s.goto(`${URL}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
await s.mouse.move(1300, 500);
await s.waitForTimeout(800);
await s.evaluate(() => window.__ozzy.film(true));
const ms = 1000 / 60 / ZEITLUPE;
let nr = 0;
const bilder = async (n) => {
  for (let i = 0; i < n; i++) {
    await s.evaluate(
      ([dt, ms2]) => {
        window.__ozzy.bild(dt);
        for (const a of document.getAnimations()) {
          a.pause();
          a.currentTime = (Number(a.currentTime) || 0) + ms2;
        }
      },
      [1 / 60 / ZEITLUPE, ms],
    );
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.png`), clip: { x: 220, y: 790, width: 1000, height: 110 } });
  }
};
await bilder(12);
const t0 = Date.now();
await s.evaluate(() => document.getElementById('mit-linie').click());
await bilder(Math.round(1.2 * 60 * ZEITLUPE));
// die Meldung steht fünf Sekunden (Uhr des Browsers); bis kurz davor warten, dann das Verdunsten
await s.waitForTimeout(Math.max(0, 5000 - (Date.now() - t0) - 100));
await bilder(Math.round(1.6 * 60 * ZEITLUPE));
await browser.close();
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.png'), '-vf', 'scale=1500:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder, geschrieben: ${ziel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
