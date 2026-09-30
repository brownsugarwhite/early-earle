import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { applyMove, classicLevel, classicSeed, createState, DIRS, parseKlassikFormats, type Dir, type LevelState } from '@ee/core';

// Klassik-2048 (Iteration 4, Baustelle 6): Einstieg auf der Karte → Format-Blatt → 4×4 am aktuellen Knoten → per
// Tastatur bis „Kein Zug mehr“ → Bestwert gespeichert → zurück auf die Karte. Läuft wie die Flow-Tests auf
// SwiftShader/WebGL2. Frischer Klassik-Speicher = fester Seed: das erste 4×4-Brett ist immer dasselbe, der Test
// rechnet mit dem Regelwerk vorab einen kurzen Weg ins „Kein Zug mehr“ aus und spielt ihn Taste für Taste.

// SwiftShader: die Anflüge (Pipelines kompilieren nebenher) dauern unter Last deutlich länger als auf einer GPU.
const TRANSITION_MS = process.env.CI ? 240_000 : 180_000;
test.setTimeout(process.env.CI ? 900_000 : 720_000);

/** Freier Stand (Entwicklung): alle Formate offen, der Held steht auf Knoten 3 (Level 4). */
const FREE_PROGRESS = JSON.stringify({ version: 2, mode: 'free', slots: { free: { reached: 30, current: 3 }, real: {} } });
const KEY: Record<Dir, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

/** Paare gleicher Nachbarn (je weniger, desto schneller ist das Brett voll und blockiert). */
function pairs(s: LevelState): number {
  const { w, h } = s.geo;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = s.tiers[y * w + x]!;
      if (!t) continue;
      if (x + 1 < w && s.tiers[y * w + x + 1] === t) n++;
      if (y + 1 < h && s.tiers[(y + 1) * w + x] === t) n++;
    }
  }
  return n;
}

/**
 * Der Weg ins „Kein Zug mehr“ für das erste 4×4-Brett (Durchgang 0, Versuch 1 — wie im Spiel): je Zug die Richtung
 * mit den wenigsten Verschmelzungen und den wenigsten gleichen Nachbarn danach.
 */
function losingPlan(): { dirs: Dir[]; score: number } {
  const file = parseKlassikFormats(JSON.parse(readFileSync(new URL('../../../content/klassik/formats.json', import.meta.url), 'utf8')));
  const format = file.formats.find((f) => f.id === '4x4')!;
  let state = createState(classicLevel(format, 'tjorizo'), (classicSeed('4x4', 0) + 1) | 0);
  const dirs: Dir[] = [];
  while (state.status === 'playing' && dirs.length < 400) {
    let best: { dir: Dir; state: LevelState; key: number } | null = null;
    for (const dir of DIRS) {
      const res = applyMove(state, dir);
      if (!res) continue;
      const key = res.mergeCount * 100 + pairs(res.state);
      if (!best || key < best.key) best = { dir, state: res.state, key };
    }
    if (!best) break;
    dirs.push(best.dir);
    state = best.state;
  }
  expect(state.status).toBe('lost');
  return { dirs, score: state.score };
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function waitForRenderer(page: Page): Promise<void> {
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
}

/** Zähler der gespielten Züge (Dev-Server: dasselbe Modul wie im Spiel). */
function moveSeq(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const url = '/src/lab/grid/gridStore.ts';
    const m = (await import(/* @vite-ignore */ url)) as { useGridStore: { getState(): { moveSeq: number } } };
    return m.useGridStore.getState().moveSeq;
  });
}

function gridSession(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const url = '/src/lab/grid/gridStore.ts';
    const m = (await import(/* @vite-ignore */ url)) as { useGridStore: { getState(): { session: string } } };
    return m.useGridStore.getState().session;
  });
}

test('Klassik: Blatt, 4×4 am Knoten bis „Kein Zug mehr“, Bestwert gespeichert, zurück auf die Karte', async ({ page }) => {
  const plan = losingPlan();
  const errors = collectErrors(page);
  await page.addInitScript((p) => localStorage.setItem('ee.progress.v2', p), FREE_PROGRESS);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/play');
  await waitForRenderer(page);
  const hud = page.getByTestId('flow-hud');
  const top = page.getByTestId('hud-top');
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
  await expect(top).toContainText('Level 4');

  // Einstieg: leuchtet, bis das Blatt die neuen Formate gezeigt hat; im freien Stand sind alle sieben offen.
  const entry = page.getByTestId('entry-classic');
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute('data-highlight', 'true');
  await entry.click();
  const sheet = page.getByTestId('klassik-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.kl-card')).toHaveCount(7);
  await expect(sheet.locator('.kl-card[data-locked="true"]')).toHaveCount(0);
  await expect(entry).toHaveAttribute('data-highlight', 'false');

  // 4×4 am aktuellen Knoten: Anflug wie ins Level, HUD mit Punkten statt Zügen, kein Rückspulen.
  await page.getByTestId('klassik-format-4x4').click();
  await expect(sheet).toHaveCount(0);
  await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: TRANSITION_MS });
  await expect(top).toContainText('Klassik 4×4');
  await expect(top).toContainText('Bestwert 0');
  await expect(top.locator('.hud-stat span')).toHaveText('Punkte');
  await expect(top.locator('.hud-goal')).toHaveCount(0);
  await expect(page.getByTestId('rewind-btn')).toBeDisabled();

  // Taste für Taste; jeder Wisch wird genau ein Zug (während ein Zug spielt, hält der Store den nächsten vor).
  const banner = page.locator('.hud-banner-flow');
  for (const [i, dir] of plan.dirs.entries()) {
    const before = await moveSeq(page);
    await page.keyboard.press(KEY[dir]);
    await expect.poll(() => moveSeq(page), { message: `Zug ${i + 1} (${dir})`, timeout: 60_000 }).toBeGreaterThan(before);
  }
  await expect(banner).toContainText('Kein Zug mehr', { timeout: 60_000 });
  await expect(top.locator('.hud-stat b')).toHaveText(String(plan.score));
  await expect(top).toContainText(`Bestwert ${plan.score}`);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ee.klassik.v1') ?? 'null') as { slots: Record<string, { best: Record<string, number>; runs: Record<string, number> }> } | null);
  expect(saved?.slots.free?.best['4x4']).toBe(plan.score);
  expect(saved?.slots.free?.runs['4x4']).toBe(1);
  expect(saved?.slots.real?.best['4x4']).toBeUndefined();

  // Zurück auf die Karte: wieder die Geschichte; das Blatt zeigt den Bestwert.
  await page.getByTestId('map-btn').click();
  await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: TRANSITION_MS });
  await expect(top).toContainText('Level 4');
  expect(await gridSession(page)).toBe('story');
  await entry.click();
  await expect(page.getByTestId('klassik-best-4x4')).toHaveText(String(plan.score));
  await page.getByTestId('klassik-close').click();
  await expect(page.getByTestId('klassik-sheet')).toHaveCount(0);
  expect(errors).toEqual([]);
});
