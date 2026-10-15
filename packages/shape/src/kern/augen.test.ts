// Phase 2 M5 (Plan 5.4): Augen im Kern — Lage über Ring/Winkel (wie bisher, ein Paar), über einen Punkt der Ruhelage
// (gleitet auf die Haut, Normale aus den Flächen), ein Auge auf der Mittelnaht (PezenPez), Art und Form durchgereicht,
// Hebung mit Beinen.
import { describe, expect, it } from 'vitest';
import { type Dokument, neuesDokument } from '../dokument';
import { type Bauplan, wesenBauen } from './wesen';

type V3 = [number, number, number];
const plan = (augen: Bauplan['augen'], extra: Partial<Bauplan> = {}): Bauplan => ({ maul: 'aus', oeffnung: 0, beine: 'aus', schwung: 0, stil: 'fest', earle: true, kaefigLinien: false, ...(augen ? { augen } : {}), ...extra });
/** kleinster Abstand eines Punkts zu den Ecken eines Netzes (3 Floats je Ecke) */
function naechste(p: V3, pos: Float32Array): number {
  let best = Infinity;
  for (let i = 0; i < pos.length; i += 3) best = Math.min(best, Math.hypot(pos[i]! - p[0], pos[i + 1]! - p[1], pos[i + 2]! - p[2]));
  return best;
}

describe('Augen im Kern', () => {
  const kugel: Dokument = neuesDokument('kugel');

  it('Ring/Winkel wie bisher: ein Paar, links das Spiegelbild, Standard gemalt/Schlitz', () => {
    const w = wesenBauen(kugel, plan({ ring: 2, j: 2, groesse: 0.11 }), null);
    const [r, l] = w.netz.augen;
    expect(w.netz.augen.length).toBe(2);
    expect(r!.seite).toBe(1);
    expect(l!.seite).toBe(-1);
    expect(l!.pos).toEqual([r!.pos[0], r!.pos[1], -r!.pos[2]]);
    expect(l!.normale[2]).toBeCloseTo(-r!.normale[2], 12);
    expect(r!.art).toBe('gemalt');
    expect(r!.form).toBe('schlitz');
    expect(r!.breite).toBe(1);
    expect(r!.drehung).toBe(0);
  });

  it('Punkt der Ruhelage: das Auge gleitet auf die Haut (auf einem Netzpunkt), die Normale zeigt nach außen; Form, Breite, Drehung kommen mit', () => {
    // vor der Kugel, etwas daneben und außerhalb: das Auge muss auf der Fläche landen
    const w0 = wesenBauen(kugel, plan(undefined), null);
    const pos0 = w0.netz.positionen;
    let xMin = Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let i = 0; i < pos0.length; i += 3) {
      xMin = Math.min(xMin, pos0[i]!);
      yMin = Math.min(yMin, pos0[i + 1]!);
      yMax = Math.max(yMax, pos0[i + 1]!);
    }
    const yM = (yMin + yMax) / 2;
    const w = wesenBauen(kugel, plan({ ring: 0, j: 0, groesse: 0.15, punkt: [xMin - 0.05, yM + 0.02, 0.06], form: 'knopf', breite: 1.4, drehung: 20, art: 'gemalt' }), null);
    const [r, l] = w.netz.augen;
    expect(w.netz.augen.length).toBe(2);
    expect(naechste(r!.pos, w.netz.positionen)).toBeLessThan(1e-6);
    // außen: die Normale zeigt von der Kugelmitte weg (Kugel: fast radial)
    const mitte: V3 = [0, yM, 0];
    let mx = 0;
    for (let i = 0; i < pos0.length; i += 3) mx += pos0[i]!;
    mitte[0] = mx / (pos0.length / 3);
    const radial = [r!.pos[0] - mitte[0], r!.pos[1] - mitte[1], r!.pos[2] - mitte[2]];
    const lr = Math.hypot(...radial);
    expect((radial[0]! * r!.normale[0] + radial[1]! * r!.normale[1] + radial[2]! * r!.normale[2]) / lr).toBeGreaterThan(0.9);
    expect(r!.normale[0]).toBeLessThan(-0.5);
    expect(r!.form).toBe('knopf');
    expect(r!.breite).toBe(1.4);
    expect(r!.drehung).toBe(20);
    expect(l!.pos[2]).toBeCloseTo(-r!.pos[2], 12);
  });

  it('Mitte (PezenPez): ein Auge genau auf der Naht, Normale ohne z, nach vorn', () => {
    const w0 = wesenBauen(kugel, plan(undefined), null);
    let xMin = Infinity;
    for (let i = 0; i < w0.netz.positionen.length; i += 3) xMin = Math.min(xMin, w0.netz.positionen[i]!);
    const w = wesenBauen(kugel, plan({ ring: 0, j: 0, groesse: 0.2, punkt: [xMin, 0.25, 0.04], mitte: true, form: 'schlitz' }), null);
    expect(w.netz.augen.length).toBe(1);
    const a = w.netz.augen[0]!;
    expect(a.seite).toBe(0);
    expect(a.pos[2]).toBe(0);
    expect(a.normale[2]).toBe(0);
    expect(a.normale[0]).toBeLessThan(-0.8);
    expect(naechste(a.pos, w.netz.positionen)).toBeLessThan(1e-6);
  });

  it('mit Beinen: das Auge liegt auf der gehobenen Ruhelage (wie Haut und Gesicht)', () => {
    const w = wesenBauen(kugel, plan({ ring: 3, j: 3, groesse: 0.11 }, { beine: 'verschmolzen' }), null);
    const ruhe = w.netz.ruhe!;
    expect(ruhe).not.toBeNull();
    expect(naechste(w.netz.augen[0]!.pos, ruhe)).toBeLessThan(1e-6);
  }, 60_000);
});
