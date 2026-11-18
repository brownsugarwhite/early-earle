// E2 im Plan „Ozzy stabil und schnell“ (18.11.2026), der Beweis im Kern: Rechnet der Löser neben dem Bild (seine Runden laufen in
// ihrem eigenen Takt, das Bild holt die jeweils neueste Haut), bekommt er die Ziele nicht mehr einmal je Runde, sondern wann sie
// kommen: mal mehrere Runden zum selben Ziel, mal überspringt er Ziele. Kommt am Ende dieselbe Form heraus?
// Derselbe Zug (der höchste sichtbare Punkt um ZUG, in SCHRITTE Zeigerschritten), auf verschiedene Arten gerechnet:
//   Bildtakt        wie heute: je Zeigerschritt eine Runde
//   Löser schneller je Zeigerschritt zwei Runden (ein kleines Netz, ein Bildschirm mit 60 Hz)
//   Löser langsamer nur zu jedem zweiten, vierten, achten Zeigerschritt eine Runde (ein großes Netz: Der Löser überspringt Ziele)
//   unregelmäßig    mal keine, mal eine, mal drei Runden je Zeigerschritt (fester Zufall)
// Danach bei allen: Runden zum letzten Ziel, bis die Form steht (wie der Nachlauf im Fenster). Kriterium (Plan): Die Häute liegen
// höchstens 0,1 Einheiten neben der vom Bildtakt.
// Dazu gemessen: wie weit die Haut während des Zugs hinter dem Bildtakt herläuft (größter Abstand unterwegs): das ist, was man bei
// einem langsamen Löser sieht.
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-neben-dem-bild.ts
//   NAME="strange bird,teat firefish,maul handgemacht test"   ZUG="0,40,0"   SCHRITTE=45   FEST=150
import type { Haut } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, LoopZug, istSichtbar, pfadLagen } from '../../../../packages/shape/src/dicht/loops';
import { hautNormalen } from '../../../../packages/shape/src/dicht/kurven';
import { formLaden } from './form-direkt-faelle';

const NAMEN = (process.env.NAME ?? 'strange bird,teat firefish,maul handgemacht test').split(',');
const [zx, zy, zz] = (process.env.ZUG ?? '0,40,0').split(',').map(Number) as [number, number, number];
const SCHRITTE = Number(process.env.SCHRITTE ?? 45);
// FEST=150: der Nachlauf mit genau so vielen Runden (ohne vorher aufzuhören): trennt, was am Takt liegt, von dem, was an einer
// Form liegt, die noch langsam nachkriecht (dann hängt das Ende daran, wie viele Runden insgesamt liefen)
const FEST = Number(process.env.FEST ?? 0);
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const z3 = (x: number): string => x.toFixed(3).replace('.', ',');

/** Runden je Zeigerschritt: wie viele Runden der Löser nach dem Zeigerschritt k rechnet (er sieht dabei das Ziel von k) */
type Takt = (k: number) => number;

function lauf(h0: Haut, loops0: readonly Loop[], takt: Takt, spur?: Float64Array[]): { pos: Float64Array; runden: number; ruheRunden: number; unterwegs: Float64Array[] } {
  const h: Haut = { ...h0, pos: Float64Array.from(h0.pos) };
  const loops: Loop[] = loops0.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));
  let wahl: { li: number; i: number; y: number; kreuzung: number | undefined } | null = null;
  loops.forEach((l, li) =>
    l.punkte.forEach((p, i) => {
      if (istSichtbar(p) && (!wahl || p.ref.y > wahl.y)) wahl = { li, i, y: p.ref.y, kreuzung: p.kreuzung };
    }),
  );
  const w = wahl!;
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { halb: true });
  const ziel = loops.map((l) => {
    const P = l.punkte.map((p) => (p === loops[w.li]!.punkte[w.i] || (w.kreuzung !== undefined && p.kreuzung === w.kreuzung) ? { x: p.ref.x + zx, y: p.ref.y + zy, z: p.ref.z + zz } : p.ref));
    return pfadLagen(l, P) ?? Float64Array.from(l.ruhe);
  });
  const versch = loops.map((l, i) => Float64Array.from(ziel[i]!, (x, k) => x - l.ruhe[k]!));
  let runden = 0;
  const unterwegs: Float64Array[] = [];
  for (let k = 1; k <= SCHRITTE; k++) {
    const jetzt = versch.map((d) => d.map((x) => (x * k) / SCHRITTE));
    const n = takt(k);
    if (n > 0) z.schritt(jetzt, n);
    runden += n;
    unterwegs.push(Float64Array.from(h.pos));
    if (spur) spur.push(Float64Array.from(h.pos));
  }
  // der Nachlauf: zum letzten Ziel, bis die Form steht (Bewegung längs der Normalen unter 0,02 je Runde, höchstens 80 Runden)
  let ruheRunden = 0;
  const vor = new Float64Array(h.pos.length);
  for (; ruheRunden < (FEST || 80); ) {
    vor.set(h.pos);
    const N = hautNormalen(h);
    z.schritt(versch, 1);
    ruheRunden++;
    let weg = 0;
    for (let i = 0; i < vor.length; i += 3) weg = Math.max(weg, Math.abs((h.pos[i]! - vor[i]!) * N[i]! + (h.pos[i + 1]! - vor[i + 1]!) * N[i + 1]! + (h.pos[i + 2]! - vor[i + 2]!) * N[i + 2]!));
    if (!FEST && weg < 0.02) break;
  }
  return { pos: h.pos, runden, ruheRunden, unterwegs };
}

const weit = (A: Float64Array, B: Float64Array): number => {
  let m = 0;
  for (let i = 0; i < A.length; i += 3) m = Math.max(m, Math.hypot(A[i]! - B[i]!, A[i + 1]! - B[i + 1]!, A[i + 2]! - B[i + 2]!));
  return m;
};
// fester Zufall für „unregelmäßig“
const zufall = ((s) => () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296))(7);
const muster = Array.from({ length: 400 }, () => [0, 1, 1, 3, 0, 2][Math.floor(zufall() * 6)]!);

const arten: [string, Takt][] = [
  ['Löser schneller (zwei Runden je Zeigerschritt)', () => 2],
  ['Löser langsamer (eine Runde je zwei Zeigerschritte)', (k) => (k % 2 === 0 ? 1 : 0)],
  ['Löser langsamer (eine Runde je vier Zeigerschritte)', (k) => (k % 4 === 0 ? 1 : 0)],
  ['Löser langsamer (eine Runde je acht Zeigerschritte)', (k) => (k % 8 === 0 ? 1 : 0)],
  ['unregelmäßig (0 bis 3 Runden je Zeigerschritt)', (k) => muster[k]!],
];

let schlecht = 0;
for (const name of NAMEN) {
  const { h, loops } = formLaden(name);
  const bild = lauf(h, loops, () => 1);
  console.log(`${name}: ${h.n} Punkte; Zug (${zx}, ${zy}, ${zz}) in ${SCHRITTE} Zeigerschritten; im Bildtakt ${bild.runden} Runden, dann ${bild.ruheRunden} bis zur Ruhe`);
  for (const [wort, takt] of arten) {
    const r = lauf(h, loops, takt);
    const ende = weit(bild.pos, r.pos);
    let hinterher = 0;
    for (let k = 0; k < SCHRITTE; k++) hinterher = Math.max(hinterher, weit(bild.unterwegs[k]!, r.unterwegs[k]!));
    const gut = ende <= 0.1;
    if (!gut) schlecht++;
    console.log(`   ${gut ? 'gut ' : 'FEHL'} ${wort}: ${r.runden} Runden im Zug, ${r.ruheRunden} bis zur Ruhe; am Ende höchstens ${z3(ende)} neben dem Bildtakt; unterwegs bis ${z2(hinterher)} dahinter oder davor`);
  }
}
console.log(schlecht ? `${schlecht} Fälle über 0,1 Einheiten` : 'alle Fälle halten');
