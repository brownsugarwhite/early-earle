/**
 * Wachs: Ozzys Nachbau von ZBrushs Grundmaterial „MatCap Red Wax“ (Florian, 19.11.2026: „Das Basismaterial, so wie es Z-Brush benutzt,
 * aber mehr in magenta statt rot“). Recherche, Messung und Quellen: `docs/research/2026-11-19-zbrush-grundmaterial.md`; seine Vorlage:
 * `docs/look/ozzy/paint/2026-11-19-zbrush-matcap-red-wax.png`.
 *
 * **Wie ZBrush es macht:** „MatCap Red Wax“ ist ein MatCap. Die Farbe eines Punkts hängt nur davon ab, wohin seine Fläche im Blick
 * zeigt (die Normale, vom Betrachter aus gesehen); sie wird aus dem Bild einer Kugel nachgeschlagen, in das Licht, Glanz und Farbe
 * eingebacken sind. Lichter der Szene wirken nicht. Genauso zeichnet Ozzy das Material (`material.ts`, Matcap von three).
 *
 * **Woher das Kugelbild kommt:** Es ist an der Kugel in Florians Bildschirmfoto ausgemessen: Die Drahtlinien sind herausgerechnet
 * (60-%-Quantil über 5 × 5 Bildpunkte), die Facetten der Kugel geglättet (Mittel um jede Stützstelle), abgelegt als `WACHS_N` ×
 * `WACHS_N` Stützstellen über der Normalen (u nach rechts, v nach oben, je −1 … +1; drei Bytes je Stelle: Rot, Grün, Blau, wie am
 * Bildschirm gemessen). Dazwischen wird mit Catmull-Rom-Kurven gerechnet. Neu gezeichnet weicht die Kugel im Mittel 1,4 bis 1,7 von
 * 255 Stufen von der Vorlage ab (größte Abweichung 13). Außerhalb von 97 % des Halbmessers ist die Vorlage nicht messbar (dort
 * mischt ihre Kantenglättung den Grund hinein): Die Stellen sind längs des Halbmessers fortgesetzt.
 *
 * **Der Farbton:** Die Tabelle ist ZBrushs Rot. `farbton` dreht jede Farbe im Farbraum OKLCH um so viele Grad (Helligkeit und
 * Buntheit bleiben; wo Magenta bei gleicher Buntheit außerhalb des Bildschirms läge, wird nur die Buntheit zurückgenommen).
 * 0 ist das gemessene Rot.
 */

/** Stützstellen je Achse */
export const WACHS_N = 29;

/** das ausgemessene Kugelbild: Zeile für Zeile von unten (v = −1) nach oben, je Zeile von links (u = −1) nach rechts; RGB */
const TABELLE = [
  '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',
  'XyEaYCEdZikmbDEwcTg4dT5AeUNGfEhLgE1Qg1FVh1RaiVhei1xjjl5mkGBnkV9lkF5ijlxei1hYiFRUhk9OhEpKgUdGfkJAej45dzgwczEpcCsibyoh',
  'YSIfYiIhZCQkbC8ucTY2dD09eEJEe0dKfkxPglBShFJWhlVZh1dciVlfjFpfjFpei1lci1haiFRVhlFRhE5NgklIgEZEfEE/eDw3dTYwcS4lcSwjcCsi',
  'ZCMiZSUkZyYkaiwqbzMzcjo6dkBBekVHfUlMgE1QglBThFJVhVRYh1VZiFZaiFZZiFVYh1RWhFFSg09PgUtLf0dGfUNCej47djk0cjMscC4ncC4mcC0k',
  'ZiUkZyckZyglZygmbC8ubzY2dD09eEJDe0ZIfUpMf01QglBTg1FUhFNVhVNWhVNVhVJUhFFSg09PgUxMf0hIfUREe0A+dzs3dDUvcTAocC8nby8ncC4m',
  'ZyclZygmZygmaCkmaCkmbTEwcTc3dD0+eENDekZIfUlMf0xOgE5Qgk9RglBRglBRg09Qgk1PgEtMfkhHfERDe0A+eDs5dTYxcTAocTAocTAocDAnby8n',
  'ZygmZygmaCkmaCkmaSooaispbTEwcTg3dD08dkFBeUVFe0dIfUlKf0tLgEtMgEtMgEtLf0lJfkZGfENCej89eDs4dTYxcjErcjAqcTAocTAocTAocDAo',
  'aCgmaCkmaCkmaSooaispaSwqai0rbC0tcTU0czo5dj49eUFBe0NDfEVFfUVGfUVGfURFfUJCez8+ejw7eDg0dTIrczIrcjErcjErcjAqcTAocTAocTAo',
  'aCkmaCkmaSooaispaiwqai0ray0sbS0sbi4tby8tczY0dTk3eDw7ej09ez4+ez4+ez09ezo5eTc1dzEwdTEsdTIrdDErcjIrcjErcjArcjAqcTAocTAo',
  'aCkmaSooaiopaiwpaSwqai0rbC0sbS0sbi4tby8tcTEucjIudDIxdzMxdzMwdzQxdzQweDMveDMwdzIwdjEudjIrdTIrczErcjIrcjErcjArcjApcTAo',
].join('');

/**
 * Grundwert des Farbtons (Grad, gedreht gegen ZBrushs Rot): Magenta. Der rote Körper der Vorlage (Farbton 27° in OKLCH) liegt damit
 * zwischen dem Farbton von Druck-Magenta (#e6007e: −28) und dem von reinem Bildschirm-Magenta (#ff00ff: −59). Im Feinregler unter
 * „Material Wachs“ zu stellen, bis Florian seinen Wert festlegt.
 */
export const WACHS_FARBTON_GRUND = -40;

let tabelle: Uint8Array | null = null;
function tabelleHolen(): Uint8Array {
  if (!tabelle) {
    const roh = atob(TABELLE);
    tabelle = new Uint8Array(roh.length);
    for (let i = 0; i < roh.length; i++) tabelle[i] = roh.charCodeAt(i);
  }
  return tabelle;
}

const cm = (p0: number, p1: number, p2: number, p3: number, t: number): number =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);

/** die Vorlage (ZBrushs Rot) an der Normalen (u, v), Bildschirmwerte 0 … 255; außerhalb der Kugel der Rand in derselben Richtung */
export function wachsVorlage(u: number, v: number): [number, number, number] {
  const T = tabelleHolen();
  const N = WACHS_N;
  const rho = Math.hypot(u, v);
  if (rho > 1) {
    u /= rho;
    v /= rho;
  }
  const a = Math.max(0, Math.min(N - 1 - 1e-6, ((u + 1) * (N - 1)) / 2));
  const b = Math.max(0, Math.min(N - 1 - 1e-6, ((v + 1) * (N - 1)) / 2));
  const i1 = Math.floor(a);
  const j1 = Math.floor(b);
  const ta = a - i1;
  const tb = b - j1;
  const aus: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const at = (i: number, j: number): number => T[(Math.max(0, Math.min(N - 1, j)) * N + Math.max(0, Math.min(N - 1, i))) * 3 + k]!;
    const z = (j: number): number => cm(at(i1 - 1, j), at(i1, j), at(i1 + 1, j), at(i1 + 2, j), ta);
    aus[k] = Math.max(0, Math.min(255, cm(z(j1 - 1), z(j1), z(j1 + 1), z(j1 + 2), tb)));
  }
  return aus;
}

// ---------- Farbraum OKLab (Björn Ottosson, 2020) ----------

const linear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const kodiert = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** Bildschirmwerte 0 … 255 → OKLab (L 0 … 1, a, b) */
export function nachOklab(r: number, g: number, b: number): [number, number, number] {
  const R = linear(r / 255);
  const G = linear(g / 255);
  const B = linear(b / 255);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** OKLab → lineare Werte (dürfen außerhalb von 0 … 1 liegen: dann zeigt der Bildschirm die Farbe nicht) */
function ausOklabLinear(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

/** eine Farbe (Bildschirmwerte) im Farbton drehen; Helligkeit bleibt, die Buntheit nur, soweit der Bildschirm sie zeigen kann */
export function farbtonDrehen(r: number, g: number, b: number, grad: number): [number, number, number] {
  if (grad === 0) return [r, g, b];
  const [L, a0, b0] = nachOklab(r, g, b);
  const w = (grad * Math.PI) / 180;
  const a = a0 * Math.cos(w) - b0 * Math.sin(w);
  const bb = a0 * Math.sin(w) + b0 * Math.cos(w);
  const passt = (f: number): [number, number, number] | null => {
    const c = ausOklabLinear(L, a * f, bb * f);
    return c.every((x) => x >= -1e-4 && x <= 1 + 1e-4) ? c : null;
  };
  let c = passt(1);
  if (!c) {
    // Buntheit zurücknehmen, bis die Farbe darstellbar ist (Helligkeit und Farbton bleiben)
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 14; i++) {
      const mitte = (lo + hi) / 2;
      if (passt(mitte)) lo = mitte;
      else hi = mitte;
    }
    c = passt(lo) ?? [0, 0, 0];
  }
  return [255 * kodiert(Math.max(0, Math.min(1, c[0]))), 255 * kodiert(Math.max(0, Math.min(1, c[1]))), 255 * kodiert(Math.max(0, Math.min(1, c[2])))];
}

/** das Material an der Normalen (u, v) mit gedrehtem Farbton, Bildschirmwerte 0 … 255 */
export function wachsFarbe(u: number, v: number, farbton: number = WACHS_FARBTON_GRUND): [number, number, number] {
  const [r, g, b] = wachsVorlage(u, v);
  return farbtonDrehen(r, g, b, farbton);
}

/**
 * Das Kugelbild als Textur für eine Matcap von three: `groesse` × `groesse`, RGBA, Zeile 0 unten. three schlägt mit
 * `Normale.xy · 0,495 + 0,5` nach (`rand`): Der Rand der Kugel liegt ein halbes Prozent innerhalb der Textur.
 */
export function wachsKugel(groesse: number, farbton: number = WACHS_FARBTON_GRUND, rand = 0.495): Uint8Array {
  const daten = new Uint8Array(groesse * groesse * 4);
  for (let y = 0; y < groesse; y++) {
    const v = ((y + 0.5) / groesse - 0.5) / rand;
    for (let x = 0; x < groesse; x++) {
      const u = ((x + 0.5) / groesse - 0.5) / rand;
      const [r, g, b] = wachsFarbe(u, v, farbton);
      const o = (y * groesse + x) * 4;
      daten[o] = Math.round(r);
      daten[o + 1] = Math.round(g);
      daten[o + 2] = Math.round(b);
      daten[o + 3] = 255;
    }
  }
  return daten;
}

// ---------- das Wachs unter Gemaltem (Paint-Modus, Etappe 1) ----------

const linearVon = (c: number): number => linear(c / 255);
/** das Rot des Körpers der Vorlage, unterhalb des Glanzes (dort trägt das Bild nur die Farbe des Körpers und sein Hell und Dunkel) */
const KOERPER_BEI: [number, number] = [0, -0.3];

/**
 * Hell, Dunkel und Glanz des Wachses ohne seine Farbe, für Gemaltes: In ZBrush färbt Red Wax jede gemalte Farbe rot ein. Hier gilt
 * die Farbe des Wachses nur, wo nichts gemalt ist; eine gemalte Fläche bekommt vom Wachs nur das Licht. Dazu wird das Kugelbild der
 * Vorlage zerlegt (in linearen Werten): Bild = Körperfarbe · Helligkeit + Weiß · Glanz. Zurück je Normale (u, v): die Helligkeit
 * (1 an der Stelle `KOERPER_BEI`) und der Glanz (Anteil Weiß, 0 … 1). Eine Fläche in der Farbe des Körpers sieht damit aus wie das
 * Wachs selbst.
 */
export function wachsLicht(u: number, v: number): [number, number] {
  const [r0, g0, b0] = wachsVorlage(KOERPER_BEI[0], KOERPER_BEI[1]).map(linearVon) as [number, number, number];
  const [r, g, b] = wachsVorlage(u, v).map(linearVon) as [number, number, number];
  // Grün und Blau über dem, was der rote Körper bei dieser Helligkeit selbst an Grün und Blau hätte: der weiße Anteil
  const kg = g0 / r0;
  const kb = b0 / r0;
  const glanz = Math.max(0, Math.min((g - kg * r) / (1 - kg), (b - kb * r) / (1 - kb)));
  return [Math.max(0, r - glanz) / r0, glanz];
}

/** `wachsLicht` als Feld für eine Textur (`groesse` × `groesse`, je Stelle Helligkeit und Glanz, Zeile 0 unten), wie `wachsKugel` */
export function wachsLichtBild(groesse: number, rand = 0.495): Float32Array {
  const daten = new Float32Array(groesse * groesse * 2);
  for (let y = 0; y < groesse; y++) {
    const v = ((y + 0.5) / groesse - 0.5) / rand;
    for (let x = 0; x < groesse; x++) {
      const [hell, glanz] = wachsLicht(((x + 0.5) / groesse - 0.5) / rand, v);
      daten[(y * groesse + x) * 2] = hell;
      daten[(y * groesse + x) * 2 + 1] = glanz;
    }
  }
  return daten;
}
