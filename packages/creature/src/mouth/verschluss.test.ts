import { describe, expect, it } from 'vitest';
import { parseBauplan, type Bauplan } from '../bauplan/schema';
import { buildCreature, type CreatureBuild } from '../mesh/build';
import { adjacency } from '../mesh/surfaceNets';
import { construct } from '../sdf/build';
import { add, scale, sub, type Vec3 } from '../math/vec';
import { evalScene } from '../sdf/scene';
import { posedPositions, posedTeeth, toothTip } from './pose';

/**
 * Lippen-Verschluss: Im geschlossenen Zustand darf von vorn keine Rachenfläche mehr sichtbar sein (Restlücke ≤ 1 % der
 * Körperhöhe), die Lippenzone darf beim Schließen nicht ausfransen (Rauheit höchstens das 1,6-Fache des offenen
 * Zustands) und untere Zähne (ohne Hauer) dürfen nicht durch die Oberlippe nach außen stoßen.
 */

const RES = Number(process.env.EE_RES ?? 88);

const VARIANTEN: Record<string, Parameters<typeof parseBauplan>[0]> = {
  keil: { koerper: { hoehe: 1.3, breite: 1.0, laenge: 1.1, neigung: 0.12, buckel: 0.15, bauch: 0.35, boden: 0.55, querschnitte: [0.68, 0.9, 1.0, 0.97, 0.72] }, kopf: { braue: 0.6 }, maul: { hoehe: 0.56, form: 1, winkel: 0.75, breite: 1.0, oberkiefer: 1.1, unterkiefer: 1.0, lippe: 0.8, oeffnung: 0.4, tiefe: 0.85 }, zaehne: { groesse: 0.9, dichte: 0.35, streuung: 0.5, eckzaehne: 0.8 }, augen: { typ: 'drache', hoehe: 0.28, abstand: 0.55, groesse: 0.42, tiefe: 0.4 }, unterkoerper: { typ: 'beine', beine: { anzahl: 2, dicke: 0.95, schenkel: 1.0, laenge: 0.45, fuss: 0.75, spreiz: 0.45 } }, schwanz: { typ: 'wirbelsaeule', laenge: 1.3, dicke: 0.75 } },
  vierbeiner: { koerper: { hoehe: 0.9, breite: 1.1, laenge: 1.5, neigung: 0.1 }, maul: { hoehe: 0.5, form: 1, winkel: 0.5, breite: 0.8, oberkiefer: 1, unterkiefer: 0.9, wForm: 0.6, oeffnung: 0.3 }, zaehne: { stil: 'rund', groesse: 0.4, eckzaehne: 0.6 }, augen: { typ: 'gross', hoehe: 0.4, abstand: 0.6, groesse: 0.5, tiefe: 0.25 }, unterkoerper: { typ: 'beine', beine: { anzahl: 4, dicke: 0.6, schenkel: 0.5, laenge: 0.6, fuss: 0.6, spreiz: 0.4 } } },
  tief: { maul: { hoehe: 0.14, neigung: -0.2, form: 1, winkel: 0.7, breite: 0.9, oberkiefer: 1.3, unterkiefer: 0.6, oeffnung: 0.35 }, augen: { hoehe: 0.25, abstand: 0.6 } },
  hoch: { maul: { hoehe: 0.82, neigung: 0.2, form: 1, winkel: 0.4, breite: 0.8, oberkiefer: 0.6, unterkiefer: 1.1, oeffnung: 0.4 }, augen: { hoehe: 0.5, abstand: 0.8 } },
  schlange: { koerper: { hoehe: 0.8, breite: 0.9, laenge: 1.0, neigung: 0.2 }, maul: { hoehe: 0.4, form: 0.9, winkel: 0.8, breite: 0.9, oberkiefer: 1.1, unterkiefer: 0.8, oeffnung: 0.45, tiefe: 0.8 }, zaehne: { groesse: 0.6, dichte: 0.7 }, augen: { typ: 'schlange', hoehe: 0.4, abstand: 0.7, groesse: 0.55 }, unterkoerper: { typ: 'schlange', schlange: { laenge: 1.8, dicke: 0.7, einrollen: 0.5 } } },
};

interface Hit {
  t: number;
  tri: number;
  u: number;
  v: number;
}

/** Nächster Treffer eines Strahls im Mesh (Möller–Trumbore, beidseitig). */
function raycast(pos: Float32Array, index: Uint32Array, o: Vec3, d: Vec3): Hit | null {
  let best: Hit | null = null;
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t]! * 3, b = index[t + 1]! * 3, c = index[t + 2]! * 3;
    const ax = pos[a]!, ay = pos[a + 1]!, az = pos[a + 2]!;
    const e1x = pos[b]! - ax, e1y = pos[b + 1]! - ay, e1z = pos[b + 2]! - az;
    const e2x = pos[c]! - ax, e2y = pos[c + 1]! - ay, e2z = pos[c + 2]! - az;
    const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    const tx = o[0] - ax, ty = o[1] - ay, tz = o[2] - az;
    const u = (tx * px + ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
    if (v < 0 || u + v > 1) continue;
    const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (tt <= 1e-6) continue;
    if (!best || tt < best.t) best = { t: tt, tri: t, u, v };
  }
  return best;
}

interface Messung {
  /** größte durchsichtige Spalthöhe (Anteil der Körperhöhe) über alle Azimute */
  luecke: number;
  /** mittlere Spalthöhe (Anteil der Körperhöhe) */
  lueckeMittel: number;
}

/** Sichtbare Rachenfläche von vorn: Strahlen quer zur Maullinie, Höhe des Fensters mit Rachen-Treffer. */
function messeLuecke(build: CreatureBuild, c: ReturnType<typeof construct>, pos: Float32Array): Messung {
  const m = c.mouth!;
  const host = m.host;
  const H = c.bodyScale;
  const region = build.descriptors.region;
  const nPhi = 13, nH = 97;
  const span = Math.max(m.gapFront * 2.2, 0.08 * H);
  let maxGap = 0, sum = 0;
  for (let i = 0; i < nPhi; i++) {
    const phi = -0.85 * m.theta + (1.7 * m.theta * i) / (nPhi - 1);
    const hl = m.lipHAt(phi);
    const dir: Vec3 = [host.forward[0] * Math.cos(phi) + host.right[0] * Math.sin(phi), host.forward[1] * Math.cos(phi) + host.right[1] * Math.sin(phi), host.forward[2] * Math.cos(phi) + host.right[2] * Math.sin(phi)];
    let count = 0;
    const hits: string[] = [];
    for (let j = 0; j < nH; j++) {
      const h = hl - span + (2 * span * j) / (nH - 1);
      const axisPt = add(host.origin, scale(host.up, h));
      const o = add(axisPt, scale(dir, host.halfWidth * 4 + H));
      const hit = raycast(pos, build.index, o, scale(dir, -1));
      if (!hit) continue;
      const a = build.index[hit.tri]!, b = build.index[hit.tri + 1]!, cc = build.index[hit.tri + 2]!;
      const w0 = 1 - hit.u - hit.v;
      const rachen = region[a * 4]! * w0 + region[b * 4]! * hit.u + region[cc * 4]! * hit.v;
      const socket = region[a * 4 + 3]! * w0 + region[b * 4 + 3]! * hit.u + region[cc * 4 + 3]! * hit.v;
      // offen = Rachenfläche sichtbar, radial deutlich hinter der Lippe (Naht und Mundwinkelhaut zählen nicht), keine Augenhöhle
      const hp = add(o, scale(dir, -hit.t));
      const rHit = m.local(hp).r;
      if (rachen > 0.5 && socket < 0.3 && rHit < 0.93 * m.lipRAt(phi)) {
        count++;
        if (process.env.EE_VERBOSE) {
          const l = m.local(hp);
          // Ursprungsseite des getroffenen Dreiecks (Bauzustand): Dach (U) oder Boden (L), mittlere Rachenstärke
          let hs = 0, inn = 0;
          for (const vi of [a, b, cc]) {
            hs += m.local([build.positions[vi * 3]!, build.positions[vi * 3 + 1]!, build.positions[vi * 3 + 2]!]).h - m.lipHAt(phi);
            inn += region[vi * 4]!;
          }
          hits.push(`${((h - hl) / H * 100).toFixed(1)}%@r${(l.r / m.lipRAt(phi)).toFixed(2)}${hs > 0 ? 'U' : 'L'}${(inn / 3).toFixed(1)}`);
        }
      }
    }
    const gap = (count / nH) * 2 * span;
    if (process.env.EE_VERBOSE && count > 0) console.log(`  φ=${(phi / m.theta).toFixed(2)}θ Spalt ${(gap / H * 100).toFixed(1)} %: ${hits.join(' ')}`);
    maxGap = Math.max(maxGap, gap);
    sum += gap;
  }
  return { luecke: maxGap / H, lueckeMittel: sum / nPhi / H };
}

/** Ist der Punkt von außen sichtbar? Ja, wenn irgendein Strahl ins Freie das Mesh nicht trifft (26 Richtungen).
 *  Punkte im Körper und in der zugeklappten Höhlentasche sind verdeckt, Punkte vor der Fläche nicht. */
function freeDirections(pos: Float32Array, index: Uint32Array, pt: Vec3): number {
  let free = 0;
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        const len = Math.hypot(dx, dy, dz);
        const dir: Vec3 = [dx / len, dy / len, dz / len];
        if (!raycast(pos, index, pt, dir)) free++;
      }
  return free;
}
/** Sichtbar, wenn mehr als zwei der 26 Richtungen frei sind (ein, zwei freie Strahlen gehen auch durch ein Netzloch). */
function visible(pos: Float32Array, index: Uint32Array, pt: Vec3): boolean {
  return freeDirections(pos, index, pt) > 2;
}

/** Ausfransen: Unruhe des Bewegungsfelds offen → zu in der Lippen- und Rachenzone (mittlere Abweichung der Verschiebung
 *  eines Vertex vom Mittel seiner Nachbarn, Anteil der Körperhöhe). Starre Bewegung mit glatten Gewichten ≈ 0. */
function ausfransen(build: CreatureBuild, c: ReturnType<typeof construct>, offen: Float32Array, zu: Float32Array, adj: ReturnType<typeof adjacency>): number {
  const n = build.stats.vertexCount;
  const d = new Float32Array(offen.length);
  for (let i = 0; i < d.length; i++) d[i] = zu[i]! - offen[i]!;
  const m = c.mouth!;
  let sum = 0, cnt = 0;
  for (let v = 0; v < n; v++) {
    const reg = build.descriptors.region;
    // nur die sichtbare Zone: Lippen und Rachenkante nahe der Fläche (die zugeklappte Tasche innen sieht niemand)
    const l = m.local([build.positions[v * 3]!, build.positions[v * 3 + 1]!, build.positions[v * 3 + 2]!]);
    const nahe = l.r >= 0.9 * m.lipRAt(Math.max(-m.theta, Math.min(m.theta, l.phi)));
    if (reg[v * 4 + 1]! < 0.3 && !(reg[v * 4]! >= 0.3 && nahe)) continue;
    const s = adj.offsets[v]!, e = adj.offsets[v + 1]!;
    if (e - s < 3) continue;
    let ax = 0, ay = 0, az = 0;
    for (let k = s; k < e; k++) {
      const w = adj.neighbours[k]!;
      ax += d[w * 3]!;
      ay += d[w * 3 + 1]!;
      az += d[w * 3 + 2]!;
    }
    const inv = 1 / (e - s);
    sum += Math.hypot(ax * inv - d[v * 3]!, ay * inv - d[v * 3 + 1]!, az * inv - d[v * 3 + 2]!);
    cnt++;
  }
  return cnt ? sum / cnt / build.bodyScale : 0;
}

describe('Lippen-Verschluss', () => {
  for (const [name, partial] of Object.entries(VARIANTEN)) {
    it(`schließt ${name} ohne Lücke, ohne Ausfransen, Zähne innen`, () => {
      const b: Bauplan = parseBauplan(partial);
      const build = buildCreature(b, { resolution: RES });
      const c = construct(b, RES);
      const adj = adjacency(build.index, build.stats.vertexCount);
      const offen = posedPositions(build, { openness: b.maul.oeffnung, maul: b.maul });
      const zu = posedPositions(build, { openness: 0, maul: b.maul });
      const lOffen = messeLuecke(build, c, offen);
      const lZu = messeLuecke(build, c, zu);
      const fransen = ausfransen(build, c, offen, zu, adj);
      // Zähne (ohne Hauer): Spitzen müssen geschlossen im Körper verschwinden (Punkt-in-Mesh per Strahlparität)
      const teeth = posedTeeth(build, { openness: 0, maul: b.maul });
      let outside = 0, lower = 0;
      const m = c.mouth!;
      const sockets = c.scene.prims.filter((p) => p.name === 'augenhoehle').map((p) => ({ ...p, op: 'union' as const }));
      for (const t of teeth) {
        if (t.hauer) continue;
        lower++;
        const tip = toothTip(t);
        // in einer Augenhöhle liegt der Augapfel davor (eigenes Mesh)
        // (die weiche Subtraktion weitet die Höhle um etwa ihr k; der Augapfel füllt sie)
        const inEye = sockets.some((sock) => evalScene({ prims: [sock] }, tip) < 0.6 * sock.k + 0.01 * c.bodyScale);
        const inside = inEye || !visible(zu, build.index, tip);
        if (!inside) outside++;
        if (process.env.EE_VERBOSE && !inside) {
          const l = m.local(tip);
          console.log(`  Zahn ${t.upper ? 'oben' : 'unten'} außen (${freeDirections(zu, build.index, tip)}/26 frei, Netz ${build.stats.nonManifold} offene Kanten): Spitze h−hl ${(((l.h - m.lipHAt(l.phi)) / c.bodyScale) * 100).toFixed(1)} % · r/rLip ${(l.r / m.lipRAt(Math.max(-m.theta, Math.min(m.theta, l.phi)))).toFixed(2)} · φ ${(l.phi / m.theta).toFixed(2)}θ · Länge ${(t.size / c.bodyScale * 100).toFixed(1)} %`);
        }
      }
      if (process.env.EE_VERBOSE) console.log(`  Probe Körpermitte sichtbar ${visible(zu, build.index, [0, c.bodyScale * 0.5, 0])}, weit außen sichtbar ${visible(zu, build.index, [0, c.bodyScale * 3, 0])}`);
      const H = c.bodyScale;
      console.log(`${name}: Lücke offen ${(lOffen.luecke * 100).toFixed(1)} % → zu ${(lZu.luecke * 100).toFixed(2)} % (Mittel ${(lZu.lueckeMittel * 100).toFixed(2)} %) · Ausfransen ${(fransen * 1000).toFixed(2)} ‰ · Zähne außen ${outside}/${lower} · gapFront ${(c.mouth!.gapFront / H * 100).toFixed(1)} % · ${build.stats.vertexCount} V`);
      void sub;
      expect(lOffen.luecke).toBeGreaterThan(0.02);
      expect(lZu.luecke).toBeLessThanOrEqual(0.015);
      expect(lZu.lueckeMittel).toBeLessThanOrEqual(0.005);
      expect(fransen).toBeLessThanOrEqual(0.006);
      expect(outside).toBe(0);
    }, 120_000);
  }
});
