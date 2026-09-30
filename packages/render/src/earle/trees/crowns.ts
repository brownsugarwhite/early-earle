import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { add, cross, dirFrom, dot, len, norm, scale, type V3 } from './mesh';

/**
 * Kronen der Bäume v3 (Einheit: Kronenradius r = 1). Jede Krone ist eine Masse aus Teilkuppeln wie bei Earle (Bilder
 * 02, 03, Ebene_1): ein Kern, darauf Kappen, die als eigene kleine Kuppeln aus der Masse wölben. Die Normalen sind
 * Schattierungsnormalen — Mischung aus Kappennormale und Hüllnormale —, damit jede Teilkuppel ihren eigenen hellen
 * Scheitel und eine dunklere Unterseite bekommt und die Masse trotzdem als eine Form leuchtet. Die gleichen Normalen
 * formen im Schattenpass die glatte Terminator-Silhouette (siehe shadow/CascadedShadows).
 *
 * `samples`: Oberflächenpunkte (Position + Schattierungsnormale, Objektraum) für die instanzierten Punkte, fest gemischt.
 */
export interface CrownTemplate {
  geometry: BufferGeometry;
  /** Oberflächenproben (Stride 6: x, y, z, nx, ny, nz), deterministisch gemischt. */
  samples: Float32Array;
}

interface Part {
  pos: number[];
  nor: number[];
  idx: number[];
}

function emptyPart(): Part {
  return { pos: [], nor: [], idx: [] };
}

function toGeometry(parts: Part[]): BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (const p of parts) {
    pos.push(...p.pos);
    nor.push(...p.nor);
    for (const i of p.idx) idx.push(i + base);
    base += p.pos.length / 3;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setIndex(new Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

/** Tangentenbasis zu einer Achse. */
function basis(axis: V3): [V3, V3] {
  const a: V3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const t1 = norm(cross(axis, a));
  const t2 = cross(axis, t1);
  return [t1, t2];
}

/**
 * Kugelkappe um `axis` (Mittelpunkt c, Radius rc) bis zum Polarwinkel `thetaMax`, `around` Segmente, `rings` Ringe.
 * `shade(p, nc)` liefert die Schattierungsnormale.
 */
function cap(part: Part, c: V3, rc: number, axis: V3, thetaMax: number, around: number, rings: number, shade: (p: V3, nc: V3) => V3, stretch: V3 = [1, 1, 1]): void {
  const base = part.pos.length / 3;
  const [t1, t2] = basis(axis);
  const push = (nc: V3) => {
    const local: V3 = [nc[0] * rc * stretch[0], nc[1] * rc * stretch[1], nc[2] * rc * stretch[2]];
    const p = add(c, local);
    const ncs = norm([nc[0] / stretch[0], nc[1] / stretch[1], nc[2] / stretch[2]]);
    const n = shade(p, ncs);
    part.pos.push(p[0], p[1], p[2]);
    part.nor.push(n[0], n[1], n[2]);
  };
  push(axis);
  for (let i = 1; i <= rings; i++) {
    const th = (i / rings) * thetaMax;
    for (let j = 0; j < around; j++) {
      const ph = (j / around) * Math.PI * 2;
      const nc = norm(add(scale(axis, Math.cos(th)), add(scale(t1, Math.sin(th) * Math.cos(ph)), scale(t2, Math.sin(th) * Math.sin(ph)))));
      push(nc);
    }
  }
  // Fächer um den Scheitel, dann Ringstreifen (gegen den Uhrzeigersinn von außen: φ läuft t1 → t2, t1 × t2 = Achse)
  for (let j = 0; j < around; j++) {
    const a = base + 1 + j;
    const b = base + 1 + ((j + 1) % around);
    part.idx.push(base, a, b);
  }
  for (let i = 1; i < rings; i++) {
    const r0 = base + 1 + (i - 1) * around;
    const r1 = base + 1 + i * around;
    for (let j = 0; j < around; j++) {
      const j1 = (j + 1) % around;
      part.idx.push(r0 + j, r1 + j, r0 + j1, r0 + j1, r1 + j, r1 + j1);
    }
  }
}

/** UV-Ellipsoid (Radien rx, ry, rz) um c. */
function ellipsoid(part: Part, c: V3, rx: number, ry: number, rz: number, wSeg: number, hSeg: number, shade: (p: V3, n: V3) => V3): void {
  const base = part.pos.length / 3;
  for (let i = 0; i <= hSeg; i++) {
    const v = i / hSeg;
    const th = v * Math.PI;
    for (let j = 0; j <= wSeg; j++) {
      const ph = (j / wSeg) * Math.PI * 2;
      const d: V3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      const p: V3 = [c[0] + d[0] * rx, c[1] + d[1] * ry, c[2] + d[2] * rz];
      const n = shade(p, norm([d[0] / rx, d[1] / ry, d[2] / rz]));
      part.pos.push(p[0], p[1], p[2]);
      part.nor.push(n[0], n[1], n[2]);
    }
  }
  const row = wSeg + 1;
  for (let i = 0; i < hSeg; i++) {
    for (let j = 0; j < wSeg; j++) {
      const a = base + i * row + j;
      const b = a + row;
      part.idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
}

function shuffleSamples(list: number[], seed: string): Float32Array {
  const rand = mulberry32(hash32(seed));
  const n = list.length / 6;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = order[i]!;
    order[i] = order[j]!;
    order[j] = t;
  }
  const out = new Float32Array(list.length);
  order.forEach((src, dst) => {
    for (let k = 0; k < 6; k++) out[dst * 6 + k] = list[src * 6 + k]!;
  });
  return out;
}

// --- Kuppel-Masse ----------------------------------------------------------------------------------------

/** Abflachung der Kuppel-Masse (y), auf Geometrie und Normalen angewandt. */
export const DOME_FLAT = 0.86;

interface CapSpec {
  dir: V3;
  rc: number;
  dist: number;
}

function domeCaps(): CapSpec[] {
  const rand = mulberry32(hash32('dome-caps-v3'));
  const out: CapSpec[] = [];
  const ring = (count: number, el: number, rc: number, dist: number, azOff: number) => {
    for (let k = 0; k < count; k++) {
      const az = azOff + (k / count) * Math.PI * 2 + (rand() - 0.5) * 0.28;
      out.push({ dir: dirFrom(az, el + (rand() - 0.5) * 0.12), rc: rc * (0.9 + 0.2 * rand()), dist: dist * (0.96 + 0.08 * rand()) });
    }
  };
  ring(5, -0.1, 0.45, 0.6, 0.2); // Gürtel etwas unter dem Äquator: überhängende, dunkle Unterseiten
  ring(5, 0.52, 0.44, 0.62, 0.83); // Schultern
  ring(2, 1.18, 0.4, 0.6, 0.4); // Scheitel
  return out;
}

/** Schattierungsnormale: Kappe (Eigenleben der Teilkuppel) mit Hülle gemischt. */
function blendShade(capWeight: number, hullScale: V3 = [1, 1, 1]) {
  return (p: V3, nc: V3): V3 => {
    const nh = norm([p[0] / hullScale[0] ** 2, p[1] / hullScale[1] ** 2, p[2] / hullScale[2] ** 2]);
    return norm(add(scale(nc, capWeight), scale(nh, 1 - capWeight)));
  };
}

/** Geometrie flach drücken (y · f) — Normalen mit der inversen Transponierten. */
function flatten(part: Part, f: number): void {
  for (let i = 0; i < part.pos.length; i += 3) {
    part.pos[i + 1]! *= f;
    const n = norm([part.nor[i]!, part.nor[i + 1]! / f, part.nor[i + 2]!]);
    part.nor[i] = n[0];
    part.nor[i + 1] = n[1];
    part.nor[i + 2] = n[2];
  }
}

/**
 * Kuppel-Masse (Hainbaum, Schirm- und Spitzenbaum-Kappe): Kern + 12 Teilkuppeln in drei Kränzen, Hüllzentrum im
 * Ursprung, Radius ≈ 1, y um DOME_FLAT gestaucht. ≈ 330 Vertices.
 */
export function createDomeCrown(detail: 'hoch' | 'mobil' = 'hoch'): CrownTemplate {
  const caps = domeCaps();
  // Kappen wölben sich sichtbar aus der Masse, die Hülle führt das Licht (die Krone leuchtet als eine Form)
  const shade = blendShade(0.24);
  const part = emptyPart();
  const hi = detail === 'hoch';
  ellipsoid(part, [0, 0, 0], 0.8, 0.8, 0.8, hi ? 12 : 9, hi ? 8 : 6, blendShade(0.1));
  for (const c of caps) cap(part, scale(c.dir, c.dist), c.rc, c.dir, (100 * Math.PI) / 180, hi ? 8 : 6, 3, shade);
  flatten(part, DOME_FLAT);
  // Proben für Punkte: auf den äußeren Kappenflächen, nicht in Nachbarkappen
  const rand = mulberry32(hash32('dome-samples-v3'));
  const list: number[] = [];
  for (let ci = 0; ci < caps.length; ci++) {
    const c = caps[ci]!;
    const center = scale(c.dir, c.dist);
    const [t1, t2] = basis(c.dir);
    for (let k = 0; k < 60; k++) {
      const th = Math.acos(1 - rand() * (1 - Math.cos((85 * Math.PI) / 180)));
      const ph = rand() * Math.PI * 2;
      const nc = norm(add(scale(c.dir, Math.cos(th)), add(scale(t1, Math.sin(th) * Math.cos(ph)), scale(t2, Math.sin(th) * Math.sin(ph)))));
      const p = add(center, scale(nc, c.rc));
      let hidden = len(p) < 0.8;
      for (let o = 0; o < caps.length && !hidden; o++) {
        if (o === ci) continue;
        const oc = caps[o]!;
        if (len(add(p, scale(oc.dir, -oc.dist))) < oc.rc * 0.98) hidden = true;
      }
      if (hidden) continue;
      const n = shade(p, nc);
      const nf = norm([n[0], n[1] / DOME_FLAT, n[2]]);
      list.push(p[0], p[1] * DOME_FLAT, p[2], nf[0], nf[1], nf[2]);
    }
  }
  return { geometry: toGeometry([part]), samples: shuffleSamples(list, 'dome-samples-order') };
}

// --- Juwelenkuppel ----------------------------------------------------------------------------------------

const JEWEL_LOBES: V3[] = (() => {
  const rand = mulberry32(hash32('jewel-lobes'));
  const out: V3[] = [];
  for (let k = 0; k < 7; k++) out.push(dirFrom((k / 7) * Math.PI * 2 + rand() * 0.5, 0.15 + rand() * 0.9));
  out.push([0, 1, 0]);
  return out;
})();

/** Radius der Juwelenkuppel in Richtung d (runde Kuppel mit sanften Beulen, flacher, eingezogener Boden). */
function jewelRadius(d: V3): number {
  let bump = 0;
  for (const l of JEWEL_LOBES) {
    const t = Math.max(0, (dot(d, l) - 0.8) / 0.2);
    bump = Math.max(bump, t * t * (3 - 2 * t));
  }
  return 1 + 0.07 * bump;
}

function jewelPoint(d: V3): V3 {
  const r = jewelRadius(d);
  const p: V3 = [d[0] * r, d[1] * r, d[2] * r];
  if (p[1] < -0.3) p[1] = -0.3 + (p[1] + 0.3) * 0.45; // flacher Boden
  return p;
}

/** Juwelenkuppel (Bild 02, Welt 10): große runde Kuppel mit sanften Beulen, flacher Boden. ≈ 200 Vertices. */
export function createJewelCrown(): CrownTemplate {
  const w = 16;
  const h = 11;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= h; i++) {
    const th = (i / h) * Math.PI;
    for (let j = 0; j <= w; j++) {
      const ph = (j / w) * Math.PI * 2;
      const p = jewelPoint([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]);
      pos.push(p[0], p[1], p[2]);
    }
  }
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const a = i * (w + 1) + j;
      const b = a + w + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  // Schattierungsnormale: Flächennormale (aus den Nachbarn) halb mit der Kugelnormale gemischt
  const nor: number[] = [];
  for (let i = 0; i <= h; i++) {
    for (let j = 0; j <= w; j++) {
      const th = (i / h) * Math.PI;
      const ph = (j / w) * Math.PI * 2;
      const d: V3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      const e = 0.02;
      const [t1, t2] = basis(d);
      const p0 = jewelPoint(d);
      const pa = jewelPoint(norm(add(d, scale(t1, e))));
      const pb = jewelPoint(norm(add(d, scale(t2, e))));
      let n = norm(cross(add(pa, scale(p0, -1)), add(pb, scale(p0, -1))));
      if (dot(n, d) < 0) n = scale(n, -1);
      const s = norm(add(scale(n, 0.55), scale(d, 0.45)));
      nor.push(s[0], s[1], s[2]);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setIndex(new Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  const rand = mulberry32(hash32('jewel-samples'));
  const list: number[] = [];
  for (let k = 0; k < 520; k++) {
    const y = 1 - rand() * 1.45;
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const ph = rand() * Math.PI * 2;
    const d: V3 = [rr * Math.cos(ph), y, rr * Math.sin(ph)];
    const p = jewelPoint(d);
    list.push(p[0], p[1], p[2], d[0], d[1], d[2]);
  }
  return { geometry: g, samples: shuffleSamples(list, 'jewel-samples-order') };
}

// --- Säule (Zypresse, Kathedralenkrone) -------------------------------------------------------------------

/** Säulenkrone (Ebene_30 Zypressen, Ebene_16/23 Kathedralenbäume): Kapsel + drei Kränze länglicher Teilkuppeln. */
export function createColumnCrown(detail: 'hoch' | 'mobil' = 'hoch'): CrownTemplate {
  const hi = detail === 'hoch';
  const rand = mulberry32(hash32('column-caps'));
  const part = emptyPart();
  const hull: V3 = [0.62, 1.05, 0.62];
  ellipsoid(part, [0, 0, 0], 0.52, 1.0, 0.52, hi ? 9 : 7, hi ? 8 : 6, blendShade(0.25, hull));
  const caps: Array<{ c: V3; rc: number; dir: V3 }> = [];
  const tiers: Array<[number, number, number]> = [
    [-0.62, 0.36, 4],
    [-0.08, 0.36, 4],
    [0.46, 0.32, 4],
  ];
  tiers.forEach(([y, rc, count], ti) => {
    for (let k = 0; k < count; k++) {
      const az = (k / count) * Math.PI * 2 + ti * 0.8 + (rand() - 0.5) * 0.3;
      const dir = norm([Math.cos(az), 0.35, Math.sin(az)]);
      const c: V3 = [Math.cos(az) * 0.3, y, Math.sin(az) * 0.3];
      caps.push({ c, rc: rc * (0.9 + 0.2 * rand()), dir });
    }
  });
  caps.push({ c: [0, 0.78, 0], rc: 0.3, dir: [0, 1, 0] });
  const shade = blendShade(0.26, hull);
  for (const c of caps) cap(part, c.c, c.rc, c.dir, (105 * Math.PI) / 180, hi ? 7 : 6, 3, shade, [1, 1.35, 1]);
  const list: number[] = [];
  for (const c of caps) {
    const [t1, t2] = basis(c.dir);
    for (let k = 0; k < 40; k++) {
      const th = Math.acos(1 - rand() * (1 - Math.cos((80 * Math.PI) / 180)));
      const ph = rand() * Math.PI * 2;
      const nc = norm(add(scale(c.dir, Math.cos(th)), add(scale(t1, Math.sin(th) * Math.cos(ph)), scale(t2, Math.sin(th) * Math.sin(ph)))));
      const p = add(c.c, [nc[0] * c.rc, nc[1] * c.rc * 1.35, nc[2] * c.rc]);
      let hidden = false;
      for (const o of caps) {
        if (o === c) continue;
        const q = add(p, scale(o.c, -1));
        if (Math.hypot(q[0], q[1] / 1.35, q[2]) < o.rc * 0.98) {
          hidden = true;
          break;
        }
      }
      if (hidden) continue;
      const n = shade(p, norm([nc[0], nc[1] / 1.35, nc[2]]));
      list.push(p[0], p[1], p[2], n[0], n[1], n[2]);
    }
  }
  return { geometry: toGeometry([part]), samples: shuffleSamples(list, 'column-samples-order') };
}

// --- Stufenkiefer ------------------------------------------------------------------------------------------

/** Stufen der Kiefer: (Unterkante y, Spitze y, Radius unten) in Einheiten der Kronenhöhe bzw. des Radius. */
export const PINE_TIERS: Array<[number, number, number]> = [
  [0.0, 0.42, 1.0],
  [0.17, 0.56, 0.8],
  [0.34, 0.7, 0.62],
  [0.5, 0.84, 0.45],
  [0.66, 1.0, 0.3],
];

/**
 * Stufenkiefer (Bild 05, Ebene_2/12): fünf überlappende Kegelstufen mit gezackter, leicht hängender Unterkante →
 * Sägezahn-Silhouette, auch am Waldrand. Einheit: Fuß der Krone y = 0, Spitze y = 1, unterer Radius 1. Die weißen
 * Punkte der Kiefern malt das Kronenmaterial in die Stufen (siehe crownMaterial, Punktreihen).
 */
export function createPineCrown(): CrownTemplate {
  const part = emptyPart();
  const teeth = 11;
  for (const [yb, ya, rb] of PINE_TIERS) {
    const base = part.pos.length / 3;
    part.pos.push(0, ya, 0);
    part.nor.push(0, 1, 0);
    const slope = rb / Math.max(1e-3, ya - yb);
    for (let k = 0; k < teeth * 2; k++) {
      const a = (k / (teeth * 2)) * Math.PI * 2;
      const tip = k % 2 === 0;
      const r = rb * (tip ? 1 : 0.78);
      const y = yb - (tip ? 0.03 : -0.01);
      part.pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      const n = norm(add(scale(norm([Math.cos(a), 1 / slope, Math.sin(a)]), 0.75), [0, 0.25, 0]));
      part.nor.push(n[0], n[1], n[2]);
    }
    for (let k = 0; k < teeth * 2; k++) {
      const a = base + 1 + k;
      const b = base + 1 + ((k + 1) % (teeth * 2));
      part.idx.push(base, b, a);
    }
  }
  // Punkte in Reihen an den Stufenkanten (Schnee auf den Zweigspitzen): von jeder Seite ein kleines Dreieck aus
  // weißen Punkten wie in Bild 05 — zwei Reihen je Stufe und die Spitze
  const list: number[] = [];
  PINE_TIERS.forEach(([yb, ya, rb], ti) => {
    const slope = rb / Math.max(1e-3, ya - yb);
    for (const [f, per] of [
      [0.94, 15],
      [0.55, 9],
    ] as const) {
      const n = Math.max(3, Math.round(per * rb));
      const y = yb + (ya - yb) * (1 - f) + 0.015;
      for (let k = 0; k < n; k++) {
        const a = ((k + (ti % 2) * 0.5 + f) / n) * Math.PI * 2;
        const nn = norm([Math.cos(a), 1 / slope, Math.sin(a)]);
        list.push(Math.cos(a) * rb * f, y, Math.sin(a) * rb * f, nn[0], nn[1], nn[2]);
      }
    }
  });
  list.push(0, 1.0, 0, 0, 1, 0);
  return { geometry: toGeometry([part]), samples: shuffleSamples(list, 'pine-samples-order') };
}

// --- Spitzenschleier -----------------------------------------------------------------------------------

/**
 * Spitzenschleier des Spitzenbaums (Bild 02 oben, Ebene_19 vorn, 16.47.13): Punktrosetten (Mitte + sechs Punkte) auf
 * der unteren Hälfte einer Kugelschale (Radius ≈ 0.95, Einheit Kronenradius, Hüllzentrum im Ursprung) — darunter
 * scheint das Astwerk durch. Stride 6 wie `samples`, je Rosette sieben aufeinanderfolgende Einträge.
 */
export function createLaceShell(rosettes = 90): Float32Array {
  const list: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  // Fibonacci-Kappe unterhalb von y = 0.15 (gleichmäßig dicht wie Spitze), Rosettenradius aus dem Abstand
  const yTop = 0.15;
  const yBot = -0.92;
  const area = 2 * Math.PI * (yTop - yBot);
  const rosR = Math.sqrt(area / rosettes / Math.PI) * 0.42;
  for (let i = 0; i < rosettes; i++) {
    const y = yTop - ((yTop - yBot) * (i + 0.5)) / rosettes;
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const ph = i * golden;
    const d: V3 = [rr * Math.cos(ph), y, rr * Math.sin(ph)];
    const c = scale(d, 0.95);
    const [t1, t2] = basis(d);
    list.push(c[0], c[1], c[2], d[0], d[1], d[2]);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + i;
      const p = add(c, add(scale(t1, Math.cos(a) * rosR), scale(t2, Math.sin(a) * rosR)));
      list.push(p[0], p[1], p[2], d[0], d[1], d[2]);
    }
  }
  return new Float32Array(list);
}

/** Rosetten im Spitzenschleier (Hoch; Mobil nimmt jede zweite). */
export const LACE_ROSETTES = 90;
