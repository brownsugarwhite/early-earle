#!/usr/bin/env node
/**
 * Fortschrittsbilder des Loaders und Splashs (docs/progress/iter4-loader-*.png), Handy 393 × 852 und Desktop:
 *
 *   LAUNCH_URL=http://127.0.0.1:4201 node scripts/splash-shots.mjs      (Dev-Server muss laufen)
 *
 * Über `?splash=manual` und window.__eeSplash (loader/seek/outro) — echte GPU (Metal), damit es schnell geht.
 * Zusätzlich der Vergleich mit Florians PNG (`?splash=overlay`, Differenz + IoU-Tabelle).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../../docs/progress');
const base = process.env.LAUNCH_URL ?? 'http://127.0.0.1:4201';
const GPU = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'];

const STATES = [
  ['erstes-bild', 'loader', 0],
  ['45', 'loader', 0.45],
  ['100', 'loader', 1],
  ['moewe-0.62', 'seek', 0.62],
  ['aufprall-1.08', 'seek', 1.08],
  ['wisch-1.30', 'seek', 1.3],
  ['leerlauf-2.4', 'seek', 2.4],
  ['ausklang-0.3', 'outro', 0.3],
];
const VIEWS = [
  ['handy', 393, 852, 3],
  ['desktop', 1440, 900, 2],
];

const browser = await chromium.launch({ args: GPU });
for (const [view, w, h, dpr] of VIEWS) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await page.goto(`${base}/?splash=manual`, { timeout: 120_000 });
  await page.waitForFunction(() => !!(window).__eeSplash, null, { timeout: 120_000 });
  for (const [name, kind, v] of STATES) {
    await page.evaluate(([k, x]) => window.__eeSplash[k](x), [kind, v]);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `iter4-loader-${view}-${name}.png`), timeout: 120_000 });
    console.log(`iter4-loader-${view}-${name}.png`);
  }
  await page.close();
}
// Vergleich mit dem PNG (1:1 in PNG-Pixeln)
const page = await browser.newPage({ viewport: { width: 838, height: 1428 }, deviceScaleFactor: 1 });
await page.goto(`${base}/?splash=overlay`, { timeout: 120_000 });
await page.waitForSelector('[data-testid="splash-iou"]', { timeout: 120_000 });
await page.screenshot({ path: path.join(OUT, 'iter4-loader-vergleich-png.png') });
console.log('iter4-loader-vergleich-png.png', await page.evaluate(() => document.getElementById('ee-splash')?.dataset.iou));
await browser.close();
