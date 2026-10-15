// Schädelgelenk als Griff (Plan 5.2, 15.10. früh): Rex aus der Library, Stufe „Posen & Leben“, Öffnung 100 %; den dunklen
// Griff an der Basis des Schädelknochens in der Seite 40 px nach hinten und 20 px nach oben ziehen — Dokument
// (`maulOptionen.schaedelGelenk`), Knochen im Netz, keine neue Ableitung, ein Undo-Schritt; Bilder vorher/nachher.
// Über run-check.sh (eigener Vite, 5192).
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
await page.click('[data-pruefwesen="rex"]');
await page.waitForTimeout(3500);
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('posen');
  ui.maximieren(null);
  ui.setzeOeffnung(1);
  ui.setzeBlinzeln(false);
});
await page.waitForTimeout(3000);
const stand = () =>
  page.evaluate(() => {
    const w = window.__editor.wesen();
    return { versatz: window.__stores.editor.getState().dok.ausstattung?.maulOptionen?.schaedelGelenk ?? null, schaedel: w?.maul?.knochen?.schaedel ?? null, ableitung: w?.ableitung ?? null, verlauf: window.__stores.editor.getState().verlauf.length };
  });
const griff = async (art) => {
  const el = await page.$(`[data-view="seite"] [data-kiefergriff="${art}"]`);
  if (!el) return null;
  const b = await el.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const bild = async () => {
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects);
  const r = rc.seite;
  const png = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  return `data:image/png;base64,${png.toString('base64')}`;
};
const s0 = await stand();
console.log('vorher', JSON.stringify(s0));
const b0 = await bild();
const g = await griff('schaedel-gelenk');
console.log('Griff:', JSON.stringify(g));
let s1 = null;
if (g) {
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(g.x + 5 * i, g.y - 2.5 * i);
    await page.waitForTimeout(80);
  }
  await page.mouse.up();
  await page.waitForTimeout(1500);
  s1 = await stand();
  console.log('nach dem Zug', JSON.stringify(s1));
}
const b1 = await bild();
await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
await page.waitForTimeout(1200);
const s2 = await stand();
console.log('nach Undo', JSON.stringify(s2));
const pruef = [
  ['Griff da', !!g],
  ['Versatz im Dokument', !!s1?.versatz && (s1.versatz[0] !== 0 || s1.versatz[1] !== 0)],
  ['Knochen im Netz gewandert', !!s1 && !!s0.schaedel && Math.hypot(s1.schaedel.x - s0.schaedel.x, s1.schaedel.y - s0.schaedel.y) > 1e-4],
  ['keine neue Ableitung', !!s1 && s1.ableitung === 0],
  ['ein Undo-Schritt zurück', !!s1 && s2.verlauf === s1.verlauf - 1 && (!s2.versatz || (s2.versatz[0] === 0 && s2.versatz[1] === 0))],
];
for (const [t, ok] of pruef) console.log(ok ? '✓' : '✗', t);
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd"><div style="display:flex;gap:6px;padding:6px"><div><div>vorher</div><img src="${b0}" style="width:600px"></div><div><div>Schädelgelenk gezogen (Öffnung 100 %)</div><img src="${b1}" style="width:600px"></div></div></body></html>`;
writeFileSync(resolve(AUSGABE, 'schaedel-gelenk.html'), html);
await page.setViewportSize({ width: 1240, height: 700 });
await page.setContent(html);
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(AUSGABE, 'schaedel-gelenk.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'schaedel-gelenk.png'));
console.log('Seitenfehler:', fehler.length ? fehler : 'keine');
await browser.close();
