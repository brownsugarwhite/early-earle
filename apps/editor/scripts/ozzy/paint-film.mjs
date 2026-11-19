// Film zum Paint-Modus, Etappe 1 (Plan docs/plans/2026-11-19-ozzy-paint-modus.md), in echter Zeit aufgenommen: eine frische Kugel
// mit drei Linien auf Wachs; B schaltet den Paint-Modus; mit P an der Wand der Seite eine Farblinie gezeichnet, ein Klick füllt;
// eine zweite mit der Ellipse, in einer zweiten Farbe gefüllt; gedreht und herangezoomt (die Kante); B zurück zur Form, ein Punkt
// hinausgezogen (die Bemalung geht mit), ⌘Z; zum Schluss das helle Solid.
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GPU_ARGS, kugelMitRingen, seitenPunkt } from '../pruefen/ozzy-teile.mjs';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/2026-11-19-paint-etappe-1.mp4';
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-paint-film-'));
const browser = await chromium.launch({ args: GPU_ARGS });
const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: ordner, size: { width: 1440, height: 900 } } });
const s = await kontext.newPage();
const t0 = Date.now();
await s.goto(`${URL}?ohneLinie=0&material=wachs`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: 90000 });
  await s.waitForTimeout(250);
};
const geladen = async () => {
  await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
  await ruhig();
};
const klick = async (x, y, schritte = 14) => {
  await s.mouse.move(x, y, { steps: schritte });
  await s.waitForTimeout(320);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
const t = { s, O, geladen, ruhig, klick };
await kugelMitRingen(t);
if ((await O('werk')).auswahl !== '') {
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
}
await s.mouse.move(420, 700, { steps: 8 });
const anfang = (Date.now() - t0) / 1000;
await s.waitForTimeout(900);

// ---------- B: der Paint-Modus; P zeichnet an der Wand der Seite eine Farblinie ----------
await s.keyboard.press('b');
await s.waitForTimeout(900);
await s.keyboard.press('p');
await s.waitForTimeout(400);
const an = async (X, Y) => {
  const q = await O('flaecheHin', 'seite', X, Y);
  return [q.x, q.y];
};
// eine runde Form vorn auf der Kugel (acht Klicks, auf dem ersten geschlossen), mit Abstand zu den Linien der Form
const A = [];
for (let i = 0; i < 8; i++) A.push(await an(66 + 40 * Math.cos((i * Math.PI) / 4), -46 + 34 * Math.sin((i * Math.PI) / 4)));
for (const [x, y] of [...A, A[0]]) await klick(x, y, 9);
await s.waitForTimeout(700);
await s.keyboard.press('a');
await s.waitForTimeout(300);
/** in die Mitte der Farblinie `nr` klicken (nicht auf den Griff der Raumecke, der hinter der Form liegt) */
const ECKE = [685, 545];
const fuellen = async (nr) => {
  const P = await O('farbLinieImBild', nr);
  let mx = P.reduce((a, p) => a + p.x, 0) / P.length;
  let my = P.reduce((a, p) => a + p.y, 0) / P.length;
  if (Math.hypot(mx - ECKE[0], my - ECKE[1]) < 36) {
    // von der Ecke weg, auf den Ort der Farblinie zu, der am weitesten von ihr liegt (noch innerhalb der Farblinie)
    const fern = P.reduce((a, p) => (Math.hypot(p.x - ECKE[0], p.y - ECKE[1]) > Math.hypot(a.x - ECKE[0], a.y - ECKE[1]) ? p : a), P[0]);
    mx += 0.5 * (fern.x - mx);
    my += 0.5 * (fern.y - my);
  }
  await klick(mx, my);
};
await fuellen(0);
await s.waitForTimeout(900);

// ---------- eine zweite Farblinie mit der Ellipse, in einer zweiten Farbe ----------
await s.keyboard.press('e');
await s.waitForTimeout(400);
const e0 = await an(-38, -66);
const e1 = await an(8, -24);
await s.mouse.move(e0[0], e0[1], { steps: 12 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 16; k++) {
  await s.mouse.move(e0[0] + ((e1[0] - e0[0]) * k) / 16, e0[1] + ((e1[1] - e0[1]) * k) / 16);
  await s.waitForTimeout(24);
}
await s.waitForTimeout(200);
await s.mouse.up();
await s.waitForTimeout(700);
await s.keyboard.press('a');
await s.waitForTimeout(300);
await s.evaluate(() => {
  const f = document.getElementById('farbe-farbe');
  f.value = '#2f8fd0';
  f.dispatchEvent(new Event('input', { bubbles: true }));
  f.dispatchEvent(new Event('change', { bubbles: true }));
});
await s.waitForTimeout(500);
await fuellen(1);
await s.waitForTimeout(1000);

// ---------- drehen und heranzoomen: Die Bemalung sitzt, die Kante bleibt scharf ----------
await s.mouse.move(1180, 640, { steps: 12 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 36; k++) {
  await s.mouse.move(1180 - 4 * k, 640 - 1.2 * k);
  await s.waitForTimeout(22);
}
for (let k = 36; k >= 0; k--) {
  await s.mouse.move(1180 - 4 * k, 640 - 1.2 * k);
  await s.waitForTimeout(22);
}
await s.mouse.up();
await s.waitForTimeout(700);
await s.keyboard.press('Home');
await s.waitForTimeout(900);
const Z = await O('farbLinieImBild', 0);
const zx = Z.reduce((a, p) => a + p.x, 0) / Z.length;
const zy = Math.min(...Z.map((p) => p.y));
await s.mouse.move(zx, zy, { steps: 12 });
await s.waitForTimeout(300);
for (let k = 0; k < 18; k++) {
  await s.mouse.wheel(0, -100);
  await s.waitForTimeout(45);
}
await s.waitForTimeout(1600);
for (let k = 0; k < 18; k++) {
  await s.mouse.wheel(0, 100);
  await s.waitForTimeout(45);
}
await s.waitForTimeout(500);
await s.keyboard.press('Home');
await s.waitForTimeout(900);

// ---------- B: zurück zur Form; ein Punkt wird hinausgezogen, die Bemalung geht mit; ⌘Z ----------
await s.keyboard.press('b');
await s.waitForTimeout(800);
if ((await O('werk')).auswahl !== '') {
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
}
const p = await seitenPunkt(t, 1);
const a = (await O('ankerImBild', p.id, p.i, 'top')).filter((x) => !x.m && x.sichtbar)[0];
const zielOrt = await O('flaecheHin', 'top', p.x, p.z + 60);
await s.mouse.move(a.x, a.y, { steps: 16 });
await s.waitForTimeout(450);
await s.mouse.down();
for (let k = 1; k <= 50; k++) {
  await s.mouse.move(a.x + ((zielOrt.x - a.x) * k) / 50, a.y + ((zielOrt.y - a.y) * k) / 50);
  await s.waitForTimeout(24);
}
await s.waitForTimeout(700);
await s.mouse.up();
await ruhig();
await s.mouse.move(420, 700, { steps: 10 });
await s.waitForTimeout(1300);
await s.keyboard.press('Meta+z');
await s.waitForTimeout(1500);

// ---------- das helle Solid ----------
await O('material', 'Helles Solid');
await s.waitForTimeout(2600);
const f = await O('farbe');
console.log(`Ende: ${f.linien} Farblinien, ${f.fuellungen} Füllungen, ${f.fehl} ohne Weg`);
await kontext.close();
const roh = fs.readdirSync(ordner).find((n) => n.endsWith('.webm'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, anfang - 0.2)), '-i', path.join(ordner, roh), '-vf', 'crop=1040:780:220:80,scale=1040:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', '-an', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`Film: ${ziel}`);
await browser.close();
