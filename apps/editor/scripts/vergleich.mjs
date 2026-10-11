// Vergleichsbild Vorlage | Render (Look-Beweis): rendert den Editor bei 1728×1161 mit DPR 2 auf der echten
// GPU und setzt ihn neben Florians Figma-Screenshot. Render und Differenzbild (zum Ausrichten) landen in
// apps/editor/test-results/vergleich/, das Vergleichsbild in docs/progress/editor/.
//
//   node scripts/vergleich.mjs [url] [ausgabe-ordner]
//   (Editor im Web-Modus muss laufen: pnpm --filter @ee/editor dev:web)

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(hier, '../../..');
const url = process.argv[2] ?? 'http://localhost:5180';
const aus = path.resolve(process.argv[3] ?? path.join(repo, 'docs/progress/editor'));
const vorlage = path.join(repo, 'docs/look/editor/figmaScreenshot.png');
const arbeit = path.join(hier, '../test-results/vergleich');

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 2 });
await page.goto(url);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 30_000 });
await page.evaluate(() => document.fonts.ready);
// wie in der Vorlage: in jeder 2D-Ansicht ist der obere bzw. vordere Achspunkt gewählt (Griffe sichtbar)
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.waehle('seite', 0);
  ui.waehle('front', 0);
  ui.waehle('top', 0);
});
await page.waitForTimeout(600);
const backend = await page.evaluate(() => window.__editor.backend);
const render = await page.screenshot();
fs.mkdirSync(aus, { recursive: true });
fs.mkdirSync(arbeit, { recursive: true });
fs.writeFileSync(path.join(arbeit, 'render-grundlayout.png'), render);

const b64 = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
const montage = await browser.newPage({ viewport: { width: 800, height: 600 } });
const [nebeneinander, differenz] = await montage.evaluate(
  async ([a, b, backend]) => {
    const lade = (src) =>
      new Promise((ok, err) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = err;
        i.src = src;
      });
    const [va, re] = await Promise.all([lade(a), lade(b)]);
    const W = 1728;
    const H = 1161;
    const kopf = 56;
    const c = document.createElement('canvas');
    c.width = W * 2 + 24;
    c.height = H + kopf;
    const g = c.getContext('2d');
    g.fillStyle = '#0d1317';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(va, 0, kopf, W, H);
    g.drawImage(re, W + 24, kopf, W, H);
    g.fillStyle = '#fff';
    g.font = '28px sans-serif';
    g.fillText('Vorlage (Figma)', 16, 38);
    g.fillText(`Render (Editor, ${backend})`, W + 40, 38);
    const d = document.createElement('canvas');
    d.width = W;
    d.height = H;
    const h = d.getContext('2d');
    h.drawImage(va, 0, 0, W, H);
    h.globalCompositeOperation = 'difference';
    h.drawImage(re, 0, 0, W, H);
    return [c.toDataURL('image/png'), d.toDataURL('image/png')];
  },
  [b64(fs.readFileSync(vorlage)), b64(render), backend],
);
fs.writeFileSync(path.join(aus, 'vergleich-grundlayout.png'), Buffer.from(nebeneinander.split(',')[1], 'base64'));
fs.writeFileSync(path.join(arbeit, 'vergleich-differenz.png'), Buffer.from(differenz.split(',')[1], 'base64'));
console.log(`Backend ${backend}; Bilder in ${path.relative(repo, aus)}`);
await browser.close();
