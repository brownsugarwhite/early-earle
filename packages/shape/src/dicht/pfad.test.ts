// Form zuerst (06.11.2026), Teil A: gespeicherte Bézier-Griffe (`pfad.ts`, Griffe in `loops.ts`).
import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type V3, hautAus } from './kurven';
import {
  type Loop,
  formAusZeichnung,
  griffeAnlegen,
  griffeBei,
  griffeUebernehmen,
  griffZiehen,
  hatGriffe,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  punkteLoeschen,
  ringEnde,
  verschiebungLaengs,
} from './loops';
import { stueckAnpassen, stueckPunkt, stueckTeilen } from './pfad';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
const kugel = () => {
  const netz = rundAusSeite(kreis(150), { dreiecke: 6000 });
  return hautAus(netz.positionen, netz.indizes);
};
const v = (x: number, y: number, z: number): V3 => ({ x, y, z });
const ab = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const lage = (L: Float64Array, j: number): V3 => ({ x: L[3 * j]!, y: L[3 * j + 1]!, z: L[3 * j + 2]! });
const winkel = (a: V3, b: V3) => {
  const c = (a.x * b.x + a.y * b.y + a.z * b.z) / (Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
};

/** Lage auf dem Pfad aus den gespeicherten Griffen bei Stelle s (wie `verschiebungLaengs` sie rechnet: t aus s) */
function aufPfad(l: Loop, s: number): V3 {
  const P = l.punkte;
  const m = P.length;
  for (let i = 0; i < (l.art === 'ring' ? m - 1 : m); i++) {
    const a = P[i]!;
    const b = P[(i + 1) % m]!;
    const s0 = a.s;
    const s1 = i + 1 < m ? b.s : b.s + l.laenge;
    const x = l.art !== 'ring' && s < s0 ? s + l.laenge : s;
    if (x < s0 || x > s1) continue;
    return stueckPunkt(a.ref, a.aus!, b.ein!, b.ref, (x - s0) / (s1 - s0 || 1));
  }
  throw new Error('Stelle außerhalb');
}

/** Kugel mit drei Achsen-Loops, eingesetzt, Kreuzungen als Punkte, Griffe angelegt */
function dreiLoops() {
  let h = kugel();
  const fang = 8;
  let loops: Loop[] = [];
  const schnitte: [Parameters<typeof loopAusSchnitt>[1], [number, number], [number, number]][] = [
    ['seite', [0, 200], [0, -200]],
    ['front', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
  ];
  let k = 1;
  schnitte.forEach(([a, A, B], i) => {
    const l = loopAusSchnitt(h, a, A, B, i + 1, fang)!;
    loops.push(l);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
    // wie im Fenster: erst die Kreuzungen (in den alten Loops geteilt), dann liest der neue Loop seine Griffe aus der Linie
    const tol = 0.25 * mittlereKante(h);
    const neu = loops[loops.length - 1]!;
    for (const x of loops.slice(0, -1)) {
      for (const f of kreuzungenZwischen(x, x.ruhe, neu, neu.ruhe, tol)) {
        punktEinfuegen(x, f.sa, k);
        punktEinfuegen(neu, f.sb, k);
        k++;
      }
    }
    griffeAnlegen(neu);
  });
  return { h, loops };
}

describe('Bézier-Stück', () => {
  it('Teilen (de Casteljau) gibt genau dasselbe Stück, Anpassen findet ein bekanntes Stück wieder', () => {
    const P0 = v(0, 0, 0);
    const a = v(30, 40, 5);
    const b = v(-10, 35, -8);
    const P3 = v(100, 10, 20);
    for (const t0 of [0.2, 0.5, 0.83]) {
      const r = stueckTeilen(P0, a, b, P3, t0);
      let f = 0;
      for (let k = 0; k <= 20; k++) {
        const t = k / 20;
        const alt1 = stueckPunkt(P0, a, b, P3, t * t0);
        const neu1 = stueckPunkt(P0, r.a1, r.ein, r.F, t);
        const alt2 = stueckPunkt(P0, a, b, P3, t0 + t * (1 - t0));
        const neu2 = stueckPunkt(r.F, r.aus, r.b2, P3, t);
        f = Math.max(f, ab(alt1, neu1), ab(alt2, neu2));
      }
      expect(f).toBeLessThan(1e-9);
      // der neue Punkt ist glatt: seine Griffe liegen auf einer Geraden
      expect(180 - winkel(r.ein, r.aus)).toBeLessThan(1e-6);
    }
    const t = Array.from({ length: 15 }, (_, j) => (j + 1) / 16);
    const q = t.map((x) => stueckPunkt(P0, a, b, P3, x));
    const frei = stueckAnpassen(P0, P3, t, q);
    expect(ab(frei.a, a) + ab(frei.b, b)).toBeLessThan(1e-6);
    const lang = Math.hypot(a.x, a.y, a.z);
    const lbng = Math.hypot(b.x, b.y, b.z);
    const fest = stueckAnpassen(P0, P3, t, q, [v(a.x / lang, a.y / lang, a.z / lang), v(b.x / lbng, b.y / lbng, b.z / lbng)]);
    expect(ab(fest.a, a) + ab(fest.b, b)).toBeLessThan(1e-6);
  });
});

describe('Gespeicherte Griffe am Loop', () => {
  it('Anlegen: die Linie bleibt, Ringe bekommen Punkte an ihren Enden, die Griffe beschreiben die Linie (Kugel)', () => {
    const h = kugel();
    const ring = loopAusSchnitt(h, 'seite', [0, 200], [0, -200], 1, 8)!;
    const ruhe = Float64Array.from(ring.ruhe);
    griffeAnlegen(ring);
    expect([...ring.ruhe]).toEqual([...ruhe]);
    expect(ring.punkte.length).toBe(2);
    // eine Kreuzung am Ende eines Rings ist sein Spiegelpunkt (kein zweiter Punkt an derselben Stelle)
    expect(punktEinfuegen(ring, 0, 7)).toBe(ring.punkte[0]);
    expect(ring.punkte.length).toBe(2);
    const { loops } = dreiLoops();
    for (const l of loops) {
      expect(hatGriffe(l)).toBe(true);
      if (l.art === 'ring') {
        expect(ringEnde(l, 0)).toBe('anfang');
        expect(ringEnde(l, l.punkte.length - 1)).toBe('ende');
      }
      // Abstand der Proben zum Pfad aus den Griffen
      let f = 0;
      for (let j = 0; j < l.proben.length; j++) f = Math.max(f, ab(lage(l.ruhe, j), aufPfad(l, l.s[j]!)));
      log(`${l.art}: ${l.punkte.length} Punkte, Proben bis ${f.toFixed(2)} neben dem Pfad`);
      // Viertelkreise (Radius 150) aus der Kette im Netz (Punkte auf Kanten, t aus der Bogenlänge der Kette): gemessen 1,17
      expect(f).toBeLessThan(1.5);
      // glatte Punkte: Griffe auf einer Geraden; Spiegelpunkte senkrecht zur Mittelebene (die Kugel ist dort rund)
      l.punkte.forEach((p, i) => {
        const g = griffeBei(l, l.ruhe, i);
        expect(180 - winkel(g.ein!, g.aus!)).toBeLessThan(1e-4);
      });
    }
  });

  it('Einfügen teilt das Stück (de Casteljau): die Linie bleibt, der neue Punkt ist glatt, die Nachbargriffe behalten ihre Richtung', () => {
    const { loops } = dreiLoops();
    const l = loops[0]!;
    const ruhe = Float64Array.from(l.ruhe);
    const s = 0.37 * l.laenge;
    const i0 = l.punkte.findIndex((q) => q.s > s) - 1;
    const a = l.punkte[i0]!;
    const b = l.punkte[i0 + 1]!;
    const ra = { ...a.aus! };
    const rb = { ...b.ein! };
    const fehler = () => {
      let f = 0;
      for (let j = 0; j < l.proben.length; j++) f = Math.max(f, ab(lage(l.ruhe, j), aufPfad(l, l.s[j]!)));
      return f;
    };
    const f0 = fehler();
    const p = punktEinfuegen(l, s);
    expect([...l.ruhe]).toEqual([...ruhe]);
    expect(180 - winkel(p.ein!, p.aus!)).toBeLessThan(1e-4);
    expect(winkel(ra, a.aus!)).toBeLessThan(1e-4);
    expect(winkel(rb, b.ein!)).toBeLessThan(1e-4);
    // der Punkt liegt auf der Linie, die geteilten Stücke beschreiben sie so gut wie das alte (bis auf dessen Abstand an der Stelle)
    log(`eingefügt bei ${s.toFixed(0)}: Pfad neben der Linie ${f0.toFixed(2)} → ${fehler().toFixed(2)}`);
    expect(fehler()).toBeLessThan(f0 + 0.5);
  });

  it('Ein Zug und Übernehmen: der Pfad danach ist genau Ruhe + Verschiebung (Punkt, Griff, Ecke von selbst)', () => {
    const { loops } = dreiLoops();
    const l = loops[0]!;
    // der Pfad vor dem Zug (die Linie liegt bis ~1 Einheit daneben; verglichen wird Pfad gegen Pfad)
    const vorher = Array.from({ length: l.proben.length }, (_, j) => aufPfad(l, l.s[j]!));
    const i = l.punkte.findIndex((p) => !ringEnde(l, l.punkte.indexOf(p)));
    const D = l.punkte.map((_, k) => (k === i ? v(0, 25, 10) : v(0, 0, 0)));
    const g = l.punkte.map((_, k) => (k === i ? griffZiehen(l, l.ruhe, i, 'aus', v(5, -12, 3)) : undefined));
    // eine Ecke von selbst daneben (wie an der Kreuzung mit einer Kante)
    const j2 = (i + 1) % l.punkte.length;
    if (!ringEnde(l, j2)) l.punkte[j2]!.autoEcke = true;
    const d = verschiebungLaengs(l, D, g);
    griffeUebernehmen(l, D, g);
    l.punkte.forEach((p, k) => (p.ref = { x: p.ref.x + D[k]!.x, y: p.ref.y + D[k]!.y, z: p.ref.z + D[k]!.z }));
    let f = 0;
    for (let j = 0; j < l.proben.length; j++) {
      const soll = { x: vorher[j]!.x + d[3 * j]!, y: vorher[j]!.y + d[3 * j + 1]!, z: vorher[j]!.z + d[3 * j + 2]! };
      f = Math.max(f, ab(soll, aufPfad(l, l.s[j]!)));
    }
    log(`Zug am Punkt ${i}: Pfad gegen Ruhe + Verschiebung ${f.toExponential(1)}`);
    expect(f).toBeLessThan(1e-9);
  });

  it('Löschen wie in Illustrator: die Nachbarn verbinden sich über ihre Griffe (Richtung bleibt), die Linie folgt dem neuen Stück', () => {
    const h = kugel();
    // Augen-Form mit acht Punkten auf der Seite der Kugel
    const uv: [number, number][] = Array.from({ length: 64 }, (_, i) => [-60 + 35 * Math.cos((2 * Math.PI * i) / 64), 40 + 35 * Math.sin((2 * Math.PI * i) / 64)]);
    const l = formAusZeichnung(h, 'seite', uv, Array.from({ length: 8 }, (_, i) => 8 * i), 1)!;
    griffeAnlegen(l);
    expect(l.punkte.length).toBe(8);
    const p = l.punkte[3]!;
    const a = l.punkte[2]!;
    const b = l.punkte[4]!;
    const ra = { ...a.aus! };
    const rb = { ...b.ein! };
    const d = punkteLoeschen(l, new Set([p]))!;
    expect(l.punkte.length).toBe(7);
    expect(winkel(ra, a.aus!)).toBeLessThan(1e-6);
    expect(winkel(rb, b.ein!)).toBeLessThan(1e-6);
    // die Linie bewegt sich nur zwischen den Nachbarn, und dort wenig (ein Achtel eines Kreises von Radius 35 wird ein Viertel)
    let aussen = 0;
    let innen = 0;
    for (let j = 0; j < l.proben.length; j++) {
      const w = Math.hypot(d[3 * j]!, d[3 * j + 1]!, d[3 * j + 2]!);
      const s = l.s[j]!;
      if (s > a.s && s < b.s) innen = Math.max(innen, w);
      else aussen = Math.max(aussen, w);
    }
    log(`gelöscht: zwischen den Nachbarn bis ${innen.toFixed(2)} bewegt, sonst ${aussen.toFixed(3)}`);
    expect(aussen).toBe(0);
    expect(innen).toBeGreaterThan(0);
    expect(innen).toBeLessThan(2);
    // Kreuzungen, Spiegelpunkte und die letzten zwei Punkte bleiben
    const { loops } = dreiLoops();
    const ring = loops[0]!;
    expect(punkteLoeschen(ring, new Set([ring.punkte[0]!]))).toBeNull();
    const kreuz = ring.punkte.find((q) => q.kreuzung !== undefined)!;
    expect(punkteLoeschen(ring, new Set([kreuz]))).toBeNull();
  });
});
