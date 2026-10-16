// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S2 „Glatte Haut“ im echten Editor (eigener Vite über run-check.sh, nie
// 5180). Florians Ablauf: Startkugel bauen (Stationen frieren ein), dann die Umrisse eines Prüfkörpers übernehmen
// (Stationen bleiben, wie `mitStationenVon`), dann in der Tafel Körper „Haut glatt“ wählen:
// 1. ein Undo-Schritt, `ausstattung.glatt` im Dokument, ein neuer Bau mit anderem Netz;
// 2. Δ je Blatt heute/glatt (Blatt-Titel);
// 3. Undo → Netz bitgleich wie vorher (heute);
// 4. mit Maul-Chip „vorn“: die Tafel sagt, dass „glatt“ dort noch nicht wirkt;
// 5. Bilder der Bühne (Earle-Look, Prüfansicht, Zebra) heute | glatt je Körper.
// Umgebung: FAELLE (Komma-Liste, Standard robbe,rex,vase,einfach), AUSGABE.
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/s2-editor.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'robbe,rex,vase,einfach').split(',');
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/grundkoerper.ts`;
const koerperModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/koerper.ts`;
const zufallModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/zufall.ts`;

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
    return {
      hash: window.__editor.netzHash(),
      version: window.__editor.netzVersion(),
      schritte: st.verlauf.length,
      glatt: st.dok.ausstattung?.glatt ?? false,
      stationen: st.dok.kaefig?.stationen?.ringe.length ?? 0,
      delta: ['seite', 'front', 'top'].map((a) => b[a]?.max ?? NaN),
    };
  });
async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 60_000 });
  await page.waitForTimeout(900);
}
// Ausschnitt der Bühne um die Mitte (ANTEIL der Breite und Höhe), damit der Körper im Bogen groß genug ist
const ANTEIL = Number(process.env.ANTEIL ?? 0.62);
async function buehne(name) {
  const r = await page.evaluate((anteil) => {
    const el = document.querySelector('.vp-ober[data-view="creation"]') ?? document.querySelector('[data-view="creation"]');
    const b = el?.getBoundingClientRect();
    if (!b) return null;
    const w = b.width * anteil;
    const h = b.height * anteil;
    return { x: b.x + (b.width - w) / 2, y: b.y + (b.height - h) / 2, width: w, height: h };
  }, ANTEIL);
  await page.screenshot({ path: `${out}/${name}.png`, ...(r ? { clip: r } : {}) });
}
// Zoom je Körper (Mausrad über der Bühne, positiv = weiter weg), z. B. ZOOM='{"vase":140}'
const ZOOM = { vase: 140, ...(process.env.ZOOM ? JSON.parse(process.env.ZOOM) : {}) };
const d3 = (d) => d.map((x) => x.toFixed(1)).join(' / ');
// Bühne im Layout „Bühne“: Earle-Look, Prüfansicht (Matcap) und Zebra (nur mit Matcap)
async function bilder(fall, zustand, zoomen) {
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
  // Zeiger aus der Bühne (sonst zeigt die Hover-Marke einen Punkt)
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  await buehne(`s2-editor-${fall}-${zustand}`);
  await page.evaluate(() => window.__stores.kernAnzeige.getState().setzeLook('matcap'));
  await page.waitForTimeout(1200);
  await buehne(`s2-editor-${fall}-${zustand}-matcap`);
  await page.evaluate(() => window.__stores.ui.getState().setzeZebra(true));
  await page.waitForTimeout(900);
  await buehne(`s2-editor-${fall}-${zustand}-zebra`);
  await page.evaluate(() => {
    window.__stores.ui.getState().setzeZebra(false);
    window.__stores.kernAnzeige.getState().setzeLook('earle');
    window.__stores.ui.getState().maximieren(null);
  });
  await page.waitForTimeout(1200);
}

for (const fall of faelle) {
  console.log(`${fall}:`);
  await page.goto(`${url}/?look=earle&palette=blob`);
  // Startkugel bauen, Stationen einfrieren
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
  // Umrisse des Prüfkörpers übernehmen (Stationen der Kugel bleiben)
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
  console.log(`  heute: Δ S/F/T ${d3(a.delta)} px, ${a.stationen} Ringe eingefroren`);
  await bilder(fall, 'heute', true);
  // „glatt“ wählen
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.locator('[data-haut="glatt"]').click();
  await nachBau(v);
  const b = await stand();
  pruefe(b.glatt === true && b.schritte === a.schritte + 1, `Chip „glatt“: ausstattung.glatt = ${b.glatt}, ein Undo-Schritt (${a.schritte} → ${b.schritte})`);
  pruefe(b.hash !== a.hash, `neues Netz (${a.hash} → ${b.hash})`);
  pruefe(b.stationen === a.stationen, `Stationen bleiben (${b.stationen})`);
  console.log(`  glatt: Δ S/F/T ${d3(b.delta)} px`);
  await bilder(fall, 'glatt', false);
  await page.screenshot({ path: `${out}/s2-editor-${fall}-fenster-glatt.png` });
  // Undo → bitgleich heute
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
  await nachBau(v).catch(() => {});
  const c = await stand();
  pruefe(c.glatt === false && c.hash === a.hash, `Undo: heute bitgleich (${c.hash})`);
}

// Maul-Chip: Hinweis „wirkt noch nicht“
await page.evaluate(() => {
  const st = window.__stores.editor.getState();
  st.setzeDokument({ ...st.dok, ausstattung: { ...(st.dok.ausstattung ?? {}), glatt: true } });
  window.__stores.kernAnzeige.getState().setzeMaul('vorn');
});
await page.waitForTimeout(800);
const hinweis = await page.evaluate(() => [...document.querySelectorAll('.hilfe')].map((e) => e.textContent).find((t) => t?.includes('Glatt wirkt noch nicht')) ?? null);
pruefe(!!hinweis, `mit Maul: Hinweis in der Tafel (${hinweis ? 'da' : 'fehlt'})`);
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
