// Zufallsreihe (Plan Teil V): Die Messwerkzeuge selbst prüfen, bevor ihre Zahlen etwas gelten — gleicher Startwert
// gleiche Fälle, ausgewogene Achsen, Flächenabstand und Linienabweichung stimmen an bekannten Fällen.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../../dokument';
import { ableiten } from '../ableiten';
import { feinesNetz } from '../pruefstand';
import { faelleZiehen, fallDokumente } from './faelle';
import { dreiecke, fallMessen, flaechenAbstand, zugAbweichung } from './masse';

describe('Zufallsreihe: Werkzeuge', () => {
  it('gleicher Startwert → gleiche Fälle; jede Achse kommt ausgewogen vor', () => {
    const a = faelleZiehen(7, 66);
    const b = faelleZiehen(7, 66);
    expect(a.map((f) => f.id)).toEqual(b.map((f) => f.id));
    expect(faelleZiehen(8, 66).map((f) => f.id)).not.toEqual(a.map((f) => f.id));
    const zaehle = (k: keyof (typeof a)[number]) => {
      const m = new Map<string, number>();
      for (const f of a) m.set(String(f[k]), (m.get(String(f[k])) ?? 0) + 1);
      return [...m.values()];
    };
    // 11 Körper in 66 Fällen: genau 6 je Körper
    expect(zaehle('koerper').every((n) => n === 6)).toBe(true);
    // 3 Kiefer: je 22
    expect(zaehle('kiefer').every((n) => n === 22)).toBe(true);
  });

  it('Flächenabstand: eigene Punkte 0, entlang der Normalen versetzt = Versatz', () => {
    const abl = ableiten(neuesDokument('k'), { stufen: 2 });
    const { punkte, flaechen } = feinesNetz(abl);
    const tri = dreiecke(punkte, flaechen);
    const abstand = flaechenAbstand(tri);
    let m = 0;
    for (let i = 0; i < punkte.length; i += 7) m = Math.max(m, abstand(punkte[i]!).d);
    expect(m).toBeLessThan(1e-12);
    // Kugelmitte (0, r, 0) liegt r von der Haut entfernt (bis auf die Netzfeinheit)
    const r = 0.265;
    const d = abstand([0, r, 0]).d;
    expect(Math.abs(d - r)).toBeLessThan(0.01 * r);
    // Punkt außen 0,05 über dem Scheitel
    expect(Math.abs(abstand([0, 2 * r + 0.05, 0]).d - 0.05)).toBeLessThan(2e-3);
  });

  it('Linienabweichung: gleiche Züge 0 px, um 0,01 verschobener Zug ≈ 4,6 px in Seite', () => {
    const a = Array.from({ length: 30 }, (_, i) => [i / 29, 0.3 * Math.sin(i / 5), 0.1] as [number, number, number]);
    expect(zugAbweichung(a, a, 1).seite).toBe(0);
    const b = a.map((p) => [p[0], p[1] + 0.01, p[2]] as [number, number, number]);
    const w = zugAbweichung(a, b, 1);
    expect(w.seite).toBeGreaterThan(3.5);
    expect(w.seite).toBeLessThan(4.7);
    expect(w.front).toBeCloseTo(4.61, 1);
  });

  it('ein Fall baut und misst reproduzierbar (endliche Werte, zweimal gleich)', () => {
    const fall = faelleZiehen(20261015, 12).find((f) => f.koerper === 'kugel')!;
    const fd = fallDokumente(fall);
    expect('fehler' in fd).toBe(false);
    if ('fehler' in fd) return;
    const m1 = fallMessen(fd, { oeffnungen: [0, 1], kiefer: false });
    const m2 = fallMessen(fd, { oeffnungen: [0, 1], kiefer: false });
    expect(Number.isFinite(m1.formtreue.fern.max)).toBe(true);
    expect(Number.isFinite(m1.lippe.oben.seite)).toBe(true);
    expect(m2.formtreue).toEqual(m1.formtreue);
    expect(m2.delta).toEqual(m1.delta);
    expect(m2.lippe).toEqual(m1.lippe);
  });
});
