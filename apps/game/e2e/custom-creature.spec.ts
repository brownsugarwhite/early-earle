import { test, expect, type Page } from '@playwright/test';

// Eigene Wesen aus Blender (content/genome/custom, docs/BLENDER.md): das Genom-Lab listet sie in der Zeile
// „Eigene Wesen“ und baut sie mit ihrer Basis-Art (Gang, Masse) — hier der Beispiel-Drache (Basis Giraffe).
// WebGL2-Fallback (SwiftShader) im Mobil-Preset wie die anderen Lab-Tests.

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test('/lab/creature zeigt eigene Wesen aus content/genome/custom', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ee.qualityPref', 'mobil');
    } catch {
      /* ohne Speicher stuft der Governor selbst herunter */
    }
  });
  await page.goto('/lab/creature');
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
  const row = page.getByTestId('ctl-custom');
  await expect(row).toBeVisible();
  const drache = page.getByTestId('custom-beispiel-drache');
  await expect(drache).toBeEnabled();
  await drache.click();
  await expect(drache).toHaveAttribute('data-active', 'true');
  const info = page.getByTestId('creature-lab-info');
  // Basis Giraffe: Schritt-Gang; Hörner, Flügel, Kamm, Ohren, Augen, Nase, Schweif als Module.
  await expect(info).toContainText('Giraffe', { timeout: 20_000 });
  await expect(info).toContainText(/1[0-9] Teile/);
  await expect(info).not.toContainText('fehlend');
  // Zurück zu den Regeln
  await row.getByRole('button', { name: '—' }).click();
  await expect(info).not.toContainText('Giraffe', { timeout: 20_000 });
  expect(errors).toEqual([]);
});
