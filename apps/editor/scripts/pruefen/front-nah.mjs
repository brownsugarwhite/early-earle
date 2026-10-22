// Front eines Falls nah (Spanten, Lippenlinien, Körper) nach einer Einstellung: FALL, NAH=cu,cv,zoom, optional SPANT=f
// (Spant setzen) und UNTEN=dx (Unterkiefer-Punkt einfügen und um dx normiert nach außen). Über run-check.sh.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const faelle = JSON.parse(readFileSync(resolve(AUSGABE, process.env.DATEI ?? 'pruefreihe.json'), 'utf-8'));
const FALL = process.env.FALL ?? 'kugel-ueberbiss';
const [cu, cv, zoom] = (process.env.NAH ?? '0.15,0.25,3').split(',').map(Number);
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
const dok = faelle[FALL].dok;
await page.evaluate(({ d, f, dx }) => {
  const ed = window.__stores.editor.getState();
  ed.laden(d, null);
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('form');
  ui.maximieren(null);
  window.__wunsch = { f, dx };
}, { d: dok, f: process.env.SPANT ? Number(process.env.SPANT) : null, dx: process.env.UNTEN ? Number(process.env.UNTEN) : null });
await page.waitForTimeout(2500);
if (process.env.SPANT) {
  // Spant über die Seite setzen (Werkzeug S), Mitte der roten Linie
  const p = await page.evaluate(() => { const k = window.__stores.editor.getState().dok.maul.zu.oben.knoten[1].p; return { x: k[0], y: k[1] - 0.04 }; });
  const q = await page.evaluate(({ p }) => {
    const svg = document.querySelector('[data-view="seite"] svg.view2d');
    const r = svg.getBoundingClientRect();
    const a = window.__stores.ui.getState().ansichten.seite;
    const s = a.zoom * 0.925 * Math.min(r.width, r.height);
    return { x: r.left + r.width / 2 + (p.x - a.cu) * s, y: r.top + r.height / 2 - (p.y - a.cv) * s };
  }, { p });
  await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('spant'));
  await page.mouse.click(q.x, q.y);
  await page.waitForTimeout(1500);
}
await page.evaluate(({ cu, cv, zoom }) => window.__stores.ui.getState().setzeAnsicht('front', { zoom, cu, cv }), { cu, cv, zoom });
await page.waitForTimeout(1500);
const el = await page.$('[data-view="front"]');
await el.screenshot({ path: `${AUSGABE}/front-nah-${FALL}.png` });
console.log(JSON.stringify(await page.evaluate(() => ({ delta: [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent), spanten: window.__stores.editor.getState().dok.spanten?.length ?? 0 }))));
await browser.close();
