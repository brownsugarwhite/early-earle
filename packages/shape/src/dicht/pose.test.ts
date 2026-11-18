import { describe, expect, it } from 'vitest';
import { backenBereit, maulBacken } from './backen';
import { type MaulLinie, maulSchneiden } from './maul';
import { dichtNachLage, umgeklappt } from './netzpruefung';
import { type Pose, posieren } from './pose';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

const kreis = (r: number, oben = r): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: oben },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
const linie: MaulLinie = { punkte: [{ x: -150, y: 0 }, { x: -80, y: -10 }, { x: -15, y: -12 }] };

/** Fressen: Unterkiefer weit auf, Schädel kippt, die Oberlippe vorn hoch und die Mundwinkel breit (Züge des Blendshapes) */
const fressen: Pose = {
  kiefer: 40,
  schaedel: 20,
  zuege: [
    // Oberlippe vorn in der Mitte hoch (macht die Öffnung von vorn rund)
    { c: [-140, 2, 20], d: [0, 22, 0], r: 60 },
    // Mundwinkel nach außen
    { c: [-30, -12, 140], d: [0, 0, 18], r: 50 },
    // Kinn nach vorn
    { c: [-110, -80, 60], d: [-15, -5, 0], r: 55 },
  ],
};

function posiert(netz: ReturnType<typeof rundAusSeite>, pose: Pose) {
  const m = maulSchneiden(netz, linie, { zelle: netz.zelle, kontur: netz.kontur })!;
  const ziel = {
    positionen: new Float32Array(m.positionen.length),
    normalen: new Float32Array(m.normalen.length),
    innenPositionen: new Float32Array(m.innen.positionen.length),
    innenNormalen: new Float32Array(m.innen.normalen.length),
  };
  posieren(m, m, pose, ziel);
  return { m, ziel };
}

describe('Posen auf der dichten Form: Knochen und Blendshape', () => {
  const netz = rundAusSeite(kreis(150), { dreiecke: 16000 });

  it('Fressen (Unterkiefer, Schädel, drei Züge): dicht, nichts klappt um', () => {
    const { m, ziel } = posiert(netz, fressen);
    expect(
      dichtNachLage([
        { p: ziel.positionen, i: m.indizes },
        { p: ziel.innenPositionen, i: m.innen.indizes },
      ]),
    ).toEqual({ offen: 0, mehr: 0 });
    expect(umgeklappt(ziel.positionen, ziel.normalen, m.indizes)).toBe(0);
    expect(umgeklappt(ziel.innenPositionen, ziel.innenNormalen, m.innen.indizes)).toBe(0);
  });

  it('ein Zug am Gelenk (hinten im Maul) verschiebt die Achse: Gaumen und Boden bleiben an ihr verbunden', () => {
    // vorher drehten beide um die alte Achse und rissen hinter dem Mundwinkel auseinander (24–28 offene Kanten im Fenster)
    const { m, ziel } = posiert(netz, { kiefer: 40, schaedel: 15, zuege: [{ c: [-25, -14, 0], d: [-10, -12, 0], r: 66 }] });
    expect(
      dichtNachLage([
        { p: ziel.positionen, i: m.indizes },
        { p: ziel.innenPositionen, i: m.innen.indizes },
      ]),
    ).toEqual({ offen: 0, mehr: 0 });
    expect(umgeklappt(ziel.positionen, ziel.normalen, m.indizes)).toBe(0);
  });

  it('der Schädel kippt die Oberlippe starr nach oben, die Unterlippe bleibt', () => {
    const { m, ziel } = posiert(netz, { kiefer: 0, schaedel: 25, zuege: [] });
    const a = (-m.drehsinn * 25 * Math.PI) / 180;
    let fehlerOben = 0;
    let unten = 0;
    let hoch = 0;
    for (let i = 0; i < m.lippeOben.length; i++) {
      const o = m.lippeOben[i]!;
      const dx = m.positionen[3 * o]! - m.gelenk.x;
      const dy = m.positionen[3 * o + 1]! - m.gelenk.y;
      fehlerOben = Math.max(
        fehlerOben,
        Math.hypot(ziel.positionen[3 * o]! - (m.gelenk.x + Math.cos(a) * dx - Math.sin(a) * dy), ziel.positionen[3 * o + 1]! - (m.gelenk.y + Math.sin(a) * dx + Math.cos(a) * dy)),
      );
      hoch = Math.max(hoch, ziel.positionen[3 * o + 1]! - m.positionen[3 * o + 1]!);
      const u = m.lippeUnten[i]!;
      unten = Math.max(unten, Math.hypot(ziel.positionen[3 * u]! - m.positionen[3 * u]!, ziel.positionen[3 * u + 1]! - m.positionen[3 * u + 1]!));
    }
    expect(fehlerOben).toBeLessThan(1e-3);
    expect(hoch).toBeGreaterThan(30);
    expect(unten).toBeLessThan(1e-3);
  });

  it('die Pose hängt am Raum: nach einer Änderung der Grundform gilt sie weiter, ohne Umklappen', () => {
    // der Scheitel 12 höher: anderes Netz (andere Punkte), dieselbe Pose
    const anders = rundAusSeite(kreis(150, 162), { dreiecke: 16000 });
    const { m, ziel } = posiert(anders, fressen);
    expect(umgeklappt(ziel.positionen, ziel.normalen, m.indizes)).toBe(0);
    expect(
      dichtNachLage([
        { p: ziel.positionen, i: m.indizes },
        { p: ziel.innenPositionen, i: m.innen.indizes },
      ]),
    ).toEqual({ offen: 0, mehr: 0 });
    // der Zug an der Oberlippe wirkt dort wie vorher: der nächste Punkt der Oberlippe vorn geht hoch
    let bester = -1;
    let d = Infinity;
    for (const v of m.lippeOben) {
      const e = Math.hypot(m.positionen[3 * v]! + 140, m.positionen[3 * v + 2]! - 20);
      if (e < d) {
        d = e;
        bester = v;
      }
    }
    expect(ziel.positionen[3 * bester + 1]! - m.positionen[3 * bester + 1]!).toBeGreaterThan(15);
  });

  it('das Spielnetz trägt die Pose: dieselben Punkte, dicht, nichts klappt um', async () => {
    await backenBereit;
    const dicht = rundAusSeite(kreis(150), { dreiecke: 40000 });
    const { m, ziel } = posiert(dicht, fressen);
    const sp = maulBacken(m, 8000);
    expect(sp.dreiecke).toBeLessThanOrEqual(8000);
    expect(
      dichtNachLage([
        { p: ziel.positionen, i: sp.indizes },
        { p: ziel.innenPositionen, i: sp.innenIndizes },
      ]),
    ).toEqual({ offen: 0, mehr: 0 });
    expect(umgeklappt(ziel.positionen, ziel.normalen, sp.indizes)).toBe(0);
  });
});
