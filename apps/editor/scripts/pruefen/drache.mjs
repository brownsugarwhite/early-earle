// Drache ohne Unterkiefer (Phase 2 M6, Schritt 3): Prüfwesen Drache mit Maul „hals“ (Kopf kippt 20° zurück, Hals zieht 0,7
// Maullängen), Öffnung 0/25/50/75/100 % von der Seite, offen schräg von vorn, neben `rex_dragon_big mouth`.
// Über run-check.sh (eigener Vite, 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
await page.click('[data-pruefwesen="drache"]');
await page.waitForTimeout(3500);
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('maul');
  ui.setzeBlinzeln(false);
  window.__stores.kernAnzeige.getState().setzeMaul('hals');
});
await page.waitForTimeout(3000);
const kamera = (k) =>
  page.evaluate((k) => {
    window.__stores.ui.getState().setzeKamera({ azimut: (k[0] * Math.PI) / 180, elevation: (k[1] * Math.PI) / 180, distanz: k[2], ziel: [k[3], k[4], k[5]] });
  }, k);
const stand = () =>
  page.evaluate(() => ({
    ecken: window.__editor.wesen().ecken,
    rundmaul: window.__stores.editor.getState().dok.ausstattung?.rundmaul ?? null,
    tafel: document.querySelector('[data-maul-art]')?.getAttribute('data-maul-art') ?? null,
  }));
const bilder = [];
const bild = async (text, aus = [0.2, 0.12, 0.6, 0.76]) => {
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x + r.w * aus[0], y: r.y + r.h * aus[1], width: r.w * aus[2], height: r.h * aus[3] } });
  bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text });
};
console.log('Drache:', JSON.stringify(await stand()));
for (const [o, kam, t] of [
  [0, [0, 4, 1.6, -0.1, 0.45, 0], 'zu · Seite'],
  [0.25, [0, 4, 1.6, -0.1, 0.45, 0], '25 % · Seite'],
  [0.5, [0, 4, 1.6, -0.1, 0.45, 0], '50 % · Seite'],
  [0.75, [0, 4, 1.6, -0.1, 0.45, 0], '75 % · Seite'],
  [1, [0, 4, 1.6, -0.1, 0.45, 0], 'offen · Seite'],
  [1, [-55, 8, 1.6, -0.1, 0.45, 0], 'offen · schräg vorn'],
  [1, [-90, 4, 1.6, -0.1, 0.45, 0], 'offen · vorn'],
  [0.5, [-55, 8, 1.6, -0.1, 0.45, 0], '50 % · schräg vorn'],
]) {
  await page.evaluate((o) => window.__stores.ui.getState().setzeOeffnung(o), o);
  await page.waitForTimeout(1800);
  await kamera(kam);
  await bild(`Drache · ${t}`, [0.15, 0.08, 0.7, 0.84]);
}
const ref = (p, h = 170) => (existsSync(resolve(WURZEL, p)) ? `<img src="data:image/png;base64,${readFileSync(resolve(WURZEL, p)).toString('base64')}" style="height:${h}px">` : '');
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1850px">
<div style="display:flex;gap:6px;padding:6px">${ref('ref/editor/creatures/rex_dragon_big mouth.png', 260)}</div>
<div style="display:grid;grid-template-columns:repeat(4,452px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:452px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'drache.html'), html);
await page.setViewportSize({ width: 1850, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'drache.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'drache.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
