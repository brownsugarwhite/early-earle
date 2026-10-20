// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1c: Punkte einfügen, wenn der folgenden Ansicht Knoten fehlen (Florian:
// „nur wenn wirklich notwendig“). Ente-Haken (Front mit einem freien Knoten, Spant S1):
// 1. „angleichen“ im Top (Top führt): Widerspruch → 0, die Front bekommt einen Punkt, der Spant dieselbe Punktstruktur.
// 2. frisch geladen, Front angeglichen: Kopf im Top mit der Maus breiter ziehen → Front folgt (mit Punkt), ≤ 1 px, ein
//    Undo-Schritt; Undo stellt die Punktzahl wieder her. Plan 20.10., V0: Ein kleiner Zug nach dem Undo bringt den Punkt
//    nicht zurück (vorher hing der Merker der Kopplung am Profil des Gestenbeginns); hin und zurück in einer Geste lässt
//    keinen Punkt und keinen Undo-Schritt übrig (überflüssige Punkte nimmt das Gestenende heraus).
// 3. Startkugel: gewöhnliche Züge fügen keinen Punkt ein.
// Eigener Vite über run-check.sh (nie 5180).
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
const stand = () =>
  page.evaluate(() => {
    const st = window.__stores.editor.getState();
    const b = window.__stores.kernAnzeige.getState().info?.blatt ?? {};
    return {
      front: st.dok.profile.front.knoten.length,
      top: st.dok.profile.top.knoten.length,
      seite: st.dok.profile.seite.knoten.length,
      spanten: (st.dok.spanten ?? []).map((s) => s.profil.knoten.length + (s.unten ? `/${s.unten.knoten.length}` : '')),
      schritte: st.verlauf.length,
      wid: Math.max(b.seite?.widerspruch ?? 0, b.front?.widerspruch ?? 0, b.top?.widerspruch ?? 0),
      widJe: [b.seite?.widerspruch ?? 0, b.front?.widerspruch ?? 0, b.top?.widerspruch ?? 0].map((v) => v.toFixed(1)).join(' / '),
    };
  });
async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 60_000 });
  await page.waitForTimeout(800);
}
async function laden(name) {
  await page.goto(`${url}/?look=earle&palette=blob`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  if (name === 'kugel') return;
  const v = await page.evaluate(() => window.__editor.netzVersion());
  await page.evaluate(async ({ modul, name }) => {
    const g = await import(modul);
    window.__stores.editor.getState().laden(g.s0KoerperDokument(name), null);
  }, { modul, name });
  await nachBau(v);
}

// 1. angleichen im Top
console.log('Ente-Haken: angleichen im Top (Top führt)');
await laden('ente-haken');
let a = await stand();
console.log(`  vorher: Widerspruch S/F/T ${a.widJe} px; Front ${a.front} Knoten, Spanten ${JSON.stringify(a.spanten)}`);
let v = await page.evaluate(() => window.__editor.netzVersion());
await page.locator('[data-angleichen="top"]').click();
await nachBau(v);
let b = await stand();
pruefe(b.wid <= 1, `angleichen (Top führt): Widerspruch S/F/T ${b.widJe} px`);
pruefe(b.front > a.front && b.front - a.front <= 2, `Front ${a.front} → ${b.front} Knoten (nur so viele wie nötig)`);
pruefe(b.spanten.every((n) => String(n).split('/').every((k) => Number(k) === b.front)), `Spanten mit der Punktstruktur der Front: ${JSON.stringify(b.spanten)}`);
pruefe(b.schritte === a.schritte + 1, `ein Undo-Schritt (${a.schritte} → ${b.schritte})`);
await page.screenshot({ path: `${out}/netz-e-ente-top-angeglichen.png` });

// 2. Kopf im Top breiter ziehen, nachdem die Front angeglichen wurde
console.log('Ente-Haken: Front angleichen, dann den Kopf im Top breiter ziehen');
await laden('ente-haken');
v = await page.evaluate(() => window.__editor.netzVersion());
await page.locator('[data-angleichen="front"]').click();
await nachBau(v);
a = await stand();
console.log(`  nach angleichen (Front führt): Widerspruch ${a.widJe} px; Front ${a.front}, Top ${a.top} Knoten`);
// Top-Knoten am Kopf (vorne, x < −0,15, größte Breite) und die Richtung von der Achse weg (Bildschirm)
const griff = await page.evaluate(() => {
  const kn = window.__stores.editor.getState().dok.profile.top.knoten;
  let i = -1;
  kn.forEach((k, j) => {
    if (k.p.x < -0.15 && Math.abs(k.p.y) > 0.02 && (i < 0 || Math.abs(k.p.y) > Math.abs(kn[i].p.y))) i = j;
  });
  const svg = document.querySelector('.vp-ober[data-view="top"] svg.view2d');
  const el = svg.querySelector(`[data-knoten="${i}"] .knoten-punkt`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Achse: Knoten 0 liegt auf ihr
  const a0 = svg.querySelector('[data-knoten="0"] .knoten-punkt').getBoundingClientRect();
  return { i, x: r.x + r.width / 2, y: r.y + r.height / 2, weg: Math.sign(r.y - a0.y) || 1, p: kn[i].p };
});
if (!griff) pruefe(false, 'Kopf-Knoten im Top nicht gefunden');
else {
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.mouse.move(griff.x, griff.y);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(griff.x, griff.y + griff.weg * 3 * k);
  await page.mouse.up();
  await nachBau(v);
  b = await stand();
  pruefe(b.wid <= 1, `Top-Knoten ${griff.i} (Kopf) 36 px breiter gezogen: Widerspruch S/F/T ${b.widJe} px`);
  pruefe(b.front >= a.front && b.front - a.front <= 2, `Front ${a.front} → ${b.front} Knoten`);
  pruefe(b.spanten.every((n) => String(n).split('/').every((k) => Number(k) === b.front)), `Spanten mit der Punktstruktur der Front: ${JSON.stringify(b.spanten)}`);
  pruefe(b.schritte === a.schritte + 1, `ein Undo-Schritt (${a.schritte} → ${b.schritte})`);
  await page.screenshot({ path: `${out}/netz-e-ente-kopf-gezogen.png` });
  await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
  await page.waitForTimeout(500);
  const c = await stand();
  pruefe(c.front === a.front && c.spanten.join() === a.spanten.join(), `Undo: Front ${c.front} Knoten, Spanten ${JSON.stringify(c.spanten)}`);
  // kleiner Zug nach dem Undo (6 px zur Achse hin, braucht keinen Punkt)
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.mouse.move(griff.x, griff.y);
  await page.mouse.down();
  for (let k = 1; k <= 3; k++) await page.mouse.move(griff.x, griff.y - griff.weg * 2 * k);
  await page.mouse.up();
  await nachBau(v);
  const d = await stand();
  pruefe(d.front === a.front && d.spanten.join() === a.spanten.join(), `kleiner Zug nach dem Undo: Front ${d.front} Knoten (Punkt nicht zurück), Spanten ${JSON.stringify(d.spanten)}, Widerspruch ${d.widJe} px`);
  await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
  await page.waitForTimeout(500);
  // hin und zurück in einer Geste: unterwegs braucht die Front einen Punkt, am Ende nicht mehr
  const e0 = await stand();
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.mouse.move(griff.x, griff.y);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(griff.x, griff.y + griff.weg * 3 * k);
  for (let k = 11; k >= 0; k--) await page.mouse.move(griff.x, griff.y + griff.weg * 3 * k);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const e1 = await stand();
  pruefe(e1.front === e0.front && e1.spanten.join() === e0.spanten.join(), `hin und zurück: Front ${e0.front} → ${e1.front} Knoten, Spanten ${JSON.stringify(e1.spanten)}`);
  pruefe(e1.schritte === e0.schritte, `hin und zurück: kein Undo-Schritt (${e0.schritte} → ${e1.schritte})`);
}

// 3. Startkugel: gewöhnliche Züge ohne neue Punkte
console.log('Startkugel: gewöhnliche Züge');
await laden('kugel');
a = await stand();
for (const [ans, i, dx, dy] of [['front', 1, 40, -30], ['top', 1, 25, -35], ['seite', 1, 35, 10]]) {
  const box = await page.locator(`.vp-ober[data-view="${ans}"] [data-knoten="${i}"] .knoten-punkt`).boundingBox();
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(box.x + box.width / 2 + (dx * k) / 10, box.y + box.height / 2 + (dy * k) / 10);
  await page.mouse.up();
  await nachBau(v);
}
b = await stand();
pruefe(b.front === a.front && b.top === a.top && b.seite === a.seite, `keine neuen Punkte (Knoten S/F/T ${b.seite}/${b.front}/${b.top}), Widerspruch ${b.widJe} px`);
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
