import { test, expect, type Page } from '@playwright/test';

// Grundformen-Lab /lab/wesen (Wesen-Werkstatt L1): Vermaschung läuft (Info-Zeile), Vorlagen und Regler bauen neu,
// Rückgängig stellt Werte zurück, Speichern ohne Mac landet lokal, Referenzmodus mit Bild, Handy-Sheet.
// Läuft auf dem WebGL2-Rückfall (SwiftShader) wie die anderen; schreibt nichts nach content/ (Endpunkt im
// Speichern-Test gesperrt).

test.setTimeout(process.env.CI ? 300_000 : 180_000);

const PHONE = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
/** Ein Bau samt Kamerafahrt unter SwiftShader (und parallel laufenden Agenten) kann dauern. */
const BAU_MS = 90_000;

/** Ein kleines PNG (im Browser gemalt) als Referenzbild. */
async function testPng(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 120;
    const g = c.getContext('2d')!;
    g.fillStyle = '#d24b3c';
    g.fillRect(0, 0, 160, 120);
    g.fillStyle = '#2c6f8f';
    g.fillRect(40, 30, 80, 60);
    return c.toDataURL('image/png').split(',')[1]!;
  });
  return Buffer.from(b64, 'base64');
}

interface Stats {
  vertices: number;
  triangles: number;
  pending: boolean;
  builds: number;
  fehler: string | null;
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    // Gesperrter Endpunkt (Offline-Test) meldet „Failed to load resource“ — das ist gewollt
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 300));
  });
  return errors;
}

async function stats(page: Page): Promise<Stats> {
  return page.evaluate(() => (window as unknown as { __wesenLab: { controller: { getStats(): Stats } } }).__wesenLab.controller.getStats());
}

/** Zahlen aus der Info-Zeile („9012 Vertices · 18020 Dreiecke · …“). */
async function infoZahlen(page: Page): Promise<{ vertices: number; triangles: number; text: string }> {
  const text = (await page.getByTestId('wesen-lab-info').textContent()) ?? '';
  const m = /(\d+) Vertices · (\d+) Dreiecke/.exec(text);
  return { vertices: m ? Number(m[1]) : 0, triangles: m ? Number(m[2]) : 0, text };
}

/** Wartet auf einen feinen Bau nach `seit` (Zähler der angewandten Bauten) und auf eine ruhige Info-Zeile. */
async function feinGebaut(page: Page, seit = 0): Promise<Stats> {
  await expect
    .poll(
      async () => {
        const s = await stats(page);
        return s.builds > seit && !s.pending && s.vertices > 0;
      },
      { timeout: BAU_MS, intervals: [100, 250, 500] },
    )
    .toBe(true);
  await expect(page.getByTestId('wesen-lab-info')).not.toContainText('fein folgt', { timeout: 10_000 });
  return stats(page);
}

async function oeffne(page: Page, query: string): Promise<void> {
  await page.goto(`/lab/wesen?${query}`);
  await expect(page.getByTestId('wesen-lab')).toBeVisible();
  await page.waitForFunction(() => !!(window as unknown as { __wesenLab?: unknown }).__wesenLab, undefined, { timeout: 60_000 });
}

/** Schieber über den nativen Setter + input-Event (wie ein Zug am Regler, ohne Pixelrechnung). */
async function setzeRegler(page: Page, id: string, value: number): Promise<void> {
  await page.getByTestId(`wl-regler-${id}`).locator('input[type="range"]').evaluate((el, v) => {
    const input = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.describe('Desktop 1200×760', () => {
  test.use({ viewport: { width: 1200, height: 760 } });

  test('lädt: Info-Zeile zeigt Vertices > 0, Vorlagenwechsel ändert die Dreieckszahl', async ({ page }) => {
    const errors = collectErrors(page);
    await oeffne(page, 'vorlage=grundblob&panel=offen');
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 60_000 });
    const s0 = await feinGebaut(page);
    const a = await infoZahlen(page);
    expect(a.vertices).toBeGreaterThan(0);
    expect(a.triangles).toBe(s0.triangles);
    await expect(page.getByTestId('wesen-vorlage')).toHaveValue('grundblob');

    await page.getByTestId('wesen-vorlage').selectOption('keil');
    const s1 = await feinGebaut(page, s0.builds);
    expect(s1.triangles).not.toBe(s0.triangles);
    await expect(page.getByTestId('wesen-lab-info')).toContainText(`${s1.triangles} Dreiecke`);
    expect(s1.fehler).toBeNull();
    // Schnellwahl-Chip lädt ebenso (und markiert sich)
    await page.getByTestId('wesen-vorlage-loch').click();
    await expect(page.getByTestId('wesen-vorlage-loch')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('wesen-vorlage')).toHaveValue('loch');
    const s2 = await feinGebaut(page, s1.builds);
    expect(s2.triangles).not.toBe(s1.triangles);
    expect(errors).toEqual([]);
  });

  test('Regler „Maulhöhe“ baut neu, Rückgängig stellt den Wert (und die Form) zurück, Wiederholen wieder her', async ({ page }) => {
    const errors = collectErrors(page);
    await oeffne(page, 'vorlage=grundblob&panel=offen');
    const s0 = await feinGebaut(page);
    const regler = page.getByTestId('wl-regler-maul.hoehe');
    // Startwert der Vorlage (nicht fest verdrahtet: Vorlagen dürfen sich ändern)
    const start = (await regler.locator('output').textContent())?.trim() ?? '';
    expect(start).toMatch(/^0\.\d\d$/);
    expect(start).not.toBe('0.70');
    await expect(page.getByTestId('wl-undo')).toBeDisabled();

    await setzeRegler(page, 'maul.hoehe', 0.7);
    await expect(regler.locator('output')).toHaveText('0.70');
    const s1 = await feinGebaut(page, s0.builds);
    expect(s1.triangles).not.toBe(s0.triangles);

    await page.getByTestId('wl-undo').click();
    await expect(regler.locator('output')).toHaveText(start);
    const s2 = await feinGebaut(page, s1.builds);
    expect(s2.triangles).toBe(s0.triangles);

    // Tastatur: ⇧⌘Z / Strg+Umschalt+Z wiederholt
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(regler.locator('output')).toHaveText('0.70');
    expect(errors).toEqual([]);
  });

  test('Würfel lässt gesperrte Regler stehen, Zurücksetzen holt die Vorlage', async ({ page }) => {
    await oeffne(page, 'vorlage=keil&panel=offen');
    await feinGebaut(page);
    await page.getByTestId('wl-schloss-maul.hoehe').click();
    await expect(page.getByTestId('wl-schloss-maul.hoehe')).toHaveAttribute('aria-pressed', 'true');
    const vorher = await page.evaluate(() => (window as unknown as { __wesenLab: { store: { getState(): { bauplan: { maul: Record<string, number> } } } } }).__wesenLab.store.getState().bauplan.maul);
    await page.getByTestId('wl-wuerfeln').click();
    const nachher = await page.evaluate(() => (window as unknown as { __wesenLab: { store: { getState(): { bauplan: { maul: Record<string, number> } } } } }).__wesenLab.store.getState().bauplan.maul);
    expect(nachher.hoehe).toBe(vorher.hoehe);
    expect(Object.keys(nachher).some((k) => nachher[k] !== vorher[k])).toBe(true);
    await expect(page.getByTestId('wl-zuruecksetzen')).toBeEnabled();
    await page.getByTestId('wl-zuruecksetzen').click();
    await expect(page.getByTestId('wl-zuruecksetzen')).toBeDisabled();
    const zurueck = await page.evaluate(() => (window as unknown as { __wesenLab: { store: { getState(): { bauplan: { maul: Record<string, number> } } } } }).__wesenLab.store.getState().bauplan.maul);
    expect(zurueck).toEqual(vorher);
  });

  test('Speichern ohne Mac legt einen lokalen Eintrag an (und bietet ihn zum Laden an)', async ({ page }) => {
    const errors = collectErrors(page);
    await page.route('**/__content/**', (r) => r.abort());
    await page.route('**/__content', (r) => r.abort());
    await oeffne(page, 'vorlage=schlange&panel=offen');
    await page.getByTestId('wl-name').fill('E2E Schlänge');
    await expect(page.getByTestId('wl-datei-ziel')).toContainText('content/creatures/vorlagen/e2e-schlaenge.json');
    await page.getByTestId('wl-speichern').click();
    await expect(page.getByTestId('wl-meldung')).toContainText('lokal gesichert', { timeout: 20_000 });
    const lokal = await page.evaluate(() => localStorage.getItem('ee.content.local.creatures/vorlagen/e2e-schlaenge.json'));
    expect(lokal).not.toBeNull();
    const json = (JSON.parse(lokal!) as { json: { schemaVersion: number; name: string; unterkoerper: { typ: string } } }).json;
    expect(json).toMatchObject({ schemaVersion: 1, name: 'E2E Schlänge', unterkoerper: { typ: 'schlange' } });
    await expect(page.getByTestId('wesen-vorlage').locator('option', { hasText: 'e2e-schlaenge.json (lokal)' })).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('Referenzmodus: weißer Grund, Bild mit Deckkraft und Spiegeln; Brett-Ansicht holt die Wiese zurück', async ({ page }) => {
    const errors = collectErrors(page);
    await oeffne(page, 'vorlage=loch&panel=offen');
    await page.getByTestId('wl-referenz').click();
    await expect(page.getByTestId('wesen-lab')).toHaveAttribute('data-boden', 'weiss');
    await expect(page.getByTestId('wl-referenz-bereich')).toBeVisible();
    await page.getByTestId('wl-ref-datei').setInputFiles({ name: 'bogen.png', mimeType: 'image/png', buffer: await testPng(page) });
    const bild = page.getByTestId('wl-ref-bild');
    await expect(bild).toBeVisible();
    await expect(bild).toHaveCSS('opacity', '0.5');
    await expect(bild).toHaveCSS('pointer-events', 'none');
    await page.getByTestId('wl-ref-deckkraft').locator('input[type="range"]').evaluate((el) => {
      const input = el as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '0.8');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(bild).toHaveCSS('opacity', '0.8');
    await page.getByTestId('wl-ref-spiegeln').click();
    await expect(bild).toHaveAttribute('style', /scaleX\(-1\)/);
    await page.getByTestId('wl-ref-bewegen').click();
    await expect(bild).toHaveCSS('pointer-events', 'auto');

    await page.getByTestId('wl-brett').click();
    await expect(page.getByTestId('wesen-lab')).toHaveAttribute('data-ansicht', 'brett');
    await expect(page.getByTestId('wesen-lab')).toHaveAttribute('data-boden', 'wiese');
    await expect(bild).toBeHidden();
    expect(errors).toEqual([]);
  });
});

test.describe('iPhone 393×852', () => {
  test.use(PHONE);

  test('Sheet: zu (Standard) mit Schnellaktionen, halb zeigt Tabs und Regler; Ziele ≥ 44 px, Eingaben 16 px', async ({ page }) => {
    const errors = collectErrors(page);
    await oeffne(page, 'vorlage=vierbeiner');
    const frame = page.getByTestId('lab-frame');
    await expect(frame).toHaveAttribute('data-layout', 'sheet');
    await expect(frame).toHaveAttribute('data-sheet', 'zu');
    await expect(page.getByTestId('lab-sheet')).toBeVisible();
    await expect(page.getByTestId('wl-undo')).toBeVisible();
    await expect(page.getByTestId('wl-tab-koerper')).toBeHidden();

    await page.getByTestId('lab-sheet-toggle').tap();
    await expect(frame).toHaveAttribute('data-sheet', 'halb');
    await expect(page.getByTestId('wl-tab-maul')).toBeVisible();
    await expect(page.getByTestId('wesen-lab-info')).toContainText('Vertices', { timeout: BAU_MS });
    // Die Bühne endet, wo das Sheet beginnt
    const stage = (await page.getByTestId('lab-stage').boundingBox())!;
    const sheet = (await page.getByTestId('lab-sheet').boundingBox())!;
    expect(stage.y + stage.height).toBeLessThanOrEqual(sheet.y + 1);

    await page.getByTestId('wl-tab-koerper').tap();
    await expect(page.getByTestId('wl-regler-koerper.hoehe')).toBeVisible();
    // Ziele im sichtbaren Teil des Sheets: mindestens 44 px hoch; Text-/Auswahlfelder in 16 px (kein iOS-Zoom)
    const zuKlein = await page.evaluate(() => {
      const out: string[] = [];
      const body = document.querySelector('[data-testid="lab-sheet"]')!.getBoundingClientRect();
      for (const el of document.querySelectorAll<HTMLElement>('.wesen-lab .lab-sheet button, .wesen-lab .lab-sheet input, .wesen-lab .lab-sheet select')) {
        if (el.classList.contains('lab-handle')) continue; // Griff des Rahmens (Ziehfläche über die volle Breite)
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.bottom < body.top || r.top > body.bottom) continue;
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden') continue;
        if (r.height < 43.5) out.push(`${el.tagName} ${el.getAttribute('data-testid') ?? el.className} ${Math.round(r.height)} px`);
        if ((el.tagName === 'SELECT' || (el as HTMLInputElement).type === 'text') && parseFloat(st.fontSize) < 16) out.push(`${el.tagName} Schrift ${st.fontSize}`);
      }
      return out;
    });
    expect(zuKlein).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
});
