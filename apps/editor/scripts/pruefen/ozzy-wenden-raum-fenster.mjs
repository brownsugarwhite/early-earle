// Ozzy, B2 im Plan „Ozzy stabil und schnell“ (17.11.2026): Wenden räumlich, an „strange bird“ (NAME).
// ⇧ + Ziehen wendet eine Ansicht. Bis zum 17.11. drehten sich die Linien dabei wie ein flaches Blatt (im Feld der Vier Ansichten auch
// der Körper: gestaucht). Jetzt liegt jeder Ort räumlich: im Bild x = Mitte + (x · cos φ + z · sin φ) · Maß, φ = Weg der Maus · π / 520.
// Gemessen an zwei Punkten der Mittellinie (z = 0) und einem Punkt der Flanke (z ≠ 0) mit seinem Spiegelbild.
// Kriterien:
//   1  Feld der Seite, um 130 Punkte nach links gezogen (45°) und gehalten: Die Punkte der Mitte rücken um cos 45° zusammen; der Punkt
//      der Flanke und sein Spiegelbild liegen dort, wo die räumliche Drehung sie hinlegt (höchstens 1,5 Punkte daneben), seine Höhe bleibt.
//   2  Losgelassen dreht das Feld zurück: alles wieder, wo es war, und die Seite zeigt wieder eine Hälfte.
//   3  Einzelne Ansicht der Seite, genauso gezogen: dieselbe Rechnung trifft (genau wie im Feld, mit dem Maß der Ansicht).
//   4  Von hinten (⇧ + Doppelklick) ist der Punkt der Flanke zu greifen (bis zum 17.11. lag dort die abgewandte Hälfte, verdeckt).
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: [NAME=…] node scripts/pruefen/ozzy-wenden-raum-fenster.mjs [ordner für Bilder]
import { auf } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'strange bird';
const WEG = -130;
const PHI = (WEG * Math.PI) / 520;
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '–');

/** zwei weit auseinander liegende Punkte der Mittellinie und der Punkt mit der größten Tiefe (Flanke) */
const punkteWaehlen = async (O) => {
  const L = await O('werkLinienDaten');
  const mitte = L.find((l) => l.art === 'mitte');
  const M = mitte.punkte.filter((p) => p.sichtbar);
  const A = M.reduce((a, b) => (b.x < a.x ? b : a));
  const B = M.reduce((a, b) => (b.x > a.x ? b : a));
  let P = null;
  for (const l of L) for (const p of l.punkte) if (p.sichtbar && l.art !== 'mitte' && (!P || Math.abs(p.z) > Math.abs(P.z))) P = { ...p, id: l.id };
  return { A: { ...A, id: mitte.id }, B: { ...B, id: mitte.id }, P };
};
const lage = async (O, q, m = false) => (await O('ankerImBild', q.id, q.i, 'seite')).find((a) => a.m === m) ?? null;
/** ⇧ + Ziehen von (x, y) um WEG nach links, halten; `danach` läuft, solange gehalten wird */
const wendenHalten = async (s, x, y, danach) => {
  await s.mouse.move(x, y, { steps: 3 });
  await s.waitForTimeout(250);
  await s.keyboard.down('Shift');
  await s.mouse.down();
  for (let k = 1; k <= 13; k++) {
    await s.mouse.move(x + (WEG * k) / 13, y);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(350);
  const r = await danach();
  await s.mouse.up();
  await s.keyboard.up('Shift');
  return r;
};
/** die Rechnung: aus zwei Punkten der Mitte vorher und nachher Maß und Mitte, daraus der Ort der Flanke (Z: ihre Tiefe mit Vorzeichen) */
const rechnung = (K, vor, nach) => {
  const c = (nach.A.x - nach.B.x) / (vor.A.x - vor.B.x);
  const mass = (vor.A.x - vor.B.x) / (K.A.x - K.B.x);
  const m1 = nach.A.x - K.A.x * mass * c;
  return { c, soll: (Z) => m1 + K.P.x * mass * c + Z * mass * Math.sin(PHI) };
};

// ---------- Vier Ansichten: das Feld der Seite ----------
{
  const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: NAME });
  await geladen();
  await s.keyboard.press('Tab');
  await s.waitForTimeout(1800);
  await ruhig();
  const K = await punkteWaehlen(O);
  const F = (await O('felderJetzt')).seite;
  const vor = { A: await lage(O, K.A), B: await lage(O, K.B), P: await lage(O, K.P), spiegel: await lage(O, K.P, true) };
  const nach = await wendenHalten(s, F.x + F.w - 40, F.y + 40, async () => {
    if (ordner) await s.screenshot({ path: `${ordner}/ozzy-wenden-raum-feld.png` });
    return { A: await lage(O, K.A), B: await lage(O, K.B), P: await lage(O, K.P), spiegel: await lage(O, K.P, true) };
  });
  const R = rechnung(K, vor, nach);
  const dP = nach.P ? nach.P.x - R.soll(K.P.z) : NaN;
  const dS = nach.spiegel ? nach.spiegel.x - R.soll(-K.P.z) : NaN;
  ok(
    '1 Feld der Seite um 45° gewendet: räumlich',
    Math.abs(R.c - Math.cos(PHI)) < 0.01 && Math.abs(dP) < 1.5 && Math.abs(dS) < 1.5 && Math.abs(nach.P.y - vor.P.y) < 0.5 && Math.abs(nach.P.x - nach.spiegel.x) > 8,
    `Mitte rückt zusammen um ${z2(R.c)} (cos 45° = 0,71) · Flanke (Tiefe ${z2(K.P.z)}) ${z2(dP)} neben der Rechnung, ihr Spiegelbild ${z2(dS)} · beide ${z2(nach.P ? Math.abs(nach.P.x - (nach.spiegel?.x ?? NaN)) : NaN)} auseinander (flach: 0) · Höhe ${z2(nach.P ? nach.P.y - vor.P.y : NaN)}`,
  );
  await s.waitForTimeout(1200);
  await ruhig();
  const zur = { A: await lage(O, K.A), P: await lage(O, K.P), spiegel: await lage(O, K.P, true) };
  ok(
    '2 losgelassen: zurück, die Seite zeigt wieder eine Hälfte',
    Math.hypot(zur.A.x - vor.A.x, zur.A.y - vor.A.y) < 0.5 && Math.hypot(zur.P.x - vor.P.x, zur.P.y - vor.P.y) < 0.5 && !zur.spiegel && !vor.spiegel,
    `Mitte ${z2(Math.hypot(zur.A.x - vor.A.x, zur.A.y - vor.A.y))}, Flanke ${z2(Math.hypot(zur.P.x - vor.P.x, zur.P.y - vor.P.y))} vom Ort davor · Spiegelbild in Ruhe: ${zur.spiegel ? 'da' : 'keins'}`,
  );
  ok('5a keine Fehler in der Konsole (Vier Ansichten)', fehler.length === 0, fehler.slice(0, 3).join(' | '));
  await browser.close();
}

// ---------- die einzelne Ansicht der Seite ----------
{
  const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: NAME });
  await geladen();
  await s.keyboard.press('1');
  await s.waitForTimeout(1200);
  await ruhig();
  const K = await punkteWaehlen(O);
  const vor = { A: await lage(O, K.A), B: await lage(O, K.B), P: await lage(O, K.P) };
  const nach = await wendenHalten(s, 1200, 700, async () => {
    if (ordner) await s.screenshot({ path: `${ordner}/ozzy-wenden-raum-einzel.png` });
    return { A: await lage(O, K.A), B: await lage(O, K.B), P: await lage(O, K.P), spiegel: await lage(O, K.P, true) };
  });
  const R = rechnung(K, vor, nach);
  const dP = nach.P ? nach.P.x - R.soll(K.P.z) : NaN;
  const dS = nach.spiegel ? nach.spiegel.x - R.soll(-K.P.z) : NaN;
  ok(
    '3 einzelne Seite um 45° gewendet: dieselbe Rechnung',
    Math.abs(R.c - Math.cos(PHI)) < 0.01 && Math.abs(dP) < 1.5 && Math.abs(dS) < 1.5,
    `Mitte rückt zusammen um ${z2(R.c)} · Flanke ${z2(dP)} neben der Rechnung, ihr Spiegelbild ${z2(dS)} · beide ${z2(nach.P ? Math.abs(nach.P.x - (nach.spiegel?.x ?? NaN)) : NaN)} auseinander`,
  );
  await s.waitForTimeout(1500);
  await ruhig();
  // ganz wenden: ⇧ + Doppelklick ins Leere; dann den Punkt der Flanke anfahren
  await s.keyboard.down('Shift');
  await s.mouse.click(1200, 700);
  await s.waitForTimeout(90);
  await s.mouse.click(1200, 700);
  await s.keyboard.up('Shift');
  await s.waitForTimeout(1600);
  await ruhig();
  const hinten = await lage(O, K.P);
  await s.mouse.move(hinten.x + 40, hinten.y + 30, { steps: 3 });
  await s.mouse.move(hinten.x + 1, hinten.y + 1, { steps: 6 });
  await s.waitForTimeout(600);
  const b = await O('bearbeiten');
  const blick = await O('blick');
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-wenden-raum-hinten.png` });
  ok('4 von hinten ist der Punkt der Flanke zu greifen', blick.gewendet === true && /^Punkt /.test(b.ziel), `gewendet ${blick.gewendet}, am Zeiger: ${b.ziel || 'nichts'}`);
  ok('5b keine Fehler in der Konsole (einzelne Ansicht)', fehler.length === 0, fehler.slice(0, 3).join(' | '));
  await browser.close();
}
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
