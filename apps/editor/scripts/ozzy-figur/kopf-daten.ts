// Kopfteile eines Winkels in Kopfkoordinaten (Schlüssel und gemischt), für Prüfungen: npx vite-node scripts/ozzy-figur/kopf-daten.ts <theta,…>
import { readFileSync } from 'node:fs';
import { FigurRaster } from '../../src/ozzy-figur/raster';
import { ANSICHT_NAMEN, ANSICHTEN, importieren } from '../../src/ozzy-figur/vorlagen/import';

const ORDNER = new URL('../../../../docs/look/ozzy-figur/vorlagen/', import.meta.url);
const texte = Object.fromEntries(ANSICHT_NAMEN.map((n) => [ANSICHTEN[n].datei, readFileSync(new URL(ANSICHTEN[n].datei, ORDNER), 'utf8')]));
const raster = new FigurRaster(importieren(texte));
const liste = (process.argv[2] ?? '90').split(',').map(Number);
for (const th of liste) {
  const teile = raster.teile({ psi: 90, theta: th, nurKopf: true });
  let cx = 0, cy = 0, n = 0;
  for (const t of teile) if (t.name === 'kopfA' || t.name === 'kopfB') for (const a of t.form) { cx += a.p[0]; cy += a.p[1]; n++; }
  cx /= n; cy /= n;
  console.log(`θ ${th}`);
  for (const t of teile) console.log(`  ${t.name.padEnd(8)} ` + t.form.map((a, k) => `${k}:(${Math.round(a.p[0] - cx)},${Math.round(a.p[1] - cy)})`).join(' '));
}
