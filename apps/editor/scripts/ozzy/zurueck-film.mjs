// Film: ⌘Z fließt zurück (S13, Idee 6, im Plan „wie es weitergeht“, 17.11.2026), an „strange bird“ (NAME) in der eingerasteten Seite:
// ein Punkt wird gezogen, dann ⌘Z. Bild für Bild (60 je Sekunde), dann MP4; dazu die Lage des Punkts je Bild und die Probe:
//   1  kein Sprung: Im ersten Bild nach ⌘Z ist der Punkt höchstens 35 % des Wegs gegangen.
//   2  angekommen: Nach 0,25 s liegt er genau in der neuen Lage (höchstens 0,5 px).
//   3  ein Gipfel der Geschwindigkeit (gleich los, dann sanft).
// Aufruf aus apps/editor, Ozzy auf 5205: [ZEITLUPE=3] node scripts/ozzy/zurueck-film.mjs <ziel.mp4> [zusatz der Adresse, z. B. fluss=0]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/zurueck.mp4';
const zusatz = process.argv[3] ? `&${process.argv[3]}` : '';
const NAME = process.env.NAME ?? 'strange bird';
const ZEITLUPE = Number(process.env.ZEITLUPE ?? 1);
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const B = 1440;
const H = 900;
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-zurueck-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 1.5 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
await s.goto(`${URL}?form=${encodeURIComponent(NAME)}${zusatz}`);
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
// einen Punkt der Seite 60 px nach oben ziehen
const A = { id: 2, i: 1 };
const c = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
await s.mouse.move(c.x, c.y);
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 12; k++) {
  await s.mouse.move(c.x, c.y - 5 * k);
  await s.waitForTimeout(30);
}
await s.mouse.up();
await ruhig();
await s.waitForFunction(() => !window.__ozzy.werk().beschaeftigt, null, { timeout: 60000 });
await s.mouse.move(1300, 820);
await s.waitForTimeout(400);
await s.evaluate(() => window.__ozzy.film(true));
let nr = 0;
const lagen = [];
const bild = async () => {
  await s.evaluate((z) => window.__ozzy.bild(1 / 60 / z), ZEITLUPE);
  lagen.push((await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m));
  await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
};
for (let i = 0; i < 24; i++) await bild();
const vor = lagen[lagen.length - 1];
await s.keyboard.press('Meta+z');
const ab = lagen.length;
for (let i = 0; i < 60; i++) await bild();
await browser.close();
const nach = lagen[lagen.length - 1];
const weg = Math.hypot(nach.x - vor.x, nach.y - vor.y);
const anteil = (p) => Math.hypot(p.x - vor.x, p.y - vor.y) / Math.max(1e-9, weg);
const erstes = lagen[ab];
const t025 = lagen[ab + Math.ceil((0.25 * 60) / (1 / ZEITLUPE)) - 1] ?? nach;
const v = [];
for (let i = ab; i < lagen.length; i++) v.push(Math.hypot(lagen[i].x - lagen[i - 1].x, lagen[i].y - lagen[i - 1].y));
let gipfel = 0;
for (let i = 0; i < v.length; i++) if (v[i] > 0.05 && (i === 0 || v[i] > v[i - 1] + 0.05) && (i === v.length - 1 || v[i] >= v[i + 1])) gipfel++;
const z1 = (x) => x.toFixed(1).replace('.', ',');
console.log(`Weg des Punkts nach ⌘Z ${z1(weg)} px`);
console.log(`${anteil(erstes) <= 0.35 ? 'gut ' : 'FEHL'} 1 kein Sprung: im ersten Bild ${Math.round(anteil(erstes) * 100)} % des Wegs`);
console.log(`${Math.hypot(t025.x - nach.x, t025.y - nach.y) <= 0.5 ? 'gut ' : 'FEHL'} 2 nach 0,25 s angekommen: ${z1(Math.hypot(t025.x - nach.x, t025.y - nach.y))} px daneben`);
console.log(`${gipfel === 1 ? 'gut ' : 'FEHL'} 3 ein Gipfel der Geschwindigkeit: ${gipfel} (${v.slice(0, 16).map(z1).join(' ')} …)`);
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-vf', `scale=${B}:${H}:flags=lanczos`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder, geschrieben: ${ziel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
