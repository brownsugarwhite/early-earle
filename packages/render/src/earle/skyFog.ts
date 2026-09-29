import { BackSide, Group, Mesh, MeshBasicNodeMaterial, PlaneGeometry, SphereGeometry, Vector3 } from 'three/webgpu';
import type { BufferGeometry, UniformNode } from 'three/webgpu';
import { cameraPosition, clamp, float, mix, positionWorld, sin, smoothstep, time, uniform, uv } from 'three/tsl';
import { aaStep, type FloatNode, type PaletteLookup } from './tsl';

export interface SkyDomeOptions {
  lookup: PaletteLookup;
  skyRow: number;
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
}

/**
 * Himmelskuppel mit gestufter Rampe (exakte Palettenfarben, 1-px-Kanten) und flacher Sonnenscheibe plus einem
 * flachen Ring. Richtung aus der Weltposition relativ zur Kamera → Horizont bleibt waagrecht, egal wie die
 * Kamera geneigt ist.
 */
export function createSkyDome(options: SkyDomeOptions): Mesh {
  const { lookup } = options;
  const geometry = new SphereGeometry(options.radius ?? 320, 32, 16);
  const material = new MeshBasicNodeMaterial({ side: BackSide, depthWrite: false, fog: false });
  const dir = positionWorld.sub(cameraPosition).normalize();
  const horizon = options.horizonY ?? 0;
  const t = clamp(dir.y.sub(horizon).div(options.spread ?? 0.6).add(0.03), 0, 0.999);
  const x = t.mul(options.steps - 1);
  const skyA = lookup.bands(x, options.skyRow, 0).rgb;
  const sky = options.skyRowB && options.skyMix ? mix(skyA, lookup.bands(x, options.skyRowB, 0).rgb, options.skyMix) : skyA;
  const d = dir.dot(options.sunDirWorld);
  const disc = aaStep(Math.cos((2.4 * Math.PI) / 180), d);
  const ring = aaStep(Math.cos((5.2 * Math.PI) / 180), d);
  const rowForSun = options.skyRowB && options.skyMix ? mix(float(options.skyRow), options.skyRowB, options.skyMix.greaterThan(0.5).select(float(1), float(0))) : float(options.skyRow);
  const withRing = mix(sky, lookup.pal(options.ringIndex, rowForSun).rgb, ring);
  material.colorNode = mix(withRing, lookup.pal(options.sunIndex, rowForSun).rgb, disc);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'sky';
  mesh.renderOrder = -10;
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
}

/**
 * 3–5 waagrechte Nebelstreifen (Earles weiße Schlieren): dünne, kameraseitige Ebenen zwischen den Hügeln,
 * harte Oberkante, weich auslaufende Unterkante, langsam ziehende Dichte über einen Zeit-Uniform.
 */
export class FogStripes {
  readonly group = new Group();
  readonly speed = uniform(1);
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: MeshBasicNodeMaterial[] = [];

  constructor(options: FogStripeOptions) {
    const { lookup } = options;
    const first = options.firstDistance ?? 5;
    const spacing = options.spacing ?? 4.5;
    const baseHeight = options.baseHeight ?? 1.0;
    const heightStep = options.heightStep ?? 0.25;
    const curvature = options.curvatureRadius ?? 40;
    const width = options.width ?? 70;
    const thickness = options.thickness ?? 0.7;
    const maxAlpha = options.maxAlpha ?? 0.85;
    this.group.name = 'FogStripes';
    for (let i = 0; i < options.count; i++) {
      const h = thickness * (1 + 0.25 * i);
      const geometry = new PlaneGeometry(width, h);
      this.geometries.push(geometry);
      const material = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false });
      const u = uv().x;
      const v = uv().y;
      const top = smoothstep(0.985, 0.9, v);
      const bottom = smoothstep(0.0, 0.6, v);
      const phase = i * 1.7;
      const drift = time.mul(this.speed);
      const wave = sin(u.mul(Math.PI * 2 * 2.3).add(drift.mul(0.045)).add(phase)).mul(0.5).add(0.5);
      const wave2 = sin(u.mul(Math.PI * 2 * 5.1).sub(drift.mul(0.03)).add(phase * 2)).mul(0.5).add(0.5);
      const wave3 = sin(u.mul(Math.PI * 2 * 11.7).add(drift.mul(0.02)).add(phase * 3)).mul(0.5).add(0.5);
      const density = smoothstep(0.32, 0.8, wave.mul(0.55).add(wave2.mul(0.3)).add(wave3.mul(0.15)));
      material.colorNode = lookup.pal(options.colorIndex, options.fogRow).rgb;
      material.opacityNode = top.mul(bottom).mul(density).mul(float(maxAlpha * (1 - 0.08 * i)));
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

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.group.removeFromParent();
  }
}
