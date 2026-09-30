import { abs, atan, clamp, cross, dot, float, floor, fract, fwidth, hash, length, min, mix, normalize, select, sin, smoothstep, step, vec2, vec3 } from 'three/tsl';
import type { FloatNode, Vec3Node } from '../tsl';

/**
 * Filigrane Muster der Bäume v3 — alle im Objekt-/Baumraum (nie Screen-Space, nichts schwimmt beim Rollen), mit
 * `fwidth` auf eine Pixelkante geglättet und ausgeblendet, sobald die Periode unter ≈ 2–3 px fällt (kein Flimmern).
 */

type Num = FloatNode | number;
const f = (x: Num): FloatNode => (typeof x === 'number' ? float(x) : x);

/** Hash dreier Gitterzellen-Koordinaten (positiv verschoben, exakt in f32) → 0..1. */
export function cellHash(c: Vec3Node, salt = 0): FloatNode {
  const s = c.x.add(128.0).add(c.y.add(128.0).mul(251.0)).add(c.z.add(128.0).mul(63001.0)).add(salt);
  return hash(s) as unknown as FloatNode;
}

/** Zweiter, dritter … Hash aus einem ersten (Kette über uint). */
export function rehash(h: FloatNode, salt: number): FloatNode {
  return hash(h.mul(16777215.0).add(salt)) as unknown as FloatNode;
}

/**
 * Tüpfel: Punkte in einem 3D-Gitter (Zelle `cell` Welteinheiten), je Zelle ein verschobener Punkt mit Radius
 * `size·cell·grow` (grow 0..1: 0 = verschwunden — die Punkte skalieren im Schatten weich aus 0), `density` = Anteil
 * besetzter Zellen. Rückgabe {mask 0..1, key 0..1 je Punkt (Farbwahl)}; Zellen unter ≈ 3 px blenden aus.
 */
export function stipple(p: Vec3Node, cell: Num, size: Num, grow: FloatNode, density: Num): { mask: FloatNode; key: FloatNode } {
  const cellN = f(cell);
  const q = p.div(cellN);
  const c = floor(q);
  const fr = fract(q);
  const h1 = cellHash(c);
  const h2 = rehash(h1, 11);
  const h3 = rehash(h2, 23);
  const h4 = rehash(h3, 37);
  // Versatz so klein, dass die Scheibe in ihrer Zelle bleibt (sonst schneiden die Zellwände gerade Kanten hinein)
  const jit = vec3(h1, h2, h3).sub(0.5).mul(float(1).sub(f(size).mul(2)).max(0).mul(0.9));
  const d = length(fr.sub(0.5).sub(jit)).mul(cellN);
  const present = select(h4.lessThan(f(density)), float(1), float(0));
  const rad = cellN.mul(f(size)).mul(grow).mul(present);
  // Pixelgröße aus der stetigen Koordinate (fwidth(d) springt an den Zellwänden → sonst helle Linien auf den Kanten)
  const cellsPerPx = fwidth(q.x).add(fwidth(q.y)).add(fwidth(q.z)).mul(0.5);
  const fw = cellsPerPx.mul(cellN).max(1e-5);
  const disc = smoothstep(rad.add(fw), rad.sub(fw), d).mul(clamp(rad.div(fw), 0, 1));
  const fade = smoothstep(0.42, 0.24, cellsPerPx);
  return { mask: disc.mul(fade), key: rehash(h4, 41) };
}

/**
 * Blütenmotive (Bild 02: kleine Vier-Punkt-Blüten in Akzentfarben): größere Gitterzellen, in einem Teil davon eine
 * Raute aus vier Punkten in der Tangentialebene der Krone (Normale `n`), nur dort, wo die Fläche nahe am Zellzentrum
 * verläuft. Rückgabe {mask, key}.
 */
export function flowers(p: Vec3Node, n: Vec3Node, cell: Num, grow: FloatNode, density: Num): { mask: FloatNode; key: FloatNode } {
  const cellN = f(cell);
  const q = p.div(cellN);
  const c = floor(q);
  const h1 = cellHash(c, 7);
  const h2 = rehash(h1, 13);
  const h3 = rehash(h2, 29);
  const center = c.add(vec3(0.5, 0.5, 0.5)).add(vec3(h1, h2, h3).sub(0.5).mul(0.3)).mul(cellN);
  const rel = p.sub(center);
  const nn = normalize(n);
  const t1 = normalize(cross(nn, vec3(0.13, 1, 0.07)));
  const t2 = cross(nn, t1);
  const x = dot(rel, t1);
  const y = dot(rel, t2);
  const off = dot(rel, nn);
  const a = cellN.mul(0.2);
  const dx = min(length(vec2(abs(x).sub(a), y)), length(vec2(x, abs(y).sub(a))));
  const rad = cellN.mul(0.085).mul(grow);
  const cellsPerPx = fwidth(q.x).add(fwidth(q.y)).add(fwidth(q.z)).mul(0.5);
  const fw = cellsPerPx.mul(cellN).max(1e-5);
  const disc = smoothstep(rad.add(fw), rad.sub(fw), dx).mul(clamp(rad.div(fw), 0, 1));
  const near = smoothstep(cellN.mul(0.34), cellN.mul(0.2), abs(off));
  const present = select(rehash(h3, 5).lessThan(f(density)), float(1), float(0));
  const fade = smoothstep(0.3, 0.16, cellsPerPx);
  return { mask: disc.mul(near).mul(present).mul(fade), key: rehash(h3, 17) };
}

/**
 * Flecken (Flechten, Moos, Schneeflecken): je Gitterzelle ein unregelmäßiger Fleck in einer flachen Farbe — der Rand
 * wird von `wobble` (0..1, z. B. Wertrauschen) verbeult. Rückgabe {mask, key 0..1 je Fleck (eine Farbe je Fleck)}.
 */
export function blotches(p: Vec3Node, cell: Num, size: Num, density: Num, wobble: FloatNode): { mask: FloatNode; key: FloatNode } {
  const cellN = f(cell);
  const q = p.div(cellN);
  const c = floor(q);
  const fr = fract(q);
  const h1 = cellHash(c, 3);
  const h2 = rehash(h1, 5);
  const h3 = rehash(h2, 9);
  const h4 = rehash(h3, 15);
  const jit = vec3(h1, h2, h3).sub(0.5).mul(0.3);
  const d = length(fr.sub(0.5).sub(jit));
  const present = select(h4.lessThan(f(density)), float(1), float(0));
  const rad = f(size).mul(float(0.7).add(h2.mul(0.6))).mul(float(0.72).add(wobble.mul(0.56))).mul(present);
  const cellsPerPx = fwidth(q.x).add(fwidth(q.y)).add(fwidth(q.z)).mul(0.5);
  const fw = cellsPerPx.max(1e-5);
  const mask = smoothstep(rad.add(fw), rad.sub(fw), d);
  return { mask: mask.mul(smoothstep(0.5, 0.3, cellsPerPx)), key: rehash(h4, 21) };
}

/** Glattes 3D-Wertrauschen 0..1 (trilinear über gehashte Gitterpunkte). */
export function valueNoise3(p: Vec3Node, salt = 0): FloatNode {
  const i = floor(p);
  const fr = fract(p);
  const u = fr.mul(fr).mul(fr.mul(-2).add(3));
  const h = (x: number, y: number, z: number) => cellHash(i.add(vec3(x, y, z)), salt);
  const x00 = mix(h(0, 0, 0), h(1, 0, 0), u.x);
  const x10 = mix(h(0, 1, 0), h(1, 1, 0), u.x);
  const x01 = mix(h(0, 0, 1), h(1, 0, 1), u.x);
  const x11 = mix(h(0, 1, 1), h(1, 1, 1), u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

/**
 * Wellige Linien, die der Form folgen (Kalligrafie der Rinde, Bild 01): `u` rundum 0..1, `lines` Linien rundum
 * (ganzzahlig → nahtlos), `along` längs (Welteinheiten). Breite atmet, Linien brechen abschnittsweise ab.
 */
export function flowLines(u: FloatNode, along: FloatNode, lines: FloatNode, width: Num, breaks: Num, salt: number): FloatNode {
  const phase = u.mul(6.2831853);
  const wave = u.mul(lines).add(sin(along.mul(1.9).add(phase.mul(2.0))).mul(0.2)).add(sin(along.mul(5.3).add(phase.mul(3.0))).mul(0.08));
  const fr = fract(wave);
  const raw = floor(wave);
  const idx = raw.sub(floor(raw.div(lines)).mul(lines)); // Linienindex modulo Linienzahl (gleich auf beiden Seiten der Naht)
  const dist = abs(fr.sub(0.5));
  const seg = floor(along.mul(1.6).add(idx.mul(0.37)));
  const hw = f(width).mul(float(0.55).add(hash(idx.mul(97.0).add(seg.mul(13.0)).add(salt + 4096.0)).mul(0.9))).mul(0.5);
  const keep = select((hash(idx.mul(31.0).add(seg.mul(7.0)).add(salt + 8192.0)) as unknown as FloatNode).lessThan(f(breaks)), float(0), float(1));
  const fw = fwidth(wave).max(1e-5);
  const line = smoothstep(hw.add(fw), hw.sub(fw), dist);
  const fade = smoothstep(0.4, 0.2, fw);
  return line.mul(keep).mul(fade);
}

/**
 * Astnetz in einer Säulenkrone (Ebene 16 Kathedralenwald: die hellen Stämme verzweigen sich in der Krone zu einem
 * feinen Netz, das durch das getüpfelte Laub scheint): Linien in Zylinderkoordinaten um die Kronenachse — unten vier
 * Äste rundum, die sich nach oben dreimal gabeln (8, 16, 32), jede Gabel ein weicher Y-Bogen, die Linien verjüngen sich
 * und enden unter dem Scheitel. Rundum periodisch (keine Naht), Breite in Welteinheiten, mit `fwidth` geglättet und
 * ausgeblendet, sobald die Linien unter ≈ 1 px fallen. `p` Musterkoordinate (Welteinheiten, Kronenmitte im Ursprung),
 * `radius`/`half` Hüllradius und halbe Höhe (Welteinheiten). Rückgabe: Deckung 0..1.
 */
export function branchVeins(p: Vec3Node, radius: FloatNode, half: FloatNode, width: Num, salt = 0): FloatNode {
  const u = atan(p.z, p.x).div(Math.PI * 2).add(0.5); // 0..1 rundum
  const v = clamp(p.y.div(half).mul(0.5).add(0.5), 0, 1); // 0 unten … 1 oben
  const circ = radius.mul(Math.PI * 2);
  // Gabelhöhen (Anteil der Kronenhöhe) und Übergangsbreite
  const b1 = float(0.22);
  const b2 = float(0.46);
  const b3 = float(0.68);
  const span = float(0.14);
  // Ebene: 4 · 2^k Linien, k = Zahl der Gabeln unter v
  const k = step(b1, v).add(step(b2, v)).add(step(b3, v));
  const n = float(4).mul(select(k.lessThan(0.5), float(1), select(k.lessThan(1.5), float(2), select(k.lessThan(2.5), float(4), float(8)))));
  const bk = select(k.lessThan(0.5), float(-1), select(k.lessThan(1.5), b1, select(k.lessThan(2.5), b2, b3)));
  const t = select(k.lessThan(0.5), float(1), smoothstep(bk, bk.add(span), v));
  // Elternzelle m (zwei Kinder 2m, 2m+1); je Zelle ein kleiner Versatz (gewachsen, nicht gezirkelt)
  const cellU = u.mul(n.mul(0.5));
  const m = floor(cellU);
  const hm = hash(m.add(k.mul(97)).add(salt + 311)) as unknown as FloatNode;
  const jit = hm.sub(0.5).mul(0.3);
  const parent = m.add(0.5).add(jit.mul(0.4)).div(n.mul(0.5));
  const c0 = m.mul(2).add(0.5).add(jit).div(n);
  const c1 = m.mul(2).add(1.5).add(jit).div(n);
  const p0 = mix(parent, c0, t);
  const p1 = mix(parent, c1, t);
  const d = min(abs(u.sub(p0)), abs(u.sub(p1))).mul(circ);
  // Breite: dick unten, fein oben; die Linien enden unter dem Scheitel (Spitzen)
  const w = f(width).mul(float(1).sub(v.mul(0.72))).mul(smoothstep(0.97, 0.84, v));
  const fw = fwidth(d).max(1e-5);
  const line = smoothstep(w.add(fw), w.sub(fw), d).mul(clamp(w.div(fw), 0, 1));
  return line;
}
