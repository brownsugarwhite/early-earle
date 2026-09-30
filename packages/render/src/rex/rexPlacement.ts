/**
 * Where REX stands — pure functions (no three.js scene), shared by the flow and the lab.
 *
 * Map mode: REX lives in screen space at a lower corner, peeking over a *rim line* (the top edge of the REX
 * line box / bottom HUD band, or the screen bottom when the corner beside the box is free). He never covers the
 * current node or the path (avoid circles), respects the safe areas and the glass HUD insets, and keeps his side
 * (hysteresis) unless the other corner is clearly freer.
 *
 * Level mode: REX peeks over the plateau edge at the board's side. Candidate spots around the plateau are
 * projected to the screen and scored (cells covered, off-screen share, HUD overlap); the best one wins.
 */

export interface RexInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface RexRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** A screen-space circle REX must not cover (CSS px). */
export interface RexAvoid {
  x: number;
  y: number;
  r: number;
  /** Importance (current node 3, next nodes 1.5, path dots 0.5). */
  weight?: number;
}

export type RexSide = 'left' | 'right';

export interface RexMapLayoutInput {
  /** Viewport in CSS px. */
  width: number;
  height: number;
  safe: RexInsets;
  /** Lower edge of the top HUD (CSS px from the top, safe area included). */
  hudTop: number;
  /** Upper edge of the bottom HUD band (CSS px from the top). */
  hudBottom: number;
  /** REX line box (the speech bubble), when known. */
  lineBox?: RexRect | null;
  /** Action row (buttons), when known. */
  actions?: RexRect | null;
  avoid: RexAvoid[];
  /** Size multiplier (lab slider). */
  sizeScale?: number;
  /** Side of the previous frame (hysteresis). */
  prevSide?: RexSide | null;
  /** Force a side. */
  side?: RexSide | null;
}

export interface RexMapPlacement {
  side: RexSide;
  /** Screen x of REX's centre line (CSS px). */
  x: number;
  /** Rim line (CSS px from the top): REX is cut below it. */
  rimY: number;
  /** Visible height of REX above the rim (CSS px). */
  visible: number;
  /** Estimated mouth position (CSS px) — the 3D projection refines it. */
  bubble: { x: number; y: number };
  /** Weighted overlap with the avoid list (0 = free). */
  overlap: number;
  /** Beside the line box at the screen bottom, or on top of the line box / HUD band. */
  stance: 'corner' | 'onBox';
}

/** Width of REX's visible part relative to its visible height (3/4 view, arms included). */
export const REX_VISIBLE_ASPECT = 0.92;
/** Where the rim cuts REX (model units above his feet ≈ mid belly). */
export const REX_RIM_CUT = 0.36;
/** Head top in model units (for the visible-height → scale conversion). */
export const REX_HEIGHT = 1.03;

function rectOverlapCircle(r: RexRect, c: RexAvoid): number {
  const cx = Math.max(r.left, Math.min(c.x, r.right));
  const cy = Math.max(r.top, Math.min(c.y, r.bottom));
  const d = Math.hypot(c.x - cx, c.y - cy);
  if (d >= c.r) return 0;
  // 0..1 penetration (1 = centre inside the rect) × weight.
  const inside = c.x >= r.left && c.x <= r.right && c.y >= r.top && c.y <= r.bottom;
  return (inside ? 1 : 1 - d / c.r) * (c.weight ?? 1);
}

/** Visible REX height for a viewport (CSS px). */
export function rexVisibleHeight(width: number, height: number, sizeScale = 1): number {
  const base = Math.min(190, Math.max(96, 0.155 * height + 0.02 * width));
  return base * sizeScale;
}

/**
 * Map-mode placement: the lower corner with the fewest conflicts. Corner stance when the line box leaves room
 * beside it (desktop, landscape), otherwise REX stands on top of the line box / bottom HUD band (phones).
 */
export function placeRexOnMap(inp: RexMapLayoutInput): RexMapPlacement {
  const W = inp.width;
  const Hh = inp.height;
  const margin = 8;
  let visible = rexVisibleHeight(W, Hh, inp.sizeScale ?? 1);
  const band = inp.lineBox ?? inp.actions ?? null;
  const evaluate = (side: RexSide, vis: number): RexMapPlacement => {
    const wv = vis * REX_VISIBLE_ASPECT;
    // Room beside the bubble/actions at the bottom?
    let stance: 'corner' | 'onBox' = 'onBox';
    let rimY = inp.lineBox ? inp.lineBox.top - 4 : inp.hudBottom;
    let x: number;
    if (band) {
      const union: RexRect = {
        left: Math.min(band.left, inp.actions?.left ?? band.left, inp.lineBox?.left ?? band.left),
        right: Math.max(band.right, inp.actions?.right ?? band.right, inp.lineBox?.right ?? band.right),
        top: 0,
        bottom: 0,
      };
      const free = side === 'left' ? union.left - inp.safe.left - margin : W - inp.safe.right - margin - union.right;
      if (free >= wv * 0.8) {
        stance = 'corner';
        rimY = Hh - Math.max(inp.safe.bottom, 0);
        x = side === 'left' ? inp.safe.left + margin + Math.min(free, wv * 1.2) * 0.5 : W - inp.safe.right - margin - Math.min(free, wv * 1.2) * 0.5;
      } else {
        x = side === 'left' ? inp.safe.left + wv * 0.42 : W - inp.safe.right - wv * 0.42;
      }
    } else {
      x = side === 'left' ? inp.safe.left + wv * 0.42 : W - inp.safe.right - wv * 0.42;
    }
    // Never into the top HUD.
    const top = Math.max(inp.hudTop + 6, rimY - vis);
    const vis2 = rimY - top;
    const rect: RexRect = { left: x - wv / 2, right: x + wv / 2, top, bottom: rimY };
    let overlap = 0;
    for (const a of inp.avoid) overlap += rectOverlapCircle(rect, a);
    const inward = side === 'left' ? 1 : -1;
    return { side, x, rimY, visible: vis2, bubble: { x: x + inward * wv * 0.3, y: rimY - vis2 * 0.52 }, overlap, stance };
  };

  const sides: RexSide[] = inp.side ? [inp.side] : ['right', 'left'];
  let best: RexMapPlacement | null = null;
  for (const s of sides) {
    let p = evaluate(s, visible);
    // Shrink (down to 70 %) while the corner still covers something important.
    for (let k = 0; k < 3 && p.overlap > 0.35; k++) p = evaluate(s, visible * (0.9 - k * 0.1));
    const bias = inp.prevSide === s ? -0.3 : 0;
    if (!best || p.overlap + bias < best.overlap + (inp.prevSide === best.side ? -0.3 : 0)) best = p;
  }
  visible = best!.visible;
  return best!;
}

/** Camera-space transform of a map placement for a camera-attached REX. */
export interface RexCameraPlacement {
  /** Camera-space position of REX's feet. */
  x: number;
  y: number;
  z: number;
  /** Model → camera-space scale. */
  scale: number;
  /** View-space clip plane (n.xyz, d) for the rim line. */
  clip: [number, number, number, number];
  /** Yaw toward the camera plus the 3/4 turn to the screen centre (rad, about the camera's up). */
  yaw: number;
}

/**
 * Converts a map placement into camera space at `depth` (world units in front of the camera). `fovDeg` is the
 * vertical FOV; `aspect` = width / height.
 */
export function mapPlacementToCamera(p: RexMapPlacement, view: { width: number; height: number; fovDeg: number }, depth: number, cut = REX_RIM_CUT): RexCameraPlacement {
  const tanHalf = Math.tan((view.fovDeg * Math.PI) / 360);
  const aspect = view.width / view.height;
  const wpp = (2 * depth * tanHalf) / view.height;
  const scale = (p.visible * wpp) / (REX_HEIGHT - cut);
  const feetPy = p.rimY + (cut * scale) / wpp;
  const ndcX = (p.x / view.width) * 2 - 1;
  const ndcY = 1 - (feetPy / view.height) * 2;
  const x = ndcX * depth * tanHalf * aspect;
  const y = ndcY * depth * tanHalf;
  const rimNdc = 1 - (p.rimY / view.height) * 2;
  const n = [0, 1, rimNdc * tanHalf];
  const l = Math.hypot(n[0]!, n[1]!, n[2]!);
  // Face the camera (the eye is at the origin) and turn 3/4 toward the screen centre.
  const yawToEye = Math.atan2(-x, depth);
  const yaw = yawToEye + (p.side === 'left' ? 0.42 : -0.42);
  return { x, y, z: -depth, scale, clip: [n[0]! / l, n[1]! / l, n[2]! / l, 0], yaw };
}

// ---------------------------------------------------------------------------------------------- level mode

export interface RexBoardBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface RexBoardInput {
  /** Plateau footprint incl. skirt (board-local). */
  footprint: RexBoardBox;
  /** Cell grid extent (board-local) — REX must not cover it. */
  cells: RexBoardBox;
  topY: number;
  /** Ground height beside the plateau (board-local y). */
  groundY: number;
  /** REX height in board units. */
  rexHeight: number;
  /** Board-local point → screen CSS px (null when behind the camera). */
  project: (x: number, y: number, z: number) => { x: number; y: number } | null;
  width: number;
  height: number;
  hudTop: number;
  hudBottom: number;
  prev?: RexBoardSpot | null;
  /**
   * Phones: REX peeks into the top-right corner — he stands on the ground behind the plateau's far edge, tucked
   * under the top HUD pill, small, never over the grid (the bottom belongs to the board and the action row).
   */
  corner?: 'topRight' | null;
  /** Target visible height in CSS px for the corner (default ≈ 12 % of the screen height). */
  cornerHeightPx?: number;
}

export interface RexBoardSpot {
  x: number;
  z: number;
  side: RexSide;
  kind: 'side' | 'front' | 'back';
  score: number;
  /** Screen rect of REX at this spot (CSS px). */
  rect: RexRect;
  /** He stands on the plateau's far ledge (feet at `topY`) instead of the ground beside it. */
  onTop?: boolean;
}

function projectRect(inp: RexBoardInput, pts: Array<[number, number, number]>): RexRect | null {
  let r: RexRect | null = null;
  for (const [x, y, z] of pts) {
    const s = inp.project(x, y, z);
    if (!s) return null;
    if (!r) r = { left: s.x, right: s.x, top: s.y, bottom: s.y };
    else {
      r.left = Math.min(r.left, s.x);
      r.right = Math.max(r.right, s.x);
      r.top = Math.min(r.top, s.y);
      r.bottom = Math.max(r.bottom, s.y);
    }
  }
  return r;
}

const area = (r: RexRect): number => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
function intersect(a: RexRect, b: RexRect): RexRect {
  return { left: Math.max(a.left, b.left), right: Math.min(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom) };
}

/**
 * Top-right corner (phones): candidates on the ground behind the plateau's far edge, from the middle to the right
 * end of the grid. Scored by: fully on screen, clear of the grid and the top HUD, tucked under the pill's lower
 * edge, as far right as possible.
 */
function chooseCornerSpot(inp: RexBoardInput): RexBoardSpot {
  const fp = inp.footprint;
  const h = inp.rexHeight;
  const screen: RexRect = { left: 0, top: 0, right: inp.width, bottom: inp.height };
  const cellsRect = projectRect(inp, [
    [inp.cells.minX, inp.topY, inp.cells.minZ],
    [inp.cells.maxX, inp.topY, inp.cells.minZ],
    [inp.cells.minX, inp.topY, inp.cells.maxZ],
    [inp.cells.maxX, inp.topY, inp.cells.maxZ],
  ]);
  let best: RexBoardSpot | null = null;
  const margin = Math.max(6, inp.width * 0.02);
  // Behind the plateau on the ground, or on its far ledge beside the goal totems (when the band above is short).
  const rows: Array<{ z: number; feet: number; onTop: boolean }> = [
    { z: fp.minZ - h * 0.05, feet: inp.groundY, onTop: false },
    { z: fp.minZ - h * 0.35, feet: inp.groundY, onTop: false },
    { z: fp.minZ - h * 0.7, feet: inp.groundY, onTop: false },
    { z: inp.cells.minZ - h * 0.32, feet: inp.topY, onTop: true },
  ];
  for (let i = 0; i <= 8; i++) {
    const fx = 0.15 + (i / 8) * 1.0;
    for (const row of rows) {
      const x = inp.cells.maxX * fx;
      const z = row.z;
      const w = h * 0.36;
      const rect = projectRect(inp, [
        [x - w, row.feet + h * 0.3, z - w * 0.6],
        [x + w, row.feet + h * 0.3, z + w * 0.6],
        [x - w, row.feet + h * 1.02, z - w * 0.6],
        [x + w, row.feet + h * 1.02, z + w * 0.6],
      ]);
      if (!rect) continue;
      const a = Math.max(1, area(rect));
      const offPenalty = (1 - area(intersect(rect, { left: screen.left + margin, top: screen.top, right: screen.right - margin, bottom: screen.bottom })) / a) * 6;
      const cellPenalty = cellsRect ? (area(intersect(rect, cellsRect)) / a) * 10 : 0;
      const hudPenalty = (area(intersect(rect, { left: 0, right: inp.width, top: 0, bottom: inp.hudTop + 4 })) / a) * 14;
      // Tucked under the pill and pushed into the corner (his head a little below the pill's lower edge).
      const tuck = Math.abs(rect.top - (inp.hudTop + 14)) / inp.height;
      const right = (inp.width - margin - rect.right) / inp.width;
      // A small preference for standing behind the board (in the landscape) over its ledge.
      const score = offPenalty + cellPenalty + hudPenalty + tuck * 2 + right * 3 + (row.onTop ? 0.15 : 0) + (inp.prev && Math.abs(inp.prev.x - x) < 1e-3 ? -0.2 : 0);
      if (!best || score < best.score) best = { x, z, side: 'right', kind: 'back', score, rect, onTop: row.onTop };
    }
  }
  return best ?? { x: inp.cells.maxX * 0.8, z: fp.minZ - h * 0.2, side: 'right', kind: 'back', score: 99, rect: { left: 0, top: 0, right: 0, bottom: 0 } };
}

/** Picks where REX peeks over the plateau: beside it in landscape, in the top-right corner behind it on phones. */
export function chooseBoardSpot(inp: RexBoardInput): RexBoardSpot {
  if (inp.corner === 'topRight') return chooseCornerSpot(inp);
  const fp = inp.footprint;
  const h = inp.rexHeight;
  const cz = (fp.minZ + fp.maxZ) / 2;
  const depth = fp.maxZ - fp.minZ;
  const cand: Array<Omit<RexBoardSpot, 'score' | 'rect'>> = [];
  for (const side of ['right', 'left'] as RexSide[]) {
    const s = side === 'right' ? 1 : -1;
    const edgeX = side === 'right' ? fp.maxX : fp.minX;
    const cellX = side === 'right' ? inp.cells.maxX : inp.cells.minX;
    cand.push({ x: edgeX + s * h * 0.18, z: cz + depth * 0.28, side, kind: 'side' });
    cand.push({ x: edgeX + s * h * 0.18, z: cz + depth * 0.02, side, kind: 'side' });
    cand.push({ x: (edgeX + cellX) / 2 + s * h * 0.05, z: fp.maxZ + h * 0.12, side, kind: 'front' });
    cand.push({ x: cellX * 0.6, z: fp.maxZ + h * 0.14, side, kind: 'front' });
    cand.push({ x: (edgeX + cellX) / 2, z: fp.minZ - h * 0.1, side, kind: 'back' });
  }
  const screen: RexRect = { left: 0, top: 0, right: inp.width, bottom: inp.height };
  const cellsRect = projectRect(inp, [
    [inp.cells.minX, inp.topY, inp.cells.minZ],
    [inp.cells.maxX, inp.topY, inp.cells.minZ],
    [inp.cells.minX, inp.topY, inp.cells.maxZ],
    [inp.cells.maxX, inp.topY, inp.cells.maxZ],
  ]);
  let best: RexBoardSpot | null = null;
  for (const c of cand) {
    const w = h * 0.36;
    const rect = projectRect(inp, [
      [c.x - w, inp.groundY + h * 0.3, c.z - w * 0.6],
      [c.x + w, inp.groundY + h * 0.3, c.z + w * 0.6],
      [c.x - w, inp.groundY + h * 1.02, c.z - w * 0.6],
      [c.x + w, inp.groundY + h * 1.02, c.z + w * 0.6],
    ]);
    if (!rect) continue;
    const a = Math.max(1, area(rect));
    const onScreen = area(intersect(rect, screen)) / a;
    const offPenalty = (1 - onScreen) * 5;
    const cellPenalty = cellsRect ? (area(intersect(rect, cellsRect)) / a) * 12 : 0;
    const hudPenalty = ((area(intersect(rect, { left: 0, right: inp.width, top: 0, bottom: inp.hudTop })) + area(intersect(rect, { left: 0, right: inp.width, top: inp.hudBottom, bottom: inp.height }))) / a) * 3;
    // Bigger on screen reads better (spots nearer the camera), up to ~16 % of the screen height.
    const sizeBonus = -Math.min(1, (rect.bottom - rect.top) / (inp.height * 0.16)) * 0.6;
    const kindBias = c.kind === 'side' ? 0 : c.kind === 'front' ? 0.05 : 0.5;
    const sideBias = c.side === 'left' ? 0.08 : 0;
    const keep = inp.prev && inp.prev.kind === c.kind && inp.prev.side === c.side ? -0.3 : 0;
    const score = offPenalty + cellPenalty + hudPenalty + sizeBonus + kindBias + sideBias + keep;
    if (!best || score < best.score) best = { ...c, score, rect };
  }
  return best ?? { x: fp.maxX + h * 0.2, z: cz, side: 'right', kind: 'side', score: 99, rect: { left: 0, top: 0, right: 0, bottom: 0 } };
}
