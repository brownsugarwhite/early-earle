// Ozzy, Phase 3 (16.11.2026): die Form des Werks in Ozzy. Ein Fisch wird gezeichnet und aufgeblasen; nach dem Abriss übernimmt die Haut
// des Werks die Blase und schnalzt in die Form der Rechnung; Wände, Felder und die eingerastete Seite zeigen die Linie des Werks; ein
// Punkt der Seite wird über das Werk gezogen, ⌘Z nimmt ihn zurück. Alles in Echtzeit (die Ansichten nicht im Schnelldurchlauf: das Werk
// rechnet im Takt der Bilder und im Hintergrund, ohne vergehende Zeit endete derselbe Zug einmal mit zerrissener Haut).
// Kriterien:
//   1  Die Form im Werk ist angelegt: eine Linie (Mitte) mit den 7 gezeichneten Punkten.
//   2  Übergabe: Im Moment der Übergabe liegt die Haut des Werks im Mittel höchstens 0,5 Pixel der Welt neben der Blase.
//   3  In der Ruhe zeigt die Seifenhaut die Haut des Werks; die Linie der Seite liegt auf der Zeichnung (Punkte höchstens 0,01 px daneben).
//   4  Zug in der eingerasteten Seite (oberer Punkt, 30 Bildpunkte nach oben): Der Punkt folgt (mindestens 20 px der Welt), ein Schritt
//      im Werk; ⌘Z bringt ihn genau zurück.
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 node scripts/pruefen/ozzy-werk-fenster.mjs [ordner für Bilder]
//   OZZY_URL (Standard http://localhost:5205/ozzy.html); FLICKEN (JSON) wie in `ozzy-teile.mjs`
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const seite = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await flickenAnlegen(seite, undefined, fehler);
await seite.goto(`${basis}?bild=1&ohneLinie=0`);
await seite.waitForFunction(() => !!window.__ozzy);
await seite.evaluate(() => document.fonts.ready);
const O = (f, ...a) => seite.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => x.toFixed(2).replace('.', ',');
const bild = async (name) => {
  if (ordner) await seite.screenshot({ path: `${ordner}/ozzy-werk-${name}.png` });
};
const ruhigWerk = () => seite.waitForFunction(() => !window.__ozzy.werk().beschaeftigt, null, { timeout: 30000 });

// ---------- der Fisch, aufgeblasen; die Zeit steht, bis das Werk seine Form gerechnet hat ----------
const anker = await seite.evaluate(() => {
  const o = window.__ozzy;
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const a = [
    { x: cx - 170, y: cy },
    { x: cx - 50, y: cy - 95, ein: [-70, 0], aus: [70, 0] },
    { x: cx + 100, y: cy - 22 },
    { x: cx + 175, y: cy - 82 },
    { x: cx + 160, y: cy + 70 },
    { x: cx + 100, y: cy + 22 },
    { x: cx - 50, y: cy + 88, ein: [70, 0], aus: [-70, 0] },
  ];
  o.form(a);
  o.film(true);
  return a.map((p) => ({ x: p.x - innerWidth / 2, y: innerHeight / 2 - p.y }));
});
await O('zeit', 0);
for (let i = 0; i < 500; i++) {
  await O('bild');
  if (!(await O('werk')).beschaeftigt) break;
  await seite.waitForTimeout(20);
}
const w0 = await O('werk');
const st = await O('stand');
ok('1 die Form im Werk: eine Linie, die 7 Punkte der Zeichnung', w0.form && w0.linien === 1 && w0.mittePunkte === 7, `${w0.punkte} Punkte der Haut, angelegt in ${st.werkMs.toFixed(0)} ms, umgeschlagen ${w0.umgeschlagen}`);

// ---------- der Ablauf Bild für Bild; an der Übergabe gemessen ----------
let uebergabe = null;
for (let t = 0; t <= st.dauer + 1 / 30; t += 1 / 60) {
  await O('zeit', t);
  await O('bild');
  if (!uebergabe && t >= st.riss) {
    uebergabe = await O('uebergabePruefen', 2500);
    await O('bild');
    await bild('1-uebergabe');
  }
}
ok('2 Übergabe: die Haut des Werks liegt auf der Blase (im Mittel höchstens 0,5 px)', !!uebergabe && uebergabe.mittel <= 0.5, uebergabe ? `im Mittel ${z2(uebergabe.mittel)} px, höchstens ${z2(uebergabe.groesste)} px (${uebergabe.punkte} Punkte)` : 'keine Übergabe');
await O('zeit', st.dauer + 0.01);
await O('zeit', null);
await O('film', false);
await seite.waitForTimeout(600);
await bild('2-ruhe');

// ---------- die Linie der Seite ist die Zeichnung ----------
const w1 = await O('werk');
const linie = await O('seitenLinie');
let neben = 0;
for (const a of anker) neben = Math.max(neben, Math.min(...linie.punkte.map((p) => Math.hypot(p.x - a.x, p.y - a.y))));
ok('3 in der Ruhe die Haut des Werks; die Linie der Seite liegt auf der Zeichnung', w1.gezeigt && neben <= 0.01, `gezeigt ${w1.gezeigt}, Punkte höchstens ${neben.toExponential(1)} px neben den gezeichneten; Anzeige ${w1.stufen} Stufen, ${w1.feinePunkte} Punkte`);

// ---------- Zug in der eingerasteten Seite, dann ⌘Z ----------
await O('ansicht', 'seite');
await seite.waitForTimeout(1100);
await bild('3-seite');
const oben = linie.punkte.reduce((a, b) => (b.y > a.y ? b : a));
const p = await O('seitenPunktImBild', oben.i);
await seite.mouse.move(p.x, p.y);
// seit Phase 5.2 greift das Verhalten der Studie: Der Tropfen muss erst am Zeiger hängen (wie bei Florian: zeigen, dann drücken)
await seite.waitForTimeout(350);
await seite.mouse.down();
for (let i = 1; i <= 15; i++) {
  await seite.mouse.move(p.x, p.y - 2 * i);
  await seite.waitForTimeout(20);
}
await seite.waitForTimeout(150);
await seite.mouse.up();
await seite.waitForTimeout(300);
await ruhigWerk();
await seite.waitForTimeout(300);
const nach = (await O('seitenLinie')).punkte.find((q) => q.i === oben.i);
const w2 = await O('werk');
await bild('4-gezogen');
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(300);
await ruhigWerk();
const zurueck = (await O('seitenLinie')).punkte.find((q) => q.i === oben.i);
const w3 = await O('werk');
ok(
  '4 Zug über das Werk: der Punkt folgt, ⌘Z bringt ihn zurück',
  nach.y - oben.y >= 20 && w2.schritte === 1 && w3.schritte === 0 && Math.hypot(zurueck.x - oben.x, zurueck.y - oben.y) < 1e-6,
  `${z2(nach.y - oben.y)} px nach oben, Schritte ${w2.schritte} → ${w3.schritte}; nach dem Zug umgeschlagen ${w2.umgeschlagen}${w2.meldung ? ` („${w2.meldung}“)` : ''}`,
);
await O('ansicht', 'raum');
await seite.waitForTimeout(1100);
await O('vier', true);
await seite.waitForTimeout(1100);
await bild('5-vier');
ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
