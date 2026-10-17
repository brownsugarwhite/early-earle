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
  // S7.2: einen Seitenknoten ziehen — während des Zugs bleibt der Baum der Körper (verformt), danach genauer Neubau
  const knoten = await page.evaluate(() => {
    const svg = document.querySelector('.vp-ober[data-view="seite"] svg.view2d');
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    let best = null;
    for (const g of svg.querySelectorAll('[data-knoten]')) {
      const c = g.querySelector('.knoten-punkt');
      const cx = Number(c.getAttribute('cx'));
      const cy = Number(c.getAttribute('cy'));
      if (!best || cy < best.cy) best = { cx, cy, x: r.x + cx, y: r.y + cy };
    }
    return best;
  });
  if (knoten) {
    const vorZug = await stand();
    await page.mouse.move(knoten.x, knoten.y);
    await page.mouse.down();
    const imZug = [];
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(knoten.x, knoten.y - 3 * i);
      await page.waitForTimeout(120);
      imZug.push(await page.evaluate(() => ({ baum: window.__editor.koerperBaum(), hash: window.__editor.netzHash() })));
    }
    const vZug = await page.evaluate(() => window.__editor.netzVersion());
    await page.mouse.up();
    await nachBau(vZug);
    await page.waitForTimeout(500);
    const nachZug = await stand();
    const mitBaum = imZug.filter((z) => !!z.baum).length;
    const anders = new Set(imZug.map((z) => z.hash)).size;
    pruefe(mitBaum === imZug.length, `Zug: Baum ist in allen ${imZug.length} Zwischenständen der Körper (${mitBaum}), ${anders} verschiedene Netze`);
    pruefe(!!nachZug.baum && nachZug.hash !== vorZug.hash && nachZug.schritte === vorZug.schritte + 1, `nach dem Zug genauer Baum (${nachZug.baum ? nachZug.baum.ms.toFixed(0) : '–'} ms), ein Undo-Schritt`);
    v = await page.evaluate(() => window.__editor.netzVersion());
    await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
    await nachBau(v);
    const zurueck = await stand();
    pruefe(zurueck.hash === vorZug.hash, 'Undo des Zugs: Baum wie vorher');
  } else pruefe(false, 'kein Seitenknoten gefunden');
  // S7.3: Pinselstrich (G) auf dem Baum — eigene Deltas des Baums, Deltas der Röhre unberührt, ein Undo-Schritt
  {
    const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
    let ziel = null;
    for (let iy = 3; iy <= 7 && !ziel; iy++) for (let ix = 3; ix <= 7 && !ziel; ix++) {
      const t = await page.evaluate(([x, y]) => window.__editor.treffen(x, y), [(rc.w * ix) / 10, (rc.h * iy) / 10]);
      if (t && t.kaefigPunkt >= 0) ziel = { px: (rc.w * ix) / 10, py: (rc.h * iy) / 10 };
    }
    if (ziel) {
      const vor = await page.evaluate(() => ({ hash: window.__editor.netzHash(), baum: window.__stores.editor.getState().dok.kaefig?.baumDeltas?.length ?? 0, roehre: window.__stores.editor.getState().dok.kaefig?.deltas?.length ?? 0, schritte: window.__stores.editor.getState().verlauf.length }));
      await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('ziehen'));
      await page.mouse.move(rc.x + ziel.px, rc.y + ziel.py);
      await page.waitForTimeout(200);
      const v0 = await page.evaluate(() => window.__editor.netzVersion());
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) {
        await page.mouse.move(rc.x + ziel.px + 4 * i, rc.y + ziel.py - 4 * i);
        await page.waitForTimeout(60);
      }
      await page.mouse.up();
      await nachBau(v0);
      await page.waitForTimeout(500);
      const nach = await page.evaluate(() => ({ hash: window.__editor.netzHash(), baum: window.__stores.editor.getState().dok.kaefig?.baumDeltas?.length ?? 0, lage: !!window.__stores.editor.getState().dok.kaefig?.baumDeltas?.[0]?.lage, roehre: window.__stores.editor.getState().dok.kaefig?.deltas?.length ?? 0, schritte: window.__stores.editor.getState().verlauf.length, koerper: !!window.__editor.koerperBaum() }));
      pruefe(nach.baum > 0 && nach.lage && nach.roehre === vor.roehre && nach.hash !== vor.hash && nach.koerper, `Pinsel auf dem Baum: ${nach.baum} Deltas mit Ruhelage, Röhren-Deltas unberührt (${nach.roehre}), Körper geändert`);
      pruefe(nach.schritte === vor.schritte + 1, `Pinsel: ein Undo-Schritt (${vor.schritte} → ${nach.schritte})`);
      const v1 = await page.evaluate(() => window.__editor.netzVersion());
      await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
      await nachBau(v1);
      const zurueck = await page.evaluate(() => ({ hash: window.__editor.netzHash(), baum: window.__stores.editor.getState().dok.kaefig?.baumDeltas?.length ?? 0 }));
      pruefe(zurueck.baum === vor.baum && zurueck.hash === vor.hash, 'Undo des Pinsels: Baum wie vorher');
      // Pose auf dem Baum: in die zweite Pose wechseln, ein Strich formt `pose.baum.form`, die Grundform bleibt
      const pid = await page.evaluate(() => window.__stores.editor.getState().dok.posen?.[1]?.id ?? null);
      if (pid) {
        const vG = await page.evaluate(() => window.__editor.netzVersion());
        await page.evaluate((id) => window.__stores.editor.getState().setzeZiel(id), pid);
        await nachBau(vG).catch(() => {});
        await page.waitForTimeout(600);
        const vorP = await page.evaluate((id) => ({ hash: window.__editor.netzHash(), form: window.__stores.editor.getState().dok.posen.find((p) => p.id === id)?.form?.length ?? 0, baum: window.__stores.editor.getState().dok.posen.find((p) => p.id === id)?.baum?.form?.length ?? 0, pose: window.__editor.wesen?.()?.pose ?? null }), pid);
        await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('aufblasen'));
        await page.mouse.move(rc.x + ziel.px, rc.y + ziel.py);
        await page.waitForTimeout(200);
        const vP = await page.evaluate(() => window.__editor.netzVersion());
        await page.mouse.down();
        for (let i = 1; i <= 8; i++) {
          await page.mouse.move(rc.x + ziel.px + 5 * i, rc.y + ziel.py - 2 * i);
          await page.waitForTimeout(60);
        }
        await page.mouse.up();
        await nachBau(vP);
        await page.waitForTimeout(500);
        const nachP = await page.evaluate((id) => ({ hash: window.__editor.netzHash(), form: window.__stores.editor.getState().dok.posen.find((p) => p.id === id)?.form?.length ?? 0, baum: window.__stores.editor.getState().dok.posen.find((p) => p.id === id)?.baum?.form?.length ?? 0, lage: !!window.__stores.editor.getState().dok.posen.find((p) => p.id === id)?.baum?.form?.[0]?.lage }), pid);
        pruefe(nachP.baum > 0 && nachP.lage && nachP.form === vorP.form && nachP.hash !== vorP.hash, `Pose „${pid}“ auf dem Baum: ${nachP.baum} Form-Deltas mit Ruhelage, Röhren-Form unberührt (${nachP.form})`);
        const vE = await page.evaluate(() => window.__editor.netzVersion());
        await page.evaluate(() => window.__stores.editor.getState().setzeZiel('editor'));
        await nachBau(vE).catch(() => {});
        await page.waitForTimeout(500);
        const grundP = await page.evaluate(() => window.__editor.netzHash());
        pruefe(grundP === vor.hash, 'zurück im Editor-Tab: Grundform wie vor der Pose');
        // die Pose-Form wieder entfernen (Undo des Strichs), damit die folgenden Undos die Schalter-Schritte treffen
        const vU = await page.evaluate(() => window.__editor.netzVersion());
        await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
        await nachBau(vU).catch(() => {});
      }
      await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('auswahl'));
    } else pruefe(false, 'kein Treffer auf dem Baum');
  }
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
