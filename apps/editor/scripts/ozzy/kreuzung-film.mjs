// Film: neue Kreuzungen verschmelzen (S13, Idee 4, 17.11.2026), an „strange bird“ (NAME) in der eingerasteten Seite: P, zwei Klicks
// im Leeren quer über die Form, ↩. Das Werk legt einen Loop rundum an, wo er andere kreuzt, fließen Tropfen zusammen. Bild für Bild (60
// je Sekunde), Ausschnitt um die Form, dann MP4. Gibt dazu aus, wie viele Kreuzungen neu sind und wie viele Tropfen fließen.
// Aufruf aus apps/editor, Ozzy auf 5205: [ZEITLUPE=3] node scripts/ozzy/kreuzung-film.mjs <ziel.mp4> [zusatz der Adresse, z. B. fluss=0]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/kreuzung.mp4';
const zusatz = process.argv[3] ? `&${process.argv[3]}` : '';
const NAME = process.env.NAME ?? 'strange bird';
const ZEITLUPE = Number(process.env.ZEITLUPE ?? 1);
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-kreuzung-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
await s.goto(`${URL}?form=${encodeURIComponent(NAME)}${zusatz}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 60000 });
  await s.waitForTimeout(200);
};
await ruhig();
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
// die Gerade: in der größten Lücke der Punkte, in der mittleren Hälfte der Höhe (wie die Probe zu S8)
const P = (await O('netzPunkte')).filter((p) => p.sichtbar);
const xs = P.map((p) => p.x);
const ys = P.map((p) => p.y).sort((a, b) => a - b);
const x0 = Math.min(...xs);
const x1 = Math.max(...xs);
const q1 = ys[Math.floor(ys.length * 0.25)];
const q3 = ys[Math.floor(ys.length * 0.75)];
let y = (q1 + q3) / 2;
let best = -1;
for (let i = 0; i + 1 < ys.length; i++) {
  const c = (ys[i] + ys[i + 1]) / 2;
  if (c < q1 || c > q3) continue;
  if (ys[i + 1] - ys[i] > best) {
    best = ys[i + 1] - ys[i];
    y = c;
  }
}
const klick = async (x, yy) => {
  await s.mouse.move(x, yy);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
await s.keyboard.press('p');
await s.waitForTimeout(300);
await klick(x0 - 70, y);
await klick(x1 + 70, y);
await s.mouse.move(x1 + 160, y + 120);
await s.waitForTimeout(300);
await s.evaluate(() => window.__ozzy.film(true));
const clip = { x: x0 - 120, y: Math.min(...ys) - 80, width: x1 - x0 + 240, height: Math.max(...ys) - Math.min(...ys) + 160 };
let nr = 0;
let tropfenMax = 0;
const bilder = async (n) => {
  for (let i = 0; i < n; i++) {
    await s.evaluate((z) => window.__ozzy.bild(1 / 60 / z), ZEITLUPE);
    tropfenMax = Math.max(tropfenMax, await s.evaluate(() => window.__ozzy.verschmelzen()));
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92, clip });
  }
};
const k0 = (await O('werkLinienDaten')).flatMap((l) => l.punkte.filter((p) => p.kreuzung !== null).map((p) => p.kreuzung));
await bilder(10);
await s.keyboard.press('Enter');
await bilder(Math.round(0.9 * 60 * ZEITLUPE));
// das Werk rechnet in der Zeit des Browsers weiter: warten, bis es fertig ist, dann noch einmal so lang
await s.evaluate(() => window.__ozzy.film(false));
await ruhig();
await s.evaluate(() => window.__ozzy.film(true));
await bilder(Math.round(0.9 * 60 * ZEITLUPE));
const k1 = (await O('werkLinienDaten')).flatMap((l) => l.punkte.filter((p) => p.kreuzung !== null).map((p) => p.kreuzung));
await browser.close();
const neu = new Set(k1.filter((k) => !k0.includes(k)));
console.log(`neue Kreuzungen ${neu.size}, höchstens ${tropfenMax} Tropfen zugleich`);
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-vf', 'scale=1200:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder, geschrieben: ${ziel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
