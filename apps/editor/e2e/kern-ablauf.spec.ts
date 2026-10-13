// Phase 1 (Wesen-Editor 2), Abnahme-Ablauf im normalen Editor (Bauweise kern, Earle-Look): Stamm/Tafel/Dock, Umriss
// ziehen, Reifen per ⌃R mit ⌥-Ecke und Perle, Pinsel, Maullinie im Maul-Tab, Kieferknopf, Auge, Bogen hinlegen und
// nachzeichnen. Echte GPU: `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e -- kern-ablauf`.
import { type Page, expect, test } from '@playwright/test';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const bilder = path.resolve(hier, '../../../docs/progress/editor');
const boegen = path.resolve(hier, '../../../docs/look/wesen-refs');

type Rect = { x: number; y: number; w: number; h: number };
type Wesen = { vorlage: { R: number; N: number; n: number } | null; augen: { pos: number[] }[]; zaehne: boolean; lippenBand: number; ecken: number; ableitung: number; maul: { winkel: number[]; laenge: number } | null };
type ReifenPixel = { perlen: { reifen: number; spant: number; knoten: number; j: number; px: number; py: number; vorn: number }[]; baender: [number, number][][] };
type Griffe = { kiefer: { px: number; py: number } | null; augen: { px: number; py: number; radius: number; vorn: boolean }[] };
// Eigener Fenster-Typ ohne `Window &`: die globale Deklaration in Szene3D.tsx würde die Haken zu Schnittmengen verengen
type Fenster = {
  __editor?: { vertices: () => number; wesen: () => Wesen | null; treffen: (px: number, py: number) => { kaefigPunkt: number } | null; reifenPixel: () => ReifenPixel | null; griffe: () => Griffe };
  __stores: {
    editor: { getState(): { dok: { name: string; profile: Record<string, { art: string; knoten: { art: string; p: { x: number; y: number } }[] }>; spanten?: { f: number; profil: { knoten: { art: string }[] } }[]; kaefig?: { deltas: unknown[] }; maul?: unknown; ausstattung?: { augen?: { ring: number; j: number; groesse: number } } }; verlauf: unknown[]; rueckgaengig(): void; setzeDokument(d: unknown): void } };
    ui: { getState(): { ebene: string; werkzeug: string; oeffnung: number; bauweise: string; maximiert: string | null; setzeEbene(e: string): void; setzeWerkzeug(w: string): void; setzeOeffnung(o: number): void; pauspapier: { blatt: string; sichtbar: boolean } | null } };
    rahmen: { getState(): { rects: Record<string, Rect> | null; bewegt: boolean } };
  };
};

const F = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__editor!.wesen()!) as Promise<Wesen>;
const reifenPixel = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__editor!.reifenPixel()!) as Promise<ReifenPixel>;
const griffe = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__editor!.griffe()) as Promise<Griffe>;
const rects = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__stores.rahmen.getState().rects!);
const ui = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState());
const dok = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__stores.editor.getState().dok);

async function bereit(page: Page, such = '') {
  await page.goto(`/${such}`);
  await page.waitForFunction(() => ((window as unknown as Fenster).__editor?.vertices() ?? 0) > 0, null, { timeout: 60_000 });
  await page.waitForFunction(() => !(window as unknown as Fenster).__stores.rahmen.getState().bewegt);
  await page.waitForTimeout(600);
}

/** Zug mit der Maus in Schritten (Pointer-Ereignisse wie Florians Hand). */
async function ziehen(page: Page, x: number, y: number, dx: number, dy: number, schritte = 8) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await page.mouse.move(x + (dx * i) / schritte, y + (dy * i) / schritte);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Stamm, Tafel und Dock stehen; der Kern baut die Kugel im Earle-Look', async ({ page }) => {
  await bereit(page);
  expect(await page.locator('[data-stamm] .knospe').count()).toBe(9);
  await expect(page.locator('[data-stamm] .knospe.aktiv')).toHaveAttribute('data-stufe', 'form');
  await expect(page.locator('[data-dock] [data-werkzeug="auswahl"]')).toHaveClass(/aktiv/);
  await expect(page.locator('.leiste .vp-titel')).toHaveText('körper');
  const u = await ui(page);
  expect(u.bauweise).toBe('kern');
  const w = await F(page);
  expect(w.vorlage).toEqual({ R: 24, N: 16, n: 402 });
  expect(w.ecken).toBeGreaterThan(100_000);
  // Stufe wechseln: Klick und ⌘-Taste, Layout „Bühne“ ab Stufe Maul
  await page.click('[data-stufe="maul"]');
  expect((await ui(page)).ebene).toBe('maul');
  await page.waitForFunction(() => (window as unknown as Fenster).__stores.ui.getState().maximiert === 'creation');
  await page.keyboard.press('Meta+1');
  expect((await ui(page)).ebene).toBe('form');
});

test('Körper: Seitenknoten ziehen, zwei Reifen per ⌃R, ⌥-Ecke, Perle ziehen, Pinsel G mit Undo', async ({ page }) => {
  await bereit(page);
  const r = await rects(page);
  const c = r.creation!;
  // Seitenumriss: obersten Knoten hochziehen → Umbau
  const knoten = page.locator('.vp-ober[data-view="seite"] [data-knoten] .knoten-punkt');
  const lagen = await Promise.all((await knoten.all()).map(async (k) => (await k.boundingBox())!));
  const oben = lagen.reduce((a, b) => (b.y < a.y ? b : a));
  await ziehen(page, oben.x + oben.width / 2, oben.y + oben.height / 2, 0, -40);
  await page.waitForTimeout(900);
  const d1 = await dok(page);
  expect(Math.max(...d1.profile.seite!.knoten.map((k) => k.p.y))).toBeGreaterThan(0.56);
  // Reifen per ⌃R an zwei Stellen
  for (const fx of [0.42, 0.56]) {
    await page.mouse.move(c.x + c.w * fx, c.y + c.h * 0.48);
    await page.waitForTimeout(250);
    await page.keyboard.press('Control+r');
    await page.waitForTimeout(700);
  }
  expect((await dok(page)).spanten?.length).toBe(2);
  const px = await reifenPixel(page);
  expect(px.perlen.length).toBeGreaterThan(0);
  // ⌥-Klick auf eine seitliche Perle → Ecke
  const perle = px.perlen.find((p) => p.reifen === 0 && p.vorn > 0 && p.j > 0 && p.j < 8)!;
  await page.keyboard.down('Alt');
  await page.mouse.click(c.x + perle.px, c.y + perle.py);
  await page.keyboard.up('Alt');
  await page.waitForTimeout(600);
  expect((await dok(page)).spanten![perle.spant]!.profil.knoten[perle.knoten]!.art).toBe('ecke');
  // Perle ziehen → Querschnitt ändert sich, ein Undo-Schritt
  const schritte = (await page.evaluate(() => (window as unknown as Fenster).__stores.editor.getState().verlauf.length)) as number;
  const px2 = await reifenPixel(page);
  const perle2 = px2.perlen.find((p) => p.reifen === 0 && p.vorn > 0 && p.j > 0 && p.j < 8)!;
  await ziehen(page, c.x + perle2.px, c.y + perle2.py, 24, -16);
  await page.waitForTimeout(800);
  expect((await page.evaluate(() => (window as unknown as Fenster).__stores.editor.getState().verlauf.length)) as number).toBe(schritte + 1);
  // Pinsel G: Beule, Deltas im Dokument, kein Umbau; Undo nimmt sie zurück
  await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().setzeWerkzeug('ziehen'));
  await ziehen(page, c.x + c.w * 0.5, c.y + c.h * 0.5, 0, -50, 10);
  await page.waitForTimeout(900);
  const d2 = await dok(page);
  expect(d2.kaefig?.deltas.length ?? 0).toBeGreaterThan(5);
  expect((await F(page)).ableitung).toBe(0);
  await page.evaluate(() => (window as unknown as Fenster).__stores.editor.getState().rueckgaengig());
  await page.waitForTimeout(600);
  expect((await dok(page)).kaefig?.deltas.length ?? 0).toBe(0);
  await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().setzeWerkzeug('auswahl'));
  await page.mouse.move(c.x + 4, c.y + 4);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(bilder, 'e2e-kern-koerper.png') });
});

test('Maul-Tab: drei Klicks ab der Schnauzenspitze → Maul mit Zähnen; Kieferknopf; Augen-Tab: Klick setzt das Auge', async ({ page }) => {
  await bereit(page);
  const r = await rects(page);
  const c = r.creation!;
  const knoten = page.locator('.vp-ober[data-view="seite"] [data-knoten] .knoten-punkt');
  const lagen = await Promise.all((await knoten.all()).map(async (k) => (await k.boundingBox())!));
  const vorn = lagen.reduce((a, b) => (b.x < a.x ? b : a));
  const vx = vorn.x + vorn.width / 2;
  const vy = vorn.y + vorn.height / 2;
  await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().setzeEbene('maul'));
  await page.waitForFunction(() => !(window as unknown as Fenster).__stores.rahmen.getState().bewegt);
  // Stufe Maul öffnet das Layout „Bühne“ (Blatt Seite klein); Tab zurück zum Riss, damit die gemessene Knotenlage gilt
  await page.keyboard.press('Tab');
  await page.waitForFunction(() => (window as unknown as Fenster).__stores.ui.getState().maximiert === null && !(window as unknown as Fenster).__stores.rahmen.getState().bewegt);
  await page.waitForTimeout(300);
  const sx = vx;
  const sy = vy;
  const rs = (await rects(page)).seite!;
  const schritt = rs.w / 14;
  await page.mouse.click(sx + 2, sy + 4);
  await page.waitForTimeout(200);
  await page.mouse.click(sx + schritt, sy + 8);
  await page.waitForTimeout(200);
  await page.mouse.click(sx + 2 * schritt, sy + 10);
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as unknown as Fenster).__editor!.wesen()?.zaehne === true, null, { timeout: 30_000 });
  const w = await F(page);
  expect(w.maul).not.toBeNull();
  expect(w.lippenBand).toBeGreaterThan(0);
  // Kieferknopf: nach unten ziehen öffnet
  const c2 = (await rects(page)).creation!;
  const g = await griffe(page);
  expect(g.kiefer).not.toBeNull();
  await ziehen(page, c2.x + g.kiefer!.px, c2.y + g.kiefer!.py, 0, 40);
  await page.waitForTimeout(700);
  expect((await ui(page)).oeffnung).toBeGreaterThan(0.3);
  // Augen-Tab: Klick auf den Kopf setzt das Auge
  await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().setzeEbene('augen'));
  await page.waitForFunction(() => !(window as unknown as Fenster).__stores.rahmen.getState().bewegt);
  const c3 = (await rects(page)).creation!;
  const N = w.vorlage!.N;
  let ziel: { px: number; py: number } | null = null;
  for (let iy = 3; iy <= 6 && !ziel; iy++) {
    for (let ix = 2; ix <= 6 && !ziel; ix++) {
      const t = await page.evaluate(([x, y]) => (window as unknown as Fenster).__editor!.treffen(x!, y!), [(c3.w * ix) / 10, (c3.h * iy) / 10]);
      if (t && t.kaefigPunkt >= 0 && t.kaefigPunkt < 24 * N && Math.floor(t.kaefigPunkt / N) >= 2 && Math.floor(t.kaefigPunkt / N) <= 5) ziel = { px: (c3.w * ix) / 10, py: (c3.h * iy) / 10 };
    }
  }
  expect(ziel).not.toBeNull();
  await page.mouse.click(c3.x + ziel!.px, c3.y + ziel!.py);
  await page.waitForTimeout(900);
  expect((await dok(page)).ausstattung?.augen).toBeTruthy();
  await page.mouse.move(c3.x + 4, c3.y + 4);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(bilder, 'e2e-kern-maul-auge.png') });
});

test('Bogen hinlegen (Bild 9) und Seite nachzeichnen: Pauspapier im Blatt, Umriss mit Ecken, Kern baut', async ({ page }) => {
  await bereit(page);
  const datei = path.join(boegen, readdirSync(boegen).find((f) => f.startsWith('bild09'))!);
  await page.setInputFiles('[data-bogen-datei]', datei);
  await page.waitForFunction(() => (window as unknown as Fenster).__stores.ui.getState().pauspapier?.sichtbar === true);
  await expect(page.locator('[data-pauspapier="seite"]')).toHaveCount(1);
  const vor = (await dok(page)).profile.seite!.knoten.length;
  await page.click('[data-bogen-nachzeichnen]');
  await page.waitForFunction((n) => (window as unknown as Fenster).__stores.editor.getState().dok.profile.seite!.knoten.length !== n, vor, { timeout: 30_000 });
  const seite = (await dok(page)).profile.seite!;
  expect(seite.art).toBe('geschlossen');
  expect(seite.knoten.length).toBeGreaterThanOrEqual(10);
  expect(seite.knoten.length).toBeLessThanOrEqual(60);
  expect(Math.min(...seite.knoten.map((k) => k.p.y))).toBeLessThan(0.02); // steht auf dem Boden
  await page.waitForTimeout(1500);
  expect((await F(page)).ecken).toBeGreaterThan(100_000);
  await page.keyboard.press('Alt+KeyB');
  await expect(page.locator('[data-pauspapier]')).toHaveCount(0);
  await page.keyboard.press('Alt+KeyB');
  await page.mouse.move(4, 4);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(bilder, 'e2e-kern-bogen.png') });
});
