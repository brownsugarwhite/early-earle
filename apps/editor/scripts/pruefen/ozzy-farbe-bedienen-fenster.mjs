// Ozzy, Paint-Modus, Etappe 2 (19.11.2026; Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 10): Farblinien bedienen wie
// Linien. An einer frischen Kugel auf Wachs, alles mit einzelnen Klicks und Zügen wie von Hand.
//   0  P direkt auf der Form im Raum: fünf Klicks, auf dem ersten geschlossen: eine Farblinie, keine Linie der Form; ihre Punkte
//      liegen unter den Klicks (höchstens 0,5 Gerätepunkte); sie läuft glatt (kein Ort mehr als 0,5 Gerätepunkte neben der Geraden
//      durch seine Nachbarn).
//   1  Ziehen rundet (der Punkt trägt zwei Richtungen einander gegenüber, die Farblinie verlässt ihn längs des Zugs); ⌫ nimmt
//      im Entwurf den letzten Punkt zurück; ↩ beendet die Farblinie offen; Esc bricht eine angefangene ab.
//   2  A zieht einen Punkt: Er folgt der Maus (höchstens 0,5 Gerätepunkte), die anderen Punkte bleiben; ein Klick ohne Weg wählt
//      nur (kein Schritt für ⌘Z).
//   3  Eine Richtung drehen: Nahe am runden Punkt hängt die Nadel; daran gezogen dreht sich die Richtung um ihren Punkt, die
//      Gegenseite dreht mit; mit ⌥ knickt sie (die Gegenseite bleibt).
//   4  Füllen und Löschen: Ein Klick in die geschlossene Farblinie füllt; ⌫ löscht einen gewählten Punkt, die Farblinie bleibt
//      geschlossen, die Füllung folgt ihr.
//   5  ⌘Z nimmt alles in der Reihenfolge zurück; die Form des Werks bleibt Zahl für Zahl dieselbe.
//   6  Von hinten gesehen ist kein Punkt der Farblinie zu greifen (nichts hängt am Zeiger).
//   7  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/pruefen/ozzy-farbe-bedienen-fenster.mjs [ordner für Bilder]
import fs from 'node:fs';
import { auf } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const t = await auf({ extra: 'ohneLinie=0&material=wachs' });
const { browser, s, O, geladen, klick, fehler } = t;
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');
const bild = async (name) => {
  await s.mouse.move(40, 20);
  await s.waitForTimeout(400);
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-bedienen-${name}.png`, await s.screenshot());
};
const grad = (v) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
const winkelZwischen = (a, b) => {
  let d = grad(a) - grad(b);
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return Math.abs(d);
};
/** drücken, ziehen, loslassen (in Schritten, wie von Hand) */
const zieh = async (x, y, dx, dy, o = {}) => {
  await s.mouse.move(x, y, { steps: 6 });
  await s.waitForTimeout(o.vor ?? 350);
  if (o.taste) await s.keyboard.down(o.taste);
  await s.mouse.down();
  const n = o.schritte ?? 10;
  for (let i = 1; i <= n; i++) {
    await s.mouse.move(x + (dx * i) / n, y + (dy * i) / n);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(100);
  await s.mouse.up();
  if (o.taste) await s.keyboard.up(o.taste);
  await s.waitForTimeout(350);
};

const [cx, cy, R, k] = [720, 450, 150, 0.5523 * 150];
await O('form', [
  { x: cx + R, y: cy, ein: [0, -k], aus: [0, k] },
  { x: cx, y: cy + R, ein: [k, 0], aus: [-k, 0] },
  { x: cx - R, y: cy, ein: [0, k], aus: [0, -k] },
  { x: cx, y: cy - R, ein: [-k, 0], aus: [k, 0] },
]);
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
await s.waitForTimeout(800);
const summe0 = await O('werkSumme');
const linienForm = (await O('werk')).linien;

// ---------- 0 P direkt auf der Form ----------
await s.keyboard.press('b');
await s.waitForTimeout(500);
await s.keyboard.press('p');
await s.waitForTimeout(400);
const M = [700, 420];
const klicks = [0, 1, 2, 3, 4].map((i) => [Math.round(M[0] + 55 * Math.cos((i * 2 * Math.PI) / 5)), Math.round(M[1] + 45 * Math.sin((i * 2 * Math.PI) / 5))]);
for (const [x, y] of klicks.slice(0, 3)) await klick(x, y);
await s.mouse.move(klicks[3][0], klicks[3][1], { steps: 6 });
await s.waitForTimeout(500);
if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-bedienen-0-faden.png`, await s.screenshot());
for (const [x, y] of [...klicks.slice(3), klicks[0]]) await klick(x, y);
await s.waitForTimeout(600);
const f0 = await O('farbe');
const P0 = await O('farbPunkte', 0);
const B0 = await O('farbLinieImBild', 0);
const nebenKlicks = P0 ? Math.max(...P0.punkte.map((q, i) => Math.hypot(q.x - klicks[i][0], q.y - klicks[i][1]))) : NaN;
let zacke = 0;
if (P0) {
  const ecken = new Set(P0.punkte.map((q) => q.i));
  const n = B0.length;
  for (let i = 0; i < n; i++) {
    if (ecken.has(i)) continue;
    const a = B0[(i - 1 + n) % n];
    const b = B0[i];
    const c = B0[(i + 1) % n];
    zacke = Math.max(zacke, Math.abs((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / Math.max(1e-9, Math.hypot(c.x - a.x, c.y - a.y)));
  }
}
ok(
  '0 P direkt auf der Form: fünf Klicks, geschlossen; die Punkte liegen unter den Klicks, die Farblinie läuft glatt',
  f0.linien === 1 && !!P0 && P0.zu && P0.punkte.length === 5 && P0.punkte.every((q) => q.knick) && (await O('werk')).linien === linienForm && 2 * nebenKlicks <= 0.5 && 2 * zacke <= 0.5,
  `${f0.linien} Farblinie, ${P0?.punkte.length} Punkte, ${f0.orte} Orte, geschlossen ${P0?.zu}; neben den Klicks höchstens ${z2(2 * nebenKlicks)} Gerätepunkte; Zacken höchstens ${z2(2 * zacke)} Gerätepunkte; Linien der Form ${linienForm} → ${(await O('werk')).linien}`,
);

// ---------- 1 Ziehen rundet, ⌫, ↩, Esc ----------
await zieh(640, 520, 25, 10);
await zieh(700, 545, 25, 0);
await zieh(765, 520, 20, -12);
await klick(800, 480);
await s.waitForTimeout(300);
await s.keyboard.press('Backspace');
await s.waitForTimeout(400);
await s.keyboard.press('Enter');
await s.waitForTimeout(700);
const f1 = await O('farbe');
const P1 = await O('farbPunkte', 1);
const mitteRund = P1?.punkte[1];
// (eine dritte, abgebrochen)
await klick(600, 380);
await klick(620, 350);
await s.keyboard.press('Escape');
await s.waitForTimeout(400);
const f1c = await O('farbe');
ok(
  '1 Ziehen rundet, ⌫ nimmt den letzten Punkt zurück, ↩ beendet offen, Esc bricht ab',
  f1.linien === 2 && !!P1 && !P1.zu && P1.punkte.length === 3 && !mitteRund.knick && !!mitteRund.ein && !!mitteRund.aus && winkelZwischen(mitteRund.aus, [25, 0]) < 3 && winkelZwischen(mitteRund.ein, [-25, 0]) < 3 && P1.punkte[0].ein === null && P1.punkte[2].aus === null && f1c.linien === 2,
  `${f1.linien} Farblinien; die zweite offen (${!P1?.zu}) mit ${P1?.punkte.length} Punkten; der mittlere rund, seine Richtungen im Bild ${mitteRund?.aus?.map(z2).join('; ')} und ${mitteRund?.ein?.map(z2).join('; ')} (gezogen: 25; 0); nach Esc ${f1c.linien} Farblinien`,
);
await bild('1-gezeichnet');

// ---------- 2 A zieht einen Punkt ----------
await s.keyboard.press('a');
await s.waitForTimeout(400);
const weg0 = await O('rueckweg');
const vor = (await O('farbPunkte', 0)).punkte;
// ein Klick ohne Weg: wählt, kein Schritt
await klick(vor[1].x, vor[1].y);
await s.waitForTimeout(300);
const gewaehlt = (await O('bearbeiten')).auswahl;
const wegKlick = await O('rueckweg');
await zieh(vor[2].x, vor[2].y, -30, 20);
const nach = (await O('farbPunkte', 0)).punkte;
const gefolgt = Math.hypot(nach[2].x - vor[2].x + 30, nach[2].y - vor[2].y - 20);
const andere = Math.max(...[0, 1, 3, 4].map((i) => Math.hypot(nach[i].x - vor[i].x, nach[i].y - vor[i].y)));
const wegZug = await O('rueckweg');
ok(
  '2 A zieht einen Punkt: Er folgt der Maus, die anderen bleiben; ein Klick ohne Weg wählt nur',
  gewaehlt.length === 1 && wegKlick === weg0 && 2 * gefolgt <= 0.5 && andere < 1e-6 && wegZug === `${weg0} f1`,
  `Klick: gewählt ${JSON.stringify(gewaehlt)}, Rückweg „${wegKlick}“ (wie davor); Zug um (−30; 20): der Punkt liegt ${z2(2 * gefolgt)} Gerätepunkte neben dem Ziel, die anderen bewegten sich ${z2(andere)}; Rückweg „${wegZug}“`,
);

// ---------- 3 eine Richtung drehen ----------
// auf der offenen Farblinie, ein Stück neben ihrem mittleren (runden) Punkt: Dort hängt die Nadel
const L1 = await O('farbLinieImBild', 1);
const Q1 = (await O('farbPunkte', 1)).punkte;
const mi = Q1[1];
let stelle = null;
for (let i = mi.i + 1; i < L1.length; i++) {
  if (Math.hypot(L1[i].x - mi.x, L1[i].y - mi.y) >= 16) {
    stelle = L1[i];
    break;
  }
}
await s.mouse.move(stelle.x + 20, stelle.y - 30, { steps: 4 });
await s.waitForTimeout(200);
await s.mouse.move(stelle.x, stelle.y, { steps: 8 });
await s.waitForTimeout(600);
const zielNadel = (await O('bearbeiten')).ziel;
// drücken (der Zeiger gleitet an die Spitze des Hebels), dann um den Punkt drehen: 30° im Uhrzeigersinn im Bild
const w0 = Math.atan2(stelle.y - mi.y, stelle.x - mi.x);
await s.mouse.down();
await s.waitForTimeout(250);
const rr = Math.hypot(stelle.x - mi.x, stelle.y - mi.y);
let ende = [stelle.x, stelle.y];
for (let i = 1; i <= 12; i++) {
  const w = w0 + ((30 * Math.PI) / 180) * (i / 12);
  ende = [mi.x + rr * Math.cos(w), mi.y + rr * Math.sin(w)];
  await s.mouse.move(ende[0], ende[1]);
  await s.waitForTimeout(30);
}
// wohin die Richtung zeigen muss: Beim Drücken gleitet der Zeiger an die Spitze des Griffs; von dort geht er den Weg der Maus
const soll1 = [mi.aus[0] + ende[0] - stelle.x, mi.aus[1] + ende[1] - stelle.y];
await s.waitForTimeout(150);
if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-bedienen-3-drehen.png`, await s.screenshot());
await s.mouse.up();
await s.waitForTimeout(500);
const Q1b = (await O('farbPunkte', 1)).punkte;
const gedreht = winkelZwischen(Q1b[1].aus, mi.aus);
const gegen = winkelZwischen(Q1b[1].ein, mi.ein);
const neben1 = winkelZwischen(Q1b[1].aus, soll1);
// mit ⌥: nur diese Seite, der Punkt knickt
const L1b = await O('farbLinieImBild', 1);
let stelle2 = null;
for (let i = Q1b[1].i + 1; i < L1b.length; i++) {
  if (Math.hypot(L1b[i].x - Q1b[1].x, L1b[i].y - Q1b[1].y) >= 16) {
    stelle2 = L1b[i];
    break;
  }
}
await s.mouse.move(stelle2.x + 20, stelle2.y - 30, { steps: 4 });
await s.waitForTimeout(200);
await s.mouse.move(stelle2.x, stelle2.y, { steps: 8 });
await s.waitForTimeout(600);
const w1 = Math.atan2(stelle2.y - Q1b[1].y, stelle2.x - Q1b[1].x);
await s.keyboard.down('Alt');
await s.mouse.down();
await s.waitForTimeout(250);
let ende2 = [stelle2.x, stelle2.y];
for (let i = 1; i <= 12; i++) {
  const w = w1 - ((40 * Math.PI) / 180) * (i / 12);
  ende2 = [Q1b[1].x + rr * Math.cos(w), Q1b[1].y + rr * Math.sin(w)];
  await s.mouse.move(ende2[0], ende2[1]);
  await s.waitForTimeout(30);
}
const soll2 = [Q1b[1].aus[0] + ende2[0] - stelle2.x, Q1b[1].aus[1] + ende2[1] - stelle2.y];
await s.waitForTimeout(150);
await s.mouse.up();
await s.keyboard.up('Alt');
await s.waitForTimeout(600);
const Q1c = (await O('farbPunkte', 1)).punkte;
const geknickt = winkelZwischen(Q1c[1].aus, Q1b[1].aus);
const gegenBleibt = winkelZwischen(Q1c[1].ein, Q1b[1].ein);
const neben2 = winkelZwischen(Q1c[1].aus, soll2);
ok(
  '3 eine Richtung drehen: an der Nadel gezogen dreht sie um ihren Punkt, die Gegenseite dreht mit; mit ⌥ knickt sie',
  /Richtung/.test(zielNadel) && gedreht > 10 && neben1 < 2 && Math.abs(gegen - gedreht) < 1 && !Q1b[1].knick && geknickt > 10 && neben2 < 2 && gegenBleibt < 1 && Q1c[1].knick,
  `am Zeiger „${zielNadel}“; gedreht um ${z2(gedreht)}° (${z2(neben1)}° neben dem Zeiger), die Gegenseite ${z2(gegen)}°, rund ${!Q1b[1].knick}; mit ⌥ um ${z2(geknickt)}° (${z2(neben2)}° neben dem Zeiger), die Gegenseite ${z2(gegenBleibt)}°, geknickt ${Q1c[1].knick}`,
);
await bild('3-gedreht');

// ---------- 4 Füllen und Löschen ----------
await klick(M[0] + 5, M[1]);
await s.waitForTimeout(500);
const f4 = await O('farbe');
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
// eine Stelle nah an Punkt 0 (der rechten Ecke), innen: gefüllt; nach dem Löschen des Punkts liegt sie außen
const pk0 = (await O('farbPunkte', 0)).punkte[0];
const probe = [pk0.x - 12, pk0.y];
const cVor = await farbeBei(probe[0], probe[1]);
await klick(pk0.x, pk0.y);
await s.waitForTimeout(300);
await s.keyboard.press('Backspace');
await s.waitForTimeout(600);
const P4 = await O('farbPunkte', 0);
const cNach = await farbeBei(probe[0], probe[1]);
const gelb = (c) => c[0] > c[2] + 60 && c[1] > c[2] + 40;
ok(
  '4 ein Klick füllt; ⌫ löscht einen gewählten Punkt, die Farblinie bleibt geschlossen, die Füllung folgt',
  f4.fuellungen === 1 && gelb(cVor) && !!P4 && P4.punkte.length === 4 && P4.zu && !gelb(cNach) && (await O('farbe')).fuellungen === 1,
  `Füllungen ${f4.fuellungen}; an der Stelle neben dem Punkt vorher ${cVor.join(', ')} (gelb), nach dem Löschen ${cNach.join(', ')}; die Farblinie hat ${P4?.punkte.length} Punkte, geschlossen ${P4?.zu}`,
);
await bild('4-geloescht');

// ---------- 5 ⌘Z ----------
const weg5 = await O('rueckweg');
const schritte = [];
for (let i = 0; i < 8; i++) {
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(450);
  const f = await O('farbe');
  schritte.push(`${f.linien}/${f.fuellungen}/${(await O('farbPunkte', 0))?.punkte.length ?? 0}`);
}
const summe5 = await O('werkSumme');
ok(
  '5 ⌘Z nimmt alles in der Reihenfolge zurück; die Form bleibt Zahl für Zahl dieselbe',
  schritte.join(' ') === '2/1/5 2/0/5 2/0/5 2/0/5 2/0/5 1/0/5 0/0/0 0/0/0' && summe5 === summe0,
  `Rückweg „${weg5}“; nach ⌘Z (Farblinien/Füllungen/Punkte der ersten): ${schritte.join(' → ')}; Form unberührt ${summe5 === summe0}`,
);

// ---------- 6 von hinten nichts zu greifen ----------
// noch einmal zeichnen, dann die Ansicht um die Hochachse auf die Rückseite drehen (ins Leere ziehen)
await s.keyboard.press('p');
await s.waitForTimeout(300);
for (const [x, y] of [...klicks, klicks[0]]) await klick(x, y);
await s.waitForTimeout(500);
await s.keyboard.press('a');
await s.waitForTimeout(300);
const vorn = (await O('farbPunkte', 0)).punkte;
await s.mouse.move(vorn[0].x + 2, vorn[0].y + 2, { steps: 6 });
await s.waitForTimeout(500);
const haengtVorn = (await O('bearbeiten')).haengt;
await s.mouse.move(1300, 760, { steps: 4 });
await s.waitForTimeout(200);
await s.mouse.down();
for (let i = 1; i <= 20; i++) {
  await s.mouse.move(1300 - 22 * i, 760);
  await s.waitForTimeout(18);
}
await s.mouse.up();
await s.waitForTimeout(1500);
const blick = await O('blick');
const hinten = (await O('farbPunkte', 0)).punkte;
let haengtHinten = false;
for (const q of hinten) {
  await s.mouse.move(q.x + 2, q.y + 2, { steps: 5 });
  await s.waitForTimeout(350);
  if ((await O('bearbeiten')).haengt) haengtHinten = true;
}
await bild('6-von-hinten');
ok(
  '6 von hinten gesehen ist kein Punkt der Farblinie zu greifen',
  haengtVorn && !haengtHinten && Math.abs(Math.abs(blick.gier) - Math.PI) < 0.7,
  `von vorn hängt der Punkt am Zeiger (${haengtVorn}); nach dem Drehen (Gier ${z2(blick.gier)}) hängt an keinem der fünf Punkte etwas (${!haengtHinten})`,
);

ok('7 keine Fehler in der Konsole', fehler.length === 0, [...new Set(fehler)].slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
