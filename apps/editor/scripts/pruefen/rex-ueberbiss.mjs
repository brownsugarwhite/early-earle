// Rex aus der Library (Kiefer getrennt mit Überbiss aus der Ausstattung): Bühne zu und offen; dann Linie in der Seite zeichnen + Chip „getrennt“
import { dirname as _dirname, resolve as _resolve } from 'node:path';
import { fileURLToPath as _fileURLToPath } from 'node:url';
// gerettet aus dem Scratchpad der Sitzung vom 15.10. (Pfade relativ zum Repo)
const WURZEL = _resolve(_dirname(_fileURLToPath(import.meta.url)), '../../../..');
import { chromium } from '@playwright/test';
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = WURZEL + '/docs/progress/editor';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[browser]', m.text().slice(0, 200)); });
await page.goto(`${url}/?versuch=kern&wesen=rex&bauweise=kern&look=earle&palette=rex`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.waitForFunction(() => window.__editor.wesen()?.maul, null, { timeout: 30_000 }).catch(() => console.log('kein Maul'));
await page.waitForTimeout(1500);
console.log('Rex Prüfwesen:', JSON.stringify(await page.evaluate(() => { const w = window.__editor.wesen(); return { N: w.vorlage.N, maul: w.maul, umbau: w.umbau }; })));
const kamera = () => page.evaluate(() => { window.__stores.ui.getState().setzeEbene('maul'); window.__stores.ui.getState().maximieren('creation'); window.__stores.ui.getState().setzeKamera?.({ azimut: -1.2, elevation: 0.05, distanz: 0.9, ziel: [-0.24, 0.26, 0] }); });
await kamera();
await page.waitForTimeout(1200);
const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
await page.screenshot({ path: `${out}/ueberbiss-rex-zu.png`, clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(1));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/ueberbiss-rex-offen.png`, clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0));
// --- gezeichnete Linie in der Seite + Chip „getrennt“ ---
await page.evaluate(() => { window.__stores.ui.getState().setzeEbene('form'); window.__stores.ui.getState().maximieren(null); });
await page.waitForTimeout(800);
const karte = await page.evaluate(() => {
  const d = window.__stores.editor.getState().dok;
  const svg = document.querySelector('[data-view="seite"] svg');
  const kn = [...svg.querySelectorAll('[data-knoten]')].map((g) => { const c = g.querySelector('circle'); const rr = c.getBoundingClientRect(); return { i: Number(g.getAttribute('data-knoten')), sx: rr.x + rr.width / 2, sy: rr.y + rr.height / 2 }; });
  const a = kn[0], b = kn.find((k) => Math.abs(d.profile.seite.knoten[k.i].p.y - d.profile.seite.knoten[a.i].p.y) > 0.05 && Math.abs(d.profile.seite.knoten[k.i].p.x - d.profile.seite.knoten[a.i].p.x) > 0.05) ?? kn[1];
  const pa = d.profile.seite.knoten[a.i].p, pb = d.profile.seite.knoten[b.i].p;
  const mx = (b.sx - a.sx) / (pb.x - pa.x), my = (b.sy - a.sy) / (pb.y - pa.y);
  const spitze = d.profile.seite.knoten.reduce((s, k) => (k.p.x < s.x ? k.p : s), { x: Infinity, y: 0 });
  return { sk: d.skalierung, mx, my, ox: a.sx - mx * pa.x, oy: a.sy - my * pa.y, spitze };
});
console.log('Abbildung Seite:', JSON.stringify(karte));
await page.evaluate(() => { window.__stores.ui.getState().setzeEbene('maul'); window.__stores.ui.getState().maximieren(null); });
await page.waitForTimeout(1000);
const zuBild = (x, y) => [karte.ox + karte.mx * x, karte.oy + karte.my * y];
// Linie: an der Schnauzenspitze (Kontur) beginnen, dann zwei Punkte nach hinten auf Lippenhöhe
const sp = karte.spitze;
const punkte = [[sp.x + 0.004, sp.y - 0.03], [sp.x + 0.12, sp.y - 0.05], [sp.x + 0.25, sp.y - 0.04]];
for (const [x, y] of punkte) { const [sx, sy] = zuBild(x, y); await page.mouse.click(sx, sy); await page.waitForTimeout(150); }
await page.keyboard.press('Enter');
await page.waitForTimeout(2500);
console.log('gezeichnet:', JSON.stringify(await page.evaluate(() => { const d = window.__stores.editor.getState().dok; return { knoten: d.maul?.zu.oben.knoten.length, unten: !!d.maul?.zu.unten, maul: window.__editor.wesen()?.maul }; })));
const chip = await page.$('[data-kiefer="getrennt"]');
console.log('Chip getrennt sichtbar:', !!chip);
if (chip) {
  await chip.click();
  await page.waitForTimeout(3000);
  console.log('nach getrennt:', JSON.stringify(await page.evaluate(() => { const d = window.__stores.editor.getState().dok; return { unten: d.maul?.zu.unten?.knoten.length, maul: window.__editor.wesen()?.maul, umbau: window.__editor.wesen()?.umbau }; })));
  await kamera();
  await page.waitForTimeout(1200);
  const r2 = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  await page.screenshot({ path: `${out}/ueberbiss-rex-gezeichnet-zu.png`, clip: { x: r2.x, y: r2.y, width: r2.w, height: r2.h } });
  await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0.7));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/ueberbiss-rex-gezeichnet-offen.png`, clip: { x: r2.x, y: r2.y, width: r2.w, height: r2.h } });
}
await browser.close();
