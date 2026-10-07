import type { Bauplan } from '../bauplan/schema';
import { makeRng } from '../math/rng';
import { add, clamp, clamp01, cross, dot, lerp, normalize, scale, smoothstep, sub, type Vec3 } from '../math/vec';
import { REGION, evalScene, type CapsulePrim, type CustomPrim, type Prim, type SdfScene } from '../sdf/scene';

/**
 * Das Maul: ein **Maulvolumen** zwischen zwei Lippenkurven, das vom Träger (Körper oder Kopf) abgezogen wird.
 * `form` blendet vom Lochmaul (Röhre entlang der Blickrichtung, Öffnung = radiale Weitung) zum Keilmaul (Spalt um die
 * Maullinie, der zu den Mundwinkeln hin auf 0 ausläuft; Öffnung = Kieferdrehung). `hoehe` setzt die Maullinie stufenlos
 * von unten nach oben am Träger, `neigung` kippt sie, `winkel` zieht die Mundwinkel um den Träger nach hinten.
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
  /** Halbe Öffnungshöhe vorn im Bauzustand (lokal). */
  gapFront: number;
  /** Rachentiefe als Anteil des Radialabstands. */
  tiefe: number;
  /** Öffnung des Bauzustands 0…1. */
  oeffnung: number;
  jawHinge: { point: Vec3; axis: Vec3 };
  teeth: Tooth[];
  /** Zungenansatz (am Unterkiefer) und -richtung. */
  tongue: { pos: Vec3; dir: Vec3; size: number };
  local(p: Readonly<Vec3>): { h: number; phi: number; r: number };
  lipHAt(phi: number): number;
  lipRAt(phi: number): number;
  gapAt(phi: number): number;
  /** 0…1: wie stark ein Punkt zum Unterkiefer gehört (für Gewichte). */
  jawWeight(p: Readonly<Vec3>, bodyScale: number): number;
}

/** Marschiert von der Achse auf Höhe h in Richtung φ bis zur Fläche; liefert Punkt und Radialabstand. */
export function surfacePoint(host: MouthHost, h: number, phi: number, maxR: number): { p: Vec3; r: number } {
  const a = add(host.origin, scale(host.up, h));
  const dir = add(scale(host.forward, Math.cos(phi)), scale(host.right, Math.sin(phi)));
  let r = 0;
  let p: Vec3 = a;
  // Sphere-Tracing nach außen, ab dem Inneren (d < 0): Schrittweite max(|d|, ε)
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

export interface MouthBuild {
  geometry: MouthGeometry;
  /** Primitive: Lippenwülste (union), Höhle und Kinnschnitt (subtract), Schnauze (union). */
  prims: Prim[];
}

export function buildMouth(b: Bauplan, host: MouthHost, jawBone: number, bodyScale: number): MouthBuild {
  const m = b.maul;
  const H = host.height;
  const hLip = clamp(m.hoehe, 0.02, 0.98) * H;
  const theta = clamp(m.breite * (Math.PI / 2 + m.winkel * (Math.PI * 0.45)), 0.15, Math.PI * 0.95);
  const n = 33;
  const phis: number[] = [];
  const lipH: number[] = [];
  const lipR: number[] = [];
  const lipLine: Vec3[] = [];
  const maxR = host.halfWidth * 3 + H;
  // Öffnungshöhe vorn: Anteil der Trägerhöhe, mit Oberkiefer/Unterkiefer gewichtet
  const gapFront = Math.max(0.004, m.oeffnung * 0.32 * H * (0.5 + 0.5 * Math.min(1, (m.oberkiefer + m.unterkiefer) * 0.5)));
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const phi = -theta + 2 * theta * t;
    const w = 1 - Math.cos(phi) === 0 ? 0 : (1 - Math.cos(phi)) / (1 - Math.cos(theta) || 1e-6);
    const h = clamp(hLip + m.neigung * 0.22 * H * w, 0.01, H - 0.01);
    const sp = surfacePoint(host, h, phi, maxR);
    phis.push(phi);
    lipH.push(h);
    lipR.push(sp.r);
    lipLine.push(sp.p);
  }
  const mid = (n - 1) / 2;
  const center = lipLine[mid]!;
  const corners: [Vec3, Vec3] = [lipLine[0]!, lipLine[n - 1]!];
  // Rahmen am Zentrum: z = Flächennormale (per Gradient), y ≈ host.up
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
    return arr[i]! * (1 - f) + arr[i + 1]! * f;
  };
  const lipHAt = (phi: number): number => interp(lipH, phi);
  const lipRAt = (phi: number): number => interp(lipR, phi);
  const gapAt = (phi: number): number => {
    const u = clamp(Math.abs(phi) / theta, 0, 1);
    // Keil: läuft zu den Mundwinkeln hin aus; Oberlippe W-Form hebt die Mitte leicht an
    // Keil: breit offen bis weit zu den Mundwinkeln, erst dort läuft der Spalt aus (Rex-Löffel)
    const wedge = Math.pow(Math.max(0, 1 - Math.pow(u, 1.7)), 0.85);
    const w = 1 + m.wForm * 0.25 * Math.cos(phi * (Math.PI / Math.max(theta, 0.3)) * 1.5);
    return gapFront * wedge * w;
  };
  const local = (p: Readonly<Vec3>): { h: number; phi: number; r: number } => {
    const v = sub(p, host.origin);
    const h = dot(v, host.up);
    const vx = dot(v, host.right);
    const vz = dot(v, host.forward);
    return { h, phi: Math.atan2(vx, vz), r: Math.hypot(vx, vz) };
  };
  const rInAt = (phi: number): number => lipRAt(phi) * (1 - tiefe * 0.9);
  const D = Math.max(0.05, tiefe * host.halfWidth * 1.6);
  const rho0 = Math.max(0.004, host.halfWidth * m.breite * (0.18 + 0.5 * m.oeffnung));

  const cavity: CustomPrim = {
    kind: 'custom',
    op: 'subtract',
    part: host.bone,
    region: REGION.rachen,
    k: 0.08 * bodyScale * (0.5 + m.lippe),
    name: 'maulhoehle',
    bounds: { min: [center[0] - maxR, center[1] - maxR, center[2] - maxR], max: [center[0] + maxR, center[1] + maxR, center[2] + maxR] },
    eval: (p) => {
      const { h, phi, r } = local(p);
      const aphi = Math.abs(phi);
      const phiC = clamp(phi, -theta, theta);
      const hl = lipHAt(phiC);
      const rIn = rInAt(phiC);
      const rLip = lipRAt(phiC);
      const T = clamp01((r - rIn) / Math.max(1e-4, rLip - rIn));
      const g = gapAt(phiC) * (0.15 + 0.85 * T);
      const dArc = r * Math.max(0, aphi - theta);
      const dWedge = Math.max(Math.abs(h - hl) - g, rIn - r, dArc);
      // Loch: Röhre entlang der Blickrichtung ab dem Zentrum nach innen
      const v = sub(p, center);
      const zm = dot(v, frame.z);
      const xm = dot(v, frame.x);
      const ym = dot(v, frame.y);
      const rho = rho0 * Math.sqrt(clamp01(1 + zm / D));
      const dRound = Math.max(Math.hypot(xm, ym) - rho, -zm - D, zm - 0.3 * D);
      return lerp(dRound, dWedge, m.form);
    },
  };

  const prims: Prim[] = [cavity];

  // Kinnschnitt: ohne Unterkiefer liegt die Öffnung direkt am Hals/Körper darunter
  if (m.unterkiefer < 0.6) {
    const cut = clamp01((0.6 - m.unterkiefer) / 0.6);
    const chin: CustomPrim = {
      kind: 'custom',
      op: 'subtract',
      part: host.bone,
      region: REGION.rachen,
      k: 0.06 * bodyScale,
      name: 'kinnschnitt',
      bounds: cavity.bounds,
      eval: (p) => {
        const { h, phi, r } = local(p);
        const phiC = clamp(phi, -theta, theta);
        const hl = lipHAt(phiC) - gapAt(phiC);
        const depthBelow = cut * (hl * 0.9);
        const rIn = lipRAt(phiC) * (1 - tiefe * 0.6 * cut);
        const dArc = r * Math.max(0, Math.abs(phi) - theta);
        // Keil unterhalb der Lippe, nach unten bis depthBelow, nach innen bis rIn
        return Math.max(h - hl, hl - depthBelow - h, rIn - r, dArc) * Math.min(1, cut * 3);
      },
    };
    if (cut > 0.02) prims.push(chin);
  }

  // Lippenwülste entlang der Maullinie (oben und unten), zu den Mundwinkeln hin dünner
  const lipRadius = Math.max(0.006, m.lippe * 0.055 * bodyScale);
  if (m.lippe > 0.02 && m.form > 0.02) {
    for (const side of [1, -1] as const) {
      if (side < 0 && m.unterkiefer < 0.05) continue;
      for (let i = 0; i < n - 1; i += 2) {
        const phiA = phis[i]!, phiB = phis[Math.min(n - 1, i + 2)]!;
        const taperA = 0.35 + 0.65 * (1 - Math.pow(Math.abs(phiA) / theta, 2));
        const taperB = 0.35 + 0.65 * (1 - Math.pow(Math.abs(phiB) / theta, 2));
        const spA = surfacePoint(host, lipHAt(phiA) + side * (gapAt(phiA) + lipRadius * 0.6), phiA, maxR);
        const spB = surfacePoint(host, lipHAt(phiB) + side * (gapAt(phiB) + lipRadius * 0.6), phiB, maxR);
        const outA = normalize(sub(spA.p, add(host.origin, scale(host.up, lipHAt(phiA)))));
        const outB = normalize(sub(spB.p, add(host.origin, scale(host.up, lipHAt(phiB)))));
        const prim: CapsulePrim = {
          kind: 'capsule',
          op: 'union',
          part: side > 0 ? host.bone : jawBone,
          region: REGION.lippe,
          k: lipRadius * 1.4,
          name: side > 0 ? 'oberlippe' : 'unterlippe',
          a: add(spA.p, scale(outA, lipRadius * 0.35 * taperA * m.form)),
          b: add(spB.p, scale(outB, lipRadius * 0.35 * taperB * m.form)),
          ra: lipRadius * taperA * m.form,
          rb: lipRadius * taperB * m.form,
        };
        prims.push(prim);
      }
    }
  }

  // Lochmaul: Lippenring um die Öffnung (Kugelfisch, Betta), mit (1 − form) gewichtet
  if (m.form < 0.98 && m.lippe > 0.02) {
    const ringR = rho0 * 1.05 + lipRadius * 0.35;
    const ringRad = lipRadius * (0.7 + 0.5 * (1 - m.form)) * (1 - m.form) + 1e-3;
    const segs = 14;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      const pa = add(add(center, scale(frame.x, Math.cos(a0) * ringR)), scale(frame.y, Math.sin(a0) * ringR));
      const pb = add(add(center, scale(frame.x, Math.cos(a1) * ringR)), scale(frame.y, Math.sin(a1) * ringR));
      prims.push({ kind: 'capsule', op: 'union', part: Math.sin(a0) < -0.2 && m.unterkiefer > 0.05 ? jawBone : host.bone, region: REGION.lippe, k: ringRad * 1.5, name: 'lippenring', a: add(pa, scale(frame.z, ringRad * 0.35)), b: add(pb, scale(frame.z, ringRad * 0.35)), ra: ringRad, rb: ringRad });
    }
  }

  // Zähne auf den Lippenkurven des geschlossenen Zustands, oben/unten um eine halbe Teilung versetzt
  const teeth: Tooth[] = [];
  const z = b.zaehne;
  if (z.stil !== 'keine' && z.groesse > 0.01) {
    const rng = makeRng((b.seed * 7919 + 13) >>> 0);
    const arcLen = lipLine.reduce((acc, p, i) => (i === 0 ? 0 : acc + Math.hypot(p[0] - lipLine[i - 1]![0], p[1] - lipLine[i - 1]![1], p[2] - lipLine[i - 1]![2])), 0);
    const baseSize = z.groesse * 0.14 * bodyScale;
    const spacing = Math.max(baseSize * 1.1, (arcLen / (6 + 26 * z.dichte)));
    const count = Math.max(2, Math.floor(arcLen / spacing));
    const place = (upper: boolean, offset: number): void => {
      if (!upper && m.unterkiefer < 0.05) return;
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5 + offset) / count;
        if (t <= 0.02 || t >= 0.98) continue;
        const phi = -theta + 2 * theta * t;
        const u = Math.abs(phi) / theta;
        const canine = Math.exp(-Math.pow((u - 0.62) / 0.12, 2)) * z.eckzaehne;
        const isHauer = !upper && z.hauer > 0.05 && Math.abs(u - 0.78) < 0.08 + 0.1 * z.hauer;
        let size = baseSize * (0.7 + 0.6 * rng.next() * z.streuung + canine * 0.9) * (0.75 + 0.25 * (1 - u * u));
        if (isHauer) size = baseSize * (1.6 + 1.4 * z.hauer);
        const hl = lipHAt(phi);
        const g = gapAt(phi);
        const sp = surfacePoint(host, hl + (upper ? 1 : -1) * g * 0.92, phi, maxR);
        const inward = normalize(sub(add(host.origin, scale(host.up, hl)), sp.p));
        const vertical = upper ? scale(host.up, -1) : host.up;
        const dir = normalize(add(scale(vertical, 1), scale(inward, 0.35 - (isHauer ? 0.6 : 0))));
        // Ansatz leicht in die Lippe versenkt
        teeth.push({ pos: add(sp.p, scale(inward, size * 0.3)), dir, size, upper, hauer: isHauer });
      }
    };
    place(true, 0);
    place(false, 0.5);
  }

  const hingeMid = scale(add(corners[0], corners[1]), 0.5);
  const hingeAxis = normalize(sub(corners[1], corners[0]));
  const tongueBase = surfacePoint(host, hLip - gapFront * 0.6, 0, maxR);
  const tongue = { pos: add(tongueBase.p, scale(normalize(sub(add(host.origin, scale(host.up, hLip)), tongueBase.p)), host.halfWidth * 0.45)), dir: frame.z, size: b.zunge.groesse * host.halfWidth * 0.6 };

  const jawWeight = (p: Readonly<Vec3>, bs: number): number => {
    if (m.unterkiefer < 0.05) return 0;
    const { h, phi, r } = local(p);
    const aphi = Math.abs(phi);
    const phiC = clamp(phi, -theta, theta);
    const hl = lipHAt(phiC);
    const below = hl - h;
    const band = 0.09 * bs;
    const wBelow = smoothstep(-0.2 * band, band, below) * smoothstep(0, 0.5 * band, below + 0.3 * band);
    const wPhi = 1 - smoothstep(theta - 0.05, theta + 0.35, aphi);
    const rIn = lipRAt(phiC) * (1 - tiefe * 1.1);
    const wR = smoothstep(rIn - 0.3 * bs, rIn + 0.05 * bs, r);
    // tiefer unten (Kinn/Körper) klingt die Zugehörigkeit zum Kiefer wieder ab
    const chinDepth = (0.35 + 0.65 * m.unterkiefer) * hl * 0.9;
    const wDepth = 1 - smoothstep(chinDepth * 0.7, chinDepth * 1.3, below);
    return clamp01(wBelow * wPhi * wR * wDepth);
  };

  const geometry: MouthGeometry = {
    host,
    hLip,
    theta,
    lipLine,
    lipH,
    lipR,
    phis,
    center,
    corners,
    frame,
    gapFront,
    tiefe,
    oeffnung: m.oeffnung,
    jawHinge: { point: hingeMid, axis: hingeAxis },
    teeth,
    tongue,
    local,
    lipHAt,
    lipRAt,
    gapAt,
    jawWeight,
  };
  return { geometry, prims };
}
