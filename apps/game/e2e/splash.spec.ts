import { test, expect, type Page } from '@playwright/test';

// Loader und Splash (B1): Fortschritt im HTML, Aufbau nach 100 %, "Tippen", Übergabe an den 3D-Helden.
// Läuft wie die anderen Smoke-Tests auf SwiftShader/WebGL2 — Zeiten großzügig (die Maschine teilt sich die Last).
const SLOW = process.env.CI ? 150_000 : 120_000;
test.setTimeout(process.env.CI ? 300_000 : 240_000);

const PARTS = ['frame', 'panel', 'blob', 'flame', 'reg', 'star-l', 'star-m', 'star-r'];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** Fortschritt mitschreiben, bis 100 % (Stichproben im Takt von 100 ms). */
async function recordProgress(page: Page): Promise<number[]> {
  const splash = page.getByTestId('splash');
  const seen: number[] = [];
  await expect
    .poll(
      async () => {
        const v = Number(await splash.getAttribute('data-progress'));
        seen.push(v);
        return v;
      },
      { timeout: SLOW, intervals: [100] },
    )
    .toBe(100);
  return seen;
}

async function attachMeasures(page: Page): Promise<void> {
  const measures = await page.evaluate(() =>
    performance
      .getEntriesByType('measure')
      .filter((m) => m.name.startsWith('boot:'))
      .map((m) => ({ name: m.name, ms: Math.round(m.duration) })),
  );
  await test.info().attach('boot-measures', { body: JSON.stringify(measures, null, 2), contentType: 'application/json' });
}

test('Loader zählt monoton bis 100 %, danach steht das Logo und "Tippen"', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const splash = page.getByTestId('splash');
  await expect(splash).toBeVisible();
  // Erstes Bild kommt aus index.html (vor dem Bündel): 0–99 %
  expect(Number(await splash.getAttribute('data-progress'))).toBeLessThan(100);
  const seen = await recordProgress(page);
  for (let i = 1; i < seen.length; i++) expect(seen[i]!, `Stichprobe ${i}: ${seen.join(',')}`).toBeGreaterThanOrEqual(seen[i - 1]!);
  await expect(splash).toHaveAttribute('data-phase', 'idle', { timeout: SLOW });
  for (const part of PARTS) await expect(page.locator(`#ee-splash [data-part="${part}"]`), part).toHaveAttribute('data-state', 'in');
  await expect(page.getByTestId('splash-tippen')).toBeVisible();
  await attachMeasures(page);
  expect(errors).toEqual([]);
});

test('Tipp mitten im Aufbau: alles schnappt ans Ende, "Tippen" in 300 ms', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('splash')).toHaveAttribute('data-phase', 'intro', { timeout: SLOW });
  // Zeit im Browser messen (Tipp → Leerlauf), unabhängig von der Latenz des Testtreibers
  const ms = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const root = document.getElementById('ee-splash')!;
        const t0 = performance.now();
        const obs = new MutationObserver(() => {
          if (root.dataset.phase === 'idle') {
            obs.disconnect();
            resolve(performance.now() - t0);
          }
        });
        obs.observe(root, { attributes: true, attributeFilter: ['data-phase'] });
        root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }));
      }),
  );
  await test.info().attach('snap-ms', { body: String(Math.round(ms)), contentType: 'text/plain' });
  expect(ms).toBeLessThan(300);
  await expect(page.getByTestId('splash-tippen')).toBeVisible();
  expect(errors).toEqual([]);
});

/** Renderer bereit (unter Last kann die Notbremse des Boots vorher 100 % zeigen; Tippen wartet dann auf die Szene). */
async function waitForRenderer(page: Page): Promise<void> {
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: SLOW });
}

test('Tipp auf "Tippen": Ausklang, Übergabe an den Helden, Map — Splash weg', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await waitForRenderer(page);
  const splash = page.getByTestId('splash');
  await expect(splash).toHaveAttribute('data-phase', 'idle', { timeout: SLOW });
  // Das SVG lässt Zeiger durch (pointer-events: none): getippt wird auf den Splash über dem Wort
  const box = (await page.getByTestId('splash-tippen').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', /hop|map/, { timeout: SLOW });
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: SLOW });
  await expect(splash).toHaveCount(0, { timeout: SLOW });
  await expect(page.getByTestId('play-btn')).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe('reduzierte Bewegung', () => {
  test.use({ reducedMotion: 'reduce' });
  test('alles schneidet bei 100 % ein, Tippen führt ohne Ausklang zur Map', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await waitForRenderer(page);
    const splash = page.getByTestId('splash');
    await recordProgress(page);
    // kein Aufbau: gleich der Endzustand
    await expect(splash).toHaveAttribute('data-phase', 'idle', { timeout: 5_000 });
    for (const part of PARTS) await expect(page.locator(`#ee-splash [data-part="${part}"]`), part).toHaveAttribute('data-state', 'in');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'map', { timeout: SLOW });
    await expect(splash).toHaveCount(0, { timeout: SLOW });
    expect(errors).toEqual([]);
  });
});

test('Vergleich mit Florians PNG (?splash=overlay): jedes Teil deckt sich zu ≥ 97 %', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?splash=overlay');
  const splash = page.getByTestId('splash');
  await expect(page.getByTestId('splash-iou')).toBeVisible({ timeout: SLOW });
  const iou = JSON.parse((await splash.getAttribute('data-iou')) ?? '{}') as Record<string, number>;
  await test.info().attach('iou', { body: JSON.stringify(iou, null, 2), contentType: 'application/json' });
  for (const k of ['frame', 'panel', 'stem', 'blob', 'flame', 'reg', 'starL', 'starM', 'starR']) expect(iou[k], k).toBeGreaterThanOrEqual(0.97);
  expect(errors).toEqual([]);
});

test('Startbild (?splash=launchframe): Stamm-Streifen und "0%" stehen still', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?splash=launchframe');
  const splash = page.getByTestId('splash');
  await expect(splash).toHaveAttribute('data-progress', '0');
  await page.waitForTimeout(1500);
  await expect(splash).toHaveAttribute('data-progress', '0');
  expect(errors).toEqual([]);
});
