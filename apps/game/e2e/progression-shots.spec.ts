import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { flowState, nodeOnScreen, request, seedProgress, setTimeScale, waitForRenderer, waitPhase, winLevel, type FlowHandles } from './helpers';

// Bilder für den Fortschrittsbericht (docs/progress/iter4-b4-*.png): Intro, Level 1 mit Wisch-Hinweis, Landung auf dem
// geschafften Knoten, mitten auf dem Weg, REX-Szene, gesperrter Knoten, Rand der Scroll-Grenze — Handy und Desktop.
// Echte GPU (wie webgpu.spec), nur auf Wunsch: EE_SHOTS=1 node scripts/e2e.mjs e2e/progression-shots.spec.ts
test.skip(!process.env.EE_SHOTS, 'nur mit EE_SHOTS=1');
test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });
test.setTimeout(300_000);

const OUT = fileURLToPath(new URL('../../../docs/progress/', import.meta.url));
const VIEWS = [
  { name: 'handy', size: { width: 393, height: 852 } },
  { name: 'desktop', size: { width: 1280, height: 800 } },
] as const;

/**
 * Hält die Szenenuhr an, `delay` s Szenenzeit nach dem `nth`. Takt `cue` (null: ab jetzt). Kehrt sofort zurück; `frozen`
 * wartet auf das Anhalten.
 */
async function freezeAfter(page: Page, cue: string | null, delay: number, nth = 1): Promise<void> {
  await page.evaluate(
    ([cueName, d, n]) => {
      const w = window as unknown as { __eeFlow: FlowHandles; __ee: { controller: { elapsed: number; timeScale: number } }; __frozen: boolean };
      const c = w.__ee.controller;
      w.__frozen = false;
      const hold = () => {
        const target = c.elapsed + (d as number);
        const tick = () => {
          if (c.elapsed >= target) {
            c.timeScale = 0;
            w.__frozen = true;
          } else requestAnimationFrame(tick);
        };
        tick();
      };
      if (cueName === null) {
        hold();
        return;
      }
      let count = 0;
      const on = (e: unknown) => {
        if ((e as { cue: string }).cue !== cueName || ++count < (n as number)) return;
        w.__eeFlow.bus.off('flow/cue', on);
        hold();
      };
      w.__eeFlow.bus.on('flow/cue', on);
    },
    [cue, delay, nth] as const,
  );
}

async function frozen(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window as unknown as { __frozen: boolean }).__frozen), { timeout: 60_000 }).toBe(true);
  // two more frames with the clock held (the HUD settles, the frame is rendered)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(250);
}

async function shot(page: Page, name: string, view: string): Promise<void> {
  await page.screenshot({ path: `${OUT}iter4-b4-${name}-${view}.png` });
}

/** Ohne Dev-Leiste (Bilder zeigen das Spiel, nicht die Entwicklerknöpfe). */
async function hideDevStrip(page: Page): Promise<void> {
  await page.addStyleTag({ content: '.flow-dev { display: none !important; }' });
}

for (const view of VIEWS) {
  test(`Bilder ${view.name}: Intro, Hinweis, Landung, Weg, REX-Szene`, async ({ page }) => {
    await page.setViewportSize(view.size);
    await page.goto('/?reset=real&mode=real');
    await waitForRenderer(page);
    await waitPhase(page, 'splash');
    await hideDevStrip(page);
    await page.waitForTimeout(1500);
    // Intro: mid-way (the hero in the air, the plateau heaving, the camera on its way)
    await freezeAfter(page, 'heroJump', 0.4);
    await page.mouse.click(view.size.width / 2, view.size.height * 0.8);
    await frozen(page);
    await shot(page, 'intro', view.name);
    await setTimeScale(page, 1);
    await waitPhase(page, 'level');
    // Level 1 with the swipe hint
    await expect(page.getByTestId('swipe-hint')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(700);
    await shot(page, 'level1-wischhinweis', view.name);
    // Win → the hero lands on the completed node (the plateau is gone, the walk has not begun)
    await freezeAfter(page, 'heroLand', 0.12);
    await winLevel(page);
    await frozen(page);
    await shot(page, 'landung-geschaffter-knoten', view.name);
    await setTimeScale(page, 1);
    // Mid-walk: just after the second hop landed
    await freezeAfter(page, 'hop', 0.09, 2);
    await frozen(page);
    await shot(page, 'mitten-auf-dem-weg', view.name);
    await setTimeScale(page, 1);
    // REX tells the scene after level 1
    await waitPhase(page, 'map');
    await expect.poll(async () => (await flowState(page)).story, { timeout: 30_000 }).toBe('afterLevel1');
    await expect.poll(async () => (await flowState(page)).rex ?? '', { timeout: 30_000 }).not.toContain('Geh');
    await page.waitForTimeout(1200);
    await shot(page, 'rex-szene', view.name);
  });

  test(`Bilder ${view.name}: gesperrter Knoten wackelt, Rand der Scroll-Grenze`, async ({ page }) => {
    await seedProgress(page, 'real', { real: { reached: 2, current: 2, seen: { intro: true, stories: ['afterLevel1'] } } });
    await page.setViewportSize(view.size);
    await page.goto('/play');
    await waitForRenderer(page);
    await waitPhase(page, 'map');
    await hideDevStrip(page);
    await page.waitForTimeout(3000);
    // Locked node: mid-shake, REX says why
    await freezeAfter(page, 'locked', 0.06);
    const p = await nodeOnScreen(page, 3);
    if (p) await page.mouse.click(p.x, p.y);
    else await request(page, 'flyIn', 3);
    await frozen(page);
    await page.waitForTimeout(400);
    await shot(page, 'gesperrter-knoten', view.name);
    await setTimeScale(page, 1);
    await page.waitForTimeout(1500);
    // Scroll limit: a far drag, held at the rubber-band edge
    const { width, height } = view.size;
    await page.mouse.move(width * 0.5, height * 0.85);
    await page.mouse.down();
    for (let i = 1; i <= 24; i++) {
      await page.mouse.move(width * 0.5 + (i * width * 0.25) / 24, height * 0.85 - (i * height * 0.8) / 24);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(300);
    await shot(page, 'scroll-grenze', view.name);
    await page.mouse.up();
  });
}
