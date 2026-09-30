import { test, expect, type Page } from '@playwright/test';

// Real-GPU WebGPU check for the giant tree (Mac, Metal): wood (bark lines, snow, drift), jewel domes (stipple,
// flowers), lace, needles, blossoms and the path markers — on the tree lab and on the planet with the rail camera.
// The SwiftShader e2e never see WGSL; a WGSL error would drop whole passes. Skipped on CI (no GPU) and without a
// WebGPU adapter.

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

test('Riesenbaum auf WebGPU: alle Teile, beide Rinden, Mobil und die Schiene kompilieren', async ({ page }) => {
  const errors = collectGpuErrors(page);
  // Desktop: the lab's controls are a side panel there (on phones they sit in the collapsed bottom sheet).
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/lab/tree?view=path&t=0.3');
  await requireWebGPU(page);
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  const info = page.getByTestId('tree-lab-info');
  await expect(info).toContainText(/Kuppeln \d+/, { timeout: 60_000 });
  await page.waitForTimeout(2500);
  for (const v of ['trunk', 'canopy', 'blossoms', 'far', 'default']) {
    await page.getByTestId(`view-${v}`).click();
    await page.waitForTimeout(700);
  }
  await page.getByTestId('sel-bark').selectOption('jewel');
  await page.waitForTimeout(2500);
  await page.getByTestId('sel-stage').selectOption('huegel');
  await page.waitForTimeout(2500);
  await page.getByTestId('sel-quality').selectOption('mobil');
  await expect(info).toContainText('Mobil', { timeout: 60_000 });
  await page.waitForTimeout(2500);
  expect(errors).toEqual([]);
});

test('Riesenbaum auf dem Planeten (WebGPU): Krümmung, Schiene an Stamm und Krone', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  for (const rail of [82, 88, 94]) {
    await page.goto(`/lab/earle?world=1&rail=${rail}&path=1`);
    await requireWebGPU(page);
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    await page.waitForTimeout(4000);
  }
  expect(errors).toEqual([]);
});
