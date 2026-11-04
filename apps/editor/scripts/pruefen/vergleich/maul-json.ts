// Florians Unterbiss (Prüfstand `kugelMaulDokument('florian')`, ohne Marken wie im Editor gezeichnet) als JSON für ablauf.mjs.
// Aufruf: kern-lauf.sh HEAD apps/editor/scripts/pruefen/vergleich/maul-json.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HAUPT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const ROOT = process.env.ROOT ?? HAUPT;
const AUS = process.env.AUSGABE ?? resolve(HAUPT, 'apps/editor/pruefen-ausgabe/vergleich');
mkdirSync(AUS, { recursive: true });
const { kugelMaulDokument } = await import(`${ROOT}/packages/shape/src/kern/pruefstand.ts`);
const d = kugelMaulDokument('florian', false);
writeFileSync(`${AUS}/florian-maul.json`, JSON.stringify({ maul: d.maul, top: d.profile.top }));
console.log('geschrieben', `${AUS}/florian-maul.json`);
