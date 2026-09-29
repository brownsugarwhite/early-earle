import { test, expect } from '@playwright/test';

const canvasRoutes = ['/play', '/lab/blob', '/lab/earle', '/lab/grid'];
const pageRoutes = ['/', '/lab', '/editor/levels', '/editor/creatures', '/editor/map'];

for (const route of pageRoutes) {
  test(`Seite ${route} lädt ohne Konsolenfehler`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const route of canvasRoutes) {
  test(`Canvas-Route ${route} rendert und meldet ein Backend`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(route);
    await expect(page.locator('canvas')).toBeVisible();
    const badge = page.getByTestId('perf-badge');
    await expect(badge).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
    expect(errors).toEqual([]);
  });
}

test('Content-Endpunkt: ungültiges JSON wird abgelehnt, gültiges landet in content/', async ({ request }) => {
  const bad = await request.put('/__content/levels/_smoke.json', { data: '{"nope":' , headers: { 'content-type': 'application/json' } });
  expect(bad.status()).toBe(400);
  const missing = await request.put('/__content/levels/_smoke.json', { data: { foo: 1 } });
  expect(missing.status()).toBe(400);
  const ok = await request.put('/__content/levels/_smoke.json', { data: { schemaVersion: 1, id: '_smoke' } });
  expect(ok.status()).toBe(200);
  const list = await request.get('/__content/levels');
  expect((await list.json()).files).toContain('_smoke.json');
  const badDir = await request.get('/__content/secrets');
  expect(badDir.status()).toBe(400);
  const traversal = await request.put('/__content/levels/..%2F..%2Fpwned.json', { data: { schemaVersion: 1 } });
  expect(traversal.status()).toBe(400);
  const notDeletable = await request.delete('/__content/levels/001.json');
  expect([403, 404]).toContain(notDeletable.status());
  const cleanup = await request.delete('/__content/levels/_smoke.json');
  expect(cleanup.status()).toBe(200);
});
