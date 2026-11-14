// Form zuerst (04.11.2026): Front und Top zeichnen wie die Seite — mit der Maus wie Florian, jeder Klick auf die Linie, wie
// sie gerade liegt. Aus der Startkugel: in der Seite zwei Beine nach unten ziehen (je zwei neue Punkte), in der Front eines
// (das zweite ist sein Spiegelbild): Es müssen vier Beine stehen. Danach Kopplung (Seite höher → Front folgt) und eine Flosse
// (Top und Front nach außen). Gibt Schnitte und den Zustand aus und schreibt Bilder.
// Aufruf aus apps/editor: node scripts/pruefen/form-beine-ziehen.mjs <ordner>
// Erwartet den Vite-Server des Arbeitsbaums (FORM_URL, Standard http://localhost:5193/form.html).
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(process.env.FORM_URL ?? 'http://localhost:5193/form.html');
await seite.waitForFunction(() => window.__form?.fein === true);
await seite.waitForTimeout(300);

const SVG = { seite: '#zeichnung', front: '#profil-front', top: '#profil-top' };
// Welt → Blatt-Koordinaten (SVG): Seite (x, −y), Front (z, −y), Top (x, z)
const blattVon = (id, u, v) => (id === 'top' ? [u, v] : [u, -v]);

/** Bildschirmpunkt auf der Linie eines Blatts, am nächsten an (u, v) */
const aufLinie = (id, [u, v]) =>
  seite.evaluate(
    ([sel, x, y]) => {
      const p = document.querySelector(`${sel} path.treffer`);
      const l = p.getTotalLength();
      let best = Infinity;
      let q = null;
      for (let s = 0; s <= l; s += 0.5) {
        const a = p.getPointAtLength(s);
        const d = Math.hypot(a.x - x, a.y - y);
        if (d < best) {
          best = d;
          q = a;
        }
      }
      const m = p.getScreenCTM();
      return [m.a * q.x + m.c * q.y + m.e, m.b * q.x + m.d * q.y + m.f];
    },
    [SVG[id], ...blattVon(id, u, v)],
  );
/** Bildschirmpunkt eines Blatt-Punkts (u, v) */
const bild = (id, [u, v]) =>
  seite.evaluate(
    ([sel, x, y]) => {
      const m = document.querySelector(sel).getScreenCTM();
      return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
    },
    [SVG[id], ...blattVon(id, u, v)],
  );
/** Bildschirmpunkt des gesetzten Punkts, der (u, v) am nächsten liegt */
const punktBei = (id, [u, v]) =>
  seite.evaluate(
    ([sel, x, y]) => {
      let best = Infinity;
      let q = null;
      for (const e of document.querySelectorAll(`${sel} [data-punkt], ${sel} [data-ppunkt]`)) {
        const r = e.getBoundingClientRect();
        const c = [r.x + r.width / 2, r.y + r.height / 2];
        const m = e.ownerSVGElement.getScreenCTM();
        const z = [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
        const d = Math.hypot(c[0] - z[0], c[1] - z[1]);
        if (d < best) {
          best = d;
          q = c;
        }
      }
      return q;
    },
    [SVG[id], ...blattVon(id, u, v)],
  );
const fertig = async () => {
  await seite.waitForFunction(() => window.__form?.fein === true);
  await seite.waitForTimeout(250);
};
/** von einem Bildschirmpunkt nach (u2, v2) ziehen */
const ziehen = async ([x, y], id, ziel) => {
  const [x2, y2] = await bild(id, ziel);
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / 8, y + ((y2 - y) * i) / 8);
    await seite.waitForTimeout(30);
  }
  await seite.mouse.up();
  await fertig();
};
const zustand = () =>
  seite.evaluate(() => ({
    seite: window.__form.punkte.length,
    front: window.__form.front?.length ?? null,
    top: window.__form.top?.length ?? null,
    ellipsoide: window.__form.ellipsoide,
    ms: Math.round(window.__form.ms),
  }));
/** Netzpunkte im Schnitt bei y nach Lage */
const schnitt = (y) =>
  seite.evaluate((yy) => {
    const pos = window.__formSzene.umriss.geometry.attributes.position.array;
    const z = {};
    for (let i = 0; i < pos.length; i += 3) {
      if (Math.abs(pos[i + 1] - yy) > 3) continue;
      const k = Math.abs(pos[i + 2]) < 20 ? 'mitte' : `${pos[i] < 0 ? 'vorn' : 'hinten'}-${pos[i + 2] < 0 ? 'links' : 'rechts'}`;
      z[k] = (z[k] ?? 0) + 1;
    }
    return z;
  }, y);

// Seite: Bauch festhalten (Punkte links und rechts der Beine), dann je Bein zwei Punkte nach unten
const kugelBauch = (u) => [u, -Math.sqrt(150 * 150 - u * u)];
for (const u of [-125, -25, 25, 125]) await ziehen(await aufLinie('seite', kugelBauch(u)), 'seite', kugelBauch(u));
for (const [a, b] of [[-95, -55], [55, 95]]) {
  await ziehen(await aufLinie('seite', kugelBauch(a)), 'seite', [a, -230]);
  await ziehen(await aufLinie('seite', kugelBauch(b)), 'seite', [b, -230]);
}
// Front: Sie folgte bis hierher dem Körper der Seite, dessen Beine auf der Mittelebene stehen — ihr unterster Punkt liegt auf
// der Mittelachse bei den Füßen. Ihn hinauf an den Bauch ziehen (er gleitet auf der Achse), Bauch festhalten bei z = 125,
// dann ein Bein bei z ∈ [45, 95] nach unten
await ziehen(await punktBei('front', [0, -230]), 'front', [0, -150]);
await ziehen(await aufLinie('front', kugelBauch(125)), 'front', kugelBauch(125));
await ziehen(await aufLinie('front', [45, -150]), 'front', [45, -230]);
await ziehen(await aufLinie('front', [95, -140]), 'front', [95, -230]);
const beine = { zustand: await zustand(), schnitt: await schnitt(-190) };
await seite.screenshot({ path: `${ordner}/form-beine-ziehen.jpg`, type: 'jpeg', quality: 88 });
console.log('Beine', JSON.stringify(beine));

// Kopplung: den oberen Punkt der Seite höher ziehen → die Front folgt mit ihrem obersten Punkt
const frontOben = () => seite.evaluate(() => Math.max(...window.__form.front.map((p) => p.y)));
const vorher = await frontOben();
await ziehen(await punktBei('seite', [0, 150]), 'seite', [0, 190]);
console.log('Kopplung', JSON.stringify({ frontObenVorher: Math.round(vorher), nachher: Math.round(await frontOben()) }));

// Flosse: im Top die Seite bei x = 0 nach außen (z), in der Front auf halber Höhe nach außen
await ziehen(await aufLinie('top', [0, 150]), 'top', [0, 250]);
await ziehen(await aufLinie('front', [150, 40]), 'front', [250, 40]);
const flosse = await seite.evaluate(() => {
  const pos = window.__formSzene.umriss.geometry.attributes.position.array;
  let zMax = 0;
  for (let i = 2; i < pos.length; i += 3) zMax = Math.max(zMax, pos[i]);
  return Math.round(zMax);
});
await seite.screenshot({ path: `${ordner}/form-flossen-ziehen.jpg`, type: 'jpeg', quality: 88 });
console.log('Flosse', JSON.stringify({ zMax: flosse, zustand: await zustand() }));
if (fehler.length) console.log('Fehler:', fehler);
await browser.close();
