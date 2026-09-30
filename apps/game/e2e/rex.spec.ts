import { test, expect, type Page } from '@playwright/test';

// P7 REX: the lab (every animation, iPhone map/level previews) and the flow without the old logo billboard.
// Runs on the WebGL2 fallback (SwiftShader) like the other smoke tests: generous budgets, Mobil preset.

test.setTimeout(process.env.CI ? 240_000 : 150_000);

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

async function useMobilPreset(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ee.qualityPref', 'mobil');
    } catch {
      /* storage blocked */
    }
  });
}

test('/lab/rex zeigt REX auf der Wiese und spielt jede Animation', async ({ page }) => {
  const errors = collectErrors(page);
  await useMobilPreset(page);
  await page.goto('/lab/rex');
  await waitForRenderer(page);
  const info = page.getByTestId('rex-lab-info');
  // One skinned mesh with the whole rig: 22 bones, a few thousand vertices.
  await expect(info).toContainText('22 Knochen', { timeout: 30_000 });
  await expect(info).toContainText(/\d{4} Vertices/);
  for (const act of ['cheer', 'cheer3', 'despair', 'point', 'dizzy', 'celebrate', 'finale', 'hide', 'peek', 'idle']) {
    await page.getByTestId(`rex-act-${act}`).click();
  }
  await page.getByTestId('rex-act-cheer').click();
  await expect(info).toContainText('Aktion cheer', { timeout: 20_000 });
  await page.getByTestId('rex-text').fill('Doppelt!');
  await page.getByTestId('rex-act-talk').click();
  // Size and tempo sliders exist and move.
  await page.getByTestId('rex-size').locator('input').fill('1.3');
  await expect(page.getByTestId('rex-size')).toContainText('1.30×');
  expect(errors).toEqual([]);
});

test('/lab/rex iPhone-Karte: REX an der Ecke über der Sprechblase, Level: oben rechts hinter der Platte wie im Flow', async ({ page }) => {
  const errors = collectErrors(page);
  await useMobilPreset(page);
  await page.setViewportSize({ width: 1400, height: 960 });
  await page.goto('/lab/rex?view=map');
  await waitForRenderer(page);
  const phone = page.getByTestId('rex-phone');
  const box = await phone.boundingBox();
  expect(Math.round(box?.width ?? 0)).toBe(393);
  expect(Math.round(box?.height ?? 0)).toBe(852);
  await expect(page.getByTestId('rex-bubble')).toBeVisible();
  const info = page.getByTestId('rex-lab-info');
  await expect(info).toContainText(/Karte: (links|rechts)/, { timeout: 40_000 });
  await page.getByTestId('rex-act-point').click();

  await page.getByTestId('rex-view-level').click();
  await waitForRenderer(page);
  await expect(info).toContainText(/Level: back rechts/, { timeout: 60_000 });
  expect(errors).toEqual([]);
});

test('/play zeigt kein Logo-Billboard mehr, sondern den 3D-REX', async ({ page }) => {
  const errors = collectErrors(page);
  const logoImages: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'image' && r.url().includes('07-illudiy-logo-rex')) logoImages.push(r.url());
  });
  await page.goto('/play');
  await waitForRenderer(page);
  await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'map', { timeout: 30_000 });
  // Dev build: the flow scene is reachable through the CanvasHost debug handle.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const c = (window as unknown as { __ee?: { controller?: { world?: { scene?: { traverse(fn: (o: { isSprite?: boolean; isSkinnedMesh?: boolean; name: string; visible: boolean }) => void): void } }; rex?: { mode?: string; character?: { hidden?: boolean } } } } }).__ee?.controller;
          const scene = c?.world?.scene;
          if (!scene) return 'no-scene';
          let sprites = 0;
          let rex = 0;
          scene.traverse((o) => {
            // The old placeholder was a Sprite named 'rex' (the logo billboard).
            if (o.isSprite && o.name === 'rex') sprites++;
            if (o.isSkinnedMesh && o.name === 'rex') rex++;
          });
          return `sprites=${sprites} rex=${rex} mode=${c?.rex?.mode} up=${c?.rex?.character?.hidden === false}`;
        }),
      { timeout: 60_000 },
    )
    .toBe('sprites=0 rex=1 mode=map up=true');
  expect(logoImages).toEqual([]);
  expect(errors).toEqual([]);
});
