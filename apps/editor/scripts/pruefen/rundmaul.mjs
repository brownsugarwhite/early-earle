// Rundmaul (Phase 2 M6, Schritt 2): Prüfwesen Fisch aus der Library, Öffnung 0/25/50/75/100 % von vorn, offen schräg und
// von der Seite, neben `fish_round mouth`; dazu die Tafel (Chip aus/an, Regler O zu/offen) mit Dokument und Ecken.
// Über run-check.sh (eigener Vite, 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
await page.click('[data-pruefwesen="fisch"]');
await page.waitForTimeout(3500);
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('maul');
  ui.setzeBlinzeln(false);
});
const kamera = (k) =>
  page.evaluate((k) => {
    window.__stores.ui.getState().setzeKamera({ azimut: (k[0] * Math.PI) / 180, elevation: (k[1] * Math.PI) / 180, distanz: k[2], ziel: [k[3], k[4], k[5]] });
  }, k);
const stand = () =>
  page.evaluate(() => ({
    ecken: window.__editor.wesen().ecken,
    rundmaul: window.__stores.editor.getState().dok.ausstattung?.rundmaul ?? null,
    tafel: document.querySelector('[data-maul-art]')?.getAttribute('data-maul-art') ?? null,
  }));
const bilder = [];
const bild = async (text, aus = [0.2, 0.12, 0.6, 0.76]) => {
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x + r.w * aus[0], y: r.y + r.h * aus[1], width: r.w * aus[2], height: r.h * aus[3] } });
  bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text });
};
console.log('Fisch:', JSON.stringify(await stand()));
for (const [o, kam, t] of [
  [0, [-90, 4, 1.25, 0, 0.25, 0], 'zu · vorn'],
  [0.25, [-90, 4, 1.25, 0, 0.25, 0], '25 % · vorn'],
  [0.5, [-90, 4, 1.25, 0, 0.25, 0], '50 % · vorn'],
  [0.75, [-90, 4, 1.25, 0, 0.25, 0], '75 % · vorn'],
  [1, [-90, 4, 1.25, 0, 0.25, 0], 'offen · vorn'],
  [1, [-60, 8, 1.3, -0.15, 0.25, 0], 'offen · schräg'],
  [1, [-10, 4, 1.4, -0.15, 0.25, 0], 'offen · Seite'],
  [0, [-60, 8, 1.3, -0.15, 0.25, 0], 'zu · schräg'],
]) {
  await page.evaluate((o) => window.__stores.ui.getState().setzeOeffnung(o), o);
  await page.waitForTimeout(1800);
  await kamera(kam);
  await bild(`Fisch · ${t}`);
}
// Zähne rundum (Aal): zwölf Zähne, offen von vorn und schräg
await page.evaluate(() => {
  const ed = window.__stores.editor.getState();
  ed.setzeDokument({ ...ed.dok, ausstattung: { ...(ed.dok.ausstattung ?? {}), rundmaul: { ...(ed.dok.ausstattung?.rundmaul ?? {}), zaehne: 12 } } });
});
await page.waitForTimeout(2500);
for (const [o, kam, t] of [
  [1, [-90, 4, 1.25, 0, 0.25, 0], 'Zähne rundum · offen · vorn'],
  [0.6, [-60, 8, 1.3, -0.15, 0.25, 0], 'Zähne rundum · 60 % · schräg'],
]) {
  await page.evaluate((o) => window.__stores.ui.getState().setzeOeffnung(o), o);
  await page.waitForTimeout(1800);
  await kamera(kam);
  await bild(`Fisch · ${t}`);
}
console.log('Zähne:', await page.evaluate(() => window.__editor.wesen().zaehne));
// Tafel: Rundmaul aus und wieder an
await page.click('[data-rundmaul="aus"]');
await page.waitForTimeout(2500);
const aus = await stand();
await page.click('[data-rundmaul="an"]');
await page.waitForTimeout(2500);
const an = await stand();
console.log('Tafel aus:', JSON.stringify(aus), 'an:', JSON.stringify(an));
const ref = (p, h = 170) => (existsSync(resolve(WURZEL, p)) ? `<img src="data:image/png;base64,${readFileSync(resolve(WURZEL, p)).toString('base64')}" style="height:${h}px">` : '');
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1850px">
<div style="display:flex;gap:6px;padding:6px">${ref('ref/editor/creatures/fish_round mouth.png')}</div>
<div style="display:grid;grid-template-columns:repeat(4,452px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:452px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'rundmaul.html'), html);
await page.setViewportSize({ width: 1850, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'rundmaul.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'rundmaul.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
