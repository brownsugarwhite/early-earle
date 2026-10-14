// Prüfreihe Maul (14.10. spätnachts, Florian: „sei selbstkritischer und teste die Fälle richtig aus, bevor du sie als
// gefixt präsentierst“): Wesen × Kiefer × gezogene Anfänge, je Fall Δ je Blatt, Lippen-px, Hautfalten (Flossen/Kerben)
// und Durchdringungen bei 0/25/50/75/100 %. Schreibt die Dokumente für den Kontaktbogen (pruefreihe-bilder.mjs).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/pruefreihe.ts   (NUR=kugel,langhals filtert)
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { maulMitMarken } from '../../../../packages/shape/src/maulKnoten';
import langhalsRoh from '../../../../packages/shape/src/versuch/vorlagen/langhals.json';
import { type Vorlage, vorlageDokument } from '../../../../packages/shape/src/versuch/vorlagen';
import { anfangVerschieben, kieferGetrennt, kieferVorDokument, kugelMaulDokument, langhalsLinieDokument, langhalsMaulDokument, naseDokument, pruefenMaul } from '../../../../packages/shape/src/kern/pruefstand';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
type Fall = { name: string; dok: () => Dokument; ziel: [number, number, number]; dist: number };
const KUGEL = { ziel: [-0.1, 0.25, 0] as [number, number, number], dist: 1.0 };
const KOPF = { ziel: [-0.1, 0.62, 0] as [number, number, number], dist: 0.55 };
const NASE = { ziel: [-0.15, 0.25, 0] as [number, number, number], dist: 1.0 };
const v = langhalsRoh as unknown as Vorlage & { linien: Record<string, { punkte: { x: number; y: number }[] }[]> };
let lhKleinCache: Dokument | null = null;
const lhKlein = () => (lhKleinCache ??= langhalsMaulDokument(vorlageDokument(v, 'zu', 'langhals'), v.linien.seite![0]!.punkte, v.linien.front![0]!.punkte));
// wie Florians Giraffe: Anfang auf der Kopfunterseite, Mundwinkel hinten oben im Kopf
let lhCache: Dokument | null = null;
const lh = () => (lhCache ??= langhalsLinieDokument(vorlageDokument(v, 'zu', 'langhals'), { x: -0.125, y: 0.611 }, { x: -0.085, y: 0.635 }, { x: -0.04, y: 0.66 }));
const naseGleich = () => {
  const d = naseDokument();
  return maulMitMarken(d, { oben: d.maul!.zu.oben });
};
const faelle: Fall[] = [
  { name: 'kugel-gleich', dok: () => kugelMaulDokument('gleich', true), ...KUGEL },
  { name: 'kugel-ueberbiss', dok: () => kugelMaulDokument('ueberbiss', true), ...KUGEL },
  { name: 'kugel-ueberbiss-blau-vor-3', dok: () => kieferVorDokument('unten', 0.03), ...KUGEL },
  { name: 'kugel-ueberbiss-blau-vor-6', dok: () => kieferVorDokument('unten', 0.06), ...KUGEL },
  { name: 'kugel-unterbiss-florian', dok: () => kugelMaulDokument('florian', true), ...KUGEL },
  { name: 'kugel-unterbiss-rot-vor-4', dok: () => kieferVorDokument('oben', 0.04), ...KUGEL },
  { name: 'langhals-klein-gleich', dok: lhKlein, ...KOPF },
  { name: 'langhals-gleich', dok: lh, ...KOPF },
  { name: 'langhals-getrennt', dok: () => kieferGetrennt(lh()), ...KOPF },
  { name: 'langhals-getrennt-blau-zurueck', dok: () => anfangVerschieben(kieferGetrennt(lh()), 'unten', 0.02, 0), ...KOPF },
  { name: 'langhals-getrennt-blau-hals', dok: () => anfangVerschieben(kieferGetrennt(lh()), 'unten', 0.005, -0.07), ...KOPF },
  { name: 'langhals-getrennt-rot-runter', dok: () => anfangVerschieben(kieferGetrennt(lh()), 'oben', 0, -0.02), ...KOPF },
  { name: 'nase-gleich', dok: naseGleich, ...NASE },
  { name: 'nase-ueberbiss', dok: naseDokument, ...NASE },
];
const nur = process.env.NUR?.split(',');
const aus: Record<string, { dok: Dokument; ziel: [number, number, number]; dist: number; mass: string }> = {};
const f1 = (x: number | null | undefined) => (x === null || x === undefined ? '–' : x.toFixed(1));
for (const fall of faelle) {
  if (nur && !nur.some((n) => fall.name.startsWith(n))) continue;
  let dok: Dokument;
  try {
    dok = fall.dok();
  } catch (e) {
    console.log(`${fall.name.padEnd(32)} DOKUMENT-FEHLER ${String(e).slice(0, 100)}`);
    continue;
  }
  let mass = '';
  try {
    const r = pruefenMaul(dok);
    const l = r.lippen;
    const lage = r.abl.maul.lage;
    mass = `Δ ${f1(r.delta.seite)}/${f1(r.delta.front)}/${f1(r.delta.top)} · rot ${f1(l.oben.seite)}/${f1(l.oben.front)} blau ${f1(l.unten?.seite)}/${f1(l.unten?.front)} · Haut ${f1(r.hautFalte.max)}° (>20°: ${r.hautFalte.ueber20}) · Paare ${r.paare.map((p) => p.paare).join('/')} · ${lage.ringA !== undefined ? `Ring ${lage.ringA}` : 'Kappe'} k ${lage.k} m ${lage.m}`;
  } catch (e) {
    mass = `BAU-FEHLER ${String(e).slice(0, 120)}`;
  }
  console.log(`${fall.name.padEnd(32)} ${mass}`);
  aus[fall.name] = { dok, ziel: fall.ziel, dist: fall.dist, mass };
}
writeFileSync(resolve(WURZEL, 'apps/editor/test-results/pruefen/pruefreihe.json'), JSON.stringify(aus));
