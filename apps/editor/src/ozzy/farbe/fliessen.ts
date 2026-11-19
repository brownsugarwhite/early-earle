/**
 * Ozzy, Paint-Modus, Etappe 3 (19.11.2026): der Weg der Farbe über die Haut. Beim Füllen läuft die Farbe von der Stelle des Klicks
 * aus über die Haut, bis an die Farblinien. Die Uhr dieser Bewegung ist die Weite: wie weit eine Stelle von der Saat entfernt
 * liegt, über die Haut gemessen und nur innerhalb der Fläche, die gefüllt wird. Die Farbe ist dort zu sehen, wo die Front schon war.
 *
 * Gerechnet wird je Punkt des Rechennetzes, wie eine Wellenfront von Dreieck zu Dreieck: Aus zwei Ecken mit bekannter Weite folgt
 * die dritte, als käme die Front von einer Quelle hinter der Kante (auf ebener Haut ist das genau; nur längs der Kanten gerechnet,
 * liefe die Front in Sechsecken). In einem Dreieck, durch das eine Farblinie läuft, geht es nur von Ecke zu Ecke, wenn beide in
 * derselben Zelle liegen (`Flaechen.rand[].ecken`): Die Farbe staut sich an der Farblinie und läuft um ihr Ende oder durch ihre
 * Lücke. Für die Anzeige bekommt so ein Dreieck je Kette und Seite drei Weiten, auch für Ecken jenseits der Farblinie (dorthin
 * weitergedacht, als ginge die Fläche über sie hinweg): Damit mischt die Anzeige diesseits der Farblinie.
 *
 * Ohne DOM und ohne three: Die Tests laufen in Node.
 */
import { type Flaechen, naechsteSeite } from './flaechen';
import { type Karte, type Ort, ortLage } from './ort';

/**
 * Die Weite je Punkt des Rechennetzes (Einheiten der Lagen; unendlich: nicht erreicht), die größte erreichte, und für die Dreiecke
 * mit Farblinien (in der Reihenfolge von `Flaechen.rand`) je Kette sechs Weiten: links von ihr an den drei Ecken, rechts von ihr an
 * den drei Ecken (`FERN`, wo die Füllung auf dieser Seite nicht liegt oder nichts ankam).
 */
export type Fluss = { weite: Float32Array; groesst: number; rand: Float32Array[] };

/** eine Weite, die keine Front je erreicht */
export const FERN = 1e9;

/** welche Füllung an einem Ort gilt (Nummer der Farbe, −1: keine) */
export function fuellungBei(fl: Flaechen, ort: Ort): number {
  const r = fl.rand.find((x) => x.t === ort.t);
  if (!r) return fl.ganz[ort.t] ?? -1;
  const s = naechsteSeite(r.ketten, ort.w[1], ort.w[2]);
  if (s.k < 0) return -1;
  return s.seite === 0 ? r.ketten[s.k]!.links : r.ketten[s.k]!.rechts;
}

/**
 * Die Weite im Inneren eines Dreiecks aus den Weiten seiner drei Ecken: nicht eben gemischt (dann wäre die Front in jedem Dreieck
 * eine Gerade, zusammen ein Vieleck), sondern als käme sie von einer Quelle in der Ebene des Dreiecks, die zu den drei Weiten
 * passt. Liegt die Saat im Dreieck selbst, ist diese Quelle die Saat. Was an den Ecken nicht aufgeht, wird eben dazugemischt; das
 * Ergebnis bleibt in den Grenzen, die jede Ecke setzt (nie weiter als ihre Weite plus der Weg zu ihr, nie näher als ihre Weite
 * minus diesen Weg). `A`, `B`, `C`: die Lagen der Ecken (je drei Zahlen ab `ia`, `ib`, `ic` in `P`); zurück: die Weite bei den
 * Gewichten (b, c) der zweiten und dritten Ecke.
 */
export function weiteImDreieck(P: ArrayLike<number>, ia: number, ib: number, ic: number, dA: number, dB: number, dC: number): (b: number, c: number) => number {
  const eben = (b: number, c: number): number => (1 - b - c) * dA + b * dB + c * dC;
  // (eine Ecke, an der nichts ankam: Das Dreieck bleibt bis zum Schluss leer)
  if (!(dA < FERN && dB < FERN && dC < FERN)) return () => FERN;
  // das Dreieck in seiner Ebene: A im Ursprung, B auf der ersten Achse
  const ux = P[ib]! - P[ia]!;
  const uy = P[ib + 1]! - P[ia + 1]!;
  const uz = P[ib + 2]! - P[ia + 2]!;
  const lb = Math.sqrt(ux * ux + uy * uy + uz * uz);
  const vx = P[ic]! - P[ia]!;
  const vy = P[ic + 1]! - P[ia + 1]!;
  const vz = P[ic + 2]! - P[ia + 2]!;
  if (lb < 1e-9) return eben;
  const cx = (vx * ux + vy * uy + vz * uz) / lb;
  const cy = Math.sqrt(Math.max(0, vx * vx + vy * vy + vz * vz - cx * cx));
  if (cy < 1e-9) return eben;
  // die Quelle: der Ort, dessen Abstände zu den drei Ecken sich um dasselbe von den Weiten unterscheiden
  const sx = (dA * dA - dB * dB + lb * lb) / (2 * lb);
  const sy = (dA * dA - dC * dC + cx * cx + cy * cy - 2 * cx * sx) / (2 * cy);
  const rA = dA - Math.sqrt(sx * sx + sy * sy);
  const rB = dB - Math.sqrt((sx - lb) ** 2 + sy * sy);
  const rC = dC - Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
  return (b, c) => {
    const x = b * lb + c * cx;
    const y = c * cy;
    const a = 1 - b - c;
    let w = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2) + a * rA + b * rB + c * rC;
    const zuA = Math.sqrt(x * x + y * y);
    const zuB = Math.sqrt((x - lb) ** 2 + y * y);
    const zuC = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    w = Math.min(w, dA + zuA, dB + zuB, dC + zuC);
    w = Math.max(w, dA - zuA, dB - zuB, dC - zuC, 0);
    return w;
  };
}

/** ein kleiner Haufen: (Weite, Punkt), die kleinste Weite oben */
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
 * Die Weite jedes Punkts von den Saaten, über die Haut, innerhalb der Füllung `fuell` (`saaten`: die Saat und, an einer gespiegelten
 * Form, ihr Spiegelbild: Dann läuft die Farbe auf beiden Hälften zugleich).
 */
export function flussWeiten(k: Karte, fl: Flaechen, fuell: number, saaten: readonly Ort[]): Fluss {
  const P = k.netz.pos;
  const I = k.netz.tri;
  const n = P.length / 3;
  // die Dreiecke der Fläche: 1 ganz, 2 mit einer Farblinie (dann `randVon`: welches)
  const S = new Uint8Array(k.T);
  const randVon = new Int32Array(k.T).fill(-1);
  const nG = Math.min(k.T, fl.ganz.length);
  for (let t = 0; t < nG; t++) if (fl.ganz[t] === fuell) S[t] = 1;
  fl.rand.forEach((r, ri) => {
    if (r.t >= k.T) return;
    randVon[r.t] = ri;
    if (r.ketten.some((c) => c.links === fuell || c.rechts === fuell)) S[r.t] = 2;
  });
  // (gerechnet wird doppelt genau: Der Haufen vergleicht seine Einträge mit dem Feld, und gerundet gälte ein Eintrag als überholt)
  const weite = new Float64Array(n).fill(Infinity);
  // je Punkt seine Dreiecke der Fläche
  const zahl = new Int32Array(n + 1);
  for (let t = 0; t < k.T; t++) if (S[t]) for (let e = 0; e < 3; e++) zahl[I[3 * t + e]! + 1] = zahl[I[3 * t + e]! + 1]! + 1;
  for (let i = 1; i <= n; i++) zahl[i] = zahl[i]! + zahl[i - 1]!;
  const liste = new Int32Array(zahl[n]!);
  const voll = new Int32Array(n);
  for (let t = 0; t < k.T; t++)
    if (S[t])
      for (let e = 0; e < 3; e++) {
        const v = I[3 * t + e]!;
        liste[zahl[v]! + voll[v]!] = t;
        voll[v] = voll[v]! + 1;
      }
  const ab = (a: number, b: number): number => Math.sqrt((P[3 * a]! - P[3 * b]!) ** 2 + (P[3 * a + 1]! - P[3 * b + 1]!) ** 2 + (P[3 * a + 2]! - P[3 * b + 2]!) ** 2);
  /**
   * Die Weite an der Ecke C aus den Weiten `wa`, `wb` an A und B: Die Front kommt von einer Quelle hinter der Kante AB (in der Ebene
   * des Dreiecks dort, wo sie zu beiden Weiten passt). Führt der gerade Weg von dort nach C nicht durch die Kante, gilt der Weg
   * längs einer Kante.
   */
  const quelle = (A: number, B: number, C: number, wa: number, wb: number): number => {
    const kante = Math.min(wa + ab(A, C), wb + ab(B, C));
    const ex = P[3 * B]! - P[3 * A]!;
    const ey = P[3 * B + 1]! - P[3 * A + 1]!;
    const ez = P[3 * B + 2]! - P[3 * A + 2]!;
    const c = Math.sqrt(ex * ex + ey * ey + ez * ez);
    if (c < 1e-12) return kante;
    const xs = (c * c + wa * wa - wb * wb) / (2 * c);
    const ys2 = wa * wa - xs * xs;
    if (ys2 < 0) return kante;
    const ys = Math.sqrt(ys2);
    const cx = P[3 * C]! - P[3 * A]!;
    const cy = P[3 * C + 1]! - P[3 * A + 1]!;
    const cz = P[3 * C + 2]! - P[3 * A + 2]!;
    const xc = (cx * ex + cy * ey + cz * ez) / c;
    const yc = Math.sqrt(Math.max(0, cx * cx + cy * cy + cz * cz - xc * xc));
    if (yc < 1e-12) return kante;
    const x0 = xs + ((xc - xs) * ys) / (ys + yc);
    if (x0 < 0 || x0 > c) return kante;
    return Math.min(kante, Math.sqrt((xc - xs) ** 2 + (yc + ys) ** 2));
  };
  const H = new Haufen();
  const fest = new Uint8Array(n);
  const setzen = (v: number, w: number): void => {
    if (w < weite[v]!) {
      weite[v] = w;
      H.dazu(w, v);
    }
  };
  /** die Zelle eines Dreiecks mit Farblinien, in der ein Ort liegt (−1: keine Kette) */
  const zelleBei = (ri: number, o: Ort): number => {
    const r = fl.rand[ri]!;
    const s = naechsteSeite(r.ketten, o.w[1], o.w[2]);
    if (s.k < 0) return -1;
    return s.seite === 0 ? r.ketten[s.k]!.zl : r.ketten[s.k]!.zr;
  };
  /** die Saaten je Dreieck mit Farblinien: ihre Lage und ihre Zelle (für die Weiten der Anzeige dort) */
  const saatIn = new Map<number, { p: [number, number, number]; zelle: number }[]>();
  for (const o of saaten) {
    if (!S[o.t]) continue;
    const p = ortLage(P, o);
    const ri = randVon[o.t]!;
    const zelle = S[o.t] === 2 ? zelleBei(ri, o) : -1;
    if (S[o.t] === 2) {
      const l = saatIn.get(o.t);
      if (l) l.push({ p, zelle });
      else saatIn.set(o.t, [{ p, zelle }]);
    }
    for (let e = 0; e < 3; e++) {
      // (in einem Dreieck mit Farblinien: nur die Ecken in der Zelle der Saat)
      if (S[o.t] === 2 && fl.rand[ri]!.ecken[e] !== zelle) continue;
      const v = I[3 * o.t + e]!;
      setzen(v, Math.sqrt((P[3 * v]! - p[0]) ** 2 + (P[3 * v + 1]! - p[1]) ** 2 + (P[3 * v + 2]! - p[2]) ** 2));
    }
  }
  while (!H.leer) {
    const [w, v] = H.nehmen();
    if (fest[v] || w > weite[v]!) continue;
    fest[v] = 1;
    for (let q = zahl[v]!; q < zahl[v + 1]!; q++) {
      const t = liste[q]!;
      const i = I[3 * t]! === v ? 0 : I[3 * t + 1]! === v ? 1 : 2;
      const ia = (i + 1) % 3;
      const ib = (i + 2) % 3;
      const a = I[3 * t + ia]!;
      const b = I[3 * t + ib]!;
      let zuA = true;
      let zuB = true;
      if (S[t] === 2) {
        // durch ein Dreieck mit Farblinien nur innerhalb einer Zelle, und nur, wo diese Zelle zur Füllung gehört
        const r = fl.rand[randVon[t]!]!;
        if (r.eckFarben[i] !== fuell) continue;
        zuA = r.ecken[ia] === r.ecken[i];
        zuB = r.ecken[ib] === r.ecken[i];
      }
      // längs der Kanten
      if (zuA && !fest[a]) setzen(a, w + ab(v, a));
      if (zuB && !fest[b]) setzen(b, w + ab(v, b));
      // und quer durch das Dreieck, wenn die zweite Ecke schon feststeht
      if (zuA && zuB) {
        if (fest[a] && !fest[b]) setzen(b, quelle(v, a, b, w, weite[a]!));
        if (fest[b] && !fest[a]) setzen(a, quelle(v, b, a, w, weite[b]!));
      }
    }
  }
  let groesst = 0;
  for (let v = 0; v < n; v++) if (weite[v]! < Infinity && weite[v]! > groesst) groesst = weite[v]!;
  // die Weiten für die Anzeige in den Dreiecken mit Farblinien: je Kette und Seite an den drei Ecken
  const rand = fl.rand.map((r) => {
    const aus = new Float32Array(6 * r.ketten.length).fill(FERN);
    if (r.t >= k.T || S[r.t] !== 2) return aus;
    const E = [I[3 * r.t]!, I[3 * r.t + 1]!, I[3 * r.t + 2]!];
    const fertig = new Map<number, [number, number, number]>();
    const fuer = (zelle: number): [number, number, number] => {
      const da = fertig.get(zelle);
      if (da) return da;
      const w: [number, number, number] = [FERN, FERN, FERN];
      // die Ecken in dieser Zelle tragen ihre Weite; die anderen werden von ihnen aus weitergedacht
      const echt = [0, 1, 2].filter((e) => r.ecken[e] === zelle && weite[E[e]!]! < Infinity);
      for (const e of echt) w[e] = weite[E[e]!]!;
      if (echt.length === 2) {
        const c = 3 - echt[0]! - echt[1]!;
        w[c] = quelle(E[echt[0]!]!, E[echt[1]!]!, E[c]!, w[echt[0]!]!, w[echt[1]!]!);
      } else if (echt.length === 1) {
        const e = echt[0]!;
        for (let c = 0; c < 3; c++) if (c !== e) w[c] = w[e]! + ab(E[e]!, E[c]!);
      }
      // eine Saat in dieser Zelle: von ihr aus gilt der gerade Weg im Dreieck
      for (const s of saatIn.get(r.t) ?? []) {
        if (s.zelle !== zelle) continue;
        for (let c = 0; c < 3; c++) {
          const d = Math.sqrt((P[3 * E[c]!]! - s.p[0]) ** 2 + (P[3 * E[c]! + 1]! - s.p[1]) ** 2 + (P[3 * E[c]! + 2]! - s.p[2]) ** 2);
          if (d < w[c]!) w[c] = d;
        }
      }
      // (keine Ecke in der Zelle und keine Saat: ein Streifen zwischen zwei Farblinien. Dort gelten die Weiten der Ecken, wie sie sind)
      if (!echt.length && w[0] === FERN) for (let c = 0; c < 3; c++) if (weite[E[c]!]! < Infinity) w[c] = weite[E[c]!]!;
      fertig.set(zelle, w);
      return w;
    };
    r.ketten.forEach((c, ki) => {
      if (c.links === fuell) aus.set(fuer(c.zl), 6 * ki);
      if (c.rechts === fuell) aus.set(fuer(c.zr), 6 * ki + 3);
    });
    for (let i = 0; i < aus.length; i++) if (aus[i]! < FERN && aus[i]! > groesst) groesst = aus[i]!;
    return aus;
  });
  return { weite: Float32Array.from(weite), groesst, rand };
}
