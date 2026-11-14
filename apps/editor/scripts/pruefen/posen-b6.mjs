// B6 (Plan Teil B): schwarze Linien der Pose in Seite, Front und Top mit echten Zügen. Rex und Kugel (Prüfwesen), Layout
// Riss, Fressen und Idle. Je Blatt:
// - die Linie der Pose mit Knoten ist da, die Grundlinie nur gestrichelt;
// - den äußersten Knoten 25 px nach außen ziehen: Form der Pose gespeichert, der Knoten folgt dem Zeiger, ferne Knoten
//   bleiben (≤ 3 px), die Pose ändert sich, der Editor-Tab bleibt bitgleich; Undo nimmt den Zug zurück.
// Dazu ein Bild je Blatt nach dem Zug. Über run-check.sh (eigener Vite auf 5192).
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
const rechteck = (feld) => page.evaluate((f) => window.__stores.rahmen.getState().rects[f], feld);
const knoten = async (feld) => {
  const rc = await rechteck(feld);
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
const pose = (id) => page.evaluate((i) => JSON.parse(JSON.stringify(window.__stores.editor.getState().dok.posen.find((p) => p.id === i))), id);
const bilder = [];
const bild = async (name, feld) => {
  const rc = await rechteck(feld);
  const b = await page.screenshot({ clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
  bilder.push({ name, src: `data:image/png;base64,${b.toString('base64')}` });
};

for (const wesen of ['rex', 'kugel']) {
  await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
  await page.waitForTimeout(300);
  let v0 = await version();
  await page.click(`[data-pruefwesen="${wesen}"]`);
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
  v0 = await version();
  await page.click('[data-tab="editor"]').catch(() => {});
  await warteBau(v0);
  const hEditor = await hash();
  for (const tab of ['fressen', 'idle']) {
    v0 = await version();
    await page.click(`[data-tab="${tab}"]`);
    await warteBau(v0);
    await page.waitForTimeout(400);
    for (const feld of ['seite', 'front', 'top']) {
      const k0 = await knoten(feld);
      const n = k0.length;
      if (n < 2) {
        pruefe(`${wesen} ${tab} ${feld}: Linie der Pose mit Knoten`, false, `${n} Knoten`);
        continue;
      }
      // äußerster Knoten vom Mittelpunkt der Knoten aus, 25 px nach außen — nur Knoten, deren Ziel im Blatt bleibt (der
      // unterste Knoten der Front liegt am Blattrand; 25 px tiefer fände ihn das Skript nicht mehr)
      const rc = await rechteck(feld);
      const m = { x: k0.reduce((s, k) => s + k.x, 0) / n, y: k0.reduce((s, k) => s + k.y, 0) / n };
      const richtung = (k) => {
        const l0 = Math.hypot(k.x - m.x, k.y - m.y) || 1;
        return { dx: (25 * (k.x - m.x)) / l0, dy: (25 * (k.y - m.y)) / l0 };
      };
      const imBlatt = (k) => {
        const r = richtung(k);
        return k.x + r.dx > rc.x + 30 && k.x + r.dx < rc.x + rc.w - 30 && k.y + r.dy > rc.y + 30 && k.y + r.dy < rc.y + rc.h - 30;
      };
      const wahl = k0.filter(imBlatt);
      const aussen = (wahl.length ? wahl : k0).reduce((a, b) => (Math.hypot(b.x - m.x, b.y - m.y) > Math.hypot(a.x - m.x, a.y - m.y) ? b : a), (wahl.length ? wahl : k0)[0]);
      const { dx, dy } = richtung(aussen);
      const formVor = (await pose(tab)).form.length;
      const hP0 = await hash();
      await zug(aussen, dx, dy);
      const p1 = await pose(tab);
      const k1 = await knoten(feld);
      const n1 = k1.find((k) => k.i === aussen.i);
      const weg = n1 ? ((n1.x - aussen.x) * dx + (n1.y - aussen.y) * dy) / 25 : 0;
      pruefe(`${wesen} ${tab} ${feld}: Zug schreibt die Form der Pose`, p1.form.length > formVor && Array.isArray(p1.bezug), `${formVor} → ${p1.form.length} Punkte`);
      pruefe(`${wesen} ${tab} ${feld}: Knoten folgt dem Zeiger (≥ 15 von 25 px)`, weg >= 15, `${weg.toFixed(1)} px`);
      // Spiegelpartner (Front: gleiche Höhe, Top: gleiches x) geht mit — die Ruhe-Deltas einer Pose sind symmetrisch
      const partner = (k) => k.i !== aussen.i && (feld === 'front' ? Math.abs(k.y - aussen.y) < 6 : feld === 'top' ? Math.abs(k.x - aussen.x) < 6 : false);
      const spiegel = k0.filter(partner);
      for (const sp of spiegel) {
        const q = k1.find((x) => x.i === sp.i);
        const quer = feld === 'front' ? (q ? -(q.x - sp.x) : 0) : q ? -(q.y - sp.y) : 0;
        const soll = feld === 'front' ? dx : dy;
        pruefe(`${wesen} ${tab} ${feld}: Spiegelpartner geht spiegelbildlich mit`, q && Math.abs(quer - soll) < 4, q ? `${quer.toFixed(1)} px statt ${soll.toFixed(1)}` : 'fehlt');
      }
      const fern = k0.filter((k) => k.i !== aussen.i && !partner(k) && Math.hypot(k.x - aussen.x, k.y - aussen.y) > 120).map((k) => ({ k, n: k1.find((q) => q.i === k.i) }));
      const fernMax = fern.length ? Math.max(...fern.map(({ k, n: q }) => (q ? Math.hypot(q.x - k.x, q.y - k.y) : 99))) : 0;
      pruefe(`${wesen} ${tab} ${feld}: ferne Knoten bleiben (≤ 3 px)`, fernMax <= 3, `${fernMax.toFixed(1)} px über ${fern.length} Knoten`);
      pruefe(`${wesen} ${tab} ${feld}: Pose verändert`, (await hash()) !== hP0);
      await bild(`${wesen} · ${tab} · ${feld} nach Zug (25 px nach außen)`, feld);
      v0 = await version();
      await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
      await warteBau(v0);
      pruefe(`${wesen} ${tab} ${feld}: Undo`, (await hash()) === hP0 && (await pose(tab)).form.length === formVor);
    }
  }
  v0 = await version();
  await page.click('[data-tab="editor"]');
  await warteBau(v0);
  pruefe(`${wesen}: Editor-Tab bitgleich nach allen Zügen in den Posen`, (await hash()) === hEditor);
}
pruefe('keine Seitenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(`\n${ok} ✓, ${nein} ✗`);
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd"><div style="display:grid;grid-template-columns:repeat(3,560px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.name}</div><img src="${b.src}" style="width:560px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'posen-b6.html'), html);
const zeige = await browser.newPage({ viewport: { width: 1700, height: 900 }, deviceScaleFactor: 1 });
await zeige.setContent(html);
await zeige.waitForTimeout(400);
await zeige.screenshot({ path: resolve(AUSGABE, 'posen-b6.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'posen-b6.png'));
await browser.close();
process.exit(nein ? 1 : 0);
