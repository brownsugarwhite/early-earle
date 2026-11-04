// Form zuerst (04.11.2026), Probe „Getrennte Kiefer und Maulpunkte“, mit der Maus.
// Maullinie ziehen, dann eine zweite Linie zum selben Mundwinkel (über dem Schlitz: Überbiss, darunter: Unterbiss); öffnen über
// die Pose; Punkte der Maullinie einfügen, mit ⇧ mehrere wählen und gemeinsam ziehen, löschen. Gemessen je Stand: welcher Kiefer
// der kürzere ist, dicht nach Lage (Körper und Inneres), umgeklappte Dreiecke (sichtbar: Fläche ≥ 1 Einheit², sonst Splitter).
// Aufruf aus apps/editor: node scripts/pruefen/form-kiefer-probe.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.FORM_URL ?? 'http://localhost:5193/form.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
const fertig = async () => {
  await seite.waitForFunction(() => window.__form?.fein === true);
  await seite.waitForTimeout(300);
};
const pruefen = () =>
  seite.evaluate(() => {
    const teile = [window.__formSzene.umriss.geometry, window.__formSzene.innen.geometry].filter((g) => g.index && g.attributes.position);
    const id = new Map();
    const kanten = new Map();
    let um = 0;
    let splitter = 0;
    for (const g of teile) {
      const p = g.attributes.position.array;
      const n = g.attributes.normal.array;
      const ind = g.index.array;
      const nr = (v) => {
        const k = `${p[3 * v].toFixed(3)},${p[3 * v + 1].toFixed(3)},${p[3 * v + 2].toFixed(3)}`;
        let r = id.get(k);
        if (r === undefined) id.set(k, (r = id.size));
        return r;
      };
      for (let t = 0; t < ind.length; t += 3) {
        const a = ind[t];
        const b = ind[t + 1];
        const c = ind[t + 2];
        const e = [nr(a), nr(b), nr(c)];
        if (e[0] !== e[1] && e[1] !== e[2] && e[2] !== e[0]) {
          for (let k = 0; k < 3; k++) {
            const x = e[k];
            const y = e[(k + 1) % 3];
            const key = x < y ? `${x},${y}` : `${y},${x}`;
            kanten.set(key, (kanten.get(key) ?? 0) + 1);
          }
        }
        const ab = [p[3 * b] - p[3 * a], p[3 * b + 1] - p[3 * a + 1], p[3 * b + 2] - p[3 * a + 2]];
        const ac = [p[3 * c] - p[3 * a], p[3 * c + 1] - p[3 * a + 1], p[3 * c + 2] - p[3 * a + 2]];
        const f = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
        const s = [0, 1, 2].map((i) => n[3 * a + i] + n[3 * b + i] + n[3 * c + i]);
        if (f[0] * s[0] + f[1] * s[1] + f[2] * s[2] < 0) {
          if (Math.hypot(...f) / 2 < 1) splitter++;
          else um++;
        }
      }
    }
    let offen = 0;
    let mehr = 0;
    for (const z of kanten.values()) {
      if (z < 2) offen++;
      if (z > 2) mehr++;
    }
    return { offen, mehr, umgeklappt: um, splitter };
  });
const stand = async (name, bild = true) => {
  const p = await pruefen();
  const info = await seite.evaluate(() => ({ schnitt: window.__form.schnitt, maul: window.__form.maul, pose: window.__form.pose }));
  console.log(
    name,
    `· Maul ${info.schnitt ? 'geschnitten' : 'fehlt'}${info.schnitt?.kurz ? `, kürzer: ${info.schnitt.kurz === 'unten' ? 'Unterkiefer' : 'Oberkiefer'}` : ', Kiefer gleich'}`,
    `· Punkte ${info.maul?.punkte.length ?? 0}${info.maul?.kurz ? ` + ${info.maul.kurz.length}` : ''}`,
    `· Pose ${info.pose.an ? `an (Kiefer ${info.pose.kiefer}°, Kopf ${info.pose.schaedel}°)` : 'aus'}`,
    `· offen ${p.offen}, mehr ${p.mehr}, umgeklappt ${p.umgeklappt} (+ ${p.splitter} Splitter < 1 Einheit²)`,
  );
  if (bild) await seite.screenshot({ path: `${ordner}/form-kiefer-${name}.jpg`, type: 'jpeg', quality: 88 });
  return { ...p, ...info };
};
const ort = (a, b) =>
  seite.evaluate(
    ([a, b]) => {
      const r = document.getElementById('feld-seite').getBoundingClientRect();
      const s = Math.min(r.width, r.height) / 560;
      return [r.left + r.width / 2 + a * s, r.top + r.height / 2 - b * s];
    },
    [a, b],
  );
const ziehen = async (punkte, warten = true) => {
  const [x0, y0] = punkte[0];
  await seite.mouse.move(x0, y0);
  await seite.mouse.down();
  for (let k = 1; k < punkte.length; k++) {
    const [xa, ya] = punkte[k - 1];
    const [xb, yb] = punkte[k];
    for (let i = 1; i <= 8; i++) {
      await seite.mouse.move(xa + ((xb - xa) * i) / 8, ya + ((yb - ya) * i) / 8);
      await seite.waitForTimeout(15);
    }
  }
  await seite.mouse.up();
  if (warten) await fertig();
};
const strich = async (liste) => {
  const p = [];
  for (const [x, y] of liste) p.push(await ort(x, y));
  await ziehen(p);
};
const pose = async (kiefer, kopf, an = true) => {
  await seite.evaluate(([k, s, an]) => window.__formPose({ kiefer: k, schaedel: s, zuege: [] }, an), [kiefer, kopf, an]);
  await seite.waitForTimeout(250);
};
/** Bildschirmlage eines Maulpunkts (l: Linie, i: Punkt) */
const punktOrt = (l, i) =>
  seite.evaluate(
    ([l, i]) => {
      const e = document.querySelector(`[data-mpunkt="${l}:${i}"]`);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    },
    [l, i],
  );
/** ein Punkt auf der Maullinie l zwischen ihren Punkten i und i + 1 (für Klicks auf die Linie) */
const aufLinie = async (l, i) => {
  const m = await seite.evaluate(() => window.__form.maul);
  const p = l === 1 ? m.kurz : m.punkte;
  return ort((p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
};

await seite.goto(basis);
await fertig();

// ---------- Kugel: Maul, dann die Lippe des Unterkiefers über dem Schlitz (Überbiss) ----------
await strich([
  [-225, 6],
  [-150, 2],
  [-80, -4],
  [-20, -8],
]);
await stand('kugel-gleich');
const mw = await seite.evaluate(() => window.__form.maul.punkte.at(-1));
await strich([
  [-215, 6],
  [-149, 3],
  [-110, 8],
  [-60, 4],
  [mw.x, mw.y],
]);
await stand('kugel-ueberbiss-zu');
for (const w of [20, 40, 55]) {
  await pose(w, 0);
  await stand(`kugel-ueberbiss-${w}`, w === 40);
}
await pose(30, 12);
await stand('kugel-ueberbiss-pose');
await pose(0, 0, false);

// ---------- Maulpunkte: Linie wählen, zwei Punkte einfügen und ziehen (S-Form), zwei Punkte mit ⇧ gemeinsam, löschen ----------
const s = await seite.evaluate(() => Math.min(document.getElementById('feld-seite').getBoundingClientRect().width, document.getElementById('feld-seite').getBoundingClientRect().height) / 560);
let [lx, ly] = await aufLinie(0, 0);
await seite.mouse.click(lx, ly);
await seite.waitForTimeout(450);
const vorEinfuegen = await seite.evaluate(() => window.__form.maul.punkte.length);
// erster neuer Punkt (zwischen 0 und 1) nach unten, zweiter (zwischen 1 und 2) nach oben
[lx, ly] = await aufLinie(0, 0);
await ziehen([
  [lx, ly],
  [lx, ly + 18 * s],
]);
[lx, ly] = await aufLinie(0, 1);
await ziehen([
  [lx, ly],
  [lx, ly - 10 * s],
]);
const nachEinfuegen = await seite.evaluate(() => window.__form.maul.punkte.length);
console.log(`  Punkte eingefügt: ${vorEinfuegen} → ${nachEinfuegen}, S-Form`);
await stand('kugel-punkte-eingefuegt');
await pose(40, 0);
await stand('kugel-punkte-eingefuegt-offen');
await pose(0, 0, false);
// zwei Punkte wählen (der zweite mit ⇧) und gemeinsam ziehen
[lx, ly] = await aufLinie(0, 0);
await seite.mouse.click(lx, ly);
await seite.waitForTimeout(450);
const p1 = await punktOrt(0, 1);
const p2 = await punktOrt(0, 2);
const vorher = await seite.evaluate(() => window.__form.maul.punkte.map((q) => ({ ...q })));
await seite.mouse.click(p1[0], p1[1]);
await seite.waitForTimeout(450);
await seite.keyboard.down('Shift');
await seite.mouse.click(p2[0], p2[1]);
await seite.keyboard.up('Shift');
await seite.waitForTimeout(450);
const p1b = await punktOrt(0, 1);
await ziehen([
  [p1b[0], p1b[1]],
  [p1b[0] - 10 * s, p1b[1] - 12 * s],
]);
const nachher = await seite.evaluate(() => window.__form.maul.punkte.map((q) => ({ ...q })));
const um = (j) => [nachher[j].x - vorher[j].x, nachher[j].y - vorher[j].y].map((v) => v.toFixed(1)).join(', ');
console.log(`  ⇧: Punkt 1 um (${um(1)}), Punkt 2 um (${um(2)}), Punkt 3 (Mundwinkel) um (${um(3)})`);
await stand('kugel-zwei-punkte');
await pose(40, 0);
await stand('kugel-zwei-punkte-offen');
await pose(0, 0, false);
// einen Punkt löschen
[lx, ly] = await aufLinie(0, 0);
await seite.mouse.click(lx, ly);
await seite.waitForTimeout(450);
const p3 = await punktOrt(0, 2);
await seite.mouse.click(p3[0], p3[1]);
await seite.waitForTimeout(450);
await seite.keyboard.press('Backspace');
await fertig();
console.log(`  gelöscht: ${(await seite.evaluate(() => window.__form.maul.punkte.length))} Punkte`);
// die zweite Linie wählen und löschen: Kiefer wieder gleich
[lx, ly] = await aufLinie(1, 1);
await seite.mouse.click(lx, ly);
await seite.waitForTimeout(450);
await seite.keyboard.press('Backspace');
await fertig();
await stand('kugel-zweite-weg', false);

// ---------- Unterbiss: die zweite Linie unter dem Schlitz ----------
const mw2 = await seite.evaluate(() => window.__form.maul.punkte.at(-1));
await strich([
  [-215, -2],
  [-149, -2],
  [-105, -26],
  [-60, -24],
  [mw2.x, mw2.y],
]);
await pose(40, 0);
await stand('kugel-unterbiss-40');
await pose(0, 0, false);

// ---------- Kopf und Langhals mit Überbiss ----------
const wesen = [
  {
    name: 'kopf',
    punkte: [
      { x: -230, y: 10 },
      { x: -150, y: 60 },
      { x: 20, y: 120 },
      { x: 170, y: 60 },
      { x: 180, y: -60 },
      { x: 40, y: -110 },
      { x: -120, y: -55 },
      { x: -225, y: -25 },
    ],
    maul: [
      [-270, -6],
      [-200, -8],
      [-110, -6],
      [-15, 8],
    ],
    zweite: [
      [-262, -2],
      [-226, -4],
      [-170, 6],
      [-90, 10],
    ],
  },
  {
    name: 'langhals',
    punkte: [
      { x: -247, y: 124, ecke: true },
      { x: -200, y: 103 },
      { x: -109, y: 72 },
      { x: -207, y: -102 },
      { x: -170, y: -148 },
      { x: 222, y: -114 },
      { x: 236, y: -47 },
      { x: -24, y: 210 },
    ],
    maul: [
      [-275, 128],
      [-200, 124],
      [-115, 130],
    ],
    zweite: [
      [-272, 133],
      [-240, 130],
      [-180, 136],
    ],
  },
];
for (const w of wesen) {
  await seite.evaluate((p) => window.__formSetzen(p), w.punkte);
  await fertig();
  await strich(w.maul);
  const m = await seite.evaluate(() => window.__form.maul.punkte.at(-1));
  await strich([...w.zweite, [m.x, m.y]]);
  await stand(`${w.name}-ueberbiss-zu`);
  await pose(40, 15);
  await stand(`${w.name}-ueberbiss-pose`);
  await pose(0, 0, false);
}

console.log(fehler.length ? `Fehler im Fenster: ${fehler.join(' | ')}` : 'keine Fehler im Fenster');
await browser.close();
