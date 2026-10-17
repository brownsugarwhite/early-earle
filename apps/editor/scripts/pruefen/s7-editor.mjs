// Plan „Liniennetz, Zielform, Käfig“ (17.10.), S7.1 im echten Editor (eigener Vite über run-check.sh, nie 5180): Florians
// Ablauf (neue Startkugel, dann die Umrisse eines Prüfkörpers übernommen), dann in der Tafel Körper „Körper: Röhre | Teile“ —
// ein Undo-Schritt; mit „Teile“ ist der Baum mit seitlichen Röhren der Körper (Netz anders, Earle-Look, Δ im Blatt-Titel),
// Undo bringt die Röhre bitgleich zurück. Bilder der Bühne (schräg, Earle-Look) und des ganzen Fensters.
// Umgebung: FAELLE (Komma-Liste), SEITEN ("ente:1,…" erwartete seitliche Röhren), AUSGABE.
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/s7-editor.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'ente,fisch,vierbeiner,zweihals').split(',');
const satzModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/teilsatz.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const soll = Object.fromEntries((process.env.SEITEN ?? 'ente:1,fisch:1,vierbeiner:2,zweihals:1').split(',').filter(Boolean).map((t) => t.split(':')));
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`${ok ? '  ok  ' : '  FEHL'} ${text}`);
  if (!ok) fehler++;
};
const stand = () =>
  page.evaluate(() => {
    const st = window.__stores.editor.getState();
    const delta = [...document.querySelectorAll('[data-delta]')].map((e) => e.textContent ?? '');
    return { hash: window.__editor.netzHash(), schritte: st.verlauf.length, koerper: st.dok.ausstattung?.koerper ?? 'roehre', baum: window.__editor.koerperBaum(), geist: window.__editor.geist(), titel: document.querySelector('[data-geist]')?.textContent ?? '', delta };
  });
async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 90_000 });
  await page.waitForTimeout(900);
}
async function buehne(name) {
  const r = await page.evaluate(() => {
    const b = document.querySelector('[data-view="creation"]')?.getBoundingClientRect();
    if (!b) return null;
    const w = b.width * 0.7;
    const h = b.height * 0.7;
    return { x: b.x + (b.width - w) / 2, y: b.y + (b.height - h) / 2, width: w, height: h };
  });
  await page.screenshot({ path: `${out}/${name}.png`, ...(r ? { clip: r } : {}) });
}

for (const fall of faelle) {
  console.log(`${fall}:`);
  await page.goto(`${url}/`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
  let v = await page.evaluate(() => window.__editor.netzVersion());
  await page.evaluate(
    async ({ fall, satzModul }) => {
      const m = await import(satzModul);
      const dok = m.teilSatzDokument(fall);
      const st = window.__stores.editor.getState();
      st.setzeDokument({ ...st.dok, profile: dok.profile, ...(dok.spanten ? { spanten: dok.spanten } : {}) });
    },
    { fall, satzModul },
  );
  await nachBau(v);
  await page.evaluate(() => {
    window.__stores.ui.getState().libraryUmschalten(false);
    window.__stores.ui.getState().setzeEbene('form');
  });
  await page.waitForTimeout(500);
  const a = await stand();
  pruefe(a.koerper === 'roehre' && a.baum === null && a.geist === null, `Röhre: kein Baum (${a.titel})`);
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.locator('[data-koerper="teile"]').click();
  await nachBau(v);
  await page.waitForFunction(() => !!window.__editor.koerperBaum(), null, { timeout: 60_000 }).catch(() => {});
  const b = await stand();
  pruefe(b.koerper === 'teile' && b.schritte === a.schritte + 1, `Chip „Teile“: Ausstattung koerper = teile, ein Undo-Schritt (${a.schritte} → ${b.schritte})`);
  pruefe(!!b.baum && !b.baum.fehler && b.baum.streifen >= 1, `Baum ist der Körper: ${b.baum ? `${b.baum.streifen} Streifen, ${b.baum.seiten} seitlich, ${b.baum.ms.toFixed(0)} ms${b.baum.fehler ? `, Fehler ${b.baum.fehler}` : ''}` : 'fehlt'} · Tafel „${b.titel.trim()}“`);
  if (soll[fall] !== undefined) pruefe(b.baum?.seiten === Number(soll[fall]), `${b.baum?.seiten ?? 0} seitliche Röhren (erwartet ${soll[fall]})`);
  pruefe(b.hash !== a.hash, 'Netz ist der Baum (anders als die Röhre)');
  pruefe(b.geist === null, 'kein Geist mehr');
  console.log(`        Δ-Titel Röhre ${a.delta.join(' | ')}  →  Baum ${b.delta.join(' | ')}`);
  await page.evaluate(() => window.__stores.ui.getState().maximieren('creation'));
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
  await buehne(`s7-editor-${fall}-baum`);
  await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${out}/s7-editor-${fall}-fenster.png` });
  // Undo bringt die Röhre zurück
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
  await nachBau(v);
  const c = await stand();
  pruefe(c.koerper === 'roehre' && c.baum === null && c.hash === a.hash, 'Undo: wieder Röhre, Netz wie vorher');
}
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
