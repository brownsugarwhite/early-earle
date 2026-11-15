// Film der Probe „Anfang einer Form“ (15.11.2026): leeres Blatt, der Fisch wird mit P gezeichnet (echte Mausereignisse),
// geschlossen, mit ↩ aufgeblasen; danach Zeiger auf der Haut (Hauch), an der Haut ziehen (Spannung), Ansicht drehen (Fahrtwind).
// Bild für Bild gerechnet (60 je Sekunde, der Takt des Browsers ist angehalten), dann mit ffmpeg zu MP4.
// Aufruf aus apps/editor, Server auf 5203:
//   node scripts/anfang/film.mjs <ziel.mp4> [fassung 0–3] [nacht 0|1]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FISCH } from './fisch.mjs';

const ziel = process.argv[2] ?? '../../docs/progress/anfang/film.mp4';
const fassung = Number(process.argv[3] ?? 0);
const nacht = process.argv[4] === '1';
const URL = process.env.URL ?? 'http://localhost:5203';
const DPR = Number(process.env.DPR ?? 1.5);
const B = 1200;
const H = 800;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'anfang-film-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: DPR });
page.on('console', (m) => {
  if (m.type() === 'error') console.error('Seite:', m.text());
});
const titel = encodeURIComponent(process.env.TITEL ?? '');
await page.goto(`${URL}/anfang.html?film=1&fassung=${fassung}&nacht=${nacht ? 1 : 0}&titel=${titel}`);
await page.waitForFunction(() => window.__anfang);
await page.evaluate(() => window.__anfang.film(true));

let nr = 0;
let maus = [1060, 720];
const bild = async () => {
  await page.evaluate(() => window.__anfang.bild(1 / 60));
  await page.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
};
const warten = async (s) => {
  for (let i = 0; i < Math.round(s * 60); i++) await bild();
};
const fahren = async (nach, s) => {
  const von = maus;
  const n = Math.max(1, Math.round(s * 60));
  for (let i = 1; i <= n; i++) {
    const f = ease(i / n);
    maus = [von[0] + (nach[0] - von[0]) * f, von[1] + (nach[1] - von[1]) * f];
    await page.mouse.move(maus[0], maus[1]);
    await bild();
  }
};

// KURZ=1: nur Aufblasen und Drehen (für den Vergleich der Fassungen), die Form ist schon gezeichnet
if (process.env.KURZ === '1') {
  await page.evaluate((f) => window.__anfang.form(f), FISCH);
  maus = [FISCH[0].x + 150, FISCH[0].y + 230];
  await page.mouse.move(maus[0], maus[1]);
  await warten(0.4);
  await page.keyboard.press('Enter');
  await warten(2.7);
  // drehen: im leeren Raum links der Form drücken
  const kopf = await page.evaluate(() => window.__anfang.aufDerHaut(-1.6, 0.2));
  const leer = [kopf.x - 140, kopf.y + 20];
  await fahren(leer, 0.4);
  await page.mouse.down();
  await bild();
  await fahren([leer[0] + 230, leer[1] + 30], 1.3);
  await page.mouse.up();
  await warten(0.9);
  await browser.close();
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
  fs.rmSync(ordner, { recursive: true, force: true });
  console.log(`${nr} Bilder, geschrieben:`, ziel);
  process.exit(0);
}

// 1 · leeres Blatt, der Zeiger kommt herein
await page.mouse.move(maus[0], maus[1]);
await warten(0.5);
await fahren([FISCH[0].x - 40, FISCH[0].y + 30], 0.9);
// 2 · zeichnen mit P
for (const a of FISCH) {
  await fahren([a.x, a.y], 0.32);
  await page.mouse.down();
  await bild();
  const schwung = Math.hypot(a.aus[0], a.aus[1]) > 0;
  if (schwung) await fahren([a.x + a.aus[0], a.y + a.aus[1]], 0.26);
  await page.mouse.up();
  await warten(0.08);
}
// 3 · schließen: am ersten Punkt öffnet sich der Ring
await fahren([FISCH[0].x + 2, FISCH[0].y + 1], 0.4);
await warten(0.3);
await page.mouse.down();
await bild();
await page.mouse.up();
await fahren([FISCH[0].x + 150, FISCH[0].y + 230], 0.8);
await warten(0.5);
// 4 · ↩: aufblasen
await page.keyboard.press('Enter');
await warten(2.7);
// 5 · über die Wände fahren (Linien und Name), Zeiger auf der Blase (Hauch), an der Blase ziehen (Spannung), Ansicht drehen
const auf = async (fx, fy) => page.evaluate(([fx, fy]) => window.__anfang.aufDerHaut(fx, fy), [fx, fy]);
const wand = async (i, a, b) => page.evaluate(([i, a, b]) => window.__anfang.aufDerWand(i, a, b), [i, a, b]);
const rueck = await wand(0, 0.2, 0.1);
await fahren([rueck.x, rueck.y], 0.8);
await warten(0.9);
const links = await wand(1, 0, 0.1);
await fahren([links.x, links.y], 0.7);
await warten(0.9);
const name = await page.evaluate(() => window.__anfang.aufDemNamen(2));
await fahren([name.x, name.y], 0.7);
await warten(0.9);
const kopf = await auf(-0.35, 0.05);
await fahren([kopf.x, kopf.y], 0.7);
const ruecken = await auf(0.05, 0.42);
await fahren([ruecken.x, ruecken.y], 0.8);
await warten(0.2);
await page.mouse.down();
await bild();
await fahren([ruecken.x + 18, ruecken.y - 46], 0.7);
await warten(0.25);
await page.mouse.up();
await warten(0.6);
const kopfRand = await auf(-1.6, 0.2);
await fahren([kopfRand.x - 140, kopfRand.y + 20], 0.6);
await page.mouse.down();
await bild();
await fahren([kopfRand.x + 90, kopfRand.y + 50], 1.3);
await page.mouse.up();
await warten(1.4);

await browser.close();
console.log(`${nr} Bilder`);
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log('geschrieben:', ziel);
