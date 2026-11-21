/**
 * Studie „Maul, Zähne, Zunge“ (20.11.2026): ein Zahn als Form aus wenigen Zahlen.
 *
 * Der Zahn steht in seinem eigenen Maß: +y ist seine Achse (vom Zahnfleisch zur Spitze), x läuft längs des Zahnfleischs, +z zeigt
 * zur Lippe. Die Krone ist ein Stapel von Ringen; der Querschnitt geht von der Klinge über rund bis kastig, das Profil von der
 * Kuppe über den Kegel bis zur Nadel, die Achse kann sich biegen. Unter dem Zahnfleisch sitzt die Wurzel (eine, zwei, drei oder
 * eine Knolle).
 */
import { BufferAttribute, BufferGeometry } from 'three';

export type Wurzel = 'keine' | 'kegel' | 'zwei' | 'drei' | 'knolle';
export type ZahnForm = {
  /** Länge der Krone, Breite längs des Zahnfleischs und Tiefe quer dazu (Breite 1 = ein Platz in der Reihe) */
  laenge: number;
  breite: number;
  tiefe: number;
  /** 0 = Kuppe, flach oben; 1 = spitz */
  spitze: number;
  /** Querschnitt: 2 = rund, darüber kastig */
  kasten: number;
  /** Biegung der Achse nach innen, in Bogenmaß */
  bogen: number;
  /** Höcker oben (Backenzahn): 0, 2 oder 4 */
  hoecker: number;
  wurzel: Wurzel;
  wurzelLaenge: number;
};

export const ZAHN_FORMEN: { name: string; form: ZahnForm }[] = [
  { name: 'Tropfen', form: { laenge: 1.35, breite: 0.86, tiefe: 0.72, spitze: 0.62, kasten: 2, bogen: 0.1, hoecker: 0, wurzel: 'kegel', wurzelLaenge: 0.9 } },
  { name: 'Spitz', form: { laenge: 1.75, breite: 0.78, tiefe: 0.64, spitze: 1, kasten: 2, bogen: 0.16, hoecker: 0, wurzel: 'kegel', wurzelLaenge: 1.1 } },
  { name: 'Säbel', form: { laenge: 2.7, breite: 0.8, tiefe: 0.62, spitze: 0.94, kasten: 2.1, bogen: 0.62, hoecker: 0, wurzel: 'kegel', wurzelLaenge: 1.5 } },
  { name: 'Nadel', form: { laenge: 2.1, breite: 0.42, tiefe: 0.4, spitze: 1, kasten: 2, bogen: 0.05, hoecker: 0, wurzel: 'kegel', wurzelLaenge: 0.8 } },
  { name: 'Blob', form: { laenge: 0.95, breite: 0.98, tiefe: 0.86, spitze: 0.12, kasten: 2.3, bogen: 0, hoecker: 0, wurzel: 'knolle', wurzelLaenge: 0.6 } },
  { name: 'Schaufel', form: { laenge: 1.3, breite: 1.0, tiefe: 0.42, spitze: 0.04, kasten: 3.4, bogen: 0.12, hoecker: 0, wurzel: 'kegel', wurzelLaenge: 1.2 } },
  { name: 'Backe', form: { laenge: 0.92, breite: 1.08, tiefe: 1.0, spitze: 0, kasten: 4.2, bogen: 0, hoecker: 4, wurzel: 'zwei', wurzelLaenge: 0.9 } },
  { name: 'Hauer', form: { laenge: 3.4, breite: 1.05, tiefe: 0.9, spitze: 0.82, kasten: 2, bogen: 0.42, hoecker: 0, wurzel: 'drei', wurzelLaenge: 1.4 } },
];

export const mischen = (a: ZahnForm, b: ZahnForm, t: number): ZahnForm => ({
  laenge: a.laenge + (b.laenge - a.laenge) * t,
  breite: a.breite + (b.breite - a.breite) * t,
  tiefe: a.tiefe + (b.tiefe - a.tiefe) * t,
  spitze: a.spitze + (b.spitze - a.spitze) * t,
  kasten: a.kasten + (b.kasten - a.kasten) * t,
  bogen: a.bogen + (b.bogen - a.bogen) * t,
  hoecker: t < 0.5 ? a.hoecker : b.hoecker,
  wurzel: t < 0.5 ? a.wurzel : b.wurzel,
  wurzelLaenge: a.wurzelLaenge + (b.wurzelLaenge - a.wurzelLaenge) * t,
});

/** Halbmesser der Krone über die Höhe u (0 am Zahnfleisch, 1 an der Spitze), 1 = volle Breite */
export function kronenProfil(f: ZahnForm, u: number): number {
  const p = 4.6 + (1.05 - 4.6) * f.spitze;
  const q = 0.42 + (1.0 - 0.42) * f.spitze;
  // ein leichter Bauch über dem Zahnfleisch (der Zahnhals ist schmaler)
  const bauch = 1 + 0.1 * Math.sin(Math.PI * Math.min(1, u * 1.7)) * (1 - f.spitze * 0.5);
  return Math.max(0, 1 - Math.pow(Math.min(1, u), p)) ** q * bauch * (0.86 + 0.14 * Math.min(1, u * 6));
}

export type Bau = { pos: number[]; idx: number[] };
const SEG = 20;

/** ein Stapel Ringe von `von` nach `bis` (Ortsfunktion je Ring und Winkel), unten und oben geschlossen */
function stapel(b: Bau, ringe: number, ort: (i: number, w: number) => [number, number, number], zuUnten: boolean, zuOben: boolean): void {
  const start = b.pos.length / 3;
  for (let i = 0; i < ringe; i++) {
    for (let k = 0; k < SEG; k++) {
      const p = ort(i, (2 * Math.PI * k) / SEG);
      b.pos.push(p[0], p[1], p[2]);
    }
  }
  for (let i = 0; i + 1 < ringe; i++) {
    for (let k = 0; k < SEG; k++) {
      const a = start + i * SEG + k;
      const c = start + i * SEG + ((k + 1) % SEG);
      const d = a + SEG;
      const e = c + SEG;
      b.idx.push(a, d, c, c, d, e);
    }
  }
  const deckel = (i: number, oben: boolean): void => {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let k = 0; k < SEG; k++) {
      x += b.pos[3 * (start + i * SEG + k)]!;
      y += b.pos[3 * (start + i * SEG + k) + 1]!;
      z += b.pos[3 * (start + i * SEG + k) + 2]!;
    }
    const m = b.pos.length / 3;
    b.pos.push(x / SEG, y / SEG, z / SEG);
    for (let k = 0; k < SEG; k++) {
      const a = start + i * SEG + k;
      const c = start + i * SEG + ((k + 1) % SEG);
      if (oben) b.idx.push(a, m, c);
      else b.idx.push(a, c, m);
    }
  };
  if (zuUnten) deckel(0, false);
  if (zuOben) deckel(ringe - 1, true);
}

const hoch = (x: number, n: number): number => Math.sign(x) * Math.pow(Math.abs(x), 2 / n);

/**
 * Die Wurzel für sich (der Teil unter dem Zahnfleisch): an `b` angehängt (oder ein neuer Bau). `hx`, `hz`: halbe Breite und Tiefe
 * der Krone, `L`: Länge der Wurzel. Die Linse hängt sie auch unter einen Zahn aus Linien (`ozzy/zahnGestalt.ts`).
 */
export function wurzelBau(wurzel: Wurzel, hx: number, hz: number, L: number, b: Bau = { pos: [], idx: [] }): Bau {
  if (wurzel === 'keine') return b;
  const zinke = (cx: number, cz: number, rx: number, rz: number, laenge: number, neig: number, knolle: boolean): void => {
    stapel(
      b,
      9,
      (i, w) => {
        const v = i / 8;
        const r = knolle ? Math.sqrt(Math.max(0, 1 - Math.pow(2 * v - 0.9, 2) * 0.83)) * (1 - 0.2 * v) : Math.pow(1 - v, 0.7) * (1 - 0.12 * Math.sin(Math.PI * v));
        return [cx * (1 + neig * v) + Math.cos(w) * rx * Math.max(0.03, r), -laenge * v, cz + Math.sin(w) * rz * Math.max(0.03, r)];
      },
      false,
      true,
    );
    // (der Deckel dieser Zinke zeigt nach unten: Die Ringe laufen abwärts, die Dreiecke stehen damit richtig herum nach innen;
    // für die Studie reicht beidseitig gezeichnet)
  };
  const hals = 0.86;
  if (wurzel === 'kegel') zinke(0, 0, hx * hals, hz * hals, L, 0, false);
  else if (wurzel === 'knolle') zinke(0, 0, hx * hals, hz * hals, L, 0, true);
  else if (wurzel === 'zwei') {
    zinke(-0.5 * hx, 0, hx * 0.5, hz * hals, L, 0.35, false);
    zinke(0.5 * hx, 0, hx * 0.5, hz * hals, L, 0.35, false);
  } else {
    zinke(-0.5 * hx, 0.3 * hz, hx * 0.46, hz * 0.52, L, 0.4, false);
    zinke(0.5 * hx, 0.3 * hz, hx * 0.46, hz * 0.52, L, 0.4, false);
    zinke(0, -0.45 * hz, hx * 0.46, hz * 0.5, L * 0.9, 0, false);
  }
  return b;
}

/** das Netz eines Zahns; `mitWurzel`: auch der Teil unter dem Zahnfleisch (in der Linse zu sehen, im Maul steckt er im Fleisch) */
export function zahnNetz(f: ZahnForm, mitWurzel = true): BufferGeometry {
  const b: Bau = { pos: [], idx: [] };
  const R = 16;
  const hx = 0.5 * f.breite;
  const hz = 0.5 * f.tiefe;
  // die Achse biegt sich nach innen (−z): ein Kreisbogen
  const achse = (u: number): { y: number; z: number; w: number } => {
    const w = f.bogen * u;
    if (Math.abs(f.bogen) < 1e-4) return { y: f.laenge * u, z: 0, w: 0 };
    const r = f.laenge / f.bogen;
    return { y: r * Math.sin(w), z: -r * (1 - Math.cos(w)), w };
  };
  stapel(
    b,
    R,
    (i, w) => {
      // oben dichter (die Spitze braucht die Ringe)
      const u = 1 - Math.pow(1 - i / (R - 1), 1.6);
      const r = kronenProfil(f, u);
      let x = hoch(Math.cos(w), f.kasten) * hx * r;
      let z = hoch(Math.sin(w), f.kasten) * hz * r;
      let dy = 0;
      if (f.hoecker > 0) {
        // Höcker: oben wölbt sich die Fläche an den Ecken und senkt sich in der Mitte
        const k = Math.pow(Math.min(1, u), 5);
        dy = 0.1 * f.laenge * k * (Math.cos(f.hoecker === 2 ? w * 2 : w * 4 + Math.PI) * 0.5 + 0.5);
        x *= 1 + 0.02 * k;
        z *= 1 + 0.02 * k;
      }
      const a = achse(u);
      // der Ring steht quer zur gebogenen Achse
      return [x, a.y + dy * Math.cos(a.w) + z * Math.sin(a.w), a.z + z * Math.cos(a.w) - dy * Math.sin(a.w)];
    },
    !mitWurzel || f.wurzel === 'keine',
    true,
  );
  if (mitWurzel && f.wurzel !== 'keine') wurzelBau(f.wurzel, hx, hz, f.wurzelLaenge, b);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(Float32Array.from(b.pos), 3));
  g.setIndex(b.idx);
  g.computeVertexNormals();
  return g;
}

/** der Umriss eines Zahns von vorn als Pfad (für die kleinen Zeichen am Ring der Linse): Breite 1 ≙ `mass` */
export function zahnUmriss(f: ZahnForm, mass: number): string {
  const n = 14;
  const links: string[] = [];
  const rechts: string[] = [];
  const max = Math.max(f.laenge, 1.2);
  const k = mass / max;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const r = kronenProfil(f, u) * 0.5 * f.breite * k;
    // (die Biegung zeigt im Zeichen zur Seite, damit man sie sieht)
    const dx = f.bogen * u * u * 0.5 * f.laenge * k;
    const y = -f.laenge * u * k;
    links.push(`${(dx - r).toFixed(2)},${y.toFixed(2)}`);
    rechts.unshift(`${(dx + r).toFixed(2)},${y.toFixed(2)}`);
  }
  return `M${links.join('L')}L${rechts.join('L')}Z`;
}
