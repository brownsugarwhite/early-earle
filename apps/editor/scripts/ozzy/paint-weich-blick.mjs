// Bilder zum Paint-Modus, Etappe 4 (gebaut): derselbe Fleck wie im Bildblatt der Bedienung, jetzt mit echter Weichheit. An „strange
// bird“ auf Wachs, von der Seite. Setzt die Breiten über den Haken `farbBreite` (in Bildpunkten gedacht, in Einheiten des Werks
// umgerechnet) und nimmt die Form im Ganzen und den Ausschnitt um den Fleck auf.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-weich-blick.mjs <ordner>
import fs from 'node:fs';
import { auf } from '../pruefen/ozzy-teile.mjs';

const ordner = process.argv[2] ?? '.';
const KOERPER = [0x3f / 255, 0x7f / 255, 0xd0 / 255];
const FLECK = [0xfb / 255, 0xf6 / 255, 0xea / 255];
const t = await auf({ form: 'strange bird', dichte: 2, extra: `material=${process.env.MATERIAL ?? 'wachs'}&fuellen=0` });
const { s, O, geladen, klick, fehler } = t;
await geladen();
const zieh = async (x, y, dx, dy) => {
  await s.mouse.move(x, y, { steps: 5 });
  await s.waitForTimeout(200);
  await s.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await s.mouse.move(x + (dx * i) / 6, y + (dy * i) / 6);
    await s.waitForTimeout(22);
  }
  await s.mouse.up();
  await s.waitForTimeout(220);
};
await O('blickSetzen', { gier: -0.62, neigung: 0, zoom: 4 });
await s.waitForTimeout(1500);
await s.keyboard.press('b');
await s.waitForTimeout(700);
await s.keyboard.press('p');
await s.waitForTimeout(400);
const q = { x: 530, y: 510 };
const r = 64;
for (let i = 0; i < 4; i++) {
  const w = (Math.PI / 2) * i - 0.4;
  await zieh(q.x + r * Math.cos(w), q.y + 1.15 * r * Math.sin(w), -0.55 * r * Math.sin(w), 0.63 * r * Math.cos(w));
}
await klick(q.x + r * Math.cos(-0.4), q.y + 1.15 * r * Math.sin(-0.4));
await s.waitForTimeout(400);
await s.keyboard.press('a');
await s.waitForTimeout(400);
const f = await O('farbe');
if (f.linien !== 1) throw new Error(`Vorbereitung: ${f.linien} Farblinien (erwartet 1)`);
await O('farbFuellen', q.x + 1.9 * r, q.y + 0.3 * r, KOERPER);
if (!process.env.OHNE_FLECK) await O('farbFuellen', q.x, q.y, FLECK);
await s.mouse.move(1380, 80);
await s.waitForTimeout(400);
// Einheiten des Werks je CSS-Pixel: der Maßstab des Blicks (Bildpunkte je Einheit der Welt) und das Maß der Form
const blick = await O('blick');
const jePixel = (await s.evaluate(() => window.__ozzy.werk().f ?? 1)) / (blick.massstab / 2);
const AUS = { x: 375, y: 369, width: 310, height: 282 };
const bild = async (name) => {
  await s.waitForTimeout(500);
  fs.writeFileSync(`${ordner}/${name}-ganz.png`, await s.screenshot({ clip: { x: 170, y: 50, width: 1100, height: 733 } }));
  fs.writeFileSync(`${ordner}/${name}-nah.png`, await s.screenshot({ clip: AUS }));
};
// ---------- die Bilder für das Bildblatt ----------
const wahlWeg = async () => {
  await s.keyboard.press('Escape');
  await s.mouse.move(1380, 80);
  await s.waitForTimeout(300);
};
// die harte Kante, ohne Farblinien (Paint-Modus aus) und mit ihnen
await s.keyboard.press('b');
await bild('hart-ohne');
await s.keyboard.press('b');
await s.waitForTimeout(600);
await bild('0-hart');
// ein Punkt gewählt: sein hohler Tropfen
const P = (await O('farbPunkte', 0)).punkte;
await klick(P[0].x, P[0].y);
{
  // (der Zeiger auf dem Tropfen)
  const g = (await O('farbWeichGriffe'))[0];
  const lang = Math.hypot(g.gx - g.x, g.gy - g.y);
  await s.mouse.move(g.gx + ((g.gx - g.x) / lang) * 5, g.gy + ((g.gy - g.y) / lang) * 5, { steps: 4 });
}
await bild('a1');
// den Tropfen 30 Pixel wegziehen (der Zeiger bleibt an ihm)
{
  const g = (await O('farbWeichGriffe'))[0];
  const lang = Math.hypot(g.gx - g.x, g.gy - g.y);
  const [ux, uy] = [(g.gx - g.x) / lang, (g.gy - g.y) / lang];
  await s.mouse.move(g.gx + ux * 4, g.gy + uy * 4, { steps: 5 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await s.mouse.move(g.gx + ux * (4 + 3 * i), g.gy + uy * (4 + 3 * i));
    await s.waitForTimeout(25);
  }
  await bild('a2');
  await s.mouse.up();
  await s.waitForTimeout(300);
}
const setzen = async (B) => {
  for (let k = 0; k < 4; k++) await O('farbBreite', 0, k, B[k] * jePixel);
};
// oben breit, an den Seiten schmaler, unten hart; alle Punkte gewählt: jeder zeigt seinen Tropfen
await wahlWeg();
await setzen([24, 0, 14, 36]);
await s.keyboard.press('Meta+a');
await s.waitForTimeout(300);
await bild('a3');
console.log('Ziel:', JSON.stringify(await O('farbWeich')), JSON.stringify((await O('farbe')).anzeige));
await wahlWeg();
await bild('1-ziel');
await s.keyboard.press('b');
await bild('ziel-ohne');
await s.keyboard.press('b');
await s.waitForTimeout(600);
await setzen([30, 0, 0, 0]);
await bild('2-ein-punkt');
await setzen([16, 16, 16, 16]);
await bild('3-rundum');
await s.keyboard.press('b');
await bild('4-rundum-ohne-linien');
console.log(`Werk je CSS-Pixel ${jePixel.toFixed(3)}`, fehler.length ? fehler : 'keine Fehler');
await t.browser.close();
