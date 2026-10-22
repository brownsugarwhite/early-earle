// Teil A, E2.6 (Plan „Maul als Einsatz“, Fortsetzung 21.10., Abschnitt „E2.6 Leiter — Bauplan“): Leiter — Speichen, die auf der
// Naht enden. Wo eine Falte von A0 den Schlitz kreuzt und auf einer Seite bis zur Naht läuft (Rex mittel: Ring um die
// Schnauzenfront) oder wo der Streifen zwischen Schlitzufer und Naht ein schmaler Keil ist (Robbe hoch), enden die Speichen der
// ersten q Lippenstellen auf der Naht. Hier: Erkennen, Feld am Hals teilen, Karte des Ringfelds. DOM-frei.
import type { Kaefig } from '../../kaefig/halbkanten';
import type { FeldSpec } from './feld';
import type { FeinNetz } from './flaeche';
import { type Karte, karteAusStuecken, ohrenKippen } from './karte';

type V3 = [number, number, number];

/** Seite der Karte: 0 = Schlitzufer ab V = 0 (obere Naht, `mitteOben`), 1 = Ufer ab V = 1 (untere Naht, `mitteUnten`). */
export type LeiterSeite = 0 | 1;

export type LeiterFund = {
  seite: LeiterSeite;
  art: 'falte' | 'keil';
  /** Hals im feinen Netz (globale Nummern der Karte: P als Kopie auf dem eigenen Ufer zuerst, Q auf der Naht zuletzt) */
  hals: number[];
  /** Bogenlänge von P auf dem Schlitz (vom Anfang O) */
  sHals: number;
  /** Schärfe der Falte (Kanten von A0 auf dem Hals; nur 'falte') */
  schaerfe: number;
  /**
   * Stück der Falte auf der Gegenseite, das im Feld endet (Rex mittel: drei Kanten über der Lippe): P als Kopie auf dem anderen
   * Ufer zuerst, dann der Weg bis zum Ende; es läuft auf der Speiche über P (E2.3 a)
   */
  stummel: { pfad: number[]; schaerfe: number; sAnfang: number } | null;
};

/** Nachbarn je Punkt des feinen Netzes. */
function nachbarnVon(netz: FeinNetz): Map<number, Set<number>> {
  const nb = new Map<number, Set<number>>();
  const T = netz.dreiecke;
  for (let t = 0; t < T.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = T[t + k]!;
      const b = T[t + ((k + 1) % 3)]!;
      (nb.get(a) ?? nb.set(a, new Set()).get(a)!).add(b);
      (nb.get(b) ?? nb.set(b, new Set()).get(b)!).add(a);
    }
  return nb;
}

/**
 * Falten von A0, die den Schlitz kreuzen und auf einer Seite die Naht erreichen. Die Faltenkanten von K (Feldkäfig, gleiche
 * Nummern wie das feine Netz) werden im feinen Netz nachgezogen (Kantenpunkt = gemeinsamer Nachbar nahe der Kantenmitte);
 * Schlitz und Falte sind beide Kantenwege im feinen Netz und kreuzen sich deshalb in einem gemeinsamen Punkt P. Von P aus läuft
 * je ein Ast in jede Seite; endet ein Ast auf der Naht (z = 0), ist er der Hals einer Leiter.
 */
export function leiterFalten(k: Kaefig, feld: FeldSpec, netz: FeinNetz, karte: Karte, doppel: Map<number, number>): LeiterFund[] {
  const inM = new Uint8Array(k.nF);
  for (const f of feld.feld) inM[f] = 1;
  const P = (i: number): V3 => [netz.punkte[3 * i]!, netz.punkte[3 * i + 1]!, netz.punkte[3 * i + 2]!];
  const nb = nachbarnVon(netz);
  // Faltenkanten im Feld (rechte Hälfte) als feine Wege
  const faltNb = new Map<number, Set<number>>();
  const faltS = new Map<string, number>();
  const schl = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  const verbinde = (a: number, b: number, s: number) => {
    (faltNb.get(a) ?? faltNb.set(a, new Set()).get(a)!).add(b);
    (faltNb.get(b) ?? faltNb.set(b, new Set()).get(b)!).add(a);
    faltS.set(schl(a, b), s);
  };
  for (let e = 0; e < k.nE; e++) {
    const s = k.eSchaerfe[e]!;
    if (!(s > 0)) continue;
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    if (k.xyz[3 * a + 2]! < -1e-9 || k.xyz[3 * b + 2]! < -1e-9) continue;
    const h = k.eHalb[e]!;
    const tw = k.hTwin[h]!;
    if (!inM[k.hFace[h]!] && !(tw >= 0 && inM[k.hFace[tw]!])) continue;
    if (nb.get(a)?.has(b)) {
      verbinde(a, b, s);
      continue;
    }
    const pa = P(a);
    const pb = P(b);
    const mitte: V3 = [0.5 * (pa[0] + pb[0]), 0.5 * (pa[1] + pb[1]), 0.5 * (pa[2] + pb[2])];
    let best = -1;
    let bd = Infinity;
    for (const c of nb.get(a) ?? []) {
      if (!nb.get(b)?.has(c)) continue;
      const pc = P(c);
      const d = Math.hypot(pc[0] - mitte[0], pc[1] - mitte[1], pc[2] - mitte[2]);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best < 0) continue;
    verbinde(a, best, s);
    verbinde(best, b, s);
  }
  if (!faltNb.size) return [];
  // Schlitz: Ufer A (Ursprungsnummern) von O zum Mundwinkel, Bogenlänge
  const schlitz = karte.rand.schlitz;
  const iW = (schlitz.length - 1) / 2;
  const glob = (l: number) => karte.punkte[l]!;
  const orig = (g: number) => doppel.get(g) ?? g;
  const uferA = schlitz.slice(0, iW + 1).map((l) => orig(glob(l)));
  const sA = [0];
  for (let i = 1; i < uferA.length; i++) {
    const a = P(uferA[i - 1]!);
    const b = P(uferA[i]!);
    sA.push(sA[i - 1]! + Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  }
  const kIdx = new Map<number, number>();
  karte.punkte.forEach((g, i) => kIdx.set(g, i));
  const funde: LeiterFund[] = [];
  const aufSchlitz = new Set(uferA);
  // Kreuzungen: Schlitzpunkte (ohne O und den Mundwinkel) auf einer Falte; ein Ast beginnt beim letzten Schlitzpunkt, an dem die
  // Falte den Schlitz verlässt (läuft sie ein Stück auf dem Schlitz, zählt nur der Schritt hinaus)
  const stummel: { seite: LeiterSeite; pfad: number[]; schaerfe: number; i: number }[] = [];
  for (let i = 1; i < iW; i++) {
    const p = uferA[i]!;
    const nbP = faltNb.get(p);
    if (!nbP) continue;
    for (const erster of nbP) {
      if (aufSchlitz.has(erster)) continue;
      // Ast ablaufen (ohne Verzweigung), Schärfe = kleinste auf dem Weg
      const ast = [p, erster];
      let schaerfe = faltS.get(schl(p, erster)) ?? 0;
      let vor = p;
      let cur = erster;
      for (let n = 0; n < 4096; n++) {
        if (Math.abs(P(cur)[2]) < 1e-9) break;
        const weiter = [...(faltNb.get(cur) ?? [])].filter((x) => x !== vor);
        if (weiter.length !== 1) break;
        vor = cur;
        cur = weiter[0]!;
        schaerfe = Math.min(schaerfe, faltS.get(schl(vor, cur)) ?? 0);
        ast.push(cur);
      }
      const ende = ast[ast.length - 1]!;
      if (ast.length < 3) continue;
      // Seite: V des zweiten Astpunkts gegen V_c
      const ki = kIdx.get(ast[1]!);
      if (ki === undefined) continue;
      const seite: LeiterSeite = karte.v[ki]! < karte.vWinkel ? 0 : 1;
      // P als Kopie auf dem eigenen Ufer (A: Ursprung, B: Doppel)
      const pKopie = seite === 1 ? glob(schlitz[2 * iW - i]!) : p;
      if (Math.abs(P(ende)[2]) >= 1e-9) {
        stummel.push({ seite, pfad: [pKopie, ...ast.slice(1)], schaerfe, i });
        continue;
      }
      funde.push({ seite, art: 'falte', hals: [pKopie, ...ast.slice(1)], sHals: sA[i]!, schaerfe, stummel: null });
    }
  }
  // Stück auf der Gegenseite einer Leiter: dieselbe Falte, die den Schlitz höchstens drei Punkte daneben verlässt (läuft sie ein
  // Stück auf dem Schlitz — Rex mittel gerade —, beginnt es nicht genau an P)
  for (const f of funde) {
    const iP = uferA.indexOf(f.seite === 0 ? f.hals[0]! : orig(f.hals[0]!));
    let best: (typeof stummel)[number] | null = null;
    for (const st of stummel) if (st.seite !== f.seite && Math.abs(st.i - iP) <= 3 && (!best || Math.abs(st.i - iP) < Math.abs(best.i - iP))) best = st;
    if (best) f.stummel = { pfad: best.pfad, schaerfe: best.schaerfe, sAnfang: sA[best.i]! };
  }
  return funde;
}

/**
 * Leiterfeld: die Dreiecke der Karte zwischen Schlitzufer (O … P), Hals (P … Q) und Naht (Q … O), gefüllt vom ersten
 * Schlitzdreieck am Anfang, ohne über den Hals zu gehen. Ergebnis: Dreiecksnummern der Karte.
 */
export function leiterDreiecke(karte: Karte, fund: LeiterFund): Set<number> {
  const T = karte.dreiecke;
  const nT = T.length / 3;
  const schl = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  const anKante = new Map<string, number[]>();
  for (let t = 0; t < nT; t++)
    for (let k = 0; k < 3; k++) {
      const s = schl(T[3 * t + k]!, T[3 * t + ((k + 1) % 3)]!);
      (anKante.get(s) ?? anKante.set(s, []).get(s)!).push(t);
    }
  const gesperrt = new Set<string>();
  for (let i = 0; i + 1 < fund.hals.length; i++) gesperrt.add(schl(fund.hals[i]!, fund.hals[i + 1]!));
  const schlitz = karte.rand.schlitz;
  const glob = (l: number) => karte.punkte[l]!;
  const kante = fund.seite === 0 ? schl(glob(schlitz[0]!), glob(schlitz[1]!)) : schl(glob(schlitz[schlitz.length - 1]!), glob(schlitz[schlitz.length - 2]!));
  const start = anKante.get(kante)?.[0];
  if (start === undefined) throw new Error('Leiter: erstes Schlitzdreieck fehlt');
  const drin = new Set<number>([start]);
  const stapel = [start];
  while (stapel.length) {
    const t = stapel.pop()!;
    for (let k = 0; k < 3; k++) {
      const s = schl(T[3 * t + k]!, T[3 * t + ((k + 1) % 3)]!);
      if (gesperrt.has(s)) continue;
      for (const u of anKante.get(s) ?? [])
        if (!drin.has(u)) {
          drin.add(u);
          stapel.push(u);
        }
    }
  }
  if (drin.size * 2 > nT) throw new Error(`Leiter: Leiterfeld nicht abgeschlossen (${drin.size} von ${nT} Dreiecken)`);
  return drin;
}

/**
 * Karte des Ringfelds (Halbfeld ohne Leiterfelder): U = 0 auf der Lippe ab P, V = 0 bzw. 1 auf Hals + Naht hinter Q, sonst wie die
 * Karte des Halbfelds (`karteAusStuecken`, Schritt 1 konform, Schritt 2 Tutte). Der Hals steht etwa senkrecht auf der Lippe —
 * die Karte staucht dort nicht.
 */
export function ringKarte(karte: Karte, netz: FeinNetz, doppel: Map<number, number>, funde: readonly LeiterFund[]): Karte {
  const T = karte.dreiecke;
  const nT = T.length / 3;
  const raus = new Set<number>();
  for (const f of funde) for (const t of leiterDreiecke(karte, f)) raus.add(t);
  const lokal = new Map<number, number>();
  const global: number[] = [];
  const tri: number[] = [];
  for (let t = 0; t < nT; t++) {
    if (raus.has(t)) continue;
    for (let k = 0; k < 3; k++) {
      const g = T[3 * t + k]!;
      if (!lokal.has(g)) {
        lokal.set(g, global.length);
        global.push(g);
      }
      tri.push(lokal.get(g)!);
    }
  }
  const Pos = new Float64Array(3 * global.length);
  global.forEach((g, i) => {
    const o = doppel.get(g) ?? g;
    Pos[3 * i] = netz.punkte[3 * o]!;
    Pos[3 * i + 1] = netz.punkte[3 * o + 1]!;
    Pos[3 * i + 2] = netz.punkte[3 * o + 2]!;
  });
  const glob = (l: number) => karte.punkte[l]!;
  const lok = (g: number) => {
    const i = lokal.get(g);
    if (i === undefined) throw new Error(`Leiter: Randpunkt ${g} nicht im Ringfeld`);
    return i;
  };
  let schlitz = karte.rand.schlitz.map(glob);
  let mitteOben = karte.rand.mitteOben.map(glob);
  let mitteUnten = karte.rand.mitteUnten.map(glob);
  const aussen = karte.rand.aussen.map(glob);
  for (const f of funde) {
    const p = f.hals[0]!;
    const q = f.hals[f.hals.length - 1]!;
    const iP = schlitz.indexOf(p);
    if (iP < 0) throw new Error('Leiter: P nicht auf dem Schlitz');
    if (f.seite === 0) {
      schlitz = schlitz.slice(iP);
      const iQ = mitteOben.indexOf(q);
      if (iQ < 0) throw new Error('Leiter: Q nicht auf der oberen Naht');
      mitteOben = [...mitteOben.slice(0, iQ + 1), ...[...f.hals].reverse().slice(1)];
    } else {
      schlitz = schlitz.slice(0, iP + 1);
      const iQ = mitteUnten.indexOf(q);
      if (iQ < 0) throw new Error('Leiter: Q nicht auf der unteren Naht');
      mitteUnten = [...f.hals, ...mitteUnten.slice(iQ + 1)];
    }
  }
  const winkelG = glob(karte.rand.schlitz[(karte.rand.schlitz.length - 1) / 2]!);
  // Ohren am Hals kippen (ein Dreieck mit zwei Halskanten hätte in der Karte Fläche null)
  const dreiecke = Int32Array.from(tri);
  ohrenKippen(dreiecke);
  return karteAusStuecken(dreiecke, Pos, global, { schlitz: schlitz.map(lok), mitteUnten: mitteUnten.map(lok), aussen: aussen.map(lok), mitteOben: mitteOben.map(lok) }, lok(winkelG));
}

/**
 * Keil: Auf einer Seite wächst der Abstand w(s) zwischen Schlitzufer und Naht derselben Seite langsamer als s/2 (Robbe hoch:
 * die Linie läuft knapp unter der Kopfnaht, ≈ 22°; bei J eine Engstelle von 0,5 Kanten). Dort staucht die Karte den Streifen, und
 * im Kernring liefen Reihen und Speichen beide längs. Hals an der ersten Stelle hinter der Enge, an der der Keil Platz für drei
 * Feldkanten hat, kürzester Kantenweg vom Ufer zur Naht.
 */
export function leiterKeile(netz: FeinNetz, karte: Karte, doppel: Map<number, number>, kante: number): LeiterFund[] {
  const P = (g: number): V3 => {
    const o = doppel.get(g) ?? g;
    return [netz.punkte[3 * o]!, netz.punkte[3 * o + 1]!, netz.punkte[3 * o + 2]!];
  };
  const d3 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const schlitz = karte.rand.schlitz.map((l) => karte.punkte[l]!);
  const iW = (schlitz.length - 1) / 2;
  const funde: LeiterFund[] = [];
  for (const seite of [0, 1] as LeiterSeite[]) {
    const ufer = seite === 0 ? schlitz.slice(0, iW + 1) : schlitz.slice(iW).reverse();
    const naht = (seite === 0 ? karte.rand.mitteOben : karte.rand.mitteUnten).map((l) => karte.punkte[l]!);
    const nahtP = naht.map(P);
    const s = [0];
    for (let i = 1; i < ufer.length; i++) s.push(s[i - 1]! + d3(P(ufer[i - 1]!), P(ufer[i]!)));
    const L = s[s.length - 1]!;
    const w = ufer.map((g) => Math.min(...nahtP.map((q) => d3(P(g), q))));
    // eng: w < s/2 zwischen 20 % und 50 % der Linie
    let eng = false;
    for (let i = 0; i < ufer.length; i++) if (s[i]! >= 0.2 * L && s[i]! <= 0.5 * L && w[i]! < 0.5 * s[i]!) eng = true;
    if (!eng) continue;
    // Hals: erste Stelle hinter der letzten Enge (bis 70 %), an der w ≥ 3 Feldkanten
    let letzteEnge = 0;
    for (let i = 0; i < ufer.length; i++) if (s[i]! <= 0.7 * L && w[i]! < 0.5 * s[i]! && s[i]! >= 0.2 * L) letzteEnge = i;
    let iH = -1;
    for (let i = letzteEnge + 1; i < ufer.length - 1; i++)
      if (w[i]! >= 3 * kante) {
        iH = i;
        break;
      }
    if (iH < 0 || s[iH]! > 0.8 * L) continue;
    // kürzester Kantenweg im aufgeschnittenen Halbfeld vom Uferpunkt zur Naht dieser Seite (Dijkstra)
    const nb = new Map<number, number[]>();
    const T = karte.dreiecke;
    for (let t = 0; t < T.length; t += 3)
      for (let k = 0; k < 3; k++) {
        const a = T[t + k]!;
        const b = T[t + ((k + 1) % 3)]!;
        (nb.get(a) ?? nb.set(a, []).get(a)!).push(b);
        (nb.get(b) ?? nb.set(b, []).get(b)!).push(a);
      }
    const ziel = new Set(naht);
    const schlitzSet = new Set(schlitz);
    const start = ufer[iH]!;
    const dist = new Map<number, number>([[start, 0]]);
    const vor = new Map<number, number>();
    const offen = new Set([start]);
    let ende = -1;
    while (offen.size) {
      let u = -1;
      let du = Infinity;
      for (const x of offen) if (dist.get(x)! < du) {
        du = dist.get(x)!;
        u = x;
      }
      offen.delete(u);
      if (ziel.has(u)) {
        ende = u;
        break;
      }
      for (const v of nb.get(u) ?? []) {
        if (schlitzSet.has(v)) continue;
        const dv = du + d3(P(u), P(v));
        if (dv < (dist.get(v) ?? Infinity)) {
          dist.set(v, dv);
          vor.set(v, u);
          offen.add(v);
        }
      }
    }
    if (ende < 0) continue;
    const hals = [ende];
    while (hals[hals.length - 1] !== start) hals.push(vor.get(hals[hals.length - 1]!)!);
    hals.reverse();
    funde.push({ seite, art: 'keil', hals, sHals: s[iH]!, schaerfe: 0, stummel: null });
  }
  return funde;
}

/** Weg in der Leiterkarte: Bogenlänge (Lage) und Kartenlage je Punkt, für Punkte nach Bogenlänge */
export type KartenWeg = { s: number[]; u: number[]; v: number[]; p: V3[] };

/**
 * Karte des Leiterfelds (E2.6): Lippe und Naht hinter X_1 liegen auf gegenüberliegenden Seiten (U = 0 bzw. 1), die Sprossen sind
 * V-Linien; Naht vor X_1 und Hals die Enden (V = 0 bzw. 1, je nach Seite vertauscht). X_1 ist der Nahtpunkt nächst der
 * Bogenlänge `sX1` ab O. Dazu die vier Wege mit Bogenlänge und Kartenlage (Lippe O → P, Hals P → Q, Naht O → Q).
 */
export function leiterKarte(karte: Karte, netz: FeinNetz, doppel: Map<number, number>, fund: LeiterFund, sX1: number): { karte: Karte; lippe: KartenWeg; hals: KartenWeg; naht: KartenWeg; x1: number } {
  const T = karte.dreiecke;
  const drin = leiterDreiecke(karte, fund);
  const lokal = new Map<number, number>();
  const global: number[] = [];
  const tri: number[] = [];
  for (const t of [...drin].sort((a, b) => a - b))
    for (let k = 0; k < 3; k++) {
      const g = T[3 * t + k]!;
      if (!lokal.has(g)) {
        lokal.set(g, global.length);
        global.push(g);
      }
      tri.push(lokal.get(g)!);
    }
  const P = (g: number): V3 => {
    const o = doppel.get(g) ?? g;
    return [netz.punkte[3 * o]!, netz.punkte[3 * o + 1]!, netz.punkte[3 * o + 2]!];
  };
  const Pos = new Float64Array(3 * global.length);
  global.forEach((g, i) => Pos.set(P(g), 3 * i));
  const schlitz = karte.rand.schlitz.map((l) => karte.punkte[l]!);
  const iW = (schlitz.length - 1) / 2;
  const p0 = fund.hals[0]!;
  const q0 = fund.hals[fund.hals.length - 1]!;
  // Lippe O → P und Naht O → Q (globale Nummern)
  const iP = schlitz.indexOf(p0);
  const lippe = fund.seite === 0 ? schlitz.slice(0, iP + 1) : schlitz.slice(iP).reverse();
  const nahtAlle = fund.seite === 0 ? [...karte.rand.mitteOben].reverse().map((l) => karte.punkte[l]!) : karte.rand.mitteUnten.map((l) => karte.punkte[l]!);
  const iQ = nahtAlle.indexOf(q0);
  if (iP < 0 || iQ < 0 || iP > (fund.seite === 0 ? iW : 2 * iW)) throw new Error('Leiter: Ränder des Leiterfelds');
  const naht = nahtAlle.slice(0, iQ + 1);
  const bogen = (w: number[]) => {
    const s = [0];
    for (let i = 1; i < w.length; i++) {
      const a = P(w[i - 1]!);
      const b = P(w[i]!);
      s.push(s[i - 1]! + Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
    }
    return s;
  };
  const sN = bogen(naht);
  let ix = 1;
  for (let i = 1; i < naht.length - 1; i++) if (Math.abs(sN[i]! - sX1) < Math.abs(sN[ix]! - sX1)) ix = i;
  ix = Math.min(naht.length - 2, Math.max(1, ix));
  const vorX = naht.slice(0, ix + 1);
  const nachX = naht.slice(ix);
  const lok = (w: number[]) => w.map((g) => lokal.get(g)!);
  const hals = fund.hals;
  const stuecke =
    fund.seite === 0
      ? { schlitz: lok(lippe), mitteUnten: lok(hals), aussen: lok([...nachX].reverse()), mitteOben: lok([...vorX].reverse()) }
      : { schlitz: lok([...lippe].reverse()), mitteUnten: lok(vorX), aussen: lok(nachX), mitteOben: lok([...hals].reverse()) };
  const dreiecke = Int32Array.from(tri);
  ohrenKippen(dreiecke);
  const lk = karteAusStuecken(dreiecke, Pos, global, stuecke);
  const weg = (w: number[]): KartenWeg => ({ s: bogen(w), u: w.map((g) => lk.u[lokal.get(g)!]!), v: w.map((g) => lk.v[lokal.get(g)!]!), p: w.map(P) });
  return { karte: lk, lippe: weg(lippe), hals: weg(hals), naht: weg(naht), x1: sN[ix]! };
}

/** Kartenlage auf einem Weg bei Bogenlänge s (stückweise linear) */
export function wegBei(w: KartenWeg, s: number): { u: number; v: number } {
  let i = 0;
  while (i + 2 < w.s.length && w.s[i + 1]! < s) i++;
  const f = w.s[i + 1]! > w.s[i]! ? Math.min(1, Math.max(0, (s - w.s[i]!) / (w.s[i + 1]! - w.s[i]!))) : 0;
  return { u: w.u[i]! + f * (w.u[i + 1]! - w.u[i]!), v: w.v[i]! + f * (w.v[i + 1]! - w.v[i]!) };
}

/** Bogenlänge des Fußpunkts von p auf einem Weg */
export function wegFuss(w: KartenWeg, p: V3): number {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i + 1 < w.p.length; i++) {
    const a = w.p[i]!;
    const b = w.p[i + 1]!;
    const e: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l2 = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
    const t = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * e[0] + (p[1] - a[1]) * e[1] + (p[2] - a[2]) * e[2]) / l2)) : 0;
    const d = Math.hypot(a[0] + t * e[0] - p[0], a[1] + t * e[1] - p[1], a[2] + t * e[2] - p[2]);
    if (d < bd) {
      bd = d;
      best = w.s[i]! + t * (w.s[i + 1]! - w.s[i]!);
    }
  }
  return best;
}
