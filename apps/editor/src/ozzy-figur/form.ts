// Ozzy-Figur: Formen aus Bézier-Ankern (wie in Florians Illustrator-Dateien) und was man mit ihnen rechnet.
// Eine Form ist ein geschlossener Pfad aus kubischen Stücken; Anker k hat seinen Griff davor (i) und danach (o), beide absolut.
// Stück k läuft von Anker k über o_k und i_(k+1) zu Anker k+1.

export type Punkt = [number, number];
export interface Anker {
  p: Punkt;
  i: Punkt;
  o: Punkt;
}
export type Form = Anker[];

export const ankerKopie = (a: Anker): Anker => ({ p: [a.p[0], a.p[1]], i: [a.i[0], a.i[1]], o: [a.o[0], a.o[1]] });
export const formKopie = (f: Form): Form => f.map(ankerKopie);

/** jeden Punkt (Anker und Griffe) abbilden */
export function abbilden(f: Form, abb: (q: Punkt) => Punkt): Form {
  return f.map((a) => ({ p: abb(a.p), i: abb(a.i), o: abb(a.o) }));
}
export const verschieben = (f: Form, dx: number, dy: number): Form => abbilden(f, (q) => [q[0] + dx, q[1] + dy]);
export const spiegeln = (f: Form, achseX: number): Form => abbilden(f, (q) => [2 * achseX - q[0], q[1]]);

export function schwerpunkt(f: Form): Punkt {
  let x = 0;
  let y = 0;
  for (const a of f) {
    x += a.p[0];
    y += a.p[1];
  }
  return [x / f.length, y / f.length];
}

/** Kasten über Anker und Griffe (die Kurve liegt sicher darin) */
export function kasten(f: Form): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const a of f)
    for (const q of [a.p, a.i, a.o]) {
      x0 = Math.min(x0, q[0]);
      y0 = Math.min(y0, q[1]);
      x1 = Math.max(x1, q[0]);
      y1 = Math.max(y1, q[1]);
    }
  return [x0, y0, x1, y1];
}

/** Punkt auf Stück k bei t */
export function punktAuf(f: Form, k: number, t: number): Punkt {
  const a = f[k]!;
  const b = f[(k + 1) % f.length]!;
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return [w0 * a.p[0] + w1 * a.o[0] + w2 * b.i[0] + w3 * b.p[0], w0 * a.p[1] + w1 * a.o[1] + w2 * b.i[1] + w3 * b.p[1]];
}

/** Stück k bei t formtreu teilen (de Casteljau): ein Anker mehr, die Kurve bleibt dieselbe */
export function teilen(f: Form, k: number, t: number): Form {
  const n = f.length;
  const a = f[k]!;
  const b = f[(k + 1) % n]!;
  const mix = (u: Punkt, v: Punkt): Punkt => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
  const q0 = mix(a.p, a.o);
  const q1 = mix(a.o, b.i);
  const q2 = mix(b.i, b.p);
  const r0 = mix(q0, q1);
  const r1 = mix(q1, q2);
  const s = mix(r0, r1);
  const neu = formKopie(f);
  neu[k]!.o = q0;
  neu[(k + 1) % n]!.i = q2;
  neu.splice(k + 1, 0, { p: s, i: r0, o: r1 });
  return neu;
}

/** Form als Polylinie (für den Renderer und für Messungen). `fein`: Bildpunkte je Teilstück ungefähr */
export function abflachen(f: Form, abb: (q: Punkt) => Punkt, fein = 1.5): number[] {
  const pts: number[] = [];
  const n = f.length;
  for (let k = 0; k < n; k++) {
    const a = f[k]!;
    const b = f[(k + 1) % n]!;
    const p0 = abb(a.p);
    const p1 = abb(a.o);
    const p2 = abb(b.i);
    const p3 = abb(b.p);
    const lang = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
    const sehne = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
    const m = lang - sehne < 0.02 ? 1 : Math.max(2, Math.min(96, Math.ceil(Math.sqrt(lang) * fein)));
    for (let j = 0; j < m; j++) {
      const t = j / m;
      const u = 1 - t;
      pts.push(
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      );
    }
  }
  return pts;
}

// ---- Morph ----------------------------------------------------------------------------------------------------------------

export type MorphArt = 'linear' | 'winkel' | 'aehnlich';
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpP = (a: Punkt, b: Punkt, t: number): Punkt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function winkelLerp(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}

/**
 * Zwei Formen mit gleicher Ankerzahl mischen.
 * - linear: jeder Punkt auf gerader Bahn
 * - winkel: Anker gerade, Griffe nach Winkel und Länge (glatte Anker bleiben glatt, Ecken bleiben Ecken)
 * - aehnlich: je Teil Drehung, Größe und Lage getrennt (für große Drehungen: Ohren, Schwanz), der Rest wie „winkel“
 */
export function morphen(a: Form, b: Form, t: number, art: MorphArt = 'winkel'): Form {
  if (a.length !== b.length) throw new Error(`Ankerzahl ${a.length} ≠ ${b.length}`);
  if (t <= 0) return formKopie(a);
  if (t >= 1) return formKopie(b);
  if (art === 'linear') return a.map((x, k) => ({ p: lerpP(x.p, b[k]!.p, t), i: lerpP(x.i, b[k]!.i, t), o: lerpP(x.o, b[k]!.o, t) }));
  if (art === 'winkel')
    return a.map((x, k) => {
      const y = b[k]!;
      const p = lerpP(x.p, y.p, t);
      const griff = (ga: Punkt, gb: Punkt): Punkt => {
        const la = Math.hypot(ga[0] - x.p[0], ga[1] - x.p[1]);
        const lb = Math.hypot(gb[0] - y.p[0], gb[1] - y.p[1]);
        if (la < 1e-6 && lb < 1e-6) return [p[0], p[1]];
        const wa = Math.atan2(ga[1] - x.p[1], ga[0] - x.p[0]);
        const wb = Math.atan2(gb[1] - y.p[1], gb[0] - y.p[0]);
        const w = la < 1e-6 ? wb : lb < 1e-6 ? wa : winkelLerp(wa, wb, t);
        const l = lerp(la, lb, t);
        return [p[0] + Math.cos(w) * l, p[1] + Math.sin(w) * l];
      };
      return { p, i: griff(x.i, y.i), o: griff(x.o, y.o) };
    });
  // aehnlich: b ≈ s·R·a + T (Procrustes über die Anker)
  const ca = schwerpunkt(a);
  const cb = schwerpunkt(b);
  let sxx = 0;
  let sxy = 0;
  let na = 0;
  for (let k = 0; k < a.length; k++) {
    const ax = a[k]!.p[0] - ca[0];
    const ay = a[k]!.p[1] - ca[1];
    const bx = b[k]!.p[0] - cb[0];
    const by = b[k]!.p[1] - cb[1];
    sxx += ax * bx + ay * by;
    sxy += ax * by - ay * bx;
    na += ax * ax + ay * ay;
  }
  const th = Math.atan2(sxy, sxx);
  const s = Math.hypot(sxx, sxy) / Math.max(na, 1e-9);
  const zurueck = (q: Punkt): Punkt => {
    const x = q[0] - cb[0];
    const y = q[1] - cb[1];
    const c = Math.cos(-th);
    const sn = Math.sin(-th);
    return [(c * x - sn * y) / s + ca[0], (sn * x + c * y) / s + ca[1]];
  };
  const mitte = morphen(a, abbilden(b, zurueck), t, 'winkel');
  const tht = th * t;
  const st = Math.exp(Math.log(s) * t);
  const ct = lerpP(ca, cb, t);
  const hin = (q: Punkt): Punkt => {
    const x = q[0] - ca[0];
    const y = q[1] - ca[1];
    const c = Math.cos(tht);
    const sn = Math.sin(tht);
    return [(c * x - sn * y) * st + ct[0], (sn * x + c * y) * st + ct[1]];
  };
  return abbilden(mitte, hin);
}

// ---- Abgleich ---------------------------------------------------------------------------------------------------------------

export interface Teilung {
  stueck: number;
  t: number;
  /** mittlerer Abstand der Anker zur Vergleichsform nach dem Teilen (Lage ausgeglichen) */
  rest: number;
}

/** mittlerer Abstand der Anker nach bester Drehung und Verschiebung (Procrustes ohne Größe) */
export function restNachDrehung(a: Form, b: Form): number {
  const ca = schwerpunkt(a);
  const cb = schwerpunkt(b);
  let sxx = 0;
  let sxy = 0;
  for (let k = 0; k < a.length; k++) {
    const ax = a[k]!.p[0] - ca[0];
    const ay = a[k]!.p[1] - ca[1];
    const bx = b[k]!.p[0] - cb[0];
    const by = b[k]!.p[1] - cb[1];
    sxx += ax * bx + ay * by;
    sxy += ax * by - ay * bx;
  }
  const th = Math.atan2(sxy, sxx);
  const c = Math.cos(th);
  const s = Math.sin(th);
  let r = 0;
  for (let k = 0; k < a.length; k++) {
    const ax = a[k]!.p[0] - ca[0];
    const ay = a[k]!.p[1] - ca[1];
    r += Math.hypot(c * ax - s * ay - (b[k]!.p[0] - cb[0]), s * ax + c * ay - (b[k]!.p[1] - cb[1]));
  }
  return r / a.length;
}

/**
 * Hat `kurz` einen Anker weniger als `ziel`, wird das Stück geteilt, nach dem die Anker am besten zu `ziel` passen
 * (nach bester Drehung und Verschiebung; so passt auch ein liegendes Bein zum stehenden). Die Kurve von `kurz` bleibt genau dieselbe.
 */
export function ankerErgaenzen(kurz: Form, ziel: Form): { form: Form; teilung: Teilung } {
  if (ziel.length - kurz.length !== 1) throw new Error(`Abgleich nur für einen fehlenden Anker (${kurz.length} → ${ziel.length})`);
  let best: { form: Form; teilung: Teilung } | null = null;
  for (let k = 0; k < kurz.length; k++)
    for (let t = 0.05; t < 0.96; t += 0.01) {
      const f = teilen(kurz, k, t);
      const rest = restNachDrehung(f, ziel);
      if (!best || rest < best.teilung.rest) best = { form: f, teilung: { stueck: k, t: Math.round(t * 100) / 100, rest } };
    }
  return best!;
}

/** größter Abstand zwischen zwei Formen gleicher Ankerzahl, Anker und Griffe (zum Prüfen von Spiegelpartnern) */
export function groessterAbstand(a: Form, b: Form): number {
  let m = 0;
  for (let k = 0; k < a.length; k++)
    for (const w of ['p', 'i', 'o'] as const) m = Math.max(m, Math.hypot(a[k]![w][0] - b[k]![w][0], a[k]![w][1] - b[k]![w][1]));
  return m;
}
