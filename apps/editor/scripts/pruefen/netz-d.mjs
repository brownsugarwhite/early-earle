// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1, Tore Sichtbarkeit und versteckte Schreibvorgänge (eigener Vite über
// run-check.sh, nie 5180):
// 1. Sichtbarkeit des Liniennetzes (Worker) gegen den Strahltest der Bühne: je Blatt (Seite, Front, Top, Back, Bottom) für
//    Proben der Netz-Züge der erste Treffer des Blattstrahls; sichtbar = kein Treffer liegt mehr als 1,5 px davor. Tor
//    ≥ 99,5 % übereinstimmend, außer an Sichtwechseln (Nachbarprobe anders) und an Konturen der eigenen Blickachse (der
//    Strahl streift dort die Haut).
// 2. Eine Formgeste mit Kantenlinie: schreibt nur die Profile, genau einen Undo-Schritt, `dok.kanten` bleibt gleich.
// Umgebung: FAELLE (Komma-Liste; „kugel“ = Startkugel), AUSGABE.
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'kugel,einfach,giraffe-bauch,ente-haken').split(',');
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/grundkoerper.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`${ok ? '  ok  ' : '  FEHL'} ${text}`);
  if (!ok) fehler++;
};

for (const fall of faelle) {
  await page.goto(`${url}/?look=earle&palette=blob`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  if (fall !== 'kugel') {
    await page.evaluate(async ({ fall, modul }) => {
      const g = await import(modul);
      const dok = g.S0_KOERPER.includes(fall) ? g.s0KoerperDokument(fall) : g.gKoerperDokument(fall);
      window.__stores.editor.getState().laden(dok, null);
    }, { fall, modul });
  }
  // Kantenlinie in der Seite über die Flanke (Härte 60 %), damit auch Linien und Falten geprüft werden
  await page.evaluate(() => {
    const st = window.__stores.editor.getState();
    const s = st.dok.profile.seite.knoten.map((k) => k.p);
    const xs = s.map((p) => p.x);
    const ys = s.map((p) => p.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const a = [x0 + 0.35 * (x1 - x0), y0 + 0.6 * (y1 - y0), 0.3];
    const b = [x0 + 0.65 * (x1 - x0), y0 + 0.4 * (y1 - y0), 0.3];
    st.setzeKanten([{ knoten: [{ p: a, ein: [0, 0, 0], aus: [0, 0, 0], art: 'glatt' }, { p: b, ein: [0, 0, 0], aus: [0, 0, 0], art: 'glatt' }], haerte: [0.6, 0.6], blick: 'seite' }]);
  });
  await page.waitForFunction(() => document.querySelectorAll('[data-netz-zug^="l:"]').length > 0, null, { timeout: 60_000 });
  await page.waitForTimeout(1000);
  console.log(fall);
  // 1. Sichtbarkeit gegen den Strahltest
  for (const blicke of [{ front: 'front', top: 'top' }, { front: 'hinten', top: 'unten' }]) {
    const erg = await page.evaluate(async (blicke) => {
      window.__stores.ui.setState({ blick: blicke });
      await new Promise((r) => setTimeout(r, 500));
      const ns = window.__editor.netzSicht();
      const sk = window.__stores.editor.getState().dok.skalierung;
      const BIT = { seite: 1, front: 2, hinten: 4, top: 8, unten: 16 };
      const EIGEN = { seite: 'kontur-seite', front: 'kontur-front', top: 'kontur-top' };
      const je = {};
      for (const feld of ['seite', 'front', 'top']) {
        const blick = feld === 'seite' ? 'seite' : blicke[feld];
        const bit = BIT[blick];
        const svg = document.querySelector(`.vp-ober[data-view="${feld}"] svg.view2d`).getBoundingClientRect();
        const kandidaten = [];
        for (const z of ns.zuege) {
          if (z.art === 'maul' || z.art === EIGEN[feld]) continue;
          const n = z.sicht.length;
          for (let i = 0; i < n; i++) {
            const s = z.sicht[i] & bit;
            if ((i > 0 && (z.sicht[i - 1] & bit) !== s) || (i + 1 < n && (z.sicht[i + 1] & bit) !== s)) continue;
            kandidaten.push([z.punkte[3 * i] * sk, z.punkte[3 * i + 1] * sk, z.punkte[3 * i + 2] * sk, s ? 1 : 0, z.art]);
          }
        }
        // höchstens 300 Proben je Blatt, gleichmäßig verteilt (Strahltest ohne Beschleunigung ist teuer)
        const schritt = Math.max(1, Math.floor(kandidaten.length / 300));
        let gleich = 0;
        let anders = 0;
        let rand = 0;
        let falte = 0;
        const falsch = {};
        for (let k = 0; k < kandidaten.length; k += schritt) {
          const [x, y, zz, s, art] = kandidaten[k];
          const q = window.__editor.projizieren(feld, [x, y, zz]);
          if (!q || q[0] < 2 || q[1] < 2 || q[0] > svg.width - 2 || q[1] > svg.height - 2) continue;
          // beidseitig: auch die Rückseite einer umgeklappten Fläche verdeckt (wie im Worker); gezählt wird es gesondert
          const h = window.__editor.strahlFeld(feld, q[0], q[1], true);
          const h1 = window.__editor.strahlFeld(feld, q[0], q[1], false);
          if (h && h1 && Math.hypot(h.punkt[0] - h1.punkt[0], h.punkt[1] - h1.punkt[1], h.punkt[2] - h1.punkt[2]) * 461 / sk > 1.5) falte++;
          // kein Treffer am eigenen Bildpunkt: die Probe liegt genau auf dem Umriss des Blatts (Sichtwechsel) — nicht werten
          if (!h) {
            rand++;
            continue;
          }
          const d = h.richtung;
          const vorn = (x * d[0] + y * d[1] + zz * d[2] - (h.punkt[0] * d[0] + h.punkt[1] * d[1] + h.punkt[2] * d[2])) / sk * 461;
          const sichtbar = vorn <= 1.5;
          if (sichtbar === (s === 1)) gleich++;
          else {
            anders++;
            const key = `${art}:${s ? 'W-sicht' : 'W-verdeckt'}`;
            (falsch[key] ??= []).push(+vorn.toFixed(1));
          }
        }
        je[blick] = { gleich, anders, falsch, rand, falte };
      }
      return je;
    }, blicke);
    for (const [blick, e] of Object.entries(erg)) {
      const anteil = e.gleich / Math.max(1, e.gleich + e.anders);
      pruefe(anteil >= 0.995, `Sichtbarkeit ${blick}: ${(anteil * 100).toFixed(1)} % von ${e.gleich + e.anders} Proben (${e.rand} genau auf dem Umriss nicht gewertet${e.falte ? `, ${e.falte} hinter umgeklappter Fläche` : ''})${e.anders ? ` (abweichend: ${JSON.stringify(e.falsch)})` : ''}`);
    }
  }
  await page.evaluate(() => window.__stores.ui.setState({ blick: { front: 'front', top: 'top' } }));
  // 2. Formgeste: nur Profile, ein Undo-Schritt, Kantenlinien unverändert
  const vorher = await page.evaluate(() => {
    const st = window.__stores.editor.getState();
    return { kanten: JSON.stringify(st.dok.kanten), schritte: st.verlauf.length, rest: JSON.stringify({ ...st.dok, profile: null, spanten: null, kaefig: null }) };
  });
  const box = await page.locator('.vp-ober[data-view="seite"] [data-knoten="1"] .knoten-punkt').boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let k = 1; k <= 8; k++) await page.mouse.move(x + 3 * k, y - 2 * k);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    const nach = await page.evaluate(() => {
      const st = window.__stores.editor.getState();
      return { kanten: JSON.stringify(st.dok.kanten), schritte: st.verlauf.length, rest: JSON.stringify({ ...st.dok, profile: null, spanten: null, kaefig: null }) };
    });
    pruefe(nach.kanten === vorher.kanten, 'Formgeste: dok.kanten unverändert');
    pruefe(nach.schritte === vorher.schritte + 1, `Formgeste: ein Undo-Schritt (${vorher.schritte} → ${nach.schritte})`);
    pruefe(nach.rest === vorher.rest, 'Formgeste: sonst nur Profile (Spanten und eingefrorene Stationen ausgenommen)');
  } else pruefe(false, 'Seitenknoten 1 nicht gefunden');
}
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
