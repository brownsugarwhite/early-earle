// B4 (Plan Teil B): schwarze Linie im Seitenblatt einer Pose mit echten Zügen. Rex (Prüfwesen), Layout Riss, Fressen:
// - die Linie der Pose (posierter Umriss) mit Knoten ist da, die Grundlinie nur gestrichelt;
// - Knoten ziehen: Form der Pose (Ruhe-Deltas mit Bezug) gespeichert, der Knoten folgt dem Zeiger, ferne Knoten bleiben,
//   der Editor-Tab bleibt bitgleich; Undo nimmt den Zug zurück;
// - an der Linie (zwischen Knoten) ziehen formt ebenfalls;
// - schiefe Pose (Oberkiefer gerollt): Knotenzug wirkt genauso.
// Über run-check.sh (eigener Vite auf 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e).slice(0, 240)));
page.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text().slice(0, 240));
});
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
let ok = 0;
let nein = 0;
const pruefe = (name, bed, info = '') => {
  if (bed) ok++;
  else nein++;
  console.log(`${bed ? '✓' : '✗'} ${name}${info ? ' — ' + info : ''}`);
};
const version = () => page.evaluate(() => window.__editor.netzVersion());
const warteBau = async (v0) => {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v, v0, { timeout: 30_000 }).catch(() => {});
  let v = await version();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    const w = await version();
    if (w === v) break;
    v = w;
  }
};
const hash = () => page.evaluate(() => window.__editor.netzHash());
// nur die Knoten im Seitenblatt (seit B6 tragen auch Front und Top Knoten der Pose mit denselben Nummern)
const knoten = async () => {
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.seite);
  const alle = await page.$$eval('[data-pose-knoten] .knoten-punkt', (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { i: Number(e.parentElement.getAttribute('data-pose-knoten')), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }),
  );
  return alle.filter((k) => k.x >= rc.x && k.x <= rc.x + rc.w && k.y >= rc.y && k.y <= rc.y + rc.h);
};
const zug = async (von, dx, dy) => {
  await page.mouse.move(von.x, von.y);
  await page.waitForTimeout(100);
  const v0 = await version();
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(von.x + (dx * i) / 10, von.y + (dy * i) / 10);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await warteBau(v0);
};
const fressen = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__stores.editor.getState().dok.posen.find((p) => p.id === 'fressen'))));
const bilder = [];
const bild = async (name, feld = 'seite') => {
  const rc = await page.evaluate((f) => window.__stores.rahmen.getState().rects[f], feld);
  const b = await page.screenshot({ clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
  bilder.push({ name, src: `data:image/png;base64,${b.toString('base64')}` });
};

await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(300);
let v0 = await version();
await page.click('[data-pruefwesen="rex"]');
const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
await warteBau(v0);
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('form');
  ui.maximieren(null);
  ui.setzeWerkzeug?.('auswahl');
});
await page.waitForTimeout(800);
const hEditor = await hash();
v0 = await version();
await page.click('[data-tab="fressen"]');
await warteBau(v0);
await page.waitForTimeout(400);
const linie = await page.$('[data-pose-linie]');
const grund = await page.$('[data-grundlinie]');
const k0 = await knoten();
pruefe('Linie der Pose mit Knoten, Grundlinie gestrichelt', !!linie && !!grund && k0.length >= 3, `${k0.length} Knoten`);
await bild('Fressen: Linie der Pose (schwarz), Grundlinie gestrichelt');
// oberster Knoten (kleinstes y auf dem Bildschirm) nach oben ziehen
const oben = k0.reduce((a, b) => (b.y < a.y ? b : a), k0[0]);
const formVor = (await fressen()).form.length;
const hF0 = await hash();
await zug(oben, 0, -30);
const f1 = await fressen();
const k1 = await knoten();
const oben1 = k1.find((k) => k.i === oben.i);
pruefe('Knotenzug schreibt die Form der Pose (mit Bezug, ohne Marke)', f1.form.length > formVor && Array.isArray(f1.bezug) && !f1.formAlt, `${formVor} → ${f1.form.length} Punkte`);
pruefe('der Knoten folgt dem Zeiger (≈ 30 px nach oben)', oben1 && oben1.y < oben.y - 18 && Math.abs(oben1.x - oben.x) < 12, oben1 ? `Δx ${(oben1.x - oben.x).toFixed(1)}, Δy ${(oben1.y - oben.y).toFixed(1)} px` : 'fehlt');
const fern = k0.filter((k) => k.i !== oben.i).map((k) => ({ k, n: k1.find((q) => q.i === k.i) }));
const fernMax = Math.max(...fern.map(({ k, n }) => (n ? Math.hypot(n.x - k.x, n.y - k.y) : 99)));
pruefe('ferne Knoten bleiben (≤ 3 px)', fernMax <= 3, `${fernMax.toFixed(1)} px`);
pruefe('Pose sichtbar verändert', (await hash()) !== hF0);
await bild('nach Knotenzug (oben 30 px)');
await bild('Bühne nach Knotenzug', 'creation');
// Undo
v0 = await version();
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await warteBau(v0);
pruefe('Undo nimmt den Zug zurück', (await hash()) === hF0 && (await fressen()).form.length === formVor);
// an der Linie zwischen zwei Knoten ziehen: Mitte zwischen dem obersten und dem nächsten Knoten, auf die Linie gefangen
{
  const ks = (await knoten()).sort((a, b) => a.y - b.y);
  const a = ks[0];
  const b = ks[1];
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  // nächster Punkt der gezeichneten Linie zur Mitte
  const rcSeite = await page.evaluate(() => window.__stores.rahmen.getState().rects.seite);
  const p = await page.evaluate(({ m, rc }) => {
    // die Linie im Seitenblatt (seit B6 auch in Front und Top)
    const path = [...document.querySelectorAll('[data-pose-linie] path')].find((el) => {
      const b = el.getBoundingClientRect();
      return b.x + b.width / 2 >= rc.x && b.x + b.width / 2 <= rc.x + rc.w && b.y + b.height / 2 >= rc.y && b.y + b.height / 2 <= rc.y + rc.h;
    });
    const svg = path.ownerSVGElement;
    const r = svg.getBoundingClientRect();
    const L = path.getTotalLength();
    let best = null;
    let bd = Infinity;
    for (let s = 0; s <= L; s += 2) {
      const q = path.getPointAtLength(s);
      const d = Math.hypot(q.x + r.x - m.x, q.y + r.y - m.y);
      if (d < bd) {
        bd = d;
        best = { x: q.x + r.x, y: q.y + r.y };
      }
    }
    return best;
  }, { m, rc: rcSeite });
  const vorher = await hash();
  await zug(p, -20, -10);
  pruefe('Zug an der Linie formt die Pose', (await hash()) !== vorher && (await fressen()).form.length > formVor);
}
// Editor-Tab bitgleich
v0 = await version();
await page.click('[data-tab="editor"]');
await warteBau(v0);
pruefe('Editor-Tab bitgleich die Grundpose', (await hash()) === hEditor);
// schiefe Pose: Oberkiefer rollen (Stellung direkt), dann Knotenzug
v0 = await version();
await page.click('[data-tab="fressen"]');
await warteBau(v0);
v0 = await version();
await page.evaluate(() => {
  const ed = window.__stores.editor.getState();
  ed.poseSetzen('fressen', (p) => ({ ...p, stellung: { kiefer: { winkel: 58, ziehen: 0.5 }, schaedel: { winkel: 15, rollen: 18 } } }));
});
await warteBau(v0);
await page.waitForTimeout(300);
const k2 = await knoten();
const ob2 = k2.reduce((a, b) => (b.y < a.y ? b : a), k2[0]);
const fl2 = (await fressen()).form.length;
await zug(ob2, 0, -25);
const k3 = await knoten();
const ob3 = k3.find((k) => k.i === ob2.i);
pruefe('schiefe Pose: Knotenzug wirkt', (await fressen()).form.length >= fl2 && ob3 && ob3.y < ob2.y - 14, ob3 ? `Δy ${(ob3.y - ob2.y).toFixed(1)} px` : 'fehlt');
await bild('schiefe Pose nach Knotenzug');
pruefe('keine Seitenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(`\n${ok} ✓, ${nein} ✗`);
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd"><div style="display:grid;grid-template-columns:repeat(2,700px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.name}</div><img src="${b.src}" style="width:700px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'posen-b4.html'), html);
const zeige = await browser.newPage({ viewport: { width: 1420, height: 900 }, deviceScaleFactor: 1 });
await zeige.setContent(html);
await zeige.waitForTimeout(400);
await zeige.screenshot({ path: resolve(AUSGABE, 'posen-b4.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'posen-b4.png'));
await browser.close();
process.exit(nein ? 1 : 0);
