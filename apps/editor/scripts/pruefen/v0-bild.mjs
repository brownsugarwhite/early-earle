// Plan 20.10., V0: Bild für Florian — Florians Ablauf (Startkugel, Umrisse der Ente übernommen), Körper „Teile“, zwei
// gekreuzte P-Linien auf der Röhre (Kantenliste „genau“), Tafel Körper mit aufgeklappten „Versuchen“. Eigener Vite (5192).
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/v0-bild.mjs
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const ziel = process.env.AUSGABE ?? resolve(WURZEL, 'docs/progress/editor');
const satzModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/teilsatz.ts`;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 90_000 });
  await page.waitForTimeout(1200);
}
await page.goto(`${url}/?look=earle&palette=blob`);
await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
let v = await page.evaluate(() => window.__editor.netzVersion());
await page.evaluate(
  async ({ satzModul }) => {
    const m = await import(satzModul);
    const dok = m.teilSatzDokument('ente');
    const st = window.__stores.editor.getState();
    st.setzeDokument({ ...st.dok, profile: dok.profile });
  },
  { satzModul },
);
await nachBau(v);
await page.evaluate(() => {
  window.__stores.ui.getState().libraryUmschalten(false);
  window.__stores.ui.getState().setzeEbene('form');
});
v = await page.evaluate(() => window.__editor.netzVersion());
await page.locator('[data-koerper="teile"]').click();
await nachBau(v);
await page.evaluate(() => document.querySelectorAll('[data-versuche]').forEach((d) => (d.open = true)));
await page.waitForTimeout(800);
await page.screenshot({ path: `${ziel}/v0-tafel-teile-2026-10-20.png` });
console.log(`Bild: ${ziel}/v0-tafel-teile-2026-10-20.png`);
await browser.close();
