// Tafel „Augen“ mit Glubschauge (Phase 2 M5, Schritt 2) im normalen Editor: Kugel aus der Library, Stufe Augen, Chip
// „Glubsch“ (ohne eigene Form wird es ein Knopf), Tiefe 20 % und 70 % (die Kugel rückt längs der Normalen), Rand der Kugel
// greifen und ziehen (Größe), Undo zurück bis „gemalt“, Klick auf den Körper setzt das Auge neu. Je Schritt Dokument,
// Lage der Kugel aus dem Renderer und Bild. Über run-check.sh (eigener Vite, 5192).
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
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(400);
await page.click('[data-pruefwesen="kugel"]');
await page.waitForTimeout(3200);
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('augen');
  ui.setzeBlinzeln(false);
  ui.setzeKamera({ azimut: (-60 * Math.PI) / 180, elevation: (10 * Math.PI) / 180, distanz: 1.3, ziel: [0, 0.25, 0] });
});
await page.waitForTimeout(1500);

const stand = () =>
  page.evaluate(() => {
    const ed = window.__stores.editor.getState();
    const a = ed.dok.ausstattung?.augen ?? null;
    const w = window.__editor.wesen();
    const g = window.__editor.griffe().augen;
    return {
      dok: a,
      art: document.querySelector('[data-augen-art].aktiv')?.getAttribute('data-augen-art'),
      tiefe: w.augen[0]?.tiefe,
      groesse: w.augen[0] ? +w.augen[0].groesse.toFixed(4) : null,
      griff: g[0] ? { px: Math.round(g[0].px), py: Math.round(g[0].py), radius: +g[0].radius.toFixed(1) } : null,
      ableitung: w.ableitung,
    };
  });
const regler = async (label, wert) => {
  await page.evaluate(
    ({ label, wert }) => {
      const l = [...document.querySelectorAll('[data-bereich="augen"] label.regler')].find((x) => x.querySelector('span')?.textContent === label);
      const el = l.querySelector('input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(wert));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    { label, wert },
  );
  await page.waitForTimeout(1200);
};
const bilder = [];
const bild = async (text) => {
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  const png = await page.screenshot({ clip: { x: r.x + r.w * 0.2, y: r.y + r.h * 0.12, width: r.w * 0.6, height: r.h * 0.76 } });
  bilder.push({ src: `data:image/png;base64,${png.toString('base64')}`, text });
};
const protokoll = [];
const schritt = async (text) => {
  const s = await stand();
  protokoll.push({ text, ...s });
  console.log(text, JSON.stringify(s));
  await bild(text);
  return s;
};

const s0 = await schritt('Start (gemalt)');
await page.click('[data-augen-art="glubsch"]');
await page.waitForTimeout(1500);
const s1 = await schritt('Chip Glubsch');
const tiefeSichtbar = await page.evaluate(() => [...document.querySelectorAll('[data-bereich="augen"] label.regler span')].some((x) => x.textContent === 'Tiefe'));
console.log('Regler Tiefe sichtbar:', tiefeSichtbar);
await regler('Tiefe', 0.2);
const s2 = await schritt('Tiefe 20 %');
await regler('Tiefe', 0.7);
const s3 = await schritt('Tiefe 70 %');
// Rand der Kugel greifen (rechts am Griffkreis) und 25 px nach außen ziehen
const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
const g = s3.griff;
const x0 = rc.x + g.px + g.radius;
const y0 = rc.y + g.py;
await page.mouse.move(x0, y0);
await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(x0 + 2.5 * i, y0, { steps: 1 });
await page.mouse.up();
await page.waitForTimeout(1500);
const s4 = await schritt('Rand 25 px gezogen');
// Undo: Rand, Tiefe 70, Tiefe 20, Chip
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('Meta+z');
  await page.waitForTimeout(700);
}
await page.waitForTimeout(800);
const s5 = await schritt('4 × Undo');
// Klick auf den Körper: das Auge wandert (Art bleibt), als Glubsch erneut
await page.click('[data-augen-art="glubsch"]');
await page.waitForTimeout(1200);
await page.mouse.click(rc.x + rc.w * 0.47, rc.y + rc.h * 0.36);
await page.waitForTimeout(1500);
const s6 = await schritt('Glubsch, Klick setzt neu');

const pruef = [
  ['Start gemalt, keine Ausstattung', s0.art === 'gemalt' && s0.dok === null],
  ['Chip: art glubsch, Form Knopf, Tiefe 0,42', s1.dok?.art === 'glubsch' && s1.dok?.form === 'knopf' && s1.tiefe === 0.42],
  ['Regler Tiefe nur beim Glubschauge', tiefeSichtbar],
  ['Tiefe 20 % im Dokument und im Bau', s2.dok?.tiefe === 0.2 && s2.tiefe === 0.2],
  ['Tiefe 70 %', s3.dok?.tiefe === 0.7 && s3.tiefe === 0.7],
  ['Rand ziehen macht das Auge größer', s4.dok && s4.dok.groesse > (s3.dok?.groesse ?? 0.11) * 1.05],
  ['Undo zurück zu gemalt', s5.art === 'gemalt' && (s5.dok === null || (s5.dok.art ?? 'gemalt') === 'gemalt')],
  ['Klick setzt Punkt, Art bleibt glubsch', !!s6.dok?.punkt && s6.dok?.art === 'glubsch'],
  ['keine neue Ableitung durch Augen', protokoll.every((p) => p.ableitung === protokoll[0].ableitung || p.ableitung === 0)],
];
for (const [t, ok] of pruef) console.log(ok ? '✓' : '✗', t);
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd;width:1850px">
<div style="display:grid;grid-template-columns:repeat(4,452px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.text}</div><img src="${b.src}" style="width:452px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'augen-tafel.html'), html);
await page.setViewportSize({ width: 1850, height: 900 });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(AUSGABE, 'augen-tafel.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'augen-tafel.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
