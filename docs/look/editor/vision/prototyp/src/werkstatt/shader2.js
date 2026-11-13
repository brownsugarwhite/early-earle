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
