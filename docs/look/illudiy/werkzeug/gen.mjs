// Baut die eigenständige Seite: Modell, Engine und Originalbild eingebettet.
import fs from 'node:fs';
const SP = new URL('.', import.meta.url).pathname + 'seite/', DST = process.argv[2] || new URL('..', import.meta.url).pathname;
const tpl = fs.readFileSync(SP + 'template.html', 'utf8');
const model = ('window.ILLUDIY_MODEL=' + fs.readFileSync(SP + '../../illudiy-modell.json', 'utf8') + ';'), engine = fs.readFileSync(SP + 'engine.js', 'utf8');
const orig = 'data:image/webp;base64,' + fs.readFileSync(SP + '../../illudiy-original.webp').toString('base64');
const out = tpl.replace('/*MODEL*/', () => model).replace('/*ENGINE*/', () => engine).replace("'/*ORIG*/'", () => JSON.stringify(orig));
fs.writeFileSync(DST + '/illudiy-intro.html', out); console.log('Seite', (out.length / 1024).toFixed(0), 'KB');
