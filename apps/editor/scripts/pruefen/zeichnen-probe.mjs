// Prüffenster „Zeichnen“ (08.11.2026, Plan „Zeichnen, Aufblasen, Schneiden, Anbauen“, Z0/Z1), mit der Maus.
// A. Bleistift (Faden 100 %): Kreis aus der Hand mit Zittern und Überschießen am Schluss → wenige Anker, Kugel.
// B. Bleistift: Blob mit Kopf und Bauch (organisch) → wenige Anker, aufgeblasen.
// C. Ellipse gezogen, D. Quadrat mit ⇧, E. Zeichenstift (vier Anker, erster schließt), F. Auswahl: oberen Anker 60 px hoch, ⌘Z.
// Aufruf aus apps/editor (Web-Modus läuft, z. B. `EDITOR_WEB=1 npx vite --port 5197`):
//   node scripts/pruefen/zeichnen-probe.mjs <ordner für Bilder>
// Umgebung: ZEICHNEN_URL (Standard http://localhost:5197/zeichnen.html), CHROME (Pfad zu Chromium, falls nötig).
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.ZEICHNEN_URL ?? 'http://localhost:5197/zeichnen.html';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__zeichnen !== undefined);
await seite.waitForTimeout(300);
const Z = (f, ...a) => seite.evaluate(([f2, a2]) => window.__zeichnen[f2](...a2), [f, a]);
const bild = (x, y) => Z('bild', x, y);
const ergebnis = {};

/** Zufall wie im Kern-Test (wiederholbar) */
function zufall(saat) {
  let s = saat >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32 - 0.5;
  };
}

/** Strich mit der Maus: Weltpunkte f(t), t ∈ [0, 1], Zittern in Bildpunkten */
async function strich(f, schritte, zittern, saat) {
  const z = zufall(saat);
  const [x0, y0] = await bild(f(0).x, f(0).y);
  await seite.mouse.move(x0, y0);
  await seite.mouse.down();
  for (let k = 1; k <= schritte; k++) {
    const p = f(k / schritte);
    const [x, y] = await bild(p.x, p.y);
    await seite.mouse.move(x + z() * 2 * zittern, y + z() * 2 * zittern);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(250);
}

async function foto(name) {
  await seite.waitForTimeout(200);
  await seite.screenshot({ path: `${ordner}/${name}`, type: 'jpeg', quality: 82 });
}

// A. Kreis aus der Hand (Radius 140, Mitte 0/0), Anfang oben, überschießt um 12°
await seite.keyboard.press('n');
await strich((t) => {
  const w = Math.PI / 2 + 2 * Math.PI * t * (372 / 360);
  const r = 140 * (1 + 0.025 * Math.sin(3 * w + 0.4));
  return { x: r * Math.cos(w), y: r * Math.sin(w) };
}, 260, 1.2, 7);
ergebnis.kreis = { anpassung: await Z('anpassung'), netz: await Z('netz') };
await foto('zeichnen-bleistift-kreis-2026-11-08.jpg');

// B. Blob mit Kopf (vorn oben) und Bauch, aus der Hand
await strich((t) => {
  const w = 2 * Math.PI * t;
  const r = 150 + 34 * Math.cos(2 * w) + 26 * Math.sin(3 * w + 0.6) + 10 * Math.cos(5 * w);
  return { x: r * Math.cos(w) * 1.15, y: r * Math.sin(w) * 0.85 + 10 };
}, 320, 1.2, 21);
ergebnis.blob = { anpassung: await Z('anpassung'), netz: await Z('netz') };
await seite.keyboard.press('v');
await foto('zeichnen-bleistift-blob-2026-11-08.jpg');

// C. Ellipse
await seite.keyboard.press('e');
{
  const [ax, ay] = await bild(-200, 110);
  const [bx, by] = await bild(200, -110);
  await seite.mouse.move(ax, ay);
  await seite.mouse.down();
  await seite.mouse.move((ax + bx) / 2, (ay + by) / 2, { steps: 6 });
  await seite.mouse.move(bx, by, { steps: 6 });
  await seite.mouse.up();
  await seite.waitForTimeout(250);
}
ergebnis.ellipse = { pfad: (await Z('pfad'))?.anker.length, netz: await Z('netz') };
await seite.keyboard.press('v');
await foto('zeichnen-ellipse-2026-11-08.jpg');

// D. Quadrat mit ⇧ aus der Mitte (⌥)
await seite.keyboard.press('m');
{
  const [ax, ay] = await bild(0, 0);
  const [bx, by] = await bild(150, -130);
  await seite.mouse.move(ax, ay);
  await seite.keyboard.down('Shift');
  await seite.keyboard.down('Alt');
  await seite.mouse.down();
  await seite.mouse.move(bx, by, { steps: 8 });
  await seite.mouse.up();
  await seite.keyboard.up('Alt');
  await seite.keyboard.up('Shift');
  await seite.waitForTimeout(250);
}
{
  const p = await Z('pfad');
  const xs = p.anker.map((a) => a.x);
  const ys = p.anker.map((a) => a.y);
  ergebnis.quadrat = {
    anker: p.anker.length,
    ecken: p.anker.filter((a) => a.ecke).length,
    breite: Math.max(...xs) - Math.min(...xs),
    hoehe: Math.max(...ys) - Math.min(...ys),
    netz: await Z('netz'),
  };
}
await seite.keyboard.press('v');
await foto('zeichnen-quadrat-2026-11-08.jpg');

// E. Zeichenstift: oben glatt nach rechts gezogen, rechts Ecke, unten glatt nach links, links Ecke, erster schließt
await seite.keyboard.press('p');
{
  const punkte = [
    { p: [0, 150], g: [90, 0] },
    { p: [190, 0], g: null },
    { p: [0, -150], g: [-110, 0] },
    { p: [-210, 20], g: null },
  ];
  for (const { p, g } of punkte) {
    const [x, y] = await bild(p[0], p[1]);
    await seite.mouse.move(x, y);
    await seite.mouse.down();
    if (g) {
      const [gx, gy] = await bild(p[0] + g[0], p[1] + g[1]);
      await seite.mouse.move(gx, gy, { steps: 5 });
    }
    await seite.mouse.up();
  }
  const [x, y] = await bild(0, 150);
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  await seite.mouse.up();
  await seite.waitForTimeout(250);
}
{
  const p = await Z('pfad');
  ergebnis.stift = { anker: p.anker.length, ecken: p.anker.filter((a) => a.ecke).length, netz: await Z('netz') };
}
await seite.keyboard.press('v');
await foto('zeichnen-stift-2026-11-08.jpg');

// F. Auswahl: oberen Anker 60 px hoch ziehen, dann ⌘Z
{
  const vorher = await Z('pfad');
  const oben = vorher.anker.reduce((b, a) => (a.y > b.y ? a : b));
  const [x, y] = await bild(oben.x, oben.y);
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  await seite.mouse.move(x, y - 60, { steps: 10 });
  await seite.mouse.up();
  await seite.waitForTimeout(300);
  const nachher = await Z('pfad');
  const neuOben = nachher.anker.reduce((b, a) => (a.y > b.y ? a : b));
  ergebnis.ziehen = { vorher: oben.y, nachher: neuOben.y, skala: await Z('skala'), netz: await Z('netz') };
  await foto('zeichnen-ziehen-2026-11-08.jpg');
  await seite.keyboard.press('Control+z');
  await seite.waitForTimeout(300);
  const zurueck = await Z('pfad');
  ergebnis.zurueck = zurueck.anker.reduce((b, a) => (a.y > b.y ? a : b)).y;
}

ergebnis.striche = (await Z('striche')).length;
ergebnis.fehler = fehler;
console.log(JSON.stringify(ergebnis, null, 1));
await browser.close();
