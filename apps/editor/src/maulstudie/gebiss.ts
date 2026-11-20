/**
 * Studie „Maul, Zähne, Zunge“ (20.11.2026): die Zähne auf dem Zahnfleisch.
 *
 * Eine Zahnreihe läuft längs der Lippe eines Kiefers, vom einen Mundwinkel um die Spitze zum anderen, gleichmäßig verteilt und
 * spiegelgleich. Jeder Zahn hat einen Platz in der Wand (Stelle s am Profil, z quer), ein Stück von der Lippe nach innen. Sein
 * Rahmen: x längs des Zahnfleischs, y in das Maul hinein (zum Gegenkiefer), z zur Lippe.
 */
import { Vector3 } from 'three';
import type { MaulSchnitt } from './schnitt';

export type GebissWerte = {
  /** Zähne je Kiefer */
  anzahl: number;
  /** Größe (1 = ein Zahn füllt seinen Platz in der Reihe) */
  groesse: number;
  /** Neigung nach außen, Bogenmaß */
  neigung: number;
  /** wie viel kleiner die Zähne nach hinten werden (0 … 0,9) */
  verlauf: number;
  /** wie weit die Reihe nach hinten reicht (Anteil der Lippe) */
  bis: number;
  /** Sitz: Abstand von der Lippe nach innen, in Breiten des Zahnfleischs (negativ: außen, vor der Lippe) */
  sitz: number;
};

export type ZahnPlatz = {
  /** Platz in der Wand in Ruhe: Stelle am Profil und z */
  s: number;
  z: number;
  /** Lage und Rahmen in Ruhe (bei geschlossenem Maul) */
  ort: Vector3;
  x: Vector3;
  y: Vector3;
  zl: Vector3;
  /** Maß des Zahns (Breite eines Platzes mal Größe und Verlauf) */
  mass: number;
  /** Abstand vom Scharnier (für den Platz zwischen den Kiefern) */
  r: number;
};

const breiteBei = (m: MaulSchnitt, s: number): number => {
  const x = Math.max(0, Math.min(1, s / m.sVorn)) * (m.breite.length - 1);
  const i = Math.floor(x);
  return m.breite[i]! + (m.breite[Math.min(m.breite.length - 1, i + 1)]! - m.breite[i]!) * (x - i);
};

/** Breite des Zahnfleischs (wie in der Farbe der Wand) */
export const fleischBreite = (m: MaulSchnitt): number => 0.11 * m.lang;

/** Abstand eines Orts der Wand von der Lippe (positiv innen), wie die Farbe der Wand ihn rechnet */
export function randAbstand(m: MaulSchnitt, s: number, z: number): number {
  const ds = m.sVorn / m.breite.length;
  const steig = (breiteBei(m, s + ds) - breiteBei(m, s - ds)) / (2 * ds);
  return Math.min((breiteBei(m, s) - Math.abs(z)) / Math.sqrt(1 + steig * steig), m.sVorn - s);
}

/** Lage und Rahmen eines Zahns an einem Platz der Wand */
export function platzBei(m: MaulSchnitt, oben: boolean, s: number, z: number, mass: number, neigung: number): ZahnPlatz {
  const o = m.profil.ort(s);
  const t = m.profil.tangente(s);
  const T = new Vector3(t.x, t.y, 0);
  // vom Boden zum Gaumen: die linke Normale der Linie, wenn der Oberkiefer links liegt
  const auf = new Vector3(-t.y, t.x, 0).multiplyScalar(m.obenLinks ? 1 : -1);
  const y = auf.clone().multiplyScalar(oben ? -1 : 1);
  // zur Lippe: in der Wand von der Mitte weg, vorn nach vorn (die Richtung, in der der Abstand zur Lippe am schnellsten fällt)
  const e = Math.max(0.5, 0.01 * m.lang);
  const gs = randAbstand(m, s + e, z) - randAbstand(m, s - e, z);
  const gz = randAbstand(m, s, z + e) - randAbstand(m, s, z - e);
  const zl = T.clone().multiplyScalar(-gs).add(new Vector3(0, 0, -gz));
  if (zl.lengthSq() < 1e-12) zl.copy(T);
  zl.normalize();
  const x = new Vector3().crossVectors(y, zl).normalize();
  const c = Math.cos(neigung);
  const sn = Math.sin(neigung);
  const yN = y.clone().multiplyScalar(c).addScaledVector(zl, sn);
  const zN = zl.clone().multiplyScalar(c).addScaledVector(y, -sn);
  return { s, z, ort: new Vector3(o.x, o.y, z), x, y: yN, zl: zN, mass, r: Math.hypot(o.x - m.C.x, o.y - m.C.y) };
}

/** die Plätze einer Zahnreihe */
export function reihe(m: MaulSchnitt, oben: boolean, w: GebissWerte): ZahnPlatz[] {
  // die Lippe einer Seite als Streckenzug in der Wand (s, z), von hinten zur Spitze
  const n = 96;
  const s0 = m.sVorn * (1 - w.bis);
  const P: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((m.sVorn - s0) * i) / n;
    P.push([s, i === n ? 0 : breiteBei(m, s)]);
  }
  const L = [0];
  for (let i = 1; i <= n; i++) L.push(L[i - 1]! + Math.hypot(P[i]![0] - P[i - 1]![0], P[i]![1] - P[i - 1]![1]));
  const lang = L[n]!;
  const bei = (l: number): { s: number; z: number; ts: number; tz: number } => {
    let i = 1;
    while (i < n && L[i]! < l) i++;
    const u = (l - L[i - 1]!) / (L[i]! - L[i - 1]! || 1);
    const a = P[i - 1]!;
    const b = P[i]!;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { s: a[0] + u * (b[0] - a[0]), z: a[1] + u * (b[1] - a[1]), ts: (b[0] - a[0]) / d, tz: (b[1] - a[1]) / d };
  };
  const platz = Math.min((2 * lang) / Math.max(1, w.anzahl), 0.34 * m.lang);
  const fb = fleischBreite(m);
  const aus: ZahnPlatz[] = [];
  for (let i = 0; i < w.anzahl; i++) {
    const l = (2 * lang * (i + 0.5)) / w.anzahl;
    const rechts = l > lang;
    const q = bei(rechts ? 2 * lang - l : l);
    // nach innen: quer zur Lippe, zur Mitte hin
    let ns = q.tz;
    let nz = -q.ts;
    if (ns * (0.5 * q.s - q.s) + nz * (0 - q.z) < 0) {
      ns = -ns;
      nz = -nz;
    }
    const s = q.s + ns * w.sitz * fb;
    const z = (q.z + nz * w.sitz * fb) * (rechts ? -1 : 1);
    const vorn = 1 - Math.abs(l / lang - 1);
    aus.push(platzBei(m, oben, Math.min(m.sVorn * 1.06, Math.max(0, s)), z, platz * w.groesse * (1 - w.verlauf * (1 - vorn)), w.neigung));
  }
  return aus;
}
