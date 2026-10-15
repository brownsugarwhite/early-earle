// Posen (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B, B2/B3b): Knochen als starre Transformation je
// Käfigpunkt, exakt umkehrbar. Bildet die Kieferpose `maulPose` (ohne Haps) nach: Der Unterkiefer dreht um das Scharnier
// (beim „Ziehen“ gleitet er), dazu sein gegriffener Zug; die Kehlhaut (Beutel) folgt der Plattenkante; der Schädel dreht
// um das Schädelgelenk. Seit B3b (Florians Entscheidung 10: „Knochen auch in 3D drehen und verschieben … asymmetrische
// Maulöffnungen, z. B. den Oberkiefer entlang des Knochens rotieren“) in 3D: Unterkiefer und Schädel drehen mit Winkel
// (Öffnen, um die Querachse), Gieren (um die Senkrechte) und Rollen (um die eigene Knochenachse), der Unterkiefer
// verschiebt sich auch seitlich. Mit Gieren, Rollen und Seite = 0 ist alles wie in der Ebene. Jede Transformation ist eine
// Drehung (det = 1) plus Versatz: Winkel wachsen mit den Gewichten, Matrizen werden nie linear gemischt.
import { type MaulErgebnis, type MaulOptionen, schaedelGelenk } from '../maul';

/**
 * Stellung der Knochen einer Pose: Kieferwinkel und Schädelwinkel (Grad), Zug des Unterkiefers (Maullängen, x zur
 * Schnauze), Zugweite beim Ziehen; 3D: Gieren und Rollen (Grad), seitlicher Versatz des Unterkiefers (Maullängen, +z).
 */
export type Stellung = {
  winkelUnten: number;
  winkelOben: number;
  kieferZug: [number, number];
  zugWeite: number;
  gierenUnten: number;
  rollenUnten: number;
  seitUnten: number;
  gierenOben: number;
  rollenOben: number;
};

export const STELLUNG_NULL: Stellung = { winkelUnten: 0, winkelOben: 0, kieferZug: [0, 0], zugWeite: 0, gierenUnten: 0, rollenUnten: 0, seitUnten: 0, gierenOben: 0, rollenOben: 0 };

/** Stellung aus den heutigen Maul-Optionen (die Fressen-Pose bei voller Öffnung; eben). */
export function stellungAus(opt: Pick<MaulOptionen, 'winkelUnten' | 'winkelOben' | 'kieferZug' | 'zugWeite'>): Stellung {
  return { ...STELLUNG_NULL, winkelUnten: opt.winkelUnten, winkelOben: opt.winkelOben, kieferZug: [opt.kieferZug?.[0] ?? 0, opt.kieferZug?.[1] ?? 0], zugWeite: opt.zugWeite };
}

/** Gewichtete Summe der Stellungen (Winkel und Züge sind lineare Koordinaten). */
export function stellungMischen(liste: readonly { w: number; stellung: Stellung }[]): Stellung {
  const s: Stellung = { ...STELLUNG_NULL, kieferZug: [0, 0] };
  for (const { w, stellung: t } of liste) {
    s.winkelUnten += w * t.winkelUnten;
    s.winkelOben += w * t.winkelOben;
    s.kieferZug[0] += w * t.kieferZug[0];
    s.kieferZug[1] += w * t.kieferZug[1];
    s.zugWeite += w * t.zugWeite;
    s.gierenUnten += w * t.gierenUnten;
    s.rollenUnten += w * t.rollenUnten;
    s.seitUnten += w * t.seitUnten;
    s.gierenOben += w * t.gierenOben;
    s.rollenOben += w * t.rollenOben;
  }
  return s;
}

export function stellungNull(s: Stellung): boolean {
  return s.winkelUnten === 0 && s.winkelOben === 0 && s.kieferZug[0] === 0 && s.kieferZug[1] === 0 && s.zugWeite === 0 && s.gierenUnten === 0 && s.rollenUnten === 0 && s.seitUnten === 0 && s.gierenOben === 0 && s.rollenOben === 0;
}

/** Ist die Stellung eben (kein Gieren, Rollen, seitlicher Versatz)? Dann bleibt eine Pose spiegelgleich. */
export function stellungEben(s: Stellung): boolean {
  return s.gierenUnten === 0 && s.rollenUnten === 0 && s.seitUnten === 0 && s.gierenOben === 0 && s.rollenOben === 0;
}

/** Transformation je Käfigpunkt: x' = R·x + t (R zeilenweise, 9 Werte je Punkt; t 3 Werte je Punkt). */
export type Skin = { n: number; r: Float64Array; t: Float64Array };

type M3 = [number, number, number, number, number, number, number, number, number];
const EINHEIT: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const GRAD = Math.PI / 180;

/** Drehung um eine Achse durch den Ursprung (Rodrigues; Achse normiert, Winkel im Bogenmaß). */
function drehAchse(ax: number, ay: number, az: number, a: number): M3 {
  if (a === 0) return [...EINHEIT];
  const c = Math.cos(a);
  const s = Math.sin(a);
  const k = 1 - c;
  return [c + ax * ax * k, ax * ay * k - az * s, ax * az * k + ay * s, ay * ax * k + az * s, c + ay * ay * k, ay * az * k - ax * s, az * ax * k - ay * s, az * ay * k + ax * s, c + az * az * k];
}
/** Drehung um z (wie die ebene Drehung, genau dieselben Rechenschritte). */
function drehZ(a: number): M3 {
  if (a === 0) return [...EINHEIT];
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}
function mal(A: M3, B: M3): M3 {
  const o = new Array(9) as M3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[3 * i + j] = A[3 * i]! * B[j]! + A[3 * i + 1]! * B[3 + j]! + A[3 * i + 2]! * B[6 + j]!;
  return o;
}

/** Achse eines Knochens in der Ruhe: vom Gelenk zur Spitze, normiert (in der Seitenebene). */
function achse(gx: number, gy: number, px: number, py: number): [number, number, number] {
  const l = Math.hypot(px - gx, py - gy) || 1;
  return [(px - gx) / l, (py - gy) / l, 0];
}

/**
 * Drehung eines Knochens bei Gewicht w: Rollen um die eigene Achse (in der Ruhe), dann Gieren um die Senkrechte, dann der
 * Winkel um die Querachse (wie bisher). `vz` ist das Vorzeichen des Winkels (Kiefer −vorn, Schädel +vorn). Gieren richtet
 * sich nach der Knochenachse (nicht nach `vorn`): positive Werte schwenken die Spitze nach +z.
 */
function knochenDrehung(vz: number, winkel: number, gieren: number, rollen: number, ax: [number, number, number], w: number): M3 {
  const rz = drehZ(vz * w * winkel * GRAD);
  if (gieren === 0 && rollen === 0) return rz;
  const ry = drehAchse(0, 1, 0, (ax[0] < 0 ? 1 : -1) * w * gieren * GRAD);
  const rr = drehAchse(ax[0], ax[1], ax[2], w * rollen * GRAD);
  return mal(rz, mal(ry, rr));
}

/**
 * Knochenteile einer Maul-Ableitung (Ruhe): Scharnier, Schädelgelenk, Spitzen (Unterkiefer: vorderster Punkt seiner
 * Lippe, beim Über-/Unterbiss eine eigene Stelle; Schädel: vorderster Punkt der Oberlippe) und Achsen Gelenk → Spitze.
 */
function knochenGeometrie(abl: MaulErgebnis, opt: Pick<MaulOptionen, 'schaedelGelenk'>) {
  const m = abl.maul;
  const X = abl.kaefig.xyz;
  const sg = schaedelGelenk(m, opt);
  const oben = m.pfad[0]!;
  const unten = m.unten[0] ?? oben;
  const spitzeOben: [number, number, number] = [X[3 * oben]!, X[3 * oben + 1]!, 0];
  const spitzeUnten: [number, number, number] = [X[3 * unten]!, X[3 * unten + 1]!, 0];
  return { sg, spitzeOben, spitzeUnten, achseUnten: achse(m.scharnier.x, m.scharnier.y, spitzeUnten[0], spitzeUnten[1]), achseOben: achse(sg.x, sg.y, spitzeOben[0], spitzeOben[1]) };
}

/**
 * Skin einer Stellung auf einer Maul-Ableitung (Gewichte, Scharnier, Schädelgelenk, Plattenkante aus `abl.maul`; die
 * Öffnungsart aus `opt`). Reihenfolge wie `maulPose`: Unterkiefer (Drehung bzw. Gleiten, dann Zug), Beutel, Schädel.
 */
export function skinBerechnen(abl: MaulErgebnis, opt: Pick<MaulOptionen, 'oeffnungsart' | 'schaedelGelenk'>, st: Stellung): Skin {
  const m = abl.maul;
  const n = abl.kaefig.n;
  const X = abl.kaefig.xyz;
  const zieht = opt.oeffnungsart === 'ziehen';
  const weite = st.zugWeite * m.laenge;
  const g = knochenGeometrie(abl, opt);
  const sg = g.sg;
  const hx = m.scharnier.x;
  const hy = m.scharnier.y;
  const zx = st.kieferZug[0] * m.laenge * m.vorn;
  const zy = st.kieferZug[1] * m.laenge;
  const zz = st.seitUnten * m.laenge;
  // Verschiebung der Plattenkante je Ring (ganzer Kiefer, ohne Gewicht), rechts und links — die Kehlhaut folgt ihrer Seite
  const R = abl.vorlage.R;
  const kanten = new Float64Array(6 * R);
  const voll = zieht ? EINHEIT : knochenDrehung(-m.vorn, st.winkelUnten, st.gierenUnten, st.rollenUnten, g.achseUnten, 1);
  for (let r = 0; r < R; r++) {
    for (const [k, sz] of [[0, 1], [3, -1]] as const) {
      const ex = m.plattenKante[3 * r]!;
      const ey = m.plattenKante[3 * r + 1]!;
      const ez = sz * m.plattenKante[3 * r + 2]!;
      if (zieht) {
        kanten[6 * r + k] = weite * m.zug.x;
        kanten[6 * r + k + 1] = weite * m.zug.y;
        kanten[6 * r + k + 2] = zz;
      } else {
        const x = ex - hx;
        const y = ey - hy;
        const z = ez;
        kanten[6 * r + k] = hx + voll[0] * x + voll[1] * y + voll[2] * z - ex + zx;
        kanten[6 * r + k + 1] = hy + voll[3] * x + voll[4] * y + voll[5] * z - ey + zy;
        kanten[6 * r + k + 2] = voll[6] * x + voll[7] * y + voll[8] * z - ez + zz;
      }
    }
  }
  const sk: Skin = { n, r: new Float64Array(9 * n), t: new Float64Array(3 * n) };
  for (let i = 0; i < n; i++) {
    let rot: M3 = EINHEIT;
    let tx = 0;
    let ty = 0;
    let tz = 0;
    // Drehung D um (px, py, 0) nach der bisherigen Transformation: R ← D·R, t ← D·t + p − D·p
    const drehe = (D: M3, px: number, py: number) => {
      const nx = D[0] * tx + D[1] * ty + D[2] * tz + px - (D[0] * px + D[1] * py);
      const ny = D[3] * tx + D[4] * ty + D[5] * tz + py - (D[3] * px + D[4] * py);
      const nz = D[6] * tx + D[7] * ty + D[8] * tz - (D[6] * px + D[7] * py);
      tx = nx;
      ty = ny;
      tz = nz;
      rot = rot === EINHEIT ? D : mal(D, rot);
    };
    const wu = m.gewichtUnten[i]!;
    if (wu > 0) {
      if (zieht) {
        tx += wu * weite * m.zug.x;
        ty += wu * weite * m.zug.y;
        tz += wu * zz;
      } else {
        drehe(knochenDrehung(-m.vorn, st.winkelUnten, st.gierenUnten, st.rollenUnten, g.achseUnten, wu), hx, hy);
        tx += wu * zx;
        ty += wu * zy;
        tz += wu * zz;
      }
    }
    const wb = m.beutelGewicht[i]!;
    if (wb > 0) {
      const o = 6 * m.beutelRing[i]! + (X[3 * i + 2]! < 0 ? 3 : 0);
      tx += wb * kanten[o]!;
      ty += wb * kanten[o + 1]!;
      tz += wb * kanten[o + 2]!;
    }
    const wo = m.gewichtOben[i]!;
    if (wo > 0) drehe(knochenDrehung(m.vorn, st.winkelOben, st.gierenOben, st.rollenOben, g.achseOben, wo), sg.x, sg.y);
    sk.r.set(rot, 9 * i);
    sk.t[3 * i] = tx;
    sk.t[3 * i + 1] = ty;
    sk.t[3 * i + 2] = tz;
  }
  return sk;
}

/** Skin auf Käfiglagen (Ruhe → posiert). */
export function skinAnwenden(sk: Skin, ruhe: ArrayLike<number>, aus = new Float64Array(ruhe.length)): Float64Array {
  const R = sk.r;
  for (let i = 0; i < sk.n; i++) {
    const x = ruhe[3 * i]!;
    const y = ruhe[3 * i + 1]!;
    const z = ruhe[3 * i + 2]!;
    const o = 9 * i;
    aus[3 * i] = R[o]! * x + R[o + 1]! * y + R[o + 2]! * z + sk.t[3 * i]!;
    aus[3 * i + 1] = R[o + 3]! * x + R[o + 4]! * y + R[o + 5]! * z + sk.t[3 * i + 1]!;
    aus[3 * i + 2] = R[o + 6]! * x + R[o + 7]! * y + R[o + 8]! * z + sk.t[3 * i + 2]!;
  }
  return aus;
}

/** Umkehrung (posiert → Ruhe): Rᵀ·(p − t). */
export function skinUmkehren(sk: Skin, posiert: ArrayLike<number>, aus = new Float64Array(posiert.length)): Float64Array {
  for (let i = 0; i < sk.n; i++) {
    const d = versatzInRuhe(sk, i, [posiert[3 * i]! - sk.t[3 * i]!, posiert[3 * i + 1]! - sk.t[3 * i + 1]!, posiert[3 * i + 2]! - sk.t[3 * i + 2]!]);
    aus[3 * i] = d[0];
    aus[3 * i + 1] = d[1];
    aus[3 * i + 2] = d[2];
  }
  return aus;
}

/** Versatz eines Punkts aus der Pose in die Ruhe zurückdrehen (Rᵀ·d, ohne Verschiebung). */
export function versatzInRuhe(sk: Skin, i: number, d: readonly [number, number, number]): [number, number, number] {
  const R = sk.r;
  const o = 9 * i;
  return [R[o]! * d[0] + R[o + 3]! * d[1] + R[o + 6]! * d[2], R[o + 1]! * d[0] + R[o + 4]! * d[1] + R[o + 7]! * d[2], R[o + 2]! * d[0] + R[o + 5]! * d[1] + R[o + 8]! * d[2]];
}

export type V3 = [number, number, number];

/**
 * Knochen einer Stellung, posiert in 3D (zum Zeichnen und Greifen; Gewicht 1 je Knochen): Unterkiefer (Basis nach dem Zug,
 * Spitze, Mitte, Rollgriff seitlich der Mitte), Schädel (Gelenk, Spitze, Mitte, Rollgriff) und die Achsen in der Pose.
 */
export type KnochenPunkte = {
  kieferBasis: V3;
  kieferSpitze: V3;
  kieferMitte: V3;
  kieferRolle: V3;
  schaedelBasis: V3;
  schaedelSpitze: V3;
  schaedelMitte: V3;
  schaedelRolle: V3;
};

export function knochenPunkte(abl: MaulErgebnis, opt: Pick<MaulOptionen, 'oeffnungsart' | 'schaedelGelenk'>, st: Stellung): KnochenPunkte {
  const m = abl.maul;
  const g = knochenGeometrie(abl, opt);
  const L = m.laenge;
  const anw = (D: M3, p: V3, o: V3): V3 => [o[0] + D[0] * (p[0] - o[0]) + D[1] * (p[1] - o[1]) + D[2] * (p[2] - o[2]), o[1] + D[3] * (p[0] - o[0]) + D[4] * (p[1] - o[1]) + D[5] * (p[2] - o[2]), o[2] + D[6] * (p[0] - o[0]) + D[7] * (p[1] - o[1]) + D[8] * (p[2] - o[2])];
  const plus = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mitte = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const H: V3 = [m.scharnier.x, m.scharnier.y, 0];
  const S: V3 = [g.sg.x, g.sg.y, 0];
  const seitlich: V3 = [0, 0, 0.3 * L];
  let kieferBasis: V3;
  let kieferSpitze: V3;
  let kieferRolle: V3;
  if (opt.oeffnungsart === 'ziehen') {
    const v: V3 = [st.zugWeite * L * m.zug.x, st.zugWeite * L * m.zug.y, st.seitUnten * L];
    kieferBasis = plus(H, v);
    kieferSpitze = plus(g.spitzeUnten, v);
    kieferRolle = plus(mitte(kieferBasis, kieferSpitze), seitlich);
  } else {
    const Dj = knochenDrehung(-m.vorn, st.winkelUnten, st.gierenUnten, st.rollenUnten, g.achseUnten, 1);
    const zug: V3 = [st.kieferZug[0] * L * m.vorn, st.kieferZug[1] * L, st.seitUnten * L];
    kieferBasis = plus(H, zug);
    kieferSpitze = plus(anw(Dj, g.spitzeUnten, H), zug);
    const mRuhe = mitte(H, g.spitzeUnten);
    kieferRolle = plus(anw(Dj, plus(mRuhe, seitlich), H), zug);
  }
  const Ds = knochenDrehung(m.vorn, st.winkelOben, st.gierenOben, st.rollenOben, g.achseOben, 1);
  const schaedelSpitze = anw(Ds, g.spitzeOben, S);
  const sMitteRuhe = mitte(S, g.spitzeOben);
  return {
    kieferBasis,
    kieferSpitze,
    kieferMitte: mitte(kieferBasis, kieferSpitze),
    kieferRolle,
    schaedelBasis: S,
    schaedelSpitze,
    schaedelMitte: mitte(S, schaedelSpitze),
    schaedelRolle: anw(Ds, plus(sMitteRuhe, seitlich), S),
  };
}
