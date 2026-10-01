import { test, expect, type Page } from '@playwright/test';
import { collectErrors, flowState, nodeOnScreen, request, seedProgress, TRANSITION_MS, waitForRenderer, waitPhase, waitScene, winLevel, type FlowHandles, waitSplashIdle } from './helpers';

// Iteration 4 · Flow und Fortschritt: echter und freier Modus, Intro, Landung auf dem geschafften Knoten und der Weg
// über die Punkte, REX-Szene nach Level 1, gesperrte Knoten, Scroll-Grenze. SwiftShader/WebGL2 wie die anderen Tests;
// EE_GPU=1 läuft auf der echten GPU (schnell, zum Ausprobieren auf dem Mac).
test.setTimeout(process.env.CI ? 420_000 : 360_000);
if (process.env.EE_GPU) test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });

const PHONE = { width: 393, height: 852 };

/**
 * Merkt sich im Seitenkontext alle Phasen und Takte (`flow/cue`) ab jetzt. Zustand meldet einen Phasenwechsel, der
 * in einem anderen Abonnenten ausgelöst wird, zweimal (verschachteltes `set`): gleiche Phasen hintereinander zählen einmal.
 */
async function record(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __eeFlow: FlowHandles; __phases: string[]; __cues: string[] };
    w.__phases = [];
    w.__cues = [];
    w.__eeFlow.flow.subscribe((s, p) => {
      if (s.phase !== p.phase && w.__phases.at(-1) !== s.phase) w.__phases.push(s.phase);
    });
    w.__eeFlow.bus.on('flow/cue', (e) => w.__cues.push((e as { cue: string }).cue));
  });
}
const phases = (page: Page) => page.evaluate(() => (window as unknown as { __phases: string[] }).__phases);
const cues = (page: Page) => page.evaluate(() => (window as unknown as { __cues: string[] }).__cues);

interface TravelLogLike {
  mode: string;
  from: number;
  to: number;
  stops: Array<{ dot: number; u: number }>;
  landings: Array<{ dot: number; u: number; distance: number }>;
}
const travelLog = (page: Page) => page.evaluate(() => (window as unknown as { __ee: { controller: { travelLog: TravelLogLike | null } } }).__ee.controller.travelLog);
const scrollState = (page: Page) => page.evaluate(() => (window as unknown as { __ee: { controller: { scrollState(): { excess: number; distance: number; margin: number } | null } } }).__ee.controller.scrollState());

test('Erster Start (echt): Tippen → Intro direkt in Level 1 → Sieg → Landung, Weg zum nächsten Knoten, REX erzählt', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize(PHONE);
  await page.goto('/?quality=mobil');
  await waitForRenderer(page);
  await waitPhase(page, 'splash');
  await waitSplashIdle(page);
  await record(page);
  await page.mouse.click(PHONE.width / 2, PHONE.height * 0.8);
  await waitPhase(page, 'level');
  // Straight into the first level: no hop, no map before it
  expect(await phases(page)).toEqual(['intro', 'level']);
  let s = await flowState(page);
  expect(s.mode).toBe('real');
  expect(s.playing).toBe(0);
  expect(s.seen.intro).toBe(true);
  // The swipe hint shows the first merging swipe and goes with the first key
  const hint = page.getByTestId('swipe-hint');
  await expect(hint).toBeVisible({ timeout: TRANSITION_MS });
  const dir = await hint.getAttribute('data-dir');
  const keys: Record<string, string> = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
  await page.keyboard.press(keys[dir!]!);
  await expect(hint).toHaveCount(0);
  await winLevel(page);
  // Win → depart (the hero pops out, lands on the completed node) → travel (hops along the dots) → map
  await waitPhase(page, 'map');
  expect(await phases(page)).toEqual(['intro', 'level', 'depart', 'travel', 'map']);
  const cs = await cues(page);
  expect(cs).toContain('heroLand');
  expect(cs).toContain('nodeUnlock');
  expect(cs.indexOf('heroLand')).toBeLessThan(cs.indexOf('hop'));
  s = await flowState(page);
  expect(s.current).toBe(1);
  expect(s.reached).toBe(1);
  await expect(page.getByTestId('hud-top').locator('h1')).toContainText('Level 2');
  // REX tells the scene after level 1; a tap on his line turns the page until it ends
  await expect.poll(async () => (await flowState(page)).story, { timeout: TRANSITION_MS }).toBe('afterLevel1');
  const line = page.getByTestId('rex-line');
  await expect(line).toHaveAttribute('data-story', 'afterLevel1', { timeout: TRANSITION_MS });
  const seenLines: string[] = [];
  for (let i = 0; i < 8 && (await flowState(page)).story; i++) {
    const text = (await flowState(page)).rex ?? '';
    if (!seenLines.includes(text)) seenLines.push(text);
    await line.click();
    await page.waitForTimeout(250);
  }
  expect(seenLines.length).toBeGreaterThanOrEqual(3);
  s = await flowState(page);
  expect(s.story).toBeNull();
  expect(s.seen.stories).toContain('afterLevel1');
  await expect(line).not.toHaveAttribute('data-story', /.+/);
  expect(errors).toEqual([]);
});

test('Echt, erreicht bis Knoten 2: Knoten 5 bleibt zu (Wackeln, REX sagt warum), Knoten 2 fliegt an', async ({ page }) => {
  const errors = collectErrors(page);
  await seedProgress(page, 'real', { real: { reached: 2, current: 2, seen: { intro: true, stories: ['afterLevel1'] } } });
  await page.setViewportSize(PHONE);
  await page.goto('/play?quality=mobil');
  await waitForRenderer(page);
  await waitPhase(page, 'map');
  await record(page);
  const before = (await flowState(page)).rex;
  const p5 = await nodeOnScreen(page, 5);
  if (p5) await page.mouse.click(p5.x, p5.y);
  else await request(page, 'flyIn', 5);
  await expect.poll(() => cues(page), { timeout: TRANSITION_MS }).toContain('locked');
  const wobble = await page.evaluate(() => (window as unknown as { __ee: { controller: { nodePath: { uWobble: { value: { x: number } } } } } }).__ee.controller.nodePath.uWobble.value.x);
  expect(wobble).toBe(5);
  const after = await flowState(page);
  expect(after.rex).toBeTruthy();
  expect(after.rex).not.toBe(before);
  await waitScene(page, 1);
  expect((await flowState(page)).phase).toBe('map');
  expect(await phases(page)).toEqual([]);
  // The reached node opens as always
  await page.getByTestId('play-btn').click();
  await waitPhase(page, 'level');
  expect((await flowState(page)).playing).toBe(2);
  expect(errors).toEqual([]);
});

test('Echt: die Karte dreht nur begrenzt und federt nach einem weiten Zug zurück', async ({ page }) => {
  const errors = collectErrors(page);
  await seedProgress(page, 'real', { real: { reached: 3, current: 3, seen: { intro: true, stories: ['afterLevel1'] } } });
  await page.setViewportSize(PHONE);
  await page.goto('/play?quality=mobil');
  await waitForRenderer(page);
  await waitPhase(page, 'map');
  const start = await scrollState(page);
  expect(start).not.toBeNull();
  expect(start!.excess).toBe(0);
  expect(start!.margin).toBe(2.5);
  // Far drags across the screen: the rubber band holds the view close to the path while the finger is down
  let peak = 0;
  // Der Zug beginnt über der unteren HUD-Leiste (bei y ≈ 775–840 liegt „Spielen“: dort käme der Zeiger nie zur Karte)
  for (let k = 0; k < 2; k++) {
    // Start in der freien Kartenfläche (unten liegen Knopfleiste und REX-Zeile, links die Entwicklerleiste)
    await page.mouse.move(330, 640);
    await page.mouse.down();
    for (let i = 1; i <= 16; i++) await page.mouse.move(330 - (i * 280) / 16, 640 - (i * 560) / 16);
    peak = Math.max(peak, (await scrollState(page))!.excess);
    await page.mouse.up();
  }
  expect(peak).toBeGreaterThan(0.3);
  expect(peak).toBeLessThan(12);
  // After letting go it springs back within the margin (2 s of scene time)
  await waitScene(page, 2);
  const end = await scrollState(page);
  expect(end!.excess).toBeLessThan(0.05);
  expect(errors).toEqual([]);
});

test('Frei (?mode=free): Knoten 50 öffnet sein Level wie bisher, das Frei-Schild ist da', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize(PHONE);
  await page.goto('/play?mode=free&level=51&quality=mobil');
  await waitForRenderer(page);
  await waitPhase(page, 'map');
  const s = await flowState(page);
  expect(s.mode).toBe('free');
  expect(s.current).toBe(50);
  await expect(page.getByTestId('mode-tag')).toBeVisible();
  // Free mode pans the endless plane: no scroll limit
  expect(await scrollState(page)).toBeNull();
  await page.getByTestId('play-btn').click();
  await waitPhase(page, 'level');
  expect((await flowState(page)).playing).toBe(50);
  expect(errors).toEqual([]);
});

test('Weg: bei jeder Landung steht der Held auf einem Pfadpunkt, zuletzt auf dem nächsten Knoten', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize(PHONE);
  await page.goto('/play?mode=free&level=11&quality=mobil');
  await waitForRenderer(page);
  await waitPhase(page, 'map');
  await record(page);
  // Dev "Depart" on the map: the walk alone (node 10 → 11)
  await request(page, 'depart');
  await expect.poll(() => phases(page), { timeout: TRANSITION_MS }).toEqual(['travel', 'map']);
  const log = await travelLog(page);
  expect(log).not.toBeNull();
  expect(log!.mode).toBe('hops');
  expect(log!.from).toBe(10);
  expect(log!.to).toBe(11);
  expect(log!.landings.length).toBe(log!.stops.length);
  expect(log!.stops.length).toBeGreaterThanOrEqual(2);
  expect(log!.stops.length).toBeLessThanOrEqual(10);
  for (const l of log!.landings) expect(l.distance).toBeLessThan(0.1);
  expect(log!.landings.at(-1)!.dot).toBe(-1);
  expect((await flowState(page)).current).toBe(11);
  const onNode = await page.evaluate(() => {
    // ADR 0002: die Pose liegt auf der Ebene, der Held auf der Anzeige
    const c = (window as unknown as { __ee: { controller: { hero: { root: { position: { distanceTo(v: unknown): number } } }; nodePose(i: number): { position: unknown }; world: { toDisplay(p: unknown): unknown } } } }).__ee.controller;
    return c.hero.root.position.distanceTo(c.world.toDisplay(c.nodePose(11).position));
  });
  expect(onNode).toBeLessThan(0.1);
  expect(await cues(page)).toContain('hop');
  expect(errors).toEqual([]);
});

test('Riesenbaum: von Knoten 84 geht es im Bogen weiter (Schiene statt Hüpfer)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize(PHONE);
  await page.goto('/play?mode=free&level=85&quality=mobil');
  await waitForRenderer(page);
  await waitPhase(page, 'map');
  // With the GPU (EE_GPU=1) the whole win: fly in, win, jump onto the seat, arc on to the map. Under SwiftShader the
  // giant tree renders at far below one frame per second: there the walk alone, checked as it starts (same travel).
  const full = !!process.env.EE_GPU;
  if (full) {
    await page.getByTestId('play-btn').click();
    await waitPhase(page, 'level');
  }
  await record(page);
  // Dev win in the level (the level itself is not the point here), dev walk on the map
  await request(page, 'depart');
  await expect.poll(async () => (await travelLog(page))?.mode ?? null, { timeout: TRANSITION_MS }).toBe('arc');
  const log = await travelLog(page);
  expect(log!.from).toBe(84);
  expect(log!.to).toBe(85);
  expect(log!.stops).toEqual([]);
  if (full) {
    await expect.poll(() => phases(page), { timeout: TRANSITION_MS }).toEqual(['depart', 'travel', 'map']);
    expect((await flowState(page)).current).toBe(85);
  }
  expect(errors).toEqual([]);
});

test('Werkstatt: Modus umschalten (Frei-Schild im Spiel), bis Level N freischalten', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize(PHONE);
  await page.goto('/werkstatt');
  const card = page.getByTestId('progress-card');
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-mode', 'real');
  await page.getByTestId('progress-mode-free').click();
  await expect(card).toHaveAttribute('data-mode', 'free');
  await page.getByTestId('progress-level').fill('7');
  await page.getByTestId('progress-unlock').click();
  await expect(page.getByTestId('progress-summary')).toContainText('Frei: Level 7');
  // Two taps to reset (the first one asks)
  await page.getByTestId('progress-mode-real').click();
  await page.getByTestId('progress-level').fill('4');
  await page.getByTestId('progress-unlock').click();
  await expect(page.getByTestId('progress-summary')).toContainText('Echt: Level 4');
  await page.getByTestId('progress-reset-real').click();
  await expect(page.getByTestId('progress-reset-real')).toHaveText('Wirklich?');
  await page.getByTestId('progress-reset-real').click();
  await expect(page.getByTestId('progress-summary')).toContainText('Echt: Level 1');
  await page.getByTestId('progress-mode-free').click();
  await page.getByTestId('werkstatt-game').click();
  await waitPhase(page, 'map');
  await expect(page.getByTestId('mode-tag')).toBeVisible();
  expect((await flowState(page)).current).toBe(6);
  expect(errors).toEqual([]);
});
