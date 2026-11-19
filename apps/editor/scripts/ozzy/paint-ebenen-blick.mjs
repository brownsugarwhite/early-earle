// Standbilder zum Paint-Modus, Etappe 5 (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 16): Ebenen. An Florians Form
// „strange bird“, von der Seite, dieselbe Szene wie im Film (`paint-ebenen-szene.mjs`): Ebene 1 der Verlauf, Ebene 2 die Punkte.
//   w1, w2   ohne und mit der zweiten Ebene, ohne Farblinien (außerhalb des Paint-Modus)
//   a1       im Paint-Modus: der Stapel am Rand, an der oberen Ebene wird gemalt
//   a2       die obere Ebene ausgeblendet
//   a3       ihre Linse nach unten gezogen (im Zug festgehalten): Die Punkte liegen unter dem Verlauf
//   b1       an der unteren Ebene gemalt: ihr Verlauf breiter gezogen, die Punkte bleiben darüber
//   b2       eine dritte Ebene dazwischen, grün gefüllt
//   b3       auf dem hellen Solid
//   s1 … s3  der Stapel aus a1, a2, a3, vergrößert
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-ebenen-blick.mjs <ordner>
import fs from 'node:fs';
import { FLECK, GELB, GRUEN, PUNKTE, PUNKT_R, ebeneEins, imStapel, maus, oeffnen } from './paint-ebenen-szene.mjs';

const ordner = process.argv[2];
if (!ordner) throw new Error('Aufruf: node scripts/ozzy/paint-ebenen-blick.mjs <ordner>');
fs.mkdirSync(ordner, { recursive: true });
const t = await oeffnen({ fuellen: '0' });
const { s, O } = t;
const { fleck } = maus(s);
/** die Form allein, und die Form mit dem Stapel am Rand; der Stapel allein */
const FORM = { x: 150, y: 128, width: 490, height: 310 };
const MIT_STAPEL = { x: 150, y: 110, width: 610, height: 390 };
const STAPEL = { x: 664, y: 232, width: 96, height: 96 };
const bild = async (name, clip) => {
  await s.waitForTimeout(350);
  fs.writeFileSync(`${ordner}/${name}.png`, await s.screenshot({ clip }));
};
const weg = () => s.mouse.move(560, 470, { steps: 4 });
await s.evaluate(() => (document.getElementById('hinweis').style.visibility = 'hidden'));

// ---------- Ebene 1: der Verlauf; Ebene 2: die Punkte ----------
await ebeneEins(t);
const unten = (await O('farbEbenen')).ebenen[0].id;
const oben = await O('farbEbene', 'neu');
await s.waitForTimeout(300);
await s.keyboard.press('p');
await s.waitForTimeout(400);
for (const [x, y] of PUNKTE) await fleck(x, y, PUNKT_R);
await s.keyboard.press('a');
await s.waitForTimeout(400);
for (const [x, y] of PUNKTE) await O('farbFuellen', x, y, GELB);
await s.waitForTimeout(400);
{
  const E = (await O('farbe')).ebenen;
  if (E.length !== 2 || E[1].linien !== PUNKTE.length || E[1].fuellungen !== PUNKTE.length) throw new Error(`Vorbereitung: ${JSON.stringify(E)}`);
}

// ---------- w1, w2: ohne Farblinien ----------
await O('malen', false);
await O('farbEbene', 'zeigen', oben, false);
await weg();
await bild('w1', FORM);
await O('farbEbene', 'zeigen', oben, true);
await bild('w2', FORM);
// ---------- b3: auf dem hellen Solid ----------
await O('material', 'Helles Solid');
await s.waitForTimeout(900);
await bild('b3', FORM);
await O('material', 'Wachs');
await s.waitForTimeout(400);
await O('malen', true);
await s.waitForTimeout(500);

// ---------- a1: der Stapel, an der oberen Ebene wird gemalt ----------
await weg();
await bild('a1', MIT_STAPEL);
await bild('s1', STAPEL);
// ---------- a2: ausgeblendet ----------
await O('farbEbene', 'zeigen', oben, false);
await weg();
await bild('a2', MIT_STAPEL);
await bild('s2', STAPEL);
await O('farbEbene', 'zeigen', oben, true);
await s.waitForTimeout(300);
// ---------- a3: die Linse nach unten gezogen, im Zug festgehalten ----------
{
  const S = await imStapel(s, oben);
  await s.mouse.move(S.linse[0], S.linse[1], { steps: 4 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  for (let k = 1; k <= 10; k++) {
    await s.mouse.move(S.linse[0], S.linse[1] + (S.hoch * k) / 10);
    await s.waitForTimeout(30);
  }
  await s.waitForTimeout(500);
  await bild('a3', MIT_STAPEL);
  await bild('s3', STAPEL);
  for (let k = 9; k >= 0; k--) {
    await s.mouse.move(S.linse[0], S.linse[1] + (S.hoch * k) / 10);
    await s.waitForTimeout(30);
  }
  await s.mouse.up();
  await s.waitForTimeout(400);
}
// ---------- b1: an der unteren Ebene gemalt, ihr Verlauf breiter gezogen ----------
{
  await O('farbEbene', 'waehlen', unten);
  await s.waitForTimeout(400);
  const P = (await O('farbPunkte', 0)).punkte;
  const q = P.reduce((a, b) => (b.x - b.y > a.x - a.y ? b : a));
  await s.mouse.move(q.x, q.y, { steps: 5 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(400);
  const g = (await O('farbWeichGriffe'))[0];
  const lang = Math.hypot(g.gx - g.x, g.gy - g.y);
  const [ux, uy] = [(g.gx - g.x) / lang, (g.gy - g.y) / lang];
  await s.mouse.move(g.gx + ux * 4, g.gy + uy * 4, { steps: 5 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  for (let k = 1; k <= 10; k++) {
    await s.mouse.move(g.gx + ux * (4 + 2 * k), g.gy + uy * (4 + 2 * k));
    await s.waitForTimeout(30);
  }
  await s.waitForTimeout(300);
  await s.mouse.up();
  await s.mouse.move(g.gx + ux * 60, g.gy + uy * 60 + 30, { steps: 5 });
  await bild('b1', MIT_STAPEL);
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
}
// ---------- b2: eine dritte Ebene dazwischen, grün gefüllt ----------
{
  await O('farbEbene', 'neu');
  await s.waitForTimeout(300);
  await O('farbFuellen', FLECK.x + 110, FLECK.y + 20, GRUEN);
  await s.waitForTimeout(500);
  await weg();
  await bild('b2', MIT_STAPEL);
}
console.log(`Bilder in ${ordner}; Fehler: ${t.fehler.length}${t.fehler.length ? ` (${t.fehler[0]})` : ''}`);
await t.browser.close();
