// Backen fürs Spiel (Etappe 9, Scheibe 1): die Rechnung des Spielnetzes.
import { describe, expect, it } from 'vitest';
import { type GezeigteLage, type LippenStelle, abstaendeZumNetz, lippenGleichTeilen, normalenAngleichen, spielLage, spielformAus } from './spielform';

/** eine Lage, wie der Editor sie zeigt: die Ruhe je Punkt um das Scharnier gedreht um seinen Winkel (wie `knochenDrehen`) */
function gezeigt(name: string, ruhe: number[], normalen: number[], winkel: number[], scharnierPunkt: number): GezeigteLage {
  const cx = ruhe[3 * scharnierPunkt]!;
  const cy = ruhe[3 * scharnierPunkt + 1]!;
  const pos: number[] = [];
  const nor: number[] = [];
  for (let v = 0; v < winkel.length; v++) {
    const c = Math.cos(winkel[v]!);
    const s = Math.sin(winkel[v]!);
    const dx = ruhe[3 * v]! - cx;
    const dy = ruhe[3 * v + 1]! - cy;
    pos.push(cx + c * dx - s * dy, cy + s * dx + c * dy, ruhe[3 * v + 2]!);
    nor.push(c * normalen[3 * v]! - s * normalen[3 * v + 1]!, s * normalen[3 * v]! + c * normalen[3 * v + 1]!, normalen[3 * v + 2]!);
  }
  return { name, pos, nor, winkel, scharnier: { x: cx, y: cy } };
}

// vier Punkte: das Scharnier (0), ein Punkt des Unterkiefers (1), einer im Auslauf (2), einer fern (3)
const GRUND = [0, 0, 0, -100, 0, 10, -40, -5, 10, 200, 30, 0];
const NORMALEN = [0, 0, 1, 0, -1, 0, 0, -1, 0, 1, 0, 0];
const INDEX = Uint32Array.from([0, 1, 2, 0, 2, 3]);
const nah = (a: ArrayLike<number>, b: ArrayLike<number>, stellen = 3): void => {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) expect(a[i]).toBeCloseTo(b[i]!, stellen);
};

describe('das Spielnetz: Grundlage, je Pose Versatz und Drehwinkel', () => {
  it('ohne Pose und beim Anteil 0 ist es die Grundlage', () => {
    const f = spielformAus({ pos: GRUND, nor: NORMALEN }, INDEX, 4, 2, 0, []);
    nah(spielLage(f, []).pos, GRUND);
    const g = spielformAus({ pos: GRUND, nor: NORMALEN }, INDEX, 4, 2, 0, [gezeigt('Fressen', GRUND, NORMALEN, [0, 0.6, 0.3, 0], 0)]);
    nah(spielLage(g, [0]).pos, GRUND);
    nah(spielLage(g, [0]).nor, NORMALEN);
  });

  it('steht eine Pose ganz, liegt jeder Punkt dort, wo der Editor ihn zeigt, mit derselben Normale', () => {
    // die Ruhe der Pose: der Unterkiefer länger gezogen, der Mundwinkel versetzt (das Scharnier wandert mit)
    const ruhe = [5, -3, 0, -130, -8, 12, -45, -9, 10, 200, 30, 0];
    const nRuhe = [0, 0, 1, 0.6, -0.8, 0, 0, -1, 0, 1, 0, 0];
    const lage = gezeigt('Fressen', ruhe, nRuhe, [0, 0.6, 0.3, 0], 0);
    const f = spielformAus({ pos: GRUND, nor: NORMALEN }, INDEX, 4, 2, 0, [lage]);
    const l = spielLage(f, [1]);
    nah(l.pos, lage.pos);
    nah(l.nor, lage.nor, 5);
    // der ferne Punkt dreht nicht, der Kiefer um seinen ganzen Winkel um das Scharnier der Pose
    expect(l.pos[9]).toBeCloseTo(200, 3);
    expect(Math.hypot(l.pos[3]! - 5, l.pos[4]! + 3)).toBeCloseTo(Math.hypot(-135, -5), 3);
  });

  it('dazwischen: die Ruhe liegt anteilig zwischen den Lagen, gedreht wird um den anteiligen Winkel (ein Bogen, keine Sehne)', () => {
    const lage = gezeigt('Fressen', GRUND, NORMALEN, [0, 1.0, 0.5, 0], 0);
    const f = spielformAus({ pos: GRUND, nor: NORMALEN }, INDEX, 4, 2, 0, [lage]);
    const halb = spielLage(f, [0.5]);
    // der Punkt des Kiefers bleibt auf seinem Kreis um das Scharnier (eine gemischte Lage läge 12 % näher)
    expect(Math.hypot(halb.pos[3]!, halb.pos[4]!)).toBeCloseTo(100, 3);
    expect(halb.pos[3]).toBeCloseTo(100 * Math.cos(Math.PI + 0.5), 3);
    expect(halb.pos[4]).toBeCloseTo(100 * Math.sin(Math.PI + 0.5), 3);
    for (let v = 0; v < 4; v++) expect(Math.hypot(halb.nor[3 * v]!, halb.nor[3 * v + 1]!, halb.nor[3 * v + 2]!)).toBeCloseTo(1, 5);
  });

  it('zwei Posen: jede für sich genau; gemischt wandert das Scharnier anteilig', () => {
    const a = gezeigt('Fressen', GRUND, NORMALEN, [0, 0.6, 0.3, 0], 0);
    const ruheB = [20, 10, 0, -100, 0, 10, -40, -5, 10, 200, 30, 0];
    const b = gezeigt('Pose 2', ruheB, NORMALEN, [0, 0.9, 0.45, 0], 0);
    const f = spielformAus({ pos: GRUND, nor: NORMALEN }, INDEX, 4, 2, 0, [a, b]);
    nah(spielLage(f, [1, 0]).pos, a.pos);
    nah(spielLage(f, [0, 1]).pos, b.pos);
    const m = spielLage(f, [0.5, 0.5]);
    expect(m.pos[0]).toBeCloseTo(10, 3);
    expect(m.pos[1]).toBeCloseTo(5, 3);
    // dieselben Felder werden wiederverwendet
    expect(spielLage(f, [1, 0], m)).toBe(m);
    nah(m.pos, a.pos);
  });

  it('ein Zahn: in der Grundlage am Fuß (Länge null), in der Pose gewachsen und mit seinem Kiefer gedreht', () => {
    // Punkt 4 und 5: Fuß und Spitze eines Zahns am Unterkiefer; zu liegen beide am Fuß
    const grund = [...GRUND, -80, 0, 10, -80, 0, 10];
    const nor = [...NORMALEN, 0, 1, 0, 0, 1, 0];
    const ruhe = [...GRUND, -80, 0, 10, -80, 20, 10];
    const lage = gezeigt('Fressen', ruhe, nor, [0, 0.6, 0.3, 0, 0.6, 0.6], 0);
    const f = spielformAus({ pos: grund, nor }, Uint32Array.from([...INDEX, 4, 5, 4]), 4, 2, 0, [lage]);
    const zu = spielLage(f, [0]);
    expect(Math.hypot(zu.pos[15]! - zu.pos[12]!, zu.pos[16]! - zu.pos[13]!)).toBeCloseTo(0, 5);
    const halb = spielLage(f, [0.5]);
    expect(Math.hypot(halb.pos[15]! - halb.pos[12]!, halb.pos[16]! - halb.pos[13]!)).toBeCloseTo(10, 3);
    const auf = spielLage(f, [1]);
    nah(auf.pos, lage.pos);
  });
});

describe('zu ist unsichtbar: die Normalen an der geschlossenen Lippe', () => {
  it('Punkte am selben Ort bekommen dieselbe Normale, das Mittel; die anderen bleiben', () => {
    const pos = [0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0];
    const nor = Float32Array.from([0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1]);
    // (Punkt 3 liegt auch dort, gehört aber nicht zu den Lippen von außen: eine Wand der Tasche)
    const r = normalenAngleichen(pos, nor, [0, 1, 2]);
    expect(r.punkte).toBe(2);
    expect(r.grad).toBeCloseTo(45, 3);
    nah(nor.slice(0, 3), [Math.SQRT1_2, Math.SQRT1_2, 0], 5);
    nah(nor.slice(3, 6), [Math.SQRT1_2, Math.SQRT1_2, 0], 5);
    nah(nor.slice(6, 12), [0, 0, 1, 0, 0, 1], 5);
  });

  it('auch ein Hauch auseinander ist derselbe Ort (gleich, wo ein Raster seine Grenze hätte); weiter weg nicht', () => {
    const pos = [0.00049, 0, 0, 0.00051, 0, 0, 0.5, 0, 0];
    const nor = Float32Array.from([0, 1, 0, 1, 0, 0, 0, 0, 1]);
    const r = normalenAngleichen(pos, nor, [0, 1, 2]);
    expect(r.punkte).toBe(2);
    expect(r.weit).toBeCloseTo(0.00002, 6);
    nah(nor.slice(6, 9), [0, 0, 1], 5);
  });

  it('zeigen zwei Normalen genau gegeneinander, bleibt jede', () => {
    const nor = Float32Array.from([0, 1, 0, 0, -1, 0]);
    expect(normalenAngleichen([1, 1, 1, 1, 1, 1], nor, [0, 1]).punkte).toBe(0);
    nah(nor, [0, 1, 0, 0, -1, 0], 5);
  });
});

describe('wie nah ein Netz an einer Wolke von Punkten liegt', () => {
  it('über der Fläche die Höhe, neben ihr der Abstand zur Kante, an der Ecke zur Ecke', () => {
    // ein Quadrat von 0 bis 10 in der Ebene z = 0
    const pos = [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0];
    const index = [0, 1, 2, 0, 2, 3];
    const d = abstaendeZumNetz([5, 5, 3, 5, -4, 0, 13, 14, 0, 2, 7, -0.5], pos, index);
    nah(d, [3, 4, 5, 0.5], 5);
  });

  it('wie die Suche über alle Dreiecke, auch weit außerhalb des Netzes', () => {
    // ein gewelltes Gitter aus 2 × 20 × 20 Dreiecken und Punkte kreuz und quer
    let saat = 7;
    const zufall = (): number => {
      saat = (saat * 16807) % 2147483647;
      return saat / 2147483647;
    };
    const N = 20;
    const pos: number[] = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) pos.push(i * 3, j * 3, 4 * Math.sin(i * 0.5) * Math.cos(j * 0.4));
    const index: number[] = [];
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i;
        index.push(a, a + 1, a + N + 2, a, a + N + 2, a + N + 1);
      }
    const punkte: number[] = [];
    for (let q = 0; q < 200; q++) punkte.push(-30 + 120 * zufall(), -30 + 120 * zufall(), -25 + 50 * zufall());
    const d = abstaendeZumNetz(punkte, pos, index);
    const einzeln = (q: number): number => {
      let best = Infinity;
      for (let t = 0; t < index.length; t += 3) best = Math.min(best, abstaendeZumNetz(punkte.slice(3 * q, 3 * q + 3), pos, index.slice(t, t + 3))[0]!);
      return best;
    };
    for (let q = 0; q < 200; q += 7) expect(d[q]).toBeCloseTo(einzeln(q), 4);
  });
});

describe('die zwei Lippen gleich teilen', () => {
  // Punkte 0 … 9 stehen auf der einen Lippe an der Stelle Nummer / 10, Punkte 10 … 19 auf der anderen ((Nummer − 10) / 10);
  // Punkt 100 ist der Mundwinkel (Stelle 0, auf beiden); 50 und 51 sind Haut darüber und darunter; 200 und mehr sind neu
  const wo = (extra: Map<number, LippenStelle>) => (d: number): LippenStelle | null => {
    if (d === 100) return { welche: 2, s: 0 };
    if (d < 10) return { welche: 0, s: d / 10 };
    if (d < 20) return { welche: 1, s: (d - 10) / 10 };
    return extra.get(d) ?? null;
  };
  const anlegen = (extra: Map<number, LippenStelle>) => (welche: 0 | 1, s: number): number => {
    const d = 200 + extra.size;
    extra.set(d, { welche, s });
    return d;
  };

  it('steht eine Stelle nur auf einer Lippe, wird die Kante der anderen dort geteilt (im selben Umlaufsinn)', () => {
    // die eine Lippe: Mundwinkel, 0,4, 1,0 (Punkte 100, 4, 9 … hier 9 = 0,9; das Ende ist 0,9); die andere: Mundwinkel und 0,9
    const extra = new Map<number, LippenStelle>();
    const r = lippenGleichTeilen([100, 4, 50, 4, 9, 50, 19, 100, 51], wo(extra), anlegen(extra), 0.01);
    expect(r.eingesetzt).toBe(1);
    expect(Array.from(r.index)).toEqual([100, 4, 50, 4, 9, 50, 19, 200, 51, 200, 100, 51]);
    expect(extra.get(200)).toEqual({ welche: 1, s: 0.4 });
    // an zwei Stellen stehen jetzt beide Lippen: bei 0,4 und am Ende
    expect(r.paare).toEqual([
      { a: [4], b: [200] },
      { a: [9], b: [19] },
    ]);
  });

  it('nah beieinander ist dieselbe Stelle: ein Paar, nichts wird eingesetzt', () => {
    const extra = new Map<number, LippenStelle>([[300, { welche: 1, s: 0.405 }]]);
    const netz = [100, 4, 50, 4, 9, 50, 19, 300, 51, 300, 100, 51];
    const r = lippenGleichTeilen(netz, wo(extra), anlegen(extra), 0.01);
    expect(r.eingesetzt).toBe(0);
    expect(Array.from(r.index)).toEqual(netz);
    expect(r.paare).toEqual([
      { a: [4], b: [300] },
      { a: [9], b: [19] },
    ]);
  });

  it('beide Lippen haben eigene Stellen: Jede bekommt die der anderen; außen und in der Tasche je ein eigener Punkt', () => {
    // die eine Lippe steht bei 0,3 (Punkt 3), die andere bei 0,6 (Punkt 16); beide Enden bei 0,9. Jede Lippe hat außen ein Dreieck
    // zur Haut (50, 51) und innen eines zur Wand der Tasche (60, 61): Dort stehen ihre Punkte doppelt (Nummer + 1000)
    const extra = new Map<number, LippenStelle>();
    const wo2 = (d: number): LippenStelle | null => (d >= 1000 && d < 2000 ? wo(extra)(d - 1000) : wo(extra)(d));
    const neu2 = (welche: 0 | 1, s: number, wie: number): number => {
      const innen = wie >= 1000 && wie < 2000;
      const d = 2000 + extra.size;
      extra.set(d, { welche, s });
      void innen;
      return d;
    };
    const netz = [100, 3, 50, 3, 9, 50, 19, 16, 51, 16, 100, 51, 1100, 1003, 60, 1003, 1009, 60];
    const r = lippenGleichTeilen(netz, wo2, neu2, 0.01);
    expect(r.eingesetzt).toBe(2);
    // die andere Lippe bekommt 0,3 (zwischen Mundwinkel und 0,6); die eine bekommt 0,6 (zwischen 0,3 und 0,9), außen und innen
    const stellen = [...extra.values()].map((x) => `${x.welche}:${x.s}`).sort();
    expect(stellen).toEqual(['0:0.6', '0:0.6', '1:0.3']);
    expect(r.index.length).toBe(netz.length + 3 * 3);
    expect(r.paare.length).toBe(3);
  });

  it('fehlt einer Lippe der Punkt hinter der Stelle, wird dort nichts geteilt', () => {
    // die andere Lippe hat nur den Mundwinkel: Über 0,4 geht bei ihr keine Kante hinweg
    const extra = new Map<number, LippenStelle>();
    const netz = [100, 4, 50, 100, 51, 52];
    const r = lippenGleichTeilen(netz, wo(extra), anlegen(extra), 0.01);
    expect(r.eingesetzt).toBe(0);
    expect(Array.from(r.index)).toEqual(netz);
  });
});
