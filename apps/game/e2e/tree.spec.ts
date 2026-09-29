import { test, expect, type Page } from '@playwright/test';

// P2d Baum-Lab smoke test. Runs on the WebGL2 fallback (SwiftShader) like the others.

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

test('/lab/tree baut Stamm, Krone, Blüten und Pfad, bleibt unter 25 Draw Calls und reagiert auf die Regler', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await page.goto('/lab/tree');
  await waitForRenderer(page);
  const info = page.getByTestId('tree-lab-info');
  await expect(info).toContainText(/Kuppeln \d+/, { timeout: 30_000 });
  const text = await info.textContent();
  const clusters = count(text, 'Cluster');
  expect(clusters).toBeGreaterThanOrEqual(20);
  expect(clusters).toBeLessThanOrEqual(40);
  expect(count(text, 'Kuppeln')).toBeGreaterThan(clusters);
  // Pass 2 (Art-Direction): Blüten als Akzente (≈ 220), Punkte dicht am Rand, Sterne nur an kahlen Zweigen
  expect(count(text, 'Blüten')).toBeGreaterThan(100);
  expect(count(text, 'Blüten')).toBeLessThan(400);
  expect(count(text, 'Punkte')).toBeGreaterThan(10_000);
  expect(count(text, 'Sterne')).toBeGreaterThan(15);
  expect(count(text, 'Äste')).toBeGreaterThan(100);
  expect(count(text, 'Knoten')).toBe(24);
  // Kronenmotive klein und spärlich (≤ 20 % von Pass 1 = 934), dazu Millefleurs am Boden
  const motifs = text?.match(/Motive (\d+)\+(\d+)/);
  expect(Number(motifs?.[1] ?? 999)).toBeLessThanOrEqual(187);
  expect(Number(motifs?.[2] ?? 0)).toBeGreaterThan(0);

  // Draw-Call-Budget (inkl. Schattenpass): ≤ 25
  await expect
    .poll(async () => Number((await info.textContent())?.match(/(\d+) dc/)?.[1] ?? 999), { timeout: 60_000 })
    .toBeLessThanOrEqual(25);
  await expect.poll(async () => Number((await info.textContent())?.match(/(\d+) dc/)?.[1] ?? 0), { timeout: 30_000 }).toBeGreaterThan(8);

  // Blüten aus → Zähler 0; Familie Juwelen; Blütezeit auf Knospen
  await page.getByTestId('tgl-blossoms').click();
  await expect(info).toContainText('Blüten 0', { timeout: 10_000 });
  await page.getByTestId('tgl-blossoms').click();
  await expect(info).not.toContainText('Blüten 0', { timeout: 10_000 });
  await page.getByTestId('sel-family').selectOption('jewel');
  await page.getByTestId('rng-bloom').fill('0');
  await page.getByTestId('rng-growth').fill('0.5');
  await page.getByTestId('rng-sun').fill('14');

  // Ansichten und Kamerafahrt (die Fahrt zählt hoch)
  for (const v of ['trunk', 'canopy', 'blossoms', 'far']) await page.getByTestId(`view-${v}`).click();
  await page.getByTestId('btn-ride').click();
  await expect(info).toContainText(/Fahrt [1-9]\d* %/, { timeout: 30_000 });
  await page.getByTestId('btn-ride').click();

  // Mobil-Preset baut den Baum neu (weniger Punkte)
  const dotsHigh = count(await info.textContent(), 'Punkte');
  await page.getByTestId('sel-quality').selectOption('mobil');
  await expect.poll(async () => count(await info.textContent(), 'Punkte'), { timeout: 30_000 }).toBeLessThan(dotsHigh);
  await expect(info).toContainText('Mobil');
  expect(errors).toEqual([]);
});
