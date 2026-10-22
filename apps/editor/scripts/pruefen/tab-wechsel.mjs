// B1 (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B): Tab-Wechsel mit echten Klicks und Pinselzügen.
// Florian (15.10.): „Beim Zurückspringen auf Editor bleibt der neue Shape der Fressen-Pose erhalten.“ Geprüft wird mit
// einem Fingerabdruck der angezeigten Lagen (`__editor.netzHash`): Der Editor-Tab zeigt bitgleich die Grundform, der
// Fressen-Tab die Pose — 20 Wechsel an der Kugel (ohne Maul) und am Rex (mit Maul), Pinsel in Fressen, Pose entfernen,
// Laden aus der Pose, Vorschau-Ende beim Stufenwechsel, Sperre gegen Durchschreiben in die Grundform.
// Über run-check.sh (eigener Vite auf 5192, nie 5180): apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/tab-wechsel.mjs
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const WECHSEL = Number(process.env.WECHSEL ?? 20);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0 && window.__editor.netzHash, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));

const ergebnisse = [];
const pruefe = (name, ok, info = '') => {
  ergebnisse.push({ name, ok, info });
  console.log(`${ok ? '✓' : '✗'} ${name}${info ? ` · ${info}` : ''}`);
};

/** Warten, bis nach einer Aktion ein neues Netz gebaut ist und sich 500 ms nichts mehr ändert. */
async function warteBau(vorher, aufNeues = true) {
  const start = Date.now();
  if (aufNeues) {
    while (Date.now() - start < 8000) {
      if ((await page.evaluate(() => window.__editor.netzVersion())) > vorher) break;
      await page.waitForTimeout(50);
    }
  }
  let v = await page.evaluate(() => window.__editor.netzVersion());
  let ruhig = Date.now();
  while (Date.now() - start < 12000) {
    await page.waitForTimeout(100);
    const v2 = await page.evaluate(() => window.__editor.netzVersion());
    if (v2 !== v) {
      v = v2;
      ruhig = Date.now();
    } else if (Date.now() - ruhig > 500) break;
  }
}
const version = () => page.evaluate(() => window.__editor.netzVersion());
const hash = () => page.evaluate(() => window.__editor.netzHash());
const zustand = () => page.evaluate(() => ({ modus: window.__stores.editor.getState().modus, oeffnung: window.__stores.ui.getState().oeffnung }));

async function pille(name) {
  const v = await version();
  await page.locator('header.menueleiste button.pille', { hasText: new RegExp(`^${name}$`) }).first().click();
  await warteBau(v, false);
}

/** Pinselstrich „Aufblasen“ mitten auf der Bühne (echter Zug). */
async function pinselstrich(dx = 90, dy = -50) {
  await page.evaluate(() => {
    const ui = window.__stores.ui.getState();
    ui.setzeEbene('form');
    ui.setzeWerkzeug('aufblasen');
  });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const cx = r.x + r.w * 0.5;
  const cy = r.y + r.h * 0.5;
  const v = await version();
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(cx + (dx * i) / 12, cy + (dy * i) / 12);
  await page.mouse.up();
  await warteBau(v);
  await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('auswahl'));
}

async function laden(id) {
  await page.click(`[data-pruefwesen="${id}"]`);
  const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
  if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
  await page.waitForTimeout(2500);
  await warteBau(await version(), false);
}

async function bild() {
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  return `data:image/png;base64,${png.toString('base64')}`;
}

const bilder = [];
async function wechselFolge(wesen) {
  const H0 = await hash();
  const dok0 = await page.evaluate(() => JSON.stringify(window.__stores.editor.getState().dok.profile));
  await pille('Fressen');
  const z1 = await zustand();
  pruefe(`${wesen}: Fressen-Tab setzt Modus und Öffnung in einem Zug`, z1.modus === 'fressen' && z1.oeffnung === 1, JSON.stringify(z1));
  const HF0 = await hash();
  await pinselstrich();
  const HF1 = await hash();
  pruefe(`${wesen}: Pinsel formt die Fressen-Pose`, HF1 !== HF0, `${HF0} → ${HF1}`);
  const posen = await page.evaluate(() => (window.__stores.editor.getState().dok.posen.find((p) => p.id === 'fressen')?.form ?? []).length);
  pruefe(`${wesen}: Pinsel schreibt in die Pose (Form der Fressen-Pose, B3)`, posen > 0, `${posen} Deltas`);
  bilder.push({ text: `${wesen} · Fressen-Tab nach dem Pinsel`, src: await bild() });
  await pille('Editor');
  const HE = await hash();
  pruefe(`${wesen}: zurück im Editor-Tab bitgleich die Grundform`, HE === H0, `${HE} (Grundform ${H0})`);
  bilder.push({ text: `${wesen} · zurück im Editor-Tab`, src: await bild() });
  let fehlE = 0;
  let fehlF = 0;
  for (let i = 0; i < WECHSEL; i++) {
    await pille('Fressen');
    if ((await hash()) !== HF1) fehlF++;
    await pille('Editor');
    if ((await hash()) !== H0) fehlE++;
  }
  pruefe(`${wesen}: ${WECHSEL}× Editor ↔ Fressen — Editor immer Grundform`, fehlE === 0, `${fehlE} Abweichungen`);
  pruefe(`${wesen}: ${WECHSEL}× Editor ↔ Fressen — Fressen immer dieselbe Pose`, fehlF === 0, `${fehlF} Abweichungen`);
  const dok1 = await page.evaluate(() => JSON.stringify(window.__stores.editor.getState().dok.profile));
  pruefe(`${wesen}: Profile der Grundform unverändert`, dok0 === dok1);
  return H0;
}

// 1) Kugel ohne Maul
await page.evaluate(() => window.__stores.editor.getState().neu());
await warteBau(await version(), false);
const kugel0 = await wechselFolge('Kugel');

// 2) In Fressen die schwarze Linie ziehen (echter Zug auf einen Knoten der Seite) → Grundform bleibt. Seit B4 ist die
// Linie im Seitenblatt einer Pose die Linie der Pose (`data-pose-knoten`): der Zug formt die Pose statt gesperrt zu sein.
await pille('Fressen');
await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
await page.waitForTimeout(500);
const knoten = await page.evaluate(() => {
  const r = window.__stores.rahmen.getState().rects.seite;
  for (const el of document.querySelectorAll('[data-pose-knoten]')) {
    const b = el.getBoundingClientRect();
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return { x, y };
  }
  return null;
});
if (knoten) {
  const vorher = await page.evaluate(() => JSON.stringify(window.__stores.editor.getState().dok.profile));
  await page.mouse.move(knoten.x, knoten.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(knoten.x + 5 * i, knoten.y - 3 * i);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const nachher = await page.evaluate(() => JSON.stringify(window.__stores.editor.getState().dok.profile));
  const form = await page.evaluate(() => window.__stores.editor.getState().dok.posen.find((p) => p.id === 'fressen')?.form.length ?? 0);
  pruefe('Knoten der Seite in Fressen ziehen ändert die Grundform nicht', vorher === nachher);
  pruefe('… und formt die Pose (B4)', form > 0, `${form} Punkte`);
} else pruefe('Knoten der Pose-Linie in der Seite gefunden', false);
await pille('Editor');

// 3) Vorschau im Editor-Tab endet beim Stufenwechsel
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('maul');
  ui.setzeOeffnung(0.6);
});
await page.waitForTimeout(300);
await page.evaluate(() => window.__stores.ui.getState().setzeEbene('form'));
await page.waitForTimeout(300);
pruefe('Vorschau endet beim Stufenwechsel (Öffnung → 0)', (await zustand()).oeffnung === 0);

// 4) Pose anlegen, formen, entfernen → Editor-Tab, Grundform
await page.evaluate(() => window.__stores.editor.getState().poseHinzu('ruhen'));
await warteBau(await version(), false);
const zr = await zustand();
pruefe('Neue Pose: Ziel ist die Pose (Öffnung 0)', zr.modus === 'ruhen' && zr.oeffnung === 0, JSON.stringify(zr));
await pinselstrich(-70, -40);
const HR = await hash();
pruefe('Pinsel formt die weitere Pose', HR !== kugel0);
await page.locator('header.menueleiste button.pille', { hasText: /^Ruhen$/ }).first().click({ button: 'right' });
// B7: der Fächer der Pille heißt „Löschen“ (wie ⋯ in der Posenliste)
await page.locator('.kontextmenue').getByRole('button', { name: 'Löschen', exact: true }).click();
await warteBau(await version(), false);
const ze = await zustand();
pruefe('Pose entfernen → Editor-Tab', ze.modus === 'editor' && ze.oeffnung === 0, JSON.stringify(ze));
pruefe('Pose entfernen → Grundform bitgleich', (await hash()) === kugel0);

// 5) Laden aus der Pose heraus: Editor-Tab, Öffnung 0
await pille('Fressen');
await page.evaluate(() => window.__stores.editor.getState().neu());
await warteBau(await version(), false);
const zn = await zustand();
pruefe('Neu aus der Fressen-Pose → Editor-Tab, Öffnung 0', zn.modus === 'editor' && zn.oeffnung === 0, JSON.stringify(zn));

// 6) Rex mit Maul
await laden('rex');
await wechselFolge('Rex');

pruefe('keine Fehler auf der Seite', fehler.length === 0, fehler.slice(0, 2).join(' | '));
const ok = ergebnisse.every((e) => e.ok);
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#1b2530;color:#eee;font:14px/1.4 -apple-system,Helvetica,sans-serif;padding:12px}
h1{font-size:18px;margin:0 0 6px}.ok{color:#8f8}.nein{color:#f88}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}img{width:100%;border-radius:4px}.t{font-size:12px;color:#bcd}</style>
<h1>B1 Tab-Wechsel: ${ok ? 'alle Prüfungen erfüllt' : 'Prüfungen fehlgeschlagen'} (Abnahme offen)</h1>
${ergebnisse.map((e) => `<div class="${e.ok ? 'ok' : 'nein'}">${e.ok ? '✓' : '✗'} ${e.name}${e.info ? ` · <span class="t">${e.info}</span>` : ''}</div>`).join('')}
<div class="g">${bilder.map((b) => `<div><img src="${b.src}"><div class="t">${b.text}</div></div>`).join('')}</div>`;
writeFileSync(resolve(AUSGABE, 'tab-wechsel.html'), html);
const p2 = await browser.newPage({ viewport: { width: 1400, height: 600 }, deviceScaleFactor: 1 });
await p2.goto(`file://${resolve(AUSGABE, 'tab-wechsel.html')}`);
await p2.screenshot({ path: resolve(AUSGABE, 'tab-wechsel.png'), fullPage: true });
await browser.close();
console.log(ok ? '\nB1: alle Prüfungen erfüllt' : '\nB1: FEHLER');
process.exit(ok ? 0 : 1);
