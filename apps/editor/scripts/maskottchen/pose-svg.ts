// Schreibt eine Pose als SVG (Logo-Rahmen), zum Vergleich mit dem Logo:  npx vite-node scripts/maskottchen/pose-svg.ts <aus.svg> ['{"theta":90}']
import fs from 'node:fs';
import { Figur } from '../../src/maskottchen/figur';
import { RUHE } from '../../src/maskottchen/pose';
import { svgAus } from '../../src/maskottchen/zeichnen';

const aus = process.argv[2] ?? 'ruhe.svg';
const extra = process.argv[3] ? JSON.parse(process.argv[3]) : {};
const figur = new Figur();
if (process.env.FERN_FENSTER) figur.ferneBeineSchwarz = false;
const pose = { ...RUHE, ...extra };
const teile = figur.zeichenteile(pose);
fs.writeFileSync(aus, svgAus(teile, [0, 0, 1826, 1630]));
console.log('Teile', teile.map((t) => t.name).join(' '));
