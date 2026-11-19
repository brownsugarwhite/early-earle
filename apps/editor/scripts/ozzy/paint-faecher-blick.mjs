// Standbilder zum Paint-Modus, Etappe 6 (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 18): die Ebenen-Ansicht, wie
// sie gebaut ist (schräg versetzt). An Florians Form „strange bird“, drei Ebenen (der Verlauf, die Punkte, ein oranger Fleck).
//   a  die drei Ebenen übereinander
//   b  aufgefächert: je Ebene eine Kopie, vorn die, an der gemalt wird
//   c  die mittlere Kopie angetippt: Sie ist vorgetreten
//   d  mit P auf ihr gezeichnet (Punkte und Griffe liegen auf der Kopie)
//   e  mit dem Farbtropfen gefüllt
//   f  ein Punkt gewählt, den Tropfen am Faden weggezogen: Die Kante ist dort weich
//   g  das Plus: Die neue Ebene hat ihre Kopie, noch blank
//   h  mit dem Rad an die vordere Kopie herangezoomt
//   i  wieder zusammengeschoben: alles liegt übereinander
//   j  dasselbe aufgefächert auf dem hellen Solid (Taste M)
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-faecher-blick.mjs <ordner>
import fs from 'node:fs';
import { ebeneDrei, ebeneEins, ebeneZwei, maus, oeffnen, PUNKT_R } from './paint-ebenen-szene.mjs';

const ordner = process.argv[2];
if (!ordner) throw new Error('Aufruf: node scripts/ozzy/paint-faecher-blick.mjs <ordner>');
fs.mkdirSync(ordner, { recursive: true });
const t = await oeffnen({ fuellen: '0' });
const { s, O } = t;
const { klick, fleck } = maus(s);
const bild = async (name) => {
  await s.waitForTimeout(450);
  fs.writeFileSync(`${ordner}/${name}.png`, await s.screenshot());
};
await s.evaluate(() => (document.getElementById('hinweis').style.visibility = 'hidden'));
await ebeneEins(t);
const zwei = await ebeneZwei(t);
await ebeneDrei(t);
// (wo der fünfte Punkt Platz hat: neben den vier, auf der Form)
let NEU = null;
await s.keyboard.press('p');
await s.waitForTimeout(300);
for (const [x, y] of [[436, 300], [440, 312], [274, 330], [300, 352]]) {
  let frei = true;
  for (let i = 0; i < 8 && frei; i++) frei = await O('farbOrtFrei', x + 1.3 * PUNKT_R * Math.cos((Math.PI * i) / 4), y + 1.5 * PUNKT_R * Math.sin((Math.PI * i) / 4));
  if (frei) {
    NEU = [x, y];
    break;
  }
}
await s.keyboard.press('a');
await s.waitForTimeout(300);
if (!NEU) throw new Error('Kein Platz für den fünften Punkt');
await s.mouse.move(560, 500, { steps: 4 });
await bild('a');
/** warten, bis die Ebenen-Ansicht steht und keine Kopie mehr rückt */
const steht = async (ziel) => {
  await s.waitForFunction((z) => Math.abs(window.__ozzy.faecher().f - z) < 1e-6, ziel, { timeout: 8000 });
  await s.waitForTimeout(900);
};
/** die Stelle einer Kopie, an der ein Ort der Form (CSS-Pixel im Bild der zusammengeschobenen Form) jetzt steht */
const K0 = (await O('faecher')).kreis;
const aufKopie = (F, q, [x, y]) => [q.x + (q.s * (x - K0.x) * F.kreis.r) / K0.r, q.y + (q.s * (y - K0.y) * F.kreis.r) / K0.r];
const kopie = (F, id) => F.kopien.find((q) => q.id === id);
// aufgefächert
await s.keyboard.press('x');
await steht(1);
await s.mouse.move(600, 520, { steps: 4 });
await bild('b');
// die mittlere Kopie antippen
let F = await O('faecher');
await klick(kopie(F, zwei).x, kopie(F, zwei).y);
await s.waitForTimeout(900);
await s.mouse.move(600, 520, { steps: 4 });
await bild('c');
// mit P auf ihr zeichnen
F = await O('faecher');
const Z = aufKopie(F, kopie(F, zwei), NEU);
await s.keyboard.press('p');
await s.waitForTimeout(400);
await fleck(Z[0], Z[1], PUNKT_R * kopie(F, zwei).s);
await s.mouse.move(Z[0] + 26, Z[1] + 30, { steps: 4 });
await bild('d');
// füllen
await s.keyboard.press('f');
await s.waitForTimeout(300);
await klick(Z[0], Z[1]);
await s.waitForTimeout(500);
await s.mouse.move(Z[0] + 26, Z[1] + 30, { steps: 4 });
await bild('e');
// ein Punkt, der Tropfen am Faden
await s.keyboard.press('a');
await s.waitForTimeout(300);
const linien = (await O('farbe')).ebenen.find((e) => e.id === zwei)?.linien ?? 5;
const P0 = (await O('farbPunkte', linien - 1)).punkte[1];
await klick(P0.x, P0.y);
await s.waitForTimeout(400);
const G = (await O('farbWeichGriffe'))[0];
if (G) {
  const lang = Math.hypot(G.gx - G.x, G.gy - G.y);
  const [ux, uy] = [(G.gx - G.x) / lang, (G.gy - G.y) / lang];
  await s.mouse.move(G.gx + 4 * ux, G.gy + 4 * uy, { steps: 4 });
  await s.waitForTimeout(300);
  await s.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await s.mouse.move(G.gx + (4 + 1.5 * i) * ux, G.gy + (4 + 1.5 * i) * uy);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(300);
  await bild('f');
  await s.mouse.up();
  await s.waitForTimeout(300);
}
await s.keyboard.press('Escape');
await s.waitForTimeout(300);
// das Plus
const plus = await s.evaluate(() => {
  const r = document.querySelector('#ebenen .ebene.neu .linse').getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
});
await klick(plus[0], plus[1]);
await s.waitForTimeout(1300);
await s.mouse.move(600, 520, { steps: 4 });
await bild('g');
await s.keyboard.press('Meta+z');
await s.waitForTimeout(1200);
// heranzoomen
F = await O('faecher');
const vorn = F.kopien.find((q) => q.aktiv) ?? F.kopien[0];
await s.mouse.move(vorn.x, vorn.y, { steps: 4 });
await s.waitForTimeout(250);
await s.mouse.wheel(0, -420);
await s.waitForTimeout(900);
await s.mouse.move(vorn.x + 120, vorn.y + 90, { steps: 4 });
await bild('h');
await s.keyboard.press('Home');
await s.waitForTimeout(700);
// zusammenschieben
await s.keyboard.press('x');
await steht(0);
await s.mouse.move(560, 500, { steps: 4 });
await bild('i');
// auf dem hellen Solid
await O('material', 'Helles Solid');
await s.waitForTimeout(900);
await s.keyboard.press('x');
await steht(1);
await s.mouse.move(600, 520, { steps: 4 });
await bild('j');
const E = (await O('farbe')).ebenen;
console.log(`Ende: ${E.map((e) => `${e.name}: ${e.linien} Farblinien, ${e.fuellungen} Füllungen`).join(' · ')}; Fehler: ${t.fehler.length}${t.fehler.length ? ` (${t.fehler.slice(0, 2).join(' | ')})` : ''}`);
await t.browser.close();
