// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1 Schritt 5: derselbe Punkt in allen Blättern und auf der Bühne,
// Hover in allen Blättern, Ziehen eines fremden Knotens entlang der gemeinsamen Koordinate (ein Undo-Schritt).
// Eigener Vite über run-check.sh (nie 5180). Umgebung: FAELLE (Komma-Liste, „kugel“ = Startkugel), GROESSEN (z. B. 1,1.5),
// AUSGABE. Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/netz-b.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'kugel,giraffe-bauch').split(',');
const groessen = (process.env.GROESSEN ?? '1,1.5').split(',').map(Number);
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/grundkoerper.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`${ok ? '  ok  ' : '  FEHL'} ${text}`);
  if (!ok) fehler++;
};

/** Je Blatt: Ringe und eigene Knoten gegen die Projektion des 3D-Punkts durch die Kamera des Blatts (px). */
async function gleichheit(blicke) {
  return page.evaluate(async (blicke) => {
    const ui = window.__stores.ui;
    ui.setState({ blick: blicke });
    await new Promise((r) => setTimeout(r, 400));
    const ed = window.__stores.editor.getState();
    const sk = ed.dok.skalierung;
    const erg = {};
    for (const a of ['seite', 'front', 'top']) {
      const svg = document.querySelector(`.vp-ober[data-view="${a}"] svg.view2d`);
      const r = svg.getBoundingClientRect();
      let max = 0;
      let n = 0;
      const nehmen = (np, cx, cy) => {
        const p = window.__editor.netzPunkt(np);
        if (!p) return;
        const q = window.__editor.projizieren(a, [p[0] * sk, p[1] * sk, p[2] * sk]);
        if (!q) return;
        max = Math.max(max, Math.hypot(q[0] - cx, q[1] - cy));
        n++;
      };
      for (const g of svg.querySelectorAll('[data-netz-knoten]')) {
        const [quelle, rest] = g.getAttribute('data-netz-knoten').split(':');
        const c = g.querySelectorAll('circle')[1];
        nehmen({ art: 'umriss', quelle, index: Number.parseInt(rest, 10), spiegel: rest.endsWith('s') }, Number(c.getAttribute('cx')), Number(c.getAttribute('cy')));
      }
      for (const g of svg.querySelectorAll('[data-knoten]')) {
        const c = g.querySelector('.knoten-punkt');
        nehmen({ art: 'umriss', quelle: a, index: Number(g.getAttribute('data-knoten')), spiegel: false }, Number(c.getAttribute('cx')), Number(c.getAttribute('cy')));
      }
      erg[a] = { max, n, svg: [r.width, r.height] };
    }
    return erg;
  }, blicke);
}

for (const fall of faelle) {
  for (const groesse of groessen) {
    await page.goto(`${url}/?look=earle&palette=blob`);
    await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0, null, { timeout: 90_000 });
    await page.evaluate(
      async ({ fall, modul, groesse }) => {
        const st = window.__stores.editor.getState();
        if (fall === 'kugel') {
          if (groesse !== 1) st.laden({ ...st.dok, skalierung: groesse }, null);
          return;
        }
        const g = await import(modul);
        const dok = g.S0_KOERPER.includes(fall) ? g.s0KoerperDokument(fall) : g.gKoerperDokument(fall);
        st.laden(groesse !== 1 ? { ...dok, skalierung: groesse } : dok, null);
      },
      { fall, modul, groesse },
    );
    await page.waitForFunction(() => document.querySelectorAll('[data-delta]').length >= 3 && document.querySelectorAll('[data-netz-knoten]').length > 0, null, { timeout: 90_000 });
    await page.waitForTimeout(800);
    console.log(`${fall} bei ${Math.round(groesse * 100)} %`);
    // 1. derselbe Punkt: SVG-Blatt gegen die Kamera des Blatts (Front/Top und Back/Bottom)
    for (const blicke of [{ front: 'front', top: 'top' }, { front: 'hinten', top: 'unten' }]) {
      const g = await gleichheit(blicke);
      for (const a of ['seite', 'front', 'top']) pruefe(g[a].max <= 0.5, `${a} (${blicke.front}/${blicke.top}): ${g[a].n} Punkte, größte Abweichung Blatt ↔ Kamera ${g[a].max.toFixed(2)} px`);
    }
    await page.evaluate(() => window.__stores.ui.setState({ blick: { front: 'front', top: 'top' } }));
    await page.waitForTimeout(300);
    // 2. Hover über einem Seitenknoten: Marke in allen drei Blättern, am selben 3D-Punkt
    // ein Seitenknoten, der im Blatt liegt (nicht über den Rand gezoomt)
    const kn = await page.evaluate(() => {
      const svg = document.querySelector('.vp-ober[data-view="seite"] svg.view2d');
      const r = svg.getBoundingClientRect();
      for (const g of svg.querySelectorAll('[data-knoten]')) {
        const b = g.querySelector('.knoten-punkt').getBoundingClientRect();
        const x = b.x + b.width / 2;
        const y = b.y + b.height / 2;
        if (x > r.x + 20 && x < r.right - 20 && y > r.y + 20 && y < r.bottom - 20) return Number(g.getAttribute('data-knoten'));
      }
      return 0;
    });
    const knoten = page.locator(`.vp-ober[data-view="seite"] [data-knoten="${kn}"] .knoten-punkt`);
    await knoten.hover();
    await page.waitForTimeout(200);
    const hv = await page.evaluate(() => {
      const sk = window.__stores.editor.getState().dok.skalierung;
      const np = window.__stores.ui.getState().netzHover;
      const p = np ? window.__editor.netzPunkt(np) : null;
      return ['seite', 'front', 'top'].map((a) => {
        const c = document.querySelector(`.vp-ober[data-view="${a}"] [data-netz-hover]`);
        if (!c || !p) return { a, da: false };
        const q = window.__editor.projizieren(a, [p[0] * sk, p[1] * sk, p[2] * sk]);
        return { a, da: true, d: Math.hypot(q[0] - Number(c.getAttribute('cx')), q[1] - Number(c.getAttribute('cy'))), sicht: c.getAttribute('data-sicht') };
      });
    });
    for (const h of hv) pruefe(h.da && h.d <= 0.5, `Hover Seitenknoten ${kn} → Marke im Blatt ${h.a}${h.da ? ` (${h.d.toFixed(2)} px, ${h.sicht === '1' ? 'sichtbar' : 'verdeckt'})` : ' fehlt'}`);
    await page.screenshot({ path: `${out}/netz-b-${fall}-g${groesse}-hover.png` });
    await page.mouse.move(5, 5);
    // 3. Ziehen eines fremden Knotens: Ring eines Top-Knotens (nicht auf der Achse) im Seitenblatt, 40 px nach rechts
    const ring = await page.evaluate(() => {
      const st = window.__stores.editor.getState();
      const top = st.dok.profile.top.knoten;
      const svg = document.querySelector('.vp-ober[data-view="seite"] svg.view2d');
      const r = svg.getBoundingClientRect();
      // breitester Top-Knoten (weit weg von der Achse), dessen Ring im Blatt liegt
      let i = -1;
      let b = null;
      top.forEach((k, j) => {
        const g = svg.querySelector(`[data-netz-knoten="top:${j}"]`);
        if (!g) return;
        const bb = g.querySelectorAll('circle')[1].getBoundingClientRect();
        const x = bb.x + bb.width / 2;
        const y = bb.y + bb.height / 2;
        if (!(x > r.x + 20 && x < r.right - 60 && y > r.y + 20 && y < r.bottom - 40)) return;
        if (i < 0 || Math.abs(k.p.y) > Math.abs(top[i].p.y)) {
          i = j;
          b = bb;
        }
      });
      if (i < 0 || !b) return null;
      return { i, x: b.x + b.width / 2, y: b.y + b.height / 2, vorher: top[i].p, schritte: st.verlauf.length, front: JSON.stringify(st.dok.profile.front), sk: st.dok.skalierung, massstab: null };
    });
    if (!ring) {
      pruefe(false, 'Ring eines Top-Knotens im Seitenblatt nicht gefunden');
      continue;
    }
    // ⌥ nicht gedrückt: der oberste Ring an der Stelle; liegt dort ein eigener Knoten, gewinnt der (dann ⌥ nötig)
    await page.mouse.move(ring.x, ring.y);
    await page.mouse.down();
    for (let k = 1; k <= 8; k++) await page.mouse.move(ring.x + 5 * k, ring.y + 3 * k);
    await page.mouse.up();
    await page.waitForTimeout(300);
    const nach = await page.evaluate((i) => {
      const st = window.__stores.editor.getState();
      const v = window.__stores.ui.getState().ansichten.seite;
      return { p: st.dok.profile.top.knoten[i].p, schritte: st.verlauf.length, front: JSON.stringify(st.dok.profile.front), auswahl: window.__stores.ui.getState().auswahl.top, view: v };
    }, ring.i);
    const dx = nach.p.x - ring.vorher.x;
    const dy = nach.p.y - ring.vorher.y;
    pruefe(Math.abs(dx) > 1e-4 && Math.abs(dy) < 1e-9, `Top-Knoten ${ring.i} im Seitenblatt gezogen: x ${ring.vorher.x.toFixed(4)} → ${nach.p.x.toFixed(4)}, z (Top-y) unverändert (${dy.toExponential(1)})`);
    pruefe(nach.schritte === ring.schritte + 1, `ein Undo-Schritt (${ring.schritte} → ${nach.schritte})`);
    pruefe(nach.auswahl.includes(ring.i), `Knoten in seiner Zeichnung gewählt (Top: ${JSON.stringify(nach.auswahl)})`);
    await page.waitForFunction(() => document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 60_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/netz-b-${fall}-g${groesse}-gezogen.png` });
  }
}
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
