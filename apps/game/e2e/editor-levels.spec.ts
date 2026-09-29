import { test, expect, type Page } from '@playwright/test';

// Level-Editor (P3/P4): läuft wie die Smoke-Tests auf dem WebGL2-Fallback (SwiftShader).
// Schreibt nur die _-Datei `_draft-e2e.json` (löschbar über DELETE) und räumt sie hinterher weg.

const DRAFT_FILE = '_draft-e2e.json';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function openLevel3(page: Page): Promise<void> {
  await page.goto('/editor/levels?file=003.json');
  await expect(page.getByTestId('editor-top')).toBeVisible();
  await expect(page.getByTestId('endpoint-state')).toHaveAttribute('data-state', 'ok', { timeout: 15_000 });
  await expect(page.getByTestId('level-picker')).toHaveValue('003.json', { timeout: 15_000 });
  await expect(page.getByTestId('file-name')).toHaveValue('003.json');
}

test.afterAll(async ({ request }) => {
  await request.delete(`/__content/levels/${DRAFT_FILE}`).catch(() => undefined);
});

test('Level 3 laden, Maske malen, validieren, als _-Entwurf speichern und wieder löschen', async ({ page, request }) => {
  const errors = collectErrors(page);
  await request.delete(`/__content/levels/${DRAFT_FILE}`).catch(() => undefined);
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignorieren */
    }
  });
  await openLevel3(page);

  // Raster-Reiter: 4×4, Zelle [0,0] ist frei; ein Tipp macht daraus einen Riss.
  await page.getByTestId('tab-raster').click();
  const grid = page.getByTestId('board-grid');
  await expect(grid).toBeVisible();
  await expect(grid.locator('[data-cell]')).toHaveCount(16);
  const cell = page.getByTestId('cell-0-0');
  await expect(cell).toHaveAttribute('data-mask', '.');
  await cell.click();
  await expect(cell).toHaveAttribute('data-mask', '#');
  await expect(page.getByTestId('dirty-dot')).toHaveAttribute('data-dirty', 'true');
  await expect(page.getByTestId('validation')).toHaveAttribute('data-ok', 'true');

  // Ein Riss unter dem Start-Blob bei [2,0] entfernt den Blob (Maske hat Vorrang), das Level bleibt gültig.
  await page.getByTestId('cell-2-0').click();
  await expect(page.getByTestId('cell-2-0')).toHaveAttribute('data-mask', '#');
  await expect(page.getByTestId('validation')).toHaveAttribute('data-ok', 'true');

  // Ein Ziel über der Kappe erzeugt einen Fehler und sperrt Speichern.
  await page.getByTestId('tab-ziele').click();
  const cap = page.getByTestId('cap');
  for (let i = 0; i < 9; i++) await cap.getByRole('button', { name: 'Kappe verringern' }).click();
  await expect(page.getByTestId('cap-value')).toHaveText('3 (8)');
  await expect(page.getByTestId('validation')).toHaveAttribute('data-ok', 'false');
  await expect(page.getByTestId('save-btn')).toBeDisabled();
  await page.getByTestId('validation-summary').click();
  await expect(page.getByTestId('validation-issues')).toContainText('Kappe muss mindestens die Zielstufe sein');
  await page.getByTestId('validation-summary').click();
  for (let i = 0; i < 9; i++) await cap.getByRole('button', { name: 'Kappe erhöhen' }).click();
  await expect(page.getByTestId('validation')).toHaveAttribute('data-ok', 'true');

  // Unter neuem Namen speichern (PUT auf eine _-Datei).
  await page.getByTestId('file-name').fill(DRAFT_FILE);
  await page.getByTestId('save-btn').click();
  await expect.poll(async () => ((await (await request.get('/__content/levels')).json()) as { files: string[] }).files, { timeout: 15_000 }).toContain(DRAFT_FILE);
  const saved = (await (await request.get(`/__content/levels/${DRAFT_FILE}`)).json()) as { id: string; grid: { mask: string[] } };
  expect(saved.id).toBe('tjorizo-003');
  expect(saved.grid.mask[0]).toBe('#.#.');

  // Vite lädt nach der Dateiänderung neu; der Editor kommt auf derselben Datei zurück und listet sie.
  await expect(page.getByTestId('level-picker')).toHaveValue(DRAFT_FILE, { timeout: 20_000 });
  await expect(page.getByTestId('level-picker').locator('option', { hasText: 'draft-e2e' })).toHaveCount(1);
  await expect(page.getByTestId('dirty-dot')).toHaveAttribute('data-dirty', 'false');

  // Löschen (DELETE, nur für _-Dateien).
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('delete-btn').click();
  await expect.poll(async () => ((await (await request.get('/__content/levels')).json()) as { files: string[] }).files, { timeout: 15_000 }).not.toContain(DRAFT_FILE);
  await expect(page.getByTestId('level-picker').locator('option', { hasText: 'draft-e2e' })).toHaveCount(0, { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('Solver-Reiter: Anfänger-Bot mit 10 Seeds liefert eine Gewinnrate; Vorschau rendert', async ({ page }) => {
  const errors = collectErrors(page);
  await openLevel3(page);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });

  await page.getByTestId('tab-solver').click();
  await page.getByTestId('solver-seeds').selectOption('10');
  const novice = page.getByTestId('bot-novice');
  if ((await novice.getAttribute('aria-pressed')) !== 'true') await novice.click();
  for (const other of ['bot-average', 'bot-strong']) {
    const t = page.getByTestId(other);
    if ((await t.getAttribute('aria-pressed')) === 'true') await t.click();
  }
  await page.getByTestId('solver-run').click();
  const pwin = page.getByTestId('solver-pwin-novice');
  await expect(pwin).toHaveText(/^\d+ %$/, { timeout: 60_000 });
  await expect(page.getByTestId('solver-card-novice')).toHaveAttribute('data-status', 'done', { timeout: 60_000 });
  await expect(page.getByTestId('solver-verdict-novice')).toContainText('Band');

  // ASCII-Ansicht zeigt das Brett im levelFromAscii-Format.
  await page.getByTestId('tab-ascii').click();
  await expect(page.getByTestId('ascii-board')).toContainText('tjorizo-003');
  // Tokens sind Stufen (3 = 8), Zeile 0 von Level 3: Stufe 3 in Spalte 2.
  await expect(page.getByTestId('ascii-board')).toContainText('. . 3 .');

  // Testen: ein Zug per Taste verändert den Zugzähler.
  await page.getByTestId('play-btn').click();
  await expect(page.getByTestId('preview')).toHaveAttribute('data-mode', 'play');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('preview')).toContainText('Züge 33', { timeout: 5_000 });
  await page.getByTestId('edit-btn').click();
  await expect(page.getByTestId('preview')).toHaveAttribute('data-mode', 'edit');
  expect(errors).toEqual([]);
});
