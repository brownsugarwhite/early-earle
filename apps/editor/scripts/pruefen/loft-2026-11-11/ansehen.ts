// Loft-Messung (11.11.2026): eine gesicherte Form mit nummerierten Loops in vier Ansichten (zum Einordnen der Loops).
// Aufruf aus packages/shape: WESEN="strange bird" npx vite-node ../../apps/editor/scripts/pruefen/loft-2026-11-11/ansehen.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hatPfad, pfadLagen } from '../../../../../packages/shape/src/dicht/loops';
import { entpacken } from '../../../src/form/ablage';
import { type BildLinie, bildSeite } from './bild';

const ordner = fileURLToPath(new URL('../../../../../wesen/', import.meta.url));
const aus = fileURLToPath(new URL('../../../pruefen-ausgabe/loft/', import.meta.url));
fs.mkdirSync(aus, { recursive: true });
const FARBE = { mitte: '#111111', ring: '#0b6b5c', paar: '#b0306a' } as const;
for (const name of (process.env.WESEN ?? 'strange bird,teat firefish').split(',')) {
  const st = entpacken(new Uint8Array(fs.readFileSync(path.join(ordner, `${name}.eewesen`))));
  const g = st.grund ?? { haut: st.haut, loops: st.loops };
  const linien: BildLinie[] = [];
  for (const l of g.loops) {
    const L = (hatPfad(l) ? pfadLagen(l) : null) ?? l.ruhe;
    linien.push({ pts: L, farbe: FARBE[l.art], name: String(l.id), zu: l.art !== 'ring', dick: l.art === 'mitte' ? 2.2 : 1.6 });
    if (l.art !== 'mitte') {
      const S = Float64Array.from(L);
      for (let j = 0; j < S.length; j += 3) S[j + 2] = -S[j + 2]!;
      linien.push({ pts: S, farbe: FARBE[l.art], zu: l.art !== 'ring', dick: 1.1 });
    }
  }
  const netz = { pos: g.haut.pos, tri: g.haut.tri };
  const datei = path.join(aus, `${name.replace(/ /g, '-')}-loops.html`);
  bildSeite(datei, `${name} — Loops mit Nummern`, `${g.haut.n} Punkte, ${g.loops.length} Loops. Schwarz: Seitenlinie (Mitte), grün: Ringe (halb gezeichnet, gespiegelt dünn), pink: Paar.`, [
    { titel: 'Seite', blick: 'seite', netze: [netz], linien, breit: 900, hoch: 620 },
    { titel: 'Schräg', blick: [35, 25], netze: [netz], linien, breit: 900, hoch: 620 },
    { titel: 'Top', blick: 'top', netze: [netz], linien, breit: 900, hoch: 520 },
    { titel: 'Front', blick: 'front', netze: [netz], linien, breit: 900, hoch: 520 },
  ]);
  console.log(datei);
}
