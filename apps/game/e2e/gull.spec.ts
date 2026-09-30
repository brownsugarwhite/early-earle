import { writeFileSync } from 'node:fs';
import { test, expect, type Browser, type Page } from '@playwright/test';

// Möwe im Spiel (Iteration 4, B2): der Schatten einer Möwe fliegt übers Brett und lässt den Spawn aufklatschen.
// Funktionsprüfung im Grid-Lab mit `?gull=always` auf dem WebGL2-Fallback (SwiftShader) wie die anderen Specs:
// Wische → Möwe fliegt → Blob landet → Brett kommt zur Ruhe, ohne Konsolenfehler. Die Tweens laufen auf der Wanduhr,
// also auch bei wenigen fps in der geplanten Zeit.

// SwiftShader auf einem ausgelasteten Rechner: einzelne Bilder brauchen Sekunden (die Tweens laufen auf der Wanduhr, das
// Brett kommt aber erst mit dem nächsten Bild zur Ruhe).
test.setTimeout(process.env.CI ? 420_000 : 300_000);
// Bilder nur mit echter GPU (Metal); die Funktionsprüfung läuft sonst wie alle Specs auf SwiftShader.
if (process.env.GULL_SHOTS) test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

interface BoardStats {
  flights: number;
  active: number;
  released: boolean;
  animating: boolean;
  blobs: number;
  pending: number;
  airborne: number;
  status: string;
}

/** Grid-Lab-Brett über den Debug-Griff des Dev-Builds (`window.__ee.controller` = GridLabScene). */
async function stats(page: Page): Promise<BoardStats | null> {
  return page.evaluate(() => {
    interface V {
      pending: boolean;
      lift: number;
    }
    interface R {
      gull: { flights: number; active: number; last: { released: boolean } };
      animating: boolean;
      blobs: { visuals: Map<number, V> };
      state: { status: string } | null;
    }
    const c = (window as unknown as { __ee?: { controller?: { board?: { renderer?: R } } } }).__ee?.controller;
    const r = c?.board?.renderer;
    if (!r) return null;
    const vs = [...r.blobs.visuals.values()];
    return {
      flights: r.gull.flights,
      active: r.gull.active,
      released: r.gull.last.released,
      animating: r.animating,
      blobs: vs.length,
      pending: vs.filter((v) => v.pending).length,
      airborne: vs.filter((v) => Math.abs(v.lift) > 1e-3).length,
      status: r.state?.status ?? 'none',
    };
  });
}

/** Wartet, bis das Brett ruht: keine Tweens (auch die Möwe ist draußen), kein Blob in der Luft oder noch getragen. */
async function settled(page: Page): Promise<BoardStats> {
  await expect.poll(async () => {
    const s = await stats(page);
    return !!s && !s.animating && s.pending === 0 && s.airborne === 0 && s.active === 0;
  }, { timeout: 60_000 }).toBe(true);
  return (await stats(page))!;
}

test('Grid-Lab ?gull=always: der Möwenschatten fliegt, der Blob klatscht auf, das Brett kommt zur Ruhe', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/lab/grid?gull=always');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
  await expect(page.getByTestId('grid-gull')).toHaveAttribute('data-mode', 'always');
  await expect(page.getByTestId('grid-gull')).toHaveText('Möwe: immer');
  // Level 5 (4×4, genug Züge) — Level 1 ist mit dem ersten Wisch gewonnen.
  await page.getByTestId('grid-level-select').selectOption('4');
  await expect.poll(async () => (await stats(page))?.blobs ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
  let s = await settled(page);
  expect(s.flights).toBe(0);

  let moves = 0;
  for (const key of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) {
    const before = s.flights;
    const blobsBefore = s.blobs;
    await page.keyboard.press(key);
    // Jeder Zug mit Spawn bringt eine Möwe (always); ein Wisch, der nichts ändert, bringt keine.
    const started = await expect
      .poll(async () => (await stats(page))?.flights ?? 0, { timeout: 5_000 })
      .toBeGreaterThan(before)
      .then(() => true)
      .catch(() => false);
    s = await settled(page);
    if (!started) continue;
    moves++;
    expect(s.flights).toBe(before + 1);
    expect(s.released).toBe(true);
    // Der gebrachte Blob steht auf dem Brett (Merges können andere entfernt haben).
    expect(s.blobs).toBeGreaterThan(0);
    expect(s.blobs).toBeLessThanOrEqual(blobsBefore + 1);
    if (s.status !== 'playing') break;
  }
  expect(moves).toBeGreaterThanOrEqual(3);

  // Schneller Doppelwisch: der zweite wartet und beschleunigt Zug und Möwe gemeinsam — beides landet, nichts hängt.
  if (s.status === 'playing') {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.press('ArrowLeft');
    s = await settled(page);
    expect(s.pending).toBe(0);
  }

  // Aus: kein Flug mehr
  await page.getByTestId('grid-gull').click();
  await expect(page.getByTestId('grid-gull')).toHaveAttribute('data-mode', 'off');
  await page.getByTestId('grid-restart').click();
  await expect.poll(async () => (await stats(page))?.blobs ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
  s = await settled(page);
  const off = s.flights;
  for (const key of ['ArrowLeft', 'ArrowRight']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(600);
    s = await settled(page);
  }
  expect(s.flights).toBe(off);
  // …und wieder im Takt
  await page.getByTestId('grid-gull').click();
  await expect(page.getByTestId('grid-gull')).toHaveAttribute('data-mode', 'auto');
  expect(errors).toEqual([]);
});

// ------------------------------------------------------------------------------------------------ Bilder (echte GPU)
// `GULL_SHOTS=1 E2E_PORT=… node scripts/e2e.mjs e2e/gull.spec.ts -g Bilder` (Mac, Metal): hält die Szene an festen
// Momenten des Flugs an (die Seitenuhr läuft über `performance.now`, hier in Zeitlupe bzw. angehalten) und legt Bilder
// nach `GULL_SHOTS_DIR` (Standard docs/progress): Schatten über dem Brett (Grid-Lab und Flow, Handy und Desktop), Fall,
// Aufprall und je eine Bildfolge. Nicht in CI.

const SHOTS = process.env.GULL_SHOTS_DIR ?? '../../docs/progress';
const PREFIX = process.env.GULL_SHOTS_PREFIX ?? 'iter4-b2-';

/** Seitenuhr mit Zeitlupe/Halt: `window.__eeTime.scale` (1 = normal, 0 = angehalten); optional ein Fortschritt. */
async function installClock(page: Page, progress: object | null): Promise<void> {
  await page.addInitScript((prog) => {
    if (prog) localStorage.setItem('ee.progress.v2', JSON.stringify(prog));
    const real = performance.now.bind(performance);
    let lastReal = real();
    let virt = lastReal;
    const ctl = { scale: 1 };
    (window as unknown as { __eeTime: typeof ctl }).__eeTime = ctl;
    performance.now = () => {
      const r = real();
      virt += (r - lastReal) * ctl.scale;
      lastReal = r;
      return virt;
    };
  }, progress);
}

async function timeScale(page: Page, k: number): Promise<void> {
  await page.evaluate((v) => {
    (window as unknown as { __eeTime: { scale: number } }).__eeTime.scale = v;
  }, k);
}

interface Times {
  enterAt: number;
  callAt: number;
  releaseAt: number;
  impactAt: number;
  exitAt: number;
}

/** Flugzeit des zuletzt geschriebenen Möwen-Frames (s ab Zugbeginn), die Zeiten des Flugs, gestartete Flüge. */
async function flight(page: Page): Promise<{ t: number; times: Times | null; flights: number }> {
  return page.evaluate(() => {
    interface G {
      flights: number;
      last: { t: number; times: Times | null };
    }
    const c = (window as unknown as { __ee?: { controller?: { board?: { renderer?: { gull: G } } } } }).__ee?.controller;
    const g = c?.board?.renderer?.gull;
    return { t: g?.last.t ?? -1, times: g?.last.times ?? null, flights: g?.flights ?? 0 };
  });
}

/** Zeitlupe, bis der Flug Nr. `n` den Moment `at(times)` erreicht; dort anhalten. */
async function freezeAt(page: Page, n: number, at: (t: Times) => number): Promise<void> {
  await timeScale(page, 0.1);
  await expect
    .poll(
      async () => {
        const f = await flight(page);
        return f.flights >= n && f.times !== null && f.t >= at(f.times);
      },
      { timeout: 60_000, intervals: [8] },
    )
    .toBe(true);
  await timeScale(page, 0);
  await page.waitForTimeout(300);
}

/** Bildfolge als ein Bild (Canvas im Browser): `frames` in Spalten, Beschriftung über jedem Bild. */
async function sheet(browser: Browser, frames: Buffer[], labels: string[], cols: number, cellW: number, file: string): Promise<void> {
  const page = await browser.newPage();
  await page.setContent('<html><body style="margin:0"></body></html>');
  const url = await page.evaluate(
    async ({ srcs, labels, cols, cellW }) => {
      const imgs = await Promise.all(
        srcs.map(
          (src) =>
            new Promise<HTMLImageElement>((res) => {
              const i = new Image();
              i.onload = () => res(i);
              i.src = src;
            }),
        ),
      );
      const first = imgs[0]!;
      const cellH = Math.round((cellW * first.height) / first.width);
      const pad = 8;
      const lab = 26;
      const rows = Math.ceil(imgs.length / cols);
      const c = document.createElement('canvas');
      c.width = cols * (cellW + pad) + pad;
      c.height = rows * (cellH + lab + pad) + pad;
      const g = c.getContext('2d')!;
      g.fillStyle = '#081b25';
      g.fillRect(0, 0, c.width, c.height);
      imgs.forEach((img, k) => {
        const x = pad + (k % cols) * (cellW + pad);
        const y = pad + Math.floor(k / cols) * (cellH + lab + pad);
        g.drawImage(img, x, y + lab, cellW, cellH);
        g.fillStyle = '#f7f6d8';
        g.font = 'bold 17px sans-serif';
        g.fillText(labels[k] ?? '', x + 2, y + 19);
      });
      return c.toDataURL('image/png');
    },
    { srcs: frames.map((b) => `data:image/png;base64,${b.toString('base64')}`), labels, cols, cellW },
  );
  writeFileSync(file, Buffer.from(url.split(',')[1]!, 'base64'));
  await page.close();
}

const FREE_AT = (node: number) => ({ version: 2, mode: 'free', slots: { free: { reached: node, current: node }, real: {} } });

/** Momente der Bildfolge relativ zum Abwurf bzw. Aufprall. */
const SEQUENCE: Array<{ label: string; at: (t: Times) => number }> = [
  { label: 'Anflug', at: (t) => t.releaseAt - 0.5 },
  { label: 'über dem Brett', at: (t) => t.releaseAt - 0.33 },
  { label: 'gleitet', at: (t) => t.releaseAt - 0.16 },
  { label: 'Abwurf', at: (t) => t.releaseAt },
  { label: 'Fall', at: (t) => t.releaseAt + 0.33 },
  { label: 'Flatsch', at: (t) => t.impactAt + 0.04 },
  { label: 'Uff', at: (t) => t.impactAt + 0.13 },
  { label: 'Ringe', at: (t) => t.impactAt + 0.34 },
];

test.describe('Bilder (echte GPU)', () => {
  test.skip(!process.env.GULL_SHOTS, 'nur auf Wunsch: GULL_SHOTS=1');
  test.setTimeout(300_000);

  for (const scene of [
    { where: 'grid', view: 'handy', width: 393, height: 852, dpr: 2 },
    { where: 'grid', view: 'desktop', width: 1280, height: 800, dpr: 1 },
    { where: 'flow', view: 'handy', width: 393, height: 852, dpr: 2 },
    { where: 'flow', view: 'desktop', width: 1280, height: 800, dpr: 1 },
  ] as const) {
    test(`${scene.where} ${scene.view}: Möwenschatten, Fall, Aufprall`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: scene.width, height: scene.height }, deviceScaleFactor: scene.dpr });
      const page = await context.newPage();
      const flow = scene.where === 'flow';
      // Flow: Level 5 (Der Vierundsechziger, 5×5) im freien Modus — offenes Brett, wenig Baumschatten darauf.
      await installClock(page, flow ? FREE_AT(Number(process.env.GULL_NODE ?? 4)) : null);
      if (flow) {
        await page.goto('/play?gull=always');
        const hud = page.getByTestId('flow-hud');
        await expect(hud).toHaveAttribute('data-flow-state', 'map', { timeout: 60_000 });
        await page.waitForTimeout(2000);
        await page.getByTestId('play-btn').click();
        await expect(hud).toHaveAttribute('data-flow-state', 'level', { timeout: 60_000 });
        await page.waitForTimeout(3000);
      } else {
        await page.goto('/lab/grid?gull=always');
        await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 30_000 });
        if (scene.view === 'handy') await page.getByTestId('lab-sheet-toggle').click();
        await page.getByTestId('grid-level-select').selectOption(process.env.GULL_LEVEL ?? '4');
        if (scene.view === 'handy') await page.getByTestId('lab-sheet-toggle').click();
        await page.waitForTimeout(3500);
      }
      const n = (await flight(page)).flights + 1;
      await page.keyboard.press(process.env.GULL_KEY ?? 'ArrowLeft');
      const frames: Buffer[] = [];
      for (const m of SEQUENCE) {
        await freezeAt(page, n, m.at);
        const shot = await page.screenshot();
        frames.push(shot);
        const name = `${scene.where}-${scene.view}`;
        if (m.label === 'gleitet') writeFileSync(`${SHOTS}/${PREFIX}${name}-schatten.png`, shot);
        if (flow && scene.view === 'handy' && m.label === 'Fall') writeFileSync(`${SHOTS}/${PREFIX}fall.png`, shot);
        if (flow && scene.view === 'handy' && m.label === 'Flatsch') writeFileSync(`${SHOTS}/${PREFIX}aufprall.png`, shot);
      }
      await timeScale(page, 1);
      if (scene.view === 'handy') await sheet(browser, frames, SEQUENCE.map((m) => m.label), 4, 330, `${SHOTS}/${PREFIX}${scene.where}-sequenz.png`);
      await context.close();
    });
  }
});
