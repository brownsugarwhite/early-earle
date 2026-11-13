import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import { falten } from './kurvenFaelle';
import { type Loop, formAusZeichnung, griffeAnlegen, mittlereKante, pfadLagen } from './loops';
import { maulFormen } from './maulFormen';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];

/** Kugel mit einer schmalen Form ums Maul, in der Seite vorn über den Umriss gezeichnet (wie im Fenster mit F), mit Griffen */
function maulKugel(): { haut: Haut; loop: Loop } {
  const netz = rundAusSeite(kreis(150), { dreiecke: 3000 });
  const h = hautAus(netz.positionen, netz.indizes);
  const n = 64;
  const uv = Array.from({ length: n }, (_, i): [number, number] => [-115 + 60 * Math.cos((2 * Math.PI * i) / n), -20 + 14 * Math.sin((2 * Math.PI * i) / n)]);
  const knoten = Array.from({ length: n / 8 }, (_, i) => 8 * i);
  const r = loopEinsetzen(h, [formAusZeichnung(h, 'seite', uv, knoten, 1)!], 0)!;
  const loop = r.loops[0]!;
  griffeAnlegen(loop, loop.ruhe, true);
  return { haut: r.haut, loop };
}

/** Abstand in der Seite (x, y) zur Linie, wie sie von der Seite aussieht */
function zurLinie(l: Loop): (x: number, y: number) => number {
  const P = pfadLagen(l) ?? l.ruhe;
  const q: [number, number][] = [];
  for (let k = 0; k < P.length; k += 3) q.push([P[k]!, P[k + 1]!]);
  return (x, y) => {
    let best = Infinity;
    for (let k = 0; k + 1 < q.length; k++) {
      const [ax, ay] = q[k]!;
      const [bx, by] = q[k + 1]!;
      const l2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / l2));
      best = Math.min(best, Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)));
    }
    return best;
  };
}

describe('Maul formen (wie von Hand, von der Seite durchgestanzt)', () => {
  it('an der Kugel: steht, nichts umgeschlagen, die Mittellinie hat im Maul die Form der Maullinie von der Seite', () => {
    const { haut, loop } = maulKugel();
    const vorher = Float64Array.from(haut.pos);
    // verfeinert wird unterwegs wie im Fenster nach einem Zug (ohne das trägt die Fläche zwischen den Lippen die Form nicht: Sie
    // wird auf ein Vielfaches gestreckt)
    const mk = mittlereKante(haut) / 1.3;
    const r = maulFormen(haut, [loop], loop.id, {
      naechsteId: 2,
      naechsteKreuzung: 1,
      verdichten: { maxKante: 1.75 * mk, opt: { kurz: 0.5 * mk, genau: mk / 40, genauHaut: true, genauFlaeche: mk / 16, flachSchutz: true } },
      zwischen: (was, hz, _l, alt) => {
        let weit = 0;
        let wo = '';
        for (let v = 0; v < hz.n; v++) {
          const a = alt[v]!;
          if (a < 0 || vorher[3 * a]! < -40) continue;
          const dd = Math.hypot(hz.pos[3 * v]! - vorher[3 * a]!, hz.pos[3 * v + 1]! - vorher[3 * a + 1]!, hz.pos[3 * v + 2]! - vorher[3 * a + 2]!);
          if (dd > weit) {
            weit = dd;
            wo = `(${vorher[3 * a]!.toFixed(0)}, ${vorher[3 * a + 1]!.toFixed(0)}, ${vorher[3 * a + 2]!.toFixed(0)})`;
          }
        }
        log(`   ${was}: hinter dem Maul bis ${weit.toFixed(2)} bewegt, am weitesten bei ${wo}`);
      },
    });
    if ('fehler' in r) throw new Error(r.fehler);
    // die Eingaben bleiben, wie sie waren
    expect(Array.from(haut.pos)).toEqual(Array.from(vorher));
    expect(loop.kante).toBeUndefined();
    const L = r.loops.find((l) => l.id === loop.id)!;
    const M = r.loops.find((l) => l.id === r.mitte)!;
    const Q = r.loops.find((l) => l.id === r.quer)!;
    expect(L.kante).toBe(true);
    expect(L.maulGeformt).toBe(true);
    expect(M.art).toBe('mitte');
    expect(Q.art).toBe('ring');
    expect(r.steht).toBe(true);
    const f = falten(r.haut);
    expect(f.umgeklappt).toBe(0);
    for (let v = 0; v < r.haut.n; v++) expect(r.haut.spiegel[v]).toBeGreaterThanOrEqual(0);
    // die Mittellinie im Maul: ihre Punkte zwischen den beiden Lippen liegen in der Seite auf der Maullinie
    const d = zurLinie(L);
    const kA = L.punkte[0]!.kreuzung;
    const kB = L.punkte[L.punkte.length - 1]!.kreuzung;
    const iA = M.punkte.findIndex((p) => p.kreuzung === kA);
    const iB = M.punkte.findIndex((p) => p.kreuzung === kB);
    expect(iA).toBeGreaterThanOrEqual(0);
    expect(iB).toBeGreaterThanOrEqual(0);
    const n = M.punkte.length;
    // der Weg zwischen den beiden Lippen, der durchs Maul führt: der über den Punkt zwischen den Mundwinkeln
    const W0 = L.punkte.find((p) => p.mundwinkel)!;
    const zwischenWinkeln = (i: number): boolean => Math.hypot(M.punkte[i]!.ref.x - W0.ref.x, M.punkte[i]!.ref.y - W0.ref.y) < 1;
    const vor = (iB - iA + n) % n;
    const vorwaerts = Array.from({ length: vor + 1 }, (_, k) => (iA + k) % n).some(zwischenWinkeln);
    const [von, zahl] = vorwaerts ? [iA, vor] : [iB, n - vor];
    let weit = 0;
    for (let k = 0; k <= zahl; k++) weit = Math.max(weit, d(M.punkte[(von + k) % n]!.ref.x, M.punkte[(von + k) % n]!.ref.y));
    // und die Linie selbst (ihre Stellen im Netz) zwischen diesen Punkten
    const sA = M.punkte[von]!.s;
    const sB = M.punkte[(von + zahl) % n]!.s;
    let stellen = 0;
    let linie = 0;
    for (let j = 0; j < M.proben.length; j++) {
      const s = M.s[j]!;
      const drin = sA <= sB ? s >= sA && s <= sB : s >= sA || s <= sB;
      if (!drin) continue;
      stellen++;
      linie = Math.max(linie, d(M.ruhe[3 * j]!, M.ruhe[3 * j + 1]!));
    }
    // die Querlinie: ihr Punkt vorn liegt jetzt zwischen den Mundwinkeln
    const W = W0;
    const T = Q.punkte.find((p) => M.punkte.some((q) => q.kreuzung === p.kreuzung) && Math.abs(p.ref.x - W.ref.x) < 1);
    log(`Maul geformt: ${r.haut.n} Punkte, ${r.runden} Runden, Knicke über 60° ${f.ueber60}; Mittellinie im Maul: Punkte ${weit.toFixed(2)}, Linie (${stellen} Stellen) ${linie.toFixed(2)} neben der Maullinie von der Seite`);
    expect(weit).toBeLessThan(0.05);
    expect(stellen).toBeGreaterThan(3);
    expect(linie).toBeLessThan(1.5);
    expect(T).toBeDefined();
    expect(Math.abs(T!.ref.y - W.ref.y)).toBeLessThan(1);
    // Außen bleibt die Form im Rahmen dessen, was jede neue Linie bewegt: Die Mittellinie bekommt Punkte, wo sie nötig sind (mit
    // nur zwei Punkten an den Lippen wurde die Kugel um 21 verformt), die Querlinie ist nur im Maul hart. Gemessen: 1,7 nach der
    // Mittellinie, 6,2 nach der Querlinie (auch wenn sie ganz weich ist: Die Haut setzt sich an der neuen Linie).
    let aussen = 0;
    for (let v = 0; v < r.haut.n; v++) {
      const a = r.alt[v]!;
      if (a < 0 || vorher[3 * a]! < -40) continue;
      aussen = Math.max(aussen, Math.hypot(r.haut.pos[3 * v]! - vorher[3 * a]!, r.haut.pos[3 * v + 1]! - vorher[3 * a + 1]!, r.haut.pos[3 * v + 2]! - vorher[3 * a + 2]!));
    }
    log(`   hinter dem Maul (x > −40) bewegt sich die Haut um höchstens ${aussen.toFixed(2)}`);
    expect(aussen).toBeLessThan(8);
  }, 120000);

  it('sagt, warum es nicht geht: kein Ring, oder ein Ring ohne Griffe', () => {
    const { haut, loop } = maulKugel();
    expect(maulFormen(haut, [loop], 99, { naechsteId: 2, naechsteKreuzung: 1 })).toHaveProperty('fehler');
    const ohne: Loop = { ...loop, punkte: loop.punkte.map((p) => ({ s: p.s, ref: p.ref, cur: p.cur })) };
    expect(maulFormen(haut, [ohne], loop.id, { naechsteId: 2, naechsteKreuzung: 1 })).toHaveProperty('fehler');
  });
});
