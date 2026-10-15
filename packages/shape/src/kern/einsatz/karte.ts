// Teil A (Plan „Maul als Einsatz“), Schritt A4: Karte des halben Maulfelds. Das feine Netz von A0 im halben Feld M,
// entlang des Schlitzes aufgeschnitten (A1), wird auf das Einheitsquadrat gelegt:
// 1. konform auf ein Rechteck: U harmonisch (Kotangens) mit U = 0 am Schlitz, U = 1 am Feldrand, frei (Neumann) auf der
//    Mittellinie; V harmonisch mit V = 0 auf dem oberen und V = 1 auf dem unteren Stück der Mittellinie, frei an Schlitz
//    und Feldrand. Am Mundwinkel entstehen so von selbst die elliptischen Mundschleifen.
// 2. Neueinbettung nach Tutte: die Randwerte aus Schritt 1 (je Randstück monoton erzwungen) fest, innen positive Gewichte
//    → nach Tutte/Floater eine Bijektion auf das konvexe Quadrat (jede Dreiecksorientierung wird geprüft).
// DOM-frei.
import { cgDirichlet, laplace } from '../../loeser/cg';

export type KartenEingabe = {
  /** Dreiecke des aufgeschnittenen Halbfelds (Punktnummern; Doppel ab `nPunkte`) */
  dreiecke: Int32Array;
  /** Lagen des feinen Netzes (3 je Punkt), Doppel liegen auf ihrem Ursprung */
  punkte: ArrayLike<number>;
  nPunkte: number;
  /** Doppel → Ursprung */
  doppel: Map<number, number>;
  /** Kantenpfad des Schlitzes (Naht → Mundwinkel) */
  pfad: readonly number[];
};

export type Karte = {
  /** Punkte der Karte (Nummern wie in der Eingabe) und ihre Lage im Quadrat */
  punkte: Int32Array;
  u: Float64Array;
  v: Float64Array;
  /** Randstücke in Umlaufreihenfolge: Schlitz (oben → Mundwinkel → unten), unteres Mittelstück, Feldrand, oberes Mittelstück */
  rand: { schlitz: number[]; mitteUnten: number[]; aussen: number[]; mitteOben: number[] };
  /** Dreiecke der Karte (Nummern wie in der Eingabe, nach dem Kippen der Ohren) */
  dreiecke: Int32Array;
  /** V des Mundwinkels */
  vWinkel: number;
  umgeklappt: number;
  entartet: number;
  schritte: number;
};

/**
 * „Ohren“ kippen: Ein Dreieck mit zwei Randkanten hat alle drei Ecken auf dem Rand; liegen sie auf demselben Randstück, hat
 * es in der Karte Fläche null (an Feldecken: ein Viereck mit drei Randpunkten, an der falschen Diagonale geteilt). Die
 * innere Kante wird mit dem Nachbardreieck gekippt (beide Dreiecke behalten ihren Umlaufsinn).
 */
function ohrenKippen(tri: Int32Array): number {
  let gekippt = 0;
  for (let runde = 0; runde < 256; runde++) {
    const kante = new Map<string, number[]>();
    const schl = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
    for (let t = 0; t < tri.length; t += 3) for (let k = 0; k < 3; k++) {
      const s2 = schl(tri[t + k]!, tri[t + ((k + 1) % 3)]!);
      (kante.get(s2) ?? kante.set(s2, []).get(s2)!).push(t / 3);
    }
    let neu = 0;
    for (let t = 0; t < tri.length / 3; t++) {
      const ecken = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
      const innen: number[] = [];
      for (let k = 0; k < 3; k++) if ((kante.get(schl(ecken[k]!, ecken[(k + 1) % 3]!)) ?? []).length === 2) innen.push(k);
      if (innen.length !== 1) continue;
      // innere Kante (a, b) = Ecken k, k+1; Gegenecke c; Nachbar über (a, b) mit Gegenecke d
      const k = innen[0]!;
      const a = ecken[k]!;
      const b = ecken[(k + 1) % 3]!;
      const c = ecken[(k + 2) % 3]!;
      const u = (kante.get(schl(a, b)) ?? []).find((x) => x !== t);
      if (u === undefined) continue;
      const nu = [tri[3 * u]!, tri[3 * u + 1]!, tri[3 * u + 2]!];
      const d = nu.find((x) => x !== a && x !== b)!;
      // t = (a, b, c) im Umlauf, u enthält (b, a, d): neu (a, d, c) und (d, b, c)
      tri.set([a, d, c], 3 * t);
      tri.set([d, b, c], 3 * u);
      neu++;
      gekippt++;
      break;
    }
    if (!neu) break;
  }
  return gekippt;
}

/** Karte des aufgeschnittenen Halbfelds (Schritt 1 konform, Schritt 2 Tutte). */
export function karteBauen(e: KartenEingabe): Karte {
  const lage = (i: number): [number, number, number] => {
    const o = e.doppel.get(i) ?? i;
    return [e.punkte[3 * o]!, e.punkte[3 * o + 1]!, e.punkte[3 * o + 2]!];
  };
  // örtliche Nummern
  const lokal = new Map<number, number>();
  const global: number[] = [];
  for (const i of e.dreiecke) if (!lokal.has(i)) {
    lokal.set(i, global.length);
    global.push(i);
  }
  const m = global.length;
  const tri = Int32Array.from(e.dreiecke, (i) => lokal.get(i)!);
  ohrenKippen(tri);
  const P = new Float64Array(3 * m);
  global.forEach((g, k) => P.set(lage(g), 3 * k));
  // Randschleife über gerichtete Randkanten
  const ger = new Set<string>();
  for (let t = 0; t < tri.length; t += 3) for (let k = 0; k < 3; k++) ger.add(`${tri[t + k]}:${tri[t + ((k + 1) % 3)]}`);
  const nach = new Map<number, number>();
  for (const s of ger) {
    const [a, b] = s.split(':').map(Number) as [number, number];
    if (!ger.has(`${b}:${a}`)) nach.set(a, b);
  }
  // Schlitz: Pfadpunkte (Ursprung) und ihre Doppel
  const v0 = lokal.get(e.pfad[0]!)!;
  const winkel = lokal.get(e.pfad[e.pfad.length - 1]!)!;
  const doppelVon = new Map<number, number>();
  for (const [d, o] of e.doppel) doppelVon.set(o, d);
  const v0d = lokal.get(doppelVon.get(e.pfad[0]!)!)!;
  const schlitzSet = new Set<number>();
  for (const p of e.pfad) {
    schlitzSet.add(lokal.get(p)!);
    const d = doppelVon.get(p);
    if (d !== undefined && lokal.has(d)) schlitzSet.add(lokal.get(d)!);
  }
  // Umlauf ab v0: entweder zuerst den Schlitz entlang (bis v0d) oder zuerst die Mittellinie; so drehen, dass der Schlitz vorn steht
  const schleife: number[] = [];
  for (let a = v0, s = 0; s <= nach.size; s++) {
    schleife.push(a);
    a = nach.get(a)!;
    if (a === v0) break;
  }
  const iWinkel = schleife.indexOf(winkel);
  const iD = schleife.indexOf(v0d);
  // Schlitz = Stück zwischen v0 und v0d, das den Mundwinkel enthält
  let reihe: number[];
  if (iWinkel < iD) reihe = schleife;
  else reihe = [v0, ...schleife.slice(1).reverse()];
  const jD = reihe.indexOf(v0d);
  const schlitz = reihe.slice(0, jD + 1);
  const rest = reihe.slice(jD + 1);
  const naht = (k: number) => Math.abs(P[3 * k + 2]!) < 1e-9;
  // rest: unteres Mittelstück (Naht ab v0d), Feldrand, oberes Mittelstück (Naht bis v0)
  let a1 = 0;
  while (a1 < rest.length && naht(rest[a1]!)) a1++;
  let a2 = rest.length;
  while (a2 > a1 && naht(rest[a2 - 1]!)) a2--;
  const mitteUnten = [v0d, ...rest.slice(0, a1)];
  const aussen = rest.slice(Math.max(0, a1 - 1), Math.min(rest.length, a2 + 1));
  const mitteOben = [...rest.slice(a2), v0];
  // Schritt 1: U und V harmonisch (Kotangens)
  const Lk = laplace(m, tri, P, 'kotangens');
  const festU = new Uint8Array(m);
  const wertU = new Float64Array(m);
  for (const k of schlitz) {
    festU[k] = 1;
    wertU[k] = 0;
  }
  for (const k of aussen) {
    festU[k] = 1;
    wertU[k] = 1;
  }
  const U1 = cgDirichlet(Lk, festU, wertU);
  const festV = new Uint8Array(m);
  const wertV = new Float64Array(m);
  for (const k of mitteOben) {
    festV[k] = 1;
    wertV[k] = 0;
  }
  for (const k of mitteUnten) {
    festV[k] = 1;
    wertV[k] = 1;
  }
  const V1 = cgDirichlet(Lk, festV, wertV);
  // Randwerte monoton erzwingen: Schlitz V steigend (0 → 1), Feldrand V fallend (1 → 0), Mittelstücke U steigend vom Schlitz weg
  const u = new Float64Array(m);
  const v = new Float64Array(m);
  const monoton = (folge: number[], werte: Float64Array, von: number, bis: number): number[] => {
    // Werte entlang der Folge zwischen von und bis klemmen und monoton machen (kumulatives Maximum bzw. Minimum)
    const steigt = bis >= von;
    const out: number[] = [];
    let letzt = von;
    folge.forEach((k, i) => {
      let x = i === 0 ? von : i === folge.length - 1 ? bis : werte[k]!;
      x = steigt ? Math.min(bis, Math.max(letzt, x)) : Math.max(bis, Math.min(letzt, x));
      out.push(x);
      letzt = x;
    });
    return out;
  };
  const vs = monoton(schlitz, V1.x, 0, 1);
  schlitz.forEach((k, i) => {
    u[k] = 0;
    v[k] = vs[i]!;
  });
  const va = monoton(aussen, V1.x, 1, 0);
  aussen.forEach((k, i) => {
    u[k] = 1;
    v[k] = va[i]!;
  });
  const uu = monoton(mitteUnten, U1.x, 0, 1);
  mitteUnten.forEach((k, i) => {
    u[k] = uu[i]!;
    v[k] = 1;
  });
  const uo = monoton(mitteOben, U1.x, 1, 0);
  mitteOben.forEach((k, i) => {
    u[k] = uo[i]!;
    v[k] = 0;
  });
  // Schritt 2: Tutte mit positiven Gewichten, Rand fest
  const Lp = laplace(m, tri, P, 'positiv');
  const festR = new Uint8Array(m);
  for (const k of reihe) festR[k] = 1;
  const U2 = cgDirichlet(Lp, festR, u, U1.x);
  const V2 = cgDirichlet(Lp, festR, v, V1.x);
  // Orientierung je Dreieck
  let pos = 0;
  let neg = 0;
  let entartet = 0;
  const flaeche: number[] = [];
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t]!;
    const b = tri[t + 1]!;
    const c = tri[t + 2]!;
    const f = (U2.x[b]! - U2.x[a]!) * (V2.x[c]! - V2.x[a]!) - (V2.x[b]! - V2.x[a]!) * (U2.x[c]! - U2.x[a]!);
    flaeche.push(f);
    if (Math.abs(f) < 1e-14) entartet++;
    else if (f > 0) pos++;
    else neg++;
  }
  const umgeklappt = Math.min(pos, neg);
  return {
    punkte: Int32Array.from(global),
    u: U2.x,
    v: V2.x,
    rand: { schlitz, mitteUnten, aussen, mitteOben },
    dreiecke: Int32Array.from(tri, (k) => global[k]!),
    vWinkel: V2.x[winkel]!,
    umgeklappt,
    entartet,
    schritte: U1.schritte + V1.schritte + U2.schritte + V2.schritte,
  };
}
