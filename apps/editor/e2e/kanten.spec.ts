// Kanten und Ansichten (Versuch 12.10. mittags): Zeichenstift auf freier Fläche setzt eine Kantenlinie auf der Fläche,
// Härte über Stufen und Breitenwerkzeug, Knoten bleiben beim Ziehen auf der Fläche, Back/Bottom als Tab am Titel.
import { type Page, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const bilder = path.resolve(hier, '../../../docs/progress/editor');

type V3 = [number, number, number];
type KanteJ = { knoten: { p: V3 }[]; haerte: number[]; blick: string };
type Fenster = Window & {
  __editor?: { backend: string; vertices: () => number };
  __stores: {
    editor: { getState(): { dok: { kanten?: KanteJ[] }; gesteStart: unknown } };
    ui: { getState(): { werkzeug: string; blick: { front: string; top: string }; kantenAuswahl: { kante: number; indizes: number[] } | null } };
  };
};

const R = 0.265; // Startkugel, Mitte (0, R, 0)

async function bereit(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => ((window as unknown as Fenster).__editor?.vertices() ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

const kanten = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__stores.editor.getState().dok.kanten ?? []);

/** Welt → Bildschirm, abgelesen an den Knoten der Startkugel. */
async function abbildung(page: Page, ansicht: 'seite' | 'front') {
  const pkt = await page.locator(`.vp-ober[data-view="${ansicht}"] .knoten-punkt`).evaluateAll((els) =>
    els.map((e) => {
      const b = e.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }),
  );
  const ys = pkt.map((p) => p.y);
  const xs = pkt.map((p) => p.x);
  const oben = Math.min(...ys);
  const unten = Math.max(...ys);
  const s = (unten - oben) / (2 * R);
  const cx = ansicht === 'seite' ? (Math.min(...xs) + Math.max(...xs)) / 2 : pkt.find((p) => Math.abs(p.y - oben) < 1)!.x;
  return (w: { x: number; y: number }) => ({ x: cx + w.x * s, y: unten - w.y * s });
}

const aufKugel = (p: V3) => Math.abs(Math.hypot(p[0], p[1] - R, p[2]) - R);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Kanten: zeichnen, Härte, Breitenwerkzeug, auf der Fläche ziehen, löschen, Back-Ansicht', async ({ page }) => {
  await bereit(page);
  const seite = await abbildung(page, 'seite');

  // Zeichenstift auf freier Fläche (innerhalb der Kugel, nicht auf dem Umriss): eine Wangenkante quer über die Flanke
  await page.keyboard.press('p');
  for (const x of [-0.18, -0.06, 0.06, 0.18]) {
    const q = seite({ x, y: R * 0.75 });
    await page.mouse.click(q.x, q.y);
  }
  await page.keyboard.press('Enter');
  let k = await kanten(page);
  expect(k).toHaveLength(1);
  expect(k[0]!.blick).toBe('seite');
  expect(k[0]!.knoten).toHaveLength(4);
  expect(k[0]!.haerte).toEqual([0, 0, 0, 0]);
  // Punkte liegen auf der rechten Flanke der Kugel (z > 0)
  for (const kn of k[0]!.knoten) {
    expect(aufKugel(kn.p)).toBeLessThan(0.01);
    expect(kn.p[2]).toBeGreaterThan(0.05);
  }
  await expect(page.locator('.leiste [data-kantenanzahl="1"]')).toBeVisible();
  await expect(page.locator('.leiste [data-kantenmenue]')).toBeVisible();
  // Kantenliste mit einem Eintrag; Ebenenschalter blass sperrt die Kanten, zeigen gibt sie frei
  await expect(page.locator('.leiste [data-kanteneintrag]')).toHaveCount(1);
  await page.click('.leiste [data-kantensicht="blass"]');
  await expect(page.locator('.vp-ober[data-view="seite"] [data-kantenknoten]')).toHaveCount(0);
  await page.click('.leiste [data-kantensicht="zeigen"]');
  await page.click('.leiste [data-kanteneintrag="0"]');
  await expect(page.locator('.vp-ober[data-view="seite"] [data-kantenknoten]')).toHaveCount(4);
  // die Kante erscheint auch in Front und Top
  await expect(page.locator('.vp-ober[data-view="front"] [data-kante="0"] *').first()).toBeAttached();

  // Stufe „scharf“: ganze Linie 100 %
  await page.locator('.leiste [data-kantenmenue]').getByRole('button', { name: 'scharf' }).click();
  k = await kanten(page);
  expect(k[0]!.haerte).toEqual([1, 1, 1, 1]);
  await page.locator('.leiste [data-kantenmenue]').getByRole('button', { name: 'weich auslaufen' }).click();
  k = await kanten(page);
  expect(k[0]!.haerte[0]).toBe(0);
  expect(k[0]!.haerte[3]).toBe(0);
  expect(k[0]!.haerte[1]).toBe(1);

  // Breitenwerkzeug ⇧W: Mitte des zweiten Segments greifen und von der Linie weg ziehen → neuer Knoten, härter
  await page.keyboard.press('Shift+W');
  expect(await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().werkzeug)).toBe('breite');
  const mitte = seite({ x: 0, y: R * 0.75 });
  await page.mouse.move(mitte.x, mitte.y);
  await page.mouse.down();
  await page.mouse.move(mitte.x, mitte.y - 30, { steps: 6 });
  await page.mouse.up();
  k = await kanten(page);
  expect(k[0]!.knoten).toHaveLength(5);
  const neu = (await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().kantenAuswahl))!.indizes[0]!;
  expect(k[0]!.haerte[neu]).toBeGreaterThan(0.9);
  await page.screenshot({ path: path.join(bilder, 'kanten-tab.png') });

  // Direktauswahl: ersten Knoten ziehen – er bleibt auf der Kugel
  await page.keyboard.press('a');
  const p0 = seite({ x: k[0]!.knoten[0]!.p[0], y: k[0]!.knoten[0]!.p[1] });
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.mouse.move(p0.x + 6, p0.y - 25, { steps: 6 });
  await page.mouse.up();
  k = await kanten(page);
  expect(aufKugel(k[0]!.knoten[0]!.p)).toBeLessThan(0.01);
  // Entf löscht den gewählten Knoten
  await page.keyboard.press('Delete');
  k = await kanten(page);
  expect(k[0]!.knoten).toHaveLength(4);

  // Back: Tab am Titel, waagerecht gespiegelt; eine Kante dort liegt auf der Rückseite (x > 0)
  await page.click('[data-view="front"] [data-blick="hinten"]');
  expect(await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().blick.front)).toBe('hinten');
  await expect(page.locator('.vp-ober[data-view="front"] .vp-label.links')).toHaveText('right');
  const front = await page.locator('.vp-ober[data-view="front"] .vp-inhalt').boundingBox();
  await page.keyboard.press('p');
  const fx = front!.x + front!.width / 2;
  const fy = front!.y + front!.height * 0.62;
  for (const dx of [-40, 0, 40]) await page.mouse.click(fx + dx, fy);
  await page.keyboard.press('Enter');
  k = await kanten(page);
  expect(k).toHaveLength(2);
  expect(k[1]!.blick).toBe('hinten');
  for (const kn of k[1]!.knoten) expect(kn.p[0]).toBeGreaterThan(0.1);
  await page.screenshot({ path: path.join(bilder, 'kanten-back.png') });

  // Rückgängig: Back-Kante weg, dann Löschen zurück
  await page.keyboard.press('ControlOrMeta+z');
  expect(await kanten(page)).toHaveLength(1);
  await page.keyboard.press('ControlOrMeta+z');
  expect((await kanten(page))[0]!.knoten).toHaveLength(5);
});

test('Ecke in der Front wird Kante in Seite und Top; das 3D baut den Kanten-Käfig', async ({ page }) => {
  await bereit(page);
  const v0 = await page.evaluate(() => (window as unknown as Fenster).__editor!.vertices());
  await expect(page.locator('.vp-ober[data-view="creation"] .vp-label.platzhalter')).toHaveText('Platzhalter-Körper');
  // oberen Achsknoten der Front mit ⌥-Klick (Zeichenstift) zur Ecke machen: spitzer First
  const kb = (await page.locator('.vp-ober[data-view="front"] [data-knoten="0"] circle').first().boundingBox())!;
  await page.keyboard.press('p');
  await page.keyboard.down('Alt');
  await page.mouse.click(kb.x + kb.width / 2, kb.y + kb.height / 2);
  await page.keyboard.up('Alt');
  await page.keyboard.press('a');
  // als Kante in Seite und Top, nicht in der Front selbst
  await expect(page.locator('.vp-ober[data-view="seite"] [data-eckkante]')).toHaveCount(1);
  await expect(page.locator('.vp-ober[data-view="top"] [data-eckkante]')).toHaveCount(1);
  await expect(page.locator('.vp-ober[data-view="front"] [data-eckkante]')).toHaveCount(0);
  await expect(page.locator('.vp-ober[data-view="creation"] .vp-label.platzhalter')).toHaveText('Versuch: Kanten im Käfig');
  await page.waitForFunction((v) => (window as unknown as Fenster).__editor!.vertices() !== v, v0);
  // Klick auf die Ecken-Kante in der Seite wählt die Ecke in der Front; Härte über die Seitenleiste
  // freie Stelle der Kante (bei 30 % ihrer Länge; oben in der Mitte liegt der Profilpunkt der Seite)
  const q = await page.locator('.vp-ober[data-view="seite"] [data-eckkante] path[stroke="transparent"]').first().evaluate((el) => {
    const p = el as SVGPathElement;
    const pt = p.getPointAtLength(p.getTotalLength() * 0.3);
    const m = p.getScreenCTM()!;
    return { x: pt.x * m.a + pt.y * m.c + m.e, y: pt.x * m.b + pt.y * m.d + m.f };
  });
  await page.mouse.click(q.x, q.y);
  await expect(page.locator('.leiste [data-eckmenue]')).toBeVisible();
  await page.locator('.leiste [data-eckmenue] .regler input[type="range"]').first().fill('0.3');
  const h = await page.evaluate(() => (window as unknown as { __stores: { editor: { getState(): { dok: { profile: { front: { knoten: { haerte?: number }[] } } } } } } }).__stores.editor.getState().dok.profile.front.knoten[0]!.haerte);
  expect(h).toBeCloseTo(0.3, 5);
  await page.screenshot({ path: path.join(bilder, 'kanten-ecke.png') });
});
