// Rundmaul fertig nach Plan (Florian 15.10.): Prüfwesen Fisch, Stufe Maul, Layout Riss. Der Ring ist eine Linie in Front und
// Seite; Rand ziehen ändert das O zu (geschlossen) bzw. O offen (offen), nach innen bis zur Mitte = geschlossen unsichtbar;
// Mitte ziehen rastet auf Käfigpunkte vorn. Je Zug ein Undo-Schritt. Bilder Bühne + Blätter. Über run-check.sh (5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
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
  ui.setzeOeffnung(0);
});
await page.waitForTimeout(800);
await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
await page.waitForTimeout(2500);
const stand = () =>
  page.evaluate(() => {
    const n = window.__editor.wesen();
    const r = window.__stores.editor.getState();
    const rm = n?.rundmaul ?? null;
    return { dok: r.dok.ausstattung?.rundmaul ?? null, verlauf: r.verlauf.length, ebene: document.querySelector('[data-view="front"] [data-rundmaul-ebene]')?.getAttribute('data-rundmaul-ebene') ?? null, ecken: n?.ecken ?? null, lippenBand: n?.lippenBand ?? null, rm };
  });
// Griffpunkte im Blatt (Client): Rand bei einem Anteil der Pfadlänge, Mitte
const griff = (blatt, art, anteil = 0) =>
  page.evaluate(
    ({ blatt, art, anteil }) => {
      const el = document.querySelector(`[data-view="${blatt}"] [data-rundmaul-griff="${art}"]`);
      if (!el) return null;
      if (art === 'mitte') {
        const b = el.getBoundingClientRect();
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      }
      const p = el.getPointAtLength(el.getTotalLength() * anteil);
      const m = el.getScreenCTM();
      return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
    },
    { blatt, art, anteil },
  );
const mitteVon = (blatt) => griff(blatt, 'mitte');
const ziehen = async (von, nach, schritte = 10) => {
  await page.mouse.move(von.x, von.y);
  await page.mouse.down();
  for (let k = 1; k <= schritte; k++) {
    await page.mouse.move(von.x + ((nach.x - von.x) * k) / schritte, von.y + ((nach.y - von.y) * k) / schritte);
    await page.waitForTimeout(60);
  }
  await page.mouse.up();
  await page.waitForTimeout(2200);
};
const bilder = [];
const bild = async (text) => {
  await page.waitForTimeout(900);
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects);
  for (const [feld, aus] of [['front', [0.15, 0.15, 0.7, 0.7]], ['seite', [0.05, 0.15, 0.6, 0.7]], ['creation', [0.15, 0.1, 0.7, 0.8]]]) {
    const r = rc[feld];
    if (!r) continue;
    const png = await page.screenshot({ clip: { x: r.x + r.w * aus[0], y: r.y + r.h * aus[1], width: r.w * aus[2], height: r.h * aus[3] } });
    bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text: `${text} · ${feld === 'creation' ? 'Bühne' : feld}` });
  }
};
const pruef = [];
const s0 = await stand();
console.log('Start:', JSON.stringify({ ...s0, rm: s0.rm ? { radius: s0.rm.radius, mitte: s0.rm.mitte, kandidaten: s0.rm.kandidaten.length } : null }));
pruef.push(['Ring im Front-Blatt', !!(await griff('front', 'rand'))]);
await bild('Start (O zu Standard)');
// 1) Rand im Front-Blatt nach außen: O zu wächst
const c = await mitteVon('front');
const rand = await griff('front', 'rand', 0.0);
const nachAussen = { x: c.x + (rand.x - c.x) * 1.8, y: c.y + (rand.y - c.y) * 1.8 };
await ziehen(rand, nachAussen);
const s1 = await stand();
console.log('Rand nach außen:', JSON.stringify(s1.dok), 'Radius', s1.rm?.radius?.toFixed(4), 'Undo', s1.verlauf - s0.verlauf);
pruef.push(['O zu größer', (s1.dok?.zu ?? 0) > 0.04], ['ein Undo-Schritt', s1.verlauf === s0.verlauf + 1]);
await bild('Rand nach außen (O zu größer)');
// 2) Rand nach innen bis zur Mitte: geschlossen unsichtbar
const rand2 = await griff('front', 'rand', 0.0);
const c2 = await mitteVon('front');
await ziehen(rand2, { x: c2.x + (rand2.x - c2.x) * 0.08, y: c2.y + (rand2.y - c2.y) * 0.08 });
const s2 = await stand();
console.log('Rand zur Mitte:', JSON.stringify(s2.dok), 'Ebene', s2.ebene, 'Radius', s2.rm?.radius, 'Lippenband', s2.lippenBand, 'Ecken', s2.ecken);
pruef.push(['O zu = 0', s2.dok?.zu === 0], ['unsichtbar (kein Ring im Netz)', s2.rm?.radius === 0], ['Blatt zeigt offene Vorschau', s2.ebene === 'unsichtbar'], ['kein Lippenband', s2.lippenBand === 0]);
await bild('geschlossen unsichtbar (O zu = 0)');
// 3) offen: das O wächst aus dem Punkt; Rand ziehen stellt O offen
await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(1));
await page.waitForTimeout(2500);
const s3 = await stand();
console.log('offen:', 'Radius', s3.rm?.radius?.toFixed(4), 'Ebene', s3.ebene);
pruef.push(['offen sichtbar', (s3.rm?.radius ?? 0) > 0.02]);
await bild('offen (aus dem Punkt)');
const rand3 = await griff('front', 'rand', 0.25);
const c3 = await mitteVon('front');
await ziehen(rand3, { x: c3.x + (rand3.x - c3.x) * 0.7, y: c3.y + (rand3.y - c3.y) * 0.7 });
const s4 = await stand();
console.log('offen Rand nach innen:', JSON.stringify(s4.dok), 'Radius', s4.rm?.radius?.toFixed(4));
pruef.push(['O offen kleiner', (s4.dok?.auf ?? 1) < (s3.rm ? 0.17 : 1)]);
await bild('offen, Rand nach innen (O offen kleiner)');
// 4) Mitte in der Seite nach unten: rastet tiefer
const m4 = await mitteVon('seite');
await ziehen(m4, { x: m4.x, y: m4.y + 70 });
const s5 = await stand();
console.log('Mitte nach unten:', JSON.stringify(s5.dok), 'Mitte', JSON.stringify(s5.rm?.mitte?.map((v) => +v.toFixed(3))), 'vorher', JSON.stringify(s4.rm?.mitte?.map((v) => +v.toFixed(3))));
pruef.push(['Mitte tiefer', !!s5.rm && !!s4.rm && s5.rm.mitte[1] < s4.rm.mitte[1] - 0.01], ['Punkt im Dokument auf der Spiegelebene', s5.dok?.punkt?.[2] === 0]);
await bild('Mitte nach unten gerastet');
// Undo ×4 → Ausgangslage
for (let i = 0; i < 4; i++) await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(2500);
const s6 = await stand();
console.log('Undo ×4:', JSON.stringify(s6.dok), 'Verlauf', s6.verlauf);
pruef.push(['Undo zurück', s6.verlauf === s0.verlauf]);
for (const [t, ok] of pruef) console.log(ok ? '✓' : '✗', t);
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1860px"><div style="display:grid;grid-template-columns:repeat(3,616px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:616px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'rundmaul-griffe.html'), html);
await page.setViewportSize({ width: 1860, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'rundmaul-griffe.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'rundmaul-griffe.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
