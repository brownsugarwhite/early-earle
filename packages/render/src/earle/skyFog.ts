import { BackSide, Group, Mesh, MeshBasicNodeMaterial, PlaneGeometry, SphereGeometry, Vector3 } from 'three/webgpu';
import type { BufferGeometry, UniformNode } from 'three/webgpu';
import { cameraPosition, clamp, float, mix, positionWorld, sin, smoothstep, time, uniform, uv } from 'three/tsl';
import { aaStep, type FloatNode, type PaletteLookup, type Vec3Node } from './tsl';
import { dither, earleGradients, fountain, glow, mixInk } from './gradients';

export interface SkyDomeOptions {
  lookup: PaletteLookup;
  /** Himmelszeile (Zahl oder Uniform, z. B. aktuelle Welt; Seite A der Überblendung). */
  skyRow: number | FloatNode;
  /** Anzahl Himmelsstufen (Horizont → Zenit). */
  steps: number;
  sunIndex: number;
  ringIndex: number;
  sunDirWorld: UniformNode<'vec3', Vector3>;
  /** Zweite Himmelszeile und Mischung (Zonenübergang). */
  skyRowB?: UniformNode<'float', number>;
  skyMix?: UniformNode<'float', number>;
  /** y-Komponente (sin) der Blickrichtung zum Planetenhorizont; Standard 0 (flache Welt). */
  horizonY?: UniformNode<'float', number> | number;
  /** Elevationsspanne (als y-Differenz) über die die Rampe läuft. Standard 0.6. */
  spread?: number;
  radius?: number;
  /**
   * Leuchtender Horizont 0..1 (Uniform der Blick-Welt, z. B. `EarlePlanet.skyGlow`): ein heller Airbrush-Schein rundum
   * am Horizont in der Ringfarbe, zur Sonnenfarbe hin (Ebene 16: Licht hinter den Baumreihen). Fehlt → aus.
   */
  glow?: UniformNode<'float', number>;
}

/**
 * Himmelskuppel als Irisdruck (Ebene 19, 27, 29, 46): weicher Verlauf vom hellen Horizont in den tiefen Zenit durch die
 * Himmelsstufen der Palette (`earleGradients.air` 0 = die alten harten Stufen), ein breiter Airbrush-Schein am Horizont
 * zur Sonne hin (Ebene 22, 36, 07: das Licht hat eine Richtung) und eine flache Sonnenscheibe mit flachem Ring — die
 * einzigen harten Kanten am Himmel. Richtung aus der Weltposition relativ zur Kamera → der Horizont bleibt waagrecht,
 * egal wie die Kamera geneigt ist. Ein Hauch Rauschen (±½ LSB) verhindert 8-Bit-Treppen im großen Verlauf.
 */
export function createSkyDome(options: SkyDomeOptions): Mesh {
  const { lookup } = options;
  const geometry = new SphereGeometry(options.radius ?? 320, 32, 16);
  const material = new MeshBasicNodeMaterial({ side: BackSide, depthWrite: false, fog: false });
  const dir = positionWorld.sub(cameraPosition).normalize();
  const horizon = options.horizonY ?? 0;
  const t = clamp(dir.y.sub(horizon).div(options.spread ?? 0.6).add(0.03), 0, 0.999);
  const x = t.mul(options.steps - 1);
  const air = earleGradients.air;
  const skyA = fountain(lookup, x, options.skyRow, 0, air).rgb as unknown as Vec3Node;
  const sky = options.skyRowB && options.skyMix ? (mix(skyA, fountain(lookup, x, options.skyRowB, 0, air).rgb, options.skyMix) as unknown as Vec3Node) : skyA;
  const d = dir.dot(options.sunDirWorld);
  const disc = aaStep(Math.cos((2.4 * Math.PI) / 180), d);
  const ring = aaStep(Math.cos((5.2 * Math.PI) / 180), d);
  const rowA = typeof options.skyRow === 'number' ? float(options.skyRow) : options.skyRow;
  const rowForSun = options.skyRowB && options.skyMix ? mix(rowA, options.skyRowB, options.skyMix.greaterThan(0.5).select(float(1), float(0))) : rowA;
  const ringColor = lookup.pal(options.ringIndex, rowForSun).rgb as unknown as Vec3Node;
  // Schein zur Sonne: breit (bis ≈ 80° neben der Sonne), am Horizont am stärksten, zum Zenit ausklingend
  const sunGlow = glow(d, 0.97, Math.cos((80 * Math.PI) / 180))
    .mul(float(1).sub(t).pow(1.5))
    .mul(air.mul(0.55));
  let lit = mixInk(sky, ringColor, sunGlow);
  if (options.glow) {
    // Rundum am Horizont: schmaler, sehr heller Schein (Ringfarbe zur Sonne hin), nach oben quadratisch ausklingend
    const sunColor = lookup.pal(options.sunIndex, rowForSun).rgb as unknown as Vec3Node;
    const band = float(1).sub(smoothstep(0.0, 0.3, t));
    lit = mixInk(lit, mixInk(ringColor, sunColor, 0.45), band.mul(band).mul(options.glow).mul(air));
  }
  const withRing = mix(dither(lit), ringColor, ring);
  material.colorNode = mix(withRing, lookup.pal(options.sunIndex, rowForSun).rgb, disc);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'sky';
  // Nach allen deckenden Objekten (die Kuppel schreibt keine Tiefe, steht aber hinter allem): der Tiefentest verwirft
  // jeden verdeckten Himmelspixel vor dem Shader — nur sichtbarer Himmel kostet (Verlauf, Schein, Rauschen). Die
  // transparenten Nebelstreifen und Schleier folgen ohnehin danach.
  mesh.renderOrder = 100;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export interface FogStripeOptions {
  lookup: PaletteLookup;
  /** Nebelzeile (Zahl oder Uniform, z. B. Zonenzeile). */
  fogRow: number | FloatNode;
  /** Palettenstufe der Streifenfarbe (hellste Nebelstufe). */
  colorIndex: number;
  count: number;
  /** Erste Entfernung vor dem Rig (in -Z) und Abstand der weiteren Streifen. */
  firstDistance?: number;
  spacing?: number;
  /** Höhe der Streifen über der Kugeloberfläche (folgt der Krümmung), Zunahme je Streifen. */
  baseHeight?: number;
  heightStep?: number;
  /** Planetenradius für die Krümmung der Streifenhöhen. */
  curvatureRadius?: number;
  width?: number;
  thickness?: number;
  maxAlpha?: number;
  /** Stärke 0..1 (Uniform der aktuellen Welt: Nebelhügel 1, Juwelenwald 0). */
  strength?: UniformNode<'float', number>;
}

/**
 * 3–5 waagrechte Nebelstreifen (Earles weiße Nebelbänke): dünne, kameraseitige Ebenen zwischen den Hügeln, am Fuß
 * dicht und hell, nach oben als Verlauf ausdünnend (`earleGradients.air` 0 = alte harte Oberkante), langsam ziehende
 * Dichte über einen Zeit-Uniform.
 */
export class FogStripes {
  readonly group = new Group();
  readonly speed = uniform(1);
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: MeshBasicNodeMaterial[] = [];
  private readonly layoutSpec: { first: number; spacing: number; baseHeight: number; heightStep: number; radius: number };

  constructor(options: FogStripeOptions) {
    const { lookup } = options;
    const first = options.firstDistance ?? 5;
    const spacing = options.spacing ?? 4.5;
    const baseHeight = options.baseHeight ?? 1.0;
    const heightStep = options.heightStep ?? 0.25;
    const curvature = options.curvatureRadius ?? 40;
    const width = options.width ?? 70;
    const thickness = options.thickness ?? 1.5;
    const maxAlpha = options.maxAlpha ?? 0.85;
    this.group.name = 'FogStripes';
    this.layoutSpec = { first, spacing, baseHeight, heightStep, radius: curvature };
    for (let i = 0; i < options.count; i++) {
      const h = thickness * (1 + 0.25 * i);
      const geometry = new PlaneGeometry(width, h);
      this.geometries.push(geometry);
      const material = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false });
      const u = uv().x;
      const v = uv().y;
      // Phase und Deckkraft je Streifen als Uniform: alle Streifen teilen denselben Shader-Code (ein Programm)
      const phase = uniform(i * 1.7);
      const stripeAlpha = uniform(maxAlpha * (1 - 0.08 * i));
      const drift = time.mul(this.speed);
      const crest = sin(u.mul(Math.PI * 2 * 3.1).add(drift.mul(0.03)).add(phase)).mul(0.07).add(sin(u.mul(Math.PI * 2 * 7.3).sub(drift.mul(0.02))).mul(0.035));
      const wave = sin(u.mul(Math.PI * 2 * 2.3).add(drift.mul(0.045)).add(phase)).mul(0.5).add(0.5);
      const wave2 = sin(u.mul(Math.PI * 2 * 5.1).sub(drift.mul(0.03)).add(phase.mul(2))).mul(0.5).add(0.5);
      const wave3 = sin(u.mul(Math.PI * 2 * 11.7).add(drift.mul(0.02)).add(phase.mul(3))).mul(0.5).add(0.5);
      // Lange, fast durchgehende Bänder mit wenigen Lücken (Ebene_20), keine spitzen Schlieren
      const density = smoothstep(0.14, 0.42, wave.mul(0.55).add(wave2.mul(0.3)).add(wave3.mul(0.15)));
      // Alt (Verläufe aus): harte, gewellte Oberkante, Unterkante in zwei Stufen
      const oldTop = smoothstep(float(0.93).add(crest), float(0.84).add(crest), v);
      const oldBottom = mix(float(0.45), float(1), smoothstep(0.2, 0.5, v)).mul(smoothstep(0.0, 0.2, v));
      // Earle (Ebene_20, Bild 03): die Nebelbank liegt im Tal — am Fuß dicht und hell mit weich gewellter Unterkante,
      // das untere Drittel satt, nach oben dünnt sie als langer Verlauf aus (die Hügel tauchen oben aus ihr auf)
      const foot = smoothstep(float(0.0).add(crest.mul(0.5)), float(0.16).add(crest.mul(0.5)), v);
      const body = float(1).sub(smoothstep(0.3, 0.97, v));
      const air = earleGradients.air;
      const profile = mix(oldTop.mul(oldBottom), foot.mul(body.pow(1.25)), air);
      // Farbe: am Fuß die hellste Nebelstufe, nach oben eine Spur tiefer (Stufe darunter)
      const bright = lookup.pal(options.colorIndex, options.fogRow).rgb as unknown as Vec3Node;
      const deeper = lookup.pal(Math.max(0, options.colorIndex - 1), options.fogRow).rgb as unknown as Vec3Node;
      material.colorNode = mixInk(bright, deeper, smoothstep(0.35, 1.0, v).mul(air).mul(0.5));
      const alpha = profile.mul(density).mul(stripeAlpha);
      material.opacityNode = options.strength ? alpha.mul(options.strength) : alpha;
      this.materials.push(material);
      const mesh = new Mesh(geometry, material);
      mesh.name = `fog-stripe-${i}`;
      const z = first + spacing * i;
      mesh.position.set(0, baseHeight + heightStep * i - (z * z) / (2 * curvature), -z);
      mesh.renderOrder = 10 + i;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.group.add(mesh);
    }
  }

  /**
   * Streifen neu legen: Abstand vor dem Rig skaliert (`distanceScale`, z. B. mit dem Blickpunkt), Höhe folgt der
   * Kugel plus dem Krümmungs-Boost (`curvature`, dieselbe Absenkung wie der Terrain-Warp).
   */
  layout(distanceScale: number, curvature: number): void {
    const { first, spacing, baseHeight, heightStep, radius } = this.layoutSpec;
    this.group.children.forEach((child, i) => {
      const z = (first + spacing * i) * distanceScale;
      const drop = (1 - Math.cos(z / radius)) * radius * (1 + curvature);
      child.position.set(0, baseHeight + heightStep * i - drop, -z);
    });
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.group.removeFromParent();
  }
}
