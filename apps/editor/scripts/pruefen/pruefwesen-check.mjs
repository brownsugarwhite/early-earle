// Wächter: alle Prüfwesen der Library im Editor laden (wie Florian: Klick in der Library), je Wesen Δ der Blätter, Lippen,
// Punktzahl, eingefrorener Maulzustand, Fehler; Bühne zu und 60 % offen. Aufruf über run-check.sh.
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
page.on('dialog', (d) => d.accept());
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(500);
const ids = await page.evaluate(() => [...document.querySelectorAll('[data-pruefwesen]')].map((e) => e.getAttribute('data-pruefwesen')));
console.log('Prüfwesen', ids.join(', '));
for (const id of (process.env.NUR?.split(',') ?? ids)) {
  await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0));
  await page.click(`[data-pruefwesen="${id}"]`);
  await page.waitForTimeout(3500);
  const z = await page.evaluate(() => ({ delta: [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent), lippen: document.querySelector('.vp-lippe')?.textContent ?? null, punkte: window.__editor.vertices(), maulStand: window.__stores.editor.getState().dok.kaefig?.stationen?.maul ?? null, maul: !!window.__editor.wesen?.()?.maul }));
  console.log(id, JSON.stringify(z));
  await page.evaluate(() => { window.__stores.ui.getState().maximieren('creation'); });
  await page.waitForTimeout(1200);
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  await page.screenshot({ path: `${AUSGABE}/pruefwesen-${id}-zu.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
  if (z.maul) {
    await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0.6));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${AUSGABE}/pruefwesen-${id}-offen.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
  }
  await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
}
console.log('Fehler:', fehler.filter((f) => !f.includes('THREE.TSL')).slice(0, 8));
await browser.close();
