// Plan 20.10., V0: Ein Umriss, der sich selbst schneidet, bekommt im Blatt-Titel einen Hinweis (statt nur eines kaputten
// Körpers); Rückgängig nimmt ihn wieder weg. Eigener Vite über run-check.sh (nie 5180).
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/v0-selbstschnitt.mjs
import { chromium } from '@playwright/test';

const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`${ok ? '  ok  ' : '  FEHL'} ${text}`);
  if (!ok) fehler++;
};
await page.goto(`${url}/`);
await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
const hinweis = () => page.evaluate(() => [...document.querySelectorAll('[data-selbstschnitt]')].map((e) => ({ blatt: e.closest('[data-view]')?.getAttribute('data-view') ?? '?', n: Number(e.getAttribute('data-selbstschnitt')) })));
pruefe((await hinweis()).length === 0, 'Startkugel: kein Hinweis');
// Seitenumriss zur Acht: zwei Knoten über Kreuz tauschen
await page.evaluate(() => {
  const st = window.__stores.editor.getState();
  const s = st.dok.profile.seite;
  const kn = s.knoten.slice();
  const a = kn[1];
  kn[1] = { ...kn[2], p: { ...kn[2].p } };
  kn[2] = { ...a, p: { ...a.p } };
  st.setzeProfil('seite', { ...s, knoten: kn });
});
await page.waitForTimeout(600);
const mit = await hinweis();
pruefe(mit.length === 1 && mit[0].blatt === 'seite' && mit[0].n > 0, `gekreuzter Seitenumriss: Hinweis im Seitenblatt ${JSON.stringify(mit)}`);
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(600);
pruefe((await hinweis()).length === 0, 'Rückgängig: Hinweis weg');
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
