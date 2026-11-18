// Plan „Objekte, Spiegel und Nähte“ (18.11.2026), Etappe 4, Beweis: Lassen sich zwei aufgeblasene Formen an ihrer Schnittkurve zu
// einer Haut verbinden, und ist die Naht danach eine Linie wie jede andere?
// Florian: „Wenn ich objekte verschmelzen möchte, dann sollte das über einen edgeloop passieren … dieser hilfs-edgeloop soll
// bedienbar sein und möglichst rund … Ich möchte auch objekte voneinander subtrahieren können, sodass eine saubere kante entsteht.“
//
// Zwei freie Kugeln mit je drei Linien: A (Halbmesser 150, im Ursprung) und B (Halbmesser 90, seitlich versetzt, auch quer zur
// Spiegelebene). Der Schnitt der beiden Netze kommt von der Bibliothek Manifold (`form-naht-teile.ts`).
//
// Stufe 1 (die Haut): Die verbundene Haut ist geschlossen, die Naht ist eine geschlossene Kette, nichts ist umgeschlagen, der
//   Rauminhalt stimmt (A + B − Überschneidung), die Punkte beider Formen außerhalb der anderen liegen genau, wo sie lagen.
// Stufe 2 (die Linien): steht in `form-naht-linien.ts` (wird hier aufgerufen, sobald Stufe 1 hält).
// Aufruf aus packages/shape: [BLATT=<pfad ohne Endung>] [ART=abziehen] npx vite-node ../../apps/editor/scripts/pruefen/form-naht.ts
import { spiegelAnwenden } from '../../../../packages/shape/src/dicht/frei';
import type { Haut } from '../../../../packages/shape/src/dicht/kurven';
import { dreiLoops, falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import {
  type Loop,
  LoopZug,
  eckenAuto,
  festlegen,
  griffeAnlegen,
  hatPfad,
  hautLagen,
  istEckeVonSelbst,
  kantenKnicken,
  mittlereKante,
  pfadAbweichung,
  pfadLagen,
  pfadParameter,
} from '../../../../packages/shape/src/dicht/loops';
import { nadelnZusammenlegen } from '../../../../packages/shape/src/dicht/verdichten';
import { flaechenAbstand } from './flaechenabstand';
import { type BlattBild, type BlattLinie, blattSchreiben } from './form-direkt-blatt';
import { nachVerdichten } from './form-direkt-faelle';
import { heute, kopie, loopsKopie, randKnick } from './form-donut-teile';
import { hautVersetzt, linienVerbinden, loopVersetzt, verbinden } from './form-naht-teile';

const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
let schlecht = 0;
const ok = (name: string, gut: boolean, text = ''): void => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const ART = process.env.ART === 'abziehen' ? 'abziehen' : 'vereinen';

/** eine freie Kugel mit drei Linien, in Ruhe gerechnet */
function freieKugel(): { h: Haut; loops: Loop[] } {
  const d = dreiLoops();
  for (const l of d.loops) griffeAnlegen(l, l.ruhe, true);
  const z = new LoopZug(d.h, d.loops, null, true, 'kurven', 'geometrie', {});
  const versch = d.loops.map((l) => Float64Array.from(pfadLagen(l) ?? l.ruhe, (x, k) => x - l.ruhe[k]!));
  for (let s = 1; s <= 4; s++) z.schritt(versch.map((v) => v.map((x) => (x * s) / 4)), 2);
  z.schritt(versch, 12);
  for (const l of d.loops) festlegen(d.h, l, !hatPfad(l));
  const f = spiegelAnwenden(d.h, d.loops, { naechsteId: 10, naechsteKreuzung: 100 });
  if ('fehler' in f) throw new Error(f.fehler);
  return { h: f.haut, loops: f.loops };
}

const A = freieKugel();
const B0 = freieKugel();
// B: kleiner, seitlich und quer zur Spiegelebene versetzt (die Formen überlappen sich um rund ein Drittel von B)
const K = 0.6;
const D = { x: 170, y: 50, z: 30 };
const hB = hautVersetzt(B0.h, K, D);
const loopsB = B0.loops.map((l) => loopVersetzt(l, K, D, 1000));

console.log(`A: ${A.h.n} Punkte, ${A.h.tri.length / 3} Dreiecke, Kante ${z1(mittlereKante(A.h))} · B: ${hB.n} Punkte, Kante ${z1(mittlereKante(hB))} · ${ART}`);
const r = await verbinden(A.h, hB, ART);
if ('fehler' in r) {
  console.log(`FEHL verbinden: ${r.fehler}`);
  process.exit(1);
}
const h = r.haut;
// ---------- Stufe 1 ----------
const neu = Array.from(r.quelle).filter((q) => q === 2).length;
const vonA = Array.from(r.quelle).filter((q) => q === 0).length;
const vonB = Array.from(r.quelle).filter((q) => q === 1).length;
ok('1a die Haut ist geschlossen, die Naht eine geschlossene Kette', r.naehte.length === 1 && r.naehte[0]!.length >= 8, `${h.n} Punkte (${vonA} von A, ${vonB} von B, ${neu} neu), ${h.tri.length / 3} Dreiecke; ${r.naehte.length} Naht mit ${r.naehte.map((k) => k.length).join(', ')} Punkten; ${Math.round(r.ms)} ms`);
// alle neuen Punkte liegen auf der Naht
const aufNaht = new Set(r.naehte.flat());
let neuDaneben = 0;
for (let v = 0; v < h.n; v++) if (r.quelle[v] === 2 && !aufNaht.has(v)) neuDaneben++;
ok('1b neu sind nur Punkte der Naht', neuDaneben === 0, `${neuDaneben} neue Punkte neben der Naht; ${[...aufNaht].filter((v) => r.quelle[v] !== 2).length} Punkte der Naht sind alte Punkte`);
// die Naht liegt auf beiden Kugeln (Abstand zu den Mitten)
let abwA = 0;
let abwB = 0;
for (const v of r.naehte[0] ?? []) {
  const p = [h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!];
  abwA = Math.max(abwA, Math.abs(Math.hypot(p[0]!, p[1]!, p[2]!) - 150));
  abwB = Math.max(abwB, Math.abs(Math.hypot(p[0]! - D.x, p[1]! - D.y, p[2]! - D.z) - 150 * K));
}
ok('1c die Naht liegt auf beiden Häuten', abwA < 4 && abwB < 4, `Abstand der Nahtpunkte von Kugel A höchstens ${z2(abwA)}, von Kugel B ${z2(abwB)} (die Kugeln sind in Ruhe um einige Einheiten uneben)`);
const fa = falten(h);
ok('1d nichts umgeschlagen', fa.umgeklappt === 0, `umgeschlagen ${fa.umgeklappt}, Knicke über 60° ${fa.ueber60} (an der Naht ist der Knick gewollt)`);
// Rauminhalt: zwei Kugeln, Abstand der Mitten d, die Linse dazwischen
{
  const d = Math.hypot(D.x, D.y, D.z);
  const R1 = 150;
  const R2 = 150 * K;
  const linse = (Math.PI * (R1 + R2 - d) ** 2 * (d * d + 2 * d * (R1 + R2) - 3 * (R1 - R2) ** 2)) / (12 * d);
  const soll = ART === 'vereinen' ? r.inhalt.a + r.inhalt.b - linse : r.inhalt.a - linse;
  ok('1e der Rauminhalt stimmt', Math.abs(r.inhalt.aus / soll - 1) < 0.02, `A ${Math.round(r.inhalt.a / 1000)} Tsd., B ${Math.round(r.inhalt.b / 1000)} Tsd., Linse (gerechnet für glatte Kugeln) ${Math.round(linse / 1000)} Tsd.; Ergebnis ${Math.round(r.inhalt.aus / 1000)} Tsd., erwartet ${Math.round(soll / 1000)} Tsd.`);
}
// kürzeste Kante an der Naht (schmale Dreiecke dort machen der Rechnung Mühe)
{
  let kurz = Infinity;
  let zahlKurz = 0;
  const mk = mittlereKante(h);
  for (const v of aufNaht)
    for (const u of h.nachbarn[v]!) {
      const dd = Math.hypot(h.pos[3 * v]! - h.pos[3 * u]!, h.pos[3 * v + 1]! - h.pos[3 * u + 1]!, h.pos[3 * v + 2]! - h.pos[3 * u + 2]!);
      kurz = Math.min(kurz, dd);
      if (dd < 0.05 * mk) zahlKurz++;
    }
  console.log(`     an der Naht: kürzeste Kante ${z2(kurz)} (mittlere Kante der Haut ${z1(mk)}), ${zahlKurz / 2} Kanten kürzer als ein Zwanzigstel`);
}

if (schlecht) {
  console.log(`${schlecht} nicht erfüllt (Stufe 1)`);
  process.exit(1);
}

// ---------- Stufe 2: die Linien ----------
const pfade = (ls: readonly Loop[]): Float64Array[] => ls.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));
const legen = (hh: Haut, ls: readonly Loop[]): void => {
  for (const l of ls) festlegen(hh, l, !hatPfad(l));
};
/** eine Linie zum Zeichnen: ihre Lage auf der Haut */
const linieBild = (hh: Haut, l: Loop): BlattLinie => ({ p: Array.from(hautLagen(hh, l)), zu: l.art !== 'ring', hart: l.kante ? 1 : 0 });
const punkteBild = (ls: readonly Loop[]): number[][] => ls.flatMap((l) => l.punkte.filter((p) => !p.vonSelbst).map((p) => [p.ref.x, p.ref.y, p.ref.z]));
const bilder: BlattBild[] = [];
const L2 = linienVerbinden(r, A.h, A.loops, hB, loopsB, { naechsteId: 1, naechsteKreuzung: 5000 });
if ('fehler' in L2) {
  console.log(`FEHL die Linien: ${L2.fehler}`);
  process.exit(1);
}
let haut = h;
let loops = L2.loops;
const mk = mittlereKante(haut);
const istNaht = (l: Loop): boolean => L2.naehte.includes(l.id);
// die Naht bekommt ihre Griffe aus ihrer Kette (Punkte dazu nur, wo ihr Pfad sonst weiter als ein Viertel einer Kante daneben läge)
for (const l of loops) if (istNaht(l)) griffeAnlegen(l, l.ruhe, true, 0.25 * mk);
eckenAuto(loops);
// jede Probe an ihre Stelle auf dem Pfad ihrer Linie
for (const l of loops) if (hatPfad(l)) pfadParameter(l);
const offen = loops.filter((l) => l.art === 'ring');
const naht0 = loops.find(istNaht)!;
ok(
  '2a die Linien: geschnittene enden an der Naht, die Naht hat dort Punkte',
  L2.geschnitten === 4 && offen.length === 4 && offen.every((l) => l.haengt?.[0] && l.haengt[1] && hatPfad(l)) && L2.kreuzungen === 8 && naht0.punkte.filter((p) => p.kreuzung !== undefined).length === 8 && hatPfad(naht0),
  `${loops.length} Linien: ${loops.filter((l) => l.art === 'paar' && !istNaht(l)).length} ungeschnitten, ${L2.geschnitten} geschnitten in ${offen.length} offene Stücke, ${L2.weg} ganz weg, 1 Naht mit ${naht0.punkte.length} Punkten (${L2.kreuzungen} Enden von Linien); neue Enden höchstens ${z2(L2.neben)} neben ihrem Punkt der Naht`,
);
const abw0 = Math.max(...loops.map((l) => pfadAbweichung(l)));
console.log(`     vor dem Rechnen: Linien höchstens ${z2(abw0)} neben ihren Pfaden (Naht ${z2(pfadAbweichung(naht0))})`);
bilder.push({ name: 'verbunden, Linien geschnitten (ungerechnet)', h: kopie(haut), loops: [], fertig: { linien: loops.map((l) => linieBild(haut, l)), punkte: punkteBild(loops) }, notiz: `${haut.n} Punkte; Naht: ${naht0.proben.length} Punkte des Netzes, ${naht0.punkte.length} Punkte der Linie` });

// das Netz an den Linien aufräumen (die Schnittkurve hinterlässt sehr kurze Kanten), dann rechnen
const knick0 = randKnick(haut, naht0.proben.map((p) => p.ecken[0]));
{
  const nd = nadelnZusammenlegen(haut, loops, mk);
  if (nd) {
    haut = nd.haut;
    loops = nd.loops;
  }
  const v = nachVerdichten(haut, loops, mk);
  haut = v.h;
  loops = v.loops;
}
const nahtJetzt = (): Loop => loops.find(istNaht)!;
let steht = true;
let runden = 0;
let wegMax = 0;
try {
  const r1 = heute(haut, loops, pfade(loops), 20, 300);
  legen(haut, loops);
  const v = nachVerdichten(haut, loops, mk);
  haut = v.h;
  loops = v.loops;
  const r2 = heute(haut, loops, pfade(loops), 0, 300);
  legen(haut, loops);
  steht = r1.steht && r2.steht;
  runden = r1.runden + r2.runden;
  wegMax = Math.max(r1.weg, r2.weg);
} catch (e) {
  ok('2b die Rechnung hält', false, (e as Error).message);
  process.exit(1);
}
const f2 = falten(haut);
const abw2 = Math.max(...loops.map((l) => pfadAbweichung(l)));
const knick2 = randKnick(haut, nahtJetzt().proben.map((p) => p.ecken[0]));
ok('2b die Rechnung kommt zur Ruhe, nichts schlägt um', steht && f2.umgeklappt === 0, `${runden} Runden${steht ? '' : ' (steht nicht)'}, die Haut ging dabei höchstens ${z2(wegMax)}; umgeschlagen ${f2.umgeklappt}; ${haut.n} Punkte, Naht mit ${nahtJetzt().proben.length} Punkten des Netzes`);
ok('2c die Linien liegen auf ihren Pfaden', abw2 <= 0.5, `höchstens ${z2(abw2)} daneben (Naht ${z2(pfadAbweichung(nahtJetzt()))})`);
console.log(`     Knick quer über die Naht (Kante an): im Mittel ${z1(knick2.mittel)}°, größter ${z1(knick2.max)}° (gleich nach dem Verbinden ${z1(knick0.mittel)}°)`);
bilder.push({ name: 'gerechnet: die Naht ist eine Kante', h: kopie(haut), loops: [], fertig: { linien: loops.map((l) => linieBild(haut, l)), punkte: punkteBild(loops) }, notiz: `${runden} Runden; Linien höchstens ${z2(abw2)} neben ihren Pfaden; Knick an der Naht im Mittel ${z1(knick2.mittel)}°` });

/** wie weit die Haut `hh` neben der Haut `vor` liegt: größter Abstand, und wie weit von der Naht (ihren Punkten in `vor`) entfernt sie noch mehr als `ab` daneben liegt */
function neben(hh: Haut, vor: Haut, nahtVor: readonly number[], ab: number): { max: number; breit: number; bewegt: number; fern: number } {
  const pk = (x: Haut): [number, number, number][] => Array.from({ length: x.n }, (_, i) => [x.pos[3 * i]!, x.pos[3 * i + 1]!, x.pos[3 * i + 2]!]);
  const P = pk(hh);
  const d = flaechenAbstand(P, pk(vor), Array.from({ length: vor.tri.length / 3 }, (_, t) => [vor.tri[3 * t]!, vor.tri[3 * t + 1]!, vor.tri[3 * t + 2]!]), 30);
  const N = nahtVor.map((v) => [vor.pos[3 * v]!, vor.pos[3 * v + 1]!, vor.pos[3 * v + 2]!]);
  let max = 0;
  let breit = 0;
  let bewegt = 0;
  let fern = 0;
  for (let i = 0; i < P.length; i++) {
    max = Math.max(max, d[i]!);
    let zurNaht = Infinity;
    for (const q of N) zurNaht = Math.min(zurNaht, Math.hypot(P[i]![0] - q[0]!, P[i]![1] - q[1]!, P[i]![2] - q[2]!));
    // (fern: weiter als 100 Einheiten von der Naht)
    if (zurNaht > 100) fern = Math.max(fern, d[i]!);
    if (d[i]! <= ab) continue;
    bewegt++;
    breit = Math.max(breit, zurNaht);
  }
  return { max, breit, bewegt, fern };
}

// ---------- Stufe 2d: die Naht ist eine Linie wie jede andere: ein Punkt der Naht gezogen, beide Formen folgen ----------
{
  const hz = kopie(haut);
  const lz = loopsKopie(loops);
  const naht = lz.find(istNaht)!;
  const nahtVor = naht.proben.map((p) => p.ecken[0]);
  // die Mitte der Naht und ihr Punkt, der am weitesten oben liegt: Er geht 20 Einheiten von der Mitte weg
  const c = { x: 0, y: 0, z: 0 };
  for (const p of naht.punkte) {
    c.x += p.ref.x / naht.punkte.length;
    c.y += p.ref.y / naht.punkte.length;
    c.z += p.ref.z / naht.punkte.length;
  }
  const wahl = naht.punkte.reduce((a, b) => (b.ref.y > a.ref.y ? b : a));
  const d = { x: wahl.ref.x - c.x, y: wahl.ref.y - c.y, z: wahl.ref.z - c.z };
  const dl = Math.hypot(d.x, d.y, d.z) || 1;
  const WEIT = 20;
  const ziel = { x: wahl.ref.x + (WEIT * d.x) / dl, y: wahl.ref.y + (WEIT * d.y) / dl, z: wahl.ref.z + (WEIT * d.z) / dl };
  const gezogen = lz.map((l) => l.punkte.map((p) => (p.kreuzung !== undefined && p.kreuzung === wahl.kreuzung ? ziel : p.ref)));
  const mit = lz.filter((l) => l.punkte.some((p) => p.kreuzung === wahl.kreuzung)).length;
  const lagen = lz.map((l, i) => pfadLagen(l, gezogen[i]) ?? Float64Array.from(l.ruhe));
  lz.forEach((l, i) =>
    l.punkte.forEach((p, j) => {
      p.cur = { ...gezogen[i]![j]! };
    }),
  );
  let text = '';
  let gut = false;
  try {
    const r1 = heute(hz, lz, lagen, 30, 300);
    legen(hz, lz);
    const fz2 = falten(hz);
    const nb = neben(hz, haut, nahtVor, 0.5);
    const abw = Math.max(...lz.map((l) => pfadAbweichung(l)));
    gut = r1.steht && fz2.umgeklappt === 0 && nb.max > 0.5 * WEIT && abw <= 0.5;
    text = `der Punkt der Naht (er gehört ${mit} Linien) geht ${WEIT} von ihrer Mitte weg: ${r1.runden} Runden${r1.steht ? '' : ' (steht nicht)'}; die Haut folgt bis ${z1(nb.max)}, weiter als 100 Einheiten von der Naht bis ${z1(nb.fern)}; umgeschlagen ${fz2.umgeklappt}; Linien höchstens ${z2(abw)} neben ihren Pfaden`;
  } catch (e) {
    text = `hält nicht: ${(e as Error).message}`;
  }
  ok('2d ein Punkt der Naht gezogen: Beide Formen folgen, nichts schlägt um', gut, text);
  bilder.push({ name: 'ein Punkt der Naht gezogen (Kante an)', h: hz, loops: [], fertig: { linien: lz.map((l) => linieBild(hz, l)), punkte: punkteBild(lz) }, notiz: text });
}

// ---------- Stufe 3: K an der Naht (Kante aus) ----------
{
  const hautKante = kopie(haut);
  const nahtKante = nahtJetzt().proben.map((p) => p.ecken[0]);
  const vorher = new Set(loops.flatMap((l) => l.punkte.filter(istEckeVonSelbst)));
  const naht = nahtJetzt();
  naht.kante = false;
  for (const p of naht.punkte) delete p.kante;
  eckenAuto(loops);
  let text = '';
  let gut = false;
  let knick3 = { mittel: NaN, max: NaN, kanten: 0 };
  try {
    const versch = kantenKnicken(loops, vorher);
    let weit = 0;
    for (const d of versch) if (d) for (let j = 0; j < d.length; j += 3) weit = Math.max(weit, Math.hypot(d[j]!, d[j + 1]!, d[j + 2]!));
    const r1 = heute(haut, loops, pfade(loops), 30, 300);
    legen(haut, loops);
    const v = nachVerdichten(haut, loops, mk);
    haut = v.h;
    loops = v.loops;
    const r2 = heute(haut, loops, pfade(loops), 0, 300);
    legen(haut, loops);
    const f3 = falten(haut);
    knick3 = randKnick(haut, nahtJetzt().proben.map((p) => p.ecken[0]));
    const abw3 = Math.max(...loops.map((l) => pfadAbweichung(l)));
    gut = r1.steht && r2.steht && f3.umgeklappt === 0 && knick3.mittel < 0.5 * knick2.mittel && abw3 <= 0.5;
    const nb = neben(haut, hautKante, nahtKante, 0.5);
    text = `${vorher.size} Ecken von selbst, Linien gehen dafür bis ${z1(weit)}; ${r1.runden + r2.runden} Runden${r1.steht && r2.steht ? '' : ' (steht nicht)'}; umgeschlagen ${f3.umgeklappt}; Knick quer über die Naht im Mittel ${z1(knick3.mittel)}° (mit Kante ${z1(knick2.mittel)}°), größter ${z1(knick3.max)}°; Linien höchstens ${z2(abw3)} neben ihren Pfaden. Die Rundung: Die Haut liegt bis ${z1(nb.max)} neben der kantigen; weiter als 100 Einheiten von der Naht noch bis ${z1(nb.fern)}; mehr als 0,5 daneben liegen ${nb.bewegt} von ${haut.n} Punkten`;
  } catch (e) {
    text = `hält nicht: ${(e as Error).message}`;
  }
  ok('3 K an der Naht: Der Knick sinkt unter die Hälfte, die Rechnung hält', gut, text);
  bilder.push({ name: 'K an der Naht (Kante aus): rund', h: kopie(haut), loops: [], fertig: { linien: loopsKopie(loops).map((l) => linieBild(haut, l)), punkte: punkteBild(loops) }, notiz: text });
}

if (process.env.BLATT) {
  const naht: BlattLinie[] = r.naehte.map((k) => ({ p: k.flatMap((v) => [h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!]), zu: true, hart: 1 }));
  blattSchreiben(
    `${process.env.BLATT}.html`,
    `Naht zwischen zwei Formen, Stufe 1 (${ART === 'vereinen' ? 'verschmelzen' : 'abziehen'}): die verbundene Haut`,
    [
      {
        titel: 'Zwei Kugeln, an ihrer Schnittkurve verbunden. Schwarz: die Naht (eine geschlossene Kette von Punkten des Netzes).',
        bilder: [{ name: 'verbunden, ungerechnet', h, loops: [], fertig: { linien: naht, punkte: [] }, notiz: `${h.n} Punkte, Naht mit ${r.naehte[0]?.length ?? 0} Punkten` }],
        blicke: [
          ['Seite', 0, 0],
          ['von oben', 0, 90],
          ['schräg', -35, 25],
        ],
        mitte: [60, 20, 10],
        mass: 520,
      },
      {
        titel: 'Mit den Linien beider Formen. Blau: Linien, schwarz: Kante an. Die geschnittenen Linien enden an der Naht (Punkte dort).',
        bilder,
        blicke: [
          ['schräg', -35, 25, 0.9],
          ['auf die Naht', -75, 10, 0.9],
        ],
        mitte: [110, 30, 20],
        mass: 330,
      },
    ],
    Number(process.env.BREITE ?? 2000),
    'Flach schattiert, damit jeder Knick zu sehen ist (das übertreibt jede Unruhe). Rot: umgestülpte Fläche.',
  );
  console.log(`Blatt: ${process.env.BLATT}.html`);
}
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
process.exit(schlecht ? 1 : 0);
