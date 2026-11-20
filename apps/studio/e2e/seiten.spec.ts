// Die vier Seiten von Studio stehen (Plan 2.4, 5.3), in Chromium und WebKit: Editor mit Papier und Titel „Studio“ in Lobster, die
// Messseite mit COOP und COEP (crossOriginIsolated, 8.2), Prüfseite und P1; keine Seite meldet einen Fehler. Das Bild des Editors
// liegt in den Ausgaben des Laufs. Das Bild der Probe M0 (a), docs/progress/studio/m0-leer.png, macht scripts/proben/m0-vertrag.mjs.
import { expect, type Page, test } from '@playwright/test';

/** Sammelt Fehler der Seite: Ausnahmen und console.error */
function fehlerSammeln(page: Page): string[] {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(`Ausnahme: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') fehler.push(`console.error: ${m.text()}`);
  });
  return fehler;
}

/** Zwei Bilder abwarten: das erste zeichnet über das erste Prüfbild (7.3) */
async function zweiBilder(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((fertig) => requestAnimationFrame(() => requestAnimationFrame(() => fertig()))),
  );
}

test('Editor: Papier, Titel „Studio“ in Lobster, Bühne', async ({ page }, info) => {
  const fehler = fehlerSammeln(page);
  await page.goto('/');
  // main.ts setzt data-schrift, sobald Lobster geladen ist („fehlt“, wenn nicht)
  await expect(page.locator('html')).toHaveAttribute('data-schrift', 'geladen');
  const lobster = await page.evaluate(() => {
    let geladen = false;
    document.fonts.forEach((f) => {
      if (f.family.replace(/["']/g, '') === 'Lobster' && f.status === 'loaded') geladen = true;
    });
    return geladen;
  });
  expect(lobster).toBe(true);
  const titel = page.locator('#kopfzeile h1');
  await expect(titel).toHaveText('Studio');
  expect(await titel.evaluate((h) => getComputedStyle(h).fontFamily)).toMatch(/^["']?Lobster\b/);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  await expect(page.locator('#buehne')).toBeAttached();
  await zweiBilder(page);
  const bild = info.outputPath('editor.png');
  await page.screenshot({ path: bild });
  await info.attach('Editor', { path: bild, contentType: 'image/png' });
  expect(fehler).toEqual([]);
});

test('Messseite: mit COOP und COEP (crossOriginIsolated)', async ({ page }) => {
  const fehler = fehlerSammeln(page);
  const antwort = await page.goto('/messen.html');
  expect(antwort?.headers()['cross-origin-opener-policy']).toBe('same-origin');
  expect(antwort?.headers()['cross-origin-embedder-policy']).toBe('require-corp');
  expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
  await zweiBilder(page);
  expect(fehler).toEqual([]);
});

for (const seite of ['/pruefen.html', '/p1.html', '/']) {
  test(`${seite} ohne COOP und COEP, ohne Fehler`, async ({ page }) => {
    const fehler = fehlerSammeln(page);
    const antwort = await page.goto(seite);
    expect(antwort?.ok()).toBe(true);
    // nur die Messseite ist abgeschottet (2.4)
    expect(antwort?.headers()['cross-origin-embedder-policy']).toBeUndefined();
    await zweiBilder(page);
    expect(fehler).toEqual([]);
  });
}
