// Blobzähne und vor/zurück (Florian 15.10.): Rex aus der Library, Stufe Zähne. Tafel: Schärfe für alle Zähne auf −1
// (Blob, runde Kappe ohne Spitze) und kürzer; dann einen unteren Zahn mit ⌥ ziehen (vor/zurück, überschneidet den
// Nachbarn), Regler „vor/zurück“ für alle; Undo. Bilder offen und zu, vorher/nachher. Über run-check.sh (eigener Vite, 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
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
const KAM = [-62, 6, 0.95, -0.27, 0.25, 0];
const kamera = (k) =>
  page.evaluate((k) => {
    window.__stores.ui.getState().setzeKamera({ azimut: (k[0] * Math.PI) / 180, elevation: (k[1] * Math.PI) / 180, distanz: k[2], ziel: [k[3], k[4], k[5]] });
  }, k);
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('zaehne');
  ui.maximieren('creation');
  ui.setzeOeffnung(1);
  ui.setzeBlinzeln(false);
});
await kamera(KAM);
await page.waitForTimeout(2500);
const bilder = [];
const bild = async (text) => {
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x + r.w * 0.22, y: r.y + r.h * 0.14, width: r.w * 0.56, height: r.h * 0.72 } });
  bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text });
};
const pruefung = async () => {
  // die Prüfung startet nach 350 ms Ruhe; warten, bis sie gelaufen ist
  await page.waitForTimeout(900);
  await page.waitForFunction(() => !window.__stores.zahnPruefung.getState().laeuft, null, { timeout: 30_000 }).catch(() => null);
  await page.waitForTimeout(300);
  return page.evaluate(() => document.querySelector('[data-zahn-befunde]')?.textContent ?? '');
};
const zuUndOffen = async (titel) => {
  for (const oe of [1, 0]) {
    await page.evaluate((oe) => window.__stores.ui.getState().setzeOeffnung(oe), oe);
    await page.waitForTimeout(1500);
    await bild(`${titel} · ${oe ? 'offen' : 'zu'}`);
  }
  await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(1));
  await page.waitForTimeout(1200);
};
// Regler über den nativen Setter (React)
const regler = (label, wert) =>
  page.evaluate(
    ({ label, wert }) => {
      const feld = [...document.querySelectorAll('.regler, label, .feld')].find((el) => el.textContent?.trim().startsWith(label) && el.querySelector('input[type=range]'));
      const el = feld?.querySelector('input[type=range]');
      if (!el) return false;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(wert));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value;
    },
    { label, wert },
  );
const zaehneDok = () => page.evaluate(() => window.__stores.editor.getState().dok.zaehne);

await zuUndOffen('Automatik (spitz)');
console.log('Prüfung Automatik:', await pruefung());
// alle Zähne: Blob; Werte für das geschlossene Maul (gelten offen mit, solange „offen“ nichts Eigenes hat)
await page.click('[data-zahn-werte="zu"]');
await page.waitForTimeout(300);
console.log('Schärfe →', await regler('Schärfe', -1));
await page.waitForTimeout(800);
const dokBlob = await zaehneDok();
console.log('Schärfe im Dokument:', JSON.stringify(dokBlob?.oben.zaehne.map((e) => e.schaerfe)), JSON.stringify(dokBlob?.unten.zaehne.map((e) => e.schaerfe)));
console.log('Tafel-Anzeige:', await page.evaluate(() => [...document.querySelectorAll('.feld, label')].map((el) => el.textContent?.trim() ?? '').find((t) => t.startsWith('Schärfe'))));
await zuUndOffen('alle Zähne Blob');
console.log('Prüfung Blob:', await pruefung());
// ⌥-Ziehen an einem unteren Zahn: vor/zurück
const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
const zp = await page.evaluate(() => window.__editor.zahnPixel());
const ziel = zp.filter((q) => q.kiefer === 'unten' && q.seite === 1).sort((a, b) => a.u - b.u)[1];
console.log('Ziel:', JSON.stringify(ziel));
const ax = rc.x + ziel.x;
const ay = rc.y + ziel.y;
const verlauf0 = await page.evaluate(() => window.__stores.editor.getState().verlauf.length);
await page.keyboard.down('Alt');
await page.mouse.move(ax, ay);
await page.mouse.down();
for (let k = 1; k <= 10; k++) await page.mouse.move(ax - 4 * k, ay + 1 * k);
await page.mouse.up();
await page.keyboard.up('Alt');
await page.waitForTimeout(1200);
const nachZug = await zaehneDok();
const e1 = nachZug?.unten.zaehne[ziel.index];
const verlauf1 = await page.evaluate(() => window.__stores.editor.getState().verlauf.length);
// Vorzeichen: der Zahn wandert auf dem Bild mit dem Zug (Skalarprodukt mit der Zugrichtung > 0)
const zp1 = await page.evaluate(() => window.__editor.zahnPixel());
const nachher = zp1.find((q) => q.kiefer === 'unten' && q.seite === 1 && q.index === ziel.index);
const dxz = nachher.x - ziel.x;
const dyz = nachher.y - ziel.y;
console.log(`Zahn auf dem Bild: (${dxz.toFixed(1)}, ${dyz.toFixed(1)}) px bei Zug (−40, 10) → ${dxz * -40 + dyz * 10 > 0 ? '✓ mit dem Zug' : '✗ gegen den Zug'}`);
console.log(`⌥-Zug: vor ${e1?.vor?.toFixed(4)} (${((e1?.vor ?? 0) * 461).toFixed(1)} px), u ${e1?.u?.toFixed(3)} (vorher ${ziel.u.toFixed(3)}), Undo-Schritte +${verlauf1 - verlauf0}`);
console.log('Tafel vor/zurück:', await page.evaluate(() => [...document.querySelectorAll('.feld, label')].map((el) => el.textContent?.trim() ?? '').find((t) => t.startsWith('vor/zurück'))));
await zuUndOffen('ein Zahn mit ⌥ verschoben');
console.log('Prüfung mit Versatz:', await pruefung());
// Regler vor/zurück für alle Zähne (ohne Auswahl)
await page.evaluate(() => window.__stores.ui.getState().setzeZahnAuswahl(null));
await page.waitForTimeout(500);
console.log('vor/zurück alle →', await regler('vor/zurück', -0.004));
await page.waitForTimeout(800);
const alle = await zaehneDok();
console.log('vor im Dokument:', JSON.stringify(alle?.oben.zaehne.map((e) => e.vor)), JSON.stringify(alle?.unten.zaehne.map((e) => e.vor)));
await zuUndOffen('alle 1,8 px zurück');
// Undo bis zur Automatik
const vorUndo = await page.evaluate(() => window.__stores.editor.getState().verlauf.length);
for (let i = 0; i < 3; i++) await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(1500);
const nachUndo = await page.evaluate(() => ({ dok: window.__stores.editor.getState().dok.zaehne ? 'Dokument' : 'Automatik', verlauf: window.__stores.editor.getState().verlauf.length }));
console.log(`Undo ×3: ${JSON.stringify(nachUndo)} (vorher ${vorUndo})`);
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1860px"><div style="display:grid;grid-template-columns:repeat(4,460px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:460px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'zahn-blob-vor.html'), html);
await page.setViewportSize({ width: 1860, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'zahn-blob-vor.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'zahn-blob-vor.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
