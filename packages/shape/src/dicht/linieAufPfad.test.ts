// Form zuerst (07.11.2026), die Linie ist ihr Pfad (Florian: „ja genau zur Bézier-Kurve machen“; ohne Zusatzpunkte). Wie im Fenster
// (`apps/editor/src/form/kurven.ts`, Grundform): Jeder neue Loop bekommt seine Griffe genau angepasst und seine Stellen auf dem Pfad,
// springt örtlich auf ihn (Gedächtnis, Bereich um die Linie), eine Kreuzung ist ein Ort; jeder Zug zielt genau auf den neuen Pfad.
import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, type V3, hautAus, hautNormalen } from './kurven';
import {
  type Loop,
  LoopZug,
  type ZeichnungsStueck,
  bereichUm,
  eckenAuto,
  festlegen,
  formAusZeichnung,
  griffeAnlegen,
  griffeAusZeichnung,
  griffeUebernehmen,
  hatPfad,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  pfadAbweichung,
  pfadBei,
  pfadKanten,
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
    // eigene Genauigkeit der Haut (12.11., kleines Rechennetz): gröber als die der Linien gibt weniger neue Punkte, die Fläche hält
    // diese Grenze, und die Linie bleibt so genau wie vorher
    const grob = verdichten(h, loops, 1.75 * MK, { genau, genauHaut: true, genauFlaeche: 2.5 * genau, kurz: 0.5 * MK })!;
    log(`Ohr, Haut auf ${(2.5 * genau).toFixed(3)} statt ${genau.toFixed(3)}: Punkte ${grob.haut.n} statt ${haut.haut.n}, Fläche ${flaechenRest(grob.haut).toFixed(3)}`);
    expect(grob.haut.n).toBeLessThan(haut.haut.n);
    expect(flaechenRest(grob.haut)).toBeLessThan(1.5 * 2.5 * genau);
    expect(flaechenRest(grob.haut)).toBeGreaterThan(nachher.mitHaut);
    expect(sehnenRest(grob.loops[li]!)).toBeLessThanOrEqual(genau);
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

  it('Stift über zwei Linien (08.11.): Die Form liegt im Blatt genau wie gezeichnet, die Haut bleibt fast, wie sie war', () => {
    // Florian: „Wenn ich eine Form mit P erstelle und diese über die vorhandenen Linien ziehe, ist die Form sehr ungenau und wird von
    // den auf den Kreuzungen stehenden Punkten verzogen.“ Wie im Fenster: Kreis mit Radius 78 um die Kreuzung der beiden Ringe (Seite),
    // vier glatte Anker auf den Diagonalen, Griffe wie ein Kreis; er kreuzt jeden Ring zweimal.
    const bau = (alt: boolean, ecken = false) => {
      const { h: h0, loops: L0, MK } = dreiLoopsGenau();
      let h = h0;
      let loops = L0;
      const R = 78;
      const c = 0.5523 * R;
      const anker = [45, 135, 225, 315].map((w) => {
        const t = (w * Math.PI) / 180;
        return { p: [10 + R * Math.cos(t), R * Math.sin(t)] as const, g: ecken ? ([0, 0] as const) : ([-c * Math.sin(t), c * Math.cos(t)] as const) };
      });
      const zeichnung: ZeichnungsStueck[] = anker.map((p, i) => {
        const q = anker[(i + 1) % anker.length]!;
        return [p.p, [p.p[0] + p.g[0], p.p[1] + p.g[1]], [q.p[0] - q.g[0], q.p[1] - q.g[1]], q.p];
      });
      // abgetastet wie im Fenster (`stiftFertig`)
      const uv: [number, number][] = [];
      const knoten: number[] = [];
      for (const z of zeichnung) {
        knoten.push(uv.length);
        const n = 24;
        for (let k = 0; k < n; k++) {
          const q = stueckPunkt({ x: z[0][0], y: z[0][1], z: 0 }, { x: z[1][0] - z[0][0], y: z[1][1] - z[0][1], z: 0 }, { x: z[2][0] - z[3][0], y: z[2][1] - z[3][1], z: 0 }, { x: z[3][0], y: z[3][1], z: 0 }, k / n);
          uv.push([q.x, q.y]);
        }
      }
      const l = formAusZeichnung(h, 'seite', uv, knoten, 99)!;
      loops.push(l);
      const r = loopEinsetzen(h, loops, loops.length - 1)!;
      h = r.haut;
      loops = r.loops;
      const neu = loops[loops.length - 1]!;
      let k = 100;
      for (const x of loops.slice(0, -1))
        for (const f of kreuzungenZwischen(x, x.ruhe, neu, neu.ruhe, 0.25 * MK)) {
          const pa = punktEinfuegen(x, f.sa, k, true);
          const pb = punktEinfuegen(neu, f.sb, k);
          pb.ref = { ...pa.ref };
          pb.cur = { ...pa.ref };
          k++;
        }
      eckenAuto(loops);
      griffeAnlegen(neu, neu.ruhe, true);
      if (alt) {
        // wie bis heute: jeder Anker behält den Griff des ganzen gezeichneten Stücks (in die Fläche gehoben), die Kreuzungen den abgelesenen
        const nor = hautNormalen(h);
        for (const p of neu.punkte) {
          const a = anker.find((x) => Math.hypot(x.p[0] - p.ref.x, x.p[1] - p.ref.y) < 0.5);
          if (!a) continue;
          let j = 0;
          for (let i = 1; i < neu.s.length; i++) if (Math.abs(neu.s[i]! - p.s) < Math.abs(neu.s[j]! - p.s)) j = i;
          const v = neu.proben[j]!.ecken[0];
          const nn = { x: nor[3 * v]!, y: nor[3 * v + 1]!, z: nor[3 * v + 2]! };
          const kz = -(nn.x * a.g[0] + nn.y * a.g[1]) / nn.z;
          p.aus = { x: a.g[0], y: a.g[1], z: kz };
          p.ein = { x: -a.g[0], y: -a.g[1], z: -kz };
        }
      } else expect(griffeAusZeichnung(h, neu, 'seite', zeichnung)).toBe(true);
      // im Blatt: Pfad gegen die Zeichnung (dicht abgetastet)
      const dicht: V3[] = [];
      for (const z of zeichnung)
        for (let i = 0; i < 400; i++)
          dicht.push(stueckPunkt({ x: z[0][0], y: z[0][1], z: 0 }, { x: z[1][0] - z[0][0], y: z[1][1] - z[0][1], z: 0 }, { x: z[2][0] - z[3][0], y: z[2][1] - z[3][1], z: 0 }, { x: z[3][0], y: z[3][1], z: 0 }, i / 400));
      let blatt = 0;
      for (let i = 0; i < neu.punkte.length; i++) {
        const A = neu.punkte[i]!;
        const B = neu.punkte[(i + 1) % neu.punkte.length]!;
        for (let s = 0; s <= 20; s++) {
          const q = stueckPunkt(A.ref, A.aus!, B.ein!, B.ref, s / 20);
          blatt = Math.max(blatt, Math.min(...dicht.map((d) => Math.hypot(d.x - q.x, d.y - q.y))));
        }
      }
      pfadParameter(neu);
      const rest = pfadAbweichung(neu);
      const vorher = Float64Array.from(h.pos);
      aufPfad(h, loops, neu, MK);
      let haut = 0;
      for (let v = 0; v < h.n; v++) haut = Math.max(haut, abstand(lage(vorher, v), lage(h.pos, v)));
      const griffe = neu.punkte.map((p) => `${p.kreuzung !== undefined ? 'K' : p.ecke ? '◆' : '●'}(${p.ref.x.toFixed(2)},${p.ref.y.toFixed(2)},${p.ref.z.toFixed(2)}) ein ${Math.hypot(p.ein!.x, p.ein!.y).toFixed(1)} aus ${Math.hypot(p.aus!.x, p.aus!.y).toFixed(1)}`).join(' | ');
      return { blatt, rest, haut, griffe, punkte: neu.punkte.length, kreuzungen: neu.punkte.filter((p) => p.kreuzung !== undefined).length };
    };
    const alt = bau(true);
    const neu = bau(false);
    const quadrat = bau(false, true);
    log(`Quadrat aus Ecken: Pfad im Blatt bis ${quadrat.blatt.toFixed(3)}, Linie bis ${quadrat.rest.toFixed(3)} neben dem Pfad, Haut bis ${quadrat.haut.toFixed(3)} bewegt; ${quadrat.griffe}`);
    log(`Stift über zwei Linien, alt: Pfad im Blatt bis ${alt.blatt.toFixed(2)} neben der Zeichnung, Linie bis ${alt.rest.toFixed(2)} neben dem Pfad, Haut bis ${alt.haut.toFixed(2)} bewegt`);
    log(`neu: ${neu.punkte} Punkte (${neu.kreuzungen} Kreuzungen), Pfad im Blatt bis ${neu.blatt.toFixed(3)}, Linie bis ${neu.rest.toFixed(3)} neben dem Pfad, Haut bis ${neu.haut.toFixed(3)} bewegt`);
    expect(neu.kreuzungen).toBe(4);
    // die Gegenprobe (wie bis heute) fällt durch
    expect(alt.blatt).toBeGreaterThan(2);
    expect(neu.blatt).toBeLessThan(0.05);
    expect(neu.haut).toBeLessThan(0.3);
    // aus Ecken (gerade Stücke): an jeder Ecke ein Drittel der Sehne; eine Kreuzung sitzt auf der alten Linie, bis 0,09 neben der Geraden
    expect(quadrat.kreuzungen).toBe(4);
    expect(quadrat.blatt).toBeLessThan(0.3);
    expect(quadrat.haut).toBeLessThan(0.4);
    expect(quadrat.griffe).not.toContain(' 0.0');
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

// Plan vom 12.11., Schritt 1 „glatte Anzeige“: Die Anzeige verfeinert jede Kante der Haut auf einer Linie längs ihres Pfads. Dafür
// gibt `pfadKanten` je Kante das Stück des Pfads zwischen ihren beiden Proben als eigenen kubischen Bézier.
describe('Pfadstücke je Kante der Haut (`pfadKanten`)', () => {
  const mitte = (k: readonly V3[]): V3 => ({
    x: (k[0]!.x + 3 * k[1]!.x + 3 * k[2]!.x + k[3]!.x) / 8,
    y: (k[0]!.y + 3 * k[1]!.y + 3 * k[2]!.y + k[3]!.y) / 8,
    z: (k[0]!.z + 3 * k[1]!.z + 3 * k[2]!.z + k[3]!.z) / 8,
  });

  it('Enden auf den Proben des Pfads, die Mitte jedes Stücks auf dem Pfad, die Punkte der Haut sind die der Proben', () => {
    const { loops } = dreiLoopsGenau();
    for (const l of loops) {
      const K = pfadKanten(l)!;
      const P = pfadLagen(l)!;
      const n = l.proben.length;
      expect(K.length).toBeGreaterThan(0);
      expect(K.length).toBeLessThanOrEqual(l.art === 'ring' ? n - 1 : n);
      let ende = 0;
      let innen = 0;
      for (const e of K) {
        ende = Math.max(ende, abstand(e.k[0], lage(P, e.ja)), abstand(e.k[3], lage(P, e.jb)));
        expect(e.a).toBe(l.proben[e.ja]!.ecken[0]);
        expect(e.b).toBe(l.proben[e.jb]!.ecken[0]);
        // die Mitte des Stücks ist der Pfad in der Mitte zwischen den Stellen der beiden Proben
        const s0 = l.s[e.ja]!;
        const s1 = l.s[e.jb]! < s0 ? l.s[e.jb]! + l.laenge : l.s[e.jb]!;
        const sm = (s0 + s1) / 2;
        const soll = pfadBei(l, sm >= l.laenge ? sm - l.laenge : sm)!;
        innen = Math.max(innen, abstand(mitte(e.k), soll));
      }
      log(`Loop ${l.id} (${l.art}): ${K.length} Stücke auf ${n} Proben, Enden bis ${ende.toExponential(1)}, Mitte bis ${innen.toExponential(1)} neben dem Pfad`);
      expect(ende).toBeLessThan(1e-9);
      expect(innen).toBeLessThan(1e-6);
    }
  });

  it('im Zug (andere Punkte, andere Griffe) sind es die Stücke des Pfads im Zug', () => {
    const { loops } = dreiLoopsGenau();
    for (const l of loops) {
      const P = l.punkte.map((p) => ({ x: p.ref.x + 6, y: p.ref.y - 4, z: p.ref.z }));
      const G = l.punkte.map((p) => ({
        ein: { x: 1.3 * p.ein!.x, y: 1.3 * p.ein!.y, z: 1.3 * p.ein!.z },
        aus: { x: 0.8 * p.aus!.x, y: 0.8 * p.aus!.y, z: 0.8 * p.aus!.z },
      }));
      const K = pfadKanten(l, P, G)!;
      const L = pfadLagen(l, P, G)!;
      expect(K.length).toBeGreaterThan(0);
      for (const e of K) {
        expect(abstand(e.k[0], lage(L, e.ja))).toBeLessThan(1e-9);
        expect(abstand(e.k[3], lage(L, e.jb))).toBeLessThan(1e-9);
      }
    }
  });
});
