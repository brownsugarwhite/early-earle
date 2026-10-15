// Florian 15.10.: „Im Fressen-Tab kann ich nichts mehr verschieben.“ Prüfmatrix: Wesen (Kugel ohne Maul, Fisch mit
// Rundmaul, Rex, Tiger) × Stufe (Körper, Posen & Leben). Kopfzeile „Fressen“ klicken, Pinsel G, auf dem Körper ziehen;
// gemessen: Fressen-Deltas im Dokument und ob sich das Netz sichtbar ändert. Über run-check.sh (eigener Vite, 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
const nur = process.argv[2] ? process.argv[2].split(',') : ['kugel', 'fisch', 'rex', 'tiger'];
const laden = async (id) => {
  if (id === 'kugel') {
    await page.evaluate(() => window.__stores.editor.getState().neu());
    await page.waitForTimeout(2500);
    return;
  }
  await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
  await page.waitForTimeout(300);
  await page.click(`[data-pruefwesen="${id}"]`);
  const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
  if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
  await page.waitForTimeout(3500);
};
// Fingerabdruck der Netzlagen (Summe der Koordinaten) über den Testhaken des Netzes
const abdruck = () => page.evaluate(() => window.__editor.wesen()?.summe ?? null);
for (const id of nur) {
  await laden(id);
  for (const stufe of ['form', 'posen']) {
    await page.evaluate((stufe) => {
      const ed = window.__stores.editor.getState();
      // saubere Ausgangslage: Fressen-Deltas leeren
      const k = ed.dok.kaefig;
      if (k?.posen?.fressen) {
        const posen = { ...k.posen };
        delete posen.fressen;
        ed.setzeDokument({ ...ed.dok, kaefig: { ...k, posen } });
      }
      const ui = window.__stores.ui.getState();
      ui.setzeEbene(stufe);
      ui.maximieren('creation');
    }, stufe);
    await page.waitForTimeout(800);
    // Kopfzeile „Fressen“
    await page.locator('button.pille', { hasText: 'Fressen' }).first().click();
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const ui = window.__stores.ui.getState();
      ui.setzeWerkzeug?.('ziehen');
      ui.setzeKamera({ azimut: (-60 * Math.PI) / 180, elevation: (10 * Math.PI) / 180, distanz: 2.0, ziel: [0, 0.25, 0] });
    });
    await page.waitForTimeout(1500);
    const vor = await page.evaluate(() => ({ modus: window.__stores.editor.getState().modus, oeffnung: window.__stores.ui.getState().oeffnung, werkzeug: window.__stores.ui.getState().werkzeug, ebene: window.__stores.ui.getState().ebene }));
    const a0 = await abdruck();
    const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
    const x = rc.x + rc.w * 0.5;
    const y = rc.y + rc.h * 0.45;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let k = 1; k <= 10; k++) await page.mouse.move(x + 3 * k, y - 4 * k);
    await page.mouse.up();
    await page.waitForTimeout(2500);
    const nach = await page.evaluate(() => ({ fressen: window.__stores.editor.getState().dok.kaefig?.posen?.fressen?.length ?? 0, deltas: window.__stores.editor.getState().dok.kaefig?.deltas?.length ?? 0, kamera: window.__stores.ui.getState().kamera?.azimut }));
    const a1 = await abdruck();
    await page.screenshot({ path: resolve(AUSGABE, `fressen-pinsel-${id}-${stufe}.png`), clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
    console.log(`${id} · Stufe ${stufe}: ${JSON.stringify(vor)} → Fressen-Deltas ${nach.fressen}, Grund-Deltas ${nach.deltas}, Netz geändert: ${a0 === null ? '?' : Math.abs(a1 - a0) > 1e-6 ? 'ja' : 'nein'}, Kamera-Azimut ${nach.kamera?.toFixed?.(2)}`);
    // Editor-Tab zurück
    await page.locator('button.pille', { hasText: 'Editor' }).first().click();
    await page.waitForTimeout(1500);
  }
}
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
