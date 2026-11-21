/**
 * Häute im Zeichenstil (Tiermuster; Florian, 21.11.: „mehr Hautshader im manga, anime und spider-verse look“): Drache, Frosch,
 * Chamäleon, Krake. Jede Haut liefert `Haut` (Farbe, Normale mit Relief, Fugen, Abstand zum Rand ihrer Schuppe, Glanz), die Stile
 * aus `hautStile.ts` zeichnen sie: Echt, Anime, Manga, Spider-Verse. Alles liegt in der Welt an der Form (Zellen im Raum, keine
 * Ebenen, keine Nähte).
 *
 * - **Drache:** große Schuppen, die sich wie Schindeln überlappen: je Zelle im Raum eine Schuppe, die von ihrer Mitte nach hinten
 *   wächst (vorn rund, zur freien Kante spitz); über einem Punkt deckt die vordere. Jede Schuppe steigt zur freien Kante an, hat
 *   einen Grat, wirft Schatten auf die nächste; am Bauch breite Platten. Smaragd mit goldenen Kanten, Glanz mit Schimmer.
 * - **Frosch:** glatt und nass mit feinen Körnchen; Giftfarben in vier Färbungen (Blau mit schwarzen Flecken, Gelb mit schwarzen
 *   Bändern, Erdbeerrot mit blauen Beinen, Grün mit schwarzem Netz).
 * - **Chamäleon:** runde Körnchen, dazwischen größere Höcker, ein Kamm auf der Rückenlinie, Bänder in Gelbgrün und Türkis, rote
 *   Punkte, ein heller Streifen an der Flanke.
 * - **Krake:** glatte, nasse Haut mit Warzen und Runzeln, Farbzellen in Rotbraun, Schimmer; an der Unterseite Saugnäpfe (Ring,
 *   Napf, Mitte).
 */
import { bildVoreinstellung } from '../bildShader';
import type { ReglerZeile } from '../kern';
import { BUEHNEN } from './buehnen';
import { HAUT_STILE } from './hautStile';
import { TIER } from './tiere';
import { PFLASTER } from './trex';

const STILE = ['Echt', 'Anime', 'Manga', 'Spider-Verse'];

const GEMEIN = /* glsl */ `
float hautT(vec3 n0) { return acos(clamp(n0.y, -1.0, 1.0)) / 3.14159; }
/** Strichrichtung in der Fläche (nach hinten längs der Körperachse, leicht nach unten) und quer dazu */
void strichFeld(vec3 n0, out vec3 S, out vec3 Q) {
  vec3 A, B, C;
  achsen(A, B, C);
  S = -A + vec3(0.0, -0.25, 0.0);
  S -= n0 * dot(S, n0);
  S = length(S) > 1e-3 ? normalize(S) : normalize(cross(n0, vec3(0.0, 0.0, 1.0)));
  Q = cross(n0, S);
}
`;

const DRACHE = /* glsl */ `
/**
 * Schindeln im Raum: je Zelle eine Schuppe, die von ihrer Mitte in Richtung S wächst; über einem Punkt deckt die vordere (gegen S).
 * Ergebnis: wie weit innen (0 am Rand, 1 in der Mitte); uv: Ort auf der Schuppe (u längs, v quer); schatten: Abstand zur freien
 * Kante einer darüberliegenden Schuppe (klein: im Schatten).
 */
float schindel(vec3 x, vec3 n, vec3 S, vec3 Q, out vec2 uv, out float id, out float schatten) {
  vec3 p = floor(x);
  float bestR = 1e9;
  float innenBest = -1.0;
  uv = vec2(0.0);
  id = 0.0;
  schatten = 1.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = p + vec3(float(i), float(j), float(k));
        vec3 m = b + 0.2 + 0.6 * hash33(b);
        vec3 d = x - m;
        d -= n * dot(d, n);
        float u = dot(d, S), v = dot(d, Q);
        float uu = u < 0.0 ? u / 0.5 : u / 1.08;
        float r = length(vec2(uu, v / 0.66)) + max(u, 0.0) * abs(v) * 0.8;
        float innen = 1.0 - r;
        float rang = dot(m, S);
        if (innen > 0.0 && rang < bestR) { bestR = rang; innenBest = innen; uv = vec2(u, v); id = hash13(b + 0.7); }
      }
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = p + vec3(float(i), float(j), float(k));
        vec3 m = b + 0.2 + 0.6 * hash33(b);
        if (dot(m, S) >= bestR - 1e-4) continue;
        vec3 d = x - m;
        d -= n * dot(d, n);
        float u = dot(d, S), v = dot(d, Q);
        float uu = u < 0.0 ? u / 0.5 : u / 1.08;
        float r = length(vec2(uu, v / 0.66)) + max(u, 0.0) * abs(v) * 0.8;
        schatten = min(schatten, max(r - 1.0, 0.0));
      }
  return innenBest;
}
Haut hautBei(vec3 p, vec3 n0, int stil) {
  Haut h;
  vec3 q = (p - uMitte) / uRadius;
  vec3 S, Q;
  strichFeld(n0, S, Q);
  float t = hautT(n0);
  float f = 15.0 / uR_groesse * (stil == 0 ? 1.0 : 0.8);
  h.lod = smoothstep(2.0, 6.0, uMass * uRadius / f);
  vec2 uv;
  float id, schatten;
  float innen = schindel(q * f, n0, S, Q, uv, id, schatten);
  // Bauchplatten: breite Querplatten an der Unterseite
  vec3 A, B, C;
  achsen(A, B, C);
  float lp = dot(q, A) * f * 0.55;
  float bauch = smoothstep(0.66, 0.74, t);
  float platte = min(fract(lp), 1.0 - fract(lp));
  // Relief: die Schuppe steigt zur freien Kante an, ist quer gewölbt und hat einen Grat
  float uN = clamp(uv.x / 1.08, -0.5, 1.0);
  float grat = exp(-pow(uv.y / 0.12, 2.0)) * smoothstep(-0.3, 0.6, uN);
  vec3 g = S * 0.55 - Q * uv.y * 1.4 * 0.6 - Q * sign(uv.y) * grat * 1.2;
  float unter = 1.0 - smoothstep(0.0, 0.22, schatten);
  float fuge = innen < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.12, innen);
  vec3 gn = g * (1.0 - fuge) * 0.45 * h.lod;
  vec3 gb = A * (fract(lp) - 0.5) * 0.6;
  gn = mix(gn, gb, bauch);
  gn -= n0 * dot(gn, n0);
  h.n = normalize(n0 + gn);
  // Farbe: Smaragd, zur freien Kante golden, Schuppe für Schuppe anders; Bauch cremegelb mit dunklen Fugen
  vec3 c = mix(vec3(0.05, 0.28, 0.22), vec3(0.1, 0.42, 0.34), id) * mix(0.8, 1.15, smoothstep(0.2, 0.8, t));
  c = mix(c, vec3(0.75, 0.6, 0.22), smoothstep(0.35, 0.95, uN) * (1.0 - smoothstep(0.0, 0.35, innen)) * 0.75);
  c = mix(c, vec3(0.02, 0.08, 0.07), smoothstep(0.1, 0.35, snoise(q * 2.0)) * smoothstep(0.45, 0.2, t) * 0.5);
  c *= 1.0 - 0.55 * unter;
  vec3 cb = vec3(0.86, 0.76, 0.46) * (0.92 + 0.1 * hash11(floor(lp))) * (1.0 - 0.6 * (1.0 - smoothstep(0.0, 0.07, platte)));
  h.farbe = mix(c, cb, bauch);
  h.hoehe = mix(smoothstep(-0.5, 1.0, uN), 1.0 - (1.0 - smoothstep(0.0, 0.1, platte)), bauch);
  h.fuge = mix(max(fuge, unter * 0.6), 1.0 - smoothstep(0.0, 0.07, platte), bauch);
  h.rand = mix(max(innen, 0.0) * 0.45, platte, bauch);
  h.glanz = 1.1;
  h.rauh = 0.28;
  return h;
}
`;

const FROSCH = /* glsl */ `
Haut hautBei(vec3 p, vec3 n0, int stil) {
  Haut h;
  vec3 q = (p - uMitte) / uRadius;
  float t = hautT(n0);
  int fb = int(uR_faerbung + 0.5);
  // feine Körnchen
  float f = 70.0 / uR_groesse;
  h.lod = smoothstep(1.8, 5.0, uMass * uRadius / f);
  vec3 st, mi;
  float id;
  float md = pflaster(q * f, st, mi, id);
  float l = max(length(mi), 1e-4);
  float e = mix(md, 0.42 - l, 0.6);
  vec3 ge = 0.4 * st + 0.6 * mi / l;
  vec3 gn = ge * 0.06 * h.lod * (1.0 - smoothstep(0.0, 0.3, e));
  gn -= n0 * dot(gn, n0);
  h.n = normalize(n0 + gn * 2.0);
  // Flecken und Bänder: Turing-artig aus Rauschen
  vec3 w = q * 3.2 + 0.4 * vec3(snoise(q * 2.0), snoise(q * 2.0 + 3.0), snoise(q * 2.0 + 6.0));
  float fl = snoise(w) + 0.45 * snoise(w * 2.3) + 0.2 * snoise(w * 5.0);
  vec3 A, B, C;
  achsen(A, B, C);
  vec3 c;
  if (fb == 1) {
    // Gelb mit schwarzen Bändern (Querbänder, gebrochen)
    float band = sin(dot(q, A) * 9.0 + 1.6 * snoise(q * 1.8)) + 0.5 * snoise(q * 6.0);
    c = mix(vec3(0.98, 0.82, 0.08), vec3(0.03, 0.03, 0.035), smoothstep(0.15, 0.3, band));
  } else if (fb == 2) {
    // Erdbeerfrosch: Rot, die Enden blau, feine schwarze Tupfen
    c = mix(vec3(0.86, 0.12, 0.08), vec3(0.12, 0.25, 0.75), smoothstep(0.7, 0.95, length(q / max(uHalb / uRadius, vec3(0.05)))));
    c = mix(c, vec3(0.04), smoothstep(0.55, 0.62, snoise(q * 14.0)));
  } else if (fb == 3) {
    // Grün mit schwarzem Netz
    vec4 vo = voronoiF3(q * 5.5 + 0.2 * snoise(q * 4.0));
    c = mix(vec3(0.25, 0.85, 0.35), vec3(0.03, 0.05, 0.04), 1.0 - smoothstep(0.06, 0.12, vo.y - vo.x));
  } else {
    // Blau mit schwarzen Flecken, zum Bauch heller
    c = mix(vec3(0.08, 0.3, 0.92), vec3(0.3, 0.6, 1.0), smoothstep(0.3, 0.75, t));
    c = mix(c, vec3(0.02, 0.025, 0.05), smoothstep(0.32, 0.4, fl) * (1.0 - smoothstep(0.75, 0.9, t)));
  }
  c *= 0.94 + 0.12 * mix(0.5, id, h.lod);
  h.farbe = c;
  h.hoehe = smoothstep(0.0, 0.35, e);
  h.fuge = (1.0 - smoothstep(0.0, 0.08, md)) * 0.5 * h.lod;
  h.rand = 1.0;
  h.glanz = 2.2;
  h.rauh = 0.1;
  return h;
}
`;

const CHAMAELEON = /* glsl */ `
Haut hautBei(vec3 p, vec3 n0, int stil) {
  Haut h;
  vec3 q = (p - uMitte) / uRadius;
  float t = hautT(n0);
  vec3 A, B, C;
  achsen(A, B, C);
  float f = 34.0 / uR_groesse * (stil == 0 ? 1.0 : 0.75);
  h.lod = smoothstep(1.8, 5.0, uMass * uRadius / f);
  vec3 st, mi;
  float id;
  float md = pflaster(q * f, st, mi, id);
  float l = max(length(mi), 1e-4);
  float e = mix(md, 0.42 - l, 0.7);
  float tt = clamp(e / 0.38, 0.0, 1.0);
  vec3 ge = (0.3 * st + 0.7 * mi / l) * 2.0 * (1.0 - tt) / 0.38;
  // größere Höcker dazwischen und ein Kamm auf der Rückenlinie
  float hoeck = step(0.9, hash11(id * 17.0));
  float kf = 9.0 / uR_groesse;
  float sk = dot(q, A) * kf;
  float dk = length(vec2((fract(sk) - 0.5) / 0.42, q.z * kf / 0.3));
  float kamm = smoothstep(0.0, 0.35, n0.y) * (1.0 - smoothstep(0.7, 1.0, dk));
  vec3 gn = ge * (0.14 + 0.1 * hoeck) * h.lod;
  gn -= n0 * dot(gn, n0);
  h.n = normalize(n0 - gn);
  // Farbe: Grün, Bänder schräg in Gelbgrün und Türkis, rote Punkte, heller Flankenstreifen, Bauch hell
  vec3 qs = mix(q, q + mi / f, h.lod);
  float band = sin(dot(qs, A) * 11.0 + dot(qs, vec3(0.0, 1.0, 0.0)) * 5.0 + 1.5 * snoise(qs * 1.5));
  vec3 c = mix(vec3(0.16, 0.6, 0.22), vec3(0.78, 0.86, 0.2), smoothstep(0.45, 0.75, band));
  c = mix(c, vec3(0.1, 0.62, 0.6), smoothstep(-0.55, -0.85, band) * 0.8);
  c = mix(c, vec3(0.92, 0.35, 0.12), step(0.93, hash11(id * 31.0)) * smoothstep(0.25, 0.4, t) * h.lod);
  c = mix(c, vec3(0.9, 0.92, 0.72), (1.0 - smoothstep(0.008, 0.02, abs(t - 0.52 + 0.03 * snoise(qs * 3.0)))) * 0.75);
  c = mix(c, vec3(0.88, 0.9, 0.62), smoothstep(0.7, 0.8, t));
  c = mix(c, vec3(0.2, 0.5, 0.18), kamm * 0.7);
  c *= 0.9 + 0.2 * mix(0.5, id, h.lod);
  h.farbe = c;
  h.hoehe = tt;
  h.fuge = (1.0 - smoothstep(0.0, 0.06, md)) * h.lod;
  h.rand = md;
  h.glanz = 0.5;
  h.rauh = 0.45;
  return h;
}
`;

const KRAKE = /* glsl */ `
Haut hautBei(vec3 p, vec3 n0, int stil) {
  Haut h;
  vec3 q = (p - uMitte) / uRadius;
  float t = hautT(n0);
  h.lod = 1.0;
  // Warzen: weiche Kuppeln, verstreut; Runzeln
  float f = 16.0 / uR_groesse;
  float wid;
  vec4 z = zelle3(q * f, wid);
  float warze = step(0.55, wid) * max(1.0 - z.w / 0.35, 0.0);
  vec3 gw = step(0.55, wid) * (z.w < 0.35 ? z.xyz / max(z.w, 1e-4) : vec3(0.0)) * 0.8;
  float runzel = snoise(q * vec3(22.0, 9.0, 22.0));
  vec3 gr = vec3(snoise(q * 22.0 + 1.0), snoise(q * 22.0 + 2.0), snoise(q * 22.0 + 3.0)) * 0.08;
  // Saugnäpfe an der Unterseite: Ring, Napf, Mitte
  float sf = 9.0 / uR_groesse;
  float sid;
  vec4 sz = zelle3(q * sf, sid);
  float unten = smoothstep(0.62, 0.72, t);
  float r = sz.w / 0.42;
  float ring = smoothstep(0.62, 0.72, r) * (1.0 - smoothstep(0.92, 1.0, r));
  float napf = 1.0 - smoothstep(0.55, 0.65, r);
  float mitte = 1.0 - smoothstep(0.12, 0.2, r);
  vec3 gs = (r < 1.0 ? -sz.xyz / max(sz.w, 1e-4) * (ring * 1.2 - napf * 0.8) : vec3(0.0)) * unten;
  vec3 gn = (gw + gs) * f * 0.012 + gr;
  gn -= n0 * dot(gn, n0);
  h.n = normalize(n0 - gn);
  // Farbe: Orange bis Rotbraun, Farbzellen (Punkte, die sich weiten), Schimmer; Saugnäpfe hell
  float zid;
  vec4 zz = zelle3(q * 40.0 / uR_groesse, zid);
  float weite = 0.18 + 0.2 * smoothstep(-0.3, 0.6, snoise(q * 2.0));
  float zelle = 1.0 - smoothstep(weite - 0.05, weite + 0.05, zz.w);
  vec3 c = mix(vec3(0.85, 0.36, 0.2), vec3(0.6, 0.18, 0.12), smoothstep(-0.3, 0.5, snoise(q * 1.6)));
  c = mix(c, vec3(0.35, 0.08, 0.06), zelle * 0.75);
  c = mix(c, vec3(0.98, 0.7, 0.6), warze * 0.35);
  vec3 cs = mix(vec3(0.95, 0.78, 0.72), vec3(0.75, 0.42, 0.4), napf);
  cs = mix(cs, vec3(0.4, 0.15, 0.15), mitte);
  c = mix(c, mix(vec3(0.95, 0.72, 0.62), cs, step(r, 1.0)), unten);
  h.farbe = c;
  h.hoehe = max(warze, ring * unten);
  h.fuge = napf * unten * 0.6 + (1.0 - smoothstep(-0.6, -0.2, runzel)) * 0.2;
  h.rand = unten > 0.5 ? abs(r - 0.68) : 1.0;
  h.glanz = 1.6;
  h.rauh = 0.16;
  return h;
}
`;

function hauptteil(echtGrund: string): string {
  return /* glsl */ `
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  int stil = int(uR_stil + 0.5);
  vec2 versatz = stil == 3 ? vec2(1.5, -1.0) * uDpr / uAufl : vec2(0.0);
  GPunkt g = gLesen(vUv + versatz);
  float maske = deckungBei(vUv + versatz);
  vec2 qb = gl_FragCoord.xy / uAufl;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  vec3 bild = vec3(0.0);
  if (a > 0.5 && maske < 0.999) {
    if (stil == 0) bild = ${echtGrund}(css, qb);
    else if (stil == 1) bild = animeHimmel(css, qb);
    else if (stil == 2) bild = mangaGrund(css, qb);
    else bild = comicKnall(css, qb);
  }
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    Haut h = hautBei(g.p, g.n, stil);
    vec3 c;
    if (stil == 0) c = hautEcht(h, g.n, V);
    else if (stil == 1) c = srgbZuLin(hautAnime(h, g.n, V));
    else if (stil == 2) c = srgbZuLin(hautManga(h, g.n, V, css));
    else c = srgbZuLin(hautComic(h, g.n, V, css));
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  if (stil >= 1) {
    float linie = kanteBei(vUv, (stil == 3 ? 1.9 : 1.3) * uDpr);
    bild = mix(bild, vec3(0.004, 0.004, 0.01), linie);
    a = max(a, linie);
  }
  vec3 aus = stil == 0 ? linZuSrgb(aces(bild * 1.05)) : linZuSrgb(bild);
  farbe = vec4(aus * a, a);
}
`;
}

function haut(id: string, name: string, zeile: string, glsl: string, echtGrund: string, regler: ReglerZeile[] = []) {
  return bildVoreinstellung({
    id,
    name,
    gruppe: 'Tiermuster',
    zeile,
    regler: [
      { k: 'stil', name: 'Stil', min: 0, max: STILE.length - 1, schritt: 1, grund: 1, stufen: STILE },
      { k: 'groesse', name: 'Schuppen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
      ...regler,
    ],
    fragment: `${TIER}\n${BUEHNEN}\n${PFLASTER}\n${HAUT_STILE}\n${GEMEIN}\n${glsl}\n${hauptteil(echtGrund)}`,
    unruhig: () => false,
  });
}

export const DRACHE_HAUT = haut(
  'drache',
  'Drache',
  'Drachenhaut: große Schuppen, die sich wie Schindeln überlappen (vorn rund, zur freien Kante spitz, mit Grat und Schatten), Bauchplatten, Smaragd mit Gold; Stile Echt, Anime, Manga, Spider-Verse',
  DRACHE,
  'urzeitGrund',
);
export const FROSCH_HAUT = haut(
  'frosch',
  'Pfeilgiftfrosch',
  'Glatte, nasse Froschhaut mit feinen Körnchen in Giftfarben (Blau, Gelb-Schwarz, Erdbeere, Grün-Schwarz); Stile Echt, Anime, Manga, Spider-Verse',
  FROSCH,
  'waldBokeh',
  [{ k: 'faerbung', name: 'Färbung', min: 0, max: 3, schritt: 1, grund: 0, stufen: ['Blau', 'Gelb-Schwarz', 'Erdbeere', 'Grün-Schwarz'] }],
);
export const CHAMAELEON_HAUT = haut(
  'chamaeleon',
  'Chamäleon',
  'Chamäleon: runde Körnchen und Höcker, Kamm auf der Rückenlinie, Bänder in Gelbgrün und Türkis, rote Punkte, heller Flankenstreifen; Stile Echt, Anime, Manga, Spider-Verse',
  CHAMAELEON,
  'waldBokeh',
);
export const KRAKE_HAUT = haut(
  'krake',
  'Krake',
  'Krakenhaut: nass, mit Warzen und Runzeln, Farbzellen, die sich langsam weiten, an der Unterseite Saugnäpfe; Stile Echt (unter Wasser), Anime, Manga, Spider-Verse',
  KRAKE,
  'unterWasser',
);
