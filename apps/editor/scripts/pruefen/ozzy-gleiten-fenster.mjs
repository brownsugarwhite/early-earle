// Ozzy, S21 im Plan „wie es weitergeht“ (17.11.2026): Kanten gleiten statt auszublenden, an „strange bird“ (NAME). Der Raum wird Bild für
// Bild um die Hochachse gedreht (je Bild rund 2°), über die Ebene der Front hinweg; dann Tab.
// Kriterien:
//   1  Die Wand der Front gleitet stetig auf die andere Seite: kein Sprung (höchstens 0,5 L je Bild, vorher 2 L in einem Bild), der Weg
//      dauert mindestens 6 Bilder; vor und nach dem Weg liegt sie genau bei ±L.
//   2  Keine Linie wird blasser, nur schmaler: Die Breite der Front fällt nie unter 25 % und ist vor und nach dem Weg voll.
//   3  Die Punkte der Front bleiben zu sehen (sie schrumpfen mit der Wand, statt zu verschwinden).
//   4  Beim Aufklappen keine zweiten Linien neben den Kanten (keine Linie außerhalb aller Wände, so liefen die alten Teiler quer durchs
//      Bild); offen die beiden Teiler.
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-gleiten-fenster.mjs
import { chromium } from '@playwright/test';

const NAME = process.env.NAME ?? 'strange bird';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => x.toFixed(2).replace('.', ',');
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
await s.waitForTimeout(500);
await s.mouse.move(150, 790);
await s.evaluate(() => window.__ozzy.film(true));
await s.evaluate(() => window.__ozzy.bild(1 / 60));
const L = (await O('gleiten')).L;
await s.mouse.down();
const verlauf = [];
let x = 150;
// von der Hausansicht (Gier 40°) bis Gier −30°: über die Ebene der Front (Gier 0°)
for (let k = 0; k < 36; k++) {
  x += 6;
  await s.mouse.move(x, 790);
  await s.evaluate(() => window.__ozzy.bild(1 / 60));
  const g = await O('gleiten');
  verlauf.push({ lage: g.lage[0], breite: g.breite[0], punkte: await O('wandPunkte', 'front') });
}
await s.mouse.up();
let sprung = 0;
for (let i = 1; i < verlauf.length; i++) sprung = Math.max(sprung, Math.abs(verlauf[i].lage - verlauf[i - 1].lage));
const unterwegs = verlauf.filter((v) => Math.abs(Math.abs(v.lage - verlauf[0].lage + (verlauf[0].lage > 0 ? 0 : 0)) ) > 0 && Math.abs(Math.abs(v.lage) - L) > 1e-6 && Math.abs(v.lage) < L - 1e-6).length;
const vorn = verlauf[0];
const hinten = verlauf[verlauf.length - 1];
const seitenGetauscht = Math.sign(vorn.lage) !== Math.sign(hinten.lage);
ok(
  '1 die Front gleitet stetig auf die andere Seite',
  seitenGetauscht && sprung <= 0.5 * L && unterwegs >= 6 && Math.abs(Math.abs(vorn.lage) - L) < 1e-6 && Math.abs(Math.abs(hinten.lage) - L) < 1e-6,
  `größter Schritt ${z2(sprung / L)} L, ${unterwegs} Bilder unterwegs, vorher ${z2(vorn.lage / L)} L, nachher ${z2(hinten.lage / L)} L`,
);
const minBreite = Math.min(...verlauf.map((v) => v.breite));
ok('2 nur schmaler, nie blasser', minBreite >= 0.25 - 1e-6 && vorn.breite === 1 && hinten.breite === 1, `schmalste Breite ${z2(minBreite)}, vorher ${z2(vorn.breite)}, nachher ${z2(hinten.breite)}`);
const minPunkte = Math.min(...verlauf.map((v) => v.punkte));
ok('3 die Punkte der Front bleiben zu sehen', vorn.punkte > 0 && minPunkte >= Math.min(vorn.punkte, hinten.punkte) * 0.5, `vorher ${vorn.punkte}, unterwegs mindestens ${minPunkte}, nachher ${hinten.punkte}`);

// 4: Aufklappen
await s.evaluate(() => window.__ozzy.film(false));
await s.mouse.move(1430, 890);
await s.waitForTimeout(400);
await s.evaluate(() => window.__ozzy.film(true));
await s.keyboard.press('Tab');
let langWaehrend = 0;
let bilderWaehrend = 0;
for (let i = 0; i < 120; i++) {
  await s.evaluate(() => window.__ozzy.bild(1 / 60));
  const b = await O('blick');
  // gezählt, solange die Wände klappen (der geglättete Stand unter 0,999; darüber zeichnet Ozzy die Felder mit ihren Teilern)
  const stand = (await O('faltPunkte'))?.e ?? 0;
  if (b.vier > 0.02 && stand < 0.999) {
    bilderWaehrend++;
    langWaehrend = Math.max(langWaehrend, await O('langeKapseln'));
  }
  if (b.vier >= 1) break;
}
await s.evaluate(() => window.__ozzy.bild(1 / 60));
const langOffen = await O('langeKapseln');
ok('4 Aufklappen ohne zweite Linien', bilderWaehrend > 5 && langWaehrend === 0 && langOffen >= 1, `${bilderWaehrend} Bilder: höchstens ${langWaehrend} Linien außerhalb der Wände, offen ${langOffen} Teiler`);
ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
