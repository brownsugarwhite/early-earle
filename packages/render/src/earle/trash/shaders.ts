import { DoubleSide, MeshBasicNodeMaterial, NormalBlending } from 'three/webgpu';
import type { UniformNode, Vector3 } from 'three/webgpu';
import {
  abs,
  atan,
  attribute,
  cameraProjectionMatrix,
  clamp,
  cos,
  dot,
  float,
  floor,
  fract,
  fwidth,
  hash,
  length,
  max,
  min,
  mix,
  modelViewMatrix,
  normalGeometry,
  normalize,
  positionGeometry,
  positionLocal,
  positionView,
  screenSize,
  select,
  sin,
  smoothstep,
  step,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { HEAL_SPAN } from '@ee/world';
import { patternTime, steppedFog, stripeMask, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from '../tsl';
import { TrashMaterial } from './material';
import { SEG_BUSH, SEG_CAP, SEG_SKIRT, SEG_SPIKE } from './geometry';

/** Uniforms und Helfer, die alle Müll-Shader teilen (eine Instanz je TrashField). */
export interface TrashShaderContext {
  lookup: PaletteLookup;
  fog: FogSettings;
  fogLookup: PaletteLookup;
  bands: TSLUniform;
  /** Animierter Fortschritt (geschaffte Knoten, fließend beim Feiern). */
  progress: TSLUniform;
  camLocal: UniformNode<'vec3', Vector3>;
  projScaleY: TSLUniform;
  nearClear: TSLUniform;
  footClear: TSLUniform;
  collapsePx: TSLUniform;
  /** Krümmungs-Warp des Planeten (Planetenraum). */
  warp: (p: Vec3Node) => Vec3Node;
  /** Schleier-Zusatzdistanz einer Welt (Nachbarwelten liegen im Nebel der eigenen). */
  veil: (world: FloatNode) => FloatNode;
  /** Fremdheit 0..1 einer Welt (nahe fremde Instanzen treten weg). */
  foreign: (world: FloatNode) => FloatNode;
  /** Zeile der Neon-Rampe und der Moosfarben (je Welt; Welt → Zeile über Tabelle). */
  neonRow: (world: FloatNode) => FloatNode;
  mossRow: (world: FloatNode) => FloatNode;
  /** Blütenzeile (Stufe 1 = Papierweiß der Welt: sauberer Nebel beim Heilen). */
  bloomRow: (world: FloatNode) => FloatNode;
  snowWorld: (world: FloatNode) => FloatNode;
  /**
   * Achsen der Schwaden (Planetenraum, Einheitsvektoren, langsam der Kamera nachgeführt): quer = Bildwaagrechte
   * (Schwaden liegen längs dieser Achse), längs = Blickrichtung in der Tangentialebene (Stapel in die Tiefe).
   */
  wispAcross: UniformNode<'vec3', Vector3>;
  wispAlong: UniformNode<'vec3', Vector3>;
  /** Gesamtfaktor für Neon (Lab-Regler, 1 = Inhalt) und für die Deckkraft des Schleiers. */
  neonScale: TSLUniform;
  veilScale: TSLUniform;
  /**
   * Unendliche Ebene (ADR 0002): der Müll liegt im flachen Raum (oben = +y, Lichtung unter der Kamera waagrecht
   * gemessen), die Schwaden-Koordinaten bekommen den Anker der Puffer (modulo 4096) dazu — sie bleiben beim Schwenken
   * und beim Neuaufbau an ihrem Ort in der Welt.
   */
  planar?: boolean;
  patternOffset?: UniformNode<'vec3', Vector3>;
}

const SPAN = HEAL_SPAN;

/**
 * Zufallswert 0..1 aus einem Ganzzahl-Schlüssel. three's `hash` wandelt den Schlüssel in eine vorzeichenlose Zahl
 * (negative Werte werden in WGSL zu 0 → auf der halben Form überall derselbe Wert), deshalb der Versatz ins Positive.
 */
function rnd(seed: FloatNode): FloatNode {
  return hash(seed.add(65536.0));
}

/** Heilzustand 0..1 (0 = unberührt, 1 = verschwunden) — dieselbe Formel wie `healAmount` in @ee/world. */
export function healNode(heal: FloatNode, progress: FloatNode): FloatNode {
  return clamp(progress.sub(heal.sub(SPAN)).div(SPAN), 0, 1);
}

/**
 * Instanz-Attribute des Mülls: trA = (Fuß xyz, Heilschwelle), trB = (oben xyz, Höhe), trC = (Zeile + Variante,
 * Neon, Welt, Teilform), trD = (Achse xyz, –).
 */
function attrs() {
  const trA = attribute('trA', 'vec4');
  const trB = attribute('trB', 'vec4');
  const trC = attribute('trC', 'vec4');
  return {
    base: trA.xyz as unknown as Vec3Node,
    heal: trA.w as unknown as FloatNode,
    up: trB.xyz as unknown as Vec3Node,
    height: trB.w as unknown as FloatNode,
    row: floor(trC.x.add(0.001)) as unknown as FloatNode,
    variant: fract(trC.x) as unknown as FloatNode,
    neon: trC.y as unknown as FloatNode,
    world: trC.z as unknown as FloatNode,
    shape: trC.w as unknown as FloatNode,
  };
}

/**
 * Nähe-Ausblendung wie bei der Vegetation: Instanzen, deren Achse der Kamera näher kommt als `nearClear`, und solche
 * in der Lichtung unter der Kamera (`footClear`) schrumpfen weg — nichts schneidet in die Linse.
 */
function fades(ctx: TrashShaderContext, base: Vec3Node, top: Vec3Node, radius: FloatNode, world: FloatNode, footless: FloatNode | null = null): FloatNode {
  const axis = top.sub(base);
  const len2 = axis.dot(axis).max(1e-4);
  const t = clamp(ctx.camLocal.sub(base).dot(axis).div(len2), 0, 1);
  const closest = base.add(axis.mul(t));
  const gap = ctx.camLocal.sub(closest).length().sub(radius);
  const near = smoothstep(ctx.nearClear, ctx.nearClear.add(1.6), gap);
  let foot: FloatNode;
  if (ctx.planar) {
    // Ebene: waagrechter Abstand zum Kamerafuß
    const lateral = length(base.xz.sub(ctx.camLocal.xz));
    foot = select(ctx.footClear.greaterThan(0.01), smoothstep(ctx.footClear, ctx.footClear.add(1.8), lateral), float(1)) as unknown as FloatNode;
  } else {
    const camUp = normalize(ctx.camLocal);
    const along = base.dot(camUp);
    const lateral = base.sub(camUp.mul(along)).length();
    foot = select(along.greaterThan(0).and(ctx.footClear.greaterThan(0.01)), smoothstep(ctx.footClear, ctx.footClear.add(1.8), lateral), float(1)) as unknown as FloatNode;
  }
  // Bodennahes (Blüten, Funken) bleibt auch in der Lichtung unter der Kamera: es verstellt nichts
  if (footless) foot = mix(foot, float(1), footless);
  // Fremde Welten nahe der Kamera treten weg (wie die Vegetation)
  const d = ctx.camLocal.sub(base).length();
  const foreign = mix(float(1), smoothstep(11, 14, d), ctx.foreign(world));
  return near.mul(foot).mul(foreign);
}

/**
 * Gemeinsame Vertex-Bewegung: Heilung (Neon erlischt, dann sinkt das Element ein Stück gestaucht in den Boden),
 * Nähe-Ausblendung, Krümmungs-Warp. `select` wählt im großen Mesh die Teilform der Instanz.
 */
function trashPosition(ctx: TrashShaderContext, options: { part?: FloatNode | null; deform?: ((local: Vec3Node) => Vec3Node) | null; radius: FloatNode }): Vec3Node {
  const a = attrs();
  const t = healNode(a.heal, ctx.progress);
  const sinkK = smoothstep(0.3, 1.0, t);
  const fade = fades(ctx, a.base, a.base.add(a.up.mul(a.height)), options.radius, a.world);
  const keep = options.part ? step(abs(options.part.sub(a.shape)), float(0.5)) : float(1);
  let local = positionLocal.sub(a.base) as unknown as Vec3Node;
  if (options.deform) local = options.deform(local);
  // Beim Versinken: flacher und schmaler werden (Stauchen), ein kurzes Zittern, dann ganz unter den Boden
  const along = local.dot(a.up);
  const squash = local.sub(a.up.mul(along.mul(sinkK.mul(0.45)))).mul(float(1).sub(sinkK.mul(0.22)));
  const shiver = sin(patternTime.mul(38).add(a.variant.mul(20))).mul(smoothstep(0.25, 0.4, t).mul(smoothstep(0.75, 0.55, t))).mul(0.025);
  const side = normalize(vec3(a.up.y, a.up.z.negate(), a.up.x).cross(a.up).add(1e-4));
  const moved = a.base
    .add(squash.mul(fade.mul(keep)))
    .add(side.mul(shiver.mul(a.height.min(1.5))))
    .sub(a.up.mul(sinkK.mul(a.height.mul(0.62).add(0.12))));
  return ctx.warp(moved);
}

/** Muster-Maske der Glyphenreihen (Müll-Schichten): Ringe, Kästchen, Zacken — anti-aliasiert, nie Umriss. */
function glyphs(u: FloatNode, v: FloatNode, seed: FloatNode): FloatNode {
  const cu = floor(u);
  const cv = floor(v);
  const h = rnd(cu.mul(17.0).add(cv.mul(131.0)).add(seed.mul(7.0)));
  const fu = fract(u).sub(0.5);
  const fv = fract(v).sub(0.5);
  const fw = fwidth(u).add(fwidth(v)).mul(0.5).max(1e-5);
  // Ring (Reifen im Schnitt)
  const r = length(vec2(fu, fv));
  const ring = smoothstep(fw.mul(1.2), float(0), abs(r.sub(0.26)).sub(0.07));
  // Kästchen (Kiste)
  const box = max(abs(fu), abs(fv));
  const sq = smoothstep(fw.mul(1.2), float(0), abs(box.sub(0.24)).sub(0.06));
  // Zacke (Earles Dreiecksfries)
  const tri = smoothstep(fw.mul(1.5), float(0), abs(fu).mul(2).sub(fv.add(0.5)).add(0.05).max(fv.sub(0.32)).max(fv.negate().sub(0.38)));
  const pick = select(h.lessThan(0.34), ring, select(h.lessThan(0.6), sq, select(h.lessThan(0.82), tri, float(0))));
  // zu fein → aus (kein Moiré)
  const fade = smoothstep(0.5, 0.2, fw);
  return pick.mul(fade);
}

/** Großes Mesh: Müllberge (Teilform 0..2) und Ruinen (3..6). */
export function createBigMaterial(ctx: TrashShaderContext): TrashMaterial {
  const a = attrs();
  const seg = attribute('seg', 'vec2');
  const part = seg.x as unknown as FloatNode;
  const tier = seg.y as unknown as FloatNode;
  const positionNode = trashPosition(ctx, { part, radius: a.height.mul(0.45) });
  const isRuin = a.shape.greaterThan(2.5);
  // Ruinen: Fenster, Mauerwerk, Ranken; Berge: Striche, Glyphenreihen, Neon-Lecks
  return new TrashMaterial({
    fog: ctx.fog,
    fogLookup: ctx.fogLookup,
    fogDistNode: positionView.length().add(ctx.veil(a.world)),
    // Berge: viel Tinte (dramatische Silhouetten), Ruinen: Stein etwas heller
    terminator: select(isRuin, float(0.03), float(0.05)),
    positionNode,
    shade: (lit, ndl) => {
      const p = positionGeometry;
      const n = normalGeometry;
      const row = a.row;
      const t = healNode(a.heal, ctx.progress);
      const neonAmt = a.neon.mul(ctx.neonScale).mul(smoothstep(0.35, 0.0, t));
      const term = select(isRuin, float(0.03), float(0.05));
      // Bänder: N·L ab Terminator; Absätze und Kappen fangen das flache Licht (Earles helle Stufen am Turmfuß) —
      // im Gegenlicht lesen sich die Berge so als dunkle Masse mit hellen waagrechten Bruchbändern
      const upFace = smoothstep(0.45, 0.8, normalGeometry.y);
      const v = ndl.sub(term).mul(2.1).add(upFace.mul(0.55));
      const bandX = clamp(v, 0, 0.999).mul(ctx.bands.sub(1));
      const litCol = ctx.lookup.ramp(bandX, row, 1).rgb; // Verlauf in der Lichtfläche (Irisdruck)
      const ink = ctx.lookup.pal(0, row).rgb;
      // eine Stufe dunkler als das Band (im dunkelsten Band: Tinte) — Farbe der feinen Striche
      const darker = ctx.lookup.pal(floor(bandX), row).rgb;
      const pale = ctx.lookup.pal(5, row).rgb;
      const ang = atan(p.z, p.x);
      const side = smoothstep(0.75, 0.45, abs(n.y));
      const skirt = step(abs(tier.sub(SEG_SKIRT)), float(0.5));
      const cap = step(abs(tier.sub(SEG_CAP)), float(0.5));
      const spike = step(abs(tier.sub(SEG_SPIKE)), float(0.5));
      // --- Berge ---------------------------------------------------------------------------------------
      // senkrechte Striche (Earles Monolith-Maserung), leicht gewellt, nur in den hellen Bändern
      const strCoord = ang.mul(18 / (Math.PI * 2)).add(sin(p.y.mul(7).add(a.variant.mul(6))).mul(0.18));
      const strokes = stripeMask(strCoord, 0.1).mul(side).mul(float(1).sub(skirt)).mul(step(1.5, bandX));
      // Glyphenreihen (Müll im Schnitt: Reifen, Kisten, Zacken) — jede vierte Reihe, groß und ruhig
      const rowCoord = p.y.mul(9).add(a.variant.mul(3));
      const inRow = step(fract(rowCoord.div(4).add(0.1)), float(0.25));
      const gl = glyphs(ang.mul(16 / (Math.PI * 2)), rowCoord, a.variant).mul(inRow).mul(side).mul(float(1).sub(cap));
      // Neon-Rinnen: von der Krone in die Falten hinab wie Schneestreifen in Earles Bergen, nach unten spitz
      const colU = ang.mul(10 / (Math.PI * 2)).add(a.variant.mul(7));
      const colId = floor(colU);
      const hc = rnd(colId.mul(3.7).add(a.variant.mul(91)));
      const yEnd = rnd(colId.mul(11.3).add(2.0)).mul(0.45).add(0.18);
      const cx = abs(fract(colU).sub(0.5));
      const taper = smoothstep(yEnd, float(0.95), p.y).mul(0.13).add(0.02);
      const fwc = fwidth(colU).max(1e-5);
      const leak = smoothstep(taper.add(fwc), taper.sub(fwc), cx).mul(step(yEnd, p.y)).mul(step(hc, float(0.45))).mul(side).mul(float(1).sub(skirt));
      // Neonmoos auf Absätzen und Kappen: geschlossene Bänder, sektorweise unterbrochen (keine Zellen)
      const up = smoothstep(0.35, 0.7, n.y);
      const sector = rnd(floor(ang.mul(7 / (Math.PI * 2)).add(a.variant.mul(3))).add(a.variant.mul(17)));
      const mossCell = step(sector, float(0.45));
      const moss = up.mul(mossCell).mul(float(1).sub(spike));
      // --- Ruinen --------------------------------------------------------------------------------------
      // Mauerwerk: Lagerfugen + versetzte Stoßfugen (feine Linien in der Fläche, große ruhige Quader)
      const course = p.y.mul(8);
      const bed = stripeMask(course, 0.07);
      const alongWall = select(abs(n.z).greaterThan(0.5), p.x, select(abs(n.x).greaterThan(0.5), p.z, ang.mul(0.25)));
      const joint = stripeMask(alongWall.mul(4.5).add(floor(course).mul(0.5)), 0.05).mul(step(fract(course), float(0.88)));
      const masonry = max(bed, joint).mul(side);
      // Fensterschlitze im Turm (Teilform 4): dunkle Rechtecke rundum
      const slitU = ang.mul(8 / (Math.PI * 2)).add(0.5);
      const slitIn = smoothstep(0.12, 0.09, abs(fract(slitU).sub(0.5))).mul(step(0.28, p.y).mul(step(p.y, 0.44)).add(step(0.66, p.y).mul(step(p.y, 0.76))));
      const slits = slitIn.mul(step(abs(a.shape.sub(4)), float(0.5))).mul(side);
      // Ranken: gewundene Linien vom Boden her, verschieden lang
      const vineU = select(abs(n.z).greaterThan(0.5), p.x, select(abs(n.x).greaterThan(0.5), p.z, ang.mul(0.3))).mul(9).add(sin(p.y.mul(14).add(a.variant.mul(9))).mul(0.35));
      const vineH = rnd(floor(vineU).mul(7.7).add(a.variant.mul(33))).mul(0.7).add(0.1);
      const vines = stripeMask(vineU, 0.16).mul(step(p.y, vineH)).mul(step(rnd(floor(vineU).add(5.5)), float(0.55))).mul(side);
      const ruinMoss = max(up.mul(mossCell), smoothstep(0.1, 0.03, p.y).mul(mossCell).mul(side));
      // --- Farben ----------------------------------------------------------------------------------------
      const neonRow = ctx.neonRow(a.world);
      const neonLit = ctx.lookup.pal(4, neonRow).rgb;
      const neonDim = ctx.lookup.pal(2, neonRow).rgb;
      const mossRow = ctx.mossRow(a.world);
      const snow = ctx.snowWorld(a.world);
      const mossLit = ctx.lookup.pal(1, mossRow).rgb;
      const mossDim = ctx.lookup.pal(2, mossRow).rgb;
      const isSnow = step(0.5, snow);
      // Kappen: Neonmoos (Zellen, erlischt beim Heilen) oder Schnee (geschlossen, in der Tinte blau wie bei Earle)
      const capMask = mix(moss.mul(neonAmt), up.mul(float(1).sub(spike)), isSnow);
      const capLit = mix(neonLit, mossLit, isSnow);
      const capInk = mix(neonDim, mossDim, isSnow);
      // Berg: Striche dunkler, Glyphen hell, Lecks neon (glimmen auch in der Tinte), Kappen
      const leakAmt = leak.mul(neonAmt);
      // Tinte bleibt Tinte, aber mit Textur: Glyphen eine Stufe heller (Earles dunkle Flächen tragen Ornament)
      const inkTex = ctx.lookup.pal(1, row).rgb;
      const heapLit = mix(mix(mix(mix(litCol, darker, strokes.mul(0.85)), pale, gl.mul(0.9)), neonLit, leakAmt), capLit, capMask);
      // Rinnen glimmen in der Tinte heller als Moos (Neon als Licht in der dunklen Masse)
      const neonGlow = ctx.lookup.pal(3, neonRow).rgb;
      const heapInk = mix(mix(mix(ink, inkTex, gl.mul(0.8)), neonGlow, leakAmt), capInk, capMask.mul(0.75));
      // Ruine: Fugen dunkler, Ranken tintengrün, Fenster Tinte, Überwucherung (Neon, grünes Moos oder Schnee)
      const vineCol = ctx.lookup.pal(1, row).rgb;
      const noNeon = step(a.neon, float(0.05));
      const ruinCapMask = mix(ruinMoss.mul(max(neonAmt, noNeon.mul(0.85))), up, isSnow);
      const ruinCapLit = mix(mix(neonLit, mossLit, noNeon), mossLit, isSnow);
      const ruinCapInk = mix(mix(neonDim, mossDim, noNeon), mossDim, isSnow);
      const ruinLit = mix(mix(mix(mix(litCol, darker, masonry.mul(0.7)), vineCol, vines.mul(0.9)), ink, slits), ruinCapLit, ruinCapMask);
      const ruinInk = mix(mix(ink, inkTex, masonry.mul(0.6)), ruinCapInk, ruinCapMask.mul(0.6));
      // Überwucherung (Kuppelbüsche an Ruinen): dunkle Kuppel, Punktrand in Moosfarbe auf der Lichtseite (Earles Kronen)
      const isBush = step(abs(tier.sub(SEG_BUSH)), float(0.5));
      const dc = p.mul(30).add(a.variant.mul(3.1));
      const dotCell = rnd(floor(dc.x).mul(7).add(floor(dc.y).mul(113)).add(floor(dc.z).mul(311)));
      const dfw = fwidth(dc.x).add(fwidth(dc.y)).max(1e-4);
      const dot = smoothstep(float(0.34).add(dfw), float(0.34).sub(dfw), length(fract(dc).sub(0.5))).mul(step(dotCell, float(0.45)));
      const bushLit = mix(mix(mossDim, ink, float(0.35)), mossLit, dot);
      const bushInk = mix(ink, mossDim, dot.mul(0.25));
      const litSide = mix(select(isRuin, ruinLit, heapLit), bushLit, isBush);
      const inkSide = mix(select(isRuin, ruinInk, heapInk), bushInk, isBush);
      return mix(inkSide, litSide, lit);
    },
  });
}

/** Kleinteile (Röhre, Ring, Block): eine Farbfunktion je Mesh, Muster je Unterform. */
export function createDebrisMaterial(ctx: TrashShaderContext, kind: 'tube' | 'ring' | 'block'): TrashMaterial {
  const a = attrs();
  const trD = attribute('trD', 'vec4');
  // Röhre: Flasche schnürt oben ein, Fass wölbt sich, Schornstein verjüngt sich (Achse aus trD)
  const deform =
    kind === 'tube'
      ? (local: Vec3Node): Vec3Node => {
          const axis = trD.xyz as unknown as Vec3Node;
          const along = local.dot(axis);
          const radial = local.sub(axis.mul(along));
          const y = positionGeometry.y;
          const bottle = mix(float(1), float(0.34), smoothstep(0.55, 0.78, y));
          const barrel = float(1).add(sin(y.mul(Math.PI)).mul(0.1));
          const chimney = float(1).sub(y.mul(0.18));
          const k = select(a.shape.lessThan(0.5), float(1), select(a.shape.lessThan(1.5), bottle, select(a.shape.lessThan(2.5), float(1), select(a.shape.lessThan(3.5), barrel, chimney))));
          return axis.mul(along).add(radial.mul(k));
        }
      : null;
  const positionNode = trashPosition(ctx, { deform, radius: a.height.mul(0.6).add(0.1) });
  return new TrashMaterial({
    fog: ctx.fog,
    fogLookup: ctx.fogLookup,
    fogDistNode: positionView.length().add(ctx.veil(a.world)),
    terminator: 0.03,
    positionNode,
    shade: (lit, ndl) => {
      const p = positionGeometry;
      const n = normalGeometry;
      const row = a.row;
      const t = healNode(a.heal, ctx.progress);
      const neonAmt = a.neon.mul(ctx.neonScale).mul(smoothstep(0.35, 0.0, t));
      // Oberseiten fangen das flache Gegenlicht (sonst lesen Kleinteile nur als Tintenkleckse)
      const v = ndl.sub(0.03).mul(2.2).add(smoothstep(0.55, 0.85, normalGeometry.y).mul(0.45));
      const bandX = clamp(v, 0, 0.999).mul(ctx.bands.sub(1));
      const litCol = ctx.lookup.ramp(bandX, row, 1).rgb; // Verlauf in der Lichtfläche (Irisdruck)
      const ink = ctx.lookup.pal(0, row).rgb;
      const pale = ctx.lookup.pal(5, row).rgb;
      const deep = ctx.lookup.pal(1, row).rgb;
      const neonRow = ctx.neonRow(a.world);
      const neonLit = ctx.lookup.pal(4, neonRow).rgb;
      const neonDim = ctx.lookup.pal(2, neonRow).rgb;
      const shape = a.shape;
      let litSide: Vec3Node;
      let inkSide: Vec3Node = ink;
      if (kind === 'tube') {
        const ang = atan(p.z, p.x);
        const sideF = smoothstep(0.7, 0.4, abs(n.y));
        // Dose: helles Etikettband; Rohr: dunkle Muffen; Fass: zwei Reifen + Neon-Deckel; Schornstein: Neon-Rand
        const label = step(0.3, p.y).mul(step(p.y, 0.62)).mul(sideF);
        const seam = stripeMask(ang.mul(1 / (Math.PI * 2)).add(0.5), 0.04).mul(sideF);
        const muffs = stripeMask(p.y.mul(4.0).add(0.5), 0.16).mul(sideF);
        const hoops = stripeMask(p.y.mul(3.0).add(0.5), 0.1).mul(sideF);
        const topCap = smoothstep(0.6, 0.9, n.y);
        const rim = step(0.9, p.y).mul(sideF).add(topCap);
        const isCan = shape.lessThan(0.5);
        const isPipe = shape.greaterThan(1.5).and(shape.lessThan(2.5));
        const isBarrel = shape.greaterThan(2.5).and(shape.lessThan(3.5));
        const isChimney = shape.greaterThan(3.5);
        const canCol = mix(mix(litCol, pale, label), deep, seam);
        const pipeCol = mix(litCol, deep, muffs);
        const barrelCol = mix(mix(litCol, deep, hoops), neonLit, topCap.mul(neonAmt));
        const chimCol = mix(litCol, neonLit, rim.mul(neonAmt));
        litSide = select(isCan, canCol, select(isPipe, pipeCol, select(isBarrel, barrelCol, select(isChimney, chimCol, litCol))));
        // Tintenseite mit Ornament eine Stufe heller (Reifen der Fässer, Muffen, Etikettkante): dunkle Silhouetten
        // im Gegenlicht tragen Zeichnung statt schwarz zu verklumpen
        const inkOrn = select(isPipe, muffs, select(isBarrel, hoops, select(isCan, seam.max(stripeMask(p.y.mul(3.3).add(0.5), 0.08).mul(sideF)), float(0))));
        inkSide = mix(mix(ink, deep, inkOrn.mul(0.85)), neonDim, select(isChimney, rim, select(isBarrel, topCap, float(0))).mul(neonAmt));
        // Flasche aus Neonglas: glimmt auch im Schatten
        const bottleGlow = step(abs(shape.sub(1)), float(0.5)).mul(neonAmt);
        inkSide = mix(inkSide, neonDim, bottleGlow.mul(0.8));
      } else if (kind === 'ring') {
        const ang = atan(p.z, p.x);
        // Reifen: Profil als Querstriche außen; Kabelrolle: dichte Windungen
        const outer = smoothstep(0.3, 0.42, length(vec2(p.x, p.z)));
        const tread = stripeMask(ang.mul(28 / (Math.PI * 2)), 0.3).mul(outer);
        const coil = stripeMask(ang.mul(46 / (Math.PI * 2)).add(p.y.mul(0.5)), 0.42);
        const isCoil = shape.greaterThan(0.5);
        litSide = select(isCoil, mix(litCol, deep, coil), mix(litCol, pale, tread.mul(0.8)));
        inkSide = mix(mix(ink, deep, select(isCoil, coil.mul(0.6), tread.mul(0.8))), neonDim, select(isCoil, coil.mul(neonAmt).mul(0.8), float(0)));
        litSide = mix(litSide, neonLit, select(isCoil, coil.mul(neonAmt), float(0)));
      } else {
        // Kiste: Bretter; Ballen: gepresste Schichten mit Glyphen; Scherbe: hell, Kante in Neon; Träger: Nieten
        const sideF = smoothstep(0.7, 0.4, abs(n.y));
        const along = select(abs(n.x).greaterThan(0.5), p.z, p.x);
        const planks = stripeMask(p.y.mul(4.0), 0.1).mul(sideF).add(stripeMask(along.mul(1.0).add(0.5), 0.08).mul(sideF));
        const layers = stripeMask(p.y.mul(7.0), 0.22).mul(sideF);
        const baleGl = glyphs(along.mul(5).add(0.5), p.y.mul(7), a.variant).mul(sideF);
        const shardEdge = smoothstep(0.8, 0.95, p.y);
        const rivets = smoothstep(0.24, 0.12, length(vec2(fract(p.y.mul(9)).sub(0.5), fract(along.mul(1.0).add(0.5)).sub(0.5)))).mul(sideF);
        const isCrate = shape.lessThan(0.5);
        const isBale = shape.greaterThan(0.5).and(shape.lessThan(1.5));
        const isShard = shape.greaterThan(1.5).and(shape.lessThan(2.5));
        litSide = select(
          isCrate,
          mix(litCol, deep, planks.min(1)),
          select(isBale, mix(mix(litCol, deep, layers), pale, baleGl), select(isShard, mix(litCol, neonLit, shardEdge.mul(neonAmt)), mix(litCol, pale, rivets))),
        );
        const inkOrn = select(isCrate, planks.min(1), select(isBale, max(layers, baleGl), select(isShard, float(0), rivets)));
        inkSide = mix(mix(ink, deep, inkOrn.mul(0.8)), neonDim, select(isShard, shardEdge.mul(neonAmt).mul(0.6), float(0)));
      }
      return mix(inkSide, litSide, lit);
    },
  });
}

/**
 * Neon-Pfützen: flache Fächer mit welligem Rand, geschichtet wie Earles Wasser (Tintenrand, tiefes Grün, Neon,
 * heller Reflex, langsam driftende Ringlinien). Trocknen beim Heilen ein (Radius → 0, Neon → stumpf).
 */
export function createGooMaterial(ctx: TrashShaderContext): MeshBasicNodeMaterial {
  const a = attrs();
  const t = healNode(a.heal, ctx.progress);
  const p = positionGeometry;
  const r = length(vec2(p.x, p.z)).mul(2); // 0 Mitte … 1 Rand
  const ang = atan(p.z, p.x);
  const wob = float(1)
    .add(sin(ang.mul(3).add(a.variant.mul(20))).mul(0.16))
    .add(sin(ang.mul(7).add(a.variant.mul(11))).mul(0.07))
    .add(sin(ang.mul(2).sub(patternTime.mul(0.4)).add(a.variant.mul(5))).mul(0.03));
  const dry = float(1).sub(smoothstep(0.1, 0.85, t));
  const fade = fades(ctx, a.base, a.base.add(a.up.mul(0.3)), float(0.6), a.world);
  const local = positionLocal.sub(a.base).mul(select(r.greaterThan(0.5), wob, float(1))).mul(dry.mul(fade));
  const material = new MeshBasicNodeMaterial();
  material.positionNode = ctx.warp(a.base.add(local).add(a.up.mul(0.018)));
  const rn = varying(r, 'vTrashGooR');
  const row = a.row;
  const neonAmt = a.neon.mul(ctx.neonScale).mul(smoothstep(0.35, 0.0, t));
  const lines = stripeMask(rn.mul(4.2).sub(patternTime.mul(0.12)).add(a.variant.mul(3)), 0.12).mul(step(rn, float(0.66)));
  // Reflex: schräg liegende, lange Ellipse (heller Streifen wie Earles Wasserflächen)
  const hx = p.x.mul(2).add(0.22);
  const hz = p.z.mul(2).add(0.18);
  const e1 = hx.mul(0.8).add(hz.mul(0.6));
  const e2 = hz.mul(0.8).sub(hx.mul(0.6));
  const q = e1.mul(e1).div(0.36 * 0.36).add(e2.mul(e2).div(0.09 * 0.09));
  const fq = fwidth(q).max(1e-4);
  const hl = smoothstep(float(1).add(fq), float(1).sub(fq), q);
  const band = select(rn.greaterThan(0.84), float(1), select(rn.greaterThan(0.62), float(2), float(4)));
  const base = ctx.lookup.pal(band, row).rgb;
  const withLines = mix(base, ctx.lookup.pal(3, row).rgb, lines);
  const withHl = mix(withLines, ctx.lookup.pal(5, row).rgb, hl.mul(step(rn, float(0.6))));
  // Eintrocknen: Neon → stumpfes Oliv (Tinte der Welt, eine Stufe heller)
  const dull = mix(ctx.lookup.pal(0, row).rgb, ctx.lookup.pal(1, row).rgb, step(0.84, rn).oneMinus());
  const col = mix(dull, withHl, neonAmt.max(0.15));
  material.colorNode = steppedFog(col, ctx.fog, ctx.fogLookup, positionView.length().add(ctx.veil(a.world)));
  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  material.polygonOffsetUnits = -2;
  return material;
}

/**
 * Sporen: winzige opake Sechsecke (wie Earles Punkte), Billboard im View-Raum. Art 0 = Säule über einer Gasquelle,
 * 1 = schwebend im Schleier (steigt beim Heilen auf und vergeht), 2 = Heil-Ausbruch über Bergen/Ruinen/Quellen
 * (nur während der Heilung sichtbar: die Feier nach einem gewonnenen Level).
 */
export function createSporeMaterial(ctx: TrashShaderContext): MeshBasicNodeMaterial {
  const spA = attribute('spA', 'vec4');
  const spB = attribute('spB', 'vec4');
  const spC = attribute('spC', 'vec4');
  const src = spA.xyz as unknown as Vec3Node;
  const phase = spA.w as unknown as FloatNode;
  const up = spB.xyz as unknown as Vec3Node;
  const size0 = spB.w as unknown as FloatNode;
  const heal = spC.x as unknown as FloatNode;
  const kind = spC.y as unknown as FloatNode;
  const row = spC.z as unknown as FloatNode;
  const world = spC.w as unknown as FloatNode;
  const t = healNode(heal, ctx.progress);
  const side = normalize(vec3(up.y, up.z.negate(), up.x).cross(up).add(1e-4));
  const side2 = normalize(up.cross(side));
  // Art 0: Säule
  const c = fract(patternTime.mul(0.16).add(phase));
  const colH = c.mul(1.7).add(0.1);
  const colPos = src.add(up.mul(colH)).add(side.mul(sin(c.mul(9).add(phase.mul(20))).mul(0.1).mul(c)));
  const colSize = size0.mul(float(1).sub(c.mul(0.75))).mul(float(1).sub(smoothstep(0.1, 0.5, t)));
  // Art 1: schwebend, beim Heilen aufsteigend
  const drift = side.mul(sin(patternTime.mul(0.23).add(phase.mul(40))).mul(0.25)).add(side2.mul(cos(patternTime.mul(0.17).add(phase.mul(23))).mul(0.25)));
  const bob = up.mul(sin(patternTime.mul(0.6).add(phase.mul(30))).mul(0.07));
  const flPos = src.add(drift).add(bob).add(up.mul(t.mul(t).mul(3.2)));
  const flSize = size0.mul(float(1).sub(smoothstep(0.35, 1.0, t)));
  // Art 2: Ausbruch
  const bt = smoothstep(0.15, 1.0, t);
  const burstPos = src.add(up.mul(bt.mul(2.4).add(sin(phase.mul(12)).mul(0.2)))).add(side.mul(cos(phase.mul(37)).mul(bt).mul(0.9))).add(side2.mul(sin(phase.mul(53)).mul(bt).mul(0.9)));
  const burstSize = size0.mul(sin(bt.mul(Math.PI))).mul(step(0.16, t));
  // Art 3: Blüte am Boden, wo Müll lag (Earle-Natur übernimmt): wächst am Ende der Heilung auf und bleibt, atmet leicht
  const bloomPos = src.add(up.mul(0.03));
  const bloomSize = size0.mul(smoothstep(0.7, 1.0, t)).mul(sin(patternTime.mul(0.8).add(phase.mul(30))).mul(0.12).add(1));
  const isCol = kind.lessThan(0.5);
  const isFloat = kind.greaterThan(0.5).and(kind.lessThan(1.5));
  const isBloom = kind.greaterThan(2.5);
  const center = ctx.warp(select(isCol, colPos, select(isFloat, flPos, select(isBloom, bloomPos, burstPos))) as unknown as Vec3Node);
  const sizeW = select(isCol, colSize, select(isFloat, flSize, select(isBloom, bloomSize, burstSize))).mul(fades(ctx, src, src.add(up.mul(0.5)), float(0.3), world, step(1.5, kind)));
  const viewC = modelViewMatrix.mul(vec4(center, 1));
  const depth = viewC.z.negate().max(0.05);
  const pxPerUnit = ctx.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
  const px = sizeW.mul(pxPerUnit);
  // Ausbrüche der Feier etwas größer als die ruhigen Sporen (4.4 statt 3.4 px bei 900 px Bildhöhe)
  const maxPx = screenSize.y.mul(select(kind.greaterThan(1.5).and(kind.lessThan(2.5)), float(4.4), float(3.4)).div(900));
  const sizeEff = clamp(sizeW, float(1.1).div(pxPerUnit), maxPx.div(pxPerUnit)).mul(step(ctx.collapsePx, px));
  const material = new MeshBasicNodeMaterial();
  material.vertexNode = cameraProjectionMatrix.mul(vec4(viewC.xyz.add(vec3(positionGeometry.x, positionGeometry.y, 0).mul(sizeEff)), 1));
  const dist = varying(depth, 'vTrashSporeDist');
  // Säule neon → hell nach oben; Schweber neon; Ausbruch: helle Earle-Punkte (Gas wird zu Licht)
  // Blüten: Farbstufe in der Art kodiert (3 + Stufe/10): goldene Mitte, Blätter in Papier, Rosa, Mint oder Apricot
  const bloomIdx = floor(kind.sub(3).mul(10).add(0.5)).clamp(1, 5);
  const idx = select(isCol, select(c.greaterThan(0.55), float(5), float(4)), select(isFloat, float(4), select(isBloom, bloomIdx, float(5))));
  material.colorNode = steppedFog(ctx.lookup.pal(idx, row).rgb, ctx.fog, ctx.fogLookup, dist.add(ctx.veil(world)));
  return material;
}

/**
 * Neon-Nebelschleier: mehrere Lagen auf festen Höhen über dem Grundradius (sie füllen die Senken, Hügel ragen als
 * Inseln heraus; wo eine Lage den Hang schneidet, entsteht eine Höhenlinie → gestufte Earle-Nebelbänder). In jeder
 * Lage ziehen langsam gestreckte Schwaden (hart gestuft, heller Saum), feine Streifen darin. Beim Heilen wachsen die
 * Löcher, bis die Lage verschwindet.
 */
export function createVeilMaterial(ctx: TrashShaderContext, radius: number): MeshBasicNodeMaterial {
  const vA = attribute('vA', 'vec4');
  const strength = vA.x as unknown as FloatNode;
  const heal = vA.y as unknown as FloatNode;
  const open = vA.z as unknown as FloatNode;
  const layer = vA.w as unknown as FloatNode;
  const vW = attribute('vW', 'float') as unknown as FloatNode;
  const material = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: DoubleSide, blending: NormalBlending });
  material.positionNode = ctx.warp(positionLocal as unknown as Vec3Node);
  const clear = varying(healNode(heal, ctx.progress), 'vTrashVeilClear');
  const st = varying(strength.mul(mix(float(0.35), float(1), open)), 'vTrashVeilStrength');
  const lay = varying(layer, 'vTrashVeilLayer');
  const wv = varying(vW, 'vTrashVeilWorld');
  // Koordinaten: u = Tiefe (Blickrichtung in der Tangentialebene), v = Bildwaagrechte. Die Schwaden sind längs v
  // gestreckt → sie liegen immer quer im Bild wie Earles Nebelstreifen; die Achsen folgen der Kamera langsam (nach
  // einer Drehung legt sich der Nebel in ein, zwei Sekunden neu), die Lage im Gelände bleibt fest (Höhenlinien, Heilung)
  const pg = (ctx.patternOffset ? positionGeometry.add(ctx.patternOffset) : positionGeometry) as unknown as Vec3Node;
  const u = dot(pg, ctx.wispAlong);
  const v = dot(pg, ctx.wispAcross);
  void radius;
  const time = patternTime;
  const ph = lay.mul(1.7);
  const camDist = positionView.length();
  // Linse frei halten (Kamera nah an einer Lage: ausblenden)
  const nearFade = smoothstep(1.2, 3.6, camDist);
  // --- Lage 0: Talschleier. Flache Tönung der Senken; die Form geben die Höhenlinien, an denen die Lage den Hang
  // schneidet (gestuft wie Earles Nebel im Tal), wenige große ziehende Löcher
  const hn = sin(u.mul(0.33).add(sin(v.mul(0.21).add(time.mul(0.01))).mul(1.3)).add(time.mul(0.02)))
    .mul(0.6)
    .add(sin(u.mul(0.71).sub(v.mul(0.43)).add(time.mul(0.015))).mul(0.4));
  const hth = float(-0.72).add(clear.mul(1.9));
  const hfw = fwidth(hn).max(1e-4);
  const haze = smoothstep(hth.sub(hfw), hth.add(hfw), hn);
  // --- Lagen 1+: Schwaden. Lange waagrechte Bänder (längs v gestreckt → im Kartenblick längs des Pfads liegen sie quer
  // im Bild), in der Tiefe gestapelt wie Earles Nebelstreifen: harte Oberkante, gestuft auslaufende Unterkante,
  // endlich lang (je Schwade eigene Phase), langsam ziehend
  const bend = sin(v.mul(0.16).add(ph.mul(3.0))).mul(1.6).add(sin(v.mul(0.061).add(time.mul(0.008))).mul(2.4));
  // leicht gewellte Oberkante (kein Lineal)
  const sc = u.mul(0.17).add(bend.mul(0.17)).add(sin(v.mul(0.7).add(ph.mul(5.0))).mul(0.03)).add(time.mul(0.004)).add(ph.mul(0.37));
  const idx = floor(sc);
  const pr = fract(sc);
  const seed = rnd(idx.mul(13.0).add(lay.mul(101.0)));
  const lenMask = sin(v.mul(0.2).add(seed.mul(6.283)).add(time.mul(0.015))).add(seed.sub(0.5).mul(0.6));
  // Spindelform: zu den Enden hin dünner (gerade Oberkante, gewölbte Unterkante wie Earles Nebelstreifen); die Dicke
  // schrumpft mit der Heilung (die Schwade wird zum Faden und reißt ab)
  const lens = smoothstep(0.1, 0.75, lenMask);
  const thick = float(0.3).mul(float(1).sub(clear.mul(0.95))).mul(lens);
  const pfw = fwidth(sc).max(1e-4);
  const top = smoothstep(float(0).sub(pfw), float(0).add(pfw), pr);
  const core = top.mul(smoothstep(thick.mul(0.55).add(pfw), thick.mul(0.55).sub(pfw), pr));
  const halo = top.mul(smoothstep(thick.add(pfw), thick.sub(pfw), pr));
  const lfw = fwidth(lenMask).max(1e-4);
  const inCore = smoothstep(float(0.42).sub(lfw), float(0.42).add(lfw), lenMask);
  const wisp = halo.mul(0.5).add(core.mul(inCore).mul(0.5));
  // feine Linien längs der Schwaden (Ornament, nur im Kern)
  const fine = stripeMask(sc.mul(9.0), 0.1).mul(core).mul(inCore);
  const isHaze = lay.lessThan(0.5);
  const alphaHaze = haze.mul(0.2);
  const alphaWisp = wisp.mul(select(lay.lessThan(1.5), float(0.5), float(0.42))).add(fine.mul(0.08));
  const alpha = select(isHaze, alphaHaze, alphaWisp).mul(st).mul(float(1).sub(clear.mul(clear))).mul(nearFade).mul(ctx.veilScale);
  const neonRow = ctx.neonRow(wv);
  const deepC = ctx.lookup.pal(3, neonRow).rgb;
  const litC = ctx.lookup.pal(4, neonRow).rgb;
  const paleC = ctx.lookup.pal(5, neonRow).rgb;
  const wispCol = mix(litC, paleC, core.mul(inCore));
  const neonCol = select(isHaze, deepC, mix(wispCol, paleC, fine.mul(0.5)));
  // Beim Heilen wird aus dem Gift Earle-Nebel: Neon bleicht zu Papierweiß aus, bevor die Schwade vergeht
  const cleanC = ctx.lookup.pal(1, ctx.bloomRow(wv)).rgb;
  const col = mix(neonCol, cleanC, smoothstep(0.05, 0.55, clear));
  material.colorNode = steppedFog(col, ctx.fog, ctx.fogLookup, camDist.add(ctx.veil(wv)));
  material.opacityNode = min(alpha, float(0.85));
  return material;
}
