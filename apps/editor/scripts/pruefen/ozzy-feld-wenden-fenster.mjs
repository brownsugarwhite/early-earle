// Ozzy, S17b im Plan „wie es weitergeht“ (17.11.2026): Wenden je Feld der Vier Ansichten (wie in der Vollansicht), an „strange bird“ (NAME).
// Kriterien:
//   1  ⇧ + Ziehen in der Front um 45°: Die Front staucht sich quer (cos 45°), die Seite bleibt.
//   2  Weiter über 90° und los: Die Front landet auf der Gegenseite: gespiegelt (höchstens 1 px), ganz dunkel; die Seite nicht.
//   3  Ein Punkt der gewendeten Front lässt sich ziehen: Er folgt der Maus (höchstens 1 px).
//   4  ⇧ + Doppelklick im Top: Er wendet ganz (senkrecht gespiegelt, dunkel).
//   5  Tab: erst wenden die Felder zurück (die Kiste bleibt offen, bis beide vorn sind), dann klappt sie zu; wieder auf: nichts dunkel.
//   6  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-feld-wenden-fenster.mjs
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
const ruhig = async () => {
  await s.waitForTimeout(200);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.waitForTimeout(300);
};
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
await ruhig();
await s.mouse.move(1430, 890);
await s.keyboard.press('Tab');
await s.waitForTimeout(1300);
await ruhig();
const F = await O('felderJetzt');
const mitte = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const MF = mitte(F.front);
const MT = mitte(F.top);
const dunkel = (p) => O('dunkelBei', p.x, p.y);
// Bezugsorte: in der Front einer rechts der Mitte, im Top einer unter der Mitte, in der Seite einer
const BF = await O('flaecheHer', 'front', MF.x + 60, MF.y - 40);
const BT = await O('flaecheHer', 'top', MT.x - 80, MT.y + 40);
const BS = await O('flaecheHer', 'seite', F.seite.x + F.seite.w / 2 + 50, F.seite.y + F.seite.h / 2);
const S0 = await O('flaecheHin', 'seite', BS.X, BS.Y);

// 1: ⇧ + Ziehen um 45° (130 px), gehalten
const x0 = Math.round(F.front.x + 30);
const y0 = Math.round(F.front.y + F.front.h - 30);
await s.mouse.move(x0, y0);
await s.keyboard.down('Shift');
await s.mouse.down();
for (let k = 1; k <= 13; k++) {
  await s.mouse.move(x0 + 10 * k, y0);
  await s.waitForTimeout(16);
}
await s.waitForTimeout(100);
const F1 = await O('flaecheHin', 'front', BF.X, BF.Y);
const k1 = (F1.x - MF.x) / 60;
ok('1 ⇧ + Ziehen staucht die Front', Math.abs(k1 - Math.cos(Math.PI / 4)) <= 0.02 && Math.abs(F1.y - (MF.y - 40)) <= 1, `quer ${z2(k1)} (cos 45° = 0,71)`);

// 2: weiter über 90°, los
for (let k = 14; k <= 40; k++) {
  await s.mouse.move(x0 + 10 * k, y0);
  await s.waitForTimeout(16);
}
await s.mouse.up();
await s.keyboard.up('Shift');
await s.waitForTimeout(1000);
const F2 = await O('flaecheHin', 'front', BF.X, BF.Y);
const S2 = await O('flaecheHin', 'seite', BS.X, BS.Y);
const d2 = Math.hypot(F2.x - (MF.x - 60), F2.y - (MF.y - 40));
const dk2 = await dunkel(MF);
const ds2 = await dunkel(mitte(F.seite));
ok('2 Front auf der Gegenseite', d2 <= 1 && dk2 > 0.99 && ds2 === 0 && Math.hypot(S2.x - S0.x, S2.y - S0.y) <= 0.5, `gespiegelt ${z2(d2)} px daneben, Front dunkel ${z2(dk2)}, Seite ${z2(ds2)}`);

// 3: einen Punkt der gewendeten Front ziehen
const L = await O('werkLinienDaten');
let A = null;
for (const l of L)
  for (let i = 0; i < l.punkte.length && !A; i++) {
    const q = (await O('ankerImBild', l.id, i, 'front')).find((v) => v.sichtbar);
    // neben der Mitte (Punkte auf der Mittelebene teilen ihren Anker mit dem Spiegelbild)
    if (q && Math.abs(q.x - MF.x) > 25 && q.x > F.front.x + 30 && q.x < F.front.x + F.front.w - 30 && q.y > F.front.y + 30 && q.y < F.front.y + F.front.h - 30) A = { id: l.id, i, m: q.m, x: q.x, y: q.y };
  }
if (!A) ok('3 Punkt der gewendeten Front ziehen', false, 'kein Punkt');
else {
  await s.mouse.move(A.x, A.y);
  await s.waitForTimeout(300);
  await s.mouse.down();
  for (let k = 1; k <= 10; k++) {
    await s.mouse.move(A.x, A.y - 2 * k);
    await s.waitForTimeout(16);
  }
  await s.waitForTimeout(150);
  await s.mouse.up();
  await ruhig();
  const A1 = (await O('ankerImBild', A.id, A.i, 'front')).find((v) => v.m === A.m);
  const d3 = Math.hypot(A1.x - A.x, A1.y - (A.y - 20));
  ok('3 Punkt der gewendeten Front ziehen', d3 <= 1, `Linie ${A.id}, Punkt ${A.i}: ${z2(d3)} px neben der Maus`);
  await s.keyboard.press('Meta+z');
  await ruhig();
}

// 4: ⇧ + Doppelklick im Top (oben links, frei)
const tx = Math.round(F.top.x + 40);
const ty = Math.round(F.top.y + 30);
await s.mouse.move(tx, ty);
await s.keyboard.down('Shift');
await s.mouse.click(tx, ty);
await s.waitForTimeout(80);
await s.mouse.click(tx, ty);
await s.keyboard.up('Shift');
await s.waitForTimeout(1000);
const T4 = await O('flaecheHin', 'top', BT.X, BT.Y);
const d4 = Math.hypot(T4.x - (MT.x - 80), T4.y - (MT.y - 40));
const dk4 = await dunkel(MT);
ok('4 ⇧ + Doppelklick wendet den Top', d4 <= 1 && dk4 > 0.99, `gespiegelt ${z2(d4)} px daneben, dunkel ${z2(dk4)}`);

// 5: Tab: erst zurückwenden, dann zuklappen; wieder auf
await s.mouse.move(1430, 890);
await s.evaluate(() => window.__ozzy.film(true));
await s.keyboard.press('Tab');
let offenBisVorn = true;
let vornBild = -1;
for (let i = 0; i < 160; i++) {
  await s.evaluate(() => window.__ozzy.bild(1 / 60));
  const b = await O('blick');
  const fv = await O('flaecheHin', 'front', BF.X, BF.Y);
  const vorn = Math.abs(fv.x - (MF.x + 60)) <= 0.5;
  if (vorn && vornBild < 0) vornBild = i;
  if (!vorn && vornBild < 0 && b.vier < 1) offenBisVorn = false;
  if (b.vier === 0) break;
}
await s.evaluate(() => window.__ozzy.film(false));
const b5 = await O('blick');
await s.keyboard.press('Tab');
await s.waitForTimeout(1500);
const dk5 = Math.max(await dunkel(MF), await dunkel(MT));
ok('5 Tab: erst zurückwenden, dann zuklappen', offenBisVorn && vornBild > 0 && b5.vier === 0 && dk5 === 0, `vorn nach ${vornBild} Bildern, Kiste offen bis dahin: ${offenBisVorn}, wieder auf: dunkel ${z2(dk5)}`);
ok('6 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
