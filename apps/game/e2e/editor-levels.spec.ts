import { test, expect, type CDPSession, type Page } from '@playwright/test';

// Level-Editor v2 (iPhone zuerst): läuft wie die Smoke-Tests auf dem WebGL2-Fallback (SwiftShader).
// Schreibt nur die _-Datei `_draft-e2e.json` (löschbar über DELETE) und räumt sie hinterher weg.

const DRAFT_FILE = '_draft-e2e.json';
const PHONE = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** localStorage nur beim ersten Laden leeren (nach dem Sichern lädt Vite neu, der Editor soll seine Sitzung behalten). */
async function freshStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('e2e-editor')) {
        localStorage.clear();
        sessionStorage.setItem('e2e-editor', '1');
      }
    } catch {
      /* ignorieren */
    }
  });
}

// Level 7 „Um die Ecke“ (5×5, Pfeiler [2,1], 34 Züge) bleibt unverändert, seit die Tutorial-Level 1–6 kleine Bretter sind.
async function openLevel7(page: Page): Promise<void> {
  await page.goto('/editor/levels?file=007.json');
  await expect(page.getByTestId('editor-top')).toBeVisible();
  await expect(page.getByTestId('editor-levels')).toHaveAttribute('data-endpoint', 'ok', { timeout: 15_000 });
  await expect(page.getByTestId('level-button')).toHaveAttribute('aria-label', /007\.json/, { timeout: 15_000 });
  await expect(page.getByTestId('board')).toBeVisible();
}

const center = async (page: Page, testId: string) => {
  const b = (await page.getByTestId(testId).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

/** Echte Touch-Ereignisse (ein Finger) über CDP — wie auf dem iPhone. */
async function touchDrag(cdp: CDPSession, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function longPress(page: Page, cdp: CDPSession, at: { x: number; y: number }): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y, id: 1 }] });
  await page.waitForTimeout(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function listFiles(request: import('@playwright/test').APIRequestContext): Promise<string[]> {
  return ((await (await request.get('/__content/levels')).json()) as { files: string[] }).files;
}

test.afterAll(async ({ request }) => {
  await request.delete(`/__content/levels/${DRAFT_FILE}`).catch(() => undefined);
});

test.describe('iPhone 393×852', () => {
  test.use(PHONE);

  test('malen, Langdruck-Menü, Testen und zurück, Kette, als _-Entwurf sichern und löschen', async ({ page, request }) => {
    const errors = collectErrors(page);
    await request.delete(`/__content/levels/${DRAFT_FILE}`).catch(() => undefined);
    await freshStorage(page);
    await openLevel7(page);
    const cdp = await page.context().newCDPSession(page);

    // Werkzeug „Riss“ aus der Zuletzt-Reihe; ein Tipp macht [0,0] zum Riss.
    await expect(page.getByTestId('board').locator('[data-cell]')).toHaveCount(25);
    await page.getByTestId('recent-void').tap();
    await expect(page.getByTestId('dock-tool')).toHaveAttribute('data-tool', 'void');
    await page.getByTestId('cell-0-0').tap();
    await expect(page.getByTestId('cell-0-0')).toHaveAttribute('data-mask', '#');
    await expect(page.getByTestId('dirty-dot')).toHaveAttribute('data-dirty', 'true');
    await expect(page.getByTestId('save-btn')).toHaveAttribute('data-state', 'dirty');
    await expect(page.getByTestId('validation')).toHaveAttribute('data-ok', 'true');

    // Ziehen malt: Zeile 2 von [0,2] bis [2,2] — ein einziger Undo-Schritt.
    await touchDrag(cdp, await center(page, 'cell-0-2'), await center(page, 'cell-2-2'));
    for (const x of [0, 1, 2]) await expect(page.getByTestId(`cell-${x}-2`)).toHaveAttribute('data-mask', '#');
    await expect(page.getByTestId('cell-3-2')).toHaveAttribute('data-mask', '.');
    await page.getByTestId('undo-btn').tap();
    await expect(page.getByTestId('cell-0-2')).toHaveAttribute('data-mask', '.');
    await expect(page.getByTestId('cell-2-2')).toHaveAttribute('data-mask', '.');
    await page.getByTestId('redo-btn').tap();
    await expect(page.getByTestId('cell-2-2')).toHaveAttribute('data-mask', '#');

    // Nochmal tippen schaltet zurück (Riss → Zelle), Rückgängig holt den Riss wieder.
    await page.getByTestId('cell-0-0').tap();
    await expect(page.getByTestId('cell-0-0')).toHaveAttribute('data-mask', '.');
    await page.getByTestId('undo-btn').tap();
    await expect(page.getByTestId('cell-0-0')).toHaveAttribute('data-mask', '#');

    // Langdruck auf den Start-Blob [4,4] öffnet das Zellmenü; Stufe 3 → 4 (16).
    await longPress(page, cdp, await center(page, 'cell-4-4'));
    const menu = page.getByTestId('cell-menu');
    await expect(menu).toBeVisible();
    await expect(menu).toContainText('Zelle 4,4');
    await expect(page.getByTestId('cell-4-4')).toHaveAttribute('data-selected', 'true');
    await menu.getByRole('button', { name: 'Stufe erhöhen' }).tap();
    await expect(page.getByTestId('cell-blob-tier-value')).toHaveText('16');
    await expect(page.getByTestId('cell-4-4')).toHaveAttribute('aria-label', /Blob 16/);
    await page.getByTestId('cell-menu-close').tap();
    await expect(menu).toHaveCount(0);

    // Ein Ziel über der Kappe ist ein Fehler: Sichern gesperrt, die Liste nennt ihn.
    await page.getByTestId('tab-ziele').tap();
    const cap = page.getByTestId('cap');
    for (let i = 0; i < 9; i++) await cap.getByRole('button', { name: 'Kappe verringern' }).tap();
    await expect(page.getByTestId('cap-value')).toHaveText('3 (8)');
    await expect(page.getByTestId('validation')).toHaveAttribute('data-ok', 'false');
    await expect(page.getByTestId('save-btn')).toBeDisabled();
    await page.getByTestId('validation-summary').tap();
    await expect(page.getByTestId('validation-issues')).toContainText('Kappe muss mindestens die Zielstufe sein');
    await page.getByTestId('validation-summary').tap();
    for (let i = 0; i < 9; i++) await cap.getByRole('button', { name: 'Kappe erhöhen' }).tap();
    await expect(page.getByTestId('validation')).toHaveAttribute('data-ok', 'true');

    // Testen: ein Wisch auf der 3D-Bühne kostet einen Zug; „Bauen“ schaltet zurück, der Entwurf bleibt.
    await page.getByTestId('play-btn').tap();
    await expect(page.getByTestId('preview')).toHaveAttribute('data-mode', 'play');
    await expect(page.getByTestId('hud-moves')).toHaveText('Züge 34');
    const pv = (await page.getByTestId('preview').boundingBox())!;
    const mid = { x: pv.x + pv.width / 2, y: pv.y + pv.height / 2 };
    await touchDrag(cdp, mid, { x: mid.x - 90, y: mid.y }, 6);
    await expect(page.getByTestId('hud-moves')).toHaveText('Züge 33', { timeout: 5_000 });
    await page.getByTestId('edit-btn').tap();
    await expect(page.getByTestId('preview')).toHaveAttribute('data-mode', 'edit');
    await expect(page.getByTestId('cell-0-0')).toHaveAttribute('data-mask', '#');
    // Testen ↔ Bauen erhält das Testspiel, solange der Entwurf gleich bleibt.
    await page.getByTestId('play-btn').tap();
    await expect(page.getByTestId('hud-moves')).toHaveText('Züge 33');
    await page.getByTestId('edit-btn').tap();

    // Kette: alle 184 Level (eine Zeile je Level-Datei) mit Kurve; das offene Level ist markiert.
    await page.getByTestId('level-button').tap();
    await expect(page.getByTestId('tab-kette')).toHaveAttribute('data-active', 'true');
    await expect(page.getByTestId('chain-chart')).toBeVisible();
    await expect(page.getByTestId('chain-list').locator('[data-testid^="chain-row-"]')).toHaveCount(184);
    await expect(page.getByTestId('chain-row-007')).toHaveAttribute('data-current', 'true');

    // Unter neuem Namen sichern (PUT auf eine _-Datei).
    await page.getByTestId('tab-datei').tap();
    await page.getByTestId('file-name').fill(DRAFT_FILE);
    await page.getByTestId('file-save-btn').tap();
    await expect.poll(() => listFiles(request), { timeout: 15_000 }).toContain(DRAFT_FILE);
    const saved = (await (await request.get(`/__content/levels/${DRAFT_FILE}`)).json()) as { id: string; grid: { mask: string[] }; start: { at: number[]; blob: { tier: number } }[] };
    expect(saved.id).toBe('tjorizo-007');
    expect(saved.grid.mask[0]).toBe('#....');
    expect(saved.grid.mask[2]).toBe('###..');
    expect(saved.start.find((s) => s.at[0] === 4 && s.at[1] === 4)?.blob.tier).toBe(4);

    // Vite lädt nach der Dateiänderung neu; der Editor kommt auf derselben Datei zurück, gesichert.
    await expect(page.getByTestId('level-button')).toHaveAttribute('aria-label', new RegExp(DRAFT_FILE.replace('.', '\\.')), { timeout: 20_000 });
    await expect(page.getByTestId('dirty-dot')).toHaveAttribute('data-dirty', 'false', { timeout: 20_000 });

    // Löschen (nur _-Dateien) — mit Bestätigung im Editor statt Browser-Dialog.
    if ((await page.getByTestId('tab-datei').getAttribute('data-active')) !== 'true') await page.getByTestId('tab-datei').tap();
    await page.getByTestId('delete-btn').tap();
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await page.getByTestId('confirm-ok').tap();
    await expect.poll(() => listFiles(request), { timeout: 15_000 }).not.toContain(DRAFT_FILE);
    await expect(page.getByTestId('level-button')).not.toHaveAttribute('aria-label', new RegExp(DRAFT_FILE.replace('.', '\\.')), { timeout: 20_000 });
    expect(errors).toEqual([]);
  });

  test('Zwei Finger zoomen das Brett, ohne etwas zu malen', async ({ page }) => {
    const errors = collectErrors(page);
    await freshStorage(page);
    await openLevel7(page);
    const cdp = await page.context().newCDPSession(page);
    const before = (await page.getByTestId('board').boundingBox())!;
    const c = { x: before.x + before.width / 2, y: before.y + before.height / 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x - 30, y: c.y, id: 1 }, { x: c.x + 30, y: c.y, id: 2 }] });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x - 30 - i * 6, y: c.y, id: 1 }, { x: c.x + 30 + i * 6, y: c.y, id: 2 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const after = (await page.getByTestId('board').boundingBox())!;
    expect(after.width).toBeGreaterThan(before.width * 1.3);
    await expect(page.getByTestId('dirty-dot')).toHaveAttribute('data-dirty', 'false');
    await page.getByRole('button', { name: 'Zoom zurücksetzen' }).tap();
    await expect.poll(async () => Math.round((await page.getByTestId('board').boundingBox())!.width)).toBe(Math.round(before.width));
    expect(errors).toEqual([]);
  });
});

test('Desktop: Solver-Reiter und Chip, ASCII, Testen per Taste', async ({ page }) => {
  const errors = collectErrors(page);
  await freshStorage(page);
  await openLevel7(page);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
  // Level 7 ist kalibriert: der Chip zeigt die Versuche aus _calibration.json im Band.
  await expect(page.getByTestId('solver-chip')).toHaveAttribute('data-verdict', 'ok');

  await page.getByTestId('tab-solver').click();
  await page.getByTestId('solver-seeds').selectOption('10');
  const novice = page.getByTestId('bot-novice');
  if ((await novice.getAttribute('aria-pressed')) !== 'true') await novice.click();
  for (const other of ['bot-average', 'bot-strong']) {
    const t = page.getByTestId(other);
    if ((await t.getAttribute('aria-pressed')) === 'true') await t.click();
  }
  await page.getByTestId('solver-run').click();
  await expect(page.getByTestId('solver-pwin-novice')).toHaveText(/^\d+ %$/, { timeout: 60_000 });
  await expect(page.getByTestId('solver-card-novice')).toHaveAttribute('data-status', 'done', { timeout: 60_000 });
  await expect(page.getByTestId('solver-verdict-novice')).toContainText('Band');
  await expect(page.getByTestId('solver-chip')).toHaveAttribute('data-verdict', /ok|easier|harder|unsolved/);

  // ASCII-Ansicht zeigt das Brett im levelFromAscii-Format.
  await page.getByTestId('tab-ascii').click();
  await expect(page.getByTestId('ascii-board')).toContainText('tjorizo-007');
  await expect(page.getByTestId('ascii-board')).toContainText('. . P 2 .');

  // Testen: „t“ schaltet um, ein Zug per Pfeiltaste verändert den Zugzähler, Escape zurück zum Bauen.
  await page.keyboard.press('t');
  await expect(page.getByTestId('preview')).toHaveAttribute('data-mode', 'play');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('hud-moves')).toHaveText('Züge 33', { timeout: 5_000 });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('preview')).toHaveAttribute('data-mode', 'edit');
  expect(errors).toEqual([]);
});
