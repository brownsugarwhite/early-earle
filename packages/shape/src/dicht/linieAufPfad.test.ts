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
  pfadBei,
  pfadLagen,
  pfadParameter,
  pfadVersatz,
  punktEinfuegen,
  verschiebungLaengs,
} from './loops';
import { stueckNaechstes, stueckPunkt } from './pfad';
import { rundAusSeite } from './rund';
import { verdichten } from './verdichten';

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

/** Abstand von q zur Strecke a–b */
const zurStrecke = (q: V3, a: V3, b: V3): number => {
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const t = Math.max(0, Math.min(1, ((q.x - a.x) * d.x + (q.y - a.y) * d.y + (q.z - a.z) * d.z) / (d.x * d.x + d.y * d.y + d.z * d.z || 1)));
  return abstand(q, { x: a.x + t * d.x, y: a.y + t * d.y, z: a.z + t * d.z });
};
/** wie weit die Linie des Netzes (Strecken zwischen den Proben) ihre Kurve abschneidet: sieben Stellen je Strecke */
const sehnenRest = (l: Loop): number => {
  const n = l.proben.length;
  const zu = l.art !== 'ring';
  let m = 0;
  for (let j = 0; j < (zu ? n : n - 1); j++) {
    const k = (j + 1) % n;
    const s0 = l.s[j]!;
    const s1 = k > j ? l.s[k]! : l.s[k]! + l.laenge;
    for (let i = 1; i < 8; i++) {
      const s = s0 + ((s1 - s0) * i) / 8;
      const q = pfadBei(l, zu && s >= l.laenge ? s - l.laenge : s);
      if (q) m = Math.max(m, zurStrecke(q, lage(l.ruhe, j), lage(l.ruhe, k)));
    }
  }
  return m;
};
/** wie weit die Haut zwischen den Enden ihrer Kanten von der runden Fläche abweicht (Bogen: Länge × Drehung der Normale / 8) */
const flaechenRest = (h: Haut): number => {
  const nor = hautNormalen(h);
  const n = (v: number) => {
    const l = Math.hypot(nor[3 * v]!, nor[3 * v + 1]!, nor[3 * v + 2]!) || 1;
    return { x: nor[3 * v]! / l, y: nor[3 * v + 1]! / l, z: nor[3 * v + 2]! / l };
  };
  let m = 0;
  for (let v = 0; v < h.n; v++)
    for (const w of h.nachbarn[v]!) {
      if (w < v) continue;
      const a = n(v);
      const b = n(w);
      const c = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
      m = Math.max(m, (abstand(lage(h.pos, v), lage(h.pos, w)) * Math.acos(c)) / 8);
    }
  return m;
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

  it('Genauigkeit (08.11.): Am kleinen Ohr aus dem Ring wird die Linie so fein, dass sie höchstens MK/40 von ihrer Kurve abweicht', () => {
    const { h, loops, MK } = dreiLoopsGenau();
    const genau = MK / 40;
    // die unberührte Startkugel und drei Loops auf ihr: nichts zu teilen (auch mit der Haut: Die Startkugel weicht höchstens 0,16 ab)
    const kugel0 = kugel();
    expect(flaechenRest(kugel0)).toBeLessThan(genau);
    expect(verdichten(kugel0, [], 1.75 * MK, { genau, genauHaut: true, kurz: 0 })).toBeNull();
    for (const l of loops) expect(sehnenRest(l)).toBeLessThan(genau);
    expect(verdichten(h, loops, 1.75 * MK, { genau, kurz: 0 })).toBeNull();
    // Florians Bild: auf dem senkrechten Ring vier Punkte bei 40°, 50°, 60°, 70° vom Scheitel, die zwei mittleren 70 nach außen
    const ring = loops.find((l) => l.art === 'ring' && l.punkte.some((p) => Math.abs(p.ref.y) > 140))!;
    const winkel = (q: V3) => (Math.atan2(q.z, q.y) * 180) / Math.PI;
    for (const w of [40, 50, 60, 70]) {
      let j = 0;
      for (let i = 1; i < ring.proben.length - 1; i++) if (Math.abs(winkel(lage(ring.ruhe, i)) - w) < Math.abs(winkel(lage(ring.ruhe, j)) - w)) j = i;
      punktEinfuegen(ring, (ring.s[j]! + ring.s[j + 1]!) / 2, undefined, true);
    }
    const aussen = { x: 0, y: 70 * Math.cos((55 * Math.PI) / 180), z: 70 * Math.sin((55 * Math.PI) / 180) };
    const mitte = ring.punkte.filter((p) => p.kreuzung === undefined && winkel(p.ref) > 45 && winkel(p.ref) < 65);
    expect(mitte.length).toBe(2);
    ziehen(h, loops, new Map([[ring, new Map(mitte.map((p) => [ring.punkte.indexOf(p), aussen]))]]));
    const li = loops.indexOf(ring);
    const vorher = { linie: sehnenRest(ring), flaeche: flaechenRest(h) };
    const ohne = verdichten(h, loops, 1.75 * MK, { kurz: 0.5 * MK })!;
    const v = verdichten(h, loops, 1.75 * MK, { genau, kurz: 0.5 * MK })!;
    const haut = verdichten(h, loops, 1.75 * MK, { genau, genauHaut: true, kurz: 0.5 * MK })!;
    const nachher = { linie: sehnenRest(v.loops[li]!), flaeche: flaechenRest(v.haut), mitHaut: flaechenRest(haut.haut) };
    log(
      `Ohr: Linie ↔ Kurve ${vorher.linie.toFixed(2)} → ohne Genauigkeit ${sehnenRest(ohne.loops[li]!).toFixed(2)}, mit ${nachher.linie.toFixed(3)}; ` +
        `Fläche ${vorher.flaeche.toFixed(2)} → ${flaechenRest(ohne.haut).toFixed(2)} / ${nachher.flaeche.toFixed(2)}, mit der Haut (Versuch) ` +
        `${nachher.mitHaut.toFixed(3)} (Grenze ${genau.toFixed(3)}); Punkte ${h.n} → ${ohne.haut.n} / ${v.haut.n} / ${haut.haut.n}`,
    );
    expect(vorher.linie).toBeGreaterThan(3 * genau);
    expect(sehnenRest(ohne.loops[li]!)).toBeGreaterThan(3 * genau);
    expect(nachher.linie).toBeLessThanOrEqual(genau);
    // mit der Haut (Versuch): neue Punkte liegen rund (nach den Normalen der Enden), nicht genau, die Fläche danach knapp an der Grenze
    expect(nachher.mitHaut).toBeLessThan(1.5 * genau);
    expect(sehnenRest(haut.loops[li]!)).toBeLessThanOrEqual(genau);
    // geschlossen, spiegelgleich, die Ketten heil, die Punkte an Ort
    const zaehl = new Map<string, number>();
    for (let t = 0; t < v.haut.tri.length; t += 3)
      for (let e = 0; e < 3; e++) {
        const a = v.haut.tri[t + e]!;
        const b = v.haut.tri[t + ((e + 1) % 3)]!;
        const k = a < b ? `${a}:${b}` : `${b}:${a}`;
        zaehl.set(k, (zaehl.get(k) ?? 0) + 1);
      }
    expect([...zaehl.values()].filter((c) => c !== 2).length).toBe(0);
    for (let x = 0; x < v.haut.n; x++) expect(v.haut.spiegel[x]!).toBeGreaterThanOrEqual(0);
    for (const l of v.loops) {
      const k = l.proben.map((p) => p.ecken[0]);
      for (let j = 0; j + 1 < k.length; j++) expect(v.haut.nachbarn[k[j]!]!.includes(k[j + 1]!)).toBe(true);
      for (let j = 1; j < l.s.length; j++) expect(l.s[j]!).toBeGreaterThan(l.s[j - 1]!);
    }
    for (const [i, l] of v.loops.entries()) expect(l.punkte.map((p) => p.ref)).toEqual(loops[i]!.punkte.map((p) => p.ref));
    // ein zweites Mal: nichts mehr zu teilen, und das Zusammenlegen nimmt die Feinheit nicht zurück
    const w = verdichten(v.haut, v.loops, 1.75 * MK, { genau, kurz: 0.5 * MK });
    if (w) expect(sehnenRest(w.loops[li]!)).toBeLessThanOrEqual(genau);
    log(`zweites Mal: ${w ? `+${w.neu} −${w.gelegt}` : 'nichts'}`);
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
