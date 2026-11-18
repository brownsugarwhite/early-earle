// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V4 „Querschnitt aus der Sichthülle“, im echten Editor (eigener
// Vite über run-check.sh, nie 5180): Florians Ablauf (Startkugel, dann die Umrisse eines Körpers der Extremreihe). Je Fall:
// Δ der drei Blätter mit „Querschnitt: heute“, dann Chip „aus der Hülle (V4)“ (ein Undo-Schritt), Δ danach; ein Zug an einem
// Front-Knoten mit dem Schalter (kein Fehler, Netz kommt); Rückgängig bis vor den Schalter stellt „heute“ wieder her (Δ wie
// vorher). Bilder je Fall (Riss mit drei Blättern und Bühne, heute und Hülle). Umgebung: FAELLE (z. B. robbe,kegel), AUSGABE.
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/v4-editor.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v4');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'robbe,kegel,giraffe-bauch,keil').split(',');
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/extremreihe.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
const seitenfehler = [];
page.on('pageerror', (e) => {
  seitenfehler.push(String(e));
  console.log('[pageerror]', String(e).slice(0, 300));
});
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`  ${ok ? 'ok  ' : 'FEHL'} ${text}`);
  if (!ok) fehler++;
};

async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 90_000 });
  await page.waitForTimeout(500);
}
/** bis eine Sekunde lang kein neues Netz kam */
async function ruhig() {
  let v = await page.evaluate(() => window.__editor.netzVersion());
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const w = await page.evaluate(() => window.__editor.netzVersion());
    if (w === v) return;
    v = w;
  }
}
const deltas = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-view]')].map((v) => [v.getAttribute('data-view'), Number(v.querySelector('[data-delta]')?.getAttribute('data-delta') ?? NaN)]).filter(([, d]) => Number.isFinite(d))));
const zeige = (d) => ['seite', 'front', 'top'].map((b) => `${b} ${(d[b] ?? NaN).toFixed(1)}`).join(' · ');

for (const koerper of faelle) {
  console.log(koerper);
  await page.goto(`${url}/?look=earle&palette=blob`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__stores.ui.getState().libraryUmschalten(false);
    window.__stores.ui.getState().setzeEbene('form');
    window.__stores.ui.getState().maximieren(null);
  });
  await ruhig();
  // Florians Ablauf: die Startkugel ist eingefroren, dann kommen die Umrisse des Körpers
  let v = await page.evaluate(() => window.__editor.netzVersion());
  await page.evaluate(
    async ({ modul, koerper }) => {
      const m = await import(modul);
      const dok = m.extremKoerper(koerper).dok();
      const st = window.__stores.editor.getState();
      st.setzeDokument({ ...st.dok, profile: dok.profile });
    },
    { modul, koerper },
  );
  await nachBau(v);
  await ruhig();
  const heute = await deltas();
  await page.screenshot({ path: resolve(out, `v4-editor-${koerper}-heute.jpg`), quality: 82 });
  const verlauf0 = await page.evaluate(() => window.__stores.editor.getState().verlauf?.length ?? window.__stores.editor.getState().vergangenheit?.length ?? NaN);
  // Schalter: Querschnitt aus der Hülle
  v = await page.evaluate(() => window.__editor.netzVersion());
  const chip = page.locator('[data-querschnitt="huelle"]');
  pruefe((await chip.count()) === 1, 'Chip „aus der Hülle (V4)“ in der Tafel Körper');
  await chip.click();
  await nachBau(v);
  await ruhig();
  const huelle = await deltas();
  const an = await page.evaluate(() => window.__stores.editor.getState().dok.ausstattung?.umrisseExakt === true);
  pruefe(an, 'Ausstattung umrisseExakt gesetzt');
  console.log(`         Δ heute  ${zeige(heute)}\n         Δ Hülle  ${zeige(huelle)}`);
  pruefe(Object.keys(huelle).length === 3, 'Δ in allen drei Blättern nach dem Umschalten');
  await page.screenshot({ path: resolve(out, `v4-editor-${koerper}-huelle.jpg`), quality: 82 });
  // ein Zug an einem Front-Knoten mit dem Schalter (Geste: der schnelle Weg nutzt dieselben Vorlagen)
  const knoten = page.locator('[data-view="front"] [data-knoten]').nth(1);
  if ((await knoten.count()) === 1) {
    const box = await knoten.boundingBox();
    if (box) {
      v = await page.evaluate(() => window.__editor.netzVersion());
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 6; i++) await page.mouse.move(x + 2 * i, y, { steps: 2 });
      await page.mouse.up();
      await nachBau(v);
      await ruhig();
      pruefe(seitenfehler.length === 0, `Zug an einem Front-Knoten ohne Fehler (Δ danach ${zeige(await deltas())})`);
      // Zug zurück
      await page.keyboard.press('Meta+z');
      await ruhig();
    }
  }
  // Rückgängig bis vor den Schalter
  await page.keyboard.press('Meta+z');
  await ruhig();
  const zurueck = await deltas();
  const aus = await page.evaluate(() => !window.__stores.editor.getState().dok.ausstattung?.umrisseExakt);
  pruefe(aus, 'Rückgängig nimmt den Schalter zurück');
  const gleich = ['seite', 'front', 'top'].every((b) => Math.abs((zurueck[b] ?? NaN) - (heute[b] ?? NaN)) <= 0.05);
  pruefe(gleich, `nach Rückgängig wieder heute (Δ ${zeige(zurueck)})`);
  void verlauf0;
}
pruefe(seitenfehler.length === 0, `keine Seitenfehler (${seitenfehler.length})`);
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles ok');
process.exit(fehler ? 1 : 0);
