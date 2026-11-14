// Abzweigungen (14.11.2026): eine offene Linie, die an Punkten anderer Linien hängt (`abzweigen`, `Loop.haengt`).
// Florians Beispiel: ein Kreis mit vier Punkten, die gegenüberliegenden Punkte verbunden, in der Kreuzung ein gemeinsamer Punkt.
import { describe, expect, it } from 'vitest';
import { abzweigen, loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import { type Loop, endeAufMitte, formAusZeichnung, griffeAnlegen, hatPfad, hautLagen, kreuzungenZwischen, mittlereKante, pfadLagen, punktEinfuegen, ringEnde } from './loops';
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

  it('zum Spiegelbild des Startpunkts: Die Linie endet auf der Mittelebene und hängt nur am Anfang', () => {
    const { haut, loops, mk } = kugelMitKreis();
    const r = abzweigen(haut, loops, { loop: 0, punkt: 1 }, 'spiegel', 2, 1);
    if ('fehler' in r) throw new Error(r.fehler);
    const kreis = r.loops[0]!;
    const ast = r.loops[1]!;
    expect(ast.haengt).toEqual([true, false]);
    expect(endeAufMitte(ast, 0)).toBe(false);
    expect(endeAufMitte(ast, 1)).toBe(true);
    const n = ast.proben.length;
    const L = hautLagen(r.haut, ast);
    expect(weit(ort(L, 0), kreis.punkte[1]!.ref)).toBeLessThan(0.05 * mk);
    expect(L[3 * n - 1]).toBe(0);
    // das Ende ist ein Punkt des Netzes auf der Mittelebene, sein eigenes Spiegelbild; alle anderen liegen auf der Seite z > 0
    const ende = ast.proben[n - 1]!.ecken[0];
    expect(r.haut.spiegel[ende]).toBe(ende);
    for (let j = 0; j < n - 1; j++) expect(L[3 * j + 2]!).toBeGreaterThan(0);
    // ein Punkt (der Anfang, geteilt mit dem Kreis); das Ende auf der Mitte bekommt beim Anlegen der Griffe seinen Spiegelpunkt
    expect(ast.punkte.length).toBe(1);
    expect(ast.punkte[0]!.kreuzung).toBe(kreis.punkte[1]!.kreuzung);
    griffeAnlegen(ast, ast.ruhe, true);
    expect(ast.punkte.length).toBe(2);
    expect(ast.punkte[1]!.vonSelbst).toBe(true);
    expect(ringEnde(ast, 0)).toBeNull();
    expect(ringEnde(ast, 1)).toBe('ende');
    expect(hatPfad(ast)).toBe(true);
    const P = pfadLagen(ast)!;
    expect(P[3 * n - 1]).toBe(0);
  });

  it('läuft durch einen vorhandenen Punkt, wenn sie eine Linie dicht an ihm kreuzt, und teilt ihn', () => {
    const { haut, loops, mk } = kugelMitKreis();
    const r1 = abzweigen(haut, loops, { loop: 0, punkt: 0 }, { loop: 0, punkt: 2 }, 2, 1);
    if ('fehler' in r1) throw new Error(r1.fehler);
    const r2 = abzweigen(r1.haut, r1.loops, { loop: 0, punkt: 1 }, { loop: 0, punkt: 3 }, 3, r1.naechsteKreuzung);
    if ('fehler' in r2) throw new Error(r2.fehler);
    // der gemeinsame Punkt in der Kreuzung der beiden (wie das Fenster ihn anlegt)
    const [kreis, a, b] = r2.loops as [Loop, Loop, Loop];
    const f = kreuzungenZwischen(a, a.ruhe, b, b.ruhe, 0.25 * mk)[0]!;
    const K = r2.naechsteKreuzung;
    const pa = punktEinfuegen(a, f.sa, K);
    const pb = punktEinfuegen(b, f.sb, K);
    pb.ref = { ...pa.ref };
    const mitte = a.proben[a.s.findIndex((x) => Math.abs(x - pa.s) < 1e-9)]!.ecken[0];
    expect(b.proben.some((p) => p.ecken[0] === mitte)).toBe(true);
    // zwei neue Punkte auf dem Kreis, so dass die Gerade zwischen ihnen dicht an der Kreuzung vorbeiläuft
    const M = ort(r2.haut.pos, mitte);
    const L = hautLagen(r2.haut, kreis);
    const n = kreis.proben.length;
    const j1 = Math.round((kreis.s.findIndex((x) => x >= kreis.punkte[0]!.s) + kreis.s.findIndex((x) => x >= kreis.punkte[1]!.s)) / 2);
    const P1 = ort(L, j1);
    const d = [M[0] - P1[0], M[1] - P1[1], M[2] - P1[2]];
    let j2 = -1;
    let nahe = Infinity;
    for (let j = 0; j < n; j++) {
      const q = ort(L, j);
      const w = [q[0] - P1[0], q[1] - P1[1], q[2] - P1[2]];
      const t = (w[0]! * d[0]! + w[1]! * d[1]! + w[2]! * d[2]!) / (d[0]! * d[0]! + d[1]! * d[1]! + d[2]! * d[2]!);
      if (t < 1.3) continue;
      const ab = Math.hypot(w[0]! - t * d[0]!, w[1]! - t * d[1]!, w[2]! - t * d[2]!);
      if (ab < nahe) {
        nahe = ab;
        j2 = j;
      }
    }
    const q1 = punktEinfuegen(kreis, kreis.s[j1]!);
    const q2 = punktEinfuegen(kreis, kreis.s[j2]!);
    const r3 = abzweigen(r2.haut, [kreis, a, b], { loop: 0, punkt: kreis.punkte.indexOf(q1) }, { loop: 0, punkt: kreis.punkte.indexOf(q2) }, 4, K + 1);
    if ('fehler' in r3) throw new Error(r3.fehler);
    const ast = r3.loops[3]!;
    // sie läuft genau einmal durch den Punkt der Kreuzung und teilt ihn: drei Punkte (Anfang, Kreuzung, Ende), keine eigene Kreuzung
    // dicht daneben (Splitter am Punkt räumt danach das Zusammenlegen der Nadeln weg, wie nach jedem neuen Loop)
    expect(ast.proben.filter((p) => p.ecken[0] === mitte).length).toBe(1);
    expect(ast.punkte.map((p) => p.kreuzung)).toContain(K);
    expect(ast.punkte.length).toBe(3);
    expect(weit(ort(r3.haut.pos, mitte), ast.punkte[1]!.ref)).toBeLessThan(0.05 * mk);
    // die Kette ist eine Folge von Kanten des Netzes
    for (let j = 0; j + 1 < ast.proben.length; j++) expect(r3.haut.nachbarn[ast.proben[j]!.ecken[0]]!).toContain(ast.proben[j + 1]!.ecken[0]);
  });

  it('über gesetzte Punkte: Jeder wird ein Punkt der Linie (Ecke oder glatt), der Weg läuft von Punkt zu Punkt', () => {
    const { haut, loops, mk } = kugelMitKreis();
    const kreis = loops[0]!;
    // zwei Orte im Kreis, neben der geraden Verbindung von Punkt 0 zu Punkt 2 (auf die Kugel gelegt)
    const aufKugel = (x: number, y: number): { x: number; y: number; z: number } => ({ x, y, z: Math.sqrt(150 * 150 - x * x - y * y) });
    const P0 = kreis.punkte[0]!.ref;
    const P2 = kreis.punkte[2]!.ref;
    const u1 = aufKugel(P0.x + 0.33 * (P2.x - P0.x), P0.y + 0.33 * (P2.y - P0.y) + 14);
    const u2 = aufKugel(P0.x + 0.66 * (P2.x - P0.x), P0.y + 0.66 * (P2.y - P0.y) - 12);
    const r = abzweigen(haut, loops, { loop: 0, punkt: 0 }, { loop: 0, punkt: 2 }, 2, 1, [
      { ort: u1, ecke: true },
      { ort: u2, ecke: false },
    ]);
    if ('fehler' in r) throw new Error(r.fehler);
    const ast = r.loops[1]!;
    expect(ast.punkte.length).toBe(4);
    expect(ast.punkte.map((p) => p.kreuzung)).toEqual([1, undefined, undefined, 2]);
    expect(ast.punkte[1]!.ecke).toBe(true);
    expect(ast.punkte[2]!.ecke).toBeUndefined();
    // die gesetzten Punkte liegen, wo sie gesetzt wurden (auf einem Punkt des Netzes), in dieser Reihenfolge längs der Linie
    expect(weit([u1.x, u1.y, u1.z], ast.punkte[1]!.ref)).toBeLessThan(0.3 * mk);
    expect(weit([u2.x, u2.y, u2.z], ast.punkte[2]!.ref)).toBeLessThan(0.3 * mk);
    expect(ast.punkte[1]!.s).toBeLessThan(ast.punkte[2]!.s);
    // die Kette ist eine Folge von Kanten des Netzes, und das Netz bleibt spiegelgleich
    for (let j = 0; j + 1 < ast.proben.length; j++) expect(r.haut.nachbarn[ast.proben[j]!.ecken[0]]!).toContain(ast.proben[j + 1]!.ecken[0]);
    for (const p of ast.proben) expect(r.haut.spiegel[p.ecken[0]]!).toBeGreaterThanOrEqual(0);
    griffeAnlegen(ast, ast.ruhe, true);
    expect(hatPfad(ast)).toBe(true);
  });

  it('sagt, warum es nicht geht', () => {
    const { haut, loops } = kugelMitKreis();
    const gleich = abzweigen(haut, loops, { loop: 0, punkt: 1 }, { loop: 0, punkt: 1 }, 2, 1);
    expect('fehler' in gleich && gleich.fehler).toMatch(/derselbe Punkt/);
    const fehlt = abzweigen(haut, loops, { loop: 0, punkt: 1 }, { loop: 0, punkt: 9 }, 2, 1);
    expect('fehler' in fehlt && fehlt.fehler).toMatch(/Ende: der Punkt fehlt/);
  });
});
