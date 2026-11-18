// Plattenmaul am Tiger: Treppe, Winkel auf der Platte, Käfig ok, Durchdringungen je Öffnung nach Bereich
import tigerJson from '../../../../packages/shape/src/versuch/vorlagen/tiger.json';
import { type Vorlage, vorlageDokument } from '../../../../packages/shape/src/versuch';
import { selbstDurchdringungen } from '../../../../packages/shape/src/versuch/pruefen';
import { alleFlaechen, pruefeKaefig } from '../../../../packages/shape/src/kaefig/halbkanten';
import { ableitenMitMaul, maulOptionenVorlage, maulPose } from '../../../../packages/shape/src/kern/maul';
import { kastenSpanten } from '../../../../packages/shape/src/kern/kasten';
const roh = vorlageDokument(tigerJson as unknown as Vorlage, 'zu', 'tiger');
const dok = { ...roh, spanten: kastenSpanten(roh.profile.front, 0.02, 0.15, 0.25, 0.85) };
const maulOpt = { ...maulOptionenVorlage('vorn'), winkelUnten: 30, winkelOben: 26, band: 1, rille: 0.006, reihen: 2, tiefe: 0.5 };
const ARTEN = ['haut', 'lippeO', 'lippeU', 'tascheO', 'tascheU', 'rachen', 'winkel'];
const WINKEL = { x: -0.376, y: 0.323 };
const FRONT = [{ z: 0, y: 0.358 }, { z: 0.018, y: 0.35 }, { z: 0.035, y: 0.323 }];
const varianten: [string, number | undefined, { f: number; v: number }[], Record<string, number>][] = [
  ['Platte gebogen, Standard', 0.035, [{ f: 0, v: 0.5 }, { f: 0.08, v: 0.35 }], {}],
  ['Platte gebogen, Linse 0,015, Tiefe 0,7', 0.035, [{ f: 0, v: 0.5 }, { f: 0.08, v: 0.35 }], { linse: 0.015, tiefe: 0.7 }],
  ['Platte gebogen, Rachenring aus f 0,01', 0.035, [{ f: 0, v: 0.5 }, { f: 0.01, v: 0.35 }], {}],
];
for (const band of [1, 2, 3]) for (const wu of [30, 20]) varianten.push([`Band ${band}, Unterkiefer ${wu}°`, 0.035, [{ f: 0, v: 0.5 }, { f: 0.08, v: 0.35 }], { linse: 0.015, tiefe: 0.7, band, winkelUnten: wu }]);
for (const [name, winkelZ, fv, extra] of varianten) {
  const linie = { fv: [...fv], unterSpitze: 0, ...(winkelZ !== undefined ? { winkelZ, winkel: WINKEL, front: FRONT } : {}) };
  const t0 = performance.now();
  const RING = Number(process.env.RING ?? 16);
  const abl = ableitenMitMaul(dok, linie, { stufen: 2, ring: RING }, { ...maulOpt, ...extra });
  const ms = performance.now() - t0;
  const m = abl.maul;
  const pr = pruefeKaefig(abl.kaefig);
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const flaechen = alleFlaechen(letzte);
  const M = abl.unterteilung.matrix;
  const bereiche = flaechen.map((f) => { const g = new Float64Array(ARTEN.length); for (let q = M.start[f[0]!]!; q < M.start[f[0]! + 1]!; q++) g[m.art[M.index[q]!]!] = (g[m.art[M.index[q]!]!] ?? 0) + M.wert[q]!; let best = 0; for (let a = 1; a < g.length; a++) if (g[a]! > g[best]!) best = a; return ARTEN[best]!; });
  const aus: string[] = [];
  for (const o of [0, 0.25, 0.5, 0.75, 1]) {
    const pose = maulPose(abl, o);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < pose.fein.length / 3; i++) pts.push([pose.fein[3 * i]!, pose.fein[3 * i + 1]!, pose.fein[3 * i + 2]!]);
    const d = selbstDurchdringungen({ punkte: pts, flaechen, schaerfe: new Map() }, 1e-4, bereiche);
    const o1 = m.pfad[0]!, u1 = m.unten[0]!;
    const spalt = Math.hypot(pose.fein[3 * o1]! - pose.fein[3 * u1]!, pose.fein[3 * o1 + 1]! - pose.fein[3 * u1 + 1]!);
    aus.push(`${Math.round(o * 100)} %: ${d.paare}${d.paare ? ' [' + Object.entries(d.nachBereich).map(([k, n]) => `${k} ${n}`).join(', ') + ']' : ''}`);
  }
  const pf = m.pfad.map((i) => `(${abl.fein[3 * i]!.toFixed(3)},${abl.fein[3 * i + 1]!.toFixed(3)},${abl.fein[3 * i + 2]!.toFixed(3)})`);
  console.log(`${name}: Treppe ${JSON.stringify(m.lage.kappenPfad ?? null)} k ${m.lage.k}; Pfad ${pf.join(' ')}\n  ${aus.join('; ')}`);
}
