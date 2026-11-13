// GLSL der Werkstatt (Runde 2): Grund mit Tiefe, Drehteller mit Raststellen, Bullauge (Glas, Brechung am Rand, Schatten).

export const tiefenGrundFS = /* glsl */ `
precision highp float;
uniform vec2 uAufl; uniform vec3 uInnen, uAussen; uniform float uZeit;
void main(){
  vec2 uv = gl_FragCoord.xy / uAufl;
  vec2 q = (uv - vec2(0.5, 0.52)) * vec2(uAufl.x / uAufl.y, 1.0);
  float r = length(q);
  vec3 c = mix(uInnen, uAussen, smoothstep(0.05, 1.05, r));
  float n = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * 0.014;
  gl_FragColor = vec4(c, 1.0);
}`;

// Drehteller: eine Scheibe unter dem Wesen (Ebene y = Boden). Rand, Raststriche alle 45° (die Achsen länger),
// darin ein dunkler Hof. Nahe einer Achse leuchtet der Strich, auf den man zudreht.
export const tellerVS = /* glsl */ `
varying vec2 vQ;
void main(){ vQ = position.xz; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`;
export const tellerFS = /* glsl */ `
precision highp float;
uniform float uRast, uZielWinkel, uAlpha;
uniform vec3 uFarbe;
varying vec2 vQ;
void main(){
  float r = length(vQ);
  if (r > 1.03) discard;
  float aa = fwidth(r) * 1.2 + 1e-4;
  float a = atan(vQ.y, vQ.x);
  float hof = (1.0 - smoothstep(0.0, 1.0, r)) * 0.38;
  float ring = smoothstep(0.988 - aa, 0.988, r) * (1.0 - smoothstep(1.0, 1.0 + aa, r));
  float k = a / 0.78539816;
  float fk = abs(fract(k + 0.5) - 0.5) * 0.78539816 * r;
  float achse = step(mod(floor(k + 0.5), 2.0), 0.5);
  float lang = mix(0.045, 0.10, achse);
  float strich = (1.0 - smoothstep(0.0035, 0.0035 + aa, fk)) * smoothstep(0.988 - lang - aa, 0.988 - lang, r) * (1.0 - smoothstep(0.988, 0.988 + aa, r));
  float d = abs(mod(a - uZielWinkel + 3.14159265, 6.2831853) - 3.14159265);
  float ziel = (1.0 - smoothstep(0.02, 0.06, d)) * uRast;
  float linie = max(ring * 0.42, strich * (0.30 + 0.25 * achse + 0.45 * ziel));
  linie = max(linie, ziel * smoothstep(0.80, 0.86, r) * (1.0 - smoothstep(0.988, 0.988 + aa, r)) * (1.0 - smoothstep(0.0035, 0.012, fk)));
  float alpha = max(linie, hof) * uAlpha;
  vec3 c = uFarbe * (linie / max(linie + hof, 1e-4)) * (1.0 + ziel * 0.6);
  gl_FragColor = vec4(c, alpha);
}`;

// Bullauge: Bild der Ansicht in einem Kreis, am Rand leicht vergrößert (Glas), innen zum Rand hin dunkler,
// heller Ring, ein Glanzbogen oben links, darunter ein weicher Schatten.
export const linseFS = /* glsl */ `
precision highp float;
uniform sampler2D uBild; uniform vec2 uMitte; uniform float uR, uAlpha, uHell;
uniform vec3 uRand;
void main(){
  vec2 p = gl_FragCoord.xy;
  vec2 q = (p - uMitte) / uR;
  float r = length(q);
  float aa = 1.4 / uR;
  float innen = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  float schatten = (1.0 - smoothstep(0.86, 1.22, length((p - uMitte - vec2(0.0, -0.07 * uR)) / uR))) * 0.55;
  float rand = smoothstep(0.74, 1.0, r);
  vec2 qq = q * (1.0 - 0.085 * rand * rand);
  vec3 c = texture2D(uBild, qq * 0.5 + 0.5).rgb;
  c *= 1.0 - 0.30 * rand * rand;
  float ring = smoothstep(1.0 - 3.2 * aa, 1.0 - 1.2 * aa, r) * (1.0 - smoothstep(1.0 - aa * 0.6, 1.0, r));
  c = mix(c, uRand, ring * 0.9);
  float w = atan(q.y, q.x);
  float glanz = smoothstep(0.80, 0.88, r) * (1.0 - smoothstep(0.90, 0.95, r)) * (1.0 - smoothstep(0.0, 0.55, abs(w - 2.2)));
  c = mix(c, vec3(1.0), glanz * 0.5);
  c *= uHell;
  float a = innen * uAlpha;
  float sa = schatten * uAlpha * (1.0 - innen) * 0.8;
  float A = a + sa * (1.0 - a);
  gl_FragColor = vec4(c * (a / max(A, 1e-4)), A);
}`;

// Papier: Korn und Fasern, zum Rand hin etwas dunkler. Wird multipliziert (über alles, wie gedruckt).
export const kornFS = /* glsl */ `
precision highp float;
uniform vec2 uAufl; uniform float uStaerke;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wert(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  vec2 p = gl_FragCoord.xy;
  float korn = h(floor(p)) - 0.5;
  vec2 pr = mat2(0.94, 0.34, -0.34, 0.94) * p;
  float faser = wert(pr * vec2(0.035, 0.21)) * 0.5 + wert(pr.yx * vec2(0.05, 0.26)) * 0.5;
  float wolke = wert(p * 0.0045) * 0.6 + wert(p * 0.011) * 0.4;
  vec2 q = p / uAufl - 0.5;
  float rand = smoothstep(0.35, 0.95, length(q * vec2(1.0, 1.15)));
  float m = 1.0 - uStaerke * (0.026 * korn + 0.016 * faser + 0.035 * wolke) - 0.06 * rand * uStaerke;
  gl_FragColor = vec4(vec3(m), 1.0);
}`;

// ---------- Drei Platten (Risograph) ----------
// Körper einer Platte: Helligkeit (r) und Deckung (a)
export const risoKoerperFS = /* glsl */ `
precision highp float;
varying vec3 vN; varying float vBew; varying float vMaul; varying vec3 vRuhe; varying float vTiefe; varying vec3 vW;
void main(){
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 L = normalize(vec3(-0.45, 0.8, 0.4));
  float ndl = dot(N, L);
  float hell = smoothstep(-0.55, 0.85, ndl);
  hell = mix(hell, 0.15, smoothstep(0.4, 0.6, vMaul));
  gl_FragColor = vec4(hell, vBew, 0.0, 1.0);
}`;

// Platte: Fläche als Tönung, Schatten als Rasterpunkte im Winkel der Platte, Umriss satt, Korn der Farbe.
// Ausgabe wird multipliziert (wie Farbe auf Papier): Weiß = keine Farbe.
export const platteFS = /* glsl */ `
precision highp float;
uniform sampler2D uKoerper; uniform vec2 uAufl; uniform vec3 uFarbe;
uniform float uDichte, uWinkel, uZelle, uTon, uRand, uSaat;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uSaat) * 43758.5453); }
float wert(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
float deck(vec2 p){ return texture2D(uKoerper, p / uAufl).a; }
void main(){
  vec2 p = gl_FragCoord.xy;
  vec4 k = texture2D(uKoerper, vUv);
  float m = k.a;
  // Umriss: ein Nachbar außen
  float r = uRand;
  float aussen = 0.0;
  for (int i = 0; i < 8; i++) {
    float w = float(i) * 0.7853982;
    aussen = max(aussen, 1.0 - deck(p + vec2(cos(w), sin(w)) * r));
  }
  float rand = m * aussen;
  // Raster: Punkte im Winkel der Platte, Größe nach Dunkelheit
  float c = cos(uWinkel), s = sin(uWinkel);
  vec2 q = mat2(c, -s, s, c) * p / uZelle;
  vec2 f = fract(q) - 0.5;
  float dunkel = clamp(1.0 - k.r, 0.0, 1.0);
  float rp = sqrt(dunkel) * 0.66;
  float fw = 0.9 / uZelle;
  float punkt = 1.0 - smoothstep(rp - fw, rp + fw, length(f));
  float dichte = m * max(uTon, punkt) ;
  dichte = max(dichte, rand);
  // Korn: ungleichmäßige Farbe, kleine Flecken
  float korn = 0.82 + 0.28 * wert(p * 0.35) - 0.12 * step(0.985, h(floor(p * 0.5)));
  dichte *= clamp(korn, 0.0, 1.0) * uDichte;
  gl_FragColor = vec4(mix(vec3(1.0), uFarbe, clamp(dichte, 0.0, 1.0)), 1.0);
}`;

// ---------- Werft (Runde 3) ----------
// Kontur im Raum: ein schmaler Rand außen um den Umriss (aus einer Maske, 24 Proben je Bildpunkt)
export const konturFS = /* glsl */ `
precision highp float;
uniform sampler2D uMaske; uniform vec2 uAufl; uniform float uR, uAlpha; uniform vec3 uFarbe;
void main(){
  vec2 p = gl_FragCoord.xy;
  float m = texture2D(uMaske, p / uAufl).a;
  float nah = 0.0;
  for (int i = 0; i < 12; i++) {
    float w = float(i) * 0.5235988;
    vec2 o = vec2(cos(w), sin(w));
    nah = max(nah, texture2D(uMaske, (p + o * uR) / uAufl).a);
    nah = max(nah, texture2D(uMaske, (p + o * uR * 0.5) / uAufl).a);
  }
  float rand = nah * (1.0 - m);
  if (rand < 0.01) discard;
  gl_FragColor = vec4(uFarbe, rand * uAlpha);
}`;

// Fläche, in der eine Kurve gezogen wird: Glas mit feinem Raster, zum Rand hin weich
export const ebeneVS = /* glsl */ `
varying vec2 vQ;
void main(){ vQ = position.xy; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`;
export const ebeneFS = /* glsl */ `
precision highp float;
uniform vec3 uFarbe; uniform float uAlpha, uRaster; uniform vec2 uGroesse;
varying vec2 vQ;
void main(){
  vec2 q = abs(vQ);
  float rand = (1.0 - smoothstep(0.62, 1.0, q.x)) * (1.0 - smoothstep(0.62, 1.0, q.y));
  vec2 k = vQ * uGroesse / uRaster;
  vec2 f = abs(fract(k - 0.5) - 0.5) / max(fwidth(k), vec2(1e-4));
  float linie = 1.0 - min(min(f.x, f.y), 1.0);
  float a = (0.07 + 0.30 * linie) * rand * uAlpha;
  gl_FragColor = vec4(uFarbe, a);
}`;

// Boden: Scheibe mit Rand und Raststrichen, darauf der Grundriss (Draufsicht des Wesens) als Linie mit Schatten
export const bodenFS = /* glsl */ `
precision highp float;
uniform float uRast, uZielWinkel, uAlpha;
uniform vec3 uFarbe;
uniform sampler2D uGrundriss; uniform float uTexel;
varying vec2 vQ;
void main(){
  float r = length(vQ);
  if (r > 1.03) discard;
  float aa = fwidth(r) * 1.2 + 1e-4;
  float a = atan(vQ.y, vQ.x);
  float hof = (1.0 - smoothstep(0.0, 1.0, r)) * 0.22;
  float ring = smoothstep(0.988 - aa, 0.988, r) * (1.0 - smoothstep(1.0, 1.0 + aa, r));
  float k = a / 0.78539816;
  float fk = abs(fract(k + 0.5) - 0.5) * 0.78539816 * r;
  float achse = step(mod(floor(k + 0.5), 2.0), 0.5);
  float lang = mix(0.045, 0.10, achse);
  float strich = (1.0 - smoothstep(0.0035, 0.0035 + aa, fk)) * smoothstep(0.988 - lang - aa, 0.988 - lang, r) * (1.0 - smoothstep(0.988, 0.988 + aa, r));
  float d = abs(mod(a - uZielWinkel + 3.14159265, 6.2831853) - 3.14159265);
  float ziel = (1.0 - smoothstep(0.02, 0.06, d)) * uRast;
  // Grundriss
  vec2 uv = vec2(vQ.x * 0.5 + 0.5, 0.5 - vQ.y * 0.5);
  float m = texture2D(uGrundriss, uv).a;
  float e = 0.0;
  for (int i = 0; i < 8; i++) {
    float w = float(i) * 0.7853982;
    e = max(e, abs(texture2D(uGrundriss, uv + vec2(cos(w), sin(w)) * uTexel * 1.6).a - m));
  }
  float riss = smoothstep(0.2, 0.8, e);
  float schatten = m * 0.30;
  float linie = max(max(ring * 0.42, strich * (0.30 + 0.25 * achse + 0.45 * ziel)), riss * 0.7);
  float alpha = max(linie, max(hof, schatten)) * uAlpha;
  vec3 c = uFarbe * (linie / max(linie + hof + schatten, 1e-4)) * (1.0 + ziel * 0.6);
  gl_FragColor = vec4(c, alpha);
}`;
