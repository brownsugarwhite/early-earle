// Knochen der Fressen-Pose im Editor prüfen (Florian 14.10.: „Bones selbst bewegen und rotieren statt mit Reglern“):
// Stufe „Posen & Leben“, Unterkiefer an der Spitze drehen und an der Mitte ziehen, Schädel drehen; Werte, Öffnung,
// Undo, Bilder. FALL aus pruefreihe.json (Standard kugel-gleich). Aufruf über run-check.sh.
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
await page.evaluate((d) => { const ui = window.__stores.ui.getState(); window.__stores.editor.getState().laden(d, null); ui.setzeEbene('posen'); ui.maximieren(null); ui.setzeOeffnung(0.3); }, faelle[FALL].dok);
await page.waitForTimeout(3000);
const stand = () => page.evaluate(() => { const mo = window.__stores.editor.getState().dok.ausstattung?.maulOptionen ?? {}; return { unten: mo.winkelUnten ?? null, oben: mo.winkelOben ?? null, zug: mo.kieferZug ?? null, oeffnung: window.__stores.ui.getState().oeffnung, ableitung: window.__editor.wesen?.()?.ableitung ?? null, verlauf: window.__stores.editor.getState().verlauf.length, knochen: window.__editor.wesen?.()?.maul?.knochen ?? null }; });
const griff = async (art) => {
  const el = await page.$(`[data-view="seite"] [data-kiefergriff="${art}"]`);
  if (!el) return null;
  const b = await el.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const ziehen = async (art, dx, dy) => {
  const q = await griff(art);
  if (!q) { console.log('kein Griff', art); return; }
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(q.x + (dx * i) / 8, q.y + (dy * i) / 8); await page.waitForTimeout(60); }
  await page.mouse.up();
  await page.waitForTimeout(900);
  console.log(`nach ${art}`, JSON.stringify(await stand()));
};
console.log('Griffe', JSON.stringify({ dreh: await griff('kiefer-dreh'), zug: await griff('kiefer-zug'), schaedel: await griff('schaedel-dreh') }));
console.log('vorher', JSON.stringify(await stand()));
await page.screenshot({ path: `${AUSGABE}/knochen-1-vorher.png` });
await ziehen('kiefer-dreh', 0, 60);
await page.screenshot({ path: `${AUSGABE}/knochen-2-gedreht.png` });
await ziehen('kiefer-zug', -30, 0);
await ziehen('schaedel-dreh', 0, -40);
await page.screenshot({ path: `${AUSGABE}/knochen-3-schaedel.png` });
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(600);
console.log('nach Undo', JSON.stringify(await stand()));
await page.evaluate(() => window.__stores.ui.getState().maximieren('creation'));
await page.waitForTimeout(800);
await page.evaluate(() => window.__stores.ui.getState().setzeKamera({ azimut: -0.6, elevation: -0.15, distanz: 1.6, ziel: [-0.05, 0.22, 0] }));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${AUSGABE}/knochen-4-buehne.png` });
console.log('Fehler:', fehler.slice(0, 5));
await browser.close();
