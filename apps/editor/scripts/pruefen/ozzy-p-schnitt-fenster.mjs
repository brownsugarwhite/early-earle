// Ozzy, P quer über die Form (S8 vom 16.11.; C2 im Plan „Ozzy stabil und schnell“, 18.11.2026), an „strange bird“ (NAME), in der
// eingerasteten Seite. Ein Strich mit P, der im Leeren beginnt und endet und mit ↩ beendet wird, gibt einen Loop rundum, gerade
// oder gebogen, mit beliebig vielen Punkten; in der Ansicht liegt er auf dem Strich.
// Kriterien:
//   1  Gerade: Klick im Leeren links der Form, Klick im Leeren rechts, ↩: ein neuer Loop rundum; in der Seite liegt er auf der
//      gezogenen Geraden (höchstens 0,5 Bildpunkte daneben).
//   2  Ein ⌘Z nimmt ihn zurück.
//   3  Gebogen: Klick im Leeren links, ein Punkt auf der Form (gezogen: er ist glatt), Klick im Leeren rechts. Vor ↩ zeigt der
//      Lichtring den Loop. ↩: ein neuer Loop rundum; in der Seite liegt seine Linie auf dem gezeichneten Bogen (höchstens 0,75
//      Bildpunkte daneben: Der Schnitt selbst liegt genau auf dem Strich, Kernprobe `form-vorhang.ts`; wo der Loop eine vorhandene
//      Linie kreuzt, teilt er ihren Punkt, und der liegt auf ihrem Pfad, gemessen bis 0,57 neben dem Strich); der Punkt auf der Form
//      ist ein Punkt des Loops (höchstens 1 Bildpunkt daneben); nicht mehr umgeschlagene Dreiecke als vorher, kein Punkt ohne
//      Spiegelbild.
//   4  Ein ⌘Z nimmt auch ihn zurück.
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-p-schnitt-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'strange bird';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await flickenAnlegen(s, undefined, fehler);
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 60000 });
  await s.waitForTimeout(200);
};
await ruhig();
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
const P = (await O('netzPunkte')).filter((p) => p.sichtbar);
const xs = P.map((p) => p.x);
const ys = P.map((p) => p.y).sort((a, b) => a - b);
const x0 = Math.min(...xs);
const x1 = Math.max(...xs);
// eine Höhe in einer Lücke der Punkte, nahe der Mitte (die Gerade soll keinen Punkt streifen): in der mittleren Hälfte der Höhe
// (zwischen den Vierteln der Punkte) die größte Lücke
const q1 = ys[Math.floor(ys.length * 0.25)];
const q3 = ys[Math.floor(ys.length * 0.75)];
let y = (q1 + q3) / 2;
let best = -1;
for (let i = 0; i + 1 < ys.length; i++) {
  const c = (ys[i] + ys[i + 1]) / 2;
  if (c < q1 || c > q3) continue;
  const g = ys[i + 1] - ys[i];
  if (g > best) {
    best = g;
    y = c;
  }
}
const vorher = (await O('werkLinienDaten')).length;
const umgVorher = (await O('werk')).umgeschlagen;
const klick = async (x, yy) => {
  await s.mouse.move(x, yy);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
/** die Linie eines Loops im Bild (seine Proben, die gespeicherte Hälfte) */
const linieImBild = async (id) => {
  const L = await O('werkLinieLage', id);
  const aus = [];
  for (let j = 0; j + 2 < L.length; j += 3) aus.push(await O('werkImBild', { x: L[j], y: L[j + 1], z: L[j + 2] }));
  return aus;
};
await s.keyboard.press('p');
await s.waitForTimeout(300);
await klick(x0 - 70, y);
await klick(x1 + 70, y);
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-p-schnitt-1-gerade.png` });
await s.keyboard.press('Enter');
await ruhig();
const L1 = await O('werkLinienDaten');
const neu = L1.length > vorher ? L1[L1.length - 1] : null;
let abw = Infinity;
if (neu) {
  abw = 0;
  for (const q of await linieImBild(neu.id)) abw = Math.max(abw, Math.abs(q.y - y));
}
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-p-schnitt-2-loop.png` });
const w1 = await O('werk');
ok('1 gerade: ein neuer Loop rundum, in der Seite auf der Geraden', !!neu && abw <= 0.5, `Linien ${vorher} → ${L1.length}${neu ? `, neuer Loop ${neu.id} (${neu.art}, ${neu.punkte.length} Punkte), größter Abstand zur Geraden ${z2(abw)} px` : ''}; umgeschlagen ${umgVorher} → ${w1.umgeschlagen}`);
await s.keyboard.press('Escape');
await s.keyboard.press('Meta+z');
await ruhig();
const L2 = await O('werkLinienDaten');
ok('2 ein ⌘Z nimmt ihn zurück', L2.length === vorher, `Linien ${L2.length}`);

// 3 gebogen: links im Leeren, ein glatter Punkt auf der Form (versetzt, gezogen), rechts im Leeren. Der Strich beginnt tiefer als
// die Gerade von eben: An „strange bird“ liefe er sonst am stumpfen linken Ende ein Stück fast längs einer vorhandenen Linie, und
// zwischen zwei Linien, die sich in so flachem Winkel kreuzen, bleiben umgeschlagene Dreiecke (Liste für den Feinschliff)
const A = [x0 - 70, y + 34];
const M = [(x0 + x1) / 2 + 13, y - 46];
const G = [28, 6];
const B = [x1 + 70, y + 10];
await s.keyboard.press('p');
await s.waitForTimeout(300);
await klick(A[0], A[1]);
await s.mouse.move(M[0], M[1]);
await s.waitForTimeout(250);
await s.mouse.down();
for (let k = 1; k <= 8; k++) {
  await s.mouse.move(M[0] + (G[0] * k) / 8, M[1] + (G[1] * k) / 8);
  await s.waitForTimeout(25);
}
await s.mouse.up();
await s.waitForTimeout(250);
// die Richtung, wie der Entwurf sie trägt (der gezeichnete Zeiger federt: nicht genau der Weg der Maus)
const Gist = await O('entwurfGriff');
if (Gist) {
  G[0] = Gist[0];
  G[1] = Gist[1];
}
await klick(B[0], B[1]);
await s.mouse.move(B[0] + 30, B[1] + 40);
await s.waitForTimeout(400);
const ring = await O('lichtring');
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-p-schnitt-3-gebogen-vorschau.png` });
await s.keyboard.press('Enter');
await ruhig();
const L3 = await O('werkLinienDaten');
const bogen = L3.length > vorher ? L3[L3.length - 1] : null;
// der gezeichnete Bogen im Bild: A → M (Griff −G an M), M → B (Griff +G an M); A und B sind Ecken
const stueck = (p, c1, c2, q) => {
  const aus = [];
  for (let i = 0; i <= 240; i++) {
    const t = i / 240;
    const u = 1 - t;
    aus.push([u * u * u * p[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * q[0], u * u * u * p[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * q[1]]);
  }
  return aus;
};
const kurve = [...stueck(A, A, [M[0] - G[0], M[1] - G[1]], M), ...stueck(M, [M[0] + G[0], M[1] + G[1]], B, B)];
const zurKurve = (q) => {
  let d = Infinity;
  for (let i = 0; i + 1 < kurve.length; i++) {
    const [ax, ay] = kurve[i];
    const [bx, by] = kurve[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((q.x - ax) * dx + (q.y - ay) * dy) / (dx * dx + dy * dy || 1)));
    d = Math.min(d, Math.hypot(q.x - ax - t * dx, q.y - ay - t * dy));
  }
  return d;
};
let neben = Infinity;
let amPunkt = Infinity;
let woNeben = '';
if (bogen) {
  neben = 0;
  for (const q of await linieImBild(bogen.id)) {
    const d = zurKurve(q);
    if (d > neben) {
      neben = d;
      woNeben = `${q.x.toFixed(0)}/${q.y.toFixed(0)}`;
    }
  }
  for (const q of bogen.punkte) {
    if (!q.sichtbar) continue;
    for (const a of await O('ankerImBild', bogen.id, q.i, 'seite')) amPunkt = Math.min(amPunkt, Math.hypot(a.x - M[0], a.y - M[1]));
  }
}
if (process.env.DIAG === '1' && bogen) {
  const zeilen = [];
  for (const q of bogen.punkte) {
    const b = await O('werkImBild', { x: q.x, y: q.y, z: q.z });
    zeilen.push(`${q.i}${q.sichtbar ? '' : 'v'}${q.kreuzung !== null ? 'k' : ''}${q.ecke ? 'e' : ''} ${b.x.toFixed(0)}/${b.y.toFixed(0)}`);
  }
  console.log(`   Punkte des Loops im Bild (v verdeckt, k Kreuzung, e Ecke): ${zeilen.join(' · ')}`);
}
const w3 = await O('werk');
const st3 = await O('standPruefen');
// wo liegen umgeschlagene Dreiecke (Mitte im Werk, Fläche im Verhältnis zur mittleren)
const wo3 = w3.umgeschlagen > umgVorher ? (await O('umgeschlagen')).liste.map((t) => `(${t.mitte.map((c) => c.toFixed(0)).join('/')}; Fläche ${t.flaeche.toFixed(2)}; Linien an den Ecken ${t.linien.map((x) => x || '–').join(' ')}${process.env.DIAG === '1' ? `; Ecken ${t.lagen.map((q) => q.map((c) => c.toFixed(2)).join('/')).join(' ')}` : ''})`).join(' ') : '';
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-p-schnitt-4-gebogen.png` });
ok(
  '3 gebogen: Lichtring vor ↩, dann ein Loop rundum auf dem Bogen, der gezeichnete Punkt ist ein Punkt des Loops',
  !!ring && !!bogen && neben <= 0.75 && amPunkt <= 1 && w3.umgeschlagen <= umgVorher && st3.ohne === 0,
  `Lichtring ${ring ? `${ring.proben} Proben` : 'fehlt'}; Linien ${vorher} → ${L3.length}${bogen ? `, neuer Loop ${bogen.id} (${bogen.art}, ${bogen.punkte.filter((q) => q.sichtbar).length} sichtbare Punkte); Linie höchstens ${z2(neben)} px neben dem Bogen (bei ${woNeben}; Strich von ${A.map((c) => c.toFixed(0)).join('/')} über ${M.map((c) => c.toFixed(0)).join('/')} mit Richtung ${G.map((c) => c.toFixed(1)).join('/')} nach ${B.map((c) => c.toFixed(0)).join('/')}), Punkt ${z2(amPunkt)} px neben dem gezeichneten` : ''}; umgeschlagen ${umgVorher} → ${w3.umgeschlagen}${wo3 ? ` bei ${wo3}` : ''}, ohne Spiegelbild ${st3.ohne}; Meldung „${(await O('bearbeiten')).meldung ?? ''}“`,
);
await s.keyboard.press('Escape');
await s.keyboard.press('Meta+z');
await ruhig();
const L4 = await O('werkLinienDaten');
ok('4 ein ⌘Z nimmt auch ihn zurück', L4.length === vorher, `Linien ${L4.length}`);
ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
