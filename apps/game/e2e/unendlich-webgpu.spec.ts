import { test, expect, type Page } from '@playwright/test';

// ADR 0002 "Unendliche Kugel" on the real GPU (Mac, Metal): the map pans 5000 units forward along the path and 5000
// sideways — chunks stream in and out, the level-path window follows, world slots are recycled, the caches stay bounded,
// the draw calls stay ≲ 100 on Hoch while panning, and nothing breaks (no WGSL/pipeline errors, no page errors).
// Skipped on CI (no GPU) and without a WebGPU adapter; SwiftShader would take minutes for the 200 pan steps.

test.skip(!!process.env.CI, 'braucht eine echte GPU');
test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });
test.setTimeout(300_000);

const GPU_ERROR = /WGSL|ShaderModule|pipeline creation failed|Invalid RenderPipeline|unresolved value|Invalid (BindGroup|Buffer|Texture)/i;

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' || ((m.type() === 'warning') && GPU_ERROR.test(m.text()))) errors.push(m.text().slice(0, 600));
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

interface FlowStats {
  focus: { x: number; z: number };
  streaming: { wanted: number; loaded: number; visible: number };
  caches: { chunks: number; cpu: number; regions: number; slots: number };
  chunkBuilds: number;
  viewWorld: number;
  window: [number, number] | null;
  windowBuilds: number;
  slots: number;
  evictions: number;
}

interface FlowHandle {
  pan(dx: number, dz: number): void;
  stats(): FlowStats;
}

const flow = (page: Page) => ({
  pan: (dx: number, dz: number) => page.evaluate(([x, z]) => (window as unknown as { __flow: FlowHandle }).__flow.pan(x!, z!), [dx, dz]),
  stats: () => page.evaluate(() => (window as unknown as { __flow: FlowHandle }).__flow.stats()),
});

/** Draw calls of the last frame (perf badge "… NN dc"). */
async function drawCalls(page: Page): Promise<number> {
  const text = (await page.getByTestId('perf-badge').textContent()) ?? '';
  const m = /(\d+)\s*dc/.exec(text);
  return m ? Number(m[1]) : 0;
}

test('Unendliche Kugel: 5000 Einheiten vorwärts und seitwärts schwenken — Streaming, Pfadfenster, begrenzte Caches', async ({ page }) => {
  const errors = collectErrors(page);
  // Free mode (no scroll limit), level 41; Hoch fixed (the draw-call budget is the Hoch one)
  await page.addInitScript(() => {
    localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: 'free', slots: { free: { reached: 40, current: 40 }, real: {} } }));
    localStorage.setItem('ee.qualityPref', 'hoch');
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/play');
  await requireWebGPU(page);
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: 30_000 });
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  await page.waitForTimeout(2500);
  const f = flow(page);
  const s0 = await f.stats();

  let maxDc = 0;
  // Forward along the path (−z): 100 steps of 50 units, like fast drags; the frame after each step streams
  for (let i = 0; i < 100; i++) {
    await f.pan(0, -50);
    await page.waitForTimeout(50);
    if (i % 10 === 9) {
      await page.waitForTimeout(250);
      maxDc = Math.max(maxDc, await drawCalls(page));
    }
  }
  const s1 = await f.stats();
  expect(s1.focus.z).toBeLessThan(s0.focus.z - 4900);
  // Far beyond level 100: procedural worlds, the path window moved on with the view
  expect(s1.viewWorld).toBeGreaterThanOrEqual(10);
  expect(s1.windowBuilds).toBeGreaterThan(s0.windowBuilds);
  expect(s1.window?.[0] ?? 0).toBeGreaterThan(500);

  // Sideways: 100 steps of 50 units across the band into the lateral worlds
  for (let i = 0; i < 100; i++) {
    await f.pan(50, 0);
    await page.waitForTimeout(50);
    if (i % 10 === 9) {
      await page.waitForTimeout(250);
      maxDc = Math.max(maxDc, await drawCalls(page));
    }
  }
  await page.waitForTimeout(1500);
  const s2 = await f.stats();
  expect(s2.focus.x).toBeGreaterThan(s1.focus.x + 4900);
  // Streaming: many chunks built on the way, only a bounded set loaded and cached
  expect(s2.chunkBuilds).toBeGreaterThan(s0.chunkBuilds + 200);
  expect(s2.streaming.loaded).toBeGreaterThan(0);
  expect(s2.caches.chunks).toBeLessThanOrEqual(160);
  expect(s2.caches.cpu).toBeLessThanOrEqual(130);
  expect(s2.caches.regions).toBeLessThanOrEqual(170);
  expect(s2.caches.slots).toBeLessThanOrEqual(24);
  // World slots were recycled (dozens of worlds passed by, 24 slots)
  expect(s2.evictions).toBeGreaterThan(0);
  expect(maxDc).toBeGreaterThan(0);
  expect(maxDc).toBeLessThanOrEqual(100);
  // Back home: a glide to the current node still works after the long trip
  await page.evaluate(() => (window as unknown as { __flow: { goToNode(i: number): void } }).__flow.goToNode(40));
  await page.waitForTimeout(3000);
  const s3 = await f.stats();
  expect(Math.abs(s3.focus.z - s0.focus.z)).toBeLessThan(60);
  expect(errors).toEqual([]);
});
