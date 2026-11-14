// Plan vom 12.11.2026, Schritt 6 (14.11.): das Maul aus nur einer Linie.
//
// Florian (13.11.): „Ein Maul soll auch nur eine Linie sein können. Wenn ich nur eine Linie einzeichne, ist das wie ein an den
// Mundwinkeln gefalteter Edgeloop, dessen Lippen exakt aufeinander liegen. Im geschlossenen Zustand kann ich dann nur die Linie
// bearbeiten, nicht beide Kiefer (also nur beide Lippen zusammen).“
//
// Entwurf (Plan, Schritt 6, „Das Maul aus nur einer Linie“; Beweis `apps/editor/scripts/pruefen/form-maul-linie.ts`): Die eine
// Linie ist die Oberlippe. Die Unterlippe ist dieselbe Linie, um den Mundwinkel ein Stück aufgedreht (`Loop.maulLinie`, Grad): Punkt
// für Punkt und Griff für Griff ihr gedrehtes Abbild, ihr Zwilling. Beide zusammen sind ein Ring; daraus wird ein geformtes Maul wie
// jedes andere (`maulFormen`). Gerechnet wird immer diese leicht geöffnete Lage (dort liegt nichts aufeinander); „zu“ dreht der
// Kieferknochen um denselben Winkel zurück (`knochenWinkel` mit `zuBis`), dann liegt die Unterlippe genau auf der Oberlippe.
//
// Hier: aus der gezeichneten Linie den Ring anlegen (`maulLinieAusZeichnung`) und die Zwillingsregel (`zwillinge`,
// `zwillingeSetzen`, `zwillingeFestlegen`, `zwillingeAngleichen`).

import type { Haut, V3 } from './kurven';
import { type Ansicht, type Loop, type LoopPunkt, type Probe, formAusZeichnung, punktEinfuegen, strahl } from './loops';

/** So weit ist die gerechnete Lage eines Mauls aus einer Linie offen (Grad). Unter etwa 16° wird der Keil am Mundwinkel zu dünn. */
export const MAUL_LINIE_WINKEL = 20;

/** Der Ring ist ein Maul aus einer Linie: Seine zweite Lippe ist das gedrehte Abbild der ersten */
export const istMaulLinie = (l: Loop): boolean => l.art === 'ring' && l.maulLinie !== undefined;

const lage = (P: ArrayLike<number>, i: number): V3 => ({ x: P[3 * i]!, y: P[3 * i + 1]!, z: P[3 * i + 2]! });
const dreh2 = (x: number, y: number, a: number): [number, number] => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];
/** einen Ort in der Seite um G drehen (die Tiefe bleibt) */
const umG = (p: V3, a: number, G: { x: number; y: number }): V3 => {
  const [x, y] = dreh2(p.x - G.x, p.y - G.y, a);
  return { x: G.x + x, y: G.y + y, z: p.z };
};
/** einen Griff (Vektor) in der Seite drehen */
const gedreht = (v: V3, a: number): V3 => {
  const [x, y] = dreh2(v.x, v.y, a);
  return { x, y, z: v.z };
};
const gespiegelt = (v: V3): V3 => ({ x: v.x, y: v.y, z: -v.z });
const abstand = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** die Normale der Haut an einer Probe (die ihres Dreiecks, nach außen) */
function normaleBei(h: Haut, p: Probe): V3 {
  const [a, b, c] = p.ecken.map((v) => lage(h.pos, v)) as [V3, V3, V3];
  const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  return { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
}

/**
 * Aus einer offenen gezeichneten Linie das Maul aus einer Linie anlegen: ein Ring, dessen eine Lippe die Linie ist und dessen andere
 * ihr um den Mundwinkel gedrehtes Abbild (nach unten, `winkel` Grad). In der Seite läuft die Linie vom Umriss vorn (ein Ende vor dem
 * Körper) zum Mundwinkel; in Front und Top von der Mitte (oder über die Mitte gezogen) zum Mundwinkel. Das freie Ende ist der
 * Mundwinkel (eine Ecke). `uv`: die Linie im Blatt, dicht abgetastet; `knoten`: Stellen, die Punkte werden (sie bekommen ihren
 * Zwilling); `mk`: die mittlere Kante des Netzes.
 *
 * Der Ring ist noch nicht ins Netz eingesetzt und hat noch keine Griffe; er ist von Anfang an eine Kante (als einzige runde Linie
 * zöge der schmale Keil eine Form ohne Haltelinien zusammen). Nach dem Einsetzen und `griffeAnlegen`: `zwillingeFestlegen`.
 */
export function maulLinieAusZeichnung(
  h: Haut,
  a: Ansicht,
  uv: readonly [number, number][],
  knoten: readonly number[],
  id: number,
  mk: number,
  winkel = MAUL_LINIE_WINKEL,
): Loop | { fehler: string } {
  if (uv.length < 4) return { fehler: 'die Linie ist zu kurz' };
  const knotenMenge = new Set(knoten);
  type Stelle = { q: [number, number]; knoten: boolean };
  /** in der Seite: die Linie von vorn zum Mundwinkel, und davor Punkte vor dem Körper (von nah nach fern) */
  let innen: Stelle[];
  let aussen: [number, number][];
  if (a === 'seite') {
    let P = uv.map((q, i) => ({ q: [q[0], q[1]] as [number, number], knoten: knotenMenge.has(i), drauf: strahl(h, a, q[0], q[1]) !== null }));
    if (P[0]!.drauf && !P[P.length - 1]!.drauf) P = P.reverse();
    if (P[0]!.drauf || !P[P.length - 1]!.drauf) return { fehler: 'in der Seite vom Umriss vorn bis zum Mundwinkel zeichnen: ein Ende vor dem Körper, das andere darauf' };
    const r = P.findIndex((x) => x.drauf);
    if (P.slice(r).some((x) => !x.drauf)) return { fehler: 'die Linie verlässt den Körper mehr als einmal' };
    innen = P.slice(r);
    const a0 = P[r - 1]!.q;
    const i0 = P[r]!.q;
    const d = Math.hypot(a0[0] - i0[0], a0[1] - i0[1]) || 1;
    aussen = [a0, [a0[0] + ((a0[0] - i0[0]) / d) * 3 * mk, a0[1] + ((a0[1] - i0[1]) / d) * 3 * mk]];
  } else {
    const zK = (q: readonly [number, number]): number => (a === 'front' ? q[0] : q[1]);
    const mitZ = (q: readonly [number, number], z: number): [number, number] => (a === 'front' ? [z, q[1]] : [q[0], z]);
    let Q: Stelle[] = uv.map((q, i) => ({ q: [q[0], q[1]], knoten: knotenMenge.has(i) }));
    const n = Q.length;
    const wechsel: number[] = [];
    for (let i = 0; i + 1 < n; i++) if (zK(Q[i]!.q) < 0 !== zK(Q[i + 1]!.q) < 0) wechsel.push(i);
    if (wechsel.length > 1) return { fehler: 'die Linie kreuzt die Mitte mehr als einmal' };
    let linie: Stelle[];
    if (wechsel.length === 1) {
      // über die Mitte gezogen: die Hälfte z ≥ 0, von der Mitte bis zum Ende auf dieser Seite
      const c = wechsel[0]!;
      const q0 = Q[c]!.q;
      const q1 = Q[c + 1]!.q;
      const g = zK(q0) / (zK(q0) - zK(q1));
      const kreuz: Stelle = { q: mitZ([q0[0] + g * (q1[0] - q0[0]), q0[1] + g * (q1[1] - q0[1])], 0), knoten: false };
      linie = zK(Q[n - 1]!.q) >= 0 ? [kreuz, ...Q.slice(c + 1)] : [kreuz, ...Q.slice(0, c + 1).reverse()];
    } else {
      // ganz auf einer Seite: auf z ≥ 0 gespiegelt; das Ende näher an der Mitte beginnt auf ihr
      if (zK(Q[0]!.q) < 0 || zK(Q[n - 1]!.q) < 0) Q = Q.map((x) => ({ ...x, q: mitZ(x.q, -zK(x.q)) }));
      if (Math.abs(zK(Q[0]!.q)) > Math.abs(zK(Q[n - 1]!.q))) Q = Q.reverse();
      if (Math.abs(zK(Q[0]!.q)) > 2 * mk) return { fehler: 'die Linie an der Mitte beginnen oder über die Mitte ziehen' };
      linie = [{ q: mitZ(Q[0]!.q, 0), knoten: false }, ...Q.slice(1)];
    }
    // dicht abtasten, in diesem Blatt (von der Seite gesehen liegen die Stellen vorn eng beieinander, auf der Haut nicht)
    linie = linie.flatMap((x, i) => {
      if (i === 0) return [x];
      const v = linie[i - 1]!.q;
      const teile = Math.max(1, Math.ceil(Math.hypot(x.q[0] - v[0], x.q[1] - v[1]) / (0.25 * mk)));
      const dazwischen: Stelle[] = [];
      for (let k = 1; k < teile; k++) dazwischen.push({ q: [v[0] + (k / teile) * (x.q[0] - v[0]), v[1] + (k / teile) * (x.q[1] - v[1])], knoten: false });
      return [...dazwischen, x];
    });
    const T = linie.map((x) => strahl(h, a, x.q[0], x.q[1]));
    if (T.some((t) => !t)) return { fehler: 'die Linie ganz auf dem Körper zeichnen' };
    const S = T.map((t) => [t!.p.x, t!.p.y] as [number, number]);
    // vor den Körper hinaus: längs der Normale der Haut vorn (auf der Mittelebene liegt sie in der Ebene der Seite)
    const nor = normaleBei(h, T[0]!.probe);
    let nx = nor.x;
    let ny = nor.y;
    if (Math.hypot(nx, ny) < 1e-9) {
      nx = S[0]![0] - S[S.length - 1]![0];
      ny = S[0]![1] - S[S.length - 1]![1];
    }
    const nl = Math.hypot(nx, ny) || 1;
    aussen = [1.5 * mk, 4.5 * mk].map((d) => [S[0]![0] + (nx / nl) * d, S[0]![1] + (ny / nl) * d] as [number, number]);
    // (genau am Umriss streift der Blick aus der Seite die Haut: Die Stellen dort fallen weg, der Ring beginnt, wo die Strecke nach
    // außen den Umriss kreuzt)
    innen = S.map((q, i) => ({ q, knoten: linie[i]!.knoten })).filter((x, i) => i === S.length - 1 || Math.hypot(x.q[0] - S[0]![0], x.q[1] - S[0]![1]) > 0.05 * mk);
  }
  if (innen.length < 3) return { fehler: 'die Linie ist zu kurz' };
  // dichter abtasten (der Keil ist am Mundwinkel schmal)
  const dicht: Stelle[] = [];
  innen.forEach((x, i) => {
    if (i > 0) {
      const v = innen[i - 1]!.q;
      const teile = Math.max(1, Math.ceil(Math.hypot(x.q[0] - v[0], x.q[1] - v[1]) / (0.25 * mk)));
      for (let k = 1; k < teile; k++) dicht.push({ q: [v[0] + (k / teile) * (x.q[0] - v[0]), v[1] + (k / teile) * (x.q[1] - v[1])], knoten: false });
    }
    dicht.push(x);
  });
  innen = dicht;
  const n = innen.length;
  const vorn = innen[0]!.q;
  const W = innen[n - 1]!.q;
  let lang = 0;
  for (let i = 1; i < n; i++) lang += Math.hypot(innen[i]!.q[0] - innen[i - 1]!.q[0], innen[i]!.q[1] - innen[i - 1]!.q[1]);
  if (lang < 3 * mk) return { fehler: 'von der Seite gesehen reicht die Linie nicht weit genug nach hinten (der Unterkiefer dreht um den Mundwinkel und braucht diesen Hebel)' };
  if (Math.abs(vorn[0] - W[0]) < 0.2 * lang) return { fehler: 'die Maullinie muss von vorn nach hinten laufen (der Unterkiefer dreht um den Mundwinkel)' };
  // die Unterlippe: um den Mundwinkel gedreht, vorn nach unten
  const aw = (vorn[0] < W[0] ? 1 : -1) * ((winkel * Math.PI) / 180);
  const R = (q: readonly [number, number]): [number, number] => {
    const [x, y] = dreh2(q[0] - W[0], q[1] - W[1], aw);
    return [W[0] + x, W[1] + y];
  };
  // der Keil in der Seite: vom Mundwinkel die Linie nach vorn, vor den Körper hinaus, ihr gedrehtes Abbild zurück
  const keil: [number, number][] = [];
  const kn: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    if (i === n - 1 || innen[i]!.knoten) kn.push(keil.length);
    keil.push(innen[i]!.q);
  }
  for (const q of aussen) keil.push(q);
  for (let i = aussen.length - 1; i >= 0; i--) keil.push(R(aussen[i]!));
  for (let i = 0; i < n - 1; i++) {
    if (innen[i]!.knoten) kn.push(keil.length);
    keil.push(R(innen[i]!.q));
  }
  const l = formAusZeichnung(h, 'seite', keil, kn, id);
  if (!l || l.art !== 'ring' || l.punkte.length === 0) return { fehler: 'die Linie lässt sich hier nicht als Maul auf die Haut legen (vorn muss sie am Umriss beginnen)' };
  // der Mundwinkel: der Punkt am freien Ende der Linie
  const wOrt = strahl(h, 'seite', W[0], W[1])?.p ?? { x: W[0], y: W[1], z: 0 };
  let w = l.punkte[0]!;
  for (const p of l.punkte) if (abstand(p.ref, wOrt) < abstand(w.ref, wOrt)) w = p;
  const iW = l.punkte.indexOf(w);
  // Punkte nur paarweise (fiel der Zwilling eines Punkts vor den Körper, entfallen beide)
  if (l.punkte.length !== 2 * iW + 1) l.punkte = [w];
  w.mundwinkel = true;
  w.ecke = true;
  l.maulLinie = winkel;
  l.kante = true;
  return l;
}

/**
 * Die Punkte der beiden Lippen paarweise: die Nummer des Mundwinkels und je Paar (Punkt der ersten Lippe, sein Zwilling auf der
 * zweiten), vom Mundwinkel nach vorn. Null, wenn der Ring kein Maul aus einer Linie ist oder seine Punkte nicht paarweise liegen.
 */
export function zwillinge(l: Loop): { iW: number; paare: [number, number][] } | null {
  if (!istMaulLinie(l)) return null;
  const P = l.punkte;
  const iW = P.findIndex((p) => p.mundwinkel);
  if (iW < 0 || P.length !== 2 * iW + 1) return null;
  const paare: [number, number][] = [];
  for (let d = 1; d <= iW; d++) paare.push([iW - d, iW + d]);
  return { iW, paare };
}

/**
 * Der Winkel (Bogenmaß, mit Drehsinn in der Seite: positiv gegen den Uhrzeigersinn), um den die zweite Lippe gegen die erste um den
 * Mundwinkel gedreht ist. Der Drehsinn kommt von den Enden des Rings, wie sie zuletzt festgelegt wurden (`ruhe`), der Betrag von
 * `maulLinie`. Null ohne Mundwinkel.
 */
export function zwillingsWinkel(l: Loop): number | null {
  if (!istMaulLinie(l)) return null;
  const W = l.punkte.find((p) => p.mundwinkel)?.ref;
  const n = l.proben.length;
  if (!W || n < 2) return null;
  const A = lage(l.ruhe, 0);
  const B = lage(l.ruhe, n - 1);
  const kreuz = (A.x - W.x) * (B.y - W.y) - (A.y - W.y) * (B.x - W.x);
  return (kreuz >= 0 ? 1 : -1) * ((l.maulLinie! * Math.PI) / 180);
}

/** Welche Lippe oben liegt (die gezeichnete Linie): die, deren Ende vorn höher liegt */
export function obereLippe(l: Loop): 'erste' | 'zweite' {
  const n = l.proben.length;
  return n < 2 || lage(l.ruhe, 0).y >= lage(l.ruhe, n - 1).y ? 'erste' : 'zweite';
}

export type Fuehrt = 'erste' | 'zweite';

/**
 * Die Zwillingsregel: Die geführte Lippe wird das um den Mundwinkel gedrehte Abbild der führenden. `orte` und `griffe` je Punkt, wie
 * sie jetzt sind oder nach einem Zug wären; geändert werden die Einträge der geführten Lippe und der Griff des Mundwinkels zu ihr hin.
 * Der Mundwinkel selbst bleibt, wo er in `orte` steht (um ihn wird gedreht). False, wenn die Punkte nicht paarweise liegen.
 */
export function zwillingeSetzen(l: Loop, orte: V3[], griffe: { ein: V3; aus: V3 }[], fuehrt: Fuehrt): boolean {
  const z = zwillinge(l);
  const a = zwillingsWinkel(l);
  if (!z || a === null) return false;
  const { iW, paare } = z;
  const G = orte[iW]!;
  const m = orte.length;
  if (fuehrt === 'erste') {
    griffe[iW] = { ein: griffe[iW]!.ein, aus: gedreht(griffe[iW]!.ein, a) };
    for (const [i, j] of paare) {
      orte[j] = umG(orte[i]!, a, G);
      griffe[j] = { ein: gedreht(griffe[i]!.aus, a), aus: gedreht(griffe[i]!.ein, a) };
    }
  } else {
    griffe[iW] = { ein: gedreht(griffe[iW]!.aus, -a), aus: griffe[iW]!.aus };
    for (const [i, j] of paare) {
      orte[i] = umG(orte[j]!, -a, G);
      griffe[i] = { ein: gedreht(griffe[j]!.aus, -a), aus: gedreht(griffe[j]!.ein, -a) };
    }
  }
  // die Enden des Rings liegen auf der Mittelebene; dort ist der Griff nach innen der eigentliche, der andere sein Spiegelbild
  if (m >= 2 && l.punkte[0]!.s <= 1e-6) {
    orte[0] = { ...orte[0]!, z: 0 };
    griffe[0] = { ein: gespiegelt(griffe[0]!.aus), aus: griffe[0]!.aus };
  }
  if (m >= 2 && l.punkte[m - 1]!.s >= l.laenge - 1e-6) {
    orte[m - 1] = { ...orte[m - 1]!, z: 0 };
    griffe[m - 1] = { ein: griffe[m - 1]!.ein, aus: gespiegelt(griffe[m - 1]!.ein) };
  }
  return true;
}

const NULL: V3 = { x: 0, y: 0, z: 0 };
const griffeVon = (p: LoopPunkt): { ein: V3; aus: V3 } => ({ ein: { ...(p.ein ?? NULL) }, aus: { ...(p.aus ?? NULL) } });

/**
 * Die Zwillingsregel an der Linie selbst (Orte und Griffe ihrer Punkte in Ruhe): Die geführte Lippe wird genau das Abbild der
 * führenden. Zurück: die Nummern der Punkte, deren Ort sich dabei geändert hat (für Kreuzungen: Der Punkt des anderen Loops muss
 * mit); null, wenn die Punkte nicht paarweise liegen oder die Linie noch keine Griffe hat.
 */
export function zwillingeFestlegen(l: Loop, fuehrt: Fuehrt): number[] | null {
  if (!l.punkte.every((p) => p.ein && p.aus)) return null;
  const orte = l.punkte.map((p) => ({ ...p.ref }));
  const griffe = l.punkte.map(griffeVon);
  if (!zwillingeSetzen(l, orte, griffe, fuehrt)) return null;
  const bewegt: number[] = [];
  l.punkte.forEach((p, i) => {
    if (abstand(p.ref, orte[i]!) > 1e-9) bewegt.push(i);
    p.ref = orte[i]!;
    p.cur = { ...orte[i]! };
    p.ein = griffe[i]!.ein;
    p.aus = griffe[i]!.aus;
  });
  return bewegt;
}

/** Wie weit die geführte Lippe vom Abbild der führenden abweicht (Orte und Griffe, größter Wert); null ohne Zwillinge oder Griffe */
export function zwillingsFehler(l: Loop, fuehrt: Fuehrt = 'erste'): number | null {
  if (!l.punkte.every((p) => p.ein && p.aus)) return null;
  const orte = l.punkte.map((p) => ({ ...p.ref }));
  const griffe = l.punkte.map(griffeVon);
  if (!zwillingeSetzen(l, orte, griffe, fuehrt)) return null;
  let weit = 0;
  const m = l.punkte.length;
  l.punkte.forEach((p, i) => {
    // (an den Enden des Rings zählt nur der Griff nach innen: Der andere ist sein Spiegelbild, gespeichert wird er nicht gepflegt)
    const anfang = i === 0 && p.s <= 1e-6;
    const ende = i === m - 1 && p.s >= l.laenge - 1e-6;
    weit = Math.max(weit, abstand(p.ref, orte[i]!), anfang ? 0 : abstand(p.ein!, griffe[i]!.ein), ende ? 0 : abstand(p.aus!, griffe[i]!.aus));
  });
  return weit;
}

/**
 * Dafür sorgen, dass jeder Punkt einer Lippe seinen Zwilling auf der anderen hat: Kam auf einer Lippe ein Punkt dazu (eine Kreuzung,
 * ein Doppelklick), bekommt die andere ihn an derselben Stelle ihres Stücks. Die Linie ändert sich dabei nicht (beide Lippen sind
 * schon Abbilder voneinander; ein Punkt teilt nur sein Stück). Zurück: wie viele Punkte dazukamen; −1, wenn sich die Lippen nicht
 * paaren lassen (kein Mundwinkel, keine Griffe).
 */
export function zwillingeAngleichen(l: Loop): number {
  if (!istMaulLinie(l) || !l.punkte.every((p) => p.ein && p.aus)) return -1;
  const w = l.punkte.find((p) => p.mundwinkel);
  if (!w) return -1;
  const sW = w.s;
  const L1 = sW;
  const L2 = l.laenge - sW;
  if (!(L1 > 1e-9) || !(L2 > 1e-9)) return -1;
  // Anteil des Wegs vom Mundwinkel nach vorn (0 … 1), je Lippe
  const tau = (p: LoopPunkt): number => (p.s < sW ? (sW - p.s) / L1 : (p.s - sW) / L2);
  const TOL = 0.02;
  let dazu = 0;
  // so lange, bis jeder Punkt seinen Zwilling hat (je Durchgang höchstens ein neuer Punkt: Danach zählen die Nummern neu)
  for (let runde = 0; runde < 64; runde++) {
    const erste = l.punkte.filter((p) => p.s < sW).sort((p, q) => tau(p) - tau(q));
    const zweite = l.punkte.filter((p) => p.s > sW).sort((p, q) => tau(p) - tau(q));
    // im Gleichschritt vom Mundwinkel nach vorn: gleiche Stelle = Paar; sonst fehlt dem näheren sein Zwilling
    let i = 0;
    let j = 0;
    /** die letzten gepaarten Punkte davor (zum Mundwinkel hin) */
    let ankerA: LoopPunkt = w;
    let ankerB: LoopPunkt = w;
    let einsam: { p: LoopPunkt; aufErster: boolean } | null = null;
    while (i < erste.length || j < zweite.length) {
      const pa = erste[i];
      const pb = zweite[j];
      if (pa && pb && Math.abs(tau(pa) - tau(pb)) < TOL) {
        ankerA = pa;
        ankerB = pb;
        i++;
        j++;
        continue;
      }
      einsam = !pb || (pa && tau(pa) < tau(pb)) ? { p: pa!, aufErster: true } : { p: pb, aufErster: false };
      break;
    }
    if (!einsam) return dazu;
    // die nächsten gepaarten Punkte danach (nach vorn hin): ohne sie lässt sich die Stelle nicht übertragen
    let nachA: LoopPunkt | undefined;
    let nachB: LoopPunkt | undefined;
    for (let x = i, y = j; x < erste.length && y < zweite.length; ) {
      const pa = erste[x]!;
      const pb = zweite[y]!;
      if (Math.abs(tau(pa) - tau(pb)) < TOL) {
        nachA = pa;
        nachB = pb;
        break;
      }
      if (tau(pa) < tau(pb)) x++;
      else y++;
    }
    if (!nachA || !nachB) return -1;
    // die Stelle des einsamen Punkts in seinem Stück zwischen den gepaarten Nachbarn (s läuft in einem Stück gleichmäßig, auch wenn
    // es schon geteilt ist), übertragen auf das Stück der anderen Lippe
    const [von, bis, vonZ, bisZ] = einsam.aufErster ? [ankerA, nachA, ankerB, nachB] : [ankerB, nachB, ankerA, nachA];
    const t = (einsam.p.s - von.s) / (bis.s - von.s);
    const s = vonZ.s + t * (bisZ.s - vonZ.s);
    const vorher = l.punkte.length;
    punktEinfuegen(l, s, undefined, true);
    if (l.punkte.length === vorher) return -1;
    dazu++;
  }
  return -1;
}
