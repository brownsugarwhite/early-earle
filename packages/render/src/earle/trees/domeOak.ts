import type { BufferGeometry } from 'three/webgpu';
import { clamp, float, max, smoothstep, vec3 } from 'three/tsl';
import { hash32, mulberry32 } from '@ee/world';
import type { FloatNode, Vec3Node } from '../tsl';
import { stipple } from './patterns';
import { TreeMeshBuilder, add, bezier, bezier3, cross, dirFrom, len, norm, scale, sub, type TubePoint, type V3 } from './mesh';

/**
 * Kuppeleiche mit Tüpfelrock (Welt 04 Vordergrund, Ebene 19 rechts, 16.47.13 die Reihe im Schnee): oben eine dunkle,
 * fast schwarze Kuppel — die Kuppel-Masse der Hainbäume mit flach gedrückter Unterseite (eine Halbkuppel mit bogigem
 * Saum, siehe `CAP_SAG`; sie teilt das Kronen-Mesh der Kuppeln, kein eigener Zeichenaufruf) —, darunter der „Rock“:
 * das Astwerk fächert unter der Kuppel bis auf die untere Halbschale des Kreises aus, feine Tüpfel hängen an den Zweigen
 * (oben dicht, nach unten lichter) und jede Zweigspitze trägt einen runden Punktbausch; dazwischen liegt die Rockschale
 * mit den feinen Tüpfeln als Muster. Kuppel und Rock bilden zusammen fast einen Kreis; der kurze, kräftige Stamm gabelt
 * sich früh (Ebene 19: „die Punkte verraten das Skelett“).
 *
 * Einheit: Kronenradius r = 1 (waagrecht), Fuß im Ursprung, +Y oben. Nichts schwebt: jeder Punkt des Rocks sitzt auf
 * einem Zweig (Perlen) oder um eine Zweigspitze (Bausch), der Stamm läuft mit Wurzelanläufen unter den Boden.
 */

/**
 * Unterseite der Kuppel (Kuppel-Masse der Hainbäume): Anteil ihrer Tiefe unter der Kronenmitte, der bei der Kuppeleiche
 * bleibt — die Unterseite wird eine flache Schale, unter der der Rock beginnt. Gilt für Mesh (Vertex-Shader) und
 * Kronenpunkte (CPU) gleich, damit kein Punkt unter der Kuppel schwebt.
 */
export const CAP_SAG = 0.28;
/** Ebene der Rockschale im Rindenattribut (`bark.z`); `bark.x` trägt dort die Höhe im Rock (0 unten … 1 Saum). */
export const DOME_OAK_SKIRT_LEVEL = 5;

/**
 * Rock (untere Halbschale der Ellipse, die Kappe und Rock zusammen bilden): Mittelpunkt auf Höhe des Kappenäquators,
 * Halbachsen (Einheit r). Ebene 19 und 16.47.13: die Ellipse ist breiter als hoch und reicht fast bis zum Boden.
 */
export const DOME_OAK_SKIRT = { cy: 0.88, rx: 1.0, ry: 0.86 } as const;
/** Gabelhöhe des Stamms (Einheit r). */
export const DOME_OAK_FORK = 0.4;

export interface SkirtSite {
  /** Punkt auf dem Skelett (Einheit r). */
  p: V3;
  /** Außennormale (Licht des Punkts). */
  n: V3;
  /** Richtung des Zweigs an dieser Stelle. */
  d: V3;
}

export interface DomeOakGeometry {
  geometry: BufferGeometry;
  /** Bausch-Mitten: Enden der Rippen und der Tropfzweige (auf der unteren Schale). */
  tips: SkirtSite[];
  /** Perlen entlang der Rippen und Zweige und die Spitzen der feinen Fächerzweige (einzelne Tüpfel am Skelett). */
  beads: SkirtSite[];
  /** Mittellinien aller Äste und Zweige (Tests: jeder Punkt liegt auf dem Skelett). */
  paths: V3[][];
  /** Höchster Punkt und größte Ausladung (Einheit r). */
  top: number;
  spread: number;
}

/** Punkte entlang einer Kurve mit abnehmendem Radius (dick am Ansatz, haarfein an der Spitze). */
function taper(path: V3[], r0: number, r1: number, bulge = 0): TubePoint[] {
  return path.map((p, i) => {
    const t = i / (path.length - 1);
    return { p, r: (r0 + (r1 - r0) * Math.pow(t, 0.8)) * (1 + bulge * Math.sin(t * Math.PI)) };
  });
}

/** Punkt und Tangente bei Anteil t (0..1) einer Punktliste. */
function at(path: V3[], t: number): { p: V3; d: V3; i: number } {
  const x = Math.min(0.999, Math.max(0, t)) * (path.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = path[i]!;
  const b = path[i + 1]!;
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], d: norm(sub(b, a)), i };
}

/** Waagrechte Richtung um die Hochachse gedreht. */
function rotateY(d: V3, a: number): V3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [d[0] * c - d[2] * s, d[1], d[0] * s + d[2] * c];
}

/** Wurzelanlauf: Radiusfaktor über dem Boden (breiter Fuß, ab ≈ 0.2 r schlank). */
function flare(y: number): number {
  return 1 + 0.9 * Math.exp(-Math.max(0, y + 0.02) / 0.09);
}

/**
 * Skelett der Kuppeleiche (Ebene 19): kurzer, kräftiger, leicht geschwungener Stamm bis `DOME_OAK_FORK`, drei bis vier
 * Hauptäste steigen in weichen S-Bögen in die Kappe; von ihnen schwingen Rippen wie Schirmspeichen hinaus und senken
 * sich auf die untere Schale des Rocks (innere tiefer, äußere nahe am Äquator), an ihren Enden fächern feine Zweige
 * über die Schale auf, dazu hängen Tropfzweige aus ihrer Mitte. Rippen- und Tropfenden tragen Punktbäusche, entlang
 * der Zweige liegen Perlen (unter der Kappe dicht, zum Saum hin licht). ≈ 2900 Vertices.
 */
export function createDomeOakTrunk(seed = 9): DomeOakGeometry {
  const rand = mulberry32(hash32('trunk-dome-oak-v2', seed));
  const b = new TreeMeshBuilder();
  const tips: SkirtSite[] = [];
  const beads: SkirtSite[] = [];
  const paths: V3[][] = [];
  const S = DOME_OAK_SKIRT;
  const C: V3 = [0, S.cy, 0];
  let top = 0;
  let spread = 0;
  const note = (p: V3) => {
    top = Math.max(top, p[1]);
    spread = Math.max(spread, Math.hypot(p[0], p[2]));
  };
  /** Punkt der unteren Schale in Richtung (Azimut, Winkel unter dem Äquator) und ihre Normale. */
  const onShell = (az: number, el: number): { p: V3; n: V3 } => {
    const d: V3 = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
    const p: V3 = [C[0] + d[0] * S.rx, C[1] + d[1] * S.ry, C[2] + d[2] * S.rx];
    return { p, n: norm([d[0] / S.rx, d[1] / S.ry, d[2] / S.rx]) };
  };
  const shellNormal = (p: V3): V3 => norm([(p[0] - C[0]) / (S.rx * S.rx), (p[1] - C[1]) / (S.ry * S.ry), (p[2] - C[2]) / (S.rx * S.rx)]);
  /** Zurück auf die Schale (radial vom Mittelpunkt), nie über den Äquator. */
  const toShell = (q: V3): V3 => {
    const rel = sub(q, C);
    const k = Math.hypot(rel[0] / S.rx, rel[1] / S.ry, rel[2] / S.rx) || 1;
    return [C[0] + rel[0] / k, Math.min(C[1] - 0.02, C[1] + rel[1] / k), C[2] + rel[2] / k];
  };
  /** Perlen entlang einer Kurve im Rock: Abstand ≈ `step`, unter der Kappe dicht, zum Saum hin licht. */
  const beadAlong = (path: V3[], step: number, from = 0.12) => {
    let acc = rand() * step;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const c = path[i]!;
      const seg = len(sub(c, a));
      acc += seg;
      while (acc >= step) {
        acc -= step;
        const t = 1 - acc / Math.max(1e-6, seg);
        const p: V3 = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
        if (i / (path.length - 1) < from) continue;
        // Dichte: unter der Kappe voll, zum Saum hin licht (Ebene 19: der Rock löst sich nach unten auf)
        const h = (p[1] - (S.cy - S.ry)) / S.ry;
        if (p[1] > S.cy + 0.04 || rand() > 0.2 + 0.8 * Math.min(1, Math.max(0, h)) ** 1.2) continue;
        beads.push({ p, n: shellNormal(p), d: norm(sub(c, a)) });
      }
    }
  };
  const tube = (pts: V3[], r0: number, r1: number, radial: number, level: number, v0: number, bulge = 0): number => {
    const v = b.tube(taper(pts, r0, r1, bulge), radial, level, v0);
    paths.push(pts);
    for (const q of pts) note(q);
    return v;
  };

  // Stamm: kurz und kräftig, leicht geneigt und geschwungen, Wurzelanlauf in den Boden
  const r0 = 0.072;
  const yF = DOME_OAK_FORK;
  const lean = rand() * Math.PI * 2;
  const trunk: TubePoint[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const t = Math.pow(i / (n - 1), 1.4);
    const y = -0.22 + (yF + 0.22) * t;
    const above = Math.max(0, y) / yF;
    const off = 0.03 * Math.sin(above * Math.PI * 0.9) + 0.015 * above;
    trunk.push({ p: [Math.cos(lean) * off, y, Math.sin(lean) * off], r: r0 * (1 - 0.18 * above) * flare(y) });
  }
  const ys = trunk.map((q) => q.p[1]);
  const rootPhase = rand() * Math.PI * 2;
  // Querschnitt: vier weiche Wurzelrippen am Fuß
  const lobe = (a: number, ring: number): number => 1 + 0.28 * Math.max(0, Math.cos(4 * a + rootPhase)) ** 2 * Math.exp(-Math.max(0, (ys[ring] ?? 0) + 0.05) / 0.1);
  const vTop = b.tube(trunk, 9, 0, 0, lobe);
  const F = trunk[n - 1]!.p;
  const rF = trunk[n - 1]!.r;
  for (const p of trunk) note(p.p);

  const limbs = 3 + (rand() < 0.5 ? 1 : 0);
  const az0 = rand() * Math.PI * 2;
  for (let k = 0; k < limbs; k++) {
    const az = az0 + (k / limbs) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const reach = 0.38 + 0.2 * rand();
    const twist = (rand() - 0.5) * 0.5;
    // Hauptast: aus der Gabel schräg hinaus, dann steiler in die Kappe (weiches S, kein Stab)
    const p0: V3 = [F[0], F[1] - 0.04, F[2]];
    const p1 = add(F, add(scale(dirFrom(az, 0), 0.2 + 0.06 * rand()), [0, 0.14, 0]));
    const p2: V3 = [Math.cos(az + twist * 0.5) * reach * 0.9, S.cy - 0.12 + 0.06 * rand(), Math.sin(az + twist * 0.5) * reach * 0.9];
    const p3: V3 = [Math.cos(az + twist) * reach, S.cy + 0.16 + 0.06 * rand(), Math.sin(az + twist) * reach];
    const path = bezier3(p0, p1, p2, p3, 9);
    const limb = taper(path, rF * 0.64, 0.012, 0.06);
    b.tube(limb, 5, 1, vTop);
    paths.push(path);
    for (const p of path) note(p);
    // Rippen: wie Schirmspeichen hinaus und hinab auf die Schale (innere tiefer, äußere nahe am Äquator)
    const ribs = 5;
    for (let j = 0; j < ribs; j++) {
      const t = 0.18 + (j / ribs) * 0.74 + rand() * 0.05;
      const a = at(path, t);
      const rAt = limb[a.i]!.r;
      const side = j % 2 === 0 ? 1 : -1;
      const sAz = az + twist * t + side * (0.25 + rand() * 0.55);
      const el = -(0.08 + (1 - t) * 0.95 + rand() * 0.2);
      const target = onShell(sAz, el);
      const dir = sub(target.p, a.p);
      const dl = len(dir);
      const out = norm([Math.cos(sAz), 0, Math.sin(sAz)]);
      // Rippe: erst hinaus und leicht hinauf, dann im Bogen hinab (Schirmspeiche)
      const q1 = add(a.p, add(scale(out, dl * 0.42), [0, dl * 0.16, 0]));
      const q2 = add(target.p, add(scale(out, -dl * 0.14), [0, dl * 0.24, 0]));
      const sp = bezier3(a.p, q1, q2, target.p, 8);
      const vr = tube(sp, rAt * 0.58, 0.0052, 4, 2, vTop);
      beadAlong(sp, 0.05, 0.18);
      tips.push({ p: target.p, n: target.n, d: at(sp, 0.97).d });
      // Tropfzweige aus der Rippe: hängen hinab auf die Schale (Bausch am Ende)
      const drops = 1 + (rand() < 0.7 ? 1 : 0);
      for (let m = 0; m < drops; m++) {
        const da = at(sp, 0.35 + 0.3 * m + rand() * 0.1);
        const dAz = sAz + (rand() - 0.5) * 0.8;
        const below = Math.asin(Math.max(-1, Math.min(1, (da.p[1] - C[1]) / S.ry)));
        const tgt = onShell(dAz, Math.max(-1.35, Math.min(-0.2, below - 0.3 - rand() * 0.35)));
        const mid = add(scale(add(da.p, tgt.p), 0.5), add(scale(norm([Math.cos(dAz), 0, Math.sin(dAz)]), 0.05), [0, 0.03, 0]));
        const drop = bezier(da.p, mid, tgt.p, 5);
        tube(drop, 0.0058, 0.0028, 3, 2, vr);
        beadAlong(drop, 0.036, 0.2);
        tips.push({ p: tgt.p, n: tgt.n, d: norm(sub(tgt.p, mid)) });
      }
      // Fächer feiner Zweige an der Spitze: quer über die Schale, jede Spitze ein Tüpfel
      const endDir = at(sp, 0.97).d;
      const across = norm(cross(endDir, target.n));
      const twigs = 3;
      for (let m = 0; m < twigs; m++) {
        const spreadA = (m - (twigs - 1) / 2) * 0.7 + (rand() - 0.5) * 0.25;
        const tl = 0.09 + 0.07 * rand();
        const dirT = norm(add(add(scale(endDir, 0.5), scale(across, spreadA)), [0, -0.45, 0]));
        const tip = toShell(add(target.p, scale(dirT, tl)));
        const mid = add(scale(add(target.p, tip), 0.5), scale(target.n, tl * 0.2));
        const twig = bezier(target.p, mid, tip, 4);
        tube(twig, 0.0045, 0.0025, 3, 2, vr);
        beads.push({ p: tip, n: shellNormal(tip), d: norm(sub(tip, mid)) });
      }
    }
    // Obere Äste in die Kappe hinein (tragen sie, von unten zwischen den Bäuschen sichtbar)
    for (const t of [0.55, 0.8]) {
      const a = at(path, t + rand() * 0.06);
      const rAt = limb[a.i]!.r;
      const uAz = az + (rand() - 0.5) * 1.6;
      const end: V3 = [Math.cos(uAz) * (0.5 + 0.25 * rand()), S.cy + 0.1 + 0.08 * rand(), Math.sin(uAz) * (0.5 + 0.25 * rand())];
      const up = bezier(a.p, add(a.p, [0, 0.1, 0]), end, 5);
      tube(up, rAt * 0.5, 0.006, 3, 2, vTop);
    }
    // Saum unter der Kappe (Ebene 19: die dunkle Masse löst sich nach unten in Punkte auf): Saumrippen laufen knapp
    // unter der Kappe hinaus, von ihnen hängen kurze Fransenzweige, dicht mit Perlen besetzt (außen länger)
    for (const side of [-1, 1]) {
      const a = at(path, 0.7 + rand() * 0.12);
      const rAt = limb[a.i]!.r;
      const fAz = az + side * (0.3 + 0.35 * rand());
      const out = norm([Math.cos(fAz), 0, Math.sin(fAz)]);
      const reachF = 0.88 + 0.08 * rand();
      const end: V3 = [Math.cos(fAz) * reachF, S.cy - 0.06, Math.sin(fAz) * reachF];
      const rib = bezier(a.p, add(a.p, add(scale(out, 0.22), [0, 0.02, 0])), end, 8);
      const vf = tube(rib, rAt * 0.45, 0.0048, 3, 2, vTop);
      let acc = rand() * 0.05;
      for (let i = 1; i < rib.length; i++) {
        const q = rib[i]!;
        acc += len(sub(q, rib[i - 1]!));
        const rq = Math.hypot(q[0], q[2]);
        if (acc < 0.085 || rq < 0.28) continue;
        acc = 0;
        const hang = 0.08 + 0.2 * Math.min(1, rq / reachF) + 0.07 * rand();
        const sway = rotateY(out, (rand() - 0.5) * 1.4);
        const tip = toShell(add(q, add(scale(sway, hang * 0.35), [0, -hang, 0])));
        const mid = add(scale(add(q, tip), 0.5), scale(sway, hang * 0.12));
        const twig = bezier(q, mid, tip, 4);
        tube(twig, 0.004, 0.0024, 3, 2, vf);
        beadAlong(twig, 0.042, 0.05);
        if (rand() < 0.35) tips.push({ p: tip, n: shellNormal(tip), d: norm(sub(tip, mid)) });
        else beads.push({ p: tip, n: shellNormal(tip), d: norm(sub(tip, mid)) });
      }
    }
  }
  // Wurzelanläufe, die schräg in den Boden laufen
  const rootAz = rand() * Math.PI * 2;
  for (let k = 0; k < 4; k++) {
    const az = rootAz + (k / 4) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const reach = 0.15 * (1 + 0.4 * rand());
    const path: V3[] = [
      [0, 0.1, 0],
      [Math.cos(az) * reach * 0.55, 0.0, Math.sin(az) * reach * 0.55],
      [Math.cos(az) * reach, -0.12, Math.sin(az) * reach],
    ];
    b.tube(taper(path, r0 * 1.2, 0.016), 4, 3, 0);
  }
  skirtShell(b);
  return { geometry: b.toGeometry(), tips, beads, paths, top, spread };
}

/**
 * Rockschale: die untere Halbschale der Rock-Ellipse (`DOME_OAK_SKIRT`), Ebene `DOME_OAK_SKIRT_LEVEL`. Sie trägt die
 * feinen Tüpfel des Rocks als Muster (`skirtStipple`, mit Alpha-to-Coverage: wo kein Punkt ist, bleibt sie offen) —
 * so viele Punkte, wie Earle malt, ohne das Punktbudget der Instanzen; das Skelett mit Perlen und Bäuschen hängt darin.
 * Im Schattenpass fällt sie in den Fuß zusammen (kein Schattenteppich). Ringe zum Saum hin dichter.
 */
function skirtShell(b: TreeMeshBuilder, rings = 7, segments = 22): void {
  const S = DOME_OAK_SKIRT;
  const pos: number[] = [];
  const nor: number[] = [];
  const bark: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const th = (Math.PI / 2) * (1 - (1 - t) ** 1.3);
    for (let j = 0; j <= segments; j++) {
      const ph = (j / segments) * Math.PI * 2;
      const c = Math.cos(th);
      const x = Math.cos(ph) * c * S.rx;
      const z = Math.sin(ph) * c * S.rx;
      const y = S.cy - Math.sin(th) * S.ry;
      pos.push(x, y, z);
      const n = norm([x / (S.rx * S.rx), (y - S.cy) / (S.ry * S.ry), z / (S.rx * S.rx)]);
      nor.push(n[0], n[1], n[2]);
      bark.push(1 - Math.sin(th), 0, DOME_OAK_SKIRT_LEVEL, 0);
    }
  }
  const row = segments + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * row + j;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  b.append(pos, nor, bark, idx);
}

/**
 * Tüpfel der Rockschale (Fragmentstufe): `p` Musterkoordinate (Archetyp-Einheiten), `height` 0 unten … 1 am Saum,
 * `light` 0..1 (Sonnenseite: einige Tüpfel in der Schattenpunktfarbe statt Tinte). Dichte und Punktgröße nehmen zum Saum
 * hin ab (Ebene 19), direkt unter der Kappe liegt eine zweite, feinere Lage — der dunkle Saum löst sich in Punkte auf.
 * Aus der Ferne (Zellen unter ≈ 2,5 px) blenden die Tüpfel aus wie die der Kronen; es bleibt das Skelett.
 * Rückgabe: Deckung und Palettenstufe (3 = Schattenpunktfarbe, 0 = Tinte).
 */
export function skirtStipple(p: Vec3Node, height: FloatNode, light: FloatNode, cell: number): { mask: FloatNode; index: FloatNode } {
  const h = clamp(height, 0, 1);
  const density = float(0.3).add(h.pow(1.2).mul(0.66));
  const size = float(0.26).add(h.mul(0.14));
  const st = stipple(p, cell, size, float(1), density);
  const fine = stipple(p.mul(1.9).add(vec3(0.37, 0.11, 0.73)), cell, float(0.28), smoothstep(0.62, 0.95, h), smoothstep(0.55, 0.9, h));
  const mask = max(st.mask, fine.mask);
  const index = light.greaterThan(st.key.mul(0.55).add(0.3)).select(float(3), float(0));
  return { mask: mask as unknown as FloatNode, index: index as unknown as FloatNode };
}

// --- Punkte des Rocks ------------------------------------------------------------------------------------------

/** Ablage eines Punkts (Archetyp-Raum → Welt übernimmt der Aufrufer): Position, Normale, Größe (Anteil), Schattenannahme. */
export type SkirtDotSink = (p: V3, n: V3, size: number) => void;

/**
 * Punkte des Tüpfelrocks (Archetyp-Einheiten): Bäusche um die Zweigspitzen (kleine, abgeflachte Kugeln aus Punkten,
 * Ebene 19: runde Punktbüschel am Saum) und Perlen entlang der Zweige, alle am Skelett. `stride` dünnt aus (Mobil,
 * volles Chunk-Budget: jede k-te Spitze bzw. Perle), `rand` liefert den festen Zufall des Baums.
 */
export function skirtDots(g: DomeOakGeometry, stride: number, rand: () => number, sink: SkirtDotSink): void {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const per = stride > 1 ? 7 : 10;
  for (let i = 0; i < g.tips.length; i += stride) {
    const t = g.tips[i]!;
    sink(t.p, t.n, 1);
    const R = 0.065 + 0.04 * rand();
    const ph0 = rand() * Math.PI * 2;
    for (let k = 0; k < per; k++) {
      // Fibonacci-Punkte in einer abgeflachten Kugel um die Spitze, etwas nach unten gehängt
      const yy = 1 - (2 * (k + 0.5)) / per;
      const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
      const ph = k * golden + ph0;
      const rad = R * (0.55 + 0.45 * Math.sqrt(rand()));
      const p: V3 = [t.p[0] + rr * Math.cos(ph) * rad, t.p[1] + yy * rad * 0.8 - R * 0.2, t.p[2] + rr * Math.sin(ph) * rad];
      sink(p, t.n, 0.6 + 0.3 * rand());
    }
  }
  for (let i = 0; i < g.beads.length; i += stride) {
    const b = g.beads[i]!;
    sink(b.p, b.n, 0.55 + 0.35 * rand());
  }
}

/** Anzahl der Rock-Punkte eines Baums bei `stride` (Budget). */
export function skirtDotCount(g: DomeOakGeometry, stride: number): number {
  const per = stride > 1 ? 7 : 10;
  return Math.ceil(g.tips.length / stride) * (per + 1) + Math.ceil(g.beads.length / stride);
}

