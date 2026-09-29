import { test, expect, type Page } from '@playwright/test';

// P4 Genom-Lab + Creature-Editor smoke tests (Kreaturen v2: Körpertypen, Bewegung, Editor-Usability).
// Run on the WebGL2 fallback (SwiftShader) like the others.

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

/**
 * SwiftShader is the weakest GPU there is: run the smoke tests in the Mobil preset (no fur/feather/
 * particle passes, 20 march steps, 1 noise octave) — the raymarched REX/snake/giraffe bodies and the
 * extra passes of the Hoch preset make every frame take seconds in software. The app reads the
 * persisted preference at start-up (`ee.qualityPref`), the governor applies it with the first stats window.
 */
async function useMobilPreset(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ee.qualityPref', 'mobil');
    } catch {
      /* storage blocked: the governor will still step down on slow frames */
    }
  });
}

// SwiftShader renders these scenes at a few frames per second: generous per-test budgets.
test('/lab/creature lädt alle Module, zeigt Teile an und reagiert auf Verben, Galerie und Verschmelzen', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await useMobilPreset(page);
  await page.goto('/lab/creature');
  await waitForRenderer(page);
  const info = page.getByTestId('creature-lab-info');
  // Tier 4 (default): two eyes + ears or horns → 4 parts, every module of the library loaded, nothing missing.
  await expect(info).toContainText(/[1-9]\d Module/, { timeout: 20_000 });
  await expect(info).toContainText('4 Teile');
  await expect(info).not.toContainText('fehlend');
  await expect(info).toContainText(/Rig \d/);
  await expect(info).toContainText('Blob · Hüpfen');

  for (const verb of ['blink', 'flap', 'twitch', 'wag', 'sway', 'bob', 'curl', 'sniff']) await page.getByTestId(`verb-${verb}`).click();
  await page.getByTestId('btn-poke').click();

  // Per-part sliders appear for the selected part.
  await page.getByTestId('ctl-parts').getByRole('button').first().click();
  await expect(page.getByTestId('ctl-part-sliders')).toBeVisible();

  // Gallery: the blob line, tiers 1–8 side by side → 8 creatures with more parts than the single tier-4
  // one (the archetypes — partly raymarched, far too slow for SwiftShader in a row of 8 — are covered by
  // the motion test below).
  await page.getByTestId('ctl-body').getByRole('button', { name: 'Blob', exact: true }).click();
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

  // Raymarch hero body keeps the parts attached (tier 8 may be any archetype: 7–16 parts).
  await page.getByTestId('ctl-mode').getByRole('button', { name: 'Einzeln', exact: true }).click();
  await page.getByTestId('ctl-candidate').getByRole('button', { name: 'a Raymarch (Hero)', exact: true }).click();
  await page.getByTestId('ctl-body').getByRole('button', { name: 'Blob', exact: true }).click();
  await page.getByTestId('ctl-tier').getByRole('button', { name: '8', exact: true }).click();
  await expect(info).toContainText('1 Figuren', { timeout: 10_000 });
  await expect(info).toContainText(/([7-9]|1\d) Teile/);
  expect(errors).toEqual([]);
});

test('/lab/creature Bewegung: Körpertypen laufen, springen, schlängeln; Parcours, Blob-Sheet, Vergleichen', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await useMobilPreset(page);
  await page.goto('/lab/creature');
  await waitForRenderer(page);
  const info = page.getByTestId('creature-lab-info');
  await expect(info).toContainText(/[1-9]\d Module/, { timeout: 20_000 });
  await expect(info).not.toContainText('fehlend');

  await page.getByTestId('ctl-mode').getByRole('button', { name: 'Bewegung', exact: true }).click();
  await expect(page.getByTestId('ctl-motion')).toBeVisible();

  // Quadruped: four structural legs, a walk or trot, walking in a circle on "Laufen".
  await page.getByTestId('ctl-body').getByRole('button', { name: 'Vierbeiner', exact: true }).click();
  await expect(info).toContainText('Vierbeiner', { timeout: 10_000 });
  await expect(info).toContainText(/Schritt|Trab/);
  await page.getByTestId('motion-walk').click();
  await expect(info).toContainText('läuft im Kreis', { timeout: 10_000 });
  await expect(info).toContainText(/\d\.\d\d m\/s/, { timeout: 10_000 });

  // Slime jump: the blob ducks, flies, splats and comes to rest again.
  await page.getByTestId('ctl-body').getByRole('button', { name: 'Blob', exact: true }).click();
  await expect(info).toContainText('Blob · Hüpfen', { timeout: 10_000 });
  await page.getByTestId('motion-jump').click();
  await expect(info).toContainText(/duckt sich|fliegt|platscht|federt/, { timeout: 10_000 });
  await expect(info).toContainText('steht', { timeout: 15_000 });

  // "Schlängeln" switches to the snake (always raymarched) and slithers.
  await page.getByTestId('motion-slither').click();
  await expect(info).toContainText('Schlange · Schlängeln', { timeout: 10_000 });
  await expect(info).toContainText('läuft im Kreis', { timeout: 10_000 });

  // REX and heavy exist too; sliders take effect without errors.
  await page.getByTestId('ctl-body').getByRole('button', { name: 'REX', exact: true }).click();
  await expect(info).toContainText('REX · Stampfen', { timeout: 10_000 });
  await page.getByTestId('ctl-body').getByRole('button', { name: 'Behäbig', exact: true }).click();
  await expect(info).toContainText('Behäbig · Watscheln', { timeout: 10_000 });
  await page.getByTestId('ctl-mass').locator('input').fill('2.5');
  await page.getByTestId('ctl-speed').locator('input').fill('1.8');

  // Parcours: six archetypes at once.
  await page.getByTestId('btn-parcours').click();
  await expect(info).toContainText('6 Figuren', { timeout: 10_000 });
  await expect(info).toContainText(/Bewegung \d/);

  // Blob sheet mirrors the designer's sheet: 8 tiers + 5 archetypes + 9 squash frames.
  await page.getByTestId('ctl-mode').getByRole('button', { name: 'Blob-Sheet', exact: true }).click();
  await expect(info).toContainText('22 Figuren', { timeout: 15_000 });

  // Compare two tiers side by side.
  await page.getByTestId('ctl-mode').getByRole('button', { name: 'Vergleichen', exact: true }).click();
  await expect(page.getByTestId('ctl-compare-tier')).toBeVisible();
  await page.getByTestId('ctl-compare-tier').getByRole('button', { name: '9', exact: true }).click();
  await expect(info).toContainText('2 Figuren', { timeout: 10_000 });

  // "Zufall" produces variety: archetype × zone × tier × seed.
  await page.getByTestId('btn-random').click();
  await expect(info).toContainText(/Figuren/, { timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('/editor/creatures zeigt die Regeln, validiert, kann rückgängig machen und speichert über den Dev-Endpunkt', async ({ page, request }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  const before = await (await request.get('/__content/genome/rules.json')).text();
  await useMobilPreset(page);
  await page.goto('/editor/creatures?preview=single'); // one blob: cheap under SwiftShader
  await expect(page.getByTestId('editor-creatures')).toBeVisible();
  await waitForRenderer(page);
  await expect(page.getByTestId('ed-status')).toContainText(/gültig/i, { timeout: 15_000 });

  // Unlock table: tier 1 of Tjorizo unlocks the eye slit; the quick toggles show it.
  await expect(page.getByTestId('ed-tier-1')).toContainText('eye');
  await expect(page.getByTestId('ed-quick-1').getByRole('button', { name: 'Auge', exact: true })).toHaveAttribute('data-active', 'true');
  await expect(page.getByTestId('ed-undo')).toBeDisabled();

  // Quick toggle: a horn at tier 2 → undo → redo.
  await page.getByTestId('ed-quick-2').getByRole('button', { name: 'Horn', exact: true }).click();
  await expect(page.getByTestId('ed-quick-2').getByRole('button', { name: 'Horn', exact: true })).toHaveAttribute('data-active', 'true');
  await expect(page.getByTestId('ed-undo')).toBeEnabled();
  await page.getByTestId('ed-undo').click();
  await expect(page.getByTestId('ed-quick-2').getByRole('button', { name: 'Horn', exact: true })).toHaveAttribute('data-active', 'false');
  await page.getByTestId('ed-redo').click();
  await expect(page.getByTestId('ed-quick-2').getByRole('button', { name: 'Horn', exact: true })).toHaveAttribute('data-active', 'true');
  await page.getByTestId('ed-undo').click();

  // Body tab: archetype thresholds per zone, presets.
  await page.getByTestId('ed-tab-bodies').click();
  await expect(page.getByTestId('ed-bodies')).toBeVisible();
  await expect(page.getByTestId('ed-body-snake-from')).toHaveText('6');
  await page.getByTestId('ed-zone-luzz').click();
  await expect(page.getByTestId('ed-body-snake-from')).toHaveText('4');
  await page.getByTestId('ed-body-preset-early').click();
  await expect(page.getByTestId('ed-body-snake-from')).toHaveText('3');
  await page.getByTestId('ed-undo').click();
  await expect(page.getByTestId('ed-body-snake-from')).toHaveText('4');
  await page.getByTestId('ed-zone-tjorizo').click();

  // Preview modes: compare and motion render without errors (the archetype gallery is left out: its
  // raymarched REX/snake/giraffe bodies take seconds per frame under SwiftShader).
  await page.getByTestId('ed-preview-compare').click();
  await expect(page.getByTestId('ed-preview-tier-b')).toBeVisible();
  await page.getByTestId('ed-preview-motion').click();
  await page.getByTestId('ed-preview-single').click();

  // Socket tab shows the draggable body map with one dot per slot.
  await page.getByTestId('ed-tab-sockets').click();
  await expect(page.getByTestId('ed-socket-map')).toBeVisible();
  await expect(page.getByTestId('ed-socket-map').locator('.ced-map-dot')).toHaveCount(9 + 5); // 9 slots + mirrored twins
  // Scale tab + palette tab render.
  await page.getByTestId('ed-tab-scales').click();
  await expect(page.getByTestId('ed-scales')).toBeVisible();
  await page.getByTestId('ed-tab-palette').click();
  await expect(page.getByTestId('ed-palette')).toBeVisible();

  // Save writes the same content back (round trip through zod + the endpoint; all edits were undone).
  await page.getByTestId('ed-save').click();
  await expect(page.getByTestId('ed-toast')).toContainText('Gespeichert', { timeout: 10_000 });
  const after = await (await request.get('/__content/genome/rules.json')).text();
  expect(JSON.parse(after)).toEqual(JSON.parse(before));
  expect(errors).toEqual([]);
});

test('Content-Endpunkt akzeptiert nur gültige Genom-Regeln über die Editor-Validierung', async ({ page }) => {
  test.setTimeout(120_000);
  await useMobilPreset(page);
  await page.goto('/editor/creatures?preview=single'); // one blob: cheap under SwiftShader
  await expect(page.getByTestId('editor-creatures')).toBeVisible();
  await page.getByTestId('ed-tab-json').click();
  const area = page.getByTestId('ed-json');
  await area.fill('{"schemaVersion":1,"assets":{},"sockets":{},"zones":{}}');
  await page.getByTestId('ed-json-apply').click();
  await expect(page.getByTestId('ed-issues')).toBeVisible();
  await expect(page.getByTestId('ed-save')).toBeDisabled();
});
