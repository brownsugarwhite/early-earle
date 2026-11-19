// Film zum Paint-Modus, Etappe 3 (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 12): die Farbe läuft ein. In echter Zeit
// aufgenommen, an Florians Form „strange bird“ auf Wachs, von vorn gesehen. Vorbereitet (nicht im Film): vier Farblinien, ein
// offener Bogen in der Mitte, ein runder Fleck auf der Seite, ein eckiger am Flügel, der Schnabel von der Mitte zur Mitte. Im Film:
//   1  im offenen Bogen geklickt: Der Tropfen fällt vom Zeiger, die Farbe läuft aus der Öffnung, um die Enden des Bogens und über
//      den ganzen Körper, bis an die drei geschlossenen Farblinien
//   2  der runde Fleck, der eckige, der Schnabel, jeder in einer anderen Farbe
//   3  der runde Fleck noch einmal: Farbe über Farbe
//   4  ein wenig drehen
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html [ART=tinte|honig] node scripts/ozzy/paint-fuellen-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GPU_ARGS } from '../pruefen/ozzy-teile.mjs';

const ART = process.env.ART ?? 'tinte';
const ziel = process.argv[2] ?? `../../docs/progress/ozzy/2026-11-19-paint-etappe-3-${ART}.mp4`;
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-paint-film-'));
const browser = await chromium.launch({ args: GPU_ARGS });
const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: ordner, size: { width: 1440, height: 900 } } });
const s = await kontext.newPage();
const t0 = Date.now();
await s.goto(`${URL}?form=${encodeURIComponent('strange bird')}&material=wachs&fuellen=0`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
await s.waitForTimeout(2500);
const klick = async (x, y, schritte = 6, vor = 200) => {
  await s.mouse.move(x, y, { steps: schritte });
  await s.waitForTimeout(vor);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(220);
};
const zieh = async (x, y, dx, dy) => {
  await s.mouse.move(x, y, { steps: 5 });
  await s.waitForTimeout(200);
  await s.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await s.mouse.move(x + (dx * i) / 6, y + (dy * i) / 6);
    await s.waitForTimeout(22);
  }
  await s.mouse.up();
  await s.waitForTimeout(220);
};
const farbe = async (hex) => {
  await s.evaluate((h) => {
    const f = document.getElementById('farbe-farbe');
    f.value = h;
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.dispatchEvent(new Event('change', { bubbles: true }));
  }, hex);
  await s.waitForTimeout(300);
};
// heran, dann von vorn
await s.mouse.move(720, 470);
for (let i = 0; i < 12; i++) {
  await s.mouse.wheel(0, -100);
  await s.waitForTimeout(40);
}
await s.waitForTimeout(1200);
await s.mouse.move(1340, 800);
await s.mouse.down();
for (let k = 1; k <= 30; k++) {
  await s.mouse.move(1340 - (170 * k) / 30, 800);
  await s.waitForTimeout(16);
}
await s.mouse.up();
await s.waitForTimeout(1200);
await s.keyboard.press('b');
await s.waitForTimeout(700);
// ---------- vorbereiten: vier Farblinien ----------
await s.keyboard.press('p');
await s.waitForTimeout(500);
// der Schnabel, von der Mitte zur Mitte
{
  await s.mouse.move(640, 720, { steps: 6 });
  await s.waitForTimeout(400);
  const M = (await O('farbMitte')).filter((p) => p.y > 650 && p.y < 870).sort((a, b) => a.y - b.y);
  const A = M[Math.floor(M.length * 0.12)];
  const B = M.find((p) => p.y > A.y && Math.hypot(p.x - A.x, p.y - A.y) > 135) ?? M[M.length - 1];
  const lang = Math.hypot(B.x - A.x, B.y - A.y);
  const ux = (B.x - A.x) / lang;
  const uy = (B.y - A.y) / lang;
  let seite = 1;
  for (const sg of [1, -1]) {
    const frei = [];
    for (const f of [0.25, 0.5, 0.75]) frei.push(await O('farbOrtFrei', A.x + f * lang * ux - sg * 46 * uy, A.y + f * lang * uy + sg * 46 * ux));
    if (frei.every(Boolean)) {
      seite = sg;
      break;
    }
  }
  await klick(A.x + 3, A.y + 2);
  for (const [f, tief] of [
    [0.22, 30],
    [0.52, 42],
    [0.8, 28],
  ])
    await zieh(A.x + f * lang * ux - seite * tief * uy, A.y + f * lang * uy + seite * tief * ux, 0.13 * lang * ux, 0.13 * lang * uy);
  await klick(B.x - 2, B.y + 3);
  await s.waitForTimeout(400);
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
}
// der runde Fleck auf der Seite
{
  const q = { x: 478, y: 505 };
  const r = 44;
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  for (let i = 0; i < 4; i++) {
    const w = (Math.PI / 2) * i - 0.4;
    await zieh(q.x + r * Math.cos(w), q.y + 1.15 * r * Math.sin(w), -0.55 * r * Math.sin(w), 0.63 * r * Math.cos(w));
  }
  await klick(q.x + r * Math.cos(-0.4), q.y + 1.15 * r * Math.sin(-0.4));
  await s.waitForTimeout(400);
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
}
// der eckige am Flügel
{
  const q = { x: 562, y: 318 };
  const r = 30;
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  const P = [
    [-0.9, -1.5],
    [0.9, -1.2],
    [1.0, 1.4],
    [-1.0, 1.2],
  ].map(([a, b]) => [q.x + r * a, q.y + r * b]);
  for (const [x, y] of [...P, P[0]]) await klick(x, y);
  await s.waitForTimeout(400);
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
}
// ein offener Bogen in der Mitte des Körpers (nach rechts offen), mit ↩ beendet
{
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  await zieh(642, 452, -26, 6);
  await zieh(572, 524, 0, 30);
  await zieh(640, 598, 26, 6);
  await s.keyboard.press('Enter');
  await s.waitForTimeout(500);
}
await s.keyboard.press('a');
await s.waitForTimeout(400);
{
  const f = await O('farbe');
  if (f.linien !== 4 || f.fuellungen !== 0) throw new Error(`Vorbereitung: ${f.linien} Farblinien (erwartet 4), ${f.fuellungen} Füllungen (erwartet 0)`);
}
await O('farbFliessen', ART);
await s.mouse.move(980, 740, { steps: 8 });
await s.waitForTimeout(600);
// ---------- der Film ----------
const anfang = (Date.now() - t0) / 1000;
const fuellen = async (x, y, hex) => {
  await farbe(hex);
  await s.mouse.move(x + 26, y + 34, { steps: 14 });
  await s.waitForTimeout(280);
  await s.mouse.move(x, y, { steps: 8 });
  await s.waitForTimeout(650);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(80);
  const f = await O('farbFluss');
  console.log(`${hex} bei ${x};${y}: ${f ? `Dauer ${f.dauer.toFixed(2)} s, größte Weite ${f.groesst.toFixed(0)}, vorbereitet in ${f.ms.toFixed(1)} ms` : 'läuft nicht ein'}`);
  await s.waitForTimeout(1000 * (f ? f.dauer : 0.3) + 500);
};
await s.waitForTimeout(500);
await fuellen(612, 526, '#f6c445');
await fuellen(478, 505, '#f4efe6');
await fuellen(562, 318, '#2f8fd0');
{
  const L = await O('farbLinieImBild', 0);
  await fuellen(L.reduce((a, p) => a + p.x, 0) / L.length, L.reduce((a, p) => a + p.y, 0) / L.length, '#ef7d2d');
}
await fuellen(478, 505, '#1f8f6f');
// ein wenig drehen und zurück
await s.mouse.move(1320, 780, { steps: 12 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 36; k++) {
  await s.mouse.move(1320 + 5.5 * k, 780 - 0.8 * k);
  await s.waitForTimeout(24);
}
await s.waitForTimeout(500);
for (let k = 36; k >= 0; k--) {
  await s.mouse.move(1320 + 5.5 * k, 780 - 0.8 * k);
  await s.waitForTimeout(24);
}
await s.mouse.up();
await s.waitForTimeout(900);
const f = await O('farbe');
console.log(`Ende (${ART}): ${f.linien} Farblinien, ${f.fuellungen} Füllungen, ${f.fehl} ohne Weg`);
await kontext.close();
const roh = fs.readdirSync(ordner).find((n) => n.endsWith('.webm'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, anfang - 0.1)), '-i', path.join(ordner, roh), '-vf', 'crop=1000:800:260:90,scale=1000:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-movflags', '+faststart', '-an', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`Film: ${ziel}`);
await browser.close();
