/**
 * LEGO (Spider-Verse, Earth-13122, die LEGO-Welt in „Across“). Die Form wird aus Steinen gebaut: Ein Strahl je Bildpunkt läuft Zelle für
 * Zelle durch ein Raster in der Welt (DDA); eine Zelle ist ein Stein, wenn ihre Mitte im Körper liegt. Das wird im Bild geprüft: Die
 * Mitte wird abgebildet und ihre Tiefe mit der Vorder- und Rückseite der Form an dieser Stelle verglichen. Getroffen wird die erste
 * volle Zelle; ihre Seite gibt die Normale. Oben sitzen Noppen, Kanten sind gefast, der Kunststoff glänzt. Die Farben kommen in Flächen
 * (großes Rauschen), wie aus einer Kiste gebaut.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
bool voll(vec3 c) {
  vec4 k = uProj * uView * vec4(c, 1.0);
  vec2 uv = k.xy / k.w * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return false;
  vec4 n = texture(tNormal, uv);
  if (n.a < 0.5) return false;
  float vorn = texture(tLage, uv).a;
  vec4 h = texture(tHinten, uv);
  float hinten = h.w > vorn ? h.w : vorn;
  float z = -(uView * vec4(c, 1.0)).z;
  float s = uRadius / uR_steine;
  return z >= vorn - s * 0.35 && z <= hinten + s * 0.35;
}
vec3 steinFarbe(vec3 zelle) {
  float n = fbm3(zelle * 0.13 + 3.0);
  vec3 f[6] = vec3[6](vec3(0.75, 0.05, 0.05), vec3(0.96, 0.75, 0.05), vec3(0.03, 0.27, 0.65), vec3(0.95, 0.95, 0.93), vec3(0.05, 0.05, 0.06), vec3(0.1, 0.55, 0.2));
  int i = int(clamp(floor((n * 0.5 + 0.5) * 6.0), 0.0, 5.0));
  return f[i];
}
void main() {
  vec3 dir = blickDurch(vUv);
  // ein Punkt auf dem Strahl vor der Form (gilt für die räumliche und die parallele Kamera)
  vec3 o = lageAusTiefe(vUv, max(1.0, length(uKamPos - uMitte) - uRadius * 2.5));
  // Bühne: Platte und Himmel
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 grund = mix(vec3(0.82, 0.88, 0.95), vec3(0.45, 0.65, 0.9), qb.y);
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  // in die Kugel um die Form
  vec3 oc = o - uMitte;
  float b = dot(oc, dir);
  float cc = dot(oc, oc) - uRadius * uRadius * 1.21;
  float disk = b * b - cc;
  if (disk > 0.0) {
    float t0 = max(0.0, -b - sqrt(disk));
    float t1 = -b + sqrt(disk);
    float s = uRadius / uR_steine;
    vec3 p = o + dir * t0;
    vec3 zelle = floor(p / s);
    vec3 schrittV = sign(dir);
    vec3 tMax = ((zelle + max(schrittV, 0.0)) * s - p) / dir;
    vec3 tDelta = abs(s / dir);
    vec3 normale = vec3(0.0);
    float tHit = -1.0;
    float t = t0;
    for (int i = 0; i < 64; i++) {
      if (t > t1) break;
      if (voll((zelle + 0.5) * s)) { tHit = t; break; }
      if (tMax.x < tMax.y && tMax.x < tMax.z) { t = t0 + tMax.x; tMax.x += tDelta.x; zelle.x += schrittV.x; normale = vec3(-schrittV.x, 0.0, 0.0); }
      else if (tMax.y < tMax.z) { t = t0 + tMax.y; tMax.y += tDelta.y; zelle.y += schrittV.y; normale = vec3(0.0, -schrittV.y, 0.0); }
      else { t = t0 + tMax.z; tMax.z += tDelta.z; zelle.z += schrittV.z; normale = vec3(0.0, 0.0, -schrittV.z); }
    }
    if (tHit >= 0.0) {
      if (dot(normale, normale) < 0.5) normale = -dir;
      vec3 ph = o + dir * tHit;
      vec3 lokal = (ph / s) - zelle;
      vec3 f = steinFarbe(zelle);
      // Fase an den Kanten der Seite
      vec2 uvF = abs(normale.y) > 0.5 ? lokal.xz : (abs(normale.x) > 0.5 ? lokal.yz : lokal.xy);
      float kante = min(min(uvF.x, 1.0 - uvF.x), min(uvF.y, 1.0 - uvF.y));
      vec3 n = normale;
      // Noppe oben
      float noppe = 0.0, noppenRand = 0.0;
      if (normale.y > 0.5) {
        float r = length(uvF - 0.5);
        noppe = 1.0 - smoothstep(0.28, 0.3, r);
        noppenRand = smoothstep(0.24, 0.29, r) * noppe;
      }
      vec3 L = ausSicht(normalize(vec3(-0.45, 0.75, 0.5)));
      vec3 V = -dir;
      float diff = max(dot(n, L), 0.0) * 0.75 + 0.3;
      vec3 c = f * diff;
      c *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.07, kante));
      c *= 1.0 - 0.25 * noppenRand;
      c += vec3(0.1) * noppe * 0.4;
      float spec = pow(max(dot(n, normalize(L + V)), 0.0), 60.0);
      c += vec3(0.6) * spec;
      c += studio(reflect(dir, n)) * fresnelS(max(dot(n, V), 0.0), 0.04) * 0.25;
      bild = linZuSrgb(aces(srgbZuLin(c) * 1.3));
      a = 1.0;
    }
  }
  farbe = vec4(bild * a, a);
}
`;

export const LEGO = bildVoreinstellung({
  id: 'lego',
  name: 'LEGO',
  gruppe: 'Spider-Verse',
  zeile: 'Earth-13122: die Form aus Steinen mit Noppen, im Volumen der Form gerechnet (Strahl durch ein Raster, Zelle für Zelle)',
  regler: [{ k: 'steine', name: 'Steine', min: 4, max: 24, schritt: 1, grund: 11 }],
  fragment: FRAGMENT,
  rueckseite: true,
  unruhig: () => false,
});
