// Kanten auf der Fläche (Versuch 12.10. mittags): Projektion je Blickrichtung, Sichtbarkeit, Folgen der Form.
import { type Dokument, bewegeKnoten, neuesDokument } from '@ee/shape';
import { describe, expect, it } from 'vitest';
import { useUi } from '../state/uiStore';
import { kantenAnFlaeche, kantenPunkt, kantenPunktStetig, sichtbar } from './kantenFlaeche';

const R = 0.265;
const dok = neuesDokument();
const abstandZurKugel = (p: [number, number, number]) => Math.abs(Math.hypot(p[0], p[1] - R, p[2]) - R);

describe('Kanten auf der Fläche', () => {
  it('trifft je Blickrichtung die richtige Seite der Startkugel', () => {
    const seite = kantenPunkt(dok, 'seite', { x: 0, y: R })!;
    expect(seite[2]).toBeGreaterThan(0.2);
    const front = kantenPunkt(dok, 'front', { x: 0, y: R })!;
    const hinten = kantenPunkt(dok, 'hinten', { x: 0, y: R })!;
    expect(front[0]).toBeLessThan(-0.2);
    expect(hinten[0]).toBeGreaterThan(0.2);
    const top = kantenPunkt(dok, 'top', { x: 0, y: 0 })!;
    const unten = kantenPunkt(dok, 'unten', { x: 0, y: 0 })!;
    expect(top[1]).toBeGreaterThan(2 * R - 0.03);
    expect(unten[1]).toBeLessThan(0.03);
    for (const p of [seite, front, hinten, top, unten]) expect(abstandZurKugel(p)).toBeLessThan(0.01);
  });

  it('Sichtbarkeit: Rückseite ist von vorn verdeckt, von hinten sichtbar', () => {
    const hinten = kantenPunkt(dok, 'hinten', { x: 0.05, y: R })!;
    expect(sichtbar(dok, 'hinten', hinten)).toBe(true);
    expect(sichtbar(dok, 'front', hinten)).toBe(false);
  });

  it('Ziehen bleibt auf demselben Teil der Fläche (stetig in der Tiefe)', () => {
    // Punkt hinten-rechts auf der Flanke, in der Front seitlich verschoben: Er bleibt hinten (nicht auf die sichtbare
    // Vorderseite springen), weil der Treffer mit der nächsten Tiefe gilt
    const flanke = kantenPunkt(dok, 'seite', { x: 0.1, y: R * 0.8 })!;
    const neu = kantenPunktStetig(dok, 'front', { x: flanke[2] - 0.03, y: flanke[1] }, flanke)!;
    expect(neu[0]).toBeGreaterThan(0.05);
    expect(abstandZurKugel(neu)).toBeLessThan(0.01);
  });

  it('folgt der Form: Kugel nach vorn gezogen, die Kante liegt wieder auf der Fläche (Versuchs-Bauweise)', () => {
    useUi.setState({ bauweise: 'bisher' });
    const p = kantenPunkt(dok, 'seite', { x: -0.15, y: R })!;
    const mitKante: Dokument = { ...dok, kanten: [{ knoten: [p, kantenPunkt(dok, 'seite', { x: -0.05, y: R })!].map((q) => ({ p: q, ein: [0, 0, 0] as [number, number, number], aus: [0, 0, 0] as [number, number, number], art: 'glatt' as const })), haerte: [1, 1], blick: 'seite' }] };
    // Vorderpunkt der Seite (Knoten 3 = links) 0,08 nach vorn: Die Flanke vorn wird breiter
    const breiter: Dokument = { ...mitKante, profile: { ...mitKante.profile, seite: bewegeKnoten(mitKante.profile.seite, 3, { x: -R - 0.08, y: R }) } };
    const nachher = kantenAnFlaeche(breiter);
    const q = nachher.kanten![0]!.knoten[0]!.p;
    // gleiche Seitenkoordinaten, neue Tiefe auf der neuen Fläche
    expect(q[0]).toBeCloseTo(p[0], 6);
    expect(q[1]).toBeCloseTo(p[1], 6);
    const wieder = kantenPunkt(breiter, 'seite', { x: q[0], y: q[1] })!;
    expect(Math.abs(wieder[2] - q[2])).toBeLessThan(1e-6);
    useUi.setState({ bauweise: 'kern' });
  });

  it('Bauweise Kern: keine versteckten Schreibvorgänge (der Worker legt die Linie auf die Haut)', () => {
    useUi.setState({ bauweise: 'kern' });
    const p = kantenPunkt(dok, 'seite', { x: -0.15, y: R })!;
    const mitKante: Dokument = { ...dok, kanten: [{ knoten: [p, kantenPunkt(dok, 'seite', { x: -0.05, y: R })!].map((q) => ({ p: q, ein: [0, 0, 0] as [number, number, number], aus: [0, 0, 0] as [number, number, number], art: 'glatt' as const })), haerte: [1, 1], blick: 'seite' }] };
    const breiter: Dokument = { ...mitKante, profile: { ...mitKante.profile, seite: bewegeKnoten(mitKante.profile.seite, 3, { x: -R - 0.08, y: R }) } };
    expect(kantenAnFlaeche(breiter)).toBe(breiter);
  });
});
