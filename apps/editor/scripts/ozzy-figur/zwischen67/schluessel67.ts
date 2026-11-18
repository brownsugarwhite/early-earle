// Zwischenschlüssel 67° aus Florians Übermalung (docs/look/ozzy-figur/vorlagen/ozzy_kopf67_florian.png). Ablauf, aus apps/editor
// mit laufender Seite auf Port 5213:
//   1. node scripts/ozzy-figur/zwischen67/register.mjs      Übermalung auf die Darstellung legen (abbildung.json)
//   2. node scripts/ozzy-figur/zwischen67/daten67.mjs       Kopfteile bei 67° und seine Konturübergänge (daten67.json)
//   3. npx vite-node scripts/ozzy-figur/zwischen67/schluessel67.ts   Schlüssel für bartB (bartB67.json), nach
//      src/ozzy-figur/vorlagen/zwischen.ts übertragen
//   4. node scripts/ozzy-figur/zwischen67/vergleich67.mjs   Unterschied zu seiner Übermalung (vergleich67.png)
// Achtung: Schritt 1 und 2 lesen die Darstellung mit den Schlüsseln, die gerade gelten; für einen neuen Abgleich den
// Zwischenschlüssel vorher herausnehmen.
// 67°-Schlüssel für bartB aus Florians Übermalung: Franse (Kerbe 2, Spitze 3) und die ferne Bartkante (3 → 4) auf seine Kontur,
// Anker 4 an die Spitze des Bands an der Nase, 5 knapp außerhalb der Maske; übrige Anker wie gemischt. Ausgabe in Kopfkoordinaten.
import { readFileSync, writeFileSync } from 'node:fs';
const W = new URL('../../../../../', import.meta.url).pathname;
const { ANSICHT_NAMEN, ANSICHTEN, importieren } = await import(W + 'apps/editor/src/ozzy-figur/vorlagen/import.ts');
const { FigurRaster, formAusSchluesseln } = await import(W + 'apps/editor/src/ozzy-figur/raster.ts');
const texte: Record<string, string> = {};
for (const a of ANSICHT_NAMEN) texte[ANSICHTEN[a].datei] = readFileSync(W + 'docs/look/ozzy-figur/vorlagen/' + ANSICHTEN[a].datei, 'utf8');
const r: any = new FigurRaster(importieren(texte));
const D = JSON.parse(readFileSync(new URL('daten67.json', import.meta.url), 'utf8'));
const a = D.abb;
type P = [number, number];
// seine Pixel → Körper
const K = (u: number, v: number): P => [(u - a.tx) / a.S + a.x0, (v - a.ty) / a.S + a.y0];
// Körper ↔ Kopf bei θ = 67 (Versatz aus der Nase)
const TH = 67;
const nKopf = formAusSchluesseln(r.kopf.get('nase'), TH);
const nKoerper = r.teile({ psi: 90, theta: TH }).find((t: any) => t.name === 'nase').form;
const off: P = [nKoerper[0].p[0] - nKopf[0].p[0], nKoerper[0].p[1] - nKopf[0].p[1]];
const kopfVon = (q: P): P => [q[0] - off[0], q[1] - off[1]];
const zeile = (y: number) => D.zeilen.find((z: any) => z[0] === y)?.[1] as [number, string][] | undefined;
// Konturpunkte (seine Pixel)
const bandInnen: P[] = [], flanke: P[] = [], koerperKante: P[] = [];
for (let y = 736; y <= 1017; y++) {
  const u = zeile(y)!; const lastSw = u.map((x) => x[1]).lastIndexOf('sw');
  if (lastSw > 0 && u[lastSw - 1]![1] === 'ws') bandInnen.push([u[lastSw - 1]![0], y]);
}
const bandAussen: P[] = [];
for (let y = 734; y <= 772; y++) { const u = zeile(y)!; const w = u.map((x) => x[1]).lastIndexOf('sw'); if (w >= 0) bandAussen.push([u[w]![0], y]); }
for (let y = 957; y <= 1016; y++) { const u = zeile(y)!; const w = u.find((x) => x[1] === 'sw' && x[0] > 1120); if (w) flanke.push([w[0], y]); }
for (let y = 957; y <= 1199; y++) { const u = zeile(y)!; const w = u.filter((x) => x[1] === 'ws' && x[0] > 980 && x[0] < 1135); if (w.length) koerperKante.push([w[w.length - 1]![0], y]); }
// Bézier-Stück mit festen Enden an Punkte anpassen (kleinste Quadrate, Parameter nach Sehnenlänge, zweimal nachgestellt)
function anpassen(P0: P, P3: P, Q: P[]): [P, P] {
  let t = Q.map((_, i) => i);
  const len: number[] = [0]; for (let i = 1; i < Q.length; i++) len.push(len[i - 1]! + Math.hypot(Q[i]![0] - Q[i - 1]![0], Q[i]![1] - Q[i - 1]![1]));
  const L = len[len.length - 1]! + Math.hypot(Q[0]![0] - P0[0], Q[0]![1] - P0[1]) + Math.hypot(P3[0] - Q[Q.length - 1]![0], P3[1] - Q[Q.length - 1]![1]);
  t = len.map((l) => (l + Math.hypot(Q[0]![0] - P0[0], Q[0]![1] - P0[1])) / L);
  let P1: P = [0, 0], P2: P = [0, 0];
  for (let runde = 0; runde < 4; runde++) {
    let a11 = 0, a12 = 0, a22 = 0; const b1 = [0, 0], b2 = [0, 0];
    Q.forEach((q, i) => { const s = t[i]!, m = 1 - s; const A1 = 3 * m * m * s, A2 = 3 * m * s * s; const R0 = q[0] - m * m * m * P0[0] - s * s * s * P3[0]; const R1 = q[1] - m * m * m * P0[1] - s * s * s * P3[1];
      a11 += A1 * A1; a12 += A1 * A2; a22 += A2 * A2; b1[0] += A1 * R0; b1[1] += A1 * R1; b2[0] += A2 * R0; b2[1] += A2 * R1; });
    const det = a11 * a22 - a12 * a12;
    P1 = [(a22 * b1[0]! - a12 * b2[0]!) / det, (a22 * b1[1]! - a12 * b2[1]!) / det];
    P2 = [(a11 * b2[0]! - a12 * b1[0]!) / det, (a11 * b2[1]! - a12 * b1[1]!) / det];
    // Parameter nachstellen: nächster Punkt auf der Kurve (feines Abtasten)
    const B = (s: number): P => { const m = 1 - s; return [m * m * m * P0[0] + 3 * m * m * s * P1[0] + 3 * m * s * s * P2[0] + s * s * s * P3[0], m * m * m * P0[1] + 3 * m * m * s * P1[1] + 3 * m * s * s * P2[1] + s * s * s * P3[1]]; };
    const abt = Array.from({ length: 401 }, (_, i) => B(i / 400));
    t = Q.map((q) => { let best = 0, bd = Infinity; abt.forEach((c, i) => { const d = (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2; if (d < bd) { bd = d; best = i / 400; } }); return best; });
  }
  return [P1, P2];
}
// Ankerziele (seine Pixel)
const kerbe: P = [1129, 955];
const spitze: P = [1165.5, 1019.5];
const bandSpitze: P = [1181, 733];
const mix = r.teile({ psi: 90, theta: TH }).find((t: any) => t.name === 'bartB').form.map((x: any) => ({ p: [...x.p], i: [...x.i], o: [...x.o] }));
const U = (q: P): P => [(q[0] - a.x0) * a.S + a.tx, (q[1] - a.y0) * a.S + a.ty];
const pix = mix.map((x: any) => ({ p: U(x.p), i: U(x.i), o: U(x.o) }));
// Anker 5: knapp außerhalb der Maske, in Richtung weg von der Nase verschoben
const a5: P = [1208.5, 773];
const kB = r.teile({ psi: 90, theta: TH }).find((t: any) => t.name === 'kopfB').form.map((x: any) => ({ p: U(x.p), i: U(x.i), o: U(x.o) }));
const neu = pix.map((x: any) => ({ ...x }));
neu[2] = { p: kerbe, i: [kerbe[0] + (pix[2].i[0] - pix[2].p[0]), kerbe[1] + (pix[2].i[1] - pix[2].p[1])], o: kerbe };
neu[3] = { p: spitze, i: spitze, o: spitze };
neu[4] = { p: bandSpitze, i: bandSpitze, o: bandSpitze };
// 5 → 6 außen an der Maske entlang: Richtung und Länge wie das Stück 5 → 6 der Maske
// außen an der Maske: das Stück 5 → 6 der Maske, um AUSSEN Bildpunkte nach außen geschoben (Normale nach rechts der Laufrichtung)
const AUSSEN = Number(process.env.AUSSEN ?? 14);
{ const d = [kB[6].p[0] - kB[5].p[0], kB[6].p[1] - kB[5].p[1]]; const l = Math.hypot(d[0], d[1]); const nx = -d[1] / l, ny = d[0] / l; const s = (nx > 0 ? 1 : -1) * AUSSEN;
  neu[5] = { p: a5, i: a5, o: [kB[5].o[0] + nx * s, kB[5].o[1] + ny * s] };
  neu[6] = { ...neu[6], i: [kB[6].i[0] + nx * s, kB[6].i[1] + ny * s] }; }
// 1 → 2: Körperkante unter der Kerbe (von unten nach oben: Punkte umdrehen)
{ const Q = koerperKante.slice().reverse(); const [P1, P2] = anpassen(neu[1].p, kerbe, Q); neu[1] = { ...neu[1], o: P1 }; neu[2] = { ...neu[2], i: P2 }; }
// 2 → 3: linke Flanke der Spitze
{ const [P1, P2] = anpassen(kerbe, spitze, flanke); neu[2] = { ...neu[2], o: P1 }; neu[3] = { ...neu[3], i: P2 }; }
// 3 → 4: Bartkante vom Fransenende hinauf zur Spitze des Bands (Punkte von unten nach oben)
{ const Q = bandInnen.slice().reverse(); const [P1, P2] = anpassen(spitze, bandSpitze, Q); neu[3] = { ...neu[3], o: P1 }; neu[4] = { ...neu[4], i: P2 }; }
// 4 → 5: Außenkante des Bands oben (Weiß deckt die Maske bis dorthin)
{ const [P1, P2] = anpassen(bandSpitze, a5, bandAussen); neu[4] = { ...neu[4], o: P1 }; neu[5] = { ...neu[5], i: P2 }; }
const form = neu.map((x: any) => ({ p: kopfVon(K(x.p[0], x.p[1])), i: kopfVon(K(x.i[0], x.i[1])), o: kopfVon(K(x.o[0], x.o[1])) }));
writeFileSync(new URL('bartB67.json', import.meta.url), JSON.stringify({ w: TH, teil: 'bartB', form }, null, 1));
console.log('Versatz', off.map((v) => v.toFixed(2)).join(','), 'Punkte', bandInnen.length, flanke.length, koerperKante.length);
console.log(neu.map((x: any, k: number) => `${k}:(${x.p.map((v: number) => v.toFixed(0)).join(',')})`).join(' '));
