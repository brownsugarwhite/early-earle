import { test, expect, type Page } from '@playwright/test';

// Real-GPU WebGPU check (Mac, Metal): every shader module and render pipeline must compile. The other e2e tests
// run on SwiftShader/WebGL2 and never see WGSL — a WGSL error drops whole render passes (the plateau and the
// creature bodies vanished once while WebGL2 looked fine). Skipped on CI runners (no GPU) and wherever the
// browser offers no WebGPU adapter.

test.skip(!!process.env.CI, 'braucht eine echte GPU');
test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });
test.setTimeout(120_000);

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

test('Flow auf WebGPU: Map, Anflug, Level 1 mit Merges — alle Pipelines kompilieren', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/play');
  await requireWebGPU(page);
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: 30_000 });
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  await page.getByTestId('play-btn').click();
  await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: 30_000 });
  await page.waitForTimeout(2500);
  // Level 1 (2, 2, 4, 4 → 8): merges, the leap, the depart back to the map — each builds new pipelines.
  // Keep swiping (the store queues one move) until the flow leaves the level, like the flow smoke test.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(900);
    const state = await hud.getAttribute('data-flow-state');
    if (state === 'depart' || state === 'map') break;
  }
  await expect(hud).toHaveAttribute('data-flow-state', /depart|map/, { timeout: 20_000 });
  await page.waitForTimeout(2500);
  expect(errors).toEqual([]);
});

test('Herde auf WebGPU: 21 Arten (Mesh-Körper, Fell, Federn) kompilieren', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto('/lab/grid');
  await requireWebGPU(page);
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  await page.getByTestId('grid-level-select').selectOption('-3');
  await page.waitForTimeout(4000);
  for (const key of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('Earle-Welten auf WebGPU: Wasser, Felsen, Scheune, Schneefelder und -wehen kompilieren', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 900, height: 700 });
  // Welten mit Geländemerkmalen: Fluss + Seen (02), Felsstufen + Wand (04), Eis + Tafelfels + Wehen (05),
  // Schneefelder + Wand (06), Scheune (08), Turm (09); Riesenstämme mit Leucht- (07) und Glasfenster-Rinde (10)
  for (const world of [2, 4, 5, 6, 7, 8, 9, 10]) {
    await page.goto(`/lab/earle?world=${world}&progress=100`);
    if (world === 2) {
      await requireWebGPU(page);
      await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    }
    await page.waitForTimeout(2500);
  }
  expect(errors).toEqual([]);
});

test('Riesenbaum im Flow auf WebGPU: Baumpilze, Blütensteine, Schiene, Anflug auf Wurzelterrasse und Krone', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  // Level 86 (Rinde → Wurzelterrasse) und 92 (Krone): Pilze, Steine, Punkte und Ring am Baum, Schattenwert der Punkte
  for (const node of [85, 91]) {
    await page.addInitScript((n) => localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: 'free', slots: { free: { reached: n, current: n }, real: {} } })), node);
    await page.goto('/play');
    if (node === 85) await requireWebGPU(page);
    const hud = page.getByTestId('flow-hud');
    await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: 30_000 });
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    await page.waitForTimeout(2500);
    await page.getByTestId('play-btn').click();
    await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: 30_000 });
    await page.waitForTimeout(2000);
  }
  expect(errors).toEqual([]);
});
