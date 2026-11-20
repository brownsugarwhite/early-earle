/**
 * Eine Linie (20.11.2026, Florians Vorlage `docs/look/ozzy/shader/2026-11-20-florian-vorlage-eine-linie.webp`): eine einzige
 * geschlossene Linie, die im Bild wächst, sich faltet und sich nie berührt. Ihr Abstand zu sich selbst folgt der Helligkeit der Form:
 * dunkel dicht, hell weit; außerhalb der Form bleibt sie nicht.
 *
 * Die Linie ist ein wachsender, elastischer Faden (nach Differential Growth, Inconvergent und Jason Webb, hier mit Steuerung):
 * - Jedes Stück hat eine Ruhelänge (ein halber Abstand an seiner Stelle); Federn halten es dort, ein Biegen glättet.
 * - Stränge, die auf der Linie nicht benachbart sind, stoßen sich ab, solange sie näher sind als der Abstand an ihrer Stelle.
 * - Gewachsen wird nur, wo Platz ist: Wo um einen Punkt weniger Stränge liegen, als der Abstand verlangt, kommt ein Punkt dazu
 *   (die Linie wird länger, staucht sich und faltet sich in den freien Raum). Wo es zu dicht ist, fällt ein Punkt weg (die Linie
 *   spannt sich und zieht ihre Schlaufen zurück). So folgt sie dem Licht in beide Richtungen.
 * - Außerhalb der Form zieht ein Abstandsfeld sie hinein.
 * Ohne DOM: läuft im Worker und im Labor (`scripts/ozzy/linie-labor.ts`). Koordinaten: CSS-Bildpunkte, y nach oben (wie die Karte).
 */

export type LinienWerte = {
  /** Abstand im Dunkeln und im Hellen (Bildpunkte) */
  dMin: number;
  dMax: number;
  /** Kontrast (Exponent auf die Helligkeit) */
  gamma: number;
  /** wie stark der Abstand mit der Zeit atmet (0 … 1) */
  atmen: number;
  /** Schritte je Karte */
  schritte: number;
  /** höchstens so viele Punkte (sonst wird der Abstand überall größer) */
  punkte: number;
};

export const LINIE_GRUND: LinienWerte = { dMin: 2.7, dMax: 13, gamma: 1.1, atmen: 0.6, schritte: 3, punkte: 22000 };

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** glattes Wertrauschen (2D, 0 … 1) */
function rauschen(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Punkte auf der Linie, die sich nicht abstoßen (Nachbarn längs der Linie) */
const KETTE = 3;
/** Ruhelänge eines Stücks im Verhältnis zum Abstand */
const RUHE = 0.55;
/** so viele andere Punkte liegen um einen Punkt (im Umkreis 1,6 Abstände), wenn die Fläche genau gefüllt ist */
const VOLL = 9;
/** wie stark die Linie zur Mitte ihrer Nachbarn gezogen wird (glatte, fließende Kurven statt Zacken) */
const BIEGEN = Number((globalThis as { process?: { env?: Record<string, string> } }).process?.env?.LINIE_BIEGEN ?? 0.5);
const QUER = Number((globalThis as { process?: { env?: Record<string, string> } }).process?.env?.LINIE_QUER ?? 0.08);
const WACHSEN = Number((globalThis as { process?: { env?: Record<string, string> } }).process?.env?.LINIE_WACHSEN ?? 0.9);

export class LinienSim {
  readonly cap: number;
  n = 0;
  x: Float32Array;
  y: Float32Array;
  private nx: Float32Array;
  private ny: Float32Array;
  private d: Float32Array;
  private fuelle: Float32Array;
  /** wie weit ein Punkt außerhalb der Form liegt (Kartenpunkte; ≤ 0: drin) */
  private draussen: Float32Array;
  // Karte
  kb = 0;
  kh = 0;
  skala = 3;
  private hell = new Float32Array(0);
  private maske = new Float32Array(0);
  private sd = new Float32Array(0);
  mitteX = 0;
  mitteY = 0;
  flaeche = 0;
  zeit = 0;
  w: LinienWerte = { ...LINIE_GRUND };
  /** wächst, wenn die Linie mehr Punkte bräuchte, als sie haben darf */
  massstab = 1;
  // Raster
  private zelle = 4;
  private gx0 = 0;
  private gy0 = 0;
  private gb = 1;
  private gh = 1;
  private start = new Int32Array(1);
  private sortiert = new Int32Array(0);
  private zellen = new Int32Array(0);
  private zaehler = new Int32Array(0);
  private zufall = 12345;

  constructor(cap = 40000) {
    this.cap = cap;
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.nx = new Float32Array(cap);
    this.ny = new Float32Array(cap);
    this.d = new Float32Array(cap);
    this.fuelle = new Float32Array(cap);
    this.draussen = new Float32Array(cap);
    this.sortiert = new Int32Array(cap);
    this.zellen = new Int32Array(cap);
  }

  private rnd(): number {
    this.zufall = (Math.imul(this.zufall, 1664525) + 1013904223) | 0;
    return (this.zufall >>> 0) / 4294967296;
  }

  /** die Kamera der Karte davor: Tiefe je Kartenpunkt (Welt, Abstand vor der Kamera), Rückprojektion, Sicht */
  private vorher: { tiefe: Float32Array; maske: Float32Array; vpInv: Float32Array; sicht: Float32Array; kb: number; kh: number; skala: number } | null = null;

  /**
   * Eine neue Karte (RGBA, Zeilen von unten): R = Helligkeit, G = Deckung der Form, B und A = Tiefe (16 Bit zwischen `nah` und
   * `fern`). Mit der Kamera (`vp`: Projektion mal Sicht, `vpInv`, `sicht`) wird die Linie aus der Karte davor genau mitgenommen: Jeder
   * Punkt auf der Form wird in den Raum zurückgerechnet und mit der neuen Kamera abgebildet (sie klebt an der Form, auch bei großen
   * Sprüngen). Ohne Kamera: keine Mitnahme.
   */
  karteSetzen(daten: Uint8Array, kb: number, kh: number, skala: number, zeit: number, kamera?: { vp: Float32Array; vpInv: Float32Array; sicht: Float32Array; nah: number; fern: number }): void {
    const gleich = kb === this.kb && kh === this.kh && Math.abs(skala - this.skala) < 1e-6;
    this.kb = kb;
    this.kh = kh;
    this.skala = skala;
    this.zeit = zeit;
    const N = kb * kh;
    if (this.hell.length !== N) {
      this.hell = new Float32Array(N);
      this.maske = new Float32Array(N);
      this.sd = new Float32Array(N);
    }
    let sx = 0, sy = 0, sa = 0;
    for (let i = 0; i < N; i++) {
      this.hell[i] = daten[4 * i]! / 255;
      const m = daten[4 * i + 1]! / 255;
      this.maske[i] = m;
      if (m > 0.5) {
        sx += i % kb;
        sy += Math.floor(i / kb);
        sa++;
      }
    }
    this.flaeche = sa * skala * skala;
    if (sa > 0) {
      this.mitteX = (sx / sa + 0.5) * skala;
      this.mitteY = (sy / sa + 0.5) * skala;
    }
    this.abstandsfeld();
    if (kamera) {
      if (this.vorher && gleich) this.mitnehmen(kamera.vp);
      const tiefe = new Float32Array(N);
      for (let i = 0; i < N; i++) tiefe[i] = kamera.nah + ((daten[4 * i + 2]! * 256 + daten[4 * i + 3]!) / 65535) * (kamera.fern - kamera.nah);
      this.vorher = { tiefe, maske: this.maske.slice(), vpInv: kamera.vpInv, sicht: kamera.sicht, kb, kh, skala };
    }
    if (this.n < 3 && sa > 0) this.saeen();
  }

  /** eine Karte aus Feldern (Labor): Helligkeit und Deckung je Kartenpunkt */
  felderSetzen(hell: Float32Array, maske: Float32Array, kb: number, kh: number, skala: number, zeit: number): void {
    const d = new Uint8Array(kb * kh * 4);
    for (let i = 0; i < kb * kh; i++) {
      d[4 * i] = Math.round(hell[i]! * 255);
      d[4 * i + 1] = Math.round(maske[i]! * 255);
      d[4 * i + 2] = 128;
      d[4 * i + 3] = 128;
    }
    this.karteSetzen(d, kb, kh, skala, zeit);
  }

  /** jeden Punkt auf der Form aus der Kamera davor in den Raum und mit der neuen Kamera ins Bild */
  private mitnehmen(vp: Float32Array): void {
    const v = this.vorher!;
    const B = v.kb * v.skala, H = v.kh * v.skala;
    const P = v.vpInv, S = v.sicht;
    const ab = (nx: number, ny: number, nz: number): [number, number, number] => {
      const x = P[0]! * nx + P[4]! * ny + P[8]! * nz + P[12]!;
      const y = P[1]! * nx + P[5]! * ny + P[9]! * nz + P[13]!;
      const z = P[2]! * nx + P[6]! * ny + P[10]! * nz + P[14]!;
      const w = P[3]! * nx + P[7]! * ny + P[11]! * nz + P[15]!;
      return [x / w, y / w, z / w];
    };
    const tiefeVon = (p: [number, number, number]): number => -(S[2]! * p[0] + S[6]! * p[1] + S[10]! * p[2] + S[14]!);
    for (let i = 0; i < this.n; i++) {
      const x = this.x[i]!, y = this.y[i]!;
      const ki = Math.floor(x / v.skala), kj = Math.floor(y / v.skala);
      if (ki < 0 || kj < 0 || ki >= v.kb || kj >= v.kh) continue;
      const k = kj * v.kb + ki;
      if (v.maske[k]! < 0.5) continue;
      const nx = (x / B) * 2 - 1, ny = (y / H) * 2 - 1;
      const a = ab(nx, ny, -1), b = ab(nx, ny, 1);
      const da = tiefeVon(a), db = tiefeVon(b);
      if (Math.abs(db - da) < 1e-9) continue;
      const t = (v.tiefe[k]! - da) / (db - da);
      const px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t, pz = a[2] + (b[2] - a[2]) * t;
      const cx = vp[0]! * px + vp[4]! * py + vp[8]! * pz + vp[12]!;
      const cy = vp[1]! * px + vp[5]! * py + vp[9]! * pz + vp[13]!;
      const cw = vp[3]! * px + vp[7]! * py + vp[11]! * pz + vp[15]!;
      if (cw <= 1e-9) continue;
      this.x[i] = ((cx / cw + 1) / 2) * this.kb * this.skala;
      this.y[i] = ((cy / cw + 1) / 2) * this.kh * this.skala;
    }
  }

  private index(x: number, y: number): number {
    const i = Math.floor(x / this.skala), j = Math.floor(y / this.skala);
    if (i < 0 || j < 0 || i >= this.kb || j >= this.kh) return -1;
    return j * this.kb + i;
  }

  private lesen(f: Float32Array, x: number, y: number, aussen: number): number {
    const u = x / this.skala - 0.5, v = y / this.skala - 0.5;
    const i = Math.floor(u), j = Math.floor(v);
    if (i < 0 || j < 0 || i >= this.kb - 1 || j >= this.kh - 1) return aussen;
    const fu = u - i, fv = v - j;
    const k = j * this.kb + i;
    const a = f[k]!, b = f[k + 1]!, c = f[k + this.kb]!, e = f[k + this.kb + 1]!;
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + e) * fu * fv;
  }

  /** vorzeichenbehafteter Abstand zum Rand der Form in Kartenpunkten (außen positiv) */
  private abstandsfeld(): void {
    const { kb, kh } = this;
    const N = kb * kh;
    const innen = new Float32Array(N);
    const aussen = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const drin = this.maske[i]! > 0.5;
      innen[i] = drin ? 1e6 : 0;
      aussen[i] = drin ? 0 : 1e6;
    }
    for (const f of [innen, aussen]) {
      for (let j = 0; j < kh; j++)
        for (let i = 0; i < kb; i++) {
          const k = j * kb + i;
          let v = f[k]!;
          if (v === 0) continue;
          if (i > 0) v = Math.min(v, f[k - 1]! + 1);
          if (j > 0) {
            v = Math.min(v, f[k - kb]! + 1);
            if (i > 0) v = Math.min(v, f[k - kb - 1]! + 1.4142);
            if (i < kb - 1) v = Math.min(v, f[k - kb + 1]! + 1.4142);
          }
          f[k] = v;
        }
      for (let j = kh - 1; j >= 0; j--)
        for (let i = kb - 1; i >= 0; i--) {
          const k = j * kb + i;
          let v = f[k]!;
          if (v === 0) continue;
          if (i < kb - 1) v = Math.min(v, f[k + 1]! + 1);
          if (j < kh - 1) {
            v = Math.min(v, f[k + kb]! + 1);
            if (i < kb - 1) v = Math.min(v, f[k + kb + 1]! + 1.4142);
            if (i > 0) v = Math.min(v, f[k + kb - 1]! + 1.4142);
          }
          f[k] = v;
        }
    }
    for (let i = 0; i < N; i++) this.sd[i] = aussen[i]! - innen[i]!;
  }

  /** ein kleiner Kreis an der dunkelsten Stelle nahe der Mitte der Form */
  saeen(): void {
    const d = this.abstandBei(this.mitteX, this.mitteY);
    const r = 1.5 * d;
    const m = Math.max(8, Math.round((2 * Math.PI * r) / (RUHE * d)));
    this.n = m;
    for (let i = 0; i < m; i++) {
      const a = (i / m) * Math.PI * 2;
      this.x[i] = this.mitteX + r * Math.cos(a);
      this.y[i] = this.mitteY + r * Math.sin(a);
    }
  }

  /** der gewünschte Abstand an einer Stelle */
  abstandBei(x: number, y: number): number {
    const w = this.w;
    const L = Math.min(1, Math.max(0, this.lesen(this.hell, x, y, 1)));
    let d = w.dMin + (w.dMax - w.dMin) * Math.pow(L, w.gamma);
    if (w.atmen > 0) {
      const t = this.zeit;
      const a = rauschen(x * 0.008 + t * 0.07, y * 0.008 - t * 0.05) - 0.5;
      const b = rauschen(x * 0.021 - t * 0.12 + 40, y * 0.021 + t * 0.08) - 0.5;
      d *= 1 + w.atmen * (0.9 * a + 0.5 * b);
    }
    return Math.max(w.dMin * 0.7, d * this.massstab);
  }

  private rasterBauen(): void {
    const n = this.n;
    let dKlein = Infinity;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      const di = this.d[i]!;
      if (di < dKlein) dKlein = di;
      const x = this.x[i]!, y = this.y[i]!;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    this.zelle = Math.max(1.5, 1.7 * dKlein);
    this.gx0 = x0;
    this.gy0 = y0;
    this.gb = Math.max(1, Math.floor((x1 - x0) / this.zelle) + 1);
    this.gh = Math.max(1, Math.floor((y1 - y0) / this.zelle) + 1);
    // sehr große Raster (eine entlaufene Linie) begrenzen
    if (this.gb * this.gh > 4e6) {
      this.zelle *= Math.sqrt((this.gb * this.gh) / 4e6);
      this.gb = Math.max(1, Math.floor((x1 - x0) / this.zelle) + 1);
      this.gh = Math.max(1, Math.floor((y1 - y0) / this.zelle) + 1);
    }
    const G = this.gb * this.gh;
    if (this.start.length < G + 1) this.start = new Int32Array(G + 1);
    if (this.zaehler.length < G) this.zaehler = new Int32Array(G);
    this.zaehler.fill(0, 0, G);
    for (let i = 0; i < n; i++) {
      const c = Math.floor((this.y[i]! - y0) / this.zelle) * this.gb + Math.floor((this.x[i]! - x0) / this.zelle);
      this.zellen[i] = c;
      this.zaehler[c]!++;
    }
    let s = 0;
    for (let c = 0; c < G; c++) {
      const z = this.zaehler[c]!;
      this.start[c] = s;
      s += z;
      this.zaehler[c] = 0;
    }
    this.start[G] = s;
    for (let i = 0; i < n; i++) {
      const c = this.zellen[i]!;
      this.sortiert[this.start[c]! + this.zaehler[c]!++] = i;
    }
  }

  /** ein Schritt */
  schritt(): void {
    const n = this.n;
    if (n < 3) return;
    const X = this.x, Y = this.y, D = this.d;
    for (let i = 0; i < n; i++) D[i] = this.abstandBei(X[i]!, Y[i]!);
    this.rasterBauen();
    const halbN = n >> 1;
    for (let i = 0; i < n; i++) {
      const xi = X[i]!, yi = Y[i]!, di = D[i]!;
      const vor = i === 0 ? n - 1 : i - 1;
      const nach = i === n - 1 ? 0 : i + 1;
      // Nachbarn im Umkreis: abstoßen und zählen
      const umkreis = 1.6 * di;
      const reichweite = Math.ceil(umkreis / this.zelle);
      const ci = Math.floor((xi - this.gx0) / this.zelle), cj = Math.floor((yi - this.gy0) / this.zelle);
      let fx = 0, fy = 0, zahl = 0;
      const u2 = umkreis * umkreis;
      const ax = xi, ay = yi, bx = X[nach]!, by = Y[nach]!;
      for (let b = Math.max(0, cj - reichweite); b <= Math.min(this.gh - 1, cj + reichweite); b++) {
        for (let a = Math.max(0, ci - reichweite); a <= Math.min(this.gb - 1, ci + reichweite); a++) {
          const c = b * this.gb + a;
          for (let s = this.start[c]!, e = this.start[c + 1]!; s < e; s++) {
            const j = this.sortiert[s]!;
            let k = j - i;
            if (k < 0) k = -k;
            if (k > halbN) k = n - k;
            if (k <= KETTE) continue;
            const dx = xi - X[j]!, dy = yi - Y[j]!;
            const q = dx * dx + dy * dy;
            if (q >= u2) continue;
            zahl++;
            // kreuzt das Stück i → i+1 das Stück j → j+1? (nur einmal je Paar: i < j)
            if (j > i && this.kreuzungen.length < 64) {
              const j2 = j === n - 1 ? 0 : j + 1;
              if (j2 !== i && this.schneiden(ax, ay, bx, by, X[j]!, Y[j]!, X[j2]!, Y[j2]!)) this.kreuzungen.push(i, j);
            }
            const R = 0.5 * (di + D[j]!);
            if (q >= R * R || q < 1e-10) continue;
            const dist = Math.sqrt(q);
            const w = 1 - dist / R;
            const st = w * (1 + 3 * w);
            fx += (dx / dist) * st;
            fy += (dy / dist) * st;
          }
        }
      }
      this.fuelle[i] = zahl / VOLL;
      // Federn zu den Nachbarn (Ruhelänge) und Biegen (zur Mitte)
      const ruhe = RUHE * di;
      let sx = 0, sy = 0;
      for (const j of [vor, nach]) {
        const ex = X[j]! - xi, ey = Y[j]! - yi;
        const l = Math.sqrt(ex * ex + ey * ey) || 1e-6;
        const f = (l - ruhe) / l;
        sx += ex * f;
        sy += ey * f;
      }
      const mx = 0.5 * (X[vor]! + X[nach]!) - xi, my = 0.5 * (Y[vor]! + Y[nach]!) - yi;
      let vx = 0.25 * sx + BIEGEN * mx + 0.28 * di * fx;
      let vy = 0.25 * sy + BIEGEN * my + 0.28 * di * fy;
      // der Rand der Form zieht hinein
      const sdv = this.lesen(this.sd, xi, yi, 40);
      this.draussen[i] = sdv;
      const randAb = -0.3 * di / this.skala;
      if (sdv > randAb) {
        const e = this.skala;
        const gx = this.lesen(this.sd, xi + e, yi, 40) - this.lesen(this.sd, xi - e, yi, 40);
        const gy = this.lesen(this.sd, xi, yi + e, 40) - this.lesen(this.sd, xi, yi - e, 40);
        const gl = Math.hypot(gx, gy);
        const zug = Math.min(0.4 * di, (sdv - randAb) * this.skala * 0.15);
        if (gl > 1e-6) {
          vx -= (gx / gl) * zug;
          vy -= (gy / gl) * zug;
        } else {
          const ox = this.mitteX - xi, oy = this.mitteY - yi;
          const ol = Math.hypot(ox, oy) || 1;
          vx += (ox / ol) * zug;
          vy += (oy / ol) * zug;
        }
        // am Rand gilt die Fläche als voll (dort nicht wachsen)
        this.fuelle[i] = Math.max(this.fuelle[i]!, 1);
      }
      const vl = Math.hypot(vx, vy);
      const vmax = 0.18 * di;
      if (vl > vmax) {
        vx *= vmax / vl;
        vy *= vmax / vl;
      }
      this.nx[i] = xi + vx;
      this.ny[i] = yi + vy;
    }
    this.entwirren();
    this.umbauen();
  }

  private kreuzungen: number[] = [];
  private schneiden(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
    const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
    const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
    return d1 * d2 < 0 && d3 * d4 < 0;
  }
  /** Kreuzungen lösen: das Stück zwischen ihnen umdrehen (2-opt); die Linie bleibt eine einzige */
  private entwirren(): void {
    const K = this.kreuzungen;
    const X = this.nx, Y = this.ny, n = this.n;
    for (let k = 0; k < K.length; k += 2) {
      const i = K[k]!, j = K[k + 1]!;
      const i2 = i + 1, j2 = j === n - 1 ? 0 : j + 1;
      if (j2 === 0 || i2 > j) continue;
      if (!this.schneiden(X[i]!, Y[i]!, X[i2]!, Y[i2]!, X[j]!, Y[j]!, X[j2]!, Y[j2]!)) continue;
      for (let a = i2, b = j; a < b; a++, b--) {
        const tx = X[a]!, ty = Y[a]!;
        X[a] = X[b]!;
        Y[a] = Y[b]!;
        X[b] = tx;
        Y[b] = ty;
      }
      this.entwirrt++;
    }
    K.length = 0;
  }
  /** Zahl der gelösten Kreuzungen (für Proben) */
  entwirrt = 0;

  /** wachsen, wo Platz ist; schrumpfen, wo es zu dicht ist; zu lange Stücke teilen, zu kurze zusammenlegen */
  private umbauen(): void {
    const n = this.n;
    const TX = this.nx, TY = this.ny, D = this.d, F = this.fuelle;
    const zx = this.puffer(0), zy = this.puffer(1);
    const grenze = Math.min(this.cap - 4, this.w.punkte);
    let m = 0;
    for (let i = 0; i < n; i++) {
      const nach = i === n - 1 ? 0 : i + 1;
      const xi = TX[i]!, yi = TY[i]!;
      const di = D[i]!;
      const f = F[i]!;
      // schrumpfen: dieser Punkt fällt weg
      const zuKurz = Math.hypot(TX[nach]! - xi, TY[nach]! - yi) < 0.3 * RUHE * di;
      // außerhalb der Form verliert die Linie Punkte: Sie zieht sich zurück (Stränge, die nach einem Drehen draußen hängen)
      const aussen = this.draussen[i]! > 0.5;
      if ((f > 1.35 && this.rnd() < 0.08 * (f - 1.35)) || (zuKurz && i !== 0) || (aussen && i !== 0 && this.rnd() < 0.2)) continue;
      zx[m] = xi;
      zy[m] = yi;
      m++;
      const lx = TX[nach]! - xi, ly = TY[nach]! - yi;
      const l = Math.hypot(lx, ly);
      const wachsen = f < 0.8 && this.rnd() < WACHSEN * (0.8 - f) / 0.8;
      if ((l > 1.6 * RUHE * di || (wachsen && !aussen)) && m + (n - i) < grenze) {
        // ein neuer Punkt in der Mitte, etwas zur Seite (das Falten beginnt)
        const quer = wachsen ? (this.rnd() - 0.5) * QUER * di : 0;
        const ln = l || 1;
        zx[m] = xi + lx * 0.5 - (ly / ln) * quer;
        zy[m] = yi + ly * 0.5 + (lx / ln) * quer;
        m++;
      }
    }
    if (m >= 3) {
      this.x.set(zx.subarray(0, m));
      this.y.set(zy.subarray(0, m));
      this.n = m;
    }
    // braucht die Form mehr Punkte, als die Linie haben darf: Abstand überall größer
    if (m >= grenze * 0.97) this.massstab = Math.min(4, this.massstab * 1.004);
    else if (m < grenze * 0.8) this.massstab = Math.max(1, this.massstab * 0.999);
  }
  private zw: Float32Array[] = [];
  private puffer(i: number): Float32Array {
    if (!this.zw[i]) this.zw[i] = new Float32Array(this.cap);
    return this.zw[i]!;
  }
}
