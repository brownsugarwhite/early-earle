/**
 * LEGO (Spider-Verse, Earth-13122, die LEGO-Welt in „Across“; Florian nach Runde 3: „Lego flackert sehr beim drehen und können die
 * steine noch besser aussehen“).
 *
 * Die Steine hängen fest an der Form, nicht am Blick: Sobald sich das Netz ändert, legt der Prozessor es in ein Raster (je Säule die
 * Schnitte mit der Haut, innen zwischen Ein- und Austritt, vier Säulen je Zelle; eine Zelle ist voll, wenn sie zu gut zwei Fünfteln im
 * Körper liegt) und reicht es als 3D-Textur. Maße wie beim echten Stein: eine Zelle ist 1,2-mal so hoch wie breit, die Noppe hat
 * 0,3 der Breite als Halbmesser. Je Schicht werden die Zellen zu Steinen gelegt (2 × 4, 2 × 2, 1 × 4 … im Verband: jede zweite
 * Schicht quer), jeder Stein hat seine Farbe (eine, in Zonen oder gemischt, aus einem Farbsatz).
 *
 * Gezeichnet wird mit einem Strahl je Bildpunkt durch das Raster (Zelle für Zelle): Fugen nur zwischen Steinen, gefaste Kanten,
 * Noppen als echte Zylinder (im Strahl geschnitten), Verdeckung in Ecken (je Ecke einer Fläche aus den Nachbarzellen), Schatten
 * durch das Raster, glänzender Kunststoff mit matten Fingerabdrücken; darunter eine grüne Grundplatte mit Noppen im Schatten der
 * Steine. Wo ein Bildpunkt Kanten trifft, rechnen fünf Strahlen (geglättet).
 */
import { Data3DTexture, type IUniform, NearestFilter, RGBAFormat, UnsignedByteType, Vector3 } from 'three';
import { BildShader } from '../bildShader';
import type { ReglerZeile, ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';

const REGLER: ReglerZeile[] = [
  { k: 'steine', name: 'Steine', min: 4, max: 24, schritt: 1, grund: 14 },
  { k: 'bunt', name: 'Farben: eine · Zonen · gemischt', min: 0, max: 2, schritt: 1, grund: 1 },
  { k: 'satz', name: 'Farbsatz', min: 0, max: 6, schritt: 1, grund: 0 },
];

/** Farben wie die Steine aus der Kiste (sRGB) */
const PALETTE: [number, number, number][] = [
  [0.79, 0.1, 0.04], // 0 Rot
  [0.95, 0.8, 0.2], // 1 Gelb
  [0.0, 0.33, 0.75], // 2 Blau
  [0.95, 0.95, 0.94], // 3 Weiß
  [0.03, 0.07, 0.11], // 4 Schwarz
  [0.14, 0.47, 0.25], // 5 Grün
  [1.0, 0.54, 0.09], // 6 Orange
  [0.63, 0.65, 0.66], // 7 Hellgrau
  [0.42, 0.43, 0.41], // 8 Dunkelgrau
  [0.89, 0.8, 0.62], // 9 Sand
  [0.21, 0.68, 0.75], // 10 Azur
  [0.73, 0.91, 0.04], // 11 Limette
  [0.78, 0.44, 0.63], // 12 Pink
  [0.45, 0.05, 0.06], // 13 Dunkelrot
  [0.04, 0.2, 0.39], // 14 Dunkelblau
  [0.35, 0.16, 0.07], // 15 Braun
];
/** Farbsätze, je vier Farben: Klassisch, Stadt, Wald, Meer, Abend, Gwen, Spinne */
const SAETZE = [
  [0, 1, 2, 3],
  [7, 8, 3, 1],
  [5, 15, 9, 11],
  [2, 10, 3, 14],
  [6, 0, 1, 13],
  [12, 3, 10, 4],
  [0, 2, 4, 3],
];

const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

function hash3(x: number, y: number, z: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440670441)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** weiches Rauschen im Raum (0 … 1) für die Farbzonen */
function rauschen(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  let s = 0;
  for (let k = 0; k < 2; k++)
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 2; i++) s += (i ? ux : 1 - ux) * (j ? uy : 1 - uy) * (k ? uz : 1 - uz) * hash3(xi + i, yi + j, zi + k);
  return s;
}

type Gitter = { nx: number; ny: number; nz: number; ursprung: Vector3; zelle: Vector3; boden: number; daten: Uint8Array };

/** Steine größte zuerst (längs, quer); ein Zufall lässt die langen manchmal aus */
const GROESSEN: [number, number][] = [
  [4, 2],
  [2, 2],
  [3, 2],
  [4, 1],
  [3, 1],
  [2, 1],
  [1, 1],
];

/** das Netz als Raster aus Steinen: je Zelle Farbe + 1 (0 leer) und die Nummer ihres Steins */
function gitterBauen(pos: Float32Array, index: Uint32Array, mitte: Vector3, halb: Vector3, radius: number, steine: number, bunt: number, satz: number): Gitter {
  const s = radius / steine;
  const hz = 1.2 * s;
  const nx = Math.ceil((2 * halb.x) / s) + 2;
  let nz = Math.ceil((2 * halb.z) / s) + 2;
  if (nz % 2) nz++;
  const ny = Math.ceil((2 * halb.y + 0.25 * hz) / hz) + 2;
  const ursprung = new Vector3(mitte.x - (nx * s) / 2, mitte.y - halb.y - 0.25 * hz, mitte.z - (nz * s) / 2);
  const zelle = new Vector3(s, hz, s);
  // Säulen: zwei mal zwei je Zelle; in x ein wenig versetzt (keine Säule läuft genau durch eine Kante)
  const SX = nx * 2, SZ = nz * 2;
  const treffer: number[][] = new Array<number[]>(SX * SZ);
  for (let i = 0; i < treffer.length; i++) treffer[i] = [];
  const kx = 2 / s, kz = 2 / s;
  const ox = ursprung.x + 0.0137 * s, oz = ursprung.z;
  for (let t = 0; t + 2 < index.length; t += 3) {
    const a = index[t]! * 3, b = index[t + 1]! * 3, c = index[t + 2]! * 3;
    const ax = (pos[a]! - ox) * kx - 0.5, az = (pos[a + 2]! - oz) * kz - 0.5;
    const bx = (pos[b]! - ox) * kx - 0.5, bz = (pos[b + 2]! - oz) * kz - 0.5;
    const cx = (pos[c]! - ox) * kx - 0.5, cz = (pos[c + 2]! - oz) * kz - 0.5;
    const i0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx))), i1 = Math.min(SX - 1, Math.floor(Math.max(ax, bx, cx)));
    if (i0 > i1) continue;
    const k0 = Math.max(0, Math.ceil(Math.min(az, bz, cz))), k1 = Math.min(SZ - 1, Math.floor(Math.max(az, bz, cz)));
    if (k0 > k1) continue;
    const det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
    if (det === 0) continue;
    const ay = pos[a + 1]!, by = pos[b + 1]!, cy = pos[c + 1]!;
    for (let i = i0; i <= i1; i++)
      for (let k = k0; k <= k1; k++) {
        const l1 = ((bx - i) * (cz - k) - (cx - i) * (bz - k)) / det;
        const l2 = ((cx - i) * (az - k) - (ax - i) * (cz - k)) / det;
        const l3 = 1 - l1 - l2;
        if (l1 < 0 || l2 < 0 || l3 < 0) continue;
        treffer[i * SZ + k]!.push(l1 * ay + l2 * by + l3 * cy);
      }
  }
  // je Zelle: welcher Teil liegt im Körper (zwischen Ein- und Austritt der Säulen)
  const anteil = new Float32Array(nx * ny * nz);
  for (let i = 0; i < SX; i++)
    for (let k = 0; k < SZ; k++) {
      const h = treffer[i * SZ + k]!;
      if (h.length < 2) continue;
      h.sort((p, q) => p - q);
      const x = i >> 1, z = k >> 1;
      for (let m = 0; m + 1 < h.length; m += 2) {
        const ya = (h[m]! - ursprung.y) / hz, yb = (h[m + 1]! - ursprung.y) / hz;
        for (let y = Math.max(0, Math.floor(ya)); y <= Math.min(ny - 1, Math.floor(yb)); y++) {
          const ueber = Math.min(yb, y + 1) - Math.max(ya, y);
          if (ueber <= 0) continue;
          const j = x + nx * (y + ny * z);
          anteil[j] = anteil[j]! + ueber * 0.25;
        }
      }
    }
  const n = nx * ny * nz;
  const voll = new Uint8Array(n);
  for (let j = 0; j < n; j++) voll[j] = anteil[j]! >= 0.42 ? 1 : 0;
  // Steine legen: je Schicht, im Verband (jede zweite Schicht quer)
  const stein = new Int32Array(n).fill(-1);
  const farben: number[] = [];
  const at = (x: number, y: number, z: number): number => x + nx * (y + ny * z);
  const fz = 1.3 / radius;
  const saetze = SAETZE[Math.max(0, Math.min(SAETZE.length - 1, satz))]!;
  let boden = ny;
  for (let y = 0; y < ny; y++) {
    const quer = y % 2 === 1;
    const A = quer ? nz : nx, Bq = quer ? nx : nz;
    const zelleBei = (a: number, b: number): number => (quer ? at(b, y, a) : at(a, y, b));
    for (let b = 0; b < Bq; b++)
      for (let a = 0; a < A; a++) {
        const i0 = zelleBei(a, b);
        if (!voll[i0] || stein[i0]! >= 0) continue;
        if (y < boden) boden = y;
        const zuf = hash3(a, y, b);
        for (const [L, W] of GROESSEN) {
          if ((L === 4 && zuf < 0.3) || (L === 3 && zuf > 0.55)) continue;
          if (a + L > A || b + W > Bq) continue;
          let frei = true;
          for (let db = 0; db < W && frei; db++)
            for (let da = 0; da < L; da++) {
              const ii = zelleBei(a + da, b + db);
              if (!voll[ii] || stein[ii]! >= 0) {
                frei = false;
                break;
              }
            }
          if (!frei) continue;
          const nr = farben.length;
          for (let db = 0; db < W; db++) for (let da = 0; da < L; da++) stein[zelleBei(a + da, b + db)] = nr;
          // Farbe aus der Mitte des Steins (Zonen spiegelgleich: |z|)
          const ma = a + L / 2, mb = b + W / 2;
          const wx = ursprung.x + (quer ? mb : ma) * s, wy = ursprung.y + (y + 0.5) * hz, wz = ursprung.z + (quer ? ma : mb) * s;
          let f: number;
          if (bunt <= 0) f = saetze[0]!;
          else if (bunt >= 2) f = saetze[Math.floor(hash3(nr, 7, 13) * 4) % 4]!;
          else {
            const r = 0.65 * rauschen(wx * fz, wy * fz, Math.abs(wz - mitte.z) * fz) + 0.35 * rauschen(wx * fz * 2.3 + 17, wy * fz * 2.3, Math.abs(wz - mitte.z) * fz * 2.3);
            let zone = r < 0.4 ? 0 : r < 0.5 ? 1 : r < 0.6 ? 2 : 3;
            if (hash3(nr, 3, 5) < 0.06) zone = (zone + 1 + Math.floor(hash3(nr, 9, 1) * 3)) % 4;
            f = saetze[zone]!;
          }
          farben.push(f);
          break;
        }
      }
  }
  const daten = new Uint8Array(n * 4);
  for (let j = 0; j < n; j++) {
    const nr = stein[j]!;
    if (nr < 0) continue;
    daten[j * 4] = farben[nr]! + 1;
    daten[j * 4 + 1] = nr & 255;
    daten[j * 4 + 2] = (nr >> 8) & 255;
    daten[j * 4 + 3] = 255;
  }
  return { nx, ny, nz, ursprung, zelle, boden: boden >= ny ? 0 : boden, daten };
}

const FRAGMENT = /* glsl */ `
precision highp sampler3D;
uniform highp sampler3D tSteine;
uniform vec3 uGUrsprung;
uniform vec3 uGZelle;
uniform vec3 uGN;
uniform float uGBoden;
uniform vec3 uFarben[16];
const float NOPPE_R = 0.3;
const float NOPPE_H = 0.17;

vec4 zl(vec3 c) {
  if (any(lessThan(c, vec3(0.0))) || any(greaterThanEqual(c, uGN))) return vec4(0.0);
  return texelFetch(tSteine, ivec3(c), 0);
}
bool belegt(vec3 c) { return zl(c).r > 0.002; }
float steinNr(vec4 t) { return floor(t.g * 255.0 + 0.5) + 256.0 * floor(t.b * 255.0 + 0.5); }

struct Treffer { float t; vec3 zelle; vec3 n; int art; };

/** ein Strahl durch das Raster (Zelle für Zelle): der erste Stein oder, mit noppen, die erste Noppe; t in der Welt */
Treffer laufen(vec3 o, vec3 d, int schritte, bool noppen) {
  Treffer h;
  h.t = -1.0;
  h.zelle = vec3(0.0);
  h.n = vec3(0.0);
  h.art = 0;
  vec3 og = (o - uGUrsprung) / uGZelle;
  vec3 dg = d / uGZelle;
  dg += vec3(1e-7) * step(abs(dg), vec3(1e-7));
  vec3 inv = 1.0 / dg;
  vec3 ta = -og * inv, tb = (uGN - og) * inv;
  vec3 tmin = min(ta, tb), tmax = max(ta, tb);
  float t0 = max(max(tmin.x, tmin.y), max(tmin.z, 0.0));
  float t1 = min(min(tmax.x, tmax.y), tmax.z);
  if (t0 >= t1) return h;
  vec3 c = clamp(floor(og + dg * (t0 + 1e-4 * uGZelle.x)), vec3(0.0), uGN - 1.0);
  vec3 st = sign(dg);
  vec3 tNext = (c + max(st, 0.0) - og) * inv;
  vec3 tDelta = abs(inv);
  vec3 n = tmin.x > tmin.y && tmin.x > tmin.z ? vec3(-st.x, 0.0, 0.0) : (tmin.y > tmin.z ? vec3(0.0, -st.y, 0.0) : vec3(0.0, 0.0, -st.z));
  float tEin = t0;
  for (int i = 0; i < 240; i++) {
    if (i >= schritte || tEin > t1) break;
    float tAus = min(min(tNext.x, tNext.y), tNext.z);
    if (belegt(c)) {
      h.t = tEin;
      h.zelle = c;
      h.n = n;
      h.art = 1;
      return h;
    }
    if (noppen && belegt(c - vec3(0.0, 1.0, 0.0))) {
      // die Noppe steht am Boden dieser Zelle: Zylinder (in x und z rund) geschnitten mit der Schicht ihrer Höhe
      vec2 oo = og.xz - (c.xz + 0.5);
      float A = dot(dg.xz, dg.xz), B = dot(oo, dg.xz), C = dot(oo, oo) - NOPPE_R * NOPPE_R;
      float disk = B * B - A * C;
      if (disk > 0.0) {
        float sq = sqrt(disk);
        float ca = (-B - sq) / A, cb = (-B + sq) / A;
        float ya = (c.y - og.y) * inv.y, yb = (c.y + NOPPE_H - og.y) * inv.y;
        float sa = min(ya, yb), sb = max(ya, yb);
        float ein = max(max(ca, sa), tEin), aus = min(min(cb, sb), tAus);
        if (ein < aus) {
          h.t = ein;
          h.zelle = c;
          h.art = 2;
          if (ca >= sa) {
            vec2 r = oo + dg.xz * ein;
            h.n = normalize(vec3(r.x, 0.0, r.y));
          } else h.n = vec3(0.0, 1.0, 0.0);
          return h;
        }
      }
    }
    if (tNext.x < tNext.y && tNext.x < tNext.z) { c.x += st.x; tEin = tNext.x; tNext.x += tDelta.x; n = vec3(-st.x, 0.0, 0.0); }
    else if (tNext.y < tNext.z) { c.y += st.y; tEin = tNext.y; tNext.y += tDelta.y; n = vec3(0.0, -st.y, 0.0); }
    else { c.z += st.z; tEin = tNext.z; tNext.z += tDelta.z; n = vec3(0.0, 0.0, -st.z); }
    if (any(lessThan(c, vec3(0.0))) || any(greaterThanEqual(c, uGN))) break;
  }
  return h;
}

/** Verdeckung an den vier Ecken einer Fläche (aus den Zellen vor ihr), zwischen ihnen gemischt */
float eckenAO(vec3 f, vec3 t1, vec3 t2, float u, float v) {
  float a = belegt(f - t1) ? 1.0 : 0.0, b = belegt(f + t1) ? 1.0 : 0.0, c = belegt(f - t2) ? 1.0 : 0.0, d = belegt(f + t2) ? 1.0 : 0.0;
  float e00 = belegt(f - t1 - t2) ? 1.0 : 0.0, e10 = belegt(f + t1 - t2) ? 1.0 : 0.0, e01 = belegt(f - t1 + t2) ? 1.0 : 0.0, e11 = belegt(f + t1 + t2) ? 1.0 : 0.0;
  float o00 = a * c > 0.5 ? 3.0 : a + c + e00;
  float o10 = b * c > 0.5 ? 3.0 : b + c + e10;
  float o01 = a * d > 0.5 ? 3.0 : a + d + e01;
  float o11 = b * d > 0.5 ? 3.0 : b + d + e11;
  float o = mix(mix(o00, o10, u), mix(o01, o11, u), v);
  return 1.0 - o * 0.19;
}

vec3 lichtRichtung() { return ausSicht(normalize(vec3(-0.5, 0.78, 0.38))); }

/** ein getroffener Stein oder eine Noppe: Fase, Fugen, Verdeckung, Schatten, Kunststoff */
vec3 steinLicht(Treffer h, vec3 o, vec3 d) {
  vec3 og = (o - uGUrsprung) / uGZelle;
  vec3 pg = og + d / uGZelle * h.t;
  vec3 pw = o + d * h.t;
  vec3 c = h.zelle;
  vec3 L = lichtRichtung();
  vec3 V = -d;
  vec4 z = zl(h.art == 2 ? c - vec3(0.0, 1.0, 0.0) : c);
  float nr = steinNr(z);
  vec3 alb = uFarben[int(clamp(floor(z.r * 255.0 + 0.5) - 1.0, 0.0, 15.0))];
  alb *= 0.975 + 0.05 * hash11(nr * 0.731 + 0.3);
  vec3 n = h.n;
  vec3 nn = n;
  float ao = 1.0, fuge = 0.0;
  float s = uGZelle.x;
  if (h.art == 1) {
    vec3 l = pg - c;
    vec3 t1, t2;
    if (abs(n.x) > 0.5) { t1 = vec3(0.0, 1.0, 0.0); t2 = vec3(0.0, 0.0, 1.0); }
    else if (abs(n.y) > 0.5) { t1 = vec3(1.0, 0.0, 0.0); t2 = vec3(0.0, 0.0, 1.0); }
    else { t1 = vec3(1.0, 0.0, 0.0); t2 = vec3(0.0, 1.0, 0.0); }
    float u = clamp(dot(l, t1), 0.0, 1.0), v = clamp(dot(l, t2), 0.0, 1.0);
    float s1 = dot(uGZelle, t1), s2 = dot(uGZelle, t2);
    // vier Ränder: ein Rand ist eine Kante, wo der Nachbar leer ist oder zu einem anderen Stein gehört
    for (int k = 0; k < 4; k++) {
      vec3 td = k == 0 ? -t1 : (k == 1 ? t1 : (k == 2 ? -t2 : t2));
      float de = k == 0 ? u * s1 : (k == 1 ? (1.0 - u) * s1 : (k == 2 ? v * s2 : (1.0 - v) * s2));
      vec4 zn = zl(c + td);
      bool gleich = zn.r > 0.002 && abs(steinNr(zn) - nr) < 0.5;
      if (gleich) continue;
      // nicht, wo die Fläche in eine Nachbarfläche übergeht (innere Ecke)
      if (belegt(c + td + n)) continue;
      float fase = 1.0 - smoothstep(0.0, 0.05 * s, de);
      nn += td * fase * 0.85;
      if (zn.r > 0.002) fuge = max(fuge, 1.0 - smoothstep(0.004 * s, 0.016 * s, de));
    }
    ao = eckenAO(c + n, t1, t2, u, v);
    // um die Noppe oben: ihr Fuß wirft eine weiche Verdeckung
    if (n.y > 0.5) ao *= mix(0.62, 1.0, smoothstep(NOPPE_R, NOPPE_R + 0.14, length(l.xz - 0.5)));
  } else {
    // Noppe: Fase am oberen Rand, Fuß im Schatten
    vec2 r = pg.xz - (c.xz + 0.5);
    float rr = length(r);
    if (n.y > 0.5) nn = normalize(vec3(0.0, 1.0, 0.0) + vec3(r.x, 0.0, r.y) / max(rr, 1e-4) * smoothstep(NOPPE_R - 0.05, NOPPE_R, rr) * 1.4);
    else nn = normalize(n + vec3(0.0, 1.0, 0.0) * smoothstep(NOPPE_H - 0.05, NOPPE_H, pg.y - c.y) * 1.2);
    ao = mix(0.62, 1.0, smoothstep(0.0, 0.1, pg.y - c.y));
  }
  nn = normalize(nn);
  float nl = dot(nn, L);
  float sch = 1.0;
  if (nl > 0.0) sch = laufen(pw + n * 0.02 * s + L * 0.002 * s, L, 160, false).art == 0 ? 1.0 : 0.0;
  vec3 H = normalize(L + V);
  // Kunststoff: glänzend, mit matten Stellen (Fingerabdrücke, Abrieb)
  float rauh = 0.17 + 0.2 * smoothstep(0.35, 0.85, fbm3(pw / s * 0.9 + 4.0));
  float spec = ggx(max(dot(nn, H), 0.0), rauh) * fresnelS(max(dot(H, V), 0.0), 0.05);
  vec3 himmel = mix(vec3(0.3, 0.28, 0.25), vec3(0.6, 0.7, 0.88), nn.y * 0.5 + 0.5);
  vec3 col = alb * (max(nl, 0.0) * sch * vec3(1.0, 0.96, 0.9) * 2.3 + himmel * ao * 0.75);
  col += spec * max(nl, 0.0) * sch * vec3(1.0, 0.97, 0.92) * 1.3;
  col += studio(reflect(-V, nn)) * fresnelS(max(dot(nn, V), 0.0), 0.05) * ao * 0.55;
  col *= 1.0 - 0.8 * fuge;
  return col;
}

vec3 himmelBild(vec3 d) {
  return mix(srgbZuLin(vec3(0.86, 0.9, 0.96)), srgbZuLin(vec3(0.4, 0.6, 0.9)), smoothstep(-0.05, 0.75, d.y));
}

/** die Grundplatte unter den Steinen: grün, mit Noppen (flach gezeichnet), im Schatten und in der Verdeckung der Steine */
bool grundplatte(vec3 o, vec3 d, float tStein, out vec3 col, out float nebel, out float kennung) {
  col = vec3(0.0);
  nebel = 1.0;
  kennung = -1.0;
  if (d.y > -1e-4) return false;
  float tb = (uGBoden - o.y) / d.y;
  if (tb <= 0.0 || (tStein >= 0.0 && tb > tStein)) return false;
  vec3 pb = o + d * tb;
  float s = uGZelle.x;
  vec2 g2 = (pb.xz - uGUrsprung.xz) / s;
  vec2 zelle = floor(g2);
  vec2 f2 = g2 - zelle - 0.5;
  float r = length(f2);
  vec3 L = lichtRichtung();
  vec2 lx = normalize(L.xz + vec2(1e-5));
  float pix = (uOrtho > 0.5 ? 1.0 : tb) * 2.0 / (uProj[1][1] * uAufl.y) / s;
  float aa = clamp(pix / max(abs(d.y), 0.08), 0.004, 1.0);
  float deckel = 1.0 - smoothstep(NOPPE_R - aa, NOPPE_R + aa, r);
  float ring = smoothstep(NOPPE_R - 0.06 - aa, NOPPE_R - aa, r) * deckel;
  float auf = dot(f2 / max(r, 1e-4), lx);
  float hell = mix(1.0, 1.06, deckel);
  hell = mix(hell, mix(0.72, 1.3, smoothstep(-0.2, 0.2, auf)), ring);
  float sr = length(f2 + lx * 0.13);
  hell *= 1.0 - 0.32 * (1.0 - smoothstep(NOPPE_R - aa, NOPPE_R + 0.05 + aa, sr)) * (1.0 - deckel);
  hell = mix(hell, 1.0, smoothstep(0.12, 0.35, aa));
  float ao = eckenAO(vec3(zelle.x, floor((uGBoden - uGUrsprung.y) / uGZelle.y + 0.5), zelle.y), vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), fract(g2.x), fract(g2.y));
  float sch = laufen(pb + vec3(0.0, 0.02 * uGZelle.y, 0.0), L, 160, false).art == 0 ? 1.0 : 0.0;
  // die Platte ist ein Quadrat (Vielfaches von acht Noppen) um das Modell; daneben ein heller Studioboden
  vec2 mitteG = uGN.xz * 0.5;
  float halbP = ceil((max(uGN.x, uGN.z) * 0.5 + 4.0) / 4.0) * 4.0;
  vec2 ab = abs(g2 - mitteG) - halbP;
  float aussen = smoothstep(-aa, aa, max(ab.x, ab.y));
  vec3 gruen = srgbZuLin(vec3(0.15, 0.48, 0.2));
  vec3 boden = srgbZuLin(vec3(0.86, 0.84, 0.8));
  float kante = 1.0 - smoothstep(0.0, 0.08 + aa, abs(max(ab.x, ab.y)));
  vec3 alb = mix(gruen * hell, boden, aussen);
  alb *= 1.0 - 0.45 * kante;
  // die Platte wirft am Rand einen schmalen Schatten auf den Boden (ihre Dicke)
  float randSchatten = aussen * (1.0 - smoothstep(0.0, 0.35, max(ab.x, ab.y))) * smoothstep(-0.2, 0.4, dot(sign(g2 - mitteG) * step(abs(ab.yx), abs(ab.xy)) , -lx));
  alb *= 1.0 - 0.3 * randSchatten;
  col = alb * (max(L.y, 0.0) * sch * vec3(1.0, 0.96, 0.9) * 2.1 + vec3(0.6, 0.7, 0.88) * 0.6 * ao);
  nebel = 1.0 - exp(-max(tb - length(uKamPos - uMitte), 0.0) / (uRadius * 7.0));
  kennung = -2.0 - step(NOPPE_R, r);
  return true;
}

/** ein Strahl: Farbe (linear, vormultipliziert) und eine Kennung des Getroffenen (für das Glätten an Kanten) */
vec4 probe(vec2 uv, out float kennung) {
  vec3 d = blickDurch(uv);
  vec3 o = lageAusTiefe(uv, max(1.0, length(uKamPos - uMitte) - uRadius * 3.0));
  Treffer h = laufen(o, d, 240, true);
  vec3 col = himmelBild(d);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  kennung = -1.0;
  if (uBuehne > 0.5) {
    vec3 pc;
    float nebel, ken;
    if (grundplatte(o, d, h.t, pc, nebel, ken)) {
      col = mix(pc, col, nebel);
      kennung = ken;
    }
  }
  if (h.art > 0) {
    col = steinLicht(h, o, d);
    a = 1.0;
    kennung = h.zelle.x + h.zelle.y * 211.0 + h.zelle.z * 44521.0 + float(h.art) * 0.5;
  }
  return vec4(col * a, a);
}

void main() {
  float k0;
  vec4 c = probe(vUv, k0);
  if (fwidth(k0) > 0.0) {
    vec2 px = 1.0 / uAufl;
    float kk;
    c += probe(vUv + vec2(0.375, 0.125) * px, kk);
    c += probe(vUv + vec2(-0.125, 0.375) * px, kk);
    c += probe(vUv + vec2(-0.375, -0.125) * px, kk);
    c += probe(vUv + vec2(0.125, -0.375) * px, kk);
    c *= 0.2;
  }
  vec3 bild = linZuSrgb(aces(c.rgb / max(c.a, 1e-4) * 1.1));
  farbe = vec4(bild * c.a, c.a);
}
`;

class Lego implements ShaderLauf {
  private readonly innen: BildShader;
  private textur: Data3DTexture | null = null;
  private stand = -1;
  private schluessel = '';
  private zuletzt = -1e9;
  private offen = false;
  private ms = 0;
  private zellen = 0;
  private readonly uni: Record<string, IUniform> = {
    tSteine: { value: null },
    uGUrsprung: { value: new Vector3() },
    uGZelle: { value: new Vector3(1, 1, 1) },
    uGN: { value: new Vector3(1, 1, 1) },
    uGBoden: { value: 0 },
    uFarben: { value: PALETTE.map((f) => new Vector3(lin(f[0]), lin(f[1]), lin(f[2]))) },
  };

  constructor(k: ShaderKern) {
    this.innen = new BildShader(k, { id: 'lego', fragment: FRAGMENT, regler: REGLER, uniforms: this.uni, vorher: (kk, w) => this.legen(kk, w), unruhig: () => false });
  }

  /** das Raster neu legen, wenn sich Netz oder Regler geändert haben (im Zug höchstens alle 90 ms) */
  private legen(k: ShaderKern, w: ShaderWerte): void {
    const netz = k.netzDaten;
    if (!netz) return;
    const steine = Math.round(w.regler.steine ?? 14), bunt = Math.round(w.regler.bunt ?? 1), satz = Math.round(w.regler.satz ?? 0);
    const schluessel = `${steine}|${bunt}|${satz}`;
    const jetzt = performance.now();
    const netzNeu = k.netzStand !== this.stand;
    if (!netzNeu && schluessel === this.schluessel && this.textur) {
      this.offen = false;
      return;
    }
    if (schluessel === this.schluessel && this.textur && jetzt - this.zuletzt < 90) {
      this.offen = true;
      return;
    }
    this.offen = false;
    const t0 = performance.now();
    const g = gitterBauen(netz.pos, netz.index, k.u.uMitte.value, k.u.uHalb.value, k.u.uRadius.value, steine, bunt, satz);
    const t = this.textur;
    if (!t || t.image.width !== g.nx || t.image.height !== g.ny || t.image.depth !== g.nz) {
      t?.dispose();
      const neu = new Data3DTexture(g.daten, g.nx, g.ny, g.nz);
      neu.format = RGBAFormat;
      neu.type = UnsignedByteType;
      neu.minFilter = NearestFilter;
      neu.magFilter = NearestFilter;
      neu.unpackAlignment = 1;
      neu.generateMipmaps = false;
      neu.needsUpdate = true;
      this.textur = neu;
    } else {
      (t.image as { data: Uint8Array }).data = g.daten;
      t.needsUpdate = true;
    }
    this.uni.tSteine!.value = this.textur;
    (this.uni.uGUrsprung!.value as Vector3).copy(g.ursprung);
    (this.uni.uGZelle!.value as Vector3).copy(g.zelle);
    (this.uni.uGN!.value as Vector3).set(g.nx, g.ny, g.nz);
    this.uni.uGBoden!.value = g.ursprung.y + g.boden * g.zelle.y;
    this.ms = performance.now() - t0;
    this.zellen = g.nx * g.ny * g.nz;
    this.stand = k.netzStand;
    this.schluessel = schluessel;
    this.zuletzt = jetzt;
  }

  bild(k: ShaderKern, w: ShaderWerte) {
    return this.innen.bild(k, w);
  }

  unruhig(): boolean {
    return this.offen;
  }

  info(): Record<string, number> {
    return { legenMs: Math.round(this.ms * 10) / 10, zellen: this.zellen };
  }

  freigeben(): void {
    this.innen.freigeben();
    this.textur?.dispose();
    this.textur = null;
  }
}

export const LEGO: Voreinstellung = {
  id: 'lego',
  name: 'LEGO',
  gruppe: 'Spider-Verse',
  zeile: 'Earth-13122: die Form aus echten Steinen, fest an der Form (Raster aus dem Netz): Verband, Noppen, Fugen, Schatten, Grundplatte',
  regler: REGLER,
  bauen: (k) => new Lego(k),
};
