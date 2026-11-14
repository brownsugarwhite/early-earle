// Form zuerst (04.11.2026), Probe „Posen“: Knochen (Unterkiefer, Schädel) und Blendshape (Pinsel) mit der Maus.
// Je Wesen: Maullinie ziehen, Schalter „Pose“ an, Regler Maul und Kopf, Pinselstriche in Seite, Front und Top; dann ⌘Z, die
// Grundform ändern (die Pose gilt weiter), Spielnetz an (dieselbe Pose auf dem gebackenen Netz). Gemessen je Stand: dicht nach
// Lage (Körper und Inneres zusammen), umgeklappte Dreiecke, Zahl der Züge, größte Verschiebung gegen den vorigen Stand, Zeit.
// Aufruf aus apps/editor: node scripts/pruefen/form-pose-probe.mjs <ordner>
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
/** dicht nach Lage (Körper + Inneres) und umgeklappte Dreiecke, wie gezeigt */
const pruefen = () =>
  seite.evaluate(() => {
    const teile = [window.__formSzene.umriss.geometry, window.__formSzene.innen.geometry].filter((g) => g.index && g.attributes.position);
    const id = new Map();
    const kanten = new Map();
    let um = 0;
    let splitter = 0;
    const wo = [];
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
          // Splitter (Fläche unter 1 Einheit², bei 300 px Höhe unter einem Pixel) getrennt zählen
          if (Math.hypot(...f) / 2 < 1) splitter++;
          else {
            um++;
            if (wo.length < 6) wo.push([0, 1, 2].map((i) => ((p[3 * a + i] + p[3 * b + i] + p[3 * c + i]) / 3).toFixed(0)).join(','));
          }
        }
      }
    }
    let offen = 0;
    let mehr = 0;
    for (const z of kanten.values()) {
      if (z < 2) offen++;
      if (z > 2) mehr++;
    }
    return { offen, mehr, umgeklappt: um, splitter, wo };
  });
/** die gezeigten Lagen des Körpers (Kopie) */
const lagen = () => seite.evaluate(() => Array.from(window.__formSzene.umriss.geometry.attributes.position.array));
const verschiebung = (a, b) => {
  if (a.length !== b.length) return NaN;
  let m = 0;
  for (let i = 0; i < a.length; i += 3) m = Math.max(m, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2]));
  return m;
};
let vorher = null;
const stand = async (name, bild = true) => {
  const p = await pruefen();
  const info = await seite.evaluate(() => ({ pose: window.__form.pose, spiel: window.__form.spiel }));
  const l = await lagen();
  const v = vorher ? verschiebung(vorher, l) : NaN;
  vorher = l;
  const ps = info.pose;
  console.log(
    name,
    `· Pose ${ps.an ? 'an' : 'aus'}: Kiefer ${ps.kiefer}°, Kopf ${ps.schaedel}°, Züge ${ps.zuege.length}`,
    info.spiel ? `· Spielnetz ${info.spiel.dreiecke}` : '· dicht',
    `· offen ${p.offen}, mehr ${p.mehr}, umgeklappt ${p.umgeklappt} (+ ${p.splitter} Splitter < 1 Einheit²)`,
    p.wo.length ? `bei ${p.wo.join(' | ')}` : '',
    Number.isFinite(v) ? `· größte Verschiebung gegen vorher ${v.toFixed(1)}` : '',
  );
  if (bild) await seite.screenshot({ path: `${ordner}/form-pose-${name}.jpg`, type: 'jpeg', quality: 88 });
  return { ...p, pose: ps, v };
};
/** Bildschirmpunkt zu Koordinaten eines Blatts: Seite (x, y), Front (z, y), Top (x, z) */
const ort = (blatt, a, b) =>
  seite.evaluate(
    ([blatt, a, b]) => {
      const r = document.getElementById(`feld-${blatt}`).getBoundingClientRect();
      const s = Math.min(r.width, r.height) / 560;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return blatt === 'top' ? [cx + a * s, cy + b * s] : [cx + a * s, cy - b * s];
    },
    [blatt, a, b],
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
  else await seite.waitForTimeout(150);
};
/** ein Pinselstrich im Blatt von (a, b) nach (a + da, b + db) in Blattkoordinaten; misst die Zeit je Mausbewegung */
const pinsel = async (blatt, a, b, da, db) => {
  const von = await ort(blatt, a, b);
  const nach = await ort(blatt, a + da, blatt === 'top' ? b + db : b + db);
  const t0 = Date.now();
  await ziehen([von, nach], false);
  return Date.now() - t0;
};
const regler = async (id, w) => {
  const r = await seite.evaluate((id) => {
    const e = document.getElementById(id).getBoundingClientRect();
    return { x: e.left, y: e.top + e.height / 2, w: e.width, max: Number(document.getElementById(id).max) };
  }, id);
  const daumen = 8;
  await seite.mouse.click(r.x + daumen + ((r.w - 2 * daumen) * w) / r.max, r.y);
  await seite.waitForTimeout(250);
};
const klicken = async (id) => {
  const p = await seite.evaluate((id) => {
    const r = document.getElementById(id).getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
  }, id);
  await seite.mouse.click(p[0], p[1]);
  await seite.waitForTimeout(250);
};
const rueckgaengig = async () => {
  await seite.keyboard.press('Meta+z');
  await fertig();
};
/** Zeit einer ganzen Pose (Knochen + Züge) im Fenster: Körper, Inneres, Lippen, Linien, Blätter */
const poseZeit = (pose) =>
  seite.evaluate((pose) => {
    const t = [];
    for (let k = 0; k < 5; k++) {
      const t0 = performance.now();
      window.__formPose(pose, true);
      t.push(performance.now() - t0);
    }
    return Math.min(...t);
  }, pose);

const fressen = {
  kiefer: 40,
  schaedel: 15,
  zuege: [
    { c: [-130, 10, 40], d: [0, 18, 0], r: 60 },
    { c: [-40, -10, 130], d: [0, 0, 15], r: 50 },
  ],
};

await seite.goto(basis);
await fertig();

// ---------- Kugel: Maul, Pose mit der Maus ----------
await ziehen([await ort('seite', -225, 6), await ort('seite', -150, 2), await ort('seite', -80, -4), await ort('seite', -20, -8)]);
await stand('kugel-maul-zu'); // geschlossen liegen Ober- und Unterlippe (und Gaumen und Boden) aufeinander: „mehr“ zählt das
await klicken('pose');
await regler('maul-oeffnung', 40);
await regler('kopf-oeffnung', 15);
await stand('kugel-knochen');
// Seite: Oberlippe vorn hoch (x/y); Front: Wange nach außen (z); Top: Schnauze nach vorn (x); Front ins offene Maul: Gaumen
// bzw. Boden hinten nach unten
const ms = [];
ms.push(await pinsel('seite', -115, 30, 0, 30));
await stand('kugel-pinsel-seite');
ms.push(await pinsel('front', 120, 20, 25, 0));
await stand('kugel-pinsel-front');
ms.push(await pinsel('top', -100, 50, -30, 0));
await stand('kugel-pinsel-top');
ms.push(await pinsel('front', 0, -20, 0, -15));
await stand('kugel-pinsel-innen');
console.log(`  Pinselstriche: ${ms.join(' / ')} ms je Strich mit 16 Mausbewegungen (im Testbrowser ohne Grafikkarte ≈ 90 ms je Bild)`);
// ⌘Z: je Strich ein Schritt, dann die beiden Regler; das Maul bleibt
for (let i = 0; i < 4; i++) await rueckgaengig();
await stand('kugel-zurueck-4', false);
await rueckgaengig();
await rueckgaengig();
const zurueck = await stand('kugel-zurueck-6', false);
const maulDa = await seite.evaluate(() => window.__form.schnitt !== null);
console.log(`  nach sechsmal ⌘Z: Kiefer ${zurueck.pose.kiefer}°, Kopf ${zurueck.pose.schaedel}°, Züge ${zurueck.pose.zuege.length}, Maul ${maulDa ? 'noch da' : 'weg'}`);
// Pose aus: die Grundform ist bitgleich die vor der Pose
await klicken('pose');
const grund = await lagen();
await klicken('pose');
await seite.evaluate((p) => window.__formPose(p, true), fressen);
await seite.waitForTimeout(200);
await stand('kugel-fressen');
await klicken('pose');
const grundWieder = await lagen();
console.log(`  Pose aus nach Pose an: Grundform um ${verschiebung(grund, grundWieder).toFixed(6)} anders`);
// Grundform ändern (Scheitel 25 höher, Pose aus), dann Pose wieder an: sie gilt weiter
const scheitel = await ort('seite', 0, 150);
await ziehen([scheitel, await ort('seite', 0, 175)]);
await stand('kugel-grundform-hoeher', false);
await klicken('pose');
await stand('kugel-fressen-nach-grundform');
console.log(`  Zeit einer Pose (Knochen + 2 Züge, Fenster ganz): ${(await poseZeit(fressen)).toFixed(1)} ms`);
// Spielnetz an: dieselbe Pose auf dem gebackenen Netz
await klicken('spielnetz');
await seite.waitForFunction(() => window.__form?.spiel !== null && window.__form?.fein === true);
await seite.waitForTimeout(300);
await stand('kugel-fressen-spielnetz');
await seite.evaluate(() => window.__formSpielnetz(false));
await fertig();

// ---------- Kopf, Langhals, Vierbeiner: Fressen und ein Pinselstrich in der Seite ----------
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
    strich: [-110, 70, 0, 25],
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
    strich: [-190, 150, 0, 20],
  },
];
for (const w of wesen) {
  await seite.evaluate((p) => window.__formSetzen(p), w.punkte);
  await fertig();
  vorher = null;
  const linie = [];
  for (const [x, y] of w.maul) linie.push(await ort('seite', x, y));
  await ziehen(linie);
  console.log(`  ${w.name}: Maul ${(await seite.evaluate(() => window.__form.schnitt !== null)) ? 'geschnitten' : 'fehlt'}`);
  await seite.evaluate(() => window.__formPose({ kiefer: 40, schaedel: 15, zuege: [] }, true));
  await seite.waitForTimeout(200);
  await stand(`${w.name}-knochen`);
  await pinsel('seite', ...w.strich);
  await stand(`${w.name}-pinsel`);
}
// Vierbeiner: Maul vorn am Kopf (der bekannte Fall mit dem Bein unter dem Mundwinkel)
await seite.evaluate(() => window.__formPruefall('beine'));
await fertig();
vorher = null;
const vb = await seite.evaluate(() => {
  let xMin = Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const q of window.__form.punkte) {
    xMin = Math.min(xMin, q.x);
    yMin = Math.min(yMin, q.y);
    yMax = Math.max(yMax, q.y);
  }
  return { xMin, yMid: (yMin + yMax) / 2 };
});
await ziehen([await ort('seite', vb.xMin - 60, vb.yMid + 30), await ort('seite', vb.xMin + 20, vb.yMid + 30), await ort('seite', vb.xMin + 110, vb.yMid + 25)]);
console.log(`  vierbeiner: Maul ${(await seite.evaluate(() => window.__form.schnitt !== null)) ? 'geschnitten' : 'fehlt'}`);
await seite.evaluate(() => window.__formPose({ kiefer: 40, schaedel: 0, zuege: [] }, true));
await seite.waitForTimeout(200);
await stand('vierbeiner-kiefer');
await seite.evaluate(() => window.__formPose({ kiefer: 0, schaedel: 25, zuege: [] }, true));
await seite.waitForTimeout(200);
await stand('vierbeiner-kopf');
await seite.evaluate(() => window.__formPose({ kiefer: 30, schaedel: 15, zuege: [] }, true));
await seite.waitForTimeout(200);
await stand('vierbeiner-beide');

console.log(fehler.length ? `Fehler im Fenster: ${fehler.join(' | ')}` : 'keine Fehler im Fenster');
await browser.close();
