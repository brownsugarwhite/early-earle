// Film: Wenden in Ozzy (S4b im Plan „wie es weitergeht“, 16.11.2026), an „strange bird“ (NAME). Echte Maus- und Tastenereignisse;
// Bild für Bild gerechnet (60 je Sekunde, der Takt der Seite steht), dann mit ffmpeg zu MP4. Oben rechts steht, was gedrückt wird.
// Ablauf: 1 (Seite) · ⇧ + Ziehen unter der Hälfte (gleitet zurück) · ⇧ + Ziehen über die Hälfte (die schwarze Kante fließt herein,
// gewendet) · ⇧ + Doppelklick (zurück) · ⇧ + 3 (Front von hinten) · 0 (Raum).
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/wenden-film.mjs [ziel.mp4]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/2026-11-16-wenden.mp4';
const NAME = process.env.NAME ?? 'strange bird';
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const DPR = Number(process.env.DPR ?? 1.5);
const B = 1440;
const H = 900;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-film-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: DPR });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await s.goto(`${URL}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
await s.waitForTimeout(600);
// Beschriftung oben rechts (nur im Film): kehrt sich mit dem Wenden um wie Marke und Hinweis
await s.evaluate(() => {
  const d = document.createElement('div');
  d.id = 'film-text';
  Object.assign(d.style, { position: 'fixed', right: '28px', top: '22px', font: '500 16px/1.2 system-ui, -apple-system, sans-serif', color: '#e0e5e8', mixBlendMode: 'difference', zIndex: '9', pointerEvents: 'none' });
  document.body.appendChild(d);
  window.__ozzy.film(true);
});
const text = (t) => s.evaluate((t2) => (document.getElementById('film-text').textContent = t2), t);

let nr = 0;
let maus = [1120, 770];
const bild = async () => {
  await s.evaluate(() => window.__ozzy.bild(1 / 60));
  await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
};
const warten = async (sek) => {
  for (let i = 0; i < Math.round(sek * 60); i++) await bild();
};
const fahren = async (nach, sek) => {
  const von = maus;
  const n = Math.max(1, Math.round(sek * 60));
  for (let i = 1; i <= n; i++) {
    const f = ease(i / n);
    maus = [von[0] + (nach[0] - von[0]) * f, von[1] + (nach[1] - von[1]) * f];
    await s.mouse.move(maus[0], maus[1]);
    await bild();
  }
};
/** ⇧ + Ziehen um dx (ins Leere), halten, loslassen */
const wenden = async (dx, sek, halten) => {
  await s.keyboard.down('Shift');
  await s.mouse.down();
  await bild();
  await fahren([maus[0] + dx, maus[1]], sek);
  await warten(halten);
  await s.mouse.up();
  await s.keyboard.up('Shift');
};

await s.mouse.move(maus[0], maus[1]);
await warten(0.6);
await text('1 · Seite');
await s.keyboard.press('1');
await warten(1.4);
await fahren([520, 800], 0.5);
await text('⇧ + ziehen, bis zur Hälfte: gleitet zurück');
await wenden(150, 1.0, 0.3);
await warten(1.4);
await text('⇧ + ziehen, über die Hälfte: gewendet');
await fahren([520, 800], 0.4);
await wenden(340, 1.6, 0.4);
await warten(1.6);
await text('');
await warten(0.6);
await text('⇧ + Doppelklick: zurück');
await fahren([900, 800], 0.4);
await s.keyboard.down('Shift');
await s.mouse.dblclick(maus[0], maus[1]);
await s.keyboard.up('Shift');
await warten(1.5);
await text('⇧ + 3 · Front von hinten');
await s.keyboard.press('Shift+Digit3');
await warten(1.6);
await text('0 · Raum');
await s.keyboard.press('0');
await warten(1.6);

await browser.close();
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-vf', `scale=${B}:${H}:flags=lanczos`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder, geschrieben: ${ziel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
