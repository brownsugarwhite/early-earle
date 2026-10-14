// Bilder der Maul-Prüffälle (Block 2): Dokumente aus maul-faelle.json in den Editor laden (Bauweise Kern), Maul-Stufe,
// je Fall Riss (Seite mit schwarz/rot/blau/gelb), Bühne schräg, von unten und offen 50 %. Aufruf über run-check.sh.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/test-results/pruefen');
const NAME = process.env.NAME ?? 'maul';
const faelle = JSON.parse(readFileSync(resolve(AUSGABE, 'maul-faelle.json'), 'utf-8'));
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
const buehne = async (datei, kam) => {
  await page.evaluate((k) => { window.__stores.ui.getState().maximieren('creation'); window.__stores.ui.getState().setzeKamera(k); }, kam);
  await page.waitForTimeout(1300);
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  await page.screenshot({ path: `${AUSGABE}/${datei}.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
};
for (const [art, dok] of Object.entries(faelle)) {
  await page.evaluate((d) => { const ui = window.__stores.ui.getState(); ui.setzeOeffnung(0); window.__stores.editor.getState().laden(d, null); ui.setzeEbene('maul'); ui.maximieren(null); }, dok);
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => ({ delta: [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent), lippen: window.__editor.wesen()?.lippen ?? null }));
  console.log(`${art}: Δ ${JSON.stringify(info.delta)} Lippen ${JSON.stringify(info.lippen)}`);
  await page.screenshot({ path: `${AUSGABE}/${NAME}-${art}-riss.png` });
  await buehne(`${NAME}-${art}-schraeg`, { azimut: -0.9, elevation: -0.15, distanz: 0.75, ziel: [-0.1, 0.25, 0] });
  await buehne(`${NAME}-${art}-unten`, { azimut: -0.8, elevation: -0.75, distanz: 0.85, ziel: [-0.1, 0.25, 0] });
  await buehne(`${NAME}-${art}-oben`, { azimut: -1.2, elevation: 0.9, distanz: 0.85, ziel: [-0.1, 0.25, 0] });
  await buehne(`${NAME}-${art}-seite`, { azimut: -1.5708, elevation: 0.0, distanz: 0.8, ziel: [-0.1, 0.25, 0] });
  await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0.5));
  await page.waitForTimeout(1200);
  await buehne(`${NAME}-${art}-offen`, { azimut: -0.6, elevation: -0.1, distanz: 0.85, ziel: [-0.1, 0.23, 0] });
  await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0));
}
await browser.close();
