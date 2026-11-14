// Augen (Phase 2 M5, Schritt 1): PezenPez aus der Library in allen Zuständen (offen, zu, Sichel, X, Spirale, Schlitz), die
// Kugel als Paar mit Knopf und Mandel, Lid halb; neben Bild 10 und der PezenPez-Vorlage. Blinzeln aus (ruhige Bilder).
// Über run-check.sh (eigener Vite, 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const KAMERA = (process.env.KAMERA ?? '-90,6,1.25,0,0.25,0').split(',').map(Number);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
const kamera = async (k) => {
  await page.evaluate((k) => {
    const ui = window.__stores.ui.getState();
    ui.setzeKamera({ azimut: (k[0] * Math.PI) / 180, elevation: (k[1] * Math.PI) / 180, distanz: k[2], ziel: [k[3], k[4], k[5]] });
  }, k);
};
const bild = async (text) => {
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x + r.w * 0.2, y: r.y + r.h * 0.12, width: r.w * 0.6, height: r.h * 0.76 } });
  return { src: `data:image/png;base64,${png.toString('base64')}`, text };
};
const bilder = [];
await page.click('[data-pruefwesen="pezenpez"]');
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('augen');
  ui.setzeBlinzeln(false);
});
await kamera(KAMERA);
const info = await page.evaluate(() => ({ augen: window.__editor.wesen().augen.length, dok: window.__stores.editor.getState().dok.ausstattung?.augen }));
console.log('PezenPez:', JSON.stringify(info));
for (const z of ['offen', 'zu', 'sichel', 'x', 'spirale', 'schlitz']) {
  await page.evaluate((z) => window.__stores.ui.getState().setzeAugenZustand(z), z);
  bilder.push(await bild(`PezenPez · ${z}`));
}
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeAugenZustand('offen');
  ui.setzeAugenLid(0.5);
});
bilder.push(await bild('PezenPez · Lid 50 %'));
await page.evaluate(() => window.__stores.ui.getState().setzeAugenLid(0));
// Kugel als Paar: Knopf, Mandel (gedreht), schräg von vorn
await page.click('[data-pruefwesen="kugel"]');
await page.waitForTimeout(3000);
await page.evaluate(() => window.__stores.ui.getState().setzeEbene('augen'));
for (const [form, breite, drehung] of [
  ['knopf', 1, 0],
  ['mandel', 1.2, -12],
  ['schlitz', 1, 15],
]) {
  await page.evaluate(({ form, breite, drehung }) => {
    const ed = window.__stores.editor.getState();
    ed.setzeDokument({ ...ed.dok, ausstattung: { ...(ed.dok.ausstattung ?? {}), augen: { ring: 3, j: 3, groesse: 0.16, form, breite, drehung } } });
  }, { form, breite, drehung });
  await page.waitForTimeout(1500);
  await kamera([-60, 8, 1.3, 0, 0.25, 0]);
  bilder.push(await bild(`Kugel · Paar · ${form} · Breite ${breite} · ${drehung}°`));
}
const ref = (p) => (existsSync(resolve(WURZEL, p)) ? `data:image/png;base64,${readFileSync(resolve(WURZEL, p)).toString('base64')}` : '');
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1850px">
<div style="display:flex;gap:6px;padding:6px;align-items:flex-start"><img src="${ref('docs/look/wesen-refs/bild10-augen.png')}" style="height:180px"><img src="${ref('ref/editor/creatures/pezenpez.png')}" style="height:180px"></div>
<div style="display:grid;grid-template-columns:repeat(5,362px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:362px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'augen-zustaende.html'), html);
await page.setViewportSize({ width: 1850, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'augen-zustaende.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'augen-zustaende.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
