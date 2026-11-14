// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 Rest: verdecktes Teilstück als eigene Kurve im echten Editor (eigener
// Vite über run-check.sh, nie 5180). Florians Ablauf (Startkugel → Umrisse eines Körpers übernommen), Stufe Körper im Riss:
// Klick auf ein gestricheltes Stück → eigene Kurve (ein Undo-Schritt, das geratene Stück verschwindet), Knoten ziehen (ein
// Schritt, Enden bleiben auf den Stoßstellen), schwarze Linie bewegen (die Kurve wandert mit), „Automatisch“ (ein Schritt,
// das geratene Stück ist zurück), Undo bringt die Kurve wieder. Bilder des Fensters.
// Umgebung: FALL (Standard ente), BLATT (Standard front), TEIL (Kennung des Teils, Standard das erste mit Stück), AUSGABE
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/teile-kurve.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(out, { recursive: true });
const fall = process.env.FALL ?? 'ente';
const blatt = process.env.BLATT ?? 'front';
const satzModul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/teilsatz.ts`;
const kurvenModul = `/@fs${WURZEL}/packages/shape/src/kern/grundkoerper/teilKurven.ts`;
const profilModul = `/@fs${WURZEL}/packages/shape/src/profil.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`${ok ? '  ok  ' : '  FEHL'} ${text}`);
  if (!ok) fehler++;
};
const stand = () => page.evaluate(() => ({ schritte: window.__stores.editor.getState().verlauf.length, kurven: window.__stores.editor.getState().dok.teile?.length ?? 0 }));
/** Abstand (px bei 461) der Kurvenenden zu ihren Stoßstellen auf der Linie von heute */
const endenAbstand = () =>
  page.evaluate(
    async ({ kurvenModul, profilModul }) => {
      const m = await import(kurvenModul);
      const pm = await import(profilModul);
      const dok = window.__stores.editor.getState().dok;
      const k = dok.teile?.[0];
      if (!k) return null;
      const kn = m.teilKurveKnoten(dok, k);
      const umriss = pm.pfadAbtasten(pm.vollerPfad(dok.profile[k.ansicht]), 200);
      const naechst = (q) => Math.min(...umriss.map((p) => Math.hypot(p.x - q.x, p.y - q.y))) * 461 * dok.skalierung;
      return { a: k.a ? naechst(kn[0].p) : null, b: k.b ? naechst(kn[kn.length - 1].p) : null, art: k.zu ? 'zu' : k.a && k.b ? 'a+b' : k.a ? 'a' : 'frei', mitte: kn[Math.floor(kn.length / 2)].p };
    },
    { kurvenModul, profilModul },
  );

console.log(`${fall}, ${blatt}:`);
await page.goto(`${url}/?look=earle&palette=blob`);
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
await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, v, { timeout: 60_000 });
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.libraryUmschalten(false);
  ui.setzeEbene('form');
  ui.maximieren(null);
});
await page.waitForFunction(() => !!window.__stores.editor.getState().dok.kaefig?.stationen?.teile, null, { timeout: 20_000 });
await page.waitForTimeout(1500);

// 1. Klick auf ein gestricheltes Stück (ein Teil mit Stoßstellen bevorzugt)
const stueck = await page.evaluate(
  ({ blatt, teil }) => {
    const alle = [...document.querySelectorAll(`[data-view="${blatt}"] [data-teil-stueck]`)].map((g) => g.getAttribute('data-teil-stueck'));
    return (teil ? alle.find((s) => s.startsWith(`${teil}:`)) : alle.find((s) => !s.startsWith('rumpf:'))) ?? alle[0] ?? null;
  },
  { blatt, teil: process.env.TEIL ?? null },
);
pruefe(!!stueck, `gestricheltes Stück im Blatt ${blatt}: ${stueck}`);
if (!stueck) {
  await browser.close();
  process.exit(1);
}
const id = stueck.split(':')[0];
const vorher = await stand();
// eine Stelle des Stücks, an der es oben liegt (Knoten und Ringe gehen beim Klick vor)
const ziel = await page.evaluate(({ blatt, stueck }) => {
  // Plan 20.10., V0: die Trefferfläche liegt in der eigenen Ebene unter der schwarzen Linie
  const p = document.querySelector(`[data-view="${blatt}"] [data-teil-verdeckt-treffer="${stueck}"]`);
  const l = p.getTotalLength();
  const m = p.getScreenCTM();
  for (let f = 0.5, k = 0; k < 40; k++, f = 0.5 + ((k % 2 ? 1 : -1) * Math.ceil(k / 2)) / 42) {
    const q = p.getPointAtLength(l * f);
    const x = m.a * q.x + m.c * q.y + m.e;
    const y = m.b * q.x + m.d * q.y + m.f;
    if (document.elementFromPoint(x, y) === p) return { x, y };
  }
  return null;
}, { blatt, stueck });
pruefe(!!ziel, 'freie Stelle auf dem Stück zum Klicken');
const oben = await page.evaluate(({ x, y }) => document.elementsFromPoint(x, y).slice(0, 5).map((e) => `${e.tagName}${[...e.attributes].filter((a) => a.name.startsWith('data-') || a.name === 'class').map((a) => `[${a.name}=${a.value}]`).join('')}`), ziel);
console.log('  oben an der Stelle:', oben.join(' | '));
await page.mouse.move(ziel.x, ziel.y);
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(800);
const nachKlick = await stand();
pruefe(nachKlick.kurven === vorher.kurven + 1 && nachKlick.schritte === vorher.schritte + 1, `Klick: eigene Kurve angelegt (${nachKlick.kurven}), ein Undo-Schritt`);
const sicht = await page.evaluate(({ blatt, id }) => ({ kurve: document.querySelectorAll(`[data-view="${blatt}"] [data-teil-kurve="${id}"]`).length, stueck: document.querySelectorAll(`[data-view="${blatt}"] [data-teil-verdeckt="${id}"]`).length }), { blatt, id });
pruefe(sicht.kurve === 1 && sicht.stueck === 0, `Kurve im Blatt, das geratene Stück ersetzt (${sicht.kurve}/${sicht.stueck})`);
const e0 = await endenAbstand();
console.log(`  Kurve: ${e0.art}, Enden zur schwarzen Linie ${e0.a?.toFixed(2) ?? '–'} / ${e0.b?.toFixed(2) ?? '–'} px`);
await page.screenshot({ path: `${out}/teile-kurve-${fall}-angelegt.png` });

// 2. Knoten ziehen (20 px): ein Undo-Schritt, Enden bleiben auf den Stoßstellen
const knoten = await page.evaluate(({ blatt, id }) => {
  const c = document.querySelector(`[data-view="${blatt}"] [data-teil-kurve="${id}"] [data-teil-kurve-knoten]`);
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, { blatt, id });
pruefe(!!knoten, 'ziehbarer Knoten auf der Kurve');
if (knoten) {
  const s0 = await stand();
  await page.mouse.move(knoten.x, knoten.y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(knoten.x + 2 * k, knoten.y - 2 * k);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const s1 = await stand();
  const e1 = await endenAbstand();
  pruefe(s1.schritte === s0.schritte + 1, `Knoten gezogen: ein Undo-Schritt (${s1.schritte - s0.schritte})`);
  pruefe((e1.a ?? 0) < 0.5 && (e1.b ?? 0) < 0.5, `Enden bleiben auf der schwarzen Linie (${e1.a?.toFixed(2) ?? '–'} / ${e1.b?.toFixed(2) ?? '–'} px)`);
  await page.screenshot({ path: `${out}/teile-kurve-${fall}-gezogen.png` });
}

// 3. schwarze Linie bewegen (Knoten der Zeichnung nahe der ersten Stoßstelle, 15 px): die Kurve wandert mit
const zug = await page.evaluate(
  async ({ profilModul }) => {
    const pm = await import(profilModul);
    const st = window.__stores.editor.getState();
    const k = st.dok.teile?.[0];
    if (!k?.a) return null;
    const pr = st.dok.profile[k.ansicht];
    // Knoten am Ende des Segments der Stoßstelle
    const i = (k.a.k + (k.a.t > 0.5 ? 1 : 0)) % pr.knoten.length;
    st.beginGeste();
    st.setzeProfil(k.ansicht, pm.verschiebeKnoten(pr, [i], { x: 15 / 461 / st.dok.skalierung, y: 15 / 461 / st.dok.skalierung }));
    st.endeGeste();
    return i;
  },
  { profilModul },
);
await page.waitForTimeout(1200);
const e2 = await endenAbstand();
pruefe(zug === null || ((e2.a ?? 0) < 0.5 && (e2.b ?? 0) < 0.5), `schwarze Linie bewegt (Knoten ${zug}): Enden folgen (${e2.a?.toFixed(2) ?? '–'} / ${e2.b?.toFixed(2) ?? '–'} px)`);
await page.screenshot({ path: `${out}/teile-kurve-${fall}-linie.png` });

// 4. „Automatisch“: ein Undo-Schritt, das geratene Stück ist zurück
const s3 = await stand();
await page.locator(`[data-teil-automatisch="${id}"]`).click();
await page.waitForTimeout(600);
const s4 = await stand();
const zurueck = await page.evaluate(({ blatt, id }) => document.querySelectorAll(`[data-view="${blatt}"] [data-teil-verdeckt="${id}"]`).length, { blatt, id });
pruefe(s4.kurven === 0 && s4.schritte === s3.schritte + 1 && zurueck > 0, `„Automatisch“: Kurve weg, ein Undo-Schritt, geratenes Stück zurück (${zurueck})`);
// 5. Undo bringt die Kurve wieder
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(600);
const s5 = await stand();
pruefe(s5.kurven === 1, 'Undo: die eigene Kurve ist wieder da');
await page.screenshot({ path: `${out}/teile-kurve-${fall}-undo.png` });
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
