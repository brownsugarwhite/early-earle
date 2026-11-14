// Tiger in fünf Schritten (Käfig → unterteilt → angepasst → Kanten → Ergebnis), je ein Bild des ganzen Editors.
//   node scripts/tiger-schritte.mjs [url]   (Web-Modus muss laufen)
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const aus = path.resolve(hier, '../../../docs/progress/editor');
const url = process.argv[2] ?? 'http://localhost:5180';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 2 });
for (const schritt of [1, 2, 3, 4, 5, 6, 7]) {
  await page.goto(`${url}/?versuch=tigerkaefig&schritt=${schritt}`);
  await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0 && window.__stores.editor.getState().dok.name.startsWith('Tiger'), null, { timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(aus, `tiger-schritt-${schritt}.png`) });
  // Nahaufnahme des 3D-Fensters
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  await page.screenshot({ path: path.join(aus, `tiger-schritt-${schritt}-3d.png`), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
}
console.log('geschrieben: docs/progress/editor/tiger-schritt-1…5.png');
await browser.close();
