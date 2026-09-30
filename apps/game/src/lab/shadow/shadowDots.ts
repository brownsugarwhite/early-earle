import { Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial, Vector3 } from 'three/webgpu';
import type { Node } from 'three/webgpu';
import { attribute, cameraProjectionMatrix, cameraViewMatrix, color, float, mix, modelWorldMatrix, positionGeometry, smoothstep, uniform, vec3, vec4 } from 'three/tsl';
import type { MapWorld } from '../../flow/MapWorld';

type Vec3Node = Node<'vec3'>;
type FloatNode = Node<'float'>;

/**
 * Test- und Vorführpunkte für `SunRig.shadowFactor()` (Schatten-Lab): sechseckige Punkte schweben in einem Raster um den
 * Fokusknoten knapp über dem Gelände und skalieren im **Vertex-Shader** mit dem glatten Schattenwert an ihrem Mittelpunkt
 * — genau so, wie die Kronenpunkte es tun sollen („im Schatten aus 0 skalieren“). Linke Hälfte des Rasters mit weicher
 * Scheibe (`softness`), rechte Hälfte mit dem kubischen B-Spline-Feld: beim Drehen wachsen und schrumpfen die Punkte
 * stetig, ohne zu springen.
 */
export function createShadowTestDots(world: MapWorld, nodeIndex: number, options: { spacing?: number; rings?: number; size?: number; lift?: number; softness?: number } = {}) {
  const spacing = options.spacing ?? 0.32;
  const rings = options.rings ?? 14;
  const lift = options.lift ?? 0.04;
  const node = world.layout.nodes[Math.min(nodeIndex, world.layout.nodes.length - 1)] ?? world.layout.nodes[0]!;
  const n = new Vector3(node.position[0], node.position[1], node.position[2]).normalize();
  const e1 = new Vector3(0, 1, 0).cross(n);
  if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0);
  e1.normalize();
  const e2 = new Vector3().crossVectors(n, e1).normalize();
  const bases: number[] = [];
  const sides: number[] = [];
  const p = new Vector3();
  const dir = new Vector3();
  for (let j = -rings; j <= rings; j++) {
    for (let i = -rings; i <= rings; i++) {
      p.copy(n).multiplyScalar(world.world.options.radius).addScaledVector(e1, i * spacing).addScaledVector(e2, j * spacing);
      dir.copy(p).normalize();
      const r = world.surfaceRadius(dir) + lift;
      p.copy(dir).multiplyScalar(r);
      bases.push(p.x, p.y, p.z);
      sides.push(i < 0 ? 1 : 0);
    }
  }
  const geometry = new InstancedBufferGeometry();
  const hex: number[] = [];
  const index: number[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    hex.push(Math.cos(a), Math.sin(a), 0);
  }
  index.push(0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5);
  geometry.setAttribute('position', new Float32BufferAttribute(hex, 3));
  geometry.setIndex(index);
  geometry.setAttribute('dotBase', new InstancedBufferAttribute(new Float32Array(bases), 3));
  geometry.setAttribute('dotSoft', new InstancedBufferAttribute(new Float32Array(sides), 1));
  geometry.instanceCount = bases.length / 3;

  const size = uniform(options.size ?? 0.07);
  const softness = options.softness ?? 0.12;
  const base = attribute('dotBase', 'vec3') as unknown as Vec3Node;
  const soft = attribute('dotSoft', 'float') as unknown as FloatNode;
  const bent = world.world.bendNode(base as never) as unknown as Vec3Node;
  const centerWorld = (modelWorldMatrix as unknown as { mul(v: unknown): Node<'vec4'> }).mul(vec4(bent, 1)).xyz as unknown as Vec3Node;
  // Die API: glatter Schattenwert an der Weltposition, im Vertex-Shader
  const sunSoft = world.sun.shadowFactor(centerWorld, { softness });
  const sunEdge = world.sun.shadowFactor(centerWorld, { taps: 4 });
  const sun = mix(sunEdge, sunSoft, soft) as unknown as FloatNode;
  const scale = smoothstep(0.08, 0.92, sun);
  const viewC = (cameraViewMatrix as unknown as { mul(v: unknown): Node<'vec4'> }).mul(vec4(centerWorld, 1));
  const offset = vec3(positionGeometry.x, positionGeometry.y, 0).mul(size.mul(scale));
  const material = new MeshBasicNodeMaterial();
  material.name = 'ShadowTestDots';
  material.vertexNode = (cameraProjectionMatrix as unknown as { mul(v: unknown): Node<'vec4'> }).mul(vec4(viewC.xyz.add(offset), 1)) as never;
  material.colorNode = mix(color('#f7f6d8'), color('#ffd23f'), soft.mul(float(0.65))) as never;
  const mesh = new Mesh(geometry, material);
  mesh.name = 'shadow-test-dots';
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  world.planet.add(mesh);
  return {
    mesh,
    size,
    dispose(): void {
      world.planet.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
