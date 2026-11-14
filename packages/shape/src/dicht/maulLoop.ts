// Form zuerst (05.11.2026), „Nur Loops“: das Maul als Loop (Florian: „Mund = Loop“, die Mundwinkel sind Punkte, ein Regler
// öffnet es).
//
// Florian zeichnet mit F eine schmale Form ums Maul, über die Mitte (Front, Top) oder vorn über den Umriss (Seite). Sie wird ein
// Ring: Seine Hälfte z ≥ 0 läuft von der Mitte der einen Lippe über den Mundwinkel zur Mitte der anderen, der Mundwinkel ist ein
// Punkt auf ihm. Der Loop liegt als Kette von Kanten im Netz. Zum Zeigen wird das Netz genau längs dieser Kette aufgeschnitten: Was
// die schmale Form umschließt, ist die Öffnung des Mauls und fällt weg. Gaumen und Boden hängen an ihrer Lippe und reichen als
// Gewölbe in ihren Kiefer, zwischen den Mundwinkeln treffen sie sich. Geöffnet wird wie bei den getrennten Kiefern (`kieferFeld`):
// Der Unterkiefer dreht in der Seite um den Mundwinkel, nach dem Winkel, unter dem ein Punkt die Unterlippe sieht, und dem Abstand
// von ihr längs der Form. Das Netz selbst bleibt geschlossen: Die Lippen sind Loops wie die anderen, die Haut folgt ihnen im Löser.

import type { V2 } from '../bezier';
import { kieferFeld, lippeAus } from './kiefer';
import { type Haut, type V3, hautNormalen } from './kurven';
import type { Loop } from './loops';
import { MAUL_WINKEL_MAX, type MaulSchnitt } from './maul';
import { flaechenNormale, konturAusNetz } from './maulGrund';
import { tiefeAusKontur } from './raumlinien';
import type { UmrissPunkt } from './umriss';

export type MaulAmLoop = MaulSchnitt & {
  /** je Dreieck der Haut: 1, wenn es in der schmalen Form liegt (Öffnung des Mauls, wird nicht gezeigt) */
  offen: Uint8Array;
  /** Kanten in der Öffnung (alle ihre Dreiecke liegen darin), Schlüssel a · n + b mit a < b: Linien darüber werden nicht gezeigt */
  kantenOffen: Set<number>;
};

/** Mundwinkel eines Rings (Nummer seiner Probe): die Probe, die am weitesten von der Mitte seiner beiden Enden liegt. */
export function mundwinkelProbe(l: Loop, lagen: Float64Array = l.ruhe): number {
  const m = l.proben.length;
  const q = (i: number): V3 => ({ x: lagen[3 * i]!, y: lagen[3 * i + 1]!, z: lagen[3 * i + 2]! });
  const a = q(0);
  const b = q(m - 1);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  let best = -1;
  let wo = Math.floor(m / 2);
  for (let i = 1; i < m - 1; i++) {
    const p = q(i);
    const d = Math.hypot(p.x - mx, p.y - my, p.z);
    if (d > best) {
      best = d;
      wo = i;
    }
  }
  return wo;
}

/** Öffnung: die Dreiecke auf der kleineren Seite des Rings und die Kanten darin (null, wenn er nicht trennt) */
function oeffnungFinden(
  h: Haut,
  aufRing: ReadonlySet<number>,
  ring: readonly number[],
  kante: (a: number, b: number) => number,
): { offen: Uint8Array; kantenOffen: Set<number> } | null {
  const P = h.pos;
  const T = h.tri.length / 3;
  const dreiecke = new Map<number, number[]>();
  for (let t = 0; t < T; t++) {
    for (let e = 0; e < 3; e++) {
      const k = kante(h.tri[3 * t + e]!, h.tri[3 * t + ((e + 1) % 3)]!);
      const liste = dreiecke.get(k);
      if (liste) liste.push(t);
      else dreiecke.set(k, [t]);
    }
  }
  const nebenan = dreiecke.get(kante(ring[0]!, ring[1]!)) ?? [];
  if (nebenan.length !== 2) return null;
  const seiteA = new Uint8Array(T);
  const stapel = [nebenan[0]!];
  seiteA[nebenan[0]!] = 1;
  while (stapel.length) {
    const t = stapel.pop()!;
    for (let e = 0; e < 3; e++) {
      const k = kante(h.tri[3 * t + e]!, h.tri[3 * t + ((e + 1) % 3)]!);
      if (aufRing.has(k)) continue;
      for (const u of dreiecke.get(k)!) {
        if (seiteA[u]) continue;
        seiteA[u] = 1;
        stapel.push(u);
      }
    }
  }
  // trennt der Ring nicht, gibt es keine Öffnung
  if (seiteA[nebenan[1]!]) return null;
  const flaeche = (t: number): number => {
    const a = h.tri[3 * t]!;
    const b = h.tri[3 * t + 1]!;
    const c = h.tri[3 * t + 2]!;
    const ux = P[3 * b]! - P[3 * a]!;
    const uy = P[3 * b + 1]! - P[3 * a + 1]!;
    const uz = P[3 * b + 2]! - P[3 * a + 2]!;
    const wx = P[3 * c]! - P[3 * a]!;
    const wy = P[3 * c + 1]! - P[3 * a + 1]!;
    const wz = P[3 * c + 2]! - P[3 * a + 2]!;
    return Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx);
  };
  let fA = 0;
  let fGanz = 0;
  for (let t = 0; t < T; t++) {
    const f = flaeche(t);
    fGanz += f;
    if (seiteA[t]) fA += f;
  }
  // die kleinere Seite ist die Öffnung
  const offen = new Uint8Array(T);
  for (let t = 0; t < T; t++) offen[t] = (seiteA[t] === 1) === fA <= fGanz / 2 ? 1 : 0;
  const kantenOffen = new Set<number>();
  for (const [k, liste] of dreiecke) if (liste.every((t) => offen[t])) kantenOffen.add(k);
  return { offen, kantenOffen };
}

/**
 * Das Maul am Loop `l` (ein Ring, als Kette von Kanten eingesetzt) mit dem Mundwinkel an seiner Probe `ecke`: die Haut ohne die
 * Öffnung, das Maulinnere und die Gewichte der Drehung (für `maulOeffnen`). `zelle`: Rasterweite für Tiefe und Abstand längs der
 * Form. `wieVorher`: das Maul derselben Haut (gleiche Punkte und Dreiecke, etwa während eines Zugs); Öffnung und Gewichte gelten
 * weiter, neu sind nur Lagen und Inneres (die Gewichte kosten den größten Teil der Zeit). Null, wenn der Loop kein eingesetzter
 * Ring ist, nicht trennt oder seine Lippen zu kurz sind.
 */
export function maulAmLoop(
  h: Haut,
  l: Loop,
  ecke: number,
  opt: { zelle: number; normalen?: Float64Array; wieVorher?: MaulAmLoop | null },
): MaulAmLoop | null {
  const { zelle } = opt;
  const alt = opt.wieVorher && opt.wieVorher.gewicht.length === h.n && opt.wieVorher.offen.length === h.tri.length / 3 ? opt.wieVorher : null;
  const m = l.proben.length;
  if (l.art !== 'ring' || ecke <= 0 || ecke >= m - 1) return null;
  if (!l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) return null;
  const P = h.pos;
  const n = h.n;
  const v = l.proben.map((p) => p.ecken[0]);
  const sp = (w: number): number => h.spiegel[w]!;
  if (v.some((w) => sp(w) < 0)) return null;

  // ---------- Öffnung: was die schmale Form umschließt ----------
  // der ganze Ring: die Hälfte z ≥ 0 und ihr Spiegelbild zurück
  const ring = [...v, ...v.slice(1, -1).reverse().map(sp)];
  const kante = (a: number, b: number): number => (a < b ? a * n + b : b * n + a);
  const aufRing = new Set<number>();
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    if (!h.nachbarn[a]!.includes(b)) return null;
    aufRing.add(kante(a, b));
  }
  const T = h.tri.length / 3;
  const oeffnung = alt ?? oeffnungFinden(h, aufRing, ring, kante);
  if (!oeffnung) return null;
  const { offen, kantenOffen } = oeffnung;

  // ---------- Lippen ----------
  // Oberlippe: die Hälfte, deren Ende auf der Mitte höher liegt (quer zur Richtung vom Mundwinkel zur Mitte der Enden)
  const xy = (w: number): V2 => ({ x: P[3 * w]!, y: P[3 * w + 1]! });
  const M = xy(v[ecke]!);
  const E0 = xy(v[0]!);
  const E1 = xy(v[m - 1]!);
  const mitte = { x: (E0.x + E1.x) / 2, y: (E0.y + E1.y) / 2 };
  let ox = -(mitte.y - M.y);
  let oy = mitte.x - M.x;
  const ol = Math.hypot(ox, oy) || 1;
  ox /= ol;
  oy /= ol;
  if (oy < 0 || (oy === 0 && ox > 0)) {
    ox = -ox;
    oy = -oy;
  }
  const hoehe = (q: V2) => (q.x - mitte.x) * ox + (q.y - mitte.y) * oy;
  // je Lippe die Kette z ≥ 0 von ihrer Mitte vorn zum Mundwinkel
  const kette0 = v.slice(0, ecke + 1);
  const kette1 = v.slice(ecke).reverse();
  const [kO, kU] = hoehe(E0) >= hoehe(E1) ? [kette0, kette1] : [kette1, kette0];
  const pos32 = Float32Array.from(P);
  const kontur = konturAusNetz(pos32, h.tri, zelle);
  const tiefe = (x: number, y: number) => tiefeAusKontur(kontur, x, y);
  const punkt = (w: number): UmrissPunkt => ({ ...xy(w), ecke: true });
  const LU = lippeAus(kO.map(punkt), zelle, () => null, null, tiefe);
  if (!LU) return null;
  const LD = lippeAus(kU.map(punkt), zelle, () => null, LU, tiefe);
  if (!LD) return null;
  // vom einen Mundwinkel um die Mitte vorn zum anderen
  const ganz = (k: number[]): number[] => [...k.slice(1).reverse().map(sp), ...k];
  const lippeOben = ganz(kO);
  const lippeUnten = ganz(kU);

  // ---------- Gewicht der Drehung ----------
  const tmp: [number, number, number] = [0, 0, 0];
  // der Auslauf nach dem Abstand vom Mundwinkel (`hebel`): sonst knickte die Haut, wo der Kiefer weit vom Gelenk endet
  const hebel = (MAUL_WINKEL_MAX * Math.PI) / 180;
  const unterFeld = alt ? null : kieferFeld(LD, M, kontur, zelle, true, hebel);
  const schaedelFeld = alt ? null : kieferFeld(LU, M, kontur, zelle, false, hebel);
  const gewicht = alt ? alt.gewicht : new Float32Array(n);
  const gradient = alt ? alt.gradient : new Float32Array(2 * n);
  const gewichtOben = alt ? alt.gewichtOben : new Float32Array(n);
  const gradientOben = alt ? alt.gradientOben : new Float32Array(2 * n);
  const benutzt = new Uint8Array(n);
  if (unterFeld && schaedelFeld) for (let t = 0; t < T; t++) if (!offen[t]) for (let e = 0; e < 3; e++) benutzt[h.tri[3 * t + e]!] = 1;
  for (let w = 0; w < n; w++) {
    if (!unterFeld || !schaedelFeld) break;
    if (!benutzt[w]) continue;
    unterFeld(P[3 * w]!, P[3 * w + 1]!, tmp);
    gewicht[w] = tmp[0];
    gradient[2 * w] = tmp[1];
    gradient[2 * w + 1] = tmp[2];
    schaedelFeld(P[3 * w]!, P[3 * w + 1]!, tmp);
    gewichtOben[w] = tmp[0];
    gradientOben[2 * w] = tmp[1];
    gradientOben[2 * w + 1] = tmp[2];
  }
  // Auf einer Lippe ist der Winkel nicht eindeutig: Die Oberlippe gehört ganz dem Schädel, die Unterlippe ganz dem Unterkiefer
  // (die Mundwinkel liegen auf der Drehachse).
  const winkelPunkte = new Set([v[ecke]!, sp(v[ecke]!)]);
  const setzen = (w: number, unten: boolean) => {
    if (winkelPunkte.has(w)) return;
    gewicht[w] = unten ? 1 : 0;
    gewichtOben[w] = unten ? 0 : 1;
    gradient[2 * w] = 0;
    gradient[2 * w + 1] = 0;
    gradientOben[2 * w] = 0;
    gradientOben[2 * w + 1] = 0;
  };
  for (const w of lippeOben) setzen(w, false);
  for (const w of lippeUnten) setzen(w, true);
  // Drehsinn: die vordere Mitte der Unterlippe soll vom Oberkiefer weg
  const A = xy(kU[0]!);
  const sinn = -Math.sign(-(A.y - M.y) * ox + (A.x - M.x) * oy) || 1;

  // ---------- Maulinneres ----------
  // Gaumen an der Oberlippe, Boden an der Unterlippe: von jedem Punkt der Lippe ein Bogen quer zu seinem Spiegelpunkt, gewölbt in den
  // Kiefer (höchstens 40 % seiner Dicke, gut die halbe Breite, zum Mundwinkel hin null); am Mundwinkel treffen sich Gaumen und Boden
  // (wie beim Maul mit einer Linie, maul.ts). Die Bögen hängen an den Punkten der Kette selbst: So schließt das Innere genau an die
  // Haut an, gleich aus welcher Ansicht die Form gezeichnet ist (an der Lippe in der Seite aufgehängt, riss es, wo sich eine Lippe
  // vorn am Gesicht in der Seite faltet).
  const h0 = 0.75 * zelle;
  let zMax = 0;
  for (const w of [...kO, ...kU]) zMax = Math.max(zMax, P[3 * w + 2]!);
  const nZe = Math.max(2, Math.min(24, Math.ceil((2 * zMax) / h0)));
  // in den Kiefer: für das ganze Maul eine Richtung, quer zur Richtung vom Mundwinkel zur Mitte vorn (je Lippenpunkt quer zur Richtung
  // vom Mundwinkel genommen kippte sie, wo ein Punkt in der Seite hinter dem Mundwinkel liegt, und der Gaumen wölbte sich nach unten)
  const inDenKiefer = (oben: boolean): V2 => (oben ? { x: ox, y: oy } : { x: -ox, y: -oy });
  // Dicke des Kiefers in dieser Richtung: bis die Form dort kaum noch Tiefe hat
  const kieferDicke = (x: number, y: number, d: V2): number => {
    const zc = Math.max(tiefe(x, y), 1e-6);
    const aussen = (r: number) => tiefe(x + d.x * r, y + d.y * r) <= 0.05 * zc;
    let r = 0;
    while (r < 600 && !aussen(r + zelle / 2)) r += zelle / 2;
    let lo = r;
    let hi = r + zelle / 2;
    for (let i = 0; i < 12; i++) {
      const mm = (lo + hi) / 2;
      if (aussen(mm)) hi = mm;
      else lo = mm;
    }
    return lo;
  };
  const innenP: number[] = [];
  const innenI: number[] = [];
  const innenUnten: number[] = [];
  const innenD: number[] = [];
  const lage = (w: number): V3 => ({ x: P[3 * w]!, y: P[3 * w + 1]!, z: P[3 * w + 2]! });
  for (const [kette, oben] of [
    [kO, true],
    [kU, false],
  ] as const) {
    const K = kette.length;
    const neu = (q: V3, d: V2): number => {
      innenP.push(q.x, q.y, q.z);
      innenUnten.push(oben ? 0 : 1);
      innenD.push(d.x, d.y);
      return innenP.length / 3 - 1;
    };
    // Abstand längs der Lippe bis zum Mundwinkel
    const bis = new Array<number>(K).fill(0);
    for (let i = K - 2; i >= 0; i--) {
      const p = lage(kette[i]!);
      const q = lage(kette[i + 1]!);
      bis[i] = bis[i + 1]! + Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    }
    const richtung = kette.map(() => inDenKiefer(oben));
    let tiefen = kette.map((w, i) =>
      i === 0 || i === K - 1 ? 0 : Math.max(0, Math.min(0.4 * kieferDicke(P[3 * w]!, P[3 * w + 1]!, richtung[i]!), 0.9 * Math.max(0, P[3 * w + 2]!), 0.7 * bis[i]!)),
    );
    for (let runde = 0; runde < 3; runde++) {
      tiefen = tiefen.map((t, i) => (i === 0 || i === K - 1 ? t : (tiefen[i - 1]! + 2 * t + tiefen[i + 1]!) / 4));
    }
    // je Punkt der Lippe eine Spalte: Zeile 0 sein Spiegelpunkt, Zeile nZe er selbst; vorn auf der Mitte nur ein Punkt
    const spalten = kette.map((w, i): number[] => {
      const d = richtung[i]!;
      const q = lage(w);
      if (i === 0) return new Array<number>(nZe + 1).fill(neu(q, d));
      const zc = Math.max(tiefe(q.x, q.y), 1e-6);
      const spalte: number[] = [];
      for (let j = 0; j <= nZe; j++) {
        if (j === 0) {
          spalte.push(neu(lage(sp(w)), d));
          continue;
        }
        if (j === nZe) {
          spalte.push(neu(q, d));
          continue;
        }
        const t = -1 + (2 * j) / nZe;
        const u = tiefen[i]! * (1 - t * t);
        const x = q.x + d.x * u;
        const y = q.y + d.y * u;
        // in der Tiefe breiter oder schmaler, wie der Körper an der verschobenen Stelle reicht, mit etwas Wand zur Haut; an der Lippe
        // genau ihre Breite. Höchstens um die Hälfte breiter: Bis 0,6 bleibt der Bogen von der Lippe zur Mitte monoton, sonst wölbt er
        // sich seitlich über die Lippe hinaus und klappt um (vorn am Gesicht reicht der Körper weiter innen doppelt so tief)
        const breiter = u > 0 ? Math.max(-0.5, Math.min(0.5, tiefe(x, y) / zc - 1)) * (1 - t * t) : 0;
        const z = t * q.z * (1 + breiter) * (1 - 0.12 * (1 - t * t));
        spalte.push(neu({ x, y, z }, d));
      }
      return spalte;
    });
    const tri = (a: number, b: number, c: number) => {
      if (a !== b && b !== c && c !== a) innenI.push(a, b, c);
    };
    for (let i = 0; i + 1 < K; i++) {
      for (let j = 0; j < nZe; j++) {
        tri(spalten[i]![j]!, spalten[i + 1]![j]!, spalten[i + 1]![j + 1]!);
        tri(spalten[i]![j]!, spalten[i + 1]![j + 1]!, spalten[i]![j + 1]!);
      }
    }
  }
  // Umlaufsinn: der Gaumen zeigt zum Boden (gegen seine Richtung in den Kiefer), der Boden zum Gaumen; je Fläche einmal entschieden
  const nInnen = innenP.length / 3;
  for (const unten of [0, 1]) {
    let summe = 0;
    for (let t = 0; t < innenI.length; t += 3) {
      if (innenUnten[innenI[t]!] !== unten) continue;
      const [fx, fy] = flaechenNormale(innenP, innenI[t]!, innenI[t + 1]!, innenI[t + 2]!);
      let dx = 0;
      let dy = 0;
      for (let e = 0; e < 3; e++) {
        dx += innenD[2 * innenI[t + e]!]!;
        dy += innenD[2 * innenI[t + e]! + 1]!;
      }
      summe -= fx * dx + fy * dy;
    }
    if (summe >= 0) continue;
    for (let t = 0; t < innenI.length; t += 3) {
      if (innenUnten[innenI[t]!] !== unten) continue;
      const b = innenI[t + 1]!;
      innenI[t + 1] = innenI[t + 2]!;
      innenI[t + 2] = b;
    }
  }
  const innenN = new Float32Array(3 * nInnen);
  const normieren = () => {
    for (let w = 0; w < nInnen; w++) {
      const len = Math.hypot(innenN[3 * w]!, innenN[3 * w + 1]!, innenN[3 * w + 2]!) || 1;
      for (let i = 0; i < 3; i++) innenN[3 * w + i] = innenN[3 * w + i]! / len;
    }
  };
  for (let t = 0; t < innenI.length; t += 3) {
    const f = flaechenNormale(innenP, innenI[t]!, innenI[t + 1]!, innenI[t + 2]!);
    for (let e = 0; e < 3; e++) for (let i = 0; i < 3; i++) innenN[3 * innenI[t + e]! + i] = innenN[3 * innenI[t + e]! + i]! + f[i]!;
  }
  normieren();
  // zweimal über die Nachbarn mitteln: Die Dreiecke am Reißverschluss zur Lippe sind ungleich (sonst Zacken in den Farbstufen)
  const summeN = new Float32Array(3 * nInnen);
  for (let runde = 0; runde < 2; runde++) {
    summeN.set(innenN);
    for (let t = 0; t < innenI.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const p = innenI[t + e]!;
        const q = innenI[t + ((e + 1) % 3)]!;
        for (let i = 0; i < 3; i++) {
          summeN[3 * p + i] = summeN[3 * p + i]! + innenN[3 * q + i]!;
          summeN[3 * q + i] = summeN[3 * q + i]! + innenN[3 * p + i]!;
        }
      }
    }
    innenN.set(summeN);
    normieren();
  }

  const indizes: number[] = [];
  for (let t = 0; t < T; t++) if (!offen[t]) indizes.push(h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!);
  return {
    positionen: pos32,
    normalen: Float32Array.from(opt.normalen ?? hautNormalen(h)),
    indizes: new Uint32Array(indizes),
    innen: { positionen: new Float32Array(innenP), normalen: innenN, indizes: new Uint32Array(innenI) },
    lippeOben: new Uint32Array(lippeOben),
    lippeUnten: new Uint32Array(lippeUnten),
    gelenk: M,
    linie: LU.C,
    drehsinn: sinn,
    gewichtBei: alt
      ? alt.gewichtBei
      : (x, y) => {
          unterFeld!(x, y, tmp);
          return tmp[0];
        },
    schaedelBei: alt
      ? alt.schaedelBei
      : (x, y) => {
          schaedelFeld!(x, y, tmp);
          return tmp[0];
        },
    gewicht,
    gradient,
    gewichtOben,
    gradientOben,
    innenUnten: new Uint8Array(innenUnten),
    unten: LD.C,
    tiefe,
    offen,
    kantenOffen,
  };
}
