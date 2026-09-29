import { test, expect, type Page } from '@playwright/test';

// P5 Flow-Lab: one take without cuts. Runs on the WebGL2 fallback (SwiftShader) like the smoke tests.

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function waitForRenderer(page: Page): Promise<void> {
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
}

test('/ zeigt den Splash; ein Tipp startet den Hüpfer und endet auf der Map', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('splash')).toBeVisible();
  await expect(page.locator('img.splash-img')).toBeVisible();
  await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'splash');
  await waitForRenderer(page);
  await page.mouse.click(400, 300);
  await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', /hop|map/, { timeout: 3_000 });
  await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'map', { timeout: 10_000 });
  await expect(page.getByTestId('splash')).toHaveCount(0, { timeout: 5_000 });
  await expect(page.getByTestId('play-btn')).toBeVisible();
  expect(errors).toEqual([]);
});

test('/play startet auf der Map mit Glas-HUD; Spielen fliegt ins Level, Wisch/Taste zieht', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/play');
  await waitForRenderer(page);
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', 'map');
  await expect(page.getByTestId('hud-top')).toBeVisible();
  await expect(page.getByTestId('hud-top').locator('h1')).toContainText('Level 1');
  await expect(page.getByTestId('rex-line')).toBeVisible();
  await page.getByTestId('play-btn').click();
  await expect(hud).toHaveAttribute('data-flow-state', /flyIn|level/, { timeout: 3_000 });
  await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: 10_000 });
  // Level 1 (2, 2, 4, 4 → 8) is won after a left and a right swipe. Under SwiftShader frames are slow,
  // so we keep swiping (the grid store queues one pending move) until the flow leaves the level.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(900);
    const state = await hud.getAttribute('data-flow-state');
    if (state === 'depart' || state === 'map') break;
  }
  await expect(hud).toHaveAttribute('data-flow-state', /depart|map/, { timeout: 8_000 });
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: 10_000 });
  await expect(page.getByTestId('hud-top').locator('h1')).toContainText('Level 2');
  expect(errors).toEqual([]);
});
