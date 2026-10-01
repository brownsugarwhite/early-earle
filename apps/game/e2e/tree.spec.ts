import { test, expect, type Page } from '@playwright/test';

// Giant tree lab smoke test (v3). Runs on the WebGL2 fallback (SwiftShader) like the others.

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

function count(text: string | null, label: string): number {
  const m = text?.match(new RegExp(`${label} ([\\d.]+)(k?)`));
  if (!m) return -1;
  return Math.round(Number(m[1]) * (m[2] === 'k' ? 1000 : 1));
}

test('/lab/tree builds wood, jewel domes, lace, needles, blossoms and the path, stays under 25 draw calls and reacts to the controls', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.goto('/lab/tree');
  await waitForRenderer(page);
  const info = page.getByTestId('tree-lab-info');
  await expect(info).toContainText(/Kuppeln \d+/, { timeout: 60_000 });
  const text = await info.textContent();
  // v4: a pile of a few large overlapping jewel domes (Ebene 32 / image 02, ~25 instead of ~65), fountain limbs with a
  // lace of twigs and golden needle stars (image 04)
  expect(count(text, 'Kuppeln')).toBeGreaterThanOrEqual(18);
  expect(count(text, 'Kuppeln')).toBeLessThanOrEqual(34);
  expect(count(text, 'Cluster')).toBeGreaterThanOrEqual(14);
  expect(count(text, 'Punkte')).toBeGreaterThan(5_000);
  expect(count(text, 'Zweige')).toBeGreaterThan(1_500);
  expect(count(text, 'Sterne')).toBeGreaterThan(400);
  expect(count(text, 'Blüten')).toBeGreaterThan(80);
  expect(count(text, 'Blüten')).toBeLessThan(400);
  expect(count(text, 'Äste')).toBeGreaterThan(25);
  expect(count(text, 'Knoten')).toBe(24);

  // draw-call budget (incl. shadow pass): ≤ 25
  await expect
    .poll(async () => Number((await info.textContent())?.match(/(\d+) dc/)?.[1] ?? 999), { timeout: 60_000 })
    .toBeLessThanOrEqual(25);
  await expect.poll(async () => Number((await info.textContent())?.match(/(\d+) dc/)?.[1] ?? 0), { timeout: 30_000 }).toBeGreaterThan(8);

  // blossoms off → counter 0; colour modes, bark style, stage, snow, bloom, growth, sun
  await page.getByTestId('tgl-blossoms').click();
  await expect(info).toContainText('Blüten 0', { timeout: 10_000 });
  await page.getByTestId('tgl-blossoms').click();
  await expect(info).not.toContainText('Blüten 0', { timeout: 10_000 });
  await page.getByTestId('sel-family').selectOption('blue');
  await page.getByTestId('sel-bark').selectOption('jewel');
  await page.getByTestId('sel-stage').selectOption('huegel');
  await expect(info).toContainText(/Kuppeln \d+/, { timeout: 60_000 });
  await page.getByTestId('rng-snow').fill('0.3');
  await page.getByTestId('rng-bloom').fill('0');
  await page.getByTestId('rng-growth').fill('0.5');
  await page.getByTestId('rng-sun').fill('14');

  // views and the camera ride along the rail (the ride counts up)
  for (const v of ['trunk', 'canopy', 'blossoms', 'far']) await page.getByTestId(`view-${v}`).click();
  await page.getByTestId('btn-ride').click();
  await expect(info).toContainText(/Fahrt [1-9]\d* %/, { timeout: 30_000 });
  await page.getByTestId('btn-ride').click();

  // Mobil rebuilds the tree with less lace, fewer needles and rim dots
  const twigsHigh = count(await info.textContent(), 'Zweige');
  await page.getByTestId('sel-quality').selectOption('mobil');
  await expect.poll(async () => count(await info.textContent(), 'Zweige'), { timeout: 60_000 }).toBeLessThan(twigsHigh);
  await expect(info).toContainText('Mobil');
  expect(errors).toEqual([]);
});

test('/lab/tree?view=path rides the rail: nodes lie on bark, limb and domes', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await page.goto('/lab/tree?view=path&t=0.2&ui=0');
  await waitForRenderer(page);
  const info = page.getByTestId('tree-lab-info');
  await expect(info).toContainText(/Knoten 24/, { timeout: 60_000 });
  // the ride advances and the rail camera follows it
  await expect.poll(async () => Number((await info.textContent())?.match(/Fahrt (\d+) %/)?.[1] ?? 0), { timeout: 30_000 }).toBeGreaterThan(20);
  expect(errors).toEqual([]);
});
