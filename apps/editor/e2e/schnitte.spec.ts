// Versuch 13.10.: Bauweise „Schnitte“ (Florian 13.10.: echte Schnitte, Acht-Spant, Überhang ohne Wirbelsäule, Top-Haken).
// Tab am 3D-Fenster, Umriss des 3D-Körpers in allen Ansichten, echter Schnitt des gewählten Spants in der Front, Regel
// für Achten, zurück zur bisherigen Bauweise. Dazu die Vergleichsbilder docs/progress/editor/schnitte-*.png.
import { type Browser, type Page, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const bilder = path.resolve(hier, '../../../docs/progress/editor');

type Kamera = { azimut: number; elevation: number; distanz: number; ziel: [number, number, number] };
type Fenster = Window & {
  __editor?: { vertices: () => number };
  __stores: {
    ui: { getState(): { kamera: Kamera; setzeBauweise(b: string): void }; setState(s: Partial<{ kamera: Kamera }>): void };
    editor: { getState(): { dok: { spanten?: unknown[] }; laden(d: unknown, datei: null): void } };
    rahmen: { getState(): { rects: Record<string, { x: number; y: number; w: number; h: number }> } };
  };
};

const vertices = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__editor!.vertices());
const label = (page: Page) => page.locator('.vp-ober[data-view="creation"] .vp-label.platzhalter');

async function laden(page: Page, query: string) {
  await page.goto(`/?versuch=schnitte&${query}`);
  await page.waitForFunction(() => ((window as unknown as Fenster).__editor?.vertices() ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

/** Bauweise wählen und warten, bis das 3D neu gebaut ist (Zahl der Punkte ändert sich bzw. bleibt stehen). */
async function bauweise(page: Page, wert: 'bisher' | 'schnitte') {
  await page.click(`[data-view="creation"] [data-bauweise="${wert}"]`);
  await expect(label(page)).toHaveText(wert === 'schnitte' ? 'Versuch: Schnitte' : /Versuch: Kanten im Käfig|Platzhalter-Körper/);
  await page.waitForTimeout(900);
}

async function kamera(page: Page, azimutGrad: number, elevationGrad: number, distanz = 2.15, zielY = 0.18) {
  await page.evaluate(
    ([a, e, d, y]) => (window as unknown as Fenster).__stores.ui.setState({ kamera: { azimut: (a! * Math.PI) / 180, elevation: (e! * Math.PI) / 180, distanz: d!, ziel: [0, y!, 0] } }),
    [azimutGrad, elevationGrad, distanz, zielY],
  );
  await page.waitForTimeout(500);
}

async function bild3d(page: Page): Promise<Buffer> {
  const r = await page.evaluate(() => (window as unknown as Fenster).__stores.rahmen.getState().rects.creation!);
  return page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
}

/** Bilder in ein Raster setzen (Spalten, Beschriftung je Bild) und speichern. */
async function raster(browser: Browser, datei: string, titel: string, felder: { bild: Buffer; text: string }[], spalten = 2) {
  const seite = await browser.newPage({ viewport: { width: 1200, height: 120 }, deviceScaleFactor: 1 });
  const html = `<html><body style="margin:0;background:#1a222b;font:600 18px system-ui;color:#e8f0c8">
    <div style="padding:10px 14px">${titel}</div>
    <div style="display:grid;grid-template-columns:repeat(${spalten},auto);gap:6px;padding:0 6px 6px">
    ${felder.map((f) => `<div style="position:relative"><img src="data:image/png;base64,${f.bild.toString('base64')}" style="display:block;width:560px"><div style="position:absolute;left:10px;top:8px;background:#1a222bcc;padding:3px 8px;border-radius:6px">${f.text}</div></div>`).join('')}
    </div></body></html>`;
  await seite.setContent(html);
  await seite.waitForTimeout(200);
  await seite.screenshot({ path: path.join(bilder, datei), fullPage: true });
  await seite.close();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Bauweise Schnitte: Tab, Umriss, echter Schnitt bei S1, Regel, zurück', async ({ page }) => {
  const fehler: string[] = [];
  page.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  page.on('pageerror', (e) => fehler.push(e.message));
  await laden(page, 'wesen=ueberhang');
  await expect(label(page)).toHaveText('Versuch: Schnitte');
  await expect(page.locator('.leiste [data-schnittbereich]')).toBeVisible();
  await expect.poll(() => page.locator('[data-schnittumriss]').count()).toBeGreaterThanOrEqual(3);

  // S1 wählen: Die Front zeigt den echten Schnitt mit zwei Teilen (Schnauze und Bauch)
  await page.locator('.leiste [data-spanteintrag="0"]').click();
  await expect(page.locator('.vp-ober[data-view="front"] [data-schnitt-echt]')).toHaveAttribute('data-schnitt-echt', '2');
  await expect(page.locator('.leiste [data-spantteile]')).toHaveAttribute('data-spantteile', '2');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(bilder, 'schnitte-ueberhang-editor.png') });

  // Regel umschalten baut neu
  const v = await vertices(page);
  await page.locator('.leiste [data-schnittregel="gerade-ungerade"]').click();
  await expect.poll(() => vertices(page)).not.toBe(v);
  await page.locator('.leiste [data-schnittregel="halb"]').click();
  // Überblendung zwischen Spanten: Punkt für Punkt baut einen anderen Körper
  const v2 = await vertices(page);
  await page.locator('.leiste [data-schnittueberblenden="punkte"]').click();
  await expect.poll(() => vertices(page)).not.toBe(v2);
  await page.locator('.leiste [data-schnittueberblenden="feld"]').click();

  // Ziehen an einem Punkt der Seite: grob während der Geste, genau beim Loslassen
  const info = page.locator('.leiste [data-schnittinfo]');
  await expect(info).toContainText('112er Raster');
  const knoten = page.locator('.vp-ober[data-view="seite"] [data-knoten="1"] .knoten-punkt');
  const b = (await knoten.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 6, b.y + b.height / 2 - 12, { steps: 4 });
  await expect(info).toContainText('56er Raster');
  await page.mouse.up();
  await expect(info).toContainText('112er Raster');
  await page.keyboard.press('ControlOrMeta+z');

  // zurück zur bisherigen Bauweise
  await bauweise(page, 'bisher');
  await expect(page.locator('[data-schnittumriss]')).toHaveCount(0);
  await expect(page.locator('.leiste [data-schnittbereich]')).toHaveCount(0);
  expect(fehler).toEqual([]);
});

test('Bilder: creation gegen schnitte (Überhang seitlich, von oben, schräg; Acht; Haken; Kugel, Rex, Langhals)', async ({ page, browser }) => {
  test.setTimeout(240_000);
  // Florians Überhang: creation (Kanten im Käfig, wie in seinem Bild) gegen schnitte, drei Blickrichtungen
  await laden(page, 'wesen=ueberhang&bauweise=bisher');
  const ansichten: [string, number, number][] = [
    ['seitlich', 0, 0],
    ['von oben', 0, 89],
    ['schräg', -40, 14],
  ];
  const felder: { bild: Buffer; text: string }[] = [];
  const oben: { bild: Buffer; text: string }[] = [];
  for (const [text, az, el] of ansichten) {
    for (const b of ['bisher', 'schnitte'] as const) {
      await bauweise(page, b);
      await kamera(page, az, el, el > 80 ? 2.0 : 2.15, el > 80 ? 0 : 0.3);
      const bild = await bild3d(page);
      felder.push({ bild, text: `${b === 'bisher' ? 'creation' : 'schnitte'} · ${text}` });
      if (el > 80) oben.push({ bild, text: `${b === 'bisher' ? 'creation' : 'schnitte'} · von oben` });
    }
  }
  await raster(browser, 'schnitte-ueberhang-vergleich.png', 'Florians Überhang (13.10.): creation (Kanten im Käfig) gegen schnitte', felder);
  // Top-Haken: von oben, dazu der echte Schnitt im Haken (Front, kein Spant: Schnitt bei 51 %)
  await raster(browser, 'schnitte-haken.png', 'Top mit Haken: creation füllt die Kerbe, schnitte lässt sie offen (Haken als Flosse)', oben);

  // Acht-Spant auf der Kugel: zwei Teile
  await laden(page, 'wesen=kugel');
  await page.evaluate(async () => {
    const v = (await (await fetch('/versuch/ueberhang/ueberhang.json')).json()) as { spanten: { profil: unknown }[] };
    const st = (window as unknown as Fenster).__stores.editor.getState();
    st.laden({ ...st.dok, name: 'Kugel mit Acht', spanten: [{ f: 0.4, profil: v.spanten[0]!.profil }], hauptspant: 0.85 }, null);
  });
  await page.waitForTimeout(1200);
  await page.locator('.leiste [data-spanteintrag="0"]').click();
  await expect(page.locator('.vp-ober[data-view="front"] [data-schnitt-echt]')).toHaveAttribute('data-schnitt-echt', '2');
  await kamera(page, -70, 10, 2.15, 0.26);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(bilder, 'schnitte-acht.png') });

  // Kugel, Rex, Langhals: creation gegen schnitte, schräg
  for (const [wesen, distanz, zielY] of [
    ['kugel', 2.15, 0.26],
    ['rex', 2.0, 0.18],
    ['langhals', 2.7, 0.38],
  ] as const) {
    await laden(page, `wesen=${wesen}&bauweise=bisher`);
    const paar: { bild: Buffer; text: string }[] = [];
    for (const b of ['bisher', 'schnitte'] as const) {
      await bauweise(page, b);
      await kamera(page, -40, 14, distanz, zielY);
      paar.push({ bild: await bild3d(page), text: b === 'bisher' ? 'creation' : 'schnitte' });
    }
    await raster(browser, `schnitte-${wesen}.png`, `${wesen[0]!.toUpperCase()}${wesen.slice(1)}: creation gegen schnitte`, paar);
  }
});
