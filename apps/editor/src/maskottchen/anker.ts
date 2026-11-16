// Formen aus wenigen Bézier-Ankern (wie in Illustrator): je Anker Lage, Griff hinein, Griff hinaus. Alle Ansichten eines Teils
// haben dieselben Anker. Gemorpht wird nicht auf geraden Linien (dabei schrumpfen sich drehende Formen und knicken ein), sondern
// nach Winkel und Länge (wie Sederberg 1993, GSAP „rotational“):
//   - Griffe: Winkel und Länge, Winkel über den kürzesten Weg
//   - Anker: bei kompakten Teilen (Ohr, Schopf, Nase, Schwanz) um den Schwerpunkt nach Abstand und Winkel, bei großen Flächen
//     (Gesicht, Kopf, Rumpf) gerade
// Zwischen den Ansichten monoton kubisch (Fritsch–Butland), periodisch über 360°. Danach: Glatte Anker bekommen gleich
// gerichtete Griffe (keine Knicke, wo keine sein sollen), Ecken behalten ihre eigenen (spitz bleibt spitz); die Eckstärke geht
// je Ansicht stetig mit.
import type { AnkerRoh } from './daten/anker';

export type Art = 'dreh' | 'gerade';
const ZWEI_PI = Math.PI * 2;
const wickel = (d: number) => d - ZWEI_PI * Math.round(d / ZWEI_PI);

/** Kennwerte einer Ansicht: Skalare und welche davon Winkel sind */
interface Kenn {
  w: number;
  v: Float64Array; // Werte
  e: Float32Array; // Eckstärke je Anker
}

export class AnkerForm {
  readonly name: string;
  readonly farbe: 'schwarz' | 'weiss';
  readonly n: number;
  readonly marken: Record<string, number>;
  readonly sigma: Int32Array | null;
  readonly art: Art;
  readonly eckRoh: Record<number, Float32Array> = {};
  /** Eckstärke der letzten Auswertung */
  readonly ecke: Float32Array;
  private kenn: Kenn[] = [];
  private tang: Float64Array[] = [];
  private istWinkel!: Uint8Array;

  constructor(roh: AnkerRoh, art: Art) {
    this.name = roh.name;
    this.farbe = roh.farbe;
    this.n = roh.n;
    this.marken = roh.marken;
    this.sigma = roh.sigma ? Int32Array.from(roh.sigma) : null;
    this.art = art;
    this.ecke = new Float32Array(roh.n);
    for (const [w, liste] of Object.entries(roh.ecken)) {
      const e = new Float32Array(roh.n);
      for (const [i, g] of liste) e[i] = g;
      this.eckRoh[Number(w)] = e;
    }
  }

  eckenFuer(w: number): Float32Array {
    if (this.eckRoh[w]) return this.eckRoh[w]!;
    let best: number | null = null;
    for (const k of Object.keys(this.eckRoh).map(Number)) if (best === null || Math.abs(k - w) < Math.abs(best - w)) best = k;
    return best === null ? new Float32Array(this.n) : this.eckRoh[best]!;
  }

  /** gespiegelt (x → −x); mit σ umgeordnet und dabei Griffe vertauscht (die Laufrichtung kehrt um) */
  spiegeln(p: Float32Array, sigma: Int32Array | null): Float32Array {
    const out = new Float32Array(p.length);
    for (let i = 0; i < this.n; i++) {
      const q = sigma ? sigma[i]! : i;
      out[i * 6] = -p[q * 6]!;
      out[i * 6 + 1] = p[q * 6 + 1]!;
      if (sigma) {
        out[i * 6 + 2] = -p[q * 6 + 4]!;
        out[i * 6 + 3] = p[q * 6 + 5]!;
        out[i * 6 + 4] = -p[q * 6 + 2]!;
        out[i * 6 + 5] = p[q * 6 + 3]!;
      } else {
        out[i * 6 + 2] = -p[q * 6 + 2]!;
        out[i * 6 + 3] = p[q * 6 + 3]!;
        out[i * 6 + 4] = -p[q * 6 + 4]!;
        out[i * 6 + 5] = p[q * 6 + 5]!;
      }
    }
    return out;
  }
  private spiegelEcken(e: Float32Array, sigma: Int32Array | null): Float32Array {
    const out = new Float32Array(e.length);
    for (let i = 0; i < this.n; i++) out[i] = e[sigma ? sigma[i]! : i]!;
    return out;
  }

  /** Anker und Griffe → Kennwerte (Schwerpunkt, Abstand/Winkel oder x/y, Griffe als Länge/Winkel) */
  private kennwerte(p: Float32Array): Float64Array {
    const n = this.n;
    const v = new Float64Array(2 + n * 6);
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < n; i++) {
      cx += p[i * 6]!;
      cy += p[i * 6 + 1]!;
    }
    cx /= n;
    cy /= n;
    v[0] = cx;
    v[1] = cy;
    for (let i = 0; i < n; i++) {
      const x = p[i * 6]!;
      const y = p[i * 6 + 1]!;
      const o = 2 + i * 6;
      if (this.art === 'dreh') {
        v[o] = Math.hypot(x - cx, y - cy);
        v[o + 1] = Math.atan2(y - cy, x - cx);
      } else {
        v[o] = x;
        v[o + 1] = y;
      }
      v[o + 2] = Math.hypot(p[i * 6 + 2]!, p[i * 6 + 3]!);
      v[o + 3] = Math.atan2(p[i * 6 + 3]!, p[i * 6 + 2]!);
      v[o + 4] = Math.hypot(p[i * 6 + 4]!, p[i * 6 + 5]!);
      v[o + 5] = Math.atan2(p[i * 6 + 5]!, p[i * 6 + 4]!);
    }
    return v;
  }

  /** `schieben`: für die andere Blickrichtung nicht spiegeln, sondern nur an die gespiegelte Stelle schieben (für Teile mit
   *  fester Neigung wie den Schopf: so klappt nichts wie ein Blatt durch eine dünne Mitte) */
  anlegen(eigen: Record<number, Float32Array>, partner: { p: Record<number, Float32Array>; form: AnkerForm } | null, schieben = false): void {
    const liste: { w: number; p: Float32Array; e: Float32Array }[] = [];
    for (const [ws, p] of Object.entries(eigen)) {
      const w = Number(ws);
      liste.push({ w: w >= 180 ? -180 : w, p, e: this.eckenFuer(w) });
      if (w > 0 && w < 180) {
        if (schieben) {
          let cx = 0;
          for (let i = 0; i < this.n; i++) cx += p[i * 6]!;
          cx /= this.n;
          const q = p.slice();
          for (let i = 0; i < this.n; i++) q[i * 6] = p[i * 6]! - 2 * cx;
          liste.push({ w: -w, p: q, e: this.eckenFuer(w) });
        } else if (partner) liste.push({ w: -w, p: this.spiegeln(partner.p[w] ?? p, null), e: partner.form.eckenFuer(w) });
        else liste.push({ w: -w, p: this.spiegeln(p, this.sigma), e: this.spiegelEcken(this.eckenFuer(w), this.sigma) });
      }
    }
    liste.sort((a, b) => a.w - b.w);
    this.istWinkel = new Uint8Array(2 + this.n * 6);
    for (let i = 0; i < this.n; i++) {
      const o = 2 + i * 6;
      if (this.art === 'dreh') this.istWinkel[o + 1] = 1;
      this.istWinkel[o + 3] = 1;
      this.istWinkel[o + 5] = 1;
    }
    this.kenn = liste.map((k) => ({ w: k.w, v: this.kennwerte(k.p), e: k.e }));
    this.tangenten();
  }

  private differenz(j: number, a: number, b: number): number {
    return this.istWinkel[j] ? wickel(b - a) : b - a;
  }

  private tangenten(): void {
    const s = this.kenn;
    const m = s.length;
    this.tang = s.map((k, i) => {
      const t = new Float64Array(k.v.length);
      if (m < 2) return t;
      const a = s[(i - 1 + m) % m]!;
      const b = s[(i + 1) % m]!;
      let da = k.w - a.w;
      let db = b.w - k.w;
      if (da <= 0) da += 360;
      if (db <= 0) db += 360;
      const w1 = 2 * db + da;
      const w2 = db + 2 * da;
      for (let j = 0; j < t.length; j++) {
        const v1 = this.differenz(j, a.v[j]!, k.v[j]!) / da;
        const v2 = this.differenz(j, k.v[j]!, b.v[j]!) / db;
        t[j] = v1 * v2 <= 0 ? 0 : (w1 + w2) / (w1 / v1 + w2 / v2);
      }
      return t;
    });
  }

  /** Anker und Griffe beim Winkel w nach out (6 Werte je Anker), Eckstärken nach this.ecke */
  auswerten(w: number, out: Float32Array): void {
    const s = this.kenn;
    const m = s.length;
    const x = ((((w + 180) % 360) + 360) % 360) - 180;
    let i = m - 1;
    for (let k = 0; k < m; k++) if (s[k]!.w <= x) i = k;
    const a = s[i]!;
    const b = s[(i + 1) % m]!;
    let h = b.w - a.w;
    if (h <= 0) h += 360;
    let d = x - a.w;
    if (d < 0) d += 360;
    const t = m > 1 && h > 0 ? d / h : 0;
    const t2 = t * t;
    const t3 = t2 * t;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const ta = this.tang[i]!;
    const tb = this.tang[(i + 1) % m]!;
    const n = this.n;
    const v = new Float64Array(a.v.length);
    for (let j = 0; j < v.length; j++) {
      const delta = m > 1 ? this.differenz(j, a.v[j]!, b.v[j]!) : 0;
      v[j] = a.v[j]! + h01 * delta + h10 * h * ta[j]! + h11 * h * tb[j]!;
    }
    const u = t * t * (3 - 2 * t);
    for (let j = 0; j < n; j++) this.ecke[j] = a.e[j]! + ((m > 1 ? b.e[j]! : a.e[j]!) - a.e[j]!) * u;
    const cx = v[0]!;
    const cy = v[1]!;
    for (let k = 0; k < n; k++) {
      const o = 2 + k * 6;
      let px: number;
      let py: number;
      if (this.art === 'dreh') {
        px = cx + v[o]! * Math.cos(v[o + 1]!);
        py = cy + v[o]! * Math.sin(v[o + 1]!);
      } else {
        px = v[o]!;
        py = v[o + 1]!;
      }
      let ix = v[o + 2]! * Math.cos(v[o + 3]!);
      let iy = v[o + 2]! * Math.sin(v[o + 3]!);
      let ox = v[o + 4]! * Math.cos(v[o + 5]!);
      let oy = v[o + 4]! * Math.sin(v[o + 5]!);
      // glatte Anker: Griffe auf eine Gerade (Richtung aus beiden gemittelt); Ecken behalten ihre eigenen
      const g = this.ecke[k]!;
      if (g < 1) {
        let dx = ox - ix;
        let dy = oy - iy;
        const l = Math.hypot(dx, dy);
        if (l > 1e-6) {
          dx /= l;
          dy /= l;
          const li = Math.hypot(ix, iy);
          const lo = Math.hypot(ox, oy);
          ix = ix * g + -dx * li * (1 - g);
          iy = iy * g + -dy * li * (1 - g);
          ox = ox * g + dx * lo * (1 - g);
          oy = oy * g + dy * lo * (1 - g);
        }
      }
      out[k * 6] = px;
      out[k * 6 + 1] = py;
      out[k * 6 + 2] = ix;
      out[k * 6 + 3] = iy;
      out[k * 6 + 4] = ox;
      out[k * 6 + 5] = oy;
    }
  }

  marke(p: Float32Array, name: string): [number, number] {
    const i = this.marken[name]!;
    return [p[i * 6]!, p[i * 6 + 1]!];
  }
}

/** Formen anlegen: positive Ansichten, Zusätze (Rückseite …), dann die gespiegelten */
export function ankerFormenAnlegen(
  rohe: AnkerRoh[],
  artVon: (name: string) => Art,
  zusatz: (name: string, eigen: Record<number, Float32Array>, form: AnkerForm) => void = () => {},
  schiebenVon: (name: string) => boolean = () => false,
): Map<string, AnkerForm> {
  const positiv = new Map<string, Record<number, Float32Array>>();
  const formen = new Map<string, AnkerForm>();
  for (const r of rohe) {
    const eigen: Record<number, Float32Array> = {};
    for (const [w, p] of Object.entries(r.ansichten)) eigen[Number(w)] = Float32Array.from(p);
    positiv.set(r.name, eigen);
    formen.set(r.name, new AnkerForm(r, artVon(r.name)));
  }
  for (const r of rohe) zusatz(r.name, positiv.get(r.name)!, formen.get(r.name)!);
  for (const r of rohe) {
    const partner = r.spiegel && r.spiegel !== 'selbst' && positiv.has(r.spiegel) ? { p: positiv.get(r.spiegel)!, form: formen.get(r.spiegel)! } : null;
    formen.get(r.name)!.anlegen(positiv.get(r.name)!, partner, schiebenVon(r.name));
  }
  return formen;
}

/** Hilfen für Verformungen an Ankern: drehen (mit Griffen), verschieben, skalieren */
export function ankerDrehen(p: Float32Array, i: number, cx: number, cy: number, w: number): void {
  const c = Math.cos(w);
  const s = Math.sin(w);
  const x = p[i * 6]! - cx;
  const y = p[i * 6 + 1]! - cy;
  p[i * 6] = cx + x * c - y * s;
  p[i * 6 + 1] = cy + x * s + y * c;
  for (const o of [2, 4]) {
    const hx = p[i * 6 + o]!;
    const hy = p[i * 6 + o + 1]!;
    p[i * 6 + o] = hx * c - hy * s;
    p[i * 6 + o + 1] = hx * s + hy * c;
  }
}
export function ankerAffin(p: Float32Array, n: number, a: number, b: number, c: number, d: number, tx: number, ty: number): void {
  // x' = a·x + b·y + tx, y' = c·x + d·y + ty; Griffe ohne Verschiebung
  for (let i = 0; i < n; i++) {
    const x = p[i * 6]!;
    const y = p[i * 6 + 1]!;
    p[i * 6] = a * x + b * y + tx;
    p[i * 6 + 1] = c * x + d * y + ty;
    for (const o of [2, 4]) {
      const hx = p[i * 6 + o]!;
      const hy = p[i * 6 + o + 1]!;
      p[i * 6 + o] = a * hx + b * hy;
      p[i * 6 + o + 1] = c * hx + d * hy;
    }
  }
}
