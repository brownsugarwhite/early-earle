// Form zuerst (04.11.2026), Probe „Linien auf der Form“ (Florians Modell, `?linien`): mit der Maus aus der Startkugel.
// 1. In der Front den Umriss rechts anfassen und hinausziehen: Es entsteht eine Linie auf der Form, die Kugel wird breiter.
// 2. Im Top den Umriss vorn (links) anfassen und hineinziehen: zweite Linie, Knoten mit der ersten, vorn schmaler.
// 3. In der Seite den oberen Punkt höher ziehen: Die Seite legt das Volumen an, die Linien bleiben.
// Nach jedem Schritt: Bild, Linien (Punkte, Knoten), größte Tiefe, Ausdehnung.
// Aufruf aus apps/editor: node scripts/pruefen/form-linien-probe.mjs <ordner>
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
  const info = await seite.evaluate(() => {
    const pos = window.__formSzene.umriss.geometry.attributes.position.array;
    const m = { x: 0, y: 0, z: 0, xVorn: 0 };
    for (let i = 0; i < pos.length; i += 3) {
      m.x = Math.max(m.x, Math.abs(pos[i]));
      m.y = Math.max(m.y, Math.abs(pos[i + 1]));
      m.z = Math.max(m.z, Math.abs(pos[i + 2]));
      // Breite vorn (x < −80)
      if (pos[i] < -80) m.xVorn = Math.max(m.xVorn, Math.abs(pos[i + 2]));
    }
    return {
      masse: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v)])),
      linien: window.__form.raum.map((l) => ({ punkte: l.punkte.length, knoten: l.punkte.filter((p) => p.knoten !== undefined).length })),
      ms: Math.round(window.__form.ms),
    };
  });
  console.log(name, JSON.stringify(info));
  await seite.screenshot({ path: `${ordner}/form-linien-${name}.jpg`, type: 'jpeg', quality: 88 });
};
/** Welt (Blatt-Koordinaten) → Bildschirm: Mitte des Felds + Skala */
const bild = (feld, bx, by) =>
  seite.evaluate(
    ([f, x, y]) => {
      const r = document.getElementById(f).getBoundingClientRect();
      const s = Math.min(document.getElementById('feld-seite').getBoundingClientRect().width, document.getElementById('feld-seite').getBoundingClientRect().height) / 560;
      return [r.left + r.width / 2 + x * s, r.top + r.height / 2 + y * s];
    },
    [feld, bx, by],
  );
const ziehen = async ([x, y], [x2, y2]) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / 10, y + ((y2 - y) * i) / 10);
    await seite.waitForTimeout(30);
  }
  await seite.mouse.up();
  await fertig();
};

await seite.goto(`${basis}?linien`);
await fertig();
await stand('kugel');
// 1. Front: Blatt-Koordinaten (z, −y); den Umriss rechts bei z = 150, y = 0 anfassen und auf z = 210 ziehen
await ziehen(await bild('feld-front', 150, 0), await bild('feld-front', 210, 0));
await stand('front-breiter');
// 2. Top: Blatt-Koordinaten (x, z); den Umriss vorn (x = −110, z ≈ Breite dort) anfassen und hinein
const z110 = await seite.evaluate(() => {
  const pos = window.__formSzene.umriss.geometry.attributes.position.array;
  let z = 0;
  for (let i = 0; i < pos.length; i += 3) if (Math.abs(pos[i] + 110) < 4) z = Math.max(z, Math.abs(pos[i + 2]));
  return z;
});
await ziehen(await bild('feld-top', -110, z110), await bild('feld-top', -110, z110 - 60));
await stand('top-vorn-schmaler');
// 3. Seite: den oberen Punkt (Index 1 der Startkugel) 60 höher
const [px, py] = await seite.evaluate(() => {
  const r = document.querySelector('[data-punkt="1"]').getBoundingClientRect();
  return [r.x + r.width / 2, r.y + r.height / 2];
});
const k = await seite.evaluate(() => Math.min(document.getElementById('feld-seite').getBoundingClientRect().width, document.getElementById('feld-seite').getBoundingClientRect().height) / 560);
await ziehen([px, py], [px, py - 60 * k]);
await stand('seite-hoeher');
// 4. Front: den Umriss auf der Spiegelhälfte (links, z < 0) unten bei y = −90 anfassen und hinausziehen — es zieht der Punkt
// der Hälfte z ≥ 0, die Form bleibt spiegelgleich
const zUnten = await seite.evaluate(() => {
  const pos = window.__formSzene.umriss.geometry.attributes.position.array;
  let z = 0;
  for (let i = 0; i < pos.length; i += 3) if (Math.abs(pos[i + 1] + 90) < 3) z = Math.max(z, Math.abs(pos[i + 2]));
  return z;
});
await ziehen(await bild('feld-front', -zUnten, 90), await bild('feld-front', -zUnten - 40, 90));
await stand('front-spiegel-unten');
// 5. dreimal ⌘Z: zurück bis vor die Top-Linie
for (let i = 0; i < 3; i++) {
  await seite.keyboard.press('Meta+z');
  await fertig();
}
await stand('zurueck');
if (fehler.length) console.log('Fehler:', fehler);
await browser.close();
