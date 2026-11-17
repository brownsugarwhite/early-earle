// Film: S18, S19 und der Rückweg (Plan „wie es weitergeht“, 17.11.2026), an „strange bird“ (NAME), in echter Geschwindigkeit (60 Bilder je
// Sekunde, Bild für Bild gerechnet). 1: in der Seite den Tropfen aus der Ecke unten links ins Bild ziehen; 2: den Tropfen der Vier Ansichten
// zurück in die Ecke (die Seite); 3: im Raum den Punkt an der Ecke der Kiste über den Kreis ziehen; 4: den Tropfen in die Ecke oben rechts
// (der Raum). Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/ecke-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/ecke.mp4';
const NAME = process.env.NAME ?? 'strange bird';
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-ecke-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
await s.goto(`${URL}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
await s.waitForTimeout(500);
await s.mouse.move(1300, 700);
await s.keyboard.press('1');
await s.waitForTimeout(1400);
await s.evaluate(() => window.__ozzy.film(true));
let nr = 0;
const bild = async (n = 1) => {
  for (let i = 0; i < n; i++) {
    await s.evaluate(() => window.__ozzy.bild(1 / 60));
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 85 });
  }
};
// ein Zug von a nach b in n Bildern (sanft an und aus)
const zug = async (a, b, n) => {
  await s.mouse.move(a[0], a[1]);
  await bild(12);
  await s.mouse.down();
  await bild(4);
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const w = t * t * (3 - 2 * t);
    await s.mouse.move(a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w);
    await bild(1);
  }
  await bild(6);
  await s.mouse.up();
};
await bild(20);
// 1: Seite → Vier Ansichten
const e1 = (await O('eck')).ort;
await zug(e1, [700, 420], 70);
await bild(70);
// 2: zurück in die Ecke unten links
const F2 = await O('felderJetzt');
await zug([F2.tx, F2.ty], [8, 892], 60);
await bild(75);
// 3: in den Raum, dann die Ecke der Kiste über den Kreis
await s.mouse.move(1300, 700);
await s.keyboard.press('0');
await bild(50);
const e3 = (await O('eck')).ort;
const R = (await O('eck')).kreis;
await zug(e3, [e3[0] + 1.25 * R * 0.75, e3[1] - 1.25 * R * 0.66], 70);
await bild(40);
// 4: den Tropfen in die Ecke oben rechts: die Kiste klappt zu
const F4 = await O('felderJetzt');
await zug([F4.tx, F4.ty], [1432, 8], 60);
await bild(60);
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder → ${ziel}`);
