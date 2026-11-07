// Form zuerst (07.11.2026), die Linie ist ihr Pfad (Florian: „ja genau zur Bézier-Kurve machen“; ohne Zusatzpunkte). Wie im Fenster
// (`apps/editor/src/form/kurven.ts`, Grundform): Jeder neue Loop bekommt seine Griffe genau angepasst und seine Stellen auf dem Pfad,
// springt örtlich auf ihn (Gedächtnis, Bereich um die Linie), eine Kreuzung ist ein Ort; jeder Zug zielt genau auf den neuen Pfad.
import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, type V3, hautAus, hautNormalen } from './kurven';
import {
  type Loop,
  LoopZug,
  bereichUm,
  eckenAuto,
  festlegen,
  griffeAnlegen,
  griffeUebernehmen,
  hatPfad,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  pfadAbweichung,
  pfadLagen,
  pfadParameter,
  pfadVersatz,
  punktEinfuegen,
  verschiebungLaengs,
} from './loops';
import { stueckNaechstes, stueckPunkt } from './pfad';
import { rundAusSeite } from './rund';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const lage = (L: ArrayLike<number>, j: number): V3 => ({ x: L[3 * j]!, y: L[3 * j + 1]!, z: L[3 * j + 2]! });
const abstand = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const kugel = () => {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: 6000 },
  );
  return hautAus(n.positionen, n.indizes);
};
const neben = (h: Haut) => {
  let max = 0;
  let summe = 0;
  for (let v = 0; v < h.n; v++) {
    const d = Math.abs(Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!) - 150);
    max = Math.max(max, d);
    summe += d;
  }
  return { max, mittel: summe / h.n };
};

/** Der neue Loop springt auf seinen Pfad: örtlich, jeder Punkt behält seine Krümmung (wie `linienAufPfad` im Fenster) */
function aufPfad(h: Haut, loops: Loop[], neu: Loop, MK: number): void {
  pfadParameter(neu);
  const d = pfadVersatz(neu)!;
  const bewegt: V3[] = [];
  const ecken = new Set<number>();
  let weit = 0;
  for (let j = 0; j < neu.proben.length; j++) {
    const w = Math.hypot(d[3 * j]!, d[3 * j + 1]!, d[3 * j + 2]!);
    if (w < 1e-9) continue;
    weit = Math.max(weit, w);
    bewegt.push(lage(neu.ruhe, j));
    for (const v of neu.proben[j]!.ecken) ecken.add(v);
  }
  const z = new LoopZug(h, loops, bereichUm(h, bewegt, Math.max(2 * MK, 3 * weit), ecken), false, 'gedaechtnis');
  z.schritt(
    loops.map((l) => (l === neu ? d : null)),
    12,
  );
  for (const l of loops) festlegen(h, l, !hatPfad(l));
}

/** Kugel mit drei Loops wie im Fenster: Ring waagerecht (Seite), Mitte (Top), Ring senkrecht (Seite) */
function dreiLoopsGenau(): { h: Haut; loops: Loop[]; MK: number } {
  let h = kugel();
  const MK = mittlereKante(h);
  let loops: Loop[] = [];
  let k = 1;
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 10)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
    const neu = loops[loops.length - 1]!;
    for (const x of loops.slice(0, -1))
      for (const f of kreuzungenZwischen(x, x.ruhe, neu, neu.ruhe, 0.25 * MK)) {
        // eine Kreuzung ist ein Ort: dort, wo der ältere Loop (mit Pfad) geteilt wird
        const pa = punktEinfuegen(x, f.sa, k, true);
        const pb = punktEinfuegen(neu, f.sb, k);
        pb.ref = { ...pa.ref };
        pb.cur = { ...pa.ref };
        k++;
      }
    eckenAuto(loops);
    griffeAnlegen(neu, neu.ruhe, true);
    aufPfad(h, loops, neu, MK);
  }
  return { h, loops, MK };
}

/** Punkte (je Loop: Index → Verschiebung) in `n` Schritten ziehen, aus den Kurven über die ganze Haut, Ziel genau der neue Pfad */
function ziehen(h: Haut, loops: Loop[], D: Map<Loop, Map<number, V3>>, n = 12): void {
  const z = new LoopZug(h, loops, null, true, 'kurven');
  const rest = loops.map((l, li) => pfadVersatz(l, z.start[li]!));
  const versch = (f: number) =>
    loops.map((l, li) => {
      const m = D.get(l);
      const d = m ? verschiebungLaengs(l, l.punkte.map((_, i) => ({ x: f * (m.get(i)?.x ?? 0), y: f * (m.get(i)?.y ?? 0), z: f * (m.get(i)?.z ?? 0) }))) : null;
      const r = rest[li]!;
      return Float64Array.from(r, (x, k) => x + (d ? d[k]! : 0));
    });
  for (let s = 1; s <= n; s++) z.schritt(versch(s / n), 2);
  z.schritt(versch(1), 4);
  for (const l of loops) {
    const m = D.get(l);
    if (!m) continue;
    griffeUebernehmen(l, l.punkte.map((_, i) => m.get(i) ?? { x: 0, y: 0, z: 0 }));
    l.punkte.forEach((p, i) => {
      const d = m.get(i);
      if (d) p.cur = { x: p.ref.x + d.x, y: p.ref.y + d.y, z: p.ref.z + d.z };
    });
  }
  for (const l of loops) festlegen(h, l, false);
}

describe('Die Linie ist ihr Pfad', () => {
  it('Anlegen: jede Linie liegt auf ihrem Pfad, die Proben sprangen nur quer, die Kugel ändert sich, so weit die Stücke den Kreis verfehlen', () => {
    const { h, loops } = dreiLoopsGenau();
    for (const l of loops) expect(pfadAbweichung(l)).toBeLessThan(0.05);
    const k = neben(h);
    log(`angelegt: Linie ↔ Pfad ${loops.map((l) => pfadAbweichung(l).toFixed(3)).join(' / ')}, Kugel bis ${k.max.toFixed(2)} (Mittel ${k.mittel.toFixed(3)})`);
    // drei Loops ohne Zusatzpunkte: zwei Halbkreise als ein Stück (1,4 % neben dem Kreis); gemessen 2,23 / 0,39
    expect(k.max).toBeLessThan(2.5);
    expect(k.mittel).toBeLessThan(0.5);
    // jede Probe liegt an ihrer Stelle auf dem Pfad dort, wo der Pfad ihr am nächsten ist (sonst wäre sie längs gerutscht)
    let laengs = 0;
    for (const l of loops) {
      const P = pfadLagen(l)!;
      for (let j = 0; j < l.proben.length; j++) {
        const t = j + 1 < l.proben.length ? lage(P, j + 1) : lage(P, j - 1);
        const p = lage(P, j);
        const r = { x: l.ruhe[3 * j]! - p.x, y: l.ruhe[3 * j + 1]! - p.y, z: l.ruhe[3 * j + 2]! - p.z };
        const tl = abstand(t, p) || 1;
        laengs = Math.max(laengs, Math.abs((r.x * (t.x - p.x) + r.y * (t.y - p.y) + r.z * (t.z - p.z)) / tl));
      }
    }
    expect(laengs).toBeLessThan(0.05);
  });

  it('Eine Kreuzung ist ein Ort auf beiden Pfaden; ein neuer Loop lässt die Stellen der alten Proben, wie sie sind', () => {
    const { loops } = dreiLoopsGenau();
    const nach = new Map<number, V3[]>();
    for (const l of loops)
      for (const p of l.punkte) {
        if (p.kreuzung === undefined) continue;
        nach.set(p.kreuzung, [...(nach.get(p.kreuzung) ?? []), p.ref]);
      }
    for (const orte of nach.values()) for (const o of orte) expect(abstand(o, orte[0]!)).toBeLessThan(1e-9);
    // der vierte Loop kreuzt die Mitte: deren alte Proben behalten s, die Kreuzung liegt auf beiden Linien
    let { h, loops: L } = dreiLoopsGenau();
    const mitte = L.find((l) => l.art === 'mitte')!;
    const sVorher = new Map(mitte.proben.map((p, j) => [p.ecken[0], mitte.s[j]!]));
    L.push(loopAusSchnitt(h, 'seite', [-60, 200], [-60, -200], 9, 10)!);
    const r = loopEinsetzen(h, L, L.length - 1)!;
    h = r.haut;
    L = r.loops;
    const m2 = L.find((l) => l.art === 'mitte')!;
    let geaendert = 0;
    m2.proben.forEach((p, j) => {
      const s = sVorher.get(p.ecken[0]);
      if (s !== undefined) geaendert = Math.max(geaendert, Math.abs(s - m2.s[j]!));
    });
    expect(geaendert).toBe(0);
    const neu = L[L.length - 1]!;
    const f = kreuzungenZwischen(m2, m2.ruhe, neu, neu.ruhe, 0.25 * mittlereKante(h));
    expect(f.length).toBe(2);
    for (const x of f) {
      const pa = punktEinfuegen(m2, x.sa, 99, true);
      // der geteilte Punkt der Mitte liegt dort, wo sich die Linien kreuzen (nicht längs daneben)
      expect(abstand(pa.ref, x.p)).toBeLessThan(0.05);
    }
  });

  it('Hin und zurück: Punkt, Linien und Haut kommen genau wieder (aus den Kurven, nach dem ersten Setzen)', () => {
    const { h, loops } = dreiLoopsGenau();
    const mitte = loops.find((l) => l.art === 'mitte')!;
    const i = mitte.punkte.reduce((b, p, k) => (p.ref.y > mitte.punkte[b]!.ref.y ? k : b), 0);
    const kr = mitte.punkte[i]!.kreuzung!;
    const an = (d: V3) => {
      const D = new Map<Loop, Map<number, V3>>();
      for (const l of loops)
        l.punkte.forEach((p, k) => {
          if (p.kreuzung === kr) D.set(l, new Map([[k, d]]));
        });
      return D;
    };
    // erst setzen (der Löser rechnet die ganze Haut aus den Kurven), dann messen
    ziehen(h, loops, an({ x: 0, y: 0, z: 0 }), 15);
    const p0 = { ...mitte.punkte[i]!.ref };
    const linien0 = loops.map((l) => Float64Array.from(l.ruhe));
    const haut0 = Float64Array.from(h.pos);
    const nor0 = hautNormalen(h);
    ziehen(h, loops, an({ x: 0, y: 120, z: 0 }));
    for (const l of loops) expect(pfadAbweichung(l)).toBeLessThan(0.1);
    ziehen(h, loops, an({ x: 0, y: -120, z: 0 }));
    expect(abstand(mitte.punkte[i]!.ref, p0)).toBeLessThan(1e-9);
    let linie = 0;
    loops.forEach((l, li) => {
      for (let j = 0; j < l.proben.length; j++) linie = Math.max(linie, abstand(lage(l.ruhe, j), lage(linien0[li]!, j)));
    });
    // die Form: Abstand längs der Normale (die Punkte dürfen in der Fläche gleiten, die Haut verteilt sie aus den Kurven neu)
    let haut = 0;
    for (let v = 0; v < h.n; v++) {
      const d = (h.pos[3 * v]! - haut0[3 * v]!) * nor0[3 * v]! + (h.pos[3 * v + 1]! - haut0[3 * v + 1]!) * nor0[3 * v + 1]! + (h.pos[3 * v + 2]! - haut0[3 * v + 2]!) * nor0[3 * v + 2]!;
      haut = Math.max(haut, Math.abs(d));
    }
    log(`hin und zurück: Linien bis ${linie.toFixed(3)}, Haut bis ${haut.toFixed(3)}, Linie ↔ Pfad ${loops.map((l) => pfadAbweichung(l).toFixed(3)).join(' / ')}`);
    expect(linie).toBeLessThan(0.05);
    expect(haut).toBeLessThan(0.3);
  });

  it('Nächster Punkt auf einem Stück: Newton findet ihn auch von weit weg', () => {
    const P0 = { x: 0, y: 0, z: 0 };
    const a = { x: 40, y: 60, z: 0 };
    const b = { x: -40, y: 60, z: 10 };
    const P3 = { x: 120, y: 0, z: 0 };
    for (const t of [0.1, 0.37, 0.5, 0.82]) {
      const q = stueckPunkt(P0, a, b, P3, t);
      expect(Math.abs(stueckNaechstes(P0, a, b, P3, q, t > 0.5 ? 0.2 : 0.8) - t)).toBeLessThan(1e-6);
    }
  });
});
