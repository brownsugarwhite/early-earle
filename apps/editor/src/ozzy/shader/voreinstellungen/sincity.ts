/**
 * Sin City (Runde 9; Florian: „und auch 3 materialien die frank millers sin city als inspiration nutzen“). Recherche
 * `docs/research/2026-11-21-runde-9-recherche.md`, Abschnitt 2. Die Grammatik als Kern „Tusche“:
 * 1. Zwei Werte: Papier #f4f1e8 und Tusche #0a0a0a; die Schwelle liegt auf dem Licht; Miller zeichnet die Schatten, das Papier ist Licht.
 * 2. Ein hartes Licht und ein Randlicht; die Schattenseite verschmilzt mit dem schwarzen Grund, eine Kontur trennt die Form.
 * 3. Die Linie ist das Gegenteil ihres Grundes: über Schwarz weiß, über Weiß schwarz.
 * 4. Pinselkante: die Schwelle mit Rauschen gestört, gestreckt wie ein trockener Pinsel.
 * 5. Regen in schrägen Strichen (78°), per Umkehr: weiß über Schwarz, schwarz über Weiß; Schauer statt gleichmäßigem Rauschen.
 * 6. Höchstens eine Schmuckfarbe, immer auf einem Gegenstand, nie als Tönung des Bilds.
 * - **Sin City Regen** (The Hard Goodbye): die Form schwarz, hartes Schlaglicht, weiße Pflasterkreuze auf der Haut, Regen mit
 *   Spritzkronen oben.
 * - **Sin City Gelb** (That Yellow Bastard): die Haut ist die Schmuckfarbe (#e6c61f), Schatten tiefschwarz, fettiger Glanz in harten
 *   Flecken (#fff6c2), große flache Beulen; Schnee im Grund.
 * - **Sin City Rot** (das rote Kleid): roter Satin (#d0021b, Mitte #8e0014, Schatten schwarz), Falten längs der Schwerkraft, Glanz als
 *   lange weiße Bahnen auf den Kämmen, scharfe schwarze Faltenlinien.
 */
import { bildVoreinstellung } from '../bildShader';

const TUSCHE = /* glsl */ `
const vec3 PAPIER = vec3(0.957, 0.945, 0.91);
const vec3 TUSCHE = vec3(0.039);
/** Pinselkante: Rauschen, gestreckt wie ein trockener Pinsel */
float pinsel(vec2 css) {
  return snoise(vec3(css.x * 0.011, css.y * 0.08, 1.0)) * 0.6 + snoise(vec3(css.x * 0.05, css.y * 0.32, 2.0)) * 0.4;
}
/** Regen im Bild: schräge Striche (78°), Längen gestreut, Dichte in Schauern; 1 auf einem Strich */
float regen(vec2 css, float dichte) {
  vec2 r = drehung(0.21) * css;
  float sp = 10.0;
  float spalte = floor(r.x / sp);
  float h = hash11(spalte * 1.37 + 0.5);
  float y = r.y + uZeit * (900.0 + 500.0 * h) + h * 997.0;
  float zelle = floor(y / 150.0);
  float hz = hash12(vec2(spalte, zelle));
  float laenge = 18.0 + 70.0 * hz;
  float fy = fract(y / 150.0) * 150.0;
  float xm = (hash12(vec2(spalte, zelle + 7.0)) - 0.5) * 6.0;
  float dx = abs(fract(r.x / sp) * sp - sp * 0.5 - xm);
  return step(fy, laenge) * (1.0 - smoothstep(0.45 * uDpr, 1.0 * uDpr, dx)) * step(1.0 - dichte, hz);
}
/** Schnee: große unscharfe Flocken nah, kleine scharfe fern; Wert 0 … 1 */
float schnee(vec2 css) {
  float s = 0.0;
  for (int i = 0; i < 2; i++) {
    float gr = i == 0 ? 90.0 : 26.0;
    vec2 p = css / gr + vec2(sin(uZeit * 0.3 + float(i)) * 0.3, uZeit * (i == 0 ? 0.9 : 0.45));
    vec2 c = floor(p);
    vec2 o = hash22(c + float(i) * 13.0);
    float d = length(fract(p) - o);
    float r = i == 0 ? 0.12 : 0.07;
    float weich = i == 0 ? 0.08 : 0.02;
    s = max(s, (1.0 - smoothstep(r, r + weich, d)) * step(0.55, hash12(c + 3.7 + float(i))));
  }
  return s;
}
`;

function sinCity(art: 0 | 1 | 2): string {
  return /* glsl */ `
${TUSCHE}
const int ART = ${art};
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 css = gl_FragCoord.xy / uDpr;
  float pin = pinsel(css);
  // Grund: schwarz (die Schattenseite der Form verschmilzt mit ihm)
  vec3 c = TUSCHE;
  float wert = 0.0;
  bool farbig = false;
  vec3 schmuck = vec3(0.0);
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    vec3 n = n0;
    if (ART == 1) {
      // große, flache Beulen
      vec3 b = vec3(snoise(q * 2.6), snoise(q * 2.6 + 5.0), snoise(q * 2.6 + 9.0));
      n = normalize(n0 + 0.32 * (b - n0 * dot(b, n0)));
    }
    float falte = 0.0;
    if (ART == 2) {
      // Satin: Falten längs der Schwerkraft
      vec3 quer = cross(vec3(0.0, 1.0, 0.0), n0);
      quer = length(quer) > 0.05 ? normalize(quer) : vec3(1.0, 0.0, 0.0);
      float f = (q.x * 0.8 + q.z * 0.6) * 15.0 * ${art === 2 ? 'uR_falten' : '1.0'} + 2.2 * snoise(q * vec3(1.4, 0.35, 1.4)) + 0.6 * q.y;
      n = normalize(n0 + quer * cos(f) * 0.55);
      falte = 1.0 - smoothstep(0.0, 0.05 + 0.03 * pin, abs(fract(f / 6.2831853) - 0.75));
    }
    vec3 L = ausSicht(normalize(vec3(-0.6, 0.7, 0.35)));
    vec3 Lr = ausSicht(normalize(vec3(0.75, 0.15, -0.6)));
    float licht = dot(n, L);
    float nv = clamp(dot(n, V), 0.0, 1.0);
    float schwelle = ART == 0 ? 0.42 : (ART == 1 ? 0.18 : 0.5);
    float hell = step(schwelle + 0.14 * pin, licht);
    float rand = step(0.7 + 0.08 * pin, 1.0 - nv) * step(0.05, dot(n0, Lr));
    wert = max(hell, rand);
    if (ART == 0) {
      // weiße Pflasterkreuze auf der Haut (seitlich)
      vec2 pk = vec2(q.x, q.y);
      for (int i = 0; i < 3; i++) {
        vec2 m = vec2(-0.35 + 0.42 * float(i), 0.15 - 0.22 * float(i == 1));
        vec2 d = drehung(0.4 + float(i)) * (pk - m);
        float s1 = step(abs(d.x), 0.06) * step(abs(d.y), 0.018);
        float s2 = step(abs(d.y), 0.06) * step(abs(d.x), 0.018);
        wert = max(wert, max(s1, s2) * step(0.35, abs(n0.z)));
      }
      // Spritzkronen, wo die Normale nach oben zeigt
      vec2 kz = floor(css / 22.0);
      vec2 ko = fract(css / 22.0) - 0.5;
      float blink = step(0.8, hash12(kz + floor(uZeit * 8.0)));
      float krone = blink * step(0.75, n0.y) * (1.0 - smoothstep(0.0, 0.08, abs(length(ko * vec2(1.0, 2.2)) - 0.22))) * step(0.0, ko.y);
      wert = max(wert, krone);
    }
    if (ART == 1) {
      farbig = true;
      schmuck = hell > 0.5 ? vec3(0.902, 0.776, 0.122) : TUSCHE;
      // fettiger Glanz in harten Flecken
      vec3 H = normalize(L + V);
      float gl = step(0.965 + 0.01 * pin, dot(n, H));
      schmuck = mix(schmuck, vec3(1.0, 0.965, 0.761), gl);
      schmuck = mix(schmuck, PAPIER, rand * (1.0 - hell));
    }
    if (ART == 2) {
      farbig = true;
      float mitte = step(0.12 + 0.1 * pin, licht);
      schmuck = hell > 0.5 ? vec3(0.816, 0.008, 0.106) : (mitte > 0.5 ? vec3(0.557, 0.0, 0.078) : TUSCHE);
      // Glanz als lange weiße Bahnen auf den Kämmen, scharfe schwarze Faltenlinien
      float bahn = step(0.9 + 0.04 * pin, dot(reflect(-L, n), V));
      schmuck = mix(schmuck, PAPIER, bahn);
      schmuck = mix(schmuck, TUSCHE, falte * (1.0 - bahn));
      schmuck = mix(schmuck, PAPIER, rand * (1.0 - hell));
    }
  }
  if (g.a < 0.5 && uBuehne < 0.5 && maske < 0.01) {
    farbe = vec4(0.0);
    return;
  }
  // Grund: Schnee (Gelb), sonst schwarz; Regen in Schauern
  float grundW = 0.0;
  if (ART == 1 && g.a < 0.5) grundW = schnee(css) * uR_wetter;
  float w = g.a > 0.5 ? wert : grundW;
  vec3 col = farbig && g.a > 0.5 ? schmuck : mix(TUSCHE, PAPIER, w);
  // die Kontur: im Bild gleich breit, das Gegenteil ihres Grundes
  float kontur = kanteBei(vUv, 1.7 * uDpr);
  float grundHell = farbig && g.a > 0.5 ? step(0.35, dot(schmuck, vec3(0.3, 0.55, 0.15))) : w;
  col = mix(col, mix(PAPIER, TUSCHE, grundHell), kontur);
  // Regen: per Umkehr (weiß über Schwarz, schwarz über Weiß)
  if (ART != 1) {
    float dichte = (0.18 + 0.22 * smoothstep(-0.3, 0.6, snoise(vec3(css * 0.0025, uZeit * 0.25)))) * uR_wetter;
    float rg = regen(css, dichte);
    float hellHier = step(0.35, dot(col, vec3(0.3, 0.55, 0.15)));
    col = mix(col, mix(PAPIER, TUSCHE, hellHier), rg);
  }
  float a = uBuehne > 0.5 ? 1.0 : maske;
  farbe = vec4(col * a, a);
}
`;
}

export const SIN_CITY_REGEN = bildVoreinstellung({
  id: 'sinCityRegen',
  name: 'Sin City Regen',
  gruppe: 'Sin City',
  zeile: 'Nur Tusche und Papier: die Form schwarz im harten Schlaglicht, weiße Kontur, weiße Pflasterkreuze auf der Haut, Regen in schrägen Strichen, weiß über Schwarz und schwarz über Weiß, Spritzkronen oben',
  regler: [{ k: 'wetter', name: 'Regen', min: 0, max: 2, schritt: 0.05, grund: 1 }],
  fragment: sinCity(0),
  unruhig: () => true,
});
export const SIN_CITY_GELB = bildVoreinstellung({
  id: 'sinCityGelb',
  name: 'Sin City Gelb',
  gruppe: 'Sin City',
  zeile: 'That Yellow Bastard: die Haut als einzige Farbe, kränkliches Gelb im Licht, tiefschwarz im Schatten, fettiger Glanz in harten Flecken, flache Beulen; Schnee im schwarzen Grund',
  regler: [{ k: 'wetter', name: 'Schnee', min: 0, max: 2, schritt: 0.05, grund: 1 }],
  fragment: sinCity(1),
  unruhig: () => true,
});
export const SIN_CITY_ROT = bildVoreinstellung({
  id: 'sinCityRot',
  name: 'Sin City Rot',
  gruppe: 'Sin City',
  zeile: 'Das rote Kleid: roter Satin als einzige Farbe in drei harten Stufen bis Schwarz, Falten längs der Schwerkraft mit scharfen schwarzen Linien, Glanz als lange weiße Bahnen, Regen',
  regler: [
    { k: 'falten', name: 'Falten', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'wetter', name: 'Regen', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ],
  fragment: sinCity(2),
  unruhig: () => true,
});
