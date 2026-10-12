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
  // feste Seitenleiste rechts (Florian 12.10.): 2×2-Raster bis 1288, Leiste 1328…1688
  expect(r.seite).toEqual({ x: 40, y: 84, w: 604, h: 498.5 });
  expect(r.creation!.x + r.creation!.w).toBe(1288);
  expect(r.leiste).toEqual({ x: 1328, y: 84, w: 360, h: 1037 });
  const d = await dok(page);
  expect(d.profile.seite!.knoten).toHaveLength(4);
  expect(d.profile.front!.knoten).toHaveLength(3);
  console.log('Backend:', await page.evaluate(() => (window as unknown as Fenster).__editor!.backend));
});

test('Pinker Knopf maximiert quadratisch (so groß wie neben der Leiste möglich) und kehrt zurück', async ({ page }) => {
  await bereit(page);
  await page.click('[data-maximieren="top"]');
  await page.waitForTimeout(140);
  await page.screenshot({ path: path.join(bilder, 'maximieren-mitten.png') });
  await ruhig(page);
  let r = await rects(page);
  expect(r.top).toEqual({ x: 40, y: 108.5, w: 988, h: 988 });
  expect(r.seite!.x).toBe(40 + 988 + 40);
  expect(r.creation!.y + r.creation!.h).toBeCloseTo(1121, 5);
  await page.screenshot({ path: path.join(bilder, 'maximiert-top.png') });
  // rechte Spalte bleibt rechts
  await page.click('[data-maximieren="creation"]');
  await ruhig(page);
  r = await rects(page);
  expect(r.creation!.x + r.creation!.w).toBe(1288);
  expect(r.creation!.w).toBe(r.creation!.h);
  await page.click('[data-maximieren="creation"]');
  await ruhig(page);
  r = await rects(page);
  expect(r.seite).toEqual({ x: 40, y: 84, w: 604, h: 498.5 });
});

test('Seitenleiste immer offen, Library klappt auf und zu', async ({ page }) => {
  await bereit(page);
  await expect(page.locator('.leiste')).toBeVisible();
  await expect(page.locator('.leiste-library.offen')).toBeVisible();
  const vorher = await rects(page);
  await page.locator('.menueleiste').getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.locator('.leiste-library.offen')).toHaveCount(0);
  expect(await rects(page)).toEqual(vorher);
  await page.keyboard.press('ControlOrMeta+l');
  await expect(page.locator('.leiste-library.offen')).toBeVisible();
  await page.screenshot({ path: path.join(bilder, 'seitenleiste.png') });
});

test('Mausrad zoomt zum Cursor, mittlere Taste verschiebt', async ({ page }) => {
  await bereit(page);
  const vorher = await knotenPos(page, 'seite', 1);
  const mitte = { x: 40 + 302, y: 84 + 249 };
  await page.mouse.move(mitte.x, mitte.y);
  await page.mouse.wheel(0, -300);
  const nachZoom = await knotenPos(page, 'seite', 1);
  expect(Math.abs(nachZoom.x - mitte.x)).toBeGreaterThan(Math.abs(vorher.x - mitte.x) * 1.5);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(mitte.x + 60, mitte.y + 30, { steps: 5 });
  await page.mouse.up({ button: 'middle' });
  const nachPan = await knotenPos(page, 'seite', 1);
  expect(nachPan.x - nachZoom.x).toBeCloseTo(60, 0);
  expect(nachPan.y - nachZoom.y).toBeCloseTo(30, 0);
});

test('Punkt ziehen wie Illustrator: keine Punkte von selbst, 3D gleiche Vertexzahl, Rückgängig', async ({ page }) => {
  await bereit(page);
  const v0 = await page.evaluate(() => (window as unknown as Fenster).__editor!.vertices());
  const p = await knotenPos(page, 'seite', 1);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 180, p.y + 20, { steps: 12 });
  await page.mouse.up();
  const d = await dok(page);
  expect(d.profile.seite!.knoten).toHaveLength(4);
  expect(d.profile.seite!.knoten[1]!.p.x).toBeGreaterThan(0.5);
  expect(await page.evaluate(() => (window as unknown as Fenster).__editor!.vertices())).toBe(v0);
  await page.screenshot({ path: path.join(bilder, 'punkt-gezogen.png') });
  await page.keyboard.press('ControlOrMeta+z');
  expect((await dok(page)).profile.seite!.knoten).toHaveLength(4);
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

test('Ein Objekt: Ziehen in einer Ansicht bewegt die anderen live mit', async ({ page }) => {
  await bereit(page);
  const ext = async () =>
    page.evaluate(() => {
      const p = (window as unknown as Fenster).__stores.editor.getState().dok.profile;
      const xs = (a: string) => p[a]!.knoten.map((k) => k.p.x);
      const ys = (a: string) => p[a]!.knoten.map((k) => k.p.y);
      return {
        seiteYmax: Math.max(...ys('seite')),
        frontYmax: Math.max(...ys('front')),
        seiteXmin: Math.min(...xs('seite')),
        topXmin: Math.min(...xs('top')),
        frontBreite: Math.max(...xs('front')),
        topBreite: Math.max(...ys('top')),
      };
    });
  // Front: oberen Achspunkt hochziehen → Seite wird gleich hoch
  const a = await knotenPos(page, 'front', 0);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x, a.y - 70, { steps: 8 });
  let e = await ext();
  expect(e.seiteYmax).toBeCloseTo(e.frontYmax, 3);
  await page.mouse.up();
  // Top: vordere Spitze nach vorn → Schnauze der Seite wandert mit
  const b = await knotenPos(page, 'top', 0);
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  await page.mouse.move(b.x - 90, b.y, { steps: 8 });
  await page.mouse.up();
  // Front: Flanke raus → Top wird breiter
  const c = await knotenPos(page, 'front', 1);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 60, c.y, { steps: 8 });
  await page.mouse.up();
  e = await ext();
  expect(e.seiteXmin).toBeLessThan(-0.35);
  expect(e.topBreite).toBeGreaterThan(0.3);
  // geteilte Ausdehnungen der Kurven (nicht nur der Knoten) stimmen überein
  const abw = () => page.evaluate(() => (window as unknown as { __pruefen: { abweichung(): number } }).__pruefen.abweichung());
  expect(await abw()).toBeLessThan(1e-3);
  await page.screenshot({ path: path.join(bilder, 'kopplung.png') });
  // ein Zug = ein Rückgängig-Schritt für alle drei Ansichten
  await page.keyboard.press('ControlOrMeta+z');
  expect(await abw()).toBeLessThan(1e-3);
  expect((await ext()).topBreite).toBeLessThan(0.3);
});

test('Zeichenstift (P), + und −: Punkte von Hand setzen und löschen wie in Illustrator', async ({ page }) => {
  await bereit(page);
  const oben = await knotenPos(page, 'seite', 0);
  const unten = await knotenPos(page, 'seite', 2);
  const mitte = { x: oben.x, y: (oben.y + unten.y) / 2 };
  const R = (unten.y - oben.y) / 2;
  const aufKurve = (grad: number) => ({ x: mitte.x + R * Math.cos((grad * Math.PI) / 180), y: mitte.y - R * Math.sin((grad * Math.PI) / 180) });
  const anzahl = async () => (await dok(page)).profile.seite!.knoten.length;

  await page.mouse.move(mitte.x, mitte.y);
  await page.keyboard.press('p');
  await expect(page.locator('.werkzeug-hinweis')).toContainText('Zeichenstift');
  const p45 = aufKurve(45);
  await page.mouse.click(p45.x, p45.y);
  expect(await anzahl()).toBe(5);
  await page.screenshot({ path: path.join(bilder, 'zeichenstift.png') });
  // Klick auf den neuen Punkt löscht ihn wieder (Kreis bleibt Kreis)
  const neu = await knotenPos(page, 'seite', 1);
  await page.mouse.click(neu.x, neu.y);
  expect(await anzahl()).toBe(4);
  // + fügt ein, − löscht
  await page.keyboard.press('+');
  const p200 = aufKurve(200);
  await page.mouse.click(p200.x, p200.y);
  expect(await anzahl()).toBe(5);
  await page.keyboard.press('-');
  const k3 = await knotenPos(page, 'seite', 3);
  await page.mouse.click(k3.x, k3.y);
  expect(await anzahl()).toBe(4);
  // ⌥-Klick mit dem Zeichenstift wandelt um
  await page.keyboard.press('p');
  const links = await knotenPos(page, 'seite', 3);
  await page.keyboard.down('Alt');
  await page.mouse.click(links.x, links.y);
  await page.keyboard.up('Alt');
  expect((await dok(page)).profile.seite!.knoten[3]!.art).toBe('ecke');
  // Esc zurück zur Direktauswahl
  await page.keyboard.press('Escape');
  await expect(page.locator('.werkzeug-hinweis')).toHaveCount(0);
});

test('Auswahlrechteck, ⇧-Klick, gemeinsam ziehen und Pfeiltasten wie Illustrator', async ({ page }) => {
  await bereit(page);
  const oben = await knotenPos(page, 'seite', 0);
  const rechts = await knotenPos(page, 'seite', 1);
  // Rechteck um die Punkte oben und rechts
  await page.mouse.move(rechts.x + 30, oben.y - 30);
  await page.mouse.down();
  await page.mouse.move(oben.x - 20, rechts.y + 20, { steps: 6 });
  await expect(page.locator('.vp-ober[data-view="seite"] .auswahlrahmen')).toHaveCount(1);
  await page.mouse.up();
  const sel = () => page.evaluate(() => (window as unknown as { __stores: { ui: { getState(): { auswahl: { seite: number[] } } } } }).__stores.ui.getState().auswahl.seite);
  expect((await sel()).sort()).toEqual([0, 1]);
  await expect(page.locator('.vp-ober[data-view="seite"] .auswahlrahmen')).toHaveCount(0);
  // ⇧-Klick nimmt den unteren dazu und wieder weg
  const u = await knotenPos(page, 'seite', 2);
  await page.keyboard.down('Shift');
  await page.mouse.click(u.x, u.y);
  expect((await sel()).sort()).toEqual([0, 1, 2]);
  await page.mouse.click(u.x, u.y);
  await page.keyboard.up('Shift');
  expect((await sel()).sort()).toEqual([0, 1]);
  // gemeinsam ziehen
  const v0 = (await dok(page)).profile.seite!.knoten.map((k) => k.p);
  await page.mouse.move(rechts.x, rechts.y);
  await page.mouse.down();
  await page.mouse.move(rechts.x + 46, rechts.y, { steps: 5 });
  await page.mouse.up();
  let v1 = (await dok(page)).profile.seite!.knoten.map((k) => k.p);
  expect(v1[0]!.x - v0[0]!.x).toBeCloseTo(v1[1]!.x - v0[1]!.x, 9);
  expect(v1[0]!.x - v0[0]!.x).toBeGreaterThan(0.05);
  expect(v1[2]).toEqual(v0[2]);
  await page.screenshot({ path: path.join(bilder, 'auswahlrechteck.png') });
  // Pfeiltasten: 1 Schritt = 0,002 Kachel, ⇧ = 0,02
  await page.mouse.move(rechts.x + 120, rechts.y + 120);
  const vorher = (await dok(page)).profile.seite!.knoten[1]!.p;
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Shift+ArrowLeft');
  v1 = (await dok(page)).profile.seite!.knoten.map((k) => k.p);
  expect(v1[1]!.y - vorher.y).toBeCloseTo(0.002, 9);
  expect(v1[1]!.x - vorher.x).toBeCloseTo(-0.02, 9);
  // ein Rückgängig nimmt genau einen Tastenschritt zurück
  await page.keyboard.press('ControlOrMeta+z');
  expect((await dok(page)).profile.seite!.knoten[1]!.p.x).toBeCloseTo(vorher.x, 9);
  // Entf löscht beide gewählten Punkte
  await page.keyboard.press('Delete');
  expect((await dok(page)).profile.seite!.knoten).toHaveLength(2);
});

test('Auswahl je Viewport, Entf löscht den Punkt unter der Maus', async ({ page }) => {
  await bereit(page);
  const a = await knotenPos(page, 'seite', 1);
  await page.mouse.click(a.x, a.y);
  const b = await knotenPos(page, 'front', 1);
  await page.mouse.click(b.x, b.y);
  await expect(page.locator('.vp-ober[data-view="seite"] .griff')).toHaveCount(2);
  await expect(page.locator('.vp-ober[data-view="front"] .griff')).toHaveCount(2);
  await page.mouse.move(a.x + 40, a.y + 40);
  await page.keyboard.press('Delete');
  const d = await dok(page);
  expect(d.profile.seite!.knoten).toHaveLength(3);
  expect(d.profile.front!.knoten).toHaveLength(3);
});

test('3D: rechte Taste dreht, Rad zoomt', async ({ page }) => {
  await bereit(page);
  const k0 = await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().kamera);
  const m = { x: 684 + 302, y: 622 + 249 };
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
  // Library ist in der Seitenleiste schon offen
  await expect(page.locator('.karte', { hasText: 'Testblob' })).toBeVisible();
  await expect(page.locator('.karte img')).toHaveCount(1);
  await ruhig(page);
  await page.screenshot({ path: path.join(bilder, 'library-gespeichert.png') });

  await page.getByRole('button', { name: 'Neues Wesen' }).click();
  const d = await dok(page);
  expect(d.skalierung).toBe(1);
  expect(d.profile.seite!.knoten).toHaveLength(4);
});
