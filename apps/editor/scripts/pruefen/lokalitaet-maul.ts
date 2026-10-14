// Lokalität nach Plan (Block 2, Satz 2): Lippenanfang 10 px ziehen; Band = x-Bereich, in dem sich die schwarze Linie um
// > 0,25 px bewegt, plus RAND (Welt); außerhalb: größter Abstand der Haut zur vorigen Fläche (px), Ziel < 0,5 px.
// Aus packages/shape: LINIEN=1 npx vite-node ../../apps/editor/scripts/pruefen/lokalitaet-maul.ts (FAELLE=…, ZUG=px, RAND=Welt)
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { abtasten3 } from '../../../../packages/shape/src/versuch/linie3d';
import { ableitenMitMaul, maulOptionenVorlage } from '../../../../packages/shape/src/kern/maul';
import { maulLinieAusDokument } from '../../../../packages/shape/src/kern/maulDokument';
import { anfangVerschieben, feinesNetz, mitStationenVon } from '../../../../packages/shape/src/kern/pruefstand';
import { flaechenAbstand } from './flaechenabstand';
const faelle = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../pruefen-ausgabe', process.env.DATEI ?? 'pruefreihe.json'), 'utf-8')) as Record<string, { dok: Dokument }>;
const namen = (process.env.FAELLE ?? 'kugel-gleich,kugel-ueberbiss,kugel-unterbiss-florian,langhals-getrennt,nase-gleich,nase-ueberbiss').split(',');
const PX = 461;
const ZUG = Number(process.env.ZUG ?? 10) / PX;
const RAND = Number(process.env.RAND ?? 0.02);
const bau = (d: Dokument) => {
  const g = d.kaefig?.stationen;
  const abl = ableitenMitMaul(d, maulLinieAusDokument(d)!, { stufen: 2, ...(g ? { stationen: g } : {}) }, maulOptionenVorlage('vorn'));
  const M = abl.unterteilung.matrix;
  const haut = new Uint8Array(abl.fein.length / 3);
  for (let q = 0; q < haut.length; q++) {
    let w = 0;
    for (let e = M.start[q]!; e < M.start[q + 1]!; e++) if (abl.maul.art[M.index[e]!] === 0) w += M.wert[e]!;
    haut[q] = w > 0.9 ? 1 : 0;
  }
  return { netz: feinesNetz(abl), haut };
};
// schwarze Linie und (LINIEN=1) die Lippenlinien rot/blau, alle in Welt (x, y, z)
const umriss = (d: Dokument) => {
  const sk = d.skalierung;
  const pts = pfadAbtasten(vollerPfad(d.profile.seite), 24).map((p) => ({ x: p.x * sk, y: p.y * sk, z: 0 }));
  if (process.env.LINIEN) for (const l of [d.maul?.zu.oben, d.maul?.zu.unten]) if (l) for (const q of abtasten3(l, 24)) pts.push({ x: q[0] * sk, y: q[1] * sk, z: q[2] * sk });
  return pts;
};
for (const name of namen) {
  const roh = faelle[name]?.dok;
  if (!roh) continue;
  const basis = mitStationenVon(roh, roh);
  const a = bau(basis);
  const u0 = umriss(basis);
  const rollen: ('oben' | 'unten')[] = roh.maul?.zu.unten ? ['oben', 'unten'] : ['oben'];
  const zeilen: string[] = [];
  for (const rolle of rollen) {
    for (const [rn, dx, dy] of [['vor', -1, 0], ['zurück', 1, 0], ['runter', 0, -1], ['hoch', 0, 1]] as const) {
      const d = anfangVerschieben(basis, rolle, (dx * ZUG) / basis.skalierung, (dy * ZUG) / basis.skalierung);
      const u1 = umriss(d);
      if (u1.length !== u0.length) { zeilen.push(`${rolle} ${rn}: Umriss anders abgetastet`); continue; }
      let xLo = Infinity, xHi = -Infinity;
      u0.forEach((p, i) => { if (Math.hypot(u1[i]!.x - p.x, u1[i]!.y - p.y, u1[i]!.z - p.z) * PX > 0.25) { xLo = Math.min(xLo, p.x, u1[i]!.x); xHi = Math.max(xHi, p.x, u1[i]!.x); } });
      const b = bau(d);
      const aussen = b.netz.punkte.filter((p, q) => b.haut[q] === 1 && (p[0] < xLo - RAND || p[0] > xHi + RAND));
      const dist = flaechenAbstand(aussen, a.netz.punkte, a.netz.flaechen);
      let m = 0;
      let wo = -1;
      dist.forEach((x, i) => { if (x * PX > m) { m = x * PX; wo = i; } });
      const ort = wo >= 0 ? aussen[wo]!.map((v) => v.toFixed(3)).join(',') : '–';
      zeilen.push(`${rolle} ${rn}: Band x ${xLo.toFixed(3)}…${xHi.toFixed(3)} · außerhalb ${aussen.length} Punkte, max ${m.toFixed(2)} px bei ${ort}`);
    }
  }
  console.log(`${name}\n  ${zeilen.join('\n  ')}`);
}
