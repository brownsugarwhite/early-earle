// Fälle für Vorher/Nachher-Bilder des Kiefergelenks (14.10. spätnachts): dieselben Dokumente einmal mit Ringgewichten
// (bis 14.10.), einmal mit Winkelgewichten um das Gelenk. Schreibt pruefen-ausgabe/gelenk-faelle.json für kamera-bilder.mjs
// (DATEI=gelenk-faelle.json). Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/gelenk-faelle.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import rexJson from '../../../../packages/shape/src/versuch/vorlagen/rex.json';
import { type Vorlage, vorlageDokument } from '../../../../packages/shape/src/versuch/vorlagen';
import { maulLinieVorlage } from '../../../../packages/shape/src/kern/maul';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const reihe = JSON.parse(readFileSync(resolve(AUSGABE, 'pruefreihe.json'), 'utf-8')) as Record<string, { dok: Dokument; ziel: number[]; dist: number }>;
const rex = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
const rexMaul: Dokument = { ...rex, ausstattung: { ...(rex.ausstattung ?? {}), maul: 'vorn', maulLinie: maulLinieVorlage(rex, 'vorn') } };
const basis: Record<string, Dokument> = { rex: rexMaul };
for (const n of ['kugel-gleich', 'kugel-unterbiss-florian', 'langhals-gleich', 'langhals-getrennt']) if (reihe[n]) basis[n] = reihe[n]!.dok;
const mitGewichten = (d: Dokument, gewichte: 'ringe' | 'winkel'): Dokument => ({ ...d, ausstattung: { ...(d.ausstattung ?? {}), maulOptionen: { ...(d.ausstattung?.maulOptionen ?? {}), gewichte } } });
const aus: Record<string, { dok: Dokument; mass: string }> = {};
for (const [n, d] of Object.entries(basis)) {
  aus[`${n}-ringe`] = { dok: mitGewichten(d, 'ringe'), mass: 'vorher: Ringgewichte (Band über 2 Ringe hinter dem Mundwinkel)' };
  aus[`${n}-winkel`] = { dok: mitGewichten(d, 'winkel'), mass: 'nachher: Gewichte nach Winkel und Reichweite um das Gelenk' };
}
writeFileSync(resolve(AUSGABE, 'gelenk-faelle.json'), JSON.stringify(aus));
console.log('geschrieben', Object.keys(aus).join(', '));
