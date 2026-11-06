// Form zuerst (06.11.2026), Prüffälle für Beweis B „Haut aus den Kurven“ (`docs/plans/2026-11-06-kurven-als-wahrheit.md`): Kugel mit
// drei Loops wie im Fenster (Ring waagerecht = Rand, Mitte, Ring senkrecht), gezogen wie Florian im Fenster. Für den Test
// `ausKurven.test.ts` und das Bild `apps/editor/scripts/pruefen/form-b-bild.ts`.
import { loopEinsetzen } from './einsetzen';
import { type Haut, type V3, hautAus } from './kurven';
import {
  type HautArt,
  type Loop,
  LoopZug,
  eckenAuto,
  festlegen,
  formAusZeichnung,
  knickWinkel,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  verschiebungLaengs,
} from './loops';
import { rundAusSeite } from './rund';

/** Radius der Kugel */
export const R = 150;

export function kugel(): Haut {
  const n = rundAusSeite(
    [
      { x: R, y: 0 },
      { x: 0, y: R },
      { x: -R, y: 0 },
      { x: 0, y: -R },
    ],
    { dreiecke: 6000 },
  );
  return hautAus(n.positionen, n.indizes);
}

/** drei Loops wie im Fenster: Ring waagerecht (Rand), Mitte, Ring senkrecht; eingesetzt, Kreuzungen als Punkte */
export function dreiLoops(): { h: Haut; loops: Loop[] } {
  let h = kugel();
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (let i = 0; i < loops.length; i++)
    for (let j = i + 1; j < loops.length; j++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
  return { h, loops };
}

/** Abstand der Haut zur Kugel um den Ursprung: größter und mittlerer (Einheiten) */
export function rundheit(h: Haut, nur?: (p: V3) => boolean): { max: number; mittel: number } {
  let max = 0;
  let s = 0;
  let n = 0;
  for (let v = 0; v < h.n; v++) {
    const p = { x: h.pos[3 * v]!, y: h.pos[3 * v + 1]!, z: h.pos[3 * v + 2]! };
    if (nur && !nur(p)) continue;
    const d = Math.abs(Math.hypot(p.x, p.y, p.z) - R);
    max = Math.max(max, d);
    s += d;
    n++;
  }
  return { max, mittel: s / Math.max(1, n) };
}

/** Knick quer über einen Loop (Grad je Probe): Median, 10 %, größter */
export function knick(h: Haut, l: Loop): { median: number; p10: number; max: number } {
  const k = Array.from(knickWinkel(h, l))
    .filter((x) => Number.isFinite(x))
    .sort((a, b) => a - b);
  return { median: k[k.length >> 1]!, p10: k[Math.floor(0.1 * k.length)]!, max: k[k.length - 1]! };
}

/** Knicke zwischen Nachbardreiecken über 60°, umgeklappte Dreiecke (gegen die Normale ihrer Ecken) */
export function falten(h: Haut): { ueber60: number; umgeklappt: number } {
  const P = h.pos;
  const T = h.tri;
  const fn: number[][] = [];
  const vn = new Float64Array(P.length);
  for (let t = 0; t < T.length; t += 3) {
    const [a, b, c] = [T[t]!, T[t + 1]!, T[t + 2]!];
    const ab = [0, 1, 2].map((k) => P[3 * b + k]! - P[3 * a + k]!);
    const ac = [0, 1, 2].map((k) => P[3 * c + k]! - P[3 * a + k]!);
    const f = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
    fn.push(f);
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] = vn[3 * v + k]! + f[k]!;
  }
  let umgeklappt = 0;
  for (let t = 0; t < T.length; t += 3) {
    const f = fn[t / 3]!;
    const m = [0, 1, 2].map((k) => vn[3 * T[t]! + k]! + vn[3 * T[t + 1]! + k]! + vn[3 * T[t + 2]! + k]!);
    if (f[0]! * m[0]! + f[1]! * m[1]! + f[2]! * m[2]! < 0) umgeklappt++;
  }
  const kanten = new Map<number, number[]>();
  for (let t = 0; t < T.length / 3; t++)
    for (let e = 0; e < 3; e++) {
      const a = T[3 * t + e]!;
      const b = T[3 * t + ((e + 1) % 3)]!;
      const k = Math.min(a, b) * h.n + Math.max(a, b);
      kanten.set(k, [...(kanten.get(k) ?? []), t]);
    }
  const einheit = (f: number[]) => {
    const l = Math.hypot(f[0]!, f[1]!, f[2]!) || 1;
    return f.map((x) => x / l);
  };
  let ueber60 = 0;
  for (const ts of kanten.values()) {
    if (ts.length !== 2) continue;
    const p = einheit(fn[ts[0]!]!);
    const q = einheit(fn[ts[1]!]!);
    if (p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]! < 0.5) ueber60++;
  }
  return { ueber60, umgeklappt };
}

/** ein Zug über die ganze Haut: in Schritten bis zur Verschiebung, dann Runden zum Stillstand; danach liegen die Loops fest */
export function ziehen(h: Haut, loops: Loop[], versch: (Float64Array | null)[], art: HautArt, schritte = 16, ende = 8): void {
  const z = new LoopZug(h, loops, null, true, art);
  for (let s = 1; s <= schritte; s++) z.schritt(versch.map((d) => (d ? d.map((x) => (x * s) / schritte) : null)), 2);
  z.schritt(versch, ende);
  for (const l of loops) festlegen(h, l);
}

/** neu rechnen ohne Zug (nach einer Änderung der Härte oder dem Löschen einer Linie) */
export function neuRechnen(h: Haut, loops: Loop[], art: HautArt, runden = 20): void {
  const z = new LoopZug(h, loops, null, true, art);
  z.schritt(
    loops.map(() => null),
    runden,
  );
  for (const l of loops) festlegen(h, l);
}

/** Punkt (u, v) eines Profils (u quer, v = Höhe; Rand bei v = 0, |u| = r) auf die Kappe mit Scheitel bei Höhe ±H legen */
function aufKappe(u: number, v: number, r: number, H: number): [number, number] {
  const Rk = (r * r + H * H) / (2 * H);
  const c = H - Rk;
  const phi0 = Math.atan2(-c, r);
  const a = Math.atan2(Math.abs(v), u);
  const phi = phi0 + (Math.PI - 2 * phi0) * (a / Math.PI);
  return [Rk * Math.cos(phi), Math.sign(v || 1) * (c + Rk * Math.sin(phi))];
}

/** Verschiebung der Proben der Loops quer über den Rand auf die Linse (Mitte in der x-y-Ebene, senkrechter Ring in z-y) */
export function linsenVerschiebung(loops: Loop[], H: number): (Float64Array | null)[] {
  return loops.map((l, li) => {
    if (li === 0) return null;
    const d = new Float64Array(l.ruhe.length);
    for (let j = 0; j < l.proben.length; j++) {
      const x = l.ruhe[3 * j]!;
      const y = l.ruhe[3 * j + 1]!;
      const z = l.ruhe[3 * j + 2]!;
      if (Math.abs(y) < 1e-6) continue;
      if (l.art === 'mitte') {
        const [u, v] = aufKappe(x, y, Math.hypot(x, y), H);
        d[3 * j] = u - x;
        d[3 * j + 1] = v - y;
      } else {
        const [u, v] = aufKappe(z, y, Math.hypot(z, y), H);
        d[3 * j + 2] = u - z;
        d[3 * j + 1] = v - y;
      }
    }
    return d;
  });
}

/** die unterste Kreuzung des senkrechten Rings um dy hinauf (in allen Loops, die sie tragen), wie im Fenster */
export function untenHinauf(loops: Loop[], dy: number): (Float64Array | null)[] {
  const senkrecht = loops[2]!;
  const k = senkrecht.punkte.reduce((b, p) => (p.ref.y < b.ref.y ? p : b)).kreuzung!;
  return loops.map((l) => {
    const i = l.punkte.findIndex((p) => p.kreuzung === k);
    if (i < 0) return null;
    const d = verschiebungLaengs(
      l,
      l.punkte.map((_, q) => (q === i ? { x: 0, y: dy, z: 0 } : { x: 0, y: 0, z: 0 })),
    );
    if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
    return d;
  });
}

/**
 * Wie `untenHinauf`, aber die Querlinien knicken am Rand wirklich: Unter dem Rand wird jede ein Bézier-Stück von der Kreuzung mit
 * dem Rand zum hinaufgezogenen untersten Punkt, der Griff am Rand zeigt zu diesem Punkt (wie Blenders „Vector“), der Griff unten
 * liegt waagerecht (glatt wie vorher). So würde eine Linie mit echten Griffen knicken; heute knickt an einer Ecke von selbst nur die
 * Verschiebung, die Linie läuft senkrecht über den Rand weiter.
 */
export function untenHinaufGeknickt(loops: Loop[], dy: number): (Float64Array | null)[] {
  const senkrecht = loops[2]!;
  const unten = senkrecht.punkte.reduce((b, p) => (p.ref.y < b.ref.y ? p : b));
  const P3 = { ...unten.ref, y: unten.ref.y + dy };
  return loops.map((l, li) => {
    if (li === 0) return null;
    const d = new Float64Array(l.ruhe.length);
    const iu = l.punkte.findIndex((p) => p.kreuzung === unten.kreuzung);
    // je Kreuzung mit dem Rand das Stück bis zum untersten Punkt
    for (const r of l.punkte.filter((p) => loops[0]!.punkte.some((q) => q.kreuzung !== undefined && q.kreuzung === p.kreuzung))) {
      const s0 = r.s;
      let s1 = l.punkte[iu]!.s;
      if (l.art !== 'ring' && Math.abs(s1 - s0) > l.laenge / 2) s1 += s1 < s0 ? l.laenge : -l.laenge;
      const P0 = r.ref;
      const L = Math.hypot(P3.x - P0.x, P3.y - P0.y, P3.z - P0.z);
      const P1 = { x: P0.x + (P3.x - P0.x) / 3, y: P0.y + (P3.y - P0.y) / 3, z: P0.z + (P3.z - P0.z) / 3 };
      // waagerecht zur Kreuzung hin
      const w = Math.hypot(P0.x - P3.x, P0.z - P3.z) || 1;
      const P2 = { x: P3.x + ((P0.x - P3.x) / w) * (L / 3), y: P3.y, z: P3.z + ((P0.z - P3.z) / w) * (L / 3) };
      for (let j = 0; j < l.proben.length; j++) {
        let sj = l.s[j]!;
        if (l.art !== 'ring') {
          if (s1 > l.laenge && sj < s0) sj += l.laenge;
          if (s1 < 0 && sj > s0) sj -= l.laenge;
        }
        const t = (sj - s0) / (s1 - s0);
        if (!(t > 0 && t <= 1)) continue;
        const a = (1 - t) ** 3;
        const b = 3 * (1 - t) ** 2 * t;
        const c = 3 * (1 - t) * t * t;
        const e = t ** 3;
        d[3 * j] = a * P0.x + b * P1.x + c * P2.x + e * P3.x - l.ruhe[3 * j]!;
        d[3 * j + 1] = a * P0.y + b * P1.y + c * P2.y + e * P3.y - l.ruhe[3 * j + 1]!;
        d[3 * j + 2] = l.art === 'mitte' ? 0 : a * P0.z + b * P1.z + c * P2.z + e * P3.z - l.ruhe[3 * j + 2]!;
      }
    }
    return d;
  });
}

/** den Rand (Ring waagerecht) hart oder weich setzen; Ecken von selbst an seinen Kreuzungen wie im Fenster */
export function randHart(loops: Loop[], hart: number): void {
  const rand = loops[0]!;
  rand.haerte = hart;
  for (const p of rand.punkte) p.haerte = hart;
  eckenAuto(loops);
}

/** Lage der Form im Fall `loeschen` (Seite) */
export const AUGE = { x: -60, y: 70, r: 35 };

export type BFall = 'kugel' | 'linse-hart' | 'linse-weich' | 'pilz-hart' | 'pilz-weich' | 'pilz-geknickt' | 'nachtraeglich' | 'loeschen';
export const B_FAELLE: BFall[] = ['kugel', 'linse-hart', 'linse-weich', 'pilz-hart', 'pilz-weich', 'pilz-geknickt', 'nachtraeglich', 'loeschen'];

/**
 * Ein Fall mit einem Löser: die Haut danach, die Loops (der Rand ist `loops[0]`) und die Haut an einem Zwischenstand (`vorher`:
 * beim nachträglichen Härten die weiche Form, beim Löschen die hinausgezogene Form).
 */
export function bFall(fall: BFall, art: HautArt): { h: Haut; loops: Loop[]; vorher: Haut | null } {
  if (fall === 'loeschen') {
    const { h: h0, loops: l0 } = dreiLoops();
    // eine Form um ein Auge auf der Seite (mit Abstand zu den anderen Loops), als Ganzes 20 nach außen, dann gelöscht
    const uv: [number, number][] = Array.from({ length: 64 }, (_, i) => [AUGE.x + AUGE.r * Math.cos((2 * Math.PI * i) / 64), AUGE.y + AUGE.r * Math.sin((2 * Math.PI * i) / 64)]);
    const auge = formAusZeichnung(h0, 'seite', uv, Array.from({ length: 8 }, (_, i) => 8 * i), 9)!;
    const r = loopEinsetzen(h0, [...l0, auge], l0.length)!;
    const h = r.haut;
    const loops = r.loops;
    const a = loops[loops.length - 1]!;
    const D = a.punkte.map((p) => {
      const n = Math.hypot(p.ref.x, p.ref.y, p.ref.z);
      return { x: (20 * p.ref.x) / n, y: (20 * p.ref.y) / n, z: (20 * p.ref.z) / n };
    });
    ziehen(h, loops, [...loops.slice(0, -1).map(() => null), verschiebungLaengs(a, D)], art);
    const vorher = { ...h, pos: Float64Array.from(h.pos) };
    loops.pop();
    neuRechnen(h, loops, art);
    return { h, loops, vorher };
  }
  const { h, loops } = dreiLoops();
  if (fall === 'kugel') {
    neuRechnen(h, loops, art, 30);
    return { h, loops, vorher: null };
  }
  if (fall === 'nachtraeglich') {
    ziehen(h, loops, untenHinauf(loops, 120), art);
    const vorher = { ...h, pos: Float64Array.from(h.pos) };
    randHart(loops, 3);
    neuRechnen(h, loops, art);
    return { h, loops, vorher };
  }
  randHart(loops, fall.endsWith('weich') ? 0 : 3);
  const versch =
    fall === 'pilz-geknickt' ? untenHinaufGeknickt(loops, 120) : fall.startsWith('linse') ? linsenVerschiebung(loops, 80) : untenHinauf(loops, 120);
  ziehen(h, loops, versch, art);
  return { h, loops, vorher: null };
}
