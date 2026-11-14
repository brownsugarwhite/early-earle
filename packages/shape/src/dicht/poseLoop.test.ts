import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, type V3, hautAus } from './kurven';
import { type Loop, LoopZug, bereichUm, festlegen, formAusZeichnung, verschiebungLaengs } from './loops';
import { maulOeffnen } from './maul';
import { maulAmLoop, mundwinkelProbe } from './maulLoop';
import { ergaenzen, innenPosieren, knochenDrehen, knochenWinkel } from './poseLoop';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';
import { verdichten } from './verdichten';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
const linse = (cu: number, cv: number, au: number, av: number, n = 64): { uv: [number, number][]; knoten: number[] } => ({
  uv: Array.from({ length: n }, (_, i): [number, number] => [cu + au * Math.cos((2 * Math.PI * i) / n), cv + av * Math.sin((2 * Math.PI * i) / n)]),
  knoten: Array.from({ length: n / 8 }, (_, i) => 8 * i),
});
const kopie = (l: Loop): Loop => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) });

function maulKugel(): { haut: Haut; loop: Loop } {
  const netz = rundAusSeite(kreis(150), { dreiecke: 6000 });
  const h = hautAus(netz.positionen, netz.indizes);
  const { uv, knoten } = linse(-115, -20, 60, 9);
  const r = loopEinsetzen(h, [formAusZeichnung(h, 'seite', uv, knoten, 1)!], 0)!;
  return { haut: r.haut, loop: r.loops[0]! };
}

/**
 * Kanten mit mehr oder weniger als zwei Dreiecken (Haut ohne Öffnung und Inneres). Punkte innerhalb eines Hundertstels gelten als
 * einer (Haut in Float64, Inneres in Float32: Gerundet fielen gleiche Punkte an Rundungsgrenzen auseinander).
 */
function offeneKanten(pos: ArrayLike<number>, I: Uint32Array, innenPos: ArrayLike<number>, innenI: Uint32Array): number {
  const zelle = new Map<string, { x: number; y: number; z: number; id: number }[]>();
  let ids = 0;
  const nr = (x: number, y: number, z: number): number => {
    const cx = Math.floor(x / 0.05);
    const cy = Math.floor(y / 0.05);
    const cz = Math.floor(z / 0.05);
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++)
        for (let c = -1; c <= 1; c++)
          for (const q of zelle.get(`${cx + a},${cy + b},${cz + c}`) ?? []) if (Math.hypot(q.x - x, q.y - y, q.z - z) < 0.01) return q.id;
    const k = `${cx},${cy},${cz}`;
    const id = ids++;
    (zelle.get(k) ?? zelle.set(k, []).get(k)!).push({ x, y, z, id });
    return id;
  };
  const zahl = new Map<string, number>();
  const dazu = (P: ArrayLike<number>, J: Uint32Array) => {
    for (let t = 0; t < J.length; t += 3) {
      const e = [0, 1, 2].map((k) => nr(P[3 * J[t + k]!]!, P[3 * J[t + k]! + 1]!, P[3 * J[t + k]! + 2]!));
      for (let k = 0; k < 3; k++) {
        const a = Math.min(e[k]!, e[(k + 1) % 3]!);
        const b = Math.max(e[k]!, e[(k + 1) % 3]!);
        if (a !== b) zahl.set(`${a},${b}`, (zahl.get(`${a},${b}`) ?? 0) + 1);
      }
    }
  };
  dazu(pos, I);
  dazu(innenPos, innenI);
  return [...zahl.values()].filter((z) => z !== 2).length;
}

describe('Fressen-Pose am Loop', () => {
  it('Knochen drehen und zurückdrehen: genau, Unterkiefer wie beim Öffnen', () => {
    const { haut, loop } = maulKugel();
    const m = maulAmLoop(haut, loop, mundwinkelProbe(loop), { zelle: 4.3 })!;
    const theta = knochenWinkel(m, { kiefer: 35, schaedel: 12 });
    const pose = knochenDrehen(haut.pos, theta, m.gelenk);
    const ruhe = knochenDrehen(pose, theta, m.gelenk, true);
    let fehler = 0;
    for (let i = 0; i < ruhe.length; i++) fehler = Math.max(fehler, Math.abs(ruhe[i]! - haut.pos[i]!));
    expect(fehler).toBeLessThan(1e-9);
    // nur der Unterkiefer: wie `maulOeffnen`
    const nurKiefer = knochenDrehen(haut.pos, knochenWinkel(m, { kiefer: 35, schaedel: 0 }), m.gelenk);
    const ziel = {
      positionen: new Float32Array(m.positionen.length),
      normalen: new Float32Array(m.normalen.length),
      innenPositionen: new Float32Array(m.innen.positionen.length),
      innenNormalen: new Float32Array(m.innen.normalen.length),
    };
    maulOeffnen(m, 35, ziel);
    let wie = 0;
    for (let i = 0; i < nurKiefer.length; i++) wie = Math.max(wie, Math.abs(nurKiefer[i]! - ziel.positionen[i]!));
    expect(wie).toBeLessThan(1e-3);
    // der Mundwinkel dreht nicht: das Gelenk ist in der Pose und in ihrer Ruhe dieselbe Stelle
    const ve = loop.proben[mundwinkelProbe(loop)]!.ecken[0];
    expect(theta[ve]).toBe(0);
  });

  it('In der Pose eine Lippe ziehen: Blendshape gegen die Grundform, die Grundform bleibt', () => {
    const { haut: grund, loop } = maulKugel();
    const ecke = mundwinkelProbe(loop);
    const m = maulAmLoop(grund, loop, ecke, { zelle: 4.3 })!;
    const k = { kiefer: 30, schaedel: 0 };
    const theta = knochenWinkel(m, k);
    const grundVorher = Float64Array.from(grund.pos);
    // die Pose, wie sie zu sehen ist: dasselbe Netz, posierte Lagen
    const pose: Haut = { ...grund, pos: knochenDrehen(grund.pos, theta, m.gelenk) };
    const l = kopie(loop);
    l.punkte = [];
    festlegen(pose, l);
    // ein Punkt vorn auf der Unterlippe (die Probe mit dem kleinsten y) und der Mundwinkel
    let unten = 1;
    for (let j = 1; j < l.proben.length - 1; j++) if (l.ruhe[3 * j + 1]! < l.ruhe[3 * unten + 1]!) unten = j;
    l.punkte = [
      { s: l.s[unten]!, ref: { x: l.ruhe[3 * unten]!, y: l.ruhe[3 * unten + 1]!, z: l.ruhe[3 * unten + 2]! }, cur: { x: 0, y: 0, z: 0 } },
      { s: l.s[ecke]!, ref: { x: 0, y: 0, z: 0 }, cur: { x: 0, y: 0, z: 0 }, mundwinkel: true, ecke: true },
    ].sort((a, b) => a.s - b.s);
    festlegen(pose, l);
    const D: V3[] = l.punkte.map((p) => (p.mundwinkel ? { x: 0, y: 0, z: 0 } : { x: 0, y: -20, z: 0 }));
    const d = verschiebungLaengs(l, D);
    const zentren: V3[] = [];
    const ecken = new Set<number>();
    for (let j = 0; j < l.proben.length; j++) {
      if (Math.hypot(d[3 * j]!, d[3 * j + 1]!, d[3 * j + 2]!) === 0) continue;
      zentren.push({ x: l.ruhe[3 * j]!, y: l.ruhe[3 * j + 1]!, z: l.ruhe[3 * j + 2]! });
      ecken.add(l.proben[j]!.ecken[0]);
    }
    const zug = new LoopZug(pose, [l], bereichUm(pose, zentren, 40, ecken), true);
    zug.schritt([d], 6);
    // zurück in die Ruhe der Pose: der Blendshape
    const ruhe = knochenDrehen(pose.pos, theta, m.gelenk, true);
    const delta = new Float64Array(ruhe.length);
    let groesste = 0;
    let fern = 0;
    for (let v = 0; v < grund.n; v++) {
      for (let c = 0; c < 3; c++) delta[3 * v + c] = ruhe[3 * v + c]! - grund.pos[3 * v + c]!;
      const b = Math.hypot(delta[3 * v]!, delta[3 * v + 1]!, delta[3 * v + 2]!);
      groesste = Math.max(groesste, b);
      if (grund.pos[3 * v + 1]! > 60) fern = Math.max(fern, b);
    }
    // die Grundform ist unberührt, der Blendshape trägt den Zug (oben auf dem Kopf nichts)
    for (let i = 0; i < grund.pos.length; i++) expect(grund.pos[i]).toBe(grundVorher[i]);
    expect(groesste).toBeGreaterThan(15);
    expect(fern).toBe(0);
    // Grundform + Blendshape, posiert, ist die bearbeitete Pose
    const wieder = knochenDrehen(Float64Array.from(grund.pos, (x, i) => x + delta[i]!), theta, m.gelenk);
    let fehler = 0;
    for (let i = 0; i < wieder.length; i++) fehler = Math.max(fehler, Math.abs(wieder[i]! - pose.pos[i]!));
    expect(fehler).toBeLessThan(1e-9);
    // das Maulinnere aus der Ruhe der Pose, posiert: dicht mit der Haut
    const ruheHaut: Haut = { ...grund, pos: ruhe };
    const mr = maulAmLoop(ruheHaut, l, ecke, { zelle: 4.3, wieVorher: m })!;
    const innen = innenPosieren(mr, k);
    const offen = offeneKanten(pose.pos, mr.indizes, innen.positionen, mr.innen.indizes);
    log(`Lippe 20 nach unten in der Pose (30°): Blendshape bis ${groesste.toFixed(1)}, oben ${fern}, offene Kanten ${offen}`);
    expect(offen).toBe(0);
  });

  it('Werte für neue Punkte ergänzen: wie zwischen den alten, spiegelgleich', () => {
    const { haut } = maulKugel();
    // gestreckt, damit verdichtet wird
    const lang: Haut = { ...haut, pos: Float64Array.from(haut.pos, (x, i) => (i % 3 === 1 ? 2.2 * x : x)) };
    const v = verdichten(lang, [], 12)!;
    expect(v.neu).toBeGreaterThan(100);
    // ein glattes Feld an den alten Punkten: (x, y, z) selbst
    const n0 = haut.n;
    const werte = Float64Array.from(lang.pos);
    const neu = ergaenzen(v.haut, werte, n0, 3, true);
    let fehler = 0;
    let schief = 0;
    for (let w = n0; w < v.haut.n; w++) {
      fehler = Math.max(fehler, Math.hypot(neu[3 * w]! - v.haut.pos[3 * w]!, neu[3 * w + 1]! - v.haut.pos[3 * w + 1]!, neu[3 * w + 2]! - v.haut.pos[3 * w + 2]!));
      const s = v.haut.spiegel[w]!;
      if (s >= 0) schief = Math.max(schief, Math.abs(neu[3 * w]! - neu[3 * s]!) + Math.abs(neu[3 * w + 2]! + neu[3 * s + 2]!));
    }
    log(`ergänzt: ${v.haut.n - n0} neue Punkte, größte Abweichung vom Feld ${fehler.toFixed(2)} (Kante ≈ 12), schief ${schief.toExponential(1)}`);
    expect(fehler).toBeLessThan(6);
    expect(schief).toBeLessThan(1e-9);
  });
});
