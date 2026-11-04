// Form zuerst (04.11.2026): Bild des kleinen Fensters mit einer gesetzten Zeichnung.
// Aufruf aus apps/editor: node scripts/pruefen/form-bild.mjs <ausgabe.jpg> [form]
// Erwartet den Vite-Server des Arbeitsbaums (FORM_URL, Standard http://localhost:5193/form.html).
import { chromium } from '@playwright/test';

const FORMEN = {
  kugel: [{ x: 150, y: 0 }, { x: 0, y: 150 }, { x: -150, y: 0 }, { x: 0, y: -150 }],
  ei: [{ x: 284, y: 0 }, { x: 0, y: 150 }, { x: -150, y: 0 }, { x: 0, y: -150 }],
  langhals: [
    { x: 230, y: -20, ecke: true }, { x: 150, y: 40 }, { x: 20, y: 45 }, { x: -80, y: 70 }, { x: -115, y: 170 }, { x: -140, y: 225 },
    { x: -200, y: 248 }, { x: -265, y: 212 }, { x: -200, y: 185 }, { x: -160, y: 150 }, { x: -150, y: 40 }, { x: -130, y: -60 },
    { x: -40, y: -105, ecke: true }, { x: 110, y: -100 },
  ],
};

const ausgabe = process.argv[2] ?? 'form.jpg';
const form = FORMEN[process.argv[3] ?? 'langhals'];
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await seite.goto(process.env.FORM_URL ?? 'http://localhost:5193/form.html');
await seite.waitForFunction(() => window.__form?.fein === true);
await seite.evaluate((p) => window.__formSetzen(p), form);
await seite.waitForFunction((n) => window.__form?.fein === true && window.__form.punkte.length === n, form.length);
await seite.waitForTimeout(300);
await seite.screenshot({ path: ausgabe, type: 'jpeg', quality: 88 });
const info = await seite.evaluate(() => ({ dreiecke: window.__form.dreiecke, ms: Math.round(window.__form.ms) }));
console.log(ausgabe, info);
await browser.close();
