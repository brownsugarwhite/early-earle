// Prüffälle Maul (Block 2) als Dokument-JSON für das Bildskript maul-bilder.mjs. Aus packages/shape starten:
// npx vite-node ../../apps/editor/scripts/pruefen/maul-faelle.ts → apps/editor/test-results/pruefen/maul-faelle.json
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kugelMaulDokument } from '../../../../packages/shape/src/kern/pruefstand';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const faelle: Record<string, unknown> = {};
const arten = (process.env.ARTEN ?? 'gleich,ueberbiss,schnabel,unterbiss').split(',') as ('gleich' | 'ueberbiss' | 'schnabel' | 'unterbiss')[];
for (const art of arten) faelle[art] = kugelMaulDokument(art, true);
writeFileSync(resolve(WURZEL, 'apps/editor/test-results/pruefen/maul-faelle.json'), JSON.stringify(faelle));
console.log('geschrieben:', Object.keys(faelle).join(', '));
