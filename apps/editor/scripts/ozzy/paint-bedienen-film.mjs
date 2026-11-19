// Film zum Paint-Modus, Etappe 2 (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 10), in echter Zeit aufgenommen, an
// Florians Form „strange bird“ auf Wachs, von vorn gesehen. Jede Geste mit einzelnen Klicks und Zügen, wie von Hand:
//   1  B, P. Am Schnabel: auf der Mitte beginnen (P rastet ein, die Mitte zeigt sich als Punktreihe), drei runde Punkte über eine
//      Seite, auf der Mitte enden: Die Farblinie ist fertig, ihr Spiegelbild schließt sie. A, ein Klick füllt beide Hälften.
//   2  P: ein runder Fleck auf der Seite (vier Züge, auf dem ersten Punkt geschlossen), gefüllt; sein Spiegelbild steht gegenüber.
//   3  P: ein eckiger Fleck mit vier Klicks, gefüllt.
//   4  A: einen Punkt des runden Flecks ziehen, eine Richtung drehen; die Füllung folgt.
//   5  die Ansicht drehen und zurück; B: zurück zur Form (die Farbe bleibt, die Farblinien treten zurück).
// Die Stellen sind für diese Form und diese Ansicht gewählt; die zwei Stellen auf der Mitte sucht das Skript (Haken `farbMitte`).
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-bedienen-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GPU_ARGS } from '../pruefen/ozzy-teile.mjs';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/2026-11-19-paint-etappe-2.mp4';
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-paint-film-'));
const browser = await chromium.launch({ args: GPU_ARGS });
const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: ordner, size: { width: 1440, height: 900 } } });
const s = await kontext.newPage();
const t0 = Date.now();
await s.goto(`${URL}?form=${encodeURIComponent('strange bird')}&material=wachs`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
await s.waitForTimeout(2500);
const klick = async (x, y, schritte = 12) => {
  await s.mouse.move(x, y, { steps: schritte });
  await s.waitForTimeout(320);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(240);
};
const zieh = async (x, y, dx, dy) => {
  await s.mouse.move(x, y, { steps: 12 });
  await s.waitForTimeout(300);
  await s.mouse.down();
  for (let i = 1; i <= 9; i++) {
    await s.mouse.move(x + (dx * i) / 9, y + (dy * i) / 9);
    await s.waitForTimeout(26);
  }
  await s.waitForTimeout(110);
  await s.mouse.up();
  await s.waitForTimeout(240);
};
// heran, dann von vorn: Die Mitte läuft sichtbar über den Schnabel
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
await s.mouse.move(980, 760, { steps: 8 });
const anfang = (Date.now() - t0) / 1000;
await s.waitForTimeout(800);
await s.keyboard.press('b');
await s.waitForTimeout(900);
await s.keyboard.press('p');
await s.waitForTimeout(600);
const farbe = async (hex) => {
  await s.evaluate((h) => {
    const f = document.getElementById('farbe-farbe');
    f.value = h;
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.dispatchEvent(new Event('change', { bubbles: true }));
  }, hex);
  await s.waitForTimeout(350);
};
const fuellen = async (nr) => {
  const P = await O('farbLinieImBild', nr);
  await klick(P.reduce((a, p) => a + p.x, 0) / P.length, P.reduce((a, p) => a + p.y, 0) / P.length);
  await s.waitForTimeout(600);
};
// 1: am Schnabel, von der Mitte zur Mitte
{
  await s.mouse.move(640, 720, { steps: 10 });
  await s.waitForTimeout(500);
  const M = (await O('farbMitte')).filter((p) => p.y > 650 && p.y < 870).sort((a, b) => a.y - b.y);
  const A = M[Math.floor(M.length * 0.12)];
  const B = M.find((p) => p.y > A.y && Math.hypot(p.x - A.x, p.y - A.y) > 135) ?? M[M.length - 1];
  const lang = Math.hypot(B.x - A.x, B.y - A.y);
  const ux = (B.x - A.x) / lang;
  const uy = (B.y - A.y) / lang;
  // die Seite, auf der die Form liegt
  let seite = 1;
  for (const sg of [1, -1]) {
    const frei = [];
    for (const f of [0.25, 0.5, 0.75]) frei.push(await O('farbOrtFrei', A.x + f * lang * ux - sg * 46 * uy, A.y + f * lang * uy + sg * 46 * ux));
    if (frei.every(Boolean)) {
      seite = sg;
      break;
    }
  }
  console.log(`Mitte: A ${A.x.toFixed(0)};${A.y.toFixed(0)}, B ${B.x.toFixed(0)};${B.y.toFixed(0)}, Seite ${seite}`);
  await klick(A.x + 3, A.y + 2);
  for (const [f, tief] of [
    [0.22, 30],
    [0.52, 42],
    [0.8, 28],
  ])
    await zieh(A.x + f * lang * ux - seite * tief * uy, A.y + f * lang * uy + seite * tief * ux, 0.13 * lang * ux, 0.13 * lang * uy);
  await klick(B.x - 2, B.y + 3);
  await s.waitForTimeout(700);
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  await fuellen(0);
}
// 2: ein runder Fleck auf der Seite (vier Züge, auf dem ersten geschlossen), hell
{
  const q = { x: 478, y: 505 };
  const r = 44;
  await s.keyboard.press('p');
  await s.waitForTimeout(500);
  for (let i = 0; i < 4; i++) {
    const w = (Math.PI / 2) * i - 0.4;
    await zieh(q.x + r * Math.cos(w), q.y + 1.15 * r * Math.sin(w), -0.55 * r * Math.sin(w), 0.63 * r * Math.cos(w));
  }
  await klick(q.x + r * Math.cos(-0.4), q.y + 1.15 * r * Math.sin(-0.4));
  await s.waitForTimeout(600);
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  await farbe('#f4efe6');
  await fuellen(1);
}
// 3: ein eckiger Fleck (vier Klicks), blau
{
  const q = { x: 562, y: 318 };
  const r = 30;
  await s.keyboard.press('p');
  await s.waitForTimeout(500);
  const P = [
    [-0.9, -1.5],
    [0.9, -1.2],
    [1.0, 1.4],
    [-1.0, 1.2],
  ].map(([a, b]) => [q.x + r * a, q.y + r * b]);
  for (const [x, y] of [...P, P[0]]) await klick(x, y);
  await s.waitForTimeout(600);
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  await farbe('#2f8fd0');
  await fuellen(2);
}
await s.waitForTimeout(500);
// 4: A: einen Punkt des runden Flecks ziehen, dann eine Richtung drehen
{
  const Q = (await O('farbPunkte', 1)).punkte;
  const p = Q[2];
  await s.mouse.move(p.x, p.y, { steps: 16 });
  await s.waitForTimeout(550);
  await s.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await s.mouse.move(p.x - 1.5 * i, p.y + 0.9 * i);
    await s.waitForTimeout(28);
  }
  await s.waitForTimeout(280);
  await s.mouse.up();
  await s.waitForTimeout(800);
  const Q2 = (await O('farbPunkte', 1)).punkte;
  const L = await O('farbLinieImBild', 1);
  const m = Q2[0];
  let st = null;
  for (let i = m.i + 1; i < L.length; i++)
    if (Math.hypot(L[i].x - m.x, L[i].y - m.y) >= 17) {
      st = L[i];
      break;
    }
  if (st) {
    await s.mouse.move(st.x, st.y, { steps: 16 });
    await s.waitForTimeout(650);
    const w0 = Math.atan2(st.y - m.y, st.x - m.x);
    const rr = Math.hypot(st.x - m.x, st.y - m.y);
    await s.mouse.down();
    await s.waitForTimeout(300);
    for (let i = 1; i <= 22; i++) {
      const w = w0 + ((38 * Math.PI) / 180) * Math.sin((Math.PI * i) / 22) * (i < 15 ? 1 : 0.75);
      await s.mouse.move(m.x + rr * Math.cos(w), m.y + rr * Math.sin(w));
      await s.waitForTimeout(42);
    }
    await s.waitForTimeout(280);
    await s.mouse.up();
    await s.waitForTimeout(800);
  }
}
// 5: die Ansicht drehen und zurück
await s.mouse.move(1320, 780, { steps: 12 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 40; k++) {
  await s.mouse.move(1320 + 5.5 * k, 780 - 0.8 * k);
  await s.waitForTimeout(24);
}
await s.waitForTimeout(500);
for (let k = 40; k >= 0; k--) {
  await s.mouse.move(1320 + 5.5 * k, 780 - 0.8 * k);
  await s.waitForTimeout(24);
}
await s.mouse.up();
await s.waitForTimeout(900);
// B: zurück zur Form (die Farbe bleibt, die Farblinien treten zurück)
await s.keyboard.press('b');
await s.waitForTimeout(1800);
const f = await O('farbe');
const g = await O('farbGelegt');
console.log(`Ende: ${f.linien} Farblinien, ${f.fuellungen} Füllungen, ${f.fehl} ohne Weg; Kurven im Bild gelegt ${g.bild}-mal, im Raum ${g.raum}-mal`);
await kontext.close();
const roh = fs.readdirSync(ordner).find((n) => n.endsWith('.webm'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, anfang - 0.2)), '-i', path.join(ordner, roh), '-vf', 'crop=1000:800:260:90,scale=1000:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', '-an', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`Film: ${ziel}`);
await browser.close();
