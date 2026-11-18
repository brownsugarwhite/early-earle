// Schritt 4: Δ im Blatt-Titel, Blätter-Zeile in der Tafel, Saum im Blatt (Kugel und Tiger), Bilder für Florian
import { dirname as _dirname, resolve as _resolve } from 'node:path';
import { fileURLToPath as _fileURLToPath } from 'node:url';
// gerettet aus dem Scratchpad der Sitzung vom 15.10. (Pfade relativ zum Repo)
const WURZEL = _resolve(_dirname(_fileURLToPath(import.meta.url)), '../../../..');
import { chromium } from '@playwright/test';
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = WURZEL + '/docs/progress/editor';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.log('[browser]', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
for (const wesen of ['kugel', 'tiger']) {
  await page.goto(`${url}/?versuch=kern&wesen=${wesen}&bauweise=kern&look=earle&palette=${wesen === 'tiger' ? 'tiger' : 'blob'}`);
  await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
  try { await page.waitForSelector('[data-delta]', { timeout: 20_000 }); } catch { console.log(`${wesen}: kein [data-delta] nach 20 s`); }
  await page.waitForTimeout(800);
  const deltas = await page.$$eval('[data-delta]', (els) => els.map((e) => `${e.closest('.vp-ober, .viewport')?.getAttribute('data-view') ?? e.parentElement?.textContent?.slice(0, 12)} → ${e.textContent} (${e.className})`));
  const blaetter = await page.$eval('[data-blaetter]', (e) => e.getAttribute('data-blaetter')).catch(() => 'keine Tafelzeile (Stufe Spiel?)');
  const saum = await page.$$eval('[data-saum]', (els) => els.map((e) => (e.getAttribute('d') ?? '').length));
  console.log(`${wesen}: Δ ${JSON.stringify(deltas)}; Tafel Blätter ${blaetter}; Saum-Pfade (Zeichenlänge) ${JSON.stringify(saum)}`);
  await page.screenshot({ path: `${out}/zeichnung-ist-form-delta-${wesen}.png` });
}
await browser.close();
