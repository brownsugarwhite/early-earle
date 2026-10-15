// Teil A (Plan „Maul als Einsatz“), Schritt A1: die Maullinie auf A0. Das feine Netz des Körpers ohne Maul wird zu
// Dreiecken (Vierecke an der kürzeren Diagonale geteilt); ein Punkt auf der Haut ist ein **Anker** (Dreieck, baryzentrische
// Lage) — er reitet mit der Haut, wenn A0 sich ändert, und lässt sich exakt zurückrechnen. Die Linie wird auf das Netz
// projiziert (rechte Hälfte, der Anfang exakt auf die Naht), dann wird das **feine Feld** um sie ausgeschnitten (Weg auf
// der Haut ≤ Radius, nur rechte Hälfte, zusammenhängend), die Linie auf einen **feinen Kantenpfad** eingerastet (von der
// Naht bis zum Mundwinkel, berührt die Naht nur am Anfang) und das Feld entlang des Pfads **aufgeschnitten** (Pfadpunkte
// doppelt außer dem Mundwinkel). Ergebnis ist eine Scheibe: ein Rand, der außen ums Feld und beidseitig am Schlitz läuft.
// DOM-frei.
import type { Linie3 } from '../../dokument';
import { abtasten3 } from '../../versuch/linie3d';

type V3 = [number, number, number];

export type FeinNetz = {
  /** Lagen (3 je Punkt) */
  punkte: Float64Array;
  /** Dreiecke (3 Punktindizes je Dreieck, gegen den Uhrzeigersinn von außen) */
  dreiecke: Int32Array;
};

/** Anker: Dreieck und baryzentrische Lage (Lage = (1 − b1 − b2)·A + b1·B + b2·C). */
export type Anker = { dreieck: number; b1: number; b2: number };

/** Feines Netz aus Vierecken: jedes an der kürzeren Diagonale in zwei Dreiecke geteilt (Umlauf bleibt). */
export function feinNetz(punkte: ArrayLike<number>, flaechen: readonly (readonly number[])[]): FeinNetz {
  const tri: number[] = [];
  const P = (i: number): V3 => [punkte[3 * i]!, punkte[3 * i + 1]!, punkte[3 * i + 2]!];
  const d = (a: number, b: number) => {
    const p = P(a);
    const q = P(b);
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  };
  for (const f of flaechen) {
    if (f.length === 4) {
      const [a, b, c, e] = f as [number, number, number, number];
      if (d(a, c) <= d(b, e)) tri.push(a, b, c, a, c, e);
      else tri.push(a, b, e, b, c, e);
    } else for (let k = 1; k + 1 < f.length; k++) tri.push(f[0]!, f[k]!, f[k + 1]!);
  }
  return { punkte: Float64Array.from(punkte as ArrayLike<number>), dreiecke: Int32Array.from(tri) };
}

/** Lage eines Ankers. */
export function ankerLage(n: FeinNetz, a: Anker): V3 {
  const t = 3 * a.dreieck;
  const ia = n.dreiecke[t]!;
  const ib = n.dreiecke[t + 1]!;
  const ic = n.dreiecke[t + 2]!;
  const w = 1 - a.b1 - a.b2;
  const P = n.punkte;
  return [w * P[3 * ia]! + a.b1 * P[3 * ib]! + a.b2 * P[3 * ic]!, w * P[3 * ia + 1]! + a.b1 * P[3 * ib + 1]! + a.b2 * P[3 * ic + 1]!, w * P[3 * ia + 2]! + a.b1 * P[3 * ib + 2]! + a.b2 * P[3 * ic + 2]!];
}

/** Nächster Punkt auf einem Dreieck (Ericson), mit baryzentrischer Lage. */
function naechsterAufDreieck(p: V3, a: V3, b: V3, c: V3): { q: V3; b1: number; b2: number } {
  const ab: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ap: V3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  const auf = (b1: number, b2: number) => ({ q: [a[0] + b1 * ab[0] + b2 * ac[0], a[1] + b1 * ab[1] + b2 * ac[1], a[2] + b1 * ab[2] + b2 * ac[2]] as V3, b1, b2 });
  if (d1 <= 0 && d2 <= 0) return auf(0, 0);
  const bp: V3 = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return auf(1, 0);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return auf(d1 / (d1 - d3), 0);
  const cp: V3 = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return auf(0, 1);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return auf(0, d2 / (d2 - d6));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return auf(1 - w, w);
  }
  const s = 1 / (va + vb + vc);
  return auf(vb * s, vc * s);
}

/** Raster über die Dreiecke für die Suche nach dem nächsten Punkt (je Netz gemerkt). */
const rasterMerk = new WeakMap<FeinNetz, { o: V3; h: number; nx: number; ny: number; nz: number; zellen: Map<number, number[]> }>();
function raster(n: FeinNetz) {
  const m = rasterMerk.get(n);
  if (m) return m;
  const P = n.punkte;
  const lo: V3 = [Infinity, Infinity, Infinity];
  const hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let a = 0; a < 3; a++) {
    lo[a] = Math.min(lo[a]!, P[i + a]!);
    hi[a] = Math.max(hi[a]!, P[i + a]!);
  }
  const groesse = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1;
  const h = groesse / 48;
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 1;
  const ny = Math.ceil((hi[1] - lo[1]) / h) + 1;
  const nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const zellen = new Map<number, number[]>();
  const T = n.dreiecke;
  for (let t = 0; t < T.length / 3; t++) {
    const b0: V3 = [Infinity, Infinity, Infinity];
    const b1: V3 = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) {
      const v = P[3 * T[3 * t + k]! + a]!;
      b0[a] = Math.min(b0[a]!, v);
      b1[a] = Math.max(b1[a]!, v);
    }
    const i0 = Math.floor((b0[0] - lo[0]) / h);
    const i1 = Math.floor((b1[0] - lo[0]) / h);
    const j0 = Math.floor((b0[1] - lo[1]) / h);
    const j1 = Math.floor((b1[1] - lo[1]) / h);
    const k0 = Math.floor((b0[2] - lo[2]) / h);
    const k1 = Math.floor((b1[2] - lo[2]) / h);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
      const s = (i * ny + j) * nz + k;
      (zellen.get(s) ?? zellen.set(s, []).get(s)!).push(t);
    }
  }
  const r = { o: lo, h, nx, ny, nz, zellen };
  rasterMerk.set(n, r);
  return r;
}

/** Anker des nächsten Hautpunkts zu p (Suche in wachsenden Würfeln des Rasters), mit Abstand. */
export function ankerVon(n: FeinNetz, p: V3, nur?: (t: number) => boolean): Anker & { abstand: number; lage: V3 } {
  const r = raster(n);
  const i0 = Math.floor((p[0] - r.o[0]) / r.h);
  const j0 = Math.floor((p[1] - r.o[1]) / r.h);
  const k0 = Math.floor((p[2] - r.o[2]) / r.h);
  let best = { dreieck: -1, b1: 0, b2: 0, abstand: Infinity, lage: [0, 0, 0] as V3 };
  const T = n.dreiecke;
  const P = n.punkte;
  const pt = (i: number): V3 => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
  const gesehen = new Set<number>();
  for (let rad = 0; rad < 48; rad++) {
    for (let i = i0 - rad; i <= i0 + rad; i++)
      for (let j = j0 - rad; j <= j0 + rad; j++)
        for (let k = k0 - rad; k <= k0 + rad; k++) {
          if (Math.max(Math.abs(i - i0), Math.abs(j - j0), Math.abs(k - k0)) !== rad) continue;
          for (const t of r.zellen.get((i * r.ny + j) * r.nz + k) ?? []) {
            if (gesehen.has(t) || (nur && !nur(t))) continue;
            gesehen.add(t);
            const q = naechsterAufDreieck(p, pt(T[3 * t]!), pt(T[3 * t + 1]!), pt(T[3 * t + 2]!));
            const d = Math.hypot(q.q[0] - p[0], q.q[1] - p[1], q.q[2] - p[2]);
            if (d < best.abstand) best = { dreieck: t, b1: q.b1, b2: q.b2, abstand: d, lage: q.q };
          }
        }
    // alles innerhalb rad·h ist gesehen: fertig, wenn der beste näher liegt
    if (best.dreieck >= 0 && best.abstand <= rad * r.h) break;
  }
  return best;
}

/** Linie (rechte Hälfte) auf das Netz legen: dicht abgetastet, je Probe der Anker; der Anfang exakt auf der Naht (z = 0). */
export function linieAufNetz(n: FeinNetz, linie: Linie3, jeSegment = 24): { anker: Anker[]; lagen: V3[]; abstand: number } {
  const proben = abtasten3(linie, jeSegment) as V3[];
  const rechts = (t: number) => {
    const T = n.dreiecke;
    for (let k = 0; k < 3; k++) if (n.punkte[3 * T[3 * t + k]! + 2]! < -1e-9) return false;
    return true;
  };
  const anker: Anker[] = [];
  const lagen: V3[] = [];
  let abstand = 0;
  proben.forEach((p, i) => {
    const a = ankerVon(n, [p[0], p[1], Math.max(0, p[2])], rechts);
    let lage = a.lage;
    if (i === 0) lage = [lage[0], lage[1], 0];
    abstand = Math.max(abstand, a.abstand);
    anker.push({ dreieck: a.dreieck, b1: a.b1, b2: a.b2 });
    lagen.push(lage);
  });
  return { anker, lagen, abstand };
}

/** Nachbarschaft: Punkt → anliegende Dreiecke; Kante (a, b) → Dreiecke. */
function nachbarn(n: FeinNetz, dreiecke: readonly number[]) {
  const amPunkt = new Map<number, number[]>();
  const anKante = new Map<string, number[]>();
  const schl = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  for (const t of dreiecke)
    for (let k = 0; k < 3; k++) {
      const a = n.dreiecke[3 * t + k]!;
      const b = n.dreiecke[3 * t + ((k + 1) % 3)]!;
      (amPunkt.get(a) ?? amPunkt.set(a, []).get(a)!).push(t);
      (anKante.get(schl(a, b)) ?? anKante.set(schl(a, b), []).get(schl(a, b))!).push(t);
    }
  return { amPunkt, anKante, schl };
}

/** Abstand eines Punkts zu einem Polygonzug. */
function abstandZug(p: V3, zug: readonly V3[]): number {
  let best = Infinity;
  for (let k = 0; k + 1 < zug.length; k++) {
    const a = zug[k]!;
    const b = zug[k + 1]!;
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1e-18;
    const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / l2));
    best = Math.min(best, Math.hypot(a[0] + d[0] * u - p[0], a[1] + d[1] * u - p[1], a[2] + d[2] * u - p[2]));
  }
  return best;
}

/**
 * Feines Feld um die Linie: Dreiecke der rechten Hälfte, deren Mitte auf dem Weg über die Haut (Dijkstra über
 * Kantennachbarn, ab den Dreiecken der Linie) höchstens `radius` von der Linie entfernt ist; Löcher werden gefüllt.
 */
export function feldAusschnitt(n: FeinNetz, linie: readonly V3[], ankerListe: readonly Anker[], radius: number): number[] {
  const T = n.dreiecke;
  const P = n.punkte;
  const nT = T.length / 3;
  const rechts = (t: number) => [0, 1, 2].every((k) => P[3 * T[3 * t + k]! + 2]! >= -1e-9);
  const alle: number[] = [];
  for (let t = 0; t < nT; t++) if (rechts(t)) alle.push(t);
  const { anKante, schl } = nachbarn(n, alle);
  const mitte = (t: number): V3 => {
    const o: V3 = [0, 0, 0];
    for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) o[a] = o[a]! + P[3 * T[3 * t + k]! + a]! / 3;
    return o;
  };
  // Dijkstra über die Dreiecke (Kosten = Abstand der Mitten), Start: Dreiecke der Linienanker
  const d = new Map<number, number>();
  const offen: number[] = [];
  for (const a of ankerListe) if (!d.has(a.dreieck)) {
    d.set(a.dreieck, 0);
    offen.push(a.dreieck);
  }
  while (offen.length) {
    let bi = 0;
    for (let k = 1; k < offen.length; k++) if (d.get(offen[k]!)! < d.get(offen[bi]!)!) bi = k;
    const t = offen.splice(bi, 1)[0]!;
    const dt = d.get(t)!;
    const mt = mitte(t);
    for (let k = 0; k < 3; k++) {
      const a = T[3 * t + k]!;
      const b = T[3 * t + ((k + 1) % 3)]!;
      for (const u of anKante.get(schl(a, b)) ?? []) {
        if (u === t) continue;
        const mu = mitte(u);
        const du = dt + Math.hypot(mu[0] - mt[0], mu[1] - mt[1], mu[2] - mt[2]);
        if (du > radius || du >= (d.get(u) ?? Infinity)) continue;
        if (!d.has(u)) offen.push(u);
        d.set(u, du);
      }
    }
  }
  // dazu alles, was nah an der Linie liegt (gegen Lücken an Dreiecken, die die Linie nur streift)
  const feld = new Set<number>(d.keys());
  void linie;
  // Löcher füllen: Dreiecke außerhalb, die keine Verbindung zum Rand der rechten Hälfte haben, gehören zum Feld
  const draussen = new Set<number>();
  const start = alle.filter((t) => !feld.has(t) && randDreieck(t));
  function randDreieck(t: number): boolean {
    for (let k = 0; k < 3; k++) {
      const a = T[3 * t + k]!;
      const b = T[3 * t + ((k + 1) % 3)]!;
      if ((anKante.get(schl(a, b)) ?? []).length < 2) return true;
    }
    return false;
  }
  const stapel = [...start];
  for (const t of start) draussen.add(t);
  while (stapel.length) {
    const t = stapel.pop()!;
    for (let k = 0; k < 3; k++) {
      const a = T[3 * t + k]!;
      const b = T[3 * t + ((k + 1) % 3)]!;
      for (const u of anKante.get(schl(a, b)) ?? []) if (!feld.has(u) && !draussen.has(u)) {
        draussen.add(u);
        stapel.push(u);
      }
    }
  }
  for (const t of alle) if (!feld.has(t) && !draussen.has(t)) feld.add(t);
  // Kneifpunkte schließen: Berühren sich Feld-Dreiecke an einem Punkt nur über die Ecke (mehrere getrennte Stücke im
  // Fächer um den Punkt), kommt der ganze Fächer dazu — sonst ist das Feld keine Scheibe (χ < 1 bei einem Rand)
  const amPunkt = new Map<number, number[]>();
  for (const t of alle) for (let k = 0; k < 3; k++) (amPunkt.get(T[3 * t + k]!) ?? amPunkt.set(T[3 * t + k]!, []).get(T[3 * t + k]!)!).push(t);
  for (let runde = 0; runde < 20; runde++) {
    let neu = 0;
    for (const [v, faecher] of amPunkt) {
      const imFeld = faecher.filter((t) => feld.has(t));
      if (!imFeld.length || imFeld.length === faecher.length) continue;
      // Stücke im Fächer: Feld-Dreiecke, die über eine Kante an v zusammenhängen
      const rest = new Set(imFeld);
      let stuecke = 0;
      while (rest.size) {
        stuecke++;
        const stapel = [rest.values().next().value as number];
        rest.delete(stapel[0]!);
        while (stapel.length) {
          const t = stapel.pop()!;
          for (let k = 0; k < 3; k++) {
            const a = T[3 * t + k]!;
            const b = T[3 * t + ((k + 1) % 3)]!;
            if (a !== v && b !== v) continue;
            for (const u of anKante.get(schl(a, b)) ?? []) if (rest.has(u)) {
              rest.delete(u);
              stapel.push(u);
            }
          }
        }
      }
      if (stuecke > 1) {
        for (const t of faecher) if (!feld.has(t)) {
          feld.add(t);
          neu++;
        }
      }
    }
    if (!neu) break;
  }
  return [...feld].sort((a, b) => a - b);
}

/**
 * Feiner Kantenpfad entlang der Linie im Feld: von dem Nahtpunkt (z = 0) nächst dem Anfang bis zum Punkt nächst dem
 * Mundwinkel; Kosten = Kantenlänge · (1 + Abstand der Kantenmitte zur Linie / Kantenlänge²·…); andere Nahtpunkte sind
 * gesperrt (der Schnitt berührt die Naht nur am Anfang).
 */
export function kantenPfad(n: FeinNetz, feld: readonly number[], linie: readonly V3[]): number[] {
  const T = n.dreiecke;
  const P = n.punkte;
  const pt = (i: number): V3 => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
  const nb = new Map<number, Set<number>>();
  for (const t of feld)
    for (let k = 0; k < 3; k++) {
      const a = T[3 * t + k]!;
      const b = T[3 * t + ((k + 1) % 3)]!;
      (nb.get(a) ?? nb.set(a, new Set()).get(a)!).add(b);
      (nb.get(b) ?? nb.set(b, new Set()).get(b)!).add(a);
    }
  const naht = (i: number) => Math.abs(P[3 * i + 2]!) < 1e-9;
  const naechster = (q: V3, nurNaht: boolean) => {
    let best = -1;
    let bd = Infinity;
    for (const i of nb.keys()) {
      if (nurNaht && !naht(i)) continue;
      const p = pt(i);
      const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };
  const s = naechster(linie[0]!, true);
  const e = naechster(linie[linie.length - 1]!, false);
  let laengeSumme = 0;
  let anzahl = 0;
  for (const [a, set] of nb) for (const b of set) {
    const p = pt(a);
    const q = pt(b);
    laengeSumme += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    anzahl++;
  }
  const h = laengeSumme / Math.max(1, anzahl);
  const dist = new Map<number, number>([[s, 0]]);
  const vor = new Map<number, number>();
  const offen = [s];
  while (offen.length) {
    let bi = 0;
    for (let k = 1; k < offen.length; k++) if (dist.get(offen[k]!)! < dist.get(offen[bi]!)!) bi = k;
    const a = offen.splice(bi, 1)[0]!;
    if (a === e) break;
    const pa = pt(a);
    for (const b of nb.get(a) ?? []) {
      if (b !== e && naht(b)) continue;
      const pb = pt(b);
      const l = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
      const m: V3 = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
      const w = l * (1 + (30 * abstandZug(m, linie)) / h) + 0.01 * h;
      const nd = dist.get(a)! + w;
      if (nd < (dist.get(b) ?? Infinity)) {
        if (!dist.has(b)) offen.push(b);
        dist.set(b, nd);
        vor.set(b, a);
      }
    }
  }
  if (!dist.has(e)) return [];
  const pfad = [e];
  while (pfad[pfad.length - 1] !== s) pfad.push(vor.get(pfad[pfad.length - 1]!)!);
  return pfad.reverse();
}

export type Aufgeschnitten = {
  /** Punkte des Felds (Indizes ins feine Netz), dazu die Doppel der Pfadpunkte als neue Indizes ab n */
  dreiecke: Int32Array;
  /** neuer Index → ursprünglicher Punkt (für die Doppel); Lagen über das feine Netz */
  doppel: Map<number, number>;
  pfad: number[];
};

/**
 * Feld entlang des Pfads aufschneiden: jeder Pfadpunkt außer dem letzten (Mundwinkel) bekommt ein Doppel; die Dreiecke
 * rechts des Pfads (Richtung Anfang → Mundwinkel, von außen gesehen) nehmen das Doppel.
 */
export function aufschneiden(n: FeinNetz, feld: readonly number[], pfad: readonly number[]): Aufgeschnitten {
  const T = n.dreiecke;
  const nPunkte = n.punkte.length / 3;
  const tri = new Map<number, [number, number, number]>();
  for (const t of feld) tri.set(t, [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!]);
  const { amPunkt, anKante, schl } = nachbarn(n, feld);
  const doppel = new Map<number, number>();
  const hatGerichtet = (t: number, a: number, b: number) => {
    const d = tri.get(t)!;
    for (let k = 0; k < 3; k++) if (d[k] === a && d[(k + 1) % 3] === b) return true;
    return false;
  };
  for (let i = 0; i + 1 < pfad.length; i++) {
    const v = pfad[i]!;
    const nachV = pfad[i + 1]!;
    const vorV = i > 0 ? pfad[i - 1]! : -1;
    const neu = nPunkte + doppel.size;
    doppel.set(neu, v);
    // Start: das Dreieck rechts der Kante v → nach (es enthält nach → v gerichtet)
    const anAus = anKante.get(schl(v, nachV)) ?? [];
    let t = anAus.find((u) => hatGerichtet(u, nachV, v)) ?? -1;
    const gesehen = new Set<number>();
    // um v herum wandern, weg von der Kante (v, nach), bis zur Kante (vor, v) oder zum Rand. Nachbarn über die
    // ursprünglichen Nummern: Im Zickzack bilden drei Pfadpunkte ein Dreieck, und an der Sehne zum vorletzten Punkt steht
    // schon dessen Doppel (vorher brach der Lauf dort ab: Kneifpunkte, χ −8)
    const orig = (x: number) => doppel.get(x) ?? x;
    let letzteKante = nachV;
    while (t >= 0 && !gesehen.has(t)) {
      gesehen.add(t);
      const d = tri.get(t)!;
      tri.set(t, d.map((x) => (x === v ? neu : x)) as [number, number, number]);
      // die andere Kante von t an v
      const andere = orig(d.find((x) => x !== v && orig(x) !== letzteKante)!);
      if (andere === vorV) break;
      const weiter = (anKante.get(schl(v, andere)) ?? []).find((u) => u !== t);
      letzteKante = andere;
      t = weiter ?? -1;
    }
    void amPunkt;
  }
  const out: number[] = [];
  for (const t of feld) out.push(...tri.get(t)!);
  return { dreiecke: Int32Array.from(out), doppel, pfad: [...pfad] };
}

/**
 * Euler-Charakteristik und Zahl der Randschleifen eines Dreiecksnetzes (gerichtete Randkanten, je Punkt die nächste
 * Randkante — Kneifpunkte zählen so getrennt), dazu Kneifpunkte (mehr als eine ausgehende Randkante). Scheibe: χ = 1,
 * ein Rand, keine Kneifpunkte.
 */
export function scheibenPruefung(dreiecke: Int32Array): { euler: number; raender: number; punkte: number; kneif: number } {
  const punkte = new Set<number>();
  const gerichtet = new Map<string, number>();
  const schl = (a: number, b: number) => `${a}:${b}`;
  for (let t = 0; t < dreiecke.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = dreiecke[t + k]!;
      const b = dreiecke[t + ((k + 1) % 3)]!;
      punkte.add(a);
      gerichtet.set(schl(a, b), (gerichtet.get(schl(a, b)) ?? 0) + 1);
    }
  let kanten = 0;
  const rand: [number, number][] = [];
  for (const [k, c] of gerichtet) {
    const [a, b] = k.split(':').map(Number) as [number, number];
    const gegen = gerichtet.get(schl(b, a)) ?? 0;
    if (a < b || !gegen) kanten++;
    if (!gegen) for (let i = 0; i < c; i++) rand.push([a, b]);
  }
  const F = dreiecke.length / 3;
  const euler = punkte.size - kanten + F;
  const aus = new Map<number, number[]>();
  for (const [a, b] of rand) (aus.get(a) ?? aus.set(a, []).get(a)!).push(b);
  let kneif = 0;
  for (const l of aus.values()) if (l.length > 1) kneif++;
  // Schleifen: Randkanten der Reihe nach (bei Kneifpunkten die erste freie)
  const frei = new Map<number, number[]>();
  for (const [a, l] of aus) frei.set(a, [...l]);
  let raender = 0;
  for (const [a0] of aus) {
    while ((frei.get(a0) ?? []).length) {
      raender++;
      let a = a0;
      for (let schritt = 0; schritt < rand.length + 1; schritt++) {
        const l = frei.get(a);
        if (!l || !l.length) break;
        const b = l.shift()!;
        a = b;
        if (a === a0) break;
      }
    }
  }
  return { euler, raender, punkte: punkte.size, kneif };
}
