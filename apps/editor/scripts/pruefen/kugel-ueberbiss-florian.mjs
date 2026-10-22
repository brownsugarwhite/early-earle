// Florians Kugel-Fall: rote Linie auf der Kontur in halber Höhe, blaue 0,1 r dahinter und 0,08 r darüber (Überbiss) — Spalt?
import { dirname as _dirname, resolve as _resolve } from 'node:path';
import { fileURLToPath as _fileURLToPath } from 'node:url';
// gerettet aus dem Scratchpad der Sitzung vom 15.10. (Pfade relativ zum Repo)
const WURZEL = _resolve(_dirname(_fileURLToPath(import.meta.url)), '../../../..');
import { chromium } from '@playwright/test';
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = WURZEL + '/docs/progress/editor';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
const shot = async (name, kam) => {
  await page.evaluate((k) => { window.__stores.ui.getState().maximieren('creation'); window.__stores.ui.getState().setzeKamera?.(k); }, kam);
  await page.waitForTimeout(1200);
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  await page.screenshot({ path: `${out}/${name}.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
};
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
  const yR = yM - 0.02 * r;
  const xR = xM - Math.sqrt(Math.max(0, r * r - (yR - yM) ** 2)) + 0.002;
  const ecke = [xM + 0.3 * r, yM - 0.3 * r];
  const oben = { knoten: glatt([[xR, yR], [xR + 0.5 * r, yR - 0.08 * r], ecke], 1) };
  const unten = { knoten: glatt([[xR + 0.12 * r, yR + 0.08 * r], [xR + 0.55 * r, yR + 0.04 * r], ecke], 0.9) };
  unten.knoten[2].p = [...oben.knoten[2].p];
  ed.setzeMaul({ zu: { oben, unten } });
  window.__stores.ui.getState().setzeEbene('maul');
});
await page.waitForTimeout(2500);
console.log('Kugel Überbiss (Florian):', JSON.stringify(await page.evaluate(() => window.__editor.wesen()?.lippen)));
await shot('ueberbiss-kugel-f-seite', { azimut: -0.25, elevation: 0.0, distanz: 0.8, ziel: [-0.08, 0.26, 0] });
await shot('ueberbiss-kugel-f-schraeg', { azimut: -0.9, elevation: -0.15, distanz: 0.7, ziel: [-0.1, 0.25, 0] });
await shot('ueberbiss-kugel-f-unten', { azimut: -0.8, elevation: -0.75, distanz: 0.8, ziel: [-0.1, 0.25, 0] });
await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0.3));
await page.waitForTimeout(1500);
await shot('ueberbiss-kugel-f-offen', { azimut: -0.6, elevation: -0.1, distanz: 0.8, ziel: [-0.1, 0.23, 0] });
await browser.close();
