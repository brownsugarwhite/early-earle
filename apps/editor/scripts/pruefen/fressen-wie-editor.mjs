// Fressen wie Editor (Plan docs/plans/2026-10-15-fressen-wie-editor.md, Florian 15.10.: „Ich muss Mesh und Maul exakt wie
// bei Editor anpassen können“). Echte Mauszüge im Fressen-Modus an Kugel (ohne Maul), Fisch (Rundmaul), Rex und Tiger:
// Seite oberster Knoten 25 px hoch, Front breitester Knoten 20 px nach außen, roter Maulanfang 12 px (falls gezeichnet),
// Pinsel. Je Zug: Pose-Form im Dokument, Grundform unverändert, die anderen Blätter folgen gekoppelt, Körper ändert sich,
// ein Undo-Schritt; Editor-Tab zeigt danach unverändert die Grundform. Über run-check.sh (eigener Vite, 5192).
// Prüfmittel, keine Abnahme (Florian: „Die Testwesen sind nur zum Testen“).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
const wesen = process.argv[2] ? process.argv[2].split(',') : ['kugel', 'fisch', 'rex', 'tiger'];
const laden = async (id) => {
  if (id === 'kugel') {
    await page.evaluate(() => window.__stores.editor.getState().neu());
  } else {
    await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
    await page.waitForTimeout(300);
    await page.click(`[data-pruefwesen="${id}"]`);
    const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
    if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
  }
  await page.waitForTimeout(3500);
};
const stand = () =>
  page.evaluate(() => {
    const ed = window.__stores.editor.getState();
    const w = window.__editor.wesen();
    const ext = (p, achse) => {
      let lo = Infinity;
      let hi = -Infinity;
      for (const k of p.knoten) {
        lo = Math.min(lo, k.p[achse]);
        hi = Math.max(hi, k.p[achse]);
      }
      return [lo, hi];
    };
    return {
      modus: ed.modus,
      verlauf: ed.verlauf.length,
      pose: !!ed.basis.posenForm?.fressen,
      basisSeite: JSON.stringify(ed.basis.profile.seite),
      basisFront: JSON.stringify(ed.basis.profile.front),
      basisMaul: JSON.stringify(ed.basis.maul ?? null),
      sichtSeiteY: ext(ed.dok.profile.seite, 'y'),
      sichtFrontY: ext(ed.dok.profile.front, 'y'),
      sichtFrontX: ext(ed.dok.profile.front, 'x'),
      sichtTopY: ext(ed.dok.profile.top, 'y'),
      sichtMaul: JSON.stringify(ed.dok.maul ?? null),
      summe: w?.summe ?? null,
      info: window.__stores.kernAnzeige.getState().info?.pose ?? null,
      blatt: window.__stores.kernAnzeige.getState().info?.blatt ?? null,
    };
  });
const mitte = async (sel) => {
  const el = await page.$(sel);
  if (!el) return null;
  const b = await el.boundingBox();
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
};
const ziehen = async (von, dx, dy) => {
  await page.mouse.move(von.x, von.y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) {
    await page.mouse.move(von.x + (dx * k) / 10, von.y + (dy * k) / 10);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(3000);
};
const bilder = [];
const bild = async (text) => {
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects);
  const minX = Math.min(rc.seite.x, rc.front.x, rc.top.x, rc.creation.x);
  const minY = Math.min(rc.seite.y, rc.front.y, rc.top.y, rc.creation.y);
  const maxX = Math.max(rc.seite.x + rc.seite.w, rc.front.x + rc.front.w, rc.top.x + rc.top.w, rc.creation.x + rc.creation.w);
  const maxY = Math.max(rc.seite.y + rc.seite.h, rc.front.y + rc.front.h, rc.top.y + rc.top.h, rc.creation.y + rc.creation.h);
  const png = await page.screenshot({ clip: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } });
  bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text });
};
const ergebnisse = [];
for (const id of wesen) {
  await laden(id);
  await page.evaluate(() => {
    const ui = window.__stores.ui.getState();
    ui.setzeEbene('form');
    ui.setzeWerkzeug?.('auswahl');
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
  await page.waitForTimeout(1500);
  const s0 = await stand();
  await page.locator('button.pille', { hasText: 'Fressen' }).first().click();
  await page.waitForTimeout(3000);
  const s1 = await stand();
  const pruef = [];
  // 1) Seite: oberster Knoten 25 px hoch
  const iOben = await page.evaluate(() => {
    const k = window.__stores.editor.getState().dok.profile.seite.knoten;
    let b = 0;
    k.forEach((q, i) => {
      if (q.p.y > k[b].p.y) b = i;
    });
    return b;
  });
  const pSeite = await mitte(`[data-view="seite"] [data-knoten="${iOben}"] circle.knoten-punkt`);
  if (pSeite) await ziehen(pSeite, 0, -25);
  const s2 = await stand();
  pruef.push(['Seite: Pose-Form angelegt', s2.pose]);
  pruef.push(['Seite: Grundform unverändert', s2.basisSeite === s0.basisSeite]);
  pruef.push(['Seite: Sicht höher', s2.sichtSeiteY[1] > s1.sichtSeiteY[1] + 0.02]);
  pruef.push(['Seite: Front folgt gekoppelt (oben)', s2.sichtFrontY[1] > s1.sichtFrontY[1] + 0.02]);
  pruef.push(['Seite: Körper geändert', s2.summe !== s1.summe]);
  pruef.push(['Seite: ein Undo-Schritt', s2.verlauf === s1.verlauf + 1]);
  pruef.push(['Seite: Pose passt (Topologie)', !s2.info || s2.info.passt]);
  await bild(`${id} · Fressen · Seite oben +25 px`);
  // 2) Front: breitester Knoten 20 px nach außen
  const iBreit = await page.evaluate(() => {
    const k = window.__stores.editor.getState().dok.profile.front.knoten;
    let b = 0;
    k.forEach((q, i) => {
      if (Math.abs(q.p.x) > Math.abs(k[b].p.x)) b = i;
    });
    return b;
  });
  const pFront = await mitte(`[data-view="front"] [data-knoten="${iBreit}"] circle.knoten-punkt`);
  if (pFront) await ziehen(pFront, 20, 0);
  const s3 = await stand();
  pruef.push(['Front: Grundform unverändert', s3.basisFront === s0.basisFront]);
  pruef.push(['Front: Sicht breiter', Math.abs(s3.sichtFrontX[1]) > Math.abs(s2.sichtFrontX[1]) + 0.015 || Math.abs(s3.sichtFrontX[0]) > Math.abs(s2.sichtFrontX[0]) + 0.015]);
  pruef.push(['Front: Top folgt gekoppelt', Math.abs(s3.sichtTopY[1]) > Math.abs(s2.sichtTopY[1]) + 0.015 || Math.abs(s3.sichtTopY[0]) > Math.abs(s2.sichtTopY[0]) + 0.015]);
  pruef.push(['Front: Körper geändert', s3.summe !== s2.summe]);
  await bild(`${id} · Fressen · Front breiter`);
  // 3) Maul: roter Anfang (Knoten 0 der Linie „oben“) 12 px nach vorn-unten, falls gezeichnet
  let s4 = s3;
  if (s3.sichtMaul !== 'null') {
    await page.evaluate(() => window.__stores.ui.getState().setzeEbene('maul'));
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__stores.ui.getState().maximieren(null));
    await page.waitForTimeout(1500);
    const pMaul = (await mitte(`[data-view="seite"] [data-maulknoten="oben:0"] circle`)) ?? (await mitte(`[data-view="seite"] [data-maulknoten="oben:0"]`));
    if (pMaul) await ziehen(pMaul, -6, 10);
    s4 = await stand();
    pruef.push(['Maul: Griff gefunden', !!pMaul]);
    pruef.push(['Maul: Linie der Pose geändert', s4.sichtMaul !== s3.sichtMaul]);
    pruef.push(['Maul: Grundform-Linie unverändert', s4.basisMaul === s0.basisMaul]);
    pruef.push(['Maul: Körper geändert', s4.summe !== s3.summe]);
    pruef.push(['Maul: Pose passt (Topologie)', !s4.info || s4.info.passt]);
    await bild(`${id} · Fressen · roter Anfang`);
    await page.evaluate(() => window.__stores.ui.getState().setzeEbene('form'));
    await page.waitForTimeout(800);
  }
  // 4) Editor-Tab: Grundform unverändert (Körper wie vorher)
  await page.locator('button.pille', { hasText: 'Editor' }).first().click();
  await page.waitForTimeout(3000);
  const s5 = await stand();
  pruef.push(['Editor-Tab: Sicht = Grundform', s5.basisSeite === s0.basisSeite && JSON.stringify(s5.sichtSeiteY) === JSON.stringify(s0.sichtSeiteY)]);
  pruef.push(['Editor-Tab: Körper wie vor Fressen', Math.abs((s5.summe ?? 0) - (s0.summe ?? 0)) < 1e-3 * Math.abs(s0.summe ?? 1)]);
  await bild(`${id} · zurück im Editor-Tab`);
  // 5) Undo bis zum Anfang
  const schritte = s4.verlauf - s0.verlauf;
  for (let i = 0; i < schritte; i++) await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
  await page.waitForTimeout(1500);
  const s6 = await stand();
  pruef.push(['Undo: keine Pose-Form mehr', !s6.pose]);
  ergebnisse.push({ id, pruef, blatt: s3.blatt });
  console.log(`— ${id} (Δ Fressen gegen Pose: ${JSON.stringify(s3.blatt)})`);
  for (const [t, ok] of pruef) console.log(`  ${ok ? '✓' : '✗'} ${t}`);
}
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1860px"><div style="display:grid;grid-template-columns:repeat(2,920px);gap:6px;padding:6px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:920px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'fressen-wie-editor.html'), html);
await page.setViewportSize({ width: 1860, height: 900 });
await page.setContent(html);
await page.waitForTimeout(600);
await page.screenshot({ path: resolve(AUSGABE, 'fressen-wie-editor.png'), fullPage: true });
const alle = ergebnisse.flatMap((e) => e.pruef);
console.log(`Prüfungen: ${alle.filter(([, ok]) => ok).length} von ${alle.length}`);
console.log('Bild', resolve(AUSGABE, 'fressen-wie-editor.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
