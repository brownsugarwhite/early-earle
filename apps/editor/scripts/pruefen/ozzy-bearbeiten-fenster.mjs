// Ozzy, Phase 5.1 und 5.2 (16.11.2026): eine gesicherte Form laden und an den Wänden des Raums bearbeiten, mit der Bedienung der
// Linien-Studie, gerechnet im Werk. Danach derselbe Ablauf im Prüffenster (`kurven.html`, gleiches Werk, gleicher Server) mit
// denselben Verschiebungen im Blatt: Ozzy rechnet, was Sitzung 4 rechnet.
// Kriterien:
//   1  Laden: Form „test_kaputt“ (NAME) in Ozzy; das Werk hat dieselben Linien und Punkte wie das Prüffenster nach dem Laden.
//   2  Zug an der Wand der Seite (ein Punkt, 30 Bildpunkte nach oben): Der Punkt folgt der Maus genau (höchstens 0,5 px), ein Schritt.
//   3  ⌘Z: alle Punkte und Griffe genau wie vorher.
//   4  Zug an der Wand der Front (ein Punkt, 25 Bildpunkte nach rechts), dann an der Wand der Seite eine Richtung gedreht (die Nadel am
//      selben Punkt wie in 2, 40° um den Punkt): zwei Schritte; die Gegenrichtung bleibt in der Flucht (glatter Punkt).
//   5  Derselbe Ablauf im Prüffenster (Verschiebungen im Blatt aus Ozzy übernommen): dieselben Punkte und Griffe (höchstens 0,01) und
//      dieselbe Zahl umgeschlagener Dreiecke.
//   6  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME="test_kaputt"] node scripts/pruefen/ozzy-bearbeiten-fenster.mjs [ordner für Bilder]
//   OZZY_URL (Standard http://localhost:5205/ozzy.html), KURVEN_URL (Standard http://localhost:5205/kurven.html?gewichte=geometrie&behalten=0)
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'test_kaputt';
const ozzyUrl = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const kurvenUrl = process.env.KURVEN_URL ?? 'http://localhost:5205/kurven.html?gewichte=geometrie&behalten=0';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const fehler = [];
const neueSeite = async () => {
  const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  s.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  s.on('pageerror', (e) => fehler.push(String(e)));
  return s;
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => x.toFixed(2).replace('.', ',');
const ze = (x) => x.toExponential(1).replace('.', ',');
const blatt = (a, p) => (a === 'seite' ? [p.x, -p.y] : a === 'front' ? [p.z, -p.y] : [p.x, p.z]);
/** größter Unterschied zweier Stände der Linien (Punkte und Griffe), Einheiten des Werks */
const unterschied = (A, B) => {
  let m = 0;
  if (A.length !== B.length) return Infinity;
  for (let k = 0; k < A.length; k++) {
    if (A[k].punkte.length !== B[k].punkte.length) return Infinity;
    A[k].punkte.forEach((p, i) => {
      const q = B[k].punkte[i];
      const v = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) : a || b ? Infinity : 0);
      m = Math.max(m, v(p.ref, q.ref), v(p.ein, q.ein), v(p.aus, q.aus));
    });
  }
  return m;
};

// ---------- Ozzy ----------
const oz = await neueSeite();
await oz.goto(`${ozzyUrl}?form=${encodeURIComponent(NAME)}`);
await oz.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => oz.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhigO = async () => {
  await oz.waitForTimeout(250);
  await oz.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 60000 });
  await oz.waitForTimeout(150);
  await oz.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 60000 });
};
await ruhigO();
const linienO = async () => (await O('werkLinienDaten')).map((l) => ({ id: l.id, art: l.art, punkte: l.punkte.map((p) => ({ ref: { x: p.x, y: p.y, z: p.z }, ein: p.ein, aus: p.aus, kreuzung: p.kreuzung })) }));
const L0 = await linienO();
const bild = async (name) => {
  if (ordner) await oz.screenshot({ path: `${ordner}/ozzy-bearbeiten-${name}.png` });
};
const zieheO = async (von, nach, n = 15, haltenMs = 200) => {
  await oz.mouse.move(von.x, von.y);
  await oz.waitForTimeout(350);
  await oz.mouse.down();
  await oz.waitForTimeout(60);
  for (let i = 1; i <= n; i++) {
    await oz.mouse.move(von.x + ((nach.x - von.x) * i) / n, von.y + ((nach.y - von.y) * i) / n);
    await oz.waitForTimeout(30);
  }
  await oz.waitForTimeout(haltenMs);
  await oz.mouse.up();
  await ruhigO();
};
const punktO = (L, id, i) => L.find((l) => l.id === id).punkte[i];
await bild('1-geladen');

// 2: Zug an der Wand der Seite
const A = { id: 2, i: 1 };
const a0 = (await O('ankerImBild', A.id, A.i, 'seite'))[0];
await oz.mouse.move(a0.x, a0.y);
await oz.waitForTimeout(400);
await bild('2-anflug');
await zieheO(a0, { x: a0.x, y: a0.y - 30 });
const a1 = (await O('ankerImBild', A.id, A.i, 'seite'))[0];
const b2 = await O('bearbeiten');
ok('2 Zug an der Wand der Seite: der Punkt folgt der Maus genau, ein Schritt', Math.hypot(a1.x - a0.x, a1.y - (a0.y - 30)) <= 0.5 && b2.schritte === 1, `${z2(a1.x - a0.x)} / ${z2(a1.y - a0.y)} px (Maus 0 / −30), ${b2.schritte} Schritt`);

// 3: ⌘Z
await oz.keyboard.press('Meta+z');
await ruhigO();
const L3 = await linienO();
const d3 = unterschied(L0, L3);
ok('3 ⌘Z: alle Punkte und Griffe genau wie vorher', d3 <= 1e-9 && (await O('bearbeiten')).schritte === 0, `größter Unterschied ${ze(d3)}`);

// 4: Zug an der Wand der Front, dann eine Richtung an der Wand der Seite
const B = { id: 1, i: 1 };
const bVor = punktO(L3, B.id, B.i);
const f0 = (await O('ankerImBild', B.id, B.i, 'front')).find((q) => !q.m);
await zieheO(f0, { x: f0.x + 25, y: f0.y });
const L4a = await linienO();
const bNach = punktO(L4a, B.id, B.i);
const dB = [blatt('front', bNach.ref)[0] - blatt('front', bVor.ref)[0], blatt('front', bNach.ref)[1] - blatt('front', bVor.ref)[1]];
const c0 = (await O('ankerImBild', A.id, A.i, 'seite'))[0];
const cVor = punktO(L4a, A.id, A.i);
// die Nadel: auf der Linie 10 px vom Punkt (nach unten, wo die Linie zum nächsten Punkt läuft), dann 40° um den Punkt
await oz.mouse.move(c0.x, c0.y + 10);
await oz.waitForTimeout(400);
const ziel = (await O('bearbeiten')).ziel;
await oz.mouse.down();
await oz.waitForTimeout(200);
for (let k = 1; k <= 20; k++) {
  const w = Math.PI / 2 + (k / 20) * ((40 * Math.PI) / 180);
  await oz.mouse.move(c0.x + 10 * Math.cos(w), c0.y + 10 * Math.sin(w));
  await oz.waitForTimeout(30);
}
await oz.waitForTimeout(250);
await bild('3-nadel');
await oz.mouse.up();
await ruhigO();
const L4 = await linienO();
const cNach = punktO(L4, A.id, A.i);
const b4 = await O('bearbeiten');
const wi = (g) => (Math.atan2(g.y, g.x) * 180) / Math.PI;
const flucht = Math.abs(((wi(cNach.aus) - wi(cNach.ein) + 540) % 360) - 180) > 179.5;
ok(
  '4 Zug an der Front, Richtung an der Seite: zwei Schritte, die Gegenrichtung in der Flucht',
  b4.schritte === 2 && ziel.startsWith('Richtung') && flucht && Math.abs(wi(cNach.aus) - wi(cVor.aus)) > 5,
  `Ziel „${ziel}“, Richtung im Blatt der Seite ${z2(wi(cVor.aus))}° → ${z2(wi(cNach.aus))}°, Front verschoben um ${z2(dB[0])} / ${z2(dB[1])}`,
);
const umO = (await O('werk')).umgeschlagen;
await oz.mouse.move(40, 860);
await oz.waitForTimeout(300);
await bild('4-nach');
await oz.keyboard.press('Tab');
await oz.waitForTimeout(1300);
await bild('5-vier');

// ---------- Prüffenster: derselbe Ablauf ----------
const pf = await neueSeite();
await pf.goto(kurvenUrl);
await pf.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
const P = (f, ...a) => pf.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const ruhigP = async () => {
  await pf.waitForTimeout(250);
  await pf.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 });
  await pf.waitForTimeout(150);
  await pf.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 });
};
await pf.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
await ruhigP();
const linienP = async () => (await P('loops')).map((l) => ({ id: l.id, art: l.art, punkte: l.punkte.map((p) => ({ ref: p.ref, ein: p.ein, aus: p.aus, kreuzung: p.kreuzung })) }));
const P0 = await linienP();
const d1 = unterschied(L0, P0);
ok('1 Laden: dieselben Linien und Punkte wie im Prüffenster', d1 <= 1e-9, `größter Unterschied ${ze(d1)}`);
/** ein Blatt-Vektor in Bildpunkte des Prüffensters: Maßstab aus zwei Bildern */
const imBild = async (a, p) => P('bild', a, p);
const zieheP = async (von, nach, n = 15) => {
  await pf.mouse.move(von.x, von.y);
  await pf.waitForTimeout(250);
  await pf.mouse.down();
  await pf.waitForTimeout(60);
  for (let i = 1; i <= n; i++) {
    await pf.mouse.move(von.x + ((nach.x - von.x) * i) / n, von.y + ((nach.y - von.y) * i) / n);
    await pf.waitForTimeout(30);
  }
  await pf.waitForTimeout(200);
  await pf.mouse.up();
  await ruhigP();
};
// der Punkt der Front: von seiner Lage um dieselbe Verschiebung im Blatt
{
  const p = punktO(P0, B.id, B.i).ref;
  const s0 = await imBild('front', p);
  const s1 = await imBild('front', { x: p.x, y: p.y, z: p.z + 1 });
  const s2 = await imBild('front', { x: p.x, y: p.y - 1, z: p.z });
  const sx = s1.x - s0.x;
  const sy = s2.y - s0.y;
  await zieheP(s0, { x: s0.x + dB[0] * sx, y: s0.y + dB[1] * sy });
}
// die Richtung: Punkt wählen (Klick in der Seite), dann die Spitze seines Griffs „aus“ an die Stelle aus Ozzy ziehen
{
  const L = await linienP();
  const q = punktO(L, A.id, A.i);
  const s0 = await imBild('seite', q.ref);
  await pf.mouse.click(s0.x, s0.y);
  await pf.waitForTimeout(300);
  await ruhigP();
  const spitzeVor = await imBild('seite', { x: q.ref.x + q.aus.x, y: q.ref.y + q.aus.y, z: q.ref.z + q.aus.z });
  const spitzeNach = await imBild('seite', { x: q.ref.x + cNach.aus.x, y: q.ref.y + cNach.aus.y, z: q.ref.z + cNach.aus.z });
  await zieheP(spitzeVor, spitzeNach);
}
const P5 = await linienP();
const umP = await P('umgeschlagen');
const d5 = unterschied(L4, P5);
ok('5 im Prüffenster derselbe Ablauf: dieselben Punkte und Griffe, gleich viele umgeschlagene Dreiecke', d5 <= 0.01 && umO === umP, `größter Unterschied ${ze(d5)}; umgeschlagen Ozzy ${umO}, Prüffenster ${umP}`);
ok('6 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
