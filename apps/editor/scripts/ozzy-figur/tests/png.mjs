// SVG-Dateien mit Chromium in PNG wandeln: node png.mjs a.svg b.svg …
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const browser = await chromium.launch();
for (const f of process.argv.slice(2)) {
  const svg = readFileSync(f, 'utf8');
  const w = Number(svg.match(/width="([\d.]+)"/)[1]), h = Number(svg.match(/height="([\d.]+)"/)[1]);
  const page = await browser.newPage({ viewport: { width: Math.ceil(w), height: Math.ceil(h) }, deviceScaleFactor: Number(process.env.DPR ?? 1) });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: f.replace(/\.svg$/, '.png'), clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
}
await browser.close();
