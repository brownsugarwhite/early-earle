// Prüfstand Block 1: Florians Ablauf mit Pinsel — Kugel, Aufblasen-Strich auf der Bühne (Formen folgen), dann die
// Komma-Züge an Seite, Front und Top. Je Schritt Δ der Blätter und ein Bild. Aufruf über run-check.sh (5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/test-results/pruefen');
mkdirSync(AUSGABE, { recursive: true });
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') console.log('[browser]', m.text().slice(0, 160)); });
await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 20_000 }).catch(() => console.log('keine Stationen nach 20 s'));

const lesen = async (name) => {
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const d = window.__stores.editor.getState().dok;
    const k = (a) => d.profile[a].knoten.map((n) => `(${n.p.x.toFixed(3)},${n.p.y.toFixed(3)})`).join(' ');
    return { delta: [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent), seite: k('seite'), front: k('front'), top: k('top'), deltas: d.kaefig?.deltas?.length ?? 0 };
  });
  console.log(`${name}: Δ ${JSON.stringify(r.delta)} | Seite ${r.seite} | Front ${r.front} | Top ${r.top} | Pinsel-Deltas ${r.deltas}`);
  await page.screenshot({ path: `${AUSGABE}/komma-pinsel-${name}.png` });
};

// Eine Geste wie mit der Maus: beginGeste, Knoten in Schritten bewegen (setzeProfil mit Kopplung), endeGeste
const ziehen = async (ansicht, i, ziel, schritte = 8) => {
  await page.evaluate(async ({ ansicht, i, ziel, schritte }) => {
    const ed = window.__stores.editor;
    const start = ed.getState().dok.profile[ansicht].knoten[i].p;
    ed.getState().beginGeste();
    for (let s = 1; s <= schritte; s++) {
      const t = s / schritte;
      const pr = ed.getState().dok.profile[ansicht];
      const p = { x: start.x + (ziel.x - start.x) * t, y: start.y + (ziel.y - start.y) * t };
      ed.getState().setzeProfil(ansicht, { ...pr, knoten: pr.knoten.map((k, j) => (j === i ? { ...k, p } : k)) });
      await new Promise((r) => setTimeout(r, 60));
    }
    ed.getState().endeGeste();
  }, { ansicht, i, ziel, schritte });
};

await lesen('0-kugel');
// Aufblasen-Strich auf der Bühne (Riss-Layout, Bühne unten rechts), wie mit der Maus
const c = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('aufblasen'));
const x0 = c.x + c.w * 0.55;
const y0 = c.y + c.h * 0.5;
await page.mouse.move(x0, y0);
await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(x0 + 4 * i, y0 - 3 * i); await page.waitForTimeout(30); }
await page.mouse.up();
await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('auswahl'));
await page.mouse.move(c.x + 4, c.y + 4);
await page.waitForTimeout(2500);
await lesen('1-pinsel');
await ziehen('seite', 1, { x: 0.479, y: 0.769 });
await ziehen('front', 0, { x: 0, y: 0.796 });
await ziehen('top', 2, { x: 0.479, y: 0 });
await lesen('2-komma');
await ziehen('front', 1, { x: 0.319, y: 0.276 });
await ziehen('top', 1, { x: 0, y: 0.32 });
await lesen('3-komma-breiter');
await browser.close();
