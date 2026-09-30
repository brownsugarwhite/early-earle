import { TextureNode } from 'three/webgpu';
import type { DepthTexture, NodeBuilder } from 'three/webgpu';
import { nodeObject } from 'three/tsl';
import type { FloatNode, Vec2Node } from '../earle/tsl';

/**
 * Tiefenvergleich auf Mip-Level 0, in **jeder** Shader-Stufe.
 *
 * three r186 erzeugt `texture(depth, uv).compare(z)` nur im Fragment-Shader (`textureSampleCompare` in WGSL,
 * `texture(sampler2DShadow, …)` in GLSL) und meldet im Vertex-Shader einen Fehler. Außerdem verlangt WGSL für
 * `textureSampleCompare` gleichförmigen Kontrollfluss (implizite Ableitungen) — die Kaskaden-Auswahl liegt aber in
 * `if`-Blöcken. Dieser Knoten gibt stattdessen `textureSampleCompareLevel` (WGSL, alle Stufen, keine Ableitungen)
 * bzw. `texture(sampler2DShadow, vec3(uv, z))` (GLSL ES 3.0, alle Stufen; im Vertex-Shader Basislevel) aus. Schattenkarten haben nur
 * Level 0, das Ergebnis ist identisch (mit LINEAR-Filter: 2×2-Hardware-PCF).
 *
 * Damit können Konsumenten (z. B. die Kronenpunkte) den Schatten je Instanz im Vertex-Shader lesen.
 */
type SnippetArgs = [
  builder: NodeBuilder,
  textureProperty: string,
  uvSnippet: string,
  levelSnippet: string | null,
  biasSnippet: string | null,
  depthSnippet: string | null,
  compareSnippet: string | null,
  gradSnippet: string[] | null,
  gatherSnippet: string | null,
  offsetSnippet: string | null,
  flipYSnippet: string | null,
];

type TextureNodeCtor = new (value: DepthTexture, uvNode?: unknown, levelNode?: unknown, biasNode?: unknown) => {
  generateSnippet(...args: SnippetArgs): string;
};

const Base = TextureNode as unknown as TextureNodeCtor;

class CompareLevelTextureNode extends Base {
  static get type(): string {
    return 'CompareLevelTextureNode';
  }

  override generateSnippet(...args: SnippetArgs): string {
    const [builder, textureProperty, uvSnippet, , biasSnippet, depthSnippet, compareSnippet, gradSnippet, gatherSnippet, offsetSnippet] = args;
    if (compareSnippet && !depthSnippet && !gradSnippet && !gatherSnippet && !biasSnippet && !offsetSnippet) {
      const backend = (builder.renderer as unknown as { backend?: { isWebGLBackend?: boolean } }).backend;
      // GLSL ES 3.0: `texture(sampler2DShadow, …)` ist in jeder Stufe erlaubt (Vertex: Basislevel) und in ANGLE/SwiftShader
      // deutlich schneller als `textureLod` auf Vergleichs-Samplern
      if (backend?.isWebGLBackend === true) return `texture( ${textureProperty}, vec3( ${uvSnippet}, ${compareSnippet} ) )`;
      return `textureSampleCompareLevel( ${textureProperty}, ${textureProperty}_sampler, ${uvSnippet}, ${compareSnippet} )`;
    }
    return super.generateSnippet(...args);
  }
}

/**
 * Hardware-Tiefenvergleich (1 = beleuchtet) an `uv` gegen die Referenztiefe `z`, Level 0, jede Shader-Stufe.
 * Die Tiefentextur muss eine `compareFunction` haben (Schattenkarten: `LessEqualCompare`).
 */
export function depthCompareLevel(depthTexture: DepthTexture, uv: Vec2Node, z: FloatNode): FloatNode {
  const node = nodeObject(new CompareLevelTextureNode(depthTexture, uv) as never) as unknown as { compare(z: unknown): FloatNode };
  return node.compare(z);
}
