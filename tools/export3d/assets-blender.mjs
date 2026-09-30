#!/usr/bin/env node
/**
 * `pnpm assets:blender` — baut die Blender-Bibliothek neu:
 *   1. Export aus den Spiel-Generatoren (tools/export3d/run.mjs → assets/blender/_export, GLB + manifest.json)
 *   2. Blender (headless) baut assets/blender/early-earle-bibliothek.blend + blender_assets.cats.txt
 *
 * Optionen:
 *   --bilder         zusätzlich Übersichtsbilder nach docs/progress/blender-bibliothek-*.png rendern
 *   --schnell        kleiner Export (wenige Stufen, grobe Map) zum Ausprobieren
 *   --ohne-vorschau  keine Asset-Vorschaubilder (Bau ~1,5 min schneller)
 *   --nur a,b        nur diese Abschnitte bauen (wesen, module, rex, map, spielfeld, paletten, vorlage)
 *   --out <datei>    andere Zieldatei (Standard assets/blender/early-earle-bibliothek.blend)
 * Blender: Umgebungsvariable BLENDER, sonst /Applications/Blender.app/Contents/MacOS/Blender bzw. `blender`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);

const exportDir = path.join(root, 'assets/blender/_export');
const out = path.resolve(root, opt('--out') ?? 'assets/blender/early-earle-bibliothek.blend');
const only = opt('--nur');

// Abschnitte des Exports für --nur (Vorlage und Paletten brauchen ihre Quellen)
const exportSections = only
  ? [...new Set(only.split(',').flatMap((s) => (s === 'vorlage' ? ['wesen', 'module'] : s === 'wesen' ? ['wesen', 'module'] : [s])).filter((s) => s !== 'vorlage'))]
  : null;
const exportArgs = [path.join(here, 'run.mjs'), '--out', exportDir];
if (has('--schnell')) exportArgs.push('--quick');
if (exportSections) exportArgs.push('--only', exportSections.join(','));
console.log('▸ Export aus den Spiel-Generatoren');
let r = spawnSync(process.execPath, exportArgs, { cwd: root, stdio: 'inherit' });
if (r.status !== 0) {
  console.error('Export fehlgeschlagen');
  process.exit(r.status ?? 1);
}

const candidates = [process.env.BLENDER, '/Applications/Blender.app/Contents/MacOS/Blender', 'blender'].filter(Boolean);
const blender = candidates.find((c) => c === 'blender' || existsSync(c));
const blenderArgs = ['--background', '--factory-startup', '--python-exit-code', '1', '--python', path.join(root, 'tools/blender/build_library.py'), '--', '--export', exportDir, '--out', out];
if (has('--ohne-vorschau')) blenderArgs.push('--no-previews');
if (only) blenderArgs.push('--only', only);
if (has('--bilder')) blenderArgs.push('--renders', path.join(root, 'docs/progress'));
console.log(`▸ Blender baut ${path.relative(root, out)}`);
r = spawnSync(blender, blenderArgs, { cwd: root, stdio: 'inherit' });
if (r.error) {
  console.error(`Blender nicht gefunden (${blender}) — Pfad per Umgebungsvariable BLENDER setzen`);
  process.exit(1);
}
process.exit(r.status ?? 1);
