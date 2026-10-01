import type { BufferGeometry } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { TreeMeshBuilder, add, cross, dirFrom, dot, len, norm, scale, sub, type TubePoint, type V3 } from './mesh';

/**
 * Wintereiche (Welt 05 „Wurzelwelt“, Ebene 11): Earles blauer Baum mit Wurzeln — ein mächtiger, schwarzer, gedrehter
 * Stamm, der breit in die Schneewehe läuft; darüber Hauptäste, die sich in großen Schlingen biegen (der Himmel scheint
 * durch die Augen zwischen ihnen), ein Leittrieb mit einer Kerbe oben, eine Seite mit schweren, hängenden Ästen, deren
 * Zweige wie Wurzeln herabfallen. An den Ästen sitzen Nebenäste, die sich in Fächer feiner Zweige auflösen — ein dichtes,
 * dendritisches Netz, an dessen Spitzen Sternbüschel sitzen (auf der Sonnenseite golden, im Schatten dunkel). Schnee
 * liegt in Flecken auf den Oberseiten (die Rinde macht ihn). Einheit: Stammhöhe bis zur Gabel H = 1, Fuß im Ursprung.
 */

/** Hülle der Krone (Einheit H): Mittelpunkt und Halbachsen (für Punkte, Nähe-Ausblendung und Tests). */
export const WINTER_OAK_CROWN = { cy: 1.45, rx: 1.5, ry: 0.9 } as const;
/** Tiefste Höhe, bis zu der die hängenden Zweige fallen (Einheit H). */
export const WEEP_FLOOR = 0.25;

export interface FrostTip {
  /** Mittelpunkt des Sternbüschels (Einheit H). */
  p: V3;
  /** Richtung des Zweigs an der Spitze (die Nadeln strahlen rundum, etwas in diese Richtung). */
  d: V3;
  /** Größe 0.6..1.4 (kräftige Zweige tragen größere Büschel). */
  size: number;
}

export interface WinterOakGeometry {
  geometry: BufferGeometry;
  /** Sternbüschel an den Zweigspitzen. */
  tips: FrostTip[];
  /** Mittellinien aller Äste (Tests). */
  paths: V3[][];
  /** Höchster Punkt und größte Ausladung (Einheit H). */
  top: number;
  spread: number;
}

/** Radius längs einer Kurve: `k` < 1 verjüngt früh (Zweige), `k` > 1 bleibt lange dick und läuft spät aus (Hauptäste). */
function taper(path: V3[], r0: number, r1: number, bulge = 0, k = 0.7): TubePoint[] {
  return path.map((p, i) => {
    const t = i / (path.length - 1);
    return { p, r: (r0 + (r1 - r0) * Math.pow(t, k)) * (1 + bulge * Math.sin(t * Math.PI)) };
  });
}

/** Wurzelanlauf: breiter Fuß (die Schneewehe verdeckt ihn zum Teil). */
function flare(y: number): number {
  return 1 + 1.25 * Math.exp(-Math.max(0, y + 0.04) / 0.16);
}

/** Drehe v um die (normierte) Achse k um den Winkel a (Rodrigues). */
function rotate(v: V3, k: V3, a: number): V3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const kv = cross(k, v);
  const kd = dot(k, v);
  return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)];
}

/** Eine Senkrechte zu d. */
function perp(d: V3): V3 {
  const a: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return norm(cross(d, a));
}

/** Gleichmäßiger Catmull-Rom-Zug durch die Kontrollpunkte, `per` Proben je Spanne (Enden eingeschlossen). */
function spline(ctrl: V3[], per: number): V3[] {
  const pts = [sub(scale(ctrl[0]!, 2), ctrl[1]!), ...ctrl, sub(scale(ctrl[ctrl.length - 1]!, 2), ctrl[ctrl.length - 2]!)];
  const out: V3[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1]!, pts[i]!, pts[i + 1]!, pts[i + 2]!];
    const last = i === pts.length - 3;
    for (let k = 0; k < per + (last ? 1 : 0); k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])]);
    }
  }
  return out;
}

export interface WinterOakOptions {
  /** Hoch: volle Zweigfächer; Mobil: etwa die Hälfte der feinen Zweige (gleiche Silhouette). */
  detail?: 'hoch' | 'mobil';
}

/**
 * Baut die Wintereiche: S-förmiger Stamm mit Wülsten, Knoten und Wurzelrippen, der im Kopf endet; dort spreizen sich drei
 * mächtige Hauptäste (eine Schlinge zurück nach innen, ein C-Bogen, ein steiler Ast mit der Kerbe oben), tiefer wachsen
 * ein schwerer hängender, ein zweiter hängender und ein kurzer knorriger Ast. Die Hauptäste laufen gleichmäßig aus und
 * tragen Knoten; an ihnen Nebenäste im Wechsel zu beiden Seiten, Seitenzweige den ganzen Ast entlang und an den Enden
 * Fächer, die sich dendritisch in haarfeine Zweige auflösen (als Bänder, siehe `ribbon`). Auf der hängenden Seite fallen
 * Vorhangzweige im Bogen und teilen sich in Stränge (die „Wurzeln“ des blauen Baums). Hoch ≈ 31 000, Mobil ≈ 11 000
 * Vertices — es gibt nur wenige Wintereichen (Fokus-Baum, seltene Solitäre).
 */
export function createWinterOakTrunk(seed = 5, options: WinterOakOptions = {}): WinterOakGeometry {
  const hi = (options.detail ?? 'hoch') === 'hoch';
  const rand = mulberry32(hash32('trunk-winter-oak-v2', seed));
  const b = new TreeMeshBuilder();
  const tips: FrostTip[] = [];
  const paths: V3[][] = [];
  let top = 0;
  let spread = 0;
  const note = (p: V3) => {
    top = Math.max(top, p[1]);
    spread = Math.max(spread, Math.hypot(p[0], p[2]));
  };
  const tube = (pts: V3[], r0: number, r1: number, radial: number, level: number, v0: number, bulge = 0): number => {
    const v = b.tube(taper(pts, r0, r1, bulge), radial, level, v0);
    paths.push(pts);
    for (const q of pts) note(q);
    return v;
  };
  /**
   * Haarfeiner Zweig als Band (zwei Vertices je Punkt statt eines Röhrenrings): beide liegen auf der Mittellinie, die
   * Normale trägt die Tangente, `bark.x` die Seite (−1 / 2, außerhalb des Rindenbereichs 0..1). Der Vertex-Shader dreht
   * das Band zur Kamera (im Schattenpass zur Sonne) und hält es mindestens eine Haarlinie breit — halb so viele Vertices,
   * und jeder feine Zweig zeigt immer seine volle Breite.
   */
  const ribbon = (pts: V3[], r0: number, r1: number, v0: number): number => {
    const tp = taper(pts, r0, r1);
    const pos: number[] = [];
    const nor: number[] = [];
    const bark: number[] = [];
    const idx: number[] = [];
    let sArc = v0;
    for (let i = 0; i < tp.length; i++) {
      const a = tp[Math.max(0, i - 1)]!.p;
      const c = tp[Math.min(tp.length - 1, i + 1)]!.p;
      const T = norm(sub(c, a));
      if (i > 0) sArc += len(sub(tp[i]!.p, tp[i - 1]!.p));
      for (const side of [-1, 2]) {
        pos.push(tp[i]!.p[0], tp[i]!.p[1], tp[i]!.p[2]);
        nor.push(T[0], T[1], T[2]);
        bark.push(side, sArc, 2, tp[i]!.r);
      }
    }
    // Umlaufsinn: die Seite liegt quer zur Blickrichtung (seite = Tangente × zur Kamera) → so zeigt das Band immer
    // seine Vorderseite zur Kamera (im Schattenpass zur Sonne)
    for (let i = 0; i + 1 < tp.length; i++) {
      const q = i * 2;
      idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
    }
    b.append(pos, nor, bark, idx);
    paths.push(pts);
    for (const q of pts) note(q);
    return sArc;
  };

  // --- Stamm: gedreht, S-förmig geneigt, Wülste und Wurzelrippen; oben schließt er sich ----------------------------
  const r0 = 0.28;
  const n = 16;
  const trunk: TubePoint[] = [];
  const twist = rand() * Math.PI * 2;
  const leanAz = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const t = Math.pow(i / (n - 1), 1.35);
    const y = -0.35 + 1.28 * t;
    const above = Math.max(0, y);
    // S-Kurve: am Fuß zur einen, in der Mitte zur anderen Seite (Ebene 11: der Stamm windet sich hinauf)
    // Ebene 11 (Florians „wunderschöne Form“): ein S — der Fuß kippt zur einen Seite, der Kopf schwingt zur anderen
    const off = 0.13 * Math.sin(Math.min(1.1, above) * Math.PI * 1.55) + 0.04 * above;
    // seitlich ein zweiter Schwung (der Stamm windet sich in 3D: aus jeder Richtung eine Biegung, nie ein gerader Pfahl)
    const offB = 0.08 * Math.sin(above * 3.4 + 0.6);
    const knot = Math.exp(-(((above - 0.45) / 0.08) ** 2)) + 0.7 * Math.exp(-(((above - 0.8) / 0.07) ** 2));
    const close = y > 0.74 ? Math.max(0.3, 1 - ((y - 0.74) / 0.2) ** 1.5) : 1;
    // Taille in der Mitte, zur Gabel hin wieder breit: die Hauptäste wachsen aus einem mächtigen Kopf (Ebene 11)
    const waist = 1 - 0.18 * Math.sin(Math.PI * Math.min(1, above / 1.05));
    trunk.push({ p: [Math.cos(leanAz) * off - Math.sin(leanAz) * offB, y, Math.sin(leanAz) * off + Math.cos(leanAz) * offB], r: r0 * waist * flare(y) * (1 + 0.1 * knot) * close });
  }
  const ys = trunk.map((q) => q.p[1]);
  const rootPhase = rand() * Math.PI * 2;
  const lobe = (a: number, ring: number): number => {
    const y = ys[ring] ?? 0;
    const flute = 0.13 * Math.sin(3 * a + twist + Math.max(0, y) * 2.4) + 0.05 * Math.sin(7 * a - twist * 2 + y * 5);
    const roots = 0.55 * Math.max(0, Math.cos(5 * a + rootPhase)) ** 2 * Math.exp(-Math.max(0, y + 0.08) / 0.2);
    return 1 + flute + roots;
  };
  const vTop = b.tube(trunk, hi ? 16 : 12, 0, 0, lobe);
  for (const q of trunk) note(q.p);
  const trunkAt = (y: number): { p: V3; r: number } => {
    for (let i = 1; i < n; i++) {
      if (trunk[i]!.p[1] >= y) {
        const a = trunk[i - 1]!;
        const c = trunk[i]!;
        const f = (y - a.p[1]) / Math.max(1e-6, c.p[1] - a.p[1]);
        return { p: [a.p[0] + (c.p[0] - a.p[0]) * f, y, a.p[2] + (c.p[2] - a.p[2]) * f], r: a.r + (c.r - a.r) * f };
      }
    }
    return trunk[n - 1]!;
  };

  /** Fächer feiner Zweige am Ende eines Asts: `count` Zweige, die sich um die Astrichtung spreizen, jede Spitze ein Büschel. */
  const fan = (p0: V3, dir: V3, L: number, count: number, r: number, weep: number, v0: number) => {
    const ax = perp(dir);
    const roll = rand() * Math.PI * 2;
    for (let m = 0; m < count; m++) {
      const spreadA = (m / Math.max(1, count - 1) - 0.5) * 1.9 + (rand() - 0.5) * 0.3;
      let d = rotate(rotate(dir, ax, spreadA), dir, roll + m * 0.9);
      d = norm(add(d, [0, -weep * 0.5, 0]));
      const l = L * (0.65 + 0.5 * rand());
      const mid = add(add(p0, scale(d, l * 0.5)), scale(rotate(ax, dir, rand() * 6.28), l * 0.08));
      const end = add(add(p0, scale(d, l)), [0, -weep * l * 0.25, 0]);
      // die hängenden Zweige fallen tief, aber nie in den Schnee
      if (end[1] < WEEP_FLOOR) end[1] = WEEP_FLOOR + 0.04 * rand();
      const pts = spline([p0, mid, end], 2);
      ribbon(pts, r, r * 0.45, v0);
      const ed = norm(sub(end, pts[pts.length - 2]!));
      // Delta an der Spitze (Ebene 11: jeder Zweig löst sich in zwei, drei haarfeine Enden auf, jedes mit Sternbüschel)
      const forks = hi ? 2 : rand() < 0.5 ? 2 : 0;
      if (forks === 0) tips.push({ p: end, d: ed, size: 0.8 + 0.35 * rand() });
      for (let k = 0; k < forks; k++) {
        const d2 = rotate(rotate(ed, perp(ed), (k === 0 ? -1 : 1) * (0.35 + 0.35 * rand())), ed, rand() * 1.5);
        const l2 = l * (0.38 + 0.2 * rand());
        const e2 = add(end, scale(norm(add(d2, [0, -weep * 0.4, 0])), l2));
        if (e2[1] < WEEP_FLOOR) e2[1] = WEEP_FLOOR + 0.03 * rand();
        ribbon([end, add(scale(add(end, e2), 0.5), scale(perp(d2), l2 * 0.06)), e2], r * 0.45, r * 0.25, v0);
        tips.push({ p: e2, d: norm(sub(e2, end)), size: 0.7 + 0.35 * rand() });
      }
    }
  };

  /**
   * Nebenast ab `p0` (Richtung `dir`, Länge L): weich gekrümmt (nach außen, zur Schwere oder zum Licht), zwei bis drei
   * Unteräste unterwegs, am Ende ein Zweigfächer. `weep` 0..1: hängende Seite (fällt, lange Vorhangzweige).
   */
  const branch = (p0: V3, dir: V3, L: number, r: number, weep: number, v0: number, depth: number) => {
    const ax = perp(dir);
    const bend = rotate(ax, dir, rand() * 6.28);
    const d0 = norm(dir);
    // Kontrollpunkte: hinaus, dann je nach Schwere hinab oder sanft hinauf, mit eigenem Schwung
    const c1 = add(p0, add(scale(d0, L * 0.35), scale(bend, L * 0.06)));
    const c2 = add(p0, add(add(scale(d0, L * 0.7), scale(bend, -L * 0.05)), [0, L * (0.08 - weep * 0.35), 0]));
    const c3 = add(p0, add(scale(d0, L), [0, L * (0.05 - weep * 0.75), 0]));
    const pts = spline([p0, c1, c2, c3], depth === 0 ? 3 : 2);
    const v = tube(pts, r, r * 0.4, depth === 0 ? 5 : 4, 2, v0);
    const end = pts[pts.length - 1]!;
    const ed = norm(sub(end, pts[pts.length - 2]!));
    // Seitenzweige den ganzen Ast entlang (Ebene 11: jedes Stück Ast trägt feine Zweige — das dichte Netz der Krone)
    const every = (hi ? 0.075 : 0.13) * (1 + weep * 0.8);
    let acc = every * (0.3 + 0.7 * rand());
    let side = rand() < 0.5 ? 1 : -1;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const c = pts[i]!;
      const seg = len(sub(c, a));
      acc += seg;
      if (acc < every || i < pts.length * 0.2) continue;
      acc = 0;
      side = -side;
      const d = norm(sub(c, a));
      const sd = rotate(rotate(perp(d), d, side * (0.8 + 0.6 * rand())), perp(d), 0.2);
      const tw = norm(add(add(scale(d, 0.55), scale(sd, 0.8)), [0, 0.18 - weep * 0.6, 0]));
      const l = (0.06 + 0.07 * rand()) * (depth === 0 ? 1.2 : 1);
      const e = add(c, scale(tw, l));
      if (e[1] < WEEP_FLOOR) e[1] = WEEP_FLOOR + 0.03 * rand();
      ribbon([c, add(add(c, scale(tw, l * 0.5)), scale(perp(tw), l * 0.06 * side)), e], r * 0.42, r * 0.22, v);
      if (rand() < 0.28) tips.push({ p: e, d: tw, size: 0.55 + 0.3 * rand() });
    }
    // Unteräste unterwegs, abwechselnd zu den Seiten
    const subs = depth === 0 ? (hi ? 2 : 1) : hi && rand() < 0.5 ? 1 : 0;
    for (let j = 0; j < subs; j++) {
      const t = 0.3 + (j / Math.max(1, subs)) * 0.55 + rand() * 0.08;
      const i = Math.min(pts.length - 2, Math.max(1, Math.floor(t * (pts.length - 1))));
      const at = pts[i]!;
      const d = norm(sub(pts[i + 1]!, at));
      const side = rotate(perp(d), d, rand() * 6.28);
      const sd = norm(add(add(scale(d, 0.5), scale(side, 0.85)), [0, 0.1 - weep * 0.5, 0]));
      if (depth === 0) branch(at, sd, L * (0.42 + 0.12 * rand()), r * 0.55, weep, v, 1);
      else fan(at, sd, L * 0.35, 2, r * 0.5, weep, v);
    }
    // Ende: Zweigfächer (auf der hängenden Seite fallen dazu lange Vorhangzweige)
    fan(end, ed, L * (depth === 0 ? 0.42 : 0.5), depth === 0 ? (hi ? 4 : 3) : hi ? 3 : 2, r * 0.45, weep, v);
    if (weep > 0.6 && depth === 0) {
      // Vorhangzweige (Ebene 11: die „Wurzeln“ des blauen Baums): fallen in einem Bogen hinaus und hinab und teilen sich
      // auf halber Höhe dendritisch in zwei, drei Stränge, die auseinanderlaufen — ein lichtes Geäst, kein Besen
      for (let m = 0; m < (hi ? 2 : 1); m++) {
        const at = pts[Math.min(pts.length - 1, 2 + m * 4)]!;
        const fall = Math.max(0.2, at[1] - WEEP_FLOOR - 0.05) * (0.62 + 0.3 * rand());
        const out = norm([at[0] + ed[0] * 0.5, 0, at[2] + ed[2] * 0.5]);
        const sway = rotate(out, [0, 1, 0], (rand() - 0.5) * 1.2);
        const split = add(at, add(scale(sway, fall * 0.22), [0, -fall * 0.5, 0]));
        const curtain = spline([at, add(at, add(scale(sway, fall * 0.16), [0, -fall * 0.18, 0])), split], 3);
        const vc = ribbon(curtain, r * 0.45, r * 0.26, v);
        const strands = hi ? 3 : 2;
        for (let k = 0; k < strands; k++) {
          const side = rotate(sway, [0, 1, 0], (k / Math.max(1, strands - 1) - 0.5) * 1.1 + (rand() - 0.5) * 0.3);
          const l = fall * (0.4 + 0.18 * rand());
          const e = add(split, add(scale(side, l * 0.32), [0, -l, 0]));
          if (e[1] < WEEP_FLOOR) e[1] = WEEP_FLOOR + 0.03 * rand();
          const strand = spline([split, add(split, add(scale(side, l * 0.22), [0, -l * 0.4, 0])), e], 3);
          const vs = ribbon(strand, r * 0.26, r * 0.14, vc);
          fan(e, norm(add(side, [0, -2, 0])), l * 0.32, 2, r * 0.14, 1, vs);
        }
      }
    }
  };

  // --- Hauptäste als Gesten (Ebene 11): Kontrollpunkte (radial, Höhe, seitlich) relativ zum Ansatz ------------------
  interface Gesture {
    y: number;
    az: number;
    /** Kontrollpunkte relativ zum Ansatz am Stamm. */
    c: Array<[number, number, number]>;
    weep: number;
    /** Nebenäste längs des Hauptasts. */
    subs: number;
    /** Stärke relativ zum Stamm an der Ansatzhöhe. */
    thick: number;
  }
  const az0 = rand() * Math.PI * 2;
  const J = () => (rand() - 0.5) * 0.3;
  // Der Stamm endet im Kopf; dort spreizen sich drei mächtige Hauptäste weit auseinander, jeder setzt einen Teil der
  // Stammmasse fort (Ebene 11: kein durchgehender Stamm bis zum Gipfel). Tiefer wachsen drei weitere Äste aus dem Stamm.
  const gestures: Gesture[] = [
    // Großer Ast schräg hinauf, oben eine Schlinge zurück nach innen (das große Himmelsauge)
    { y: 0.84, az: az0, c: [[0.22, 0.2, 0.06], [0.5, 0.5, 0.16], [0.8, 0.82, 0.18], [0.76, 1.1, 0.06], [0.48, 1.22, -0.1], [0.24, 1.12, -0.2]], weep: 0.05, subs: 7, thick: 0.62 },
    // Ast zur Gegenseite: hinaus, hinauf und oben wieder hinaus (C-Bogen, zweites Auge)
    { y: 0.88, az: az0 + 2.5 + J(), c: [[0.26, 0.16, -0.05], [0.62, 0.36, -0.14], [0.98, 0.6, -0.12], [1.16, 0.9, 0.02], [0.98, 1.06, 0.14]], weep: 0.2, subs: 7, thick: 0.6 },
    // Dritter Ast steil hinauf, oben die Kerbe (zwei Äste im V)
    { y: 0.9, az: az0 + 4.3 + J(), c: [[0.2, 0.22, 0.1], [0.4, 0.5, 0.26], [0.66, 0.74, 0.32], [0.92, 0.86, 0.16], [1.06, 0.76, -0.06]], weep: 0.1, subs: 6, thick: 0.55 },
    // Tiefer: schwerer Ast, der hinaus und hinab hängt — seine Zweige fallen wie Wurzeln
    { y: 0.6, az: az0 + 3.55 + J(), c: [[0.4, 0.12, 0], [0.82, 0.16, 0.08], [1.18, 0.0, 0.05], [1.38, -0.28, -0.05]], weep: 1, subs: 5, thick: 0.6 },
    // Tiefer: ausladender Ast, der sich hebt und einrollt
    // Tiefer: zweiter hängender Ast neben dem schweren — zusammen ein Vorhang aus Wurzelzweigen (Ebene 11 links)
    { y: 0.7, az: az0 + 2.85 + J(), c: [[0.38, 0.1, 0.05], [0.78, 0.2, 0.12], [1.12, 0.12, 0.06], [1.3, -0.12, -0.04]], weep: 0.6, subs: 5, thick: 0.5 },
    // Tiefer: kurzer, knorriger Ast
    { y: 0.64, az: az0 + 5.4 + J(), c: [[0.34, 0.1, 0], [0.68, 0.34, 0.05], [0.94, 0.5, 0], [1.16, 0.42, -0.06]], weep: 0.55, subs: 5, thick: 0.45 },
  ];
  for (const g of gestures) {
    const base = trunkAt(g.y);
    const out = dirFrom(g.az, 0);
    const side = norm(cross([0, 1, 0], out));
    const P = (c: [number, number, number]): V3 => add(base.p, add(add(scale(out, c[0]), scale(side, c[2])), [0, c[1], 0]));
    const p0: V3 = add(base.p, scale(out, base.r * 0.25));
    const path = spline([p0, ...g.c.map(P)], hi ? 4 : 3);
    // Knorrig: der Querschnitt wellt sich längs des Asts
    // Hauptäste: mächtig am Ansatz, gleichmäßig auslaufend, mit Knoten und Wülsten (Ebene 11: nie ein glattes Rohr)
    const knots = [0.25 + 0.1 * rand(), 0.5 + 0.12 * rand(), 0.75 + 0.1 * rand()];
    const limbPts = taper(path, base.r * g.thick, 0.02, 0.04, 1.05).map((q, i, all) => {
      const t = i / (all.length - 1);
      let bump = 0;
      for (const k of knots) bump += Math.exp(-(((t - k) / 0.045) ** 2));
      return { p: q.p, r: q.r * (1 + 0.22 * bump) };
    });
    const v = b.tube(limbPts, hi ? 9 : 7, 1, vTop * 0.5, (a, i) => 1 + 0.12 * Math.sin(2 * a + i * 0.9 + g.az) + 0.06 * Math.sin(5 * a - i * 1.7));
    paths.push(path);
    for (const q of path) note(q);
    // Nebenäste im Wechsel zu beiden Seiten, nach außen (auf der hängenden Seite hinab)
    const subs = g.subs + (hi ? 2 : 0);
    for (let j = 0; j < subs; j++) {
      const t = 0.18 + (j / subs) * 0.78 + rand() * 0.04;
      const i = Math.min(path.length - 2, Math.max(1, Math.floor(t * (path.length - 1))));
      const at = path[i]!;
      const d = norm(sub(path[i + 1]!, at));
      const s = j % 2 === 0 ? 1 : -1;
      const sideD = rotate(perp(d), d, s * (0.9 + rand() * 0.8));
      const outward = norm([at[0], 0, at[2]]);
      const dir = norm(add(add(add(scale(d, 0.45), scale(sideD, 0.75)), scale(outward, 0.35)), [0, 0.28 - g.weep * 0.55, 0]));
      // Klare Rangfolge (Ebene 11): mächtige Hauptäste, deutlich dünnere Äste, haarfeine Zweige
      const rAt = 0.012 + 0.026 * (1 - t);
      branch(at, dir, 0.42 + 0.3 * rand() * (1 - t * 0.4), rAt, g.weep, v, 0);
    }
    // Spitze: der Hauptast gabelt sich (beim steilen Ast oben die Kerbe, Ebene 11)
    const end = path[path.length - 1]!;
    const endDir = norm(sub(end, path[path.length - 2]!));
    const fork = rotate(perp(endDir), endDir, rand() * 6.28);
    branch(end, rotate(endDir, fork, 0.42), 0.44, 0.016, g.weep, v, 0);
    branch(end, rotate(endDir, fork, -0.5), 0.38, 0.014, g.weep, v, 0);
  }
  // Wurzeln: dicke Anläufe, die weit hinaus unter den Schnee laufen (Ebene 11: der Stamm wächst aus der Wehe)
  const rootAz = rand() * Math.PI * 2;
  for (let k = 0; k < 6; k++) {
    const az = rootAz + (k / 6) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const reach = 0.55 * (0.8 + 0.5 * rand());
    const o = dirFrom(az, 0);
    const path = spline([[0, 0.18, 0], add(scale(o, reach * 0.35), [0, 0.02, 0]), add(scale(o, reach * 0.7), [0, -0.06, 0]), add(scale(o, reach), [0, -0.2, 0])], 2);
    b.tube(taper(path, r0 * 0.75, 0.02), 6, 3, 0);
  }
  return { geometry: b.toGeometry(), tips, paths, top, spread };
}

/** Ablage eines Nadelpunkts: Mittelpunkt, Richtung (Nadel), halbe Länge (Archetyp-Einheiten). */
export type FrostDotSink = (p: V3, d: V3, halfLength: number) => void;

/**
 * Sternbüschel der Wintereiche: an jeder `stride`-ten Spitze strahlen `needles` feine Nadeln rundum (Fibonacci-Richtungen,
 * je Büschel gedreht), leicht in Zweigrichtung gezogen. Die Farbe (golden im Licht, dunkel im Schatten) macht der
 * Punkt-Shader (Art `frost`).
 */
export function frostDots(g: WinterOakGeometry, stride: number, needles: number, rand: () => number, sink: FrostDotSink): void {
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < g.tips.length; i += stride) {
    const t = g.tips[i]!;
    const len0 = (0.08 + 0.05 * rand()) * t.size;
    const phase = rand() * Math.PI * 2;
    for (let k = 0; k < needles; k++) {
      const yy = 1 - (2 * (k + 0.5)) / needles;
      const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
      const ph = k * golden + phase;
      const d = norm(add([rr * Math.cos(ph), yy, rr * Math.sin(ph)], scale(t.d, 0.3)));
      const l = len0 * (0.7 + 0.6 * rand());
      sink(add(t.p, scale(d, l * 0.5)), d, l * 0.5);
    }
  }
}

/** Anzahl der Nadelpunkte bei `stride` und `needles`. */
export function frostDotCount(g: WinterOakGeometry, stride: number, needles: number): number {
  return Math.ceil(g.tips.length / stride) * needles;
}

/** Abstand eines Punkts zur nächsten Mittellinie (Tests: alles hängt am Skelett). */
export function distanceToPaths(paths: V3[][], q: V3): number {
  let best = Infinity;
  for (const path of paths) {
    for (let i = 0; i + 1 < path.length; i++) {
      const a = path[i]!;
      const c = path[i + 1]!;
      const ab = sub(c, a);
      const aq = sub(q, a);
      const t = Math.max(0, Math.min(1, dot(aq, ab) / Math.max(1e-9, dot(ab, ab))));
      best = Math.min(best, len(sub(aq, scale(ab, t))));
    }
  }
  return best;
}
