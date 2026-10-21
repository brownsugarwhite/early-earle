// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V6.4: Loops in den Blättern sehen, wählen und formen, im echten
// Editor (eigener Vite über run-check.sh, nie 5180). Florians Ablauf: Startkugel → Prüfkörper (Standard Langhals), drei Loops
// mit ⌘R auf der Bühne; dann mit echten Klicks und Tasten in den Blättern:
// - jedes Blatt zeigt die drei Loops (Seite: von Rücken- zu Bauchknoten, die Enden auf den Knoten), verdeckte Stücke blass;
// - Zeiger auf der Linie im Seitenblatt: der Loop leuchtet in allen Blättern und auf der Bühne;
// - Klick wählt ihn (Knoten in Seite und Top bzw. Front gewählt);
// - S im Blatt mit dem Breitenknoten, Zahl 1,25, Enter: Sprosse und Breite genau × 1,25, ein Undo-Schritt;
// - G im anderen Blatt, Zahl 10, Enter: genau 10 px längs der dort freien Achse (Top x, Front y), sonst nichts;
// - S, Zeiger, Esc: Dokument wie vorher; R im Top bzw. in der Front: Hinweis, keine Operation;
// - Ziehen an der Linie im Seitenblatt: die Knoten wandern genau mit dem Zeiger, ein Undo-Schritt, Loslassen bestätigt;
// - G G im Seitenblatt: der Loop gleitet, Knotenzahl bleibt;
// - ⇧-Klick auf einen zweiten Loop: beide gewählt, S formt dann die Punkte (V3), nicht den Loop;
// - Klick ohne Bewegung auf der Bühne: auf einem Ring wählt er den Loop, daneben hebt er die Wahl auf.
// Bilder in AUSGABE. Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/schleife-blatt.mjs
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
const auswahl = () => page.evaluate(() => window.__stores.ui.getState().auswahl);
/** Sprosse des Loops (Rücken, Bauch in der Seite) und sein Breitenknoten (Top: Breite = y; Front: Breite = x, als { x: Höhe, y: Breite }) */
const loopKnoten = (d, id) => {
  const s = d.profile.seite.knoten.filter((k) => k.schleife === id).map((k) => k.p);
  const t = d.profile.top.knoten.filter((k) => k.schleife === id).map((k) => k.p);
  const f = d.profile.front.knoten.filter((k) => k.schleife === id).map((k) => ({ x: k.p.y, y: k.p.x }));
  return { a: s[0], b: s[1], t: t[0] ?? f[0], blatt: t.length ? 'top' : 'front' };
};
const laenge = (k) => Math.hypot(k.a.x - k.b.x, k.a.y - k.b.y);
const mitte = (k) => ({ x: (k.a.x + k.b.x) / 2, y: (k.a.y + k.b.y) / 2 });
/** Linien der Loops in einem Blatt: Anzahl, Stücke sichtbar/verdeckt, Zustände */
const blattLinien = (blatt) =>
  page.evaluate((b) => {
    const v = document.querySelector(`.vp-ober[data-view="${b}"]`);
    if (!v) return null;
    return [...v.querySelectorAll('[data-schleife]')].map((g) => ({
      id: g.getAttribute('data-schleife'),
      zustand: g.getAttribute('data-zustand'),
      sichtbar: g.querySelectorAll('[data-sicht="1"]').length,
      verdeckt: g.querySelectorAll('[data-sicht="0"]').length,
    }));
  }, blatt);
/**
 * Bildschirmpunkt genau auf der Linie eines Loops, an dem eine Loop-Trefferlinie oben liegt (Knoten und Ringe gehen vor; bei
 * dichten Loops entscheidet der Editor nach dem Abstand, der Punkt liegt genau auf dieser Linie).
 */
const linienPunkt = (blatt, id) =>
  page.evaluate(
    ([b, id]) => {
      const el = document.querySelector(`.vp-ober[data-view="${b}"] [data-schleife-linie="${id}"]`);
      if (!el) return null;
      const L = el.getTotalLength();
      const m = el.getScreenCTM();
      for (const t of [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7, 0.25, 0.75]) {
        const p = el.getPointAtLength(L * t);
        const x = m.a * p.x + m.c * p.y + m.e;
        const y = m.b * p.x + m.d * p.y + m.f;
        if (document.elementFromPoint(x, y)?.closest('[data-schleife-linie]')) return { x, y };
      }
      return null;
    },
    [blatt, id],
  );
/** Enden der Loop-Linie in der Seite und die Lage der Loop-Knoten (Bildschirm) */
const seitenEnden = (id, knoten) =>
  page.evaluate(
    ([id, knoten]) => {
      const v = document.querySelector('.vp-ober[data-view="seite"]');
      const el = v.querySelector(`[data-schleife-linie="${id}"]`);
      const m = el.getScreenCTM();
      const L = el.getTotalLength();
      const bild = (p) => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
      const enden = [bild(el.getPointAtLength(0)), bild(el.getPointAtLength(L))];
      const kn = knoten.map((i) => {
        const c = v.querySelector(`[data-knoten="${i}"] .knoten-punkt`);
        const r = c.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      return { enden, kn };
    },
    [id, knoten],
  );
const knotenBild = (blatt, i) =>
  page.evaluate(
    ([b, i]) => {
      const c = document.querySelector(`.vp-ober[data-view="${b}"] [data-knoten="${i}"] .knoten-punkt`);
      const r = c.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    },
    [blatt, i],
  );
const blattBox = (b) => page.locator(`.vp-ober[data-view="${b}"]`).boundingBox();

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
const box = await blattBox('creation');
let ziel = null;
for (const fy of [0.5, 0.45, 0.55, 0.4, 0.6])
  for (const fx of [0.5, 0.45, 0.55, 0.4, 0.6]) {
    if (ziel) break;
    const t = await page.evaluate(([x, y]) => window.__editor.treffen(x, y), [box.width * fx, box.height * fy]);
    if (t && t.flaeche >= 0 && t.kaefigPunkt >= 0 && t.kaefigPunkt < 24 * 16) ziel = { x: box.x + box.width * fx, y: box.y + box.height * fy };
  }
await page.mouse.move(ziel.x, ziel.y);
await page.waitForTimeout(250);
await page.keyboard.press('Meta+r');
await page.mouse.wheel(0, -120);
await page.waitForTimeout(120);
await page.mouse.wheel(0, -120);
await page.waitForTimeout(150);
await page.mouse.click(ziel.x, ziel.y);
await ruhig();
const px = await page.evaluate(() => window.__editor.schleifenPixel());
pruefe(px.length === 3, `drei Loops gesetzt (${px.length})`);
// 1. jedes Blatt zeigt die Loops
for (const b of ['seite', 'top', 'front']) {
  const l = await blattLinien(b);
  pruefe(l?.length === 3 && l.every((x) => x.sichtbar + x.verdeckt > 0), `${b}: ${l?.length} Loops (Stücke sichtbar/verdeckt: ${l?.map((x) => `${x.sichtbar}/${x.verdeckt}`).join(', ')})`);
}
await page.mouse.move(box.x + 5, box.y + 5);
await page.waitForTimeout(150);
await page.screenshot({ path: resolve(out, `schleife-blatt-${koerper}-loops.jpg`), quality: 82 });
const id = px[1].id;
const d0 = await dok();
const k0 = loopKnoten(d0, id);
const seiteIdx = d0.profile.seite.knoten.flatMap((k, i) => (k.schleife === id ? [i] : []));
// Enden der Seitenlinie auf den Knoten
const en = await seitenEnden(id, seiteIdx);
const abst = en.kn.map((k) => Math.min(...en.enden.map((e) => Math.hypot(e.x - k.x, e.y - k.y))));
pruefe(abst.every((a) => a <= 2), `Seite: die Loop-Linie endet auf seinen Knoten (${abst.map((a) => a.toFixed(2)).join(' / ')} px)`);
// 2. Zeiger auf der Linie: leuchtet überall
const lp = await linienPunkt('seite', id);
pruefe(!!lp, `Trefferpunkt auf der Seitenlinie gefunden (${lp ? `${lp.x.toFixed(0)}, ${lp.y.toFixed(0)}` : '–'})`);
await page.mouse.move(lp.x, lp.y);
await page.waitForTimeout(200);
let sl = await schleifen();
const zustaende = await Promise.all(['seite', 'top', 'front'].map(async (b) => (await blattLinien(b)).find((x) => x.id === id)?.zustand));
pruefe(sl.hover === id && zustaende.every((z) => z === 'hover'), `Zeiger auf der Linie: hover ${sl.hover === id ? 'ja' : sl.hover} in allen Blättern (${zustaende.join(', ')}) und auf der Bühne`);
// 3. Klick wählt
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(200);
sl = await schleifen();
let aw = await auswahl();
pruefe(sl.gewaehlt === id && aw.seite.length === 2 && aw.top.length + aw.front.length === 1, `Klick im Seitenblatt wählt den Loop (Seite ${JSON.stringify(aw.seite)}, Top ${JSON.stringify(aw.top)}, Front ${JSON.stringify(aw.front)})`);
pruefe((await verlauf()) === (await verlauf()) && JSON.stringify((await dok()).profile) === JSON.stringify(d0.profile), 'der Klick ändert nichts am Dokument');
await page.mouse.move(box.x + 5, box.y + 5);
await page.waitForTimeout(150);
const z2 = (await blattLinien('top')).find((x) => x.id === id)?.zustand;
pruefe(z2 === 'gewaehlt', `gewählt leuchtet im Top türkis (${z2})`);
await page.screenshot({ path: resolve(out, `schleife-blatt-${koerper}-gewaehlt.jpg`), quality: 82 });
// 4. S im Blatt mit dem Breitenknoten: Zahl 1,25
const breitBlatt = k0.blatt;
const anderesBlatt = breitBlatt === 'top' ? 'front' : 'top';
const bb = await blattBox(breitBlatt);
let v0 = await verlauf();
await page.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.35);
await page.waitForTimeout(100);
await page.keyboard.press('s');
await page.waitForTimeout(100);
const grsS = (await schleifen()).grs;
const kreuz = await page.locator(`.vp-ober[data-view="${breitBlatt}"] [data-schleifen-modal]`).count();
pruefe(grsS?.art === 's' && kreuz === 1, `S im ${breitBlatt}: Operation auf dem Loop (${JSON.stringify(grsS)}), Kreuz im Blatt (${kreuz})`);
await page.keyboard.type('1.25');
await page.keyboard.press('Enter');
await ruhig();
let k1 = loopKnoten(await dok(), id);
pruefe(Math.abs(laenge(k1) / laenge(k0) - 1.25) < 1e-9 && Math.abs(k1.t.y / k0.t.y - 1.25) < 1e-9 && Math.hypot(mitte(k1).x - mitte(k0).x, mitte(k1).y - mitte(k0).y) < 1e-12, `S 1,25 im ${breitBlatt}: Sprosse × ${(laenge(k1) / laenge(k0)).toFixed(6)}, Breite × ${(k1.t.y / k0.t.y).toFixed(6)}, Mitte bleibt`);
pruefe((await verlauf()) === v0 + 1, 'ein Undo-Schritt');
await page.keyboard.press('Meta+z');
await ruhig();
// 5. G im anderen Blatt: Zahl 10 (Top: längs x, Front: längs y)
const ab = await blattBox(anderesBlatt);
await page.mouse.move(ab.x + ab.width * 0.5, ab.y + ab.height * 0.35);
await page.waitForTimeout(100);
await page.keyboard.press('g');
await page.keyboard.type('10');
await page.keyboard.press('Enter');
await ruhig();
k1 = loopKnoten(await dok(), id);
const sk = (await dok()).skalierung;
const dxPx = (mitte(k1).x - mitte(k0).x) * PX * sk;
const dyPx = (mitte(k1).y - mitte(k0).y) * PX * sk;
const erwartet = anderesBlatt === 'top' ? [10, 0] : [0, 10];
pruefe(Math.abs(dxPx - erwartet[0]) < 1e-6 && Math.abs(dyPx - erwartet[1]) < 1e-6 && Math.abs(laenge(k1) - laenge(k0)) < 1e-12, `G 10 im ${anderesBlatt}: Sprosse ${dxPx.toFixed(6)} | ${dyPx.toFixed(6)} px (erwartet ${erwartet.join(' | ')}), Länge bleibt`);
await page.keyboard.press('Meta+z');
await ruhig();
// 6. S, Zeiger, Esc
const vorEsc = JSON.stringify((await dok()).profile);
await page.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.35);
await page.keyboard.press('s');
for (let i = 1; i <= 5; i++) await page.mouse.move(bb.x + bb.width * 0.5 + 6 * i, bb.y + bb.height * 0.35 - 3 * i, { steps: 2 });
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await ruhig();
pruefe(JSON.stringify((await dok()).profile) === vorEsc && !(await schleifen()).grs && (await page.locator('[data-schleifen-modal]').count()) === 0, 'S, Zeiger, Esc: Dokument wie vorher, kein Kreuz mehr');
// 7. R im Top / in der Front: Hinweis, keine Operation
await page.mouse.move(ab.x + ab.width * 0.5, ab.y + ab.height * 0.35);
await page.keyboard.press('r');
await page.waitForTimeout(200);
const hinweis = await page.locator('.hinweis').last().textContent().catch(() => '');
pruefe(!(await schleifen()).grs && JSON.stringify((await dok()).profile) === vorEsc && /R kippt einen Loop/.test(hinweis ?? ''), `R im ${anderesBlatt}: keine Operation, Hinweis „${(hinweis ?? '').slice(0, 60)}…“`);
// 8. Ziehen an der Linie im Seitenblatt
const lp2 = await linienPunkt('seite', id);
const vor = await Promise.all(seiteIdx.map((i) => knotenBild('seite', i)));
v0 = await verlauf();
await page.mouse.move(lp2.x, lp2.y);
await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(lp2.x + 2 * i, lp2.y - 1.5 * i, { steps: 1 });
await page.waitForTimeout(150);
const grsZ = (await schleifen()).grs;
pruefe(grsZ?.art === 'g', `Ziehen an der Linie: G läuft (${JSON.stringify(grsZ)})`);
await page.mouse.up();
await ruhig();
const nach = await Promise.all(seiteIdx.map((i) => knotenBild('seite', i)));
const wege = nach.map((p, i) => ({ x: p.x - vor[i].x, y: p.y - vor[i].y }));
pruefe(wege.every((w) => Math.abs(w.x - 20) < 0.6 && Math.abs(w.y + 15) < 0.6) && (await verlauf()) === v0 + 1 && !(await schleifen()).grs, `Loslassen: beide Knoten genau mit dem Zeiger (${wege.map((w) => `${w.x.toFixed(2)}, ${w.y.toFixed(2)}`).join(' / ')} px), ein Undo-Schritt`);
pruefe((await schleifen()).gewaehlt === id, 'der Loop bleibt gewählt');
await page.screenshot({ path: resolve(out, `schleife-blatt-${koerper}-gezogen.jpg`), quality: 82 });
await page.keyboard.press('Meta+z');
await ruhig();
// 9. G G im Seitenblatt
const sb = await blattBox('seite');
const nSeite = (await dok()).profile.seite.knoten.length;
const kVor = loopKnoten(await dok(), id);
v0 = await verlauf();
await page.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height * 0.5);
await page.keyboard.press('g');
await page.keyboard.press('g');
for (let i = 1; i <= 6; i++) await page.mouse.move(sb.x + sb.width * 0.5 + 3 * i, sb.y + sb.height * 0.5 - 4 * i, { steps: 2 });
await page.waitForTimeout(300);
const ggText = await page.locator('[data-schleife-grs]').getAttribute('data-schleife-grs').catch(() => null);
await page.keyboard.press('Enter');
await ruhig();
const kNach = loopKnoten(await dok(), id);
pruefe(!!ggText && ggText.includes('gleitet') && Math.hypot(kNach.a.x - kVor.a.x, kNach.a.y - kVor.a.y) > 1e-4 && (await dok()).profile.seite.knoten.length === nSeite && (await verlauf()) === v0 + 1, `G G im Seitenblatt: „${ggText}“, Rückenknoten ${(Math.hypot(kNach.a.x - kVor.a.x, kNach.a.y - kVor.a.y) * PX * sk).toFixed(1)} px, Knoten ${nSeite}, ein Schritt`);
await page.keyboard.press('Meta+z');
await ruhig();
// 10. ⇧-Klick auf einen zweiten Loop: beide gewählt; S formt dann die Punkte (V3)
await page.evaluate((id) => window.__stores.ui.getState().setzeAuswahl({ seite: [], front: [], top: [] }, 'seite'), id);
const lpA = await linienPunkt('seite', id);
await page.mouse.click(lpA.x, lpA.y);
const lpB = await linienPunkt('seite', px[2].id);
await page.keyboard.down('Shift');
await page.mouse.click(lpB.x, lpB.y);
await page.keyboard.up('Shift');
await page.waitForTimeout(200);
aw = await auswahl();
pruefe(aw.seite.length === 4, `⇧-Klick: zwei Loops gewählt (Seite ${JSON.stringify(aw.seite)})`);
await page.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height * 0.5);
await page.keyboard.press('s');
await page.waitForTimeout(150);
const v3 = await page.evaluate(() => window.__stores.ui.getState().modal?.text ?? null);
pruefe(!(await schleifen()).grs && !!v3, `S mit zwei Loops formt die Punkte (V3: „${v3}“)`);
await page.keyboard.press('Escape');
await ruhig();
// 11. Bühne: Klick ohne Bewegung auf einem Ring wählt, daneben hebt er die Wahl auf
const pxNeu = await page.evaluate(() => window.__editor.schleifenPixel());
const ring = pxNeu.find((p) => p.id === id);
const cand = ring.punkte.filter(([x, y]) => x > 10 && y > 10 && x < box.width - 10 && y < box.height - 10);
const trefferBuehne = cand[Math.floor(cand.length / 4)];
await page.mouse.move(box.x + trefferBuehne[0], box.y + trefferBuehne[1]);
await page.waitForTimeout(200);
const hov = (await schleifen()).hover;
await page.mouse.click(box.x + trefferBuehne[0], box.y + trefferBuehne[1]);
await page.waitForTimeout(200);
sl = await schleifen();
pruefe(hov === id && sl.gewaehlt === id, `Bühne: Klick auf den Ring wählt den Loop (hover ${hov}, gewählt ${sl.gewaehlt})`);
await page.mouse.click(box.x + 8, box.y + box.height - 8);
await page.waitForTimeout(200);
sl = await schleifen();
aw = await auswahl();
pruefe(sl.gewaehlt === null && aw.seite.length === 0, `Bühne: Klick daneben hebt die Wahl auf (gewählt ${sl.gewaehlt}, Seite ${JSON.stringify(aw.seite)})`);
pruefe(seitenfehler.length === 0, `keine Seitenfehler (${seitenfehler.length})`);
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles ok');
process.exit(fehler ? 1 : 0);
