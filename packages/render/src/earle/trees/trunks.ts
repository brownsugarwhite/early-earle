import type { BufferGeometry } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { TreeMeshBuilder, add, bezier, bezier3, cross, dirFrom, len, norm, scale, sub, type TubePoint, type V3 } from './mesh';

/**
 * Stamm-Archetypen der Bäume v4 (Fuß im Ursprung, +Y oben). Keine geraden Stäbe: jeder Ast ist eine geschwungene,
 * sich verjüngende Kurve (kubisch, mit leichtem S und aufwärts gebogener Spitze), gabelt sich und endet haarfein —
 * wie Earles Astzeichnungen (Ebene 15/16/23, Bild 02/04). Wurzelanläufe sinken in den Boden (nichts schwebt).
 * - `fork`: Gabel-Archetyp (Einheit H): Schaft bis `FORK_Y`, drei steile Äste mit je zwei Nebenästen (Vase). Für die
 *   Hainbäume verschwinden die Äste in der Kuppel; für die schlanken Kathedralen-, Pappel- und Säulenbäume streckt der
 *   Vertex-Shader nur den Schaft (`FORK_Y` → Gabelhöhe) — das feine Astnetz bleibt so groß wie die Krone und steigt in
 *   die Säule hinein, statt als Stäbe darüber hinauszuragen.
 * - `fan`: Spitzenbaum-Skelett (Einheit Kronenradius r, Bild 02, Ebene 19, 16.47.13): kurzer Stamm, fünf Hauptäste
 *   steigen zum Kronenrand, von ihnen hängen Nebenäste und Zweige bis auf die untere Kugelschale des Schleiers; an jeder
 *   Zweigspitze sitzt eine Punktrosette (`tips`), entlang der Zweige Perlen (`beads`) — die Punkte hängen am Skelett.
 * - `oak`: knorrige Earle-Eiche (Bild 04), Spitzen tragen die Sternnadeln.
 */

/** Höhe der Gabel im Gabel-Archetyp (Einheit H); darunter streckt der Vertex-Shader den Schaft. */
export const FORK_Y = 0.62;
/** Oberkante des Gabel-Archetyps (Einheit H): höchste Astspitze (Achse Fuß → Spitze für die Nähe-Ausblendung). */
export const FORK_TOP = 1.3;

/** Wurzelanlauf: Radiusfaktor über dem Boden (Stammfuß breit, ab ≈ 0.25 H schlank). */
function flare(y: number, strength: number, reach: number): number {
  return 1 + strength * Math.exp(-Math.max(0, y + 0.02) / reach);
}

/** Geschwungener Stamm von y0 bis y1 (n Punkte), Radius r0 mit Wurzelanlauf, Knoten und leichter Verjüngung. */
export function stem(rand: () => number, y0: number, y1: number, n: number, r0: number, flareStrength: number, amp: number, taper = 0.35): TubePoint[] {
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

/** Punkte entlang einer Kurve mit abnehmendem Radius (Ast: dick am Ansatz, haarfein an der Spitze). */
export function taperAlong(path: V3[], r0: number, r1: number, bulge = 0): TubePoint[] {
  return path.map((p, i) => {
    const t = i / (path.length - 1);
    return { p, r: (r0 + (r1 - r0) * Math.pow(t, 0.85)) * (1 + bulge * Math.sin(t * Math.PI)) };
  });
}

/** Punkt und Tangente auf einer Punktliste bei Anteil t (0..1). */
export function along(path: V3[], t: number): { p: V3; d: V3; i: number } {
  const x = Math.min(0.999, Math.max(0, t)) * (path.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = path[i]!;
  const b = path[i + 1]!;
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], d: norm(sub(b, a)), i };
}

/** Kurze, flache Wurzelanläufe, die schräg in den Boden laufen. */
export function roots(b: TreeMeshBuilder, rand: () => number, r0: number, count: number, reach0: number, radial = 4): void {
  const rootAz = rand() * Math.PI * 2;
  for (let k = 0; k < count; k++) {
    const az = rootAz + (k / count) * Math.PI * 2 + (rand() - 0.5) * 0.7;
    const c = Math.cos(az);
    const s = Math.sin(az);
    const reach = reach0 * (1 + 0.4 * rand());
    const path: V3[] = [
      [0, 0.12, 0],
      [c * reach * 0.55, 0.0, s * reach * 0.55],
      [c * reach, -0.14, s * reach],
    ];
    b.tube(taperAlong(path, r0 * 1.25, 0.018), radial, 3, 0);
  }
}

/**
 * Gabel-Archetyp (Hainbaum, Juwel, Tanne, Kathedrale, Pappel, Säule): Schaft bis `FORK_Y`, drei steile Äste (62–74°)
 * mit leichtem S und aufwärts gebogener Spitze, je zwei Nebenäste, die zur Seite ausschwingen und wieder steigen
 * (Vase, Ebene 16/23). Alles verjüngt sich haarfein. ≈ 280 Vertices.
 */
export function createForkTrunk(seed = 11): BufferGeometry {
  const rand = mulberry32(hash32('trunk-fork-v4', seed));
  const b = new TreeMeshBuilder();
  const r0 = 0.07;
  const pts = stem(rand, -0.28, FORK_Y, 6, r0, 1.6, 0.025);
  const vTop = b.tube(pts, 5, 0);
  const top = pts[pts.length - 1]!;
  const F = top.p;
  const rF = top.r;
  const az0 = rand() * Math.PI * 2;
  for (let k = 0; k < 3; k++) {
    const az = az0 + (k / 3) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const el = 1.08 + rand() * 0.22;
    const L = (FORK_TOP - FORK_Y) * (0.82 + 0.16 * rand());
    const sway = (rand() - 0.5) * 0.5;
    const p0: V3 = [F[0], F[1] - 0.05, F[2]];
    const p1 = add(F, scale(dirFrom(az, el - 0.12), L * 0.34));
    const p2 = add(F, scale(dirFrom(az + sway * 0.6, el), L * 0.68));
    const p3 = add(F, scale(dirFrom(az + sway, Math.min(1.45, el + 0.2)), L));
    const path = bezier3(p0, p1, p2, p3, 5);
    const limb = taperAlong(path, rF * 0.72, 0.008, 0.04);
    b.tube(limb, 4, 1, vTop);
    // Nebenäste: schwingen zur Seite aus und steigen wieder (keine Gerade, eine kleine Lyra)
    for (const [t, side] of [
      [0.42 + rand() * 0.08, k % 2 === 0 ? 1 : -1],
      [0.66 + rand() * 0.08, k % 2 === 0 ? -1 : 1],
    ] as const) {
      const at = along(path, t);
      const rAt = limb[at.i]!.r;
      const sAz = az + side * (0.55 + rand() * 0.35);
      const sl = L * (0.34 + 0.12 * rand());
      const q0 = at.p;
      const q1 = add(q0, scale(dirFrom(sAz, 0.55 + rand() * 0.2), sl * 0.45));
      const q2 = add(q0, scale(dirFrom(sAz - side * 0.2, 1.15 + rand() * 0.2), sl));
      b.tube(taperAlong(bezier(q0, q1, q2, 3), rAt * 0.62, 0.005), 3, 2, vTop);
    }
  }
  roots(b, rand, r0, 3, 0.2, 3);
  return b.toGeometry();
}

// --- Spitzenbaum-Skelett ---------------------------------------------------------------------------------------

/**
 * Schleier des Spitzenbaums (Einheit Kronenradius): Mittelpunkt der Kugelschale und ihre Radien. Der Äquator liegt auf
 * der Höhe der breitesten Stelle der Kuppel (Kronenmitte 2.05 r): Kuppel oben und Schleier unten ergeben zusammen einen
 * Kreis wie in Bild 02.
 */
export const LACE_ENVELOPE = { cy: 2.0, rx: 0.93, ry: 0.98 } as const;

export interface LaceTip {
  /** Zweigspitze (Rosettenmitte) im Archetyp. */
  p: V3;
  /** Außennormale der Schale an der Spitze (Licht der Rosette). */
  n: V3;
  /** Richtung des Zweigs an der Spitze (die Rosette öffnet sich quer dazu). */
  d: V3;
}

export interface FanGeometry {
  geometry: BufferGeometry;
  /** Zweigspitzen mit Punktrosetten (hängen am Skelett, auf der unteren Schale). */
  tips: LaceTip[];
  /** Perlen entlang der hängenden Zweige (Punkte auf dem Skelett). */
  beads: LaceTip[];
  /** Mittellinien aller Äste und Zweige (Tests: jeder Punkt liegt auf dem Skelett). */
  paths: V3[][];
  /** Höchster Punkt und größte Ausladung (Archetyp-Einheiten). */
  top: number;
  spread: number;
}

/**
 * Spitzenbaum-Skelett (Einheit Kronenradius r; Fuß im Ursprung): kurzer, leicht geschwungener Stamm bis ≈ 0.62 r, fünf
 * Hauptäste steigen in weichen S-Bögen zum Rand der Kuppel (enden in ihr), von ihnen hängen Nebenäste nach außen und
 * unten bis auf die untere Schale des Schleiers (`LACE_ENVELOPE`); dort fächern kurze Zweige auf, jede Spitze trägt
 * eine Punktrosette. So hängen alle Punkte sichtbar am Astwerk (Bild 02: „die Punkte verraten das Skelett“).
 */
export function createFanTrunk(seed = 5): FanGeometry {
  const rand = mulberry32(hash32('trunk-lace-v4', seed));
  const b = new TreeMeshBuilder();
  const tips: LaceTip[] = [];
  const beads: LaceTip[] = [];
  const paths: V3[][] = [];
  const E = LACE_ENVELOPE;
  const C: V3 = [0, E.cy, 0];
  let topY = 0;
  let spread = 0;
  const note = (p: V3) => {
    topY = Math.max(topY, p[1]);
    spread = Math.max(spread, Math.hypot(p[0], p[2]));
  };
  /** Punkt der unteren Schale in Richtung (Azimut, Elevation unter dem Äquator) und ihre Normale. */
  const onShell = (az: number, el: number): { p: V3; n: V3 } => {
    const d: V3 = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
    const p: V3 = [C[0] + d[0] * E.rx, C[1] + d[1] * E.ry, C[2] + d[2] * E.rx];
    return { p, n: norm([d[0] / E.rx, d[1] / E.ry, d[2] / E.rx]) };
  };
  const r0 = 0.062;
  const yF = 0.62;
  const pts = stem(rand, -0.25, yF, 6, r0, 1.35, 0.03, 0.28);
  const vTop = b.tube(pts, 6, 0);
  const F = pts[pts.length - 1]!.p;
  const rF = pts[pts.length - 1]!.r;
  const limbs = 5;
  const az0 = rand() * Math.PI * 2;
  for (let k = 0; k < limbs; k++) {
    const az = az0 + (k / limbs) * Math.PI * 2 + (rand() - 0.5) * 0.45;
    const reach = 0.56 + 0.12 * rand();
    const twist = (rand() - 0.5) * 0.35;
    // Hauptast: aus der Gabel steil hinauf, dann nach außen zum Kuppelrand und in die Kuppel hinein
    const p0: V3 = [F[0], F[1] - 0.06, F[2]];
    const p1 = add(F, add(scale(dirFrom(az, 0), 0.16), [0, 0.3, 0]));
    const p2: V3 = [Math.cos(az + twist * 0.5) * reach * 0.72, 1.28 + 0.08 * rand(), Math.sin(az + twist * 0.5) * reach * 0.72];
    const p3: V3 = [Math.cos(az + twist) * reach, 1.8 + 0.06 * rand(), Math.sin(az + twist) * reach];
    const path = bezier3(p0, p1, p2, p3, 6);
    const limb = taperAlong(path, rF * 0.62, 0.01, 0.05);
    b.tube(limb, 4, 1, vTop);
    paths.push(path);
    for (const p of path) note(p);
    // Nebenäste: hängen nach außen und unten bis auf die Schale
    const subs = 3;
    for (let j = 0; j < subs; j++) {
      const t = 0.3 + (j / subs) * 0.55 + rand() * 0.06;
      const at = along(path, t);
      const rAt = limb[at.i]!.r;
      const side = j % 2 === 0 ? 1 : -1;
      const tAz = az + twist * t + side * (0.25 + rand() * 0.4);
      // innere Nebenäste hängen tief, äußere bleiben nahe am Rand
      const tEl = -(0.25 + (1 - t) * 1.05 + rand() * 0.2);
      const target = onShell(tAz, tEl);
      const dir = sub(target.p, at.p);
      const dl = len(dir);
      const out = norm([Math.cos(tAz), 0, Math.sin(tAz)]);
      const q0 = at.p;
      // sanft hinaus und dann hinab (kein Haken): Earles feine Linien laufen fächerförmig zur Schale
      const q1 = add(q0, add(scale(out, dl * 0.34), [0, dl * 0.04, 0]));
      const q2 = add(target.p, add(scale(out, -dl * 0.06), [0, dl * 0.2, 0]));
      const q3 = target.p;
      const sp = bezier3(q0, q1, q2, q3, 5);
      const subT = taperAlong(sp, rAt * 0.62, 0.006);
      b.tube(subT, 3, 2, vTop);
      paths.push(sp);
      for (const p of sp) note(p);
      // Perlen entlang des hängenden Teils
      for (const f of [0.4, 0.55, 0.7, 0.84, 0.94]) {
        const a = along(sp, f);
        beads.push({ p: a.p, n: norm(sub(a.p, C)), d: a.d });
      }
      // Zweige an der Spitze: fächern quer zum Nebenast über die Schale auf, jede Spitze eine Rosette
      const twigs = 3;
      const endDir = along(sp, 0.98).d;
      const across = norm(cross(endDir, target.n));
      for (let m = 0; m < twigs; m++) {
        const spreadA = (m - (twigs - 1) / 2) * 0.55 + (rand() - 0.5) * 0.25;
        const tl = 0.12 + 0.08 * rand();
        const dirT = norm(add(add(scale(endDir, 0.55), scale(across, spreadA)), [0, -0.35, 0]));
        const end = add(target.p, scale(dirT, tl));
        // Spitze zurück auf die Schale ziehen (die Rosetten bilden die Kugelform)
        const rel = sub(end, C);
        const k2 = Math.hypot(rel[0] / E.rx, rel[1] / E.ry, rel[2] / E.rx) || 1;
        const tip: V3 = [C[0] + rel[0] / k2, C[1] + rel[1] / k2, C[2] + rel[2] / k2];
        const mid = add(scale(add(target.p, tip), 0.5), scale(target.n, tl * 0.18));
        const twig = bezier(target.p, mid, tip, 3);
        b.tube(taperAlong(twig, 0.0055, 0.0028), 3, 2, vTop);
        paths.push(twig);
        note(tip);
        const n = norm([rel[0] / (E.rx * E.rx), rel[1] / (E.ry * E.ry), rel[2] / (E.rx * E.rx)]);
        tips.push({ p: tip, n, d: norm(sub(tip, mid)) });
      }
      tips.push({ p: target.p, n: target.n, d: endDir });
    }
  }
  roots(b, rand, r0, 3, 0.18, 3);
  veilShell(b);
  return { geometry: b.toGeometry(), tips, beads, paths, top: topY, spread };
}

/** Ebene des Schleier-Grunds im Rindenattribut (`bark.z`): der Shader färbt diese Vertices blass, der Schattenpass lässt sie weg. */
export const LACE_VEIL_LEVEL = 4;

/**
 * Heller Grund des Spitzenschleiers (Bild 02: helle Fläche, vor der das Skelett und die feinen Punkte stehen): eine
 * untere Halbscheibe (Einheitsradius, XY-Ebene), die der Vertex-Shader senkrecht hinter die Baummitte stellt und um die
 * Baumachse zur Kamera dreht — immer eine flache, gemalte Fläche wie bei Earle, nie eine Schale.
 */
function veilShell(b: TreeMeshBuilder): void {
  const seg = 24;
  const pos: number[] = [0, 0, 0];
  const nor: number[] = [0, 0, 1];
  const bark: number[] = [0.5, 0, LACE_VEIL_LEVEL, 0];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI + (i / seg) * Math.PI;
    pos.push(Math.cos(a), Math.sin(a), 0);
    nor.push(0, 0, 1);
    bark.push(i / seg, 1, LACE_VEIL_LEVEL, 0);
  }
  for (let i = 1; i <= seg; i++) idx.push(0, i, i + 1);
  b.append(pos, nor, bark, idx);
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
    const rootsL = 0.45 * Math.max(0, Math.cos(5 * a + rootPhase)) ** 2 * Math.exp(-Math.max(0, y + 0.1) / 0.16);
    return 1 + flute + rootsL;
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

// --- Riesenstamm ---------------------------------------------------------------------------------------------

/** Verzweigungshöhe und höchste Astspitze des Riesenstamms (Einheit H = Archetyp-Maßstab). */
export const PILLAR_Y = 0.86;
export const PILLAR_TOP = 1.14;

/**
 * Riesenstamm (Ebene 16 Kathedralenwald, Ebene 3 Juwelenwald): mächtiger, fast gerader Schaft mit leichtem S und
 * Knoten, weicher Wurzelanlauf mit fünf flachen Rippen, der unter den Boden reicht (nichts schwebt); oben teilt er sich
 * in vier steile Äste mit Nebenästen, die in der hohen Krone verschwinden. Fein rund (18 Segmente): aus der Nähe füllt
 * er ein gutes Stück des Bilds. Einheit H (Verzweigung bei `PILLAR_Y`). ≈ 550 Vertices, nur wenige Instanzen.
 */
export function createPillarTrunk(seed = 7): BufferGeometry {
  const rand = mulberry32(hash32('trunk-pillar-v1', seed));
  const b = new TreeMeshBuilder();
  const r0 = 0.05;
  const pts = stem(rand, -0.08, PILLAR_Y, 16, r0, 0.9, 0.016, 0.24);
  const ys = pts.map((q) => q.p[1]);
  const ribPhase = rand() * Math.PI * 2;
  // Wurzelanlauf: fünf flache Rippen am Fuß, die nach oben weich im Schaft verlaufen
  const lobe = (a: number, ring: number): number => 1 + 0.12 * (0.5 + 0.5 * Math.cos(5 * a + ribPhase)) * Math.exp(-Math.max(0, (ys[ring] ?? 0) + 0.04) / 0.08);
  const vTop = b.tube(pts, 18, 0, 0, lobe);
  const top = pts[pts.length - 1]!;
  const F = top.p;
  const rF = top.r;
  const az0 = rand() * Math.PI * 2;
  for (let k = 0; k < 4; k++) {
    const az = az0 + (k / 4) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    const el = 1.12 + rand() * 0.22;
    const L = ((PILLAR_TOP - PILLAR_Y) * (0.86 + 0.14 * rand())) / Math.sin(el);
    const sway = (rand() - 0.5) * 0.4;
    const p0: V3 = [F[0], F[1] - 0.04, F[2]];
    const p1 = add(F, scale(dirFrom(az, el - 0.15), L * 0.35));
    const p2 = add(F, scale(dirFrom(az + sway * 0.6, el), L * 0.7));
    const p3 = add(F, scale(dirFrom(az + sway, Math.min(1.5, el + 0.15)), L));
    const path = bezier3(p0, p1, p2, p3, 5);
    const limb = taperAlong(path, rF * 0.62, 0.006, 0.05);
    b.tube(limb, 8, 1, vTop);
    for (const t of [0.45 + rand() * 0.1, 0.7 + rand() * 0.1]) {
      const at = along(path, t);
      const rAt = limb[at.i]!.r;
      const sAz = az + (rand() < 0.5 ? 1 : -1) * (0.6 + rand() * 0.4);
      const sl = L * (0.3 + 0.12 * rand());
      const q0 = at.p;
      const q1 = add(q0, scale(dirFrom(sAz, 0.5 + rand() * 0.2), sl * 0.45));
      const q2 = add(q0, scale(dirFrom(sAz, 1.1 + rand() * 0.2), sl));
      b.tube(taperAlong(bezier(q0, q1, q2, 4), rAt * 0.55, 0.004), 4, 2, vTop);
    }
  }
  return b.toGeometry();
}
