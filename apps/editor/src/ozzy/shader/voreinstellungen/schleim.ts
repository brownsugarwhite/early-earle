/**
 * Schleim (Materialien; Florian, 21.11.: „ein richtig tolles "schleim" material … in hyperrealistisch“). Die Form ist zäher,
 * durchscheinender Schleim:
 * - **Brechung und Farbe:** Ein Strahl bricht an der Vorderseite (Brechungsindex 1,36 wie Gel), läuft durch die Dicke der Form
 *   (Vorder- bis Rückseite) und trifft das Studio dahinter; auf dem Weg schluckt der Schleim je Farbe verschieden viel
 *   (Beer–Lambert): dünne Ränder hell und klar, dicke Stellen satt und tief.
 * - **Trübe:** ein Teil des Lichts streut im Schleim (milchig), am stärksten, wo das Licht eindringt.
 * - **Blasen** im Inneren (Luft): runde Scheiben, innen hell, am Rand dunkel (Totalreflexion), mit einem Glanzpunkt; tiefer liegende
 *   sind blasser und stärker gefärbt.
 * - **Glitzer** (Färbungen „Klar mit Glitzer“ und „Gold“): Plättchen im Inneren, die einzeln aufblitzen.
 * - **Oberfläche:** nass und glatt; sie spiegelt das Studio (zwei Softboxen als helle Fenster, Fresnel) und wackelt langsam.
 * - **Tropfen** an der Unterkante (Faden, Kopf, Abschnüren, Fallen) aus `TROPFEN_FORM`, im selben Schleim.
 * Bühne: ein helles Studio mit Hohlkehle und Fliesenboden, damit man die Brechung sieht.
 */
import { bildVoreinstellung } from '../bildShader';
import { TROPFEN_FORM } from './tropfen';

const FRAGMENT = /* glsl */ `
/** Färbung: Schlucken je Kanal (je Radius Weg), Farbe des gestreuten Lichts, Glitzer an oder aus */
void schleimArt(out vec3 sigma, out vec3 streu, out float glitzer) {
  int f = int(uR_farbe + 0.5);
  glitzer = 0.0;
  if (f == 0) { sigma = vec3(6.5, 0.55, 6.0); streu = vec3(0.45, 1.0, 0.12); }
  else if (f == 1) { sigma = vec3(0.35, 5.5, 1.9); streu = vec3(1.0, 0.3, 0.62); }
  else if (f == 2) { sigma = vec3(6.0, 1.8, 0.3); streu = vec3(0.2, 0.6, 1.0); }
  else if (f == 3) { sigma = vec3(1.6, 6.0, 0.5); streu = vec3(0.65, 0.3, 1.0); }
  else if (f == 4) { sigma = vec3(0.12, 0.09, 0.06); streu = vec3(0.92, 0.96, 1.0); glitzer = 1.0; }
  else { sigma = vec3(0.25, 1.3, 5.2); streu = vec3(1.0, 0.72, 0.22); glitzer = 1.0; }
}
vec3 lichtHaupt() { return ausSicht(normalize(vec3(-0.5, 0.72, 0.48))); }
/** das Studio vom Punkt p in Richtung d: Fliesenboden unter der Form, helle Hohlkehle, Softboxen (am Blick ausgerichtet) */
vec3 schleimStudio(vec3 p, vec3 d) {
  float yB = uMitte.y - uRadius * 1.3;
  vec3 c;
  if (d.y < -0.015) {
    float t = (yB - p.y) / d.y;
    vec3 w = p + d * t;
    // ruhiger Boden (keine Fugen: feine Linien zeichneten durch die Brechung Adern auf die Form), weiche große Flecken
    vec2 q = (w.xz - uMitte.xz) / uRadius;
    c = vec3(0.6, 0.62, 0.66) * (0.92 + 0.08 * noise2(q * 0.8));
    float r = length(q);
    c *= 0.45 + 0.55 * smoothstep(0.15, 1.6, r);
    c *= 1.0 - 0.45 * smoothstep(2.0, 9.0, t / uRadius);
    c = mix(c, vec3(0.7, 0.72, 0.76), smoothstep(-0.25, -0.015, d.y) * 0.85);
  } else {
    c = mix(vec3(0.66, 0.69, 0.75), vec3(0.86, 0.87, 0.9), smoothstep(-0.02, 0.6, d.y));
  }
  // zwei Softboxen und ein Streifen von hinten (am Blick ausgerichtet: die Lichter liegen immer gut auf der Form)
  c += vec3(7.0, 6.8, 6.4) * softbox(d, lichtHaupt(), ausSicht(vec3(0.0, 1.0, 0.0)), vec2(0.5, 0.32), 0.05);
  c += vec3(3.2, 3.4, 3.8) * softbox(d, ausSicht(normalize(vec3(0.88, 0.25, -0.4))), ausSicht(vec3(0.0, 1.0, 0.0)), vec2(0.1, 0.7), 0.03);
  c += vec3(2.0) * softbox(d, ausSicht(normalize(vec3(0.3, 0.95, 0.1))), ausSicht(vec3(1.0, 0.0, 0.0)), vec2(0.6, 0.2), 0.08);
  return c;
}
/** Schleim an einem Punkt der Form (V zum Auge); dicke: Weg durch die Form in Welteinheiten */
vec3 schleimFarbe(GPunkt g, vec3 V, float dicke, vec3 sigma, vec3 streu, float glitzer, vec2 css) {
  vec3 n0 = g.n;
  vec3 q = (g.p - uMitte) / uRadius;
  // die Haut wackelt: lange langsame Wellen und feines Kräuseln
  float zt = uZeit * 0.32;
  vec3 w = vec3(snoise(q * 1.5 + vec3(0.0, zt, 0.0)), snoise(q * 1.5 + vec3(5.2, zt, 1.3)), snoise(q * 1.5 + vec3(2.7, zt, 7.1)));
  vec3 fein = vec3(snoise(q * 6.5 + zt * 0.7), snoise(q * 6.5 + 3.1 + zt * 0.7), snoise(q * 6.5 + 6.2 + zt * 0.7));
  vec3 st = (w * 0.1 + fein * 0.022) * uR_wackeln;
  vec3 n = normalize(n0 + st - n0 * dot(st, n0));
  vec3 L = lichtHaupt();
  // Brechung durch die ganze Dicke; der Austritt als Linse (Spiegelbild der vorderen Normale längs des Blicks, wie beim Glas)
  float eta = 1.36;
  vec3 r1 = refract(-V, n, 1.0 / eta);
  vec3 nh = normalize(n0 - 2.0 * dot(n0, V) * V);
  vec3 pe = g.p + r1 * dicke;
  vec3 r2 = refract(r1, -nh, eta);
  vec3 hinten = dot(r2, r2) < 1e-6 ? schleimStudio(pe, reflect(r1, -nh)) * 0.45 : schleimStudio(pe, r2);
  float weg = dicke / uRadius;
  float tr = uR_truebe;
  vec3 c = hinten * exp(-sigma * weg) * exp(-weg * 1.4 * tr);
  // Trübe: gestreutes Licht, von der Lichtseite her und dort, wo der Weg lang ist
  float wrap = clamp((dot(n0, L) + 0.55) / 1.55, 0.0, 1.0);
  vec3 tief = exp(-sigma * weg * 0.5);
  c += streu * tief * (1.0 - exp(-weg * 1.4 * tr)) * (0.25 + 0.95 * wrap) * 0.9;
  // Licht, das von hinten durch dünne Stellen kommt (Ränder glühen)
  float rand = pow(1.0 - clamp(dot(n0, V), 0.0, 1.0), 2.0);
  c += streu * exp(-sigma * weg * 0.35) * rand * 0.35;
  // Blasen und Glitzer längs des Wegs im Schleim (die erste Blase deckt, was dahinter liegt, zum Teil)
  vec3 rr = normalize(r1);
  vec3 H = normalize(L + V);
  float schritt = dicke / 9.0;
  for (int i = 0; i < 9; i++) {
    float t = (float(i) + 0.5) * schritt;
    vec3 x = (g.p + r1 * t - uMitte) / uRadius;
    vec3 vor = exp(-sigma * t / uRadius);
    if (uR_blasen > 0.01) {
      vec3 zq = x * 8.0;
      vec3 zc = floor(zq);
      vec3 hz = hash33(zc + 17.0);
      if (hz.x < 0.3 * uR_blasen) {
        vec3 m = zc + 0.5 + (hz - 0.5) * 0.45;
        float rad = 0.09 + 0.17 * hz.y * hz.y + 0.06 * hz.z;
        vec3 dm = m - zq;
        float lang = dot(dm, rr);
        vec3 quer = dm - rr * lang;
        float s = length(quer) / rad;
        if (s < 1.0 && abs(lang) < schritt / uRadius * 8.0 * 0.5 + rad) {
          vec3 nb = normalize(-quer - rr * sqrt(max(1.0 - s * s, 0.0)) * rad);
          float glanz = pow(max(dot(reflect(rr, nb), L), 0.0), 90.0) * 3.0;
          vec3 b = mix(c * 1.25 + streu * 0.05, c * 0.18, smoothstep(0.45, 0.97, s));
          b += vec3(1.0) * glanz + vec3(0.6) * smoothstep(0.82, 0.97, s) * (1.0 - smoothstep(0.97, 1.0, s)) * 0.5;
          c = mix(c, b * mix(vec3(1.0), vor, 0.6), 0.88 * (1.0 - smoothstep(0.96, 1.0, s)));
          break;
        }
      }
    }
    if (glitzer > 0.5) {
      vec3 gq = x * 46.0;
      vec3 gc = floor(gq);
      vec3 hg = hash33(gc + 3.3);
      if (hg.x < 0.5) {
        vec3 m = gc + 0.5 + (hg - 0.5) * 0.5;
        vec3 dm = m - gq;
        float quer = length(dm - rr * dot(dm, rr));
        vec3 nf = normalize(hash33(gc + 9.1) - 0.5);
        float blitz = pow(abs(dot(nf, H)), 900.0) * (1.0 - smoothstep(0.08, 0.2, quer));
        vec3 farbeG = int(uR_farbe + 0.5) == 5 ? vec3(1.0, 0.8, 0.4) : hsv(vec3(hg.z, 0.55, 1.0));
        c += farbeG * blitz * 14.0 * vor;
        c += farbeG * (1.0 - smoothstep(0.05, 0.16, quer)) * 0.06 * vor;
      }
    }
  }
  // die nasse Oberfläche: das Studio gespiegelt, Fresnel, scharfe Lichter
  float nv = clamp(dot(n, V), 0.0, 1.0);
  float fr = fresnelS(nv, 0.024);
  c = c * (1.0 - fr) + schleimStudio(g.p, reflect(-V, n)) * fr;
  c += vec3(1.0, 0.98, 0.95) * ggx(max(dot(n, H), 0.0), 0.07) * fresnelS(max(dot(H, V), 0.0), 0.024) * 0.6;
  return c;
}
/** Licht in einem freien Tropfen (n, V; dicke: Dicke im Maß der Tropfen) */
vec3 schleimTropfen(vec3 n, vec3 V, float dicke, vec3 sigma, vec3 streu) {
  vec3 r1 = refract(-V, n, 1.0 / 1.36);
  vec3 p = uMitte - vec3(0.0, uRadius * 1.05, 0.0);
  vec3 hinten = schleimStudio(p, normalize(r1 - n * 0.4));
  float weg = dicke * 0.16;
  vec3 c = hinten * exp(-sigma * weg) * exp(-weg * 1.4 * uR_truebe);
  c += streu * exp(-sigma * weg * 0.5) * (1.0 - exp(-weg * 1.4 * uR_truebe)) * 0.6;
  float nv = clamp(dot(n, V), 0.0, 1.0);
  float fr = fresnelS(nv, 0.024);
  c = c * (1.0 - fr) + schleimStudio(p, reflect(-V, n)) * fr;
  vec3 H = normalize(lichtHaupt() + V);
  c += vec3(1.0) * ggx(max(dot(n, H), 0.0), 0.07) * 0.015;
  return c;
}
${TROPFEN_FORM}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 blick = blickDurch(vUv);
  vec2 css = gl_FragCoord.xy / uDpr;
  vec3 kamera = uOrtho > 0.5 ? g.p - blick * uRadius * 4.0 : uKamPos;
  vec3 sigma, streu;
  float glitzer;
  schleimArt(sigma, streu, glitzer);
  vec3 bild = uBuehne > 0.5 ? schleimStudio(kamera, blick) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec4 h = texture(tHinten, vUv);
    float dicke = h.w > g.z ? h.w - g.z : uRadius * 0.2;
    bild = mix(bild, schleimFarbe(g, -blick, dicke, sigma, streu, glitzer, css), maske);
    a = max(a, maske);
  }
  // Tropfen unter der Form (wie beim Shader Tropfen, im selben Schleim)
  if (maske < 0.99 && uR_tropfen > 0.01) {
    float fp = max(formPx(), 30.0);
    float B = clamp(fp * 0.1, 10.0, 70.0);
    float sp = floor(css.x / B);
    vec4 a0, b0, a1, b1, a2, b2;
    bool f0 = tropfenSpalte(sp - 1.0, css, B, fp, false, a0, b0);
    bool f1 = tropfenSpalte(sp, css, B, fp, false, a1, b1);
    bool f2 = tropfenSpalte(sp + 1.0, css, B, fp, false, a2, b2);
    if (f0 || f1 || f2) {
      float k = fp * 0.025;
      float r;
      vec4 w;
      float d = alleTropfen(css, a0, b0, f0, a1, b1, f1, a2, b2, f2, k, r, w);
      if (d < 1.0) {
        float rx;
        vec4 wx;
        float gx = alleTropfen(css + vec2(1.0, 0.0), a0, b0, f0, a1, b1, f1, a2, b2, f2, k, rx, wx) - alleTropfen(css - vec2(1.0, 0.0), a0, b0, f0, a1, b1, f1, a2, b2, f2, k, rx, wx);
        float gy = alleTropfen(css + vec2(0.0, 1.0), a0, b0, f0, a1, b1, f1, a2, b2, f2, k, rx, wx) - alleTropfen(css - vec2(0.0, 1.0), a0, b0, f0, a1, b1, f1, a2, b2, f2, k, rx, wx);
        vec2 aus = length(vec2(gx, gy)) > 1e-4 ? normalize(vec2(gx, gy)) : vec2(0.0);
        float rel = clamp(1.0 + d / max(r, 0.5), 0.0, 1.0);
        vec3 nS = vec3(aus * rel, sqrt(max(1.0 - rel * rel, 0.0)));
        vec3 n = normalize((uViewInv * vec4(nS, 0.0)).xyz);
        float dk = 0.6 + 1.7 * (1.0 - rel) * clamp(r / (fp * 0.04), 0.4, 1.8);
        vec3 c = schleimTropfen(n, -blick, dk, sigma, streu);
        float deck = smoothstep(0.8, -0.8, d) * (1.0 - maske);
        bild = mix(bild, c, deck);
        a = max(a, deck);
      }
    }
  }
  vec3 aus = linZuSrgb(aces(bild * 0.95));
  farbe = vec4(aus * a, a);
}
`;

export const SCHLEIM = bildVoreinstellung({
  id: 'schleim',
  name: 'Schleim',
  gruppe: 'Materialien',
  zeile: 'Hyperrealistischer Schleim: Brechung durch die Dicke, Farbe nach Weg (Beer–Lambert), Trübe, Luftblasen, Glitzer, nasse Spiegelung, wackelnde Haut, zähe Tropfen',
  regler: [
    { k: 'farbe', name: 'Farbe', min: 0, max: 5, schritt: 1, grund: 0, stufen: ['Grün', 'Pink', 'Blau', 'Lila', 'Klar mit Glitzer', 'Gold'] },
    { k: 'truebe', name: 'Trübe', min: 0, max: 2, schritt: 0.05, grund: 0.55 },
    { k: 'blasen', name: 'Blasen', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'wackeln', name: 'Wackeln', min: 0, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'tropfen', name: 'Tropfen', min: 0, max: 1.6, schritt: 0.05, grund: 1 },
    { k: 'zaeh', name: 'Zähigkeit', min: 0.2, max: 3, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  rueckseite: true,
  unruhig: () => true,
});
