import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import type { CrownTemplate } from './crowns';
import { TreeMeshBuilder, add, bezier, bezier3, dirFrom, norm, scale, type TubePoint, type V3 } from './mesh';

/**
 * Schirmbaum der Nebelweide (Welt 11, Ebene 20): ein breiter, flacher Pilzhut mit glatter Bogenkante oben, unten gerade
 * abgeschnitten, an einer Seite tiefer hängend wie eine Pinie im Wind; unter dem Hut hängen kleine Laubtrauben (dunkle
 * Fransen mit Lücken, durch die der Nebel scheint). Der Stamm ist kurz und dünn und gabelt sich tief in drei bis vier
 * Äste, die fächerförmig unter den Hut steigen.
 *
 * Einheit: Kronenradius r = 1 (halbe Hutbreite). Die Krone hat ihren Ursprung in der Mitte der Hutunterseite (y = 0),
 * der Scheitel liegt bei `PARASOL_CAP.height`; der Stamm-Archetyp hat den Fuß im Ursprung und reicht bis `top`.
 */

/** Hutmaße (Einheit r): Scheitelhöhe über der Unterseite, Hängen des Rands (ringsum, eine Seite tiefer), Fransenlänge. */
export const PARASOL_CAP = { height: 0.46, droop: 0.16, hook: 0.16, fringe: 0.1 } as const;

interface Part {
  pos: number[];
  nor: number[];
  cast: number[];
  idx: number[];
}

function geometryOf(p: Part): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p.pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(p.nor, 3));
  g.setAttribute('crownCast', new Float32BufferAttribute(p.cast, 1));
  g.setIndex(new Uint16BufferAttribute(p.idx, 1));
  g.computeBoundingSphere();
  return g;
}

/** Deterministisch mischen (Stride k) mit paralleler Liste. */
function shuffled(list: number[], extra: number[], k: number, seed: string): { list: Float32Array; extra: Float32Array } {
  const rand = mulberry32(hash32(seed));
  const n = list.length / k;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = order[i]!;
    order[i] = order[j]!;
    order[j] = t;
  }
  const out = new Float32Array(list.length);
  const ex = new Float32Array(n);
  order.forEach((src, dst) => {
    for (let c = 0; c < k; c++) out[dst * k + c] = list[src * k + c]!;
    ex[dst] = extra[src]!;
  });
  return { list: out, extra: ex };
}

/** Randradius und Hängen des Huts je Azimut (leicht gebuchtet, ringsum hängend, eine Seite tiefer wie ein Haken). */
function rimAt(phi: number): { rho: number; drop: number } {
  const rho = 1 + 0.035 * Math.sin(5 * phi + 0.7) + 0.025 * Math.sin(9 * phi + 2.1) + 0.015 * Math.sin(13 * phi + 0.3);
  // Tiefe Seite um φ = 0 (je Baum gedreht): der Hut rollt dort wie ein Haken nach unten (Ebene 20, oben Mitte)
  const side = Math.max(0, Math.cos(phi));
  return { rho: rho * (1 - 0.06 * side * side), drop: PARASOL_CAP.droop * (0.85 + 0.15 * Math.sin(3 * phi + 1.3)) + PARASOL_CAP.hook * side * side * side };
}

/** Oberseite des Huts: Höhe bei relativem Radius s ∈ [0, 1] (0 Scheitel, 1 Rand) und Azimut φ. */
function capTop(s: number, phi: number): { y: number; rho: number } {
  const rim = rimAt(phi);
  // Schirm: flacher Scheitel, zum Rand weich und dann steil hinab bis unter die Unterseite (hängender Rand)
  const ss = Math.min(1, s);
  const dome = PARASOL_CAP.height * Math.pow(Math.max(0, 1 - Math.pow(ss, 2.2)), 0.5);
  const drop = rim.drop * Math.pow(ss, 3.2);
  return { y: dome - drop, rho: ss * rim.rho };
}

/** Unterseite des Huts bei relativem Radius s: innen flach (Laubdach über den Ästen), zum Rand dem hängenden Rand folgend. */
function capUnder(s: number, phi: number): number {
  const rim = rimAt(phi);
  const t = Math.max(0, (s - 0.62) / 0.38);
  return 0.02 - (rim.drop - 0.05) * t * t;
}

/**
 * Hut (Oberseite, Randwulst, Unterseite) und hängende Laubtrauben. Normalen: Hüllnormale einer flachen Kuppel
 * (ruhige Lichtbänder über den ganzen Hut) mit einem Hauch Flächennormale; Unterseite und Trauben nehmen Schlagschatten
 * an, die Oberseite bleibt frei (heller Scheitel).
 */
export function createParasolCrown(detail: 'ultra' | 'hoch' | 'mobil' = 'hoch'): CrownTemplate {
  const [seg, rings, lobeSeg] = detail === 'ultra' ? [48, 10, 6] : detail === 'hoch' ? [36, 8, 5] : [24, 6, 4];
  const rand = mulberry32(hash32('parasol-crown-v1'));
  const part: Part = { pos: [], nor: [], cast: [], idx: [] };
  const H = PARASOL_CAP.height;
  // Hüllnormale einer abgeflachten Kuppel (Halbachsen 1, H·1.6): führt das Licht über den ganzen Hut
  const hullN = (p: V3): V3 => norm([p[0], (p[1] + 0.12) / (H * H * 2.2), p[2]]);
  const push = (p: V3, n: V3, cast: number) => {
    part.pos.push(p[0], p[1], p[2]);
    part.nor.push(n[0], n[1], n[2]);
    part.cast.push(cast);
  };
  // --- Oberseite: Ringe vom Scheitel zum Rand -----------------------------------------------------------------
  const top0 = part.pos.length / 3;
  push([0, H, 0], [0, 1, 0], 0);
  const ringStart: number[] = [];
  for (let i = 1; i <= rings; i++) {
    const s = Math.pow(i / rings, 0.8);
    ringStart.push(part.pos.length / 3);
    for (let j = 0; j < seg; j++) {
      const phi = (j / seg) * Math.PI * 2;
      const { y, rho } = capTop(s, phi);
      const p: V3 = [Math.cos(phi) * rho, y, Math.sin(phi) * rho];
      // Randnähe nimmt Schlagschatten an (die Kante hängt in den Schatten), die Kuppel bleibt frei
      push(p, hullN(p), s > 0.9 ? 1 : 0);
    }
  }
  for (let j = 0; j < seg; j++) part.idx.push(top0, ringStart[0]! + ((j + 1) % seg), ringStart[0]! + j);
  for (let i = 1; i < rings; i++) {
    const a = ringStart[i - 1]!;
    const b = ringStart[i]!;
    for (let j = 0; j < seg; j++) {
      const j1 = (j + 1) % seg;
      part.idx.push(a + j, a + j1, b + j, a + j1, b + j1, b + j);
    }
  }
  // --- Randwulst und Unterseite: der Rand rollt nach innen, die Unterseite ist fast gerade ------------------------
  const outer = ringStart[rings - 1]!;
  const lip = part.pos.length / 3;
  for (let j = 0; j < seg; j++) {
    const phi = (j / seg) * Math.PI * 2;
    const { rho, drop } = rimAt(phi);
    const p: V3 = [Math.cos(phi) * rho * 0.955, -drop - 0.02, Math.sin(phi) * rho * 0.955];
    push(p, norm([Math.cos(phi) * 0.6, -0.8, Math.sin(phi) * 0.6]), 1);
  }
  const under = part.pos.length / 3;
  for (let j = 0; j < seg; j++) {
    const phi = (j / seg) * Math.PI * 2;
    const { rho } = rimAt(phi);
    // Unterseite: vom hängenden Rand hinauf zum flachen Laubdach, das die Äste trägt
    const p: V3 = [Math.cos(phi) * rho * 0.62, capUnder(0.62, phi), Math.sin(phi) * rho * 0.62];
    push(p, [0, -1, 0], 1);
  }
  const bottomC = part.pos.length / 3;
  push([0, 0.03, 0], [0, -1, 0], 1);
  for (let j = 0; j < seg; j++) {
    const j1 = (j + 1) % seg;
    part.idx.push(outer + j, outer + j1, lip + j, outer + j1, lip + j1, lip + j);
    part.idx.push(lip + j, lip + j1, under + j, lip + j1, under + j1, under + j);
    part.idx.push(under + j, under + j1, bottomC);
  }
  // --- Laubtrauben unter dem Hut: kleine hängende Ellipsoide in zwei Ringen, mit Lücken --------------------------
  const lobes: Array<{ c: V3; r: number; h: number }> = [];
  // Fransen: viele kleine, unregelmäßige Trauben an der Unterkante des Rands und unter dem Laubdach
  // (relativer Radius, Anzahl, Tropfenbreite, Länge): außen lange, schmale Tropfen (die Franse der Silhouette)
  const ringDef: Array<[number, number, number, number]> = [
    [0.94, 46, 0.055, 0.2],
    [0.84, 32, 0.05, 0.15],
    [0.66, 18, 0.045, 0.1],
  ];
  for (const [rr, count, size, len] of ringDef) {
    for (let k = 0; k < count; k++) {
      if (rand() < 0.3) continue; // Lücken: der Nebel scheint zwischen den Trauben durch
      const phi = ((k + rand() * 0.8) / count) * Math.PI * 2;
      const { rho } = rimAt(phi);
      const r = size * (0.7 + 0.6 * rand());
      const h = len * (0.35 + 0.9 * rand() * rand());
      const y0 = capUnder(rr, phi) - 0.01;
      lobes.push({ c: [Math.cos(phi) * rho * rr, y0 - h * 0.5, Math.sin(phi) * rho * rr], r, h });
    }
  }
  for (const l of lobes) {
    const base = part.pos.length / 3;
    const ry = Math.max(l.r, l.h * 0.55);
    for (let i = 0; i <= lobeSeg - 2; i++) {
      const th = ((i + 0.5) / (lobeSeg - 1)) * Math.PI;
      for (let j = 0; j < lobeSeg; j++) {
        const ph = (j / lobeSeg) * Math.PI * 2;
        const d: V3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
        const p: V3 = [l.c[0] + d[0] * l.r, l.c[1] + d[1] * ry, l.c[2] + d[2] * l.r];
        // Trauben tragen die Hüllnormale des Huts (sie gehören zur Masse) mit etwas Eigenform
        const n = norm(add(scale(norm([d[0] / l.r, d[1] / ry, d[2] / l.r]), 0.35), scale(hullN([p[0], -0.1, p[2]]), 0.65)));
        push(p, n, 1);
      }
    }
    const rowsN = lobeSeg - 1;
    for (let i = 0; i < rowsN - 1; i++) {
      for (let j = 0; j < lobeSeg; j++) {
        const j1 = (j + 1) % lobeSeg;
        const a = base + i * lobeSeg + j;
        const b = base + (i + 1) * lobeSeg + j;
        part.idx.push(a, base + i * lobeSeg + j1, b, base + i * lobeSeg + j1, base + (i + 1) * lobeSeg + j1, b);
      }
    }
    // Kappen oben und unten
    const topC = part.pos.length / 3;
    push([l.c[0], l.c[1] + ry, l.c[2]], hullN([l.c[0], 0, l.c[2]]), 1);
    const botC = part.pos.length / 3;
    push([l.c[0], l.c[1] - ry, l.c[2]], [0, -1, 0], 1);
    for (let j = 0; j < lobeSeg; j++) {
      const j1 = (j + 1) % lobeSeg;
      part.idx.push(topC, base + j1, base + j);
      part.idx.push(botC, base + (rowsN - 1) * lobeSeg + j, base + (rowsN - 1) * lobeSeg + j1);
    }
  }
  // --- Punkte: feiner Punktrand auf der Oberseite nahe der Kante (Lichtseite je Instanz), Saum an den Trauben ----
  const samples: number[] = [];
  const sampleCast: number[] = [];
  const srand = mulberry32(hash32('parasol-samples-v1'));
  for (let k = 0; k < 220; k++) {
    const phi = srand() * Math.PI * 2;
    // dicht an der Kante (Silhouette von oben und von der Seite), einige weiter innen
    const s = srand() < 0.75 ? 0.82 + 0.18 * srand() : 0.45 + 0.4 * srand();
    const { y, rho } = capTop(s, phi);
    const p: V3 = [Math.cos(phi) * rho, y, Math.sin(phi) * rho];
    const n = hullN(p);
    samples.push(p[0], p[1], p[2], n[0], n[1], n[2]);
    sampleCast.push(s > 0.9 ? 1 : 0);
  }
  const rims: number[] = [];
  const rimCast: number[] = [];
  for (const l of lobes) {
    // Saum: je Traube ein bis zwei Punkte an der Unterkante (Laub, durch das Licht fällt)
    const n = norm([l.c[0], -0.4, l.c[2]]);
    rims.push(l.c[0], l.c[1] - l.h * 0.45, l.c[2], n[0], n[1], n[2]);
    rimCast.push(1);
  }
  const s = shuffled(samples, sampleCast, 6, 'parasol-samples-order');
  const r = shuffled(rims, rimCast, 6, 'parasol-rims-order');
  return { geometry: geometryOf(part), samples: s.list, sampleCast: s.extra, rims: r.list, rimCast: r.extra };
}

// --- Stamm ----------------------------------------------------------------------------------------------------

export interface ParasolTrunk {
  geometry: BufferGeometry;
  /** Höchster Punkt (Einheit r) und größte Ausladung. */
  top: number;
  spread: number;
}

/** Punkte entlang einer Kurve mit abnehmendem Radius. */
function taper(path: V3[], r0: number, r1: number): TubePoint[] {
  return path.map((p, i) => {
    const t = i / (path.length - 1);
    return { p, r: r0 + (r1 - r0) * Math.pow(t, 0.9) };
  });
}

/**
 * Stamm des Schirmbaums (Einheit Kronenradius r, Fuß im Ursprung): ein kurzer, dünner, leicht geneigter Schaft, der
 * sich tief (bei ≈ 0.12–0.2 r) in drei bis vier Äste gabelt; die Äste steigen steil und schwingen fächerförmig nach
 * außen unter den Hut (`hatY` = Unterseite des Huts über dem Fuß), wo sie sich noch einmal teilen und haarfein im Laub
 * enden. Wurzelanläufe sinken in den Boden.
 */
export function createParasolTrunk(hatY: number, seed = 7): ParasolTrunk {
  const rand = mulberry32(hash32('trunk-parasol-v1', seed));
  const b = new TreeMeshBuilder();
  const r0 = 0.048;
  const forkY = 0.12 + 0.06 * rand();
  const lean: V3 = [(rand() - 0.5) * 0.08, 0, (rand() - 0.5) * 0.08];
  const stem: TubePoint[] = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const y = -0.2 + (forkY + 0.2) * t;
    const above = Math.max(0, y) / forkY;
    const flare = 1 + 1.1 * Math.exp(-Math.max(0, y + 0.02) / 0.05);
    stem.push({ p: [lean[0] * above, y, lean[2] * above], r: r0 * flare * (1 - 0.1 * above) });
  }
  const vTop = b.tube(stem, 6, 0);
  const F = stem[n - 1]!.p;
  const rF = stem[n - 1]!.r;
  let top = 0;
  let spread = 0;
  const note = (p: V3) => {
    top = Math.max(top, p[1]);
    spread = Math.max(spread, Math.hypot(p[0], p[2]));
  };
  const limbs = 3 + (rand() < 0.5 ? 1 : 0);
  const az0 = rand() * Math.PI * 2;
  for (let k = 0; k < limbs; k++) {
    const az = az0 + (k / limbs) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const reach = 0.3 + 0.32 * rand();
    const end: V3 = [Math.cos(az) * reach, hatY + 0.04, Math.sin(az) * reach];
    // steil hinauf, dann nach außen unter den Hut (leichtes S wie Earles Linien)
    const p1 = add(F, [Math.cos(az) * 0.05, (hatY - F[1]) * 0.35, Math.sin(az) * 0.05]);
    const p2 = add(end, [-Math.cos(az) * reach * 0.35, -(hatY - F[1]) * 0.22, -Math.sin(az) * reach * 0.35]);
    const path = bezier3([F[0], F[1] - 0.03, F[2]], p1, p2, end, 6);
    const limb = taper(path, rF * 0.78, rF * 0.32);
    b.tube(limb, 4, 1, vTop);
    for (const p of path) note(p);
    // Zweige unter dem Hut: zwei bis drei feine, auffächernde Enden
    const twigs = 2 + (rand() < 0.6 ? 1 : 0);
    for (let m = 0; m < twigs; m++) {
      const at = path[3 + Math.floor(rand() * 2)]!;
      const taz = az + (m - (twigs - 1) / 2) * 0.7 + (rand() - 0.5) * 0.3;
      const tr = reach + 0.08 + 0.2 * rand();
      const tip: V3 = [Math.cos(taz) * tr, hatY + 0.02 + 0.03 * rand(), Math.sin(taz) * tr];
      const mid = add(scale(add(at, tip), 0.5), [0, 0.04, 0]);
      const tw = bezier(at, mid, tip, 4);
      b.tube(taper(tw, rF * 0.3, rF * 0.1), 3, 2, vTop);
      for (const p of tw) note(p);
    }
  }
  // kurze Wurzelanläufe
  const rootAz = rand() * Math.PI * 2;
  for (let k = 0; k < 3; k++) {
    const az = rootAz + (k / 3) * Math.PI * 2;
    const d = dirFrom(az, 0);
    const path: V3[] = [
      [0, 0.06, 0],
      [d[0] * 0.07, 0.0, d[2] * 0.07],
      [d[0] * 0.13, -0.08, d[2] * 0.13],
    ];
    b.tube(taper(path, r0 * 1.2, 0.01), 3, 3, 0);
  }
  return { geometry: b.toGeometry(), top, spread };
}
