/**
 * Tropfen (Effekte; neu gedacht nach Florians Urteil „gefällt mir nicht so gut“). Die Form ist mit einer zähen Flüssigkeit überzogen
 * (Honig, Karamell, Kirschsirup oder Chrom), die nach unten fließt und an der Unterkante Tropfen zieht:
 * - **Eine Form, kein Bausatz:** Jeder Tropfen ist ein Abstandsfeld im Bild (Faden, der an der Kante breit ausläuft, und ein Kopf),
 *   weich mit dem Kopf vereinigt; benachbarte Tropfen verschmelzen. Er hängt an der Unterkante der Form direkt über ihm (gesucht im
 *   G-Puffer), wächst, wird schwer, schnürt sich ab, der Kopf fällt (beschleunigt), der Faden schnellt zurück. Größe und Abstand der
 *   Tropfen richten sich nach der Größe der Form im Bild.
 * - **Licht wie in Honig:** Licht dringt ein und kommt gefärbt heraus (Beer–Lambert, Blau wird am stärksten geschluckt). Auf der Form
 *   geht es durch den Überzug zum Grund und zurück: oben, wo er dünn ist, golden, unten und an den Rändern tief bernsteinfarben. Im
 *   freien Tropfen ist es in der Mitte hell (kurzer Weg, die Linse bündelt) und am Rand dunkel; unten sammelt sich ein Glühen.
 *   Darüber spiegelt die Oberfläche das Studio (Fresnel), mit scharfen Lichtern.
 * - **Die Haut fließt:** Wellen und lange Rinnsale laufen in der Welt nach unten; unten ist der Überzug dicker.
 * Bühne: ein warmes, dunkles Studio.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
vec3 saugung() {
  int art = int(uR_art + 0.5);
  if (art == 1) return vec3(0.75, 1.8, 3.6);
  if (art == 2) return vec3(0.3, 3.2, 2.4);
  return vec3(0.28, 0.95, 2.9);
}
bool istChrom() { return int(uR_art + 0.5) == 3; }
vec3 chrom(vec3 n, vec3 V) {
  vec3 F0 = vec3(0.93, 0.94, 0.96);
  float nv = clamp(dot(n, V), 0.0, 1.0);
  return studio(reflect(-V, n)) * (F0 + (1.0 - F0) * pow(1.0 - nv, 5.0));
}
/** der Überzug auf der Form: Licht durch die Schicht (Dicke d) zum hellen Grund und zurück */
vec3 ueberzug(vec3 n, vec3 V, float d) {
  if (istChrom()) return chrom(n, V);
  vec3 sigma = saugung();
  float nv = clamp(dot(n, V), 0.0, 1.0);
  float F = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  float diff = clamp((dot(n, uLichtWelt) + 0.35) / 1.35, 0.0, 1.0);
  vec3 c = vec3(0.92, 0.72, 0.44) * exp(-sigma * d * (1.0 + 1.0 / max(nv, 0.3))) * (0.1 + 1.55 * diff);
  c += exp(-sigma * d * 0.8) * 0.06;
  return c * (1.0 - F) + studio(reflect(-V, n)) * F * 0.85;
}
/** ein freier Tropfen: Licht geht hindurch */
vec3 tropfenLicht(vec3 n, vec3 V, float dicke) {
  if (istChrom()) return chrom(n, V);
  vec3 sigma = saugung();
  float nv = clamp(dot(n, V), 0.0, 1.0);
  float F = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  float wrap = clamp((dot(n, uLichtWelt) + 0.7) / 1.7, 0.0, 1.0);
  float weg = dicke * (1.7 - nv);
  vec3 innen = exp(-sigma * weg) * (0.08 + 1.15 * pow(nv, 1.3)) * (0.35 + 0.75 * wrap);
  innen += exp(-sigma * weg * 0.6) * 0.3 * smoothstep(0.1, -0.7, n.y) * nv;
  return innen * (1.0 - F) * vec3(1.2, 1.0, 0.82) + studio(reflect(-V, n)) * F;
}
/** Halbmesser der Form im Bild (CSS-Bildpunkte) */
float formPx() {
  vec4 a = uProj * uView * vec4(uMitte, 1.0);
  vec3 rechts = (uViewInv * vec4(1.0, 0.0, 0.0, 0.0)).xyz;
  vec4 b = uProj * uView * vec4(uMitte + rechts * uRadius * 0.7, 1.0);
  return length((b.xy / b.w - a.xy / a.w) * 0.5 * uAufl / uDpr);
}
/** ein Tropfen in der Spalte (Breite B): a = (x, y der Kante, Länge des Fadens, Mitte des Kopfs unter der Kante), b = (Kopf, Hals, Grundbreite, Phase) */
bool tropfenSpalte(float spalte, vec2 p, float B, float fp, bool innen, out vec4 a, out vec4 b) {
  a = vec4(0.0);
  b = vec4(0.0);
  float h = hash11(spalte * 1.71 + 0.3);
  if (h > 0.85 * min(uR_tropfen, 1.15)) return false;
  float cx = (spalte + 0.3 + 0.4 * hash11(spalte * 4.3)) * B;
  float w0 = fp * (0.018 + 0.026 * hash11(spalte * 5.7));
  float Lmax = fp * (0.22 + 0.7 * pow(hash11(spalte * 2.9), 1.3)) * min(uR_tropfen, 1.6);
  float yKante;
  if (innen) {
    // ein Punkt im Überzug nah am Rand: die Kante unter ihm suchen (dort setzt der Tropfen an, sein Ansatz liegt über dem Rand)
    if (texture(tNormal, vec2(cx, p.y) * uDpr / uAufl).a < 0.5) return false;
    float unten = -1.0;
    for (int i = 1; i < 40; i++) {
      float dy = float(i);
      if (dy > w0 * 3.5) break;
      if (texture(tNormal, vec2(cx, p.y - dy) * uDpr / uAufl).a < 0.5) { unten = dy; break; }
    }
    if (unten < 0.0) return false;
    yKante = p.y - unten + 0.5;
  } else {
    // die Spalte muss hier außerhalb der Form liegen (sonst hängt der Tropfen tiefer, und der Punkt liegt neben der Form)
    if (texture(tNormal, vec2(cx, p.y) * uDpr / uAufl).a > 0.5) return false;
    // die Unterkante der Form über dem Punkt suchen: grob in der weichen Maske (so wird kein dünnes Teil übersprungen), dann fein
    float schritt = max(B * 0.45, 5.0);
    float oben = -1.0;
    float vorher = 0.0;
    for (int i = 1; i < 48; i++) {
      float dy = float(i) * schritt;
      if (texture(tNormal, vec2(cx, p.y + dy) * uDpr / uAufl).a > 0.5) { oben = dy; break; }
      if (texture(tWeich, vec2(cx, p.y + dy) * uDpr / uAufl).r > 0.03) {
        // ein dünnes Teil kann zwischen zwei Stufen liegen: dort fein suchen
        for (int j = 1; j < 12; j++) {
          float yy = vorher + float(j) * schritt / 12.0;
          if (texture(tNormal, vec2(cx, p.y + yy) * uDpr / uAufl).a > 0.5) { oben = yy; break; }
        }
        if (oben > 0.0) break;
      }
      vorher = dy;
    }
    if (oben < 0.0) return false;
    float lo = max(oben - schritt, 0.0), hi = oben;
    for (int i = 0; i < 7; i++) {
      float m = 0.5 * (lo + hi);
      if (texture(tNormal, vec2(cx, p.y + m) * uDpr / uAufl).a > 0.5) hi = m; else lo = m;
    }
    // dünne Spitzen tropfen nicht (dort wäre die Suche von Zeile zu Zeile verschieden)
    if (texture(tNormal, vec2(cx, p.y + hi + 1.5 * w0) * uDpr / uAufl).a < 0.5) return false;
    yKante = p.y + hi - 1.0;
  }
  if (gLesen(vec2(cx, yKante + 2.5) * uDpr / uAufl).n.y > -0.2) return false;
  float rate = (0.06 + 0.06 * hash11(spalte * 9.1)) * uR_zaeh;
  float ph = fract(uZeit * rate + h * 7.0);
  float L, kopf, kopfY, hals;
  if (ph < 0.7) {
    float gw = ph / 0.7;
    L = Lmax * (0.1 + 0.9 * pow(gw, 1.3));
    kopf = w0 * (1.0 + 1.3 * gw);
    kopfY = L + kopf * 0.25;
    hals = w0 * (0.8 - 0.3 * gw);
  } else if (ph < 0.78) {
    float q = (ph - 0.7) / 0.08;
    L = Lmax * (1.0 + 0.1 * q);
    kopf = w0 * 2.3;
    kopfY = L + kopf * 0.25 + w0 * 1.5 * q * q;
    hals = w0 * 0.5 * (1.0 - q);
  } else {
    float tau = (ph - 0.78) / 0.22;
    float sek = tau * 0.22 / max(rate, 1e-3);
    L = Lmax * (0.1 + 1.0 * (1.0 - pow(tau, 0.35)));
    kopf = w0 * 2.3 * (1.0 - smoothstep(0.75, 1.0, tau));
    kopfY = Lmax * 1.1 + kopf * 0.25 + w0 * 1.5 + fp * 5.0 * sek * sek;
    hals = w0 * 0.55;
  }
  a = vec4(cx, yKante, L, kopfY);
  b = vec4(kopf, hals, w0, ph);
  return true;
}
/** Abstand eines Punkts zu einem Tropfen (Bildpunkte), r: Radius an der Stelle */
float tropfenAbstand(vec2 p, vec4 a, vec4 b, out float r) {
  float dx = p.x - a.x;
  float dy = a.y - p.y;
  float L = a.z, kopfY = a.w, kopf = b.x, hals = b.y, w0 = b.z;
  float t = clamp(dy / max(L, 1.0), 0.0, 1.0);
  float rf = hals + w0 * 0.3 * (1.0 - t) + w0 * 0.55 * exp(-max(dy, 0.0) / (w0 * 1.2));
  float dFaden = dy < -w0 * 4.0 ? 1e3 : (dy > L ? length(vec2(dx, dy - L)) - hals : abs(dx) - rf);
  float dKopf = kopf > 0.2 ? length(vec2(dx, (dy - kopfY) * 0.9)) - kopf : 1e3;
  float k = w0 * 1.1;
  float hh = clamp(0.5 + 0.5 * (dKopf - dFaden) / k, 0.0, 1.0);
  r = mix(max(kopf, 0.5), rf, hh);
  return mix(dKopf, dFaden, hh) - k * hh * (1.0 - hh);
}
float verein(float d1, float r1, float d2, float r2, float k, out float r) {
  float hh = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  r = mix(r2, r1, hh);
  return mix(d2, d1, hh) - k * hh * (1.0 - hh);
}
float alleTropfen(vec2 p, vec4 a0, vec4 b0, bool f0, vec4 a1, vec4 b1, bool f1, vec4 a2, vec4 b2, bool f2, float k, out float r, out vec4 w) {
  // w: Kante des nächsten Tropfens (x, y), Abstand unter ihr, Grundbreite
  float d = 1e3;
  r = 1.0;
  w = vec4(0.0, 0.0, 1e3, 1.0);
  float ri;
  if (f0) { d = tropfenAbstand(p, a0, b0, ri); r = ri; w = vec4(a0.xy, a0.y - p.y, b0.z); }
  if (f1) { float di = tropfenAbstand(p, a1, b1, ri); if (di < d) w = vec4(a1.xy, a1.y - p.y, b1.z); d = verein(d, r, di, ri, k, r); }
  if (f2) { float di = tropfenAbstand(p, a2, b2, ri); if (di < d) w = vec4(a2.xy, a2.y - p.y, b2.z); d = verein(d, r, di, ri, k, r); }
  // Meniskus: nah an einem Tropfen weich mit der Form vereinigt (Abstand zur Form aus der weichen Maske)
  float kf = w.w * 1.4;
  float nah = smoothstep(3.0 * kf, 1.5 * kf, d);
  if (nah > 0.0) {
    float dForm = (0.5 - texture(tWeich, p * uDpr / uAufl).r) * 20.0;
    float hh = clamp(0.5 + 0.5 * (dForm - d) / kf, 0.0, 1.0);
    d = mix(d, mix(dForm, d, hh) - kf * hh * (1.0 - hh), nah);
  }
  return d;
}
/** der Überzug an einem Punkt der Form */
vec3 formFarbe(GPunkt g) {
  vec3 V = zumAuge(g.p);
  vec3 q = (g.p - uMitte) / uRadius;
  // Fließen: Wellen laufen nach unten, lange Rinnsale
  float zt = uZeit * 0.5 * uR_zaeh;
  vec3 fq = vec3(q.x * 4.0, q.y * 2.6 + zt * 2.0, q.z * 4.0);
  const float e = 0.03;
  float n0 = snoise(fq);
  vec3 bump = vec3(snoise(fq + vec3(e, 0.0, 0.0)) - n0, snoise(fq + vec3(0.0, e, 0.0)) - n0, snoise(fq + vec3(0.0, 0.0, e)) - n0) / e;
  vec3 rq = vec3(q.x * 6.5, q.y * 0.8 + zt * 1.2, q.z * 6.5);
  float r0 = snoise(rq);
  vec3 rinne = vec3(snoise(rq + vec3(e, 0.0, 0.0)) - r0, 0.0, snoise(rq + vec3(0.0, 0.0, e)) - r0) / e;
  float lauf = smoothstep(0.05, 0.65, r0);
  vec3 n = normalize(g.n + 0.04 * bump + 0.05 * rinne * lauf);
  // dünn oben und auf Kuppen, dick unten und in den Rinnsalen
  float dicke = 0.55 + 0.5 * lauf + 1.3 * smoothstep(0.25, -0.9, g.n.y) + 0.15 * n0;
  return ueberzug(n, V, max(dicke, 0.1));
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 grund = vec3(0.0);
  if (uBuehne > 0.5) {
    grund = mix(vec3(0.005, 0.004, 0.003), vec3(0.03, 0.021, 0.015), smoothstep(0.0, 1.0, qb.y));
    vec2 sq = (qb - vec2(0.5, 0.56)) * vec2(1.5, 1.0);
    grund += vec3(0.2, 0.13, 0.08) * exp(-dot(sq, sq) * 3.0) * 0.35;
    grund *= 0.96 + 0.06 * noise2(css * 0.5);
  }
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    bild = mix(bild, formFarbe(g), maske);
    a = max(a, maske);
  }
  // Tropfen unter der Form
  if (maske < 0.99) {
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
        vec3 V = -blickDurch(vUv);
        float dicke = 0.6 + 1.7 * (1.0 - rel) * clamp(r / (fp * 0.04), 0.4, 1.8);
        vec3 c = tropfenLicht(n, V, dicke);
        // am Ansatz geht der Tropfen in den Überzug über (eine Flüssigkeit, keine Naht)
        float wz = 1.0 - smoothstep(0.0, 2.6 * w.w, w.z);
        if (wz > 0.001) {
          GPunkt gr = gLesen(vec2(w.x, w.y + 3.0) * uDpr / uAufl);
          if (gr.a > 0.5) c = mix(c, formFarbe(gr), wz * 0.8);
        }
        float deck = smoothstep(0.8, -0.8, d) * (1.0 - maske);
        bild = mix(bild, c, deck);
        a = max(a, deck);
      }
    }
  }
  vec3 aus = linZuSrgb(aces(bild * 1.15));
  farbe = vec4(aus * a, a);
}
`;

export const TROPFEN = bildVoreinstellung({
  id: 'tropfen',
  name: 'Tropfen',
  gruppe: 'Effekte',
  zeile: 'Zähe Flüssigkeit überzieht die Form: Tropfen wachsen aus der Unterkante, schnüren sich ab und fallen; Licht wie in Honig',
  regler: [
    { k: 'art', name: 'Honig · Karamell · Sirup · Chrom', min: 0, max: 3, schritt: 1, grund: 0 },
    { k: 'tropfen', name: 'Tropfen', min: 0, max: 1.6, schritt: 0.05, grund: 1 },
    { k: 'zaeh', name: 'Fließen', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 4 },
});
