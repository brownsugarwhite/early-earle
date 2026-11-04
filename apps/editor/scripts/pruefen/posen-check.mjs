// Posenliste im Editor (Phase 2 M3): Kugel, Stufe „Posen & Leben“ → „+ Ruhen“, Stufe Körper: Pinsel G in der Pose,
// Stärke 50 %, zurück zum Editor-Modus (Grundform), Undo. Je Schritt Deltas, Punkt-Lage, Bilder. Über run-check.sh.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text().slice(0, 200)); });
await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.waitForTimeout(1500);
const stand = (wo) => page.evaluate((wo) => {
  const ed = window.__stores.editor.getState();
  const w = window.__editor.wesen?.();
  return { wo, modus: ed.modus, posen: ed.dok.posen, ruhen: ed.dok.kaefig?.posen?.ruhen?.length ?? 0, grund: ed.dok.kaefig?.deltas?.length ?? 0, staerke: window.__stores.ui.getState().poseStaerke, verlauf: ed.verlauf.length, ableitung: w?.ableitung ?? null, deltasText: document.querySelector('[data-pose-deltas]')?.textContent ?? null };
}, wo);
// Stufe Posen & Leben, Neue Pose „Ruhen“ über die Tafel
await page.evaluate(() => window.__stores.ui.getState().setzeEbene('posen'));
await page.waitForTimeout(800);
await page.click('[data-pose-neu="ruhen"]');
await page.waitForTimeout(1200);
console.log(JSON.stringify(await stand('Ruhen angelegt')));
// Stufe Körper, Bühne, Pinsel G mitten auf dem Körper
await page.evaluate(() => { const ui = window.__stores.ui.getState(); ui.setzeEbene('form'); ui.maximieren('creation'); ui.setzeWerkzeug('ziehen'); });
await page.waitForTimeout(1500);
const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
const x = rc.x + rc.w * 0.5, y = rc.y + rc.h * 0.45;
await page.mouse.move(x, y);
await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(x, y - 6 * i); await page.waitForTimeout(40); }
await page.mouse.up();
await page.waitForTimeout(1800);
console.log(JSON.stringify(await stand('Pinsel in der Pose')));
await page.screenshot({ path: `${AUSGABE}/posen-1-ruhen-voll.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
await page.evaluate(() => window.__stores.ui.getState().setzePoseStaerke(0.5));
await page.waitForTimeout(1500);
console.log(JSON.stringify(await stand('Stärke 50 %')));
await page.screenshot({ path: `${AUSGABE}/posen-2-ruhen-halb.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
await page.evaluate(() => window.__stores.editor.getState().setzeModus('editor'));
await page.waitForTimeout(1500);
console.log(JSON.stringify(await stand('Editor-Modus')));
await page.screenshot({ path: `${AUSGABE}/posen-3-grundform.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(1200);
console.log(JSON.stringify(await stand('Undo')));
console.log('Fehler:', fehler.filter((f) => !f.includes('THREE.TSL')).slice(0, 5));
await browser.close();
