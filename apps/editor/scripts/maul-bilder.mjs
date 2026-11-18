// Maul im Netz: Bilder des Versuchs (?versuch=maul) je Zustand, ganzer Editor und Nahaufnahme des 3D-Fensters.
//   node scripts/maul-bilder.mjs <wesen> [ausgabeordner] [zustände, z. B. zu,0.5,auf] [azimut]   (Web-Modus muss laufen)
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const wesen = process.argv[2] ?? 'tiger';
const aus = path.resolve(process.argv[3] ?? path.resolve(hier, '../../../docs/progress/editor'));
const zustaende = (process.argv[4] ?? 'zu,0.5,auf').split(',');
const azimut = process.argv[5] ?? '-60';
const url = process.env.EDITOR_URL ?? 'http://localhost:5180';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('console', (m) => m.text().startsWith('[maul]') && console.log(m.text()));
for (const zustand of zustaende) {
  for (const kaefig of ['0', '1']) {
    await page.goto(`${url}/?versuch=maul&wesen=${wesen}&zustand=${zustand}&kaefig=${kaefig}&nah=1&azimut=${azimut}`);
    await page.waitForFunction((w) => window.__editor && window.__editor.vertices() > 0 && window.__stores.editor.getState().dok.name === w, wesen, { timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const name = `maul-${wesen}-${zustand}${kaefig === '1' ? '-kaefig' : ''}`;
    if (kaefig === '1') await page.screenshot({ path: path.join(aus, `${name}.png`) });
    const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
    await page.screenshot({ path: path.join(aus, `${name}-3d.png`), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  }
}
console.log(`geschrieben: ${aus}/maul-${wesen}-*.png`);
await browser.close();
