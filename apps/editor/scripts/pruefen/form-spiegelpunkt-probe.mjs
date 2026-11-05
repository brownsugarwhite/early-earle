// Form zuerst (05.11.2026), Griffe an Spiegelpunkten (`kurven.html`), mit der Maus, Florians Fall in der Top-Ansicht:
// Ring waagerecht (Seite), Mitte (Top) und ein Ring senkrecht; die Spitze vorn ist das Ende des waagerechten Rings auf der
// Mittelebene (Spiegelpunkt) und die Kreuzung mit der Mitte. Nase herausziehen, dann im Top:
// A. Spitze anklicken: Der Ring zeigt dort beide Griffe (der zweite ist das Spiegelbild).
// B. Den unteren Griff seitlich ziehen: Er geht frei mit, sein Spiegelbild ebenso, die Linie knickt spiegelgleich, der Punkt wird
//    eine Ecke (vorher ging der Griff nur längs der Tiefe).
// C. Den oberen (gespiegelten) Griff ziehen: dasselbe spiegelbildlich.
// D. Doppelklick auf den Griff: glatt, der Griff steht senkrecht zur Mittelebene, die Spitze wird rund.
// E. ⌘Z bis zum Stand nach der Nase: bitgleich.
// Aufruf aus apps/editor: node scripts/pruefen/form-spiegelpunkt-probe.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);

const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const loops = () => K('loops');
const lagen = () => K('lagen');
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], schritte = 14) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / schritte, y + ((y2 - y) * i) / schritte);
    await seite.waitForTimeout(15);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(300);
};
const doppelklick = async ([x, y]) => {
  await seite.mouse.click(x, y);
  await seite.waitForTimeout(60);
  await seite.mouse.click(x, y);
  await seite.waitForTimeout(300);
};
const weg = (a, b) => {
  if (a.length !== b.length) return Infinity;
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};
/** Mitte des Griffs (Quadrat) im Blatt; m: der gespiegelte (am Spiegelpunkt der mit z < 0) */
const griffMitte = async (a, id, i, g) =>
  seite.evaluate(
    ([a2, id2, i2, g2]) => {
      const e = document.querySelector(`#blatt-${a2} rect.griff[data-l="${id2}"][data-i="${i2}"][data-g="${g2}"]`);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    },
    [a, id, i, g],
  );
const ausschnitt = async (name, a, mitte, breite = 360) => {
  const m = await bild(a, mitte);
  await seite.screenshot({
    path: `${ordner}/form-spiegelpunkt-${name}-2026-11-05.jpg`,
    type: 'jpeg',
    quality: 90,
    clip: { x: m.x - breite * 0.35, y: m.y - breite / 2, width: breite, height: breite },
  });
};
const nah3d = async (name, ziel) => {
  const f = (await K('felder')).drei;
  // schräg von oben auf die Nase (wie das Top, etwas von der Seite)
  await K('kamera', { x: ziel.x + 40, y: ziel.y + 560, z: ziel.z + 260 }, { x: ziel.x + 150, y: ziel.y, z: ziel.z });
  await seite.waitForTimeout(300);
  await seite.screenshot({
    path: `${ordner}/form-spiegelpunkt-${name}-2026-11-05.jpg`,
    type: 'jpeg',
    quality: 90,
    clip: { x: f.x + f.w * 0.05, y: f.y + f.h * 0.12, width: f.w * 0.9, height: f.h * 0.8 },
  });
};
const zeitenText = async () => {
  const z = await K('zeiten');
  const zug = z.zug.slice(-12);
  return `je Mausbewegung ${(zug.reduce((s, v) => s + v, 0) / Math.max(1, zug.length)).toFixed(1)} ms, Bereich ${z.bereich}`;
};

// ---------- Aufbau wie in Florians Bild ----------
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: -200, y: 0, z: 0 })), xy(await bild('seite', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('top', { x: -200, y: 0, z: 0 })), xy(await bild('top', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: -60, y: 200, z: 0 })), xy(await bild('seite', { x: -60, y: -200, z: 0 })), 6);
await seite.keyboard.press('Escape');
let L = await loops();
const ring = L.find((l) => l.art === 'ring' && l.punkte.some((p) => p.ref.x < -100));
let ie = ring.punkte.findIndex((p) => p.ref.x < -100);
const anfang = ring.punkte[ie].s < 1e-6;
const innen = anfang ? 'aus' : 'ein';
const aussen = anfang ? 'ein' : 'aus';
console.log(`Aufbau: ${L.length} Loops; Spitze vorn = Ring ${ring.id} Punkt ${ie} (${anfang ? 'Anfang' : 'Ende'}), Griff nach innen „${innen}“`);

// Nase: die Spitze im Top 80 nach vorn ziehen (Kreuzung: Ring und Mitte gehen mit; Drücken wählt und zieht zugleich — ein Klick
// davor zählte mit dem Drücken als Doppelklick)
const spitze0 = ring.punkte[ie].ref;
await ziehen(xy(await bild('top', spitze0)), xy(await bild('top', { ...spitze0, x: spitze0.x - 80 })), 16);
await seite.keyboard.press('Escape');
await seite.waitForTimeout(150);
L = await loops();
let r = L.find((l) => l.id === ring.id);
const spitze = r.punkte[ie].ref;
console.log(`Nase: Spitze bei x ${spitze.x.toFixed(1)}, Knick des Rings dort ${(await K('knickAm', ring.id, ie)).toFixed(1)}°, umgeschlagen ${await K('umgeschlagen')}`);
const nachNase = await lagen();

// ---------- A. Spitze anklicken: beide Griffe des Spiegelpunkts ----------
await seite.mouse.click(...xy(await bild('top', spitze)));
await seite.waitForTimeout(200);
const wahl = await K('auswahl');
const gInnen = await griffMitte('top', ring.id, ie, innen);
const gAussen = await griffMitte('top', ring.id, ie, aussen);
console.log(
  `A gewählt ${JSON.stringify(wahl)} · Griffe im Top ${await seite.locator('#blatt-top .griff').count()} · ` +
    `Ring-Spitze innen ${gInnen ? gInnen.map((v) => v.toFixed(0)) : 'fehlt'}, gespiegelt ${gAussen ? gAussen.map((v) => v.toFixed(0)) : 'fehlt'}`,
);
await ausschnitt('a-griffe', 'top', spitze);

// ---------- B. unteren Griff (innen, z > 0) seitlich nach rechts ziehen ----------
await ziehen(gInnen, [gInnen[0] + 70, gInnen[1] + 10], 16);
r = (await loops()).find((l) => l.id === ring.id);
const knickB = await K('knickAm', ring.id, ie);
const gB = await griffMitte('top', ring.id, ie, innen);
console.log(
  `B unterer Griff 70 px nach rechts: Spitze bewegt ${gB ? (gB[0] - gInnen[0]).toFixed(0) : '?'} px, Ecke ${r.punkte[ie].ecke} · ` +
    `Knick der Linie an der Spitze ${knickB.toFixed(1)}° · ${await zeitenText()} · umgeschlagen ${await K('umgeschlagen')} · ` +
    `schief ${(await K('symmetrie')).toExponential(1)}`,
);
await ausschnitt('b-geknickt', 'top', spitze);
await nah3d('b-geknickt-3d', spitze);

// ---------- C. den gespiegelten (oberen) Griff weiter nach rechts ziehen ----------
await seite.mouse.click(...xy(await bild('top', spitze)));
await seite.waitForTimeout(200);
const gC = await griffMitte('top', ring.id, ie, aussen);
const gCi = await griffMitte('top', ring.id, ie, innen);
await ziehen(gC, [gC[0] + 40, gC[1]], 12);
const gCi2 = await griffMitte('top', ring.id, ie, innen);
const knickC = await K('knickAm', ring.id, ie);
console.log(
  `C oberer (gespiegelter) Griff 40 px nach rechts: der untere geht mit ${gCi2 && gCi ? (gCi2[0] - gCi[0]).toFixed(0) : '?'} px · ` +
    `Knick ${knickC.toFixed(1)}° · umgeschlagen ${await K('umgeschlagen')} · schief ${(await K('symmetrie')).toExponential(1)}`,
);
await ausschnitt('c-gespiegelt', 'top', spitze);

// ---------- D. Doppelklick auf den Griff: glatt, rund ----------
const gD = await griffMitte('top', ring.id, ie, innen);
await doppelklick(gD);
r = (await loops()).find((l) => l.id === ring.id);
const knickD = await K('knickAm', ring.id, ie);
console.log(
  `D Doppelklick auf den Griff: Ecke ${r.punkte[ie].ecke} · Meldung ${JSON.stringify(await K('meldung'))} · Knick ${knickD.toFixed(1)}° · ` +
    `umgeschlagen ${await K('umgeschlagen')} · schief ${(await K('symmetrie')).toExponential(1)}`,
);
await seite.mouse.click(...xy(await bild('top', spitze)));
await seite.waitForTimeout(200);
await ausschnitt('d-rund', 'top', spitze);
await nah3d('d-rund-3d', spitze);

// ---------- E. ⌘Z bis zur Nase ----------
for (let k = 0; k < 3; k++) {
  await seite.keyboard.press('Meta+z');
  await seite.waitForTimeout(250);
}
r = (await loops()).find((l) => l.id === ring.id);
console.log(`E ⌘Z ×3: wie nach der Nase ${weg(nachNase, await lagen()).toExponential(1)}, Ecke ${r.punkte[ie].ecke}, Knick ${(await K('knickAm', ring.id, ie)).toFixed(1)}°`);
console.log(fehler.length ? `Fehler: ${fehler.join(' | ')}` : 'keine Fehler in der Konsole');
await browser.close();
