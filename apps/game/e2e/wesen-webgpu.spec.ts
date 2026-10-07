import { test, expect, type Page } from '@playwright/test';

// Echte GPU (Mac, Metal): alle Shader der Wesen-Werkstatt (Earle-Wesen-Material, Jelly, Zähne, Zunge) müssen kompilieren.
// Auf CI (keine GPU) übersprungen; TSL-Fehler sind unter SwiftShader/WebGL2 unsichtbar.

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

async function waitBuilt(page: Page): Promise<void> {
  const info = page.getByTestId('wesen-lab-info');
  await expect(info).not.toHaveText('…', { timeout: 30_000 });
  await expect(info).not.toContainText('fein folgt', { timeout: 30_000 });
}

test('Wesen-Lab auf WebGPU: Grundblob, Jelly, Keilmaul, Schlange — alle Pipelines kompilieren', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/lab/wesen?vorlage=grundblob');
  await requireWebGPU(page);
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  await waitBuilt(page);
  for (const id of ['jelly', 'keil', 'loch', 'schlange']) {
    await page.getByTestId(`wesen-vorlage-${id}`).click();
    await waitBuilt(page);
    await page.waitForTimeout(600);
  }
  await page.getByTestId('wesen-maul-auf').click();
  await page.waitForTimeout(700);
  await page.getByTestId('wesen-maul-zu').click();
  await page.waitForTimeout(700);
  const info = await page.getByTestId('wesen-lab-info').textContent();
  expect(info ?? '').toMatch(/\d+ Vertices/);
  expect(errors).toEqual([]);
});
