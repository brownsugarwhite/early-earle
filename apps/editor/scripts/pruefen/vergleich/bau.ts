// Prüfwesen der Library (Vorlage aus apps/editor/public/versuch) im Kern bauen wie der Editor: erster Bau frisch, zweiter
// mit den eingefrorenen Stationen des ersten. Faltenmaß selbst gerechnet (unabhängig vom Stand des Repos).
// Aufruf: kern-lauf.sh <commit|HEAD> apps/editor/scripts/pruefen/vergleich/bau.ts   (Umgebung WESEN, Standard langhals)
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HAUPT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const ROOT = process.env.ROOT ?? HAUPT;
const NAME = process.env.WESEN ?? 'langhals';
const { vorlageDokument } = await import(`${ROOT}/packages/shape/src/versuch/vorlagen.ts`);
const { ableiten } = await import(`${ROOT}/packages/shape/src/kern/ableiten.ts`);
const json = JSON.parse(readFileSync(`${HAUPT}/apps/editor/public/versuch/${NAME}/${NAME}.json`, 'utf8'));
type K = { nF: number; nE: number; fStart: Uint32Array; fVerts: Uint32Array; eFlaechen: Uint8Array; eSchaerfe: Float64Array; eHalb: Uint32Array; hTwin: Int32Array; hFace: Uint32Array; eA: Uint32Array };
type Abl = { unterteilung: { stufen: { kaefig: K }[] }; fein: Float64Array; gefroren?: unknown; vorlage: { R: number }; kaefig: { n: number } };
function falten(abl: Abl) {
  const k = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const P = (i: number) => [abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!];
  const nrm: number[] = [];
  for (let f = 0; f < k.nF; f++) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    const a = k.fStart[f]!;
    const b = k.fStart[f + 1]!;
    for (let h = a; h < b; h++) {
      const p = P(k.fVerts[h]!);
      const q = P(k.fVerts[h + 1 < b ? h + 1 : a]!);
      nx += (p[1]! - q[1]!) * (p[2]! + q[2]!);
      ny += (p[2]! - q[2]!) * (p[0]! + q[0]!);
      nz += (p[0]! - q[0]!) * (p[1]! + q[1]!);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    nrm.push(nx / l, ny / l, nz / l);
  }
  let max = 0;
  let n20 = 0;
  let ort = [0, 0, 0];
  for (let e = 0; e < k.nE; e++) {
    if (k.eFlaechen[e] !== 2 || k.eSchaerfe[e]! > 0) continue;
    const h = k.eHalb[e]!;
    const t = k.hTwin[h]!;
    if (t < 0) continue;
    const f1 = k.hFace[h]!;
    const f2 = k.hFace[t]!;
    const c = nrm[3 * f1]! * nrm[3 * f2]! + nrm[3 * f1 + 1]! * nrm[3 * f2 + 1]! + nrm[3 * f1 + 2]! * nrm[3 * f2 + 2]!;
    const w = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
    if (w > 20) n20++;
    if (w > max) {
      max = w;
      ort = P(k.eA[e]!);
    }
  }
  return { max: +max.toFixed(1), ueber20: n20, ort: ort.map((v) => +v.toFixed(3)), R: abl.vorlage.R, n: abl.kaefig.n };
}
let dok = vorlageDokument(json, 'zu', NAME);
const out: Record<string, unknown> = {};
const a1 = ableiten(dok, {}) as Abl;
out.frisch = falten(a1);
if (a1.gefroren) {
  dok = { ...dok, kaefig: { ...(dok.kaefig ?? {}), stationen: a1.gefroren } };
  out.eingefroren = falten(ableiten(dok, { stationen: a1.gefroren }) as Abl);
}
console.log(NAME, JSON.stringify(out));
