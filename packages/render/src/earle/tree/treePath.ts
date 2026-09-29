import { Matrix3, Vector3 } from 'three/webgpu';
import type { Matrix4 } from 'three/webgpu';
import type { Vec3 } from '@ee/world';
import { computeTreeShape, type TreeShape, type TreeShapeOptions } from './shape';

export type HeroPathPhase = 'trunk' | 'ramp' | 'crown';

/** Strukturell kompatibel mit dem `PathNode` des Flows (u = Winkel/π, v = Höhe relativ zum Kronendach). */
export interface HeroPathNode {
  index: number;
  u: number;
  v: number;
  position: Vec3;
  normal: Vec3;
  phase: HeroPathPhase;
  /** Kurvenparameter 0..1. */
  t: number;
}

export interface HeroPathDot {
  position: Vec3;
  normal: Vec3;
}

export interface HeroRailSample {
  position: Vec3;
  lookAt: Vec3;
}

export interface HeroTreePath {
  nodes: HeroPathNode[];
  dots: HeroPathDot[];
  /** Gesamtlänge in Welteinheiten. */
  length: number;
  rail: HeroRailSample[];
  /** Kamerafahrt 0..1 (Catmull-Rom über die Schienenproben) → Position und Blickpunkt. */
  sampleRail(t: number, outPos: Vector3, outLook: Vector3): void;
  /** Schienenparameter, bei dem die Kamera auf Knoten `index` blickt. */
  railTForNode(index: number): number;
  /** Punkt der Pfadkurve bei Parameter t (0..1, nach Bogenlänge). */
  curveAt(t: number, out: Vector3): Vector3;
}

export interface HeroTreePathOptions extends TreeShapeOptions {
  /** Zahl der Levelknoten. */
  nodes: number;
  /** Vorberechnete Baumform (sonst aus seed/trunkHeight/crownRadius/… wie `createHeroTree`). */
  shape?: TreeShape;
  /** Bogen der Gratwanderung über die Krone in Grad (Standard 300). */
  ridgeSweepDeg?: number;
  dotSpacing?: number;
  dotClearance?: number;
  /** Kameraschiene: Abstand am Stamm/auf der Krone und Höhe über dem Knoten am Stamm (Krone: +6). */
  rail?: { trunkDistance?: number; crownDistance?: number; height?: number };
}

const _a = new Vector3();

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/**
 * Levelpfad des Riesenbaums in Baumkoordinaten (Fuß im Ursprung, +Y oben): von einer Wurzelspitze spiralig den
 * Stamm hinauf (Pucks als Konsolen dicht an der Rinde, folgen den Lappen), über eine Rampe aufs Kronendach und dann
 * als Gratwanderung am Kronenrand entlang (Höhe = Oberkante der Kuppel darunter). Dazu die Kameraschiene
 * (Position + Blickpunkt): hinter dem Knoten, eng am Stamm, weiter außen und höher über der Krone.
 * `heroTreePath({ nodes: 24 })` liefert denselben Pfad wie `createHeroTree().path` mit Standardwerten.
 */
export function heroTreePath(o: HeroTreePathOptions): HeroTreePath {
  const shape = o.shape ?? computeTreeShape(o);
  const trunk = shape.trunk;
  const plan = shape.plan;
  const sweep = ((o.ridgeSweepDeg ?? 300) * Math.PI) / 180;
  const clearance = plan.clearance;
  const dotSpacing = o.dotSpacing ?? 0.6;
  const dotClearance = o.dotClearance ?? 0.95;
  const centre = shape.crownCenter;
  const H = shape.H;
  const R = plan.ridgeRadius;
  const crownTop = shape.crownTop;
  const tA = 0.36; // Ende der Spirale
  const tB = 0.47; // Ende der Rampe
  const domes = shape.domes;

  /** Höhe des Kronendachs unter (x, z): Oberkante der höchsten Kuppel dort, sonst `fallback`. */
  const roofAt = (x: number, z: number, fallback: number): { y: number; nx: number; nz: number } => {
    let best = -Infinity;
    let nx = 0;
    let nz = 0;
    for (const d of domes) {
      const dx = x - d.center.x;
      const dz = z - d.center.z;
      const q = 1 - (dx * dx + dz * dz) / (d.r * d.r);
      if (q <= 0) continue;
      const y = d.center.y + d.r * d.sy * Math.sqrt(q);
      if (y > best) {
        best = y;
        const len = Math.hypot(dx / d.r, Math.sqrt(q) / d.sy, dz / d.r) || 1;
        nx = dx / d.r / len;
        nz = dz / d.r / len;
      }
    }
    return best === -Infinity ? { y: fallback, nx: 0, nz: 0 } : { y: best, nx, nz };
  };

  /** Wie `roofAt`, aber nur Kuppeln, die der Punkt in Höhe `y` durchstoßen würde (überhängende Kuppeln unterquert er). */
  const supportAt = (x: number, y: number, z: number): { y: number; nx: number; nz: number } => {
    let best = -Infinity;
    let nx = 0;
    let nz = 0;
    for (const d of domes) {
      const dx = x - d.center.x;
      const dz = z - d.center.z;
      const q = 1 - (dx * dx + dz * dz) / (d.r * d.r);
      if (q <= 0) continue;
      const h = d.r * d.sy * Math.sqrt(q);
      if (y < d.center.y - h - clearance) continue; // Kuppel liegt ganz über dem Pfad
      const top = d.center.y + h;
      if (top > best) {
        best = top;
        const len = Math.hypot(dx / d.r, Math.sqrt(q) / d.sy, dz / d.r) || 1;
        nx = dx / d.r / len;
        nz = dz / d.r / len;
      }
    }
    return { y: best, nx, nz };
  };

  // Rampenende: Höhe des Dachs am Beginn der Gratwanderung (die nominelle Rampe endet auf crownTop + clearance)
  const rampEnd = plan.rampAt(1, new Vector3());
  const endLift = roofAt(rampEnd.x, rampEnd.z, crownTop).y + clearance - rampEnd.y;
  const ridgeStart = plan.rampAngle + plan.rampSweep;

  const curve = (t: number, out: Vector3, normal: Vector3): void => {
    if (t <= tA) {
      const s = t / tA;
      const y = s * H;
      const ang = plan.startAngle + plan.turns * Math.PI * 2 * plan.spiralAt(s);
      const r0 = trunk.surfaceAt(y, ang) + clearance;
      // Anfang: von der Wurzelspitze zum Stamm einschwenken
      const k = Math.min(1, s / 0.12);
      const e = k * k * (3 - 2 * k);
      const r = plan.startRadius + (r0 - plan.startRadius) * e;
      trunk.axisAt(y, _a);
      out.set(_a.x + Math.cos(ang) * r, y, _a.z + Math.sin(ang) * r);
      normal.set(0, 1, 0);
      return;
    }
    if (t <= tB) {
      // Rampe durch das Tal in der Krone; darunterliegende Kuppeln werden überstiegen
      const s = (t - tA) / (tB - tA);
      plan.rampAt(s, out);
      const e = s * s * (3 - 2 * s);
      out.y += endLift * e;
      const support = supportAt(out.x, out.y, out.z);
      out.y = Math.max(out.y, support.y + clearance);
      normal.set(support.nx * 0.4, 1, support.nz * 0.4).normalize();
      return;
    }
    const s = (t - tB) / (1 - tB);
    const ang = ridgeStart + sweep * s;
    const wobble = 1 + 0.06 * Math.sin(s * Math.PI * 7);
    const x = centre.x + Math.cos(ang) * R * wobble;
    const z = centre.z + Math.sin(ang) * R * wobble;
    const roof = roofAt(x, z, crownTop - 1.5);
    out.set(x, roof.y + clearance, z);
    normal.set(roof.nx * 0.45, 1, roof.nz * 0.45).normalize();
  };

  // Feine Polylinie; Höhen auf Rampe und Krone geglättet (Kuppelwechsel → keine Knicke)
  const steps = 1500;
  const samples: Array<{ t: number; pos: Vector3; nor: Vector3; len: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pos = new Vector3();
    const nor = new Vector3();
    curve(t, pos, nor);
    samples.push({ t, pos, nor, len: 0 });
  }
  const ys = samples.map((s) => s.pos.y);
  const win = 10;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i]!.t <= tA) continue;
    let acc = 0;
    let cnt = 0;
    for (let k = -win; k <= win; k++) {
      const j = i + k;
      if (j < 0 || j >= ys.length) continue;
      acc += ys[j]!;
      cnt++;
    }
    samples[i]!.pos.y = acc / cnt;
  }
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    total += samples[i]!.pos.distanceTo(samples[i - 1]!.pos);
    samples[i]!.len = total;
  }
  const at = (len: number) => {
    const target = Math.min(total, Math.max(0, len));
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid]!.len <= target) lo = mid;
      else hi = mid;
    }
    const a = samples[lo]!;
    const b = samples[hi]!;
    const f = b.len > a.len ? (target - a.len) / (b.len - a.len) : 0;
    return { t: a.t + (b.t - a.t) * f, pos: a.pos.clone().lerp(b.pos, f), nor: a.nor.clone().lerp(b.nor, f).normalize() };
  };

  const n = Math.max(2, o.nodes);
  const nodes: HeroPathNode[] = [];
  for (let i = 0; i < n; i++) {
    const { t, pos, nor } = at((i / (n - 1)) * total);
    const phase: HeroPathPhase = t <= tA ? 'trunk' : t <= tB ? 'ramp' : 'crown';
    nodes.push({ index: i, u: Math.atan2(pos.z, pos.x) / Math.PI, v: pos.y / crownTop, position: [pos.x, pos.y, pos.z], normal: [nor.x, nor.y, nor.z], phase, t });
  }
  const dots: HeroPathDot[] = [];
  for (let len = dotSpacing * 0.5; len < total; len += dotSpacing) {
    const { pos, nor } = at(len);
    let near = false;
    for (const node of nodes) {
      if (Math.hypot(pos.x - node.position[0], pos.y - node.position[1], pos.z - node.position[2]) < dotClearance) {
        near = true;
        break;
      }
    }
    if (!near) dots.push({ position: [pos.x, pos.y, pos.z], normal: [nor.x, nor.y, nor.z] });
  }

  // Kameraschiene in Zylinderkoordinaten um die Kronenachse (Winkel, Radius, Höhe): hinter dem Knoten und außen;
  // am Stamm unter dem Kronendach mit leichtem Blick nach oben, auf der Krone höher und weiter draußen mit Blick
  // voraus über den Grat; im Übergang ein Kran über dem Tal, der hinab zum Knoten blickt. Glätten und Hinausschieben
  // (nie in einer Kuppel) wirken auf Winkel/Radius/Höhe — kein Abschneiden von Kurven, keine Sprünge.
  const railN = 120;
  const trunkDist = o.rail?.trunkDistance ?? 16;
  const crownDist = o.rail?.crownDistance ?? 17;
  const trunkH = o.rail?.height ?? 5;
  const crownH = trunkH + 6;
  const cx = centre.x;
  const cz = centre.z;
  const insideDomes = (x: number, y: number, z: number, pad: number): boolean => {
    for (const d of domes) {
      const rh = d.r + pad;
      const rv = d.r * d.sy + pad;
      if (((x - d.center.x) / rh) ** 2 + ((y - d.center.y) / rv) ** 2 + ((z - d.center.z) / rh) ** 2 < 1) return true;
    }
    return false;
  };
  const wrap = (a: number): number => {
    const t = (a + Math.PI) % (Math.PI * 2);
    return (t < 0 ? t + Math.PI * 2 : t) - Math.PI;
  };
  const smoothBand = (t: number, a: number, b: number, fade: number): number => {
    const up = Math.min(1, Math.max(0, (t - (a - fade)) / fade));
    const down = Math.min(1, Math.max(0, (b + fade - t) / fade));
    const k = Math.min(up, down);
    return k * k * (3 - 2 * k);
  };
  const yCap = shape.crownBottom - 1; // am Stamm bleibt die Kamera unter dem Kronendach
  const craneAng = plan.rampAngle + plan.rampSweep * 0.5;
  const craneR = R + 12;
  const craneY = crownTop + 7;
  const th: number[] = [];
  const rr: number[] = [];
  const hh: number[] = [];
  const looks: Vector3[] = [];
  for (let i = 0; i <= railN; i++) {
    const len = (i / railN) * total;
    const { t, pos } = at(len);
    const w = t <= tA ? 0 : t >= tB ? 1 : (t - tA) / (tB - tA);
    const ahead = at(Math.min(total, len + 4 + 4 * w)).pos;
    const nodeAng = Math.atan2(pos.z - cz, pos.x - cx);
    const nodeR = Math.hypot(pos.x - cx, pos.z - cz);
    let ang = nodeAng - (0.9 - 0.55 * w);
    let rad = nodeR + trunkDist + (crownDist - trunkDist) * w;
    const yTrunk = Math.min(pos.y + trunkH, yCap);
    let y = yTrunk + (pos.y + crownH - yTrunk) * w;
    const look = ahead.clone().lerp(pos, 0.3);
    look.y += 1.5 * (1 - w);
    const v = smoothBand(t, tA - 0.035, tB - 0.03, 0.05);
    ang += wrap(craneAng - ang) * v;
    rad += (craneR - rad) * v;
    y += (craneY - y) * v;
    look.lerp(new Vector3(pos.x, pos.y + 0.5, pos.z), v);
    // Winkel stetig abwickeln
    const prev = th[th.length - 1];
    th.push(prev === undefined ? ang : prev + wrap(ang - prev));
    rr.push(rad);
    hh.push(y);
    looks.push(look);
  }
  const smooth1 = (arr: number[], k: number): number[] =>
    arr.map((_, i) => {
      let acc = 0;
      let c = 0;
      for (let j = i - k; j <= i + k; j++) {
        const v = arr[j];
        if (v === undefined) continue;
        acc += v;
        c++;
      }
      return acc / c;
    });
  const pushOut = (thS: number[], rS: number[], hS: number[], pad: number): void => {
    for (let i = 0; i < rS.length; i++) {
      for (let k = 0; k < 120 && insideDomes(cx + Math.cos(thS[i]!) * rS[i]!, hS[i]!, cz + Math.sin(thS[i]!) * rS[i]!, pad); k++) rS[i]! += 0.3;
    }
  };
  const thS = smooth1(th, 5);
  const hS = smooth1(hh, 4);
  let rS = smooth1(rr, 4);
  pushOut(thS, rS, hS, 1.6);
  rS = smooth1(rS, 3);
  pushOut(thS, rS, hS, 1.2);
  const lookS = looks.map((_, i) => {
    const acc = new Vector3();
    let c = 0;
    for (let j = i - 3; j <= i + 3; j++) {
      const v = looks[j];
      if (!v) continue;
      acc.add(v);
      c++;
    }
    return acc.divideScalar(c);
  });
  const rail: HeroRailSample[] = thS.map((a, i) => ({
    position: [cx + Math.cos(a) * rS[i]!, hS[i]!, cz + Math.sin(a) * rS[i]!],
    lookAt: [lookS[i]!.x, lookS[i]!.y, lookS[i]!.z],
  }));

  return makePath(nodes, dots, total, rail, (t, out) => out.copy(at(Math.min(1, Math.max(0, t)) * total).pos));
}

function makePath(nodes: HeroPathNode[], dots: HeroPathDot[], length: number, rail: HeroRailSample[], curveAt: (t: number, out: Vector3) => Vector3): HeroTreePath {
  return {
    nodes,
    dots,
    length,
    rail,
    curveAt,
    sampleRail: (t, outPos, outLook) => {
      const x = Math.min(1, Math.max(0, t)) * (rail.length - 1);
      const i1 = Math.min(rail.length - 1, Math.floor(x));
      const f = x - i1;
      const s0 = rail[Math.max(0, i1 - 1)]!;
      const s1 = rail[i1]!;
      const s2 = rail[Math.min(rail.length - 1, i1 + 1)]!;
      const s3 = rail[Math.min(rail.length - 1, i1 + 2)]!;
      for (let c = 0; c < 3; c++) {
        outPos.setComponent(c, catmull(s0.position[c]!, s1.position[c]!, s2.position[c]!, s3.position[c]!, f));
        outLook.setComponent(c, catmull(s0.lookAt[c]!, s1.lookAt[c]!, s2.lookAt[c]!, s3.lookAt[c]!, f));
      }
    },
    // Die Schiene ist nach Bogenlänge parametrisiert wie die Knoten → Knoten i liegt bei i/(n-1)
    railTForNode: (index) => (nodes.length > 1 ? Math.min(1, Math.max(0, index / (nodes.length - 1))) : 0),
  };
}

const _p = new Vector3();
const _n = new Vector3();
const _m3 = new Matrix3();

/**
 * Pfad in einen anderen Raum übertragen (z. B. Baumkoordinaten → Planetenraum über die Matrix des Landmark-Slots):
 * Knoten, Punkte, Schiene und Kurve; Normalen mit der Normalenmatrix.
 */
export function transformHeroTreePath(path: HeroTreePath, m: Matrix4): HeroTreePath {
  _m3.getNormalMatrix(m);
  const tp = (v: Vec3): Vec3 => {
    _p.set(v[0], v[1], v[2]).applyMatrix4(m);
    return [_p.x, _p.y, _p.z];
  };
  const tn = (v: Vec3): Vec3 => {
    _n.set(v[0], v[1], v[2]).applyMatrix3(_m3).normalize();
    return [_n.x, _n.y, _n.z];
  };
  const nodes = path.nodes.map((nd) => ({ ...nd, position: tp(nd.position), normal: tn(nd.normal) }));
  const dots = path.dots.map((d) => ({ position: tp(d.position), normal: tn(d.normal) }));
  const rail = path.rail.map((r) => ({ position: tp(r.position), lookAt: tp(r.lookAt) }));
  const scale = Math.cbrt(Math.abs(m.determinant())) || 1;
  const mc = m.clone();
  return makePath(nodes, dots, path.length * scale, rail, (t, out) => path.curveAt(t, out).applyMatrix4(mc));
}
