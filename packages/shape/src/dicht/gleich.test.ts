import { describe, expect, it } from 'vitest';
import { Umrissfeld } from './abstand';
import { type AnsichtName, formAusAnsichten } from './gleich';
import { PRUEFFAELLE } from './prueffaelle';

const ACHSEN: Record<AnsichtName, [number, number]> = { seite: [0, 1], front: [2, 1], top: [0, 2] };

/** Wie weit ragt das Netz in einer Ansicht über die Zeichnung hinaus, und wie weit bleibt es von ihr weg? */
function umrissFehler(n: ReturnType<typeof formAusAnsichten>, v: AnsichtName): { raus: number; fehlt: number } {
  const [ua, va] = ACHSEN[v];
  const felder = n.umrisse[v].map((P) => new Umrissfeld(P, 2 * n.zelle));
  const nv = n.positionen.length / 3;
  let raus = 0;
  const raster = new Map<string, number[]>();
  const e = n.zelle;
  for (let i = 0; i < nv; i++) {
    const u = n.positionen[3 * i + ua]!;
    const w = n.positionen[3 * i + va]!;
    let d = -Infinity;
    for (const f of felder) d = Math.max(d, f.naechster(u, w).d);
    raus = Math.max(raus, -d);
    const k = `${Math.floor(u / e)},${Math.floor(w / e)}`;
    const l = raster.get(k);
    if (l) l.push(u, w);
    else raster.set(k, [u, w]);
  }
  let fehlt = 0;
  for (const P of n.umrisse[v]) {
    for (const q of P) {
      // nur der äußere Umriss (innere Konturen liegen innerhalb einer anderen Fläche)
      let innen = -Infinity;
      for (const f of felder) innen = Math.max(innen, f.naechster(q.x, q.y).d);
      if (innen > 0.5 * e) continue;
      let best = Infinity;
      const ci = Math.floor(q.x / e);
      const cj = Math.floor(q.y / e);
      for (let dj = -6; dj <= 6; dj++) {
        for (let di = -6; di <= 6; di++) {
          const l = raster.get(`${ci + di},${cj + dj}`) ?? [];
          for (let s = 0; s < l.length; s += 2) best = Math.min(best, Math.hypot(l[s]! - q.x, l[s + 1]! - q.y));
        }
      }
      fehlt = Math.max(fehlt, best);
    }
  }
  return { raus, fehlt };
}

describe('alle Ansichten gleichwertig', () => {
  it('drei Kreise geben eine Kugel', () => {
    const n = formAusAnsichten(PRUEFFAELLE.kugel, { dreiecke: 12000 });
    let fehler = 0;
    for (let i = 0; i < n.positionen.length / 3; i++) {
      const r = Math.hypot(n.positionen[3 * i]!, n.positionen[3 * i + 1]!, n.positionen[3 * i + 2]!);
      fehler = Math.max(fehler, Math.abs(r - 150));
    }
    expect(fehler).toBeLessThan(0.02 * 150);
  });

  it('jede Ansicht zeigt ihre Zeichnung (Kugel, Beine, Flossen, Lappen, innere Kontur)', () => {
    for (const fall of ['kugel', 'beine', 'flossen', 'lappen', 'innen'] as const) {
      const n = formAusAnsichten(PRUEFFAELLE[fall], { dreiecke: 12000 });
      for (const v of ['seite', 'front', 'top'] as const) {
        const { raus, fehlt } = umrissFehler(n, v);
        // spitze gezeichnete Ecken (Füße) rundet das Raster um gut eine Zelle
        expect(raus, `${fall} ${v} raus`).toBeLessThan(1.2 * n.zelle);
        expect(fehlt, `${fall} ${v} fehlt`).toBeLessThan(3 * n.zelle);
      }
    }
  });

  it('Seite und Front mit je zwei Beinen geben vier runde Beine, ohne Teile', () => {
    const n = formAusAnsichten(PRUEFFAELLE.beine, { dreiecke: 20000 });
    // Schnitt bei y = −60: Punkte nur in den vier Beinsäulen, jedes Bein rund (Radius 25 um seine Mitte)
    const beine = new Map<string, number[]>();
    for (let i = 0; i < n.positionen.length / 3; i++) {
      const x = n.positionen[3 * i]!;
      const y = n.positionen[3 * i + 1]!;
      const z = n.positionen[3 * i + 2]!;
      if (Math.abs(y + 60) > 0.5 * n.zelle) continue;
      expect(Math.abs(x), 'kein Punkt zwischen den Beinen (x)').toBeGreaterThan(55);
      expect(Math.abs(z), 'kein Punkt zwischen den Beinen (z)').toBeGreaterThan(30);
      const k = `${Math.sign(x)},${Math.sign(z)}`;
      const l = beine.get(k) ?? [];
      l.push(Math.hypot(Math.abs(x) - 85, Math.abs(z) - 60));
      beine.set(k, l);
    }
    expect(beine.size).toBe(4);
    for (const l of beine.values()) for (const r of l) expect(Math.abs(r - 25)).toBeLessThan(0.15 * 25);
  });

  it('nur die Seite gezeichnet: runde Querschnitte wie bisher', () => {
    const n = formAusAnsichten({ seite: PRUEFFAELLE.lappen.seite }, { dreiecke: 12000 });
    // Oval 80 hoch: an der breitesten Stelle so tief wie hoch
    let zMax = 0;
    for (let i = 0; i < n.positionen.length / 3; i++) zMax = Math.max(zMax, n.positionen[3 * i + 2]!);
    expect(Math.abs(zMax - 80)).toBeLessThan(0.05 * 80);
    expect(n.ellipsoide.front + n.ellipsoide.top).toBe(0);
  });

  it('innere Kontur: das obenauf gezeichnete Bein liegt vorn, sein Spiegelbild dahinter', () => {
    const n = formAusAnsichten(PRUEFFAELLE.innen, { dreiecke: 12000 });
    const L = n.liste;
    // Ellipsoide der Seite im Oberschenkel (über dem Rumpf), vor der Mittelebene, und ihre Spiegelbilder
    let vorn = 0;
    let hinten = 0;
    for (let o = 0; o < L.length; o += 6) {
      const [x, y, z] = [L[o]!, L[o + 1]!, L[o + 2]!];
      if (x < 40 || x > 100 || y < 40 || y > 100 || L[o + 3] !== L[o + 4]) continue;
      if (z > 60) vorn++;
      if (z < -60) hinten++;
    }
    expect(vorn).toBeGreaterThan(5);
    expect(hinten).toBe(vorn);
  });
});
