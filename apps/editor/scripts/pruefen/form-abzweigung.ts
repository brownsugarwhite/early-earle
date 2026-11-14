// Plan vom 12.11.2026, Zwischenschritt „Abzweigungen“ (14.11.), Etappe 1: kleiner Beweis im Kern an Florians Beispiel.
// Florian: „Ich will zum beispiel bei einem edgeloop mit 4 punkten (z.B. kreis), die gegenüberliegenden punkte verbinden können,
// indem ich mit p von einem punkt zum anderen ziehe. Wenn ich das bei beiden paaren mache ergibt sich dadurch ein kreuz mit einem
// punkt in der kreuzung, die ich sehr exakt formen kann...z.B zu einem horn.“
//
// Die Form: eine Kugel mit drei Linien (Mittellinie, Ring waagerecht, Ring senkrecht), in einem Feld dazwischen ein Kreis mit vier
// Punkten. Dann die zwei Abzweigungen von Punkt zu gegenüberliegendem Punkt (`abzweigen`), der gemeinsame Punkt in ihrer Kreuzung,
// und dieser Punkt um HOCH nach außen gezogen.
//
// Kriterien (vorher festgelegt, Plan):
// 1. Beide Linien lassen sich einsetzen und enden genau an den Punkten des Kreises.
// 2. In der Kreuzung liegt ein gemeinsamer Punkt.
// 3. Herausgezogen entsteht eine Spitze, die den vier Linienstücken folgt; die Haut steht, nichts schlägt um.
// 4. Der Kreis und die Form außerhalb bleiben.
//
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-abzweigung.ts
//   DREIECKE=2000   HOCH=90 (so weit wird der Punkt in der Kreuzung herausgezogen)   KREIS=38 (Halbmesser im Blatt)   AUS=<datei.html>
//   KANTE=1: der Kreis ist eine Kante (K an); dann rundet die Haut nicht über ihn hinweg
import { abzweigen } from '../../../../packages/shape/src/dicht/einsetzen';
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import {
  type Loop,
  LoopZug,
  eckenAuto,
  formAusZeichnung,
  griffeAnlegen,
  hautLagen,
  istSichtbar,
  kreuzungenZwischen,
  mittlereKante,
  pfadLagen,
  punktEinfuegen,
} from '../../../../packages/shape/src/dicht/loops';
import { type BlattBild, type BlattLinie, blattSchreiben } from './form-direkt-blatt';
import { kugelMit, nachVerdichten } from './form-direkt-faelle';

const DREIECKE = Number(process.env.DREIECKE ?? 2000);
const HOCH = Number(process.env.HOCH ?? 90);
const RK = Number(process.env.KREIS ?? 38);
const AUS = process.env.AUS ?? '';
const KANTE = process.env.KANTE === '1';
const R0 = 150;
/** die Mitte des Kreises im Blatt „Seite“ (x, y): in einem Feld zwischen den drei Linien der Kugel */
const MX = -60;
const MY = 62;
const RUHE = 0.02;
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
const abstand = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// ---------- 1. die Kugel mit drei Linien, dazu der Kreis mit vier Punkten ----------
const start = kugelMit('drei', DREIECKE);
let haut: Haut = start.h;
let loops: Loop[] = start.loops;
const mk = mittlereKante(haut);
for (const l of loops) griffeAnlegen(l, l.ruhe, true);
const KREIS = loops.length + 1;
{
  const N = 64;
  const uv: [number, number][] = [];
  for (let i = 0; i < N; i++) uv.push([MX + RK * Math.cos((2 * Math.PI * i) / N), MY + RK * Math.sin((2 * Math.PI * i) / N)]);
  const form = formAusZeichnung(haut, 'seite', uv, [0, N / 4, N / 2, (3 * N) / 4], KREIS);
  if (!form) throw new Error('der Kreis ergibt keine Form');
  const r = loopEinsetzen(haut, [...loops, form], loops.length);
  if (!r) throw new Error('der Kreis lässt sich nicht einsetzen');
  haut = r.haut;
  loops = r.loops;
  if (KANTE) loops[loops.length - 1]!.kante = true;
  eckenAuto(loops);
  griffeAnlegen(loops[loops.length - 1]!, loops[loops.length - 1]!.ruhe, true);
}
const nrKreis = loops.length - 1;
const finde = (id: number): Loop => loops.find((l) => l.id === id)!;
const mitte: V3 = (() => {
  const P = finde(KREIS).punkte;
  return { x: P.reduce((s, p) => s + p.ref.x, 0) / P.length, y: P.reduce((s, p) => s + p.ref.y, 0) / P.length, z: P.reduce((s, p) => s + p.ref.z, 0) / P.length };
})();
console.log(`Kugel mit ${loops.length - 1} Linien und dem Kreis: ${haut.n} Punkte, mittlere Kante ${z1(mk)}; der Kreis hat ${finde(KREIS).punkte.length} Punkte, seine Mitte liegt bei (${z1(mitte.x)} ${z1(mitte.y)} ${z1(mitte.z)})`);

/** umgeschlagene Dreiecke: gegen die Summe der Normalen ihrer Ecken (wie das Fenster zählt) */
function umgeschlagen(h: Haut): number {
  const nor = new Float64Array(3 * h.n);
  const fl: V3[] = [];
  for (let t = 0; t < h.tri.length; t += 3) {
    const [a, b, c] = [lage(h.pos, h.tri[t]!), lage(h.pos, h.tri[t + 1]!), lage(h.pos, h.tri[t + 2]!)];
    const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
    const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
    fl.push(n);
    for (let e = 0; e < 3; e++) {
      const w = h.tri[t + e]!;
      nor[3 * w] = nor[3 * w]! + n.x;
      nor[3 * w + 1] = nor[3 * w + 1]! + n.y;
      nor[3 * w + 2] = nor[3 * w + 2]! + n.z;
    }
  }
  let zahl = 0;
  for (let t = 0; t < h.tri.length; t += 3) {
    let s = 0;
    const n = fl[t / 3]!;
    for (let e = 0; e < 3; e++) {
      const w = h.tri[t + e]!;
      s += n.x * nor[3 * w]! + n.y * nor[3 * w + 1]! + n.z * nor[3 * w + 2]!;
    }
    if (s < 0) zahl++;
  }
  return zahl;
}

/**
 * Rechnen wie das Fenster: Die Linien gehen auf ihre Pfade (aus `cur` der Punkte und den Griffen), die Haut folgt; erst `n` Schritte
 * zu zwei Runden (vor jedem `vor` mit dem Anteil des Wegs), dann Runden, bis die Haut steht.
 */
function rechnen(n = 0, vor?: (f: number) => void): { runden: number; steht: boolean } {
  const z = new LoopZug(haut, loops, null, true, 'kurven', 'geometrie', { halb: true });
  const anfang = loops.map((l) => Float64Array.from(l.ruhe));
  const versch = (): Float64Array[] =>
    loops.map((l, i) =>
      Float64Array.from(
        pfadLagen(
          l,
          l.punkte.map((p) => p.cur),
        ) ?? anfang[i]!,
        (x, k) => x - anfang[i]![k]!,
      ),
    );
  let runden = 0;
  for (let k = 1; k <= n; k++) {
    vor?.(k / n);
    z.schritt(versch(), 2);
    runden += 2;
  }
  const d = versch();
  let letzte = Infinity;
  const davor = new Float64Array(haut.pos.length);
  for (let r = 0; r < 400 && letzte > RUHE; r++) {
    davor.set(haut.pos);
    z.schritt(d, 1);
    runden++;
    letzte = 0;
    for (let k = 0; k < davor.length; k += 3) letzte = Math.max(letzte, Math.hypot(haut.pos[k]! - davor[k]!, haut.pos[k + 1]! - davor[k + 1]!, haut.pos[k + 2]! - davor[k + 2]!));
    if (!Number.isFinite(letzte)) break;
  }
  for (const l of loops) {
    l.ruhe = hautLagen(haut, l);
    for (const p of l.punkte) p.ref = { ...p.cur };
  }
  return { runden, steht: letzte <= RUHE };
}
/** wie weit die Linien neben ihren Pfaden liegen (größter Abstand einer Stelle) */
const nebenPfad = (ls: readonly Loop[]): number => {
  let weit = 0;
  for (const l of ls) {
    const P = pfadLagen(l);
    if (!P) continue;
    const H = hautLagen(haut, l);
    for (let k = 0; k < P.length; k += 3) weit = Math.max(weit, Math.hypot(P[k]! - H[k]!, P[k + 1]! - H[k + 1]!, P[k + 2]! - H[k + 2]!));
  }
  return weit;
};
/** ein Ort, längs des Strahls von der Mitte der Kugel auf die Kugel gelegt */
const aufKugel = (p: V3): V3 => {
  const l = Math.hypot(p.x, p.y, p.z) || 1;
  return { x: (p.x * R0) / l, y: (p.y * R0) / l, z: (p.z * R0) / l };
};
/**
 * Die Form außerhalb: Punkte der Haut, die (auf die Kugel gelegt) weiter als `ab` von der Mitte des Kreises liegen, auf beiden
 * Seiten; ihr größter Abstand von der Kugel.
 */
const aussen = (ab: number): number => {
  let weit = 0;
  const m = aufKugel(mitte);
  for (let v = 0; v < haut.n; v++) {
    const p = lage(haut.pos, v);
    const q = aufKugel(p);
    if (abstand(q, m) < ab || abstand({ ...q, z: -q.z }, m) < ab) continue;
    weit = Math.max(weit, Math.abs(Math.hypot(p.x, p.y, p.z) - R0));
  }
  return weit;
};
/** der Halbmesser des Kreises auf der Haut (mittlerer Abstand seiner Stellen von seiner Mitte, auf die Kugel gelegt) */
const kreisHalbmesser = (): number => {
  const L = hautLagen(haut, finde(KREIS));
  const m = aufKugel(mitte);
  let sum = 0;
  for (let j = 0; j < L.length / 3; j++) sum += abstand(aufKugel(lage(L, j)), m);
  return sum / (L.length / 3);
};
const kopie = (): { h: Haut; loops: Loop[] } => ({
  h: { ...haut, pos: Float64Array.from(haut.pos) },
  loops: loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) })),
});

{
  const r = rechnen();
  console.log(`   gesetzt: ${r.runden} Runden, ${r.steht ? 'steht' : 'STEHT NICHT'}; Linien bis ${z2(nebenPfad(loops))} neben ihren Pfaden; außerhalb des Kreises bis ${z2(aussen(2 * RK))} neben der Kugel; umgeschlagen ${umgeschlagen(haut)}`);
}
const bildKreis = kopie();
const kreisVorher = finde(KREIS).punkte.map((p) => ({ ...p.ref }));
const aussenVorher = aussen(2 * RK);

// ---------- 2. die zwei Abzweigungen: jeder Punkt des Kreises mit dem gegenüberliegenden ----------
let naechsteKreuzung = 1 + Math.max(0, ...loops.flatMap((l) => l.punkte.map((p) => p.kreuzung ?? 0)));
const A1 = KREIS + 1;
const A2 = KREIS + 2;
let k1 = true;
for (const [id, von, nach] of [
  [A1, 0, 2],
  [A2, 1, 3],
] as const) {
  const r = abzweigen(haut, loops, { loop: nrKreis, punkt: von }, { loop: nrKreis, punkt: nach }, id, naechsteKreuzung);
  if ('fehler' in r) {
    console.log(`   Abzweigung ${id - KREIS} (Punkt ${von} → Punkt ${nach}): GEHT NICHT: ${r.fehler}`);
    k1 = false;
    continue;
  }
  haut = r.haut;
  loops = r.loops;
  naechsteKreuzung = r.naechsteKreuzung;
  eckenAuto(loops);
  const neu = finde(id);
  griffeAnlegen(neu, neu.ruhe, true);
  // die Enden gegen die Punkte des Kreises
  const K = finde(KREIS).punkte;
  const e0 = abstand(lage(neu.ruhe, 0), K[von]!.ref);
  const e1 = abstand(lage(neu.ruhe, neu.proben.length - 1), K[nach]!.ref);
  const geteilt = neu.punkte[0]!.kreuzung === K[von]!.kreuzung && neu.punkte[neu.punkte.length - 1]!.kreuzung === K[nach]!.kreuzung;
  console.log(`   Abzweigung ${id - KREIS} (Punkt ${von} → Punkt ${nach}): eingesetzt, ${neu.proben.length} Stellen, Länge ${z1(neu.laenge)}; ihre Enden liegen ${z2(e0)} und ${z2(e1)} neben den Punkten des Kreises; sie teilt die Punkte: ${geteilt ? 'ja' : 'NEIN'}`);
  if (e0 > 0.05 * mk || e1 > 0.05 * mk || !geteilt) k1 = false;
}
if (!k1) {
  console.log('Kriterien: 1 einsetzen und an den Punkten enden HÄLT NICHT; angehalten');
  process.exit(1);
}

// die Kreuzung der beiden: ein gemeinsamer Punkt
let k2 = false;
{
  const a = finde(A1);
  const b = finde(A2);
  const funde = kreuzungenZwischen(a, a.ruhe, b, b.ruhe, 0.25 * mk);
  if (funde.length === 1) {
    const f = funde[0]!;
    const k = naechsteKreuzung++;
    const pa = punktEinfuegen(a, f.sa, k, true);
    const pb = punktEinfuegen(b, f.sb, k, true);
    const c = { x: (pa.ref.x + pb.ref.x) / 2, y: (pa.ref.y + pb.ref.y) / 2, z: (pa.ref.z + pb.ref.z) / 2 };
    const auseinander = abstand(pa.ref, pb.ref);
    for (const p of [pa, pb]) {
      p.ref = { ...c };
      p.cur = { ...c };
    }
    k2 = auseinander < 0.25 * mk;
    console.log(`   Kreuzung: ein gemeinsamer Punkt bei (${z1(c.x)} ${z1(c.y)} ${z1(c.z)}), ${z1(abstand(c, mitte))} von der Mitte des Kreises; die beiden Linien lagen dort ${z2(auseinander)} auseinander`);
  } else console.log(`   Kreuzung: ${funde.length} Funde statt einem`);
}
{
  const r = rechnen();
  console.log(`   gesetzt: ${r.runden} Runden, ${r.steht ? 'steht' : 'STEHT NICHT'}; Linien bis ${z2(nebenPfad(loops))} neben ihren Pfaden; außerhalb bis ${z2(aussen(2 * RK))} neben der Kugel; umgeschlagen ${umgeschlagen(haut)}`);
}
const bildKreuz = kopie();

// ---------- 3. der Punkt in der Kreuzung nach außen ----------
const kreuzPunkte = [finde(A1), finde(A2)].map((l) => l.punkte.find((p) => p.kreuzung === naechsteKreuzung - 1)!);
const von = { ...kreuzPunkte[0]!.ref };
const aus = (() => {
  const l = Math.hypot(von.x, von.y, von.z) || 1;
  return { x: von.x / l, y: von.y / l, z: von.z / l };
})();
const ziel = { x: von.x + HOCH * aus.x, y: von.y + HOCH * aus.y, z: von.z + HOCH * aus.z };
let runden = 0;
let steht = true;
const STUFEN = 9;
for (let b = 1; b <= STUFEN; b++) {
  const r = rechnen(4, (f) => {
    const t = (b - 1 + f) / STUFEN;
    for (const p of kreuzPunkte) p.cur = { x: von.x + t * (ziel.x - von.x), y: von.y + t * (ziel.y - von.y), z: von.z + t * (ziel.z - von.z) };
  });
  runden += r.runden;
  steht = r.steht;
  // verfeinern wie das Fenster nach einem Zug (die Spitze dehnt das Netz)
  const v = nachVerdichten(haut, loops, mk);
  haut = v.h;
  loops = v.loops;
  for (const l of loops) for (const p of l.punkte) p.cur = { ...p.ref };
  // die Punkte der Kreuzung neu fassen (das Verdichten gibt neue Loops zurück)
  kreuzPunkte.splice(0, 2, ...[finde(A1), finde(A2)].map((l) => l.punkte.find((p) => p.kreuzung === naechsteKreuzung - 1)!));
}
{
  const r = rechnen();
  runden += r.runden;
  steht = r.steht;
}
// die Spitze: der Punkt der Haut an der Kreuzung gegen das Ziel
const spitze = (() => {
  const a = finde(A1);
  const p = a.punkte.find((q) => q.kreuzung === naechsteKreuzung - 1)!;
  let best = Infinity;
  for (let j = 0; j < a.proben.length; j++) best = Math.min(best, abstand(lage(hautLagen(haut, a), j), ziel));
  return { neben: best, punkt: abstand(p.ref, ziel) };
})();
const neben = nebenPfad([finde(A1), finde(A2)]);
const um = umgeschlagen(haut);
const kreisBewegt = Math.max(...finde(KREIS).punkte.map((p, i) => abstand(p.ref, kreisVorher[i]!)));
const kreisNeben = nebenPfad([finde(KREIS)]);
const aussenDanach = aussen(2 * RK);
const aussenFern = aussen(3 * RK);
const rKreis = kreisHalbmesser();
// die höchste Stelle der Haut über der Kugel (so hoch steht die Spitze)
let hoch = 0;
for (let v = 0; v < haut.n; v++) hoch = Math.max(hoch, Math.hypot(haut.pos[3 * v]!, haut.pos[3 * v + 1]!, haut.pos[3 * v + 2]!) - R0);
console.log(
  `Herausgezogen um ${HOCH}: ${haut.n} Punkte, ${runden} Runden, ${steht ? 'steht' : 'STEHT NICHT'}; die Spitze liegt ${z2(spitze.neben)} neben dem Ziel und steht ${z1(hoch)} über der Kugel; ` +
    `die zwei Linien liegen bis ${z2(neben)} neben ihren Pfaden; umgeschlagen ${um}`,
);
console.log(`   der Kreis: seine Punkte haben sich um höchstens ${z2(kreisBewegt)} bewegt, er liegt bis ${z2(kreisNeben)} neben seinem Pfad; sein Halbmesser auf der Haut ist ${z1(rKreis)}; weiter als ${2 * RK} von seiner Mitte liegt die Haut bis ${z2(aussenDanach)} neben der Kugel (vorher ${z2(aussenVorher)}), weiter als ${3 * RK} bis ${z2(aussenFern)}`);
const k3 = steht && um === 0 && spitze.neben < 0.25 * mk && neben < 0.25 * mk;
const k4 = kreisBewegt < 0.05 * mk && kreisNeben < 0.25 * mk && aussenDanach < aussenVorher + 1.5;
console.log(
  `Kriterien: 1 einsetzen und an den Punkten enden ${k1 ? 'hält' : 'HÄLT NICHT'}; 2 gemeinsamer Punkt in der Kreuzung ${k2 ? 'hält' : 'HÄLT NICHT'}; ` +
    `3 Spitze folgt den Linien, steht, nichts schlägt um ${k3 ? 'hält' : 'HÄLT NICHT'}; 4 Kreis und Form außerhalb bleiben ${k4 ? 'hält' : 'HÄLT NICHT'}`,
);

if (AUS) {
  /** die Linien der Seite z ≥ 0, geschlossene bis zu ihrem Anfang zurück; die Punkte dieser Seite */
  const bild = (name: string, x: { h: Haut; loops: Loop[] }, notiz: string): BlattBild => {
    const linien: BlattLinie[] = x.loops.map((l) => {
      const L = Array.from(hautLagen(x.h, l));
      if (l.art !== 'ring') L.push(L[0]!, L[1]!, L[2]!);
      return { p: L, zu: false, hart: 0 };
    });
    const punkte = x.loops.flatMap((l) => l.punkte.filter(istSichtbar).map((p) => [p.ref.x, p.ref.y, p.ref.z]));
    return { name, h: x.h, loops: [], notiz, fertig: { linien, punkte } };
  };
  // die Mitte der Bilder: ein Stück hinter dem Kreis (das Blatt zeichnet Linien nur vor der Mitte des Bilds)
  const hinter = { x: mitte.x * 0.45, y: mitte.y * 0.45, z: mitte.z * 0.45 };
  blattSchreiben(
    AUS,
    'Zwischenschritt „Abzweigungen“, Etappe 1: Florians Beispiel im Kern (14.11.2026)',
    [
      {
        titel: 'Ein Kreis mit vier Punkten; die gegenüberliegenden Punkte verbunden; der Punkt in der Kreuzung herausgezogen',
        bilder: [
          bild(`der Kreis mit vier Punkten${KANTE ? ' (Kante an)' : ''}`, bildKreis, `Kugel mit drei Linien, ${bildKreis.h.n} Punkte`),
          bild('die gegenüberliegenden Punkte verbunden', bildKreuz, 'zwei Abzweigungen, jede hängt an zwei Punkten des Kreises; in der Kreuzung ein gemeinsamer Punkt'),
          bild(`der Punkt in der Kreuzung um ${HOCH} herausgezogen`, kopie(), `${haut.n} Punkte; ${steht ? 'die Haut steht' : 'die Haut steht nicht'}; umgeschlagen ${um}; die Spitze steht ${z1(hoch)} über der Kugel; auf der anderen Seite steht ihr Spiegelbild; außerhalb des Kreises geht die Haut bis ${z1(aussenDanach)} mit`),
        ],
        blicke: [
          ['schräg von der Seite', -35, 28, 0.8],
          ['auf den Kreis (das Horn von der Spitze her)', 55, 28, 0.8],
        ],
        mass: 360,
        mitte: [hinter.x, hinter.y, hinter.z],
      },
    ],
    1560,
    'Flächen flach schattiert (jeden Knick sieht man), Linien blau, Punkte der Linien als Kreise; rot wäre eine umgeschlagene Fläche.',
  );
  console.log(`Blatt: ${AUS}`);
}
