import { type Page, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const bilder = path.resolve(hier, '../../../docs/progress/editor');

type Rect = { x: number; y: number; w: number; h: number };
type Fenster = Window & {
  __editor?: { backend: string; vertices: () => number };
  __stores: {
    editor: { getState(): { dok: { profile: Record<string, { knoten: { art: string; p: { x: number; y: number } }[] }>; skalierung: number; posen: string[] }; modus: string; datei: string | null } };
    ui: { getState(): { kamera: { azimut: number; distanz: number; ziel: number[] }; ansichten: Record<string, { zoom: number; cu: number; cv: number }>; auswahl: unknown } };
    rahmen: { getState(): { rects: Record<string, Rect> | null; bewegt: boolean } };
  };
};

async function bereit(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as Fenster).__editor?.vertices() ?? 0 > 0, null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

const rects = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__stores.rahmen.getState().rects!);
const ruhig = (page: Page) => page.waitForFunction(() => !(window as unknown as Fenster).__stores.rahmen.getState().bewegt);
const dok = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__stores.editor.getState().dok);

/** Bildschirmposition eines Knotens im Viewport (über das SVG-Element). */
async function knotenPos(page: Page, ansicht: string, i: number) {
  const kreis = page.locator(`.vp-ober[data-view="${ansicht}"] [data-knoten="${i}"] .knoten-punkt`);
  const b = (await kreis.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Grundlayout: vier Viewports wie die Vorlage, 3D läuft', async ({ page }) => {
  await bereit(page);
  const r = await rects(page);
  expect(r.seite).toEqual({ x: 40, y: 84, w: 804, h: 498.5 });
  expect(r.creation!.x + r.creation!.w).toBe(1688);
  const d = await dok(page);
  expect(d.profile.seite!.knoten).toHaveLength(12);
  expect(d.profile.front!.knoten).toHaveLength(7);
  console.log('Backend:', await page.evaluate(() => (window as unknown as Fenster).__editor!.backend));
});

test('Pinker Knopf maximiert quadratisch auf voller Höhe und kehrt zurück', async ({ page }) => {
  await bereit(page);
  await page.click('[data-maximieren="top"]');
  await page.waitForTimeout(140);
  await page.screenshot({ path: path.join(bilder, 'maximieren-mitten.png') });
  await ruhig(page);
  let r = await rects(page);
  expect(r.top).toEqual({ x: 40, y: 84, w: 1037, h: 1037 });
  expect(r.seite!.x).toBe(40 + 1037 + 40);
  expect(r.creation!.y + r.creation!.h).toBeCloseTo(1121, 5);
  await page.screenshot({ path: path.join(bilder, 'maximiert-top.png') });
  // rechte Spalte bleibt rechts
  await page.click('[data-maximieren="creation"]');
  await ruhig(page);
  r = await rects(page);
  expect(r.creation!.x + r.creation!.w).toBe(1688);
  expect(r.creation!.w).toBe(r.creation!.h);
  await page.click('[data-maximieren="creation"]');
  await ruhig(page);
  r = await rects(page);
  expect(r.seite).toEqual({ x: 40, y: 84, w: 804, h: 498.5 });
});

test('Library gleitet herein, Viewports werden schmaler', async ({ page }) => {
  await bereit(page);
  await page.getByRole('button', { name: 'Library' }).click();
  await ruhig(page);
  const r = await rects(page);
  expect(r.library!.x + r.library!.w).toBe(1688);
  expect(r.creation!.x + r.creation!.w).toBe(1688 - 400 - 40);
  await expect(page.locator('.library.offen')).toBeVisible();
  await page.screenshot({ path: path.join(bilder, 'library-offen.png') });
});

test('Mausrad zoomt zum Cursor, mittlere Taste verschiebt', async ({ page }) => {
  await bereit(page);
  const vorher = await knotenPos(page, 'seite', 3);
  const mitte = { x: 40 + 402, y: 84 + 249 };
  await page.mouse.move(mitte.x, mitte.y);
  await page.mouse.wheel(0, -300);
  const nachZoom = await knotenPos(page, 'seite', 3);
  expect(Math.abs(nachZoom.x - mitte.x)).toBeGreaterThan(Math.abs(vorher.x - mitte.x) * 1.5);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(mitte.x + 60, mitte.y + 30, { steps: 5 });
  await page.mouse.up({ button: 'middle' });
  const nachPan = await knotenPos(page, 'seite', 3);
  expect(nachPan.x - nachZoom.x).toBeCloseTo(60, 0);
  expect(nachPan.y - nachZoom.y).toBeCloseTo(30, 0);
});

test('Punkt ziehen: automatisch neue Punkte, 3D gleiche Vertexzahl, Rückgängig', async ({ page }) => {
  await bereit(page);
  const v0 = await page.evaluate(() => (window as unknown as Fenster).__editor!.vertices());
  const p = await knotenPos(page, 'seite', 3);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 180, p.y + 20, { steps: 12 });
  await page.mouse.up();
  const d = await dok(page);
  expect(d.profile.seite!.knoten.length).toBeGreaterThan(12);
  expect(await page.evaluate(() => (window as unknown as Fenster).__editor!.vertices())).toBe(v0);
  await page.screenshot({ path: path.join(bilder, 'punkt-gezogen.png') });
  await page.keyboard.press('ControlOrMeta+z');
  expect((await dok(page)).profile.seite!.knoten).toHaveLength(12);
});

test('⌥ am Griff macht eine Ecke, Kontextmenü glättet, fügt ein und löscht', async ({ page }) => {
  await bereit(page);
  // Top: vorderen Achspunkt wählen und den Griff mit ⌥ abknicken (Tropfenspitze wie in der Vorlage)
  const p = await knotenPos(page, 'top', 0);
  await page.mouse.click(p.x, p.y);
  const griff = page.locator('.vp-ober[data-view="top"] [data-griff="0:aus"] rect').last();
  const g = (await griff.boundingBox())!;
  await page.keyboard.down('Alt');
  await page.mouse.move(g.x + 3, g.y + 3);
  await page.mouse.down();
  await page.mouse.move(g.x + 40, g.y - 30, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  let d = await dok(page);
  expect(d.profile.top!.knoten[0]!.art).toBe('ecke');
  // Achspunkt nach vorn ziehen → Tropfen
  const q = await knotenPos(page, 'top', 0);
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await page.mouse.move(q.x - 110, q.y, { steps: 8 });
  await page.mouse.up();
  await page.screenshot({ path: path.join(bilder, 'ecke-tropfen.png') });

  // Rechtsklick auf den Punkt → Menü
  const r = await knotenPos(page, 'top', 0);
  await page.mouse.click(r.x, r.y, { button: 'right' });
  await expect(page.locator('.kontextmenue')).toBeVisible();
  await page.screenshot({ path: path.join(bilder, 'kontextmenue.png') });
  await page.getByRole('button', { name: 'Punkt glätten' }).click();
  d = await dok(page);
  expect(d.profile.top!.knoten[0]!.art).toBe('glatt');

  const n = d.profile.seite!.knoten.length;
  const k = await knotenPos(page, 'seite', 2);
  await page.mouse.click(k.x, k.y, { button: 'right' });
  await page.getByRole('button', { name: 'Punkt löschen' }).click();
  expect((await dok(page)).profile.seite!.knoten).toHaveLength(n - 1);
  const k2 = await knotenPos(page, 'seite', 0);
  await page.mouse.click(k2.x, k2.y, { button: 'right' });
  await page.getByRole('button', { name: 'Punkt einfügen' }).click();
  expect((await dok(page)).profile.seite!.knoten).toHaveLength(n);
});

test('Auswahl je Viewport, Entf löscht den Punkt unter der Maus', async ({ page }) => {
  await bereit(page);
  const a = await knotenPos(page, 'seite', 2);
  await page.mouse.click(a.x, a.y);
  const b = await knotenPos(page, 'front', 2);
  await page.mouse.click(b.x, b.y);
  await expect(page.locator('.vp-ober[data-view="seite"] .griff')).toHaveCount(2);
  await expect(page.locator('.vp-ober[data-view="front"] .griff')).toHaveCount(2);
  await page.mouse.move(a.x + 40, a.y + 40);
  await page.keyboard.press('Delete');
  const d = await dok(page);
  expect(d.profile.seite!.knoten).toHaveLength(11);
  expect(d.profile.front!.knoten).toHaveLength(7);
});

test('3D: rechte Taste dreht, Rad zoomt', async ({ page }) => {
  await bereit(page);
  const k0 = await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().kamera);
  const m = { x: 884 + 402, y: 622 + 249 };
  await page.mouse.move(m.x, m.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(m.x + 120, m.y + 40, { steps: 6 });
  await page.mouse.up({ button: 'right' });
  await page.mouse.wheel(0, -200);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(m.x + 160, m.y + 40, { steps: 5 });
  await page.mouse.up({ button: 'middle' });
  const k1 = await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().kamera);
  expect(k1.ziel[0]).not.toBeCloseTo(k0.ziel[0]!, 3);
  expect(k1.azimut).not.toBeCloseTo(k0.azimut, 3);
  expect(k1.distanz).toBeLessThan(k0.distanz);
  await expect(page.locator('.kontextmenue')).toHaveCount(0);
  await page.screenshot({ path: path.join(bilder, '3d-gedreht.png') });

  // linke Taste dreht ebenfalls (Trackpad), seitliches Wischen dreht
  const k2 = await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().kamera);
  await page.mouse.move(m.x, m.y);
  await page.mouse.down();
  await page.mouse.move(m.x - 90, m.y, { steps: 5 });
  await page.mouse.up();
  const k3 = await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().kamera);
  expect(k3.azimut).not.toBeCloseTo(k2.azimut, 3);
  await page.mouse.wheel(40, 0);
  const k4 = await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().kamera);
  expect(k4.azimut).not.toBeCloseTo(k3.azimut, 3);
  expect(k4.distanz).toBeCloseTo(k3.distanz, 9);
});

test('Posen, Größe, Speichern und Library-Karte', async ({ page }) => {
  await bereit(page);
  await page.getByRole('button', { name: 'Neue Pose' }).click();
  await page.locator('.aufklapp').getByRole('button', { name: 'Laufen' }).click();
  await expect(page.locator('.menueleiste .pille.aktiv', { hasText: 'Laufen' })).toBeVisible();
  expect((await dok(page)).posen).toEqual(['laufen']);

  const bahn = (await page.locator('.regler-bahn').boundingBox())!;
  await page.mouse.click(bahn.x + bahn.width * 0.6, bahn.y + 3);
  expect((await dok(page)).skalierung).toBeGreaterThan(1.5);

  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.locator('.dialog-eingabe').fill('Testblob');
  await page.keyboard.press('Enter');
  await expect(page.locator('.hinweis.sichtbar')).toContainText('Testblob');
  await page.getByRole('button', { name: 'Library' }).click();
  await expect(page.locator('.karte', { hasText: 'Testblob' })).toBeVisible();
  await expect(page.locator('.karte img')).toHaveCount(1);
  await ruhig(page);
  await page.screenshot({ path: path.join(bilder, 'library-gespeichert.png') });

  await page.getByRole('button', { name: 'Neues Wesen' }).click();
  const d = await dok(page);
  expect(d.skalierung).toBe(1);
  expect(d.profile.seite!.knoten).toHaveLength(12);
});
