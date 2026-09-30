import { test, expect, type Page } from '@playwright/test';

// Welt 13 (Roter Monolith, Ebene 45) und Welt 14 (Stille Bucht, Ebene 29) auf der echten GPU (Mac, Metal): die
// Kompositionen im Earle-Lab quer auf Hoch und hoch auf Mobil, dazu die Karte an ihren (künftigen) Knoten. Monolith-,
// Wolkenbank-, Pferde-, Meeres- und Windbaum-Shader kompilieren ohne WGSL-/Pipeline-Fehler, und jede Welt zeigt ihre
// Elemente. Auf CI übersprungen (keine GPU), ebenso ohne WebGPU-Adapter.

test.skip(!!process.env.CI, 'braucht eine echte GPU');
test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });
test.setTimeout(240_000);

const GPU_ERROR = /WGSL|ShaderModule|pipeline creation failed|Invalid RenderPipeline|unresolved value|Invalid (BindGroup|Buffer|Texture)/i;

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && GPU_ERROR.test(m.text())) errors.push(m.text().slice(0, 600));
  });
  return errors;
}

async function requireWebGPU(page: Page): Promise<void> {
  const ok = await page.evaluate(async () => {
    try {
      const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      return !!gpu && !!(await gpu.requestAdapter());
    } catch {
      return false;
    }
  });
  test.skip(!ok, 'kein WebGPU-Adapter');
}

interface PlanetLike {
  horses?: { mesh?: { count: number } };
  vegetation?: { trees?: { wind?: { count: number } } };
  water?: unknown;
}

/** Was eine Welt zeigt (Lab): Pferde, Windbäume, Wolken-Meshes, Wasser. */
function labState(page: Page): Promise<{ horses: number; wind: number; clouds: number; water: boolean }> {
  return page.evaluate(() => {
    const lab = (window as unknown as { __earleLab?: { world?: PlanetLike; clouds?: { visibleMeshes: number } } }).__earleLab;
    const w = lab?.world;
    return { horses: w?.horses?.mesh?.count ?? -1, wind: w?.vegetation?.trees?.wind?.count ?? -1, clouds: lab?.clouds?.visibleMeshes ?? -1, water: !!w?.water };
  });
}

test('Welten 13 und 14 im Earle-Lab: Kompositionen quer (Hoch) und hoch (Mobil), ohne GPU-Fehler', async ({ page }) => {
  const errors = collectErrors(page);
  const cases: Array<{ w: number; h: number; quality: string }> = [
    { w: 1200, h: 760, quality: 'hoch' },
    { w: 390, h: 844, quality: 'mobil' },
  ];
  for (const c of cases) {
    await page.setViewportSize({ width: c.w, height: c.h });
    // Welt 13: Monolith mit sieben Pferden am Plateau, Wolkenbänke am Himmel
    await page.goto(`/lab/earle?world=13&p=1&quality=${c.quality}`);
    await requireWebGPU(page);
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    await expect.poll(async () => (await labState(page)).horses, { timeout: 60_000 }).toBe(7);
    await expect.poll(async () => (await labState(page)).clouds, { timeout: 30_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(2500);
    // Welt 14: Meer an der Landzunge, Windbäume auf dem Grat, ferne Landzunge als Himmelsschicht
    await page.goto(`/lab/earle?world=14&p=1&quality=${c.quality}`);
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    await expect.poll(async () => (await labState(page)).wind, { timeout: 60_000 }).toBeGreaterThan(0);
    const s = await labState(page);
    expect(s.water).toBe(true);
    expect(s.clouds).toBeGreaterThan(0);
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});

test('Karte an den Knoten der Welten 13 und 14 (Handy): Monolith, Meer und Windbäume ohne GPU-Fehler', async ({ page }) => {
  const errors = collectErrors(page);
  // Freier Modus, Level 100 erreicht: die Welten 13 und 14 liegen dahinter (gesperrt, aber auf der Karte)
  await page.addInitScript(() => {
    const slot = { reached: 99, current: 99, levels: {}, collection: {}, seen: { intro: true, stories: ['afterLevel1'] } };
    localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: 'free', slots: { free: slot, real: slot } }));
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/play');
  await requireWebGPU(page);
  await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'map', { timeout: 60_000 });
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  type Flow = { goToNode(i: number): void; world(): { world?: PlanetLike } | null };
  const planet = () =>
    page.evaluate(() => {
      const w = (window as unknown as { __flow: Flow }).__flow.world()?.world;
      return { horses: w?.horses?.mesh?.count ?? -1, wind: w?.vegetation?.trees?.wind?.count ?? -1, water: !!w?.water };
    });
  await page.evaluate(() => (window as unknown as { __flow: Flow }).__flow.goToNode(104));
  await expect.poll(async () => (await planet()).horses, { timeout: 60_000 }).toBe(7);
  await page.waitForTimeout(2000);
  await page.evaluate(() => (window as unknown as { __flow: Flow }).__flow.goToNode(114));
  await expect.poll(async () => (await planet()).wind, { timeout: 60_000 }).toBeGreaterThan(0);
  expect((await planet()).water).toBe(true);
  await page.waitForTimeout(2500);
  expect(errors).toEqual([]);
});
