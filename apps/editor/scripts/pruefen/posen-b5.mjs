// B5 (Plan Teil B): Rot und Blau der Pose mit echten Zügen. Rex (Prüfwesen, Überbiss), Stufe Maul, Layout Riss, Fressen:
// - Rot und Blau der Pose sind da (getrennt, eigene Anfänge, gemeinsamer Mundwinkel), Lippen ≤ 1 px im Titel;
// - blauen Knoten in der Seite ziehen: Versatzfeld der Pose gespeichert, Knoten folgt dem Zeiger, Rot bleibt, Lippen ≤ 1 px;
// - Undo; Griff eines roten Knotens ziehen; Stift fügt formneutral ein, Stift auf dem neuen Knoten löscht ihn;
// - Mundwinkel in der Front ziehen: Rot und Blau enden gemeinsam;
// - Pinsel an der Unterlippe (Bühne): die blaue Linie geht mit, das Versatzfeld bleibt;
// - schiefe Pose (Schädel gerollt): Knotenzug wirkt; Editor-Tab bitgleich die Grundpose.
// Über run-check.sh (eigener Vite auf 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
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
const lippen = () => page.evaluate(() => window.__editor.poseLippen());
const knoten = () =>
  page.$$eval('[data-pose-maulknoten] .maul-punkt', (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { id: e.parentElement.getAttribute('data-pose-maulknoten'), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }),
  );
const knotenIn = async (feld) => {
  const rc = await page.evaluate((f) => window.__stores.rahmen.getState().rects[f], feld);
  return (await knoten()).filter((k) => k.x >= rc.x && k.x <= rc.x + rc.w && k.y >= rc.y && k.y <= rc.y + rc.h);
};
const zug = async (von, dx, dy, schritte = 10) => {
  await page.mouse.move(von.x, von.y);
  await page.waitForTimeout(100);
  const v0 = await version();
  await page.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await page.mouse.move(von.x + (dx * i) / schritte, von.y + (dy * i) / schritte);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await warteBau(v0);
};
const klick = async (p) => {
  const v0 = await version();
  await page.mouse.click(p.x, p.y);
  await warteBau(v0);
};
const fressen = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__stores.editor.getState().dok.posen.find((p) => p.id === 'fressen'))));
const titelPx = () => page.$$eval('[data-lippe]', (els) => els.map((e) => ({ name: e.getAttribute('data-lippe'), px: Number(e.getAttribute('data-px')) })));
const bilder = [];
const bild = async (name, feld = 'seite') => {
  const rc = await page.evaluate((f) => window.__stores.rahmen.getState().rects[f], feld);
  const b = await page.screenshot({ clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
  bilder.push({ name, src: `data:image/png;base64,${b.toString('base64')}` });
};
const werkzeug = async (w) => {
  await page.evaluate((w) => window.__stores.ui.getState().setzeWerkzeug?.(w), w);
  await page.waitForTimeout(150);
};
const riss = async () => {
  await page.evaluate(() => {
    const ui = window.__stores.ui.getState();
    ui.setzeEbene('maul');
    ui.maximieren(null);
    ui.setzeWerkzeug?.('auswahl');
  });
  await page.waitForTimeout(600);
};

await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(300);
let v0 = await version();
await page.click('[data-pruefwesen="rex"]');
const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
await warteBau(v0);
await riss();
const hEditor = await hash();
v0 = await version();
await page.click('[data-tab="fressen"]');
await warteBau(v0);
await riss();
let l = await lippen();
const k0 = await knotenIn('seite');
pruefe('Rot und Blau der Pose sind da (getrennt)', !!l && !l.zu && k0.some((k) => k.id.startsWith('oben:')) && k0.some((k) => k.id.startsWith('unten:')), l ? `rot ${l.knoten.oben.length}, blau ${l.knoten.unten.length} Knoten` : 'keine Daten');
const px0 = await titelPx();
pruefe('Lippen ≤ 1 px auf den Linien (Titel)', px0.length >= 2 && px0.every((p) => p.px <= 1), px0.map((p) => `${p.name} ${p.px}`).join(', '));
await bild('Fressen: Rot und Blau der Pose (Seite)');
await bild('Fressen: Front', 'front');
const hF0 = await hash();

// blauen inneren Knoten 25 px nach unten ziehen
const blau = k0.filter((k) => k.id.startsWith('unten:'));
const innen = blau.filter((k) => k.id !== 'unten:0' && k.id !== `unten:${l.knoten.unten.length - 1}`);
const ziel = innen[0] ?? blau[0];
const rotVor = k0.filter((k) => k.id.startsWith('oben:'));
await zug(ziel, 0, 25);
l = await lippen();
const f1 = await fressen();
const k1 = await knotenIn('seite');
const ziel1 = k1.find((k) => k.id === ziel.id);
pruefe('Knotenzug speichert das Versatzfeld der Pose', !!f1.linien && f1.linien.unten.some((q) => Math.abs(q.d[1]) > 1e-4), f1.linien ? `${f1.linien.unten.length} blaue Knoten` : 'keine Linien');
pruefe('der blaue Knoten folgt dem Zeiger (≈ 25 px)', !!ziel1 && Math.abs(ziel1.y - ziel.y - 25) < 3 && Math.abs(ziel1.x - ziel.x) < 3, ziel1 ? `Δx ${(ziel1.x - ziel.x).toFixed(1)}, Δy ${(ziel1.y - ziel.y).toFixed(1)} px` : 'fehlt');
const rotNach = k1.filter((k) => k.id.startsWith('oben:'));
const rotMax = Math.max(...rotVor.map((a) => {
  const b = rotNach.find((q) => q.id === a.id);
  return b ? Math.hypot(b.x - a.x, b.y - a.y) : 99;
}));
pruefe('Rot bleibt (≤ 1 px)', rotMax <= 1, `${rotMax.toFixed(2)} px`);
const px1 = await titelPx();
pruefe('Lippen ≤ 1 px auf den Linien nach dem Zug', px1.every((p) => p.px <= 1), px1.map((p) => `${p.name} ${p.px}`).join(', '));
await bild('nach Zug: blauer Knoten 25 px tiefer');
const nah = async (name) => {
  await page.evaluate(() => {
    const ui = window.__stores.ui.getState();
    ui.maximieren('creation');
    ui.setzeKamera({ azimut: (-32 * Math.PI) / 180, elevation: (8 * Math.PI) / 180, distanz: 0.95, ziel: [-0.2, 0.24, 0] });
  });
  await page.waitForTimeout(700);
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const b = await page.screenshot({ clip: { x: rc.x + rc.w * 0.1, y: rc.y + rc.h * 0.08, width: rc.w * 0.8, height: rc.h * 0.84 } });
  bilder.push({ name, src: `data:image/png;base64,${b.toString('base64')}` });
  await riss();
};
await nah('Bühne nah: Unterlippe 25 px tiefer');
v0 = await version();
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await warteBau(v0);
pruefe('Undo nimmt den Zug zurück', (await hash()) === hF0 && !(await fressen()).linien);
// großer Zug: derselbe Knoten 60 px tiefer (Nahbild), danach zurück
{
  const z = (await knotenIn('seite')).find((k) => k.id === ziel.id);
  await zug(z, 0, 60, 16);
  const px = await titelPx();
  pruefe('großer Zug (60 px): Lippen ≤ 1 px', px.every((q) => q.px <= 1), px.map((q) => `${q.name} ${q.px}`).join(', '));
  await bild('großer Zug: blauer Knoten 60 px tiefer');
  await nah('Bühne nah: Unterlippe 60 px tiefer');
  v0 = await version();
  await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
  await warteBau(v0);
  pruefe('Undo nach dem großen Zug', (await hash()) === hF0);
}
await nah('Bühne nah: Fressen ohne Linienzug (Vergleich)');

// Griff eines roten Knotens: Knoten wählen (Klick), dann seinen Griff ziehen
{
  const rot = (await knotenIn('seite')).filter((k) => k.id.startsWith('oben:'));
  const r1 = rot.find((k) => k.id === 'oben:1') ?? rot[0];
  await klick(r1);
  await page.waitForTimeout(200);
  const griffe = await page.$$eval('[data-pose-maulgriff] rect:last-child', (els) => els.map((e) => ({ id: e.parentElement.getAttribute('data-pose-maulgriff'), x: e.getBoundingClientRect().x + 3, y: e.getBoundingClientRect().y + 3 })));
  const g = griffe.find((q) => q.id.endsWith(':aus')) ?? griffe[0];
  pruefe('Griffe des gewählten Knotens', !!g, griffe.map((q) => q.id).join(', '));
  if (g) {
    const vor = await hash();
    await zug(g, 18, -14);
    const f = await fressen();
    const k = Number(g.id.split(':')[1]);
    pruefe('Griffzug schreibt Griffversätze und formt', !!f.linien && f.linien.oben[k] && Math.hypot(...f.linien.oben[k].aus) > 1e-4 && (await hash()) !== vor);
    const px = await titelPx();
    pruefe('Lippen ≤ 1 px nach dem Griffzug', px.every((p) => p.px <= 1), px.map((p) => `${p.name} ${p.px}`).join(', '));
    await bild('nach Griffzug (Rot)');
  }
}

// Stift: auf der blauen Linie einfügen (formneutral), dann löschen
{
  await werkzeug('stift');
  const vorLagen = await page.evaluate(() => window.__editor.netzLagen());
  const nVor = (await lippen()).knoten.unten.length;
  const p = await page.evaluate(() => {
    const path = document.querySelector('[data-pose-maullinie="unten"]');
    const L = path.getTotalLength();
    const q = path.getPointAtLength(L * 0.3);
    const r = path.ownerSVGElement.getBoundingClientRect();
    return { x: q.x + r.x, y: q.y + r.y };
  });
  await klick(p);
  const nachLagen = await page.evaluate(() => window.__editor.netzLagen());
  let d = 0;
  for (let i = 0; i < vorLagen.length; i++) d = Math.max(d, Math.abs(vorLagen[i] - nachLagen[i]));
  const lE = await lippen();
  pruefe('Stift fügt einen Knoten ein (formneutral)', lE.knoten.unten.length === nVor + 1 && d < 1e-5, `${nVor} → ${lE.knoten.unten.length} Knoten, Lagen ${d.toExponential(1)}`);
  const neu = (await knotenIn('seite')).filter((k) => k.id.startsWith('unten:')).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  if (neu) await klick(neu);
  pruefe('Stift auf dem Knoten löscht ihn', (await lippen()).knoten.unten.length === nVor);
  await werkzeug('auswahl');
}

// Mundwinkel in der Front ziehen (schwarzer Punkt, gehört Rot): beide Linien enden gemeinsam
{
  const kf = await knotenIn('front');
  const lv = await lippen();
  const eckId = `oben:${lv.knoten.oben.length - 1}`;
  const ecke = kf.find((k) => k.id === eckId);
  pruefe('Mundwinkel in der Front', !!ecke);
  if (ecke) {
    await zug(ecke, 12, 0);
    const f = await fressen();
    const o = f.linien?.oben?.at(-1)?.d;
    const u = f.linien?.unten?.at(-1)?.d;
    pruefe('Mundwinkel gemeinsam (Rot = Blau) und versetzt', !!o && !!u && o.every((x, i) => Math.abs(x - u[i]) < 1e-12) && Math.hypot(...o) > 1e-4, o ? `d ${o.map((x) => x.toFixed(4)).join(', ')}` : '');
    const px = await titelPx();
    pruefe('Lippen ≤ 1 px nach dem Mundwinkel', px.every((q) => q.px <= 1), px.map((q) => `${q.name} ${q.px}`).join(', '));
    await bild('Mundwinkel in der Front gezogen', 'front');
  }
}

// Pinsel an der Unterlippe (Bühne, Stufe Posen & Leben: dort zeigt der Kern die Knochen): die blaue Linie geht mit, das Versatzfeld bleibt
{
  await page.evaluate(() => {
    const ui = window.__stores.ui.getState();
    ui.setzeEbene('posen');
    ui.maximieren('creation');
    ui.setzeKamera({ azimut: (-25 * Math.PI) / 180, elevation: (6 * Math.PI) / 180, distanz: 1.5, ziel: [-0.12, 0.27, 0] });
  });
  await warteBau(await version());
  const linVor = JSON.stringify((await fressen()).linien);
  const blauVor = (await lippen()).unten;
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const lp = (await lippen()).pixel?.unten;
  const formVor = (await fressen()).form.length;
  pruefe('Unterlippe auf der Bühne gefunden', !!lp && Number.isFinite(lp[0]), lp ? `${lp[0].toFixed(0)}, ${lp[1].toFixed(0)} px` : '');
  if (lp) {
    await werkzeug('ziehen');
    // knapp unter der Lippenkante auf der Unterlippe ansetzen, nach unten ziehen
    await zug({ x: rc.x + lp[0], y: rc.y + lp[1] + 5 }, 0, 22);
    pruefe('Pinsel: Form der Pose geändert', (await fressen()).form.length > formVor, `${formVor} → ${(await fressen()).form.length} Punkte`);
    const nach = await lippen();
    let bewegt = 0;
    for (let i = 0; i < blauVor.length; i++) bewegt = Math.max(bewegt, Math.abs(nach.unten[i] - blauVor[i]));
    pruefe('Pinsel: blaue Linie geht mit der Unterlippe', bewegt * 461 > 1, `${(bewegt * 461).toFixed(1)} px`);
    pruefe('Pinsel: Versatzfeld unverändert', JSON.stringify((await fressen()).linien) === linVor);
    pruefe('Pinsel: Lippen ≤ 1 px auf den Linien', nach.abweichung.oben <= 1 && nach.abweichung.unten <= 1, `rot ${nach.abweichung.oben.toFixed(2)}, blau ${nach.abweichung.unten.toFixed(2)} px`);
    await bild('nach Pinsel an der Unterlippe (Bühne)', 'creation');
    await werkzeug('auswahl');
  }
  await riss();
  await bild('nach Pinsel: Seite');
}

// Editor-Tab bitgleich
v0 = await version();
await page.click('[data-tab="editor"]');
await warteBau(v0);
pruefe('Editor-Tab bitgleich die Grundpose', (await hash()) === hEditor);

// schiefe Pose: Schädel gerollt, dann blauen Knoten ziehen
v0 = await version();
await page.click('[data-tab="fressen"]');
await warteBau(v0);
await riss();
v0 = await version();
await page.evaluate(() => {
  const ed = window.__stores.editor.getState();
  ed.poseSetzen('fressen', (p) => ({ ...p, stellung: { kiefer: { winkel: 55, ziehen: 0.5, gieren: 10 }, schaedel: { winkel: 15, rollen: 18 } } }));
});
await warteBau(v0);
await page.waitForTimeout(300);
{
  const ks = (await knotenIn('seite')).filter((k) => k.id.startsWith('unten:') && k.id !== 'unten:0');
  const z0 = ks[0];
  if (z0) {
    await zug(z0, 0, 20);
    const z1 = (await knotenIn('seite')).find((k) => k.id === z0.id);
    pruefe('schiefe Pose: Knotenzug wirkt', !!z1 && Math.abs(z1.y - z0.y - 20) < 4, z1 ? `Δy ${(z1.y - z0.y).toFixed(1)} px` : 'fehlt');
    const px = await titelPx();
    pruefe('schiefe Pose: Lippen ≤ 1 px', px.every((q) => q.px <= 1), px.map((q) => `${q.name} ${q.px}`).join(', '));
    await bild('schiefe Pose nach Knotenzug');
    await bild('schiefe Pose: Front', 'front');
  } else pruefe('schiefe Pose: blaue Knoten', false);
}
// geschlossenes Maul mit gleichen Kiefern (Tiger, Plattenmaul, Idle): eine türkise Linie, die beide Ketten schreibt
{
  await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
  await page.waitForTimeout(300);
  v0 = await version();
  await page.click('[data-pruefwesen="tiger"]');
  if (await verwerfen.isVisible({ timeout: 1500 }).catch(() => false)) await verwerfen.click();
  await warteBau(v0);
  await riss();
  const hL = await hash();
  v0 = await version();
  await page.click('[data-tab="idle"]');
  await warteBau(v0);
  await riss();
  const lz = await lippen();
  const art = await page.$eval('[data-pose-lippen]', (e) => e.getAttribute('data-pose-lippen')).catch(() => null);
  pruefe('Idle, Kiefer gleich: eine türkise Linie', !!lz && lz.zu && art === 'zu', `zu ${lz?.zu}, ${art}`);
  const kt = (await knotenIn('seite')).filter((k) => k.id.startsWith('oben:'));
  const kInnen = kt.find((k) => k.id === 'oben:1');
  if (kInnen) {
    await zug(kInnen, 0, -15);
    const idle = await page.evaluate(() => JSON.parse(JSON.stringify(window.__stores.editor.getState().dok.posen.find((p) => p.id === 'idle'))));
    pruefe('türkiser Zug schreibt Rot und Blau gleich', !!idle.linien && JSON.stringify(idle.linien.oben) === JSON.stringify(idle.linien.unten));
    const l2 = await lippen();
    pruefe('Maul bleibt geschlossen (eine Linie) und folgt', !!l2 && l2.zu && l2.abweichung.oben <= 1, l2 ? `${l2.abweichung.oben.toFixed(2)} px` : '');
    await bild('Tiger, Idle: türkise Linie nach Zug (15 px hoch)');
    await bild('Tiger, Idle: Front', 'front');
  } else pruefe('türkiser Knoten', false);
  v0 = await version();
  await page.click('[data-tab="editor"]');
  await warteBau(v0);
  pruefe('Tiger: Editor-Tab bitgleich', (await hash()) === hL);
}
pruefe('keine Seitenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(`\n${ok} ✓, ${nein} ✗`);
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd"><div style="display:grid;grid-template-columns:repeat(2,700px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.name}</div><img src="${b.src}" style="width:700px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'posen-b5.html'), html);
const zeige = await browser.newPage({ viewport: { width: 1420, height: 900 }, deviceScaleFactor: 1 });
await zeige.setContent(html);
await zeige.waitForTimeout(400);
await zeige.screenshot({ path: resolve(AUSGABE, 'posen-b5.png'), fullPage: true });
if (process.env.DOCS) await zeige.screenshot({ path: resolve(WURZEL, process.env.DOCS), fullPage: true, type: 'jpeg', quality: 82 });
console.log('Bild', resolve(AUSGABE, 'posen-b5.png'));
await browser.close();
process.exit(nein ? 1 : 0);
