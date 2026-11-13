// GLSL der Vision. Farben roh in sRGB (wie in /editor: keine Umrechnung in den linearen Raum).

export const FARBEN = {
  grund: [0x17, 0x13, 0x1b],
  grundHinten: [0xb3, 0xd4, 0xff],
  raum: [0x08, 0x1b, 0x25],
  petrol: [0x00, 0x3f, 0x4e],
  rosa: [0xff, 0x72, 0xa9],
  lila: [0x93, 0x6f, 0xfb],
  flieder: [0xd4, 0xb3, 0xf5],
  papier: [0xff, 0xff, 0xff],
  lavendel: [0xe6, 0xdd, 0xf4],
  jellyHell: [0x3b, 0xfc, 0xf2],
  jellyMitte: [0x00, 0xc4, 0xbb],
  jellyTief: [0x00, 0x8e, 0x89],
  tusche: [0x00, 0x3f, 0x4e],
};
export const rgb = (k) => FARBEN[k].map((x) => x / 255);

const RAUSCHEN = /* glsl */ `
float hash3(vec3 p){ p = fract(p*0.3183099+vec3(0.71,0.113,0.419)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float rauschen(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i+vec3(0,0,0)),hash3(i+vec3(1,0,0)),f.x), mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x), mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y), f.z);
}
// Dünnschicht-Interferenz (Seifenhaut): Farbe aus Schichtdicke und Blickwinkel, grob nach den Wellenlängen R/G/B
vec3 seifenhaut(float dicke, float cosT){
  float d = dicke * 2.0 * 1.33 * sqrt(max(0.0, 1.0 - (1.0-cosT*cosT)/1.77));
  vec3 wl = vec3(650.0, 532.0, 450.0);
  vec3 k = 0.5 + 0.5*cos(6.2831853 * d * 1000.0 / wl);
  return k;
}
`;

// ---------- Jelly (3D) ----------
export const jellyVS = /* glsl */ `
attribute float bewegt;
attribute float maul;
varying vec3 vN; varying vec3 vW; varying float vBew; varying float vMaul; varying vec3 vRuhe;
attribute vec3 ruhe;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position,1.0);
  vW = w.xyz; vBew = bewegt; vMaul = maul; vRuhe = ruhe;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const jellyFS = /* glsl */ `
precision highp float;
uniform vec3 uHell, uMitte, uTief, uKamera;
uniform float uZeit, uSeife, uDurchsicht;
uniform vec3 uLinse; // x,y Bildpunkt, z Halbmesser (0 = aus)
uniform vec2 uAufl;
uniform float uGeist;   // >0: Geisterbild (frühere Form) in Plattenfarbe
uniform vec3 uGeistFarbe;
uniform vec4 uEinfluss; // Mitte, Halbmesser (0 = aus)
varying vec3 vN; varying vec3 vW; varying float vBew; varying float vMaul; varying vec3 vRuhe;
${RAUSCHEN}
vec3 einflussLicht(vec3 c, vec3 w){
  if (uEinfluss.w <= 0.0) return c;
  float d = distance(w, uEinfluss.xyz) / uEinfluss.w;
  float innen = 1.0 - smoothstep(0.0, 1.0, d);
  float ring = smoothstep(0.93, 0.985, d) * (1.0 - smoothstep(0.985, 1.04, d));
  float wellen = 0.5 + 0.5 * sin(d * 18.0 - uZeit * 5.0);
  c = mix(c, c + vec3(0.30, 0.22, 0.55) * (0.5 + 0.5 * wellen), innen * innen * 0.45);
  return mix(c, vec3(0.83, 0.70, 0.96), ring * 0.9);
}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uKamera - vW);
  bool innen = !gl_FrontFacing;
  if (innen) N = -N;
  vec3 L = normalize(vec3(-0.55, 0.75, 0.45));
  float ndl = dot(N, L);
  float aa = fwidth(ndl) * 1.2 + 0.002;
  float s1 = smoothstep(-0.18 - aa, -0.18 + aa, ndl);
  float s2 = smoothstep(0.42 - aa, 0.42 + aa, ndl);
  vec3 c = mix(uTief, uMitte, s1);
  c = mix(c, uHell, s2);
  // Lava: weiche dunkle Bohnen im Innern, langsam treibend (unabhängig vom Netz, in Ruhekoordinaten)
  float lava = rauschen(vRuhe * 1.6 + vec3(0.0, uZeit * 0.05, uZeit * 0.03));
  lava = smoothstep(0.62, 0.66, lava);
  c = mix(c, c * 0.72, lava * 0.65);
  // Rand (Fresnel) etwas dunkler, dann Glanz
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  c = mix(c, uTief * 0.8, fr * 0.35);
  // Glanz wie in Florians Jelly-Vorlage: ein gebogener Strich und ein Punkt, scharf begrenzt
  vec3 H1 = normalize(L + V);
  vec3 L2 = normalize(L + vec3(0.16, -0.13, 0.02));
  vec3 H2 = normalize(L2 + V);
  vec3 L3 = normalize(L + vec3(0.30, -0.36, 0.08));
  vec3 H3 = normalize(L3 + V);
  float g1 = pow(max(dot(N, H1), 0.0), 12.0);
  float g2 = pow(max(dot(N, H2), 0.0), 12.0);
  float g3 = pow(max(dot(N, H3), 0.0), 160.0);
  float aa1 = fwidth(g1) + 0.002;
  float strichG = smoothstep(0.62 - aa1, 0.62 + aa1, g1) * (1.0 - smoothstep(0.50 - aa1, 0.50 + aa1, g2));
  float punktG = smoothstep(0.5 - fwidth(g3), 0.5 + fwidth(g3), g3);
  c = mix(c, vec3(1.0), max(strichG, punktG) * 0.92);
  // Maul innen
  c = mix(c, vec3(0.28, 0.04, 0.10), smoothstep(0.4, 0.6, vMaul));
  // Seifenhaut, wo sich die Haut gerade neu findet
  float sf = clamp(vBew * uSeife, 0.0, 1.0);
  if (sf > 0.001) {
    float dicke = 0.30 + 0.25 * rauschen(vRuhe * 2.2 + uZeit * 0.3) + vBew * 0.15;
    vec3 film = seifenhaut(dicke, max(dot(N, V), 0.05));
    film = mix(vec3(dot(film, vec3(0.333))), film, 0.75);
    c = mix(c, c * 0.55 + film * 0.6, sf * 0.42);
  }
  c = einflussLicht(c, vW);
  // halbtransparentes Jelly (Florian, 11.11.): die Wandbilder scheinen durch; Rückseiten dunkler
  float alpha = innen ? 0.55 : 0.88;
  if (innen) c = mix(uTief * 0.55, c * 0.6, 0.35);
  // Röntgenlinse: durchsichtig an einer Stelle
  if (uLinse.z > 0.0) {
    float d = distance(gl_FragCoord.xy, uLinse.xy);
    float inn = 1.0 - smoothstep(uLinse.z - 2.0, uLinse.z, d);
    alpha = mix(alpha, 0.18, inn);
    float ring = smoothstep(uLinse.z - 3.0, uLinse.z - 1.0, d) * (1.0 - smoothstep(uLinse.z, uLinse.z + 1.5, d));
    c = mix(c, vec3(1.0), ring * 0.8);
  }
  alpha *= uDurchsicht;
  if (uGeist > 0.0) { c = uGeistFarbe; alpha = uGeist * (0.25 + 0.5 * fr); }
  gl_FragColor = vec4(c, alpha);
}`;

// ---------- Papier (Seite, Front, Top): weißer Körper, zart lavendel auf der Schattenseite ----------
export const papierVS = /* glsl */ `
attribute float bewegt;
attribute float maul;
attribute vec3 ruhe;
varying vec3 vN; varying float vBew; varying float vMaul; varying vec3 vRuhe; varying float vTiefe; varying vec3 vW;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vBew = bewegt; vMaul = maul; vRuhe = ruhe;
  vW = (modelMatrix * vec4(position,1.0)).xyz;
  vec4 v = viewMatrix * modelMatrix * vec4(position,1.0);
  vTiefe = -v.z;
  gl_Position = projectionMatrix * v;
}`;

export const papierFS = /* glsl */ `
precision highp float;
uniform vec3 uPapier, uLavendel, uBlick;
uniform float uSeife, uZeit, uHinten;
uniform vec3 uPetrol;
uniform vec4 uEinfluss;
varying vec3 vN; varying float vBew; varying float vMaul; varying vec3 vRuhe; varying float vTiefe; varying vec3 vW;
${RAUSCHEN}
void main(){
  vec3 N = normalize(vN);
  vec3 L = normalize(vec3(-0.5, 0.8, 0.5));
  float ndl = dot(N, L);
  float aa = fwidth(ndl) * 1.5 + 0.002;
  float s = smoothstep(0.05 - aa, 0.05 + aa, ndl);
  vec3 c = mix(uLavendel, uPapier, s);
  // leichter Verlauf nach unten
  c *= mix(0.965, 1.0, clamp(N.y * 0.5 + 0.5, 0.0, 1.0));
  c = mix(c, vec3(0.30, 0.05, 0.12), smoothstep(0.4, 0.6, vMaul));
  float sf = clamp(vBew * uSeife, 0.0, 1.0);
  if (sf > 0.001) {
    float dicke = 0.30 + 0.25 * rauschen(vRuhe * 2.2 + uZeit * 0.3) + vBew * 0.15;
    vec3 film = seifenhaut(dicke, 0.9);
    film = mix(vec3(dot(film, vec3(0.333))), film, 0.6);
    c = mix(c, c * 0.7 + film * 0.35, sf * 0.3);
  }
  if (uEinfluss.w > 0.0) {
    float d = distance(vW, uEinfluss.xyz) / uEinfluss.w;
    float innen = 1.0 - smoothstep(0.0, 1.0, d);
    float ring = smoothstep(0.93, 0.985, d) * (1.0 - smoothstep(0.985, 1.04, d));
    c = mix(c, vec3(0.88, 0.80, 1.0), innen * innen * 0.5);
    c = mix(c, vec3(0.58, 0.44, 0.98), ring);
  }
  // von hinten: Körper Petrol (wie die Blaupause beim Wenden)
  c = mix(c, mix(uPetrol, uPetrol * 1.6, s), uHinten);
  gl_FragColor = vec4(c, 1.0);
}`;

// Maske: Tiefe (für verdeckte Linien) und Deckung
export const maskeFS = /* glsl */ `
precision highp float;
varying float vTiefe;
uniform float uNah, uFern;
void main(){
  float t = clamp((vTiefe - uNah) / (uFern - uNah), 0.0, 1.0);
  gl_FragColor = vec4(1.0, t, 0.0, 1.0);
}`;

// ---------- Sprungflutung (Abstandsfeld zur Silhouette) ----------
export const vollbildVS = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const saatFS = /* glsl */ `
precision highp float;
uniform sampler2D uMaske; uniform vec2 uAufl;
varying vec2 vUv;
void main(){
  float m = texture2D(uMaske, vUv).r;
  // Saat innen: eigene Lage; außen: keine (−1)
  gl_FragColor = m > 0.5 ? vec4(gl_FragCoord.xy, 0.0, 1.0) : vec4(-1.0, -1.0, 0.0, 1.0);
}`;

export const flutFS = /* glsl */ `
precision highp float;
uniform sampler2D uFeld; uniform vec2 uAufl; uniform float uSchritt;
varying vec2 vUv;
void main(){
  vec2 p = gl_FragCoord.xy;
  vec2 best = texture2D(uFeld, vUv).xy; float bd = best.x < 0.0 ? 1e20 : dot(best - p, best - p);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    if (x == 0 && y == 0) continue;
    vec2 q = (p + vec2(float(x), float(y)) * uSchritt) / uAufl;
    if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) continue;
    vec2 s = texture2D(uFeld, q).xy;
    if (s.x < 0.0) continue;
    float d = dot(s - p, s - p);
    if (d < bd) { bd = d; best = s; }
  }
  gl_FragColor = vec4(best, 0.0, 1.0);
}`;

// ---------- Bild der Ansicht: Grund, langer Schatten, Platten (Passer), Kontur, Körper ----------
export const illuFS = /* glsl */ `
precision highp float;
uniform sampler2D uFeldA, uFeldB, uKoerper, uMaske; // A: Grundform, B: Pose (oder dieselbe)
uniform vec2 uAufl; uniform float uPx; // Bildpunkte je Einheit Kontur (Zoom)
uniform vec3 uGrund, uPetrol, uRosa, uLila;
uniform float uKontur, uPasser, uSchatten, uHinten, uPose;
uniform float uSchattenLang; // größte Länge des langen Schattens (Bildpunkte)
varying vec2 vUv;
float abstand(sampler2D f, vec2 p){
  vec2 s = texture2D(f, p / uAufl).xy;
  if (s.x < 0.0) return 1e4;
  return length(s - p);
}
void main(){
  vec2 p = gl_FragCoord.xy;
  float K = uKontur * uPx;
  vec2 off = vec2(1.0, 1.0) * uPasser * uPx * (1.0 - 2.0 * uHinten);
  // Platten: A (rosa) aus der Grundform nach rechts oben, B (lila) aus der Pose nach links unten
  float dA = abstand(uFeldA, p - off);
  float dB = abstand(uFeldB, p + off);
  float d0 = min(abstand(uFeldA, p), abstand(uFeldB, p));
  float aa = 1.0;
  float inA = 1.0 - smoothstep(K - aa, K + aa, dA);
  float inB = 1.0 - smoothstep(K - aa, K + aa, dB);
  // langer Schatten: 2D-Strahl zur Lichtquelle (rechts oben) über das Abstandsfeld
  float sch = 0.0;
  if (uSchatten > 0.0) {
    vec2 dir = normalize(vec2(1.0, 1.0));
    float t = 0.0;
    for (int i = 0; i < 40; i++) {
      vec2 q = p + dir * t;
      float d = abstand(uFeldA, q) - K;
      if (d < 0.5) { sch = 1.0 - smoothstep(uSchattenLang * 0.55, uSchattenLang, t); break; }
      t += max(d, 1.0);
      if (t > uSchattenLang) break;
    }
  }
  vec3 grund = uGrund;
  vec3 c = mix(grund, grund * 0.62, sch * uSchatten);
  vec3 platte = inA > 0.5 && inB > 0.5 ? uPetrol : (inA > 0.5 ? uRosa : uLila);
  float deck = max(inA, inB);
  c = mix(c, platte, deck);
  // beide Platten decken: Petrol, sauber geglättet
  c = mix(c, uPetrol, min(inA, inB));
  // Körper (Pose) obenauf
  vec4 k = texture2D(uKoerper, vUv);
  c = mix(c, k.rgb, k.a);
  gl_FragColor = vec4(c, 1.0);
}`;

// ---------- Linien als Bänder ----------
export const linieVS = /* glsl */ `
attribute vec3 vor; attribute vec3 nach; attribute float seite; attribute float kante; attribute float bogen;
attribute float zustand; attribute float tusche;
uniform vec2 uAufl; uniform float uBreite, uBreiteKante;
varying float vKante; varying float vBogen; varying float vZustand; varying float vTusche; varying float vSeite; varying float vPx;
void main(){
  vec4 a = projectionMatrix * viewMatrix * vec4(position, 1.0);
  vec4 b = projectionMatrix * viewMatrix * vec4(vor, 1.0);
  vec4 c = projectionMatrix * viewMatrix * vec4(nach, 1.0);
  vec2 sa = a.xy / a.w * uAufl * 0.5, sb = b.xy / b.w * uAufl * 0.5, sc = c.xy / c.w * uAufl * 0.5;
  vec2 t = sc - sb; if (length(t) < 1e-6) t = vec2(1.0, 0.0);
  t = normalize(t);
  vec2 n = vec2(-t.y, t.x);
  float w = mix(uBreite, uBreiteKante, kante) * (1.0 + 0.6 * step(1.5, zustand));
  vec2 s = sa + n * seite * w * 0.5;
  gl_Position = vec4(s / (uAufl * 0.5) * a.w, a.z - 0.0008 * a.w, a.w);
  vKante = kante; vBogen = bogen; vZustand = zustand; vTusche = tusche; vSeite = seite; vPx = w;
}`;

export const linieFS = /* glsl */ `
precision highp float;
uniform vec3 uFarbe, uWahl, uHell; uniform float uVerdeckt, uStrich, uAlpha, uZeit;
uniform sampler2D uTiefe; uniform float uMitTiefe; uniform vec2 uAufl; uniform vec4 uRect;
varying float vKante; varying float vBogen; varying float vZustand; varying float vTusche; varying float vSeite; varying float vPx;
void main(){
  // Strichelung nur, wo keine Kante ist
  float strich = step(0.5, fract(vBogen * uStrich));
  float voll = max(step(0.5, vKante), strich);
  float a = mix(0.85, 1.0, vKante) * voll;
  // Rand weich
  a *= 1.0 - smoothstep(0.55, 1.0, abs(vSeite));
  vec3 c = uFarbe;
  // Tusche, die gerade fließt
  c = mix(c, uHell, vTusche * 0.6);
  if (vZustand > 1.5) c = uWahl;            // gewählt
  else if (vZustand > 0.5) c = mix(c, uWahl, 0.55); // Nähe
  a *= uAlpha * mix(1.0, uVerdeckt, 0.0);
  if (a < 0.02) discard;
  gl_FragColor = vec4(c, a);
}`;

// ---------- Punkte, Griffspitzen, Perlen als Bildpunkt-Scheiben ----------
export const punktVS = /* glsl */ `
attribute vec3 mitte; attribute float groesse; attribute float zustand; attribute vec2 ecke;
uniform vec2 uAufl; uniform float uSkala;
varying vec2 vE; varying float vZustand; varying float vGr;
void main(){
  vec4 a = projectionMatrix * viewMatrix * vec4(mitte, 1.0);
  vec2 s = a.xy / a.w + ecke * groesse * uSkala / (uAufl * 0.5);
  gl_Position = vec4(s * a.w, a.z - 0.0015 * a.w, a.w);
  vE = ecke; vZustand = zustand; vGr = groesse * uSkala;
}`;

export const punktFS = /* glsl */ `
precision highp float;
uniform vec3 uFarbe, uWahl, uHell; uniform float uZeit;
uniform vec3 uLampe; // Taschenlampe: Bildpunkt x, y und Halbmesser (0 = aus); außerhalb nur ein Hauch
varying vec2 vE; varying float vZustand; varying float vGr;
void main(){
  float r = length(vE);
  float lampe = 1.0;
  if (uLampe.z > 0.0 && (vZustand < 0.5 || (vZustand > 4.5 && vZustand < 5.5))) {
    float d = distance(gl_FragCoord.xy, uLampe.xy);
    lampe = mix(0.16, 1.0, 1.0 - smoothstep(uLampe.z * 0.45, uLampe.z, d));
  }
  float aa = 1.5 / max(vGr, 1.0);
  // 0 Punkt, 1 Nähe, 2 gewählt, 3 Griffspitze, 4 Perle (neuer Punkt), 5 Zwilling, 6 verweigert
  vec3 c; float a;
  if (vZustand > 3.5 && vZustand < 4.5) {
    float ring = smoothstep(0.55 - aa, 0.55, r) * (1.0 - smoothstep(0.85, 0.85 + aa, r));
    float kern = 1.0 - smoothstep(0.25, 0.25 + aa, r);
    c = uWahl; a = max(ring, kern) * (0.75 + 0.25 * sin(uZeit * 8.0));
  } else if (vZustand > 2.5 && vZustand < 3.5) {
    float ring = smoothstep(0.5 - aa, 0.5, r) * (1.0 - smoothstep(0.95, 0.95 + aa, r));
    c = uFarbe; a = ring;
  } else {
    float saum = 1.0 - smoothstep(1.0 - aa, 1.0, r);
    float kern = 1.0 - smoothstep(0.62 - aa, 0.62, r);
    c = mix(uHell, uFarbe, kern);
    if (vZustand > 1.5 && vZustand < 2.5) c = mix(uHell, uWahl, kern);
    if (vZustand > 4.5 && vZustand < 5.5) c = mix(uHell, uWahl * 0.8 + 0.2, kern);
    a = saum;
  }
  a *= lampe;
  if (a < 0.02) discard;
  gl_FragColor = vec4(c, a);
}`;

// ---------- Wand im Raum: Bild der Ansicht, mit Kante und leichtem Vignettieren ----------
export const wandVS = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`;
export const wandFS = /* glsl */ `
precision highp float;
uniform sampler2D uBild; uniform float uHell, uAlpha;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(uBild, vUv).rgb;
  vec2 q = abs(vUv - 0.5) * 2.0;
  float rand = smoothstep(0.985, 1.0, max(q.x, q.y));
  c = mix(c, c * 1.6 + 0.05, rand * 0.6);
  gl_FragColor = vec4(c * uHell, uAlpha);
}`;

// ---------- Strahlen (Ordnungslinien) ----------
export const strahlFS = /* glsl */ `
precision highp float;
uniform vec3 uFarbe; uniform float uAlpha, uZeit;
varying float vKante; varying float vBogen; varying float vZustand; varying float vTusche; varying float vSeite; varying float vPx;
void main(){
  float a = (1.0 - smoothstep(0.2, 1.0, abs(vSeite))) * uAlpha;
  float puls = 0.65 + 0.35 * sin(vBogen * 30.0 - uZeit * 6.0);
  gl_FragColor = vec4(uFarbe * (0.8 + 0.4 * puls), a * puls);
}`;

// ---------- Spiegelglas ----------
export const glasFS = /* glsl */ `
precision highp float;
uniform float uAlpha, uZeit; uniform vec3 uFarbe;
varying vec2 vUv;
${RAUSCHEN}
void main(){
  vec2 q = vUv * 6.0;
  float k = rauschen(vec3(q, uZeit * 0.6)) + 0.5 * rauschen(vec3(q * 2.3, uZeit * 0.9 + 3.0));
  float licht = smoothstep(0.95, 1.15, k);
  vec2 r = abs(vUv - 0.5) * 2.0;
  float rand = 1.0 - smoothstep(0.6, 1.0, max(r.x, r.y));
  gl_FragColor = vec4(uFarbe, uAlpha * rand * (0.10 + 0.55 * licht));
}`;
