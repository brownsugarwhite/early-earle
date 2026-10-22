import { describe, it } from 'vitest';
import { type Dokument } from '../dokument';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexJson from '../versuch/vorlagen/rex.json';
import langhalsJson from '../versuch/vorlagen/langhals.json';
import { alleFlaechen } from '../kaefig/halbkanten';
import { selbstDurchdringungen } from '../versuch/pruefen';
import type { V3 } from '../versuch/catmullClark';
import { ableitenMitMaul, maulLinieVorlage, maulOptionenVorlage, maulPose } from './maul';

declare const console: { log: (...a: unknown[]) => void };
const ARTEN = ['haut', 'lippeO', 'lippeU', 'tascheO', 'tascheU', 'rachen', 'winkel'];

function diag(name: string, dok: Dokument, art: 'vorn' | 'unten' | 'hals', oeffnung: number) {
  const abl = ableitenMitMaul(dok, maulLinieVorlage(dok, art), { stufen: 2 }, maulOptionenVorlage(art));
  const m = abl.maul;
  const M = abl.unterteilung.matrix;
  const { fein } = maulPose(abl, oeffnung);
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const flaechen = alleFlaechen(letzte);
  const punkte: V3[] = [];
  for (let i = 0; i < fein.length / 3; i++) punkte.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
  // Herkunft je feiner Fläche: Elternfläche im Käfig (Kindflächen je Stufe stehen in der Reihenfolge der Eltern-Ecken)
  let eltern: number[] = flaechen.map((_, i) => i);
  const stufen = abl.unterteilung.stufen;
  for (let L = stufen.length - 1; L >= 0; L--) {
    const parent = L === 0 ? abl.kaefig : stufen[L - 1]!.kaefig;
    const kind = new Array<number>(stufen[L]!.kaefig.nF);
    let c = 0;
    for (let f = 0; f < parent.nF; f++) for (let e = parent.fStart[f]!; e < parent.fStart[f + 1]!; e++) kind[c++] = f;
    eltern = eltern.map((e) => kind[e]!);
  }
  const kf = alleFlaechen(abl.kaefig);
  const bereiche = eltern.map((f) => `F${f}[${kf[f]!.map((v) => `${ARTEN[m.art[v]!]}${v}`).join(' ')}]`);
  const d = selbstDurchdringungen({ punkte, flaechen, schaerfe: new Map() }, 1e-4, bereiche);
  // feine Taschenpunkte außerhalb der Haut: Vergleich mit dem Profil der nächsten Station (Ringe) der Haut-Grenzlagen
  const v = abl.vorlage;
  const stationen = [] as { cx: number; cy: number; dx: number; dy: number; H: number; profil: { a: number; z: number }[] }[];
  for (let i = 0; i < v.R; i++) {
    const pts: number[] = [];
    for (let j = 0; j <= v.N / 2; j++) pts.push(v.ringPunkt(i, j));
    let cx = 0;
    let cy = 0;
    for (const r of pts) {
      cx += fein[3 * r]! / pts.length;
      cy += fein[3 * r + 1]! / pts.length;
    }
    const o = pts[0]!;
    const u = pts[pts.length - 1]!;
    let dx = fein[3 * o]! - fein[3 * u]!;
    let dy = fein[3 * o + 1]! - fein[3 * u + 1]!;
    const H = Math.hypot(dx, dy) || 1e-9;
    dx /= H;
    dy /= H;
    stationen.push({ cx, cy, dx, dy, H, profil: pts.map((r) => ({ a: (fein[3 * r]! - cx) * dx + (fein[3 * r + 1]! - cy) * dy, z: Math.abs(fein[3 * r + 2]!) })) });
  }
  const draussen: string[] = [];
  const artArr = m.art;
  for (let i = 0; i < punkte.length; i++) {
    let wT = 0;
    for (let p = M.start[i]!; p < M.start[i + 1]!; p++) if (artArr[M.index[p]!]! >= 3) wT += M.wert[p]!;
    if (wT < 0.5) continue;
    const p = punkte[i]!;
    let best = stationen[0]!;
    let bestD = Infinity;
    for (const st of stationen) {
      const dd = Math.hypot(p[0] - st.cx, p[1] - st.cy);
      if (dd < bestD) {
        bestD = dd;
        best = st;
      }
    }
    const a = (p[0] - best.cx) * best.dx + (p[1] - best.cy) * best.dy;
    let w = -1;
    for (let q = 0; q + 1 < best.profil.length; q++) {
      const p0 = best.profil[q]!;
      const p1 = best.profil[q + 1]!;
      if ((p0.a >= a && a >= p1.a) || (p1.a >= a && a >= p0.a)) w = Math.max(w, p0.z + ((p1.z - p0.z) * (p0.a - a)) / ((p0.a - p1.a) || 1e-12));
    }
    if (w < 0 || Math.abs(p[2]) > w + 1e-4) draussen.push(`fein ${i} (${p.map((x) => x.toFixed(3)).join(',')}) |z| ${Math.abs(p[2]).toFixed(3)} > Breite ${w.toFixed(3)} (a ${a.toFixed(3)}, H ${best.H.toFixed(3)})`);
  }
  console.log(`  Taschenpunkte außerhalb (${draussen.length}): ${draussen.slice(0, 6).join(' | ')}`);
  const paare = Object.entries(d.nachBereich).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`${name} (${art}, Öffnung ${oeffnung}): ${d.paare} Paare\n` + paare.map(([k, n]) => `  ${n}× ${k} bei (${(d.orteNachBereich[k] ?? [])[0]?.map((x) => x.toFixed(3)).join(',')})`).join('\n'));
  // Lage der Lippenkette (Grenzlagen) und Pfad-Käfigindizes
  console.log('  Pfad: ' + m.pfad.map((idx, t) => `t${t}=${idx}(${punkte[idx]!.map((x) => x.toFixed(3)).join(',')})`).join(' '));
}

describe('Maul-Diagnose', () => {
  it('druckt', () => {
    const rex = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
    diag('Rex', rex, 'vorn', 0);
    const langhals = vorlageDokument(langhalsJson as unknown as Vorlage, 'zu', 'langhals');
    diag('Langhals', langhals, 'hals', 0);
  });
});
