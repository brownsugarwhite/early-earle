// Etappe A: Import von Florians SVGs. Mit BERICHT=1 wird docs/look/ozzy-figur/import-bericht.md neu geschrieben.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { abflachen, type Form, morphen, punktAuf, teilen } from '../form';
import { ANSICHT_NAMEN, ANSICHTEN, berichtMarkdown, importieren, teilVon } from './import';
import { svgLesen } from './svg';

const ORDNER = new URL('../../../../../docs/look/ozzy-figur/vorlagen/', import.meta.url);
const texte: Record<string, string> = {};
for (const a of ANSICHT_NAMEN) texte[ANSICHTEN[a].datei] = readFileSync(new URL(ANSICHTEN[a].datei, ORDNER), 'utf8');
const daten = importieren(texte);

describe('Ozzy-Figur: Import', () => {
  it('liest alle sechs Ansichten ohne Fehler', () => {
    expect(daten.bericht.filter((b) => b.art === 'fehler')).toEqual([]);
    expect(Object.keys(daten.ansichten).sort()).toEqual([...ANSICHT_NAMEN].sort());
  });

  it('jedes Teil hat in allen Ansichten dieselbe Ankerzahl', () => {
    for (const a of ANSICHT_NAMEN) for (const t of daten.ansichten[a].teile) expect(t.form.length, `${t.name} in ${a}`).toBe(daten.anker[t.name]);
  });

  it('erwartete Ankerzahlen (Plan, Abschnitt 2)', () => {
    expect(daten.anker).toMatchObject({ ohrA: 4, ohrB: 4, kopfA: 9, kopfB: 9, bartA: 9, bartB: 9, nase: 6, bohne: 8, schwanz: 7, schwanzW: 7, beinRV: 15, beinLV: 15, fensterRV: 7, ohrSpalt: 3 });
  });

  it('gleicht nur das ferne Vorderbein der Seitenansichten aus, formtreu', () => {
    expect(daten.abgleiche.map((g) => `${g.teil}@${g.ansicht}`).sort()).toEqual(['beinLV@lieg1', 'beinLV@lieg2', 'beinLV@logo', 'beinLV@profil']);
    // Form unverändert: dieselbe Kurve wie direkt aus der Datei
    const roh = svgLesen(texte['ozzy_stand01_logo.svg']!).teile[4]!.form;
    const neu = teilVon(daten.ansichten.logo, 'beinLV')!.form;
    const id = (q: [number, number]): [number, number] => q;
    const a = abflachen(roh, id, 6);
    const b = abflachen(neu, id, 2);
    // Abstand jeder Probe der neuen Form zur Polylinie der alten (Strecken, nicht nur Punkte)
    let max = 0;
    for (let k = 0; k < b.length; k += 2) {
      let best = Infinity;
      for (let j = 0; j < a.length; j += 2) {
        const j2 = (j + 2) % a.length;
        const ax = a[j]!, ay = a[j + 1]!, dx = a[j2]! - ax, dy = a[j2 + 1]! - ay;
        const h = Math.max(0, Math.min(1, ((b[k]! - ax) * dx + (b[k + 1]! - ay) * dy) / (dx * dx + dy * dy || 1)));
        best = Math.min(best, Math.hypot(b[k]! - ax - dx * h, b[k + 1]! - ay - dy * h));
      }
      max = Math.max(max, best);
    }
    expect(max).toBeLessThan(0.05); // nur die Sehnen der Abtastung, kein Formfehler
  });

  it('gespiegelte Kopfteile der Front: Anker im Median nah am Spiegelbild (Zuordnung stimmt)', () => {
    expect(daten.bericht.filter((b) => b.art === 'warnung')).toEqual([]);
  });

  it('schreibt den Bericht, wenn verlangt', () => {
    const md = berichtMarkdown(daten);
    expect(md).toContain('beinLV');
    if (process.env.BERICHT === '1') writeFileSync(new URL('../import-bericht.md', ORDNER), md);
  });
});

describe('Ozzy-Figur: Formen', () => {
  const quadrat: Form = [
    { p: [0, 0], i: [-5, 5], o: [5, -5] },
    { p: [20, 0], i: [15, -5], o: [25, 5] },
    { p: [20, 20], i: [25, 15], o: [15, 25] },
    { p: [0, 20], i: [5, 25], o: [-5, 15] },
  ];
  it('teilen lässt die Kurve, wie sie ist', () => {
    const t = teilen(quadrat, 1, 0.37);
    expect(t.length).toBe(5);
    const vorher = punktAuf(quadrat, 1, 0.37);
    expect(t[2]!.p[0]).toBeCloseTo(vorher[0], 9);
    expect(t[2]!.p[1]).toBeCloseTo(vorher[1], 9);
    // Teilstücke treffen die alte Kurve
    const alt = punktAuf(quadrat, 1, 0.37 + 0.63 * 0.5);
    const neu = punktAuf(t, 2, 0.5);
    expect(neu[0]).toBeCloseTo(alt[0], 9);
    expect(neu[1]).toBeCloseTo(alt[1], 9);
  });
  it('morphen trifft die Enden genau und hält glatte Anker glatt', () => {
    const b = quadrat.map((a) => ({ p: [a.p[0] * 1.5, a.p[1]] as [number, number], i: [a.i[0] * 1.5, a.i[1] + 2] as [number, number], o: [a.o[0] * 1.5, a.o[1] - 2] as [number, number] }));
    for (const art of ['linear', 'winkel', 'aehnlich'] as const) {
      expect(morphen(quadrat, b, 0, art)).toEqual(quadrat);
      expect(morphen(quadrat, b, 1, art)).toEqual(b);
    }
    const m = morphen(quadrat, b, 0.5, 'winkel');
    for (const a of m) {
      const w1 = Math.atan2(a.p[1] - a.i[1], a.p[0] - a.i[0]);
      const w2 = Math.atan2(a.o[1] - a.p[1], a.o[0] - a.p[0]);
      expect(Math.abs(Math.atan2(Math.sin(w1 - w2), Math.cos(w1 - w2)))).toBeLessThan(1e-9);
    }
  });
});
