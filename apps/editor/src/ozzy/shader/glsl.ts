/**
 * Gemeinsame GLSL-Bausteine der Shader (20.11.2026, Plan `docs/plans/2026-11-20-ozzy-shader.md`). Alles GLSL ES 3.0, als Text zum
 * Einsetzen. Herkunft: Hash ohne Sinus nach Dave Hoskins, Simplex-Rauschen nach Ashima/Gustavson (MIT), Farbabgleich CIE nach
 * Wyman, Sloan und Shirley (2013), ACES-Näherung nach Narkowicz. Der Rest ist hier geschrieben.
 */

/** Hash und Rauschen: hash11 … hash33, noise2, fbm2, snoise (3D), fbm3, curl3, voronoi2, voronoi3 */
export const RAUSCHEN = /* glsl */ `
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash21(float p) { vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash31(float p) { vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
vec3 hash32(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }

float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm2(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise2(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.1; a *= 0.5; }
  return s;
}

vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute4(vec4 x) { return mod289v4(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt4(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289v3(i);
  vec4 p = permute4(permute4(permute4(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt4(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * snoise(p); p = p * 2.03 + vec3(11.7, -3.1, 7.9); a *= 0.5; }
  return s;
}
float fbm3n(vec3 p, int n) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 8; i++) { if (i >= n) break; s += a * snoise(p); p = p * 2.03 + vec3(11.7, -3.1, 7.9); a *= 0.5; }
  return s;
}
vec3 potential3(vec3 p) { return vec3(snoise(p), snoise(p + vec3(31.4, 17.2, -9.7)), snoise(p + vec3(-23.1, 48.9, 5.3))); }
vec3 curl3(vec3 p) {
  const float e = 0.09;
  vec3 x0 = potential3(p - vec3(e, 0.0, 0.0)), x1 = potential3(p + vec3(e, 0.0, 0.0));
  vec3 y0 = potential3(p - vec3(0.0, e, 0.0)), y1 = potential3(p + vec3(0.0, e, 0.0));
  vec3 z0 = potential3(p - vec3(0.0, 0.0, e)), z1 = potential3(p + vec3(0.0, 0.0, e));
  return vec3((y1.z - y0.z) - (z1.y - z0.y), (z1.x - z0.x) - (x1.z - x0.z), (x1.y - x0.y) - (y1.x - y0.x)) / (2.0 * e);
}
/** (Abstand zur nächsten Zelle, zur zweitnächsten, Kennung der nächsten 0..1) */
vec3 voronoi2(vec2 x) {
  vec2 p = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 b = vec2(float(i), float(j));
      vec2 r = b + hash22(p + b) - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = hash12(p + b + 0.37); } else if (d < d2) d2 = d;
    }
  return vec3(sqrt(d1), sqrt(d2), id);
}
vec3 voronoi3(vec3 x) {
  vec3 p = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 r = b + hash33(p + b) - f;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; id = hash13(p + b + 0.37); } else if (d < d2) d2 = d;
      }
  return vec3(sqrt(d1), sqrt(d2), id);
}
`;

/** Farbe: sRGB, Tonemapping, Schwarzkörper, Spektralfarben, HSV, Mischungen */
export const FARBE = /* glsl */ `
vec3 linZuSrgb(vec3 c) { c = max(c, vec3(0.0)); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
vec3 srgbZuLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
vec3 aces(vec3 x) { const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
/** Farbe eines schwarzen Körpers (Kelvin), linear, auf den hellsten Kanal normiert (Planck an drei Wellenlängen) */
vec3 schwarzkoerper(float T) {
  vec3 l = vec3(0.610, 0.549, 0.468);
  vec3 e = exp(14388.0 / (l * max(T, 300.0))) - 1.0;
  vec3 b = 1.0 / (l * l * l * l * l * e);
  return b / max(b.r, max(b.g, b.b));
}
/** CIE 1931 (Wyman et al. 2013) für eine Wellenlänge in nm, als lineares sRGB */
vec3 spektral(float l) {
  float t1 = (l - 442.0) * ((l < 442.0) ? 0.0624 : 0.0374);
  float t2 = (l - 599.8) * ((l < 599.8) ? 0.0264 : 0.0323);
  float t3 = (l - 501.1) * ((l < 501.1) ? 0.0490 : 0.0382);
  float x = 0.362 * exp(-0.5 * t1 * t1) + 1.056 * exp(-0.5 * t2 * t2) - 0.065 * exp(-0.5 * t3 * t3);
  float t4 = (l - 568.8) * ((l < 568.8) ? 0.0213 : 0.0247);
  float t5 = (l - 530.9) * ((l < 530.9) ? 0.0613 : 0.0322);
  float y = 0.821 * exp(-0.5 * t4 * t4) + 0.286 * exp(-0.5 * t5 * t5);
  float t6 = (l - 437.0) * ((l < 437.0) ? 0.0845 : 0.0278);
  float t7 = (l - 459.0) * ((l < 459.0) ? 0.0385 : 0.0725);
  float z = 1.217 * exp(-0.5 * t6 * t6) + 0.681 * exp(-0.5 * t7 * t7);
  return mat3(3.2406, -0.9689, 0.0557, -1.5372, 1.8758, -0.2040, -0.4986, 0.0415, 1.0570) * vec3(x, y, z);
}
/** subtraktiv mischen (Pigment: Durchlass multiplizieren), a = Deckung der oberen Farbe */
vec3 pigment(vec3 unten, vec3 farbe, float a) { return unten * mix(vec3(1.0), farbe, a); }
`;

/** Licht: Fresnel, GGX, ein Studio aus Softboxen als Umgebung (Weltrichtung, y oben) */
export const LICHT = /* glsl */ `
float fresnelS(float c, float f0) { return f0 + (1.0 - f0) * pow(1.0 - clamp(c, 0.0, 1.0), 5.0); }
float ggx(float nh, float r) { float a = r * r; float a2 = a * a; float d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (3.14159 * d * d + 1e-6); }
float softbox(vec3 d, vec3 mitte, vec3 achse, vec2 halb, float weich) {
  float c = dot(d, mitte);
  if (c <= 0.0) return 0.0;
  vec3 q = d / c - mitte;
  vec3 u = normalize(achse - mitte * dot(achse, mitte));
  vec3 v = cross(mitte, u);
  vec2 k = abs(vec2(dot(q, u), dot(q, v))) - halb;
  float r = length(max(k, 0.0)) + min(max(k.x, k.y), 0.0);
  return 1.0 - smoothstep(-weich, weich, r);
}
/** ein Fotostudio: dunkler Boden, heller Horizont, drei Softboxen, ein kalter und ein warmer Streifen */
vec3 studio(vec3 d) {
  float y = d.y;
  vec3 c = mix(vec3(0.035, 0.036, 0.04), vec3(0.16, 0.165, 0.18), smoothstep(-0.35, 0.02, y));
  c = mix(c, vec3(0.06, 0.065, 0.075), smoothstep(0.05, 0.85, y));
  c += vec3(0.55, 0.56, 0.6) * exp(-pow(y * 16.0, 2.0)) * 0.45;
  c += vec3(6.0, 5.8, 5.5) * softbox(d, normalize(vec3(-0.62, 0.55, 0.56)), vec3(0.0, 1.0, 0.0), vec2(0.42, 0.26), 0.04);
  c += vec3(2.2, 2.6, 3.4) * softbox(d, normalize(vec3(0.85, 0.28, -0.25)), vec3(0.0, 1.0, 0.0), vec2(0.12, 0.6), 0.03);
  c += vec3(3.0, 2.9, 2.8) * softbox(d, vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), vec2(0.7, 0.25), 0.08);
  c += vec3(1.6, 0.9, 0.5) * softbox(d, normalize(vec3(0.1, 0.12, -1.0)), vec3(0.0, 1.0, 0.0), vec2(0.9, 0.035), 0.02);
  return c;
}
`;

/** Druck und Zeichnung (Bildschirm-Koordinaten in Bildpunkten): Raster, Schraffur, Papier */
export const DRUCK = /* glsl */ `
mat2 drehung(float w) { float s = sin(w), c = cos(w); return mat2(c, s, -s, c); }
/** Rasterpunkt (Ben-Day/Offset): Deckung 0..1 an der Stelle p (Bildpunkte), Winkel, Rasterweite in Bildpunkten */
float raster(vec2 p, float wert, float winkel, float weite) {
  vec2 q = drehung(winkel) * p / weite;
  float spot = 0.25 * (cos(6.2831853 * q.x) + cos(6.2831853 * q.y)) + 0.5;
  float s = 1.0 - clamp(wert, 0.0, 1.0);
  float aa = max(fwidth(spot) * 0.75, 1e-4);
  return smoothstep(s - aa, s + aa, spot) * step(0.004, wert);
}
/** runder Punkt, der nicht zum Schachbrett wird (Ben-Day): Radius aus der Deckung */
float punkt(vec2 p, float wert, float winkel, float weite) {
  vec2 q = drehung(winkel) * p / weite;
  vec2 f = fract(q) - 0.5;
  float d = length(f);
  float r = sqrt(clamp(wert, 0.0, 1.0) / 3.14159) * 1.08;
  float aa = max(fwidth(d) * 0.8, 1e-4);
  return 1.0 - smoothstep(r - aa, r + aa, d);
}
/** Schraffur: Linien unter dem Winkel, Abstand in Bildpunkten, so breit wie der Wert dunkel ist */
float schraffur(vec2 p, float wert, float winkel, float abstand) {
  float y = (drehung(winkel) * p).y / abstand;
  float d = abs(fract(y) - 0.5) * 2.0;
  float b = clamp(wert, 0.0, 1.0);
  float aa = max(fwidth(y) * 2.0, 1e-4);
  return 1.0 - smoothstep(b - aa, b + aa, d);
}
/** Papierkorn um 1 (fein und grob, mit Fasern) */
float papier(vec2 p) {
  float f = noise2(p * 0.9) * 0.5 + noise2(p * 0.23) * 0.3 + noise2(p * 0.05) * 0.2;
  float faser = noise2(vec2(p.x * 0.08, p.y * 1.3)) * noise2(vec2(p.x * 1.1 + 3.0, p.y * 0.07));
  return 0.94 + 0.08 * f - 0.05 * smoothstep(0.35, 0.6, faser);
}
`;

/**
 * Netz: der Vertex-Shader aller Durchgänge über die Haut. `vWelt` (Welt), `vNormal` (Welt), `vSicht` (Sicht), `vSpiegel` für den
 * Schnitt an der Spiegelebene (wie `material.ts`), dazu der Schnitt beim Einrasten (Ebene n · p ≥ w bleibt).
 */
export const NETZ_VERTEX = /* glsl */ `
precision highp float;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
in vec3 position;
in vec3 normal;
in float aSeite;
out vec3 vWelt;
out vec3 vNormal;
out vec3 vSicht;
out vec2 vSpiegel;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWelt = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 s = viewMatrix * w;
  vSicht = s.xyz;
  vSpiegel = vec2(aSeite, position.z);
  gl_Position = projectionMatrix * s;
}
`;

/** Kopf jedes Fragment-Shaders über die Haut: Schnitte und die Normale (glatt oder je Dreieck flach) */
export const NETZ_FRAGMENT_KOPF = /* glsl */ `
precision highp float;
uniform float uSpiegel;
uniform vec4 uSchnitt;
uniform float uFlach;
uniform vec3 cameraPosition;
in vec3 vWelt;
in vec3 vNormal;
in vec3 vSicht;
in vec2 vSpiegel;
bool geschnitten() {
  if (uSpiegel >= 0.0 && vSpiegel.x * vSpiegel.y < -uSpiegel * abs(vSpiegel.x)) return true;
  return dot(uSchnitt.xyz, vWelt) < uSchnitt.w;
}
/** Normale zum Betrachter hin (auch auf der Rückseite), flach wenn „Dreiecke zeigen“ */
vec3 normaleJetzt() {
  vec3 n = uFlach > 0.5 ? normalize(cross(dFdx(vWelt), dFdy(vWelt))) : normalize(vNormal);
  if (uFlach > 0.5 && dot(n, vNormal) < 0.0) n = -n;
  return gl_FrontFacing ? n : -n;
}
`;

/** Vertex-Shader für ein Bild über die ganze Fläche (ein Dreieck) */
export const FLAECHE_VERTEX = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/** Kopf für Bilder über die ganze Fläche */
export const FLAECHE_KOPF = /* glsl */ `
precision highp float;
precision highp sampler2D;
in vec2 vUv;
uniform vec2 uAufl;
uniform float uZeit;
uniform float uDpr;
`;
