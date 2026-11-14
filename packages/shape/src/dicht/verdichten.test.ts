import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import {
  type Loop,
  LoopZug,
  festlegen,
  formAusZeichnung,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  stelleBei,
  verschiebungLaengs,
} from './loops';
import { rundAusSeite } from './rund';
import { verdichten } from './verdichten';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const kugel = () =>
  hautAus(
    ...((n) => [n.positionen, n.indizes] as const)(
      rundAusSeite(
        [
          { x: 150, y: 0 },
          { x: 0, y: 150 },
          { x: -150, y: 0 },
          { x: 0, y: -150 },
        ],
        { dreiecke: 6000 },
      ),
    ),
  );

/** drei Achsen-Loops, eingesetzt, Kreuzungen als Punkte */
function dreiLoops(): { h: Haut; loops: Loop[] } {
  let h = kugel();
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [0, 200], [0, -200]],
    ['front', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
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
  return { h, loops };
}

/** die Punkte an einer Kreuzung um D verschieben (alle Loops dort), Haut lösen, festlegen */
function ziehen(h: Haut, loops: Loop[], kreuzung: number, D: { x: number; y: number; z: number }): void {
  const versch = loops.map((l) =>
    l.punkte.some((p) => p.kreuzung === kreuzung) ? verschiebungLaengs(l, l.punkte.map((p) => (p.kreuzung === kreuzung ? D : { x: 0, y: 0, z: 0 }))) : null,
  );
  const zug = new LoopZug(h, loops, null);
  for (let s = 1; s <= 6; s++) zug.schritt(versch.map((d) => d && d.map((x) => (x * s) / 6)), 2);
  zug.schritt(versch, 4);
  for (const l of loops) festlegen(h, l);
}

/** Dreiecke ohne gespiegeltes Gegenstück (die Topologie muss spiegelgleich sein, nicht nur die Lagen) */
const ohneSpiegelDreieck = (h: Haut) => {
  const satz = new Set<string>();
  const k = (a: number, b: number, c: number) => [a, b, c].sort((x, y) => x - y).join(',');
  for (let t = 0; t < h.tri.length; t += 3) satz.add(k(h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!));
  let z = 0;
  for (let t = 0; t < h.tri.length; t += 3) if (!satz.has(k(h.spiegel[h.tri[t]!]!, h.spiegel[h.tri[t + 1]!]!, h.spiegel[h.tri[t + 2]!]!))) z++;
  return z;
};
const kantenLaengen = (h: Haut) => {
  const l: number[] = [];
  for (let v = 0; v < h.n; v++)
    for (const w of h.nachbarn[v]!) if (w > v) l.push(Math.hypot(h.pos[3 * v]! - h.pos[3 * w]!, h.pos[3 * v + 1]! - h.pos[3 * w + 1]!, h.pos[3 * v + 2]! - h.pos[3 * w + 2]!));
  return l;
};
/** größter Knick zwischen benachbarten Dreiecken (Grad), nur wo der Schwerpunkt bei x < xMax liegt */
const groessterKnick = (h: Haut, xMax: number) => {
  const T = h.tri.length / 3;
  const nor = (t: number) => {
    const [a, b, c] = [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!];
    const ab = [h.pos[3 * b]! - h.pos[3 * a]!, h.pos[3 * b + 1]! - h.pos[3 * a + 1]!, h.pos[3 * b + 2]! - h.pos[3 * a + 2]!];
    const ac = [h.pos[3 * c]! - h.pos[3 * a]!, h.pos[3 * c + 1]! - h.pos[3 * a + 1]!, h.pos[3 * c + 2]! - h.pos[3 * a + 2]!];
    const n = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
    const l = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    return n.map((x) => x / l);
  };
  const kanten = new Map<string, number[]>();
  for (let t = 0; t < T; t++)
    for (let e = 0; e < 3; e++) {
      const a = h.tri[3 * t + e]!;
      const b = h.tri[3 * t + ((e + 1) % 3)]!;
      const k = a < b ? `${a}:${b}` : `${b}:${a}`;
      kanten.set(k, [...(kanten.get(k) ?? []), t]);
    }
  let m = 0;
  const knicke: number[] = [];
  for (const ts of kanten.values()) {
    if (ts.length !== 2) continue;
    const t = ts[0]!;
    const cx = (h.pos[3 * h.tri[3 * t]!]! + h.pos[3 * h.tri[3 * t + 1]!]! + h.pos[3 * h.tri[3 * t + 2]!]!) / 3;
    if (cx > xMax) continue;
    const p = nor(ts[0]!);
    const q = nor(ts[1]!);
    const w = (Math.acos(Math.max(-1, Math.min(1, p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]!))) * 180) / Math.PI;
    knicke.push(w);
    m = Math.max(m, w);
  }
  knicke.sort((a, b) => a - b);
  return { max: m, p95: knicke[Math.floor(0.95 * knicke.length)] ?? 0 };
};

describe('Netz verdichtet sich selbst', () => {
  it('Startnetz und unberührte Loops: nichts zu teilen', () => {
    const { h, loops } = dreiLoops();
    expect(verdichten(h, loops, 1.75 * mittlereKante(kugel()))).toBeNull();
  });

  it('Kopf weit herausgezogen: danach keine Kante zu lang, geschlossen, spiegelgleich, Loops Ketten, Knicke flacher', () => {
    const { h, loops } = dreiLoops();
    const MK = mittlereKante(kugel());
    const vorn = loops.find((l) => l.art === 'mitte')!.punkte.find((p) => p.ref.x < -100)!;
    ziehen(h, loops, vorn.kreuzung!, { x: -230, y: 110, z: 0 });
    const vorher = kantenLaengen(h);
    const knickVorher = groessterKnick(h, -160);
    const t0 = Date.now();
    const r = verdichten(h, loops, 1.75 * MK)!;
    const ms = Date.now() - t0;
    expect(r).not.toBeNull();
    const nachher = kantenLaengen(r.haut);
    const knickNachher = groessterKnick(r.haut, -160);
    // geschlossen: jede Kante zwei Dreiecke
    const zaehl = new Map<string, number>();
    for (let t = 0; t < r.haut.tri.length / 3; t++)
      for (let e = 0; e < 3; e++) {
        const a = r.haut.tri[3 * t + e]!;
        const b = r.haut.tri[3 * t + ((e + 1) % 3)]!;
        const k = a < b ? `${a}:${b}` : `${b}:${a}`;
        zaehl.set(k, (zaehl.get(k) ?? 0) + 1);
      }
    const offen = [...zaehl.values()].filter((c) => c !== 2).length;
    let ohneSpiegel = 0;
    let schief = 0;
    for (let v = 0; v < r.haut.n; v++) {
      const w = r.haut.spiegel[v]!;
      if (w < 0) {
        ohneSpiegel++;
        continue;
      }
      schief = Math.max(schief, Math.hypot(r.haut.pos[3 * v]! - r.haut.pos[3 * w]!, r.haut.pos[3 * v + 1]! - r.haut.pos[3 * w + 1]!, r.haut.pos[3 * v + 2]! + r.haut.pos[3 * w + 2]!));
    }
    // Loops: aufeinanderfolgende Punkte der Kette sind Nachbarn im Netz, Lagen = Netzpunkte, Ringenden auf der Mitte
    let kettenFehler = 0;
    for (const l of r.loops) {
      const k = l.proben.map((p) => p.ecken[0]);
      const zu = l.art !== 'ring';
      for (let j = 0; j < (zu ? k.length : k.length - 1); j++) if (!r.haut.nachbarn[k[j]!]!.includes(k[(j + 1) % k.length]!)) kettenFehler++;
      if (l.art === 'ring' && (l.ruhe[2] !== 0 || l.ruhe[3 * k.length - 1] !== 0)) kettenFehler++;
      expect(l.s.length).toBe(k.length);
      for (let j = 1; j < l.s.length; j++) expect(l.s[j]!).toBeGreaterThan(l.s[j - 1]!);
    }
    log(
      `Kopf: Punkte ${h.n} → ${r.haut.n} (+${r.neu}, ${r.gedreht} Kanten gedreht, ${ms} ms); längste Kante ${Math.max(...vorher).toFixed(1)} → ` +
        `${Math.max(...nachher).toFixed(1)} (Grenze ${(1.75 * MK).toFixed(1)}); Knick im Kopf max ${knickVorher.max.toFixed(1)}° → ${knickNachher.max.toFixed(1)}°, ` +
        `95 % ${knickVorher.p95.toFixed(1)}° → ${knickNachher.p95.toFixed(1)}°; offen ${offen}, ohne Spiegel ${ohneSpiegel}, schief ${schief.toExponential(1)}, Kettenfehler ${kettenFehler}`,
    );
    expect(Math.max(...vorher)).toBeGreaterThan(2 * MK);
    expect(Math.max(...nachher)).toBeLessThanOrEqual(1.75 * MK + 1e-9);
    expect(offen).toBe(0);
    expect(ohneSpiegel).toBe(0);
    expect(schief).toBeLessThan(1e-9);
    expect(kettenFehler).toBe(0);
    expect(ohneSpiegelDreieck(r.haut)).toBe(0);
    expect(knickNachher.p95).toBeLessThan(knickVorher.p95);
    // die Punkte der Loops bleiben, wo sie waren
    for (const [li, l] of r.loops.entries()) expect(l.punkte.map((p) => p.s)).toEqual(loops[li]!.punkte.map((p) => p.s));
  });

  it('Gestaucht: zu kurze Kanten werden zusammengelegt — geschlossen, spiegelgleich, Ketten heil, Punkte an Ort, alte Punkte vorn', () => {
    const { h, loops } = dreiLoops();
    const MK = mittlereKante(kugel());
    // die vordere Kreuzung weit nach hinten: vorn wird die Haut quer gestaucht
    const vorn = loops.find((l) => l.art === 'mitte')!.punkte.find((p) => p.ref.x < -100)!;
    ziehen(h, loops, vorn.kreuzung!, { x: 110, y: 0, z: 0 });
    const kurzVorher = kantenLaengen(h).filter((l) => l < 0.5 * MK).length;
    const punkteVorher = loops.map((l) => l.punkte.map((p) => stelleBei(l, l.ruhe, p.s)));
    const t0 = Date.now();
    const r = verdichten(h, loops, 1.75 * MK, { kurz: 0.5 * MK })!;
    const ms = Date.now() - t0;
    expect(r).not.toBeNull();
    const kurzNachher = kantenLaengen(r.haut).filter((l) => l < 0.5 * MK).length;
    const zaehl = new Map<string, number>();
    for (let t = 0; t < r.haut.tri.length / 3; t++)
      for (let e = 0; e < 3; e++) {
        const a = r.haut.tri[3 * t + e]!;
        const b = r.haut.tri[3 * t + ((e + 1) % 3)]!;
        const k = a < b ? `${a}:${b}` : `${b}:${a}`;
        zaehl.set(k, (zaehl.get(k) ?? 0) + 1);
      }
    const offen = [...zaehl.values()].filter((c) => c !== 2).length;
    // ohne Dreieck, ohne Spiegelbild
    const inDreieck = new Uint8Array(r.haut.n);
    for (const v of r.haut.tri) inDreieck[v] = 1;
    const lose = inDreieck.filter((x) => !x).length;
    const ohneSpiegel = [...r.haut.spiegel].filter((w) => w < 0).length;
    let kettenFehler = 0;
    for (const l of r.loops) {
      const k = l.proben.map((p) => p.ecken[0]);
      const zu = l.art !== 'ring';
      for (let j = 0; j < (zu ? k.length : k.length - 1); j++) if (!r.haut.nachbarn[k[j]!]!.includes(k[(j + 1) % k.length]!)) kettenFehler++;
      if (l.art === 'ring' && (l.ruhe[2] !== 0 || l.ruhe[3 * k.length - 1] !== 0)) kettenFehler++;
      expect(l.s.length).toBe(k.length);
      for (let j = 1; j < l.s.length; j++) expect(l.s[j]!).toBeGreaterThan(l.s[j - 1]!);
    }
    // die Punkte der Loops (hier alle Kreuzungen) liegen, wo sie lagen
    let punktWeg = 0;
    r.loops.forEach((l, li) =>
      l.punkte.forEach((p, i) => {
        const q = stelleBei(l, l.ruhe, p.s);
        const a = punkteVorher[li]![i]!;
        punktWeg = Math.max(punktWeg, Math.hypot(q.x - a.x, q.y - a.y, q.z - a.z));
      }),
    );
    // alte Punkte vorn, in ihrer Reihenfolge; die Punkte der Ketten bleiben, wo sie waren
    let m = 0;
    while (m < r.alt.length && r.alt[m]! >= 0) m++;
    for (let i = m; i < r.alt.length; i++) expect(r.alt[i]).toBe(-1);
    for (let i = 1; i < m; i++) expect(r.alt[i]!).toBeGreaterThan(r.alt[i - 1]!);
    let kettenLage = 0;
    for (const l of r.loops)
      for (const p of l.proben) {
        const v = p.ecken[0];
        const a = r.alt[v]!;
        if (a < 0) continue;
        kettenLage = Math.max(kettenLage, Math.hypot(r.haut.pos[3 * v]! - h.pos[3 * a]!, r.haut.pos[3 * v + 1]! - h.pos[3 * a + 1]!, r.haut.pos[3 * v + 2]! - h.pos[3 * a + 2]!));
      }
    log(
      `Gestaucht: Punkte ${h.n} → ${r.haut.n} (+${r.neu}, ${r.gelegt}× zusammengelegt, ${r.gedreht} gedreht, ${ms} ms); Kanten unter ½: ${kurzVorher} → ${kurzNachher}; ` +
        `offen ${offen}, lose ${lose}, ohne Spiegel ${ohneSpiegel}, ohne Spiegeldreieck ${ohneSpiegelDreieck(r.haut)}, Kettenfehler ${kettenFehler}, ` +
        `Punkte verschoben ${punktWeg.toExponential(1)}, Ketten verschoben ${kettenLage.toExponential(1)}`,
    );
    expect(kurzVorher).toBeGreaterThan(20);
    expect(r.gelegt).toBeGreaterThan(0);
    expect(kurzNachher).toBeLessThan(kurzVorher / 3);
    expect(offen).toBe(0);
    expect(lose).toBe(0);
    expect(ohneSpiegel).toBe(0);
    expect(ohneSpiegelDreieck(r.haut)).toBe(0);
    expect(kettenFehler).toBe(0);
    expect(punktWeg).toBeLessThan(1e-9);
    expect(kettenLage).toBe(0);
  });

  it('Form ums Auge weit herausgezogen (kleiner Bereich): verdichtet, die Form bleibt eine Kette', () => {
    let h = kugel();
    const uv: [number, number][] = Array.from({ length: 64 }, (_, i) => [-60 + 32 * Math.cos((2 * Math.PI * i) / 64), 45 + 32 * Math.sin((2 * Math.PI * i) / 64)]);
    const r0 = loopEinsetzen(h, [formAusZeichnung(h, 'seite', uv, Array.from({ length: 8 }, (_, i) => 8 * i), 1)!], 0)!;
    h = r0.haut;
    const loops = r0.loops;
    const auge = loops[0]!;
    // der ganze Loop 120 nach außen (z), die Haut im Bereich folgt
    const d = new Float64Array(auge.ruhe.length);
    for (let j = 0; j < auge.proben.length; j++) d[3 * j + 2] = 120;
    const zug = new LoopZug(h, loops, null);
    for (let s = 1; s <= 6; s++) zug.schritt([d.map((x) => (x * s) / 6)], 2);
    zug.schritt([d], 4);
    festlegen(h, auge);
    const MK = mittlereKante(kugel());
    const r = verdichten(h, loops, 1.75 * MK)!;
    const nachher = kantenLaengen(r.haut);
    const k = r.loops[0]!.proben.map((p) => p.ecken[0]);
    let fehler = 0;
    for (let j = 0; j < k.length; j++) if (!r.haut.nachbarn[k[j]!]!.includes(k[(j + 1) % k.length]!)) fehler++;
    log(`Auge 120 hinaus: Punkte ${h.n} → ${r.haut.n}, längste Kante ${Math.max(...kantenLaengen(h)).toFixed(1)} → ${Math.max(...nachher).toFixed(1)}, Kette ${auge.proben.length} → ${k.length}`);
    expect(Math.max(...nachher)).toBeLessThanOrEqual(1.75 * MK + 1e-9);
    expect(fehler).toBe(0);
    expect(ohneSpiegelDreieck(r.haut)).toBe(0);
  });
});
