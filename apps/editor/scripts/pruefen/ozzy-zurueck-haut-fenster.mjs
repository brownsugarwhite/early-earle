// Ozzy, B4 im Plan „Ozzy stabil und schnell“ (17.11.2026): ⌘Z fließt zurück, auch die Haut, an „strange bird“ (NAME).
// Bis zum 17.11. glitten nach ⌘Z nur die Linien, die Haut sprang. Jetzt gleitet sie mit, auch wenn ⌘Z das Netz ändert (schon ein
// kleiner Zug verdichtet es). Gemessen an jedem 23. Punkt der gezeigten Haut, Bild für Bild nach ⌘Z: wie weit er noch von seinem Ort
// am Ende liegt (der größte Abstand, in Bildpunkten der Seite).
// Kriterien (Seite, ein Punkt der Mittellinie 60 Bildpunkte gezogen, dann ⌘Z):
//   1  Im ersten Bild nach ⌘Z ist die Haut noch nahe der gezogenen Form (mindestens die halbe Zugweite vom Ende entfernt) und fließt.
//   2  Sie kommt stetig an: kein Schritt größer als die Hälfte des Wegs, nie wieder weg vom Ziel, nach höchstens 16 Bildern am Ziel.
//   3  Die Linien fließen dabei mit (wie bisher).
//   4  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: [NAME=…] node scripts/pruefen/ozzy-zurueck-haut-fenster.mjs
import { auf } from './ozzy-teile.mjs';

const NAME = process.env.NAME ?? 'strange bird';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: NAME });
await geladen();
await s.keyboard.press('1');
await s.waitForTimeout(1200);
await ruhig();
const L = await O('werkLinienDaten');
const mitte = L.find((l) => l.art === 'mitte');
const p = mitte.punkte.filter((x) => x.sichtbar)[7];
const a = (await O('ankerImBild', mitte.id, p.i, 'seite')).find((q) => !q.m);
await s.mouse.move(a.x, a.y, { steps: 4 });
await s.waitForTimeout(400);
await s.mouse.down();
for (let k = 1; k <= 12; k++) {
  await s.mouse.move(a.x - 3 * k, a.y - 4 * k);
  await s.waitForTimeout(25);
}
await s.mouse.up();
await ruhig();
await s.waitForTimeout(1200);
const mass = (await O('blick')).massstab;
await s.mouse.move(60, 860);
await s.waitForTimeout(300);
await O('film', true);
await s.keyboard.press('Meta+z');
const bilder = [];
for (let k = 0; k < 20; k++) {
  bilder.push(
    await s.evaluate(() => {
      window.__ozzy.bild(1 / 60);
      return { ...window.__ozzy.hautStand(true), linien: window.__ozzy.werk().fliesst };
    }),
  );
}
await O('film', false);
const ende = bilder[bilder.length - 1];
const gleichesNetz = bilder.every((b) => b.punkte === ende.punkte);
// je Bild: der größte Abstand eines Punkts von seinem Ort am Ende, in Bildpunkten
const weg = bilder.map((b) => {
  let d = 0;
  for (let i = 0; i + 2 < b.proben.length; i += 3) d = Math.max(d, Math.hypot(b.proben[i] - ende.proben[i], b.proben[i + 1] - ende.proben[i + 1], b.proben[i + 2] - ende.proben[i + 2]));
  return d * mass;
});
const zug = 60;
const amZiel = weg.findIndex((d) => d < 0.05);
let schritt = 0;
let zurueck = 0;
for (let k = 1; k < weg.length; k++) {
  schritt = Math.max(schritt, weg[k - 1] - weg[k]);
  zurueck = Math.max(zurueck, weg[k] - weg[k - 1]);
}
const reihe = weg.slice(0, 16).map((d) => d.toFixed(1)).join(' ');
ok('1 im ersten Bild nach ⌘Z ist die Haut noch bei der gezogenen Form und fließt', gleichesNetz && bilder[0].fliesst && weg[0] >= 0.5 * zug, `Abstand vom Ende im ersten Bild ${weg[0].toFixed(1)} Bildpunkte (Zug ${zug}); fließt ${bilder[0].fliesst}`);
ok('2 sie kommt stetig an', amZiel > 3 && amZiel <= 16 && schritt <= 0.5 * weg[0] + 0.05 && zurueck < 0.05, `je Bild: ${reihe} · am Ziel nach ${amZiel} Bildern, größter Schritt ${schritt.toFixed(1)}, zurück ${zurueck.toFixed(2)}`);
ok('3 die Linien fließen mit', bilder[0].linien && !ende.linien, `erstes Bild ${bilder[0].linien}, am Ende ${ende.linien}`);
ok('4 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
