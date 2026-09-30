import { expect, type Page } from '@playwright/test';

/**
 * Gemeinsame Helfer der Flow-Tests (Iteration 4). Der Dev-Build legt die Szene unter `window.__ee.controller` und die
 * Stores des Flows unter `window.__eeFlow` ab (FlowView). Choreografien laufen auf der Szenenuhr: unter SwiftShader
 * ist sie langsamer als die Wanduhr, daher warten die Helfer auf Szenenzeit statt auf Millisekunden.
 */

/**
 * Unter SwiftShader laufen die Kamerafahrten mit wenigen fps (und mit parallelen Läufen auf dem Mac noch weniger):
 * großzügige Wartezeiten.
 */
export const TRANSITION_MS = 90_000;

export type Phase = 'splash' | 'hop' | 'intro' | 'map' | 'flyIn' | 'level' | 'depart' | 'travel';

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** Renderer bereit und die Szene läuft (mindestens ein Bild auf der Szenenuhr). */
export async function waitForRenderer(page: Page): Promise<void> {
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ee?: { controller?: { elapsed?: number } } }).__ee?.controller?.elapsed ?? 0), { timeout: TRANSITION_MS }).toBeGreaterThan(0);
}

export async function waitPhase(page: Page, phase: Phase | RegExp, timeout = TRANSITION_MS): Promise<void> {
  await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', phase, { timeout });
}

interface SlotSeed {
  reached?: number;
  current?: number;
  levels?: Record<string, { wins: number; attempts: number; bestScore: number; bestMovesLeft: number }>;
  seen?: { intro: boolean; stories: string[] };
}

/** Fortschritt v2 vor dem Laden setzen (bei jedem Laden der Seite, wie ein gespeicherter Stand). */
export async function seedProgress(page: Page, mode: 'real' | 'free', slots: { real?: SlotSeed; free?: SlotSeed }): Promise<void> {
  await page.addInitScript(
    ([m, s]) => localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: m, slots: { real: s.real ?? {}, free: s.free ?? {} } })),
    [mode, slots] as const,
  );
}

/** Zustand von Flow, Gitter und Fortschritt (für Erwartungen). */
export async function flowState(page: Page): Promise<{ phase: string; current: number; playing: number | null; rex: string | null; story: string | null; mode: string; reached: number; status: string | undefined; moveSeq: number; seen: { intro: boolean; stories: string[] } }> {
  return page.evaluate(() => {
    const f = (window as unknown as { __eeFlow: FlowHandles }).__eeFlow;
    const flow = f.flow.getState();
    const grid = f.grid.getState();
    const p = f.progress.getState();
    return { phase: flow.phase, current: flow.current, playing: flow.playing, rex: flow.rex, story: flow.story, mode: p.mode, reached: p.reached, status: grid.state?.status, moveSeq: grid.moveSeq, seen: p.seen };
  });
}

/** Anfrage an die Szene (wie die Knöpfe des HUD). */
export async function request(page: Page, kind: string, node?: number): Promise<void> {
  await page.evaluate(([k, n]) => (window as unknown as { __eeFlow: FlowHandles }).__eeFlow.flow.getState().request(k, n ?? undefined), [kind, node ?? null] as const);
}

/** Szenenzeit (s) seit dem Start der Szene. */
export async function sceneTime(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __ee: { controller: { elapsed: number } } }).__ee.controller.elapsed);
}

/** Wartet `seconds` Szenenzeit (unabhängig von der Bildrate). */
export async function waitScene(page: Page, seconds: number, timeout = TRANSITION_MS): Promise<void> {
  const t0 = await sceneTime(page);
  await expect.poll(() => sceneTime(page), { timeout }).toBeGreaterThanOrEqual(t0 + seconds);
}

/**
 * Gewinnt das geladene (Tutorial-)Level mit der Tastatur: jeweils die Richtung, die der Wisch-Hinweis zeigen würde,
 * bis das Gitter „gewonnen“ meldet — egal wie das Level gebaut ist.
 */
export async function winLevel(page: Page, maxMoves = 40): Promise<void> {
  const keys: Record<string, string> = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
  for (let i = 0; i < maxMoves; i++) {
    const s = await page.evaluate(() => {
      const f = (window as unknown as { __eeFlow: FlowHandles }).__eeFlow;
      const g = f.grid.getState();
      return { status: g.state?.status, animating: g.animating, dir: f.pickSwipe() };
    });
    if (s.status === 'won') return;
    if (s.status !== 'playing' || !s.dir) throw new Error(`Level nicht gewinnbar (Status ${s.status}, Richtung ${s.dir})`);
    if (s.animating) {
      await page.waitForTimeout(150);
      continue;
    }
    await page.keyboard.press(keys[s.dir]!);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __eeFlow: FlowHandles }).__eeFlow.grid.getState().animating), { timeout: TRANSITION_MS }).toBe(false);
  }
  await expect.poll(async () => (await flowState(page)).status, { timeout: TRANSITION_MS }).toBe('won');
}

/** Bildschirmposition (CSS px) eines Knotens auf der Karte, oder null, wenn er nicht im Bild ist. */
export async function nodeOnScreen(page: Page, index: number): Promise<{ x: number; y: number } | null> {
  return page.evaluate((i) => {
    type V3 = { x: number; y: number; z: number; project(c: unknown): V3 };
    const c = (window as unknown as {
      __ee: { controller: { layout: { nodes: Array<{ position: [number, number, number] }> }; world: { bend(p: V3): V3; planet: { localToWorld(v: V3): V3 }; camera: { position: { constructor: new (x: number, y: number, z: number) => V3 } } } } };
    }).__ee.controller;
    const V = c.world.camera.position.constructor;
    const n = c.layout.nodes[i];
    if (!n) return null;
    const p = c.world.planet.localToWorld(c.world.bend(new V(...n.position))).project(c.world.camera);
    if (Math.abs(p.x) > 0.92 || Math.abs(p.y) > 0.92 || p.z > 1) return null;
    return { x: ((p.x + 1) / 2) * innerWidth, y: ((1 - p.y) / 2) * innerHeight };
  }, index);
}

/** Szenenuhr anhalten (0) oder weiterlaufen lassen (1), z. B. für Bilder mitten in einer Fahrt. */
export async function setTimeScale(page: Page, scale: number): Promise<void> {
  await page.evaluate((s) => ((window as unknown as { __ee: { controller: { timeScale: number } } }).__ee.controller.timeScale = s), scale);
}

/** Die im Seitenkontext gebrauchten Handles (window.__eeFlow). */
export interface FlowHandles {
  flow: { getState(): { phase: string; current: number; playing: number | null; rex: string | null; story: string | null; request(kind: string, node?: number): void }; subscribe(fn: (s: { phase: string }, p: { phase: string }) => void): () => void };
  grid: { getState(): { state: { status: string } | null; moveSeq: number; animating: boolean; rex: string | null; levelIndex: number } };
  progress: { getState(): { mode: string; reached: number; current: number; seen: { intro: boolean; stories: string[] }; levels: Record<string, { wins: number }> } };
  bus: { on(type: string, fn: (e: unknown) => void): void; off(type: string, fn: (e: unknown) => void): void };
  pickSwipe(): string | null;
}
