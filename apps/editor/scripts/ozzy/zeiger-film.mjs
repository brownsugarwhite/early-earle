// Film und Bild: der Zeiger in der Form des Werkzeugs (S13, Idee 8, 17.11.2026), an „strange bird“ (NAME) im Raum: Pfeil, P (Spitze),
// L (Schlinge), V über der Haut (Ring, so groß wie der Pinsel), zurück ins Leere (Pfeil). Bild für Bild (60 je Sekunde), dann MP4;
// dazu ein Bild mit den vier Formen nebeneinander (Ausschnitt um den Zeiger).
// Aufruf aus apps/editor, Ozzy auf 5205: [ZEITLUPE=2] node scripts/ozzy/zeiger-film.mjs <ziel.mp4> <bild.png>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/zeiger.mp4';
const bildZiel = process.argv[3] ?? '../../docs/progress/ozzy/zeiger.png';
const NAME = process.env.NAME ?? 'strange bird';
const ZEITLUPE = Number(process.env.ZEITLUPE ?? 1);
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const B = 1440;
const H = 900;
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-zeiger-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await s.goto(`${URL}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
await s.waitForTimeout(800);
const leer = { x: 980, y: 640 };
const haut = { x: 700, y: 470 };
await s.mouse.move(leer.x, leer.y);
await s.waitForTimeout(300);
await s.evaluate(() => window.__ozzy.film(true));
let nr = 0;
const bilder = async (n) => {
  for (let i = 0; i < n; i++) {
    await s.evaluate((z) => window.__ozzy.bild(1 / 60 / z), ZEITLUPE);
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92, clip: { x: 560, y: 330, width: 640, height: 400 } });
  }
};
const standbild = async (name, um) => {
  await s.screenshot({ path: path.join(ordner, `stand-${name}.png`), clip: { x: um.x - 70, y: um.y - 70, width: 180, height: 160 } });
};
await bilder(30);
await standbild('1', leer);
await s.keyboard.press('p');
await bilder(30);
await standbild('2', leer);
await s.keyboard.press('q');
await bilder(30);
await standbild('3', leer);
await s.keyboard.press('a');
await bilder(12);
for (let k = 1; k <= 20; k++) {
  await s.mouse.move(leer.x + ((haut.x - leer.x) * k) / 20, leer.y + ((haut.y - leer.y) * k) / 20);
  await bilder(1);
}
await bilder(30);
await s.screenshot({ path: path.join(ordner, 'stand-4.png'), clip: { x: haut.x - 160, y: haut.y - 140, width: 320, height: 280 } });
for (let k = 1; k <= 20; k++) {
  await s.mouse.move(haut.x + ((leer.x - haut.x) * k) / 20, haut.y + ((leer.y - haut.y) * k) / 20);
  await bilder(1);
}
await bilder(30);
await browser.close();
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-vf', 'scale=1280:800:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', ziel]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(ordner, 'stand-1.png'), '-i', path.join(ordner, 'stand-2.png'), '-i', path.join(ordner, 'stand-3.png'), '-i', path.join(ordner, 'stand-4.png'), '-filter_complex', '[0]scale=-1:560[a];[1]scale=-1:560[b];[2]scale=-1:560[c];[3]scale=-1:560[d];[a][b][c][d]hstack=4', bildZiel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder, geschrieben: ${ziel}, ${bildZiel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
