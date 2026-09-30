import { test, expect, type Page } from '@playwright/test';

// Möwe im Spiel (Iteration 4, B2): der Schatten einer Möwe fliegt übers Brett und lässt den Spawn aufklatschen.
// Funktionsprüfung im Grid-Lab mit `?gull=always` auf dem WebGL2-Fallback (SwiftShader) wie die anderen Specs:
// Wische → Möwe fliegt → Blob landet → Brett kommt zur Ruhe, ohne Konsolenfehler. Die Tweens laufen auf der Wanduhr,
// also auch bei wenigen fps in der geplanten Zeit.

test.setTimeout(process.env.CI ? 300_000 : 180_000);
// Bilder nur mit echter GPU (Metal); die Funktionsprüfung läuft sonst wie alle Specs auf SwiftShader.
if (process.env.GULL_SHOTS) test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

interface BoardStats {
  flights: number;
  active: number;
  released: boolean;
  animating: boolean;
  blobs: number;
  pending: number;
  airborne: number;
  status: string;
}

/** Grid-Lab-Brett über den Debug-Griff des Dev-Builds (`window.__ee.controller` = GridLabScene). */
async function stats(page: Page): Promise<BoardStats | null> {
  return page.evaluate(() => {
    interface V {
      pending: boolean;
      lift: number;
    }
    interface R {
      gull: { flights: number; active: number; last: { released: boolean } };
      animating: boolean;
      blobs: { visuals: Map<number, V> };
      state: { status: string } | null;
    }
    const c = (window as unknown as { __ee?: { controller?: { board?: { renderer?: R } } } }).__ee?.controller;
    const r = c?.board?.renderer;
    if (!r) return null;
    const vs = [...r.blobs.visuals.values()];
    return {
      flights: r.gull.flights,
      active: r.gull.active,
      released: r.gull.last.released,
      animating: r.animating,
      blobs: vs.length,
      pending: vs.filter((v) => v.pending).length,
      airborne: vs.filter((v) => Math.abs(v.lift) > 1e-3).length,
      status: r.state?.status ?? 'none',
    };
  });
}

/** Wartet, bis das Brett ruht: keine Tweens (auch die Möwe ist draußen), kein Blob in der Luft oder noch getragen. */
async function settled(page: Page): Promise<BoardStats> {
  await expect.poll(async () => {
    const s = await stats(page);
    return !!s && !s.animating && s.pending === 0 && s.airborne === 0 && s.active === 0;
  }, { timeout: 30_000 }).toBe(true);
  return (await stats(page))!;
}

test('Grid-Lab ?gull=always: der Möwenschatten fliegt, der Blob klatscht auf, das Brett kommt zur Ruhe', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/lab/grid?gull=always');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
  await expect(page.getByTestId('grid-gull')).toHaveAttribute('data-mode', 'always');
  await expect(page.getByTestId('grid-gull')).toHaveText('Möwe: immer');
  // Level 5 (4×4, genug Züge) — Level 1 ist mit dem ersten Wisch gewonnen.
  await page.getByTestId('grid-level-select').selectOption('4');
  await expect.poll(async () => (await stats(page))?.blobs ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
  let s = await settled(page);
  expect(s.flights).toBe(0);

  let moves = 0;
  for (const key of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) {
    const before = s.flights;
    const blobsBefore = s.blobs;
    await page.keyboard.press(key);
    // Jeder Zug mit Spawn bringt eine Möwe (always); ein Wisch, der nichts ändert, bringt keine.
    const started = await expect
      .poll(async () => (await stats(page))?.flights ?? 0, { timeout: 5_000 })
      .toBeGreaterThan(before)
      .then(() => true)
      .catch(() => false);
    s = await settled(page);
    if (!started) continue;
    moves++;
    expect(s.flights).toBe(before + 1);
    expect(s.released).toBe(true);
    // Der gebrachte Blob steht auf dem Brett (Merges können andere entfernt haben).
    expect(s.blobs).toBeGreaterThan(0);
    expect(s.blobs).toBeLessThanOrEqual(blobsBefore + 1);
    if (s.status !== 'playing') break;
  }
  expect(moves).toBeGreaterThanOrEqual(3);

  // Schneller Doppelwisch: der zweite wartet und beschleunigt Zug und Möwe gemeinsam — beides landet, nichts hängt.
  if (s.status === 'playing') {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.press('ArrowLeft');
    s = await settled(page);
    expect(s.pending).toBe(0);
  }

  // Aus: kein Flug mehr
  await page.getByTestId('grid-gull').click();
  await expect(page.getByTestId('grid-gull')).toHaveAttribute('data-mode', 'off');
  await page.getByTestId('grid-restart').click();
  await expect.poll(async () => (await stats(page))?.blobs ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
  s = await settled(page);
  const off = s.flights;
  for (const key of ['ArrowLeft', 'ArrowRight']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(600);
    s = await settled(page);
  }
  expect(s.flights).toBe(off);
  // …und wieder im Takt
  await page.getByTestId('grid-gull').click();
  await expect(page.getByTestId('grid-gull')).toHaveAttribute('data-mode', 'auto');
  expect(errors).toEqual([]);
});

// ------------------------------------------------------------------------------------------------ Bilder (echte GPU)
// `GULL_SHOTS=1 E2E_PORT=… node scripts/e2e.mjs e2e/gull.spec.ts` (Mac, Metal): hält die Szene an festen Momenten des
// Flugs an (die Uhr der Seite läuft über `performance.now`, hier langsamer bzw. angehalten) und legt Bilder nach
// `GULL_SHOTS_DIR` (Standard docs/progress). Nicht in CI.

const SHOTS = process.env.GULL_SHOTS_DIR ?? '../../docs/progress';
const PREFIX = process.env.GULL_SHOTS_PREFIX ?? 'iter4-b2-';

/** Seitenuhr mit Zeitlupe/Halt: `window.__eeTime.scale` (1 = normal, 0 = angehalten). */
async function installClock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const real = performance.now.bind(performance);
    let lastReal = real();
    let virt = lastReal;
    const ctl = { scale: 1 };
    (window as unknown as { __eeTime: typeof ctl }).__eeTime = ctl;
    performance.now = () => {
      const r = real();
      virt += (r - lastReal) * ctl.scale;
      lastReal = r;
      return virt;
    };
  });
}

async function timeScale(page: Page, k: number): Promise<void> {
  await page.evaluate((v) => {
    (window as unknown as { __eeTime: { scale: number } }).__eeTime.scale = v;
  }, k);
}

interface Times {
  enterAt: number;
  callAt: number;
  releaseAt: number;
  impactAt: number;
  exitAt: number;
}

/** Flugzeit des zuletzt geschriebenen Möwen-Frames (s ab Zugbeginn) und die Zeiten des Flugs. */
async function flight(page: Page): Promise<{ t: number; times: Times | null }> {
  return page.evaluate(() => {
    interface G {
      last: { t: number; times: Times | null };
    }
    const c = (window as unknown as { __ee?: { controller?: { board?: { renderer?: { gull: G } } } } }).__ee?.controller;
    const g = c?.board?.renderer?.gull;
    return { t: g?.last.t ?? -1, times: g?.last.times ?? null };
  });
}

/** Lässt die Szene in Zeitlupe laufen, bis der Flug den Moment `at(times)` erreicht, und hält sie dort an. */
async function freezeAt(page: Page, at: (t: Times) => number): Promise<void> {
  await timeScale(page, 0.12);
  await expect
    .poll(
      async () => {
        const f = await flight(page);
        return f.times ? f.t >= at(f.times) : false;
      },
      { timeout: 60_000, intervals: [10] },
    )
    .toBe(true);
  await timeScale(page, 0);
  await page.waitForTimeout(250);
}

async function shoot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${SHOTS}/${PREFIX}${name}.png` });
}

test.describe('Bilder (echte GPU)', () => {
  test.skip(!process.env.GULL_SHOTS, 'nur auf Wunsch: GULL_SHOTS=1');

  for (const view of [
    { name: 'handy', width: 393, height: 852 },
    { name: 'desktop', width: 1280, height: 800 },
  ]) {
    test(`Grid-Lab ${view.name}: Anflug, Abwurf, Fall, Aufprall`, async ({ page }) => {
      await installClock(page);
      await page.setViewportSize({ width: view.width, height: view.height });
      await page.goto('/lab/grid?gull=always');
      await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
      if (view.name === 'handy') await page.getByTestId('lab-sheet-toggle').click();
      await page.getByTestId('grid-level-select').selectOption(process.env.GULL_LEVEL ?? '4');
      if (view.name === 'handy') await page.getByTestId('lab-sheet-toggle').click();
      await page.waitForTimeout(3500);
      await page.keyboard.press(process.env.GULL_KEY ?? 'ArrowLeft');
      await freezeAt(page, (t) => t.releaseAt - 0.22);
      await shoot(page, `grid-${view.name}-anflug`);
      await freezeAt(page, (t) => t.releaseAt);
      await shoot(page, `grid-${view.name}-abwurf`);
      await freezeAt(page, (t) => t.releaseAt + 0.33);
      await shoot(page, `grid-${view.name}-fall`);
      await freezeAt(page, (t) => t.impactAt + 0.05);
      await shoot(page, `grid-${view.name}-aufprall`);
      await freezeAt(page, (t) => t.impactAt + 0.3);
      await shoot(page, `grid-${view.name}-abflug`);
      await timeScale(page, 1);
    });
  }
});
