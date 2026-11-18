// Tiger (Ring 24): Mercedesstern im FRONT-Blatt gezeichnet (Mausklicks wie Florian): Mitte der Platte → außen-unten → Winkel
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
// ohne Maul-Vorlage: die Ausstattungs-Maullinie des Tigers wird durch die gezeichnete ersetzt (bauplanAus: nur ohne dok.ausstattung.maulLinie)
await page.goto(`${url}/?versuch=kern&wesen=tiger&bauweise=kern&look=earle&palette=tiger`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.waitForTimeout(1000);
const karte = await page.evaluate(() => {
  const d = window.__stores.editor.getState().dok;
  const sk = d.skalierung;
  const svg = document.querySelector('[data-view="front"] svg.view2d') ?? document.querySelector('[data-view="front"] svg');
  if (!svg) return { fehler: 'kein svg' };
  const kn = [...svg.querySelectorAll('[data-knoten]')].map((g) => { const c = g.querySelector('circle'); const r = c.getBoundingClientRect(); return { i: Number(g.getAttribute('data-knoten')), sx: r.x + r.width / 2, sy: r.y + r.height / 2 }; });
  if (kn.length < 2) return { fehler: 'keine Knoten', n: kn.length };
  const a = kn[0], b = kn.find((k) => Math.abs(d.profile.front.knoten[k.i].p.y - d.profile.front.knoten[a.i].p.y) > 0.05 && Math.abs(d.profile.front.knoten[k.i].p.x - d.profile.front.knoten[a.i].p.x) > 0.02) ?? kn[1];
  const pa = d.profile.front.knoten[a.i].p, pb = d.profile.front.knoten[b.i].p;
  const mx = (b.sx - a.sx) / (pb.x - pa.x), my = (b.sy - a.sy) / (pb.y - pa.y);
  return { sk, mx, my, ox: a.sx - mx * pa.x, oy: a.sy - my * pa.y, hatAusstattung: !!d.ausstattung?.maulLinie };
});
console.log('Abbildung:', JSON.stringify(karte));
await page.evaluate(() => { window.__stores.ui.getState().setzeEbene('maul'); window.__stores.ui.getState().maximieren(null); });
await page.waitForTimeout(1200);
const zuBild = (x, y) => [karte.ox + karte.mx * x, karte.oy + karte.my * y];
// Stern: Mitte der Platte (Welt y 0,358), Arm nach außen-unten bis zum Winkel (z 0,035, y 0,323); Profil = Welt / Maßstab
const sk = karte.sk;
const punkte = [[0, 0.358 / sk], [0.018 / sk, 0.35 / sk], [0.035 / sk, 0.323 / sk]];
for (const [x, y] of punkte) { const [sx, sy] = zuBild(x, y); await page.mouse.click(sx, sy); await page.waitForTimeout(150); }
const zwischen = await page.evaluate(() => window.__stores.ui.getState().maulZeichnen);
console.log('Punkte vor Enter (Profil):', JSON.stringify(zwischen?.map((p) => p.map((v) => +v.toFixed(3)))));
await page.keyboard.press('Enter');
await page.waitForFunction(() => { const w = window.__editor.wesen(); return w && w.maul; }, null, { timeout: 30_000 }).catch(() => console.log('Maul nicht gebaut (Timeout)'));
await page.waitForTimeout(1200);
const erg = await page.evaluate(() => { const w = window.__editor.wesen(); const d = window.__stores.editor.getState().dok; return { knoten: d.maul?.zu.oben.knoten.map((k) => k.p.map((v) => +(v * d.skalierung).toFixed(3))), maul: w.maul, umbau: w.umbau }; });
console.log('Front gezeichnet (Welt):', JSON.stringify(erg));
await page.evaluate(() => { window.__stores.ui.getState().maximieren('creation'); window.__stores.ui.getState().setzeKamera?.({ azimut: -0.6, elevation: 0.15, distanz: 1.1, ziel: [-0.3, 0.33, 0] }); });
await page.waitForTimeout(1000);
const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
await page.screenshot({ path: `${out}/platte-tiger-gezeichnet-zu.png`, clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(1));
await page.waitForTimeout(1500);
const g = await page.evaluate(() => ({ griffe: window.__editor.griffe?.(), oeffnung: window.__stores.ui.getState().oeffnung }));
console.log('offen:', JSON.stringify(g));
await page.screenshot({ path: `${out}/platte-tiger-gezeichnet-offen.png`, clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
await browser.close();
