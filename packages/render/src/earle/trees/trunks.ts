import type { BufferGeometry } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { TreeMeshBuilder, add, bezier, bezier3, dirFrom, norm, scale, type TubePoint, type V3 } from './mesh';

/**
 * Stamm-Archetypen der Bäume v3 (Einheit: Stammhöhe H = 1, Fuß im Ursprung, +Y oben). Keine geraden Zylinder:
 * leicht S-förmig geschwungene, sich verjüngende Stämme mit Wurzelanlauf, der in den Boden sinkt (y < 0, nichts
 * schwebt), Knoten als Radiusbeulen, Gabelungen in Äste, die sich zu feinen Spitzen verjüngen.
 * - `fork`: Hainbaum — Stamm gabelt sich in drei Äste, die in der Krone verschwinden (wenige Vertices, viele Instanzen);
 *   waagrecht schmal skaliert auch der Schaft der Tannen, Pappeln und Kathedralenbäume.
 * - `fan`: Schirm- und Spitzenbaum — kurzer Stamm, fünf Äste als Fächer mit Nebenästen (sichtbares Astwerk).
 * - `oak`: knorrige Earle-Eiche (Bild 04) — gedrehter Stamm, bogig ausladende Äste, die nach unten schwingen, feine
 *   hängende Zweige; die Spitzen tragen die Sternnadeln (siehe `OakGeometry.tips`).
 */

/** Wurzelanlauf: Radiusfaktor über dem Boden (Stammfuß breit, ab ≈ 0.25 H schlank). */
function flare(y: number, strength: number, reach: number): number {
  return 1 + strength * Math.exp(-Math.max(0, y + 0.02) / reach);
}

/** Geschwungener Stamm von y0 bis y1 (n Punkte), Radius r0 mit Wurzelanlauf, Knoten und leichter Verjüngung. */
function stem(rand: () => number, y0: number, y1: number, n: number, r0: number, flareStrength: number, amp: number, taper = 0.35): TubePoint[] {
  const ph1 = rand() * Math.PI * 2;
  const ph2 = rand() * Math.PI * 2;
  const k1 = 1.1 + rand() * 0.6;
  const k2 = 0.8 + rand() * 0.6;
  const knots = [0.25 + rand() * 0.2, 0.55 + rand() * 0.25];
  const out: TubePoint[] = [];
  for (let i = 0; i < n; i++) {
    // Ringe am Fuß dichter (t^1.5): der Wurzelanlauf wölbt sich weich in den Boden statt als Stufe
    const t = Math.pow(i / (n - 1), 1.5);
    const y = y0 + (y1 - y0) * t;
    const above = Math.max(0, y) / Math.max(1e-3, y1);
    const x = amp * (Math.sin(ph1 + above * Math.PI * k1) - Math.sin(ph1));
    const z = amp * (Math.sin(ph2 + above * Math.PI * k2) - Math.sin(ph2));
    let knot = 0;
    for (const kk of knots) knot += Math.exp(-(((above - kk) / 0.05) ** 2));
    const r = r0 * (1 - taper * above) * flare(y, flareStrength, 0.075) * (1 + 0.12 * knot);
    out.push({ p: [x, y, z], r });
  }
  return out;
}

/** Punkte entlang einer Kurve mit linear abnehmendem Radius (Ast: dick am Ansatz, fein an der Spitze). */
function taperAlong(path: V3[], r0: number, r1: number, bulge = 0): TubePoint[] {
  return path.map((p, i) => {
    const t = i / (path.length - 1);
    return { p, r: (r0 + (r1 - r0) * Math.pow(t, 0.85)) * (1 + bulge * Math.sin(t * Math.PI)) };
  });
}

/** Hainbaum: Stamm mit Gabelung in drei Äste (in der Krone), drei Wurzelanläufe. ≈ 130 Vertices. */
export function createForkTrunk(seed = 11): BufferGeometry {
  const rand = mulberry32(hash32('trunk-fork', seed));
  const b = new TreeMeshBuilder();
  const r0 = 0.07;
  const pts = stem(rand, -0.28, 0.74, 6, r0, 1.6, 0.03);
  const vTop = b.tube(pts, 6, 0);
  const top = pts[pts.length - 1]!;
  const F = top.p;
  const rF = top.r;
  const limbs = 3;
  const az0 = rand() * Math.PI * 2;
  for (let k = 0; k < limbs; k++) {
    const az = az0 + (k / limbs) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const el = 0.95 + rand() * 0.3;
    const L = 0.55 + rand() * 0.2;
    const d = dirFrom(az, el);
    const p0: V3 = [F[0], F[1] - 0.06, F[2]];
    const p1 = add(F, scale(d, L * 0.5));
    const p2 = add(add(F, scale(d, L)), [0, L * 0.22, 0]);
    b.tube(taperAlong(bezier(p0, p1, p2, 3), rF * 0.68, 0.012), 4, 1, vTop);
  }
  // Wurzelanläufe: kurze, flache Stränge, die schräg in den Boden laufen
  const rootAz = rand() * Math.PI * 2;
  for (let k = 0; k < 3; k++) {
    const az = rootAz + (k / 3) * Math.PI * 2 + (rand() - 0.5) * 0.7;
    const c = Math.cos(az);
    const s = Math.sin(az);
    const reach = 0.2 + rand() * 0.08;
    const path: V3[] = [
      [0, 0.12, 0],
      [c * reach * 0.55, 0.0, s * reach * 0.55],
      [c * reach, -0.14, s * reach],
    ];
    b.tube(taperAlong(path, r0 * 1.25, 0.018), 4, 3, 0);
  }
  return b.toGeometry();
}

/**
 * Schirm-/Spitzenbaum: kurzer Stamm (bis 0.42 H), fünf Hauptäste im Fächer bis in die Kuppel (y ≈ 1.1–1.4, Spannweite
 * ≈ 0.8 H), je zwei Nebenäste; alles verjüngt sich zu feinen Spitzen (Ebene_1, Bildschirmfoto 16.47.13, Bild 02).
 */
export function createFanTrunk(seed = 5): BufferGeometry {
  const rand = mulberry32(hash32('trunk-fan', seed));
  const b = new TreeMeshBuilder();
  const r0 = 0.075;
  const pts = stem(rand, -0.28, 0.42, 6, r0, 1.4, 0.025, 0.2);
  const vTop = b.tube(pts, 7, 0);
  const top = pts[pts.length - 1]!;
  const F = top.p;
  const limbs = 5;
  const az0 = rand() * Math.PI * 2;
  for (let k = 0; k < limbs; k++) {
    const az = az0 + (k / limbs) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const el = 0.62 + rand() * 0.45; // 35–62° über der Horizontalen
    const L = 0.72 + rand() * 0.2;
    const d = dirFrom(az, el);
    const p0: V3 = [F[0], F[1] - 0.08, F[2]];
    const p1 = add(F, scale(d, L * 0.45));
    const p2 = add(add(F, scale(d, L * 0.8)), [0, L * 0.18, 0]);
    const p3 = add(add(F, scale(d, L)), [0, L * 0.42, 0]);
    const path = bezier3(p0, p1, p2, p3, 6);
    const limb = taperAlong(path, top.r * 0.6, 0.01, 0.06);
    const vEnd = b.tube(limb, 5, 1, vTop);
    void vEnd;
    // Nebenäste bei 45 % und 70 %
    for (const [t, side] of [
      [0.45, 1],
      [0.7, -1],
    ] as const) {
      const i = Math.round(t * (path.length - 1));
      const at = path[i]!;
      const rAt = limb[i]!.r;
      const sAz = az + side * (0.55 + rand() * 0.35);
      const sEl = el + 0.25 + rand() * 0.25;
      const sd = dirFrom(sAz, Math.min(1.35, sEl));
      const sl = L * (0.3 + rand() * 0.12);
      const q0 = at;
      const q1 = add(at, scale(sd, sl * 0.55));
      const q2 = add(add(at, scale(sd, sl)), [0, sl * 0.25, 0]);
      b.tube(taperAlong(bezier(q0, q1, q2, 3), rAt * 0.7, 0.006), 4, 2, vTop + t * L);
    }
  }
  return b.toGeometry();
}

export interface OakGeometry {
  geometry: BufferGeometry;
  /** Nadelbüschel: Mittelpunkt (Einheit H) und Richtung des Zweigs, an dem es sitzt. */
  tips: Array<{ p: V3; d: V3 }>;
  /** Höhe über dem Fuß, bis zu der die Eiche reicht (Einheit H). */
  top: number;
  /** Horizontale Ausladung (Radius, Einheit H). */
  spread: number;
}

/**
 * Knorrige Earle-Eiche (Bild 04, Ebene_11, Bild 01): massiger, gedrehter Stamm mit Wülsten und Wurzelanläufen, die in
 * den Boden (bzw. die Schneewehe) laufen; fünf mächtige Äste steigen, schwingen bogig nach außen und senken sich wie
 * eine Fontäne; an ihnen Nebenäste, die nach außen und unten hängen, und ein Spitzenvorhang aus haarfeinen, gebogenen
 * Zweigen. Alles verjüngt sich zu feinen Spitzen. Die Nadelbüschel (Sternnadeln) sitzen an den Zweigspitzen und entlang
 * der Nebenäste (`tips`, gezeichnet als Punkt-Nadeln). Einheit: Stammhöhe bis zur Verzweigung = 1.
 */
export function createOakTrunk(seed = 3): OakGeometry {
  const rand = mulberry32(hash32('trunk-oak-v2', seed));
  const b = new TreeMeshBuilder();
  const tips: Array<{ p: V3; d: V3 }> = [];
  // Stamm: Achse wandert (gedreht, leicht geneigt), Querschnitt mit drei gedrehten Wülsten und fünf Wurzelanläufen
  const r0 = 0.27;
  const n = 14;
  const trunk: TubePoint[] = [];
  const twist = rand() * Math.PI * 2;
  const leanAz = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const t = Math.pow(i / (n - 1), 1.6);
    const y = -0.28 + 1.36 * t;
    const above = Math.max(0, y);
    const off = 0.08 * above + 0.05 * Math.sin(above * 4.2 + twist);
    const knot = Math.exp(-(((above - 0.42) / 0.07) ** 2)) + 0.8 * Math.exp(-(((above - 0.78) / 0.06) ** 2));
    // Oben schließt sich der Stamm (die Äste wachsen aus ihm heraus, kein offenes Rohrende)
    const close = y > 0.98 ? Math.max(0.15, 1 - (y - 0.98) / 0.12) : 1;
    trunk.push({
      p: [Math.cos(leanAz) * off, y, Math.sin(leanAz) * off],
      r: r0 * (1 - 0.3 * above) * flare(y, 0.55, 0.1) * (1 + 0.1 * knot) * close,
    });
  }
  const ys = trunk.map((q) => q.p[1]);
  const rootPhase = rand() * Math.PI * 2;
  const lobe = (a: number, ring: number): number => {
    const y = ys[ring] ?? 0;
    const flute = 0.12 * Math.sin(3 * a + twist + Math.max(0, y) * 2.6);
    const roots = 0.45 * Math.max(0, Math.cos(5 * a + rootPhase)) ** 2 * Math.exp(-Math.max(0, y + 0.1) / 0.16);
    return 1 + flute + roots;
  };
  const vTop = b.tube(trunk, 14, 0, 0, lobe);
  const F = trunk[n - 3]!.p;
  const rF = trunk[n - 3]!.r;
  let spread = 0;
  let top = 1;
  const note = (p: V3) => {
    spread = Math.max(spread, Math.hypot(p[0], p[2]));
    top = Math.max(top, p[1]);
  };
  /** Haarfeiner, hängender Zweig ab `s0` in Richtung `d` (Länge l): erst hinaus, dann schwer nach unten. */
  const twig = (s0: V3, d: V3, l: number, r: number) => {
    const out = norm([d[0], 0, d[2]]);
    const q1 = add(s0, add(scale(out, l * 0.35), [0, l * 0.12, 0]));
    const q2 = add(s0, add(scale(out, l * 0.55), [0, -l * 0.25, 0]));
    const q3 = add(s0, add(scale(out, l * 0.62), [(rand() - 0.5) * l * 0.2, -l * 0.8, (rand() - 0.5) * l * 0.2]));
    const path = bezier3(s0, q1, q2, q3, 7);
    b.tube(taperAlong(path, r, 0.0025), 3, 2, vTop);
    for (const p of path) note(p);
    tips.push({ p: q3, d: [0, -1, 0] });
    tips.push({ p: path[2]!, d: out });
    if (rand() < 0.6) tips.push({ p: path[4]!, d: out });
  };
  // Hauptäste: steigen, schwingen hinaus, senken sich (Fontäne); einer steigt steil (Silhouette wie Bild 04)
  const limbs = 7;
  const az0 = rand() * Math.PI * 2;
  for (let k = 0; k < limbs; k++) {
    const az = az0 + (k / limbs) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const steep = k === 0 || k === 4;
    // Zwei Äste schwingen tief hinab bis fast zum Boden (Bild 04 links: die Fontäne fällt)
    const droop = k === 2 || k === 5;
    const L = steep ? 1.45 : droop ? 1.7 + rand() * 0.4 : 1.45 + rand() * 0.6;
    // Fontäne (Bild 04): steil hinauf, oben hinaus, am Ende hinab
    const up = steep ? 1.2 : droop ? 0.7 : 0.8 + rand() * 0.35;
    const startY = F[1] - (steep ? 0.02 : 0.05 + rand() * 0.22);
    const p0: V3 = [F[0] * 0.85, startY, F[2] * 0.85];
    const p1 = add(p0, scale(dirFrom(az, up), L * 0.55));
    const p2 = add(p0, add(scale(dirFrom(az, 0), L * 0.75), [0, steep ? L * 0.85 : droop ? L * 0.35 : L * 0.6, 0]));
    const p3 = add(p0, add(scale(dirFrom(az + (rand() - 0.5) * 0.3, 0), L * (steep ? 0.75 : 1.0)), [0, steep ? L * 0.7 : droop ? -L * 0.42 : L * 0.12, 0]));
    const path = bezier3(p0, p1, p2, p3, 10);
    const limb = taperAlong(path, rF * (steep ? 0.62 : 0.55), 0.006, 0.08);
    b.tube(limb, 7, 1, vTop, (a) => 1 + 0.08 * Math.sin(2 * a + k));
    for (const p of path) note(p);
    // Nebenäste entlang des Asts: hinaus und nach unten hängend, mit Zweigvorhang
    for (let j = 3; j < path.length - 1; j++) {
      if (rand() < 0.2) continue;
      const at = path[j]!;
      const rAt = limb[j]!.r;
      const side = rand() < 0.5 ? 1 : -1;
      const sAz = az + side * (0.35 + rand() * 0.7);
      const sl = 0.35 + rand() * 0.45;
      const sd = dirFrom(sAz, 0.25 + rand() * 0.4);
      const q1 = add(at, scale(sd, sl * 0.55));
      const q2 = add(add(at, scale(dirFrom(sAz, 0), sl)), [0, -sl * 0.2, 0]);
      const branch = bezier(at, q1, q2, 5);
      b.tube(taperAlong(branch, rAt * 0.5, 0.004), 4, 2, vTop);
      for (const p of branch) note(p);
      const drops = 3 + Math.floor(rand() * 3);
      for (let m = 0; m < drops; m++) {
        const t = 0.25 + (m / drops) * 0.7;
        const i = Math.min(branch.length - 1, Math.round(t * (branch.length - 1)));
        twig(branch[i]!, dirFrom(sAz + (rand() - 0.5) * 0.8, 0), 0.22 + rand() * 0.3, 0.0065);
      }
    }
    // Spitze des Asts: ein Büschel Zweige
    const end = path[path.length - 1]!;
    for (let m = 0; m < 3; m++) twig(end, dirFrom(az + (m - 1) * 0.5, 0), 0.22 + rand() * 0.2, 0.007);
  }
  return { geometry: b.toGeometry(), tips, top, spread };
}
