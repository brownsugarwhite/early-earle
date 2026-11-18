// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 „Teile erkennen“: Prüfsatz von Hand eingeordneter Körper (Regel und
// Gründe in `kern/pruefen/teilsatz.ts`), Einfrieren als Kurvenparameter und Hysterese bei kleinen Zügen.
import { describe, expect, it } from 'vitest';
import { verschiebeKnoten } from '../../profil';
import { TEIL_SATZ, TEIL_SATZ_KOERPER, einordnungPruefen, teilSatzDokument } from '../pruefen/teilsatz';
import { muldenTiefe, teilbaum, teilSignatur } from './teilbaum';

describe('S4 Teile erkennen', () => {
  it.each(TEIL_SATZ_KOERPER)('%s wird wie von Hand eingeordnet gelesen', (name) => {
    const dok = teilSatzDokument(name);
    const b = teilbaum(dok);
    const p = einordnungPruefen(dok, b, TEIL_SATZ[name]!);
    expect({ name, ...p }).toEqual({ name, richtig: true, fehlt: [], falscheArt: [], zuviel: [] });
  });

  it('konvexer Umriss hat keine Mulde (Ecken sind keine Teile)', () => {
    const quadrat = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(Math.max(...muldenTiefe(quadrat))).toBe(0);
    const kerbe = [...quadrat.slice(0, 2), { x: 1, y: 0.4 }, { x: 0.6, y: 0.5 }, { x: 1, y: 0.6 }, ...quadrat.slice(2)];
    expect(Math.max(...muldenTiefe(kerbe))).toBeCloseTo(0.4, 6);
  });

  it('eingefroren: gleiche Teile, gleiche Kennungen, Sehnen genau auf der Kurve', () => {
    for (const name of ['fisch', 'vierbeiner', 'ente', 'zweihals']) {
      const dok = teilSatzDokument(name);
      const a = teilbaum(dok);
      const b = teilbaum(dok, a.gefroren);
      expect(teilSignatur(b)).toBe(teilSignatur(a));
      expect(b.teile.map((t) => t.id)).toEqual(a.teile.map((t) => t.id));
      // die eingefrorene Sehne ist dieselbe Stelle (Kurvenparameter statt Rasterlage), wieder eingefroren bitgleich
      const c = teilbaum(dok, b.gefroren);
      expect(c.gefroren).toEqual(b.gefroren);
    }
  });

  it('Hysterese: ein Wulst, den das Skelett nur manchmal findet, flackert nicht (Rex-Front, Vierbeiner-Front)', () => {
    // Beim Ziehen überschreitet der Wulst einmal die Schwelle für neue Teile; danach bleibt er (an seiner eingefrorenen Sehne
    // mitgenommen, wenn das Skelett ihn nicht vorschlägt). Erlaubt sind Wechsel mit der Form (erscheinen, Richtung bei
    // starkem Zug), nie ein Zurückspringen in einen früheren Zustand
    const faelle: [string, 'front', number, [number, number]][] = [
      ['rex', 'front', 6, [1, 0]],
      ['rex', 'front', 2, [0, -1]],
      ['vierbeiner', 'front', 4, [-1, 0]],
    ];
    for (const [name, blatt, i, [dx, dy]] of faelle) {
      const basis = teilSatzDokument(name);
      let vorher = teilbaum(basis).gefroren;
      const folge: string[] = [];
      for (let k = 0; k <= 30; k++) {
        const f = (10 / 461 / basis.skalierung) * (k / 30);
        const dok = { ...basis, profile: { ...basis.profile, [blatt]: verschiebeKnoten(basis.profile[blatt], [i], { x: dx * f, y: dy * f }) } };
        const b = teilbaum(dok, vorher);
        vorher = b.gefroren;
        folge.push(b.teile.map((t) => `${t.id}:${t.art}:${t.richtung}`).join(','));
      }
      // Läufe gleicher Einordnung: jede Einordnung darf nur einen zusammenhängenden Lauf haben
      const laeufe = folge.filter((x, k) => k === 0 || x !== folge[k - 1]);
      expect(`${name} ${blatt} ${i}: ${laeufe.length} Läufe, ${new Set(laeufe).size} verschiedene`).toBe(`${name} ${blatt} ${i}: ${new Set(laeufe).size} Läufe, ${new Set(laeufe).size} verschiedene`);
      expect(laeufe.length).toBeLessThanOrEqual(3);
    }
  });

  it('Hysterese: 30 Schritte bis 10 px an Grenzfällen ändern die Einordnung nicht', () => {
    // Grenzfälle des Prüfsatzes (Maß nahe 1,15): Vasenhals, Flügelhaken, Flügel über dem Rücken (Top), Bauchflosse
    const faelle: [string, 'seite' | 'front' | 'top'][] = [
      ['vase', 'seite'],
      ['ente-haken', 'top'],
      ['fluegel-oben', 'top'],
      ['fisch', 'seite'],
    ];
    for (const [name, blatt] of faelle) {
      const basis = teilSatzDokument(name);
      const start = teilbaum(basis);
      const sig0 = teilSignatur(start);
      const n = basis.profile[blatt].knoten.length;
      for (const i of [0, Math.floor(n / 3), Math.floor((2 * n) / 3)]) {
        for (const [dx, dy] of [[1, 0], [0, -1]] as const) {
          let vorher = start.gefroren;
          for (let k = 1; k <= 30; k++) {
            const f = (10 / 461 / basis.skalierung) * (k / 30);
            const dok = { ...basis, profile: { ...basis.profile, [blatt]: verschiebeKnoten(basis.profile[blatt], [i], { x: dx * f, y: dy * f }) } };
            const b = teilbaum(dok, vorher);
            vorher = b.gefroren;
            expect(`${name} ${blatt} ${i} ${dx},${dy} Schritt ${k}: ${teilSignatur(b)}`).toBe(`${name} ${blatt} ${i} ${dx},${dy} Schritt ${k}: ${sig0}`);
          }
        }
      }
    }
  });
});
