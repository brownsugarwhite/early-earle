// Spanten (Versuch 12.10. nachmittags): Werkzeug S setzt einen Querschnitt in der Seite, Front zeigt die vorderen
// Spanten, der gewählte wird wie ein Profil bearbeitet, Punkte gelten in allen Querschnitten, Spantlinie verschieben,
// Entf löscht, Rückgängig.
import { type Page, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const bilder = path.resolve(hier, '../../../docs/progress/editor');

type P = { knoten: { p: { x: number; y: number }; art: string }[] };
type Fenster = Window & {
  __editor?: { vertices: () => number };
  __stores: {
    editor: { getState(): { dok: { spanten?: { f: number; profil: P }[]; profile: { front: P } } } };
    ui: { getState(): { blick: { front: string }; spantAuswahl: { spant: number; knoten: number[] } | null } };
  };
};
const R = 0.265;

async function bereit(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => ((window as unknown as Fenster).__editor?.vertices() ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}
const dok = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__stores.editor.getState().dok);

async function seiteAbbildung(page: Page) {
  const pkt = await page.locator('.vp-ober[data-view="seite"] .knoten-punkt').evaluateAll((els) =>
    els.map((e) => {
      const b = e.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }),
  );
  const ys = pkt.map((p) => p.y);
  const xs = pkt.map((p) => p.x);
  const s = (Math.max(...ys) - Math.min(...ys)) / (2 * R);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const unten = Math.max(...ys);
  return (w: { x: number; y: number }) => ({ x: cx + w.x * s, y: unten - w.y * s });
}

const mitte = async (page: Page, sel: string) => {
  const b = (await page.locator(sel).first().boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Spanten: setzen, in der Front bearbeiten, Punkt in allen Querschnitten, verschieben, löschen', async ({ page }) => {
  await bereit(page);
  const seite = await seiteAbbildung(page);
  const v0 = await page.evaluate(() => (window as unknown as Fenster).__editor!.vertices());

  // S: Spant vorn in der Seite setzen
  await page.keyboard.press('s');
  const q = seite({ x: -0.17, y: R });
  await page.mouse.click(q.x, q.y);
  let d = await dok(page);
  expect(d.spanten).toHaveLength(1);
  expect(d.spanten![0]!.f).toBeGreaterThan(0.1);
  expect(d.spanten![0]!.f).toBeLessThan(0.3);
  // gleiche Punktstruktur wie die Front
  expect(d.spanten![0]!.profil.knoten).toHaveLength(d.profile.front.knoten.length);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-spant="0"]')).toHaveCount(1);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-hauptspant]')).toHaveCount(1);
  await expect(page.locator('.leiste [data-spantanzahl="1"]')).toBeVisible();
  // vorderer Spant: Front zeigt ihn mit Punkten
  expect(await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().blick.front)).toBe('front');
  await expect(page.locator('.vp-ober[data-view="front"] [data-spantkurve="0"]')).toHaveCount(1);
  await expect(page.locator('.vp-ober[data-view="front"] [data-spantknoten]')).toHaveCount(d.profile.front.knoten.length);
  // mit Spanten baut das 3D den Käfig
  await expect(page.locator('.vp-ober[data-view="creation"] .vp-label.platzhalter')).toHaveText('Versuch: Kanten im Käfig');
  await page.waitForFunction((v) => (window as unknown as Fenster).__editor!.vertices() !== v, v0);

  // Punkt 1 des Spants nach außen-oben ziehen: nur der Spant ändert sich
  const vorher = d.spanten![0]!.profil.knoten[1]!.p;
  const k1 = await mitte(page, '.vp-ober[data-view="front"] [data-spantknoten="0:1"] circle');
  await page.mouse.move(k1.x, k1.y);
  await page.mouse.down();
  await page.mouse.move(k1.x + 8, k1.y - 35, { steps: 6 });
  await page.mouse.up();
  d = await dok(page);
  expect(d.spanten![0]!.profil.knoten[1]!.p.y).toBeGreaterThan(vorher.y + 0.05);
  // ⌥-Klick mit dem Zeichenstift: Ecke im Spant → Längskante, in der Seite sichtbar
  const k1b = await mitte(page, '.vp-ober[data-view="front"] [data-spantknoten="0:1"] circle');
  await page.keyboard.press('p');
  await page.keyboard.down('Alt');
  await page.mouse.click(k1b.x, k1b.y);
  await page.keyboard.up('Alt');
  d = await dok(page);
  expect(d.spanten![0]!.profil.knoten[1]!.art).toBe('ecke');
  await expect(page.locator('.vp-ober[data-view="seite"] [data-eckkante]')).toHaveCount(1);

  // Zeichenstift auf der Spantkurve: neuer Punkt in Spant und Front zugleich
  const n0 = d.profile.front.knoten.length;
  const kurve = await page.locator('.vp-ober[data-view="front"] [data-spantkurve="0"] path[stroke="transparent"]').evaluate((el) => {
    const p = el as SVGPathElement;
    const pt = p.getPointAtLength(p.getTotalLength() * 0.75);
    const m = p.getScreenCTM()!;
    return { x: pt.x * m.a + pt.y * m.c + m.e, y: pt.x * m.b + pt.y * m.d + m.f };
  });
  await page.mouse.click(kurve.x, kurve.y);
  d = await dok(page);
  expect(d.profile.front.knoten).toHaveLength(n0 + 1);
  expect(d.spanten![0]!.profil.knoten).toHaveLength(n0 + 1);
  await page.keyboard.press('a');
  await page.screenshot({ path: path.join(bilder, 'spanten-tab.png') });

  // Spantlinie in der Seite nach hinten ziehen
  const f0 = d.spanten![0]!.f;
  const linie = await mitte(page, '.vp-ober[data-view="seite"] [data-spant="0"] line');
  await page.mouse.move(linie.x, linie.y);
  await page.mouse.down();
  await page.mouse.move(linie.x + 30, linie.y, { steps: 6 });
  await page.mouse.up();
  d = await dok(page);
  expect(d.spanten![0]!.f).toBeGreaterThan(f0 + 0.02);

  // Entf ohne gewählte Punkte löscht den Spant, Rückgängig holt ihn zurück
  await page.click('.leiste [data-spanteintrag="0"]');
  await page.keyboard.press('Delete');
  d = await dok(page);
  expect(d.spanten ?? []).toHaveLength(0);
  await page.keyboard.press('ControlOrMeta+z');
  d = await dok(page);
  expect(d.spanten).toHaveLength(1);
});
