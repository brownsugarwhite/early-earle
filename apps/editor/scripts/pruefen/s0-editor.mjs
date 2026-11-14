// Plan „Liniennetz, Zielform, Käfig“, S0: Florians Fälle im echten Editor (eigener Vite über run-check.sh, nie 5180).
// Lädt Prüfkörper aus dem Kern (`kern/pruefen/grundkoerper.ts`, im Browser über Vite) wie ein gespeichertes Wesen
// (`laden` → erster Bau friert die Stationen ein), wartet auf den genauen Bau und hält Δ und Widerspruch je Blatt fest;
// je Fall ein Bild des ganzen Fensters. Umgebung: FAELLE (Komma-Liste, Standard einfach,ente-haken,rex), AUSGABE (Ordner),
// GROESSE (Größenregler, z. B. 1.5 — S1: Einheiten bei Größe ≠ 100 %).
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/s0-editor.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'einfach,ente-haken,rex').split(',');
const groesse = Number(process.env.GROESSE ?? 1);
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/grundkoerper.ts`;
const koerperModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/koerper.ts`;
const zufallModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/zufall.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
for (const fall of faelle) {
  await page.goto(`${url}/?look=earle&palette=blob`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0, null, { timeout: 90_000 });
  const geladen = await page.evaluate(
    async ({ fall, modul, koerperModul, zufallModul, groesse }) => {
      const g = await import(modul);
      let dok;
      if (g.S0_KOERPER.includes(fall)) dok = g.s0KoerperDokument(fall);
      else if (g.G_KOERPER.includes(fall)) dok = g.gKoerperDokument(fall);
      else {
        const k = await import(koerperModul);
        const z = await import(zufallModul);
        dok = k.koerperDokument(fall, z.zufall(1));
      }
      window.__stores.editor.getState().laden(groesse !== 1 ? { ...dok, skalierung: groesse } : dok, null);
      return dok.name;
    },
    { fall, modul, koerperModul, zufallModul, groesse },
  );
  // genauer Bau: Δ im Titel aller drei Blätter
  await page.waitForFunction(() => document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  await page.waitForTimeout(1500);
  const werte = await page.evaluate(() => {
    const info = window.__stores.kernAnzeige.getState().info;
    const b = info?.blatt ?? {};
    return Object.fromEntries(['seite', 'front', 'top'].map((a) => [a, { delta: b[a]?.max ?? null, widerspruch: b[a]?.widerspruch ?? null }]));
  });
  const markiert = await page.$$eval('[data-widerspruch]', (els) => els.length);
  const z = (a) => `${a} Δ ${werte[a].delta?.toFixed(1)} / Widerspruch ${werte[a].widerspruch?.toFixed(1)} px`;
  console.log(`${fall} (${geladen}): ${z('seite')} · ${z('front')} · ${z('top')} · markierte Elemente ${markiert}`);
  if (werte.seite.delta === null) fehler++;
  await page.screenshot({ path: `${out}/s0-editor-${fall}${groesse !== 1 ? `-g${groesse}` : ''}.png` });
}
await browser.close();
process.exit(fehler ? 1 : 0);
