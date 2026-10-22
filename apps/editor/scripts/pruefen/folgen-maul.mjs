// Formen folgen am Maul (Florians Kugel-Fall: Lippen vor dem Körper) und Front-Zug nach dem Pinsel
import { dirname as _dirname, resolve as _resolve } from 'node:path';
import { fileURLToPath as _fileURLToPath } from 'node:url';
// gerettet aus dem Scratchpad der Sitzung vom 15.10. (Pfade relativ zum Repo)
const WURZEL = _resolve(_dirname(_fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? _resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
import { chromium } from '@playwright/test';
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = AUSGABE + '';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !m.text().includes('THREE.TSL')) console.log('[browser]', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const lage = () => page.evaluate(() => {
  const d = window.__stores.editor.getState().dok;
  const info = window.__stores.kernAnzeige.getState().info;
  const w = window.__editor.wesen();
  const zu = d.maul?.zu;
  const nah = (l) => { if (!l) return null; const p = l.knoten[0].p; let best = Infinity; for (const k of d.profile.seite.knoten) best = Math.min(best, Math.hypot(k.p.x - p[0], k.p.y - p[1])); return +(best * d.skalierung * 461).toFixed(2); };
  return { knoten: { seite: d.profile.seite.knoten.length, front: d.profile.front.knoten.length, top: d.profile.top.knoten.length }, deltas: d.kaefig?.deltas?.length ?? 0, undo: window.__stores.editor.getState().verlauf.length, blatt: info?.blatt && Object.fromEntries(Object.entries(info.blatt).map(([k, v]) => [k, +v.max.toFixed(1)])), lippen: w?.lippen && { rot: [+w.lippen.oben.seite.toFixed(2), w.lippen.oben.front && +w.lippen.oben.front.toFixed(2)], blau: w.lippen.unten && [+w.lippen.unten.seite.toFixed(2), w.lippen.unten.front && +w.lippen.unten.front.toFixed(2)] }, anfangImUmriss: { rot: nah(zu?.oben), blau: nah(zu?.unten) }, gesteOffen: !!window.__stores.editor.getState().gesteStart };
});
const shot = async (name, kam) => {
  await page.evaluate((k) => { window.__stores.ui.getState().maximieren('creation'); window.__stores.ui.getState().setzeKamera?.(k); }, kam);
  await page.waitForTimeout(1200);
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  await page.screenshot({ path: `${out}/${name}.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
};
const riss = async (name) => { await page.evaluate(() => window.__stores.ui.getState().maximieren(null)); await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/${name}.png` }); };
// ---- Kugel, Florians Lippen vor dem Körper ----
await page.goto(`${url}/?versuch=kern&wesen=kugel&bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const ed = window.__stores.editor.getState();
  const d = ed.dok;
  const xs = d.profile.seite.knoten.map((k) => k.p.x), ys = d.profile.seite.knoten.map((k) => k.p.y);
  const xM = (Math.min(...xs) + Math.max(...xs)) / 2, yM = (Math.min(...ys) + Math.max(...ys)) / 2, r = (Math.max(...xs) - Math.min(...xs)) / 2;
  const zAuf = (x, y) => Math.sqrt(Math.max(0, r * r - (x - xM) ** 2 - (y - yM) ** 2));
  const glatt = (pts, f) => pts.map((p, i) => { const vor = pts[Math.max(0, i - 1)], nach = pts[Math.min(pts.length - 1, i + 1)]; const t = [(nach[0] - vor[0]) / 6, (nach[1] - vor[1]) / 6]; const z = zAuf(p[0], p[1]) * f; return { p: [p[0], p[1], i === 0 ? 0 : z], ein: i === 0 ? [0, 0, 0] : [-t[0], -t[1], 0], aus: i === pts.length - 1 ? [0, 0, 0] : [t[0], t[1], 0], art: 'glatt' }; });
  const xL = xM - r; // linker Rand der Kugel
  const ecke = [xM + 0.25 * r, yM - 0.3 * r];
  // rot: beginnt 0,12 r VOR dem Körper, leicht über der Mitte; blau: 0,2 r vor dem Körper, darunter (Unterbiss wie in Florians Bild)
  const oben = { knoten: glatt([[xL - 0.12 * r, yM + 0.12 * r], [xL + 0.45 * r, yM - 0.02 * r], ecke], 0.9) };
  const unten = { knoten: glatt([[xL - 0.2 * r, yM - 0.12 * r], [xL + 0.4 * r, yM - 0.2 * r], ecke], 0.9) };
  unten.knoten[2].p = [...oben.knoten[2].p];
  ed.beginGeste();
  ed.setzeMaul({ zu: { oben, unten } });
  ed.endeGeste();
  window.__stores.ui.getState().setzeEbene('maul');
});
await page.waitForTimeout(4000);
console.log('Kugel nach Maulgeste:', JSON.stringify(await lage()));
await riss('folgen-maul-riss');
await shot('folgen-maul-seite', { azimut: -0.25, elevation: 0.0, distanz: 0.75, ziel: [-0.12, 0.26, 0] });
await shot('folgen-maul-schraeg', { azimut: -0.9, elevation: -0.15, distanz: 0.7, ziel: [-0.12, 0.25, 0] });
// Anfang der roten Linie in der Seite ziehen (per Store, als Geste): 0,04 nach vorn und hoch
await page.evaluate(() => {
  const ed = window.__stores.editor.getState();
  const d = ed.dok;
  const o = d.maul.zu.oben;
  const kn = o.knoten.map((k, i) => (i === 0 ? { ...k, p: [k.p[0] - 0.04, k.p[1] + 0.03, k.p[2]] } : k));
  ed.beginGeste();
  ed.setzeMaul({ ...d.maul, zu: { ...d.maul.zu, oben: { knoten: kn } } });
  ed.endeGeste();
});
await page.waitForTimeout(4000);
console.log('Kugel nach Zug am roten Anfang:', JSON.stringify(await lage()));
await shot('folgen-maul-seite2', { azimut: -0.25, elevation: 0.0, distanz: 0.75, ziel: [-0.12, 0.26, 0] });
// ---- Front-Zug nach einem Pinselstrich: breitesten Front-Knoten 0,05 nach außen ----
await page.evaluate(() => {
  const ed = window.__stores.editor.getState();
  const d = ed.dok;
  const f = d.profile.front;
  let best = 0;
  f.knoten.forEach((k, i) => { if (k.p.x > f.knoten[best].p.x) best = i; });
  const kn = f.knoten.map((k, i) => (i === best ? { ...k, p: { x: k.p.x + 0.05, y: k.p.y } } : k));
  ed.beginGeste();
  ed.setzeProfil('front', { ...f, knoten: kn });
  ed.endeGeste();
});
await page.waitForTimeout(4000);
console.log('Kugel nach Front-Zug (+0,05):', JSON.stringify(await lage()));
await riss('folgen-front-riss');
await browser.close();
