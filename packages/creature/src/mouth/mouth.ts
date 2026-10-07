import type { Bauplan } from '../bauplan/schema';
import { add, clamp, clamp01, cross, dot, lerp, normalize, scale, smoothstep, sub, type Vec3 } from '../math/vec';
import { evalScene, type SdfScene } from '../sdf/scene';

/**
 * Das Maul als **Maullinie auf dem Träger** (Körper oder Kopf): eine Kurve um den Träger herum von Mundwinkel zu
 * Mundwinkel, stufenlos in der Höhe (`hoehe`), gekippt (`neigung`), mit Winkeln nach hinten (`winkel`/`breite`).
 * Entlang dieser Kurve wird die geschlossen vermaschte Haut **aufgeschnitten** (mesh/mundschnitt.ts) — das Maul ist
 * geschlossen per Konstruktion perfekt und öffnet sich durch Drehung des Unterkiefers (und Heben des Oberkiefers) um
 * das Gelenk am Hinterkopf. `form` blendet beim Öffnen von radialer Weitung (Lochmaul) zu Kieferdrehung (Keilmaul);
 * `rundung` bestimmt, wie die Öffnung zu den Winkeln ausläuft (spitz … rund wie beim Aal).
 */

/** Träger des Mauls in einem lokalen Rahmen: Achse von `origin` entlang `up`, Azimut φ um `up` ab `forward`. */
export interface MouthHost {
  origin: Vec3;
  up: Vec3;
  forward: Vec3;
  right: Vec3;
  /** Höhe des Trägers entlang `up` (lokal 0 … height). */
  height: number;
  /** Charakteristische halbe Breite quer (für Lippen- und Zahnmaße). */
  halfWidth: number;
  /** Knochen des Trägers. */
  bone: number;
  /** Kiefergelenk: Abstand hinter dem Ursprung entlang −forward (auf Höhe der Mundwinkel). */
  jointBack: number;
  /** Höhe des Unterkiefers unter der Maullinie (Körperträger: Kinnband des Grundblobs); ohne Angabe 45 % der Trägerhöhe. */
  jawDepth?: number;
  /** Kopfhöhe (Kinn bis Scheitel) für Öffnungsweite, Linienschwung und Augengröße; ohne Angabe die Trägerhöhe. */
  headHeight?: number;
  /** Mittellinie des Trägers: Scheibenmitte auf Höhe h (Körperträger mit Neigung); ohne Angabe `origin + up · h`. */
  center?: (h: number) => Vec3;
  /** Szene nur mit den Trägerformen (zum Marschieren auf die Fläche). */
  scene: SdfScene;
}

export interface Tooth {
  pos: Vec3;
  /** Richtung der Spitze (Einheit). */
  dir: Vec3;
  /** Länge (Blob-Einheiten). */
  size: number;
  /** oben (Oberkiefer) oder unten (Unterkiefer, folgt dem Kieferknochen). */
  upper: boolean;
  /** Hauer: ragt über die Oberlippe. */
  hauer: boolean;
}

export interface MouthGeometry {
  host: MouthHost;
  /** Lokale Höhe der Maullinie vorn. */
  hLip: number;
  /** Halber Winkel der Mundwinkel (rad). */
  theta: number;
  /** Abtastungen der geschlossenen Maullinie von −θ nach +θ. */
  lipLine: Vec3[];
  lipH: number[];
  lipR: number[];
  phis: number[];
  center: Vec3;
  corners: [Vec3, Vec3];
  /** Maulrahmen am Zentrum: z vorn (Flächennormale), y oben, x rechts. */
  frame: { x: Vec3; y: Vec3; z: Vec3 };
  /** Maximale Öffnungshöhe vorn (Körpereinheiten), aus `oeffnung`. */
  gapeMax: number;
  /** Rachentiefe als Anteil. */
  tiefe: number;
  jawHinge: { point: Vec3; axis: Vec3 };
  local(p: Readonly<Vec3>): { h: number; phi: number; r: number };
  lipHAt(phi: number): number;
  lipRAt(phi: number): number;
  /** Öffnungsprofil 0…1 je Azimut (1 vorn, 0 an den Winkeln): spitz (Rex) … rund (Aal). */
  profilAt(phi: number): number;
  /**
   * 0…1: wie stark ein Punkt zum Unterkiefer gehört. `side` (−1 unten, +1 oben) kommt aus dem Lippenschnitt: die Haut ist
   * dort getrennt, die Zugehörigkeit springt hart an der Maullinie (sonst zerfasert der Rand beim Öffnen); ohne `side`
   * weich über die Linie.
   */
  jawWeight(p: Readonly<Vec3>, bodyScale: number, side?: number): number;
  /** 0…1: wie stark ein Punkt zum Oberkiefer (Oberkopf, klappt beim Öffnen zurück) gehört. */
  upperWeight(p: Readonly<Vec3>, bodyScale: number, side?: number): number;
  /** Auslauf der Kieferbewegung vom Mundwinkel (1) zum Gelenk (0) über die Vorn-Koordinate. */
  wToJoint(zLocal: number): number;
  /** Vorn-Koordinate der Mundwinkel (lokal). */
  zCorner: number;
}

/** Scheibenmitte des Trägers auf Höhe h (Mittellinie oder gerade Achse). */
export function hostCenter(host: MouthHost, h: number): Vec3 {
  return host.center ? host.center(h) : add(host.origin, scale(host.up, h));
}

/** Marschiert von der Mittellinie auf Höhe h in Richtung φ bis zur Fläche; liefert Punkt und Radialabstand. */
export function surfacePoint(host: MouthHost, h: number, phi: number, maxR: number): { p: Vec3; r: number } {
  const a = hostCenter(host, h);
  const dir = add(scale(host.forward, Math.cos(phi)), scale(host.right, Math.sin(phi)));
  let r = 0;
  let p: Vec3 = a;
  for (let i = 0; i < 48; i++) {
    p = add(a, scale(dir, r));
    const d = evalScene(host.scene, p);
    if (Math.abs(d) < 1e-4) break;
    const step = d < 0 ? Math.max(-d, 0.004) : -d;
    r += step;
    if (r > maxR) {
      r = maxR;
      p = add(a, scale(dir, r));
      break;
    }
    if (r < 0) {
      r = 0;
      break;
    }
  }
  return { p, r };
}

export function buildMouth(b: Bauplan, host: MouthHost, bodyScale: number): MouthGeometry {
  const m = b.maul;
  const H = host.height;
  const hLip = clamp(m.hoehe, 0.02, 0.98) * H;
  // Kopfhöhe: beim Kopfträger die Trägerhöhe, beim Körperträger Kinn bis Scheitel — Öffnung und Schwung sind Kopfmaße
  const Hk = host.headHeight ?? H;
  const maxR = host.halfWidth * 3 + bodyScale;
  // Öffnungshöhe vorn bei voller Öffnung
  const gapeMax = Math.max(0.004, clamp01(m.oeffnung) * 0.75 * Hk);
  // Weite der Öffnung: Keil bis weit zu den Mundwinkeln; Loch so breit wie hoch
  const thetaKeil = clamp(m.breite * (Math.PI / 2 + m.winkel * (Math.PI * 0.45)), 0.15, Math.PI * 0.95);
  const rLipFront = Math.max(0.02, surfacePoint(host, hLip, 0, maxR).r);
  const thetaRund = clamp((gapeMax * 0.6) / rLipFront, 0.12, thetaKeil);
  const fForm = clamp01(m.form);
  const theta = lerp(thetaRund, thetaKeil, fForm);
  const rundung = lerp(1, clamp01(m.rundung), fForm);
  const profA = lerp(2, 5, rundung);
  const profB = lerp(1, 0.5, rundung);
  const n = 65;
  const phis: number[] = [];
  const lipH: number[] = [];
  const lipR: number[] = [];
  const lipLine: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const phi = -theta + 2 * theta * t;
    // Maullinie wie gezeichnet (Bild 3/5): vorn an der Schnauze, hinter ihr leicht abgesenkt (`schwung`), zu den Winkeln
    // ansteigend (`neigung`) — eine geschwungene Linie, keine Gerade
    const u = Math.abs(phi) / theta;
    const rise = m.neigung * 0.22 * Hk * u * u;
    const dip = clamp01(m.schwung) * 0.12 * Hk * Math.pow(Math.sin(Math.PI * clamp01(u / 0.72)), 1.5) * (u < 0.72 ? 1 : 0);
    const h = clamp(hLip + rise - dip, 0.01, H - 0.01);
    const sp = surfacePoint(host, h, phi, maxR);
    phis.push(phi);
    lipH.push(h);
    lipR.push(sp.r);
    lipLine.push(sp.p);
  }
  const mid = (n - 1) / 2;
  const center = lipLine[mid]!;
  const corners: [Vec3, Vec3] = [lipLine[0]!, lipLine[n - 1]!];
  const e = 0.01 * bodyScale;
  const grad: Vec3 = [
    evalScene(host.scene, [center[0] + e, center[1], center[2]]) - evalScene(host.scene, [center[0] - e, center[1], center[2]]),
    evalScene(host.scene, [center[0], center[1] + e, center[2]]) - evalScene(host.scene, [center[0], center[1] - e, center[2]]),
    evalScene(host.scene, [center[0], center[1], center[2] + e]) - evalScene(host.scene, [center[0], center[1], center[2] - e]),
  ];
  let fz = normalize(grad);
  if (dot(fz, host.forward) < 0.2) fz = host.forward;
  let fx = normalize(cross(host.up, fz));
  const fy = normalize(cross(fz, fx));
  fx = normalize(cross(fy, fz));
  const frame = { x: fx, y: fy, z: fz };
  const tiefe = clamp(m.tiefe, 0.2, 1);

  const interp = (arr: number[], phi: number): number => {
    const t = clamp((phi + theta) / (2 * theta), 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(t));
    const f = t - i;
    const p0 = arr[Math.max(0, i - 1)]!, p1 = arr[i]!, p2 = arr[i + 1]!, p3 = arr[Math.min(n - 1, i + 2)]!;
    const f2 = f * f, f3 = f2 * f;
    return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 + (-p0 + 3 * p1 - 3 * p2 + p3) * f3);
  };
  const lipHAt = (phi: number): number => interp(lipH, phi);
  const lipRAt = (phi: number): number => interp(lipR, phi);
  const profilAt = (phi: number): number => {
    const u = clamp(Math.abs(phi) / theta, 0, 1);
    const profil = Math.pow(Math.max(0, 1 - Math.pow(u, profA)), profB);
    const w = 1 + m.wForm * 0.25 * Math.cos(phi * (Math.PI / Math.max(theta, 0.3)) * 1.5);
    return clamp01(profil * w);
  };
  const local = (p: Readonly<Vec3>): { h: number; phi: number; r: number } => {
    const h = dot(sub(p, host.origin), host.up);
    const v = sub(p, hostCenter(host, h));
    const vx = dot(v, host.right);
    const vz = dot(v, host.forward);
    return { h, phi: Math.atan2(vx, vz), r: Math.hypot(vx, vz) };
  };

  // Gelenk hinter dem Träger auf Höhe der Mundwinkel, Achse quer (Bild 5/6: der Kiefer schwingt vom Hinterkopf aus)
  const hCorner = lipHAt(theta);
  const hingeMid: Vec3 = add(hostCenter(host, hCorner), scale(host.forward, -host.jointBack));
  const hingeAxis: Vec3 = normalize(host.right);
  const zCorner = lipRAt(theta) * Math.cos(theta);
  const wToJoint = (zLocal: number): number => {
    const t = clamp((zLocal + host.jointBack) / Math.max(1e-4, zCorner + host.jointBack), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // Unterkiefer als starrer Löffel: volle Zugehörigkeit bis zur Kiefertiefe (Unterkieferhöhe unter der Maullinie, beim
  // Körperträger höchstens 45 % der Trägerhöhe), dann weich zum Hals/Körper auslaufend
  const jawDepth = host.jawDepth ?? Math.min(hLip, 0.45 * H) * 1.05;
  const jawWeight = (p: Readonly<Vec3>, bs: number, side?: number): number => {
    if (m.unterkiefer < 0.05) return 0;
    const { h, phi, r } = local(p);
    const aphi = Math.abs(phi);
    const phiC = clamp(phi, -theta, theta);
    const hl = lipHAt(phiC);
    const below = hl - h;
    const band = 0.09 * bs;
    const wBelow = side !== undefined && side !== 0 ? (side < 0 ? 1 : 0) : smoothstep(-0.2 * band, band, below) * smoothstep(0, 0.5 * band, below + 0.3 * band);
    const wPhi = aphi <= theta ? 1 : wToJoint(r * Math.cos(phi));
    const wDepth = 1 - smoothstep(jawDepth * 0.95, jawDepth * 1.3, below);
    return clamp01(wBelow * wPhi * wDepth);
  };
  const upperWeight = (p: Readonly<Vec3>, bs: number, side?: number): number => {
    const { h, phi, r } = local(p);
    const aphi = Math.abs(phi);
    const phiC = clamp(phi, -theta, theta);
    const hl = lipHAt(phiC);
    const above = h - hl;
    const band = 0.09 * bs;
    const wAbove = side !== undefined && side !== 0 ? (side > 0 ? 1 : 0) : smoothstep(-0.2 * band, band, above) * smoothstep(0, 0.5 * band, above + 0.3 * band);
    const wPhi = aphi <= theta ? 1 : wToJoint(r * Math.cos(phi));
    return clamp01(wAbove * wPhi);
  };

  return { host, hLip, theta, lipLine, lipH, lipR, phis, center, corners, frame, gapeMax, tiefe, jawHinge: { point: hingeMid, axis: hingeAxis }, local, lipHAt, lipRAt, profilAt, jawWeight, upperWeight, wToJoint, zCorner };
}
