// Ozzy, das Maul als echte Form (Plan „Maul, Zähne, Zunge“, Etappe 1, erste Scheibe, 20.11.2026), an „teat firefish“ (NAME), in
// der eingerasteten Seite. Eine Linie mit P vom Leeren vor der Form bis zum Mundwinkel in ihr, mit ↩ beendet, bleibt als Strich
// stehen und bekommt den Tropfen „Maul“. Der Tropfen macht daraus das Maul (`werk.maulSchneiden`).
// Kriterien:
//   1  Nach ↩ steht der Strich (kein neuer Loop), der Tropfen „Maul“ hängt an seinem Ende in der Form.
//   2  Esc verwirft ihn (kein Tropfen, kein Strich, die Linien wie vorher).
//   3  Noch einmal gezeichnet, Tropfen angetippt: Die Form hat ein Maul. Die Lippe ist ein Ring mit Kante und Zwillingen, sie ist
//      gewählt; im Maul liegen die Rachenlinie (hart) und die Mitte von Gaumen und Boden; die Linien der Form, die das Maul
//      kreuzen, enden an der Lippe. Kein Punkt ohne Spiegelbild. Das Werk kommt zur Ruhe.
//   4  Der alte Tropfen „Maul“ erscheint an dieser Lippe nicht (Öffnen kommt mit Etappe 2).
//   5  Ein Punkt der Lippe, in der Seite gezogen, nimmt seinen Zwilling mit: Beide Lippen bleiben aufeinander (bis auf den
//      Haarspalt), das Werk kommt zur Ruhe. Ein ⌘Z nimmt den Zug zurück.
//   6  Ein ⌘Z nimmt das Maul zurück.
//   7  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;x,y;…' (Werk, von vorn zum Mundwinkel)] node scripts/pruefen/ozzy-maul-fenster.mjs [ordner für Bilder]
//   FRISCH=1: statt einer gesicherten Form eine frisch gezeichnete (ein Oval, aufgeblasen, mit den drei Start-Loops); die Linie
//   des Mauls wird dann aus ihrem Kasten genommen (von links in die Form).
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
// von vorn (im Leeren vor der Schnauze) zum Mundwinkel, in Einheiten des Werks. Der erste Punkt liegt weit genug vor der Form:
// Dicht am Umriss fängt P die Linie der Mitte, und es beginnt eine Abzweigung statt eines freien Strichs.
let LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const FRISCH = process.env.FRISCH === '1';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await flickenAnlegen(s, undefined, fehler);
await s.goto(FRISCH ? `${basis}?loops=1` : `${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
if (FRISCH) {
  // ein Oval aufs Blatt, aufblasen, warten, bis die Form mit ihren Start-Loops steht
  const [cx, cy, rx, ry] = [720, 450, 190, 120];
  const kx = 0.5523 * rx;
  const ky = 0.5523 * ry;
  await O('form', [
    { x: cx + rx, y: cy, ein: [0, -ky], aus: [0, ky] },
    { x: cx, y: cy + ry, ein: [kx, 0], aus: [-kx, 0] },
    { x: cx - rx, y: cy, ein: [0, ky], aus: [0, -ky] },
    { x: cx, y: cy - ry, ein: [-kx, 0], aus: [kx, 0] },
  ]);
  await s.waitForTimeout(300);
  await O('aufblasen');
  await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
  await s.waitForTimeout(2500);
}
const ruhig = async (zeit = 120000) => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: zeit });
  await s.waitForTimeout(200);
};
await ruhig();
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-maul-${name}.png` });
};
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
const klick = async (x, y) => {
  await s.mouse.move(x, y);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
const vorher = await O('werkLinienDaten');
const umgVorher = (await O('werk')).umgeschlagen;
if (FRISCH) {
  // die Linie aus dem Kasten der Form (ihrer Linienpunkte): von links im Leeren bis zu einem Drittel in die Form, leicht gebogen
  const P = vorher.flatMap((l) => l.punkte);
  const x0 = Math.min(...P.map((p) => p.x));
  const x1 = Math.max(...P.map((p) => p.x));
  const y0 = Math.min(...P.map((p) => p.y));
  const y1 = Math.max(...P.map((p) => p.y));
  const W = x1 - x0;
  const ym = 0.5 * (y0 + y1) - 0.12 * (y1 - y0);
  LINIE = [
    [x0 - 0.3 * W, ym + 0.02 * W],
    [x0 + 0.1 * W, ym - 0.02 * W],
    [x0 + 0.3 * W, ym + 0.03 * W],
  ];
  console.log(`frische Form: ${vorher.length} Linien, Kasten x ${x0.toFixed(0)} … ${x1.toFixed(0)}, y ${y0.toFixed(0)} … ${y1.toFixed(0)}; Linie des Mauls ${LINIE.map((q) => q.map((v) => v.toFixed(0)).join(',')).join(' ; ')}`);
}
const zeichnen = async () => {
  await s.keyboard.press('p');
  await s.waitForTimeout(300);
  for (const [x, y] of LINIE) {
    const q = await O('werkImBild', { x, y, z: 0 });
    await klick(q.x, q.y);
  }
  await s.keyboard.press('Enter');
  await s.waitForTimeout(500);
};

// 1 der Strich wartet, der Tropfen hängt an seinem Ende
await zeichnen();
const st1 = await O('maulStrich');
const p1 = await O('pose');
const l1 = await O('werkLinienDaten');
const ende = await O('werkImBild', { x: LINIE[LINIE.length - 1][0], y: LINIE[LINIE.length - 1][1], z: 0 });
ok(
  '1 nach ↩ wartet der Strich, der Tropfen „Maul“ hängt an seinem Ende in der Form',
  !!st1 && st1.innenAmEnde && p1.tropfen === 'Maul' && l1.length === vorher.length && !!st1.ort && Math.hypot(st1.ort.x - ende.x, st1.ort.y - ende.y) < 3,
  `Strich ${st1 ? `${st1.anker} Anker, Mundwinkel am ${st1.innenAmEnde ? 'Ende' : 'Anfang'}` : 'keiner'}; Tropfen ${p1.tropfen ?? 'keiner'}; Linien ${vorher.length} → ${l1.length}; Meldung: ${(await O('werk')).meldung}`,
);
await bild('1-strich');

// 2 Esc verwirft ihn
await s.keyboard.press('Escape');
await s.waitForTimeout(400);
const st2 = await O('maulStrich');
const p2 = await O('pose');
ok('2 Esc verwirft den Strich', !st2 && p2.tropfen !== 'Maul' && (await O('werkLinienDaten')).length === vorher.length, `Strich ${st2 ? 'noch da' : 'weg'}; Tropfen ${p2.tropfen ?? 'keiner'}`);

// 3 noch einmal, und der Tropfen macht das Maul
await s.keyboard.press('Escape');
await zeichnen();
const st3 = await O('maulStrich');
if (!st3) ok('3 das Maul entsteht', false, 'kein wartender Strich nach dem zweiten Zeichnen');
else {
  const t0 = Date.now();
  await s.click('#maul-tropfen');
  await s.waitForFunction(() => !window.__ozzy.maulStrich() || /Maul geht hier nicht|Maul:/.test(window.__ozzy.werk().meldung ?? ''), null, { timeout: 60000 }).catch(() => {});
  await ruhig();
  const ms = Date.now() - t0;
  const L = await O('werkLinienDaten');
  const w = await O('werk');
  const lippe = L.find((l) => l.maulEcht);
  const rachen = L.filter((l) => l.kante && !l.maulEcht && l.haengt);
  const haengend = L.filter((l) => l.haengt && (l.haengt[0] || l.haengt[1]));
  const zw = lippe ? lippe.punkte.length : 0;
  ok(
    '3 das Maul entsteht: Lippe mit Kante und Zwillingen, zwei Linien im Maul, das Werk kommt zur Ruhe',
    !!lippe && lippe.kante === true && lippe.art === 'ring' && zw >= 3 && zw % 2 === 1 && rachen.length >= 1 && L.length >= vorher.length + 3 && !(await O('maulStrich')),
    `${ms} ms bis zur Ruhe; Linien ${vorher.length} → ${L.length}; Lippe ${lippe ? `${lippe.id} (${lippe.art}, ${zw} Punkte, Haarspalt ${lippe.maulLinie}°)` : 'fehlt'}; hart im Maul ${rachen.length}; ${haengend.length} Linien hängen an einer anderen; umgeschlagen ${umgVorher} → ${w.umgeschlagen}; Meldung: ${w.meldung}`,
  );
  await bild('2-maul-seite');
  // 4 der alte Tropfen erscheint an der gewählten Lippe nicht (auch nicht, wenn P aus ist)
  await s.keyboard.press('a');
  await s.waitForTimeout(500);
  const p4 = await O('pose');
  ok('4 an der Lippe des neuen Mauls hängt der alte Tropfen nicht', p4.tropfen === null, `Tropfen ${p4.tropfen ?? 'keiner'}`);
  // im Raum mit Wachs: das geschlossene Maul von der Seite und von vorn (nur als Bild, kein Kriterium)
  await s.keyboard.press('0');
  await s.waitForTimeout(1800);
  await O('material', 'wachs');
  await O('blickSetzen', { gier: -1.15, neigung: 0.12, zoom: 4 });
  await s.waitForTimeout(1200);
  await bild('3-maul-wachs');
  await O('blickSetzen', { gier: -1.8, neigung: 0.1, zoom: 4 });
  await s.waitForTimeout(1200);
  await bild('4-maul-wachs-vorn');
  await s.keyboard.press('1');
  await s.waitForTimeout(1800);
  // 5 ein Punkt der Lippe gezogen: sein Zwilling geht mit
  {
    const Lv = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    const n = Lv.punkte.length;
    const iW = (n - 1) / 2;
    // ein Punkt der ersten Lippe zwischen Spitze und Mundwinkel, nicht in der Spiegelebene
    const i = Math.max(1, Math.round(iW / 2));
    const j = n - 1 - i;
    const vor = Lv.punkte[i];
    const q = await O('werkImBild', { x: vor.x, y: vor.y, z: vor.z });
    // 8 Einheiten des Werks nach unten (im Bild je nach Größe der Form verschieden weit)
    const z = await O('werkImBild', { x: vor.x, y: vor.y - 8, z: vor.z });
    await s.mouse.move(q.x, q.y);
    await s.waitForTimeout(300);
    await s.mouse.down();
    for (let k = 1; k <= 8; k++) {
      await s.mouse.move(q.x + ((z.x - q.x) * k) / 8, q.y + ((z.y - q.y) * k) / 8);
      await s.waitForTimeout(40);
    }
    await s.mouse.up();
    await ruhig();
    const Ln = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    const w = await O('werk');
    const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    let paarWeit = 0;
    if (Ln && Ln.punkte.length % 2 === 1) for (let k = 0; k < (Ln.punkte.length - 1) / 2; k++) paarWeit = Math.max(paarWeit, d3(Ln.punkte[k], Ln.punkte[Ln.punkte.length - 1 - k]));
    const gegangen = Ln ? d3(Ln.punkte[i] ?? vor, vor) : 0;
    const zwilling = Ln ? d3(Ln.punkte[j] ?? vor, Lv.punkte[j]) : 0;
    ok(
      '5 ein Punkt der Lippe gezogen: der Zwilling geht mit, die Lippen bleiben aufeinander',
      !!Ln && Ln.punkte.length === n && gegangen > 4 && Math.abs(gegangen - zwilling) < 0.2 && paarWeit < 0.2,
      `Punkt ${i} ging ${gegangen.toFixed(2).replace('.', ',')}, sein Zwilling ${j} ging ${zwilling.toFixed(2).replace('.', ',')}; die Paare liegen höchstens ${paarWeit.toFixed(3).replace('.', ',')} auseinander; umgeschlagen ${w.umgeschlagen}; Meldung: ${(w.meldung ?? '').slice(0, 80)}`,
    );
    await bild('6-lippe-gezogen');
    await s.keyboard.press('Meta+z');
    await ruhig();
    const Lz = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    ok('5b ein ⌘Z nimmt den Zug zurück', !!Lz && d3(Lz.punkte[i], vor) < 1e-6, Lz ? `Punkt ${i} liegt ${d3(Lz.punkte[i], vor).toFixed(3)} neben vorher` : 'die Lippe fehlt');
  }
  // 6 ⌘Z nimmt das Maul zurück
  await s.keyboard.press('Meta+z');
  await ruhig();
  const L5 = await O('werkLinienDaten');
  ok('6 ein ⌘Z nimmt das Maul zurück', L5.length === vorher.length && !L5.some((l) => l.maulEcht), `Linien ${L5.length}`);
  await s.waitForTimeout(600);
  await bild('5-zurueck-wachs-vorn');
}
ok('7 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 4).join(' | '));
await browser.close();
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
