// VERSUCH (11.10.2026): Catmull-Clark-Unterteilung mit halbscharfen Kanten (semi-sharp creases,
// DeRose/Kass/Truong 1998; Schärfe nimmt je Stufe um 1 ab, entlang einer Kante nach Chaikin geglättet).
// Entspricht Blenders Subdivision Surface mit Edge Crease: Schärfe 0 = rund, ≥ Stufenzahl = scharfe Kante,
// dazwischen eine Kante, die in eine runde Form übergeht („Verjüngung“ in Florians Konzept).

export type V3 = [number, number, number];

export type Netz = {
  punkte: V3[];
  /** Polygone (Indizes, gegen den Uhrzeigersinn von außen gesehen) */
  flaechen: number[][];
  /** Kantenschärfe je Kante, Schlüssel `a,b` mit a < b */
  schaerfe: Map<string, number>;
};

export const kante = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);

const plus = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mal = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

type KantenInfo = { a: number; b: number; flaechen: number[]; index: number };

/** Eine Unterteilungsstufe. */
export function unterteilen(netz: Netz): Netz {
  const { punkte, flaechen, schaerfe } = netz;
  const nV = punkte.length;

  // Kanten sammeln
  const kanten = new Map<string, KantenInfo>();
  const kantenListe: KantenInfo[] = [];
  flaechen.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      const k = kante(a, b);
      let info = kanten.get(k);
      if (!info) {
        info = { a: Math.min(a, b), b: Math.max(a, b), flaechen: [], index: kantenListe.length };
        kanten.set(k, info);
        kantenListe.push(info);
      }
      info.flaechen.push(fi);
    }
  });
  const nE = kantenListe.length;
  const s = (k: string) => schaerfe.get(k) ?? 0;

  // Flächenpunkte
  const fp: V3[] = flaechen.map((f) => mal(f.reduce<V3>((acc, i) => plus(acc, punkte[i]!), [0, 0, 0]), 1 / f.length));

  // Kantenpunkte
  const ep: V3[] = kantenListe.map((e) => {
    const mitte = mal(plus(punkte[e.a]!, punkte[e.b]!), 0.5);
    if (e.flaechen.length !== 2) return mitte;
    const glatt = mal(plus(plus(punkte[e.a]!, punkte[e.b]!), plus(fp[e.flaechen[0]!]!, fp[e.flaechen[1]!]!)), 0.25);
    const sh = s(kante(e.a, e.b));
    return sh >= 1 ? mitte : sh <= 0 ? glatt : lerp(glatt, mitte, sh);
  });

  // Nachbarschaft je Punkt
  const punktKanten: KantenInfo[][] = Array.from({ length: nV }, () => []);
  const punktFlaechen: number[][] = Array.from({ length: nV }, () => []);
  for (const e of kantenListe) {
    punktKanten[e.a]!.push(e);
    punktKanten[e.b]!.push(e);
  }
  flaechen.forEach((f, fi) => f.forEach((i) => punktFlaechen[i]!.push(fi)));

  // Punktpunkte (glatt, Kante, Ecke; halbscharf überblendet)
  const vp: V3[] = punkte.map((P, i) => {
    const ek = punktKanten[i]!;
    const n = ek.length;
    const Q = mal(punktFlaechen[i]!.reduce<V3>((acc, fi) => plus(acc, fp[fi]!), [0, 0, 0]), 1 / Math.max(1, punktFlaechen[i]!.length));
    const R = mal(ek.reduce<V3>((acc, e) => plus(acc, mal(plus(punkte[e.a]!, punkte[e.b]!), 0.5)), [0, 0, 0]), 1 / Math.max(1, n));
    const glatt = mal(plus(plus(Q, mal(R, 2)), mal(P, n - 3)), 1 / n);
    const scharf = ek.filter((e) => s(kante(e.a, e.b)) > 0);
    if (scharf.length < 2) return glatt;
    const vs = scharf.reduce((acc, e) => acc + s(kante(e.a, e.b)), 0) / scharf.length;
    let hart: V3;
    if (scharf.length === 2) {
      const o1 = scharf[0]!.a === i ? scharf[0]!.b : scharf[0]!.a;
      const o2 = scharf[1]!.a === i ? scharf[1]!.b : scharf[1]!.a;
      hart = mal(plus(plus(mal(P, 6), punkte[o1]!), punkte[o2]!), 1 / 8);
    } else {
      hart = P;
    }
    return vs >= 1 ? hart : lerp(glatt, hart, vs);
  });

  // neue Flächen: je Ecke ein Viereck
  const neueFlaechen: number[][] = [];
  flaechen.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const v = f[i]!;
      const vor = f[(i + 1) % f.length]!;
      const nach = f[(i - 1 + f.length) % f.length]!;
      neueFlaechen.push([v, nV + kanten.get(kante(v, vor))!.index, nV + nE + fi, nV + kanten.get(kante(nach, v))!.index]);
    }
  });

  // Schärfe der Kindkanten: Chaikin entlang der Kantenzüge, dann −1
  const neueSchaerfe = new Map<string, number>();
  for (const e of kantenListe) {
    const sh = s(kante(e.a, e.b));
    if (sh <= 0) continue;
    const nachbar = (v: number) => {
      const andere = punktKanten[v]!.filter((x) => x !== e && s(kante(x.a, x.b)) > 0);
      return andere.length === 1 ? s(kante(andere[0]!.a, andere[0]!.b)) : sh;
    };
    const mitte = nV + e.index;
    const sa = Math.max(0, (3 * sh + nachbar(e.a)) / 4 - 1);
    const sb = Math.max(0, (3 * sh + nachbar(e.b)) / 4 - 1);
    if (sa > 0) neueSchaerfe.set(kante(e.a, mitte), sa);
    if (sb > 0) neueSchaerfe.set(kante(mitte, e.b), sb);
  }

  return { punkte: [...vp, ...ep, ...fp], flaechen: neueFlaechen, schaerfe: neueSchaerfe };
}

export function unterteilenMehrfach(netz: Netz, stufen: number): Netz {
  let n = netz;
  for (let i = 0; i < stufen; i++) n = unterteilen(n);
  return n;
}

/**
 * Dreiecke mit Normalen je Flächenecke: über Kanten mit mehr als `glattWinkel` Knick wird nicht
 * gemittelt (wie Blenders „Auto Smooth“) – so bleiben scharfe Kanten auch im Licht scharf.
 */
export function zuDreiecken(netz: Netz, glattWinkelGrad = 40): { positionen: Float32Array; normalen: Float32Array } {
  const { punkte, flaechen } = netz;
  const fn: V3[] = flaechen.map((f) => {
    let n: V3 = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = punkte[f[i]!]!;
      const b = punkte[f[(i + 1) % f.length]!]!;
      n = plus(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
    }
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return mal(n, 1 / l);
  });
  const punktFlaechen: number[][] = Array.from({ length: punkte.length }, () => []);
  flaechen.forEach((f, fi) => f.forEach((i) => punktFlaechen[i]!.push(fi)));
  const cosGrenze = Math.cos((glattWinkelGrad * Math.PI) / 180);
  const ecknormale = (fi: number, v: number): V3 => {
    let n: V3 = [0, 0, 0];
    for (const g of punktFlaechen[v]!) {
      const d = fn[g]![0] * fn[fi]![0] + fn[g]![1] * fn[fi]![1] + fn[g]![2] * fn[fi]![2];
      if (d >= cosGrenze) n = plus(n, fn[g]!);
    }
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return mal(n, 1 / l);
  };
  const pos: number[] = [];
  const nrm: number[] = [];
  flaechen.forEach((f, fi) => {
    for (let i = 1; i < f.length - 1; i++) {
      for (const v of [f[0]!, f[i]!, f[i + 1]!]) {
        pos.push(...punkte[v]!);
        nrm.push(...ecknormale(fi, v));
      }
    }
  });
  return { positionen: new Float32Array(pos), normalen: new Float32Array(nrm) };
}
