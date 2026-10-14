// Kiefer getrennt (Phase 2, M2): Die überhängende Oberlippe als eigenes Band-Netz (Florian 15.10.: „die blaue und die
// rote Linie geben genau die Lippenkanten vor; von unten sehe ich die Maultasche des Oberkiefers“). Das Band hängt an der
// Lippenschleife (blau, obere Kopie) und reicht außen bis zur roten Kante: Außenseite, Boden, Innenseite (eine Lippendicke
// innen). Es folgt der posierten Schleife (Schädel) und ist kein Teil des Käfigs — dort kreuzte sich die Klappe an jedem
// Wechsel der Bauweise und an dünnen Stellen.
import type { MaulErgebnis } from './maul';
import { DESKRIPTOR_FLOATS } from './deskriptoren';

type V3 = [number, number, number];

/** gleichmäßige kubische B-Spline-Kurve durch Kontrollpunkte (Grenzkurve einer scharfen Falte), u in [0, n − 1] */
function bspline(pts: readonly V3[], u: number): V3 {
  const n = pts.length;
  const i = Math.min(n - 2, Math.max(0, Math.floor(u)));
  const f = Math.min(1, Math.max(0, u - i));
  const p0 = pts[Math.max(0, i - 1)]!;
  const p1 = pts[i]!;
  const p2 = pts[Math.min(n - 1, i + 1)]!;
  const p3 = pts[Math.min(n - 1, i + 2)]!;
  const f2 = f * f;
  const f3 = f2 * f;
  const b0 = (1 - 3 * f + 3 * f2 - f3) / 6;
  const b1 = (4 - 6 * f2 + 3 * f3) / 6;
  const b2 = (1 + 3 * f + 3 * f2 - 3 * f3) / 6;
  const b3 = f3 / 6;
  return [b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0], b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1], b0 * p0[2] + b1 * p1[2] + b2 * p2[2] + b3 * p3[2]];
}

function lerp(a: V3, b: V3, f: number): V3 {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/**
 * Band-Netz der überhängenden Oberlippe aus dem posierten Käfig `xyz` (Welt). Je Seite: Abtastung der Schleifen-
 * Grenzkurve (B-Spline der oberen Kopie, über die Naht und den Winkel hinaus fortgesetzt), Versatz zur roten Kante und
 * Einwärtsrichtung je Spalte linear überblendet und mit dem Schädel gedreht. Deskriptoren der Ecken: die des
 * Schleifenpunkts (Außenseite = Lippenband), Boden und Innenseite als Rachen. `atlas` je Ecke vom Schleifenpunkt.
 */
export function klappeNetz(abl: MaulErgebnis, xyz: Float64Array, oeffnung: number, feinDesk: Float32Array | null, punktAtl: Float32Array | null, hebung = 0): { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null; atlas: Float32Array | null } | null {
  const m = abl.maul;
  const kl = m.klappe;
  if (!kl) return null;
  const mL = m.lage.m;
  const aO = (oeffnung * m.opt.winkelOben * Math.PI) / 180;
  const X0 = abl.kaefig.xyz;
  const P = (a: Float64Array, i: number): V3 => [a[3 * i]!, a[3 * i + 1]!, a[3 * i + 2]!];
  const pos: number[] = [];
  const nrm: number[] = [];
  const desk: number[] = [];
  const atl: number[] = [];
  const JE_SPALTE = 3;
  for (const links of [false, true]) {
    const pf = links ? m.pfadLinks : m.pfad;
    const un = links ? m.untenLinks : m.unten;
    const sz = links ? -1 : 1;
    // Kontrollpunkte: zwei Punkte der anderen Seite vor der Naht, die Schleife, dann die untere Kette hinter dem Winkel
    const andere = links ? m.pfad : m.pfadLinks;
    const ctrl: V3[] = [P(xyz, andere[2]!), P(xyz, andere[1]!)];
    for (let t = 0; t <= mL; t++) ctrl.push(P(xyz, pf[t]!));
    ctrl.push(P(xyz, un[mL - 1]!), P(xyz, un[Math.max(0, mL - 2)]!));
    // Versatz Rand − Schleife (Ruhe), Einwärtsrichtung, Dicke, Höhe je Spalte, mit dem Schädel gedreht
    const off: V3[] = [];
    const inw: V3[] = [];
    for (let t = 0; t <= mL; t++) {
      const wo = m.gewichtOben[pf[t]!]!;
      const w = m.vorn * wo * aO;
      const c = Math.cos(w);
      const s = Math.sin(w);
      // Maße sind für die rechte Seite gemerkt: Versatz gegen die rechte Ruhe-Schleife, z gespiegelt
      const r0 = P(X0, m.pfad[t]!);
      const rand = P(kl.rand, t);
      const o: V3 = [rand[0] - r0[0], rand[1] - r0[1], (rand[2] - r0[2]) * sz];
      const n0 = P(kl.inw, t);
      const n: V3 = [n0[0], n0[1], n0[2] * sz];
      off.push([o[0] * c - o[1] * s, o[0] * s + o[1] * c, o[2]]);
      inw.push([n[0] * c - n[1] * s, n[0] * s + n[1] * c, n[2]]);
    }
    const S = mL * JE_SPALTE;
    const spalte: { top: V3; bottom: V3; inner: V3; innerTop: V3; t: number }[] = [];
    for (let i = 0; i <= S; i++) {
      const u = i / JE_SPALTE; // 0 … mL
      const t0 = Math.min(mL - 1, Math.floor(u));
      const f = u - t0;
      const top = bspline(ctrl, u + 2);
      const o = lerp(off[t0]!, off[t0 + 1]!, f);
      const n = lerp(inw[t0]!, inw[t0 + 1]!, f);
      const d = kl.dicke[t0]! + (kl.dicke[t0 + 1]! - kl.dicke[t0]!) * f;
      const bottom: V3 = [top[0] + o[0], top[1] + o[1], top[2] + o[2]];
      spalte.push({ top, bottom, inner: [bottom[0] + n[0] * d, bottom[1] + n[1] * d, bottom[2] + n[2] * d], innerTop: [top[0] + n[0] * d, top[1] + n[1] * d, top[2] + n[2] * d], t: Math.round(u) });
    }
    const dreieck = (a: V3, b: V3, c: V3, richtung: V3, t: number, rachen: boolean) => {
      // Umlaufsinn so, dass die Normale in `richtung` zeigt
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-12) return;
      nx /= l; ny /= l; nz /= l;
      const ecken = nx * richtung[0] + ny * richtung[1] + nz * richtung[2] >= 0 ? [a, b, c] : [a, c, b];
      if (nx * richtung[0] + ny * richtung[1] + nz * richtung[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const q = Math.min(mL, Math.max(0, t));
      const basis = pf[q]!;
      for (const e of ecken) {
        pos.push(e[0], e[1] + hebung, e[2]);
        nrm.push(nx, ny, nz);
        if (feinDesk) {
          const o = basis * DESKRIPTOR_FLOATS;
          for (let k = 0; k < DESKRIPTOR_FLOATS; k++) desk.push(feinDesk[o + k]!);
          const d0 = desk.length - DESKRIPTOR_FLOATS;
          if (rachen) {
            desk[d0 + 4] = 0.75;
            desk[d0 + 5] = 0;
          } else desk[d0 + 5] = 0;
        }
        if (punktAtl) atl.push(punktAtl[2 * basis]!, punktAtl[2 * basis + 1]!);
      }
    };
    for (let i = 0; i < S; i++) {
      const a = spalte[i]!;
      const b = spalte[i + 1]!;
      const aus: V3 = [-((inw[a.t]![0] + inw[b.t]![0]) / 2), -((inw[a.t]![1] + inw[b.t]![1]) / 2), -((inw[a.t]![2] + inw[b.t]![2]) / 2)];
      const runter: V3 = [0, -1, 0];
      const rein: V3 = [-aus[0], -aus[1], -aus[2]];
      // Außenseite (zeigt nach außen), Boden (nach unten), Innenseite (nach innen zum Unterkiefer)
      dreieck(a.top, b.top, b.bottom, aus, a.t, false);
      dreieck(a.top, b.bottom, a.bottom, aus, a.t, false);
      dreieck(a.bottom, b.bottom, b.inner, runter, a.t, true);
      dreieck(a.bottom, b.inner, a.inner, runter, a.t, true);
      dreieck(a.inner, b.inner, b.innerTop, rein, a.t, true);
      dreieck(a.inner, b.innerTop, a.innerTop, rein, a.t, true);
    }
  }
  if (pos.length === 0) return null;
  return { positionen: Float32Array.from(pos), normalen: Float32Array.from(nrm), desk: feinDesk ? Float32Array.from(desk) : null, atlas: punktAtl ? Float32Array.from(atl) : null };
}
