/**
 * Werkzeug P wie in Illustrator (Konzept „Auswahl und Werkzeug P“, Florian, 15.11.2026: „rein von der funktion wie das werkzeug P in
 * illustrator“; seine Antworten vom selben Abend):
 *
 * - Klick setzt einen Punkt (Ecke), Klicken und Ziehen einen runden (beide Griffe gespiegelt), ⌥ beim Ziehen bricht den Griff.
 * - Ziehen geht an jedem Punkt, auch am ersten und am letzten: Beginnt oder endet die Linie auf einem vorhandenen Punkt (oder auf
 *   einer Linie, dort entsteht er), bekommt er für die neue Linie ein eigenes Griffpaar, sein zweites.
 * - Keine offenen Enden, nur Loops: Eine Linie ist fertig, sobald sie sich auf ihrem ersten Punkt schließt oder mit beiden Enden an
 *   Vorhandenem hängt (Abzweigung). Frei begonnen läuft sie durch Vorhandenes hindurch, bis sie sich schließt. ↩ schließt, Esc bricht ab.
 * - Wo die neue Linie eine Linie kreuzt, teilen beide dort einen Punkt (wie die Kreuzungen im Editor). Eingesetzt werden sie, wenn
 *   die Linie fertig ist (vorher kann Ziehen am ersten Punkt die Kurve noch ändern); bis dahin zeigt das Verhalten sie als Vorschau.
 *
 * Hier die Rechnung auf dem Netz der 2D-Probe (`Stift2D`); im Raum macht `Raum3D` dasselbe auf der Haut. Das Verhalten (wann was
 * geschieht, wie es aussieht) steht in `verhalten.ts`.
 */

import { type Linie, type LinienProben, type Netz, bezier, kontrollpunkte, netzKopie, punktEinsetzen } from './netz';

export type V2 = [number, number];

/** wo P ansetzt: frei (ein neuer Punkt), auf einem vorhandenen Punkt oder auf einer Linie (dort entsteht er) */
export type StiftOrt = { art: 'frei'; x: number; y: number } | { art: 'punkt'; pi: number } | { art: 'linie'; li: number; si: number; t: number };

/** Ende des Fadens: ein Ort oder der erste Punkt (schließen) */
export type FadenEnde = StiftOrt | { art: 'schluss' };

export interface EntwurfInfo {
  /** die angefangene Linie im Netz (−1: noch keine Verbindung) */
  li: number;
  /** erster Punkt (dort schließt sie) und letzter (dort hängt der Faden) */
  erster: number;
  letzter: number;
  /** so viele Punkte hat man gesetzt (Kreuzungen nicht gezählt) */
  anzahl: number;
  /** der Anfang hängt an Vorhandenem (Abzweigung): Ein Anschluss an Vorhandenes macht sie fertig */
  haengt: boolean;
  /** Griff, mit dem die nächste Verbindung den letzten Punkt verlässt (vom Punkt aus, Netz-Einheiten) */
  aus: V2;
  /** Griff, mit dem die Schlussverbindung am ersten Punkt ankommt */
  einErster: V2;
}

/** Proben des Fadens (Netz-Einheiten; im Raum Bildschirmpunkte mit Tiefe), gleichmäßig nach Bogenlänge */
export interface FadenProben {
  n: number;
  x: Float32Array;
  y: Float32Array;
  z?: Float32Array;
  s: Float32Array;
  laenge: number;
}

/** was das Verhalten zum Zeichnen mit P braucht; in 2D `Stift2D`, im Raum `Raum3D` */
export interface StiftWerk {
  entwurf(): EntwurfInfo | null;
  /** Ort eines neuen Punkts unter (x, y) oder null (im Raum: neben der Form); `mitte`: auf der Spiegelebene eingerastet */
  ortFrei(x: number, y: number): { x: number; y: number; mitte: boolean } | null;
  /** Linie beginnen; Ergebnis: Nummer ihres ersten Punkts */
  beginnen(o: StiftOrt): number | null;
  /** nächster Punkt (frei) oder Anschluss an Vorhandenes; die Verbindung vom letzten Punkt entsteht (Griff am Ende null) */
  weiter(o: StiftOrt): number | null;
  /** Griffe des letzten Punkts: `aus` zur nächsten Verbindung, `ein` zur vorigen; null: bleibt */
  griffeLetzter(aus: V2 | null, ein: V2 | null): void;
  /** Griffe des ersten Punkts: `aus` zur ersten Verbindung, `ein` zur Schlussverbindung */
  griffeErster(aus: V2 | null, ein: V2 | null): void;
  /** Knick am ersten oder letzten Punkt (Ecke oder gebrochener Griff) */
  knickSetzen(erster: boolean, an: boolean): void;
  /** den letzten Punkt verschieben (Leertaste beim Ziehen); Lage in Netz-Einheiten */
  letztenVerschieben(x: number, y: number): void;
  /** zum ersten Punkt schließen (mit seinem Griff `einErster`) */
  schliessen(): void;
  /** die Linie gehört zum Netz: wo sie Linien kreuzt, teilen beide einen Punkt; Ergebnis: ihre Nummer */
  fertig(): number;
  abbrechen(): void;
  /** den letzten Punkt zurücknehmen; false: es war der erste (dann abgebrochen) */
  zurueck(): boolean;
  /** Faden vom letzten Punkt (mit seinem Griff `aus`) zum Ende, mit Griff `gEnde` am Ende */
  faden(ende: FadenEnde, gEnde: V2): FadenProben | null;
}

// ---------- Rechnen auf Bézier-Stücken ----------

/** Ableitung der Bézier-Kurve (Kontrollpunkte x0, y0 … x3, y3) */
export function bezierAbl(k: readonly number[], t: number): V2 {
  const u = 1 - t;
  const a = 3 * u * u;
  const b = 6 * u * t;
  const c = 3 * t * t;
  return [a * (k[2]! - k[0]!) + b * (k[4]! - k[2]!) + c * (k[6]! - k[4]!), a * (k[3]! - k[1]!) + b * (k[5]! - k[3]!) + c * (k[7]! - k[5]!)];
}

/** gleichmäßige Proben einer Bézier-Kurve nach Bogenlänge, etwa `schritt` auseinander */
export function bezierProben(k: readonly number[], schritt: number): FadenProben {
  const fein = 64;
  const tab = new Float32Array(fein + 1);
  let [px, py] = bezier(k, 0);
  for (let i = 1; i <= fein; i++) {
    const [x, y] = bezier(k, i / fein);
    tab[i] = tab[i - 1]! + Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  const laenge = tab[fein]!;
  const n = Math.max(2, Math.ceil(laenge / Math.max(schritt, 1e-3)) + 1);
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const s = new Float32Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const ziel = (laenge * i) / (n - 1);
    while (j < fein - 1 && tab[j + 1]! < ziel) j++;
    const a = tab[j]!;
    const b = tab[j + 1]!;
    const t = (j + (b > a ? (ziel - a) / (b - a) : 0)) / fein;
    [x[i], y[i]] = bezier(k, t);
    s[i] = ziel;
  }
  return { n, x, y, s, laenge };
}

export interface Kreuzung {
  /** Parameter auf dem neuen Stück */
  t: number;
  /** die gekreuzte Linie, ihr Stück und Parameter */
  lj: number;
  sj: number;
  u: number;
  x: number;
  y: number;
}

/**
 * Wo das Bézier-Stück `k` (Kontrollpunkte) die Linien des Netzes kreuzt (nicht `ohneLinie`, nicht verdeckt). Grob über die Proben,
 * genau mit Newton auf beiden Kurven. Kreuzungen näher als `rand` an den Enden des Stücks zählen nicht (dort hängt es schon).
 */
export function kreuzungenSuchen(n: Netz, proben: readonly LinienProben[], k: readonly number[], ohneLinie: number, rand: number): Kreuzung[] {
  const N = 64;
  const px = new Float64Array(N + 1);
  const py = new Float64Array(N + 1);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i <= N; i++) {
    const [x, y] = bezier(k, i / N);
    px[i] = x;
    py[i] = y;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const aus: Kreuzung[] = [];
  proben.forEach((P, lj) => {
    if (lj === ohneLinie || P.n < 2) return;
    const l = n.linien[lj];
    if (!l) return;
    for (let j = 0; j + 1 < P.n; j++) {
      if (P.schicht[j] === 1 || P.schicht[j + 1] === 1) continue;
      const bx = P.x[j]!;
      const by = P.y[j]!;
      const cx = P.x[j + 1]!;
      const cy = P.y[j + 1]!;
      if (Math.max(bx, cx) < x0 || Math.min(bx, cx) > x1 || Math.max(by, cy) < y0 || Math.min(by, cy) > y1) continue;
      const vx = cx - bx;
      const vy = cy - by;
      for (let i = 0; i < N; i++) {
        const ax = px[i]!;
        const ay = py[i]!;
        const ux = px[i + 1]! - ax;
        const uy = py[i + 1]! - ay;
        const d = ux * vy - uy * vx;
        if (Math.abs(d) < 1e-12) continue;
        const tt = ((bx - ax) * vy - (by - ay) * vx) / d;
        const ss = ((bx - ax) * uy - (by - ay) * ux) / d;
        if (tt < 0 || tt >= 1 || ss < 0 || ss >= 1) continue;
        let t = (i + tt) / N;
        const gleich = P.si[j] === P.si[j + 1];
        const sj = gleich || ss < 0.5 ? P.si[j]! : P.si[j + 1]!;
        let u = gleich ? P.t[j]! + (P.t[j + 1]! - P.t[j]!) * ss : ss < 0.5 ? P.t[j]! : P.t[j + 1]!;
        // genau: Newton auf beiden Kurven
        const k2 = kontrollpunkte(n, l, sj);
        for (let it = 0; it < 10; it++) {
          const p = bezier(k, t);
          const q = bezier(k2, u);
          const Fx = p[0] - q[0];
          const Fy = p[1] - q[1];
          if (Fx * Fx + Fy * Fy < 1e-18) break;
          const d1 = bezierAbl(k, t);
          const d2 = bezierAbl(k2, u);
          const det = -d1[0] * d2[1] + d2[0] * d1[1];
          if (Math.abs(det) < 1e-12) break;
          // J · (dt, du) = −F mit J = (d1, −d2)
          t = Math.min(1, Math.max(0, t + (Fx * d2[1] - d2[0] * Fy) / det));
          u = Math.min(1, Math.max(0, u + (-d1[0] * Fy + d1[1] * Fx) / det));
        }
        const [x, y] = bezier(k2, u);
        const [ex, ey] = bezier(k, t);
        if (Math.hypot(ex - x, ey - y) > rand) continue;
        if (Math.hypot(x - k[0]!, y - k[1]!) < rand || Math.hypot(x - k[6]!, y - k[7]!) < rand) continue;
        if (aus.some((q) => q.lj === lj && Math.hypot(q.x - x, q.y - y) < rand * 0.5)) continue;
        aus.push({ t, lj, sj, u, x, y });
      }
    }
  });
  return aus;
}

/**
 * Kreuzungen einsetzen: auf den gekreuzten Linien je ein Punkt (oder ein vorhandener, der fast dort liegt), und das Stück `si` der
 * Linie `li` an denselben Punkten geteilt. Die Kurven behalten genau ihren Verlauf.
 */
export function kreuzungenEinsetzen(n: Netz, li: number, si: number, kr: Kreuzung[], nahe: number): void {
  if (!kr.length) return;
  // zuerst auf den gekreuzten Linien, je Linie von hinten (Stücke und Parameter bleiben gültig)
  const nummer = new Map<Kreuzung, number>();
  const nachLinie = new Map<number, Kreuzung[]>();
  for (const q of kr) nachLinie.set(q.lj, [...(nachLinie.get(q.lj) ?? []), q]);
  for (const [lj, liste] of nachLinie) {
    liste.sort((a, b) => b.sj - a.sj || b.u - a.u);
    let letztesStueck = -1;
    let teil = 1;
    for (const q of liste) {
      const l = n.linien[lj]!;
      // ein Punkt der Linie liegt fast dort: ihn nehmen
      const vorhanden = l.punkte.find((p) => n.punkte[p]!.sichtbar && Math.hypot(n.punkte[p]!.x - q.x, n.punkte[p]!.y - q.y) < nahe);
      if (vorhanden !== undefined) {
        nummer.set(q, vorhanden);
        continue;
      }
      if (q.sj !== letztesStueck) {
        letztesStueck = q.sj;
        teil = 1;
      }
      const u = Math.min(0.999999, q.u / teil);
      nummer.set(q, punktEinsetzen(n, lj, q.sj, u));
      teil = q.u;
    }
  }
  // dann das neue Stück, von hinten
  const l = n.linien[li]!;
  const sortiert = kr.slice().sort((a, b) => b.t - a.t);
  let teil = 1;
  for (const q of sortiert) {
    const p = nummer.get(q)!;
    const t = Math.min(0.999999, q.t / teil);
    const neu = punktEinsetzen(n, li, si, t);
    // der eingesetzte Punkt ist der gemeinsame
    const pos = l.punkte.indexOf(neu);
    l.punkte[pos] = p;
    if (neu === n.punkte.length - 1) n.punkte.pop();
    teil = q.t;
  }
}

// ---------- 2D ----------

interface Zustand {
  erster: number;
  letzter: number;
  anzahl: number;
  li: number;
  haengt: boolean;
  aus: V2;
  einErster: V2;
  knickErster: boolean;
}

/** Werkzeug P auf dem Netz der 2D-Probe */
export class Stift2D implements StiftWerk {
  private e: Zustand | null = null;
  /** je gesetztem Punkt das Netz davor (⌫) */
  private stapel: { netz: Netz; e: Zustand }[] = [];
  /** das Netz vor der Linie (Esc); ein Punkt, den P auf eine Linie gesetzt hat, gehört schon dazu */
  private vorher: Netz | null = null;

  constructor(
    private holen: () => Netz,
    private setzen: (n: Netz) => void,
    private proben: () => readonly LinienProben[],
    /** Netz-Einheiten je Bildschirmpunkt (Abstände für das Treffen) */
    private masz: () => number,
  ) {}

  entwurf(): EntwurfInfo | null {
    const e = this.e;
    if (!e) return null;
    return { li: e.li, erster: e.erster, letzter: e.letzter, anzahl: e.anzahl, haengt: e.haengt, aus: e.aus, einErster: e.einErster };
  }

  ortFrei(x: number, y: number): { x: number; y: number; mitte: boolean } {
    return { x, y, mitte: false };
  }

  /** Punkt zu einem Ort: frei neu, vorhanden, oder auf der Linie eingesetzt */
  private punktFuer(n: Netz, o: StiftOrt): number {
    if (o.art === 'punkt') return o.pi;
    if (o.art === 'linie') return punktEinsetzen(n, o.li, o.si, o.t);
    n.punkte.push({ x: o.x, y: o.y, sichtbar: true, verdeckt: false });
    return n.punkte.length - 1;
  }

  beginnen(o: StiftOrt): number | null {
    const n = netzKopie(this.holen());
    if (o.art === 'frei') this.vorher = netzKopie(n);
    const p = this.punktFuer(n, o);
    if (o.art !== 'frei') this.vorher = netzKopie(n);
    this.e = { erster: p, letzter: p, anzahl: 1, li: -1, haengt: o.art !== 'frei', aus: [0, 0], einErster: [0, 0], knickErster: true };
    this.stapel = [];
    this.setzen(n);
    return p;
  }

  weiter(o: StiftOrt): number | null {
    const e = this.e;
    if (!e) return null;
    const alt = this.holen();
    this.stapel.push({ netz: netzKopie(alt), e: { ...e, aus: [...e.aus], einErster: [...e.einErster] } });
    const n = netzKopie(alt);
    const p = this.punktFuer(n, o);
    const st = { g1x: e.aus[0], g1y: e.aus[1], g2x: 0, g2y: 0, art: 'innen' as const };
    if (e.li < 0) {
      n.linien.push({ zu: false, punkte: [e.erster, p], stuecke: [st], knick: [e.knickErster, true] });
      e.li = n.linien.length - 1;
    } else {
      const l = n.linien[e.li]!;
      l.punkte.push(p);
      l.stuecke.push(st);
      l.knick = [...(l.knick ?? l.punkte.slice(0, -1).map(() => false)), true];
    }
    e.letzter = p;
    e.anzahl++;
    e.aus = [0, 0];
    this.setzen(n);
    return p;
  }

  private linie(n: Netz): Linie | null {
    const e = this.e;
    return e && e.li >= 0 ? (n.linien[e.li] ?? null) : null;
  }

  griffeLetzter(aus: V2 | null, ein: V2 | null): void {
    const e = this.e;
    if (!e) return;
    if (aus) e.aus = [aus[0], aus[1]];
    const n = netzKopie(this.holen());
    const l = this.linie(n);
    if (ein) {
      if (!l || e.anzahl === 1) e.einErster = [ein[0], ein[1]];
      else {
        const s = l.stuecke[l.stuecke.length - 1]!;
        s.g2x = ein[0];
        s.g2y = ein[1];
      }
    }
    this.setzen(n);
  }

  griffeErster(aus: V2 | null, ein: V2 | null): void {
    const e = this.e;
    if (!e) return;
    const n = netzKopie(this.holen());
    const l = this.linie(n);
    if (aus) {
      if (l) {
        l.stuecke[0]!.g1x = aus[0];
        l.stuecke[0]!.g1y = aus[1];
      } else e.aus = [aus[0], aus[1]];
    }
    if (ein) {
      e.einErster = [ein[0], ein[1]];
      if (l?.zu) {
        const s = l.stuecke[l.stuecke.length - 1]!;
        s.g2x = ein[0];
        s.g2y = ein[1];
      }
    }
    this.setzen(n);
  }

  knickSetzen(erster: boolean, an: boolean): void {
    const e = this.e;
    if (!e) return;
    if (erster && e.li < 0) {
      e.knickErster = an;
      return;
    }
    const n = netzKopie(this.holen());
    const l = this.linie(n);
    if (!l) return;
    l.knick = l.knick ?? l.punkte.map(() => false);
    l.knick[erster ? 0 : l.punkte.length - 1] = an;
    this.setzen(n);
  }

  letztenVerschieben(x: number, y: number): void {
    const e = this.e;
    if (!e) return;
    const n = netzKopie(this.holen());
    const p = n.punkte[e.letzter];
    if (!p) return;
    p.x = x;
    p.y = y;
    this.setzen(n);
  }

  schliessen(): void {
    const e = this.e;
    if (!e || e.li < 0) return;
    const n = netzKopie(this.holen());
    const l = n.linien[e.li]!;
    l.stuecke.push({ g1x: e.aus[0], g1y: e.aus[1], g2x: e.einErster[0], g2y: e.einErster[1], art: 'innen' });
    l.zu = true;
    e.aus = [0, 0];
    this.setzen(n);
  }

  fertig(): number {
    const e = this.e;
    if (e && e.li >= 0) {
      // Kreuzungen, Stück für Stück von hinten (die vorderen behalten ihre Nummern); Kreuzungen sind Punkte ohne Knick
      const g = this.masz();
      const anzahl = this.holen().linien[e.li]!.stuecke.length;
      for (let si = anzahl - 1; si >= 0; si--) {
        const n = netzKopie(this.holen());
        const l = n.linien[e.li]!;
        const kr = kreuzungenSuchen(n, this.proben(), kontrollpunkte(n, l, si), e.li, 1.5 * g);
        if (!kr.length) continue;
        kreuzungenEinsetzen(n, e.li, si, kr, 1.5 * g);
        this.setzen(n);
      }
    }
    this.e = null;
    this.stapel = [];
    this.vorher = null;
    return e?.li ?? -1;
  }

  abbrechen(): void {
    if (this.vorher) this.setzen(this.vorher);
    this.e = null;
    this.stapel = [];
    this.vorher = null;
  }

  zurueck(): boolean {
    const e = this.e;
    if (!e) return false;
    const s = this.stapel.pop();
    if (!s) {
      this.abbrechen();
      return false;
    }
    this.e = s.e;
    this.setzen(s.netz);
    return true;
  }

  faden(ende: FadenEnde, gEnde: V2): FadenProben | null {
    const e = this.e;
    if (!e) return null;
    const n = this.holen();
    const A = n.punkte[e.letzter];
    if (!A) return null;
    let ex: number;
    let ey: number;
    if (ende.art === 'schluss') {
      const P = n.punkte[e.erster]!;
      [ex, ey] = [P.x, P.y];
    } else if (ende.art === 'punkt') {
      const P = n.punkte[ende.pi]!;
      [ex, ey] = [P.x, P.y];
    } else if (ende.art === 'linie') {
      [ex, ey] = bezier(kontrollpunkte(n, n.linien[ende.li]!, ende.si), ende.t);
    } else [ex, ey] = [ende.x, ende.y];
    const k = [A.x, A.y, A.x + e.aus[0], A.y + e.aus[1], ex + gEnde[0], ey + gEnde[1], ex, ey];
    return bezierProben(k, 2 * this.masz());
  }
}
