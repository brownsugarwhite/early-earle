// Gezielte Bühnenbilder eines Falls der Prüfreihe (pruefreihe.json): FALL=name, BILDER="oeffnung:az,el,dist,x,y,z;…"
// (Winkel in Grad, Ziel in Welt). Ein Bogen mit allen Bildern, groß. Aufruf über run-check.sh; NAME benennt den Bogen.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const NAME = process.env.NAME ?? 'kamera';
const faelle = JSON.parse(readFileSync(resolve(AUSGABE, 'pruefreihe.json'), 'utf-8'));
const namen = (process.env.FALL ?? 'kugel-gleich').split(',');
const bilderSpec = (process.env.BILDER ?? '0:-50,-6,1,-0.12,0.24,0').split(';').map((b) => {
  const [oe, k] = b.split(':');
  const [az, el, dist, x, y, z] = k.split(',').map(Number);
  return { oe: Number(oe), kam: { azimut: (az * Math.PI) / 180, elevation: (el * Math.PI) / 180, distanz: dist, ziel: [x, y, z] }, text: b };
});
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`${url}/?bauweise=kern&look=earle&palette=${process.env.PALETTE ?? 'blob'}`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
const zeilen = [];
for (const name of namen) {
  const f = faelle[name];
  if (!f) { console.log('fehlt', name); continue; }
  await page.evaluate((d) => { const ui = window.__stores.ui.getState(); ui.setzeOeffnung(0); window.__stores.editor.getState().laden(d, null); ui.setzeEbene('maul'); ui.maximieren('creation'); }, f.dok);
  await page.waitForTimeout(2500);
  const bilder = [];
  for (const b of bilderSpec) {
    await page.evaluate((oe) => window.__stores.ui.getState().setzeOeffnung(oe), b.oe);
    await page.evaluate((k) => window.__stores.ui.getState().setzeKamera(k), b.kam);
    await page.waitForTimeout(1200);
    const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
    const png = await page.screenshot({ clip: { x: rc.x + rc.w * 0.15, y: rc.y + rc.h * 0.08, width: rc.w * 0.7, height: rc.h * 0.84 } });
    bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text: b.text });
  }
  zeilen.push({ name, mass: f.mass, bilder });
  console.log('Bild', name);
}
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#1b2530;color:#eee;font:13px/1.3 monospace}
.z{display:grid;grid-template-columns:repeat(2,480px);gap:6px;padding:6px 8px}.t{padding:6px 8px 0;font-weight:bold}.m{padding:0 8px;color:#bcd;white-space:pre-wrap}figure{margin:0}img{width:480px;height:400px;object-fit:cover;background:#ccc}figcaption{color:#9ab}</style>
${zeilen.map((r) => `<div class="t">${r.name}</div><div class="m">${r.mass}</div><div class="z">${r.bilder.map((b) => `<figure><img src="${b.src}"><figcaption>${b.text}</figcaption></figure>`).join('')}</div>`).join('')}`;
writeFileSync(resolve(AUSGABE, `${NAME}.html`), html);
const p2 = await browser.newPage({ viewport: { width: 990, height: 400 }, deviceScaleFactor: 1 });
await p2.goto(`file://${resolve(AUSGABE, `${NAME}.html`)}`);
await p2.screenshot({ path: resolve(AUSGABE, `${NAME}.png`), fullPage: true });
await browser.close();
console.log('Bogen', resolve(AUSGABE, `${NAME}.png`));
