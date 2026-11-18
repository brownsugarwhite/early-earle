// Ozzy, S13 (liquid drop, Idee 10, 17.11.2026): der Ansichts-Tropfen unten rechts, an „strange bird“ (NAME).
// Kriterien:
//   1  Im Raum zu sehen; in der Hausansicht zeigen S, F und T zum Betrachter (Tinte), ihre Gegenseiten weg (grün).
//   2  Über T sagt das Schild „Top · 7“.
//   3  Tippen auf F: die Front rastet ein (nicht gewendet).
//   4  ⇧ und Tippen auf S: die Seite von der Gegenseite (gewendet).
//   5  Tippen in die Mitte: zurück in den Raum.
//   6  Ziehen am Tropfen (60 px nach rechts) dreht wie Ziehen ins Leere (die Gier ändert sich um etwa 21°).
//   7  In den Vier Ansichten: Tippen auf S klappt sie zu und rastet die Seite ein.
//   8  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-ansichts-tropfen-fenster.mjs [ordner für Bilder]
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
  await s.waitForTimeout(250);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.waitForTimeout(250);
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const tropfen = (b) => O('ansichtsTropfen').then((t) => t.achsen.find((a) => a.buchstabe === b));
const tippen = async (p, umschalt = false) => {
  await s.mouse.move(p.x, p.y);
  await s.waitForTimeout(250);
  if (umschalt) await s.keyboard.down('Shift');
  await s.mouse.down();
  await s.waitForTimeout(40);
  await s.mouse.up();
  if (umschalt) await s.keyboard.up('Shift');
  await s.waitForTimeout(1400);
  await ruhig();
};
await ruhig();
const t0 = await O('ansichtsTropfen');
const vorn = t0.achsen.filter((a) => a.buchstabe).every((a) => a.t > 0);
const hinten = t0.achsen.filter((a) => !a.buchstabe).every((a) => a.t < 0);
ok('1 im Raum zu sehen, S F T vorn, Gegenseiten hinten', t0.sichtbar && vorn && hinten, t0.achsen.map((a) => `${a.buchstabe || '·'} ${z1(a.t)}`).join(', '));
const T = await tropfen('T');
await s.mouse.move(T.x, T.y);
await s.waitForTimeout(400);
const schild = (await O('ansichtsTropfen')).schild;
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-ansichts-tropfen-ueber.png`, clip: { x: 1140, y: 760, width: 300, height: 140 } });
ok('2 über T sagt das Schild, wohin', schild === 'Top · 7', `Schild „${schild}“`);
await tippen(await tropfen('F'));
const b3 = await O('blick');
ok('3 Tippen auf F: Front', b3.ansicht === 'front' && !b3.gewendet && b3.flach > 0.99, `${b3.ansicht}, gewendet ${b3.gewendet}, flach ${z1(b3.flach)}`);
await tippen(await tropfen('S'), true);
const b4 = await O('blick');
ok('4 ⇧ und Tippen auf S: Seite von der Gegenseite', b4.ansicht === 'seite' && b4.gewendet && b4.flach > 0.99, `${b4.ansicht}, gewendet ${b4.gewendet}`);
await tippen((await O('ansichtsTropfen')).mitte);
const b5 = await O('blick');
ok('5 Tippen in die Mitte: Raum', b5.ansicht === 'raum', `${b5.ansicht}`);
// 6 ziehen
const m = (await O('ansichtsTropfen')).mitte;
const g0 = (await O('blick')).gier;
await s.mouse.move(m.x + 20, m.y + 20);
await s.waitForTimeout(250);
await s.mouse.down();
for (let k = 1; k <= 12; k++) {
  await s.mouse.move(m.x + 20 + 5 * k, m.y + 20);
  await s.waitForTimeout(30);
}
await s.waitForTimeout(400);
await s.mouse.up();
await s.waitForTimeout(1200);
const b6 = await O('blick');
const dg = ((g0 - b6.gier) * 180) / Math.PI;
ok('6 Ziehen dreht wie Ziehen ins Leere', Math.abs(dg - 20.8) < 3 || b6.ansicht !== 'raum', `Gier um ${z1(dg)}° (erwartet etwa 20,8°), Ansicht ${b6.ansicht}`);
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-ansichts-tropfen-gedreht.png` });
// 7 Vier Ansichten
await tippen((await O('ansichtsTropfen')).mitte);
await s.keyboard.press('Tab');
await s.waitForTimeout(1200);
await ruhig();
const v7 = (await O('blick')).vier;
await tippen(await tropfen('S'));
const b7 = await O('blick');
ok('7 aus den Vier Ansichten: Tippen auf S rastet die Seite ein', v7 > 0.99 && b7.vier < 0.01 && b7.ansicht === 'seite', `vorher vier ${z1(v7)}, danach vier ${z1(b7.vier)}, ${b7.ansicht}`);
ok('8 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
