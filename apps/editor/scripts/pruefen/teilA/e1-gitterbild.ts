// Aufruf aus packages/shape: AUSGABE=<datei.html> npx vite-node ../../apps/editor/scripts/pruefen/teilA/e1-gitterbild.ts; Bild: node scripts/pruefen/html-shot.mjs <html> <png> 1100 (aus apps/editor)
// Gitter des Einsatzes als SVG: Blick längs der mittleren Normalen des Felds (rechte Hälfte), Lippe rot, Rand schwarz, Linie
// gelb gestrichelt. Je Fall und Gitterart eine Tafel. Umgebung: FAELLE, GITTER (Liste, Standard beide), STUFE (1/2; Standard
// wie der Fall, K2), J, AR, NAH (Ausschnitt um den Mundwinkel: Halbbreite in letzten Lippenspannen), VERL, SCHNITT (pfad/linie),
// FELD, KAPPE, LAGE (karte/band), R (Ringe des Bands), P, ECKE (eckeMin), FAECHER (tutte/kreis), NAHT (bogen/karte/bogenKarte),
// A0 (editor), ANFANG (Ausschnitt um den Linienanfang statt um c).
import { writeFileSync } from 'node:fs';
import { einsatzFall } from '../../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { einsatzTopologie } from '../../../../../packages/shape/src/kern/einsatz/topologie';
type V3 = [number, number, number];
const AUS = process.env.AUSGABE ?? 'gitter.html';
const tafeln: string[] = [];
for (const name of (process.env.FAELLE ?? 'kugel/mittel/gerade').split(',')) {
  const [art, anfang, form] = name.split('/') as [never, never, never];
  const f = einsatzFall(art, anfang, form, { verlaengerung: Number(process.env.VERL ?? 0), ...(process.env.STUFE ? { stufe: Number(process.env.STUFE) as 1 | 2 } : {}), ...(process.env.SCHNITT ? { schnitt: process.env.SCHNITT as 'pfad' | 'linie' } : {}), ...(process.env.FELD ? { feld: process.env.FELD as 'begradigt' | 'kompakt' } : {}), ...(process.env.KAPPE ? { kappe: Number(process.env.KAPPE) } : {}), ...(process.env.A0 === 'editor' ? { a0: { art: 'editor' as const } } : {}) });
  if (!f || 'fehler' in f) continue;
  const linie = f.lippenZiel();
  for (const gitter of (process.env.GITTER ?? 'schleifen,kernring').split(',') as ('schleifen' | 'kernring')[]) {
    const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie, gitter, stufe: f.stufe, feldDreiecke: f.feldDreiecke, ...(process.env.ECKE ? { eckeMin: Number(process.env.ECKE) } : {}), ...(process.env.FAECHER ? { faecher: process.env.FAECHER as 'tutte' | 'kreis' } : {}), ...(process.env.NAHT ? { naht: process.env.NAHT as 'bogen' | 'karte' } : {}), ...(process.env.J ? { J: Number(process.env.J) } : {}), ...(process.env.AR ? { aussenRunden: Number(process.env.AR) } : {}), ...(process.env.LAGE ? { lage: process.env.LAGE as 'karte' | 'band', bandRinge: Number(process.env.R ?? 2), ...(process.env.P ? { bandRest: { art: 'tiefe' as const, p: Number(process.env.P) } } : {}) } : {}) });
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
    let x0 = Math.min(...xs);
    let x1 = Math.max(...xs);
    let y0 = Math.min(...ys);
    let y1 = Math.max(...ys);
    if (process.env.NAH) {
      // Ausschnitt um c (oder mit ANFANG=1 um den Linienanfang U₀): Halbbreite NAH letzte Lippenspannen
      const cc = proj(P(t.haut[0]![process.env.ANFANG ? 0 : t.m]!));
      const u = proj(P(t.haut[0]![process.env.ANFANG ? 1 : t.m - 1]!));
      const h = Number(process.env.NAH) * Math.hypot(cc[0] - u[0], cc[1] - u[1]);
      x0 = cc[0] - h;
      x1 = cc[0] + h;
      y0 = cc[1] - h;
      y1 = cc[1] + h;
    }
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
    // Randpunkte nummeriert (alle 5), Randpunkt M rot
    if (process.env.NUMMERN) t.haut[t.J]!.forEach((i, k) => {
      const [x, y] = sx(proj(P(i))).split(',');
      if (k === t.M) linien.push(`<circle cx="${x}" cy="${y}" r="4" fill="#d02020"/>`);
      if (k % 5 === 0) linien.push(`<text x="${x}" y="${y}" font-size="10" fill="#202020">${k}</text>`);
    });
    const lin = linie.map((p) => sx(proj(p)));
    linien.push(`<polyline fill="none" stroke="#e0a000" stroke-width="1" stroke-dasharray="3 2" points="${lin.join(' ')}"/>`);
    const c = t.haut[0]![t.m]!;
    linien.push(`<circle cx="${sx(proj(P(c))).split(',')[0]}" cy="${sx(proj(P(c))).split(',')[1]}" r="3" fill="#d02020"/>`);
    tafeln.push(`<div style="display:inline-block;margin:4px;vertical-align:top"><div style="font:12px sans-serif">${name} · ${gitter} · K${f.stufe} · m ${t.m} M ${t.M} J ${t.J}${t.umgeklappt ? ` · umgeklappt ${t.umgeklappt}` : ''}</div><svg width="${W}" height="${W}" style="background:#fff;border:1px solid #ccc;overflow:hidden">${linien.join('')}</svg></div>`);
  }
}
writeFileSync(AUS, `<!doctype html><html><body style="margin:8px;background:#f4efe6">${tafeln.join('')}</body></html>`);
console.log(AUS);
