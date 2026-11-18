// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V5 „Linien exakt“, im echten Editor (eigener Vite über run-check.sh,
// nie 5180): Florians Ablauf (Startkugel, dann die Umrisse eines Körpers der Extremreihe), Chip „Querschnitt: aus der Hülle“,
// dann seine P-Linien (vorbereitet mit `v5-linien-vorbereiten.ts`, so wie der Stift sie auf die Haut legt). Je Fall: Bericht
// der Linien (Käfigschleife: Reihe bzw. Ring), Δ der Blätter ohne und mit Linien, Bilder (Riss im Earle-Look, Bühne mit Zebra),
// ein Zug an einem Seitenknoten (während des Zugs bleiben die Linien Schleifen), Rückgängig stellt den Stand vor dem Zug her.
// Umgebung: FAELLE (z. B. kugel,robbe), AUSGABE. Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/v5-editor.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v5');
mkdirSync(out, { recursive: true });
const alleLinien = JSON.parse(readFileSync(resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v5/linien.json'), 'utf8'));
const faelle = (process.env.FAELLE ?? 'kugel,ei,robbe,kegel').split(',');
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
const bericht = () => page.evaluate(() => (window.__stores.kernAnzeige.getState().info?.linien ?? []).map((b) => `${b.art}${b.schleife ? '·Schleife' : ''}`));

for (const koerper of faelle) {
  console.log(koerper);
  const kanten = alleLinien[koerper];
  if (!kanten?.length) {
    pruefe(false, `keine vorbereiteten Linien für ${koerper} (v5-linien-vorbereiten.ts)`);
    continue;
  }
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
  // Querschnitt aus der Hülle
  v = await page.evaluate(() => window.__editor.netzVersion());
  const chip = page.locator('[data-querschnitt="huelle"]');
  pruefe((await chip.count()) === 1, 'Chip „aus der Hülle“ in der Tafel Körper');
  await chip.click();
  await nachBau(v);
  await ruhig();
  const ohne = await deltas();
  // P-Linien wie gezeichnet
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.evaluate((kanten) => {
    const st = window.__stores.editor.getState();
    st.setzeDokument({ ...st.dok, kanten });
  }, kanten);
  await nachBau(v);
  await ruhig();
  const mit = await deltas();
  const b = await bericht();
  console.log(`         Linien ${b.join(', ')}\n         Δ ohne   ${zeige(ohne)}\n         Δ mit    ${zeige(mit)}`);
  pruefe(b.length === kanten.length && b.every((x) => x.endsWith('·Schleife') || x.startsWith('ohne')), 'Bericht je Linie (Schleife oder Treppe)');
  pruefe(b.some((x) => x.endsWith('·Schleife')), 'mindestens eine Linie als Käfigschleife');
  const mehr = Math.max(...['seite', 'front', 'top'].map((a) => (mit[a] ?? 0) - (ohne[a] ?? 0)));
  pruefe(mehr <= 1.5, `Linien ändern die Umrisse höchstens um 1,5 px (${mehr.toFixed(2)})`);
  await page.screenshot({ path: resolve(out, `v5-editor-${koerper}-riss.jpg`), quality: 82 });
  // Bühne mit Zebra (Prüfansicht)
  await page.evaluate(() => {
    window.__stores.kernAnzeige.getState().setzeLook('matcap');
    window.__stores.ui.getState().setzeZebra(true);
    window.__stores.ui.getState().maximieren('creation');
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(out, `v5-editor-${koerper}-zebra.jpg`), quality: 82 });
  await page.evaluate(() => {
    window.__stores.kernAnzeige.getState().setzeLook('earle');
    window.__stores.ui.getState().setzeZebra(false);
    window.__stores.ui.getState().maximieren(null);
  });
  await page.waitForTimeout(800);
  // ein Zug an einem Seitenknoten: während des Zugs bleiben die Linien Schleifen
  const verlauf0 = await page.evaluate(() => window.__stores.editor.getState().verlauf?.length ?? 0);
  const knoten = page.locator('[data-view="seite"] [data-knoten]').nth(0);
  if ((await knoten.count()) === 1) {
    const box = await knoten.boundingBox();
    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 6; i++) await page.mouse.move(x + 1.5 * i, y - 1 * i, { steps: 2 });
      await page.waitForTimeout(400);
      const imZug = await bericht();
      await page.mouse.up();
      await ruhig();
      const danach = await bericht();
      pruefe(imZug.filter((x) => x.endsWith('·Schleife')).length === b.filter((x) => x.endsWith('·Schleife')).length, `im Zug bleiben die Linien Schleifen (${imZug.join(', ')})`);
      pruefe(danach.filter((x) => x.endsWith('·Schleife')).length >= 1, `nach dem Zug Schleifen (${danach.join(', ')})`);
      pruefe(seitenfehler.length === 0, `Zug ohne Fehler (Δ danach ${zeige(await deltas())})`);
      await page.keyboard.press('Meta+z');
      await ruhig();
      const zurueck = await deltas();
      const verlauf1 = await page.evaluate(() => window.__stores.editor.getState().verlauf?.length ?? 0);
      const gleich = ['seite', 'front', 'top'].every((a) => Math.abs((zurueck[a] ?? NaN) - (mit[a] ?? NaN)) <= 0.05);
      pruefe(gleich && verlauf1 === verlauf0, `Rückgängig stellt den Stand vor dem Zug her (Δ ${zeige(zurueck)})`);
    }
  }
}
pruefe(seitenfehler.length === 0, `keine Seitenfehler (${seitenfehler.length})`);
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles ok');
process.exit(fehler ? 1 : 0);
