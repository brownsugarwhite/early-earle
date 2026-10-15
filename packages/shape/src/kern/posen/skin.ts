// Posen (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B, Schritt B2): Knochen als starre Transformation je
// Käfigpunkt, exakt umkehrbar. Bildet die Kieferpose `maulPose` (ohne Haps) nach: Der Unterkiefer dreht um das Scharnier
// (beim „Ziehen“ gleitet er), dazu sein gegriffener Zug; die Kehlhaut (Beutel) folgt der Plattenkante; der Schädel dreht
// um das Schädelgelenk. Alles in der Seitenebene (z bleibt), je Punkt mit Winkeln, die mit den Gewichten wachsen — kein
// lineares Mischen von Matrizen, deshalb bleibt jede Transformation eine Drehung plus Versatz (det = 1).
import { type MaulErgebnis, type MaulOptionen, schaedelGelenk } from '../maul';

/** Stellung der Knochen einer Pose: Kieferwinkel und Schädelwinkel (Grad), Zug des Unterkiefers (Maullängen), Zugweite beim Ziehen. */
export type Stellung = { winkelUnten: number; winkelOben: number; kieferZug: [number, number]; zugWeite: number };

export const STELLUNG_NULL: Stellung = { winkelUnten: 0, winkelOben: 0, kieferZug: [0, 0], zugWeite: 0 };

/** Stellung aus den heutigen Maul-Optionen (die Fressen-Pose bei voller Öffnung). */
export function stellungAus(opt: Pick<MaulOptionen, 'winkelUnten' | 'winkelOben' | 'kieferZug' | 'zugWeite'>): Stellung {
  return { winkelUnten: opt.winkelUnten, winkelOben: opt.winkelOben, kieferZug: [opt.kieferZug?.[0] ?? 0, opt.kieferZug?.[1] ?? 0], zugWeite: opt.zugWeite };
}

/** Gewichtete Summe der Stellungen (Winkel und Züge sind lineare Koordinaten). */
export function stellungMischen(liste: readonly { w: number; stellung: Stellung }[]): Stellung {
  const s: Stellung = { winkelUnten: 0, winkelOben: 0, kieferZug: [0, 0], zugWeite: 0 };
  for (const { w, stellung: t } of liste) {
    s.winkelUnten += w * t.winkelUnten;
    s.winkelOben += w * t.winkelOben;
    s.kieferZug[0] += w * t.kieferZug[0];
    s.kieferZug[1] += w * t.kieferZug[1];
    s.zugWeite += w * t.zugWeite;
  }
  return s;
}

export function stellungNull(s: Stellung): boolean {
  return s.winkelUnten === 0 && s.winkelOben === 0 && s.kieferZug[0] === 0 && s.kieferZug[1] === 0 && s.zugWeite === 0;
}

/** Transformation je Käfigpunkt: x' = c·x − s·y + tx, y' = s·x + c·y + ty, z' = z. */
export type Skin = { n: number; c: Float64Array; s: Float64Array; tx: Float64Array; ty: Float64Array };

/**
 * Skin einer Stellung auf einer Maul-Ableitung (Gewichte, Scharnier, Schädelgelenk, Plattenkante aus `abl.maul`; die
 * Öffnungsart aus `opt`). Reihenfolge wie `maulPose`: Unterkiefer (Drehung bzw. Gleiten, dann Zug), Beutel, Schädel.
 */
export function skinBerechnen(abl: MaulErgebnis, opt: Pick<MaulOptionen, 'oeffnungsart' | 'schaedelGelenk'>, st: Stellung): Skin {
  const m = abl.maul;
  const n = abl.kaefig.n;
  const aU = (st.winkelUnten * Math.PI) / 180;
  const aO = (st.winkelOben * Math.PI) / 180;
  const zieht = opt.oeffnungsart === 'ziehen';
  const weite = st.zugWeite * m.laenge;
  const sg = schaedelGelenk(m, opt);
  const zx = st.kieferZug[0] * m.laenge * m.vorn;
  const zy = st.kieferZug[1] * m.laenge;
  // Verschiebung der Plattenkante je Ring (ganzer Kiefer, ohne Gewicht) — die Kehlhaut folgt ihr mit ihrem Beutelgewicht
  const R = abl.vorlage.R;
  const kanten = new Float64Array(2 * R);
  for (let r = 0; r < R; r++) {
    const ex = m.plattenKante[3 * r]!;
    const ey = m.plattenKante[3 * r + 1]!;
    if (zieht) {
      kanten[2 * r] = weite * m.zug.x;
      kanten[2 * r + 1] = weite * m.zug.y;
    } else {
      const w = -m.vorn * aU;
      const c = Math.cos(w);
      const s = Math.sin(w);
      const x = ex - m.scharnier.x;
      const y = ey - m.scharnier.y;
      kanten[2 * r] = m.scharnier.x + x * c - y * s - ex + zx;
      kanten[2 * r + 1] = m.scharnier.y + x * s + y * c - ey + zy;
    }
  }
  const sk: Skin = { n, c: new Float64Array(n), s: new Float64Array(n), tx: new Float64Array(n), ty: new Float64Array(n) };
  for (let i = 0; i < n; i++) {
    let winkel = 0;
    let tx = 0;
    let ty = 0;
    // Drehung um (hx, hy) nach der bisherigen Transformation: t ← R·t + h − R·h
    const drehe = (hx: number, hy: number, a: number) => {
      const c = Math.cos(a);
      const s = Math.sin(a);
      const nx = c * tx - s * ty + hx - (c * hx - s * hy);
      const ny = s * tx + c * ty + hy - (s * hx + c * hy);
      tx = nx;
      ty = ny;
      winkel += a;
    };
    const wu = m.gewichtUnten[i]!;
    if (wu > 0) {
      if (zieht) {
        tx += wu * weite * m.zug.x;
        ty += wu * weite * m.zug.y;
      } else {
        drehe(m.scharnier.x, m.scharnier.y, -m.vorn * wu * aU);
        tx += wu * zx;
        ty += wu * zy;
      }
    }
    const wb = m.beutelGewicht[i]!;
    if (wb > 0) {
      const r = m.beutelRing[i]!;
      tx += wb * kanten[2 * r]!;
      ty += wb * kanten[2 * r + 1]!;
    }
    const wo = m.gewichtOben[i]!;
    if (wo > 0) drehe(sg.x, sg.y, m.vorn * wo * aO);
    sk.c[i] = winkel === 0 ? 1 : Math.cos(winkel);
    sk.s[i] = winkel === 0 ? 0 : Math.sin(winkel);
    sk.tx[i] = tx;
    sk.ty[i] = ty;
  }
  return sk;
}

/** Skin auf Käfiglagen (Ruhe → posiert). */
export function skinAnwenden(sk: Skin, ruhe: ArrayLike<number>, aus = new Float64Array(ruhe.length)): Float64Array {
  for (let i = 0; i < sk.n; i++) {
    const x = ruhe[3 * i]!;
    const y = ruhe[3 * i + 1]!;
    aus[3 * i] = sk.c[i]! * x - sk.s[i]! * y + sk.tx[i]!;
    aus[3 * i + 1] = sk.s[i]! * x + sk.c[i]! * y + sk.ty[i]!;
    aus[3 * i + 2] = ruhe[3 * i + 2]!;
  }
  return aus;
}

/** Umkehrung (posiert → Ruhe): Rᵀ·(p − t). */
export function skinUmkehren(sk: Skin, posiert: ArrayLike<number>, aus = new Float64Array(posiert.length)): Float64Array {
  for (let i = 0; i < sk.n; i++) {
    const x = posiert[3 * i]! - sk.tx[i]!;
    const y = posiert[3 * i + 1]! - sk.ty[i]!;
    aus[3 * i] = sk.c[i]! * x + sk.s[i]! * y;
    aus[3 * i + 1] = -sk.s[i]! * x + sk.c[i]! * y;
    aus[3 * i + 2] = posiert[3 * i + 2]!;
  }
  return aus;
}

/** Versatz eines Punkts aus der Pose in die Ruhe zurückdrehen (Rᵀ·d, ohne Verschiebung). */
export function versatzInRuhe(sk: Skin, i: number, d: readonly [number, number, number]): [number, number, number] {
  return [sk.c[i]! * d[0] + sk.s[i]! * d[1], -sk.s[i]! * d[0] + sk.c[i]! * d[1], d[2]];
}
