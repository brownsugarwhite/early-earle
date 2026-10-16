// Florians Ablauf im Editor (16.10.): neue Kugel bauen (die Stationen samt Wirbelsäulen-Enden frieren ein), dann
// (1) Schnabel mit Kerbe in die Seite (zwei Knoten mehr), (2) Unterbiss-Maul dazu, und (3) neue Kugel → Vase mit Hals.
// Das Maul kommt aus `maul-json.ts` (vorher: kern-lauf.sh HEAD …/maul-json.ts). Über editor-lauf.sh starten.
// Ausgabe: Δ je Blatt und ganze Seite als Bild je Schritt.
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const AUS = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/vergleich');
mkdirSync(AUS, { recursive: true });
const url = process.env.EDITOR_URL;
const TAG = process.env.TAG ?? 'x';
const fm = JSON.parse(readFileSync(`${AUS}/florian-maul.json`, 'utf8'));
const K = 0.146;
const r = 0.265;
const kn = (x, y, ex, ey, ax, ay, art = 'glatt') => ({ p: { x, y }, ein: { x: ex, y: ey }, aus: { x: ax, y: ay }, art });
const schnabel = { art: 'geschlossen', knoten: [kn(0, 2 * r, -K, 0, K, 0), kn(r, r, 0, K, 0, -K), kn(0, 0, K, 0, -K, 0), kn(-0.3975, 0.1405, 0.1, -0.08, 0.06, 0.02, 'ecke'), kn(-0.255, 0.1935, -0.05, -0.015, -0.03, 0.1, 'ecke')] };
const vase = { art: 'geschlossen', knoten: [kn(-0.12, 0.95, 0, -0.08, 0.08, 0, 'ecke'), kn(0.13, 0.95, -0.08, 0, 0, -0.1, 'ecke'), kn(0.11, 0.55, 0, 0.1, 0, -0.08), kn(0.27, 0.27, 0, 0.1, 0, -0.14), kn(0, 0, K, 0, -K, 0), kn(-0.26, 0.32, 0, -0.14, 0, 0.1), kn(-0.12, 0.6, -0.02, -0.08, 0, 0.1)] };
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
page.on('dialog', (d) => d.accept());
const neu = async () => {
  await page.goto(`${url}/?bauweise=kern&look=earle`);
  await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0 && !!window.__stores.editor.getState().dok.kaefig?.stationen, null, { timeout: 90_000 });
  await page.waitForTimeout(800);
};
const messen = async (name) => {
  await page.waitForTimeout(3500);
  const delta = await page.evaluate(() => [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent));
  await page.screenshot({ path: `${AUS}/ablauf-${name}-${TAG}.png` });
  console.log(TAG, name, JSON.stringify(delta));
};
await neu();
await page.evaluate((s) => { const st = window.__stores.editor.getState(); st.setzeProfile({ ...st.dok.profile, seite: s }); }, schnabel);
await messen('schnabel');
await page.evaluate((m) => window.__stores.editor.getState().setzeMaul(m.maul), fm);
await messen('schnabel-maul');
await neu();
await page.evaluate((s) => { const st = window.__stores.editor.getState(); st.setzeProfile({ ...st.dok.profile, seite: s }); }, vase);
await messen('vase');
console.log('Fehler', fehler.slice(0, 4));
await browser.close();
