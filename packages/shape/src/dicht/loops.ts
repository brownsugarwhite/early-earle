// Form zuerst (05.11.2026), Schritt 1 „Nur Loops“ (Florian: Die Kugel hat am Anfang keine Loops; alle Griffe entstehen an
// Kreuzungen von Loops oder als Punkte, die er auf eine Linie setzt; geschlossene Formen wie in Illustrator; keine offenen Enden).
//
// Ein Loop ist eine geschlossene Linie auf der Haut, gespeichert als Proben (je ein Punkt eines Dreiecks). Er entsteht als Schnitt
// quer über den Körper (Ebene durch die gezogene Linie und die Blickrichtung) oder als gezeichnete Form, auf die Haut gelegt.
// Spiegelgleich: `mitte` liegt ganz in der Mittelebene, `ring` ist die Hälfte z ≥ 0 eines Loops um den Körper (Enden auf der
// Mittelebene), `paar` liegt auf einer Seite und hat ein Spiegelbild. Ein Loop ändert die Form nicht, wenn er entsteht; die Haut
// folgt nur den Verschiebungen seiner Proben (`HautZiele`). Punkte (Griffe) liegen an einer Stelle s längs des Loops; zwischen
// ihnen verteilt sich ihre Verschiebung glatt (Hermite längs s).

import { type Bindungen, type Haut, HautZiele, type V3, einflussBereich, kantenSchluessel } from './kurven';

export type Ansicht = 'seite' | 'front' | 'top';
/** Ein Punkt der Haut: drei Ecken eines Dreiecks und baryzentrische Gewichte */
export type Probe = { ecken: [number, number, number]; b: [number, number, number] };
/**
 * Griff auf einem Loop: Stelle s (Bogenlänge beim Anlegen), Lage beim letzten Festlegen und jetzt; Kreuzung: Kennung; Härte 0–3
 * (wie die Strichdicke in px: 0 weich, 3 ein Knick wie Edge Crease in Blender; fehlt: die des Loops)
 */
export type LoopPunkt = { s: number; ref: V3; cur: V3; kreuzung?: number; haerte?: number };
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
  /** Härte des Loops, wo seine Punkte keine eigene haben (fehlt: 0) */
  haerte?: number;
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
 * Top über die Mittelachse gezeichnet wird sie spiegelgleich (ihre Hälfte z ≥ 0), sonst ein Loop auf einer Seite.
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
  const dazu = (q: readonly [number, number], knoten: boolean) => {
    const t = strahl(h, a, q[0], q[1]);
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
  } else if (wechsel.length === 0) {
    art = 'paar';
    uv.forEach((q, i) => dazu(q, knotenMenge.has(i)));
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
 * Verschiebung je Probe aus den Verschiebungen der Punkte (`D` je Punkt): zwischen zwei Punkten glatt (Hermite längs s, Steigung
 * aus den Nachbarn). Ein geschlossener Loop mit einem Punkt bewegt sich als Ganzes. Ein Ring hält seine Enden auf der Mittelebene
 * (ohne Punkt dort bleiben sie stehen) und läuft spiegelgleich in seine andere Hälfte.
 */
export function verschiebungLaengs(l: Loop, D: readonly V3[]): Float64Array {
  const n = l.proben.length;
  const out = new Float64Array(3 * n);
  const K = l.punkte.map((q, i) => ({ s: q.s, d: D[i]! }));
  if (K.length === 0) return out;
  const zu = geschlossen(l);
  if (zu && K.length === 1) {
    for (let j = 0; j < n; j++) {
      out[3 * j] = K[0]!.d.x;
      out[3 * j + 1] = K[0]!.d.y;
      out[3 * j + 2] = K[0]!.d.z;
    }
    return out;
  }
  // Stützstellen: geschlossen zyklisch; Ring mit festen Enden und gespiegelten Nachbarn dahinter
  let S: { s: number; d: V3 }[];
  if (zu) {
    S = [
      ...K.slice(-2).map((k) => ({ s: k.s - l.laenge, d: k.d })),
      ...K,
      ...K.slice(0, 2).map((k) => ({ s: k.s + l.laenge, d: k.d })),
    ];
  } else {
    const L = l.laenge;
    const innen = K.filter((k) => k.s > 1e-6 && k.s < L - 1e-6);
    const a = K.find((k) => k.s <= 1e-6) ?? { s: 0, d: { x: 0, y: 0, z: 0 } };
    const b = K.find((k) => k.s >= L - 1e-6) ?? { s: L, d: { x: 0, y: 0, z: 0 } };
    const kern = [{ s: 0, d: { ...a.d, z: 0 } }, ...innen, { s: L, d: { ...b.d, z: 0 } }];
    const spiegel = (k: { s: number; d: V3 }, um: number) => ({ s: 2 * um - k.s, d: { ...k.d, z: -k.d.z } });
    const vor = kern[1] ? spiegel(kern[1], 0) : { s: -L, d: { x: 0, y: 0, z: 0 } };
    const nach = kern[kern.length - 2] ? spiegel(kern[kern.length - 2]!, L) : { s: 2 * L, d: { x: 0, y: 0, z: 0 } };
    S = [vor, ...kern, nach];
  }
  const steigung = (i: number): V3 => {
    const a = S[i - 1]!;
    const b = S[i + 1]!;
    const ds = b.s - a.s || 1;
    return { x: (b.d.x - a.d.x) / ds, y: (b.d.y - a.d.y) / ds, z: (b.d.z - a.d.z) / ds };
  };
  for (let j = 0; j < n; j++) {
    let s = l.s[j]!;
    if (zu) s = ((s - S[1]!.s) % l.laenge + l.laenge) % l.laenge + S[1]!.s;
    let i = 1;
    while (i < S.length - 2 && S[i + 1]!.s < s) i++;
    const a = S[i]!;
    const b = S[i + 1]!;
    const hgt = b.s - a.s;
    const t = hgt > 1e-9 ? Math.max(0, Math.min(1, (s - a.s) / hgt)) : 0;
    const ma = steigung(i);
    const mb = steigung(i + 1);
    const h00 = 2 * t * t * t - 3 * t * t + 1;
    const h10 = t * t * t - 2 * t * t + t;
    const h01 = -2 * t * t * t + 3 * t * t;
    const h11 = t * t * t - t * t;
    out[3 * j] = h00 * a.d.x + h10 * hgt * ma.x + h01 * b.d.x + h11 * hgt * mb.x;
    out[3 * j + 1] = h00 * a.d.y + h10 * hgt * ma.y + h01 * b.d.y + h11 * hgt * mb.y;
    out[3 * j + 2] = h00 * a.d.z + h10 * hgt * ma.z + h01 * b.d.z + h11 * hgt * mb.z;
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
 * Ein Zug: Löser für den Einflussbereich, Lagen der Loops beim Anfang. Je Schritt die Verschiebung je Probe (je Loop, null:
 * bleibt); am Ende `festlegen`.
 */
export class LoopZug {
  readonly plan: BindungsPlan;
  readonly start: Float64Array[];
  readonly loeser: HautZiele;

  constructor(h: Haut, loops: readonly Loop[], bereich: Uint8Array | null) {
    this.plan = bindungenAus(h, loops);
    this.start = loops.map((l) => Float64Array.from(l.ruhe));
    this.loeser = new HautZiele(h, this.plan.bind, zieleAus(this.plan, this.start), bereich, 100, kantenGewichte(h, loops));
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
    this.loeser.schritt(zieleAus(this.plan, this.lagen(versch)), iterationen);
  }
}

/** Nach einem Zug: Ruhe = Lagen der Proben auf der Haut, jeder Punkt an seiner Stelle darauf. */
export function festlegen(h: Haut, l: Loop): void {
  l.ruhe = hautLagen(h, l);
  for (const p of l.punkte) {
    const q = stelleBei(l, l.ruhe, p.s);
    if (l.art === 'mitte' || (l.art === 'ring' && (p.s <= 1e-6 || p.s >= l.laenge - 1e-6))) q.z = 0;
    p.ref = q;
    p.cur = { ...q };
  }
}

/** Härte je Probe (0–3): zwischen den Punkten linear längs s, vor dem ersten und nach dem letzten Punkt eines Rings wie dieser */
export function haerteBei(l: Loop): Float64Array {
  const n = l.proben.length;
  const basis = l.haerte ?? 0;
  const out = new Float64Array(n).fill(basis);
  const K = l.punkte.map((p) => ({ s: p.s, h: p.haerte ?? basis }));
  if (K.length === 0) return out;
  const zu = geschlossen(l);
  for (let j = 0; j < n; j++) {
    const s = l.s[j]!;
    let i = K.findIndex((k) => k.s > s);
    if (i < 0) i = K.length;
    if (!zu && (i === 0 || i === K.length)) {
      out[j] = K[i === 0 ? 0 : K.length - 1]!.h;
      continue;
    }
    const a = i === 0 ? { s: K[K.length - 1]!.s - l.laenge, h: K[K.length - 1]!.h } : K[i - 1]!;
    const b = i === K.length ? { s: K[0]!.s + l.laenge, h: K[0]!.h } : K[i]!;
    const t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    out[j] = a.h + t * (b.h - a.h);
  }
  return out;
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
 * Kanten des Netzes, die einen harten Loop kreuzen, und ihr Gewicht 1 − Härte/3 (0 = ganz getrennt): Über eine harte Linie
 * hinweg glättet der Löser nicht, beim Ziehen entsteht dort ein Knick. Spiegelbilder (Ring, Paar) ebenso.
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
    const hd = haerteBei(l);
    if (!hd.some((x) => x > 0)) continue;
    const n = l.proben.length;
    const zu = geschlossen(l);
    // eingesetzt: Die Punkte der Linie glätten nicht über sie hinweg (nur längs); die Seiten hängen weiter an der Linie
    if (l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) {
      const kette = l.proben.map((p) => p.ecken[0]);
      for (let j = 0; j < n; j++) {
        const w = 1 - Math.min(1, hd[j]! / 3);
        if (w >= 1) continue;
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
      const hh = Math.min(1, Math.max(hd[j]!, hd[j2]!) / 3);
      if (hh <= 0) continue;
      const w = 1 - hh;
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

/** Einen Punkt an der Stelle s einfügen (formneutral: er liegt auf dem Loop) */
export function punktEinfuegen(l: Loop, s: number, kreuzung?: number): LoopPunkt {
  const q = stelleBei(l, l.ruhe, s);
  const p: LoopPunkt = kreuzung === undefined ? { s, ref: q, cur: { ...q } } : { s, ref: q, cur: { ...q }, kreuzung };
  l.punkte.push(p);
  l.punkte.sort((a, b) => a.s - b.s);
  return p;
}
