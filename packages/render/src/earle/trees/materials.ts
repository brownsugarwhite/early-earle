import { LightingModel, NodeMaterial } from 'three/webgpu';
import type { Node, NodeBuilder } from 'three/webgpu';
import { abs, clamp, dot, float, floor, fract, fwidth, max, min, mix, normalView, normalize, select, sin, smoothstep, step, vec3 } from 'three/tsl';
import { aaStep, palByKey, steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node, type Vec4Node } from '../tsl';
import { blotches, flowLines, flowers, stipple, valueNoise3 } from './patterns';

/**
 * Kronenmaterial der Bäume v3: Earle-Licht wie `EarleMaterial` (`lit = min(aaStep(N·L), Schatten)` → Bänder →
 * exakte Palettenfarbe, gestufter Nebel, kein Ambient/Specular/Kontur) mit Schattierungsnormalen der Teilkuppeln und
 * zwei Ornamenten im Baumraum: Tüpfel (Earles Punktfelder — sie wachsen mit dem Licht und skalieren zum Terminator hin
 * weich auf 0, im Schatten ist die Krone reine Tinte) und Vier-Punkt-Blüten in den Motivfarben.
 */
export interface CrownMaterialOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  bands: TSLUniform;
  bandScale: number;
  /** Kronenzeile je Instanz. */
  rowNode: FloatNode;
  fogDistNode: FloatNode;
  /** Terminator je Instanz (N·L darunter = Tinte). */
  terminatorNode: FloatNode;
  growthNode: FloatNode | null;
  positionNode: Vec3Node;
  /** Musterkoordinate in Welteinheiten, fest an der Krone (Fragmentstufe). */
  patternPos: Vec3Node;
  /** Objektraum-Normale für die Tangentialebene der Blüten (Fragmentstufe). */
  patternNormal: Vec3Node;
  /** Tüpfel: Zellgröße (Welteinheiten), Punktradius relativ zur Zelle, Dichte (Knoten, z. B. je Welt). */
  stipple: { cell: number; size: number; density: FloatNode };
  /** Blütendichte (0 = keine), Zellgröße der Blüten. */
  flowers?: { density: FloatNode; cell: number } | null;
  /** Aufhellung der Bänder (z. B. Juwelenkuppeln leuchten rundum). */
  lift?: FloatNode | null;
  /**
   * Hüllnormale im View-Raum (Fragmentstufe): führt die Lichtbänder über den ganzen Baum (ein ruhiger Verlauf), während
   * die Kappennormale den Terminator formt (bucklige Grenze Licht/Tinte, wie Earles Kuppelränder).
   */
  hullNormalView?: Vec3Node | null;
}

export class CrownMaterial extends NodeMaterial {
  static override get type(): string {
    return 'EarleCrownMaterial';
  }

  constructor(readonly crown: CrownMaterialOptions) {
    super();
    this.lights = true;
    this.fog = false;
    this.positionNode = crown.positionNode;
  }

  override setupLightingModel(): LightingModel {
    return new CrownLightingModel(this.crown);
  }
}

class CrownLightingModel extends LightingModel {
  constructor(private readonly o: CrownMaterialOptions) {
    super();
  }

  override direct(input: Parameters<LightingModel['direct']>[0]): void {
    const o = this.o;
    const L = input.lightDirection as Vec3Node;
    const shadow = (input.lightColor as Vec3Node).r;
    const ndl = normalView.dot(L);
    const term = o.terminatorNode;
    const lit = min(aaStep(term, ndl), shadow);
    const ndlHull = o.hullNormalView ? normalize(o.hullNormalView).dot(L) : ndl;
    let v = ndlHull.sub(term).mul(o.bandScale);
    if (o.lift) v = v.add(o.lift);
    // Kronen: ein Band mehr als die geteilte Einstellung — der hellste Streifen ist ein schmaler Lichtsaum an der
    // Sonnenkante (Potenz staucht die oberen Bänder), die Masse bleibt ruhig im unteren Band
    // Obergrenze mitten im obersten Band: an der Sättigungskante wäre fract ≈ 1 bei fwidth > 0 → heller Strich
    const band = clamp(v, 0, 1).pow(1.6).mul(o.bands).min(o.bands.sub(0.5));
    const row = o.rowNode;
    let litColor = o.lookup.bands(band, row, 1).rgb as unknown as Vec3Node;
    // Punkte wachsen mit dem Licht: am Terminator 0, voll erst auf der Sonnenseite (weich, kein Ploppen)
    const grow = smoothstep(term.add(0.02), term.add(0.5), ndl).mul(shadow);
    const st = stipple(o.patternPos, o.stipple.cell, o.stipple.size, grow, o.stipple.density);
    // Getüpfelter Verlauf wie bei Earle (Bild 03): jeder Punkt eine Stufe heller als das Band unter ihm, nahe am Licht
    // einzelne zwei Stufen — ruhige Textur statt Konfetti
    const bandIdx = floor(band).add(1);
    const up = float(1).add(step(0.8, st.key.mul(0.5).add(grow.mul(0.55))));
    const dotColor = o.lookup.pal(clamp(bandIdx.add(up), 2, 5), row).rgb as unknown as Vec3Node;
    litColor = mix(litColor, dotColor, st.mask);
    if (o.flowers) {
      const fl = flowers(o.patternPos, o.patternNormal, o.flowers.cell, grow, o.flowers.density);
      const flowerColor = mix(o.lookup.pal(6, row).rgb, o.lookup.pal(7, row).rgb, step(0.5, fl.key)) as unknown as Vec3Node;
      litColor = mix(litColor, flowerColor, fl.mask);
    }
    const ink = o.lookup.pal(0, row).rgb as unknown as Vec3Node;
    let col = mix(ink, litColor, lit);
    if (o.growthNode) {
      const l = col.dot(vec3(0.3, 0.5, 0.2));
      const withered = mix(vec3(l), col, 0.35).mul(vec3(0.9, 0.82, 0.68));
      col = mix(withered, col, smoothstep(0, 1, o.growthNode));
    }
    (input.reflectedLight.directDiffuse as Vec3Node).addAssign(col);
  }

  override finish(builder: NodeBuilder): void {
    const context = builder.context as { outgoingLight?: Node };
    if (!context.outgoingLight) return;
    const out = context.outgoingLight as Vec3Node;
    out.assign(steppedFog(out, this.o.fog, this.o.lookup, this.o.fogDistNode));
  }
}

// --- Punkte -----------------------------------------------------------------------------------------------

export interface DotMaterialOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  fogDistNode: FloatNode;
  /** Farbe im Licht und im Schlagschatten (je Punkt). */
  litColor: Vec3Node;
  shadowColor: Vec3Node;
}

/**
 * Material der instanzierten Punkte: empfängt den Schlagschatten wie die Krone darunter (dieselbe Schattenkarte, je
 * Fragment) — wandert eine Schattenkante über eine Krone, deckt sie deren Punkte so stetig zu wie die Kronenfläche selbst
 * (kein Ploppen). Die Größe der Punkte folgt im Vertex-Shader dem N·L der Krone (weich aus 0).
 */
export class DotMaterial extends NodeMaterial {
  static override get type(): string {
    return 'EarleDotMaterial';
  }

  constructor(readonly dot: DotMaterialOptions) {
    super();
    this.lights = true;
    this.fog = false;
  }

  override setupLightingModel(): LightingModel {
    return new DotLightingModel(this.dot);
  }
}

class DotLightingModel extends LightingModel {
  constructor(private readonly o: DotMaterialOptions) {
    super();
  }

  override direct(input: Parameters<LightingModel['direct']>[0]): void {
    const shadow = (input.lightColor as Vec3Node).r;
    (input.reflectedLight.directDiffuse as Vec3Node).addAssign(mix(this.o.shadowColor, this.o.litColor, shadow));
  }

  override finish(builder: NodeBuilder): void {
    const context = builder.context as { outgoingLight?: Node };
    if (!context.outgoingLight) return;
    const out = context.outgoingLight as Vec3Node;
    out.assign(steppedFog(out, this.o.fog, this.o.lookup, this.o.fogDistNode));
  }
}

// --- Rinde ------------------------------------------------------------------------------------------------

/** Rindenstile (Index im Instanzattribut): Tinte, weiß (Kathedrale), Juwelenstreifen, Flechten, Kalligrafie. */
export const BARK_STYLE = { ink: 0, white: 1, striped: 2, lichen: 3, calligraphy: 4 } as const;
export type BarkStyle = keyof typeof BARK_STYLE;

export interface BarkMaterialOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  fogDistNode: FloatNode;
  positionNode: Vec3Node;
  /** Kronenzeile (Tinte, dunkle Rindentöne), Akzentzeile (helle Linien, Streifen, Flechten), Terrainzeile (Schnee). */
  rowNode: FloatNode;
  accentNode: FloatNode;
  terrainRowNode: FloatNode;
  styleNode: FloatNode;
  variantNode: FloatNode;
  /** Schnee 0..1 (Welt). */
  snowNode: FloatNode;
  /** Rinde (Fragmentstufe): u rundum 0..1, v längs (Welteinheiten), Ebene, Radius (Welteinheiten). */
  bark: Vec4Node;
  /** Objektraum-Position in Welteinheiten (Fragmentstufe) — nahtloses Rauschen für Flechten und Schneeflecken. */
  objPos: Vec3Node;
  /** Normale im Planetenraum und Lot am Baum (Fragmentstufe), für den Schnee auf den Oberseiten. */
  normalPlanet: Vec3Node;
  upPlanet: Vec3Node;
  growthNode: FloatNode | null;
}

export class BarkMaterial extends NodeMaterial {
  static override get type(): string {
    return 'EarleBarkMaterial';
  }

  constructor(readonly barkOptions: BarkMaterialOptions) {
    super();
    this.lights = true;
    this.fog = false;
    this.positionNode = barkOptions.positionNode;
  }

  override setupLightingModel(): LightingModel {
    return new BarkLightingModel(this.barkOptions);
  }
}

/** Linien rundum je Ebene (Stamm, Ast, Zweig, Wurzel): die Kalligrafie folgt der Form. */
function linesAround(level: FloatNode): FloatNode {
  return select(level.lessThan(0.5), float(16), select(level.lessThan(1.5), float(9), select(level.lessThan(2.5), float(4), float(7))));
}

class BarkLightingModel extends LightingModel {
  constructor(private readonly o: BarkMaterialOptions) {
    super();
  }

  override direct(input: Parameters<LightingModel['direct']>[0]): void {
    const o = this.o;
    const L = input.lightDirection as Vec3Node;
    const ndl = normalView.dot(L);
    const style = o.styleNode;
    const isWhite = style.greaterThan(0.5).and(style.lessThan(1.5));
    const isStriped = style.greaterThan(1.5).and(style.lessThan(2.5));
    const isLichen = style.greaterThan(2.5).and(style.lessThan(3.5));
    const isCalli = style.greaterThan(3.5);
    // Weiße Kathedralenstämme bleiben fast rundum hell (Ebene_23), sonst Tinte ab dem Terminator
    const term = select(isWhite, float(-0.35), float(0.02));
    const lit = aaStep(term, ndl);
    const row = o.rowNode;
    const acc = o.accentNode;
    const u = o.bark.x;
    const v = o.bark.y;
    const level = o.bark.z;
    const variant = o.variantNode;
    const ink = o.lookup.pal(0, row).rgb as unknown as Vec3Node;
    const dark = o.lookup.pal(1, row).rgb as unknown as Vec3Node;
    const light = o.lookup.pal(0, acc).rgb as unknown as Vec3Node;
    // Kalligrafie (Bild 01): feine, wellige helle Linien entlang des Stamms, im Licht hell, im Schatten grau
    const calli = flowLines(u.add(variant), v.mul(2.4), linesAround(level), select(isCalli, float(0.3), float(0.17)), select(isCalli, float(0.28), float(0.7)), 3);
    const lineShadow = mix(ink, light, 0.3);
    // Flechten (Bilder 03, 35): unregelmäßige Flecken, jeder in einer flachen Farbe der Akzentzeile (Hellgrün, Gelb)
    const p = o.objPos;
    // Flecken längs des Stamms gestreckt (Pinselstriche in Wuchsrichtung), Rand zweifach verbeult
    const wob = valueNoise3(p.mul(vec3(26.0, 9.0, 26.0)), 1).mul(0.6).add(valueNoise3(p.mul(vec3(61.0, 22.0, 61.0)), 5).mul(0.4));
    const lich = blotches(p.mul(vec3(1, 0.33, 1)), 0.05, 0.3, 0.55, wob);
    const blotch = lich.mask;
    const lichenCol = palByKey(o.lookup, lich.key, acc, 4, 5);
    // Juwelenstreifen (Bild 02): viele schmale, senkrechte Glasfenster-Striche in Juwelenfarben, abschnittsweise
    // unterbrochen (jedes Stück eigene Farbe), dazwischen Tinte, dazu feine schwarze Diagonalen
    const sCoord = u.mul(16.0).add(sin(v.mul(1.3).add(u.mul(12.566))).mul(0.25));
    const sIdx = floor(sCoord);
    const seg = floor(v.mul(float(1.6).add(fract(sIdx.mul(0.37)).mul(1.4))).add(sIdx.mul(0.61)));
    const sKey = fract(sin(sIdx.mul(12.9898).add(seg.mul(4.1414)).add(variant.mul(78.233))).mul(43758.5453));
    const stripeCol = select(
      sKey.lessThan(0.28),
      o.lookup.pal(1, acc).rgb,
      select(sKey.lessThan(0.5), o.lookup.pal(2, acc).rgb, select(sKey.lessThan(0.68), o.lookup.pal(3, acc).rgb, select(sKey.lessThan(0.8), o.lookup.pal(5, acc).rgb, ink))),
    ) as unknown as Vec3Node;
    const toEdge = float(0.5).sub(abs(fract(sCoord).sub(0.5)));
    const sw = fract(sKey.mul(7.7)).mul(0.25).add(0.12); // Strichbreite je Stück (Anteil zur Kante)
    const fwS = fwidth(sCoord).max(1e-4);
    const inStroke = smoothstep(sw.sub(fwS), sw.add(fwS), toEdge);
    const dw = v.mul(0.9).sub(u.mul(3.0)).add(variant);
    const toDiag = float(0.5).sub(abs(fract(dw).sub(0.5)));
    const fwD = fwidth(dw).max(1e-4);
    const diag = smoothstep(fwD.mul(1.5).add(0.025), float(0.025), toDiag);
    const striped = mix(mix(ink, stripeCol, inStroke), ink, diag);
    // Weiß (Ebene_23): blasser Stamm mit feinen senkrechten Rillen
    const grooves = flowLines(u, v.mul(1.2), float(11), 0.1, 0.5, 9);
    const white = mix(light, mix(light, dark, 0.35), grooves);
    // Stil → Licht- und Schattenfarbe
    const litCol = select(
      isWhite,
      white,
      select(isStriped, striped, select(isLichen, mix(mix(dark, lichenCol, blotch), light, calli.mul(0.6)), mix(ink, light, calli))),
    ) as unknown as Vec3Node;
    const shadowCol = select(
      isWhite,
      mix(ink, white, 0.42),
      select(isStriped, mix(ink, striped, 0.28), select(isLichen, mix(ink, lichenCol, blotch.mul(0.25)), mix(ink, lineShadow, calli))),
    ) as unknown as Vec3Node;
    let col = mix(shadowCol, litCol, lit);
    // Schnee auf den Oberseiten (Bilder 01/04): Fleckenrand aus Tüpfeln, die mit der Schneemenge wachsen
    const up = dot(normalize(o.normalPlanet), normalize(o.upPlanet));
    const wobble = wob.sub(0.5).mul(0.6);
    const amount = o.snowNode.mul(smoothstep(0.08, 0.55, up.add(wobble)));
    const specks = stipple(p, 0.035, 0.62, amount, 0.95);
    const snowMask = max(smoothstep(0.8, 0.88, amount), specks.mask.mul(step(0.04, amount)));
    const snowCol = mix(o.lookup.pal(3, o.terrainRowNode).rgb, o.lookup.pal(5, o.terrainRowNode).rgb, lit) as unknown as Vec3Node;
    col = mix(col, snowCol, snowMask);
    if (o.growthNode) {
      const l = col.dot(vec3(0.3, 0.5, 0.2));
      col = mix(mix(vec3(l), col, 0.35).mul(vec3(0.9, 0.82, 0.68)), col, smoothstep(0, 1, o.growthNode));
    }
    (input.reflectedLight.directDiffuse as Vec3Node).addAssign(col);
  }

  override finish(builder: NodeBuilder): void {
    const context = builder.context as { outgoingLight?: Node };
    if (!context.outgoingLight) return;
    const out = context.outgoingLight as Vec3Node;
    out.assign(steppedFog(out, this.o.fog, this.o.lookup, this.o.fogDistNode));
  }
}
