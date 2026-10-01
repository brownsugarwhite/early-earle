import { BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicNodeMaterial } from 'three/webgpu';
import type { Vector3 } from 'three/webgpu';
import { attribute, float, mix, positionGeometry, positionView, sqrt, vec3 } from 'three/tsl';
import { steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type Vec3Node } from '../tsl';
import { displayCard, flatCard, type CardDisplay } from '../trees/billboard';

/**
 * Weiße Pferde (Ebene 45, Welt 13): winzige grasende Silhouetten am Fuß des Monolithen, Maßstabsfiguren mit Schatten.
 * Karte wie die Tiere der Vegetation (im Anzeigeraum zur Kamera gedreht und in die Bildebene gekippt, im Schattenpass
 * flach zur Sonne; trees/billboard.ts), aber hell: der helle Stammton der Welt (Akzent 0), zur Bauchseite ein Hauch
 * dunkler (Verlauf in der Form). Ein Mesh mit wenigen Instanzen; unsichtbar ohne Pferde.
 */
export interface HorseHerdOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  warp: (p: Vec3Node) => Vec3Node;
  /** Die Abbildung hinter `warp` (Karte im Anzeigeraum); fehlt → flach. */
  display?: CardDisplay | null;
  /** Richtung zur Sonne im Objektraum des Meshes (Schattenkarte). Die Karte selbst nimmt die Kamera des Bilds. */
  sunDir: { value: Vector3 } & Vec3Node;
  /** Zusatz-Nebeldistanz (Schleier) je Welt-Slot. */
  veil?: (slot: FloatNode) => FloatNode;
  capacity?: number;
}

export interface HorsePlacement {
  /** Fuß (Ebene: x, Höhe, z) und Größe (Länge, Welteinheiten). */
  x: number;
  y: number;
  z: number;
  size: number;
  /** 1 = Kopf nach rechts im Bild, −1 = gespiegelt. */
  flip: number;
  /** Palettenzeile (Akzent der Welt) und Welt-Slot. */
  row: number;
  slot: number;
}

/** Grasendes Pferd (Kopf unten), Einheit = Rumpflänge, Fuß y = 0, Blick nach +x. */
export function createHorseGeometry(): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const quad = (a: [number, number], b: [number, number], c: [number, number], d: [number, number]) => {
    const i = pos.length / 3;
    pos.push(a[0], a[1], 0, b[0], b[1], 0, c[0], c[1], 0, d[0], d[1], 0);
    idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  };
  // Rumpf (leicht gewölbter Rücken), Hals schräg nach unten vorn, Kopf am Boden
  quad([-0.46, 0.46], [0.36, 0.44], [0.4, 0.74], [-0.42, 0.78]);
  quad([0.28, 0.5], [0.44, 0.4], [0.64, 0.2], [0.5, 0.66]);
  quad([0.56, 0.08], [0.74, 0.02], [0.8, 0.14], [0.6, 0.3]);
  // Beine (vorn leicht gespreizt, hinten ein Bein angewinkelt)
  quad([-0.4, 0.0], [-0.33, 0.0], [-0.3, 0.5], [-0.42, 0.5]);
  quad([-0.26, 0.02], [-0.19, 0.02], [-0.2, 0.5], [-0.3, 0.5]);
  quad([0.18, 0.0], [0.25, 0.0], [0.28, 0.48], [0.18, 0.48]);
  quad([0.3, 0.0], [0.37, 0.0], [0.38, 0.46], [0.29, 0.46]);
  // Schweif
  quad([-0.46, 0.72], [-0.42, 0.66], [-0.56, 0.3], [-0.6, 0.36]);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export class HorseHerd {
  readonly mesh: InstancedMesh;
  private readonly capacity: number;

  constructor(o: HorseHerdOptions) {
    this.capacity = o.capacity ?? 48;
    const n = this.capacity;
    const geometry = createHorseGeometry();
    geometry.setAttribute('horseBase', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
    geometry.setAttribute('horseData', new InstancedBufferAttribute(new Float32Array(n * 4), 4)); // Größe, Spiegelung, Zeile, Slot
    const base = attribute('horseBase', 'vec3');
    const data = attribute('horseData', 'vec4');
    const up = vec3(0, 1, 0) as unknown as Vec3Node;
    const cardX = positionGeometry.x.mul(data.x).mul(data.y) as unknown as FloatNode;
    const cardY = positionGeometry.y.mul(data.x) as unknown as FloatNode;
    const material = new MeshBasicNodeMaterial({ side: DoubleSide });
    const white = o.lookup.pal(0, data.z).rgb as unknown as Vec3Node;
    // Verlauf in der Form: Rücken hell, zu Bauch und Beinen ein Hauch kühler und dunkler (√-Mischung wie Druckfarbe)
    const shade = sqrt(white.max(0)).mul(mix(float(0.86), float(1), positionGeometry.y.div(0.78).clamp(0, 1)));
    const col = shade.mul(shade) as unknown as Vec3Node;
    const fogDist = o.veil ? positionView.length().add(o.veil(data.w)) : positionView.length();
    material.colorNode = steppedFog(col, o.fog, o.lookup, fogDist as unknown as FloatNode);
    material.positionNode = displayCard({ base: base as unknown as Vec3Node, up, lean: 1, display: o.display ?? null }).at(cardX, cardY);
    (material as unknown as { castShadowPositionNode: unknown }).castShadowPositionNode = o.warp(flatCard(base as unknown as Vec3Node, up, o.sunDir as unknown as Vec3Node, cardX, cardY));
    const mesh = new InstancedMesh(geometry, material, n);
    mesh.name = 'planet-horses';
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.visible = false;
    // kleine Werfer: nur in den feinen Kaskaden
    mesh.userData.shadowCascades = 2;
    this.mesh = mesh;
  }

  /** Pferde setzen (Positionen relativ zum Anker des Meshes). */
  set(horses: readonly HorsePlacement[], anchor: { x: number; z: number }): void {
    const list = horses.slice(0, this.capacity);
    const g = this.mesh.geometry;
    const b = g.getAttribute('horseBase') as InstancedBufferAttribute;
    const d = g.getAttribute('horseData') as InstancedBufferAttribute;
    const m = new Matrix4();
    list.forEach((h, i) => {
      b.setXYZ(i, h.x - anchor.x, h.y, h.z - anchor.z);
      d.setXYZW(i, h.size, h.flip, h.row, h.slot);
      this.mesh.setMatrixAt(i, m);
    });
    b.needsUpdate = true;
    d.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.count = list.length;
    this.mesh.visible = list.length > 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicNodeMaterial).dispose();
  }
}
