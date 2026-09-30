import type { NodeBuilder } from 'three/webgpu';

/**
 * WebGL2-Fähigkeitstest für Schatten-Vergleichs-Sampler.
 *
 * Befund (iOS-Simulator, WebKit-WebGL2 über ANGLE-Metal, „Apple GPU“): Die Tiefenkarten werden korrekt gerendert, aber
 * jeder `sampler2DShadow`-Lookup (COMPARE_REF_TO_TEXTURE, LEQUAL, LINEAR oder NEAREST) liefert 0 → jeder Empfänger
 * gilt als beschattet, der Boden wird komplett Tinte — auch mit three's Standard-PCF. Normale `sampler2D`-Lesezugriffe
 * auf dieselbe Tiefentextur liefern die richtigen Werte.
 *
 * Der Test läuft einmal in einem eigenen, wegwerfbaren WebGL2-Kontext (three's Zustands-Cache bleibt unberührt):
 * 2×2-Tiefentextur auf 1,0 löschen, mit Referenz 0,5 vergleichen — erwartet 1. Schlägt er fehl, tasten die Filter die
 * Tiefe als gewöhnliche Textur (NEAREST) ab und vergleichen im Shader.
 */

let cached: boolean | null = null;

/**
 * Tiefe manuell vergleichen? `true`/`false` erzwingt, ein Rückruf entscheidet beim Bauen, `undefined` = automatisch
 * (`needsManualDepthCompare`).
 */
export type ManualCompareOption = boolean | ((builder: NodeBuilder) => boolean);

/** Automatik: nur im WebGL-Backend und nur, wenn der Vergleichs-Sampler-Test fehlschlägt. */
export function needsManualDepthCompare(builder: NodeBuilder): boolean {
  const backend = (builder.renderer as unknown as { backend?: { isWebGLBackend?: boolean } }).backend;
  if (backend?.isWebGLBackend !== true) return false;
  return !webglShadowCompareWorks();
}

export function resolveManualCompare(option: ManualCompareOption | undefined, builder: NodeBuilder): boolean {
  if (typeof option === 'function') return option(builder);
  if (typeof option === 'boolean') return option;
  return needsManualDepthCompare(builder);
}

/** true, wenn Vergleichs-Sampler auf dieser Plattform korrekt arbeiten (oder kein Test möglich ist). */
export function webglShadowCompareWorks(): boolean {
  if (cached !== null) return cached;
  cached = runTest();
  return cached;
}

/** Nur für Tests/Diagnose: Ergebnis vorgeben oder zurücksetzen. */
export function setWebglShadowCompareOverride(value: boolean | null): void {
  cached = value;
}

function runTest(): boolean {
  if (typeof document === 'undefined') return true;
  let gl: WebGL2RenderingContext | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    gl = canvas.getContext('webgl2', { antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
    if (!gl) return true;
    const N = 2;
    // Tiefentextur 2×2, per FBO-Clear auf 1,0
    const depth = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depth);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, N, N, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const depthFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
    gl.clearDepth(1);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    // Ziel: RGBA8, Ergebnis des Vergleichs
    const target = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    const vs = `#version 300 es
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
    const fs = `#version 300 es
precision highp float; precision highp sampler2DShadow;
uniform sampler2DShadow d; out vec4 o;
void main() { float c = texture(d, vec3(gl_FragCoord.xy / 2.0, 0.5)); o = vec4(c, c, c, 1.0); }`;
    const prog = gl.createProgram();
    for (const [type, src] of [
      [gl.VERTEX_SHADER, vs],
      [gl.FRAGMENT_SHADER, fs],
    ] as const) {
      const sh = gl.createShader(type);
      if (!sh || !prog) return true;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      gl.attachShader(prog, sh);
    }
    if (!prog) return true;
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return true;
    gl.viewport(0, 0, N, N);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, depth);
    gl.uniform1i(gl.getUniformLocation(prog, 'd'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(N * N * 4);
    gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, px);
    if (gl.getError() !== gl.NO_ERROR) return true;
    // Erwartet: 1 (0,5 ≤ 1,0). Ein kaputter Vergleichs-Sampler liefert 0.
    let sum = 0;
    for (let i = 0; i < N * N; i++) sum += px[i * 4]!;
    return sum / (N * N) > 127;
  } catch {
    return true;
  } finally {
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
