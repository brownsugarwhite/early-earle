// Freie Form (18.11.2026, `frei.ts`): Spiegel anwenden, einseitig ziehen, verdichten. Die Zahlen und Bilder dazu rechnet
// `apps/editor/scripts/pruefen/form-frei.ts`.
import { beforeAll, describe, expect, it } from 'vitest';
import { spiegelAnwenden } from './frei';
import { type Haut, type V3, hautFrei } from './kurven';
import { dreiLoops, falten } from './kurvenFaelle';
import { type Loop, LoopZug, festlegen, griffeAnlegen, hatPfad, mittlereKante, pfadLagen } from './loops';
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
