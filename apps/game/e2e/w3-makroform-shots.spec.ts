import { test, expect, type Page } from '@playwright/test';

// W3 Makroform: Karten-Screenshots (Serpentine w06, Schnecke w05, Gratweg w11 im Hochformat, Mäander w09 quer).
test.skip(!!process.env.CI, 'braucht eine echte GPU');
test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });
test.setTimeout(300_000);

type Flow = { goToNode(i: number): void };

async function open(page: Page, w: number, h: number): Promise<void> {
  await page.addInitScript(() => {
    const slot = { reached: 183, current: 0, levels: {}, collection: {}, seen: { intro: true, stories: ['afterLevel1'] } };
    localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: 'free', slots: { free: slot, real: slot } }));
  });
  await page.setViewportSize({ width: w, height: h });
  await page.goto('/play?mode=free');
  await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'map', { timeout: 60_000 });
  await page.waitForFunction(() => !!(window as unknown as { __flow?: unknown }).__flow, undefined, { timeout: 30_000 });
}

async function shot(page: Page, node: number, file: string): Promise<void> {
  await page.evaluate((n) => (window as unknown as { __flow: Flow }).__flow.goToNode(n), node);
  await page.waitForTimeout(7000);
  await page.screenshot({ path: `../../docs/progress/${file}` });
}

test('Makroformen im Hochformat', async ({ page }) => {
  await open(page, 393, 852);
  await shot(page, 20, 'makroform-w06-serpentine-handy.png');
  await shot(page, 56, 'makroform-w05-spirale-handy.png');
  await shot(page, 130, 'makroform-w11-grat-handy.png');
});

test('Mäander w09 quer', async ({ page }) => {
  await open(page, 1440, 900);
  await shot(page, 7, 'makroform-w09-maeander-desktop.png');
});
