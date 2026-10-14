// Rex, Kiefer getrennt (Überbiss): Varianten von Linie, Lippendicke, Linse, Reihen → Durchdringungen je Öffnung nach Bereich
import rexJson from '../../../../packages/shape/src/versuch/vorlagen/rex.json';
import { type Vorlage, vorlageDokument } from '../../../../packages/shape/src/versuch';
import { selbstDurchdringungen } from '../../../../packages/shape/src/versuch/pruefen';
import { alleFlaechen, pruefeKaefig } from '../../../../packages/shape/src/kaefig/halbkanten';
import { ableitenMitMaul, maulOptionenVorlage, maulPose } from '../../../../packages/shape/src/kern/maul';
import { pruefwesenBauplan } from '../../../../packages/shape/src/kern/wesen';
declare const performance: { now(): number };
const rex = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
const ARTEN = ['haut', 'lippeO', 'lippeU', 'tascheO', 'tascheU', 'rachen', 'winkel', 'lippeInnen', 'zahnfleischU'];
const oben = [{ f: 0.02, v: 0.45 }, { f: 0.2, v: 0.42 }, { f: 0.34, v: 0.45 }];
const linien: Record<string, { f: number; v: number }[]> = {
  klein: [{ f: 0.02, v: 0.47 }, { f: 0.1, v: 0.5 }, { f: 0.22, v: 0.5 }, { f: 0.34, v: 0.45 }],
  gross: [{ f: 0.02, v: 0.47 }, { f: 0.1, v: 0.62 }, { f: 0.2, v: 0.55 }, { f: 0.28, v: 0.5 }, { f: 0.34, v: 0.45 }],
  gross2: [{ f: 0.02, v: 0.45 }, { f: 0.06, v: 0.5 }, { f: 0.1, v: 0.62 }, { f: 0.2, v: 0.55 }, { f: 0.28, v: 0.5 }, { f: 0.34, v: 0.45 }],
};
const varianten: [string, string, Record<string, number>][] = [];
const nur = process.env.NUR;
const LINIEN = (process.env.LINIEN ?? 'gross,gross2').split(',');
const DICKEN = (process.env.DICKEN ?? '0.03,0.04,0.05').split(',').map(Number);
const EXTRAS: Record<string, number>[] = JSON.parse(process.env.EXTRAS ?? '[{}, {"reihen": 4}]');
for (const ln of LINIEN) for (const dicke of DICKEN) for (const extra of EXTRAS) varianten.push([`${ln} dicke ${dicke} ${JSON.stringify(extra)}`, ln, { lippenDicke: dicke, ...extra }]);
for (const [name, ln, extra] of varianten) {
  if (nur && !name.includes(nur)) continue;
  const linie = ln === 'plan' ? pruefwesenBauplan('rex').maulLinie! : ln === 'keine' ? { fv: oben, unterSpitze: 1 } : { fv: oben, unterSpitze: 1, unten: linien[ln]! };
  const t0 = performance.now();
  const abl = ableitenMitMaul(rex, linie, { stufen: 2 }, { ...maulOptionenVorlage('vorn'), ...extra });
  const ms = performance.now() - t0;
  const m = abl.maul;
  const pr = pruefeKaefig(abl.kaefig);
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const flaechen = alleFlaechen(letzte);
  const M = abl.unterteilung.matrix;
  const bereiche = flaechen.map((f) => { const g = new Float64Array(ARTEN.length); for (let q = M.start[f[0]!]!; q < M.start[f[0]! + 1]!; q++) g[m.art[M.index[q]!]!] = (g[m.art[M.index[q]!]!] ?? 0) + M.wert[q]!; let best = 0; for (let a = 1; a < g.length; a++) if (g[a]! > g[best]!) best = a; return ARTEN[best]!; });
  let dyMax = 0;
  for (let t = 0; t < m.lage.m; t++) dyMax = Math.max(dyMax, abl.fein[3 * m.unten[t]! + 1]! - abl.fein[3 * m.pfad[t]! + 1]!);
  const aus: string[] = [];
  for (const o of [0, 0.25, 0.5, 0.75, 1]) {
    const pose = maulPose(abl, o);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < pose.fein.length / 3; i++) pts.push([pose.fein[3 * i]!, pose.fein[3 * i + 1]!, pose.fein[3 * i + 2]!]);
    const d = selbstDurchdringungen({ punkte: pts, flaechen, schaerfe: new Map() }, 1e-4, bereiche);
    aus.push(`${Math.round(o * 100)} %: ${d.paare}${d.paare ? ' [' + Object.entries(d.nachBereich).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} ${n}`).join(', ') + ']' : ''}`);
    if (process.env.DETAIL && (o === 0 || o === 0.5)) {
      for (const [k, orte] of Object.entries(d.orteNachBereich)) {
        const xs = orte.map((q) => q[0]); const ys = orte.map((q) => q[1]); const zs = orte.map((q) => Math.abs(q[2]));
        const r = (a: number[]) => `${Math.min(...a).toFixed(3)}…${Math.max(...a).toFixed(3)}`;
        console.log(`   ${Math.round(o * 100)} % ${k}: ${orte.length} | x ${r(xs)} y ${r(ys)} |z| ${r(zs)} | z. B. ${orte.slice(0, 2).map((q) => '(' + q.map((v) => v.toFixed(3)).join(',') + ')').join(' ')}`);
      }
    }
  }
  console.log(`${name}: ok=${pr.ok} ${ms.toFixed(0)} ms, Überbiss max ${(dyMax * 1000).toFixed(1)} ‰ | ${aus.join('; ')}`);
}
