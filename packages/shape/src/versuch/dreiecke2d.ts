// VERSUCH (13.10.2026): Delaunay-Triangulierung in 2D mit erzwungenen Kanten (constrained Delaunay).
//
// Für die Bauweise „rund“ (`aufblasen.ts`): Das Innere des Seitenumrisses wird trianguliert, der Rand liegt exakt auf dem
// Umriss. Spantlinien und Kantenlinien können als erzwungene Kanten dazukommen (das Netz folgt ihnen genau).
//
// Verfahren:
// 1. Punkte nacheinander in ein großes Hilfsdreieck einfügen (Dreieck durch Laufen finden, teilen, Kanten nach dem
//    Umkreis-Kriterium kippen; Lawson). Ein Punkt auf einer Kante teilt die Kante.
// 2. Erzwungene Kanten, die fehlen, durch Kippen der gekreuzten Kanten herstellen (Sloan 1993), danach die neuen Kanten
//    wieder nach Delaunay prüfen (erzwungene Kanten werden nie gekippt).
// 3. Der Aufrufer wählt die Dreiecke, die er behält (z. B. Schwerpunkt im Umriss).
//
// Öffentliche Punktindizes zählen ohne die drei Hilfspunkte.

export type Dreiecke2D = {
  x: Float64Array;
  y: Float64Array;
  /** Dreiecke, je drei Punktindizes gegen den Uhrzeigersinn */
  dreiecke: Int32Array;
};

const H = 3;

export class Triangulierung {
  private px: number[] = [];
  private py: number[] = [];
  /** Eckpunkte je Dreieck (gegen den Uhrzeigersinn); Kante i = (v_i, v_{i+1}) */
  private tv: Int32Array;
  /** Nachbar über Kante i (−1 = keiner) */
  private tn: Int32Array;
  /** Kante i erzwungen */
  private tc: Uint8Array;
  private anzahl = 0;
  /** ein Dreieck je Punkt (Kantensuche im Fächer) */
  private vt: number[] = [];
  private letztes = 0;
  private stapel: number[] = [];
  private readonly tol: number;
  /** erzwungene Kanten, die nicht hergestellt werden konnten */
  fehlend = 0;

  constructor(x0: number, y0: number, x1: number, y1: number, kapazitaet = 1024) {
    this.tv = new Int32Array(3 * kapazitaet);
    this.tn = new Int32Array(3 * kapazitaet).fill(-1);
    this.tc = new Uint8Array(3 * kapazitaet);
    const d = Math.max(x1 - x0, y1 - y0, 1e-9);
    this.tol = 1e-12 * d;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    // Hilfsdreieck (Punkte 0, 1, 2), weit außerhalb der echten Punkte
    this.punkt(mx - 60 * d, my - 40 * d);
    this.punkt(mx + 60 * d, my - 40 * d);
    this.punkt(mx, my + 70 * d);
    this.neu(0, 1, 2);
  }

  get punktAnzahl(): number {
    return this.px.length - H;
  }

  private punkt(x: number, y: number): number {
    this.px.push(x);
    this.py.push(y);
    this.vt.push(-1);
    return this.px.length - 1;
  }

  private neu(a: number, b: number, c: number): number {
    if (3 * (this.anzahl + 1) > this.tv.length) {
      const n = this.tv.length * 2;
      const tv = new Int32Array(n);
      tv.set(this.tv);
      const tn = new Int32Array(n).fill(-1);
      tn.set(this.tn);
      const tc = new Uint8Array(n);
      tc.set(this.tc);
      this.tv = tv;
      this.tn = tn;
      this.tc = tc;
    }
    const t = this.anzahl++;
    this.setze(t, a, b, c, -1, -1, -1, 0, 0, 0);
    return t;
  }

  private setze(t: number, a: number, b: number, c: number, na: number, nb: number, nc: number, ca: number, cb: number, cc: number): void {
    const o = 3 * t;
    this.tv[o] = a;
    this.tv[o + 1] = b;
    this.tv[o + 2] = c;
    this.tn[o] = na;
    this.tn[o + 1] = nb;
    this.tn[o + 2] = nc;
    this.tc[o] = ca;
    this.tc[o + 1] = cb;
    this.tc[o + 2] = cc;
    this.vt[a] = t;
    this.vt[b] = t;
    this.vt[c] = t;
  }

  /** Im Nachbarn `u` den Verweis auf `alt` durch `neu` ersetzen. */
  private umhaengen(u: number, alt: number, neu: number): void {
    if (u < 0) return;
    const o = 3 * u;
    for (let k = 0; k < 3; k++) {
      if (this.tn[o + k] === alt) {
        this.tn[o + k] = neu;
        return;
      }
    }
  }

  private kanteIn(u: number, t: number): number {
    const o = 3 * u;
    return this.tn[o] === t ? 0 : this.tn[o + 1] === t ? 1 : this.tn[o + 2] === t ? 2 : -1;
  }

  private orient(a: number, b: number, c: number): number {
    const { px, py } = this;
    return (px[b]! - px[a]!) * (py[c]! - py[a]!) - (py[b]! - py[a]!) * (px[c]! - px[a]!);
  }

  /** Abstand (mit Vorzeichen, links positiv) des Punkts (x, y) von der Geraden a → b. */
  private seiteP(a: number, b: number, x: number, y: number): number {
    const { px, py } = this;
    const dx = px[b]! - px[a]!;
    const dy = py[b]! - py[a]!;
    return (dx * (y - py[a]!) - dy * (x - px[a]!)) / (Math.hypot(dx, dy) || 1);
  }

  /** Liegt d im Umkreis des (gegen den Uhrzeigersinn laufenden) Dreiecks a, b, c? Mit Toleranz relativ zur Größe der Terme. */
  private imKreis(a: number, b: number, c: number, d: number): boolean {
    const { px, py } = this;
    const adx = px[a]! - px[d]!;
    const ady = py[a]! - py[d]!;
    const bdx = px[b]! - px[d]!;
    const bdy = py[b]! - py[d]!;
    const cdx = px[c]! - px[d]!;
    const cdy = py[c]! - py[d]!;
    const al = adx * adx + ady * ady;
    const bl = bdx * bdx + bdy * bdy;
    const cl = cdx * cdx + cdy * cdy;
    const bc = bdx * cdy - cdx * bdy;
    const ca = cdx * ady - adx * cdy;
    const ab = adx * bdy - bdx * ady;
    const det = al * bc + bl * ca + cl * ab;
    const perm = al * (Math.abs(bdx * cdy) + Math.abs(cdx * bdy)) + bl * (Math.abs(cdx * ady) + Math.abs(adx * cdy)) + cl * (Math.abs(adx * bdy) + Math.abs(bdx * ady));
    return det > 1e-10 * perm;
  }

  /** schneiden sich die Strecken (p, q) und (r, s) echt (innen)? */
  private kreuzen(p: number, q: number, r: number, s: number): boolean {
    return this.orient(p, q, r) * this.orient(p, q, s) < 0 && this.orient(r, s, p) * this.orient(r, s, q) < 0;
  }

  /** Kante i von t kippen: t = (a, b, p), Nachbar u = (b, a, d) → t = (p, a, d), u = (p, d, b). Rückgabe u. */
  private kippen(t: number, i: number): number {
    const o = 3 * t;
    const i1 = (i + 1) % 3;
    const i2 = (i + 2) % 3;
    const a = this.tv[o + i]!;
    const b = this.tv[o + i1]!;
    const p = this.tv[o + i2]!;
    const u = this.tn[o + i]!;
    const j = this.kanteIn(u, t);
    const q = 3 * u;
    const j1 = (j + 1) % 3;
    const j2 = (j + 2) % 3;
    const d = this.tv[q + j2]!;
    const tb = this.tn[o + i1]!;
    const ta = this.tn[o + i2]!;
    const ua = this.tn[q + j1]!;
    const ub = this.tn[q + j2]!;
    const ctb = this.tc[o + i1]!;
    const cta = this.tc[o + i2]!;
    const cua = this.tc[q + j1]!;
    const cub = this.tc[q + j2]!;
    this.setze(t, p, a, d, ta, ua, u, cta, cua, 0);
    this.setze(u, p, d, b, t, ub, tb, 0, cub, ctb);
    this.umhaengen(ua, u, t);
    this.umhaengen(tb, t, u);
    return u;
  }

  /**
   * Kanten vom Stapel (Dreieck, Kante) prüfen und kippen, bis alles Delaunay ist. `gegenueber`: Der dritte Punkt des
   * Dreiecks ist der neue Punkt (nach dem Einfügen); sonst werden nach jedem Kippen alle vier Außenkanten geprüft.
   */
  private legalisieren(gegenueber: boolean): void {
    const st = this.stapel;
    let runden = 0;
    while (st.length && runden++ < 1_000_000) {
      const i = st.pop()!;
      const t = st.pop()!;
      const o = 3 * t;
      if (this.tc[o + i]) continue;
      const u = this.tn[o + i]!;
      if (u < 0) continue;
      const j = this.kanteIn(u, t);
      if (j < 0) continue;
      const a = this.tv[o + i]!;
      const b = this.tv[o + ((i + 1) % 3)]!;
      const p = this.tv[o + ((i + 2) % 3)]!;
      const d = this.tv[3 * u + ((j + 2) % 3)]!;
      if (!this.imKreis(a, b, p, d)) continue;
      if (!gegenueber && !this.kreuzen(a, b, p, d)) continue;
      const u2 = this.kippen(t, i);
      // t = (p, a, d), u2 = (p, d, b)
      if (gegenueber) st.push(t, 1, u2, 1);
      else st.push(t, 0, t, 1, u2, 1, u2, 2);
    }
  }

  /** Dreieck, das (x, y) enthält; `kante` ≥ 0: Punkt liegt auf dieser Kante; `gleich` ≥ 0: vorhandener Punkt. */
  private finden(x: number, y: number): { t: number; kante: number; gleich: number } {
    let t = this.letztes < this.anzahl ? this.letztes : 0;
    const tol = this.tol;
    let dreh = 0;
    for (let n = 0; n < this.anzahl + 1000; n++) {
      const o = 3 * t;
      let weiter = -1;
      let aufKante = -1;
      for (let k0 = 0; k0 < 3; k0++) {
        const k = (k0 + dreh) % 3;
        const s = this.seiteP(this.tv[o + k]!, this.tv[o + ((k + 1) % 3)]!, x, y);
        if (s < -tol) {
          weiter = k;
          break;
        }
        if (s <= tol) aufKante = k;
      }
      dreh++;
      if (weiter < 0) {
        for (let k = 0; k < 3; k++) {
          const v = this.tv[o + k]!;
          if (Math.abs(this.px[v]! - x) <= tol && Math.abs(this.py[v]! - y) <= tol) return { t, kante: -1, gleich: v };
        }
        return { t, kante: aufKante, gleich: -1 };
      }
      const u = this.tn[o + weiter]!;
      if (u < 0) break;
      t = u;
    }
    return { t: -1, kante: -1, gleich: -1 };
  }

  /** Punkt einfügen; Rückgabe: Punktindex (bei gleicher Lage der vorhandene Punkt), −1 außerhalb. */
  einfuegen(x: number, y: number): number {
    const f = this.finden(x, y);
    if (f.gleich >= 0) return f.gleich - H;
    if (f.t < 0) return -1;
    const t = f.t;
    const o = 3 * t;
    if (f.kante < 0) {
      const p = this.punkt(x, y);
      const a = this.tv[o]!;
      const b = this.tv[o + 1]!;
      const c = this.tv[o + 2]!;
      const n0 = this.tn[o]!;
      const n1 = this.tn[o + 1]!;
      const n2 = this.tn[o + 2]!;
      const c0 = this.tc[o]!;
      const c1 = this.tc[o + 1]!;
      const c2 = this.tc[o + 2]!;
      const t1 = this.neu(b, c, p);
      const t2 = this.neu(c, a, p);
      this.setze(t, a, b, p, n0, t1, t2, c0, 0, 0);
      this.setze(t1, b, c, p, n1, t2, t, c1, 0, 0);
      this.setze(t2, c, a, p, n2, t, t1, c2, 0, 0);
      this.umhaengen(n1, t, t1);
      this.umhaengen(n2, t, t2);
      this.stapel.push(t, 0, t1, 0, t2, 0);
      this.legalisieren(true);
      this.letztes = t;
      return p - H;
    }
    // auf Kante i von t = (a, b, c); Nachbar u = (b, a, d)
    const i = f.kante;
    const a = this.tv[o + i]!;
    const b = this.tv[o + ((i + 1) % 3)]!;
    const c = this.tv[o + ((i + 2) % 3)]!;
    const u = this.tn[o + i]!;
    if (u < 0) return -1;
    const p = this.punkt(x, y);
    const nbc = this.tn[o + ((i + 1) % 3)]!;
    const nca = this.tn[o + ((i + 2) % 3)]!;
    const cbc = this.tc[o + ((i + 1) % 3)]!;
    const cca = this.tc[o + ((i + 2) % 3)]!;
    const cab = this.tc[o + i]!;
    const j = this.kanteIn(u, t);
    const q = 3 * u;
    const d = this.tv[q + ((j + 2) % 3)]!;
    const nad = this.tn[q + ((j + 1) % 3)]!;
    const ndb = this.tn[q + ((j + 2) % 3)]!;
    const cad = this.tc[q + ((j + 1) % 3)]!;
    const cdb = this.tc[q + ((j + 2) % 3)]!;
    const t2 = this.neu(b, c, p);
    const u2 = this.neu(d, b, p);
    this.setze(t, c, a, p, nca, u, t2, cca, cab, 0);
    this.setze(t2, b, c, p, nbc, t, u2, cbc, 0, cab);
    this.setze(u, a, d, p, nad, u2, t, cad, 0, cab);
    this.setze(u2, d, b, p, ndb, t2, u, cdb, cab, 0);
    this.umhaengen(nbc, t, t2);
    this.umhaengen(ndb, u, u2);
    this.stapel.push(t, 0, t2, 0, u, 0, u2, 0);
    this.legalisieren(true);
    this.letztes = t;
    return p - H;
  }

  /** Dreieck und Kantenindex der gerichteten Kante a → b (interne Indizes), sonst null. */
  private kante(a: number, b: number): { t: number; i: number } | null {
    const t0 = this.vt[a]!;
    if (t0 < 0) return null;
    let t = t0;
    // gegen den Uhrzeigersinn um a
    for (let n = 0; n < 4096; n++) {
      const o = 3 * t;
      const k = this.tv[o] === a ? 0 : this.tv[o + 1] === a ? 1 : this.tv[o + 2] === a ? 2 : -1;
      if (k < 0) return null;
      if (this.tv[o + ((k + 1) % 3)] === b) return { t, i: k };
      const u = this.tn[o + ((k + 2) % 3)]!;
      if (u < 0) break;
      t = u;
      if (t === t0) return null;
    }
    // Rand erreicht (nur am Hilfsdreieck): im Uhrzeigersinn
    t = t0;
    for (let n = 0; n < 4096; n++) {
      const o = 3 * t;
      const k = this.tv[o] === a ? 0 : this.tv[o + 1] === a ? 1 : this.tv[o + 2] === a ? 2 : -1;
      if (k < 0) return null;
      if (this.tv[o + ((k + 1) % 3)] === b) return { t, i: k };
      const u = this.tn[o + k]!;
      if (u < 0 || u === t0) return null;
      t = u;
    }
    return null;
  }

  private markieren(a: number, b: number): void {
    for (const [p, q] of [
      [a, b],
      [b, a],
    ] as const) {
      const k = this.kante(p, q);
      if (k) this.tc[3 * k.t + k.i] = 1;
    }
  }

  /** Ist die Kante (a, b) vorhanden? (öffentliche Indizes) */
  hatKante(a: number, b: number): boolean {
    return !!(this.kante(a + H, b + H) ?? this.kante(b + H, a + H));
  }

  /** Kante (a, b) erzwingen (öffentliche Indizes). Liegt ein Punkt genau auf der Strecke, wird sie dort geteilt. */
  erzwingen(a: number, b: number): boolean {
    const ok = this.erzwingenIntern(a + H, b + H, 0);
    if (!ok) this.fehlend++;
    return ok;
  }

  private aufStrecke(a: number, b: number, v: number): boolean {
    const dx = this.px[b]! - this.px[a]!;
    const dy = this.py[b]! - this.py[a]!;
    const l = Math.hypot(dx, dy) || 1;
    if (Math.abs(this.orient(a, b, v)) / l > this.tol) return false;
    const s = ((this.px[v]! - this.px[a]!) * dx + (this.py[v]! - this.py[a]!) * dy) / (l * l);
    return s > 0 && s < 1;
  }

  private erzwingenIntern(a: number, b: number, tiefe: number): boolean {
    if (a === b) return true;
    if (this.kante(a, b) || this.kante(b, a)) {
      this.markieren(a, b);
      return true;
    }
    if (tiefe > 30) return false;
    // erstes gekreuztes Dreieck im Fächer um a: (a, v1, v2) mit v1 rechts und v2 links der Strecke a → b
    const t0 = this.vt[a]!;
    let t = t0;
    let v1 = -1;
    let v2 = -1;
    for (let n = 0; n < 4096; n++) {
      const o = 3 * t;
      const k = this.tv[o] === a ? 0 : this.tv[o + 1] === a ? 1 : 2;
      const w1 = this.tv[o + ((k + 1) % 3)]!;
      const w2 = this.tv[o + ((k + 2) % 3)]!;
      if (this.aufStrecke(a, b, w1)) return this.erzwingenIntern(a, w1, tiefe + 1) && this.erzwingenIntern(w1, b, tiefe + 1);
      if (this.aufStrecke(a, b, w2)) return this.erzwingenIntern(a, w2, tiefe + 1) && this.erzwingenIntern(w2, b, tiefe + 1);
      if (this.orient(a, b, w1) < 0 && this.orient(a, b, w2) > 0) {
        v1 = w1;
        v2 = w2;
        break;
      }
      const u = this.tn[o + ((k + 2) % 3)]!;
      if (u < 0 || u === t0) break;
      t = u;
    }
    if (v1 < 0) return false;
    // entlang der Strecke laufen: Das aktuelle Dreieck enthält die gerichtete Kante v1 → v2
    const kreuzend: [number, number][] = [[v1, v2]];
    for (let n = 0; n < 1_000_000; n++) {
      const k = this.kante(v2, v1);
      if (!k) return false;
      const w = this.tv[3 * k.t + ((k.i + 2) % 3)]!;
      if (w === b) break;
      if (this.aufStrecke(a, b, w)) return this.erzwingenIntern(a, w, tiefe + 1) && this.erzwingenIntern(w, b, tiefe + 1);
      if (this.orient(a, b, w) < 0) v1 = w;
      else v2 = w;
      kreuzend.push([v1, v2]);
    }
    // gekreuzte Kanten kippen, bis keine mehr die Strecke kreuzt
    const neu: [number, number][] = [];
    let runden = 0;
    while (kreuzend.length) {
      if (runden++ > 200_000) return false;
      const [p, q] = kreuzend.shift()!;
      const k = this.kante(p, q) ?? this.kante(q, p);
      if (!k) continue;
      const o = 3 * k.t;
      const pp = this.tv[o + k.i]!;
      const qq = this.tv[o + ((k.i + 1) % 3)]!;
      const r = this.tv[o + ((k.i + 2) % 3)]!;
      const u = this.tn[o + k.i]!;
      if (u < 0) return false;
      const j = this.kanteIn(u, k.t);
      const s = this.tv[3 * u + ((j + 2) % 3)]!;
      if (!this.kreuzen(pp, qq, r, s)) {
        kreuzend.push([p, q]);
        continue;
      }
      this.kippen(k.t, k.i);
      if (r !== a && r !== b && s !== a && s !== b && this.kreuzen(a, b, r, s)) kreuzend.push([r, s]);
      else neu.push([r, s]);
    }
    if (!this.kante(a, b) && !this.kante(b, a)) return false;
    this.markieren(a, b);
    for (const [p, q] of neu) {
      const k = this.kante(p, q);
      if (k) this.stapel.push(k.t, k.i);
    }
    this.legalisieren(false);
    return true;
  }

  /** Dreiecke ohne Hilfspunkte, deren Schwerpunkt `behalten` erfüllt. */
  ergebnis(behalten: (x: number, y: number) => boolean): Dreiecke2D {
    const out: number[] = [];
    for (let t = 0; t < this.anzahl; t++) {
      const o = 3 * t;
      const a = this.tv[o]!;
      const b = this.tv[o + 1]!;
      const c = this.tv[o + 2]!;
      if (a < H || b < H || c < H) continue;
      if (!behalten((this.px[a]! + this.px[b]! + this.px[c]!) / 3, (this.py[a]! + this.py[b]! + this.py[c]!) / 3)) continue;
      out.push(a - H, b - H, c - H);
    }
    const n = this.px.length - H;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = this.px[i + H]!;
      y[i] = this.py[i + H]!;
    }
    return { x, y, dreiecke: Int32Array.from(out) };
  }
}
