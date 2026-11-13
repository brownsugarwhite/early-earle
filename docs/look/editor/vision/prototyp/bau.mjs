// Bündelt den Prototyp zu einer Datei: node bau.mjs [eintrag] [ausgabe]
// esbuild und three.js kommen aus ./node_modules oder aus NODE_MODULES=<pfad> (z. B. npm i three@0.170.0 esbuild@0.24.0).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const NM = resolve(process.env.NODE_MODULES || 'node_modules');
if (!existsSync(NM + '/esbuild')) throw new Error('esbuild fehlt: npm i three@0.170.0 esbuild@0.24.0 (oder NODE_MODULES setzen)');
const { build } = await import(pathToFileURL(NM + '/esbuild/lib/main.js').href);
const eintrag = process.argv[2] || 'src/main.js';
const aus = process.argv[3] || 'dist/vision.html';
const titel = process.argv[4];
const r = await build({ entryPoints: [eintrag], bundle: true, format: 'iife', minify: !!process.env.KLEIN, write: false, nodePaths: [NM], target: 'es2020', legalComments: 'none', loader: { '.txt': 'text' } });
const js = r.outputFiles[0].text;
let html = readFileSync('seite.html', 'utf8').replace('/*SKRIPT*/', () => js.replace(/<\/script>/g, '<\\/script>'));
if (titel) html = html.replace(/<title>[^<]*<\/title>/, `<title>${titel}</title>`);
mkdirSync('dist', { recursive: true });
writeFileSync(aus, html);
console.log(aus, (html.length / 1024).toFixed(0), 'KB');
