/**
 * Matrix 2.0 (Effekte; Florian, 21.11.: „Ich habe auch diesen 3js askii shader gefunden … Kannst du diesen noch verbessern und
 * erweitern? Es wird dann mein Matrix 2.0 shader.“; Vorlage `docs/look/ozzy/shader/vorlagen/2026-11-21-ascii-flow.webp`, dort eine
 * Dichterampe aus neun gezeichneten Zeichen). Die Form wird Schrift:
 * - **Echte Glyphen** aus der Schrift des Systems in einem Atlas: alle druckbaren ASCII-Zeichen für die Form, halbbreite Katakana
 *   (gespiegelt wie im Film), Ziffern und Zeichen für den Regen.
 * - **Zeichen nach Form, nicht nur nach Helligkeit:** Ein erster Durchgang misst je Zelle sechs Felder (2 × 3) des schattierten
 *   Bilds und wählt das Zeichen, dessen Tinte in denselben Feldern liegt (Formvektoren, nach Alex Harri); der Kontrast der Felder
 *   wird verstärkt, so werden Kanten scharf. An Silhouetten und Knicken Kantenzeichen (| / - \) nach der Richtung der Kante.
 * - **Regen:** Spalten mit fallenden Strömen (Kopf hell, Spur verblasst, Zeichen wechseln); läuft ein Kopf über die Form, leuchten
 *   ihre Zeichen auf und werden kurz Katakana.
 * - **Röhre:** Phosphorglühen aus den Zellen (weich, bilinear), Zeilen, Vignette, leises Flimmern. Looks: Matrix, Terminal
 *   (fließendes ASCII-Feld wie die Vorlage), Bernstein, Neon.
 */
import { CanvasTexture, DataTexture, FloatType, LinearFilter, type RawShaderMaterial, RGBAFormat, type Texture } from 'three';
import { BILD_KOPF } from '../bildShader';
import { GDaten } from '../daten';
import type { ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';

const LOOKS = ['Matrix', 'Terminal', 'Bernstein', 'Neon'];

/** Mitten der sechs Messkreise in der Zelle (x rechts, y nach unten wie im Atlas), die linke Spalte etwas tiefer (nach Harri) */
const KREISE: [number, number][] = [
  [0.27, 0.2],
  [0.73, 0.15],
  [0.27, 0.53],
  [0.73, 0.47],
  [0.27, 0.86],
  [0.73, 0.8],
];
const KREISE_GLSL = KREISE.map(([x, y]) => `vec2(${x.toFixed(3)}, ${(1 - y).toFixed(3)})`).join(', ');

type Atlas = { tex: CanvasTexture; formen: DataTexture; nAscii: number; nRegen: number; slots: number; zeilen: number };

/** der Atlas: ASCII 32 … 126, dann die Zeichen des Regens; dazu die Formvektoren der ASCII-Zeichen (Tinte in 2 × 3 Feldern) */
function atlasBauen(): Atlas {
  const ascii: string[] = [];
  for (let c = 32; c <= 126; c++) ascii.push(String.fromCharCode(c));
  const regen = Array.from('ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ012345789Z:.=*+<>¦');
  const alle = [...ascii, ...regen];
  const SL = 16;
  const W = 40;
  const H = 64;
  const zeilen = Math.ceil(alle.length / SL);
  const cv = document.createElement('canvas');
  cv.width = SL * W;
  cv.height = zeilen * H;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  alle.forEach((ch, i) => {
    const x = (i % SL) * W + W / 2;
    const y = Math.floor(i / SL) * H + H / 2;
    const istRegen = i >= ascii.length;
    g.save();
    g.translate(x, y);
    if (istRegen && /[｡-ﾟ]/.test(ch)) g.scale(-1, 1);
    g.font = istRegen ? 'bold 46px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "MS Gothic", sans-serif' : 'bold 52px Menlo, "SF Mono", Consolas, "Courier New", monospace';
    g.fillText(ch, 0, 3);
    g.restore();
  });
  const bild = g.getImageData(0, 0, cv.width, cv.height).data;
  const n = ascii.length;
  const roh = new Float32Array(n * 7);
  for (let i = 0; i < n; i++) {
    const x0 = (i % SL) * W;
    const y0 = Math.floor(i / SL) * H;
    let summe = 0;
    for (let f = 0; f < 6; f++) {
      const [cx, cy] = KREISE[f]!;
      let s = 0;
      let z = 0;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const dx = (x + 0.5) / W - cx;
          const dy = (y + 0.5) / H - cy;
          if ((dx / 0.2) ** 2 + (dy / 0.13) ** 2 > 1) continue;
          s += bild[((y0 + y) * cv.width + x0 + x) * 4]!;
          z++;
        }
      roh[i * 7 + f] = s / z / 255;
      summe += roh[i * 7 + f]!;
    }
    roh[i * 7 + 6] = summe / 6;
  }
  // je Feld auf das Maximum über alle Zeichen normieren (das dichteste Zeichen hat dort 1)
  const max = new Float32Array(7);
  for (let i = 0; i < n; i++) for (let f = 0; f < 7; f++) max[f] = Math.max(max[f]!, roh[i * 7 + f]!);
  const daten = new Float32Array(n * 2 * 4);
  for (let i = 0; i < n; i++) {
    const v = (f: number) => roh[i * 7 + f]! / Math.max(max[f]!, 1e-4);
    daten.set([v(0), v(1), v(2), v(3)], i * 4);
    daten.set([v(4), v(5), v(6), 0], (n + i) * 4);
  }
  const formen = new DataTexture(daten, n, 2, RGBAFormat, FloatType);
  formen.needsUpdate = true;
  const tex = new CanvasTexture(cv);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { tex, formen, nAscii: n, nRegen: regen.length, slots: SL, zeilen };
}

/** erster Durchgang: je Zelle ein Bildpunkt (Zeichen, Helligkeit, Deckung, Kante) */
const ZELLEN = /* glsl */ `
${BILD_KOPF}
uniform sampler2D tFormen;
uniform float uAnzahl;
uniform vec2 uZelle;
uniform float uKanten;
uniform float uKontrast;
/** Helligkeit der schattierten Form an einer Stelle (Gerätepunkte); deck: liegt dort die Form */
float hell(vec2 px, out float deck) {
  GPunkt g = gLesen(px / uAufl);
  deck = g.a > 0.5 ? 1.0 : 0.0;
  if (g.a < 0.5) return 0.0;
  vec3 V = zumAuge(g.p);
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
  float d = max(dot(g.n, L), 0.0);
  float rim = pow(1.0 - max(dot(g.n, V), 0.0), 2.5) * 0.55;
  return clamp(0.1 + 0.85 * d + rim, 0.0, 1.0);
}
const vec2 KREIS[6] = vec2[6](${KREISE_GLSL});
void main() {
  vec2 zelle = floor(gl_FragCoord.xy);
  vec2 ecke = zelle * uZelle;
  float v[6];
  float deck = 0.0;
  float mittel = 0.0;
  for (int f = 0; f < 6; f++) {
    vec2 m = ecke + KREIS[f] * uZelle;
    float s = 0.0;
    for (int j = 0; j < 4; j++) {
      vec2 o = (vec2(float(j - (j / 2) * 2), float(j / 2)) - 0.5) * uZelle * vec2(0.2, 0.13);
      float d;
      s += hell(m + o, d);
      deck += d;
    }
    v[f] = s / 4.0;
    mittel += v[f] / 6.0;
  }
  deck /= 24.0;
  // Kontrast der Felder verstärken (Kanten werden scharf)
  float mx = max(max(max(v[0], v[1]), max(v[2], v[3])), max(v[4], v[5]));
  if (mx > 1e-3) for (int f = 0; f < 6; f++) v[f] = pow(v[f] / mx, uKontrast) * mx;
  float best = 1e9;
  float idx = 0.0;
  int N = int(uAnzahl + 0.5);
  for (int i = 0; i < 128; i++) {
    if (i >= N) break;
    vec4 a = texelFetch(tFormen, ivec2(i, 0), 0);
    vec4 b = texelFetch(tFormen, ivec2(i, 1), 0);
    vec4 da = a - vec4(v[0], v[1], v[2], v[3]);
    vec2 db = b.xy - vec2(v[4], v[5]);
    float d = dot(da, da) + dot(db, db);
    if (d < best) { best = d; idx = float(i); }
  }
  // Kante: Deckung oder Helligkeit wechseln quer durch die Zelle stark; die Richtung wählt das Zeichen
  float kante = 0.0;
  if (uKanten > 0.01 && deck > 0.05) {
    float d0, d1, d2, d3;
    float l = hell(ecke + uZelle * vec2(0.12, 0.5), d0) + d0 * 0.6;
    float r = hell(ecke + uZelle * vec2(0.88, 0.5), d1) + d1 * 0.6;
    float u = hell(ecke + uZelle * vec2(0.5, 0.1), d2) + d2 * 0.6;
    float o = hell(ecke + uZelle * vec2(0.5, 0.9), d3) + d3 * 0.6;
    vec2 gr = vec2(r - l, o - u);
    float st = length(gr);
    if (st > 0.55 / max(uKanten, 0.01) && deck < 0.97) {
      float w = atan(gr.y, gr.x);
      float a = mod(w + 3.14159, 3.14159);
      // Gradient waagrecht: senkrechter Strich; senkrecht: waagrechter; schräg: / oder Backslash
      if (a < 0.39 || a > 2.75) idx = 92.0;
      else if (a < 1.18) idx = 60.0;
      else if (a < 1.96) idx = 13.0;
      else idx = 15.0;
      kante = 1.0;
    }
  }
  farbe = vec4(idx, mittel, deck, kante);
}
`;

/** zweiter Durchgang: die Zeichen, der Regen, die Röhre */
const BILD = /* glsl */ `
${BILD_KOPF}
uniform sampler2D tZellen;
uniform sampler2D tAtlas;
uniform vec2 uZelle;
uniform vec2 uRaster;
uniform float uAnzahl;
uniform float uRegenAnzahl;
uniform vec2 uSlots;
uniform float uRegen;
uniform float uTempo;
uniform float uGlut;
uniform float uRoehre;
uniform float uLook;
/** Tinte des Zeichens idx an der Stelle lp der Zelle (0 … 1, y nach oben) */
float glyphe(float idx, vec2 lp) {
  float sx = mod(idx, uSlots.x);
  float sy = floor(idx / uSlots.x);
  vec2 q = vec2((sx + mix(0.06, 0.94, lp.x)) / uSlots.x, 1.0 - (sy + 1.0 - mix(0.04, 0.96, lp.y)) / uSlots.y);
  return texture(tAtlas, q).r;
}
/** Farbrampe des Looks (0 dunkel … 1 hell, darüber weiß) */
vec3 rampe(float b, int look) {
  vec3 a, m, h;
  if (look == 2) { a = vec3(0.06, 0.02, 0.0); m = vec3(0.75, 0.38, 0.04); h = vec3(1.0, 0.8, 0.42); }
  else if (look == 3) { a = vec3(0.05, 0.0, 0.08); m = vec3(0.85, 0.12, 0.78); h = vec3(0.35, 0.95, 1.0); }
  else { a = vec3(0.0, 0.05, 0.02); m = vec3(0.05, 0.62, 0.25); h = vec3(0.71, 1.0, 0.78); }
  vec3 c = b < 0.5 ? mix(a, m, b * 2.0) : mix(m, h, (b - 0.5) * 2.0);
  return mix(c, vec3(0.95, 1.0, 0.96), smoothstep(1.0, 1.35, b));
}
/** Regen in der Zelle: Spur (0 … 1), Kopf, welches Zeichen */
float regenBei(vec2 zelle, out float kopf, out float zeichen) {
  float spalte = zelle.x;
  float zeileOben = uRaster.y - 1.0 - zelle.y;
  float h = 0.0;
  kopf = 0.0;
  for (int k = 0; k < 2; k++) {
    float s = hash11(spalte * 1.37 + float(k) * 7.1);
    float lang = 8.0 + 24.0 * hash11(spalte * 3.1 + float(k) * 1.9);
    float periode = uRaster.y + lang + 6.0 + 30.0 * hash11(spalte * 5.3 + float(k));
    float kopfY = mod(uZeit * uTempo * (5.0 + 14.0 * s) + s * 97.0, periode);
    float d = kopfY - zeileOben;
    if (d >= 0.0 && d < lang) {
      h = max(h, pow(1.0 - d / lang, 1.5));
      if (d < 1.0) kopf = 1.0;
    }
  }
  zeichen = floor(hash12(zelle + floor(uZeit * (1.5 + 7.0 * hash12(zelle * 1.7)) + hash12(zelle * 3.3) * 9.0) * 0.137) * uRegenAnzahl);
  return h * step(hash11(spalte * 9.7 + 0.3), 0.55 * uRegen + 0.12);
}
void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 zelle = floor(px / uZelle);
  vec2 lp = fract(px / uZelle);
  int look = int(uLook + 0.5);
  vec4 z = texelFetch(tZellen, ivec2(min(zelle, uRaster - 1.0)), 0);
  float kopf, rz;
  float regen = look == 1 ? 0.0 : regenBei(zelle, kopf, rz);
  if (look == 1) { kopf = 0.0; rz = 0.0; }
  vec3 grund = look == 2 ? vec3(0.02, 0.008, 0.0) : (look == 3 ? vec3(0.015, 0.0, 0.03) : vec3(0.008, 0.024, 0.016));
  vec3 c = uBuehne > 0.5 ? grund : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  float flimmern = 0.97 + 0.03 * sin(uZeit * 31.0 + zelle.y * 0.7);
  if (z.z > 0.25) {
    // die Form: Zeichen nach Form, Helligkeit nach Licht; ein Kopf des Regens macht sie kurz zu Katakana und hell
    bool kata = regen > 0.82;
    float g = kata ? glyphe(uAnzahl + rz, lp) : glyphe(z.x, lp);
    float b = 0.18 + z.y * 1.15 + regen * 0.45 + kopf * 0.5 + z.w * 0.15;
    vec3 farbeF = rampe(b, look);
    c = mix(c, farbeF * flimmern, g);
    a = max(a, g * z.z);
  } else if (uBuehne > 0.5) {
    if (look == 1) {
      // Terminal wie die Vorlage: ein fließendes Feld aus der Dichterampe " .:-+xo#@"
      vec2 q = zelle * vec2(0.045, 0.07);
      float n = 0.5 + 0.5 * (snoise(vec3(q, uZeit * 0.18)) * 0.7 + snoise(vec3(q * 2.3, uZeit * 0.31 + 4.0)) * 0.3);
      int stufe = int(clamp(n * 1.25 - 0.15, 0.0, 0.999) * 9.0);
      float idx = stufe == 0 ? 0.0 : (stufe == 1 ? 14.0 : (stufe == 2 ? 26.0 : (stufe == 3 ? 13.0 : (stufe == 4 ? 11.0 : (stufe == 5 ? 88.0 : (stufe == 6 ? 79.0 : (stufe == 7 ? 3.0 : 32.0)))))));
      float g = glyphe(idx, lp);
      c = mix(c, rampe(0.06 + n * 0.3, look) * flimmern, g);
    } else {
      float g = glyphe(uAnzahl + rz, lp);
      float b = regen * 0.75 + kopf * 0.65;
      c = mix(c, rampe(b, look) * flimmern, g * step(0.01, regen));
    }
  }
  // Phosphorglühen: die Helligkeit der Zellen, bilinear über die Nachbarn
  vec2 zf = px / uZelle - 0.5;
  vec2 z0 = floor(zf);
  vec2 t = zf - z0;
  float gl = 0.0;
  for (int j = 0; j < 2; j++)
    for (int i = 0; i < 2; i++) {
      vec2 zz = clamp(z0 + vec2(float(i), float(j)), vec2(0.0), uRaster - 1.0);
      vec4 n = texelFetch(tZellen, ivec2(zz), 0);
      float w = (i == 0 ? 1.0 - t.x : t.x) * (j == 0 ? 1.0 - t.y : t.y);
      gl += n.y * n.z * w;
    }
  c += rampe(0.55, look) * gl * 0.22 * uGlut + rampe(0.7, look) * regen * 0.06 * uGlut * step(0.5, uBuehne);
  // Röhre: Zeilen, Vignette
  float zeile = 0.5 + 0.5 * cos(px.y / uDpr * 3.14159);
  c *= mix(1.0, 0.72 + 0.28 * zeile, uRoehre);
  vec2 qb = px / uAufl - 0.5;
  c *= mix(1.0, 1.0 - 0.9 * dot(qb, qb), uRoehre);
  farbe = vec4(c * a, a);
}
`;

class Matrix implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly zellen: RawShaderMaterial;
  private readonly bildP: RawShaderMaterial;
  private readonly atlas: Atlas;
  constructor(k: ShaderKern) {
    this.daten = new GDaten(k);
    this.atlas = atlasBauen();
    this.zellen = k.flaecheProgramm(ZELLEN, {
      tNormal: { value: null },
      tLage: { value: null },
      tWeich: { value: null },
      tHinten: { value: null },
      tFormen: { value: this.atlas.formen },
      uAnzahl: { value: this.atlas.nAscii },
      uZelle: { value: [8, 14] },
      uKanten: { value: 1 },
      uKontrast: { value: 1.6 },
    });
    this.bildP = k.flaecheProgramm(BILD, {
      tNormal: { value: null },
      tLage: { value: null },
      tWeich: { value: null },
      tHinten: { value: null },
      tZellen: { value: null },
      tAtlas: { value: this.atlas.tex },
      uZelle: { value: [8, 14] },
      uRaster: { value: [1, 1] },
      uAnzahl: { value: this.atlas.nAscii },
      uRegenAnzahl: { value: this.atlas.nRegen },
      uSlots: { value: [this.atlas.slots, this.atlas.zeilen] },
      uRegen: { value: 1 },
      uTempo: { value: 1 },
      uGlut: { value: 1 },
      uRoehre: { value: 1 },
      uLook: { value: 0 },
    });
  }
  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const r = w.regler;
    const dpr = k.u.uDpr.value;
    const hoehe = Math.max(5, (r.zelle ?? 14) * dpr);
    const zelle: [number, number] = [Math.max(3, Math.round(hoehe * 0.6)), Math.round(hoehe)];
    const B = k.u.uAufl.value.x;
    const H = k.u.uAufl.value.y;
    const raster: [number, number] = [Math.ceil(B / zelle[0]), Math.ceil(H / zelle[1])];
    const zu = this.zellen.uniforms;
    zu.tNormal!.value = d.normal;
    zu.tLage!.value = d.lage;
    zu.uZelle!.value = zelle;
    zu.uKanten!.value = r.kanten ?? 1;
    zu.uKontrast!.value = r.kontrast ?? 1.6;
    const ziel = k.ziel(`matrix:zellen:${raster[0]}x${raster[1]}`, { breite: raster[0], hoehe: raster[1], art: 'half', filter: 'nearest' });
    k.flaeche(this.zellen, ziel, [0, 0, 0, 0]);
    const bu = this.bildP.uniforms;
    bu.tNormal!.value = d.normal;
    bu.tLage!.value = d.lage;
    bu.tZellen!.value = ziel.texture;
    bu.uZelle!.value = zelle;
    bu.uRaster!.value = raster;
    bu.uRegen!.value = r.regen ?? 1;
    bu.uTempo!.value = r.tempo ?? 1;
    bu.uGlut!.value = r.glut ?? 1;
    bu.uRoehre!.value = r.roehre ?? 1;
    bu.uLook!.value = r.look ?? 0;
    const z = k.ziel('matrix:ende', { art: 'byte' });
    k.flaeche(this.bildP, z, [0, 0, 0, 0]);
    return z.texture;
  }
  unruhig(): boolean {
    return true;
  }
  freigeben(): void {
    this.daten.freigeben();
    this.zellen.dispose();
    this.bildP.dispose();
    this.atlas.tex.dispose();
    this.atlas.formen.dispose();
  }
}

export const MATRIX: Voreinstellung = {
  id: 'matrix',
  name: 'Matrix 2.0',
  gruppe: 'Effekte',
  zeile: 'Die Form wird Schrift: echte Glyphen nach der Form gewählt (Formvektoren, Kantenzeichen), Regen aus Katakana, der über die Form läuft, Phosphorglühen und Röhre; Looks Matrix, Terminal, Bernstein, Neon',
  regler: [
    { k: 'look', name: 'Look', min: 0, max: LOOKS.length - 1, schritt: 1, grund: 0, stufen: LOOKS },
    { k: 'zelle', name: 'Zeichengröße', min: 6, max: 28, schritt: 1, grund: 12 },
    { k: 'regen', name: 'Regen', min: 0, max: 1.6, schritt: 0.05, grund: 1 },
    { k: 'tempo', name: 'Tempo', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'kanten', name: 'Kantenzeichen', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'kontrast', name: 'Schärfe', min: 1, max: 3, schritt: 0.05, grund: 1.6 },
    { k: 'glut', name: 'Glühen', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'roehre', name: 'Röhre', min: 0, max: 1, schritt: 0.05, grund: 0.8 },
  ],
  bauen: (k) => new Matrix(k),
};
