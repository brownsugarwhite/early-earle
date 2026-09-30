import { WebGPURenderer } from 'three/webgpu';
import { installTslFunctionCacheFix } from '@ee/render';
import { setWebglShadowCompareOverride } from '@ee/render/shadow/index.ts';

let renderer: WebGPURenderer | null = null;
let initPromise: Promise<WebGPURenderer> | null = null;

function wantsWebGL(): boolean {
  return new URLSearchParams(location.search).get('backend') === 'webgl';
}

/**
 * Ein Renderer für die ganze App, der seinen Canvas selbst besitzt. Routen (und Reacts StrictMode-Doppelmount)
 * hängen nur `renderer.domElement` ein und aus — der Renderer und der GPU-Kontext bleiben bestehen.
 */
export function getRenderer(): Promise<WebGPURenderer> {
  if (renderer) return Promise.resolve(renderer);
  if (initPromise) return initPromise;
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  // Per-pipeline TSL function code: without it later pipelines lose buffer declarations (see @ee/render).
  installTslFunctionCacheFix();
  // Diagnosis: `?shadowcompat=manual` forces the WebKit shadow path (manual depth compare, as on iOS WebGL2) so it
  // can be checked in Chrome with `?backend=webgl`; `=hardware` forces compare samplers.
  const compat = new URLSearchParams(location.search).get('shadowcompat');
  if (compat === 'manual') setWebglShadowCompareOverride(false);
  else if (compat === 'hardware') setWebglShadowCompareOverride(true);
  const r = new WebGPURenderer({ canvas, antialias: true, forceWebGL: wantsWebGL() });
  initPromise = r.init().then(() => {
    renderer = r;
    return r;
  });
  return initPromise;
}

export function detectBackend(r: WebGPURenderer): 'webgpu' | 'webgl2' {
  const b = r.backend as { isWebGPUBackend?: boolean };
  return b.isWebGPUBackend ? 'webgpu' : 'webgl2';
}
