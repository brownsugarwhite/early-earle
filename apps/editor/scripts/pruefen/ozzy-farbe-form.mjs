// Ozzy, Paint-Modus, Etappe 1 (19.11.2026): die Bemalung an einer gesicherten Form (Standard: Florians „strange bird“, 7 400 Punkte
// im Rechennetz). Die Kriterien der Etappe misst `ozzy-farbe-fenster.mjs` an einer Kugel; hier dieselben Handgriffe an seiner Form:
//   0  Farblinien entstehen (über den Haken, in der Seite gezeichnet), ein Klick im Raum füllt, die Farbe steht auf der Form;
//      keine Farblinie verliert ihren Weg.
//   1  Tempo: Beim Drehen kostet kein Bild über 16,7 ms; beim Ziehen an der Form kostet die Bemalung im Median höchstens 1 ms je Bild.
//   2  Ein Punkt der Form gezogen und zurück: Die Bemalung geht mit, verliert nichts, und liegt danach nicht weiter neben ihrer
//      Lage davor als die Haut selbst dort (plus 0,5 Einheiten). (An „strange bird“ kommt die Haut selbst nach einem Zug hin und
//      zurück nicht an ihren Platz: bis 4,5 Einheiten daneben, auch nach einem ersten Zug zum Setzen. Das ist das Werk, nicht
//      die Bemalung: Sie liegt mit der Haut dort.)
//   3  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html [NAME=<Form>] [WEITE=20] node scripts/pruefen/ozzy-farbe-form.mjs [ordner für Bilder]
import fs from 'node:fs';
import { auf, quantil, seitenPunkt } from './ozzy-teile.mjs';

const NAME = process.env.NAME ?? 'strange bird';
const WEITE = Number(process.env.WEITE ?? 20);
const ordner = process.argv[2] ?? '';
const t = await auf({ form: NAME, extra: 'material=wachs' });
const { browser, s, O, geladen, ruhig, fehler } = t;
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');
const bild = async (name) => {
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-form-${name}.png`, await s.screenshot());
};
const lagen = async (nr) => {
  const f = (await O('werk')).f;
  return (await O('farbLinieImRaum', nr)).map((p) => [p[0] * f, p[1] * f, p[2] * f]);
};
const weg = (A, B) => {
  let g = 0;
  for (let i = 0; i < Math.min(A.length, B.length); i++) g = Math.max(g, Math.hypot(A[i][0] - B[i][0], A[i][1] - B[i][1], A[i][2] - B[i][2]));
  return A.length === B.length ? g : Infinity;
};
const kreis = (mx, my, r, k = 1) => {
  const g = 0.5523 * r;
  return [
    { X: mx + r, Y: my, aus: [0, k * g] },
    { X: mx, Y: my + k * r, aus: [-g, 0] },
    { X: mx - r, Y: my, aus: [0, -k * g] },
    { X: mx, Y: my - k * r, aus: [g, 0] },
  ];
};

await geladen();
await s.waitForTimeout(1500);
await ruhig();
const w0 = await O('werk');
// der Kasten der Form im Blatt der Seite (aus den Punkten ihrer Linien; Blatt: X = x, Y = −y)
const linien = await O('werkLinienDaten');
let x0 = Infinity;
let x1 = -Infinity;
let y0 = Infinity;
let y1 = -Infinity;
for (const l of linien)
  for (const q of l.punkte) {
    x0 = Math.min(x0, q.x);
    x1 = Math.max(x1, q.x);
    y0 = Math.min(y0, -q.y);
    y1 = Math.max(y1, -q.y);
  }
const b = x1 - x0;
const h = y1 - y0;
const r = 0.09 * Math.min(b, h);

// Die gesicherte Form liegt nicht in ihrer Ruhe (das Werk rechnet die Haut beim ersten Zug neu aus den Linien, „strange bird“ bewegt
// sich dabei um mehrere Einheiten). Darum zuerst ein kleiner Zug hin und zurück: Gemalt und gemessen wird an der Form in Ruhe.
const p = await seitenPunkt(t, 1);
const ziehen = async (zielZ) => {
  const a = (await O('ankerImBild', p.id, p.i, 'top')).filter((x) => !x.m && x.sichtbar)[0];
  const jetzt = (await O('werkLinienDaten')).find((l) => l.id === p.id).punkte[p.i];
  const ziel = await O('flaecheHin', 'top', jetzt.x, zielZ);
  if (!a || !ziel) return null;
  await s.mouse.move(a.x, a.y, { steps: 3 });
  await s.waitForTimeout(400);
  await O('farbKosten', true);
  await s.mouse.down();
  const N = 40;
  for (let k = 1; k <= N; k++) {
    await s.mouse.move(a.x + ((ziel.x - a.x) * k) / N, a.y + ((ziel.y - a.y) * k) / N);
    await s.waitForTimeout(22);
  }
  const kosten = await O('farbKosten', true);
  await s.waitForTimeout(700);
  const L = [];
  const zahl = (await O('farbe')).linien;
  for (let i = 0; i < zahl; i++) L.push(await lagen(i));
  const fehl = (await O('farbe')).fehl;
  await s.mouse.up();
  await ruhig();
  await s.waitForTimeout(500);
  return { kosten, L, fehl };
};
const gesetztVorher = p ? [await ziehen(p.z + 6), await ziehen(p.z)] : [];
await s.mouse.move(40, 20);
await s.waitForTimeout(400);

// ---------- 0 Farblinien und Füllungen ----------
await O('malen', true);
await s.waitForTimeout(400);
// drei Farblinien an Stellen, an denen die Zeichnung ganz auf der Form liegt (ein Raster über den Kasten, von der Mitte aus)
const stellen = [];
for (const v of [0.5, 0.35, 0.65, 0.2, 0.8]) for (const u of [0.5, 0.3, 0.7, 0.15, 0.85]) stellen.push([x0 + u * b, y0 + v * h]);
const farben = [
  [0.97, 0.77, 0.27],
  [0.2, 0.55, 0.8],
  [0.96, 0.96, 0.92],
];
const gesetzt = [];
for (const [X, Y] of stellen) {
  if (gesetzt.length >= 3) break;
  if (gesetzt.some(([gx, gy]) => Math.hypot(gx - X, gy - Y) < 2.6 * r)) continue;
  const dazu = await O('farbLinie', 'seite', kreis(X, Y, r, gesetzt.length === 1 ? 0.6 : 1));
  if (dazu > 0) gesetzt.push([X, Y]);
}
await s.waitForTimeout(400);
let gefuellt = 0;
for (let i = 0; i < gesetzt.length; i++) {
  const P = await O('farbLinieImBild', i);
  const mx = P.reduce((a, p) => a + p.x, 0) / P.length;
  const my = P.reduce((a, p) => a + p.y, 0) / P.length;
  if (await O('farbFuellen', mx, my, farben[i])) gefuellt++;
}
await s.waitForTimeout(600);
await s.mouse.move(40, 20);
await s.waitForTimeout(400);
const f0 = await O('farbe');
await bild('0-paint-modus');
await O('malen', false);
await s.waitForTimeout(500);
await bild('1-wachs');
await O('material', 'Helles Solid');
await s.waitForTimeout(1800);
await bild('2-helles-solid');
await O('material', 'Wachs');
await s.waitForTimeout(900);
if (ordner) {
  // für das Bildblatt: dieselben drei Bilder von nah (2,6-fach, um die Mitte der Bemalung gezoomt)
  const zoomAuf = async (ziel) => {
    for (let n = 0; n < 40; n++) {
      const z = (await O('blick')).zoom;
      if (Math.abs(Math.log(ziel / z)) < 0.01) break;
      let mx = 0;
      let my = 0;
      let zahl = 0;
      for (let i = 0; i < gesetzt.length; i++)
        for (const q of await O('farbLinieImBild', i)) {
          mx += q.x;
          my += q.y;
          zahl++;
        }
      await s.mouse.move(mx / zahl, my / zahl);
      await s.waitForTimeout(60);
      await s.mouse.wheel(0, Math.max(-240, Math.min(240, (-Math.log(ziel / z) / 0.0015) * 2)));
      await s.waitForTimeout(140);
    }
    await s.waitForTimeout(1500);
    await ruhig().catch(() => undefined);
    await s.mouse.move(40, 20);
    await s.waitForTimeout(500);
  };
  await zoomAuf(2.6);
  await O('malen', true);
  await s.waitForTimeout(500);
  await bild('nah-0-paint-modus');
  await O('malen', false);
  await s.waitForTimeout(500);
  await bild('nah-1-wachs');
  await O('material', 'Helles Solid');
  await s.waitForTimeout(1800);
  await bild('nah-2-helles-solid');
  await O('material', 'Wachs');
  await s.waitForTimeout(900);
  await zoomAuf(1);
  await s.keyboard.press('Home');
  await s.waitForTimeout(1000);
}
ok(
  `0 an „${NAME}“ entstehen Farblinien, ein Klick füllt, die Farbe steht auf der Form`,
  gesetzt.length === 3 && gefuellt === 3 && f0.fehl === 0 && f0.zeigt && f0.anzeige.rand > 0,
  `Rechennetz ${w0.punkte} Punkte, Anzeige Stufe ${w0.stufen} (${w0.feinePunkte} Punkte) · ${f0.linien} Farblinien (${f0.orte} Orte), ${f0.fuellungen} Füllungen, ${f0.fehl} ohne Weg · Anzeige: ${f0.anzeige.innen} Dreiecke innen, ${f0.anzeige.rand} am Rand, ${f0.anzeige.ketten} Ketten`,
);

// ---------- 1 Tempo beim Drehen ----------
await O('farbKosten', true);
await O('messen', true);
await s.mouse.move(1300, 200, { steps: 3 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 60; k++) {
  await s.mouse.move(1300 - 3 * k, 200 + k);
  await s.waitForTimeout(16);
}
await s.mouse.up();
await s.waitForTimeout(1200);
const bilder = (await O('messen', false)).filter((x) => x.abstand > 0);
const kostenDrehen = await O('farbKosten', true);
const bildMs = bilder.map((x) => x.ms);
const abstaende = bilder.map((x) => x.abstand);
await bild('3-gedreht');
// zurück in die Ausgangslage
await s.keyboard.press('Home');
await s.waitForTimeout(1200);

// ---------- 2 ein Punkt gezogen und zurück ----------
if ((await O('werk')).auswahl !== '') {
  await s.keyboard.press('Escape');
  await s.waitForTimeout(400);
}
const L0 = [];
const welt0 = [];
for (let i = 0; i < gesetzt.length; i++) {
  L0.push(await lagen(i));
  welt0.push(await O('farbLinieImRaum', i));
}
const wechsel0 = (await O('farbe')).wechsel;
const form0 = await O('radien');
const punktJetzt = async () => {
  const q = (await O('werkLinienDaten')).find((l) => l.id === p.id).punkte[p.i];
  return [q.x, q.y, q.z];
};
const q0 = p ? await punktJetzt() : null;
const hin = p ? await ziehen(p.z + WEITE) : null;
const q1 = p ? await punktJetzt() : null;
await s.mouse.move(40, 20);
await s.waitForTimeout(400);
await bild('4-gezogen');
const formHin = await O('radien');
const zurueck = p ? await ziehen(p.z) : null;
await s.mouse.move(40, 20);
await s.waitForTimeout(400);
const L2 = [];
for (let i = 0; i < gesetzt.length; i++) L2.push(await lagen(i));
const f2 = await O('farbe');
const form2 = await O('radien');
const q2 = p ? await punktJetzt() : null;
if (process.env.DIAG) console.log(`     der gezogene Punkt: vorher ${q0?.map(z2).join('; ')} · gezogen ${q1?.map(z2).join('; ')} · zurück ${q2?.map(z2).join('; ')} · vor dem Malen gesetzt: ${gesetztVorher.map(Boolean).join(', ')} · Meldung „${(await O('werk')).meldung}“`);
// je Farblinie: wie weit ihre Orte neben ihrer Lage davor liegen (Mitte und größter), und wie weit die Haut selbst dort
const fW = (await O('werk')).f;
const jeLinie = [];
for (let i = 0; i < gesetzt.length; i++) {
  const D = L0[i].map((a, k) => (L2[i][k] ? Math.hypot(a[0] - L2[i][k][0], a[1] - L2[i][k][1], a[2] - L2[i][k][2]) : Infinity));
  const H = (await O('hautAbstand', welt0[i])).map((d) => d * fW);
  jeLinie.push({ mitte: quantil(D, 0.5), p95: quantil(D, 0.95), groesst: Math.max(...D), haut: Math.max(...H), ueber: D.filter((d) => d > 0.5).length, zahl: D.length });
}
const mit = hin ? Math.max(...L0.map((A, i) => weg(A, hin.L[i]))) : NaN;
const zur = Math.max(...L0.map((A, i) => weg(A, L2[i])));
const formWeg = Math.max(Math.abs(formHin.min - form0.min), Math.abs(formHin.max - form0.max));
const formZurueck = Math.max(Math.abs(form2.min - form0.min), Math.abs(form2.max - form0.max));
const kostenZug = hin?.kosten ?? { bilder: 0, median: NaN, p95: NaN, groesst: NaN };
ok(
  '1 Tempo: Beim Drehen kostet kein Bild über 16,7 ms; beim Ziehen kostet die Bemalung im Median höchstens 1 ms je Bild',
  bilder.length > 20 && Math.max(...bildMs) <= 16.7 && kostenZug.bilder > 10 && kostenZug.median <= 1,
  `beim Drehen (${bilder.length} Bilder): ein Bild kostet im Median ${z2(quantil(bildMs, 0.5))} ms, das teuerste ${z2(Math.max(...bildMs))} ms, größter Abstand zweier Bilder ${z2(Math.max(...abstaende))} ms; davon die Bemalung im Median ${z2(kostenDrehen.median)} ms · beim Ziehen (${kostenZug.bilder} Bilder): die Bemalung im Median ${z2(kostenZug.median)} ms, 95 % ${z2(kostenZug.p95)} ms, größtes ${z2(kostenZug.groesst)} ms (Bilder mit Netzwechsel)`,
);
ok(
  `2 ein Punkt der Form ${WEITE} Einheiten gezogen und zurück: Die Bemalung geht mit, verliert nichts und liegt danach, wo die Haut liegt`,
  gesetztVorher.every(Boolean) && !!hin && !!zurueck && hin.fehl === 0 && f2.fehl === 0 && f2.linien === 3 && f2.fuellungen === 3 && jeLinie.every((x) => x.groesst <= x.haut + 0.5),
  `gezogen am Punkt ${p ? `${p.id}.${p.i}` : '–'}; die Form änderte sich dabei um ${z2(formWeg)} (Umriss), die Bemalung ging bis ${z2(mit)} Einheiten mit; danach liegt sie höchstens ${z2(zur)} Einheiten neben ihrer Lage davor (der Umriss der Form ${z2(formZurueck)}); je Farblinie (Mitte / 95 % / größter Abstand, Orte über 0,5, und die Haut selbst): ${jeLinie.map((x) => `${z2(x.mitte)} / ${z2(x.p95)} / ${z2(x.groesst)}, ${x.ueber} von ${x.zahl}, Haut ${z2(x.haut)}`).join(' · ')} · ${f2.wechsel.zahl - wechsel0.zahl} Netzwechsel: ${f2.wechsel.gehalten - wechsel0.gehalten} Orte blieben in ihrem Dreieck, ${f2.wechsel.gesucht - wechsel0.gesucht} neu gesucht (höchstens ${z2(f2.wechsel.groesst)} neben der neuen Haut), der letzte Wechsel kostete ${z2(f2.wechsel.ms)} ms`,
);
ok('3 keine Fehler in der Konsole', fehler.length === 0, [...new Set(fehler)].slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
