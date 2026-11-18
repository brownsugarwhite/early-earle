// Vergleichsbild runder Haps (Phase 2 M3): Library-Prüfwesen (Standard Tiger) zu, 60 % und 100 % offen aus KAMERAS
// (az°,el°,dist,x,y,z;…), daneben die Referenz `docs/look/wesen-refs/bild14-vier-maeuler.png`. Über run-check.sh.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const ID = process.env.WESEN ?? 'tiger';
const kameras = (process.env.KAMERAS ?? '-40,8,1.9,-0.2,0.32,0;-75,15,1.6,-0.25,0.35,0').split(';').map((k) => {
  const [az, el, d, x, y, z] = k.split(',').map(Number);
  return { azimut: (az * Math.PI) / 180, elevation: (el * Math.PI) / 180, distanz: d, ziel: [x, y, z] };
});
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
await page.click(`[data-pruefwesen="${ID}"]`);
await page.waitForTimeout(3500);
await page.evaluate(() => { const ui = window.__stores.ui.getState(); ui.setzeEbene('maul'); ui.maximieren('creation'); });
// MAUL='{"winkelOben":35,…}': Maul-Optionen in die Ausstattung (wie die Regler/Knochen im Fressen-Tab)
if (process.env.MAUL) {
  await page.evaluate((mo) => {
    const ed = window.__stores.editor.getState();
    const aus = ed.dok.ausstattung ?? {};
    ed.setzeDokument({ ...ed.dok, ausstattung: { ...aus, maulOptionen: { ...(aus.maulOptionen ?? {}), ...mo } } });
  }, JSON.parse(process.env.MAUL));
  await page.waitForTimeout(2500);
}
await page.waitForTimeout(1200);
const bilder = [];
for (const kam of kameras) {
  for (const oe of [0, 0.6, 1]) {
    await page.evaluate(({ kam, oe }) => { const ui = window.__stores.ui.getState(); ui.setzeKamera(kam); ui.setzeOeffnung(oe); }, { kam, oe });
    await page.waitForTimeout(1800);
    const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
    const b = await page.screenshot({ clip: { x: rc.x + rc.w * 0.1, y: rc.y + rc.h * 0.1, width: rc.w * 0.8, height: rc.h * 0.8 } });
    bilder.push({ src: `data:image/png;base64,${b.toString('base64')}`, text: `${ID} · offen ${Math.round(oe * 100)} %` });
  }
}
const ref = readFileSync(resolve(WURZEL, 'docs/look/wesen-refs/bild14-vier-maeuler.png')).toString('base64');
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd">
<div style="padding:6px">Referenz (bild14 „vier Mäuler“)</div><img src="data:image/png;base64,${ref}" style="width:1800px;display:block">
<div style="display:grid;grid-template-columns:repeat(3,600px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:600px;display:block"></div>`).join('')}</div></body></html>`;
const NAME = process.env.NAME ?? `haps-vergleich-${ID}`;
writeFileSync(resolve(AUSGABE, `${NAME}.html`), html);
await page.setViewportSize({ width: 1820, height: 1200 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, `${NAME}.png`), fullPage: true });
console.log('Bild', resolve(AUSGABE, `${NAME}.png`));
await browser.close();
