import { test, expect, type Page } from '@playwright/test';

// Real-GPU WebGPU check for the landmarks (Mac, Metal): rock with waterfall (fall sheets, spray/stipple dots, mist
// puffs, pool and stream), cliff step, twin falls, tall ruin (stone, lancet arcade, vines, dome bushes with rim dots),
// green swamp (marsh water, bog carpet, pads, reeds, bubbles) and the placement demo — Hoch and Mobil, plus the
// level board on the anchor. The SwiftShader e2e never see WGSL. Skipped on CI (no GPU) and without a WebGPU adapter.

test.skip(!!process.env.CI, 'braucht eine echte GPU');
test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });
test.setTimeout(240_000);

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

test('Landmarken auf WebGPU: alle Arten, Hoch und Mobil, Levelplatte auf dem Anker', async ({ page }) => {
  const errors = collectGpuErrors(page);
  // Desktop: the lab's controls are a side panel there.
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/lab/landmarks?kind=fallsRock');
  await requireWebGPU(page);
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  const info = page.getByTestId('lm-info');
  await expect(info).toContainText(/Platte r (4\.[5-9]|[5-9]\.\d)/, { timeout: 60_000 });
  await page.waitForTimeout(2500);
  for (const kind of ['cliffFall', 'twinFalls', 'ruin', 'swamp']) {
    await page.getByTestId(`lm-kind-${kind}`).click();
    await expect(info).toContainText(/Platte r (4\.[5-9]|[5-9]\.\d)/, { timeout: 60_000 });
    // every landmark comes with a way up and a way down
    await expect(info).toContainText(/Weg \d+ ↑ \d+ ↓/);
    await page.waitForTimeout(2000);
  }
  for (const v of ['unten', 'level', 'weit', 'oben', 'karte']) {
    await page.getByTestId(`lm-view-${v}`).click();
    await page.waitForTimeout(600);
  }
  await page.getByTestId('lm-quality').selectOption('mobil');
  await expect(info).toContainText('Mobil', { timeout: 60_000 });
  await page.waitForTimeout(2000);
  await page.getByTestId('lm-kind-fallsRock').click();
  await page.waitForTimeout(2500);
  await page.getByTestId('lm-kind-region').click();
  await expect(info).toContainText(/[2-9] Landmarken|1\d Landmarken/, { timeout: 60_000 });
  await page.waitForTimeout(2500);
  expect(errors).toEqual([]);
});

test('Landmarken-Lab auf dem Handy: Karte und Untersicht ohne Fehler, Regler geschlossen', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/lab/landmarks?kind=ruin&view=unten');
  await requireWebGPU(page);
  await expect(page.getByTestId('lab-frame')).toHaveAttribute('data-sheet', 'zu');
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  await page.waitForTimeout(3000);
  await page.getByTestId('lm-kind-swamp').click();
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
