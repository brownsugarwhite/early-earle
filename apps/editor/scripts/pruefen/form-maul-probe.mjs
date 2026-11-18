// Form zuerst (04.11.2026), Probe „Maul in der neuen Form“: mit der Maus.
// 1. Startkugel: in der Seite von außen links über den Umriss bis zur Mitte ziehen → Maullinie, die Form wird dort
//    aufgeschnitten (geschlossen nur die Linie).
// 2. Den Regler im 3D-Blatt anklicken (30°, dann ganz offen): der Unterkiefer dreht um den Mundwinkel.
// 3. Ein Kopf mit Schnauze (Seite gesetzt), Maullinie mit der Maus, öffnen.
// 4. Florians Langhals vom 04.11. (Kopf über einer Lücke): Maul am Kopf öffnen — die Brust jenseits der Lücke bleibt stehen.
// 5. ⌘Z: die Maullinie ist wieder weg.
// Nach jedem Schritt: Bild, Schnitt (Lippenpunkte, Dreiecke des Inneren), Bauzeit.
// Aufruf aus apps/editor: node scripts/pruefen/form-maul-probe.mjs <ordner>
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
const stand = async (name) => {
  const info = await seite.evaluate(() => ({
    maul: window.__form.maul?.punkte.length ?? 0,
    schnitt: window.__form.schnitt,
    oeffnung: window.__form.oeffnung,
    ms: Math.round(window.__form.ms),
    dreiecke: window.__form.dreiecke,
  }));
  console.log(name, JSON.stringify(info));
  await seite.screenshot({ path: `${ordner}/form-maul-${name}.jpg`, type: 'jpeg', quality: 88 });
  return info;
};
/** Welt der Seite (x, y nach oben) → Bildschirm */
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
/** Den Regler im 3D-Blatt bei Winkel w anklicken (wie mit der Maus) */
const regler = async (w) => {
  const r = await seite.evaluate(() => {
    const e = document.getElementById('maul-oeffnung').getBoundingClientRect();
    return { x: e.left, y: e.top + e.height / 2, w: e.width, max: Number(document.getElementById('maul-oeffnung').max) };
  });
  // der Daumen ist etwa 16 px breit: der Wert liegt zwischen den Rändern abzüglich seiner halben Breite
  const daumen = 8;
  await seite.mouse.click(r.x + daumen + ((r.w - 2 * daumen) * w) / r.max, r.y);
  await seite.waitForTimeout(250);
};
/** Lagen des Körpers (gezeigt) */
const lagen = () => seite.evaluate(() => Array.from(window.__formSzene.umriss.geometry.attributes.position.array));

await seite.goto(basis);
await fertig();
// 1. Startkugel: von außen links (x = −220) über den Umriss bis knapp vor die Mitte
await ziehen([await bild(-225, 6), await bild(-150, 2), await bild(-80, -4), await bild(-20, -8)]);
const k1 = await stand('kugel-zu');
if (!k1.schnitt) throw new Error('kein Schnitt an der Kugel');
// 2. Regler: 30°, dann ganz offen
await regler(30);
await stand('kugel-30');
await regler(55);
await stand('kugel-offen');
await regler(0);

// 3. Kopf mit Schnauze (lang, vorn flacher)
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
await stand('kopf-zu');
await regler(35);
await stand('kopf-offen');
await regler(0);
// Mundwinkel ziehen: Linie anklicken (wählt sie, zeigt ihre Punkte), den letzten Punkt weiter nach hinten
const mitte = await seite.evaluate(() => {
  const e = document.querySelector('[data-maul]');
  const l = e.getTotalLength();
  const p = e.getPointAtLength(l / 2);
  const m = e.getScreenCTM();
  return [m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f];
});
await seite.mouse.click(mitte[0], mitte[1]);
await seite.waitForTimeout(150);
const ecke = await seite.evaluate(() => {
  const alle = [...document.querySelectorAll('[data-mpunkt]')];
  const r = alle[alle.length - 1].getBoundingClientRect();
  return [r.x + r.width / 2, r.y + r.height / 2];
});
await ziehen([ecke, await bild(30, 12)]);
const gezogen = await seite.evaluate(() => window.__form.maul.punkte.at(-1));
console.log('Mundwinkel gezogen auf', JSON.stringify(gezogen));
await stand('kopf-mundwinkel-hinten');
await regler(35);
await stand('kopf-mundwinkel-hinten-offen');
await regler(0);

// 4. Florians Langhals (Kopf oben links über einer Lücke, Brust darunter)
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
await stand('langhals-zu');
const vorher = await lagen();
await regler(40);
const nachher = await lagen();
let brust = 0;
let kopf = 0;
for (let i = 0; i < Math.min(vorher.length, nachher.length); i += 3) {
  const d = Math.hypot(nachher[i] - vorher[i], nachher[i + 1] - vorher[i + 1]);
  if (vorher[i + 1] < -20) brust = Math.max(brust, d);
  else kopf = Math.max(kopf, d);
}
console.log('langhals bewegt: Brust (y < −20) höchstens', brust.toFixed(3), ' · Kopf höchstens', kopf.toFixed(1));
await stand('langhals-offen');

// 5. ⌘Z: die Maullinie ist wieder weg
await seite.keyboard.press('Meta+z');
await fertig();
await stand('zurueck');

// 6. Vierbeiner mit gezeichneter Front und Top (alle Ansichten gleichwertig): Maul vorn
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
await ziehen([await bild(vb.xMin - 60, vb.yMid + 30), await bild(vb.xMin + 20, vb.yMid + 30), await bild(vb.xMin + 110, vb.yMid + 25)]);
await stand('vierbeiner-zu');
await regler(40);
await stand('vierbeiner-offen');
if (fehler.length) console.log('Fehler:', fehler);
await browser.close();
