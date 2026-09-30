import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { GENOME_VERSION, parseGenomeRules } from '@ee/genome';
import { createContext, type ExportContext } from './context';

/**
 * Export entry (loaded by run.mjs through Vite's SSR runner). Every section runs on its own: a section
 * that breaks after other agents changed its generators is reported in `manifest.json` (`failed`) and
 * the Blender build skips it — the rest of the library still builds.
 */
export const SECTIONS = ['wesen', 'module', 'rex', 'map', 'spielfeld', 'paletten'] as const;
export type SectionId = (typeof SECTIONS)[number];

type SectionRunner = (ctx: ExportContext) => unknown | Promise<unknown>;

const RUNNERS: Record<SectionId, () => Promise<SectionRunner>> = {
  wesen: async () => (await import('./sections/creatures')).exportCreatures,
  module: async () => (await import('./sections/modules')).exportModules,
  rex: async () => (await import('./sections/rex')).exportRex,
  map: async () => (await import('./sections/map')).exportMap,
  spielfeld: async () => (await import('./sections/board')).exportBoard,
  paletten: async () => (await import('./sections/palettes')).exportPalettes,
};

function gitInfo(root: string): { commit: string | null; branch: string | null; dirty: boolean | null } {
  try {
    const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
    return { commit, branch, dirty };
  } catch {
    return { commit: null, branch: null, dirty: null };
  }
}

export async function main(opts: { root: string; out: string; argv: string[] }): Promise<number> {
  const { root, out, argv } = opts;
  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx >= 0 && argv[onlyIdx + 1] ? new Set(argv[onlyIdx + 1]!.split(',').map((s) => s.trim())) : null;
  const quick = argv.includes('--quick');
  const sections = SECTIONS.filter((s) => !only || only.has(s));
  const t0 = Date.now();
  console.log(`early earle 3D-Export → ${out}${quick ? ' (schnell)' : ''}`);

  // Fresh export (keep the Vite cache).
  if (existsSync(out)) {
    for (const entry of readdirSync(out)) {
      if (entry === '.vite-cache') continue;
      if (only && !only.has(entry) && entry !== 'manifest.json') continue;
      rmSync(join(out, entry), { recursive: true, force: true });
    }
  }
  const rules = parseGenomeRules(JSON.parse(readFileSync(join(root, 'content/genome/rules.json'), 'utf8')));
  const ctx = createContext(root, out, rules, quick);
  const results: Record<string, unknown> = {};
  // Teil-Export (--only): die übrigen Abschnitte aus dem letzten Manifest behalten.
  if (only && existsSync(join(out, 'manifest.json'))) {
    try {
      const prev = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8')) as { sections?: Record<string, unknown> };
      for (const [k, v] of Object.entries(prev.sections ?? {})) if (!only.has(k)) results[k] = v;
    } catch {
      // altes Manifest unlesbar: nur die neuen Abschnitte
    }
  }
  const failed: Array<{ section: string; error: string }> = [];
  for (const id of sections) {
    const ts = Date.now();
    console.log(`• ${id}`);
    try {
      const run = await RUNNERS[id]();
      results[id] = await run(ctx);
      console.log(`  (${((Date.now() - ts) / 1000).toFixed(1)} s)`);
    } catch (e) {
      const error = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e);
      failed.push({ section: id, error });
      console.error(`  ✗ ${id} fehlgeschlagen: ${error}`);
    }
  }
  ctx.writeJson('manifest.json', {
    schema: 1,
    generator: 'tools/export3d',
    generated: new Date().toISOString(),
    genome: GENOME_VERSION,
    git: gitInfo(root),
    quick,
    coordinates: 'game space: +Y up, +Z forward, metres = world/blob units (glTF convention); the Blender builder converts to +Z up',
    sections: results,
    warnings: ctx.warnings,
    failed,
  });
  console.log(`fertig in ${((Date.now() - t0) / 1000).toFixed(1)} s — ${ctx.warnings.length} Hinweise, ${failed.length} Abschnitte fehlgeschlagen`);
  return failed.length > 0 && failed.length === sections.length ? 1 : 0;
}
