// Kopplung der Ansichten im Bild: neue Kugel, oberen Front-Punkt hochziehen, Seite und Front festhalten.
//   node scripts/kopplung-bild.mjs <ausgabe.png> [zug in px, Standard 90] [ausgang.png]   (Web-Modus muss laufen)
// Mit drittem Argument entsteht zusätzlich das Bild vor dem Zug.
import { chromium } from '@playwright/test';
import path from 'node:path';

const aus = path.resolve(process.argv[2] ?? 'kopplung.png');
const zug = Number(process.argv[3] ?? 90);
const ausgang = process.argv[4] ? path.resolve(process.argv[4]) : null;
const url = process.env.EDITOR_URL ?? 'http://localhost:5180';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
await page.addInitScript(() => localStorage.clear());
await page.goto(url);
await page.waitForFunction(() => window.__stores && window.__stores.editor.getState().dok.profile.front.knoten.length > 0, null, { timeout: 30_000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const ausschnitt = async () => {
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects);
  const x = r.seite.x;
  const y = r.seite.y - 26;
  return { x, y, width: r.front.x + r.front.w - x, height: r.seite.h + 26 };
};
if (ausgang) await page.screenshot({ path: ausgang, clip: await ausschnitt() });

const kreis = page.locator('.vp-ober[data-view="front"] [data-knoten="0"] .knoten-punkt');
const b = await kreis.boundingBox();
const a = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
await page.mouse.move(a.x, a.y);
await page.mouse.down();
await page.mouse.move(a.x, a.y - zug, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(300);
await page.mouse.click(5, 5);
await page.waitForTimeout(200);
await page.screenshot({ path: aus, clip: await ausschnitt() });

const knoten = await page.evaluate(() => {
  const p = window.__stores.editor.getState().dok.profile;
  return Object.fromEntries(['seite', 'front'].map((a) => [a, p[a].knoten.map((k) => `(${k.p.x.toFixed(3)}, ${k.p.y.toFixed(3)})`).join(' ')]));
});
console.log(`Knoten nach dem Zug: Seite ${knoten.seite} | Front ${knoten.front}`);
console.log(`geschrieben: ${aus}`);
await browser.close();
