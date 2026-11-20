// Plan „Maul, Zähne, Zunge“ (20.11.2026), Abschnitt 12.3, Probe P1: das Maul aus einer Linie als echte Form.
// Florian: „zahnfleischlinie, maultasche, bemalung/textur und die kieferpunkte sollten nach dem erstellen genauso bearbeitbar sein
// wie der rest des meshs.“ Dazu muss das Maul nach dem Bestätigen Haut der Form sein. Die Frage dieser Probe: Hält die Rechnung von
// heute ein so geborenes Maul an seiner Form mit Linien?
//
// Ablauf, an einer gesicherten Form (Standard „teat firefish“):
//   0  Kontrolle: die Form allein rechnen lassen (so weit geht sie von selbst).
//   1  Längs der Maullinie (Profil in der Seitenebene, vom Mundwinkel nach vorn) wird ein Keil abgezogen, so dünn wie eine Linie
//      (`SPALT`, halbe Dicke), mit dem Baustein der Naht (`src/form/naht.ts`): Die Tasche ist danach Haut der Form, die Lippe eine
//      Linie mit Kante, Linien der Form sind an der Lippe geschnitten.
//   2  Die Kiefer werden mit der Regel der Studie (`src/maulstudie/schnitt.ts`, `kieferFeld`) geöffnet (`OBEN`, `UNTEN`, Grad): Haut
//      und Linien drehen um den Mundwinkel. Das ist die Lage, in der gerechnet wird.
//   3  Aufräumen und rechnen wie nach einem Verbinden.
// Kriterien (Plan 12.3):
//   K1  Die Rechnung kommt zur Ruhe.
//   K2  Nichts schlägt neu um.
//   K3  Fern vom Maul bewegt sich die Haut weniger als 0,5 Einheiten.
//   K4  Zurückgedreht auf „zu“ liegt die Haut außen weniger als 1 Einheit neben der Form von vorher.
//   K5  Zu ist der Spalt der Lippen kleiner als 0,5 Einheiten.
// Aufruf aus packages/shape (rund 12 s je Lauf):
//   [NAME=<Form>] [OBEN=8] [UNTEN=22] [SPALT=0.2] [MAULLINIEN=0] [AUFRAEUMEN=0] [ZUG=15] [BLATT=<pfad ohne Endung>]
//   npx vite-node ../../apps/editor/scripts/pruefen/form-maul-echt.ts
// Die drei Fassungen des Ergebnisses (Plan, Abschnitt 12.6):
//   A  `MAULLINIEN=0`                    geöffnet gerechnet, keine Linien im Maul (wie in 12.3 festgelegt): hält nicht
//   B  `OBEN=0 UNTEN=0`                  zu gerechnet, mit den zwei Linien im Maul, aufgeräumt wie im Fenster: hält fast
//   C  `AUFRAEUMEN=0 OBEN=0 UNTEN=0`     wie B, das Netz bleibt, wie der Schnitt es hinterlässt
// Mit `OBEN=0 UNTEN=0` ist „zu“ die Ruhe; geöffnet wird dann nur fürs Bild (`ZEIG_OBEN`, `ZEIG_UNTEN`), und zum Schluss wird ein
// Punkt der Unterlippe gezogen (`ZUG`, 0 = aus). Weitere Schalter: `SEITE=lage|schnitt` (welcher Kiefer: nach der Lage oder nach
// dem Schnitt statt aus den Linien, zum Vergleich), `DIAG=1` (alle Linien vor und nach dem Abziehen, die Abschnitte des Rechnens),
// `PFAD` (Genauigkeit der Pfade), `GIER`, `NEIGUNG` (zweiter Blick des Blatts), `GEDULD=<Runden>` (weitere Runden ohne Abbruch).
//
// Probe P2 (Plan, Abschnitt 12.8 und 12.9): `REISS=1 OBEN=0 UNTEN=0 [KONTROLLE3=1]`
//   Nach dem Abziehen wird der Spalt geschlossen (alle Punkte der Lippe und der Tasche auf die Maullinie), die Lippe wird ein
//   zusammengeklappter Loop mit Zwillingen (`maulLinie`, Winkel 0), ebenso die Mitte von Gaumen und Boden. Kriterien Z1 bis Z5;
//   der Zug (Z5) zieht einen Punkt der Lippe samt Zwilling und räumt danach auf wie das Werk (`ZUG_AUFRAEUMEN=0`: ohne).
//   `KONTROLLE3=1`: die Form ohne Schnitt, nur mit einer harten Linie längs der Maullinie (woher der Rest außen kommt).
//   Zum Eingrenzen: `ZWILLINGE=0`, `NUR=lippe|tasche`, `FUEHRT=zweite`, `MITNEHMEN=0`, `STELLEN=0`, `ENDGRIFF=0` (stellt das
//   Kippen der Rechnung nach: der Griff nach außen an einem hängenden Ende), `VERSATZ=<Weite>`, `NURECKE=1`, `ECKE=0`.
import { kantenTeilenMit, loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, loopAusVorhang, festlegen, griffeAnlegen, hatPfad, hautLagen, mittlereKante, pfadAbweichung, pfadLagen, pfadParameter, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';
import { zwillinge, zwillingeAngleichen, zwillingeFestlegen, zwillingsFehler } from '../../../../packages/shape/src/dicht/maulLinie';
import { nadelnZusammenlegen } from '../../../../packages/shape/src/dicht/verdichten';
import { objekteVerbinden } from '../../src/form/naht';
import { Profil, kieferFeld, type V2 } from '../../src/maulstudie/schnitt';
import { flaechenAbstand } from './flaechenabstand';
import { type BlattBild, type BlattLinie, blattSchreiben } from './form-direkt-blatt';
import { formLaden, nachVerdichten } from './form-direkt-faelle';
import { heute, kopie, loopsKopie } from './form-donut-teile';

const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
let schlecht = 0;
const ok = (name: string, gut: boolean, text = ''): void => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};

const NAME = process.env.NAME ?? 'teat firefish';
const OBEN = (Number(process.env.OBEN ?? 8) * Math.PI) / 180;
const UNTEN = (Number(process.env.UNTEN ?? 22) * Math.PI) / 180;
const SPALT = Number(process.env.SPALT ?? 0.2);
const REICH: [number, number] = [1.0, 1.9];
/** die Maullinie der Studie für diese Form (Seitenebene, vom Mundwinkel nach vorn) */
const LINIEN: Record<string, V2[]> = {
  'teat firefish': [
    { x: -640, y: 165 },
    { x: -665, y: 156 },
    { x: -700, y: 152 },
    { x: -735, y: 156 },
    { x: -760, y: 163 },
  ],
};
const linie = LINIEN[NAME];
if (!linie) throw new Error(`für „${NAME}“ ist keine Maullinie hinterlegt`);

const pfade = (ls: readonly Loop[]): Float64Array[] => ls.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));
const legen = (hh: Haut, ls: readonly Loop[]): void => {
  for (const l of ls) festlegen(hh, l, !hatPfad(l));
};
const punkte = (hh: Haut): [number, number, number][] => Array.from({ length: hh.n }, (_, i) => [hh.pos[3 * i]!, hh.pos[3 * i + 1]!, hh.pos[3 * i + 2]!]);
const flaechen = (hh: Haut): number[][] => Array.from({ length: hh.tri.length / 3 }, (_, t) => [hh.tri[3 * t]!, hh.tri[3 * t + 1]!, hh.tri[3 * t + 2]!]);
const linieBild = (hh: Haut, l: Loop): BlattLinie[] => {
  const L = hautLagen(hh, l);
  const zu = l.art !== 'ring';
  const hart = l.kante ? 1 : 0;
  const a: BlattLinie = { p: Array.from(L), zu, hart };
  return l.art === 'mitte' ? [a] : [a, { p: Array.from(L, (x, k) => (k % 3 === 2 ? -x : x)), zu, hart }];
};

// ---------- 0 die Form, und wie weit sie von selbst geht ----------
const geladen = formLaden(NAME);
const mk = geladen.mk;
let A = geladen.h;
let loopsA = geladen.loops;
const f0 = falten(A);
let kontrolle = { runden: 0, steht: false, weg: 0 };
try {
  kontrolle = heute(A, loopsA, pfade(loopsA), 0, 300);
  legen(A, loopsA);
} catch (e) {
  console.log(`Kontrolle: ${(e as Error).message}`);
}
const fRuhe = falten(A);
console.log(
  `„${NAME}“: ${A.n} Punkte, ${A.tri.length / 3} Dreiecke, ${loopsA.length} Linien, mittlere Kante ${z1(mittlereKante(A))} · Kontrolle (die Form allein): ${kontrolle.runden} Runden${kontrolle.steht ? '' : ' (steht nicht)'}, dabei bis ${z2(kontrolle.weg)} bewegt; umgeschlagen ${f0.umgeklappt} → ${fRuhe.umgeklappt}`,
);
A = kopie(A);
loopsA = loopsKopie(loopsA);
const vorher = kopie(A);

// ---------- 1 der Keil längs der Maullinie ----------
let xMin = Infinity;
let zMax = 0;
for (let i = 0; i < A.n; i++) {
  xMin = Math.min(xMin, A.pos[3 * i]!);
  zMax = Math.max(zMax, Math.abs(A.pos[3 * i + 2]!));
}
// das Profil dicht abtasten und vorn ein Stück über die Form hinaus verlängern
const roh = linie.map((q) => ({ ...q }));
{
  const a = roh[roh.length - 2]!;
  const b = roh[roh.length - 1]!;
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  roh.push({ x: b.x + ((b.x - a.x) / l) * 60, y: b.y + ((b.y - a.y) / l) * 60 });
}
const grob = new Profil(roh);
const SCHRITT = 0.6 * mk;
const m = Math.max(4, Math.round(grob.laenge / SCHRITT));
const P: V2[] = Array.from({ length: m + 1 }, (_, i) => grob.ort((grob.laenge * i) / m));
const profil = new Profil(P);
const C = P[0]!;
const t0 = profil.tangente(0);
const nL = (i: number): V2 => {
  const t = profil.tangente(profil.s[i]!);
  return { x: -t.y, y: t.x };
};
const W = zMax * 1.2 + 20;
const nz = 2 * Math.max(4, Math.round(W / SCHRITT));
const pos: number[] = [];
const tri: number[] = [];
// je Stelle des Umrisses eine Säule von Punkten über z: 0 die Spitze am Mundwinkel, 1 … m+1 links, m+2 … 2m+2 rechts
const U = 2 * m + 3;
const umriss = (k: number): V2 => {
  if (k === 0) return { x: C.x - t0.x * 2 * SPALT, y: C.y - t0.y * 2 * SPALT };
  const links = k <= m + 1;
  const i = links ? k - 1 : k - (m + 2);
  const n = nL(i);
  const s = links ? SPALT : -SPALT;
  return { x: P[i]!.x + n.x * s, y: P[i]!.y + n.y * s };
};
for (let k = 0; k < U; k++) {
  const q = umriss(k);
  for (let j = 0; j <= nz; j++) pos.push(q.x, q.y, -W + (2 * W * j) / nz);
}
const nr = (k: number, j: number): number => k * (nz + 1) + j;
const ecke = (v: number): [number, number, number] => [pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!];
/** ein Dreieck so herum, dass seine Normale nach `aus` zeigt */
const dreieck = (a: number, b: number, c: number, aus: readonly [number, number, number]): void => {
  const A3 = ecke(a);
  const B3 = ecke(b);
  const C3 = ecke(c);
  const ux = B3[0] - A3[0];
  const uy = B3[1] - A3[1];
  const uz = B3[2] - A3[2];
  const wx = C3[0] - A3[0];
  const wy = C3[1] - A3[1];
  const wz = C3[2] - A3[2];
  const nx = uy * wz - uz * wy;
  const ny = uz * wx - ux * wz;
  const nzz = ux * wy - uy * wx;
  if (nx * aus[0] + ny * aus[1] + nzz * aus[2] >= 0) tri.push(a, b, c);
  else tri.push(a, c, b);
};
/** die Wand zwischen zwei Stellen des Umrisses, über alle Höhen */
const wand = (ka: number, kb: number, aus: readonly [number, number, number]): void => {
  for (let j = 0; j < nz; j++) {
    dreieck(nr(ka, j), nr(kb, j), nr(kb, j + 1), aus);
    dreieck(nr(ka, j), nr(kb, j + 1), nr(ka, j + 1), aus);
  }
};
for (let i = 0; i < m; i++) {
  const n = nL(i);
  wand(1 + i, 2 + i, [n.x, n.y, 0]);
  wand(m + 2 + i, m + 3 + i, [-n.x, -n.y, 0]);
}
{
  const n = nL(0);
  // die Spitze am Mundwinkel: zwei schmale Wände nach hinten außen
  wand(0, 1, [n.x - t0.x, n.y - t0.y, 0]);
  wand(0, m + 2, [-n.x - t0.x, -n.y - t0.y, 0]);
  const tv = profil.tangente(profil.laenge);
  wand(m + 1, 2 * m + 2, [tv.x, tv.y, 0]);
}
for (const [j, aus] of [
  [0, [0, 0, -1]],
  [nz, [0, 0, 1]],
] as const) {
  dreieck(nr(0, j), nr(1, j), nr(m + 2, j), aus);
  for (let i = 0; i < m; i++) {
    dreieck(nr(1 + i, j), nr(2 + i, j), nr(m + 3 + i, j), aus);
    dreieck(nr(1 + i, j), nr(m + 3 + i, j), nr(m + 2 + i, j), aus);
  }
}
const keil = hautAus(pos, tri);
// Die Linien im Maul (Plan 12.1), als Linien des Keils: die Mitte von Gaumen und Boden (einmal um den Keil in der Spiegelebene)
// und die Rachenlinie (am Mundwinkel quer, von der Mitte nach außen, mit Kante). Der Baustein schneidet sie an der Lippe; was in
// der Form liegt, bleibt als Linie auf den Wänden der Tasche. `MAULLINIEN=0`: ohne sie.
const MAULLINIEN = process.env.MAULLINIEN !== '0';
const PFAD_GENAU = Number(process.env.PFAD ?? 0.3);
const loopsKeil: Loop[] = [];
if (MAULLINIEN) {
  const jm = nz / 2;
  const ausKette = (id: number, kette: number[], art: Loop['art'], zu: boolean): Loop => {
    const n = kette.length;
    const sL = new Float64Array(n);
    const ruhe = new Float64Array(3 * n);
    kette.forEach((v, j) => ruhe.set(keil.pos.subarray(3 * v, 3 * v + 3), 3 * j));
    for (let j = 1; j < n; j++) sL[j] = sL[j - 1]! + Math.hypot(ruhe[3 * j]! - ruhe[3 * j - 3]!, ruhe[3 * j + 1]! - ruhe[3 * j - 2]!, ruhe[3 * j + 2]! - ruhe[3 * j - 1]!);
    const schluss = zu ? Math.hypot(ruhe[0]! - ruhe[3 * n - 3]!, ruhe[1]! - ruhe[3 * n - 2]!, ruhe[2]! - ruhe[3 * n - 1]!) : 0;
    return { id, art, proben: kette.map((w) => ({ ecken: [w, w, w], b: [1, 0, 0] })), s: sL, laenge: sL[n - 1]! + schluss, ruhe, punkte: [] };
  };
  const punktBei = (l: Loop, j: number, ecke: boolean, kreuzung?: number): void => {
    const q = punktEinfuegen(l, l.s[j]!, kreuzung);
    q.ref = { x: l.ruhe[3 * j]!, y: l.ruhe[3 * j + 1]!, z: l.ruhe[3 * j + 2]! };
    q.cur = { ...q.ref };
    if (ecke) q.ecke = true;
  };
  // die Mitte: Spitze am Mundwinkel, links nach vorn, vorn herum, rechts zurück
  const umlauf = [0, ...Array.from({ length: m + 1 }, (_, i) => 1 + i), ...Array.from({ length: m + 1 }, (_, i) => 2 * m + 2 - i)];
  const mitteL = ausKette(1, umlauf.map((k) => nr(k, jm)), 'mitte', true);
  punktBei(mitteL, 0, true, 4000);
  punktBei(mitteL, m + 1, true);
  punktBei(mitteL, m + 2, true);
  griffeAnlegen(mitteL, mitteL.ruhe, true, PFAD_GENAU);
  // die Rachenlinie: die Spitze des Keils, von der Mitte nach außen
  const rachen = ausKette(2, Array.from({ length: nz - jm + 1 }, (_, i) => nr(0, jm + i)), 'ring', false);
  rachen.kante = true;
  rachen.haengt = [false, true];
  punktBei(rachen, 0, false, 4000);
  punktBei(rachen, rachen.proben.length - 1, false);
  griffeAnlegen(rachen, rachen.ruhe, true);
  loopsKeil.push(mitteL, rachen);
}
let ohnePartner = 0;
for (let v = 0; v < keil.n; v++) if (keil.spiegel[v]! < 0) ohnePartner++;
console.log(`Keil: ${keil.n} Punkte, ${keil.tri.length / 3} Dreiecke, halbe Dicke ${z2(SPALT)}, ${m} Stücke längs, ${nz} quer; ohne Spiegelpartner ${ohnePartner}`);

// Der Keil ist dünner als das Netz: Eine Linie der Form, die die Maullinie kreuzt, liefe zwischen zwei ihrer Punkte durch ihn
// hindurch, und der Baustein könnte sie nicht schneiden. Darum bekommt jede solche Linie dort erst einen Punkt des Netzes, genau
// auf der Maullinie (die Kante ihrer Kette wird geteilt; an der Form ändert das nichts).
{
  const teile: { u: number; v: number; f: number }[] = [];
  const dBei = (v: number): { d: number; hinten: boolean } => profil.naechster(A.pos[3 * v]!, A.pos[3 * v + 1]!);
  for (const l of loopsA) {
    const kette = l.proben.map((p) => p.ecken[0]!);
    const n = kette.length;
    for (let k = 0; k < (l.art !== 'ring' ? n : n - 1); k++) {
      const a = kette[k]!;
      const b = kette[(k + 1) % n]!;
      const fa = dBei(a);
      const fb = dBei(b);
      if (fa.hinten || fb.hinten || fa.d * fb.d >= 0) continue;
      // die Stelle auf der Kante, an der sie die Maullinie kreuzt (zweimal nachgesetzt)
      let f = Math.abs(fa.d) / (Math.abs(fa.d) + Math.abs(fb.d));
      for (let it = 0; it < 3; it++) {
        const x = A.pos[3 * a]! + f * (A.pos[3 * b]! - A.pos[3 * a]!);
        const y = A.pos[3 * a + 1]! + f * (A.pos[3 * b + 1]! - A.pos[3 * a + 1]!);
        const d = profil.naechster(x, y).d;
        f -= (d / (fb.d - fa.d)) * 1;
        f = Math.max(0.02, Math.min(0.98, f));
      }
      teile.push({ u: a, v: b, f });
    }
  }
  if (teile.length) {
    const r = kantenTeilenMit(A, loopsA, teile);
    if (!r) {
      console.log('FEHL: die Kanten der kreuzenden Linien ließen sich nicht teilen');
      process.exit(1);
    }
    console.log(`Linien, die die Maullinie kreuzen: ${teile.length} Kanten ihrer Ketten geteilt (${r.haut.n - A.n} neue Punkte genau auf der Maullinie)`);
    A = r.haut;
    loopsA = r.loops;
  } else console.log('keine Linie der Form kreuzt die Maullinie');
}
// fürs Bild „die Form von vorher“: Haut und Linien, wie sie zusammengehören (die Linien tragen jetzt die neuen Punkte auf der
// Maullinie; über die Haut von davor gezeichnet, fehlten ihnen diese Punkte, und das Bild zeigte zwei Striche, die es nicht gibt)
const vorherBild = { h: kopie(A), loops: loopsKopie(loopsA) };
const E = await objekteVerbinden({ haut: A, loops: loopsA, spiegelbild: false }, { haut: keil, loops: loopsKeil, spiegelbild: false }, 'abziehen', { naechsteId: 1000, naechsteKreuzung: 5000 });
if ('fehler' in E) {
  console.log(`FEHL abziehen: ${E.fehler}`);
  process.exit(1);
}
let haut = E.haut;
let loops = E.loops;
const istLippe = (l: Loop): boolean => E.naehte.includes(l.id);
const fSchnitt = falten(haut);
console.log(
  `abgezogen in ${z1(E.ms)} ms: ${haut.n} Punkte (${haut.n - A.n} mehr), ${loops.length} Linien (${E.geschnitten} an der Lippe geschnitten, ${E.weg} ganz weg, ${E.enden} Enden an der Lippe, Enden höchstens ${z2(E.neben)} neben ihrem Punkt); Lippe: ${loops.filter(istLippe).map((l) => `${l.art}, ${l.proben.length} Punkte des Netzes, ${l.punkte.length} Punkte, Kante ${l.kante ? 'an' : 'aus'}`).join(' · ')}; umgeschlagen ${fSchnitt.umgeklappt}`,
);

// `DIAG=1`: die Linien vor und nach dem Abziehen einzeln (Art, Punkte des Netzes, Punkte, Enden, Kasten)
if (process.env.DIAG) {
  const zeile = (hh: Haut, l: Loop): string => {
    const k = l.proben.map((p) => p.ecken[0]!);
    const kasten = [0, 1, 2].map((a) => `${z1(Math.min(...k.map((v) => hh.pos[3 * v + a]!)))}…${z1(Math.max(...k.map((v) => hh.pos[3 * v + a]!)))}`);
    return `  ${l.id} ${l.art}${l.kante ? ' Kante' : ''}${l.haengt ? ` hängt ${l.haengt.map((x) => (x ? 'ja' : 'nein')).join('/')}` : ''}: ${k.length} Punkte des Netzes, ${l.punkte.length} Punkte, Länge ${z1(l.laenge)}; x ${kasten[0]}, y ${kasten[1]}, z ${kasten[2]}`;
  };
  console.log(`Linien der Form vor dem Abziehen:\n${loopsA.map((l) => zeile(A, l)).join('\n')}`);
  console.log(`Linien nach dem Abziehen:\n${loops.map((l) => zeile(haut, l)).join('\n')}`);
}

// ---------- 2 die Kiefer öffnen: Haut und Linien drehen um den Mundwinkel ----------
// die Lippe ganz vorn und die Länge der Lippe, wie die Studie sie misst
let sVorn = 0;
for (const l of loops.filter(istLippe)) {
  for (const p of l.proben) {
    const o = profil.naechster(haut.pos[3 * p.ecken[0]!]!, haut.pos[3 * p.ecken[0]! + 1]!);
    if (!o.hinten) sVorn = Math.max(sVorn, o.s);
  }
}
const vorn = profil.ort(sVorn);
const kopf = { profil, C, t0, lang: Math.hypot(vorn.x - C.x, vorn.y - C.y) };
// links der Laufrichtung ist oben, wenn die linke Normale nach oben zeigt
let ny = 0;
for (let i = 0; i <= 8; i++) ny += profil.tangente((sVorn * i) / 8).x;
const obenLinks = ny > 0;
const winkelBei = (x: number, y: number): number => {
  const f = kieferFeld(kopf, x, y, REICH);
  const links = obenLinks ? OBEN : UNTEN;
  const rechts = obenLinks ? UNTEN : OBEN;
  return (f.seite > 0 ? links : -rechts) * f.gewicht;
};
const drehen = (x: number, y: number, a: number, umC = true): [number, number] => {
  const dx = umC ? x - C.x : x;
  const dy = umC ? y - C.y : y;
  return [(umC ? C.x : 0) + Math.cos(a) * dx - Math.sin(a) * dy, (umC ? C.y : 0) + Math.sin(a) * dx + Math.cos(a) * dy];
};
function oeffnen(hh: Haut, ls: Loop[]): void {
  for (let v = 0; v < hh.n; v++) {
    const a = winkelBei(hh.pos[3 * v]!, hh.pos[3 * v + 1]!);
    if (a === 0) continue;
    [hh.pos[3 * v], hh.pos[3 * v + 1]] = drehen(hh.pos[3 * v]!, hh.pos[3 * v + 1]!, a);
  }
  for (const l of ls) {
    for (const p of l.punkte) {
      const a = winkelBei(p.ref.x, p.ref.y);
      if (a !== 0) {
        [p.ref.x, p.ref.y] = drehen(p.ref.x, p.ref.y, a);
        [p.cur.x, p.cur.y] = drehen(p.cur.x, p.cur.y, a);
        for (const g of [p.ein, p.aus]) if (g) [g.x, g.y] = drehen(g.x, g.y, a, false);
      }
    }
    l.ruhe = hautLagen(hh, l);
  }
}
console.log(`Lippe ${z1(kopf.lang)} lang, Oberkiefer ${obenLinks ? 'links' : 'rechts'} der Linie; geöffnet oben ${z1((OBEN * 180) / Math.PI)}°, unten ${z1((UNTEN * 180) / Math.PI)}°`);
const zuHaut = kopie(haut);
// die Seite jedes Punkts gleich nach dem Abziehen (da liegen die Wände genau eine halbe Spaltbreite neben der Linie): Solange das
// Netz dasselbe bleibt (`AUFRAEUMEN=0`), gilt sie auch später, wenn die Rechnung die Wände ein wenig bewegt hat
const seiteZu = Int8Array.from({ length: haut.n }, (_, v) => (profil.naechster(haut.pos[3 * v]!, haut.pos[3 * v + 1]!).d >= 0 ? 1 : -1));

// ---------- 1b (Probe P2, `REISS=1`) der Reißverschluss: den Spalt schließen ----------
// Alle Punkte der Lippe und der Tasche kommen genau auf die Maullinie (quer zu ihr, in der Seitenebene). Gaumen und Boden liegen
// danach aufeinander, die zwei Lippen auf derselben Kurve. Am Netz ändert sich nichts, auch nicht an den Spiegelpaaren (die stehen
// seit dem Abziehen fest; aus den Lagen neu gelesen, fänden zwei Punkte am selben Ort den falschen Partner).
const REISS = process.env.REISS === '1';
let spaltNachSchliessen = NaN;
const paarVon = (hh: Haut, v: number): number[] => (hh.spiegel[v]! >= 0 && hh.spiegel[v] !== v ? [v, hh.spiegel[v]!] : [v]);
/** die Linien, die ganz in der Tasche liegen und in der Spiegelebene laufen: die Mitte von Gaumen und Boden */
const taschenMitte = new Set<number>();
if (REISS) {
  if (OBEN + UNTEN > 0 || !MAULLINIEN) {
    console.log('FEHL: REISS=1 rechnet zu und mit den Linien im Maul (OBEN=0 UNTEN=0, nicht MAULLINIEN=0)');
    process.exit(1);
  }
  const sk0 = kieferSeiten(haut, loops);
  const lippeV = new Set(loops.filter(istLippe).flatMap((l) => l.proben.flatMap((p) => paarVon(haut, p.ecken[0]!))));
  const innen = (v: number): boolean => !sk0.aussen[v] || lippeV.has(v);
  let bewegt = 0;
  let weit = 0;
  for (let v = 0; v < haut.n; v++) {
    if (!innen(v)) continue;
    const x = haut.pos[3 * v]!;
    const y = haut.pos[3 * v + 1]!;
    const o = profil.naechster(x, y);
    const q = o.hinten ? C : profil.ort(o.s);
    weit = Math.max(weit, Math.hypot(q.x - x, q.y - y));
    haut.pos[3 * v] = q.x;
    haut.pos[3 * v + 1] = q.y;
    bewegt++;
  }
  for (const l of loops) {
    const kette = l.proben.map((p) => p.ecken[0]!);
    const ganzInnen = kette.every(innen);
    if (!istLippe(l) && !l.kante && ganzInnen && kette.every((v) => Math.abs(haut.pos[3 * v + 2]!) < 1e-9)) taschenMitte.add(l.id);
    if (istLippe(l) || taschenMitte.has(l.id)) {
      // Lippe und Mitte der Tasche: Ruhe und Punkte von der bewegten Haut lesen (ihr Pfad wird gleich neu angelegt)
      festlegen(haut, l, true);
      continue;
    }
    l.ruhe = hautLagen(haut, l);
    // eine Linie, die an der Lippe hängt: Ihr Endpunkt geht mit dem Punkt der Lippe
    const n = kette.length;
    l.punkte.forEach((p) => {
      const ende = p.s <= 1e-6 ? 0 : p.s >= l.laenge - 1e-6 ? n - 1 : -1;
      if (ende < 0 || !innen(kette[ende]!)) return;
      p.ref = { x: l.ruhe[3 * ende]!, y: l.ruhe[3 * ende + 1]!, z: l.ruhe[3 * ende + 2]! };
      p.cur = { ...p.ref };
    });
  }
  console.log(`Reißverschluss: ${bewegt} Punkte (Lippe und Tasche) auf die Maullinie gelegt, höchstens ${z2(weit)} bewegt; Mitte der Tasche: ${taschenMitte.size} ${taschenMitte.size === 1 ? 'Linie' : 'Linien'}`);
}
oeffnen(haut, loops);
const fOffen = falten(haut);
const abwGedreht = Math.max(...loops.map((l) => pfadAbweichung(l)));
// Die Pfade der Linien müssen zur geöffneten Haut passen. Starr mitgedrehte Stücke passen von selbst. Die Lippe nicht: Sie ist
// jetzt ein offener Keil und braucht am Mundwinkel einen Punkt, der knickt; ihr Pfad und der jeder Linie, die nach dem Drehen
// weiter als `PFAD_GENAU` neben der Haut läge, wird aus ihrem Verlauf neu angelegt (Punkte dazu nur, wo nötig).
let neuAngelegt = 0;
let punkteDazu = 0;
for (const l of loops) {
  const lippe = istLippe(l);
  if (lippe) {
    let jBest = 0;
    let dBest = Infinity;
    l.proben.forEach((pr, j) => {
      const v = pr.ecken[0]!;
      const d = Math.hypot(haut.pos[3 * v]! - C.x, haut.pos[3 * v + 1]! - C.y);
      if (d < dBest) {
        dBest = d;
        jBest = j;
      }
    });
    const v = l.proben[jBest]!.ecken[0]!;
    // (endet dort schon die Rachenlinie, hat die Lippe den Punkt; er knickt)
    let p = l.punkte.find((q) => Math.abs(q.s - l.s[jBest]!) < 0.6 * mk);
    if (!p) {
      p = punktEinfuegen(l, l.s[jBest]!);
      p.ref = { x: haut.pos[3 * v]!, y: haut.pos[3 * v + 1]!, z: haut.pos[3 * v + 2]! };
      p.cur = { ...p.ref };
    }
    p.ecke = true;
    p.mundwinkel = true;
  }
  if (pfadAbweichung(l) <= PFAD_GENAU && !(lippe && (OBEN + UNTEN > 0 || REISS)) && !taschenMitte.has(l.id)) continue;
  const vor = l.punkte.length;
  griffeAnlegen(l, l.ruhe, true, PFAD_GENAU);
  neuAngelegt++;
  punkteDazu += l.punkte.length - vor;
}

// ---------- 1c (Probe P2) die Zwillinge ----------
// Die Lippe ist ein zusammengeklappter Loop: `maulLinie` mit dem Winkel 0, die zweite Lippe ist genau das Abbild der ersten (das
// Modell vom 14.11., `maulLinie.ts`). Ebenso die Mitte von Gaumen und Boden: Sie kehrt an der Rachenlinie um; für die Paarung trägt
// ihr Wendepunkt dort kurz die Marke des Mundwinkels (die Tasche ist kein Maul, darum danach wieder ohne).
if (REISS && process.env.ZWILLINGE !== '0') {
  /** Linien, deren Pfad sich hier ändert: Ihre Proben bekommen danach ihre Stelle auf dem neuen Pfad */
  const geaendert = new Set<Loop>();
  const mitnehmen = (quelle: Loop, nummern: readonly number[]): number => {
    let n = 0;
    if (process.env.MITNEHMEN === '0') return 0;
    for (const i of nummern) {
      const p = quelle.punkte[i]!;
      if (p.kreuzung === undefined) continue;
      for (const l of loops) {
        if (l === quelle) continue;
        for (const q of l.punkte) {
          if (q.kreuzung !== p.kreuzung) continue;
          q.ref = { ...p.ref };
          q.cur = { ...p.ref };
          geaendert.add(l);
          n++;
        }
      }
    }
    return n;
  };
  // (erst die Lippe: Ihre Enden nehmen die Enden der Mitte der Tasche mit)
  for (const l of [...loops.filter(istLippe), ...loops.filter((x) => taschenMitte.has(x.id))]) {
    const lippe = istLippe(l);
    // (`NUR=lippe|tasche`: zum Eingrenzen nur eine der zwei Linien paaren)
    if (process.env.NUR && (process.env.NUR === 'lippe') !== lippe) continue;
    let wende: (typeof l.punkte)[number] | undefined;
    if (process.env.DIAG)
      console.log(
        `  Punkte von Linie ${l.id} vor der Paarung (Länge ${z1(l.laenge)}):\n${l.punkte.map((q) => `    s ${z1(q.s)} (${z1(q.ref.x)} / ${z1(q.ref.y)} / ${z1(q.ref.z)})${q.ecke ? ' Ecke' : q.ecke === false ? ' glatt' : ''}${q.autoEcke ? ' autoEcke' : ''}${q.kreuzung !== undefined ? ` Kreuzung ${q.kreuzung}` : ''}${q.mundwinkel ? ' Mundwinkel' : ''}${q.vonSelbst ? ' vonSelbst' : ''}${q.kante !== undefined ? ` kante ${q.kante}` : ''}`).join('\n')}`,
      );
    if (!lippe) {
      wende = l.punkte.reduce((a, b) => (Math.hypot(b.ref.x - C.x, b.ref.y - C.y) < Math.hypot(a.ref.x - C.x, a.ref.y - C.y) ? b : a));
      wende.mundwinkel = true;
      if (process.env.ECKE !== '0') wende.ecke = true;
    }
    if (process.env.NURECKE === '1') {
      if (wende) delete wende.mundwinkel;
      continue;
    }
    l.maulLinie = 0;
    const dazu = zwillingeAngleichen(l);
    const griffeText = (): string => l.punkte.map((q) => `    s ${z1(q.s)}: ein (${q.ein ? [q.ein.x, q.ein.y, q.ein.z].map((x) => z2(x)).join(' / ') : '–'}), aus (${q.aus ? [q.aus.x, q.aus.y, q.aus.z].map((x) => z2(x)).join(' / ') : '–'})`).join('\n');
    if (process.env.DIAG && !lippe) console.log(`  Griffe von Linie ${l.id} vor der Paarung:\n${griffeText()}`);
    const bewegt = zwillingeFestlegen(l, process.env.FUEHRT === 'zweite' ? 'zweite' : 'erste');
    // Die Zwillingsregel des Kerns kennt nur Ringe, deren Enden auf der Mittelebene liegen: Dort setzt sie den Griff nach außen
    // als Spiegelbild des inneren. An einem Ende, das an einer anderen Linie hängt, gibt es keinen Griff nach außen (er ist null);
    // mit dem gespiegelten Griff dort kippte die Rechnung am Unterkiefer in eine andere Ruhelage (`ENDGRIFF=0` stellt es nach).
    if (process.env.ENDGRIFF !== '0') {
      const m = l.punkte.length;
      if (l.haengt?.[0] && m && l.punkte[0]!.s <= 1e-6) l.punkte[0]!.ein = { x: 0, y: 0, z: 0 };
      if (l.haengt?.[1] && m && l.punkte[m - 1]!.s >= l.laenge - 1e-6) l.punkte[m - 1]!.aus = { x: 0, y: 0, z: 0 };
    }
    if (process.env.DIAG && !lippe) console.log(`  Griffe von Linie ${l.id} nach der Paarung:\n${griffeText()}`);
    const fehler = zwillingsFehler(l);
    const mit = bewegt ? mitnehmen(l, bewegt) : 0;
    console.log(
      `Zwillinge, ${lippe ? 'die Lippe' : 'die Mitte der Tasche'}: ${l.punkte.length} Punkte (${dazu} dazu, damit jeder seinen Zwilling hat), ${bewegt ? bewegt.length : 'keine'} auf das Abbild gelegt, ${mit} Punkte anderer Linien an Kreuzungen mitgenommen; Abweichung der Linie ${fehler === null ? 'nicht messbar' : fehler.toExponential(1)}`,
    );
    if (!lippe && wende) {
      delete l.maulLinie;
      delete wende.mundwinkel;
      // (`VERSATZ=<Weite>`, zum Eingrenzen: die zweite Hälfte um diese Weite quer zur Maullinie versetzen, statt genau aufeinander)
      const eps = Number(process.env.VERSATZ ?? 0);
      if (eps) {
        const iW = l.punkte.indexOf(wende);
        l.punkte.forEach((q, i) => {
          if (i <= iW) return;
          const o = profil.naechster(q.ref.x, q.ref.y);
          const t = profil.tangente(Math.max(0, o.s));
          const anteil = Math.min(1, (i - iW) / 1);
          q.ref = { x: q.ref.x - t.y * eps * anteil, y: q.ref.y + t.x * eps * anteil, z: q.ref.z };
          q.cur = { ...q.ref };
        });
      }
    }
    geaendert.add(l);
  }
  // Der Pfad der zweiten Lippe ist jetzt das Abbild der ersten. Jede Probe bekommt ihre Stelle auf dem neuen Pfad (die nächste):
  // Dann springt sie beim Rechnen nur quer zur Linie. Ohne das rutschten die Punkte der Lippe bis 0,8 längs der Linie, und die
  // Haut des Unterkiefers ging davon bis 6 mit (gemessen; `STELLEN=0` stellt es nach).
  for (const l of loops) {
    l.ruhe = hautLagen(haut, l);
    if (geaendert.has(l) && process.env.STELLEN !== '0') pfadParameter(l);
  }
  spaltNachSchliessen = lippenSpalt(haut, loops).netz;
}
if (process.env.DIAG) console.log(`Linien neben ihren Pfaden, vor dem Rechnen:\n${loops.map((l) => `  ${l.id} ${l.art}${l.kante ? ' Kante' : ''}: ${z2(pfadAbweichung(l))} (${l.punkte.length} Punkte)`).join('\n')}`);
const abwOffen = Math.max(...loops.map((l) => pfadAbweichung(l)));
console.log(
  `geöffnet (ungerechnet): umgeschlagen ${fOffen.umgeklappt}; Linien nach dem Drehen bis ${z2(abwGedreht)} neben ihren Pfaden; ${neuAngelegt} Pfade neu angelegt (${punkteDazu} Punkte dazu), danach höchstens ${z2(abwOffen)}; Lippe: ${loops.filter(istLippe).map((l) => `${l.punkte.length} Punkte`).join(', ')}`,
);
const bilder: BlattBild[] = [];
const bildVon = (name: string, hh: Haut, ls: readonly Loop[], notiz: string): BlattBild => ({ name, h: kopie(hh), loops: [], fertig: { linien: ls.flatMap((l) => linieBild(hh, l)), punkte: [] }, notiz });
bilder.push(bildVon('zu: abgezogen, die Lippe ist eine Linie mit Kante (ungerechnet)', zuHaut, [], `${zuHaut.n} Punkte`));
bilder.push(bildVon('geöffnet, ungerechnet', haut, loops, `umgeschlagen ${fOffen.umgeklappt}`));
const offenRoh = kopie(haut);

// ---------- 3 aufräumen und rechnen ----------
// `AUFRAEUMEN=0`: das Netz nach dem Abziehen nicht aufräumen (zum Vergleich: Das Aufräumen kann die zwei Wände der Tasche, die zu
// nur um die Breite des Spalts auseinanderliegen, miteinander verbinden)
const AUFRAEUMEN = process.env.AUFRAEUMEN !== '0';
/** `DIAG=1`: nach jedem Abschnitt, wie weit die Haut neben der Form von vorher liegt (die Tasche zählt nicht: näher als 1 an der Maullinie) */
const neben = (titel: string): void => {
  if (!process.env.DIAG) return;
  const Pn = punkte(haut);
  const d = flaechenAbstand(Pn, punkte(vorher), flaechen(vorher), 30);
  let max = 0;
  let bei = [0, 0, 0];
  let ueber1 = 0;
  for (let i = 0; i < Pn.length; i++) {
    const o = profil.naechster(Pn[i]![0], Pn[i]![1]);
    if (!o.hinten && Math.abs(o.d) < 1) continue;
    if (d[i]! > 1) ueber1++;
    if (d[i]! > max) {
      max = d[i]!;
      bei = Pn[i]!;
    }
  }
  console.log(`     [${titel}] neben der Form von vorher: höchstens ${z2(max)} bei (${bei.map((x) => z1(x)).join(' / ')}), ${ueber1} Punkte über 1`);
};
neben('vor dem Aufräumen');
if (AUFRAEUMEN) {
  const nd = nadelnZusammenlegen(haut, loops, mk);
  if (nd) {
    haut = nd.haut;
    loops = nd.loops;
  }
  const v = nachVerdichten(haut, loops, mk);
  haut = v.h;
  loops = v.loops;
}
const fAuf = falten(haut);
neben('aufgeräumt');
const aufgeraeumt = kopie(haut);
console.log(`aufgeräumt: ${haut.n} Punkte, umgeschlagen ${fAuf.umgeklappt}`);
let steht = false;
let runden = 0;
let wegMax = 0;
let fehler = '';
try {
  const r1 = heute(haut, loops, pfade(loops), 20, 300);
  legen(haut, loops);
  if (process.env.DIAG) console.log(`     erster Abschnitt: ${r1.runden} Runden${r1.steht ? '' : ' (steht nicht)'}, die Haut ging ${z2(r1.weg)}`);
  neben('erster Abschnitt gerechnet');
  if (process.env.DIAG && haut.n === aufgeraeumt.n) {
    // wohin die Punkte im ersten Abschnitt gingen (dasselbe Netz wie nach dem Aufräumen): die Lippe und die weitesten überhaupt
    const weg = (v: number): number[] => [0, 1, 2].map((k) => haut.pos[3 * v + k]! - aufgeraeumt.pos[3 * v + k]!);
    const lang = (w: number[]): number => Math.hypot(w[0]!, w[1]!, w[2]!);
    const lv = new Set(loops.filter(istLippe).flatMap((l) => l.proben.map((q) => q.ecken[0]!)));
    const zeile = (v: number): string => `(${[0, 1, 2].map((k) => z1(aufgeraeumt.pos[3 * v + k]!)).join(' / ')}) ging (${weg(v).map((x) => z2(x)).join(' / ')}) = ${z2(lang(weg(v)))}${lv.has(v) ? ' [Lippe]' : ''}`;
    const alle = Array.from({ length: haut.n }, (_, v) => v).filter((v) => haut.pos[3 * v + 2]! >= 0).sort((a, b) => lang(weg(b)) - lang(weg(a)));
    console.log(`     die weitesten Punkte im ersten Abschnitt:\n${alle.slice(0, 8).map((v) => '       ' + zeile(v)).join('\n')}`);
    const lippen = [...lv].sort((a, b) => lang(weg(b)) - lang(weg(a)));
    console.log(`     die weitesten Punkte der Lippe:\n${lippen.slice(0, 5).map((v) => '       ' + zeile(v)).join('\n')}`);
    for (const l of loops) {
      const k = l.proben.map((q) => q.ecken[0]!);
      const m = Math.max(...k.map((v) => lang(weg(v))));
      if (m > 0.5) console.log(`       Linie ${l.id} ${l.art}${l.kante ? ' Kante' : ''}: ihre Punkte gingen bis ${z2(m)}`);
    }
  }
  if (AUFRAEUMEN) {
    const v = nachVerdichten(haut, loops, mk);
    haut = v.h;
    loops = v.loops;
  }
  neben('noch einmal verdichtet');
  const r2 = heute(haut, loops, pfade(loops), 0, 300);
  legen(haut, loops);
  if (process.env.DIAG) console.log(`     zweiter Abschnitt: ${r2.runden} Runden${r2.steht ? '' : ' (steht nicht)'}, die Haut ging ${z2(r2.weg)}`);
  steht = r1.steht && r2.steht;
  runden = r1.runden + r2.runden;
  wegMax = Math.max(r1.weg, r2.weg);
} catch (e) {
  fehler = (e as Error).message;
}
// `GEDULD=<Runden>`: Die Rechnung gilt als ruhig, sobald sich in einer Runde kein Punkt mehr als 0,02 bewegt. Kriecht die Haut
// langsamer als das, steht sie nach dieser Regel, ohne in Ruhe zu sein. Hier laufen weitere Runden ohne Abbruch; gemeldet wird,
// wie weit die Haut dabei insgesamt geht (alle 50 Runden) und wie viel in der letzten Runde.
if (process.env.GEDULD && !fehler) {
  const z = new LoopZug(haut, loops, null, true, 'kurven', 'geometrie', {});
  const null0 = loops.map((l) => new Float64Array(l.ruhe.length));
  const anfang = Float64Array.from(haut.pos);
  const N = Number(process.env.GEDULD);
  const zeilen: string[] = [];
  let letzte = 0;
  for (let r = 1; r <= N; r++) {
    const vor = Float64Array.from(haut.pos);
    z.schritt(null0, 1);
    letzte = 0;
    for (let i = 0; i < vor.length; i += 3) letzte = Math.max(letzte, Math.hypot(haut.pos[i]! - vor[i]!, haut.pos[i + 1]! - vor[i + 1]!, haut.pos[i + 2]! - vor[i + 2]!));
    if (r % 50 === 0 || r === N) {
      let ges = 0;
      let bei = 0;
      for (let i = 0; i < anfang.length; i += 3) {
        const w = Math.hypot(haut.pos[i]! - anfang[i]!, haut.pos[i + 1]! - anfang[i + 1]!, haut.pos[i + 2]! - anfang[i + 2]!);
        if (w > ges) {
          ges = w;
          bei = i;
        }
      }
      zeilen.push(`nach ${r} Runden insgesamt ${z2(ges)} bei (${[0, 1, 2].map((k) => z1(anfang[bei + k]!)).join(' / ')}), in der letzten Runde ${letzte.toFixed(4).replace('.', ',')}`);
    }
  }
  legen(haut, loops);
  console.log(`     Geduld (${N} weitere Runden ohne Abbruch):\n${zeilen.map((x) => '       ' + x).join('\n')}`);
}
const fEnde = falten(haut);
ok('K1 die Rechnung kommt zur Ruhe', steht && !fehler, fehler || `${runden} Runden${steht ? '' : ' (steht nicht)'}, die Haut ging dabei höchstens ${z2(wegMax)}; ${haut.n} Punkte`);
ok('K2 nichts schlägt neu um', fEnde.umgeklappt <= Math.max(fRuhe.umgeklappt, fSchnitt.umgeklappt), `umgeschlagen: die Form ${fRuhe.umgeklappt}, abgezogen ${fSchnitt.umgeklappt}, geöffnet ${fOffen.umgeklappt}, aufgeräumt ${fAuf.umgeklappt}, gerechnet ${fEnde.umgeklappt}`);

// wie weit die gerechnete Haut neben der geöffneten, ungerechneten liegt: fern vom Maul und am Maul
{
  const Pn = punkte(haut);
  const d = flaechenAbstand(Pn, punkte(offenRoh), flaechen(offenRoh), 30);
  let fern = 0;
  let nah = 0;
  let nahBei = [0, 0, 0];
  for (let i = 0; i < Pn.length; i++) {
    const r = Math.hypot(Pn[i]![0] - C.x, Pn[i]![1] - C.y);
    if (r > 2.5 * kopf.lang) fern = Math.max(fern, d[i]!);
    else if (d[i]! > nah) {
      nah = d[i]!;
      nahBei = Pn[i]!;
    }
  }
  ok('K3 fern vom Maul bleibt die Haut', fern < 0.5, `weiter als ${z1(2.5 * kopf.lang)} vom Mundwinkel: höchstens ${z2(fern)} (die Form allein ging in der Kontrolle bis ${z2(kontrolle.weg)})`);
  console.log(`     am Maul (näher als ${z1(2.5 * kopf.lang)}): die gerechnete Haut liegt höchstens ${z2(nah)} neben der geöffneten, bei (${nahBei.map((x) => z1(x)).join(' / ')})`);
}

// zurück auf „zu“: jeden Punkt mit seinem Winkel zurückdrehen (der Winkel hängt an der Lage in „zu“: in drei Schritten suchen)
const lippeNetz = new Set(loops.filter(istLippe).flatMap((l) => l.proben.map((p) => p.ecken[0]!)));
// (die Lippe der anderen Hälfte: die Spiegelpartner)
for (const v of [...lippeNetz]) if (haut.spiegel[v]! >= 0) lippeNetz.add(haut.spiegel[v]!);
function schliessen(hh: Haut): Haut {
  const zu = kopie(hh);
  for (let v = 0; v < hh.n; v++) {
    const qx = hh.pos[3 * v]!;
    const qy = hh.pos[3 * v + 1]!;
    // zwei Möglichkeiten: Der Punkt gehört zum oberen oder zum unteren Kiefer; es gilt die, die zu ihrer eigenen Seite zurückführt
    let best: [number, number] | null = null;
    let bestFehl = Infinity;
    for (const seite of [1, -1] as const) {
      let px = qx;
      let py = qy;
      for (let it = 0; it < 6; it++) {
        const f = kieferFeld(kopf, px, py, REICH);
        const voll = seite > 0 ? (obenLinks ? OBEN : UNTEN) : -(obenLinks ? UNTEN : OBEN);
        [px, py] = drehen(qx, qy, -voll * f.gewicht);
      }
      const f = kieferFeld(kopf, px, py, REICH);
      const [rx, ry] = drehen(px, py, winkelBei(px, py));
      const fehl = Math.hypot(rx - qx, ry - qy) + (f.seite === seite ? 0 : 1e3 * f.gewicht);
      if (fehl < bestFehl) {
        bestFehl = fehl;
        best = [px, py];
      }
    }
    zu.pos[3 * v] = best![0];
    zu.pos[3 * v + 1] = best![1];
  }
  return zu;
}
const zuGerechnet = schliessen(haut);

/**
 * Die umgeschlagenen Dreiecke einzeln (dasselbe Kriterium wie `falten`): wo sie liegen (Stelle s längs der Maullinie vom
 * Mundwinkel, Abstand d quer zu ihr, z), wie groß sie sind, ob sie an der Lippe hängen und wie steil sie gegen ihre Nachbarn stehen
 * (über 150°: Das Dreieck liegt auf seinem Nachbarn, eine echte Falte oder eine Messerkante).
 */
function umgeschlageneWo(hh: Haut, titel: string): void {
  const T = hh.tri;
  const Pp = hh.pos;
  const fn: [number, number, number][] = [];
  const vn = new Float64Array(Pp.length);
  for (let t = 0; t < T.length; t += 3) {
    const [a, b, c] = [T[t]!, T[t + 1]!, T[t + 2]!];
    const ab = [0, 1, 2].map((k) => Pp[3 * b + k]! - Pp[3 * a + k]!);
    const ac = [0, 1, 2].map((k) => Pp[3 * c + k]! - Pp[3 * a + k]!);
    const f: [number, number, number] = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
    fn.push(f);
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] = vn[3 * v + k]! + f[k]!;
  }
  const kanten = new Map<number, number[]>();
  for (let t = 0; t < T.length / 3; t++)
    for (let e = 0; e < 3; e++) {
      const a = T[3 * t + e]!;
      const b = T[3 * t + ((e + 1) % 3)]!;
      const k = Math.min(a, b) * hh.n + Math.max(a, b);
      kanten.set(k, [...(kanten.get(k) ?? []), t]);
    }
  const zeilen: string[] = [];
  for (let t = 0; t < T.length / 3; t++) {
    const f = fn[t]!;
    const ecken = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    const m = [0, 1, 2].map((k) => ecken.reduce((s, v) => s + vn[3 * v + k]!, 0));
    if (f[0] * m[0]! + f[1] * m[1]! + f[2] * m[2]! >= 0) continue;
    const mitte = [0, 1, 2].map((k) => ecken.reduce((s, v) => s + Pp[3 * v + k]!, 0) / 3);
    const o = profil.naechster(mitte[0]!, mitte[1]!);
    const lf = Math.hypot(f[0], f[1], f[2]) || 1;
    let steil = 0;
    for (let e = 0; e < 3; e++) {
      const a = ecken[e]!;
      const b = ecken[(e + 1) % 3]!;
      for (const u of kanten.get(Math.min(a, b) * hh.n + Math.max(a, b)) ?? []) {
        if (u === t) continue;
        const g = fn[u]!;
        const lg = Math.hypot(g[0], g[1], g[2]) || 1;
        const cos = (f[0] * g[0] + f[1] * g[1] + f[2] * g[2]) / (lf * lg);
        steil = Math.max(steil, (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI);
      }
    }
    const anLippe = ecken.filter((v) => lippeNetz.has(v)).length;
    zeilen.push(
      `       (${mitte.map((x) => z1(x)).join(' / ')}): ${o.hinten ? 'hinter dem Mundwinkel' : `s ${z1(o.s)} von ${z1(kopf.lang)}`}, quer ${z2(o.d)}, Fläche ${z2(lf / 2)}, ${anLippe} Ecken an der Lippe, gegen den Nachbarn bis ${z1(steil)}°`,
    );
  }
  console.log(`     ${titel}: ${zeilen.length} umgeschlagen gezählt${zeilen.length ? '\n' + zeilen.join('\n') : ''}`);
}
umgeschlageneWo(haut, 'gerechnet');
const gefaltetVorher = gefaltetWo(vorherBild.h, vorherBild.loops, 'die Form von vorher');
const gefaltetEnde = gefaltetWo(haut, loops, 'gerechnet');
if (REISS) {
  const sp = lippenSpalt(haut, loops);
  const linie = sp.linie === null ? 'nicht messbar' : sp.linie.toExponential(1);
  ok('Z1a zu ist der Spalt null, an der Linie', sp.linie !== null && sp.linie < 1e-9, `Ober- und Unterlippe haben dieselben Punkte und Griffe: Abweichung ${linie}`);
  ok('Z1b zu ist der Spalt null, am Netz', sp.netz < 1e-9, `die Lippen im Netz (${sp.punkte[0]} und ${sp.punkte[1]} Punkte) liegen höchstens ${sp.netz.toFixed(3).replace('.', ',')} auseinander, bei (${sp.bei.map((x) => z1(x)).join(' / ')}); gleich nach dem Schließen ${spaltNachSchliessen.toFixed(3).replace('.', ',')}`);
  ok(
    'Z2 am Mundwinkel ist nach dem Aufräumen nichts gefaltet',
    gefaltetEnde.amMaul === 0,
    `am Maul gefaltet ${gefaltetEnde.amMaul}, davon am Mundwinkel ${gefaltetEnde.amWinkel}; fern vom Maul ${gefaltetEnde.alle - gefaltetEnde.amMaul} (die Form von vorher hat dort ${gefaltetVorher.alle - gefaltetVorher.amMaul}); die alte Zählung: umgeschlagen ${fEnde.umgeklappt}`,
  );
}

/**
 * Welcher Kiefer: je Punkt die Seite der Maullinie (+1 links, −1 rechts), aus den Linien des Mauls gelesen statt aus der Lage.
 * (Zu liegen die Wände nur um den Spalt auseinander; nach dem Rechnen steht ein Punkt des Bodens leicht auf der Seite des Gaumens,
 * und die Lage ordnet ihn dem falschen Kiefer zu.) Die Lippe teilt sich am Mundwinkel in ihre zwei Lippen. In der Tasche gehört zu
 * einer Lippe, was von ihr aus zu erreichen ist, ohne die Rachenlinie zu überschreiten. Außen gilt die Lippe, von der aus der Punkt
 * über die Kanten des Netzes zuerst erreicht wird (ohne die Lippe zu überschreiten): Vor dem Mundwinkel trennt die Lippe die Haut
 * der zwei Kiefer ganz, die andere Lippe ist nur um den Mundwinkel herum zu erreichen. Das gilt auch, wenn die Lippe verzogen ist
 * (die Lage gegen die gezeichnete Maullinie sagt dann nichts mehr). Hinter dem Mundwinkel, wo beide gleich weit sind, dreht kein
 * Kiefer.
 */
function kieferSeiten(hh: Haut, ls: readonly Loop[]): { seite: Int8Array; aussen: Uint8Array; tasche: [number, number]; getrennt: boolean } {
  const lage = (v: number): { s: number; d: number; hinten: boolean } => profil.naechster(hh.pos[3 * v]!, hh.pos[3 * v + 1]!);
  const beiC = (v: number): number => Math.hypot(hh.pos[3 * v]! - C.x, hh.pos[3 * v + 1]! - C.y);
  const paar = (v: number): number[] => (hh.spiegel[v]! >= 0 && hh.spiegel[v] !== v ? [v, hh.spiegel[v]!] : [v]);
  const seite = new Int8Array(hh.n);
  const fest = new Uint8Array(hh.n); // 1 Lippe, 2 Rachenlinie
  const quellen: [number[], number[]] = [[], []];
  /** die zwei Lippen (Stücke der Kette vor und hinter dem Mundwinkel) */
  const teile: number[][] = [];
  for (const l of ls.filter(istLippe)) {
    const kette = l.proben.map((p) => p.ecken[0]!);
    let jM = 0;
    kette.forEach((v, j) => {
      if (beiC(v) < beiC(kette[jM]!)) jM = j;
    });
    for (const teil of [kette.slice(0, jM), kette.slice(jM + 1)]) if (teil.length) teile.push(teil);
    for (const v of kette) for (const w of paar(v)) fest[w] = 1;
  }
  for (const l of ls) {
    if (istLippe(l) || !l.kante) continue;
    const kette = l.proben.map((p) => p.ecken[0]!);
    if (!kette.every((v) => beiC(v) < 3)) continue;
    for (const v of kette) for (const w of paar(v)) if (!fest[w]) fest[w] = 2;
  }
  // außen: alles, was von einem fernen Punkt aus zu erreichen ist, ohne die Lippe zu überschreiten
  let start = 0;
  for (let v = 1; v < hh.n; v++) if (beiC(v) > beiC(start)) start = v;
  const aussen = new Uint8Array(hh.n);
  aussen[start] = 1;
  const stapel = [start];
  while (stapel.length) {
    const v = stapel.pop()!;
    if (fest[v] === 1) continue;
    for (const u of hh.nachbarn[v]!) {
      if (aussen[u]) continue;
      aussen[u] = 1;
      stapel.push(u);
    }
  }
  // welche Lippe: Die Haut außen neben ihr liegt eindeutig auf einer Seite der Linie (die Lippe selbst liegt, wenn der Spalt zu
  // ist, genau auf ihr; aus ihrer eigenen Lage gelesen, wäre die Seite Zufall)
  for (const teil of teile) {
    let summe = 0;
    for (const v of teil) for (const u of hh.nachbarn[v]!) if (aussen[u] && !fest[u]) summe += lage(u).d;
    const s = summe >= 0 ? 1 : -1;
    for (const v of teil)
      for (const w of paar(v)) {
        seite[w] = s;
        quellen[s > 0 ? 0 : 1].push(w);
      }
  }
  // die Tasche: von jeder Lippe aus, bis zur Rachenlinie
  const tasche: [number, number] = [0, 0];
  for (const k of [0, 1] as const) {
    const st = [...quellen[k]];
    while (st.length) {
      const v = st.pop()!;
      for (const u of hh.nachbarn[v]!) {
        if (seite[u] !== 0 || fest[u] !== 0 || aussen[u]) continue;
        seite[u] = k === 0 ? 1 : -1;
        tasche[k]++;
        st.push(u);
      }
    }
  }
  // (trennt die Rachenlinie die zwei Wände nicht, hat die erste Lippe die ganze Tasche bekommen: dann gilt dort die Lage)
  const getrennt = tasche[0] > 0 && tasche[1] > 0;
  if (!getrennt) for (let v = 0; v < hh.n; v++) if (!aussen[v] && !fest[v]) seite[v] = 0;
  // außen: Schicht um Schicht von beiden Lippen aus
  let rand = [...quellen[0], ...quellen[1]];
  const erreicht = new Uint8Array(hh.n);
  for (const q of rand) erreicht[q] = 1;
  while (rand.length) {
    const weiter: number[] = [];
    for (const v of rand)
      for (const u of hh.nachbarn[v]!) {
        if (erreicht[u] || fest[u] !== 0 || !aussen[u]) continue;
        erreicht[u] = 1;
        seite[u] = seite[v]!;
        weiter.push(u);
      }
    rand = weiter;
  }
  for (let v = 0; v < hh.n; v++) if (seite[v] === 0) seite[v] = lage(v).d >= 0 ? 1 : -1;
  return { seite, aussen, tasche, getrennt };
}

/** Abstand eines Punkts von einer Strecke */
function zurStrecke(p: readonly number[], a: readonly number[], b: readonly number[]): number {
  const ab = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
  const ap = [p[0]! - a[0]!, p[1]! - a[1]!, p[2]! - a[2]!];
  const l2 = ab[0]! * ab[0]! + ab[1]! * ab[1]! + ab[2]! * ab[2]!;
  const t = l2 > 0 ? Math.max(0, Math.min(1, (ap[0]! * ab[0]! + ap[1]! * ab[1]! + ap[2]! * ab[2]!) / l2)) : 0;
  return Math.hypot(ap[0]! - t * ab[0]!, ap[1]! - t * ab[1]!, ap[2]! - t * ab[2]!);
}

/**
 * Der Spalt der Lippen (Probe P2, Z1): an der Linie (wie weit die zweite Lippe vom Abbild der ersten abweicht, Orte und Griffe ihrer
 * Punkte) und am Netz (der größte Abstand eines Punkts der einen Lippe von der Kette der anderen; die zwei Lippen sind verschieden
 * unterteilt).
 */
function lippenSpalt(hh: Haut, ls: readonly Loop[]): { linie: number | null; netz: number; bei: number[]; punkte: [number, number] } {
  let linie: number | null = null;
  let netz = 0;
  let bei = [0, 0, 0];
  let punkte: [number, number] = [0, 0];
  const P = (v: number): number[] => [hh.pos[3 * v]!, hh.pos[3 * v + 1]!, hh.pos[3 * v + 2]!];
  const beiC = (v: number): number => Math.hypot(hh.pos[3 * v]! - C.x, hh.pos[3 * v + 1]! - C.y);
  for (const l of ls.filter(istLippe)) {
    linie = zwillingsFehler(l);
    const kette = l.proben.map((p) => p.ecken[0]!);
    let jM = 0;
    kette.forEach((v, j) => {
      if (beiC(v) < beiC(kette[jM]!)) jM = j;
    });
    const A = kette.slice(0, jM + 1).map(P);
    const B = kette.slice(jM).map(P);
    punkte = [A.length, B.length];
    for (const [X, Y] of [
      [A, B],
      [B, A],
    ] as const)
      for (const q of X) {
        let d = Infinity;
        for (let i = 0; i + 1 < Y.length; i++) d = Math.min(d, zurStrecke(q, Y[i]!, Y[i + 1]!));
        if (Number.isFinite(d) && d > netz) {
          netz = d;
          bei = q;
        }
      }
  }
  return { linie, netz, bei, punkte };
}

/**
 * Falten (Probe P2, Z2): Dreiecke, die steiler als 120° gegen einen Nachbarn stehen, mit dem sie keine Kante einer harten Linie
 * teilen. An Lippe und Rachenlinie ist der Knick gewollt (dort liegen Gaumen und Boden aufeinander); überall sonst ist ein Dreieck,
 * das so auf seinem Nachbarn liegt, eine Falte. `amWinkel`: davon näher am Mundwinkel als ein Viertel der Lippe.
 */
function gefaltetWo(hh: Haut, ls: readonly Loop[], titel: string, still = false): { alle: number; amMaul: number; amWinkel: number; ohneFlaeche: number } {
  const schl = (a: number, b: number): number => Math.min(a, b) * hh.n + Math.max(a, b);
  const hart = new Set<number>();
  for (const l of ls) {
    if (!l.kante) continue;
    const k = l.proben.map((p) => p.ecken[0]!);
    const m = l.art === 'ring' ? k.length - 1 : k.length;
    for (let j = 0; j < m; j++) {
      const a = k[j]!;
      const b = k[(j + 1) % k.length]!;
      hart.add(schl(a, b));
      if (hh.spiegel[a]! >= 0 && hh.spiegel[b]! >= 0) hart.add(schl(hh.spiegel[a]!, hh.spiegel[b]!));
    }
  }
  const T = hh.tri;
  const nT = T.length / 3;
  const fn: [number, number, number][] = [];
  const flaeche = new Float64Array(nT);
  let ohneFlaeche = 0;
  for (let t = 0; t < nT; t++) {
    const [a, b, c] = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    const ab = [0, 1, 2].map((k) => hh.pos[3 * b + k]! - hh.pos[3 * a + k]!);
    const ac = [0, 1, 2].map((k) => hh.pos[3 * c + k]! - hh.pos[3 * a + k]!);
    const f: [number, number, number] = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
    const l = Math.hypot(f[0], f[1], f[2]);
    flaeche[t] = l / 2;
    if (l < 1e-12) ohneFlaeche++;
    fn.push(l < 1e-12 ? [0, 0, 0] : [f[0] / l, f[1] / l, f[2] / l]);
  }
  const kanten = new Map<number, number[]>();
  for (let t = 0; t < nT; t++)
    for (let e = 0; e < 3; e++) {
      const k = schl(T[3 * t + e]!, T[3 * t + ((e + 1) % 3)]!);
      const liste = kanten.get(k);
      if (liste) liste.push(t);
      else kanten.set(k, [t]);
    }
  const steil = new Float64Array(nT);
  for (const [k, ts] of kanten) {
    if (ts.length !== 2 || hart.has(k)) continue;
    const [f, g] = [fn[ts[0]!]!, fn[ts[1]!]!];
    if ((f[0] === 0 && f[1] === 0 && f[2] === 0) || (g[0] === 0 && g[1] === 0 && g[2] === 0)) continue;
    const w = (Math.acos(Math.max(-1, Math.min(1, f[0] * g[0] + f[1] * g[1] + f[2] * g[2]))) * 180) / Math.PI;
    for (const t of ts) if (w > steil[t]!) steil[t] = w;
  }
  let alle = 0;
  let amMaul = 0;
  let amWinkel = 0;
  const zeilen: string[] = [];
  for (let t = 0; t < nT; t++) {
    if (steil[t]! <= 120) continue;
    alle++;
    const mitte = [0, 1, 2].map((k) => (hh.pos[3 * T[3 * t]! + k]! + hh.pos[3 * T[3 * t + 1]! + k]! + hh.pos[3 * T[3 * t + 2]! + k]!) / 3);
    const r = Math.hypot(mitte[0]! - C.x, mitte[1]! - C.y);
    if (r >= 2.5 * kopf.lang) continue;
    amMaul++;
    if (r < 0.25 * kopf.lang) amWinkel++;
    if (zeilen.length < 8) zeilen.push(`       (${mitte.map((x) => z1(x)).join(' / ')}): ${z1(r)} vom Mundwinkel, Fläche ${z2(flaeche[t]!)}, ${z1(steil[t]!)}° gegen den Nachbarn`);
  }
  if (!still)
    console.log(
      `     ${titel}: ${amMaul} Dreiecke am Maul gefaltet (über 120° gegen einen Nachbarn ohne harte Linie dazwischen; näher als ${z1(2.5 * kopf.lang)} am Mundwinkel), davon ${amWinkel} am Mundwinkel selbst; fern vom Maul ${alle - amMaul}${ohneFlaeche ? `; ${ohneFlaeche} ohne Fläche` : ''}${zeilen.length ? '\n' + zeilen.join('\n') : ''}`,
    );
  return { alle, amMaul, amWinkel, ohneFlaeche };
}

/** Öffnung nur fürs Bild (Grad): `ZEIG_OBEN`, `ZEIG_UNTEN` */
function zeigWinkel(): [number, number] {
  const g = (x: string | undefined, d: number): number => (Number(x ?? d) * Math.PI) / 180;
  return [g(process.env.ZEIG_OBEN, 8), g(process.env.ZEIG_UNTEN, 22)];
}

/**
 * Mit den Knochen öffnen, nur in der Anzeige: Jeder Punkt dreht um den Mundwinkel, mit dem Gewicht des Felds an seinem Ort und zu
 * der Seite seines Kiefers (`seite`, +1 links der Linie). `gespannt`: Dreiecke, deren längste Kante sich dabei mehr als verdoppelt
 * (dort hingen die zwei Kiefer zusammen).
 */
function oeffnenAnzeige(hh: Haut, seite: ArrayLike<number>): { zeig: Haut; gespannt: number } {
  const [zo, zu] = zeigWinkel();
  const zeig = kopie(hh);
  for (let v = 0; v < zeig.n; v++) {
    const f = kieferFeld(kopf, zeig.pos[3 * v]!, zeig.pos[3 * v + 1]!, REICH);
    const a = (seite[v]! > 0 ? (obenLinks ? zo : zu) : -(obenLinks ? zu : zo)) * f.gewicht;
    if (a !== 0) [zeig.pos[3 * v], zeig.pos[3 * v + 1]] = drehen(zeig.pos[3 * v]!, zeig.pos[3 * v + 1]!, a);
  }
  let gespannt = 0;
  const kante = (x: Haut, a: number, b: number): number => Math.hypot(x.pos[3 * a]! - x.pos[3 * b]!, x.pos[3 * a + 1]! - x.pos[3 * b + 1]!, x.pos[3 * a + 2]! - x.pos[3 * b + 2]!);
  for (let t = 0; t < hh.tri.length; t += 3) {
    const [a, b, c] = [hh.tri[t]!, hh.tri[t + 1]!, hh.tri[t + 2]!];
    const vorK = Math.max(kante(hh, a, b), kante(hh, b, c), kante(hh, c, a));
    const nachK = Math.max(kante(zeig, a, b), kante(zeig, b, c), kante(zeig, c, a));
    if (nachK > 2 * vorK + 1) gespannt++;
  }
  return { zeig, gespannt };
}
{
  // außen: alles, was von einem fernen Punkt aus zu erreichen ist, ohne die Lippe zu überschreiten
  let start = 0;
  let weit = 0;
  for (let v = 0; v < haut.n; v++) {
    const r = Math.hypot(haut.pos[3 * v]! - C.x, haut.pos[3 * v + 1]! - C.y);
    if (r > weit) {
      weit = r;
      start = v;
    }
  }
  const aussen = new Uint8Array(haut.n);
  const reihe = [start];
  aussen[start] = 1;
  while (reihe.length) {
    const v = reihe.pop()!;
    if (lippeNetz.has(v)) continue;
    for (const u of haut.nachbarn[v]!) {
      if (aussen[u]) continue;
      aussen[u] = 1;
      reihe.push(u);
    }
  }
  const Pz = punkte(zuGerechnet);
  const d = flaechenAbstand(Pz, punkte(vorher), flaechen(vorher), 30);
  let aussenMax = 0;
  let aussenBei = [0, 0, 0];
  let aussenZahl = 0;
  let ueber1 = 0;
  // getrennt nach Kiefer (vor dem Mundwinkel, im Bereich des Mauls): [links der Linie, rechts]
  const skK = kieferSeiten(haut, loops);
  const jeKiefer: [number, number] = [0, 0];
  const jeKieferUeber1: [number, number] = [0, 0];
  for (let v = 0; v < haut.n; v++) {
    if (!aussen[v]) continue;
    aussenZahl++;
    if (d[v]! > 1) ueber1++;
    if (d[v]! > aussenMax) {
      aussenMax = d[v]!;
      aussenBei = Pz[v]!;
    }
    const o = profil.naechster(Pz[v]![0], Pz[v]![1]);
    if (o.hinten || Math.hypot(Pz[v]![0] - C.x, Pz[v]![1] - C.y) > 1.3 * kopf.lang || lippeNetz.has(v)) continue;
    const k = skK.seite[v]! > 0 ? 0 : 1;
    jeKiefer[k] = Math.max(jeKiefer[k], d[v]!);
    if (d[v]! > 1) jeKieferUeber1[k]++;
  }
  const [kOben, kUnten] = obenLinks ? [0, 1] : [1, 0];
  console.log(`     außen je Kiefer (vor dem Mundwinkel): Oberkiefer höchstens ${z2(jeKiefer[kOben]!)} (${jeKieferUeber1[kOben]} Punkte über 1), Unterkiefer höchstens ${z2(jeKiefer[kUnten]!)} (${jeKieferUeber1[kUnten]} Punkte über 1)`);
  ok('K4 zu liegt die Haut außen auf der Form von vorher', aussenMax < 1, `außen ${aussenZahl} von ${haut.n} Punkten; höchstens ${z2(aussenMax)} neben der Form von vorher, bei (${aussenBei.map((x) => z1(x)).join(' / ')}); ${ueber1} Punkte weiter als 1`);
  // der Spalt: wie weit die Punkte der Lippe, zu, quer von der Linie weg liegen (links und rechts der Linie zusammen)
  let links = 0;
  let rechts = 0;
  let nLinks = 0;
  let nRechts = 0;
  for (const v of lippeNetz) {
    const o = profil.naechster(zuGerechnet.pos[3 * v]!, zuGerechnet.pos[3 * v + 1]!);
    if (o.hinten) continue;
    if (o.d >= 0) {
      nLinks++;
      links = Math.max(links, o.d);
    } else {
      nRechts++;
      rechts = Math.max(rechts, -o.d);
    }
  }
  const spalt = links + rechts;
  ok('K5 zu schließen die Lippen', nLinks > 0 && nRechts > 0 && spalt < 0.5, `Lippe: ${nLinks} Punkte links, ${nRechts} rechts der Linie; quer zur Linie liegen sie zusammen höchstens ${z2(spalt)} auseinander (angelegt ist der Spalt ${z2(2 * SPALT)} breit)`);
  // die Tasche: wie weit die Wände nach dem Rechnen von den geraden Wänden weg sind
  let innenMax = 0;
  let innenZahl = 0;
  const dOffen = flaechenAbstand(punkte(haut), punkte(offenRoh), flaechen(offenRoh), 30);
  for (let v = 0; v < haut.n; v++) {
    if (aussen[v]) continue;
    innenZahl++;
    innenMax = Math.max(innenMax, dOffen[v]!);
  }
  console.log(`     die Tasche: ${innenZahl} Punkte innen; ihre Wände liegen nach dem Rechnen höchstens ${z2(innenMax)} neben den geraden Wänden`);
}
const abwEnde = Math.max(...loops.map((l) => pfadAbweichung(l)));
console.log(`     Linien nach dem Rechnen höchstens ${z2(abwEnde)} neben ihren Pfaden`);

if (OBEN + UNTEN > 0) {
  bilder.push(bildVon('geöffnet, gerechnet', haut, loops, `${runden} Runden${steht ? '' : ', steht nicht'}; umgeschlagen ${fEnde.umgeklappt}`));
  bilder.push(bildVon('zurück auf zu (gerechnet, zurückgedreht)', zuGerechnet, [], ''));
} else {
  // zu gerechnet: Das ist die Form. Geöffnet wird nur in der Anzeige, mit den Knochen (wie in der Studie und in der Pose von heute)
  bilder.length = 0;
  bilder.push(bildVon('die Form von vorher', vorherBild.h, vorherBild.loops, ''));
  bilder.push(bildVon('mit Maul, zu gerechnet', haut, loops, `${runden} Runden${steht ? '' : ', steht nicht'}; ${REISS ? `am Maul gefaltet ${gefaltetEnde.amMaul}` : `umgeschlagen ${fEnde.umgeklappt}`}`));
  const [zo, zu] = zeigWinkel();
  // welcher Kiefer: aus den Linien des Mauls (Lippe, Rachenlinie); `SEITE=lage` nimmt wie zuerst die Lage, `SEITE=schnitt` die
  // Seite gleich nach dem Abziehen (nur solange das Netz dasselbe ist)
  const sk = kieferSeiten(haut, loops);
  const gleichesNetz = haut.n === seiteZu.length;
  if (gleichesNetz) {
    // Gegenprobe: Stimmt die Zuordnung aus den Linien mit der vom Schnitt überein? (gezählt, wo ein Kiefer überhaupt dreht)
    let anders = 0;
    let gezaehlt = 0;
    for (let v = 0; v < haut.n; v++) {
      if (kieferFeld(kopf, zuHaut.pos[3 * v]!, zuHaut.pos[3 * v + 1]!, REICH).gewicht <= 0) continue;
      if (Math.abs(profil.naechster(zuHaut.pos[3 * v]!, zuHaut.pos[3 * v + 1]!).d) < 1e-6) continue;
      gezaehlt++;
      if (sk.seite[v] !== seiteZu[v]) anders++;
    }
    console.log(`     welcher Kiefer, aus den Linien gelesen (Tasche: ${sk.tasche[0]} Punkte links, ${sk.tasche[1]} rechts${sk.getrennt ? '' : ', nicht getrennt'}): an ${anders} von ${gezaehlt} Punkten anders als gleich nach dem Schnitt`);
  } else console.log(`     welcher Kiefer, aus den Linien gelesen (Tasche: ${sk.tasche[0]} Punkte links, ${sk.tasche[1]} rechts${sk.getrennt ? '' : ', nicht getrennt'})`);
  const seiteWahl =
    process.env.SEITE === 'lage'
      ? Int8Array.from({ length: haut.n }, (_, v) => kieferFeld(kopf, haut.pos[3 * v]!, haut.pos[3 * v + 1]!, REICH).seite)
      : process.env.SEITE === 'schnitt' && gleichesNetz
        ? seiteZu
        : sk.seite;
  const offen = oeffnenAnzeige(haut, seiteWahl);
  const fz = falten(offen.zeig);
  console.log(`     mit den Knochen geöffnet (nur Anzeige, oben ${z1((zo * 180) / Math.PI)}°, unten ${z1((zu * 180) / Math.PI)}°): umgeschlagen ${fz.umgeklappt}; ${offen.gespannt} Dreiecke spannen sich quer über das Maul${AUFRAEUMEN ? '' : ' (ohne Aufräumen)'}`);
  umgeschlageneWo(offen.zeig, 'geöffnet (Anzeige)');
  const go = gefaltetWo(offen.zeig, loops, 'geöffnet (Anzeige)');
  if (REISS) ok('Z3 geöffnet spannt sich nichts über das Maul', offen.gespannt === 0 && sk.getrennt, `${offen.gespannt} Dreiecke gespannt; am Maul gefaltet ${go.amMaul} (zu waren es ${gefaltetEnde.amMaul}), davon am Mundwinkel ${go.amWinkel}`);
  bilder.push(bildVon('mit den Knochen geöffnet (Anzeige)', offen.zeig, loops, REISS ? `gespannt ${offen.gespannt}, am Maul gefaltet ${go.amMaul}` : `umgeschlagen ${fz.umgeklappt}`));
}
void aufgeraeumt;

// ---------- Zusatz (nur zu gerechnet): Ein Punkt der Unterlippe wird gezogen. Folgt der Unterkiefer, bleibt die Oberlippe? ----------
const ZUG = Number(process.env.ZUG ?? 15);
if (OBEN + UNTEN === 0 && ZUG > 0 && steht && !REISS) {
  const hz = kopie(haut);
  const lz = loopsKopie(loops);
  const lippe = lz.find(istLippe)!;
  // die Seite der Unterlippe: links der Linie, wenn der Oberkiefer rechts liegt
  const untenSeite = obenLinks ? -1 : 1;
  const kandidaten = lippe.punkte
    .map((q) => ({ q, o: profil.naechster(q.ref.x, q.ref.y) }))
    .filter((x) => !x.o.hinten && Math.sign(x.o.d || 1) === untenSeite && Math.abs(x.q.ref.z) > 0.5 * mk && x.o.s > 0.25 * sVorn && x.o.s < 0.9 * sVorn);
  if (!kandidaten.length) console.log('     Zug: Die Unterlippe hat keinen Punkt zwischen Mundwinkel und Spitze');
  else {
    // der Punkt nahe der Mitte der Lippe
    const wahl = kandidaten.reduce((a, b) => (Math.abs(b.o.s - 0.55 * sVorn) < Math.abs(a.o.s - 0.55 * sVorn) ? b : a));
    const t = profil.tangente(wahl.o.s);
    // von der Oberlippe weg: quer zur Maullinie, zur Seite des Unterkiefers
    const ziel = { x: wahl.q.ref.x - t.y * untenSeite * ZUG, y: wahl.q.ref.y + t.x * untenSeite * ZUG, z: wahl.q.ref.z };
    const trifft = (q: (typeof lippe.punkte)[number]): boolean => q === wahl.q || (q.kreuzung !== undefined && q.kreuzung === wahl.q.kreuzung);
    const gezogen = lz.map((l) => l.punkte.map((q) => (trifft(q) ? ziel : q.ref)));
    const mit = lz.filter((l) => l.punkte.some(trifft)).length;
    const lagen = lz.map((l, i) => pfadLagen(l, gezogen[i]) ?? Float64Array.from(l.ruhe));
    lz.forEach((l, i) =>
      l.punkte.forEach((q, j) => {
        q.cur = { ...gezogen[i]![j]! };
      }),
    );
    let text = '';
    try {
      const r1 = heute(hz, lz, lagen, 30, 300);
      legen(hz, lz);
      const fz = falten(hz);
      // je Punkt des Netzes: wie weit er gegangen ist (das Netz ist dasselbe), getrennt nach Oberkiefer, Unterkiefer, fern
      let obenMax = 0;
      let untenMax = 0;
      let fernMax = 0;
      let lippeOben = 0;
      let lippeUnten = 0;
      // welcher Kiefer: aus den Linien des Mauls, nicht aus der Lage (siehe `kieferSeiten`)
      const sk = kieferSeiten(haut, loops);
      let obenBei = -1;
      let obenAussen = 0;
      let obenUeber1 = 0;
      for (let v = 0; v < haut.n; v++) {
        const w = Math.hypot(hz.pos[3 * v]! - haut.pos[3 * v]!, hz.pos[3 * v + 1]! - haut.pos[3 * v + 1]!, hz.pos[3 * v + 2]! - haut.pos[3 * v + 2]!);
        const o = profil.naechster(haut.pos[3 * v]!, haut.pos[3 * v + 1]!);
        const r = Math.hypot(haut.pos[3 * v]! - C.x, haut.pos[3 * v + 1]! - C.y);
        if (r > 2.5 * kopf.lang) fernMax = Math.max(fernMax, w);
        else if (!o.hinten && r < 1.3 * kopf.lang) {
          const unten = (process.env.SEITE === 'lage' ? Math.sign(o.d || 1) : sk.seite[v]!) === untenSeite;
          if (unten) untenMax = Math.max(untenMax, w);
          else {
            if (w > obenMax) {
              obenMax = w;
              obenBei = v;
            }
            if (w > 1) obenUeber1++;
            if (sk.aussen[v] && !lippeNetz.has(v)) obenAussen = Math.max(obenAussen, w);
          }
          if (lippeNetz.has(v)) {
            if (unten) lippeUnten = Math.max(lippeUnten, w);
            else lippeOben = Math.max(lippeOben, w);
          }
        }
      }
      const abw = Math.max(...lz.map((l) => pfadAbweichung(l)));
      text = `ein Punkt der Unterlippe (er gehört ${mit} ${mit === 1 ? 'Linie' : 'Linien'}) geht ${ZUG} von der Oberlippe weg: ${r1.runden} Runden${r1.steht ? '' : ' (steht nicht)'}; der Unterkiefer folgt bis ${z2(untenMax)} (seine Lippe bis ${z2(lippeUnten)}), der Oberkiefer bewegt sich höchstens ${z2(obenMax)}${obenBei >= 0 ? ` (bei (${[0, 1, 2].map((k) => z1(haut.pos[3 * obenBei + k]!)).join(' / ')}), ${sk.aussen[obenBei] ? 'außen' : 'in der Tasche'}; ${obenUeber1} Punkte weiter als 1; außen höchstens ${z2(obenAussen)}` : ''}; seine Lippe ${z2(lippeOben)}), fern ${z2(fernMax)}; umgeschlagen ${fz.umgeklappt}; Linien ${z2(abw)} neben ihren Pfaden`;
      umgeschlageneWo(hz, 'gezogen');
      ok('Zusatz: ein Punkt der Unterlippe gezogen, der Unterkiefer folgt, die Oberlippe bleibt', r1.steht && fz.umgeklappt <= fEnde.umgeklappt && untenMax > 0.5 * ZUG && lippeOben < 0.5, text);
      bilder.push(bildVon(`ein Punkt der Unterlippe ${ZUG} gezogen (zu)`, hz, lz, `Unterkiefer bis ${z1(untenMax)}, Oberkiefer ${z2(obenMax)}, Oberlippe ${z2(lippeOben)}`));
    } catch (e) {
      ok('Zusatz: ein Punkt der Unterlippe gezogen', false, `hält nicht: ${(e as Error).message}`);
    }
  }
}
// ---------- Z5 (Probe P2): Die geschlossene Linie lässt sich als Ganzes ziehen: ein Punkt der Lippe und sein Zwilling ----------
if (REISS && ZUG > 0 && steht) {
  const hz = kopie(haut);
  const lz = loopsKopie(loops);
  const lippe = lz.find(istLippe)!;
  const zw = zwillinge(lippe);
  const untenSeite = obenLinks ? -1 : 1;
  const kand = (zw?.paare ?? [])
    .map(([i, j]) => ({ i, j, o: profil.naechster(lippe.punkte[i]!.ref.x, lippe.punkte[i]!.ref.y) }))
    .filter((x) => !x.o.hinten && Math.abs(lippe.punkte[x.i]!.ref.z) > 0.5 * mk && x.o.s > 0.25 * sVorn && x.o.s < 0.9 * sVorn);
  if (!zw || !kand.length) ok('Z5 die geschlossene Linie lässt sich als Ganzes ziehen', false, zw ? 'die Lippe hat kein Punktepaar zwischen Mundwinkel und Spitze' : 'die Lippe hat nach dem Rechnen keine Zwillinge mehr');
  else {
    const wahl = kand.reduce((a, b) => (Math.abs(b.o.s - 0.55 * sVorn) < Math.abs(a.o.s - 0.55 * sVorn) ? b : a));
    const [pa, pb] = [lippe.punkte[wahl.i]!, lippe.punkte[wahl.j]!];
    const t = profil.tangente(wahl.o.s);
    // quer zur Maullinie, zum Unterkiefer hin
    const dv = { x: -t.y * untenSeite * ZUG, y: t.x * untenSeite * ZUG };
    const trifft = (q: (typeof lippe.punkte)[number]): boolean => q === pa || q === pb || (q.kreuzung !== undefined && (q.kreuzung === pa.kreuzung || q.kreuzung === pb.kreuzung));
    const gezogen = lz.map((l) => l.punkte.map((q) => (trifft(q) ? { x: q.ref.x + dv.x, y: q.ref.y + dv.y, z: q.ref.z } : q.ref)));
    const lagen = lz.map((l, i) => pfadLagen(l, gezogen[i]) ?? Float64Array.from(l.ruhe));
    lz.forEach((l, i) =>
      l.punkte.forEach((q, j) => {
        q.cur = { ...gezogen[i]![j]! };
      }),
    );
    try {
      const r1 = heute(hz, lz, lagen, 30, 300);
      legen(hz, lz);
      let fernMax = 0;
      let lippeMax = 0;
      for (let v = 0; v < haut.n; v++) {
        const w = Math.hypot(hz.pos[3 * v]! - haut.pos[3 * v]!, hz.pos[3 * v + 1]! - haut.pos[3 * v + 1]!, hz.pos[3 * v + 2]! - haut.pos[3 * v + 2]!);
        if (Math.hypot(haut.pos[3 * v]! - C.x, haut.pos[3 * v + 1]! - C.y) > 2.5 * kopf.lang) fernMax = Math.max(fernMax, w);
        if (lippeNetz.has(v)) lippeMax = Math.max(lippeMax, w);
      }
      const sp = lippenSpalt(hz, lz);
      umgeschlageneWo(hz, 'gezogen');
      const gz = gefaltetWo(hz, lz, 'gezogen');
      const abw = Math.max(...lz.map((l) => pfadAbweichung(l)));
      const linie = sp.linie === null ? 'nicht messbar' : sp.linie.toExponential(1);
      ok(
        'Z5 die geschlossene Linie lässt sich als Ganzes ziehen',
        r1.steht && sp.linie !== null && sp.linie < 1e-9 && gz.amMaul <= gefaltetEnde.amMaul && lippeMax > 0.5 * ZUG,
        `ein Punkt der Lippe und sein Zwilling gehen ${ZUG} quer zur Linie: ${r1.runden} Runden${r1.steht ? '' : ' (steht nicht)'}; beide Lippen gehen bis ${z2(lippeMax)} mit; Spalt an der Linie ${linie}, am Netz höchstens ${sp.netz.toFixed(3).replace('.', ',')}; am Maul gefaltet ${gz.amMaul} (vorher ${gefaltetEnde.amMaul}); fern ${z2(fernMax)}; Linien ${z2(abw)} neben ihren Pfaden`,
      );
      // welcher Kiefer, an der verzogenen Form neu gelesen (solange das Netz dasselbe ist, mit vorher zu vergleichen)
      {
        const skz = kieferSeiten(hz, lz);
        const sk0 = kieferSeiten(haut, loops);
        let anders = 0;
        for (let v = 0; v < haut.n; v++) if (skz.seite[v] !== sk0.seite[v] && kieferFeld(kopf, haut.pos[3 * v]!, haut.pos[3 * v + 1]!, REICH).gewicht > 0) anders++;
        console.log(`     gezogen: welcher Kiefer, an der verzogenen Form neu gelesen: an ${anders} Punkten anders als vor dem Zug`);
      }
      // Nach einem Zug räumt das Werk auf (verdichten samt Aufrichten) und rechnet noch einmal. Hier genauso; `ZUG_AUFRAEUMEN=0`: ohne.
      let hz2 = hz;
      let lz2 = lz;
      let nachText = '';
      if (process.env.ZUG_AUFRAEUMEN !== '0') {
        const v = nachVerdichten(hz, lz, mk);
        hz2 = v.h;
        lz2 = v.loops;
        const r2 = heute(hz2, lz2, pfade(lz2), 0, 300);
        legen(hz2, lz2);
        const sp2 = lippenSpalt(hz2, lz2);
        const gz2 = gefaltetWo(hz2, lz2, 'gezogen, aufgeräumt');
        const linie2 = sp2.linie === null ? 'nicht messbar' : sp2.linie.toExponential(1);
        nachText = `; aufgeräumt und noch einmal gerechnet: ${r2.runden} Runden${r2.steht ? '' : ' (steht nicht)'}, am Maul gefaltet ${gz2.amMaul}, Spalt an der Linie ${linie2}, am Netz höchstens ${sp2.netz.toFixed(3).replace('.', ',')}`;
        ok('Z5b nach dem Aufräumen ist am gezogenen Punkt nichts gefaltet', r2.steht && gz2.amMaul === 0 && sp2.linie !== null && sp2.linie < 1e-9, nachText.slice(2));
      }
      bilder.push(bildVon(`die geschlossene Linie ${ZUG} gezogen (zu)`, hz2, lz2, `beide Lippen bis ${z1(lippeMax)} mitgegangen`));
      const skz2 = kieferSeiten(hz2, lz2);
      const offen = oeffnenAnzeige(hz2, skz2.seite);
      const go = gefaltetWo(offen.zeig, lz2, 'gezogen, geöffnet (Anzeige)');
      console.log(`     gezogen, mit den Knochen geöffnet: ${offen.gespannt} Dreiecke spannen sich quer über das Maul, am Maul gefaltet ${go.amMaul}`);
      bilder.push(bildVon('gezogen, mit den Knochen geöffnet (Anzeige)', offen.zeig, lz2, `gespannt ${offen.gespannt}, am Maul gefaltet ${go.amMaul}`));
    } catch (e) {
      ok('Z5 die geschlossene Linie lässt sich als Ganzes ziehen', false, `hält nicht: ${(e as Error).message}`);
    }
  }
}
if (process.env.BLATT) {
  const mitte: [number, number, number] = [C.x - 0.5 * kopf.lang, C.y, 0];
  blattSchreiben(
    `${process.env.BLATT}.html`,
    REISS ? `Probe P2: das Maul ohne Spalt, die Lippen als Zwillinge, an „${NAME}“` : `Probe P1: das Maul aus einer Linie als echte Form, an „${NAME}“`,
    [
      {
        titel: REISS
          ? 'Abgezogen, dann der Spalt geschlossen: Gaumen und Boden liegen aufeinander, die Lippe ist ein zusammengeklappter Loop (Zwillinge). Zu gerechnet; geöffnet wird nur in der Anzeige.'
          : OBEN + UNTEN > 0 ? 'Längs der Maullinie abgezogen (die Tasche ist Haut der Form, die Lippe eine Linie mit Kante), dann mit den Kiefern geöffnet und gerechnet.' : 'Längs der Maullinie abgezogen: Die Tasche ist Haut der Form, die Lippe eine Linie mit Kante. Zu gerechnet; geöffnet wird nur in der Anzeige.',
        bilder,
        blicke: [
          ['Seite', 0, 0],
          ['schräg von vorn', Number(process.env.GIER ?? 55), Number(process.env.NEIGUNG ?? 10)],
        ],
        mass: 2.6 * kopf.lang,
        mitte,
      },
    ],
    1900,
    'Schwarz: Lippe und Rachenlinie (Kante an). Blau: die übrigen Linien, auch die im Maul. Alle Linien sind durch die Haut gezeichnet. Rot: umgestülpte Fläche (man sieht ihre Rückseite). Flach schattiert, damit jeder Knick zu sehen ist: ein Messbild, nicht der Look.',
  );
  console.log(`Blatt: ${process.env.BLATT}.html`);
}
// ---------- Kontrolle 3 (`KONTROLLE3=1`): die Form ohne Schnitt, aber mit einer harten Linie längs der Maullinie ----------
// Woher kommt der Rest außen am Unterkiefer? Hier gibt es kein Maul, keine Tasche und keine geschnittenen Linien: nur eine Linie quer
// über die Form (der Vorhang durch die Maullinie, hinter dem Mundwinkel gerade verlängert), die vom Mundwinkel nach vorn hart ist und
// dahinter weich. Bewegt sich die Haut des Unterkiefers hier genauso, kommt der Rest von der harten Kante.
if (process.env.KONTROLLE3) {
  try {
    const strich = P.map((q) => [q.x, q.y] as [number, number]).reverse();
    const l0 = loopAusVorhang(vorherBild.h, 'seite', strich, 2000, 0.6 * mk);
    if (!l0) throw new Error('der Vorhang ergab keinen Loop');
    const mit = [...loopsKopie(vorherBild.loops), l0];
    const r = loopEinsetzen(kopie(vorherBild.h), mit, mit.length - 1);
    if (!r) throw new Error('der Loop ließ sich nicht einsetzen');
    let h3 = r.haut;
    let l3 = r.loops;
    const nd = nadelnZusammenlegen(h3, l3, mk);
    if (nd) {
      h3 = nd.haut;
      l3 = nd.loops;
    }
    const neu = l3.find((l) => l.id === 2000)!;
    // die Stelle des Mundwinkels auf der neuen Linie, und die Spitze vorn (ihr Anfang oder ihr Ende liegt dort auf der Mittelebene)
    let jM = 0;
    for (let j = 1; j < neu.proben.length; j++) if (Math.hypot(neu.ruhe[3 * j]! - C.x, neu.ruhe[3 * j + 1]! - C.y) < Math.hypot(neu.ruhe[3 * jM]! - C.x, neu.ruhe[3 * jM + 1]! - C.y)) jM = j;
    const sM = neu.s[jM]!;
    const n3 = neu.proben.length;
    const vornAmAnfang = Math.hypot(neu.ruhe[0]! - vorn.x, neu.ruhe[1]! - vorn.y) < Math.hypot(neu.ruhe[3 * n3 - 3]! - vorn.x, neu.ruhe[3 * n3 - 2]! - vorn.y);
    griffeAnlegen(neu, neu.ruhe, true, PFAD_GENAU);
    const pM = punktEinfuegen(neu, sM, undefined, true);
    pM.ecke = false;
    // hart vom Mundwinkel nach vorn, weich dahinter (eine Kante an einem Punkt reicht bis zu seinen Nachbarpunkten)
    const hinter = vornAmAnfang ? Math.min(neu.laenge, sM + 2 * mk) : Math.max(0, sM - 2 * mk);
    punktEinfuegen(neu, hinter, undefined, true);
    neu.kante = false;
    for (const q of neu.punkte) q.kante = vornAmAnfang ? q.s <= sM + 1e-6 : q.s >= sM - 1e-6;
    const hartePunkte = neu.punkte.filter((q) => q.kante).length;
    for (const l of l3) l.ruhe = hautLagen(h3, l);
    const v1 = nachVerdichten(h3, l3, mk);
    const r1 = heute(v1.h, v1.loops, pfade(v1.loops), 20, 300);
    legen(v1.h, v1.loops);
    const v2 = nachVerdichten(v1.h, v1.loops, mk);
    const r2 = heute(v2.h, v2.loops, pfade(v2.loops), 0, 300);
    legen(v2.h, v2.loops);
    const P3 = punkte(v2.h);
    const d3 = flaechenAbstand(P3, punkte(vorher), flaechen(vorher), 30);
    // je Seite der Linie, vor dem Mundwinkel, im Bereich des Mauls (ohne die Linie selbst)
    const je: [number, number] = [0, 0];
    const jeUeber1: [number, number] = [0, 0];
    const jeBei: [number[], number[]] = [[0, 0, 0], [0, 0, 0]];
    let fern = 0;
    for (let i = 0; i < P3.length; i++) {
      const o = profil.naechster(P3[i]![0], P3[i]![1]);
      const rr = Math.hypot(P3[i]![0] - C.x, P3[i]![1] - C.y);
      if (rr > 2.5 * kopf.lang) fern = Math.max(fern, d3[i]!);
      if (o.hinten || rr > 1.3 * kopf.lang || Math.abs(o.d) < 1) continue;
      const k = o.d > 0 ? 0 : 1;
      if (d3[i]! > je[k]) {
        je[k] = d3[i]!;
        jeBei[k] = P3[i]!;
      }
      if (d3[i]! > 1) jeUeber1[k]++;
    }
    const [kO, kU] = obenLinks ? [0, 1] : [1, 0];
    console.log(
      `Kontrolle 3 (kein Schnitt, nur eine Linie längs der Maullinie, vom Mundwinkel nach vorn hart; ${neu.proben.length} Punkte des Netzes, ${neu.punkte.length} Punkte, davon ${hartePunkte} hart): ${r1.runden + r2.runden} Runden${r1.steht && r2.steht ? '' : ' (steht nicht)'}; außen neben der Form von vorher: Oberkiefer höchstens ${z2(je[kO]!)} (${jeUeber1[kO]} Punkte über 1), Unterkiefer höchstens ${z2(je[kU]!)} bei (${jeBei[kU]!.map((x) => z1(x)).join(' / ')}) (${jeUeber1[kU]} Punkte über 1); fern ${z2(fern)}`,
    );
    if (process.env.KONTROLLE3 === 'weich') console.log('     (KONTROLLE3=weich hat hier keine Wirkung: siehe KANTE3)');
  } catch (e) {
    console.log(`Kontrolle 3: ${(e as Error).message}`);
  }
}
// ---------- Kontrolle 2: dasselbe Aufräumen und Rechnen an der Form ohne Maul (so viel bewegt sich ohnehin) ----------
{
  const g = formLaden(NAME);
  let h2 = g.h;
  let l2 = g.loops;
  heute(h2, l2, pfade(l2), 0, 300);
  legen(h2, l2);
  const bezug = kopie(h2);
  const v1 = nachVerdichten(h2, l2, mk);
  h2 = v1.h;
  l2 = v1.loops;
  const r1 = heute(h2, l2, pfade(l2), 20, 300);
  legen(h2, l2);
  const v2 = nachVerdichten(h2, l2, mk);
  h2 = v2.h;
  l2 = v2.loops;
  const r2 = heute(h2, l2, pfade(l2), 0, 300);
  legen(h2, l2);
  const d = flaechenAbstand(punkte(h2), punkte(bezug), flaechen(bezug), 30);
  let max = 0;
  let fern = 0;
  for (let i = 0; i < h2.n; i++) {
    max = Math.max(max, d[i]!);
    if (Math.hypot(h2.pos[3 * i]! - C.x, h2.pos[3 * i + 1]! - C.y) > 2.5 * kopf.lang) fern = Math.max(fern, d[i]!);
  }
  console.log(`Kontrolle 2 (die Form ohne Maul, genauso aufgeräumt und gerechnet): ${r1.runden + r2.runden} Runden${r1.steht && r2.steht ? '' : ' (steht nicht)'}; danach liegt die Haut höchstens ${z2(max)} neben der Form (fern vom Maul ${z2(fern)}); umgeschlagen ${falten(h2).umgeklappt}`);
}
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
