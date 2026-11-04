// Plan 20.10., V5: P-Linien der Extremreihe für die Editor-Prüfung `v5-editor.mjs` vorbereiten — je Körper die Linien so, wie
// der Stift sie auf die Haut des Körpers mit „Querschnitt aus der Hülle“ legt (Florians Ablauf aus der Startkugel).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/v5-linien-vorbereiten.ts  (KOERPER = Komma-Liste)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extremKoerper } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import { extremMessen } from '../../../../packages/shape/src/kern/pruefen/extremMessung';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const out = resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v5');
mkdirSync(out, { recursive: true });
const namen = (process.env.KOERPER ?? 'kugel,ei,robbe,kegel,hals-1-8').split(',');
const linien: Record<string, unknown> = {};
for (const name of namen) {
  const r = extremMessen(extremKoerper(name), 'roehre', 'kugel', { zug: false, durchdringung: false, plan: { umrisseExakt: true } });
  linien[name] = r.mitLinien?.kanten ?? [];
  console.log(name, (r.mitLinien?.kanten ?? []).length, 'Linien', JSON.stringify(r.messung.linien?.arten));
}
writeFileSync(resolve(out, 'linien.json'), JSON.stringify(linien));
console.log(resolve(out, 'linien.json'));
