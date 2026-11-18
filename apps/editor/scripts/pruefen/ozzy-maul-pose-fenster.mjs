// Ozzy, Phase 5.4 (16.11.2026): Maul und Pose in Ozzy, an „maul handgemacht test“ (NAME), und Freihand im Raum. Gerechnet wird im Werk;
// die Pose vergleicht die Probe mit dem Prüffenster (`kurven.html`, gleiches Werk, gleicher Server) bei denselben Reglern.
// Kriterien:
//   1  Die Lippe (Linie RING, Standard 14) in der eingerasteten Seite angeklickt: An ihr hängt der Tropfen „Maul“; ein Klick darauf
//      macht sie zum Maul, oben rechts erscheint „Fressen“.
//   2  Regler Maul auf 40°: Die Pose ist an; die Haut, wie sie zu sehen ist, liegt wie im Prüffenster bei denselben Reglern (höchstens
//      0,01); das Papier ist getönt.
//   3  In der Pose den untersten Punkt der Lippe 15 Bildpunkte nach unten ziehen: ein Schritt; ⌘Z bringt die Haut der Pose genau zurück.
//   4  „Fressen“ aus: die Grundform wie vor der Pose (höchstens 0,01), das Papier wieder weiß.
//   5  Freihand (N) in der eingerasteten Seite an „test_kaputt“ (FREIHAND; dort liegt mitten auf der Seite eine große runde Fläche): ein
//      gezeichneter Kreis wird eine Linie im Werk (ein Schritt); ⌘Z nimmt sie zurück.
//   6  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [RING=…] node scripts/pruefen/ozzy-maul-pose-fenster.mjs [ordner für Bilder]
//   OZZY_URL (Standard http://localhost:5205/ozzy.html), KURVEN_URL (Standard http://localhost:5205/kurven.html?gewichte=geometrie&behalten=0)
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'maul handgemacht test';
const RING = Number(process.env.RING ?? 14);
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
const ze = (x) => (Number.isFinite(x) ? x.toExponential(1).replace('.', ',') : 'andere Punktzahl');
const groesster = (A, B) => {
  if (!A || !B || A.length !== B.length) return Infinity;
  let m = 0;
  for (let i = 0; i < A.length; i += 3) m = Math.max(m, Math.hypot(A[i] - B[i], A[i + 1] - B[i + 1], A[i + 2] - B[i + 2]));
  return m;
};
/** einen Regler setzen, wie mit der Maus: drücken, Wert, loslassen */
const regler = (s, sel, wert) =>
  s.evaluate(
    ([q, v]) => {
      const r = document.querySelector(q);
      r.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      r.value = String(v);
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
    },
    [sel, wert],
  );

// ---------- Ozzy ----------
const oz = await neueSeite();
await oz.goto(`${ozzyUrl}?form=${encodeURIComponent(NAME)}`);
await oz.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => oz.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhigO = async () => {
  await oz.waitForTimeout(250);
  await oz.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.pose().lauf, null, { timeout: 90000 });
  await oz.waitForTimeout(150);
  await oz.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
};
const bild = async (name) => {
  if (ordner) await oz.screenshot({ path: `${ordner}/ozzy-maul-pose-${name}.png` });
};
const klickO = async (x, y) => {
  await oz.mouse.move(x, y, { steps: 4 });
  await oz.waitForTimeout(350);
  await oz.mouse.down();
  await oz.waitForTimeout(80);
  await oz.mouse.up();
  await oz.waitForTimeout(350);
};
await ruhigO();
const grundVor = (await O('werkRoh')).pos;
await oz.keyboard.press('1');
await oz.waitForTimeout(1400);

// 1 die Lippe wählen, der Tropfen „Maul“
{
  const a = await O('linieImBild', RING, 'seite');
  await klickO(a.x, a.y);
}
const p1 = await O('pose');
await bild('1-tropfen');
let p1b = p1;
if (p1.tropfen) {
  await oz.click('#maul-tropfen');
  await oz.waitForTimeout(400);
  p1b = await O('pose');
}
ok('1 an der gewählten Lippe der Tropfen „Maul“; ein Klick macht sie zum Maul, oben rechts „Fressen“', p1.tropfen === 'Maul' && p1b.maul === RING && p1b.fressen, `Tropfen „${p1.tropfen}“, Maul ${p1b.maul}, Fressen ${p1b.fressen}`);

// 2 Regler Maul auf 40°
await regler(oz, '#fressen-maul', 40);
await oz.waitForTimeout(600);
await ruhigO();
await oz.waitForTimeout(400);
const p2 = await O('pose', true);
await bild('2-pose');

// ---------- Prüffenster: dieselbe Lippe, dieselben Regler ----------
const pf = await neueSeite();
await pf.goto(kurvenUrl);
await pf.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
const K = (f, ...a) => pf.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const ruhigP = async () => {
  await pf.waitForTimeout(250);
  await pf.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 });
  await pf.waitForTimeout(150);
  await pf.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 });
};
await pf.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
await ruhigP();
await pf.keyboard.press('Home');
await pf.waitForTimeout(300);
let gewaehlt = false;
for (const f of [0.3, 0.2, 0.4, 0.12, 0.6, 0.7, 0.85]) {
  const L = (await K('loops')).find((l) => l.id === RING);
  let j = 0;
  for (let i = 1; i < L.s.length; i++) if (Math.abs(L.s[i] - f * L.laenge) < Math.abs(L.s[j] - f * L.laenge)) j = i;
  const q = await K('bild', 'seite', { x: L.ruhe[3 * j], y: L.ruhe[3 * j + 1], z: L.ruhe[3 * j + 2] });
  await pf.mouse.click(q.x, q.y);
  await pf.waitForTimeout(200);
  const g = await K('auswahl');
  if (g.length === 1 && g[0].l === RING && g[0].i < 0) {
    gewaehlt = true;
    break;
  }
  const leer = await K('bild', 'seite', { x: 0, y: 900, z: 0 });
  await pf.mouse.click(leer.x, leer.y);
  await pf.waitForTimeout(450);
}
await regler(pf, '#maul-oeffnung', 40);
await pf.waitForTimeout(600);
await ruhigP();
await pf.waitForTimeout(400);
const posePf = await K('lagen');
const kp = await K('pose');
const d2 = groesster(p2.haut, posePf);
ok(
  '2 Regler Maul 40°: die Pose an, die Haut wie im Prüffenster, das Papier getönt',
  p2.an && p2.kiefer === 40 && gewaehlt && kp.an && d2 <= 0.01 && p2.papier > 0.95,
  `Ozzy ${p2.kiefer}°, Prüffenster ${kp.kiefer}° (Lippe gewählt: ${gewaehlt}); größter Unterschied der Haut ${ze(d2)}; Papier ${z2(p2.papier)}`,
);

// 3 in der Pose ziehen, ⌘Z
{
  const L = (await O('werkLinienDaten')).find((l) => l.id === RING);
  const anker = [];
  for (const p of L.punkte) if (p.sichtbar) anker.push({ i: p.i, a: (await O('ankerImBild', RING, p.i, 'seite'))[0] });
  const unten = anker.filter((x) => x.a).sort((u, v) => v.a.y - u.a.y)[0];
  const s0 = (await O('bearbeiten')).schritte;
  await oz.mouse.move(unten.a.x, unten.a.y, { steps: 4 });
  await oz.waitForTimeout(350);
  await oz.mouse.down();
  await oz.waitForTimeout(60);
  for (let k = 1; k <= 15; k++) {
    await oz.mouse.move(unten.a.x, unten.a.y + k);
    await oz.waitForTimeout(30);
  }
  await oz.waitForTimeout(200);
  await oz.mouse.up();
  await ruhigO();
  const s1 = (await O('bearbeiten')).schritte;
  const gezogen = await O('pose', true);
  await bild('3-gezogen');
  await oz.keyboard.press('Meta+z');
  await ruhigO();
  const zurueck = await O('pose', true);
  const d3 = groesster(zurueck.haut, p2.haut);
  ok('3 in der Pose gezogen: ein Schritt, ⌘Z genau zurück', s1 === s0 + 1 && groesster(gezogen.haut, p2.haut) > 1 && d3 <= 1e-9 && zurueck.an, `Schritte ${s0} → ${s1}, bewegt ${z2(groesster(gezogen.haut, p2.haut))}, nach ⌘Z ${ze(d3)} daneben`);
}

// 4 Fressen aus
await oz.click('#fressen-knopf');
await oz.waitForTimeout(800);
await ruhigO();
await oz.waitForTimeout(500);
const p4 = await O('pose');
const grundNach = (await O('werkRoh')).pos;
const d4 = groesster(grundNach, grundVor);
ok('4 „Fressen“ aus: die Grundform wie vorher, das Papier weiß', !p4.an && d4 <= 0.01 && p4.papier < 0.01, `größter Unterschied ${ze(d4)}; Papier ${z2(p4.papier)}`);
await bild('4-grundform');

// 5 Freihand in der eingerasteten Seite (an einer zweiten Form)
await oz.goto(`${ozzyUrl}?form=${encodeURIComponent(process.env.FREIHAND ?? 'test_kaputt')}`);
await oz.waitForFunction(() => !!window.__ozzy);
await ruhigO();
await oz.keyboard.press('1');
await oz.waitForTimeout(1400);
{
  const n0 = (await O('werkLinienDaten')).length;
  await oz.keyboard.press('n');
  await oz.waitForTimeout(200);
  // mitten auf die Form (Mitte ihrer Haut, von der Seite)
  const P = (await O('werkRoh')).pos;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) {
    x0 = Math.min(x0, P[i]);
    x1 = Math.max(x1, P[i]);
    y0 = Math.min(y0, P[i + 1]);
    y1 = Math.max(y1, P[i + 1]);
  }
  const c = await O('flaecheHin', 'seite', (x0 + x1) / 2, -(y0 + y1) / 2);
  const r = 30;
  await oz.mouse.move(c.x + r, c.y);
  await oz.waitForTimeout(150);
  await oz.mouse.down();
  for (let k = 1; k <= 64; k++) {
    const w = (2 * Math.PI * k) / 60;
    await oz.mouse.move(c.x + r * Math.cos(w), c.y + r * Math.sin(w));
    await oz.waitForTimeout(16);
  }
  await oz.waitForTimeout(250);
  await oz.mouse.up();
  await ruhigO();
  const n1 = (await O('werkLinienDaten')).length;
  await bild('5-freihand');
  await oz.keyboard.press('Meta+z');
  await ruhigO();
  const n2 = (await O('werkLinienDaten')).length;
  ok('5 Freihand: ein Kreis in der eingerasteten Seite wird eine Linie, ⌘Z nimmt sie zurück', n1 === n0 + 1 && n2 === n0, `Linien ${n0} → ${n1} → ${n2}${n1 === n0 ? ` („${(await O('werk')).meldung}“)` : ''}`);
}
ok('6 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
