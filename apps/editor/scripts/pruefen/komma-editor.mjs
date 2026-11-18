// Prüfstand Block 1: Florians Komma im echten Editor nachspielen (Kugel → hinteren Seitenknoten hochziehen → Front und
// Top ziehen), je Schritt Δ der Blätter lesen und ein Bild machen. Aufruf über run-check.sh (eigener Vite auf 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
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
  await page.screenshot({ path: `${AUSGABE}/komma-${name}.png` });
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
await ziehen('seite', 1, { x: 0.479, y: 0.769 });
await lesen('1-seite');
await ziehen('front', 0, { x: 0, y: 0.796 });
await ziehen('front', 1, { x: 0.319, y: 0.276 });
await lesen('2-front');
await ziehen('top', 2, { x: 0.479, y: 0 });
await ziehen('top', 1, { x: 0, y: 0.32 });
await lesen('3-top');
// Gegenprobe: ein neuer Bau ohne Geste (Stationen neu ableiten wäre etwas anderes; hier nur ein No-op-Zug am Scheitel)
await ziehen('seite', 0, await page.evaluate(() => window.__stores.editor.getState().dok.profile.seite.knoten[0].p), 1);
await lesen('4-ohne-fuehrung');
await browser.close();
