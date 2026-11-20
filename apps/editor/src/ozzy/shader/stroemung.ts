/**
 * Ein 2D-Strömungslöser auf der Grafikkarte (20.11.2026), gemeinsam für Feuer, Tinte und Rauch: Navier–Stokes nach Jos Stam („Stable
 * Fluids“, 1999) in der Form, wie sie sich im Browser bewährt hat: semi-lagrangesche Advektion, Wirbelverstärkung (vorticity
 * confinement), Druck mit Jacobi-Schritten, Auftrieb aus Temperatur und Rauch. Felder: Geschwindigkeit (Zellen je Sekunde, xy),
 * Farbe (vier Kanäle frei: Feuer nimmt Temperatur, Rauch, Brennstoff; Tinte drei Farbstoffe), dazu ein Hindernis (Deckung: 1 frei,
 * 0 fest), außerhalb dessen nichts fließt.
 *
 * Quellen bringt der Shader selbst ein: `einbringen` mit einem Programm, das den alten Stand (`tAlt`) liest und den neuen schreibt.
 */
import { type IUniform, type RawShaderMaterial, type Texture, Vector2, type WebGLRenderTarget } from 'three';
import type { ShaderKern } from './kern';

const ADVEKTION = /* glsl */ `
uniform sampler2D tGeschw;
uniform sampler2D tQuelle;
uniform sampler2D tFrei;
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;
uniform float uMitFrei;
out vec4 farbe;
void main() {
  vec2 v = texture(tGeschw, vUv).xy;
  vec2 p = vUv - uDt * v * uTexel;
  vec4 r = texture(tQuelle, p) / (1.0 + uDissipation * uDt);
  if (uMitFrei > 0.5) r *= step(0.5, texture(tFrei, vUv).r);
  farbe = r;
}`;

const DIVERGENZ = /* glsl */ `
uniform sampler2D tGeschw;
uniform vec2 uTexel;
out vec4 farbe;
void main() {
  float L = texture(tGeschw, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(tGeschw, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture(tGeschw, vUv - vec2(0.0, uTexel.y)).y;
  float T = texture(tGeschw, vUv + vec2(0.0, uTexel.y)).y;
  vec2 C = texture(tGeschw, vUv).xy;
  if (vUv.x - uTexel.x < 0.0) L = -C.x;
  if (vUv.x + uTexel.x > 1.0) R = -C.x;
  if (vUv.y - uTexel.y < 0.0) B = -C.y;
  if (vUv.y + uTexel.y > 1.0) T = -C.y;
  farbe = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const WIRBEL = /* glsl */ `
uniform sampler2D tGeschw;
uniform vec2 uTexel;
out vec4 farbe;
void main() {
  float L = texture(tGeschw, vUv - vec2(uTexel.x, 0.0)).y;
  float R = texture(tGeschw, vUv + vec2(uTexel.x, 0.0)).y;
  float B = texture(tGeschw, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture(tGeschw, vUv + vec2(0.0, uTexel.y)).x;
  farbe = vec4(0.5 * ((R - L) - (T - B)), 0.0, 0.0, 1.0);
}`;

const VERSTAERKEN = /* glsl */ `
uniform sampler2D tGeschw;
uniform sampler2D tWirbel;
uniform sampler2D tFarbe;
uniform vec2 uTexel;
uniform float uDt;
uniform float uWirbelStaerke;
uniform vec2 uAuftrieb;
out vec4 farbe;
void main() {
  float L = texture(tWirbel, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(tWirbel, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture(tWirbel, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture(tWirbel, vUv + vec2(0.0, uTexel.y)).x;
  float C = texture(tWirbel, vUv).x;
  vec2 kraft = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  kraft /= length(kraft) + 1e-4;
  kraft *= uWirbelStaerke * C;
  kraft.y *= -1.0;
  vec2 v = texture(tGeschw, vUv).xy + kraft * uDt;
  // Auftrieb: Temperatur (r) hebt, Rauch (g) drückt
  vec4 f = texture(tFarbe, vUv);
  v.y += uDt * (uAuftrieb.x * f.r - uAuftrieb.y * f.g);
  v = clamp(v, vec2(-3000.0), vec2(3000.0));
  farbe = vec4(v, 0.0, 1.0);
}`;

const DRUCK = /* glsl */ `
uniform sampler2D tDruck;
uniform sampler2D tDivergenz;
uniform vec2 uTexel;
out vec4 farbe;
void main() {
  float L = texture(tDruck, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(tDruck, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture(tDruck, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture(tDruck, vUv + vec2(0.0, uTexel.y)).x;
  float d = texture(tDivergenz, vUv).x;
  farbe = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = /* glsl */ `
uniform sampler2D tDruck;
uniform sampler2D tGeschw;
uniform sampler2D tFrei;
uniform float uMitFrei;
uniform vec2 uTexel;
out vec4 farbe;
void main() {
  float L = texture(tDruck, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(tDruck, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture(tDruck, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture(tDruck, vUv + vec2(0.0, uTexel.y)).x;
  vec2 v = texture(tGeschw, vUv).xy - vec2(R - L, T - B) * 0.5;
  if (uMitFrei > 0.5) v *= step(0.5, texture(tFrei, vUv).r);
  farbe = vec4(v, 0.0, 1.0);
}`;

const SKALIEREN = /* glsl */ `
uniform sampler2D tQuelle;
uniform float uFaktor;
out vec4 farbe;
void main() { farbe = texture(tQuelle, vUv) * uFaktor; }`;

export type StroemungSchritt = {
  dt: number;
  /** Wirbelverstärkung */
  wirbel: number;
  druckSchritte: number;
  /** Abklingen je Sekunde */
  geschwAbklingen: number;
  farbeAbklingen: number;
  /** Auftrieb: (Temperatur hebt, Rauch drückt) */
  auftrieb?: [number, number];
  /** Hindernis (r: 1 frei); fehlt: alles frei */
  frei?: Texture | null;
};

export class Stroemung {
  readonly name: string;
  private readonly k: ShaderKern;
  private readonly skala: number;
  private readonly farbSkala: number;
  private readonly p: Record<string, RawShaderMaterial>;
  private readonly texel = new Vector2();
  private readonly texelFarbe = new Vector2();

  constructor(k: ShaderKern, name: string, o: { skala: number; farbSkala?: number }) {
    this.k = k;
    this.name = name;
    this.skala = o.skala;
    this.farbSkala = o.farbSkala ?? o.skala;
    const u = (x: Record<string, IUniform>): Record<string, IUniform> => x;
    this.p = {
      advektion: k.flaecheProgramm(ADVEKTION, u({ tGeschw: { value: null }, tQuelle: { value: null }, tFrei: { value: null }, uTexel: { value: this.texel }, uDt: { value: 0 }, uDissipation: { value: 0 }, uMitFrei: { value: 0 } })),
      divergenz: k.flaecheProgramm(DIVERGENZ, u({ tGeschw: { value: null }, uTexel: { value: this.texel } })),
      wirbel: k.flaecheProgramm(WIRBEL, u({ tGeschw: { value: null }, uTexel: { value: this.texel } })),
      verstaerken: k.flaecheProgramm(VERSTAERKEN, u({ tGeschw: { value: null }, tWirbel: { value: null }, tFarbe: { value: null }, uTexel: { value: this.texel }, uDt: { value: 0 }, uWirbelStaerke: { value: 0 }, uAuftrieb: { value: new Vector2() } })),
      druck: k.flaecheProgramm(DRUCK, u({ tDruck: { value: null }, tDivergenz: { value: null }, uTexel: { value: this.texel } })),
      gradient: k.flaecheProgramm(GRADIENT, u({ tDruck: { value: null }, tGeschw: { value: null }, tFrei: { value: null }, uMitFrei: { value: 0 }, uTexel: { value: this.texel } })),
      skalieren: k.flaecheProgramm(SKALIEREN, u({ tQuelle: { value: null }, uFaktor: { value: 0.8 } })),
    };
  }

  geschw(): { lesen: WebGLRenderTarget; schreiben: WebGLRenderTarget; tauschen(): void } {
    return this.k.paar(`${this.name}:geschw`, { skala: this.skala, art: 'half' });
  }
  farbe(): { lesen: WebGLRenderTarget; schreiben: WebGLRenderTarget; tauschen(): void } {
    return this.k.paar(`${this.name}:farbe`, { skala: this.farbSkala, art: 'half' });
  }
  private druckPaar(): { lesen: WebGLRenderTarget; schreiben: WebGLRenderTarget; tauschen(): void } {
    return this.k.paar(`${this.name}:druck`, { skala: this.skala, art: 'half', filter: 'nearest' });
  }

  /** ein Programm über ein Feld laufen lassen, das den alten Stand liest (`tAlt`) */
  einbringen(feld: 'geschw' | 'farbe', programm: RawShaderMaterial): void {
    const p = feld === 'geschw' ? this.geschw() : this.farbe();
    programm.uniforms.tAlt!.value = p.lesen.texture;
    this.k.flaeche(programm, p.schreiben);
    p.tauschen();
  }

  schritt(o: StroemungSchritt): void {
    const k = this.k;
    const g = this.geschw();
    const f = this.farbe();
    this.texel.set(1 / g.lesen.width, 1 / g.lesen.height);
    this.texelFarbe.set(1 / f.lesen.width, 1 / f.lesen.height);
    const P = this.p;
    const mitFrei = o.frei ? 1 : 0;
    // Wirbel und Auftrieb
    const wirbelZiel = k.ziel(`${this.name}:wirbel`, { skala: this.skala, art: 'half', filter: 'nearest' });
    P.wirbel!.uniforms.tGeschw!.value = g.lesen.texture;
    k.flaeche(P.wirbel!, wirbelZiel);
    const v = P.verstaerken!.uniforms;
    v.tGeschw!.value = g.lesen.texture;
    v.tWirbel!.value = wirbelZiel.texture;
    v.tFarbe!.value = f.lesen.texture;
    v.uDt!.value = o.dt;
    v.uWirbelStaerke!.value = o.wirbel;
    (v.uAuftrieb!.value as Vector2).set(o.auftrieb?.[0] ?? 0, o.auftrieb?.[1] ?? 0);
    k.flaeche(P.verstaerken!, g.schreiben);
    g.tauschen();
    // Divergenz, Druck, Gradient
    const div = k.ziel(`${this.name}:div`, { skala: this.skala, art: 'half', filter: 'nearest' });
    P.divergenz!.uniforms.tGeschw!.value = g.lesen.texture;
    k.flaeche(P.divergenz!, div);
    const d = this.druckPaar();
    P.skalieren!.uniforms.tQuelle!.value = d.lesen.texture;
    P.skalieren!.uniforms.uFaktor!.value = 0.8;
    k.flaeche(P.skalieren!, d.schreiben);
    d.tauschen();
    P.druck!.uniforms.tDivergenz!.value = div.texture;
    for (let i = 0; i < o.druckSchritte; i++) {
      P.druck!.uniforms.tDruck!.value = d.lesen.texture;
      k.flaeche(P.druck!, d.schreiben);
      d.tauschen();
    }
    const gr = P.gradient!.uniforms;
    gr.tDruck!.value = d.lesen.texture;
    gr.tGeschw!.value = g.lesen.texture;
    gr.tFrei!.value = o.frei ?? null;
    gr.uMitFrei!.value = mitFrei;
    k.flaeche(P.gradient!, g.schreiben);
    g.tauschen();
    // Geschwindigkeit und Farbe mitführen
    const a = P.advektion!.uniforms;
    a.tGeschw!.value = g.lesen.texture;
    a.tQuelle!.value = g.lesen.texture;
    a.tFrei!.value = o.frei ?? null;
    a.uMitFrei!.value = mitFrei;
    a.uDt!.value = o.dt;
    a.uDissipation!.value = o.geschwAbklingen;
    k.flaeche(P.advektion!, g.schreiben);
    g.tauschen();
    a.tGeschw!.value = g.lesen.texture;
    a.tQuelle!.value = f.lesen.texture;
    a.uDissipation!.value = o.farbeAbklingen;
    k.flaeche(P.advektion!, f.schreiben);
    f.tauschen();
  }

  /** beide Felder leeren */
  leeren(): void {
    for (const p of [this.geschw(), this.farbe(), this.druckPaar()]) {
      this.k.loeschen(p.lesen);
      this.k.loeschen(p.schreiben);
    }
  }

  freigeben(): void {
    for (const m of Object.values(this.p)) m.dispose();
    this.k.zieleFreigeben(`${this.name}:`);
  }
}
