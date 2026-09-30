import { test, expect, type Page } from '@playwright/test';

// P2e Schatten-Lab (Shadows v2) smoke test. Läuft wie die anderen auf dem WebGL2-Fallback (SwiftShader): prüft, dass
// die Kaskaden gefittet werden, alle Umschalter ohne Fehler durchlaufen und das Texelgitter beim Rollen stehen bleibt.

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

interface CascadeStat {
  width: number;
  height: number;
  active: boolean;
  texelX: number;
  texelY: number;
  split: number;
}

interface LabStats {
  cascades: { cascades: CascadeStat[]; refits: number; passes: number; dMin: number; dMax: number } | null;
  passes: number;
}

const stats = (page: Page) =>
  page.evaluate(() => (window as unknown as { __ee: { controller: { getStats(): unknown } } }).__ee.controller.getStats()) as Promise<LabStats>;

test('/lab/shadow fittet Kaskaden an die Kamera, schaltet Alt/Neu/Split, Debug und Presets und hält das Gitter beim Rollen', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 900, height: 560 });
  await page.goto('/lab/shadow?q=mobil&mode=split&mag=0.62,0.7');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 60_000 });

  // Drei Kaskaden (Hoch), alle aktiv, verschachtelt feiner → gröber
  const info = page.getByTestId('shadow-info');
  await expect(info).toContainText(/K3 \d+×\d+ · [\d.]+ px\/Texel/, { timeout: 90_000 });
  await expect.poll(async () => (await stats(page)).cascades?.cascades.filter((c) => c.active).length ?? 0, { timeout: 60_000 }).toBe(3);
  const s0 = await stats(page);
  const cs = s0.cascades!.cascades;
  expect(cs[0]!.width * cs[0]!.height).toBeGreaterThan(cs[2]!.width * cs[2]!.height - 1);
  expect(cs[0]!.texelY).toBeLessThan(cs[2]!.texelY);
  expect(cs[0]!.split).toBeLessThan(cs[1]!.split);
  expect(s0.cascades!.dMin).toBeGreaterThan(0);

  // Lupe: zwei Insets im Split
  await expect(page.getByTestId('shadow-mag-inset')).toHaveCount(2);

  // Modi und Debug ohne Neukompilier-Fehler
  for (const m of ['alt', 'neu', 'split']) await page.getByTestId(`mode-${m}`).click();
  await page.getByTestId('shadow-debug').locator('select').selectOption('1');
  await page.getByTestId('shadow-debug').locator('select').selectOption('2');
  await page.getByTestId('shadow-debug').locator('select').selectOption('0');
  await page.getByTestId('shadow-taps').locator('select').selectOption('4');
  await page.getByTestId('shadow-smooth').click();
  await page.getByTestId('shadow-smooth').click();
  await page.getByTestId('shadow-view').locator('select').selectOption('earle');

  // Rollen: Schattenpässe laufen, feine Kaskaden behalten ihre Texelgröße (Gitter steht)
  await page.getByTestId(`mode-neu`).click();
  await expect.poll(async () => (await stats(page)).cascades?.cascades.filter((c) => c.active).length ?? 0, { timeout: 60_000 }).toBe(3);
  await page.waitForTimeout(1500);
  const before = await stats(page);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 8 }));
  await expect.poll(async () => (await stats(page)).passes, { timeout: 60_000 }).toBeGreaterThan(before.passes + 5);
  const after = await stats(page);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 0 }));
  for (let k = 0; k < 2; k++) {
    expect(after.cascades!.cascades[k]!.texelX).toBe(before.cascades!.cascades[k]!.texelX);
    expect(after.cascades!.cascades[k]!.texelY).toBe(before.cascades!.cascades[k]!.texelY);
  }

  // Mobil-Preset: zwei Kaskaden
  await page.getByTestId('shadow-cascades').locator('select').selectOption('mobil');
  await expect.poll(async () => (await stats(page)).cascades?.cascades.length ?? 0, { timeout: 60_000 }).toBe(2);
  await expect(info).toContainText('K2', { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('/lab/shadow Schatten v3: Kontakt-Diagnose, Feldansicht, Kontaktregler und Testpunkte (shadowFactor im Vertex-Shader)', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 900, height: 560 });
  await page.goto('/lab/shadow?q=mobil&view=karte&node=20&progress=30&mode=neu&mag=0&cascades=mobil');
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 60_000 });
  await expect.poll(async () => (await stats(page)).cascades?.cascades.filter((c) => c.active).length ?? 0, { timeout: 90_000 }).toBe(2);
  // Bodengefittete gröbste Kaskade: die Tiefe endet am sichtbaren Boden, nicht an der Schale
  const s = await stats(page);
  expect(s.cascades!.dMax).toBeGreaterThan(s.cascades!.dMin);

  // Kontakt-Diagnose und Feldansicht (Ersatzmaterial auf den Empfängern), Legende sichtbar
  const debug = page.getByTestId('shadow-debug').locator('select');
  await debug.selectOption('3');
  await expect(page.getByTestId('shadow-contact-legend')).toBeVisible();
  await page.waitForTimeout(1500);
  await debug.selectOption('4');
  await page.waitForTimeout(1500);
  await debug.selectOption('0');

  // Kontaktregler live (Mindestbreite, Versatz, Ebenen-Bias) → neue Schattenpässe ohne Fehler
  const before = (await stats(page)).passes;
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ dilation: 1, shift: 0.06, planeBias: false }));
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ dilation: 0.6, shift: 0.03, planeBias: true }));
  await expect.poll(async () => (await stats(page)).passes, { timeout: 30_000 }).toBeGreaterThan(before);

  // Empfängerhöhe verteilter Schichten (Kronen): bindet die Empfänger neu, die gröbste Kaskade wächst höchstens mäßig
  const last = (s: LabStats): CascadeStat => s.cascades!.cascades[s.cascades!.cascades.length - 1]!;
  const coverBefore = last(await stats(page));
  await expect(page.getByTestId('shadow-crown')).toBeVisible();
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ crownHeight: 3 }));
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 4 }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 0 }));
  const coverAfter = last(await stats(page));
  expect(coverAfter.texelY).toBeLessThan(coverBefore.texelY * 1.6);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ crownHeight: 0 }));

  // Testpunkte: shadowFactor() im Vertex-Shader, dazu Drehung (Schatten wandern über die Punkte)
  await page.getByTestId('shadow-dots').click();
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 6 }));
  await page.waitForTimeout(2500);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 0 }));
  await page.getByTestId('shadow-dots').click();
  expect(errors).toEqual([]);
});

// Echte GPU (Mac/Metal): die Tests oben laufen auf SwiftShader/WebGL2 und sehen kein WGSL. Hier kompilieren die
// Schatten-v3-Pfade unter WebGPU — Vergleich auf Level 0 (textureSampleCompareLevel) auch im Vertex-Shader (Testpunkte),
// Kontakt-Diagnose, Feldansicht, Kaskaden-Debug, Mobil-Preset, Ebenen-Bias als Bau-Option. Eigener Browser mit
// GPU-Flags (launchOptions lassen sich nicht pro Test umstellen); auf CI und ohne WebGPU-Adapter übersprungen.
const GPU_ERROR = /WGSL|ShaderModule|pipeline creation failed|Invalid RenderPipeline|unresolved value|Invalid (BindGroup|Buffer|Texture)/i;

test('/lab/shadow Schatten v3 auf WebGPU: Diagnose, Feld, Testpunkte und Presets kompilieren (echte GPU)', async ({ playwright, baseURL }) => {
  test.skip(!!process.env.CI, 'braucht eine echte GPU');
  test.setTimeout(180_000);
  const browser = await playwright.chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
  try {
    // Desktop: the lab's controls are a side panel there (on phones they sit in the collapsed bottom sheet).
    const page = await browser.newPage({ ...(baseURL ? { baseURL } : {}), viewport: { width: 1100, height: 800 } });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' || (m.type() === 'warning' && GPU_ERROR.test(m.text()))) errors.push(m.text().slice(0, 600));
    });
    await page.goto('/lab/shadow?view=karte&node=52&progress=60&mode=neu&mag=0');
    const ok = await page.evaluate(async () => {
      try {
        const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
        return !!gpu && !!(await gpu.requestAdapter());
      } catch {
        return false;
      }
    });
    test.skip(!ok, 'kein WebGPU-Adapter');
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    await expect.poll(async () => (await stats(page)).cascades?.cascades.filter((c) => c.active).length ?? 0, { timeout: 60_000 }).toBe(3);

    // Kontakt-Diagnose, Feld, Kaskaden, Texel (Ersatzmaterialien mit eigenem Vergleichspfad)
    const debug = page.getByTestId('shadow-debug').locator('select');
    for (const d of ['3', '4', '1', '2', '0']) {
      await debug.selectOption(d);
      await page.waitForTimeout(800);
    }
    // Testpunkte: shadowFactor() im Vertex-Shader, Schatten wandern beim Drehen über die Punkte
    await page.getByTestId('shadow-dots').click();
    await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 6 }));
    await page.waitForTimeout(2000);
    await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 0 }));
    await page.getByTestId('shadow-dots').click();

    // Mobil-Preset (zwei Kaskaden) und Ebenen-Bias aus/an (Neubau der Schattenknoten)
    await page.getByTestId('shadow-cascades').locator('select').selectOption('mobil');
    await expect.poll(async () => (await stats(page)).cascades?.cascades.length ?? 0, { timeout: 30_000 }).toBe(2);
    await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ planeBias: false }));
    await page.waitForTimeout(1200);
    await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ planeBias: true }));
    await page.waitForTimeout(1200);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
