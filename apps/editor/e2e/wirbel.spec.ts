// Versuch 12.10. abends: Bauweise „Wirbelsäule“ zum Vergleichen (Florian: „Kannst du das schon so einbauen, dass ich es
// vergleichen kann?“). Tab am 3D-Fenster, Wirbelsäule und Sprossen in der Seite, Umriss des 3D-Körpers in allen
// Ansichten, Biegen als Vorschau, zurück zur bisherigen Bauweise.
import { type Page, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const bilder = path.resolve(hier, '../../../docs/progress/editor');

type Fenster = Window & { __editor?: { vertices: () => number }; __stores: { editor: { getState(): { dok: Record<string, unknown>; laden(d: unknown, datei: null): void } } } };

async function bereit(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => ((window as unknown as Fenster).__editor?.vertices() ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}
const vertices = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__editor!.vertices());
const label = (page: Page) => page.locator('.vp-ober[data-view="creation"] .vp-label.platzhalter');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Bauweise Wirbelsäule: umschalten, Wirbelsäule in der Seite, biegen, zurück', async ({ page }) => {
  await bereit(page);
  await expect(label(page)).toHaveText('Platzhalter-Körper');
  const v0 = await vertices(page);

  await page.click('[data-view="creation"] [data-bauweise="wirbel"]');
  await expect(label(page)).toHaveText('Versuch: Wirbelsäule');
  await page.waitForFunction((v) => (window as unknown as Fenster).__editor!.vertices() !== v, v0);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-wirbelsaeule]')).toHaveCount(1);
  await expect(page.locator('[data-wirbelumriss]')).toHaveCount(3);
  await expect(page.locator('.leiste [data-wirbelbereich]')).toBeVisible();
  await expect(page.locator('.leiste [data-wirbelringe="44"]')).toBeVisible();

  // Langhals laden: Hals steht (blaue Sprossen = Breite aus der Front)
  await page.evaluate(async () => {
    const v = (await (await fetch('/versuch/langhals/langhals.json')).json()) as { profile: Record<string, unknown> };
    const st = (window as unknown as Fenster).__stores.editor.getState();
    st.laden({ ...st.dok, name: 'Langhals', profile: { seite: v.profile.seite, front: v.profile.front, top: v.profile.top } }, null);
  });
  await expect(page.locator('.leiste [data-wirbelbereich] b').first()).toContainText('stehend');
  const stehend = await page.locator('.leiste [data-wirbelbereich] b').first().textContent();
  expect(Number(/(\d+) stehend/.exec(stehend ?? '')?.[1] ?? 0)).toBeGreaterThan(8);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(bilder, 'wirbel-vergleich-tab.png') });

  // biegen (Vorschau): gleiche Vertexzahl, andere Lage; der Umriss in der Seite ändert sich
  const vorher = await page.locator('.vp-ober[data-view="seite"] [data-wirbelumriss]').getAttribute('d');
  const vv = await vertices(page);
  await page.locator('.leiste [data-wirbelbereich] input[type="range"]').first().fill('-30');
  await page.waitForTimeout(1200);
  expect(await vertices(page)).toBe(vv);
  expect(await page.locator('.vp-ober[data-view="seite"] [data-wirbelumriss]').getAttribute('d')).not.toBe(vorher);
  await page.locator('.leiste [data-wirbelbereich]').getByRole('button', { name: 'gerade' }).click();

  // zurück zur bisherigen Bauweise
  await page.click('[data-view="creation"] [data-bauweise="bisher"]');
  await expect(label(page)).not.toHaveText('Versuch: Wirbelsäule');
  await expect(page.locator('[data-wirbelumriss]')).toHaveCount(0);
  await expect(page.locator('.leiste [data-wirbelbereich]')).toHaveCount(0);
});
