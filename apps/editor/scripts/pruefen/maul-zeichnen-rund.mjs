// Prüfung im Editor (14.10. nachts): Neue Maullinie in der Seite an der Startkugel zeichnen (Mausklicks, Enter) → der
// Anfang hat einen Griff quer zur Spiegelebene (keine Spitze vorn), die Knoten liegen auf der Haut; Bild Riss + Bühne
// von oben. Danach den Anfangsgriff im Top-Blatt ziehen → die Kante folgt dem Griff. Aufruf über run-check.sh.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => { const ui = window.__stores.ui.getState(); ui.setzeEbene('maul'); ui.maximieren(null); });
await page.waitForTimeout(1500);
// Weltpunkt (Profil-Einheiten) → Bildpunkt im Blatt (wie zuBild in ansicht2d.ts)
const bildpunkt = (ansicht, p) =>
  page.evaluate(
    ({ ansicht, p }) => {
      const svg = document.querySelector(`[data-view="${ansicht}"] svg.view2d`);
      const r = svg.getBoundingClientRect();
      const a = window.__stores.ui.getState().ansichten[ansicht];
      const s = a.zoom * 0.925 * Math.min(r.width, r.height);
      const y = ansicht === 'top' ? -p.y : p.y;
      return { x: r.left + r.width / 2 + (p.x - a.cu) * s, y: r.top + r.height / 2 - (y - a.cv) * s };
    },
    { ansicht, p },
  );
const r = 0.265;
const yR = r - 0.02 * r;
const xR = -Math.sqrt(r * r - (yR - r) ** 2);
for (const p of [{ x: xR, y: yR }, { x: xR + 0.5 * r, y: yR - 0.08 * r }, { x: 0.3 * r, y: r - 0.3 * r }]) {
  const q = await bildpunkt('seite', p);
  await page.mouse.click(q.x, q.y);
  await page.waitForTimeout(150);
}
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);
const linie = await page.evaluate(() => window.__stores.editor.getState().dok.maul?.zu.oben.knoten.map((k) => ({ p: k.p.map((v) => +v.toFixed(4)), aus: k.aus.map((v) => +v.toFixed(4)), ein: k.ein.map((v) => +v.toFixed(4)) })));
console.log('Linie:', JSON.stringify(linie));
const info = await page.evaluate(() => ({ delta: [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent), lippen: window.__editor.wesen()?.lippen ?? null }));
console.log('Δ', JSON.stringify(info));
await page.screenshot({ path: `${AUSGABE}/maul-zeichnen-rund-riss.png` });
// Anfangsgriff im Top ziehen: Knoten 0 wählen, Griff „aus“ nach hinten-außen ziehen
await page.evaluate(() => window.__stores.ui.getState().setzeMaulAuswahl({ linie: 'oben', indizes: [0] }));
await page.waitForTimeout(400);
const griff = await page.$('[data-view="top"] [data-maulgriff="oben:0:aus"] rect');
if (griff) {
  const b = await griff.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(x + 6 * i, y - 3 * i); await page.waitForTimeout(40); }
  await page.mouse.up();
  await page.waitForTimeout(3000);
  const nach = await page.evaluate(() => window.__stores.editor.getState().dok.maul?.zu.oben.knoten[0].aus.map((v) => +v.toFixed(4)));
  const info2 = await page.evaluate(() => ({ delta: [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent), lippen: window.__editor.wesen()?.lippen ?? null }));
  console.log('nach Griffzug Top: aus', JSON.stringify(nach), 'Δ', JSON.stringify(info2));
  await page.screenshot({ path: `${AUSGABE}/maul-zeichnen-griff-top.png` });
} else console.log('kein Anfangsgriff im Top gefunden');
await browser.close();
