// Teil A (Plan „Maul als Einsatz“, Entwurf 3.2 und 3.3), Schritt A7: die Haut des Einsatzes formtreu lösen, Kiefer gleich.
// Unbekannt sind die inneren Hautpunkte der rechten Hälfte (Reihen 1 … J−1, Speichen 0 … 2m; auf den Nahtspeichen ist z = 0),
// die linke Hälfte ist ihr Spiegelbild. Fest sind die Lippenschleife (A6), der Rand von M, der Kragen und alles außerhalb
// (Lagen von K1). Abtastpunkte sind alle feinen Grenzpunkte der Stufe L in den Hautflächen der rechten Hälfte (Ziel: nächster
// Punkt auf A0 mit dessen Normale) und im Kragen (Ziel: der eigene feine Punkt von K1 an derselben Blockstelle). Das Residuum
// ist anisotrop (Normale 1, tangential 0,05), dazu eine schwache Glätte |L(x − x₀)|² (Umbrella, Startgitter aus A5). Je Runde
// linear, drei Runden mit neu gelegten Zielen (Punkt zu Ebene). Lippenwulst: Abtastpunkte im Lippenband bekommen einen
// Zielversatz h·sin²(πd/w)·n (h ≈ 0,4 px), damit sich geschlossene Lippen nicht tangential berühren. Die Haut liest wegen
// der unendlich scharfen Falte keine Taschenpunkte; Tasche und Rachen bleiben auf ihren Startlagen (A8). DOM-frei.
import { alleFlaechen, type Kaefig } from '../../kaefig/halbkanten';
import { luLoesen, luZerlegen } from '../../loeser/lu';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import type { FeldSpec } from './feld';
import { ankerVon, type FeinNetz, feinNetz } from './flaeche';
import { lippenKurve } from './lippe';
import { type EinsatzTopologie, punktNormalen } from './topologie';

type V3 = [number, number, number];
const PX = 461;

export type LoesenOptionen = {
  /** Unterteilungsstufe der Abtastung (K1 auf L = A0 auf L + 1) */
  stufen?: number;
  /** Gewicht des tangentialen Residuums */
  tangential?: number;
  /** Glätte gegen das Startgitter */
  glaette?: number;
  runden?: number;
  /** Lippenwulst: Höhe in px und Breite als Anteil der Kopfhöhe am Mundwinkel */
  wulst?: number;
  wulstBreite?: number;
};

export type GeloesterEinsatz = {
  /** Käfiglagen: Lippe aus A6, Haut gelöst, Tasche und Rachen wie in A5 */
  xyz: Float64Array;
  kaefig: Kaefig;
  /** Breite des Lippenbands (Welt) */
  wulstBreite: number;
  unbekannte: number;
  abtastpunkte: number;
  /** Restnorm je Runde (mittlerer Normalabstand der Abtastpunkte in px) */
  rest: number[];
};

/** Bereich je Käfigfläche des Einsatz-Käfigs: 0 außen, 1 Kragen, 2 Haut rechts, 3 Haut links, 4 Tasche/Rachen. */
export function flaechenBereiche(t: EinsatzTopologie, feld: FeldSpec): Uint8Array {
  const nAltF = t.alteFlaeche.length;
  const kragen = new Set(feld.kragen);
  const proHaelfte = (t.J + t.K) * 2 * t.m;
  const out = new Uint8Array(t.kaefig.nF);
  for (let f = 0; f < t.kaefig.nF; f++) {
    if (f < nAltF) {
      out[f] = kragen.has(t.alteFlaeche[f]!) ? 1 : 0;
      continue;
    }
    const e = f - nAltF;
    if (e >= 2 * proHaelfte) out[f] = 4;
    else {
      const lokal = e % proHaelfte;
      out[f] = lokal < t.J * 2 * t.m ? (e < proHaelfte ? 2 : 3) : 4;
    }
  }
  return out;
}

/** Kopfhöhe am Mundwinkel: Höhenausdehnung des feinen Netzes in einem schmalen Fenster um x des Mundwinkels. */
function kopfHoehe(netz: FeinNetz, c: V3): number {
  let lo = Infinity;
  let hi = -Infinity;
  let xlo = Infinity;
  let xhi = -Infinity;
  const P = netz.punkte;
  for (let i = 0; i < P.length; i += 3) {
    xlo = Math.min(xlo, P[i]!);
    xhi = Math.max(xhi, P[i]!);
  }
  const fenster = 0.01 * (xhi - xlo);
  for (let i = 0; i < P.length; i += 3) {
    if (Math.abs(P[i]! - c[0]) > fenster) continue;
    lo = Math.min(lo, P[i + 1]!);
    hi = Math.max(hi, P[i + 1]!);
  }
  return Number.isFinite(hi - lo) && hi > lo ? hi - lo : 0.25 * (xhi - xlo);
}

/** Abstand eines Punkts zu einer Polylinie (3D). */
function abstandZuZug(p: V3, zug: readonly V3[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < zug.length; i++) {
    const q = zug[i]!;
    const r = zug[i + 1]!;
    const e: V3 = [r[0] - q[0], r[1] - q[1], r[2] - q[2]];
    const l2 = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
    const t = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - q[0]) * e[0] + (p[1] - q[1]) * e[1] + (p[2] - q[2]) * e[2]) / l2)) : 0;
    best = Math.min(best, Math.hypot(q[0] + t * e[0] - p[0], q[1] + t * e[1] - p[1], q[2] + t * e[2] - p[2]));
  }
  return best;
}

/**
 * Haut lösen. `netz` = feines Netz von A0 auf Stufe L + 1 (= K1 auf L, gleiche Nummern), `lippe` = Kontrollpunkte der
 * Lippenseite aus A6 (U₀ … U_{m−1}, c).
 */
export function einsatzLoesen(t: EinsatzTopologie, k1: Kaefig, feld: FeldSpec, netz: FeinNetz, lippe: readonly V3[], opt: LoesenOptionen = {}): GeloesterEinsatz {
  const L = opt.stufen ?? 2;
  const wt = opt.tangential ?? 0.05;
  const lambda = opt.glaette ?? 1e-3;
  const runden = opt.runden ?? 3;
  const { m, J } = t;
  const xyz = Float64Array.from(t.kaefig.xyz);
  // Lippe aus A6 in beide Kiefer und beide Hälften (U_k und D_k bitgleich)
  for (let k = 0; k <= 2 * m; k++) {
    const p = lippe[k <= m ? k : 2 * m - k]!;
    const i = t.haut[0]![k]!;
    xyz[3 * i] = p[0];
    xyz[3 * i + 1] = p[1];
    xyz[3 * i + 2] = k === 0 || k === 2 * m ? 0 : p[2];
    const s = t.spiegel[i]!;
    if (s !== i) {
      xyz[3 * s] = p[0];
      xyz[3 * s + 1] = p[1];
      xyz[3 * s + 2] = -p[2];
    }
  }
  const kaefig: Kaefig = { ...t.kaefig, xyz };
  const u = unterteilung(kaefig, L);
  const S = u.grenze;
  const flaechen = alleFlaechen(u.stufen[u.stufen.length - 1]!.kaefig);
  const block = flaechen.length / kaefig.nF;
  const bereich = flaechenBereiche(t, feld);
  // K1 auf derselben Stufe: Ziele im Kragen (Blockstelle), Normalen aus dem feinen Netz von A0 (gleiche Nummern wie K1 auf L)
  const u1 = unterteilung(k1, L);
  const fein1 = anwenden3(u1.grenze, k1.xyz);
  const flaechen1 = alleFlaechen(u1.stufen[u1.stufen.length - 1]!.kaefig);
  const normalen = punktNormalen(netz);
  // Abtastpunkte: Kragen zuerst (Ziel = Punkt von K1), dann die Hautflächen der rechten Hälfte (Ziel = Projektion auf A0)
  const zielK1 = new Map<number, number>();
  const istRechts = (f: number) => {
    let z = 0;
    for (let h = kaefig.fStart[f]!; h < kaefig.fStart[f + 1]!; h++) z += xyz[3 * kaefig.fVerts[h]! + 2]!;
    return z > 0;
  };
  for (let f = 0; f < t.alteFlaeche.length; f++) {
    if (bereich[f] !== 1 || !istRechts(f)) continue;
    const f1 = t.alteFlaeche[f]!;
    for (let q = 0; q < block; q++) {
      const ea = flaechen[f * block + q]!;
      const e1 = flaechen1[f1 * block + q]!;
      for (let c = 0; c < ea.length; c++) zielK1.set(ea[c]!, e1[c]!);
    }
  }
  const hautPunkte = new Set<number>();
  for (let f = t.alteFlaeche.length; f < kaefig.nF; f++) {
    if (bereich[f] !== 2) continue;
    for (let q = 0; q < block; q++) for (const p of flaechen[f * block + q]!) if (!zielK1.has(p)) hautPunkte.add(p);
  }
  // Unbekannte: freie Hautpunkte der rechten Hälfte (Nahtspeichen ohne z)
  const frei = new Int32Array(kaefig.n).fill(-1);
  let nu = 0;
  const freie: number[] = [];
  for (let r = 1; r < J; r++)
    for (let k = 0; k <= 2 * m; k++) {
      const p = t.haut[r]![k]!;
      frei[p] = nu;
      freie.push(p);
      nu += k === 0 || k === 2 * m ? 2 : 3;
    }
  const naht = (p: number) => t.spiegel[p] === p;
  /** Unbekannte und Faktor für Koordinate d des Käfigpunkts j; null = fest */
  const koeff = (j: number, d: number): [number, number] | null => {
    let p = j;
    let sz = 1;
    if (frei[p]! < 0) {
      const s = t.spiegel[j]!;
      if (s < 0 || frei[s]! < 0) return null;
      p = s;
      sz = -1;
    }
    if (d < 2) return [frei[p]! + d, 1];
    if (naht(p)) return null;
    return [frei[p]! + 2, sz];
  };
  // Lippenband: Abstand zur Lippenkurve (rechte Hälfte) kleiner als die Wulstbreite
  const c = lippe[lippe.length - 1]!;
  const wulstBreite = (opt.wulstBreite ?? 0.03) * kopfHoehe(netz, c);
  const wulst = (opt.wulst ?? 0.4) / PX;
  const kurve = lippenKurve(lippe, 32);
  // Startgitter x₀ und Umbrella-Glätte der freien Punkte
  const x0 = Float64Array.from(xyz);
  const nachbarn = (p: number): number[] => {
    const out: number[] = [];
    for (let i = kaefig.vKStart[p]!; i < kaefig.vKStart[p + 1]!; i++) {
      const e = kaefig.vKanten[i]!;
      out.push(kaefig.eA[e] === p ? kaefig.eB[e]! : kaefig.eA[e]!);
    }
    return out;
  };
  const abtast = [...zielK1.keys(), ...hautPunkte];
  const rest: number[] = [];
  // tangentialer Anker je Hautpunkt: Fußpunkt der Startlage auf A0 (fest über alle Runden, sonst gleiten die Käfigpunkte
  // tangential frei und die Haut bekommt Beulen); die Normalkomponente misst je Runde am neuen Fußpunkt
  const anker = new Map<number, V3>();
  {
    const fein0 = anwenden3(S, xyz);
    for (const i of hautPunkte) anker.set(i, ankerVon(netz, [fein0[3 * i]!, fein0[3 * i + 1]!, fein0[3 * i + 2]!]).lage);
  }
  for (let runde = 0; runde < runden; runde++) {
    const fein = anwenden3(S, xyz);
    const N = new Float64Array(nu * nu);
    const b = new Float64Array(nu);
    let summeAbstand = 0;
    let nAbtast = 0;
    const gD = 1 / Math.max(1, abtast.length);
    for (const i of abtast) {
      // Zeile der Grenzmaske: affin in den Unbekannten
      const eintraege: [number, number, number][] = []; // (Koordinate, Unbekannte, Faktor)
      const konst: V3 = [0, 0, 0];
      for (let z = S.start[i]!; z < S.start[i + 1]!; z++) {
        const j = S.index[z]!;
        const w = S.wert[z]!;
        for (let d = 0; d < 3; d++) {
          const k = koeff(j, d);
          if (k) eintraege.push([d, k[0], w * k[1]]);
          else konst[d] = konst[d]! + w * xyz[3 * j + d]!;
        }
      }
      if (!eintraege.length) continue;
      const p: V3 = [fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!];
      let ziel: V3;
      let n: V3;
      let tang: V3 | null = null;
      const k1i = zielK1.get(i);
      if (k1i !== undefined) {
        ziel = [fein1[3 * k1i]!, fein1[3 * k1i + 1]!, fein1[3 * k1i + 2]!];
        n = [normalen[3 * k1i]!, normalen[3 * k1i + 1]!, normalen[3 * k1i + 2]!];
      } else {
        tang = anker.get(i)!;
        const a = ankerVon(netz, p);
        const T = netz.dreiecke;
        const ia = T[3 * a.dreieck]!;
        const ib = T[3 * a.dreieck + 1]!;
        const ic = T[3 * a.dreieck + 2]!;
        const wa = 1 - a.b1 - a.b2;
        n = [0, 0, 0];
        for (let d = 0; d < 3; d++) n[d] = wa * normalen[3 * ia + d]! + a.b1 * normalen[3 * ib + d]! + a.b2 * normalen[3 * ic + d]!;
        const ln = Math.hypot(...n) || 1;
        n = [n[0] / ln, n[1] / ln, n[2] / ln];
        ziel = [...a.lage];
        // Lippenwulst
        if (wulst > 0) {
          const dl = abstandZuZug(p, kurve);
          if (dl < wulstBreite) {
            const s = Math.sin((Math.PI * dl) / wulstBreite);
            for (let d = 0; d < 3; d++) ziel[d] = ziel[d]! + wulst * s * s * n[d]!;
          }
        }
      }
      summeAbstand += Math.abs((p[0] - ziel[0]) * n[0] + (p[1] - ziel[1]) * n[1] + (p[2] - ziel[2]) * n[2]);
      nAbtast++;
      // Residuum: Normalanteil n·(p − Ziel), tangential wt·|(I − nnᵀ)(p − Anker)|² (Anker = Ziel im Kragen):
      // W = n nᵀ + wt·(I − n nᵀ), rechte Seite W_n·Ziel + W_t·Anker
      const W = (d1: number, d2: number) => (d1 === d2 ? wt : 0) + (1 - wt) * n[d1]! * n[d2]!;
      const Wn = (d1: number, d2: number) => n[d1]! * n[d2]!;
      const Wt = (d1: number, d2: number) => wt * ((d1 === d2 ? 1 : 0) - n[d1]! * n[d2]!);
      const a0 = tang ?? ziel;
      const rn: V3 = [ziel[0] - konst[0], ziel[1] - konst[1], ziel[2] - konst[2]];
      const rt: V3 = [a0[0] - konst[0], a0[1] - konst[1], a0[2] - konst[2]];
      for (const [d1, u1, a1] of eintraege) {
        let rechts = 0;
        for (let d2 = 0; d2 < 3; d2++) rechts += Wn(d1, d2) * rn[d2]! + Wt(d1, d2) * rt[d2]!;
        b[u1] = b[u1]! + gD * a1 * rechts;
        for (const [d2, u2, a2] of eintraege) N[u1 * nu + u2] = N[u1 * nu + u2]! + gD * a1 * a2 * W(d1, d2);
      }
    }
    rest.push((summeAbstand / Math.max(1, nAbtast)) * PX);
    // Glätte: L(x − x₀) für jeden freien Punkt der rechten Hälfte
    const gG = lambda / Math.max(1, freie.length);
    for (const p of freie) {
      const nb = nachbarn(p);
      for (let d = 0; d < 3; d++) {
        const eintraege: [number, number][] = [];
        let konst = 0;
        const add = (j: number, f: number) => {
          const k = koeff(j, d);
          if (k) eintraege.push([k[0], f * k[1]]);
          else konst += f * xyz[3 * j + d]!;
        };
        add(p, 1);
        for (const q of nb) add(q, -1 / nb.length);
        let soll = x0[3 * p + d]!;
        for (const q of nb) soll -= x0[3 * q + d]! / nb.length;
        const r0 = soll - konst;
        for (const [u1, a1] of eintraege) {
          b[u1] = b[u1]! + gG * a1 * r0;
          for (const [u2, a2] of eintraege) N[u1 * nu + u2] = N[u1 * nu + u2]! + gG * a1 * a2;
        }
      }
    }
    const x = luLoesen(luZerlegen(N, nu), b);
    for (const p of freie) {
      const i0 = frei[p]!;
      xyz[3 * p] = x[i0]!;
      xyz[3 * p + 1] = x[i0 + 1]!;
      xyz[3 * p + 2] = naht(p) ? 0 : x[i0 + 2]!;
      const s = t.spiegel[p]!;
      if (s !== p) {
        xyz[3 * s] = xyz[3 * p]!;
        xyz[3 * s + 1] = xyz[3 * p + 1]!;
        xyz[3 * s + 2] = -xyz[3 * p + 2]!;
      }
    }
  }
  return { xyz, kaefig, wulstBreite, unbekannte: nu, abtastpunkte: abtast.length, rest };
}

/** Feines Netz von A0 auf Stufe L + 1 für `einsatzLoesen` (= K1 auf Stufe L, gleiche Nummern). */
export function a0Netz(k1: Kaefig, L = 2): FeinNetz {
  const u = unterteilung(k1, L);
  return feinNetz(anwenden3(u.grenze, k1.xyz), alleFlaechen(u.stufen[u.stufen.length - 1]!.kaefig));
}

export type EinsatzMasse = {
  /** größte Abweichung außerhalb von M ∪ C gegen K1 (Welt) */
  aussen: number;
  /** Haut in M ∪ C (rechte Hälfte, ohne Lippenband) gegen A0: Abstand in px und Normalenwinkel in Grad, je Maximum und 99 % */
  hautMax: number;
  hautP99: number;
  normaleMax: number;
  normaleP99: number;
  /** größter Knick zwischen feinen Nachbarflächen (ohne Falten) in M ∪ C: Einsatz gegen A0 im selben Bereich */
  falten: number;
  faltenA0: number;
  /** größte Erhebung im Lippenband über A0 (px) */
  wulst: number;
  ortHaut: V3;
  ortNormale: V3;
};

/** Knickwinkel je feiner Kante (ohne Falten) zwischen zwei Flächen, die beide zum Bereich gehören; größter Wert. */
function groessterKnick(k: Kaefig, fein: Float64Array, flaechen: readonly number[][], imBereich: (f: number) => boolean): number {
  const normalen = flaechen.map((f) => {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let i = 0; i < f.length; i++) {
      const p = f[i]!;
      const q = f[(i + 1) % f.length]!;
      nx += (fein[3 * p + 1]! - fein[3 * q + 1]!) * (fein[3 * p + 2]! + fein[3 * q + 2]!);
      ny += (fein[3 * p + 2]! - fein[3 * q + 2]!) * (fein[3 * p]! + fein[3 * q]!);
      nz += (fein[3 * p]! - fein[3 * q]!) * (fein[3 * p + 1]! + fein[3 * q + 1]!);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l] as V3;
  });
  let max = 0;
  for (let e = 0; e < k.nE; e++) {
    if (k.eFlaechen[e] !== 2 || k.eSchaerfe[e]! > 0) continue;
    const h = k.eHalb[e]!;
    const tw = k.hTwin[h]!;
    if (tw < 0) continue;
    const f1 = k.hFace[h]!;
    const f2 = k.hFace[tw]!;
    if (!imBereich(f1) || !imBereich(f2)) continue;
    const a = normalen[f1]!;
    const b = normalen[f2]!;
    max = Math.max(max, (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI);
  }
  return max;
}

/** Maße des gelösten Einsatzes nach Entwurf 3.5 (eine Stufe feiner als das Lösen). */
export function einsatzMessen(g: GeloesterEinsatz, t: EinsatzTopologie, k1: Kaefig, feld: FeldSpec, lippe: readonly V3[], stufen = 3): EinsatzMasse {
  const ua = unterteilung(g.kaefig, stufen);
  const ka = ua.stufen[ua.stufen.length - 1]!.kaefig;
  const feinA = anwenden3(ua.grenze, g.kaefig.xyz);
  const flA = alleFlaechen(ka);
  const u1 = unterteilung(k1, stufen);
  const k1f = u1.stufen[u1.stufen.length - 1]!.kaefig;
  const fein1 = anwenden3(u1.grenze, k1.xyz);
  const fl1 = alleFlaechen(k1f);
  const block = flA.length / g.kaefig.nF;
  const bereich = flaechenBereiche(t, feld);
  const rechtsA = (f: number) => {
    let z = 0;
    for (let h = g.kaefig.fStart[f]!; h < g.kaefig.fStart[f + 1]!; h++) z += g.kaefig.xyz[3 * g.kaefig.fVerts[h]! + 2]!;
    return z > 0;
  };
  // außen: Blöcke außerhalb von M ∪ C gegen K1
  let aussen = 0;
  for (let f = 0; f < t.alteFlaeche.length; f++) {
    if (bereich[f] !== 0) continue;
    const f1 = t.alteFlaeche[f]!;
    for (let q = 0; q < block; q++) {
      const ea = flA[f * block + q]!;
      const e1 = fl1[f1 * block + q]!;
      for (let c = 0; c < ea.length; c++) for (let d = 0; d < 3; d++) aussen = Math.max(aussen, Math.abs(feinA[3 * ea[c]! + d]! - fein1[3 * e1[c]! + d]!));
    }
  }
  // Bezug A0 = K1 auf derselben Stufe (Dreiecke, Punktnormalen); Normalen des Einsatzes je feinem Punkt
  const bezug = feinNetz(fein1, fl1);
  const nBezug = punktNormalen(bezug);
  const nA = punktNormalen(feinNetz(feinA, flA));
  const kurve = lippenKurve(lippe, 32);
  const punkte = new Set<number>();
  const imBereichA = new Uint8Array(flA.length);
  for (let f = 0; f < g.kaefig.nF; f++) {
    const b = bereich[f]!;
    if (!(b === 1 || b === 2) || !rechtsA(f)) continue;
    for (let q = 0; q < block; q++) {
      imBereichA[f * block + q] = 1;
      for (const p of flA[f * block + q]!) punkte.add(p);
    }
  }
  const abstaende: number[] = [];
  const winkel: number[] = [];
  let hautMax = 0;
  let normaleMax = 0;
  let wulst = 0;
  let ortHaut: V3 = [0, 0, 0];
  let ortNormale: V3 = [0, 0, 0];
  for (const i of punkte) {
    const p: V3 = [feinA[3 * i]!, feinA[3 * i + 1]!, feinA[3 * i + 2]!];
    const a = ankerVon(bezug, p);
    const T = bezug.dreiecke;
    const ia = T[3 * a.dreieck]!;
    const ib = T[3 * a.dreieck + 1]!;
    const ic = T[3 * a.dreieck + 2]!;
    const wa = 1 - a.b1 - a.b2;
    const n: V3 = [0, 0, 0];
    for (let d = 0; d < 3; d++) n[d] = wa * nBezug[3 * ia + d]! + a.b1 * nBezug[3 * ib + d]! + a.b2 * nBezug[3 * ic + d]!;
    const ln = Math.hypot(...n) || 1;
    const dl = abstandZuZug(p, kurve);
    if (dl < g.wulstBreite) {
      const hoch = ((p[0] - a.lage[0]) * n[0] + (p[1] - a.lage[1]) * n[1] + (p[2] - a.lage[2]) * n[2]) / ln;
      wulst = Math.max(wulst, hoch * PX);
      continue;
    }
    const dpx = a.abstand * PX;
    abstaende.push(dpx);
    if (dpx > hautMax) {
      hautMax = dpx;
      ortHaut = p;
    }
    const lA = Math.hypot(nA[3 * i]!, nA[3 * i + 1]!, nA[3 * i + 2]!) || 1;
    const cs = (n[0] * nA[3 * i]! + n[1] * nA[3 * i + 1]! + n[2] * nA[3 * i + 2]!) / (ln * lA);
    const w = (Math.acos(Math.max(-1, Math.min(1, cs))) * 180) / Math.PI;
    winkel.push(w);
    if (w > normaleMax) {
      normaleMax = w;
      ortNormale = p;
    }
  }
  const q99 = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(0.99 * (a.length - 1))]! : 0);
  // Knicke: Einsatz in M ∪ C (rechts) gegen A0 in den Flächen von M ∪ C (rechts)
  const falten = groessterKnick(ka, feinA, flA, (f) => imBereichA[f] === 1);
  const inMC = new Uint8Array(k1.nF);
  for (const f of feld.feld) inMC[f] = 1;
  for (const f of feld.kragen) inMC[f] = 1;
  const rechts1 = (f: number) => {
    let z = 0;
    for (let h = k1.fStart[f]!; h < k1.fStart[f + 1]!; h++) z += k1.xyz[3 * k1.fVerts[h]! + 2]!;
    return z > 0;
  };
  const block1 = fl1.length / k1.nF;
  const faltenA0 = groessterKnick(k1f, fein1, fl1, (f) => {
    const f0 = Math.floor(f / block1);
    return inMC[f0] === 1 && rechts1(f0);
  });
  return { aussen, hautMax, hautP99: q99(abstaende), normaleMax, normaleP99: q99(winkel), falten, faltenA0, wulst, ortHaut, ortNormale };
}
