import { test, expect, type Page } from '@playwright/test';

// P2e Schatten-Lab (Shadows v2) smoke test. Läuft wie die anderen auf dem WebGL2-Fallback (SwiftShader): prüft, dass
// die Kaskaden gefittet werden, alle Umschalter ohne Fehler durchlaufen und das Texelgitter beim Rollen stehen bleibt.

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

interface CascadeStat {
  width: number;
  height: number;
  active: boolean;
  texelX: number;
  texelY: number;
  split: number;
  originPlaneX: number;
  originPlaneY: number;
  dirtyPasses: number;
}

interface LabStats {
  cascades: { cascades: CascadeStat[]; refits: number; passes: number; slides: number; dirtyPasses: number[]; dMin: number; dMax: number } | null;
  passes: number;
  chunks: number;
}

const stats = (page: Page) =>
  page.evaluate(() => (window as unknown as { __ee: { controller: { getStats(): unknown } } }).__ee.controller.getStats()) as Promise<LabStats>;

test('/lab/shadow fittet Kaskaden an die Kamera, schaltet Alt/Neu/Split, Debug und Presets und hält das Gitter beim Rollen', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 900, height: 560 });
  await page.goto('/lab/shadow?q=mobil&mode=split&mag=0.62,0.7');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 60_000 });

  // Drei Kaskaden (Hoch), alle aktiv, verschachtelt feiner → gröber
  const info = page.getByTestId('shadow-info');
  await expect(info).toContainText(/K3 \d+×\d+ · [\d.]+ px\/Texel/, { timeout: 90_000 });
  await expect.poll(async () => (await stats(page)).cascades?.cascades.filter((c) => c.active).length ?? 0, { timeout: 60_000 }).toBe(3);
  const s0 = await stats(page);
  const cs = s0.cascades!.cascades;
  expect(cs[0]!.width * cs[0]!.height).toBeGreaterThan(cs[2]!.width * cs[2]!.height - 1);
  expect(cs[0]!.texelY).toBeLessThan(cs[2]!.texelY);
  expect(cs[0]!.split).toBeLessThan(cs[1]!.split);
  expect(s0.cascades!.dMin).toBeGreaterThan(0);

  // Lupe: zwei Insets im Split
  await expect(page.getByTestId('shadow-mag-inset')).toHaveCount(2);

  // Modi und Debug ohne Neukompilier-Fehler
  for (const m of ['alt', 'neu', 'split']) await page.getByTestId(`mode-${m}`).click();
  await page.getByTestId('shadow-debug').locator('select').selectOption('1');
  await page.getByTestId('shadow-debug').locator('select').selectOption('2');
  await page.getByTestId('shadow-debug').locator('select').selectOption('0');
  await page.getByTestId('shadow-taps').locator('select').selectOption('4');
  await page.getByTestId('shadow-smooth').click();
  await page.getByTestId('shadow-smooth').click();
  await page.getByTestId('shadow-view').locator('select').selectOption('earle');

  // Rollen: Schattenpässe laufen, feine Kaskaden behalten ihre Texelgröße (Gitter steht)
  await page.getByTestId(`mode-neu`).click();
  await expect.poll(async () => (await stats(page)).cascades?.cascades.filter((c) => c.active).length ?? 0, { timeout: 60_000 }).toBe(3);
  await page.waitForTimeout(1500);
  const before = await stats(page);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 8 }));
  await expect.poll(async () => (await stats(page)).passes, { timeout: 60_000 }).toBeGreaterThan(before.passes + 5);
  const after = await stats(page);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 0 }));
  for (let k = 0; k < 2; k++) {
    expect(after.cascades!.cascades[k]!.texelX).toBe(before.cascades!.cascades[k]!.texelX);
    expect(after.cascades!.cascades[k]!.texelY).toBe(before.cascades!.cascades[k]!.texelY);
  }

  // Mobil-Preset: zwei Kaskaden
  await page.getByTestId('shadow-cascades').locator('select').selectOption('mobil');
  await expect.poll(async () => (await stats(page)).cascades?.cascades.length ?? 0, { timeout: 60_000 }).toBe(2);
  await expect(info).toContainText('K2', { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('/lab/shadow Schatten v3: Kontakt-Diagnose, Feldansicht, Kontaktregler und Testpunkte (shadowFactor im Vertex-Shader)', async ({ page }) => {
  test.setTimeout(360_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 900, height: 560 });
  await page.goto('/lab/shadow?q=mobil&view=karte&node=20&progress=30&mode=neu&mag=0&cascades=mobil');
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 60_000 });
  await expect.poll(async () => (await stats(page)).cascades?.cascades.filter((c) => c.active).length ?? 0, { timeout: 90_000 }).toBe(2);
  // Bodengefittete gröbste Kaskade: die Tiefe endet am sichtbaren Boden, nicht an der Schale
  const s = await stats(page);
  expect(s.cascades!.dMax).toBeGreaterThan(s.cascades!.dMin);

  // Kontakt-Diagnose und Feldansicht (Ersatzmaterial auf den Empfängern), Legende sichtbar
  const debug = page.getByTestId('shadow-debug').locator('select');
  await debug.selectOption('3');
  await expect(page.getByTestId('shadow-contact-legend')).toBeVisible();
  await page.waitForTimeout(1500);
  await debug.selectOption('4');
  await page.waitForTimeout(1500);
  await debug.selectOption('0');

  // Kontaktregler live (Mindestbreite, Versatz, Ebenen-Bias) → neue Schattenpässe ohne Fehler. Der Ebenen-Bias ist
  // einkompiliert: Umschalten baut das Licht neu, alle beleuchteten Materialien kompilieren neu — unter SwiftShader auf
  // einem ausgelasteten Rechner deutlich länger als 30 s (die Karte der Ebene hat mehr Programme als die alte Kugel)
  const before = (await stats(page)).passes;
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ dilation: 1, shift: 0.06, planeBias: false }));
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ dilation: 0.6, shift: 0.03, planeBias: true }));
  await expect.poll(async () => (await stats(page)).passes, { timeout: 120_000 }).toBeGreaterThan(before);

  // Empfängerhöhe verteilter Schichten (Kronen): bindet die Empfänger neu, die gröbste Kaskade wächst höchstens mäßig
  const last = (s: LabStats): CascadeStat => s.cascades!.cascades[s.cascades!.cascades.length - 1]!;
  const coverBefore = last(await stats(page));
  await expect(page.getByTestId('shadow-crown')).toBeVisible();
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ crownHeight: 3 }));
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 4 }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 0 }));
  const coverAfter = last(await stats(page));
  expect(coverAfter.texelY).toBeLessThan(coverBefore.texelY * 1.6);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ crownHeight: 0 }));

  // Testpunkte: shadowFactor() im Vertex-Shader, dazu Drehung (Schatten wandern über die Punkte)
  await page.getByTestId('shadow-dots').click();
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 6 }));
  await page.waitForTimeout(2500);
  await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 0 }));
  await page.getByTestId('shadow-dots').click();
  expect(errors).toEqual([]);
});

// Karte v5 (R1): Schwenken ohne Neuzeichnen. Das Texelgitter heftet an der Ebene (Rechtecke in Ebenenkoordinaten mit
// Rand), beim Schwenken gleiten die Kaskaden (`slide`) statt neu zu fitten; erst nach > 2 Einheiten Fokusweg läuft ein
// Refit (Bodenschätzung), und nur eine Kaskade, deren Rand aufgebraucht ist (die feine), snappt neu und zeichnet. Die
// mittlere und die ferne Kaskade behalten ihren Ursprung in der Ebene; sie zeichnen höchstens, wenn Inhalt nachlädt
// (Chunks am Rand) — dann alle gemeinsam.
test('/lab/shadow Schwenken: Kaskaden gleiten an der Ebene — höchstens 2 Refits, Ursprung der groben Kaskaden fest, nur die feine zeichnet nach', async ({ page }) => {
  test.setTimeout(420_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 900, height: 560 });
  await page.goto('/lab/shadow?q=mobil&view=karte&node=20&progress=30&mode=neu&mag=0&cascades=hoch');
  await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 60_000 });
  await expect.poll(async () => (await stats(page)).cascades?.cascades.filter((c) => c.active).length ?? 0, { timeout: 90_000 }).toBe(3);
  type Ctl = { controller: { pan(dx: number, dz: number): void } };
  const pan = (dx: number, dz: number) => page.evaluate(([x, z]) => (window as unknown as { __ee: Ctl }).__ee.controller.pan(x!, z!), [dx, dz]);
  const frame = () => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  // Aufwärmen: die Strecke einmal vorlaufen (Chunks laden), zurück, und zur Ruhe kommen lassen
  for (let i = 0; i < 8; i++) {
    await pan(0, -0.5);
    await frame();
  }
  for (let i = 0; i < 8; i++) {
    await pan(0, 0.5);
    await frame();
  }
  let settled = await stats(page);
  await expect
    .poll(
      async () => {
        const s = await stats(page);
        const quiet = s.passes === settled.passes && s.chunks === settled.chunks;
        settled = s;
        return quiet;
      },
      { timeout: 60_000, intervals: [1500] },
    )
    .toBe(true);
  const before = await stats(page);
  // 30 Schritte à 0,1 Einheit nach vorn (3 Einheiten: einmal über die 2-Einheiten-Schwelle für den Refit)
  for (let i = 0; i < 30; i++) {
    await pan(0, -0.1);
    await frame();
  }
  await frame();
  const after = await stats(page);
  const b = before.cascades!;
  const a = after.cascades!;
  expect(a.refits - b.refits).toBeLessThanOrEqual(2);
  expect(a.slides - b.slides).toBeGreaterThanOrEqual(20);
  // grobe Kaskaden: Ursprung in der Ebene fest (Rand 0,2 / 0,3 reicht für 3 Einheiten), gleiche Texel
  for (const k of [1, 2]) {
    expect(a.cascades[k]!.originPlaneX).toBe(b.cascades[k]!.originPlaneX);
    expect(a.cascades[k]!.originPlaneY).toBe(b.cascades[k]!.originPlaneY);
    expect(a.cascades[k]!.texelX).toBe(b.cascades[k]!.texelX);
    expect(a.cascades[k]!.texelY).toBe(b.cascades[k]!.texelY);
  }
  // Schattenpässe: die groben Kaskaden zeichnen nur gemeinsam (Inhalt nachgeladen), höchstens wenige Male; die feine
  // mindestens so oft (sie snappt am Rand neu), aber nicht jedes Bild
  const d0 = a.dirtyPasses[0]! - b.dirtyPasses[0]!;
  const d1 = a.dirtyPasses[1]! - b.dirtyPasses[1]!;
  const d2 = a.dirtyPasses[2]! - b.dirtyPasses[2]!;
  expect(d1).toBe(d2);
  expect(d1).toBeLessThanOrEqual(3);
  expect(d0).toBeGreaterThanOrEqual(d1);
  expect(d0).toBeLessThanOrEqual(d1 + 6);
  expect(errors).toEqual([]);
});

// iOS-WebGL2 (WebKit/ANGLE-Metal) hat keine funktionierenden Vergleichs-Sampler; dort lesen die Filter die Tiefe als
// gewöhnliche Textur (`webglCompat.ts`). `?shadowcompat=manual` erzwingt diesen Pfad hier. Regression: three r186
// erzeugt für `texture(depth).level(0)` in GLSL `textureLod(…)` ohne `.x` → „dimension mismatch“ in 17 Shadern.
test('WebKit-Schattenpfad (manueller Tiefenvergleich) kompiliert Earle-, Baum- und Schatten-Lab ohne Shader-Fehler', async ({ page }) => {
  test.setTimeout(420_000);
  const errors = collectErrors(page);
  // kleines Fenster: SwiftShader zahlt je Pixel, kompiliert werden dieselben Programme
  await page.setViewportSize({ width: 360, height: 360 });
  for (const route of ['/lab/earle', '/lab/tree', '/lab/shadow?view=karte&dots=1']) {
    await page.goto(`${route}${route.includes('?') ? '&' : '?'}backend=webgl&shadowcompat=manual`);
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgl2', { timeout: 60_000 });
    // die ersten Frames (SwiftShader: Sekunden je Frame) — dabei kompiliert three alle Programme und meldet Fehler
    const frames = () => page.evaluate(() => (window as unknown as { __ee?: { renderer: { info: { render: { calls: number } } } } }).__ee?.renderer.info.render.calls ?? 0);
    await expect.poll(frames, { timeout: 120_000 }).toBeGreaterThan(2);
    await page.waitForTimeout(1500);
  }
  expect(errors.filter((e) => /Shader Error|not compiled|dimension mismatch|program not (valid|linked)/i.test(e))).toEqual([]);
});

// Echte GPU (Mac/Metal): die Tests oben laufen auf SwiftShader/WebGL2 und sehen kein WGSL. Hier kompilieren die
// Schatten-v3-Pfade unter WebGPU — Vergleich auf Level 0 (textureSampleCompareLevel) auch im Vertex-Shader (Testpunkte),
// Kontakt-Diagnose, Feldansicht, Kaskaden-Debug, Mobil-Preset, Ebenen-Bias als Bau-Option. Eigener Browser mit
// GPU-Flags (launchOptions lassen sich nicht pro Test umstellen); auf CI und ohne WebGPU-Adapter übersprungen.
const GPU_ERROR = /WGSL|ShaderModule|pipeline creation failed|Invalid RenderPipeline|unresolved value|Invalid (BindGroup|Buffer|Texture)/i;

test('/lab/shadow Schatten v3 auf WebGPU: Diagnose, Feld, Testpunkte und Presets kompilieren (echte GPU)', async ({ playwright, baseURL }) => {
  test.skip(!!process.env.CI, 'braucht eine echte GPU');
  test.setTimeout(180_000);
  const browser = await playwright.chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
  try {
    // Desktop: the lab's controls are a side panel there (on phones they sit in the collapsed bottom sheet).
    const page = await browser.newPage({ ...(baseURL ? { baseURL } : {}), viewport: { width: 1100, height: 800 } });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' || (m.type() === 'warning' && GPU_ERROR.test(m.text()))) errors.push(m.text().slice(0, 600));
    });
    await page.goto('/lab/shadow?view=karte&node=52&progress=60&mode=neu&mag=0');
    const ok = await page.evaluate(async () => {
      try {
        const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
        return !!gpu && !!(await gpu.requestAdapter());
      } catch {
        return false;
      }
    });
    test.skip(!ok, 'kein WebGPU-Adapter');
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    await expect.poll(async () => (await stats(page)).cascades?.cascades.filter((c) => c.active).length ?? 0, { timeout: 60_000 }).toBe(3);

    // Kontakt-Diagnose, Feld, Kaskaden, Texel (Ersatzmaterialien mit eigenem Vergleichspfad)
    const debug = page.getByTestId('shadow-debug').locator('select');
    for (const d of ['3', '4', '1', '2', '0']) {
      await debug.selectOption(d);
      await page.waitForTimeout(800);
    }
    // Testpunkte: shadowFactor() im Vertex-Shader, Schatten wandern beim Drehen über die Punkte
    await page.getByTestId('shadow-dots').click();
    await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 6 }));
    await page.waitForTimeout(2000);
    await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ rotate: 0 }));
    await page.getByTestId('shadow-dots').click();

    // Mobil-Preset (zwei Kaskaden) und Ebenen-Bias aus/an (Neubau der Schattenknoten)
    await page.getByTestId('shadow-cascades').locator('select').selectOption('mobil');
    await expect.poll(async () => (await stats(page)).cascades?.cascades.length ?? 0, { timeout: 30_000 }).toBe(2);
    await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ planeBias: false }));
    await page.waitForTimeout(1200);
    await page.evaluate(() => (window as unknown as { __ee: { controller: { setParams(p: object): void } } }).__ee.controller.setParams({ planeBias: true }));
    await page.waitForTimeout(1200);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
