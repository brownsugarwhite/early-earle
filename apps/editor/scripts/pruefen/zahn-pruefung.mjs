// Zahnprüfung im Editor (Phase 2 M4, Schritt 6): Rex, Stufe Zähne; Automatik „alle frei“; ein unterer Zahn geschlossen
// zu lang → Befund mit Vorschlägen, Glut; Vorschlag anwenden → frei; Undo → Befund zurück. Über run-check.sh (5192).
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
  ui.setzeOeffnung(0.3);
  ui.setzeKamera({ azimut: (-60 * Math.PI) / 180, elevation: (20 * Math.PI) / 180, distanz: 0.7, ziel: [-0.24, 0.21, 0.04] });
});
// auf eine abgeschlossene Prüfung des aktuellen Dokuments warten (Zähler `fertig` der Prüfung, gültig für dieses Dokument)
let zuletzt = 0;
const warte = async () => {
  await page.waitForFunction(
    (z) => {
      const p = window.__stores.zahnPruefung.getState();
      return p.fertig > z && !p.laeuft && p.dok === window.__stores.editor.getState().dok;
    },
    zuletzt,
    { timeout: 30_000 },
  );
  zuletzt = await page.evaluate(() => window.__stores.zahnPruefung.getState().fertig);
  await page.waitForTimeout(300);
};
const stand = () => page.evaluate(() => ({ befunde: document.querySelector('[data-zahn-befunde]')?.getAttribute('data-zahn-befunde'), text: document.querySelector('[data-zahn-befunde]')?.textContent, zeilen: [...document.querySelectorAll('[data-zahn-befund]')].map((e) => e.textContent) }));
await warte();
console.log('Automatik:', JSON.stringify(await stand()));
// unteren Zahn 1 wählen, Werte für zu, Länge 30 px
await page.evaluate(() => window.__stores.ui.getState().setzeZahnAuswahl({ kiefer: 'unten', index: 0 }));
await page.waitForTimeout(300);
await page.click('[data-zahn-werte="zu"]');
await page.waitForTimeout(200);
await page.evaluate(() => {
  const l = [...document.querySelectorAll('[data-bereich="zaehne"] label.regler')].find((x) => x.querySelector('span')?.textContent === 'Länge');
  const el = l.querySelector('input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(30 / 461));
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await warte();
const s1 = await stand();
console.log('unten 1 zu lang:', JSON.stringify(s1));
const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects);
await page.screenshot({ path: resolve(AUSGABE, 'zahn-pruefung-glut.png'), clip: { x: rc.creation.x, y: rc.creation.y, width: rc.creation.w, height: rc.creation.h } });
await page.screenshot({ path: resolve(AUSGABE, 'zahn-pruefung-tafel.png'), clip: { x: rc.leiste.x, y: rc.leiste.y, width: rc.leiste.w, height: Math.min(rc.leiste.h, 700) } });
// ersten Vorschlag anwenden
const chip = await page.$('[data-zahn-vorschlag^="unten:0:"]');
const chipText = chip ? await chip.textContent() : null;
if (chip) await chip.click();
await warte();
console.log(`Vorschlag „${chipText}“ angewandt:`, JSON.stringify(await stand()), 'Länge jetzt', await page.evaluate(() => (window.__stores.editor.getState().dok.zaehne.unten.zaehne[0].laenge * 461).toFixed(1)));
// Undo
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await warte();
console.log('Undo:', JSON.stringify(await stand()));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
