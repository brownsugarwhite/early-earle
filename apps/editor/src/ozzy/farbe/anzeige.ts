/**
 * Ozzy, Paint-Modus, Etappe 1 (19.11.2026): die Farbe auf der Haut zeichnen. Gezeichnet wird über das Grundmaterial, mit denselben
 * Punkten wie die glatte Anzeige der Haut (`HautNetz`), in zwei Teilen:
 *
 * - **Innen:** Dreiecke des Rechennetzes, die ganz zu einer Füllung gehören: ihre feinen Dreiecke als Liste auf den Punkten der
 *   Anzeige, eine Farbe je Füllung.
 * - **Rand:** Dreiecke, durch die eine Farblinie läuft. Jeder Bildpunkt kennt seine Lage im Dreieck des Rechennetzes (zwei
 *   Gewichte) und rechnet selbst, auf welcher Seite der nächsten Kette er liegt und wie weit von ihr (in Bildpunkten). Die Kante
 *   zwischen zwei Farben ist darum bei jedem Zoom einen Bildpunkt breit, gleich auf welcher Stufe die Anzeige gerade steht, und im
 *   Netz wird nichts geschnitten. Die Ketten eines Dreiecks stehen in einer Datentextur.
 *
 * Etappe 3: Eine Füllung kann einlaufen (`FlussBild`). Jede Stelle ihrer Fläche kennt ihre Weite von der Saat (`fliessen.ts`: je
 * Punkt, in den Dreiecken mit Farblinien je Kette und Seite); zu sehen ist die neue Farbe, wo die Front schon war, davor liegt,
 * was vorher dort lag. Die Front ist eine flüssige Kante: ein wenig wellig, mit einem Wulst dahinter. Je Bild ändern sich nur
 * Zahlen (`flussSetzen`), nichts wird neu gebaut.
 *
 * Etappe 4: weiche Kanten (`WeichBild`). Trägt eine Farblinie eine Breite, läuft die Farbe der einen Seite weich in die der
 * anderen: an der Farblinie die Mitte, im Abstand der Breite die reine Farbe. Abstand und Breite stehen je Punkt des Rechennetzes
 * (`weich.ts`) und werden in jedem Dreieck aus seinen drei Ecken gemischt: innen als Werte je Ecke der Anzeige (dazu die Farbe von
 * jenseits), am Rand je Kette in der Datentextur (der Abstand mit Vorzeichen: Die Farblinie liegt, wo er null ist). Die harte Kante
 * selbst bleibt die genaue je Bildpunkt; ohne Breite bleibt jede Rechnung, wie sie war.
 *
 * Zwei Arten, die Farbe mit dem Grund zu verrechnen: `wachs` (die Farbe mit Hell, Dunkel und Glanz des Wachses, deckend über dem
 * Wachs; lineare Werte, für das Ziel der festen Materialien) und `hell` (die reine Farbe, mit dem Bild darunter multipliziert: Das
 * helle Solid bringt sein Hell und Dunkel selbst mit).
 *
 * Etappe 5: mehrere Ebenen (`FarbStapel`). Jede Ebene ist eine `FarbAnzeige` mit ihren eigenen Flächen; gezeichnet werden alle in
 * einem Durchgang, von unten nach oben (`renderOrder`), jede deckt, was unter ihr liegt. Auf Wachs deckt schon das Überlagern. Wo
 * das nicht reicht, werden die Ebenen zuerst zu einem Bild gesammelt (die reinen Farben in Bildschirmwerten, oben deckt unten), und
 * erst dieses Bild wird mit dem Grund verrechnet, wie sonst die eine Ebene: über dem hellen Solid immer (multipliziert deckt
 * nichts), auf Wachs, wenn eine obere Ebene weiche Kanten hat (so mischt ihr Verlauf in die Ebene darunter genau wie innerhalb
 * einer Ebene: in Bildschirmwerten, nicht im Licht). Mit einer Ebene bleibt jede Rechnung, wie sie war.
 */
import {
  BufferAttribute,
  BufferGeometry,
  type Camera,
  Color,
  CustomBlending,
  DataTexture,
  DataUtils,
  DoubleSide,
  DstColorFactor,
  DynamicDrawUsage,
  EqualDepth,
  FloatType,
  Group,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NearestFilter,
  NoBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RGBAFormat,
  RGFormat,
  RedFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
  ZeroFactor,
} from 'three';
import type { HautNetz } from '../../anfang/haut';
import { wachsLichtBild } from '../wachs';
import type { Farbe } from './bemalung';
import { feinEcken } from './fein';
import type { Flaechen } from './flaechen';
import { FERN, weiteImDreieck } from './fliessen';
import type { WeichFeld } from './weich';

export type FarbModus = 'wachs' | 'hell';
/** wie eine Ebene gerade zeichnet: wie `FarbModus`, dazu `sammel` (Etappe 5: die reine Farbe mal ihre Deckung, für das Sammelbild mehrerer Ebenen) */
type ZeichenArt = FarbModus | 'sammel';
/** die Felder der glatten Anzeige, die alle Ebenen teilen (ein Puffer auf der Grafikkarte, einmal je Bild nachgezogen) */
type Gemeinsam = { position: BufferAttribute; normal: BufferAttribute; seite: BufferAttribute };

/** Breite der Datentextur (Texel je Zeile) */
const DB = 1024;

const VERTEX = /* glsl */ `
  attribute float aSeite;
  // Etappe 6, eine Kopie der Ebenen-Ansicht: ihr Bild im Bild (x: verkleinert, yz: versetzt; Einheiten des Bilds) und ihr Bereich
  // der Tiefe (z' = z · x + y). Ohne Kopie (1, 0, 0) und (1, 0): Dann ändert sich nichts, auch kein Bit
  uniform vec3 uBild;
  uniform vec2 uTiefe;
  #ifdef RAND
  attribute vec2 aBary;
  attribute float aSlot;
  varying vec2 vB;
  flat varying float vSlot;
  #endif
  #ifdef FLUSS
  attribute float aWeite;
  varying float vWeite;
  #endif
  #ifdef WEICH
  attribute vec2 aWeich;
  attribute vec4 aFremd;
  varying vec2 vWeich;
  varying vec4 vFremd;
  #endif
  varying vec3 vBlick;
  varying vec3 vNormale;
  varying vec2 vSpiegel;
  varying vec3 vWelt;
  void main() {
    #ifdef RAND
    vB = aBary;
    vSlot = aSlot;
    #endif
    #ifdef FLUSS
    vWeite = aWeite;
    #endif
    #ifdef WEICH
    vWeich = aWeich;
    vFremd = aFremd;
    #endif
    vWelt = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vBlick = -mv.xyz;
    vNormale = normalMatrix * normal;
    vSpiegel = vec2(aSeite, position.z);
    gl_Position = projectionMatrix * mv;
    gl_Position.xy = gl_Position.xy * uBild.x + uBild.yz * gl_Position.w;
    gl_Position.z = gl_Position.z * uTiefe.x + uTiefe.y * gl_Position.w;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uModus;
  uniform float uSpiegel;
  uniform highp sampler2D tLicht;
  uniform vec3 uFarbe;
  #ifdef RAND
  uniform highp sampler2D tDaten;
  uniform highp sampler2D tFarben;
  uniform float uLinie;
  uniform vec3 uTinte;
  varying vec2 vB;
  flat varying float vSlot;
  #endif
  #ifdef FLUSS
  varying float vWeite;
  #endif
  #ifdef WEICH
  // Etappe 4, innen: x der Abstand zur weichen Farblinie, y die Breite des Verlaufs dort; die Farbe von jenseits (mal ihre Deckung)
  varying vec2 vWeich;
  varying vec4 vFremd;
  #endif
  // Etappe 4: 1, wenn eine Farblinie eine Breite hat. uDeckung: 0 für Flächen ohne Füllung
  uniform float uWeich;
  uniform float uDeckung;
  // Etappe 6: wie deckend die ganze Ebene gezeichnet wird (1: ganz; in der Ebenen-Ansicht blendet sie auf fremden Kopien aus)
  uniform float uSicht;
  varying vec3 vBlick;
  varying vec3 vNormale;
  varying vec2 vSpiegel;
  varying vec3 vWelt;
  uniform vec4 uSchnitt;
  // Etappe 3, eine Füllung läuft ein. uFluss: x ihre Nummer (−1: keine), y die Front (so weit ist die Farbe), z die Welle der
  // Front, w die Breite des Wulstes dahinter (alles in Einheiten des Werks). uFlussAlt: die Farbe davor (a = 0: keine).
  // uFlussMass: x Einheiten des Werks je Einheit der Welt, y die Zeit seit dem Klick, z die Stärke des Wulstes.
  uniform vec4 uFluss;
  uniform vec4 uFlussAlt;
  uniform vec3 uFlussMass;

  vec3 linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }

  /** die Farbe einer Fläche (Bildschirmwerte) mit dem Grund verrechnet; a: Deckung; wulst: der Wulst an der Front einer einlaufenden Füllung (0 … 1) */
  vec4 aus(vec3 farbe, float a, float wulst) {
    if (uModus > 1.5) {
      // Etappe 5, mehrere Ebenen: die reine Farbe mal ihre Deckung ins Sammelbild (oben deckt unten); mit dem Grund wird es am
      // Schluss einmal verrechnet
      return vec4(farbe * (1.0 - 0.16 * wulst) * a, a);
    }
    if (uModus > 0.5) {
      // helles Solid: die reine Farbe, multipliziert mit dem Bild darunter (wo nichts deckt: mal Weiß); der Wulst ein wenig satter
      return vec4(mix(vec3(1.0), farbe * (1.0 - 0.16 * wulst), a), 1.0);
    }
    // Wachs: Hell, Dunkel und Glanz des Wachses, nachgeschlagen über die Normale im Blick (wie das Wachs selbst)
    vec3 n = normalize(vNormale);
    vec3 blick = normalize(vBlick);
    vec3 x = normalize(vec3(blick.z, 0.0, -blick.x));
    vec3 y = cross(blick, x);
    vec2 licht = texture2D(tLicht, vec2(dot(x, n), dot(y, n)) * 0.495 + 0.5).rg;
    // (der Wulst steht höher als die Fläche: Er fängt mehr Licht und mehr Glanz)
    vec3 c = linear(farbe) * licht.r * (1.0 + 0.22 * wulst) + vec3(licht.g) * (1.0 + 2.2 * wulst) + vec3(0.045 * wulst * wulst);
    return vec4(c * a, a);
  }

  float rauschen(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = dot(i, vec3(1.0, 57.0, 113.0));
    vec4 u = fract(sin(vec4(n, n + 1.0, n + 57.0, n + 58.0)) * 43758.5453);
    vec4 o = fract(sin(vec4(n + 113.0, n + 114.0, n + 170.0, n + 171.0)) * 43758.5453);
    return mix(mix(mix(u.x, u.y, f.x), mix(u.z, u.w, f.x), f.y), mix(mix(o.x, o.y, f.x), mix(o.z, o.w, f.x), f.y), f.z);
  }

  /** eine einlaufende Füllung an einer Stelle mit dieser Weite: x wie weit sie schon deckt (0 … 1), y der Wulst an ihrer Front (0 … 1) */
  vec2 fluss(float weite) {
    // (Einheiten des Werks je Bildpunkt: Die Kante der Front ist einen Bildpunkt breit)
    float e = max(max(length(dFdx(vWelt)), length(dFdy(vWelt))) * uFlussMass.x, 1e-6);
    vec3 q = vWelt * uFlussMass.x;
    float welle = uFluss.z * (rauschen(q * 0.05 + vec3(0.0, 0.0, uFlussMass.y * 1.1)) + 0.5 * rauschen(q * 0.13 - vec3(uFlussMass.y * 1.7, 0.0, 0.0)) - 0.75) * 1.33 * smoothstep(0.0, 14.0, weite);
    float f = uFluss.y - weite + welle;
    float a = clamp(f / e + 0.5, 0.0, 1.0);
    float r = clamp(1.0 - f / max(uFluss.w, 1e-6), 0.0, 1.0);
    return vec2(a, a * r * r * (3.0 - 2.0 * r) * uFlussMass.z);
  }

  #ifdef RAND
  vec4 daten(int i) { return texelFetch(tDaten, ivec2(i % ${DB}, i / ${DB}), 0); }
  vec4 farbeVon(float nr) { return nr < -0.5 ? vec4(0.0) : texelFetch(tFarben, ivec2(int(nr + 0.5), 0), 0); }

  /**
   * Die Weite an einer Stelle des Dreiecks (g: Gewichte der drei Ecken) aus den Weiten w seiner Ecken: rund, als käme die Front von
   * einer Quelle in seiner Ebene (wie weiteImDreieck in fliessen.ts). m: das Dreieck in seiner Ebene (Länge AB, Lage von C).
   */
  float weiteRund(vec3 g, vec3 w, vec3 m) {
    float eben = dot(g, w);
    if (max(w.x, max(w.y, w.z)) > 5e8 || m.x < 1e-6 || m.z < 1e-6) return eben;
    float sx = (w.x * w.x - w.y * w.y + m.x * m.x) / (2.0 * m.x);
    float sy = (w.x * w.x - w.z * w.z + m.y * m.y + m.z * m.z - 2.0 * m.y * sx) / (2.0 * m.z);
    vec2 s = vec2(sx, sy);
    vec2 B = vec2(m.x, 0.0);
    vec2 C = m.yz;
    vec2 p = g.y * B + g.z * C;
    vec3 rest = w - vec3(length(s), length(s - B), length(s - C));
    vec3 zu = vec3(length(p), length(p - B), length(p - C));
    float x = length(p - s) + dot(g, rest);
    x = min(x, min(w.x + zu.x, min(w.y + zu.y, w.z + zu.z)));
    return max(max(x, 0.0), max(w.x - zu.x, max(w.y - zu.y, w.z - zu.z)));
  }
  #endif

  void main() {
    if (uSpiegel >= 0.0 && vSpiegel.x * vSpiegel.y < -uSpiegel * abs(vSpiegel.x)) discard;
    if (dot(uSchnitt.xyz, vWelt) < uSchnitt.w) discard;
    #ifdef RAND
    // Gewichte je Bildpunkt: daraus das Maß „Bildpunkte je Gewicht“ (die Umkehrung der Ableitungen)
    vec2 dx = dFdx(vB);
    vec2 dy = dFdy(vB);
    float det = dx.x * dy.y - dx.y * dy.x;
    float sinn = det < 0.0 ? -1.0 : 1.0;
    float teiler = abs(det) < 1e-20 ? 1e-20 * sinn : det;
    // die nächste Kette dieses Dreiecks: Abstand in Bildpunkten, Seite, und die Füllungen beiderseits
    int kopf = int(vSlot + 0.5);
    int nK = int(daten(kopf).x + 0.5);
    int z = kopf + 1;
    float best = 1e30;
    float bestQuer = 0.0;
    vec2 bestFarben = vec2(-1.0);
    int bestZ = z;
    for (int k = 0; k < nK; k++) {
      // je Kette: Kopf (Zahl der Punkte, Füllung links, rechts, ob sie eine Breite trägt), zwei Zeilen Weiten für das Einlaufen
      // (links, rechts: an den drei Ecken), zwei Zeilen für die weiche Kante (Abstand und Breite an den drei Ecken), ihre Punkte
      vec4 kette = daten(z);
      int nP = int(kette.x + 0.5);
      vec2 a = daten(z + 5).xy;
      for (int j = 1; j < nP; j++) {
        vec2 b = daten(z + 5 + j).xy;
        vec2 pg = vB - a;
        vec2 eg = b - a;
        // in Bildpunkte
        vec2 p = vec2(dy.y * pg.x - dy.x * pg.y, -dx.y * pg.x + dx.x * pg.y) / teiler;
        vec2 e = vec2(dy.y * eg.x - dy.x * eg.y, -dx.y * eg.x + dx.x * eg.y) / teiler;
        float l2 = max(dot(e, e), 1e-12);
        float u = clamp(dot(p, e) / l2, 0.0, 1.0);
        vec2 d = p - u * e;
        float d2 = dot(d, d);
        // (im Bild kann das Dreieck gespiegelt liegen: die Seite gilt im Maß der Gewichte)
        float quer = sinn * (e.x * p.y - e.y * p.x) / sqrt(l2);
        if (d2 < best - 1e-4 || (d2 <= best + 1e-4 && abs(quer) > abs(bestQuer))) {
          best = d2;
          bestQuer = quer;
          bestFarben = kette.yz;
          bestZ = z;
        }
        a = b;
      }
      z += 5 + nP;
    }
    float d = sqrt(best);
    float nrEigen = bestQuer > 0.0 ? bestFarben.x : bestFarben.y;
    float nrFremd = bestQuer > 0.0 ? bestFarben.y : bestFarben.x;
    vec4 eigen = farbeVon(nrEigen);
    vec4 fremd = farbeVon(nrFremd);
    float wulst = 0.0;
    if (uFluss.x > -0.5) {
      // eine Füllung läuft ein: Auf ihrer Seite der Kette gilt die Weite dieser Seite, aus den drei Ecken gemischt
      vec3 g = vec3(1.0 - vB.x - vB.y, vB.x, vB.y);
      vec3 mass = daten(kopf).yzw;
      vec2 flE = fluss(weiteRund(g, daten(bestZ + (bestQuer > 0.0 ? 1 : 2)).xyz, mass));
      vec2 flF = fluss(weiteRund(g, daten(bestZ + (bestQuer > 0.0 ? 2 : 1)).xyz, mass));
      if (abs(nrEigen - uFluss.x) < 0.5) {
        eigen = uFlussAlt.a > 0.0 ? vec4(mix(uFlussAlt.rgb, eigen.rgb, flE.x), 1.0) : vec4(eigen.rgb, flE.x);
        wulst = flE.y;
      }
      if (abs(nrFremd - uFluss.x) < 0.5) fremd = uFlussAlt.a > 0.0 ? vec4(mix(uFlussAlt.rgb, fremd.rgb, flF.x), 1.0) : vec4(fremd.rgb, flF.x);
    }
    // an der Kante: einen Bildpunkt breit von der einen in die andere Füllung
    float t = clamp(0.5 + d, 0.0, 1.0);
    vec3 farbe;
    float deckung;
    if (uWeich > 0.5) {
      // Etappe 4: Trägt die nächste Kette eine Breite, läuft die Farbe von jenseits weich herein. Abstand zur Farblinie und Breite
      // des Verlaufs: aus den drei Ecken des Dreiecks gemischt (dieselben Werte, mit denen die Nachbardreiecke rechnen)
      float jenseits = 0.0;
      if (daten(bestZ).w > 0.5) {
        vec3 g = vec3(1.0 - vB.x - vB.y, vB.x, vB.y);
        float weg = abs(dot(g, daten(bestZ + 3).xyz));
        float breite = dot(g, daten(bestZ + 4).xyz);
        jenseits = breite > 1e-6 ? 1.0 - smoothstep(-breite, breite, weg) : 0.0;
      }
      // beide Seiten laufen aufeinander zu: An der Farblinie stehen sie gleich, darum bleibt die Kante dort ohne Stufe
      vec4 E = vec4(eigen.rgb * eigen.a, eigen.a);
      vec4 F = vec4(fremd.rgb * fremd.a, fremd.a);
      vec4 R = mix(E, F, jenseits) * t + mix(F, E, jenseits) * (1.0 - t);
      farbe = R.a > 1e-6 ? R.rgb / R.a : vec3(1.0);
      deckung = R.a;
    } else {
      farbe = eigen.a + fremd.a > 0.0 ? (eigen.rgb * eigen.a * t + fremd.rgb * fremd.a * (1.0 - t)) / max(1e-6, eigen.a * t + fremd.a * (1.0 - t)) : vec3(1.0);
      deckung = eigen.a * t + fremd.a * (1.0 - t);
    }
    // die Farblinie selbst (nur im Paint-Modus zu sehen), uLinie Bildpunkte breit
    float linie = uLinie > 0.0 ? clamp(0.5 * uLinie + 0.5 - d, 0.0, 1.0) : 0.0;
    farbe = mix(farbe, uTinte, linie);
    deckung = deckung + (1.0 - deckung) * linie;
    deckung *= uSicht;
    if (deckung < 0.002) discard;
    gl_FragColor = aus(farbe, deckung, wulst * (1.0 - linie));
    #else
    #if defined(FLUSS) || defined(WEICH)
    vec4 c = vec4(uFarbe, uDeckung);
    float wulst = 0.0;
    #ifdef FLUSS
    vec2 fl = fluss(vWeite);
    c = uFlussAlt.a > 0.0 ? vec4(mix(uFlussAlt.rgb, uFarbe, fl.x), 1.0) : vec4(uFarbe, fl.x);
    wulst = fl.y;
    #endif
    #ifdef WEICH
    // der Verlauf: an der Farblinie die Hälfte der Farbe von jenseits, im Abstand der Breite nichts mehr
    float jenseits = vWeich.y > 1e-6 ? 1.0 - smoothstep(-vWeich.y, vWeich.y, vWeich.x) : 0.0;
    vec4 R = mix(vec4(c.rgb * c.a, c.a), vFremd, jenseits);
    c = vec4(R.a > 1e-6 ? R.rgb / R.a : c.rgb, R.a);
    #endif
    c.a *= uSicht;
    if (c.a < 0.002) discard;
    gl_FragColor = aus(c.rgb, c.a, wulst);
    #else
    if (uSicht < 0.002) discard;
    gl_FragColor = aus(uFarbe, uSicht, 0.0);
    #endif
    #endif
  }
`;

export type FarbWerte = {
  modus: FarbModus;
  /** Breite der Farblinie in Gerätepunkten (0: nicht gezeigt) */
  linie: number;
  /** der Schnitt an der Spiegelebene wie bei den festen Materialien (fehlt oder negativ: keiner) */
  spiegelSchnitt?: number | null;
  /** das Blatt, das sich beim Einrasten durch die Form schiebt (Welt: n · p ≥ w bleibt), wie bei den festen Materialien */
  schnitt?: [number, number, number, number] | null;
  /**
   * Alles, was verdeckt (die glatte Anzeige aller Objekte). `hell`: Die Zeichenfläche des hellen Solids hat keine Tiefe von Ozzys
   * Kamera, sie wird vor der Farbe geschrieben. Beide: Mehrere Ebenen werden gesammelt, das Sammelbild braucht den Körper.
   */
  verdeckt?: HautNetz | null;
  /**
   * Etappe 6 (die Ebenen-Ansicht): die Kopien der Form im Bild, in einem Durchgang gezeichnet; fehlt: die Form einmal, mit allen
   * Ebenen. Die Farblinien der aktiven Ebene stehen dann nur dort, wo sie ganz zu sehen ist (auf ihrer eigenen Kopie).
   */
  kopien?: readonly FarbKopie[] | null;
};

/**
 * Etappe 6: eine Kopie der Form im Bild. `s`, `tx`, `ty`: ihr Bild im Bild (um `s` verkleinert, dann versetzt; Einheiten des
 * Bilds, −1 … 1). `za`, `zb`: ihr Bereich der Tiefe (z' = z · za + zb): So deckt eine Kopie die andere, obwohl alle in einem
 * Durchgang stehen. `nur`: welche Ebenen sie wie deckend zeigt (Kennung → 0 … 1; null: alle, ganz).
 */
export type FarbKopie = { s: number; tx: number; ty: number; za: number; zb: number; nur: ReadonlyMap<number, number> | null };
/** die Form einmal, wie sie steht, mit allen Ebenen */
const EINE_KOPIE: readonly FarbKopie[] = [{ s: 1, tx: 0, ty: 0, za: 1, zb: 0, nur: null }];
/** wie ein Netz in einem Durchgang steht: das Bild seiner Kopie, wie deckend es ist, wie breit seine Farblinien zu sehen sind */
type Zeichnung = { s: number; tx: number; ty: number; za: number; zb: number; sicht: number; linie: number };
const GANZ: Zeichnung = { s: 1, tx: 0, ty: 0, za: 1, zb: 0, sicht: 1, linie: 0 };

/**
 * Etappe 3: eine Füllung, die einläuft. `fuell`: ihre Nummer; `alt`: die Farbe, die vorher in ihrer Fläche lag (null: keine);
 * `weite`, `rand`: die Weiten von der Saat (`flussWeiten`); `tri`, `pos`: die Dreiecke und Lagen des Rechennetzes.
 */
export type FlussBild = { fuell: number; alt: Farbe | null; weite: Float32Array; rand: Float32Array[]; tri: ArrayLike<number>; pos: ArrayLike<number> };
/**
 * Etappe 4: die weichen Kanten. `feld`: je Punkt des Rechennetzes Abstand, Breite und Füllung jenseits (`weichFeld`); `tri`: die
 * Dreiecke des Rechennetzes.
 */
export type WeichBild = { feld: WeichFeld; tri: ArrayLike<number> };
/** was sich je Bild ändert: die Front, ihre Welle, Breite und Stärke des Wulstes (Einheiten des Werks), die Zeit seit dem Klick, Werk je Welt */
export type FlussWerte = { front: number; welle: number; wulst: number; staerke: number; zeit: number; mass: number };

/** die Bemalung einer Ebene (seit Etappe 5 eine von mehreren: `FarbStapel` hält sie, ordnet sie und zeichnet alle zusammen) */
export class FarbAnzeige {
  readonly gruppe = new Group();
  private readonly innenGeo = new BufferGeometry();
  private readonly randGeo = new BufferGeometry();
  private readonly innen: Mesh;
  private readonly rand: Mesh;
  private innenMat: ShaderMaterial[] = [];
  /** das Material der Füllung, die gerade einläuft (ihre Dreiecke innen) */
  private flussMat: ShaderMaterial | null = null;
  /** Etappe 4: je Füllung das Material ihrer Dreiecke im Verlauf einer weichen Kante; `leerMat`: für Flächen ohne Füllung dort */
  private weichMat: ShaderMaterial[] = [];
  private leerMat: ShaderMaterial | null = null;
  private flussWeichMat: ShaderMaterial | null = null;
  private readonly randMat: ShaderMaterial;
  private daten: DataTexture;
  private farben: DataTexture;
  private modus: ZeichenArt = 'wachs';
  /** Etappe 6: weitere Netze auf denselben Feldern und Materialien, für eine Ebene, die in einem Durchgang auf mehreren Kopien steht */
  private abzuege: { innen: Mesh; rand: Mesh }[] = [];
  /** gibt es innen und am Rand etwas zu zeichnen? */
  private hatInnen = false;
  private hatRand = false;
  /** woraus die Geometrie gebaut ist */
  private stand: { netz: HautNetz; index: Uint32Array; pos: Float32Array; stufen: number; flaechen: Flaechen; fluss: FlussBild | null; weich: WeichBild | null } | null = null;
  /** je Ecke des Rands: ihr Punkt in der Anzeige */
  private randQuelle = new Uint32Array(0);
  /** zählt, was gezeichnet wird (für Proben) */
  zahlen = { innen: 0, rand: 0, ketten: 0, punkte: 0, fuellungen: 0, weich: 0 };
  /** läuft auf dieser Ebene gerade eine Füllung ein? */
  fliesst = false;

  /** hat diese Ebene weiche Kanten? */
  get weich(): boolean {
    return !!this.stand?.weich;
  }

  /** `id`: die Kennung ihrer Ebene; `licht`: Hell, Dunkel und Glanz des Wachses (für alle Ebenen dasselbe Bild); `gemeinsam`: die geteilten Felder der glatten Anzeige */
  constructor(
    readonly id: number,
    private readonly licht: DataTexture,
    private readonly gemeinsam: (netz: HautNetz) => Gemeinsam,
  ) {
    this.daten = this.datenTextur(new Float32Array(4 * DB));
    this.farben = this.farbenTextur([]);
    this.randMat = this.material(true, false, false);
    this.innen = this.netzNeu(this.innenGeo, this.innenMat);
    this.rand = this.netzNeu(this.randGeo, this.randMat);
  }

  /** ein Netz der Bemalung: Vor jedem Zeichnen bekommt sein Material, was für diese Zeichnung gilt (`userData.z`) */
  private netzNeu(geo: BufferGeometry, material: ShaderMaterial | ShaderMaterial[]): Mesh {
    const netz = new Mesh(geo, material);
    netz.frustumCulled = false;
    netz.visible = false;
    netz.userData.z = GANZ;
    netz.onBeforeRender = (_r, _s, _k, _g, m) => this.vorher(netz.userData.z as Zeichnung, m as ShaderMaterial);
    this.gruppe.add(netz);
    return netz;
  }

  /**
   * Für diesen Durchgang: das Netzpaar Nummer `n` dieser Ebene (0: ihr eigenes; weitere, wenn sie auf mehreren Kopien steht)
   * zeichnet so. `ordnung`: der Platz in der Reihe (was eine höhere Zahl hat, wird später gezeichnet und deckt).
   */
  stellen(n: number, z: Zeichnung, ordnung: number): void {
    while (this.abzuege.length < n) this.abzuege.push({ innen: this.netzNeu(this.innenGeo, this.innenMat), rand: this.netzNeu(this.randGeo, this.randMat) });
    const p = n === 0 ? { innen: this.innen, rand: this.rand } : this.abzuege[n - 1]!;
    // (die Materialien innen wechseln mit jedem Bauen)
    p.innen.material = this.innen.material;
    p.innen.visible = this.hatInnen;
    p.rand.visible = this.hatRand;
    for (const netz of [p.innen, p.rand]) {
      netz.userData.z = z;
      netz.renderOrder = ordnung;
    }
  }

  /** nach dem Stellen: Die Netzpaare ab Nummer `n` werden in diesem Durchgang nicht gebraucht */
  rest(n: number): void {
    [{ innen: this.innen, rand: this.rand }, ...this.abzuege].forEach((p, i) => {
      if (i < n) return;
      p.innen.visible = false;
      p.rand.visible = false;
    });
  }

  /** gleich wird ein Netz mit diesem Material gezeichnet: was für diese Zeichnung gilt */
  private vorher(z: Zeichnung, m: ShaderMaterial): void {
    const u = m.uniforms;
    (u.uBild!.value as Vector3).set(z.s, z.tx, z.ty);
    (u.uTiefe!.value as Vector2).set(z.za, z.zb);
    u.uSicht!.value = z.sicht;
    u.uLinie!.value = z.linie;
    // (was sonst deckt, überblendet, sobald die Ebene halb durchscheint)
    m.blending = this.modus === 'hell' || m.userData.immer || z.sicht < 1 ? CustomBlending : NoBlending;
    m.uniformsNeedUpdate = true;
  }

  /** die Ebene gibt es nicht mehr: alles freigeben, was auf der Grafikkarte liegt */
  weg(): void {
    this.gruppe.removeFromParent();
    this.innenGeo.dispose();
    this.randGeo.dispose();
    for (const m of [this.randMat, ...this.innenAlle()]) m.dispose();
    this.daten.dispose();
    this.farben.dispose();
  }

  private datenTextur(feld: Float32Array): DataTexture {
    const t = new DataTexture(feld, DB, feld.length / 4 / DB, RGBAFormat, FloatType);
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.needsUpdate = true;
    return t;
  }

  private farbenTextur(farben: readonly Farbe[]): DataTexture {
    const n = Math.max(1, farben.length);
    const feld = new Float32Array(4 * n);
    farben.forEach((f, i) => feld.set([f[0], f[1], f[2], 1], 4 * i));
    const t = new DataTexture(feld, n, 1, RGBAFormat, FloatType);
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.needsUpdate = true;
    return t;
  }

  private material(rand: boolean, fluss: boolean, weich: boolean): ShaderMaterial {
    const m = new ShaderMaterial({
      defines: rand ? { RAND: 1 } : { ...(fluss ? { FLUSS: 1 } : {}), ...(weich ? { WEICH: 1 } : {}) },
      uniforms: {
        uBild: { value: new Vector3(1, 0, 0) },
        uTiefe: { value: new Vector2(1, 0) },
        uWeich: { value: 0 },
        uDeckung: { value: 1 },
        uSicht: { value: 1 },
        uFluss: { value: [-1, 0, 0, 1] },
        uFlussAlt: { value: [0, 0, 0, 0] },
        uFlussMass: { value: [1, 0, 0] },
        uModus: { value: 0 },
        uSpiegel: { value: -1 },
        uSchnitt: { value: [0, 0, 1, -1e9] },
        tLicht: { value: this.licht },
        uFarbe: { value: [1, 1, 1] },
        tDaten: { value: this.daten },
        tFarben: { value: this.farben },
        uLinie: { value: 0 },
        uTinte: { value: [0.122, 0.102, 0.09] },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      // (immer in der Reihe der durchscheinenden Dinge: Nur dort gilt die Reihenfolge der Ebenen für alles, auch für das, was ganz deckt)
      transparent: true,
      depthWrite: false,
      // beide Seiten in einem Durchgang: Der Umlaufsinn der Anzeige ist je Form verschieden, und was hinten liegt, verdeckt die Tiefe der Haut
      side: DoubleSide,
      forceSinglePass: true,
      // vor der Haut, auf der die Farbe liegt (dieselben Lagen, ein anderes Programm)
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    this.blenden(m, this.modus, rand || fluss || weich);
    return m;
  }

  /** alle Materialien, die innen zeichnen */
  private innenAlle(): ShaderMaterial[] {
    return [...this.innenMat, ...this.weichMat, ...[this.flussMat, this.leerMat, this.flussWeichMat].filter((m): m is ShaderMaterial => m !== null)];
  }

  /**
   * Wie ein Material mit dem verrechnet, was schon steht. `immer`: Es überblendet immer (der Rand, eine einlaufende Füllung, ein
   * Verlauf); sonst deckt es ganz und überblendet nur, wenn seine Ebene halb durchscheint (`vorher`).
   */
  private blenden(m: ShaderMaterial, modus: ZeichenArt, immer: boolean): void {
    m.uniforms.uModus!.value = modus === 'hell' ? 1 : modus === 'sammel' ? 2 : 0;
    m.userData.immer = immer;
    if (modus === 'hell') {
      // multiplizieren: Bild darunter mal Farbe (die Deckung des Bilds bleibt)
      m.blendSrc = DstColorFactor;
      m.blendDst = ZeroFactor;
      m.blendSrcAlpha = ZeroFactor;
      m.blendDstAlpha = OneFactor;
    } else {
      // überlagern (Wachs und Sammelbild): Die Farbe steht schon mal ihre Deckung
      m.blendSrc = OneFactor;
      m.blendDst = OneMinusSrcAlphaFactor;
      m.blendSrcAlpha = OneFactor;
      m.blendDstAlpha = OneMinusSrcAlphaFactor;
    }
    m.blending = modus === 'hell' || immer ? CustomBlending : NoBlending;
  }

  /** ist etwas zu zeichnen? */
  get leer(): boolean {
    return !this.hatInnen && !this.hatRand;
  }

  /** nichts mehr zeigen (keine Bemalung, oder kein Netz) */
  leeren(): void {
    this.stand = null;
    this.fliesst = false;
    this.hatInnen = false;
    this.hatRand = false;
    this.rest(0);
    this.zahlen = { innen: 0, rand: 0, ketten: 0, punkte: 0, fuellungen: 0, weich: 0 };
  }

  /**
   * Die Bemalung für dieses Netz der Anzeige. `netz`: die glatte Anzeige der Haut auf der Stufe `stufen` (je Dreieck des
   * Rechennetzes 4^stufen feine, hintereinander); `flaechen`: was `flaechenRechnen` für das Rechennetz ergab; `farben`: die Farbe
   * je Füllung (Bildschirmwerte 0 … 1). Neu gebaut wird nur, wenn sich Netz, Stufe oder Flächen geändert haben; `bewegt`: Die Lagen
   * haben sich geändert (dann gehen die Ecken des Rands mit).
   */
  setzen(netz: HautNetz, stufen: number, flaechen: Flaechen, farben: readonly Farbe[], bewegt: boolean, fluss: FlussBild | null = null, weich: WeichBild | null = null): void {
    const st = this.stand;
    const neu = !st || st.netz !== netz || st.index !== netz.index || st.pos !== netz.pos || st.stufen !== stufen || st.flaechen !== flaechen || st.fluss !== fluss || st.weich !== weich;
    if (neu) this.bauen(netz, stufen, flaechen, farben, fluss, weich);
    else if (bewegt) this.bewegen(netz);
  }

  /** Etappe 3, je Bild: wie weit die einlaufende Füllung ist (null: keine läuft) */
  flussSetzen(w: FlussWerte | null): void {
    const fl = this.stand?.fluss ?? null;
    const an = w && fl;
    this.fliesst = !!an;
    const u1 = an ? [fl.fuell, w.front, w.welle, Math.max(1e-6, w.wulst)] : [-1, 0, 0, 1];
    const u2 = an && fl.alt ? [fl.alt[0], fl.alt[1], fl.alt[2], 1] : [0, 0, 0, 0];
    const u3 = an ? [w.mass, w.zeit, w.staerke] : [1, 0, 0];
    for (const m of [this.randMat, this.flussMat, this.flussWeichMat]) {
      if (!m) continue;
      m.uniforms.uFluss!.value = u1;
      m.uniforms.uFlussAlt!.value = u2;
      m.uniforms.uFlussMass!.value = u3;
    }
  }

  private bauen(netz: HautNetz, stufen: number, flaechen: Flaechen, farben: readonly Farbe[], fluss: FlussBild | null, weich: WeichBild | null): void {
    const je = 4 ** stufen;
    const T = netz.index.length / 3 / je;
    this.stand = { netz, index: netz.index, pos: netz.pos, stufen, flaechen, fluss, weich };
    const ganz = flaechen.ganz;
    const Tg = Math.min(T, ganz.length);
    const I = netz.index;
    const ecken = feinEcken(stufen);
    const g = this.innenGeo;
    const G = this.gemeinsam(netz);
    g.setAttribute('position', G.position);
    g.setAttribute('normal', G.normal);
    g.setAttribute('aSeite', G.seite);
    // ---- Etappe 4: welche ganzen Dreiecke im Verlauf einer weichen Kante liegen; ihre Ecken tragen Abstand, Breite, Farbe jenseits ----
    const imVerlauf = new Uint8Array(Tg);
    let weichZahl = 0;
    if (weich) {
      // (die Dreiecke mit Farblinien rechnet der Rand je Bildpunkt)
      const amRand = new Uint8Array(Tg);
      for (const r of flaechen.rand) if (r.t < Tg) amRand[r.t] = 1;
      const nV = netz.pos.length / 3;
      const aWeich = new Float32Array(2 * nV);
      for (let v = 0; v < nV; v++) aWeich[2 * v] = 1;
      const aFremd = new Float32Array(4 * nV);
      const F = weich.feld;
      const R = weich.tri;
      const d = [0, 0, 0];
      const w = [0, 0, 0];
      const c: [number, number, number, number][] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
      for (let t = 0; t < Tg; t++) {
        if (amRand[t]) continue;
        let bezug = -1;
        for (let e = 0; e < 3; e++) {
          const v = R[3 * t + e]!;
          d[e] = F.d[v]!;
          w[e] = F.w[v]!;
          if (w[e]! > 0 && d[e]! < w[e]! && (bezug < 0 || d[e]! < d[bezug]!)) bezug = e;
        }
        if (bezug < 0) continue;
        for (let e = 0; e < 3; e++) {
          // (eine Ecke ohne Wert liegt jenseits des Verlaufs: Dort steht die reine Farbe)
          const ohne = !(w[e]! > 0) || !(d[e]! < FERN);
          const q = ohne ? bezug : e;
          if (ohne) {
            w[e] = w[bezug]!;
            d[e] = w[bezug]!;
          }
          const f = farben[F.fremd[R[3 * t + q]!]!];
          c[e] = f ? [f[0], f[1], f[2], 1] : [0, 0, 0, 0];
        }
        for (let q = 0; q < 3 * je; q++) {
          const v = I[3 * je * t + q]!;
          const gb = ecken[2 * q]!;
          const gc = ecken[2 * q + 1]!;
          const ga = 1 - gb - gc;
          aWeich[2 * v] = ga * d[0]! + gb * d[1]! + gc * d[2]!;
          aWeich[2 * v + 1] = ga * w[0]! + gb * w[1]! + gc * w[2]!;
          for (let k = 0; k < 4; k++) aFremd[4 * v + k] = ga * c[0]![k]! + gb * c[1]![k]! + gc * c[2]![k]!;
        }
        imVerlauf[t] = 1;
        weichZahl++;
      }
      g.setAttribute('aWeich', new BufferAttribute(aWeich, 2));
      g.setAttribute('aFremd', new BufferAttribute(aFremd, 4));
    }
    // ---- innen: je Füllung die feinen Dreiecke ihrer ganzen Dreiecke; zuerst die mit der reinen Farbe, dann die im Verlauf; am
    // Schluss die Dreiecke ohne Füllung, in die ein Verlauf hineinreicht ----
    const nF = farben.length;
    const zahl = new Array<number>(2 * nF + 1).fill(0);
    const fach = (t: number): number => (ganz[t]! >= 0 ? (imVerlauf[t] ? nF + ganz[t]! : ganz[t]!) : imVerlauf[t] ? 2 * nF : -1);
    for (let t = 0; t < Tg; t++) {
      const f = fach(t);
      if (f >= 0) zahl[f] = zahl[f]! + 1;
    }
    const start: number[] = [];
    let summe = 0;
    for (const z of zahl) {
      start.push(summe);
      summe += z * je * 3;
    }
    const index = new Uint32Array(summe);
    const platz = start.slice();
    for (let t = 0; t < Tg; t++) {
      const f = fach(t);
      if (f < 0) continue;
      index.set(I.subarray(3 * je * t, 3 * je * (t + 1)), platz[f]!);
      platz[f] = platz[f]! + 3 * je;
    }
    g.setIndex(new BufferAttribute(index, 1));
    g.clearGroups();
    while (this.innenMat.length < nF) this.innenMat.push(this.material(false, false, false));
    if (weich) {
      while (this.weichMat.length < nF) this.weichMat.push(this.material(false, false, true));
      if (!this.leerMat) {
        this.leerMat = this.material(false, false, true);
        this.leerMat.uniforms.uDeckung!.value = 0;
      }
    }
    // die Materialien in der Reihenfolge der Fächer: rein je Füllung, im Verlauf je Füllung, ohne Füllung
    const mat: ShaderMaterial[] = [];
    farben.forEach((f, i) => {
      this.innenMat[i]!.uniforms.uFarbe!.value = [f[0], f[1], f[2]];
      mat.push(this.innenMat[i]!);
    });
    farben.forEach((f, i) => {
      const m = weich ? this.weichMat[i]! : this.innenMat[i]!;
      m.uniforms.uFarbe!.value = [f[0], f[1], f[2]];
      mat.push(m);
    });
    mat.push(this.leerMat ?? this.innenMat[0] ?? this.randMat);
    zahl.forEach((z, f) => {
      if (z > 0) g.addGroup(start[f]!, z * je * 3, f);
    });
    /** eine Weite für die Grafikkarte (unendlich: nie erreicht) */
    const endlich = (w: number | undefined): number => (w !== undefined && w < FERN ? w : FERN);
    if (fluss && fluss.fuell < nF) {
      // die Füllung, die einläuft: ihre Dreiecke innen mit eigenem Material, jede Ecke der Anzeige mit ihrer Weite (aus den drei
      // Ecken ihres Dreiecks im Rechennetz gemischt)
      const weite = new Float32Array(netz.pos.length / 3).fill(FERN);
      const R = fluss.tri;
      for (let t = 0; t < Tg; t++) {
        if (ganz[t] !== fluss.fuell) continue;
        // (rund, nicht eben gemischt: Sonst wäre die Front in jedem Dreieck eine Gerade)
        const w = weiteImDreieck(fluss.pos, 3 * R[3 * t]!, 3 * R[3 * t + 1]!, 3 * R[3 * t + 2]!, endlich(fluss.weite[R[3 * t]!]), endlich(fluss.weite[R[3 * t + 1]!]), endlich(fluss.weite[R[3 * t + 2]!]));
        for (let q = 0; q < 3 * je; q++) weite[I[3 * je * t + q]!] = w(ecken[2 * q]!, ecken[2 * q + 1]!);
      }
      g.setAttribute('aWeite', new BufferAttribute(weite, 1));
      this.flussMat ??= this.material(false, true, false);
      this.blenden(this.flussMat, this.modus, true);
      const f = farben[fluss.fuell]!;
      this.flussMat.uniforms.uFarbe!.value = [f[0], f[1], f[2]];
      mat[fluss.fuell] = this.flussMat;
      if (weich) {
        // (ihre Dreiecke im Verlauf einer weichen Kante: einlaufen und verlaufen zugleich)
        this.flussWeichMat ??= this.material(false, true, true);
        this.blenden(this.flussWeichMat, this.modus, true);
        this.flussWeichMat.uniforms.uFarbe!.value = [f[0], f[1], f[2]];
        mat[nF + fluss.fuell] = this.flussWeichMat;
      }
    }
    this.innen.material = mat;
    this.hatInnen = summe > 0;
    // ---- Rand: die feinen Dreiecke der Dreiecke mit Ketten, jede Ecke mit ihren Gewichten; die Ketten in der Datentextur ----
    const R = flaechen.rand.map((r, ri) => ({ ...r, ri })).filter((r) => r.t < T);
    const nE = R.length * je * 3;
    const quelle = new Uint32Array(nE);
    const bary = new Float32Array(2 * nE);
    const slot = new Float32Array(nE);
    let texel = 0;
    for (const r of R) texel += 1 + r.ketten.reduce((s, c) => s + 5 + c.p.length / 2, 0);
    const feld = new Float32Array(4 * DB * Math.max(1, Math.ceil(texel / DB)));
    let z = 0;
    let ketten = 0;
    let punkte = 0;
    R.forEach((r, ri) => {
      const kopf = z;
      feld[4 * z] = r.ketten.length;
      if (fluss) {
        // (für die einlaufende Füllung: das Dreieck in seiner Ebene, A im Ursprung, B auf der ersten Achse: Länge AB, Lage von C)
        const P = fluss.pos;
        const ia = 3 * fluss.tri[3 * r.t]!;
        const ib = 3 * fluss.tri[3 * r.t + 1]!;
        const ic = 3 * fluss.tri[3 * r.t + 2]!;
        const ux = P[ib]! - P[ia]!;
        const uy = P[ib + 1]! - P[ia + 1]!;
        const uz = P[ib + 2]! - P[ia + 2]!;
        const vx = P[ic]! - P[ia]!;
        const vy = P[ic + 1]! - P[ia + 1]!;
        const vz = P[ic + 2]! - P[ia + 2]!;
        const lb = Math.sqrt(ux * ux + uy * uy + uz * uz);
        const cx = lb > 1e-9 ? (vx * ux + vy * uy + vz * uz) / lb : 0;
        feld[4 * z + 1] = lb;
        feld[4 * z + 2] = cx;
        feld[4 * z + 3] = Math.sqrt(Math.max(0, vx * vx + vy * vy + vz * vz - cx * cx));
      }
      z++;
      const wr = fluss ? fluss.rand[r.ri] : undefined;
      r.ketten.forEach((c, ki) => {
        const nP = c.p.length / 2;
        feld[4 * z] = nP;
        feld[4 * z + 1] = c.links;
        feld[4 * z + 2] = c.rechts;
        // (Etappe 4: Sie trägt eine Breite, und zu ihren zwei Seiten liegen verschiedene Zellen)
        const breit = !!weich && !!c.w && c.zl !== c.zr;
        feld[4 * z + 3] = breit ? 1 : 0;
        z++;
        // (zwei Zeilen: die Weiten der einlaufenden Füllung links und rechts der Kette, an den drei Ecken des Dreiecks)
        for (let q = 0; q < 6; q++) feld[4 * (z + (q < 3 ? 0 : 1)) + (q % 3)] = endlich(wr?.[6 * ki + q]);
        z += 2;
        // (zwei Zeilen: der Abstand der drei Ecken zu dieser Kette, mit Vorzeichen, und die Breite des Verlaufs an den drei Ecken)
        const ww = breit ? weich.feld.rand[r.ri] : undefined;
        for (let q = 0; q < 6; q++) feld[4 * (z + (q < 3 ? 0 : 1)) + (q % 3)] = ww?.[6 * ki + q] ?? 0;
        z += 2;
        for (let j = 0; j < nP; j++) {
          feld[4 * z] = c.p[2 * j]!;
          feld[4 * z + 1] = c.p[2 * j + 1]!;
          z++;
        }
        ketten++;
        punkte += nP;
      });
      const ab = ri * je * 3;
      quelle.set(I.subarray(3 * je * r.t, 3 * je * (r.t + 1)), ab);
      bary.set(ecken, 2 * ab);
      slot.fill(kopf, ab, ab + je * 3);
    });
    this.randQuelle = quelle;
    this.daten.dispose();
    this.daten = this.datenTextur(feld);
    this.farben.dispose();
    this.farben = this.farbenTextur(farben);
    this.randMat.uniforms.tDaten!.value = this.daten;
    this.randMat.uniforms.tFarben!.value = this.farben;
    this.randMat.uniforms.uWeich!.value = weich ? 1 : 0;
    const h = this.randGeo;
    const lage = new BufferAttribute(new Float32Array(3 * nE), 3);
    const normale = new BufferAttribute(new Float32Array(3 * nE), 3);
    const seite = new BufferAttribute(new Float32Array(nE), 1);
    lage.setUsage(DynamicDrawUsage);
    normale.setUsage(DynamicDrawUsage);
    seite.setUsage(DynamicDrawUsage);
    h.setAttribute('position', lage);
    h.setAttribute('normal', normale);
    h.setAttribute('aSeite', seite);
    h.setAttribute('aBary', new BufferAttribute(bary, 2));
    h.setAttribute('aSlot', new BufferAttribute(slot, 1));
    this.hatRand = nE > 0;
    this.zahlen = { innen: summe / 3, rand: nE / 3, ketten, punkte, fuellungen: farben.length, weich: weichZahl };
    this.bewegen(netz);
  }

  /** die Lagen der Haut haben sich geändert: Innen teilt die Felder der Anzeige, die Ecken des Rands werden nachgezogen */
  private bewegen(netz: HautNetz): void {
    for (const n of ['position', 'normal', 'aSeite']) {
      const a = this.innenGeo.getAttribute(n) as BufferAttribute | undefined;
      if (a) a.needsUpdate = true;
    }
    const Q = this.randQuelle;
    if (!Q.length) return;
    const lage = this.randGeo.getAttribute('position') as BufferAttribute;
    const normale = this.randGeo.getAttribute('normal') as BufferAttribute;
    const seite = this.randGeo.getAttribute('aSeite') as BufferAttribute;
    const L = lage.array as Float32Array;
    const N = normale.array as Float32Array;
    const S = seite.array as Float32Array;
    const P = netz.pos;
    const NN = netz.normal;
    const SS = netz.seite;
    for (let i = 0; i < Q.length; i++) {
      const v = Q[i]!;
      L[3 * i] = P[3 * v]!;
      L[3 * i + 1] = P[3 * v + 1]!;
      L[3 * i + 2] = P[3 * v + 2]!;
      N[3 * i] = NN[3 * v]!;
      N[3 * i + 1] = NN[3 * v + 1]!;
      N[3 * i + 2] = NN[3 * v + 2]!;
      S[i] = SS[v]!;
    }
    lage.needsUpdate = true;
    normale.needsUpdate = true;
    seite.needsUpdate = true;
  }

  /** vor dem Zeichnen: wie die Farbe mit dem Grund verrechnet wird, und die Schnitte (für alle Netze dieser Ebene) */
  werte(art: ZeichenArt, w: FarbWerte): void {
    if (art !== this.modus) {
      this.modus = art;
      this.blenden(this.randMat, art, true);
      for (const m of this.innenAlle()) this.blenden(m, art, !this.innenMat.includes(m));
    }
    const sn = w.schnitt && Math.hypot(w.schnitt[0], w.schnitt[1], w.schnitt[2]) > 1e-9 ? w.schnitt : [0, 0, 1, -1e9];
    const nr = art === 'hell' ? 1 : art === 'sammel' ? 2 : 0;
    for (const m of [this.randMat, ...this.innenAlle()]) {
      m.uniforms.uSchnitt!.value = sn;
      m.uniforms.uSpiegel!.value = w.spiegelSchnitt ?? -1;
      m.uniforms.uModus!.value = nr;
    }
  }
}

const NULL_ZAHLEN = { innen: 0, rand: 0, ketten: 0, punkte: 0, fuellungen: 0, weich: 0 };
/**
 * Der Körper (alles, was verdeckt) ohne Farbe: für die Tiefe und für die Durchgänge, die ein Sammelbild mit dem Grund verrechnen.
 * `uBild`, `uTiefe`: wie in den Programmen der Bemalung (eine Kopie der Ebenen-Ansicht). `invariant`: Zwei Durchgänge müssen
 * Bit für Bit dieselbe Tiefe geben (der zweite zeichnet nur, wo sie gleich ist).
 */
const KOERPER_VERTEX = /* glsl */ `
  uniform vec3 uBild;
  uniform vec2 uTiefe;
  invariant gl_Position;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position.xy = gl_Position.xy * uBild.x + uBild.yz * gl_Position.w;
    gl_Position.z = gl_Position.z * uTiefe.x + uTiefe.y * gl_Position.w;
  }
`;

/**
 * Der Körper so oft in einer Szene, wie es Kopien gibt (Etappe 6), jede an ihrem Platz im Bild und in ihrem Bereich der Tiefe: ein
 * Material, mehrere Netze auf denselben Feldern; vor jedem Netz bekommt das Material das Bild seiner Kopie.
 */
class KoerperSatz {
  private readonly netze: Mesh[] = [];
  constructor(
    private readonly szene: Scene,
    private readonly geo: BufferGeometry,
    readonly material: ShaderMaterial,
    private readonly ordnung = 0,
  ) {
    material.uniforms.uBild ??= { value: new Vector3(1, 0, 0) };
    material.uniforms.uTiefe ??= { value: new Vector2(1, 0) };
  }

  /** für diesen Durchgang: je Kopie ein Netz (null: nichts zeichnen) */
  setzen(kopien: readonly FarbKopie[] | null): void {
    const n = kopien?.length ?? 0;
    while (this.netze.length < n) {
      const netz = new Mesh(this.geo, this.material);
      netz.frustumCulled = false;
      netz.renderOrder = this.ordnung;
      netz.onBeforeRender = () => {
        const k = netz.userData.k as FarbKopie;
        (this.material.uniforms.uBild!.value as Vector3).set(k.s, k.tx, k.ty);
        (this.material.uniforms.uTiefe!.value as Vector2).set(k.za, k.zb);
        this.material.uniformsNeedUpdate = true;
      };
      this.szene.add(netz);
      this.netze.push(netz);
    }
    this.netze.forEach((netz, i) => {
      netz.visible = i < n;
      if (i < n) netz.userData.k = kopien![i]!;
    });
  }
}

/**
 * Etappe 5: der Stapel der Ebenen im Bild. Er hält je Ebene ihre `FarbAnzeige`, weiß, welche gezeichnet werden und in welcher
 * Reihenfolge, und zeichnet sie zusammen über das, was im gebundenen Ziel steht.
 */
export class FarbStapel {
  private readonly szene = new Scene();
  private readonly licht: DataTexture;
  private readonly jeEbene = new Map<number, FarbAnzeige>();
  /** die Ebenen, die gezeichnet werden, von unten nach oben; `aktive`: die, an der gemalt wird (nur sie zeigt ihre Farblinien) */
  private reihe: FarbAnzeige[] = [];
  private aktive: FarbAnzeige | null = null;
  private geteilt: { pos: Float32Array; normal: Float32Array; seite: Float32Array; felder: Gemeinsam } | null = null;
  private readonly groesse = new Vector2();
  private readonly merkFarbe = new Color();

  constructor() {
    const G = 256;
    const roh = wachsLichtBild(G);
    const halb = new Uint16Array(roh.length);
    for (let i = 0; i < roh.length; i++) halb[i] = DataUtils.toHalfFloat(roh[i]!);
    this.licht = new DataTexture(halb, G, G, RGFormat, HalfFloatType);
    this.licht.magFilter = LinearFilter;
    this.licht.minFilter = LinearFilter;
    this.licht.needsUpdate = true;
  }

  /** die Felder der glatten Anzeige, von allen Ebenen geteilt (ändert sich das Netz, neue) */
  private gemeinsam = (netz: HautNetz): Gemeinsam => {
    const g = this.geteilt;
    if (g && g.pos === netz.pos && g.normal === netz.normal && g.seite === netz.seite) return g.felder;
    const felder = { position: new BufferAttribute(netz.pos, 3), normal: new BufferAttribute(netz.normal, 3), seite: new BufferAttribute(netz.seite, 1) };
    this.geteilt = { pos: netz.pos, normal: netz.normal, seite: netz.seite, felder };
    return felder;
  };

  /** die Anzeige einer Ebene (angelegt, wenn es sie noch nicht gibt) */
  fuer(id: number): FarbAnzeige {
    let a = this.jeEbene.get(id);
    if (!a) {
      a = new FarbAnzeige(id, this.licht, this.gemeinsam);
      a.gruppe.visible = false;
      this.szene.add(a.gruppe);
      this.jeEbene.set(id, a);
    }
    return a;
  }

  /**
   * Was gezeichnet wird: `sichtbar`, die Ebenen von unten nach oben; `aktiv`: an welcher gemalt wird; `alle`: die es gibt (die
   * Anzeige jeder anderen wird freigegeben). Eine ausgeblendete Ebene behält, was sie zuletzt zeigte, bis sie wieder dran ist.
   */
  ordnen(sichtbar: readonly number[], aktiv: number, alle: readonly number[]): void {
    for (const [id, a] of this.jeEbene) {
      if (alle.includes(id)) continue;
      a.weg();
      this.jeEbene.delete(id);
    }
    for (const a of this.jeEbene.values()) a.gruppe.visible = false;
    this.reihe = sichtbar.map((id) => {
      const a = this.fuer(id);
      a.gruppe.visible = true;
      return a;
    });
    this.aktive = sichtbar.includes(aktiv) ? this.fuer(aktiv) : null;
  }

  /** ist etwas zu zeichnen? */
  get leer(): boolean {
    return this.reihe.every((a) => a.leer);
  }

  /** nichts mehr zeigen (keine Bemalung, oder kein Netz) */
  leeren(): void {
    for (const a of this.jeEbene.values()) a.leeren();
  }

  /** zählt, was gezeichnet wird, über alle Ebenen (für Proben) */
  get zahlen(): FarbAnzeige['zahlen'] {
    const z = { ...NULL_ZAHLEN };
    for (const a of this.reihe) for (const k of Object.keys(z) as (keyof typeof z)[]) z[k] += a.zahlen[k];
    return z;
  }

  /**
   * Was der letzte Durchgang tat (für Proben): wie viele Ebenen etwas zeichneten, ob sie gesammelt wurden, auf wie vielen Kopien
   * und mit wie vielen Netzpaaren
   */
  stand = { ebenen: 0, gesammelt: false, kopien: 1, netze: 0 };
  /** für Messungen: auf Wachs nie sammeln (jede Ebene für sich über die darunter, wie eine einzelne) */
  wachsOhneSammeln = false;

  /** die Dreiecke von allem, was verdeckt (`netz`: alle Objekte), mit ihren Normalen */
  private readonly koerperGeo = new BufferGeometry();
  private koerperStand: { netz: HautNetz; index: Uint32Array; pos: Float32Array } | null = null;
  /** die Felder des Körpers nachziehen; `bewegt`: Die Lagen haben sich geändert */
  private koerperSetzen(netz: HautNetz, bewegt: boolean): void {
    const K = this.koerperStand;
    if (!K || K.netz !== netz || K.index !== netz.index || K.pos !== netz.pos) {
      this.koerperGeo.setAttribute('position', new BufferAttribute(netz.pos, 3));
      this.koerperGeo.setAttribute('normal', new BufferAttribute(netz.normal, 3));
      this.koerperGeo.setIndex(new BufferAttribute(netz.index, 1));
      this.koerperStand = { netz, index: netz.index, pos: netz.pos };
    } else if (bewegt) {
      (this.koerperGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
      (this.koerperGeo.getAttribute('normal') as BufferAttribute).needsUpdate = true;
    }
  }

  /** der Körper in einer eigenen Szene, je Kopie ein Netz, mit diesem Programm */
  private satz(material: ShaderMaterial, szene = new Scene()): { szene: Scene; satz: KoerperSatz } {
    return { szene, satz: new KoerperSatz(szene, this.koerperGeo, material) };
  }

  private tiefe: { szene: Scene; satz: KoerperSatz } | null = null;
  /**
   * Die Tiefe der Haut in das gebundene Ziel schreiben, ohne Farbe (für eine Zeichenfläche, deren Tiefe nicht von Ozzys Kamera
   * stammt: die des hellen Solids). `netz`: alles, was verdeckt (alle Objekte); `bewegt`: Die Lagen haben sich geändert.
   */
  tiefeSchreiben(renderer: WebGLRenderer, kamera: Camera, netz: HautNetz, bewegt: boolean, kopien: readonly FarbKopie[] = EINE_KOPIE): void {
    this.koerperSetzen(netz, bewegt);
    this.tiefe ??= this.satz(new ShaderMaterial({ vertexShader: KOERPER_VERTEX, fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }', colorWrite: false, side: DoubleSide }));
    this.tiefe.satz.setzen(kopien);
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.tiefe.szene, kamera);
    renderer.autoClear = auto;
  }

  private sammel: {
    /** das Sammelbild: alle Ebenen, die reinen Farben mal ihre Deckung, oben deckt unten */
    ziel: WebGLRenderTarget;
    /** der Körper im Sammelbild (über dem hellen Solid weiß, auf Wachs nur seine Tiefe) */
    koerper: KoerperSatz;
    /** Wachs: welchen Teil jedes Bildpunkts der Körper deckt (ein eigenes Bild: der Körper allein, weiß) */
    deckung: { ziel: WebGLRenderTarget; szene: Scene; satz: KoerperSatz } | null;
    /** der Durchgang, der das Sammelbild mit dem Grund verrechnet: der Körper selbst, je Grund sein Programm */
    hell: { szene: Scene; satz: KoerperSatz } | null;
    wachs: { szene: Scene; satz: KoerperSatz } | null;
  } | null = null;

  /**
   * Mehrere Ebenen: alle in ein eigenes Bild (die reinen Farben in Bildschirmwerten, oben deckt unten), dann dieses Bild einmal mit
   * dem verrechnen, was im gebundenen Ziel steht.
   *
   * - Das Sammelbild entsteht in einem Durchgang: Ein Ziel mit Kantenglättung gibt nach jedem Durchgang seine Farbe frei.
   * - Verrechnet wird nicht über die ganze Fläche, sondern mit dem Körper selbst: nur an den Stellen eines Bildpunkts, die er
   *   deckt (am Umriss blieben sonst die Stellen daneben nicht, wie sie sind).
   * - An einem Bildpunkt, den der Körper nur zum Teil deckt, steht im Sammelbild alles mal diesen Teil. Über dem hellen Solid
   *   liegen die Ebenen deshalb auf dem weißen Körper (seine Deckung ist dieser Teil; geteilt durch ihn ist es wieder die Farbe,
   *   und Weiß ändert beim Multiplizieren nichts). Auf Wachs muss auch die Deckung der Farbe selbst stimmen (wo keine liegt,
   *   bleibt das Wachs): Dort steht der Teil des Körpers in einem zweiten Bild.
   * - Helles Solid: an jeder Stelle nur einmal (nur die vorderste Fläche: Tiefe gleich der zuvor geschriebenen). Wachs: gegen die
   *   Tiefe, die das Wachs geschrieben hat, wie die Farbe einer einzelnen Ebene.
   * - Etappe 6: Mit mehreren Kopien steht je Kopie ein Körper in jedem dieser Durchgänge, an ihrem Platz und in ihrem Bereich der
   *   Tiefe; die Netze der Ebenen sind schon gestellt.
   */
  private sammeln(renderer: WebGLRenderer, kamera: Camera, netz: HautNetz, modus: FarbModus, kopien: readonly FarbKopie[]): void {
    this.koerperSetzen(netz, true);
    if (!this.sammel) {
      const koerper = new KoerperSatz(this.szene, this.koerperGeo, new ShaderMaterial({ vertexShader: KOERPER_VERTEX, fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }', side: DoubleSide }), -1);
      this.sammel = { ziel: new WebGLRenderTarget(4, 4, { samples: 4, depthBuffer: true }), koerper, deckung: null, hell: null, wachs: null };
    }
    const S = this.sammel;
    // so groß wie das Ziel, über das gezeichnet wird
    const vorher = renderer.getRenderTarget();
    const g = vorher ? this.groesse.set(vorher.width, vorher.height) : renderer.getDrawingBufferSize(this.groesse);
    if (S.ziel.width !== g.x || S.ziel.height !== g.y) S.ziel.setSize(g.x, g.y);
    const farbe = renderer.getClearColor(this.merkFarbe);
    const alpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    // das Sammelbild
    S.koerper.setzen(kopien);
    S.koerper.material.colorWrite = modus === 'hell';
    renderer.setRenderTarget(S.ziel);
    renderer.clear(true, true, true);
    renderer.render(this.szene, kamera);
    S.koerper.setzen(null);
    if (modus === 'wachs') {
      // welchen Teil jedes Bildpunkts der Körper deckt
      if (!S.deckung) {
        const d = this.satz(new ShaderMaterial({ vertexShader: KOERPER_VERTEX, fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }', side: DoubleSide, depthTest: false, depthWrite: false }));
        S.deckung = { ziel: new WebGLRenderTarget(4, 4, { samples: 4, depthBuffer: false, format: RedFormat }), ...d };
      }
      if (S.deckung.ziel.width !== g.x || S.deckung.ziel.height !== g.y) S.deckung.ziel.setSize(g.x, g.y);
      S.deckung.satz.setzen(kopien);
      renderer.setRenderTarget(S.deckung.ziel);
      renderer.clear(true, false, false);
      renderer.render(S.deckung.szene, kamera);
    }
    renderer.setRenderTarget(vorher);
    renderer.setClearColor(farbe, alpha);
    if (modus === 'hell') {
      S.hell ??= this.satz(
        new ShaderMaterial({
          uniforms: { tBild: { value: S.ziel.texture }, uGroesse: { value: new Vector2(4, 4) } },
          vertexShader: KOERPER_VERTEX,
          fragmentShader: 'uniform sampler2D tBild; uniform vec2 uGroesse; void main() { vec4 c = texture2D(tBild, gl_FragCoord.xy / uGroesse); gl_FragColor = vec4(c.a > 0.002 ? c.rgb / c.a : vec3(1.0), 1.0); }',
          side: DoubleSide,
          forceSinglePass: true,
          depthFunc: EqualDepth,
          depthWrite: false,
          transparent: true,
          // multiplizieren, wie eine einzelne Ebene über dem hellen Solid (die Deckung des Bilds bleibt)
          blending: CustomBlending,
          blendSrc: DstColorFactor,
          blendDst: ZeroFactor,
          blendSrcAlpha: ZeroFactor,
          blendDstAlpha: OneFactor,
        }),
      );
      (S.hell.satz.material.uniforms.uGroesse!.value as Vector2).copy(g);
      S.hell.satz.setzen(kopien);
      // die Tiefe des Körpers ins Ziel, dann der Körper selbst, wo er vorn liegt: mal dem Sammelbild
      this.tiefeSchreiben(renderer, kamera, netz, false, kopien);
      renderer.render(S.hell.szene, kamera);
      return;
    }
    S.wachs ??= this.satz(
      new ShaderMaterial({
        uniforms: { tBild: { value: S.ziel.texture }, tDeckung: { value: S.deckung!.ziel.texture }, tLicht: { value: this.licht }, uGroesse: { value: new Vector2(4, 4) } },
        vertexShader: /* glsl */ `
          uniform vec3 uBild;
          uniform vec2 uTiefe;
          varying vec3 vBlick;
          varying vec3 vNormale;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vBlick = -mv.xyz;
            vNormale = normalMatrix * normal;
            gl_Position = projectionMatrix * mv;
            gl_Position.xy = gl_Position.xy * uBild.x + uBild.yz * gl_Position.w;
            gl_Position.z = gl_Position.z * uTiefe.x + uTiefe.y * gl_Position.w;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform highp sampler2D tBild;
          uniform highp sampler2D tDeckung;
          uniform highp sampler2D tLicht;
          uniform vec2 uGroesse;
          varying vec3 vBlick;
          varying vec3 vNormale;
          vec3 linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
          void main() {
            vec2 uv = gl_FragCoord.xy / uGroesse;
            vec4 t = texture2D(tBild, uv);
            if (t.a < 0.002) discard;
            // (am Umriss deckt der Körper nur einen Teil des Bildpunkts: Die Deckung der Farbe ist, was davon gefärbt ist)
            float a = clamp(t.a / max(texture2D(tDeckung, uv).r, t.a), 0.0, 1.0);
            // Hell, Dunkel und Glanz des Wachses, wie bei einer einzelnen Ebene (aus() im Programm der Farbe)
            vec3 n = normalize(vNormale);
            vec3 blick = normalize(vBlick);
            vec3 x = normalize(vec3(blick.z, 0.0, -blick.x));
            vec3 y = cross(blick, x);
            vec2 licht = texture2D(tLicht, vec2(dot(x, n), dot(y, n)) * 0.495 + 0.5).rg;
            vec3 c = linear(t.rgb / t.a) * licht.r + vec3(licht.g);
            gl_FragColor = vec4(c * a, a);
          }
        `,
        // wie die Farbe einer einzelnen Ebene: überlagert, vor der Haut, beide Seiten in einem Durchgang
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        forceSinglePass: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
        blending: CustomBlending,
        blendSrc: OneFactor,
        blendDst: OneMinusSrcAlphaFactor,
        blendSrcAlpha: OneFactor,
        blendDstAlpha: OneMinusSrcAlphaFactor,
      }),
    );
    (S.wachs.satz.material.uniforms.uGroesse!.value as Vector2).copy(g);
    S.wachs.satz.setzen(kopien);
    renderer.render(S.wachs.szene, kamera);
  }

  /**
   * Über das zeichnen, was im gebundenen Ziel steht (die Haut mit ihrem Grund; auf Wachs auch mit ihrer Tiefe, auf dem hellen
   * Solid wird sie hier geschrieben: `w.verdeckt`). Die Ebenen von unten nach oben, jede deckt, was unter ihr liegt. Etappe 6:
   * mit `w.kopien` je Kopie die Ebenen, die sie zeigt, alle Kopien in einem Durchgang.
   */
  zeichnen(renderer: WebGLRenderer, kamera: Camera, w: FarbWerte): void {
    const kopien = w.kopien?.length ? w.kopien : EINE_KOPIE;
    // die Zeichnungen dieses Durchgangs: je Kopie die Ebenen, die sie zeigt, von unten nach oben
    const gebraucht = new Map<FarbAnzeige, number>();
    const da = new Set<FarbAnzeige>();
    /** je Kopie: wie viele Ebenen sie zeigt, und ob eine über ihrer untersten weiche Kanten hat */
    let mehrere = false;
    let obenWeich = false;
    let netze = 0;
    kopien.forEach((k, c) => {
      let zahl = 0;
      this.reihe.forEach((a, j) => {
        const sicht = k.nur ? Math.max(0, Math.min(1, k.nur.get(a.id) ?? 0)) : 1;
        if (a.leer || sicht <= 0.002) return;
        const n = gebraucht.get(a) ?? 0;
        gebraucht.set(a, n + 1);
        da.add(a);
        // (die Farblinien der aktiven Ebene nur dort, wo sie ganz zu sehen ist)
        a.stellen(n, { s: k.s, tx: k.tx, ty: k.ty, za: k.za, zb: k.zb, sicht, linie: a === this.aktive && sicht > 0.999 ? w.linie : 0 }, 64 * c + j);
        if (zahl > 0 && a.weich) obenWeich = true;
        zahl++;
        netze++;
      });
      if (zahl > 1) mehrere = true;
    });
    for (const a of this.jeEbene.values()) a.rest(gebraucht.get(a) ?? 0);
    this.stand = { ebenen: da.size, gesammelt: false, kopien: kopien.length, netze };
    if (!da.size) return;
    // Mehrere Ebenen auf einer Kopie werden erst gesammelt, dann einmal mit dem Grund verrechnet. Über dem hellen Solid immer
    // (multipliziert deckt nichts). Auf Wachs deckt schon das Überlagern, und das Sammeln kostet (zwei Bilder mehr in der Größe
    // des Fensters: gemessen 3,5 ms je Bild bei 2880 × 1800): Gesammelt wird dort nur, wenn es etwas ändert, also wenn eine Ebene
    // über der untersten weiche Kanten hat (überlagert mischte sie im Licht, heller als innerhalb einer Ebene). Und nicht,
    // solange eine Füllung einläuft: Ihr Wulst fängt Licht und Glanz des Wachses, das trägt das Sammelbild nicht.
    const noetig = w.modus === 'hell' || (!this.wachsOhneSammeln && obenWeich && ![...da].some((a) => a.fliesst));
    const gesammelt = mehrere && !!w.verdeckt && noetig;
    this.stand.gesammelt = gesammelt;
    for (const a of da) a.werte(gesammelt ? 'sammel' : w.modus, w);
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    if (gesammelt) this.sammeln(renderer, kamera, w.verdeckt!, w.modus, kopien);
    else {
      if (w.modus === 'hell' && w.verdeckt) this.tiefeSchreiben(renderer, kamera, w.verdeckt, true, kopien);
      renderer.render(this.szene, kamera);
    }
    renderer.autoClear = auto;
  }
}
