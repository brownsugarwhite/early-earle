import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three/webgpu';
import { createDomeCrown } from './crowns';
import { CAP_SAG, DOME_OAK_SKIRT, createDomeOakTrunk, skirtDotCount } from './domeOak';
import { WEEP_FLOOR, WINTER_OAK_CROWN, createWinterOakTrunk, distanceToPaths, frostDotCount } from './winterOak';

function positions(g: BufferGeometry): Float32Array {
  return g.getAttribute('position').array as Float32Array;
}

function minY(g: BufferGeometry): number {
  const p = positions(g);
  let m = Infinity;
  for (let i = 1; i < p.length; i += 3) m = Math.min(m, p[i]!);
  return m;
}

function allFinite(g: BufferGeometry): boolean {
  for (const name of Object.keys(g.attributes)) {
    const a = g.getAttribute(name).array as ArrayLike<number>;
    for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i]!)) return false;
  }
  return true;
}

describe('Kuppeleiche (Welt 04, Ebene 19)', () => {
  const oak = createDomeOakTrunk(9);

  it('ist deterministisch, sinkt in den Boden und trägt Rinde ohne NaN', () => {
    expect(Array.from(positions(createDomeOakTrunk(9).geometry))).toEqual(Array.from(positions(oak.geometry)));
    expect(minY(oak.geometry)).toBeLessThan(-0.05);
    expect(oak.geometry.getAttribute('bark')?.itemSize).toBe(4);
    expect(allFinite(oak.geometry)).toBe(true);
    console.info(`Kuppeleiche: ${oak.geometry.getAttribute('position').count} Vertices, ${oak.tips.length} Bäusche, ${oak.beads.length} Perlen, Rock-Punkte hoch ${skirtDotCount(oak, 1)} / mobil ${skirtDotCount(oak, 2)}`);
    expect(oak.geometry.getAttribute('position').count).toBeLessThanOrEqual(6000);
  });

  it('Rock: Bäusche auf der unteren Schale, alle Punkte hängen am Skelett (nichts schwebt)', () => {
    const S = DOME_OAK_SKIRT;
    expect(oak.tips.length).toBeGreaterThan(30);
    for (const t of oak.tips) {
      const k = Math.hypot(t.p[0] / S.rx, (t.p[1] - S.cy) / S.ry, t.p[2] / S.rx);
      expect(Math.abs(k - 1)).toBeLessThan(0.08);
      expect(t.p[1]).toBeLessThan(S.cy);
    }
    for (const b of [...oak.tips, ...oak.beads]) expect(distanceToPaths(oak.paths, b.p)).toBeLessThan(0.01);
    // der Rock ist so breit wie die Kappe (Ebene 19: Kappe und Rock ergeben einen Kreis)
    const wide = oak.tips.filter((t) => Math.hypot(t.p[0], t.p[2]) > S.rx * 0.8).length;
    expect(wide).toBeGreaterThan(oak.tips.length * 0.25);
  });

  it('Kappe: die Kuppel-Masse mit flach gedrückter Unterseite (CAP_SAG, wie der Vertex-Shader), Proben und Bögen auf ihr', () => {
    // Die Kappe ist kein eigenes Mesh mehr: die Hainkuppel staucht unterhalb der Kronenmitte um CAP_SAG (treeC.z =
    // CAP_FLAG), die Punkte der Unterseite liegen mit derselben Stauchung auf ihr (`sagY` in TreeLayer)
    expect(CAP_SAG).toBeGreaterThan(0);
    expect(CAP_SAG).toBeLessThan(0.5);
    const cap = createDomeCrown('hoch');
    const sag = (y: number) => (y < 0 ? y * CAP_SAG : y);
    const p = positions(cap.geometry);
    let top = -Infinity;
    let bottom = Infinity;
    let wide = 0;
    for (let i = 0; i < p.length; i += 3) {
      top = Math.max(top, p[i + 1]!);
      bottom = Math.min(bottom, sag(p[i + 1]!));
      wide = Math.max(wide, Math.hypot(p[i]!, p[i + 2]!));
    }
    expect(top).toBeGreaterThan(0.7);
    expect(bottom).toBeGreaterThan(-0.3);
    expect(wide).toBeGreaterThan(0.95);
    expect(cap.samples.length / 6).toBeGreaterThan(150);
    expect(cap.rims.length / 6).toBeGreaterThan(80);
    for (let i = 0; i < cap.samples.length; i += 6) expect(sag(cap.samples[i + 1]!)).toBeGreaterThan(-0.3);
    expect(allFinite(cap.geometry)).toBe(true);
  });
});

describe('Wintereiche (Welt 05, Ebene 11)', () => {
  const hi = createWinterOakTrunk(5, { detail: 'hoch' });
  const lo = createWinterOakTrunk(5, { detail: 'mobil' });

  it('ist deterministisch, sinkt in den Boden, ohne NaN, im Vertex-Budget', () => {
    expect(Array.from(positions(createWinterOakTrunk(5).geometry))).toEqual(Array.from(positions(hi.geometry)));
    expect(minY(hi.geometry)).toBeLessThan(-0.15);
    expect(allFinite(hi.geometry)).toBe(true);
    const nh = hi.geometry.getAttribute('position').count;
    const nl = lo.geometry.getAttribute('position').count;
    console.info(`Wintereiche: hoch ${nh} Vertices / ${hi.tips.length} Büschel (${frostDotCount(hi, 2, 9)} Nadeln), mobil ${nl} / ${lo.tips.length} (${frostDotCount(lo, 3, 6)})`);
    expect(nh).toBeLessThanOrEqual(40000);
    expect(nl).toBeLessThan(nh * 0.7);
  });

  it('breite, runde Krone mit hängender Seite; Sternbüschel an den Zweigspitzen', () => {
    const E = WINTER_OAK_CROWN;
    expect(hi.spread).toBeGreaterThan(1.2);
    expect(hi.top).toBeGreaterThan(E.cy + E.ry * 0.7);
    expect(hi.tips.length).toBeGreaterThan(200);
    // die hängenden Zweige fallen tief (Wurzeln des blauen Baums), aber nie unter WEEP_FLOOR
    const low = hi.tips.filter((t) => t.p[1] < 0.9);
    expect(low.length).toBeGreaterThan(hi.tips.length * 0.08);
    for (const t of hi.tips) expect(t.p[1]).toBeGreaterThan(WEEP_FLOOR - 0.05);
    for (const t of hi.tips.slice(0, 80)) expect(distanceToPaths(hi.paths, t.p)).toBeLessThan(0.01);
  });
});
