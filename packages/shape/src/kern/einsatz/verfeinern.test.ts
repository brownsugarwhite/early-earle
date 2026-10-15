// Teil A, Schritt A2: Der verfeinerte Käfig auf Stufe L−1 hat dieselbe Grenzfläche wie A0 auf Stufe L (≤ 1e-12), auch mit
// Falten (Kasten-Spanten, Tiger-Kastenschnauze, Ecken); Herkunft und Kindflächen stimmen.
import { describe, expect, it } from 'vitest';
import { pruefeKaefig } from '../../kaefig/halbkanten';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { ableiten } from '../ableiten';
import { KOERPER, koerperDokument } from '../pruefen/koerper';
import { zufall } from '../pruefen/zufall';
import { HERKUNFT_ECKE, HERKUNFT_FLAECHE, HERKUNFT_KANTE, verfeinern1 } from './verfeinern';

declare const console: { log: (...a: unknown[]) => void };

describe('Teil A, A2: exakte Verfeinerung', () => {
  for (const art of KOERPER) {
    it(`${art}: Stufe 1 auf L−1 = A0 auf L (L = 3), Falten eingeschlossen`, () => {
      const abl = ableiten(koerperDokument(art, zufall(1)), { stufen: 1 });
      const a0 = { ...abl.kaefig };
      const v = verfeinern1(a0);
      expect(pruefeKaefig(v.kaefig).ok).toBe(true);
      const L = 3;
      const fA0 = anwenden3(unterteilung(a0, L).grenze, a0.xyz);
      const fA = anwenden3(unterteilung(v.kaefig, L - 1).grenze, v.kaefig.xyz);
      expect(fA.length).toBe(fA0.length);
      let d = 0;
      for (let i = 0; i < fA.length; i++) d = Math.max(d, Math.abs(fA[i]! - fA0[i]!));
      let scharf = 0;
      for (let e = 0; e < a0.nE; e++) if (a0.eSchaerfe[e]! > 0) scharf++;
      console.log(`${art}: ${a0.n} → ${v.kaefig.n} Punkte, ${scharf} scharfe Kanten in A0, größte Abweichung ${d.toExponential(2)}`);
      expect(d).toBeLessThan(1e-12);
      // Herkunft: Ecken behalten ihren Index, Kanten- und Flächenpunkte liegen in der Mitte ihrer Herkunft (Lagen der Stufe 1)
      expect(v.art[0]).toBe(HERKUNFT_ECKE);
      expect(v.art[a0.n]).toBe(HERKUNFT_KANTE);
      expect(v.art[a0.n + a0.nE]).toBe(HERKUNFT_FLAECHE);
      expect(v.kinderStart[a0.nF]).toBe(v.kaefig.nF);
      for (let c = 0; c < v.kaefig.nF; c += 97) {
        const f = v.elternFlaeche[c]!;
        // die Kindfläche enthält den Flächenpunkt ihrer Elternfläche
        const ecken = Array.from(v.kaefig.fVerts.subarray(v.kaefig.fStart[c]!, v.kaefig.fStart[c + 1]!));
        expect(ecken).toContain(a0.n + a0.nE + f);
      }
    });
  }
});
