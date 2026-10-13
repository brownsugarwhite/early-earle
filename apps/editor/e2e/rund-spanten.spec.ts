// Versuch 13.10. nachmittags, Meilenstein 2: Spanten der Bauweise „rund“. Werkzeug S in der Seite: Klick setzt einen
// Spant quer über das Teil (beim senkrechten Hals waagerecht), eine Linie über Schnauze und Bauch gibt zwei getrennte
// Spanten. Der gewählte Spant wird in der Front als Schnitt bearbeitet; das 3D folgt. Bilder: rund-spanten*.png.
import { type Browser, type Page, expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const bilder = path.resolve(hier, '../../../docs/progress/editor');

type V2 = { x: number; y: number };
type Kamera = { azimut: number; elevation: number; distanz: number; ziel: [number, number, number] };
type Fenster = Window & {
  __editor?: { vertices: () => number };
  __stores: {
    editor: {
      getState(): {
        dok: { profile: { seite: { knoten: { p: V2 }[] } }; rundSpanten?: { p: V2; richtung: V2; profil: { knoten: { p: V2; ein: V2; aus: V2; art: string }[] } }[] };
        setzeRundSpanten(l: unknown[]): void;
      };
    };
    ui: { getState(): { rundSpantAuswahl: { spant: number } | null; setzeZebra(an: boolean): void }; setState(s: Partial<{ kamera: Kamera }>): void };
    rahmen: { getState(): { rects: Record<string, { x: number; y: number; w: number; h: number }> } };
  };
};

async function laden(page: Page, wesen: string) {
  await page.goto(`/?versuch=rund&wesen=${wesen}`);
  await page.waitForFunction(() => ((window as unknown as Fenster).__editor?.vertices() ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}
const dok = (page: Page) => page.evaluate(() => (window as unknown as Fenster).__stores.editor.getState().dok);

/** Welt → Bildschirm in der Seite (gleichmäßiger Maßstab, aus den Knoten der Seite gemessen). */
async function seiteAbbildung(page: Page) {
  const welt = (await dok(page)).profile.seite.knoten.map((k) => k.p);
  const bild = await page.locator('.vp-ober[data-view="seite"] [data-knoten] .knoten-punkt').evaluateAll((els) =>
    els.map((e) => {
      const b = e.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }),
  );
  const n = Math.min(welt.length, bild.length);
  const mw = welt.slice(0, n).reduce((a, p) => ({ x: a.x + p.x / n, y: a.y + p.y / n }), { x: 0, y: 0 });
  const mb = bild.slice(0, n).reduce((a, p) => ({ x: a.x + p.x / n, y: a.y + p.y / n }), { x: 0, y: 0 });
  let zaehler = 0;
  let nenner = 0;
  for (let i = 0; i < n; i++) {
    zaehler += (bild[i]!.x - mb.x) * (welt[i]!.x - mw.x) - (bild[i]!.y - mb.y) * (welt[i]!.y - mw.y);
    nenner += (welt[i]!.x - mw.x) ** 2 + (welt[i]!.y - mw.y) ** 2;
  }
  const s = zaehler / nenner;
  return (w: V2) => ({ x: mb.x + (w.x - mw.x) * s, y: mb.y - (w.y - mw.y) * s });
}

async function kamera(page: Page, azimutGrad: number, elevationGrad: number, distanz: number, zielY: number) {
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

async function raster(browser: Browser, datei: string, titel: string, felder: { bild: Buffer; text: string }[]) {
  const seite = await browser.newPage({ viewport: { width: 1740, height: 120 }, deviceScaleFactor: 1 });
  const html = `<html><body style="margin:0;background:#1a222b;font:600 17px system-ui;color:#e8f0c8">
    <div style="padding:10px 14px">${titel}</div>
    <div style="display:grid;grid-template-columns:repeat(${felder.length},auto);gap:6px;padding:0 6px 6px">
    ${felder.map((f) => `<div style="position:relative"><img src="data:image/png;base64,${f.bild.toString('base64')}" style="display:block;width:420px"><div style="position:absolute;left:10px;top:8px;background:#1a222bcc;padding:3px 8px;border-radius:6px">${f.text}</div></div>`).join('')}
    </div></body></html>`;
  await seite.setContent(html);
  await seite.waitForTimeout(200);
  await seite.screenshot({ path: path.join(bilder, datei), fullPage: true });
  await seite.close();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Spanten rund: Hals-Spant quer setzen, in der Front bearbeiten, zwei Spanten über Schnauze und Bauch', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const fehler: string[] = [];
  page.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  page.on('pageerror', (e) => fehler.push(e.message));
  await laden(page, 'langhals');
  await kamera(page, -35, 12, 1.25, 0.45);
  const vorher = await bild3d(page);
  const seite = await seiteAbbildung(page);

  // S, Klick in die Mitte des Halses: ein Spant quer zum Hals (waagerecht)
  await page.keyboard.press('s');
  const q = seite({ x: -0.015, y: 0.45 });
  await page.mouse.click(q.x, q.y);
  let d = await dok(page);
  expect(d.rundSpanten).toHaveLength(1);
  expect(Math.abs(d.rundSpanten![0]!.richtung.y)).toBeLessThan(0.35);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-rundspant="0"]')).toHaveCount(1);
  await expect(page.locator('.vp-ober[data-view="front"] [data-rundschnitt="0"]')).toHaveCount(1);
  await expect(page.locator('.leiste [data-rundspanten="1"]')).toBeVisible();

  // mittleren Punkt im Schnitt nach außen ziehen: kastiger Hals
  const k = (await page.locator('.vp-ober[data-view="front"] [data-rundknoten="1"] circle').first().boundingBox())!;
  const info = page.locator('.leiste [data-rundinfo]');
  const stand0 = await info.getAttribute('data-rundinfo');
  await page.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await page.mouse.down();
  await page.mouse.move(k.x + k.width / 2 + 28, k.y + k.height / 2, { steps: 5 });
  await page.mouse.up();
  d = await dok(page);
  expect(d.rundSpanten![0]!.profil.knoten[1]!.p.x).toBeGreaterThan(1.05);
  await expect(info).toHaveAttribute('data-rundgrob', '0');
  await page.waitForTimeout(800);
  expect(await info.getAttribute('data-rundinfo')).not.toBeNull();
  void stand0;
  await page.screenshot({ path: path.join(bilder, 'rund-spant-hals-editor.png') });
  const breiter = await bild3d(page);

  // Rückgängig nimmt das Ziehen zurück
  await page.keyboard.press('ControlOrMeta+z');
  d = await dok(page);
  expect(d.rundSpanten![0]!.profil.knoten[1]!.p.x).toBeLessThan(1.05);

  // zweiter Spant oben am Hals; beide Schnitte als Kasten mit runden Ecken (gleiche Breite wie rund): dazwischen
  // wird Punkt für Punkt überblendet, der Hals ist dort eckig
  await page.keyboard.press('s');
  const q2 = seite({ x: -0.02, y: 0.53 });
  await page.mouse.click(q2.x, q2.y);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-rundspant]')).toHaveCount(2);
  await page.evaluate(() => {
    const st = (window as unknown as Fenster).__stores.editor.getState();
    const kastig = (sp: NonNullable<typeof st.dok.rundSpanten>[number]) => ({
      ...sp,
      profil: {
        ...sp.profil,
        knoten: sp.profil.knoten.map((k, i) =>
          i === 0 ? { ...k, ein: { x: 0.85, y: 0 }, aus: { x: 0.85, y: 0 } } : i === sp.profil.knoten.length - 1 ? { ...k, ein: { x: 0.85, y: 0 }, aus: { x: 0.85, y: 0 } } : { ...k, p: { x: 1, y: 0.5 }, ein: { x: 0, y: 0.42 }, aus: { x: 0, y: -0.42 } },
        ),
      },
    });
    st.setzeRundSpanten(st.dok.rundSpanten!.map(kastig));
  });
  await page.waitForTimeout(900);
  const kasten = await bild3d(page);
  await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().setzeZebra(true));
  await page.waitForTimeout(500);
  const zebra = await bild3d(page);
  await page.evaluate(() => (window as unknown as Fenster).__stores.ui.getState().setzeZebra(false));
  await raster(browser, 'rund-spanten.png', 'Spanten quer zum Hals: R1 im Schnitt breiter gezogen; R1 und R2 als Kasten (dazwischen Punkt für Punkt überblendet)', [
    { bild: vorher, text: 'ohne Spant' },
    { bild: breiter, text: 'R1 breiter gezogen' },
    { bild: kasten, text: 'R1, R2 kastig' },
    { bild: zebra, text: 'R1, R2 kastig, Zebra' },
  ]);

  // Florians Überhang: senkrechte Linie über Schnauze und Bauch → zwei getrennte Spanten
  await laden(page, 'ueberhang');
  const s2 = await seiteAbbildung(page);
  await page.keyboard.press('s');
  const a = s2({ x: -0.22, y: -0.04 });
  const b = s2({ x: -0.22, y: 0.78 });
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
  d = await dok(page);
  expect(d.rundSpanten).toHaveLength(2);
  await expect(page.locator('.vp-ober[data-view="seite"] [data-rundspant]')).toHaveCount(2);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(bilder, 'rund-spanten-ueberhang-editor.png') });
  expect(fehler).toEqual([]);
});
