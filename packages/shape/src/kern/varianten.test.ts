import { describe, it } from 'vitest';
import type { V2 } from '../bezier';
import { pfadAbtasten, vollerPfad } from '../profil';
import rexRoh from '../versuch/vorlagen/rex.json';
import langhalsRoh from '../versuch/vorlagen/langhals.json';
import { type Vorlage, vorlageDokument } from '../versuch/vorlagen';
import { type AbleitOptionen, ableiten } from './ableiten';

declare const console: { log: (...a: unknown[]) => void };
const PX = 461;

function abst(pts: readonly V2[], linie: readonly V2[]): number {
  let max = 0;
  for (const p of pts) {
    let best = Infinity;
    for (let i = 0; i < linie.length; i++) {
      const a = linie[i]!;
      const b = linie[(i + 1) % linie.length]!;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
      best = Math.min(best, Math.hypot(a.x + abx * t - p.x, a.y + aby * t - p.y));
    }
    max = Math.max(max, best);
  }
  return max * PX;
}

describe('Varianten Spitzen-Ecke und Krümmung', () => {
  for (const [name, roh] of [['Rex', rexRoh], ['Langhals', langhalsRoh]] as const) {
    it(name, () => {
      const dok = vorlageDokument(roh as unknown as Vorlage, 'zu', name);
      const kurve = pfadAbtasten(vollerPfad(dok.profile.seite), 160);
      const faelle: [string, Partial<AbleitOptionen>][] = [
        ['gleichmäßig, Kappe 5 %', { kruemmung: 0, kappeSpitze: 0.05 }],
        ['Krümmung 2, Kappe 5 %', { kruemmung: 2, kappeSpitze: 0.05 }],
        ['Krümmung 2, Kappe 2,5 %', { kruemmung: 2, kappeSpitze: 0.025 }],
        ['Krümmung 2, Kappe 2,5 %, Kiel', { kruemmung: 2, kappeSpitze: 0.025, spitzenFalte: true }],
        ['Krümmung 4, Kappe 2,5 %', { kruemmung: 4, kappeSpitze: 0.025 }],
        ['Krümmung 2, Kappe 1,5 %', { kruemmung: 2, kappeSpitze: 0.015 }],
      ];
      for (const [titel, o] of faelle) {
        const abl = ableiten(dok, o);
        const naht: V2[] = Array.from(abl.naht.fein, (i) => ({ x: abl.fein[3 * i]!, y: abl.fein[3 * i + 1]! }));
        console.log(`${name} · ${titel}: Naht→Kurve ${abst(naht, kurve).toFixed(2)} px, Kurve→Naht ${abst(kurve, naht).toFixed(2)} px`);
      }
    });
  }
});
