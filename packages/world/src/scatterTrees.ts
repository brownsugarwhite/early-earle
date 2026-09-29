import { createCapField, type CapPatchParams, type Vec3 } from './capPatch';
import { GradientNoise3 } from './noise';
import { hash32, mulberry32 } from './rng';

export type TreeKind = 'dome' | 'cone' | 'stacked';

export interface TreeInstance {
  /** Fußpunkt auf der Oberfläche (Patch-Raum). */
  position: Vec3;
  /** Oberflächennormale am Fußpunkt (= "oben" des Baums). */
  normal: Vec3;
  kind: TreeKind;
  /** Größenfaktor um 1 (0.7..1.3). */
  scale: number;
  /** Kronenradius in Welteinheiten. */
  canopyRadius: number;
  /** Stammhöhe in Welteinheiten (Fußpunkt bis Kronenansatz). */
  trunkHeight: number;
  /** Zentrum der Hüllkugel, von der die Kronen-Normalen kopiert werden. */
  hullCenter: Vec3;
  /** Wachstumsrang 0..1: Instanz i wird sichtbar, sobald growth > growth_i. Liste ist danach sortiert. */
  growth: number;
}

export interface ScatterParams {
  seed: number;
  /** Obergrenze der Bäume (Poisson-Disc kann weniger liefern). */
  count: number;
  /** Mindestabstand in Welteinheiten (am Scheitel). */
  minDist: number;
  cap: CapPatchParams;
  /** 0 = gleichmäßig verteilt, 1 = nur in Waldflecken (dunkle Kuppel-Cluster wie bei Earle). Standard 0.6. */
  clumpiness?: number;
  /** Anteile der Kronenformen. Standard dome 0.62, cone 0.2, stacked 0.18. */
  kindWeights?: { dome: number; cone: number; stacked: number };
  /** Rand in uv, in dem keine Bäume stehen (Standard 0.06). */
  edgeMargin?: number;
}

/** Proportionen je Kronenform (Einheit = Kronenradius): Stammhöhe, Hüllzentrum-Höhe über dem Fußpunkt. */
export const TREE_PROPORTIONS: Record<TreeKind, { radius: number; trunk: number; hull: number; top: number }> = {
  dome: { radius: 0.7, trunk: 0.82, hull: 1.37, top: 2.1 },
  cone: { radius: 0.5, trunk: 0.62, hull: 1.5, top: 2.85 },
  stacked: { radius: 0.55, trunk: 0.78, hull: 1.8, top: 3.1 },
};

/**
 * Poisson-Disc-Streuung (Bridson) im gnomonischen uv-Raum, danach Waldmasken-Filter, deterministische
 * Zufallsreihenfolge und Wachstumspriorität (Mitte zuerst, verrauscht). Gleicher Seed → gleiche Liste.
 */
export function scatterTrees(params: ScatterParams): TreeInstance[] {
  const field = createCapField(params.cap);
  const rand = mulberry32(hash32('trees', params.seed, params.cap.seed));
  const mask = new GradientNoise3(hash32('forest', params.seed));
  const clump = params.clumpiness ?? 0.6;
  const margin = params.edgeMargin ?? 0.06;
  const weights = params.kindWeights ?? { dome: 0.62, cone: 0.2, stacked: 0.18 };
  const halfExtent = field.params.radius * Math.tan((field.params.arcDeg * 0.5 * Math.PI) / 180);
  const r = Math.max(1e-3, params.minDist / halfExtent); // Mindestabstand in uv
  const lo = -1 + margin;
  const hi = 1 - margin;

  // Bridson
  const cell = r / Math.SQRT2;
  const gridN = Math.ceil((hi - lo) / cell) + 1;
  const grid = new Int32Array(gridN * gridN).fill(-1);
  const pts: Array<[number, number]> = [];
  const active: number[] = [];
  const gi = (x: number, y: number) => Math.floor((y - lo) / cell) * gridN + Math.floor((x - lo) / cell);
  const fits = (x: number, y: number): boolean => {
    if (x < lo || x > hi || y < lo || y > hi) return false;
    const cx = Math.floor((x - lo) / cell);
    const cy = Math.floor((y - lo) / cell);
    for (let j = Math.max(0, cy - 2); j <= Math.min(gridN - 1, cy + 2); j++) {
      for (let i = Math.max(0, cx - 2); i <= Math.min(gridN - 1, cx + 2); i++) {
        const idx = grid[j * gridN + i]!;
        if (idx >= 0) {
          const q = pts[idx]!;
          const dx = q[0] - x;
          const dy = q[1] - y;
          if (dx * dx + dy * dy < r * r) return false;
        }
      }
    }
    return true;
  };
  const push = (x: number, y: number) => {
    pts.push([x, y]);
    grid[gi(x, y)] = pts.length - 1;
    active.push(pts.length - 1);
  };
  push(lo + rand() * (hi - lo), lo + rand() * (hi - lo));
  const maxPoints = Math.max(params.count * 8, 4000);
  while (active.length > 0 && pts.length < maxPoints) {
    const ai = Math.floor(rand() * active.length);
    const base = pts[active[ai]!]!;
    let placed = false;
    for (let k = 0; k < 24; k++) {
      const ang = rand() * Math.PI * 2;
      const dist = r * (1 + rand());
      const x = base[0] + Math.cos(ang) * dist;
      const y = base[1] + Math.sin(ang) * dist;
      if (fits(x, y)) {
        push(x, y);
        placed = true;
        break;
      }
    }
    if (!placed) {
      active[ai] = active[active.length - 1]!;
      active.pop();
    }
  }

  // Waldmaske: Cluster statt Gleichverteilung
  const dir: Vec3 = [0, 0, 0];
  const accepted: Array<[number, number]> = [];
  const freq = field.params.radius / (field.params.hillWavelength * 1.6);
  for (const q of pts) {
    field.direction(q[0], q[1], dir);
    const m = 0.5 + 0.5 * mask.fbm(dir[0] * freq + 3.3, dir[1] * freq, dir[2] * freq - 7.1, 2);
    const forest = smoothstep(0.42, 0.6, m);
    const pAccept = (1 - clump) + clump * forest;
    if (rand() < pAccept) accepted.push(q);
  }

  // Deterministisch mischen, dann auf count begrenzen
  for (let i = accepted.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = accepted[i]!;
    accepted[i] = accepted[j]!;
    accepted[j] = t;
  }
  const chosen = accepted.slice(0, Math.max(0, Math.floor(params.count)));

  const total = weights.dome + weights.cone + weights.stacked;
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const raw: Array<{ inst: TreeInstance; priority: number }> = [];
  for (const q of chosen) {
    field.surface(q[0], q[1], pos, nor);
    const w = rand() * total;
    const kind: TreeKind = w < weights.dome ? 'dome' : w < weights.dome + weights.cone ? 'cone' : 'stacked';
    const scale = 0.7 + 0.6 * rand() * rand() + 0.3 * rand(); // 0.7..1.6, Schwerpunkt um 1
    const prop = TREE_PROPORTIONS[kind];
    const canopyRadius = prop.radius * scale;
    const trunkHeight = prop.trunk * canopyRadius;
    const hullH = prop.hull * canopyRadius;
    const hullCenter: Vec3 = [pos[0] + nor[0] * hullH, pos[1] + nor[1] * hullH, pos[2] + nor[2] * hullH];
    const distCentre = Math.hypot(q[0], q[1]) / Math.SQRT2;
    raw.push({
      inst: {
        position: [pos[0], pos[1], pos[2]],
        normal: [nor[0], nor[1], nor[2]],
        kind,
        scale,
        canopyRadius,
        trunkHeight,
        hullCenter,
        growth: 0,
      },
      priority: 0.7 * rand() + 0.3 * distCentre,
    });
  }
  raw.sort((a, b) => a.priority - b.priority);
  const n = raw.length;
  return raw.map((e, i) => ({ ...e.inst, growth: n > 0 ? i / n : 0 }));
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
