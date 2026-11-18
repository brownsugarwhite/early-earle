// Teil A (Plan „Maul als Einsatz“, Entwurf 3.2 und 3.3), Schritt A7: die Haut des Einsatzes formtreu lösen, Kiefer gleich.
// Unbekannt sind die inneren Hautpunkte der rechten Hälfte (Reihen 1 … J−1, Speichen 0 … 2m; auf den Nahtspeichen ist z = 0),
// die linke Hälfte ist ihr Spiegelbild. Fest sind die Lippenschleife (A6), der Rand von M, der Kragen und alles außerhalb
// (Lagen von K1). Abtastpunkte sind alle feinen Grenzpunkte der Stufe L in den Hautflächen der rechten Hälfte (Ziel: nächster
// Punkt auf A0 mit dessen Normale) und im Kragen (Ziel: der eigene feine Punkt von K1 an derselben Blockstelle). Das Residuum
// ist anisotrop (Normale 1, tangential 0,05), dazu eine schwache Glätte |L(x − x₀)|² (Umbrella, Startgitter aus A5). Je Runde
// linear, drei Runden mit neu gelegten Zielen (Punkt zu Ebene). Lippenwulst (nur Schleifengitter; im Kernring 0, Plan 21.10.,
// E1): Abtastpunkte im Lippenband bekommen einen Zielversatz h·sin²(πd/w)·n (h ≈ 0,4 px), damit sich geschlossene Lippen nicht
// tangential berühren. Auf K2 löst der Käfig das schmale Band auf (Steigung bis 12°) und knickt längs der Lippe um 3–5° — im
// Kernring war er der Hauptgrund für das verfehlte Mundwinkel-Tor (mit Wulst 1, ohne 28 von 39); dass sich die Lippen nicht
// berühren, ist Sache der Tasche (A8), und ein geschlossenes Maul darf auf der Haut unsichtbar sein. Die Haut liest wegen der
// unendlich scharfen Falte keine Taschenpunkte; Tasche und Rachen bleiben auf ihren Startlagen (A8). Die Normal-
// gleichungen sind dünn besetzt (jeder Abtastpunkt koppelt nur die Käfigpunkte seiner Grenzmaske): Zeilen in der Hülle einer
// Cuthill-McKee-Reihenfolge, Cholesky (`normalSystem`, Plan 21.10., E1 — die dichte LU brauchte auf K2 Sekunden). DOM-frei.
import { alleFlaechen, type Kaefig } from '../../kaefig/halbkanten';
import { type NormalZeile, normalSystem } from '../../loeser/normalSystem';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import type { FeldSpec } from './feld';
import { ankerVon, type FeinNetz, feinNetz } from './flaeche';
import { lippenKurve, lippenPunkt } from './lippe';
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
  /** Lippenwulst: Höhe in px (Standard 0,4 im Schleifengitter, 0 im Kernring) und Breite als Anteil der Kopfhöhe am
   * Mundwinkel (auch die Breite des Lippenbands, das die Haut-Messung auslässt) */
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
export function einsatzLoesen(t: EinsatzTopologie, k1: Kaefig, netz: FeinNetz, lippe: readonly V3[], opt: LoesenOptionen = {}): GeloesterEinsatz {
  // Abtastung auf derselben Grenzfläche wie Stufe 3 von A0 (K1 auf 2, K2 auf 1)
  const L = opt.stufen ?? 3 - t.stufe;
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
  const bereich = t.bereich;
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
  // (Leiter, E2.6: fehlende Punkte −1 übergehen, die Sprossenenden auf der Naht dazu; Naht = eigener Spiegel)
  const hinzu = (p: number) => {
    frei[p] = nu;
    freie.push(p);
    nu += t.spiegel[p] === p ? 2 : 3;
  };
  for (let r = 1; r < J; r++) for (const p of t.haut[r]!) if (p >= 0) hinzu(p);
  for (const p of t.leiter?.X ?? []) hinzu(p);
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
  // Achse je Unbekannter und Kopplungsgraph der Unbekannten (eigene Achsen, Käfignachbarn und deren Spiegelbilder) für die
  // Reihenfolge der Zerlegung; die Hülle selbst folgt aus den Zeilen
  const achse = new Uint8Array(nu);
  const nachbarnU: number[][] = Array.from({ length: nu }, () => []);
  {
    const unbekannteVon = (q: number): number[] => {
      const out: number[] = [];
      for (let d = 0; d < 3; d++) {
        const k = koeff(q, d);
        if (k) out.push(k[0]);
      }
      return out;
    };
    for (const p of freie) {
      const eigene = unbekannteVon(p);
      eigene.forEach((u, d) => (achse[u] = d));
      const um = new Set<number>(eigene);
      for (let i = kaefig.vKStart[p]!; i < kaefig.vKStart[p + 1]!; i++) {
        const e = kaefig.vKanten[i]!;
        for (const u of unbekannteVon(kaefig.eA[e] === p ? kaefig.eB[e]! : kaefig.eA[e]!)) um.add(u);
      }
      for (const u of eigene) for (const v of um) if (v !== u) nachbarnU[u]!.push(v);
    }
  }
  // Lippenband: Abstand zur Lippenkurve (rechte Hälfte) kleiner als die Wulstbreite
  const c = lippe[lippe.length - 1]!;
  const wulstBreite = (opt.wulstBreite ?? 0.03) * kopfHoehe(netz, c);
  const wulst = (opt.wulst ?? (t.gitter === 'kernring' ? 0 : 0.4)) / PX;
  const kurve = lippenKurve(lippe, 32, t.gitter === 'kernring' ? 'falte' : 'ecke', t.lippenAnfang, t.lippenEcken);
  const spitze = t.gitter === 'kernring' ? lippenPunkt(lippe, m, 'falte', t.lippenAnfang, t.lippenEcken) : null;
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
    const zeilen: NormalZeile[] = [];
    const b = new Float64Array(nu);
    let summeAbstand = 0;
    let nAbtast = 0;
    const gD = 1 / Math.max(1, abtast.length);
    for (const i of abtast) {
      // Zeile der Grenzmaske: affin in den Unbekannten (Faktor je Unbekannter; ihre Achse steht in `achse`)
      const koef = new Map<number, number>();
      const konst: V3 = [0, 0, 0];
      for (let z = S.start[i]!; z < S.start[i + 1]!; z++) {
        const j = S.index[z]!;
        const w = S.wert[z]!;
        for (let d = 0; d < 3; d++) {
          const k = koeff(j, d);
          if (k) koef.set(k[0], (koef.get(k[0]) ?? 0) + w * k[1]);
          else konst[d] = konst[d]! + w * xyz[3 * j + d]!;
        }
      }
      if (!koef.size) continue;
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
            // Kernring: Wulst läuft zur Spitze hin aus (sonst legt das um die Spitze laufende Band eine Beule auf den
            // Mundwinkel, gemessen 1–2° Knick)
            let aus = 1;
            if (spitze) {
              const q = Math.min(1, Math.hypot(p[0] - spitze[0], p[1] - spitze[1], p[2] - spitze[2]) / (2 * wulstBreite));
              aus = q * q * (3 - 2 * q);
            }
            for (let d = 0; d < 3; d++) ziel[d] = ziel[d]! + wulst * s * s * aus * n[d]!;
          }
        }
      }
      summeAbstand += Math.abs((p[0] - ziel[0]) * n[0] + (p[1] - ziel[1]) * n[1] + (p[2] - ziel[2]) * n[2]);
      nAbtast++;
      // Residuum: Normalanteil n·(p − Ziel), tangential wt·|(I − nnᵀ)(p − Anker)|² (Anker = Ziel im Kragen):
      // W = (1 − wt)·n nᵀ + wt·I — als Zeilen: eine längs der Normalen, je eine je Achse; rechte Seite W_n·Ziel + W_t·Anker
      const a0 = tang ?? ziel;
      const rn: V3 = [ziel[0] - konst[0], ziel[1] - konst[1], ziel[2] - konst[2]];
      const rt: V3 = [a0[0] - konst[0], a0[1] - konst[1], a0[2] - konst[2]];
      const nrn = n[0] * rn[0] + n[1] * rn[1] + n[2] * rn[2];
      const nrt = n[0] * rt[0] + n[1] * rt[1] + n[2] * rt[2];
      const index = [...koef.keys()];
      const wert = index.map((u) => koef.get(u)!);
      zeilen.push({ index, wert: wert.map((a, q) => a * n[achse[index[q]!]!]!), gewicht: gD * (1 - wt) });
      for (let d = 0; d < 3; d++) {
        const auf = index.map((u, q) => (achse[u] === d ? q : -1)).filter((q) => q >= 0);
        if (auf.length) zeilen.push({ index: auf.map((q) => index[q]!), wert: auf.map((q) => wert[q]!), gewicht: gD * wt });
      }
      index.forEach((u, q) => {
        const d = achse[u]!;
        b[u] = b[u]! + gD * wert[q]! * (n[d]! * nrn + wt * (rt[d]! - n[d]! * nrt));
      });
    }
    rest.push((summeAbstand / Math.max(1, nAbtast)) * PX);
    // Glätte: L(x − x₀) für jeden freien Punkt der rechten Hälfte
    const gG = lambda / Math.max(1, freie.length);
    for (const p of freie) {
      const nb = nachbarn(p);
      for (let d = 0; d < 3; d++) {
        const koefG = new Map<number, number>();
        let konst = 0;
        const add = (j: number, f: number) => {
          const k = koeff(j, d);
          if (k) koefG.set(k[0], (koefG.get(k[0]) ?? 0) + f * k[1]);
          else konst += f * xyz[3 * j + d]!;
        };
        add(p, 1);
        for (const q of nb) add(q, -1 / nb.length);
        let soll = x0[3 * p + d]!;
        for (const q of nb) soll -= x0[3 * q + d]! / nb.length;
        const r0 = soll - konst;
        if (!koefG.size) continue;
        zeilen.push({ index: [...koefG.keys()], wert: [...koefG.values()], gewicht: gG });
        for (const [u, a] of koefG) b[u] = b[u]! + gG * a * r0;
      }
    }
    const x = normalSystem(nu, zeilen, nachbarnU).loesenSpalte(b);
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
  /** Mitte der feinen Kante mit dem größten Knick (Einsatz) */
  ortKnick: V3;
  /** größter Knick nahe dem Mundwinkel (feine Kanten im Abstand ≤ 3 Kanten des Feldkäfigs von der Spitze): Einsatz, A0 */
  faltenEcke: number;
  faltenEckeA0: number;
  ortKnickEcke: V3;
};

/** Knickwinkel je feiner Kante (ohne Falten) zwischen zwei Flächen, die beide zum Bereich gehören; größter Wert und Mitte
 * seiner Kante. `ohne`: Kanten nahe diesen Punkten zählen nicht (Spitzen von A0: dort gibt es keinen glatten Bezug, der Winkel
 * zwischen den Flächen an der Spitze hängt allein am Netz um sie). */
function groessterKnick(k: Kaefig, fein: Float64Array, flaechen: readonly number[][], imBereich: (f: number) => boolean, nahe?: { p: V3; r: number }, ohne?: { p: V3[]; r: number }): { winkel: number; ort: V3 } {
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
  let ort: V3 = [0, 0, 0];
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
    const w = (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI;
    if (w > max) {
      const p = k.eA[e]!;
      const q = k.eB[e]!;
      const o: V3 = [0.5 * (fein[3 * p]! + fein[3 * q]!), 0.5 * (fein[3 * p + 1]! + fein[3 * q + 1]!), 0.5 * (fein[3 * p + 2]! + fein[3 * q + 2]!)];
      if (nahe && Math.hypot(o[0] - nahe.p[0], o[1] - nahe.p[1], o[2] - nahe.p[2]) > nahe.r) continue;
      if (ohne && ohne.p.some((q) => Math.hypot(o[0] - q[0], o[1] - q[1], o[2] - q[2]) < ohne.r)) continue;
      max = w;
      ort = o;
    }
  }
  return { winkel: max, ort };
}

/** Maße des gelösten Einsatzes nach Entwurf 3.5 (eine Stufe feiner als das Lösen). */
export function einsatzMessen(g: GeloesterEinsatz, t: EinsatzTopologie, k1: Kaefig, feld: FeldSpec, lippe: readonly V3[], stufen = 4 - t.stufe): EinsatzMasse {
  const ua = unterteilung(g.kaefig, stufen);
  const ka = ua.stufen[ua.stufen.length - 1]!.kaefig;
  const feinA = anwenden3(ua.grenze, g.kaefig.xyz);
  const flA = alleFlaechen(ka);
  const u1 = unterteilung(k1, stufen);
  const k1f = u1.stufen[u1.stufen.length - 1]!.kaefig;
  const fein1 = anwenden3(u1.grenze, k1.xyz);
  const fl1 = alleFlaechen(k1f);
  const block = flA.length / g.kaefig.nF;
  const bereich = t.bereich;
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
  const kurve = lippenKurve(lippe, 32, t.gitter === 'kernring' ? 'falte' : 'ecke', t.lippenAnfang, t.lippenEcken);
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
  // Kantenlänge des Feldkäfigs (Median): Maß für den Umkreis am Mundwinkel und um Spitzen
  const kanten: number[] = [];
  for (const f of feld.feld)
    for (let h = k1.fStart[f]!; h < k1.fStart[f + 1]!; h++) {
      const a = k1.fVerts[h]!;
      const b = k1.fVerts[h + 1 < k1.fStart[f + 1]! ? h + 1 : k1.fStart[f]!]!;
      kanten.push(Math.hypot(k1.xyz[3 * a]! - k1.xyz[3 * b]!, k1.xyz[3 * a + 1]! - k1.xyz[3 * b + 1]!, k1.xyz[3 * a + 2]! - k1.xyz[3 * b + 2]!));
    }
  kanten.sort((a, b) => a - b);
  const kante = kanten[kanten.length >> 1]!;
  const inMC = new Uint8Array(k1.nF);
  for (const f of feld.feld) inMC[f] = 1;
  for (const f of feld.kragen) inMC[f] = 1;
  // Spitzen von A0 in M ∪ C: Knicke im Umkreis einer Feldkante (eine Ecke wirkt auf ihren Käfig-Ring) zählen weder beim
  // Einsatz noch bei A0 (E2)
  const spitzen: V3[] = [];
  for (let v = 0; v < k1.n; v++) {
    if (!(k1.vSchaerfe[v]! > 0)) continue;
    let imFeld = false;
    for (let i = k1.vFStart[v]!; i < k1.vFStart[v + 1]!; i++) if (inMC[k1.vFlaechen[i]!]) imFeld = true;
    if (imFeld) spitzen.push([k1.xyz[3 * v]!, k1.xyz[3 * v + 1]!, k1.xyz[3 * v + 2]!]);
  }
  const ohne = spitzen.length ? { p: spitzen, r: kante } : undefined;
  // … beim Einsatz dazu seine eigenen Spitzen (die nachgebildeten: Nahtpunkt, Ecke der Lippe am Linienanfang) und die Ecken, an
  // denen drei Falten zusammenlaufen (Leiter, E2.6: wo eine Falte von A0 die Lippe kreuzt, wird der Lippenpunkt eine Ecke)
  const eigene: V3[] = [...spitzen];
  const faltenAm = new Uint8Array(g.kaefig.n);
  for (let e = 0; e < g.kaefig.nE; e++)
    if (g.kaefig.eSchaerfe[e]! > 0) {
      faltenAm[g.kaefig.eA[e]!]!++;
      faltenAm[g.kaefig.eB[e]!]!++;
    }
  for (let v = t.nAlt; v < g.kaefig.n; v++) if (g.kaefig.vSchaerfe[v]! > 0 || faltenAm[v]! >= 3) eigene.push([g.kaefig.xyz[3 * v]!, g.kaefig.xyz[3 * v + 1]!, g.kaefig.xyz[3 * v + 2]!]);
  const ohneA = eigene.length ? { p: eigene, r: kante } : undefined;
  // Knicke: Einsatz in M ∪ C (rechts) gegen A0 in den Flächen von M ∪ C (rechts)
  const knick = groessterKnick(ka, feinA, flA, (f) => imBereichA[f] === 1, undefined, ohneA);
  const rechts1 = (f: number) => {
    let z = 0;
    for (let h = k1.fStart[f]!; h < k1.fStart[f + 1]!; h++) z += k1.xyz[3 * k1.fVerts[h]! + 2]!;
    return z > 0;
  };
  const block1 = fl1.length / k1.nF;
  const knickA0 = groessterKnick(k1f, fein1, fl1, (f) => {
    const f0 = Math.floor(f / block1);
    return inMC[f0] === 1 && rechts1(f0);
  }, undefined, ohne);
  // Mundwinkel: Spitze der Lippe, Umkreis drei Kanten des Feldkäfigs (fest, unabhängig von der Teilung der Lippe — sonst
  // schrumpfte der Messbereich mit kürzeren letzten Lippenspannen mit)
  const m = lippe.length - 1;
  const spitze = lippenPunkt(lippe, m, t.gitter === 'kernring' ? 'falte' : 'ecke', t.lippenAnfang, t.lippenEcken);
  const ecke = { p: spitze, r: 3 * kante };
  const knickEcke = groessterKnick(ka, feinA, flA, (f) => imBereichA[f] === 1, ecke, ohneA);
  const faltenEcke = knickEcke.winkel;
  const faltenEckeA0 = groessterKnick(k1f, fein1, fl1, (f) => {
    const f0 = Math.floor(f / block1);
    return inMC[f0] === 1 && rechts1(f0);
  }, ecke, ohne).winkel;
  return { aussen, hautMax, hautP99: q99(abstaende), normaleMax, normaleP99: q99(winkel), falten: knick.winkel, faltenA0: knickA0.winkel, wulst, ortHaut, ortNormale, ortKnick: knick.ort, faltenEcke, faltenEckeA0, ortKnickEcke: knickEcke.ort };
}
