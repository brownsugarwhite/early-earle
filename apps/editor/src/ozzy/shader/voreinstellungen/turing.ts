/**
 * Turing-Haut (frei; experimentelle Visualisierung, lebende Simulation). Reaktion–Diffusion nach Gray–Scott, nicht im Bild, sondern
 * in einem Volumen um die Form (64 × 64 × 64 Zellen, als 8 × 8 Kacheln in einem Bild): Zwei Stoffe reagieren und breiten sich aus,
 * Muster wachsen von Keimen aus über die Haut, wie Alan Turing es 1952 für Tierfelle vorgeschlagen hat. Die Werte der Reaktion
 * hängen von der Höhe ab: oben Labyrinth, unten Flecken, dazwischen ein Übergang, und sie wandern langsam, sodass sich die Haut
 * verändert. Die Haut liest das Volumen an ihrer Lage (Kachel für Kachel gemischt), wölbt sich mit dem Muster und glänzt nass wie
 * ein Pfeilgiftfrosch (Farbton einstellbar). Bühne: dunkles Grün mit Unschärfe.
 */
import type { RawShaderMaterial, Texture } from 'three';
import { BILD_KOPF } from '../bildShader';
import { GDaten } from '../daten';
import { RAUSCHEN } from '../glsl';
import type { ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';

const N = 64;
const KACHELN = 8;
const B = N * KACHELN;

const SCHRITT = /* glsl */ `
${RAUSCHEN}
uniform sampler2D tAlt;
uniform float uSaat;
uniform float uMorph;
out vec4 farbe;
const float N = ${N}.0;
const int K = ${KACHELN};
vec2 zelle(int x, int y, int z) {
  x = clamp(x, 0, ${N - 1}); y = clamp(y, 0, ${N - 1}); z = clamp(z, 0, ${N - 1});
  ivec2 p = ivec2((z % K) * ${N} + x, (z / K) * ${N} + y);
  return texelFetch(tAlt, p, 0).rg;
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  int x = p.x % ${N}, y = p.y % ${N};
  int z = (p.y / ${N}) * K + (p.x / ${N});
  vec2 c = zelle(x, y, z);
  if (uSaat > 0.5) {
    vec3 q = vec3(float(x), float(y), float(z));
    float keim = step(0.996, hash13(floor(q / 2.0) * 1.37 + 0.5));
    farbe = vec4(1.0, keim, 0.0, 1.0);
    return;
  }
  vec2 lap = zelle(x + 1, y, z) + zelle(x - 1, y, z) + zelle(x, y + 1, z) + zelle(x, y - 1, z) + zelle(x, y, z + 1) + zelle(x, y, z - 1) - 6.0 * c;
  float h = float(y) / N;
  // oben Labyrinth (F 0,055, k 0,062), unten Flecken (F 0,030, k 0,062); langsam wandernd
  float m = smoothstep(0.25, 0.75, h + 0.15 * sin(uMorph));
  float F = mix(0.0367, 0.0545, m);
  float kk = mix(0.0649, 0.062, m);
  float U = c.r, V = c.g;
  float uvv = U * V * V;
  U += 0.05 * lap.r - uvv + F * (1.0 - U);
  V += 0.025 * lap.g + uvv - (F + kk) * V;
  farbe = vec4(clamp(U, 0.0, 1.0), clamp(V, 0.0, 1.0), 0.0, 1.0);
}
`;

const ENDE = /* glsl */ `
${BILD_KOPF}
uniform sampler2D tVolumen;
uniform float uFarbton;
uniform float uPruef;
const float N = ${N}.0;
const float K = ${KACHELN}.0;
float vBei(vec3 p) {
  vec3 q = clamp((p - (uMitte - uRadius)) / (2.0 * uRadius), 0.0, 1.0) * (N - 1.0);
  float z0 = floor(q.z), z1 = min(z0 + 1.0, N - 1.0);
  vec2 inKachel = (q.xy + 0.5) / (N * K);
  vec2 k0 = vec2(mod(z0, K), floor(z0 / K)) / K;
  vec2 k1 = vec2(mod(z1, K), floor(z1 / K)) / K;
  float a = texture(tVolumen, k0 + inKachel).g;
  float b = texture(tVolumen, k1 + inKachel).g;
  return mix(a, b, q.z - z0);
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 grund = mix(vec3(0.01, 0.03, 0.02), vec3(0.04, 0.09, 0.06), qb.y);
  for (int i = 0; i < 6; i++) {
    vec2 c = hash21(float(i) * 5.3 + 2.0);
    grund += vec3(0.1, 0.25, 0.12) * 0.12 * smoothstep(0.18, 0.05, length((qb - c) * vec2(uAufl.x / uAufl.y, 1.0)));
  }
  if (g.a < 0.5) {
    float a0 = uBuehne > 0.5 ? 1.0 : 0.0;
    farbe = vec4(linZuSrgb(grund) * a0, a0);
    return;
  }
  float e = uRadius * 2.0 / N;
  float v = vBei(g.p);
  float muster = smoothstep(0.16, 0.28, v);
  if (uPruef > 0.5) { farbe = vec4(vec3(v * 2.5), 1.0); return; }
  // Wölbung aus dem Muster
  vec3 gr = vec3(vBei(g.p + vec3(e, 0.0, 0.0)) - vBei(g.p - vec3(e, 0.0, 0.0)), vBei(g.p + vec3(0.0, e, 0.0)) - vBei(g.p - vec3(0.0, e, 0.0)), vBei(g.p + vec3(0.0, 0.0, e)) - vBei(g.p - vec3(0.0, 0.0, e)));
  vec3 n = normalize(g.n - gr * 1.6);
  vec3 V = zumAuge(g.p);
  vec3 L = ausSicht(normalize(vec3(-0.45, 0.7, 0.55)));
  float diff = max(dot(n, L), 0.0) * 0.8 + 0.2;
  vec3 haut = hsv(vec3(fract(uFarbton / 360.0), 0.95, 0.95));
  vec3 dunkel = vec3(0.015, 0.012, 0.02);
  vec3 c = mix(haut * (0.4 + 0.8 * diff), dunkel, muster);
  // Unterlicht durch die Haut (weich am Rand)
  c += haut * 0.25 * pow(1.0 - max(dot(g.n, V), 0.0), 2.0) * (1.0 - muster);
  // nass: scharfer Glanz und Spiegelung
  float nv = clamp(dot(n, V), 0.0, 1.0);
  c += vec3(1.0) * pow(max(dot(n, normalize(L + V)), 0.0), 90.0) * 2.0;
  c += studio(reflect(-V, n)) * fresnelS(nv, 0.03) * 0.5;
  vec3 aus = linZuSrgb(aces(c * 1.1));
  float a = uBuehne > 0.5 ? 1.0 : maske;
  aus = uBuehne > 0.5 ? mix(linZuSrgb(grund), aus, maske) : aus;
  farbe = vec4(aus * a, a);
}
`;

class Turing implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly schritt: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;
  private gesaet = false;

  constructor(k: ShaderKern) {
    this.daten = new GDaten(k);
    this.schritt = k.flaecheProgramm(SCHRITT, { tAlt: { value: null }, uSaat: { value: 0 }, uMorph: { value: 0 } });
    this.ende = k.flaecheProgramm(ENDE, { tNormal: { value: null }, tLage: { value: null }, tWeich: { value: null }, tHinten: { value: null }, tVolumen: { value: null }, uFarbton: { value: 205 }, uPruef: { value: new URLSearchParams(location.search).get('turingPruef') === '1' ? 1 : 0 } });
  }

  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const v = k.paar('turing:volumen', { breite: B, hoehe: B, art: 'half', filter: 'linear' });
    const u = this.schritt.uniforms;
    if (!this.gesaet) {
      u.uSaat!.value = 1;
      u.tAlt!.value = v.lesen.texture;
      k.flaeche(this.schritt, v.schreiben);
      v.tauschen();
      u.uSaat!.value = 0;
      this.gesaet = true;
    }
    u.uMorph!.value = w.zeit * 0.05;
    const schritte = Math.round(18 * (w.regler.tempo ?? 1));
    for (let i = 0; i < schritte; i++) {
      u.tAlt!.value = v.lesen.texture;
      k.flaeche(this.schritt, v.schreiben);
      v.tauschen();
    }
    const d = this.daten.zeichnen(k);
    const e = this.ende.uniforms;
    e.tNormal!.value = d.normal;
    e.tLage!.value = d.lage;
    e.tVolumen!.value = v.lesen.texture;
    e.uFarbton!.value = w.regler.farbton ?? 205;
    const z = k.ziel('turing:ende', { art: 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }

  unruhig(): boolean {
    return true;
  }

  freigeben(): void {
    this.daten.freigeben();
    this.schritt.dispose();
    this.ende.dispose();
  }
}

export const TURING: Voreinstellung = {
  id: 'turing',
  name: 'Turing-Haut',
  gruppe: 'Frei',
  zeile: 'Reaktion–Diffusion in einem Volumen um die Form: lebende Muster wachsen über die Haut, oben Labyrinth, unten Flecken',
  regler: [
    { k: 'tempo', name: 'Tempo', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 205 },
  ],
  bauen: (k) => new Turing(k),
};
