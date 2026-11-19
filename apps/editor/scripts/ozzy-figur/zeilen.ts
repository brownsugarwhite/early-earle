// Je Zeile die rechte Kante von Weiß, ferner und naher Maske (Kopfkoordinaten) bei θ: npx vite-node scripts/ozzy-figur/zeilen.ts <theta>
import { readFileSync } from 'node:fs';
import { abflachen } from '../../src/ozzy-figur/form';
import { FigurRaster } from '../../src/ozzy-figur/raster';
import { ANSICHT_NAMEN, ANSICHTEN, importieren } from '../../src/ozzy-figur/vorlagen/import';

const ORDNER = new URL('../../../../docs/look/ozzy-figur/vorlagen/', import.meta.url);
const texte = Object.fromEntries(ANSICHT_NAMEN.map((n) => [ANSICHTEN[n].datei, readFileSync(new URL(ANSICHTEN[n].datei, ORDNER), 'utf8')]));
const raster = new FigurRaster(importieren(texte));
const th = Number(process.argv[2] ?? '90');
const teile = raster.teile({ psi: 90, theta: th, nurKopf: true });
let cx = 0, cy = 0, n = 0;
for (const t of teile) if (t.name === 'kopfA' || t.name === 'kopfB') for (const a of t.form) { cx += a.p[0]; cy += a.p[1]; n++; }
cx /= n; cy /= n;
const pts = (name: string): number[][] => { const a = abflachen(teile.find((t) => t.name === name)!.form, (q) => [q[0] - cx, q[1] - cy], 4); const o: number[][] = []; for (let k = 0; k < a.length; k += 2) o.push([a[k]!, a[k + 1]!]); return o; };
const reihe = (ps: number[][], y: number): string => {
  const xs: number[] = [];
  for (let k = 0; k < ps.length; k++) { const a = ps[k]!, b = ps[(k + 1) % ps.length]!; if ((a[1]! - y) * (b[1]! - y) <= 0 && a[1] !== b[1]) xs.push(a[0]! + ((y - a[1]!) / (b[1]! - a[1]!)) * (b[0]! - a[0]!)); }
  xs.sort((p, q) => p - q);
  return xs.map((x) => x.toFixed(0)).join('|').padEnd(22);
};
const P = Object.fromEntries(['bartA', 'bartB', 'kopfA', 'kopfB', 'nase'].map((x) => [x, pts(x)]));
console.log('   y  bartA                 bartB                 kopfA                 kopfB                 nase');
for (let y = -160; y <= 120; y += 8) console.log(String(y).padStart(5), ...['bartA', 'bartB', 'kopfA', 'kopfB', 'nase'].map((x) => reihe(P[x]!, y)));
