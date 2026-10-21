// Aufruf aus packages/shape: AUSGABE=<datei.html> npx vite-node ../../apps/editor/scripts/pruefen/teilA/e1-gitterbild.ts; Bild: node scripts/pruefen/html-shot.mjs <html> <png> 1100 (aus apps/editor)
// Gitter des Einsatzes als SVG: Seitenansicht (x, y) der rechten Hälfte, Lippe rot, Reihen grau, Speichen blau, Rand schwarz;
// dazu die Karte (U, V). Je Fall und Gitterart eine Tafel.
import { writeFileSync } from 'node:fs';
import { einsatzFall } from '../../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { einsatzTopologie } from '../../../../../packages/shape/src/kern/einsatz/topologie';
type V3 = [number, number, number];
const AUS = process.env.AUSGABE ?? 'gitter.html';
const tafeln: string[] = [];
for (const name of (process.env.FAELLE ?? 'kugel/mittel/gerade').split(',')) {
  const [art, anfang, form] = name.split('/') as [never, never, never];
  const f = einsatzFall(art, anfang, form, { verlaengerung: Number(process.env.VERL ?? 0) });
  if (!f || 'fehler' in f) continue;
  const linie = f.lippenZiel();
  for (const gitter of ['schleifen', 'kernring'] as const) {
    const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie, gitter });
    const xyz = t.kaefig.xyz;
    const P = (i: number): V3 => [xyz[3 * i]!, xyz[3 * i + 1]!, xyz[3 * i + 2]!];
    // Ansicht: Blick längs der mittleren Normalen des Felds (rechte Hälfte), Achsen in der Bildebene
    const alle = t.haut.flat();
    const mitte: V3 = [0, 0, 0];
    for (const i of alle) for (let d = 0; d < 3; d++) mitte[d] += P(i)[d]! / alle.length;
    // Normale: Mittel der Kreuzprodukte der Hautzellen
    const n: V3 = [0, 0, 0];
    for (let fl = 0; fl < t.kaefig.nF; fl++) {
      if (t.bereich[fl] !== 2) continue;
      const e = Array.from(t.kaefig.fVerts.subarray(t.kaefig.fStart[fl]!, t.kaefig.fStart[fl + 1]!)).map(P);
      const a = [e[2]![0] - e[0]![0], e[2]![1] - e[0]![1], e[2]![2] - e[0]![2]];
      const b = [e[3]![0] - e[1]![0], e[3]![1] - e[1]![1], e[3]![2] - e[1]![2]];
      n[0] += a[1]! * b[2]! - a[2]! * b[1]!;
      n[1] += a[2]! * b[0]! - a[0]! * b[2]!;
      n[2] += a[0]! * b[1]! - a[1]! * b[0]!;
    }
    const ln = Math.hypot(...n);
    const N: V3 = [n[0] / ln, n[1] / ln, n[2] / ln];
    const hoch: V3 = [0, 1, 0];
    const dn = hoch[0] * N[0] + hoch[1] * N[1] + hoch[2] * N[2];
    let Y: V3 = [hoch[0] - dn * N[0], hoch[1] - dn * N[1], hoch[2] - dn * N[2]];
    const ly = Math.hypot(...Y);
    Y = [Y[0] / ly, Y[1] / ly, Y[2] / ly];
    const X: V3 = [Y[1] * N[2] - Y[2] * N[1], Y[2] * N[0] - Y[0] * N[2], Y[0] * N[1] - Y[1] * N[0]];
    const proj = (p: V3): [number, number] => {
      const d = [p[0] - mitte[0], p[1] - mitte[1], p[2] - mitte[2]];
      return [d[0]! * X[0] + d[1]! * X[1] + d[2]! * X[2], d[0]! * Y[0] + d[1]! * Y[1] + d[2]! * Y[2]];
    };
    const pts = alle.map((i) => proj(P(i)));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const W = 520;
    const s = (W - 20) / Math.max(x1 - x0, y1 - y0);
    const sx = (p: [number, number]) => `${(10 + (p[0] - x0) * s).toFixed(1)},${(10 + (y1 - p[1]) * s).toFixed(1)}`;
    const linien: string[] = [];
    const zug = (ids: number[], farbe: string, breite: number) => linien.push(`<polyline fill="none" stroke="${farbe}" stroke-width="${breite}" points="${ids.map((i) => sx(proj(P(i)))).join(' ')}"/>`);
    for (let fl = 0; fl < t.kaefig.nF; fl++) {
      if (t.bereich[fl] !== 2) continue;
      const e = Array.from(t.kaefig.fVerts.subarray(t.kaefig.fStart[fl]!, t.kaefig.fStart[fl + 1]!));
      linien.push(`<polygon fill="rgba(80,120,220,0.06)" stroke="#8aa0c8" stroke-width="0.6" points="${e.map((i) => sx(proj(P(i)))).join(' ')}"/>`);
    }
    zug(t.haut[0]!, '#d02020', 2);
    zug(t.haut[t.J]!, '#202020', 1.5);
    const lin = linie.map((p) => sx(proj(p)));
    linien.push(`<polyline fill="none" stroke="#e0a000" stroke-width="1" stroke-dasharray="3 2" points="${lin.join(' ')}"/>`);
    const c = t.haut[0]![t.m]!;
    linien.push(`<circle cx="${sx(proj(P(c))).split(',')[0]}" cy="${sx(proj(P(c))).split(',')[1]}" r="3" fill="#d02020"/>`);
    tafeln.push(`<div style="display:inline-block;margin:4px;vertical-align:top"><div style="font:12px sans-serif">${name} · ${gitter} · m ${t.m} M ${t.M} J ${t.J}</div><svg width="${W}" height="${W}" style="background:#fff;border:1px solid #ccc">${linien.join('')}</svg></div>`);
  }
}
writeFileSync(AUS, `<!doctype html><html><body style="margin:8px;background:#f4efe6">${tafeln.join('')}</body></html>`);
console.log(AUS);
