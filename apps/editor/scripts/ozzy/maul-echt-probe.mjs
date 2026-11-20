// Probe zum Konzept „Maul, Zähne, Zunge“ (20.11.2026), nach Florians Rückfrage: Wird das Innere des Mauls echte, bearbeitbare
// Form, wenn man das Maul als Abziehen anwendet? Mit dem, was Ozzy heute kann (Sitzung „Objekte“, Etappe 4; Sitzung 4, Kiefer am
// geformten Maul): eine Form, davor eine zweite als Maulraum; Abziehen anwenden (⌥ + Klick); die Naht ist die Lippe; der Tropfen
// „Maul“; „Fressen“ öffnet.
// Aufruf aus apps/editor: [LINIE=1] node scripts/ozzy/maul-echt-probe.mjs <ordner für Bilder>
import { auf } from '../pruefen/ozzy-teile.mjs';

const ordner = process.argv[2] ?? '.';
const LINIE = process.env.LINIE === '1';
const t = await auf({ extra: `ohneLinie=${LINIE ? 0 : 1}` });
const { browser, s, O, geladen, fehler } = t;
const bild = (name) => s.screenshot({ path: `${ordner}/${name}${LINIE ? '-linie' : ''}.png` });
const still = async (zeit = 120000) => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => !window.__ozzy.nahtStand().laeuft && !window.__ozzy.werk().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: zeit });
  await s.waitForTimeout(250);
};
const ellipse = (cx, cy, rx, ry) => {
  const kx = 0.5523 * rx;
  const ky = 0.5523 * ry;
  return [
    { x: cx + rx, y: cy, ein: [0, -ky], aus: [0, ky] },
    { x: cx, y: cy + ry, ein: [kx, 0], aus: [-kx, 0] },
    { x: cx - rx, y: cy, ein: [0, ky], aus: [0, -ky] },
    { x: cx, y: cy - ry, ein: [-kx, 0], aus: [kx, 0] },
  ];
};
const sagen = (name, wert) => console.log(`${name}: ${typeof wert === 'string' ? wert : JSON.stringify(wert)}`);

// der Körper und davor der Maulraum (eine flache Form, die vorn aus dem Körper herausschaut)
await O('form', ellipse(700, 450, 170, 140));
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
await s.click('#plus');
await s.waitForTimeout(700);
await O('form', ellipse(575, 478, 115, 44), true);
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
await still();
await O('material', 'wachs');
await bild('echt-0-zwei');

// Abziehen anwenden: Das Maul ist danach Haut der Form, die Naht eine Linie mit Kante
await s.click('#naht-abziehen', { modifiers: ['Alt'] });
await s.waitForFunction(() => window.__ozzy.objekte().ruhende.length === 0 && !window.__ozzy.nahtStand().laeuft, null, { timeout: 30000 });
await still();
const n = await O('nahtStand');
const w = await O('werk');
sagen('nach dem Anwenden', { punkte: n.punkte, offen: n.offen, ohnePaar: n.ohnePaar, linien: n.linien.map((l) => ({ art: l.art, kante: l.kante, punkte: l.punkte })), umgeschlagen: w.umgeschlagen, meldung: w.meldung });
const blicke = async (name) => {
  for (const [k, gier] of [
    ['a', -0.7],
    ['b', -1.3],
  ]) {
    await O('blickSetzen', { gier, neigung: 0.18, zoom: 1.9 });
    await s.waitForTimeout(700);
    await bild(`${name}-${k}`);
  }
};

// der Tropfen „Maul“ an der gewählten Naht (antippen, bevor der Blick wechselt: Er hängt an der Naht im Bild)
const p0 = await O('pose');
sagen('Tropfen', p0.tropfen);
if (p0.tropfen) {
  await s.click('#maul-tropfen');
  await still();
  await blicke('echt-1-abgezogen');
  const p1 = await O('pose');
  sagen('nach dem Tropfen', { maul: p1.maul, fressen: p1.fressen });
  if (p1.fressen) {
    await s.click('#fressen-knopf');
    await still();
    for (const grad of [25, 50]) {
      await s.evaluate((g) => {
        const r = document.getElementById('fressen-maul');
        r.value = String(g);
        r.dispatchEvent(new Event('input', { bubbles: true }));
        r.dispatchEvent(new Event('change', { bubbles: true }));
      }, grad);
      await still();
      const p = await O('pose');
      const ww = await O('werk');
      sagen(`Fressen ${grad}°`, { kiefer: p.kiefer, umgeschlagen: ww.umgeschlagen, meldung: ww.meldung });
      await blicke(`echt-2-fressen-${grad}`);
    }
  }
}
if (fehler.length) console.log('Fehler:', fehler.slice(0, 6));
await browser.close();
