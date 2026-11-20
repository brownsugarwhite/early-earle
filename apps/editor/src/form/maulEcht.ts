// Das Maul als echte Form (Plan „Maul, Zähne, Zunge“, Abschnitt 12, Etappe 1, 20.11.2026).
// Florian: „Ein Maul wird mit einer Linie erstellt … Die Linie wird dann nach Bestätigung automatisch zum Maul“ und „zahnfleischlinie,
// maultasche, bemalung/textur und die kieferpunkte sollten nach dem erstellen genauso bearbeitbar sein wie der rest des meshs“.
//
// Aus einer Linie in der Seitenebene (vom Mundwinkel nach vorn aus der Form heraus) wird ein Maul, das Haut und Linien der Form ist:
// 1. Längs der Linie wird ein Keil abgezogen, so dünn wie eine Linie, gerade von Seite zu Seite (`objekteVerbindenMit`, der Baustein
//    der Naht). Die Tasche ist danach Haut der Form, die Lippe eine Linie mit Kante, Linien der Form sind an der Lippe geschnitten.
//    Im Maul liegen zwei Linien: die Mitte von Gaumen und Boden und die Rachenlinie (sie halten die Tasche, Probe P1).
// 2. Der Reißverschluss: Alle Punkte der Lippe und der Tasche kommen genau auf die Maullinie. Der Spalt ist zu.
// 3. Die Lippe wird ein zusammengeklappter Loop, dessen Punkte paarweise Zwillinge sind (`maulLinie.ts` im Kern, 14.11.).
//
// Gerechnet wird das Maul zu: Das ist die Ruhe der Form (Probe P1 und P2, Plan 12.6 und 12.9). Ohne DOM; die Bibliothek für den
// Schnitt lädt, wer aufruft (`manifoldLaden`).
//
// Der Haarspalt (`MAUL_HAAR`): Nach dem Schließen wird eine Seite um einen Hauch um den Mundwinkel gedreht. Ohne ihn lägen Punkte
// genau am selben Ort (Gaumen und Boden, die Lippen an Kreuzungen und vorn an der Mitte), und der Kern liest die Spiegelpaare an
// mehreren Stellen aus den Lagen neu: Zwei Punkte am selben Ort bekämen den falschen Partner. Vorn sind die Lippen damit rund
// 0,06 Einheiten auseinander (bei einer Lippe von 110), am Mundwinkel null.
import {
  type Haut,
  type Loop,
  type LoopPunkt,
  type MaulAmLoop,
  festlegen,
  griffeAnlegen,
  hautAus,
  hautFrei,
  hautLagen,
  kantenTeilenMit,
  nadelnZusammenlegen,
  pfadParameter,
  punktEinfuegen,
  zwillingeAngleichen,
  zwillingeFestlegen,
} from '@ee/shape/dicht';
import { Profil, type V2 } from '../maulstudie/schnitt';
import { type Wasm, objekteVerbindenMit } from './naht';

/** So weit steht das Maul in der gerechneten Lage offen (Grad): ein Hauch, damit keine zwei Punkte am selben Ort liegen */
export const MAUL_HAAR = 0.03;
/** halbe Dicke des Keils, in mittleren Netzkanten (der Spalt wird danach geschlossen) */
const SPALT = 0.015;
/** so genau folgt der Pfad der Lippe ihrer Kette (in Einheiten des Werks; wie in der Probe) */
const PFAD_GENAU = 0.3;
/** so nah am Mundwinkel (in der Seite) liegen alle Punkte der Rachenlinie */
const RACHEN_NAH = 3;

export type MaulErgebnis = {
  haut: Haut;
  loops: Loop[];
  /** die Kennung der Lippe (der letzte Loop) */
  lippe: number;
  naechsteId: number;
  naechsteKreuzung: number;
  /** wie viele Linien der Form an der Lippe geschnitten wurden */
  geschnitten: number;
};

const v3 = (p: { x: number; y: number; z: number }): { x: number; y: number; z: number } => ({ x: p.x, y: p.y, z: p.z });
const loopKopie = (l: Loop): Loop => ({
  ...l,
  proben: l.proben.map((p) => ({ ecken: [...p.ecken], b: [...p.b] })),
  s: Float64Array.from(l.s),
  ruhe: Float64Array.from(l.ruhe),
  punkte: l.punkte.map((p) => ({ ...p, ref: v3(p.ref), cur: v3(p.cur), ...(p.ein ? { ein: v3(p.ein) } : {}), ...(p.aus ? { aus: v3(p.aus) } : {}) })),
});
const paarVon = (h: Haut, v: number): number[] => (h.spiegel[v]! >= 0 && h.spiegel[v] !== v ? [v, h.spiegel[v]!] : [v]);

/** Der Rahmen eines Mauls: das Profil seiner Linie in der Seitenebene (vom Mundwinkel nach vorn) und der Mundwinkel */
export type MaulRahmen = { profil: Profil; C: V2 };

/**
 * Welcher Kiefer: je Punkt die Seite der Maullinie (+1 links der Laufrichtung, −1 rechts), aus den Linien des Mauls gelesen statt
 * aus der Lage (zu liegen die Wände aufeinander). Die Lippe teilt sich am Mundwinkel in ihre zwei Lippen. In der Tasche gehört zu
 * einer Lippe, was von ihr aus zu erreichen ist, ohne die Rachenlinie zu überschreiten. Außen gilt die Lippe, von der aus der Punkt
 * über die Kanten des Netzes zuerst erreicht wird: Vor dem Mundwinkel trennt die Lippe die Haut der zwei Kiefer ganz. Hinter dem
 * Mundwinkel, wo beide gleich weit sind, dreht kein Kiefer.
 *
 * `aussen`: was von einem fernen Punkt aus zu erreichen ist, ohne die Lippe zu überschreiten (die Lippe selbst zählt dazu);
 * `lippe`: die Punkte der Lippe samt Spiegelbild; `ersteSeite`: die Seite der ersten Hälfte ihrer Kette (bis zum Mundwinkel);
 * `getrennt`: Die Rachenlinie trennt Gaumen und Boden (sonst gilt in der Tasche die Lage).
 */
export function kieferSeiten(
  h: Haut,
  loops: readonly Loop[],
  lippeId: number,
  R: MaulRahmen,
): { seite: Int8Array; aussen: Uint8Array; lippe: Set<number>; ersteSeite: 1 | -1; getrennt: boolean } {
  const lage = (v: number): { s: number; d: number; hinten: boolean } => R.profil.naechster(h.pos[3 * v]!, h.pos[3 * v + 1]!);
  const beiC = (v: number): number => Math.hypot(h.pos[3 * v]! - R.C.x, h.pos[3 * v + 1]! - R.C.y);
  const seite = new Int8Array(h.n);
  const fest = new Uint8Array(h.n); // 1 Lippe, 2 Rachenlinie
  const lippe = new Set<number>();
  const teile: number[][] = [];
  const L = loops.find((l) => l.id === lippeId);
  /** der Punkt des Netzes am Mundwinkel (−1: keine Lippe) */
  let winkelV = -1;
  if (L) {
    const kette = L.proben.map((p) => p.ecken[0]);
    let jM = 0;
    kette.forEach((v, j) => {
      if (beiC(v) < beiC(kette[jM]!)) jM = j;
    });
    winkelV = kette[jM]!;
    teile.push(kette.slice(0, jM), kette.slice(jM + 1));
    for (const v of kette)
      for (const w of paarVon(h, v)) {
        fest[w] = 1;
        lippe.add(w);
      }
  }
  let start = 0;
  for (let v = 1; v < h.n; v++) if (beiC(v) > beiC(start)) start = v;
  const aussen = new Uint8Array(h.n);
  aussen[start] = 1;
  const stapel = [start];
  while (stapel.length) {
    const v = stapel.pop()!;
    if (fest[v] === 1) continue;
    for (const u of h.nachbarn[v]!) {
      if (aussen[u]) continue;
      aussen[u] = 1;
      stapel.push(u);
    }
  }
  // Die Rachenlinie: die Linie im Maul, die am Mundwinkel hängt (alle ihre übrigen Punkte liegen in der Tasche; so gilt sie auch,
  // wenn ihre Mitte nach hinten gezogen ist). Dazu, wie in den Proben, eine harte Linie, die in der Seite ganz am Mundwinkel liegt.
  const amWinkel = winkelV >= 0 ? new Set(paarVon(h, winkelV)) : new Set<number>();
  for (const l of loops) {
    if (l.id === lippeId) continue;
    const kette = l.proben.map((p) => p.ecken[0]);
    const haengtAmWinkel = kette.some((v) => amWinkel.has(v)) && kette.every((v) => amWinkel.has(v) || !aussen[v]);
    const liegtAmWinkel = !!l.kante && kette.every((v) => beiC(v) < RACHEN_NAH);
    if (!haengtAmWinkel && !liegtAmWinkel) continue;
    for (const v of kette) for (const w of paarVon(h, v)) if (!fest[w]) fest[w] = 2;
  }
  // welche Lippe: Die Haut außen neben ihr liegt eindeutig auf einer Seite der Linie
  const quellen: [number[], number[]] = [[], []];
  let ersteSeite: 1 | -1 = 1;
  teile.forEach((teil, nr) => {
    let summe = 0;
    for (const v of teil) for (const u of h.nachbarn[v]!) if (aussen[u] && !fest[u]) summe += lage(u).d;
    // (die zweite Lippe ist die andere Seite, auch wenn ihre Nachbarn einmal knapp anders summieren)
    const s: 1 | -1 = nr === 0 ? (summe >= 0 ? 1 : -1) : ersteSeite === 1 ? -1 : 1;
    if (nr === 0) ersteSeite = s;
    for (const v of teil)
      for (const w of paarVon(h, v)) {
        seite[w] = s;
        quellen[s > 0 ? 0 : 1].push(w);
      }
  });
  // die Tasche: von jeder Lippe aus, bis zur Rachenlinie
  const tasche: [number, number] = [0, 0];
  for (const k of [0, 1] as const) {
    const st = [...quellen[k]];
    while (st.length) {
      const v = st.pop()!;
      for (const u of h.nachbarn[v]!) {
        if (seite[u] !== 0 || fest[u] !== 0 || aussen[u]) continue;
        seite[u] = k === 0 ? 1 : -1;
        tasche[k]++;
        st.push(u);
      }
    }
  }
  const getrennt = tasche[0] > 0 && tasche[1] > 0;
  if (!getrennt) for (let v = 0; v < h.n; v++) if (!aussen[v] && !fest[v]) seite[v] = 0;
  // außen: Schicht um Schicht von beiden Lippen aus
  let rand = [...quellen[0], ...quellen[1]];
  const erreicht = new Uint8Array(h.n);
  for (const q of rand) erreicht[q] = 1;
  while (rand.length) {
    const weiter: number[] = [];
    for (const v of rand)
      for (const u of h.nachbarn[v]!) {
        if (erreicht[u] || fest[u] !== 0 || !aussen[u]) continue;
        erreicht[u] = 1;
        seite[u] = seite[v]!;
        weiter.push(u);
      }
    rand = weiter;
  }
  for (let v = 0; v < h.n; v++) if (seite[v] === 0) seite[v] = lage(v).d >= 0 ? 1 : -1;
  return { seite, aussen, lippe, ersteSeite, getrennt };
}

/** Der Keil längs der Maullinie: ein geschlossenes Netz, spiegelgleich in z, mit den zwei Linien des Mauls als seinen Linien */
function keilBauen(P: readonly V2[], profil: Profil, mk: number, zMax: number): { haut: Haut; loops: Loop[] } {
  const SCHRITT = 0.6 * mk;
  const spalt = SPALT * mk;
  const m = P.length - 1;
  const C = P[0]!;
  const nL = (i: number): V2 => {
    const t = profil.tangente(profil.s[i]!);
    return { x: -t.y, y: t.x };
  };
  const W = zMax * 1.2 + 1.5 * mk;
  const nz = 2 * Math.max(4, Math.round(W / SCHRITT));
  const pos: number[] = [];
  const tri: number[] = [];
  // Je Stelle des Umrisses eine Säule von Punkten über z: 0 die Spitze am Mundwinkel (beide Wände teilen sie: Dort ist der Keil
  // eine Schneide, damit nach dem Schließen keine zwei Säulen auf einen Ort fallen), 1 … m links, m+1 … 2m rechts.
  const U = 2 * m + 1;
  const umriss = (k: number): V2 => {
    if (k === 0) return { x: C.x, y: C.y };
    const links = k <= m;
    const i = links ? k : k - m;
    const n = nL(i);
    const s = links ? spalt : -spalt;
    return { x: P[i]!.x + n.x * s, y: P[i]!.y + n.y * s };
  };
  for (let k = 0; k < U; k++) {
    const q = umriss(k);
    for (let j = 0; j <= nz; j++) pos.push(q.x, q.y, -W + (2 * W * j) / nz);
  }
  const nr = (k: number, j: number): number => k * (nz + 1) + j;
  const ecke = (v: number): [number, number, number] => [pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!];
  /** ein Dreieck so herum, dass seine Normale nach `aus` zeigt */
  const dreieck = (a: number, b: number, c: number, aus: readonly [number, number, number]): void => {
    const A = ecke(a);
    const B = ecke(b);
    const D = ecke(c);
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]] as const;
    const w = [D[0] - A[0], D[1] - A[1], D[2] - A[2]] as const;
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]] as const;
    if (n[0] * aus[0] + n[1] * aus[1] + n[2] * aus[2] >= 0) tri.push(a, b, c);
    else tri.push(a, c, b);
  };
  /** die Wand zwischen zwei Stellen des Umrisses, über alle Höhen */
  const wand = (ka: number, kb: number, aus: readonly [number, number, number]): void => {
    for (let j = 0; j < nz; j++) {
      dreieck(nr(ka, j), nr(kb, j), nr(kb, j + 1), aus);
      dreieck(nr(ka, j), nr(kb, j + 1), nr(ka, j + 1), aus);
    }
  };
  /** die Säule links (seite 1) oder rechts (−1) an der Stelle i des Profils (0: die gemeinsame Spitze) */
  const saeule = (i: number, seite: 1 | -1): number => (i === 0 ? 0 : seite > 0 ? i : m + i);
  for (let i = 0; i < m; i++) {
    const n = nL(i);
    wand(saeule(i, 1), saeule(i + 1, 1), [n.x, n.y, 0]);
    wand(saeule(i, -1), saeule(i + 1, -1), [-n.x, -n.y, 0]);
  }
  {
    // vorn die Stirn
    const tv = profil.tangente(profil.laenge);
    wand(saeule(m, 1), saeule(m, -1), [tv.x, tv.y, 0]);
  }
  for (const [j, aus] of [
    [0, [0, 0, -1]],
    [nz, [0, 0, 1]],
  ] as const) {
    dreieck(nr(0, j), nr(saeule(1, 1), j), nr(saeule(1, -1), j), aus);
    for (let i = 1; i < m; i++) {
      dreieck(nr(saeule(i, 1), j), nr(saeule(i + 1, 1), j), nr(saeule(i + 1, -1), j), aus);
      dreieck(nr(saeule(i, 1), j), nr(saeule(i + 1, -1), j), nr(saeule(i, -1), j), aus);
    }
  }
  const haut = hautAus(pos, tri);
  // die Linien im Maul: die Mitte von Gaumen und Boden (einmal um den Keil in der Spiegelebene) und die Rachenlinie (die Spitze des
  // Keils, von der Mitte nach außen, mit Kante). Der Baustein schneidet sie an der Lippe; was in der Form liegt, bleibt.
  const jm = nz / 2;
  const ausKette = (id: number, kette: number[], art: Loop['art'], zu: boolean): Loop => {
    const n = kette.length;
    const sL = new Float64Array(n);
    const ruhe = new Float64Array(3 * n);
    kette.forEach((v, j) => ruhe.set(haut.pos.subarray(3 * v, 3 * v + 3), 3 * j));
    for (let j = 1; j < n; j++) sL[j] = sL[j - 1]! + Math.hypot(ruhe[3 * j]! - ruhe[3 * j - 3]!, ruhe[3 * j + 1]! - ruhe[3 * j - 2]!, ruhe[3 * j + 2]! - ruhe[3 * j - 1]!);
    const schluss = zu ? Math.hypot(ruhe[0]! - ruhe[3 * n - 3]!, ruhe[1]! - ruhe[3 * n - 2]!, ruhe[2]! - ruhe[3 * n - 1]!) : 0;
    return { id, art, proben: kette.map((w) => ({ ecken: [w, w, w], b: [1, 0, 0] })), s: sL, laenge: sL[n - 1]! + schluss, ruhe, punkte: [] };
  };
  const punktBei = (l: Loop, j: number, eck: boolean, kreuzung?: number): void => {
    const q = punktEinfuegen(l, l.s[j]!, kreuzung);
    q.ref = { x: l.ruhe[3 * j]!, y: l.ruhe[3 * j + 1]!, z: l.ruhe[3 * j + 2]! };
    q.cur = { ...q.ref };
    if (eck) q.ecke = true;
  };
  // die Mitte: Spitze am Mundwinkel, links nach vorn, vorn herum, rechts zurück
  const umlauf = [0, ...Array.from({ length: m }, (_, i) => 1 + i), ...Array.from({ length: m }, (_, i) => 2 * m - i)];
  const mitte = ausKette(1, umlauf.map((k) => nr(k, jm)), 'mitte', true);
  punktBei(mitte, 0, true, 1);
  punktBei(mitte, m, true);
  punktBei(mitte, m + 1, true);
  griffeAnlegen(mitte, mitte.ruhe, true, PFAD_GENAU);
  const rachen = ausKette(2, Array.from({ length: nz - jm + 1 }, (_, i) => nr(0, jm + i)), 'ring', false);
  rachen.kante = true;
  rachen.haengt = [false, true];
  punktBei(rachen, 0, false, 1);
  punktBei(rachen, rachen.proben.length - 1, false);
  griffeAnlegen(rachen, rachen.ruhe, true);
  return { haut, loops: [mitte, rachen] };
}

/**
 * Aus einer Linie das Maul schneiden. `linie`: in der Seitenebene (x, y des Werks), vom Mundwinkel (in der Form) nach vorn, ihr
 * letzter Punkt vor der Form im Leeren. `mk`: die mittlere Netzkante. Die Form muss gespiegelt sein. Zurück: die neue Haut und
 * alle Linien (die Lippe zuletzt), oder warum es hier nicht geht (dann ist nichts geändert).
 */
export function maulSchneidenMit(
  wasm: Wasm,
  form: { haut: Haut; loops: readonly Loop[] },
  linie: readonly V2[],
  opt: { naechsteId: number; naechsteKreuzung: number; mk: number },
): MaulErgebnis | { fehler: string } {
  const mk = opt.mk;
  if (hautFrei(form.haut)) return { fehler: 'Ein Maul braucht die gespiegelte Form (Spiegel an)' };
  if (linie.length < 2) return { fehler: 'die Linie ist zu kurz' };
  // das Profil dicht abtasten und vorn ein Stück über das Ende hinaus verlängern (der Keil muss vorn aus der Form herausschauen)
  const roh = linie.map((q) => ({ x: q.x, y: q.y }));
  {
    const a = roh[roh.length - 2]!;
    const b = roh[roh.length - 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    roh.push({ x: b.x + ((b.x - a.x) / l) * 3 * mk, y: b.y + ((b.y - a.y) / l) * 3 * mk });
  }
  const grob = new Profil(roh);
  if (grob.laenge < 4 * mk) return { fehler: 'die Linie ist zu kurz (das Maul wäre kleiner als das Netz)' };
  const m = Math.max(4, Math.round(grob.laenge / (0.6 * mk)));
  const P: V2[] = Array.from({ length: m + 1 }, (_, i) => grob.ort((grob.laenge * i) / m));
  const profil = new Profil(P);
  const C = P[0]!;
  const R: MaulRahmen = { profil, C };
  let A = form.haut;
  // (eigene Kopien der Linien: Was hier an Punkten und Griffen gesetzt wird, darf die Linien des Aufrufers nicht treffen, auch
  // nicht, wenn es am Ende nicht geht)
  let loopsA: Loop[] = form.loops.map(loopKopie);
  let zMax = 0;
  for (let i = 0; i < A.n; i++) zMax = Math.max(zMax, Math.abs(A.pos[3 * i + 2]!));
  const keil = keilBauen(P, profil, mk, zMax);

  // Der Keil ist dünner als das Netz: Eine Linie der Form, die die Maullinie kreuzt, liefe zwischen zwei ihrer Punkte durch ihn
  // hindurch, und der Baustein könnte sie nicht schneiden. Darum bekommt jede solche Linie dort erst einen Punkt des Netzes, genau
  // auf der Maullinie (die Kante ihrer Kette wird geteilt; an der Form ändert das nichts).
  {
    const teile: { u: number; v: number; f: number }[] = [];
    const dBei = (v: number): { d: number; hinten: boolean } => profil.naechster(A.pos[3 * v]!, A.pos[3 * v + 1]!);
    for (const l of loopsA) {
      const kette = l.proben.map((p) => p.ecken[0]);
      if (!l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) continue;
      const n = kette.length;
      for (let k = 0; k < (l.art !== 'ring' ? n : n - 1); k++) {
        const a = kette[k]!;
        const b = kette[(k + 1) % n]!;
        const fa = dBei(a);
        const fb = dBei(b);
        if (fa.hinten || fb.hinten || fa.d * fb.d >= 0) continue;
        let f = Math.abs(fa.d) / (Math.abs(fa.d) + Math.abs(fb.d));
        for (let it = 0; it < 3; it++) {
          const x = A.pos[3 * a]! + f * (A.pos[3 * b]! - A.pos[3 * a]!);
          const y = A.pos[3 * a + 1]! + f * (A.pos[3 * b + 1]! - A.pos[3 * a + 1]!);
          f -= profil.naechster(x, y).d / (fb.d - fa.d);
          f = Math.max(0.02, Math.min(0.98, f));
        }
        if (!teile.some((t) => (t.u === a && t.v === b) || (t.u === b && t.v === a))) teile.push({ u: a, v: b, f });
      }
    }
    if (teile.length) {
      const r = kantenTeilenMit(A, loopsA, teile);
      if (!r) return { fehler: 'eine Linie, die das Maul kreuzt, ließ sich dort nicht teilen' };
      A = r.haut;
      loopsA = r.loops;
    }
  }

  const E = objekteVerbindenMit(wasm, { haut: A, loops: loopsA, spiegelbild: false }, { haut: keil.haut, loops: keil.loops, spiegelbild: false }, 'abziehen', {
    naechsteId: opt.naechsteId,
    naechsteKreuzung: opt.naechsteKreuzung,
  });
  if ('fehler' in E) return { fehler: E.fehler };
  if (E.naehte.length !== 1) {
    return {
      fehler: E.naehte.length === 0 ? 'die Linie trifft die Form nicht (von vorn in die Form hinein zeichnen)' : `hier entstünden ${E.naehte.length} Öffnungen (die Linie läuft durch mehrere Teile der Form)`,
    };
  }
  let haut = E.haut;
  let loops = E.loops;
  const lippeId = E.naehte[0]!;
  // (vor dem Schließen: Da liegen die Wände eine halbe Spaltbreite neben der Linie, die Seiten sind eindeutig)
  let sk = kieferSeiten(haut, loops, lippeId, R);
  const ungetrennt = { fehler: 'die Tasche ließ sich nicht in Gaumen und Boden trennen (der Mundwinkel muss in der Form liegen)' };
  if (!sk.getrennt) return ungetrennt;
  let innen = (v: number): boolean => !sk.aussen[v] || sk.lippe.has(v);

  // ---------- der Reißverschluss ----------
  // alle Punkte der Lippe und der Tasche genau auf die Maullinie (quer zu ihr, in der Seitenebene)
  for (let v = 0; v < haut.n; v++) {
    if (!innen(v)) continue;
    const o = profil.naechster(haut.pos[3 * v]!, haut.pos[3 * v + 1]!);
    const q = o.hinten ? C : profil.ort(o.s);
    haut.pos[3 * v] = q.x;
    haut.pos[3 * v + 1] = q.y;
  }
  for (const l of loops) l.ruhe = hautLagen(haut, l);
  // Die Schnittkurve hinterlässt Splitter und sehr kurze Kanten an der Lippe (wo sie eine Kante dicht neben einem Punkt kreuzt):
  // zusammenlegen, bevor die Lippe ihre Punkte bekommt. Ohne das kam das Maul ohne Spalt nicht zur Ruhe (Probe P2).
  const nd = nadelnZusammenlegen(haut, loops, mk);
  if (nd) {
    haut = nd.haut;
    loops = nd.loops;
    sk = kieferSeiten(haut, loops, lippeId, R);
    if (!sk.getrennt) return ungetrennt;
    innen = (v: number): boolean => !sk.aussen[v] || sk.lippe.has(v);
  }
  const lippe = loops.find((l) => l.id === lippeId)!;
  // Wo eine Linie der Form das Maul kreuzte, endet jetzt je ein Stück an jeder Lippe, und die zwei Enden liegen längs der Lippe
  // ein Stück auseinander (der Keil hat die Linie schräg durchschnitten). Beide kommen auf die Mitte dazwischen: Zu treffen sich
  // die zwei Stücke wieder an einem Ort, und die zwei Punkte der Lippe dort sind Zwillinge.
  {
    const kette = lippe.proben.map((p) => p.ecken[0]);
    const n = kette.length;
    let jM = 0;
    for (let j = 1; j < n; j++) if (Math.hypot(haut.pos[3 * kette[j]!]! - C.x, haut.pos[3 * kette[j]! + 1]! - C.y) < Math.hypot(haut.pos[3 * kette[jM]!]! - C.x, haut.pos[3 * kette[jM]! + 1]! - C.y)) jM = j;
    const sW = lippe.s[jM]!;
    const L1 = sW;
    const L2 = lippe.laenge - sW;
    const probeBei = (s: number): number => {
      let j = 0;
      for (let k = 1; k < n; k++) if (Math.abs(lippe.s[k]! - s) < Math.abs(lippe.s[j]! - s)) j = k;
      return j;
    };
    const ort = (j: number): [number, number, number] => [haut.pos[3 * kette[j]!]!, haut.pos[3 * kette[j]! + 1]!, haut.pos[3 * kette[j]! + 2]!];
    const kreuz = lippe.punkte.filter((p) => p.kreuzung !== undefined && p.s > 1e-6 && p.s < lippe.laenge - 1e-6 && Math.abs(p.s - sW) > 1e-6);
    const zweite = kreuz.filter((p) => p.s > sW);
    if (L1 > 1e-6 && L2 > 1e-6) {
      for (const p of kreuz.filter((x) => x.s < sW)) {
        const jp = probeBei(p.s);
        const P0 = ort(jp);
        let q: LoopPunkt | null = null;
        let jq = -1;
        let nah = 1.5 * mk;
        for (const x of zweite) {
          const j = probeBei(x.s);
          const X = ort(j);
          const d = Math.hypot(X[0] - P0[0], X[1] - P0[1], X[2] - P0[2]);
          if (d < nah) {
            nah = d;
            q = x;
            jq = j;
          }
        }
        if (!q || jq < 0 || jp <= 0 || jp >= n - 1 || jq <= 0 || jq >= n - 1) continue;
        zweite.splice(zweite.indexOf(q), 1);
        // dieselbe Stelle auf beiden Lippen (Anteil des Wegs vom Mundwinkel nach vorn), nur wenn die Reihenfolge der Kette bleibt
        const tau = 0.5 * ((sW - p.s) / L1 + (q.s - sW) / L2);
        const sp = sW - tau * L1;
        const sq = sW + tau * L2;
        if (!(sp > lippe.s[jp - 1]! && sp < lippe.s[jp + 1]! && sq > lippe.s[jq - 1]! && sq < lippe.s[jq + 1]!)) continue;
        const Q0 = ort(jq);
        const M = [0.5 * (P0[0] + Q0[0]), 0.5 * (P0[1] + Q0[1]), 0.5 * (P0[2] + Q0[2])] as const;
        for (const j of [jp, jq]) {
          const v = kette[j]!;
          haut.pos.set(M, 3 * v);
          const sv = haut.spiegel[v]!;
          if (sv >= 0 && sv !== v) haut.pos.set([M[0], M[1], -M[2]], 3 * sv);
        }
        lippe.s[jp] = sp;
        lippe.s[jq] = sq;
        p.s = sp;
        q.s = sq;
      }
      lippe.punkte.sort((a, b) => a.s - b.s);
    }
  }
  // der Haarspalt: die linke Seite um einen Hauch um den Mundwinkel drehen (dann liegt kein Punkt auf einem anderen)
  const haar = (MAUL_HAAR * Math.PI) / 180;
  const cosH = Math.cos(haar);
  const sinH = Math.sin(haar);
  for (let v = 0; v < haut.n; v++) {
    if (!innen(v) || sk.seite[v]! <= 0) continue;
    const dx = haut.pos[3 * v]! - C.x;
    const dy = haut.pos[3 * v + 1]! - C.y;
    haut.pos[3 * v] = C.x + cosH * dx - sinH * dy;
    haut.pos[3 * v + 1] = C.y + sinH * dx + cosH * dy;
  }
  // die Linien: Lippe und Mitte der Tasche lesen Ruhe und Punkte von der bewegten Haut (ihr Pfad wird gleich neu angelegt); eine
  // Linie, die an der Lippe hängt, nimmt ihren Endpunkt mit
  const taschenMitte: Loop[] = [];
  for (const l of loops) {
    const kette = l.proben.map((p) => p.ecken[0]);
    if (l !== lippe && !l.kante && kette.every(innen) && kette.every((v) => Math.abs(haut.pos[3 * v + 2]!) < 1e-9)) taschenMitte.push(l);
    if (l === lippe || taschenMitte.includes(l)) {
      festlegen(haut, l, true);
      continue;
    }
    l.ruhe = hautLagen(haut, l);
    const n = kette.length;
    for (const p of l.punkte) {
      const ende = p.s <= 1e-6 ? 0 : p.s >= l.laenge - 1e-6 ? n - 1 : -1;
      if (ende < 0 || !innen(kette[ende]!)) continue;
      p.ref = { x: l.ruhe[3 * ende]!, y: l.ruhe[3 * ende + 1]!, z: l.ruhe[3 * ende + 2]! };
      p.cur = { ...p.ref };
    }
  }

  // ---------- die Lippe: Mundwinkel, Pfad, Zwillinge ----------
  {
    let jM = 0;
    let dM = Infinity;
    lippe.proben.forEach((pr, j) => {
      const v = pr.ecken[0];
      const d = Math.hypot(haut.pos[3 * v]! - C.x, haut.pos[3 * v + 1]! - C.y);
      if (d < dM) {
        dM = d;
        jM = j;
      }
    });
    const v = lippe.proben[jM]!.ecken[0];
    // (endet dort schon die Rachenlinie, hat die Lippe den Punkt)
    let w = lippe.punkte.find((q) => Math.abs(q.s - lippe.s[jM]!) < 0.6 * mk);
    if (!w) {
      w = punktEinfuegen(lippe, lippe.s[jM]!);
      w.ref = { x: haut.pos[3 * v]!, y: haut.pos[3 * v + 1]!, z: haut.pos[3 * v + 2]! };
      w.cur = { ...w.ref };
    }
    w.ecke = true;
    w.mundwinkel = true;
  }
  griffeAnlegen(lippe, lippe.ruhe, true, PFAD_GENAU);
  for (const l of taschenMitte) griffeAnlegen(l, l.ruhe, true, PFAD_GENAU);

  /** Punkte anderer Linien an denselben Kreuzungen gehen mit (eine Kreuzung ist ein Ort) */
  const geaendert = new Set<Loop>();
  const mitnehmen = (quelle: Loop, nummern: readonly number[]): void => {
    for (const i of nummern) {
      const p = quelle.punkte[i]!;
      if (p.kreuzung === undefined) continue;
      for (const l of loops) {
        if (l === quelle) continue;
        for (const q of l.punkte) {
          if (q.kreuzung !== p.kreuzung) continue;
          q.ref = { ...p.ref };
          q.cur = { ...p.ref };
          geaendert.add(l);
        }
      }
    }
  };
  /**
   * Eine zusammengeklappte Linie paaren: Die Hälfte auf der rechten Seite der Maullinie (sie liegt genau auf ihr) führt, die andere
   * wird ihr um den Haarspalt gedrehtes Abbild. False, wenn sich die Punkte nicht paaren lassen.
   */
  const paaren = (l: Loop, ersteRechts: boolean): boolean => {
    l.maulLinie = MAUL_HAAR;
    if (zwillingeAngleichen(l) < 0) return false;
    const bewegt = zwillingeFestlegen(l, ersteRechts ? 'erste' : 'zweite');
    if (!bewegt) return false;
    // Die Zwillingsregel des Kerns kennt nur Enden auf der Mittelebene: An einem Ende, das an einer anderen Linie hängt, gibt es
    // keinen Griff nach außen (mit ihm kippte die Rechnung in eine andere Ruhelage, Probe P2)
    const n = l.punkte.length;
    if (l.haengt?.[0] && n && l.punkte[0]!.s <= 1e-6) l.punkte[0]!.ein = { x: 0, y: 0, z: 0 };
    if (l.haengt?.[1] && n && l.punkte[n - 1]!.s >= l.laenge - 1e-6) l.punkte[n - 1]!.aus = { x: 0, y: 0, z: 0 };
    mitnehmen(l, bewegt);
    geaendert.add(l);
    return true;
  };
  if (!paaren(lippe, sk.ersteSeite < 0)) return { fehler: 'die zwei Lippen ließen sich nicht paaren (bitte die Linie etwas anders ziehen)' };
  for (const l of taschenMitte) {
    // die Mitte der Tasche kehrt an der Rachenlinie um; für die Paarung trägt ihr Wendepunkt kurz die Marke des Mundwinkels
    const wende: LoopPunkt = l.punkte.reduce((a, b) => (Math.hypot(b.ref.x - C.x, b.ref.y - C.y) < Math.hypot(a.ref.x - C.x, a.ref.y - C.y) ? b : a));
    const iW = l.punkte.indexOf(wende);
    wende.mundwinkel = true;
    wende.ecke = true;
    // welche Hälfte auf der rechten Wand liegt: ein Punkt der Kette aus der ersten Hälfte
    const erste = l.proben.filter((_, j) => l.s[j]! < wende.s - 1e-6 && j > 0);
    const mitteV = erste.length ? erste[erste.length >> 1]!.ecken[0] : -1;
    const ersteRechts = mitteV >= 0 ? sk.seite[mitteV]! < 0 : true;
    const gut = iW > 0 && iW < l.punkte.length - 1 && paaren(l, ersteRechts);
    delete l.maulLinie;
    delete wende.mundwinkel;
    if (!gut) continue;
  }
  // Jede Probe einer geänderten Linie bekommt ihre Stelle auf dem neuen Pfad: Dann springt sie beim Rechnen nur quer zur Linie
  for (const l of loops) {
    l.ruhe = hautLagen(haut, l);
    if (geaendert.has(l)) pfadParameter(l);
  }
  // die Lippe zuletzt (das Werk sieht am letzten Loop nach kurzen Kanten)
  const sortiert = [...loops.filter((l) => l !== lippe), lippe];
  return { haut, loops: sortiert, lippe: lippeId, naechsteId: E.naechsteId, naechsteKreuzung: E.naechsteKreuzung, geschnitten: E.geschnitten };
}

// ---------- Etappe 2: die Kiefer ----------
//
// Die Ruhe der Form ist das geschlossene Maul; zwei Knochen (Oberkiefer und Unterkiefer) drehen nur, was gezeigt wird, um den
// Mundwinkel. Hier steht, was dafür aus den Linien des Mauls gelesen wird: wo das Scharnier liegt, welcher Kiefer ein Punkt ist und
// wie weit er mit ihm dreht. Das Ergebnis hat die Gestalt des Maulschnitts im Kern (`MaulAmLoop`): Die Pose des Werks rechnet damit
// wie am geformten Maul (nichts ist weggeschnitten, nichts eingesetzt). Den Winkel je Punkt gibt `kieferWinkel`.
//
// Das Feld eines Kiefers, um das Scharnier gesehen (Winkel φ gegen die Lippe, Abstand r):
//   - vor dem Mundwinkel dreht er starr, so weit er reicht (`KIEFER_REICHWEITE` Längen der Lippe);
//   - hinter dem Mundwinkel läuft die Drehung über φ aus und ist genau hinter ihm null: Dort wird die Haut quer gestaucht;
//   - nach außen läuft sie über r aus: Dort wird die Haut verschert.
// Stauchung und Scherung wachsen mit dem Winkel des Kiefers. Damit weit geöffnet nichts faltet und nichts reißt, werden beide
// Ausläufe mit dem Winkel breiter: Quer bleibt von der Haut mindestens `STAUCH_MIN`, die Scherung bleibt unter `SCHER_MAX`.

/** So weit reicht ein Kiefer um das Scharnier, in Längen der Lippe (in der Seite): bis dahin dreht er starr */
export const KIEFER_REICHWEITE = 1.15;
/** Der Auslauf nach außen endet mindestens beim so Vielfachen der Reichweite (bei kleinen Winkeln; weit geöffnet reicht er weiter) */
const AUSLAUF_AUSSEN_MIN = 1.8;
/** Der Auslauf hinter dem Mundwinkel beginnt spätestens quer zur Lippe (Bogenmaß gegen ihre Richtung am Mundwinkel) */
const AUSLAUF_HINTEN_AB = Math.PI / 2;
/** quer bleibt von der Haut hinter dem Mundwinkel überall mindestens dieser Anteil */
const STAUCH_MIN = 0.3;
/** so stark darf sich die Haut am Rand der Reichweite höchstens verziehen (Scherung: Weg quer je Weg nach außen) */
const SCHER_MAX = 1.25;
/** größte Steigung der Rampe, auf ihre Breite bezogen */
const RAMPE_STEIL = 1.25;
/** der größte Winkel eines Kiefers (Grad, von „zu“) */
export const KIEFER_MAX = { oben: 45, unten: 70 } as const;
/** die Pose „Fressen“, wie sie mit dem Maul entsteht (Grad; Plan, Abschnitt 6: oben wenig, unten weit) */
export const FRESSEN_ANFANG = { oben: 8, unten: 34 } as const;

/**
 * Von 0 auf 1 über [a, b]: in der Mitte gerade, an beiden Enden auf einem Fünftel der Breite gerundet. Die größte Steigung ist
 * `RAMPE_STEIL` / (b − a); eine Glattstufe hätte 1,5.
 */
function rampe(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  const e = 0.2;
  const m = 1 / (1 - e);
  if (t < e) return (m * t * t) / (2 * e);
  if (t > 1 - e) return 1 - (m * (1 - t) * (1 - t)) / (2 * e);
  return m * (t - e / 2);
}
/** die zwei Ausläufe für einen Kieferwinkel (Bogenmaß): ab welchem φ die Drehung hinten ausläuft, und bis zu welchem ln(r / Reichweite) außen */
function auslauf(winkel: number): { hintenAb: number; aussenBis: number } {
  const a = Math.abs(winkel);
  return {
    hintenAb: Math.min(AUSLAUF_HINTEN_AB, Math.PI - (RAMPE_STEIL * a) / (1 - STAUCH_MIN)),
    aussenBis: Math.max(Math.log(AUSLAUF_AUSSEN_MIN), (RAMPE_STEIL * a) / SCHER_MAX),
  };
}
/** wie weit ein Ort mit seinem Kiefer dreht (0 … 1): φ gegen die Lippe (Bogenmaß), `lnR` = ln(r / Reichweite) */
const anteil = (phi: number, lnR: number, f: { hintenAb: number; aussenBis: number }): number =>
  (phi <= f.hintenAb ? 1 : 1 - rampe(f.hintenAb, Math.PI, phi)) * (lnR <= 0 ? 1 : 1 - rampe(0, f.aussenBis, lnR));

/** Wo das Maul liegt, aus seiner Lippe gelesen (alles in der Seitenebene, x und y des Werks) */
export type MaulLage = {
  /** der Mundwinkel: das Scharnier der Kiefer */
  C: V2;
  /** die Lippe, vom Mundwinkel nach vorn */
  profil: Profil;
  /** ihre Länge */
  lang: number;
  /** Richtung der Lippe am Mundwinkel (nach vorn; über ihr erstes Fünftel gemittelt) */
  t0: V2;
  /** die Kieferspitze (das vordere Ende der Lippe) und die Richtung der Lippe dort */
  spitze: V2;
  tSpitze: V2;
  /** der Unterkiefer liegt links der Laufrichtung (vom Mundwinkel nach vorn gesehen); er öffnet dann gegen den Uhrzeigersinn */
  untenLinks: boolean;
};

/**
 * Die Lage des Mauls aus seiner Lippe: `ecke` ist die Probe am Mundwinkel. Gelesen wird die erste Hälfte der Kette (die zweite
 * liegt um den Haarspalt daneben). Null: Die Lippe hat in der Seite keine Länge.
 */
export function maulLage(h: Haut, lippe: Loop, ecke: number): MaulLage | null {
  if (ecke <= 0 || ecke >= lippe.proben.length) return null;
  const ort = (j: number): V2 => {
    const v = lippe.proben[j]!.ecken[0];
    return { x: h.pos[3 * v]!, y: h.pos[3 * v + 1]! };
  };
  const C = ort(ecke);
  // vom Mundwinkel nach vorn; vorn läuft die Lippe um die Schnauze zur Mitte: Dort liegen ihre Punkte in der Seite fast aufeinander
  const P: V2[] = [C];
  let lang = 0;
  for (let j = ecke - 1; j >= 0; j--) {
    const q = ort(j);
    const d = Math.hypot(q.x - P[P.length - 1]!.x, q.y - P[P.length - 1]!.y);
    if (d < 1e-6) continue;
    lang += d;
    P.push(q);
  }
  if (P.length < 2 || !(lang > 1e-6)) return null;
  const profil = new Profil(P);
  const richtung = (a: V2, b: V2): V2 => {
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  };
  const spitze = P[P.length - 1]!;
  const t0 = richtung(C, profil.ort(0.2 * lang));
  const tSpitze = richtung(profil.ort(0.8 * lang), spitze);
  // unten ist die Seite, deren Normale nach unten zeigt: links der Laufrichtung liegt (−t.y, t.x)
  const sehne = richtung(C, spitze);
  return { C, profil, lang, t0, spitze, tSpitze, untenLinks: sehne.x < 0 };
}

/** Wo der Tropfen eines Knochens in Ruhe sitzt: ein Stück vor der Kieferspitze, auf der Seite seines Kiefers (wie in der Studie) */
export function kieferTropfenRuhe(L: MaulLage, oben: boolean): V2 {
  const t = L.tSpitze;
  // (links der Laufrichtung liegt der Oberkiefer, wenn der Unterkiefer rechts liegt, und umgekehrt)
  const s = (oben !== L.untenLinks ? 1 : -1) * 0.12 * L.lang;
  return { x: L.spitze.x + t.x * 0.14 * L.lang - t.y * s, y: L.spitze.y + t.y * 0.14 * L.lang + t.x * s };
}

/** je Punkt der Haut: sein Winkel um das Scharnier gegen die Lippe (Bogenmaß, 0 … π), ln(Abstand / Reichweite) und ob er zum Unterkiefer gehört */
type KieferFeld = { phi: Float32Array; lnR: Float32Array; unten: Uint8Array };
const kieferFelder = new WeakMap<MaulAmLoop, KieferFeld>();

/**
 * Die Kiefer am Maul als echte Form: je Punkt der Haut, zu welchem Kiefer er gehört und wo er um das Scharnier liegt. `ecke`: die
 * Probe der Lippe am Mundwinkel.
 *
 * Welcher Kiefer: Lippe und Tasche aus den Linien (`kieferSeiten`: Zu liegen Gaumen und Boden aufeinander, die Lage sagt dort
 * nichts). Außen vor dem Mundwinkel die Lippe, die über das Netz näher liegt (die Lippe trennt die Haut der zwei Kiefer dort ganz);
 * hinter dem Mundwinkel, wo die Haut nicht geschnitten ist, die Seite der Geraden durch den Mundwinkel.
 *
 * Die Gewichte im Ergebnis (`gewicht`, `gewichtOben`) gelten für kleine Winkel; den Winkel je Punkt für einen Stand der Knochen
 * rechnet `kieferWinkel` (weit geöffnet laufen die Drehungen breiter aus). `wieVorher`: Gilt es für dieselbe Haut, gilt es weiter
 * (im Zug).
 */
export function maulEchtAmLoop(h: Haut, loops: readonly Loop[], lippe: Loop, ecke: number, opt: { wieVorher?: MaulAmLoop | null } = {}): MaulAmLoop | null {
  const T = h.tri.length / 3;
  const alt = opt.wieVorher;
  if (alt && alt.gewicht.length === h.n && alt.offen.length === T && kieferFelder.has(alt)) return alt;
  const L = maulLage(h, lippe, ecke);
  if (!L) return null;
  const sk = kieferSeiten(h, loops, lippe.id, { profil: L.profil, C: L.C });
  const unten: 1 | -1 = L.untenLinks ? 1 : -1;
  const reich = KIEFER_REICHWEITE * L.lang;
  /** ein Ort der Seite um das Scharnier: Winkel gegen die Lippe, ln(r / Reichweite), hinter dem Mundwinkel, links der Geraden durch ihn */
  const umC = (x: number, y: number): { phi: number; lnR: number; hinten: boolean; links: boolean } => {
    const dx = x - L.C.x;
    const dy = y - L.C.y;
    const r = Math.hypot(dx, dy);
    const vor = dx * L.t0.x + dy * L.t0.y;
    return { phi: r > 1e-9 ? Math.acos(Math.max(-1, Math.min(1, vor / r))) : 0, lnR: r > 1e-9 ? Math.log(r / reich) : -Infinity, hinten: vor < 0, links: L.t0.x * dy - L.t0.y * dx >= 0 };
  };
  const feld: KieferFeld = { phi: new Float32Array(h.n), lnR: new Float32Array(h.n), unten: new Uint8Array(h.n) };
  for (let v = 0; v < h.n; v++) {
    const o = umC(h.pos[3 * v]!, h.pos[3 * v + 1]!);
    const innen = !sk.aussen[v] || sk.lippe.has(v);
    const seite = !innen && o.hinten ? (o.links ? 1 : -1) : sk.seite[v]!;
    feld.phi[v] = o.phi;
    feld.lnR[v] = Math.max(-1e6, o.lnR);
    feld.unten[v] = seite === unten ? 1 : 0;
  }
  // genau spiegelgleich (die Seiten werden der Reihe nach über das Netz verteilt: Ein Paar bekommt die Seite seines ersten Punkts)
  for (let v = 0; v < h.n; v++) {
    const sp = h.spiegel[v]!;
    if (sp > v) feld.unten[sp] = feld.unten[v]!;
  }
  const klein = auslauf(0);
  const gewicht = new Float32Array(h.n);
  const gewichtOben = new Float32Array(h.n);
  for (let v = 0; v < h.n; v++) (feld.unten[v] ? gewicht : gewichtOben)[v] = anteil(feld.phi[v]!, feld.lnR[v]!, klein);
  // die Lippen als Punktnummern, je vom einen Mundwinkel um die Schnauze zum anderen
  const kette = lippe.proben.map((p) => p.ecken[0]);
  const rund = (teil: number[]): Uint32Array => Uint32Array.from([...teil, ...teil.map((v) => h.spiegel[v]!).filter((v) => v >= 0).reverse()]);
  const erste = rund(kette.slice(0, ecke + 1).reverse());
  const zweite = rund(kette.slice(ecke));
  const ersteUnten = sk.ersteSeite === unten;
  /** das Feld an einem Ort der Seite, für den Kiefer auf dieser Seite der Lippe (bei kleinen Winkeln) */
  const bei = (x: number, y: number, fuerUnten: boolean): number => {
    const o = umC(x, y);
    const links = o.hinten ? o.links : L.profil.naechster(x, y).d >= 0;
    return (links === L.untenLinks) === fuerUnten ? anteil(o.phi, o.lnR, klein) : 0;
  };
  const m: MaulAmLoop = {
    positionen: Float32Array.from(h.pos),
    normalen: new Float32Array(3 * h.n),
    indizes: Uint32Array.from(h.tri),
    innen: { positionen: new Float32Array(0), normalen: new Float32Array(0), indizes: new Uint32Array(0) },
    lippeOben: ersteUnten ? zweite : erste,
    lippeUnten: ersteUnten ? erste : zweite,
    gelenk: { x: L.C.x, y: L.C.y },
    linie: [...L.profil.p].reverse().map((q) => ({ x: q.x, y: q.y })),
    drehsinn: unten,
    gewichtBei: (x, y) => bei(x, y, true),
    schaedelBei: (x, y) => bei(x, y, false),
    gewicht,
    gradient: new Float32Array(2 * h.n),
    gewichtOben,
    gradientOben: new Float32Array(2 * h.n),
    innenUnten: new Uint8Array(0),
    unten: null,
    tiefe: () => 0,
    offen: new Uint8Array(T),
    kantenOffen: new Set<number>(),
  };
  kieferFelder.set(m, feld);
  return m;
}

/**
 * Der Drehwinkel je Punkt der Haut (Bogenmaß) für einen Stand der zwei Knochen (Grad: `kiefer` der Unterkiefer, `schaedel` der
 * Oberkiefer), am Maul als echte Form. Wie `knochenWinkel` im Kern, nur laufen die Drehungen hier mit dem Winkel breiter aus.
 * `zuBis` (Grad): so weit darf der Unterkiefer unter die gerechnete Lage schließen (der Haarspalt). Null: `m` ist kein solches Maul.
 */
export function kieferWinkel(m: MaulAmLoop, k: { kiefer: number; schaedel: number }, zuBis = 0): Float64Array | null {
  const feld = kieferFelder.get(m);
  if (!feld) return null;
  const a = (Math.max(-Math.max(0, zuBis), k.kiefer) * Math.PI) / 180;
  const s = (Math.max(0, k.schaedel) * Math.PI) / 180;
  const fa = auslauf(a);
  const fs = auslauf(s);
  const n = feld.phi.length;
  const theta = new Float64Array(n);
  for (let v = 0; v < n; v++) theta[v] = m.drehsinn * (feld.unten[v] ? a * anteil(feld.phi[v]!, feld.lnR[v]!, fa) : -s * anteil(feld.phi[v]!, feld.lnR[v]!, fs));
  return theta;
}
