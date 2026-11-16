// Ozzy, S4 im Plan „wie es weitergeht“ (16.11.2026): Drehen und Einrasten in jeder Ansicht, an „strange bird“ (NAME).
// Kriterien:
//   1  Raum → nahe der Seite gedreht und losgelassen: Die Seite rastet ein (genau parallel), der Maßstab bleibt (±2 %).
//   2  In der eingerasteten Seite ins Leere gezogen: Sie löst sich und dreht (die Drehung folgt der Maus); nahe der Front losgelassen:
//      die Front rastet ein.
//   3  Gegenseiten: nahe der Front von hinten und der Seite von rechts rastet es dort ein, gewendet.
//   4  Schwung: kurz angeschoben, bevor die Ansicht erreicht ist; der Schwung trägt hinein, und sie rastet ein.
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-ansichten-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'strange bird';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
await s.waitForTimeout(500);
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const grad = (r) => (r * 180) / Math.PI;
const z1 = (x) => x.toFixed(1).replace('.', ',');
const lage = (b) => `${b.ansicht}${b.gewendet ? ' gewendet' : ''}, flach ${z1(b.flach)}, Gier ${z1(grad(b.gier))}°, Neigung ${z1(grad(b.neigung))}°`;
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-ansichten-${name}.png` });
};
/** ins Leere ziehen (unten rechts, dort liegt nichts), Schritte mit Pause; zurück: der Blick während des Zugs (Mitte) */
const ziehe = async (dx, dy, n = 30, ms = 30, halten = 200) => {
  const x0 = 1300;
  const y0 = 820;
  await s.mouse.move(x0, y0);
  await s.waitForTimeout(120);
  await s.mouse.down();
  let mitte = null;
  for (let k = 1; k <= n; k++) {
    await s.mouse.move(x0 + (dx * k) / n, y0 + (dy * k) / n);
    await s.waitForTimeout(ms);
    if (k === Math.round(n / 2)) mitte = await O('blick');
  }
  await s.waitForTimeout(halten);
  await s.mouse.up();
  await s.waitForTimeout(1300);
  return mitte;
};
/** so ziehen, dass Gier und Neigung von Hand bei (Grad) landen */
const zu = async (gZiel, nZiel, opt = {}) => {
  const b = await O('blick');
  const px = (-((gZiel * Math.PI) / 180 - b.gier) * 520) / Math.PI;
  const py = (((nZiel * Math.PI) / 180 - b.neigung) * 520) / Math.PI;
  return ziehe(px, py, opt.n, opt.ms, opt.halten);
};
// die Kamera steht im Raum bei Gier 40°, Neigung 24°: Die Seite ist Gier von Hand −40°, Neigung −24°
const G0 = -40;
const N0 = -24;
const b0 = await O('blick');
await bild('1-raum');
await zu(G0 + 3, N0);
const b1 = await O('blick');
await bild('2-seite');
ok('1 Raum → nahe der Seite gedreht: die Seite rastet ein, der Maßstab bleibt', b1.ansicht === 'seite' && !b1.gewendet && b1.flach > 0.99 && Math.abs(b1.massstab / b0.massstab - 1) <= 0.02, `${lage(b1)}, Maßstab ${b0.massstab.toFixed(3)} → ${b1.massstab.toFixed(3)}`);
const m2 = await zu(G0 - 90 + 2, N0);
const b2 = await O('blick');
await bild('3-front');
ok('2 aus der Seite heraus gedreht (im Zug gelöst, die Drehung folgt), nahe der Front: die Front rastet ein', !!m2 && m2.ansicht === 'raum' && Math.abs(grad(m2.gier) - G0) > 20 && b2.ansicht === 'front' && b2.flach > 0.99, `im Zug ${m2 ? lage(m2) : '–'}; danach ${lage(b2)}`);
await zu(G0 + 90 - 3, N0 + 2);
const b3a = await O('blick');
await bild('4-front-hinten');
await zu(G0 + 180 + 2, N0);
const b3b = await O('blick');
await bild('5-seite-rechts');
ok('3 Gegenseiten: Front von hinten und Seite von rechts rasten gewendet ein', b3a.ansicht === 'front' && b3a.gewendet && b3a.flach > 0.99 && b3b.ansicht === 'seite' && b3b.gewendet && b3b.flach > 0.99, `${lage(b3a)}; ${lage(b3b)}`);
// Schwung: aus der Seite von rechts kurz Richtung Seite (links) anschieben, nur 60 % des Wegs gezogen, schnell
{
  await zu(G0 + 180 - 60, N0);
  const b = await O('blick');
  const rest = ((G0 + 90) * Math.PI) / 180 - b.gier;
  const px = (-(rest * 0.55) * 520) / Math.PI;
  await ziehe(px, 0, 6, 16, 0);
  const b4 = await O('blick');
  ok('4 Schwung: kurz angeschoben, die Front von hinten rastet ein', b4.ansicht === 'front' && b4.gewendet && b4.flach > 0.99, `vor dem Anschieben ${lage(b)}; danach ${lage(b4)}`);
}
ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
