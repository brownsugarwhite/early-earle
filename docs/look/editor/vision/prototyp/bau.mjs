// Bündelt den Prototyp zu einer Datei: node bau.mjs [eintrag] [ausgabe]
import { build } from '/tmp/claude-0/-home-user-early-earle/b341633e-ad28-58e2-a5a6-16c95d14b024/scratchpad/dev/node_modules/esbuild/lib/main.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const eintrag = process.argv[2] || 'src/main.js';
const aus = process.argv[3] || 'dist/vision.html';
const NM = process.env.NODE_MODULES || '/tmp/claude-0/-home-user-early-earle/b341633e-ad28-58e2-a5a6-16c95d14b024/scratchpad/dev/node_modules';
const r = await build({ entryPoints: [eintrag], bundle: true, format: 'iife', minify: !!process.env.KLEIN, write: false, nodePaths: [NM], target: 'es2020', legalComments: 'none' });
const js = r.outputFiles[0].text;
const html = readFileSync('seite.html', 'utf8').replace('/*SKRIPT*/', () => js.replace(/<\/script>/g, '<\\/script>'));
mkdirSync('dist', { recursive: true });
writeFileSync(aus, html);
console.log(aus, (html.length / 1024).toFixed(0), 'KB');
