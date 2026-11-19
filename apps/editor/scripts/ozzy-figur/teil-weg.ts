// Weg eines Kopfteils über θ (Mitte und Kasten in Kopfkoordinaten), für Prüfungen: npx vite-node scripts/ozzy-figur/teil-weg.ts <teil> <von> <bis> <schritt>
import { readFileSync } from 'node:fs';
import { FigurRaster } from '../../src/ozzy-figur/raster';
import { ANSICHT_NAMEN, ANSICHTEN, importieren } from '../../src/ozzy-figur/vorlagen/import';

const ORDNER = new URL('../../../../docs/look/ozzy-figur/vorlagen/', import.meta.url);
const texte = Object.fromEntries(ANSICHT_NAMEN.map((n) => [ANSICHTEN[n].datei, readFileSync(new URL(ANSICHTEN[n].datei, ORDNER), 'utf8')]));
const raster = new FigurRaster(importieren(texte));
const [teil = 'nase', von = '80', bis = '110', schritt = '1'] = process.argv.slice(2);
let vor: number[] | null = null;
for (let th = Number(von); th <= Number(bis) + 1e-9; th += Number(schritt)) {
  const teile = raster.teile({ psi: 90, theta: th, nurKopf: true });
  // in Körperkoordinaten (der Kopf sitzt am Hals, sein Versatz wandert glatt mit θ)
  const cx = 0, cy = 0, n = 1;
  const f = teile.find((t) => t.name === teil)!.form;
  let mx = 0, my = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const a of f) { mx += a.p[0]; my += a.p[1]; x0 = Math.min(x0, a.p[0]); x1 = Math.max(x1, a.p[0]); y0 = Math.min(y0, a.p[1]); y1 = Math.max(y1, a.p[1]); }
  mx /= f.length; my /= f.length;
  const w = [mx - cx / n, my - cy / n, x1 - x0, y1 - y0];
  const d = vor ? w.map((v, i) => v - vor![i]!) : [0, 0, 0, 0];
  console.log(`θ ${th.toFixed(1).padStart(6)}  Mitte (${w[0]!.toFixed(1)}, ${w[1]!.toFixed(1)})  Breite ${w[2]!.toFixed(1)}  Höhe ${w[3]!.toFixed(1)}   je Schritt Δx ${d[0]!.toFixed(2)} Δy ${d[1]!.toFixed(2)} Δb ${d[2]!.toFixed(2)}`);
  vor = w;
}
