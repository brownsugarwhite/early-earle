// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S3 „Umrisse berühren“ im echten Editor (eigener Vite über run-check.sh, nie
// 5180): Florians Ablauf (neue Startkugel mit glatter Haut, dann die Umrisse eines Prüfkörpers übernommen), dann in der
// Tafel Körper „Umrisse berühren aus | rund | mittel | genau“ — je Stufe ein Undo-Schritt, Δ je Blatt aus dem Titel,
// Bilder der Bühne (Earle-Look und Prüfansicht) und des ganzen Fensters (Blätter mit schwarzer Linie und Saum).
// Umgebung: FAELLE (Komma-Liste, Standard einfach-glatt), AUSGABE, ZOOM (JSON je Fall), ANTEIL (Ausschnitt der Bühne).
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/s3-editor.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'einfach-glatt').split(',');
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/grundkoerper.ts`;
const koerperModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/koerper.ts`;
const zufallModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/zufall.ts`;
const ANTEIL = Number(process.env.ANTEIL ?? 0.62);
const ZOOM = { 'einfach-glatt': 60, einfach: 60, ...(process.env.ZOOM ? JSON.parse(process.env.ZOOM) : {}) };

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
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
    const b = window.__stores.kernAnzeige.getState().info?.blatt ?? {};
    return { hash: window.__editor.netzHash(), schritte: st.verlauf.length, fuelle: st.dok.ausstattung?.fuelle ?? 'aus', delta: ['seite', 'front', 'top'].map((a) => b[a]?.max ?? NaN) };
  });
async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 60_000 });
  await page.waitForTimeout(900);
}
async function buehne(name) {
  const r = await page.evaluate((anteil) => {
    const b = document.querySelector('[data-view="creation"]')?.getBoundingClientRect();
    if (!b) return null;
    const w = b.width * anteil;
    const h = b.height * anteil;
    return { x: b.x + (b.width - w) / 2, y: b.y + (b.height - h) / 2, width: w, height: h };
  }, ANTEIL);
  await page.screenshot({ path: `${out}/${name}.png`, ...(r ? { clip: r } : {}) });
}
async function bilder(fall, stufe, zoomen) {
  await page.evaluate(() => window.__stores.ui.getState().maximieren('creation'));
  await page.waitForTimeout(900);
  if (zoomen && ZOOM[fall]) {
    const r = await page.evaluate(() => {
      const b = document.querySelector('[data-view="creation"]')?.getBoundingClientRect();
      return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
    });
    if (r) {
      await page.mouse.move(r.x, r.y);
      await page.mouse.wheel(0, ZOOM[fall]);
      await page.waitForTimeout(700);
    }
  }
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  await buehne(`s3-editor-${fall}-${stufe}`);
  await page.evaluate(() => window.__stores.kernAnzeige.getState().setzeLook('matcap'));
  await page.waitForTimeout(1200);
  await buehne(`s3-editor-${fall}-${stufe}-matcap`);
  await page.evaluate(() => {
    window.__stores.kernAnzeige.getState().setzeLook('earle');
    window.__stores.ui.getState().maximieren(null);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/s3-editor-${fall}-${stufe}-fenster.png` });
}
const d3 = (d) => d.map((x) => x.toFixed(1)).join(' / ');

for (const fall of faelle) {
  console.log(`${fall}:`);
  await page.goto(`${url}/?look=earle&palette=blob`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
  let v = await page.evaluate(() => window.__editor.netzVersion());
  await page.evaluate(
    async ({ fall, modul, koerperModul, zufallModul }) => {
      const g = await import(modul);
      let dok;
      if (g.S0_KOERPER.includes(fall)) dok = g.s0KoerperDokument(fall);
      else if (g.G_KOERPER.includes(fall)) dok = g.gKoerperDokument(fall);
      else {
        const k = await import(koerperModul);
        const z = await import(zufallModul);
        dok = k.koerperDokument(fall, z.zufall(1));
      }
      const st = window.__stores.editor.getState();
      st.setzeDokument({ ...st.dok, profile: dok.profile, ...(dok.spanten ? { spanten: dok.spanten } : {}) });
    },
    { fall, modul, koerperModul, zufallModul },
  );
  await nachBau(v);
  await page.evaluate(() => {
    window.__stores.ui.getState().libraryUmschalten(false);
    window.__stores.ui.getState().setzeEbene('form');
  });
  await page.waitForTimeout(400);
  const a = await stand();
  console.log(`  aus: Δ S/F/T ${d3(a.delta)} px`);
  await bilder(fall, 'aus', true);
  let vorher = a;
  for (const stufe of (process.env.STUFEN ?? 'mittel,genau').split(',')) {
    v = await page.evaluate(() => window.__editor.netzVersion());
    await page.locator(`[data-fuelle="${stufe}"]`).click();
    await nachBau(v);
    const b = await stand();
    pruefe(b.fuelle === stufe && b.schritte === vorher.schritte + 1 && b.hash !== vorher.hash, `Fülle „${stufe}“: ein Undo-Schritt, neues Netz`);
    console.log(`  ${stufe}: Δ S/F/T ${d3(b.delta)} px`);
    await bilder(fall, stufe, false);
    vorher = b;
  }
}
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
