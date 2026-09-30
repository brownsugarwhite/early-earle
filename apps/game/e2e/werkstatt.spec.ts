import { test, expect, type CDPSession, type Page } from '@playwright/test';

// Werkstatt + mobile lab chrome: the way from the game into the labs/editors and back, the lab bottom sheet
// (zu · halb · voll, the stage never covered), the desktop side panel and saving without the Mac (local + share).
// Runs on the WebGL2 fallback (SwiftShader) like the others; nothing here writes into content/.

const PHONE = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const TRANSITION_MS = process.env.CI ? 90_000 : 45_000;
test.setTimeout(process.env.CI ? 300_000 : 180_000);

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** Real one-finger touch drag via CDP, like on the iPhone. */
async function touchDrag(cdp: CDPSession, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** The stage (canvas + overlays) ends where the sheet begins: the settings never hang over the view. */
async function expectStageFree(page: Page): Promise<void> {
  const stage = (await page.getByTestId('lab-stage').boundingBox())!;
  const sheet = await page.getByTestId('lab-sheet').boundingBox();
  if (sheet) expect(stage.y + stage.height).toBeLessThanOrEqual(sheet.y + 1);
  const canvas = await page.locator('[data-testid="lab-stage"] canvas').first().boundingBox();
  if (canvas && sheet) expect(canvas.y + canvas.height).toBeLessThanOrEqual(sheet.y + 1);
}

/**
 * Waits until the sheet's top edge sits at its snap point: `halb` = 46 % of the frame (max 520 px) from the bottom,
 * `voll` = the header's bottom. The height transition runs on the main thread, which is slow under SwiftShader —
 * "not moving for a moment" is not enough there.
 */
async function sheetAt(page: Page, state: 'halb' | 'voll'): Promise<void> {
  const target = await page.evaluate((s) => {
    const frame = document.querySelector('[data-testid="lab-frame"]')!.getBoundingClientRect();
    if (s === 'voll') return document.querySelector('.lab-header')!.getBoundingClientRect().bottom;
    return frame.bottom - Math.min(frame.height * 0.46, 520);
  }, state);
  await expect.poll(async () => Math.abs(((await page.getByTestId('lab-sheet').boundingBox())?.y ?? -100) - target), { timeout: 15_000 }).toBeLessThan(3);
}

/** Without the Mac: every request to the content endpoint fails like an unreachable LAN address. */
async function blockContent(page: Page): Promise<void> {
  await page.route('**/__content/**', (r) => r.abort());
  await page.route('**/__content', (r) => r.abort());
}

test.describe('iPhone 393×852', () => {
  test.use(PHONE);

  test('Spiel → Werkstatt (Schraubenschlüssel auf der Map) → Lab → zurück in die Werkstatt → zurück ins Spiel', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/play');
    await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
    await page.getByTestId('werkstatt-btn').tap();
    await expect(page).toHaveURL(/\/werkstatt$/);
    await expect(page.getByTestId('werkstatt')).toBeVisible();
    // 3 editors + 9 labs, German names, all within the phone width.
    await expect(page.locator('.ws-tile')).toHaveCount(12);
    await expect(page.getByTestId('ws-map-editor')).toContainText('Map-Editor');
    await expect(page.getByTestId('ws-earle-lab')).toContainText('Zehn Welten auf dem Planeten');
    expect(await page.evaluate(() => document.querySelector('.ws-scroll')!.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    // Dev server = same origin: saves go straight into the repo on the Mac.
    await expect(page.getByTestId('werkstatt-connection-title')).toHaveText('Speichert direkt auf dem Mac', { timeout: 10_000 });

    await page.getByTestId('ws-spielfeld-lab').tap();
    await expect(page).toHaveURL(/\/lab\/grid$/);
    await expect(page.getByTestId('lab-frame')).toBeVisible();
    await page.getByTestId('lab-back').tap();
    await expect(page).toHaveURL(/\/werkstatt$/);
    await page.getByTestId('werkstatt-game').tap();
    await expect(page).toHaveURL(/\/play$/);
    await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
    expect(errors).toEqual([]);
  });

  test('Lab-Sheet: zu (Standard) → halb (Tippen) → voll (Ziehen) → zu; die Bühne wird nie verdeckt', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/lab/grid');
    const frame = page.getByTestId('lab-frame');
    await expect(frame).toHaveAttribute('data-layout', 'sheet');
    await expect(frame).toHaveAttribute('data-sheet', 'zu');
    await expect(page.locator('canvas')).toBeVisible();
    await expectStageFree(page);
    // Closed: the quick actions stay, the settings are out of the way.
    await expect(page.getByTestId('grid-restart')).toBeVisible();
    await expect(page.getByTestId('grid-level-select')).toBeHidden();
    const stageClosed = (await page.getByTestId('lab-stage').boundingBox())!.height;
    expect(stageClosed).toBeGreaterThan(852 - 120);

    await page.getByTestId('lab-sheet-toggle').tap();
    await expect(frame).toHaveAttribute('data-sheet', 'halb');
    await expect(page.getByTestId('grid-level-select')).toBeVisible();
    await sheetAt(page, 'halb');
    await expectStageFree(page);
    const stageHalf = (await page.getByTestId('lab-stage').boundingBox())!.height;
    expect(stageHalf).toBeGreaterThan(852 * 0.5);
    expect(stageHalf).toBeLessThan(stageClosed);

    // Drag the grab handle up: full sheet; the header (way back, perf badge) stays above it.
    const cdp = await page.context().newCDPSession(page);
    const handle = (await page.getByTestId('lab-sheet-handle').boundingBox())!;
    await touchDrag(cdp, { x: handle.x + handle.width / 2, y: handle.y + 10 }, { x: handle.x + handle.width / 2, y: 90 }, 14);
    await expect(frame).toHaveAttribute('data-sheet', 'voll');
    await sheetAt(page, 'voll');
    const back = (await page.getByTestId('lab-back').boundingBox())!;
    expect((await page.getByTestId('lab-sheet').boundingBox())!.y).toBeGreaterThanOrEqual(back.y + back.height - 1);
    await expect(page.getByTestId('lab-back')).toBeVisible();

    // Drag down again → closed; a tap on the handle opens half.
    const handle2 = (await page.getByTestId('lab-sheet-handle').boundingBox())!;
    await touchDrag(cdp, { x: handle2.x + handle2.width / 2, y: handle2.y + 10 }, { x: handle2.x + handle2.width / 2, y: 840 }, 14);
    await expect(frame).toHaveAttribute('data-sheet', 'zu');
    await page.getByTestId('lab-sheet-handle').tap();
    await expect(frame).toHaveAttribute('data-sheet', 'halb');
    expect(errors).toEqual([]);
  });

  test('Alle Labs: Regler geschlossen, Bühne frei, Werkstatt und Spiel erreichbar', async ({ page }) => {
    for (const route of ['/lab/earle', '/lab/tree', '/lab/shadow', '/lab/landmarks', '/lab/creature', '/lab/blob', '/lab/rex']) {
      await page.goto(route);
      await expect(page.getByTestId('lab-frame'), route).toHaveAttribute('data-sheet', 'zu');
      await expect(page.getByTestId('lab-back'), route).toBeVisible();
      await expect(page.getByTestId('lab-game'), route).toBeVisible();
      await expect(page.getByTestId('perf-badge'), route).toBeVisible();
      await expectStageFree(page);
      // The header is one row, no horizontal overflow.
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBeLessThanOrEqual(0);
    }
    // The audio lab is a page: it scrolls in its own box (the iOS web view does not scroll the document).
    await page.goto('/lab/audio');
    await expect(page.getByTestId('audio-lab')).toBeVisible();
    const scrolled = await page.evaluate(() => {
      const box = document.querySelector('.page-scroll')!;
      box.scrollTop = 600;
      return box.scrollTop;
    });
    expect(scrolled).toBeGreaterThan(0);
    await expect(page.getByTestId('lab-back')).toBeAttached();
  });

  test('Level-Editor ohne Mac: lokal sichern, der Stand bleibt nach dem Neuladen', async ({ page }) => {
    const errors = collectErrors(page);
    await blockContent(page);
    await page.goto('/editor/levels?file=003.json');
    await expect(page.getByTestId('editor-levels')).toHaveAttribute('data-endpoint', 'offline', { timeout: 15_000 });
    await expect(page.getByTestId('board')).toBeVisible();
    await page.getByTestId('recent-void').tap();
    await page.getByTestId('cell-0-0').tap();
    await expect(page.getByTestId('cell-0-0')).toHaveAttribute('data-mask', '#');
    await expect(page.getByTestId('save-btn')).toHaveAttribute('data-target', 'lokal');
    await page.getByTestId('save-btn').tap();
    await expect(page.getByTestId('toast')).toContainText('Lokal gespeichert');
    await expect(page.getByTestId('dirty-dot')).toHaveAttribute('data-dirty', 'false');
    await expect(page.getByTestId('dirty-dot')).toContainText('Lokal gespeichert');
    const stored = await page.evaluate(() => localStorage.getItem('ee.content.local.levels/003.json'));
    expect((JSON.parse(stored!) as { json: { grid: { mask: string[] } } }).json.grid.mask[0]).toBe('#...');
    // Still without the Mac after a reload: the local state is the saved state.
    await page.reload();
    await expect(page.getByTestId('cell-0-0')).toHaveAttribute('data-mask', '#', { timeout: 15_000 });
    await expect(page.getByTestId('dirty-dot')).toHaveAttribute('data-dirty', 'false');
    // The file tab names the target and offers the share sheet.
    await page.getByTestId('tab-datei').tap();
    await expect(page.getByTestId('save-target')).toHaveText('Lokal');
    await expect(page.getByTestId('file-save-btn')).toContainText('Lokal sichern');
    expect(errors).toEqual([]);
  });

  test('Wesen- und Map-Editor ohne Mac: lokal speichern', async ({ page }) => {
    const errors = collectErrors(page);
    await page.addInitScript(() => localStorage.setItem('ee.qualityPref', 'mobil'));
    await blockContent(page);
    await page.goto('/editor/creatures?preview=single');
    await expect(page.getByTestId('editor-creatures')).toBeVisible();
    await expect(page.getByTestId('ed-status')).toContainText('Stand der App', { timeout: 15_000 });
    await expect(page.getByTestId('ed-save')).toContainText('Lokal speichern');
    await page.getByTestId('ed-save').tap();
    await expect(page.getByTestId('ed-toast')).toContainText('Lokal gespeichert');
    expect(await page.evaluate(() => localStorage.getItem('ee.content.local.genome/rules.json') !== null)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

    await page.goto('/editor/map');
    await expect(page.getByTestId('save-target')).toContainText('Lokal', { timeout: 15_000 });
    await expect(page.locator('.map-card')).toHaveCount(10);
    await page.getByTestId('map-file-10').tap();
    await expect(page.getByTestId('map-poster')).toBeVisible();
    await page.getByTestId('map-tab-werte').tap();
    await page.getByTestId('map-num-terrain-amplitude').locator('input').fill('1.5');
    await expect(page.getByTestId('map-save')).toBeEnabled();
    await page.getByTestId('map-save').tap();
    await expect(page.getByTestId('map-toast')).toContainText('Lokal gespeichert');
    const world = await page.evaluate(() => JSON.parse(localStorage.getItem('ee.content.local.zones/worlds/10.json') ?? 'null') as { json: { terrain: { amplitude: number } } } | null);
    expect(world?.json.terrain.amplitude).toBe(1.5);
    expect(errors).toEqual([]);
  });
});

test('Map-Editor mit Mac: Welten und Zonen aus content/zones', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/editor/map');
  await expect(page.getByTestId('save-target')).toContainText('Mac', { timeout: 15_000 });
  await expect(page.locator('.map-card')).toHaveCount(10);
  await page.getByTestId('map-kind-zone').click();
  await expect(page.locator('.map-card')).toHaveCount(4);
  await page.getByTestId('map-file-tjorizo').click();
  await expect(page.getByTestId('map-poster')).toBeVisible();
  await expect(page.getByTestId('map-palette')).toBeVisible();
  await expect(page.getByTestId('map-save')).toBeDisabled(); // nothing changed yet
  expect(errors).toEqual([]);
});

test('Desktop: Regler als Seitenleiste, ausblendbar; die Bühne endet an der Leiste', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/lab/grid');
  const frame = page.getByTestId('lab-frame');
  await expect(frame).toHaveAttribute('data-layout', 'side');
  await expect(page.getByTestId('grid-level-select')).toBeVisible();
  const stage = (await page.getByTestId('lab-stage').boundingBox())!;
  const panel = (await page.getByTestId('lab-sheet').boundingBox())!;
  expect(stage.x + stage.width).toBeLessThanOrEqual(panel.x + 1);
  expect(stage.height).toBeGreaterThan(790);
  await page.getByTestId('lab-sheet-toggle').click();
  await expect(frame).toHaveAttribute('data-panel', 'zu');
  await expect.poll(async () => (await page.getByTestId('lab-stage').boundingBox())!.width).toBeGreaterThan(1270);
  await page.getByTestId('lab-panel-open').click();
  await expect(frame).toHaveAttribute('data-panel', 'offen');
  expect(errors).toEqual([]);
});
