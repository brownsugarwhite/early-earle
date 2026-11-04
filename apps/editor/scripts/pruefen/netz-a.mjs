// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1: das 3D-Liniennetz im echten Editor (eigener Vite über run-check.sh,
// nie 5180). Lädt Prüfkörper (wie s0-editor.mjs), legt auf Wunsch eine Kantenlinie in der Seite an, wartet auf den genauen
// Bau und hält je Blatt fest: Netz-Züge (sichtbar/verdeckt), Ringe der fremden Knoten, Kantenknoten in allen Blättern.
// Bilder: ganzes Fenster und die drei Blätter je Fall.
// Umgebung: FAELLE (Komma-Liste; „kugel“ = Startkugel ohne Laden), AUSGABE, GROESSE (Größenregler), NETZSTIL (ton|farbe),
// LINIE=1 (Kantenlinie in der Seite über die Flanke, Härte 60 %).
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/netz-a.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'kugel,einfach,ente-haken,giraffe-bauch').split(',');
const groesse = Number(process.env.GROESSE ?? 1);
const stil = process.env.NETZSTIL ?? 'ton';
const linie = process.env.LINIE === '1';
// KAEFIG=1: Käfiglinien auf der Bühne (Falten schwarz), ZEBRA=1: Zebrastreifen
const extra = `${process.env.KAEFIG === '1' ? '&kaefig=1' : ''}${process.env.ZEBRA === '1' ? '&zebra=1' : ''}`;
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/grundkoerper.ts`;
const koerperModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/koerper.ts`;
const zufallModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/zufall.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
for (const fall of faelle) {
  await page.goto(`${url}/?look=earle&palette=blob${extra}`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0, null, { timeout: 90_000 });
  await page.evaluate((s) => window.__stores.ui.setState({ netzStil: s }), stil);
  if (fall !== 'kugel') {
    await page.evaluate(
      async ({ fall, modul, koerperModul, zufallModul, groesse }) => {
        const g = await import(modul);
        let dok;
        if (g.S0_KOERPER.includes(fall)) dok = g.s0KoerperDokument(fall);
        else if (g.G_KOERPER.includes(fall)) dok = g.gKoerperDokument(fall);
        else {
          const k = await import(koerperModul);
          const z = await import(zufallModul);
          dok = k.koerperDokument(fall, z.zufall(1));
        }
        window.__stores.editor.getState().laden(groesse !== 1 ? { ...dok, skalierung: groesse } : dok, null);
      },
      { fall, modul, koerperModul, zufallModul, groesse },
    );
  } else if (groesse !== 1) {
    await page.evaluate((g) => window.__stores.editor.getState().laden({ ...window.__stores.editor.getState().dok, skalierung: g }, null), groesse);
  }
  // genauer Bau: Δ in allen drei Blättern
  await page.waitForFunction(() => document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  if (linie) {
    // Kantenlinie in der Seite über die Flanke (Tiefe nur als Hinweis: rechte Flanke), Härte 60 %
    await page.evaluate(() => {
      const st = window.__stores.editor.getState();
      const s = st.dok.profile.seite.knoten.map((k) => k.p);
      const xs = s.map((p) => p.x);
      const ys = s.map((p) => p.y);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys);
      const a = [x0 + 0.3 * (x1 - x0), y0 + 0.7 * (y1 - y0), 0.3];
      const b = [x0 + 0.7 * (x1 - x0), y0 + 0.4 * (y1 - y0), 0.3];
      const d = [(b[0] - a[0]) / 3, (b[1] - a[1]) / 3 + 0.03, 0];
      st.setzeKanten([{ knoten: [{ p: a, ein: [0, 0, 0], aus: d, art: 'glatt' }, { p: b, ein: [-d[0], -d[1] + 0.06, 0], aus: [0, 0, 0], art: 'glatt' }], haerte: [0.6, 0.6], blick: 'seite' }]);
    });
    await page.waitForFunction(() => document.querySelectorAll('[data-netz-zug^="l:"]').length > 0, null, { timeout: 60_000 }).catch(() => {});
  }
  await page.waitForTimeout(1200);
  const werte = await page.evaluate(() => {
    const info = window.__stores.kernAnzeige.getState().info;
    const blatt = info?.blatt ?? {};
    const out = {};
    for (const a of ['seite', 'front', 'top']) {
      const el = document.querySelector(`.vp-ober[data-view="${a}"]`);
      const zuege = el ? [...el.querySelectorAll('[data-netz-zug]')] : [];
      const ringe = el ? [...el.querySelectorAll('[data-netz-knoten]')] : [];
      const kk = el ? [...el.querySelectorAll('[data-kantenknoten] .kanten-punkt, [data-kante] circle')].length : 0;
      out[a] = {
        delta: blatt[a]?.max ?? null,
        zuege: zuege.length,
        sichtbar: zuege.filter((z) => z.getAttribute('data-sicht') === '1').length,
        arten: [...new Set(zuege.map((z) => z.getAttribute('data-netz-zug').replace(/:.*/, '')))].join(' '),
        ringe: ringe.length,
        ringeVerdeckt: ringe.filter((z) => z.getAttribute('data-sicht') === '0').length,
        kantenknoten: kk,
      };
    }
    return out;
  });
  const z = (a) => `${a}: Δ ${werte[a].delta?.toFixed(1)} px, ${werte[a].zuege} Pfade (${werte[a].sichtbar} sichtbar; ${werte[a].arten}), Ringe ${werte[a].ringe} (${werte[a].ringeVerdeckt} verdeckt)`;
  console.log(`${fall}${linie ? ' + Linie' : ''} [${stil}]: ${z('seite')} · ${z('front')} · ${z('top')}`);
  if (!werte.seite.zuege) fehler++;
  const name = `netz-${fall}${linie ? '-linie' : ''}${groesse !== 1 ? `-g${groesse}` : ''}${extra ? '-kaefig' : ''}-${stil}`;
  await page.screenshot({ path: `${out}/${name}.png` });
  for (const a of ['seite', 'front', 'top']) {
    const box = await page.locator(`.vp-ober[data-view="${a}"]`).boundingBox();
    if (box) await page.screenshot({ path: `${out}/${name}-${a}.png`, clip: box });
  }
}
await browser.close();
process.exit(fehler ? 1 : 0);
