// Film zum Paint-Modus, Etappe 3, zweiter Schritt (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 13): Farben als Tropfen
// unter der Leiste, der Farbtropfen, die Pipette. In echter Zeit aufgenommen, an Florians Form „strange bird“ auf Wachs, von vorn
// gesehen; das Einlaufen in der Fassung „Tinte“. Vorbereitet (nicht im Film): vier Farblinien wie im Film zum Einlaufen
// (`paint-fuellen-film.mjs`). Im Film:
//   1  Blau antippen, den Farbtropfen wählen, in den Körper klicken
//   2  den roten Tropfen aus der Leiste auf den runden Fleck ziehen, den gelben auf den eckigen
//   3  die Pipette wählen, das Rot vom runden Fleck aufnehmen, damit den Schnabel füllen
//   4  den hellen Tropfen auf den runden Fleck ziehen: Farbe über Farbe
//   5  ein wenig drehen
// Über der Leiste zeichnet der Film einen eigenen Pfeil (im Fenster steht dort der Zeiger des Systems, den ein Mitschnitt nicht zeigt).
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-farben-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GPU_ARGS } from '../pruefen/ozzy-teile.mjs';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/2026-11-19-paint-etappe-3-farben.mp4';
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
await O('farbFliessen', 'tinte');
// der Pfeil des Films über der Leiste
await s.evaluate(() => {
  const z = document.createElement('div');
  z.innerHTML = '<svg viewBox="0 0 20 20" width="22" height="22"><path d="M5.2 3.2l9.9 6.2-4.1 1.2 2.3 4.6-1.9 1-2.3-4.7-3 3.1z" fill="#ffffff" stroke="#1f1a17" stroke-width="1.05" stroke-linejoin="round" /></svg>';
  Object.assign(z.style, { position: 'fixed', left: '0', top: '0', zIndex: '9', pointerEvents: 'none', display: 'none' });
  document.body.append(z);
  window.addEventListener(
    'pointermove',
    (e) => {
      z.style.display = e.target instanceof HTMLCanvasElement ? 'none' : 'block';
      z.style.transform = `translate(${e.clientX - 5.7}px, ${e.clientY - 3.5}px)`;
    },
    true,
  );
});
await s.mouse.move(980, 740, { steps: 8 });
await s.waitForTimeout(600);
// ---------- der Film ----------
const anfang = (Date.now() - t0) / 1000;
/** die Mitte eines Tropfens der Leiste (CSS-Pixel) */
const tropfenBei = (i) =>
  s.evaluate((i) => {
    const r = document.querySelectorAll('#farbleiste .reihe button.farbe')[i].getBoundingClientRect();
    return [r.left + r.width / 2, r.top + 10];
  }, i);
const knopfBei = (anfangDesNamens) =>
  s.evaluate((n) => {
    const r = [...document.querySelectorAll('#leiste button.werkzeug')].find((b) => b.title.startsWith(n)).getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }, anfangDesNamens);
const tippen = async (x, y) => {
  await s.mouse.move(x, y, { steps: 22 });
  await s.waitForTimeout(350);
  await s.mouse.down();
  await s.waitForTimeout(70);
  await s.mouse.up();
  await s.waitForTimeout(550);
};
/** warten, bis die Füllung eingelaufen ist */
const einlaufen = async (wo) => {
  await s.waitForTimeout(80);
  const f = await O('farbFluss');
  console.log(`${wo}: ${f ? `Dauer ${f.dauer.toFixed(2)} s, vorbereitet in ${f.ms.toFixed(1)} ms` : 'läuft nicht ein'}`);
  await s.waitForTimeout(1000 * (f ? f.dauer : 0.3) + 600);
};
const fuellen = async (x, y, wo) => {
  await s.mouse.move(x + 30, y + 40, { steps: 22 });
  await s.waitForTimeout(250);
  await s.mouse.move(x, y, { steps: 10 });
  await s.waitForTimeout(600);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await einlaufen(wo);
};
/** einen Tropfen aus der Leiste auf die Form ziehen */
const fallenLassen = async (i, x, y, wo) => {
  const [tx, ty] = await tropfenBei(i);
  await s.mouse.move(tx, ty, { steps: 22 });
  await s.waitForTimeout(350);
  await s.mouse.down();
  await s.waitForTimeout(120);
  const n = 34;
  for (let k = 1; k <= n; k++) {
    // (ein weicher Bogen: langsam an, langsam aus)
    const u = k / n;
    const e = u * u * (3 - 2 * u);
    await s.mouse.move(tx + (x - tx) * e, ty + (y - ty) * e + 26 * Math.sin(Math.PI * u));
    await s.waitForTimeout(22);
  }
  await s.waitForTimeout(450);
  await s.mouse.up();
  await einlaufen(wo);
};
await s.waitForTimeout(500);
// 1  Blau antippen, den Farbtropfen wählen, in den Körper klicken
await tippen(...(await tropfenBei(5)));
await tippen(...(await knopfBei('Farbtropfen')));
await fuellen(612, 526, 'Körper, Blau, mit dem Farbtropfen');
// 2  Rot auf den runden Fleck ziehen, Gelb auf den eckigen
await fallenLassen(3, 478, 505, 'runder Fleck, Rot, gezogen');
await fallenLassen(1, 562, 318, 'eckiger Fleck, Gelb, gezogen');
// 3  die Pipette: das Rot aufnehmen, damit den Schnabel füllen
await tippen(...(await knopfBei('Pipette')));
await s.mouse.move(560, 430, { steps: 20 });
await s.waitForTimeout(500);
await s.mouse.move(478, 505, { steps: 16 });
await s.waitForTimeout(800);
await s.mouse.down();
await s.waitForTimeout(60);
await s.mouse.up();
await s.waitForTimeout(700);
{
  const L = await O('farbLinieImBild', 0);
  await fuellen(L.reduce((a, p) => a + p.x, 0) / L.length, L.reduce((a, p) => a + p.y, 0) / L.length, 'Schnabel, aufgenommenes Rot');
}
// 4  Farbe über Farbe: der helle Tropfen auf den runden Fleck
await fallenLassen(0, 478, 505, 'runder Fleck, hell über Rot');
// 5  ein wenig drehen und zurück
await s.mouse.move(1180, 760, { steps: 14 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 36; k++) {
  await s.mouse.move(1180 + 5.5 * k, 760 - 0.8 * k);
  await s.waitForTimeout(24);
}
await s.waitForTimeout(500);
for (let k = 36; k >= 0; k--) {
  await s.mouse.move(1180 + 5.5 * k, 760 - 0.8 * k);
  await s.waitForTimeout(24);
}
await s.mouse.up();
await s.waitForTimeout(900);
const f = await O('farbe');
const L = await O('farbLeiste');
console.log(`Ende: ${f.linien} Farblinien, ${f.fuellungen} Füllungen, ${f.fehl} ohne Weg; gewählt ${L.gewaehlt}, Werkzeug ${L.werkzeug}`);
await kontext.close();
const roh = fs.readdirSync(ordner).find((n) => n.endsWith('.webm'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, anfang - 0.1)), '-i', path.join(ordner, roh), '-vf', 'crop=1000:860:220:0,scale=1000:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-movflags', '+faststart', '-an', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`Film: ${ziel}`);
await browser.close();
