import { Quaternion, Vector3 } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';

export interface BranchSegment {
  a: Vector3;
  b: Vector3;
  r0: number;
  r1: number;
  level: number;
}

export interface BranchTip {
  pos: Vector3;
  dir: Vector3;
  level: number;
}

export interface Skeleton {
  segments: BranchSegment[];
  /** Enden je Ebene (1 = Hauptäste). */
  ends: Vector3[][];
  /** Spitzen der letzten Ebene (kahle Zweige → Sternnadeln). */
  tips: BranchTip[];
  levels: number;
}

export interface SkeletonSpec {
  origin: Vector3;
  /** Radius der Hauptäste am Ansatz. */
  radius: number;
  limbs: number;
  /** Ebenen (3–4). */
  levels: number;
  /** Zielreichweite der Krone (waagrecht). */
  reach: number;
  seed: number;
  /** Neigung der Hauptäste gegen die Senkrechte in rad (min, max); Standard (0.95, 1.25) = breite, schwere Krone. */
  tilt?: [number, number];
  /** Feste Richtungen (Yaw, rad) der Hauptäste statt gleichmäßiger Verteilung. */
  yaws?: number[];
  /** Ansatz der Hauptäste unter dem Ursprung, relativ zum Radius (Standard 0.55 → die Gabel wächst aus dem Stamm). */
  startDrop?: number;
  /** Kahler Ast (Ebene 11): kein Anheben, alle Ebenen hängen leicht durch. */
  bare?: boolean;
}

const _q = new Quaternion();
const _up = new Vector3(0, 1, 0);

function rotateAround(v: Vector3, axis: Vector3, angle: number): Vector3 {
  _q.setFromAxisAngle(axis, angle);
  return v.clone().applyQuaternion(_q);
}

/**
 * L-System in Earles flachen "Hand"-Silhouetten (Ebene 11/24/35): jeder Ast fächert seine Kinder in einer
 * senkrechten Ebene auf (Ebene = Ast × Aufwärts), die Kinder kippen ihre eigene Ebene etwas heraus, Enden biegen
 * nach oben. Jeder Ast besteht aus 2–3 leicht gebogenen Teilsegmenten (Kalligrafie statt gerader Stäbe).
 */
export function growSkeleton(spec: SkeletonSpec): Skeleton {
  const rand = mulberry32(hash32('hero-skeleton', spec.seed));
  const segments: BranchSegment[] = [];
  const ends: Vector3[][] = [];
  const tips: BranchTip[] = [];
  for (let l = 0; l <= spec.levels; l++) ends.push([]);
  const lengths = [0, 0.42, 0.32, 0.2, 0.14, 0.1].map((f) => f * spec.reach);

  const branch = (pos: Vector3, dir: Vector3, len: number, r0: number, level: number, planeN: Vector3): void => {
    const parts = level <= 2 ? 3 : 2;
    const r1 = r0 * (level >= spec.levels ? 0.35 : 0.68);
    let p = pos.clone();
    let d = dir.clone();
    for (let i = 0; i < parts; i++) {
      let bend = (rand() - 0.5) * 0.36;
      if (spec.bare) {
        d = rotateAround(d, planeN, bend * 0.6);
        d.y -= 0.05;
        if (d.y > 0.3) d.y = 0.3;
        d.normalize();
      } else if (level === 1) {
        // Hauptäste: breit ausladend, heben sich nur, wenn sie fast waagrecht werden (Ebene 33/35)
        if (d.y < 0.35) bend += 0.06;
        const lifted = rotateAround(d, planeN, bend);
        const alt = rotateAround(d, planeN, -bend);
        d = lifted.y >= alt.y ? lifted : alt;
      } else if (level === 2) {
        // zweite Ebene: läuft nach außen und senkt sich leicht → die Kuppeln hängen am Rand tief
        d = rotateAround(d, planeN, bend);
        d.y -= 0.03;
        if (d.y > 0.55) d.y = 0.55;
        d.normalize();
      } else {
        // Zweige: fächern nach außen und hängen leicht (Ebene 05/24), statt wie Borsten nach oben zu stehen
        d = rotateAround(d, planeN, bend);
        d.y -= level >= spec.levels ? 0.12 : 0.05;
        if (d.y > 0.5) d.y = 0.5;
        d.normalize();
      }
      const segLen = len / parts;
      const next = p.clone().addScaledVector(d, segLen);
      const ra = r0 + (r1 - r0) * (i / parts);
      const rb = r0 + (r1 - r0) * ((i + 1) / parts);
      segments.push({ a: p, b: next, r0: ra, r1: rb, level });
      p = next;
    }
    ends[level]!.push(p.clone());
    if (level >= spec.levels) {
      tips.push({ pos: p.clone(), dir: d.clone(), level });
      return;
    }
    const count = level === 1 ? 3 + (rand() < 0.5 ? 1 : 0) : level === 2 ? 2 + (rand() < 0.6 ? 1 : 0) : 2;
    const spread = level === 1 ? 1.25 : level === 2 ? 1.05 : 0.9;
    const childR = r1 * Math.sqrt(1 / count) * (level === 1 ? 1.15 : 1.08);
    for (let c = 0; c < count; c++) {
      const s = count === 1 ? 0 : (c / (count - 1) - 0.5) * 2; // -1..1
      const angle = s * spread * 0.5 + (rand() - 0.5) * 0.22;
      const cd = rotateAround(d, planeN, angle);
      // Kind-Ebene um die Kindrichtung herauskippen → Volumen statt Scheibe
      const tilt = (rand() < 0.5 ? -1 : 1) * (0.3 + rand() * 0.45);
      const cn = rotateAround(planeN, cd, tilt).normalize();
      branch(p, cd.normalize(), lengths[level + 1]! * (0.86 + rand() * 0.28), childR, level + 1, cn);
    }
  };

  const yaw0 = rand() * Math.PI * 2;
  const [t0, t1] = spec.tilt ?? [0.95, 1.25];
  const limbs = spec.yaws ? spec.yaws.length : spec.limbs;
  const drop = spec.startDrop ?? 0.55;
  for (let i = 0; i < limbs; i++) {
    const yaw = spec.yaws ? spec.yaws[i]! : yaw0 + (i / limbs) * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const tilt = t0 + rand() * (t1 - t0);
    const dir = new Vector3(Math.sin(tilt) * Math.cos(yaw), Math.cos(tilt), Math.sin(tilt) * Math.sin(yaw)).normalize();
    const planeN = new Vector3().crossVectors(_up, dir).normalize();
    const start = spec.origin.clone().add(new Vector3(Math.cos(yaw) * 0.6, -drop, Math.sin(yaw) * 0.6).multiplyScalar(spec.radius));
    branch(start, dir, lengths[1]! * (0.9 + rand() * 0.25), spec.radius * (0.58 + rand() * 0.12), 1, planeN);
  }
  return { segments, ends, tips, levels: spec.levels };
}
