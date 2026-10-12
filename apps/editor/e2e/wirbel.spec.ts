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

// Florian 12.10. nachts: „Kann ich die Wirbelsäule auch selbst einzeichnen?“
test('Wirbelsäule selbst zeichnen: Punkte setzen, ziehen, löschen, Vorschlag übernehmen, automatisch', async ({ page }) => {
  await bereit(page);
  const R = 0.265;
  const pkt = await page.locator('.vp-ober[data-view="seite"] .knoten-punkt').evaluateAll((els) =>
    els.map((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }),
  );
  const s = (Math.max(...pkt.map((p) => p.y)) - Math.min(...pkt.map((p) => p.y))) / (2 * R);
  const cx = (Math.min(...pkt.map((p) => p.x)) + Math.max(...pkt.map((p) => p.x))) / 2;
  const unten = Math.max(...pkt.map((p) => p.y));
  const seite = (w: { x: number; y: number }) => ({ x: cx + w.x * s, y: unten - w.y * s });
  type W = { wirbelsaeule?: { knoten: { p: [number, number, number] }[] } };
  const wirbel = () => page.evaluate(() => (window as unknown as { __stores: { editor: { getState(): { dok: W } } } }).__stores.editor.getState().dok.wirbelsaeule);

  await page.click('[data-view="creation"] [data-bauweise="wirbel"]');
  await page.locator('.leiste [data-wirbelbereich]').getByRole('button', { name: 'selbst zeichnen' }).click();
  for (const w of [{ x: -0.18, y: 0.18 }, { x: -0.06, y: 0.24 }, { x: 0.06, y: 0.3 }, { x: 0.18, y: 0.36 }]) {
    const q = seite(w);
    await page.mouse.click(q.x, q.y);
  }
  await page.keyboard.press('Enter');
  let l = await wirbel();
  expect(l?.knoten).toHaveLength(4);
  await expect(page.locator('.leiste [data-wirbelquelle="gezeichnet"]')).toBeVisible();
  await expect(page.locator('.vp-ober[data-view="seite"] [data-wirbelknoten]')).toHaveCount(4);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(bilder, 'wirbel-selbst-gezeichnet.png') });

  // Punkt 1 nach oben ziehen: nur die Wirbelsäule ändert sich
  const y1 = l!.knoten[1]!.p[1];
  const k1 = (await page.locator('.vp-ober[data-view="seite"] [data-wirbelknoten="1"] circle').last().boundingBox())!;
  await page.mouse.move(k1.x + k1.width / 2, k1.y + k1.height / 2);
  await page.mouse.down();
  await page.mouse.move(k1.x + k1.width / 2, k1.y + k1.height / 2 - 30, { steps: 6 });
  await page.mouse.up();
  l = await wirbel();
  expect(l!.knoten[1]!.p[1]).toBeGreaterThan(y1 + 0.03);

  // Zeichenstift auf Punkt 3 löscht ihn
  await page.keyboard.press('p');
  const k3 = (await page.locator('.vp-ober[data-view="seite"] [data-wirbelknoten="3"] circle').last().boundingBox())!;
  await page.mouse.click(k3.x + k3.width / 2, k3.y + k3.height / 2);
  expect((await wirbel())!.knoten).toHaveLength(3);
  await page.keyboard.press('a');

  // automatisch: gezeichnete Wirbelsäule weg; Vorschlag übernehmen: 6 ziehbare Punkte
  await page.locator('.leiste [data-wirbelbereich]').getByRole('button', { name: 'automatisch' }).click();
  expect(await wirbel()).toBeUndefined();
  await page.waitForTimeout(600);
  await page.locator('.leiste [data-wirbelbereich]').getByRole('button', { name: 'Vorschlag übernehmen' }).click();
  expect((await wirbel())!.knoten).toHaveLength(6);
  await page.keyboard.press('ControlOrMeta+z');
  expect(await wirbel()).toBeUndefined();
});
