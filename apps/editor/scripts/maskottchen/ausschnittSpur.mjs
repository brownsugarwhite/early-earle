// Punkte einer Nachzeichnung in einem Kasten ausgeben (Logo-Koordinaten), jede Kontur für sich, der Reihe nach.
//   node scripts/maskottchen/ausschnittSpur.mjs spur-seite.json x0 y0 x1 y1 [schritt]
import { readFileSync } from 'node:fs';

const [datei, x0, y0, x1, y1, schritt = '12'] = process.argv.slice(2);
const spur = JSON.parse(readFileSync(new URL(`../../../../docs/look/maskottchen/${datei}`, import.meta.url), 'utf8'));
const k = [Number(x0), Number(y0), Number(x1), Number(y1)];
const abstand = Number(schritt);
spur.umrisse.forEach((u, ui) => {
  const pts = [];
  for (const [a, b, c, d] of u.stuecke) {
    for (let i = 0; i < 16; i++) {
      const t = i / 16;
      const s = 1 - t;
      pts.push([
        s * s * s * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t * t * t * d[0],
        s * s * s * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t * t * t * d[1],
      ]);
    }
  }
  const drin = [];
  let letzter = null;
  for (const p of pts) {
    if (p[0] < k[0] || p[0] > k[2] || p[1] < k[1] || p[1] > k[3]) {
      letzter = null;
      continue;
    }
    if (letzter && Math.hypot(p[0] - letzter[0], p[1] - letzter[1]) < abstand) continue;
    drin.push(`${p[0].toFixed(0)},${p[1].toFixed(0)}`);
    letzter = p;
  }
  if (drin.length) console.log(`Kontur ${ui} (Fläche ${u.flaeche}):`, drin.join('  '));
});
