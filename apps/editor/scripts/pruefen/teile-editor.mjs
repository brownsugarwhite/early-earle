// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 „Teile erkennen“ im echten Editor (eigener Vite über run-check.sh, nie
// 5180): Florians Ablauf (neue Startkugel, dann die Umrisse eines Körpers des Prüfsatzes übernommen — die Stationen der Kugel
// bleiben), Stufe Körper im Riss. Geprüft: Baumliste in der Tafel, Teile in allen Blättern (Flächen, Wirbelsäulen), Zeiger
// über einer Wirbelsäule hebt das Teil in allen Blättern hervor, der eingefrorene Stand landet im Dokument (ohne Undo-Schritt
// und ohne den Körper neu zu bauen), Schalter aus/an, Back/Bottom. Bilder des Fensters je Körper.
// Umgebung: FAELLE (Komma-Liste, Standard ente,fisch,vierbeiner,fluegel-oben,giraffe-bauch,einfach), AUSGABE
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/teile-editor.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'ente,fisch,vierbeiner,fluegel-oben,giraffe-bauch,einfach').split(',');
const satzModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/teilsatz.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`${ok ? '  ok  ' : '  FEHL'} ${text}`);
  if (!ok) fehler++;
};
async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 60_000 });
  await page.waitForTimeout(1200);
}

for (const fall of faelle) {
  console.log(`${fall}:`);
  await page.goto(`${url}/?look=earle&palette=blob`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
  const v = await page.evaluate(() => window.__editor.netzVersion());
  const erwartet = await page.evaluate(
    async ({ fall, satzModul }) => {
      const m = await import(satzModul);
      const dok = m.teilSatzDokument(fall);
      const st = window.__stores.editor.getState();
      st.setzeDokument({ ...st.dok, profile: dok.profile, ...(dok.spanten ? { spanten: dok.spanten } : {}) });
      return m.TEIL_SATZ[fall];
    },
    { fall, satzModul },
  );
  await nachBau(v);
  await page.evaluate(() => {
    const ui = window.__stores.ui.getState();
    ui.libraryUmschalten(false);
    ui.setzeEbene('form');
    ui.maximieren(null);
  });
  // eingefrorener Stand im Dokument (kein Undo-Schritt, Körper unverändert)
  await page.waitForFunction(() => !!window.__stores.editor.getState().dok.kaefig?.stationen?.teile, null, { timeout: 20_000 });
  await page.waitForTimeout(1500);
  const a = await page.evaluate(() => ({ teile: window.__editor.teile(), hash: window.__editor.netzHash(), schritte: window.__stores.editor.getState().verlauf.length, gefroren: window.__stores.editor.getState().dok.kaefig.stationen.teile.teile.length }));
  const sig = a.teile.teile.slice(1).map((t) => `${t.art}:${t.richtung}`).sort().join(', ') || 'nur Rumpf';
  console.log(`  Teile: ${sig} · erkennen ${a.teile.zeit.erkennen.toFixed(1)} ms, Ansichten ${a.teile.zeit.ansichten.toFixed(1)} ms · erwartet ${erwartet.pflicht.map((x) => `${x.art} ${x.name}`).join(', ') || 'nur Rumpf'}`);
  pruefe(a.teile.teile.length - 1 >= erwartet.pflicht.length && a.teile.teile.length - 1 <= erwartet.pflicht.length + (erwartet.erlaubt?.length ?? 0), `Anzahl der Teile passt zur Einordnung von Hand (${a.teile.teile.length - 1})`);
  pruefe(a.gefroren === a.teile.teile.length - 1, `eingefroren im Dokument: ${a.gefroren} Teile`);
  // Tafel und Blätter
  const dom = await page.evaluate(() => ({
    liste: document.querySelectorAll('[data-teil-liste] li').length,
    blaetter: ['seite', 'front', 'top'].map((b) => document.querySelectorAll(`[data-view="${b}"] [data-teile]`).length),
    achsen: ['seite', 'front', 'top'].map((b) => document.querySelectorAll(`[data-view="${b}"] [data-teil-achse]`).length),
  }));
  pruefe(dom.liste === a.teile.teile.length, `Baumliste in der Tafel: ${dom.liste} Einträge`);
  pruefe(dom.blaetter.every((n) => n === 1), `Teile-Ebene in Seite/Front/Top: ${dom.blaetter.join('/')}`);
  pruefe(dom.achsen.every((n) => n >= a.teile.teile.length), `Wirbelsäulen in Seite/Front/Top: ${dom.achsen.join('/')}`);
  // Zeiger über der Wirbelsäule eines Teils (nicht Rumpf) in der Seite → Hervorhebung in allen Blättern und in der Liste
  const id = a.teile.teile[1]?.id;
  if (id) {
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-view="seite"] [data-teil-achse="${id}"]`);
      el?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      el?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }));
    }, id);
    await page.waitForTimeout(300);
    const hv = await page.evaluate((id) => ({ hover: window.__stores.ui.getState().teilHover, liste: document.querySelector(`[data-teil-liste] li[data-teil="${id}"]`)?.className ?? '', flaechen: [...document.querySelectorAll(`[data-teil-flaeche="${id}"]`)].map((e) => e.getAttribute('fill-opacity')) }), id);
    pruefe(hv.hover === id && hv.liste.includes('aktiv'), `Zeiger über der Wirbelsäule hebt ${id} hervor (Liste: ${hv.liste || '–'}, Flächen ${hv.flaechen.join('/')})`);
    await page.screenshot({ path: `${out}/teile-editor-${fall}-hover.png` });
    await page.evaluate(() => window.__stores.ui.getState().setzeTeilHover(null));
  }
  // Der Körper bleibt beim Zurückschreiben des eingefrorenen Stands derselbe
  await page.waitForTimeout(800);
  const b = await page.evaluate(() => ({ hash: window.__editor.netzHash(), schritte: window.__stores.editor.getState().verlauf.length }));
  pruefe(b.hash === a.hash && b.schritte === a.schritte, 'eingefrorener Stand ohne Undo-Schritt und ohne Umbau');
  await page.evaluate(() => {
    const el = document.querySelector('.leiste-inhalt');
    if (el) el.scrollTop = 0;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/teile-editor-${fall}.png` });
  // klar: ohne Liniennetz (nur Teile und schwarze Linie)
  await page.evaluate(() => window.__stores.ui.setState({ kantenSicht: 'aus' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/teile-editor-${fall}-klar.png` });
  await page.evaluate(() => window.__stores.ui.setState({ kantenSicht: 'zeigen' }));
  // Schalter aus/an
  await page.locator('[data-teile-sicht="aus"]').click();
  await page.waitForTimeout(300);
  const aus = await page.evaluate(() => document.querySelectorAll('[data-teile]').length);
  await page.locator('[data-teile-sicht="an"]').click();
  await page.waitForTimeout(300);
  const an = await page.evaluate(() => document.querySelectorAll('[data-teile]').length);
  pruefe(aus === 0 && an === 3, `Schalter aus/an: ${aus}/${an} Blätter`);
  if (fall === faelle[0]) {
    // Back und Bottom
    await page.evaluate(() => {
      const ui = window.__stores.ui.getState();
      window.__stores.ui.setState({ blick: { front: 'hinten', top: 'unten' } });
      void ui;
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/teile-editor-${fall}-back-bottom.png` });
    await page.evaluate(() => window.__stores.ui.setState({ blick: { front: 'front', top: 'top' } }));
  }
}
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
