// Ozzy, Paint-Modus, Etappe 3 (19.11.2026; Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 12): Eine Füllung läuft ein. An
// einer frischen Kugel auf Wachs, mit `fuellen=tinte` (im Testbrowser ist das Einlaufen sonst aus).
//   20  Die Farbe läuft von der Stelle des Klicks aus: Nähere Stellen sind früher gefärbt als fernere; hinter der geschlossenen
//       Farblinie kommt nie Farbe an; am Ende steht dasselbe Bild wie ohne Einlaufen.
//   22  Eine offene Farblinie staut die Farbe: Hinter ihr kommt sie später an als gleich weit entfernt im Freien (sie läuft um
//       das Ende herum).
//   23  Tempo: Das Vorbereiten kostet höchstens 30 ms, die Bemalung je Bild während des Einlaufens im Median höchstens 1,5 ms.
//   24  ⌘Z mitten im Einlaufen nimmt die Füllung sofort ganz zurück.
//   25  Der Farbtropfen hängt am Zeiger, wo ein Klick füllen würde (mit A über der Form), sonst nicht.
//   26  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html [ART=tinte|honig] node scripts/pruefen/ozzy-farbe-fliessen-fenster.mjs [ordner für Bilder]
import fs from 'node:fs';
import { auf } from './ozzy-teile.mjs';

const ART = process.env.ART ?? 'tinte';
const ordner = process.argv[2] ?? '';
const t = await auf({ dichte: 1, extra: `ohneLinie=0&material=wachs&fuellen=${ART}` });
const { browser, s, O, geladen, klick, fehler } = t;
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');
/** ein Bild mit dieser Zeit rechnen und die Farben der Haut an den Stellen lesen (CSS-Pixel) */
const schritt = async (dt, punkte) =>
  s.evaluate(
    ({ dt, punkte }) => {
      const o = window.__ozzy;
      o.bild(dt);
      const haut = document.getElementById('haut');
      const c = new OffscreenCanvas(haut.width, haut.height);
      const g = c.getContext('2d');
      g.drawImage(haut, 0, 0);
      const k = haut.width / window.innerWidth;
      return punkte.map(([x, y]) => Array.from(g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data.slice(0, 3)));
    },
    { dt, punkte },
  );
const farbe = async (hex) => {
  await s.evaluate((h) => {
    const f = document.getElementById('farbe-farbe');
    f.value = h;
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.dispatchEvent(new Event('change', { bubbles: true }));
  }, hex);
  await s.waitForTimeout(200);
};
/** gelb wie die gewählte Farbe (#f6c445 auf Wachs: viel Rot und Grün, wenig Blau) */
const gelb = (c) => c[0] > c[2] + 60 && c[1] > c[2] + 40;
/** blau (#2f8fd0) */
const blau = (c) => c[2] > c[0] + 50 && c[2] > 120;

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
await s.keyboard.press('b');
await s.waitForTimeout(500);
// eine geschlossene Farblinie (Fünfeck) und eine offene (ein Winkel, nach rechts offen)
await s.keyboard.press('p');
await s.waitForTimeout(400);
const M = [690, 420];
const ecken = [0, 1, 2, 3, 4].map((i) => [Math.round(M[0] + 55 * Math.cos((i * 2 * Math.PI) / 5)), Math.round(M[1] + 45 * Math.sin((i * 2 * Math.PI) / 5))]);
for (const [x, y] of [...ecken, ecken[0]]) await klick(x, y);
await s.keyboard.press('a');
await s.waitForTimeout(300);
await s.keyboard.press('p');
await s.waitForTimeout(400);
for (const [x, y] of [
  [800, 470],
  [770, 510],
  [800, 550],
])
  await klick(x, y);
await s.keyboard.press('Enter');
await s.waitForTimeout(400);
await s.keyboard.press('a');
await s.waitForTimeout(400);
const vor = await O('farbe');
if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-fliessen-0.png`, await s.screenshot());

// ---------- 20: von der Stelle des Klicks aus, bis an die Farblinie ----------
{
  // Stellen im Fünfeck in wachsendem Abstand vom Klick, und eine dahinter
  const P = [
    [M[0], M[1]],
    [M[0] + 18, M[1]],
    [M[0] + 36, M[1]],
    [M[0] - 30, M[1] + 12],
    [M[0] + 80, M[1]],
  ];
  await O('film', true);
  await klick(M[0], M[1]);
  await s.mouse.move(1380, 60);
  const erst = P.map(() => -1);
  const C0 = await schritt(1 / 1000, P);
  const f0 = await O('farbFluss');
  const N = 24;
  const dt = f0 ? (f0.dauer * 1.05) / N : 1 / 60;
  let zeit = 0;
  const fronten = [];
  for (let i = 0; i < N; i++) {
    const C = await schritt(dt, P);
    zeit += dt;
    const f = await O('farbFluss');
    if (f) fronten.push(f.front);
    C.forEach((c, j) => {
      if (erst[j] < 0 && gelb(c)) erst[j] = zeit;
    });
    if (ordner && i === 5) fs.writeFileSync(`${ordner}/ozzy-farbe-fliessen-20-mitten.png`, await s.screenshot());
  }
  const nach = await O('farbFluss');
  const Cend = await schritt(1 / 60, P);
  await O('film', false);
  await s.waitForTimeout(300);
  // dasselbe ohne Einlaufen: zurück, abschalten, noch einmal füllen
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(400);
  await O('farbFliessen', 'aus');
  await O('film', true);
  await klick(M[0], M[1]);
  await s.mouse.move(1380, 60);
  const Cohne = await schritt(1 / 60, P);
  const ohneFluss = await O('farbFluss');
  await O('film', false);
  await O('farbFliessen', ART);
  await s.waitForTimeout(300);
  let unterschied = 0;
  Cend.forEach((c, j) => c.forEach((v, q) => (unterschied = Math.max(unterschied, Math.abs(v - Cohne[j][q])))));
  let waechst = true;
  for (let i = 1; i < fronten.length; i++) if (fronten[i] < fronten[i - 1]) waechst = false;
  ok(
    '20 die Farbe läuft von der Stelle des Klicks aus: nah vor fern, hinter der Farblinie nie, am Ende dasselbe Bild wie ohne Einlaufen',
    !!f0 && !gelb(C0[2]) && erst[0] >= 0 && erst[0] <= erst[1] && erst[1] < erst[2] && erst[3] > erst[0] && erst[4] < 0 && waechst && nach === null && ohneFluss === null && unterschied <= 3,
    `läuft ${f0 ? `${z2(f0.dauer)} s, größte Weite ${z2(f0.groesst)} Einheiten` : 'nicht'}; gefärbt nach (s): am Klick ${z2(erst[0])}, 18 Pixel daneben ${z2(erst[1])}, 36 Pixel ${z2(erst[2])}, schräg 32 Pixel ${z2(erst[3])}, hinter der Farblinie ${erst[4] < 0 ? 'nie' : z2(erst[4])}; die Front wächst stetig (${waechst}); danach läuft nichts mehr (${nach === null}); größter Unterschied zum Bild ohne Einlaufen ${unterschied} von 255`,
  );
}

// ---------- 22: eine offene Farblinie staut ----------
{
  await farbe('#2f8fd0');
  // im Winkel geklickt (rechts von seiner Spitze): hinter der Spitze und gleich weit im Freien
  const klickBei = [790, 510];
  const P = [
    [752, 510],
    [828, 510],
  ];
  await O('film', true);
  await klick(klickBei[0], klickBei[1]);
  await s.mouse.move(1380, 60);
  await schritt(1 / 1000, P);
  const f0 = await O('farbFluss');
  const erst = [-1, -1];
  const N = 60;
  const dt = f0 ? (f0.dauer * 1.05) / N : 1 / 60;
  let zeit = 0;
  for (let i = 0; i < N; i++) {
    const C = await schritt(dt, P);
    zeit += dt;
    C.forEach((c, j) => {
      if (erst[j] < 0 && blau(c)) erst[j] = zeit;
    });
    if (ordner && i === 3) fs.writeFileSync(`${ordner}/ozzy-farbe-fliessen-22-stau.png`, await s.screenshot());
  }
  await O('film', false);
  await s.waitForTimeout(300);
  ok(
    '22 eine offene Farblinie staut die Farbe: Hinter ihr kommt sie später an als gleich weit entfernt im Freien',
    !!f0 && erst[1] > 0 && erst[0] > 0 && erst[0] > 1.6 * erst[1],
    `gefärbt nach (s): im Freien (38 Pixel vom Klick) ${z2(erst[1])}, hinter der Spitze des Winkels (38 Pixel vom Klick) ${z2(erst[0])}`,
  );
}

// ---------- 23: Tempo ----------
{
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(500);
  await O('farbKosten', true);
  await klick(790, 510);
  await s.waitForTimeout(120);
  const f = await O('farbFluss');
  await s.waitForTimeout(1000 * (f ? f.dauer : 0.5) + 300);
  const kb = await O('farbKosten');
  ok('23 Tempo: Vorbereiten höchstens 30 ms, die Bemalung je Bild während des Einlaufens im Median höchstens 1,5 ms', !!f && f.ms <= 30 && kb.bilder >= 10 && kb.median <= 1.5, `vorbereitet in ${f ? z2(f.ms) : '–'} ms; je Bild (${kb.bilder} Bilder): Median ${z2(kb.median)} ms, 95 % ${z2(kb.p95)} ms, das teuerste ${z2(kb.groesst)} ms`);
}

// ---------- 24: ⌘Z mitten im Einlaufen ----------
{
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(500);
  const f1 = await O('farbe');
  await klick(790, 510);
  await s.waitForTimeout(90);
  const mitten = await O('farbFluss');
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(250);
  const danach = await O('farbFluss');
  const f2 = await O('farbe');
  await O('film', true);
  const C = await schritt(1 / 60, [[828, 510]]);
  await O('film', false);
  ok('24 ⌘Z mitten im Einlaufen nimmt die Füllung sofort ganz zurück', !!mitten && danach === null && f2.fuellungen === f1.fuellungen && !blau(C[0]), `lief (${!!mitten}); nach ⌘Z läuft nichts mehr (${danach === null}), Füllungen ${f1.fuellungen} → ${f2.fuellungen}; an der Stelle steht ${C[0].join(', ')}`);
}

// ---------- 25: der Farbtropfen am Zeiger ----------
{
  const da = async () => s.evaluate(() => !document.getElementById('farbtropfen').hidden);
  await s.mouse.move(830, 430, { steps: 4 });
  await s.waitForTimeout(400);
  const ueberForm = await da();
  await s.mouse.move(120, 780, { steps: 4 });
  await s.waitForTimeout(400);
  const daneben = await da();
  await s.keyboard.press('p');
  await s.mouse.move(830, 430, { steps: 4 });
  await s.waitForTimeout(400);
  const mitP = await da();
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
  ok('25 der Farbtropfen hängt am Zeiger, wo ein Klick füllen würde', ueberForm && !daneben && !mitP, `mit A über der Form ${ueberForm}, neben der Form ${daneben}, mit P über der Form ${mitP}`);
}

// ---------- 26 ----------
const echte = fehler.filter((e) => !/Return statement used in an inline/.test(e));
ok('26 keine Fehler in der Konsole', echte.length === 0, echte.slice(0, 3).join(' | '));
if ((await O('farbe')).linien !== vor.linien) console.log('(Hinweis: Die Zahl der Farblinien hat sich geändert)');
console.log(schlecht ? `${schlecht} Kriterien halten nicht` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
