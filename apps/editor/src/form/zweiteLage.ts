// Pose und Grundform sind zwei Lagen derselben Form und teilen ihr Netz (21.11.2026, Plan „Maul, Zähne, Zunge“, Etappe 8). Wächst das
// Netz in der Lage, in der gearbeitet wird (verdichtet, aufgeräumt), braucht jeder neue Punkt auch einen Ort in der anderen. Bis
// dahin bekam er dort seinen Ort aus dieser Lage minus den gemittelten Versatz seiner Nachbarn. Wo sich der Versatz von Punkt zu Punkt
// stark ändert (an den Lippen eines Mauls, das in der Pose weit offen geformt ist), lag er damit neben seiner Stelle: gemessen an
// „teat firefish“ nach einem Zug an der Lippe bis 0,6, nach dem großen Maul bis 5 Einheiten längs der Fläche und bis 1,5 quer zu ihr.
// Die Grundform bekam dort kleine Dellen, obwohl in ihr niemand etwas angefasst hatte.
//
// Hier nimmt ein neuer Punkt seinen Platz mit: In der Lage, in der das Netz gewachsen ist, liegt er auf einem Dreieck des alten
// Netzes (das nächste, mit Gewichten); in der anderen Lage liegt er an derselben Stelle desselben Dreiecks, und zwar auf der runden
// Fläche darüber (das gewölbte Dreieck, das die Normalen seiner Ecken vorgeben, wie `verdichten` einen neuen Punkt auf seine Kante
// legt). So liegt er, wo das Verdichten ihn in der anderen Lage selbst hingelegt hätte: Deren Form ändert sich nicht. Und wo beide
// Lagen deckungsgleich sind (alle Nachbarn haben denselben Versatz), teilt er diesen Versatz genau.
import type { Haut } from '@ee/shape/dicht';

/** so genau (als Anteil der Kante) müssen die Ecken eines Dreiecks denselben Versatz haben, damit ein neuer Punkt darin ihn genau teilt */
const GLEICH = 1 / 200;

export type ZweiLagen = {
  /** das Netz vor dem Wechsel (Dreiecke und Nachbarn; seine Lagen stehen in `altVon` und `altNach`) */
  alt: Haut;
  /** seine Lagen in der Lage, in der das Netz gewachsen ist (mit dem neuen Netz mitgegangen: `altMitgegangen`) */
  altVon: ArrayLike<number>;
  /** seine Lagen in der anderen Lage */
  altNach: ArrayLike<number>;
  /** das Netz danach, mit seinen Lagen in der Lage, in der es gewachsen ist */
  neu: Haut;
  /** je Punkt von `neu` seine Nummer in `alt` (−1: neu); die gebliebenen stehen vorn */
  altNr: Int32Array;
  /** harte Punkte von `alt`: An ihnen zählt die Fläche des Dreiecks selbst, keine über die Kante gemittelte Normale */
  hart?: Uint8Array | null;
};

/** der nächste Punkt des Dreiecks (a, b, c) zu p (Ericson, Real-Time Collision Detection, 5.1.5): Gewichte von b und c, Abstand² */
function aufDreieck(P: ArrayLike<number>, ia: number, ib: number, ic: number, px: number, py: number, pz: number, aus: { wb: number; wc: number; d2: number }): void {
  const ax = P[3 * ia]!;
  const ay = P[3 * ia + 1]!;
  const az = P[3 * ia + 2]!;
  const abx = P[3 * ib]! - ax;
  const aby = P[3 * ib + 1]! - ay;
  const abz = P[3 * ib + 2]! - az;
  const acx = P[3 * ic]! - ax;
  const acy = P[3 * ic + 1]! - ay;
  const acz = P[3 * ic + 2]! - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  let wb = 0;
  let wc = 0;
  if (!(d1 <= 0 && d2 <= 0)) {
    const d3 = d1 - (abx * abx + aby * aby + abz * abz);
    const d4 = d2 - (acx * abx + acy * aby + acz * abz);
    if (d3 >= 0 && d4 <= d3) wb = 1;
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) wb = d1 / (d1 - d3);
      else {
        const d5 = d1 - (abx * acx + aby * acy + abz * acz);
        const d6 = d2 - (acx * acx + acy * acy + acz * acz);
        if (d6 >= 0 && d5 <= d6) wc = 1;
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) wc = d2 / (d2 - d6);
          else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              wc = (d4 - d3) / (d4 - d3 + (d5 - d6));
              wb = 1 - wc;
            } else {
              const de = 1 / (va + vb + vc);
              wb = vb * de;
              wc = vc * de;
            }
          }
        }
      }
    }
  }
  const dx = apx - wb * abx - wc * acx;
  const dy = apy - wb * aby - wc * acy;
  const dz = apz - wb * abz - wc * acz;
  aus.wb = wb;
  aus.wc = wc;
  aus.d2 = dx * dx + dy * dy + dz * dz;
}

/**
 * Die Lagen des alten Netzes, mit dem neuen mitgegangen: Ein gebliebener Punkt steht, wo er jetzt steht; ein weggefallener hat
 * sich bewegt wie seine gebliebenen Nachbarn (im Mittel). Ein Netzwechsel kann die Haut auch bewegen (das Aufräumen setzt sie): Der
 * Platz eines neuen Punkts wird auf der alten Fläche gesucht, wie sie danach läge, sonst hinge er um diese Bewegung nach.
 */
export function altMitgegangen(alt: Haut, neuPos: ArrayLike<number>, altNr: Int32Array): Float64Array {
  const out = Float64Array.from(alt.pos);
  const neuNr = new Int32Array(alt.n).fill(-1);
  for (let i = 0; i < altNr.length && altNr[i]! >= 0; i++) neuNr[altNr[i]!] = i;
  for (let v = 0; v < alt.n; v++) {
    const i = neuNr[v]!;
    if (i >= 0) {
      out[3 * v] = neuPos[3 * i]!;
      out[3 * v + 1] = neuPos[3 * i + 1]!;
      out[3 * v + 2] = neuPos[3 * i + 2]!;
      continue;
    }
    let zahl = 0;
    let x = 0;
    let y = 0;
    let z = 0;
    for (const w of alt.nachbarn[v]!) {
      const j = neuNr[w]!;
      if (j < 0) continue;
      x += neuPos[3 * j]! - alt.pos[3 * w]!;
      y += neuPos[3 * j + 1]! - alt.pos[3 * w + 1]!;
      z += neuPos[3 * j + 2]! - alt.pos[3 * w + 2]!;
      zahl++;
    }
    if (!zahl) continue;
    out[3 * v] = alt.pos[3 * v]! + x / zahl;
    out[3 * v + 1] = alt.pos[3 * v + 1]! + y / zahl;
    out[3 * v + 2] = alt.pos[3 * v + 2]! + z / zahl;
  }
  return out;
}

/**
 * Die neuen Punkte eines gewachsenen Netzes in der anderen Lage legen. `lagen`: die Lagen des neuen Netzes in der anderen Lage; für
 * die gebliebenen Punkte fertig, für die neuen ein Ersatz (er bleibt nur, wo ein Punkt keinen Platz findet).
 *
 * Der Platz: Gesucht wird nur unter den Dreiecken um die alten Punkte neben dem neuen (Ring um Ring: Ein neuer Punkt ohne alten
 * Nachbarn sucht um die Dreiecke seiner schon gelegten Nachbarn), und nur auf der Seite der Haut, auf der er liegt (wo zwei Häute
 * aufeinanderliegen, Gaumen und Boden eines geschlossenen Mauls, läge er sonst auf der anderen).
 *
 * Der Ort: Haben die drei Ecken seines Dreiecks denselben Versatz zwischen den zwei Lagen (auf `GLEICH` der Kante genau), sind die
 * Lagen dort deckungsgleich, und der neue Punkt teilt diesen Versatz genau: Eine Pose, die an einer Stelle nichts ändert, bleibt
 * dort genau die Grundform. Sonst liegt er an seinem Platz auf der runden Fläche der anderen Lage. Spiegelgleich. Ergebnis: wie
 * viele Punkte gelegt wurden.
 */
export function neuePunkteLegen(z: ZweiLagen, lagen: Float64Array): number {
  const { alt, neu, altNr } = z;
  const hart = z.hart ?? null;
  const AV = z.altVon;
  const AN = z.altNach;
  const von = neu.pos;
  const n = neu.n;
  let m = 0;
  while (m < n && altNr[m]! >= 0) m++;
  const zahl = n - m;
  if (zahl <= 0 || alt.n === 0) return 0;
  const T = alt.tri;
  const nT = T.length / 3;
  // Dreiecke je alter Punkt (als ein Feld)
  const start = new Int32Array(alt.n + 1);
  for (let i = 0; i < T.length; i++) start[T[i]! + 1] = start[T[i]! + 1]! + 1;
  for (let v = 0; v < alt.n; v++) start[v + 1] = start[v + 1]! + start[v]!;
  const liste = new Int32Array(T.length);
  const fuell = start.slice(0, alt.n);
  for (let t = 0; t < nT; t++)
    for (let e = 0; e < 3; e++) {
      const v = T[3 * t + e]!;
      liste[fuell[v]!] = t;
      fuell[v] = fuell[v]! + 1;
    }
  // Normalen der neuen Punkte im neuen Netz (nur für die Seite)
  const seite = new Float64Array(3 * zahl);
  const N = neu.tri;
  for (let t = 0; t < N.length; t += 3) {
    const a = N[t]!;
    const b = N[t + 1]!;
    const c = N[t + 2]!;
    if (a < m && b < m && c < m) continue;
    const ux = von[3 * b]! - von[3 * a]!;
    const uy = von[3 * b + 1]! - von[3 * a + 1]!;
    const uz = von[3 * b + 2]! - von[3 * a + 2]!;
    const vx = von[3 * c]! - von[3 * a]!;
    const vy = von[3 * c + 1]! - von[3 * a + 1]!;
    const vz = von[3 * c + 2]! - von[3 * a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      if (v < m) continue;
      seite[3 * (v - m)] = seite[3 * (v - m)]! + nx;
      seite[3 * (v - m) + 1] = seite[3 * (v - m) + 1]! + ny;
      seite[3 * (v - m) + 2] = seite[3 * (v - m) + 2]! + nz;
    }
  }
  /** Normale des alten Dreiecks t in den Lagen P (nicht auf eins gebracht) */
  const fn = new Float64Array(3);
  const flaeche = (P: ArrayLike<number>, t: number): void => {
    const a = 3 * T[3 * t]!;
    const b = 3 * T[3 * t + 1]!;
    const c = 3 * T[3 * t + 2]!;
    const ux = P[b]! - P[a]!;
    const uy = P[b + 1]! - P[a + 1]!;
    const uz = P[b + 2]! - P[a + 2]!;
    const vx = P[c]! - P[a]!;
    const vy = P[c + 1]! - P[a + 1]!;
    const vz = P[c + 2]! - P[a + 2]!;
    fn[0] = uy * vz - uz * vy;
    fn[1] = uz * vx - ux * vz;
    fn[2] = ux * vy - uy * vx;
  };
  // ---------- der Platz jedes neuen Punkts: Dreieck des alten Netzes und Gewichte, in der Lage, in der das Netz gewachsen ist ----------
  const platz = new Int32Array(zahl).fill(-1);
  const gew = new Float64Array(3 * zahl);
  const gesehen = new Int32Array(nT).fill(-1);
  const treffer = { wb: 0, wc: 0, d2: 0 };
  /** die neuen Punkte in der Reihenfolge, in der sie ihren Platz fanden (Ring um Ring von den alten Punkten aus) */
  const reihe: number[] = [];
  let offen = zahl;
  while (offen > 0) {
    /** in dieser Runde gefunden: Punkt, Dreieck, Gewichte (erst am Ende eingetragen: die Reihenfolge der Punkte zählt nicht) */
    const fund: number[] = [];
    for (let i = 0; i < zahl; i++) {
      if (platz[i]! >= 0) continue;
      const v = m + i;
      const px = von[3 * v]!;
      const py = von[3 * v + 1]!;
      const pz = von[3 * v + 2]!;
      const sx = seite[3 * i]!;
      const sy = seite[3 * i + 1]!;
      const sz = seite[3 * i + 2]!;
      let best = Infinity;
      let bt = -1;
      let bb = 0;
      let bc = 0;
      // (auf der anderen Seite der Haut: nur, wenn sich sonst nichts findet)
      let fern = Infinity;
      let ft = -1;
      let fb = 0;
      let fc = 0;
      const um = (o: number): void => {
        for (let k = start[o]!; k < start[o + 1]!; k++) {
          const t = liste[k]!;
          if (gesehen[t] === v) continue;
          gesehen[t] = v;
          aufDreieck(AV, T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!, px, py, pz, treffer);
          if (!Number.isFinite(treffer.d2)) continue;
          flaeche(AV, t);
          if (fn[0]! * sx + fn[1]! * sy + fn[2]! * sz >= 0) {
            if (treffer.d2 < best) {
              best = treffer.d2;
              bt = t;
              bb = treffer.wb;
              bc = treffer.wc;
            }
          } else if (treffer.d2 < fern) {
            fern = treffer.d2;
            ft = t;
            fb = treffer.wb;
            fc = treffer.wc;
          }
        }
      };
      for (const w of neu.nachbarn[v]!) {
        if (w < m) um(altNr[w]!);
        else if (platz[w - m]! >= 0) {
          const t = platz[w - m]!;
          um(T[3 * t]!);
          um(T[3 * t + 1]!);
          um(T[3 * t + 2]!);
        }
      }
      if (bt < 0 && ft >= 0) {
        bt = ft;
        bb = fb;
        bc = fc;
      }
      if (bt >= 0) fund.push(i, bt, bb, bc);
    }
    if (!fund.length) break;
    for (let k = 0; k < fund.length; k += 4) {
      const i = fund[k]!;
      platz[i] = fund[k + 1]!;
      gew[3 * i] = 1 - fund[k + 2]! - fund[k + 3]!;
      gew[3 * i + 1] = fund[k + 2]!;
      gew[3 * i + 2] = fund[k + 3]!;
      reihe.push(i);
      offen--;
    }
  }
  // ---------- der Ort in der anderen Lage ----------
  /** Normale eines alten Punkts in der anderen Lage: Summe der Flächennormalen seiner Dreiecke (wie `verdichten`), erst bei Bedarf */
  const normal = new Float64Array(3 * alt.n);
  const hatNormal = new Uint8Array(alt.n);
  const normalVon = (v: number): void => {
    if (hatNormal[v]) return;
    hatNormal[v] = 1;
    let x = 0;
    let y = 0;
    let zz = 0;
    for (let k = start[v]!; k < start[v + 1]!; k++) {
      flaeche(AN, liste[k]!);
      x += fn[0]!;
      y += fn[1]!;
      zz += fn[2]!;
    }
    const l = Math.hypot(x, y, zz) || 1;
    normal[3 * v] = x / l;
    normal[3 * v + 1] = y / l;
    normal[3 * v + 2] = zz / l;
  };
  const E = new Float64Array(9);
  const Nn = new Float64Array(9);
  /** Kontrollpunkt nahe der Ecke i auf der Kante zur Ecke j: (2·Pi + Pj − ((Pj − Pi)·Ni)·Ni) / 3 */
  const K = new Float64Array(18);
  const q = [0, 0, 0];
  let gelegt = 0;
  for (const i of reihe) {
    const t = platz[i]!;
    const v = m + i;
    const a = gew[3 * i]!;
    const b = gew[3 * i + 1]!;
    const c = gew[3 * i + 2]!;
    // haben die drei Ecken seines Dreiecks denselben Versatz zwischen den Lagen, teilt ihn der neue Punkt genau
    {
      const p1 = 3 * T[3 * t]!;
      const p2 = 3 * T[3 * t + 1]!;
      const p3 = 3 * T[3 * t + 2]!;
      let weit = 0;
      let lang2 = 0;
      for (let k = 0; k < 3; k++) {
        const d1 = AV[p1 + k]! - AN[p1 + k]!;
        const d2 = AV[p2 + k]! - AN[p2 + k]!;
        const d3 = AV[p3 + k]! - AN[p3 + k]!;
        q[k] = a * d1 + b * d2 + c * d3;
        weit = Math.max(weit, Math.abs(d1 - d2), Math.abs(d2 - d3), Math.abs(d3 - d1));
        lang2 += (AN[p2 + k]! - AN[p1 + k]!) ** 2;
      }
      if (weit <= GLEICH * Math.sqrt(lang2)) {
        for (let k = 0; k < 3; k++) lagen[3 * v + k] = von[3 * v + k]! - q[k]!;
        gelegt++;
        continue;
      }
    }
    // die runde Fläche über dem Dreieck (gewölbtes Dreieck nach den Normalen seiner Ecken, wie PN-Dreiecke)
    flaeche(AN, t);
    const f0 = fn[0]!;
    const f1 = fn[1]!;
    const f2 = fn[2]!;
    const fl = Math.hypot(f0, f1, f2) || 1;
    let lang = 0;
    for (let e = 0; e < 3; e++) {
      const p = T[3 * t + e]!;
      E[3 * e] = AN[3 * p]!;
      E[3 * e + 1] = AN[3 * p + 1]!;
      E[3 * e + 2] = AN[3 * p + 2]!;
      if (hart?.[p]) {
        Nn[3 * e] = f0 / fl;
        Nn[3 * e + 1] = f1 / fl;
        Nn[3 * e + 2] = f2 / fl;
      } else {
        normalVon(p);
        Nn[3 * e] = normal[3 * p]!;
        Nn[3 * e + 1] = normal[3 * p + 1]!;
        Nn[3 * e + 2] = normal[3 * p + 2]!;
      }
    }
    // (die Kante von i nach j steht in K am Platz 3 · (2 · i + (j ist der nächste ? 0 : 1)))
    for (let e = 0; e < 3; e++)
      for (let s = 0; s < 2; s++) {
        const j = (e + 1 + s) % 3;
        const dx = E[3 * j]! - E[3 * e]!;
        const dy = E[3 * j + 1]! - E[3 * e + 1]!;
        const dz = E[3 * j + 2]! - E[3 * e + 2]!;
        lang = Math.max(lang, Math.hypot(dx, dy, dz));
        const w = dx * Nn[3 * e]! + dy * Nn[3 * e + 1]! + dz * Nn[3 * e + 2]!;
        for (let c = 0; c < 3; c++) K[3 * (2 * e + s) + c] = (2 * E[3 * e + c]! + E[3 * j + c]! - w * Nn[3 * e + c]!) / 3;
      }
    for (let k = 0; k < 3; k++) {
      const p1 = E[k]!;
      const p2 = E[3 + k]!;
      const p3 = E[6 + k]!;
      // (erste Ziffer: Ecke 1, dann 2, dann 3)
      const b210 = K[k]!;
      const b201 = K[3 + k]!;
      const b021 = K[6 + k]!;
      const b120 = K[9 + k]!;
      const b102 = K[12 + k]!;
      const b012 = K[15 + k]!;
      const mitteK = (b210 + b201 + b021 + b120 + b102 + b012) / 6;
      const b111 = mitteK + (mitteK - (p1 + p2 + p3) / 3) / 2;
      const rund = p1 * a * a * a + p2 * b * b * b + p3 * c * c * c + 3 * (b210 * a * a * b + b120 * a * b * b + b201 * a * a * c + b102 * a * c * c + b021 * b * b * c + b012 * b * c * c) + 6 * b111 * a * b * c;
      const flach = a * p1 + b * p2 + c * p3;
      q[k] = rund - flach;
      lagen[3 * v + k] = flach;
    }
    // wie `verdichten`: Die Wölbung hebt den Punkt höchstens ein Viertel der Kante über sein Dreieck
    const hoch = Math.hypot(q[0]!, q[1]!, q[2]!);
    const g = hoch > 0.25 * lang ? (0.25 * lang) / hoch : 1;
    if (Number.isFinite(hoch)) for (let k = 0; k < 3; k++) lagen[3 * v + k] = lagen[3 * v + k]! + g * q[k]!;
    gelegt++;
  }
  // ---------- spiegelgleich: je Paar das Mittel, Punkte der Mitte in der Mitte ----------
  for (let v = m; v < n; v++) {
    const w = neu.spiegel[v]!;
    if (w === v) lagen[3 * v + 2] = 0;
    else if (w > v && platz[v - m]! >= 0 && platz[w - m]! >= 0) {
      for (let k = 0; k < 3; k++) {
        const um = k === 2 ? -1 : 1;
        const mittel = 0.5 * (lagen[3 * v + k]! + um * lagen[3 * w + k]!);
        lagen[3 * v + k] = mittel;
        lagen[3 * w + k] = um * mittel;
      }
    }
  }
  return gelegt;
}
