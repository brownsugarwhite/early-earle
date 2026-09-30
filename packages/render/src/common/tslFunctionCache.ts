import { FunctionNode, NodeBuilder } from 'three/webgpu';

/**
 * three.js r186 builds the shader code of a TSL layout function (`Fn(...).setLayout(...)`) once per *backend*
 * and hands that code to every later pipeline. Buffers read inside the function body are declared only by the
 * builder that built it first. A later pipeline of the same material (another render context, the shadow pass,
 * a pre-compile) then calls into code whose bindings it never declared: WGSL fails with "unresolved value
 * 'NodeBuffer_…'", the pipeline is invalid and the whole render pass is dropped. On WebGPU the plateau and the
 * jiggle bodies vanished that way (the jiggle vertex stage traces the SDF, whose impact ripple reads the style
 * block that the later pipeline's vertex stage never declared). WebGL2 happened to be unaffected.
 *
 * The fix caches per builder instead (one builder = one pipeline): each pipeline builds its own function code
 * once — string building, no GPU work — and declares every binding the bodies read. Idempotent; installed on
 * import of `@ee/render` and again before the renderer is created.
 */
interface FunctionBuilder {
  currentFunctionNode: unknown;
  buildFunctionCode(shaderNode: object): string;
  buildFunctionNode(shaderNode: object): unknown;
}

const PATCHED = Symbol.for('ee.render.tslFunctionCachePerBuilder');

export function installTslFunctionCacheFix(): void {
  const proto = NodeBuilder.prototype as unknown as FunctionBuilder & { [PATCHED]?: boolean };
  if (proto[PATCHED]) return;
  if (typeof proto.buildFunctionNode !== 'function' || typeof proto.buildFunctionCode !== 'function') return;
  proto[PATCHED] = true;
  const caches = new WeakMap<object, Map<object, unknown>>();
  proto.buildFunctionNode = function (this: FunctionBuilder, shaderNode: object): unknown {
    let cache = caches.get(this);
    if (!cache) {
      cache = new Map();
      caches.set(this, cache);
    }
    let fn = cache.get(shaderNode);
    if (fn === undefined) {
      const node = new FunctionNode() as unknown as { code: string };
      const previous = this.currentFunctionNode;
      this.currentFunctionNode = node;
      node.code = this.buildFunctionCode(shaderNode);
      this.currentFunctionNode = previous;
      cache.set(shaderNode, node);
      fn = node;
    }
    return fn;
  };
}

installTslFunctionCacheFix();
