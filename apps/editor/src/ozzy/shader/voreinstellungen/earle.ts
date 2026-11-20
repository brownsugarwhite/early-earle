/**
 * Earle-Haut und Earle-Schuppen (Materialien; Florian: „haut und schuppen im eyvind earle look“). Nach der Recherche
 * `docs/research/style-eyvind-earle-realtime.md`: Earles Siebdrucke sind Stapel flacher, hart begrenzter Farbschichten (Licht in Stufen,
 * keine Verläufe); die Sonne steht tief (rund 11°), Schatten sind messerscharfe, tintendunkle Formen, die mit der Schattenseite zu einer
 * Fläche verschmelzen; Juwelfarben in verwandten Tönen (Lapisblau, Gelbgrün, Muschelrosa, Blassblau), nie reines Schwarz, sondern
 * getöntes Fast-Schwarz; im vollen Licht verschwinden die Einzelheiten, dafür Tausende kleiner heller Punkte; gotische Senkrechte.
 * Bühne: Himmel in Stufen wie ein Siebdruck, flache Wolkenbänder, Hügelsilhouetten.
 */
import { bildVoreinstellung } from '../bildShader';
import type { Voreinstellung } from '../kern';

const GEMEINSAM = /* glsl */ `
vec3 earleStufe(int i, float palette) {
  // getöntes Fast-Schwarz, Tiefe, Mitte, Licht, Spitzlicht; Palette 0: Wald (Türkis-Grün-Gold), 1: Rose (Lapis-Rosa-Muschel)
  vec3 w[5] = vec3[5](vec3(0.05, 0.07, 0.09), vec3(0.05, 0.22, 0.25), vec3(0.18, 0.4, 0.3), vec3(0.6, 0.66, 0.3), vec3(0.93, 0.88, 0.6));
  vec3 r[5] = vec3[5](vec3(0.07, 0.05, 0.11), vec3(0.12, 0.16, 0.38), vec3(0.42, 0.3, 0.52), vec3(0.88, 0.58, 0.6), vec3(0.98, 0.88, 0.82));
  return mix(w[i], r[i], palette);
}
vec3 earleHimmel(vec2 qb, vec2 css, float palette) {
  float stufe = floor(clamp(qb.y * 6.0, 0.0, 5.0));
  vec3 unten = mix(vec3(0.95, 0.86, 0.62), vec3(0.98, 0.82, 0.78), palette);
  vec3 oben = mix(vec3(0.16, 0.3, 0.42), vec3(0.18, 0.2, 0.42), palette);
  vec3 c = mix(unten, oben, stufe / 5.0);
  // flache Wolkenbänder
  float band = step(0.5, fract(qb.y * 9.0 + 0.3 * sin(qb.x * 3.0))) * step(0.55, qb.y) * step(0.62, noise2(vec2(qb.x * 3.0, floor(qb.y * 9.0))));
  c = mix(c, mix(c, vec3(1.0), 0.25), band);
  // Hügel: weiche Silhouetten in Stufen
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float h = 0.22 - fi * 0.06 + 0.05 * sin(qb.x * (2.0 + fi) + fi * 2.0) + 0.02 * sin(qb.x * 9.0 + fi);
    c = mix(c, earleStufe(2 - i, palette) * (0.8 + 0.1 * fi), step(qb.y, h));
  }
  // Senkrechte Stämme
  float stamm = step(0.985, noise2(vec2(css.x * 0.09, 0.0))) * step(qb.y, 0.4);
  c = mix(c, earleStufe(0, palette), stamm);
  return c;
}
/** Lichtwert in Earles Stufen: tiefe Sonne von der Seite, Schattenseite und Schlagschatten als eine Fläche */
int earleLicht(vec3 n, vec3 p, out float v) {
  vec3 L = ausSicht(normalize(vec3(-0.96, 0.19, 0.2)));
  v = dot(n, L);
  if (v < 0.0) return 0;
  if (v < 0.18) return 1;
  if (v < 0.45) return 2;
  if (v < 0.75) return 3;
  return 4;
}
`;

const HAUT_FRAGMENT = /* glsl */ `
${GEMEINSAM}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = earleHimmel(qb, css, uR_palette);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    float v;
    vec3 q = (g.p - uMitte) / uRadius;
    // Licht in Stufen, die Grenzen leicht gewellt wie geschnittene Schablonen
    int stufe = earleLicht(normalize(g.n + 0.04 * vec3(snoise(q * 6.0), snoise(q * 6.0 + 3.0), 0.0)), g.p, v);
    vec3 c = earleStufe(stufe, uR_palette);
    // gotische Senkrechte in den mittleren Stufen (Riefen um die Hochachse)
    float winkel = atan(q.z, q.x);
    float riefe = step(0.82, fract(winkel * 18.0 / 6.2831853 * uR_riefen + 0.3 * snoise(q * 2.0)));
    if (stufe == 1 || stufe == 2) c = mix(c, earleStufe(stufe - 1, uR_palette), riefe * 0.85);
    // Lichtpunkte im vollen Licht und auf der Grenze (an der Form verankert)
    vec2 anker = insBild(uMitte) * uAufl / uDpr;
    vec2 pp = (css - anker) / 3.2;
    vec2 z = floor(pp);
    vec2 f = fract(pp) - 0.5 - (hash22(z) - 0.5) * 0.5;
    float lp = (1.0 - smoothstep(0.16, 0.24, length(f))) * step(0.55, hash12(z));
    if (stufe >= 2) c = mix(c, earleStufe(4, uR_palette), lp * (stufe == 4 ? 0.5 : 0.85) * uR_punkte);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  float linie = kanteBei(vUv, 0.7 * uDpr);
  bild = mix(bild, earleStufe(0, uR_palette), linie);
  a = max(a, linie);
  farbe = vec4(bild * a, a);
}
`;

const SCHUPPEN_FRAGMENT = /* glsl */ `
${GEMEINSAM}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = earleHimmel(qb, css, uR_palette);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    float v;
    vec3 q = (g.p - uMitte) / uRadius;
    int stufe = earleLicht(g.n, g.p, v);
    // Schuppen: Zylinder um die Hochachse, Reihen versetzt, jede Schuppe ein Bogen nach unten
    float u = atan(q.z, q.x) / 6.2831853 * 26.0 * uR_groesse;
    float w = q.y * 7.0 * uR_groesse;
    float reihe = floor(w);
    float uu = u + 0.5 * mod(reihe, 2.0);
    vec2 zelle = vec2(floor(uu), reihe);
    vec2 f = vec2(fract(uu) - 0.5, fract(w));
    // Abstand zum Bogen der Schuppe darüber deckt den oberen Teil
    float r = length(vec2(f.x, (f.y - 1.0) * 1.1));
    float drin = 1.0 - smoothstep(0.62, 0.66, r);
    float sichel = smoothstep(0.5, 0.56, r) * (1.0 - smoothstep(0.6, 0.63, r));
    // Farbe der Schuppe: ihre Stufe, dazu ein Schimmer je Schuppe
    int s = stufe;
    float jitter = hash12(zelle);
    if (jitter > 0.85 && s < 4) s += 1;
    vec3 c = earleStufe(s, uR_palette);
    // Gold auf jeder dritten Schuppe in der Mitte
    float gold = step(0.66, hash12(zelle + 9.0)) * (1.0 - smoothstep(0.08, 0.12, length(f - vec2(0.0, 0.42))));
    c = mix(c, vec3(0.86, 0.68, 0.28), gold * step(1.5, float(s)));
    // heller Bogen oben (Licht auf der Kante), dunkle Fuge unten
    c = mix(c, earleStufe(min(s + 1, 4), uR_palette), sichel * step(1.0, float(s)));
    c = mix(c, earleStufe(0, uR_palette), (1.0 - drin) * 0.9);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  float linie = kanteBei(vUv, 0.8 * uDpr);
  bild = mix(bild, earleStufe(0, uR_palette), linie);
  a = max(a, linie);
  farbe = vec4(bild * a, a);
}
`;

export const EARLE_HAUT: Voreinstellung = bildVoreinstellung({
  id: 'earleHaut',
  name: 'Earle-Haut',
  gruppe: 'Materialien',
  zeile: 'Eyvind Earle: Licht in harten Siebdruck-Stufen, tiefe Sonne, getöntes Fast-Schwarz, gotische Riefen, Lichtpunkte',
  regler: [
    { k: 'palette', name: 'Wald / Rose', min: 0, max: 1, schritt: 0.01, grund: 0 },
    { k: 'riefen', name: 'Riefen', min: 0.3, max: 3, schritt: 0.05, grund: 1 },
    { k: 'punkte', name: 'Lichtpunkte', min: 0, max: 1, schritt: 0.05, grund: 1 },
  ],
  fragment: HAUT_FRAGMENT,
  unruhig: () => false,
});

export const EARLE_SCHUPPEN: Voreinstellung = bildVoreinstellung({
  id: 'earleSchuppen',
  name: 'Earle-Schuppen',
  gruppe: 'Materialien',
  zeile: 'Eyvind Earle: Schuppen wie ein Wandteppich, jede in ihrer Lichtstufe, heller Bogen, dunkle Fuge, Gold, Juwelfarben',
  regler: [
    { k: 'palette', name: 'Wald / Rose', min: 0, max: 1, schritt: 0.01, grund: 0 },
    { k: 'groesse', name: 'Schuppen', min: 0.4, max: 3, schritt: 0.05, grund: 1 },
  ],
  fragment: SCHUPPEN_FRAGMENT,
  unruhig: () => false,
});
