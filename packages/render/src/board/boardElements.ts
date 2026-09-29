import { CELL_PILLAR, FLOOR_CURRENT, FLOOR_DEEP_WITHERED, FLOOR_OIL, FLOOR_PORTAL, FLOOR_SPORE, FLOOR_WITHERED, type LevelState } from '@ee/core';
import { mixHex, scaleForTier } from '@ee/genome';
import { CELL_KIND_DEEP, CELL_KIND_OIL, CELL_KIND_STONE, CELL_KIND_WITHERED } from './BoardCells';
import { MOTIF, type PropDesc } from './BoardProps';
import type { BoardPalette } from './boardPalette';

/** Board metrics shared by the element vocabulary, the blobs and the choreography (board-local units). */
export interface BoardLayout {
  w: number;
  h: number;
  cell: number;
  pitch: number;
  /** Plate thickness: props stand on `top`. */
  top: number;
  cellToLocal(x: number, y: number): [number, number];
  /** z of the far ledge where the goal totems stand. */
  goalZ: number;
}

/** Direction index (0 up, 1 down, 2 left, 3 right) → board-local xz unit vector. */
export const DIR_XZ: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/** Deterministic 0..1 jitter per (cell, salt). */
export function jitter(i: number, salt: number): number {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface StreamDot {
  key: string;
  x: number;
  z: number;
  dx: number;
  dz: number;
  k: number;
}

export interface GoalLabel {
  x: number;
  y: number;
  z: number;
  tier: number;
}

export interface ElementSet {
  props: Map<string, PropDesc>;
  /** Current-floor dots that the renderer animates along their direction every frame. */
  streams: StreamDot[];
  goalLabels: GoalLabel[];
}

export interface ElementOptions {
  /** Cells that healed during this level (keep the green look after the floor code is gone). */
  healed: ReadonlySet<number>;
  tierColor: (tier: number) => string;
}

/** Tiny blossoms on a healed cell: four petal discs and a centre dot (popped by the heal choreography). */
export function blossomDescs(i: number, px: number, pz: number, layout: BoardLayout, palette: BoardPalette): Map<string, PropDesc> {
  const out = new Map<string, PropDesc>();
  const colors = [palette.pink, palette.paper, palette.neon, palette.pink];
  for (let k = 0; k < 4; k++) {
    const a = jitter(i, 200 + k) * Math.PI * 2;
    const r = (0.14 + jitter(i, 210 + k) * 0.2) * layout.cell;
    const size = (0.075 + jitter(i, 220 + k) * 0.05) * layout.cell;
    out.set(`blossom:${i}:${k}`, {
      family: 'disc',
      x: px + Math.cos(a) * r,
      y: layout.top + 0.06,
      z: pz + Math.sin(a) * r,
      rx: (jitter(i, 230 + k) - 0.5) * 0.5,
      rz: (jitter(i, 240 + k) - 0.5) * 0.5,
      sx: size,
      sy: 0.02,
      sz: size,
      color: colors[k]!,
      idle: { kind: 'sway', speed: 1.1 + k * 0.3, amp: 0.12, phase: k * 1.7 },
      delay: k * 0.06,
    });
    out.set(`blossomStem:${i}:${k}`, {
      family: 'box',
      x: px + Math.cos(a) * r,
      y: layout.top,
      z: pz + Math.sin(a) * r,
      sx: 0.018,
      sy: 0.065,
      sz: 0.018,
      color: palette.healedLine,
      delay: k * 0.06,
    });
  }
  return out;
}

export function cellKindForFloor(code: number): number {
  switch (code) {
    case FLOOR_WITHERED:
      return CELL_KIND_WITHERED;
    case FLOOR_DEEP_WITHERED:
      return CELL_KIND_DEEP;
    case FLOOR_OIL:
      return CELL_KIND_OIL;
    default:
      return CELL_KIND_STONE;
  }
}

/**
 * The element vocabulary: reads a `LevelState` and describes every element as prop instances keyed by
 * `kind:cell:part`, so the renderer can diff two states (new keys pop in, missing keys animate out).
 *
 * - Schrott: dark hatched hex mounds, one layer per remaining layer, a rust shard of junk on top
 * - Schrottberg 2×2: rust monolith (tapered hex, vertical striations, one tally row per layer) on a stepped plinth
 * - Pfeiler: black faceted spire with a lit tip, a rock at its foot
 * - Fossilwand: five thin ink slats along the edge, uneven heights
 * - Kruste / Schläfer / Käfig: see the blob attachments (crust shards, zzz + lid) and the vine cage bars here
 * - Nebelzelle: three pale fog stripes drifting over the cell
 * - Verdorrt / tief: cracked soil is the plate itself (BoardCells), blossoms pop on heal
 * - Spore: glowing seed pod with a stem
 * - Öl: the plate itself (ink pool with light bands)
 * - Gasstrom: two ink vents and a stream of paper dots drifting along the flow
 * - Rohrpaar: teal ring around an ink disc with a rotating swirl
 * - Fäulnis: dark violet growth disc with a dotted rim and a pulsing core
 * - Giftwolke: three sick-green puffs over a countdown ring (arc = remaining moves)
 * - Gasquelle: ink crater with a teal rim and a vent cone in the centre
 * - Ziele: one totem per goal on the far ledge, shown as the element itself
 */
export function collectElements(state: LevelState, layout: BoardLayout, palette: BoardPalette, opts: ElementOptions): ElementSet {
  const props = new Map<string, PropDesc>();
  const streams: StreamDot[] = [];
  const goalLabels: GoalLabel[] = [];
  const { w, h, cell: CELL, pitch: PITCH, top: TOP } = layout;
  const geo = state.geo;
  const moundsDone = new Set<number>();
  const ink = palette.ink;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const type = geo.cellType[i] ?? 0;
      if (type === 0) continue;
      const [px, pz] = layout.cellToLocal(x, y);
      const j = (salt: number) => jitter(i, salt);

      if (type === CELL_PILLAR) {
        // Black rock spire cluster (Earle's faceted needles): one tall spire, two leaning companions.
        const rock = mixHex(ink, palette.violet, 0.12);
        props.set(`pillar:${i}`, {
          family: 'spire',
          x: px - 0.04 * CELL,
          y: 0,
          z: pz,
          ry: j(1) * Math.PI,
          sx: CELL * 0.6,
          sy: 1.02 + j(2) * 0.2,
          sz: CELL * 0.6,
          color: ink,
          motif: MOTIF.tipLight,
        });
        props.set(`pillarB:${i}`, {
          family: 'spire',
          x: px + 0.24 * CELL,
          y: 0,
          z: pz + 0.12 * CELL,
          ry: j(3) * 2,
          rz: -0.16,
          sx: CELL * 0.36,
          sy: 0.58 + j(4) * 0.12,
          sz: CELL * 0.36,
          color: rock,
          motif: MOTIF.tipLight,
          delay: 0.05,
        });
        props.set(`pillarC:${i}`, {
          family: 'spire',
          x: px - 0.2 * CELL,
          y: 0,
          z: pz + 0.22 * CELL,
          ry: j(5) * 2,
          rx: 0.14,
          sx: CELL * 0.26,
          sy: 0.36 + j(6) * 0.1,
          sz: CELL * 0.26,
          color: mixHex(rock, ink, 0.4),
          motif: MOTIF.tipLight,
          delay: 0.09,
        });
        continue;
      }

      // --- scrap layers ---------------------------------------------------------------------------
      const m = state.mound[i] ?? -1;
      const layers = state.scrap[i] ?? 0;
      if (m < 0 && layers > 0) {
        for (let l = 0; l < layers; l++) {
          const size = CELL * (0.8 - 0.11 * l);
          props.set(`scrap:${i}:${l}`, {
            family: 'hex',
            x: px + (j(10 + l) - 0.5) * 0.05,
            y: TOP + l * 0.15,
            z: pz + (j(20 + l) - 0.5) * 0.05,
            ry: l * 0.55 + j(30 + l) * 0.4,
            sx: size,
            sy: 0.155,
            sz: size,
            color: l % 2 ? mixHex(palette.scrap, palette.rustDeep, 0.25) : palette.scrap,
            motif: MOTIF.hatchV,
            hatch: 7,
            delay: l * 0.05,
          });
        }
        props.set(`scrapJunk:${i}`, {
          family: 'shard',
          x: px + (j(40) - 0.5) * 0.18,
          y: TOP + layers * 0.15,
          z: pz + (j(41) - 0.5) * 0.18,
          ry: j(42) * 3,
          sx: 0.14 * CELL,
          sy: 0.2 * CELL,
          sz: 0.14 * CELL,
          color: palette.rust,
          motif: MOTIF.tipLight,
          delay: layers * 0.05,
        });
      }
      if (m >= 0 && !moundsDone.has(m)) {
        moundsDone.add(m);
        let cx = 0;
        let cz = 0;
        let n = 0;
        for (let k = 0; k < geo.n; k++) {
          if (state.mound[k] !== m) continue;
          const [qx, qz] = layout.cellToLocal(k % w, Math.floor(k / w));
          cx += qx;
          cz += qz;
          n++;
        }
        cx /= Math.max(1, n);
        cz /= Math.max(1, n);
        const mLayers = state.moundLayers[m] ?? 4;
        const height = 0.34 + 0.13 * mLayers;
        props.set(`moundBase:${m}`, {
          family: 'hex',
          x: cx,
          y: TOP,
          z: cz,
          ry: 0.26,
          sx: 1.85 * CELL,
          sy: 0.14,
          sz: 1.85 * CELL,
          color: palette.rustDeep,
          motif: MOTIF.tower,
          hatch: 30,
          param: 1,
        });
        props.set(`moundStep:${m}`, {
          family: 'hex',
          x: cx,
          y: TOP + 0.14,
          z: cz,
          ry: 0.26,
          sx: 1.45 * CELL,
          sy: 0.16,
          sz: 1.45 * CELL,
          color: mixHex(palette.rust, palette.rustDeep, 0.4),
          motif: MOTIF.tower,
          hatch: 24,
          param: 1,
          delay: 0.04,
        });
        props.set(`mound:${m}`, {
          family: 'hex',
          x: cx,
          y: TOP + 0.3,
          z: cz,
          ry: 0.26,
          sx: 1.0 * CELL,
          sy: height,
          sz: 1.0 * CELL,
          color: palette.rust,
          motif: MOTIF.tower,
          hatch: 18,
          param: mLayers,
          delay: 0.08,
        });
      }

      // --- fences (dedupe: up and left edges of this cell) ---------------------------------------
      const fence = geo.fence[i] ?? 0;
      for (const d of [0, 2]) {
        if (!(fence & (1 << d))) continue;
        const ex = d === 2 ? px - PITCH / 2 : px;
        const ez = d === 0 ? pz - PITCH / 2 : pz;
        // Fossil wall: a row of thin ink slats of uneven height, slightly askew (no rail, no outline).
        for (let k = 0; k < 6; k++) {
          const t = ((k - 2.5) / 6) * PITCH * 0.92;
          const hgt = 0.34 + jitter(i * 4 + d, 50 + k) * 0.26;
          props.set(`fence:${i}:${d}:${k}`, {
            family: 'box',
            x: ex + (d === 0 ? t : 0),
            y: 0,
            z: ez + (d === 2 ? t : 0),
            rx: (jitter(i * 4 + d, 60 + k) - 0.5) * 0.16,
            rz: (jitter(i * 4 + d, 70 + k) - 0.5) * 0.16,
            sx: d === 0 ? 0.055 : 0.075,
            sy: hgt,
            sz: d === 0 ? 0.075 : 0.055,
            color: k % 2 ? mixHex(ink, palette.paper, 0.08) : ink,
            motif: MOTIF.tipLight,
            delay: k * 0.03,
          });
        }
      }

      // --- floors -------------------------------------------------------------------------------
      const floor = state.floor[i] ?? 0;
      if (floor === FLOOR_SPORE) {
        // Buried spore: a glowing seed pod on a bent stem, a halo disc of light around it on the soil.
        props.set(`sporeHalo:${i}`, {
          family: 'disc',
          x: px,
          y: TOP,
          z: pz,
          sx: 0.62 * CELL,
          sy: 0.012,
          sz: 0.62 * CELL,
          color: mixHex(palette.neon, palette.plate, 0.55),
          motif: MOTIF.rimDots,
          hatch: 14,
          param: 1,
        });
        props.set(`spore:${i}`, {
          family: 'sphere',
          x: px + 0.04 * CELL,
          y: TOP + 0.13,
          z: pz - 0.02 * CELL,
          sx: 0.3 * CELL,
          sy: 0.38 * CELL,
          sz: 0.3 * CELL,
          color: palette.neon,
          motif: MOTIF.glow,
          param: j(80) * 6.28,
          glow: 1,
          idle: { kind: 'pulse', speed: 2.4, amp: 0.07, phase: j(81) * 6.28 },
        });
        props.set(`sporeStem:${i}`, {
          family: 'box',
          x: px,
          y: TOP,
          z: pz,
          rz: 0.3,
          rx: -0.15,
          sx: 0.035,
          sy: 0.17,
          sz: 0.035,
          color: palette.stem,
        });
      } else if (floor === FLOOR_CURRENT) {
        const dir = state.floorArg[i] ?? 3;
        const [dx, dz] = DIR_XZ[dir] ?? [1, 0];
        const tx = -dz;
        const tz = dx;
        // Gas current: a row of three squat ink vents across the upstream edge, paper dots drifting downstream.
        for (let k = 0; k < 3; k++) {
          const side = (k - 1) * 0.28;
          props.set(`vent:${i}:${k}`, {
            family: 'hex',
            x: px - dx * 0.3 * CELL + tx * side * CELL,
            y: TOP,
            z: pz - dz * 0.3 * CELL + tz * side * CELL,
            ry: j(90 + k) * 1.2,
            sx: 0.19 * CELL,
            sy: 0.09,
            sz: 0.19 * CELL,
            color: mixHex(ink, palette.teal, 0.14),
            motif: MOTIF.hatchV,
            hatch: 6,
          });
        }
        for (let k = 0; k < 4; k++) {
          const key = `stream:${i}:${k}`;
          props.set(key, { family: 'sphere', x: px, y: TOP + 0.08, z: pz, sx: 0.085, sy: 0.085, sz: 0.085, color: palette.paper });
          streams.push({ key, x: px + tx * ((k % 2) - 0.5) * 0.3 * CELL, z: pz + tz * ((k % 2) - 0.5) * 0.3 * CELL, dx, dz, k });
        }
      } else if (floor === FLOOR_PORTAL) {
        props.set(`portalRing:${i}`, {
          family: 'ring',
          x: px,
          y: TOP,
          z: pz,
          sx: 0.68 * CELL,
          sy: 0.9,
          sz: 0.68 * CELL,
          color: palette.teal,
          motif: MOTIF.tipLight,
        });
        props.set(`portalDisc:${i}`, {
          family: 'disc',
          x: px,
          y: TOP,
          z: pz,
          sx: 0.56 * CELL,
          sy: 0.02,
          sz: 0.56 * CELL,
          color: mixHex(ink, palette.teal, 0.25),
          motif: MOTIF.swirl,
        });
      }

      if (opts.healed.has(i)) for (const [key, desc] of blossomDescs(i, px, pz, layout, palette)) props.set(key, desc);

      // --- fog stripes ----------------------------------------------------------------------------
      if ((state.fog[i] ?? 0) > 0) {
        for (let k = 0; k < 3; k++) {
          props.set(`fog:${i}:${k}`, {
            family: 'box',
            x: px + (k - 1) * 0.05 * CELL,
            y: TOP + 0.1 + k * 0.13,
            z: pz + (k - 1) * 0.12 * CELL,
            sx: (0.78 - k * 0.09) * CELL,
            sy: 0.05,
            sz: 0.17 * CELL,
            color: k === 1 ? mixHex(palette.fog, palette.sky, 0.25) : palette.fog,
            idle: { kind: 'drift', speed: 0.55 + k * 0.17, amp: 0.045, phase: k * 2.1 + j(100) * 6.28 },
            delay: k * 0.04,
          });
        }
      }

      // --- cage bars ------------------------------------------------------------------------------
      // Thorn/vine cage: bars root outside the caged blob and bend in over it (a dome), a thorn on every
      // other bar; the outer layer is the one that unwinds first.
      const cageLayers = state.cage[i] ?? 0;
      const caged = state.cells[i];
      const blobR = caged ? scaleForTier(caged.tier) * CELL * 1.12 : 0.25;
      for (let l = 0; l < cageLayers; l++) {
        // Layer 0 is the innermost; the highest layer index is the outer one and unwinds first.
        const outer = l;
        const r = blobR + 0.08 + outer * 0.06;
        const n = 7;
        const len = blobR * 2.2 + 0.18 + outer * 0.05;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + l * 0.45 + j(110 + l) * 0.3;
          const c = Math.cos(a);
          const s = Math.sin(a);
          // Lean toward the cell centre so the tops meet above the blob: rotate about the tangent (−s, 0, c).
          const lean = Math.asin(Math.min(0.95, (r - 0.05) / len)) * 0.9;
          const half = lean / 2;
          const qx = -s * Math.sin(half);
          const qz = c * Math.sin(half);
          const col = l % 2 ? mixHex(palette.vine, ink, 0.35) : palette.vine;
          props.set(`cage:${i}:${l}:${k}`, {
            family: 'box',
            x: px + c * r,
            y: TOP,
            z: pz + s * r,
            sx: 0.042,
            sy: len,
            sz: 0.042,
            quat: [qx, 0, qz, Math.cos(half)],
            color: col,
            motif: MOTIF.tipLight,
            delay: k * 0.02 + l * 0.05,
          });
          if (k % 2 === 0) {
            const hgt = len * 0.45;
            props.set(`thorn:${i}:${l}:${k}`, {
              family: 'shard',
              x: px + c * (r - Math.sin(lean) * hgt) + c * 0.03,
              y: TOP + Math.cos(lean) * hgt,
              z: pz + s * (r - Math.sin(lean) * hgt) + s * 0.03,
              sx: 0.05,
              sy: 0.1,
              sz: 0.05,
              rz: -c * 1.2,
              rx: s * 1.2,
              color: palette.rust,
              motif: MOTIF.tipLight,
              delay: 0.1 + k * 0.02 + l * 0.05,
            });
          }
        }
      }

      // --- rot ------------------------------------------------------------------------------------
      if ((state.rot[i] ?? 0) > 0) {
        props.set(`rot:${i}`, {
          family: 'disc',
          x: px,
          y: TOP,
          z: pz,
          ry: j(120) * 3,
          sx: 0.9 * CELL,
          sy: 0.045,
          sz: 0.9 * CELL,
          color: palette.rot,
          motif: MOTIF.rimDots,
          hatch: 16,
        });
        props.set(`rotCore:${i}`, {
          family: 'sphere',
          x: px,
          y: TOP + 0.03,
          z: pz,
          sx: 0.3 * CELL,
          sy: 0.2 * CELL,
          sz: 0.3 * CELL,
          color: mixHex(palette.rot, ink, 0.35),
          idle: { kind: 'pulse', speed: 1.7, amp: 0.08, phase: j(121) * 6.28 },
        });
        // Growth nodules creeping outward: the "chocolate" spreads, dotted edge from the disc motif.
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 + j(122) * 6.28;
          const rr = (0.24 + j(123 + k) * 0.1) * CELL;
          const size = (0.1 + j(130 + k) * 0.07) * CELL;
          props.set(`rotNode:${i}:${k}`, {
            family: 'sphere',
            x: px + Math.cos(a) * rr,
            y: TOP + 0.02,
            z: pz + Math.sin(a) * rr,
            sx: size,
            sy: size * 0.8,
            sz: size,
            color: k % 2 ? mixHex(palette.rot, palette.violet, 0.3) : palette.rot,
            idle: { kind: 'pulse', speed: 1.2 + k * 0.2, amp: 0.1, phase: k },
            delay: 0.05 + k * 0.03,
          });
        }
      }

      // --- toxic cloud ----------------------------------------------------------------------------
      const toxic = state.toxic[i] ?? -1;
      if (toxic >= 0) {
        const threat = state.level.threats.find((t) => t.kind === 'toxic' && t.at[0] === x && t.at[1] === y);
        const total = threat && threat.kind === 'toxic' ? threat.countdown : Math.max(toxic, 1);
        props.set(`toxicRing:${i}`, {
          family: 'disc',
          x: px,
          y: TOP,
          z: pz,
          sx: 0.72 * CELL,
          sy: 0.02,
          sz: 0.72 * CELL,
          color: palette.toxicRing,
          motif: MOTIF.arc,
          param: Math.min(1, toxic / Math.max(1, total)),
        });
        const puffs: Array<[number, number, number, number]> = [
          [0, 0.3, 0, 0.32],
          [0.14, 0.4, 0.05, 0.25],
          [-0.13, 0.42, -0.06, 0.21],
        ];
        puffs.forEach(([ox, oy, oz, sz], k) => {
          props.set(`toxic:${i}:${k}`, {
            family: 'sphere',
            x: px + ox * CELL,
            y: TOP + oy,
            z: pz + oz * CELL,
            sx: sz * CELL,
            sy: sz * CELL * 0.8,
            sz: sz * CELL,
            color: k === 0 ? palette.toxic : mixHex(palette.toxic, palette.paper, 0.2),
            idle: { kind: 'bob', speed: 1.4 + k * 0.5, amp: 0.025, phase: k * 2.0 + j(130) * 6.28 },
            delay: k * 0.05,
          });
        });
      }
    }
  }

  // --- gas sources -------------------------------------------------------------------------------
  state.level.spawn.sources.forEach(([sx, sy], k) => {
    const [px, pz] = layout.cellToLocal(sx, sy);
    const i = sy * w + sx;
    // Gas source: a crater (stepped khaki rim around an ink mouth) with a squat vent chimney that puffs on spawns.
    props.set(`source:${i}`, { family: 'hex', x: px, y: TOP, z: pz, ry: 0.3, sx: 0.8 * CELL, sy: 0.08, sz: 0.8 * CELL, color: mixHex(palette.skirt[1] ?? palette.plate, ink, 0.2), motif: MOTIF.hatchV, hatch: 18, delay: k * 0.02 });
    props.set(`sourceRim:${i}`, { family: 'ring', x: px, y: TOP + 0.08, z: pz, sx: 0.56 * CELL, sy: 1.1, sz: 0.56 * CELL, color: mixHex(palette.skirt[0] ?? palette.plate, palette.paper, 0.15), motif: MOTIF.tipLight });
    props.set(`sourceMouth:${i}`, { family: 'disc', x: px, y: TOP + 0.08, z: pz, sx: 0.5 * CELL, sy: 0.012, sz: 0.5 * CELL, color: ink });
    props.set(`sourceVent:${i}`, {
      family: 'hex',
      x: px,
      y: TOP + 0.08,
      z: pz,
      sx: 0.2 * CELL,
      sy: 0.26,
      sz: 0.2 * CELL,
      color: mixHex(ink, palette.teal, 0.25),
      motif: MOTIF.hatchV,
      hatch: 6,
      idle: { kind: 'pulse', speed: 3, amp: 0.04, phase: k },
    });
  });

  // --- goals as totems on the far ledge -----------------------------------------------------------
  const goals = state.level.goals;
  const n = goals.length;
  goals.forEach((g, gi) => {
    const gx = (gi - (n - 1) / 2) * 0.95;
    const gz = layout.goalZ;
    const done = state.goalProgress[gi]?.done ?? false;
    const k = `goal:${gi}`;
    props.set(`${k}:plinth`, { family: 'hex', x: gx, y: 0, z: gz, sx: 0.46, sy: 0.08, sz: 0.46, color: done ? palette.neon : palette.plate, motif: MOTIF.hatchV, hatch: 9 });
    const y = 0.08;
    switch (g.type) {
      case 'reachTier':
      case 'deliver': {
        const tier = g.tier;
        props.set(`${k}:icon`, { family: 'sphere', x: gx, y, z: gz, sx: 0.3, sy: 0.26, sz: 0.3, color: opts.tierColor(tier), idle: { kind: 'bob', speed: 1.3, amp: 0.012, phase: gi } });
        goalLabels.push({ x: gx, y: y + 0.42, z: gz, tier });
        break;
      }
      case 'clearScrap':
        props.set(`${k}:icon`, { family: 'hex', x: gx, y, z: gz, sx: 0.32, sy: 0.12, sz: 0.32, color: palette.scrap, motif: MOTIF.hatchV, hatch: 7 });
        props.set(`${k}:icon2`, { family: 'hex', x: gx, y: y + 0.12, z: gz, ry: 0.5, sx: 0.24, sy: 0.1, sz: 0.24, color: mixHex(palette.scrap, palette.rustDeep, 0.25), motif: MOTIF.hatchV, hatch: 7 });
        break;
      case 'heal':
        props.set(`${k}:icon`, { family: 'disc', x: gx, y, z: gz, sx: 0.3, sy: 0.03, sz: 0.3, color: palette.healed });
        props.set(`${k}:icon2`, { family: 'sphere', x: gx, y: y + 0.03, z: gz, sx: 0.1, sy: 0.08, sz: 0.1, color: palette.pink, idle: { kind: 'pulse', speed: 2, amp: 0.1, phase: gi } });
        break;
      case 'collectSpores':
        props.set(`${k}:icon`, { family: 'sphere', x: gx, y, z: gz, sx: 0.22, sy: 0.17, sz: 0.22, color: palette.neon, motif: MOTIF.glow, glow: 1, idle: { kind: 'pulse', speed: 2.4, amp: 0.06, phase: gi } });
        break;
      case 'rescue':
        for (let b = 0; b < 4; b++) {
          const a = (b / 4) * Math.PI * 2 + 0.4;
          props.set(`${k}:bar${b}`, { family: 'box', x: gx + Math.cos(a) * 0.13, y, z: gz + Math.sin(a) * 0.13, sx: 0.035, sy: 0.3, sz: 0.035, color: palette.vine });
        }
        break;
      case 'release':
        props.set(`${k}:icon`, { family: 'shard', x: gx, y, z: gz, sx: 0.16, sy: 0.34, sz: 0.16, color: palette.paper, motif: MOTIF.tipLight, idle: { kind: 'bob', speed: 1.6, amp: 0.02, phase: gi } });
        break;
      case 'clearRot':
        props.set(`${k}:icon`, { family: 'disc', x: gx, y, z: gz, sx: 0.32, sy: 0.035, sz: 0.32, color: palette.rot, motif: MOTIF.rimDots, hatch: 12 });
        break;
      case 'calmStrays':
        props.set(`${k}:icon`, { family: 'sphere', x: gx, y, z: gz, sx: 0.24, sy: 0.2, sz: 0.24, color: palette.rust, idle: { kind: 'bob', speed: 2.2, amp: 0.02, phase: gi } });
        break;
      case 'score':
        props.set(`${k}:icon`, { family: 'sphere', x: gx, y, z: gz, sx: 0.22, sy: 0.18, sz: 0.22, color: palette.paper });
        break;
      default:
        break;
    }
  });

  return { props, streams, goalLabels };
}

/** Plate kind per cell from the floor codes and the heal memory. */
export function cellKinds(state: LevelState, healed: ReadonlySet<number>): Array<{ index: number; x: number; y: number; kind: number; heal: number }> {
  const out: Array<{ index: number; x: number; y: number; kind: number; heal: number }> = [];
  const { w, h } = state.geo;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const type = state.geo.cellType[i] ?? 0;
      if (type !== 1) continue;
      const code = state.floor[i] ?? 0;
      let kind = cellKindForFloor(code);
      let heal = 0;
      if (kind === CELL_KIND_STONE && healed.has(i)) {
        kind = CELL_KIND_WITHERED;
        heal = 1;
      }
      out.push({ index: i, x, y, kind, heal });
    }
  }
  return out;
}
