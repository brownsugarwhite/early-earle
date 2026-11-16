/**
 * Werkzeug P für den Anfang einer Form (Probe „Anfang einer Form“, 15.11.2026): ein einziger Loop auf dem leeren Blatt, bedient
 * wie in Illustrator, gezeichnet im flüssigen Look des Linien-Strangs (Konzept „Auswahl und Werkzeug P“, Bilder 1–6).
 *
 * Klick setzt eine Ecke, Ziehen gibt Schwung (beide Griffe gespiegelt), ⌥ beim Ziehen bricht den Griff. Am ersten Punkt öffnet
 * sich ein Ring, Klick schließt (Ziehen schließt rund), ↩ schließt auch. ⌫ nimmt den letzten Punkt zurück, Esc verwirft. Ist der
 * Loop zu, lassen sich Punkte noch ziehen. Vom letzten Punkt zur Feder spannt sich der Faden: die nächste Linie, so wie sie wird,
 * zum Tropfen an der Feder hin angeschwollen. Beim Schließen läuft eine Welle einmal um den Loop.
 *
 * Alles in CSS-Pixeln des Blatts (y nach unten); `kapseln` schreibt Gerätepunkte für die flüssige Anzeige.
 */

import { PRIM_FELDER } from './fluessig';

export type V2 = [number, number];

export interface Anker {
  x: number;
  y: number;
  /** Griffe relativ zum Punkt: ein = zur vorigen Linie, aus = zur nächsten */
  ein: V2;
  aus: V2;
}

/** Werte des Looks (CSS-Pixel), wie im Linien-Strang (Grundwerte vom 14.11.) */
export const LOOK = {
  umriss: 1,
  punktRadius: 1.25,
  tropfen: 2.05,
  griff: 0.3,
  perle: 0.95,
  weich: 1.6,
  zeigerGroesse: 9.5,
  zeigerLinie: 0.5,
  fang: 8,
};

const ZEIGER_WINKEL = [(32 * Math.PI) / 180, (80 * Math.PI) / 180];

function bez(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/** Puffer für Kapseln (wächst) */
export class Kapseln {
  puffer = new Float32Array(PRIM_FELDER * 512);
  n = 0;
  gruppe = 0;
  felder: number[] = [];
  leeren(): void {
    this.n = 0;
    this.gruppe = 0;
    this.felder = [];
  }
  neueGruppe(): number {
    return this.gruppe++;
  }
  /** Kapsel von (x0, y0) nach (x1, y1), Radien r0, r1; schicht 0 Tinte, 1 verdeckt, 2 nach Tiefe; weich: Punkt, Tropfen, Hals */
  push(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, g: number, schicht: number, weich: boolean, z0 = 0, z1 = 0): void {
    if (this.n * PRIM_FELDER + PRIM_FELDER > this.puffer.length) {
      const neu = new Float32Array(this.puffer.length * 2);
      neu.set(this.puffer);
      this.puffer = neu;
    }
    const o = this.n * PRIM_FELDER;
    const P = this.puffer;
    P[o] = x0;
    P[o + 1] = y0;
    P[o + 2] = x1;
    P[o + 3] = y1;
    P[o + 4] = r0;
    P[o + 5] = r1;
    P[o + 6] = g;
    P[o + 7] = schicht + 4 * (weich ? 1 : 0);
    P[o + 8] = z0;
    P[o + 9] = z1;
    P[o + 10] = 0;
    P[o + 11] = 0;
    this.n++;
  }
}

export class Stift {
  anker: Anker[] = [];
  geschlossen = false;
  zeiger = { x: 0, y: 0, da: false };
  alt = false;
  /** Tropfen an der Feder folgt dem Zeiger als Feder */
  private tropfen = { x: 0, y: 0, vx: 0, vy: 0, an: false };
  /** Ring am ersten Punkt (Radius als Feder), Schwellung je Punkt (Feder) */
  private ring = { r: 0, v: 0 };
  private schwell: { r: number; v: number }[] = [];
  /** Zeit seit dem Schließen (s), < 0: keine Welle */
  welle = -1;
  private ziehen: { art: 'neu' | 'schluss' | 'punkt'; i: number; start: V2; ax: number; ay: number; bewegt: boolean } | null = null;
  /** nach jeder Änderung des Loops (für das Netz) */
  stand = 0;

  get leer(): boolean {
    return this.anker.length === 0;
  }
  get zieht(): boolean {
    return this.ziehen !== null;
  }

  private nahAnker(x: number, y: number, r = LOOK.fang): number {
    let best = -1;
    let bd = r;
    this.anker.forEach((a, i) => {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  /** würde ein Klick hier schließen? */
  amErsten(x: number, y: number): boolean {
    return !this.geschlossen && this.anker.length >= 2 && Math.hypot(this.anker[0]!.x - x, this.anker[0]!.y - y) < LOOK.fang;
  }

  /** Drücken; false: nichts getroffen (der Aufrufer darf es nutzen) */
  druecken(x: number, y: number): boolean {
    if (!this.geschlossen) {
      if (this.amErsten(x, y)) {
        const a = this.anker[0]!;
        this.ziehen = { art: 'schluss', i: 0, start: [x, y], ax: a.x, ay: a.y, bewegt: false };
        return true;
      }
      this.anker.push({ x, y, ein: [0, 0], aus: [0, 0] });
      this.schwell.push({ r: LOOK.tropfen, v: 0 });
      this.ziehen = { art: 'neu', i: this.anker.length - 1, start: [x, y], ax: x, ay: y, bewegt: false };
      this.stand++;
      return true;
    }
    const i = this.nahAnker(x, y);
    if (i < 0) return false;
    const a = this.anker[i]!;
    this.ziehen = { art: 'punkt', i, start: [x, y], ax: a.x, ay: a.y, bewegt: false };
    return true;
  }

  bewegen(x: number, y: number): void {
    this.zeiger.x = x;
    this.zeiger.y = y;
    this.zeiger.da = true;
    const z = this.ziehen;
    if (!z) return;
    const dx = x - z.start[0];
    const dy = y - z.start[1];
    if (!z.bewegt && Math.hypot(dx, dy) < 2.5) return;
    z.bewegt = true;
    const a = this.anker[z.i]!;
    if (z.art === 'neu') {
      a.aus = [dx, dy];
      if (!this.alt) a.ein = [-dx, -dy];
    } else if (z.art === 'schluss') {
      // Ziehen am ersten Punkt beim Schließen: die ankommende Linie bekommt Schwung, gespiegelt auch die erste
      a.ein = [-dx, -dy];
      if (!this.alt) a.aus = [dx, dy];
    } else {
      a.x = z.ax + dx;
      a.y = z.ay + dy;
    }
    this.stand++;
  }

  loslassen(): void {
    const z = this.ziehen;
    this.ziehen = null;
    if (!z) return;
    if (z.art === 'schluss') this.schliessen();
  }

  schliessen(): boolean {
    if (this.geschlossen || this.anker.length < 3) {
      // mit zwei Punkten nur, wenn eine Linie Schwung hat (sonst ist es keine Fläche)
      if (this.geschlossen || this.anker.length < 2) return false;
      const a = this.anker;
      const schwung = Math.hypot(...a[0]!.aus) + Math.hypot(...a[0]!.ein) + Math.hypot(...a[1]!.aus) + Math.hypot(...a[1]!.ein);
      if (schwung < 8) return false;
    }
    this.geschlossen = true;
    this.ziehen = null;
    this.welle = 0;
    this.stand++;
    return true;
  }

  /** ⌫: letzten Punkt zurücknehmen; ist der Loop zu, öffnet er sich wieder */
  zurueck(): void {
    if (this.geschlossen) {
      this.geschlossen = false;
      this.welle = -1;
    } else {
      this.anker.pop();
      this.schwell.pop();
    }
    this.ziehen = null;
    this.stand++;
  }

  abbrechen(): void {
    this.anker = [];
    this.schwell = [];
    this.geschlossen = false;
    this.ziehen = null;
    this.welle = -1;
    this.stand++;
  }

  /** Federn weiterrechnen; true: es bewegt sich noch etwas */
  schritt(dt: number): boolean {
    let aktiv = false;
    const fed = (s: { r: number; v: number }, ziel: number, hz: number, zeta: number): void => {
      const w = 2 * Math.PI * hz;
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / n;
      for (let k = 0; k < n; k++) {
        s.v += (w * w * (ziel - s.r) - 2 * zeta * w * s.v) * h;
        s.r += s.v * h;
      }
      if (Math.abs(ziel - s.r) > 1e-3 || Math.abs(s.v) > 1e-3) aktiv = true;
    };
    // Tropfen an der Feder
    const T = this.tropfen;
    if (!T.an) {
      T.x = this.zeiger.x;
      T.y = this.zeiger.y;
      T.an = this.zeiger.da;
    }
    {
      const w = 2 * Math.PI * 14;
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / n;
      for (let k = 0; k < n; k++) {
        T.vx += (w * w * (this.zeiger.x - T.x) - 2 * 0.62 * w * T.vx) * h;
        T.vy += (w * w * (this.zeiger.y - T.y) - 2 * 0.62 * w * T.vy) * h;
        T.x += T.vx * h;
        T.y += T.vy * h;
      }
      if (Math.hypot(this.zeiger.x - T.x, this.zeiger.y - T.y) > 0.02 || Math.hypot(T.vx, T.vy) > 0.05) aktiv = true;
    }
    // Ring am ersten Punkt
    const ringZiel = this.zeiger.da && this.amErsten(this.zeiger.x, this.zeiger.y) && !this.ziehen ? 4.6 : this.ziehen?.art === 'schluss' ? 4.6 : 0;
    fed(this.ring, ringZiel, 9, 0.55);
    // Schwellung: der Punkt unter dem Zeiger wird zum Tropfen (nur wenn man ihn greifen kann)
    const greifbar = this.geschlossen && !this.ziehen ? this.nahAnker(this.zeiger.x, this.zeiger.y) : -1;
    this.anker.forEach((_, i) => {
      const s = this.schwell[i] ?? (this.schwell[i] = { r: LOOK.punktRadius, v: 0 });
      const gezogen = this.ziehen && this.ziehen.i === i;
      const ziel = i === greifbar || gezogen ? LOOK.tropfen : LOOK.punktRadius;
      fed(s, ziel, 8, 0.5);
    });
    if (this.welle >= 0) {
      this.welle += dt;
      if (this.welle > 1.2) this.welle = -1;
      else aktiv = true;
    }
    return aktiv;
  }

  /** dicht abgetastet (CSS-Pixel): Punkte und Index der Anker; offen ohne Schlusslinie */
  abtasten(schritt = 1.5): { x: number[]; y: number[]; anker: number[]; s: number[] } {
    const x: number[] = [];
    const y: number[] = [];
    const s: number[] = [];
    const anker: number[] = [];
    const A = this.anker;
    const m = this.geschlossen ? A.length : A.length - 1;
    let lauf = 0;
    for (let i = 0; i < Math.max(0, m); i++) {
      const a = A[i]!;
      const b = A[(i + 1) % A.length]!;
      const p0: V2 = [a.x, a.y];
      const p1: V2 = [a.x + a.aus[0], a.y + a.aus[1]];
      const p2: V2 = [b.x + b.ein[0], b.y + b.ein[1]];
      const p3: V2 = [b.x, b.y];
      const grob = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
      const k = Math.max(2, Math.ceil(grob / schritt));
      anker.push(x.length);
      for (let j = 0; j < k; j++) {
        const t = j / k;
        const px = bez(p0[0], p1[0], p2[0], p3[0], t);
        const py = bez(p0[1], p1[1], p2[1], p3[1], t);
        if (x.length) lauf += Math.hypot(px - x[x.length - 1]!, py - y[y.length - 1]!);
        x.push(px);
        y.push(py);
        s.push(lauf);
      }
    }
    if (!this.geschlossen && A.length) {
      const l = A[A.length - 1]!;
      anker.push(x.length);
      if (x.length) lauf += Math.hypot(l.x - x[x.length - 1]!, l.y - y[y.length - 1]!);
      x.push(l.x);
      y.push(l.y);
      s.push(lauf);
    } else if (this.geschlossen && x.length) {
      lauf += Math.hypot(x[0]! - x[x.length - 1]!, y[0]! - y[y.length - 1]!);
      s.push(lauf);
    }
    return { x, y, anker, s };
  }

  /**
   * Kapseln im Blatt (2D): Loop, Punkte, Faden, Tropfen an der Feder, Griffe beim Ziehen, Ring am ersten Punkt, Welle.
   * `D`: Gerätepunkte je CSS-Pixel. `feder`: der Tropfen an der Feder ist zu sehen.
   */
  kapseln(K: Kapseln, D: number, feder: boolean): void {
    const R = (v: number): number => v * D;
    const A = this.anker;
    const ab = this.abtasten(1.5);
    const gL = K.neueGruppe();
    const L = ab.s[ab.s.length - 1] ?? 0;
    const welle = this.welle >= 0 ? this.welle / 0.9 : -1;
    const dicke = (s: number): number => {
      let r = LOOK.umriss / 2;
      if (welle >= 0 && welle <= 1 && L > 0) {
        const mitte = welle * L;
        let d = Math.abs(s - mitte);
        d = Math.min(d, L - d);
        const g = Math.exp(-(d * d) / (2 * 26 * 26));
        r += 1.15 * g * Math.sin(Math.PI * welle) ** 0.6;
      }
      return r;
    };
    const n = ab.x.length;
    const segs = this.geschlossen ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % n;
      K.push(R(ab.x[i]!), R(ab.y[i]!), R(ab.x[j]!), R(ab.y[j]!), R(dicke(ab.s[i]!)), R(dicke(ab.s[i + 1] ?? L)), gL, 0, false);
    }
    // Faden: vom letzten Punkt zur Feder, so wie die nächste Linie wird
    const z = this.zeiger;
    const T = this.tropfen;
    const zeichnet = !this.geschlossen && A.length > 0 && feder && z.da;
    const ziehtNeu = this.ziehen?.art === 'neu' && this.ziehen.bewegt;
    if (zeichnet && !ziehtNeu) {
      const a = A[A.length - 1]!;
      const schluss = this.amErsten(z.x, z.y);
      const e = schluss ? A[0]! : null;
      const p0: V2 = [a.x, a.y];
      const p1: V2 = [a.x + a.aus[0], a.y + a.aus[1]];
      const p3: V2 = e ? [e.x, e.y] : [T.x, T.y];
      const p2: V2 = e ? [e.x + e.ein[0], e.y + e.ein[1]] : p3;
      const grob = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
      const k = Math.max(2, Math.ceil(grob / 2));
      const gF = K.neueGruppe();
      const gH = K.neueGruppe();
      for (let j = 0; j < k; j++) {
        const t0 = j / k;
        const t1 = (j + 1) / k;
        // zum Tropfen hin angeschwollen: Haarlinie bis 75 %, dann Hals
        const r = (t: number): number => (e ? LOOK.umriss / 2 : LOOK.umriss / 2 + 0.55 * Math.max(0, (t - 0.72) / 0.28) ** 1.6);
        const hals = !e && t0 >= 0.72;
        K.push(
          R(bez(p0[0], p1[0], p2[0], p3[0], t0)),
          R(bez(p0[1], p1[1], p2[1], p3[1], t0)),
          R(bez(p0[0], p1[0], p2[0], p3[0], t1)),
          R(bez(p0[1], p1[1], p2[1], p3[1], t1)),
          R(r(t0)),
          R(r(t1)),
          hals ? gH : gF,
          0,
          hals,
        );
      }
    }
    // Griffe beim Ziehen (Haarlinien mit Perlen)
    const zg = this.ziehen;
    if (zg && zg.bewegt && (zg.art === 'neu' || zg.art === 'schluss')) {
      const a = A[zg.i]!;
      for (const g of [a.ein, a.aus]) {
        if (Math.hypot(g[0], g[1]) < 1) continue;
        K.push(R(a.x), R(a.y), R(a.x + g[0]), R(a.y + g[1]), R(LOOK.griff), R(LOOK.griff), K.neueGruppe(), 0, false);
        const gp = K.neueGruppe();
        K.push(R(a.x + g[0]), R(a.y + g[1]), R(a.x + g[0]), R(a.y + g[1]), R(LOOK.perle), R(LOOK.perle), gp, 0, true);
      }
    }
    // Punkte
    A.forEach((a, i) => {
      const r = this.schwell[i]?.r ?? LOOK.punktRadius;
      const groesser = zg && zg.i === i && zg.art === 'neu' ? Math.max(r, 1.7) : r;
      K.push(R(a.x), R(a.y), R(a.x), R(a.y), R(groesser), R(groesser), K.neueGruppe(), 0, true);
    });
    // Ring am ersten Punkt
    if (A.length && this.ring.r > 0.3) {
      const a = A[0]!;
      const gR = K.neueGruppe();
      const m = 28;
      const rr = Math.max(0, this.ring.r);
      for (let k = 0; k < m; k++) {
        const w0 = (k / m) * 2 * Math.PI;
        const w1 = ((k + 1) / m) * 2 * Math.PI;
        K.push(R(a.x + rr * Math.cos(w0)), R(a.y + rr * Math.sin(w0)), R(a.x + rr * Math.cos(w1)), R(a.y + rr * Math.sin(w1)), R(0.32), R(0.32), gR, 0, false);
      }
    }
    // Tropfen an der Feder (hängt an der Spitze des Zeigers, etwas oben links), mit Hals zur Spitze, wenn er nachzieht
    if (feder && z.da && !this.geschlossen) {
      const r = LOOK.tropfen;
      const tx = T.x - r * 0.55;
      const ty = T.y - r * 0.55;
      const gT = K.neueGruppe();
      K.push(R(tx), R(ty), R(tx), R(ty), R(r), R(r), gT, 0, true);
      const weg = Math.hypot(z.x - T.x, z.y - T.y);
      if (weg > 0.4) K.push(R(tx), R(ty), R(z.x - r * 0.25), R(z.y - r * 0.25), R(r * 0.7), R(0.45), gT, 0, true);
      K.felder.push(R(tx), R(ty), R(18), 1);
    }
    if (z.da) K.felder.push(R(z.x), R(z.y), R(22), 0.7);
  }

  /** Zeiger (Dreieck, Spitze oben links) in Gerätepunkten */
  static zeigerForm(x: number, y: number, D: number): { ax: number; ay: number; bx: number; by: number; cx: number; cy: number; linie: number } {
    const L = LOOK.zeigerGroesse * D;
    const ax = x * D;
    const ay = y * D;
    return {
      ax,
      ay,
      bx: ax + L * Math.cos(ZEIGER_WINKEL[0]!),
      by: ay + L * Math.sin(ZEIGER_WINKEL[0]!),
      cx: ax + L * Math.cos(ZEIGER_WINKEL[1]!),
      cy: ay + L * Math.sin(ZEIGER_WINKEL[1]!),
      linie: LOOK.zeigerLinie * D,
    };
  }
}
