// Kiefer-Spanten im Editor (14.10.): Fall der Prüfreihe laden, mit Werkzeug S einen Spant über das Maul setzen (Klick
// in der Seite an der Mitte der roten Linie), die Front zeigt Ober- und Unterkiefer als zwei Kurven; Unterkiefer-Punkt
// nach außen ziehen (Maus), dann Oberkiefer-Punkt; Undo. Je Schritt Spant-Daten, Netz, Bilder. FALL; über run-check.sh.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const faelle = JSON.parse(readFileSync(resolve(AUSGABE, process.env.DATEI ?? 'pruefreihe.json'), 'utf-8'));
const FALL = process.env.FALL ?? 'kugel-ueberbiss';
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text().slice(0, 200)); });
await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate((d) => { const ui = window.__stores.ui.getState(); window.__stores.editor.getState().laden(d, null); ui.setzeEbene('form'); ui.maximieren(null); }, faelle[FALL].dok);
await page.waitForTimeout(3000);
const bildpunkt = (ansicht, p) =>
  page.evaluate(({ ansicht, p }) => {
    const svg = document.querySelector(`[data-view="${ansicht}"] svg.view2d`);
    const r = svg.getBoundingClientRect();
    const a = window.__stores.ui.getState().ansichten[ansicht];
    const s = a.zoom * 0.925 * Math.min(r.width, r.height);
    return { x: r.left + r.width / 2 + (p.x - a.cu) * s, y: r.top + r.height / 2 - (p.y - a.cv) * s };
  }, { ansicht, p });
const stand = (wo) =>
  page.evaluate((wo) => {
    const d = window.__stores.editor.getState().dok;
    const sp = d.spanten?.[0];
    const sel = window.__stores.ui.getState().spantAuswahl;
    return { wo, spanten: d.spanten?.length ?? 0, f: sp ? +sp.f.toFixed(3) : null, unten: !!sp?.unten, kiefer: !!document.querySelector('[data-view="front"] [data-kieferspant]'), luecke: !!document.querySelector('[data-view="seite"] [data-kieferspant]'), knotenOben: document.querySelectorAll('[data-view="front"] [data-spantknoten$=":oben"]').length, knotenUnten: document.querySelectorAll('[data-view="front"] [data-spantknoten$=":unten"]').length, auswahl: sel, punkte: window.__editor.vertices(), verlauf: window.__stores.editor.getState().verlauf.length, delta: [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent) };
  }, wo);
// Spant über dem Maul: Werkzeug S, Klick in der Seite unter der Mitte der roten Linie (im Körper)
const mitte = await page.evaluate(() => {
  const d = window.__stores.editor.getState().dok;
  const k = d.maul.zu.oben.knoten[1].p;
  return { x: k[0], y: k[1] - 0.04 };
});
await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('spant'));
const q = await bildpunkt('seite', mitte);
await page.mouse.click(q.x, q.y);
await page.waitForTimeout(2500);
console.log(JSON.stringify(await stand('Spant gesetzt')));
await page.screenshot({ path: `${AUSGABE}/kiefer-spant-1-gesetzt.png` });
// Front: Unterkiefer-Punkt (Raute) nach außen ziehen
const ziehe = async (sel, dx, dy) => {
  const el = await page.$(sel);
  if (!el) return console.log('nicht gefunden', sel);
  const b = await el.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(x + (dx * i) / 8, y + (dy * i) / 8); await page.waitForTimeout(40); }
  await page.mouse.up();
  await page.waitForTimeout(2500);
};
const unten = await page.evaluate(() => [...document.querySelectorAll('[data-view="front"] [data-spantknoten$=":unten"]')].map((e) => e.getAttribute('data-spantknoten')));
const oben = await page.evaluate(() => [...document.querySelectorAll('[data-view="front"] [data-spantknoten$=":oben"]')].map((e) => e.getAttribute('data-spantknoten')));
console.log('Knoten oben', oben.join(' '), '· unten', unten.join(' '));
// Punkt auf der Unterkiefer-Kurve einfügen (Werkzeug +, Klick auf die Mitte der sichtbaren Kurve)
await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('plus'));
const aufKurve = await page.evaluate(() => {
  const pfade = [...document.querySelectorAll('[data-view="front"] [data-spantteil="unten"] path')];
  const p = pfade[1];
  const m = p.getPointAtLength(p.getTotalLength() * 0.5);
  const ctm = p.getScreenCTM();
  return { x: ctm.a * m.x + ctm.c * m.y + ctm.e, y: ctm.b * m.x + ctm.d * m.y + ctm.f };
});
await page.mouse.click(aufKurve.x, aufKurve.y);
await page.waitForTimeout(1500);
await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('auswahl'));
console.log(JSON.stringify(await stand('Punkt eingefügt')));
// der äußerste Unterkiefer-Punkt (nicht auf der Achse): größtes x im Bild
const aussen = await page.evaluate(() => {
  let best = null;
  let bx = -Infinity;
  for (const e of document.querySelectorAll('[data-view="front"] [data-spantknoten$=":unten"]')) {
    const b = e.getBoundingClientRect();
    if (b.x > bx) { bx = b.x; best = e.getAttribute('data-spantknoten'); }
  }
  return best;
});
await ziehe(`[data-view="front"] [data-spantknoten="${aussen}"]`, 30, 0);
console.log(JSON.stringify(await stand('Unterkiefer gezogen')));
const spant = await page.evaluate(() => { const d = window.__stores.editor.getState().dok; const sp = d.spanten[0]; return { front: d.profile.front.knoten.length, profil: sp.profil.knoten.map((k) => [+k.p.x.toFixed(3), +k.p.y.toFixed(3)]), unten: sp.unten?.knoten.map((k) => [+k.p.x.toFixed(3), +k.p.y.toFixed(3)]) ?? null }; });
console.log('Spant', JSON.stringify(spant));
await page.screenshot({ path: `${AUSGABE}/kiefer-spant-2-unterkiefer.png` });
// Oberkiefer-Punkt (Kreis, außen) nach außen ziehen
const aussenOben = await page.evaluate(() => {
  let best = null;
  let bx = -Infinity;
  for (const e of document.querySelectorAll('[data-view="front"] [data-spantknoten$=":oben"]')) {
    const b = e.getBoundingClientRect();
    if (b.x > bx) { bx = b.x; best = e.getAttribute('data-spantknoten'); }
  }
  return best;
});
await ziehe(`[data-view="front"] [data-spantknoten="${aussenOben}"]`, -20, 0);
console.log(JSON.stringify(await stand('Oberkiefer gezogen')));
await page.screenshot({ path: `${AUSGABE}/kiefer-spant-3-oberkiefer.png` });
// Bühne von vorn unten: Perlen in zwei Reihen (Oberkiefer, Unterkiefer); eine Unterkiefer-Perle nach außen ziehen
await page.evaluate(() => { const ui = window.__stores.ui.getState(); ui.maximieren('creation'); });
await page.waitForTimeout(800);
await page.evaluate(() => window.__stores.ui.getState().setzeKamera({ azimut: -1.2, elevation: -0.35, distanz: 1.5, ziel: [-0.12, 0.22, 0] }));
await page.waitForTimeout(1500);
const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
const perlen = await page.evaluate(() => window.__editor.reifenPixel?.()?.perlen ?? []);
console.log('Perlen', JSON.stringify(perlen.map((p) => `${p.teil}:${p.knoten}:j${p.j}`)));
await page.screenshot({ path: `${AUSGABE}/kiefer-spant-4-buehne.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
const perleUnten = perlen.find((p) => p.teil === 'unten' && p.j > 0 && p.j < 8 && p.vorn > 0);
if (perleUnten) {
  const x = rc.x + perleUnten.px;
  const y = rc.y + perleUnten.py;
  const vorherSp = await page.evaluate(() => JSON.stringify(window.__stores.editor.getState().dok.spanten[0].unten?.knoten.map((k) => [+k.p.x.toFixed(3), +k.p.y.toFixed(3)]) ?? null));
  await page.mouse.move(x, y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(x + (12 * i) / 8, y + (14 * i) / 8); await page.waitForTimeout(50); }
  await page.mouse.up();
  await page.waitForTimeout(2500);
  const nachSp = await page.evaluate(() => { const sp = window.__stores.editor.getState().dok.spanten[0]; return { profil: sp.profil.knoten.map((k) => [+k.p.x.toFixed(3), +k.p.y.toFixed(3)]), unten: sp.unten?.knoten.map((k) => [+k.p.x.toFixed(3), +k.p.y.toFixed(3)]) ?? null, auswahl: window.__stores.ui.getState().spantAuswahl }; });
  console.log('Perle unten gezogen: unten vorher', vorherSp, '→', JSON.stringify(nachSp));
  await page.screenshot({ path: `${AUSGABE}/kiefer-spant-5-buehne-perle.png`, clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
  await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
  await page.waitForTimeout(1500);
} else console.log('keine Unterkiefer-Perle sichtbar');
await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
// Undo zweimal: Oberkiefer zurück, dann Unterkiefer zurück (unten fällt weg); einmal mehr: eingefügter Punkt weg
await page.evaluate(() => { window.__stores.editor.getState().rueckgaengig(); window.__stores.editor.getState().rueckgaengig(); });
await page.waitForTimeout(2000);
console.log(JSON.stringify(await stand('2× Undo')));
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(2000);
console.log(JSON.stringify(await stand('3× Undo')), 'Front-Knoten', await page.evaluate(() => window.__stores.editor.getState().dok.profile.front.knoten.length));
console.log('Fehler:', fehler.filter((f) => !f.includes('THREE.TSL')).slice(0, 6));
await browser.close();
