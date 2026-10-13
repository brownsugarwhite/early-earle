// Vergleichsbild Bogen | Render für Beweis 2: node scripts/maul-vergleich.mjs [bogen.png] [render.png …] → docs/progress/editor/vergleich-maul-rex.png
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(hier, '../../..');
const bogen = process.argv[2] ?? path.join(root, 'ref/editor/creatures/rex_mouth_detail.png');
const renders = process.argv.length > 3 ? process.argv.slice(3) : ['kern-maul-rex-vorn-auf.png', 'kern-maul-rex-vorn-zu.png'].map((f) => path.join(root, 'docs/progress/editor', f));
const aus = process.env.AUS ?? path.join(root, 'docs/progress/editor/vergleich-maul-rex.png');
const uri = (p) => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
const kacheln = [[bogen, 'Bogen: ' + path.basename(bogen)], ...renders.map((r) => [r, 'Kern: ' + path.basename(r)])];
const html = `<html><body style="margin:0;background:#f4f1e4;font:13px Helvetica,Arial;color:#0f171c"><div style="display:flex;gap:16px;padding:16px;align-items:flex-start">${kacheln
  .map(([p, t]) => `<figure style="margin:0"><figcaption style="margin-bottom:6px">${t}</figcaption><img src="${uri(p)}" style="height:460px;display:block"></figure>`)
  .join('')}</div></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 560 }, deviceScaleFactor: 1 });
await page.setContent(html);
const box = await page.locator('div').first().boundingBox();
await page.screenshot({ path: aus, clip: { x: 0, y: 0, width: Math.ceil(box.width), height: Math.ceil(box.height) } });
await browser.close();
console.log(`geschrieben: ${aus}`);
