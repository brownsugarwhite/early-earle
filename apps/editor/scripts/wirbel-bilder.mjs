// Wirbelsäulen-Versuch: Bilder je Wesen (ganzer Editor mit Wirbelsäule und Sprossen, 3D nah aus zwei Richtungen).
//   node scripts/wirbel-bilder.mjs <wesen> [ausgabeordner] [azimute, z. B. -60,30]   (Web-Modus muss laufen)
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const wesen = process.argv[2] ?? 'langhals';
const aus = path.resolve(process.argv[3] ?? path.resolve(hier, '../../../docs/progress/editor'));
const azimute = (process.argv[4] ?? '-60,30').split(',');
const url = process.env.EDITOR_URL ?? 'http://localhost:5180';
const extra = process.env.WIRBEL_EXTRA ?? '';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('console', (m) => m.text().startsWith('[wirbel]') && console.log(m.text()));
for (const [k, azimut] of azimute.entries()) {
  for (const kaefig of k === 0 ? ['1', '0'] : ['0']) {
    await page.goto(`${url}/?versuch=wirbel&wesen=${wesen}&kaefig=${kaefig}&nah=1&azimut=${azimut}${extra}`);
    await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    const name = `wirbel-${wesen}${kaefig === '1' ? '-kaefig' : ''}${k ? `-${azimut}` : ''}`;
    if (kaefig === '1') await page.screenshot({ path: path.join(aus, `${name}.png`) });
    const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
    await page.screenshot({ path: path.join(aus, `${name}-3d.png`), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  }
}
console.log(`geschrieben: ${aus}/wirbel-${wesen}-*.png`);
await browser.close();
