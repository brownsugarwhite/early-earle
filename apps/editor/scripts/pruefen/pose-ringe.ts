// Welche Ringe bewegt die Kieferpose? Mittlere Verschiebung je Ring (Käfig) bei Öffnung 1, Plattenmaul (Ring 24) gegen Ringpfad (16)
import tigerJson from '../../../../packages/shape/src/versuch/vorlagen/tiger.json';
import { type Vorlage, vorlageDokument } from '../../../../packages/shape/src/versuch';
import { type MaulLinie, ableitenMitMaul, maulOptionenVorlage, maulPose } from '../../../../packages/shape/src/kern/maul';
import { kastenSpanten } from '../../../../packages/shape/src/kern/kasten';
import { pruefwesenBauplan } from '../../../../packages/shape/src/kern/wesen';
declare const performance: { now(): number };
const roh = vorlageDokument(tigerJson as unknown as Vorlage, 'zu', 'tiger');
const dok = { ...roh, spanten: kastenSpanten(roh.profile.front, 0.02, 0.15, 0.25, 0.85) };
const tiger = pruefwesenBauplan('tiger');
const alt = { linie: { fv: [{ f: 0, v: 0.5 }, { f: 0.032, v: 0.28 }, { f: 0.06, v: 0.25 }], unterSpitze: 0 }, opt: { winkelUnten: 30, winkelOben: 26, band: 1, rille: 0.006, reihen: 2, tiefe: 0.5 }, ring: 16 };
for (const [name, linie, opt, ring] of [['Platte 24', tiger.maulLinie!, tiger.maulOptionen!, 24], ['Ringpfad 16', alt.linie, alt.opt, alt.ring]] as const) {
  const abl = ableitenMitMaul(dok, linie as MaulLinie, { stufen: 2, ring }, { ...maulOptionenVorlage('vorn'), ...opt });
  const m = abl.maul;
  const v = abl.vorlage;
  const p0 = maulPose(abl, 0).xyz, p1 = maulPose(abl, 1).xyz;
  const zeilen: string[] = [];
  for (let i = 0; i < v.R; i++) {
    let s = 0, sO = 0, sU = 0;
    for (let j = 0; j < v.N; j++) { const q = v.ringPunkt(i, j); s += Math.hypot(p1[3*q]!-p0[3*q]!, p1[3*q+1]!-p0[3*q+1]!, p1[3*q+2]!-p0[3*q+2]!); sO += m.gewichtOben[q]!; sU += m.gewichtUnten[q]!; }
    zeilen.push(`${i}:${(s / v.N * 1000).toFixed(1)}‰(o${(sO / v.N).toFixed(2)},u${(sU / v.N).toFixed(2)})`);
  }
  console.log(`${name}: k=${m.lage.k} R=${v.R} bandOben=${m.opt.bandOben} band=${m.opt.band} schaedelHinter=${m.opt.schaedelHinter} scharnier=${m.scharnier.x.toFixed(3)},${m.scharnier.y.toFixed(3)} schaedel=${m.schaedel.x.toFixed(3)},${m.schaedel.y.toFixed(3)} L=${m.laenge.toFixed(3)}`);
  console.log('  ' + zeilen.join(' '));
}
