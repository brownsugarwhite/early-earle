// Ozzy, S21 im Plan „wie es weitergeht“ (17.11.2026): Kanten gleiten statt auszublenden, an „strange bird“ (NAME). Der Raum wird Bild für
// Bild um die Hochachse gedreht (je Bild rund 2°), über die Ebene der Front hinweg; dann Tab.
// Kriterien (Florian, 17.11. nach dem ersten Stand: „die linien sollen immer an den wänden bleiben“):
//   1  Die Zeichnung der Front bleibt immer an einer Wand (in jedem Bild bei ±L) und wechselt die Seite nur, wenn sie ganz schmal ist
//      (Breite höchstens 0,05 beim Wechsel).
//   2  Die Kanten der Ecke gleiten stetig an den Wänden entlang zur neuen Ecke (kein Sprung: höchstens 0,5 L je Bild; nie außerhalb der
//      Kiste), unterwegs schmaler, aber nie unter 25 %.
//   3  Keine Linie wird blasser, nur schmaler: Vor und nach dem Weg ist alles voll.
//   4  Die Punkte der Front schrumpfen mit ihr, statt zu verschwinden: vorher und nachher gleich viele, unterwegs gezeichnet, solange die
//      Zeichnung mehr als 5 % breit ist.
//   5  Beim Aufklappen keine zweiten Linien neben den Kanten (keine Linie außerhalb aller Wände); die Kreuzung beginnt an der Ecke, wo
//      die Kanten im Raum gerade sind (höchstens 2 px); offen die beiden Teiler.
//   6  Keine Fehler in der Konsole.
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
  verlauf.push({ wand: g.wandLage[0] - g.cx, wandBreite: g.wandBreite[0], ecke: g.lage[0] - g.cx, kante: g.breite[0], punkte: await O('wandPunkte', 'front') });
}
await s.mouse.up();
const vorn = verlauf[0];
const hinten = verlauf[verlauf.length - 1];
let anWand = true;
let wechselBreite = 0;
for (let i = 0; i < verlauf.length; i++) {
  if (Math.abs(Math.abs(verlauf[i].wand) - L) > 1e-6) anWand = false;
  if (i > 0 && Math.sign(verlauf[i].wand) !== Math.sign(verlauf[i - 1].wand)) wechselBreite = Math.max(wechselBreite, verlauf[i].wandBreite, verlauf[i - 1].wandBreite);
}
ok('1 die Zeichnung bleibt an einer Wand', anWand && Math.sign(vorn.wand) !== Math.sign(hinten.wand) && wechselBreite <= 0.05, `immer bei ±L: ${anWand}, Breite beim Wechsel ${z2(wechselBreite)}`);
let sprung = 0;
for (let i = 1; i < verlauf.length; i++) sprung = Math.max(sprung, Math.abs(verlauf[i].ecke - verlauf[i - 1].ecke));
const drin = verlauf.every((v) => Math.abs(v.ecke) <= L + 1e-6);
const minKante = Math.min(...verlauf.map((v) => v.kante));
ok('2 die Kanten gleiten an den Wänden entlang', sprung <= 0.5 * L && drin && minKante >= 0.25 - 1e-6 && Math.sign(vorn.ecke) !== Math.sign(hinten.ecke), `größter Schritt ${z2(sprung / L)} L, in der Kiste: ${drin}, schmalste Kante ${z2(minKante)}`);
ok('3 nur schmaler, nie blasser', vorn.wandBreite === 1 && hinten.wandBreite === 1 && vorn.kante === 1 && hinten.kante === 1, `vorher ${z2(vorn.wandBreite)}, nachher ${z2(hinten.wandBreite)}`);
const breit = verlauf.filter((v) => v.wandBreite > 0.05);
ok('4 die Punkte schrumpfen mit', vorn.punkte > 0 && vorn.punkte === hinten.punkte && breit.every((v) => v.punkte === vorn.punkte), `vorher ${vorn.punkte}, nachher ${hinten.punkte}, unterwegs (breiter als 5 %) mindestens ${Math.min(...breit.map((v) => v.punkte))}`);

// 4: Aufklappen
await s.evaluate(() => window.__ozzy.film(false));
await s.mouse.move(1430, 890);
await s.waitForTimeout(400);
await s.evaluate(() => window.__ozzy.film(true));
await s.keyboard.press('Tab');
let langWaehrend = 0;
let bilderWaehrend = 0;
let anfang = null;
for (let i = 0; i < 120; i++) {
  await s.evaluate(() => window.__ozzy.bild(1 / 60));
  const b = await O('blick');
  if (!anfang && b.vier > 1e-3) {
    const e = await O('eck');
    const r = await O('eckeImRaum');
    if (e.bild && r) anfang = Math.hypot(e.bild[0] - r[0], e.bild[1] - r[1]);
  }
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
ok('5 Aufklappen ohne zweite Linien, von der Ecke aus', bilderWaehrend > 5 && langWaehrend === 0 && langOffen >= 1 && anfang !== null && anfang <= 2, `${bilderWaehrend} Bilder: höchstens ${langWaehrend} Linien außerhalb der Wände, offen ${langOffen} Teiler; Kreuzung am Anfang ${anfang === null ? '–' : z2(anfang)} px neben der Ecke im Raum`);
ok('6 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
