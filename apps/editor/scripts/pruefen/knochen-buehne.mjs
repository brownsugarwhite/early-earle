// Gelenk und Knochen auf der Bühne prüfen (Plan 5.2: Gelenk als Griff im 3D): Stufe „Posen & Leben“, Layout Bühne,
// Seitenblick und Schrägblick; Kieferspitze drehen, Mitte ziehen, Schädel drehen, Gelenk verschieben; Hover-Zeiger,
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
await page.evaluate((d) => { const ui = window.__stores.ui.getState(); window.__stores.editor.getState().laden(d, null); ui.setzeEbene('posen'); ui.maximieren('creation'); ui.setzeOeffnung(0.6); }, faelle[FALL].dok);
await page.waitForTimeout(2500);
const kamera = async (k) => { await page.evaluate((k) => window.__stores.ui.getState().setzeKamera(k), k); await page.waitForTimeout(1000); };
const stand = () => page.evaluate(() => { const mo = window.__stores.editor.getState().dok.ausstattung?.maulOptionen ?? {}; return { gelenk: mo.gelenk ?? null, unten: mo.winkelUnten ?? null, oben: mo.winkelOben ?? null, zug: mo.kieferZug ?? null, oeffnung: window.__stores.ui.getState().oeffnung, ableitung: window.__editor.wesen?.()?.ableitung ?? null, verlauf: window.__stores.editor.getState().verlauf.length }; });
const griffe = async () => {
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const g = await page.evaluate(() => window.__editor.knochen?.() ?? []);
  return Object.fromEntries(g.map((x) => [x.art, { x: rc.x + x.px, y: rc.y + x.py }]));
};
const ziehen = async (art, dx, dy) => {
  const q = (await griffe())[art];
  if (!q) { console.log('kein Griff auf der Bühne', art); return; }
  await page.mouse.move(q.x, q.y);
  await page.waitForTimeout(150);
  const zeiger = await page.evaluate(() => document.querySelector('.steuerung3d')?.style.cursor ?? '');
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(q.x + (dx * i) / 8, q.y + (dy * i) / 8); await page.waitForTimeout(60); }
  await page.mouse.up();
  await page.waitForTimeout(900);
  console.log(`nach ${art} (Zeiger ${zeiger})`, JSON.stringify(await stand()));
};
await kamera({ azimut: 0, elevation: 0, distanz: 1.6, ziel: [0, 0.22, 0] });
console.log('Griffe Seitenblick', JSON.stringify(await griffe()));
console.log('vorher', JSON.stringify(await stand()));
await page.screenshot({ path: `${AUSGABE}/knochen-buehne-1-vorher.png` });
await ziehen('kiefer-dreh', 0, 50);
await ziehen('kiefer-zug', -25, 0);
await ziehen('schaedel-dreh', 0, -30);
await ziehen('gelenk', 20, 0);
await page.screenshot({ path: `${AUSGABE}/knochen-buehne-2-seite.png` });
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(600);
console.log('nach Undo (Gelenk zurück)', JSON.stringify(await stand()));
// Schrägblick: Kieferspitze nach unten ziehen öffnet weiter
await kamera({ azimut: -0.6, elevation: -0.2, distanz: 1.6, ziel: [0, 0.22, 0] });
const vorSchraeg = (await stand()).unten;
await ziehen('kiefer-dreh', 0, 40);
console.log('Schrägblick: Unterkiefer', vorSchraeg, '→', (await stand()).unten);
await page.screenshot({ path: `${AUSGABE}/knochen-buehne-3-schraeg.png` });
// andere Stufe: keine Griffe
await page.evaluate(() => window.__stores.ui.getState().setzeEbene('maul'));
await page.waitForTimeout(800);
console.log('in Maul: Griffe', (await page.evaluate(() => window.__editor.knochen?.() ?? [])).length);
console.log('Fehler:', fehler.slice(0, 5));
await browser.close();
