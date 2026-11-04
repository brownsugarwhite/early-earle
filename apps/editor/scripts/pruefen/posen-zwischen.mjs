// Stand des B2-Tors (Commit ed3041e): Seit B3 rechnet der Editor nur noch den neuen Weg, `?posen=ruhe` gibt es nicht mehr —
// beide Seiten zeigen dann dasselbe. Für den Vergleich alt/neu den Stand ed3041e auschecken.
// Tor von B2 (Plan Teil B): Kontaktbogen der Zwischenstufen der Fressen-Pose im echten Editor (Earle-Look) — alt (heute:
// Haps mit der Öffnung, Fressen-Deltas nach den Knochen mal Öffnung) gegen neu (`?posen=ruhe`: Ruhe-Deltas vor den
// Knochen). Dokumente aus `posen-tor-b2.ts` (`pruefen-ausgabe/b2-<name>.json`: Prüfstand-Wesen mit Maul, Haps 1 und zwei
// Pinselzügen in der vollen Pose). Je Wesen zwei Zeilen (alt, neu) × Öffnung 0/25/50/75/100 %, Kopf nah.
// Über run-check.sh (eigener Vite, 5192): apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/posen-zwischen.mjs [namen]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const NAMEN = (process.argv[2] ?? 'rex,kasten,drache,langhals,kugel').split(',');
const STUFEN = [0, 0.25, 0.5, 0.75, 1];
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const fehler = [];
const seite = async (zusatz) => {
  const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
  page.on('dialog', (d) => d.accept());
  page.on('pageerror', (e) => fehler.push(String(e)));
  await page.goto(`${url}/?bauweise=kern&look=earle${zusatz}`);
  await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
  return page;
};
const alt = await seite('');
const neu = await seite('&posen=ruhe');
// Kamera auf den Kopf: Mitte der Maullinie, Abstand nach der Körperhöhe (Profil der Seite)
const kameraFuer = (dok) => {
  const sk = dok.skalierung ?? 1;
  const k = dok.maul.zu.oben.knoten;
  const a = k[0].p;
  const e = k[k.length - 1].p;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const kn of dok.profile.seite.knoten) {
    yMin = Math.min(yMin, kn.p.y);
    yMax = Math.max(yMax, kn.p.y);
  }
  const h = (yMax - yMin) * sk;
  // Abstand nach der Maullänge (Kopf füllt das Bild), höchstens nach der Körperhöhe
  const lm = Math.hypot(e[0] - a[0], e[1] - a[1], e[2] - a[2]) * sk;
  return { azimut: (-30 * Math.PI) / 180, elevation: (8 * Math.PI) / 180, distanz: Math.min(3.2 * h, 9 * lm), ziel: [((a[0] + e[0]) / 2) * sk, ((a[1] + e[1]) / 2) * sk - 0.3 * lm, 0] };
};
const warteBau = async (page, vorher) => {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v, vorher, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(900);
};
const bogen = [];
for (const name of NAMEN) {
  const dok = JSON.parse(readFileSync(resolve(AUSGABE, `b2-${name}.json`), 'utf8'));
  const kamera = kameraFuer(dok);
  const zeilen = { alt: [], neu: [] };
  for (const [art, page] of [['alt', alt], ['neu', neu]]) {
    const v0 = await page.evaluate(() => window.__editor.netzVersion());
    await page.evaluate((d) => {
      window.__stores.editor.getState().laden(d, null);
      const ui = window.__stores.ui.getState();
      // Stufe Haut: keine Griffe über dem Körper (die Rig-Griffe in „Posen & Leben“ verdecken kleine Köpfe)
      ui.setzeEbene('haut');
      ui.maximieren('creation');
    }, dok);
    await warteBau(page, v0);
    await page.evaluate(() => window.__stores.editor.getState().setzeZiel('fressen'));
    await page.waitForTimeout(600);
    for (const t of STUFEN) {
      const v = await page.evaluate(() => window.__editor.netzVersion());
      await page.evaluate(({ t, kamera }) => {
        const ui = window.__stores.ui.getState();
        ui.setzeKamera(kamera);
        ui.setzeOeffnung(t);
      }, { t, kamera });
      await warteBau(page, v);
      const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
      const b = await page.screenshot({ clip: { x: rc.x + rc.w * 0.15, y: rc.y + rc.h * 0.12, width: rc.w * 0.7, height: rc.h * 0.76 } });
      const hash = await page.evaluate(() => window.__editor.netzHash());
      const lagen = t === 0 || t === 1 ? await page.evaluate(() => window.__editor.netzLagen()) : null;
      zeilen[art].push({ t, src: `data:image/png;base64,${b.toString('base64')}`, hash, lagen });
    }
  }
  const gleich = STUFEN.map((t, i) => zeilen.alt[i].hash === zeilen.neu[i].hash);
  const abstand = (i) => {
    const a = zeilen.alt[i].lagen;
    const c = zeilen.neu[i].lagen;
    if (!a || !c || a.length !== c.length) return 'Länge verschieden';
    let m = 0;
    for (let k = 0; k < a.length; k++) m = Math.max(m, Math.abs(a[k] - c[k]));
    return m.toExponential(1);
  };
  console.log(`${name}: Netz alt = neu je Öffnung ${STUFEN.map((t, i) => `${t * 100}% ${gleich[i] ? 'gleich' : 'anders'}`).join(', ')}; größte Abweichung bei 0 %: ${abstand(0)}, bei 100 %: ${abstand(STUFEN.length - 1)}`);
  for (const z of [...zeilen.alt, ...zeilen.neu]) delete z.lagen;
  bogen.push({ name, zeilen });
}
const zelle = 300;
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd">
<div style="padding:8px 10px;font-size:15px">B2-Tor · Fressen-Pose, Zwischenstufen · oben je Wesen <b>alt</b> (Deltas nach den Knochen, mit der Öffnung überblendet), darunter <b>neu</b> (Ruhe-Deltas vor den Knochen) · bei 0 % und 100 % gleich</div>
<div style="display:grid;grid-template-columns:90px repeat(${STUFEN.length},${zelle}px);gap:3px;padding:4px">
<div></div>${STUFEN.map((t) => `<div style="text-align:center">${Math.round(t * 100)} %</div>`).join('')}
${bogen.map((b) => ['alt', 'neu'].map((art) => `<div style="display:flex;align-items:center">${b.name}<br>${art}</div>${b.zeilen[art].map((z) => `<img src="${z.src}" style="width:${zelle}px;display:block">`).join('')}`).join('')).join('')}
</div></body></html>`;
const NAME = process.env.NAME ?? 'b2-zwischenstufen';
writeFileSync(resolve(AUSGABE, `${NAME}.html`), html);
const zeige = await browser.newPage({ viewport: { width: 90 + STUFEN.length * (zelle + 3) + 12, height: 800 }, deviceScaleFactor: 1 });
await zeige.setContent(html);
await zeige.waitForTimeout(500);
await zeige.screenshot({ path: resolve(AUSGABE, `${NAME}.png`), fullPage: true });
console.log('Bild', resolve(AUSGABE, `${NAME}.png`));
console.log('Seitenfehler:', fehler.length ? fehler.slice(0, 5) : 'keine');
await browser.close();
