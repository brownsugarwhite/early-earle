import { describe, expect, it } from 'vitest';
import { hautAus } from './kurven';
import {
  type Loop,
  LoopZug,
  bereichUm,
  festlegen,
  formAusZeichnung,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  verschiebungLaengs,
} from './loops';
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
const ausmass = (pos: Float64Array) => {
  const m = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
  for (let v = 0; v < pos.length / 3; v++) {
    for (let c = 0; c < 3; c++) {
      m[2 * c] = Math.min(m[2 * c]!, pos[3 * v + c]!);
      m[2 * c + 1] = Math.max(m[2 * c + 1]!, pos[3 * v + c]!);
    }
  }
  return m;
};
const schiefe = (h: ReturnType<typeof kugel>) => {
  let m = 0;
  for (let v = 0; v < h.n; v++) {
    const w = h.spiegel[v]!;
    if (w >= 0) m = Math.max(m, Math.hypot(h.pos[3 * v]! - h.pos[3 * w]!, h.pos[3 * v + 1]! - h.pos[3 * w + 1]!, h.pos[3 * v + 2]! + h.pos[3 * w + 2]!));
  }
  return m;
};

/** die drei Achsen-Loops der Kugel, ihre Kreuzungen als Punkte */
function dreiLoops(h: ReturnType<typeof kugel>) {
  const fang = 8;
  const quer = loopAusSchnitt(h, 'seite', [0, 200], [0, -200], 1, fang)!;
  const waag = loopAusSchnitt(h, 'front', [-200, 0], [200, 0], 2, fang)!;
  const mitte = loopAusSchnitt(h, 'top', [-200, 0], [200, 0], 3, fang)!;
  const loops: Loop[] = [quer, waag, mitte];
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  const kreuzungen: number[] = [];
  for (let i = 0; i < loops.length; i++) {
    for (let j = i + 1; j < loops.length; j++) {
      const funde = kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol);
      kreuzungen.push(funde.length);
      for (const f of funde) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
    }
  }
  return { loops, quer, waag, mitte, kreuzungen };
}

describe('Nur Loops: Griffe an Kreuzungen', () => {
  it('Kugel ohne Loops: drei Schnitte (Seite quer, Front waagerecht, Top Mitte) geben 5 gespeicherte Kreuzungen (6 mit Spiegel)', () => {
    const h = kugel();
    const vorher = Float64Array.from(h.pos);
    const { quer, waag, mitte, kreuzungen } = dreiLoops(h);
    log(
      `Arten ${quer.art}/${waag.art}/${mitte.art}, Längen ${quer.laenge.toFixed(0)}/${waag.laenge.toFixed(0)}/${mitte.laenge.toFixed(0)}, ` +
        `Kreuzungen quer×waag ${kreuzungen[0]}, quer×mitte ${kreuzungen[1]}, waag×mitte ${kreuzungen[2]}`,
    );
    expect([quer.art, waag.art, mitte.art]).toEqual(['ring', 'ring', 'mitte']);
    expect(Math.abs(quer.laenge - Math.PI * 150)).toBeLessThan(6);
    expect(Math.abs(mitte.laenge - 2 * Math.PI * 150)).toBeLessThan(10);
    expect(kreuzungen).toEqual([1, 2, 2]);
    // Schneiden ändert die Haut nicht
    expect(Math.max(...vorher.map((x, i) => Math.abs(x - h.pos[i]!)))).toBe(0);
  });

  it('Kreuzung quer × waagerecht von 150 auf 100: von oben und vorn schmaler, Höhe und Länge bleiben, spiegelgleich', () => {
    const h = kugel();
    const { loops } = dreiLoops(h);
    const zentren = loops.slice(0, 2).flatMap((l) => Array.from({ length: l.proben.length }, (_, i) => ({ x: l.ruhe[3 * i]!, y: l.ruhe[3 * i + 1]!, z: l.ruhe[3 * i + 2]! })));
    const t0 = Date.now();
    const zug = new LoopZug(h, loops, bereichUm(h, zentren, 120, []));
    const tz = Date.now() - t0;
    const t1 = Date.now();
    for (let s = 1; s <= 5; s++) {
      const versch = loops.map((l) => verschiebungLaengs(l, l.punkte.map((p) => (p.kreuzung === 1 ? { x: 0, y: 0, z: -10 * s } : { x: 0, y: 0, z: 0 }))));
      zug.schritt(versch, 2);
    }
    const ms = (Date.now() - t1) / 5;
    zug.schritt(
      loops.map((l) => verschiebungLaengs(l, l.punkte.map((p) => (p.kreuzung === 1 ? { x: 0, y: 0, z: -50 } : { x: 0, y: 0, z: 0 })))),
      4,
    );
    const m = ausmass(h.pos);
    let mitteZ = 0;
    for (let v = 0; v < h.n; v++) if (Math.abs(h.pos[3 * v]!) < 15 && Math.abs(h.pos[3 * v + 1]!) < 15) mitteZ = Math.max(mitteZ, h.pos[3 * v + 2]!);
    log(`schmaler: Mitte z ${mitteZ.toFixed(1)}, x ${m[0]!.toFixed(1)}…${m[1]!.toFixed(1)}, y ${m[2]!.toFixed(1)}…${m[3]!.toFixed(1)}, z max ${m[5]!.toFixed(1)}, schief ${schiefe(h).toExponential(1)}, zerlegen ${tz} ms, ${ms.toFixed(1)} ms je Zug`);
    expect(Math.abs(mitteZ - 100)).toBeLessThan(4);
    expect(Math.abs(m[1]! - 150)).toBeLessThan(2);
    expect(Math.abs(m[3]! - 150)).toBeLessThan(2);
    expect(schiefe(h)).toBeLessThan(1e-6);
    loops.forEach((l) => festlegen(h, l));
    expect(Math.abs(loops[0]!.punkte.find((p) => p.kreuzung === 1)!.ref.z - 100)).toBeLessThan(2);
  });

  it('Form auf der Seite (Kreis um ein Auge): liegt auf der Haut, ein Punkt hinausgezogen hebt nur dort', () => {
    const h = kugel();
    const uv: [number, number][] = Array.from({ length: 64 }, (_, i) => [-60 + 35 * Math.cos((2 * Math.PI * i) / 64), 40 + 35 * Math.sin((2 * Math.PI * i) / 64)]);
    const knoten = Array.from({ length: 8 }, (_, i) => 8 * i);
    const auge = formAusZeichnung(h, 'seite', uv, knoten, 9)!;
    expect(auge.art).toBe('paar');
    expect(auge.punkte.length).toBe(8);
    punktEinfuegen(auge, auge.laenge / 3);
    expect(auge.punkte.length).toBe(9);
    auge.punkte.splice(4, 1);
    expect(auge.punkte.length).toBe(8);
    const vorher = Float64Array.from(h.pos);
    // Punkt 0 nach außen (längs seiner Lage von der Mitte weg) um 12
    const p0 = auge.punkte[0]!.ref;
    const r = Math.hypot(p0.x, p0.y, p0.z);
    const D = auge.punkte.map((_, i) => (i === 0 ? { x: (12 * p0.x) / r, y: (12 * p0.y) / r, z: (12 * p0.z) / r } : { x: 0, y: 0, z: 0 }));
    const versch = verschiebungLaengs(auge, D);
    const zentren = Array.from({ length: auge.proben.length }, (_, i) => ({ x: auge.ruhe[3 * i]!, y: auge.ruhe[3 * i + 1]!, z: auge.ruhe[3 * i + 2]! }));
    const zug = new LoopZug(h, [auge], bereichUm(h, zentren, 60, []));
    zug.schritt([versch], 6);
    let hebung = 0;
    let fern = 0;
    for (let v = 0; v < h.n; v++) {
      const d = Math.hypot(h.pos[3 * v]! - vorher[3 * v]!, h.pos[3 * v + 1]! - vorher[3 * v + 1]!, h.pos[3 * v + 2]! - vorher[3 * v + 2]!);
      const naheP0 = Math.hypot(vorher[3 * v]! - p0.x, vorher[3 * v + 1]! - p0.y, vorher[3 * v + 2]! - p0.z) < 8;
      if (naheP0) hebung = Math.max(hebung, d);
      if (vorher[3 * v]! > 60) fern = Math.max(fern, d);
    }
    log(`Auge: ${auge.proben.length} Proben, Hebung am Punkt ${hebung.toFixed(1)}, hinten ${fern}`);
    expect(hebung).toBeGreaterThan(9);
    expect(fern).toBe(0);
  });

  it('Mitte als Ganzes in der Höhe auf 1,2 skaliert: die Kugel wird ein Ei, Länge bleibt', () => {
    const h = kugel();
    const { loops, mitte } = dreiLoops(h);
    const versch = loops.map((l) => {
      if (l !== mitte) return null;
      const d = new Float64Array(l.ruhe.length);
      for (let i = 0; i < l.proben.length; i++) d[3 * i + 1] = 0.2 * l.ruhe[3 * i + 1]!;
      return d;
    });
    // die Punkte der anderen Loops an den Kreuzungen mit der Mitte gehen mit
    const mitKreuz = loops.map((l, li) => {
      if (l === mitte) return versch[li]!;
      return verschiebungLaengs(
        l,
        l.punkte.map((p) => {
          const q = mitte.punkte.find((m) => m.kreuzung === p.kreuzung);
          return q ? { x: 0, y: 0.2 * q.ref.y, z: 0 } : { x: 0, y: 0, z: 0 };
        }),
      );
    });
    const zug = new LoopZug(h, loops, null);
    for (let s = 1; s <= 4; s++) zug.schritt(mitKreuz.map((d) => d.map((x) => (x * s) / 4)), 2);
    zug.schritt(mitKreuz, 4);
    const m = ausmass(h.pos);
    log(`Ei: x ${m[0]!.toFixed(1)}…${m[1]!.toFixed(1)}, y ${m[2]!.toFixed(1)}…${m[3]!.toFixed(1)}, z ${m[4]!.toFixed(1)}…${m[5]!.toFixed(1)}`);
    expect(Math.abs(m[3]! - 180)).toBeLessThan(3);
    expect(Math.abs(m[1]! - 150)).toBeLessThan(3);
    expect(schiefe(h)).toBeLessThan(1e-6);
  });
});
