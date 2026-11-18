// Abnahme Phase 2 M6 (Maularten): Fisch (Rundmaul), Drache (Maul am Hals) und Tiger (Plattenmaul, Kastenschnauze) aus der
// Library, je zu und offen, neben `fish_round mouth`, `rex_dragon_big mouth`, `dogs_mouth` und
// `raubkatzen_mouth closed_kastenschnauze`. Über run-check.sh (eigener Vite, 5192).
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
const t0 = Date.now();
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
const laden = async (id, maul) => {
  await page.click(`[data-pruefwesen="${id}"]`);
  const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
  if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
  await page.waitForTimeout(3500);
  await page.evaluate((maul) => {
    const ui = window.__stores.ui.getState();
    ui.setzeEbene('maul');
    ui.setzeBlinzeln(false);
    window.__stores.kernAnzeige.getState().setzeMaul(maul);
  }, maul);
  await page.waitForTimeout(2500);
};
const kamera = (k) =>
  page.evaluate((k) => {
    window.__stores.ui.getState().setzeKamera({ azimut: (k[0] * Math.PI) / 180, elevation: (k[1] * Math.PI) / 180, distanz: k[2], ziel: [k[3], k[4], k[5]] });
  }, k);
const bilder = [];
const bild = async (text, aus = [0.15, 0.1, 0.7, 0.8]) => {
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x + r.w * aus[0], y: r.y + r.h * aus[1], width: r.w * aus[2], height: r.h * aus[3] } });
  bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text });
};
for (const [id, maul, kams] of [
  ['fisch', 'aus', [[-90, 4, 1.25, 0, 0.25, 0], [-55, 8, 1.3, -0.1, 0.25, 0]]],
  ['drache', 'hals', [[0, 4, 1.6, -0.1, 0.45, 0], [-55, 8, 1.6, -0.1, 0.45, 0]]],
  ['tiger', 'aus', [[-90, 4, 0.9, -0.3, 0.3, 0], [-40, 6, 1.0, -0.3, 0.3, 0]]],
]) {
  await laden(id, maul);
  for (const kam of kams) {
    for (const oe of [0, 1]) {
      await page.evaluate((oe) => window.__stores.ui.getState().setzeOeffnung(oe), oe);
      await page.waitForTimeout(2000);
      await kamera(kam);
      await bild(`${id} · ${oe ? 'offen' : 'zu'} · ${kam[0]}°`);
    }
  }
  await page.evaluate(() => window.__stores.kernAnzeige.getState().setzeMaul('aus'));
}
const ref = (p, h = 150) => (existsSync(resolve(WURZEL, p)) ? `<img src="data:image/png;base64,${readFileSync(resolve(WURZEL, p)).toString('base64')}" style="height:${h}px">` : '');
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1850px">
<div style="display:flex;gap:6px;padding:6px;align-items:flex-start;flex-wrap:wrap">${ref('ref/editor/creatures/fish_round mouth.png')}${ref('ref/editor/creatures/rex_dragon_big mouth.png', 200)}${ref('ref/editor/creatures/dogs_mouth.png')}${ref('ref/editor/creatures/raubkatzen_mouth closed_kastenschnauze.png')}</div>
<div style="display:grid;grid-template-columns:repeat(4,452px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:452px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'maularten-abnahme.html'), html);
await page.setViewportSize({ width: 1850, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'maularten-abnahme.png'), fullPage: true });
console.log(`Dauer ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log('Bild', resolve(AUSGABE, 'maularten-abnahme.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
