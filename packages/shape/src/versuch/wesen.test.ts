// Versuch Maul an Florians nachgezogenen Wesen (Rex: Kippen mit Überbiss, Robbe: Vorhang, Langhals: Hals).
import { describe, expect, it } from 'vitest';
import { type Netz, type V3, unterteilen } from './catmullClark';
import { kieferRig, maulAnpassen, maulKaefig, maulZwischen } from './maul';
import { bereichUnterteilen, orientiertGeschlossen, selbstDurchdringungen } from './pruefen';
import langhals from './vorlagen/langhals.json';
import rex from './vorlagen/rex.json';
import robbe from './vorlagen/robbe.json';
import { type Vorlage, vorlageDokument, vorlageMaul } from './vorlagen';

declare const console: { log: (...a: unknown[]) => void };
const PX = 461;

function zaehlen(n: Netz, bereich: string[]): number {
  const n1 = unterteilen(n);
  return selbstDurchdringungen(unterteilen(n1), 1e-4, bereichUnterteilen(n1, bereichUnterteilen(n, bereich))).paare;
}

describe('Versuch Maul an Florians Wesen', () => {
  for (const [name, daten] of [
    ['rex', rex],
    ['robbe', robbe],
    ['langhals', langhals],
  ] as const) {
    it(`${name}: Käfig, Rig, Zwischenstufen`, () => {
      const v = daten as unknown as Vorlage;
      const { eingabe, abweichungY } = vorlageMaul(v);
      const mk = maulKaefig(vorlageDokument(v, 'zu', name), eingabe);
      expect(orientiertGeschlossen(mk.netz).ok).toBe(true);
      const zu = maulAnpassen(mk, 'zu');
      const auf = maulAnpassen(mk, 'auf');
      const rig = kieferRig(mk, zu, auf);
      const grad = (w: number) => ((w * 180) / Math.PI).toFixed(1);
      const bereich = mk.netz.flaechen.map((f) => (f.some((i) => mk.bereiche[i] === 'tasche') ? 'tasche' : 'haut'));
      const kinn = mk.nahtUnten[(mk.nahtUnten.length - 1) / 2]!;
      const g = rig.gelenkUnten;
      const zurAchse = (p: V3) => {
        const d: V3 = [p[0] - g.c[0], p[1] - g.c[1], p[2] - g.c[2]];
        const t = d[0] * g.u[0] + d[1] * g.u[1] + d[2] * g.u[2];
        return Math.hypot(d[0] - t * g.u[0], d[1] - t * g.u[1], d[2] - t * g.u[2]);
      };
      const r0 = zurAchse(zu.punkte[kinn]!);
      const zeilen = [0.5].map((a) => {
        const lin = maulZwischen(mk, zu, auf, a, 'linear');
        const kno = maulZwischen(mk, zu, auf, a, 'knochen', rig);
        return `α=${a}: Kinn/Gelenk linear ${((zurAchse(lin.punkte[kinn]!) / r0) * 100).toFixed(1)} %, Knochen ${((zurAchse(kno.punkte[kinn]!) / r0) * 100).toFixed(1)} %; Durchdringungen linear ${zaehlen(lin, bereich)}, Knochen ${zaehlen(kno, bereich)}`;
      });
      console.log(
        `${name}: Höhen Seite/Front max ${(Math.max(...abweichungY) * PX).toFixed(1)} px; Hinweise ${JSON.stringify(mk.hinweise)}; sichtbar ${mk.sichtbar.toFixed(2)}\n` +
          `  Oberkiefer ${grad(rig.gelenkOben.w)}° Rest ${rig.restOben.toFixed(2)}, Unterkiefer ${grad(rig.gelenkUnten.w)}° Rest ${rig.restUnten.toFixed(2)} → ${rig.art}\n` +
          `  Durchdringungen zu ${zaehlen(zu, bereich)}, auf ${zaehlen(auf, bereich)}; Kinn offen/zu ${((zurAchse(auf.punkte[kinn]!) / r0) * 100).toFixed(1)} %\n  ${zeilen.join('\n  ')}`,
      );
    });
  }
});
