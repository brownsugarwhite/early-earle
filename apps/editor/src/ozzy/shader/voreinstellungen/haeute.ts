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
import type { IUniform } from 'three';
import type { ReglerZeile, ShaderKern, ShaderWerte } from '../kern';
import { BUEHNEN } from './buehnen';
import { HAUT_STILE } from './hautStile';
import { TIER } from './tiere';
import { type FeldWunsch, schuppenFeld } from './schuppenFeld';
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
/**
 * Chamäleon (Runde 8): runde Körnchen (Zellen im Raum), jedes mit einer Farbe, dazwischen größere Tuberkel; Bänder quer, ein heller
 * Streifen an der Flanke, rote und orange Punkte; Stimmung (Regler) verschiebt die Farben wie die Guaninkristalle: ruhig Blaugrün,
 * erregt Gelb und Orange, als Welle über den Körper. Ein Hauch Schiller auf den Körnchen.
 */
Haut hautBei(vec3 p, vec3 n0, int stil) {
  Haut h;
  h.leucht = vec3(0.0);
  h.schiller = 0.0;
  vec3 q = (p - uMitte) / uRadius;
  vec3 A, B, C;
  achsen(A, B, C);
  float t = hautT(n0);
  float f = 66.0 / uR_groesse * (stil == 0 ? 1.0 : 0.7);
  h.lod = smoothstep(1.6, 5.0, uMass * uRadius / f);
  vec3 m;
  vec4 vo = voronoiF3(q * f);
  float rand = vo.y - vo.x;
  float korn = smoothstep(0.0, 0.22, rand);
  float idk = hash11(vo.w * 37.0);
  // Tuberkel: größere Zellen, nur ein Teil
  vec4 vt = voronoiF3(q * f * 0.32 + 9.0);
  float tub = (1.0 - smoothstep(0.08, 0.28, vt.x)) * step(0.7, hash11(vt.w * 13.0));
  // Farbe je Körnchen: Bänder quer, Flankenstreifen, Punkte; Stimmung als Welle längs
  vec3 qk = q;
  float laengs = dot(qk, A);
  float stimmung = clamp(uR_stimmung + 0.35 * sin(laengs * 5.0 - 1.0) * uR_stimmung, 0.0, 1.0);
  vec3 ruhig1 = vec3(0.12, 0.62, 0.42), ruhig2 = vec3(0.1, 0.48, 0.62);
  vec3 erregt1 = vec3(0.95, 0.78, 0.15), erregt2 = vec3(0.95, 0.42, 0.12);
  float band = smoothstep(-0.2, 0.25, sin(laengs * 13.0 + 1.5 * snoise(q * 2.0)));
  vec3 c1 = mix(ruhig1, erregt1, stimmung), c2 = mix(ruhig2, erregt2, stimmung);
  vec3 c = mix(c1, c2, band);
  float streifen = (1.0 - smoothstep(0.03, 0.07, abs(t - 0.55 + 0.03 * snoise(q * 4.0)))) * step(0.3, idk);
  c = mix(c, vec3(0.93, 0.95, 0.85), streifen);
  float punkte = step(0.93, idk) * smoothstep(0.2, 0.5, snoise(q * 3.0 + 5.0));
  c = mix(c, mix(vec3(0.85, 0.15, 0.1), vec3(0.98, 0.55, 0.1), stimmung), punkte);
  c *= 0.86 + 0.24 * idk;
  c = mix(c, c * 0.82, 1.0 - korn);
  c = mix(c, mix(c, vec3(0.95, 0.9, 0.6), 0.25), tub);
  // Relief: Körnchen gewölbt, Tuberkel höher
  float hoehe = korn * 0.7 + tub * 0.6;
  h.farbe = c;
  h.n = n0;
  h.hoehe = hoehe;
  h.fuge = (1.0 - korn) * 0.35;
  h.rand = rand;
  h.glanz = 0.9;
  h.rauh = 0.35;
  h.schiller = 0.25;
  // Normale aus der Höhe (Oberflächengradient im Bild)
  vec3 dpx = dFdx(p), dpy = dFdy(p);
  float hw = hoehe * uRadius * 0.006 * h.lod;
  float dhx = dFdx(hw), dhy = dFdy(hw);
  vec3 r1 = cross(dpy, n0), r2 = cross(n0, dpx);
  float det = dot(dpx, r1);
  if (abs(det) > 1e-12) h.n = normalize(abs(det) * n0 - sign(det) * (r1 * dhx + r2 * dhy));
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
  float f = 1.0 / uSchuppe;
  // Gitter aus den Phasen des Schuppenfelds (Runde 8): a, b längs der zwei schrägen Reihen; Ableitungen ohne Sprung aus cos und sin
  vec4 ph = texture(tPhasen, vUv);
  float rU = max(dot(ph.xy, ph.xy), 1e-6);
  float rW = max(dot(ph.zw, ph.zw), 1e-6);
  float Uw = atan(ph.y, ph.x);
  float Ww = atan(ph.w, ph.z);
  vec4 phx = dFdx(ph);
  vec4 phy = dFdy(ph);
  vec2 dU = vec2(ph.x * phx.y - ph.y * phx.x, ph.x * phy.y - ph.y * phy.x) / rU;
  vec2 dW = vec2(ph.z * phx.w - ph.w * phx.z, ph.z * phy.w - ph.w * phy.z) / rW;
  vec2 gab = vec2(Uw + Ww, Uw - Ww) / 6.2831853;
  vec2 da = (dU + dW) / 6.2831853;
  vec2 db = (dU - dW) / 6.2831853;
  vec3 dpx = dFdx(p);
  vec3 dpy = dFdy(p);
  float detJ = da.x * db.y - da.y * db.x;
  vec3 pa = abs(detJ) > 1e-14 ? (dpx * db.y - dpy * db.x) / detJ : vec3(0.0);
  vec3 pb = abs(detJ) > 1e-14 ? (dpy * da.x - dpx * da.y) / detJ : vec3(0.0);
  h.lod = smoothstep(2.5, 7.0, 1.0 / max(length(da) + length(db), 1e-6));
  vec2 fz = fract(gab) - 0.5;
  // die oberste Schuppe: unter den Zellen (-1,-1), (-1,0), (0,-1), (0,0) die vorderste, die den Punkt deckt; jede Schuppe reicht
  // nach hinten über ihre Zelle hinaus (FORM.x) und ist eine gerundete Raute (Norm FORM.y, Breite FORM.z)
  float innen = -1.0;
  vec2 uv = vec2(0.0);
  vec2 xyB = fz;
  float schatten = 1.0;
  bool gefunden = false;
  for (int k = 0; k < 4; k++) {
    int kk = k == 0 ? 3 : (k == 1 ? 1 : (k == 2 ? 2 : 0));
    vec2 o = -vec2(float(kk - (kk / 2) * 2), float(kk / 2));
    vec2 xy = fz - o;
    float u = xy.x + xy.y;
    float v = xy.x - xy.y;
    float uu = (u - FORM.x * 0.5) / (1.0 + FORM.x * 0.5);
    float vv = v / FORM.z;
    float d = pow(pow(abs(uu), FORM.y) + pow(abs(vv), FORM.y), 1.0 / FORM.y);
    float inn = 1.0 - d;
    if (!gefunden && inn > 0.0) { gefunden = true; innen = inn; uv = vec2(u, v) * 0.5; xyB = xy; }
    else if (!gefunden) schatten = min(schatten, -inn);
  }
  // Mitte der Schuppe im Raum: von hier um die Lage in der Zelle zurück; dort wird das Muster gelesen
  vec3 pm = p - pa * xyB.x - pb * xyB.y;
  // wo das Gitter verzerrt ist (Zellen viel größer als eine Schuppe, Wirbel), ist die geschätzte Mitte unsicher: dort der Punkt selbst
  float guete = smoothstep(3.0, 1.4, (length(pa) + length(pb)) / uRadius * f);
  vec3 qm = mix(q, (pm - uMitte) / uRadius, h.lod * guete);
  vec3 mz = qm * f;
  float id = clamp(0.5 + 0.55 * snoise(qm * f * 1.3), 0.0, 1.0);
  float uN = clamp(uv.x * 2.0 / (1.0 + FORM.x), -0.8, 1.0);
  float unter = 1.0 - smoothstep(0.0, 0.18, schatten);
  float fuge = innen < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.08, innen);
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
/**
 * eine Schlange auf dem Schuppenfeld (Runde 8): form = (Überstand nach hinten, Rundung der Raute 1 spitz … 2 rund, Breite, frei)
 */
function schlange(form: string, kiel: string, muster: string, bauchfarbe: string, glanz: string, rauh: string, schiller = '0.0'): string {
  return /* glsl */ `
uniform sampler2D tPhasen;
uniform float uSchuppe;
Haut hautBei(vec3 p, vec3 n0, int stil) {
  const vec4 FORM = ${form};
  ${SCHLANGE_KOPF}
  ${muster}
  const float KIEL = ${kiel};
  const vec3 BAUCHFARBE = ${bauchfarbe};
  ${SCHLANGE_ENDE}
  h.glanz = ${glanz};
  h.rauh = ${rauh};
  h.schiller = ${schiller} * (1.0 - bauch * 0.6);
  return h;
}
`;
}

const PYTHON = schlange(
  'vec4(0.3, 1.7, 0.98, 0.0)',
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
  '0.2',
  '0.7',
);
const KLAPPER = schlange(
  'vec4(0.42, 1.25, 0.9, 0.0)',
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
  'vec4(0.25, 1.8, 1.0, 0.0)',
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

const BOA = schlange(
  'vec4(0.28, 1.8, 1.0, 0.0)',
  '0.0',
  `// Regenbogenboa: Orange bis Rotbraun, dunkle Ringe (Augenflecken) längs des Rückens, Flecken an den Flanken, starker Schiller
  vec3 c = mix(vec3(0.78, 0.42, 0.18), vec3(0.62, 0.3, 0.14), smoothstep(-0.4, 0.6, snoise(qm * 2.2)));
  float r = length(vec2((fract(laengs * 2.3 + 0.08 * snoise(qm * 3.0)) - 0.5) * 1.1, qm.z * 2.2));
  float ring = 1.0 - smoothstep(0.03, 0.06, abs(r - 0.24));
  float flanke = 1.0 - smoothstep(0.08, 0.13, length(vec2(fract(laengs * 4.6 + 0.5) - 0.5, (abs(qm.z) - 0.34) * 2.5)));
  c = mix(c, vec3(0.08, 0.04, 0.03), max(ring, flanke * 0.9));
  c *= 0.9 + 0.2 * id;`,
  'vec3(0.9, 0.78, 0.6)',
  '1.7',
  '0.12',
  '1.0',
);
const BAUMPYTHON_GLSL = schlange(
  'vec4(0.3, 1.7, 0.98, 0.0)',
  '0.0',
  `// Grüner Baumpython: leuchtendes Grün, längs der Rückenlinie weiße Schuppen in Gruppen, einzelne weiße auf den Flanken
  vec3 c = mix(vec3(0.1, 0.58, 0.16), vec3(0.24, 0.72, 0.2), smoothstep(-0.4, 0.6, snoise(qm * 1.7)));
  float ruecken = 1.0 - smoothstep(0.06, 0.1, abs(qm.z));
  float gruppe = smoothstep(0.3, 0.55, snoise(vec3(laengs * 7.0, 0.0, 3.0)));
  if (ruecken * gruppe > 0.5 && id > 0.35) c = vec3(0.95, 0.96, 0.9);
  if (id > 0.93 && snoise(qm * 4.0) > 0.4) c = vec3(0.92, 0.95, 0.88);
  c *= 0.92 + 0.14 * id;`,
  'vec3(0.86, 0.9, 0.32)',
  '1.6',
  '0.14',
  '0.3',
);

const KROKODIL_GLSL = /* glsl */ `
uniform sampler2D tPhasen;
uniform float uSchuppe;
/**
 * Krokodil (Runde 8, auf dem Schuppenfeld, rechtwinklig gelesen): oben Knochenschilde in Querreihen (Zeilen der Längsphase U, Spalten
 * der Querphase W), jeder mit einem Kiel längs, die Kiele bilden Längsgrate, Grübchen im Knochen; an den Flanken kleine runde Schuppen
 * mit einzelnen Höckern; am Bauch Quadrate mit einem Sinnespunkt. Matt mit nassen Inseln, Schlamm in den Furchen.
 */
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
  vec4 ph = texture(tPhasen, vUv);
  float Uw = atan(ph.y, ph.x) / 6.2831853 + 0.5;
  float Ww = atan(ph.w, ph.z) / 6.2831853 + 0.5;
  vec2 dU = vec2(dFdx(Uw), dFdy(Uw));
  vec2 dW = vec2(dFdx(Ww), dFdy(Ww));
  h.lod = smoothstep(2.0, 6.0, uMass * uRadius * uSchuppe);
  float oben = 1.0 - smoothstep(0.36, 0.44, t + 0.04 * snoise(q * 5.0));
  float bauchM = smoothstep(0.66, 0.74, t);
  // Zelle im Schuppenfeld: u längs (0 vorn … 1 hinten), w quer
  vec2 f2 = vec2(Uw, Ww);
  vec2 zf = fract(f2 * vec2(1.0, oben > 0.5 ? 1.0 : 2.0));
  vec2 zid = floor(f2 * vec2(1.0, oben > 0.5 ? 1.0 : 2.0));
  vec2 d = abs(zf - 0.5);
  float rand = 0.5 - max(d.x, d.y * 1.05);
  float aaR = (length(dU) + length(dW)) * 1.5 + 1e-3;
  float fuge = 1.0 - smoothstep(0.0, 0.06 + aaR, rand);
  // je Schild ein wenig anders (die Zeilen des Felds wiederholen sich, darum aus dem Raum)
  float idz = clamp(0.5 + 0.55 * snoise(q / uSchuppe * 1.3), 0.0, 1.0);
  vec3 farbe;
  float hoehe;
  if (bauchM > 0.5) {
    // Bauch: glatte Quadrate in Reihen, je ein Sinnespunkt nahe der Hinterkante
    vec2 fb = fract(f2 * vec2(1.0, 2.5));
    vec2 db = abs(fb - 0.5);
    float rb = 0.5 - max(db.x, db.y);
    fuge = 1.0 - smoothstep(0.0, 0.05 + aaR, rb);
    float punkt = 1.0 - smoothstep(0.02, 0.05, length((fb - vec2(0.72, 0.5)) * vec2(1.0, 1.4)));
    farbe = vec3(0.74, 0.7, 0.54) * (0.92 + 0.12 * idz);
    farbe = mix(farbe, farbe * 0.55, punkt * 0.8);
    hoehe = smoothstep(0.0, 0.1, rb) * 0.6 - punkt * 0.2;
  } else if (oben > 0.5) {
    // Knochenschild: erhabener Block mit steilen Rändern, Kiel längs der Mitte, Grübchen im Knochen
    float kiel = exp(-pow((zf.y - 0.5) / 0.1, 2.0)) * smoothstep(0.0, 0.45, zf.x) * smoothstep(1.0, 0.65, zf.x);
    float gruebchen = smoothstep(0.3, 0.7, snoise(q / uSchuppe * 5.0));
    hoehe = smoothstep(0.0, 0.1, rand) * 0.7 + kiel * 0.55 - gruebchen * 0.12 + 0.08 * snoise(q / uSchuppe * 2.0);
    farbe = mix(vec3(0.17, 0.18, 0.11), vec3(0.27, 0.27, 0.16), idz);
    farbe = mix(farbe, vec3(0.09, 0.09, 0.06), smoothstep(0.2, 0.6, sin(dot(q, A) * 9.0 + 1.5 * snoise(q * 1.5))) * 0.5);
    farbe = mix(farbe, farbe * 1.3 + 0.03, kiel * 0.3);
    farbe *= 1.0 - gruebchen * 0.25;
  } else {
    // Flanke: kleine Kiesel (Zellen im Raum), einzelne Höcker, dunkle Flecken
    vec4 vk = voronoiF3(q / uSchuppe * 2.4);
    float rk = vk.y - vk.x;
    float hk = hash11(vk.w * 7.0);
    hoehe = smoothstep(0.0, 0.25, rk) * (hk > 0.88 ? 1.2 : 0.55);
    fuge = 1.0 - smoothstep(0.0, 0.12, rk);
    rand = rk;
    farbe = mix(vec3(0.26, 0.27, 0.16), vec3(0.4, 0.38, 0.24), smoothstep(0.35, 0.7, t)) * (0.85 + 0.25 * hk);
    farbe = mix(farbe, vec3(0.09, 0.09, 0.06), smoothstep(0.45, 0.6, snoise(q * 4.0)) * 0.7);
  }
  // Normale aus der Höhe (Oberflächengradient im Bild)
  vec3 dpx = dFdx(p), dpy = dFdy(p);
  float hw = hoehe * uRadius * 0.012 * h.lod;
  float dhx = dFdx(hw), dhy = dFdy(hw);
  vec3 r1 = cross(dpy, n0), r2 = cross(n0, dpx);
  float detB = dot(dpx, r1);
  h.n = abs(detB) > 1e-12 ? normalize(abs(detB) * n0 - sign(detB) * (r1 * dhx + r2 * dhy)) : n0;
  h.n = normalize(h.n + vec3(snoise(q * 140.0), snoise(q * 140.0 + 4.0), snoise(q * 140.0 + 8.0)) * 0.04 * h.lod);
  // Schlamm in den Furchen, nasse Inseln
  float schlamm = fuge * smoothstep(-0.2, 0.4, snoise(q * 3.0 + 7.0));
  farbe = mix(farbe, vec3(0.2, 0.16, 0.1), schlamm * 0.6);
  float nass = smoothstep(0.15, 0.4, snoise(q * 1.8 + 3.0));
  h.farbe = farbe * mix(1.0, 0.72, nass);
  h.hoehe = hoehe;
  h.fuge = fuge;
  h.rand = max(rand, 0.0);
  h.glanz = mix(0.35, 1.5, nass);
  h.rauh = mix(0.7, 0.14, nass);
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

function haut(id: string, name: string, zeile: string, glsl: string, echtGrund: string, regler: ReglerZeile[] = [], grundStil = 1, feld?: FeldWunsch) {
  return bildVoreinstellung({
    ...(feld
      ? {
          uniforms: { tPhasen: { value: null }, uSchuppe: { value: feld.laenge } },
          vorher: (k: ShaderKern, w: ShaderWerte, u: Record<string, IUniform>) => {
            const g = w.regler.groesse ?? 1;
            const wunsch = { laenge: feld.laenge / g, breite: feld.breite / g };
            u.tPhasen!.value = schuppenFeld(k).bild(k, wunsch);
            u.uSchuppe!.value = wunsch.laenge;
          },
        }
      : {}),
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
  'Chamäleon: runde Körnchen mit je einer Farbe, Tuberkel, Bänder, heller Flankenstreifen, rote Punkte; Stimmung verschiebt die Farben von Blaugrün nach Gelb und Orange; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  CHAMAELEON,
  'waldBokeh',
  [{ k: 'stimmung', name: 'Stimmung', min: 0, max: 1, schritt: 0.05, grund: 0.2 }],
  0,
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
  'Python: glatte Schuppen in regelmäßigen schrägen Reihen (Schuppenfeld auf dem Netz), Sättel mit schwarzem Rand Schuppe für Schuppe, Bauchschilde, Glanz mit Schiller; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  PYTHON,
  'waldBokeh',
  [],
  0,
  { laenge: 0.055, breite: 0.048 },
);
export const KLAPPERSCHLANGE = haut(
  'klapperschlange',
  'Klapperschlange',
  'Gekielte Schuppen in schrägen Reihen (ein Grat je Schuppe, matt), Rauten auf dem Rücken mit hellem Saum, Ringe am Schwanzende, Bauchschilde; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  KLAPPER,
  'wuesteGrund',
  [],
  0,
  { laenge: 0.05, breite: 0.038 },
);
export const KORALLENNATTER = haut(
  'korallennatter',
  'Korallennatter',
  'Glänzende Schuppen in Ringen Rot, Gelb, Schwarz, die roten Schuppen mit schwarzer Spitze; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  KORALLE,
  'waldBokeh',
  [{ k: 'ringe', name: 'Ringe', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
  0,
  { laenge: 0.055, breite: 0.05 },
);
export const REGENBOGENBOA = haut(
  'regenbogenboa',
  'Regenbogenboa',
  'Regenbogenboa: glatte Schuppen in schrägen Reihen, Orange mit dunklen Augenflecken, starker Regenbogenschiller im Licht; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  BOA,
  'waldBokeh',
  [],
  0,
  { laenge: 0.05, breite: 0.045 },
);
export const BAUMPYTHON = haut(
  'baumpython',
  'Grüner Baumpython',
  'Grüner Baumpython: leuchtend grüne Schuppen in schrägen Reihen, weiße Schuppen in Gruppen längs des Rückens, gelber Bauch; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  BAUMPYTHON_GLSL,
  'waldBokeh',
  [],
  0,
  { laenge: 0.05, breite: 0.045 },
);
export const KROKODIL = haut(
  'krokodil',
  'Krokodil',
  'Krokodil: oben Knochenschilde in Querreihen mit Kielen, die Längsgrate bilden (Schuppenfeld), an den Flanken kleine Schuppen und Höcker, Bauchquadrate mit Sinnespunkt, matt mit nassen Inseln und Schlamm; Stile Echt, Anime, Manga, Spider-Verse, Earle',
  KROKODIL_GLSL,
  'unterWasser',
  [],
  0,
  { laenge: 0.09, breite: 0.085 },
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
