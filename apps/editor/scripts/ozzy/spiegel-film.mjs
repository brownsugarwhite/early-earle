// Film zum Spiegel-Knopf (Plan „Objekte, Spiegel und Nähte“, Etappe 2, 18.11.2026), in echter Zeit aufgenommen: eine frische Kugel
// mit drei Linien; Spiegel aus (sie wird ganz und frei), ein Punkt nur auf einer Seite hinausgezogen; V, mit G und Z zur Seite
// geschoben; Spiegel an (das Spiegelbild steht gegenüber); zurück an die Ebene geschoben (die beiden überragen sich); Clipping (die
// Überschneidung zieht sich in die Ebene zurück, die Naht steht); K macht sie rund.
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html node scripts/ozzy/spiegel-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GPU_ARGS, kugelMitRingen, punktAnDerWandZiehen, seitenPunkt } from '../pruefen/ozzy-teile.mjs';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/spiegel.mp4';
const URL = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-spiegel-film-'));
const browser = await chromium.launch({ args: GPU_ARGS });
const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: ordner, size: { width: 1440, height: 900 } } });
const s = await kontext.newPage();
const t0 = Date.now();
await s.goto(`${URL}?ohneLinie=0`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const still = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => !window.__ozzy.werk().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: 90000 });
  await s.waitForTimeout(250);
};
const ruhig = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: 90000 });
  await s.waitForTimeout(250);
};
const geladen = async () => {
  await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
  await ruhig();
};
const klick = async (x, y) => {
  await s.mouse.move(x, y, { steps: 12 });
  await s.waitForTimeout(350);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
const t = { s, O, geladen, ruhig, klick };
await kugelMitRingen(t);
const anfang = (Date.now() - t0) / 1000;
const knopf = async (z) => {
  const b = await s.locator(`#spiegel [data-zustand="${z}"]`).boundingBox();
  await klick(b.x + b.width / 2, b.y + b.height / 2);
};
/** das Objekt mit G längs Z schieben: um dz (Einheiten des Werks), geführt längs der Richtung von Z im Bild */
const schieben = async (dz) => {
  const m = (await O('objekt')).mitte;
  const a = await O('werkImBild', m);
  const b = await O('werkImBild', { x: m.x, y: m.y, z: m.z + dz });
  await s.mouse.move(a.x, a.y, { steps: 14 });
  await s.waitForTimeout(350);
  await s.keyboard.press('g');
  await s.keyboard.press('z');
  // (der Weg im Bild ist nicht genau der im Werk: so weit, bis die Mitte dort liegt)
  for (let k = 1; k <= 30; k++) {
    await s.mouse.move(a.x + ((b.x - a.x) * k) / 30, a.y + ((b.y - a.y) * k) / 30);
    await s.waitForTimeout(28);
  }
  await s.waitForTimeout(350);
  await s.keyboard.press('Enter');
  await still();
};
await s.waitForTimeout(700);
// ---------- aus: die Form wird ganz und frei; ein Punkt nur auf einer Seite hinaus ----------
await knopf('aus');
await ruhig();
await s.waitForTimeout(500);
const vorn = await seitenPunkt(t, 1);
await punktAnDerWandZiehen(t, vorn, vorn.z + 70, { halten: 300 });
await ruhig();
await s.waitForTimeout(600);
// ---------- V: zur Seite, Spiegel an, zurück an die Ebene ----------
await s.keyboard.press('v');
await s.waitForTimeout(300);
await schieben(230);
await s.waitForTimeout(500);
await knopf('an');
await s.waitForTimeout(1100);
await schieben(-170);
await s.waitForTimeout(700);
// ---------- Clipping: die Fahrt, dann die Naht; K macht sie rund ----------
await knopf('clip');
await s.waitForTimeout(900);
await still();
await s.waitForTimeout(900);
await s.keyboard.press('a');
await s.waitForTimeout(400);
await s.keyboard.press('k');
await ruhig();
await s.waitForTimeout(1500);
const stand = await O('spiegel');
const w = await O('werk');
console.log(`Ende: ${stand.zustand}, frei ${stand.frei}, umgeschlagen ${w.umgeschlagen}, ${w.punkte} Punkte`);
await kontext.close();
const roh = fs.readdirSync(ordner).find((n) => n.endsWith('.webm'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, anfang - 0.3)), '-i', path.join(ordner, roh), '-vf', 'crop=1000:700:220:100,scale=1000:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`Film: ${ziel}`);
await browser.close();
