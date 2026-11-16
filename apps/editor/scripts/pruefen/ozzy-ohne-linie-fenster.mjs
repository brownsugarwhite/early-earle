// Ozzy, S9 im Plan „wie es weitergeht“ (16.11.2026): Start ohne Linie an der Spiegelkante (zur Wahl, `?ohneLinie=1`), Beweis.
// Ablauf: ein Fisch (die Form der Probe ozzy-werk-fenster), ↩ bläst auf. Gemessen:
//   1  Nach dem Aufblasen hat das Werk keine Linie; die Haut steht (in 3 s höchstens 0,5 Einheiten bewegt).
//   2  Die erste Linie mit P (gerade quer in der Seite, ↩): ein Ring; die Haut steht weiter (ohne Kreuzung setzt das Werk sie nicht).
//   3  Der erste Zug an dem Ring (ein Punkt 10 px nach oben): wie weit sich die Haut bewegt (so rechnet Sitzung 4: aus einer einzigen
//      Linie die ganze Haut). Kein Kriterium, nur gemessen.
//   4  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 node scripts/pruefen/ozzy-ohne-linie-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await s.goto(`${basis}?ohneLinie=1`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const bild = async (n) => {
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-ohne-linie-${n}.png` });
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => x.toFixed(2).replace('.', ',');
const ruhig = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.waitForTimeout(300);
};
await s.evaluate(() => {
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  window.__ozzy.form([
    { x: cx - 170, y: cy },
    { x: cx - 50, y: cy - 95, ein: [-70, 0], aus: [70, 0] },
    { x: cx + 100, y: cy - 22 },
    { x: cx + 175, y: cy - 82 },
    { x: cx + 160, y: cy + 70 },
    { x: cx + 100, y: cy + 22 },
    { x: cx - 50, y: cy + 88, ein: [70, 0], aus: [-70, 0] },
  ]);
});
await s.waitForTimeout(400);
await s.keyboard.press('Enter');
await s.waitForFunction(() => window.__ozzy.werk().gezeigt, null, { timeout: 90000 });
await ruhig();
await s.waitForTimeout(1500);
await ruhig();
const L0 = await O('werkLinienDaten');
await O('hautMerken');
await s.waitForTimeout(3000);
const v1 = await O('hautVersatz');
await bild('1-ohne-linie');
ok('1 nach dem Aufblasen keine Linie, die Haut steht', L0.length === 0 && v1 >= 0 && v1 <= 0.5, `Linien ${L0.length}, Haut in 3 s ${z2(v1)} bewegt`);
// 2 die erste Linie mit P: gerade quer in der Seite
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
const cx = 720;
const cy = 450;
await s.keyboard.press('p');
await s.waitForTimeout(300);
for (const x of [cx - 380, cx + 380]) {
  await s.mouse.move(x, cy - 10);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
}
await s.keyboard.press('Enter');
await ruhig();
await s.keyboard.press('v');
const L1 = await O('werkLinienDaten');
await O('hautMerken');
await s.waitForTimeout(3000);
const v2 = await O('hautVersatz');
await bild('2-erste-linie');
ok('2 die erste Linie mit P: ein Ring, die Haut steht weiter', L1.length === 1 && v2 >= 0 && v2 <= 0.5, `Linien ${L1.length}${L1[0] ? ` (${L1[0].art}, ${L1[0].punkte.length} Punkte)` : ''}, Haut in 3 s ${z2(v2)} bewegt`);
// 3 der erste Zug an dem Ring
let v3 = NaN;
if (L1[0]) {
  const p = L1[0].punkte.find((q) => q.sichtbar) ?? L1[0].punkte[0];
  const a = (await O('ankerImBild', L1[0].id, p.i, 'seite')).find((q) => !q.m);
  if (a) {
    await O('hautMerken');
    await s.mouse.move(a.x, a.y);
    await s.waitForTimeout(400);
    await s.mouse.down();
    for (let k = 1; k <= 10; k++) {
      await s.mouse.move(a.x, a.y - k);
      await s.waitForTimeout(30);
    }
    await s.waitForTimeout(200);
    await s.mouse.up();
    await ruhig();
    v3 = await O('hautVersatz');
    await bild('3-erster-zug');
  }
}
console.log(`     3 der erste Zug am Ring (10 px): die Haut bewegt sich bis ${Number.isFinite(v3) ? z2(v3) : '–'} Einheiten (−1: das Netz hat sich geändert)`);
ok('4 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
