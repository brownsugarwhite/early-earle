// Ozzy als 2,5D-Puppe: Kopfteile morphen über den Blickwinkel θ, Rumpf und Schwanz über die Richtung ψ, die Gipsbeine sind
// echte Kästen (Breite aus Länge und Tiefe, Fenster auf der sichtbaren Seite). Die Teile hängen an 3D-Ankern (Hüften, Hals,
// Schwanzwurzel), werden gedreht, projiziert (senkrecht von vorn) und nach Tiefe gezeichnet.
import { koerperFormen, kopfFormen } from './daten/formen';
import { type Form, formenAnlegen } from './form';
import type { Pose } from './pose';

export const BODEN_Y = 1573;
const RAD = Math.PI / 180;

export interface Zeichenteil {
  name: string;
  farbe: 'schwarz' | 'weiss';
  p: Float32Array; // x, y in Weltkoordinaten
  n: number;
  /** Ecken (Knick im Pfad); null = glatt überall; 'alle' = Vieleck */
  /** Eckstärke je Punkt (0 glatt … 1 Knick); null = überall glatt; 'alle' = Vieleck */
  ecken: Float32Array | null | 'alle';
  tiefe: number;
}

// ---- Maße (aus dem Logo und Florians Ansichten) ------------------------------------------------------------------------
/** Körperanker im Logo */
export const ANKER = { x: 800, y: 1180 };
/** Kopfanker relativ zum Körperanker, im Körper (X vorn, Y unten, Z zur fernen Seite) */
const KOPF = { X: 350, Y: -480, Z: 0 };
/** Halsgelenk relativ zum Kopfanker (Drehpunkt für Nicken und Neigen) */
const HALS = { x: 0, y: 230 };
const SCHWANZ = { X: -400, Y: -230, Z: 0, ankerLogo: [400, 950] as const };

interface Bein {
  name: 'VN' | 'VF' | 'HN' | 'HF';
  X: number;
  Z: number;
}
/**
 * Vier Gipsbeine, jedes gleich breit (326) mit dem Fenster in der Mitte der sichtbaren Seite. Florian (16.11.): Der dunkle
 * „Schatten“ neben jedem Bein ist das ferne Bein, es gibt kein zweites. Die Fußpunkte sind so gewählt, dass die einfache
 * Projektion beide Zeichnungen trifft: im Profil steht das ferne Bein 110 weiter vorn, in der Front das hintere 60 weiter außen.
 * Nah = rechte Seite des Hundes (zum Betrachter, wenn er nach rechts schaut). X vorn, Z zur linken Seite des Hundes.
 */
export const BEINE: Bein[] = [
  { name: 'HF', X: -213.5, Z: 264.5 },
  { name: 'VF', X: 327, Z: 207.5 },
  { name: 'HN', X: -323.5, Z: -265.5 },
  { name: 'VN', X: 214, Z: -202.5 },
];
export const KASTEN = { B: 326, H: 393, r: 59, oben: -60, fensterB: 190, fensterOben: 28, fensterUnten: 325 };

/** Stützen des Rumpfs (für Sitzen, Kippen, Hinfallen): Körperlage X, Y */
const STUETZEN = [
  { X: -470, Y: 205 },
  { X: -380, Y: 230 },
  { X: 470, Y: 150 },
];

// ---- Formen ---------------------------------------------------------------------------------------------------------------

/** Rückseite: was Florians Zeichnungen nicht haben (90° → 180°). Das Gesicht dreht nach rechts weg und wird zum rechten Rand
 *  hin schmal (der schwarze Kopf bleibt dahinter stehen: das ist der Hinterkopf); hinten ist der Kopf eine schwarze Kuppel.
 *  Ohren und Schopf laufen auf einer Kreisbahn und zeigen von hinten ihren gespiegelten Umriss. */
function rueckseiten(name: string, eigen: Record<number, Float32Array>, alle: Map<string, Record<number, Float32Array>>, form: Form): void {
  void alle;
  const zusammen = (p: Float32Array, cx: number, cy: number, sx: number, sy: number) => {
    const q = new Float32Array(p.length);
    for (let i = 0; i < p.length; i += 2) {
      q[i] = cx + (p[i]! - cx) * sx;
      q[i + 1] = cy + (p[i + 1]! - cy) * sy;
    }
    return q;
  };
  if (name === 'gesicht') {
    eigen[135] = zusammen(eigen[90]!, 470, 30, 0.2, 0.72);
    eigen[180] = zusammen(eigen[90]!, 500, 30, 0.0, 0.5);
  } else if (name === 'nase') {
    // die Nase bleibt stehen und zieht sich beim Wegdrehen zurück (kopfTeile)
    eigen[135] = eigen[90]!.slice();
    eigen[180] = eigen[90]!.slice();
  } else if (name === 'kopf') {
    // hinten: der Umriss der Front (nicht gespiegelt: jeder Punkt bleibt auf seiner Bildseite, sonst klappt der Kopf beim
    // Weiterdrehen wie Pappe durch die Mitte), oben eine glatte Kuppel zwischen den Ohren
    const h = eigen[0]!.slice();
    const von = form.marken['eV']!;
    for (let i = von; i < form.n; i++) {
      const x = h[i * 2]!;
      const u = Math.min(1, Math.abs(x) / 551);
      h[i * 2 + 1] = Math.min(h[i * 2 + 1]!, -72 - 263 * Math.sqrt(1 - u * u));
    }
    eigen[180] = h;
    // halb weggedreht: die Schnauze zieht sich zum Schädel zurück, dann halb zur Rückseite
    const s = eigen[90]!;
    const k = new Float32Array(s.length);
    for (let i = 0; i < s.length; i += 2) {
      const x = s[i]! > 120 ? 120 + (s[i]! - 120) * 0.35 : s[i]!;
      k[i] = (x + h[i]!) / 2;
      k[i + 1] = (s[i + 1]! + h[i + 1]!) / 2;
    }
    eigen[135] = k;
  } else if (name in { ohrH: 1, ohrV: 1, schopf: 1 }) {
    // Schwerpunkt auf einer Kreisbahn aus Front (seitlich x_f) und Profil (nach vorn x_s): x(θ) = x_f·cos θ + x_s·sin θ;
    // die Form bei 135° ist schon die Rückseite (so klappt sie nicht als dünner Strich um)
    eigen[180] = form.spiegeln(eigen[0]!, null);
    const mitte = (p: Float32Array): [number, number] => {
      let x = 0;
      let y = 0;
      for (let i = 0; i < p.length; i += 2) {
        x += p[i]!;
        y += p[i + 1]!;
      }
      return [(x * 2) / p.length, (y * 2) / p.length];
    };
    const [fx] = mitte(eigen[0]!);
    const [sx, sy] = mitte(eigen[90]!);
    const [hx, hy] = mitte(eigen[180]!);
    const zx = fx * Math.cos(135 * RAD) + sx * Math.sin(135 * RAD);
    const zy = (sy + hy) / 2;
    const h = eigen[180]!;
    const k = new Float32Array(h.length);
    for (let i = 0; i < h.length; i += 2) {
      k[i] = zx + (h[i]! - hx);
      k[i + 1] = zy + (h[i + 1]! - hy);
    }
    eigen[135] = k;
  }
}

export class Figur {
  readonly kopf: Map<string, Form>;
  readonly koerper: Map<string, Form>;
  private puffer = new Map<string, Float32Array>();
  /** Hinterbeine als schwarze Schattenrisse (statt mit Fenster) */
  ferneBeineSchwarz = true;

  constructor() {
    this.kopf = formenAnlegen(kopfFormen, rueckseiten);
    this.koerper = formenAnlegen(koerperFormen);
  }

  private buf(name: string, n: number): Float32Array {
    let b = this.puffer.get(name);
    if (!b || b.length !== n * 2) {
      b = new Float32Array(n * 2);
      this.puffer.set(name, b);
    }
    return b;
  }

  /** Körperlage (X, Y, Z) → Welt (x, y) und Tiefe (zum Betrachter +) */
  koerperPunkt(pose: Pose, X: number, Y: number, Z: number): [number, number, number] {
    const p = pose.nicken * RAD;
    const q = pose.rollen * RAD;
    const s = pose.psi * RAD;
    // Nicken um die Querachse
    let x1 = X * Math.cos(p) - Y * Math.sin(p);
    let y1 = X * Math.sin(p) + Y * Math.cos(p);
    // Wiegen um die Längsachse
    const y2 = y1 * Math.cos(q) - Z * Math.sin(q);
    const z2 = y1 * Math.sin(q) + Z * Math.cos(q);
    y1 = y2;
    // Drehen um die Hochachse
    const sx = x1 * Math.sin(s) + z2 * Math.cos(s);
    const tiefe = x1 * Math.cos(s) - z2 * Math.sin(s);
    x1 = sx;
    return [pose.x + x1, pose.y + y1 - pose.heben, tiefe];
  }

  /** tiefster Punkt eines Kastens unter der Hüfte bei Kippung β (Grad) */
  static fussTiefe(beta: number): number {
    const b = Math.abs(beta) * RAD;
    return (KASTEN.H - KASTEN.r) * Math.cos(b) + (KASTEN.B / 2 - KASTEN.r) * Math.sin(b) + KASTEN.r;
  }

  /** Reichweite (Abstand nach unten vom Körperanker) jeder Stütze bei Nicken p */
  private reichweiten(pose: Pose, p: number): number {
    const sp = Math.sin(p * RAD);
    const cp = Math.cos(p * RAD);
    const q = pose.rollen * RAD;
    let max = -Infinity;
    for (const b of BEINE) {
      const winkel = (pose[`bein${b.name}` as const] as number) - p;
      const hub = pose[`hub${b.name}` as const] as number;
      const hy = b.X * sp; // Hüfte nach dem Nicken (Y = 0)
      const hy2 = hy * Math.cos(q) - b.Z * Math.sin(q);
      const r = hy2 + Figur.fussTiefe(winkel) - hub;
      if (r > max) max = r;
    }
    for (const s of STUETZEN) {
      const r = s.X * sp + s.Y * cp;
      if (r > max) max = r;
    }
    return max;
  }

  /** Boden-Löser: legt die Höhe (und mit `frei` auch das Nicken) so, dass Ozzy auf seinen tiefsten Stützen ruht */
  boden(pose: Pose, frei = 0): void {
    if (pose.boden <= 0) return;
    let p = pose.nicken;
    if (frei > 0) {
      // Schwerkraft: der Körper kippt, bis er am tiefsten liegt (größtes y)
      let best = p;
      let bestY = -Infinity;
      for (let d = -25; d <= 25; d += 1) {
        const y = -this.reichweiten(pose, pose.nicken + d);
        if (y > bestY + 1e-6) {
          bestY = y;
          best = pose.nicken + d;
        }
      }
      for (let schritt = 0.5; schritt > 0.02; schritt /= 2)
        for (const d of [-schritt, schritt]) {
          const y = -this.reichweiten(pose, best + d);
          if (y > bestY) {
            bestY = y;
            best += d;
          }
        }
      p = pose.nicken + (best - pose.nicken) * frei;
    }
    const y = BODEN_Y - this.reichweiten(pose, p) + pose.heben;
    pose.y = pose.y + (y - pose.y) * pose.boden;
    pose.nicken = p;
  }

  /** Alle Teile für eine Pose, nach Tiefe sortiert */
  zeichenteile(pose: Pose): Zeichenteil[] {
    const teile: Zeichenteil[] = [];
    const psi = pose.psi;
    const sPsi = Math.sin(psi * RAD);
    const cPsi = Math.cos(psi * RAD);

    // --- Rumpf und Kehle (Brustlinie)
    {
      const winkel = (pose.nicken * sPsi + pose.rollen * cPsi) * RAD;
      const st = pose.stauchen;
      const at = pose.atmen * 0.012;
      const c = Math.cos(winkel);
      const s = Math.sin(winkel);
      const [ax, ay] = this.koerperPunkt(pose, 0, 0, 0);
      for (const name of ['rumpf', 'kehle'] as const) {
        const f = this.koerper.get(name)!;
        const p = this.buf(name, f.n);
        f.auswerten(psi, p);
        for (let i = 0; i < f.n; i++) {
          let x = p[i * 2]!;
          let y = p[i * 2 + 1]!;
          // Atmen und Stauchen um die Mitte des Rumpfs (etwas über dem Anker)
          const my = -150;
          x *= 1 + at - st * 0.5;
          y = my + (y - my) * (1 + at + st);
          p[i * 2] = ax + x * c - y * s;
          p[i * 2 + 1] = ay + x * s + y * c;
        }
        teile.push({ name, farbe: 'schwarz', p, n: f.n, ecken: f.mitEcken ? f.ecke.slice() : null, tiefe: name === 'kehle' ? 0.02 : 0 });
      }
    }

    // --- Schwanz (Ring in der Längsebene; von vorn/hinten nie dünner als 60 %)
    {
      const [sx, sy, st] = this.koerperPunkt(pose, SCHWANZ.X, SCHWANZ.Y, SCHWANZ.Z);
      const breite = Math.max(Math.abs(sPsi), 0.6) * (sPsi >= 0 ? 1 : -1);
      const dreh = Math.cos(pose.schwanzDreh * RAD);
      const winkel = (-pose.schwanz * (sPsi >= 0 ? 1 : -1) + pose.nicken * sPsi) * RAD;
      const c = Math.cos(winkel);
      const s = Math.sin(winkel);
      for (const name of ['schwanz', 'schwanzloch'] as const) {
        const f = this.koerper.get(name)!;
        const p = this.buf(name, f.n);
        f.auswerten(90, p);
        for (let i = 0; i < f.n; i++) {
          const x = p[i * 2]! * breite * dreh;
          const y = p[i * 2 + 1]!;
          p[i * 2] = sx + x * c - y * s;
          p[i * 2 + 1] = sy + x * s + y * c;
        }
        teile.push({ name, farbe: f.farbe, p, n: f.n, ecken: f.mitEcken ? f.ecke.slice() : null, tiefe: st + 1 + (name === 'schwanzloch' ? 0.01 : 0) });
      }
    }

    // --- Beine (Kästen)
    for (const b of BEINE) this.bein(pose, b, sPsi, cPsi, teile);

    // --- Kopf
    this.kopfTeile(pose, teile);

    teile.sort((a, b) => a.tiefe - b.tiefe);
    if (pose.spiegel >= 0.5) {
      const m = 2 * pose.x;
      for (const t of teile) for (let i = 0; i < t.n; i++) t.p[i * 2] = m - t.p[i * 2]!;
    }
    return teile;
  }

  private bein(pose: Pose, b: Bein, sPsi: number, cPsi: number, teile: Zeichenteil[]): void {
    const alpha = pose[`bein${b.name}` as const] as number;
    const hub = pose[`hub${b.name}` as const] as number;
    const [hx, hy0, tiefe] = this.koerperPunkt(pose, b.X, 0, b.Z);
    const hy = hy0 - hub;
    // Richtung des Beins (unten) im Körper → Bildschirm
    const a = (alpha - pose.nicken) * RAD;
    const q = pose.rollen * RAD;
    const dX = Math.sin(a);
    const dY = Math.cos(a) * Math.cos(q);
    const dZ = Math.cos(a) * Math.sin(q);
    const dx = dX * sPsi + dZ * cPsi;
    const dy = dY;
    const lang = Math.hypot(dx, dy) || 1;
    const phi = Math.atan2(-dx, dy);
    const cf = Math.cos(phi);
    const sf = Math.sin(phi);
    // quadratischer Gips: von allen Seiten gleich breit
    const halb = KASTEN.B / 2;
    const setze = (pts: number[], dicke = 1): Float32Array => {
      const out = new Float32Array(pts.length);
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i]! * dicke;
        const y = pts[i + 1]! * lang;
        out[i] = hx + x * cf - y * sf;
        out[i + 1] = hy + x * sf + y * cf;
      }
      return out;
    };
    const kasten = setze(kastenUmriss(halb));
    teile.push({ name: `bein${b.name}`, farbe: 'schwarz', p: kasten, n: kasten.length / 2, ecken: 'alle', tiefe });
    // Fenster nur auf den Beinen vor der Körpermitte; die fernen sind der dunkle Schatten daneben. Beim Drehen schrumpft das
    // Fenster über einen schmalen Bereich, statt umzuspringen.
    const sicht = this.ferneBeineSchwarz ? Math.min(1, Math.max(0, (tiefe + 30) / 60)) : 1;
    if (sicht <= 0.001) return;
    const f = setze(fensterUmriss(0, sicht));
    teile.push({ name: `fenster${b.name}`, farbe: 'weiss', p: f, n: f.length / 2, ecken: 'alle', tiefe: tiefe + 0.01 });
  }

  private kopfTeile(pose: Pose, teile: Zeichenteil[]): void {
    const th = pose.theta;
    const [ax, ay, tiefeHals] = this.koerperPunkt(pose, KOPF.X, KOPF.Y, KOPF.Z);
    const sPsi = Math.sin(pose.psi * RAD);
    const tiefe = tiefeHals + 400 * Math.max(0, sPsi) ** 2;
    const sTh = Math.sin(th * RAD);
    const cTh = Math.cos(th * RAD);
    const winkel = (pose.kopfNeigen * cTh + pose.kopfNicken * sTh) * RAD;
    const c = Math.cos(winkel);
    const s = Math.sin(winkel);
    const kx = ax + pose.kopfX;
    const ky = ay + pose.kopfY + pose.kopfNicken * cTh * 2.2;
    const zuWelt = (p: Float32Array, n: number) => {
      for (let i = 0; i < n; i++) {
        const x = p[i * 2]! - HALS.x;
        const y = p[i * 2 + 1]! - HALS.y;
        p[i * 2] = kx + HALS.x + x * c - y * s;
        p[i * 2 + 1] = ky + HALS.y + x * s + y * c;
      }
    };
    const wink = ((((th + 180) % 360) + 360) % 360) - 180;
    const weg = Math.abs(wink);
    // Reihenfolge: Ohren und Schopf hinten, der schwarze Kopf, darauf das weiße Gesicht (mit den Schlitzen), die Nase
    const reihe = ['ohrH', 'ohrV', 'schopf', 'kopf', 'gesicht', 'nase'];
    reihe.forEach((name, k) => {
      const f = this.kopf.get(name)!;
      const p = this.buf(name, f.n);
      f.auswerten(th, p);
      if (weg > 90 && name === 'nase') {
        // beim Wegdrehen zieht sich die Nase in die Schnauze zurück
        const z = Math.max(0, 1 - (weg - 90) / 20);
        const [mx, my] = f.marke(p, 'L');
        for (let i = 0; i < f.n; i++) {
          p[i * 2] = mx + (p[i * 2]! - mx) * z;
          p[i * 2 + 1] = my + (p[i * 2 + 1]! - my) * z;
        }
      }
      this.ortlich(name, f, p, pose);
      zuWelt(p, f.n);
      teile.push({ name, farbe: f.farbe, p, n: f.n, ecken: f.mitEcken ? f.ecke.slice() : null, tiefe: tiefe + k * 0.01 });
    });
  }

  /** Örtliche Verformungen: Ohren und Schopf drehen, Schlitze heben/kippen, Nase schnüffeln, Bart schwingen */
  private ortlich(name: string, f: Form, p: Float32Array, pose: Pose): void {
    const drehen = (cx: number, cy: number, w: number, von = 0, bis = f.n) => {
      const c = Math.cos(w);
      const s = Math.sin(w);
      for (let i = von; i < bis; i++) {
        const x = p[i * 2]! - cx;
        const y = p[i * 2 + 1]! - cy;
        p[i * 2] = cx + x * c - y * s;
        p[i * 2 + 1] = cy + x * s + y * c;
      }
    };
    if (name === 'ohrH' || name === 'ohrV' || name === 'schopf') {
      const wert = name === 'schopf' ? pose.schopf : (pose[name] as number);
      if (!wert) return;
      const [cx, cy] = f.marke(p, 'c');
      const [ex, ey] = f.marke(p, 'e');
      const mx = (cx + ex) / 2;
      const my = (cy + ey) / 2;
      const [bx] = f.marke(p, 'b');
      const seite = bx < mx ? -1 : 1; // Spitze links: nach außen = gegen den Uhrzeiger
      drehen(mx, my, wert * seite * RAD);
      return;
    }
    if (name === 'gesicht' && (pose.brauen || pose.brauenKipp)) {
      // die Schlitze sind Kerben im Gesicht: links K → L (Spitze) → M (Ecke), rechts D (Ecke) → E (Spitze) → F.
      // Beide Kanten einer Kerbe gehen mit (Gewicht wächst glatt zur Spitze), gedreht um die Ecke am Kopfrand.
      const kerbe = (von: string, spitze: string, bis: string, ecke: string) => {
        const a = f.marken[von]!;
        const s = f.marken[spitze]!;
        const b = f.marken[bis]!;
        const [mx, my] = f.marke(p, ecke);
        const [sx] = f.marke(p, spitze);
        const seite = sx > mx ? 1 : -1;
        for (let i = a; i <= b; i++) {
          const g = i <= s ? (i - a) / Math.max(1, s - a) : (b - i) / Math.max(1, b - s);
          const gw = Math.sin((g * Math.PI) / 2) ** 2;
          const x = p[i * 2]! - mx;
          const y = p[i * 2 + 1]! - my;
          const w = pose.brauenKipp * seite * RAD * gw;
          p[i * 2] = mx + x * Math.cos(w) - y * Math.sin(w);
          p[i * 2 + 1] = my + x * Math.sin(w) + y * Math.cos(w) - pose.brauen * 2.2 * gw;
        }
      };
      kerbe('K', 'L', 'M', 'M');
      kerbe('D', 'E', 'F', 'D');
    }
    if (name === 'gesicht' && !pose.bart) return;
    if (name === 'nase' && pose.nase) {
      let cx = 0;
      let cy = 0;
      for (let i = 0; i < f.n; i++) {
        cx += p[i * 2]!;
        cy += p[i * 2 + 1]!;
      }
      cx /= f.n;
      cy /= f.n;
      const k = 1 + pose.nase * 0.12;
      for (let i = 0; i < f.n; i++) {
        p[i * 2] = cx + (p[i * 2]! - cx) * k;
        p[i * 2 + 1] = cy + (p[i * 2 + 1]! - cy) * (2 - k) - pose.nase * 6;
      }
      return;
    }
    if (name === 'gesicht' && pose.bart) {
      const [hx, hy] = f.marke(p, 'H');
      const von = f.marken['G2']!;
      const bis = f.marken['I']!;
      for (let i = von; i <= bis; i++) {
        const d = Math.max(0, 1 - Math.hypot(p[i * 2]! - hx, p[i * 2 + 1]! - hy) / 320);
        p[i * 2] = p[i * 2]! + pose.bart * 1.6 * d * d;
      }
    }
  }
}

// ---- Kasten und Fenster -------------------------------------------------------------------------------------------------
function kastenUmriss(halb: number): number[] {
  const { H, r, oben } = KASTEN;
  const pts: number[] = [-halb, oben];
  const bogen = (cx: number, cy: number, a0: number, a1: number) => {
    for (let k = 0; k <= 10; k++) {
      const a = a0 + ((a1 - a0) * k) / 10;
      pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  };
  bogen(-halb + r, H - r, Math.PI, Math.PI / 2);
  bogen(halb - r, H - r, Math.PI / 2, 0);
  pts.push(halb, oben);
  return pts;
}
function fensterUmriss(mx: number, s: number): number[] {
  const { fensterB, fensterOben, fensterUnten } = KASTEN;
  const rx = (fensterB / 2) * s;
  const ry = fensterB / 2;
  const cy = fensterOben + ry;
  const pts: number[] = [mx - rx, fensterUnten];
  for (let k = 0; k <= 24; k++) {
    const a = Math.PI + (Math.PI * k) / 24;
    pts.push(mx + rx * Math.cos(a), cy + ry * Math.sin(a));
  }
  pts.push(mx + rx, fensterUnten);
  return pts;
}
