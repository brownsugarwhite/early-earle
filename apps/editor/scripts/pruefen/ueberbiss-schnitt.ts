// Schnittbilder des Überbiss-Mauls (Rex, zu): Querschnitt (z, y) an einem Ring und Längsschnitt (x, y) bei z ≈ konst, feine Punkte nach Art
import { dirname as _dirname, resolve as _resolve } from 'node:path';
import { fileURLToPath as _fileURLToPath } from 'node:url';
// gerettet aus dem Scratchpad der Sitzung vom 15.10. (Pfade relativ zum Repo)
const WURZEL = _resolve(_dirname(_fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? _resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
import { writeFileSync } from 'node:fs';
import rexJson from '../../../../packages/shape/src/versuch/vorlagen/rex.json';
import { type Vorlage, vorlageDokument } from '../../../../packages/shape/src/versuch';
import { ableitenMitMaul, maulOptionenVorlage, maulPose } from '../../../../packages/shape/src/kern/maul';
const rex = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
import { pruefwesenBauplan } from '../../../../packages/shape/src/kern/wesen';
const plan = pruefwesenBauplan('rex');
const extra = JSON.parse(process.env.EXTRAS ?? '{}');
const OEFF = Number(process.env.OEFF ?? 0);
const abl = ableitenMitMaul(rex, plan.maulLinie!, { stufen: 2 }, { ...maulOptionenVorlage('vorn'), ...(plan.maulOptionen ?? {}), ...extra });
const m = abl.maul;
const v = abl.vorlage;
const pose = maulPose(abl, OEFF);
const fein = pose.fein;
const X = pose.xyz;
const M = abl.unterteilung.matrix;
const nf = fein.length / 3;
const artFein = new Uint8Array(nf);
for (let i = 0; i < nf; i++) { let best = -1, bw = -1; for (let q = M.start[i]!; q < M.start[i + 1]!; q++) if (M.wert[q]! > bw) { bw = M.wert[q]!; best = M.index[q]!; } artFein[i] = m.art[best]!; }
const FARBE = ['#999', '#e0222a', '#2266ee', '#f29a1a', '#19b5b5', '#7a1f7a', '#111', '#c04fd0', '#1a7f3c'];
const T = Number(process.env.T ?? 6);
const ring = T - v.c / 2;
const lip = m.pfad[T]!;
const xs = X[3 * lip]!;
const zs = Number(process.env.ZS ?? X[3 * lip + 2]! * 0.7);
function svg(points: { a: number; b: number; art: number }[], polys: { pts: [number, number][]; farbe: string }[], titel: string, w = 560): string {
  let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
  for (const p of points) { amin = Math.min(amin, p.a); amax = Math.max(amax, p.a); bmin = Math.min(bmin, p.b); bmax = Math.max(bmax, p.b); }
  const pad = 0.01; amin -= pad; amax += pad; bmin -= pad; bmax += pad;
  const sc = w / Math.max(amax - amin, bmax - bmin);
  const h = (bmax - bmin) * sc;
  const ax = (a: number) => (a - amin) * sc; const by = (b: number) => (bmax - b) * sc;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + 24}" style="background:#fff;font:12px sans-serif"><text x="4" y="14">${titel}</text><g transform="translate(0,24)">`;
  for (const p of points) s += `<circle cx="${ax(p.a).toFixed(1)}" cy="${by(p.b).toFixed(1)}" r="1.6" fill="${FARBE[p.art]}"/>`;
  for (const pl of polys) s += `<polyline fill="none" stroke="${pl.farbe}" stroke-width="1.5" points="${pl.pts.map(([a, b]) => `${ax(a).toFixed(1)},${by(b).toFixed(1)}`).join(' ')}"/>` + pl.pts.map(([a, b]) => `<circle cx="${ax(a).toFixed(1)}" cy="${by(b).toFixed(1)}" r="3" fill="none" stroke="${pl.farbe}"/>`).join('');
  return s + '</g></svg>';
}
// Querschnitt: Platte |x - xs| < 0.004, Punkte (z, y)
const q: { a: number; b: number; art: number }[] = [];
for (let i = 0; i < nf; i++) if (Math.abs(fein[3 * i]! - xs) < 0.004) q.push({ a: fein[3 * i + 2]!, b: fein[3 * i + 1]!, art: artFein[i]! });
const P = (i: number): [number, number, number] => [X[3 * i]!, X[3 * i + 1]!, X[3 * i + 2]!];
const ringPoly: [number, number][] = []; if (ring >= 0) { for (let j = 0; j < v.N; j++) { const p = P(v.ringPunkt(ring, j)); ringPoly.push([p[2], p[1]]); } ringPoly.push(ringPoly[0]!); }
const K = m.tasche.oben.length;
const kettenO: [number, number][] = [[P(lip)[2], P(lip)[1]]]; for (let r = 0; r < K; r++) { const p = P(m.tasche.oben[r]![T]!); kettenO.push([p[2], p[1]]); }
const kettenU: [number, number][] = [[P(m.unten[T]!)[2], P(m.unten[T]!)[1]]]; for (let r = 0; r < K; r++) { const p = P(m.tasche.unten[r]![T]!); kettenU.push([p[2], p[1]]); }
const quer = svg(q, [{ pts: ringPoly, farbe: '#bbb' }, { pts: kettenO, farbe: '#e0222a' }, { pts: kettenU, farbe: '#2266ee' }], `Querschnitt Ring ${ring} (t=${T}), x=${xs.toFixed(3)}, Öffnung ${OEFF}: Käfigring grau, obere Kette rot, untere blau`);
// Längsschnitt: |z - zs| < 0.004, Punkte (x, y)
const l: { a: number; b: number; art: number }[] = [];
const XMIN = Number(process.env.XMIN ?? -Infinity), XMAX = Number(process.env.XMAX ?? Infinity);
for (let i = 0; i < nf; i++) if (Math.abs(fein[3 * i + 2]! - zs) < 0.004 && fein[3 * i]! >= XMIN && fein[3 * i]! <= XMAX) l.push({ a: fein[3 * i]!, b: fein[3 * i + 1]!, art: artFein[i]! });
const imX = (i: number) => { const p = P(i); return p[0] >= XMIN - 0.02 && p[0] <= XMAX + 0.02; };
const pfadPoly: [number, number][] = m.pfad.filter(imX).map((i) => { const p = P(i); return [p[0], p[1]]; });
const untenPoly: [number, number][] = m.unten.filter(imX).map((i) => { const p = P(i); return [p[0], p[1]]; });
const innenPoly: [number, number][] = m.tasche.oben[0]!.filter(imX).map((i) => { const p = P(i); return [p[0], p[1]]; });
const innen2Poly: [number, number][] = (m.tasche.oben[1] ?? []).filter(imX).map((i) => { const p = P(i); return [p[0], p[1]]; });
const laengs = svg(l, [{ pts: pfadPoly, farbe: '#e0222a' }, { pts: untenPoly, farbe: '#2266ee' }, { pts: innenPoly, farbe: '#f29a1a' }, { pts: innen2Poly, farbe: '#c04fd0' }], `Längsschnitt z=${zs.toFixed(3)}: Oberlippe rot, Unterkieferkante blau, Boden orange, Innenseite violett`);
writeFileSync(process.env.OUT ?? AUSGABE + '/ueberbiss-schnitt.html', `<html><body style="margin:8px;display:flex;gap:16px;flex-wrap:wrap">${quer}${laengs}</body></html>`);
console.log('geschrieben; lip', P(lip).map((x) => x.toFixed(3)).join(','), 'unten', P(m.unten[T]!).map((x) => x.toFixed(3)).join(','), 'innen', P(m.tasche.oben[0]![T]!).map((x) => x.toFixed(3)).join(','));
