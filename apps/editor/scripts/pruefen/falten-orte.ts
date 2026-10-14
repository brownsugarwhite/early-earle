// Wo liegen die Falten eines Falls der Prüfreihe? Je Öffnung die größten Knicke zwischen Haut- bzw. Lippenflächen mit Ort,
// Bereich und Kiefergewicht. Aus packages/shape: FALL=kugel-gleich npx vite-node ../../apps/editor/scripts/pruefen/falten-orte.ts
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { ableitenMitMaul, maulOptionenVorlage, maulPose } from '../../../../packages/shape/src/kern/maul';
import { maulLinieAusDokument } from '../../../../packages/shape/src/kern/maulDokument';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/test-results/pruefen');
const faelle = JSON.parse(readFileSync(resolve(AUSGABE, 'pruefreihe.json'), 'utf-8')) as Record<string, { dok: Dokument }>;
const FALL = process.env.FALL ?? 'kugel-gleich';
const dok = faelle[FALL]!.dok;
const g = dok.kaefig?.stationen;
const abl = ableitenMitMaul(dok, maulLinieAusDokument(dok)!, { stufen: 2, ...(g ? { stationen: g } : {}) }, maulOptionenVorlage('vorn'));
const m = abl.maul;
const M = abl.unterteilung.matrix;
const kaefig = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
const flaechen = alleFlaechen(kaefig);
const ARTEN = ['haut', 'lippeO', 'lippeU', 'tascheO', 'tascheU', 'rachen', 'winkel'];
// Bereich je Fläche (wie pruefstand.regionen) und Unterkiefergewicht je feinem Punkt
const nf = abl.fein.length / 3;
const gU = new Float64Array(nf);
for (let i = 0; i < nf; i++) for (let q = M.start[i]!; q < M.start[i + 1]!; q++) gU[i] += M.wert[q]! * m.gewichtUnten[M.index[q]!]!;
const bereich = flaechen.map((f) => {
  const i = f[0]!;
  const g = new Float64Array(8);
  for (let p = M.start[i]!; p < M.start[i + 1]!; p++) g[m.art[M.index[p]!]!] += M.wert[p]!;
  let best = 0;
  for (let a = 1; a < 8; a++) if (g[a]! > g[best]!) best = a;
  return ARTEN[best]!;
});
for (const oe of (process.env.OEFF ?? '0,0.5,1').split(',').map(Number)) {
  const fein = oe === 0 ? abl.fein : maulPose(abl, oe).fein;
  const nrm = new Float64Array(3 * kaefig.nF);
  for (let f = 0; f < kaefig.nF; f++) {
    let nx = 0, ny = 0, nz = 0;
    const a = kaefig.fStart[f]!, b = kaefig.fStart[f + 1]!;
    for (let h = a; h < b; h++) {
      const p = kaefig.fVerts[h]!, q = kaefig.fVerts[h + 1 < b ? h + 1 : a]!;
      nx += (fein[3 * p + 1]! - fein[3 * q + 1]!) * (fein[3 * p + 2]! + fein[3 * q + 2]!);
      ny += (fein[3 * p + 2]! - fein[3 * q + 2]!) * (fein[3 * p]! + fein[3 * q]!);
      nz += (fein[3 * p]! - fein[3 * q]!) * (fein[3 * p + 1]! + fein[3 * q + 1]!);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    nrm[3 * f] = nx / l; nrm[3 * f + 1] = ny / l; nrm[3 * f + 2] = nz / l;
  }
  const liste: { w: number; b: string; p: number[]; gu: number }[] = [];
  for (let e = 0; e < kaefig.nE; e++) {
    if (kaefig.eFlaechen[e] !== 2 || kaefig.eSchaerfe[e]! > 0) continue;
    const h = kaefig.eHalb[e]!, t = kaefig.hTwin[h]!;
    if (t < 0) continue;
    const f1 = kaefig.hFace[h]!, f2 = kaefig.hFace[t]!;
    const b1 = bereich[f1]!, b2 = bereich[f2]!;
    const art = b1 === 'haut' && b2 === 'haut' ? 'haut' : (b1 === 'lippeO' || b1 === 'lippeU') && (b2 === 'lippeO' || b2 === 'lippeU') ? 'lippe' : '';
    if (!art) continue;
    const c = nrm[3 * f1]! * nrm[3 * f2]! + nrm[3 * f1 + 1]! * nrm[3 * f2 + 1]! + nrm[3 * f1 + 2]! * nrm[3 * f2 + 2]!;
    const w = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
    if (w < 20) continue;
    const a = kaefig.eA[e]!;
    // XMAX: nur Knicke vor dieser Stelle (z. B. die Spitze ohne das Scharnier)
    if (fein[3 * a]! > Number(process.env.XMAX ?? Infinity)) continue;
    liste.push({ w, b: art + (b1 !== b2 ? `(${b1}/${b2})` : ''), p: [fein[3 * a]!, fein[3 * a + 1]!, fein[3 * a + 2]!], gu: gU[a]! });
  }
  liste.sort((x, y) => y.w - x.w);
  console.log(`Öffnung ${oe}: ${liste.length} Knicke > 20°`);
  for (const k of liste.slice(0, Number(process.env.N ?? 12))) console.log(`  ${k.w.toFixed(0).padStart(3)}° ${k.b.padEnd(18)} x ${k.p[0]!.toFixed(3)} y ${k.p[1]!.toFixed(3)} z ${k.p[2]!.toFixed(3)} gU ${k.gu.toFixed(2)}`);
}
console.log('Scharnier', m.scharnier, 'Mundwinkel t =', m.lage.m);
