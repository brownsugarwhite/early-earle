// Teil A, E2.6 (Plan „Maul als Einsatz“, Fortsetzung 21.10., „E2.6 Leiter — Bauplan“): Gitter mit Leiter. Das Ringfeld
// (Halbfeld ohne Leiterfeld, eigene Karte `ringKarte`) trägt den Kernring als L-förmiges Gitter: Auf der Leiterseite beginnen
// die Reihen 0 … t an der Halsspeiche (ihre Enden liegen auf dem Hals), die Reihen t + 1 … J eine Speiche früher auf der Naht
// hinter Q; Q selbst ist ein Randpunkt zwischen beiden, die Halszelle [(t, q), (t + 1, q), (t + 1, q − 1), Q] schließt die
// Ecke. Das Leiterfeld bekommt Holme (Reihen 1 … t) und Sprossen (Speichen 1 … q, auf der Naht endend) in seiner eigenen Karte.
// Ohne Leiter bleibt `kernGitter` unberührt (bitgleich). DOM-frei.
import { type NormalZeile, normalSystem } from '../../loeser/normalSystem';
import { type KartenWeg, wegBei, wegFuss } from './leiter';
import type { KernGitterOptionen } from './topologie';
import { nahtBogen } from './topologie';

type V3 = [number, number, number];

/** Leiter im Ringgitter: Seite (0 = V = 0, 1 = V = 1), Halsspeiche (Indexraum der Reihen ≥ 1), Holme t, Lage von Q (U auf dem Rand) */
export type LeiterImRing = { seite: 0 | 1; q: number; t: number; uQ: number };

export type RingGitter = {
  /** je Reihe (0: 2m + 1, sonst S + 1) Kartenlage und Lage; fehlende Punkte (Leiterfeld, Ecke des L) NaN bzw. null */
  u: number[][];
  v: number[][];
  lagen: (V3 | null)[][];
  /** Q je Leiter (Kartenlage, Lage) */
  Q: { u: number; v: number; p: V3 }[];
  /** erste und letzte Speiche je Reihe */
  kA: number[];
  kB: number[];
  umgeklappt: number;
};

/**
 * Kernring-Gitter im Ringfeld (wie `kernGitter`: innere Stufe in ζ' um c, äußere in der Karte, Reihe J_i fest, Fächer, Ausgleich
 * außen und an der Stufennaht), mit den Speichen je Reihe von kA(r) bis kB(r). Die Leiterseite liegt auf dem Kartenrand V = 0
 * (Seite 0) bzw. V = 1 (Seite 1): Hals und Naht hinter Q; Reihe r endet dort bei U' = u_r (Naht nach Bogenlänge), die Reihen
 * mit u_r < U'(Q) auf dem Hals. `q` je Leiter ist die Halsspeiche im Indexraum der Reihen ≥ 1 (Seite 0: q, Seite 1: S − q).
 */
export function kernGitterL(umkehrKarte: (u: number, v: number) => { p: V3; n: V3 }, uR: number[], thetaIn: Float64Array, thetaOut: Float64Array, lippe: V3[], rand: V3[], vc: number, uc: number, a: number, leitern: readonly LeiterImRing[], opt: KernGitterOptionen = {}, pins: readonly { r: number; k: number; u: number; v: number }[] = []): RingGitter {
  const nb = opt.naht === 'bogenKarte' ? nahtBogen(umkehrKarte, vc) : null;
  const umkehr = nb ? (u: number, v: number) => umkehrKarte(nb.zurueck(u, v), v) : umkehrKarte;
  const J = uR.length - 1;
  const m = (thetaIn.length - 1) / 2;
  const S = 2 * m + 4;
  const M = S / 2;
  if (J < 3) throw new Error(`Kernring: J = ${J} zu klein`);
  // Stufennaht J_i: nie die Reihe, die einer Spitze auf der Naht am nächsten liegt (sonst rückt die Nachbarreihe auf die Spitze
  // und zwei Reihen liegen an der Naht dicht beieinander — Robbe hoch: 1,1 px, Haut 0,48 px)
  const ji0 = Math.min(J - 1, Math.max(2, opt.jInnen ?? Math.round(J / 2)));
  const naechsteReihe = (q: { seite: 0 | 1; u: number }) => {
    const u2 = nb ? nb.hin(q.u, q.seite) : q.u;
    let r = 1;
    for (let w = 2; w < J; w++) if (Math.abs(uR[w]! - u2) < Math.abs(uR[r]! - u2)) r = w;
    return r;
  };
  const besetzt = new Set((opt.nahtLagen ?? []).map(naechsteReihe));
  const Ji = opt.jInnen !== undefined || !besetzt.has(ji0) ? ji0 : [ji0 + 1, ji0 - 1].find((w) => w >= 2 && w <= J - 1 && !besetzt.has(w)) ?? ji0;
  const aussenRunden = opt.aussenRunden ?? 0;
  const xc = (a * uc) ** 2;
  const wurzel = (x: number, y: number, seite: number): [number, number] => {
    const r = Math.hypot(x, y);
    const re = Math.sqrt(Math.max(0, 0.5 * (r + x)));
    const im = Math.sqrt(Math.max(0, 0.5 * (r - x)));
    return [re, y < 0 || (y === 0 && seite < 0) ? -im : im];
  };
  const nachZ = (u: number, v: number): [number, number] => {
    const zr = a * u;
    const zi = vc - v;
    return wurzel(zr * zr - zi * zi - xc, 2 * zr * zi, zi);
  };
  const ausZ = (x: number, y: number): [number, number] => {
    const z = wurzel(x * x - y * y + xc, 2 * x * y, y);
    return [z[0] / a, vc - z[1]];
  };
  const l0 = leitern.find((l) => l.seite === 0);
  const l1 = leitern.find((l) => l.seite === 1);
  // erste/letzte Speiche je Reihe (Reihe 0 im Lippenindex 0 … 2m)
  const kA = Array.from({ length: J + 1 }, (_, r) => (!l0 ? 0 : r <= l0.t ? l0.q : l0.q - 1));
  // Reihe 0 im Lippenindex: Hals oben an U_q (Index q), Hals unten an D_j mit Speiche S − j = q₁ → Lippenindex 2m − j = q₁ − 4
  const kB = Array.from({ length: J + 1 }, (_, r) => (r === 0 ? (!l1 ? 2 * m : l1.q - 4) : !l1 ? S : r <= l1.t ? l1.q : l1.q + 1));
  const nachKarte = uR.map((u, r) => (r === 0 ? 0 : r === J ? 1 : u));
  const uOben = nachKarte.slice();
  const uUnten = nachKarte.slice();
  // scharfe Punkte von A0 auf der Naht: der Nahtpunkt der nächsten Reihe (nicht J_i, nicht auf dem Hals) genau auf sie
  for (const q of opt.nahtLagen ?? []) {
    const u2 = nb ? nb.hin(q.u, q.seite) : q.u;
    const l = q.seite === 0 ? l0 : l1;
    let r = -1;
    for (let w = 1; w < J; w++) if (w !== Ji && !(l && w <= l.t) && (r < 0 || Math.abs(uR[w]! - u2) < Math.abs(uR[r]! - u2))) r = w;
    if (r > 0) (q.seite === 0 ? uOben : uUnten)[r] = u2;
  }
  const n0 = 2 * m + 1;
  const id = (r: number, k: number) => (r === 0 ? k : n0 + (r - 1) * (S + 1) + k);
  const nGitter = n0 + J * (S + 1);
  const nQ = leitern.length;
  const nK = nGitter + nQ;
  const da = (r: number, k: number) => k >= kA[r]! && k <= kB[r]!;
  const U = new Float64Array(nK).fill(Number.NaN);
  const V = new Float64Array(nK).fill(Number.NaN);
  const L3 = new Array<V3 | null>(nK).fill(null);
  const setze = (i: number, u: number, v: number, p?: V3) => {
    U[i] = u;
    V[i] = v;
    if (p) L3[i] = p;
  };
  for (let k = kA[0]!; k <= kB[0]!; k++) setze(id(0, k), k === m ? uc : 0, k === m ? vc : thetaIn[k]!, lippe[k]!);
  // Feldrand: Randpunkt j = k − kA(J)
  for (let k = kA[J]!; k <= kB[J]!; k++) setze(id(J, k), 1, thetaOut[k - kA[J]!]!, rand[k - kA[J]!]!);
  for (let r = 1; r < J; r++) {
    setze(id(r, kA[r]!), uOben[r]!, 0);
    setze(id(r, kB[r]!), uUnten[r]!, 1);
  }
  const qId = (s: 0 | 1) => nGitter + leitern.findIndex((l) => l.seite === s);
  if (l0) setze(qId(0), l0.uQ, 0);
  if (l1) setze(qId(1), l1.uQ, 1);
  // Reihe J_i: über den Lippenstellen gerade, der Fächer gleichmäßig zwischen der letzten Lippenstelle und V_c; die Speiche des
  // L-Knicks (beginnt in Reihe t + 1 auf der Naht, Reihe J_i jenseits davon) halb zwischen Naht und Nachbarspeiche
  {
    const ui = uR[Ji]!;
    const vVon = (k: number) => {
      if (k < m) return thetaIn[k]!;
      if (k > M + 2) return thetaIn[k - 4]!;
      if (k <= M) return thetaIn[m - 1]! + ((k - m + 1) / 3) * (vc - thetaIn[m - 1]!);
      return vc + ((k - M) / 3) * (thetaIn[m + 1]! - vc);
    };
    for (let k = kA[Ji]! + 1; k < kB[Ji]!; k++) {
      let v = vVon(k);
      if (l0 && Ji > l0.t && k === l0.q) v = 0.5 * vVon(k + 1);
      if (l1 && Ji > l1.t && k === l1.q) v = 0.5 * (1 + vVon(k - 1));
      setze(id(Ji, k), ui, v);
    }
  }
  // Kanten (Lippe → Reihe 1, Reihen, Speichen, Halszellen)
  const kanten: [number, number][] = [];
  for (let k = kA[0]!; k <= m; k++) if (da(1, k)) kanten.push([id(0, k), id(1, k)]);
  for (let k = m; k <= kB[0]!; k++) if (da(1, k + 4)) kanten.push([id(0, k), id(1, k + 4)]);
  kanten.push([id(0, m), id(1, M)]);
  for (let r = 1; r <= J; r++) for (let k = kA[r]!; k < kB[r]!; k++) kanten.push([id(r, k), id(r, k + 1)]);
  for (let r = 1; r < J; r++) for (let k = 0; k <= S; k++) if (da(r, k) && da(r + 1, k)) kanten.push([id(r, k), id(r + 1, k)]);
  if (l0) kanten.push([id(l0.t, l0.q), qId(0)], [qId(0), id(l0.t + 1, l0.q - 1)]);
  if (l1) kanten.push([id(l1.t, l1.q), qId(1)], [qId(1), id(l1.t + 1, l1.q + 1)]);
  const reihe = (i: number) => (i >= nGitter ? -1 : i < n0 ? 0 : Math.floor((i - n0) / (S + 1)) + 1);
  const spalte = (i: number) => (i >= nGitter || i < n0 ? -1 : (i - n0) % (S + 1));
  const gepinnt = new Set<number>();
  const frei = (i: number) => {
    const r = reihe(i);
    const k = spalte(i);
    return r > 0 && r < J && r !== Ji && k > kA[r]! && k < kB[r]! && !gepinnt.has(i);
  };
  const gewicht = new Float64Array(kanten.length).fill(1);
  // feste Punkte auf einer Falte (Stück über P, E2.3 a): Kartenlage (U der Karte → U')
  for (const pn of pins) {
    const i = id(pn.r, pn.k);
    U[i] = nb ? nb.hin(pn.u, pn.v) : pn.u;
    V[i] = pn.v;
    gepinnt.add(i);
  }
  const stufe = (innen: boolean) => {
    // Q gehört zu beiden Stufen nur als fester Randpunkt (seine Kanten verbinden feste Punkte)
    const imBereich = (i: number) => {
      const r = reihe(i);
      if (r < 0) return true;
      return innen ? r <= Ji : r >= Ji;
    };
    const koord = (i: number): [number, number] => (innen ? nachZ(U[i]!, V[i]!) : [a * U[i]!, V[i]!]);
    const unb = new Int32Array(nK).fill(-1);
    const liste: number[] = [];
    for (let r = 1; r < J; r++)
      for (let k = kA[r]! + 1; k < kB[r]!; k++) {
        const i = id(r, k);
        if (!imBereich(i) || !frei(i)) continue;
        unb[i] = liste.length;
        liste.push(i);
      }
    const n = liste.length;
    if (!n) return;
    const zeilen: NormalZeile[] = [];
    const nachbarn: number[][] = Array.from({ length: n }, () => []);
    const b0 = new Float64Array(n);
    const b1 = new Float64Array(n);
    kanten.forEach(([p, q], e) => {
      if (!imBereich(p) || !imBereich(q)) return;
      const w = gewicht[e]!;
      const i = unb[p]!;
      const j = unb[q]!;
      if (i >= 0 && j >= 0) {
        zeilen.push({ index: [i, j], wert: [1, -1], gewicht: w });
        nachbarn[i]!.push(j);
        nachbarn[j]!.push(i);
      } else if (i >= 0 || j >= 0) {
        const f = i >= 0 ? i : j;
        const z = koord(i >= 0 ? q : p);
        zeilen.push({ index: [f], wert: [1], gewicht: w });
        b0[f] = b0[f]! + w * z[0];
        b1[f] = b1[f]! + w * z[1];
      }
    });
    const sys = normalSystem(n, zeilen, nachbarn);
    const x0 = sys.loesenSpalte(b0);
    const x1 = sys.loesenSpalte(b1);
    liste.forEach((p, i) => {
      const [u, v] = innen ? ausZ(x0[i]!, x1[i]!) : [x0[i]! / a, x1[i]!];
      U[p] = u;
      V[p] = v;
    });
  };
  stufe(true);
  if (opt.faecher) {
    const ids = [m, m + 1, M, M + 1, M + 2].map((k) => id(1, k));
    const ziel = opt.faecher(ids.map((i) => umkehr(U[i]!, V[i]!).p));
    ids.forEach((i, q) => {
      U[i] = nb ? nb.hin(ziel[q]!.u, ziel[q]!.v) : ziel[q]!.u;
      V[i] = ziel[q]!.v;
      gepinnt.add(i);
    });
    stufe(true);
  }
  stufe(false);
  const lage3 = (i: number): V3 => L3[i] ?? umkehr(U[i]!, V[i]!).p;
  for (let runde = 0; runde < aussenRunden; runde++) {
    const Lm = new Map<number, V3>();
    const lage = (i: number) => {
      let p = Lm.get(i);
      if (!p) {
        p = lage3(i);
        Lm.set(i, p);
      }
      return p;
    };
    const neu = new Float64Array(kanten.length).fill(Number.NaN);
    const werte: number[] = [];
    kanten.forEach(([p0, q0], e) => {
      const rp = reihe(p0);
      const rq = reihe(q0);
      if ((rp >= 0 && rp < Ji) || (rq >= 0 && rq < Ji)) return;
      const p = lage(p0);
      const q = lage(q0);
      const l3 = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      const l2 = Math.hypot(a * (U[p0]! - U[q0]!), V[p0]! - V[q0]!);
      if (!(l2 > 0)) return;
      neu[e] = l3 / l2;
      werte.push(l3 / l2);
    });
    werte.sort((x, y) => x - y);
    const med = werte[werte.length >> 1] || 1;
    for (let e = 0; e < kanten.length; e++) if (!Number.isNaN(neu[e]!)) gewicht[e] = Math.sqrt(gewicht[e]! * Math.min(50, Math.max(0.02, neu[e]! / med)));
    stufe(false);
  }
  for (let runde = 0; runde < (opt.nahtAusgleich ?? 0); runde++) {
    const von = kA[Ji]!;
    const bis = kB[Ji]!;
    const neuV: number[] = [];
    for (let k = von + 1; k < bis; k++) neuV.push(da(Ji - 1, k) && da(Ji + 1, k) ? 0.5 * (V[id(Ji - 1, k)]! + V[id(Ji + 1, k)]!) : V[id(Ji, k)]!);
    let vor = V[id(Ji, von)]!;
    for (let k = von + 1; k < bis; k++) {
      const nach = k + 1 < bis ? neuV[k - von]! : V[id(Ji, bis)]!;
      const v = Math.min(Math.max(neuV[k - von - 1]!, vor + 1e-6), nach - 1e-6);
      V[id(Ji, k)] = v;
      vor = v;
    }
    stufe(true);
    stufe(false);
  }
  // Prüfung: Umlaufsinn aller Hautzellen (innen in ζ', außen in der Karte)
  const zellen: number[][] = [];
  for (let k = kA[0]!; k < m; k++) if (da(1, k) && da(1, k + 1)) zellen.push([id(0, k), id(0, k + 1), id(1, k + 1), id(1, k)]);
  zellen.push([id(0, m), id(1, M), id(1, M - 1), id(1, M - 2)]);
  zellen.push([id(0, m), id(1, M + 2), id(1, M + 1), id(1, M)]);
  for (let k = m; k < kB[0]!; k++) zellen.push([id(0, k), id(0, k + 1), id(1, k + 5), id(1, k + 4)]);
  for (let r = 1; r < J; r++) for (let k = 0; k < S; k++) if (da(r, k) && da(r, k + 1) && da(r + 1, k) && da(r + 1, k + 1)) zellen.push([id(r, k), id(r, k + 1), id(r + 1, k + 1), id(r + 1, k)]);
  if (l0) zellen.push([qId(0), id(l0.t, l0.q), id(l0.t + 1, l0.q), id(l0.t + 1, l0.q - 1)]);
  if (l1) zellen.push([id(l1.t, l1.q), qId(1), id(l1.t + 1, l1.q + 1), id(l1.t + 1, l1.q)]);
  const flaeche = (z: number[]) => {
    const innen = z.every((i) => reihe(i) <= Ji);
    const P = z.map((i) => (innen ? nachZ(U[i]!, V[i]!) : ([a * U[i]!, V[i]!] as [number, number])));
    let f = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i]!;
      const q = P[(i + 1) % P.length]!;
      f += p[0] * q[1] - q[0] * p[1];
    }
    return innen ? f : -f;
  };
  const vorz = zellen.map(flaeche);
  const pos = vorz.filter((f) => f > 0).length;
  const umgeklappt = Math.min(pos, vorz.length - pos);
  const u: number[][] = [];
  const v: number[][] = [];
  const lagen: (V3 | null)[][] = [];
  for (let r = 0; r <= J; r++) {
    const breite = r === 0 ? 2 * m : S;
    const ur: number[] = [];
    const vr: number[] = [];
    const lr: (V3 | null)[] = [];
    for (let k = 0; k <= breite; k++) {
      const i = id(r, k);
      if (!da(r, k)) {
        ur.push(Number.NaN);
        vr.push(Number.NaN);
        lr.push(r === 0 ? lippe[k]! : null);
        continue;
      }
      ur.push(nb ? nb.zurueck(U[i]!, V[i]!) : U[i]!);
      vr.push(V[i]!);
      lr.push(lage3(i));
    }
    u.push(ur);
    v.push(vr);
    lagen.push(lr);
  }
  const Q = leitern.map((l) => {
    const i = qId(l.seite);
    return { u: nb ? nb.zurueck(U[i]!, V[i]!) : U[i]!, v: V[i]!, p: umkehr(U[i]!, V[i]!).p };
  });
  return { u, v, lagen, Q, kA, kB, umgeklappt };
}

/** Ergebnis des Gitters mit Leiter: Lagen je Reihe (Ringfeld und Holme; null = kein Punkt), Nahtpunkte der Sprossen, Holme t */
export type LeiterGitter = {
  u: number[][];
  v: number[][];
  lagen: (V3 | null)[][];
  /** Sprossenenden X_2 … X_q (X_q = Q) auf der Naht; X_1 ist der Holmpunkt (t, 0) bzw. (t, S) */
  X: V3[];
  seite: 0 | 1;
  /** Lippenstellen der Leiter (q), Halsspeiche im Indexraum der Reihen ≥ 1, Holme */
  q: number;
  kHals: number;
  t: number;
  kA: number[];
  kB: number[];
  umgeklappt: number;
};

/**
 * Gitter mit einer Leiter: Ringfeld in seiner Karte (`kernGitterL`), Leiterfeld als Coons-Fläche zwischen Lippe (U_0 … U_q),
 * Hals ((r, q), Q), Naht (Holmenden und Sprossenenden nach Bogenlänge, X_1 bei t/(t + q − 1) der Nahtlänge) und auf die Haut
 * gelegt. `naht`: Punkte der Naht vom Anfang O bis Q (Lagen).
 */
export function leiterGitterBauen(e: {
  umkehr: (u: number, v: number) => { p: V3; n: V3 };
  auf: (p: V3) => V3;
  seite: 0 | 1;
  q: number;
  uQ: number;
  naht: V3[];
  uR: number[];
  thetaIn: Float64Array;
  thetaOut: Float64Array;
  lippe: V3[];
  rand: V3[];
  vc: number;
  uc: number;
  aspekt: number;
  opt: KernGitterOptionen;
  /** feste Punkte (Reihe, Speiche, Kartenlage der Ringkarte) — Falte auf der Gegenseite */
  pins?: readonly { r: number; k: number; u: number; v: number }[];
  /**
   * Karte des Leiterfelds zu X_1 bei Bogenlänge sX1 (`leiterKarte`): Holme und Sprossen dann als Tutte-Gitter in ihr (Lippe und
   * Naht gegenüber — kein Umklappen); ohne sie die Coons-Fläche
   */
  feld?: (sX1: number) => { umkehr: (u: number, v: number) => { p: V3; n: V3 }; lippe: KartenWeg; hals: KartenWeg; naht: KartenWeg; x1: number };
}): LeiterGitter {
  const m = (e.thetaIn.length - 1) / 2;
  const S = 2 * m + 4;
  const J = e.uR.length - 1;
  const nb = e.opt.naht === 'bogenKarte' ? nahtBogen(e.umkehr, e.vc) : null;
  const uQ2 = nb ? nb.hin(e.uQ, e.seite) : e.uQ;
  let t = 0;
  for (let r = 1; r < J; r++) if (e.uR[r]! < uQ2) t = r;
  const kHals = e.seite === 0 ? e.q : S - e.q;
  const ring = kernGitterL(e.umkehr, e.uR, e.thetaIn, e.thetaOut, e.lippe, e.rand, e.vc, e.uc, e.aspekt, [{ seite: e.seite, q: kHals, t, uQ: uQ2 }], e.opt, e.pins ?? []);
  // Leiterfeld: Index (r, j) mit j = 0 … q von O aus (Seite 1: Speiche S − j, Lippenindex 2m − j)
  const sp = (j: number) => (e.seite === 0 ? j : S - j);
  const lip = (j: number) => e.lippe[e.seite === 0 ? j : 2 * m - j]!;
  const hals = (r: number): V3 => (r === 0 ? lip(e.q) : r <= t ? ring.lagen[r]![kHals]! : ring.Q[0]!.p);
  // Naht nach Bogenlänge
  const sN = [0];
  for (let i = 1; i < e.naht.length; i++) {
    const a = e.naht[i - 1]!;
    const b = e.naht[i]!;
    sN.push(sN[i - 1]! + Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  }
  const LN = sN[sN.length - 1]!;
  const nahtBei = (s: number): V3 => {
    let i = 0;
    while (i + 2 < sN.length && sN[i + 1]! < s) i++;
    const f = sN[i + 1]! > sN[i]! ? Math.min(1, Math.max(0, (s - sN[i]!) / (sN[i + 1]! - sN[i]!))) : 0;
    const a = e.naht[i]!;
    const b = e.naht[i + 1]!;
    return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), 0];
  };
  const sX1 = t > 0 ? (LN * t) / (t + e.q - 1) : 0;
  const links = (r: number): V3 => (r === 0 ? lip(0) : nahtBei(r > t ? sX1 : (sX1 * r) / t));
  const oben = (j: number): V3 => (j <= 1 ? nahtBei(sX1) : j >= e.q ? ring.Q[0]!.p : nahtBei(sX1 + ((LN - sX1) * (j - 1)) / (e.q - 1)));
  const X: V3[] = [];
  const lagen = ring.lagen.map((z) => [...z]);
  if (e.feld) {
    // Tutte im Leiterfeld: Lippe, Holmenden auf der Naht vor X_1, Sprossenenden dahinter, Hals fest; Holmpunkte frei
    const lf = e.feld(sX1);
    const q = e.q;
    const nP = (t + 1) * (q + 1);
    const pid = (r: number, j: number) => r * (q + 1) + j;
    const xid = (j: number) => nP + j - 2;
    const n = nP + Math.max(0, q - 2);
    const U = new Float64Array(n);
    const Vv = new Float64Array(n);
    const fest = new Uint8Array(n);
    const setze = (i: number, w: { u: number; v: number }) => {
      U[i] = w.u;
      Vv[i] = w.v;
      fest[i] = 1;
    };
    for (let j = 0; j <= q; j++) setze(pid(0, j), wegBei(lf.lippe, j === 0 ? 0 : j === q ? lf.lippe.s[lf.lippe.s.length - 1]! : wegFuss(lf.lippe, lip(j))));
    for (let r = 1; r <= t; r++) {
      setze(pid(r, 0), wegBei(lf.naht, (lf.x1 * r) / t));
      setze(pid(r, q), wegBei(lf.hals, wegFuss(lf.hals, hals(r))));
    }
    const LNk = lf.naht.s[lf.naht.s.length - 1]!;
    for (let j = 2; j < q; j++) setze(xid(j), wegBei(lf.naht, lf.x1 + ((LNk - lf.x1) * (j - 1)) / (q - 1)));
    const kanten: [number, number][] = [];
    for (let r = 0; r <= t; r++) for (let j = 0; j < q; j++) kanten.push([pid(r, j), pid(r, j + 1)]);
    for (let r = 0; r < t; r++) for (let j = 0; j <= q; j++) kanten.push([pid(r, j), pid(r + 1, j)]);
    for (let j = 2; j < q; j++) kanten.push([pid(t, j), xid(j)]);
    const unb = new Int32Array(n).fill(-1);
    const liste: number[] = [];
    for (let i = 0; i < n; i++)
      if (!fest[i]) {
        unb[i] = liste.length;
        liste.push(i);
      }
    if (liste.length) {
      const zeilen: NormalZeile[] = [];
      const nachbarn: number[][] = liste.map(() => []);
      const b0 = new Float64Array(liste.length);
      const b1 = new Float64Array(liste.length);
      for (const [a, b] of kanten) {
        const i = unb[a]!;
        const j = unb[b]!;
        if (i >= 0 && j >= 0) {
          zeilen.push({ index: [i, j], wert: [1, -1], gewicht: 1 });
          nachbarn[i]!.push(j);
          nachbarn[j]!.push(i);
        } else if (i >= 0 || j >= 0) {
          const f = i >= 0 ? i : j;
          const o = i >= 0 ? b : a;
          zeilen.push({ index: [f], wert: [1], gewicht: 1 });
          b0[f] = b0[f]! + U[o]!;
          b1[f] = b1[f]! + Vv[o]!;
        }
      }
      const sys = normalSystem(liste.length, zeilen, nachbarn);
      const x0 = sys.loesenSpalte(b0);
      const x1 = sys.loesenSpalte(b1);
      liste.forEach((i, w) => {
        U[i] = x0[w]!;
        Vv[i] = x1[w]!;
      });
    }
    for (let r = 1; r <= t; r++) for (let j = 0; j < q; j++) lagen[r]![sp(j)] = lf.umkehr(U[pid(r, j)]!, Vv[pid(r, j)]!).p;
    for (let j = 2; j < q; j++) X.push(lf.umkehr(U[xid(j)]!, Vv[xid(j)]!).p);
    X.push(ring.Q[0]!.p);
    return { u: ring.u, v: ring.v, lagen, X, seite: e.seite, q: e.q, kHals, t, kA: ring.kA, kB: ring.kB, umgeklappt: ring.umgeklappt };
  }
  for (let j = 2; j <= e.q; j++) X.push(oben(j));
  // Coons-Fläche über (r, j) ∈ [0, t + 1] × [0, q], auf die Haut gelegt
  const B0 = lip(0);
  const Bq = lip(e.q);
  const T0 = oben(0);
  const Tq = oben(e.q);
  for (let r = 1; r <= t; r++) {
    lagen[r]![sp(0)] = links(r);
    for (let j = 1; j < e.q; j++) {
      const v = r / (t + 1);
      const w = j / e.q;
      const Bk = lip(j);
      const Tk = oben(j);
      const Lr = links(r);
      const Rr = hals(r);
      const p: V3 = [0, 0, 0];
      for (let d = 0; d < 3; d++) p[d] = (1 - v) * Bk[d]! + v * Tk[d]! + (1 - w) * Lr[d]! + w * Rr[d]! - ((1 - v) * (1 - w) * B0[d]! + (1 - v) * w * Bq[d]! + v * (1 - w) * T0[d]! + v * w * Tq[d]!);
      lagen[r]![sp(j)] = e.auf(p);
    }
  }
  return { u: ring.u, v: ring.v, lagen, X, seite: e.seite, q: e.q, kHals, t, kA: ring.kA, kB: ring.kB, umgeklappt: ring.umgeklappt };
}
