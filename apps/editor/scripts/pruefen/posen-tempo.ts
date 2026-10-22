// B7: Tempo eines reinen Gewichtswechsels im Kern (Vorschau, Überblenden, Abspielen): Rex mit Maul, erster Bau, dann Bauten
// nur mit anderen Gewichten (Fressen 0 … 100 %). Bei 100 % kommen die Bearbeitungsdaten der Pose dazu (Griffe der Blätter).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/posen-tempo.ts
import { wesenBauen } from '../../../../packages/shape/src/kern/wesen';
import { koerperDokument } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';

const dok = koerperDokument('rex', zufall(1));
let r = wesenBauen(dok, { maul: 'vorn', gewichte: {} }, null, false);
const zeiten: number[] = [];
for (let k = 0; k <= 10; k++) {
  const t0 = performance.now();
  r = wesenBauen(dok, { maul: 'vorn', gewichte: { fressen: k / 10 } }, r.stand, false);
  zeiten.push(performance.now() - t0);
}
console.log('Gewichtswechsel (ms) bei Fressen 0 … 100 %:', zeiten.map((z) => z.toFixed(0)).join(' '), '· feine Punkte', r.netz.info.feinPunkte, '· Käfig', r.netz.info.kaefigPunkte);
