// Fressen-Tab im Editor prüfen (Plan 5.2, 14.10. spätnachts): Stufe „Posen & Leben“, Griffe in der Seite (Gelenk,
// Kieferlinie, Übergang) ziehen, Dokument und Bühne folgen live (ohne Umbau), Gewichte als Farbe. FALL aus
// pruefreihe.json (Standard kugel-gleich). Aufruf über run-check.sh; Bilder nach pruefen-ausgabe/kiefer-griffe-*.png.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const faelle = JSON.parse(readFileSync(resolve(AUSGABE, process.env.DATEI ?? 'pruefreihe.json'), 'utf-8'));
const FALL = process.env.FALL ?? 'kugel-gleich';
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text().slice(0, 200)); });
await page.goto(`${url}/?bauweise=kern&look=earle&palette=${process.env.PALETTE ?? 'blob'}`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate((d) => { const ui = window.__stores.ui.getState(); window.__stores.editor.getState().laden(d, null); ui.setzeEbene('posen'); ui.maximieren(null); ui.setzeOeffnung(0.6); }, faelle[FALL].dok);
await page.waitForTimeout(3000);
const stand = () => page.evaluate(() => ({ gelenk: window.__stores.editor.getState().dok.ausstattung?.maulOptionen?.gelenk ?? null, reichweite: window.__stores.editor.getState().dok.ausstattung?.maulOptionen?.kieferReichweite ?? null, winkel: window.__stores.editor.getState().dok.ausstattung?.maulOptionen?.kieferWinkel ?? null, ableitung: window.__editor.wesen?.()?.ableitung ?? null, farben: window.__editor.wesen?.()?.gewichtFarben ?? null, verlauf: window.__stores.editor.getState().verlauf.length }));
const griff = async (art) => {
  const el = await page.$(`[data-view="seite"] [data-kiefergriff="${art}"]`);
  if (!el) return null;
  const b = await el.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
console.log('Ebene da:', !!(await page.$('[data-view="seite"] [data-kiefer-ebene]')), 'Griffe:', JSON.stringify({ gelenk: await griff('gelenk'), weite: await griff('weite'), w1: await griff('w1'), w2: await griff('w2') }));
console.log('vorher', JSON.stringify(await stand()));
await page.screenshot({ path: `${AUSGABE}/kiefer-griffe-1-vorher.png` });
// Gelenk 40 px nach rechts (hinten) und 10 px nach oben ziehen, in Schritten (live)
const g = await griff('gelenk');
if (g) {
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  const zeiten = [];
  for (let i = 1; i <= 8; i++) {
    const t0 = Date.now();
    await page.mouse.move(g.x + 5 * i, g.y - 1.25 * i);
    await page.waitForTimeout(80);
    zeiten.push(Date.now() - t0);
  }
  const mitten = await stand();
  await page.mouse.up();
  await page.waitForTimeout(800);
  console.log('während des Zugs', JSON.stringify(mitten), 'nach dem Zug', JSON.stringify(await stand()));
  const netzGelenk = await page.evaluate(() => window.__editor.wesen?.()?.maul?.rig ?? null);
  console.log('Rig im Netz:', JSON.stringify(netzGelenk));
}
await page.screenshot({ path: `${AUSGABE}/kiefer-griffe-2-gelenk.png` });
// Kieferlinie 30 px nach außen
const w = await griff('weite');
if (w) {
  await page.mouse.move(w.x, w.y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(w.x, w.y + 5 * i); await page.waitForTimeout(60); }
  await page.mouse.up();
  await page.waitForTimeout(800);
  console.log('nach Kieferlinie', JSON.stringify(await stand()));
}
// Übergang: ersten Strahl 25 px nach unten, zweiten 25 px nach oben ziehen
for (const [art, dy] of [['w1', 25], ['w2', -25]]) {
  const q = await griff(art);
  if (!q) { console.log('kein Griff', art); continue; }
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) { await page.mouse.move(q.x, q.y + (dy * i) / 5); await page.waitForTimeout(60); }
  await page.mouse.up();
  await page.waitForTimeout(600);
  console.log('nach', art, JSON.stringify(await stand()));
}
// Undo: ein Schritt je Zug
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(600);
console.log('nach Undo', JSON.stringify(await stand()));
// Gewichte zeigen
await page.click('[data-gewichte-zeigen]');
await page.waitForTimeout(1500);
console.log('Gewichte an', JSON.stringify(await stand()));
await page.screenshot({ path: `${AUSGABE}/kiefer-griffe-3-gewichte.png` });
await page.evaluate(() => window.__stores.ui.getState().maximieren('creation'));
await page.waitForTimeout(800);
await page.evaluate(() => window.__stores.ui.getState().setzeKamera({ azimut: 0, elevation: -0.15, distanz: 1.0, ziel: [0, 0.2, 0.05] }));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${AUSGABE}/kiefer-griffe-4-gewichte-buehne.png` });
// eine Tafel mit zwei Abschnitten (Rig, Fressen); andere Stufen ohne Griffe und Farben
console.log('Abschnitte:', !!(await page.$('[data-bereich="rig"] [data-abschnitt="rig"]')), !!(await page.$('[data-bereich="fressen"] [data-abschnitt="fressen"]')));
await page.evaluate(() => { const ui = window.__stores.ui.getState(); ui.setzeEbene('maul'); ui.maximieren(null); });
await page.waitForTimeout(1200);
console.log('in Maul: Griffe', !!(await page.$('[data-view="seite"] [data-kiefergriff]')), 'Farben', JSON.stringify((await stand()).farben));
await page.evaluate(() => { const ui = window.__stores.ui.getState(); ui.setzeEbene('posen'); ui.maximieren(null); });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${AUSGABE}/kiefer-griffe-5-fressen.png` });
console.log('Fehler:', fehler.slice(0, 5));
await browser.close();
