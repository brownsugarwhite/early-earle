import { test, expect, type Page } from '@playwright/test';

// Tutorial-Bretter im Grid-Lab (Handy, SwiftShader/WebGL2 wie die Smoke-Tests): Level 1 ist ein 1×3-Streifen
// auf einem Plateau (kein schmaler Steg), rendert ohne Konsolenfehler und ist nach zwei Wischen gewonnen.

test.use({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
test.setTimeout(process.env.CI ? 240_000 : 120_000);

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 400));
  });
  return errors;
}

interface GridLabDebug {
  board: {
    renderer: { w: number; h: number; animating: boolean; footprint: { minX: number; maxX: number; minZ: number; maxZ: number } };
  } | null;
}

const board = (page: Page) =>
  page.evaluate(() => {
    const r = (window as unknown as { __ee: { controller: GridLabDebug } }).__ee.controller.board?.renderer;
    return r ? { w: r.w, h: r.h, animating: r.animating, width: r.footprint.maxX - r.footprint.minX, depth: r.footprint.maxZ - r.footprint.minZ } : null;
  });

test('Level 1 (1×3) im Grid-Lab: Plateau statt Steg, zwei Wische gewinnen, keine Konsolenfehler', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/lab/grid');
  // A cold dev server transforms the whole render stack on the first lab visit: allow for it.
  await expect(page.locator('canvas')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
  // Level 2 (3×2) und zurück zu Level 1: beide kleinen Raster laden
  await page.getByTestId('grid-level-select').selectOption('1', { force: true });
  await expect.poll(async () => (await board(page))?.h, { timeout: 30_000 }).toBe(2);
  await page.getByTestId('grid-level-select').selectOption('0', { force: true });
  await expect.poll(async () => { const b = await board(page); return b ? `${b.w}x${b.h}` : null; }, { timeout: 30_000 }).toBe('3x1');
  const b = (await board(page))!;
  // the plateau is laid out for at least 2×2 cells: about as deep as it is wide
  expect(b.depth / b.width).toBeGreaterThan(0.9);
  await expect(page.getByTestId('grid-hud')).toContainText('Züge: frei');
  await expect(page.getByTestId('grid-hud')).toContainText('Stufe erreichen: 8');
  await expect(page.locator('.rex-line')).toContainText('Wisch zur Seite.');
  // wait for the rise, then two swipes (the store queues one while the board animates)
  await expect.poll(async () => (await board(page))?.animating, { timeout: 30_000 }).toBe(false);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(600);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.hud-banner.won')).toBeVisible({ timeout: 60_000 });
  expect(errors).toEqual([]);
});
