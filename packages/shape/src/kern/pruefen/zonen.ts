// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S0: Faltenmaß nach Zonen. Das bisherige Faltenmaß (`faltenMass`) zählt
// alles außer Kanten, die auf der letzten Stufe noch scharf sind: gewollte Spitzen (eine gezeichnete Ecke an der Schnauze
// wird mit vier Flächen als Kegel gezeichnet) und halbscharfe Kanten (Schärfe < Stufenzahl ist auf Stufe 3 abgebaut)
// gingen als Falten mit ein. Hier bekommt jede feine Fläche die Zone ihrer Käfigfläche, und ausgenommen wird nur, was
// geometrisch gewollt ist: Kanten, die von einer scharfen Käfigkante abstammen (jede Schärfe), und die radialen Kanten an
// einer scharfen Spitze. DOM-frei.
import { type Kaefig, kanteZwischen } from '../../kaefig/halbkanten';
import type { Unterteilung } from '../../subdivision/catmullClark';
import type { V3 } from '../../versuch/catmullClark';

export const ZONEN = ['frei', 'kappe', 'ansatz', 'maul', 'kante', 'spitze'] as const;
export type Zone = (typeof ZONEN)[number];
/** Vorrang, wenn eine Kante zwischen zwei Zonen liegt (höher gewinnt). */
const VORRANG: Record<Zone, number> = { frei: 0, kappe: 1, ansatz: 2, maul: 3, kante: 4, spitze: 5 };

export type ZonenWert = { kanten: number; max: number; p99: number; ueber20: number; ueber10: number; ort: V3 };
export type ZonenFalten = {
  zonen: Record<Zone, ZonenWert>;
  /**
   * ausgenommene innere Kanten: Abkömmlinge scharfer Käfigkanten, radiale Kanten an scharfen Spitzen; `neu20` = davon über 20°
   * und auf der letzten Stufe nicht mehr scharf (die das alte Faltenmaß mitgezählt hat)
   */
  ausgenommen: { kanten: number; ueber20: number; neu20: number };
  /** alle inneren Kanten der letzten Stufe */
  gesamt: number;
};

export type ZonenOptionen = {
  /** Zone einer Käfigfläche (Vorrang vor der Kappen-Erkennung); `undefined` = automatisch */
  flaechenZone?: (f: number) => Zone | undefined;
  /** Kappenflächen der Röhre: ab dieser Käfigfläche (Röhre: (R − 1) · N) */
  kappeAb?: number;
};

/** Vorfahre (Käfigfläche) je Fläche der letzten Stufe: Kindflächen liegen je Elternfläche hintereinander (eine je Ecke). */
export function flaechenVorfahren(basis: Kaefig, unt: Unterteilung): Uint32Array {
  let vorfahr = Uint32Array.from({ length: basis.nF }, (_, f) => f);
  let k = basis;
  for (const st of unt.stufen) {
    const neu = new Uint32Array(st.kaefig.nF);
    let c = 0;
    for (let f = 0; f < k.nF; f++) {
      const m = k.fStart[f + 1]! - k.fStart[f]!;
      for (let i = 0; i < m; i++) neu[c++] = vorfahr[f]!;
    }
    vorfahr = neu;
    k = st.kaefig;
  }
  return vorfahr;
}

/** Kanten der letzten Stufe, die von einer scharfen Käfigkante abstammen (jede Schärfe > 0), als Markierung je Kante. */
export function faltenAbkoemmlinge(basis: Kaefig, unt: Unterteilung): Uint8Array {
  let markiert = new Uint8Array(basis.nE);
  for (let e = 0; e < basis.nE; e++) if (basis.eSchaerfe[e]! > 0) markiert[e] = 1;
  let k = basis;
  for (const st of unt.stufen) {
    const kind = st.kaefig;
    const neu = new Uint8Array(kind.nE);
    for (let e = 0; e < k.nE; e++) {
      if (!markiert[e]) continue;
      const mitte = k.n + e;
      const a = kanteZwischen(kind, k.eA[e]!, mitte);
      const b = kanteZwischen(kind, mitte, k.eB[e]!);
      if (a >= 0) neu[a] = 1;
      if (b >= 0) neu[b] = 1;
    }
    markiert = neu;
    k = kind;
  }
  return markiert;
}

/** Newell-Normale je Fläche aus den Lagen. */
function flaechenNormalen(k: Kaefig, P: ArrayLike<number>): Float64Array {
  const nrm = new Float64Array(3 * k.nF);
  for (let f = 0; f < k.nF; f++) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    const a = k.fStart[f]!;
    const b = k.fStart[f + 1]!;
    for (let h = a; h < b; h++) {
      const p = k.fVerts[h]!;
      const q = k.fVerts[h + 1 < b ? h + 1 : a]!;
      nx += (P[3 * p + 1]! - P[3 * q + 1]!) * (P[3 * p + 2]! + P[3 * q + 2]!);
      ny += (P[3 * p + 2]! - P[3 * q + 2]!) * (P[3 * p]! + P[3 * q]!);
      nz += (P[3 * p]! - P[3 * q]!) * (P[3 * p + 1]! + P[3 * q + 1]!);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    nrm[3 * f] = nx / l;
    nrm[3 * f + 1] = ny / l;
    nrm[3 * f + 2] = nz / l;
  }
  return nrm;
}

/**
 * Faltenmaß nach Zonen auf der letzten Stufe (Lagen `fein`, Grenzlagen). Zone einer feinen Fläche = Zone ihrer Käfigfläche:
 * `spitze` (Käfigfläche an einem Punkt mit Punktschärfe), `kante` (Käfigfläche mit einer scharfen Kante), `maul`/`ansatz`
 * (über `flaechenZone`), `kappe` (ab `kappeAb`), sonst `frei`. Eine Kante zählt in der Zone mit dem höheren Vorrang ihrer
 * beiden Flächen.
 */
export function faltenNachZonen(basis: Kaefig, unt: Unterteilung, fein: ArrayLike<number>, opt: ZonenOptionen = {}): ZonenFalten {
  const fk = unt.stufen[unt.stufen.length - 1]!.kaefig;
  const vorfahr = flaechenVorfahren(basis, unt);
  const abk = faltenAbkoemmlinge(basis, unt);
  // Zone je Käfigfläche
  const zoneK: Zone[] = [];
  for (let f = 0; f < basis.nF; f++) {
    let z: Zone = opt.flaechenZone?.(f) ?? (opt.kappeAb !== undefined && f >= opt.kappeAb ? 'kappe' : 'frei');
    let kante = false;
    let spitze = false;
    for (let h = basis.fStart[f]!; h < basis.fStart[f + 1]!; h++) {
      if (basis.vSchaerfe[basis.fVerts[h]!]! > 0) spitze = true;
      if (basis.eSchaerfe[basis.hEdge[h]!]! > 0) kante = true;
    }
    if (kante && VORRANG.kante > VORRANG[z]) z = 'kante';
    if (spitze) z = 'spitze';
    zoneK.push(z);
  }
  const nrm = flaechenNormalen(fk, fein);
  const winkel: Record<Zone, number[]> = { frei: [], kappe: [], ansatz: [], maul: [], kante: [], spitze: [] };
  const orte: Record<Zone, { w: number; ort: V3 }> = Object.fromEntries(ZONEN.map((z) => [z, { w: -1, ort: [0, 0, 0] as V3 }])) as Record<Zone, { w: number; ort: V3 }>;
  let ausgenommen = 0;
  let ausgenommen20 = 0;
  let neu20 = 0;
  let gesamt = 0;
  for (let e = 0; e < fk.nE; e++) {
    if (fk.eFlaechen[e] !== 2) continue;
    const h = fk.eHalb[e]!;
    const t = fk.hTwin[h]!;
    if (t < 0) continue;
    gesamt++;
    const f1 = fk.hFace[h]!;
    const f2 = fk.hFace[t]!;
    const c = nrm[3 * f1]! * nrm[3 * f2]! + nrm[3 * f1 + 1]! * nrm[3 * f2 + 1]! + nrm[3 * f1 + 2]! * nrm[3 * f2 + 2]!;
    const w = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
    // gewollt: Abkömmling einer scharfen Käfigkante oder radiale Kante an einer scharfen Spitze (Punktindex bleibt über die Stufen)
    const a = fk.eA[e]!;
    const b = fk.eB[e]!;
    const spitzeRadial = (a < basis.n && basis.vSchaerfe[a]! > 0) || (b < basis.n && basis.vSchaerfe[b]! > 0);
    if (abk[e] || spitzeRadial || fk.eSchaerfe[e]! > 0) {
      ausgenommen++;
      if (w > 20) {
        ausgenommen20++;
        if (!(fk.eSchaerfe[e]! > 0)) neu20++;
      }
      continue;
    }
    const z1 = zoneK[vorfahr[f1]!]!;
    const z2 = zoneK[vorfahr[f2]!]!;
    const z = VORRANG[z1] >= VORRANG[z2] ? z1 : z2;
    winkel[z].push(w);
    if (w > orte[z].w) orte[z] = { w, ort: [fein[3 * a]!, fein[3 * a + 1]!, fein[3 * a + 2]!] };
  }
  const zonen = {} as Record<Zone, ZonenWert>;
  for (const z of ZONEN) {
    const ws = winkel[z].sort((x, y) => x - y);
    zonen[z] = {
      kanten: ws.length,
      max: ws.length ? ws[ws.length - 1]! : 0,
      p99: ws.length ? ws[Math.floor(0.99 * (ws.length - 1))]! : 0,
      ueber20: ws.filter((w) => w > 20).length,
      ueber10: ws.filter((w) => w > 10).length,
      ort: orte[z].ort,
    };
  }
  return { zonen, ausgenommen: { kanten: ausgenommen, ueber20: ausgenommen20, neu20 }, gesamt };
}

/** Kurzform für eine Röhren-Ableitung (Kappen ab (R − 1) · N). */
export function faltenNachZonenRoehre(abl: { kaefig: Kaefig; unterteilung: Unterteilung; fein: ArrayLike<number>; vorlage: { R: number; N: number } }, opt: Omit<ZonenOptionen, 'kappeAb'> = {}): ZonenFalten {
  return faltenNachZonen(abl.kaefig, abl.unterteilung, abl.fein, { ...opt, kappeAb: (abl.vorlage.R - 1) * abl.vorlage.N });
}
