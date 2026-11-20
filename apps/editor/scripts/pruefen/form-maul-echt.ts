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
// dem Schnitt statt aus den Linien, zum Vergleich), `DIAG=1` (alle Linien vor und nach dem Abziehen), `PFAD` (Genauigkeit der
// Pfade), `GIER`, `NEIGUNG` (zweiter Blick des Blatts).
import { kantenTeilenMit } from '../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, festlegen, griffeAnlegen, hatPfad, hautLagen, mittlereKante, pfadAbweichung, pfadLagen, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';
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
  if (pfadAbweichung(l) <= PFAD_GENAU && !(lippe && OBEN + UNTEN > 0)) continue;
  const vor = l.punkte.length;
  griffeAnlegen(l, l.ruhe, true, PFAD_GENAU);
  neuAngelegt++;
  punkteDazu += l.punkte.length - vor;
}
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
const aufgeraeumt = kopie(haut);
console.log(`aufgeräumt: ${haut.n} Punkte, umgeschlagen ${fAuf.umgeklappt}`);
let steht = false;
let runden = 0;
let wegMax = 0;
let fehler = '';
try {
  const r1 = heute(haut, loops, pfade(loops), 20, 300);
  legen(haut, loops);
  if (AUFRAEUMEN) {
    const v = nachVerdichten(haut, loops, mk);
    haut = v.h;
    loops = v.loops;
  }
  const r2 = heute(haut, loops, pfade(loops), 0, 300);
  legen(haut, loops);
  steht = r1.steht && r2.steht;
  runden = r1.runden + r2.runden;
  wegMax = Math.max(r1.weg, r2.weg);
} catch (e) {
  fehler = (e as Error).message;
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

/**
 * Welcher Kiefer: je Punkt die Seite der Maullinie (+1 links, −1 rechts), aus den Linien des Mauls gelesen statt aus der Lage.
 * (Zu liegen die Wände nur um den Spalt auseinander; nach dem Rechnen steht ein Punkt des Bodens leicht auf der Seite des Gaumens,
 * und die Lage ordnet ihn dem falschen Kiefer zu.) Die Lippe teilt sich am Mundwinkel in ihre zwei Lippen. In der Tasche gehört zu
 * einer Lippe, was von ihr aus zu erreichen ist, ohne die Rachenlinie zu überschreiten. Außen gilt dicht an der Linie die Lippe,
 * von der aus der Punkt über die Kanten des Netzes zuerst erreicht wird, sonst die Lage (dort ist sie eindeutig).
 */
function kieferSeiten(hh: Haut, ls: readonly Loop[]): { seite: Int8Array; aussen: Uint8Array; tasche: [number, number]; getrennt: boolean } {
  const BAND = 3;
  const lage = (v: number): { s: number; d: number; hinten: boolean } => profil.naechster(hh.pos[3 * v]!, hh.pos[3 * v + 1]!);
  const beiC = (v: number): number => Math.hypot(hh.pos[3 * v]! - C.x, hh.pos[3 * v + 1]! - C.y);
  const paar = (v: number): number[] => (hh.spiegel[v]! >= 0 && hh.spiegel[v] !== v ? [v, hh.spiegel[v]!] : [v]);
  const seite = new Int8Array(hh.n);
  const fest = new Uint8Array(hh.n); // 1 Lippe, 2 Rachenlinie
  const quellen: [number[], number[]] = [[], []];
  for (const l of ls.filter(istLippe)) {
    const kette = l.proben.map((p) => p.ecken[0]!);
    let jM = 0;
    kette.forEach((v, j) => {
      if (beiC(v) < beiC(kette[jM]!)) jM = j;
    });
    for (const teil of [kette.slice(0, jM), kette.slice(jM + 1)]) {
      if (!teil.length) continue;
      const s = teil.reduce((a, v) => a + lage(v).d, 0) >= 0 ? 1 : -1;
      for (const v of teil)
        for (const w of paar(v)) {
          seite[w] = s;
          fest[w] = 1;
          quellen[s > 0 ? 0 : 1].push(w);
        }
    }
    for (const w of paar(kette[jM]!)) fest[w] = 1;
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
  // außen, dicht an der Linie: Schicht um Schicht von beiden Lippen aus
  let rand = [...quellen[0], ...quellen[1]];
  const erreicht = new Uint8Array(hh.n);
  for (const q of rand) erreicht[q] = 1;
  while (rand.length) {
    const weiter: number[] = [];
    for (const v of rand)
      for (const u of hh.nachbarn[v]!) {
        if (erreicht[u] || fest[u] !== 0 || !aussen[u]) continue;
        const o = lage(u);
        if (o.hinten || Math.abs(o.d) > BAND) continue;
        erreicht[u] = 1;
        seite[u] = seite[v]!;
        weiter.push(u);
      }
    rand = weiter;
  }
  for (let v = 0; v < hh.n; v++) if (seite[v] === 0) seite[v] = lage(v).d >= 0 ? 1 : -1;
  return { seite, aussen, tasche, getrennt };
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
  for (let v = 0; v < haut.n; v++) {
    if (!aussen[v]) continue;
    aussenZahl++;
    if (d[v]! > 1) ueber1++;
    if (d[v]! > aussenMax) {
      aussenMax = d[v]!;
      aussenBei = Pz[v]!;
    }
  }
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
  bilder.push(bildVon('mit Maul, zu gerechnet', haut, loops, `${runden} Runden${steht ? '' : ', steht nicht'}; umgeschlagen ${fEnde.umgeklappt}`));
  const zeig = kopie(haut);
  const zl = loopsKopie(loops);
  const g = (x: string | undefined, d: number): number => (Number(x ?? d) * Math.PI) / 180;
  const [zo, zu] = [g(process.env.ZEIG_OBEN, 8), g(process.env.ZEIG_UNTEN, 22)];
  // welcher Kiefer: aus den Linien des Mauls (Lippe, Rachenlinie); `SEITE=lage` nimmt wie zuerst die Lage, `SEITE=schnitt` die
  // Seite gleich nach dem Abziehen (nur solange das Netz dasselbe ist)
  const sk = kieferSeiten(haut, loops);
  const gleichesNetz = zeig.n === seiteZu.length;
  if (gleichesNetz) {
    // Gegenprobe: Stimmt die Zuordnung aus den Linien mit der vom Schnitt überein? (gezählt, wo ein Kiefer überhaupt dreht)
    let anders = 0;
    let gezaehlt = 0;
    for (let v = 0; v < zeig.n; v++) {
      if (kieferFeld(kopf, zuHaut.pos[3 * v]!, zuHaut.pos[3 * v + 1]!, REICH).gewicht <= 0) continue;
      if (Math.abs(profil.naechster(zuHaut.pos[3 * v]!, zuHaut.pos[3 * v + 1]!).d) < 1e-6) continue;
      gezaehlt++;
      if (sk.seite[v] !== seiteZu[v]) anders++;
    }
    console.log(`     welcher Kiefer, aus den Linien gelesen (Tasche: ${sk.tasche[0]} Punkte links, ${sk.tasche[1]} rechts${sk.getrennt ? '' : ', nicht getrennt'}): an ${anders} von ${gezaehlt} Punkten anders als gleich nach dem Schnitt`);
  } else console.log(`     welcher Kiefer, aus den Linien gelesen (Tasche: ${sk.tasche[0]} Punkte links, ${sk.tasche[1]} rechts${sk.getrennt ? '' : ', nicht getrennt'})`);
  for (let v = 0; v < zeig.n; v++) {
    const f = kieferFeld(kopf, zeig.pos[3 * v]!, zeig.pos[3 * v + 1]!, REICH);
    const seite = process.env.SEITE === 'lage' ? f.seite : process.env.SEITE === 'schnitt' && gleichesNetz ? seiteZu[v]! : sk.seite[v]!;
    const a = (seite > 0 ? (obenLinks ? zo : zu) : -(obenLinks ? zu : zo)) * f.gewicht;
    if (a !== 0) [zeig.pos[3 * v], zeig.pos[3 * v + 1]] = drehen(zeig.pos[3 * v]!, zeig.pos[3 * v + 1]!, a);
  }
  const fz = falten(zeig);
  // Dreiecke, die sich beim Öffnen quer über das Maul spannen (eine Kante wird mehr als doppelt so lang): Dort hängen die zwei Wände zusammen
  let gespannt = 0;
  const kante = (hh: Haut, a: number, b: number): number => Math.hypot(hh.pos[3 * a]! - hh.pos[3 * b]!, hh.pos[3 * a + 1]! - hh.pos[3 * b + 1]!, hh.pos[3 * a + 2]! - hh.pos[3 * b + 2]!);
  for (let t = 0; t < haut.tri.length; t += 3) {
    const [a, b, c] = [haut.tri[t]!, haut.tri[t + 1]!, haut.tri[t + 2]!];
    const vorK = Math.max(kante(haut, a, b), kante(haut, b, c), kante(haut, c, a));
    const nachK = Math.max(kante(zeig, a, b), kante(zeig, b, c), kante(zeig, c, a));
    if (nachK > 2 * vorK + 1) gespannt++;
  }
  console.log(`     mit den Knochen geöffnet (nur Anzeige, oben ${z1((zo * 180) / Math.PI)}°, unten ${z1((zu * 180) / Math.PI)}°): umgeschlagen ${fz.umgeklappt}; ${gespannt} Dreiecke spannen sich quer über das Maul${AUFRAEUMEN ? '' : ' (ohne Aufräumen)'}`);
  umgeschlageneWo(zeig, 'geöffnet (Anzeige)');
  bilder.push(bildVon('mit den Knochen geöffnet (Anzeige)', zeig, zl, `umgeschlagen ${fz.umgeklappt}`));
}
void aufgeraeumt;

// ---------- Zusatz (nur zu gerechnet): Ein Punkt der Unterlippe wird gezogen. Folgt der Unterkiefer, bleibt die Oberlippe? ----------
const ZUG = Number(process.env.ZUG ?? 15);
if (OBEN + UNTEN === 0 && ZUG > 0 && steht) {
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
if (process.env.BLATT) {
  const mitte: [number, number, number] = [C.x - 0.5 * kopf.lang, C.y, 0];
  blattSchreiben(
    `${process.env.BLATT}.html`,
    `Probe P1: das Maul aus einer Linie als echte Form, an „${NAME}“`,
    [
      {
        titel: OBEN + UNTEN > 0 ? 'Längs der Maullinie abgezogen (die Tasche ist Haut der Form, die Lippe eine Linie mit Kante), dann mit den Kiefern geöffnet und gerechnet.' : 'Längs der Maullinie abgezogen: Die Tasche ist Haut der Form, die Lippe eine Linie mit Kante. Zu gerechnet; geöffnet wird nur in der Anzeige.',
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
