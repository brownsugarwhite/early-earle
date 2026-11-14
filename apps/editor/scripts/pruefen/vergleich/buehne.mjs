// Library-Prüfwesen laden und die Bühne fotografieren (gleiche Kamera wie in jedem Stand). Über editor-lauf.sh starten.
// Umgebung: NUR (Komma-Liste der Prüfwesen, Standard langhals), AUSGABE (Ordner), TAG (vom Läufer: Commit)
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const AUS = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/vergleich');
mkdirSync(AUS, { recursive: true });
const url = process.env.EDITOR_URL;
const TAG = process.env.TAG ?? 'x';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
page.on('dialog', (d) => d.accept());
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 90_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(500);
for (const id of (process.env.NUR ?? 'langhals').split(',')) {
  await page.click(`[data-pruefwesen="${id}"]`);
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.__stores.ui.getState().maximieren('creation'));
  await page.waitForTimeout(1500);
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  await page.screenshot({ path: `${AUS}/${id}-${TAG}.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
  const delta = await page.evaluate(() => [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent));
  console.log(id, TAG, JSON.stringify(delta));
  await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
}
console.log('Fehler', fehler.slice(0, 5));
await browser.close();
