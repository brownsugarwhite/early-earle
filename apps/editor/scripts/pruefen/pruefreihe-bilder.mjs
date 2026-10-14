// Kontaktbogen der Prüfreihe (pruefreihe.json aus pruefreihe.ts): je Fall drei Bühnenbilder (schräg zu, von unten zu,
// offen 50 %) und die Maße, alles auf einem Bogen. Aufruf über run-check.sh; NAME benennt den Bogen.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/test-results/pruefen');
const NAME = process.env.NAME ?? 'pruefreihe';
// NUR=fall1,fall2 filtert; NAH=x,y,z,dist rückt alle Kameras nah an eine Stelle (z. B. die Spitze des kürzeren Kiefers)
const nur = process.env.NUR?.split(',');
const nah = process.env.NAH?.split(',').map(Number);
const faelle = Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(resolve(AUSGABE, 'pruefreihe.json'), 'utf-8')))
    .filter(([n]) => !nur || nur.some((x) => n.startsWith(x)))
    .map(([n, f]) => [n, nah ? { ...f, ziel: nah.slice(0, 3), dist: nah[3] } : f]),
);
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().maximieren('creation'));
const bild = async (kam) => {
  await page.evaluate((k) => window.__stores.ui.getState().setzeKamera(k), kam);
  await page.waitForTimeout(900);
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const b = await page.screenshot({ clip: { x: rc.x + rc.w * 0.1, y: rc.y + rc.h * 0.05, width: rc.w * 0.8, height: rc.h * 0.9 } });
  return `data:image/png;base64,${b.toString('base64')}`;
};
const zeilen = [];
for (const [name, f] of Object.entries(faelle)) {
  await page.evaluate((d) => { const ui = window.__stores.ui.getState(); ui.setzeOeffnung(0); window.__stores.editor.getState().laden(d, null); ui.setzeEbene('maul'); ui.maximieren('creation'); }, f.dok);
  await page.waitForTimeout(2500);
  const z = f.ziel;
  const bilder = [];
  bilder.push(await bild({ azimut: -0.9, elevation: -0.1, distanz: f.dist, ziel: z }));
  bilder.push(await bild({ azimut: -0.6, elevation: -0.8, distanz: f.dist * 1.05, ziel: z }));
  bilder.push(await bild({ azimut: -1.5708, elevation: -0.25, distanz: f.dist, ziel: z }));
  await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0.5));
  await page.waitForTimeout(1200);
  bilder.push(await bild({ azimut: -0.6, elevation: -0.1, distanz: f.dist * 1.05, ziel: [z[0], z[1] - 0.02, z[2]] }));
  await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0));
  zeilen.push({ name, mass: f.mass, bilder });
  console.log('Bild', name);
}
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#1b2530;color:#eee;font:13px/1.3 monospace}
.z{display:grid;grid-template-columns:repeat(4,240px);gap:4px;padding:6px 8px 2px}.t{padding:6px 8px 0;font-weight:bold}.m{padding:0 8px;color:#bcd;white-space:pre-wrap}img{width:240px;height:200px;object-fit:cover;background:#ccc}</style>
${zeilen.map((r) => `<div class="t">${r.name}</div><div class="m">${r.mass}</div><div class="z">${r.bilder.map((b) => `<img src="${b}">`).join('')}</div>`).join('')}`;
writeFileSync(resolve(AUSGABE, `${NAME}.html`), html);
const p2 = await browser.newPage({ viewport: { width: 990, height: 400 }, deviceScaleFactor: 1 });
await p2.goto(`file://${resolve(AUSGABE, `${NAME}.html`)}`);
await p2.screenshot({ path: resolve(AUSGABE, `${NAME}.png`), fullPage: true });
await browser.close();
console.log('Bogen', resolve(AUSGABE, `${NAME}.png`));
