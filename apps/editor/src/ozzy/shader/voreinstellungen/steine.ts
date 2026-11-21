/**
 * Steine (Gruppe „Stein“; Florian, 21.11.: „verschiedene steinmaterialien“): acht Gesteine auf einem Motor.
 * - **Muster im Raum** (Maß der Form): Marmor (verwirbelte Adern, große und feine, wolkiger Grund), Granit (Kristalle aus Feldspat,
 *   Quarz und Glimmer), Sandstein (Schichten mit Schrägschichtung, Körner, Poren, Relief nach Härte), Obsidian (schwarzes Glas,
 *   muschelige Bruchwellen, Regenbogenschiller in Lagen), Jade (wolkig, durchscheinend), Lapislazuli (Ultramarin, Calcit-Schlieren,
 *   Pyrit-Funken), Malachit (Bänder um Knollen), Achat (Festungsbänder, durchscheinend).
 * - **Tiefe:** Durchscheinende Steine lesen ihr Muster auch unter der Oberfläche längs des gebrochenen Blicks (Adern dort weicher und
 *   blasser) und lassen Licht durch dünne Stellen (Dicke aus der Rückseite).
 * - **Politur** als Klarlack: das Studio gespiegelt (Fresnel), scharfe Lichter; Sandstein matt mit Körnung. Relief über die
 *   Ableitungen der Höhe im Bild (Oberflächengradient).
 */
import type { ReglerZeile, Voreinstellung } from '../kern';
import { bildVoreinstellung } from '../bildShader';

export const STEINE = ['Marmor', 'Granit', 'Sandstein', 'Obsidian', 'Jade', 'Lapislazuli', 'Malachit', 'Achat'];

const FRAGMENT = /* glsl */ `
struct SteinPunkt { vec3 farbe; float hoehe; float funke; };
SteinPunkt marmor(vec3 q) {
  SteinPunkt s;
  vec3 wq = q + 0.5 * vec3(fbm3(q * 1.1), fbm3(q * 1.1 + 5.1), fbm3(q * 1.1 + 9.7));
  float t = dot(wq, normalize(vec3(0.62, 0.38, 0.69)));
  float v1 = abs(sin(t * 3.2 + 2.6 * fbm3(wq * 1.9)));
  float v2 = abs(sin(t * 11.0 + 3.5 * snoise(wq * 4.3 + 2.0)));
  // Carrara: streifige Hauptadern mit breitem grauem Hof, ein feines Netz dazwischen, wolkiger Grund
  float gross = 1.0 - smoothstep(0.0, 0.16, v1);
  float hof = pow(1.0 - smoothstep(0.0, 0.75, v1), 1.5);
  float netz = pow(1.0 - abs(snoise(wq * 3.1 + 4.0)), 18.0) * smoothstep(-0.2, 0.5, snoise(wq * 1.2 + 2.0));
  float fein = (1.0 - smoothstep(0.0, 0.06, v2)) * smoothstep(-0.2, 0.4, snoise(wq * 2.5));
  float wolke = snoise(q * 2.2 + 3.0) * 0.6 + snoise(q * 5.0) * 0.25;
  vec3 c = mix(vec3(0.86, 0.865, 0.86), vec3(0.76, 0.775, 0.79), smoothstep(-0.3, 0.6, wolke));
  c = mix(c, vec3(0.64, 0.66, 0.7), hof * 0.55);
  c = mix(c, vec3(0.55, 0.57, 0.62), max(fein, netz) * 0.55);
  c = mix(c, vec3(0.33, 0.35, 0.4), gross * 0.85);
  s.farbe = c; s.hoehe = 0.0; s.funke = 0.0;
  return s;
}
SteinPunkt granit(vec3 q) {
  SteinPunkt s;
  vec3 g1 = voronoi3(q * 15.0);
  vec3 g2 = voronoi3(q * 40.0 + 7.0);
  vec3 c;
  if (g1.z < 0.5) c = mix(vec3(0.87, 0.85, 0.81), vec3(0.83, 0.72, 0.68), step(0.6, hash11(g1.z * 31.0)));
  else c = g2.z < 0.32 ? vec3(0.05, 0.05, 0.06) : (g2.z < 0.72 ? vec3(0.47, 0.48, 0.5) : vec3(0.72, 0.71, 0.69));
  c *= 0.9 + 0.12 * hash11(g2.z * 17.0 + g1.z);
  float kante = 1.0 - smoothstep(0.0, 0.06, g2.y - g2.x);
  c *= 1.0 - 0.12 * kante;
  s.farbe = c; s.hoehe = hash11(g2.z * 7.0) * 0.4 - kante * 0.3; s.funke = 0.0;
  return s;
}
SteinPunkt sandstein(vec3 q) {
  SteinPunkt s;
  float t = q.y * 7.0 + 0.9 * fbm3(q * 0.9) + 0.25 * snoise(q * 4.0);
  float lage = floor(t);
  float innen = fract(t);
  float schraeg = sin((q.x * 0.8 + q.z * 0.6) * 24.0 * (0.6 + 0.4 * hash11(lage * 3.1)) + innen * 6.0 + 4.0 * snoise(q * 1.5));
  float h = hash11(lage * 7.3);
  vec3 c = h < 0.25 ? vec3(0.86, 0.72, 0.52) : (h < 0.5 ? vec3(0.8, 0.55, 0.36) : (h < 0.75 ? vec3(0.72, 0.43, 0.28) : vec3(0.9, 0.82, 0.66)));
  c = mix(c, c * 0.84, smoothstep(0.3, 1.0, schraeg) * 0.5);
  c *= 0.9 + 0.1 * snoise(q * 90.0) + 0.07 * snoise(q * 260.0);
  float pore = smoothstep(0.8, 0.9, snoise(q * 140.0));
  c *= 1.0 - 0.4 * pore;
  float hart = hash11(lage * 5.7);
  s.farbe = c;
  s.hoehe = hart * 0.7 + 0.3 * smoothstep(0.0, 0.25, innen) * smoothstep(1.0, 0.75, innen) - pore * 0.3 + 0.05 * schraeg;
  s.funke = 0.0;
  return s;
}
SteinPunkt obsidian(vec3 q) {
  SteinPunkt s;
  vec3 z = q * 2.2;
  vec3 zc = floor(z);
  vec3 m = zc + 0.5 + (hash33(zc) - 0.5) * 0.6;
  float r = length(z - m);
  s.farbe = vec3(0.016, 0.015, 0.019);
  s.hoehe = (0.5 + 0.5 * sin(r * 36.0 + snoise(q * 3.0) * 2.0)) * exp(-r * 1.4);
  s.funke = 0.0;
  return s;
}
SteinPunkt jade(vec3 q) {
  SteinPunkt s;
  float w = fbm3(q * 2.4 + 1.0);
  // Jadeit: helle, durchscheinende Grundmasse (Weißgrün), darin Wolken in Smaragdgrün, feine dunklere Adern
  float wolke = smoothstep(-0.05, 0.45, snoise(q * 1.3 + 0.8 * vec3(w)) * 0.75 + snoise(q * 3.4) * 0.25);
  vec3 c = mix(vec3(0.74, 0.8, 0.72), vec3(0.62, 0.72, 0.62), smoothstep(-0.4, 0.6, w));
  c = mix(c, mix(vec3(0.05, 0.42, 0.2), vec3(0.16, 0.58, 0.3), smoothstep(0.4, 1.0, wolke)), wolke * 0.92);
  float ader = 1.0 - smoothstep(0.0, 0.025, abs(snoise(q * 3.2 + 0.7 * vec3(w))));
  c = mix(c, vec3(0.08, 0.3, 0.16), ader * 0.35);
  s.farbe = c; s.hoehe = 0.0; s.funke = 0.0;
  return s;
}
SteinPunkt lapis(vec3 q) {
  SteinPunkt s;
  float m = fbm3(q * 3.0);
  vec3 c = mix(vec3(0.04, 0.07, 0.34), vec3(0.15, 0.28, 0.78), smoothstep(-0.5, 0.5, m));
  float cal = smoothstep(0.32, 0.6, fbm3(q * 1.8 + 7.0) + 0.3 * snoise(q * 9.0));
  c = mix(c, vec3(0.78, 0.8, 0.86), cal * 0.85);
  vec3 pz = q * 55.0;
  vec3 pc = floor(pz);
  vec3 ph = hash33(pc);
  float fl = step(ph.x, 0.07) * (1.0 - smoothstep(0.12, 0.28, length(pz - pc - 0.5 - (ph - 0.5) * 0.5)));
  s.farbe = c; s.hoehe = fl * 0.3; s.funke = fl;
  return s;
}
SteinPunkt malachit(vec3 q) {
  SteinPunkt s;
  vec3 v = voronoi3(q * 1.7 + 0.12 * vec3(snoise(q * 2.0), snoise(q * 2.0 + 4.0), snoise(q * 2.0 + 8.0)));
  float r = v.x + 0.06 * snoise(q * 5.0);
  float band = fract(r * 9.0);
  vec3 c = mix(vec3(0.02, 0.22, 0.12), vec3(0.1, 0.52, 0.3), smoothstep(0.15, 0.5, band));
  c = mix(c, vec3(0.34, 0.78, 0.55), smoothstep(0.68, 0.86, band) * 0.8);
  c *= 1.0 - 0.7 * (1.0 - smoothstep(0.0, 0.04, band));
  c *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.03, v.y - v.x));
  s.farbe = c; s.hoehe = 0.0; s.funke = 0.0;
  return s;
}
SteinPunkt achat(vec3 q) {
  SteinPunkt s;
  float d = length(q * vec3(1.0, 1.25, 1.0)) + 0.18 * fbm3(q * 1.6) + 0.035 * snoise(q * 7.0);
  // Festungsbänder: viele feine, ungleich breite Lagen, meist milchig und blaugrau, in Zonen Karneol
  float t = d * 19.0 + 0.6 * snoise(q * 3.0);
  float band = fract(t);
  float zone = smoothstep(0.1, 0.55, snoise(vec3(floor(t) * 0.37, 1.7, 3.1)) * 0.5 + snoise(q * 0.9) * 0.6);
  float fein = 0.5 + 0.5 * sin(t * 13.0 + 2.0 * snoise(q * 9.0));
  vec3 milch = mix(vec3(0.74, 0.76, 0.8), vec3(0.88, 0.87, 0.85), smoothstep(0.2, 0.7, band));
  vec3 c = mix(milch, mix(vec3(0.62, 0.3, 0.15), vec3(0.78, 0.52, 0.34), band), zone);
  c = mix(c, c * 0.78, (1.0 - smoothstep(0.0, 0.08, band)) * 0.7);
  c *= 0.94 + 0.08 * fein;
  s.farbe = c; s.hoehe = 0.0; s.funke = 0.0;
  return s;
}
SteinPunkt steinBei(int art, vec3 q) {
  if (art == 0) return marmor(q);
  if (art == 1) return granit(q);
  if (art == 2) return sandstein(q);
  if (art == 3) return obsidian(q);
  if (art == 4) return jade(q);
  if (art == 5) return lapis(q);
  if (art == 6) return malachit(q);
  return achat(q);
}
float steinDurch(int art) {
  if (art == 0) return 0.35;
  if (art == 4) return 1.0;
  if (art == 7) return 0.9;
  if (art == 6) return 0.08;
  return 0.0;
}
float steinRauh(int art) {
  if (art == 2) return 0.85;
  if (art == 3) return 0.035;
  if (art == 4) return 0.32;
  if (art == 5) return 0.14;
  return 0.09;
}
/** Relief aus der Höhe h (Welteinheiten) über ihre Ableitungen im Bild (Oberflächengradient) */
vec3 reliefNormale(vec3 n, vec3 p, float h) {
  vec3 dpx = dFdx(p), dpy = dFdy(p);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  if (abs(det) < 1e-12) return n;
  vec3 gr = sign(det) * (r1 * dhx + r2 * dhy);
  return normalize(abs(det) * n - gr);
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 blick = blickDurch(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = vec3(0.0);
  if (uBuehne > 0.5) {
    // Bühne: dunkler Verlauf, ein weicher Lichthof hinter der Form
    bild = mix(vec3(0.02, 0.021, 0.024), vec3(0.075, 0.078, 0.086), smoothstep(-0.35, 0.65, blick.y));
    float r = length((qb - vec2(0.5, 0.56)) * vec2(uAufl.x / uAufl.y, 1.0));
    bild += vec3(0.05, 0.048, 0.045) * exp(-r * r * 4.0);
  }
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    int art = int(uR_stein + 0.5);
    vec3 V = -blick;
    vec3 n0 = g.n;
    float durch = steinDurch(art) * uR_durch;
    vec3 q0 = (g.p - uMitte) / uRadius * uR_massstab;
    SteinPunkt s = steinBei(art, q0);
    vec3 n = reliefNormale(n0, g.p, s.hoehe * uRadius * (art == 2 ? 0.006 : (art == 3 ? 0.004 : 0.0015)));
    // durchscheinend: das Muster auch in der Tiefe, längs des gebrochenen Blicks
    vec3 alb = s.farbe;
    if (durch > 0.01) {
      vec3 r1 = refract(-V, n0, 1.0 / 1.55);
      vec3 summe = alb;
      float gew = 1.0;
      for (int k = 1; k <= 3; k++) {
        float tief = float(k * k) * 0.022 * uRadius;
        SteinPunkt t = steinBei(art, (g.p + r1 * tief - uMitte) / uRadius * uR_massstab);
        float w = durch * exp(-float(k) * 0.55);
        summe += t.farbe * w;
        gew += w;
      }
      alb = mix(alb, summe / gew, min(durch, 1.0) * 0.85);
    }
    vec3 L = ausSicht(normalize(vec3(-0.55, 0.65, 0.52)));
    vec3 la = srgbZuLin(alb);
    float nl = dot(n, L);
    float wrap = clamp((nl + durch * 0.5) / (1.0 + durch * 0.5), 0.0, 1.0);
    vec3 c = la * vec3(1.0, 0.96, 0.9) * 1.6 * wrap;
    c += la * mix(vec3(0.09, 0.09, 0.1), vec3(0.27, 0.3, 0.37), n.y * 0.5 + 0.5) * 0.62;
    if (durch > 0.01) {
      vec4 h = texture(tHinten, vUv);
      float dk = (h.w > g.z ? h.w - g.z : uRadius * 0.3) / uRadius;
      vec3 Lb = ausSicht(normalize(vec3(0.6, 0.3, -0.75)));
      float hinter = clamp(dot(-n0, Lb) * 0.5 + 0.5, 0.0, 1.0);
      c += la * la * exp(-dk * 2.4) * hinter * 2.4 * durch;
      c += mix(la * la, la, 0.5) * exp(-dk * 1.2) * 0.4 * durch;
    }
    // Politur: Klarlack mit dem Studio, scharfe Lichter
    float rauh = mix(0.75, steinRauh(art), uR_politur);
    float nv = clamp(dot(n, V), 0.0, 1.0);
    float f = fresnelS(nv, art == 3 ? 0.055 : 0.04);
    vec3 H = normalize(L + V);
    c += studio(reflect(-V, n)) * f * (1.0 - smoothstep(0.1, 0.6, rauh)) * uR_politur;
    c += vec3(1.0, 0.97, 0.92) * 1.6 * ggx(max(dot(n, H), 0.0), max(rauh, 0.05)) * f * max(nl, 0.0);
    // Obsidian: Regenbogenschiller in feinen Lagen
    if (art == 3) {
      float lage = smoothstep(0.3, 0.9, sin(dot(q0, normalize(vec3(0.3, 1.0, 0.2))) * 64.0 + 3.0 * fbm3(q0 * 1.3)));
      c += hsv(vec3(fract(nv * 1.6 + 0.3 * fbm3(q0 * 2.0)), 0.7, 1.0)) * 0.022 * lage * (0.3 + 0.7 * wrap);
    }
    // Lapislazuli: Pyrit, metallisches Gold
    if (s.funke > 0.01) {
      vec3 gold = vec3(1.0, 0.77, 0.36);
      vec3 m = gold * (0.18 + studio(reflect(-V, n)) * 0.7 + 4.0 * pow(max(dot(n, H), 0.0), 50.0));
      c = mix(c, m, s.funke);
    }
    bild = mix(bild, c * 1.05, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild)) * a, a);
}
`;

function stein(id: string, name: string, zeile: string, art: number, politur = 1): Voreinstellung {
  const regler: ReglerZeile[] = [
    { k: 'stein', name: 'Gestein', min: 0, max: STEINE.length - 1, schritt: 1, grund: art, stufen: STEINE },
    { k: 'politur', name: 'Politur', min: 0, max: 1, schritt: 0.05, grund: politur },
    { k: 'massstab', name: 'Maßstab', min: 0.3, max: 3, schritt: 0.05, grund: 1 },
    { k: 'durch', name: 'Durchscheinend', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ];
  return bildVoreinstellung({ id, name, gruppe: 'Stein', zeile, regler, fragment: FRAGMENT, rueckseite: true, unruhig: () => false });
}

export const MARMOR = stein('marmor', 'Marmor', 'Carrara-Marmor: weiß und wolkig, große und feine verwirbelte Adern, durchscheinend, poliert', 0);
export const GRANIT = stein('granit', 'Granit', 'Granit: Feldspat weiß und rosa, Quarz grau, Glimmer schwarz, Kristall für Kristall, poliert', 1);
export const SANDSTEIN = stein('sandstein', 'Sandstein', 'Sandstein: Schichten in Ocker und Rot mit Schrägschichtung, Körner und Poren, Relief nach Härte, matt', 2, 0.1);
export const OBSIDIAN = stein('obsidian', 'Obsidian', 'Obsidian: schwarzes Glas wie ein Spiegel, muschelige Bruchwellen, Regenbogenschiller in Lagen', 3);
export const JADE = stein('jade', 'Jade', 'Jade: grün und wolkig, milchige Schleier, Licht dringt ein und kommt an dünnen Stellen heraus, wachsig poliert', 4);
export const LAPIS = stein('lapislazuli', 'Lapislazuli', 'Lapislazuli: Ultramarin, weiße Calcit-Schlieren, goldene Pyrit-Funken, poliert', 5);
export const MALACHIT = stein('malachit', 'Malachit', 'Malachit: Bänder in Grün um Knollen, dunkle Linien, poliert', 6);
export const ACHAT = stein('achat', 'Achat', 'Achat: Festungsbänder in Karneol, Weiß und Blaugrau, durchscheinend, poliert', 7);
