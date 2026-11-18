// Form zuerst (04.11.2026): alle Ansichten gleichwertig — Bilder der Prüffälle im kleinen Fenster. Je Fall zeigen Seite,
// Front und Top die Zeichnung (türkis) unter dem Umriss des Modells (schwarz), dazu das 3D.
// Aufruf aus apps/editor: node scripts/pruefen/form-gleich-bild.mjs <ordner> [fall …] (SUFFIX hängt z. B. ein Datum an)
// Erwartet den Vite-Server des Arbeitsbaums (FORM_URL, Standard http://localhost:5193/form.html).
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const faelle = process.argv.length > 3 ? process.argv.slice(3) : ['kugel', 'beine', 'flossen', 'lappen', 'innen'];
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(process.env.FORM_URL ?? 'http://localhost:5193/form.html');
await seite.waitForFunction(() => window.__form?.fein === true);
for (const fall of faelle) {
  await seite.evaluate((f) => window.__formPruefall(f), fall);
  await seite.waitForFunction(() => window.__form?.fein === true && window.__form.ellipsoide !== null);
  await seite.waitForTimeout(400);
  const pfad = `${ordner}/form-gleich-${fall}${process.env.SUFFIX ?? ''}.jpg`;
  await seite.screenshot({ path: pfad, type: 'jpeg', quality: 88 });
  const info = await seite.evaluate(() => ({
    dreiecke: window.__form.dreiecke,
    ms: Math.round(window.__form.ms),
    ellipsoide: window.__form.ellipsoide,
  }));
  console.log(pfad, JSON.stringify(info));
}
if (fehler.length) console.log('Fehler:', fehler);
await browser.close();
