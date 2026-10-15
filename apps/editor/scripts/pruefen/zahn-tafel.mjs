// Tafel „Zähne“ (Phase 2 M4, Schritt 3) im normalen Editor: Rex aus der Library, Stufe Zähne, Automatik → „+“ oben
// (Dokument übernimmt), Länge für alle (im Verhältnis), Neigung für einen gewählten Zahn, Werte für offen (auf), zurück zur
// Automatik; je Schritt: Dokument, Zahl der gebauten Zähne, keine neue Ableitung. Über run-check.sh (eigener Vite, 5192).
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
  ui.setzeOeffnung(1);
  ui.setzeKamera({ azimut: (-55 * Math.PI) / 180, elevation: (8 * Math.PI) / 180, distanz: 1.1, ziel: [-0.25, 0.24, 0] });
});
await page.waitForTimeout(2500);

const stand = () =>
  page.evaluate(() => {
    const ed = window.__stores.editor.getState();
    const z = ed.dok.zaehne;
    const w = window.__editor.wesen();
    const herkunft = document.querySelector('[data-zahn-herkunft]')?.getAttribute('data-zahn-herkunft');
    const oben = document.querySelector('[data-zahnanzahl="oben"]')?.textContent;
    const unten = document.querySelector('[data-zahnanzahl="unten"]')?.textContent;
    return {
      herkunft,
      anzeige: `${oben}/${unten}`,
      dok: z ? { oben: z.oben.anzahl, unten: z.unten.anzahl, laengen: z.oben.zaehne.map((e) => +(e.laenge * 461).toFixed(2)), auf: z.oben.zaehne.map((e) => (e.auf?.laenge !== undefined ? +(e.auf.laenge * 461).toFixed(2) : null)), neigung: z.oben.zaehne.map((e) => e.neigung) } : null,
      ableitung: w.ableitung,
    };
  });
const regler = async (label, wert) => {
  await page.evaluate(
    ({ label, wert }) => {
      const l = [...document.querySelectorAll('[data-bereich="zaehne"] label.regler')].find((x) => x.querySelector('span')?.textContent === label);
      const el = l.querySelector('input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(wert));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    { label, wert },
  );
  await page.waitForTimeout(900);
};
const bild = async (name) => {
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects);
  await page.screenshot({ path: resolve(AUSGABE, `${name}-buehne.png`), clip: { x: rc.creation.x, y: rc.creation.y, width: rc.creation.w, height: rc.creation.h } });
  await page.screenshot({ path: resolve(AUSGABE, `${name}-tafel.png`), clip: { x: rc.leiste.x, y: rc.leiste.y, width: rc.leiste.w, height: Math.min(rc.leiste.h, 1000) } });
};

const s0 = await stand();
console.log('Automatik:', JSON.stringify(s0));
await bild('zahn-tafel-0');
await page.click('[data-zahn-mehr="oben"]');
await page.waitForTimeout(1500);
const s1 = await stand();
console.log('+ oben:', JSON.stringify(s1));
// Länge für alle (oben und unten), Werte für zu
await page.click('[data-zahn-werte="zu"]');
await page.waitForTimeout(300);
const vorher = s1.dok.laengen;
await regler('Länge', (vorher[0] * 1.5) / 461);
const s2 = await stand();
console.log('Länge ×1,5 alle (zu):', JSON.stringify(s2.dok.laengen), 'Verhältnis', (s2.dok.laengen[3] / vorher[3]).toFixed(3));
// einen Zahn wählen (oben 2), Neigung 20°
await page.evaluate(() => window.__stores.ui.getState().setzeZahnAuswahl({ kiefer: 'oben', index: 1 }));
await page.waitForTimeout(300);
await regler('Neigung', 20);
const s3 = await stand();
console.log('Neigung oben 2 = 20°:', JSON.stringify(s3.dok.neigung));
// Werte für offen: Länge des gewählten Zahns 30 px offen
await page.click('[data-zahn-werte="offen"]');
await page.waitForTimeout(300);
await regler('Länge', 30 / 461);
const s4 = await stand();
console.log('offen 30 px (oben 2):', JSON.stringify(s4.dok.auf));
await bild('zahn-tafel-1');
// gewählten Zahn löschen (oben 2: ein Paar, 13 → 11), dann gleichmäßig verteilen
await page.click('[data-zahn-loeschen]');
await page.waitForTimeout(1200);
const s4b = await page.evaluate(() => {
  const z = window.__stores.editor.getState().dok.zaehne;
  return { oben: z.oben.anzahl, eintraege: z.oben.zaehne.length, u: z.oben.zaehne.map((e) => +e.u.toFixed(3)), gebaut: window.__editor.zahnPixel().filter((q) => q.kiefer === 'oben').length, auswahl: window.__stores.ui.getState().zahnAuswahl };
});
console.log('Zahn oben 2 gelöscht:', JSON.stringify(s4b));
await page.click('[data-zahn-verteilen]');
await page.waitForTimeout(1200);
console.log('verteilt:', JSON.stringify(await page.evaluate(() => window.__stores.editor.getState().dok.zaehne.oben.zaehne.map((e) => +e.u.toFixed(3)))));
// zurück zur Automatik
await page.click('[data-zahn-automatik]');
await page.waitForTimeout(1500);
const s5 = await stand();
console.log('Automatik zurück:', JSON.stringify(s5));
// Undo stellt das Dokument wieder her
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig?.() ?? window.__stores.editor.getState().undo?.());
await page.waitForTimeout(1200);
const s6 = await stand();
console.log('Undo:', JSON.stringify({ herkunft: s6.herkunft, dok: s6.dok ? s6.dok.oben : null }));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
