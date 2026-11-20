// Das Spiel steht (Plan 2.4, 5.3), in Chromium und WebKit (iPhone 16): Titel „Gassirunde“ in Lobster, die Fläche füllt den
// Bildschirm in Bildpunkten des Geräts, keine Fehler. Das Bild liegt in den Ausgaben des Laufs. M6.2 baut Laden, Eingabe und Hülle.
import { expect, test } from '@playwright/test';

test('Spiel: Titel in Lobster, Fläche über den ganzen Bildschirm', async ({ page }, info) => {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(`Ausnahme: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') fehler.push(`console.error: ${m.text()}`);
  });
  await page.goto('/');
  // main.ts setzt data-schrift, sobald Lobster geladen ist („fehlt“, wenn nicht)
  await expect(page.locator('html')).toHaveAttribute('data-schrift', 'geladen');
  await expect(page.locator('#titel')).toHaveText('Gassirunde');
  expect(await page.locator('#titel').evaluate((h) => getComputedStyle(h).fontFamily)).toMatch(/^["']?Lobster\b/);
  const flaeche = await page.locator('#flaeche').evaluate((c: HTMLCanvasElement) => ({
    sichtbar: [c.clientWidth, c.clientHeight],
    fenster: [window.innerWidth, window.innerHeight],
    punkte: [c.width, c.height],
    soll: [Math.round(c.clientWidth * window.devicePixelRatio), Math.round(c.clientHeight * window.devicePixelRatio)],
  }));
  expect(flaeche.sichtbar).toEqual(flaeche.fenster);
  expect(flaeche.punkte).toEqual(flaeche.soll);
  const bild = info.outputPath('spiel.png');
  await page.screenshot({ path: bild });
  await info.attach('Spiel', { path: bild, contentType: 'image/png' });
  expect(fehler).toEqual([]);
});
