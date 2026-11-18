// Versuch 13.10. nachmittags: Bauweise „rund“ (Seite rund aufgeblasen, Breite aus Top und Front). Tab „rund“ am
// 3D-Fenster, Umriss des 3D-Körpers in allen Ansichten, grob während Gesten und fein beim Loslassen, Umschalter zum
// Schnitt-Loft. Dazu die Vergleichsbilder docs/progress/editor/rund-*.png: creation, wirbelsäule, Schnitt-Loft und rund
// nebeneinander, seitlich, schräg und von oben.
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
    rahmen: { getState(): { rects: Record<string, { x: number; y: number; w: number; h: number }> } };
  };
};

const label = (page: Page) => page.locator('.vp-ober[data-view="creation"] .vp-label.platzhalter');
const vertices = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__editor!.vertices());

async function laden(page: Page, query: string) {
  await page.goto(`/?versuch=rund&${query}`);
  await page.waitForFunction(() => ((window as unknown as Fenster).__editor?.vertices() ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

const BAUWEISEN = [
  ['bisher', 'creation', /Versuch: Kanten im Käfig|Platzhalter-Körper/],
  ['wirbel', 'wirbelsäule', 'Versuch: Wirbelsäule'],
  ['schnitte', 'Schnitt-Loft', 'Versuch: Schnitte'],
  ['rund', 'rund', 'Versuch: rund'],
] as const;

/** Bauweise wählen (der Schnitt-Loft über den Umschalter im Tab „rund“) und warten, bis das 3D neu gebaut ist. */
async function bauweise(page: Page, wert: (typeof BAUWEISEN)[number][0]) {
  await page.evaluate((b) => (window as unknown as Fenster).__stores.ui.getState().setzeBauweise(b), wert);
  await expect(label(page)).toHaveText(BAUWEISEN.find((b) => b[0] === wert)![2]);
  await page.waitForTimeout(wert === 'schnitte' ? 1400 : 900);
}

async function kamera(page: Page, azimutGrad: number, elevationGrad: number, distanz: number, zielY: number) {
  await page.evaluate(
    ([a, e, d, y]) => (window as unknown as Fenster).__stores.ui.setState({ kamera: { azimut: (a! * Math.PI) / 180, elevation: (e! * Math.PI) / 180, distanz: d!, ziel: [0, y!, 0] } }),
    [azimutGrad, elevationGrad, distanz, zielY],
  );
  await page.waitForTimeout(450);
}

async function bild3d(page: Page): Promise<Buffer> {
  const r = await page.evaluate(() => (window as unknown as Fenster).__stores.rahmen.getState().rects.creation!);
  return page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
}

/** Bilder in ein Raster setzen (Spaltenköpfe, Zeilenbeschriftung) und speichern. */
async function raster(browser: Browser, datei: string, titel: string, spalten: string[], zeilen: { text: string; bilder: Buffer[] }[]) {
  const seite = await browser.newPage({ viewport: { width: 1700, height: 120 }, deviceScaleFactor: 1 });
  const zelle = 410;
  const html = `<html><body style="margin:0;background:#1a222b;font:600 17px system-ui;color:#e8f0c8">
    <div style="padding:10px 14px">${titel}</div>
    <div style="display:grid;grid-template-columns:90px repeat(${spalten.length},${zelle}px);gap:5px;padding:0 6px 6px;align-items:center">
    <div></div>${spalten.map((s) => `<div style="padding:2px 6px">${s}</div>`).join('')}
    ${zeilen.map((z) => `<div style="padding:0 6px">${z.text}</div>${z.bilder.map((b) => `<img src="data:image/png;base64,${b.toString('base64')}" style="display:block;width:${zelle}px">`).join('')}`).join('')}
    </div></body></html>`;
  await seite.setContent(html);
  await seite.waitForTimeout(200);
  await seite.screenshot({ path: path.join(bilder, datei), fullPage: true });
  await seite.close();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Bauweise rund: Tab, Umriss, grob beim Ziehen und fein beim Loslassen, Umschalter zum Schnitt-Loft', async ({ page }) => {
  const fehler: string[] = [];
  page.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  page.on('pageerror', (e) => fehler.push(e.message));
  await laden(page, 'wesen=langhals');
  await expect(label(page)).toHaveText('Versuch: rund');
  await expect(page.locator('[data-view="creation"] [data-bauweise="rund"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.leiste [data-rundbereich]')).toBeVisible();
  await expect.poll(() => page.locator('[data-rundumriss]').count()).toBeGreaterThanOrEqual(3);
  const info = page.locator('.leiste [data-rundinfo]');
  await expect(info).toHaveAttribute('data-rundgrob', '0');

  // Ziehen an einem Punkt der Seite: grob während der Geste, fein beim Loslassen
  const knoten = page.locator('.vp-ober[data-view="seite"] [data-knoten="2"] .knoten-punkt');
  const b = (await knoten.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 8, b.y + b.height / 2 - 10, { steps: 4 });
  await expect(info).toHaveAttribute('data-rundgrob', '1');
  await page.mouse.up();
  await expect(info).toHaveAttribute('data-rundgrob', '0');
  await page.keyboard.press('ControlOrMeta+z');

  // Umschalter: Schnitt-Loft vom Vormittag, Tab bleibt „rund“; zurück
  const v = await vertices(page);
  await page.locator('.leiste [data-bauweisewahl="schnitte"]').click();
  await expect(label(page)).toHaveText('Versuch: Schnitte');
  await expect(page.locator('[data-view="creation"] [data-bauweise="rund"]')).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => vertices(page)).not.toBe(v);
  await page.locator('.leiste [data-bauweisewahl="rund"]').click();
  await expect(label(page)).toHaveText('Versuch: rund');

  // zur bisherigen Bauweise
  await page.click('[data-view="creation"] [data-bauweise="bisher"]');
  await expect(page.locator('[data-rundumriss]')).toHaveCount(0);
  await expect(page.locator('.leiste [data-rundbereich]')).toHaveCount(0);
  expect(fehler).toEqual([]);
});

test('Bilder: creation, wirbelsäule, Schnitt-Loft und rund (seitlich, schräg, von oben)', async ({ page, browser }) => {
  test.setTimeout(600_000);
  const wesenListe: [string, number, number, string][] = [
    ['langhals', 2.7, 0.38, 'Langhals'],
    ['ueberhang', 2.15, 0.3, 'Florians Überhang (13.10.)'],
    ['rex', 2.0, 0.18, 'Rex'],
    ['tiger', 2.15, 0.26, 'Tiger'],
    ['robbe', 2.15, 0.26, 'Robbe'],
    ['kugel', 2.15, 0.26, 'Kugel'],
  ];
  const ansichten: [string, number, number][] = [
    ['seitlich', 0, 0],
    ['schräg', -40, 14],
    ['von oben', 0, 89],
  ];
  for (const [wesen, distanz, zielY, titel] of wesenListe) {
    await laden(page, `wesen=${wesen}&bauweise=bisher`);
    const zeilen = ansichten.map(([text]) => ({ text, bilder: [] as Buffer[] }));
    for (const [wert] of BAUWEISEN) {
      await bauweise(page, wert);
      for (let a = 0; a < ansichten.length; a++) {
        const [, az, el] = ansichten[a]!;
        await kamera(page, az, el, el > 80 ? distanz * 0.95 : distanz, el > 80 ? 0 : zielY);
        zeilen[a]!.bilder.push(await bild3d(page));
      }
    }
    await raster(
      browser,
      `rund-${wesen}.png`,
      `${titel}: creation, wirbelsäule, Schnitt-Loft (13.10. vormittags) und rund (13.10. nachmittags)`,
      BAUWEISEN.map((b) => b[1]),
      zeilen,
    );
  }
});

test('Bild: Haken im Top als Seitenteile (Florians Überhang)', async ({ page, browser }) => {
  test.setTimeout(240_000);
  await laden(page, 'wesen=ueberhang&bauweise=bisher');
  const felder: { text: string; bilder: Buffer[] }[] = [
    { text: 'von oben', bilder: [] },
    { text: 'schräg hinten', bilder: [] },
  ];
  for (const [wert] of [BAUWEISEN[0], BAUWEISEN[2], BAUWEISEN[3]]) {
    await bauweise(page, wert);
    if (wert === 'rund') await expect(page.locator('.leiste [data-rundseitenteile]')).toHaveAttribute('data-rundseitenteile', '1');
    await kamera(page, 0, 89, 2.0, 0);
    felder[0]!.bilder.push(await bild3d(page));
    await kamera(page, 145, 32, 1.7, 0.2);
    felder[1]!.bilder.push(await bild3d(page));
  }
  await raster(browser, 'rund-haken.png', 'Haken im Top: creation füllt die Kerbe, der Schnitt-Loft macht Platten, rund baut die Widerhaken als eigene Teile (Kerbe bleibt Luft)', ['creation', 'Schnitt-Loft', 'rund'], felder);
});
