// Seite eines Falls der Prüfreihe nah am Maul (schwarze Linie, Rot, Blau, Körper, Saum) samt Δ der Blätter — prüft, ob
// eine Abweichung echt ist oder verdeckt liegt. FALL=a,b; NAH=cu,cv,zoom (Welt-Mitte und Zoom der Seite). Über run-check.sh.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const faelle = JSON.parse(readFileSync(resolve(AUSGABE, process.env.DATEI ?? 'pruefreihe.json'), 'utf-8'));
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const [cu, cv, zoom] = (process.env.NAH ?? '-0.2,0.26,3').split(',').map(Number);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`${url}/?bauweise=kern&look=earle&palette=${process.env.PALETTE ?? 'blob'}`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
for (const name of (process.env.FALL ?? 'kugel-ueberbiss').split(',')) {
  const f = faelle[name];
  if (!f) { console.log('Fall fehlt', name); continue; }
  await page.evaluate(({ d, cu, cv, zoom }) => { const ui = window.__stores.ui.getState(); window.__stores.editor.getState().laden(d, null); ui.setzeEbene('maul'); ui.maximieren(null); ui.setzeAnsicht('seite', { zoom, cu, cv }); }, { d: f.dok, cu, cv, zoom });
  await page.waitForTimeout(3000);
  const z = await page.evaluate(() => ({ delta: [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent), lippen: window.__editor.wesen()?.lippen ?? null }));
  console.log(name, JSON.stringify(z));
  const el = await page.$('[data-view="seite"]');
  await el.screenshot({ path: `${AUSGABE}/seite-nah-${name}.png` });
}
await browser.close();
