// Zahnfarbe (Phase 2 M4, Schritt 5): Rex, Stufe Zähne, Maul offen; Standard (Creme) und eine gewählte Farbe über den
// Farbwähler der Tafel, Bühne nah am Maul; Dokument (ausstattung.zahnFarbe), keine neue Ableitung, zurück zum Standard.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const FARBE = process.env.FARBE ?? '#d9b45a';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
await page.click('[data-pruefwesen="rex"]');
await page.waitForTimeout(3500);
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('zaehne');
  ui.setzeOeffnung(1);
  ui.setzeKamera({ azimut: (-60 * Math.PI) / 180, elevation: (25 * Math.PI) / 180, distanz: 0.55, ziel: [-0.24, 0.2, 0.05] });
});
await page.waitForTimeout(2500);
const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
const clip = { x: rc.x + rc.w * 0.2, y: rc.y + rc.h * 0.15, width: rc.w * 0.6, height: rc.h * 0.7 };
await page.screenshot({ path: resolve(AUSGABE, 'zahn-farbe-standard.png'), clip });
await page.evaluate((f) => {
  const el = document.querySelector('[data-zahn-farbe]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, f);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, FARBE);
await page.waitForTimeout(1500);
const st = await page.evaluate(() => ({ farbe: window.__stores.editor.getState().dok.ausstattung?.zahnFarbe, ableitung: window.__editor.wesen().ableitung, maul: !!window.__stores.editor.getState().dok.ausstattung?.maulLinie }));
console.log('Farbe gesetzt:', JSON.stringify(st));
await page.screenshot({ path: resolve(AUSGABE, 'zahn-farbe-gewaehlt.png'), clip });
await page.click('[data-zahn-farbe-standard]');
await page.waitForTimeout(1200);
console.log('Standard:', JSON.stringify(await page.evaluate(() => window.__stores.editor.getState().dok.ausstattung?.zahnFarbe ?? 'Creme')));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
