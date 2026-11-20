/**
 * Earth-42 (Spider-Verse, die Welt des Prowlers; dort spielt der Anfang von „Beyond the Spider-Verse“, CinemaCon 13.04.2026). Die
 * Welt ist Nacht, Violett und Säuregrün, rau und gesprüht.
 *
 * Hier: eine fast schwarze Form, von links in Säuregrün, von rechts in Violett angestrahlt; das Licht ist gesprüht (dichte Punkte am
 * Rand, Sprühnebel darüber hinaus), und wo viel Farbe liegt, laufen Läufer nach unten, wachsen und bleiben mit einem Tropfen am Ende
 * stehen. Ein Graffiti-Umriss in Schwarz mit versetzter grüner Kante, feines Korn. Bühne: Nacht mit Neon-Unschärfe der Stadt.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
const vec3 NACHT = vec3(0.045, 0.03, 0.08);
const vec3 VIOLETT = vec3(0.62, 0.22, 1.0);
const vec3 GIFT = vec3(0.6, 1.0, 0.18);

/** gesprühtes Licht an uv: (grün, violett) */
vec2 spruehLicht(vec2 uv) {
  GPunkt g = gLesen(uv);
  if (g.a < 0.5) return vec2(0.0);
  vec3 V = zumAuge(g.p);
  float fres = 1.0 - max(dot(g.n, V), 0.0);
  vec3 Lg = ausSicht(normalize(vec3(-1.0, 0.25, -0.3)));
  vec3 Lv = ausSicht(normalize(vec3(1.0, 0.1, -0.25)));
  float gr = smoothstep(0.05, 0.75, dot(g.n, Lg)) * (0.35 + 0.65 * fres);
  float vi = smoothstep(0.05, 0.75, dot(g.n, Lv)) * (0.35 + 0.65 * fres);
  return vec2(gr, vi);
}

float spruehen(vec2 p, float dichte, float seed) {
  float korn = hash12(floor(p * 1.4) + seed);
  float fein = step(1.0 - dichte, korn);
  return max(fein, smoothstep(0.55, 0.95, dichte));
}

void main() {
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  float t = uZeit;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 L = ausSicht(normalize(vec3(0.0, 1.0, 0.4)));
  float oben = dot(g.n, L) * 0.5 + 0.5;
  vec2 licht = spruehLicht(vUv);
  vec3 bild = NACHT * (0.55 + 0.6 * oben);
  // Korn im Schatten
  bild *= 0.85 + 0.3 * hash12(floor(cssPx * 1.5) + floor(t * 12.0));
  float sg = spruehen(cssPx, licht.x, 1.0) * maske;
  float sv = spruehen(cssPx + 0.5, licht.y, 2.0) * maske;
  bild = mix(bild, GIFT, sg * 0.95);
  bild = mix(bild, VIOLETT, sv * 0.95);
  // Läufer: wo oben viel Farbe liegt, läuft sie nach unten (in der Spalte nach oben suchen)
  float spalte = floor(cssPx.x / 5.0);
  float h = hash11(spalte * 2.17);
  float laeufer = 0.0;
  vec3 laeuferFarbe = GIFT;
  if (h > 0.62 && uR_laeufer > 0.0) {
    float lang = (25.0 + 110.0 * hash11(spalte * 5.3)) * uR_laeufer * min(1.0, t * (0.08 + 0.1 * h) + 0.15);
    float mitteX = (spalte + 0.5) * 5.0 + (hash11(spalte * 9.1) - 0.5) * 2.0;
    for (int i = 1; i <= 10; i++) {
      float dy = float(i) / 10.0 * lang;
      vec2 q = vec2(mitteX, cssPx.y + dy) * uDpr / uAufl;
      vec2 s = spruehLicht(q);
      float quelle = max(s.x, s.y);
      if (quelle > 0.55) {
        float rest = 1.0 - dy / lang;
        float b = 0.9 + 0.8 * hash11(spalte) + 1.8 * smoothstep(0.1, 0.0, rest);
        laeufer = smoothstep(b + 0.6, b - 0.3, abs(cssPx.x - mitteX)) * step(0.0, rest);
        laeuferFarbe = s.x > s.y ? GIFT : VIOLETT;
        break;
      }
    }
  }
  bild = mix(bild, laeuferFarbe * 0.92, laeufer);
  // Graffiti-Umriss: Schwarz, dahinter versetzt grün
  float schwarz = kanteBei(vUv, 2.0 * uDpr);
  float kante = kanteBei(vUv - vec2(3.0, -3.0) * uDpr / uAufl, 1.4 * uDpr) * (1.0 - maske);
  float a = 1.0;
  vec3 aus;
  if (uBuehne > 0.5) {
    vec2 q = gl_FragCoord.xy / uAufl;
    vec3 grund = mix(vec3(0.02, 0.015, 0.04), vec3(0.09, 0.04, 0.14), q.y);
    // Neon-Unschärfe der Stadt
    for (int i = 0; i < 9; i++) {
      vec2 c = hash21(float(i) * 3.7 + 1.0) * vec2(1.0, 0.6) + vec2(0.0, 0.35);
      float r = 0.03 + 0.06 * hash11(float(i) * 1.9);
      float d = length((q - c) * vec2(uAufl.x / uAufl.y, 1.0));
      vec3 nf = hash11(float(i) * 4.1) > 0.5 ? GIFT : VIOLETT;
      grund += nf * 0.07 * smoothstep(r, r * 0.6, d);
    }
    // Sprühnebel um die Form
    float weich = texture(tWeich, vUv).r;
    float nebel = smoothstep(0.0, 0.5, weich) * (1.0 - maske);
    grund = mix(grund, VIOLETT * 0.5, spruehen(cssPx + 1.0, nebel * 0.18, 4.0) * 0.6);
    grund *= 0.9 + 0.2 * hash12(floor(cssPx * 1.5) + floor(t * 12.0));
    aus = mix(grund, bild, maske);
    aus = mix(aus, bild, laeufer);
    aus = mix(aus, GIFT * 0.9, kante);
  } else {
    aus = bild;
    a = max(max(maske, laeufer), kante);
    aus = mix(aus, GIFT * 0.9, kante);
  }
  aus = mix(aus, vec3(0.0), schwarz * 0.95);
  a = max(a, schwarz);
  farbe = vec4(aus * a, a);
}
`;

export const ERDE42 = bildVoreinstellung({
  id: 'erde42',
  name: 'Earth-42',
  gruppe: 'Spider-Verse',
  zeile: 'Die Welt des Prowlers (Beyond): Nacht, gesprühtes Licht in Säuregrün und Violett, Läufer, die tropfen, Graffiti-Umriss',
  regler: [{ k: 'laeufer', name: 'Läufer', min: 0, max: 2, schritt: 0.05, grund: 1 }],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 18 },
});
