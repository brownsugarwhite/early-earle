// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1c: Kopplung jedes Punkts im echten Editor (eigener Vite über
// run-check.sh, nie 5180). Florians Ablauf: neue Kugel → Knoten in Front, Top und Seite mit der Maus ziehen; nach jeder Geste
// (genauer Bau) Widerspruch ≤ 1 px in allen Blättern, ein Undo-Schritt je Geste. Dann ein altes Wesen mit Widersprüchen
// (Ente-Haken): „angleichen“ im Blatt → Widerspruch weg (bis auf das, wofür der folgenden Ansicht Punkte fehlen).
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/netz-c.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/grundkoerper.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`${ok ? '  ok  ' : '  FEHL'} ${text}`);
  if (!ok) fehler++;
};

/** auf den genauen Bau nach einer Änderung warten und die Widersprüche je Blatt lesen */
async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 60_000 });
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const b = window.__stores.kernAnzeige.getState().info?.blatt ?? {};
    return { seite: b.seite?.widerspruch ?? 0, front: b.front?.widerspruch ?? 0, top: b.top?.widerspruch ?? 0, schritte: window.__stores.editor.getState().verlauf.length };
  });
}

/** Knoten i der Ansicht a mit der Maus um (dx, dy) Bildpunkte ziehen */
async function ziehen(a, i, dx, dy) {
  const box = await page.locator(`.vp-ober[data-view="${a}"] [data-knoten="${i}"] .knoten-punkt`).boundingBox();
  if (!box) return false;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(x + (dx * k) / 10, y + (dy * k) / 10);
  await page.mouse.up();
  return true;
}

await page.goto(`${url}/?look=earle&palette=blob`);
await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
await page.waitForTimeout(800);
console.log('Startkugel, Züge mit der Maus');
// Front: rechter Knoten nach außen (breiter), Top: mittlerer Knoten nach innen, Seite: oberer Knoten hoch, Front: unterer
// Bereich mit einem neuen Knoten (Stift) und nach außen
const zuege = [
  ['front', 1, 40, -30],
  ['top', 1, 25, -35],
  ['seite', 0, 30, -25],
  ['front', 1, -50, 40],
  ['top', 1, -40, 20],
  ['seite', 1, 35, 10],
];
for (const [a, i, dx, dy] of zuege) {
  const v = await page.evaluate(() => window.__editor.netzVersion());
  const vorher = await page.evaluate(() => window.__stores.editor.getState().verlauf.length);
  if (!(await ziehen(a, i, dx, dy))) {
    pruefe(false, `${a} Knoten ${i} nicht gefunden`);
    continue;
  }
  const w = await nachBau(v);
  const max = Math.max(w.seite, w.front, w.top);
  pruefe(max <= 1, `${a} Knoten ${i} um (${dx}, ${dy}) px: Widerspruch Seite ${w.seite.toFixed(1)} · Front ${w.front.toFixed(1)} · Top ${w.top.toFixed(1)} px`);
  pruefe(w.schritte === vorher + 1, `ein Undo-Schritt (${vorher} → ${w.schritte})`);
}
await page.screenshot({ path: `${out}/netz-c-kugel-gezogen.png` });

// altes Wesen mit Widersprüchen: angleichen im Front-Blatt (Front führt)
console.log('Ente-Haken (alte Zeichnung mit Widersprüchen): angleichen');
await page.evaluate(async (modul) => {
  const g = await import(modul);
  window.__stores.editor.getState().laden(g.s0KoerperDokument('ente-haken'), null);
}, modul);
await page.waitForFunction(() => document.querySelectorAll('[data-delta]').length >= 3 && document.querySelectorAll('[data-angleichen]').length > 0, null, { timeout: 90_000 });
await page.waitForTimeout(800);
const vorher = await page.evaluate(() => {
  const b = window.__stores.kernAnzeige.getState().info?.blatt ?? {};
  return { seite: b.seite?.widerspruch ?? 0, front: b.front?.widerspruch ?? 0, top: b.top?.widerspruch ?? 0, schritte: window.__stores.editor.getState().verlauf.length };
});
console.log(`  vorher: Seite ${vorher.seite.toFixed(1)} · Front ${vorher.front.toFixed(1)} · Top ${vorher.top.toFixed(1)} px`);
await page.screenshot({ path: `${out}/netz-c-ente-vorher.png` });
const v = await page.evaluate(() => window.__editor.netzVersion());
await page.locator('[data-angleichen="front"]').click();
const nach = await nachBau(v);
pruefe(Math.max(nach.seite, nach.front, nach.top) <= 1, `angleichen (Front führt): Seite ${nach.seite.toFixed(1)} · Front ${nach.front.toFixed(1)} · Top ${nach.top.toFixed(1)} px`);
pruefe(nach.schritte === vorher.schritte + 1, `ein Undo-Schritt (${vorher.schritte} → ${nach.schritte})`);
await page.screenshot({ path: `${out}/netz-c-ente-angeglichen.png` });
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
