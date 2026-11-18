// Zähne auf der Bühne wählen und ziehen (Phase 2 M4, Schritt 4), im normalen Editor: Rex aus der Library, Stufe Zähne,
// Maul offen; Klick auf einen unteren Zahn wählt ihn (Marke, Tafel), Ziehen längs des Zahnfleischs ändert u (Spiegelpartner
// folgt), Klick daneben hebt die Wahl auf, Undo nimmt das Ziehen zurück. Über run-check.sh (eigener Vite, 5192).
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
  ui.maximieren('creation');
  ui.setzeOeffnung(1);
  ui.setzeKamera({ azimut: (-90 * Math.PI) / 180, elevation: (-10 * Math.PI) / 180, distanz: 1.0, ziel: [-0.25, 0.24, 0] });
});
await page.waitForTimeout(2500);
const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
const zaehne = await page.evaluate(() => window.__editor.zahnPixel());
const ziel = zaehne.filter((q) => q.kiefer === 'unten' && q.seite === 1).sort((a, b) => a.u - b.u)[1];
console.log('Ziel: unterer Zahn', JSON.stringify(ziel));
const ax = rc.x + ziel.x;
const ay = rc.y + ziel.y;
// Klick wählt
await page.mouse.click(ax, ay);
await page.waitForTimeout(600);
const wahl = await page.evaluate(() => ({ auswahl: window.__stores.ui.getState().zahnAuswahl, tafel: document.querySelector('[data-zahn-auswahl]')?.getAttribute('data-zahn-auswahl'), dok: !!window.__stores.editor.getState().dok.zaehne }));
console.log('nach Klick:', JSON.stringify(wahl));
await page.screenshot({ path: resolve(AUSGABE, 'zahn-griffe-gewaehlt.png'), clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
// Ziehen längs des Zahnfleischs: zum nächsten unteren Zahn hin (weiter zum Mundwinkel)
const weiter = zaehne.filter((q) => q.kiefer === 'unten' && q.seite === 1).sort((a, b) => a.u - b.u)[2];
const u0 = ziel.u;
await page.mouse.move(ax, ay);
await page.mouse.down();
for (let k = 1; k <= 10; k++) await page.mouse.move(ax + ((rc.x + weiter.x - ax) * k) / 20, ay + ((rc.y + weiter.y - ay) * k) / 20);
await page.mouse.up();
await page.waitForTimeout(1500);
const nach = await page.evaluate(() => {
  const z = window.__stores.editor.getState().dok.zaehne;
  return { u: z?.unten.zaehne.map((e) => +e.u.toFixed(3)), oben: z?.oben.zaehne.map((e) => +e.u.toFixed(3)), liste: window.__editor.zahnPixel().filter((q) => q.kiefer === 'unten').map((q) => `${q.index}${q.seite > 0 ? 'r' : q.seite < 0 ? 'l' : 'm'}:${q.u.toFixed(3)}`) };
});
console.log(`gezogen: u ${u0.toFixed(3)} → Dokument unten`, JSON.stringify(nach.u), 'Liste', JSON.stringify(nach.liste));
await page.screenshot({ path: resolve(AUSGABE, 'zahn-griffe-gezogen.png'), clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
// Undo nimmt das Ziehen zurück (das Dokument war vorher ohne Zähne: Automatik)
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(1200);
console.log('Undo:', JSON.stringify(await page.evaluate(() => window.__stores.editor.getState().dok.zaehne?.unten.zaehne.map((e) => +e.u.toFixed(3)) ?? 'Automatik')));
// Klick ins Leere hebt die Wahl auf
await page.mouse.click(rc.x + 30, rc.y + 30);
await page.waitForTimeout(400);
console.log('Klick daneben:', JSON.stringify(await page.evaluate(() => window.__stores.ui.getState().zahnAuswahl)));
// geschlossen: innere Zähne sind verdeckt und nicht greifbar, außen-Zähne schon
await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0));
await page.waitForTimeout(1500);
const zu = await page.evaluate(() => window.__editor.zahnPixel());
const innen = zu.filter((q) => q.kiefer === 'unten' && q.seite === 1)[1];
await page.mouse.click(rc.x + innen.x, rc.y + innen.y);
await page.waitForTimeout(400);
const wahlInnen = await page.evaluate(() => window.__stores.ui.getState().zahnAuswahl);
const aussen = zu.filter((q) => q.kiefer === 'oben' && q.seite === 1)[1];
await page.mouse.click(rc.x + aussen.x, rc.y + aussen.y);
await page.waitForTimeout(400);
const wahlAussen = await page.evaluate(() => window.__stores.ui.getState().zahnAuswahl);
console.log('geschlossen: innerer Zahn →', JSON.stringify(wahlInnen), '· außen-Fang →', JSON.stringify(wahlAussen));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
