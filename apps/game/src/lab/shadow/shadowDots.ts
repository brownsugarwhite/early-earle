import { Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial } from 'three/webgpu';
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
  // Raster in der Ebene um den Knoten (Mesh am Knoten verankert: kleine Zahlen, Anzeige-Abbildung im Vertex-Shader)
  const node = world.layout.node(nodeIndex);
  const nx = node.position[0];
  const nz = node.position[2];
  const bases: number[] = [];
  const sides: number[] = [];
  for (let j = -rings; j <= rings; j++) {
    for (let i = -rings; i <= rings; i++) {
      const x = i * spacing;
      const z = j * spacing;
      bases.push(x, world.heightAt(nx + x, nz + z) + lift, z);
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
  const bent = world.world.mapping.warp(base as never) as unknown as Vec3Node;
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
  world.world.plane.add(mesh);
  world.world.anchorObject(mesh, nx, nz);
  return {
    mesh,
    size,
    dispose(): void {
      world.world.releaseObject(mesh);
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
