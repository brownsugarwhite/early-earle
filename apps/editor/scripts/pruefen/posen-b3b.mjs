// B3b (Florians Entscheidung 10: Knochen in 3D für asymmetrische Mäuler): echte Züge an den Bühnengriffen des Rex in
// der Fressen-Pose, Blick schräg von vorn. Oberkiefer rollen (türkiser Griff), „Symmetrisch“ stellt bitgleich zurück;
// Unterkiefer an der Spitze seitlich schwenken (Gieren) und an der Mitte seitlich schieben; Pinsel in der schiefen Pose;
// der Editor-Tab bleibt bitgleich. Über run-check.sh (eigener Vite auf 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const AZ = Number(process.env.AZ ?? -65);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e).slice(0, 240)));
page.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text().slice(0, 240));
});
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
let ok = 0;
let nein = 0;
const pruefe = (name, bed, info = '') => {
  if (bed) ok++;
  else nein++;
  console.log(`${bed ? '✓' : '✗'} ${name}${info ? ' — ' + info : ''}`);
};
const version = () => page.evaluate(() => window.__editor.netzVersion());
const warteBau = async (v0) => {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v, v0, { timeout: 30_000 }).catch(() => {});
  let v = await version();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    const w = await version();
    if (w === v) break;
    v = w;
  }
};
const hash = () => page.evaluate(() => window.__editor.netzHash());
const rect = () => page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
const griffe = async () => {
  const rc = await rect();
  const g = await page.evaluate(() => window.__editor.knochen?.() ?? []);
  return Object.fromEntries(g.map((x) => [x.art, { x: rc.x + x.px, y: rc.y + x.py }]));
};
const zug = async (von, dx, dy) => {
  await page.mouse.move(von.x, von.y);
  await page.waitForTimeout(120);
  const v0 = await version();
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(von.x + (dx * i) / 12, von.y + (dy * i) / 12);
    await page.waitForTimeout(45);
  }
  await page.mouse.up();
  await warteBau(v0);
};
const stellung = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__stores.editor.getState().dok.posen.find((p) => p.id === 'fressen')?.stellung ?? null)));
const bilder = [];
const bild = async (name) => {
  const rc = await rect();
  const b = await page.screenshot({ clip: { x: rc.x + rc.w * 0.15, y: rc.y + rc.h * 0.08, width: rc.w * 0.7, height: rc.h * 0.84 } });
  bilder.push({ name, src: `data:image/png;base64,${b.toString('base64')}` });
};

await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(300);
let v0 = await version();
await page.click('[data-pruefwesen="rex"]');
const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
await warteBau(v0);
await page.evaluate((az) => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('posen');
  ui.maximieren('creation');
  ui.setzeWerkzeug?.('auswahl');
  ui.setzeKamera({ azimut: (az * Math.PI) / 180, elevation: (8 * Math.PI) / 180, distanz: 1.35, ziel: [-0.2, 0.27, 0] });
}, AZ);
await warteBau(await version());
const hEditor = await hash();
v0 = await version();
await page.click('[data-tab="fressen"]');
await warteBau(v0);
const hF0 = await hash();
await bild('Fressen, Knochen eben');
const g0 = await griffe();
pruefe('Rollgriffe auf der Bühne', !!g0['kiefer-roll'] && !!g0['schaedel-roll'], Object.keys(g0).join(', '));

// 1) Oberkiefer rollen
if (g0['schaedel-roll']) await zug(g0['schaedel-roll'], 0, -45);
const st1 = await stellung();
pruefe('Oberkiefer gerollt (Stellung der Pose)', Math.abs(st1?.schaedel?.rollen ?? 0) > 2, JSON.stringify(st1?.schaedel ?? null));
const hRoll = await hash();
pruefe('Pose sichtbar verändert', hRoll !== hF0);
await bild(`Oberkiefer gerollt ${Math.round(st1?.schaedel?.rollen ?? 0)}°`);
// „Symmetrisch“: zurück, bitgleich
v0 = await version();
await page.click('[data-pose-symmetrisch="fressen"]');
await warteBau(v0);
const st2 = await stellung();
pruefe('Symmetrisch: Rollen entfernt', st2?.schaedel?.rollen === undefined, JSON.stringify(st2 ?? null));
pruefe('Symmetrisch: Pose bitgleich wie vorher', (await hash()) === hF0);

// 2) Unterkiefer an der Spitze seitlich schwenken, an der Mitte seitlich schieben
const g1 = await griffe();
if (g1['kiefer-dreh']) await zug(g1['kiefer-dreh'], 45, 0);
const st3 = await stellung();
pruefe('Unterkiefer gegiert', Math.abs(st3?.kiefer?.gieren ?? 0) > 2, JSON.stringify(st3?.kiefer ?? null));
const g2 = await griffe();
if (g2['kiefer-zug']) await zug(g2['kiefer-zug'], 30, 0);
const st4 = await stellung();
pruefe('Unterkiefer seitlich verschoben', Math.abs(st4?.kiefer?.seit ?? 0) > 0.01, JSON.stringify(st4?.kiefer ?? null));
// und den Oberkiefer wieder rollen: asymmetrisches Maul
const g3 = await griffe();
if (g3['schaedel-roll']) await zug(g3['schaedel-roll'], 0, 35);
const st5 = await stellung();
await bild(`Unterkiefer gieren ${Math.round(st5?.kiefer?.gieren ?? 0)}°, seitlich ${Math.round((st5?.kiefer?.seit ?? 0) * 100)} %, Oberkiefer rollen ${Math.round(st5?.schaedel?.rollen ?? 0)}°`);

// 3) Pinsel in der schiefen Pose
await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug?.('ziehen'));
await page.waitForTimeout(200);
const g4 = await griffe();
const formVor = await page.evaluate(() => window.__stores.editor.getState().dok.posen.find((p) => p.id === 'fressen')?.form.length ?? 0);
if (g4['kiefer-zug']) await zug({ x: g4['kiefer-zug'].x + 14, y: g4['kiefer-zug'].y + 36 }, 0, 30);
const formNach = await page.evaluate(() => window.__stores.editor.getState().dok.posen.find((p) => p.id === 'fressen')?.form.length ?? 0);
pruefe('Pinsel in der schiefen Pose schreibt die Form', formNach > formVor, `${formVor} → ${formNach} Punkte`);
await bild('schiefe Pose nach Pinsel G');

// 4) Editor-Tab bitgleich
v0 = await version();
await page.click('[data-tab="editor"]');
await warteBau(v0);
pruefe('Editor-Tab danach bitgleich die Grundpose', (await hash()) === hEditor);
pruefe('keine Seitenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(`\n${ok} ✓, ${nein} ✗`);
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd"><div style="display:grid;grid-template-columns:repeat(2,640px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.name}</div><img src="${b.src}" style="width:640px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'posen-b3b.html'), html);
const zeige = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 1 });
await zeige.setContent(html);
await zeige.waitForTimeout(400);
await zeige.screenshot({ path: resolve(AUSGABE, 'posen-b3b.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'posen-b3b.png'));
await browser.close();
process.exit(nein ? 1 : 0);
