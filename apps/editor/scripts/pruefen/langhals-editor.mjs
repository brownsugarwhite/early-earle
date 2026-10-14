// Florians Ablauf am Langhals im Editor (14.10. spätnachts): Maul in der Seite zeichnen (Mausklicks, Enter), Kiefer
// trennen (Chip), roten Anfang schrittweise nach unten ziehen (bei ihm fiel dabei alles zusammen). Je Schritt Δ, Lippen,
// Punktzahl des Netzes, Fehler; Bilder Riss und Bühne. Aufruf über run-check.sh.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/test-results/pruefen');
const dok = JSON.parse(readFileSync(resolve(AUSGABE, 'langhals-ohne-maul.json'), 'utf-8'));
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fehler.push(m.text().slice(0, 200)); });
await page.goto(`${url}/?bauweise=kern&look=earle&palette=giraffe`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate((d) => { const ui = window.__stores.ui.getState(); window.__stores.editor.getState().laden(d, null); ui.setzeEbene('maul'); ui.maximieren(null); ui.setzeAnsicht('seite', { zoom: 4, cu: -0.08, cv: 0.64 }); }, dok);
await page.waitForTimeout(2500);
const bildpunkt = (ansicht, p) =>
  page.evaluate(({ ansicht, p }) => {
    const svg = document.querySelector(`[data-view="${ansicht}"] svg.view2d`);
    const r = svg.getBoundingClientRect();
    const a = window.__stores.ui.getState().ansichten[ansicht];
    const s = a.zoom * 0.925 * Math.min(r.width, r.height);
    return { x: r.left + r.width / 2 + (p.x - a.cu) * s, y: r.top + r.height / 2 - (p.y - a.cv) * s };
  }, { ansicht, p });
const zustand = async (wo) => {
  await page.waitForTimeout(2500);
  const z = await page.evaluate(() => ({ delta: [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent), lippen: window.__editor.wesen()?.lippen ?? null, punkte: window.__editor.vertices(), maul: !!window.__stores.editor.getState().dok.maul, getrennt: !!window.__stores.editor.getState().dok.maul?.zu.unten, anfang: window.__stores.editor.getState().dok.maul?.zu.oben.knoten[0].p.map((x) => +x.toFixed(3)) }));
  console.log(wo, JSON.stringify(z));
  return z;
};
// Maul zeichnen: Anfang auf der Kopfunterseite, Mitte, Mundwinkel hinten oben
for (const p of [{ x: -0.125, y: 0.611 }, { x: -0.085, y: 0.635 }, { x: -0.04, y: 0.66 }]) {
  const q = await bildpunkt('seite', p);
  await page.mouse.click(q.x, q.y);
  await page.waitForTimeout(150);
}
await page.keyboard.press('Enter');
await zustand('gezeichnet');
await page.screenshot({ path: `${AUSGABE}/langhals-editor-1-gezeichnet.png` });
await page.click('[data-kiefer="getrennt"]');
await zustand('getrennt');
await page.screenshot({ path: `${AUSGABE}/langhals-editor-2-getrennt.png` });
// roten Anfang nach unten ziehen (Knoten 0 der roten Linie in der Seite)
await page.evaluate(() => window.__stores.ui.getState().setzeMaulAuswahl({ linie: 'oben', indizes: [0] }));
await page.waitForTimeout(300);
const knoten = await page.$('[data-view="seite"] [data-maulknoten="oben:0"]');
if (!knoten) console.log('roter Anfang nicht gefunden');
else {
  const b = await knoten.boundingBox();
  let x = b.x + b.width / 2;
  let y = b.y + b.height / 2;
  for (let schritt = 1; schritt <= 4; schritt++) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) { await page.mouse.move(x, y + 3 * i); await page.waitForTimeout(30); }
    await page.mouse.up();
    y += 15;
    await zustand(`rot runter ${schritt * 15} px`);
    await page.screenshot({ path: `${AUSGABE}/langhals-editor-3-rot-runter-${schritt}.png` });
  }
}
console.log('Fehler/Warnungen:', fehler.slice(0, 10));
await browser.close();
