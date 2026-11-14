// Form zuerst (05.11.2026), Schritt 1 „Nur Loops“ (Florian: Die Kugel hat am Anfang keine Loops; alle Griffe entstehen an
// Kreuzungen von Loops oder als Punkte, die er auf eine Linie setzt; geschlossene Formen wie in Illustrator; keine offenen Enden).
//
// Ein Loop ist eine geschlossene Linie auf der Haut, gespeichert als Proben (je ein Punkt eines Dreiecks). Er entsteht als Schnitt
// quer über den Körper (Ebene durch die gezogene Linie und die Blickrichtung) oder als gezeichnete Form, auf die Haut gelegt.
// Spiegelgleich: `mitte` liegt ganz in der Mittelebene, `ring` ist die Hälfte z ≥ 0 eines Loops um den Körper (Enden auf der
// Mittelebene), `paar` liegt auf einer Seite und hat ein Spiegelbild. Ein Loop ändert die Form nicht, wenn er entsteht; die Haut
// folgt nur den Verschiebungen seiner Proben (`HautZiele`). Punkte liegen an einer Stelle s längs des Loops; zwischen ihnen
// verläuft die Linie wie eine Bézier-Strecke: Jeder Punkt speichert seine Griffe (Teil A, 06.11.), ein glatter Punkt hält sie
// gegenüber, an einer Ecke darf die Linie knicken (von Hand oder von selbst an der Kreuzung mit einer Kante). Wie in Illustrator
// gehen die Griffe mit ihrem Punkt: Ein Punkt ändert nur die zwei Stücke bis zu seinen Nachbarn.

import { type HautAuftrag, HautAusKurven, type HautGewichte, type HautOptionen, type HautVorlage, halbMoeglich, strukturSchluessel } from './ausKurven';
import { KETTE_K, type KruemmungsKetten } from './kruemmung';
import { type Bindungen, type Haut, HautZiele, type V3, einflussBereich, hautNormalen, hautNormalenMax, kantenSchluessel } from './kurven';
import { bernstein, stueckAnpassen, stueckNaechstes, stueckPunkt, stueckTeilen } from './pfad';
import { DirektLoeser } from './direktZug';
import { type KnickFuehrung, knickFuehrungen, knickZiele } from './kantenWinkel';
import { linienRichtung } from './richtung';

export type Ansicht = 'seite' | 'front' | 'top';
/** Ein Punkt der Haut: drei Ecken eines Dreiecks und baryzentrische Gewichte */
export type Probe = { ecken: [number, number, number]; b: [number, number, number] };
/**
 * Griff auf einem Loop: Stelle s (Bogenlänge beim Anlegen), Lage beim letzten Festlegen und jetzt; Kreuzung: Kennung; Kante an
 * diesem Punkt (fehlt: wie der Loop; sie reicht bis zu den Nachbarpunkten, dort läuft der Knick in der Form aus). Glatt oder Ecke
 * betrifft nur den Verlauf der Linie (ihre Bézier-Griffe), die Kante die Haut quer über die Linie: Dort darf sie knicken, jede Seite
 * rundet sich für sich, der Winkel ergibt sich aus der Form (Florian, 06.11.: „kann im Grunde nur ganz oder gar nicht sein“; bis dahin
 * eine Härte 0–3).
 */
export type LoopPunkt = {
  s: number;
  ref: V3;
  cur: V3;
  kreuzung?: number;
  kante?: boolean;
  /** von Hand: Ecke (true) oder glatt (false); fehlt: wie `autoEcke` */
  ecke?: boolean;
  /** Kreuzung mit einer Kante (gesetzt von `eckenAuto`): dort knickt die Haut, also darf auch die Linie knicken */
  autoEcke?: boolean;
  /** der Mundwinkel, wenn der Loop das Maul ist (dort treffen sich Ober- und Unterlippe, um ihn dreht der Unterkiefer) */
  mundwinkel?: boolean;
  /**
   * Der Knick der Haut quer über die Linie an diesem Punkt, in Grad, nach innen (13.11., `kantenWinkel.ts`): Die Kante trägt ihren
   * Winkel selbst, auch ohne kreuzende Linie; zwischen den Punkten mit Angabe gleitet er. Fehlt die Angabe an allen Punkten der
   * Linie, ergibt sich der Winkel wie bisher aus der Form.
   */
  knick?: number;
  /**
   * Gespeicherte Bézier-Griffe (Vektoren vom Punkt aus): `ein` zum vorigen Stück, `aus` zum nächsten (Teil A, 06.11.: vorher am
   * Verlauf der Linie abgelesen). Am Ende eines Rings ist der Griff nach innen der eigentliche, der andere sein Spiegelbild.
   */
  ein?: V3;
  aus?: V3;
  /**
   * Ende eines Rings, das `griffeAnlegen` gesetzt hat: hält dort nur die Griffe; nicht zu sehen, nicht zu greifen, keine Stützstelle
   * der Kante (wie vorher, als dort kein Punkt war). Fällt eine Kreuzung darauf, wird es ein gewöhnlicher Spiegelpunkt.
   */
  vonSelbst?: boolean;
};
/** Ein Punkt, den Florian sieht und greifen kann (nicht ein Ende eines Rings, das nur Griffe hält) */
export const istSichtbar = (p: LoopPunkt): boolean => !p.vonSelbst;
/** Ecke: die Linie darf am Punkt knicken (Griffe unabhängig); sonst glatt (Griffe gegenüber) */
export const istEcke = (p: LoopPunkt): boolean => p.ecke ?? p.autoEcke ?? false;
/**
 * Ecke von selbst (Kreuzung mit einer Kante, nicht von Hand gesetzt): Ihre Griffe setzt der Editor — jede Seite so rund wie möglich
 * (`kantenKnicken`, `griffVersatzImZug`; Florian, 06.11.: „dann rund“). Fasst Florian einen ihrer Griffe an, wird sie eine Ecke von
 * Hand.
 */
export const istEckeVonSelbst = (p: LoopPunkt): boolean => p.ecke === undefined && !!p.autoEcke;
/** Versatz der Bézier-Griffe eines Punkts gegen ihre Lage in Ruhe: `ein` zum vorigen Stück, `aus` zum nächsten */
export type GriffVersatz = { ein?: V3; aus?: V3 };
export type Loop = {
  id: number;
  art: 'mitte' | 'ring' | 'paar';
  proben: Probe[];
  /** Bogenlänge je Probe beim Anlegen (Parameter längs des Loops) */
  s: Float64Array;
  /** ganze Länge (geschlossen: samt Schlussstück) */
  laenge: number;
  /** Lage je Probe beim letzten Festlegen (3 je Probe) */
  ruhe: Float64Array;
  /** nach s sortiert */
  punkte: LoopPunkt[];
  /** Kante des Loops, wo seine Punkte keine eigene Angabe haben (fehlt: keine) */
  kante?: boolean;
  /** Die Griffe sind angelegt (`griffeAnlegen`, nach den Kreuzungen des neuen Loops); fehlt: noch nicht (der Loop entsteht gerade) */
  pfad?: boolean;
  /**
   * Das Maul an diesem Ring ist geformt (`maulFormen`, 13.11.): Was er umschließt, sind Gaumen und Boden, echte Haut, die gezeigt
   * wird. Fehlt: An ihm entsteht das Maul wie bisher erst in der Anzeige (die Fläche wird weggeschnitten, das Innere eingesetzt).
   */
  maulGeformt?: boolean;
  /**
   * Das Maul aus nur einer Linie (14.11., `maulLinie.ts`): Die zweite Lippe dieses Rings ist das um den Mundwinkel gedrehte Abbild
   * der ersten; die Zahl ist der Winkel in Grad, um den die gerechnete Lage offen ist („zu“ dreht der Kieferknochen um ihn zurück).
   */
  maulLinie?: number;
};

/** Blattkoordinaten (u, v) und Tiefe zum Betrachter: Seite von +z, Front von −x, Top von +y */
export const blickUV = (a: Ansicht, p: V3): [number, number] => (a === 'seite' ? [p.x, p.y] : a === 'front' ? [p.z, p.y] : [p.x, p.z]);
export const blickTiefe = (a: Ansicht, p: V3): number => (a === 'seite' ? p.z : a === 'front' ? -p.x : p.y);
const ausUV = (a: Ansicht, u: number, v: number, t: number): V3 =>
  a === 'seite' ? { x: u, y: v, z: t } : a === 'front' ? { x: -t, y: v, z: u } : { x: u, y: t, z: v };

const lage = (P: ArrayLike<number>, i: number): V3 => ({ x: P[3 * i]!, y: P[3 * i + 1]!, z: P[3 * i + 2]! });
const abstand = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const geschlossen = (l: Loop): boolean => l.art !== 'ring';

/** mittlere Kantenlänge der Haut */
export function mittlereKante(h: Haut): number {
  let s = 0;
  let n = 0;
  for (let v = 0; v < h.n; v++) {
    for (const w of h.nachbarn[v]!) {
      if (w < v) continue;
      s += abstand(lage(h.pos, v), lage(h.pos, w));
      n++;
    }
  }
  return n ? s / n : 1;
}

/** Lage einer Probe auf der Haut, wie sie jetzt ist */
export function probenLage(h: Haut, p: Probe): V3 {
  const q = { x: 0, y: 0, z: 0 };
  for (let e = 0; e < 3; e++) {
    const v = p.ecken[e]!;
    q.x += p.b[e]! * h.pos[3 * v]!;
    q.y += p.b[e]! * h.pos[3 * v + 1]!;
    q.z += p.b[e]! * h.pos[3 * v + 2]!;
  }
  return q;
}

/** Lagen aller Proben eines Loops auf der Haut, wie sie jetzt ist (Mittelebene genau 0 bei `mitte`) */
export function hautLagen(h: Haut, l: Loop): Float64Array {
  const out = new Float64Array(3 * l.proben.length);
  l.proben.forEach((p, i) => {
    const q = probenLage(h, p);
    out[3 * i] = q.x;
    out[3 * i + 1] = q.y;
    out[3 * i + 2] = l.art === 'mitte' ? 0 : q.z;
  });
  if (l.art === 'ring') {
    out[2] = 0;
    out[3 * l.proben.length - 1] = 0;
  }
  return out;
}

/** Lage an der Stelle s längs des Loops (zwischen den Proben linear) */
export function stelleBei(l: Loop, lagen: Float64Array, s: number): V3 {
  const n = l.s.length;
  const zu = geschlossen(l);
  const t = zu ? ((s % l.laenge) + l.laenge) % l.laenge : Math.max(0, Math.min(l.laenge, s));
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (l.s[mid]! <= t) lo = mid;
    else hi = mid - 1;
  }
  const i = lo;
  const j = i + 1 < n ? i + 1 : zu ? 0 : i;
  const s0 = l.s[i]!;
  const s1 = j > i ? l.s[j]! : zu ? l.laenge : s0;
  const f = s1 > s0 ? (t - s0) / (s1 - s0) : 0;
  const a = lage(lagen, i);
  const b = lage(lagen, j);
  return { x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y), z: a.z + f * (b.z - a.z) };
}

/** Loop aus Proben und Lagen: Bogenlänge, Länge, Ruhe */
function loopAus(id: number, art: Loop['art'], proben: Probe[], p: V3[]): Loop {
  const n = p.length;
  const s = new Float64Array(n);
  for (let i = 1; i < n; i++) s[i] = s[i - 1]! + abstand(p[i - 1]!, p[i]!);
  const laenge = s[n - 1]! + (art === 'ring' ? 0 : abstand(p[n - 1]!, p[0]!));
  const ruhe = new Float64Array(3 * n);
  p.forEach((q, i) => {
    ruhe[3 * i] = q.x;
    ruhe[3 * i + 1] = q.y;
    ruhe[3 * i + 2] = q.z;
  });
  return { id, art, proben, s, laenge, ruhe, punkte: [] };
}

type Kantenpunkt = { u: number; v: number; f: number; p: V3 };

/**
 * Schnitt der Haut mit der Ebene n·p = d: geschlossene Linien aus Punkten auf Kanten, je Schritt das Dreieck, in dem er liegt.
 * Ecken genau auf der Ebene zählen zur Seite ≥ 0.
 */
export function schnittLinien(h: Haut, n: V3, d: number): { punkte: Kantenpunkt[]; dreieck: number[] }[] {
  const P = h.pos;
  const dist = (v: number) => n.x * P[3 * v]! + n.y * P[3 * v + 1]! + n.z * P[3 * v + 2]! - d;
  const nummer = new Map<number, number>();
  const pkt: Kantenpunkt[] = [];
  const nachbarn: { j: number; t: number }[][] = [];
  const punktAuf = (u: number, v: number, du: number, dv: number): number => {
    const key = u < v ? u * h.n + v : v * h.n + u;
    const da = nummer.get(key);
    if (da !== undefined) return da;
    const f = du / (du - dv);
    const p = { x: P[3 * u]! + f * (P[3 * v]! - P[3 * u]!), y: P[3 * u + 1]! + f * (P[3 * v + 1]! - P[3 * u + 1]!), z: P[3 * u + 2]! + f * (P[3 * v + 2]! - P[3 * u + 2]!) };
    pkt.push({ u, v, f, p });
    nachbarn.push([]);
    nummer.set(key, pkt.length - 1);
    return pkt.length - 1;
  };
  for (let t = 0; t < h.tri.length / 3; t++) {
    const e = [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!];
    const ds = e.map(dist);
    const seite = ds.map((x) => x >= 0);
    if (seite[0] === seite[1] && seite[1] === seite[2]) continue;
    const ids: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = k;
      const b = (k + 1) % 3;
      if (seite[a] !== seite[b]) ids.push(punktAuf(e[a]!, e[b]!, ds[a]!, ds[b]!));
    }
    if (ids.length !== 2) continue;
    nachbarn[ids[0]!]!.push({ j: ids[1]!, t });
    nachbarn[ids[1]!]!.push({ j: ids[0]!, t });
  }
  const besucht = new Uint8Array(pkt.length);
  const linien: { punkte: Kantenpunkt[]; dreieck: number[] }[] = [];
  for (let start = 0; start < pkt.length; start++) {
    if (besucht[start] || nachbarn[start]!.length !== 2) continue;
    const punkte: Kantenpunkt[] = [];
    const dreieck: number[] = [];
    let vor = -1;
    let jetzt = start;
    let ok = false;
    for (let schritt = 0; schritt <= pkt.length; schritt++) {
      besucht[jetzt] = 1;
      punkte.push(pkt[jetzt]!);
      const nb = nachbarn[jetzt]!;
      const weiter = punkte.length === 1 ? nb[0] : nb.find((x) => x.j !== vor);
      if (!weiter) break;
      dreieck.push(weiter.t);
      if (weiter.j === start) {
        ok = true;
        break;
      }
      if (besucht[weiter.j]) break;
      vor = jetzt;
      jetzt = weiter.j;
    }
    if (ok && punkte.length >= 3) linien.push({ punkte, dreieck });
  }
  return linien;
}

/** Probe für einen Kantenpunkt im Dreieck t (das seine Kante enthält) */
function probeIn(h: Haut, t: number, k: Kantenpunkt): Probe {
  const e: [number, number, number] = [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!];
  const b: [number, number, number] = [0, 0, 0];
  b[e.indexOf(k.u)] = b[e.indexOf(k.u)]! + 1 - k.f;
  b[e.indexOf(k.v)] = b[e.indexOf(k.v)]! + k.f;
  return { ecken: e, b };
}

/** Spiegelbild einer Probe (z → −z) über die Spiegelpartner der Ecken; null, wenn einer fehlt */
export function spiegelProbe(h: Haut, p: Probe): Probe | null {
  const e = p.ecken.map((v) => h.spiegel[v]!) as [number, number, number];
  return e.every((v) => v >= 0) ? { ecken: e, b: [...p.b] as [number, number, number] } : null;
}

/** Hälfte z ≥ 0 einer geschlossenen Schnittlinie, die die Mittelebene zweimal kreuzt (Enden genau auf z = 0) */
function ringHaelfte(h: Haut, linie: { punkte: Kantenpunkt[]; dreieck: number[] }): { proben: Probe[]; p: V3[] } | null {
  const { punkte, dreieck } = linie;
  const m = punkte.length;
  const z = (i: number) => punkte[((i % m) + m) % m]!.p.z;
  let ein = -1;
  let aus = -1;
  for (let i = 0; i < m; i++) {
    if (z(i) < 0 && z(i + 1) >= 0) ein = i;
    if (z(i) >= 0 && z(i + 1) < 0) aus = i;
  }
  if (ein < 0 || aus < 0) return null;
  const ende = (i: number): { probe: Probe; p: V3 } => {
    const a = punkte[i % m]!;
    const b = punkte[(i + 1) % m]!;
    const g = -a.p.z / (b.p.z - a.p.z);
    const t = dreieck[i % m]!;
    const pa = probeIn(h, t, a);
    const pb = probeIn(h, t, b);
    const bb = pa.b.map((x, k) => (1 - g) * x + g * pb.b[k]!) as [number, number, number];
    return { probe: { ecken: pa.ecken, b: bb }, p: { x: a.p.x + g * (b.p.x - a.p.x), y: a.p.y + g * (b.p.y - a.p.y), z: 0 } };
  };
  const anfang = ende(ein);
  const proben: Probe[] = [anfang.probe];
  const p: V3[] = [anfang.p];
  for (let k = 1; k <= m; k++) {
    const i = (ein + k) % m;
    if (z(i) < 0) break;
    proben.push(probeIn(h, dreieck[i]!, punkte[i]!));
    p.push(punkte[i]!.p);
    if (i === aus) break;
  }
  const schluss = ende(aus);
  proben.push(schluss.probe);
  p.push(schluss.p);
  return p.length >= 3 ? { proben, p } : null;
}

/**
 * Loop schneiden: Ebene durch die gezogene Linie A → B (Blattkoordinaten) und die Blickrichtung. Seite: immer ein Ring. Front
 * und Top: nah an der Mittelachse (≤ `fang`) die Mittelebene selbst (`mitte`), quer über die Mitte ein Ring (die Ebene wird
 * spiegelgleich: in der Front waagerecht, im Top quer), sonst ein Loop auf einer Seite (`paar`). Von mehreren Schnittlinien
 * die, die der gezogenen Linie am nächsten liegt, bei Gleichstand die vorderste.
 */
export function loopAusSchnitt(
  h: Haut,
  a: Ansicht,
  A: [number, number],
  B: [number, number],
  id: number,
  fang: number,
): Loop | null {
  const du = B[0] - A[0];
  const dv = B[1] - A[1];
  if (Math.hypot(du, dv) < 1e-6) return null;
  let art: Loop['art'];
  let n: V3;
  let d: number;
  if (a === 'seite') {
    const L = Math.hypot(du, dv);
    n = { x: -dv / L, y: du / L, z: 0 };
    d = n.x * A[0] + n.y * A[1];
    art = 'ring';
  } else {
    // Koordinate, die z ist: Front u, Top v
    const za = a === 'front' ? A[0] : A[1];
    const zb = a === 'front' ? B[0] : B[1];
    if (Math.abs(za) < fang && Math.abs(zb) < fang) {
      art = 'mitte';
      n = { x: 0, y: 0, z: 1 };
      d = 0;
    } else if (za * zb < 0) {
      art = 'ring';
      const g = za / (za - zb);
      if (a === 'front') {
        n = { x: 0, y: 1, z: 0 };
        d = A[1] + g * dv;
      } else {
        n = { x: 1, y: 0, z: 0 };
        d = A[0] + g * du;
      }
    } else {
      art = 'paar';
      const roh = a === 'front' ? { x: 0, y: du, z: -dv } : { x: -dv, y: 0, z: du };
      const L = Math.hypot(roh.x, roh.y, roh.z);
      n = { x: roh.x / L, y: roh.y / L, z: roh.z / L };
      const A3 = ausUV(a, A[0], A[1], 0);
      d = n.x * A3.x + n.y * A3.y + n.z * A3.z;
    }
  }
  // geht die Ebene genau durch Netzpunkte (die Kugel hat welche auf den Achsenebenen), minimal verschieben: sonst liegen
  // Proben auf Punkten statt auf Kanten, und die Linie lässt sich nicht als Kette von Kanten einsetzen (die Mitte ausgenommen)
  if (art !== 'mitte') {
    for (let v = 0; v < h.n; v++) {
      if (Math.abs(n.x * h.pos[3 * v]! + n.y * h.pos[3 * v + 1]! + n.z * h.pos[3 * v + 2]! - d) < 1e-6) {
        d += 1e-3;
        break;
      }
    }
  }
  const linien = schnittLinien(h, n, d);
  if (linien.length === 0) return null;
  // Abstand der Linie zur gezogenen Strecke im Blatt, dann Tiefe
  const zurStrecke = (q: V3): number => {
    const [u, v] = blickUV(a, q);
    const L2 = du * du + dv * dv;
    const t = Math.max(0, Math.min(1, ((u - A[0]) * du + (v - A[1]) * dv) / L2));
    return Math.hypot(u - A[0] - t * du, v - A[1] - t * dv);
  };
  const bewertung = linien.map((l) => {
    let nah = Infinity;
    let vorn = -Infinity;
    let laenge = 0;
    l.punkte.forEach((k, i) => {
      nah = Math.min(nah, zurStrecke(k.p));
      vorn = Math.max(vorn, blickTiefe(a, k.p));
      laenge += abstand(k.p, l.punkte[(i + 1) % l.punkte.length]!.p);
    });
    const kreuzt = l.punkte.some((k) => k.p.z < 0) && l.punkte.some((k) => k.p.z >= 0);
    return { l, nah, vorn, laenge, kreuzt };
  });
  let wahl: (typeof bewertung)[number] | undefined;
  if (art === 'mitte') {
    wahl = bewertung.reduce((x, y) => (y.laenge > x.laenge ? y : x));
  } else {
    const passend = bewertung.filter((b) => (art === 'ring' ? b.kreuzt : !b.kreuzt));
    if (passend.length === 0) return null;
    const best = Math.min(...passend.map((b) => b.nah));
    const nahe = passend.filter((b) => b.nah <= best + fang);
    wahl = nahe.reduce((x, y) => (y.vorn > x.vorn ? y : x));
  }
  if (!wahl) return null;
  const { punkte, dreieck } = wahl.l;
  if (art === 'ring') {
    const hl = ringHaelfte(h, wahl.l);
    return hl ? loopAus(id, 'ring', hl.proben, hl.p) : null;
  }
  let proben = punkte.map((k, i) => probeIn(h, dreieck[(i - 1 + punkte.length) % punkte.length]!, k));
  let p = punkte.map((k) => (art === 'mitte' ? { ...k.p, z: 0 } : k.p));
  // ein Loop auf der Seite z < 0 wird als sein Spiegelbild gespeichert
  if (art === 'paar' && p[0]!.z < 0) {
    const sp = proben.map((q) => spiegelProbe(h, q));
    if (sp.some((q) => !q)) return null;
    proben = sp as Probe[];
    p = p.map((q) => ({ ...q, z: -q.z }));
  }
  return loopAus(id, art, proben, p);
}

/** Strahl aus dem Blatt auf die Haut: vorderster Treffer an (u, v) */
export function strahl(h: Haut, a: Ansicht, u: number, v: number): { probe: Probe; p: V3 } | null {
  let best = -Infinity;
  let treffer: { probe: Probe; p: V3 } | null = null;
  const P = h.pos;
  for (let t = 0; t < h.tri.length / 3; t++) {
    const e: [number, number, number] = [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!];
    const q = e.map((i) => lage(P, i));
    const uv = q.map((x) => blickUV(a, x));
    const minU = Math.min(uv[0]![0], uv[1]![0], uv[2]![0]);
    const maxU = Math.max(uv[0]![0], uv[1]![0], uv[2]![0]);
    if (u < minU || u > maxU) continue;
    const minV = Math.min(uv[0]![1], uv[1]![1], uv[2]![1]);
    const maxV = Math.max(uv[0]![1], uv[1]![1], uv[2]![1]);
    if (v < minV || v > maxV) continue;
    const [x0, y0] = uv[0]!;
    const [x1, y1] = uv[1]!;
    const [x2, y2] = uv[2]!;
    const det = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (Math.abs(det) < 1e-12) continue;
    const b0 = ((y1 - y2) * (u - x2) + (x2 - x1) * (v - y2)) / det;
    const b1 = ((y2 - y0) * (u - x2) + (x0 - x2) * (v - y2)) / det;
    const b2 = 1 - b0 - b1;
    if (b0 < -1e-9 || b1 < -1e-9 || b2 < -1e-9) continue;
    const p = {
      x: b0 * q[0]!.x + b1 * q[1]!.x + b2 * q[2]!.x,
      y: b0 * q[0]!.y + b1 * q[1]!.y + b2 * q[2]!.y,
      z: b0 * q[0]!.z + b1 * q[1]!.z + b2 * q[2]!.z,
    };
    const tiefe = blickTiefe(a, p);
    if (tiefe > best) {
      best = tiefe;
      treffer = { probe: { ecken: e, b: [b0, b1, b2] }, p };
    }
  }
  return treffer;
}

/**
 * Eine gezeichnete geschlossene Form auf die Haut legen (dicht abgetastet, `knoten` = Stellen, die Punkte werden). In Front und
 * Top über die Mittelachse gezeichnet wird sie spiegelgleich (ihre Hälfte z ≥ 0), ebenso in der Seite über den Umriss (vorn aus
 * dem Körper hinaus, etwa ums Maul); sonst ein Loop auf einer Seite.
 */
export function formAusZeichnung(h: Haut, a: Ansicht, uv: readonly [number, number][], knoten: readonly number[], id: number): Loop | null {
  const m = uv.length;
  if (m < 6) return null;
  const zKoord = (q: readonly [number, number]) => (a === 'front' ? q[0] : a === 'top' ? q[1] : 1);
  const wechsel: number[] = [];
  for (let i = 0; i < m; i++) if (zKoord(uv[i]!) < 0 !== zKoord(uv[(i + 1) % m]!) < 0) wechsel.push(i);
  const knotenMenge = new Set(knoten);
  const proben: Probe[] = [];
  const p: V3[] = [];
  const marken: number[] = [];
  // in der Seite je Probe der Treffer auf der Haut (null: außerhalb des Umrisses)
  const treffer = a === 'seite' ? uv.map((q) => strahl(h, a, q[0], q[1])) : null;
  const dazu = (q: readonly [number, number], knoten: boolean, t = strahl(h, a, q[0], q[1])) => {
    if (!t) return;
    if (knoten) marken.push(p.length);
    proben.push(t.probe);
    p.push(t.p);
  };
  let art: Loop['art'];
  if (a !== 'seite' && wechsel.length === 2) {
    // die Hälfte auf der Seite z ≥ 0, von Kreuzung zu Kreuzung, Enden genau auf der Mittelachse
    art = 'ring';
    const start = wechsel.find((i) => zKoord(uv[i]!) < 0)!;
    const kreuz = (i: number): [number, number] => {
      const q0 = uv[i]!;
      const q1 = uv[(i + 1) % m]!;
      const g = zKoord(q0) / (zKoord(q0) - zKoord(q1));
      const q: [number, number] = [q0[0] + g * (q1[0] - q0[0]), q0[1] + g * (q1[1] - q0[1])];
      if (a === 'front') q[0] = 0;
      else q[1] = 0;
      return q;
    };
    dazu(kreuz(start), false);
    for (let k = 1; k <= m; k++) {
      const i = (start + k) % m;
      if (zKoord(uv[i]!) < 0) {
        dazu(kreuz((i - 1 + m) % m), false);
        break;
      }
      dazu(uv[i]!, knotenMenge.has(i));
    }
    if (p.length < 3) return null;
    p[0] = { ...p[0]!, z: 0 };
    p[p.length - 1] = { ...p[p.length - 1]!, z: 0 };
  } else if (treffer && treffer.some((t) => !t)) {
    const r = ringUeberUmriss(h, uv, treffer, knotenMenge);
    if (!r) return null;
    art = 'ring';
    proben.push(...r.proben);
    p.push(...r.p);
    marken.push(...r.marken);
  } else if (wechsel.length === 0) {
    art = 'paar';
    uv.forEach((q, i) => dazu(q, knotenMenge.has(i), treffer ? treffer[i] : undefined));
    if (p.length < 0.7 * m) return null;
    if (p.every((q) => q.z < 0)) {
      const sp = proben.map((q) => spiegelProbe(h, q));
      if (sp.some((q) => !q)) return null;
      sp.forEach((q, i) => (proben[i] = q!));
      p.forEach((q, i) => (p[i] = { ...q, z: -q.z }));
    }
  } else return null;
  const l = loopAus(id, art, proben, p);
  l.punkte = marken.map((i) => ({ s: l.s[i]!, ref: { ...p[i]! }, cur: { ...p[i]! } }));
  return l;
}

/**
 * In der Seite über den Umriss gezeichnet: Die Proben auf dem Körper (ein einziger Lauf) sind die Hälfte z ≥ 0 eines Rings, seine
 * Enden liegen dort, wo die Zeichnung den Umriss kreuzt, genau auf Kanten der Mittelebene (in der Seite ist sie der Umriss). Null,
 * wenn die Zeichnung den Körper mehr als einmal verlässt oder der Umriss dort keine Kante der Mittelebene hat.
 */
function ringUeberUmriss(
  h: Haut,
  uv: readonly [number, number][],
  treffer: readonly ({ probe: Probe; p: V3 } | null)[],
  knoten: ReadonlySet<number>,
): { proben: Probe[]; p: V3[]; marken: number[] } | null {
  const m = uv.length;
  const drauf = (i: number) => treffer[((i % m) + m) % m] !== null;
  const rein: number[] = [];
  const raus: number[] = [];
  for (let i = 0; i < m; i++) {
    if (!drauf(i - 1) && drauf(i)) rein.push(i);
    if (drauf(i) && !drauf(i + 1)) raus.push(i);
  }
  if (rein.length !== 1 || raus.length !== 1) return null;
  const P = h.pos;
  const aufMitte = (v: number) => Math.abs(P[3 * v + 2]!) < 1e-9;
  // die Kante der Mittelebene, die die Strecke vom Treffer q0 hinaus nach q1 zuerst kreuzt
  const ende = (q0: readonly [number, number], q1: readonly [number, number]): { probe: Probe; p: V3 } | null => {
    const rx = q1[0] - q0[0];
    const ry = q1[1] - q0[1];
    let best: { v: number; w: number; f: number } | null = null;
    let bestT = Infinity;
    for (let v = 0; v < h.n; v++) {
      if (!aufMitte(v)) continue;
      for (const w of h.nachbarn[v]!) {
        if (w < v || !aufMitte(w)) continue;
        const sx = P[3 * w]! - P[3 * v]!;
        const sy = P[3 * w + 1]! - P[3 * v + 1]!;
        const nenner = rx * sy - ry * sx;
        if (Math.abs(nenner) < 1e-12) continue;
        const qx = P[3 * v]! - q0[0];
        const qy = P[3 * v + 1]! - q0[1];
        const t = (qx * sy - qy * sx) / nenner;
        const f = (qx * ry - qy * rx) / nenner;
        if (t < 0 || t > 1 || f < 0 || f > 1 || t >= bestT) continue;
        bestT = t;
        best = { v, w, f };
      }
    }
    if (!best) return null;
    // ein Dreieck an der Kante (auf der Seite z ≥ 0)
    let tri = -1;
    for (let t = 0; t < h.tri.length / 3; t++) {
      const e = [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!];
      if (!e.includes(best.v) || !e.includes(best.w)) continue;
      tri = t;
      const dritte = e.find((x) => x !== best!.v && x !== best!.w)!;
      if (P[3 * dritte + 2]! >= 0) break;
    }
    if (tri < 0) return null;
    const e: [number, number, number] = [h.tri[3 * tri]!, h.tri[3 * tri + 1]!, h.tri[3 * tri + 2]!];
    const b: [number, number, number] = [0, 0, 0];
    b[e.indexOf(best.v)] = 1 - best.f;
    b[e.indexOf(best.w)] = best.f;
    const a = lage(P, best.v);
    const c = lage(P, best.w);
    return { probe: { ecken: e, b }, p: { x: a.x + best.f * (c.x - a.x), y: a.y + best.f * (c.y - a.y), z: 0 } };
  };
  const i0 = rein[0]!;
  const i1 = raus[0]!;
  const anfang = ende(uv[i0]!, uv[(i0 - 1 + m) % m]!);
  const schluss = ende(uv[i1]!, uv[(i1 + 1) % m]!);
  if (!anfang || !schluss) return null;
  const proben: Probe[] = [anfang.probe];
  const p: V3[] = [anfang.p];
  const marken: number[] = [];
  for (let k = 0; k < m; k++) {
    const i = (i0 + k) % m;
    const t = treffer[i]!;
    if (knoten.has(i)) marken.push(p.length);
    proben.push(t.probe);
    p.push(t.p);
    if (i === i1) break;
  }
  proben.push(schluss.probe);
  p.push(schluss.p);
  return p.length >= 4 ? { proben, p, marken } : null;
}

/** Abstand zweier Strecken und die Parameter der nächsten Punkte */
function streckenNaechste(p0: V3, p1: V3, q0: V3, q1: V3): { d: number; u: number; v: number } {
  const d1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
  const d2 = { x: q1.x - q0.x, y: q1.y - q0.y, z: q1.z - q0.z };
  const r = { x: p0.x - q0.x, y: p0.y - q0.y, z: p0.z - q0.z };
  const a = d1.x * d1.x + d1.y * d1.y + d1.z * d1.z;
  const e = d2.x * d2.x + d2.y * d2.y + d2.z * d2.z;
  const f = d2.x * r.x + d2.y * r.y + d2.z * r.z;
  const c = d1.x * r.x + d1.y * r.y + d1.z * r.z;
  const b = d1.x * d2.x + d1.y * d2.y + d1.z * d2.z;
  const nenner = a * e - b * b;
  let u = nenner > 1e-12 ? Math.max(0, Math.min(1, (b * f - c * e) / nenner)) : 0;
  let v = e > 1e-12 ? (b * u + f) / e : 0;
  if (v < 0) {
    v = 0;
    u = a > 1e-12 ? Math.max(0, Math.min(1, -c / a)) : 0;
  } else if (v > 1) {
    v = 1;
    u = a > 1e-12 ? Math.max(0, Math.min(1, (b - c) / a)) : 0;
  }
  const px = p0.x + u * d1.x - (q0.x + v * d2.x);
  const py = p0.y + u * d1.y - (q0.y + v * d2.y);
  const pz = p0.z + u * d1.z - (q0.z + v * d2.z);
  return { d: Math.hypot(px, py, pz), u, v };
}

/** Kreuzungen zweier Loops (Stellen auf beiden, Lage), nahe Funde zusammengefasst */
export function kreuzungenZwischen(A: Loop, la: Float64Array, B: Loop, lb: Float64Array, tol: number): { sa: number; sb: number; p: V3 }[] {
  const strecken = (l: Loop, lp: Float64Array) => {
    const n = l.proben.length;
    const out: { a: V3; b: V3; s0: number; s1: number }[] = [];
    for (let i = 0; i < (geschlossen(l) ? n : n - 1); i++) {
      const j = (i + 1) % n;
      out.push({ a: lage(lp, i), b: lage(lp, j), s0: l.s[i]!, s1: j > i ? l.s[j]! : l.laenge });
    }
    return out;
  };
  const sa = strecken(A, la);
  const sb = strecken(B, lb);
  const funde: { sa: number; sb: number; p: V3; d: number }[] = [];
  for (const x of sa) {
    const xmin = Math.min(x.a.x, x.b.x) - tol;
    const xmax = Math.max(x.a.x, x.b.x) + tol;
    const ymin = Math.min(x.a.y, x.b.y) - tol;
    const ymax = Math.max(x.a.y, x.b.y) + tol;
    const zmin = Math.min(x.a.z, x.b.z) - tol;
    const zmax = Math.max(x.a.z, x.b.z) + tol;
    for (const y of sb) {
      if (Math.max(y.a.x, y.b.x) < xmin || Math.min(y.a.x, y.b.x) > xmax) continue;
      if (Math.max(y.a.y, y.b.y) < ymin || Math.min(y.a.y, y.b.y) > ymax) continue;
      if (Math.max(y.a.z, y.b.z) < zmin || Math.min(y.a.z, y.b.z) > zmax) continue;
      const r = streckenNaechste(x.a, x.b, y.a, y.b);
      if (r.d > tol) continue;
      funde.push({
        sa: x.s0 + r.u * (x.s1 - x.s0),
        sb: y.s0 + r.v * (y.s1 - y.s0),
        p: { x: x.a.x + r.u * (x.b.x - x.a.x), y: x.a.y + r.u * (x.b.y - x.a.y), z: x.a.z + r.u * (x.b.z - x.a.z) },
        d: r.d,
      });
    }
  }
  funde.sort((p, q) => p.d - q.d);
  const out: { sa: number; sb: number; p: V3 }[] = [];
  for (const f of funde) if (!out.some((o) => abstand(o.p, f.p) < 4 * tol)) out.push({ sa: f.sa, sb: f.sb, p: f.p });
  return out;
}

/**
 * Kreuzt oder berührt die Linie sich selbst (11.11.)? Zwei ihrer Stücke, die längs der Linie mindestens drei Probenweiten auseinander
 * liegen, kommen sich näher als ein Zehntel einer Probenweite. So liegt sie, wenn ein Griff verdreht oder ein Punkt über seinen
 * Nachbarn hinaus gezogen ist; die Haut ist dort über sich selbst gefaltet. Das Maß ist die mittlere Probenweite der Linie, nicht die
 * Bogenlänge zwischen den Stücken: Ein schmaler geschlossener Loop kreuzt sich nicht. `L`: die Lagen der Proben (sonst die Ruhe).
 */
export function linieKreuztSich(l: Loop, L: Float64Array = l.ruhe): boolean {
  const n = L.length / 3;
  const zu = geschlossen(l);
  const m = zu ? n : n - 1;
  if (m < 4) return false;
  // Bogenlänge am Anfang jedes Stücks
  const s0 = new Float64Array(m + 1);
  for (let i = 0; i < m; i++) s0[i + 1] = s0[i]! + abstand(lage(L, i), lage(L, (i + 1) % n));
  const ganz = s0[m]!;
  if (!(ganz > 0)) return false;
  const weite = ganz / m;
  const nah = 0.1 * weite;
  const fern = 3 * weite;
  for (let a = 0; a < m; a++) {
    const p0 = lage(L, a);
    const p1 = lage(L, (a + 1) % n);
    const xmin = Math.min(p0.x, p1.x) - nah;
    const xmax = Math.max(p0.x, p1.x) + nah;
    const ymin = Math.min(p0.y, p1.y) - nah;
    const ymax = Math.max(p0.y, p1.y) + nah;
    const zmin = Math.min(p0.z, p1.z) - nah;
    const zmax = Math.max(p0.z, p1.z) + nah;
    for (let b = a + 1; b < m; b++) {
      // längs der Linie vom Ende von a zum Anfang von b, bei einer geschlossenen auch andersherum
      const vor = s0[b]! - s0[a + 1]!;
      const rueck = zu ? ganz - s0[b + 1]! + s0[a]! : Infinity;
      if (Math.min(vor, rueck) < fern) continue;
      const q0 = lage(L, b);
      const q1 = lage(L, (b + 1) % n);
      if (Math.max(q0.x, q1.x) < xmin || Math.min(q0.x, q1.x) > xmax) continue;
      if (Math.max(q0.y, q1.y) < ymin || Math.min(q0.y, q1.y) > ymax) continue;
      if (Math.max(q0.z, q1.z) < zmin || Math.min(q0.z, q1.z) > zmax) continue;
      if (streckenNaechste(p0, p1, q0, q1).d < nah) return true;
    }
  }
  return false;
}

const NULL: V3 = { x: 0, y: 0, z: 0 };

/**
 * Verschiebung je Probe aus den Verschiebungen der Punkte (`D` je Punkt) und dem Versatz ihrer Griffe: Zwischen zwei Punkten ist es
 * genau die Änderung des Bézier-Stücks aus ihnen und ihren Griffen. Wie in Illustrator gehen die Griffe mit ihrem Punkt (ohne
 * Versatz bleibt die Richtung der Linie an jedem Punkt, wie sie war): Ein Punkt ändert nur die zwei Stücke bis zu seinen
 * Nachbarpunkten, nie mehr (vorher drehten die Nachbarn ihre Richtung mit, das Stück dahinter bog sich, und wo es endete, entstand
 * ein Knick). Gedreht oder skaliert wird mit dem Versatz der Griffe (`griffe`), ein Griff biegt nur sein Stück (Bernstein-Gewicht
 * 3t(1 − t)² bzw. 3t²(1 − t)); eine Ecke von selbst folgt ihren Nachbarn (`griffVersatzImZug`). Ein geschlossener Loop mit einem
 * Punkt bewegt sich als Ganzes. Ein Ring hält seine Enden auf der Mittelebene (ohne Punkt dort bleiben sie stehen).
 */
export function verschiebungLaengs(l: Loop, D: readonly V3[], griffe?: readonly (GriffVersatz | undefined)[]): Float64Array {
  const n = l.proben.length;
  const out = new Float64Array(3 * n);
  const g = griffVersatzImZug(l, D, griffe);
  type Knoten = { s: number; d: V3; ein: V3; aus: V3 };
  const K: Knoten[] = l.punkte.map((q, i) => ({ s: q.s, d: D[i] ?? NULL, ein: g[i]!.ein, aus: g[i]!.aus }));
  if (K.length === 0) return out;
  const zu = geschlossen(l);
  // Stücke von S[i] bis S[i + 1]: geschlossen ringsum (das letzte über das Ende hinaus), ein Ring von Ende zu Ende
  let S: Knoten[];
  if (zu) S = [...K, { ...K[0]!, s: K[0]!.s + l.laenge }];
  else {
    const L = l.laenge;
    const innen = K.filter((k) => k.s > 1e-6 && k.s < L - 1e-6);
    const ende = (k: Knoten | undefined, s: number): Knoten =>
      k ? { ...k, s, d: { ...k.d, z: 0 } } : { s, d: NULL, ein: NULL, aus: NULL };
    S = [ende(K.find((k) => k.s <= 1e-6), 0), ...innen, ende(K.find((k) => k.s >= L - 1e-6), L)];
  }
  for (let j = 0; j < n; j++) {
    let s = l.s[j]!;
    if (zu) s = (((s - S[0]!.s) % l.laenge) + l.laenge) % l.laenge + S[0]!.s;
    let i = 0;
    while (i < S.length - 2 && S[i + 1]!.s < s) i++;
    const a = S[i]!;
    const b = S[i + 1]!;
    const h = b.s - a.s;
    const t = h > 1e-9 ? Math.max(0, Math.min(1, (s - a.s) / h)) : 0;
    const h00 = 2 * t * t * t - 3 * t * t + 1;
    const h01 = -2 * t * t * t + 3 * t * t;
    const b1 = 3 * t * (1 - t) * (1 - t);
    const b2 = 3 * t * t * (1 - t);
    out[3 * j] = h00 * a.d.x + h01 * b.d.x + b1 * a.aus.x + b2 * b.ein.x;
    out[3 * j + 1] = h00 * a.d.y + h01 * b.d.y + b1 * a.aus.y + b2 * b.ein.y;
    out[3 * j + 2] = h00 * a.d.z + h01 * b.d.z + b1 * a.aus.z + b2 * b.ein.z;
  }
  if (l.art === 'mitte') for (let j = 0; j < n; j++) out[3 * j + 2] = 0;
  if (l.art === 'ring') {
    out[2] = 0;
    out[3 * n - 1] = 0;
  }
  return out;
}

/** Bindungen aller Loops an die Haut: jede Probe, dazu ihr Spiegelbild (Ring: die andere Hälfte, Paar: der Zwilling). */
export type BindungsPlan = { bind: Bindungen; loop: Int32Array; probe: Int32Array; spiegel: Uint8Array };
export function bindungenAus(h: Haut, loops: readonly Loop[]): BindungsPlan {
  const ecken: number[] = [];
  const b: number[] = [];
  const loop: number[] = [];
  const probe: number[] = [];
  const spiegel: number[] = [];
  loops.forEach((l, li) =>
    l.proben.forEach((p, pi) => {
      ecken.push(...p.ecken);
      b.push(...p.b);
      loop.push(li);
      probe.push(pi);
      spiegel.push(0);
      const sp = spiegelProbe(h, p);
      if (!sp) return;
      const gleich = [...sp.ecken].sort().join() === [...p.ecken].sort().join();
      if (gleich) return;
      ecken.push(...sp.ecken);
      b.push(...sp.b);
      loop.push(li);
      probe.push(pi);
      spiegel.push(1);
    }),
  );
  return {
    bind: { ecken: Int32Array.from(ecken), b: Float64Array.from(b) },
    loop: Int32Array.from(loop),
    probe: Int32Array.from(probe),
    spiegel: Uint8Array.from(spiegel),
  };
}

/** Ziele der Bindungen aus den Lagen der Proben (je Loop, 3 je Probe) */
export function zieleAus(plan: BindungsPlan, lagen: readonly Float64Array[]): Float64Array {
  const m = plan.loop.length;
  const z = new Float64Array(3 * m);
  for (let j = 0; j < m; j++) {
    const L = lagen[plan.loop[j]!]!;
    const i = plan.probe[j]!;
    z[3 * j] = L[3 * i]!;
    z[3 * j + 1] = L[3 * i + 1]!;
    z[3 * j + 2] = plan.spiegel[j] ? -L[3 * i + 2]! : L[3 * i + 2]!;
  }
  return z;
}

/** Einflussbereich: Punkte der Haut im Abstand < r um die Mittelpunkte (auch gespiegelt), dazu die Ecken `ecken` und `ringe` Ringe darum */
export function bereichUm(h: Haut, zentren: readonly V3[], r: number, ecken: Iterable<number>, ringe = 3): Uint8Array {
  const aus = einflussBereich(h, zentren, r);
  let rand: number[] = [];
  for (const v of ecken) {
    if (aus[v]) continue;
    aus[v] = 1;
    rand.push(v);
  }
  for (let k = 0; k < ringe; k++) {
    const neu: number[] = [];
    for (const v of rand) {
      for (const j of h.nachbarn[v]!) {
        if (aus[j]) continue;
        aus[j] = 1;
        neu.push(j);
      }
    }
    rand = neu;
  }
  return aus;
}

/**
 * Ketten für die Krümmung (`KruemmungsFeld`): je Bindung die Bindungen desselben Loops davor und dahinter (geschlossene Loops
 * ringsum, ein Ring über sein Ende hinaus in seine Spiegelhälfte), dazu, ob dort eine Kante ist und ob ein Punkt mit Ecke liegt. Nur
 * eingesetzte Loops (Proben auf Punkten).
 */
export function kruemmungsKetten(plan: BindungsPlan, loops: readonly Loop[]): KruemmungsKetten {
  const m = plan.loop.length;
  const finde = new Map<string, number>();
  for (let j = 0; j < m; j++) finde.set(`${plan.loop[j]}:${plan.probe[j]}:${plan.spiegel[j]}`, j);
  const kette: Int32Array[] = new Array<Int32Array>(m);
  const kante = new Uint8Array(m);
  const ecke = new Uint8Array(m);
  const hd = loops.map((l) => kanteBei(l, loops));
  const eingesetzt = loops.map((l) => l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2]));
  // Proben mit einem Punkt, der eine Ecke ist (die nächste Probe zu seiner Stelle)
  const eckProben = loops.map((l) => {
    const out = new Set<number>();
    for (const p of l.punkte) {
      if (!istEcke(p)) continue;
      let best = 0;
      for (let i = 1; i < l.s.length; i++) if (Math.abs(l.s[i]! - p.s) < Math.abs(l.s[best]! - p.s)) best = i;
      out.add(best);
    }
    return out;
  });
  for (let j = 0; j < m; j++) {
    const li = plan.loop[j]!;
    const pi = plan.probe[j]!;
    const sp = plan.spiegel[j]!;
    const l = loops[li]!;
    kante[j] = hd[li]![pi]!;
    ecke[j] = eckProben[li]!.has(pi) ? 1 : 0;
    if (!eingesetzt[li]) continue;
    const n = l.proben.length;
    const k = new Int32Array(2 * KETTE_K + 1).fill(-1);
    for (let d = -KETTE_K; d <= KETTE_K; d++) {
      let q = pi + d;
      let s2 = sp;
      if (l.art === 'ring') {
        if (q < 0) {
          q = -q;
          s2 = 1 - sp;
        } else if (q > n - 1) {
          q = 2 * (n - 1) - q;
          s2 = 1 - sp;
        }
        if (q < 0 || q > n - 1) continue;
      } else q = ((q % n) + n) % n;
      // auf der Mittelebene gibt es nur die gespeicherte Bindung
      const j2 = finde.get(`${li}:${q}:${s2}`) ?? finde.get(`${li}:${q}:0`);
      if (j2 !== undefined) k[d + KETTE_K] = j2;
    }
    kette[j] = k;
  }
  return { kette, kante, ecke };
}

/**
 * Wie die Haut zwischen den Loops entsteht: `gedaechtnis` = jeder Punkt behält die Krümmung beim Anfassen, so weit die Loops sie
 * nicht vorgeben (`HautZiele`, das Fenster); `kurven` = die Haut im Bereich wird aus den Loops neu gerechnet, ohne Gedächtnis
 * (`HautAusKurven`, Beweis B vom 06.11., zum Vergleich).
 */
export type HautArt = 'gedaechtnis' | 'kurven' | 'direkt';

/** Punkte der Haut auf einer harten Linie (Kante an), samt ihrem Spiegelbild */
export function hartePunkte(h: Haut, loops: readonly Loop[]): Uint8Array {
  const hart = new Uint8Array(h.n);
  for (const l of loops) {
    const k = kanteBei(l, loops);
    l.proben.forEach((p, i) => {
      if (!k[i] || p.ecken[0] !== p.ecken[1] || p.ecken[1] !== p.ecken[2]) return;
      hart[p.ecken[0]] = 1;
      const s = h.spiegel[p.ecken[0]]!;
      if (s >= 0) hart[s] = 1;
    });
  }
  return hart;
}

/**
 * Den Löser `direkt` für eine Haut und ihre Loops anlegen, bevor gegriffen wird (er hängt nicht daran, was gezogen wird): Ein
 * `LoopZug` mit der Art `direkt` übernimmt ihn (`opt.direkt`), solange Haut und Loops dieselben sind.
 */
export function direktLoeserFuer(h: Haut, loops: readonly Loop[]): DirektLoeser {
  const plan = bindungenAus(h, loops);
  return new DirektLoeser(h, loops, plan, zieleAus(plan, loops.map((l) => l.ruhe)), hartePunkte(h, loops));
}

/**
 * Ein Zug: Löser für den Einflussbereich, Lagen der Loops beim Anfang. Je Schritt die Verschiebung je Probe (je Loop, null:
 * bleibt); am Ende `festlegen`. `kruemmung`: die Krümmung der Haut folgt den Loops (sonst behält jeder Punkt seine; nur mit
 * Gedächtnis).
 */
export class LoopZug {
  readonly plan: BindungsPlan;
  /** Lagen der Loops beim Anfang (je Loop der Form; die Führungen stehen nicht darin) */
  readonly start: Float64Array[];
  readonly loeser: HautZiele | HautAusKurven | DirektLoeser;
  /** wie die Haut zwischen den Loops entsteht (`HautArt`) */
  readonly art: HautArt;
  /** Richtung an den Linien (Beweis 09.11.): Haut, Loops und Normalen der Haut beim Anfassen (Vorzeichen, Linien ohne Kreuzung) */
  private readonly richtungAus: { h: Haut; loops: readonly Loop[]; normalen: Float64Array } | null = null;
  /**
   * Linien, die ihren Knick selbst tragen (`kantenWinkel.ts`): je Linie die erste Reihe der Haut innen, als weiterer Loop hinter
   * denen der Form gebunden; ihre Ziele werden vor jeder Runde neu gerechnet. In der Grundform (`kurven`) und in der Pose
   * (`gedaechtnis`), nicht mit `direkt`.
   */
  private readonly fuehrung: KnickFuehrung[] = [];
  private readonly h: Haut;
  private readonly startFuehrung: Float64Array[] = [];

  constructor(
    h: Haut,
    loops: readonly Loop[],
    bereich: Uint8Array | null,
    kruemmung = true,
    art: HautArt = 'gedaechtnis',
    gewichte: HautGewichte = 'gleich',
    opt: HautOptionen & { direkt?: DirektLoeser | null } = {},
  ) {
    this.art = art;
    this.h = h;
    this.start = loops.map((l) => Float64Array.from(l.ruhe));
    if (art === 'direkt') {
      // fertige Haut direkt bewegen (13.11.): der vorbereitete Löser, sonst hier angelegt (dann wartet das Greifen auf das Zerlegen)
      this.plan = bindungenAus(h, loops);
      this.loeser = opt.direkt ?? new DirektLoeser(h, loops, this.plan, zieleAus(this.plan, this.start), hartePunkte(h, loops));
      return;
    }
    // Linien mit vorgegebenem Knick: ihre erste Reihe innen wird mitgebunden (hinter den Loops der Form). Auch in der Pose
    // (`gedaechtnis`): Dort ist die Haut mit den Knochen gedreht, der Knick wird an ihr gemessen, wie sie liegt.
    this.fuehrung = knickFuehrungen(h, loops);
    const alle = mitFuehrung(loops, this.fuehrung);
    this.startFuehrung = this.fuehrung.map((f) => Float64Array.from(f.loop.ruhe));
    this.plan = bindungenAus(h, alle);
    // die Ketten tragen die Dehnung der Loops immer, die Krümmung (mit Richtung) nur mit `kruemmung`
    const ketten = kruemmungsKetten(this.plan, alle);
    const ziele = zieleAus(this.plan, [...this.start, ...this.startFuehrung]);
    this.loeser =
      art === 'kurven'
        ? new HautAusKurven(h, this.plan.bind, ziele, bereich, 100, kantenGewichte(h, alle), ketten, gewichte, opt)
        : new HautZiele(h, this.plan.bind, ziele, bereich, 100, kantenGewichte(h, alle), ketten, kruemmung);
    if (art === 'kurven' && opt.richtung) this.richtungAus = { h, loops, normalen: hautNormalenMax(h) };
  }

  /** die fertige Zerlegung des Lösers (nach der Geometrie), für einen nächsten auf demselben Netz */
  get vorlage(): HautVorlage | null {
    return this.loeser instanceof HautAusKurven ? this.loeser.vorlage : null;
  }

  /** mit `nurZeilen`: was der Löser zerlegen würde */
  get auftrag(): HautAuftrag | null {
    return this.loeser instanceof HautAusKurven ? this.loeser.auftrag : null;
  }

  /**
   * Vorsicht bei Unruhe (nach der Geometrie, `ausKurven.ts`): wie oft der Löser seinen Schritt halbiert hat, und ob er nicht zur Ruhe
   * kam und stehen geblieben ist, bis sich die Ziele wieder bewegen
   */
  get unruhe(): { stufen: number; fest: boolean } {
    return this.loeser instanceof HautAusKurven ? { stufen: this.loeser.vorsichtStufen, fest: this.loeser.stehtFest } : { stufen: 0, fest: false };
  }

  /** Lagen je Loop: Anfang + Verschiebung */
  lagen(versch: readonly (Float64Array | null)[]): Float64Array[] {
    return this.start.map((s, i) => {
      const d = versch[i];
      if (!d) return s;
      const out = new Float64Array(s.length);
      for (let k = 0; k < s.length; k++) out[k] = s[k]! + d[k]!;
      return out;
    });
  }

  schritt(versch: readonly (Float64Array | null)[], iterationen = 2): void {
    const L = this.lagen(versch);
    if (this.loeser instanceof DirektLoeser) {
      this.loeser.schritt(L, zieleAus(this.plan, L), iterationen);
      return;
    }
    const r = this.richtungAus;
    if (r && this.loeser instanceof HautAusKurven) this.loeser.richtung = linienRichtung(r.h, r.loops, this.plan, L, r.normalen);
    if (this.fuehrung.length === 0) {
      this.loeser.schritt(zieleAus(this.plan, L), iterationen);
      return;
    }
    // Die Führungen folgen der Haut außen (ihr Winkel ist gegen sie gemessen) und ihrer Linie: vor jeder Runde neu
    for (let it = 0; it < iterationen; it++) {
      const F = this.fuehrung.map((f) => knickZiele(this.h, f.l, f.R, L[f.li]));
      this.loeser.schritt(zieleAus(this.plan, [...L, ...F]), 1);
    }
  }
}

/** Die Loops der Form, dahinter die Loops der Führungen (so sieht der Löser sie) */
const mitFuehrung = (loops: readonly Loop[], fuehrung: readonly KnickFuehrung[]): readonly Loop[] => (fuehrung.length ? [...loops, ...fuehrung.map((f) => f.loop)] : loops);

/**
 * Die Struktur, die ein Löser nach der Geometrie über die ganze Haut für diesen Stand hätte (`HautVorlage.struktur`), ohne ihn
 * anzulegen: Passt eine fertige Zerlegung noch? Sie hängt am Netz, an den Proben der Linien, an Kanten und Ecken, nicht an den Lagen
 * und nicht an den Punkten und Griffen der Loops. Nach einem neuen Punkt auf einer Linie oder einem gezogenen Griff ist sie dieselbe;
 * wer greift, braucht dann nicht auf eine neue Zerlegung zu warten (10.11., Florian: an einer Form mit 27 800 Punkten zwei Sekunden).
 */
export function loopStruktur(h: Haut, loops: readonly Loop[], opt: HautOptionen = {}): string {
  // (wie `LoopZug`: Linien mit vorgegebenem Knick binden ihre erste Reihe mit)
  const alle = mitFuehrung(loops, knickFuehrungen(h, loops));
  const plan = bindungenAus(h, alle);
  // (auf der Hälfte gerechnet, wo der Löser es täte: gewünscht und jeder Punkt hat sein Spiegelbild)
  const halb = !!opt.halb && !opt.richtung && !opt.wurst && halbMoeglich(h);
  return strukturSchluessel(h, null, plan.bind, 100, kantenGewichte(h, alle), kruemmungsKetten(plan, alle), !!opt.richtung, halb);
}

/**
 * Nach einem Zug: Ruhe = Lagen der Proben auf der Haut, jeder Punkt an seiner Stelle darauf. Liegt die Linie genau auf ihrem Pfad
 * (`punkteLesen` falsch, 07.11.), sind die Punkte die Wahrheit: Sie bleiben, wohin sie gezogen wurden (`cur`), statt von der Haut
 * zurückgelesen zu werden (sonst wanderten sie um das, was der Löser die Linie verfehlt, und zwei Loops an einer Kreuzung läsen
 * verschiedene Orte).
 */
export function festlegen(h: Haut, l: Loop, punkteLesen = true): void {
  l.ruhe = hautLagen(h, l);
  for (const p of l.punkte) {
    const q = punkteLesen ? stelleBei(l, l.ruhe, p.s) : { ...p.cur };
    if (l.art === 'mitte' || (l.art === 'ring' && (p.s <= 1e-6 || p.s >= l.laenge - 1e-6))) q.z = 0;
    p.ref = q;
    p.cur = { ...q };
  }
}

/**
 * Stützstellen der Kante: Punkte mit eigener Angabe, dazu gesetzte Punkte ohne (mit der des Loops). Kreuzungen ohne eigene Angabe
 * gehören zum Stück, in dem sie liegen (sonst unterbräche jeder kreuzende Loop eine Kante).
 */
function kanteKnoten(l: Loop): { s: number; k: boolean }[] {
  const basis = l.kante ?? false;
  return l.punkte.filter((p) => !p.vonSelbst && (p.kante !== undefined || p.kreuzung === undefined)).map((p) => ({ s: p.s, k: p.kante ?? basis }));
}

/**
 * Kante an der Stelle s: Ein Stück zwischen zwei Stützstellen ist Kante, wenn eine von beiden es ist; der Knick läuft dann im Stück
 * zur nächsten Stützstelle ohne Kante in der Form aus (bis zum 06.11. lief dort die Härte linear auf 0). Gemessen und verworfen: nur
 * zwischen zwei Stützstellen mit Kante (wie in Blender zwischen zwei gewählten Punkten): Der Knick musste genau an den äußeren
 * Punkten enden, eine Braue aus drei Punkten knickte 40° statt 50°. Vor der ersten und nach der letzten Stützstelle eines Rings wie
 * diese (dort setzt er sich im Spiegelbild fort).
 */
export function kanteAn(l: Loop, s: number, K: readonly { s: number; k: boolean }[] = kanteKnoten(l)): boolean {
  if (K.length === 0) return l.kante ?? false;
  const zu = geschlossen(l);
  const auf = K.findIndex((k) => Math.abs(k.s - s) <= 1e-6);
  if (auf >= 0) {
    const vor = auf > 0 ? K[auf - 1]! : zu ? K[K.length - 1]! : null;
    const nach = auf < K.length - 1 ? K[auf + 1]! : zu ? K[0]! : null;
    return K[auf]!.k || !!vor?.k || !!nach?.k;
  }
  let i = K.findIndex((k) => k.s > s);
  if (i < 0) i = K.length;
  if (!zu && (i === 0 || i === K.length)) return K[i === 0 ? 0 : K.length - 1]!.k;
  const a = i === 0 ? K[K.length - 1]! : K[i - 1]!;
  const b = i === K.length ? K[0]! : K[i]!;
  return a.k || b.k;
}

/** Ab diesem Knick (Grad) ist eine kreuzende Linie geknickt (darunter misst man die Zacken des Netzes) */
const KNICK = 15;

/** Knick der Linie an ihrem Punkt i (Grad): Richtung hinein gegen hinaus, je Seite gemessen; 0 an einem glatten Punkt */
export function knickAm(l: Loop, i: number): number {
  if (!istEcke(l.punkte[i]!)) return 0;
  const g = griffeBei(l, i);
  if (!g.ein || !g.aus) return 0;
  const le = Math.hypot(g.ein.x, g.ein.y, g.ein.z);
  const la = Math.hypot(g.aus.x, g.aus.y, g.aus.z);
  if (!(le > 1e-9 && la > 1e-9)) return 0;
  const c = -(g.ein.x * g.aus.x + g.ein.y * g.aus.y + g.ein.z * g.aus.z) / (le * la);
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/**
 * Kreuzungen dieses Loops, an denen eine kreuzende Linie geknickt ist (Florian, 06.11.: „dass die Linie den Knick zwischen den zwei
 * Punkten interpoliert“). Stützstellen sind alle Kreuzungen (gesetzte Punkte ohne Kreuzung unterbrechen nicht). Der eigene Knick eines
 * Loops zählt hier nicht: Ein Ring, der an einer Ecke weiter rund läuft, sagt quer über die Linie, die ihn kreuzt, nichts.
 */
function knickKnoten(l: Loop, loops: readonly Loop[]): { s: number; k: boolean }[] {
  const out: { s: number; k: boolean }[] = [];
  for (const p of l.punkte) {
    if (p.kreuzung === undefined) continue;
    let w = 0;
    for (const q of loops) {
      if (q === l) continue;
      q.punkte.forEach((r, k) => {
        if (r.kreuzung === p.kreuzung) w = Math.max(w, knickAm(q, k));
      });
    }
    out.push({ s: p.s, k: w >= KNICK });
  }
  return out;
}

/**
 * Kante je Probe (1 = Kante): die gesetzte; mit `loops` dazu überall, wo eine kreuzende Linie geknickt ist, bis zu den nächsten
 * Kreuzungen auf beiden Seiten (an einer glatten Kreuzung läuft der Knick in der Form aus). Ein Pilzhut mit Ecken an den vier
 * Kreuzungen seines Rands bekommt so eine Kante rundum statt Polstern zwischen den Ecken.
 */
export function kanteBei(l: Loop, loops?: readonly Loop[]): Uint8Array {
  const K = kanteKnoten(l);
  const k = Uint8Array.from(l.s, (s) => (kanteAn(l, s, K) ? 1 : 0));
  if (!loops) return k;
  const KK = knickKnoten(l, loops);
  if (!KK.some((x) => x.k)) return k;
  for (let j = 0; j < k.length; j++) if (!k[j] && kanteAn(l, l.s[j]!, KK)) k[j] = 1;
  return k;
}

/**
 * Härte je Probe für die Anzeige (0 = rund … 1 = Knick): an den Stützstellen der Kante 1 oder 0 (dieselben wie bei `kanteBei`: die
 * gesetzte Kante an den Punkten, dazu die Kreuzungen, an denen eine kreuzende Linie knickt), dazwischen läuft sie längs der Linie
 * gleichmäßig aus (Florian, 13.11.: „wenn man einzelne Punkte knickt, kann es sein, dass auf einer Linie auch ein Übergang zwischen
 * zwei Punkten von hart zu rund ist […] Dargestellt ist das dann durch eine Verjüngung“). Sie ist genau dort über 0, wo `kanteBei`
 * eine Kante meldet (bis auf die runde Stützstelle am Ende eines Übergangs selbst). Die Rechnung nimmt weiter `kanteBei`: Im
 * Übergang darf die Haut knicken, der Knick läuft in der Form aus.
 */
export function haerteBei(l: Loop, loops?: readonly Loop[]): Float32Array {
  const zu = geschlossen(l);
  const verlauf = (K: readonly { s: number; k: boolean }[], s: number): number => {
    if (K.length === 0) return l.kante ? 1 : 0;
    const wert = (x: { k: boolean }): number => (x.k ? 1 : 0);
    let i = K.findIndex((k) => k.s > s);
    if (i < 0) i = K.length;
    // vor der ersten und nach der letzten Stützstelle eines Rings wie diese (dort setzt er sich im Spiegelbild fort)
    if (!zu && (i === 0 || i === K.length)) return wert(K[i === 0 ? 0 : K.length - 1]!);
    const a = i === 0 ? K[K.length - 1]! : K[i - 1]!;
    const b = i === K.length ? K[0]! : K[i]!;
    if (a.k === b.k) return wert(a);
    const weg = (((b.s - a.s) % l.laenge) + l.laenge) % l.laenge;
    const bis = (((s - a.s) % l.laenge) + l.laenge) % l.laenge;
    const f = weg > 1e-9 ? Math.max(0, Math.min(1, bis / weg)) : 0;
    return wert(a) + f * (wert(b) - wert(a));
  };
  const K = kanteKnoten(l);
  const h = Float32Array.from(l.s, (s) => verlauf(K, s));
  if (!loops) return h;
  const KK = knickKnoten(l, loops);
  if (!KK.some((x) => x.k)) return h;
  for (let j = 0; j < h.length; j++) h[j] = Math.max(h[j]!, verlauf(KK, l.s[j]!));
  return h;
}

/**
 * Automatische Ecken: Ein Punkt an der Kreuzung mit einer Kante wird eine Ecke (dort knickt die Haut quer über die Kante, also auch
 * die Linie, die sie kreuzt); sonst nicht. Was von Hand gesetzt ist (`ecke`), gilt vor.
 */
export function eckenAuto(loops: readonly Loop[]): void {
  const an = new Map<number, { l: Loop; s: number }[]>();
  for (const l of loops) {
    for (const p of l.punkte) {
      if (p.kreuzung === undefined) continue;
      const liste = an.get(p.kreuzung) ?? [];
      liste.push({ l, s: p.s });
      an.set(p.kreuzung, liste);
    }
  }
  for (const l of loops) {
    for (const p of l.punkte) {
      const hart = p.kreuzung !== undefined && (an.get(p.kreuzung) ?? []).some((x) => x.l !== l && kanteAn(x.l, x.s));
      if (hart) p.autoEcke = true;
      else delete p.autoEcke;
    }
  }
}

/** Punkt i liegt am Ende eines Rings, auf der Mittelebene (Spiegelpunkt): 'anfang' (s = 0), 'ende' (s = Länge) oder null */
export function ringEnde(l: Loop, i: number): 'anfang' | 'ende' | null {
  const p = l.punkte[i];
  if (l.art !== 'ring' || !p) return null;
  return p.s <= 1e-6 ? 'anfang' : p.s >= l.laenge - 1e-6 ? 'ende' : null;
}

const gespiegelt = (v: V3): V3 => ({ x: v.x, y: v.y, z: -v.z });

// ---------- Gespeicherte Griffe (Teil A, 06.11.2026) ----------
//
// Florian: „Linien als Bézier-Pfade mit echten Griffen“. Jeder Punkt speichert seine zwei Griffe; zwischen zwei Punkten ist das
// Bézier-Stück aus ihnen und ihren Griffen die Rechnung, nach der sich die Linie verformt (`verschiebungLaengs`: genau die Änderung
// dieses Stücks, wenn Punkte und Griffe sich ändern). Die Linie selbst behält, was sie beim Anlegen auf der Haut hatte: Ein neuer
// Loop ändert nichts. Neu gegen das Ablesen am Verlauf (bis 06.11., ein Ausgleichspolynom je Seite): Die Griffe sind, wie Florian
// sie gezogen hat (keine Schwellen gegen das Zacken der Linie im Netz), ein neuer Punkt teilt sein Stück genau (de Casteljau), und
// ein gelöschter Punkt verbindet seine Nachbarn über ihre eigenen Griffe wie in Illustrator (vorher blieb die Linie, wie sie war).

/** Der Loop speichert seine Griffe (an jedem Punkt `ein` und `aus`) */
export const hatGriffe = (l: Loop): boolean => l.pfad === true;

/** Stücke zwischen den Punkten: Anfang a, Ende b (Index), Stellen s0 < s1 (geschlossen: das letzte über das Ende hinaus) */
function stuecke(l: Loop): { a: number; b: number; s0: number; s1: number }[] {
  const P = l.punkte;
  const m = P.length;
  if (m === 0) return [];
  if (geschlossen(l)) return P.map((p, i) => ({ a: i, b: (i + 1) % m, s0: p.s, s1: i + 1 < m ? P[i + 1]!.s : P[0]!.s + l.laenge }));
  return P.slice(0, -1).map((p, i) => ({ a: i, b: i + 1, s0: p.s, s1: P[i + 1]!.s }));
}

/** Stelle s im Stück (geschlossen über das Ende hinaus gezählt), sonst null */
function imStueck(l: Loop, st: { s0: number; s1: number }, s: number): number | null {
  const x = geschlossen(l) && s < st.s0 ? s + l.laenge : s;
  return x >= st.s0 && x <= st.s1 ? x : null;
}

/** Proben im Inneren eines Stücks: Index und Parameter t = (s − s0) / (s1 − s0) */
function probenIn(l: Loop, st: { s0: number; s1: number }): { j: number; t: number }[] {
  const out: { j: number; t: number }[] = [];
  const h = st.s1 - st.s0;
  if (!(h > 1e-9)) return out;
  for (let j = 0; j < l.s.length; j++) {
    const x = imStueck(l, st, l.s[j]!);
    if (x !== null && x > st.s0 + 1e-9 && x < st.s1 - 1e-9) out.push({ j, t: (x - st.s0) / h });
  }
  return out;
}

/**
 * Lage des Bézier-Pfads (Punkte und gespeicherte Griffe) an der Stelle s; null ohne angelegte Griffe. Die Linie weicht davon nur um
 * das ab, was sie beim Anlegen neben ihrem Pfad lag: Ein Zug ändert genau den Pfad (`verschiebungLaengs`), dieser Abstand bleibt.
 */
export function pfadBei(l: Loop, s: number): V3 | null {
  if (!hatGriffe(l)) return null;
  for (const st of stuecke(l)) {
    const x = imStueck(l, st, s);
    if (x === null) continue;
    const a = l.punkte[st.a]!;
    const b = l.punkte[st.b]!;
    if (!a.aus || !b.ein) return null;
    const h = st.s1 - st.s0;
    return stueckPunkt(a.ref, a.aus, b.ein, b.ref, h > 1e-9 ? (x - st.s0) / h : 0);
  }
  return null;
}

// ---------- Die Linie ist ihr Pfad (07.11.2026) ----------
//
// Florian: „ja genau zur Bézier-Kurve machen“ (nach dem Befund vom 06.11.: Die Linie lag bis 2 Einheiten neben ihrem Pfad, an gleicher
// Stelle bis 7, und dieser Rest ließ sich mit den Griffen nicht glätten). Jede Probe hat ihren Platz auf dem Pfad, t = (s − s0)/(s1 − s0)
// in ihrem Stück; in der Grundform ist ihr Ziel genau der Pfad dort, die Haut folgt. Beim Anlegen bekommt jede Probe die Stelle des
// nächsten Punkts auf dem Pfad (`pfadParameter`), damit sie nur quer zur Linie springt; danach behält sie ihr t (Züge, Teilen beim
// Einfügen, Verdichten, eingesetzte Loops). Ohne Zusatzpunkte (Florians Wahl): Wo ein Stück einen Bogen nicht genau beschreibt, folgt
// die Haut dem Stück (ein Halbkreis als ein Stück liegt bis 1,4 % neben dem Kreis).

/** Der Loop hat einen Pfad: gespeicherte Griffe und mindestens zwei Punkte (ein geschlossener Loop mit einem Punkt hat kein Stück, das ihn beschreibt) */
export const hatPfad = (l: Loop): boolean => hatGriffe(l) && l.punkte.length >= 2 && l.punkte.every((p) => p.ein && p.aus);

/**
 * Lage je Probe auf dem Pfad (3 je Probe): an ihrer Stelle t in ihrem Stück, aus den Punkten `P` (sonst ihren Lagen) und den Griffen
 * `G` (sonst den gespeicherten); null ohne Pfad. Mittelebene und Enden eines Rings genau auf z = 0.
 *
 * Ein Ring und ein Paar gehören zur Hälfte z ≥ 0, ihr Spiegelbild zur anderen. Ihr Pfad darf durch die Mittelebene laufen (ein
 * Punkt oder ein Griff über die Mitte gezogen): Gerechnet wird damit wie überall, erst die Anzeige schneidet jede Hälfte an der Ebene
 * ab, dort verschmelzen sie (11.11., Florian: „ich kann ganz normal über die Spiegelkante ziehen und das Mesh verschmilzt dann“).
 * Am Morgen des 11.11. hielt die Linie Abstand zur Ebene; dann wurde die Haut zwischen ihr und der Mitte zerknüllt. `roh` hat seitdem
 * keine Wirkung mehr.
 */
export function pfadLagen(l: Loop, P?: readonly V3[], G?: readonly { ein: V3; aus: V3 }[], _roh = false): Float64Array | null {
  if (!hatPfad(l)) return null;
  const n = l.proben.length;
  const out = new Float64Array(3 * n);
  const gesetzt = new Uint8Array(n);
  const ort = (i: number): V3 => P?.[i] ?? l.punkte[i]!.ref;
  for (const st of stuecke(l)) {
    const h = st.s1 - st.s0;
    const A = ort(st.a);
    const B = ort(st.b);
    const a = G?.[st.a]?.aus ?? l.punkte[st.a]!.aus!;
    const b = G?.[st.b]?.ein ?? l.punkte[st.b]!.ein!;
    for (let j = 0; j < n; j++) {
      if (gesetzt[j]) continue;
      const x = imStueck(l, st, l.s[j]!);
      if (x === null) continue;
      const q = stueckPunkt(A, a, b, B, h > 1e-9 ? (x - st.s0) / h : 0);
      out[3 * j] = q.x;
      out[3 * j + 1] = q.y;
      out[3 * j + 2] = q.z;
      gesetzt[j] = 1;
    }
  }
  if (l.art === 'mitte') for (let j = 0; j < n; j++) out[3 * j + 2] = 0;
  if (l.art === 'ring') {
    out[2] = 0;
    out[3 * n - 1] = 0;
  }
  return out;
}

/** Eine Kante der Haut auf einer Linie mit ihrem Stück des Pfads (`pfadKanten`) */
export type PfadKante = { ja: number; jb: number; a: number; b: number; k: [V3, V3, V3, V3] };

/**
 * Die Kanten eines eingesetzten Loops mit ihrem Stück des Pfads (Plan vom 12.11., Schritt 1 „glatte Anzeige“): je Paar
 * aufeinanderfolgender Proben `ja`, `jb` die Punkte der Haut `a`, `b` und die vier Kontrollpunkte des kubischen Bézier-Stücks von a
 * nach b (ein Stück eines kubischen Béziers ist wieder einer). Damit legt die Anzeige jede Kante der Haut, die auf einer Linie liegt,
 * genau auf den Pfad, so fein sie auch unterteilt. Null ohne Pfad oder wenn der Loop nicht ins Netz eingesetzt ist. Wie `pfadLagen`
 * nur die eigene Hälfte (Ring, Paar), die Mittelebene und die Enden eines Rings genau bei z = 0, und mit `P`/`G` der Pfad im Zug. Eine Kante, deren Proben in
 * verschiedenen Stücken liegen (zwischen ihnen ein Punkt, der keine Probe ist), fehlt in der Liste.
 */
export function pfadKanten(l: Loop, P?: readonly V3[], G?: readonly { ein: V3; aus: V3 }[]): PfadKante[] | null {
  if (!hatPfad(l)) return null;
  if (!l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) return null;
  const n = l.proben.length;
  const aus: PfadKante[] = [];
  const misch = (p: V3, q: V3, t: number): V3 => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t });
  for (const st of stuecke(l)) {
    const h = st.s1 - st.s0;
    if (!(h > 1e-9)) continue;
    // wie `pfadLagen`: andere Lagen der Punkte (`P`) und andere Griffe (`G`), solange gezogen wird
    const A = P?.[st.a] ?? l.punkte[st.a]!.ref;
    const B = P?.[st.b] ?? l.punkte[st.b]!.ref;
    const a = G?.[st.a]?.aus ?? l.punkte[st.a]!.aus!;
    const b = G?.[st.b]?.ein ?? l.punkte[st.b]!.ein!;
    const C: [V3, V3, V3, V3] = [A, { x: A.x + a.x, y: A.y + a.y, z: A.z + a.z }, { x: B.x + b.x, y: B.y + b.y, z: B.z + b.z }, B];
    const drin: { j: number; t: number }[] = [];
    for (let j = 0; j < n; j++) {
      const x = imStueck(l, st, l.s[j]!);
      if (x !== null) drin.push({ j, t: (x - st.s0) / h });
    }
    drin.sort((p, q) => p.t - q.t);
    // Blüte des kubischen Stücks: Kontrollpunkte des Teilstücks von u bis v sind b(u,u,u), b(u,u,v), b(u,v,v), b(v,v,v)
    const bluete = (t1: number, t2: number, t3: number): V3 => {
      const a01 = misch(C[0], C[1], t1);
      const a12 = misch(C[1], C[2], t1);
      const a23 = misch(C[2], C[3], t1);
      return misch(misch(a01, a12, t2), misch(a12, a23, t2), t3);
    };
    for (let q = 0; q + 1 < drin.length; q++) {
      const u = drin[q]!.t;
      const v = drin[q + 1]!.t;
      if (!(v - u > 1e-12)) continue;
      const ja = drin[q]!.j;
      const jb = drin[q + 1]!.j;
      const k: [V3, V3, V3, V3] = [bluete(u, u, u), bluete(u, u, v), bluete(u, v, v), bluete(v, v, v)];
      if (l.art === 'mitte') for (const p of k) p.z = 0;
      if (l.art === 'ring') {
        if (ja === 0) k[0].z = 0;
        if (jb === n - 1) k[3].z = 0;
      }
      aus.push({ ja, jb, a: l.proben[ja]!.ecken[0]!, b: l.proben[jb]!.ecken[0]!, k });
    }
  }
  return aus;
}

/** Was die Linie (`L`, 3 je Probe) zu ihrem Pfad fehlt, je Probe; null ohne Pfad (`roh`: wie `pfadLagen`) */
export function pfadVersatz(l: Loop, L: Float64Array = l.ruhe, roh = false): Float64Array | null {
  const p = pfadLagen(l, undefined, undefined, roh);
  if (!p) return null;
  for (let k = 0; k < p.length; k++) p[k] = p[k]! - L[k]!;
  return p;
}

/** Größter Abstand der Linie zu ihrem Pfad an gleicher Stelle (0 ohne Pfad) */
export function pfadAbweichung(l: Loop, L: Float64Array = l.ruhe): number {
  const d = pfadVersatz(l, L);
  let m = 0;
  if (d) for (let j = 0; j < d.length; j += 3) m = Math.max(m, Math.hypot(d[j]!, d[j + 1]!, d[j + 2]!));
  return m;
}

/**
 * Stelle jeder Probe auf dem Pfad: t des nächsten Punkts ihres Stücks (Newton ab ihrer heutigen Stelle), im Stück streng steigend.
 * Ergebnis je Probe t (NaN: liegt auf einem Punkt) und das neue s, fortlaufend in der Reihenfolge der Proben (eine Probe hinter dem
 * Ende eines geschlossenen Loops, die über die Naht von s rutscht, bekommt ein s unter 0).
 */
function pfadStellen(l: Loop, L: Float64Array): { t: Float64Array; s: Float64Array } {
  const n = l.proben.length;
  const t = new Float64Array(n).fill(Number.NaN);
  const s = Float64Array.from(l.s);
  for (const st of stuecke(l)) {
    const A = l.punkte[st.a]!;
    const B = l.punkte[st.b]!;
    if (!A.aus || !B.ein) continue;
    const h = st.s1 - st.s0;
    const pr = probenIn(l, st).sort((p, q) => p.t - q.t);
    const u = pr.map((x) => stueckNaechstes(A.ref, A.aus!, B.ein!, B.ref, lage(L, x.j), x.t));
    const eps = 1e-6;
    for (let k = 0; k < u.length; k++) u[k] = Math.min(1 - eps * (u.length - k), Math.max(u[k]!, k > 0 ? u[k - 1]! + eps : eps));
    pr.forEach((x, k) => {
      t[x.j] = u[k]!;
      // die Probe lag hinter dem Ende des geschlossenen Loops (im letzten Stück über die Naht von s gezählt): dort bleibt sie
      s[x.j] = st.s0 + u[k]! * h - (geschlossen(l) && l.s[x.j]! < st.s0 ? l.laenge : 0);
    });
  }
  return { t, s };
}

/**
 * Jede Probe an die Stelle des nächsten Punkts auf ihrem Pfad (neues s). Ein geschlossener Loop wird so verschoben, dass seine erste
 * Probe wieder bei s = 0 liegt (Punkte und Proben um dasselbe, ihre Reihenfolge bleibt). Die Lagen ändern sich nicht; wohin die Linie
 * danach gezogen wird (`pfadVersatz`), ist nur noch quer zu ihr.
 */
export function pfadParameter(l: Loop, L: Float64Array = l.ruhe): void {
  if (!hatPfad(l)) return;
  const { s } = pfadStellen(l, L);
  if (geschlossen(l) && s[0] !== 0) {
    const d = s[0]!;
    for (let j = 0; j < s.length; j++) s[j] = s[j]! - d;
    for (const p of l.punkte) p.s -= d;
  }
  l.s = s;
}

/**
 * Griffe der Punkte `ecken` (Index; mit dem Stift geklickt, wie in Illustrator ohne Griff) so, dass der Pfad im Blatt genau die
 * Zeichnung ist und in der Tiefe der Haut folgt (`tiefe`: Einheitsrichtung der Blickachse des Blatts, in dem gezeichnet wurde): im
 * Blatt keiner (ein gerade gezeichnetes Stück: ein Drittel der Sehne, es bleibt gerade), in der Tiefe nach kleinsten Quadraten über
 * die Stücke an ihnen (die Stelle jeder Probe aus dem Blatt). Ganz ohne Griff wäre ein Stück zwischen zwei Ecken im Raum gerade und
 * schnitte als Sehne durch die gewölbte Haut (gemessen: ein Rechteck aus vier Ecken quer über die Kugel zog die Haut bis 1,6 nach
 * innen, 32 umgeklappte Dreiecke); mit angepassten Griffen im Raum lag die Linie im Blatt bis 2,4 px neben der Zeichnung.
 */
export function eckenTiefe(l: Loop, ecken: ReadonlySet<number>, tiefe: V3, L: Float64Array = l.ruhe): void {
  if (!hatPfad(l) || ecken.size === 0) return;
  const P = l.punkte;
  const auf = (v: V3): number => v.x * tiefe.x + v.y * tiefe.y + v.z * tiefe.z;
  const flach = (v: V3): V3 => {
    const d = auf(v);
    return { x: v.x - d * tiefe.x, y: v.y - d * tiefe.y, z: v.z - d * tiefe.z };
  };
  const neu = new Map<string, V3>();
  for (const st of stuecke(l)) {
    const ea = ecken.has(st.a);
    const eb = ecken.has(st.b);
    if (!ea && !eb) continue;
    const A = P[st.a]!;
    const B = P[st.b]!;
    // im Blatt: Ist das Stück gerade gezeichnet (der Griff am anderen Ende liegt auf der Sehne), liegen die Griffe der Ecken auf der
    // Sehne (ein Drittel; das Stück bleibt gerade, läuft aber gleichmäßig, sonst kann es der Wölbung in der Tiefe nicht folgen: an
    // einer Ecke beulte es aus, 20 umgeklappte Dreiecke). Sonst haben die Ecken im Blatt keinen Griff, die anderen bleiben, wie sie sind.
    const sehne = flach({ x: B.ref.x - A.ref.x, y: B.ref.y - A.ref.y, z: B.ref.z - A.ref.z });
    const ls = abstand(sehne, NULL);
    const aufSehne = (v: V3): boolean => {
      const w = flach(v);
      const lw = abstand(w, NULL);
      const k = { x: w.y * sehne.z - w.z * sehne.y, y: w.z * sehne.x - w.x * sehne.z, z: w.x * sehne.y - w.y * sehne.x };
      return lw < 1e-9 || abstand(k, NULL) <= 1e-3 * lw * ls;
    };
    const gerade = ls > 1e-9 && (ea || aufSehne(A.aus!)) && (eb || aufSehne(B.ein!));
    const drittel = (f: number): V3 => (gerade ? { x: (f * sehne.x) / 3, y: (f * sehne.y) / 3, z: (f * sehne.z) / 3 } : { ...NULL });
    const a0 = ea ? drittel(1) : A.aus!;
    const b0 = eb ? drittel(-1) : B.ein!;
    let s11 = 0;
    let s12 = 0;
    let s22 = 0;
    let r1 = 0;
    let r2 = 0;
    for (const x of probenIn(l, st)) {
      const q = lage(L, x.j);
      // Stelle im Blatt (Tiefe weg), dann der Rest der Tiefe bei Griffen ohne Tiefe
      const t = stueckNaechstes(flach(A.ref), flach(a0), flach(b0), flach(B.ref), flach(q), x.t);
      const r = auf(q) - auf(stueckPunkt(A.ref, a0, b0, B.ref, t));
      const u = 1 - t;
      const w1 = ea ? 3 * u * u * t : 0;
      const w2 = eb ? 3 * u * t * t : 0;
      s11 += w1 * w1;
      s12 += w1 * w2;
      s22 += w2 * w2;
      r1 += w1 * r;
      r2 += w2 * r;
    }
    let al = 0;
    let be = 0;
    const det = s11 * s22 - s12 * s12;
    if (ea && eb && Math.abs(det) > 1e-12 * Math.max(1e-30, s11 * s22)) {
      al = (s22 * r1 - s12 * r2) / det;
      be = (s11 * r2 - s12 * r1) / det;
    } else if (ea && s11 > 1e-12) al = r1 / s11;
    else if (eb && s22 > 1e-12) be = r2 / s22;
    if (ea) neu.set(`${st.a}:aus`, { x: a0.x + al * tiefe.x, y: a0.y + al * tiefe.y, z: a0.z + al * tiefe.z });
    if (eb) neu.set(`${st.b}:ein`, { x: b0.x + be * tiefe.x, y: b0.y + be * tiefe.y, z: b0.z + be * tiefe.z });
  }
  for (const [k, g] of neu) {
    const [i, seite] = k.split(':') as [string, 'ein' | 'aus'];
    P[Number(i)]![seite] = g;
  }
  griffeSpiegeln(l);
}

/** Ein gezeichnetes Stück im Blatt (uv wie `blickUV`): Anfang, die zwei inneren Kontrollpunkte, Ende */
export type ZeichnungsStueck = readonly [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]];

/**
 * Griffe eines mit dem Stift gezeichneten Loops genau aus der Zeichnung (Florian, 08.11.: „Die Form soll exakt wie eingezeichnet direkt
 * auf der Haut liegen, ohne diese zu verändern“). `zeichnung`: die geschlossene Kurve im Blatt `a`, je Stück von Anker zu Anker.
 * Kreuzungen mit anderen Loops teilen die gezeichneten Stücke: Jeder Punkt bekommt seine Stelle auf der Zeichnung, und jedes Stück des
 * Pfads ist im Blatt genau das Stück der Zeichnung zwischen seinen Punkten (de Casteljau). Vorher behielten die Anker den Griff des
 * ganzen gezeichneten Stücks, und die Kreuzungen bekamen abgelesene Griffe: Ein Kreis über zwei Linien wurde ein welliges Achteck (bis
 * 3,6 Einheiten neben der Zeichnung), und die Haut folgte ihm (bis 2,4). In der Tiefe liegt jeder Griff zuerst in der Tangentialebene
 * der Haut an seinem Punkt, dann wird er nach kleinsten Quadraten an die Linie auf der Haut angepasst; Ecken (geklickte Anker, im Blatt
 * ohne Griff) ebenso. Die Enden eines Rings behalten ihre Griffe (senkrecht zur Mittelebene, aus `griffeAnlegen`). Passen die Punkte
 * nicht zur Zeichnung (ein Anker lag nicht auf dem Körper), bleibt der Loop, wie er ist: false.
 */
export function griffeAusZeichnung(h: Haut, l: Loop, a: Ansicht, zeichnung: readonly ZeichnungsStueck[], L: Float64Array = l.ruhe): boolean {
  const K = zeichnung.length;
  const P = l.punkte;
  if (K < 2 || !hatPfad(l)) return false;
  const v3 = (q: readonly [number, number]): V3 => ({ x: q[0], y: q[1], z: 0 });
  // Ein Loop, der in Front oder Top auf der Seite z < 0 gezeichnet wurde, liegt als sein Spiegelbild: dann die Zeichnung spiegeln
  const gespiegeltUV = (q: readonly [number, number]): [number, number] => (a === 'front' ? [-q[0], q[1]] : a === 'top' ? [q[0], -q[1]] : [q[0], q[1]]);
  const uv = P.map((p) => blickUV(a, p.ref));
  let abstandAnker = Infinity;
  for (let k = 0; k < K; k++) {
    const p = zeichnung[k]![0];
    const q = zeichnung[(k + 1) % K]![0];
    abstandAnker = Math.min(abstandAnker, Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  const tol = 0.01 * abstandAnker;
  // Anker → Punkt (der nächste sichtbare, näher als tol)
  const zuordnen = (sp: boolean): Map<number, number> => {
    const m = new Map<number, number>();
    for (let k = 0; k < K; k++) {
      const q = sp ? gespiegeltUV(zeichnung[k]![0]) : zeichnung[k]![0];
      let best = -1;
      let weit = tol;
      P.forEach((p, i) => {
        if (p.vonSelbst) return;
        const d = Math.hypot(uv[i]![0] - q[0], uv[i]![1] - q[1]);
        if (d < weit) {
          weit = d;
          best = i;
        }
      });
      if (best >= 0) m.set(best, k);
    }
    return m;
  };
  const ohne = zuordnen(false);
  const mit = a === 'seite' ? new Map<number, number>() : zuordnen(true);
  const spiegel = mit.size > ohne.size;
  const ankerVon = spiegel ? mit : ohne;
  if (ankerVon.size < 2) return false;
  const Z: ZeichnungsStueck[] = zeichnung.map((c) => {
    const f = (q: readonly [number, number]): [number, number] => (spiegel ? gespiegeltUV(q) : [q[0], q[1]]);
    return [f(c[0]), f(c[1]), f(c[2]), f(c[3])];
  });
  // Richtung: Folgen die Anker in der Reihenfolge der Punkte der Zeichnung vorwärts (+1) oder rückwärts (−1)?
  const zu = geschlossen(l);
  const ankerIdx = [...ankerVon.keys()].sort((x, y) => x - y);
  let r: 1 | -1 | 0 = 0;
  for (let j = 0; j + 1 < ankerIdx.length + (zu ? 1 : 0); j++) {
    const k0 = ankerVon.get(ankerIdx[j]!)!;
    const k1 = ankerVon.get(ankerIdx[(j + 1) % ankerIdx.length]!)!;
    const d: 1 | -1 | 0 = (k1 - k0 + K) % K === 1 ? 1 : (k0 - k1 + K) % K === 1 ? -1 : 0;
    if (d === 0 || (r !== 0 && d !== r)) return false;
    r = d;
  }
  if (r === 0) return false;
  // Stelle jedes Punkts auf der Zeichnung: g = Stück + t, längs der Punkte stetig (wächst mit r)
  const g = new Float64Array(P.length).fill(Number.NaN);
  const ersterAnker = ankerIdx[0]!;
  // fortlaufend ab dem ersten Anker: jeder Anker k bekommt die ganze Zahl, die seinem Vorgänger um r folgt
  {
    let gPrev = ankerVon.get(ersterAnker)!;
    g[ersterAnker] = gPrev;
    for (let j = 1; j < ankerIdx.length; j++) {
      gPrev += r;
      g[ankerIdx[j]!] = gPrev;
    }
  }
  /** Stelle von Punkt i auf Stück k der Zeichnung (nächster Punkt), zwischen tA und tB */
  const stelleAuf = (i: number, k: number, tA: number, tB: number): number => {
    const c = Z[((k % K) + K) % K]!;
    const A = v3(c[0]);
    const a1 = { x: c[1][0] - c[0][0], y: c[1][1] - c[0][1], z: 0 };
    const b1 = { x: c[2][0] - c[3][0], y: c[2][1] - c[3][1], z: 0 };
    const B = v3(c[3]);
    const q = v3(uv[i]!);
    const lo = Math.min(tA, tB);
    const hi = Math.max(tA, tB);
    let t0 = lo;
    let best = Infinity;
    for (let s = 0; s <= 32; s++) {
      const t = lo + ((hi - lo) * s) / 32;
      const d = abstand(stueckPunkt(A, a1, b1, B, t), q);
      if (d < best) {
        best = d;
        t0 = t;
      }
    }
    return Math.max(lo, Math.min(hi, stueckNaechstes(A, a1, b1, B, q, t0)));
  };
  const n = P.length;
  // Punkte zwischen zwei Ankern (bzw. vor dem ersten und hinter dem letzten eines Rings): auf dem Stück dazwischen, in Folge geordnet
  const zwischen = (von: number, bis: number, gVon: number, gBis: number): void => {
    // von, bis: Indizes der Anker (bis kann über das Ende hinaus zählen); gVon, gBis: ihre Stellen (|gBis − gVon| = 1)
    const k = Math.floor(Math.min(gVon, gBis) + 1e-9);
    let letzt = gVon;
    for (let x = von + 1; x < bis; x++) {
      const i = x % n;
      const tA = letzt - k;
      const tB = gBis - k;
      const t = stelleAuf(i, k, tA, tB);
      letzt = k + t;
      g[i] = letzt;
    }
  };
  for (let j = 0; j + 1 < ankerIdx.length; j++) zwischen(ankerIdx[j]!, ankerIdx[j + 1]!, g[ankerIdx[j]!]!, g[ankerIdx[j + 1]!]!);
  const letzterAnker = ankerIdx[ankerIdx.length - 1]!;
  if (zu) zwischen(letzterAnker, ersterAnker + n, g[letzterAnker]!, g[letzterAnker]! + r);
  else {
    // Ring: vor dem ersten Anker liegt das Stück davor, hinter dem letzten das Stück danach (ihre anderen Anker liegen auf der Seite z < 0)
    const gA = g[ersterAnker]!;
    if (ersterAnker > 0) {
      const k = Math.floor(Math.min(gA, gA - r) + 1e-9);
      let letzt = gA - r;
      for (let i = 0; i < ersterAnker; i++) {
        const t = stelleAuf(i, k, letzt - k, gA - k);
        letzt = k + t;
        g[i] = letzt;
      }
    }
    const gE = g[letzterAnker]!;
    zwischen(letzterAnker, n, gE, gE + r);
  }
  if (g.some((x) => Number.isNaN(x))) return false;
  // Griffe im Blatt je Stück des Pfads (de Casteljau auf dem Stück der Zeichnung), dann in die Fläche gehoben
  const nor = hautNormalen(h);
  const normaleBei = (i: number): V3 => {
    let j = 0;
    for (let x = 1; x < l.s.length; x++) if (Math.abs(l.s[x]! - P[i]!.s) < Math.abs(l.s[j]! - P[i]!.s)) j = x;
    const pr = l.proben[j]!;
    const v = { x: 0, y: 0, z: 0 };
    for (let e = 0; e < 3; e++) {
      const w = pr.b[e]!;
      v.x += w * nor[3 * pr.ecken[e]!]!;
      v.y += w * nor[3 * pr.ecken[e]! + 1]!;
      v.z += w * nor[3 * pr.ecken[e]! + 2]!;
    }
    const lv = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / lv, y: v.y / lv, z: v.z / lv };
  };
  const tiefe = ausUV(a, 0, 0, 1);
  const heben = (i: number, d: V3): V3 => {
    const w = ausUV(a, d.x, d.y, 0);
    const nn = normaleBei(i);
    const nt = nn.x * tiefe.x + nn.y * tiefe.y + nn.z * tiefe.z;
    const nw = nn.x * w.x + nn.y * w.y + nn.z * w.z;
    const lw = Math.hypot(w.x, w.y, w.z);
    const k = Math.abs(nt) > 1e-6 ? Math.max(-lw, Math.min(lw, -nw / nt)) : 0;
    return { x: w.x + k * tiefe.x, y: w.y + k * tiefe.y, z: w.z + k * tiefe.z };
  };
  /** Kontrollpunkte von Stück k der Zeichnung auf [u0, u1] */
  const teil = (k: number, u0: number, u1: number): { A: V3; a: V3; b: V3; B: V3 } => {
    const c = Z[((k % K) + K) % K]!;
    let A = v3(c[0]);
    let a1: V3 = { x: c[1][0] - c[0][0], y: c[1][1] - c[0][1], z: 0 };
    let b1: V3 = { x: c[2][0] - c[3][0], y: c[2][1] - c[3][1], z: 0 };
    let B = v3(c[3]);
    if (u1 < 1 - 1e-12) {
      const s = stueckTeilen(A, a1, b1, B, u1);
      a1 = s.a1;
      b1 = s.ein;
      B = s.F;
    }
    if (u0 > 1e-12) {
      const s = stueckTeilen(A, a1, b1, B, u1 > 1e-12 ? u0 / u1 : 0);
      A = s.F;
      a1 = s.aus;
      b1 = s.b2;
    }
    return { A, a: a1, b: b1, B };
  };
  // Griffe im Blatt je Stück des Pfads (uv, Tiefe 0); die Enden eines Rings behalten ihre (aus `griffeAnlegen`)
  const ein: (V3 | null)[] = P.map(() => null);
  const aus: (V3 | null)[] = P.map(() => null);
  const liste: { i: number; j: number; gerade: boolean }[] = [];
  // gerade gezeichnet: die Kontrollpunkte des Stücks der Zeichnung auf einer Geraden (zwei Ecken, oder Griffe längs der Sehne)
  const geradeGezeichnet = (k: number): boolean => {
    const c = Z[((k % K) + K) % K]!;
    const sx = c[3][0] - c[0][0];
    const sy = c[3][1] - c[0][1];
    const s2 = sx * sx + sy * sy;
    const quer = (q: readonly [number, number]) => Math.abs((q[0] - c[0][0]) * sy - (q[1] - c[0][1]) * sx);
    return s2 > 1e-18 && quer(c[1]) <= 1e-6 * s2 && quer(c[2]) <= 1e-6 * s2;
  };
  const stuecke = zu ? n : n - 1;
  for (let x = 0; x < stuecke; x++) {
    const i = x;
    const j = (x + 1) % n;
    const gi = g[i]!;
    // geschlossen: über den ersten Anker hinweg springt die Zählung um eine Runde (K Stücke) zurück
    const gj = g[j]! + K * Math.round((gi - g[j]!) / K);
    const lo = Math.min(gi, gj);
    const hi = Math.max(gi, gj);
    if (hi - lo > 1 + 1e-6 || hi - lo < 1e-9) return false;
    const k = Math.floor(lo + 1e-9);
    const s = teil(k, lo - k, Math.min(1, hi - k));
    // in der Richtung der Punkte: vorwärts beginnt das Stück bei i mit a, rückwärts mit b
    const [ai, bj] = gi <= gj ? [s.a, s.b] : [s.b, s.a];
    aus[i] = ai;
    ein[j] = bj;
    liste.push({ i, j, gerade: geradeGezeichnet(k) });
  }
  const imBlatt = (v: V3): V3 => {
    const q = blickUV(a, v);
    return { x: q[0], y: q[1], z: 0 };
  };
  P.forEach((p, i) => {
    if (!p.vonSelbst) return;
    ein[i] = p.ein ? imBlatt(p.ein) : null;
    aus[i] = p.aus ? imBlatt(p.aus) : null;
  });
  const lang = (v: V3 | null | undefined): number => (v ? Math.hypot(v.x, v.y) : 0);
  // geklickte Anker: im Blatt ohne Griffe (die Zeichnung hat dort keinen) → Ecken. Ein gerade gezeichnetes Stück bekommt an seinen
  // Ecken ein Drittel der Sehne (es bleibt gerade, läuft aber gleichmäßig, wie in `eckenTiefe`; ob es gerade ist, sagt die Zeichnung:
  // eine Kreuzung darauf sitzt auf der alten Linie, bis 0,09 neben der Geraden); sonst bleibt der Griff im Blatt null und wirkt nur in
  // der Tiefe (`krumm`, danach angepasst)
  const ecken = new Set<number>();
  for (const i of ankerVon.keys()) if (lang(ein[i]) < 1e-9 && lang(aus[i]) < 1e-9) ecken.add(i);
  const krumm = new Set<string>();
  for (const { i, j, gerade } of liste) {
    if (!ecken.has(i) && !ecken.has(j)) continue;
    const A = imBlatt(P[i]!.ref);
    const B = imBlatt(P[j]!.ref);
    const sx = B.x - A.x;
    const sy = B.y - A.y;
    if (!gerade || Math.hypot(sx, sy) < 1e-9) {
      if (ecken.has(i)) krumm.add(`${i}:aus`);
      if (ecken.has(j)) krumm.add(`${j}:ein`);
      continue;
    }
    if (ecken.has(i)) aus[i] = { x: sx / 3, y: sy / 3, z: 0 };
    if (ecken.has(j)) ein[j] = { x: -sx / 3, y: -sy / 3, z: 0 };
  }
  // Tiefe der Griffe nach kleinsten Quadraten: Jedes Stück soll den Proben der Linie folgen (sie liegen auf der Haut, wie gezeichnet).
  // Eine Unbekannte je glattem Anker (Tiefe von aus; ein = −λ · aus, beide im Blatt auf einer Geraden), an Kreuzungen und Ecken je Seite
  // eine (die alte Linie hat die Haut an einer Kreuzung oft zu einem Grat gezogen, die neue knickt dann nur in der Tiefe mit); die Enden
  // eines Rings bleiben, wie sie sind. Gemessen (Kreis über zwei Ringe): in die Tangentialebene gehoben lag die Linie bis 0,88 neben dem
  // Pfad, angepasst mit glatten Kreuzungen 0,59, je Seite 0,17; so weit folgt die Haut. An einem Quadrat ließen die Ecken 0,54, solange
  // hier mit Griff null statt einem Drittel der Sehne angepasst wurde.
  type Tiefe = { u: number; f: number } | null;
  const tAus: Tiefe[] = P.map(() => null);
  const tEin: Tiefe[] = P.map(() => null);
  const start: number[] = [];
  const spanne: number[] = [];
  P.forEach((p, i) => {
    if (p.vonSelbst) return;
    const le = lang(ein[i]);
    const lo = lang(aus[i]);
    const anfang = (v: V3 | null | undefined) => (v && lang(v) > 1e-9 ? blickTiefe(a, heben(i, v)) : 0);
    const ecke = ecken.has(i);
    if (!ecke && le > 1e-9 && lo > 1e-9 && p.kreuzung === undefined) {
      tAus[i] = { u: start.length, f: 1 };
      tEin[i] = { u: start.length, f: -le / lo };
      start.push(anfang(aus[i]));
      spanne.push(2 * lo);
      return;
    }
    // ein Griff einer Ecke, der im Blatt null ist (gebogenes Stück), bekommt seine Tiefe danach (unten)
    if (aus[i] && lo > 1e-9) {
      tAus[i] = { u: start.length, f: 1 };
      start.push(anfang(aus[i]));
      spanne.push(2 * lo);
    }
    if (ein[i] && le > 1e-9) {
      tEin[i] = { u: start.length, f: 1 };
      start.push(anfang(ein[i]));
      spanne.push(2 * le);
    }
  });
  const m = start.length;
  const loes = Float64Array.from(start);
  if (m > 0) {
    const N = new Float64Array(m * m);
    const rhs = new Float64Array(m);
    const festeTiefe = (i: number, seite: 'ein' | 'aus'): number => {
      const v = P[i]![seite];
      return P[i]!.vonSelbst && v ? blickTiefe(a, v) : 0;
    };
    for (const { i, j } of liste) {
      const A = P[i]!;
      const B = P[j]!;
      const Ai = imBlatt(A.ref);
      const Bj = imBlatt(B.ref);
      const ai = aus[i] ?? NULL;
      const bj = ein[j] ?? NULL;
      const Di = blickTiefe(a, A.ref);
      const Dj = blickTiefe(a, B.ref);
      const ti = tAus[i] ?? null;
      const tj = tEin[j] ?? null;
      const hi0 = ti ? 0 : festeTiefe(i, 'aus');
      const hj0 = tj ? 0 : festeTiefe(j, 'ein');
      const st = { s0: A.s, s1: B.s > A.s ? B.s : B.s + l.laenge };
      for (const x of probenIn(l, st)) {
        const q = lage(L, x.j);
        const t = stueckNaechstes(Ai, ai, bj, Bj, imBlatt(q), x.t);
        const [b0, b1, b2, b3] = bernstein(t);
        const r0 = blickTiefe(a, q) - (b0 + b1) * Di - (b2 + b3) * Dj - b1 * hi0 - b2 * hj0;
        const terme: [number, number][] = [];
        if (ti) terme.push([ti.u, b1 * ti.f]);
        if (tj) terme.push([tj.u, b2 * tj.f]);
        for (const [u, cu] of terme) {
          rhs[u] = rhs[u]! + cu * r0;
          for (const [v, cv] of terme) N[u * m + v] = N[u * m + v]! + cu * cv;
        }
      }
    }
    // schwach zur Tangentialebene (ein Stück ohne Proben bleibt dort)
    for (let u = 0; u < m; u++) {
      N[u * m + u] = N[u * m + u]! + 1e-2;
      rhs[u] = rhs[u]! + 1e-2 * start[u]!;
    }
    const x = loesenDicht(N, rhs, m);
    if (x) for (let u = 0; u < m; u++) loes[u] = Math.max(-spanne[u]!, Math.min(spanne[u]!, x[u]!));
  }
  const griff = (v: V3, d: number): V3 => ausUV(a, v.x, v.y, d);
  P.forEach((p, i) => {
    if (p.vonSelbst) return;
    if (ecken.has(i)) p.ecke = true;
    else if (ankerVon.has(i)) delete p.ecke;
    const e = ein[i];
    const o = aus[i];
    const te = tEin[i];
    const to = tAus[i];
    if (e) p.ein = griff(e, te ? te.f * loes[te.u]! : 0);
    if (o) p.aus = griff(o, to ? to.f * loes[to.u]! : 0);
  });
  // Ecken an gebogenen Stücken: ihr Griff (im Blatt null) bekommt danach seine Tiefe, je Stück nach kleinsten Quadraten bei festen
  // anderen Griffen (wie `eckenTiefe`; zusammen mit den anderen angepasst bekam die Augen-Form der Stift-Probe 4 umgeklappte Dreiecke)
  for (const { i, j } of liste) {
    const ka = krumm.has(`${i}:aus`);
    const kb = krumm.has(`${j}:ein`);
    if (!ka && !kb) continue;
    const A = P[i]!;
    const B = P[j]!;
    const a0 = A.aus!;
    const b0 = B.ein!;
    let s11 = 0;
    let s12 = 0;
    let s22 = 0;
    let r1 = 0;
    let r2 = 0;
    for (const x of probenIn(l, { s0: A.s, s1: B.s > A.s ? B.s : B.s + l.laenge })) {
      const q = lage(L, x.j);
      const t = stueckNaechstes(imBlatt(A.ref), imBlatt(a0), imBlatt(b0), imBlatt(B.ref), imBlatt(q), x.t);
      const r = blickTiefe(a, q) - blickTiefe(a, stueckPunkt(A.ref, a0, b0, B.ref, t));
      const [, w1a, w2b] = bernstein(t);
      const w1 = ka ? w1a : 0;
      const w2 = kb ? w2b : 0;
      s11 += w1 * w1;
      s12 += w1 * w2;
      s22 += w2 * w2;
      r1 += w1 * r;
      r2 += w2 * r;
    }
    let al = 0;
    let be = 0;
    const det = s11 * s22 - s12 * s12;
    if (ka && kb && Math.abs(det) > 1e-12 * Math.max(1e-30, s11 * s22)) {
      al = (s22 * r1 - s12 * r2) / det;
      be = (s11 * r2 - s12 * r1) / det;
    } else if (ka && s11 > 1e-12) al = r1 / s11;
    else if (kb && s22 > 1e-12) be = r2 / s22;
    if (ka) A.aus = { x: a0.x + al * tiefe.x, y: a0.y + al * tiefe.y, z: a0.z + al * tiefe.z };
    if (kb) B.ein = { x: b0.x + be * tiefe.x, y: b0.y + be * tiefe.y, z: b0.z + be * tiefe.z };
  }
  griffeSpiegeln(l);
  return true;
}

/** Kleines dichtes System N x = b (Gauß mit Spaltenwahl); null, wenn es entartet ist */
function loesenDicht(N: Float64Array, b: Float64Array, m: number): Float64Array | null {
  const A = Float64Array.from(N);
  const x = Float64Array.from(b);
  for (let k = 0; k < m; k++) {
    let p = k;
    for (let r = k + 1; r < m; r++) if (Math.abs(A[r * m + k]!) > Math.abs(A[p * m + k]!)) p = r;
    if (Math.abs(A[p * m + k]!) < 1e-14) return null;
    if (p !== k) {
      for (let c = 0; c < m; c++) {
        const h = A[k * m + c]!;
        A[k * m + c] = A[p * m + c]!;
        A[p * m + c] = h;
      }
      const h = x[k]!;
      x[k] = x[p]!;
      x[p] = h;
    }
    for (let r = k + 1; r < m; r++) {
      const f = A[r * m + k]! / A[k * m + k]!;
      if (f === 0) continue;
      for (let c = k; c < m; c++) A[r * m + c] = A[r * m + c]! - f * A[k * m + c]!;
      x[r] = x[r]! - f * x[k]!;
    }
  }
  for (let k = m - 1; k >= 0; k--) {
    let s = x[k]!;
    for (let c = k + 1; c < m; c++) s -= A[k * m + c]! * x[c]!;
    x[k] = s / A[k * m + k]!;
  }
  return x;
}

/** Mittelebene: Griffe flach; Ende eines Rings: der Griff nach außen ist das Spiegelbild des inneren */
function griffeSpiegeln(l: Loop): void {
  l.punkte.forEach((p, i) => {
    if (!p.ein || !p.aus) return;
    if (l.art === 'mitte') {
      p.ein = { ...p.ein, z: 0 };
      p.aus = { ...p.aus, z: 0 };
    }
    const rand = ringEnde(l, i);
    if (rand === 'anfang') p.ein = gespiegelt(p.aus);
    if (rand === 'ende') p.aus = gespiegelt(p.ein);
  });
}

const einheit = (v: V3): V3 | null => {
  const n = Math.hypot(v.x, v.y, v.z);
  return n > 1e-9 ? { x: v.x / n, y: v.y / n, z: v.z / n } : null;
};

/**
 * Griffe der Punkte `neu` (Index; null: alle) aus dem Verlauf der Linie (`L`, 3 je Probe): je Stück an einem dieser Punkte das
 * kubische Bézier-Stück durch seine Proben nach kleinsten Quadraten (bei t aus ihrer Stelle s, die Enden fest), an einem glatten
 * Punkt beide Griffe auf einer Geraden (Winkelhalbierende), danach die Längen mit diesen Richtungen neu angepasst. Die Griffe der
 * anderen Punkte behalten ihre Richtung (an den Stücken zu einem neuen Punkt passt sich nur ihre Länge an, wie beim Teilen in
 * Illustrator). Die Linie ändert sich nicht.
 */
function griffeAusLinie(l: Loop, L: Float64Array, neu: ReadonlySet<number> | null, opt: { t?: Float64Array; genau?: boolean } = {}): void {
  const P = l.punkte;
  if (P.length === 0) return;
  const ist = (i: number) => neu === null || neu.has(i);
  const ein: V3[] = P.map((p) => p.ein ?? { ...NULL });
  const aus: V3[] = P.map((p) => p.aus ?? { ...NULL });
  // t je Probe: aus ihrer Stelle s, oder (genau) die Stelle des nächsten Punkts auf dem Stück der vorigen Anpassung
  const tVon = (x: { j: number; t: number }) => (opt.t && !Number.isNaN(opt.t[x.j]!) ? opt.t[x.j]! : x.t);
  const passen = (st: { a: number; b: number; s0: number; s1: number }, r?: readonly [V3 | null, V3 | null]) => {
    const pr = probenIn(l, st);
    return stueckAnpassen(
      P[st.a]!.ref,
      P[st.b]!.ref,
      pr.map(tVon),
      pr.map((x) => lage(L, x.j)),
      r,
    );
  };
  const S = stuecke(l).filter((st) => ist(st.a) || ist(st.b));
  // frei: nur für die neuen Punkte (die anderen behalten ihre Richtung)
  for (const st of S) {
    const g = passen(st);
    if (ist(st.a)) aus[st.a] = g.a;
    if (ist(st.b)) ein[st.b] = g.b;
  }
  const rEin: (V3 | null)[] = ein.map(einheit);
  const rAus: (V3 | null)[] = aus.map(einheit);
  // neue glatte Punkte: beide Griffe auf einer Geraden (am Spiegelpunkt senkrecht zur Mittelebene; gemessen an der Kugel: abgelesen
  // aus der Kette im Netz steht er 2,7° schräg). Ecken (von Hand oder von selbst an einer Kante) wie abgelesen. Eine Ecke, wo die
  // Linie knickt, entsteht nicht von selbst (gemessen: an einer weit gezogenen Rüsselspitze wurden so Punkte zu Ecken, über die die
  // Haut keine Krümmung mehr trägt, 30 statt 6 Knicke über 60°).
  P.forEach((p, i) => {
    // ein Ende von selbst hält nur die Griffe, wie die Linie sie zeigt (es bewegt sich nicht); liegt die Linie genau auf dem Pfad,
    // läuft sie dort rund in ihre Spiegelhälfte (senkrecht zur Mittelebene; sonst bekäme die Haut an der Mittelebene einen Grat)
    if (!ist(i) || (p.vonSelbst && !opt.genau) || istEcke(p)) return;
    const rand = ringEnde(l, i);
    // am Spiegelpunkt ist der Griff nach außen das Spiegelbild des inneren
    const a = rand === 'ende' && rEin[i] ? gespiegelt(rEin[i]!) : rAus[i];
    const e = rand === 'anfang' && rAus[i] ? gespiegelt(rAus[i]!) : rEin[i];
    if (!e || !a) return;
    const u = rand ? { x: 0, y: 0, z: rand === 'anfang' ? 1 : -1 } : einheit({ x: a.x - e.x, y: a.y - e.y, z: a.z - e.z });
    if (!u) return;
    rAus[i] = u;
    rEin[i] = { x: -u.x, y: -u.y, z: -u.z };
  });
  for (const st of S) {
    const u = rAus[st.a];
    const w = rEin[st.b];
    const g = passen(st, u && w ? [u, w] : undefined);
    aus[st.a] = g.a;
    ein[st.b] = g.b;
  }
  P.forEach((p, i) => {
    p.ein = ein[i]!;
    p.aus = aus[i]!;
  });
  griffeSpiegeln(l);
}

/**
 * Griffe aller Punkte aus dem Verlauf der Linie (`L`, 3 je Probe), wenn der Loop entsteht (oder in eine Pose kommt); von da an
 * speichert er sie. Ein Ring bekommt an seinen Enden Punkte (Spiegelpunkte), falls dort keine sind; wie vorher bleiben sie dort
 * stehen, solange man sie nicht zieht. Die Linie ändert sich nicht.
 *
 * `genau` (die Linie wird danach genau ihr Pfad, 07.11.): Die Punkte bleiben, wo sie sind (an einer Kreuzung liegen sie schon auf dem
 * Pfad des anderen Loops); jedes Stück wird nach dem nächsten Punkt angepasst statt nach gleicher Bogenlänge (drei Runden wie bei
 * Schneider: anpassen, jede Probe auf ihr Stück projizieren, neu anpassen), und jede Probe bekommt ihre Stelle auf dem Pfad
 * (`pfadParameter`), damit sie beim Anlegen nur quer zur Linie springen. `punkteBis` (> 0, nur zum Vergleich): Punkte wo nötig.
 */
export function griffeAnlegen(l: Loop, L: Float64Array = l.ruhe, genau = false, punkteBis = 0): void {
  const n = l.proben.length;
  if (l.art === 'ring' && n > 1) {
    const ende = (j: number): V3 => ({ ...lage(L, j), z: 0 });
    if (!l.punkte.some((p) => p.s <= 1e-6)) {
      const q = ende(0);
      l.punkte.unshift({ s: 0, ref: q, cur: { ...q }, vonSelbst: true });
    }
    if (!l.punkte.some((p) => p.s >= l.laenge - 1e-6)) {
      const q = ende(n - 1);
      l.punkte.push({ s: l.laenge, ref: q, cur: { ...q }, vonSelbst: true });
    }
  }
  l.punkte.forEach((p, i) => {
    const q = genau ? { ...p.ref } : stelleBei(l, L, p.s);
    if (l.art === 'mitte' || ringEnde(l, i)) q.z = 0;
    p.ref = q;
    p.cur = { ...q };
  });
  l.pfad = true;
  for (const p of l.punkte) {
    delete p.ein;
    delete p.aus;
  }
  griffeAusLinie(l, L, null, { genau });
  if (!genau || !hatPfad(l)) return;
  const anpassen = () => {
    for (let runde = 0; runde < 3; runde++) griffeAusLinie(l, L, null, { genau, t: pfadStellen(l, L).t });
  };
  anpassen();
  // Punkte wo nötig (Vergleich zu Florians Wahl „ohne Zusatzpunkte“): Liegt die Linie weiter als `punkteBis` neben ihrem Pfad, kommt in
  // die Mitte dieses Stücks ein Punkt (auf der Linie), und alles wird neu angepasst
  for (let k = 0; punkteBis > 0 && k < 12; k++) {
    if (!hatPfad(l)) break;
    const { t } = pfadStellen(l, L);
    let fern = -1;
    let weit = punkteBis;
    for (const st of stuecke(l)) {
      const A = l.punkte[st.a]!;
      const B = l.punkte[st.b]!;
      for (const x of probenIn(l, st)) {
        const q = stueckPunkt(A.ref, A.aus!, B.ein!, B.ref, t[x.j]!);
        const d = abstand(q, lage(L, x.j));
        if (d > weit) {
          weit = d;
          fern = x.j;
        }
      }
    }
    if (fern < 0) break;
    const st = stuecke(l).find((x) => imStueck(l, x, l.s[fern]!) !== null)!;
    const s = ((st.s0 + st.s1) / 2) % l.laenge;
    const q = stelleBei(l, L, s);
    if (l.art === 'mitte') q.z = 0;
    l.punkte.push({ s, ref: q, cur: { ...q } });
    l.punkte.sort((a, b) => a.s - b.s);
    for (const p of l.punkte) {
      delete p.ein;
      delete p.aus;
    }
    griffeAusLinie(l, L, null, { genau });
    anpassen();
  }
  pfadParameter(l, L);
}

/** Griffe nur für die Punkte `punkte` (Index) aus der Linie, die anderen behalten ihre (Richtung); danach speichert der Loop sie */
export function griffeErgaenzen(l: Loop, L: Float64Array, punkte: ReadonlySet<number>): void {
  l.pfad = true;
  griffeAusLinie(l, L, punkte);
}

/** Runden, in denen sich Ecken von selbst nebeneinander abstimmen (je Runde schrumpft der Rest auf ein Viertel) */
const NATUR_RUNDEN = 12;

/**
 * Nachbar von Punkt i auf der Seite k (−1 davor, +1 dahinter): sein Index, und ob er gespiegelt ist (hinter dem Ende eines Rings
 * liegt das Spiegelbild des inneren Nachbarn); null, wenn es keinen gibt.
 */
function nachbar(l: Loop, i: number, k: -1 | 1): { j: number; gespiegelt: boolean } | null {
  const m = l.punkte.length;
  if (geschlossen(l)) return m > 1 ? { j: (i + k + m) % m, gespiegelt: false } : null;
  const j = i + k;
  if (j >= 0 && j < m) return { j, gespiegelt: false };
  return ringEnde(l, i) && i - k >= 0 && i - k < m ? { j: i - k, gespiegelt: true } : null;
}

/** Der Griff des Nachbarn n, der zu Punkt i zeigt (vom Nachbarn davor sein `aus`, vom Nachbarn danach sein `ein`) */
const zuIhm = (ein: readonly V3[], aus: readonly V3[], n: { j: number; gespiegelt: boolean }, k: -1 | 1): V3 =>
  n.gespiegelt ? gespiegelt(k < 0 ? ein[n.j]! : aus[n.j]!) : k < 0 ? aus[n.j]! : ein[n.j]!;

/**
 * Versatz der Griffe je Punkt in einem Zug, in dem sich die Punkte um `D` verschieben und die Griffe um `griffe` (wo gegeben). Die
 * Griffe gehen mit ihrem Punkt (Versatz null). Eine Ecke von selbst (Kreuzung mit einer Kante) folgt ihren Nachbarn so, dass jede
 * Seite rund bleibt: Ihr Griff verschiebt sich um die Hälfte dessen, was Nachbarpunkt und dessen Griff zu ihr hin sich gegen sie
 * verschieben — das natürliche Ende, wie es `kantenKnicken` setzt (das Stück hat am Knick keine Krümmung). So knickt die Linie
 * gleich, ob die Kante vor oder nach dem Zug kam (vorher: erst K, dann die Unterseite des Pilzes hoch 81°, umgekehrt 92°). Zwei
 * solche Ecken nebeneinander hängen voneinander ab: einige Runden.
 */
export function griffVersatzImZug(l: Loop, D: readonly V3[], griffe?: readonly (GriffVersatz | undefined)[]): { ein: V3; aus: V3 }[] {
  const m = l.punkte.length;
  const ein = l.punkte.map((_, i) => griffe?.[i]?.ein ?? NULL);
  const aus = l.punkte.map((_, i) => griffe?.[i]?.aus ?? NULL);
  const frei = l.punkte.map((p, i) => hatGriffe(l) && istEckeVonSelbst(p) && !griffe?.[i]);
  if (frei.includes(true)) {
    // die Mitte und die Enden eines Rings bleiben auf der Mittelebene
    const dBei = (i: number, sp: boolean): V3 => {
      const d = D[i] ?? NULL;
      const e = l.art === 'mitte' || ringEnde(l, i) ? { ...d, z: 0 } : d;
      return sp ? gespiegelt(e) : e;
    };
    for (let runde = 0; runde < NATUR_RUNDEN; runde++) {
      for (let i = 0; i < m; i++) {
        if (!frei[i]) continue;
        const di = dBei(i, false);
        for (const k of [-1, 1] as const) {
          const n = nachbar(l, i, k);
          if (!n) continue;
          const dn = dBei(n.j, n.gespiegelt);
          const h = zuIhm(ein, aus, n, k);
          const g = { x: (dn.x + h.x - di.x) / 2, y: (dn.y + h.y - di.y) / 2, z: (dn.z + h.z - di.z) / 2 };
          if (k < 0) ein[i] = g;
          else aus[i] = g;
        }
        const rand = ringEnde(l, i);
        if (rand === 'anfang') ein[i] = gespiegelt(aus[i]!);
        if (rand === 'ende') aus[i] = gespiegelt(ein[i]!);
      }
    }
  }
  return l.punkte.map((_, i) => ({ ein: ein[i]!, aus: aus[i]! }));
}

/**
 * Griffe nach einem Zug, genau wie `verschiebungLaengs` die Linie mit den Verschiebungen `D` je Punkt und dem Versatz `griffe`
 * verschoben hat (`griffVersatzImZug`). Gesetzt wird nichts (zum Zeigen während des Zugs; `griffeUebernehmen` setzt sie).
 */
export function griffeNach(l: Loop, D: readonly V3[], griffe?: readonly (GriffVersatz | undefined)[]): { ein: V3; aus: V3 }[] {
  const g = griffVersatzImZug(l, D, griffe);
  return l.punkte.map((p, i) => {
    const e = p.ein ?? NULL;
    const a = p.aus ?? NULL;
    const ge = g[i]!.ein;
    const ga = g[i]!.aus;
    let ein = { x: e.x + ge.x, y: e.y + ge.y, z: e.z + ge.z };
    let aus = { x: a.x + ga.x, y: a.y + ga.y, z: a.z + ga.z };
    if (l.art === 'mitte') {
      ein = { ...ein, z: 0 };
      aus = { ...aus, z: 0 };
    }
    const rand = ringEnde(l, i);
    if (rand === 'anfang') ein = gespiegelt(aus);
    if (rand === 'ende') aus = gespiegelt(ein);
    return { ein, aus };
  });
}

/** Nach einem Zug die Griffe setzen, die `griffeNach` ergibt */
export function griffeUebernehmen(l: Loop, D: readonly V3[], griffe?: readonly (GriffVersatz | undefined)[]): void {
  if (!hatGriffe(l)) return;
  griffeNach(l, D, griffe).forEach((g, i) => {
    l.punkte[i]!.ein = g.ein;
    l.punkte[i]!.aus = g.aus;
  });
}

/**
 * Griffe von Punkt i neu setzen (`ein`, `aus`: Vektoren vom Punkt aus; am Ende eines Rings zählt der Griff nach innen) und die
 * Verschiebung je Probe, mit der die Linie ihnen folgt: das Stück davor um 3t²(1 − t)·Δein, das danach um 3t(1 − t)²·Δaus
 * (Bernstein), die Punkte bleiben.
 */
export function griffeSetzen(l: Loop, i: number, ein: V3, aus: V3): Float64Array {
  const d = new Float64Array(3 * l.proben.length);
  const p = l.punkte[i]!;
  const de = { x: ein.x - (p.ein?.x ?? 0), y: ein.y - (p.ein?.y ?? 0), z: ein.z - (p.ein?.z ?? 0) };
  const da = { x: aus.x - (p.aus?.x ?? 0), y: aus.y - (p.aus?.y ?? 0), z: aus.z - (p.aus?.z ?? 0) };
  for (const st of stuecke(l)) {
    const vor = st.b === i;
    const nach = st.a === i;
    if (!vor && !nach) continue;
    for (const { j, t } of probenIn(l, st)) {
      // ein Punkt allein auf einem geschlossenen Loop: sein Stück läuft zu ihm zurück, beide Griffe wirken
      const w1 = nach ? 3 * t * (1 - t) * (1 - t) : 0;
      const w2 = vor ? 3 * t * t * (1 - t) : 0;
      d[3 * j] = d[3 * j]! + w1 * da.x + w2 * de.x;
      d[3 * j + 1] = d[3 * j + 1]! + w1 * da.y + w2 * de.y;
      d[3 * j + 2] = d[3 * j + 2]! + w1 * da.z + w2 * de.z;
    }
  }
  if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
  if (l.art === 'ring' && l.proben.length) {
    d[2] = 0;
    d[3 * l.proben.length - 1] = 0;
  }
  p.ein = { ...ein };
  p.aus = { ...aus };
  griffeSpiegeln(l);
  return d;
}

/**
 * Kante an oder aus (Teil A, Schritt 4; Florian: „Kante an/aus wirkt dann sofort mit Knick“, für den Knick: „dann rund“): Ein Punkt,
 * der eine Ecke von selbst geworden ist (Kreuzung mit einer Kante), bekommt neue Griffe, jede Seite so rund wie möglich — das Stück
 * zum Nachbarn hat am Knick keine Krümmung (natürliches Ende: der Griff zeigt halb zum Ende des Griffs, den der Nachbar zu ihm hin
 * hat). Die Linie knickt dort wirklich, die Haut mit ihr; wie stark, ergibt sich aus der Form. War er eine und ist es nicht mehr,
 * liegen seine Griffe wieder auf einer Geraden (glatt, die Längen bleiben). Ecken von selbst, die es schon waren, folgen ihren
 * Nachbarn wie in einem Zug (`griffVersatzImZug`). `vorher`: die Ecken von selbst vor der Änderung. Ergebnis je Loop die
 * Verschiebung seiner Linie (null: unverändert).
 *
 * Verworfen (Florians Wahl nach dem Vergleich; Knick quer über den Rand, Median): Griffe zu den Nachbarpunkten, ein Drittel der
 * Sehne wie Blenders „Vector“ (so im Plan). Eine Kugel mit Kante am Äquator bekam 71° statt 27°, ein Pilzhut wurde eine Glocke (die
 * Linie schwingt hinter der Kante zurück, der Hut weitet sich am Rand) statt einer Kuppel.
 */
export function kantenKnicken(loops: readonly Loop[], vorher: ReadonlySet<LoopPunkt>): (Float64Array | null)[] {
  return loops.map((l) => {
    if (!hatGriffe(l)) return null;
    const P = l.punkte;
    const m = P.length;
    const auto = P.map((p) => istEckeVonSelbst(p));
    const neu = P.map((p, i) => auto[i]! && !vorher.has(p));
    const weg = P.map((p, i) => !auto[i]! && vorher.has(p));
    if (!neu.includes(true) && !weg.includes(true)) return null;
    const ein0 = P.map((p) => p.ein ?? NULL);
    const aus0 = P.map((p) => p.aus ?? NULL);
    const ein = [...ein0];
    const aus = [...aus0];
    P.forEach((_, i) => {
      const g = weg[i] ? aufGerade(l, i, ein0[i]!, aus0[i]!) : null;
      if (!g) return;
      ein[i] = g.ein;
      aus[i] = g.aus;
    });
    for (let runde = 0; runde < NATUR_RUNDEN; runde++) {
      for (let i = 0; i < m; i++) {
        if (!auto[i]) continue;
        for (const k of [-1, 1] as const) {
          const n = nachbar(l, i, k);
          if (!n) continue;
          const h = zuIhm(ein, aus, n, k);
          let g: V3;
          if (neu[i]) {
            const q = n.gespiegelt ? gespiegelt(P[n.j]!.ref) : P[n.j]!.ref;
            const p = P[i]!.ref;
            g = { x: (q.x + h.x - p.x) / 2, y: (q.y + h.y - p.y) / 2, z: (q.z + h.z - p.z) / 2 };
          } else {
            const h0 = zuIhm(ein0, aus0, n, k);
            const g0 = k < 0 ? ein0[i]! : aus0[i]!;
            g = { x: g0.x + (h.x - h0.x) / 2, y: g0.y + (h.y - h0.y) / 2, z: g0.z + (h.z - h0.z) / 2 };
          }
          if (k < 0) ein[i] = g;
          else aus[i] = g;
        }
        const rand = ringEnde(l, i);
        if (rand === 'anfang') ein[i] = gespiegelt(aus[i]!);
        if (rand === 'ende') aus[i] = gespiegelt(ein[i]!);
      }
    }
    const gleich = (a: V3, b: V3): boolean => a.x === b.x && a.y === b.y && a.z === b.z;
    let d: Float64Array | null = null;
    P.forEach((_, i) => {
      if (gleich(ein[i]!, ein0[i]!) && gleich(aus[i]!, aus0[i]!)) return;
      const x = griffeSetzen(l, i, ein[i]!, aus[i]!);
      if (!d) d = x;
      else for (let k = 0; k < x.length; k++) d[k] = d[k]! + x[k]!;
    });
    return d;
  });
}

/** Griffe auf einer Geraden (Winkelhalbierende, die Längen bleiben; am Spiegelpunkt senkrecht zur Mittelebene); null ohne Griffe */
function aufGerade(l: Loop, i: number, e: V3, a: V3): { ein: V3; aus: V3 } | null {
  const le = Math.hypot(e.x, e.y, e.z);
  const la = Math.hypot(a.x, a.y, a.z);
  if (le < 1e-9 || la < 1e-9) return null;
  const rand = ringEnde(l, i);
  const u = rand
    ? { x: 0, y: 0, z: rand === 'anfang' ? 1 : -1 }
    : einheit({ x: a.x / la - e.x / le, y: a.y / la - e.y / le, z: a.z / la - e.z / le });
  if (!u) return null;
  if (l.art === 'mitte') u.z = 0;
  return { ein: { x: -u.x * le, y: -u.y * le, z: -u.z * le }, aus: { x: u.x * la, y: u.y * la, z: u.z * la } };
}

/**
 * Punkte löschen wie in Illustrator: Die Nachbarn verbinden sich über ihre eigenen Griffe; deren Richtung bleibt, ihre Längen werden
 * so angepasst, dass das neue Stück dem alten Verlauf am nächsten kommt (kleinste Quadrate über beide alten Stücke). Kreuzungen, die
 * Enden eines Rings und die letzten zwei Punkte eines geschlossenen Loops bleiben. Ergebnis: Verschiebung je Probe (3 je Probe), um
 * die die Linie dem neuen Stück folgt; null, wenn kein Punkt fiel. Ohne gespeicherte Griffe fällt der Punkt nur weg (die Linie
 * bleibt).
 */
export function punkteLoeschen(l: Loop, weg: ReadonlySet<LoopPunkt>): Float64Array | null {
  const d = new Float64Array(3 * l.proben.length);
  let irgend = false;
  for (const p of [...l.punkte]) {
    if (!weg.has(p) || p.kreuzung !== undefined) continue;
    const P = l.punkte;
    const m = P.length;
    const i = P.indexOf(p);
    if (ringEnde(l, i) || (geschlossen(l) && m <= 2)) continue;
    irgend = true;
    if (!hatGriffe(l)) {
      P.splice(i, 1);
      continue;
    }
    const S = stuecke(l);
    const s1 = S.find((st) => st.b === i)!;
    const s2 = S.find((st) => st.a === i)!;
    const a = P[s1.a]!;
    const b = P[s2.b]!;
    // Stellen fortlaufend: s0 < s1 < s2 (geschlossen über das Ende hinaus)
    const sa = s1.s0;
    const sp = s1.s1;
    const sb = s2.s0 < sp - 1e-9 ? s2.s1 + l.laenge : s2.s1 + (sp - s2.s0);
    const alt = (s: number): V3 =>
      s <= sp
        ? stueckPunkt(a.ref, a.aus!, p.ein!, p.ref, (s - sa) / (sp - sa || 1))
        : stueckPunkt(p.ref, p.aus!, b.ein!, b.ref, (s - sp) / (sb - sp || 1));
    const t: number[] = [];
    const q: V3[] = [];
    const N = 24;
    for (let k = 1; k < 2 * N; k++) {
      const s = k <= N ? sa + ((sp - sa) * k) / N : sp + ((sb - sp) * (k - N)) / N;
      t.push((s - sa) / (sb - sa));
      q.push(alt(s));
    }
    const sehne = einheit({ x: b.ref.x - a.ref.x, y: b.ref.y - a.ref.y, z: b.ref.z - a.ref.z });
    const u = einheit(a.aus!) ?? sehne;
    const w = einheit(b.ein!) ?? (sehne ? { x: -sehne.x, y: -sehne.y, z: -sehne.z } : null);
    const g = stueckAnpassen(a.ref, b.ref, t, q, u && w ? [u, w] : undefined);
    const st = { s0: sa, s1: sb };
    for (let j = 0; j < l.proben.length; j++) {
      const x = imStueck(l, st, l.s[j]!);
      if (x === null || x <= sa + 1e-9 || x >= sb - 1e-9) continue;
      const vorher = alt(x);
      const neu = stueckPunkt(a.ref, g.a, g.b, b.ref, (x - sa) / (sb - sa));
      d[3 * j] = d[3 * j]! + neu.x - vorher.x;
      d[3 * j + 1] = d[3 * j + 1]! + neu.y - vorher.y;
      d[3 * j + 2] = d[3 * j + 2]! + neu.z - vorher.z;
    }
    a.aus = g.a;
    b.ein = g.b;
    P.splice(i, 1);
    griffeSpiegeln(l);
  }
  if (!irgend) return null;
  if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
  if (l.art === 'ring' && l.proben.length) {
    d[2] = 0;
    d[3 * l.proben.length - 1] = 0;
  }
  return d;
}

/**
 * Bézier-Griffe eines Punkts (Vektoren vom Punkt aus), wie er sie speichert. Am Ende eines Rings (Spiegelpunkt, auf der Mittelebene)
 * läuft die Linie in ihre Spiegelhälfte weiter: Der Griff dorthin ist das Spiegelbild des Griffs nach innen. Ohne angelegte Griffe
 * (der Loop entsteht gerade) null.
 */
export function griffeBei(l: Loop, i: number): { ein: V3 | null; aus: V3 | null } {
  const p = l.punkte[i]!;
  if (!p.ein || !p.aus) return { ein: null, aus: null };
  const rand = ringEnde(l, i);
  if (rand === 'anfang') return { ein: gespiegelt(p.aus), aus: { ...p.aus } };
  if (rand === 'ende') return { ein: { ...p.ein }, aus: gespiegelt(p.ein) };
  return { ein: { ...p.ein }, aus: { ...p.aus } };
}

/**
 * Griff `seite` des Punkts i um δ (Welt) ziehen; Ergebnis: Versatz beider Griffe gegen ihre Lage jetzt. Glatt: der
 * andere Griff bleibt gegenüber (dreht mit, behält seine Länge); Ecke: nur dieser. In der Mittelebene bleibt z = 0. Am Ende eines
 * Rings (Spiegelpunkt) ist der Griff frei, sein Spiegelbild geht mit (beide Griffe dort sind ziehbar): Schräg zur Mittelebene
 * knickt die Linie spiegelgleich, eine Ecke; glatt ist sie dort nur mit dem Griff senkrecht zur Mittelebene. Der Griff nach innen
 * bleibt auf seiner Seite der Mittelebene (sonst liefe die Linie durch ihr Spiegelbild).
 */
export function griffZiehen(l: Loop, i: number, seite: 'ein' | 'aus', delta: V3): GriffVersatz {
  const p = l.punkte[i]!;
  const ecke = istEcke(p);
  const g = griffeBei(l, i);
  const alt = g[seite];
  if (!alt) return {};
  const d = { ...delta };
  if (l.art === 'mitte') d.z = 0;
  const rand = ringEnde(l, i);
  if (rand) {
    // innen: der Griff, der in die gespeicherte Hälfte zeigt (am Anfang „aus“, am Ende „ein“)
    const innen = rand === 'anfang' ? 'aus' : 'ein';
    const di = seite === innen ? d : gespiegelt(d);
    const gi = g[innen]!;
    di.z = Math.max(di.z, -gi.z);
    return innen === 'aus' ? { aus: di, ein: gespiegelt(di) } : { ein: di, aus: gespiegelt(di) };
  }
  const out: GriffVersatz = seite === 'ein' ? { ein: d } : { aus: d };
  const andere = seite === 'ein' ? 'aus' : 'ein';
  const ga = g[andere];
  if (ecke || !ga) return out;
  const neu = { x: alt.x + d.x, y: alt.y + d.y, z: alt.z + d.z };
  const ln = Math.hypot(neu.x, neu.y, neu.z);
  if (ln < 1e-9) return out;
  const k = -Math.hypot(ga.x, ga.y, ga.z) / ln;
  out[andere] = { x: k * neu.x - ga.x, y: k * neu.y - ga.y, z: k * neu.z - ga.z };
  return out;
}

/**
 * Versatz der Griffe von Punkt i, wenn sein Ort mit der Abbildung f gedreht oder skaliert wird (Gewicht g wie beim Punkt): Die Griffe
 * gehen mit wie in Illustrator, neuer Griff = f(p + Griff) − f(p). Für eine Verschiebung null.
 */
export function griffeAbbilden(l: Loop, i: number, f: (p: V3) => V3, g = 1): GriffVersatz {
  const p = l.punkte[i]!.ref;
  const fp = f(p);
  const r = griffeBei(l, i);
  const neu = (v: V3 | null): V3 | undefined => {
    if (!v) return undefined;
    const q = f({ x: p.x + v.x, y: p.y + v.y, z: p.z + v.z });
    return { x: g * (q.x - fp.x - v.x), y: g * (q.y - fp.y - v.y), z: g * (q.z - fp.z - v.z) };
  };
  const out: GriffVersatz = {};
  const ein = neu(r.ein);
  const aus = neu(r.aus);
  if (ein) out.ein = ein;
  if (aus) out.aus = aus;
  // am Spiegelpunkt gilt der Griff nach innen, der andere ist sein Spiegelbild
  const rand = ringEnde(l, i);
  if (rand === 'anfang' && aus) out.ein = gespiegelt(aus);
  if (rand === 'ende' && ein) out.aus = gespiegelt(ein);
  return out;
}

/**
 * Versatz der Griffe von Punkt i beim proportionalen Bearbeiten (O, wie in Blender bei Kurven): Punkt und Griffspitzen gehen je mit
 * ihrem eigenen Gewicht mit (`gPunkt`, `gEin`, `gAus`), der Griff ist danach Spitze − Punkt. Ein glatter Punkt behält seine Griffe auf
 * einer Geraden (Winkelhalbierende, Längen wie danach; am Spiegelpunkt senkrecht zur Mittelebene), sonst knickte die Linie überall, wo
 * die zwei Spitzen verschieden weit vom Zug liegen. Eine Ecke von selbst folgt ihren Nachbarn (`griffVersatzImZug`): undefined.
 * Seit die Linie genau ihr Pfad ist (07.11.), formt O die Linien über ihre Punkte und Griffe; vorher je Probe (eine Linie bekam eine
 * Beule, die ihr Pfad nicht hatte, und danach wurden ihre Griffe neu abgelesen).
 */
export function griffeProportional(l: Loop, i: number, f: (p: V3) => V3, gPunkt: number, gEin: number, gAus: number): GriffVersatz | undefined {
  const p = l.punkte[i]!;
  if (istEckeVonSelbst(p)) return undefined;
  const r = griffeBei(l, i);
  const P = p.ref;
  const fP = f(P);
  const dP = { x: gPunkt * (fP.x - P.x), y: gPunkt * (fP.y - P.y), z: gPunkt * (fP.z - P.z) };
  const neu = (v: V3 | null, g: number): V3 | null => {
    if (!v) return null;
    const T = { x: P.x + v.x, y: P.y + v.y, z: P.z + v.z };
    const fT = f(T);
    return { x: v.x + g * (fT.x - T.x) - dP.x, y: v.y + g * (fT.y - T.y) - dP.y, z: v.z + g * (fT.z - T.z) - dP.z };
  };
  let e = neu(r.ein, gEin);
  let a = neu(r.aus, gAus);
  if (e && a && !istEcke(p)) {
    const g = aufGerade(l, i, e, a);
    if (g) {
      e = g.ein;
      a = g.aus;
    }
  }
  const out: GriffVersatz = {};
  if (e && r.ein) out.ein = { x: e.x - r.ein.x, y: e.y - r.ein.y, z: e.z - r.ein.z };
  if (a && r.aus) out.aus = { x: a.x - r.aus.x, y: a.y - r.aus.y, z: a.z - r.aus.z };
  // am Spiegelpunkt gilt der Griff nach innen, der andere ist sein Spiegelbild
  const rand = ringEnde(l, i);
  if (rand === 'anfang' && out.aus) out.ein = gespiegelt(out.aus);
  if (rand === 'ende' && out.ein) out.aus = gespiegelt(out.ein);
  return out;
}

/**
 * Versatz, der die Griffe eines Punkts auf eine Gerade bringt (Winkelhalbierende, Längen bleiben): aus einer Ecke mit Knick wird ein
 * glatter Punkt; liegen sie schon (bis auf 0,01°) auf einer, null. Am Spiegelpunkt (Ende eines Rings) ist die Gerade senkrecht zur
 * Mittelebene: Die Linie läuft dort rund in ihre Spiegelhälfte.
 */
export function griffeAusrichten(l: Loop, i: number): GriffVersatz | null {
  const g = griffeBei(l, i);
  if (!g.ein || !g.aus) return null;
  const le = Math.hypot(g.ein.x, g.ein.y, g.ein.z);
  const la = Math.hypot(g.aus.x, g.aus.y, g.aus.z);
  if (le < 1e-9 || la < 1e-9) {
    // ein Punkt ohne Griffe (mit dem Stift geklickt, wie in Illustrator) bekommt beim Glätten welche: auf der Geraden zwischen seinen
    // Nachbarpunkten, je ein Drittel des Abstands zu ihnen (wie Illustrator beim Umwandeln in einen glatten Punkt)
    const p = l.punkte[i]!.ref;
    const ort = (k: -1 | 1): V3 | null => {
      const n = nachbar(l, i, k);
      if (!n) return null;
      const q = l.punkte[n.j]!.ref;
      return n.gespiegelt ? gespiegelt(q) : q;
    };
    const vor = ort(-1);
    const nach = ort(1);
    if (!vor || !nach) return null;
    const lv = le < 1e-9 ? abstand(p, vor) / 3 : le;
    const ln = la < 1e-9 ? abstand(p, nach) / 3 : la;
    const r = aufGerade(l, i, { x: vor.x - p.x, y: vor.y - p.y, z: vor.z - p.z }, { x: nach.x - p.x, y: nach.y - p.y, z: nach.z - p.z });
    if (!r) return null;
    const ue = einheit(r.ein)!;
    const ua = einheit(r.aus)!;
    return {
      ein: { x: ue.x * lv - g.ein.x, y: ue.y * lv - g.ein.y, z: ue.z * lv - g.ein.z },
      aus: { x: ua.x * ln - g.aus.x, y: ua.y * ln - g.aus.y, z: ua.z * ln - g.aus.z },
    };
  }
  const cos = -(g.ein.x * g.aus.x + g.ein.y * g.aus.y + g.ein.z * g.aus.z) / (le * la);
  if ((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI < 0.01) return null;
  const r = aufGerade(l, i, g.ein, g.aus);
  if (!r) return null;
  return {
    ein: { x: r.ein.x - g.ein.x, y: r.ein.y - g.ein.y, z: r.ein.z - g.ein.z },
    aus: { x: r.aus.x - g.aus.x, y: r.aus.y - g.aus.y, z: r.aus.z - g.aus.z },
  };
}

/** Normale der Haut an einer Probe (Dreieck der Probe; bei einem Punkt des Netzes die Dreiecke um ihn) */
function probenNormale(h: Haut, p: Probe): V3 {
  if (p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2]) {
    const v = p.ecken[0];
    const s = { x: 0, y: 0, z: 0 };
    for (let t = 0; t < h.tri.length / 3; t++) {
      const e: [number, number, number] = [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!];
      if (!e.includes(v)) continue;
      const q = probenNormale(h, { ecken: e, b: [1, 0, 0] });
      s.x += q.x;
      s.y += q.y;
      s.z += q.z;
    }
    const L = Math.hypot(s.x, s.y, s.z) || 1;
    return { x: s.x / L, y: s.y / L, z: s.z / L };
  }
  const [a, b, c] = p.ecken.map((v) => lage(h.pos, v));
  const ab = { x: b!.x - a!.x, y: b!.y - a!.y, z: b!.z - a!.z };
  const ac = { x: c!.x - a!.x, y: c!.y - a!.y, z: c!.z - a!.z };
  const n = { x: ab.y * ac.z - ab.z * ac.y, y: ab.z * ac.x - ab.x * ac.z, z: ab.x * ac.y - ab.y * ac.x };
  const L = Math.hypot(n.x, n.y, n.z) || 1;
  return { x: n.x / L, y: n.y / L, z: n.z / L };
}

/**
 * Kanten des Netzes, die eine Kante (Loop) kreuzen, mit Gewicht 0: Über sie hinweg glättet der Löser nicht, die Haut darf dort
 * knicken. Spiegelbilder (Ring, Paar) ebenso.
 */
export function kantenGewichte(h: Haut, loops: readonly Loop[]): Map<number, number> {
  const out = new Map<number, number>();
  const mk = mittlereKante(h);
  const gerichtet = (von: number, zu: number, w: number) => {
    const k = kantenSchluessel(h, von, zu);
    out.set(k, Math.min(out.get(k) ?? 1, w));
  };
  const setze = (a: number, b: number, w: number) => {
    gerichtet(a, b, w);
    gerichtet(b, a, w);
  };
  for (const l of loops) {
    const hd = kanteBei(l, loops);
    if (!hd.some((x) => x > 0)) continue;
    const n = l.proben.length;
    const zu = geschlossen(l);
    // eingesetzt: Die Punkte der Linie glätten nicht über sie hinweg (nur längs); die Seiten hängen weiter an der Linie
    if (l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) {
      const kette = l.proben.map((p) => p.ecken[0]);
      for (let j = 0; j < n; j++) {
        if (!hd[j]) continue;
        const w = 0;
        const v = kette[j]!;
        const laengs = new Set<number>();
        if (j > 0 || zu) laengs.add(kette[(j - 1 + n) % n]!);
        if (j < n - 1 || zu) laengs.add(kette[(j + 1) % n]!);
        const vs = h.spiegel[v]!;
        for (const x of h.nachbarn[v]!) {
          // an den Enden eines Rings geht die Linie in ihr Spiegelbild über
          if (laengs.has(x) || (l.art === 'ring' && h.spiegel[x] !== undefined && laengs.has(h.spiegel[x]!))) continue;
          gerichtet(v, x, w);
          if (l.art !== 'mitte' && vs >= 0 && vs !== v && h.spiegel[x]! >= 0) gerichtet(vs, h.spiegel[x]!, w);
        }
      }
      continue;
    }
    for (let j = 0; j < (zu ? n : n - 1); j++) {
      const j2 = (j + 1) % n;
      if (!hd[j] && !hd[j2]) continue;
      const w = 0;
      const a = lage(l.ruhe, j);
      const b = lage(l.ruhe, j2);
      const t = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
      const L2 = t.x * t.x + t.y * t.y + t.z * t.z;
      if (L2 < 1e-12) continue;
      const nv = probenNormale(h, l.proben[j]!);
      let bn = { x: t.y * nv.z - t.z * nv.y, y: t.z * nv.x - t.x * nv.z, z: t.x * nv.y - t.y * nv.x };
      const bl = Math.hypot(bn.x, bn.y, bn.z) || 1;
      bn = { x: bn.x / bl, y: bn.y / bl, z: bn.z / bl };
      const kand = new Set<number>();
      for (const v of [...l.proben[j]!.ecken, ...l.proben[j2]!.ecken]) {
        kand.add(v);
        for (const u of h.nachbarn[v]!) kand.add(u);
      }
      for (const v of kand) {
        const pv = lage(h.pos, v);
        const sv = (pv.x - a.x) * bn.x + (pv.y - a.y) * bn.y + (pv.z - a.z) * bn.z;
        for (const u of h.nachbarn[v]!) {
          const pu = lage(h.pos, u);
          const su = (pu.x - a.x) * bn.x + (pu.y - a.y) * bn.y + (pu.z - a.z) * bn.z;
          if (sv * su >= 0) continue;
          const f = sv / (sv - su);
          const c = { x: pv.x + f * (pu.x - pv.x) - a.x, y: pv.y + f * (pu.y - pv.y) - a.y, z: pv.z + f * (pu.z - pv.z) - a.z };
          const laengs = (c.x * t.x + c.y * t.y + c.z * t.z) / L2;
          if (laengs < -0.05 || laengs > 1.05) continue;
          if (Math.abs(c.x * nv.x + c.y * nv.y + c.z * nv.z) > mk) continue;
          setze(v, u, w);
          if (l.art === 'mitte') continue;
          const vs = h.spiegel[v]!;
          const us = h.spiegel[u]!;
          if (vs >= 0 && us >= 0) setze(vs, us, w);
        }
      }
    }
  }
  return out;
}

/**
 * Knick der Haut quer über den Loop je Probe (Grad): mittlere Flächennormale links und rechts der Linie, im Abstand 0,1–1,5
 * Kantenlängen, gegeneinander.
 */
export function knickWinkel(h: Haut, l: Loop): Float64Array {
  const n = l.proben.length;
  const out = new Float64Array(n);
  const mk = mittlereKante(h);
  const zu = geschlossen(l);
  const L = hautLagen(h, l);
  for (let j = 0; j < n; j++) {
    const a = lage(L, j);
    const v0 = lage(L, j > 0 ? j - 1 : zu ? n - 1 : 0);
    const v1 = lage(L, j < n - 1 ? j + 1 : zu ? 0 : n - 1);
    const t = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const tl = Math.hypot(t.x, t.y, t.z) || 1;
    const nv = probenNormale(h, l.proben[j]!);
    let bn = { x: t.y * nv.z - t.z * nv.y, y: t.z * nv.x - t.x * nv.z, z: t.x * nv.y - t.y * nv.x };
    const bl = Math.hypot(bn.x, bn.y, bn.z) || 1;
    bn = { x: bn.x / bl, y: bn.y / bl, z: bn.z / bl };
    // Dreiecke in der Nähe: zwei Ringe um die Ecken der Probe
    const ecken = new Set<number>(l.proben[j]!.ecken);
    for (let r = 0; r < 3; r++) for (const v of [...ecken]) for (const u of h.nachbarn[v]!) ecken.add(u);
    const seiten = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    ];
    for (let f = 0; f < h.tri.length / 3; f++) {
      const e = [h.tri[3 * f]!, h.tri[3 * f + 1]!, h.tri[3 * f + 2]!];
      if (!e.every((v) => ecken.has(v))) continue;
      const q = e.map((v) => lage(h.pos, v));
      const c = { x: (q[0]!.x + q[1]!.x + q[2]!.x) / 3 - a.x, y: (q[0]!.y + q[1]!.y + q[2]!.y) / 3 - a.y, z: (q[0]!.z + q[1]!.z + q[2]!.z) / 3 - a.z };
      const quer = c.x * bn.x + c.y * bn.y + c.z * bn.z;
      const laengs = (c.x * t.x + c.y * t.y + c.z * t.z) / tl;
      if (Math.abs(quer) < 0.1 * mk || Math.abs(quer) > 1.5 * mk || Math.abs(laengs) > 1.5 * mk) continue;
      const nf = probenNormale(h, { ecken: e as [number, number, number], b: [1, 0, 0] });
      const s = seiten[quer > 0 ? 0 : 1]!;
      s.x += nf.x;
      s.y += nf.y;
      s.z += nf.z;
    }
    const [p, q] = seiten;
    const lp = Math.hypot(p!.x, p!.y, p!.z);
    const lq = Math.hypot(q!.x, q!.y, q!.z);
    if (lp < 1e-9 || lq < 1e-9) continue;
    const cos = (p!.x * q!.x + p!.y * q!.y + p!.z * q!.z) / (lp * lq);
    out[j] = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  }
  return out;
}

/**
 * Einen Punkt an der Stelle s einfügen (formneutral: er liegt auf dem Loop und behält dort die Kante des Verlaufs). Liegt dort schon
 * ein Punkt (eine Kreuzung am Ende eines Rings trifft sein Ende), wird er es selbst. Mit gespeicherten Griffen teilt er sein Stück
 * wie in Illustrator (de Casteljau): Die Hälften sind zusammen genau das alte Stück, die Nachbargriffe werden kürzer, der neue Punkt
 * ist glatt. Gemessen und verworfen: seine Griffe aus der Linie und die Längen der Nachbargriffe dazu neu angepasst — an einer weit
 * gezogenen Rüsselspitze wurden die Griffe der Spitze 600 Einheiten lang (ein Stück aus langer Geraden und Bogen lässt sich mit
 * festen Richtungen nicht anpassen). Nur ein geschlossener Loop mit höchstens einem Punkt hatte noch kein Stück, das die Linie
 * beschreibt: Dort werden alle Griffe aus der Linie abgelesen. `aufPfad` (die Linie ist ihr Pfad): Der Punkt liegt genau am
 * Teilungspunkt des Stücks (sonst auf der Linie).
 */
export function punktEinfuegen(l: Loop, s: number, kreuzung?: number, aufPfad = false): LoopPunkt {
  const da = l.punkte.find((q) => Math.abs(q.s - s) <= 1e-6 * Math.max(1, l.laenge) && (kreuzung === undefined || q.kreuzung === undefined));
  if (da) {
    if (kreuzung !== undefined) da.kreuzung = kreuzung;
    if (da.vonSelbst && kreuzung !== undefined) {
      delete da.vonSelbst;
      // liegt die Linie genau auf ihrem Pfad, hat das Ende schon die Griffe eines glatten Spiegelpunkts (sie bleiben, die Linie auch)
      if (hatGriffe(l) && !aufPfad) griffeAusLinie(l, l.ruhe, new Set([l.punkte.indexOf(da)]));
    }
    return da;
  }
  const q = stelleBei(l, l.ruhe, s);
  const p: LoopPunkt = kreuzung === undefined ? { s, ref: q, cur: { ...q } } : { s, ref: q, cur: { ...q }, kreuzung };
  const k = kanteAn(l, s);
  if (kreuzung === undefined && k !== (l.kante ?? false)) p.kante = k;
  const vorher = l.punkte.length;
  l.punkte.push(p);
  l.punkte.sort((a, b) => a.s - b.s);
  if (hatGriffe(l)) {
    if (geschlossen(l) && vorher <= 1) griffeAusLinie(l, l.ruhe, null);
    else {
      const i = l.punkte.indexOf(p);
      const m = l.punkte.length;
      const a = l.punkte[(i - 1 + m) % m]!;
      const b = l.punkte[(i + 1) % m]!;
      const s0 = a.s;
      const s1 = b.s > s0 ? b.s : b.s + l.laenge;
      const x = s < s0 ? s + l.laenge : s;
      const r = stueckTeilen(a.ref, a.aus!, b.ein!, b.ref, s1 > s0 ? (x - s0) / (s1 - s0) : 0.5);
      a.aus = r.a1;
      b.ein = r.b2;
      p.ein = r.ein;
      p.aus = r.aus;
      // liegt die Linie genau auf ihrem Pfad, sitzt der Punkt genau dort, wo das Stück geteilt wird
      if (aufPfad) {
        p.ref = { ...r.F };
        p.cur = { ...r.F };
      }
      griffeSpiegeln(l);
    }
  }
  return p;
}
