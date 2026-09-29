import { test, expect, type Page } from '@playwright/test';

// P4 Genom-Lab + Creature-Editor smoke tests. Run on the WebGL2 fallback (SwiftShader) like the others.

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

test('/lab/creature lädt alle Module, zeigt Teile an und reagiert auf Verben, Galerie und Verschmelzen', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/lab/creature');
  await waitForRenderer(page);
  const info = page.getByTestId('creature-lab-info');
  // Tier 4 (default): two eyes + ears or horns → 4 parts, all 22 starter modules loaded, nothing missing.
  await expect(info).toContainText(/\d+ Module/, { timeout: 20_000 });
  await expect(info).toContainText('4 Teile');
  await expect(info).not.toContainText('fehlend');
  await expect(info).toContainText(/Rig \d/);

  for (const verb of ['blink', 'flap', 'twitch', 'wag', 'sway', 'bob']) await page.getByTestId(`verb-${verb}`).click();
  await page.getByTestId('btn-poke').click();

  // Per-part sliders appear for the selected part.
  await page.getByTestId('ctl-parts').getByRole('button').first().click();
  await expect(page.getByTestId('ctl-part-sliders')).toBeVisible();

  // Gallery: tiers 1–8 side by side → 8 creatures with more parts than the single tier-4 one.
  await page.getByTestId('ctl-mode').getByRole('button', { name: 'Galerie 1–8', exact: true }).click();
  await expect(info).toContainText('8 Figuren', { timeout: 10_000 });
  await expect(info).toContainText(/\d\d Teile/);

  // Slot toggle hides eyes: fewer parts drawn is not shown in the count, but no errors either.
  await page.getByTestId('ctl-slots').getByRole('button', { name: 'Auge', exact: true }).click();

  // Merge stage: parents A/B → child; the HUD lists what the child inherited.
  await page.getByTestId('ctl-mode').getByRole('button', { name: 'Verschmelzen', exact: true }).click();
  await expect(info).toContainText('2 Figuren', { timeout: 10_000 });
  await page.getByTestId('btn-merge').click();
  await expect(info).toContainText('Kind erbt', { timeout: 10_000 });
  await expect(info).toContainText('3 Figuren', { timeout: 30_000 });
  await expect(info).not.toContainText('verschmilzt', { timeout: 30_000 });

  // Raymarch hero body keeps the parts attached.
  await page.getByTestId('ctl-mode').getByRole('button', { name: 'Einzeln', exact: true }).click();
  await page.getByTestId('ctl-candidate').getByRole('button', { name: 'a Raymarch (Hero)', exact: true }).click();
  await page.getByTestId('ctl-tier').getByRole('button', { name: '8', exact: true }).click();
  await expect(info).toContainText('1 Figuren', { timeout: 10_000 });
  await expect(info).toContainText(/[89] Teile|1\d Teile/);
  expect(errors).toEqual([]);
});

test('/editor/creatures zeigt die Regeln, validiert und speichert über den Dev-Endpunkt', async ({ page, request }) => {
  const errors = collectErrors(page);
  const before = await (await request.get('/__content/genome/rules.json')).text();
  await page.goto('/editor/creatures');
  await expect(page.getByTestId('editor-creatures')).toBeVisible();
  await waitForRenderer(page);
  await expect(page.getByTestId('ed-status')).toContainText(/gültig/i, { timeout: 15_000 });

  // Unlock table: tier 1 of Tjorizo unlocks the eye slit.
  await expect(page.getByTestId('ed-tier-1')).toContainText('eye');
  // Socket tab shows the draggable body map with one dot per slot.
  await page.getByTestId('ed-tab-sockets').click();
  await expect(page.getByTestId('ed-socket-map')).toBeVisible();
  await expect(page.getByTestId('ed-socket-map').locator('.ced-map-dot')).toHaveCount(9 + 5); // 9 slots + mirrored twins
  // Scale tab + palette tab render.
  await page.getByTestId('ed-tab-scales').click();
  await expect(page.getByTestId('ed-scales')).toBeVisible();
  await page.getByTestId('ed-tab-palette').click();
  await expect(page.getByTestId('ed-palette')).toBeVisible();

  // Save writes the same content back (round trip through zod + the endpoint).
  await page.getByTestId('ed-save').click();
  await expect(page.getByTestId('ed-toast')).toContainText('Gespeichert', { timeout: 10_000 });
  const after = await (await request.get('/__content/genome/rules.json')).text();
  expect(JSON.parse(after)).toEqual(JSON.parse(before));
  expect(errors).toEqual([]);
});

test('Content-Endpunkt akzeptiert nur gültige Genom-Regeln über die Editor-Validierung', async ({ page }) => {
  await page.goto('/editor/creatures');
  await expect(page.getByTestId('editor-creatures')).toBeVisible();
  await page.getByTestId('ed-tab-json').click();
  const area = page.getByTestId('ed-json');
  await area.fill('{"schemaVersion":1,"assets":{},"sockets":{},"zones":{}}');
  await page.getByTestId('ed-json-apply').click();
  await expect(page.getByTestId('ed-issues')).toBeVisible();
  await expect(page.getByTestId('ed-save')).toBeDisabled();
});
