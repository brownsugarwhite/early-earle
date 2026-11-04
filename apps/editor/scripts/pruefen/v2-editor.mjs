// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V2 „Saubere Linien“, im echten Editor (eigener Vite über
// run-check.sh, nie 5180): Florians Ablauf (Startkugel, dann die Umrisse eines Körpers der Extremreihe übernommen, ggf.
// Körper „Teile“). Geprüft je Fall und Blatt:
// - die Umrisse der anderen Ansichten sind Kurven (`umriss-*`, SVG mit C-Befehlen), keine Konturen in fremden Blättern;
// - im eigenen Blatt nur innere Konturstücke, keine eigene Umrisslinie;
// - die Ringe fremder Knoten liegen auf ihrer Linie (≤ 1 px im Bild), auch wo die Zeichnung neben dem Körper liegt;
// - am Kegel: ein Ring folgt beim Ziehen dem Zeiger (gemeinsame Koordinate), Rückgängig stellt den Umriss wieder her.
// Die Umrisslinien sind seit dem 20.10. (nach V3) standardmäßig aus (Florian: „störend“): geprüft wird, dass sie aus sind
// und die Ringe bleiben, danach werden sie eingeschaltet. Bilder je Fall (Riss mit den drei Blättern und der Bühne). Umgebung: FAELLE (z. B. kegel:roehre,vierbeiner:teile), NAME
// (Zusatz im Bildnamen, z. B. „vorher“), AUSGABE.
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/v2-editor.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v2');
mkdirSync(out, { recursive: true });
const name = process.env.NAME ?? 'nachher';
const faelle = (process.env.FAELLE ?? 'kegel:roehre,wuerfel:roehre,vierbeiner:teile,ente:teile').split(',').map((f) => f.split(':'));
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/extremreihe.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`  ${ok ? 'ok  ' : 'FEHL'} ${text}`);
  if (!ok) fehler++;
};

async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 90_000 });
  await page.waitForTimeout(700);
}
/** bis eine Sekunde lang kein neues Netz kam */
async function ruhig() {
  let v = await page.evaluate(() => window.__editor.netzVersion());
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const w = await page.evaluate(() => window.__editor.netzVersion());
    if (w === v) return;
    v = w;
  }
}

for (const [koerper, art] of faelle) {
  console.log(`${koerper} · ${art}`);
  await page.goto(`${url}/?look=earle&palette=blob`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__stores.ui.getState().libraryUmschalten(false);
    window.__stores.ui.getState().setzeEbene('form');
    window.__stores.ui.getState().maximieren(null);
  });
  await ruhig();
  // Florians Ablauf: die Startkugel ist eingefroren, dann kommen die Umrisse des Körpers
  let v = await page.evaluate(() => window.__editor.netzVersion());
  await page.evaluate(
    async ({ modul, koerper }) => {
      const m = await import(modul);
      const dok = m.extremKoerper(koerper).dok();
      const st = window.__stores.editor.getState();
      st.setzeDokument({ ...st.dok, profile: dok.profile });
    },
    { modul, koerper },
  );
  await nachBau(v);
  await ruhig();
  if (art === 'teile') {
    v = await page.evaluate(() => window.__editor.netzVersion());
    await page.locator('[data-koerper="teile"]').click();
    await nachBau(v);
    await ruhig();
  }
  // Florian 20.10. (nach V3): die Umrisslinien sind Anzeige und standardmäßig aus, die Ringe bleiben — hier eingeschaltet
  const standard = await page.evaluate(() => ({
    linien: document.querySelectorAll('.vp-ober svg path[data-netz-zug^="u"], .vp-ober svg path[data-netz-zug^="k"]').length,
    ringe: document.querySelectorAll('.vp-ober svg [data-netz-knoten]').length,
    an: window.__stores.ui.getState().netzUmrisse,
  }));
  pruefe(standard.an === 'aus' && standard.linien === 0 && standard.ringe > 0, `Standard: Umrisslinien aus (${standard.linien} Pfade), Ringe da (${standard.ringe})`);
  await page.evaluate(() => window.__stores.ui.setState({ netzUmrisse: 'an' }));
  await page.waitForTimeout(300);
  const befund = await page.evaluate(() => {
    const out = {};
    for (const blatt of ['seite', 'front', 'top']) {
      const svg = document.querySelector(`[data-view="${blatt}"] svg`);
      const zuege = [...(svg?.querySelectorAll('path[data-netz-zug]') ?? [])];
      const umriss = zuege.filter((p) => /^u[sft]:/.test(p.getAttribute('data-netz-zug')));
      const kontur = zuege.filter((p) => /^k[sft]:/.test(p.getAttribute('data-netz-zug')));
      const eigenU = umriss.filter((p) => p.getAttribute('data-netz-zug')[1] === blatt[0]).length;
      const fremdK = kontur.filter((p) => p.getAttribute('data-netz-zug')[1] !== blatt[0]).length;
      const ohneKurve = umriss.filter((p) => !/C/.test(p.getAttribute('d') ?? '')).length;
      // Ringe fremder Knoten gegen die Linie ihrer Ansicht im selben Blatt
      const ringe = [];
      for (const g of svg?.querySelectorAll('[data-netz-knoten]') ?? []) {
        const [quelle] = g.getAttribute('data-netz-knoten').split(':');
        const c = g.querySelectorAll('circle')[1];
        const x = Number(c.getAttribute('cx'));
        const y = Number(c.getAttribute('cy'));
        let best = Infinity;
        for (const p of umriss) {
          if (p.getAttribute('data-netz-zug')[1] !== quelle[0]) continue;
          const L = p.getTotalLength();
          for (let s = 0; s <= L; s += 0.5) {
            const q = p.getPointAtLength(s);
            best = Math.min(best, Math.hypot(q.x - x, q.y - y));
          }
        }
        ringe.push({ knoten: g.getAttribute('data-netz-knoten'), abstand: best });
      }
      out[blatt] = { umriss: umriss.length, kontur: kontur.length, eigenU, fremdK, ohneKurve, ringe };
    }
    out.delta = Object.fromEntries([...document.querySelectorAll('[data-view]')].map((v) => [v.getAttribute('data-view'), Number(v.querySelector('[data-delta]')?.getAttribute('data-delta') ?? NaN)]).filter(([, d]) => Number.isFinite(d)));
    return out;
  });
  for (const blatt of ['seite', 'front', 'top']) {
    const b = befund[blatt];
    const ringMax = Math.max(0, ...b.ringe.map((r) => r.abstand));
    pruefe(b.umriss > 0 && b.ohneKurve === 0, `${blatt}: ${b.umriss} Umrisslinien-Pfade der anderen Ansichten, alle als Kurven`);
    pruefe(b.eigenU === 0 && b.fremdK === 0, `${blatt}: keine eigene Umrisslinie, keine fremden Konturen (${b.kontur} innere Konturstücke)`);
    pruefe(ringMax <= 1, `${blatt}: ${b.ringe.length} Ringe fremder Knoten, höchstens ${ringMax.toFixed(1)} px neben ihrer Linie`);
    for (const r of b.ringe.filter((r) => r.abstand > 1)) console.log(`         ${r.knoten}: ${r.abstand.toFixed(1)} px`);
  }
  // ein Ring folgt beim Ziehen dem Zeiger (Front-Knoten 2 im Seitenblatt, gemeinsame Koordinate y; nicht der oberste, den die
  // Kopplung an die Seite bremst), Rückgängig stellt her
  if (koerper === 'kegel') {
    const ring = await page.evaluate(() => {
      const g = document.querySelector('[data-view="seite"] svg [data-netz-knoten="front:2"]');
      const r = g?.querySelectorAll('circle')[1]?.getBoundingClientRect();
      return g && r ? { id: g.getAttribute('data-netz-knoten'), x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    });
    if (!ring) pruefe(false, 'Ring eines Front-Knotens im Seitenblatt gefunden');
    else {
      const vorher = await page.evaluate(() => JSON.stringify(window.__stores.editor.getState().dok.profile.front));
      await page.mouse.move(ring.x, ring.y);
      await page.mouse.down();
      for (let k = 1; k <= 6; k++) await page.mouse.move(ring.x, ring.y + 2 * k);
      await page.waitForTimeout(200);
      const imZug = await page.evaluate((id) => {
        const r = document.querySelector(`[data-view="seite"] svg [data-netz-knoten="${id}"]`)?.querySelectorAll('circle')[1]?.getBoundingClientRect();
        return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
      }, ring.id);
      await page.mouse.up();
      pruefe(!!imZug && Math.abs(imZug.y - (ring.y + 12)) <= 1.5 && Math.abs(imZug.x - ring.x) <= 1.5, `Ring ${ring.id} folgt beim Ziehen dem Zeiger (12 px: ${imZug ? (imZug.y - ring.y).toFixed(1) : '–'} px)`);
      await ruhig();
      await page.keyboard.press('Meta+z');
      await page.waitForTimeout(500);
      const nachher = await page.evaluate(() => JSON.stringify(window.__stores.editor.getState().dok.profile.front));
      pruefe(nachher === vorher, 'Rückgängig stellt den Front-Umriss wieder her');
      await ruhig();
    }
  }
  await page.screenshot({ path: `${out}/v2-editor-${koerper}-${art}-${name}.png` });
  console.log(`  Bild ${out}/v2-editor-${koerper}-${art}-${name}.png`);
}
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alle Prüfungen ok');
process.exit(fehler ? 1 : 0);
