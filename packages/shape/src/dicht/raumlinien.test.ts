import { describe, expect, it } from 'vitest';
import { type RaumLinie, punktSetzen, raumAbtasten, umrissLinie, verbinden } from './raumlinien';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];

/** größte Tiefe und größte Ausdehnung in x und y des Netzes */
function masse(pos: Float32Array): { x: number; y: number; z: number } {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < pos.length; i += 3) {
    x = Math.max(x, Math.abs(pos[i]!));
    y = Math.max(y, Math.abs(pos[i + 1]!));
    z = Math.max(z, Math.abs(pos[i + 2]!));
  }
  return { x, y, z };
}

/** größter Abstand der Linienproben zum nächsten Netzpunkt */
function abstandZumNetz(l: RaumLinie, pos: Float32Array): number {
  let schlimm = 0;
  for (const q of raumAbtasten(l, 5).p) {
    let best = Infinity;
    for (let i = 0; i < pos.length; i += 3) best = Math.min(best, Math.hypot(pos[i]! - q.x, pos[i + 1]! - q.y, pos[i + 2]! - q.z));
    schlimm = Math.max(schlimm, best);
  }
  return schlimm;
}

describe('Linien auf der Form (Probe 04.11.)', () => {
  it('die Umrisslinie der Front liegt auf der Kugel und ändert sie nicht', () => {
    const k0 = rundAusSeite(kreis(150), { dreiecke: 8000 });
    const linie = umrissLinie(k0.kontur!, 'front', 1.5)!;
    expect(linie.punkte[0]!.z).toBe(0);
    expect(linie.punkte[linie.punkte.length - 1]!.z).toBe(0);
    const k1 = rundAusSeite(kreis(150), { dreiecke: 8000, raumlinien: [linie] });
    const m = masse(k1.positionen);
    expect(Math.abs(m.z - 150)).toBeLessThan(3);
    expect(abstandZumNetz(linie, k1.positionen)).toBeLessThan(1.5 * k1.zelle);
  });

  it('zieht Florian die Umrisslinie der Front hinaus, wird die Kugel gleichmäßig breiter, die Seite bleibt', () => {
    const k0 = rundAusSeite(kreis(150), { dreiecke: 8000 });
    const linie = umrissLinie(k0.kontur!, 'front', 1.5)!;
    const breiter: RaumLinie = { ...linie, punkte: linie.punkte.map((q) => ({ ...q, z: q.z * 1.4 })) };
    const k1 = rundAusSeite(kreis(150), { dreiecke: 8000, raumlinien: [breiter] });
    const m = masse(k1.positionen);
    expect(Math.abs(m.z - 210)).toBeLessThan(5);
    expect(Math.abs(m.x - 150)).toBeLessThan(2);
    expect(Math.abs(m.y - 150)).toBeLessThan(2);
    expect(abstandZumNetz(breiter, k1.positionen)).toBeLessThan(1.5 * k1.zelle);
  });

  it('eine Linie im Top hält die Breite fest, die Front-Linie ändert sie nur dort, wo sie liegt', () => {
    // Langer Körper: Top-Linie (größte Breite längs) und Front-Linie in der Mitte, die Mitte breiter gezogen
    const seite: UmrissPunkt[] = [
      { x: 300, y: 0 },
      { x: 150, y: 80 },
      { x: -150, y: 80 },
      { x: -300, y: 0 },
      { x: -150, y: -80 },
      { x: 150, y: -80 },
    ];
    const k0 = rundAusSeite(seite, { dreiecke: 12000 });
    const top = umrissLinie(k0.kontur!, 'top', 1.5)!;
    const front = umrissLinie(k0.kontur!, 'front', 1.5)!;
    // wo sie sich in der Seite kreuzen, teilen beide einen Punkt
    let n = 0;
    expect(verbinden(front, top, () => ++n, 3 * k0.zelle)).toBe(1);
    const linien = [top, front];
    // die Front-Linie hinaus: jeder ihrer Punkte 1,5-mal so tief (der Knoten zieht die Top-Linie mit)
    front.punkte.forEach((q, i) => punktSetzen(linien, 1, i, { x: q.x, y: q.y, z: q.z * 1.5 }));
    const k1 = rundAusSeite(seite, { dreiecke: 12000, raumlinien: linien });
    // die Front-Linie liegt in der Mitte (x ≈ 0): dort breiter; an den Enden der Top-Linie bleibt die Breite
    let mitte = 0;
    let ende = 0;
    for (let i = 0; i < k1.positionen.length; i += 3) {
      const x = k1.positionen[i]!;
      const z = Math.abs(k1.positionen[i + 2]!);
      if (Math.abs(x) < 20) mitte = Math.max(mitte, z);
      if (Math.abs(x - 220) < 10) ende = Math.max(ende, z);
    }
    let ende0 = 0;
    for (let i = 0; i < k0.positionen.length; i += 3) if (Math.abs(k0.positionen[i]! - 220) < 10) ende0 = Math.max(ende0, Math.abs(k0.positionen[i + 2]!));
    expect(mitte).toBeGreaterThan(100);
    expect(Math.abs(ende - ende0)).toBeLessThan(8);
  });
});
