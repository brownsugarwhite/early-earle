// Teil G, G4 (Beweis, erste Stufe): Teile erkennen und als Ausstülpungen bauen. Bestehende Körper haben keine Teile und
// bauen bitgleich; Florians Ente bekommt zwei Flügelspitzen, der Fisch zwei Brustflossen (Top und Front); der Käfig mit
// Teilen ist geschlossen und einheitlich orientiert. Die Formtreue (Δ, Falten) ist noch nicht gut — Zahlen im Plan.
import { describe, expect, it } from 'vitest';
import { pruefeKaefig } from '../../kaefig/halbkanten';
import { ableiten } from '../ableiten';
import { gKoerperDokument } from '../pruefen/grundkoerper';
import { KOERPER, koerperDokument } from '../pruefen/koerper';
import { zufall } from '../pruefen/zufall';
import { teileVon } from './teile';
import { ableitenMitTeilen } from './teilBau';

describe('Teil G, G4: Teile', () => {
  it('bestehende Körper: keine Teile, Bau bitgleich', () => {
    for (const k of KOERPER) {
      const d = koerperDokument(k, zufall(1));
      const t = teileVon(d);
      expect(t.top.teile.length + t.front.teile.length, k).toBe(0);
    }
    const d = koerperDokument('rex', zufall(1));
    expect(Array.from(ableitenMitTeilen(d, { stufen: 1 }).fein)).toEqual(Array.from(ableiten(d, { stufen: 1 }).fein));
  });

  it('Ente: zwei Flügelspitzen im Top; Fisch: Brustflossen in Top und Front; Käfig mit Teilen gültig', () => {
    const ente = teileVon(gKoerperDokument('ente'));
    expect(ente.top.teile.length).toBe(2);
    const fisch = teileVon(gKoerperDokument('fisch'));
    expect(fisch.top.teile.length).toBe(2);
    expect(fisch.front.teile.length).toBe(2);
    for (const name of ['ente', 'fisch'] as const) {
      const abl = ableitenMitTeilen(gKoerperDokument(name), { stufen: 1 });
      expect(abl.teile.length, name).toBe(1);
      expect(pruefeKaefig(abl.kaefig).ok, name).toBe(true);
      expect(abl.kaefig.n, name).toBeGreaterThan(abl.vorlage.kaefig.n);
    }
  });
});
