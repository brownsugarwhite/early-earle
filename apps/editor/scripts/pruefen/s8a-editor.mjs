// Plan „Liniennetz, Zielform, Käfig“, S8a im echten Editor (eigener Vite über run-check.sh, nie 5180): Florians Startkugel,
// eine P-Linie waagerecht auf 65 % Höhe (Seite) mit Härte 100 % → Kante genau auf der Linie; Härte 0 → Körper wie ohne Linie;
// Undo. Bilder der Bühne (Zebra und Earle-Look) von der Seite: ohne Linie, Härte 50 %, Härte 100 %, als Bogen.
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/s8a-editor.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const mod = (p) => `/@fs${WURZEL}/packages/shape/src/${p}`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`${ok ? '  ok  ' : '  FEHL'} ${text}`);
  if (!ok) fehler++;
};
async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v, version, { timeout: 90_000 });
  await page.waitForTimeout(1200);
}
async function buehne(name) {
  const r = await page.evaluate(() => {
    const b = document.querySelector('[data-view="creation"]')?.getBoundingClientRect();
    if (!b) return null;
    const w = b.width * 0.7;
    const h = b.height * 0.7;
    return { x: b.x + (b.width - w) / 2, y: b.y + (b.height - h) / 2, width: w, height: h };
  });
  return page.screenshot({ path: `${out}/${name}.png`, ...(r ? { clip: r } : {}) });
}
// Seitenblick auf die rechte Flanke (die Linie liegt auf ihr), etwas von oben; je Stand ein Zebra- und ein Look-Bild
const SEITENBLICK = { azimut: -0.35, elevation: (22 * Math.PI) / 180, distanz: 1.55, ziel: [0, 0.2, 0] };
const bilder = [];
async function stand(text) {
  for (const zebra of [true, false]) {
    // Zebra wirkt nur mit Matcap (im Earle-Look tauscht es nichts)
    await page.evaluate((z) => {
      window.__stores.kernAnzeige.getState().setzeLook(z ? 'matcap' : 'earle');
      window.__stores.ui.getState().setzeZebra(z);
    }, zebra);
    await page.waitForTimeout(1500);
    await page.mouse.move(5, 5);
    const png = await buehne(`s8a-${text.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${zebra ? 'zebra' : 'look'}`);
    bilder.push({ text: `${text} · ${zebra ? 'Zebra' : 'Earle-Look'}`, src: `data:image/png;base64,${png.toString('base64')}` });
  }
  await page.evaluate(() => {
    window.__stores.kernAnzeige.getState().setzeLook('earle');
    window.__stores.ui.getState().setzeZebra(false);
  });
}
async function haerteSetzen(h) {
  const v0 = await page.evaluate(() => window.__editor.netzVersion());
  await page.evaluate((hh) => {
    const st = window.__stores.editor.getState();
    const k = st.dok.kanten[0];
    st.setzeDokument({ ...st.dok, kanten: [{ ...k, haerte: k.haerte.map(() => hh) }] });
  }, h);
  await nachBau(v0);
}

await page.goto(`${url}/`);
await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
await page.waitForTimeout(1500);
const ohne = await page.evaluate(() => window.__editor.netzHash());
await page.evaluate((k) => {
  const ui = window.__stores.ui.getState();
  ui.maximieren('creation');
  ui.setzeKamera(k);
}, SEITENBLICK);
await page.waitForTimeout(1500);
await stand('ohne Linie');
await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
await page.waitForTimeout(800);
// Linie auf der Haut der Startkugel (wie im Kern-Test), Härte 100 %
let v = await page.evaluate(() => window.__editor.netzVersion());
const t0 = Date.now();
await page.evaluate(
  async ({ a, p }) => {
    const { ableiten } = await import(a);
    const { kasten, linieAusSeite } = await import(p);
    const st = window.__stores.editor.getState();
    const dok = st.dok;
    const abl = ableiten(dok, { stufen: 3 });
    const k = kasten(abl);
    const linie = linieAusSeite(abl, [[k.x0 + 0.25 * (k.x1 - k.x0), k.y0 + 0.65 * (k.y1 - k.y0)], [k.x0 + 0.75 * (k.x1 - k.x0), k.y0 + 0.65 * (k.y1 - k.y0)]]);
    const sk = dok.skalierung;
    const n = 7;
    const pts = Array.from({ length: n }, (_, i) => {
      const q = linie.punkte[Math.round((i * (linie.punkte.length - 1)) / (n - 1))];
      return [q[0] / sk, q[1] / sk, q[2] / sk];
    });
    // glatt durch die Punkte wie eine mit P gezeichnete Linie (glatteLinie: Tangente = (nächster − voriger) / 6)
    const knoten = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      const t = [(b[0] - a[0]) / 6, (b[1] - a[1]) / 6, (b[2] - a[2]) / 6];
      return { p, ein: i === 0 ? [0, 0, 0] : t.map((x) => -x), aus: i === n - 1 ? [0, 0, 0] : t, art: 'glatt' };
    });
    st.setzeDokument({ ...dok, kanten: [{ knoten, haerte: knoten.map(() => 1), blick: 'seite' }] });
  },
  { a: mod('kern/ableiten.ts'), p: mod('kern/netz/pruefen.ts') },
);
await nachBau(v);
const mit = await page.evaluate(() => ({ hash: window.__editor.netzHash(), kanten: window.__stores.editor.getState().dok.kanten?.length ?? 0 }));
pruefe(mit.kanten === 1 && mit.hash !== ohne, `Linie mit Härte 100 %: Körper hat die Kante (${((Date.now() - t0) / 1000).toFixed(1)} s bis zum Netz)`);
await page.screenshot({ path: `${out}/s8a-editor-fenster.png` });
await page.evaluate(() => window.__stores.ui.getState().maximieren('creation'));
await page.waitForTimeout(1500);
// die Kamera bleibt beim Maximieren nicht immer stehen: noch einmal setzen
await page.evaluate((k) => window.__stores.ui.getState().setzeKamera(k), SEITENBLICK);
await page.waitForTimeout(800);
// Härte 50 % (Rundung) zuerst, dann 100 % (scharf), damit das Undo unten auf 100 % zurückgeht
await haerteSetzen(0.5);
const halb = await page.evaluate(() => window.__editor.netzHash());
pruefe(halb !== ohne && halb !== mit.hash, 'Härte 50 %: eigene, weichere Kante');
await stand('Härte 50 %');
await haerteSetzen(1);
const voll = await page.evaluate(() => window.__editor.netzHash());
pruefe(voll === mit.hash, 'Härte 100 % wieder: bitgleich zum ersten Bau');
await stand('Härte 100 %');
await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
await page.waitForTimeout(800);
// Härte 0: keine Kante, Körper wie ohne Linie
await haerteSetzen(0);
const weich = await page.evaluate(() => window.__editor.netzHash());
pruefe(weich === ohne, 'Härte 0: Körper wie ohne Linie (bitgleich)');
// Undo zurück zur Kante
v = await page.evaluate(() => window.__editor.netzVersion());
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await nachBau(v);
const zurueck = await page.evaluate(() => window.__editor.netzHash());
pruefe(zurueck === mit.hash, 'Undo: Kante wieder da (bitgleich)');
// Bogen: Spalten ohne | 50 % | 100 %, Zeilen Zebra | Earle-Look
const reihen = [true, false].map((z) => bilder.filter((b) => b.text.endsWith(z ? 'Zebra' : 'Earle-Look')));
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#1b2530;color:#eee;font:13px/1.3 monospace}
.t{padding:8px 10px 2px;font-weight:bold}.z{display:grid;grid-template-columns:repeat(3,420px);gap:6px;padding:4px 10px}figure{margin:0}img{width:420px;height:320px;object-fit:cover;background:#ccc}figcaption{color:#9ab}</style>
<div class="t">S8a · Startkugel, P-Linie waagerecht auf 65 % Höhe (Seite) · Kante genau auf der Linie, Härte = Rundung</div>
${reihen.map((r) => `<div class="z">${r.map((b) => `<figure><img src="${b.src}"><figcaption>${b.text}</figcaption></figure>`).join('')}</div>`).join('')}`;
writeFileSync(`${out}/s8a-bogen.html`, html);
const p2 = await browser.newPage({ viewport: { width: 1300, height: 400 }, deviceScaleFactor: 1 });
await p2.goto(`file://${out}/s8a-bogen.html`);
await p2.screenshot({ path: `${out}/s8a-bogen.png`, fullPage: true });
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
