// Vorsicht bei Unruhe und Grenzen (10.11.2026, Florian: „der Kopf bläst sich auf und explodiert, dann ist es weg und die Seite hängt
// sich auf“). An seiner gesicherten Form lief die Haut davon, wo der volle Schritt des Lösers über das Ziel hinausschoss; die Haut
// einer davongelaufenen Form ließ das Verdichten auf Millionen Punkte wachsen. Die Tests halten fest:
// (1) Schießt der Schritt über (hier erzwungen: nach einem gewöhnlichen Zug der dreifache Schritt ohne die Bremse je Punkt), läuft
//     die Haut ohne Vorsicht davon; mit ihr nimmt der Löser die Runde zurück, halbiert und bleibt bei der Form.
// (2) Eine Haut, die zur Ruhe kommt, rechnet mit und ohne Vorsicht Bit für Bit gleich.
// (3) Das Verdichten hört vor der Grenze `hoechstens` auf und meldet es.
import { afterEach, describe, expect, it } from 'vitest';
import { daempfungSetzen, messreiheSetzen } from './ausKurven';
import { loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import { type Loop, LoopZug, griffeAnlegen, kreuzungenZwischen, loopAusSchnitt, mittlereKante, punktEinfuegen, verschiebungLaengs } from './loops';
import { rundAusSeite } from './rund';
import { verdichten } from './verdichten';

function kugelMitLoops(dreiecke = 1200): { h: Haut; loops: Loop[] } {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke },
  );
  let h = hautAus(n.positionen, n.indizes);
  let loops: Loop[] = [];
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
  for (const l of loops) griffeAnlegen(l);
  return { h, loops };
}

/**
 * die obere Kreuzung um `weit` hinauf (in `schritte` Schritten, je eine Runde), danach `runden` Runden, vor den letzten `spaet` davon
 * `dann()`; zurück: größte Koordinate im Verlauf
 */
function ziehen(z: LoopZug, h: Haut, loops: Loop[], weit: number, schritte: number, runden: number, spaet = 0, dann: () => void = () => {}): number {
  const m = loops.find((l) => l.art === 'mitte')!;
  const oben = m.punkte.reduce((b, p) => (p.ref.y > b.ref.y ? p : b)).kreuzung!;
  const ziel = (anteil: number) =>
    loops.map((l) => {
      const i = l.punkte.findIndex((p) => p.kreuzung === oben);
      if (i < 0) return null;
      const d = verschiebungLaengs(
        l,
        l.punkte.map((_, q) => (q === i ? { x: 0, y: weit * anteil, z: 0 } : { x: 0, y: 0, z: 0 })),
      );
      if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
      return d;
    });
  let max = 0;
  const messen = (): void => {
    for (let i = 0; i < h.pos.length; i++) {
      const v = Math.abs(h.pos[i]!);
      if (!(v <= max)) max = v;
    }
  };
  let d = ziel(0);
  for (let s = 1; s <= schritte; s++) {
    d = ziel(s / schritte);
    z.schritt(d, 1);
    messen();
  }
  for (let r = 0; r < runden; r++) {
    if (r === runden - spaet) dann();
    z.schritt(d, 1);
    messen();
  }
  return max;
}

describe('Vorsicht bei Unruhe', () => {
  afterEach(() => {
    daempfungSetzen(1);
    messreiheSetzen({ fest: false });
  });

  it('ein Schritt, der überschießt: ohne Vorsicht läuft die Haut davon, mit ihr bleibt sie bei der Form', () => {
    /** nach dem Zug und zehn gewöhnlichen Runden: der dreifache Schritt für alle Punkte, ohne die Bremse je Punkt */
    const ueberschiessen = (): void => {
      daempfungSetzen(3);
      messreiheSetzen({ fest: true });
    };
    const zurueck = (): void => {
      daempfungSetzen(1);
      messreiheSetzen({ fest: false });
    };
    // gewöhnlicher Schritt: die Form, zu der die Haut kommt
    const a = kugelMitLoops();
    const gut = ziehen(new LoopZug(a.h, a.loops, null, true, 'kurven', 'geometrie'), a.h, a.loops, 40, 4, 50);
    expect(gut).toBeLessThan(200);
    const b = kugelMitLoops();
    const ohne = ziehen(new LoopZug(b.h, b.loops, null, true, 'kurven', 'geometrie', { vorsicht: false }), b.h, b.loops, 40, 4, 50, 40, ueberschiessen);
    zurueck();
    expect(ohne > 1000 || Number.isNaN(ohne)).toBe(true);
    const c = kugelMitLoops();
    const zc = new LoopZug(c.h, c.loops, null, true, 'kurven', 'geometrie');
    const mit = ziehen(zc, c.h, c.loops, 40, 4, 50, 40, ueberschiessen);
    zurueck();
    let weg = 0;
    for (let i = 0; i < c.h.pos.length; i++) weg = Math.max(weg, Math.abs(c.h.pos[i]! - a.h.pos[i]!));
    // gemessen: gewöhnlich 189,7; ohne Vorsicht nicht endlich; mit Vorsicht im Verlauf 189,7, zweimal halbiert, 0,85 neben der Form
    expect(mit).toBeLessThan(200);
    expect(zc.unruhe.stufen).toBeGreaterThan(0);
    // die Haut liegt bei der Form mit gewöhnlichem Schritt
    expect(weg).toBeLessThan(3);
  });

  it('eine Haut, die zur Ruhe kommt, rechnet mit und ohne Vorsicht Bit für Bit gleich', () => {
    const a = kugelMitLoops();
    const b = kugelMitLoops();
    const za = new LoopZug(a.h, a.loops, null, true, 'kurven', 'geometrie');
    ziehen(za, a.h, a.loops, 40, 8, 20);
    ziehen(new LoopZug(b.h, b.loops, null, true, 'kurven', 'geometrie', { vorsicht: false }), b.h, b.loops, 40, 8, 20);
    expect(za.unruhe).toEqual({ stufen: 0, fest: false });
    expect(Array.from(a.h.pos)).toEqual(Array.from(b.h.pos));
  });
});

describe('Verdichten: Grenze für die Zahl der Punkte', () => {
  it('hört vor `hoechstens` auf und meldet es; ohne Not bleibt es unter der Grenze', () => {
    const { h, loops } = kugelMitLoops();
    const MK = mittlereKante(h);
    // dieselbe Haut zehnfach so groß: Jede Kante ist viel zu lang (so sieht eine davongelaufene Haut für das Verdichten aus)
    const gross: Haut = { ...h, pos: Float64Array.from(h.pos, (v) => 10 * v) };
    const gl = loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe, (v) => 10 * v), punkte: l.punkte.map((p) => ({ ...p, ref: { x: 10 * p.ref.x, y: 10 * p.ref.y, z: 10 * p.ref.z } })) }));
    const v = verdichten(gross, gl, 1.75 * MK, { hoechstens: 3 * h.n, drehen: false, entspannen: false });
    expect(v).not.toBeNull();
    expect(v!.gekappt).toBe(true);
    expect(v!.haut.n).toBeLessThanOrEqual(3 * h.n);
    // gewöhnlich: eine leicht gedehnte Haut wird verdichtet, ohne die Grenze zu berühren
    const etwas: Haut = { ...h, pos: Float64Array.from(h.pos, (w, i) => (i % 3 === 1 && w > 0 ? 1.6 * w : w)) };
    const el = loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe, (w, i) => (i % 3 === 1 && w > 0 ? 1.6 * w : w)), punkte: l.punkte.map((p) => ({ ...p })) }));
    const w = verdichten(etwas, el, 1.75 * MK, { drehen: false, entspannen: false });
    expect(w).not.toBeNull();
    expect(w!.gekappt).toBe(false);
    expect(w!.neu).toBeGreaterThan(0);
  });
});
