// Film zum Paint-Modus, Etappe 4 (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 15): weiche Kanten, Fassung 1 (der
// Tropfen am Faden). In echter Zeit aufgenommen, an Florians Form „strange bird“ auf Wachs, von der Seite, derselbe Fleck wie im
// Bildblatt der Bedienung. Vorbereitet (nicht im Film): der Fleck (eine Farblinie mit vier Punkten), Körper blau, Fleck hell. Im Film:
//   1  einen Punkt wählen: Quer zur Farblinie sitzt ein hohler Tropfen an einem Faden
//   2  den Tropfen wegziehen: Die Kante wird dort weich, so weit wie der Faden; zu den Nachbarpunkten läuft der Verlauf aus
//   3  ebenso am Punkt oben (weiter) und am Punkt links (ein wenig): oben breit, unten hart
//   4  alle Punkte wählen: ] macht den Verlauf breiter, [ schmaler, K schaltet hart und wieder weich
//   5  einen Tropfen zurückschieben: Dort ist die Kante wieder hart
//   6  den Paint-Modus verlassen (B): das Ergebnis ohne Farblinien; ein wenig drehen
// Tasten zeigt der Film als kleines Feld unten (im Fenster gibt es das nicht).
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-weich-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GPU_ARGS } from '../pruefen/ozzy-teile.mjs';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/2026-11-19-paint-etappe-4.mp4';
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const KOERPER = [0x3f / 255, 0x7f / 255, 0xd0 / 255];
const FLECK = [0xfb / 255, 0xf6 / 255, 0xea / 255];
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-paint-film-'));
const browser = await chromium.launch({ args: GPU_ARGS });
// (aufgenommen wird in CSS-Pixeln, gleich wie dicht die Pixel sind; die Dichte 2 hält den Blick wie im Bildblatt)
const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, recordVideo: { dir: ordner, size: { width: 1440, height: 900 } } });
const s = await kontext.newPage();
const t0 = Date.now();
await s.goto(`${URL}?form=${encodeURIComponent('strange bird')}&material=wachs&fuellen=0`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
await s.waitForTimeout(2500);
const klick = async (x, y, schritte = 18, vor = 350) => {
  await s.mouse.move(x, y, { steps: schritte });
  await s.waitForTimeout(vor);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(300);
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
// ---------- vorbereiten ----------
await O('blickSetzen', { gier: -0.62, neigung: 0, zoom: 4 });
await s.waitForTimeout(1500);
await s.keyboard.press('b');
await s.waitForTimeout(700);
await s.keyboard.press('p');
await s.waitForTimeout(400);
const q = { x: 530, y: 510 };
const r = 64;
for (let i = 0; i < 4; i++) {
  const w = (Math.PI / 2) * i - 0.4;
  await zieh(q.x + r * Math.cos(w), q.y + 1.15 * r * Math.sin(w), -0.55 * r * Math.sin(w), 0.63 * r * Math.cos(w));
}
await klick(q.x + r * Math.cos(-0.4), q.y + 1.15 * r * Math.sin(-0.4), 4, 250);
await s.waitForTimeout(400);
await s.keyboard.press('a');
await s.waitForTimeout(400);
{
  const f = await O('farbe');
  if (f.linien !== 1) throw new Error(`Vorbereitung: ${f.linien} Farblinien (erwartet 1)`);
}
await O('farbFuellen', q.x + 1.9 * r, q.y + 0.3 * r, KOERPER);
await O('farbFuellen', q.x, q.y, FLECK);
// das Feld für die Tasten (nur im Film)
await s.evaluate(() => {
  const z = document.createElement('div');
  z.id = 'film-taste';
  Object.assign(z.style, {
    position: 'fixed',
    left: '530px',
    top: '712px',
    transform: 'translateX(-50%)',
    padding: '5px 13px 6px',
    border: '0.5px solid rgba(31,26,23,0.5)',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.94)',
    font: '500 15px -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif',
    color: '#1f1a17',
    zIndex: '9',
    opacity: '0',
    transition: 'opacity 160ms ease',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  });
  document.body.append(z);
  window.__taste = (text, ms = 1100) => {
    z.textContent = text;
    z.style.opacity = '1';
    clearTimeout(window.__tasteZeit);
    window.__tasteZeit = setTimeout(() => (z.style.opacity = '0'), ms);
  };
});
const taste = async (k, text, danach = 900) => {
  await s.evaluate((x) => window.__taste(x), text);
  await s.waitForTimeout(250);
  await s.keyboard.press(k);
  await s.waitForTimeout(danach);
};
await s.mouse.move(760, 640, { steps: 6 });
await s.waitForTimeout(700);
// ---------- der Film ----------
const anfang = (Date.now() - t0) / 1000;
const punkte = async () => (await O('farbPunkte', 0)).punkte;
/** den Tropfen des gewählten Punkts greifen und längs seines Fadens ziehen (Pixel; negativ: zur Farblinie zurück) */
const tropfenZiehen = async (weit, schritte = 34) => {
  const g = (await O('farbWeichGriffe'))[0];
  const lang = Math.hypot(g.gx - g.x, g.gy - g.y);
  const [ux, uy] = [(g.gx - g.x) / lang, (g.gy - g.y) / lang];
  const [x0, y0] = [g.gx + ux * 4, g.gy + uy * 4];
  await s.mouse.move(x0, y0, { steps: 14 });
  await s.waitForTimeout(450);
  await s.mouse.down();
  await s.waitForTimeout(150);
  for (let k = 1; k <= schritte; k++) {
    // (langsam an, langsam aus)
    const u = k / schritte;
    const e = u * u * (3 - 2 * u);
    await s.mouse.move(x0 + ux * weit * e, y0 + uy * weit * e);
    await s.waitForTimeout(26);
  }
  await s.waitForTimeout(450);
  await s.mouse.up();
  await s.waitForTimeout(500);
};
await s.waitForTimeout(400);
// 1, 2  der Punkt rechts oben: wählen, den Tropfen wegziehen
let P = await punkte();
await klick(P[0].x, P[0].y, 26, 500);
await s.waitForTimeout(700);
await tropfenZiehen(30);
// 3  der Punkt oben (weiter), der Punkt links (ein wenig)
await klick(P[3].x, P[3].y, 22, 400);
await s.waitForTimeout(300);
await tropfenZiehen(44);
await klick(P[2].x, P[2].y, 22, 400);
await s.waitForTimeout(300);
await tropfenZiehen(12, 20);
await s.mouse.move(760, 640, { steps: 16 });
await s.waitForTimeout(900);
// 4  alle Punkte: breiter, schmaler, hart, weich
await taste('Meta+a', '⌘A  alle Punkte', 1000);
await taste(']', ']  breiter', 700);
await taste(']', ']  breiter', 1000);
await taste('[', '[  schmaler', 700);
await taste('[', '[  schmaler', 1000);
await taste('k', 'K  hart', 1300);
await taste('k', 'K  weich', 1500);
// 5  den Tropfen unten zurückschieben: Dort ist die Kante wieder hart
P = await punkte();
await s.keyboard.press('Escape');
await s.waitForTimeout(300);
await klick(P[1].x, P[1].y, 22, 400);
await s.waitForTimeout(300);
{
  const g = (await O('farbWeichGriffe'))[0];
  await tropfenZiehen(-(Math.hypot(g.gx - g.x, g.gy - g.y) - 1), 26);
}
await s.mouse.move(760, 640, { steps: 16 });
await s.waitForTimeout(700);
// 6  ohne Farblinien, ein wenig drehen und zurück
await taste('Escape', 'Esc', 500);
await taste('b', 'B  zurück zur Form', 1300);
await s.mouse.move(800, 690, { steps: 12 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 40; k++) {
  await s.mouse.move(800 + 3.2 * k, 690 - 0.4 * k);
  await s.waitForTimeout(24);
}
await s.waitForTimeout(600);
for (let k = 40; k >= 0; k--) {
  await s.mouse.move(800 + 3.2 * k, 690 - 0.4 * k);
  await s.waitForTimeout(24);
}
await s.waitForTimeout(500);
await s.mouse.up();
await s.waitForTimeout(900);
console.log(`Ende: Breiten ${(await punkte()).map((x) => x.breite.toFixed(1)).join(' ')}`);
await kontext.close();
const roh = fs.readdirSync(ordner).find((n) => n.endsWith('.webm'));
// der Ausschnitt um den Fleck (560 × 480 Pixel), auf 1000 Pixel Breite vergrößert
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, anfang - 0.1)), '-i', path.join(ordner, roh), '-vf', 'crop=560:480:250:270,scale=1000:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-movflags', '+faststart', '-an', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`Film: ${ziel}`);
await browser.close();
