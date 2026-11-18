// Form zuerst (04.11.2026): Linienpunkte in allen drei Ansichten ziehen, jede Ansicht auf ihre beiden Achsen gelockt. Kugel mit
// einer waagerechten Linie; den mittleren Punkt in der Seite nach oben (Tiefe bleibt), in der Front nach außen (nur z), im Top
// längs (nur x). Gibt die Punkte nach jedem Schritt aus und schreibt ein Bild.
// Aufruf aus apps/editor: node scripts/pruefen/form-linien-ansichten.mjs <ausgabe.jpg> [strichdicke]
import { chromium } from '@playwright/test';

const ausgabe = process.argv[2] ?? 'form-linien-ansichten.jpg';
const strich = Number(process.argv[3] ?? 3);
const kugel = [{ x: 150, y: 0 }, { x: 0, y: 150 }, { x: -150, y: 0 }, { x: 0, y: -150 }];
const linie = {
  punkte: [
    { x: -100, y: 60, breite: strich },
    { x: 0, y: 60, breite: strich },
    { x: 100, y: 60, breite: strich },
  ],
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
await seite.waitForTimeout(250);

const mitte = async (wahl) => {
  const box = await seite.locator(wahl).first().boundingBox();
  return [box.x + box.width / 2, box.y + box.height / 2];
};
const ziehen = async (wahl, dx, dy) => {
  const [x, y] = await mitte(wahl);
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await seite.mouse.move(x + (dx * i) / 10, y + (dy * i) / 10);
    await seite.waitForTimeout(35);
  }
  await seite.mouse.up();
  await seite.waitForFunction(() => window.__form?.fein === true);
  await seite.waitForTimeout(250);
};
const punkt = () =>
  seite.evaluate(() => {
    const p = window.__form.linien[0].punkte[1];
    return { x: Number(p.x.toFixed(1)), y: Number(p.y.toFixed(1)), z: p.z === undefined ? null : Number(p.z.toFixed(1)) };
  });

// Linie in der Seite wählen (Trefferband anklicken), dann ihre Punkte ziehen
const [lx, ly] = await mitte('#zeichnung [data-kante="0"]');
await seite.mouse.click(lx, ly);
await seite.waitForTimeout(150);
const vorher = await punkt();
await ziehen('#zeichnung [data-lpunkt="0:1"]', 0, -40);
const nachSeite = await punkt();
await ziehen('#profil-front [data-lpunkt="0:1"]', 35, 0);
const nachFront = await punkt();
await ziehen('#profil-top [data-lpunkt="0:1"]', 30, 0);
const nachTop = await punkt();
const ms = await seite.evaluate(() => Math.round(window.__form.ms));
await seite.screenshot({ path: ausgabe, type: 'jpeg', quality: 88 });
console.log(JSON.stringify({ vorher, nachSeite, nachFront, nachTop, ms, fehler }));
await browser.close();
