// Abnahme Phase 2 M4 (Plan: „Rex mit 14 Zähnen in 10 min“) als Skript im normalen Editor, in Florians Schritten:
// Library-Rex → Stufe Zähne → Anzahl oben 8, unten 6 (Stepper) → Maul öffnen, einen unteren Zahn anklicken und längs des
// Zahnfleischs ziehen → Form für alle (Krümmung, Schärfe) → offen größer (Riesenzähne) → Prüfung, Vorschläge anwenden bis
// frei → Bilder zu und offen neben `rex_mouth_detail` und Bogen 06. Über run-check.sh (eigener Vite, 5192).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
await page.click('[data-pruefwesen="rex"]');
await page.waitForTimeout(3500);
// Stufe Zähne über den Stamm (⌘3)
await page.keyboard.press('Meta+3');
await page.waitForTimeout(800);
log('Stufe', await page.evaluate(() => window.__stores.ui.getState().ebene));

let zuletzt = await page.evaluate(() => window.__stores.zahnPruefung.getState().fertig);
const warte = async () => {
  await page.waitForFunction(
    (z) => {
      const p = window.__stores.zahnPruefung.getState();
      return p.fertig > z && !p.laeuft && p.dok === window.__stores.editor.getState().dok;
    },
    zuletzt,
    { timeout: 30_000 },
  );
  zuletzt = await page.evaluate(() => window.__stores.zahnPruefung.getState().fertig);
  await page.waitForTimeout(200);
};
const regler = async (label, wert) => {
  await page.evaluate(
    ({ label, wert }) => {
      const l = [...document.querySelectorAll('[data-bereich="zaehne"] label.regler')].find((x) => x.querySelector('span')?.textContent === label);
      const el = l.querySelector('input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(wert));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    { label, wert },
  );
  await page.waitForTimeout(700);
};

// 1. Anzahl: oben 12 → 8, unten 10 → 6
for (let i = 0; i < 4; i++) {
  await page.click('[data-zahn-weniger="oben"]');
  await page.waitForTimeout(250);
  await page.click('[data-zahn-weniger="unten"]');
  await page.waitForTimeout(250);
}
await page.waitForTimeout(1200);
log('Anzahl', await page.evaluate(() => `${document.querySelector('[data-zahnanzahl="oben"]').textContent}/${document.querySelector('[data-zahnanzahl="unten"]').textContent}`), 'gebaut', await page.evaluate(() => window.__editor.zahnPixel().length));

// 2. Maul öffnen, unteren Zahn anklicken und ziehen
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeOeffnung(1);
  ui.setzeKamera({ azimut: (-60 * Math.PI) / 180, elevation: (25 * Math.PI) / 180, distanz: 0.7, ziel: [-0.24, 0.21, 0.04] });
});
await page.waitForTimeout(2000);
const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
const zaehne = await page.evaluate(() => window.__editor.zahnPixel());
const unten = zaehne.filter((q) => q.kiefer === 'unten' && q.seite === 1).sort((a, b) => a.u - b.u);
// ein unterer Zahn, den der Strahl trifft (nicht hinter der Lippe), wie Florian ihn sehen würde
let a = null;
for (const q of unten) {
  const t = await page.evaluate(({ x, y }) => window.__editor.zahnTreffer(x, y), q);
  if (t.zahn && (t.koerper === null || t.koerper > t.zahn.abstand - 0.004)) {
    a = q;
    break;
  }
}
const b = unten[unten.indexOf(a) + 1] ?? unten[unten.indexOf(a) - 1];
log('Zahn zum Ziehen', JSON.stringify(a), '→ Richtung', JSON.stringify(b));
await page.mouse.move(rc.x + a.x, rc.y + a.y);
await page.mouse.down();
for (let k = 1; k <= 8; k++) await page.mouse.move(rc.x + a.x + ((b.x - a.x) * k) / 24, rc.y + a.y + ((b.y - a.y) * k) / 24);
await page.mouse.up();
await page.waitForTimeout(1200);
log('gezogen: Auswahl', JSON.stringify(await page.evaluate(() => window.__stores.ui.getState().zahnAuswahl)), 'u unten', JSON.stringify(await page.evaluate(() => window.__stores.editor.getState().dok.zaehne.unten.zaehne.map((e) => +e.u.toFixed(3)))));

// 3. Form für alle: Auswahl aufheben, Krümmung 35 %, Schärfe 85 %
await page.evaluate(() => window.__stores.ui.getState().setzeZahnAuswahl(null));
await page.waitForTimeout(300);
await page.click('[data-zahn-mehr-werte]');
await page.waitForTimeout(200);
await page.click('[data-zahn-werte="zu"]');
await regler('Krümmung', 0.35);
await regler('Schärfe', 0.85);
// 4. offen größer: Werte für offen, Größe × 1,8 (Riesenzähne)
await page.click('[data-zahn-werte="offen"]');
await regler('Größe', 1.8);
log('Form gesetzt');

// 5. Prüfung: Vorschläge anwenden, bis alle frei (höchstens 6 Runden)
for (let runde = 0; runde < 6; runde++) {
  await warte();
  const n = await page.evaluate(() => Number(document.querySelector('[data-zahn-befunde]').getAttribute('data-zahn-befunde')));
  const zeilen = await page.evaluate(() => [...document.querySelectorAll('[data-zahn-befund]')].map((e) => e.textContent.slice(0, 120)));
  log(`Prüfung Runde ${runde + 1}: ${n} Befunde`, JSON.stringify(zeilen));
  if (!n) break;
  await page.click('[data-zahn-vorschlag$=":0"]');
  await page.waitForTimeout(600);
}
const dok = await page.evaluate(() => window.__stores.editor.getState().dok.zaehne);
log('Dokument: oben', dok.oben.anzahl, 'unten', dok.unten.anzahl, 'Längen oben zu/offen', JSON.stringify(dok.oben.zaehne.map((e) => `${(e.laenge * 461).toFixed(1)}/${((e.auf?.laenge ?? e.laenge) * 461 * (e.auf?.groesse ?? e.groesse ?? 1)).toFixed(1)}`)));
const dauer = (Date.now() - t0) / 1000;

// 6. Bilder: zu und offen, Seite schräg und von vorn unten
const bilder = [];
for (const [oe, az, el, d] of [
  [0, -55, 8, 0.9],
  [0, -90, -8, 0.9],
  [1, -55, 12, 0.9],
  [1, -90, -10, 0.9],
]) {
  await page.evaluate(({ oe, az, el, d }) => {
    const ui = window.__stores.ui.getState();
    ui.setzeZahnAuswahl(null);
    ui.setzeOeffnung(oe);
    ui.setzeKamera({ azimut: (az * Math.PI) / 180, elevation: (el * Math.PI) / 180, distanz: d, ziel: [-0.25, 0.23, 0] });
  }, { oe, az, el, d });
  await page.waitForTimeout(1800);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x + r.w * 0.15, y: r.y + r.h * 0.12, width: r.w * 0.7, height: r.h * 0.76 } });
  bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text: `Rex · 14 Zähne · offen ${Math.round(oe * 100)} %` });
}
const ref = (p) => `data:image/png;base64,${readFileSync(resolve(WURZEL, p)).toString('base64')}`;
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1840px">
<div style="padding:6px">Abnahme Phase 2 M4 · Rex mit 14 Zähnen (oben 8, unten 6) · Skriptlauf ${dauer.toFixed(0)} s · Prüfung frei</div>
<div style="display:flex;gap:6px;padding:6px"><img src="${ref('ref/editor/creatures/rex_mouth_detail.png')}" style="height:300px"><img src="${ref('docs/look/editor/06-rex-mit-maul.png')}" style="height:300px"></div>
<div style="display:grid;grid-template-columns:repeat(4,452px);gap:4px;padding:4px">${bilder.map((x) => `<div><div style="padding:3px">${x.text}</div><img src="${x.src}" style="width:452px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'zahn-abnahme.html'), html);
await page.setViewportSize({ width: 1840, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'zahn-abnahme.png'), fullPage: true });
log(`Skriptlauf bis zur Prüfung ${dauer.toFixed(1)} s; Bild`, resolve(AUSGABE, 'zahn-abnahme.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
