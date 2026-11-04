import { describe, expect, it } from 'vitest';
import { type MaulLinie, type MaulSchnitt, maulOeffnen, maulSchneiden } from './maul';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];

function oeffnen(m: MaulSchnitt, winkel: number) {
  const ziel = {
    positionen: new Float32Array(m.positionen.length),
    normalen: new Float32Array(m.normalen.length),
    innenPositionen: new Float32Array(m.innen.positionen.length),
    innenNormalen: new Float32Array(m.innen.normalen.length),
  };
  maulOeffnen(m, winkel, ziel);
  return ziel;
}

/** Körper und Inneres zusammen, Punkte nach Lage verschweißt: Gehört jede Kante zu genau zwei Dreiecken? */
function dichtNachLage(teile: { p: Float32Array; i: Uint32Array }[]): { offen: number; mehr: number } {
  const id = new Map<string, number>();
  const kanten = new Map<string, number>();
  const nr = (p: Float32Array, v: number) => {
    const k = `${p[3 * v]!.toFixed(3)},${p[3 * v + 1]!.toFixed(3)},${p[3 * v + 2]!.toFixed(3)}`;
    let n = id.get(k);
    if (n === undefined) id.set(k, (n = id.size));
    return n;
  };
  for (const { p, i } of teile) {
    for (let t = 0; t < i.length; t += 3) {
      const e = [nr(p, i[t]!), nr(p, i[t + 1]!), nr(p, i[t + 2]!)];
      if (e[0] === e[1] || e[1] === e[2] || e[2] === e[0]) continue;
      for (let k = 0; k < 3; k++) {
        const a = e[k]!;
        const b = e[(k + 1) % 3]!;
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        kanten.set(key, (kanten.get(key) ?? 0) + 1);
      }
    }
  }
  let offen = 0;
  let mehr = 0;
  for (const n of kanten.values()) {
    if (n < 2) offen++;
    if (n > 2) mehr++;
  }
  return { offen, mehr };
}

/** Dreiecke, deren Fläche gegen ihre Punktnormalen zeigt (umgeklappt). */
function umgeklappt(p: Float32Array, n: Float32Array, ind: Uint32Array): number {
  let z = 0;
  for (let t = 0; t < ind.length; t += 3) {
    const a = ind[t]!;
    const b = ind[t + 1]!;
    const c = ind[t + 2]!;
    const abx = p[3 * b]! - p[3 * a]!;
    const aby = p[3 * b + 1]! - p[3 * a + 1]!;
    const abz = p[3 * b + 2]! - p[3 * a + 2]!;
    const acx = p[3 * c]! - p[3 * a]!;
    const acy = p[3 * c + 1]! - p[3 * a + 1]!;
    const acz = p[3 * c + 2]! - p[3 * a + 2]!;
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    const sx = n[3 * a]! + n[3 * b]! + n[3 * c]!;
    const sy = n[3 * a + 1]! + n[3 * b + 1]! + n[3 * c + 1]!;
    const sz = n[3 * a + 2]! + n[3 * b + 2]! + n[3 * c + 2]!;
    if (fx * sx + fy * sy + fz * sz < 0) z++;
  }
  return z;
}

/** Abstand eines Punkts der Seite zur Polylinie. */
function abstandZu(linie: readonly { x: number; y: number }[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i + 1 < linie.length; i++) {
    const a = linie[i]!;
    const b = linie[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
    best = Math.min(best, Math.hypot(a.x + t * dx - x, a.y + t * dy - y));
  }
  return best;
}

describe('Maul als Schnitt in der dichten Form', () => {
  const netz = rundAusSeite(kreis(150), { dreiecke: 16000 });
  const linie: MaulLinie = { punkte: [{ x: -150, y: 0 }, { x: -80, y: -10 }, { x: -15, y: -12 }] };
  const m = maulSchneiden(netz, linie, { zelle: netz.zelle, kontur: netz.kontur })!;

  it('schneidet die Kugel längs der Linie: Lippen genau auf ihr, rechts und links, geschlossen unverändert', () => {
    expect(m).not.toBeNull();
    expect(m.lippeOben.length).toBe(m.lippeUnten.length);
    expect(m.lippeOben.length).toBeGreaterThan(40);
    // geschlossen: die alten Punkte stehen, wo sie waren; beide Lippen liegen aufeinander
    for (let v = 0; v < netz.positionen.length; v++) expect(m.positionen[v]).toBe(netz.positionen[v]);
    let rechts = 0;
    let links = 0;
    let weit = 0;
    for (let i = 0; i < m.lippeOben.length; i++) {
      const o = m.lippeOben[i]!;
      const u = m.lippeUnten[i]!;
      for (let k = 0; k < 3; k++) expect(m.positionen[3 * o + k]).toBe(m.positionen[3 * u + k]);
      const x = m.positionen[3 * o]!;
      const y = m.positionen[3 * o + 1]!;
      const z = m.positionen[3 * o + 2]!;
      if (z > 0) rechts++;
      else links++;
      // abseits der Schnauzenspitze liegt die Lippe in der Seite genau auf der Linie
      if (x > -150 + 3 * netz.zelle) weit = Math.max(weit, abstandZu(m.linie, x, y));
    }
    expect(rechts).toBeGreaterThan(15);
    expect(links).toBeGreaterThan(15);
    expect(weit).toBeLessThan(1e-3);
  });

  it('offen ist Körper und Inneres zusammen dicht, nichts klappt um', () => {
    for (const winkel of [20, 40, 55]) {
      const o = oeffnen(m, winkel);
      const d = dichtNachLage([
        { p: o.positionen, i: m.indizes },
        { p: o.innenPositionen, i: m.innen.indizes },
      ]);
      expect(d).toEqual({ offen: 0, mehr: 0 });
      expect(umgeklappt(o.positionen, o.normalen, m.indizes)).toBe(0);
      expect(umgeklappt(o.innenPositionen, o.innenNormalen, m.innen.indizes)).toBe(0);
    }
  });

  it('der Unterkiefer dreht starr um den Mundwinkel, der Oberkiefer steht', () => {
    const winkel = 30;
    const o = oeffnen(m, winkel);
    const a = (m.drehsinn * winkel * Math.PI) / 180;
    let fehlerUnten = 0;
    let fehlerOben = 0;
    for (let i = 0; i < m.lippeUnten.length; i++) {
      const u = m.lippeUnten[i]!;
      const dx = m.positionen[3 * u]! - m.gelenk.x;
      const dy = m.positionen[3 * u + 1]! - m.gelenk.y;
      const x = m.gelenk.x + Math.cos(a) * dx - Math.sin(a) * dy;
      const y = m.gelenk.y + Math.sin(a) * dx + Math.cos(a) * dy;
      fehlerUnten = Math.max(fehlerUnten, Math.hypot(o.positionen[3 * u]! - x, o.positionen[3 * u + 1]! - y));
      const ob = m.lippeOben[i]!;
      fehlerOben = Math.max(fehlerOben, Math.hypot(o.positionen[3 * ob]! - m.positionen[3 * ob]!, o.positionen[3 * ob + 1]! - m.positionen[3 * ob + 1]!));
    }
    expect(fehlerUnten).toBeLessThan(1e-3);
    expect(fehlerOben).toBe(0);
    // die Schnauzenspitze des Unterkiefers geht nach unten
    const spitze = m.lippeUnten[m.lippeUnten.length >> 1]!;
    expect(o.positionen[3 * spitze + 1]!).toBeLessThan(m.positionen[3 * spitze + 1]! - 30);
  });

  it('ein Haken mit Lücke: was jenseits der Lücke liegt, dreht nicht mit', () => {
    // Kopf oben links auf einem Rumpf, unter dem Kopf eine Lücke bis zur Brust (wie Florians Langhals vom 04.11.)
    const haken: UmrissPunkt[] = [
      { x: -247, y: 124, ecke: true },
      { x: -200, y: 103 },
      { x: -109, y: 72 },
      { x: -207, y: -102 },
      { x: -170, y: -148 },
      { x: 222, y: -114 },
      { x: 236, y: -47 },
      { x: -24, y: 210 },
    ];
    const n = rundAusSeite(haken, { dreiecke: 16000 });
    const mh = maulSchneiden(n, { punkte: [{ x: -243, y: 122 }, { x: -170, y: 128 }, { x: -110, y: 130 }] }, { zelle: n.zelle, kontur: n.kontur });
    expect(mh).not.toBeNull();
    const o = oeffnen(mh!, 40);
    let brust = 0;
    let kopf = 0;
    for (let v = 0; v < n.positionen.length / 3; v++) {
      const d = Math.hypot(o.positionen[3 * v]! - mh!.positionen[3 * v]!, o.positionen[3 * v + 1]! - mh!.positionen[3 * v + 1]!);
      // Brust unter der Lücke
      if (mh!.positionen[3 * v + 1]! < -20) brust = Math.max(brust, d);
      else kopf = Math.max(kopf, d);
    }
    expect(brust).toBeLessThan(1e-3);
    expect(kopf).toBeGreaterThan(20);
  });
});
