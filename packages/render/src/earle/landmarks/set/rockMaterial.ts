import { abs, attribute, float, floor, fract, fwidth, hash, max, mix, positionLocal, select, sin, smoothstep, step, vec2 } from 'three/tsl';
import { EarleMaterial } from '../../EarleMaterial';
import { aaStep, hatchMask, lichenCells, patternTime, periodFade, stripeMask, type FloatNode, type Vec3Node } from '../../tsl';
import { stippleDots } from './cells';
import { fogDistance, type LandmarkMaterialContext, type LandmarkUniforms } from './context';
import { FACE_CUT, FACE_FACET, FACE_MOSS, FACE_PLATEAU, FACE_WALL, SURFACE_CODE } from './prismGeometry';

/** Stippled dots on a plane (u, v) in cells of `scale`: `fill` share of the cells carry a dot of radius `r`. */
function stipple(u: FloatNode, v: FloatNode, scale: number, r: number, fill: number, seed: number): FloatNode {
  return stippleDots(u, v, scale, r, fill, seed).mask;
}

/**
 * Landmark rock and stone (Earle's monoliths, Ebene 12/22/27/44–46): flat facets in the world's light bands, tinted
 * ink on the shadow side, the ornament *inside* the faces (never around them):
 * - **basalt**: dense vertical striations with a slight waver (Ebene 12), still readable in the ink (light lines);
 * - **crag**: broken vertical strokes plus Earle's zigzag glyph bands (Ebene 44/45), denser low down;
 * - **wet** (beside a fall): darker, with wet streaks and glints running down;
 * - **stone** (ruin): brick courses with staggered joints, darker blocks, yellow lichen on the lit upper courses
 *   (Ebene 22);
 * - **rubble**: big blocks and cracks; **roof**: slate scallops; **island**: earth strata with root lines;
 * - caps: moss (fine light dots, Ebene 12), the level top (a quiet meadow tone), cut flagstones, rock facets.
 * A vertical glow (`uniforms.gradient`, Earle's monoliths lighten toward the top) is the gradient hook.
 */
export function createLandmarkRockMaterial(ctx: LandmarkMaterialContext, uni: LandmarkUniforms): EarleMaterial {
  const la = attribute('la', 'vec4');
  const lb = attribute('lb', 'vec4');
  const u = la.x as unknown as FloatNode;
  const y = la.y as unknown as FloatNode;
  const g = la.z as unknown as FloatNode;
  const variant = la.w as unknown as FloatNode;
  const surface = lb.x as unknown as FloatNode;
  const face = lb.y as unknown as FloatNode;
  const row = lb.z as unknown as FloatNode;
  const capRow = lb.w as unknown as FloatNode;
  const isS = (k: number) => step(abs(surface.sub(k)), float(0.5));
  const isF = (k: number) => step(abs(face.sub(k)), float(0.5));
  const isWall = isF(FACE_WALL);
  const isFacet = isF(FACE_FACET);
  const pal = (i: number, r: FloatNode = row) => ctx.lookup.pal(i, r).rgb as unknown as Vec3Node;

  // --- basalt: dense striations with a waver ---------------------------------------------------------------------
  const bu = u.mul(4.6).add(sin(y.mul(0.9).add(variant.mul(11.0))).mul(0.12));
  const basalt = stripeMask(bu.add(hash(floor(bu).add(variant.mul(31.0))).mul(0.3)), 0.2);
  // --- crag: broken strokes + zigzag glyph bands, denser at the foot -------------------------------------------------
  const strokes = hatchMask(u.mul(3.0).add(variant.mul(3.0)), y.mul(1.4).add(hash(floor(u.mul(3.0))).mul(3.0)), 0.22, 0.3);
  const rowY = y.mul(1.9).add(variant.mul(2.0)).sub(patternTime.mul(0.006));
  const zig = abs(fract(u.mul(2.4)).mul(2.0).sub(1.0));
  const zigD = abs(fract(rowY).mul(2.2).sub(zig.mul(0.9)).sub(0.08));
  const zfw = fwidth(zigD);
  const glyphLine = smoothstep(zfw.add(0.1), float(0.1).sub(zfw), zigD).mul(periodFade(rowY, 3.0));
  const bandGate = max(step(g, float(0.28)), step(fract(floor(rowY).mul(0.334).add(0.05)), float(0.3)));
  const glyphs = glyphLine.mul(bandGate);
  const crag = max(strokes.mul(0.85), glyphs);
  // --- wet: streaks and glints running down ---------------------------------------------------------------------------
  const wu = u.mul(6.5);
  const wetStreak = stripeMask(wu.add(hash(floor(wu)).mul(0.4)), 0.34);
  const glint = stripeMask(wu.add(0.5), 0.1).mul(step(0.62, fract(y.mul(0.5).add(patternTime.mul(uni.flow).mul(0.45)).add(hash(floor(wu)).mul(3.0)))));
  // --- stone (Ebene 22): large blocks in courses, block lengths varying per course, thin joints ---------------------
  const course = y.div(0.62);
  const courseIdx = floor(course);
  const courseKey = hash(courseIdx.mul(7.13).add(variant.mul(3.0)));
  const bx = u.div(float(1.15).add(courseKey.mul(0.8))).add(courseKey.mul(3.7));
  const bricks = max(stripeMask(course, 0.05), stripeMask(bx, 0.04));
  const blockKey = hash(floor(bx).add(courseIdx.mul(17.0)).add(variant.mul(5.0)));
  // rubble: bigger blocks and a crack now and then
  const rcourse = y.div(0.85);
  const rbx = u.div(1.5).add(hash(floor(rcourse)).mul(2.0));
  const rubble = max(max(stripeMask(rcourse, 0.05), stripeMask(rbx, 0.045)), stripeMask(u.mul(1.7).add(sin(y.mul(2.3)).mul(0.3)), 0.045).mul(step(hash(floor(u.mul(1.7))), float(0.25))));
  // roof: slate scallops (rows of arcs)
  const sy = y.div(0.34);
  const sx = u.div(0.46).add(fract(floor(sy).mul(0.5)));
  const scallopD = vec2(fract(sx).sub(0.5), fract(sy).mul(1.1)).length();
  const sfw = fwidth(sy).max(1e-4);
  const shingles = smoothstep(float(0.08).add(sfw), float(0.08).sub(sfw), abs(scallopD.sub(0.5))).mul(periodFade(sy, 2.5));
  // island walls: earth strata and roots
  const strata = stripeMask(y.mul(3.2).add(sin(u.mul(1.3)).mul(0.25)), 0.12);
  const roots = stripeMask(u.mul(2.2).add(sin(y.mul(4.0).add(u)).mul(0.2)), 0.06).mul(step(hash(floor(u.mul(2.2)).add(9.0)), float(0.35)));
  const island = max(strata.mul(0.8), roots);
  // bark (dead snags): fine grain running up the wood
  const bark = stripeMask(u.mul(11.0).add(sin(y.mul(3.0).add(variant.mul(5.0))).mul(0.15)), 0.2);

  const wallMask = select(
    isS(SURFACE_CODE.basalt).greaterThan(0.5),
    basalt,
    select(
      isS(SURFACE_CODE.crag).greaterThan(0.5),
      crag,
      select(
        isS(SURFACE_CODE.wet).greaterThan(0.5),
        max(wetStreak.mul(0.55), glint),
        select(isS(SURFACE_CODE.stone).greaterThan(0.5), bricks, select(isS(SURFACE_CODE.rubble).greaterThan(0.5), rubble, select(isS(SURFACE_CODE.roof).greaterThan(0.5), shingles, select(isS(SURFACE_CODE.island).greaterThan(0.5), island, bark)))),
      ),
    ),
  ) as unknown as FloatNode;
  // facets: fine lines down the fall line (the u coordinate of a facet runs along the ring)
  const facetLines = stripeMask(u.mul(2.8).add(sin(y.mul(1.5)).mul(0.2)), 0.12).mul(0.8);
  const mask = max(wallMask.mul(isWall), facetLines.mul(isFacet));

  const ink = pal(0);
  const lines = pal(6);
  const glyph = pal(7);
  const wetGlint = pal(4);
  const isWet = isS(SURFACE_CODE.wet);
  const isStoneLike = max(isS(SURFACE_CODE.stone), isS(SURFACE_CODE.rubble));
  const lineColor = select(isS(SURFACE_CODE.crag).greaterThan(0.5), mix(lines, glyph, glyphs), select(isWet.greaterThan(0.5), mix(lines, wetGlint, glint), lines)) as unknown as Vec3Node;

  // Ebene 22: the lit upper edge of every stone face turns golden — a thin band (world units below the face's top)
  // with an organic drip
  const topDist = attribute('lc', 'vec4').x as unknown as FloatNode;
  const drip = float(0.2).sub(topDist).add(sin(u.mul(2.3).add(variant.mul(9.0))).mul(0.07)).add(sin(u.mul(5.7)).mul(0.04));
  const lichen = aaStep(0.0, drip).mul(isStoneLike).mul(isWall);
  // a few lichen blotches lower down (rounded cells, sparse)
  const lich = lichenCells(u.mul(1.6), y.mul(1.6), float(0.08), variant.mul(9.0));
  const blotch = lich.mask.mul(smoothstep(0.35, 0.7, g)).mul(isStoneLike).mul(isWall);
  const gold = max(lichen, blotch);

  // moss caps: fine light dots; plateau: a quiet meadow with sparse tufts; flagstones: joints and moss specks
  const mossDots = stipple(u, y, 5.5, 0.16, 0.5, 3);
  const tufts = stipple(u, y, 1.6, 0.12, 0.22, 11);
  const flagCourse = floor(y.div(1.05));
  const flag = max(stripeMask(u.div(float(1.2).add(hash(flagCourse).mul(0.6))).add(hash(flagCourse.add(3.0)).mul(2.0)), 0.04), stripeMask(y.div(1.05), 0.04));
  const flagMoss = stipple(u, y, 3.2, 0.14, 0.3, 17);

  // gradient hook: glow toward the top (walls), stone blocks vary a little, wet rock sits darker
  const lift = g
    .sub(0.45)
    .mul(uni.gradient)
    .add(select(isWet.greaterThan(0.5), float(-0.32), float(0)))
    .add(blockKey.sub(0.5).mul(0.12).mul(isStoneLike))
    .add(isS(SURFACE_CODE.roof).mul(-0.08))
    .add(isS(SURFACE_CODE.bark).mul(-0.22)) as unknown as FloatNode;

  // lines in the ink: light strokes on basalt and crags (Ebene 7), barely visible joints on stone; gold never
  // shows in the shade
  const lineShadow = mix(mix(ink, pal(3), 0.42), mix(ink, pal(2), 0.22), isStoneLike);
  return new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: row,
    fog: ctx.fog,
    bands: ctx.bands,
    bandScale: 1.35,
    terminator: 0.04,
    lift,
    pattern: { mask: max(mask, gold), color: mix(lineColor, pal(5), gold), shadowColor: mix(lineShadow, ink, gold.mul(mask.oneMinus())) },
    layers: [
      { mask: isF(FACE_MOSS), row: capRow, lift: float(0.22), pattern: { mask: mossDots, color: pal(5, capRow) } },
      { mask: isF(FACE_PLATEAU), row: capRow, lift: float(0.12), pattern: { mask: tufts, color: pal(5, capRow) } },
      { mask: isF(FACE_CUT), row, lift: float(0.18), pattern: { mask: max(flag, flagMoss), color: mix(pal(6), pal(5), flagMoss) } },
    ],
    positionNode: ctx.warp ? ctx.warp(positionLocal as unknown as Vec3Node) : null,
    fogDistNode: fogDistance(ctx),
  });
}

