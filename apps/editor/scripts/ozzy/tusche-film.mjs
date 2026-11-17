// Film: Kante wie Tusche (S13, Idee 5, 17.11.2026), an „strange bird“ (NAME) in der eingerasteten Seite: einen Punkt wählen, K (die
// Linie wird von ihm aus dicker), K (sie zieht sich zu ihm zurück). Bild für Bild (60 je Sekunde), Ausschnitt um den Punkt, dann MP4;
// dazu die Messung: Mitten im Fließen ist die Linie nahe am Punkt schon weiter als an ihren fernen Enden (an und aus).
// Aufruf aus apps/editor, Ozzy auf 5205: [ZEITLUPE=3] node scripts/ozzy/tusche-film.mjs <ziel.mp4> [zusatz der Adresse, z. B. fluss=0]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/tusche.mp4';
const zusatz = process.argv[3] ? `&${process.argv[3]}` : '';
const NAME = process.env.NAME ?? 'strange bird';
const ZEITLUPE = Number(process.env.ZEITLUPE ?? 1);
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-tusche-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
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
const A = { id: 2, i: 1 };
const c = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
// wählen wie mit der Hand: erst darüber (der Zeiger gleitet hin), dann klicken
await s.mouse.move(c.x, c.y);
await s.waitForTimeout(400);
await s.mouse.down();
await s.waitForTimeout(60);
await s.mouse.up();
await s.waitForTimeout(300);
await ruhig();
await s.mouse.move(c.x + 260, c.y + 160);
await s.waitForTimeout(300);
await s.evaluate(() => window.__ozzy.film(true));
let nr = 0;
const bild = async () => {
  await s.evaluate((z) => window.__ozzy.bild(1 / 60 / z), ZEITLUPE);
  await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92, clip: { x: c.x - 300, y: c.y - 170, width: 600, height: 340 } });
};
const bilder = async (n) => {
  for (let i = 0; i < n; i++) await bild();
};
/** die Breite einer gemessenen Linie an der Stelle u (0 … 1 ihrer Länge) */
const breiteBei = (b, u) => {
  const s0 = u * b.laenge;
  for (let j = 1; j < b.s.length; j++) {
    if (s0 <= b.s[j]) {
      const a = (s0 - b.s[j - 1]) / Math.max(1e-9, b.s[j] - b.s[j - 1]);
      return b.halb[j - 1] + (b.halb[j] - b.halb[j - 1]) * a;
    }
  }
  return b.halb[b.halb.length - 1];
};
/** Fortschritt zwischen zwei Breiten, an 400 Stellen längs der Linie; nah und fern vom Punkt gemittelt */
const fortschritt = (alt, mitte, neu) => {
  const u0 = alt.stueckS[A.i] / alt.laenge;
  const naehe = [];
  const ferne = [];
  const stellen = [];
  let weit = 0;
  for (let k = 0; k < 400; k++) {
    const u = k / 400;
    const h0 = breiteBei(alt, u);
    const h1 = breiteBei(neu, u);
    const ab = Math.min(Math.abs(u - u0), 1 - Math.abs(u - u0));
    if (Math.abs(h1 - h0) > 1e-3) {
      weit = Math.max(weit, ab);
      stellen.push({ u, h0, h1, ab });
    }
  }
  for (const st of stellen) {
    const p = (breiteBei(mitte, st.u) - st.h0) / (st.h1 - st.h0);
    if (st.ab < 0.25 * weit) naehe.push(p);
    else if (st.ab > 0.75 * weit) ferne.push(p);
  }
  const m = (x) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN);
  return { naehe: m(naehe), ferne: m(ferne), zahl: stellen.length };
};
await bilder(12);
const b0 = await O('linienBreite', A.id, 'seite');
await s.keyboard.press('k');
const n1 = Math.round(0.12 * 60 * ZEITLUPE);
await bilder(n1);
const b1 = await O('linienBreite', A.id, 'seite');
await bilder(Math.round(0.8 * 60 * ZEITLUPE) - n1);
const b2 = await O('linienBreite', A.id, 'seite');
await s.keyboard.press('k');
await bilder(n1);
const b3 = await O('linienBreite', A.id, 'seite');
await bilder(Math.round(0.8 * 60 * ZEITLUPE) - n1);
const b4 = await O('linienBreite', A.id, 'seite');
await browser.close();
const an = fortschritt(b0, b1, b2);
const aus = fortschritt(b2, b3, b4);
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');
console.log(`${an.naehe > an.ferne + 0.2 ? 'gut ' : 'FEHL'} K an: nach 0,12 s nahe am Punkt ${z2(an.naehe)}, an den fernen Enden ${z2(an.ferne)} des Wegs (${an.zahl} Proben)`);
console.log(`${aus.ferne > aus.naehe + 0.2 ? 'gut ' : 'FEHL'} K aus: nach 0,12 s an den fernen Enden ${z2(aus.ferne)}, nahe am Punkt ${z2(aus.naehe)} des Wegs zurück`);
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-vf', 'scale=1200:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder, geschrieben: ${ziel}${fehler.length ? `; Fehler: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
