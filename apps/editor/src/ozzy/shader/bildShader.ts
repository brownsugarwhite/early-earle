/**
 * Ein Shader, der im Bild über den Daten der Haut rechnet (G-Puffer): die meisten Looks nach Spider-Verse. Er bekommt die Daten
 * (`tNormal`, `tLage`), auf Wunsch die Rückseite (`tHinten`) und eine weiche Maske der Form (`tWeich`: die Deckung, verkleinert und
 * weichgezeichnet, für Ausbluten, Tropfen, Schatten auf der Bühne), dazu seine Regler als `uR_<Schlüssel>`. Sein Fragment-Shader
 * schreibt `farbe` (sRGB, vormultipliziert).
 */
import { type IUniform, type RawShaderMaterial, type Texture, Vector2 } from 'three';
import { G_LESEN, G_UNIFORMS, GDaten } from './daten';
import { DRUCK, FARBE, LICHT, RAUSCHEN } from './glsl';
import type { ReglerZeile, ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung, ZielArt } from './kern';

/** alles, was ein Bild-Shader vor seinem eigenen Text bekommt */
export const BILD_KOPF = `${G_UNIFORMS}${RAUSCHEN}${FARBE}${DRUCK}${LICHT}${G_LESEN}
uniform sampler2D tWeich;
uniform sampler2D tHinten;
out vec4 farbe;
/** Zeit in Schritten (Animation auf Zweiern: 12, auf Dreiern: 8, auf Vierern: 6 Bilder je Sekunde) */
float schritt(float bilderJeSekunde) { return floor(uZeit * bilderJeSekunde) / bilderJeSekunde; }
/** die Richtung zum Betrachter an einem Punkt der Haut */
vec3 zumAuge(vec3 p) { return uOrtho > 0.5 ? -normalize((uViewInv * vec4(0.0, 0.0, -1.0, 0.0)).xyz) : normalize(uKamPos - p); }
/** eine Richtung aus der Sicht (x rechts, y oben, z zum Betrachter) in die Welt */
vec3 ausSicht(vec3 d) { return normalize((uViewInv * vec4(d, 0.0)).xyz); }
`;

export type BildShaderOptionen = {
  id: string;
  fragment: string;
  regler: ReglerZeile[];
  uniforms?: Record<string, IUniform>;
  /** die Rückseite (Dicke, Durchsicht) */
  rueckseite?: boolean;
  /** weiche Maske: Anteil der Fenstergröße und Radius in Bildpunkten dieser Größe */
  weich?: { skala: number; radius: number };
  /** braucht der Shader jedes Bild (Bewegung)? Standard: ja */
  unruhig?: (w: ShaderWerte) => boolean;
  art?: ZielArt;
  /** vor dem Zeichnen eigene Werte setzen */
  vorher?: (k: ShaderKern, w: ShaderWerte, u: Record<string, IUniform>) => void;
};

const WEICH_RUNTER = /* glsl */ `
uniform sampler2D tNormal;
out vec4 farbe;
void main() {
  vec2 px = 1.0 / vec2(textureSize(tNormal, 0));
  float a = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) a += texture(tNormal, vUv + vec2(float(i), float(j)) * px * 1.5).a;
  farbe = vec4(a / 9.0, 0.0, 0.0, 1.0);
}`;

const WEICH_BLUR = /* glsl */ `
uniform sampler2D tQuelle;
uniform vec2 uRichtung;
uniform float uRadius;
out vec4 farbe;
void main() {
  vec2 px = uRichtung / vec2(textureSize(tQuelle, 0));
  float s = 0.0, w = 0.0;
  for (int i = -12; i <= 12; i++) {
    float x = float(i) / 12.0;
    float g = exp(-4.0 * x * x);
    s += texture(tQuelle, vUv + px * x * uRadius).r * g;
    w += g;
  }
  farbe = vec4(s / w, 0.0, 0.0, 1.0);
}`;

/** die weiche Maske der Form (eine Simulation braucht sie oft; hier ein eigenständiger Baustein) */
export class WeicheMaske {
  private readonly runter: RawShaderMaterial;
  private readonly blur: RawShaderMaterial;
  constructor(k: ShaderKern) {
    this.runter = k.flaecheProgramm(WEICH_RUNTER, { tNormal: { value: null } });
    this.blur = k.flaecheProgramm(WEICH_BLUR, { tQuelle: { value: null }, uRichtung: { value: new Vector2(1, 0) }, uRadius: { value: 8 } });
  }
  rechnen(k: ShaderKern, normal: Texture, name: string, skala: number, radius: number): Texture {
    const a = k.ziel(`${name}:weichA`, { skala, art: 'half' });
    const b = k.ziel(`${name}:weichB`, { skala, art: 'half' });
    this.runter.uniforms.tNormal!.value = normal;
    k.flaeche(this.runter, a);
    const u = this.blur.uniforms;
    u.uRadius!.value = radius;
    u.tQuelle!.value = a.texture;
    (u.uRichtung!.value as Vector2).set(1, 0);
    k.flaeche(this.blur, b);
    u.tQuelle!.value = b.texture;
    (u.uRichtung!.value as Vector2).set(0, 1);
    k.flaeche(this.blur, a);
    return a.texture;
  }
  freigeben(): void {
    this.runter.dispose();
    this.blur.dispose();
  }
}

export class BildShader implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly ende: RawShaderMaterial;
  private readonly weich: WeicheMaske | null;
  private readonly o: BildShaderOptionen;

  constructor(k: ShaderKern, o: BildShaderOptionen) {
    this.o = o;
    this.daten = new GDaten(k);
    this.weich = o.weich ? new WeicheMaske(k) : null;
    const reglerUniforms: Record<string, IUniform> = {};
    for (const r of o.regler) reglerUniforms[`uR_${r.k}`] = { value: r.grund };
    const kopf = o.regler.map((r) => `uniform float uR_${r.k};`).join('\n');
    this.ende = k.flaecheProgramm(`${BILD_KOPF}\n${kopf}\n${o.fragment}`, {
      tNormal: { value: null },
      tLage: { value: null },
      tWeich: { value: null },
      tHinten: { value: null },
      ...reglerUniforms,
      ...(o.uniforms ?? {}),
    });
  }

  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const u = this.ende.uniforms;
    u.tNormal!.value = d.normal;
    u.tLage!.value = d.lage;
    if (this.o.rueckseite) u.tHinten!.value = this.daten.rueckseite(k);
    if (this.weich && this.o.weich) u.tWeich!.value = this.weich.rechnen(k, d.normal, this.o.id, this.o.weich.skala, this.o.weich.radius);
    else u.tWeich!.value = d.normal;
    for (const r of this.o.regler) u[`uR_${r.k}`]!.value = w.regler[r.k] ?? r.grund;
    this.o.vorher?.(k, w, u);
    const z = k.ziel(`${this.o.id}:ende`, { art: this.o.art ?? 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }

  unruhig(w: ShaderWerte): boolean {
    return this.o.unruhig ? this.o.unruhig(w) : true;
  }

  freigeben(): void {
    this.daten.freigeben();
    this.weich?.freigeben();
    this.ende.dispose();
  }
}

/** eine Voreinstellung aus einem Bild-Shader */
export function bildVoreinstellung(v: Omit<Voreinstellung, 'bauen'> & Omit<BildShaderOptionen, 'id' | 'regler'>): Voreinstellung {
  return {
    id: v.id,
    name: v.name,
    gruppe: v.gruppe,
    zeile: v.zeile,
    regler: v.regler,
    bauen: (k) => new BildShader(k, { ...v, id: v.id, regler: v.regler }),
  };
}
