// Prüfung im Editor: Lippenanfang (rot, Seite) nach vorn ziehen → der Knoten der schwarzen Linie wandert mit, keine neuen
// Knoten, Front/Top koppeln (Top-Spitze wandert mit). Fall „gleich“ aus maul-faelle.json; Aufruf über run-check.sh.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const dok = JSON.parse(readFileSync(resolve(AUSGABE, 'maul-faelle.json'), 'utf-8')).gleich;
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate((d) => { const ui = window.__stores.ui.getState(); window.__stores.editor.getState().laden(d, null); ui.setzeEbene('maul'); ui.maximieren(null); ui.setzeMaulAuswahl({ linie: 'oben', indizes: [0] }); }, dok);
await page.waitForTimeout(2500);
const lesen = () => page.evaluate(() => { const d = window.__stores.editor.getState().dok; const s = d.profile.seite; const i = s.knoten.findIndex((k) => k.marke); return { seiteKnoten: s.knoten.length, marke: i >= 0 ? s.knoten[i].p : null, rotStart: d.maul.zu.oben.knoten[0].p.slice(0, 2), topVorn: d.profile.top.knoten[0].p }; });
console.log('vorher:', JSON.stringify(await lesen()));
const el = await page.$('[data-view="seite"] [data-maulknoten="oben:0"], .viewport [data-maulknoten="oben:0"]');
if (!el) { console.log('kein Anfangsknoten gefunden'); await browser.close(); process.exit(1); }
const b = await el.boundingBox();
const x = b.x + b.width / 2;
const y = b.y + b.height / 2;
await page.mouse.move(x, y);
await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(x - 8 * i, y); await page.waitForTimeout(40); }
await page.mouse.up();
await page.waitForTimeout(2500);
console.log('nachher:', JSON.stringify(await lesen()));
await page.screenshot({ path: `${AUSGABE}/maul-anfang-gezogen.png` });
await browser.close();
