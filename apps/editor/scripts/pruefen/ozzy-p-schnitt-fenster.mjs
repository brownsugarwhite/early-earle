// Ozzy, S8 im Plan „wie es weitergeht“ (16.11.2026): P statt L, an „strange bird“ (NAME), in der eingerasteten Seite.
// Kriterien:
//   1  Gerade: P, Klick im Leeren links der Form, Klick im Leeren rechts, ↩: ein neuer Loop rundum; in der Seite liegt er auf der
//      gezogenen Geraden (höchstens 0,5 Bildpunkte daneben; derselbe Handgriff wie L im Prüffenster, `loopSchneiden`).
//   2  Ein ⌘Z nimmt ihn zurück.
//   3  Gebogen (der zweite Punkt gezogen): kein Loop, eine Meldung.
//   4  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-p-schnitt-fenster.mjs [ordner für Bilder]
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
const ruhig = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 60000 });
  await s.waitForTimeout(200);
};
await ruhig();
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => x.toFixed(2).replace('.', ',');
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
const P = (await O('netzPunkte')).filter((p) => p.sichtbar);
const xs = P.map((p) => p.x);
const ys = P.map((p) => p.y).sort((a, b) => a - b);
const x0 = Math.min(...xs);
const x1 = Math.max(...xs);
// eine Höhe in einer Lücke der Punkte, nahe der Mitte (die Gerade soll keinen Punkt streifen)
// in der mittleren Hälfte der Höhe (zwischen den Vierteln der Punkte), die größte Lücke
const q1 = ys[Math.floor(ys.length * 0.25)];
const q3 = ys[Math.floor(ys.length * 0.75)];
let y = (q1 + q3) / 2;
let best = -1;
for (let i = 0; i + 1 < ys.length; i++) {
  const c = (ys[i] + ys[i + 1]) / 2;
  if (c < q1 || c > q3) continue;
  const g = ys[i + 1] - ys[i];
  if (g > best) {
    best = g;
    y = c;
  }
}
const vorher = (await O('werkLinienDaten')).length;
const klick = async (x, yy) => {
  await s.mouse.move(x, yy);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
if (process.env.DIAG === '1') { await s.evaluate(() => { window.__diag = true; }); s.on('console', (m) => { if (m.text().startsWith('S8')) console.log(m.text()); }); }
await s.keyboard.press('p');
await s.waitForTimeout(300);
await klick(x0 - 70, y);
await klick(x1 + 70, y);
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-p-schnitt-1-gerade.png` });
await s.keyboard.press('Enter');
await ruhig();
const L1 = await O('werkLinienDaten');
if (process.env.DIAG === '1') console.log('Meldung nach gerade:', (await O('bearbeiten')).meldung);
const neu = L1.length > vorher ? L1[L1.length - 1] : null;
let abw = Infinity;
if (neu) {
  abw = 0;
  for (const q of neu.punkte) {
    const a = (await O('ankerImBild', neu.id, q.i, 'seite')).find((v) => !v.m);
    if (a) abw = Math.max(abw, Math.abs(a.y - y));
  }
}
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-p-schnitt-2-loop.png` });
ok('1 gerade: ein neuer Loop rundum, in der Seite auf der Geraden', !!neu && abw <= 0.5, `Linien ${vorher} → ${L1.length}${neu ? `, neuer Loop ${neu.id} (${neu.art}, ${neu.punkte.length} Punkte), größter Abstand zur Geraden ${z2(abw)} px` : ''}`);
await s.keyboard.press('Escape');
await s.keyboard.press('Meta+z');
await ruhig();
const L2 = await O('werkLinienDaten');
ok('2 ein ⌘Z nimmt ihn zurück', L2.length === vorher, `Linien ${L2.length}`);
// 3 gebogen: der zweite Punkt gezogen
await s.keyboard.press('p');
await s.waitForTimeout(300);
await klick(x0 - 70, y);
await s.mouse.move(x1 + 70, y);
await s.waitForTimeout(250);
await s.mouse.down();
for (let k = 1; k <= 10; k++) {
  await s.mouse.move(x1 + 70 + 3 * k, y + 4 * k);
  await s.waitForTimeout(25);
}
await s.mouse.up();
await s.waitForTimeout(250);
await s.keyboard.press('Enter');
await ruhig();
const L3 = await O('werkLinienDaten');
const meldung = (await O('bearbeiten')).meldung;
ok('3 gebogen: kein Loop, eine Meldung', L3.length === vorher && /Gebogen/.test(meldung ?? ''), `Linien ${L3.length}, Meldung „${meldung}“`);
ok('4 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
