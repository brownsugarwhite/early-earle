// Teil G, G3: Querschnitt je Ring (aus dem eigenen Höhenbereich) gegen den gemeinsamen Querschnitt je Abschnitt — Δ je
// Blatt (px bei 461) und Falten über alle Prüfkörper (11 Arten × 3 Zufallswerte) und die Grundkörper aus Teil G.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/g3-querschnitte.ts
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { ableiten } from '../../../../packages/shape/src/kern/ableiten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { faltenMass, feinesNetz } from '../../../../packages/shape/src/kern/pruefstand';
import { G_KOERPER, gKoerperDokument } from '../../../../packages/shape/src/kern/pruefen/grundkoerper';
import { KOERPER, koerperDokument } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';

const faelle: { name: string; dok: Dokument }[] = [];
for (const art of KOERPER) for (const s of [1, 2, 3]) faelle.push({ name: `${art}#${s}`, dok: koerperDokument(art, zufall(s)) });
for (const g of G_KOERPER) faelle.push({ name: g, dok: gKoerperDokument(g) });

const messen = (dok: Dokument, jeRing: boolean) => {
  const abl = ableiten(dok, { stufen: 3, querschnittJeRing: jeRing });
  const n = feinesNetz(abl);
  const d = blattAbweichungen(n.punkte, n.flaechen, dok);
  const f = faltenMass(abl);
  return { s: d.seite.max, fr: d.front.max, t: d.top.max, f: f.max, f20: f.ueber20 };
};
let schlechter = 0;
for (const { name, dok } of faelle) {
  const a = messen(dok, false);
  const b = messen(dok, true);
  const zeile = (m: typeof a) => `S ${m.s.toFixed(1)} F ${m.fr.toFixed(1)} T ${m.t.toFixed(1)} Falten ${m.f.toFixed(0)}° (>20°: ${m.f20})`;
  const gleich = a.s === b.s && a.fr === b.fr && a.t === b.t && a.f === b.f;
  const schlimmer = b.s > a.s + 0.3 || b.fr > a.fr + 0.3 || b.t > a.t + 0.3 || b.f20 > a.f20;
  if (schlimmer) schlechter++;
  console.log(`${name.padEnd(14)} ${gleich ? 'gleich        ' : schlimmer ? 'SCHLECHTER    ' : 'anders        '} vorher ${zeile(a)} | je Ring ${zeile(b)}`);
}
console.log(`${faelle.length} Fälle, schlechter: ${schlechter}`);
