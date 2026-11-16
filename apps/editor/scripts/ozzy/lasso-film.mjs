// Film: Lasso in Ozzy (S5 im Plan „wie es weitergeht“, 16.11.2026), an „strange bird“ (NAME). Echte Maus- und Tastenereignisse; Bild für
// Bild gerechnet (60 je Sekunde), dann mit ffmpeg zu MP4. Ablauf: 1 (Seite) · L · eine Schlinge um den Kopf (beim Loslassen schließt ein
// Tropfen die Naht, die Schlinge zieht sich zusammen) · ⇧ + Schlinge (dazu) · ⌥ + Schlinge (weg) · 0 (Raum) · eine Schlinge an der Wand
// der Seite (gewählt auf allen Wänden).
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/lasso-film.mjs [ziel.mp4]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/2026-11-16-lasso.mp4';
const NAME = process.env.NAME ?? 'strange bird';
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const DPR = Number(process.env.DPR ?? 1.5);
const B = 1440;
const H = 900;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-lasso-'));
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
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
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
/** eine Schlinge wie von Hand: Ellipse um (cx, cy), leicht wellig, offen zum Anfang hin; taste: Shift, Alt oder keine */
const schlinge = async (cx, cy, rx, ry, sek, taste = null) => {
  const w0 = -0.6;
  const start = [cx + rx * Math.cos(w0), cy + ry * Math.sin(w0)];
  await fahren(start, 0.35);
  if (taste) await s.keyboard.down(taste);
  await s.mouse.down();
  await bild();
  const n = Math.round(sek * 60);
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n);
    const w = w0 - t * 2 * Math.PI * 0.94;
    const welle = 1 + 0.05 * Math.sin(5 * w + 1.3);
    maus = [cx + rx * welle * Math.cos(w), cy + ry * welle * Math.sin(w)];
    await s.mouse.move(maus[0], maus[1]);
    await bild();
  }
  await s.mouse.up();
  if (taste) await s.keyboard.up(taste);
};
const kasten = (P) => {
  const xs = P.map((p) => p.x);
  const ys = P.map((p) => p.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};

await s.mouse.move(maus[0], maus[1]);
await warten(0.4);
await text('1 · Seite');
await s.keyboard.press('1');
await warten(1.4);
const P = (await O('netzPunkte')).filter((p) => p.sichtbar);
const k = kasten(P);
const bx = k.x1 - k.x0;
const by = k.y1 - k.y0;
await text('L · Lasso: Punkte umfahren');
await s.keyboard.press('l');
await warten(0.5);
await schlinge(k.x0 + 0.22 * bx, k.y0 + 0.5 * by, 0.3 * bx, 0.62 * by, 1.7);
await warten(1.3);
await text('⇧ + Schlinge: dazu');
await schlinge(k.x0 + 0.72 * bx, k.y0 + 0.62 * by, 0.33 * bx, 0.5 * by, 1.5, 'Shift');
await warten(1.1);
await text('⌥ + Schlinge: weg');
await schlinge(k.x0 + 0.55 * bx, k.y0 + 0.12 * by, 0.2 * bx, 0.3 * by, 1.2, 'Alt');
await warten(1.1);
await text('0 · Raum: an der Wand der Seite');
await s.keyboard.press('0');
await warten(1.6);
const Q = (await O('netzPunkte')).filter((p) => p.sichtbar && p.a === 'seite');
const q = kasten(Q);
await schlinge((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, 0.62 * (q.x1 - q.x0) + 10, 0.66 * (q.y1 - q.y0) + 10, 1.7);
await text('gewählt auf allen Wänden');
await warten(1.6);

await browser.close();
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-vf', `scale=${B}:${H}:flags=lanczos`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder, geschrieben: ${ziel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
