// Vergleichsbild Zähne (Phase 2 M4): Library-Prüfwesen (WESEN, Standard rex) zu und offen aus KAMERAS (az°,el°,dist,x,y,z;…),
// darüber die Referenzen (REF: Pfade unter docs/look, ;-getrennt). DOK='{"zaehne":…}' setzt Felder ins Dokument (z. B.
// Zahnreihen), MAUL='{…}' Maul-Optionen. Ausgabe pruefen-ausgabe/<NAME>.png. Über run-check.sh (eigener Vite auf 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const WESEN = (process.env.WESEN ?? 'rex').split(',');
const OEFFNUNGEN = (process.env.OEFFNUNGEN ?? '0,1').split(',').map(Number);
const kameras = (process.env.KAMERAS ?? '-55,8,1.1,-0.25,0.24,0;-90,-20,1.1,-0.25,0.24,0').split(';').map((k) => {
  const [az, el, d, x, y, z] = k.split(',').map(Number);
  return { azimut: (az * Math.PI) / 180, elevation: (el * Math.PI) / 180, distanz: d, ziel: [x, y, z] };
});
const REF = (process.env.REF ?? 'docs/look/wesen-refs/bild11-rex-kopf.png;docs/look/editor/06-rex-mit-maul.png').split(';').filter(Boolean);
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
const bilder = [];
for (const id of WESEN) {
  await page.click(`[data-pruefwesen="${id}"]`);
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    const ui = window.__stores.ui.getState();
    ui.setzeEbene('zaehne');
    ui.maximieren('creation');
  });
  if (process.env.DOK) {
    await page.evaluate((felder) => {
      const ed = window.__stores.editor.getState();
      ed.setzeDokument({ ...ed.dok, ...felder });
    }, JSON.parse(process.env.DOK));
    await page.waitForTimeout(1500);
  }
  if (process.env.MAUL) {
    await page.evaluate((mo) => {
      const ed = window.__stores.editor.getState();
      const aus = ed.dok.ausstattung ?? {};
      ed.setzeDokument({ ...ed.dok, ausstattung: { ...aus, maulOptionen: { ...(aus.maulOptionen ?? {}), ...mo } } });
    }, JSON.parse(process.env.MAUL));
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(1200);
  for (const kam of kameras) {
    for (const oe of OEFFNUNGEN) {
      await page.evaluate(({ kam, oe }) => {
        const ui = window.__stores.ui.getState();
        ui.setzeKamera(kam);
        ui.setzeOeffnung(oe);
      }, { kam, oe });
      await page.waitForTimeout(1800);
      const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
      const b = await page.screenshot({ clip: { x: rc.x + rc.w * 0.15, y: rc.y + rc.h * 0.1, width: rc.w * 0.7, height: rc.h * 0.8 } });
      const info = await page.evaluate(() => {
        const w = window.__editor.wesen?.();
        return w ? `${w.zaehne ?? '?'} Zahnecken` : '';
      });
      bilder.push({ src: `data:image/png;base64,${b.toString('base64')}`, text: `${id} · offen ${Math.round(oe * 100)} % · ${info}` });
    }
  }
}
const refs = REF.map((p) => `data:image/png;base64,${readFileSync(resolve(WURZEL, p)).toString('base64')}`);
const spalten = Math.min(4, bilder.length);
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd">
<div style="display:flex;gap:6px;padding:6px;align-items:flex-start">${refs.map((r) => `<img src="${r}" style="height:300px">`).join('')}</div>
<div style="display:grid;grid-template-columns:repeat(${spalten},450px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:450px;display:block"></div>`).join('')}</div></body></html>`;
const NAME = process.env.NAME ?? `zahn-vergleich-${WESEN.join('-')}`;
writeFileSync(resolve(AUSGABE, `${NAME}.html`), html);
await page.setViewportSize({ width: Math.max(1000, spalten * 454 + 10), height: 1200 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, `${NAME}.png`), fullPage: true });
console.log('Bild', resolve(AUSGABE, `${NAME}.png`));
await browser.close();
