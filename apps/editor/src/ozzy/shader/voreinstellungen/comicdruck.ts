/**
 * Comicdruck (Spider-Verse, Earth-1610, Miles). Was der Film dafür beschreibt (Recherche 20.11.): Schraffur ist Licht (Hatcher,
 * Thresher: Punkte und Linien dick oder dünn nach dem Shading), Randlicht aus Rasterpunkten, Glanz aus gestreuten Punkten, CMYK mit
 * Fehlpasser statt Tiefenunschärfe (Separator, ChromaShifter), Tuschelinien abgesetzt von der Kante, Linien auf Zweiern.
 *
 * Hier: vier Druckplatten (Cyan, Magenta, Gelb, Schwarz), jede mit eigenem Rasterwinkel (15°, 75°, 0°, 45°). Die Farbflächen sind
 * voll gedruckt, Licht und Schatten entstehen aus Rasterpunkten und Schraffur. Jede Farbplatte ist versetzt, je weiter ein Punkt vor
 * oder hinter der Mitte der Form liegt, desto mehr (Fehlpasser statt Unschärfe); die Schwarzplatte mit den Linien sitzt. Die Linien
 * zittern zwölfmal je Sekunde (auf Zweiern).
 */
import type { Texture } from 'three';
import { G_LESEN, G_UNIFORMS, GDaten } from '../daten';
import { DRUCK, FARBE, RAUSCHEN } from '../glsl';
import type { ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';

const FRAGMENT = /* glsl */ `
${G_UNIFORMS}
${RAUSCHEN}
${FARBE}
${DRUCK}
${G_LESEN}
uniform float uFarbton;
uniform float uRaster;
uniform float uVersatz;
uniform float uKochen;
out vec4 farbe;

const vec3 PAPIER = vec3(0.972, 0.948, 0.885);
// Durchlass der Druckfarben (sRGB), Schwarz nicht ganz schwarz
const vec3 T_C = vec3(0.0, 0.64, 0.9);
const vec3 T_M = vec3(0.93, 0.05, 0.52);
const vec3 T_Y = vec3(1.0, 0.92, 0.0);
const vec3 T_K = vec3(0.1, 0.09, 0.1);

/** Deckung der vier Platten (C, M, Y, K-Raster) an uv, dazu Kernschatten (für die Schraffur) und Glanz */
vec4 platten(vec2 uv, out float kern, out float glanz, out float maske) {
  GPunkt g = gLesen(uv);
  maske = deckungBei(uv);
  kern = 0.0;
  glanz = 0.0;
  if (maske <= 0.0) return vec4(0.0);
  vec3 V = uOrtho > 0.5 ? -normalize((uViewInv * vec4(0.0, 0.0, -1.0, 0.0)).xyz) : normalize(uKamPos - g.p);
  // das Licht kommt für den Comic weiter von der Seite: klare Schattenseite
  vec3 L = normalize((uViewInv * vec4(-0.82, 0.52, 0.24, 0.0)).xyz);
  float ndl = dot(g.n, L);
  float l = clamp(ndl * 0.62 + 0.42, 0.0, 1.0);
  // Randlicht von hinten rechts, Gegenlicht von unten
  vec3 randDir = normalize((uViewInv * vec4(0.9, 0.2, -0.45, 0.0)).xyz);
  float fres = pow(1.0 - max(dot(g.n, V), 0.0), 2.2);
  float rand = fres * smoothstep(-0.2, 0.6, dot(g.n, randDir));
  float unten = fres * smoothstep(0.0, 0.7, dot(g.n, normalize((uViewInv * vec4(-0.3, -1.0, -0.2, 0.0)).xyz)));
  vec3 H = normalize(uLichtWelt + V);
  glanz = smoothstep(0.55, 0.9, pow(max(dot(g.n, H), 0.0), 40.0));
  // die Fläche: Farbe der Form (Grund: Rot wie Miles' Anzug) als volle CMY-Platten
  vec3 grund = hsv(vec3(fract(0.985 + uFarbton), 0.86, 0.92));
  vec3 cmy = 1.0 - grund;
  float k0 = min(cmy.r, min(cmy.g, cmy.b));
  cmy = (cmy - k0) / max(1.0 - k0, 1e-3);
  // Licht nimmt Farbe weg (Raster auf Papier), Schatten legt Schwarz in Punkten darauf
  float hell = smoothstep(0.72, 0.97, l);
  float farbDeckung = 1.0 - 0.68 * hell;
  float schwarz = smoothstep(0.5, 0.18, l) * 0.9;
  kern = smoothstep(0.3, 0.1, l);
  vec4 d = vec4(cmy * farbDeckung, schwarz * 0.85);
  // Randlicht: Cyan-Punkte, Gegenlicht: Magenta, beide nehmen Schwarz weg
  d.x = max(d.x, rand * 0.95);
  d.y = max(d.y * (1.0 - 0.6 * rand), unten * 0.9);
  d.w *= 1.0 - max(rand, unten);
  kern *= 1.0 - max(rand, unten);
  return d;
}

float raster4(vec2 px, float wert, float winkel, float weite) {
  // volle Fläche bleibt voll; darunter Rasterpunkte, die zusammenlaufen (Offset)
  return wert > 0.985 ? 1.0 : raster(px, wert, winkel, weite);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 cssPx = px / uDpr;
  float t12 = floor(uZeit * 12.0) / 12.0 * uKochen;
  // das Raster läuft mit der Form (am Bildpunkt ihrer Mitte verankert), sonst „schwimmt sie durchs Muster“
  vec2 anker = insBild(uMitte) * uAufl;
  vec2 rp = (px - anker) / uDpr;
  // Fehlpasser: je Platte eine Richtung, Betrag aus dem Abstand zur Mitte der Form in der Tiefe
  GPunkt g0 = gLesen(vUv);
  float zFokus = length(uKamPos - uMitte);
  float unschaerfe = g0.a > 0.5 ? clamp(abs(g0.z - zFokus) / uRadius, 0.0, 1.5) : 0.6;
  float v = uVersatz * (1.2 + 6.0 * unschaerfe) * uDpr;
  vec2 o = 1.0 / uAufl;
  float kern, glanz, maske;
  float kernC, glanzC, maskeC, kernM, glanzM, maskeM, kernY, glanzY, maskeY;
  vec4 dk = platten(vUv, kern, glanz, maske);
  vec4 dc = platten(vUv + vec2(-0.8, 0.45) * v * o, kernC, glanzC, maskeC);
  vec4 dm = platten(vUv + vec2(0.7, 0.6) * v * o, kernM, glanzM, maskeM);
  vec4 dy = platten(vUv + vec2(0.15, -0.95) * v * o, kernY, glanzY, maskeY);
  float weite = uRaster;
  // Glanz: gestreute Punkte nehmen alle Platten weg (Licht aus Punkten)
  float streu = punkt(rp + 1.7, glanz * (0.25 + 0.5 * hash12(floor(rp / 4.0) + floor(uZeit * 8.0 * uKochen))), radians(30.0), 4.0);
  float c = raster4(rp, dc.x * maskeC, radians(15.0), weite) * (1.0 - streu);
  float m = raster4(rp, dm.y * maskeM, radians(75.0), weite) * (1.0 - streu);
  float y = raster4(rp, dy.z * maskeY, radians(0.0), weite) * (1.0 - streu);
  float k = punkt(rp, dk.w * maske, radians(45.0), weite * 0.9);
  // Schraffur im Kernschatten (Schwarzplatte), gebogen mit der Form, gekreuzt im tiefsten Schatten
  vec2 biege = g0.n.xy * 6.0;
  float h1 = schraffur(rp + biege, kern * 0.62, radians(-38.0), 4.4 * weite / 7.0);
  float h2 = schraffur(rp - biege, smoothstep(0.5, 1.0, kern) * 0.5, radians(52.0), 4.8 * weite / 7.0);
  k = max(k, max(h1, h2) * step(0.5, g0.a));
  // Tuschelinien: Umriss und Knicke, Breite und Lage wandern mit Rauschen (auf Zweiern)
  vec2 zittern = (vec2(noise2(cssPx * 0.05 + t12 * 3.1), noise2(cssPx * 0.05 + 17.0 + t12 * 2.7)) - 0.5) * 1.6 * uDpr;
  float breite = (0.7 + 0.9 * noise2(cssPx * 0.014 + t12 * 1.3)) * 1.5 * uDpr;
  float linie = kanteBei(vUv + zittern / uAufl, breite);
  float innen = kanteBei(vUv + zittern / uAufl, breite * 0.55);
  linie = max(linie * smoothstep(0.15, 0.6, linie), 0.0);
  k = max(k, max(linie, innen * 0.0));
  // drucken: Papier mal Durchlass der Farben
  vec3 bild = PAPIER;
  bild *= mix(vec3(1.0), T_Y, y);
  bild *= mix(vec3(1.0), T_M, m);
  bild *= mix(vec3(1.0), T_C, c);
  bild *= mix(vec3(1.0), T_K, k);
  float tinte = max(max(c, m), max(y, k));
  // Bühne: Papier mit einem Verlauf aus Cyan-Punkten
  float a;
  if (uBuehne > 0.5) {
    vec2 q = gl_FragCoord.xy / uAufl;
    float verlauf = smoothstep(0.75, 1.45, q.x * 0.7 + (1.0 - q.y) * 0.9) * 0.24;
    float hc = punkt(cssPx, verlauf, radians(15.0), 9.0);
    vec3 grund = PAPIER * (0.97 + 0.03 * noise2(cssPx * 0.7));
    grund *= mix(vec3(1.0), T_C, hc * 0.55);
    float form = max(max(maske, max(maskeC, max(maskeM, maskeY))), tinte);
    bild = mix(grund, bild, form);
    a = 1.0;
  } else {
    // ohne Bühne: in der Form Papier, außerhalb nur die Tinte (auf Ozzys Weiß)
    a = max(maske, tinte);
    bild = mix(bild / PAPIER, bild, maske);
  }
  farbe = vec4(bild * a, a);
}
`;

class Comicdruck implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly ende;
  constructor(k: ShaderKern) {
    this.daten = new GDaten(k);
    this.ende = k.flaecheProgramm(FRAGMENT, {
      tNormal: { value: null },
      tLage: { value: null },
      uFarbton: { value: 0 },
      uRaster: { value: 7 },
      uVersatz: { value: 1 },
      uKochen: { value: 1 },
    });
  }
  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const u = this.ende.uniforms;
    u.tNormal!.value = d.normal;
    u.tLage!.value = d.lage;
    u.uFarbton!.value = (w.regler.farbton ?? 0) / 360;
    u.uRaster!.value = w.regler.raster ?? 7;
    u.uVersatz!.value = w.regler.versatz ?? 1;
    u.uKochen!.value = w.regler.kochen ?? 1;
    const z = k.ziel('comic:ende', { art: 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }
  unruhig(w: ShaderWerte): boolean {
    return (w.regler.kochen ?? 1) > 0;
  }
  freigeben(): void {
    this.daten.freigeben();
    this.ende.dispose();
  }
}

export const COMICDRUCK: Voreinstellung = {
  id: 'comicdruck',
  name: 'Comicdruck',
  gruppe: 'Spider-Verse',
  zeile: 'Earth-1610 (Miles): CMYK-Raster, Schraffur als Licht, Fehlpasser statt Unschärfe, Linien auf Zweiern',
  regler: [
    { k: 'farbton', name: 'Farbton', min: -180, max: 180, schritt: 1, grund: 0 },
    { k: 'raster', name: 'Rasterweite', min: 3, max: 16, schritt: 0.5, grund: 7 },
    { k: 'versatz', name: 'Fehlpasser', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'kochen', name: 'Linien kochen', min: 0, max: 1, schritt: 1, grund: 1 },
  ],
  bauen: (k) => new Comicdruck(k),
};
