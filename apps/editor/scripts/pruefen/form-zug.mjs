// Form zuerst (04.11.2026): Zug im kleinen Fenster wie mit der Maus — Kugel mit Linie über dem Scheitel, dann den oberen
// Punkt unter die Linie ziehen. Misst die Bauzeiten (grob beim Ziehen, fein beim Loslassen), sammelt Konsolenfehler und
// schreibt ein Bild. Aufruf aus apps/editor: node scripts/pruefen/form-zug.mjs <ausgabe.jpg> [strichdicke] [px nach unten]
import { chromium } from '@playwright/test';

const ausgabe = process.argv[2] ?? 'form-zug.jpg';
const strich = Number(process.argv[3] ?? 3);
const weg = Number(process.argv[4] ?? 90);
const kugel = [{ x: 150, y: 0 }, { x: 0, y: 150 }, { x: -150, y: 0 }, { x: 0, y: -150 }];
const linie = {
  punkte: [-120, -60, 0, 60, 120].map((x) => ({ x, y: Math.abs(x) > 90 ? 70 : Math.abs(x) > 30 ? 118 : 125, breite: strich })),
  bezug: kugel,
};

const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(process.env.FORM_URL ?? 'http://localhost:5193/form.html');
await seite.waitForFunction(() => window.__form?.fein === true);
await seite.evaluate(([p, l]) => window.__formSetzen(p, l), [kugel, [linie]]);
await seite.waitForFunction(() => window.__form?.fein === true && window.__form.linien.length === 1);
await seite.waitForTimeout(200);

// oberen Punkt greifen und in Schritten nach unten ziehen
const box = await seite.locator('[data-punkt="1"]').boundingBox();
const x = box.x + box.width / 2;
const y = box.y + box.height / 2;
await seite.mouse.move(x, y);
await seite.mouse.down();
const grob = [];
for (let i = 1; i <= 15; i++) {
  await seite.mouse.move(x, y + (weg * i) / 15);
  await seite.waitForTimeout(40);
  const f = await seite.evaluate(() => ({ ms: window.__form.ms, fein: window.__form.fein }));
  if (!f.fein) grob.push(f.ms);
}
await seite.mouse.up();
await seite.waitForFunction(() => window.__form?.fein === true);
await seite.waitForTimeout(300);
const ende = await seite.evaluate(() => ({
  ms: Math.round(window.__form.ms),
  dreiecke: window.__form.dreiecke,
  oben: window.__form.punkte[1],
  linie: window.__form.linien[0].punkte.map((p) => [Math.round(p.x), Math.round(p.y)]),
  bezug: window.__form.linien[0].bezug?.length,
}));
await seite.screenshot({ path: ausgabe, type: 'jpeg', quality: 88 });
grob.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    grobMs: grob.length ? { median: Math.round(grob[grob.length >> 1]), max: Math.round(grob[grob.length - 1]), n: grob.length } : null,
    ...ende,
    fehler,
  }),
);
await browser.close();
