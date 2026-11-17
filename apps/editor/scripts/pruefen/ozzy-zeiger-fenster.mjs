// Ozzy, B1 im Plan „Ozzy stabil und schnell“ (17.11.2026): Zeiger und Greifen, an „strange bird“ (NAME).
// Kriterien:
//   1  Drücken ohne Zeigen greift: Die Bilder stehen (zwischen Bewegen und Drücken kommt keins), die Maus springt in der Seite auf
//      einen Punkt und drückt; danach ziehen: Der Punkt ist mitgegangen, ein Schritt im Werk, die Ansicht hat sich nicht gedreht.
//   2  Drücken ins Leere dreht weiter (kein Schritt im Werk).
//   3  Ohne Schalter: Der Zeiger wird gezeichnet, der des Systems ist aus.
//   4  Mit `?zeiger=system`: In Ruhe zeigt das System den Zeiger (ein Bild), gezeichnet wird er nicht. Beim Greifen wird er gezeichnet,
//      der des Systems geht aus; nach dem Loslassen sitzt der gezeichnete noch an der Stelle; nach etwas Weg und einer Pause zeigt
//      ihn wieder das System.
//   5  Über der Haut (Pinsel) bleibt der Ring gezeichnet; mit P zeigt das System ein anderes Bild (die Spitze).
//   6  Das Bild des Systems deckt sich mit dem gezeichneten Zeiger (gleiche Stelle, gleiche Form).
//   7  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: [NAME=…] node scripts/pruefen/ozzy-zeiger-fenster.mjs [ordner für Bilder]
import fs from 'node:fs';
import { auf } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'strange bird';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const zeigerCss = (s) => s.evaluate(() => getComputedStyle(document.getElementById('linien')).cursor);
/**
 * Ein frei stehender Punkt der Mittellinie in der Seite (dort ist sie der Umriss, nichts verdeckt sie): der, dessen nächster Nachbar
 * unter allen Punkten am weitesten weg ist. Punkte anderer Linien liegen in der Seite oft hinter der Haut und sind dann nicht zu greifen.
 */
const freierPunkt = async (O) => {
  const L = await O('werkLinienDaten');
  const alle = [];
  for (const l of L)
    for (const p of l.punkte) {
      if (!p.sichtbar) continue;
      for (const a of await O('ankerImBild', l.id, p.i, 'seite')) if (a.sichtbar) alle.push({ id: l.id, i: p.i, x: a.x, y: a.y, mitte: l.art === 'mitte' && !a.m });
    }
  let best = null;
  for (const a of alle.filter((q) => q.mitte)) {
    let d = Infinity;
    for (const b of alle) if (b.id !== a.id || b.i !== a.i) d = Math.min(d, Math.hypot(a.x - b.x, a.y - b.y));
    if (!best || d > best.d) best = { ...a, d };
  }
  return best;
};
const ankerJetzt = async (O, p) => (await O('ankerImBild', p.id, p.i, 'seite')).find((a) => !a.m);
const LEER = { x: 150, y: 250 };
const AUSSCHNITT = { x: LEER.x - 8, y: LEER.y - 8, width: 32, height: 32 };

// ---------- ohne Schalter: Greifen, Drehen, der gezeichnete Zeiger ----------
let bildGezeichnet = null;
{
  const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: NAME });
  await geladen();
  // 3 und das Vergleichsbild für 6: der gezeichnete Zeiger an einer leeren Stelle im Raum
  await s.mouse.move(LEER.x, LEER.y, { steps: 6 });
  await s.waitForTimeout(700);
  const z0 = await O('zeiger');
  const c0 = await zeigerCss(s);
  ok('3 ohne Schalter: gezeichnet, der Zeiger des Systems ist aus', z0.gezeichnet && !z0.system && c0 === 'none', `gezeichnet ${z0.gezeichnet}, cursor ${c0.slice(0, 30)}`);
  bildGezeichnet = await s.screenshot({ clip: AUSSCHNITT });
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-zeiger-gezeichnet.png`, bildGezeichnet);

  await s.keyboard.press('1');
  await s.waitForTimeout(900);
  await ruhig();
  const p = await freierPunkt(O);
  const vor = await O('bearbeiten');
  const blick0 = await O('blick');
  // die Maus weit weg, die Bilder anhalten, dann springen und drücken: Dazwischen sieht Ozzy kein Bild
  await s.mouse.move(p.x + 300, p.y + 200, { steps: 4 });
  await s.waitForTimeout(400);
  await O('film', true);
  await s.waitForTimeout(80);
  await s.mouse.move(p.x + 2, p.y + 1);
  await s.mouse.down();
  await O('film', false);
  for (let k = 1; k <= 12; k++) {
    await s.mouse.move(p.x + 2 + 2.5 * k, p.y + 1 - 2.5 * k);
    await s.waitForTimeout(25);
  }
  const imZug = await O('bearbeiten');
  await s.waitForTimeout(80);
  await s.mouse.up();
  await ruhig();
  const nach = await O('bearbeiten');
  const a1 = await ankerJetzt(O, p);
  const blick1 = await O('blick');
  const weg = a1 ? [a1.x - p.x, a1.y - p.y] : [NaN, NaN];
  ok(
    '1 Drücken ohne Zeigen greift den Punkt',
    /^Punkt /.test(imZug.ziel) && nach.schritte === vor.schritte + 1 && Math.hypot(weg[0] - 30, weg[1] + 30) < 4 && Math.abs(blick1.gier - blick0.gier) < 1e-6,
    `gegriffen: ${imZug.ziel || 'nichts'}, Schritte ${vor.schritte} → ${nach.schritte}, Punkt um ${weg.map((v) => v.toFixed(1)).join(' / ')} (Hand 30 / −30), Gier ${blick0.gier.toFixed(3)} → ${blick1.gier.toFixed(3)}`,
  );
  // 2 ins Leere: drehen
  await s.mouse.move(700, 500, { steps: 4 });
  await s.waitForTimeout(300);
  await O('film', true);
  await s.waitForTimeout(80);
  await s.mouse.move(LEER.x, LEER.y);
  await s.mouse.down();
  await O('film', false);
  for (let k = 1; k <= 12; k++) {
    await s.mouse.move(LEER.x + 6 * k, LEER.y);
    await s.waitForTimeout(25);
  }
  await s.mouse.up();
  await s.waitForTimeout(600);
  const blick2 = await O('blick');
  const nach2 = await O('bearbeiten');
  ok('2 Drücken ins Leere dreht weiter', Math.abs(blick2.gier - blick1.gier) > 0.05 && nach2.schritte === nach.schritte, `Gier ${blick1.gier.toFixed(3)} → ${blick2.gier.toFixed(3)}, Schritte ${nach.schritte} → ${nach2.schritte}`);
  ok('7a keine Fehler in der Konsole (ohne Schalter)', fehler.length === 0, fehler.slice(0, 3).join(' | '));
  await browser.close();
}

// ---------- mit Schalter: der Zeiger des Systems ----------
{
  const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: NAME, extra: 'zeiger=system' });
  await geladen();
  await s.mouse.move(LEER.x, LEER.y, { steps: 6 });
  await s.waitForTimeout(700);
  const z0 = await O('zeiger');
  const c0 = await zeigerCss(s);
  const inRuhe = z0.system && !z0.gezeichnet && c0.includes('url(');
  // 6: derselbe Ausschnitt ohne gezeichneten Zeiger, darauf das Bild des Systems an seiner Stelle
  const grund = await s.screenshot({ clip: AUSSCHNITT });
  const vergleich = await s.evaluate(
    async ({ a, b, wert, ox, oy }) => {
      const laden = (u) =>
        new Promise((gut, weg) => {
          const i = new Image();
          i.onload = () => gut(i);
          i.onerror = weg;
          i.src = u;
        });
      const urls = [...wert.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
      const heiss = wert.match(/\)\s+(\d+)\s+(\d+)\s*,/);
      if (!urls.length || !heiss) return { fehlt: true };
      const A = await laden(`data:image/png;base64,${a}`);
      const B = await laden(`data:image/png;base64,${b}`);
      const Z = await laden(urls[urls.length - 1]);
      const f = urls.length > 1 ? 2 : 1;
      const c = document.createElement('canvas');
      c.width = A.width;
      c.height = A.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(A, 0, 0);
      const pa = g.getImageData(0, 0, c.width, c.height).data;
      g.drawImage(B, 0, 0);
      const s = A.width / 32;
      g.drawImage(Z, (ox - Number(heiss[1])) * s, (oy - Number(heiss[2])) * s, (Z.width / f) * s, (Z.height / f) * s);
      const pb = g.getImageData(0, 0, c.width, c.height).data;
      let anders = 0;
      let summe = 0;
      let tinte = 0;
      for (let i = 0; i < pa.length; i += 4) {
        const d = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]));
        summe += d;
        if (d > 80) anders++;
        if (pa[i] < 128) tinte++;
      }
      return { anders, mittel: summe / (pa.length / 4), tinte, zusammen: c.toDataURL('image/png'), b: Z.width, h: Z.height, heiss: [Number(heiss[1]), Number(heiss[2])] };
    },
    { a: bildGezeichnet.toString('base64'), b: grund.toString('base64'), wert: z0.bild, ox: LEER.x - AUSSCHNITT.x, oy: LEER.y - AUSSCHNITT.y },
  );
  if (ordner && vergleich.zusammen) fs.writeFileSync(`${ordner}/ozzy-zeiger-system.png`, Buffer.from(vergleich.zusammen.split(',')[1], 'base64'));
  ok(
    '6 das Bild des Systems deckt sich mit dem gezeichneten Zeiger',
    !vergleich.fehlt && vergleich.tinte > 20 && vergleich.anders <= 6 && vergleich.mittel < 1.5,
    vergleich.fehlt ? 'kein Bild im Wert' : `${vergleich.anders} Bildpunkte weichen deutlich ab, im Mittel ${vergleich.mittel.toFixed(2)} von 255, ${vergleich.tinte} dunkle Bildpunkte im gezeichneten; Bild ${vergleich.b} × ${vergleich.h}, Spitze bei ${vergleich.heiss?.join(' / ')}`,
  );

  await s.keyboard.press('1');
  await s.waitForTimeout(900);
  await ruhig();
  const p = await freierPunkt(O);
  // zeigen (5 neben dem Punkt, noch im Fang), warten, greifen
  await s.mouse.move(p.x + 4, p.y + 3, { steps: 8 });
  await s.waitForTimeout(600);
  const z1 = await O('zeiger');
  await s.mouse.down();
  await s.waitForTimeout(160);
  const z2 = await O('zeiger');
  const c2 = await zeigerCss(s);
  for (let k = 1; k <= 10; k++) {
    await s.mouse.move(p.x + 4 + 3 * k, p.y + 3 - 2 * k);
    await s.waitForTimeout(25);
  }
  await s.mouse.up();
  await s.waitForTimeout(500);
  const z3 = await O('zeiger');
  // weg von der Stelle (der gezeichnete Zeiger findet mit dem Weg zur Hand zurück), dann ruhen
  for (let k = 1; k <= 30; k++) {
    await s.mouse.move(p.x + 34 + 8 * k, p.y - 17 + 5 * k);
    await s.waitForTimeout(16);
  }
  await s.waitForTimeout(500);
  const z4 = await O('zeiger');
  const c4 = await zeigerCss(s);
  ok(
    '4 System in Ruhe, gezeichnet beim Greifen und auf dem Rückweg, danach wieder System',
    inRuhe && z1.system && !z2.system && z2.gezeichnet && c2 === 'none' && !z3.system && z3.gezeichnet && z4.system && !z4.gezeichnet && c4.includes('url('),
    `Ruhe: System ${z0.system}, gezeichnet ${z0.gezeichnet}, cursor ${c0.slice(0, 18)}… · am Punkt: System ${z1.system} · gedrückt: System ${z2.system}, gezeichnet ${z2.gezeichnet}, cursor ${c2.slice(0, 12)} · losgelassen: System ${z3.system}, gezeichnet ${z3.gezeichnet} · nach Weg und Pause: System ${z4.system}, gezeichnet ${z4.gezeichnet}`,
  );
  await ruhig();

  // 5 im Raum über der Haut: der Ring des Pinsels, gezeichnet; mit P die Spitze vom System
  await s.keyboard.press('0');
  await s.waitForTimeout(1200);
  await ruhig();
  await s.mouse.move(720, 470, { steps: 8 });
  await s.waitForTimeout(700);
  const z5 = await O('zeiger');
  await s.mouse.move(LEER.x, LEER.y, { steps: 8 });
  await s.waitForTimeout(700);
  const z6 = await O('zeiger');
  await s.keyboard.press('p');
  await s.waitForTimeout(700);
  const z7 = await O('zeiger');
  await s.keyboard.press('Escape');
  ok(
    '5 über der Haut der Ring gezeichnet; mit P zeigt das System die Spitze',
    z5.art === 'ring' && z5.gezeichnet && !z5.system && z6.system && z6.art === 'pfeil' && z7.system && z7.art === 'spitze' && z7.bild !== z6.bild,
    `über der Haut: ${z5.art}, gezeichnet ${z5.gezeichnet}, System ${z5.system} · daneben: ${z6.art}, System ${z6.system} · mit P: ${z7.art}, System ${z7.system}, anderes Bild ${z7.bild !== z6.bild}`,
  );
  ok('7b keine Fehler in der Konsole (mit Schalter)', fehler.length === 0, fehler.slice(0, 3).join(' | '));
  await browser.close();
}
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
