/**
 * T-Rex (Tiermuster; Florian, 20.11. spät: „kannst du mir noch eine richtig guten t rex shader bauen in verschiedenen styles. Gib dir
 * dabei besonders mühe.“). Recherche: `docs/research/2026-11-20-t-rex-haut-recherche.md`; Plan: Runde 5 in
 * `docs/plans/2026-11-20-ozzy-shader-runde-2.md`.
 *
 * **Eine Haut, fünf Stile.** `rexHaut` rechnet an jedem Punkt der Form dieselbe Haut, gleich welcher Stil:
 * - Pflasterschuppen als Zellen im Raum (keine Ebenen, also keine Nähte; die Normale aus dem genauen Gefälle des Abstands zum Rand),
 *   dazwischen Schmuckschuppen (größere Zellen, ein Teil davon, gehäuft, flache Kegel), auf der Rückenlinie (Spiegelebene, wo die Haut
 *   nach oben zeigt) eine Reihe großer Höcker; Querfalten in Zonen, unten tiefer.
 * - Farbe Schuppe für Schuppe (das Muster an der Mitte der Schuppe gelesen): Gegenschattierung, Querbinden, die zum Bauch hin schmaler
 *   werden und in Flecken zerfallen, mit hellem Saum, Sprenkel; vier Färbungen.
 * - Krallennarben (drei parallele Rillen, glatt und blass), Schmutz in den Fugen, Schlamm von unten (füllt zuerst die Fugen),
 *   Spritzer, Nässe in Flecken.
 * Ist eine Schuppe im Bild kleiner als rund zwei Bildpunkte, tritt sie zurück (Mittelwert statt Flimmern).
 *
 * Die Stile: **Kino** (Abendlicht, Gegenlicht, rot durch dünne Stellen; Bühne Urzeit am Abend), **Spider-Verse** (flache Töne, die
 * Schuppen als Tuschebögen nur auf ihrer Schattenseite, Raster, Schraffur; Comic-Knall), **Earle** (vier harte Stufen, ein Lichtpunkt
 * je Schuppe, Goldringe, Ornament am Bauch; Earles Wald), **Fossil** (versteinerte Haut wie eine Dinosaurier-Mumie: Gestein, Sediment
 * in den Fugen, Risse mit Kristallen und Kitt, Lack; dunkler Saal mit Spot) und **Spielzeug** (Weichplastik: Sprühfarbe,
 * Trockenpinsel, Lasur, Gussnaht längs der Spiegelebene, Klarlack; Kinderzimmer).
 */
import { bildVoreinstellung } from '../bildShader';
import { BUEHNEN } from './buehnen';
import { TIER } from './tiere';

const HAUT = /* glsl */ `
/** Ableitung von smoothstep(a, b, x) nach x */
float glattD(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return 6.0 * t * (1.0 - t) / (b - a); }
/**
 * Pflasterschuppen: Zellen im Raum (x in Zellen), die Mitten mäßig gestreut. Ergebnis: Abstand zum Rand der Zelle (0 an der Fuge, in
 * der Mitte rund 0,4); steigt: Richtung, in der dieser Abstand wächst (Einheitsvektor); mitte: Vektor zur Mitte; id: Kennung
 */
float pflaster(vec3 x, out vec3 steigt, out vec3 mitte, out float id) {
  vec3 p = floor(x), f = fract(x);
  vec3 mb = vec3(0.0), mr = vec3(0.0);
  float md = 9.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 r = b + 0.12 + 0.76 * hash33(p + b) - f;
        float d = dot(r, r);
        if (d < md) { md = d; mr = r; mb = b; }
      }
  md = 9.0;
  steigt = vec3(0.0, 0.0, 1.0);
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = mb + vec3(float(i), float(j), float(k));
        vec3 r = b + 0.12 + 0.76 * hash33(p + b) - f;
        vec3 dr = r - mr;
        float l2 = dot(dr, dr);
        if (l2 > 1e-5) {
          vec3 u = dr * inversesqrt(l2);
          float d = dot(0.5 * (mr + r), u);
          if (d < md) { md = d; steigt = -u; }
        }
      }
  mitte = mr;
  id = hash13(p + mb + 0.37);
  return md;
}
/** die vier Färbungen (sRGB): Rücken, Flanke, Bauch, Binde, Tupfen */
void rexFarben(out vec3 rue, out vec3 fla, out vec3 bau, out vec3 ban, out vec3 tup) {
  int i = int(uR_faerbung + 0.5);
  if (i == 1) { rue = vec3(0.16, 0.19, 0.1); fla = vec3(0.35, 0.39, 0.21); bau = vec3(0.7, 0.67, 0.46); ban = vec3(0.065, 0.085, 0.045); tup = vec3(0.56, 0.57, 0.34); }
  else if (i == 2) { rue = vec3(0.18, 0.18, 0.185); fla = vec3(0.37, 0.36, 0.345); bau = vec3(0.7, 0.68, 0.64); ban = vec3(0.07, 0.07, 0.075); tup = vec3(0.56, 0.54, 0.51); }
  else if (i == 3) { rue = vec3(0.11, 0.085, 0.08); fla = vec3(0.5, 0.17, 0.075); bau = vec3(0.8, 0.64, 0.47); ban = vec3(0.045, 0.03, 0.03); tup = vec3(0.92, 0.48, 0.14); }
  else { rue = vec3(0.17, 0.13, 0.09); fla = vec3(0.43, 0.33, 0.22); bau = vec3(0.76, 0.68, 0.52); ban = vec3(0.075, 0.055, 0.04); tup = vec3(0.64, 0.54, 0.37); }
}
struct RexHaut {
  vec3 farbe;
  vec3 n;
  vec3 q;
  float hoehe;
  float fuge;
  float rand1;
  float rand2;
  float schmuck;
  float kamm;
  float hk;
  float kAbst;
  float kMaske;
  float band;
  float bandAbst;
  float narbe;
  float schlamm;
  float nass;
  float t;
  float lod;
  float id;
  float glanz;
  float rauh;
};
/**
 * Die Haut an einem Punkt der Form (p Welt, n0 glatte Normale). faktor: Größe der Schuppen je Stil (größer: gröber), relief: Tiefe,
 * jeSchuppe: 1 liest das Muster an der Mitte jeder Schuppe (echt), 0 glatt (gezeichnet, gemalt).
 * farbe ist sRGB ohne Licht und ohne Fugen (die dunkelt jeder Stil selbst ab); n die Normale mit Relief; hoehe 0 (Fuge) … 1 (Kuppe);
 * fuge 1 in Fugen und Falten.
 */
RexHaut rexHaut(vec3 p, vec3 n0, float faktor, float relief, float jeSchuppe) {
  RexHaut r;
  vec3 q = (p - uMitte) / uRadius;
  r.q = q;
  vec3 A, B, C;
  achsen(A, B, C);
  vec3 At = A - n0 * dot(A, n0);
  vec3 Zt = vec3(0.0, 0.0, 1.0) - n0 * n0.z;
  float tt = acos(clamp(n0.y, -1.0, 1.0)) / 3.14159;
  r.t = tt;
  // 1. Pflasterschuppen, gewölbt bis zur Mitte; ihre Größe schwankt über die Haut (feiner, wo sie sich biegt)
  float f1 = 46.0 / (uR_schuppen * faktor) * (1.0 + 0.3 * snoise(q * 1.1 + 6.0));
  r.lod = smoothstep(1.8, 5.0, uMass * uRadius / f1);
  vec3 s1, m1;
  float id1;
  float md1 = pflaster(q * f1, s1, m1, id1);
  float l1 = max(length(m1), 1e-4);
  float e1 = mix(md1, 0.38 - l1, 0.25);
  // Wölbung rund um die Mitte (nicht facettiert); die Fuge kommt aus dem genauen Rand
  float eh = mix(md1, 0.42 - l1, 0.6);
  vec3 ge1 = 0.4 * s1 + 0.6 * m1 / l1;
  float t1 = clamp(eh / 0.36, 0.0, 1.0);
  float h1 = 1.0 - (1.0 - t1) * (1.0 - t1);
  float dh1 = 2.0 * (1.0 - t1) / 0.36;
  // 2. Schmuckschuppen: große Zellen, ein Teil davon, gehäuft, am Bauch selten; flache Kegel
  float f2 = f1 / 3.4;
  float lod2 = smoothstep(1.5, 4.0, uMass * uRadius / f2);
  vec3 s2, m2;
  float id2;
  float md2 = pflaster(q * f2 + 7.31, s2, m2, id2);
  float l2 = max(length(m2), 1e-4);
  float e2 = mix(md2, 0.42 - l2, 0.4);
  vec3 ge2 = 0.6 * s2 + 0.4 * m2 / l2;
  float dichte = (0.14 + 0.3 * smoothstep(0.0, 0.55, snoise(q * 2.2 + 4.0))) * (1.0 - smoothstep(0.55, 0.85, tt));
  float istS = step(id2, dichte);
  float ws = istS * smoothstep(0.1, 0.14, e2);
  // Kuppel: steiler Rand, oben rund
  float t2 = clamp((e2 - 0.1) / 0.32, 0.0, 1.0);
  float h2 = istS * (1.0 - (1.0 - t2) * (1.0 - t2));
  float dh2 = istS * (e2 > 0.1 && e2 < 0.42 ? 2.0 * (1.0 - t2) / 0.32 : 0.0);
  // 3. Rückenhöcker: eine Reihe auf der Spiegelebene, wo die Haut nach oben zeigt, längs gestreckt, kegelig
  float kf = 8.5 / sqrt(uR_schuppen);
  float sk = dot(q, A) * kf;
  float ki = floor(sk);
  float kc = ki + 0.5 + 0.2 * (hash11(ki * 1.37 + 0.5) - 0.5);
  float kr = 0.42 + 0.12 * hash11(ki * 2.71 + 0.3);
  vec2 kd = vec2((sk - kc) / kr, q.z * kf / (kr * 0.7));
  float dk = length(kd);
  float kmaske = smoothstep(-0.1, 0.3, n0.y);
  float hk = kmaske * pow(max(1.0 - dk, 0.0), 1.3);
  vec3 gdk = dk > 1e-4 ? (kd.x * kf / kr * At + kd.y * kf / (kr * 0.7) * Zt) / dk : vec3(0.0);
  vec3 gk = dk < 1.0 ? -kmaske * 1.3 * pow(max(1.0 - dk, 1e-4), 0.3) * gdk : vec3(0.0);
  float wk = kmaske * (1.0 - smoothstep(0.8, 1.0, dk));
  // 4. Querfalten in Zonen, unten tiefer
  float fz = clamp(smoothstep(-0.05, 0.45, snoise(q * 1.25 + 9.0)) + smoothstep(0.5, 0.85, tt) * 0.9, 0.0, 1.0);
  float sf = dot(q, A) * 14.0 + 1.4 * snoise(q * 1.6 + 2.0);
  float sx = sin(3.14159 * sf);
  float falte = pow(1.0 - abs(sx), 4.0) * fz;
  float dfalte = -4.0 * pow(1.0 - abs(sx), 3.0) * sign(sx) * 3.14159 * cos(3.14159 * sf) * 14.0 * fz;
  // 5. Krallennarben: drei parallele Rillen in einzelnen Bereichen
  float narbe = 0.0;
  vec3 gn = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float region = snoise(q * 1.05 + vec3(13.0 + fi * 17.0, 4.0, fi * 5.0 - 2.0));
    float sw = mix(0.86, 0.42, uR_narben);
    if (region < sw || uR_narben < 0.01) continue;
    vec3 D = normalize(hash33(vec3(fi * 7.1 + 1.0, 3.3, 1.9)) - 0.5);
    vec3 Dt = D - n0 * dot(D, n0);
    float v = dot(q, D) * 32.0 + 0.3 * snoise(q * 4.0 + fi * 3.0);
    float k = floor(v);
    if (mod(k + fi * 3.0, 7.0) > 2.5) continue;
    // jede Rille eigen lang: ihr Bereich beginnt etwas anders
    float h = hash11(k * 1.7 + fi * 5.0);
    float m = smoothstep(sw + 0.1 * h, sw + 0.12 + 0.1 * h, region);
    float w = 0.05 + 0.08 * m;
    float x = (fract(v) - 0.5) / w;
    float pr = exp(-x * x * 2.5) * m;
    if (pr > narbe) { narbe = pr; gn = 5.0 * x * pr / w * 32.0 * Dt; }
  }
  // 6. Farbe, Schuppe für Schuppe: das Muster an der Mitte der Schuppe gelesen (echt), sonst glatt
  float js = r.lod * jeSchuppe;
  vec3 qs = mix(q, q + (ws > 0.5 ? m2 / f2 : m1 / f1), js);
  float tn = tt + 0.07 * snoise(qs * 3.1) + 0.03 * snoise(qs * 9.0);
  vec3 rue, fla, bau, ban, tup;
  rexFarben(rue, fla, bau, ban, tup);
  vec3 c = mix(rue, fla, smoothstep(0.2, 0.44, tn));
  c = mix(c, bau, smoothstep(0.64, 0.82, tn));
  // ruhige Fleckung der Grundfarbe (echt kräftiger)
  c *= 0.86 + 0.28 * mix(0.5, smoothstep(-0.5, 0.6, snoise(qs * 2.4 + 3.0) + 0.4 * snoise(qs * 6.0)), 0.5 + 0.5 * jeSchuppe);
  // Querbinden: vom Rücken über die Flanken, zum Bauch hin schmaler, am Ende in Flecken zerfallend, mit hellem Saum
  float bb = dot(qs, A) * 4.3 + 0.55 * snoise(qs * 1.3 + 2.0) + 0.16 * snoise(qs * 4.6);
  float bi = floor(bb);
  float bl = 0.6 + 0.26 * hash11(bi * 5.3 + 0.7);
  float bw = (0.17 + 0.1 * hash11(bi * 3.7 + 0.1)) * (1.0 - smoothstep(bl * 0.55, bl, tn)) * uR_baender;
  bw *= mix(1.0, smoothstep(-0.15, 0.35, snoise(qs * 7.5 + bi * 3.1)), smoothstep(bl * 0.45, bl * 0.9, tn));
  float bAbst = abs(fract(bb) - 0.5) + 0.035 * snoise(qs * 13.0) - bw;
  float aaB = min(fwidth(bb) * 0.6, 0.05) + 0.004;
  float band = (1.0 - smoothstep(-aaB, aaB, bAbst)) * step(0.004, bw);
  float saum = (1.0 - smoothstep(0.03, 0.07, bAbst)) * (1.0 - band) * step(0.004, bw);
  c = mix(c, mix(c, tup, 0.4), saum * 0.4);
  c = mix(c, ban, band * mix(0.97, 0.7, smoothstep(0.5, 0.8, tn)));
  // Sprenkel: einzelne Schuppen dunkel oder hell (nur echt)
  float sp = hash11(id1 * 91.3 + 0.2);
  float flanke = smoothstep(0.22, 0.42, tn) * (1.0 - smoothstep(0.72, 0.88, tn)) * js * (1.0 - ws);
  c = mix(c, ban * 1.25, step(0.94, sp) * (1.0 - band) * flanke * 0.8);
  c = mix(c, tup, step(sp, 0.05) * flanke * 0.6);
  c *= 0.92 + 0.16 * mix(0.5, id1, js);
  // Schmuckschuppen zur Spitze etwas heller, Höcker dunkel mit heller Spitze
  c = mix(c, mix(c, tup, 0.3), h2 * ws * 0.7);
  c = mix(c, rue * 0.7, wk * 0.75);
  c = mix(c, tup * 0.8, smoothstep(0.55, 0.95, hk) * 0.4);
  // Narben: glatt, blass rosa, am Rand gerötet
  c = mix(c, mix(vec3(0.45, 0.24, 0.21), vec3(0.6, 0.47, 0.42), smoothstep(0.25, 0.75, narbe)), smoothstep(0.1, 0.45, narbe) * 0.85);
  // Fugen und Falten (die Stile dunkeln sie ab)
  float fugeP = (1.0 - smoothstep(0.0, 0.05, e1)) * (1.0 - ws) * (1.0 - wk);
  float fugeS = istS * exp(-pow((e2 - 0.105) / 0.022, 2.0)) * (1.0 - wk);
  float fugeK = kmaske * exp(-pow((dk - 1.0) / 0.13, 2.0));
  float fuge = clamp(max(mix(0.16 * (1.0 - ws) * (1.0 - wk), fugeP, r.lod), max(fugeS * lod2, fugeK)) + falte * 0.85, 0.0, 1.0) * (1.0 - 0.8 * narbe);
  // Schlamm von unten: füllt zuerst die Fugen, dann die Kuppen; Spritzer darüber
  float hy = uHalb.y / uRadius;
  float unten = (q.y + hy) / max(2.0 * hy, 1e-3);
  float sl = 0.03 + 0.27 * uR_schmutz + 0.05 * snoise(q * 3.5 + 1.0) + 0.025 * snoise(q * 11.0);
  float tief = 1.0 - smoothstep(sl - 0.1, sl + 0.02, unten);
  float hoehe = mix(mix(0.65, h1, r.lod), h2, ws);
  hoehe = mix(hoehe, max(hk, 0.55), wk);
  float schlamm = smoothstep(hoehe * 0.9 - 0.06, hoehe * 0.9 + 0.06, tief * 1.25) * step(0.01, uR_schmutz);
  vec3 sv = voronoi3(q * 24.0 + 3.0);
  schlamm = max(schlamm, (1.0 - smoothstep(0.1, 0.16, sv.x)) * step(0.82, sv.z) * (1.0 - smoothstep(sl, sl + 0.22, unten)) * uR_schmutz);
  float nass = clamp(uR_nass * (0.55 + 0.75 * snoise(q * 1.6 + 8.0)) + schlamm * 0.45 * uR_nass, 0.0, 1.0);
  c = mix(c, mix(vec3(0.45, 0.38, 0.3), vec3(0.17, 0.13, 0.095), nass) * (0.92 + 0.12 * snoise(q * 30.0)), schlamm);
  c *= mix(1.0, 0.68, nass * (1.0 - schlamm));
  // Normale aus dem Gefälle (q-Einheiten) aller Teile
  vec3 G = vec3(0.0);
  float wp = (1.0 - ws) * (1.0 - wk) * (1.0 - narbe) * (1.0 - schlamm * 0.85) * r.lod;
  G += 0.16 * relief * dh1 * ge1 * wp;
  G += 0.2 * relief * dh2 * ge2 * (1.0 - wk) * (1.0 - narbe) * (1.0 - schlamm * 0.7) * lod2;
  G += 0.95 * relief * (kr / kf) * gk * (1.0 - schlamm * 0.6);
  G += -0.016 * relief * dfalte * At;
  G += 0.005 * relief * gn;
  G -= n0 * dot(G, n0);
  r.n = normalize(n0 - G);
  r.farbe = c;
  r.hoehe = hoehe * (1.0 - 0.6 * falte);
  r.fuge = fuge;
  r.rand1 = mix(0.3, e1, r.lod);
  r.rand2 = istS > 0.5 ? e2 : -1.0;
  r.schmuck = ws;
  r.kamm = wk;
  r.hk = hk;
  r.kAbst = dk;
  r.kMaske = kmaske;
  r.band = band;
  r.bandAbst = bAbst;
  r.narbe = narbe;
  r.schlamm = schlamm;
  r.nass = nass;
  r.id = id1;
  r.rauh = mix(0.72, 0.5, r.hoehe);
  r.glanz = 0.3;
  r.rauh = mix(r.rauh, 0.4, narbe);
  r.glanz = mix(r.glanz, 0.4, narbe);
  r.rauh = mix(r.rauh, 0.15, nass);
  r.glanz = mix(r.glanz, 1.4, nass);
  float trocken = schlamm * (1.0 - nass);
  r.rauh = mix(r.rauh, 0.95, trocken);
  r.glanz = mix(r.glanz, 0.04, trocken);
  return r;
}
`;

/** Kino: Licht eines Abends; Bühne Urzeit am Abend */
const KINO = /* glsl */ `
/** Kino: warmes Streiflicht, kühles Himmelslicht, Gegenlicht von hinten rechts, rot durch dünne Stellen, Glanz auf den Kuppen */
vec3 rexKino(RexHaut h, vec3 n0, vec3 V, float dicke) {
  // Fugen dunkel, Schmutz darin
  vec3 alb = srgbZuLin(h.farbe) * (1.0 - 0.55 * h.fuge);
  alb = mix(alb, srgbZuLin(vec3(0.24, 0.19, 0.14)), h.fuge * uR_schmutz * 0.35);
  vec3 n = h.n;
  vec3 Lk = ausSicht(normalize(vec3(-0.62, 0.5, 0.6)));
  vec3 Lr = ausSicht(normalize(vec3(0.72, 0.3, -0.62)));
  vec3 sonne = vec3(1.0, 0.8, 0.6) * 2.0;
  vec3 gegen = vec3(1.0, 0.56, 0.28) * 2.2;
  float ao = 1.0 - 0.7 * h.fuge;
  float nk = dot(n, Lk);
  float diff = clamp((nk + 0.08) / 1.08, 0.0, 1.0);
  // Streuung in der Haut: am Übergang zum Schatten rötlich und weich
  float sss = smoothstep(-0.25, 0.05, nk) * (1.0 - smoothstep(0.05, 0.35, nk));
  vec3 c = alb * sonne * diff * mix(1.0, ao, 0.6) + alb * vec3(0.8, 0.25, 0.12) * sss * 0.3;
  // Himmel (kühl) von oben, Boden (warm, dunkel) von unten
  float oben = n.y * 0.5 + 0.5;
  c += alb * mix(vec3(0.16, 0.1, 0.07), vec3(0.24, 0.27, 0.42), oben) * 0.55 * ao;
  // Gegenlicht nur am Umriss der Form (glatte Normale), die Schuppen brechen es
  float rand = pow(1.0 - clamp(dot(n0, V), 0.0, 1.0), 3.0) * smoothstep(-0.1, 0.4, dot(n0, Lr));
  c += gegen * rand * (0.12 + 1.0 * alb) * (0.55 + 0.45 * clamp(dot(n, Lr) * 2.0, 0.0, 1.0)) * ao;
  // Licht durch dünne Stellen (rot, wie eine Hand vor der Lampe), nur im Gegenlicht
  float durch = exp(-dicke / (0.06 * uRadius)) * pow(max(dot(V, -Lr), 0.0), 1.5);
  c += vec3(1.0, 0.22, 0.06) * durch * 0.35;
  // Glanz: matt mit leichtem Schimmer auf den Kuppen, glatt auf Narben und nassen Stellen
  vec3 H = normalize(Lk + V);
  c += sonne * ggx(max(dot(n, H), 0.0), h.rauh) * fresnelS(max(dot(H, V), 0.0), 0.04) * max(nk, 0.0) * h.glanz;
  vec3 Hr = normalize(Lr + V);
  c += gegen * ggx(max(dot(n, Hr), 0.0), h.rauh) * fresnelS(max(dot(Hr, V), 0.0), 0.04) * max(dot(n, Lr), 0.0) * h.glanz * 0.7;
  return c;
}
`;

/** Spider-Verse und Earle */
const ZEICHNUNG = /* glsl */ `
/** Spider-Verse: zwei flache Töne, Raster, Schraffur, die Schuppen als Tuschebögen auf ihrer Schattenseite, Glanzpunkte auf den Kuppen */
vec3 rexComic(RexHaut h, vec3 n0, vec3 V, vec2 css) {
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
  float v = dot(normalize(mix(n0, h.n, 0.25)), L);
  // Comicfarben, flach mit harten Grenzen: Erde wird Grün, Wald Türkis, Asche kühles Grau, Glut Rot; Rücken dunkler, Bauch gelb
  int fi = int(uR_faerbung + 0.5);
  vec3 grund = fi == 1 ? vec3(0.13, 0.6, 0.56) : (fi == 2 ? vec3(0.56, 0.58, 0.7) : (fi == 3 ? vec3(0.93, 0.25, 0.15) : vec3(0.3, 0.68, 0.28)));
  float aaT = fwidth(h.t) + 1e-3;
  vec3 alb = mix(grund * vec3(0.62, 0.7, 0.78), grund, smoothstep(0.26 - aaT, 0.26 + aaT, h.t + 0.03 * snoise(h.q * 6.0)));
  alb = mix(alb, vec3(1.0, 0.86, 0.42), smoothstep(0.68 - aaT, 0.68 + aaT, h.t + 0.03 * snoise(h.q * 6.0 + 2.0)));
  alb = mix(alb, mix(alb, vec3(0.95, 0.9, 0.85), 0.5), smoothstep(0.3, 0.5, h.narbe));
  float aa = fwidth(v) + 1e-3;
  float licht = smoothstep(0.1 - aa, 0.1 + aa, v);
  vec3 c = mix(alb * vec3(0.56, 0.5, 0.8), alb, licht);
  float tiefe = (1.0 - licht) * 0.55 + smoothstep(0.0, -0.7, v) * 0.45;
  c = mix(c, alb * vec3(0.28, 0.22, 0.45), punkt(css, tiefe * 0.55, radians(45.0), 5.5) * 0.9);
  c = mix(c, vec3(0.05, 0.03, 0.09), schraffur(css, smoothstep(-0.3, -0.85, v) * 0.55, radians(-35.0), 4.5) * 0.9);
  // Schuppen: nur die vom Licht abgewandte Seite jeder Schuppe als Bogen, im Schatten kräftiger, im vollen Licht keine
  float schatt = 1.0 - smoothstep(0.0, 0.55, v);
  float abgewandt = smoothstep(0.02, 0.18, dot(n0, L) - dot(h.n, L));
  float aaR = fwidth(h.rand1) + 1e-3;
  float breite = 0.02 + 0.05 * schatt;
  float bogen = (1.0 - smoothstep(breite - aaR, breite + aaR, h.rand1)) * abgewandt * smoothstep(0.15, 0.45, schatt) * (1.0 - h.schmuck) * (1.0 - h.kamm) * h.lod;
  // Schmuckschuppen und Höcker ganz umrandet
  float aaS = fwidth(h.rand2) + 1e-3;
  float ring = h.rand2 > 0.0 ? 1.0 - smoothstep(0.02 - aaS, 0.02 + aaS, abs(h.rand2 - 0.115)) : 0.0;
  float aaK = fwidth(h.kAbst) + 1e-3;
  float kring = (1.0 - smoothstep(0.07 - aaK, 0.07 + aaK, abs(h.kAbst - 0.97))) * step(0.3, h.kMaske);
  c = mix(c, vec3(0.04, 0.02, 0.08), max(bogen, max(ring, kring)));
  // Bänder tiefer in Tusche
  c = mix(c, mix(vec3(0.06, 0.02, 0.1), vec3(0.16, 0.06, 0.24), licht), h.band * 0.75);
  // Narben weiß mit Tuscherand
  c = mix(c, vec3(0.04, 0.02, 0.08), smoothstep(0.12, 0.25, h.narbe) * (1.0 - smoothstep(0.4, 0.5, h.narbe)));
  c = mix(c, vec3(0.98, 0.93, 0.88), smoothstep(0.45, 0.6, h.narbe));
  // Glanz als weiße Form, von den Schuppen leicht gebrochen
  float sp = smoothstep(0.962, 0.972, dot(normalize(mix(n0, h.n, 0.3)), normalize(L + V)));
  c = mix(c, vec3(1.0), sp * 0.95);
  vec3 Lr = ausSicht(normalize(vec3(0.85, -0.35, 0.25)));
  float rim = smoothstep(0.6, 0.66, 1.0 - max(dot(n0, V), 0.0)) * smoothstep(0.1, 0.2, dot(n0, Lr));
  c = mix(c, vec3(0.22, 0.86, 0.96), rim * 0.9);
  return srgbZuLin(c);
}
/** Earle: vier harte Stufen im Streiflicht, Schatten in Petrol, ein Lichtpunkt je Schuppe, Goldringe, Ornament am Bauch */
vec3 rexEarle(RexHaut h, vec3 n0, vec3 V) {
  vec3 L = ausSicht(normalize(vec3(-0.85, 0.32, 0.42)));
  float v = dot(normalize(mix(n0, h.n, 0.15)), L);
  vec3 alb = clamp(mix(vec3(dot(h.farbe, vec3(0.299, 0.587, 0.114))), h.farbe, 1.55) * 1.2, 0.0, 1.0);
  vec3 c;
  if (v > 0.55) c = alb * vec3(1.1, 1.04, 0.88) + vec3(0.05, 0.035, 0.0);
  else if (v > 0.18) c = alb * 0.84;
  else if (v > -0.18) c = mix(alb, vec3(0.06, 0.24, 0.27), 0.62) * 0.62;
  else c = vec3(0.03, 0.07, 0.09);
  float hell = v > -0.18 ? 1.0 : 0.35;
  // ein Lichtpunkt je Schuppe, fest an der Form, nur im Licht
  float aaR = fwidth(h.rand1) + 1e-3;
  float lp = smoothstep(0.25 - aaR, 0.25 + aaR, h.rand1) * smoothstep(0.15, 0.35, v) * (1.0 - h.schmuck) * (1.0 - h.kamm) * h.lod;
  c = mix(c, min(alb * 1.35 + 0.14, vec3(1.0)), lp * 0.75);
  // Schmuckschuppen mit Goldring, Höcker mit goldener Spitze
  vec3 gold = vec3(0.96, 0.76, 0.36);
  float aaS = fwidth(h.rand2) + 1e-3;
  float ring = h.rand2 > 0.0 ? 1.0 - smoothstep(0.018 - aaS, 0.018 + aaS, abs(h.rand2 - 0.2)) : 0.0;
  c = mix(c, gold * hell, ring * 0.9);
  c = mix(c, gold * hell, smoothstep(0.55, 0.62, h.hk) * 0.9);
  // Bänder in tiefem Petrol
  c = mix(c, v > 0.18 ? vec3(0.07, 0.15, 0.22) : vec3(0.02, 0.05, 0.07), h.band * 0.85);
  // Bauch: Ornament aus Querbändern in Creme und Gold
  vec3 A, B, C;
  achsen(A, B, C);
  float orn = fract(dot(h.q, A) * 26.0 + 0.15 * snoise(h.q * 3.0));
  float bauch = smoothstep(0.7, 0.76, h.t);
  c = mix(c, (orn < 0.14 ? gold : vec3(0.95, 0.88, 0.7)) * (v > 0.18 ? 1.0 : (v > -0.18 ? 0.62 : 0.3)), bauch * (orn < 0.14 || orn > 0.5 ? 0.85 : 0.0));
  return srgbZuLin(c);
}
`;

/** Fossil und Spielzeug */
const DINGE = /* glsl */ `
/** Fossil: versteinerte Haut (Mumie): Gestein mit Eisen- und Manganflecken, Sediment in den Fugen, Risse mit Kristallen oder Kitt, Lack */
vec3 rexFossil(RexHaut h, vec3 n0, vec3 V) {
  vec3 q = h.q;
  float g1 = fbm3n(q * 2.2 + 3.0, 4);
  vec3 stein = mix(vec3(0.15, 0.125, 0.1), vec3(0.3, 0.25, 0.19), smoothstep(-0.35, 0.4, g1));
  stein = mix(stein, vec3(0.4, 0.21, 0.1), smoothstep(0.2, 0.55, fbm3n(q * 1.4 + 11.0, 3)) * 0.55);
  float dendrit = 1.0 - smoothstep(0.0, 0.04, abs(fbm3n(q * 6.0 + 2.0, 4)));
  stein = mix(stein, vec3(0.04, 0.035, 0.03), dendrit * 0.5 * smoothstep(0.1, 0.4, snoise(q * 1.7 + 6.0)));
  // die Bänder als Schatten im Stein, Schuppe für Schuppe leicht anders
  stein *= 1.0 - 0.28 * h.band;
  stein *= 0.92 + 0.16 * mix(0.5, h.id, h.lod);
  // Gestein der Fundstelle in den Fugen, wo es nicht ganz entfernt wurde; sonst sind die Fugen tief und dunkel
  float matrix = smoothstep(0.05, 0.45, fbm3n(q * 3.0 + 5.0, 3));
  stein = mix(stein * (1.0 - 0.45 * h.fuge), vec3(0.52, 0.46, 0.36), h.fuge * matrix * 0.75);
  // Risse durch das ganze Stück; manche gekittet (breiter, hell, matt)
  vec3 rs, rm;
  float rid;
  float rr = pflaster(q * 4.0 + 1.7, rs, rm, rid) + 0.015 * snoise(q * 30.0);
  float kitt = step(rid, 0.2);
  float rw = mix(0.014, 0.032, kitt);
  float aaR = fwidth(rr) + 0.002;
  float riss = 1.0 - smoothstep(rw - aaR, rw + aaR, rr);
  float kante = (1.0 - smoothstep(rw, rw + 0.05, rr)) * (1.0 - riss);
  vec3 c = mix(stein, stein * 1.4 + 0.03, kante * 0.6 * (1.0 - kitt));
  c = mix(c, kitt > 0.5 ? vec3(0.5, 0.46, 0.39) : vec3(0.015, 0.013, 0.012), riss);
  // Licht des Museums: ein Spot von oben vorn, wenig Füllung, kühles Randlicht
  vec3 L = ausSicht(normalize(vec3(-0.25, 0.88, 0.4)));
  vec3 n = normalize(mix(n0, h.n, 0.8));
  vec3 rst = rs - n0 * dot(rs, n0);
  n = normalize(n + rst * kante * 0.35 * (1.0 - kitt));
  float nl = max(dot(n, L), 0.0);
  vec3 alb = srgbZuLin(c);
  vec3 spot = vec3(1.0, 0.86, 0.68) * 3.4;
  float ao = 1.0 - 0.65 * h.fuge - 0.3 * riss;
  vec3 col = alb * (spot * nl * (0.6 + 0.4 * ao) + vec3(0.05, 0.06, 0.08) * ao);
  float lack = (1.0 - 0.8 * h.fuge) * (1.0 - riss * kitt) * (1.0 - riss * 0.7);
  vec3 Hh = normalize(L + V);
  col += spot * ggx(max(dot(n, Hh), 0.0), 0.3) * fresnelS(max(dot(Hh, V), 0.0), 0.05) * nl * lack * 1.4;
  // Kristalle im offenen Riss: Funken
  vec3 kz = floor(q * 90.0);
  vec3 kn = normalize(hash33(kz) - 0.5 + n0 * 0.6);
  float funke = pow(max(dot(reflect(-V, kn), L), 0.0), 90.0) * step(0.55, hash13(kz + 3.0)) * (riss + kante * 0.6) * (1.0 - kitt);
  col += vec3(1.0, 0.95, 0.85) * funke * 5.0;
  col += vec3(0.22, 0.28, 0.4) * pow(1.0 - max(dot(n0, V), 0.0), 3.0) * 0.35;
  return col;
}
/** Spielzeug: Weichplastik mit Sprühfarbe, Trockenpinsel auf den Kuppen, Lasur in den Fugen, Gussnaht, Klarlack */
vec3 rexSpielzeug(RexHaut h, vec3 n0, vec3 V) {
  vec3 q = h.q;
  // Kunststoff in Spielzeugfarben: Erde orangebraun, Wald grün, Asche grau, Glut rot; Bauch cremefarben
  int fi = int(uR_faerbung + 0.5);
  vec3 grund = fi == 1 ? vec3(0.3, 0.56, 0.18) : (fi == 2 ? vec3(0.5, 0.52, 0.55) : (fi == 3 ? vec3(0.78, 0.14, 0.09) : vec3(0.4, 0.25, 0.12)));
  vec3 bau = fi == 3 ? vec3(0.98, 0.78, 0.3) : vec3(0.93, 0.86, 0.66);
  vec3 c = grund;
  // Rücken dunkler gesprüht (weiche Kante mit Nebel), Bauch heller
  c = mix(c, grund * 0.42, (1.0 - smoothstep(0.12, 0.42, h.t + 0.04 * snoise(q * 40.0))) * 0.85);
  c = mix(c, bau, smoothstep(0.62, 0.82, h.t));
  // Bänder gesprüht: weiche Kante, Sprühnebel daneben
  float nebel = step(0.72, hash13(floor(q * 130.0)));
  float spruehen = 1.0 - smoothstep(-0.05, 0.05, h.bandAbst);
  spruehen = max(spruehen, nebel * (1.0 - smoothstep(0.0, 0.08, h.bandAbst)) * 0.8);
  c = mix(c, grund * 0.3, spruehen * 0.9 * step(0.004, uR_baender));
  // Trockenpinsel: helle Farbe auf den Kuppen der Schuppen; Lasur: dunkel in den Fugen
  c = mix(c, min(c * 1.5 + vec3(0.1, 0.09, 0.05), vec3(1.0)), smoothstep(0.75, 0.97, h.hoehe) * 0.45 * h.lod);
  c *= 1.0 - 0.22 * h.fuge;
  // Gussnaht längs der Spiegelebene: ein feiner Grat
  float nz = q.z / 0.0055;
  float naht = exp(-nz * nz);
  vec3 Zt = vec3(0.0, 0.0, 1.0) - n0 * n0.z;
  vec3 n = normalize(mix(n0, h.n, 0.75) + Zt * nz * naht * 0.55);
  c = mix(c, c * 1.12, naht * 0.5);
  // Licht: weich wie im Studio, Vinyl scheint ein wenig durch, Klarlack spiegelt
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.65, 0.6)));
  vec3 alb = srgbZuLin(c);
  float nl = dot(n, L);
  float wrap = clamp((nl + 0.4) / 1.4, 0.0, 1.0);
  vec3 col = alb * (vec3(1.0, 0.97, 0.92) * 2.1 * wrap + vec3(0.26, 0.28, 0.34) * (0.65 + 0.35 * n.y));
  col += alb * alb * pow(1.0 - max(dot(n0, V), 0.0), 2.0) * 1.2;
  vec3 Hh = normalize(L + V);
  col += vec3(1.0) * ggx(max(dot(n, Hh), 0.0), 0.1) * fresnelS(max(dot(Hh, V), 0.0), 0.045) * max(nl, 0.0) * 2.4;
  col += studio(reflect(-V, normalize(mix(n, n0, 0.5)))) * fresnelS(max(dot(n, V), 0.0), 0.045) * 0.9;
  return col;
}
`;

const FRAGMENT = /* glsl */ `
${TIER}
${BUEHNEN}
${HAUT}
${KINO}
${ZEICHNUNG}
${DINGE}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  int stil = int(uR_stil + 0.5);
  // im Comic sitzt die Farbplatte ein wenig neben der Tusche
  vec2 versatz = stil == 1 ? vec2(1.5, -1.0) * uDpr / uAufl : vec2(0.0);
  GPunkt g = gLesen(vUv + versatz);
  float maske = deckungBei(vUv + versatz);
  vec2 qb = gl_FragCoord.xy / uAufl;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  vec3 bild = vec3(0.0);
  if (a > 0.5 && maske < 0.999) {
    if (stil == 0) bild = urzeitGrund(css, qb);
    else if (stil == 1) bild = comicKnall(css, qb);
    else if (stil == 2) bild = earleGrund(qb, css);
    else if (stil == 3) bild = museumGrund(css, qb);
    else bild = kinderzimmerGrund(css, qb);
    // der Schatten der Form auf der Wand (Fossil, Spielzeug)
    if (stil >= 3) {
      float sch = texture(tWeich, vUv + vec2(0.025, stil == 3 ? 0.05 : 0.04)).r;
      bild *= 1.0 - (stil == 3 ? 0.7 : 0.45) * sch;
    }
  }
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    float faktor = stil == 1 ? 1.7 : (stil == 2 ? 1.8 : (stil == 4 ? 1.25 : 1.0));
    float relief = stil == 4 ? 0.5 : (stil == 3 ? 0.85 : 1.0);
    RexHaut h = rexHaut(g.p, g.n, faktor, relief, stil == 0 || stil == 3 ? 1.0 : 0.0);
    vec3 c;
    if (stil == 0) {
      vec4 hb = texture(tHinten, vUv);
      float dicke = hb.w > g.z ? hb.w - g.z : uRadius * 0.4;
      c = rexKino(h, g.n, V, dicke);
    } else if (stil == 1) c = rexComic(h, g.n, V, css);
    else if (stil == 2) c = rexEarle(h, g.n, V);
    else if (stil == 3) c = rexFossil(h, g.n, V);
    else c = rexSpielzeug(h, g.n, V);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  if (stil == 1 || stil == 2) {
    float linie = kanteBei(vUv, (stil == 1 ? 1.9 : 1.0) * uDpr);
    bild = mix(bild, stil == 1 ? vec3(0.004, 0.004, 0.01) : vec3(0.004, 0.012, 0.016), linie);
    a = max(a, linie);
  }
  vec3 aus = stil == 1 || stil == 2 ? linZuSrgb(bild) : linZuSrgb(aces(bild * 1.05));
  farbe = vec4(aus * a, a);
}
`;

export const TREX = bildVoreinstellung({
  id: 'trex',
  name: 'T-Rex',
  gruppe: 'Tiermuster',
  zeile:
    'T-Rex in fünf Stilen (Kino, Spider-Verse, Earle, Fossil, Spielzeug): Pflasterschuppen mit Schmuckschuppen und Rückenhöckern, Falten, Querbinden, Krallennarben, Schlamm',
  regler: [
    { k: 'stil', name: 'Stil', min: 0, max: 4, schritt: 1, grund: 0, stufen: ['Kino', 'Spider-Verse', 'Earle', 'Fossil', 'Spielzeug'] },
    { k: 'faerbung', name: 'Färbung', min: 0, max: 3, schritt: 1, grund: 0, stufen: ['Erde', 'Wald', 'Asche', 'Glut'] },
    { k: 'schuppen', name: 'Schuppen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'baender', name: 'Bänder', min: 0, max: 1.6, schritt: 0.05, grund: 1 },
    { k: 'narben', name: 'Narben', min: 0, max: 1, schritt: 0.05, grund: 0.6 },
    { k: 'schmutz', name: 'Schmutz', min: 0, max: 1, schritt: 0.05, grund: 0.5 },
    { k: 'nass', name: 'Nässe', min: 0, max: 1, schritt: 0.05, grund: 0.3 },
  ],
  fragment: FRAGMENT,
  rueckseite: true,
  weich: { skala: 0.25, radius: 10 },
  unruhig: () => false,
});
