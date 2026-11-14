// Abzweigungen (14.11.2026): eine offene Linie, die an Punkten anderer Linien hängt (`abzweigen`, `Loop.haengt`).
// Florians Beispiel: ein Kreis mit vier Punkten, die gegenüberliegenden Punkte verbunden, in der Kreuzung ein gemeinsamer Punkt.
import { describe, expect, it } from 'vitest';
import { abzweigen, loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import { type Loop, endeAufMitte, formAusZeichnung, griffeAnlegen, hatPfad, hautLagen, kreuzungenZwischen, mittlereKante, pfadLagen, ringEnde } from './loops';
import { rundAusSeite } from './rund';

function kugelMitKreis(): { haut: Haut; loops: Loop[]; mk: number } {
  const netz = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: 2000 },
  );
  const h = hautAus(netz.positionen, netz.indizes);
  const N = 64;
  const uv: [number, number][] = [];
  for (let i = 0; i < N; i++) uv.push([-60 + 38 * Math.cos((2 * Math.PI * i) / N), 62 + 38 * Math.sin((2 * Math.PI * i) / N)]);
  const form = formAusZeichnung(h, 'seite', uv, [0, N / 4, N / 2, (3 * N) / 4], 1)!;
  const r = loopEinsetzen(h, [form], 0)!;
  griffeAnlegen(r.loops[0]!, r.loops[0]!.ruhe, true);
  return { haut: r.haut, loops: r.loops, mk: mittlereKante(h) };
}
const ort = (P: ArrayLike<number>, j: number): [number, number, number] => [P[3 * j]!, P[3 * j + 1]!, P[3 * j + 2]!];
const weit = (a: readonly number[], b: { x: number; y: number; z: number }): number => Math.hypot(a[0]! - b.x, a[1]! - b.y, a[2]! - b.z);

describe('Abzweigung: eine offene Linie hängt an Punkten einer anderen', () => {
  it('von Punkt zu gegenüberliegendem Punkt: eingesetzt, endet an den Punkten, teilt sie', () => {
    const { haut, loops, mk } = kugelMitKreis();
    expect(loops[0]!.punkte.length).toBe(4);
    const r = abzweigen(haut, loops, { loop: 0, punkt: 0 }, { loop: 0, punkt: 2 }, 2, 1);
    if ('fehler' in r) throw new Error(r.fehler);
    // die Eingabe bleibt unberührt
    expect(loops.length).toBe(1);
    expect(loops[0]!.punkte[0]!.kreuzung).toBeUndefined();
    const kreis = r.loops[0]!;
    const ast = r.loops[1]!;
    expect(ast.art).toBe('ring');
    expect(ast.haengt).toEqual([true, true]);
    expect(endeAufMitte(ast, 0)).toBe(false);
    expect(endeAufMitte(ast, 1)).toBe(false);
    expect(ringEnde(ast, 0)).toBeNull();
    expect(ringEnde(ast, ast.punkte.length - 1)).toBeNull();
    // jede Stelle ist ein Punkt des Netzes, die Enden liegen auf der Kette des Kreises
    expect(ast.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])).toBe(true);
    const kette = new Set(kreis.proben.map((p) => p.ecken[0]));
    expect(kette.has(ast.proben[0]!.ecken[0])).toBe(true);
    expect(kette.has(ast.proben[ast.proben.length - 1]!.ecken[0])).toBe(true);
    expect(ast.proben.slice(1, -1).every((p) => !kette.has(p.ecken[0]))).toBe(true);
    // ihre Enden liegen an den Punkten des Kreises (nicht auf der Mittelebene) und teilen sie
    const L = hautLagen(r.haut, ast);
    expect(weit(ort(L, 0), kreis.punkte[0]!.ref)).toBeLessThan(0.05 * mk);
    expect(weit(ort(L, ast.proben.length - 1), kreis.punkte[2]!.ref)).toBeLessThan(0.05 * mk);
    expect(Math.abs(L[2]!)).toBeGreaterThan(50);
    expect(kreis.punkte[0]!.kreuzung).toBe(1);
    expect(kreis.punkte[2]!.kreuzung).toBe(2);
    expect(ast.punkte.map((p) => p.kreuzung)).toEqual([1, 2]);
    expect(r.naechsteKreuzung).toBe(3);
    expect(ast.punkte[0]!.s).toBe(0);
    expect(ast.punkte[1]!.s).toBe(ast.laenge);
    // das Netz bleibt spiegelgleich, das Spiegelbild der Linie liegt auf der anderen Seite
    for (const p of ast.proben) {
      const s = r.haut.spiegel[p.ecken[0]]!;
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).not.toBe(p.ecken[0]);
    }
    // Griffe: Die Linie hat einen Pfad, er endet an den Punkten (nicht auf z = 0)
    griffeAnlegen(ast, ast.ruhe, true);
    expect(hatPfad(ast)).toBe(true);
    const P = pfadLagen(ast)!;
    expect(weit(ort(P, 0), kreis.punkte[0]!.ref)).toBeLessThan(1e-9);
    expect(weit(ort(P, ast.proben.length - 1), kreis.punkte[2]!.ref)).toBeLessThan(1e-9);
  });

  it('zwei Abzweigungen kreuzen sich an einem gemeinsamen Punkt des Netzes', () => {
    const { haut, loops, mk } = kugelMitKreis();
    const r1 = abzweigen(haut, loops, { loop: 0, punkt: 0 }, { loop: 0, punkt: 2 }, 2, 1);
    if ('fehler' in r1) throw new Error(r1.fehler);
    const r2 = abzweigen(r1.haut, r1.loops, { loop: 0, punkt: 1 }, { loop: 0, punkt: 3 }, 3, r1.naechsteKreuzung);
    if ('fehler' in r2) throw new Error(r2.fehler);
    const [, a, b] = r2.loops as [Loop, Loop, Loop];
    const va = new Set(a.proben.map((p) => p.ecken[0]));
    const gemeinsam = b.proben.map((p) => p.ecken[0]).filter((v) => va.has(v));
    expect(gemeinsam.length).toBe(1);
    const funde = kreuzungenZwischen(a, a.ruhe, b, b.ruhe, 0.25 * mk);
    expect(funde.length).toBe(1);
    // die erste Abzweigung hat den Punkt in ihre Kette bekommen und ist dabei eine Kette von Punkt zu Punkt geblieben
    expect(a.proben.length).toBeGreaterThan(r1.loops[1]!.proben.length);
    expect(a.haengt).toEqual([true, true]);
  });

  it('sagt, warum es nicht geht', () => {
    const { haut, loops } = kugelMitKreis();
    const gleich = abzweigen(haut, loops, { loop: 0, punkt: 1 }, { loop: 0, punkt: 1 }, 2, 1);
    expect('fehler' in gleich && gleich.fehler).toMatch(/derselbe Punkt/);
    const fehlt = abzweigen(haut, loops, { loop: 0, punkt: 1 }, { loop: 0, punkt: 9 }, 2, 1);
    expect('fehler' in fehlt && fehlt.fehler).toMatch(/Ende: der Punkt fehlt/);
  });
});
