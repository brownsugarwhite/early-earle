// Über die Mitte gezogen und fest gemacht (`mitteSchnitt.ts`, 13.11.2026): Kugel mit drei Loops, der Punkt an der Seite (Kreuzung der
// beiden Ringe) durch die Mittelebene gezogen. Die Bilder und Zahlen dazu rechnet `apps/editor/scripts/pruefen/form-donut-regel.ts`.
import { beforeAll, describe, expect, it } from 'vitest';
import { type Haut, type V3, hautSeiten } from './kurven';
import { dreiLoops } from './kurvenFaelle';
import { type Loop, LoopZug, eckenAuto, festlegen, griffeAnlegen, hatPfad, istEckeVonSelbst, kantenKnicken, mittlereKante, pfadLagen } from './loops';
import { type MitteSchnitt, hinterDerMitte, mitteFestmachen, mitteKreuzungen } from './mitteSchnitt';

const pfade = (loops: readonly Loop[]): Float64Array[] => loops.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));
/** die heutige Rechnung zu den Lagen der Linien: in Schritten hin, dann Runden; danach liegen die Linien fest (Punkte bleiben) */
function rechnen(h: Haut, loops: Loop[], lagen: readonly Float64Array[], schritte: number, ende: number): void {
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie');
  const versch = loops.map((l, i) => Float64Array.from(lagen[i]!, (x, k) => x - l.ruhe[k]!));
  for (let s = 1; s <= schritte; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / schritte)), 2);
  z.schritt(versch, ende);
  for (const l of loops) festlegen(h, l, !hatPfad(l));
}
/** Knick quer über die Kanten zwischen je zwei dieser Punkte (Grad, Mittel) */
function knickAn(h: Haut, punkte: ReadonlySet<number>): number {
  const P = h.pos;
  const normale = (t: number): number[] => {
    const [a, b, c] = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
    const u = [0, 1, 2].map((k) => P[3 * b + k]! - P[3 * a + k]!);
    const v = [0, 1, 2].map((k) => P[3 * c + k]! - P[3 * a + k]!);
    const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    const l = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    return n.map((x) => x / l);
  };
  const kanten = new Map<number, number[]>();
  for (let t = 0; t < h.tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = h.tri[t + k]!;
      const b = h.tri[t + ((k + 1) % 3)]!;
      if (!punkte.has(a) || !punkte.has(b)) continue;
      const key = Math.min(a, b) * h.n + Math.max(a, b);
      kanten.set(key, [...(kanten.get(key) ?? []), t]);
    }
  let s = 0;
  let z = 0;
  for (const ts of kanten.values()) {
    if (ts.length !== 2) continue;
    const p = normale(ts[0]!);
    const q = normale(ts[1]!);
    s += (Math.acos(Math.max(-1, Math.min(1, p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]!))) * 180) / Math.PI;
    z++;
  }
  return z ? s / z : 0;
}

describe('über die Mitte gezogen', () => {
  let h: Haut;
  let loops: Loop[];
  let mk: number;
  let vorher: { h: Haut; loops: Loop[] };

  beforeAll(() => {
    const d = dreiLoops();
    h = d.h;
    loops = d.loops;
    mk = mittlereKante(h);
    // wie im Fenster: jede Linie ist genau ihr Pfad
    for (const l of loops) griffeAnlegen(l, l.ruhe, true);
    rechnen(h, loops, pfade(loops), 4, 6);
    vorher = { h: { ...h, pos: Float64Array.from(h.pos) }, loops: loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) })) };
    // der Punkt an der Seite: die Kreuzung mit dem größten z, um 190 durch die Ebene (die Kugel hat Radius 150)
    let kz = -1;
    let hoch = -Infinity;
    for (const l of loops)
      for (const p of l.punkte)
        if (p.kreuzung !== undefined && p.ref.z > hoch) {
          hoch = p.ref.z;
          kz = p.kreuzung;
        }
    const gezogen = loops.map((l) => l.punkte.map((p): V3 => (p.kreuzung === kz ? { ...p.ref, z: p.ref.z - 190 } : p.ref)));
    const lagen = loops.map((l, i) => pfadLagen(l, gezogen[i]) ?? Float64Array.from(l.ruhe));
    loops.forEach((l, i) =>
      l.punkte.forEach((p, j) => {
        p.cur = { ...gezogen[i]![j]! };
      }),
    );
    rechnen(h, loops, lagen, 30, 12);
  }, 120_000);

  const schnitt = (): MitteSchnitt => {
    const r = mitteFestmachen(h, loops, { naechsteId: 10, naechsteKreuzung: 20 });
    if ('fehler' in r) throw new Error(r.fehler);
    return r;
  };

  it('lose: Die Pfade der beiden Ringe kreuzen die Mitte je zweimal, ihr gemeinsamer Punkt liegt dahinter', () => {
    for (const l of vorher.loops) {
      expect(mitteKreuzungen(l)).toHaveLength(0);
      expect(hinterDerMitte(l)).toHaveLength(0);
    }
    const ringe = loops.filter((l) => l.art === 'ring');
    expect(ringe).toHaveLength(2);
    for (const l of ringe) {
      const k = mitteKreuzungen(l);
      expect(k).toHaveLength(2);
      for (const x of k) expect(x.ort.z).toBe(0);
      expect(hinterDerMitte(l)).toHaveLength(1);
    }
    for (const l of loops.filter((x) => x.art === 'mitte')) expect(mitteKreuzungen(l)).toHaveLength(0);
  });

  it('ohne etwas hinter der Mitte gibt es nichts fest zu machen', () => {
    const r = mitteFestmachen(vorher.h, vorher.loops, { naechsteId: 10, naechsteKreuzung: 20 });
    expect('fehler' in r).toBe(true);
  });

  it('fest gemacht: eine geschlossene, spiegelgleiche Haut, nichts mehr hinter der Mitte, die gebliebenen Punkte an ihrem Ort', () => {
    const r = schnitt();
    const g = r.haut;
    const seite = hautSeiten(g);
    expect(seite).not.toBeNull();
    for (let v = 0; v < g.n; v++) {
      expect(g.spiegel[v]).toBeGreaterThanOrEqual(0);
      const z = g.pos[3 * v + 2]!;
      if (g.spiegel[v] === v) expect(z).toBe(0);
      else expect(seite![v]! > 0 ? z : -z).toBeGreaterThan(0);
    }
    // jede Kante trägt genau zwei Dreiecke
    const kanten = new Map<number, number>();
    for (let t = 0; t < g.tri.length; t += 3)
      for (let k = 0; k < 3; k++) {
        const a = g.tri[t + k]!;
        const b = g.tri[t + ((k + 1) % 3)]!;
        const key = Math.min(a, b) * g.n + Math.max(a, b);
        kanten.set(key, (kanten.get(key) ?? 0) + 1);
      }
    for (const z of kanten.values()) expect(z).toBe(2);
    // erst die gebliebenen Punkte, dann die neuen am Rand; gebliebene liegen, wo sie lagen (höchstens auf die Ebene gelegt)
    let m = 0;
    while (m < r.alt.length && r.alt[m]! >= 0) m++;
    expect(m).toBeGreaterThan(0);
    expect(m).toBeLessThan(r.alt.length);
    for (let v = m; v < r.alt.length; v++) expect(r.alt[v]).toBe(-1);
    for (let v = 0; v < m; v++) {
      const a = r.alt[v]!;
      expect(g.pos[3 * v]).toBe(h.pos[3 * a]);
      expect(g.pos[3 * v + 1]).toBe(h.pos[3 * a + 1]);
      if (g.pos[3 * v + 2] !== 0) expect(g.pos[3 * v + 2]).toBe(h.pos[3 * a + 2]);
    }
    // keine sehr kurze Kante am Rand (neben einem Punkt wird nicht dicht geschnitten)
    for (const id of r.rand)
      for (const p of r.loops.find((l) => l.id === id)!.proben) {
        const v = p.ecken[0];
        for (const w of g.nachbarn[v]!) expect(Math.hypot(g.pos[3 * v]! - g.pos[3 * w]!, g.pos[3 * v + 1]! - g.pos[3 * w + 1]!, g.pos[3 * v + 2]! - g.pos[3 * w + 2]!)).toBeGreaterThan(0.08 * mk);
      }
  });

  it('fest gemacht: vier Linienstücke mit ihrem Knick an der Mitte, der Rand ein Loop mit Kante und vier Punkten an den Kreuzungen', () => {
    const r = schnitt();
    expect(r.wegPunkte).toBe(2);
    expect(r.rand).toHaveLength(1);
    const rand = r.loops.find((l) => l.id === r.rand[0])!;
    expect(rand.art).toBe('mitte');
    expect(rand.kante).toBe(true);
    expect(rand.punkte).toHaveLength(4);
    expect(hatPfad(rand)).toBe(true);
    const ringe = r.loops.filter((l) => l.art === 'ring');
    expect(ringe).toHaveLength(4);
    expect(r.loops.filter((l) => l.art === 'mitte')).toHaveLength(2);
    for (const l of ringe) {
      expect(l.id).toBeGreaterThanOrEqual(10);
      expect(hatPfad(l)).toBe(true);
      expect(mitteKreuzungen(l)).toHaveLength(0);
      expect(hinterDerMitte(l)).toHaveLength(0);
      // genau ein Ende ist neu: eine Kreuzung mit dem Rand, eine Ecke von selbst, der Griff schräg zur Ebene (der Knick bleibt)
      const neu = l.punkte.filter((p) => rand.punkte.some((q) => q.kreuzung === p.kreuzung));
      expect(neu).toHaveLength(1);
      const p = neu[0]!;
      expect(p.kreuzung).toBeGreaterThanOrEqual(20);
      expect(p.ref.z).toBe(0);
      expect(istEckeVonSelbst(p)).toBe(true);
      const innen = l.punkte.indexOf(p) === 0 ? p.aus! : p.ein!;
      const aussen = l.punkte.indexOf(p) === 0 ? p.ein! : p.aus!;
      expect(aussen).toEqual({ x: innen.x, y: innen.y, z: -innen.z });
      const schraeg = (Math.acos(Math.abs(innen.z) / Math.hypot(innen.x, innen.y, innen.z)) * 180) / Math.PI;
      expect(schraeg).toBeGreaterThan(20);
      // die Linie liegt auf ihrem Pfad (das Stück über der Ebene hat seine Form behalten)
      const pf = pfadLagen(l)!;
      let weit = 0;
      for (let j = 0; j < pf.length; j += 3) weit = Math.max(weit, Math.hypot(pf[j]! - l.ruhe[j]!, pf[j + 1]! - l.ruhe[j + 1]!, pf[j + 2]! - l.ruhe[j + 2]!));
      expect(weit).toBeLessThan(0.3 * mk);
    }
    // die Linien von vorher sind nicht angefasst
    for (const l of loops) for (const p of l.punkte) expect(p.autoEcke).toBeUndefined();
  });

  it('danach steht die Haut mit ihrer Kante; „Kante aus“ am Rand macht sie glatt', () => {
    const r = schnitt();
    const g = r.haut;
    const ls = r.loops;
    const vor = Float64Array.from(g.pos);
    rechnen(g, ls, pfade(ls), 4, 10);
    let weg = 0;
    for (let i = 0; i < vor.length; i += 3) weg = Math.max(weg, Math.hypot(g.pos[i]! - vor[i]!, g.pos[i + 1]! - vor[i + 1]!, g.pos[i + 2]! - vor[i + 2]!));
    expect(Number.isFinite(weg)).toBe(true);
    expect(weg).toBeLessThan(12);
    const rand = ls.find((l) => l.id === r.rand[0])!;
    const randPunkte = new Set(rand.proben.map((p) => p.ecken[0]));
    const kantig = knickAn(g, randPunkte);
    expect(kantig).toBeGreaterThan(50);
    // Kante aus, wie der Editor es tut: Die Ecken von selbst werden glatt (Griffe auf eine Gerade, Längen bleiben), die Haut folgt
    const ecken = new Set(ls.flatMap((l) => l.punkte.filter(istEckeVonSelbst)));
    expect(ecken.size).toBe(4);
    rand.kante = false;
    eckenAuto(ls);
    const versch = kantenKnicken(ls, ecken);
    expect(versch.filter((d) => d !== null)).toHaveLength(4);
    rechnen(g, ls, pfade(ls), 30, 12);
    const glatt = knickAn(g, randPunkte);
    expect(glatt).toBeLessThan(30);
    for (const x of g.pos) expect(Number.isFinite(x)).toBe(true);
  }, 60_000);
});
