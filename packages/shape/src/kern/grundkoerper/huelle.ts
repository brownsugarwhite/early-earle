// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S0: Sichthülle der drei Zeichnungen, genau aus den Umrissen (keine Voxel).
// Ein Punkt (x, y, z) liegt in der Hülle, wenn ihn alle drei Ansichten zeigen: Seite (x, y), Front (z, y), Top (x, z).
// Daraus folgt für jeden Punkt einer Umrisslinie, ob ihn ein Körper überhaupt erreichen kann: Ein Seitenpunkt (x, y)
// braucht ein z, das Front (bei y) und Top (bei x) erlauben, usw. Ist die Menge leer, widersprechen sich die Zeichnungen
// dort — dann kann kein Körper die schwarze Linie treffen, und der Editor zeigt es, statt still zu entscheiden. Die Größe
// des Widerspruchs ist der Weg nach innen bis zur ersten erreichbaren Stelle (px bei 461). Die Säulen der Hülle (alle z
// bei (x, y)) sagen außerdem, ob ein Teil auf der Mittelebene liegt oder seitlich als Paar (für die Teilerkennung, S4).
// DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { pfadAbtasten, vollerPfad } from '../../profil';

/** px je Kachel-Einheit (Vertrag aller Messungen) */
const PX = 461;

/** sortierte, disjunkte Intervalle */
export type Intervalle = [number, number][];

/** Schnitt einer Geraden (x = wert bzw. y = wert) mit einem geschlossenen Polygon: Intervalle im Inneren (gerade-ungerade). */
export function schnittIntervalle(poly: readonly V2[], quer: 'x' | 'y', wert: number): Intervalle {
  const t: number[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const av = quer === 'x' ? a.x : a.y;
    const bv = quer === 'x' ? b.x : b.y;
    if ((av <= wert && bv > wert) || (bv <= wert && av > wert)) {
      const f = (wert - av) / (bv - av);
      t.push(quer === 'x' ? a.y + f * (b.y - a.y) : a.x + f * (b.x - a.x));
    }
  }
  t.sort((p, q) => p - q);
  const out: Intervalle = [];
  for (let i = 0; i + 1 < t.length; i += 2) out.push([t[i]!, t[i + 1]!]);
  return out;
}

/** Schnittmenge zweier Intervallmengen. */
export function schneiden(a: Intervalle, b: Intervalle): Intervalle {
  const out: Intervalle = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i]![0], b[j]![0]);
    const hi = Math.min(a[i]![1], b[j]![1]);
    if (lo <= hi) out.push([lo, hi]);
    if (a[i]![1] < b[j]![1]) i++;
    else j++;
  }
  return out;
}

export type Huelle = {
  /** Umrisse als Polygone in Kern-Einheiten (Front/Top gespiegelt): Seite (x, y), Front (z, y), Top (x, z) */
  seite: V2[];
  front: V2[];
  top: V2[];
  /** erlaubte z bei (x, y): Front bei y ∩ Top bei x */
  zBei: (x: number, y: number) => Intervalle;
  /** erlaubte x bei (z, y): Seite bei y ∩ Top bei z */
  xBei: (z: number, y: number) => Intervalle;
  /** erlaubte y bei (x, z): Seite bei x ∩ Front bei z */
  yBei: (x: number, z: number) => Intervalle;
};

/** Sichthülle eines Dokuments (Profile × Maßstab). */
export function huelle(dok: Dokument, proSegment = 24): Huelle {
  const sk = dok.skalierung;
  const poly = (a: 'seite' | 'front' | 'top') => pfadAbtasten(vollerPfad(dok.profile[a]), proSegment).map((p) => ({ x: p.x * sk, y: p.y * sk }));
  const seite = poly('seite');
  const front = poly('front');
  const top = poly('top');
  return {
    seite,
    front,
    top,
    // Front: Blatt-x = z, Blatt-y = y; Top: Blatt-x = x, Blatt-y = z
    zBei: (x, y) => schneiden(schnittIntervalle(front, 'y', y), schnittIntervalle(top, 'x', x)),
    xBei: (z, y) => schneiden(schnittIntervalle(seite, 'y', y), schnittIntervalle(top, 'y', z)),
    yBei: (x, z) => schneiden(schnittIntervalle(seite, 'x', x), schnittIntervalle(front, 'x', z)),
  };
}

export type Erreichbarkeit = {
  /** Proben der gezeichneten Linie (Kern-Einheiten, Blattkoordinaten) */
  punkte: V2[];
  /** Widerspruch je Probe in px: 0 = erreichbar, sonst Weg nach innen bis zur ersten erreichbaren Stelle */
  widerspruch: Float64Array;
  /** größter Widerspruch (px) */
  max: number;
};

/**
 * Erreichbarkeit jeder Probe der drei Umrisse. `toleranz` (px) gilt als erreichbar (Rundung der Abtastung); der Weg nach
 * innen wird in Schritten von 1 px gesucht und halbiert (bis 0,05 px), höchstens `bis` px.
 */
export function erreichbarkeit(dok: Dokument, toleranz = 0.5, bis = 300): Record<'seite' | 'front' | 'top', Erreichbarkeit> {
  const h = huelle(dok);
  const eps = toleranz / PX;
  const erreichbar = (a: 'seite' | 'front' | 'top', p: V2): boolean => {
    // die erlaubte Menge der dritten Koordinate darf um eps verfehlt werden; dazu beide Ansichten bei p ± eps abfragen
    const menge = a === 'seite' ? h.zBei(p.x, p.y) : a === 'front' ? h.xBei(p.x, p.y) : h.yBei(p.x, p.y);
    if (menge.length) return true;
    // Toleranz: Nachbarn im Abstand eps (der Rand der Hülle ist eine Fläche, Abtastfehler ≤ eps)
    for (const [dx, dy] of [[eps, 0], [-eps, 0], [0, eps], [0, -eps]] as const) {
      const q = { x: p.x + dx, y: p.y + dy };
      const m = a === 'seite' ? h.zBei(q.x, q.y) : a === 'front' ? h.xBei(q.x, q.y) : h.yBei(q.x, q.y);
      if (m.length) return true;
    }
    return false;
  };
  const out = {} as Record<'seite' | 'front' | 'top', Erreichbarkeit>;
  for (const a of ['seite', 'front', 'top'] as const) {
    const poly = h[a];
    const n = poly.length;
    // Umlaufsinn für die Innen-Normale
    let flaeche = 0;
    for (let i = 0; i < n; i++) {
      const p = poly[i]!;
      const q = poly[(i + 1) % n]!;
      flaeche += p.x * q.y - q.x * p.y;
    }
    const sg = flaeche >= 0 ? 1 : -1;
    const widerspruch = new Float64Array(n);
    let max = 0;
    for (let i = 0; i < n; i++) {
      const p = poly[i]!;
      if (erreichbar(a, p)) continue;
      const v = poly[(i - 1 + n) % n]!;
      const w = poly[(i + 1) % n]!;
      let tx = w.x - v.x;
      let ty = w.y - v.y;
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
      // Innen-Normale: links vom Umlauf bei positivem Umlaufsinn
      const nx = -ty * sg;
      const ny = tx * sg;
      let lo = 0;
      let hi = -1;
      for (let s = 1; s <= bis; s++) {
        const q = { x: p.x + (nx * s) / PX, y: p.y + (ny * s) / PX };
        if (erreichbar(a, q)) {
          hi = s;
          lo = s - 1;
          break;
        }
      }
      if (hi < 0) {
        widerspruch[i] = bis;
        max = Math.max(max, bis);
        continue;
      }
      while (hi - lo > 0.05) {
        const m = (lo + hi) / 2;
        if (erreichbar(a, { x: p.x + (nx * m) / PX, y: p.y + (ny * m) / PX })) hi = m;
        else lo = m;
      }
      widerspruch[i] = hi;
      max = Math.max(max, hi);
    }
    out[a] = { punkte: poly, widerspruch, max };
  }
  return out;
}

export type SaeulenArt = 'leer' | 'mitte' | 'seitlich' | 'beides';

/**
 * Art der Hüllensäule bei (x, y) der Seite: alle erlaubten z. `mitte` = ein Stück durch z = 0, `seitlich` = nur Stücke
 * neben der Mitte (gespiegeltes Paar: Beine, Flügel über dem Rücken), `beides` = Mitte und daneben getrennte Stücke.
 */
export function saeulenArt(h: Huelle, x: number, y: number, eps = 0.5 / PX): SaeulenArt {
  const iv = h.zBei(x, y);
  if (!iv.length) return 'leer';
  let mitte = false;
  let seitlich = false;
  for (const [lo, hi] of iv) {
    if (lo <= eps && hi >= -eps) mitte = true;
    else seitlich = true;
  }
  return mitte && seitlich ? 'beides' : mitte ? 'mitte' : 'seitlich';
}
