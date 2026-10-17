// Plan „Liniennetz, Zielform, Käfig“ (17.10.), S7.4: P-Linien auf dem Baum-Körper mindestens wie auf der Röhre.
import { describe, expect, it } from 'vitest';
import type { Kante } from '../../dokument';
import { type Kaefig, kanteZwischen } from '../../kaefig/halbkanten';
import type { Unterteilung } from '../../subdivision/catmullClark';
import { GLATTE_HAUT, ableiten } from '../ableiten';
import { teilSatzDokument } from '../pruefen/teilsatz';
import { feinKette } from '../reifen';
import { baumAbleiten } from './baumBau';

declare const console: { log: (...a: unknown[]) => void };

const PX = 461;

/** Größter Knickwinkel (Grad) der feinen Fläche längs der Käfigkanten, die die Linie neu geschärft hat. */
function linienKnick(k: Kaefig, vorher: Float64Array, u: Unterteilung, fein: Float64Array): number {
  const fk = u.stufen[u.stufen.length - 1]!.kaefig;
  const normale = (f: number): [number, number, number] => {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    const a = fk.fStart[f]!;
    const e = fk.fStart[f + 1]!;
    for (let h = a; h < e; h++) {
      const p = fk.fVerts[h]!;
      const q = fk.fVerts[h + 1 < e ? h + 1 : a]!;
      nx += (fein[3 * p + 1]! - fein[3 * q + 1]!) * (fein[3 * p + 2]! + fein[3 * q + 2]!);
      ny += (fein[3 * p + 2]! - fein[3 * q + 2]!) * (fein[3 * p]! + fein[3 * q]!);
      nz += (fein[3 * p]! - fein[3 * q]!) * (fein[3 * p + 1]! + fein[3 * q + 1]!);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  };
  let max = 0;
  for (let e = 0; e < k.nE; e++) {
    if (!(k.eSchaerfe[e]! > 1e5) || vorher[e]! > 1e5) continue;
    const kette = feinKette(u, k, k.eA[e]!, k.eB[e]!);
    for (let i = 0; i + 1 < kette.length; i++) {
      const fe = kanteZwischen(fk, kette[i]!, kette[i + 1]!);
      if (fe < 0 || fk.eFlaechen[fe] !== 2) continue;
      const h = fk.eHalb[fe]!;
      const n0 = normale(fk.hFace[h]!);
      const n1 = normale(fk.hFace[fk.hTwin[h]!]!);
      const c = n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2];
      max = Math.max(max, (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI);
    }
  }
  return max;
}

describe('S7.4 P-Linien auf dem Baum', () => {
  it('Ente: Linie mit Härte über den Halsansatz gibt eine Falte, mindestens wie auf der Röhre', () => {
    const dok0 = teilSatzDokument('ente');
    const b0 = baumAbleiten(dok0, { paare: true });
    const an = b0.ebene.streifen[1]!.ansatz!;
    const M = { x: (an.A.x + an.B.x) / 2, y: (an.A.y + an.B.y) / 2 };
    const sk = dok0.skalierung;
    // von 25 px unter der Sehnenmitte (Rumpf) bis 40 px darüber (Hals), in der Seite gezeichnet, Härte 1
    const kante: Kante = {
      knoten: [
        { p: [M.x / sk, (M.y - 25 / PX) / sk, 0], ein: [0, 0, 0], aus: [0, 0, 0], art: 'ecke' },
        { p: [M.x / sk, (M.y + 40 / PX) / sk, 0], ein: [0, 0, 0], aus: [0, 0, 0], art: 'ecke' },
      ],
      haerte: [1, 1],
      blick: 'seite',
    };
    const dok = { ...dok0, kanten: [kante] };
    const b = baumAbleiten(dok, { paare: true });
    let scharf = 0;
    for (let e = 0; e < b.kaefig.nE; e++) if (b.kaefig.eSchaerfe[e]! > 1e5) scharf++;
    let scharf0 = 0;
    for (let e = 0; e < b0.kaefig.nE; e++) if (b0.kaefig.eSchaerfe[e]! > 1e5) scharf0++;
    // neue scharfe Kanten, rechts und gespiegelt
    expect(scharf - scharf0).toBeGreaterThanOrEqual(4);
    expect((scharf - scharf0) % 2).toBe(0);
    // Knick längs der neu geschärften Kanten, auf dem Baum mindestens 80 % dessen auf der Röhre
    const knickBaum = linienKnick(b.kaefig, Float64Array.from(b0.kaefig.eSchaerfe), b.unterteilung, b.fein);
    const r0 = ableiten(dok0, { ...GLATTE_HAUT, fuelle: 'mittel' });
    const r = ableiten(dok, { ...GLATTE_HAUT, fuelle: 'mittel' });
    const knickRoehre = linienKnick(r.kaefig, Float64Array.from(r0.kaefig.eSchaerfe), r.unterteilung, r.fein);
    console.log(`Knick an der Linie: Baum ${knickBaum.toFixed(1)}°, Röhre ${knickRoehre.toFixed(1)}°`);
    expect(knickRoehre).toBeGreaterThan(5);
    expect(knickBaum).toBeGreaterThan(0.8 * knickRoehre);
  });
});
