// Formen über einen Winkel: Schlüsselansichten (aus Florians Zeichnungen) werden glatt ineinander gerechnet.
// Jede Form hat in jeder Ansicht dieselbe Punktzahl; Punkt i ist überall „dieselbe Stelle“ (zwischen zwei Marken gleich viele
// Punkte nach Bogenlänge). Negative Winkel sind das Spiegelbild: für ein Paar (Ohr hinten/vorn) das gespiegelte Gegenstück, für
// ein symmetrisches Teil das eigene Spiegelbild mit getauschten Punkten (σ), damit eine Marke auf ihrer Bildseite bleibt.
// Zwischen den Ansichten: monotone kubische Interpolation (Fritsch–Butland), periodisch über 360°, ohne Überschwingen.
// Ecken haben je Ansicht eine Stärke (0 = glatt, 1 = Knick), die linear mitgeht: Knicke blenden ein und aus, statt zu springen.
import type { FormRoh } from './daten/formen';

export interface Schluessel {
  w: number; // Winkel in Grad
  p: Float32Array;
  e: Float32Array; // Eckstärke je Punkt
}

export class Form {
  readonly name: string;
  readonly farbe: 'schwarz' | 'weiss';
  readonly n: number;
  readonly marken: Record<string, number>;
  readonly sigma: Int32Array | null;
  /** Eckstärken der Rohdaten je Winkel */
  readonly eckRoh: Record<number, Float32Array> = {};
  /** Schlüssel über den ganzen Kreis, nach Winkel sortiert, in [-180, 180) */
  schluessel: Schluessel[] = [];
  private tangenten: Float32Array[] = [];
  /** Eckstärken der letzten Auswertung */
  readonly ecke: Float32Array;
  /** hat die Form überhaupt Ecken? */
  readonly mitEcken: boolean;

  constructor(roh: FormRoh) {
    this.name = roh.name;
    this.farbe = roh.farbe;
    this.n = roh.n;
    this.marken = roh.marken;
    this.sigma = roh.sigma ? Int32Array.from(roh.sigma) : null;
    this.ecke = new Float32Array(roh.n);
    let mit = false;
    for (const [w, liste] of Object.entries(roh.ecken)) {
      const e = new Float32Array(roh.n);
      for (const [i, g] of liste) {
        e[i] = g;
        if (g > 0) mit = true;
      }
      this.eckRoh[Number(w)] = e;
    }
    this.mitEcken = mit;
  }

  /** gespiegelt (x → −x), wahlweise mit σ umgeordnet */
  spiegeln(p: Float32Array, sigma: Int32Array | null): Float32Array {
    const out = new Float32Array(p.length);
    for (let i = 0; i < this.n; i++) {
      const q = sigma ? sigma[i]! : i;
      out[i * 2] = -p[q * 2]!;
      out[i * 2 + 1] = p[q * 2 + 1]!;
    }
    return out;
  }
  private spiegelEcken(e: Float32Array, sigma: Int32Array | null): Float32Array {
    const out = new Float32Array(e.length);
    for (let i = 0; i < this.n; i++) out[i] = e[sigma ? sigma[i]! : i]!;
    return out;
  }

  /** Eckstärke für einen Winkel aus den Rohdaten (fehlt er, die nächste Ansicht) */
  eckenFuer(w: number): Float32Array {
    if (this.eckRoh[w]) return this.eckRoh[w]!;
    let best: number | null = null;
    for (const k of Object.keys(this.eckRoh).map(Number)) if (best === null || Math.abs(k - w) < Math.abs(best - w)) best = k;
    return best === null ? new Float32Array(this.n) : this.eckRoh[best]!;
  }

  /** Schlüssel festlegen: positive Winkel (0…180) eigen, negative aus dem Spiegelpartner (oder dem eigenen Spiegelbild) */
  anlegen(eigen: Record<number, Float32Array>, partner: { p: Record<number, Float32Array>; form: Form } | null): void {
    const liste: Schluessel[] = [];
    for (const [ws, p] of Object.entries(eigen)) {
      const w = Number(ws);
      liste.push({ w: w >= 180 ? -180 : w, p, e: this.eckenFuer(w) });
      if (w > 0 && w < 180) {
        if (partner) {
          const q = partner.p[w] ?? p;
          liste.push({ w: -w, p: this.spiegeln(q, null), e: partner.form.eckenFuer(w) });
        } else liste.push({ w: -w, p: this.spiegeln(p, this.sigma), e: this.spiegelEcken(this.eckenFuer(w), this.sigma) });
      }
    }
    liste.sort((a, b) => a.w - b.w);
    this.schluessel = liste;
    this.tangentenRechnen();
  }

  private tangentenRechnen(): void {
    const s = this.schluessel;
    const m = s.length;
    this.tangenten = s.map((k, i) => {
      const t = new Float32Array(k.p.length);
      if (m < 2) return t;
      const a = s[(i - 1 + m) % m]!;
      const b = s[(i + 1) % m]!;
      let da = k.w - a.w;
      let db = b.w - k.w;
      if (da <= 0) da += 360;
      if (db <= 0) db += 360;
      // monoton (Fritsch–Butland, wie PCHIP): kein Überschwingen zwischen ungleich weit entfernten Ansichten
      const w1 = 2 * db + da;
      const w2 = db + 2 * da;
      for (let j = 0; j < t.length; j++) {
        const v1 = (k.p[j]! - a.p[j]!) / da;
        const v2 = (b.p[j]! - k.p[j]!) / db;
        t[j] = v1 * v2 <= 0 ? 0 : (w1 + w2) / (w1 / v1 + w2 / v2);
      }
      return t;
    });
  }

  /** Form beim Winkel w (Grad, beliebig) nach `out`; Eckstärken nach `this.ecke` */
  auswerten(w: number, out: Float32Array): void {
    const s = this.schluessel;
    const m = s.length;
    if (m === 1) {
      out.set(s[0]!.p);
      this.ecke.set(s[0]!.e);
      return;
    }
    const x = ((((w + 180) % 360) + 360) % 360) - 180;
    // Abschnitt suchen: s[i].w <= x < s[i+1].w (zyklisch)
    let i = m - 1;
    for (let k = 0; k < m; k++) if (s[k]!.w <= x) i = k;
    const a = s[i]!;
    const b = s[(i + 1) % m]!;
    let h = b.w - a.w;
    if (h <= 0) h += 360;
    let d = x - a.w;
    if (d < 0) d += 360;
    const t = h > 0 ? d / h : 0;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const ta = this.tangenten[i]!;
    const tb = this.tangenten[(i + 1) % m]!;
    for (let j = 0; j < out.length; j++) out[j] = h00 * a.p[j]! + h10 * h * ta[j]! + h01 * b.p[j]! + h11 * h * tb[j]!;
    if (this.mitEcken) {
      const u = t * t * (3 - 2 * t);
      for (let j = 0; j < this.n; j++) this.ecke[j] = a.e[j]! + (b.e[j]! - a.e[j]!) * u;
    }
  }

  /** Punkt einer Marke in einer ausgewerteten Form */
  marke(p: Float32Array, name: string): [number, number] {
    const i = this.marken[name]!;
    return [p[i * 2]!, p[i * 2 + 1]!];
  }
}

/** Formen einer Gruppe anlegen (Partner über `spiegel`) */
export function formenAnlegen(
  rohe: FormRoh[],
  zusatz: (name: string, eigen: Record<number, Float32Array>, alle: Map<string, Record<number, Float32Array>>, form: Form) => void = () => {},
): Map<string, Form> {
  // positive Schlüssel je Teil (Rohdaten), dann Zusätze (z. B. Rückansicht), dann Spiegel
  const positiv = new Map<string, Record<number, Float32Array>>();
  const formen = new Map<string, Form>();
  for (const r of rohe) {
    const eigen: Record<number, Float32Array> = {};
    for (const [w, p] of Object.entries(r.ansichten)) eigen[Number(w)] = Float32Array.from(p);
    positiv.set(r.name, eigen);
    formen.set(r.name, new Form(r));
  }
  for (const r of rohe) zusatz(r.name, positiv.get(r.name)!, positiv, formen.get(r.name)!);
  for (const r of rohe) {
    const partner = r.spiegel && r.spiegel !== 'selbst' && positiv.has(r.spiegel) ? { p: positiv.get(r.spiegel)!, form: formen.get(r.spiegel)! } : null;
    formen.get(r.name)!.anlegen(positiv.get(r.name)!, partner);
  }
  return formen;
}
