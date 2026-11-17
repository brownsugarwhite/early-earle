// Film: Menüs als Tropfen (S13, Idee 1, 17.11.2026), an „strange bird“ (NAME): das Menü wächst aus „Ozzy“ und fließt zurück; in der
// eingerasteten Seite einen Punkt eines Rings wählen, der Knopf „Maul“ quillt unter der Linie hervor; ihn drücken, und sobald es ein Maul
// gibt, fliegt „Fressen“ aus ihm an seinen Platz. Bild für Bild (60 je Sekunde; die CSS- und Web-Bewegungen werden dafür angehalten und je
// Bild weitergeschoben), dann MP4.
// Aufruf aus apps/editor, Ozzy auf 5205: [ZEITLUPE=2] node scripts/ozzy/menue-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/menue.mp4';
const NAME = process.env.NAME ?? 'strange bird';
const ZEITLUPE = Number(process.env.ZEITLUPE ?? 1);
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-menue-'));
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
await ruhig();
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
await s.mouse.move(1200, 760);
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
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
  }
};
// das Menü auf und zu
await bilder(10);
await s.evaluate(() => document.getElementById('marke').click());
await bilder(Math.round(0.8 * 60 * ZEITLUPE));
await s.evaluate(() => document.getElementById('marke').click());
await bilder(Math.round(0.6 * 60 * ZEITLUPE));
// die ganze Linie des Rings wählen (Klick mitten auf sie): Der Knopf „Maul formen“ quillt hervor; K macht sie hart, dann heißt er „Maul“
await s.evaluate(() => window.__ozzy.film(false));
const c = await O('linieImBild', 2, 'seite');
await s.mouse.move(c.x, c.y);
await s.waitForTimeout(400);
await s.evaluate(() => window.__ozzy.film(true));
await s.mouse.down();
await s.mouse.up();
await bilder(Math.round(0.7 * 60 * ZEITLUPE));
await s.evaluate(() => window.__ozzy.film(false));
await s.keyboard.press('k');
await ruhig();
await s.mouse.move(1200, 760);
await s.waitForTimeout(300);
await s.evaluate(() => window.__ozzy.film(true));
await bilder(Math.round(0.3 * 60 * ZEITLUPE));
// „Maul“ drücken: Das Werk legt das Maul an, „Fressen“ fliegt aus dem Tropfen an seinen Platz
const knopf = await s.evaluate(() => {
  const b = document.getElementById('maul-tropfen');
  return b && !b.hidden ? b.textContent : null;
});
if (knopf === 'Maul') {
  await s.evaluate(() => document.getElementById('maul-tropfen').click());
  for (let i = 0; i < 240; i++) {
    await bilder(1);
    if (await s.evaluate(() => !document.getElementById('fressen').hidden)) break;
  }
  await bilder(Math.round(0.9 * 60 * ZEITLUPE));
}
await browser.close();
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-vf', 'scale=1440:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder, Knopf „${knopf}“, geschrieben: ${ziel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
