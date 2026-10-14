// Formen folgen: Kugel, Aufblasen oben mit I → Umrisse der Blätter folgen (Δ je Blatt, Knotenzahl, Bilder Riss)
import { dirname as _dirname, resolve as _resolve } from 'node:path';
import { fileURLToPath as _fileURLToPath } from 'node:url';
// gerettet aus dem Scratchpad der Sitzung vom 15.10. (Pfade relativ zum Repo)
const WURZEL = _resolve(_dirname(_fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? _resolve(WURZEL, 'apps/editor/test-results/pruefen');
import { chromium } from '@playwright/test';
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = AUSGABE + '';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !m.text().includes('THREE.TSL')) console.log('[browser]', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${url}/?versuch=kern&wesen=kugel&bauweise=kern&look=earle&palette=blob&kamera=-45,15,1.6,0,0.25,0`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.waitForTimeout(1500);
const lage = async () => page.evaluate(() => { const d = window.__stores.editor.getState().dok; const i = window.__stores.kern?.getState?.()?.info; return { knoten: { seite: d.profile.seite.knoten.length, front: d.profile.front.knoten.length, top: d.profile.top.knoten.length }, deltas: d.kaefig?.deltas?.length ?? 0, undo: window.__stores.editor.getState().verlauf.length }; });
const info = async () => page.evaluate(() => window.__editor.wesen()?.ableitung !== undefined ? (window.__stores.kernAnzeige?.getState?.()?.info?.blatt ?? null) : null);
console.log('vorher:', JSON.stringify(await lage()));
const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
// Trefferpunkt oben auf der Kugel
let ziel = null;
for (let iy = 2; iy <= 6 && !ziel; iy++) for (let ix = 3; ix <= 7 && !ziel; ix++) {
  const t = await page.evaluate(([x, y]) => window.__editor.treffen(x, y), [(r.w * ix) / 10, (r.h * iy) / 10]);
  if (t && t.kaefigPunkt >= 0) ziel = { px: (r.w * ix) / 10, py: (r.h * iy) / 10, t };
}
console.log('Ziel:', JSON.stringify({ px: ziel.px, py: ziel.py, punkt: ziel.t.kaefigPunkt }));
await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('aufblasen'));
await page.mouse.move(r.x + ziel.px, r.y + ziel.py);
await page.waitForTimeout(300);
await page.mouse.down();
for (let i = 1; i <= 14; i++) { await page.mouse.move(r.x + ziel.px + 6 * i, r.y + ziel.py - 6 * i); await page.waitForTimeout(30); }
await page.mouse.up();
await page.waitForTimeout(3000);
console.log('nach I (gefolgt):', JSON.stringify(await lage()));
const blatt = await page.evaluate(() => { const s = Object.values(window.__stores).find((st) => st.getState?.()?.info?.blatt); return s ? s.getState().info.blatt : null; });
console.log('Δ je Blatt nach dem Folgen:', JSON.stringify(blatt && Object.fromEntries(Object.entries(blatt).map(([k, v]) => [k, +v.max.toFixed(1)]))));
await page.mouse.move(r.x + 10, r.y + 10);
await page.evaluate(() => { window.__stores.ui.getState().maximieren(null); });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/folgen-riss.png` });
// Undo: ein Schritt nimmt Strich und Folgen zurück
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(1500);
console.log('nach Undo:', JSON.stringify(await lage()));
await browser.close();
