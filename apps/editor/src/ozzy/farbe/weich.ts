/**
 * Ozzy, Paint-Modus, Etappe 4 (19.11.2026): weiche Kanten. Eine Farblinie kann an ihren Punkten eine Breite tragen; dort läuft die
 * Farbe der einen Seite weich in die der anderen, zu jeder Seite so weit wie die Breite. An der Farblinie selbst steht die Mitte
 * zwischen beiden Farben.
 *
 * In den Dreiecken, durch die die Farblinie läuft, rechnet die Anzeige den Abstand je Bildpunkt selbst (`anzeige.ts`). Für alles,
 * was weiter weg liegt, steht hier je Punkt des Rechennetzes: wie weit er von der nächsten weichen Farblinie am Rand seiner Fläche
 * liegt (über die Haut gemessen, nie über eine Farblinie hinweg), wie breit der Verlauf dort ist und welche Füllung jenseits
 * liegt. Gerechnet wird wie beim Einlaufen (`fliessen.ts`), nur von den Farblinien aus statt von einer Saat, und nur so weit, wie
 * der Verlauf reicht.
 *
 * Ohne DOM und ohne three: Die Tests laufen in Node.
 */
import type { Flaechen, RandKette } from './flaechen';
import { FERN } from './fliessen';
import type { Karte } from './ort';

export type WeichFeld = {
  /** je Punkt des Rechennetzes: sein Abstand zur nächsten weichen Farblinie am Rand seiner Fläche (`FERN`: keine in Reichweite) */
  d: Float32Array;
  /** die Breite des Verlaufs dort (0: keiner) */
  w: Float32Array;
  /** die Füllung jenseits dieser Farblinie (−1: keine) */
  fremd: Int32Array;
  /** die größte Breite überhaupt */
  groesst: number;
};

/** wie viel von der Farbe jenseits der Farblinie an einer Stelle steht: an der Farblinie die Hälfte, im Abstand der Breite nichts mehr */
export function weichAnteil(d: number, w: number): number {
  if (!(w > 1e-9)) return 0;
  const u = Math.min(1, Math.max(0, (d + w) / (2 * w)));
  return 1 - u * u * (3 - 2 * u);
}

/**
 * Der nächste Punkt einer Kette zu einer Stelle X im Raum: Abstand und die Breite des Verlaufs dort. `A`, `B`, `C`: die Ecken des
 * Dreiecks (je drei Zahlen ab dem Platz in `P`). Wo die Kette am Rand des Dreiecks beginnt oder endet, gilt ihre Verlängerung (im
 * Nachbarn geht sie weiter, fast gerade); an einem freien Ende und an einer Kreuzung endet sie.
 */
export function naechsterAufKette(P: ArrayLike<number>, A: number, B: number, C: number, c: RandKette, x: number, y: number, z: number): { d: number; w: number } {
  const p = c.p;
  const n = p.length / 2;
  const lage = (j: number): [number, number, number] => {
    const b = p[2 * j]!;
    const g = p[2 * j + 1]!;
    const a = 1 - b - g;
    return [a * P[A]! + b * P[B]! + g * P[C]!, a * P[A + 1]! + b * P[B + 1]! + g * P[C + 1]!, a * P[A + 2]! + b * P[B + 2]! + g * P[C + 2]!];
  };
  let best = Infinity;
  let breite = 0;
  let q0 = lage(0);
  for (let j = 1; j < n; j++) {
    const q1 = lage(j);
    const ex = q1[0] - q0[0];
    const ey = q1[1] - q0[1];
    const ez = q1[2] - q0[2];
    const l2 = ex * ex + ey * ey + ez * ez;
    if (l2 > 1e-24) {
      let u = ((x - q0[0]) * ex + (y - q0[1]) * ey + (z - q0[2]) * ez) / l2;
      const unten = j === 1 && c.ein >= 0 ? -Infinity : 0;
      const oben = j === n - 1 && c.aus >= 0 ? Infinity : 1;
      u = Math.min(oben, Math.max(unten, u));
      const d2 = (x - q0[0] - u * ex) ** 2 + (y - q0[1] - u * ey) ** 2 + (z - q0[2] - u * ez) ** 2;
      if (d2 < best) {
        best = d2;
        const v = Math.min(1, Math.max(0, u));
        breite = c.w ? c.w[j - 1]! + (c.w[j]! - c.w[j - 1]!) * v : 0;
      }
    }
    q0 = q1;
  }
  return { d: Math.sqrt(best), w: breite };
}

/** ein kleiner Haufen: (Abstand, Punkt), der kleinste Abstand oben */
class Haufen {
  private w: number[] = [];
  private v: number[] = [];
  get leer(): boolean {
    return this.w.length === 0;
  }
  dazu(weite: number, punkt: number): void {
    const W = this.w;
    const V = this.v;
    let i = W.length;
    W.push(weite);
    V.push(punkt);
    while (i > 0) {
      const e = (i - 1) >> 1;
      if (W[e]! <= weite) break;
      W[i] = W[e]!;
      V[i] = V[e]!;
      i = e;
    }
    W[i] = weite;
    V[i] = punkt;
  }
  nehmen(): [number, number] {
    const W = this.w;
    const V = this.v;
    const oben: [number, number] = [W[0]!, V[0]!];
    const lw = W.pop()!;
    const lv = V.pop()!;
    const n = W.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && W[c + 1]! < W[c]!) c++;
        if (W[c]! >= lw) break;
        W[i] = W[c]!;
        V[i] = V[c]!;
        i = c;
      }
      W[i] = lw;
      V[i] = lv;
    }
    return oben;
  }
}

/**
 * Das Feld der weichen Kanten für diese Flächen (null: Keine Farblinie hat eine Breite). Von jedem Dreieck mit einer weichen
 * Farblinie aus: An seinen Ecken steht der Abstand zu ihr genau; von dort geht es über die Haut weiter, bis der Verlauf endet.
 */
export function weichFeld(k: Karte, fl: Flaechen): WeichFeld | null {
  let groesst = 0;
  for (const r of fl.rand) for (const c of r.ketten) if (c.w) for (const x of c.w) if (x > groesst) groesst = x;
  if (!(groesst > 0)) return null;
  const P = k.netz.pos;
  const I = k.netz.tri;
  const n = P.length / 3;
  const T = k.T;
  // (gerechnet wird doppelt genau: Der Haufen vergleicht seine Einträge mit dem Feld)
  const d = new Float64Array(n).fill(Infinity);
  const w = new Float64Array(n);
  const fremd = new Int32Array(n).fill(-1);
  const randVon = new Int32Array(T).fill(-1);
  fl.rand.forEach((r, ri) => {
    if (r.t < T) randVon[r.t] = ri;
  });
  const H = new Haufen();
  const setzen = (v: number, abstand: number, breite: number, jenseits: number): void => {
    if (abstand < d[v]!) {
      d[v] = abstand;
      w[v] = breite;
      fremd[v] = jenseits;
      H.dazu(abstand, v);
    }
  };
  // die Saat: an den Ecken der Dreiecke mit weichen Farblinien der genaue Abstand zur Kette am Rand ihrer Zelle
  for (const r of fl.rand) {
    if (r.t >= T || !r.ketten.some((c) => c.w)) continue;
    const E = [I[3 * r.t]!, I[3 * r.t + 1]!, I[3 * r.t + 2]!];
    for (let e = 0; e < 3; e++) {
      const zelle = r.ecken[e];
      const v = E[e]!;
      for (const c of r.ketten) {
        // (um ein freies Ende herum ist es dieselbe Zelle und dieselbe Farbe: kein Verlauf)
        if (!c.w || c.zl === c.zr || (c.zl !== zelle && c.zr !== zelle)) continue;
        const s = naechsterAufKette(P, 3 * E[0]!, 3 * E[1]!, 3 * E[2]!, c, P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!);
        if (s.w > 0) setzen(v, s.d, s.w, c.zl === zelle ? c.rechts : c.links);
      }
    }
  }
  if (H.leer) return { d: new Float32Array(n).fill(FERN), w: new Float32Array(n), fremd, groesst };
  // je Punkt seine Dreiecke
  const zahl = new Int32Array(n + 1);
  for (let t = 0; t < T; t++) for (let e = 0; e < 3; e++) zahl[I[3 * t + e]! + 1] = zahl[I[3 * t + e]! + 1]! + 1;
  for (let i = 1; i <= n; i++) zahl[i] = zahl[i]! + zahl[i - 1]!;
  const liste = new Int32Array(zahl[n]!);
  const voll = new Int32Array(n);
  for (let t = 0; t < T; t++)
    for (let e = 0; e < 3; e++) {
      const v = I[3 * t + e]!;
      liste[zahl[v]! + voll[v]!] = t;
      voll[v] = voll[v]! + 1;
    }
  const ab = (a: number, b: number): number => Math.sqrt((P[3 * a]! - P[3 * b]!) ** 2 + (P[3 * a + 1]! - P[3 * b + 1]!) ** 2 + (P[3 * a + 2]! - P[3 * b + 2]!) ** 2);
  /**
   * Der Abstand an der Ecke C aus den Abständen an A und B: Die Front kommt gerade über die Kante AB, als ebene Welle (eine Farblinie
   * ist keine Punktquelle: Mit einer Quelle hinter der Kante, wie beim Einlaufen in `fliessen.ts`, käme der Abstand nahe an der
   * Farblinie zu kurz heraus). In der Ebene des Dreiecks, A im Ursprung, B auf der ersten Achse: Der Abstand wächst längs einer
   * Richtung g mit der Steigung eins, und g passt zu den zwei Abständen. Zurück auch, wo auf AB die Front herkommt (0 bei A, 1 bei
   * B): Dort gilt ihre Breite. Kommt sie nicht durch die Kante, gilt der Weg längs einer Kante.
   */
  const ueber = (A: number, B: number, C: number, wa: number, wb: number): { d: number; u: number } => {
    const viaA = wa + ab(A, C);
    const viaB = wb + ab(B, C);
    const kante = viaA <= viaB ? { d: viaA, u: 0 } : { d: viaB, u: 1 };
    const ex = P[3 * B]! - P[3 * A]!;
    const ey = P[3 * B + 1]! - P[3 * A + 1]!;
    const ez = P[3 * B + 2]! - P[3 * A + 2]!;
    const c = Math.sqrt(ex * ex + ey * ey + ez * ez);
    if (c < 1e-12) return kante;
    const gx = (wb - wa) / c;
    if (Math.abs(gx) >= 1) return kante;
    const gy = Math.sqrt(1 - gx * gx);
    const cx = P[3 * C]! - P[3 * A]!;
    const cy = P[3 * C + 1]! - P[3 * A + 1]!;
    const cz = P[3 * C + 2]! - P[3 * A + 2]!;
    const xc = (cx * ex + cy * ey + cz * ez) / c;
    const yc = Math.sqrt(Math.max(0, cx * cx + cy * cy + cz * cz - xc * xc));
    if (yc < 1e-12) return kante;
    // (von C gegen die Richtung g zurück auf die Kante)
    const x0 = xc - (yc * gx) / gy;
    if (x0 < 0 || x0 > c) return kante;
    const quer = wa + gx * xc + gy * yc;
    return quer < kante.d ? { d: quer, u: x0 / c } : kante;
  };
  const fest = new Uint8Array(n);
  while (!H.leer) {
    const [abstand, v] = H.nehmen();
    if (fest[v] || abstand > d[v]!) continue;
    fest[v] = 1;
    // (jenseits seines Verlaufs trägt ein Punkt nichts weiter: Dort steht schon die reine Farbe)
    if (abstand >= w[v]!) continue;
    for (let q = zahl[v]!; q < zahl[v + 1]!; q++) {
      const t = liste[q]!;
      const i = I[3 * t]! === v ? 0 : I[3 * t + 1]! === v ? 1 : 2;
      const ia = (i + 1) % 3;
      const ib = (i + 2) % 3;
      const a = I[3 * t + ia]!;
      const b = I[3 * t + ib]!;
      let zuA = true;
      let zuB = true;
      const ri = randVon[t]!;
      if (ri >= 0) {
        // durch ein Dreieck mit Farblinien nur innerhalb einer Zelle: nie über eine Farblinie hinweg
        const r = fl.rand[ri]!;
        zuA = r.ecken[ia] === r.ecken[i];
        zuB = r.ecken[ib] === r.ecken[i];
      }
      if (zuA && !fest[a]) setzen(a, abstand + ab(v, a), w[v]!, fremd[v]!);
      if (zuB && !fest[b]) setzen(b, abstand + ab(v, b), w[v]!, fremd[v]!);
      if (zuA && zuB) {
        if (fest[a] && !fest[b]) {
          const s = ueber(v, a, b, abstand, d[a]!);
          setzen(b, s.d, w[v]! + (w[a]! - w[v]!) * s.u, s.u < 0.5 ? fremd[v]! : fremd[a]!);
        }
        if (fest[b] && !fest[a]) {
          const s = ueber(v, b, a, abstand, d[b]!);
          setzen(a, s.d, w[v]! + (w[b]! - w[v]!) * s.u, s.u < 0.5 ? fremd[v]! : fremd[b]!);
        }
      }
    }
  }
  const aus = new Float32Array(n).fill(FERN);
  for (let v = 0; v < n; v++) if (d[v]! < Infinity) aus[v] = d[v]!;
  return { d: aus, w: Float32Array.from(w), fremd, groesst };
}
