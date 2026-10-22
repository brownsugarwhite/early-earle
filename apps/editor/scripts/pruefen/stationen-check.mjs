// Schritt 3 im Editor: Ringe eingefroren nach dem ersten Bau, „Neu ableiten“ wählt neu; Dokument trägt kaefig.stationen
import { dirname as _dirname, resolve as _resolve } from 'node:path';
import { fileURLToPath as _fileURLToPath } from 'node:url';
// gerettet aus dem Scratchpad der Sitzung vom 15.10. (Pfade relativ zum Repo)
const WURZEL = _resolve(_dirname(_fileURLToPath(import.meta.url)), '../../../..');
import { chromium } from '@playwright/test';
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') console.log('[browser]', m.text().slice(0, 160)); });
await page.goto(`${url}/?versuch=kern&wesen=langhals&bauweise=kern&look=earle&palette=giraffe`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 20_000 }).catch(() => console.log('keine Stationen im Dokument nach 20 s'));
const lesen = async () => page.evaluate(() => { const d = window.__stores.editor.getState().dok; return { ringe: d.kaefig?.stationen?.ringe.length ?? 0, erste: d.kaefig?.stationen?.ringe.slice(0, 3).map((f) => +f.toFixed(4)) ?? null, tafel: document.querySelector('[data-stationen]')?.textContent ?? null, verlauf: window.__stores.editor.getState().verlauf.length }; });
console.log('nach dem ersten Bau:', JSON.stringify(await lesen()));
// Seite vorn heben (Hals hoch) über den Store: Knoten mit x < −0,05 um +0,08
await page.evaluate(() => {
  const ed = window.__stores.editor.getState();
  const seite = ed.dok.profile.seite;
  const w = (x) => Math.min(1, Math.max(0, -x / 0.12));
  const knoten = seite.knoten.map((k) => { const d = 0.08 * w(k.p.x); return d > 0 ? { ...k, p: { x: k.p.x, y: k.p.y + d }, ein: { x: k.ein.x, y: k.ein.y + d }, aus: { x: k.aus.x, y: k.aus.y + d } } : k; });
  ed.setzeProfil('seite', { ...seite, knoten });
});
await page.waitForTimeout(1500);
console.log('nach Hals hoch:', JSON.stringify(await lesen()), 'Δ Blätter:', await page.$$eval('[data-delta]', (els) => els.map((e) => e.textContent)));
await page.click('[data-neu-ableiten]');
await page.waitForTimeout(1500);
console.log('nach Neu ableiten:', JSON.stringify(await lesen()));
await page.screenshot({ path: WURZEL + '/docs/progress/editor/zeichnung-ist-form-stationen-langhals.png' });
await browser.close();
