// Plan 20.10., V0 „Teile ehrlich“ im echten Editor (eigener Vite über run-check.sh, nie 5180), Florians Ablauf: neue
// Startkugel, Umrisse eines Prüfkörpers übernommen, Körper „Teile“.
// 1. Klickfang: Wo eine Wirbelsäule über der schwarzen Linie liegt (Teilspitzen), gewinnt die schwarze Linie den Treffer, und
//    der Stift setzt dort einen Punkt (vorher fing ein unsichtbarer 10-px-Streifen der Wirbelsäule den Klick).
// 2. Doppelbau: Nach einer Geste wird der Baum genau einmal gebaut (vorher ein zweites Mal, weil das Zurückschreiben der
//    eingefrorenen Teile seinen Schlüssel änderte).
// 3. Spant-Werkzeug auf „Teile“: Hinweis statt stiller Spanten. 4. „Neu ableiten“ ist ein Undo-Schritt. 5. Umschalten der
//    Körperart sagt, welche Pinsel-Änderungen auf der anderen Art liegen.
// Umgebung: FAELLE (Komma-Liste der Teilsatz-Körper), AUSGABE.
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/v0-teile.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const faelle = (process.env.FAELLE ?? 'giraffe-bauch,ente').split(',');
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
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 90_000 });
  await page.waitForTimeout(900);
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
    window.__stores.ui.getState().setzeTeileSicht('an');
  });
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.locator('[data-koerper="teile"]').click();
  await nachBau(v);
  await page.waitForFunction(() => !!window.__editor.koerperBaum(), null, { timeout: 60_000 }).catch(() => {});
  await ruhig();

  // 1. Klickfang: Punkte der Wirbelsäulen, die auf der schwarzen Linie liegen (Hit-Pfad der Kurve trifft), in jedem Blatt
  const kollisionen = await page.evaluate(() => {
    const out = [];
    for (const blatt of ['seite', 'front', 'top']) {
      const svg = document.querySelector(`.vp-ober[data-view="${blatt}"] svg.view2d`);
      const kurve = svg?.querySelector('[data-kurve]');
      if (!svg || !kurve) continue;
      const ctm = svg.getScreenCTM();
      for (const g of svg.querySelectorAll('[data-teil-achse]')) {
        const d = g.querySelector('path')?.getAttribute('d') ?? '';
        const pts = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
        for (let i = 0; i + 1 < pts.length; i++) {
          for (let t = 0; t < 1; t += 0.25) {
            const p = new DOMPoint(pts[i].x + (pts[i + 1].x - pts[i].x) * t, pts[i].y + (pts[i + 1].y - pts[i].y) * t);
            if (!kurve.isPointInStroke(p)) continue;
            const s = p.matrixTransform(ctm);
            const el = document.elementFromPoint(s.x, s.y);
            const was = el ? `${el.tagName}${[...el.attributes].filter((x) => x.name.startsWith('data-')).map((x) => `[${x.name}=${x.value}]`).join('')}${el.parentElement ? ` < ${el.parentElement.tagName}${[...el.parentElement.attributes].filter((x) => x.name.startsWith('data-') || x.name === 'class').map((x) => `[${x.name}=${x.value}]`).join('')}` : ''}` : '-';
            out.push({ blatt, teil: g.getAttribute('data-teil-achse'), x: s.x, y: s.y, aufKurve: !!el?.closest('[data-kurve]'), aufAchse: !!el?.closest('[data-teil-achse],[data-teil-achse-treffer]'), was });
          }
        }
      }
    }
    return out;
  });
  // gefangen = die Wirbelsäule bekommt den Treffer (Knoten, Ringe fremder Knoten und P-Linien dürfen über der Linie liegen)
  const gefangen = kollisionen.filter((k) => k.aufAchse);
  pruefe(kollisionen.length > 0, `${kollisionen.length} Stellen, an denen eine Wirbelsäule auf der schwarzen Linie liegt`);
  pruefe(gefangen.length === 0, `dort fängt die Wirbelsäule keinen Klick (${kollisionen.filter((k) => k.aufKurve).length} auf der schwarzen Linie, der Rest auf Knoten/Ringen; gefangen: ${gefangen.length}${gefangen.length ? `, z. B. ${gefangen[0].blatt} Teil ${gefangen[0].teil}: ${gefangen[0].was}` : ''})`);
  if (process.env.ZEIGE) for (const g of gefangen.slice(0, 12)) console.log(`     ${g.blatt} ${g.teil} (${g.x.toFixed(0)}, ${g.y.toFixed(0)}) ${g.was}`);
  // Stift an der ersten solchen Stelle der Seite: ein Punkt mehr
  const ziel = kollisionen.find((k) => k.blatt === 'seite') ?? kollisionen[0];
  if (ziel) {
    const vorher = await page.evaluate((b) => window.__stores.editor.getState().dok.profile[b].knoten.length, ziel.blatt);
    await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('stift'));
    await page.mouse.click(ziel.x, ziel.y);
    await page.waitForTimeout(400);
    const nachher = await page.evaluate((b) => window.__stores.editor.getState().dok.profile[b].knoten.length, ziel.blatt);
    // vorher begann der Klick auf der Wirbelsäule eine neue P-Linie („freie Fläche“)
    const zeichnet = await page.evaluate(() => !!window.__stores.ui.getState().kanteZeichnen);
    pruefe(nachher === vorher + 1 && !zeichnet, `Stift auf der schwarzen Linie unter der Wirbelsäule (${ziel.blatt}): Knoten ${vorher} → ${nachher}${zeichnet ? ', stattdessen neue P-Linie begonnen' : ''}`);
    await page.keyboard.press('Escape');
    await page.evaluate((n) => {
      window.__stores.ui.getState().setzeWerkzeug('auswahl');
      if (n) window.__stores.editor.getState().rueckgaengig();
    }, nachher === vorher + 1);
    await ruhig();
  }

  // 2. Doppelbau: jedes Netz nach dem Gestenende mitschreiben (Bauzeit des Baums: gleich = wiederverwendet)
  await page.evaluate(() => {
    window.__baue = [];
    window.__stores.kernAnzeige.subscribe((s) => {
      const b = window.__editor.koerperBaum();
      window.__baue.push({ schnell: !!s.info?.schnell, ms: b?.ms ?? null, t: performance.now() });
    });
  });
  // ein Rückenknoten der Seite (oberster Knoten), 8 px nach oben gezogen
  const k = await page.evaluate(() => {
    const kn = window.__stores.editor.getState().dok.profile.seite.knoten;
    let i = 0;
    kn.forEach((q, j) => {
      if (q.p.y > kn[i].p.y) i = j;
    });
    return i;
  });
  const box = await page.locator(`.vp-ober[data-view="seite"] [data-knoten="${k}"] .knoten-punkt`).boundingBox();
  const p0 = await page.evaluate((k) => window.__stores.editor.getState().dok.profile.seite.knoten[k].p, k);
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let j = 1; j <= 8; j++) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - j);
  await page.evaluate(() => (window.__ende = performance.now()));
  await page.mouse.up();
  const p1 = await page.evaluate((k) => window.__stores.editor.getState().dok.profile.seite.knoten[k].p, k);
  pruefe(Math.abs(p1.y - p0.y) > 1e-4, `Rückenknoten ${k} der Seite gezogen (${(p0.y * 461).toFixed(1)} → ${(p1.y * 461).toFixed(1)})`);
  await nachBau(v);
  await ruhig();
  const baue = await page.evaluate(() => window.__baue.filter((b) => !b.schnell && b.t >= window.__ende));
  const verschieden = [...new Set(baue.map((b) => b.ms))];
  pruefe(verschieden.length === 1, `nach der Geste ${baue.length} genaue Netze, ${verschieden.length} Baum-Bau(ten) (${verschieden.map((m) => (m === null ? '-' : m.toFixed(0))).join(', ')} ms)`);
  await page.screenshot({ path: `${out}/v0-teile-${fall}.png` });

  // 3. Spant-Werkzeug auf „Teile“: Hinweis statt stiller Spanten
  const sp0 = await page.evaluate(() => (window.__stores.editor.getState().dok.spanten ?? []).length);
  const mitte = await page.evaluate(() => {
    const svg = document.querySelector('.vp-ober[data-view="seite"] svg.view2d');
    const kn = window.__stores.editor.getState().dok.profile.seite.knoten;
    const r = svg.querySelector('[data-kurve]').getBoundingClientRect();
    return { x: r.x + r.width * 0.45, y: r.y + r.height * 0.6, n: kn.length };
  });
  await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('spant'));
  await page.mouse.click(mitte.x, mitte.y);
  await page.waitForTimeout(300);
  const nachSpant = await page.evaluate(() => ({ n: (window.__stores.editor.getState().dok.spanten ?? []).length, hinweis: String(window.__stores.ui.getState().hinweis?.text ?? window.__stores.ui.getState().hinweis ?? '') }));
  pruefe(nachSpant.n === sp0 && nachSpant.hinweis.includes('Teile'), `Spant-Werkzeug auf „Teile“: Spanten ${sp0} → ${nachSpant.n}, Hinweis „${nachSpant.hinweis}“`);
  await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('auswahl'));

  // 4. „Neu ableiten“: ein Undo-Schritt, Rückgängig bringt den eingefrorenen Stand zurück
  const vorAbl = await page.evaluate(() => ({ schritte: window.__stores.editor.getState().verlauf.length, st: JSON.stringify(window.__stores.editor.getState().dok.kaefig?.stationen ?? null) }));
  await page.locator('[data-neu-ableiten]').click();
  await page.waitForTimeout(300);
  const nachAbl = await page.evaluate(() => ({ schritte: window.__stores.editor.getState().verlauf.length }));
  await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
  await page.waitForTimeout(300);
  const zurueck = await page.evaluate(() => JSON.stringify(window.__stores.editor.getState().dok.kaefig?.stationen ?? null));
  pruefe(nachAbl.schritte === vorAbl.schritte + 1 && zurueck === vorAbl.st, `„Neu ableiten“: Undo-Schritt (${vorAbl.schritte} → ${nachAbl.schritte}), Rückgängig stellt den Stand wieder her (${zurueck === vorAbl.st ? 'ja' : 'nein'})`);
  await ruhig();

  // 5. Umschalten mit Pinsel-Änderungen der anderen Körperart: Hinweis
  await page.evaluate(() => {
    const st = window.__stores.editor.getState();
    st.setzeDokument({ ...st.dok, kaefig: { ...(st.dok.kaefig ?? { deltas: [] }), baumDeltas: [{ punkt: 0, d: [0, 0.001, 0] }] } });
  });
  await page.locator('[data-koerper="roehre"]').click();
  await page.waitForTimeout(300);
  const hw = await page.evaluate(() => String(window.__stores.ui.getState().hinweis?.text ?? window.__stores.ui.getState().hinweis ?? ''));
  pruefe(hw.includes('wirken auf die Röhre nicht'), `Umschalten auf „Röhre“ mit Pinsel auf „Teile“: Hinweis „${hw}“`);
  await ruhig();
}
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
