import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Bilder des Klassik-Modus für docs/progress (Mac, echte GPU; WebGL2 als Rückfall): Format-Blatt, Brett mit Punkten,
// „Bestwert!“-Stempel und „Kein Zug mehr“ — je Handy (393 × 852 @2x) und Desktop (1280 × 800). Nur auf Wunsch:
// EE_KLASSIK_SHOTS=1 E2E_PORT=… node scripts/e2e.mjs e2e/klassik-bilder.spec.ts

test.skip(!process.env.EE_KLASSIK_SHOTS || !!process.env.CI, 'nur mit EE_KLASSIK_SHOTS=1 auf dem Mac');
test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });
test.setTimeout(420_000);

const DIR = fileURLToPath(new URL('../../../docs/progress/', import.meta.url));
const FREE_PROGRESS = JSON.stringify({ version: 2, mode: 'free', slots: { free: { reached: 30, current: 3 }, real: {} } });
const KEYS = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'] as const;

async function swipeUntil(page: Page, done: () => Promise<boolean>, maxPresses: number, gapMs: number): Promise<void> {
  for (let i = 0; i < maxPresses && !(await done()); i++) {
    await page.keyboard.press(KEYS[i % 4]!);
    await page.waitForTimeout(gapMs);
  }
}

const score = async (page: Page): Promise<number> => Number((await page.getByTestId('hud-top').locator('.hud-stat b').textContent()) ?? 0);

for (const vp of [
  { name: 'handy', width: 393, height: 852, scale: 2 },
  { name: 'desktop', width: 1280, height: 800, scale: 1 },
]) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale });

    test(`Blatt, Brett mit Punkten, Bestwert-Stempel, Kein Zug mehr (${vp.name})`, async ({ page }) => {
      // Ein kleiner alter Bestwert, damit der Stempel früh kommt; die Formate sind noch ungesehen (Einstieg leuchtet).
      await page.addInitScript((p) => {
        localStorage.setItem('ee.progress.v2', p);
        localStorage.setItem('ee.klassik.v1', JSON.stringify({ version: 1, slots: { free: { best: { '4x4': 24, kreuz: 1536 }, runs: {}, seen: [] }, real: {} } }));
      }, FREE_PROGRESS);
      await page.goto('/play');
      await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
      await page.addStyleTag({ content: '.flow-dev { display: none !important; }' });
      const hud = page.getByTestId('flow-hud');
      await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: 45_000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${DIR}iter4-b6-karte-einstieg-${vp.name}.png` });
      await page.getByTestId('entry-classic').click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${DIR}iter4-b6-blatt-${vp.name}.png` });

      await page.getByTestId('klassik-format-4x4').click();
      await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: 45_000 });
      await page.waitForTimeout(1800);
      const stamp = page.getByTestId('klassik-stamp');
      await swipeUntil(page, () => stamp.isVisible(), 400, 450);
      await page.waitForTimeout(420);
      await page.screenshot({ path: `${DIR}iter4-b6-bestwert-${vp.name}.png` });
      await swipeUntil(page, async () => (await score(page)) >= 300, 600, 450);
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${DIR}iter4-b6-brett-${vp.name}.png` });
      const banner = page.locator('.hud-banner-flow');
      await swipeUntil(page, () => banner.isVisible(), 2500, 180);
      await expect(banner).toContainText('Kein Zug mehr', { timeout: 30_000 });
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${DIR}iter4-b6-kein-zug-${vp.name}.png` });
    });
  });
}
