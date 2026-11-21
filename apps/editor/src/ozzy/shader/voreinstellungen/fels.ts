/**
 * Felsen und Natursteine (Gruppe Stein; Florian, 21.11.: „beim stein dachte ich eher an felsen und realistische natürliche
 * steintexturen“; Vorlage `docs/look/ozzy/shader/vorlagen/2026-11-21-r9-bruchsteinmauer.webp`). Zwei eigene Shader:
 * - **Fels:** verwitterter Fels. Relief aus Bruchflächen (Zellen im Raum, jede eine leicht gekippte Ebene), Rissen an ihren Rändern,
 *   Graten und Kerben (gerippte Rauschfelder) und feinem Korn; Farbe hell auf den Kuppen, dunkel und schmutzig in Spalten, Rostspuren,
 *   die aus den Rissen nach unten laufen, Flechten in Gelb und Orange, Moos in den Spalten, die nach oben offen sind.
 * - **Bruchsteinmauer:** unregelmäßige Kalksteine (Zellen im Raum, waagrecht gestreckt), jeder gewölbt, rau und angeschlagen, in eigener
 *   Farbe (Weißgrau bis Ocker); dazwischen heller Kalkmörtel, vertieft, sandig.
 * Normalen aus der Höhe (Oberflächengradient im Bild); Licht wie im Freien bei leicht bedecktem Himmel.
 */
import { bildVoreinstellung } from '../bildShader';

/** draußen: Zellen, Grate, Normale aus einer Höhe, Licht unter leicht bedecktem Himmel (auch für Barcelona) */
export const DRAUSSEN = /* glsl */ `
/** nächste Zelle im Raum: (F1, F2, Kennung), mitte: ihre Mitte */
vec3 felsZelle(vec3 x, out vec3 mitte) {
  vec3 p = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  mitte = p;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 o = hash33(p + b);
        vec3 r = b + o - f;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; id = hash13(p + b + 0.37); mitte = p + b + o; } else if (d < d2) d2 = d;
      }
  return vec3(sqrt(d1), sqrt(d2), id);
}
/** gerippt: scharfe Grate und Kerben */
float gerippt(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * (1.0 - abs(snoise(p))); p = p * 2.07 + 3.1; a *= 0.5; }
  return s;
}
vec3 hoeheNormale(vec3 n, vec3 p, float h) {
  vec3 dpx = dFdx(p), dpy = dFdy(p);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  if (abs(det) < 1e-12) return n;
  return normalize(abs(det) * n - sign(det) * (r1 * dhx + r2 * dhy));
}
/** draußen bei leicht bedecktem Himmel: weiches Sonnenlicht, Himmel von oben, Boden warm (linear) */
vec3 draussen(vec3 alb, vec3 n, vec3 V, float ao, float rauh) {
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.75, 0.42)));
  float nl = dot(n, L);
  float wrap = clamp((nl + 0.25) / 1.25, 0.0, 1.0);
  vec3 c = alb * vec3(1.0, 0.95, 0.86) * 1.9 * wrap;
  c += alb * mix(vec3(0.12, 0.1, 0.08), vec3(0.32, 0.36, 0.44), n.y * 0.5 + 0.5) * 0.75;
  c *= ao;
  vec3 H = normalize(L + V);
  c += vec3(1.0, 0.96, 0.9) * ggx(max(dot(n, H), 0.0), rauh) * fresnelS(max(dot(H, V), 0.0), 0.04) * max(nl, 0.0) * 0.6;
  return c;
}
vec3 himmel(vec2 qb) {
  vec3 c = mix(vec3(0.72, 0.7, 0.66), vec3(0.56, 0.64, 0.74), smoothstep(0.1, 1.0, qb.y));
  return srgbZuLin(c);
}
`;

const FELS = /* glsl */ `
${DRAUSSEN}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? himmel(qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius * uR_massstab;
    // Bruchflächen: große, leicht gekippte Ebenen (Zellen im Raum), deren Grenzen kaum als Kante, selten als Riss zu sehen sind
    vec3 m;
    vec3 z = felsZelle(q * 2.2 + 0.45 * vec3(snoise(q * 1.2), snoise(q * 1.2 + 4.0), snoise(q * 1.2 + 8.0)), m);
    vec3 kipp = hash33(m) - 0.5;
    float facette = dot(q * 2.2 - m, kipp) * 0.5;
    float kanteF = 1.0 - smoothstep(0.0, 0.12, z.y - z.x);
    // lange, gezackte Risse (Nullstellen eines verwirbelten Rauschens), nur hier und da
    vec3 w = q * 2.4 + 0.35 * vec3(snoise(q * 6.0), snoise(q * 6.0 + 3.0), snoise(q * 6.0 + 6.0));
    float riss = (1.0 - smoothstep(0.0, 0.012, abs(snoise(w)))) * smoothstep(0.3, 0.7, snoise(q * 1.1 + 9.0));
    // raue Oberfläche in vielen Maßstäben: Grate, Kerben, Körner, Poren
    float grat = gerippt(q * 5.0);
    float rau = snoise(q * 22.0) * 0.5 + snoise(q * 55.0) * 0.3 + snoise(q * 140.0) * 0.2;
    float pore = smoothstep(0.62, 0.8, snoise(q * 90.0));
    float hoehe = facette - kanteF * 0.12 + grat * 0.55 + rau * 0.12 - riss * 0.5 - pore * 0.08;
    vec3 n = hoeheNormale(n0, g.p, hoehe * uRadius * 0.06 * uR_relief / uR_massstab);
    // Farbe: Grau mit Mineralkörnern (dunkle Glimmer, helle Feldspäte), Flecken, Wasserspuren nach unten
    float gross = snoise(q * 0.8) * 0.5 + 0.5;
    vec3 alb = mix(vec3(0.46, 0.45, 0.42), vec3(0.6, 0.57, 0.51), gross);
    alb *= 0.86 + 0.24 * (snoise(q * 5.0) * 0.5 + 0.5);
    float koernchen = snoise(q * 260.0);
    alb = mix(alb, vec3(0.12, 0.11, 0.1), smoothstep(0.55, 0.7, koernchen) * 0.7);
    alb = mix(alb, vec3(0.82, 0.8, 0.76), smoothstep(0.6, 0.75, snoise(q * 210.0 + 5.0)) * 0.5);
    alb = mix(alb, alb * 1.15 + 0.02, smoothstep(0.5, 0.75, grat));
    float wasser = smoothstep(0.2, 0.8, snoise(vec3(q.x * 7.0, q.y * 1.2, q.z * 7.0) + 4.0)) * smoothstep(0.0, -0.6, n0.y + 0.2);
    alb = mix(alb, alb * 0.55, wasser * 0.6);
    float spalt = max(riss, kanteF * 0.25);
    alb = mix(alb, vec3(0.2, 0.18, 0.16), riss * 0.45);
    // Rost läuft aus den Rissen nach unten
    float rost = smoothstep(0.35, 0.8, snoise(vec3(q.x * 9.0, q.y * 1.6, q.z * 9.0) + 11.0)) * smoothstep(0.2, 0.6, snoise(q * 1.3 + 3.0));
    alb = mix(alb, vec3(0.5, 0.32, 0.17), rost * 0.4 * uR_rost);
    // Flechten: viele kleine, krustige Kreise in Gelbgrün, Orange und Grau
    vec3 fm;
    vec3 fz = felsZelle(q * 9.0 + 21.0, fm);
    float fr = 0.25 + 0.2 * hash11(fz.z * 7.0);
    float fl = (1.0 - smoothstep(fr - 0.05, fr + 0.02, fz.x + 0.05 * snoise(q * 60.0))) * step(0.55, hash11(fz.z * 3.0)) * smoothstep(-0.2, 0.4, snoise(q * 1.5 + 2.0));
    vec3 flechte = fz.z < 0.4 ? vec3(0.72, 0.72, 0.36) : (fz.z < 0.7 ? vec3(0.84, 0.52, 0.18) : vec3(0.7, 0.72, 0.66));
    flechte *= 0.8 + 0.35 * smoothstep(-0.3, 0.6, snoise(q * 80.0));
    alb = mix(alb, flechte, fl * 0.9 * uR_flechten);
    // Moos nur oben, in weichen Polstern
    float oben = smoothstep(0.35, 0.85, n0.y);
    float moos = smoothstep(0.3, 0.6, snoise(q * 2.2 + 5.0) * 0.7 + oben * 0.6 - 0.3) * oben;
    vec3 moosF = mix(vec3(0.16, 0.28, 0.06), vec3(0.36, 0.46, 0.12), smoothstep(-0.4, 0.6, snoise(q * 40.0)));
    alb = mix(alb, moosF, moos * uR_moos);
    float ao = mix(0.5, 1.0, smoothstep(-0.4, 0.4, hoehe)) * (1.0 - spalt * 0.45);
    vec3 c = draussen(srgbZuLin(alb), normalize(mix(n, n0, moos * 0.5)), V, ao, mix(0.75, 0.95, moos));
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild * 1.05)) * a, a);
}
`;

const MAUER = /* glsl */ `
${DRAUSSEN}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? himmel(qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius * uR_massstab;
    // Steine: Zellen im Raum, waagrecht gestreckt (die Mauer ist in Lagen gesetzt), leicht verwirbelt
    vec3 m;
    vec3 x = vec3(q.x, q.y * 1.7, q.z) * 4.2 + 0.18 * vec3(snoise(q * 3.0), snoise(q * 3.0 + 4.0), snoise(q * 3.0 + 8.0));
    vec3 z = felsZelle(x, m);
    float kante = z.y - z.x;
    float fugeB = 0.07 * uR_fuge;
    float stein = smoothstep(fugeB, fugeB + 0.12, kante);
    float id = z.z;
    // Stein: gewölbt, rau, angeschlagen (Abplatzer an den Rändern)
    float rau = snoise(q * 38.0) * 0.5 + snoise(q * 90.0) * 0.3 + gerippt(q * 12.0) * 0.4;
    float abplatz = smoothstep(0.55, 0.75, snoise(q * 14.0 + id * 9.0)) * (1.0 - smoothstep(0.1, 0.35, kante));
    float hoehe = stein * (0.75 + 0.25 * smoothstep(0.05, 0.25, kante)) + rau * 0.14 * stein - abplatz * 0.25;
    // Mörtel: vertieft, sandig
    float sand = snoise(q * 120.0) * 0.5 + 0.5;
    hoehe += (1.0 - stein) * sand * 0.03;
    vec3 n = hoeheNormale(n0, g.p, hoehe * uRadius * 0.045 * uR_relief / uR_massstab);
    // Farben je Stein: Weißgrau, Grau, Gelbgrau, Ocker; Flecken und Poren
    vec3 c1 = id < 0.35 ? vec3(0.66, 0.66, 0.63) : (id < 0.62 ? vec3(0.58, 0.58, 0.56) : (id < 0.84 ? vec3(0.64, 0.58, 0.46) : vec3(0.62, 0.48, 0.3)));
    c1 = mix(c1, vec3(0.74, 0.72, 0.66), smoothstep(0.3, 0.8, snoise(q * 11.0 + id * 5.0)) * 0.5);
    c1 *= 0.9 + 0.18 * (snoise(q * 7.0 + id * 13.0) * 0.5 + 0.5);
    c1 = mix(c1, vec3(0.55, 0.42, 0.25), smoothstep(0.5, 0.85, snoise(q * 4.0 + id * 31.0)) * 0.5);
    float pore = smoothstep(0.7, 0.85, snoise(q * 75.0 + id));
    c1 *= 1.0 - pore * 0.4;
    vec3 moertel = vec3(0.82, 0.76, 0.62) * (0.92 + 0.12 * sand);
    vec3 alb = mix(moertel, c1, stein);
    alb = mix(alb, alb * 0.7, abplatz * 0.6);
    float ao = mix(0.62, 1.0, stein) * mix(0.85, 1.0, smoothstep(0.0, 0.3, kante));
    vec3 c = draussen(srgbZuLin(alb), n, V, ao, 0.85);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild * 1.05)) * a, a);
}
`;

export const FELS_SHADER = bildVoreinstellung({
  id: 'fels',
  name: 'Fels',
  gruppe: 'Stein',
  zeile: 'Verwitterter Fels: Bruchflächen, Risse, Grate und Kerben im Relief, Rostspuren aus den Rissen, Flechten in Gelb und Orange, Moos in den Spalten',
  regler: [
    { k: 'massstab', name: 'Maßstab', min: 0.4, max: 3, schritt: 0.05, grund: 1 },
    { k: 'relief', name: 'Relief', min: 0, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'flechten', name: 'Flechten', min: 0, max: 1.5, schritt: 0.05, grund: 1 },
    { k: 'moos', name: 'Moos', min: 0, max: 1.5, schritt: 0.05, grund: 1 },
    { k: 'rost', name: 'Rost', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ],
  fragment: FELS,
  unruhig: () => false,
});

export const BRUCHSTEIN = bildVoreinstellung({
  id: 'bruchstein',
  name: 'Bruchsteinmauer',
  gruppe: 'Stein',
  zeile: 'Mauer aus unregelmäßigen Kalksteinen, gewölbt, rau und angeschlagen, Weißgrau bis Ocker, in hellem, vertieftem Kalkmörtel',
  regler: [
    { k: 'massstab', name: 'Maßstab', min: 0.4, max: 3, schritt: 0.05, grund: 1 },
    { k: 'relief', name: 'Relief', min: 0, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'fuge', name: 'Fuge', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
  ],
  fragment: MAUER,
  unruhig: () => false,
});
