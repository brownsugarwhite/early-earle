import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Karten-Bench (R4.1 „Messen zuerst“) auf der echten GPU (Mac, Metal): `/play?mode=free&quality=hoch|mobil` bei
// 393 × 852 → `__flow.bench()` (src/flow/mapBench.ts: Leerlauf/Schwenken × alles/ohne Schatten/ohne Punkte/ohne
// Vegetation, DPR 2/1,75/1,5, A/B mit onSubmittedWorkDone) → docs/progress/karte-perf-<preset>[-w07].json. Am Start
// (Welt 09, Level 1) und bei Level 66 (Welt 07). Regressionswächter vorerst mit weicher Grenze: p99 der seriellen
// Bildzeit beim Schwenken ≤ 80 ms (`EE_PERF_P99`). Das Ziel 20 ms (später 12) reißt schon die Baseline (2026-10-01,
// Mac unter Last: 28–66 ms; Ursache vor allem `rebuildContent` in ≈ 60 % der Schwenk-Bilder mit Spitzen bis ≈ 47 ms,
// siehe docs/progress/karte-perf-mac-baseline.md)
// — es steht als Hinweis in den Anmerkungen; nach R4.6 auf 20, nach R4.2–R4.7 auf 12 senken. Auf CI übersprungen
// (keine GPU), ebenso ohne WebGPU-Adapter. Lauf: `E2E_PORT=4351 node scripts/e2e.mjs e2e/karte-perf-webgpu.spec.ts`
// (≈ 5 min); schreibt die JSONs neu.

test.skip(!!process.env.CI, 'braucht eine echte GPU');
test.use({ launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } });
test.setTimeout(480_000);

const OUT = fileURLToPath(new URL('../../../docs/progress/', import.meta.url));
const P99_PAN_MAX_MS = Number(process.env.EE_PERF_P99 ?? 80);
/** Ziel aus dem Plan (R4, Hoch am Mac); verfehlt = Anmerkung, kein Fehler (noch). */
const P99_PAN_TARGET_MS = 20;
const GPU_ERROR = /WGSL|ShaderModule|pipeline creation failed|Invalid RenderPipeline|unresolved value|Invalid (BindGroup|Buffer|Texture)/i;

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && GPU_ERROR.test(m.text()))) errors.push(m.text().slice(0, 600));
  });
  return errors;
}

async function requireWebGPU(page: Page): Promise<void> {
  const ok = await page.evaluate(async () => {
    try {
      const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      return !!gpu && !!(await gpu.requestAdapter());
    } catch {
      return false;
    }
  });
  test.skip(!ok, 'kein WebGPU-Adapter');
}

interface Stat {
  med: number;
  p99: number;
  max: number;
}
interface Row {
  szene: string;
  variante: string;
  kontrolle: boolean;
  dpr: number;
  bilder: number;
  bild: Stat;
  cpu: Stat;
  gpu: number | null;
  drawCalls: { med: number; max: number };
  schattenPaesseProS: number;
}
interface Report {
  preset: string;
  node: number;
  world: number;
  rows: Row[];
  posten: Array<{ szene: string; posten: string; gpu: number | null; bild: number; cpu: number }>;
}

const CASES = [
  { preset: 'hoch', level: 1, file: 'karte-perf-hoch.json', ort: 'Welt 09 (Start)' },
  { preset: 'hoch', level: 66, file: 'karte-perf-hoch-w07.json', ort: 'Welt 07 (Level 66)' },
  { preset: 'mobil', level: 1, file: 'karte-perf-mobil.json', ort: 'Welt 09 (Start)' },
  { preset: 'mobil', level: 66, file: 'karte-perf-mobil-w07.json', ort: 'Welt 07 (Level 66)' },
] as const;

for (const c of CASES) {
  test(`Karten-Bench ${c.preset}, ${c.ort}: Reihen, Posten, p99 beim Schwenken ≤ ${P99_PAN_MAX_MS} ms`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(`/play?mode=free&reset=free&level=${c.level}&quality=${c.preset}`);
    await requireWebGPU(page);
    await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'map', { timeout: 60_000 });
    await expect(page.getByTestId('perf-badge')).toHaveAttribute('data-backend', 'webgpu', { timeout: 30_000 });
    await page.waitForFunction(() => !!(window as unknown as { __flow?: unknown }).__flow, null, { timeout: 60_000 });

    // Die Messung wartet selbst auf das Vorwärmen (Brett-Pipelines, 30 ruhige Bilder)
    const report = await page.evaluate(() => (window as unknown as { __flow: { bench(): Promise<unknown> } }).__flow.bench());
    expect(report, 'Bench lieferte kein Ergebnis (siehe Konsole: [mapBench] abgebrochen)').not.toBeNull();
    const r = report as Report;
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}${c.file}`, `${JSON.stringify({ ort: c.ort, url: `/play?mode=free&level=${c.level}&quality=${c.preset}`, ...r }, null, 1)}\n`);

    const row = (szene: string, variante = 'alles', dpr = 2) => r.rows.find((x) => x.szene === szene && x.variante === variante && x.dpr === dpr && !x.kontrolle);
    for (const x of r.rows) {
      test.info().annotations.push({
        type: `${x.szene} ${x.variante}${x.kontrolle ? ' (Kontrolle)' : ''} @${x.dpr}`,
        description: `Bild ${x.bild.med}/${x.bild.p99} ms, CPU ${x.cpu.med}/${x.cpu.p99}, GPU ${x.gpu ?? '–'}, dc ${x.drawCalls.med}/${x.drawCalls.max}, Pässe/s ${x.schattenPaesseProS}`,
      });
    }
    console.log(`[karte-perf] ${c.preset} ${c.ort}: Level ${r.node + 1}, Blickwelt w${String(r.world + 1).padStart(2, '0')}`);
    for (const p of r.posten) console.log(`[karte-perf]   ${p.szene.padEnd(9)} ${p.posten.padEnd(44)} GPU ${String(p.gpu ?? '–').padStart(6)}  Bild ${String(p.bild).padStart(6)}  CPU ${String(p.cpu).padStart(6)}`);

    expect(r.rows.length).toBeGreaterThanOrEqual(13);
    for (const x of r.rows) expect(x.bilder).toBeGreaterThanOrEqual(120);
    const pan = row('schwenken');
    const idle = row('leerlauf');
    expect(pan, 'Reihe Schwenken · alles · DPR 2').toBeTruthy();
    expect(idle, 'Reihe Leerlauf · alles · DPR 2').toBeTruthy();
    // Regressionswächter (weich): p99 der Bildzeit beim Schwenken; das Planziel steht als Anmerkung daneben
    if (pan!.bild.p99 > P99_PAN_TARGET_MS) {
      test.info().annotations.push({ type: 'Ziel verfehlt', description: `p99 Bild beim Schwenken ${pan!.bild.p99} ms > ${P99_PAN_TARGET_MS} ms (CPU p99 ${pan!.cpu.p99} ms)` });
    }
    expect(pan!.bild.p99, `p99 Bild beim Schwenken (${c.preset}, ${c.ort})`).toBeLessThanOrEqual(P99_PAN_MAX_MS);
    expect(errors).toEqual([]);
  });
}
