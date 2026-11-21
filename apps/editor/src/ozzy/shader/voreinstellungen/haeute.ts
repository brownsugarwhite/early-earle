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
 *
 * Seit Etappe 4 (Florian: „Die Tiermuster können mit den rex nicht mithalten“) auch die Schuppentiere, mit denselben Kennungen wie
 * vorher: **Python** (glatte Schindeln, Sättel Schuppe für Schuppe), **Klapperschlange** (gekielt, Rauten, Ringe am Schwanz),
 * **Korallennatter** (Ringe Rot, Gelb, Schwarz), **Krokodil** (Knochenplatten mit Grat oben, runde Schuppen an den Flanken,
 * Bauchplatten, nass in Flecken), **Feuersalamander** und **Elefant**. Alle Schuppen sind Zellen im Raum (keine Ebenen mehr, also
 * keine Naht, wo die Fläche die Richtung wechselt), am Bauch Querplatten. Stile: Echt, Anime, Manga, Spider-Verse, Earle.
 */
import { bildVoreinstellung } from '../bildShader';
import type { ReglerZeile } from '../kern';
import { BUEHNEN } from './buehnen';
import { HAUT_STILE } from './hautStile';
import { TIER } from './tiere';
import { PFLASTER } from './trex';

const STILE = ['Echt', 'Anime', 'Manga', 'Spider-Verse', 'Earle'];

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
/**
 * Schindeln im Raum: je Zelle eine Schuppe, die von ihrer Mitte in Richtung S wächst (form: vorn, hinten, quer, Spitze zur freien
 * Kante); über einem Punkt deckt die vordere (gegen S). Ergebnis: wie weit innen (0 am Rand, 1 in der Mitte); uv: Ort auf der
 * Schuppe (u längs, v quer, Zellen); mitte: ihre Mitte (Zellen); schatten: Abstand zur freien Kante einer darüberliegenden Schuppe.
 */
float schindelRang(vec3 x, vec3 n, vec3 S, vec3 Q, vec4 form, vec3 m, out vec2 uv) {
  vec3 d = x - m;
  d -= n * dot(d, n);
  float u = dot(d, S), v = dot(d, Q);
  uv = vec2(u, v);
  float uu = u < 0.0 ? u / form.x : u / form.y;
  return 1.0 - (length(vec2(uu, v / form.z)) + max(u, 0.0) * abs(v) * form.w);
}
float schindel(vec3 x, vec3 n, vec3 S, vec3 Q, vec4 form, out vec2 uv, out float id, out float schatten, out vec3 mitte) {
  vec3 p = floor(x);
  float bestR = 1e9;
  float innenBest = -1.0;
  uv = vec2(0.0);
  id = 0.0;
  schatten = 1.0;
  mitte = x;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = p + vec3(float(i), float(j), float(k));
        vec3 m = b + 0.2 + 0.6 * hash33(b);
        vec2 w;
        float innen = schindelRang(x, n, S, Q, form, m, w);
        float rang = dot(m, S);
        if (innen > 0.0 && rang < bestR) { bestR = rang; innenBest = innen; uv = w; id = hash13(b + 0.7); mitte = m; }
      }
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = p + vec3(float(i), float(j), float(k));
        vec3 m = b + 0.2 + 0.6 * hash33(b);
        if (dot(m, S) >= bestR - 1e-4) continue;
        vec2 w;
        schatten = min(schatten, max(-schindelRang(x, n, S, Q, form, m, w), 0.0));
      }
  return innenBest;
}
/** Bauchplatten: breite Querplatten längs der Körperachse an der Unterseite; Ergebnis: Abstand zur Fuge (0 … 0,5), Nummer */
float bauchPlatte(vec3 q, float f, out float nr, out float lage) {
  vec3 A, B, C;
  achsen(A, B, C);
  float lp = dot(q, A) * f * 0.55;
  nr = floor(lp);
  lage = fract(lp) - 0.5;
  return min(fract(lp), 1.0 - fract(lp));
}
`;

const DRACHE = /* glsl */ `
/** Farben je Art: Schuppe, abgenutzte Kante, Bauch, Glut in den Fugen (linear, HDR; schwarz: keine), Schiller */
void dracheArt(int art, out vec3 schuppe, out vec3 kante, out vec3 bauch, out vec3 glut, out float schil) {
  if (art == 0) { schuppe = vec3(0.05, 0.045, 0.05); kante = vec3(0.24, 0.17, 0.13); bauch = vec3(0.26, 0.18, 0.13); glut = vec3(3.4, 1.0, 0.16); schil = 0.55; }
  else if (art == 1) { schuppe = vec3(0.03, 0.27, 0.18); kante = vec3(0.74, 0.56, 0.22); bauch = vec3(0.84, 0.74, 0.46); glut = vec3(0.0); schil = 0.4; }
  else if (art == 2) { schuppe = vec3(0.5, 0.66, 0.8); kante = vec3(0.93, 0.97, 1.0); bauch = vec3(0.86, 0.9, 0.95); glut = vec3(0.1, 0.5, 1.5); schil = 0.3; }
  else { schuppe = vec3(0.02, 0.025, 0.05); kante = vec3(0.14, 0.13, 0.22); bauch = vec3(0.1, 0.07, 0.14); glut = vec3(0.0); schil = 1.0; }
}
Haut hautBei(vec3 p, vec3 n0, int stil) {
  Haut h;
  h.leucht = vec3(0.0);
  h.schiller = 0.0;
  vec3 q = (p - uMitte) / uRadius;
  vec3 S, Q;
  strichFeld(n0, S, Q);
  float t = hautT(n0);
  int art = int(uR_art + 0.5);
  vec3 cS, cK, cB, cG;
  float schil;
  dracheArt(art, cS, cK, cB, cG, schil);
  // Rangordnung: oben große gekielte Platten, an den Flanken kleinere Schuppen, unten Bauchplatten
  float oben = step(t + 0.05 * snoise(q * 4.0), 0.4);
  float f = (oben > 0.5 ? 8.0 : 17.0) / uR_groesse * (stil == 0 ? 1.0 : 0.85);
  vec4 form = oben > 0.5 ? vec4(0.55, 1.3, 0.8, 0.9) : vec4(0.5, 1.0, 0.62, 0.55);
  h.lod = smoothstep(2.0, 6.0, uMass * uRadius / f);
  vec2 uv;
  float id, schatten;
  vec3 mz;
  float innen = schindel(q * f, n0, S, Q, form, uv, id, schatten, mz);
  vec3 A, B, C;
  achsen(A, B, C);
  float lp = dot(q, A) * f * 0.5;
  float bauchM = smoothstep(0.68, 0.76, t);
  float platte = min(fract(lp), 1.0 - fract(lp));
  float uN = clamp(uv.x / form.y, -0.5, 1.0);
  // Relief: Anstieg zur freien Kante, Wölbung quer, Kiel (oben kräftig), Riefen längs, feine Poren
  float kiel = exp(-pow(uv.y / (oben > 0.5 ? 0.1 : 0.15), 2.0)) * smoothstep(-0.3, 0.7, uN) * (oben > 0.5 ? 1.6 : 0.7);
  float riefen = sin(uv.y * (oben > 0.5 ? 55.0 : 40.0) + 2.0 * snoise(mz * 3.0)) * smoothstep(0.0, 0.3, innen) * 0.15;
  vec3 g = S * 0.6 - Q * uv.y * 0.85 - Q * sign(uv.y) * kiel + Q * riefen;
  float unter = 1.0 - smoothstep(0.0, 0.2, schatten);
  float fuge = innen < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.1, innen);
  vec3 gn = g * (1.0 - fuge) * 0.5 * h.lod;
  gn = mix(gn, A * (fract(lp) - 0.5) * 0.7, bauchM);
  gn += vec3(snoise(q * 160.0), snoise(q * 160.0 + 4.0), snoise(q * 160.0 + 8.0)) * 0.06 * h.lod;
  gn -= n0 * dot(gn, n0);
  h.n = normalize(n0 + gn);
  // Farbe: Schuppe für Schuppe ein wenig anders, zur freien Kante und am Kiel abgenutzt (heller, matter), Schmutz darunter
  float abnutz = clamp(smoothstep(0.55, 1.0, uN) * (1.0 - smoothstep(0.0, 0.3, innen)) + smoothstep(0.6, 1.0, kiel) * 0.5, 0.0, 1.0);
  vec3 c = cS * (0.82 + 0.36 * id);
  c = mix(c, cK, abnutz * 0.7);
  c *= 1.0 - 0.6 * unter;
  vec3 cb = cB * (0.9 + 0.12 * hash11(floor(lp))) * (1.0 - 0.6 * (1.0 - smoothstep(0.0, 0.07, platte)));
  h.farbe = mix(c, cb, bauchM);
  h.hoehe = mix(smoothstep(-0.5, 1.0, uN), 1.0 - (1.0 - smoothstep(0.0, 0.1, platte)), bauchM);
  h.fuge = mix(max(fuge, unter * 0.7), 1.0 - smoothstep(0.0, 0.07, platte), bauchM);
  h.rand = mix(max(innen, 0.0) * 0.45, platte, bauchM);
  h.glanz = mix(1.35, 0.6, abnutz);
  h.rauh = mix(0.16, 0.45, abnutz);
  h.schiller = schil * (1.0 - bauchM * 0.7) * (1.0 - abnutz * 0.6) * uR_schiller;
  // Glut (Glut, Frost): in den Fugen und unter den Kanten, ungleich hell; die Schuppen nahe der Fuge glühen mit
  if (dot(cG, cG) > 0.0) {
    // nur in der schmalen Fuge und im tiefsten Schatten unter der Kante, ungleich hell (Magma kühlt in Flecken)
    float hell = clamp(0.55 + 0.45 * snoise(q * 2.3) + 0.25 * snoise(q * 7.0), 0.05, 1.0);
    float riss = (innen < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.035, innen)) + (1.0 - smoothstep(0.0, 0.06, schatten)) * 0.5;
    h.leucht = cG * clamp(riss, 0.0, 1.0) * hell * hell * (1.0 - bauchM * 0.8) * uR_glut * 0.7;
  }
  return h;
}
`;

const FROSCH = /* glsl */ `
Haut hautBei(vec3 p, vec3 n0, int stil) {
  Haut h;
  h.leucht = vec3(0.0);
  h.schiller = 0.0;
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
  h.leucht = vec3(0.0);
  h.schiller = 0.0;
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
  h.leucht = vec3(0.0);
  h.schiller = 0.0;
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

/** gemeinsamer Anfang der Schlangen: Schindeln, Relief, Schatten, Bauchplatten; Muster an der Mitte jeder Schuppe (qm) */
const SCHLANGE_KOPF = /* glsl */ `
  Haut h;
  h.leucht = vec3(0.0);
  h.schiller = 0.0;
  vec3 q = (p - uMitte) / uRadius;
  vec3 S, Q;
  strichFeld(n0, S, Q);
  float t = hautT(n0);
  vec3 A, B, C;
  achsen(A, B, C);
  float f = K / uR_groesse * (stil == 0 ? 1.0 : 0.8);
  h.lod = smoothstep(2.0, 6.0, uMass * uRadius / f);
  vec2 uv;
  float id, schatten;
  vec3 mz;
  float innen = schindel(q * f, n0, S, Q, FORM, uv, id, schatten, mz);
  vec3 qm = mix(q, mz / f, h.lod);
  float uN = clamp(uv.x / FORM.y, -0.6, 1.0);
  float unter = 1.0 - smoothstep(0.0, 0.22, schatten);
  float fuge = innen < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.1, innen);
  float pn, pl;
  float platte = bauchPlatte(q, f, pn, pl);
  float bauch = smoothstep(0.66, 0.74, t);
  float laengs = dot(qm, A);
`;
/** gemeinsames Ende der Schlangen: Normale, Bauch, Werte (c: Farbe der Schuppe, KIEL: Grat, BAUCHFARBE) */
const SCHLANGE_ENDE = /* glsl */ `
  float kiel = KIEL * exp(-pow(uv.y / 0.1, 2.0)) * smoothstep(-0.4, 0.4, uN) * (1.0 - fuge);
  vec3 g = S * 0.45 - Q * uv.y * 0.9 - Q * sign(uv.y) * kiel * 1.4;
  vec3 gn = mix(g * (1.0 - fuge) * 0.4 * h.lod, A * pl * 0.6, bauch);
  gn -= n0 * dot(gn, n0);
  h.n = normalize(n0 + gn);
  c *= (0.84 + 0.16 * smoothstep(-0.4, 0.6, uN)) * (1.0 - 0.5 * unter);
  c = mix(c, c * 1.35 + 0.03, kiel * 0.4);
  vec3 cb = BAUCHFARBE * (0.92 + 0.1 * hash11(pn)) * (1.0 - 0.55 * (1.0 - smoothstep(0.0, 0.07, platte)));
  h.farbe = mix(c, cb, bauch);
  h.hoehe = mix(smoothstep(-0.6, 1.0, uN), smoothstep(0.0, 0.1, platte), bauch);
  h.fuge = mix(max(fuge, unter * 0.6), 1.0 - smoothstep(0.0, 0.07, platte), bauch);
  h.rand = mix(max(innen, 0.0) * 0.45, platte, bauch);
`;
function schlange(k: number, form: string, kiel: string, muster: string, bauchfarbe: string, glanz: string, rauh: string): string {
  return /* glsl */ `
Haut hautBei(vec3 p, vec3 n0, int stil) {
  const float K = ${k.toFixed(1)};
  const vec4 FORM = ${form};
  ${SCHLANGE_KOPF}
  ${muster}
  const float KIEL = ${kiel};
  const vec3 BAUCHFARBE = ${bauchfarbe};
  ${SCHLANGE_ENDE}
  h.glanz = ${glanz};
  h.rauh = ${rauh};
  return h;
}
`;
}

const PYTHON = schlange(
  24,
  'vec4(0.55, 0.95, 0.62, 0.45)',
  '0.0',
  `float m1 = snoise(vec3(dot(qm, A) * 1.9, dot(qm, B) * 2.5, dot(qm, C) * 2.5) + 3.0) + 0.15 * snoise(qm * 5.0);
  float mm = snoise(qm * 5.0 + 11.0);
  vec3 c = vec3(0.64, 0.5, 0.29);
  if (m1 > 0.2) c = vec3(0.3, 0.19, 0.085);
  if (abs(m1 - 0.2) < 0.1) c = vec3(0.055, 0.042, 0.03);
  if (m1 > 0.55 && mm > 0.5) c = vec3(0.9, 0.82, 0.56);
  c *= 0.88 + 0.24 * id;`,
  'vec3(0.86, 0.8, 0.62)',
  '1.4',
  '0.24',
);
const KLAPPER = schlange(
  30,
  'vec4(0.5, 1.05, 0.55, 0.9)',
  '1.0',
  `// Rauten längs des Rückens (um die Spiegelebene), Spitze an Spitze: hellere Mitte, dunkle Raute, cremefarbener Saum
  float uR = abs(fract(laengs / 0.5) - 0.5) * 2.0;
  float vR = abs(qm.z) / 0.36;
  float rv = uR + vR + 0.05 * snoise(qm * 5.0);
  vec3 c = vec3(0.54, 0.47, 0.37) * (0.88 + 0.22 * hash11(id * 3.1));
  c = mix(c, vec3(0.45, 0.39, 0.3), step(0.75, hash11(id * 9.0)));
  if (length(vec2(1.0 - uR, (vR - 1.65) * 0.8)) < 0.32) c = vec3(0.26, 0.2, 0.13);
  if (rv < 1.1) c = vec3(0.86, 0.8, 0.63);
  if (rv < 0.95) c = vec3(0.2, 0.14, 0.09);
  if (rv < 0.52) c = vec3(0.42, 0.32, 0.2);
  float schwanz = smoothstep(-0.55, -0.7, laengs);
  c = mix(c, step(0.5, fract(laengs * 9.0)) > 0.5 ? vec3(0.9, 0.88, 0.82) : vec3(0.06, 0.05, 0.05), schwanz);`,
  'vec3(0.82, 0.76, 0.6)',
  '0.45',
  '0.55',
);
const KORALLE = schlange(
  26,
  'vec4(0.55, 0.9, 0.66, 0.3)',
  '0.0',
  `// Ringe längs der Achse: Rot breit, Gelb schmal, Schwarz breit, Gelb schmal; echt Schuppe für Schuppe, gezeichnet glatt
  vec3 qr = stil == 0 ? qm : q;
  float rt = fract(dot(qr, A) * 1.9 * uR_ringe + 0.04 * snoise(qr * 3.0));
  vec3 rot = vec3(0.84, 0.1, 0.06), gelb = vec3(0.98, 0.84, 0.2), schwarz = vec3(0.025, 0.022, 0.028);
  vec3 c = rt < 0.38 ? rot : (rt < 0.5 ? gelb : (rt < 0.88 ? schwarz : gelb));
  if (rt < 0.38 && stil == 0) c = mix(c, schwarz, smoothstep(0.45, 0.8, uN) * step(0.45, hash11(id * 5.0)));
  c *= 0.92 + 0.16 * id;`,
  'vec3(0.92, 0.82, 0.66)',
  '1.9',
  '0.16',
);

const KROKODIL_GLSL = /* glsl */ `
Haut hautBei(vec3 p, vec3 n0, int stil) {
  Haut h;
  h.leucht = vec3(0.0);
  h.schiller = 0.0;
  vec3 q = (p - uMitte) / uRadius;
  vec3 S, Q;
  strichFeld(n0, S, Q);
  float t = hautT(n0);
  vec3 A, B, C;
  achsen(A, B, C);
  float oben = smoothstep(0.42, 0.3, t);
  float bauch = smoothstep(0.66, 0.74, t);
  // oben Knochenplatten (große Zellen, flach mit steilem Rand und Grat), an den Flanken runde Schuppen
  float f = mix(16.0, 8.5, oben) / uR_groesse;
  h.lod = smoothstep(1.8, 5.0, uMass * uRadius / f);
  vec3 st, mi;
  float id;
  float md = pflaster(q * f, st, mi, id);
  float l = max(length(mi), 1e-4);
  float e = mix(md, 0.42 - l, mix(0.6, 0.15, oben));
  vec3 ge = mix(0.4 * st + 0.6 * mi / l, st, oben);
  float tt = clamp(e / mix(0.32, 0.12, oben), 0.0, 1.0);
  float dh = 2.0 * (1.0 - tt) / mix(0.32, 0.12, oben);
  vec3 dd = -mi;
  dd -= n0 * dot(dd, n0);
  float kiel = oben * exp(-pow(dot(dd, Q) / 0.07, 2.0)) * step(0.06, md);
  vec3 gn = ge * dh * 0.1 * h.lod - Q * sign(dot(dd, Q)) * kiel * 0.9;
  // Grübchen auf den Platten
  vec3 gv = voronoi3(q * 70.0);
  float gruebchen = smoothstep(0.18, 0.05, gv.x) * oben * step(0.05, md);
  gn += vec3(snoise(q * 70.0), snoise(q * 70.0 + 2.0), snoise(q * 70.0 + 4.0)) * gruebchen * 0.12;
  float pn, pl;
  float platte = bauchPlatte(q, 12.0 / uR_groesse, pn, pl);
  gn = mix(gn, A * pl * 0.6, bauch);
  gn -= n0 * dot(gn, n0);
  h.n = normalize(n0 - gn);
  // Farbe: Oliv mit dunklen Querbändern oben, Flanken heller mit Flecken, Bauch cremefarben; Grat abgerieben heller; nass in Flecken
  vec3 qm = mix(q, q + mi / f, h.lod);
  float band = smoothstep(-0.05, 0.2, snoise(vec3(dot(qm, A) * 4.0, 0.0, 3.0) + 0.5 * snoise(qm * 2.0)));
  vec3 c = mix(mix(vec3(0.36, 0.36, 0.22), vec3(0.14, 0.15, 0.09), band), mix(vec3(0.38, 0.37, 0.23), vec3(0.14, 0.14, 0.09), step(0.35, snoise(qm * 6.0 + 2.0))), 1.0 - oben);
  c *= 0.85 + 0.25 * id;
  c = mix(c, c * 1.45 + 0.03, kiel * 0.6);
  vec3 cb = vec3(0.8, 0.76, 0.58) * (0.92 + 0.1 * hash11(pn)) * (1.0 - 0.55 * (1.0 - smoothstep(0.0, 0.07, platte)));
  float nass = smoothstep(0.05, 0.4, snoise(q * 2.2 + 8.0));
  c *= mix(1.0, 0.8, nass);
  h.farbe = mix(c, cb, bauch);
  float fuge = (1.0 - smoothstep(0.0, 0.05, md)) * h.lod;
  h.fuge = mix(max(fuge, gruebchen * 0.4), 1.0 - smoothstep(0.0, 0.07, platte), bauch);
  h.hoehe = mix(tt, smoothstep(0.0, 0.1, platte), bauch);
  h.rand = mix(md, platte, bauch);
  h.glanz = mix(0.5, 1.6, nass);
  h.rauh = mix(0.5, 0.18, nass);
  return h;
}
`;

const SALAMANDER_GLSL = /* glsl */ `
Haut hautBei(vec3 p, vec3 n0, int stil) {
  Haut h;
  h.leucht = vec3(0.0);
  h.schiller = 0.0;
  vec3 q = (p - uMitte) / uRadius;
  vec3 A, B, C;
  achsen(A, B, C);
  h.lod = 1.0;
  float laengs = dot(q, A), quer = dot(q, B);
  // Flecken: längs gestreckt, teils zu Streifen verbunden, mit Löchern und Inseln; kleine runde Flecken an den Seiten
  float f1 = snoise(vec3(laengs * 1.9, quer * 4.2, q.z * 4.2) * uR_groesse + 3.0) + 0.45 * snoise(q * 6.0 * uR_groesse + 9.0) + 0.18 * snoise(q * 15.0);
  float gelb = smoothstep(0.28, 0.32, f1);
  vec3 tv = voronoi3(q * 9.0 * uR_groesse + 2.0);
  gelb = max(gelb, (1.0 - smoothstep(0.17, 0.21, tv.x + 0.04 * snoise(q * 25.0))) * step(0.72, tv.z) * (1.0 - smoothstep(0.4, 0.8, n0.y)));
  vec3 gf = mix(vec3(1.0, 0.78, 0.05), vec3(0.98, 0.5, 0.03), smoothstep(-0.3, 0.7, snoise(q * 2.5 + 4.0)));
  h.farbe = mix(vec3(0.016, 0.015, 0.018), gf, gelb);
  // nasse Haut: Poren und Wärzchen als Höhe, die Normale aus Differenzen
  float hs = salamanderHaut(q);
  const float e = 0.004;
  vec3 grs = vec3(salamanderHaut(q + vec3(e, 0.0, 0.0)) - hs, salamanderHaut(q + vec3(0.0, e, 0.0)) - hs, salamanderHaut(q + vec3(0.0, 0.0, e)) - hs) / e;
  grs -= n0 * dot(grs, n0);
  h.n = normalize(n0 - grs * 0.006);
  h.hoehe = clamp(hs + 0.5, 0.0, 1.0);
  h.fuge = smoothstep(-0.1, -0.3, hs) * 0.5;
  h.rand = 1.0;
  h.glanz = 2.6;
  h.rauh = 0.1;
  return h;
}
`;

const ELEFANT_GLSL = /* glsl */ `
Haut hautBei(vec3 p, vec3 n0, int stil) {
  Haut h;
  h.leucht = vec3(0.0);
  h.schiller = 0.0;
  vec3 q = (p - uMitte) / uRadius;
  vec3 A, B, C;
  achsen(A, B, C);
  h.lod = 1.0;
  float h0 = elefantRelief(q, A);
  const float e = 0.0025;
  vec3 gr = vec3(elefantRelief(q + vec3(e, 0.0, 0.0), A) - h0, elefantRelief(q + vec3(0.0, e, 0.0), A) - h0, elefantRelief(q + vec3(0.0, 0.0, e), A) - h0) / e;
  gr -= n0 * dot(gr, n0);
  vec3 korn = vec3(snoise(q * 150.0), snoise(q * 150.0 + 3.0), snoise(q * 150.0 + 6.0));
  h.n = normalize(n0 - gr * 0.0075 + (korn - n0 * dot(korn, n0)) * 0.08);
  float tief = smoothstep(-0.2, -0.75, h0);
  vec3 grau = vec3(0.47, 0.45, 0.43) * (0.9 + 0.16 * snoise(q * 2.5) + 0.06 * snoise(q * 60.0));
  grau = mix(grau, vec3(0.62, 0.5, 0.47), smoothstep(0.45, 0.7, fbm3n(q * 3.0 + 7.0, 3)) * 0.6);
  h.farbe = mix(grau, vec3(0.66, 0.58, 0.46), smoothstep(0.15, 0.6, h0) * smoothstep(0.1, 0.6, n0.y + 0.3) * 0.45);
  h.hoehe = clamp(h0 + 0.6, 0.0, 1.0);
  h.fuge = tief;
  h.rand = smoothstep(-0.75, -0.1, h0) * 0.4;
  h.glanz = 0.05;
  h.rauh = 0.95;
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
    else if (stil == 3) bild = comicKnall(css, qb);
    else bild = earleGrund(qb, css);
  }
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    Haut h = hautBei(g.p, g.n, stil);
    vec3 c;
    if (stil == 0) c = hautEcht(h, g.n, V);
    else if (stil == 1) c = srgbZuLin(hautAnime(h, g.n, V));
    else if (stil == 2) c = srgbZuLin(hautManga(h, g.n, V, css));
    else if (stil == 3) c = srgbZuLin(hautComic(h, g.n, V, css));
    else c = srgbZuLin(hautEarle(h, g.n, V));
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  if (stil >= 1) {
    float linie = kanteBei(vUv, (stil == 3 ? 1.9 : (stil == 4 ? 1.0 : 1.3)) * uDpr);
    bild = mix(bild, stil == 4 ? vec3(0.004, 0.012, 0.016) : vec3(0.004, 0.004, 0.01), linie);
    a = max(a, linie);
  }
  vec3 aus = stil == 0 ? linZuSrgb(aces(bild * 1.05)) : linZuSrgb(bild);
  farbe = vec4(aus * a, a);
}
`;
}

function haut(id: string, name: string, zeile: string, glsl: string, echtGrund: string, regler: ReglerZeile[] = [], grundStil = 1) {
  return bildVoreinstellung({
    id,
    name,
    gruppe: 'Tiermuster',
    zeile,
    regler: [
      { k: 'stil', name: 'Stil', min: 0, max: STILE.length - 1, schritt: 1, grund: grundStil, stufen: STILE },
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
  'Drachenhaut: oben große gekielte Platten, an den Flanken kleinere Schuppen, abgenutzte Kanten, Riefen und Poren, Schiller einer dünnen Schicht; Arten Glut (Magma in den Fugen), Smaragd, Frost, Nacht; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  DRACHE,
  'urzeitGrund',
  [
    { k: 'art', name: 'Art', min: 0, max: 3, schritt: 1, grund: 0, stufen: ['Glut', 'Smaragd', 'Frost', 'Nacht'] },
    { k: 'schiller', name: 'Schiller', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'glut', name: 'Glut', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  0,
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
export const SCHLANGE = haut(
  'schlange',
  'Python',
  'Python: glatte Schuppen, die sich als Schindeln überlappen (keine Naht), Sättel mit schwarzem Rand Schuppe für Schuppe, Bauchplatten, Glanz; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  PYTHON,
  'waldBokeh',
  [],
  0,
);
export const KLAPPERSCHLANGE = haut(
  'klapperschlange',
  'Klapperschlange',
  'Gekielte Schuppen (ein Grat je Schuppe, matt), Rauten auf dem Rücken mit hellem Saum, Ringe am Schwanzende, Bauchplatten; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  KLAPPER,
  'wuesteGrund',
  [],
  0,
);
export const KORALLENNATTER = haut(
  'korallennatter',
  'Korallennatter',
  'Glänzende Schuppen in Ringen Rot, Gelb, Schwarz, die roten Schuppen mit schwarzer Spitze; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  KORALLE,
  'waldBokeh',
  [{ k: 'ringe', name: 'Ringe', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
  0,
);
export const KROKODIL = haut(
  'krokodil',
  'Krokodil',
  'Krokodil: oben Knochenplatten mit Grat und Grübchen, an den Flanken runde Schuppen mit Flecken, Bauchplatten, nass in Flecken; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  KROKODIL_GLSL,
  'unterWasser',
  [],
  0,
);
export const SALAMANDER = haut(
  'salamander',
  'Feuersalamander',
  'Glänzendes Schwarz mit gelben, teils zu Streifen verbundenen Flecken, nasse Haut mit Poren und Wärzchen; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  SALAMANDER_GLSL,
  'waldBokeh',
  [],
  0,
);
export const ELEFANT = haut(
  'elefant',
  'Elefant',
  'Elefantenhaut: Felder tiefer Furchen, feinere darin, Querfalten, Staub auf den Kuppen; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  ELEFANT_GLSL,
  'savanneGrund',
  [],
  0,
);
