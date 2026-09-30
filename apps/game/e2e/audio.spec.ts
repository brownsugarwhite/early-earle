import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Audio layer: the lab unlocks the AudioContext on the first click without errors; /play shows the sound
// toggle and remembers it (localStorage `ee.audio.v1`). EE_AUDIO_PREVIEWS=1 also renders the WAV previews
// offline into docs/progress/audio/.

// SwiftShader: /play reaches the map twice (reload) — generous locally too, like the flow spec.
const TRANSITION_MS = process.env.CI ? 45_000 : 45_000;
test.setTimeout(process.env.CI ? 180_000 : 180_000);

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test('/lab/audio lädt; ein Klick startet den AudioContext ohne Fehler', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/lab/audio');
  const lab = page.getByTestId('audio-lab');
  await expect(lab).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Audio-Lab' })).toBeVisible();
  // No context before the first gesture (autoplay rules, iOS).
  await expect(lab).toHaveAttribute('data-ctx-state', 'none');
  await page.getByTestId('sfx-slide').click();
  await expect(lab).toHaveAttribute('data-ctx-state', 'running');
  // A move through the real planner, a merge, REX and the win stinger: voices start, nothing breaks.
  await page.getByTestId('sfx-merge').click();
  await page.getByTestId('rex-say').click();
  await page.getByTestId('sfx-won').click();
  await page.getByTestId('music-toggle').click();
  await page.getByTestId('ambient-toggle').click();
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('audio-stats')).toContainText('Musik tjorizo');
  const started = await page.evaluate(() => (window as unknown as { __eeAudio?: { stats: () => { started: number } } }).__eeAudio?.stats().started ?? -1);
  expect(started).toBeGreaterThan(3);
  expect(errors).toEqual([]);
});

test('/play zeigt den Ton-Schalter; er schaltet stumm und bleibt nach dem Neuladen', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/play');
  const hud = page.getByTestId('flow-hud');
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
  const toggle = page.getByTestId('sound-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('data-muted', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-muted', 'true');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ee.audio.v1') ?? '{}').muted)).toBe(true);
  await page.reload();
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
  await expect(page.getByTestId('sound-toggle')).toHaveAttribute('data-muted', 'true');
  // Unmuting is itself the gesture that starts the audio.
  await page.getByTestId('sound-toggle').click();
  await expect(page.getByTestId('sound-toggle')).toHaveAttribute('data-muted', 'false');
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __eeAudio?: { stats: () => { state: string } } }).__eeAudio?.stats().state ?? 'none'), { timeout: 5_000 })
    .toBe('running');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ee.audio.v1') ?? '{}').muted)).toBe(false);
  expect(errors).toEqual([]);
});

const PREVIEWS = ['merge-chain', 'splash', 'leap-merge', 'rex-babble', 'ambient-10s', 'music-20s', 'win-lose', 'specials-blockers'];

test.describe('WAV-Vorschauen', () => {
  test.skip(!process.env.EE_AUDIO_PREVIEWS, 'nur mit EE_AUDIO_PREVIEWS=1');
  for (const id of PREVIEWS) {
    test(`rendert ${id}.wav`, async ({ browser }) => {
      // A fresh context per file: browsers hold back a second automatic download from the same page.
      const ctx = await browser.newContext({ acceptDownloads: true });
      const page = await ctx.newPage();
      const errors = collectErrors(page);
      await page.goto('/lab/audio');
      await expect(page.getByTestId('audio-lab')).toBeVisible();
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId(`wav-${id}`).click()]);
      const dir = fileURLToPath(new URL('../../../docs/progress/audio/', import.meta.url));
      mkdirSync(dir, { recursive: true });
      await download.saveAs(`${dir}${id}.wav`);
      expect(errors).toEqual([]);
      await ctx.close();
    });
  }
});
