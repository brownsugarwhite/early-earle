// Form zuerst (05.11.2026), Probe „Teile“ (Kopf über Bauch), mit der Maus.
// Ein Umriss mit flacher Einbuchtung zwischen Kopf und Bauch; die Spitze mit der Maus tiefer ziehen → beim Loslassen ein eigenes
// Teil (Kopf). Dann wie Florian: im Top den Kopf schmaler, in der Seite den Kopf auf den Bauch ziehen (er darf nicht mit ihm
// verschmelzen), ⌘Z zurück bis vor die Teilung, die Schwelle „ab“ unter die flache Einbuchtung (teilt sofort), und an der Kugel
// eine Naht von Hand. Gemessen je Stand: Teile, Punkte je Umriss, sichtbar/verdeckt gezeichnete Läufe je Blatt, dicht nach Lage,
// umgeklappte Dreiecke, Tiefe am Kopf und am Bauch, Bauzeit.
// Aufruf aus apps/editor: node scripts/pruefen/form-teile-probe.mjs <ordner>
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
  const info = await seite.evaluate(() => {
    const laeufe = (id) => ({
      sichtbar: document.querySelectorAll(`#${id} path.linie`).length,
      verdeckt: document.querySelectorAll(`#${id} path.verdeckt`).length,
    });
    return {
      teile: window.__form.teile.map((t) => `${t.punkte.length} P${t.front ? ', Front gezeichnet' : ''}${t.top ? ', Top gezeichnet' : ''}`),
      koerper: window.__form.punkte.length,
      ms: window.__form.ms,
      dreiecke: window.__form.dreiecke,
      wert: document.getElementById('teile-wert').textContent,
      seite: laeufe('zeichnung'),
      front: laeufe('profil-front'),
      top: laeufe('profil-top'),
    };
  });
  const kopf = await tiefe(-210, -150, 40, 160);
  const bauch = await tiefe(-200, -100, -160, -60);
  console.log(
    name,
    `· Körper ${info.koerper} P, Teile [${info.teile.join(' | ')}]`,
    `· Läufe Seite ${info.seite.sichtbar}/${info.seite.verdeckt}, Front ${info.front.sichtbar}/${info.front.verdeckt}, Top ${info.top.sichtbar}/${info.top.verdeckt} (sichtbar/verdeckt)`,
    `· offen ${p.offen}, mehr ${p.mehr}, umgeklappt ${p.umgeklappt} (+ ${p.splitter} Splitter)`,
    `· Tiefe Kopf ${kopf.toFixed(1)}, Bauch ${bauch.toFixed(1)}`,
    `· ab ${info.wert} · ${info.dreiecke} Dreiecke, Bau ${info.ms.toFixed(0)} ms`,
  );
  if (bild) await seite.screenshot({ path: `${ordner}/form-teile-${name}-2026-11-05.jpg`, type: 'jpeg', quality: 88 });
  return { ...p, ...info, kopf, bauch };
};
const s = await (async () => {
  await seite.goto(basis);
  await fertig();
  return seite.evaluate(() => Math.min(document.getElementById('feld-seite').getBoundingClientRect().width, document.getElementById('feld-seite').getBoundingClientRect().height) / 560);
})();
const ziehen = async (punkte) => {
  const [x0, y0] = punkte[0];
  await seite.mouse.move(x0, y0);
  await seite.mouse.down();
  for (let k = 1; k < punkte.length; k++) {
    const [xa, ya] = punkte[k - 1];
    const [xb, yb] = punkte[k];
    for (let i = 1; i <= 10; i++) {
      await seite.mouse.move(xa + ((xb - xa) * i) / 10, ya + ((yb - ya) * i) / 10);
      await seite.waitForTimeout(15);
    }
  }
  await seite.mouse.up();
  await fertig();
};
/** Bildschirmlage eines Elements (Mitte) */
const mitte = (sel) =>
  seite.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
  }, sel);
/** ein Element um (dx, dy) Welteinheiten ziehen (Bildschirm: y nach unten) */
const elementZiehen = async (sel, dx, dy) => {
  const p = await mitte(sel);
  if (!p) throw new Error(`fehlt: ${sel}`);
  await ziehen([p, [p[0] + dx * s, p[1] + dy * s]]);
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
const vor = await stand('flach');
// die Spitze (Punkt 7) nach hinten in die Form: die Einbuchtung wird tiefer als breit
await elementZiehen('#zeichnung [data-punkt="7"]:not([data-teil])', 70, 0);
const geteilt = await stand('geteilt');
// Top: den breitesten Punkt des Kopfs (Teil 0) nach innen
const kopfTop = await seite.evaluate(() => {
  const h = window.__form.teile[0]?.gezeigt.top ?? [];
  let best = -1;
  h.forEach((q, i) => {
    if (i > 0 && i < h.length - 1 && (best < 0 || q.y > h[best].y)) best = i;
  });
  return best;
});
await elementZiehen(`#profil-top [data-ppunkt="top:${kopfTop}"][data-teil="0"]`, 0, -30);
const schmal = await stand('kopf-schmal');
// Seite: der unterste vordere Punkt des Kopfs auf den Bauch
const kopfUnten = await seite.evaluate(() => {
  const p = window.__form.teile[0].punkte;
  let best = 0;
  p.forEach((q, i) => {
    if (q.x < -100 && q.y < p[best].y + (p[best].x < -100 ? 0 : 1e9)) best = i;
  });
  return best;
});
await elementZiehen(`#zeichnung [data-punkt="${kopfUnten}"][data-teil="0"]`, 10, 45);
const runter = await stand('kopf-auf-bauch');
// ⌘Z dreimal: vor die Teilung (flache Einbuchtung, keine Teile)
for (let k = 0; k < 3; k++) await seite.keyboard.press('Meta+z');
await fertig();
const zurueck = await stand('zurueck', false);
const gleich = await seite.evaluate((p) => JSON.stringify(window.__form.punkte) === JSON.stringify(p), flach);
console.log(`  nach 3 × ⌘Z: Teile ${zurueck.teile.length}, Umriss wie gesetzt ${gleich}`);
// Schwelle „ab“ unter die flache Einbuchtung: teilt sofort
await seite.evaluate(() => {
  const e = document.getElementById('teile-schwelle');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, '0.3');
  e.dispatchEvent(new Event('input', { bubbles: true }));
  e.dispatchEvent(new Event('change', { bubbles: true }));
});
await fertig();
await stand('schwelle-0,3');
await seite.keyboard.press('Meta+z');
await fertig();
console.log(`  ⌘Z nach der Schwelle: Teile ${(await seite.evaluate(() => window.__form.teile.length))}`);

// ---------- Kugel: Naht von Hand ----------
await seite.evaluate(() => {
  const e = document.getElementById('teile-schwelle');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, '1');
  e.dispatchEvent(new Event('input', { bubbles: true }));
});
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
await ziehen([await ort(-60, 200), await ort(-60, -200)]);
const naht = await stand('naht-kugel');
// das kleinere Teil im Top schmaler (breitester Punkt nach innen)
const teilTop = await seite.evaluate(() => {
  const h = window.__form.teile[0]?.gezeigt.top ?? [];
  let best = -1;
  h.forEach((q, i) => {
    if (i > 0 && i < h.length - 1 && (best < 0 || q.y > h[best].y)) best = i;
  });
  return best;
});
await elementZiehen(`#profil-top [data-ppunkt="top:${teilTop}"][data-teil="0"]`, 0, -60);
await stand('naht-kugel-schmal');
console.log(`Fehler im Fenster: ${fehler.length ? fehler.join(' | ') : 'keine'}`);
console.log(JSON.stringify({ vor: vor.teile.length, geteilt: geteilt.teile.length, naht: naht.teile.length, kopfVor: geteilt.kopf, kopfSchmal: schmal.kopf, bauchVor: geteilt.bauch, bauchSchmal: schmal.bauch, runter: runter.teile.length }));
await browser.close();
