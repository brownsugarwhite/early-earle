// Naht zwischen zwei Objekten (18.11.2026): Zwei Formen werden an ihrer Schnittkurve eine, frei oder gespiegelt; die Haut bleibt
// geschlossen, die Spiegelpaare genau, die Linien enden an der Naht.
import { type Haut, type Loop, endeAufMitte, griffeAnlegen, hatPfad, hautAus, hautFrei, kreuzungenZwischen, loopAusSchnitt, loopEinsetzen, mittlereKante, pfadAbweichung, punktEinfuegen, rundAusSeite, spiegelAnwenden } from '@ee/shape/dicht';
import { describe, expect, it } from 'vitest';
import { type NahtErgebnis, type NahtTeil, hautImMass, loopImMass, objekteVerbinden } from './naht';

const R = 150;
/** eine gespiegelte Kugel mit drei Linien (Ring waagerecht, Mitte, Ring senkrecht), ihre Kreuzungen als Punkte, mit Griffen */
function kugel(mitLinien = true): { h: Haut; loops: Loop[] } {
  const n = rundAusSeite(
    [
      { x: R, y: 0 },
      { x: 0, y: R },
      { x: -R, y: 0 },
      { x: 0, y: -R },
    ],
    { dreiecke: 1500 },
  );
  let h = hautAus(n.positionen, n.indizes);
  let loops: Loop[] = [];
  if (!mitLinien) return { h, loops };
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (let i = 0; i < loops.length; i++)
    for (let j = i + 1; j < loops.length; j++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
  for (const l of loops) griffeAnlegen(l, l.ruhe, true);
  return { h, loops };
}
const IDS = { naechsteId: 100, naechsteKreuzung: 1000 };
function freieKugel(mitLinien = true): { h: Haut; loops: Loop[] } {
  const d = kugel(mitLinien);
  const f = spiegelAnwenden(d.h, d.loops, { naechsteId: 10, naechsteKreuzung: 100 });
  if ('fehler' in f) throw new Error(f.fehler);
  return { h: f.haut, loops: f.loops };
}
/** B im Maß von A: kleiner und verschoben */
const teil = (d: { h: Haut; loops: Loop[] }, k: number, x: number, y: number, z: number, spiegelbild = false): NahtTeil => ({
  haut: hautImMass(d.h, k, { x, y, z }),
  loops: d.loops.map((l) => loopImMass(l, k, { x, y, z })),
  spiegelbild,
});
const ganz = (d: { h: Haut; loops: Loop[] }, spiegelbild = false): NahtTeil => ({ haut: d.h, loops: d.loops, spiegelbild });

const inhalt = (h: Haut): number => {
  let s = 0;
  for (let t = 0; t < h.tri.length; t += 3) {
    const [a, b, c] = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!].map((v) => [h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!]) as [number[], number[], number[]];
    s += a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) + a[1]! * (b[2]! * c[0]! - b[0]! * c[2]!) + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!);
  }
  return s / 6;
};
/** die Linse zweier Kugeln (Halbmesser R1, R2, Abstand der Mitten d) */
const linse = (R1: number, R2: number, d: number): number => (Math.PI * (R1 + R2 - d) ** 2 * (d * d + 2 * d * (R1 + R2) - 3 * (R1 - R2) ** 2)) / (12 * d);
/** jede Kante hat genau zwei Dreiecke, in Gegenrichtung durchlaufen */
function geschlossen(h: Haut): boolean {
  const kanten = new Map<string, number>();
  for (let t = 0; t < h.tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const key = `${h.tri[t + k]},${h.tri[t + ((k + 1) % 3)]}`;
      kanten.set(key, (kanten.get(key) ?? 0) + 1);
    }
  for (const [key, zahl] of kanten) {
    const [u, w] = key.split(',');
    if (zahl !== 1 || kanten.get(`${w},${u}`) !== 1) return false;
  }
  return true;
}
/** die Spiegelpaare sind genau: jeder Punkt hat seinen Partner am gespiegelten Ort, Punkte der Ebene liegen bei z = 0 */
function paareGenau(h: Haut): boolean {
  for (let v = 0; v < h.n; v++) {
    const p = h.spiegel[v]!;
    if (p < 0 || h.spiegel[p] !== v) return false;
    if (h.pos[3 * v] !== h.pos[3 * p] || h.pos[3 * v + 1] !== h.pos[3 * p + 1] || h.pos[3 * v + 2] !== -h.pos[3 * p + 2]!) return false;
    if (p === v && h.pos[3 * v + 2] !== 0) return false;
  }
  return true;
}
/** jede Linie liegt auf Punkten des Netzes, ihre Kette läuft über Kanten, ihre Punkte liegen auf der Haut */
function linienGueltig(h: Haut, loops: readonly Loop[]): string {
  for (const l of loops) {
    const kette = l.proben.map((p) => p.ecken[0]);
    if (!l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) return `Linie ${l.id}: nicht eingesetzt`;
    const m = l.art === 'ring' ? kette.length - 1 : kette.length;
    for (let j = 0; j < m; j++) if (!h.nachbarn[kette[j]!]!.includes(kette[(j + 1) % kette.length]!)) return `Linie ${l.id}: Kette über keine Kante (${j})`;
    if (new Set(kette).size !== kette.length) return `Linie ${l.id}: ein Punkt doppelt`;
    for (let j = 1; j < l.s.length; j++) if (!(l.s[j]! > l.s[j - 1]!)) return `Linie ${l.id}: Stellen nicht steigend`;
    for (const p of l.punkte) if (!(p.s >= -1e-9 && p.s <= l.laenge + 1e-9)) return `Linie ${l.id}: Punkt außerhalb (${p.s} von ${l.laenge})`;
    if (l.art === 'ring')
      for (const e of [0, 1] as const)
        if (endeAufMitte(l, e)) {
          const v = kette[e === 0 ? 0 : kette.length - 1]!;
          if (h.pos[3 * v + 2] !== 0) return `Linie ${l.id}: Ende ${e} nicht auf der Spiegelebene`;
        }
  }
  return '';
}
/** die hängenden Enden: Jedes teilt seinen Punkt mit einer Naht (dieselbe Kreuzung, derselbe Ort) */
function endenAnNaht(E: NahtErgebnis): { enden: number; lose: number } {
  const anNaht = new Map<number, { x: number; y: number; z: number }>();
  for (const l of E.loops) if (E.naehte.includes(l.id)) for (const p of l.punkte) if (p.kreuzung !== undefined) anNaht.set(p.kreuzung, p.ref);
  let enden = 0;
  let lose = 0;
  for (const l of E.loops) {
    if (E.naehte.includes(l.id) || !l.haengt) continue;
    for (const e of [0, 1] as const) {
      if (!l.haengt[e]) continue;
      const p = e === 0 ? l.punkte[0]! : l.punkte[l.punkte.length - 1]!;
      const q = p.kreuzung === undefined ? undefined : anNaht.get(p.kreuzung);
      // (ein Ende, das schon vorher an einer anderen Linie hing, zählt hier nicht: Die Testformen haben keine Abzweigungen)
      enden++;
      if (!q || Math.hypot(q.x - p.ref.x, q.y - p.ref.y, q.z - p.ref.z) > 1e-9) lose++;
    }
  }
  return { enden, lose };
}
const nahtLinien = (E: NahtErgebnis): Loop[] => E.loops.filter((l) => E.naehte.includes(l.id));
const erwartet = async (a: NahtTeil, b: NahtTeil, art: 'vereinen' | 'abziehen'): Promise<NahtErgebnis> => {
  const E = await objekteVerbinden(a, b, art, IDS);
  if ('fehler' in E) throw new Error(E.fehler);
  return E;
};

describe('Naht zwischen zwei freien Formen', () => {
  const A = freieKugel();
  const B = freieKugel();
  for (const art of ['vereinen', 'abziehen'] as const)
    it(`${art}: geschlossen, eine Naht mit Kante, die Linien enden an ihr`, async () => {
      const b = teil(B, 0.6, 170, 50, 30);
      const E = await erwartet(ganz(A), b, art);
      expect(hautFrei(E.haut)).toBe(true);
      expect(geschlossen(E.haut)).toBe(true);
      const soll = art === 'vereinen' ? inhalt(A.h) + inhalt(b.haut) - linse(R, 0.6 * R, Math.hypot(170, 50, 30)) : inhalt(A.h) - linse(R, 0.6 * R, Math.hypot(170, 50, 30));
      expect(Math.abs(inhalt(E.haut) / soll - 1)).toBeLessThan(0.03);
      // die Naht: ein geschlossener Loop mit Kante und Pfad
      const naht = nahtLinien(E);
      expect(naht.length).toBe(1);
      expect(naht[0]!.art).toBe('paar');
      expect(naht[0]!.kante).toBe(true);
      expect(hatPfad(naht[0]!)).toBe(true);
      // die Linien
      expect(linienGueltig(E.haut, E.loops)).toBe('');
      expect(E.geschnitten).toBeGreaterThanOrEqual(3);
      const e = endenAnNaht(E);
      expect(e.enden).toBe(E.enden);
      expect(e.lose).toBe(0);
      expect(naht[0]!.punkte.filter((p) => p.kreuzung !== undefined).length).toBe(E.enden);
      expect(E.neben).toBeLessThan(0.5);
      for (const l of E.loops) expect(pfadAbweichung(l)).toBeLessThan(1);
      // die Linien von A behalten ihre Kennungen (ein Stück je geschnittener Linie), neue liegen darüber
      const alteIds = new Set(A.loops.map((l) => l.id));
      expect(E.loops.filter((l) => alteIds.has(l.id)).length).toBeGreaterThanOrEqual(2);
      expect(new Set(E.loops.map((l) => l.id)).size).toBe(E.loops.length);
      // alte Punkte von A liegen genau, wo sie lagen
      let bewegt = 0;
      for (let v = 0; v < E.haut.n; v++) {
        const w = E.alt[v]!;
        if (w >= 0 && (E.haut.pos[3 * v] !== A.h.pos[3 * w] || E.haut.pos[3 * v + 1] !== A.h.pos[3 * w + 1] || E.haut.pos[3 * v + 2] !== A.h.pos[3 * w + 2])) bewegt++;
      }
      expect(bewegt).toBe(0);
      expect(Array.from(E.alt).filter((w) => w >= 0).length).toBeGreaterThan(0.5 * A.h.n);
    });

  it('ohne Linien: Die Naht ist die einzige Linie', async () => {
    const E = await erwartet(ganz(freieKugel(false)), teil(freieKugel(false), 0.6, 170, 50, 30), 'vereinen');
    expect(E.loops.length).toBe(1);
    expect(E.naehte).toEqual([E.loops[0]!.id]);
    expect(E.loops[0]!.punkte.length).toBeGreaterThanOrEqual(4);
    expect(hatPfad(E.loops[0]!)).toBe(true);
    expect(pfadAbweichung(E.loops[0]!)).toBeLessThan(0.3 * mittlereKante(E.haut));
  });

  it('berühren sie sich nicht, oder zeigt nur eine ihr Spiegelbild: Fehler, nichts geändert', async () => {
    const fern = await objekteVerbinden(ganz(A), teil(B, 0.6, 400, 0, 0), 'vereinen', IDS);
    expect('fehler' in fern && fern.fehler).toMatch(/berühren sich nicht/);
    const innen = await objekteVerbinden(ganz(A), teil(B, 0.3, 0, 0, 0), 'vereinen', IDS);
    expect('fehler' in innen).toBe(true);
    const ungleich = await objekteVerbinden(ganz(A, true), teil(B, 0.6, 170, 50, 30, false), 'vereinen', IDS);
    expect('fehler' in ungleich && ungleich.fehler).toMatch(/Spiegel/);
  });
});

describe('Naht an gespiegelten Formen', () => {
  const A = kugel();
  for (const art of ['vereinen', 'abziehen'] as const)
    it(`zwei gespiegelte, ${art}: Das Ergebnis ist gespiegelt, die Naht läuft von der Ebene zur Ebene`, async () => {
      const b = teil(kugel(), 0.6, 170, 40, 0);
      const E = await erwartet(ganz(A), b, art);
      expect(E.aFrei).toBe(false);
      expect(hautFrei(E.haut)).toBe(false);
      expect(paareGenau(E.haut)).toBe(true);
      expect(geschlossen(E.haut)).toBe(true);
      const d = Math.hypot(170, 40);
      const soll = art === 'vereinen' ? inhalt(A.h) + inhalt(b.haut) - linse(R, 0.6 * R, d) : inhalt(A.h) - linse(R, 0.6 * R, d);
      expect(Math.abs(inhalt(E.haut) / soll - 1)).toBeLessThan(0.03);
      const naht = nahtLinien(E);
      expect(naht.length).toBe(1);
      expect(naht[0]!.art).toBe('ring');
      expect(naht[0]!.haengt).toBeUndefined();
      expect(naht[0]!.kante).toBe(true);
      expect(linienGueltig(E.haut, E.loops)).toBe('');
      // alle Linien liegen auf der Hälfte z ≥ 0
      for (const l of E.loops) for (const p of l.proben) expect(E.haut.pos[3 * p.ecken[0] + 2]!).toBeGreaterThanOrEqual(0);
      // (an den Enden der Naht auf der Ebene enden die Linien der Mitte beider Formen am selben Punkt)
      const e = endenAnNaht(E);
      expect(e.lose).toBe(0);
      expect(e.enden).toBeGreaterThanOrEqual(E.enden);
      // die Linie der Mitte von A ist an den Enden der Naht geschnitten: ein offenes Stück in der Ebene, das an der Naht hängt
      const inEbene = E.loops.filter((l) => !E.naehte.includes(l.id) && l.proben.every((p) => E.haut.pos[3 * p.ecken[0] + 2] === 0));
      expect(inEbene.length).toBeGreaterThanOrEqual(1);
      for (const l of inEbene) expect(l.haengt).toEqual([true, true]);
      // ein Ring, der geschnitten wurde, beginnt weiter auf der Ebene und hängt am anderen Ende an der Naht
      expect(E.loops.some((l) => l.haengt && l.haengt[0] !== l.haengt[1])).toBe(true);
      for (const l of E.loops) expect(pfadAbweichung(l)).toBeLessThan(1);
      // die Zuordnung zu A, auch für die Spiegelseite (dort bis auf Rundung: Die neue Haut ist auf das Bit spiegelgleich)
      let falsch = 0;
      let zugeordnet = 0;
      for (let v = 0; v < E.haut.n; v++) {
        const w = E.alt[v]!;
        if (w < 0) continue;
        zugeordnet++;
        if (Math.hypot(E.haut.pos[3 * v]! - A.h.pos[3 * w]!, E.haut.pos[3 * v + 1]! - A.h.pos[3 * w + 1]!, E.haut.pos[3 * v + 2]! - A.h.pos[3 * w + 2]!) > 1e-9) falsch++;
      }
      expect(falsch).toBe(0);
      expect(zugeordnet).toBeGreaterThan(0.5 * A.h.n);
    });

  for (const z of [110, -110])
    it(`ein freies Teil mit Spiegelbild (z = ${z}): Das Ergebnis ist gespiegelt, beide Seiten bekommen das Teil`, async () => {
      const b = teil(freieKugel(), 0.35, 60, 60, z, true);
      const E = await erwartet(ganz(A), b, 'vereinen');
      expect(E.aFrei).toBe(false);
      expect(paareGenau(E.haut)).toBe(true);
      expect(geschlossen(E.haut)).toBe(true);
      // das Teil ragt zum Teil heraus: der Rauminhalt wächst um zweimal (Teil − Überschneidung)
      expect(inhalt(E.haut)).toBeGreaterThan(inhalt(A.h) + 0.5 * inhalt(b.haut));
      expect(inhalt(E.haut)).toBeLessThan(inhalt(A.h) + 2 * inhalt(b.haut));
      const naht = nahtLinien(E);
      expect(naht.length).toBe(1);
      expect(naht[0]!.art).toBe('paar');
      expect(linienGueltig(E.haut, E.loops)).toBe('');
      expect(endenAnNaht(E).lose).toBe(0);
      for (const l of E.loops) for (const p of l.proben) expect(E.haut.pos[3 * p.ecken[0] + 2]!).toBeGreaterThanOrEqual(0);
    });

  it('ein freies Teil ohne Spiegelbild: Die gespiegelte Form wird ganz und frei', async () => {
    const E = await erwartet(ganz(A), teil(freieKugel(), 0.35, 60, 60, 110, false), 'vereinen');
    expect(E.aFrei).toBe(true);
    expect(hautFrei(E.haut)).toBe(true);
    expect(geschlossen(E.haut)).toBe(true);
    expect(nahtLinien(E).length).toBe(1);
    expect(linienGueltig(E.haut, E.loops)).toBe('');
  });

  it('ein freies Teil mit Spiegelbild, das über die Ebene reicht: Fehler', async () => {
    const r = await objekteVerbinden(ganz(A), teil(freieKugel(), 0.35, 150, 0, 20, true), 'vereinen', IDS);
    expect('fehler' in r && r.fehler).toMatch(/Spiegelebene/);
  });
});
