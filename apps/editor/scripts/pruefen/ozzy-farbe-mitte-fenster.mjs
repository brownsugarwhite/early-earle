// Ozzy, Paint-Modus, Etappe 2 (19.11.2026; Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 10): Farblinien an einer
// gesicherten Form mit Falten und Überhängen (Standard: Florians „strange bird“). Was an der Kugel nicht vorkommt:
//   10  Das Raster im Bild trifft die glatte Anzeige wie der Strahl über alle Dreiecke (dieselbe Stelle, höchstens 0,05 Einheiten).
//   11  Über einen Überhang gezeichnet (ein Körperteil verdeckt die Falte dahinter; fünf runde Punkte): Jede Kurve wird im Bild
//       gelegt, der Entwurf läuft im Bild lückenlos (kein Schritt über 3 CSS-Pixel), und was hinter der Form liegt, ist nicht zu
//       sehen, auch bevor irgendetwas gemalt ist (die Verdeckung gilt ganz).
//   12  Die Mitte: Auf der Mitte begonnen (P rastet ein), über eine Seite gezogen, auf der Mitte beendet: Die Farblinie ist von
//       selbst fertig, offen, ihre Enden liegen auf der Mitte, ihr Spiegelbild steht im Netz; ein Klick füllt beide Hälften.
//   13  Geschlossen quer über die Mitte gezeichnet: Es bleibt der längere Teil, er endet auf der Mitte (kein Punkt hinter ihr);
//       ein Klick füllt eine Fläche über beide Hälften, daneben bleibt die Form, wie sie ist.
//   15  Tempo an der großen Form: Einen Punkt ziehen und eine Richtung drehen kostet je Schritt höchstens 8 ms (die Kurven neu
//       legen, das Netz neu füllen), und die Bemalung je Bild dabei (Flächen und Anzeige neu) in 95 % der Bilder höchstens 8 ms.
//   14  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html [NAME=<Form>] node scripts/pruefen/ozzy-farbe-mitte-fenster.mjs [ordner für Bilder]
import fs from 'node:fs';
import { auf } from './ozzy-teile.mjs';

const NAME = process.env.NAME ?? 'strange bird';
const ordner = process.argv[2] ?? '';
const t = await auf({ form: NAME, dichte: 1, extra: 'material=wachs' });
const { browser, s, O, geladen, klick, fehler } = t;
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');
const bild = async (name) => {
  await s.mouse.move(30, 880);
  await s.waitForTimeout(400);
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-mitte-${name}.png`, await s.screenshot());
};
const zieh = async (x, y, dx, dy) => {
  await s.mouse.move(x, y, { steps: 4 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await s.mouse.move(x + (dx * i) / 6, y + (dy * i) / 6);
    await s.waitForTimeout(22);
  }
  await s.mouse.up();
  await s.waitForTimeout(250);
};
const farbeBei = async (x, y) =>
  s.evaluate(
    async ({ x, y }) => {
      const o = window.__ozzy;
      o.film(true);
      o.bild(1 / 60);
      const d = document.getElementById('haut').toDataURL('image/png');
      o.film(false);
      const b = await createImageBitmap(await (await fetch(d)).blob());
      const c = new OffscreenCanvas(b.width, b.height);
      const g = c.getContext('2d');
      g.drawImage(b, 0, 0);
      const kk = b.width / window.innerWidth;
      return Array.from(g.getImageData(Math.round(x * kk), Math.round(y * kk), 1, 1).data.slice(0, 3));
    },
    { x, y },
  );
const gelb = (c) => c[0] > c[2] + 60 && c[1] > c[2] + 40;

await geladen();
await s.waitForTimeout(1500);
// heran
await s.mouse.move(720, 470);
for (let i = 0; i < 12; i++) {
  await s.mouse.wheel(0, -100);
  await s.waitForTimeout(40);
}
await s.waitForTimeout(1200);
await s.keyboard.press('b');
await s.waitForTimeout(600);
await s.keyboard.press('p');
await s.waitForTimeout(500);

// ---------- 10: Raster gegen Strahl ----------
{
  const R = await s.evaluate(() => {
    const aus = [];
    for (let y = 150; y < 860; y += 23) for (let x = 350; x < 1250; x += 29) aus.push(window.__ozzy.farbRaster(x, y));
    return aus;
  });
  const beide = R.filter((r) => r >= 0);
  const fehlt = R.filter((r) => r === -1).length;
  const weit = beide.filter((r) => r > 0.05).length;
  ok('10 das Raster im Bild trifft die glatte Anzeige wie der Strahl', beide.length > 250 && fehlt === 0 && weit === 0, `${R.length} Stellen, an ${beide.length} liegt die Form; einer von beiden verfehlt sie: ${fehlt}; weiter als 0,05 Einheiten auseinander: ${weit}`);
}

// ---------- 11: über einen Überhang ----------
{
  const q = { x: 792, y: 488 };
  const r = 70;
  const P = Array.from({ length: 5 }, (_, i) => [q.x + r * Math.cos((2 * Math.PI * i) / 5), q.y + 0.8 * r * Math.sin((2 * Math.PI * i) / 5)]);
  const vor = await O('farbGelegt');
  for (let i = 0; i < 5; i++) {
    const w = (2 * Math.PI * i) / 5 + Math.PI / 2;
    await zieh(P[i][0], P[i][1], 0.38 * r * Math.cos(w), 0.3 * r * Math.sin(w));
  }
  await s.mouse.move(1300, 130, { steps: 4 });
  await s.waitForTimeout(500);
  const N = await O('farbNetz');
  const l = N[N.length - 1];
  let schritt = 0;
  for (let j = 1; j < l.x.length; j++) schritt = Math.max(schritt, Math.hypot(l.x[j] - l.x[j - 1], l.y[j] - l.y[j - 1]));
  // verdeckt: die Probe liegt deutlich hinter der Haut, die dort im Bild steht
  let verdeckt = 0;
  for (let j = 0; j < l.x.length; j += 4) {
    const h = await O('farbTiefe', l.x[j], l.y[j]);
    if (h !== null && l.z[j] > h + 10) verdeckt++;
  }
  const nach = await O('farbGelegt');
  const duldung = await O('farbVerdeckung');
  const gemalt = (await O('farbe')).linien;
  await bild('11-ueberhang');
  ok(
    '11 über einen Überhang gezeichnet: im Bild gelegt, lückenlos; was hinter der Form liegt, ist nicht zu sehen',
    l.punkte === 5 && nach.raum === vor.raum && nach.bild > vor.bild && schritt <= 3 && verdeckt > 20 && gemalt === 0 && duldung < 0.03,
    `Entwurf mit ${l.punkte} Punkten, ${l.x.length} Proben; im Bild gelegt ${nach.bild - vor.bild}-mal, im Raum ${nach.raum - vor.raum}-mal (Sprünge im Vorhang überbrückt ${nach.vorhang - vor.vorhang}, gerade ${nach.gerade - vor.gerade}); größter Schritt ${z2(schritt)} CSS-Pixel; ${verdeckt} von ${Math.ceil(l.x.length / 4)} Proben liegen hinter der Form; gemalt ist noch nichts (${gemalt}), die Verdeckung gilt ab ${z2(duldung)} der Raumgröße`,
  );
  await s.keyboard.press('Escape');
  await s.waitForTimeout(400);
}

// ---------- die Ansicht drehen: von vorn, die Mitte läuft sichtbar über den Schnabel ----------
await s.keyboard.press('a');
await s.waitForTimeout(300);
await s.mouse.move(1340, 800);
await s.mouse.down();
for (let k = 1; k <= 30; k++) {
  await s.mouse.move(1340 - (170 * k) / 30, 800);
  await s.waitForTimeout(16);
}
await s.mouse.up();
await s.waitForTimeout(1000);
await s.keyboard.press('p');
await s.waitForTimeout(500);
await s.mouse.move(720, 470);
await s.waitForTimeout(400);
const M = await O('farbMitte');

// ---------- 12: von der Mitte zur Mitte ----------
{
  // zwei Stellen der Mitte im unteren Teil (am Schnabel), 90 bis 170 Pixel auseinander
  const unten = M.filter((p) => p.y > 650 && p.y < 860).sort((a, b) => a.y - b.y);
  const A = unten[Math.floor(unten.length * 0.2)];
  const B = unten.find((p) => p.y > A.y && Math.hypot(p.x - A.x, p.y - A.y) > 110) ?? unten[unten.length - 1];
  const lang = Math.hypot(B.x - A.x, B.y - A.y);
  const ux = (B.x - A.x) / lang;
  const uy = (B.y - A.y) / lang;
  // die Seite, auf der die Form liegt
  let seite = 1;
  for (const sg of [1, -1]) {
    const frei = [];
    for (const f of [0.25, 0.5, 0.75]) frei.push(await O('farbOrtFrei', A.x + f * lang * ux - sg * 38 * uy, A.y + f * lang * uy + sg * 38 * ux));
    if (frei.every(Boolean)) {
      seite = sg;
      break;
    }
  }
  const vorLinien = (await O('farbe')).linien;
  if (process.env.DIAG) console.log(`   Mitte: ${M.length} Stellen zu sehen, unten ${unten.length}; A ${A.x.toFixed(0)};${A.y.toFixed(0)}, B ${B.x.toFixed(0)};${B.y.toFixed(0)}, Seite ${seite}`);
  // knapp neben der Mitte gedrückt: P rastet ein
  await klick(A.x + 3, A.y + 2);
  for (const f of [0.25, 0.5, 0.75]) {
    const tief = f === 0.5 ? 40 : 30;
    await zieh(A.x + f * lang * ux - seite * tief * uy, A.y + f * lang * uy + seite * tief * ux, 0.12 * lang * ux, 0.12 * lang * uy);
  }
  await klick(B.x - 2, B.y + 3);
  await s.mouse.move(1300, 140, { steps: 4 });
  await s.waitForTimeout(500);
  const f = await O('farbe');
  const nr = f.linien - 1;
  const Q = await O('farbPunkte', nr);
  const N = await O('farbNetz');
  if (process.env.DIAG) console.log(`   danach: ${f.linien} Farblinien, im Netz ${N.map((l) => `${l.punkte} Punkte${l.zu ? ' zu' : ''}`).join(' | ')}`);
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-mitte-12-vor.png`, await s.screenshot());
  const e0 = Q?.punkte[0];
  const e1 = Q?.punkte[Q.punkte.length - 1];
  // (gedrückt wurde 3,6 Pixel neben einer Stelle der Mitte; eingerastet liegt der Punkt auf der Mitte, höchstens so weit vom Druck)
  const neben = Q ? Math.max(Math.hypot(e0.x - A.x - 3, e0.y - A.y - 2), Math.hypot(e1.x - B.x + 2, e1.y - B.y - 3)) : Infinity;
  const aufMitte = Q ? Math.max(Math.abs(e0.z), Math.abs(e1.z)) : Infinity;
  const innen = Q ? Math.min(...Q.punkte.slice(1, -1).map((q) => Math.abs(q.z))) : 0;
  // füllen: mitten in der Hälfte
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
  const L = await O('farbLinieImBild', nr);
  const cx = L.reduce((a, p) => a + p.x, 0) / L.length;
  const cy = L.reduce((a, p) => a + p.y, 0) / L.length;
  await klick(cx, cy);
  await s.waitForTimeout(500);
  const f2 = await O('farbe');
  const drin = await farbeBei(cx, cy);
  // das Spiegelbild: die andere Zeile der Farblinie im Netz; ihre Mitte im Bild
  const zeilen = (await O('farbNetz')).filter((l) => !l.zu && l.punkte === Q?.punkte.length);
  const sp = zeilen[zeilen.length - 1];
  const sx = sp.x.reduce((a, v) => a + v, 0) / sp.x.length;
  const sy = sp.y.reduce((a, v) => a + v, 0) / sp.y.length;
  const zuSehen = (await O('farbTiefe', sx, sy)) !== null;
  const gegen = zuSehen ? await farbeBei(sx, sy) : null;
  const fern = await farbeBei(A.x - seite * -90 * uy - 60 * ux, A.y + seite * -90 * ux - 60 * uy);
  await bild('12-mitte');
  ok(
    '12 von der Mitte zur Mitte: von selbst fertig, offen, die Enden auf der Mitte; ein Klick füllt beide Hälften',
    f.linien === vorLinien + 1 && !!Q && !Q.zu && Q.punkte.length === 5 && Q.punkte[0].knick && neben < 6 && aufMitte === 0 && innen > 1 && N.length >= 2 && f2.fuellungen === f.fuellungen + 1 && gelb(drin) && (!gegen || gelb(gegen)) && !gelb(fern),
    `Farblinien ${vorLinien} → ${f.linien}; die neue offen (${Q ? !Q.zu : '–'}) mit ${Q?.punkte.length} Punkten; ihre Enden liegen ${z2(aufMitte)} Einheiten neben der Spiegelebene (die Punkte dazwischen mindestens ${z2(innen)}) und ${z2(neben)} CSS-Pixel neben dem Druck; im Netz ${N.length} Linien (mit Spiegelbild); gefüllt: in der Hälfte ${drin.join(', ')}, in der gespiegelten ${gegen ? gegen.join(', ') : 'nicht zu sehen'}, abseits ${fern.join(', ')}`,
  );
}

// ---------- 13: geschlossen quer über die Mitte ----------
{
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  // eine Stelle der Mitte im oberen Teil, mit Platz auf beiden Seiten
  const oben = M.filter((p) => p.y < 560).sort((a, b) => a.y - b.y);
  let C = null;
  for (const p of oben) {
    const frei = [];
    for (let i = 0; i < 6; i++) frei.push(await O('farbOrtFrei', p.x + 34 * Math.cos((Math.PI * i) / 3 + 0.3), p.y + 30 * Math.sin((Math.PI * i) / 3 + 0.3)));
    if (frei.every(Boolean)) {
      C = p;
      break;
    }
  }
  if (!C) ok('13 geschlossen quer über die Mitte', false, 'keine Stelle der Mitte mit Platz auf beiden Seiten gefunden');
  else {
    const vorLinien = (await O('farbe')).linien;
    // fünf Klicks um die Stelle herum, etwas zur einen Seite versetzt (der längere Teil liegt dort), auf dem ersten geschlossen
    const ecken = [0, 1, 2, 3, 4].map((i) => [C.x + 8 + 30 * Math.cos((2 * Math.PI * i) / 5 + 0.3), C.y + 26 * Math.sin((2 * Math.PI * i) / 5 + 0.3)]);
    for (const [x, y] of [...ecken, ecken[0]]) await klick(x, y);
    await s.mouse.move(1300, 150, { steps: 4 });
    await s.waitForTimeout(500);
    const f = await O('farbe');
    const nr = f.linien - 1;
    const Q = await O('farbPunkte', nr);
    const e0 = Q?.punkte[0];
    const e1 = Q?.punkte[Q.punkte.length - 1];
    const aufMitte = Q ? Math.max(Math.abs(e0.z), Math.abs(e1.z)) : Infinity;
    // (kein Punkt hinter der Mitte: Alle liegen auf derselben Hälfte)
    const seiten = Q ? new Set(Q.punkte.filter((q) => q.z !== 0).map((q) => Math.sign(q.z))).size : 0;
    await s.keyboard.press('a');
    await s.waitForTimeout(300);
    await klick(C.x + 1, C.y);
    await s.waitForTimeout(500);
    const f2 = await O('farbe');
    const mitte = await farbeBei(C.x + 6, C.y);
    const drueben = await farbeBei(C.x - 7, C.y);
    const aussen = await farbeBei(C.x + 62, C.y);
    await bild('13-quer');
    ok(
      '13 geschlossen quer über die Mitte: Der längere Teil bleibt und endet auf der Mitte; die Fläche liegt über beiden Hälften',
      f.linien === vorLinien + 1 && !!Q && !Q.zu && Q.punkte.length >= 4 && Q.punkte.length <= 6 && aufMitte === 0 && seiten === 1 && f2.fuellungen === f.fuellungen + 1 && gelb(mitte) && gelb(drueben) && !gelb(aussen),
      `Farblinien ${vorLinien} → ${f.linien}; die neue offen (${Q ? !Q.zu : '–'}) mit ${Q?.punkte.length} Punkten, ihre Enden ${z2(aufMitte)} Einheiten neben der Spiegelebene, die übrigen auf ${seiten} Hälfte; gefüllt: diesseits der Mitte ${mitte.join(', ')}, jenseits ${drueben.join(', ')}, außerhalb ${aussen.join(', ')}`,
    );
  }
}

// ---------- 15: Tempo beim Bedienen an der großen Form ----------
{
  // ein runder Fleck auf der Seite, dann mit A einen Punkt ziehen (40 Schritte) und eine Richtung drehen (30 Schritte)
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  const q = { x: 478, y: 505 };
  const r = 44;
  for (let i = 0; i < 4; i++) {
    const w = (Math.PI / 2) * i - 0.4;
    await zieh(q.x + r * Math.cos(w), q.y + 1.15 * r * Math.sin(w), -0.55 * r * Math.sin(w), 0.63 * r * Math.cos(w));
  }
  await klick(q.x + r * Math.cos(-0.4), q.y + 1.15 * r * Math.sin(-0.4));
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  const nr = (await O('farbe')).linien - 1;
  const Q = await O('farbPunkte', nr);
  const orte = (await O('farbe')).orte;
  const p = Q.punkte[2];
  const v0 = await O('farbGelegt');
  await O('farbKosten', true);
  await s.mouse.move(p.x, p.y, { steps: 4 });
  await s.waitForTimeout(350);
  await s.mouse.down();
  for (let i = 1; i <= 40; i++) {
    await s.mouse.move(p.x - 0.6 * i, p.y + 0.4 * i);
    await s.waitForTimeout(20);
  }
  await s.mouse.up();
  await s.waitForTimeout(400);
  const v1 = await O('farbGelegt');
  // eine Richtung drehen: an der Farblinie 17 Pixel neben einem runden Punkt
  const Q2 = await O('farbPunkte', nr);
  const L = await O('farbLinieImBild', nr);
  const m = Q2.punkte[0];
  const st = L.slice(m.i + 1).find((o) => Math.hypot(o.x - m.x, o.y - m.y) >= 17);
  await s.mouse.move(st.x, st.y, { steps: 4 });
  await s.waitForTimeout(500);
  const w0 = Math.atan2(st.y - m.y, st.x - m.x);
  const rr = Math.hypot(st.x - m.x, st.y - m.y);
  await s.mouse.down();
  await s.waitForTimeout(200);
  for (let i = 1; i <= 30; i++) {
    const w = w0 + ((30 * Math.PI) / 180) * (i / 30);
    await s.mouse.move(m.x + rr * Math.cos(w), m.y + rr * Math.sin(w));
    await s.waitForTimeout(20);
  }
  await s.mouse.up();
  await s.waitForTimeout(400);
  const v2 = await O('farbGelegt');
  // was die Bemalung je Bild kostet, während bedient wird (Ketten, Flächen, Anzeige neu, wenn sich etwas geändert hat)
  const kb = await O('farbKosten');
  const zug = { n: v1.abgeleitet - v0.abgeleitet, legen: (v1.msLegen - v0.msLegen) / Math.max(1, v1.abgeleitet - v0.abgeleitet), ab: (v1.msAbleiten - v0.msAbleiten) / Math.max(1, v1.abgeleitet - v0.abgeleitet) };
  const dreh = { n: v2.abgeleitet - v1.abgeleitet, legen: (v2.msLegen - v1.msLegen) / Math.max(1, v2.abgeleitet - v1.abgeleitet), ab: (v2.msAbleiten - v1.msAbleiten) / Math.max(1, v2.abgeleitet - v1.abgeleitet) };
  ok(
    '15 Tempo an der großen Form: einen Punkt ziehen und eine Richtung drehen kostet je Schritt höchstens 8 ms (Legen und Ableiten zusammen)',
    zug.n >= 20 && dreh.n >= 15 && zug.legen + zug.ab <= 8 && dreh.legen + dreh.ab <= 8 && kb.bilder > 30 && kb.p95 <= 8,
    `${orte} Orte in der Bemalung; Punkt ziehen: ${zug.n} Schritte, je Schritt Legen ${z2(zug.legen)} ms, Netz neu ${z2(zug.ab)} ms; Richtung drehen: ${dreh.n} Schritte, Legen ${z2(dreh.legen)} ms, Netz neu ${z2(dreh.ab)} ms; die Bemalung je Bild dabei (Flächen und Anzeige neu): Median ${z2(kb.median)} ms, 95 % ${z2(kb.p95)} ms, das teuerste ${z2(kb.groesst)} ms (${kb.bilder} Bilder)`,
  );
}

// ---------- 14 ----------
const echte = fehler.filter((e) => !/Return statement used in an inline/.test(e));
ok('14 keine Fehler in der Konsole', echte.length === 0, echte.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} Kriterien halten nicht` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
