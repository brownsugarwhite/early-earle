// Form zuerst (04.11.2026): Bild des kleinen Fensters mit einer gesetzten Zeichnung.
// Aufruf aus apps/editor: node scripts/pruefen/form-bild.mjs <ausgabe.jpg> [form] [linien] [strichdicke]
// Erwartet den Vite-Server des Arbeitsbaums (FORM_URL, Standard http://localhost:5193/form.html).
// „braue“: Linie über den Scheitel der Kugel gezeichnet, danach der obere Punkt unter die Linie gezogen.
import { chromium } from '@playwright/test';

const KUGEL = [{ x: 150, y: 0 }, { x: 0, y: 150 }, { x: -150, y: 0 }, { x: 0, y: -150 }];
const FORMEN = {
  kugel: KUGEL,
  braue: [{ x: 150, y: 0 }, { x: 0, y: 85 }, { x: -150, y: 0 }, { x: 0, y: -150 }],
  ei: [{ x: 284, y: 0 }, { x: 0, y: 150 }, { x: -150, y: 0 }, { x: 0, y: -150 }],
  langhals: [
    { x: 230, y: -20, ecke: true }, { x: 150, y: 40 }, { x: 20, y: 45 }, { x: -80, y: 70 }, { x: -115, y: 170 }, { x: -140, y: 225 },
    { x: -200, y: 248 }, { x: -265, y: 212 }, { x: -200, y: 185 }, { x: -160, y: 150 }, { x: -150, y: 40 }, { x: -130, y: -60 },
    { x: -40, y: -105, ecke: true }, { x: 110, y: -100 },
  ],
};

const braue = (b) => [
  {
    punkte: [{ x: -120, y: 70, breite: b }, { x: -60, y: 118, breite: b }, { x: 0, y: 125, breite: b }, { x: 60, y: 118, breite: b }, { x: 120, y: 70, breite: b }],
    bezug: KUGEL,
  },
];
const strich = Number(process.argv[5] ?? 3);
const LINIEN = {
  kugel: braue(strich),
  braue: braue(strich),
  ei: [{ punkte: [{ x: -110, y: 75, breite: 3 }, { x: 40, y: 95, breite: 3 }, { x: 210, y: 45, breite: 3 }] }],
  langhals: [
    { punkte: [{ x: -250, y: 222, breite: 3 }, { x: -205, y: 228, breite: 3 }, { x: -160, y: 210, breite: 3 }] },
    { punkte: [{ x: -60, y: -40, breite: 1 }, { x: 60, y: -60, breite: 1 }, { x: 170, y: -40, breite: 1 }] },
  ],
};

const ausgabe = process.argv[2] ?? 'form.jpg';
const name = process.argv[3] ?? 'langhals';
const form = FORMEN[name];
const linien = process.argv[4] === 'linien' ? (LINIEN[name] ?? []) : [];
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await seite.goto(process.env.FORM_URL ?? 'http://localhost:5193/form.html');
await seite.waitForFunction(() => window.__form?.fein === true);
await seite.evaluate(([p, l]) => window.__formSetzen(p, l), [form, linien]);
await seite.waitForFunction(
  ([n, k]) => window.__form?.fein === true && window.__form.punkte.length === n && window.__form.linien.length === k,
  [form.length, linien.length],
);
await seite.waitForTimeout(300);
await seite.screenshot({ path: ausgabe, type: 'jpeg', quality: 88 });
const info = await seite.evaluate(() => ({ dreiecke: window.__form.dreiecke, ms: Math.round(window.__form.ms) }));
console.log(ausgabe, info);
await browser.close();
