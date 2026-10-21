// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V6.3: Loops auf der Bühne wählen und mit G/S/R formen, im echten
// Editor (eigener Vite über run-check.sh, nie 5180). Florians Ablauf: Startkugel → Langhals, drei Loops mit ⌘R am Hals; dann
// mit echten Tasten und Klicks: der mittlere Loop leuchtet unter dem Zeiger, ⌥-Klick wählt ihn (seine Knoten in Seite und Top
// sind gewählt); S mit dem Zeiger, Enter; S 0,8 Enter (Sprosse und Breite genau × 0,8); G Y 10 Enter (Sprosse genau 10 px
// höher); R 15 Enter (Sprosse genau um 15° gekippt); S, Zeiger, Esc (Dokument wie vorher); O an: S 1,3 bewegt die Nachbar-Loops
// weniger als den gewählten; je Vorgang ein Undo-Schritt. Bilder in AUSGABE.
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/schleife-grs.mjs
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
const PX = 461;

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
async function ruhig() {
  let v = await page.evaluate(() => window.__editor.netzVersion());
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const w = await page.evaluate(() => window.__editor.netzVersion());
    if (w === v) return;
    v = w;
  }
}
const dok = () => page.evaluate(() => window.__stores.editor.getState().dok);
const verlauf = () => page.evaluate(() => window.__stores.editor.getState().verlauf.length);
const schleifen = () => page.evaluate(() => window.__editor.schleifen());
/** Sprosse des Loops (Rücken, Bauch in der Seite) und sein Top-Knoten */
const loopKnoten = (d, id) => {
  const s = d.profile.seite.knoten.filter((k) => k.schleife === id).map((k) => k.p);
  // Breitenknoten: im Top (Breite = y) oder in der Front (Breite = x), als { y: Breite }
  const t = d.profile.top.knoten.filter((k) => k.schleife === id).map((k) => k.p);
  const f = d.profile.front.knoten.filter((k) => k.schleife === id).map((k) => ({ x: k.p.y, y: k.p.x }));
  return { a: s[0], b: s[1], t: t[0] ?? f[0] };
};
const laenge = (k) => Math.hypot(k.a.x - k.b.x, k.a.y - k.b.y);
const mitte = (k) => ({ x: (k.a.x + k.b.x) / 2, y: (k.a.y + k.b.y) / 2 });
const winkel = (k) => Math.atan2(k.a.y - k.b.y, k.a.x - k.b.x);

await page.goto(`${url}/?look=earle&palette=blob`);
await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
await page.evaluate(() => {
  window.__stores.ui.getState().libraryUmschalten(false);
  window.__stores.ui.getState().setzeEbene('form');
  window.__stores.ui.getState().maximieren(null);
});
await ruhig();
await page.evaluate(
  async ({ modul, koerper }) => {
    const m = await import(modul);
    const d = m.extremKoerper(koerper).dok();
    const st = window.__stores.editor.getState();
    st.setzeDokument({ ...st.dok, profile: d.profile });
  },
  { modul, koerper },
);
await ruhig();
const box = await page.locator('.vp-ober[data-view="creation"]').boundingBox();
let ziel = null;
for (const fy of [0.5, 0.45, 0.55, 0.4, 0.6])
  for (const fx of [0.5, 0.45, 0.55, 0.4, 0.6]) {
    if (ziel) break;
    const t = await page.evaluate(([x, y]) => window.__editor.treffen(x, y), [box.width * fx, box.height * fy]);
    if (t && t.flaeche >= 0 && t.kaefigPunkt >= 0 && t.kaefigPunkt < 24 * 16) ziel = { x: box.x + box.width * fx, y: box.y + box.height * fy };
  }
// drei Loops mit ⌘R
await page.mouse.move(ziel.x, ziel.y);
await page.waitForTimeout(250);
await page.keyboard.press('Meta+r');
await page.mouse.wheel(0, -120);
await page.waitForTimeout(120);
await page.mouse.wheel(0, -120);
await page.waitForTimeout(150);
await page.mouse.click(ziel.x, ziel.y);
await ruhig();
let px = await page.evaluate(() => window.__editor.schleifenPixel());
pruefe(px.length === 3, `drei Loops gesetzt (${px.length}), Ringe ${px.map((p) => p.ring).join(', ')}`);
await page.screenshot({ path: resolve(out, `schleife-grs-${koerper}-loops.jpg`), quality: 82 });
// der mittlere Loop: ein Punkt seines Rings, der in der Bühne liegt
const mitteLoop = px[1];
const cand = mitteLoop.punkte.filter(([x, y]) => x > 10 && y > 10 && x < box.width - 10 && y < box.height - 10);
const p0 = cand[Math.floor(cand.length / 4)];
await page.mouse.move(box.x + p0[0], box.y + p0[1]);
await page.waitForTimeout(250);
let sl = await schleifen();
pruefe(sl.hover === mitteLoop.id, `Zeiger auf dem mittleren Loop: er leuchtet (hover ${sl.hover})`);
await page.keyboard.down('Alt');
await page.mouse.click(box.x + p0[0], box.y + p0[1]);
await page.keyboard.up('Alt');
await page.waitForTimeout(250);
sl = await schleifen();
const auswahl = await page.evaluate(() => window.__stores.ui.getState().auswahl);
pruefe(sl.gewaehlt === mitteLoop.id && auswahl.seite.length === 2 && auswahl.top.length + auswahl.front.length === 1, `⌥-Klick wählt ihn (Seite ${JSON.stringify(auswahl.seite)}, Top ${JSON.stringify(auswahl.top)}, Front ${JSON.stringify(auswahl.front)})`);
await page.screenshot({ path: resolve(out, `schleife-grs-${koerper}-gewaehlt.jpg`), quality: 82 });
const id = mitteLoop.id;
const deltasJetzt = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-view]')].map((v) => [v.getAttribute('data-view'), Number(v.querySelector('[data-delta]')?.getAttribute('data-delta') ?? NaN)]).filter(([, d]) => Number.isFinite(d))));
const zeigeD = (d) => ['seite', 'front', 'top'].map((b) => `${b} ${(d[b] ?? NaN).toFixed(1)}`).join(' · ');
const dAnfang = await deltasJetzt();
const k0 = loopKnoten(await dok(), id);
const v0 = await verlauf();
// Zeiger neben die Ringmitte für S mit der Maus
const cx = mitteLoop.punkte.reduce((s, p) => s + p[0], 0) / mitteLoop.punkte.length;
const cy = mitteLoop.punkte.reduce((s, p) => s + p[1], 0) / mitteLoop.punkte.length;
await page.mouse.move(box.x + cx + 60, box.y + cy);
await page.waitForTimeout(150);
await page.keyboard.press('s');
await page.waitForTimeout(150);
const grs = (await schleifen()).grs;
pruefe(grs?.art === 's', `S startet auf dem Loop (${JSON.stringify(grs)})`);
const dockGrs = await page.locator('[data-schleife-grs]').getAttribute('data-schleife-grs').catch(() => null);
pruefe(!!dockGrs && dockGrs.startsWith('S Loop'), `Dock: „${dockGrs}“`);
for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + cx + 60 + 3 * i, box.y + cy, { steps: 2 });
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(out, `schleife-grs-${koerper}-s-maus.jpg`), quality: 82 });
await page.keyboard.press('Enter');
await ruhig();
let k1 = loopKnoten(await dok(), id);
const f1 = laenge(k1) / laenge(k0);
pruefe(f1 > 1.2 && f1 < 1.6 && Math.abs(k1.t.y / k0.t.y - f1) < 1e-9, `S mit der Maus: Sprosse × ${f1.toFixed(3)}, Breite im Top × ${(k1.t.y / k0.t.y).toFixed(3)}`);
pruefe((await verlauf()) === v0 + 1, 'ein Undo-Schritt');
await page.keyboard.press('Meta+z');
await ruhig();
k1 = loopKnoten(await dok(), id);
pruefe(Math.abs(laenge(k1) - laenge(k0)) < 1e-12 && (await schleifen()).gewaehlt === id, `⌘Z stellt die Sprosse her (Loop bleibt gewählt: ${(await schleifen()).gewaehlt})`);
// Zahlen: S 0,8
await page.mouse.move(box.x + cx + 60, box.y + cy);
await page.keyboard.press('s');
await page.keyboard.type('0.8');
await page.keyboard.press('Enter');
await ruhig();
k1 = loopKnoten(await dok(), id);
pruefe(Math.abs(laenge(k1) / laenge(k0) - 0.8) < 1e-9 && Math.abs(k1.t.y / k0.t.y - 0.8) < 1e-9 && Math.hypot(mitte(k1).x - mitte(k0).x, mitte(k1).y - mitte(k0).y) < 1e-12, `S 0,8: Sprosse × ${(laenge(k1) / laenge(k0)).toFixed(6)}, Breite × ${(k1.t.y / k0.t.y).toFixed(6)}, Mitte bleibt`);
// der Körper folgt ohne Bruch: die Nachbarn gehen mit (Mindest-Einfluss), Δ der Blätter höchstens +3 px
const dS = await deltasJetzt();
const mehrS = Math.max(...['seite', 'front', 'top'].map((a) => (dS[a] ?? 0) - (dAnfang[a] ?? 0)));
pruefe(mehrS <= 3, `S 0,8: Umrisse folgen (Δ ${zeigeD(dAnfang)} → ${zeigeD(dS)})`);
await page.screenshot({ path: resolve(out, `schleife-grs-${koerper}-s08.jpg`), quality: 82 });
await page.keyboard.press('Meta+z');
await ruhig();
// G Y 10 px
await page.keyboard.press('g');
await page.keyboard.press('y');
await page.keyboard.type('10');
await page.keyboard.press('Enter');
await ruhig();
k1 = loopKnoten(await dok(), id);
const sk = (await dok()).skalierung;
const dy = (mitte(k1).y - mitte(k0).y) * PX * sk;
pruefe(Math.abs(dy - 10) < 1e-6 && Math.abs(mitte(k1).x - mitte(k0).x) < 1e-12 && Math.abs(laenge(k1) - laenge(k0)) < 1e-12, `G Y 10: Sprosse ${dy.toFixed(6)} px höher, x und Länge bleiben`);
await page.keyboard.press('Meta+z');
await ruhig();
// R 15°
await page.keyboard.press('r');
await page.keyboard.type('15');
await page.keyboard.press('Enter');
await ruhig();
k1 = loopKnoten(await dok(), id);
let dw = ((winkel(k1) - winkel(k0)) * 180) / Math.PI;
while (dw > 180) dw -= 360;
while (dw < -180) dw += 360;
pruefe(Math.abs(Math.abs(dw) - 15) < 1e-6 && Math.abs(laenge(k1) - laenge(k0)) < 1e-12, `R 15: Sprosse um ${dw.toFixed(6)}° gekippt, Länge bleibt`);
await page.screenshot({ path: resolve(out, `schleife-grs-${koerper}-r15.jpg`), quality: 82 });
await page.keyboard.press('Meta+z');
await ruhig();
// Esc bricht ab
const vorEsc = JSON.stringify((await dok()).profile);
await page.mouse.move(box.x + cx + 60, box.y + cy);
await page.keyboard.press('s');
for (let i = 1; i <= 5; i++) await page.mouse.move(box.x + cx + 60 + 5 * i, box.y + cy, { steps: 2 });
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await ruhig();
pruefe(JSON.stringify((await dok()).profile) === vorEsc && !(await schleifen()).grs, 'S, Zeiger, Esc: Dokument wie vorher');
// proportional: S 1,3 mit O — die Nachbar-Loops bewegen sich, aber weniger
await page.keyboard.press('Escape');
await page.mouse.move(box.x + p0[0], box.y + p0[1]);
await page.keyboard.down('Alt');
await page.mouse.click(box.x + p0[0], box.y + p0[1]);
await page.keyboard.up('Alt');
await page.waitForTimeout(200);
const d0 = await dok();
const n0 = px.filter((p) => p.id !== id).map((p) => laenge(loopKnoten(d0, p.id)));
await page.mouse.move(box.x + cx + 60, box.y + cy);
await page.keyboard.press('o');
await page.waitForTimeout(100);
await page.keyboard.press('s');
await page.keyboard.type('1.3');
await page.keyboard.press('Enter');
await ruhig();
const d1 = await dok();
const n1 = px.filter((p) => p.id !== id).map((p) => laenge(loopKnoten(d1, p.id)));
const fSel = laenge(loopKnoten(d1, id)) / laenge(loopKnoten(d0, id));
const fN = n1.map((l, i) => l / n0[i]);
pruefe(Math.abs(fSel - 1.3) < 1e-9 && fN.every((f) => f > 1.0001 && f < 1.3), `O + S 1,3: gewählter × ${fSel.toFixed(4)}, Nachbarn × ${fN.map((f) => f.toFixed(4)).join(', ')}`);
await page.screenshot({ path: resolve(out, `schleife-grs-${koerper}-proportional.jpg`), quality: 82 });
await page.evaluate(() => window.__stores.ui.getState().setzeProportional({ an: false }));
pruefe(seitenfehler.length === 0, `keine Seitenfehler (${seitenfehler.length})`);
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles ok');
process.exit(fehler ? 1 : 0);
