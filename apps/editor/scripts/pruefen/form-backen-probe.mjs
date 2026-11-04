// Form zuerst (04.11.2026), Probe „Backen“: das Spielnetz (höchstens 8 000 Dreiecke) mit Maul, mit der Maus.
// Schalter „Spielnetz“ im 3D-Blatt an; je Wesen: Maullinie mit der Maus ziehen, Regler öffnen. Gemessen je Stand: Dreiecke
// (dicht → Spiel), Abweichung (Welt und px bei 300 px Höhe), Bauzeit; geöffnet: dicht nach Lage (jede Kante zwei Dreiecke,
// Körper und Inneres zusammen) und umgeklappte Dreiecke im Spielnetz.
// Aufruf aus apps/editor: node scripts/pruefen/form-backen-probe.mjs <ordner>
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
/** Spielnetz in der Seite prüfen: dicht nach Lage (Körper + Inneres) und umgeklappte Dreiecke */
const pruefen = () =>
  seite.evaluate(() => {
    const teile = [window.__formSzene.umriss.geometry, window.__formSzene.innen.geometry].filter((g) => g.index && g.attributes.position);
    const id = new Map();
    const kanten = new Map();
    let um = 0;
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
          um++;
          if (wo.length < 6) wo.push([0, 1, 2].map((i) => ((p[3 * a + i] + p[3 * b + i] + p[3 * c + i]) / 3).toFixed(0)).join(','));
        }
      }
    }
    let offen = 0;
    let mehr = 0;
    for (const z of kanten.values()) {
      if (z < 2) offen++;
      if (z > 2) mehr++;
    }
    return { offen, mehr, umgeklappt: um, wo };
  });
const stand = async (name, offen = false) => {
  const info = await seite.evaluate(() => ({ spiel: window.__form.spiel, ms: Math.round(window.__form.ms), oeffnung: window.__form.oeffnung }));
  const p = offen ? await pruefen() : null;
  const s = info.spiel;
  console.log(
    name,
    s ? `${s.dicht} → ${s.dreiecke} Dreiecke, ${s.punkte} Punkte, Abweichung ${s.fehler.toFixed(2)} (≈ ${s.px.toFixed(2)} px bei 300 px)` : 'kein Spielnetz',
    `· ${info.ms} ms · Öffnung ${info.oeffnung}°`,
    p ? `· offen: Kanten mit einem Dreieck ${p.offen}, mit mehr als zwei ${p.mehr}, umgeklappt ${p.umgeklappt}` : '',
    p && p.wo.length ? `bei ${p.wo.join(' | ')}` : '',
  );
  await seite.screenshot({ path: `${ordner}/form-backen-${name}.jpg`, type: 'jpeg', quality: 88 });
};
const bild = (x, y) =>
  seite.evaluate(
    ([x, y]) => {
      const r = document.getElementById('feld-seite').getBoundingClientRect();
      const s = Math.min(r.width, r.height) / 560;
      return [r.left + r.width / 2 + x * s, r.top + r.height / 2 - y * s];
    },
    [x, y],
  );
const ziehen = async (punkte) => {
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
  await fertig();
};
const regler = async (w) => {
  const r = await seite.evaluate(() => {
    const e = document.getElementById('maul-oeffnung').getBoundingClientRect();
    return { x: e.left, y: e.top + e.height / 2, w: e.width, max: Number(document.getElementById('maul-oeffnung').max) };
  });
  const daumen = 8;
  await seite.mouse.click(r.x + daumen + ((r.w - 2 * daumen) * w) / r.max, r.y);
  await seite.waitForTimeout(250);
};

await seite.goto(basis);
await fertig();
// Schalter „Spielnetz“ mit der Maus
const schalter = await seite.evaluate(() => {
  const r = document.getElementById('spielnetz').getBoundingClientRect();
  return [r.x + r.width / 2, r.y + r.height / 2];
});
await seite.mouse.click(schalter[0], schalter[1]);
await seite.waitForFunction(() => window.__form?.spiel !== null && window.__form?.fein === true);
await seite.waitForTimeout(300);
await stand('kugel', true);
await ziehen([await bild(-225, 6), await bild(-150, 2), await bild(-80, -4), await bild(-20, -8)]);
await stand('kugel-maul-zu');
await regler(30);
await stand('kugel-maul-30', true);
await regler(55);
await stand('kugel-maul-55', true);
await regler(0);

await seite.evaluate(() =>
  window.__formSetzen([
    { x: -230, y: 10 },
    { x: -150, y: 60 },
    { x: 20, y: 120 },
    { x: 170, y: 60 },
    { x: 180, y: -60 },
    { x: 40, y: -110 },
    { x: -120, y: -55 },
    { x: -225, y: -25 },
  ]),
);
await fertig();
await ziehen([await bild(-270, -6), await bild(-200, -8), await bild(-110, -6), await bild(-15, 8)]);
await regler(35);
await stand('kopf-maul-35', true);
await regler(0);

await seite.evaluate(() =>
  window.__formSetzen([
    { x: -247, y: 124, ecke: true },
    { x: -200, y: 103 },
    { x: -109, y: 72 },
    { x: -207, y: -102 },
    { x: -170, y: -148 },
    { x: 222, y: -114 },
    { x: 236, y: -47 },
    { x: -24, y: 210 },
  ]),
);
await fertig();
await ziehen([await bild(-275, 128), await bild(-200, 124), await bild(-115, 130)]);
await regler(40);
await stand('langhals-maul-40', true);
await regler(0);

await seite.evaluate(() => window.__formPruefall('beine'));
await fertig();
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
await stand('vierbeiner-ohne-maul', true);
// zum Vergleich die dichte Form (Spielnetz aus)
await seite.evaluate(() => window.__formSpielnetz(false));
await fertig();
await stand('vierbeiner-dicht', true);
await seite.evaluate(() => window.__formSpielnetz(true));
await fertig();
await ziehen([await bild(vb.xMin - 60, vb.yMid + 30), await bild(vb.xMin + 20, vb.yMid + 30), await bild(vb.xMin + 110, vb.yMid + 25)]);
await stand('vierbeiner-maul-zu', true);
await regler(40);
await stand('vierbeiner-maul-40', true);
// dieselbe Öffnung an der dichten Form: kommt das Umklappen vom Backen oder schon von der Drehung?
await seite.evaluate(() => window.__formSpielnetz(false));
await fertig();
await seite.evaluate(() => window.__formOeffnen(40));
await seite.waitForTimeout(250);
await stand('vierbeiner-maul-40-dicht', true);
if (fehler.length) console.log('Fehler:', fehler);
await browser.close();
