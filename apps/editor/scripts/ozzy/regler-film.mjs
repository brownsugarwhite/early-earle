// Film und Messung: Regler als Tropfen auf einem Faden (S13, Idee 2, 17.11.2026): Menü auf, einen Regler schnell hin und her ziehen,
// loslassen. In echter Zeit aufgenommen (der Knopf hat seine eigene Feder), Ausschnitt um den Regler; gemessen wird die Dehnung des Knopfs
// je Bild: beim Ziehen deutlich gedehnt, nach dem Loslassen schwingt er unter 1 nach und kommt zur Ruhe.
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/regler-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/regler.mp4';
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-regler-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const kontext = await browser.newContext({ viewport: { width: 720, height: 600 }, deviceScaleFactor: 2, recordVideo: { dir: ordner, size: { width: 720, height: 600 } } });
const s = await kontext.newPage();
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
await s.goto(URL);
await s.waitForFunction(() => !!window.__ozzy);
await s.waitForTimeout(600);
await s.click('#marke');
await s.waitForTimeout(700);
// die erste Gruppe mit Reglern aufklappen
const sel = await s.evaluate(() => {
  for (const d of document.querySelectorAll('#regler details')) {
    const r = d.querySelector('input[type="range"]');
    if (r && d.id !== 'laden' && d.id !== 'sichern') {
      d.open = true;
      r.id = r.id || 'probe-regler';
      return `#${r.id}`;
    }
  }
  return null;
});
await s.waitForTimeout(500);
const box = await s.locator(sel).boundingBox();
const startWert = await s.locator(sel).inputValue();
const messung = s.evaluate(
  (q) =>
    new Promise((fertig) => {
      const werte = [];
      const t0 = performance.now();
      const f = () => {
        werte.push([Math.round(performance.now() - t0), window.__ozzy.reglerDehnung(q)]);
        if (performance.now() - t0 < 2600) requestAnimationFrame(f);
        else fertig(werte);
      };
      requestAnimationFrame(f);
    }),
  sel,
);
const y = box.y + box.height / 2;
const mitte = box.x + box.width / 2;
await s.mouse.move(mitte, y);
await s.waitForTimeout(250);
await s.mouse.down();
for (let k = 0; k <= 30; k++) {
  await s.mouse.move(mitte + 0.4 * box.width * Math.sin((k / 30) * 2 * Math.PI), y);
  await s.waitForTimeout(16);
}
await s.mouse.up();
const werte = await messung;
await s.waitForTimeout(400);
// den Wert zurück (nichts soll sich am Menü ändern)
await s.evaluate(([q, v]) => {
  const el = document.querySelector(q);
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, [sel, startWert]);
await kontext.close();
await browser.close();
const max = Math.max(...werte.map((w) => w[1]));
const min = Math.min(...werte.map((w) => w[1]));
const ende = werte[werte.length - 1][1];
const z2 = (x) => x.toFixed(2).replace('.', ',');
console.log(`${max > 1.2 ? 'gut ' : 'FEHL'} beim Ziehen gedehnt: bis ${z2(max)}`);
console.log(`${min < 0.97 ? 'gut ' : 'FEHL'} losgelassen schwingt er nach: bis ${z2(min)}`);
console.log(`${Math.abs(ende - 1) < 0.01 ? 'gut ' : 'FEHL'} am Ende rund: ${z2(ende)}`);
const video = fs.readdirSync(ordner).find((f) => f.endsWith('.webm'));
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(ordner, video), '-vf', `crop=320:200:0:${Math.max(0, Math.round(y - 100))},scale=960:-2:flags=lanczos`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`Regler ${sel}, geschrieben: ${ziel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
