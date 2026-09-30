import { test, expect, type Page } from '@playwright/test';

// Sammlung (Iteration 4): Setzkasten über der Map und "NEU!" beim ersten Wesen einer Art. Läuft wie die Flow-Tests
// auf SwiftShader/WebGL2 (langsam: großzügige Wartezeiten).
const TRANSITION_MS = process.env.CI ? 90_000 : 60_000;
/** Der Anflug ins Level (Board-Pipelines, Plateau-Choreografie) braucht unter SwiftShader am längsten. */
const FLY_IN_MS = 150_000;
test.setTimeout(420_000);

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** Freier Stand: bis Level 31 erreicht, Knoten 4 (Tjorizo), zwei Wesen schon im Kasten (eines ungesehen). */
async function seedProgress(page: Page, collection: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript((col) => {
    localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: 'free', slots: { free: { reached: 30, current: 3, collection: col }, real: {} } }));
  }, collection);
}

const entry = (zone: string, tier: number, species: string, bodyType: string, seed: number, node: number, seen: boolean) => ({
  key: `${zone}:${tier}:${species}`,
  zone,
  tier,
  species,
  bodyType,
  seed,
  levelId: `${zone}-${String(node + 1).padStart(3, '0')}`,
  node,
  at: 1,
  count: 1,
  seen,
  placedOnMap: true,
});

test('Setzkasten: über den Karten-Einstieg öffnen, Zähler, Wesen antippen → Karte, schließen → die Map läuft weiter', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await seedProgress(page, {
    'tjorizo:1:blob': entry('tjorizo', 1, 'blob', 'blob', 38, 0, true),
    'tjorizo:3:blob': entry('tjorizo', 3, 'blob', 'blob', 100, 2, false),
  });
  await page.goto('/play');
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
  // Ungesehene Wesen heben den Einstieg hervor.
  const entryBtn = page.getByTestId('entry-collection');
  await expect(entryBtn).toBeVisible();
  await expect(entryBtn).toHaveAttribute('data-highlight', 'true');
  await entryBtn.click();

  const layer = page.getByTestId('setzkasten');
  await expect(layer).toBeVisible();
  await expect(layer).toHaveAttribute('data-ready', 'true', { timeout: TRANSITION_MS });
  await expect(page.getByTestId('setzkasten-count')).toHaveText(/^2 \/ 253$/);
  await expect(page.getByTestId('setzkasten-tab-tjorizo')).toHaveAttribute('data-active', 'true');
  // Die Map schläft: Enter fliegt nicht ins Level.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  await expect(hud).toHaveAttribute('data-flow-state', 'map');

  // Ein erspieltes Wesen antippen: Karte mit Art, Wert, Fundlevel.
  const point = await page.evaluate(() => (window as unknown as { __ee: { setzkasten: { screenPoint(k: string): { x: number; y: number } | null } } }).__ee.setzkasten.screenPoint('tjorizo:1:blob'));
  expect(point).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
  const card = page.getByTestId('setzkasten-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Blob');
  await expect(card).toContainText('2');
  await expect(card).toContainText('gefunden in Level 1');
  await expect(card).toHaveAttribute('data-earned', 'true');
  // Budget: höchstens 36 Wesen in Sicht, 12 davon lebendig, 45 Draw Calls (Szene; der Ausgabe-Pass kommt dazu).
  const stats = await page.evaluate(() => (window as unknown as { __ee: { setzkasten: { stats: { members: number; alive: number; drawCalls: number } } } }).__ee.setzkasten.stats);
  expect(stats.members).toBeGreaterThan(0);
  expect(stats.members).toBeLessThanOrEqual(36);
  expect(stats.alive).toBeLessThanOrEqual(12);
  expect(stats.drawCalls).toBeLessThanOrEqual(44);
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);

  // Eine ferne Zone liegt unter dem Deckel.
  await page.getByTestId('setzkasten-tab-luzz').click();
  await expect(page.getByTestId('setzkasten-lid')).toContainText('ab Level 51');
  await page.getByTestId('setzkasten-tab-tjorizo').click();

  // Schließen: die Map läuft weiter (die Szene zählt wieder Zeit), der Einstieg ist nicht mehr hervorgehoben.
  await page.getByTestId('setzkasten-close').click();
  await expect(layer).toHaveCount(0, { timeout: 10_000 });
  await expect(hud).toHaveAttribute('data-flow-state', 'map');
  await expect(entryBtn).toHaveAttribute('data-highlight', 'false', { timeout: 10_000 });
  const elapsed = () => page.evaluate(() => (window as unknown as { __ee: { controller: { elapsed: number } } }).__ee.controller.elapsed);
  const t0 = await elapsed();
  await expect.poll(elapsed, { timeout: 30_000 }).toBeGreaterThan(t0);
  expect(errors).toEqual([]);
});

test('NEU!: das erste Wesen seiner Art im Level wird gestempelt und landet im Setzkasten', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.addInitScript(() => {
    localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: 'free', slots: { free: { reached: 0, current: 0, seen: { intro: true, stories: ['afterLevel1'] } }, real: {} } }));
  });
  await page.goto('/play');
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
  await page.getByTestId('play-btn').click();
  await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: FLY_IN_MS });
  await page.waitForTimeout(2500);
  // Wischen, bis etwas verschmilzt (der Stempel zählt mit) oder das Level endet.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][i % 4]!);
    await page.waitForTimeout(1400);
    const stamps = await page.evaluate(() => ((window as unknown as { __ee: { stamps?: number } }).__ee.stamps ?? 0));
    if (stamps > 0) break;
  }
  await expect.poll(() => page.evaluate(() => ((window as unknown as { __ee: { stamps?: number } }).__ee.stamps ?? 0)), { timeout: 20_000 }).toBeGreaterThan(0);
  const keys = await page.evaluate(() => Object.keys((JSON.parse(localStorage.getItem('ee.progress.v2') ?? '{}') as { slots: { free: { collection?: Record<string, unknown> } } }).slots.free.collection ?? {}));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k).toMatch(/^tjorizo:\d+:(blob|snake|retriever|mouse|giraffe|rex|duck|elephant)$/);
  expect(errors).toEqual([]);
});
