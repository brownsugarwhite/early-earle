// Ozzy-Figur, Etappe B: Renderer (WebGL2, eigene Ebene, auch in der iOS-App).
//
// Jedes Teil bekommt ein eigenes Abstandsfeld mit Vorzeichen (bis 24 Teile, 6 Texturen à 4 Kanäle):
//   1. Strecken: jede Kante der abgeflachten Form als Rechteck, die Grafikkarte behält den kleinsten Abstand (MIN-Mischen),
//      gespeichert als e = 0,5 + 0,5·d/R.
//   2. Vorzeichen: Schablone je Teil (Fächer, nonzero), dann innen e → 1 − e (Mischen 1−dst/1−src kippt nur diesen Kanal).
//   3. Außenkanten: dieselben Strecken noch einmal; der Vertex-Shader liest die Felder und wirft Kanten weg, die in einem anderen
//      schwarzen Teil liegen. Übrig bleibt der Abstand zum äußeren Umriss (für das Verdecken von Weiß).
//   4. Bild: Schwarz je Gruppenpaar weich vereinigt (0 = exakt), Weiß in Malreihenfolge darüber (schwarze Teile, die in der Datei
//      später kommen, decken es zu), Weiß in seinem Träger, auf der abgewandten Seite verdeckt, Ohrspalt als verjüngter Keil.
// Kantenglättung aus dem Abstand (1 Bildpunkt breit), scharf in jeder Größe.
import { abflachen, type Form, type Punkt } from './form';

export type Gruppe = 'bohne' | 'bein' | 'schwanz' | 'kopf' | 'ohrA' | 'ohrB' | 'nase' | 'sonst';
const GRUPPE_NR: Record<Gruppe, number> = { bohne: 0, bein: 1, schwanz: 2, kopf: 3, ohrA: 4, ohrB: 5, nase: 6, sonst: 7 };

export interface RenderTeil {
  name: string;
  weiss: boolean;
  /** nur für Schwarz: wer mit wem flüssig verschmilzt */
  gruppe: Gruppe;
  /** in Figur-Einheiten (wie in Florians SVG) */
  form: Form;
  /** Weiß: Index des schwarzen Teils, in dem es bleibt */
  traeger?: number;
  /** Weiß: Mindestrand im Träger (Figur-Einheiten); negativ = Klemme liegt so weit draußen, dass sie nicht wirkt */
  rand?: number;
  /** Weiß: liegt hinter diesem schwarzen Teil (Index), auch wenn es später gezeichnet wird; so kann es weich davor treten */
  hinter?: number;
  /** wie tief das verdeckende Teil zählt (Figur-Einheiten): 0 = genau sein Umriss deckt, größer = es deckt nur noch tiefer innen */
  hinterTiefe?: number;
  /** Weiß, das mit anderem Weiß verschmilzt: Bart und Vorderbeinfenster fließen ineinander (Stärke `fluessig.weissWeiss`) */
  weissGruppe?: 'bart' | 'fenster';
}
/** Verdecken auf der abgewandten Seite: Rand wächst zur fernen Seite hin (Figur-Einheiten) */
export interface Verdecker {
  mitte: Punkt;
  richtung: Punkt;
  radius: number;
  staerke: number;
}
export interface Ohrspalt {
  nah: number;
  fern: number;
  breite: number;
  auslauf: number;
}
/** Stärke der weichen Vereinigung je Paar (Figur-Einheiten, 0 = exakt wie gezeichnet) und Weichheit der Klemme */
export interface Fluessig {
  bohneBein: number;
  bohneSchwanz: number;
  bohneKopf: number;
  kopfOhr: number;
  ohrOhr: number;
  kopfNase: number;
  /** Bartweiß und Fensterweiß fließen ineinander (0 = wie gezeichnet: Haarspitzen dürfen Fenster überdecken; Florian: aus) */
  weissWeiss: number;
  /** Beinfenster geben dem Schwarz, das über ihnen liegt, weich nach (0 = harte Kante wie gezeichnet) */
  weissSchwarz: number;
  klemme: number;
}
export const EXAKT: Fluessig = { bohneBein: 0, bohneSchwanz: 0, bohneKopf: 0, kopfOhr: 0, ohrOhr: 0, kopfNase: 0, weissWeiss: 0, weissSchwarz: 0, klemme: 0 };
export const FLUESSIG: Fluessig = { bohneBein: 12, bohneSchwanz: 10, bohneKopf: 10, kopfOhr: 8, ohrOhr: 4, kopfNase: 5, weissWeiss: 0, weissSchwarz: 8, klemme: 4 };

export interface Szene {
  teile: RenderTeil[];
  fluessig: Fluessig;
  verdecker: Verdecker[];
  ohrspalt: Ohrspalt | null;
  /**
   * Weiche Malreihenfolge (Haltungswechsel): deckung[c][b] = Anteil, zu dem das schwarze Teil b über dem weißen c liegt. Fehlt sie,
   * gilt die Reihenfolge der Liste. Bei einem Anteil zwischen 0 und 1 deckt b das Weiß nur, wo es tiefer als (1 − Anteil)·R in b
   * liegt: Das Schwarz schiebt sich im Wechsel von innen über das Weiß, statt umzuklappen.
   */
  deckung?: number[][] | null;
  /**
   * Durchbruch (Florian, 19.11.: „es sollen immer schöne Verjüngungen ins Weiß entstehen, die smooth ein- und auswachsen. Nie eine
   * durchgängige dünne Outline“): Schwarz zwischen dem Bart und dem Umriss, das dort dünner als `duenn` ist, nimmt das Weiß ganz; bis
   * `voll` läuft es spitz aus (das Weiß nimmt nur seinen inneren Teil), dickeres bleibt (Figur-Einheiten; fehlt er: aus)
   */
  durchbruch?: { duenn: number; voll: number } | null;
}
/** Figur-Einheiten → Bildpunkte des Zeichenpuffers: px = (x − x0)·massstab */
export interface Ansicht {
  massstab: number;
  x0: number;
  y0: number;
}
/** 0 normal, 1 Weiß ohne Schwarz darunter rot, 2 Ohrspalt blau */
export type Diagnose = 0 | 1 | 2;

export const MAX_TEILE = 24;
/** höchstens so viele weiße Teile mit weicher Malreihenfolge */
const MAX_WEISS = 8;
/** Durchbruch: ein Rest Schwarz zwischen Bart und Umriss, dünner als so viele Bildpunkte, geht mit ins Weiß (Florian: sauber ausverjüngen) */
const DURCH_REST = 0.75;
const NT = 6;

const KOPF = '#version 300 es\nprecision highp float;\nprecision highp int;\n';
const AUS6 = [0, 1, 2, 3, 4, 5].map((i) => `layout(location=${i}) out vec4 o${i};`).join('\n') + '\n';
const SETZE = `void setze(int ch, float wert, float sonst){ vec4 s = vec4(sonst); o0 = s; o1 = s; o2 = s; o3 = s; o4 = s; o5 = s;
  int i = ch / 4; int c = ch - i * 4;
  vec4 v = vec4(c == 0 ? wert : sonst, c == 1 ? wert : sonst, c == 2 ? wert : sonst, c == 3 ? wert : sonst);
  if (i == 0) o0 = v; else if (i == 1) o1 = v; else if (i == 2) o2 = v; else if (i == 3) o3 = v; else if (i == 4) o4 = v; else o5 = v; }\n`;
const LESEN = `uniform sampler2D t0, t1, t2, t3, t4, t5; uniform float R;
float feld(ivec2 q, int c){ int i = c / 4; int k = c - i * 4;
  vec4 v = i == 0 ? texelFetch(t0, q, 0) : i == 1 ? texelFetch(t1, q, 0) : i == 2 ? texelFetch(t2, q, 0) : i == 3 ? texelFetch(t3, q, 0) : i == 4 ? texelFetch(t4, q, 0) : texelFetch(t5, q, 0);
  float e = k == 0 ? v.x : k == 1 ? v.y : k == 2 ? v.z : v.w; return (e - 0.5) * 2.0 * R; }\n`;
const STRECKE_VS = `in vec2 ecke; in vec2 pa; in vec2 pb; in float kanal; in float reich; uniform vec2 gr; out vec2 va; out vec2 vb; flat out int vk;
vec2 lageVon(float R){ vec2 d = pb - pa; float l = length(d); vec2 t = l > 1e-6 ? d / l : vec2(1, 0); vec2 n = vec2(-t.y, t.x);
  return (ecke.x < 0.0 ? pa - t * R : pb + t * R) + n * R * ecke.y; }\n`;

export class FigurRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly halbFloat: boolean;
  private readonly pFan: WebGLProgram;
  private readonly pKippe: WebGLProgram;
  private readonly pStrecke: WebGLProgram;
  private readonly pAussen: WebGLProgram;
  private readonly pBild: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly bufQuad: WebGLBuffer;
  private readonly bufFan: WebGLBuffer;
  private readonly bufStr: WebGLBuffer;
  private texe: WebGLTexture[] = [];
  private texAussen: WebGLTexture | null = null;
  private fb: WebGLFramebuffer | null = null;
  private fbAussen: WebGLFramebuffer | null = null;
  private rb: WebGLRenderbuffer | null = null;
  private W = 0;
  private H = 0;
  private readonly orte = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  private readonly zeitAbfrage: { ext: unknown; offen: WebGLQuery[]; ms: number } | null;
  /** zuletzt: Strecken, Rechenzeit auf dem Prozessor (ms), Zeit der Grafikkarte (ms, wenn messbar) */
  letzte = { strecken: 0, cpuMs: 0, gpuMs: NaN, R: 0 };

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, stencil: true, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 fehlt');
    this.gl = gl;
    this.halbFloat = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.zeitAbfrage = ext ? { ext, offen: [], ms: NaN } : null;
    const fanFS = KOPF + AUS6 + 'void main(){ vec4 z = vec4(0); o0 = z; o1 = z; o2 = z; o3 = z; o4 = z; o5 = z; }';
    this.pFan = this.programm(KOPF + 'in vec2 a; uniform vec2 gr; void main(){ gl_Position = vec4(a / gr * 2.0 - 1.0, 0.0, 1.0); }', fanFS);
    this.pKippe = this.programm(
      KOPF + 'in vec2 a; uniform vec4 kasten; uniform vec2 gr; void main(){ vec2 p = mix(kasten.xy, kasten.zw, a * 0.5 + 0.5); gl_Position = vec4(p / gr * 2.0 - 1.0, 0.0, 1.0); }',
      KOPF + AUS6 + SETZE + 'uniform int ch; void main(){ setze(ch, 1.0, 0.0); }',
    );
    const streckeFS = `in vec2 va; in vec2 vb; flat in int vk; uniform float R;
      float abstand(){ vec2 p = gl_FragCoord.xy; vec2 ab = vb - va; float h = clamp(dot(p - va, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0); return min(length(p - va - ab * h) / R, 1.0); }\n`;
    this.pStrecke = this.programm(
      KOPF + STRECKE_VS + 'void main(){ va = pa; vb = pb; vk = int(kanal + 0.5); gl_Position = vec4(lageVon(reich) / gr * 2.0 - 1.0, 0.0, 1.0); }',
      KOPF + AUS6 + SETZE + streckeFS + 'void main(){ setze(vk, 0.5 + 0.5 * abstand(), 1.0); }',
    );
    this.pAussen = this.programm(
      KOPF + LESEN + STRECKE_VS +
        `uniform int schwarzBits;
        void main(){ va = pa; vb = pb; vk = int(kanal + 0.5);
          vec2 d = pb - pa; float l = length(d); vec2 t = l > 1e-6 ? d / l : vec2(1, 0); vec2 n = vec2(-t.y, t.x);
          vec2 m = (pa + pb) * 0.5; vec2 grenze = gr - 1.0;
          ivec2 qm = ivec2(clamp(m, vec2(0.0), grenze));
          vec2 au = m + n * 2.0; if (feld(ivec2(clamp(au, vec2(0.0), grenze)), vk) < 0.0) au = m - n * 2.0;
          ivec2 qa = ivec2(clamp(au, vec2(0.0), grenze));
          bool innen = false;
          for (int c = 0; c < ${MAX_TEILE}; c++) {
            if (((schwarzBits >> c) & 1) == 0 || c == vk) continue;
            if (feld(qm, c) < -0.5 || feld(qa, c) < -0.5) { innen = true; break; }
          }
          gl_Position = innen ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(lageVon(reich) / gr * 2.0 - 1.0, 0.0, 1.0); }`,
      KOPF + 'layout(location=0) out vec4 o0;\n' + streckeFS + 'void main(){ o0 = vec4(0.5 + 0.5 * abstand()); }',
    );
    this.pBild = this.programm(
      KOPF + 'in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }',
      KOPF + LESEN +
        `uniform sampler2D tAussen; uniform int anzahl; uniform int gruppe[${MAX_TEILE}]; uniform int traeger[${MAX_TEILE}]; uniform float rand[${MAX_TEILE}];
        uniform int hinter[${MAX_TEILE}]; uniform float hinterTiefe[${MAX_TEILE}]; uniform int weissGruppe[${MAX_TEILE}]; uniform float kWeiss; uniform int fensterKanal[2]; uniform int weichKanal[${MAX_TEILE}]; uniform float kWeissSchwarz;
        uniform float kBohneBein, kBohneSchwanz, kBohneKopf, kKopfOhr, kOhrOhr, kKopfNase, kKlemme;
        uniform int verdeckerZahl; uniform vec4 verdeckerA[4]; uniform vec2 verdeckerB[4];
        uniform int spaltNah, spaltFern; uniform float spaltBreite, spaltAuslauf; uniform int diagnose; uniform float durchA, durchB;
        const float durchRest = ${DURCH_REST.toFixed(2)};
        uniform int weichOrdnung; uniform int weissNr[${MAX_TEILE}]; uniform vec4 anteil[${(MAX_WEISS * MAX_TEILE) / 4}];
        out vec4 farbe;
        float smin(float a, float b, float k){ if (k < 1e-4) return min(a, b); float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
        float smax(float a, float b, float k){ return -smin(-a, -b, k); }
        // Weiche Vereinigung nach Kantenrichtung: laufen beide Kanten in dieselbe Richtung (Bohne fließt tangential ins Bein), wird
        // nichts aufgetragen (keine Wulst); in Ecken und über Lücken rundet sie voll
        float sminN(float a, float b, float k){ if (k < 1e-4) return min(a, b);
          vec2 na = vec2(dFdx(a), dFdy(a)); vec2 nb = vec2(dFdx(b), dFdy(b)); float la = length(na); float lb = length(nb);
          float c = (la > 1e-4 && lb > 1e-4) ? dot(na, nb) / (la * lb) : 0.0;
          return smin(a, b, k * clamp((1.0 - c) / 1.2, 0.0, 1.0)); }
        float deck(float d){ return clamp(0.5 - d, 0.0, 1.0); }
        void main(){ ivec2 p = ivec2(gl_FragCoord.xy);
          vec4 T[6]; T[0] = texelFetch(t0, p, 0); T[1] = texelFetch(t1, p, 0); T[2] = texelFetch(t2, p, 0);
          T[3] = texelFetch(t3, p, 0); T[4] = texelFetch(t4, p, 0); T[5] = texelFetch(t5, p, 0);
          float d[${MAX_TEILE}];
          for (int c = 0; c < ${MAX_TEILE}; c++) { vec4 v = T[c / 4]; int k = c - (c / 4) * 4;
            float e = k == 0 ? v.x : k == 1 ? v.y : k == 2 ? v.z : v.w; d[c] = c < anzahl ? (e - 0.5) * 2.0 * R : 1e5; }
          float g[8]; for (int i = 0; i < 8; i++) g[i] = 1e5;
          for (int c = 0; c < ${MAX_TEILE}; c++) { if (c >= anzahl) break; int gi = gruppe[c]; if (gi >= 0) g[gi] = min(g[gi], d[c]); }
          float ohren = sminN(g[4], g[5], kOhrOhr);
          float kopf = sminN(g[3], ohren, kKopfOhr);
          kopf = sminN(kopf, g[6], kKopfNase);
          float koerper = sminN(g[0], g[1], kBohneBein);
          koerper = sminN(koerper, g[2], kBohneSchwanz);
          // Kopf und Körper ohne Kantenrichtung: wo eine Haarspitze der Maske am Bauch endet, rauschten deren Ableitungen (ausgefranste Kante)
          float schwarz = min(smin(koerper, kopf, kBohneKopf), g[7]);
          // ueber: Schwarz, das nach dem Kanal gezeichnet wird; fuer die verschmelzenden Fenster dasselbe mit Kopf, Ohren und Nase um
          // heben zurueckgesetzt (in einem Durchgang, ohne zweite Schleife)
          float heben = 0.3 * kWeiss;
          float ueber[${MAX_TEILE}]; float lauf = 1e5; float laufH = 1e5; float decktF0 = 1e5; float decktF1 = 1e5;
          for (int c = ${MAX_TEILE - 1}; c >= 0; c--) { ueber[c] = lauf;
            if (c == fensterKanal[0]) decktF0 = laufH;
            if (c == fensterKanal[1]) decktF1 = laufH;
            if (c < anzahl && gruppe[c] >= 0) { lauf = min(lauf, d[c]); laufH = min(laufH, gruppe[c] >= 3 && gruppe[c] <= 6 ? d[c] + heben : d[c]); } }
          float u = (texelFetch(tAussen, p, 0).x - 0.5) * 2.0 * R;
          float sil = schwarz < 0.0 ? -u : u;
          vec2 pf = gl_FragCoord.xy; float rv = 0.0;
          for (int k = 0; k < 4; k++) { if (k >= verdeckerZahl) break;
            vec2 q = (pf - verdeckerA[k].xy) / verdeckerB[k].x; rv += verdeckerB[k].y * smoothstep(0.15, 0.85, clamp(dot(q, verdeckerA[k].zw), 0.0, 1.0)); }
          float weiss = 0.0; float wBart = 1e5; float ueberBart = 1e5; float wRoh = 1e5;
          for (int c = 0; c < ${MAX_TEILE}; c++) { if (c >= anzahl) break; if (gruppe[c] >= 0) continue;
            float w = d[c]; int t = traeger[c];
            if (t >= 0) w = smax(w, d[t] + rand[c], kKlemme);
            if (rv > 0.05) w = smax(w, sil + rv, min(kKlemme, rv));
            // weiche Malreihenfolge (Haltungswechsel): Schwarz deckt nach seinem Anteil, von innen nach außen; nur gerechnet, wo das
            // Weiß überhaupt liegt (sonst trägt es nichts bei, auch nicht zum Verschmelzen des Barts)
            float uc = ueber[c];
            if (weichOrdnung == 1 && w < 0.5 + kWeiss) { int wi = weissNr[c]; if (wi >= 0) { uc = 1e5;
              for (int b = 0; b < ${MAX_TEILE}; b++) { if (b >= anzahl) break; if (gruppe[b] < 0) continue;
                int j = wi * ${MAX_TEILE} + b; float a = anteil[j / 4][j - (j / 4) * 4];
                if (a > 0.0) uc = min(uc, d[b] + (1.0 - a) * R); } } }
            // Beinfenster: das Schwarz darüber (Haarspitzen, Rand der Maske) zieht sich weich hinein, statt hart abzuschneiden
            float cw = weichKanal[c] == 1 && kWeissSchwarz > 0.0 ? deck(smax(w, -uc, kWeissSchwarz)) : deck(w) * (1.0 - deck(uc));
            int hi = hinter[c]; if (hi >= 0) cw *= 1.0 - deck(d[hi] + hinterTiefe[c]);
            weiss = max(weiss, cw);
            // Bart, wie er nach der Malreihenfolge sichtbar ist (das später gezeichnete Schwarz als Abstand abgezogen)
            if (weissGruppe[c] == 1) { wBart = min(wBart, max(w, -uc)); ueberBart = min(ueberBart, uc); wRoh = min(wRoh, w); } }
          // Durchbruch: Schwarz zwischen Bart und Umriss, das hier dünner als durchA ist, nimmt das Weiß ganz; bis durchB nimmt es nur
          // den inneren Teil (der Rand läuft spitz aus), dickeres bleibt. Dicke = Abstand zum Weiß + Abstand zum Umriss; Schwarz, das
          // nach dem Bart gezeichnet wird (Nase), bleibt. Gilt auch in den geglätteten Säumen am Umriss und an der Kante des Barts (sonst
          // blieb vom genommenen Schwarz eine graue, gepunktete Haarlinie), und ein Rest, dünner als durchRest Bildpunkte, geht mit (sonst
          // lief die Spitze als lange blasse Linie aus)
          if (durchB > 0.0 && schwarz < 0.5 && wRoh > -0.5 && ueberBart > 0.5) {
            float tr = wRoh + u;
            float e = tr <= durchA ? tr + 1.0 : durchA * clamp((durchB - tr) / max(durchB - durchA, 1e-3), 0.0, 1.0);
            if (tr - e < durchRest) e = tr + 1.0;
            weiss = max(weiss, clamp(0.5 - (wRoh - e), 0.0, 1.0)); }
          // Bart und Vorderbeinfenster verschmelzen wie Tropfen, sobald sie sich nahekommen (Florian, 18.11.). Das Fenster schiebt
          // sich dafür bis 0,3 k unter Kopf, Ohren und Nase (schmale Haarspitzen und der Rand der Maske trennen dann nicht mehr);
          // sonst gilt die Malreihenfolge. Einfache weiche Vereinigung ohne Kantenrichtung: deren Ableitungen rauschen an Knicken.
          if (kWeiss > 0.0) {
            float wFenster = 1e5;
            for (int i = 0; i < 2; i++) { int c = fensterKanal[i]; if (c < 0) continue;
              float w = d[c]; int t = traeger[c];
              if (t >= 0) w = smax(w, d[t] + rand[c], kKlemme);
              if (rv > 0.05) w = smax(w, sil + rv, min(kKlemme, rv));
              wFenster = min(wFenster, max(w, -(i == 0 ? decktF0 : decktF1))); }
            float U = smin(wBart, wFenster, kWeiss);
            // Kantenglättung nach dem Gefälle: wo die Vereinigung Lücken schließt, ist sie kein Abstand mehr (Gefälle unter 1)
            float gU = length(vec2(dFdx(U), dFdy(U)));
            weiss = max(weiss, clamp(0.5 - U / clamp(gU, 0.5, 1.0), 0.0, 1.0) * (1.0 - deck(ueberBart))); }
          float spalt = 0.0;
          // Ohrspalt wie Florians Keil im Profil: weißer Streifen an der Kante des nahen Ohrs, nur im fernen Ohr; am Umriss des fernen
          // Ohrs am breitesten (dort offen zum Hintergrund), nach innen spitz auslaufend
          if (spaltNah >= 0) { float nah = d[spaltNah]; float fern = d[spaltFern];
            float b = spaltBreite * (1.0 - smoothstep(0.0, spaltAuslauf, -fern));
            spalt = clamp(deck(nah - b) - deck(nah), 0.0, 1.0) * deck(fern) * (1.0 - deck(ueber[spaltNah])); }
          float sw = deck(schwarz);
          // sichtbar ist das Schwarz außerhalb des Weißen: Enden beide an derselben Kante (Bart am Umriss), bleibt sie weiß, statt als
          // graue Linie der Kantenglättung zu stehen (Schwarz halb, darüber Weiß halb gab 75 % Grau); sonst wie Weiß über Schwarz
          float hell = max(weiss, spalt);
          vec3 col = vec3(1.0 - max(sw - hell, 0.0));
          if (diagnose == 1) col = mix(col, vec3(1.0, 0.0, 0.0), step(0.5, max(weiss, spalt) * (1.0 - sw)));
          else if (diagnose == 2) col = mix(col, vec3(0.0, 0.4, 1.0), step(0.5, spalt));
          farbe = vec4(col, 1.0); }`,
    );
    this.vao = gl.createVertexArray()!;
    this.bufQuad = gl.createBuffer()!;
    this.bufFan = gl.createBuffer()!;
    this.bufStr = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufQuad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  }

  private programm(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const sh = (typ: number, src: string): WebGLShader => {
      const s = gl.createShader(typ)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`${gl.getShaderInfoLog(s)}\n${src}`);
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'Link');
    return p;
  }
  private ort(p: WebGLProgram, name: string): WebGLUniformLocation | null {
    let m = this.orte.get(p);
    if (!m) this.orte.set(p, (m = new Map()));
    if (!m.has(name)) m.set(name, this.gl.getUniformLocation(p, name));
    return m.get(name)!;
  }
  private attr(p: WebGLProgram, name: string, buf: WebGLBuffer, n: number, stride: number, off: number, div: number): number {
    const gl = this.gl;
    const l = gl.getAttribLocation(p, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, n, gl.FLOAT, false, stride, off);
    gl.vertexAttribDivisor(l, div);
    return l;
  }

  /** Größe des Zeichenpuffers in Bildpunkten */
  groesse(w: number, h: number): void {
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    if (w === this.W && h === this.H) return;
    const gl = this.gl;
    for (const t of this.texe) gl.deleteTexture(t);
    if (this.texAussen) gl.deleteTexture(this.texAussen);
    if (this.fb) gl.deleteFramebuffer(this.fb);
    if (this.fbAussen) gl.deleteFramebuffer(this.fbAussen);
    if (this.rb) gl.deleteRenderbuffer(this.rb);
    this.W = w;
    this.H = h;
    this.canvas.width = w;
    this.canvas.height = h;
    const tex = (): WebGLTexture => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texStorage2D(gl.TEXTURE_2D, 1, this.halbFloat ? gl.RGBA16F : gl.RGBA8, w, h);
      return t;
    };
    this.texe = Array.from({ length: NT }, tex);
    this.texAussen = tex();
    this.rb = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, w, h);
    this.fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    this.texe.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.rb);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Felder: Framebuffer unvollständig');
    this.fbAussen = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbAussen);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texAussen, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  get breite(): number {
    return this.W;
  }
  get hoehe(): number {
    return this.H;
  }

  zeichne(szene: Szene, ansicht: Ansicht, diagnose: Diagnose = 0): void {
    const t0 = performance.now();
    const gl = this.gl;
    const { W, H } = this;
    const { teile } = szene;
    if (teile.length > MAX_TEILE) throw new Error(`höchstens ${MAX_TEILE} Teile (${teile.length})`);
    const s = ansicht.massstab;
    const fl = szene.fluessig;
    // Band: so breit, dass jede weiche Vereinigung, Klemme und Verdecken volle Abstände sieht. Die Verschmelzung von Weiß braucht
    // die größte Reichweite, aber nur ab dem ersten verschmelzenden Teil der Malreihenfolge (Fenster, Bart und was über ihnen liegt):
    // Die Vierecke um die Strecken sind je Teil so groß wie nötig (sie bestimmen die Zeit des ersten Durchgangs; Bohne und Beine
    // haben den längsten Umriss), kodiert wird für alle mit dem größten R.
    const { weissWeiss, ...schwarzFl } = fl;
    const groesst = Math.max(...Object.values(schwarzFl), ...szene.verdecker.map((v) => v.staerke), ...teile.map((t) => t.rand ?? 0), szene.ohrspalt?.auslauf ?? 0, szene.durchbruch?.voll ?? 0);
    const grenze = this.halbFloat ? 96 : 24;
    const rBasis = Math.min(grenze, Math.max(16, groesst * s * 1.25 + 4));
    // mindestens k: Sättigt ein Feld innerhalb von k, verschiebt die weiche Vereinigung jede Kante des Barts
    const rWeiss = Math.min(grenze, Math.max(rBasis, weissWeiss * s + 4));
    const erster = teile.findIndex((t) => t.weiss && t.weissGruppe);
    const reichweite = teile.map((_, i) => (erster >= 0 && i >= erster ? rWeiss : rBasis));
    const R = Math.max(...reichweite, rBasis);
    this.letzte.R = R;
    const abb = (q: Punkt): Punkt => [(q[0] - ansicht.x0) * s, H - (q[1] - ansicht.y0) * s];
    const polys = teile.map((t) => {
      const pts = abflachen(t.form, abb, 1.5);
      let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
      for (let j = 0; j < pts.length; j += 2) {
        a = Math.min(a, pts[j]!);
        b = Math.min(b, pts[j + 1]!);
        c = Math.max(c, pts[j]!);
        d = Math.max(d, pts[j + 1]!);
      }
      return { pts, kasten: [a - 1, b - 1, c + 1, d + 1] as [number, number, number, number] };
    });
    // Strecken für Pass 1 und 3
    let zahl = 0;
    for (const p of polys) zahl += p.pts.length / 2;
    const str = new Float32Array(zahl * 6);
    let o = 0;
    polys.forEach((p, ch) => {
      const v = p.pts;
      const n = v.length / 2;
      for (let j = 0; j < n; j++) {
        const j2 = (j + 1) % n;
        str[o++] = v[2 * j]!;
        str[o++] = v[2 * j + 1]!;
        str[o++] = v[2 * j2]!;
        str[o++] = v[2 * j2 + 1]!;
        str[o++] = ch;
        str[o++] = reichweite[ch]!;
      }
    });
    this.letzte.strecken = zahl;
    const zeit = this.zeitAbfrage;
    let abfrage: WebGLQuery | null = null;
    if (zeit && zeit.offen.length < 4) {
      abfrage = gl.createQuery();
      if (abfrage) gl.beginQuery((zeit.ext as { TIME_ELAPSED_EXT: number }).TIME_ELAPSED_EXT, abfrage);
    }
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.SCISSOR_TEST);
    // 1) Abstand je Teil (MIN)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.drawBuffers(this.texe.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufStr);
    gl.bufferData(gl.ARRAY_BUFFER, str, gl.STREAM_DRAW);
    gl.useProgram(this.pStrecke);
    gl.uniform2f(this.ort(this.pStrecke, 'gr'), W, H);
    gl.uniform1f(this.ort(this.pStrecke, 'R'), R);
    const streckenAttribute = (p: WebGLProgram): number[] => [
      this.attr(p, 'ecke', this.bufQuad, 2, 0, 0, 0),
      this.attr(p, 'pa', this.bufStr, 2, 24, 0, 1),
      this.attr(p, 'pb', this.bufStr, 2, 24, 8, 1),
      this.attr(p, 'kanal', this.bufStr, 1, 24, 16, 1),
      this.attr(p, 'reich', this.bufStr, 1, 24, 20, 1),
    ];
    let ls = streckenAttribute(this.pStrecke);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MIN);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, zahl);
    for (const l of ls) gl.vertexAttribDivisor(l, 0);
    // 2) Vorzeichen je Teil
    gl.enable(gl.STENCIL_TEST);
    gl.enable(gl.SCISSOR_TEST);
    polys.forEach((p, ch) => {
      const [x0, y0, x1, y1] = p.kasten;
      const sx = Math.max(0, Math.floor(x0));
      const sy = Math.max(0, Math.floor(y0));
      gl.scissor(sx, sy, Math.max(0, Math.min(W, Math.ceil(x1)) - sx), Math.max(0, Math.min(H, Math.ceil(y1)) - sy));
      gl.clear(gl.STENCIL_BUFFER_BIT);
      const v = p.pts;
      const fan = new Float32Array(Math.max(0, (v.length / 2 - 2) * 6));
      let f = 0;
      for (let j = 2; j + 3 < v.length; j += 2) {
        fan[f++] = v[0]!;
        fan[f++] = v[1]!;
        fan[f++] = v[j]!;
        fan[f++] = v[j + 1]!;
        fan[f++] = v[j + 2]!;
        fan[f++] = v[j + 3]!;
      }
      gl.useProgram(this.pFan);
      gl.uniform2f(this.ort(this.pFan, 'gr'), W, H);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufFan);
      gl.bufferData(gl.ARRAY_BUFFER, fan, gl.STREAM_DRAW);
      this.attr(this.pFan, 'a', this.bufFan, 2, 0, 0, 0);
      gl.disable(gl.BLEND);
      gl.colorMask(false, false, false, false);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP);
      gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
      gl.drawArrays(gl.TRIANGLES, 0, f / 2);
      gl.colorMask(true, true, true, true);
      gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE_MINUS_SRC_COLOR);
      gl.useProgram(this.pKippe);
      gl.uniform1i(this.ort(this.pKippe, 'ch'), ch);
      gl.uniform4f(this.ort(this.pKippe, 'kasten'), x0, y0, x1, y1);
      gl.uniform2f(this.ort(this.pKippe, 'gr'), W, H);
      this.attr(this.pKippe, 'a', this.bufQuad, 2, 0, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.SCISSOR_TEST);
    // 3) Außenkanten der schwarzen Vereinigung
    let schwarzBits = 0;
    teile.forEach((t, ch) => {
      if (!t.weiss) schwarzBits |= 1 << ch;
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbAussen);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.pAussen);
    this.texe.forEach((t, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(this.ort(this.pAussen, `t${i}`), i);
    });
    gl.uniform2f(this.ort(this.pAussen, 'gr'), W, H);
    gl.uniform1f(this.ort(this.pAussen, 'R'), R);
    gl.uniform1i(this.ort(this.pAussen, 'schwarzBits'), schwarzBits);
    ls = streckenAttribute(this.pAussen);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MIN);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, zahl);
    for (const l of ls) gl.vertexAttribDivisor(l, 0);
    gl.disable(gl.BLEND);
    // 4) Bild
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(this.pBild);
    this.texe.forEach((t, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(this.ort(this.pBild, `t${i}`), i);
    });
    gl.activeTexture(gl.TEXTURE0 + NT);
    gl.bindTexture(gl.TEXTURE_2D, this.texAussen);
    gl.uniform1i(this.ort(this.pBild, 'tAussen'), NT);
    gl.uniform1f(this.ort(this.pBild, 'R'), R);
    gl.uniform1i(this.ort(this.pBild, 'anzahl'), teile.length);
    const gr = new Int32Array(MAX_TEILE).fill(-1);
    const tr = new Int32Array(MAX_TEILE).fill(-1);
    const ra = new Float32Array(MAX_TEILE);
    teile.forEach((t, ch) => {
      gr[ch] = t.weiss ? -1 : GRUPPE_NR[t.gruppe];
      tr[ch] = t.weiss && t.traeger !== undefined ? t.traeger : -1;
      ra[ch] = (t.rand ?? 0) * s;
    });
    gl.uniform1iv(this.ort(this.pBild, 'gruppe'), gr);
    gl.uniform1iv(this.ort(this.pBild, 'traeger'), tr);
    gl.uniform1fv(this.ort(this.pBild, 'rand'), ra);
    const hi = new Int32Array(MAX_TEILE).fill(-1);
    const ht = new Float32Array(MAX_TEILE);
    teile.forEach((t, ch) => {
      if (t.weiss && t.hinter !== undefined) {
        hi[ch] = t.hinter;
        ht[ch] = (t.hinterTiefe ?? 0) * s;
      }
    });
    gl.uniform1iv(this.ort(this.pBild, 'hinter'), hi);
    gl.uniform1fv(this.ort(this.pBild, 'hinterTiefe'), ht);
    const wg = new Int32Array(MAX_TEILE);
    teile.forEach((t, ch) => {
      if (t.weiss && t.weissGruppe) wg[ch] = t.weissGruppe === 'bart' ? 1 : 2;
    });
    gl.uniform1iv(this.ort(this.pBild, 'weissGruppe'), wg);
    const fk = new Int32Array([-1, -1]);
    let fz = 0;
    teile.forEach((t, ch) => {
      if (t.weiss && t.weissGruppe === 'fenster' && fz < 2) fk[fz++] = ch;
    });
    gl.uniform1iv(this.ort(this.pBild, 'fensterKanal'), fk);
    gl.uniform1f(this.ort(this.pBild, 'kWeiss'), fl.weissWeiss * s);
    const weich = new Int32Array(MAX_TEILE);
    teile.forEach((t, ch) => {
      if (t.weiss && t.name.startsWith('fenster')) weich[ch] = 1;
    });
    gl.uniform1iv(this.ort(this.pBild, 'weichKanal'), weich);
    gl.uniform1f(this.ort(this.pBild, 'kWeissSchwarz'), fl.weissSchwarz * s);
    gl.uniform1f(this.ort(this.pBild, 'kBohneBein'), fl.bohneBein * s);
    gl.uniform1f(this.ort(this.pBild, 'kBohneSchwanz'), fl.bohneSchwanz * s);
    gl.uniform1f(this.ort(this.pBild, 'kBohneKopf'), fl.bohneKopf * s);
    gl.uniform1f(this.ort(this.pBild, 'kKopfOhr'), fl.kopfOhr * s);
    gl.uniform1f(this.ort(this.pBild, 'kOhrOhr'), fl.ohrOhr * s);
    gl.uniform1f(this.ort(this.pBild, 'kKopfNase'), fl.kopfNase * s);
    gl.uniform1f(this.ort(this.pBild, 'kKlemme'), fl.klemme * s);
    const va = new Float32Array(16);
    const vb = new Float32Array(8);
    szene.verdecker.slice(0, 4).forEach((v, k) => {
      const m = abb(v.mitte);
      const l = Math.hypot(v.richtung[0], v.richtung[1]) || 1;
      va.set([m[0], m[1], v.richtung[0] / l, -v.richtung[1] / l], k * 4);
      vb.set([v.radius * s, v.staerke * s], k * 2);
    });
    gl.uniform1i(this.ort(this.pBild, 'verdeckerZahl'), Math.min(4, szene.verdecker.length));
    gl.uniform4fv(this.ort(this.pBild, 'verdeckerA'), va);
    gl.uniform2fv(this.ort(this.pBild, 'verdeckerB'), vb);
    const sp = szene.ohrspalt;
    gl.uniform1i(this.ort(this.pBild, 'spaltNah'), sp ? sp.nah : -1);
    gl.uniform1i(this.ort(this.pBild, 'spaltFern'), sp ? sp.fern : 0);
    gl.uniform1f(this.ort(this.pBild, 'spaltBreite'), (sp?.breite ?? 0) * s);
    gl.uniform1f(this.ort(this.pBild, 'spaltAuslauf'), Math.max(1e-3, (sp?.auslauf ?? 1) * s));
    gl.uniform1i(this.ort(this.pBild, 'diagnose'), diagnose);
    // Durchbruch in Bildpunkten, höchstens bis knapp unter das Band (darüber sind die Felder gesättigt)
    const db = szene.durchbruch;
    const durchB = db && db.voll > 0 ? Math.min(db.voll * s, R - 2) : 0;
    gl.uniform1f(this.ort(this.pBild, 'durchB'), durchB);
    gl.uniform1f(this.ort(this.pBild, 'durchA'), db && durchB > 0 ? Math.min(db.duenn * s, durchB) : 0);
    // weiche Malreihenfolge: Anteile je weißem Teil (höchstens MAX_WEISS) und schwarzem Teil
    const nr = new Int32Array(MAX_TEILE).fill(-1);
    const anteil = new Float32Array(MAX_WEISS * MAX_TEILE);
    let weichOrdnung = 0;
    if (szene.deckung) {
      let k = 0;
      teile.forEach((t, c) => {
        const zeile = szene.deckung![c];
        if (!t.weiss || !zeile?.length || k >= MAX_WEISS) return;
        nr[c] = k;
        zeile.forEach((a, b) => (anteil[k * MAX_TEILE + b] = teile[b] && !teile[b]!.weiss ? a : 0));
        k++;
      });
      weichOrdnung = k > 0 ? 1 : 0;
    }
    gl.uniform1i(this.ort(this.pBild, 'weichOrdnung'), weichOrdnung);
    gl.uniform1iv(this.ort(this.pBild, 'weissNr'), nr);
    gl.uniform4fv(this.ort(this.pBild, 'anteil'), anteil);
    this.attr(this.pBild, 'a', this.bufQuad, 2, 0, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (zeit && abfrage) {
      gl.endQuery((zeit.ext as { TIME_ELAPSED_EXT: number }).TIME_ELAPSED_EXT);
      zeit.offen.push(abfrage);
    }
    this.zeitenAbholen();
    this.letzte.cpuMs = performance.now() - t0;
  }

  private zeitenAbholen(): void {
    const z = this.zeitAbfrage;
    if (!z) return;
    const gl = this.gl;
    const gestoert = gl.getParameter((z.ext as { GPU_DISJOINT_EXT: number }).GPU_DISJOINT_EXT) as boolean;
    while (z.offen.length) {
      const q = z.offen[0]!;
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      if (!gestoert) z.ms = ns / 1e6;
      gl.deleteQuery(q);
      z.offen.shift();
    }
    this.letzte.gpuMs = z.ms;
  }

  /** auf die Grafikkarte warten (für Messungen) */
  warten(): void {
    const px = new Uint8Array(4);
    this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, px);
  }
}
