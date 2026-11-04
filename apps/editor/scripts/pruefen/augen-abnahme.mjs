// Abnahme Phase 2 M5 (Augen): PezenPez (gemalt), Glubsch (Glubschauge) und Rex (Augapfel in der Höhle) aus der Library,
// alle Zustände durchgeschaltet, neben Bild 10, der PezenPez-Vorlage und Bild 11. Blinzeln aus (ruhige Bilder). Über
// run-check.sh (eigener Vite, 5192).
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
const t0 = Date.now();
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
const laden = async (id) => {
  await page.click(`[data-pruefwesen="${id}"]`);
  const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
  if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
  await page.waitForTimeout(3500);
  const name = await page.evaluate(() => window.__stores.editor.getState().dok.name);
  if (String(name).toLowerCase() !== id) throw new Error(`Prüfwesen ${id} nicht geladen (Dokument ${name})`);
  await page.evaluate(() => {
    const ui = window.__stores.ui.getState();
    ui.setzeEbene('augen');
    ui.setzeBlinzeln(false);
    ui.setzeAugenZustand('offen');
    ui.setzeAugenLid(0);
  });
};
const kamera = (k) =>
  page.evaluate((k) => {
    window.__stores.ui.getState().setzeKamera({ azimut: (k[0] * Math.PI) / 180, elevation: (k[1] * Math.PI) / 180, distanz: k[2], ziel: [k[3], k[4], k[5]] });
  }, k);
const zustand = (z) => page.evaluate((z) => window.__stores.ui.getState().setzeAugenZustand(z), z);
const bilder = [];
const bild = async (text, aus = [0.2, 0.12, 0.6, 0.76]) => {
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x + r.w * aus[0], y: r.y + r.h * aus[1], width: r.w * aus[2], height: r.h * aus[3] } });
  bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text });
};
const ZUSTAENDE = ['offen', 'zu', 'sichel', 'x', 'spirale', 'schlitz'];
const info = {};
for (const [id, kam] of [
  ['pezenpez', [-90, 6, 1.25, 0, 0.25, 0]],
  ['glubsch', [-90, 6, 1.25, 0, 0.27, 0]],
]) {
  await laden(id);
  await kamera(kam);
  info[id] = await page.evaluate(() => window.__editor.wesen().augen.map((a) => `${a.art}/${a.form}`));
  for (const z of ZUSTAENDE) {
    await zustand(z);
    await bild(`${id} · ${z}`);
  }
}
await laden('rex');
const rex = await page.evaluate(() => ({ augen: window.__editor.wesen().augen.map((a) => ({ art: a.art, ecke: a.ecke, pos: a.pos })), sk: window.__stores.editor.getState().dok.skalierung }));
info.rex = rex.augen.map((a) => `${a.art} @ ${a.ecke}`);
const ziel = rex.augen[0].pos.map((x) => x * rex.sk);
for (const [oe, kam, text, z] of [
  [0, [-55, 6, 0.85, -0.2 * rex.sk, 0.27 * rex.sk, 0], 'zu', 'offen'],
  [1, [-55, 6, 0.85, -0.2 * rex.sk, 0.27 * rex.sk, 0], 'Maul offen', 'offen'],
  [0, [-35, 6, 0.3, ...ziel], 'nah · Auge offen', 'offen'],
  [0, [-35, 6, 0.3, ...ziel], 'nah · zu', 'zu'],
  [0, [-35, 6, 0.3, ...ziel], 'nah · X', 'x'],
  [0, [-35, 6, 0.3, ...ziel], 'nah · Spirale', 'spirale'],
]) {
  await zustand(z);
  await page.evaluate((oe) => window.__stores.ui.getState().setzeOeffnung(oe), oe);
  await page.waitForTimeout(2200);
  await kamera(kam);
  await bild(`rex · ${text}`, [0.15, 0.1, 0.7, 0.8]);
}
const ref = (p) => (existsSync(resolve(WURZEL, p)) ? `<img src="data:image/png;base64,${readFileSync(resolve(WURZEL, p)).toString('base64')}" style="height:170px">` : '');
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1850px">
<div style="display:flex;gap:6px;padding:6px;align-items:flex-start">${ref('docs/look/wesen-refs/bild10-augen.png')}${ref('ref/editor/creatures/pezenpez.png')}${ref('docs/look/wesen-refs/bild11-rex-kopf.png')}</div>
<div style="display:grid;grid-template-columns:repeat(6,302px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:302px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'augen-abnahme.html'), html);
await page.setViewportSize({ width: 1850, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'augen-abnahme.png'), fullPage: true });
console.log('Augen:', JSON.stringify(info));
console.log(`Dauer ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log('Bild', resolve(AUSGABE, 'augen-abnahme.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
