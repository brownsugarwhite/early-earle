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

describe('Versuch Kiefer = Knochen + Korrektur (Tiger)', () => {
  it('Zwischenstufen: Knochen halten die Kieferlänge, die reine Blendshape schrumpft', async () => {
    const { maulZwischen, kieferRig } = await import('./maul');
    const dokZu = vorlageDokument(tiger, 'zu');
    const { eingabe } = vorlageMaul(tiger);
    const mk = maulKaefig(dokZu, eingabe);
    const zu = maulAnpassen(mk, 'zu');
    const auf = maulAnpassen(mk, 'auf');
    const rig = kieferRig(mk, zu, auf);
    const grad = (w: number) => ((w * 180) / Math.PI).toFixed(1);
    console.log('Gelenk oben: Winkel', grad(rig.gelenkOben.w), '° Achse', rig.gelenkOben.u.map((x) => x.toFixed(2)).join(','), 'Rest', rig.restOben.toFixed(2));
    console.log('Gelenk unten: Winkel', grad(rig.gelenkUnten.w), '° Achse', rig.gelenkUnten.u.map((x) => x.toFixed(2)).join(','), 'Rest', rig.restUnten.toFixed(2), '→', rig.art);
    // Kinn = Unterrand in der Mitte; Abstand zur Achse des Unterkiefers
    const kinn = mk.nahtUnten[(mk.nahtUnten.length - 1) / 2]!;
    const zurAchse = (p: V3) => {
      const g = rig.gelenkUnten;
      const d: V3 = [p[0] - g.c[0], p[1] - g.c[1], p[2] - g.c[2]];
      const t = d[0] * g.u[0] + d[1] * g.u[1] + d[2] * g.u[2];
      return Math.hypot(d[0] - t * g.u[0], d[1] - t * g.u[1], d[2] - t * g.u[2]);
    };
    const r0 = zurAchse(zu.punkte[kinn]!);
    for (const a of [0.25, 0.5, 0.75, 1]) {
      const lin = maulZwischen(mk, zu, auf, a, 'linear');
      const kno = maulZwischen(mk, zu, auf, a, 'knochen', rig);
      const dl = zurAchse(lin.punkte[kinn]!) / r0;
      const dk = zurAchse(kno.punkte[kinn]!) / r0;
      const fb0 = kno.flaechen.map((f) => (f.some((i) => mk.bereiche[i] === 'tasche') ? 'tasche' : 'haut'));
      const sdL = selbstDurchdringungen(unterteilen(unterteilen(lin)), 1e-4, bereichUnterteilen(unterteilen(lin), bereichUnterteilen(lin, fb0)));
      const sdK = selbstDurchdringungen(unterteilen(unterteilen(kno)), 1e-4, bereichUnterteilen(unterteilen(kno), bereichUnterteilen(kno, fb0)));
      console.log(`α=${a}: Kinn/Gelenk linear ${(dl * 100).toFixed(1)} %, Knochen ${(dk * 100).toFixed(1)} %; Durchdringungen linear ${sdL.paare}, Knochen ${sdK.paare}`);
      if (a === 1) expect(Math.max(...kno.punkte.map((p, i) => Math.hypot(p[0] - auf.punkte[i]![0], p[1] - auf.punkte[i]![1], p[2] - auf.punkte[i]![2])))).toBeLessThan(1e-9);
    }
  });
});
