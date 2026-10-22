// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1: Florians Beispiel — der vordere Bauchpunkt (Knoten der Seite) erscheint im
// Top unter der Nase als blasser Ring und lässt sich dort greifen. Lädt die Giraffe mit Bauch vor der Nase, schwebt über dem
// vordersten Bauchknoten im Seitenblatt (Marke in allen Blättern und auf der Bühne) und hält das ganze Fenster fest.
// Eigener Vite über run-check.sh (nie 5180). Umgebung: AUSGABE, NETZSTIL (ton|farbe).
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const stil = process.env.NETZSTIL ?? 'farbe';
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/grundkoerper.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${url}/?look=earle&palette=blob`);
await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
await page.evaluate(async ({ modul, stil }) => {
  const g = await import(modul);
  window.__stores.ui.setState({ netzStil: stil });
  window.__stores.editor.getState().laden(g.gKoerperDokument('giraffe-bauch'), null);
}, { modul, stil });
await page.waitForFunction(() => document.querySelectorAll('[data-netz-knoten]').length > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
await page.waitForTimeout(1500);
// vorderster Knoten der Seite in der unteren Hälfte (Bauch vor der Nase)
const i = await page.evaluate(() => {
  const kn = window.__stores.editor.getState().dok.profile.seite.knoten;
  const ys = kn.map((k) => k.p.y);
  const mitte = (Math.min(...ys) + Math.max(...ys)) / 2;
  let best = -1;
  kn.forEach((k, j) => {
    if (k.p.y < mitte && (best < 0 || k.p.x < kn[best].p.x)) best = j;
  });
  return best;
});
const ring = page.locator(`.vp-ober[data-view="top"] [data-netz-knoten="seite:${i}"]`);
const sicht = await ring.getAttribute('data-sicht');
console.log(`Bauchknoten ${i} der Seite: Ring im Top ${sicht === '0' ? 'verdeckt (blass)' : 'sichtbar'}`);
await page.locator(`.vp-ober[data-view="seite"] [data-knoten="${i}"] .knoten-punkt`).hover();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/netz-bauchpunkt-${stil}.png` });
// Bauchpunkt im Top greifen und längs ziehen (gemeinsame Koordinate x)
const vorher = await page.evaluate((i) => window.__stores.editor.getState().dok.profile.seite.knoten[i].p, i);
const box = await ring.locator('circle').nth(1).boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
for (let k = 1; k <= 8; k++) await page.mouse.move(box.x + box.width / 2 - 4 * k, box.y + box.height / 2 + 2 * k);
await page.mouse.up();
await page.waitForTimeout(1500);
const nach = await page.evaluate((i) => window.__stores.editor.getState().dok.profile.seite.knoten[i].p, i);
console.log(`im Top gezogen: Seite x ${vorher.x.toFixed(4)} → ${nach.x.toFixed(4)}, y unverändert ${Math.abs(nach.y - vorher.y) < 1e-9}`);
await page.screenshot({ path: `${out}/netz-bauchpunkt-${stil}-gezogen.png` });
await browser.close();
