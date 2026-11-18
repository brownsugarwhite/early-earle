// Augapfel (Phase 2 M5, Schritt 3, Look-Test): Rex mit tief eingesetzten Augäpfeln (Lederhaut orangerot, Iris gelb, kleine
// Pupille, Ruhelid als Brauenwulst, dunkler Ring) zu und offen wie Bild 11, ohne und mit Drehung (böser Blick); dazu der
// Spiegeltest: Kugel mit gedrehten gemalten Augen und Rex mit gedrehten Augäpfeln von vorn (beide Augen spiegelbildlich).
// Lage `LAGE` = x,y,z (Punkt der Ruhelage), Größe `GROESSE`. Über run-check.sh (eigener Vite, 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const LAGE = (process.env.LAGE ?? '-0.17,0.31,0.1').split(',').map(Number);
const GROESSE = Number(process.env.GROESSE ?? 0.075);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
const laden = async (id) => {
  await page.click(`[data-pruefwesen="${id}"]`);
  const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
  if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
  await page.waitForTimeout(3200);
  const name = await page.evaluate(() => window.__stores.editor.getState().dok.name);
  if (String(name).toLowerCase() !== id) throw new Error(`Prüfwesen ${id} nicht geladen (Dokument ${name})`);
};
const kamera = async (k) => {
  await page.evaluate((k) => {
    window.__stores.ui.getState().setzeKamera({ azimut: (k[0] * Math.PI) / 180, elevation: (k[1] * Math.PI) / 180, distanz: k[2], ziel: [k[3], k[4], k[5]] });
  }, k);
};
const augenSetzen = async (augen) => {
  await page.evaluate((augen) => {
    const ed = window.__stores.editor.getState();
    ed.setzeDokument({ ...ed.dok, ausstattung: { ...(ed.dok.ausstattung ?? {}), augen } });
  }, augen);
  await page.waitForTimeout(1600);
};
const bilder = [];
const bild = async (text, aus = [0.15, 0.1, 0.7, 0.8]) => {
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x + r.w * aus[0], y: r.y + r.h * aus[1], width: r.w * aus[2], height: r.h * aus[3] } });
  bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text });
};
// Spiegeltest gemalt: Kugel, Mandel 25° gedreht, von vorn
await laden('kugel');
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('augen');
  ui.setzeBlinzeln(false);
});
await augenSetzen({ ring: 2, j: 2, groesse: 0.16, form: 'mandel', breite: 1.3, drehung: 25 });
await kamera([-90, 4, 1.7, 0, 0.27, 0]);
await bild('Kugel · gemalt · Mandel 25° · von vorn (spiegelbildlich?)', [0.2, 0.12, 0.6, 0.76]);
await augenSetzen({ ring: 2, j: 2, groesse: 0.16, art: 'glubsch', form: 'schlitz', drehung: 25 });
await bild('Kugel · Glubsch · Schlitz 25° · von vorn (spiegelbildlich?)', [0.2, 0.12, 0.6, 0.76]);
// Rex mit Augäpfeln
await laden('rex');
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('augen');
  ui.setzeBlinzeln(false);
});
const basis = { ring: 4, j: 2, groesse: GROESSE, punkt: LAGE, art: 'augapfel', form: 'knopf' };
await augenSetzen(basis);
const augen = await page.evaluate(() => window.__editor.wesen().augen.map((a) => ({ pos: a.pos, posiert: a.posiert.pos, n: a.normale.map((x) => +x.toFixed(2)), groesse: +a.groesse.toFixed(4), tiefe: a.tiefe })));
console.log('Rex-Augen:', JSON.stringify(augen));
const sk = await page.evaluate(() => window.__stores.editor.getState().dok.skalierung);
const ziel = (p) => [p[0] * sk, p[1] * sk, p[2] * sk];
const kopf = [-0.2 * sk, 0.27 * sk, 0];
for (const [drehung, oe, kam, text] of [
  [0, 0, [-62, -8, 0.9, ...kopf], 'zu · Drehung 0°'],
  [20, 0, [-62, -8, 0.9, ...kopf], 'zu · Drehung 20°'],
  [20, 1, [-62, -8, 0.9, ...kopf], 'offen · Drehung 20°'],
  [20, 0, [-90, 2, 0.9, ...kopf], 'von vorn · Drehung 20° (spiegelbildlich?)'],
  [20, 0, [-35, 6, 0.32, ...ziel(augen[0].pos)], 'nah · zu · Drehung 20°'],
  [0, 0, [-35, 6, 0.32, ...ziel(augen[0].pos)], 'nah · zu · Drehung 0°'],
  [20, 0, [-90, 18, 0.32, ...ziel(augen[0].pos)], 'nah · von vorn oben (Wulst?)'],
  [20, 0, [0, 2, 0.32, ...ziel(augen[0].pos)], 'nah · Seite (Wulst?)'],
]) {
  await augenSetzen({ ...basis, drehung });
  await page.evaluate((oe) => window.__stores.ui.getState().setzeOeffnung(oe), oe);
  await page.waitForTimeout(2200);
  await kamera(kam);
  await bild(`Rex · Augapfel · ${text}`);
}
// Nah an Bild 11 (offen: das Auge sitzt mit dem Schädel höher)
await augenSetzen({ ...basis, drehung: 20 });
await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(1));
await page.waitForTimeout(2200);
const offen = await page.evaluate(() => window.__editor.wesen().augen[0].posiert.pos);
await kamera([-55, -6, 0.45, ...ziel(offen)]);
await bild('Rex · Augapfel · offen · nah');
await page.evaluate(() => window.__stores.ui.getState().setzeAugenZustand('zu'));
await bild('Rex · Augapfel · zu (Zustand) · nah');
await page.evaluate(() => window.__stores.ui.getState().setzeAugenZustand('x'));
await bild('Rex · Augapfel · X · nah');
await page.evaluate(() => window.__stores.ui.getState().setzeAugenZustand('offen'));
const ref = (p) => `data:image/png;base64,${readFileSync(resolve(WURZEL, p)).toString('base64')}`;
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1850px">
<div style="display:flex;gap:6px;padding:6px;align-items:flex-start"><img src="${ref('docs/look/wesen-refs/bild11-rex-kopf.png')}" style="height:260px"><img src="${ref('docs/look/wesen-refs/crops/rex-kopf.png')}" style="height:260px"></div>
<div style="display:grid;grid-template-columns:repeat(3,604px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:604px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'augen-augapfel.html'), html);
await page.setViewportSize({ width: 1850, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'augen-augapfel.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'augen-augapfel.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
