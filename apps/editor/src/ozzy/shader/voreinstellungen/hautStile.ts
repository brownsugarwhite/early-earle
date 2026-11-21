/**
 * Stile für Häute (Runde 6; Florian: „mehr Hautshader im manga, anime und spider-verse look“): eine Haut liefert ihre Farbe ohne
 * Licht, ihre Normale mit Relief, wie hoch ein Punkt auf seiner Schuppe liegt, ob er in einer Fuge liegt, wie weit er vom Rand seiner
 * Schuppe entfernt ist und wie sie glänzt (`Haut`); die Stile zeichnen daraus das Bild. Für den T-Rex und die neuen Häute (Drache,
 * Frosch, Chamäleon, Krake).
 *
 * - **Echt:** Licht wie im Studio (Hauptlicht warm, Gegenlicht, Himmel), weiche Streuung am Schattenrand, Glanz nach Rauheit.
 * - **Anime:** zwei Töne mit harter Grenze nach der glatten Form (Guilty Gear Xrd: Licht ist an oder aus, Rauschen stört, die
 *   Schuppen zeichnen nur Linien), Glanz als scharfe weiße Form, Randlicht, Linien an den Schuppen in dunkler Eigenfarbe.
 * - **Manga:** Schwarz und Weiß: dunkle Farben schwarz, mittlere als Rasterfolie, Schatten als Federstriche, Schuppenränder als
 *   Federlinien auf der Schattenseite, Glanz weiß ausgespart.
 * - **Spider-Verse:** zwei kräftige Töne, Raster im Halbschatten, Schraffur im Kernschatten, Schuppen als Tuschebögen, Glanz als
 *   weiße Form, farbiges Randlicht.
 */

export const HAUT_STILE = /* glsl */ `
struct Haut {
  vec3 farbe;
  vec3 n;
  float hoehe;
  float fuge;
  float rand;
  float glanz;
  float rauh;
  float lod;
  /** Runde 8: Licht, das die Haut selbst abgibt (Glut in den Fugen; linear, HDR), und Schiller einer dünnen Schicht (0 … 1) */
  vec3 leucht;
  float schiller;
};
/** Farbe einer dünnen Schicht (Interferenz, genähert): sie dreht mit dem Blickwinkel */
vec3 duennschicht(float nv, float versatz) {
  return 0.5 + 0.5 * cos(6.2831853 * (vec3(0.0, 0.33, 0.67) + (1.0 - nv) * 1.35 + versatz));
}
vec3 hautLicht() { return ausSicht(normalize(vec3(-0.55, 0.65, 0.52))); }
vec3 hautRandLicht() { return ausSicht(normalize(vec3(0.75, 0.3, -0.6))); }
/** Echt: Hauptlicht, Himmel, Gegenlicht, weiche Streuung am Schattenrand, Glanz (Ergebnis linear) */
vec3 hautEcht(Haut h, vec3 n0, vec3 V) {
  vec3 alb = srgbZuLin(h.farbe) * (1.0 - 0.5 * h.fuge);
  vec3 L = hautLicht(), Lr = hautRandLicht();
  float nl = dot(h.n, L);
  float diff = clamp((nl + 0.1) / 1.1, 0.0, 1.0);
  float sss = smoothstep(-0.25, 0.05, nl) * (1.0 - smoothstep(0.05, 0.35, nl));
  vec3 c = alb * vec3(1.0, 0.95, 0.88) * 2.1 * diff + alb * vec3(0.7, 0.25, 0.15) * sss * 0.3;
  c += alb * mix(vec3(0.12, 0.11, 0.1), vec3(0.3, 0.34, 0.45), h.n.y * 0.5 + 0.5) * 0.6 * (1.0 - 0.6 * h.fuge);
  float nv = clamp(dot(n0, V), 0.0, 1.0);
  c += vec3(0.9, 0.95, 1.0) * pow(1.0 - nv, 3.0) * smoothstep(-0.1, 0.4, dot(n0, Lr)) * (0.2 + alb);
  vec3 H = normalize(L + V);
  vec3 irid = mix(vec3(1.0), duennschicht(clamp(dot(h.n, V), 0.0, 1.0), h.hoehe * 0.35) * 1.7, h.schiller);
  // Runde 9: der Schiller liegt auch im Glanz (Schlangenhaut), nicht nur am Rand
  c += vec3(1.0, 0.97, 0.92) * 2.1 * ggx(max(dot(h.n, H), 0.0), h.rauh) * fresnelS(max(dot(H, V), 0.0), 0.04) * max(nl, 0.0) * h.glanz * irid;
  c += studio(reflect(-V, h.n)) * fresnelS(nv, 0.04) * h.glanz * 0.12 * (1.0 - h.rauh) * irid;
  c += (alb + 0.04) * irid * pow(1.0 - nv, 2.0) * h.schiller * 0.35 + irid * pow(1.0 - nv, 2.2) * 0.16 * h.schiller * h.schiller * h.glanz;
  c += h.leucht;
  return c;
}
/** Anime: zwei Töne nach der glatten Form, Glanz als weiße Form, Randlicht, Schuppenlinien in dunkler Eigenfarbe (sRGB) */
vec3 hautAnime(Haut h, vec3 n0, vec3 V) {
  vec3 L = hautLicht();
  float v = dot(normalize(mix(n0, h.n, 0.2)), L);
  float aa = fwidth(v) + 1e-3;
  float licht = smoothstep(0.08 - aa, 0.08 + aa, v);
  vec3 sat = clamp(mix(vec3(dot(h.farbe, vec3(0.299, 0.587, 0.114))), h.farbe, 1.3) * 1.12, 0.0, 1.0);
  vec3 c = mix(sat * vec3(0.6, 0.57, 0.84), sat, licht);
  // Schuppenlinien: auf der vom Licht abgewandten Seite jeder Schuppe, im Schatten kräftiger
  float aaR = fwidth(h.rand) + 1e-3;
  float abgewandt = smoothstep(0.0, 0.15, dot(n0, L) - dot(h.n, L));
  float linie = (1.0 - smoothstep(0.03 - aaR, 0.03 + aaR, h.rand)) * mix(0.35, 1.0, abgewandt) * h.lod;
  c = mix(c, sat * vec3(0.3, 0.26, 0.42), linie * mix(0.55, 0.9, 1.0 - licht));
  // Glanz: scharfe weiße Form, groß auf glatten Häuten
  float g = dot(normalize(mix(n0, h.n, 0.35)), normalize(L + V));
  float grenze = mix(0.985, 0.93, clamp(h.glanz * 0.5, 0.0, 1.0));
  c = mix(c, vec3(1.0), smoothstep(grenze, grenze + 0.006, g) * step(0.15, h.glanz));
  float rim = smoothstep(0.62, 0.68, 1.0 - max(dot(n0, V), 0.0)) * step(0.1, dot(n0, hautRandLicht()));
  c = mix(c, vec3(1.0, 0.97, 0.9), rim * 0.8);
  return min(c + h.leucht * 0.45, vec3(1.0));
}
/** Manga: Schwarz und Weiß (sRGB) */
vec3 hautManga(Haut h, vec3 n0, vec3 V, vec2 css) {
  vec3 L = hautLicht();
  float v = dot(normalize(mix(n0, h.n, 0.25)), L);
  float wert = dot(h.farbe, vec3(0.299, 0.587, 0.114));
  float g = 0.97;
  if (wert < 0.2) g = 0.05;
  else g = mix(g, 0.05, punkt(css, clamp((0.78 - wert) * 0.75, 0.0, 0.62), radians(45.0), 4.2));
  float schatt = 1.0 - smoothstep(-0.15, 0.3, v);
  g = mix(g, 0.05, schraffur(css, schatt * 0.45, radians(62.0), 3.8) * step(0.2, wert));
  float aaR = fwidth(h.rand) + 1e-3;
  float abgewandt = smoothstep(0.0, 0.15, dot(n0, L) - dot(h.n, L));
  float linie = (1.0 - smoothstep(0.035 - aaR, 0.035 + aaR, h.rand)) * abgewandt * smoothstep(0.0, 0.5, schatt + 0.3) * h.lod;
  g = mix(g, wert < 0.2 ? 0.6 : 0.05, linie);
  float glanz = smoothstep(0.965, 0.972, dot(normalize(mix(n0, h.n, 0.35)), normalize(L + V))) * step(0.3, h.glanz);
  g = mix(g, 1.0, glanz);
  g = mix(g, 1.0, clamp(dot(h.leucht, vec3(0.3)), 0.0, 1.0));
  return vec3(g);
}
/** Earle: vier harte Stufen im Streiflicht, Schatten in Petrol, tiefe Schatten fast schwarz, ein Lichtpunkt je Schuppe (sRGB) */
vec3 hautEarle(Haut h, vec3 n0, vec3 V) {
  vec3 L = ausSicht(normalize(vec3(-0.85, 0.32, 0.42)));
  float v = dot(normalize(mix(n0, h.n, 0.15)), L);
  vec3 alb = clamp(mix(vec3(dot(h.farbe, vec3(0.299, 0.587, 0.114))), h.farbe, 1.45) * 1.12, 0.0, 1.0);
  vec3 c;
  if (v > 0.55) c = alb * vec3(1.08, 1.03, 0.9) + vec3(0.04, 0.03, 0.0);
  else if (v > 0.18) c = alb * 0.84;
  else if (v > -0.18) c = mix(alb, vec3(0.06, 0.24, 0.27), 0.62) * 0.62;
  else c = vec3(0.03, 0.07, 0.09);
  float aaR = fwidth(h.rand) + 1e-3;
  float lp = smoothstep(0.26 - aaR, 0.26 + aaR, h.rand) * step(h.rand, 0.95) * smoothstep(0.15, 0.35, v) * h.lod;
  c = mix(c, min(alb * 1.35 + 0.12, vec3(1.0)), lp * 0.7);
  float linie = (1.0 - smoothstep(0.03 - aaR, 0.03 + aaR, h.rand)) * h.lod;
  c = mix(c, c * 0.55, linie * 0.6);
  return min(c + h.leucht * 0.4, vec3(1.0));
}
/** Spider-Verse: zwei kräftige Töne, Raster, Schraffur, Tuschebögen, Glanz, farbiges Randlicht (sRGB) */
vec3 hautComic(Haut h, vec3 n0, vec3 V, vec2 css) {
  vec3 L = hautLicht();
  float v = dot(normalize(mix(n0, h.n, 0.25)), L);
  vec3 alb = clamp(mix(vec3(dot(h.farbe, vec3(0.299, 0.587, 0.114))), h.farbe, 1.5) * 1.3 + 0.03, 0.0, 1.0);
  float aa = fwidth(v) + 1e-3;
  float licht = smoothstep(0.1 - aa, 0.1 + aa, v);
  vec3 c = mix(alb * vec3(0.56, 0.5, 0.8), alb, licht);
  float tiefe = (1.0 - licht) * 0.55 + smoothstep(0.0, -0.7, v) * 0.45;
  c = mix(c, alb * vec3(0.28, 0.22, 0.45), punkt(css, tiefe * 0.55, radians(45.0), 5.5) * 0.9);
  c = mix(c, vec3(0.05, 0.03, 0.09), schraffur(css, smoothstep(-0.3, -0.85, v) * 0.55, radians(-35.0), 4.5) * 0.9);
  float schatt = 1.0 - smoothstep(0.0, 0.55, v);
  float abgewandt = smoothstep(0.02, 0.18, dot(n0, L) - dot(h.n, L));
  float aaR = fwidth(h.rand) + 1e-3;
  float bogen = (1.0 - smoothstep(0.02 + 0.05 * schatt - aaR, 0.02 + 0.05 * schatt + aaR, h.rand)) * abgewandt * smoothstep(0.15, 0.45, schatt) * h.lod;
  c = mix(c, vec3(0.04, 0.02, 0.08), bogen);
  float sp = smoothstep(0.962, 0.972, dot(normalize(mix(n0, h.n, 0.3)), normalize(L + V))) * step(0.15, h.glanz);
  c = mix(c, vec3(1.0), sp * 0.95);
  vec3 Lr = ausSicht(normalize(vec3(0.85, -0.35, 0.25)));
  float rim = smoothstep(0.6, 0.66, 1.0 - max(dot(n0, V), 0.0)) * smoothstep(0.1, 0.2, dot(n0, Lr));
  c = mix(c, vec3(0.22, 0.86, 0.96), rim * 0.9);
  return min(c + h.leucht * 0.45, vec3(1.0));
}
`;
