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
  /** Punktschärfe (wie Blenders Vertex Crease): ≥ 1 = Punkt bleibt als Spitze stehen, je Stufe −1 */
  eckSchaerfe?: Map<number, number>;
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
    const es0 = netz.eckSchaerfe?.get(i) ?? 0;
    if (scharf.length < 2) return es0 <= 0 ? glatt : es0 >= 1 ? P : lerp(glatt, P, es0);
    const vs = scharf.reduce((acc, e) => acc + s(kante(e.a, e.b)), 0) / scharf.length;
    let hart: V3;
    if (scharf.length === 2) {
      const o1 = scharf[0]!.a === i ? scharf[0]!.b : scharf[0]!.a;
      const o2 = scharf[1]!.a === i ? scharf[1]!.b : scharf[1]!.a;
      hart = mal(plus(plus(mal(P, 6), punkte[o1]!), punkte[o2]!), 1 / 8);
    } else {
      hart = P;
    }
    const ergebnis = vs >= 1 ? hart : lerp(glatt, hart, vs);
    const es = netz.eckSchaerfe?.get(i) ?? 0;
    return es <= 0 ? ergebnis : es >= 1 ? P : lerp(ergebnis, P, es);
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

  const neueEcken = new Map<number, number>();
  for (const [i, es] of netz.eckSchaerfe ?? []) if (es - 1 > 0) neueEcken.set(i, es - 1);
  return { punkte: [...vp, ...ep, ...fp], flaechen: neueFlaechen, schaerfe: neueSchaerfe, ...(neueEcken.size ? { eckSchaerfe: neueEcken } : {}) };
}

export function unterteilenMehrfach(netz: Netz, stufen: number): Netz {
  let n = netz;
  for (let i = 0; i < stufen; i++) n = unterteilen(n);
  return n;
}

/**
 * Dreiecke mit Normalen je Flächenecke: über Kanten mit mehr als `glattWinkel` Knick wird nicht
 * gemittelt (wie Blenders „Auto Smooth“) – so bleiben scharfe Kanten auch im Licht scharf.
 * B7 (16.10.): auf flachen Zahlenfeldern ohne Zwischenobjekte (Abspielen der Posen baut je Bild neu), Rechenreihenfolge
 * wie zuvor — das Ergebnis ist bitgleich (`zuDreieckenAlt` im Test).
 */
export function zuDreiecken(netz: Netz, glattWinkelGrad = 40): { positionen: Float32Array; normalen: Float32Array } {
  const { punkte, flaechen } = netz;
  const nF = flaechen.length;
  const nP = punkte.length;
  // Flächennormalen (Newell), normiert
  const fn = new Float64Array(3 * nF);
  for (let fi = 0; fi < nF; fi++) {
    const f = flaechen[fi]!;
    const m = f.length;
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    for (let i = 0; i < m; i++) {
      const a = punkte[f[i]!]!;
      const b = punkte[f[(i + 1) % m]!]!;
      n0 = n0 + (a[1] - b[1]) * (a[2] + b[2]);
      n1 = n1 + (a[2] - b[2]) * (a[0] + b[0]);
      n2 = n2 + (a[0] - b[0]) * (a[1] + b[1]);
    }
    const s = 1 / (Math.hypot(n0, n1, n2) || 1);
    fn[3 * fi] = n0 * s;
    fn[3 * fi + 1] = n1 * s;
    fn[3 * fi + 2] = n2 * s;
  }
  // Flächen je Punkt (in Flächenreihenfolge, wie zuvor die Listen)
  const start = new Int32Array(nP + 1);
  let ecken = 0;
  for (let fi = 0; fi < nF; fi++) {
    const f = flaechen[fi]!;
    for (const i of f) start[i + 1]!++;
    ecken += 3 * Math.max(0, f.length - 2);
  }
  for (let i = 0; i < nP; i++) start[i + 1] = start[i + 1]! + start[i]!;
  const voll = start.slice(0, nP);
  const pf = new Int32Array(start[nP]!);
  for (let fi = 0; fi < nF; fi++) for (const i of flaechen[fi]!) pf[voll[i]!++] = fi;
  const cosGrenze = Math.cos((glattWinkelGrad * Math.PI) / 180);
  const positionen = new Float32Array(3 * ecken);
  const normalen = new Float32Array(3 * ecken);
  let o = 0;
  const ecke = (fi: number, v: number) => {
    const p = punkte[v]!;
    positionen[o] = p[0];
    positionen[o + 1] = p[1];
    positionen[o + 2] = p[2];
    const f0 = fn[3 * fi]!;
    const f1 = fn[3 * fi + 1]!;
    const f2 = fn[3 * fi + 2]!;
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    for (let k = start[v]!; k < start[v + 1]!; k++) {
      const g = pf[k]!;
      const g0 = fn[3 * g]!;
      const g1 = fn[3 * g + 1]!;
      const g2 = fn[3 * g + 2]!;
      const d = g0 * f0 + g1 * f1 + g2 * f2;
      if (d >= cosGrenze) {
        n0 = n0 + g0;
        n1 = n1 + g1;
        n2 = n2 + g2;
      }
    }
    const s = 1 / (Math.hypot(n0, n1, n2) || 1);
    normalen[o] = n0 * s;
    normalen[o + 1] = n1 * s;
    normalen[o + 2] = n2 * s;
    o += 3;
  };
  for (let fi = 0; fi < nF; fi++) {
    const f = flaechen[fi]!;
    for (let i = 1; i < f.length - 1; i++) {
      ecke(fi, f[0]!);
      ecke(fi, f[i]!);
      ecke(fi, f[i + 1]!);
    }
  }
  return { positionen, normalen };
}
