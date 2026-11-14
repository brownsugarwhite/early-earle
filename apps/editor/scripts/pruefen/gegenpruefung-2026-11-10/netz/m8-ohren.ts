// G5 (10.11.2026 nachts): Woher kommen die flachen Dreiecke längs der Linien (drei aufeinanderfolgende Punkte einer Linie als
// Dreieck, der mittlere mit drei bis fünf Nachbarn)? Der Ablauf der Probewesen im Kern nachgestellt, ohne Fenster:
//   Kugel, drei Loops → Hals (obere Kreuzung 160 hinauf) → aufräumen → ein Ring um den Hals → Kopf (sein vorderer Punkt 70 nach
//   vorn) → aufräumen.
// Nach jedem Schritt die spitzen Dreiecke nach Art; bei jedem Aufräumen dasselbe Netz mit einzelnen Teilen des Verdichtens
// (nur teilen und zusammenlegen / dazu drehen / dazu entspannen): In welchem Teil entstehen sie?
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/netz/m8-ohren.ts
//   DREIECKE=6000|30000   GEWICHTE=geometrie|gleich
import { loopEinsetzen } from '../../../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, type V3, hautAus } from '../../../../../../packages/shape/src/dicht/kurven';
import {
  type Loop,
  LoopZug,
  festlegen,
  griffeAnlegen,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  verschiebungLaengs,
} from '../../../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../../../packages/shape/src/dicht/rund';
import { nadelnZusammenlegen, verdichten } from '../../../../../../packages/shape/src/dicht/verdichten';

const gewichte = (process.env.GEWICHTE ?? 'geometrie') as 'gleich' | 'geometrie';
/** NADELN=1: gleich nach dem Einsetzen eines Loops fallen die Nadeln zusammen; OHNE_SCHUTZ=1: der ganze Ablauf wie bis zum 10.11. */
const NADELN = process.env.NADELN === '1';
const SCHUTZ = process.env.OHNE_SCHUTZ !== '1';
type Opt = NonNullable<Parameters<typeof verdichten>[3]>;

export function zaehlen(h: Haut, loops: readonly Loop[], MK: number): { text: string; flach: number; nadel: number; nb3: number; unter5: number } {
  const P = h.pos;
  const T = h.tri;
  const kette = new Uint8Array(h.n);
  for (const l of loops)
    for (const p of l.proben) {
      kette[p.ecken[0]] = 1;
      const s = h.spiegel[p.ecken[0]]!;
      if (s >= 0) kette[s] = 1;
    }
  const L = (a: number, b: number) => Math.hypot(P[3 * a]! - P[3 * b]!, P[3 * a + 1]! - P[3 * b + 1]!, P[3 * a + 2]! - P[3 * b + 2]!);
  let flach = 0;
  let nadel = 0;
  let an = 0;
  let frei = 0;
  let u1 = 0;
  let u5 = 0;
  for (let t = 0; t < T.length / 3; t++) {
    const e = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    const l = [L(e[1]!, e[2]!), L(e[2]!, e[0]!), L(e[0]!, e[1]!)];
    let wmin = 180;
    for (let k = 0; k < 3; k++) {
      const a = l[k]!;
      const b = l[(k + 1) % 3]!;
      const c = l[(k + 2) % 3]!;
      wmin = Math.min(wmin, (Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / Math.max(1e-30, 2 * b * c)))) * 180) / Math.PI);
    }
    if (wmin < 1) u1++;
    if (wmin >= 5) continue;
    u5++;
    const k = e.filter((v) => kette[v]).length;
    const kurz = Math.min(...l) < 0.11 * MK;
    if (!kurz && k === 3) flach++;
    else if (kurz && k >= 2) nadel++;
    else if (k >= 1) an++;
    else frei++;
  }
  const nb3 = h.nachbarn.filter((x) => x.length <= 3).length;
  return {
    text: `${h.n} Punkte · unter 1°: ${u1}, unter 5°: ${u5} (flach längs Linie ${flach}, Nadel ${nadel}, sonst an Linie ${an}, frei ${frei}) · ≤ 3 Nachbarn: ${nb3}`,
    flach,
    nadel,
    nb3,
    unter5: u5,
  };
}

const kugel = () => {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: Number(process.env.DREIECKE ?? 6000) },
  );
  return hautAus(n.positionen, n.indizes);
};
let h = kugel();
const MK = mittlereKante(h);
let loops: Loop[] = [];
let naechsteKreuzung = 1;
/** einen Loop schneiden und einsetzen, Kreuzungen mit den vorhandenen als Punkte, Griffe anlegen */
function schneiden(a: 'seite' | 'top', A: [number, number], B: [number, number]): void {
  const l = loopAusSchnitt(h, a, A, B, loops.length + 1, 8);
  if (!l) throw new Error('kein Loop');
  loops.push(l);
  const r = loopEinsetzen(h, loops, loops.length - 1);
  if (!r) throw new Error('nicht eingesetzt');
  h = r.haut;
  loops = r.loops;
  const neu = loops[loops.length - 1]!;
  const tol = 0.25 * MK;
  for (let i = 0; i < loops.length - 1; i++)
    for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, neu, neu.ruhe, tol)) {
      punktEinfuegen(loops[i]!, f.sa, naechsteKreuzung);
      punktEinfuegen(neu, f.sb, naechsteKreuzung);
      naechsteKreuzung++;
    }
  griffeAnlegen(neu);
  if (NADELN) {
    const v = nadelnZusammenlegen(h, loops, MK);
    if (v) {
      h = v.haut;
      loops = v.loops;
    }
  }
}
const punktZug = (l: Loop, i: number, D: V3): Float64Array => {
  const d = verschiebungLaengs(
    l,
    l.punkte.map((_, k) => (k === i ? D : { x: 0, y: 0, z: 0 })),
  );
  if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
  return d;
};
/** einen Punkt (über seine Kreuzung auf allen Loops) in `schritte` Schritten um D ziehen, eine Runde je Schritt, danach bis 60 Runden */
function ziehen(wer: (l: Loop) => number, D: V3, schritte: number): void {
  const z = new LoopZug(h, loops, null, true, 'kurven', gewichte);
  const ziel = (anteil: number) =>
    loops.map((l) => {
      const i = wer(l);
      return i < 0 ? null : punktZug(l, i, { x: D.x * anteil, y: D.y * anteil, z: D.z * anteil });
    });
  let d = ziel(0);
  for (let k = 1; k <= schritte; k++) {
    d = ziel(k / schritte);
    z.schritt(d, 1);
  }
  z.schritt(d, 30);
  for (const l of loops) festlegen(h, l);
}
const setzen = (hh: Haut, ll: Loop[], n: number) => {
  new LoopZug(hh, ll, null, true, 'kurven', gewichte).schritt(
    ll.map(() => null),
    n,
  );
  for (const l of ll) festlegen(hh, l);
};
/** wie der Auftrag nach dem Loslassen: verdichten, setzen, bis zu dreimal nachverfeinern; davor dasselbe Netz mit einzelnen Teilen */
function aufraeumen(name: string): void {
  const kopie = (): { hh: Haut; ll: Loop[] } => ({
    hh: { ...h, pos: Float64Array.from(h.pos) },
    ll: loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p })) })),
  });
  const voll: Opt = { kurz: 0.5 * MK, genau: MK / 40, flachSchutz: SCHUTZ };
  console.log(`  ${name}, einzelne Teile des Verdichtens auf demselben Netz:`);
  for (const [teil, o] of [
    ['nur teilen', { genau: MK / 40, drehen: false, entspannen: false }],
    ['teilen + zusammenlegen', { ...voll, drehen: false, entspannen: false }],
    ['teilen + zusammenlegen + drehen', { ...voll, entspannen: false }],
    ['alles (wie im Fenster)', voll],
    ['alles, ohne Schutz (wie bis 10.11.)', { ...voll, flachSchutz: false }],
  ] as [string, Opt][]) {
    const { hh, ll } = kopie();
    const v = verdichten(hh, ll, 1.75 * MK, o);
    console.log(`    ${teil.padEnd(36)} ${v ? `${zaehlen(v.haut, v.loops, MK).text} · neu ${v.neu}, gelegt ${v.gelegt}, gedreht ${v.gedreht}, aufgelöst ${v.geloest}` : 'nichts zu tun'}`);
  }
  const v = verdichten(h, loops, 1.75 * MK, voll);
  if (v) {
    h = v.haut;
    loops = v.loops;
    setzen(h, loops, 12);
  }
  for (let k = 1; k <= 3; k++) {
    const w = verdichten(h, loops, 1.75 * MK, { kurz: 0, genau: MK / 40, flachSchutz: SCHUTZ });
    if (!w) break;
    h = w.haut;
    loops = w.loops;
    setzen(h, loops, 12);
    console.log(`    nachverfeinert ${k}: neu ${w.neu}, gedreht ${w.gedreht} → ${zaehlen(h, loops, MK).text}`);
  }
}
const zeile = (name: string) => console.log(`${name.padEnd(46)} ${zaehlen(h, loops, MK).text}`);

console.log(`Startkante ${MK.toFixed(2)}, Gewichte ${gewichte}${NADELN ? ', Nadeln fallen gleich nach dem Einsetzen zusammen' : ''}${SCHUTZ ? '' : ', ohne Schutz (wie bis 10.11.)'}`);
zeile('0 Kugel');
schneiden('seite', [-200, 0], [200, 0]);
schneiden('top', [-200, 0], [200, 0]);
schneiden('seite', [10, 200], [10, -200]);
zeile('1 drei Loops eingesetzt');
{
  const m = loops.find((l) => l.art === 'mitte')!;
  const oben = m.punkte.reduce((b, p) => (p.ref.y > b.ref.y ? p : b)).kreuzung!;
  ziehen((l) => l.punkte.findIndex((p) => p.kreuzung === oben), { x: 0, y: 160, z: 0 }, 50);
}
zeile('2 Hals gezogen (vor dem Aufräumen)');
aufraeumen('Aufräumen nach dem Hals');
zeile('3 nach dem Aufräumen');
schneiden('seite', [-170, 235], [190, 235]);
zeile('4 Ring um den Hals eingesetzt');
{
  const ring = loops[loops.length - 1]!;
  const vorn = ring.punkte.filter((p) => !p.vonSelbst).reduce((b, p) => (p.ref.x < b.ref.x ? p : b));
  const k = vorn.kreuzung;
  ziehen((l) => (k === undefined ? (l === ring ? l.punkte.indexOf(vorn) : -1) : l.punkte.findIndex((p) => p.kreuzung === k)), { x: -70, y: 10, z: 0 }, 30);
}
zeile('5 Kopf gezogen (vor dem Aufräumen)');
aufraeumen('Aufräumen nach dem Kopf');
zeile('6 nach dem Aufräumen');
