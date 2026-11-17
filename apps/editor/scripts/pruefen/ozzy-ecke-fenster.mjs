// Ozzy, S18, S19 und der Rückweg im Plan „wie es weitergeht“ (17.11.2026): der Tropfen der Kreuzung an der Ecke einer Einzelansicht, der
// Punkt an der Ecke der Kiste im Raum und der Tropfen der Vier Ansichten in eine Ecke gezogen; an „strange bird“ (NAME).
// Kriterien:
//   1  S18 Drücken: In der eingerasteten Seite sitzt der Tropfen unten links; gegriffen springt nichts (höchstens 0,5 px), die anderen Felder
//      sind noch leer (Breite oder Höhe 0).
//   2  S18 Ziehen: Front, Top und Raum gleiten herein (ihre Felder wachsen), die Seite gleitet ohne Sprung (höchstens 8 px je Schritt von
//      4 px), die Haarlinie (der erlaubte Bereich) ist zu sehen.
//   3  S18 vor der Haarlinie losgelassen: zurück in der eingerasteten Seite, alles wie vorher (höchstens 0,5 px).
//   4  S18 dahinter losgelassen: Vier Ansichten, die Kreuzung unter dem Loslassen (höchstens 1 px), das Feld des Raums zeigt wieder den Raum.
//   5  S19 Drücken und Ziehen: Im Raum sitzt der Punkt an der Ecke der Kiste; beim Ziehen liegt der gezeichnete Tropfen unter dem Zeiger
//      (höchstens 2 px), die Kiste geht mit dem Zug auf, auf dem Kreis ist sie ganz offen.
//   6  S19 vor dem Kreis losgelassen: wieder zu, die Ecke an ihrem Platz (höchstens 1 px).
//   7  S19 dahinter losgelassen: offen, die Kreuzung unter dem Loslassen (höchstens 1 px).
//   8  Rückweg: den Tropfen der Vier Ansichten in die Ecke unten links ziehen: die eingerastete Seite; nichts springt beim Wechsel (höchstens
//      1 px).
//   9  Rückweg in die Ecke oben rechts: der Raum (die Kiste klappt zu).
//  10  Doppelklick auf den Tropfen an der Ecke (Einzelansicht und Raum): Vier Ansichten.
//  11  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-ecke-fenster.mjs
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
const z1 = (x) => x.toFixed(1).replace('.', ',');
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(200);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.waitForTimeout(300);
};
const ab = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
await ruhig();
await s.mouse.move(1430, 890);
await s.keyboard.press('1');
await s.waitForTimeout(1300);
await ruhig();
// Bezugsort der Seite: ein Ort rechts oberhalb der Mitte der Form
const B = await O('flaecheHer', 'seite', 780, 420);
const S0 = await O('flaecheHin', 'seite', B.X, B.Y);

// 1: S18 drücken
const E = await O('eck');
const [ex, ey] = E.ort;
await s.mouse.move(Math.round(ex), Math.round(ey));
await s.waitForTimeout(300);
await s.mouse.down();
await s.waitForTimeout(150);
const S1 = await O('flaecheHin', 'seite', B.X, B.Y);
const F1 = await O('felderJetzt');
ok('1 S18 drücken', Math.abs(ex - 18) < 1 && Math.abs(ey - 882) < 1 && ab(S1, S0) <= 0.5 && F1.front.w < 1 && F1.top.h < 1 && F1.raum.w < 1, `Ecke ${z1(ex)}, ${z1(ey)}; Seite ${z1(ab(S1, S0))} px, Front ${z1(F1.front.w)} breit, Top ${z1(F1.top.h)} hoch`);

// 2: ziehen in Schritten von 4 px, erst bis kurz vor die Haarlinie
const R = E.bereich;
const weg = (t) => ({ x: Math.round(ex + (R.x0 - ex) * t), y: Math.round(ey + (R.y1 - ey) * t) });
let vorher = S1;
let sprung = 0;
let wachsen = true;
let breite = 0;
const n2 = Math.ceil(Math.hypot(R.x0 - ex, R.y1 - ey) / 4);
for (let k = 1; k <= Math.round(n2 * 0.7); k++) {
  const p = weg(k / n2);
  await s.mouse.move(p.x, p.y);
  await s.waitForTimeout(16);
  const Sk = await O('flaecheHin', 'seite', B.X, B.Y);
  sprung = Math.max(sprung, ab(Sk, vorher));
  vorher = Sk;
  const Fk = await O('felderJetzt');
  if (Fk.front.w < breite - 0.01) wachsen = false;
  breite = Fk.front.w;
}
const E2 = await O('eck');
ok('2 S18 ziehen', sprung <= 8 && wachsen && breite > 50 && !!E2.zug && E2.zug.art === 'einzel', `größter Schritt der Seite ${z1(sprung)} px, Front ${z1(breite)} breit, wächst: ${wachsen}`);

// 3: vor der Haarlinie losgelassen
await s.mouse.up();
await s.waitForTimeout(900);
const b3 = await O('blick');
const S3 = await O('flaecheHin', 'seite', B.X, B.Y);
ok('3 S18 vor der Haarlinie los: zurück', b3.vier === 0 && b3.ansicht === 'seite' && b3.flach >= 0.999 && ab(S3, S0) <= 0.5, `vier ${b3.vier}, ${b3.ansicht}, Seite ${z1(ab(S3, S0))} px`);

// 4: dahinter losgelassen
await s.mouse.move(Math.round(ex), Math.round(ey));
await s.waitForTimeout(300);
await s.mouse.down();
const ziel4 = { x: 700, y: 420 };
for (let k = 1; k <= 30; k++) {
  await s.mouse.move(Math.round(ex + ((ziel4.x - ex) * k) / 30), Math.round(ey + ((ziel4.y - ey) * k) / 30));
  await s.waitForTimeout(16);
}
await s.mouse.up();
await s.waitForTimeout(1300);
const b4 = await O('blick');
const F4 = await O('felderJetzt');
ok('4 S18 dahinter los: Vier Ansichten', b4.vier === 1 && b4.ansicht === 'raum' && Math.hypot(F4.tx - ziel4.x, F4.ty - ziel4.y) <= 1, `vier ${b4.vier}, Kamera ${b4.ansicht}, Kreuzung ${z1(F4.tx - ziel4.x)} / ${z1(F4.ty - ziel4.y)} px neben dem Loslassen`);

// 8: Rückweg in die Ecke unten links
await s.mouse.move(Math.round(F4.tx), Math.round(F4.ty));
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 40; k++) {
  await s.mouse.move(Math.round(F4.tx + ((5 - F4.tx) * k) / 40), Math.round(F4.ty + ((895 - F4.ty) * k) / 40));
  await s.waitForTimeout(16);
}
await s.mouse.up();
// am Ende der Fahrt (Feld) und gleich danach (Einzelansicht) denselben Ort ansehen
let vorWechsel = null;
for (let i = 0; i < 120; i++) {
  await s.waitForTimeout(16);
  const b = await O('blick');
  const p = await O('flaecheHin', 'seite', B.X, B.Y);
  if (b.vier > 0) vorWechsel = p;
  else break;
}
await s.waitForTimeout(100);
const b8 = await O('blick');
const S8 = await O('flaecheHin', 'seite', B.X, B.Y);
ok('8 Rückweg unten links: die Seite', b8.vier === 0 && b8.ansicht === 'seite' && b8.flach >= 0.999 && !!vorWechsel && ab(S8, vorWechsel) <= 1, `vier ${b8.vier}, ${b8.ansicht}, beim Wechsel ${vorWechsel ? z1(ab(S8, vorWechsel)) : '–'} px`);

// 10a: Doppelklick auf den Tropfen der Einzelansicht
const E10 = await O('eck');
await s.mouse.click(Math.round(E10.ort[0]), Math.round(E10.ort[1]));
await s.waitForTimeout(80);
await s.mouse.click(Math.round(E10.ort[0]), Math.round(E10.ort[1]));
await s.waitForTimeout(2000);
const b10 = await O('blick');
const ok10a = b10.vier === 1;

// 9: Rückweg in die Ecke oben rechts: der Raum
const F9 = await O('felderJetzt');
await s.mouse.move(Math.round(F9.tx), Math.round(F9.ty));
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 40; k++) {
  await s.mouse.move(Math.round(F9.tx + ((1435 - F9.tx) * k) / 40), Math.round(F9.ty + ((5 - F9.ty) * k) / 40));
  await s.waitForTimeout(16);
}
await s.mouse.up();
await s.waitForTimeout(1200);
const b9 = await O('blick');
ok('9 Rückweg oben rechts: der Raum', b9.vier === 0 && b9.ansicht === 'raum', `vier ${b9.vier}, ${b9.ansicht}`);

// 5: S19 im Raum
await s.mouse.move(1430, 890);
await s.waitForTimeout(400);
const E5 = await O('eck');
const P0 = { x: E5.ort[0], y: E5.ort[1] };
await s.mouse.move(Math.round(P0.x), Math.round(P0.y));
await s.waitForTimeout(300);
await s.mouse.down();
const dx = Math.round(P0.x) - P0.x;
const dy = Math.round(P0.y) - P0.y;
let unter = 0;
let offenAufKreis = false;
const zielRaus = { x: P0.x + 0.6 * E5.kreis, y: P0.y - 0.6 * E5.kreis };
for (let k = 1; k <= 30; k++) {
  const p = { x: Math.round(P0.x + ((zielRaus.x - P0.x) * k) / 30), y: Math.round(P0.y + ((zielRaus.y - P0.y) * k) / 30) };
  await s.mouse.move(p.x, p.y);
  await s.waitForTimeout(16);
  const e = await O('eck');
  if (e.bild) unter = Math.max(unter, Math.hypot(e.bild[0] - (p.x - dx), e.bild[1] - (p.y - dy)));
}
const b5a = await O('blick');
const e5 = await O('eck');
const zwischen = b5a.vier > 0.3 && b5a.vier < 0.95;
ok('5 S19 ziehen: der Tropfen unter dem Zeiger, die Kiste geht mit auf', unter <= 2 && zwischen && !!e5.zug && e5.zug.von === 'raum', `höchstens ${z1(unter)} px neben dem Zeiger, offen ${z1(b5a.vier)}`);

// 6: vor dem Kreis losgelassen
await s.mouse.up();
await s.waitForTimeout(900);
const b6 = await O('blick');
const E6 = await O('eck');
ok('6 S19 vor dem Kreis los: wieder zu', b6.vier === 0 && !!E6.ort && Math.hypot(E6.ort[0] - P0.x, E6.ort[1] - P0.y) <= 1, `vier ${b6.vier}, Ecke ${E6.ort ? z1(Math.hypot(E6.ort[0] - P0.x, E6.ort[1] - P0.y)) : '–'} px neben ihrem Platz`);

// 7: über den Kreis hinaus
await s.mouse.move(Math.round(P0.x), Math.round(P0.y));
await s.waitForTimeout(300);
await s.mouse.down();
const ziel7 = { x: Math.round(P0.x + 1.2 * E5.kreis * 0.8), y: Math.round(P0.y - 1.2 * E5.kreis * 0.6) };
let offen7 = 0;
for (let k = 1; k <= 40; k++) {
  await s.mouse.move(Math.round(P0.x + ((ziel7.x - P0.x) * k) / 40), Math.round(P0.y + ((ziel7.y - P0.y) * k) / 40));
  await s.waitForTimeout(16);
  if (k === 34) offen7 = (await O('blick')).vier;
}
offenAufKreis = offen7 >= 1;
await s.mouse.up();
await s.waitForTimeout(500);
const b7 = await O('blick');
const F7 = await O('felderJetzt');
ok('7 S19 dahinter los: offen, Kreuzung unter dem Loslassen', offenAufKreis && b7.vier === 1 && Math.hypot(F7.tx - (ziel7.x - dx), F7.ty - (ziel7.y - dy)) <= 1, `auf dem Kreis offen ${z1(offen7)}, Kreuzung ${z1(Math.hypot(F7.tx - (ziel7.x - dx), F7.ty - (ziel7.y - dy)))} px neben dem Loslassen`);

// 10b: Doppelklick auf den Punkt im Raum
await s.keyboard.press('Tab');
await s.waitForTimeout(1300);
await s.mouse.move(1430, 890);
await s.waitForTimeout(300);
const E10b = await O('eck');
let ok10b = false;
if (E10b.ort) {
  await s.mouse.click(Math.round(E10b.ort[0]), Math.round(E10b.ort[1]));
  await s.waitForTimeout(80);
  await s.mouse.click(Math.round(E10b.ort[0]), Math.round(E10b.ort[1]));
  await s.waitForTimeout(1500);
  ok10b = (await O('blick')).vier === 1;
}
ok('10 Doppelklick auf den Tropfen an der Ecke: Vier Ansichten', ok10a && ok10b, `Einzelansicht ${ok10a}, Raum ${ok10b}`);
ok('11 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
