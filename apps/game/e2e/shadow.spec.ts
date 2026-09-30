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
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ dilation: 1, shift: 1.5, planeBias: false }));
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ dilation: 0.6, shift: 1, planeBias: true }));
  await expect.poll(async () => (await stats(page)).passes, { timeout: 30_000 }).toBeGreaterThan(before);

  // Testpunkte: shadowFactor() im Vertex-Shader, dazu Drehung (Schatten wandern über die Punkte)
  await page.getByTestId('shadow-dots').click();
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 6 }));
  await page.waitForTimeout(2500);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 0 }));
  await page.getByTestId('shadow-dots').click();
  expect(errors).toEqual([]);
});
