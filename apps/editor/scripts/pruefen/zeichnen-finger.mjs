// Prüffenster „Zeichnen“ mit Fingern auf Telefongröße (09.11.2026): Layout (nur Seite und 3D, kein seitliches Scrollen),
// Beispielform beim Start, Bleistift mit einem Finger, zwei Finger zoomen ohne Strich, Zurück-Knopf, Punkt mit dem Finger ziehen.
// Aufruf aus apps/editor (Web-Modus läuft, z. B. `EDITOR_WEB=1 npx vite --port 5197`):
//   node scripts/pruefen/zeichnen-finger.mjs <ordner für Bilder>
// Umgebung: ZEICHNEN_URL (Standard http://localhost:5197/zeichnen.html), CHROME (Pfad zu Chromium, falls nötig).
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.ZEICHNEN_URL ?? 'http://localhost:5197/zeichnen.html';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const seite = await kontext.newPage();
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__zeichnen !== undefined);
await seite.waitForTimeout(400);
const cdp = await kontext.newCDPSession(seite);
const Z = (f, ...a) => seite.evaluate(([f2, a2]) => window.__zeichnen[f2](...a2), [f, a]);
const bild = (x, y) => Z('bild', x, y);
const ergebnis = {};
const pruefungen = [];
const pruefe = (name, ok, wert) => pruefungen.push({ name, ok: !!ok, wert });

async function finger(typ, punkte) {
  await cdp.send('Input.dispatchTouchEvent', { type: typ, touchPoints: punkte.map(([x, y], id) => ({ x, y, id })) });
}
/** ein Finger: Weltpunkte f(t), t ∈ [0, 1] */
async function strich(f, schritte) {
  const [x0, y0] = await bild(f(0).x, f(0).y);
  await finger('touchStart', [[x0, y0]]);
  for (let k = 1; k <= schritte; k++) {
    const p = f(k / schritte);
    await finger('touchMove', [await bild(p.x, p.y)]);
  }
  await finger('touchEnd', []);
  await seite.waitForTimeout(300);
}
async function foto(name) {
  await seite.waitForTimeout(250);
  await seite.screenshot({ path: `${ordner}/${name}`, type: 'jpeg', quality: 82 });
}

// Layout
const layout = await seite.evaluate(() => {
  const r = (id) => document.getElementById(id).getBoundingClientRect();
  const sichtbar = (sel) => {
    const e = document.querySelector(sel);
    return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
  };
  return {
    seite: r('feld-seite'),
    drei: r('feld-3d'),
    front: r('feld-front').width,
    top: r('feld-top').width,
    zurueckKnopf: sichtbar('[data-aktion="zurueck"]'),
    breiter: document.documentElement.scrollWidth > window.innerWidth,
  };
});
ergebnis.layout = layout;
pruefe('Seite oben, 3D unten, Front und Top aus', layout.front === 0 && layout.top === 0 && layout.drei.top >= layout.seite.bottom - 1);
pruefe('kein seitliches Scrollen', !layout.breiter);
pruefe('Zurück-Knopf für Finger sichtbar', layout.zurueckKnopf);

// Beispielform
const start = await Z('pfad');
ergebnis.start = { anker: start?.anker.length, netz: await Z('netz') };
pruefe('Start mit der Beispielform (5 Anker, aufgeblasen)', start?.anker.length === 5 && ergebnis.start.netz?.dreiecke > 1000);
await foto('zeichnen-finger-start-2026-11-09.jpg');

// Bleistift mit einem Finger: Kreis
await strich((t) => {
  const w = Math.PI / 2 + 2 * Math.PI * t * (370 / 360);
  return { x: 150 * Math.cos(w), y: 150 * Math.sin(w) };
}, 90);
const kreis = await Z('pfad');
ergebnis.kreis = { anker: kreis?.anker.length, ecken: kreis?.anker.filter((a) => a.ecke).length, anpassung: await Z('anpassung') };
pruefe('Finger-Strich ersetzt das Beispiel (rund, wenige Anker)', kreis && kreis.anker.length <= 6 && ergebnis.kreis.ecken === 0);

// zwei Finger: auseinander ziehen = zoomen, kein Strich
const kopf = () => seite.evaluate(() => document.querySelector('#feld-seite header').textContent);
const vorher = JSON.stringify(await Z('pfad'));
{
  const [mx, my] = await bild(0, 0);
  await finger('touchStart', [[mx - 40, my]]);
  await finger('touchStart', [
    [mx - 40, my],
    [mx + 40, my],
  ]);
  for (let k = 1; k <= 10; k++)
    await finger('touchMove', [
      [mx - 40 - 6 * k, my],
      [mx + 40 + 6 * k, my],
    ]);
  await finger('touchEnd', []);
  await seite.waitForTimeout(300);
}
ergebnis.zoom = { kopf: await kopf(), skala: await Z('skala') };
pruefe('zwei Finger zoomen (Kopf zeigt %)', /%/.test(ergebnis.zoom.kopf), ergebnis.zoom.kopf);
pruefe('zwei Finger zeichnen nichts', JSON.stringify(await Z('pfad')) === vorher);
await foto('zeichnen-finger-zoom-2026-11-09.jpg');

// Zurück-Knopf: das Beispiel kommt wieder
await seite.tap('[data-aktion="zurueck"]');
await seite.waitForTimeout(300);
pruefe('Zurück-Knopf holt das Beispiel zurück', (await Z('pfad'))?.anker.length === 5);

// Auswahl: obersten Punkt mit dem Finger 6 px neben ihm greifen und 50 px hoch ziehen
await seite.tap('[data-werkzeug="auswahl"]');
await seite.waitForTimeout(200);
{
  const p = await Z('pfad');
  const oben = p.anker.reduce((a, b) => (b.y > a.y ? b : a));
  const [x, y] = await bild(oben.x, oben.y);
  await finger('touchStart', [[x + 6, y + 4]]);
  for (let k = 1; k <= 10; k++) await finger('touchMove', [[x + 6, y + 4 - 5 * k]]);
  await finger('touchEnd', []);
  await seite.waitForTimeout(300);
  const nach = await Z('pfad');
  const neu = nach.anker.reduce((a, b) => (b.y > a.y ? b : a));
  ergebnis.ziehen = { vorher: oben.y, nachher: neu.y, skala: await Z('skala') };
  pruefe('Punkt mit dem Finger getroffen und gezogen', neu.y - oben.y > 40 / ergebnis.ziehen.skala, neu.y - oben.y);
}
await foto('zeichnen-finger-auswahl-2026-11-09.jpg');

ergebnis.fehler = fehler;
ergebnis.pruefungen = pruefungen;
console.log(JSON.stringify(ergebnis, null, 1));
console.log(pruefungen.every((p) => p.ok) && fehler.length === 0 ? 'ALLES GUT' : 'FEHLER');
await browser.close();
