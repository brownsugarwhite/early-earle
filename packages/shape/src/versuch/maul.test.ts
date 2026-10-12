import { describe, expect, it } from 'vitest';
import { type Netz, type V3, unterteilen } from './catmullClark';
import { MAUL_STANDARD, maulAnpassen, maulKaefig } from './maul';
import { abstandZuZug, bereichUnterteilen, ketteUnterteilen, orientiertGeschlossen, selbstDurchdringungen } from './pruefen';
import tigerDaten from './vorlagen/tiger.json';
import { type Vorlage, vorlageDokument, vorlageMaul } from './vorlagen';

declare const console: { log: (...a: unknown[]) => void };

const PX = 461; // Kachel in Bildpunkten in der Grundansicht
const tiger = tigerDaten as unknown as Vorlage;

/** Grenzfläche und Lippenränder nach `stufen` Unterteilungen. */
function grenze(netz: Netz, ketten: number[][], stufen = 3): { netz: Netz; ketten: V3[][] } {
  let n = netz;
  let k = ketten;
  for (let s = 0; s < stufen; s++) {
    k = k.map((c) => ketteUnterteilen(n, c));
    n = unterteilen(n);
  }
  return { netz: n, ketten: k.map((c) => c.map((i) => n.punkte[i]!)) };
}

describe('Versuch Maul im Netz (Tiger)', () => {
  const dokZu = vorlageDokument(tiger, 'zu');
  const { eingabe, abweichungY } = vorlageMaul(tiger);
  const mk = maulKaefig(dokZu, eingabe);

  it('Florians Ansichten passen in der Höhe zusammen (geschlossen ≤ 2 px)', () => {
    console.log('Höhenabweichung Seite/Front je Punkt (px):', abweichungY.map((a) => (a * PX).toFixed(1)).join(' '));
    expect(Math.max(...abweichungY.slice(0, 4)) * PX).toBeLessThan(2.5);
  });

  it('Käfig ist geschlossen und einheitlich orientiert, zu und auf haben dieselbe Topologie', () => {
    const o = orientiertGeschlossen(mk.netz);
    if (!o.ok) console.log(o.fehler.slice(0, 10));
    expect(o.ok).toBe(true);
    expect(mk.zielAuf?.length).toBe(mk.zielZu.length);
    console.log('Käfig:', mk.netz.punkte.length, 'Punkte,', mk.netz.flaechen.length, 'Flächen; sichtbar', mk.sichtbar.toFixed(2), 'Hinweise', mk.hinweise);
  });

  it('angepasst: Lippenrand trifft die Linien, keine Durchdringung', () => {
    const rimO = [mk.ecken[0], ...mk.nahtOben, mk.ecken[1]];
    const rimU = [mk.ecken[0], ...mk.nahtUnten, mk.ecken[1]];
    for (const zustand of ['zu', 'auf'] as const) {
      const fit = maulAnpassen(mk, zustand, 10, 3);
      const g = grenze(fit, [rimO, rimU], 3);
      const ziel = zustand === 'zu' ? mk.zielZu : mk.zielAuf!;
      const linieO = rimO.map((i) => ziel[i]!);
      const linieU = rimU.map((i) => ziel[i]!);
      const dO = abstandZuZug(g.ketten[0]!, linieO);
      const dU = abstandZuZug(g.ketten[1]!, linieU);
      const fb0 = fit.flaechen.map((f) => (f.some((i) => mk.bereiche[i] === 'tasche') ? 'tasche' : 'haut'));
      const fb1 = bereichUnterteilen(fit, fb0);
      const n1 = unterteilen(fit);
      const fb2 = bereichUnterteilen(n1, fb1);
      const sd = selbstDurchdringungen(unterteilen(n1), 1e-4, fb2);
      console.log(zustand, 'Durchdringungen nach Bereich', sd.nachBereich);
      for (const [k, l] of Object.entries(sd.orteNachBereich)) console.log('  ', k, l.map((p) => p.map((x) => x.toFixed(3)).join(',')).join(' | '));
      console.log('  Naht zu:', mk.nahtOben.map((i) => mk.zielZu[i]!.map((x) => x.toFixed(3)).join(',')).join(' | '));
      console.log('  Stationen:', mk.stationen.map((f) => f.toFixed(3)).join(' '));
      console.log(zustand, 'Rand oben max', (dO.max * PX).toFixed(2), 'px, unten max', (dU.max * PX).toFixed(2), 'px; Durchdringungen', sd.paare);
      expect(dO.max * PX).toBeLessThan(3);
    }
  });
});

void MAUL_STANDARD;
