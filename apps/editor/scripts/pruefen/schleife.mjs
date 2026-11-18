// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V6.2: Loops mit ⌘R im echten Editor (eigener Vite über run-check.sh,
// nie 5180). Florians Ablauf: Startkugel, dann die Umrisse des Langhalses. Je Vorgang mit echten Tasten, Rad und Klicks:
// ⌘R über der Bühne zeigt die Vorschau, zwei Radschritte = drei Loops, Klick setzt sie (R + 3, Knoten in Seite und Top,
// Umrisse bleiben); ⌘Z nimmt alles in einem Schritt zurück. Ein Loop: Klick legt das Ringpaar fest, der Loop gleitet mit der
// Maus, zweiter Klick setzt ihn; Esc beim Gleiten setzt ihn in die Mitte; Rechtsklick vor dem ersten Klick bricht ab; ⌃R
// startet ebenso; über dem Seitenblatt zeigt das Blatt die Sprosse. Bilder in AUSGABE.
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/schleife.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v6');
mkdirSync(out, { recursive: true });
const koerper = process.env.KOERPER ?? 'langhals';
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/extremreihe.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
const seitenfehler = [];
page.on('pageerror', (e) => {
  seitenfehler.push(String(e));
  console.log('[pageerror]', String(e).slice(0, 300));
});
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`  ${ok ? 'ok  ' : 'FEHL'} ${text}`);
  if (!ok) fehler++;
};

/** bis eine Sekunde lang kein neues Netz kam */
async function ruhig() {
  let v = await page.evaluate(() => window.__editor.netzVersion());
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const w = await page.evaluate(() => window.__editor.netzVersion());
    if (w === v) return;
    v = w;
  }
}
const deltas = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-view]')].map((v) => [v.getAttribute('data-view'), Number(v.querySelector('[data-delta]')?.getAttribute('data-delta') ?? NaN)]).filter(([, d]) => Number.isFinite(d))));
const zeige = (d) => ['seite', 'front', 'top'].map((b) => `${b} ${(d[b] ?? NaN).toFixed(1)}`).join(' · ');
const dokStand = () =>
  page.evaluate(() => {
    const d = window.__stores.editor.getState().dok;
    // Breitenknoten der Loops im Top (liegende Ringe) oder in der Front (stehende Ringe)
    return { schleifen: d.schleifen ?? [], seite: d.profile.seite.knoten.length, top: d.profile.top.knoten.length, front: d.profile.front.knoten.length, breite: d.profile.top.knoten.filter((k) => k.schleife).length + d.profile.front.knoten.filter((k) => k.schleife).length, markiert: d.profile.seite.knoten.filter((k) => k.schleife).length, verlauf: window.__stores.editor.getState().verlauf.length };
  });
const wesen = () => page.evaluate(() => window.__editor.wesen());
const schleifen = () => page.evaluate(() => window.__editor.schleifen());

await page.goto(`${url}/?look=earle&palette=blob`);
await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
await page.evaluate(() => {
  window.__stores.ui.getState().libraryUmschalten(false);
  window.__stores.ui.getState().setzeEbene('form');
  window.__stores.ui.getState().maximieren(null);
});
await ruhig();
// Florians Ablauf: die Startkugel ist eingefroren, dann kommen die Umrisse des Körpers
await page.evaluate(
  async ({ modul, koerper }) => {
    const m = await import(modul);
    const dok = m.extremKoerper(koerper).dok();
    const st = window.__stores.editor.getState();
    st.setzeDokument({ ...st.dok, profile: dok.profile });
  },
  { modul, koerper },
);
await ruhig();
const box = await page.locator('.vp-ober[data-view="creation"]').boundingBox();
// eine Stelle auf dem Körper zwischen zwei Ringen (nicht in der Kappe)
let ziel = null;
for (const fy of [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65])
  for (const fx of [0.5, 0.45, 0.55, 0.4, 0.6]) {
    if (ziel) break;
    const px = box.width * fx;
    const py = box.height * fy;
    const t = await page.evaluate(([x, y]) => window.__editor.treffen(x, y), [px, py]);
    if (t && t.flaeche >= 0 && t.kaefigPunkt >= 0 && t.kaefigPunkt < 24 * 16) ziel = { x: box.x + px, y: box.y + py };
  }
pruefe(!!ziel, `Stelle auf dem Körper gefunden (${ziel ? `${ziel.x.toFixed(0)}, ${ziel.y.toFixed(0)}` : '–'})`);
const d0 = await deltas();
const s0 = await dokStand();
const w0 = await wesen();
console.log(`  Ausgang: R ${w0.vorlage?.R}, Seite ${s0.seite} Knoten, Top ${s0.top}, Δ ${zeige(d0)}`);

// 1) drei Loops: ⌘R, zwei Radschritte, Klick
await page.mouse.move(ziel.x, ziel.y);
await page.waitForTimeout(300);
await page.keyboard.press('Meta+r');
await page.waitForTimeout(300);
let sl = await schleifen();
pruefe(!!sl.lauf && sl.lauf.k >= 1 && sl.vorschau > 0, `⌘R über der Bühne: Vorschau (${sl.vorschau} Segmente, Ringpaar ${sl.lauf?.k})`);
const dock = await page.locator('[data-schleifen-text]').getAttribute('data-schleifen-text').catch(() => null);
pruefe(!!dock && dock.includes('Loop'), `Dock zeigt „${dock}“`);
await page.screenshot({ path: resolve(out, `schleife-${koerper}-vorschau.jpg`), quality: 82 });
await page.mouse.wheel(0, -120);
await page.waitForTimeout(150);
await page.mouse.wheel(0, -120);
await page.waitForTimeout(200);
sl = await schleifen();
pruefe(sl.lauf?.n === 3 && sl.vorschau > 0, `zwei Radschritte: ${sl.lauf?.n} Loops in der Vorschau (${sl.vorschau} Segmente)`);
await page.screenshot({ path: resolve(out, `schleife-${koerper}-vorschau-3.jpg`), quality: 82 });
await page.mouse.click(ziel.x, ziel.y);
await ruhig();
let s1 = await dokStand();
let w1 = await wesen();
const d1 = await deltas();
pruefe(s1.schleifen.length === 3 && s1.seite === s0.seite + 6 && s1.top + s1.front === s0.top + s0.front + 3 && s1.markiert === 6 && s1.breite === 3, `Klick: 3 Loops (Seite ${s0.seite} → ${s1.seite}, Top ${s0.top} → ${s1.top}, Front ${s0.front} → ${s1.front})`);
pruefe(w1.vorlage?.R === (w0.vorlage?.R ?? 0) + 3 && w1.ringe?.schleifen?.length === 3, `Käfig R ${w0.vorlage?.R} → ${w1.vorlage?.R}, Loop-Ringe ${JSON.stringify(w1.ringe?.schleifen?.map((s) => s.ring))}`);
pruefe(s1.verlauf === s0.verlauf + 1, `ein Undo-Schritt (Verlauf ${s0.verlauf} → ${s1.verlauf})`);
const mehr = Math.max(...['seite', 'front', 'top'].map((a) => (d1[a] ?? 0) - (d0[a] ?? 0)));
pruefe(mehr <= 1, `Umrisse bleiben (Δ ${zeige(d0)} → ${zeige(d1)}, höchstens +${mehr.toFixed(2)} px)`);
pruefe(!(await schleifen()).lauf && (await schleifen()).vorschau === 0, 'nach dem Setzen: keine Operation, keine Vorschau');
await page.screenshot({ path: resolve(out, `schleife-${koerper}-drei.jpg`), quality: 82 });
// Bühne mit Zebra (Prüfansicht)
await page.evaluate(() => {
  window.__stores.kernAnzeige.getState().setzeLook('matcap');
  window.__stores.ui.getState().setzeZebra(true);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: resolve(out, `schleife-${koerper}-drei-zebra.jpg`), quality: 82 });
await page.evaluate(() => {
  window.__stores.kernAnzeige.getState().setzeLook('earle');
  window.__stores.ui.getState().setzeZebra(false);
});
await page.keyboard.press('Meta+z');
await ruhig();
let s2 = await dokStand();
let w2 = await wesen();
pruefe(s2.schleifen.length === 0 && s2.seite === s0.seite && s2.top === s0.top && s2.front === s0.front && w2.vorlage?.R === w0.vorlage?.R, `⌘Z: alles zurück (Seite ${s2.seite}, Top ${s2.top}, Front ${s2.front}, R ${w2.vorlage?.R})`);

// 2) ein Loop: Klick, gleiten, Klick
await page.mouse.move(ziel.x, ziel.y);
await page.waitForTimeout(200);
await page.keyboard.press('Meta+r');
await page.waitForTimeout(200);
await page.mouse.click(ziel.x, ziel.y);
await page.waitForTimeout(150);
sl = await schleifen();
const sVor = sl.lauf?.s;
pruefe(!!sl.lauf?.gleiten, `erster Klick: Loop gleitet (Anteil ${sVor?.toFixed(2)})`);
for (let i = 1; i <= 6; i++) await page.mouse.move(ziel.x + 1.5 * i, ziel.y + 0.5 * i, { steps: 2 });
await page.waitForTimeout(150);
sl = await schleifen();
pruefe(sl.lauf?.gleiten && sl.lauf.s !== sVor, `Maus bewegt: Anteil ${sVor?.toFixed(2)} → ${sl.lauf?.s?.toFixed(2)}`);
await page.screenshot({ path: resolve(out, `schleife-${koerper}-gleiten.jpg`), quality: 82 });
await page.mouse.click(ziel.x + 9, ziel.y + 3);
await ruhig();
s1 = await dokStand();
pruefe(s1.schleifen.length === 1 && s1.verlauf === s2.verlauf + 1, `zweiter Klick: ein Loop gesetzt, ein Undo-Schritt`);
await page.keyboard.press('Meta+z');
await ruhig();

// 3) Esc beim Gleiten: in die Mitte
await page.mouse.move(ziel.x, ziel.y);
await page.waitForTimeout(200);
await page.keyboard.press('Meta+r');
await page.mouse.click(ziel.x, ziel.y);
await page.waitForTimeout(150);
await page.keyboard.press('Escape');
await ruhig();
s1 = await dokStand();
pruefe(s1.schleifen.length === 1, `Esc beim Gleiten: Loop in der Mitte gesetzt (${s1.schleifen.length})`);
await page.keyboard.press('Meta+z');
await ruhig();

// 4) Rechtsklick vor dem ersten Klick: nichts
const v4 = (await dokStand()).verlauf;
await page.mouse.move(ziel.x, ziel.y);
await page.waitForTimeout(200);
await page.keyboard.press('Meta+r');
await page.waitForTimeout(150);
await page.mouse.click(ziel.x, ziel.y, { button: 'right' });
await page.waitForTimeout(400);
s1 = await dokStand();
sl = await schleifen();
pruefe(!sl.lauf && s1.schleifen.length === 0 && s1.verlauf === v4, 'Rechtsklick vor dem ersten Klick: abgebrochen, nichts geändert');

// 5) ⌃R startet ebenso
await page.keyboard.press('Control+r');
await page.waitForTimeout(200);
sl = await schleifen();
pruefe(!!sl.lauf, '⌃R startet ⌘R ebenso');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
pruefe(!(await schleifen()).lauf, 'Esc vor dem ersten Klick bricht ab');

// 6) über dem Seitenblatt: Sprosse im Blatt, Klick, Klick
const seite = await page.locator('.vp-ober[data-view="seite"]').boundingBox();
let zs = null;
for (const fx of [0.5, 0.45, 0.55, 0.4, 0.6]) {
  if (zs) break;
  await page.mouse.move(seite.x + seite.width * fx, seite.y + seite.height * 0.5);
  await page.waitForTimeout(150);
  await page.keyboard.press('Meta+r');
  await page.waitForTimeout(200);
  sl = await schleifen();
  if (sl.lauf?.k >= 1) zs = { x: seite.x + seite.width * fx, y: seite.y + seite.height * 0.5 };
  else await page.keyboard.press('Escape');
}
const imBlatt = await page.locator('.vp-ober[data-view="seite"] [data-schleifen-vorschau]').count();
pruefe(!!zs && imBlatt === 1, `⌘R über dem Seitenblatt: Ringpaar ${sl.lauf?.k}, Sprosse im Blatt (${imBlatt})`);
await page.screenshot({ path: resolve(out, `schleife-${koerper}-seite.jpg`), quality: 82 });
if (zs) {
  await page.mouse.click(zs.x, zs.y);
  await page.waitForTimeout(150);
  await page.mouse.click(zs.x, zs.y);
  await ruhig();
  s1 = await dokStand();
  pruefe(s1.schleifen.length === 1, `Seitenblatt: Loop gesetzt (${s1.schleifen.length})`);
  await page.keyboard.press('Meta+z');
  await ruhig();
}
// 7) Maul an: Loops werden gewöhnliche Knoten (die Knoten bleiben, die Liste ist leer), ein Undo-Schritt; Maul wieder aus
await page.mouse.move(ziel.x, ziel.y);
await page.waitForTimeout(200);
await page.keyboard.press('Meta+r');
await page.mouse.wheel(0, -120);
await page.waitForTimeout(120);
await page.mouse.click(ziel.x, ziel.y);
await ruhig();
const vorMaul = await dokStand();
await page.evaluate(() => window.__stores.kernAnzeige.getState().setzeMaul('vorn'));
await ruhig();
const mitMaul = await dokStand();
const hinweis = await page.evaluate(() => window.__stores.ui.getState().hinweis?.text ?? '');
pruefe(vorMaul.schleifen.length === 2 && mitMaul.schleifen.length === 0 && mitMaul.seite === vorMaul.seite && mitMaul.markiert === 0 && mitMaul.verlauf === vorMaul.verlauf + 1, `Maul an: Loops aufgelöst (Liste ${vorMaul.schleifen.length} → ${mitMaul.schleifen.length}, Seite ${vorMaul.seite} → ${mitMaul.seite} Knoten, ein Schritt)`);
pruefe(/keine Loops/.test(hinweis), `Hinweis „${hinweis}“`);
await page.evaluate(() => window.__stores.kernAnzeige.getState().setzeMaul('aus'));
await ruhig();
pruefe(seitenfehler.length === 0, `keine Seitenfehler (${seitenfehler.length})`);
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles ok');
process.exit(fehler ? 1 : 0);
