import { test, expect, type Page } from '@playwright/test';

// Unter SwiftShader (CI) laufen die Kamerafahrten mit 0,1-s-Schritten bei wenigen fps → deutlich längere Wartezeiten.
// SwiftShader renders the fly-in (with the board pipelines compiling ahead) at a few fps: generous locally too.
const TRANSITION_MS = process.env.CI ? 90_000 : 45_000;
test.setTimeout(process.env.CI ? 360_000 : 180_000);

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
  await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', /hop|map/, { timeout: TRANSITION_MS });
  await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
  await expect(page.getByTestId('splash')).toHaveCount(0, { timeout: TRANSITION_MS });
  await expect(page.getByTestId('play-btn')).toBeVisible();
  expect(errors).toEqual([]);
});

// Dev build: the flow scene is reachable through the CanvasHost debug handle (`window.__ee.controller`).
interface Vec3Like {
  x: number;
  y: number;
  z: number;
}
interface FlowDebug {
  layout: { nodes: Array<{ site?: string; position: [number, number, number]; normal: [number, number, number]; rise?: number }>; dots: unknown[]; ribbon?: unknown[][] };
  world: { surfaceRadius(d: Vec3Like & { length(): number }): number; camera: { position: Vec3Like & { constructor: new (x: number, y: number, z: number) => Vec3Like & { project(c: unknown): Vec3Like } } } };
  board: { w: number; h: number; topY: number; root: { localToWorld<T>(v: T): T } };
  rex: { mode: string; spot: { kind: string; side: string; rect: { left: number; right: number; top: number; bottom: number } } | null };
}

test('Handy: Levelpfad liegt in der Landschaft, Spielfeld füllt die Breite, REX schaut oben rechts herein', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/play');
  await waitForRenderer(page);
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
  // The path: varied sites (rock ledges, clearings, the giant tree's bark and crown), stones resting on the ground.
  const path = await page.evaluate(() => {
    const c = (window as unknown as { __ee: { controller: FlowDebug } }).__ee.controller;
    const sites: Record<string, number> = {};
    let hover = 0;
    for (const n of c.layout.nodes) {
      const site = n.site ?? 'none';
      sites[site] = (sites[site] ?? 0) + 1;
      if (site === 'bark' || site === 'crown') continue;
      // On the ground the stone lies on the surface; on its element (rock, mound, sand bar) the element's foot does:
      // the stone minus the element's height along the surface normal.
      const rise = n.rise ?? 0;
      const x = n.position[0] - n.normal[0] * rise;
      const y = n.position[1] - n.normal[1] * rise;
      const z = n.position[2] - n.normal[2] * rise;
      const len = Math.hypot(x, y, z);
      hover = Math.max(hover, Math.abs(len - c.world.surfaceRadius({ x, y, z, length: () => len })));
    }
    return { sites, hover, dots: c.layout.dots.length, strips: c.layout.ribbon?.length ?? 0 };
  });
  expect(path.sites['ledge'] ?? 0).toBeGreaterThan(4);
  expect(path.sites['bark'] ?? 0).toBeGreaterThan(2);
  expect(path.sites['crown'] ?? 0).toBeGreaterThan(2);
  expect(path.hover).toBeLessThan(0.01);
  expect(path.dots).toBeGreaterThan(600);
  expect(path.strips).toBe(2);

  await page.getByTestId('play-btn').click();
  await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: TRANSITION_MS });
  // The grid fills most of the phone's width; REX peeks in at the top right (behind the board, under the pill).
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const c = (window as unknown as { __ee: { controller: FlowDebug } }).__ee.controller;
          const b = c.board;
          const cam = c.world.camera;
          const V = cam.position.constructor;
          const gx = (b.w * 0.81) / 2;
          const gz = (b.h * 0.81) / 2;
          let minX = Infinity;
          let maxX = -Infinity;
          for (const [x, z] of [
            [-gx, gz],
            [gx, gz],
            [-gx, -gz],
            [gx, -gz],
          ] as const) {
            const p = b.root.localToWorld(new V(x, b.topY, z)).project(cam);
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
          }
          const spot = c.rex.spot;
          return {
            width: Math.round(((maxX - minX) / 2) * 100) / 100,
            rex: spot ? `${c.rex.mode}:${spot.kind}:${spot.side}:${(spot.rect.left + spot.rect.right) / 2 > 393 * 0.55 && spot.rect.top < 852 * 0.4}` : 'none',
          };
        }),
      { timeout: TRANSITION_MS },
    )
    .toEqual({ width: expect.any(Number), rex: 'level:back:right:true' });
  const width = await page.evaluate(() => {
    const c = (window as unknown as { __ee: { controller: FlowDebug } }).__ee.controller;
    const b = c.board;
    const cam = c.world.camera;
    const V = cam.position.constructor;
    const gx = (b.w * 0.81) / 2;
    const near = [b.root.localToWorld(new V(-gx, b.topY, (b.h * 0.81) / 2)).project(cam), b.root.localToWorld(new V(gx, b.topY, (b.h * 0.81) / 2)).project(cam)];
    return (near[1]!.x - near[0]!.x) / 2;
  });
  expect(width).toBeGreaterThan(0.8);
  expect(width).toBeLessThan(0.98);
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
  await expect(hud).toHaveAttribute('data-flow-state', /flyIn|level/, { timeout: TRANSITION_MS });
  await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: TRANSITION_MS });
  // Level 1 (2, 2, 4, 4 → 8) is won after a left and a right swipe. Under SwiftShader frames are slow,
  // so we keep swiping (the grid store queues one pending move) until the flow leaves the level.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(900);
    const state = await hud.getAttribute('data-flow-state');
    if (state === 'depart' || state === 'map') break;
  }
  await expect(hud).toHaveAttribute('data-flow-state', /depart|map/, { timeout: TRANSITION_MS });
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
  await expect(page.getByTestId('hud-top').locator('h1')).toContainText('Level 2');
  expect(errors).toEqual([]);
});
