// Vorlage eines Lösers nach der Geometrie (G4, 10.11.2026): Eine fertige Zerlegung gilt für einen nächsten Löser nur, wenn seine
// Struktur dieselbe ist (Netz, Bindungen, Kanten, Quellen der Krümmung). Passt sie, rechnet er Bit für Bit wie ein Löser, der selbst
// zerlegt hat; passt sie nicht, zerlegt er selbst (und rechnet wie ohne Vorlage).
import { describe, expect, it } from 'vitest';
import { HautAusKurven } from './ausKurven';
import { loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import { type Loop, LoopZug, griffeAnlegen, kreuzungenZwischen, loopAusSchnitt, loopStruktur, mittlereKante, punktEinfuegen, verschiebungLaengs } from './loops';
import { rundAusSeite } from './rund';

function kugelMitLoops(): { h: Haut; loops: Loop[] } {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: 1200 },
  );
  let h = hautAus(n.positionen, n.indizes);
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (const f of kreuzungenZwischen(loops[0]!, loops[0]!.ruhe, loops[1]!, loops[1]!.ruhe, tol)) {
    punktEinfuegen(loops[0]!, f.sa, k);
    punktEinfuegen(loops[1]!, f.sb, k);
    k++;
  }
  for (const l of loops) griffeAnlegen(l);
  return { h, loops };
}

/** drei Runden mit einem Zug am ersten Punkt des ersten Loops; zurück die Lagen danach (die Haut wird zurückgestellt) */
function dreiRunden(z: LoopZug, h: Haut, loops: Loop[]): Float64Array {
  const start = Float64Array.from(h.pos);
  const d = loops.map((l, li) =>
    li === 0
      ? verschiebungLaengs(
          l,
          l.punkte.map((_, k) => (k === 0 ? { x: 0, y: 12, z: 0 } : { x: 0, y: 0, z: 0 })),
        )
      : null,
  );
  z.schritt(d, 3);
  const aus = Float64Array.from(h.pos);
  h.pos.set(start);
  return aus;
}
const genutzt = (z: LoopZug): boolean => (z.loeser as HautAusKurven).vorlageGenutzt;

describe('Vorlage nach der Geometrie', () => {
  it('trägt die Struktur und wird bei gleicher Struktur übernommen: Bit für Bit wie selbst zerlegt', () => {
    const { h, loops } = kugelMitLoops();
    const a = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
    const vorlage = a.vorlage!;
    expect(vorlage.struktur).toMatch(/^\d+:\d+:\d+:\d+$/);
    const selbst = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
    expect(genutzt(selbst)).toBe(false);
    const mit = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorlage });
    expect(genutzt(mit)).toBe(true);
    expect(mit.vorlage!.struktur).toBe(vorlage.struktur);
    const p1 = dreiRunden(selbst, h, loops);
    const p2 = dreiRunden(mit, h, loops);
    expect(Array.from(p2)).toEqual(Array.from(p1));
  });

  it('passt die Struktur nicht (eine Linie wird Kante), zerlegt der Löser selbst', () => {
    const { h, loops } = kugelMitLoops();
    const vorlage = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {}).vorlage!;
    loops[0]!.kante = true;
    const selbst = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
    const mit = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorlage });
    expect(genutzt(mit)).toBe(false);
    expect(mit.vorlage!.struktur).not.toBe(vorlage.struktur);
    expect(mit.vorlage!.struktur).toBe(selbst.vorlage!.struktur);
    const p1 = dreiRunden(selbst, h, loops);
    const p2 = dreiRunden(mit, h, loops);
    expect(Array.from(p2)).toEqual(Array.from(p1));
  });

  it('andere Lagen ändern die Struktur nicht; eine Vorlage ohne Struktur gilt ungeprüft', () => {
    const { h, loops } = kugelMitLoops();
    const a = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
    for (let v = 0; v < h.n; v++) h.pos[3 * v] = h.pos[3 * v]! * 1.1;
    const b = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorlage: a.vorlage! });
    expect(genutzt(b)).toBe(true);
    const { gew, sys, cVor } = a.vorlage!;
    loops[0]!.kante = true;
    const c = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorlage: { gew, sys, cVor } });
    expect(genutzt(c)).toBe(true);
  });

  it('der Auftrag (nur Zeilen) trägt dieselbe Struktur', () => {
    const { h, loops } = kugelMitLoops();
    const a = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
    const nur = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { nurZeilen: true });
    expect(nur.auftrag!.struktur).toBe(a.vorlage!.struktur);
  });

  it('die Struktur ohne Löser (`loopStruktur`): dieselbe; ein neuer Punkt auf der Linie ändert sie nicht, eine Ecke schon', () => {
    const { h, loops } = kugelMitLoops();
    const a = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
    const vorher = loopStruktur(h, loops);
    expect(vorher).toBe(a.vorlage!.struktur);
    // ein neuer Punkt mitten zwischen zwei Punkten des ersten Loops, auf seinem Pfad: Proben, Kanten und Ecken bleiben
    const l = loops[0]!;
    const n = l.punkte.length;
    const p = punktEinfuegen(l, 0.5 * (l.punkte[0]!.s + l.punkte[1]!.s), undefined, true);
    expect(l.punkte.length).toBe(n + 1);
    expect(loopStruktur(h, loops)).toBe(vorher);
    const b = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorlage: a.vorlage! });
    expect(genutzt(b)).toBe(true);
    // derselbe Punkt als Ecke: Dort gibt die Linie keine Krümmung mehr weiter, die Zerlegung gilt nicht mehr
    p.ecke = true;
    expect(loopStruktur(h, loops)).not.toBe(vorher);
  });
});
