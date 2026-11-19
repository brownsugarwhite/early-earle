// Bilder zum Paint-Modus, Etappe 4 (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 14): die Szene für das Bildblatt
// „Weichheit, zwei Fassungen der Bedienung“. An Florians Form „strange bird“ auf Wachs, von der Seite, ein runder Fleck auf der
// Flanke (die Stelle sucht das Skript selbst: frei, ohne Falte).
// Aufgenommen wird, was echt ist: die Haut allein, einmal ganz in der Farbe des Körpers, einmal ganz in der Farbe des Flecks, und
// einmal mit der harten Kante; dazu die Linien allein (ohne Zeiger, mit einem Punkt am Zeiger, mit einem gewählten Punkt, mit
// allen gewählt), die Punkte der Farblinie und ihr Verlauf im Bild. Der weiche Übergang und die Bedienung im Bildblatt sind
// daraus zusammengesetzt und gezeichnet (`paint-weich-bogen.html`), nicht gebaut.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html [GIER=-0.62] [NEIGUNG=0] [ZOOM=4] [NUR_ANSICHT=1]
//   node scripts/ozzy/paint-weich-szene.mjs <ordner>   (NUR_ANSICHT: nur ein Bild des Blicks, zum Einstellen)
import fs from 'node:fs';
import { auf } from '../pruefen/ozzy-teile.mjs';

const ordner = process.argv[2] ?? '.';
const KOERPER = [0x3f / 255, 0x7f / 255, 0xd0 / 255];
const FLECK = [0xfb / 255, 0xf6 / 255, 0xea / 255];
const DICHTE = 2;
const t = await auf({ form: 'strange bird', dichte: DICHTE, extra: 'material=wachs&fuellen=0' });
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
// der Blick: von vorn links auf die linke Körperhälfte, nah (gesetzt über den Haken, damit das Bild jedes Mal gleich steht)
await O('blickSetzen', { gier: Number(process.env.GIER ?? -0.62), neigung: Number(process.env.NEIGUNG ?? 0), zoom: Number(process.env.ZOOM ?? 4) });
await s.waitForTimeout(1500);
console.log('Blick:', JSON.stringify(await O('blick')).slice(0, 160));
await s.keyboard.press('b');
await s.waitForTimeout(700);
await s.keyboard.press('p');
await s.waitForTimeout(400);
if (process.env.NUR_ANSICHT) {
  fs.writeFileSync(`${ordner}/ansicht.png`, await s.screenshot());
  await t.browser.close();
  process.exit(0);
}
// die freieste Stelle auf der Flanke: dort liegt der Fleck (so groß, dass um ihn herum Platz für den Verlauf bleibt).
// Frei heißt: Die Form liegt dort offen, und die Tiefe springt nicht (keine Falte, kein Überhang).
const { q, r, sprung } = await s.evaluate(() => {
  const o = window.__ozzy;
  const S = 10;
  const [x0, y0, nx, ny] = [250, 270, 46, 40];
  const tief = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) tief.push(o.farbOrtFrei(x0 + i * S, y0 + j * S) ? o.farbTiefe(x0 + i * S, y0 + j * S) : null);
  const stufen = [];
  for (let j = 0; j < ny; j++)
    for (let i = 0; i + 1 < nx; i++) {
      const [a, b] = [tief[j * nx + i], tief[j * nx + i + 1]];
      if (a !== null && b !== null) stufen.push(Math.abs(a - b));
    }
  stufen.sort((a, b) => a - b);
  const sprung = 6 * stufen[Math.floor(stufen.length / 2)];
  const zu = tief.map((t, n) => {
    if (t === null) return true;
    const [i, j] = [n % nx, Math.floor(n / nx)];
    for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
      if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
      const u = tief[b * nx + a];
      if (u !== null && Math.abs(u - t) > sprung) return true;
    }
    return false;
  });
  let best = { d: -1, x: 0, y: 0 };
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      if (zu[j * nx + i]) continue;
      const [x, y] = [x0 + i * S, y0 + j * S];
      if (Math.hypot(x - 455, y - 470) > 90) continue;
      let d = 1e9;
      for (let b = 0; b < ny; b++) for (let a = 0; a < nx; a++) if (zu[b * nx + a]) d = Math.min(d, Math.hypot((a - i) * S, (b - j) * S));
      if (d > best.d) best = { d, x, y };
    }
  return { q: { x: best.x, y: best.y }, r: Math.min(64, Math.round(0.5 * best.d)), sprung };
});
console.log(`freie Stelle: ${q.x};${q.y}, Halbmesser des Flecks ${r} (Sprung der Tiefe ab ${sprung.toFixed(4)})`);
if (r < 30) throw new Error(`Vorbereitung: keine freie Stelle gefunden (Halbmesser ${r})`);
/** der Ausschnitt um den Fleck (CSS-Pixel) */
const AUS = { x: Math.round(q.x - 2.42 * r), y: Math.round(q.y - 2.2 * r), b: Math.round(4.84 * r), h: Math.round(4.4 * r) };
// der runde Fleck auf der Seite: vier gezogene Punkte, auf dem ersten geschlossen
for (let i = 0; i < 4; i++) {
  const w = (Math.PI / 2) * i - 0.4;
  await zieh(q.x + r * Math.cos(w), q.y + 1.15 * r * Math.sin(w), -0.55 * r * Math.sin(w), 0.63 * r * Math.cos(w));
}
await klick(q.x + r * Math.cos(-0.4), q.y + 1.15 * r * Math.sin(-0.4));
await s.waitForTimeout(400);
await s.keyboard.press('a');
await s.waitForTimeout(400);
{
  const f = await O('farbe');
  if (f.linien !== 1) throw new Error(`Vorbereitung: ${f.linien} Farblinien (erwartet 1)`);
}
const aussen = [q.x + 1.9 * r, q.y + 0.3 * r];
/** die zwei Zeichenflächen allein, im Ausschnitt, als PNG (Daten-Adresse) */
/** der weite Ausschnitt: die ganze Form */
const WEIT = { x: 170, y: 50, b: 1100, h: 733 };
const fangen = (was, AUS0 = AUS) =>
  s.evaluate(
    ({ was, AUS }) => {
      const o = window.__ozzy;
      o.film(true);
      o.bild(1 / 60);
      const c = document.getElementById(was);
      const k = c.width / window.innerWidth;
      const z = document.createElement('canvas');
      z.width = Math.round(AUS.b * k);
      z.height = Math.round(AUS.h * k);
      z.getContext('2d').drawImage(c, Math.round(AUS.x * k), Math.round(AUS.y * k), z.width, z.height, 0, 0, z.width, z.height);
      const aus = z.toDataURL('image/png');
      o.film(false);
      return aus;
    },
    { was, AUS: AUS0 },
  );
const sichern = (name, daten) => fs.writeFileSync(`${ordner}/${name}.png`, Buffer.from(daten.split(',')[1], 'base64'));
const szene = { aus: AUS, weit: WEIT, dichte: DICHTE, mitte: q, halbmesser: r, haut: {}, hautWeit: {}, linien: {} };
await s.mouse.move(1380, 80);
// die Haut ganz in der Farbe des Körpers, ganz in der des Flecks, und mit der harten Kante
await O('farbFuellen', aussen[0], aussen[1], KOERPER);
await O('farbFuellen', q.x, q.y, KOERPER);
await s.waitForTimeout(300);
szene.haut.koerper = await fangen('haut');
szene.hautWeit.koerper = await fangen('haut', WEIT);
await O('farbFuellen', aussen[0], aussen[1], FLECK);
await O('farbFuellen', q.x, q.y, FLECK);
await s.waitForTimeout(300);
szene.haut.fleck = await fangen('haut');
szene.hautWeit.fleck = await fangen('haut', WEIT);
await O('farbFuellen', aussen[0], aussen[1], KOERPER);
await s.waitForTimeout(300);
szene.haut.hart = await fangen('haut');
szene.hautWeit.hart = await fangen('haut', WEIT);
// die Linien allein: ohne Zeiger
szene.linien.ruhe = await fangen('linien');
szene.punkte = (await O('farbPunkte', 0)).punkte;
szene.linie = await O('farbLinieImBild', 0);
// ein Punkt am Zeiger, dann gewählt (der Zeiger ein Stück daneben)
const P = szene.punkte[0];
await s.mouse.move(P.x + 1, P.y + 1, { steps: 6 });
await s.waitForTimeout(500);
szene.linien.haengt = await fangen('linien');
await s.mouse.down();
await s.waitForTimeout(60);
await s.mouse.up();
await s.waitForTimeout(400);
szene.linien.gewaehltMitZeiger = await fangen('linien');
await s.mouse.move(1380, 80, { steps: 4 });
await s.waitForTimeout(400);
szene.linien.gewaehlt = await fangen('linien');
// alle Punkte gewählt
await s.keyboard.press('Meta+a');
await s.waitForTimeout(400);
szene.linien.alle = await fangen('linien');
szene.auswahl = (await O('bearbeiten')).auswahl;
for (const [n, d] of Object.entries(szene.haut)) sichern(`haut-${n}`, d);
for (const [n, d] of Object.entries(szene.linien)) sichern(`linien-${n}`, d);
fs.writeFileSync(`${ordner}/szene.js`, `window.SZENE = ${JSON.stringify(szene)};\n`);
fs.writeFileSync(`${ordner}/ganz.png`, await s.screenshot());
console.log(`Fleck bei ${q.x};${q.y}, Halbmesser ${r}; Ausschnitt ${JSON.stringify(AUS)}`);
console.log(`Szene: ${szene.punkte.length} Punkte, ${szene.linie.length} Orte im Verlauf, gewählt ${szene.auswahl.length}`, fehler.length ? fehler : 'keine Fehler');
await t.browser.close();
