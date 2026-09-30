import { LightingModel, NodeMaterial } from 'three/webgpu';
import type { Node, NodeBuilder } from 'three/webgpu';
import { abs, clamp, cos, dot, float, floor, fract, fwidth, max, min, mix, normalView, normalize, select, sin, smoothstep, step, varying, vec3 } from 'three/tsl';
import { aaStep, palByKey, steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node, type Vec4Node } from '../tsl';
import { STEP_GRADIENT, earleGradients, hueRotate, stepRamp } from '../gradients';
import { blotches, flowLines, flowers, stipple, valueNoise3 } from './patterns';
import type { ShadeTexture } from './shade';

/** Nebel je Instanz (Bäume v4, siehe `trees/fog.ts`): ersetzt den gestuften Nebel je Fragment, wenn gesetzt. */
export type FogFn = (color: Vec3Node) => Vec3Node;

/**
 * Juwelenkuppeln (Bild 02): Farbtondrehung zur Unterseite (Bogenmaß) — rot → magenta → violett, wie Earles Irisdruck
 * innerhalb einer Kuppel. Oben bleibt die Palettenfarbe; die Drehung ändert nur den Farbton, die Facetten bleiben hart.
 */
const JEWEL_TURN = 1.0;

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
  stipple: { cell: number | FloatNode; size: number; density: FloatNode };
  /**
   * Tintenkörper (Tannen, Bild 05): die Krone bleibt rundum Tinte, nur die hellen Punkte zeichnen sie — sonnenseitig
   * größer und heller, auf der Schattenseite klein und gedämpft (nie ganz weg: der Tannenwald ist aus Punkten gemacht).
   */
  inkBody?: boolean;
  /** Blütendichte (0 = keine), Zellgröße der Blüten. */
  flowers?: { density: FloatNode; cell: number } | null;
  /** Aufhellung der Bänder (z. B. Juwelenkuppeln leuchten rundum). */
  lift?: FloatNode | null;
  /**
   * Hüllnormale im View-Raum (Fragmentstufe): führt die Lichtbänder über den ganzen Baum (ein ruhiger Verlauf), während
   * die Kappennormale den Terminator formt (bucklige Grenze Licht/Tinte, wie Earles Kuppelränder).
   */
  hullNormalView?: Vec3Node | null;
  /**
   * Anteil des Schlagschattens 0..1 (Fragmentstufe): 1 an der Unterseite, 0 auf der Kuppel. Bei 10° Sonne läge sonst jede
   * Krone hinter der ersten Reihe ganz im Schatten ihres Vordermanns — Earle malt Haine als Kuppeln mit hellen Scheiteln
   * und dunklen Fugen dazwischen (Bild 03).
   */
  castWeight?: FloatNode | null;
  /** Bäume v4: Textur der Schattenseite (dunkel auf dunkel, `trees/shade.ts`), liegt über der Farbe. */
  shadeTexture?: ShadeTexture | null;
  /** Bäume v4: Nebel je Instanz statt je Fragment. */
  fogFn?: FogFn | null;
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
    // Schlagschatten nur auf der Sonnenseite: die Rückseite liegt hinter der eigenen (in der Karte stehenden) dunklen
    // Seite — Juwelenkuppeln (Terminator < 0) leuchten sonst nicht mehr rundum
    const castW = smoothstep(-0.02, 0.1, ndl).mul(o.castWeight ?? float(1));
    const cast = mix(float(1), shadow, castW);
    const lit = min(aaStep(term, ndl), cast);
    const ndlHull = o.hullNormalView ? normalize(o.hullNormalView).dot(L) : ndl;
    // Rundum leuchtende Kronen (Terminator < 0, Juwelen): Bänder über die ganze Kugel verteilt statt am Terminator
    const scaleN = select(term.lessThan(0), float(0.55), float(o.bandScale));
    let v = ndlHull.sub(term).mul(scaleN);
    if (o.lift) v = v.add(o.lift);
    // Kronen: ein Band mehr als die geteilte Einstellung — der hellste Streifen ist ein schmaler Lichtsaum an der
    // Sonnenkante (Potenz staucht die oberen Bänder), die Masse bleibt ruhig im unteren Band
    // Obergrenze mitten im obersten Band: an der Sättigungskante wäre fract ≈ 1 bei fwidth > 0 → heller Strich
    const band = clamp(v, 0, 1).pow(1.6).mul(o.bands).min(o.bands.sub(0.5));
    const row = o.rowNode;
    const ink = o.lookup.pal(0, row).rgb as unknown as Vec3Node;
    if (o.inkBody) {
      // Tanne: Tinte mit hellen Punkten; Schlagschatten dämpft die Punkte (kleiner, dunkler), löscht sie aber nicht
      const light = smoothstep(-0.1, 0.5, ndl).mul(mix(float(0.35), float(1), cast));
      const st = stipple(o.patternPos, o.stipple.cell, o.stipple.size, float(0.55).add(light.mul(0.45)), o.stipple.density);
      const dotIdx = float(3).add(step(0.45, light.add(st.key.mul(0.3))).mul(2));
      const col = mix(ink, o.lookup.pal(dotIdx, row).rgb as unknown as Vec3Node, st.mask);
      (input.reflectedLight.directDiffuse as Vec3Node).addAssign(col);
      return;
    }
    const soft = earleGradients.surface;
    // Harte Facetten (Bänder); innerhalb jeder Facette ein Verlauf von oben (hell) zur Unterseite (tief) — Earles Kuppeln
    // sind von oben beleuchtet (Bild 02, 03)
    const upness = normalize(o.patternNormal).y;
    let litColor = stepRamp(o.lookup, band, row, 1, clamp(upness.mul(1.2), -1, 1), soft.mul(STEP_GRADIENT)).rgb as unknown as Vec3Node;
    // Punkte wachsen mit dem Licht: am Terminator 0, voll erst auf der Sonnenseite (weich, kein Ploppen)
    const grow = smoothstep(term.add(0.02), term.add(0.5), ndl).mul(cast);
    const st = stipple(o.patternPos, o.stipple.cell, o.stipple.size, grow, o.stipple.density);
    // Getüpfelter Verlauf wie bei Earle (Bild 03): jeder Punkt eine Stufe heller als das Band unter ihm, nahe am Licht
    // einzelne zwei Stufen — ruhige Textur statt Konfetti
    const bandIdx = floor(band).add(1);
    const up = float(1).add(step(0.8, st.key.mul(0.5).add(grow.mul(0.55))));
    const dotColor = o.lookup.pal(clamp(bandIdx.add(up), 2, 5), row).rgb as unknown as Vec3Node;
    litColor = mix(litColor, dotColor, st.mask);
    // Juwelen (Terminator < 0): Farbton dreht zur Unterseite (rot → violett, Bild 02) — innerhalb der Facetten, der Wert
    // bleibt. Winkel, cos und sin je Vertex (Normale und Terminator sind Vertex-Größen), die Drehung je Pixel
    const isJewel = select(term.lessThan(0), float(1), float(0));
    const angle = float(1).sub(normalize(o.patternNormal).y).mul(-0.5 * JEWEL_TURN).mul(isJewel);
    litColor = hueRotate(litColor, mix(float(1), varying(cos(angle)), soft), varying(sin(angle)).mul(soft));
    if (o.flowers) {
      const fl = flowers(o.patternPos, o.patternNormal, o.flowers.cell, grow, o.flowers.density);
      const flowerColor = mix(o.lookup.pal(6, row).rgb, o.lookup.pal(7, row).rgb, step(0.5, fl.key)) as unknown as Vec3Node;
      litColor = mix(litColor, flowerColor, fl.mask);
    }
    let col = mix(ink, litColor, lit);
    if (o.shadeTexture) col = o.shadeTexture(col, { lit, ndl, term, cast, row });
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
    out.assign(this.o.fogFn ? this.o.fogFn(out) : steppedFog(out, this.o.fog, this.o.lookup, this.o.fogDistNode));
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
  /** Anteil des Schlagschattens (wie die Krone darunter: Kuppel-Scheitel frei, Unterseite ganz). */
  castWeight?: FloatNode | null;
  /**
   * Licht je Punkt aus der Vertex-Stufe (1 = Sonne, 0 = Schatten; glatter Schattenwert am Punktmittelpunkt): ersetzt die
   * Schattenkarte je Fragment — der Punkt wechselt die Farbe als Ganzes, nie halb.
   */
  shade?: FloatNode | null;
  /** Bäume v4: Nebel je Instanz statt je Fragment. */
  fogFn?: FogFn | null;
}

/**
 * Material der instanzierten Punkte. Mit `shade` (glatter Schattenwert je Punkt aus der Vertex-Stufe, siehe
 * `SunRig.shadowFactor`) skalieren die Punkte im Schlagschatten stetig aus 0 und wechseln die Farbe als Ganzes; ohne
 * empfangen sie den Schlagschatten je Fragment wie die Krone darunter. Die Größe folgt außerdem dem N·L der Krone.
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
    const shadow = this.o.shade ?? mix(float(1), (input.lightColor as Vec3Node).r, this.o.castWeight ?? float(1));
    (input.reflectedLight.directDiffuse as Vec3Node).addAssign(mix(this.o.shadowColor, this.o.litColor, shadow));
  }

  override finish(builder: NodeBuilder): void {
    const context = builder.context as { outgoingLight?: Node };
    if (!context.outgoingLight) return;
    const out = context.outgoingLight as Vec3Node;
    out.assign(this.o.fogFn ? this.o.fogFn(out) : steppedFog(out, this.o.fog, this.o.lookup, this.o.fogDistNode));
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
  /** Bäume v4: Nebel je Instanz statt je Fragment. */
  fogFn?: FogFn | null;
  /**
   * Bäume v4: heller Grund des Spitzenschleiers (Innenseite der unteren Schale, Bild 02): `mask` 1 auf diesen
   * Vertices, `color` die blasse Fläche, vor der Skelett und Punkte stehen.
   */
  veil?: { mask: FloatNode; color: Vec3Node } | null;
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
  return select(level.lessThan(0.5), float(26), select(level.lessThan(1.5), float(12), select(level.lessThan(2.5), float(4), float(12))));
}

/** Helligkeit (für die Wahl der hellsten verfügbaren Linienfarbe). */
function luma(c: Vec3Node): FloatNode {
  return c.dot(vec3(0.3, 0.59, 0.11));
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
    // Helle Linienfarbe: Akzent 0 (Stamm hell), sonst das hellste Terrain (Schnee) — nie dunkel auf dunkel
    const accLight = o.lookup.pal(0, acc).rgb as unknown as Vec3Node;
    const light = select(luma(accLight).greaterThan(0.45), accLight, o.lookup.pal(5, o.terrainRowNode).rgb) as unknown as Vec3Node;
    // Kalligrafie (Bild 01): feine, wellige helle Linien entlang des Stamms, im Licht hell, im Schatten grau
    // Feine Kalligrafie (Bild 01): viele schmale, wellige Striche, die abschnittsweise abbrechen (Holzmaserung)
    const calli = flowLines(u.add(variant), v.mul(2.4), linesAround(level), select(isCalli, float(0.2), float(0.14)), select(isCalli, float(0.32), float(0.72)), 3);
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
    // Oberseiten (Normale zum Lot) und die Wetterseite des Stamms (eine Seite rundum, je Baum gedreht) tragen Schnee;
    // der Rand ist ein Tüpfelsaum aus Schneeflocken, die zur Kante hin kleiner werden
    const up = dot(normalize(o.normalPlanet), normalize(o.upPlanet));
    const wobble = wob.sub(0.5).mul(0.6);
    // Schnee liegt in Flecken (Bild 04): große Flecken auf Stamm und Ästen, auf feinen Zweigen kaum etwas
    const patches = smoothstep(0.38, 0.62, valueNoise3(p.mul(vec3(3.2, 1.6, 3.2)), 7));
    const perLevel = select(level.lessThan(0.5), float(1), select(level.lessThan(1.5), patches, select(level.lessThan(2.5), float(0.15), float(1))));
    const topSide = smoothstep(0.05, 0.6, up.add(wobble)).mul(perLevel);
    const windward = sin(u.add(variant.mul(0.37)).mul(6.2831853)).add(wobble.mul(1.4));
    const isStem = level.lessThan(0.5).or(level.greaterThan(2.5));
    const weather = smoothstep(0.35, 0.8, windward).mul(select(isStem, float(0.95), float(0))).mul(smoothstep(0.3, 1.2, v));
    const side = max(topSide, weather).mul(step(0.01, o.snowNode));
    const thr = float(1.08).sub(o.snowNode.mul(0.5));
    const solid = smoothstep(thr, thr.add(0.05), side);
    const specks = stipple(p, 0.03, 0.66, smoothstep(thr.sub(0.4), thr, side), 0.95);
    const snowMask = max(solid, specks.mask);
    const snowCol = mix(o.lookup.pal(3, o.terrainRowNode).rgb, o.lookup.pal(5, o.terrainRowNode).rgb, lit) as unknown as Vec3Node;
    col = mix(col, snowCol, snowMask);
    if (o.veil) col = mix(col, o.veil.color, o.veil.mask);
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
    out.assign(this.o.fogFn ? this.o.fogFn(out) : steppedFog(out, this.o.fog, this.o.lookup, this.o.fogDistNode));
  }
}
