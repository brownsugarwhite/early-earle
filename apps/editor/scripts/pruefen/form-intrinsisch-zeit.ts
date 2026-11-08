// Form zuerst (08.11.2026): Wie lange braucht die intrinsische Delaunay-Triangulierung der Haut (Startkugel, unten wie sie ist, oben
// auf das Dreifache gestreckt wie ein gezogener Hals)? Aufruf aus packages/shape:
// npx vite-node ../../apps/editor/scripts/pruefen/form-intrinsisch-zeit.ts
import { intrinsischeGewichte } from '../../../../packages/shape/src/dicht/intrinsisch';
import { hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';

for (const dreiecke of [6000, 12000, 24000]) {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke },
  );
  const h = hautAus(n.positionen, n.indizes);
  for (let v = 0; v < h.n; v++) if (h.pos[3 * v + 1]! > 0) h.pos[3 * v + 1] = 3 * h.pos[3 * v + 1]!;
  const zeiten: number[] = [];
  let flips = 0;
  for (let k = 0; k < 6; k++) {
    const t0 = performance.now();
    flips = intrinsischeGewichte(h).flips;
    zeiten.push(performance.now() - t0);
  }
  console.log(`${h.n} Punkte: ${Math.min(...zeiten.slice(1)).toFixed(2)} ms (bestes von 5), ${flips} Klappungen`);
}
