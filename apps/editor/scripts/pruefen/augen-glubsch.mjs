// Glubschaugen (Phase 2 M5, Schritt 2): Prüfwesen Glubsch (ein großes Glubschauge in der Mitte, Bild 10) in allen Zuständen
// und mit halbem Lid, die Kugel mit einem Paar schräg von vorn (wie das dritte und fünfte Wesen in Bild 10), der Rex mit
// Glubschaugen zu und offen von der Seite (das Auge folgt dem Schädel). Dazu die Lage der Augenkugeln aus dem Renderer
// (Abstand zur posierten Hautstelle). Blinzeln aus (ruhige Bilder). Über run-check.sh (eigener Vite, 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
page.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
const kamera = async (k) => {
  await page.evaluate((k) => {
    window.__stores.ui.getState().setzeKamera({ azimut: (k[0] * Math.PI) / 180, elevation: (k[1] * Math.PI) / 180, distanz: k[2], ziel: [k[3], k[4], k[5]] });
  }, k);
};
const bild = async (text, ausschnitt = [0.2, 0.12, 0.6, 0.76]) => {
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x + r.w * ausschnitt[0], y: r.y + r.h * ausschnitt[1], width: r.w * ausschnitt[2], height: r.h * ausschnitt[3] } });
  return { src: `data:image/png;base64,${png.toString('base64')}`, text };
};
// Library-Wesen laden; fragt der Editor „Anderes Wesen laden?“ (Dokument geändert), verwerfen
const laden = async (id) => {
  await page.click(`[data-pruefwesen="${id}"]`);
  const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
  if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
  await page.waitForTimeout(3200);
  const name = await page.evaluate(() => window.__stores.editor.getState().dok.name);
  if (String(name).toLowerCase() !== id) throw new Error(`Prüfwesen ${id} nicht geladen (Dokument ${name})`);
};
const augenDaten = () =>
  page.evaluate(() => {
    const w = window.__editor.wesen();
    return w.augen.map((a) => ({ art: a.art, tiefe: a.tiefe, groesse: +a.groesse.toFixed(4), pos: a.pos.map((x) => +x.toFixed(4)), posiert: a.posiert.pos.map((x) => +x.toFixed(4)) }));
  });
const bilder = [];
await laden('glubsch');
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('augen');
  ui.setzeBlinzeln(false);
});
await kamera([-90, 6, 1.25, 0, 0.27, 0]);
console.log('Glubsch:', JSON.stringify(await augenDaten()));
for (const z of ['offen', 'zu', 'sichel', 'x', 'spirale', 'schlitz']) {
  await page.evaluate((z) => window.__stores.ui.getState().setzeAugenZustand(z), z);
  bilder.push(await bild(`Glubsch · ${z}`));
}
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeAugenZustand('offen');
  ui.setzeAugenLid(0.5);
});
bilder.push(await bild('Glubsch · Lid 50 %'));
await page.evaluate(() => window.__stores.ui.getState().setzeAugenLid(0));
await kamera([-40, 10, 1.15, -0.2, 0.3, 0]);
bilder.push(await bild('Glubsch · schräg'));
await kamera([-90, 4, 1.25, 0, 0.27, 0]);
await page.evaluate(() => window.__stores.ui.getState().setzeAugenZustand('zu'));
await kamera([-40, -8, 1.15, -0.2, 0.3, 0]);
bilder.push(await bild('Glubsch · zu · schräg von unten'));
await page.evaluate(() => window.__stores.ui.getState().setzeAugenZustand('offen'));
// Kugel mit einem Paar: Knopf, schräg von vorn (wie Bild 10, drittes und fünftes Wesen), auch zu und Schlitz-Pupille
await laden('kugel');
await page.evaluate(() => window.__stores.ui.getState().setzeEbene('augen'));
for (const [form, zustand, kam] of [
  ['knopf', 'offen', [-40, 8, 1.3, 0, 0.25, 0]],
  ['knopf', 'offen', [-90, 4, 1.3, 0, 0.25, 0]],
  ['knopf', 'zu', [-40, 8, 1.3, 0, 0.25, 0]],
  ['schlitz', 'offen', [-40, 8, 1.3, 0, 0.25, 0]],
  ['mandel', 'sichel', [-40, 8, 1.3, 0, 0.25, 0]],
]) {
  await page.evaluate(({ form, zustand }) => {
    const ed = window.__stores.editor.getState();
    ed.setzeDokument({ ...ed.dok, ausstattung: { ...(ed.dok.ausstattung ?? {}), augen: { ring: 3, j: 2, groesse: 0.24, art: 'glubsch', form } } });
    window.__stores.ui.getState().setzeAugenZustand(zustand);
  }, { form, zustand });
  await page.waitForTimeout(1500);
  await kamera(kam);
  bilder.push(await bild(`Kugel · Paar · ${form} · ${zustand} · ${kam[0]}°`));
}
await page.evaluate(() => window.__stores.ui.getState().setzeAugenZustand('offen'));
console.log('Kugel-Paar:', JSON.stringify(await augenDaten()));
// Rex mit Glubschaugen: zu und offen von der Seite — die Kugel folgt dem Schädel
await laden('rex');
await page.evaluate(() => {
  const ed = window.__stores.editor.getState();
  ed.setzeDokument({ ...ed.dok, ausstattung: { ...(ed.dok.ausstattung ?? {}), augen: { ring: 4, j: 2, groesse: 0.07, art: 'glubsch', form: 'knopf' } } });
  window.__stores.ui.getState().setzeEbene('augen');
});
await page.waitForTimeout(2500);
for (const [oe, kam] of [
  [0, [0, 4, 1.25, -0.2, 0.3, 0]],
  [1, [0, 4, 1.25, -0.2, 0.3, 0]],
  [1, [-50, 10, 1.1, -0.25, 0.32, 0]],
]) {
  await page.evaluate((oe) => window.__stores.ui.getState().setzeOeffnung(oe), oe);
  await page.waitForTimeout(2500);
  await kamera(kam);
  console.log(`Rex offen ${oe}:`, JSON.stringify(await augenDaten()));
  bilder.push(await bild(`Rex · Glubsch · offen ${oe * 100} % · ${kam[0]}°`));
}
const ref = (p) => `data:image/png;base64,${readFileSync(resolve(WURZEL, p)).toString('base64')}`;
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1850px">
<div style="display:flex;gap:6px;padding:6px;align-items:flex-start"><img src="${ref('docs/look/wesen-refs/bild10-augen.png')}" style="height:180px"></div>
<div style="display:grid;grid-template-columns:repeat(5,362px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:362px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'augen-glubsch.html'), html);
await page.setViewportSize({ width: 1850, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'augen-glubsch.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'augen-glubsch.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
