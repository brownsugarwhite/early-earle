// Freie Form (18.11.2026, `frei.ts`): Spiegel anwenden, einseitig ziehen, verdichten. Die Zahlen und Bilder dazu rechnet
// `apps/editor/scripts/pruefen/form-frei.ts`.
import { beforeAll, describe, expect, it } from 'vitest';
import { spiegelAnwenden } from './frei';
import { type Haut, type V3, hautFrei } from './kurven';
import { dreiLoops, falten } from './kurvenFaelle';
import { abzweigen, loopEinsetzen } from './einsetzen';
import { type Loop, LoopZug, festlegen, formAusZeichnung, griffeAnlegen, hatPfad, kreuzungenZwischen, loopAusVorhang, mittlereKante, pfadLagen, punktEinfuegen } from './loops';
import { mitteFestmachen } from './mitteSchnitt';
import { verdichten } from './verdichten';

const pfade = (loops: readonly Loop[]): Float64Array[] => loops.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));
function rechnen(h: Haut, loops: Loop[], lagen: readonly Float64Array[], schritte: number, ende: number): void {
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
  const versch = loops.map((l, i) => Float64Array.from(lagen[i]!, (x, k) => x - l.ruhe[k]!));
  for (let s = 1; s <= schritte; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / schritte)), 2);
  z.schritt(versch, ende);
  for (const l of loops) festlegen(h, l, !hatPfad(l));
}
const weg = (a: Float64Array, b: Float64Array, nur: (v: number) => boolean): number => {
  let m = 0;
  for (let v = 0; v < a.length / 3; v++) if (nur(v)) m = Math.max(m, Math.hypot(a[3 * v]! - b[3 * v]!, a[3 * v + 1]! - b[3 * v + 1]!, a[3 * v + 2]! - b[3 * v + 2]!));
  return m;
};

describe('freie Form (Spiegel angewendet)', () => {
  let h: Haut;
  let loops: Loop[];
  let mk: number;

  beforeAll(() => {
    const d = dreiLoops();
    for (const l of d.loops) griffeAnlegen(l, l.ruhe, true);
    rechnen(d.h, d.loops, pfade(d.loops), 4, 12);
    const f = spiegelAnwenden(d.h, d.loops, { naechsteId: 10, naechsteKreuzung: 100 });
    if ('fehler' in f) throw new Error(f.fehler);
    h = f.haut;
    loops = f.loops;
    mk = mittlereKante(h);
  }, 120_000);

  it('kein Punkt hat ein Spiegelbild, jede Linie ist ein geschlossener Loop auf ihrem Pfad', () => {
    expect(hautFrei(h)).toBe(true);
    expect(loops.map((l) => l.art)).toEqual(['paar', 'paar', 'paar']);
    // Mitte 4 Punkte; jeder Ring 3 Punkte (zwei Enden, eine Kreuzung an der Seite) wird 4 (die Kreuzung auch auf der Spiegelseite)
    expect(loops.map((l) => l.punkte.length)).toEqual([4, 4, 4]);
    for (const l of loops) {
      const P = pfadLagen(l)!;
      let neben = 0;
      for (let j = 0; j < l.proben.length; j++) neben = Math.max(neben, Math.hypot(P[3 * j]! - l.ruhe[3 * j]!, P[3 * j + 1]! - l.ruhe[3 * j + 1]!, P[3 * j + 2]! - l.ruhe[3 * j + 2]!));
      expect(neben).toBeLessThan(0.5);
    }
  });

  it('die Kreuzung an der Seite hat auf der Spiegelseite eine eigene Kennung', () => {
    const seiten = loops.flatMap((l) => l.punkte.filter((p) => Math.abs(p.ref.z) > 100).map((p) => ({ z: Math.sign(p.ref.z), k: p.kreuzung })));
    const vorn = new Set(seiten.filter((x) => x.z > 0).map((x) => x.k));
    const hinten = new Set(seiten.filter((x) => x.z < 0).map((x) => x.k));
    expect(vorn.size).toBe(1);
    expect(hinten.size).toBe(1);
    expect([...vorn][0]).not.toBe([...hinten][0]);
  });

  it('einseitig gezogen: Die Haut folgt, die andere Seite bleibt, nichts schlägt um; das Netz räumt danach auf', () => {
    let wahl: V3 | null = null;
    for (const l of loops) for (const p of l.punkte) if (p.ref.z > 40 && (!wahl || p.ref.z > wahl.z)) wahl = p.ref;
    const w = wahl!;
    const gezogen = loops.map((l) => l.punkte.map((p): V3 => (Math.hypot(p.ref.x - w.x, p.ref.y - w.y, p.ref.z - w.z) < 1e-6 ? { ...p.ref, z: p.ref.z + 150 } : p.ref)));
    const lagen = loops.map((l, i) => pfadLagen(l, gezogen[i]) ?? Float64Array.from(l.ruhe));
    loops.forEach((l, i) =>
      l.punkte.forEach((p, j) => {
        p.cur = { ...gezogen[i]![j]! };
      }),
    );
    const vor = Float64Array.from(h.pos);
    rechnen(h, loops, lagen, 30, 40);
    // gemessen: 150,0 auf der gezogenen Seite, 3,1 weit auf der anderen
    expect(weg(h.pos, vor, (v) => vor[3 * v + 2]! > 20)).toBeGreaterThan(140);
    expect(weg(h.pos, vor, (v) => vor[3 * v + 2]! < -60)).toBeLessThan(15);
    expect(falten(h).umgeklappt).toBe(0);
    const v = verdichten(h, loops, 1.75 * mk, { kurz: 0.5 * mk, genau: mk / 40, genauHaut: true, genauFlaeche: mk / 16 })!;
    expect(v).not.toBeNull();
    // gemessen: 1 201 neue Punkte, 261 zusammengelegt
    expect(v.neu).toBeGreaterThan(300);
    expect(hautFrei(v.haut)).toBe(true);
    expect(v.loops.every((l, i) => l.art === 'paar' && l.punkte.length === loops[i]!.punkte.length)).toBe(true);
    rechnen(v.haut, v.loops, pfade(v.loops), 1, 30);
    expect(falten(v.haut).umgeklappt).toBe(0);
  }, 120_000);
});

// Clipping an einem freien Objekt (18.11.): Die freie Haut wird an der Spiegelebene geschnitten und mit ihrem Spiegelbild verbunden
// (`mitteFestmachen` nimmt dafür die ganze Haut als „die Hälfte“).
describe('freie Form, an der Spiegelebene verschmolzen (Clipping)', () => {
  const geschlossen = (h: Haut): boolean => {
    const zahl = new Map<number, number>();
    for (let t = 0; t < h.tri.length; t += 3)
      for (let e = 0; e < 3; e++) {
        const a = h.tri[t + e]!;
        const b = h.tri[t + ((e + 1) % 3)]!;
        const k = Math.min(a, b) * h.n + Math.max(a, b);
        zahl.set(k, (zahl.get(k) ?? 0) + 1);
      }
    for (const z of zahl.values()) if (z !== 2) return false;
    return true;
  };
  const kugel = (): { h: Haut; loops: Loop[] } => {
    const d = dreiLoops();
    for (const l of d.loops) griffeAnlegen(l, l.ruhe, true);
    rechnen(d.h, d.loops, pfade(d.loops), 4, 12);
    return d;
  };

  it('hin und zurück: Spiegel anwenden und gleich wieder verschmelzen gibt die Form von vorher', () => {
    const d = kugel();
    const f = spiegelAnwenden(d.h, d.loops, { naechsteId: 10, naechsteKreuzung: 100 });
    if ('fehler' in f) throw new Error(f.fehler);
    const r = mitteFestmachen(f.haut, f.loops, { naechsteId: f.naechsteId, naechsteKreuzung: f.naechsteKreuzung });
    if ('fehler' in r) throw new Error(r.fehler);
    expect(r.haut.n).toBe(d.h.n);
    expect(hautFrei(r.haut)).toBe(false);
    expect(r.haut.spiegel.every((x) => x >= 0)).toBe(true);
    expect(geschlossen(r.haut)).toBe(true);
    // dieselben Linien wie vorher: die Mitte (sie ist die Naht), zwei Ringe; nichts Neues
    expect(r.loops.map((l) => l.art).sort()).toEqual(['mitte', 'ring', 'ring']);
    expect(r.loops.map((l) => l.punkte.length).sort()).toEqual(d.loops.map((l) => l.punkte.length).sort());
    const mitte = r.loops.find((l) => l.art === 'mitte')!;
    expect(r.rand).toEqual([mitte.id]);
    // jede Lage der neuen Haut ist eine Lage der alten (kein Punkt hat sich bewegt)
    const alt = new Set<string>();
    for (let v = 0; v < d.h.n; v++) alt.add([0, 1, 2].map((k) => d.h.pos[3 * v + k]!.toFixed(6)).join());
    let fremd = 0;
    for (let v = 0; v < r.haut.n; v++) if (!alt.has([0, 1, 2].map((k) => r.haut.pos[3 * v + k]!.toFixed(6)).join())) fremd++;
    expect(fremd).toBe(0);
    // die Enden der Ringe teilen ihre Kreuzung mit der Mitte
    for (const l of r.loops.filter((x) => x.art === 'ring')) {
      for (const p of [l.punkte[0]!, l.punkte[l.punkte.length - 1]!]) {
        expect(Math.abs(p.ref.z)).toBeLessThan(1e-9);
        expect(mitte.punkte.some((q) => q.kreuzung !== undefined && q.kreuzung === p.kreuzung)).toBe(true);
      }
    }
    // und die Rechnung hält sie, wo sie ist
    const vor = Float64Array.from(r.haut.pos);
    rechnen(r.haut, r.loops, pfade(r.loops), 1, 20);
    expect(weg(r.haut.pos, vor, () => true)).toBeLessThan(0.5);
  }, 120_000);

  for (const seite of [1, -1] as const)
    it(`zur Seite geschoben (${seite > 0 ? 'vor' : 'hinter'} die Ebene) und verschmolzen: zwei Kugeln mit einer Naht in der Ebene`, () => {
      const d = kugel();
      const f = spiegelAnwenden(d.h, d.loops, { naechsteId: 10, naechsteKreuzung: 100, dz: seite * 80 });
      if ('fehler' in f) throw new Error(f.fehler);
      const r = mitteFestmachen(f.haut, f.loops, { naechsteId: f.naechsteId, naechsteKreuzung: f.naechsteKreuzung, seite });
      if ('fehler' in r) throw new Error(r.fehler);
      expect(hautFrei(r.haut)).toBe(false);
      expect(r.haut.spiegel.every((x) => x >= 0)).toBe(true);
      expect(geschlossen(r.haut)).toBe(true);
      // die Form reicht jetzt von −230 bis 230 quer zur Ebene (Kugel 150, um 80 geschoben), spiegelgleich
      let zMax = 0;
      for (let v = 0; v < r.haut.n; v++) zMax = Math.max(zMax, Math.abs(r.haut.pos[3 * v + 2]!));
      expect(zMax).toBeGreaterThan(225);
      expect(zMax).toBeLessThan(235);
      // die Naht: ein neuer Loop der Mitte mit Kante, ein Kreis mit Halbmesser √(150² − 80²) ≈ 127
      expect(r.rand).toHaveLength(1);
      const naht = r.loops.find((l) => l.id === r.rand[0])!;
      expect(naht.art).toBe('mitte');
      expect(naht.kante).toBe(true);
      for (let j = 0; j < naht.ruhe.length / 3; j++) {
        expect(Math.abs(naht.ruhe[3 * j + 2]!)).toBeLessThan(1e-9);
        expect(Math.abs(Math.hypot(naht.ruhe[3 * j]!, naht.ruhe[3 * j + 1]!) - Math.sqrt(150 * 150 - 80 * 80))).toBeLessThan(6);
      }
      // die frühere Linie der Mitte liegt jetzt neben der Ebene und bleibt ein geschlossener Loop (mit Zwilling); die zwei Ringe
      // sind an der Naht geschnitten (Enden auf der Ebene, dort Punkte der Naht)
      expect(r.loops.filter((l) => l.art === 'paar')).toHaveLength(1);
      const ringe = r.loops.filter((l) => l.art === 'ring');
      expect(ringe).toHaveLength(2);
      for (const l of ringe)
        for (const p of [l.punkte[0]!, l.punkte[l.punkte.length - 1]!]) {
          expect(Math.abs(p.ref.z)).toBeLessThan(1e-9);
          expect(naht.punkte.some((q) => q.kreuzung === p.kreuzung)).toBe(true);
        }
      expect(naht.punkte).toHaveLength(4);
      // die Rechnung kommt an ihr zur Ruhe, nichts schlägt um
      rechnen(r.haut, r.loops, pfade(r.loops), 1, 40);
      expect(falten(r.haut).umgeklappt).toBe(0);
      for (let v = 0; v < r.haut.n; v++) expect(Number.isFinite(r.haut.pos[3 * v]!)).toBe(true);
    }, 120_000);
});

describe('Linien an einer freien Form (18.11.)', () => {
  let h0: Haut;
  let loops0: Loop[];
  const istPunkt = (l: Loop): boolean => l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2]);
  const strich = (von: [number, number], nach: [number, number], n = 40): [number, number][] =>
    Array.from({ length: n + 1 }, (_, i): [number, number] => [von[0] + ((nach[0] - von[0]) * i) / n, von[1] + ((nach[1] - von[1]) * i) / n]);
  const zBereich = (l: Loop): [number, number] => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = 0; j < l.ruhe.length / 3; j++) {
      lo = Math.min(lo, l.ruhe[3 * j + 2]!);
      hi = Math.max(hi, l.ruhe[3 * j + 2]!);
    }
    return [lo, hi];
  };

  beforeAll(() => {
    const d = dreiLoops();
    for (const l of d.loops) griffeAnlegen(l, l.ruhe, true);
    rechnen(d.h, d.loops, pfade(d.loops), 4, 12);
    const f = spiegelAnwenden(d.h, d.loops, { naechsteId: 10, naechsteKreuzung: 100 });
    if ('fehler' in f) throw new Error(f.fehler);
    h0 = f.haut;
    loops0 = f.loops;
  }, 120_000);

  it('Strich in der Front neben der Mitte: der Loop rundum liegt nur auf der gezeichneten Seite und sitzt im Netz', () => {
    // Front: Blatt (z, y). Ein senkrechter Strich bei z = 70: der Kreis in der Ebene z = 70, Halbmesser √(150² − 70²) ≈ 132,7
    const l = loopAusVorhang(h0, 'front', strich([70, 220], [70, -220]), 20, 4)!;
    expect(l).not.toBeNull();
    expect(l.art).toBe('paar');
    const [lo, hi] = zBereich(l);
    expect(lo).toBeGreaterThan(69);
    expect(hi).toBeLessThan(71);
    const r = loopEinsetzen(h0, [...loops0, l], loops0.length)!;
    expect(r).not.toBeNull();
    expect(hautFrei(r.haut)).toBe(true);
    const neu = r.loops[loops0.length]!;
    expect(istPunkt(neu)).toBe(true);
    for (let j = 0; j < neu.ruhe.length / 3; j++) expect(Math.abs(Math.hypot(neu.ruhe[3 * j]!, neu.ruhe[3 * j + 1]!) - Math.sqrt(150 * 150 - 70 * 70))).toBeLessThan(4);
    // auf der anderen Seite ist nichts entstanden: Dort hat das Netz so viele Punkte wie vorher
    const hinter = (x: Haut): number => {
      let n = 0;
      for (let v = 0; v < x.n; v++) if (x.pos[3 * v + 2]! < -20) n++;
      return n;
    };
    expect(hinter(r.haut)).toBe(hinter(h0));
    expect(r.haut.n).toBeGreaterThan(h0.n);
    // er kreuzt den Ring in der Ebene y = 0 und den in der Ebene x = 10 je zweimal, die Linie der Ebene z = 0 nicht
    const tol = 0.25 * mittlereKante(r.haut);
    const zahl = (i: number): number => kreuzungenZwischen(r.loops[i]!, r.loops[i]!.ruhe, neu, neu.ruhe, tol).length;
    expect([zahl(0), zahl(1), zahl(2)]).toEqual([2, 0, 2]);
    expect(falten(r.haut).umgeklappt).toBe(0);
  });

  it('Strich in der Seite: der Loop läuft rundum über beide Seiten, ein Loop für sich', () => {
    // Seite: Blatt (x, y). Ein senkrechter Strich bei x = −60: der Kreis in der Ebene x = −60
    const l = loopAusVorhang(h0, 'seite', strich([-60, 220], [-60, -220]), 21, 4)!;
    expect(l).not.toBeNull();
    expect(l.art).toBe('paar');
    const [lo, hi] = zBereich(l);
    expect(lo).toBeLessThan(-130);
    expect(hi).toBeGreaterThan(130);
    const r = loopEinsetzen(h0, [...loops0, l], loops0.length)!;
    expect(r).not.toBeNull();
    expect(hautFrei(r.haut)).toBe(true);
    const neu = r.loops[loops0.length]!;
    expect(istPunkt(neu)).toBe(true);
    for (let j = 0; j < neu.ruhe.length / 3; j++) expect(Math.abs(neu.ruhe[3 * j]! + 60)).toBeLessThan(2);
    expect(falten(r.haut).umgeklappt).toBe(0);
  });

  it('eine Form auf der Haut liegt auf der Seite, von der sie gezeichnet ist', () => {
    // Seite: ein Kreis um (60, 60), Halbmesser 35; von vorn gesehen liegt er auf z > 0, von der Gegenseite auf z < 0
    const kreis: [number, number][] = Array.from({ length: 48 }, (_, i): [number, number] => [60 + 35 * Math.cos((i * Math.PI) / 24), 60 + 35 * Math.sin((i * Math.PI) / 24)]);
    const vorn = formAusZeichnung(h0, 'seite', kreis, [0, 12, 24, 36], 22)!;
    const hinten = formAusZeichnung(h0, 'seite', kreis, [0, 12, 24, 36], 22, true)!;
    expect(vorn.art).toBe('paar');
    expect(hinten.art).toBe('paar');
    expect(zBereich(vorn)[0]).toBeGreaterThan(60);
    expect(zBereich(hinten)[1]).toBeLessThan(-60);
    expect(vorn.punkte).toHaveLength(4);
    for (const l of [vorn, hinten]) {
      const r = loopEinsetzen(h0, [...loops0, l], loops0.length)!;
      expect(r).not.toBeNull();
      expect(hautFrei(r.haut)).toBe(true);
      expect(istPunkt(r.loops[loops0.length]!)).toBe(true);
    }
    // über den Umriss hinaus gezeichnet (ein Kreis um den Rand der Kugel): keine Form
    const rand: [number, number][] = kreis.map(([u, v]): [number, number] => [u + 90, v]);
    expect(formAusZeichnung(h0, 'seite', rand, [0, 12, 24, 36], 23)).toBeNull();
  });

  it('eine Abzweigung verbindet zwei Punkte auf der Seite z < 0, ohne Gegenstück auf der anderen', () => {
    // je ein neuer Punkt auf dem Ring in der Ebene y = 0 und auf dem in der Ebene x = 10, beide bei z < 0
    const loops = loops0.map((l) => ({ ...l, punkte: l.punkte.map((q) => ({ ...q })) }));
    const stelle = (l: Loop, ziel: V3): number => {
      let best = 0;
      let d = Infinity;
      for (let j = 0; j < l.ruhe.length / 3; j++) {
        const e = Math.hypot(l.ruhe[3 * j]! - ziel.x, l.ruhe[3 * j + 1]! - ziel.y, l.ruhe[3 * j + 2]! - ziel.z);
        if (e < d) {
          d = e;
          best = l.s[j]!;
        }
      }
      return best;
    };
    const w = 150 / Math.SQRT2;
    const pa = punktEinfuegen(loops[0]!, stelle(loops[0]!, { x: w, y: 0, z: -w }), undefined, true);
    const pb = punktEinfuegen(loops[2]!, stelle(loops[2]!, { x: 10, y: w, z: -w }), undefined, true);
    const r = abzweigen(h0, loops, { loop: 0, punkt: loops[0]!.punkte.indexOf(pa) }, { loop: 2, punkt: loops[2]!.punkte.indexOf(pb) }, 24, 200);
    if ('fehler' in r) throw new Error(r.fehler);
    expect(hautFrei(r.haut)).toBe(true);
    const neu = r.loops[r.loops.length - 1]!;
    expect(neu.art).toBe('ring');
    expect(neu.haengt).toEqual([true, true]);
    expect(istPunkt(neu)).toBe(true);
    expect(zBereich(neu)[1]).toBeLessThan(-60);
    // zum Spiegelbild führt an einer freien Form keine Linie
    const s = abzweigen(h0, loops, { loop: 0, punkt: loops[0]!.punkte.indexOf(pa) }, 'spiegel', 25, 300);
    expect('fehler' in s).toBe(true);
  });
});
