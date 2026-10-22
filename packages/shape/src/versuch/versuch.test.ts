import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { START_RADIUS, bewegeKnoten } from '../profil';
import { type Netz, type V3, kante, unterteilenMehrfach } from './catmullClark';
import { kaefigAnpassen, kaefigAusProfilen, silhouettenFehler } from './kaefig';

function wuerfel(schaerfe: number): Netz {
  const punkte: V3[] = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ];
  const flaechen = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]];
  const m = new Map<string, number>();
  if (schaerfe > 0) for (const f of flaechen) for (let i = 0; i < 4; i++) m.set(kante(f[i]!, f[(i + 1) % 4]!), schaerfe);
  return { punkte, flaechen, schaerfe: m };
}

const PX = 461; // Kachel in Bildpunkten in der Grundansicht

describe('Versuch Catmull-Clark mit Kantenschärfe', () => {
  it('scharfe Kanten halten den Würfel, glatte runden ihn', () => {
    const scharf = unterteilenMehrfach(wuerfel(10), 3);
    expect(scharf.punkte[6]).toEqual([1, 1, 1]);
    const rund = unterteilenMehrfach(wuerfel(0), 3);
    expect(rund.punkte[6]![0]).toBeLessThan(0.7);
    const halb = unterteilenMehrfach(wuerfel(1.5), 3);
    expect(halb.punkte[6]![0]).toBeGreaterThan(rund.punkte[6]![0]);
    expect(halb.punkte[6]![0]).toBeLessThan(1);
  });

  it('Käfig aus den Profilen: angepasst trifft die Kugel auf unter einen halben Bildpunkt', () => {
    // Messung 11.10.: roh (ohne Anpassung) schrumpft die Fläche um 7–15 px, angepasst bleibt sie < 0,4 px
    const dok = neuesDokument();
    const r = START_RADIUS;
    const radial = (n: Netz) => Math.max(...n.punkte.map((p) => Math.abs(Math.hypot(p[0], p[1] - r, p[2]) - r)));
    for (const [ringe, ring] of [[7, 8], [9, 12]] as const) {
      const roh = kaefigAusProfilen(dok, ringe, ring);
      const fit = kaefigAnpassen(roh, dok);
      expect(radial(unterteilenMehrfach(roh, 3)) * PX).toBeGreaterThan(4);
      expect(radial(unterteilenMehrfach(fit, 3)) * PX).toBeLessThan(0.5);
    }
  });

  it('auch eine gezogene Form (Ei mit Schwanzspitze) bleibt nah an der Silhouette', () => {
    const dok = neuesDokument();
    dok.profile.seite = bewegeKnoten(dok.profile.seite, 1, { x: 0.55, y: 0.3 });
    const fit = kaefigAnpassen(kaefigAusProfilen(dok, 11, 12), dok);
    const f = silhouettenFehler(unterteilenMehrfach(fit, 3), dok);
    expect(f.mittel * PX).toBeLessThan(2);
  });
});

describe('Versuch Tiger-Käfig', () => {
  it('ist ein geschlossenes Netz und trifft angepasst seine Zielpunkte', async () => {
    const { tigerKaefig, anZielAnpassen, geschlossen } = await import('./tigerKaefig');
    const tk = tigerKaefig(neuesDokument());
    expect(geschlossen(tk.netz)).toBe(true);
    const fit = anZielAnpassen(tk.netz, tk.ziel, 8, 3);
    // gleiche Stufe wie bei der Anpassung (Stufe 3 nähert die Grenzfläche)
    const grenze = unterteilenMehrfach(fit, 3).punkte;
    let max = 0;
    tk.ziel.forEach((z, i) => (max = Math.max(max, Math.hypot(grenze[i]![0] - z[0], grenze[i]![1] - z[1], grenze[i]![2] - z[2]))));
    expect(max * PX).toBeLessThan(1);
  });
});
