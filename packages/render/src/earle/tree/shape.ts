import { Vector3 } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { growSkeleton, type Skeleton } from './lsystem';
import { trunkProfile, type TrunkProfile, type TrunkSpec } from './trunk';

export interface Dome {
  center: Vector3;
  r: number;
  /** Abflachung (y-Skalierung), 0.55–0.7. */
  sy: number;
  /** Wachstumsrang 0..1 (innen → außen). */
  rank: number;
  /** Zufallswert für die Familienwahl im Juwelenmodus. */
  hash: number;
  /** Cluster (gestapelte Kuppeln einer Gruppe teilen den Index). */
  cluster: number;
}

export interface CrownLayoutSpec {
  /** Kandidaten für Clusterzentren in Prioritätsreihenfolge (Enden der Astebenen 2, 3, 4). */
  candidates: Vector3[];
  center: Vector3;
  crownTop: number;
  /** Oberkante der Kuppeln am Rand (tiefer als crownTop → schwere, hängende Randmassen). Standard crownTop − 0.12·R. */
  rimTop?: number;
  crownRadius: number;
  /** Ziel-Clusterzahl (20–40). */
  clusters: number;
  seed: number;
}

/**
 * Schwere Kuppelkrone (Ebene 33/16/8): Clusterzentren greedy aus den Astenden mit Mindestabstand (Lücken füllt eine
 * Sonnenblumen-Spirale), je Cluster eine Hauptkuppel plus 1–3 Schulterkuppeln. Die Oberkanten folgen einer
 * gewölbten Hülle: Scheitel oben, zum Rand hin tief hängende, größere und rundere Massen — keine flache Pilzscheibe.
 * Rang = Abstand zur Mitte (Wachstum baut die Krone von innen nach außen auf).
 */
export function layoutCrown(spec: CrownLayoutSpec): Dome[] {
  const rand = mulberry32(hash32('hero-crown', spec.seed));
  const R = spec.crownRadius;
  const c0 = spec.center;
  const rimTop = spec.rimTop ?? spec.crownTop - R * 0.12;
  const target = Math.max(4, Math.round(spec.clusters));
  const minDist = (R * 1.5) / Math.sqrt(target);
  const centres: Vector3[] = [];
  const accept = (p: Vector3): boolean => {
    const dx = p.x - c0.x;
    const dz = p.z - c0.z;
    const d = Math.hypot(dx, dz);
    const q = p.clone();
    if (d > R * 0.98) {
      q.x = c0.x + (dx / d) * R * 0.98;
      q.z = c0.z + (dz / d) * R * 0.98;
    }
    for (const c of centres) if (Math.hypot(c.x - q.x, c.z - q.z) < minDist) return false;
    centres.push(q);
    return true;
  };
  for (const p of spec.candidates) {
    if (centres.length >= target - 1) break;
    accept(p);
  }
  // Lücken: dichte Sonnenblumen-Spirale über die Kronenscheibe (von außen nach innen → der Rand schließt sich zuerst)
  const golden = Math.PI * (3 - Math.sqrt(5));
  const fill = 300;
  for (let i = fill - 1; centres.length < target - 1 && i >= 0; i--) {
    const r = R * 0.96 * Math.sqrt((i + 0.5) / fill);
    const a = i * golden + rand() * 0.15;
    accept(new Vector3(c0.x + Math.cos(a) * r, spec.crownTop, c0.z + Math.sin(a) * r));
  }

  const domes: Dome[] = [];
  const push = (c: Vector3, r: number, sy: number, cluster: number) => {
    const rank = Math.min(1, Math.hypot(c.x - c0.x, c.z - c0.z) / (R * 1.02));
    domes.push({ center: c, r, sy, rank, hash: rand(), cluster });
  };
  centres.forEach((p, ci) => {
    const rank = Math.min(1, Math.hypot(p.x - c0.x, p.z - c0.z) / R);
    const rMain = R * (0.25 + 0.04 * rank) * (0.85 + 0.3 * rand());
    const sy = 0.56 + 0.14 * rank + rand() * 0.08;
    // Randmassen hängen unterschiedlich tief → unregelmäßige, schwere Unterkante statt einer Schirmlinie
    const droop = rank > 0.55 ? rand() * R * 0.11 : 0;
    const top = spec.crownTop - (spec.crownTop - rimTop) * Math.pow(rank, 1.8) - rand() * 0.5 - droop;
    const c = new Vector3(p.x, top - rMain * sy * (0.82 + rand() * 0.18), p.z);
    push(c, rMain, sy, ci);
    const k = 1 + Math.floor(rand() * 2.999);
    const a0 = rand() * Math.PI * 2;
    for (let i = 0; i < k; i++) {
      const a = a0 + (i / k) * Math.PI * 2 + (rand() - 0.5) * 0.7;
      const rs = rMain * (0.42 + rand() * 0.24);
      const off = rMain * (0.55 + rand() * 0.3);
      push(new Vector3(c.x + Math.cos(a) * off, c.y - rMain * sy * (0.15 + rand() * 0.25) + rs * sy * 0.2, c.z + Math.sin(a) * off), rs, sy * (0.95 + rand() * 0.1), ci);
    }
  });
  // Scheitelcluster: bündig mit der Hülle (kein aufgesetzter "Kopf")
  const apex = centres.length;
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2;
    const r = R * (0.2 + rand() * 0.08);
    const sy = 0.56;
    const off = i === 0 ? 0 : R * 0.16;
    push(new Vector3(c0.x + Math.cos(a) * off, spec.crownTop - 0.4 - r * sy - i * 0.5, c0.z + Math.sin(a) * off), r, sy, apex);
  }
  domes.sort((x, y) => x.rank - y.rank);
  return domes;
}

export interface TreeShapeOptions {
  seed?: number;
  /** Stammhöhe bis zur Astgabel (Standard 16). */
  trunkHeight?: number;
  /** Kronenradius der Clusterzentren (Standard 12; sichtbare Kronenbreite ≈ 2,5·R ≈ 2× sichtbarer Stamm). */
  crownRadius?: number;
  /** Hauptäste (Standard 5). */
  limbs?: number;
  /** Astebenen 3–4 (Standard 4). */
  levels?: number;
  /** Ziel-Clusterzahl der Krone 20–40 (Standard 30). */
  clusters?: number;
  /** Windungen des Pfads um den Stamm (Standard ≈ 1.3, auf einen Hauptast ausgerichtet). */
  pathTurns?: number;
  /** Abstand Puck ↔ Rinde bzw. Kuppeloberfläche (Standard 0.9). */
  pathClearance?: number;
  /** Mesh-Auflösung des Stamms; die Form bleibt gleich. */
  quality?: 'hoch' | 'mobil';
}

/**
 * Plan des Levelpfads, den Form und Pfad teilen: Spirale um den Stamm (Ende auf einen Hauptast ausgerichtet), Rampe
 * durch ein in die Krone geschnittenes Tal hinauf aufs Kronendach, Gratwanderung am Rand.
 */
export interface PathPlan {
  startAngle: number;
  startRadius: number;
  turns: number;
  /** Winkel am Ende der Spirale (= Rampenanfang). */
  rampAngle: number;
  /** Winkel, den die Rampe überstreicht. */
  rampSweep: number;
  /** Radius der Gratwanderung. */
  ridgeRadius: number;
  clearance: number;
  /**
   * Winkelfortschritt der Spirale 0..1 bei Höhenanteil s: mehr Umlauf am breiten Fuß, steiler am dünnen oberen
   * Stamm (sonst läge ein Knotenschritt oben bei ~120° um den Stamm und die Kamera müsste herumwirbeln).
   */
  spiralAt(s: number): number;
  /** Nominelle Rampe (vor dem Anpassen an das Kronendach), s ∈ [0, 1]. */
  rampAt(s: number, out: Vector3): Vector3;
}

/** Reine Baumform ohne GPU-Objekte: Stammprofil, Astgerüst, Kuppeln. `createHeroTree` und `heroTreePath` teilen sie. */
export interface TreeShape {
  seed: number;
  H: number;
  R: number;
  crownTop: number;
  crownCenter: Vector3;
  trunkSpec: TrunkSpec;
  trunk: TrunkProfile;
  /** Astgerüst: Krone plus zwei kahle, tief angesetzte Seitenäste (Ebene 11/35) unter der Kronenmasse. */
  skeleton: Skeleton;
  /** Nur die kahlen Seitenäste (Sternnadeln an ihren Spitzen). */
  lowSkeleton: Skeleton;
  domes: Dome[];
  clusters: number;
  plan: PathPlan;
  /** Tiefste Kuppelunterkante (Kamera bleibt am Stamm darunter). */
  crownBottom: number;
}

export function computeTreeShape(o: TreeShapeOptions = {}): TreeShape {
  const seed = o.seed ?? 7;
  const H = o.trunkHeight ?? 16;
  const R = o.crownRadius ?? 12;
  const crownTop = H + R * 0.72;
  const rimTop = H + R * 0.3;
  const mobil = o.quality === 'mobil';
  const trunkSpec: TrunkSpec = {
    height: H,
    baseRadius: R * 0.25,
    topRadius: R * 0.15,
    twist: 0.7,
    lobes: 7,
    flare: 0.62,
    rings: mobil ? 30 : 44,
    segments: mobil ? 40 : 56,
    rootCount: 7,
    rootLength: R * 0.8,
    lean: R * 0.05,
    seed,
  };
  const trunk = trunkProfile(trunkSpec);
  const skeleton = growSkeleton({ origin: trunk.top, radius: trunk.topRadius, limbs: o.limbs ?? 5, levels: o.levels ?? 4, reach: R, seed });
  const crownCenter = new Vector3(trunk.top.x, crownTop, trunk.top.z);
  const plan = planPath(o, trunk, skeleton, H, R, crownTop, crownCenter);
  const candidates = [...(skeleton.ends[2] ?? []), ...(skeleton.ends[3] ?? []), ...(skeleton.ends[4] ?? [])];
  const all = layoutCrown({ candidates, center: crownCenter, crownTop, rimTop, crownRadius: R, clusters: o.clusters ?? 30, seed });
  // Tal für die Rampe: Kuppeln, die den Schlauch über der Rampe (±1,5 seitlich, bis 5 nach oben) schneiden, entfallen
  const tube: Vector3[] = [];
  const p = new Vector3();
  for (let i = 0; i <= 48; i++) {
    plan.rampAt(i / 48, p);
    for (const k of [-0.2, 1.2, 2.6, 4, 5]) tube.push(new Vector3(p.x, p.y + k, p.z));
  }
  const domes = all.filter((d) => {
    const rh = d.r + 1.5;
    const rv = d.r * d.sy + 0.4;
    for (const q of tube) {
      if (((q.x - d.center.x) / rh) ** 2 + ((q.y - d.center.y) / rv) ** 2 + ((q.z - d.center.z) / rh) ** 2 < 1) return false;
    }
    return true;
  });
  const clusters = new Set(domes.map((d) => d.cluster)).size;
  const crownBottom = Math.min(...domes.map((d) => d.center.y - d.r * d.sy));
  // Kahle Seitenäste: tief angesetzt, fast waagrecht, abseits des Pfads (+112° und +198° zur Pfadrichtung auf dieser
  // Höhe — beide weit weg von der Spirale, nie auf die Stammansicht zu)
  const lowT = 0.68;
  const pathAng = plan.startAngle + plan.turns * Math.PI * 2 * plan.spiralAt(lowT);
  const lowOrigin = trunk.axisAt(lowT * H, new Vector3());
  const lowSkeleton = growSkeleton({
    origin: lowOrigin,
    radius: trunk.rMean(lowT) * 0.55,
    limbs: 2,
    levels: 3,
    reach: R * 0.72,
    seed: seed + 101,
    tilt: [1.3, 1.45],
    yaws: [pathAng + 1.95, pathAng + 3.45],
    startDrop: 0.1,
    bare: true,
  });
  const merged: Skeleton = {
    segments: [...skeleton.segments, ...lowSkeleton.segments],
    ends: skeleton.ends,
    tips: [...skeleton.tips, ...lowSkeleton.tips],
    levels: skeleton.levels,
  };
  return { seed, H, R, crownTop, crownCenter, trunkSpec, trunk, skeleton: merged, lowSkeleton, domes, clusters, plan, crownBottom };
}

function wrapAngle(a: number): number {
  const t = (a + Math.PI) % (Math.PI * 2);
  return (t < 0 ? t + Math.PI * 2 : t) - Math.PI;
}

/** Pfadplan: Spiralende auf den nächstgelegenen Hauptast drehen, Rampe von dort über das Tal aufs Dach. */
function planPath(o: TreeShapeOptions, trunk: TrunkProfile, skeleton: Skeleton, H: number, R: number, crownTop: number, centre: Vector3): PathPlan {
  const clearance = o.pathClearance ?? 0.9;
  const start = trunk.rootTips[0];
  const startAngle = start ? Math.atan2(start.z, start.x) : 0;
  const startRadius = start ? Math.hypot(start.x, start.z) : trunk.radiusAt(0) + clearance;
  const baseTurns = o.pathTurns ?? 1.3;
  const rampSweep = 0.4;
  // Hauptäste: Richtung der ersten Segmente (Ebene 1) um die Stammspitze
  const top = trunk.top;
  const yaws = skeleton.segments.filter((sg) => sg.level === 1 && sg.a.distanceTo(top) < trunk.topRadius * 1.5 + 0.5).map((sg) => Math.atan2(sg.b.z - top.z, sg.b.x - top.x));
  let turns = baseTurns;
  if (o.pathTurns === undefined && yaws.length > 0) {
    const nominal = startAngle + baseTurns * Math.PI * 2 + rampSweep * 0.25;
    let best = 0;
    let bestAbs = Infinity;
    for (const y of yaws) {
      const d = wrapAngle(y - nominal);
      if (Math.abs(d) < bestAbs) {
        bestAbs = Math.abs(d);
        best = d;
      }
    }
    turns = baseTurns + best / (Math.PI * 2);
  }
  const rampAngle = startAngle + turns * Math.PI * 2;
  const ridgeRadius = R * 0.82;
  // Winkeldichte ∝ Radius^0.75 (kumuliert, normiert)
  const N = 200;
  const cum: number[] = [0];
  for (let i = 1; i <= N; i++) {
    const y = ((i - 0.5) / N) * H;
    cum.push(cum[i - 1]! + Math.pow(trunk.radiusAt(y) + clearance, 0.75));
  }
  const cumTotal = cum[N]!;
  const spiralAt = (s: number): number => {
    const x = Math.min(1, Math.max(0, s)) * N;
    const i = Math.min(N - 1, Math.floor(x));
    return (cum[i]! + (cum[i + 1]! - cum[i]!) * (x - i)) / cumTotal;
  };
  const axis = new Vector3();
  const r0 = trunk.surfaceAt(H, rampAngle) + clearance;
  const yEnd = crownTop + clearance;
  return {
    startAngle,
    startRadius,
    turns,
    rampAngle,
    rampSweep,
    ridgeRadius,
    clearance,
    spiralAt,
    rampAt: (s, out) => {
      const e = s * s * (3 - 2 * s);
      const ang = rampAngle + rampSweep * e;
      trunk.axisAt(H, axis);
      const cx = axis.x + (centre.x - axis.x) * e;
      const cz = axis.z + (centre.z - axis.z) * e;
      const r = r0 + (ridgeRadius - r0) * e;
      return out.set(cx + Math.cos(ang) * r, H + (yEnd - H) * e, cz + Math.sin(ang) * r);
    },
  };
}
