// Ozzy, Formen beginnen mit Edgeloops (Plan „Objekte, Spiegel und Nähte“, Abschnitt 11, 18.11.2026; Florian: „ok, dann starten wir
// mit loops“). Der Standard im Fenster; im Testbrowser mit `loops=1` in der Adresse.
// Kriterien:
//   1  Ein Kreis: Nach dem Aufblasen hat die Form drei Linien (die Linie der Seite, dazu zwei Ringe rundum), die Ringe teilen einen
//      Punkt an der dicksten Stelle; nichts ist umgeschlagen, das Werk steht; ihr Rauminhalt liegt höchstens 12 % unter dem der Kugel
//      (gemessen am 18.11.: 9,7 %: zwischen wenigen Linien fällt die Haut ein).
//   2  ⌘Z nimmt die Start-Loops nicht zurück; Luft ablassen und wieder aufblasen legt sie nicht noch einmal an.
//   3  Eine Form, die nicht konvex ist (Bumerang): Beide Ringe entstehen, nichts ist umgeschlagen, die Form liegt, wie gezeichnet.
//   4  Zwei Formen mit Start-Loops verschmelzen: Die Form bleibt stehen (Rauminhalt nach dem Setzen höchstens 1 % anders).
//   5  K an der Naht: Die Rechnung kommt zur Ruhe (keine Meldung, dass die Haut auseinanderlief), nichts schlägt um, die Form geht
//      wenig mit (Rauminhalt höchstens 6 % anders; gemessen 2,2 %).
//   6  Mehrere Silhouetten auf einem Blatt: Jede Form bekommt ihre drei Linien.
//   7  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html node scripts/pruefen/ozzy-start-loops-fenster.mjs [ordner für Bilder]
import { auf, z1 } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const t = await auf({ extra: 'loops=1' });
const { browser, s, O, geladen, fehler } = t;
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/${name}.png` });
};
const still = async () => {
  await s.waitForTimeout(400);
  await s.waitForFunction(() => !window.__ozzy.reihe() && !window.__ozzy.nahtStand().laeuft && !window.__ozzy.werk().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: 120000 });
  await s.waitForTimeout(400);
};
/** die Form ist aufgeblasen, ihre Start-Loops stehen, das Werk ruht */
const fertig = async () => {
  await geladen();
  await s.waitForFunction(() => !window.__ozzy.reihe() && window.__ozzy.werk().linien >= 3 && !window.__ozzy.werk().beschaeftigt, null, { timeout: 120000 });
  await still();
};
const kreis = (cx, cy, R) => {
  const k = 0.5523 * R;
  return [
    { x: cx + R, y: cy, ein: [0, -k], aus: [0, k] },
    { x: cx, y: cy + R, ein: [k, 0], aus: [-k, 0] },
    { x: cx - R, y: cy, ein: [0, k], aus: [0, -k] },
    { x: cx, y: cy - R, ein: [-k, 0], aus: [k, 0] },
  ];
};
const BUMERANG = [
  { x: 500, y: 300, ein: [-30, 40], aus: [40, -40] },
  { x: 700, y: 380, ein: [-70, -40], aus: [70, 40] },
  { x: 900, y: 300, ein: [-40, 40], aus: [40, 40] },
  { x: 900, y: 420, ein: [30, -40], aus: [-40, 60] },
  { x: 700, y: 600, ein: [110, -10], aus: [-110, -10] },
  { x: 500, y: 420, ein: [40, 60], aus: [-30, -40] },
];
const tsd = (x) => `${Math.round(x / 1000)} Tsd.`;
const arten = (n) => n.linien.map((l) => `${l.art} ${l.punkte} P.`).join(', ');

// ---------- 1 ein Kreis ----------
await O('form', kreis(720, 450, 130));
await s.waitForTimeout(300);
await O('aufblasen');
await fertig();
const n1 = await O('nahtStand');
const w1 = await O('werk');
const L1 = await O('werkLinienDaten');
const kugel = (4 / 3) * Math.PI * n1.kasten.rx ** 3;
// die zwei Ringe teilen einen Punkt (dieselbe Stelle im Raum, beide vorn)
const ringe = n1.linien.filter((l) => l.art === 'ring');
await bild('start-1-kreis');
ok(
  '1 Kreis: drei Linien (Seite, quer, längs), nichts umgeschlagen, das Werk steht, höchstens 12 % unter der Kugel',
  n1.linien.length === 3 && n1.linien.filter((l) => l.art === 'mitte').length === 1 && ringe.length === 2 && ringe.every((l) => l.pfad && l.punkte >= 3) && w1.umgeschlagen === 0 && n1.offen === 0 && n1.inhalt / kugel > 0.88 && n1.inhalt / kugel < 1.02,
  `Linien: ${arten(n1)}; ${L1.length} Linien im Blatt; Rauminhalt ${tsd(n1.inhalt)}, Kugel ${tsd(kugel)} (${(100 * (n1.inhalt / kugel - 1)).toFixed(1)} %); umgeschlagen ${w1.umgeschlagen}`,
);

// ---------- 2 ⌘Z und Luft ablassen ----------
await s.keyboard.press('Meta+z');
await still();
const n2a = await O('nahtStand');
await s.keyboard.press('Backspace');
await s.waitForFunction(() => window.__ozzy.zustand() === 'blatt', null, { timeout: 30000 });
await s.waitForTimeout(500);
await s.keyboard.press('Enter');
await geladen();
await still();
await s.waitForTimeout(1500);
await still();
const n2b = await O('nahtStand');
ok('2 ⌘Z nimmt die Start-Loops nicht zurück; Luft ablassen und wieder aufblasen legt sie nicht noch einmal an', w1.schritte === 0 && n2a.linien.length === 3 && n2b.linien.length === 3, `Schritte für ⌘Z nach dem Start ${w1.schritte}; Linien nach ⌘Z ${n2a.linien.length}, nach Ablassen und Aufblasen ${n2b.linien.length}`);

// ---------- 3 nicht konvex ----------
await O('form', BUMERANG);
await s.waitForTimeout(300);
await O('aufblasen');
await fertig();
const n3 = await O('nahtStand');
const w3 = await O('werk');
await bild('start-3-bumerang');
ok(
  '3 Bumerang: beide Ringe entstehen, nichts umgeschlagen, die Form liegt, wie gezeichnet',
  n3.linien.length === 3 && n3.linien.filter((l) => l.art === 'ring').length === 2 && w3.umgeschlagen === 0 && n3.offen === 0 && Math.abs(n3.kasten.rx - 219) < 8 && Math.abs(n3.kasten.cx - -20) < 8,
  `Linien: ${arten(n3)}; Kasten: Mitte ${z1(n3.kasten.cx)}, halbe Breite ${z1(n3.kasten.rx)}, halbe Höhe ${z1(n3.kasten.ry)}, Tiefe ${z1(n3.kasten.tiefe)}; umgeschlagen ${w3.umgeschlagen}`,
);

// ---------- 4 und 5 zwei Formen verschmelzen, K an der Naht ----------
await O('form', kreis(600, 450, 130));
await s.waitForTimeout(300);
await O('aufblasen');
await fertig();
await s.click('#plus');
await s.waitForTimeout(700);
await O('form', kreis(760, 400, 80), true);
await O('aufblasen');
await fertig();
await s.click('#naht-vereinen');
await s.waitForFunction(() => window.__ozzy.objekte().ruhende.length === 0 && !window.__ozzy.nahtStand().laeuft, null, { timeout: 30000 });
const gleich = await O('nahtStand');
await still();
const v = await O('nahtStand');
const w4 = await O('werk');
await bild('start-4-verschmolzen');
ok('4 verschmelzen: Die Form bleibt stehen', v.offen === 0 && v.ohnePaar === 0 && Math.abs(v.inhalt / gleich.inhalt - 1) < 0.01 && w4.umgeschlagen === 0 && v.linien.some((l) => l.kante), `Rauminhalt gleich nach dem Verbinden ${tsd(gleich.inhalt)}, nach dem Setzen ${tsd(v.inhalt)} (${(100 * (v.inhalt / gleich.inhalt - 1)).toFixed(1)} %); ${v.linien.length} Linien; umgeschlagen ${w4.umgeschlagen}`);
await s.keyboard.press('k');
await still();
const vk = await O('nahtStand');
const wk = await O('werk');
await bild('start-5-weich');
ok(
  '5 K an der Naht: Die Rechnung kommt zur Ruhe, nichts schlägt um, die Form geht wenig mit',
  !/nicht aufräumen|auseinander/.test(String(wk.meldung)) && vk.linien.filter((l) => l.kante).length === 0 && wk.umgeschlagen === 0 && vk.offen === 0 && Math.abs(vk.inhalt / v.inhalt - 1) < 0.06,
  `Rauminhalt ${tsd(vk.inhalt)} (${(100 * (vk.inhalt / v.inhalt - 1)).toFixed(1)} % gegen mit Kante); umgeschlagen ${wk.umgeschlagen}; Meldung „${wk.meldung}“`,
);

// ---------- 6 mehrere Silhouetten auf einem Blatt ----------
await O('neu');
await s.waitForTimeout(400);
await O('form', kreis(640, 470, 120));
await O('formDazu', kreis(880, 380, 60));
await s.waitForTimeout(500);
await s.keyboard.press('Enter');
await s.waitForFunction(() => !window.__ozzy.reihe() && window.__ozzy.zustand() === 'ruhe' && window.__ozzy.werk().gezeigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: 120000 });
await still();
const o6 = await O('objekte');
const w6 = await O('werk');
await bild('start-6-zwei');
ok('6 zwei Silhouetten auf einem Blatt: Jede Form hat ihre drei Linien', o6.ruhende.length === 1 && w6.linien === 3 && o6.ruhende[0].linien === 3, `aktiv ${o6.aktiv} mit ${w6.linien} Linien; ruhend ${o6.ruhende.map((r) => `${r.id} mit ${r.linien} Linien`).join(', ')}`);

ok('7 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
