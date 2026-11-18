// Wesen-Editor 2, Kern (13.10.2026): der Käfig als Halbkanten-Struktur auf Typed Arrays.
//
// Ein Käfig ist ein geschlossenes Polygonnetz (meist Vierecke) mit Kantenschärfe (halbscharfe Falten wie Blenders
// Edge Crease) und Punktschärfe (Vertex Crease). Jede Flächenecke ist eine Halbkante; `twin` verbindet die beiden
// Halbkanten einer Kante. Die Punktlagen liegen getrennt in `xyz`, damit Posen, Löser und Subdivision sie als Vektor
// behandeln können (Plan 4.4: Subdivision ist eine lineare Abbildung auf dem Käfig).

export type V3 = [number, number, number];

export type Kaefig = {
  /** Punkte */
  n: number;
  /** Lagen (x, y, z je Punkt) */
  xyz: Float64Array;
  /** Flächen: Ecken fStart[f] … fStart[f+1]−1 in fVerts (gegen den Uhrzeigersinn von außen) */
  nF: number;
  fStart: Uint32Array;
  fVerts: Uint32Array;
  /** Halbkanten (eine je Flächenecke, Index = Position in fVerts): Ziel-Punkt, Fläche, nächste, Zwilling (−1 = Rand), Kante */
  hVert: Uint32Array;
  hFace: Uint32Array;
  hNext: Uint32Array;
  hTwin: Int32Array;
  hEdge: Uint32Array;
  /** Kanten (ungerichtet, a < b nicht garantiert; eine Halbkante je Kante) */
  nE: number;
  eA: Uint32Array;
  eB: Uint32Array;
  eHalb: Uint32Array;
  /** Flächen je Kante (1 = Rand, 2 = innen) */
  eFlaechen: Uint8Array;
  /** Kantenschärfe (0 = rund, ≥ Stufenzahl = scharf) und Punktschärfe */
  eSchaerfe: Float64Array;
  vSchaerfe: Float64Array;
  /** Nachbarschaft je Punkt: Kanten (Reihenfolge des Auftretens) und Flächen */
  vKStart: Uint32Array;
  vKanten: Uint32Array;
  vFStart: Uint32Array;
  vFlaechen: Uint32Array;
};

/** Käfig aus Punkten und Flächen (Indexlisten). Kanten werden in der Reihenfolge ihres ersten Auftretens nummeriert. */
export function kaefigAusFlaechen(punkte: ArrayLike<number> | readonly V3[], flaechen: readonly (readonly number[])[]): Kaefig {
  let xyz: Float64Array;
  let n: number;
  if (ArrayBuffer.isView(punkte) || typeof (punkte as ArrayLike<number>)[0] === 'number') {
    const a = punkte as ArrayLike<number>;
    xyz = Float64Array.from({ length: a.length }, (_, i) => a[i]!);
    n = xyz.length / 3;
  } else {
    const p = punkte as readonly V3[];
    n = p.length;
    xyz = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
      xyz[3 * i] = p[i]![0];
      xyz[3 * i + 1] = p[i]![1];
      xyz[3 * i + 2] = p[i]![2];
    }
  }
  const nF = flaechen.length;
  const fStart = new Uint32Array(nF + 1);
  let nH = 0;
  for (let f = 0; f < nF; f++) {
    fStart[f] = nH;
    nH += flaechen[f]!.length;
  }
  fStart[nF] = nH;
  const fVerts = new Uint32Array(nH);
  const hVert = new Uint32Array(nH);
  const hFace = new Uint32Array(nH);
  const hNext = new Uint32Array(nH);
  const hTwin = new Int32Array(nH).fill(-1);
  const hEdge = new Uint32Array(nH);
  // Kanten über eine Hash-Tabelle (Schlüssel min·n + max)
  const kantenIndex = new Map<number, number>();
  const eA: number[] = [];
  const eB: number[] = [];
  const eHalb: number[] = [];
  const eFl: number[] = [];
  for (let f = 0; f < nF; f++) {
    const fl = flaechen[f]!;
    const m = fl.length;
    const h0 = fStart[f]!;
    for (let i = 0; i < m; i++) {
      const a = fl[i]!;
      const b = fl[(i + 1) % m]!;
      const h = h0 + i;
      fVerts[h] = a;
      hVert[h] = a;
      hFace[h] = f;
      hNext[h] = h0 + ((i + 1) % m);
      const key = (a < b ? a : b) * n + (a < b ? b : a);
      let e = kantenIndex.get(key);
      if (e === undefined) {
        e = eA.length;
        kantenIndex.set(key, e);
        eA.push(a);
        eB.push(b);
        eHalb.push(h);
        eFl.push(1);
      } else {
        eFl[e]! += 1;
        const g = eHalb[e]!;
        if (hTwin[g] === -1) {
          hTwin[g] = h;
          hTwin[h] = g;
        }
      }
      hEdge[h] = e;
    }
  }
  const nE = eA.length;
  // Nachbarschaft
  const vKZahl = new Uint32Array(n + 1);
  const vFZahl = new Uint32Array(n + 1);
  for (let e = 0; e < nE; e++) {
    vKZahl[eA[e]! + 1]!++;
    vKZahl[eB[e]! + 1]!++;
  }
  for (let h = 0; h < nH; h++) vFZahl[hVert[h]! + 1]!++;
  for (let i = 0; i < n; i++) {
    vKZahl[i + 1]! += vKZahl[i]!;
    vFZahl[i + 1]! += vFZahl[i]!;
  }
  const vKanten = new Uint32Array(vKZahl[n]!);
  const vFlaechen = new Uint32Array(vFZahl[n]!);
  const kFill = vKZahl.slice(0, n);
  const fFill = vFZahl.slice(0, n);
  for (let e = 0; e < nE; e++) {
    vKanten[kFill[eA[e]!]!++] = e;
    vKanten[kFill[eB[e]!]!++] = e;
  }
  for (let h = 0; h < nH; h++) vFlaechen[fFill[hVert[h]!]!++] = hFace[h]!;
  return {
    n,
    xyz,
    nF,
    fStart,
    fVerts,
    hVert,
    hFace,
    hNext,
    hTwin,
    hEdge,
    nE,
    eA: Uint32Array.from(eA),
    eB: Uint32Array.from(eB),
    eHalb: Uint32Array.from(eHalb),
    eFlaechen: Uint8Array.from(eFl),
    eSchaerfe: new Float64Array(nE),
    vSchaerfe: new Float64Array(n),
    vKStart: vKZahl,
    vKanten,
    vFStart: vFZahl,
    vFlaechen,
  };
}

/** Kante zwischen a und b (−1, wenn keine). */
export function kanteZwischen(k: Kaefig, a: number, b: number): number {
  for (let i = k.vKStart[a]!; i < k.vKStart[a + 1]!; i++) {
    const e = k.vKanten[i]!;
    if ((k.eA[e] === a && k.eB[e] === b) || (k.eA[e] === b && k.eB[e] === a)) return e;
  }
  return -1;
}

/** Valenz (Kantenzahl) eines Punkts. */
export const valenz = (k: Kaefig, v: number): number => k.vKStart[v + 1]! - k.vKStart[v]!;

export const punkt = (k: Kaefig, i: number): V3 => [k.xyz[3 * i]!, k.xyz[3 * i + 1]!, k.xyz[3 * i + 2]!];

export function flaeche(k: Kaefig, f: number): number[] {
  const out: number[] = [];
  for (let h = k.fStart[f]!; h < k.fStart[f + 1]!; h++) out.push(k.fVerts[h]!);
  return out;
}

export function alleFlaechen(k: Kaefig): number[][] {
  const out: number[][] = [];
  for (let f = 0; f < k.nF; f++) out.push(flaeche(k, f));
  return out;
}

export function allePunkte(k: Kaefig): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < k.n; i++) out.push(punkt(k, i));
  return out;
}

export type Pruefung = { ok: boolean; geschlossen: boolean; mannigfaltig: boolean; orientiert: boolean; fehler: string[] };

/**
 * Mannigfaltigkeit: jede Kante hat höchstens zwei Flächen, die Flächen einer Kante laufen gegenläufig (konsistente
 * Orientierung), kein Punkt gehört zu zwei getrennten Fächern. `geschlossen` = keine Randkante.
 */
export function pruefeKaefig(k: Kaefig): Pruefung {
  const fehler: string[] = [];
  let geschlossen = true;
  let orientiert = true;
  let mannigfaltig = true;
  for (let e = 0; e < k.nE; e++) {
    const z = k.eFlaechen[e]!;
    if (z === 1) geschlossen = false;
    if (z > 2) {
      mannigfaltig = false;
      if (fehler.length < 20) fehler.push(`Kante ${k.eA[e]}–${k.eB[e]} hat ${z} Flächen`);
    }
  }
  // Orientierung: Zwillinge laufen gegenläufig (hVert[h] = hVert[next(twin)])
  for (let h = 0; h < k.hVert.length; h++) {
    const t = k.hTwin[h]!;
    if (t < 0) continue;
    if (k.hVert[h] !== k.hVert[k.hNext[t]!]) {
      orientiert = false;
      if (fehler.length < 20) fehler.push(`Kante ${k.hVert[h]}–${k.hVert[k.hNext[h]!]} gleichläufig`);
    }
  }
  // Fächer je Punkt: Umlauf über twin/next muss alle Flächen des Punkts erreichen
  for (let v = 0; v < k.n && mannigfaltig; v++) {
    const fl = k.vFStart[v + 1]! - k.vFStart[v]!;
    if (fl === 0) continue;
    // eine Halbkante, die bei v beginnt
    let h0 = -1;
    for (let i = k.vFStart[v]!; i < k.vFStart[v + 1]! && h0 < 0; i++) {
      const f = k.vFlaechen[i]!;
      for (let h = k.fStart[f]!; h < k.fStart[f + 1]!; h++) if (k.hVert[h] === v) h0 = h;
    }
    // vorwärts umlaufen: h → twin(prev(h)) … bis zurück oder Rand; rückwärts ebenso
    const prev = (h: number) => {
      let p = h;
      while (k.hNext[p] !== h) p = k.hNext[p]!;
      return p;
    };
    let gesehen = 0;
    let h = h0;
    const besucht = new Set<number>();
    while (h >= 0 && !besucht.has(h)) {
      besucht.add(h);
      gesehen++;
      h = k.hTwin[prev(h)]!;
    }
    if (h < 0) {
      // Rand: in die andere Richtung weiterzählen
      h = k.hTwin[h0]!;
      while (h >= 0) {
        const nh = k.hNext[h]!;
        if (besucht.has(nh)) break;
        besucht.add(nh);
        gesehen++;
        h = k.hTwin[nh]!;
      }
    }
    if (gesehen !== fl) {
      mannigfaltig = false;
      if (fehler.length < 20) fehler.push(`Punkt ${v}: ${fl} Flächen, Fächer erreicht ${gesehen}`);
    }
  }
  return { ok: fehler.length === 0 && geschlossen && orientiert && mannigfaltig, geschlossen, mannigfaltig, orientiert, fehler };
}

/** Signiertes Volumen (positiv = Normalen nach außen bei Umlauf gegen den Uhrzeigersinn). */
export function volumen(k: Kaefig): number {
  let v = 0;
  const p = k.xyz;
  for (let f = 0; f < k.nF; f++) {
    const h0 = k.fStart[f]!;
    const a = k.fVerts[h0]!;
    for (let h = h0 + 1; h + 1 < k.fStart[f + 1]!; h++) {
      const b = k.fVerts[h]!;
      const c = k.fVerts[h + 1]!;
      const ax = p[3 * a]!, ay = p[3 * a + 1]!, az = p[3 * a + 2]!;
      const bx = p[3 * b]!, by = p[3 * b + 1]!, bz = p[3 * b + 2]!;
      const cx = p[3 * c]!, cy = p[3 * c + 1]!, cz = p[3 * c + 2]!;
      v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
    }
  }
  return v / 6;
}

/** Kopie mit anderen Lagen (gleiche Topologie und Schärfen). */
export function mitLagen(k: Kaefig, xyz: Float64Array): Kaefig {
  return { ...k, xyz };
}
