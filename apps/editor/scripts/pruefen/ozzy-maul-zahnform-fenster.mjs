// Ozzy, ein Zahn als kleine Form (Plan „Maul, Zähne, Zunge“, Etappe 7, 21.11.2026), an „teat firefish“ (NAME) auf Wachs.
// Der Zahn in der Linse trägt drei Linien (von vorn, von der Seite, quer am Zahnfleisch); eingerastet lässt sich die Linie der
// Ansicht mit dem Verhalten der Linien formen. Kriterien:
//   G1 Die Linse der Zähne ist offen: Der Zahn trägt seine drei Linien (ruhend), er ist nicht eingerastet, am Formenring stehen acht
//      Zeichen, niemand hat eine eigene Form.
//   G2 Ein Tipp auf die Linie von vorn: Der Zahn dreht in ihre Ansicht und rastet ein; die Linie trägt ihre Punkte (wenigstens drei,
//      davon drei geteilte: Zahnfleisch, Spitze, Zahnfleisch).
//   G3 Die Spitze 36 Bildpunkte nach oben gezogen: Beide Reihen tragen dieselbe eigene Form (`form` −1), die Zähne im Maul werden
//      länger, am Formenring steht ein neuntes Zeichen und gilt; es ist ein Schritt. Die Spitze von der Seite ist mitgegangen.
//   G4 ⌘Z: wieder die Vorlage, acht Zeichen, die Zähne so lang wie vorher. Noch einmal gezogen und dann zu „Spitz“ gedreht: Die
//      eigene Form steht noch da (neun Zeichen); ein Tipp auf das neunte Zeichen holt sie zurück.
//   G5 Ein Punkt am Zahnfleisch nach außen und nach oben gezogen: Er bleibt auf der Höhe des Zahnfleischs und geht nach außen; die
//      Linie quer geht mit (derselbe Punkt).
//   G6 P und ein Klick auf die Linie: ein Punkt mehr, die Zähne bleiben, wie sie sind; A, den Punkt gewählt, ⌫: wieder einer weniger.
//      ⌫ auf der gewählten Spitze löscht nichts.
//   G7 Im Leeren gezogen: Der Zahn dreht aus seiner Ansicht (nicht mehr eingerastet, keine Punkte); zurückgedreht bis nahe „von
//      vorn“ rastet er wieder ein.
//   G8 Von der Seite und von oben: Der Zahn rastet ein, die Linie trägt ihre Punkte; ein Punkt der Linie quer nach außen gezogen:
//      Der Querschnitt der Zähne ändert sich.
//   G9 Ein Zahn allein (im Bild zweimal angetippt): An der Spitze gezogen bekommen nur er und sein Spiegelbild die eigene Form; die
//      Reihe behält ihre.
//   G10 Tempo: Während die Spitze gezogen wird, rechnet ein Bild im Mittel höchstens 12 ms (Ozzy) und 3 ms (die Linse), keines
//      über 16,7 ms.
//   G11 Sichern und neu laden: Die Werte der Zähne sind dieselben (die eigene Form der Reihe und die des einzelnen Zahns), die
//      Zähne stehen wie vorher (ihr Netz ist endlich, der längste Zahn gleich lang).
//   G12 Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;…'] node scripts/pruefen/ozzy-maul-zahnform-fenster.mjs [ordner für Bilder]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
const LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const BIS = process.env.BIS ?? '';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
// (für G11: Die Probe sichert unter einem eigenen Namen in `wesen/` und räumt ihn wieder weg)
const PROBE = 'ozzy-probe-zahnform';
const datei = `${fileURLToPath(new URL('../../../../wesen/', import.meta.url))}${PROBE}.eewesen`;
const aufraeumen = () => {
  if (fs.existsSync(datei)) fs.unlinkSync(datei);
};
aufraeumen();
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await flickenAnlegen(s, undefined, fehler);
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async (zeit = 120000) => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: zeit });
  await s.waitForTimeout(200);
};
await ruhig();
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
/** ein Bild der Linse (mit ihren Ringen) und eines des Fensters */
const bild = async (name, ganz = false) => {
  if (!ordner) return;
  if (ganz) await s.screenshot({ path: `${ordner}/ozzy-maul-zahnform-${name}.png` });
  else {
    const l = (await O('zaehne')).linse;
    const r = l.innen / 2 + 70;
    await s.screenshot({ path: `${ordner}/ozzy-maul-zahnform-${name}.png`, clip: { x: Math.max(0, l.mitte[0] - r), y: Math.max(0, l.mitte[1] - r), width: Math.min(2 * r, 1440 - Math.max(0, l.mitte[0] - r)), height: 2 * r } });
  }
};
const klick = async (x, y) => {
  await s.mouse.move(x, y);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
/** von einem Ort um (dx, dy) ziehen, in Schritten, und loslassen */
const ziehen = async (x, y, dx, dy, schritte = 12, halten = 0) => {
  await s.mouse.move(x - 3, y - 3);
  await s.waitForTimeout(120);
  await s.mouse.move(x, y);
  await s.waitForTimeout(260);
  await s.mouse.down();
  await s.waitForTimeout(80);
  for (let i = 1; i <= schritte; i++) {
    await s.mouse.move(x + (dx * i) / schritte, y + (dy * i) / schritte);
    await s.waitForTimeout(25);
  }
  if (halten) await s.waitForTimeout(halten);
  await s.mouse.up();
  await s.waitForTimeout(450);
};
const zurueck = async () => {
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(700);
};
const Z = (blick) => O('zahnform', ...(blick === undefined ? [] : [blick]));
/** warten, bis der Zahn eingerastet ist und seine Linie Punkte trägt (oder nicht mehr) */
const eingerastet = async (soll = true, linie = null) => {
  for (let i = 0; i < 80; i++) {
    const z = await Z();
    if (z.formt === soll && (!soll || (z.punkte.length >= 3 && (!linie || z.linie === linie)))) return z;
    await s.waitForTimeout(50);
  }
  return Z();
};
const anLinse = async (grad, ueber) => {
  const l = (await O('zaehne')).linse;
  const r = l.innen / 2 + ueber;
  const w = (grad * Math.PI) / 180;
  return [l.mitte[0] + r * Math.cos(w), l.mitte[1] + r * Math.sin(w)];
};

await O('material', 'wachs');
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
await s.keyboard.press('p');
await s.waitForTimeout(300);
for (const [x, y] of LINIE) {
  const q = await O('werkImBild', { x, y, z: 0 });
  await klick(q.x, q.y);
}
await s.keyboard.press('Enter');
await s.waitForTimeout(500);
await s.click('#maul-tropfen');
await s.waitForFunction(() => !window.__ozzy.maulStrich(), null, { timeout: 60000 }).catch(() => {});
await ruhig();
await s.waitForTimeout(2500);
await ruhig();
await s.keyboard.press('a');
await s.waitForTimeout(300);
await s.keyboard.press('0');
await s.waitForTimeout(1800);
await O('blickSetzen', { gier: -1.6, neigung: 0.05, zoom: 4 });
await s.waitForTimeout(1200);
await s.click('#zaehne-tropfen');
await s.waitForTimeout(2600);
await ruhig();

// G1 die Linse: drei ruhende Linien, acht Zeichen, keine eigene Form
const g1 = await Z();
const lang0 = (await O('zaehne')).lang;
ok('G1 die Linse ist offen: Der Zahn trägt drei ruhende Linien, ist nicht eingerastet; acht Zeichen, keine eigene Form', g1.linien.length === 3 && !g1.eingerastet && !g1.formt && g1.zeichen === 8 && !g1.eigene, `Linien ${g1.linien.map((l) => l.linie).join(', ')}; Zeichen ${g1.zeichen}; eingerastet ${g1.eingerastet}`);
await bild('1-frei');

// G2 ein Tipp auf die Linie von vorn
const lv = g1.linien.find((l) => l.linie === 'vorn');
if (lv) await klick(lv.x, lv.y);
const g2 = await eingerastet();
const fest2 = g2.punkte.filter((p) => p.fest).length;
ok('G2 ein Tipp auf die Linie von vorn: Der Zahn rastet in ihre Ansicht ein, die Linie trägt ihre Punkte', g2.eingerastet && g2.formt && g2.linie === 'vorn' && g2.punkte.length >= 3 && fest2 === 3, `Ansicht ${g2.linie}; ${g2.punkte.length} Punkte, ${fest2} geteilt`);
await bild('2-von-vorn');
if (BIS === 'G2') {
  await browser.close();
  process.exit(schlecht ? 1 : 0);
}

// G3 die Spitze nach oben ziehen
/** die Spitze: der mittlere der drei geteilten Punkte */
const spitzeVon = (z) => z.punkte.filter((p) => p.fest)[1];
const sp = spitzeVon(g2);
const schritte3 = g2.schritte;
await ziehen(sp.x, sp.y, 0, -36);
await ruhig();
const g3 = await Z();
const w3 = (await O('zaehne')).werte;
const lang3 = (await O('zaehne')).lang;
const hoch = (g) => g.vorn[g.spitzeV].y;
ok(
  'G3 die Spitze 36 Bildpunkte nach oben gezogen: beide Reihen tragen dieselbe eigene Form, die Zähne werden länger, ein neuntes Zeichen gilt, ein Schritt',
  w3.oben.form === -1 && w3.unten.form === -1 && !!w3.oben.gestalt && JSON.stringify(w3.oben.gestalt) === JSON.stringify(w3.unten.gestalt) && lang3 > lang0 * 1.1 && g3.zeichen === 9 && g3.eigene && g3.gilt && g3.schritte === schritte3 + 1 && Math.abs(w3.oben.gestalt.seite[w3.oben.gestalt.spitzeS].y - hoch(w3.oben.gestalt)) < 1e-9,
  `form ${w3.oben.form}/${w3.unten.form}; Spitze ${w3.oben.gestalt ? hoch(w3.oben.gestalt).toFixed(2) : '–'}; längster Zahn ${lang0.toFixed(1)} → ${lang3.toFixed(1)}; Zeichen ${g3.zeichen}; Schritte +${g3.schritte - schritte3}`,
);
await bild('3-spitze-gezogen');
await bild('3-im-maul', true);

// G4 ⌘Z; noch einmal; zu einer Vorlage und zurück
await zurueck();
await ruhig();
const g4a = await Z();
const w4a = (await O('zaehne')).werte;
const lang4a = (await O('zaehne')).lang;
const g4b0 = await eingerastet();
const sp4 = spitzeVon(g4b0);
await ziehen(sp4.x, sp4.y, 10, -30);
await ruhig();
/** die Mitte eines Zeichens am Formenring im Fenster (wo es gerade steht) */
const zeichenOrt = (i) =>
  s.evaluate((nr) => {
    const r = document.querySelector(`#linse .ring-zeichen[data-i="${nr}"] .zeichen-grund`)?.getBoundingClientRect();
    return r ? [r.left + r.width / 2, r.top + r.height / 2] : null;
  }, i);
const spitz = await zeichenOrt(1);
if (spitz) await klick(spitz[0], spitz[1]);
await s.waitForTimeout(900);
const w4c = (await O('zaehne')).werte;
const g4c = await Z();
const neun = await zeichenOrt(8);
if (neun) await klick(neun[0], neun[1]);
await s.waitForTimeout(900);
const w4d = (await O('zaehne')).werte;
const g4d = await Z();
ok(
  'G4 ⌘Z: wieder die Vorlage, acht Zeichen, die Zähne so lang wie vorher; eine Vorlage gewählt: Die eigene Form steht noch da; das neunte Zeichen holt sie zurück',
  w4a.oben.form === 0 && !w4a.oben.gestalt && g4a.zeichen === 8 && Math.abs(lang4a - lang0) < 0.02 * lang0 && w4c.oben.form === 1 && !!w4c.oben.gestalt && g4c.zeichen === 9 && !g4c.gilt && w4d.oben.form === -1 && g4d.gilt,
  `nach ⌘Z: form ${w4a.oben.form}, Zeichen ${g4a.zeichen}, längster ${lang4a.toFixed(1)}; mit Vorlage: form ${w4c.oben.form}, Gestalt ${w4c.oben.gestalt ? 'steht' : 'fehlt'}, Zeichen ${g4c.zeichen}; zurück: form ${w4d.oben.form}`,
);
await bild('4-eigenes-zeichen');
if (BIS === 'G4') {
  await browser.close();
  process.exit(schlecht ? 1 : 0);
}

// G5 ein Punkt am Zahnfleisch: bleibt auf seiner Höhe, geht nach außen; die Linie quer geht mit
const g5a = await eingerastet();
const fuss = g5a.punkte.filter((p) => p.fest)[0];
const w5a = (await O('zaehne')).werte.oben.gestalt;
await ziehen(fuss.x, fuss.y, fuss.x < spitzeVon(g5a).x ? -14 : 14, -22);
await ruhig();
const w5 = (await O('zaehne')).werte.oben.gestalt;
// (welches Ende der Linie links im Bild liegt, sagt die Ansicht: von vorn das erste, von hinten das letzte)
const enden = (g) => [g.vorn[0], g.vorn[g.vorn.length - 1]];
const weiter5 = Math.max(Math.abs(enden(w5)[0].x - enden(w5a)[0].x), Math.abs(enden(w5)[1].x - enden(w5a)[1].x));
const querMit = Math.abs(w5.quer[w5.ecken[2]].x - w5.vorn[0].x) < 1e-9 && Math.abs(w5.quer[w5.ecken[0]].x - w5.vorn[w5.vorn.length - 1].x) < 1e-9;
ok('G5 ein Punkt am Zahnfleisch nach außen und oben gezogen: Er bleibt auf der Höhe des Zahnfleischs, geht nach außen, die Linie quer geht mit', enden(w5).every((a) => a.y === 0) && weiter5 > 0.08 && querMit, `Höhen ${enden(w5).map((a) => a.y).join(', ')}; nach außen ${weiter5.toFixed(2)}; quer ${querMit ? 'mit' : 'nicht mit'}`);

// G6 P setzt einen Punkt, ⌫ nimmt ihn; die Spitze bleibt
const g6a = await eingerastet();
const lang6a = (await O('zaehne')).lang;
// (eine Stelle der Linie zwischen zwei Punkten, fern von beiden: die Mitte des längsten Abstands)
let a6 = 0;
for (let i = 0; i + 1 < g6a.punkte.length; i++) if (Math.hypot(g6a.punkte[i + 1].x - g6a.punkte[i].x, g6a.punkte[i + 1].y - g6a.punkte[i].y) > Math.hypot(g6a.punkte[a6 + 1].x - g6a.punkte[a6].x, g6a.punkte[a6 + 1].y - g6a.punkte[a6].y)) a6 = i;
const n6a = (await O('zaehne')).werte.oben.gestalt.vorn.length;
await s.keyboard.press('p');
await s.waitForTimeout(300);
// (die Linie liegt nicht auf der Sehne: Der Zeiger sucht sie in der Nähe der Mitte, bis dort ein Tropfen hängt)
const mitte6 = [(g6a.punkte[a6].x + g6a.punkte[a6 + 1].x) / 2, (g6a.punkte[a6].y + g6a.punkte[a6 + 1].y) / 2];
let gesetzt = false;
for (const d of [0, -4, 4, -8, 8, -12, 12, -16, 16, -20, 20]) {
  for (const [qx, qy] of [
    [d, 0],
    [0, d],
  ]) {
    if (gesetzt) break;
    await klick(mitte6[0] + qx, mitte6[1] + qy);
    await s.waitForTimeout(200);
    gesetzt = (await O('zaehne')).werte.oben.gestalt.vorn.length === n6a + 1;
  }
}
await ruhig();
const n6b = (await O('zaehne')).werte.oben.gestalt.vorn.length;
const lang6b = (await O('zaehne')).lang;
await s.keyboard.press('a');
await s.waitForTimeout(300);
const g6b = await eingerastet();
// der neue Punkt: der nicht geteilte, der der Mitte am nächsten liegt
const neu6 = g6b.punkte.filter((p) => !p.fest).sort((p, q) => Math.hypot(p.x - mitte6[0], p.y - mitte6[1]) - Math.hypot(q.x - mitte6[0], q.y - mitte6[1]))[0];
if (neu6) await klick(neu6.x, neu6.y);
const gew6 = (await Z()).gewaehlt;
await s.keyboard.press('Backspace');
await s.waitForTimeout(500);
await ruhig();
const n6c = (await O('zaehne')).werte.oben.gestalt.vorn.length;
const g6c = await eingerastet();
const sp6 = spitzeVon(g6c);
await klick(sp6.x, sp6.y);
await s.keyboard.press('Backspace');
await s.waitForTimeout(400);
const n6d = (await O('zaehne')).werte.oben.gestalt.vorn.length;
ok('G6 P und ein Klick auf die Linie: ein Punkt mehr, die Zähne bleiben; A, den Punkt gewählt, ⌫: einer weniger; ⌫ auf der Spitze löscht nichts', n6b === n6a + 1 && Math.abs(lang6b - lang6a) < 0.02 * lang6a && gew6 === 1 && n6c === n6a && n6d === n6a, `Anker ${n6a} → ${n6b} → ${n6c} → ${n6d}; längster ${lang6a.toFixed(1)} → ${lang6b.toFixed(1)}; gewählt ${gew6}`);
if (BIS === 'G6') {
  await browser.close();
  process.exit(schlecht ? 1 : 0);
}

// G7 im Leeren ziehen dreht den Zahn aus seiner Ansicht; zurückgedreht rastet er wieder ein
const l7 = (await O('zaehne')).linse;
const leer = [l7.mitte[0] + l7.innen * 0.36, l7.mitte[1] + l7.innen * 0.3];
await ziehen(leer[0], leer[1], 36, 0);
const g7a = await eingerastet(false);
await bild('7-gedreht');
await ziehen(leer[0], leer[1], -30, 0);
const g7b = await eingerastet();
ok('G7 im Leeren gezogen: Der Zahn dreht aus seiner Ansicht (keine Punkte); zurückgedreht bis nahe „von vorn“ rastet er wieder ein', !g7a.eingerastet && !g7a.formt && g7a.punkte.length === 0 && g7a.linien.length === 3 && g7b.eingerastet && g7b.linie === 'vorn', `gedreht: eingerastet ${g7a.eingerastet}, ${g7a.linien.length} ruhende Linien; zurück: ${g7b.linie}, eingerastet ${g7b.eingerastet}`);

// G8 von der Seite und von oben
await Z('seite');
const g8a = await eingerastet(true, 'seite');
await bild('8-von-der-seite');
await Z('quer');
const g8b = await eingerastet(true, 'quer');
await bild('8-von-oben');
const q8a = (await O('zaehne')).werte.oben.gestalt;
// ein geteilter Punkt der Linie quer (der am weitesten rechts im Bild), nach außen gezogen
const mx8 = g8b.punkte.reduce((a, p) => a + p.x, 0) / Math.max(1, g8b.punkte.length);
const my8 = g8b.punkte.reduce((a, p) => a + p.y, 0) / Math.max(1, g8b.punkte.length);
const re8 = [...g8b.punkte].sort((p, q) => q.x - p.x)[0];
if (re8) await ziehen(re8.x, re8.y, 12, 0);
await ruhig();
const q8b = (await O('zaehne')).werte.oben.gestalt;
const breit = (g) => g.vorn[g.vorn.length - 1].x - g.vorn[0].x;
const tief = (g) => g.seite[g.seite.length - 1].x - g.seite[0].x;
ok(
  'G8 von der Seite und von oben rastet der Zahn ein, die Linie trägt ihre Punkte; ein Punkt der Linie quer nach außen gezogen: Der Querschnitt ändert sich',
  g8a.eingerastet && g8a.linie === 'seite' && g8a.punkte.length >= 3 && g8b.eingerastet && g8b.linie === 'quer' && g8b.punkte.length >= 4 && Math.abs(breit(q8b) - breit(q8a)) + Math.abs(tief(q8b) - tief(q8a)) > 0.05,
  `Seite: ${g8a.punkte.length} Punkte; oben: ${g8b.punkte.length} Punkte um (${mx8.toFixed(0)}, ${my8.toFixed(0)}); Breite ${breit(q8a).toFixed(2)} → ${breit(q8b).toFixed(2)}, Tiefe ${tief(q8a).toFixed(2)} → ${tief(q8b).toFixed(2)}`,
);
await bild('8-quer-gezogen');
await bild('8-im-maul', true);
if (BIS === 'G8') {
  await browser.close();
  process.exit(schlecht ? 1 : 0);
}

// G9 ein Zahn allein: Nur er und sein Spiegelbild bekommen die eigene Form
await Z('vorn');
await eingerastet(true, 'vorn');
/** ein Zahn der oberen Reihe im Bild, der zu treffen ist */
const zo = (await O('zaehneImBild')).find((t) => !t.unten && t.trifft);
let g9text = 'kein Zahn im Bild zu treffen';
let g9ok = false;
if (zo) {
  await s.mouse.move(zo.bild[0] + 60, zo.bild[1] - 60);
  await s.waitForTimeout(150);
  await klick(zo.bild[0], zo.bild[1]);
  await s.waitForTimeout(350);
  await klick(zo.bild[0], zo.bild[1]);
  await s.waitForTimeout(350);
  const wahl = (await O('zaehne')).wahl;
  const g9a = await eingerastet();
  const sp9 = spitzeVon(g9a);
  const vor9 = (await O('zaehne')).werte;
  if (sp9) await ziehen(sp9.x, sp9.y, -8, 26);
  await ruhig();
  const w9 = (await O('zaehne')).werte;
  const eigen9 = Object.entries(w9.oben.eigen ?? {}).filter(([, e]) => e.form === -1 && e.gestalt).map(([i]) => Number(i));
  g9ok = !!wahl && eigen9.length === 2 && JSON.stringify(w9.oben.gestalt) === JSON.stringify(vor9.oben.gestalt) && w9.oben.form === vor9.oben.form && JSON.stringify(w9.oben.eigen[eigen9[0]].gestalt) !== JSON.stringify(w9.oben.gestalt);
  g9text = `gewählt Zahn ${wahl ? wahl.i : '–'}; eigene Form an ${eigen9.join(' und ') || 'keinem'}; die Reihe ${JSON.stringify(w9.oben.gestalt) === JSON.stringify(vor9.oben.gestalt) ? 'behält ihre' : 'hat sich geändert'}`;
  await bild('9-ein-zahn', true);
}
ok('G9 ein Zahn allein (zweimal angetippt): An der Spitze gezogen bekommen nur er und sein Spiegelbild die eigene Form, die Reihe behält ihre', g9ok, g9text);

// G10 Tempo: die Rechenzeit je Bild, während die Spitze gezogen wird (Ozzys Bild und das der Linse zusammen)
const g10 = await eingerastet(true, 'vorn');
const sp10 = spitzeVon(g10);
let tempo = { n: 0, mittel: 0, max: 0, linse: 0 };
if (sp10) {
  await s.mouse.move(sp10.x, sp10.y);
  await s.waitForTimeout(300);
  await s.mouse.down();
  await s.mouse.move(sp10.x, sp10.y - 6);
  await s.waitForTimeout(400);
  await Z();
  await O('messen', true);
  for (let i = 0; i < 70; i++) {
    await s.mouse.move(sp10.x + 6 * Math.sin(i / 5), sp10.y - 12 - 8 * Math.cos(i / 7));
    await s.waitForTimeout(12);
  }
  const b = await O('messen', false);
  const linse = (await Z()).ms;
  await s.mouse.up();
  await s.waitForTimeout(400);
  const ms = b.map((q) => q.ms).sort((x, y) => x - y);
  // (das längste Bild ohne die zwei längsten: Ein einzelnes Aufräumen des Speichers zählt nicht)
  tempo = { n: ms.length, mittel: ms.reduce((u, v) => u + v, 0) / Math.max(1, ms.length), max: ms[Math.max(0, ms.length - 3)] ?? 0, linse };
}
ok('G10 Tempo: Während die Spitze gezogen wird, rechnet ein Bild im Mittel höchstens 12 ms (Ozzy) und 3 ms (Linse), keines über 16,7 ms', tempo.n > 40 && tempo.mittel <= 12 && tempo.linse <= 3 && tempo.max + tempo.linse <= 16.7, `${tempo.n} Bilder; Ozzy im Mittel ${tempo.mittel.toFixed(1)} ms, das längste ${tempo.max.toFixed(1)} ms; die Linse höchstens ${tempo.linse.toFixed(1)} ms`);

// G11 Sichern und neu laden
let g11 = false;
let g11text = '';
try {
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
  const vor = await O('zaehne');
  const meldung = await O('sichern', PROBE);
  await s.waitForTimeout(800);
  const s2 = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  s2.on('pageerror', (e) => fehler.push(String(e)));
  s2.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  await s2.goto(`${basis}?form=${encodeURIComponent(PROBE)}`);
  await s2.waitForFunction(() => !!window.__ozzy);
  const O2 = (f, ...a) => s2.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
  await s2.waitForTimeout(300);
  await s2.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: 120000 });
  await O2('material', 'wachs');
  await s2.waitForTimeout(1500);
  // (die Zähne haben erst Länge, wenn das Maul offen steht: die Linse öffnen)
  await s2.click('#zaehne-tropfen');
  await s2.waitForTimeout(2600);
  const nach = await O2('zaehne');
  const eigen = Object.values(nach.werte?.oben.eigen ?? {}).filter((e) => e.form === -1 && e.gestalt).length;
  g11 = fs.existsSync(datei) && !/geht so nicht|fehl/i.test(meldung) && JSON.stringify(nach.werte) === JSON.stringify(vor.werte) && nach.werte.oben.form === -1 && !!nach.werte.oben.gestalt && eigen === 2 && !!nach.netz && nach.netz.endlich && nach.plaetze.length === vor.plaetze.length;
  g11text = `Meldung „${meldung}“; Werte ${JSON.stringify(nach.werte) === JSON.stringify(vor.werte) ? 'gleich' : 'ANDERS'}; eigene Form der Reihe ${nach.werte?.oben.gestalt ? 'da' : 'FEHLT'}, einzelner Zähne: ${eigen}; Plätze ${vor.plaetze.length} → ${nach.plaetze.length}; Netz ${nach.netz ? `endlich ${nach.netz.endlich}` : 'keins'}`;
  if (ordner) await s2.screenshot({ path: `${ordner}/ozzy-maul-zahnform-11-geladen.png` });
  await s2.close();
} finally {
  aufraeumen();
}
ok('G11 gesichert und neu geladen: dieselben Werte (die eigene Form der Reihe und die des einzelnen Zahns), die Zähne stehen wie vorher', g11, g11text);

// G12 Konsole
ok('G12 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
await browser.close();
console.log(schlecht ? `\n${schlecht} Kriterien nicht erfüllt` : '\nalle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
