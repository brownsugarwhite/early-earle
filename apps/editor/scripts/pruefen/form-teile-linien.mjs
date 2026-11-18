// Form zuerst (05.11.2026), Probe „Teile in ?linien“, mit der Maus.
// Ein Umriss mit flacher Einbuchtung zwischen Kopf und Bauch; die Spitze mit der Maus tiefer ziehen: Schon beim Ziehen zeigt die
// Seite die Naht (Bild mitten im Zug), beim Loslassen wird geteilt. Dann wie Florian: im Top die Linie des Kopfs anfassen und
// hineinziehen (Kopf schmaler), die des Bauchs anfassen und hinausziehen (Bauch breiter); jede Linie gehört ihrem Teil. ⌘Z zurück,
// an der Kugel eine Naht von Hand. Gemessen je Stand: Teile, Linien je Teil, gestrichelte Stücke je Blatt, dicht nach Lage,
// umgeklappte Dreiecke, Tiefe am Kopf und am Bauch, Bauzeit; dazu die Zeit je Mausbewegung mit Teilen.
// Aufruf aus apps/editor: node scripts/pruefen/form-teile-linien.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.FORM_URL ?? 'http://localhost:5193/form.html?linien';
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
/** dicht nach Lage und umgeklappte Dreiecke (sichtbar ≥ 1 Einheit², sonst Splitter) des Körpers */
const pruefen = () =>
  seite.evaluate(() => {
    const g = window.__formSzene.umriss.geometry;
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    const ind = g.index.array;
    const id = new Map();
    const kanten = new Map();
    const nr = (v) => {
      const k = `${p[3 * v].toFixed(3)},${p[3 * v + 1].toFixed(3)},${p[3 * v + 2].toFixed(3)}`;
      let r = id.get(k);
      if (r === undefined) id.set(k, (r = id.size));
      return r;
    };
    let um = 0;
    let splitter = 0;
    for (let t = 0; t < ind.length; t += 3) {
      const [a, b, c] = [ind[t], ind[t + 1], ind[t + 2]];
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
    let offen = 0;
    let mehr = 0;
    for (const z of kanten.values()) {
      if (z < 2) offen++;
      if (z > 2) mehr++;
    }
    return { offen, mehr, umgeklappt: um, splitter };
  });
/** größte Tiefe |z| des Körpers in einem Bereich der Seite */
const tiefe = (x0, x1, y0, y1) =>
  seite.evaluate(
    ([x0, x1, y0, y1]) => {
      const p = window.__formSzene.umriss.geometry.attributes.position.array;
      let z = 0;
      for (let v = 0; v < p.length / 3; v++) {
        if (p[3 * v] >= x0 && p[3 * v] <= x1 && p[3 * v + 1] >= y0 && p[3 * v + 1] <= y1) z = Math.max(z, Math.abs(p[3 * v + 2]));
      }
      return z;
    },
    [x0, x1, y0, y1],
  );
const stand = async (name, bild = true) => {
  const p = await pruefen();
  const info = await seite.evaluate(() => ({
    teile: window.__form.teile.length,
    linien: window.__form.raum.map((l) => (l.teil === undefined ? 'Körper' : `Teil ${l.teil}`)),
    ms: window.__form.ms,
    dreiecke: window.__form.dreiecke,
    wert: document.getElementById('teile-wert').textContent,
    verdeckt: ['zeichnung', 'profil-front', 'profil-top'].map((id) => document.querySelectorAll(`#${id} path.verdeckt`).length),
  }));
  const kopf = await tiefe(-210, -140, 40, 160);
  const bauch = await tiefe(-60, 120, -160, -40);
  console.log(
    name,
    `· Teile ${info.teile}, Linien [${info.linien.join(', ')}]`,
    `· gestrichelt Seite/Front/Top ${info.verdeckt.join('/')}`,
    `· offen ${p.offen}, mehr ${p.mehr}, umgeklappt ${p.umgeklappt} (+ ${p.splitter} Splitter)`,
    `· Tiefe Kopf ${kopf.toFixed(1)}, Bauch ${bauch.toFixed(1)}`,
    `· ab ${info.wert} · ${info.dreiecke} Dreiecke, Bau ${info.ms.toFixed(0)} ms`,
  );
  if (bild) await seite.screenshot({ path: `${ordner}/form-teile-linien-${name}-2026-11-05.jpg`, type: 'jpeg', quality: 88 });
  return { ...p, ...info, kopf, bauch };
};
await seite.goto(basis);
await fertig();
const s = await seite.evaluate(() => Math.min(document.getElementById('feld-seite').getBoundingClientRect().width, document.getElementById('feld-seite').getBoundingClientRect().height) / 560);
/** Bildschirmlage eines Punkts eines Blatts (Welt: Seite (x, y), Top (x, z), Front (z, y)) */
const ort = (feld, a, b) =>
  seite.evaluate(
    ([feld, a, b]) => {
      const r = document.getElementById(feld).getBoundingClientRect();
      const s = Math.min(r.width, r.height) / 560;
      const [u, v] = feld === 'feld-seite' ? [a, -b] : feld === 'feld-top' ? [a, b] : [a, -b];
      return [r.left + r.width / 2 + u * s, r.top + r.height / 2 + v * s];
    },
    [feld, a, b],
  );
const mitte = (sel) =>
  seite.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
  }, sel);
/** ziehen; `zwischen` wird nach der Hälfte des Wegs aufgerufen (Maus noch gedrückt) */
const ziehen = async (a, b, zwischen) => {
  await seite.mouse.move(a[0], a[1]);
  await seite.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await seite.mouse.move(a[0] + ((b[0] - a[0]) * i) / 12, a[1] + ((b[1] - a[1]) * i) / 12);
    await seite.waitForTimeout(20);
    if (i === 12 && zwischen) await zwischen();
  }
  await seite.mouse.up();
  await fertig();
};

// ---------- Kopf über Bauch: flache Einbuchtung, mit der Maus vertieft ----------
const flach = [
  { x: 150, y: 0 },
  { x: 80, y: 130 },
  { x: -40, y: 150 },
  { x: -150, y: 120 },
  { x: -200, y: 60 },
  { x: -170, y: 22 },
  { x: -130, y: 24 },
  { x: -120, y: 15 },
  { x: -130, y: 4 },
  { x: -180, y: -40 },
  { x: -120, y: -130 },
  { x: 0, y: -150 },
  { x: 110, y: -110 },
];
await seite.evaluate((p) => window.__formSetzen(p), flach);
await fertig();
await stand('flach', false);
const spitze = await mitte('#zeichnung [data-punkt="7"]:not([data-teil])');
let vorschau = 0;
await ziehen(spitze, [spitze[0] + 70 * s, spitze[1]], async () => {
  await seite.waitForTimeout(150);
  vorschau = await seite.evaluate(() => document.querySelectorAll('#zeichnung .naht-vorschau').length);
  await seite.screenshot({ path: `${ordner}/form-teile-linien-naht-beim-ziehen-2026-11-05.jpg`, type: 'jpeg', quality: 88 });
});
console.log(`  Naht beim Ziehen sichtbar: ${vorschau > 0}`);
const geteilt = await stand('geteilt');
// Top: die Linie des Kopfs (Teil 0 → Kontur 1) bei x = −150 anfassen und hineinziehen
const zKopf = await seite.evaluate(() => window.__formKontur(1, 'top', -150));
const aKopf = await ort('feld-top', -150, zKopf);
await ziehen(aKopf, [aKopf[0], aKopf[1] - 30 * s]);
const schmal = await stand('kopf-schmal');
// Top: die Linie des Bauchs (Kontur 0) bei x = 60 anfassen und hinausziehen
const zBauch = await seite.evaluate(() => window.__formKontur(0, 'top', 60));
const aBauch = await ort('feld-top', 60, zBauch);
await ziehen(aBauch, [aBauch[0], aBauch[1] + 35 * s]);
const breit = await stand('bauch-breit');
// ⌘Z zweimal: zurück zur Teilung ohne Linien
for (let k = 0; k < 2; k++) await seite.keyboard.press('Meta+z');
await fertig();
const zurueck = await stand('zurueck', false);

// ---------- Zeit je Mausbewegung mit Teilen (Zeichnen, grober Bau) ----------
const zeit = await seite.evaluate(async () => {
  const el = document.querySelector('#zeichnung [data-punkt="1"]:not([data-teil])');
  const b = el.getBoundingClientRect();
  const x0 = b.x + b.width / 2;
  const y0 = b.y + b.height / 2;
  const svg = el.ownerSVGElement;
  const ev = (art, x, y) => new PointerEvent(art, { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0, buttons: 1 });
  el.dispatchEvent(ev('pointerdown', x0, y0));
  const zeichnen = [];
  const bau = [];
  for (let k = 1; k <= 12; k++) {
    const t0 = performance.now();
    svg.dispatchEvent(ev('pointermove', x0 + k, y0 - k));
    zeichnen.push(performance.now() - t0);
    await new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f)));
    bau.push(window.__form.ms);
  }
  svg.dispatchEvent(ev('pointerup', x0 + 12, y0 - 12));
  const med = (a) => [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)];
  return { zeichnen: med(zeichnen), bau: med(bau) };
});
await fertig();
console.log(`  Zug mit Teilen: Zeichnen ${zeit.zeichnen.toFixed(1)} ms, grober Bau ${zeit.bau.toFixed(1)} ms (Median über 12 Bewegungen)`);

// ---------- Kugel: Naht von Hand ----------
await seite.evaluate(() =>
  window.__formSetzen([
    { x: 150, y: 0 },
    { x: 0, y: 150 },
    { x: -150, y: 0 },
    { x: 0, y: -150 },
  ]),
);
await fertig();
await seite.click('#naht-knopf');
await ziehen(await ort('feld-seite', -60, 200), await ort('feld-seite', -60, -200));
const naht = await stand('naht-kugel');
console.log(`Fehler im Fenster: ${fehler.length ? fehler.join(' | ') : 'keine'}`);
console.log(
  JSON.stringify({
    vorschau,
    geteilt: geteilt.teile,
    kopf: [geteilt.kopf, schmal.kopf, breit.kopf],
    bauch: [geteilt.bauch, schmal.bauch, breit.bauch],
    zurueck: [zurueck.teile, zurueck.linien.length],
    naht: naht.teile,
  }),
);
await browser.close();
