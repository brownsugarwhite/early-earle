import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { GenomeRules } from '@ee/genome';
import type { GlbWriter } from './glb';

/** Shared state of one export run (paths, rules, logging, file writers). */
export interface ExportContext {
  /** Repository root. */
  root: string;
  /** Export directory (GLB + manifest), e.g. assets/blender/_export. */
  out: string;
  rules: GenomeRules;
  /** Smaller export for quick iteration (fewer tiers, coarser map). */
  quick: boolean;
  log(msg: string): void;
  warn(section: string, msg: string): void;
  warnings: Array<{ section: string; message: string }>;
  /** Writes a GLB below `out`; returns the path relative to `out`. */
  writeGlb(rel: string, w: GlbWriter): string;
  writeJson(rel: string, data: unknown): string;
}

export function createContext(root: string, out: string, rules: GenomeRules, quick: boolean): ExportContext {
  const warnings: ExportContext['warnings'] = [];
  const write = (rel: string, bytes: Uint8Array | string): string => {
    const p = join(out, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, bytes);
    return relative(out, p).split('\\').join('/');
  };
  return {
    root,
    out,
    rules,
    quick,
    warnings,
    log: (msg) => console.log(`  ${msg}`),
    warn: (section, message) => {
      warnings.push({ section, message });
      console.warn(`  ! [${section}] ${message}`);
    },
    writeGlb: (rel, w) => write(rel, w.toGlb()),
    writeJson: (rel, data) => write(rel, JSON.stringify(data, null, 1) + '\n'),
  };
}
