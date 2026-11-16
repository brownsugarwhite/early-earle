// Zeichnen (08.11.2026, Plan „Zeichnen, Aufblasen, Schneiden, Anbauen“): ein Bézier-Pfad aus Ankern wie in Illustrator.
//
// Ein Anker hat seine Lage und zwei Griffe als Vektoren vom Anker aus: `ein` zum vorigen Stück, `aus` zum nächsten (null: kein
// Griff, das Stück läuft dort gerade auf den Nachbarn zu). Glatt heißt: Die Griffe liegen auf einer Geraden; an einer Ecke sind sie
// frei. Koordinaten sind Blattkoordinaten oder Welt — der Pfad rechnet nur in 2D. DOM-frei.

import type { V2 } from '../bezier';
import type { UmrissPunkt } from '../dicht/umriss';

export type Anker = { x: number; y: number; ein: V2 | null; aus: V2 | null; ecke: boolean };
export type Pfad = { anker: Anker[]; geschlossen: boolean };
/** Ein kubisches Stück: Anfang, zwei Kontrollpunkte, Ende (absolut) */
export type Stueck = [V2, V2, V2, V2];

const DRITTEL = 1 / 3;

/** Kontrollpunkte des Stücks von Anker a nach Anker b (fehlende Griffe: ein Drittel der Sehne gerade auf den Nachbarn zu) */
export function stueckZwischen(a: Anker, b: Anker): Stueck {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p1 = a.aus ? { x: a.x + a.aus.x, y: a.y + a.aus.y } : { x: a.x + dx * DRITTEL, y: a.y + dy * DRITTEL };
  const p2 = b.ein ? { x: b.x + b.ein.x, y: b.y + b.ein.y } : { x: b.x - dx * DRITTEL, y: b.y - dy * DRITTEL };
  return [{ x: a.x, y: a.y }, p1, p2, { x: b.x, y: b.y }];
}

/** Alle Stücke des Pfads in der Reihenfolge der Anker (geschlossen: samt Schlussstück) */
export function stuecke(p: Pfad): Stueck[] {
  const A = p.anker;
  const n = A.length;
  const aus: Stueck[] = [];
  const m = p.geschlossen ? n : n - 1;
  for (let i = 0; i < m; i++) aus.push(stueckZwischen(A[i]!, A[(i + 1) % n]!));
  return aus;
}

export function punktAufStueck(s: Stueck, t: number): V2 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x, y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y };
}

/** Grobe Länge eines Stücks (Kontrollpolygon und Sehne gemittelt) */
export function stueckLaenge(s: Stueck): number {
  const poly = Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y) + Math.hypot(s[2].x - s[1].x, s[2].y - s[1].y) + Math.hypot(s[3].x - s[2].x, s[3].y - s[2].y);
  const sehne = Math.hypot(s[3].x - s[0].x, s[3].y - s[0].y);
  return (poly + sehne) / 2;
}

/**
 * Den Pfad dicht abtasten (etwa alle `h`). Ergebnis: Punkte und je Punkt, ob er ein Anker mit Ecke ist. Geschlossen ohne den
 * doppelten Schlusspunkt.
 */
export function abtasten(p: Pfad, h: number): { punkte: V2[]; ecke: boolean[]; anker: number[] } {
  const punkte: V2[] = [];
  const ecke: boolean[] = [];
  const anker: number[] = [];
  const S = stuecke(p);
  S.forEach((s, i) => {
    const n = Math.max(1, Math.ceil(stueckLaenge(s) / Math.max(h, 1e-9)));
    anker.push(punkte.length);
    for (let k = 0; k < n; k++) {
      punkte.push(punktAufStueck(s, k / n));
      ecke.push(k === 0 && p.anker[i]!.ecke);
    }
  });
  if (!p.geschlossen && p.anker.length > 0) {
    const l = p.anker[p.anker.length - 1]!;
    anker.push(punkte.length);
    punkte.push({ x: l.x, y: l.y });
    ecke.push(l.ecke);
  }
  return { punkte, ecke, anker };
}

/**
 * Umriss für das Aufblasen (`rundAusSeite`, Welt mit y nach oben): der Pfad dicht abgetastet, Ecken als Ecken. Die runden Griffe von
 * `umrissStuecke` legen sich bei dichten Punkten genau auf den Pfad; so bleibt der Kern unverändert.
 */
export function umrissPunkte(p: Pfad, h: number): UmrissPunkt[] {
  const { punkte, ecke } = abtasten({ ...p, geschlossen: true }, h);
  return punkte.map((q, i) => (ecke[i] ? { x: q.x, y: q.y, ecke: true } : { x: q.x, y: q.y }));
}

/** Nächste Stelle auf dem Pfad zu q: Stück, Parameter, Punkt, Abstand (grob abgetastet, dann Newton) */
export function naechsteStelle(p: Pfad, q: V2): { stueck: number; t: number; p: V2; abstand: number } | null {
  const S = stuecke(p);
  let best: { stueck: number; t: number; p: V2; abstand: number } | null = null;
  S.forEach((s, i) => {
    const n = Math.max(8, Math.ceil(stueckLaenge(s) / 4));
    for (let k = 0; k <= n; k++) {
      let t = k / n;
      // zwei Newton-Schritte auf |B(t) − q|²
      for (let it = 0; it < 3; it++) {
        const b = punktAufStueck(s, t);
        const d1 = ableitung(s, t);
        const d2 = ableitung2(s, t);
        const rx = b.x - q.x;
        const ry = b.y - q.y;
        const f = rx * d1.x + ry * d1.y;
        const df = d1.x * d1.x + d1.y * d1.y + rx * d2.x + ry * d2.y;
        if (Math.abs(df) < 1e-12) break;
        t = Math.min(1, Math.max(0, t - f / df));
      }
      const b = punktAufStueck(s, t);
      const d = Math.hypot(b.x - q.x, b.y - q.y);
      if (!best || d < best.abstand) best = { stueck: i, t, p: b, abstand: d };
    }
  });
  return best;
}

export function ableitung(s: Stueck, t: number): V2 {
  const u = 1 - t;
  const a = 3 * u * u;
  const b = 6 * u * t;
  const c = 3 * t * t;
  return {
    x: a * (s[1].x - s[0].x) + b * (s[2].x - s[1].x) + c * (s[3].x - s[2].x),
    y: a * (s[1].y - s[0].y) + b * (s[2].y - s[1].y) + c * (s[3].y - s[2].y),
  };
}

export function ableitung2(s: Stueck, t: number): V2 {
  const u = 1 - t;
  return {
    x: 6 * u * (s[2].x - 2 * s[1].x + s[0].x) + 6 * t * (s[3].x - 2 * s[2].x + s[1].x),
    y: 6 * u * (s[2].y - 2 * s[1].y + s[0].y) + 6 * t * (s[3].y - 2 * s[2].y + s[1].y),
  };
}

/**
 * Einen Anker im Stück `i` bei `t` einfügen (de Casteljau): Die Linie bleibt genau, der neue Anker ist glatt, die Nachbarn
 * bekommen die geteilten Griffe.
 */
export function ankerEinfuegen(p: Pfad, i: number, t: number): Pfad {
  const n = p.anker.length;
  const a = p.anker[i]!;
  const b = p.anker[(i + 1) % n]!;
  const [p0, p1, p2, p3] = stueckZwischen(a, b);
  const l = (u: V2, v: V2, s: number): V2 => ({ x: u.x + (v.x - u.x) * s, y: u.y + (v.y - u.y) * s });
  const q0 = l(p0, p1, t);
  const q1 = l(p1, p2, t);
  const q2 = l(p2, p3, t);
  const r0 = l(q0, q1, t);
  const r1 = l(q1, q2, t);
  const m = l(r0, r1, t);
  const neu: Anker = { x: m.x, y: m.y, ein: { x: r0.x - m.x, y: r0.y - m.y }, aus: { x: r1.x - m.x, y: r1.y - m.y }, ecke: false };
  const anker = p.anker.map((x) => ({ ...x }));
  anker[i] = { ...anker[i]!, aus: { x: q0.x - a.x, y: q0.y - a.y } };
  const j = (i + 1) % n;
  anker[j] = { ...anker[j]!, ein: { x: q2.x - b.x, y: q2.y - b.y } };
  anker.splice(i + 1, 0, neu);
  return { ...p, anker };
}

/** Kopie (für Rückgängig) */
export function pfadKopie(p: Pfad): Pfad {
  return {
    geschlossen: p.geschlossen,
    anker: p.anker.map((a) => ({ ...a, ein: a.ein ? { ...a.ein } : null, aus: a.aus ? { ...a.aus } : null })),
  };
}

/**
 * Schneidet sich der Pfad selbst? (Abgetastet, Strecken gegeneinander; Nachbarn ausgenommen.) Ein Umriss, der sich kreuzt, lässt
 * sich nicht aufblasen (Teddy weist solche Striche ebenso ab).
 */
export function schneidetSich(p: Pfad, h: number): boolean {
  const { punkte } = abtasten(p, h);
  const n = punkte.length;
  const kreuz = (a: V2, b: V2, c: V2): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const m = p.geschlossen ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = punkte[i]!;
    const b = punkte[(i + 1) % n]!;
    for (let j = i + 2; j < m; j++) {
      if (p.geschlossen && i === 0 && j === m - 1) continue;
      const c = punkte[j]!;
      const d = punkte[(j + 1) % n]!;
      const d1 = kreuz(a, b, c);
      const d2 = kreuz(a, b, d);
      const d3 = kreuz(c, d, a);
      const d4 = kreuz(c, d, b);
      if (d1 * d2 < 0 && d3 * d4 < 0) return true;
    }
  }
  return false;
}
