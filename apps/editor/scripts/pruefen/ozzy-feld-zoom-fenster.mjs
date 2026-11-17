// Ozzy, S17a im Plan „wie es weitergeht“ (17.11.2026): Zoomen und Schwenken je Feld der Vier Ansichten (Florian: „Jedes Feld für sich“),
// an „strange bird“ (NAME).
// Kriterien:
//   1  Rad über der Seite: Was unter dem Zeiger lag, bleibt dort (höchstens 1 px), die Seite ist größer geworden.
//   2  Front, Top und Raum bleiben unverändert: ihre Bilder gleichen sich vorher und nachher (höchstens 0,5 % der Bildpunkte anders);
//      so ragt auch nichts aus der gezoomten Seite in sie hinein.
//   3  Leertaste + Ziehen in der Front (60, 30): Die Front folgt genau (höchstens 1 px), die Seite bleibt.
//   4  Ein Punkt der Linien in der gezoomten Seite lässt sich greifen und ziehen: Er folgt der Maus (höchstens 1 px).
//   5  Tab zurück in den Raum und wieder hin, Bild für Bild: kein Nachschieben am Ende (höchstens 3 px), ein Gipfel der Geschwindigkeit je
//      Bezugspunkt, am Ende genau die gezoomten Felder (höchstens 1 px).
//   6  Pos1 setzt alle Felder zurück.
//   7  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-feld-zoom-fenster.mjs
import { chromium } from '@playwright/test';

const NAME = process.env.NAME ?? 'strange bird';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(200);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.waitForTimeout(300);
};
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
await ruhig();
await s.mouse.move(1430, 890);
await s.keyboard.press('Tab');
await s.waitForTimeout(1300);
await ruhig();
const F = await O('felderJetzt');
// Bild eines Felds (ohne Rand von 3 px) als PNG; verglichen wird im Browser (Anteil der Bildpunkte, die sich deutlich unterscheiden)
const feldBild = async (r) => (await s.screenshot({ clip: { x: r.x + 3, y: r.y + 3, width: r.w - 6, height: r.h - 6 } })).toString('base64');
const anders = (a, b) =>
  s.evaluate(async ([a2, b2]) => {
    const lesen = async (b64) => {
      const bild = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const c = new OffscreenCanvas(bild.width, bild.height);
      const g = c.getContext('2d');
      g.drawImage(bild, 0, 0);
      return g.getImageData(0, 0, bild.width, bild.height).data;
    };
    const A = await lesen(a2);
    const B = await lesen(b2);
    let n = 0;
    for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) n++;
    return n / (A.length / 4);
  }, [a, b]);
const vorher = { front: await feldBild(F.front), top: await feldBild(F.top), raum: await feldBild(F.raum) };

// 1: Rad über der Seite, nahe ihrem linken Rand (die Zeichnung wächst über ihn hinaus)
// ganze Bildpunkte: Das Rad meldet seinen Ort gerundet
const P = { x: Math.round(F.seite.x + 0.3 * F.seite.w), y: Math.round(F.seite.y + 0.45 * F.seite.h) };
const B0 = await O('flaecheHer', 'seite', P.x, P.y);
const R0 = await O('flaecheHin', 'seite', B0.X + 40, B0.Y);
await s.mouse.move(P.x, P.y);
for (let i = 0; i < 8; i++) {
  await s.mouse.wheel(0, -120);
  await s.waitForTimeout(40);
}
await s.waitForTimeout(300);
const P1 = await O('flaecheHin', 'seite', B0.X, B0.Y);
const R1 = await O('flaecheHin', 'seite', B0.X + 40, B0.Y);
const d1 = Math.hypot(P1.x - P.x, P1.y - P.y);
const k1 = Math.hypot(R1.x - P1.x, R1.y - P1.y) / Math.hypot(R0.x - P.x, R0.y - P.y);
ok('1 Seite zum Zeiger hin gezoomt', d1 <= 1 && k1 > 2, `Ort unter dem Zeiger ${z1(d1)} px daneben, ${z1(k1)}-fach größer`);
await s.mouse.move(1430, 890);
await s.waitForTimeout(400);
const nachher = { front: await feldBild(F.front), top: await feldBild(F.top), raum: await feldBild(F.raum) };
const a2 = [];
for (const n of ['front', 'top', 'raum']) a2.push(await anders(vorher[n], nachher[n]));
ok('2 Front, Top und Raum unverändert', a2.every((x) => x <= 0.005), `anders: Front ${z1(100 * a2[0])} %, Top ${z1(100 * a2[1])} %, Raum ${z1(100 * a2[2])} %`);

// 3: Leertaste + Ziehen in der Front
const Q = { x: Math.round(F.front.x + 0.5 * F.front.w), y: Math.round(F.front.y + 0.5 * F.front.h) };
const BF = await O('flaecheHer', 'front', Q.x, Q.y);
const S0 = await O('flaecheHin', 'seite', B0.X, B0.Y);
await s.mouse.move(Q.x, Q.y);
await s.keyboard.down(' ');
await s.mouse.down();
for (let k = 1; k <= 12; k++) {
  await s.mouse.move(Q.x + 5 * k, Q.y + 2.5 * k);
  await s.waitForTimeout(16);
}
await s.mouse.up();
await s.keyboard.up(' ');
await s.waitForTimeout(300);
const Q1 = await O('flaecheHin', 'front', BF.X, BF.Y);
const S1 = await O('flaecheHin', 'seite', B0.X, B0.Y);
const d3 = Math.hypot(Q1.x - (Q.x + 60), Q1.y - (Q.y + 30));
ok('3 Front geschwenkt, Seite bleibt', d3 <= 1 && Math.hypot(S1.x - S0.x, S1.y - S0.y) <= 0.5, `Front ${z1(d3)} px neben dem Zug, Seite ${z1(Math.hypot(S1.x - S0.x, S1.y - S0.y))} px`);

// 4: einen Punkt in der gezoomten Seite greifen und ziehen
const L = await O('werkLinienDaten');
let A = null;
for (const l of L)
  for (let i = 0; i < l.punkte.length && !A; i++) {
    const q = (await O('ankerImBild', l.id, i, 'seite')).find((v) => v.sichtbar && !v.m);
    if (q && q.x > F.seite.x + 30 && q.x < F.seite.x + F.seite.w - 30 && q.y > F.seite.y + 30 && q.y < F.seite.y + F.seite.h - 30) A = { id: l.id, i, x: q.x, y: q.y };
  }
if (!A) ok('4 Punkt in der gezoomten Seite ziehen', false, 'kein Punkt im Feld');
else {
  await s.mouse.move(A.x, A.y);
  await s.waitForTimeout(300);
  await s.mouse.down();
  for (let k = 1; k <= 10; k++) {
    await s.mouse.move(A.x, A.y - 3 * k);
    await s.waitForTimeout(16);
  }
  await s.waitForTimeout(150);
  await s.mouse.up();
  await ruhig();
  const A1 = (await O('ankerImBild', A.id, A.i, 'seite')).find((v) => !v.m);
  const d4 = Math.hypot(A1.x - A.x, A1.y - (A.y - 30));
  ok('4 Punkt in der gezoomten Seite ziehen', d4 <= 1, `Linie ${A.id}, Punkt ${A.i}: ${z1(d4)} px neben der Maus`);
  await s.keyboard.press('Meta+z');
  await ruhig();
}

// 5: Tab hin und zurück, Bild für Bild
await s.mouse.move(1430, 890);
const Z0 = await O('flaecheHin', 'seite', B0.X, B0.Y);
const ZF = await O('flaecheHin', 'front', BF.X, BF.Y);
await s.evaluate(() => window.__ozzy.film(true));
const fahrt = async (ziel) => {
  const bilder = [];
  for (let i = 0; i < 200; i++) {
    await s.evaluate(() => window.__ozzy.bild(1 / 60));
    const b = await O('faltPunkte');
    bilder.push(b);
    if (i > 2 && b.vier === ziel && bilder[i - 1].vier === ziel) break;
  }
  return bilder;
};
const gipfel = (bilder, j) => {
  const v = [];
  for (let i = 1; i < bilder.length; i++) v.push(Math.hypot(bilder[i].punkte[j].x - bilder[i - 1].punkte[j].x, bilder[i].punkte[j].y - bilder[i - 1].punkte[j].y));
  const max = Math.max(...v);
  const tol = Math.max(0.05, 0.03 * max);
  let n = 0;
  let steigt = true;
  let ref = v[0];
  for (const x of v) {
    if (steigt && x < ref - tol) {
      n++;
      steigt = false;
      ref = x;
    } else if (!steigt && x > ref + tol) {
      steigt = true;
      ref = x;
    } else ref = steigt ? Math.max(ref, x) : Math.min(ref, x);
  }
  return n;
};
await s.keyboard.press('Tab');
const zu = await fahrt(0);
await s.keyboard.press('Tab');
const auf = await fahrt(1);
const ende = auf[auf.length - 1];
const vorEnde = auf.findLast((b) => b.vier < 1);
let nach = 0;
for (let j = 0; j < 6; j++) nach = Math.max(nach, Math.hypot(ende.punkte[j].x - vorEnde.punkte[j].x, ende.punkte[j].y - vorEnde.punkte[j].y));
const gz = [0, 1, 2, 3, 4, 5].map((j) => gipfel(zu, j));
const ga = [0, 1, 2, 3, 4, 5].map((j) => gipfel(auf, j));
await s.evaluate(() => window.__ozzy.film(false));
await s.waitForTimeout(300);
const Z1 = await O('flaecheHin', 'seite', B0.X, B0.Y);
const ZF1 = await O('flaecheHin', 'front', BF.X, BF.Y);
const d5 = Math.max(Math.hypot(Z1.x - Z0.x, Z1.y - Z0.y), Math.hypot(ZF1.x - ZF.x, ZF1.y - ZF.y));
ok(
  '5 Tab zurück und wieder hin',
  nach <= 3 && gz.every((n) => n === 1) && ga.every((n) => n === 1) && d5 <= 1,
  `Nachschieben ${z1(nach)} px, Gipfel zu ${gz.join(' ')}, auf ${ga.join(' ')}, am Ende ${z1(d5)} px neben den gezoomten Feldern`,
);

// 6: Pos1
await s.keyboard.press('Home');
await s.waitForTimeout(300);
const fb = await O('feldBlick');
ok('6 Pos1 setzt alle Felder zurück', Object.values(fb).every((b) => b.zoom === 1 && b.x === 0 && b.y === 0), JSON.stringify(fb));
ok('7 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
