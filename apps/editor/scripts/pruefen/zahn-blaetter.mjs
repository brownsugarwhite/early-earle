// Zähne in den Blättern wählen und ziehen (Phase 2 M4, Schritt 4), Layout Riss: Klick in der Seite wählt einen oberen
// Fang, Ziehen in der Front verschiebt einen unteren Zahn längs des Zahnfleischs, Klick daneben hebt die Wahl auf.
// Über run-check.sh (eigener Vite, 5192).
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
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
await page.click('[data-pruefwesen="rex"]');
await page.waitForTimeout(3500);
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('zaehne');
  if (ui.maximiert) ui.maximieren(null);
  ui.setzeOeffnung(0.6);
});
await page.waitForTimeout(2500);
const rects = await page.evaluate(() => window.__stores.rahmen.getState().rects);
// Seite: oberer Fang (außen) wählen
const seite = await page.evaluate(() => window.__editor.zahnPixel('seite'));
const fang = seite.filter((q) => q.kiefer === 'oben' && q.seite === 1).sort((a, b) => a.u - b.u)[2];
await page.mouse.click(rects.seite.x + fang.x, rects.seite.y + fang.y);
await page.waitForTimeout(500);
console.log('Seite, Klick auf oben', fang.index, '→', JSON.stringify(await page.evaluate(() => window.__stores.ui.getState().zahnAuswahl)));
// Front: unteren Zahn ziehen
const front = await page.evaluate(() => window.__editor.zahnPixel('front'));
const unten = front.filter((q) => q.kiefer === 'unten' && q.seite === 1).sort((a, b) => a.u - b.u);
const a = unten[1];
const b = unten[unten.length - 1];
console.log(`Front: Weg von unten ${a.index} zu unten ${b.index}: ${Math.hypot(b.x - a.x, b.y - a.y).toFixed(1)} px`);
const ax = rects.front.x + a.x;
const ay = rects.front.y + a.y;
await page.mouse.move(ax, ay);
await page.mouse.down();
for (let k = 1; k <= 10; k++) await page.mouse.move(ax + ((rects.front.x + b.x - ax) * k) / 20, ay + ((rects.front.y + b.y - ay) * k) / 20);
await page.mouse.up();
await page.waitForTimeout(1500);
const nach = await page.evaluate(() => ({ auswahl: window.__stores.ui.getState().zahnAuswahl, unten: window.__stores.editor.getState().dok.zaehne?.unten.zaehne.map((e) => +e.u.toFixed(3)) }));
console.log(`Front, unten ${a.index} gezogen (u ${a.u.toFixed(3)} → zum nächsten ${b.u.toFixed(3)}):`, JSON.stringify(nach));
await page.screenshot({ path: resolve(AUSGABE, 'zahn-blaetter.png') });
// Klick ins Leere (Seite) hebt die Wahl auf
await page.mouse.click(rects.seite.x + 20, rects.seite.y + rects.seite.h - 20);
await page.waitForTimeout(400);
console.log('Klick daneben:', JSON.stringify(await page.evaluate(() => window.__stores.ui.getState().zahnAuswahl)));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
