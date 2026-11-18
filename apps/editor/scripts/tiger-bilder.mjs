// Florians Tiger-Konzept im Editor (Versuch): Maul zu (Editor-Tab) und offen (Fressen-Tab).
//   node scripts/tiger-bilder.mjs [url]   (Web-Modus muss laufen)
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const aus = path.resolve(hier, '../../../docs/progress/editor');
const url = process.argv[2] ?? 'http://localhost:5180';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 2 });
for (const zustand of ['zu', 'auf']) {
  await page.goto(`${url}/?versuch=tiger&zustand=${zustand}`);
  await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0 && window.__stores.editor.getState().dok.name.startsWith('Tiger'), null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(aus, `tiger-editor-${zustand}.png`) });
}
console.log('geschrieben: docs/progress/editor/tiger-editor-zu.png, tiger-editor-auf.png');
await browser.close();
