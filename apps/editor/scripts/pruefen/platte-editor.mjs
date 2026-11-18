// Tiger aus der Library (Ring 24, Plattenmaul): Bühne zu und offen; dann Stern im Front-Blatt klicken
import { dirname as _dirname, resolve as _resolve } from 'node:path';
import { fileURLToPath as _fileURLToPath } from 'node:url';
// gerettet aus dem Scratchpad der Sitzung vom 15.10. (Pfade relativ zum Repo)
const WURZEL = _resolve(_dirname(_fileURLToPath(import.meta.url)), '../../../..');
import { chromium } from '@playwright/test';
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = WURZEL + '/docs/progress/editor';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') console.log('[browser]', m.text().slice(0, 160)); });
await page.goto(`${url}/?versuch=kern&wesen=tiger&bauweise=kern&look=earle&palette=tiger`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.waitForFunction(() => window.__editor.wesen()?.maul, null, { timeout: 30_000 }).catch(() => console.log('kein Maul'));
await page.waitForTimeout(1500);
const w0 = await page.evaluate(() => { const w = window.__editor.wesen(); return { N: w.vorlage.N, maul: w.maul, zaehne: w.zaehne }; });
console.log('Tiger Prüfwesen:', JSON.stringify(w0));
await page.evaluate(() => { window.__stores.ui.getState().setzeEbene('maul'); window.__stores.ui.getState().maximieren('creation'); window.__stores.ui.getState().setzeKamera?.({ azimut: -0.6, elevation: 0.15, distanz: 1.1, ziel: [-0.3, 0.33, 0] }); });
await page.waitForTimeout(1200);
const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
await page.screenshot({ path: `${out}/platte-tiger-zu.png`, clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(1));
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/platte-tiger-offen.png`, clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0));
await browser.close();
