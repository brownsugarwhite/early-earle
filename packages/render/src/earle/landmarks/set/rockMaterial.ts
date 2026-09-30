import { abs, attribute, float, floor, fract, fwidth, hash, max, mix, normalWorld, positionLocal, pow, select, sin, smoothstep, sqrt, step, vec2 } from 'three/tsl';
import type { PrismSurface } from '@ee/world';
import { EarleMaterial, type EarleLayer } from '../../EarleMaterial';
import { earleGradients } from '../../gradients';
import { aaStep, hatchMask, patternTime, periodFade, stripeMask, type FloatNode, type Vec3Node } from '../../tsl';
import { stippleDots } from './cells';
import { fogDistance, type LandmarkMaterialContext, type LandmarkUniforms } from './context';
import { FACE_CUT, FACE_FACET, FACE_MOSS, FACE_PLATEAU, FACE_WALL, SURFACE_CODE } from './prismGeometry';

/**
 * Two shader families, each evaluating only its own ornaments (the fragment cost on the phone stays small): `rock` =
 * basalt, crag, wet rock, swamp island, bark; `stone` = the ruin's cut stone, rubble and slate roof. One draw call
 * each.
 */
export type RockFamily = 'rock' | 'stone';

export function rockFamilyOf(surface: PrismSurface): RockFamily {
  return surface === 'stone' || surface === 'rubble' || surface === 'roof' ? 'stone' : 'rock';
}

function stipple(u: FloatNode, v: FloatNode, scale: number, r: number, fill: number, seed: number): FloatNode {
  return stippleDots(u, v, scale, r, fill, seed).mask;
}

/**
 * Landmark rock and stone (Earle's monoliths, Ebene 12/22/27/44–46): flat facets in the world's light bands, tinted
 * ink on the shadow side, the ornament *inside* the faces (never around them):
 * - **basalt**: dense vertical striations with a slight waver (Ebene 12), still readable in the ink (light lines);
 * - **crag**: broken vertical strokes plus Earle's zigzag glyph bands (Ebene 44/45), denser low down;
 * - **wet** (beside a fall): darker, with wet streaks and glints running down;
 * - **stone** (the ruin, Ebene 22/44/46): every facet a hard serigraph step with its own gradient inside (head light,
 *   foot one step darker — never across the facet's edge), fine broken vertical strokes (a few light ones high up), a
 *   few irregular joints in stretches, the lit top edge golden with lichen, dotted ivy on the faces turned away from the
 *   sun, lancet windows painted in ink; **rubble** the same, coarser and darker; **roof**: slate scallops;
 * - **island**: earth strata with root lines; **bark**: fine grain;
 * - caps: moss (fine light dots, Ebene 12), the level top (a quiet meadow tone), worn stone with a few joints and moss
 *   patches, rock facets.
 * A vertical glow (`uniforms.gradient`, Earle's monoliths lighten toward the top) is the gradient hook; on stone it
 * lifts whole facets (their step up the landmark), the facet's inner gradient follows `earleGradients.surface`.
 */
export function createLandmarkRockMaterial(ctx: LandmarkMaterialContext, uni: LandmarkUniforms, family: RockFamily = 'rock'): EarleMaterial {
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
  const ink = pal(0);
  const lines = pal(6);
  // facets: fine lines down the fall line (the u coordinate of a facet runs along the ring)
  const facetLines = stripeMask(u.mul(2.8).add(sin(y.mul(1.5)).mul(0.2)), 0.12).mul(0.8);
  const moss: EarleLayer = { mask: isF(FACE_MOSS), row: capRow, lift: float(0.22), pattern: { mask: stipple(u, y, 5.5, 0.16, 0.5, 3), color: pal(5, capRow) } };
  let wallMask: FloatNode;
  let lineColor: Vec3Node;
  let lift: FloatNode = g.sub(0.45).mul(uni.gradient) as unknown as FloatNode;
  let gold: FloatNode = float(0);
  let lineShadow: Vec3Node;
  // stone only: dotted ivy on the shade side, painted lancets, the facets' inner gradient (hard serigraph steps)
  let ivy: FloatNode = float(0);
  let lancet: FloatNode = float(0);
  let facetDark: FloatNode | null = null;
  let soft: FloatNode | null = null;
  const layers: EarleLayer[] = [moss];

  if (family === 'rock') {
    // basalt: dense striations with a waver
    const bu = u.mul(4.6).add(sin(y.mul(0.9).add(variant.mul(11.0))).mul(0.12));
    const basalt = stripeMask(bu.add(hash(floor(bu).add(variant.mul(31.0))).mul(0.3)), 0.2);
    // crag: broken strokes + zigzag glyph bands, denser at the foot
    const strokes = hatchMask(u.mul(3.0).add(variant.mul(3.0)), y.mul(1.4).add(hash(floor(u.mul(3.0))).mul(3.0)), 0.22, 0.3);
    const rowY = y.mul(1.9).add(variant.mul(2.0)).sub(patternTime.mul(0.006));
    const zig = abs(fract(u.mul(2.4)).mul(2.0).sub(1.0));
    const zigD = abs(fract(rowY).mul(2.2).sub(zig.mul(0.9)).sub(0.08));
    const zfw = fwidth(zigD);
    const glyphLine = smoothstep(zfw.add(0.1), float(0.1).sub(zfw), zigD).mul(periodFade(rowY, 3.0));
    const bandGate = max(step(g, float(0.28)), step(fract(floor(rowY).mul(0.334).add(0.05)), float(0.3)));
    const glyphs = glyphLine.mul(bandGate);
    const crag = max(strokes.mul(0.85), glyphs);
    // wet: streaks and glints running down
    const wu = u.mul(6.5);
    const wetStreak = stripeMask(wu.add(hash(floor(wu)).mul(0.4)), 0.34);
    const glint = stripeMask(wu.add(0.5), 0.1).mul(step(0.62, fract(y.mul(0.5).add(patternTime.mul(uni.flow).mul(0.45)).add(hash(floor(wu)).mul(3.0)))));
    // island walls: earth strata and roots; bark: fine grain
    const strata = stripeMask(y.mul(3.2).add(sin(u.mul(1.3)).mul(0.25)), 0.12);
    const roots = stripeMask(u.mul(2.2).add(sin(y.mul(4.0).add(u)).mul(0.2)), 0.06).mul(step(hash(floor(u.mul(2.2)).add(9.0)), float(0.35)));
    const island = max(strata.mul(0.8), roots);
    const bark = stripeMask(u.mul(11.0).add(sin(y.mul(3.0).add(variant.mul(5.0))).mul(0.15)), 0.2);
    const isWet = isS(SURFACE_CODE.wet);
    wallMask = select(
      isS(SURFACE_CODE.basalt).greaterThan(0.5),
      basalt,
      select(isS(SURFACE_CODE.crag).greaterThan(0.5), crag, select(isWet.greaterThan(0.5), max(wetStreak.mul(0.55), glint), select(isS(SURFACE_CODE.island).greaterThan(0.5), island, bark))),
    ) as unknown as FloatNode;
    lineColor = select(isS(SURFACE_CODE.crag).greaterThan(0.5), mix(lines, pal(7), glyphs), select(isWet.greaterThan(0.5), mix(lines, pal(4), glint), lines)) as unknown as Vec3Node;
    // wet rock sits darker, dead wood too
    lift = lift.add(isWet.mul(-0.32)).add(isS(SURFACE_CODE.bark).mul(-0.22)) as unknown as FloatNode;
    // lines in the ink stay readable as light strokes (Ebene 7: turquoise strokes on black rock)
    lineShadow = mix(ink, pal(3), 0.42) as unknown as Vec3Node;
    layers.push({ mask: isF(FACE_PLATEAU), row: capRow, lift: float(0.12), pattern: { mask: stipple(u, y, 1.6, 0.12, 0.22, 11), color: pal(5, capRow) } });
  } else {
    const lc = attribute('lc', 'vec4');
    const ld = attribute('ld', 'vec4');
    const topDist = lc.x as unknown as FloatNode;
    const gf = lc.y as unknown as FloatNode;
    const centre = lc.z as unknown as FloatNode;
    const faceKey = lc.w as unknown as FloatNode;
    const isRoof = isS(SURFACE_CODE.roof);
    const isRubble = isS(SURFACE_CODE.rubble);
    // 1) fine vertical strokes (Ebene 44/46): broken hatching with a slight waver, each face its own phase; rubble
    //    coarser. A few strokes are light and sit high on the face (the lit needles of Ebene 46).
    const freq = select(isRubble.greaterThan(0.5), float(3.6), float(5.2)) as unknown as FloatNode;
    const su = u.mul(freq).add(sin(y.mul(0.8).add(faceKey.mul(17.0))).mul(0.16)).add(faceKey.mul(7.3));
    const strokeKey = hash(floor(su).add(faceKey.mul(113.0)));
    const strokes = hatchMask(su, y.mul(0.85).add(strokeKey.mul(5.0)), 0.15, 0.48);
    const light = step(0.74, strokeKey);
    const lightStrokes = strokes.mul(light).mul(smoothstep(0.35, 0.85, gf));
    const darkStrokes = strokes.mul(light.oneMinus()).mul(gf.mul(-0.35).add(0.75));
    // 2) a few irregular joints: wobbly courses of uneven height, drawn only in stretches (never a brick grid)
    const cy = y
      .div(select(isRubble.greaterThan(0.5), float(0.95), float(1.3)))
      .add(sin(y.mul(0.9).add(faceKey.mul(4.0))).mul(0.22))
      .add(sin(u.mul(1.7).add(faceKey.mul(5.0))).mul(0.05))
      .add(faceKey.mul(0.61));
    const lineId = floor(cy);
    const hOn = step(hash(floor(u.div(1.7).add(hash(lineId.add(faceKey.mul(71.0))).mul(3.0))).add(lineId.mul(13.0)).add(faceKey.mul(29.0))), float(0.4));
    const rowId = floor(cy.add(0.5));
    const rowKey = hash(rowId.add(faceKey.mul(37.0)));
    const bx = u.div(float(1.15).add(rowKey.mul(1.2))).add(rowKey.mul(5.3)).add(sin(y.mul(2.1)).mul(0.05));
    const vOn = step(hash(floor(bx).add(rowId.mul(7.0)).add(faceKey.mul(3.0))), select(isRubble.greaterThan(0.5), float(0.5), float(0.3)));
    const joints = max(stripeMask(cy, 0.045).mul(hOn), stripeMask(bx, 0.04).mul(vOn));
    // roof: slate scallops (rows of arcs)
    const sy = y.div(0.34);
    const sx = u.div(0.46).add(fract(floor(sy).mul(0.5)));
    const scallopD = vec2(fract(sx).sub(0.5), fract(sy).mul(1.1)).length();
    const sfw = fwidth(sy).max(1e-4);
    const shingles = smoothstep(float(0.08).add(sfw), float(0.08).sub(sfw), abs(scallopD.sub(0.5))).mul(periodFade(sy, 2.5));
    const masonry = max(max(darkStrokes.mul(0.62), lightStrokes.mul(0.7)), joints.mul(0.85));
    wallMask = select(isRoof.greaterThan(0.5), shingles, masonry) as unknown as FloatNode;
    lineColor = mix(lines, pal(4), light.mul(joints.oneMinus()).mul(isRoof.oneMinus())) as unknown as Vec3Node;
    // 3) the lit top edge of every stone face turns golden (Ebene 22): a thin band with an organic drip, runners of
    //    lichen dots trickling down below it
    // (in patches along the edge, never one continuous stripe)
    const patchy = smoothstep(-0.25, 0.55, sin(u.mul(0.95).add(variant.mul(7.0))).mul(sin(u.mul(0.41).add(2.1))).add(0.18));
    const drip = float(0.2).sub(topDist).add(sin(u.mul(2.3).add(variant.mul(9.0))).mul(0.07)).add(sin(u.mul(5.7)).mul(0.04)).mul(patchy).sub(patchy.oneMinus().mul(0.05));
    const trickle = stippleDots(u, y, 6.5, 0.22, smoothstep(0.9, 0.15, topDist).mul(0.2).mul(patchy), 57).mask;
    gold = max(aaStep(0.0, drip), trickle).mul(isRoof.oneMinus()).mul(isWall) as unknown as FloatNode;
    // 4) ivy on the shade side: dotted patches, densest at the foot of the faces turned away from the sun
    const away = smoothstep(0.1, -0.25, normalWorld.dot(uni.sunDir));
    const patch = smoothstep(0.12, 0.45, sin(u.mul(0.85).add(faceKey.mul(6.0))).mul(sin(y.mul(0.62).add(u.mul(0.31)))).add(float(0.22).sub(gf.mul(0.62))));
    ivy = stippleDots(u, y, 5.2, 0.28, patch.mul(0.7), 41).mask.mul(away).mul(isWall).mul(isRoof.oneMinus()) as unknown as FloatNode;
    // 5) lancet windows painted in ink (turret slits, belfry openings, the blind portal)
    const across = abs(ld.x) as unknown as FloatNode;
    const hw = ld.y as unknown as FloatNode;
    const rise = hw.mul(1.9);
    const R = hw.mul(hw).add(rise.mul(rise)).div(hw.mul(2).max(1e-4));
    const dx = across.add(R).sub(hw);
    const archTop = (ld.w as unknown as FloatNode).sub(rise).add(sqrt(R.mul(R).sub(dx.mul(dx)).max(0)));
    lancet = aaStep(0.0, hw.sub(across)).mul(aaStep(0.0, y.sub(ld.z))).mul(aaStep(0.0, archTop.sub(y))).mul(step(1e-3, hw)).mul(isWall) as unknown as FloatNode;
    // each stone facet lifts as a whole: its step up the monolith, a key of its own; rubble and slate sit darker
    lift = centre.sub(0.45).mul(uni.gradient).add(faceKey.sub(0.5).mul(0.07)).add(isRubble.mul(-0.06)).add(isRoof.mul(-0.06)) as unknown as FloatNode;
    facetDark = pow(gf.oneMinus(), 1.3).mul(0.5).mul(earleGradients.surface).mul(max(isWall, isFacet)).mul(lancet.oneMinus()) as unknown as FloatNode;
    soft = float(0) as unknown as FloatNode;
    // joints and strokes barely show in the ink
    lineShadow = mix(ink, pal(2), 0.22) as unknown as Vec3Node;
    // worn tops (terrace, treads, broken walls): a few long joints, moss dots gathering in patches
    const fy = y.div(1.35).add(sin(u.mul(0.8)).mul(0.12));
    const frow = floor(fy);
    const fOn = step(hash(floor(u.div(1.9).add(hash(frow).mul(3.0))).add(frow.mul(11.0))), float(0.42));
    const fx = u.div(float(1.1).add(hash(frow.add(5.0)).mul(1.2))).add(hash(frow).mul(4.0));
    const flag = max(stripeMask(fy, 0.035).mul(fOn), stripeMask(fx, 0.03).mul(step(hash(floor(fx).add(frow.mul(7.0))), float(0.38))));
    const mossPatch = smoothstep(-0.2, 0.6, sin(u.mul(0.7).add(1.3)).mul(sin(y.mul(0.6).sub(u.mul(0.2)))));
    const flagMoss = stippleDots(u, y, 3.2, 0.19, mossPatch.mul(mossPatch).mul(0.26).add(0.005), 17).mask;
    layers.push({ mask: isF(FACE_CUT), row, lift: float(0.18), pattern: { mask: max(flag, flagMoss.mul(0.85)), color: mix(pal(6), pal(3, capRow), flagMoss) } });
  }
  const mask = max(wallMask.mul(isWall), facetLines.mul(isFacet));
  // ivy: dark green dots in the ink (a lighter green where the terminator lets them into the light); gold never shows
  // in the shade; the painted lancets are ink on both sides
  let patternMask = max(mask, gold) as unknown as FloatNode;
  let patternColor = mix(lineColor, pal(5), gold) as unknown as Vec3Node;
  let patternShadow = mix(lineShadow, ink, gold.mul(mask.oneMinus())) as unknown as Vec3Node;
  if (family === 'stone') {
    const ivyInk = pal(7);
    patternMask = max(patternMask, max(ivy, lancet)) as unknown as FloatNode;
    patternColor = mix(mix(patternColor, mix(ivyInk, pal(5), 0.3), ivy), ink, lancet) as unknown as Vec3Node;
    patternShadow = mix(mix(patternShadow, ivyInk, ivy), ink, lancet) as unknown as Vec3Node;
  }
  if (facetDark) {
    // the facet's own gradient: from its head (the step's colour) toward the next darker step at its foot — a layer one
    // step down, so the facet's edge stays the hard jump between two flat prints (Ebene 44/45), the ornament rides on
    // top; in the ink the layer shows the same ink and ornament (no lightening inside the shadow)
    layers.push({
      mask: facetDark,
      row,
      lift: float(-1).div(ctx.bands.sub(1)) as unknown as FloatNode,
      shadowColor: mix(ink, patternShadow, patternMask) as unknown as Vec3Node,
      pattern: { mask: patternMask, color: patternColor },
    });
  }
  return new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: row,
    fog: ctx.fog,
    bands: ctx.bands,
    bandScale: 1.35,
    terminator: 0.04,
    lift,
    pattern: { mask: patternMask, color: patternColor, shadowColor: patternShadow },
    layers,
    ...(soft ? { softNode: soft } : {}),
    positionNode: ctx.warp ? ctx.warp(positionLocal as unknown as Vec3Node) : null,
    fogDistNode: fogDistance(ctx),
  });
}
