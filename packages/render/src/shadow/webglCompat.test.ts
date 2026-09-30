import { afterEach, describe, expect, it } from 'vitest';
import type { NodeBuilder } from 'three/webgpu';
import { needsManualDepthCompare, resolveManualCompare, setWebglShadowCompareOverride, webglShadowCompareWorks } from './webglCompat';

const builderFor = (backend: { isWebGLBackend?: boolean; isWebGPUBackend?: boolean }) => ({ renderer: { backend } }) as unknown as NodeBuilder;
const webgl = builderFor({ isWebGLBackend: true });
const webgpu = builderFor({ isWebGPUBackend: true });

describe('webglCompat', () => {
  afterEach(() => setWebglShadowCompareOverride(null));

  it('ohne DOM gilt der Vergleichs-Sampler als intakt (kein Test möglich)', () => {
    expect(webglShadowCompareWorks()).toBe(true);
    expect(needsManualDepthCompare(webgl)).toBe(false);
  });

  it('manueller Vergleich nur im WebGL-Backend und nur bei kaputtem Vergleichs-Sampler', () => {
    setWebglShadowCompareOverride(false);
    expect(needsManualDepthCompare(webgl)).toBe(true);
    expect(needsManualDepthCompare(webgpu)).toBe(false);
    setWebglShadowCompareOverride(true);
    expect(needsManualDepthCompare(webgl)).toBe(false);
  });

  it('Vorgaben schlagen die Automatik', () => {
    setWebglShadowCompareOverride(false);
    expect(resolveManualCompare(undefined, webgl)).toBe(true);
    expect(resolveManualCompare(false, webgl)).toBe(false);
    expect(resolveManualCompare(true, webgpu)).toBe(true);
    expect(resolveManualCompare(() => false, webgl)).toBe(false);
  });
});
