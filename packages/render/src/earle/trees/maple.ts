import type { BufferGeometry } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { TreeMeshBuilder, add, bezier3, cross, dirFrom, dot, len, norm, scale, sub, type TubePoint, type V3 } from './mesh';

/**
 * Schnee-Ahorn (Welt 08, Bild 01 „Rote Scheune“, Ebene 6): der alte Riese vor der roten Scheune. Ein mächtiger,
 * säulenhafter Stamm mit weitem Wurzelanlauf (er steckt in der Schneewehe), der bis weit hinauf dick bleibt; aus seinen
 * Seiten wachsen in verschiedenen Höhen die Äste wie Arme aus einem Rumpf — flach ausladende, die im Ellbogen steigen,
 * lange Diagonalen und oben zwei, drei steile, in die sich der Stamm teilt. Die Äste sind viel dünner als der Stamm,
 * bleiben aber lange kräftig, gabeln sich noch einmal und enden in Fächern feiner, zum Licht gebogener Zweige (Earles
 * Linienbäume, Ebene 15). Rundum verteilt: aus jeder Richtung ein Stamm mit ausgebreiteten Armen.
 *
 * Einheit H = Höhe, in der die ersten Äste ansetzen. Rinde wie bei allen organischen Stämmen (`bark` = u rundum,
 * v längs, Ebene, Radius): Stamm Ebene 0, Äste und Nebenäste Ebene 1 (tragen im Winter durchgehend Schnee auf der
 * Oberseite), feine Zweige Ebene 2. Die Rinden-v läuft vom Stamm in die Äste weiter (die Linien fließen über die Gabel).
 * Offene Rohrenden gibt es nicht: jedes Stück schließt sich in seinem Fortsatz bzw. läuft haarfein aus.
 */

export interface MapleGeometry {
  geometry: BufferGeometry;
  /** Höchster Punkt über dem Fuß (Einheit H). */
  top: number;
  /** Waagrechte Ausladung (Radius, Einheit H). */
  spread: number;
  /** Mittellinien aller Äste und Zweige (Tests: jeder Ast hängt am Baum). */
  paths: V3[][];
}

/** Höhe, in der die ersten Äste aus dem Stamm wachsen (Einheit H). */
export const MAPLE_FORK_Y = 1;

/**
 * Wetterseite des Schnee-Ahorns als Rinden-u des Stamms (u rundum; der Stamm-Rahmen zeigt bei u in die Richtung
 * (−sin 2πu, 0, −cos 2πu)): dort klebt der Schnee am Stamm, dorthin läuft der Schneehügel aus. Fest im Archetyp — die
 * Drehung der Instanz dreht beides zusammen (Weltkomposition: `yawDeg` der Begleiter).
 */
export const MAPLE_WEATHER_U = 0.113;
/** Azimut (atan2(z, x), Archetyp) der Wetterseite. */
const WEATHER_AZ = Math.atan2(-Math.cos(2 * Math.PI * MAPLE_WEATHER_U), -Math.sin(2 * Math.PI * MAPLE_WEATHER_U));
/**
 * Offene Seite (75° neben der Wetterseite): dort wachsen keine tiefen Äste — von hier sieht man den Stamm frei, die
 * Äste breiten sich links und rechts aus, die Wetterseite mit ihrer Wehe liegt rechts im Profil (Bild 01). Die
 * Weltkomposition dreht diese Seite zur Kamera.
 */
const OPEN_AZ = WEATHER_AZ + 1.3;
/** Rinden-Ebene des Schneehügels am Stammfuß (der Shader färbt sie als Schnee, der Schattenpass lässt sie weg). */
export const MAPLE_SNOW_LEVEL = 5;

/** Stufen: 0 Ast, 1 Nebenast, 2 Zweig. */
const RADIAL = [12, 7, 4];
const SEGS = [13, 9, 6];
/** Biegung zum Licht je Stufe (dünne Zweige streben stärker nach oben). */
const BEND = [0.36, 0.42, 0.5];

/** Wurzelanlauf: Radiusfaktor über dem Boden. */
function flare(y: number, strength: number, reach: number): number {
  return 1 + strength * Math.exp(-Math.max(0, y + 0.02) / reach);
}

/** Vektor `v` um die Achse `k` (Einheitsvektor) um `a` (rad) drehen (Rodrigues). */
function rotate(v: V3, k: V3, a: number): V3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const kv = cross(k, v);
  const kd = dot(k, v) * (1 - c);
  return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd];
}

/** Eine Senkrechte zu `d` (Einheitsvektor), möglichst waagrecht. */
function perpendicular(d: V3): V3 {
  const a: V3 = Math.abs(d[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  return norm(cross(d, a));
}

export function createMapleTrunk(seed = 8): MapleGeometry {
  const rand = mulberry32(hash32('trunk-maple-v3', seed));
  const b = new TreeMeshBuilder();
  const paths: V3[][] = [];
  let top = 0;
  let spread = 0;
  const note = (p: V3) => {
    top = Math.max(top, p[1]);
    spread = Math.max(spread, Math.hypot(p[0], p[2]));
  };
  const UP: V3 = [0, 1, 0];

  // --- Stamm: eine mächtige Säule bis Höhe ≈ 2.2, leicht geneigt und gedreht, weiter Wurzelanlauf; oben teilt er sich
  // in die steilen Kronenäste (er schließt sich in ihnen) --------------------------------------------------------------
  const Y_TOP = 2.2;
  const twist = rand() * Math.PI * 2;
  const leanAz = rand() * Math.PI * 2;
  const axisAt = (y: number): V3 => {
    const above = Math.max(0, y);
    const off = 0.07 * above + 0.05 * Math.sin(above * 1.9 + twist);
    return [Math.cos(leanAz) * off, y, Math.sin(leanAz) * off];
  };
  // dick bis weit hinauf (Bild 01: der Stamm ist fast so breit wie hoch bis zu den ersten Ästen), darüber läuft er
  // schlank in die Kronenäste aus (oben so dick wie sie: keine Kuppe, kein Stumpf)
  const trunkR = (y: number): number => {
    const above = Math.max(0, y);
    const body = 0.56 - 0.15 * Math.min(1, above / 1.2) - 0.23 * Math.max(0, (above - 1.2) / (Y_TOP - 1.2));
    return body * flare(y, 0.85, 0.16);
  };
  const n = 22;
  const trunk: TubePoint[] = [];
  for (let i = 0; i < n; i++) {
    // Ringe am Fuß dichter: der Anlauf wölbt sich weich in den Schnee
    const t = Math.pow(i / (n - 1), 1.3);
    const y = -0.36 + (Y_TOP + 0.36) * t;
    const above = Math.max(0, y);
    const knot = Math.exp(-(((above - 0.42) / 0.08) ** 2)) + 0.7 * Math.exp(-(((above - 1.35) / 0.07) ** 2));
    // ganz oben schließt sich der Stamm in den Kronenästen (kein offenes Rohrende, die Äste decken das Ende)
    const close = y > Y_TOP - 0.16 ? Math.max(0.3, 1 - (y - (Y_TOP - 0.16)) / 0.2) : 1;
    trunk.push({ p: axisAt(y), r: trunkR(y) * (1 + 0.07 * knot) * close });
  }
  const ys = trunk.map((q) => q.p[1]);
  const rootPhase = rand() * Math.PI * 2;
  const lobe = (a: number, ring: number): number => {
    const y = ys[ring] ?? 0;
    // Wülste der Rinde (gedreht, oben kräftiger: die Äste ziehen Wülste aus dem Stamm) und sechs Wurzelanläufe
    const flute = (0.07 + 0.05 * Math.min(1, Math.max(0, y) / 1.5)) * Math.sin(3 * a + twist + Math.max(0, y) * 1.8) + 0.035 * Math.sin(7 * a + 1.3 + y * 4);
    const roots = 0.32 * Math.max(0, Math.cos(6 * a + rootPhase)) ** 2 * Math.exp(-Math.max(0, y + 0.08) / 0.17);
    return 1 + flute + roots;
  };
  const vTop = b.tube(trunk, 26, 0, 0, lobe);
  for (const q of trunk) note(q.p);
  /** Rinden-v am Stamm bei Höhe y (≈ Bogenlänge ab dem Fuß). */
  const vAt = (y: number): number => (vTop * (y + 0.36)) / (Y_TOP + 0.36);

  /**
   * Ein Stück ab `start` in Richtung `dir`: kubische Kurve, die sich zum Licht biegt (dazu ein leichtes S), Radius von
   * `r` auf `rEnd`, am Ansatz leicht verdickt. `close`: die letzten Ringe schließen sich (der Fortsatz setzt davor an
   * und deckt das Ende). Liefert Punkte, Radien und Rinden-v je Punkt.
   */
  const bough = (start: V3, dir: V3, length: number, r: number, rEnd: number, depth: number, v0: number, bend: number, close: boolean): { path: V3[]; pts: TubePoint[]; v: number[] } => {
    const side = perpendicular(dir);
    const swayAxis = rotate(side, dir, rand() * Math.PI * 2);
    // seitlicher Schwung: die Äste schlagen einen Bogen (Ellbogen), feinere Zweige zittern stärker
    const sway = (rand() - 0.5) * (depth === 0 ? 0.55 : 0.45);
    const d1 = norm(add(dir, scale(swayAxis, sway)));
    const d2 = norm(add(add(dir, scale(UP, bend)), scale(swayAxis, -sway * 0.6)));
    const d3 = norm(add(add(dir, scale(UP, bend * 2.2)), scale(swayAxis, -sway * 0.2)));
    const p1 = add(start, scale(d1, length * 0.36));
    const p2 = add(p1, scale(d2, length * 0.34));
    const p3 = add(p2, scale(d3, length * 0.3));
    const path = bezier3(start, p1, p2, p3, SEGS[depth]!);
    const m = path.length;
    const pts: TubePoint[] = path.map((p, i) => {
      const t = i / (m - 1);
      const swell = 1 + 0.22 * Math.exp(-t / 0.1);
      // lange kräftig, dann schneller dünner (Earle: die Äste verjüngen sich spät)
      const rr = (r + (rEnd - r) * Math.pow(t, 1.1)) * swell;
      return { p, r: close && i === m - 1 ? rr * 0.35 : rr };
    });
    b.tube(pts, RADIAL[depth]!, depth <= 1 ? 1 : 2, v0);
    const v: number[] = [v0];
    for (let i = 1; i < m; i++) v.push(v[i - 1]! + len(sub(path[i]!, path[i - 1]!)));
    paths.push(path);
    for (const p of path) note(p);
    return { path, pts, v };
  };

  /**
   * Richtung eines Kinds: `d` um eine Achse ⟂ d (Rollwinkel `roll`) um `angle` gedreht, dazu ein Zug nach oben. Nie
   * abwärts: kein Zweig taucht in den Schnee und sticht davor wieder heraus.
   */
  const fanOut = (d: V3, roll: number, angle: number, lift: number): V3 => {
    const r = norm(add(rotate(d, rotate(perpendicular(d), d, roll), angle), scale(UP, lift)));
    return r[1] < 0.15 ? norm(add(r, scale(UP, 0.2 - r[1]))) : r;
  };

  /** Zweigfächer am Ende eines Nebenasts: zwei bis drei feine Zweige, die sich zum Licht drehen. */
  const twigs = (at: V3, d: V3, length: number, r: number, v0: number) => {
    const count = 2 + (rand() < 0.5 ? 1 : 0);
    const roll = rand() * Math.PI * 2;
    for (let k = 0; k < count; k++) {
      const a = (k - (count - 1) / 2) * 0.6 + (rand() - 0.5) * 0.2;
      bough(at, fanOut(d, roll + (rand() - 0.5) * 0.5, a, 0.16), length * (0.8 + 0.4 * rand()), r, 0.0035, 2, v0, BEND[2]!, false);
    }
  };

  /** Nebenast: gebogen, am Ende ein Zweigfächer, in der Mitte ein Seitenzweig. */
  const branch = (at: V3, d: V3, length: number, r: number, v0: number) => {
    const rEnd = r * 0.4;
    const { path, pts, v } = bough(at, d, length, r, rEnd, 1, v0, BEND[1]!, true);
    const m = path.length;
    const endDir = norm(sub(path[m - 1]!, path[m - 3]!));
    twigs(path[m - 2]!, endDir, length * 0.85, pts[m - 2]!.r * 0.85, v[m - 2]!);
    const i = Math.round((0.45 + 0.2 * rand()) * (m - 1));
    const tan = norm(sub(path[i + 1]!, path[i - 1]!));
    bough(path[i]!, fanOut(tan, rand() * Math.PI * 2, 0.7 + 0.25 * rand(), 0.18), length * (0.5 + 0.15 * rand()), pts[i]!.r * 0.55, 0.0035, 2, v[i]!, BEND[2]!, false);
  };

  /** Ast: lang, zum Licht gebogen; gabelt sich am Ende in zwei Nebenäste, dazu einer aus der Mitte. */
  const limb = (at: V3, d: V3, length: number, r: number, v0: number, bend: number) => {
    const rEnd = r * 0.36;
    const { path, pts, v } = bough(at, d, length, r, rEnd, 0, v0, bend, true);
    const m = path.length;
    const end = path[m - 2]!;
    const endDir = norm(sub(path[m - 1]!, path[m - 3]!));
    const rJoin = pts[m - 2]!.r;
    const roll = rand() * Math.PI * 2;
    // Gabel: Leittrieb läuft weiter, der zweite zweigt ab (asymmetrisch, wie gewachsen)
    branch(end, fanOut(endDir, roll, 0.14 + 0.1 * rand(), 0.08), length * (0.62 + 0.12 * rand()), rJoin * 0.9, v[m - 2]!);
    branch(end, fanOut(endDir, roll + Math.PI, 0.5 + 0.2 * rand(), 0.14), length * (0.48 + 0.1 * rand()), rJoin * 0.72, v[m - 2]!);
    const i = Math.round((0.48 + 0.14 * rand()) * (m - 1));
    const tan = norm(sub(path[i + 1]!, path[i - 1]!));
    branch(path[i]!, fanOut(tan, roll + Math.PI * 0.5 + (rand() - 0.5), 0.6 + 0.2 * rand(), 0.2), length * (0.42 + 0.1 * rand()), pts[i]!.r * 0.62, v[i]!);
  };

  // --- Äste aus den Seiten des Stamms (Höhe, Azimut-Schritt, Elevation, Länge, Dicke relativ zum Stamm) -------------
  // Bild 01: links ein flach ausladender Arm, der im Ellbogen steigt; rechts zwei lange Diagonalen; dazwischen steilere
  const az0 = rand() * Math.PI * 2;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const sideLimbs: Array<[number, number, number, number, number]> = [
    [1.0, 0.0, 0.42, 1.85, 0.36],
    [1.18, 1.0, 0.78, 1.75, 0.34],
    [1.36, 2.0, 0.58, 1.9, 0.33],
    [1.55, 3.0, 0.92, 1.6, 0.33],
    [1.72, 4.0, 0.68, 1.7, 0.34],
    [1.9, 5.0, 1.02, 1.5, 0.36],
  ];
  for (const [y, k, el, L, rk] of sideLimbs) {
    const a = awayFromOpenSide(az0 + k * golden + (rand() - 0.5) * 0.3, el);
    const elev = openSideElevation(a, el);
    const rT = trunkR(y);
    // Ansatz im Stamm, zur Seite versetzt: der Ast wächst aus der Flanke (die Verdickung am Ansatz deckt die Naht)
    const at = add(axisAt(y), scale(dirFrom(a, 0), rT * 0.55));
    const e = elev + (rand() - 0.5) * 0.12;
    // flache Äste biegen sich stärker nach oben (Ellbogen), steile kaum
    const bend = BEND[0]! * (1.5 - Math.min(1, e / 0.9) * 0.9);
    limb(at, dirFrom(a, e), L * (0.9 + 0.2 * rand()), rT * rk * (0.92 + 0.16 * rand()), vAt(y), bend);
  }
  // Kronenäste: der Stamm teilt sich oben in drei steile Äste (sie wachsen aus ihm heraus und decken sein Ende)
  const topY = Y_TOP - 0.2;
  const rTop = trunkR(topY);
  const topAz = rand() * Math.PI * 2;
  for (let k = 0; k < 3; k++) {
    const a = topAz + (k / 3) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    const at = add(axisAt(topY), scale(dirFrom(a, 0), rTop * 0.2));
    // gespreizt (≈ 50–60°) und erst später steil: der Stamm öffnet sich wie eine Hand, keine Säulen nach oben
    limb(at, dirFrom(a, 0.86 + rand() * 0.18), 1.75 * (0.9 + 0.2 * rand()), rTop * (0.68 + 0.06 * rand()), vAt(topY), BEND[0]! * 1.1);
  }
  snowMound(b);
  return { geometry: b.toGeometry(), top, spread, paths };
}

/** Kürzester Winkelabstand a − b in (−π, π]. */
function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Flache und mittlere Äste weichen der offenen Seite aus (± 70°), steile dürfen vorn stehen. */
function awayFromOpenSide(a: number, el: number): number {
  if (el > 0.95) return a;
  const gap = 1.22;
  const d = angleDiff(a, OPEN_AZ);
  return Math.abs(d) < gap ? OPEN_AZ + Math.sign(d || 1) * gap : a;
}

/** Äste am Rand der offenen Seite steigen steiler (sie kreuzen das Bild als lange Diagonalen, Bild 01). */
function openSideElevation(a: number, el: number): number {
  const d = Math.abs(angleDiff(a, OPEN_AZ));
  return d < 1.6 ? Math.max(el, 0.82) : el;
}

/**
 * Schneesaum am Stammfuß (Bild 01: der Schnee läuft weich am mächtigen Fuß hoch, auf der Wetterseite etwas höher; den
 * hohen Schnee am Stamm trägt die Rinde selbst, winterBark.ts): flache, glatte Fläche aus Ringen um die Stammachse,
 * am Stamm am höchsten, nach außen eine lange, hohle Böschung, deren Rand unter den Boden taucht (auch am Hang steht
 * keine Kante über dem Schnee). Er deckt die Wurzelanläufe und verbindet Stamm und Schneefeld. Fein aufgelöst (keine
 * Facetten in den Lichtstufen), Rinden-Ebene `MAPLE_SNOW_LEVEL`.
 */
function snowMound(b: TreeMeshBuilder): void {
  const SEG = 56;
  const RINGS = 12;
  const rIn = 0.35;
  // 1 auf der Wetterseite, 0 im Lee — breit und weich (kein Grat)
  const weather = (a: number): number => 0.5 + 0.5 * Math.cos(angleDiff(a, WEATHER_AZ));
  // im Lee so weit, dass die Wurzelanläufe ganz im Schnee stecken (kein Wurzelende sticht vor dem Saum heraus)
  const radius = (a: number): number => (1.9 + 0.45 * weather(a) ** 2) * (1 + 0.05 * Math.sin(3 * a + 1.1));
  // Höhe am Stamm: niedrig, auf der Wetterseite etwas höher (darüber klettert der Schnee in der Rinde, winterBark.ts)
  const crown = (a: number): number => 0.26 + 0.24 * weather(a) ** 2;
  const SINK = 0.35;
  const height = (r: number, a: number): number => {
    const t = Math.min(1, Math.max(0, (radius(a) - r) / (radius(a) - 1.0)));
    // sanfte Buckel: die Schattengrenze auf der Wehe läuft geschwungen statt als gerade Linie
    const bumps = 1 + 0.14 * Math.sin(2.3 * a + 0.5) * Math.sin(2.6 * r + 0.8) + 0.08 * Math.sin(5.1 * a - 1.3);
    // hohl wie eine Wehe: am Stamm steil, nach außen ein langer, flacher Auslauf
    return (crown(a) * bumps + SINK) * t * t - SINK;
  };
  const point = (t: number, a: number): V3 => {
    // Ringe zum Rand hin dichter (dort ist die Kante zum Boden)
    const r = rIn + (radius(a) - rIn) * (1 - (1 - t) ** 1.6);
    return [Math.cos(a) * r, height(r, a), Math.sin(a) * r];
  };
  const pos: number[] = [];
  const nor: number[] = [];
  const bark: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const p = point(t, a);
      // Normale: das Lot — der Saum liegt im Licht wie das Schneefeld (bei 10° Sonne läge jede abgewandte Böschung schon im
      // Schatten und zeichnete einen Sockel); seine Form zeichnet nur der Schlagschatten des Stamms (Bild 01)
      pos.push(p[0], p[1], p[2]);
      nor.push(0, 1, 0);
      bark.push(j / SEG, 0, MAPLE_SNOW_LEVEL, 0);
    }
  }
  const row = SEG + 1;
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SEG; j++) {
      const a0 = i * row + j;
      const a1 = a0 + row;
      // Windung gegen den Uhrzeigersinn von oben gesehen: die Oberseite ist die Vorderseite
      idx.push(a0, a0 + 1, a1, a0 + 1, a1 + 1, a1);
    }
  }
  b.append(pos, nor, bark, idx);
}
