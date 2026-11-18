// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/teilA/e1-faecher.ts (FAELLE=…)
// Fächer um c in der Startlage: Winkel von U'_m, U'_{m+1}, E, D'_{m+1}, D'_m gegen die Verlängerung (Tangentialebene an c), dazu
// U'_{m−1}/D'_{m−1}; Abstände in px. Ideal: +90, +45, 0, −45, −90.
import { einsatzFaelle, einsatzFall } from '../../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { einsatzTopologie, kartenUmkehr, punktNormalen } from '../../../../../packages/shape/src/kern/einsatz/topologie';
type V3 = [number, number, number];
const PX = 461;
const NUR = process.env.FAELLE?.split(',');
for (const [art, anfang, form] of einsatzFaelle()) {
  const name = `${art}/${anfang}/${form}`;
  if (NUR && !NUR.includes(name)) continue;
  const f = einsatzFall(art, anfang, form);
  if (!f || 'fehler' in f || f.hautAbstand > 1) continue;
  const linie = f.lippenZiel();
  const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie, gitter: 'kernring' });
  const xyz = t.kaefig.xyz;
  const P = (i: number): V3 => [xyz[3 * i]!, xyz[3 * i + 1]!, xyz[3 * i + 2]!];
  const { m, M } = t;
  const c = P(t.haut[0]![m]!);
  const um = kartenUmkehr(f.karte, f.netz, f.schnitt.doppel, punktNormalen(f.netz));
  const n = um(t.hautKarte.u[0]![m]!, t.hautKarte.v[0]![m]!).n;
  const e = linie[linie.length - 1]!;
  const tt0: V3 = [c[0] - P(t.haut[0]![m - 1]!)[0], c[1] - P(t.haut[0]![m - 1]!)[1], c[2] - P(t.haut[0]![m - 1]!)[2]];
  const dn = tt0[0] * n[0] + tt0[1] * n[1] + tt0[2] * n[2];
  let tt: V3 = [tt0[0] - dn * n[0], tt0[1] - dn * n[1], tt0[2] - dn * n[2]];
  const lt = Math.hypot(...tt);
  tt = [tt[0] / lt, tt[1] / lt, tt[2] / lt];
  const b: V3 = [n[1] * tt[2] - n[2] * tt[1], n[2] * tt[0] - n[0] * tt[2], n[0] * tt[1] - n[1] * tt[0]];
  const H1 = t.haut[1]!;
  // Vorzeichen so, dass die Oberseite (U'_{m−1}) positiv liegt
  const roh = (q: V3) => {
    const d: V3 = [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
    return [d[0] * tt[0] + d[1] * tt[1] + d[2] * tt[2], d[0] * b[0] + d[1] * b[1] + d[2] * b[2]];
  };
  const s = roh(P(H1[m - 1]!))[1]! >= 0 ? 1 : -1;
  const winkel = (q: V3) => {
    const [x, y] = roh(q);
    return `${((Math.atan2(s * y!, x!) * 180) / Math.PI).toFixed(0)}°/${(Math.hypot(x!, y!) * PX).toFixed(1)}`;
  };
  void e;
  const lip = Math.hypot(...tt0) * PX;
  console.log(`${name.padEnd(22)} |c−U| ${lip.toFixed(1)} px · U'm−1 ${winkel(P(H1[m - 1]!))} U'm ${winkel(P(H1[m]!))} U'm+1 ${winkel(P(H1[m + 1]!))} E ${winkel(P(H1[M]!))} D'm+1 ${winkel(P(H1[M + 1]!))} D'm ${winkel(P(H1[M + 2]!))} D'm−1 ${winkel(P(H1[M + 3]!))}`);
}
