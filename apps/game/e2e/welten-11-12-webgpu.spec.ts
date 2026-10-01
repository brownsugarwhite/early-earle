import { test, expect, type Page } from '@playwright/test';

// Real-GPU WebGPU check for the authored worlds 11 and 12 (Ebene 20 „Nebelweide“, Ebene 7 „Goldnebelhang“): the new
// tree kinds (parasol cap and trunk, cauliflower shrubs, hanging-tier firs with rising fog), mist banks, mountain
// silhouettes, the scale carpet (plain and with light streaks and colour patches), the meadow and the fog sea layers,
// the foreground branch — in the Earle lab composition, the tree gallery and on the /play map (the path ribbon in the
// fog). SwiftShader never sees WGSL; skipped on CI and without a WebGPU adapter.

test.skip(!!process.env.CI, 'braucht eine echte GPU');
test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });
test.setTimeout(180_000);

const GPU_ERROR = /WGSL|ShaderModule|pipeline creation failed|Invalid RenderPipeline|unresolved value|Invalid (BindGroup|Buffer|Texture)/i;

function collectGpuErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && GPU_ERROR.test(m.text())) errors.push(m.text().slice(0, 600));
  });
  return errors;
}

async function requireWebGPU(page: Page): Promise<void> {
  const ok = await page.evaluate(async () => {
    try {
      const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      return !!gpu && !!(await gpu.requestAdapter());
    } catch {
      return false;
    }
  });
  test.skip(!ok, 'kein WebGPU-Adapter');
}

/**
 * Detail of the rendered frame: size of a PNG screenshot of the stage (a WebGPU canvas cannot be read back after it was
 * presented). A flat clear colour compresses to a few KB, a painted Earle scene to hundreds.
 */
async function frameBytes(page: Page): Promise<number> {
  const png = await page.getByTestId('lab-stage').screenshot();
  return png.length;
}

test('Welten 11/12 im Earle-Lab (Komposition, Hoch und Mobil) und in der Baum-Galerie: alle Pipelines kompilieren', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let first = true;
  for (const [world, quality] of [
    [11, 'hoch'],
    [12, 'hoch'],
    [11, 'mobil'],
    [12, 'mobil'],
  ] as const) {
    await page.goto(`/lab/earle?world=${world}&p=1&quality=${quality}`);
    if (first) {
      await requireWebGPU(page);
      first = false;
    }
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    await expect(page.getByTestId('earle-world-tag')).toHaveAttribute('data-world', String(world), { timeout: 30_000 });
    await page.waitForTimeout(3500);
    expect(await frameBytes(page), `Welt ${world} ${quality}`).toBeGreaterThan(80_000);
  }
  for (const [world, kinds] of [
    [11, 'parasol,shrub,parasol'],
    [12, 'fir,shrub,fir'],
  ] as const) {
    await page.goto(`/lab/earle?gallery=1&world=${world}&kinds=${kinds}`);
    await page.waitForTimeout(2500);
  }
  expect(errors).toEqual([]);
});

test('Welt 12 auf der Karte (/play): Pfad im Nebelmeer, Steilhang, Tannen — kompiliert', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.addInitScript(() => localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: 'free', slots: { free: { reached: 99, current: 99 }, real: {} } })));
  await page.goto('/play');
  await requireWebGPU(page);
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: 30_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __flow?: unknown }).__flow), null, { timeout: 30_000 });
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  // Welt 11 (Level 125–136) und Welt 12 (137–148) liegen nach w03 auf der Route (Route 15 + 1): zum Knoten gleiten
  for (const node of [128, 142]) {
    await page.evaluate((n) => (window as unknown as { __flow: { goToNode(i: number): void } }).__flow.goToNode(n), node);
    await page.waitForTimeout(4500);
    const world = await page.evaluate(() => (window as unknown as { __flow: { stats(): { viewWorld: number } } }).__flow.stats().viewWorld);
    expect(world, `Knoten ${node}`).toBe(node < 136 ? 10 : 11);
  }
  expect(errors).toEqual([]);
});
