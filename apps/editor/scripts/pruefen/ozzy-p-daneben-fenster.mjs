// Ozzy, B4 im Plan „Ozzy stabil und schnell“ (17.11.2026): Ein Entwurf mit P gehört seiner Fläche, an „strange bird“ (NAME).
// Bis zum 17.11. drehte ein Klick knapp neben dem Feld die Ansicht und schloss die Vier Ansichten; die angefangene Linie war dann
// nicht mehr fortzusetzen.
// Kriterien (Vier Ansichten, P, zwei Punkte im Feld der Seite gesetzt):
//   1  Ein Klick 12 Punkte neben dem Feld zählt zur Linie (drei Punkte); die Vier Ansichten bleiben offen, nichts dreht sich.
//   2  Ein Klick weit daneben (im Feld des Raums) tut nichts: weiter drei Punkte, Vier Ansichten offen, eine Meldung sagt, warum.
//   3  Esc bricht die Linie ab; danach dreht ein Klick ins Leere wieder (ohne angefangene Linie ist alles wie bisher).
//   4  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: [NAME=…] [ALT=1] node scripts/pruefen/ozzy-p-daneben-fenster.mjs
// ALT=1: zum Vergleich das Verhalten bis zum 17.11. (für diesen Lauf im ausgelieferten Modul nachgestellt; 1 und 2 halten dann nicht)
import { auf } from './ozzy-teile.mjs';

const NAME = process.env.NAME ?? 'strange bird';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const { browser, s, O, geladen, ruhig, klick, fehler } = await auf({ form: NAME, flicken: process.env.ALT === '1' ? { '**/src/ozzy/werkBlatt.ts*': [['r <= ENTWURF_RAND', 'r <= 0']], '**/src/ozzy/main.ts*': [['if (bearbeiten.stift && werkBlatt.entwurfOffen) {', 'if (false) {']] } : {} });
await geladen();
await s.keyboard.press('Tab');
await s.waitForTimeout(1800);
await ruhig();
await s.keyboard.press('p');
await s.waitForTimeout(300);
const F = (await O('felderJetzt')).seite;
const R = (await O('felderJetzt')).raum;
// zwei Punkte im Leeren des Felds der Seite (oben links, weit von der Form)
await klick(F.x + 70, F.y + 60);
await klick(F.x + 150, F.y + 90);
const b0 = await O('bearbeiten');
const blick0 = await O('blick');
// 1 knapp neben dem Feld (links von seinem Rand)
await klick(F.x - 12, F.y + 150);
const b1 = await O('bearbeiten');
const blick1 = await O('blick');
ok('1 ein Klick knapp neben dem Feld zählt zur Linie', b0.entwurf === 2 && b1.entwurf === 3 && blick1.vier > 0.999 && Math.abs(blick1.gier - blick0.gier) < 1e-9, `Punkte ${b0.entwurf} → ${b1.entwurf}, Vier Ansichten ${blick1.vier > 0.999 ? 'offen' : 'zu'}, Gier ${blick0.gier.toFixed(3)} → ${blick1.gier.toFixed(3)}`);
// 2 weit daneben: im Feld des Raums
await klick(R.x + R.w / 2, R.y + R.h / 2 + 40);
await s.waitForTimeout(600);
const b2 = await O('bearbeiten');
const blick2 = await O('blick');
ok('2 ein Klick weit daneben tut nichts und sagt, warum', b2.entwurf === b1.entwurf && blick2.vier > 0.999 && Math.abs(blick2.gier - blick1.gier) < 1e-9 && /Linie gehört/.test(b2.meldung), `Punkte ${b1.entwurf} → ${b2.entwurf}, Vier Ansichten ${blick2.vier > 0.999 ? 'offen' : 'zu'}, Meldung: ${b2.meldung.slice(0, 50) || 'keine'}`);
// 3 Esc: die Linie ist weg; ein Klick ins Leere (Feld des Raums) dreht wieder
await s.keyboard.press('Escape');
await s.waitForTimeout(400);
const b3 = await O('bearbeiten');
await s.keyboard.press('a');
await s.waitForTimeout(300);
const x0 = R.x + 40;
const y0 = R.y + R.h - 40;
await s.mouse.move(x0, y0, { steps: 3 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 10; k++) {
  await s.mouse.move(x0 + 6 * k, y0);
  await s.waitForTimeout(25);
}
await s.mouse.up();
await s.waitForTimeout(700);
const blick3 = await O('blick');
ok('3 Esc bricht ab; danach dreht Ziehen ins Leere wieder', b3.entwurf === 0 && Math.abs(blick3.gier - blick2.gier) > 0.05, `Punkte ${b3.entwurf}, Gier ${blick2.gier.toFixed(3)} → ${blick3.gier.toFixed(3)}`);
ok('4 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
