import { test, expect, type Page } from '@playwright/test';

// Real-GPU WebGPU check (Mac, Metal): every shader module and render pipeline must compile. The other e2e tests
// run on SwiftShader/WebGL2 and never see WGSL — a WGSL error drops whole render passes (the plateau and the
// creature bodies vanished once while WebGL2 looked fine). Skipped on CI runners (no GPU) and wherever the
// browser offers no WebGPU adapter.

test.skip(!!process.env.CI, 'braucht eine echte GPU');
test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });
test.setTimeout(120_000);

const GPU_ERROR = /WGSL|ShaderModule|pipeline creation failed|Invalid RenderPipeline|unresolved value|Invalid (BindGroup|Buffer|Texture)/i;

function collectGpuErrors(page: Page): string[] {
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

test('Flow auf WebGPU: Map, Anflug, Level 1 mit Merges — alle Pipelines kompilieren', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/play');
  await requireWebGPU(page);
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: 30_000 });
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  await page.getByTestId('play-btn').click();
  await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: 30_000 });
  await page.waitForTimeout(2500);
  // Level 1 (2, 2, 4, 4 → 8): merges, the leap, the depart back to the map — each builds new pipelines.
  // Keep swiping (the store queues one move) until the flow leaves the level, like the flow smoke test.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(900);
    const state = await hud.getAttribute('data-flow-state');
    if (state === 'depart' || state === 'map') break;
  }
  await expect(hud).toHaveAttribute('data-flow-state', /depart|map/, { timeout: 20_000 });
  await page.waitForTimeout(2500);
  expect(errors).toEqual([]);
});

test('Herde auf WebGPU: 21 Arten (Mesh-Körper, Fell, Federn) kompilieren', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto('/lab/grid');
  await requireWebGPU(page);
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  await page.getByTestId('grid-level-select').selectOption('-3');
  await page.waitForTimeout(4000);
  for (const key of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('Earle-Welten auf WebGPU: Wasser, Felsen, Scheune, Schneefelder und -wehen kompilieren', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 900, height: 700 });
  // Welten mit Geländemerkmalen: Fluss + Seen (02), Felsstufen + Wand (04), Eis + Tafelfels + Wehen (05),
  // Schneefelder + Wand (06), Scheune (08), Turm (09); Riesenstämme mit Leucht- (07) und Glasfenster-Rinde (10)
  for (const world of [2, 4, 5, 6, 7, 8, 9, 10]) {
    await page.goto(`/lab/earle?world=${world}&progress=100`);
    if (world === 2) {
      await requireWebGPU(page);
      await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    }
    await page.waitForTimeout(2500);
  }
  expect(errors).toEqual([]);
});

test('Riesenbaum im Flow auf WebGPU: Baumpilze, Blütensteine, Schiene, Anflug auf Wurzelterrasse und Krone', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  // Level 104 (Rinde → Wurzelterrasse) und 110 (Krone): Pilze, Steine, Punkte und Ring am Baum, Schattenwert der Punkte
  // (Route 15 + 1: Baum 99–114). Solange die Leveldateien 101–184 fehlen, klemmt der Flow auf das letzte spielbare
  // Level (100, am Stammfuß) — der Test prüft dann dort.
  for (const node of [103, 109]) {
    await page.addInitScript((n) => localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: 'free', slots: { free: { reached: n, current: n }, real: {} } })), node);
    await page.goto('/play');
    if (node === 103) await requireWebGPU(page);
    const hud = page.getByTestId('flow-hud');
    await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: 30_000 });
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    await page.waitForTimeout(2500);
    await page.getByTestId('play-btn').click();
    await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: 30_000 });
    await page.waitForTimeout(2000);
  }
  expect(errors).toEqual([]);
});

test('Sammlung auf WebGPU: Setzkasten (Arten, Fell, Federn, Silhouetten, Deckel) und Wesen auf der Map kompilieren', async ({ page }) => {
  const errors = collectGpuErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  // Freier Stand an Knoten 31 (Syrup) mit Wesen jeder Art (die Art ist erzwungen, der Seed beliebig).
  await page.addInitScript(() => {
    const looks: Array<[string, number, string, string]> = [
      ['syrup', 1, 'blob', 'blob'],
      ['syrup', 5, 'retriever', 'quadruped'],
      ['syrup', 5, 'mouse', 'quadruped'],
      ['syrup', 6, 'giraffe', 'quadruped'],
      ['syrup', 6, 'rex', 'biped'],
      ['syrup', 6, 'duck', 'biped'],
      ['syrup', 7, 'elephant', 'heavy'],
      ['syrup', 7, 'snake', 'snake'],
      ['syrup', 9, 'blob', 'blob'],
      ['tjorizo', 4, 'blob', 'blob'],
    ];
    const collection: Record<string, unknown> = {};
    looks.forEach(([zone, tier, species, bodyType], i) => {
      const key = `${zone}:${tier}:${species}`;
      const node = zone === 'syrup' ? 28 + (i % 5) : 3;
      collection[key] = { key, zone, tier, species, bodyType, seed: 1000 + i * 31, levelId: `${zone}-0${node + 1}`, node, at: 1, count: 1, seen: i % 2 === 0, placedOnMap: true };
    });
    localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: 'free', slots: { free: { reached: 30, current: 30, collection }, real: {} } }));
  });
  await page.goto('/play?mapCreatures=demo');
  await requireWebGPU(page);
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: 30_000 });
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
  // Die Wesen der Sammlung wohnen an ihren Fundknoten: ein paar leben am Blickpunkt, die Füße auf dem Boden.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ee: { mapCreatures?: { creatures: { liveCount: number } } } }).__ee.mapCreatures?.creatures.liveCount ?? 0), { timeout: 20_000 }).toBeGreaterThan(2);
  await page.waitForTimeout(2500);
  const feet = await page.evaluate(() => {
    const probe = (window as unknown as { __ee: { mapCreatures: { creatures: { probe(): Array<{ live: boolean; contact: { distanceTo(v: unknown): number } | null; ground: unknown }> } } } }).__ee.mapCreatures.creatures.probe();
    return probe.filter((p) => p.live).map((p) => p.contact!.distanceTo(p.ground));
  });
  expect(feet.length).toBeGreaterThan(2);
  for (const d of feet) expect(d).toBeLessThan(0.02);
  // Aufbruch und Einfallen am aktuellen Knoten.
  await page.evaluate(() => {
    const d = (window as unknown as { __ee: { mapCreatures: { release(): number; drop(): void } } }).__ee.mapCreatures;
    d.release();
    d.drop();
  });
  await page.waitForTimeout(2500);
  // Setzkasten: Syrup (Arten mit Fell und Federn), Tjorizo, der Deckel über Luzz.
  await page.getByTestId('entry-collection').click();
  await expect(page.getByTestId('setzkasten')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  await page.waitForTimeout(2000);
  for (const zone of ['tjorizo', 'luzz', 'syrup']) {
    await page.getByTestId(`setzkasten-tab-${zone}`).click();
    await page.waitForTimeout(1500);
  }
  await page.getByTestId('setzkasten-close').click();
  await expect(page.getByTestId('setzkasten')).toHaveCount(0, { timeout: 10_000 });
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});
