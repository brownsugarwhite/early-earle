// Plan vom 12.11.2026, Schritt 1 „glatte Anzeige“, Florians Wahl am 12.11.: Spalte 3 des Vergleichsbilds („gekrümmte Dreiecke, ruhig
// schattiert“). Dieselbe Rechnung wie in `glatt.ts` (`verfeinernGekruemmt` für die Lagen, `unterteilen` und `netzNormalen` für die
// Normalen), aber aufgeteilt in das, was nur am Netz hängt (Kanten, Nachbarzahlen, welche Kante auf einer Linie liegt: einmal je
// Netzstand), und das, was sich mit jedem Bild ändert (Lagen, Pfadstücke: nur Schleifen über Zahlenfelder). `glattPlan.test.ts` prüft
// beide Wege gegeneinander.
//
// Lagen: ohne Glätten verfeinert. Jede Kante bekommt einen Punkt in der Mitte ihrer gewölbten Kante, auf einer Linie in der Mitte
// ihres Pfadstücks; die alten Punkte bleiben. Die Fläche geht durch alle Rechenpunkte, die Linien liegen auf ihrem Pfad, nichts
// schwingt über. Normalen: die der gewöhnlichen Unterteilung (Loop) desselben Netzes; die ist überall glatt, auch über die weichen
// Linien, und gibt ruhige Farbstufen. Beide Verfeinerungen zählen ihre Punkte gleich.
import { type Kanten, kantenVon } from './glatt';

type Stufe = {
  /** Punkte und Dreiecke vor dem Verfeinern */
  n: number;
  tri: Uint32Array;
  K: Kanten;
  /** Nachbarn je Punkt, davon über Randkanten */
  zahl: Uint16Array;
  randZahl: Uint8Array;
  /** Punkte, die beim Unterteilen bleiben (auf harten Linien) */
  fest: Uint8Array;
  /** je Kante ihr Pfadstück (−1: keins); je Pfadstück, ob es hart ist */
  pfadNr: Int32Array;
  hart: Uint8Array;
  stuecke: number;
  /** nach dem Verfeinern: Dreiecke, feste Punkte, je Pfadstück der nächsten Stufe seine Kante (Enden a < b, −1: fehlt) */
  triFein: Uint32Array;
  festFein: Uint8Array;
  kindA: Int32Array;
  kindB: Int32Array;
  // Arbeitsfelder (je Bild überschrieben)
  sum: Float64Array;
  randSum: Float64Array;
  grenz: Float64Array;
  nor: Float64Array;
  pfad: Float64Array;
  lagen: Float64Array;
  ruhig: Float64Array;
  /** Normalenfeld vor und nach dem Verfeinern (`rechnen` mit `feld`) */
  feld: Float64Array;
  feldFein: Float64Array;
  /** je Kante: wie stark b bei a zählt und a bei b, wenn gemittelt wird (`normalenUndGewichte`); Summe der Gewichte je Punkt */
  gewAB: Float64Array;
  gewBA: Float64Array;
  gewSumme: Float64Array;
};

/** Eine Kante der Anzeige auf einer Linie: ihre Punkte (die Kontrollpunkte laufen von `a` nach `b`) und ob die Linie dort hart ist */
export type LinienKante = { a: number; b: number; hart: boolean };

function stufeBauen(tri: Uint32Array, n: number, fest: Uint8Array, sa: Int32Array, sb: Int32Array, hart: Uint8Array): Stufe {
  const K = kantenVon(tri, n);
  const E = K.a.length;
  const F = tri.length / 3;
  const zahl = new Uint16Array(n);
  const randZahl = new Uint8Array(n);
  for (let i = 0; i < E; i++) {
    const a = K.a[i]!;
    const b = K.b[i]!;
    zahl[a] = zahl[a]! + 1;
    zahl[b] = zahl[b]! + 1;
    if (K.d[i]! < 0) {
      randZahl[a] = randZahl[a]! + 1;
      randZahl[b] = randZahl[b]! + 1;
    }
  }
  const stuecke = sa.length;
  const pfadNr = new Int32Array(E).fill(-1);
  if (stuecke > 0) {
    const such = new Map<number, number>();
    for (let j = 0; j < stuecke; j++) if (sa[j]! >= 0) such.set(sa[j]! * n + sb[j]!, j);
    for (let i = 0; i < E; i++) {
      const j = such.get(K.a[i]! * n + K.b[i]!);
      if (j !== undefined) pfadNr[i] = j;
    }
  }
  const festFein = new Uint8Array(n + E);
  festFein.set(fest);
  const kindA = new Int32Array(2 * stuecke).fill(-1);
  const kindB = new Int32Array(2 * stuecke).fill(-1);
  for (let i = 0; i < E; i++) {
    const j = pfadNr[i]!;
    if (j < 0) continue;
    const m = n + i;
    if (hart[j]) festFein[m] = 1;
    // die Hälften: von a zur Mitte (2j) und von b zur Mitte (2j + 1); a und b sind kleiner als m
    kindA[2 * j] = K.a[i]!;
    kindB[2 * j] = m;
    kindA[2 * j + 1] = K.b[i]!;
    kindB[2 * j + 1] = m;
  }
  const triFein = new Uint32Array(12 * F);
  for (let f = 0; f < F; f++) {
    const a = tri[3 * f]!;
    const b = tri[3 * f + 1]!;
    const c = tri[3 * f + 2]!;
    const ab = n + K.seite[3 * f]!;
    const bc = n + K.seite[3 * f + 1]!;
    const ca = n + K.seite[3 * f + 2]!;
    const o = 12 * f;
    triFein[o] = a;
    triFein[o + 1] = ab;
    triFein[o + 2] = ca;
    triFein[o + 3] = b;
    triFein[o + 4] = bc;
    triFein[o + 5] = ab;
    triFein[o + 6] = c;
    triFein[o + 7] = ca;
    triFein[o + 8] = bc;
    triFein[o + 9] = ab;
    triFein[o + 10] = bc;
    triFein[o + 11] = ca;
  }
  return {
    n,
    tri,
    K,
    zahl,
    randZahl,
    fest,
    pfadNr,
    hart,
    stuecke,
    triFein,
    festFein,
    kindA,
    kindB,
    sum: new Float64Array(3 * n),
    randSum: new Float64Array(3 * n),
    grenz: new Float64Array(3 * n),
    nor: new Float64Array(3 * n),
    pfad: new Float64Array(12 * stuecke),
    lagen: new Float64Array(3 * (n + E)),
    ruhig: new Float64Array(3 * (n + E)),
    feld: new Float64Array(3 * n),
    feldFein: new Float64Array(3 * (n + E)),
    gewAB: new Float64Array(E),
    gewBA: new Float64Array(E),
    gewSumme: new Float64Array(n),
  };
}

/** Normale je Punkt aus den Dreiecken, nach deren Fläche gewichtet, Länge 1 (in `aus`, 3 je Punkt) */
function normalenIn(pos: ArrayLike<number>, tri: Uint32Array, aus: Float64Array | Float32Array): void {
  aus.fill(0);
  for (let t = 0; t < tri.length; t += 3) {
    const a = 3 * tri[t]!;
    const b = 3 * tri[t + 1]!;
    const c = 3 * tri[t + 2]!;
    const ux = pos[b]! - pos[a]!;
    const uy = pos[b + 1]! - pos[a + 1]!;
    const uz = pos[b + 2]! - pos[a + 2]!;
    const vx = pos[c]! - pos[a]!;
    const vy = pos[c + 1]! - pos[a + 1]!;
    const vz = pos[c + 2]! - pos[a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    aus[a] = aus[a]! + nx;
    aus[a + 1] = aus[a + 1]! + ny;
    aus[a + 2] = aus[a + 2]! + nz;
    aus[b] = aus[b]! + nx;
    aus[b + 1] = aus[b + 1]! + ny;
    aus[b + 2] = aus[b + 2]! + nz;
    aus[c] = aus[c]! + nx;
    aus[c + 1] = aus[c + 1]! + ny;
    aus[c + 2] = aus[c + 2]! + nz;
  }
  for (let v = 0; v < aus.length; v += 3) {
    const l = Math.sqrt(aus[v]! * aus[v]! + aus[v + 1]! * aus[v + 1]! + aus[v + 2]! * aus[v + 2]!) || 1;
    aus[v] = aus[v]! / l;
    aus[v + 1] = aus[v + 1]! / l;
    aus[v + 2] = aus[v + 2]! / l;
  }
}

/** Summe der Nachbarlagen je Punkt (und über Randkanten für sich) */
function nachbarSummen(S: Stufe, P: Float64Array, mitRand: boolean): void {
  const { K, sum, randSum } = S;
  sum.fill(0);
  if (mitRand) randSum.fill(0);
  const E = K.a.length;
  for (let i = 0; i < E; i++) {
    const a = 3 * K.a[i]!;
    const b = 3 * K.b[i]!;
    sum[a] = sum[a]! + P[b]!;
    sum[a + 1] = sum[a + 1]! + P[b + 1]!;
    sum[a + 2] = sum[a + 2]! + P[b + 2]!;
    sum[b] = sum[b]! + P[a]!;
    sum[b + 1] = sum[b + 1]! + P[a + 1]!;
    sum[b + 2] = sum[b + 2]! + P[a + 2]!;
    if (mitRand && K.d[i]! < 0) {
      randSum[a] = randSum[a]! + P[b]!;
      randSum[a + 1] = randSum[a + 1]! + P[b + 1]!;
      randSum[a + 2] = randSum[a + 2]! + P[b + 2]!;
      randSum[b] = randSum[b]! + P[a]!;
      randSum[b + 1] = randSum[b + 1]! + P[a + 1]!;
      randSum[b + 2] = randSum[b + 2]! + P[a + 2]!;
    }
  }
}

/** ruhige Normalen der Stufe (wie `ruhigeNormalen` in glatt.ts): die des Netzes, jeder freie Punkt auf seiner Grenzlage */
function ruhigeNormalenIn(S: Stufe, P: Float64Array): void {
  nachbarSummen(S, P, false);
  const { n, zahl, randZahl, fest, sum, grenz } = S;
  for (let v = 0; v < n; v++) {
    const o = 3 * v;
    if (randZahl[v] || fest[v]) {
      grenz[o] = P[o]!;
      grenz[o + 1] = P[o + 1]!;
      grenz[o + 2] = P[o + 2]!;
      continue;
    }
    const k = zahl[v]!;
    const chi = k === 3 ? 1 / 5 : 1 / (2 * k);
    const selbst = 1 - k * chi;
    grenz[o] = selbst * P[o]! + chi * sum[o]!;
    grenz[o + 1] = selbst * P[o + 1]! + chi * sum[o + 1]!;
    grenz[o + 2] = selbst * P[o + 2]! + chi * sum[o + 2]!;
  }
  normalenIn(grenz, S.tri, S.nor);
}

/** Lagen ohne Glätten verfeinern (wie `verfeinernGekruemmt`); die Hälften der Pfadstücke gehen nach `kind` (12 je Hälfte) */
function verfeinernIn(S: Stufe, P: Float64Array, kind: Float64Array | null): void {
  const { n, K, pfadNr, pfad, nor, lagen } = S;
  lagen.set(P.subarray(0, 3 * n));
  const E = K.a.length;
  for (let i = 0; i < E; i++) {
    const a = 3 * K.a[i]!;
    const b = 3 * K.b[i]!;
    const m = 3 * (n + i);
    const j = pfadNr[i]!;
    if (j >= 0) {
      const o = 12 * j;
      for (let x = 0; x < 3; x++) {
        const k0 = pfad[o + x]!;
        const k1 = pfad[o + 3 + x]!;
        const k2 = pfad[o + 6 + x]!;
        const k3 = pfad[o + 9 + x]!;
        const mitte = (k0 + 3 * k1 + 3 * k2 + k3) / 8;
        lagen[m + x] = mitte;
        if (kind) {
          const l = 24 * j;
          kind[l + x] = k0;
          kind[l + 3 + x] = (k0 + k1) / 2;
          kind[l + 6 + x] = (k0 + 2 * k1 + k2) / 4;
          kind[l + 9 + x] = mitte;
          kind[l + 12 + x] = k3;
          kind[l + 15 + x] = (k2 + k3) / 2;
          kind[l + 18 + x] = (k1 + 2 * k2 + k3) / 4;
          kind[l + 21 + x] = mitte;
        }
      }
      continue;
    }
    const dx = P[b]! - P[a]!;
    const dy = P[b + 1]! - P[a + 1]!;
    const dz = P[b + 2]! - P[a + 2]!;
    if (K.d[i]! < 0) {
      lagen[m] = P[a]! + 0.5 * dx;
      lagen[m + 1] = P[a + 1]! + 0.5 * dy;
      lagen[m + 2] = P[a + 2]! + 0.5 * dz;
      continue;
    }
    const wa = dx * nor[a]! + dy * nor[a + 1]! + dz * nor[a + 2]!;
    const wb = -(dx * nor[b]! + dy * nor[b + 1]! + dz * nor[b + 2]!);
    lagen[m] = 0.5 * (P[a]! + P[b]!) - 0.125 * (wa * nor[a]! + wb * nor[b]!);
    lagen[m + 1] = 0.5 * (P[a + 1]! + P[b + 1]!) - 0.125 * (wa * nor[a + 1]! + wb * nor[b + 1]!);
    lagen[m + 2] = 0.5 * (P[a + 2]! + P[b + 2]!) - 0.125 * (wa * nor[a + 2]! + wb * nor[b + 2]!);
  }
}

/** eine Stufe der gewöhnlichen Unterteilung (wie `unterteilen` ohne `alleLinien`): nur harte Linien bleiben auf ihrem Pfad */
function unterteilenIn(S: Stufe, L: Float64Array): void {
  nachbarSummen(S, L, true);
  const { n, K, zahl, randZahl, fest, sum, randSum, pfadNr, hart, pfad, ruhig } = S;
  for (let v = 0; v < n; v++) {
    const o = 3 * v;
    if (fest[v]) {
      ruhig[o] = L[o]!;
      ruhig[o + 1] = L[o + 1]!;
      ruhig[o + 2] = L[o + 2]!;
    } else if (randZahl[v]) {
      if (randZahl[v] === 2) {
        ruhig[o] = 0.75 * L[o]! + 0.125 * randSum[o]!;
        ruhig[o + 1] = 0.75 * L[o + 1]! + 0.125 * randSum[o + 1]!;
        ruhig[o + 2] = 0.75 * L[o + 2]! + 0.125 * randSum[o + 2]!;
      } else {
        ruhig[o] = L[o]!;
        ruhig[o + 1] = L[o + 1]!;
        ruhig[o + 2] = L[o + 2]!;
      }
    } else {
      const k = zahl[v]!;
      const beta = k === 3 ? 3 / 16 : 3 / (8 * k);
      const selbst = 1 - k * beta;
      ruhig[o] = selbst * L[o]! + beta * sum[o]!;
      ruhig[o + 1] = selbst * L[o + 1]! + beta * sum[o + 1]!;
      ruhig[o + 2] = selbst * L[o + 2]! + beta * sum[o + 2]!;
    }
  }
  const E = K.a.length;
  for (let i = 0; i < E; i++) {
    const a = 3 * K.a[i]!;
    const b = 3 * K.b[i]!;
    const m = 3 * (n + i);
    const j = pfadNr[i]!;
    if (j >= 0 && hart[j]) {
      const o = 12 * j;
      ruhig[m] = (pfad[o]! + 3 * pfad[o + 3]! + 3 * pfad[o + 6]! + pfad[o + 9]!) / 8;
      ruhig[m + 1] = (pfad[o + 1]! + 3 * pfad[o + 4]! + 3 * pfad[o + 7]! + pfad[o + 10]!) / 8;
      ruhig[m + 2] = (pfad[o + 2]! + 3 * pfad[o + 5]! + 3 * pfad[o + 8]! + pfad[o + 11]!) / 8;
    } else if (K.d[i]! < 0) {
      ruhig[m] = 0.5 * (L[a]! + L[b]!);
      ruhig[m + 1] = 0.5 * (L[a + 1]! + L[b + 1]!);
      ruhig[m + 2] = 0.5 * (L[a + 2]! + L[b + 2]!);
    } else {
      const c = 3 * K.c[i]!;
      const d = 3 * K.d[i]!;
      ruhig[m] = 0.375 * (L[a]! + L[b]!) + 0.125 * (L[c]! + L[d]!);
      ruhig[m + 1] = 0.375 * (L[a + 1]! + L[b + 1]!) + 0.125 * (L[c + 1]! + L[d + 1]!);
      ruhig[m + 2] = 0.375 * (L[a + 2]! + L[b + 2]!) + 0.125 * (L[c + 2]! + L[d + 2]!);
    }
  }
}

/**
 * Beim Beruhigen zählt ein Nachbar voll, solange seine Normale höchstens 35° abweicht, ab 45° gar nicht (dazwischen fällt sein
 * Gewicht gleichmäßig): Ein Grat ist Form, keine Unruhe. Unter 35° darf das Gewicht nicht vom Winkel abhängen: Sonst zählten die
 * näheren Nachbarn mehr als die ferneren, und die Normale kippte wieder zur dichteren Seite (gemessen am 12.11. an einer Kugel mit
 * ungleichmäßigem Netz: mit einem Gewicht, das ab 0° fällt, nach drei Durchgängen bis 1,6° daneben, so 0,05°).
 */
const RUHE_VOLL = Math.cos((35 * Math.PI) / 180);
const RUHE_GRENZE = Math.cos((45 * Math.PI) / 180);

/**
 * Normale je Punkt und Gewichte fürs Mitteln, beide so, dass ein ungleichmäßiges Netz sie nicht verfälscht (das Netz aus der
 * Startkugel hat Kanten von 3 bis 14 Einheiten, kaum ein Punkt liegt in der Mitte seiner Nachbarn):
 * - Normale nach Max (1999): je Ecke eines Dreiecks das Kreuzprodukt ihrer beiden Kanten, geteilt durch deren Längen im Quadrat.
 *   Liegen die Punkte auf einer Kugel, ist das genau die Kugelnormale. (Nach der Fläche gewichtet oder an den Grenzlagen der
 *   Unterteilung gemessen, kippt die Normale um bis zu einem halben Grad zur Seite, auf der die Nachbarn dichter liegen; an einer
 *   Farbstufe der Startkugel sind das Wellen von mehreren Bildpunkten.)
 * - Gewichte nach den Mittelwert-Koordinaten (Floater 2003): Der gewichtete Schwerpunkt der Nachbarn liegt über dem Punkt selbst,
 *   nicht daneben; ein Feld, das sich gleichmäßig ändert (die Normalen einer Kugel), bleibt beim Mitteln, wie es ist.
 */
function normalenUndGewichte(S: Stufe, P: Float64Array): void {
  const { tri, feld, gewAB, gewBA } = S;
  const seite = S.K.seite;
  const Ka = S.K.a;
  feld.fill(0);
  gewAB.fill(0);
  gewBA.fill(0);
  for (let t = 0; t < tri.length; t += 3) {
    const i0 = tri[t]!;
    const i1 = tri[t + 1]!;
    const i2 = tri[t + 2]!;
    const a = 3 * i0;
    const b = 3 * i1;
    const c = 3 * i2;
    // die drei Kanten reihum (u: 0 → 1, v: 1 → 2, w: 2 → 0) und ihre Längen im Quadrat
    const ux = P[b]! - P[a]!;
    const uy = P[b + 1]! - P[a + 1]!;
    const uz = P[b + 2]! - P[a + 2]!;
    const vx = P[c]! - P[b]!;
    const vy = P[c + 1]! - P[b + 1]!;
    const vz = P[c + 2]! - P[b + 2]!;
    const wx = P[a]! - P[c]!;
    const wy = P[a + 1]! - P[c + 1]!;
    const wz = P[a + 2]! - P[c + 2]!;
    const lu2 = ux * ux + uy * uy + uz * uz;
    const lv2 = vx * vx + vy * vy + vz * vz;
    const lw2 = wx * wx + wy * wy + wz * wz;
    if (!(lu2 > 0) || !(lv2 > 0) || !(lw2 > 0)) continue;
    // das Kreuzprodukt der beiden Kanten einer Ecke ist an allen drei Ecken dasselbe: u × (−w)
    const cx = uz * wy - uy * wz;
    const cy = ux * wz - uz * wx;
    const cz = uy * wx - ux * wy;
    // Max: je Ecke geteilt durch die Längen im Quadrat ihrer beiden Kanten
    const m0 = 1 / (lu2 * lw2);
    const m1 = 1 / (lv2 * lu2);
    const m2 = 1 / (lw2 * lv2);
    feld[a] = feld[a]! + m0 * cx;
    feld[a + 1] = feld[a + 1]! + m0 * cy;
    feld[a + 2] = feld[a + 2]! + m0 * cz;
    feld[b] = feld[b]! + m1 * cx;
    feld[b + 1] = feld[b + 1]! + m1 * cy;
    feld[b + 2] = feld[b + 2]! + m1 * cz;
    feld[c] = feld[c]! + m2 * cx;
    feld[c + 1] = feld[c + 1]! + m2 * cy;
    feld[c + 2] = feld[c + 2]! + m2 * cz;
    // tan(θ/2) des Winkels je Ecke = |Kreuzprodukt| / (Produkt der Längen + Skalarprodukt), das Skalarprodukt aus den Längen
    // (Kosinussatz); verteilt auf die beiden Kanten der Ecke, geteilt durch deren Länge
    const lu = Math.sqrt(lu2);
    const lv = Math.sqrt(lv2);
    const lw = Math.sqrt(lw2);
    const cl = Math.sqrt(cx * cx + cy * cy + cz * cz);
    const knapp = 1 + 1e-12;
    const t0 = cl / (lu * lw * knapp + 0.5 * (lu2 + lw2 - lv2));
    const t1 = cl / (lv * lu * knapp + 0.5 * (lv2 + lu2 - lw2));
    const t2 = cl / (lw * lv * knapp + 0.5 * (lw2 + lv2 - lu2));
    const e0 = seite[t]!;
    const e1 = seite[t + 1]!;
    const e2 = seite[t + 2]!;
    // Kante 0 (zwischen den Ecken 0 und 1)
    if (Ka[e0] === i0) {
      gewAB[e0] = gewAB[e0]! + t0 / lu;
      gewBA[e0] = gewBA[e0]! + t1 / lu;
    } else {
      gewBA[e0] = gewBA[e0]! + t0 / lu;
      gewAB[e0] = gewAB[e0]! + t1 / lu;
    }
    // Kante 1 (zwischen 1 und 2)
    if (Ka[e1] === i1) {
      gewAB[e1] = gewAB[e1]! + t1 / lv;
      gewBA[e1] = gewBA[e1]! + t2 / lv;
    } else {
      gewBA[e1] = gewBA[e1]! + t1 / lv;
      gewAB[e1] = gewAB[e1]! + t2 / lv;
    }
    // Kante 2 (zwischen 2 und 0)
    if (Ka[e2] === i2) {
      gewAB[e2] = gewAB[e2]! + t2 / lw;
      gewBA[e2] = gewBA[e2]! + t0 / lw;
    } else {
      gewBA[e2] = gewBA[e2]! + t2 / lw;
      gewAB[e2] = gewAB[e2]! + t0 / lw;
    }
  }
  for (let v = 0; v < feld.length; v += 3) {
    const l = Math.sqrt(feld[v]! * feld[v]! + feld[v + 1]! * feld[v + 1]! + feld[v + 2]! * feld[v + 2]!) || 1;
    feld[v] = feld[v]! / l;
    feld[v + 1] = feld[v + 1]! / l;
    feld[v + 2] = feld[v + 2]! / l;
  }
}

/**
 * Das Normalenfeld beruhigen: Jede Normale wandert `runden`-mal zur Hälfte zum gewichteten Mittel ihrer Nachbarn (Länge 1). Die
 * Wölbung der Form bleibt (ein Feld, das sich gleichmäßig ändert, bleibt, wie es ist; an einem Grat mischen die beiden Flanken
 * nicht: `RUHE_GRENZE`), nur die Unruhe geht. Über harte Linien hinweg gibt es keine Nachbarn (die Punkte sind dort je Seite
 * doppelt). Anlass: An der Startkugel liegen die Rechenpunkte bis 0,14 Einheiten neben der Kugel, das sind an den Normalen rund
 * 0,5° Unruhe. (Mit dem kleinen Rechennetz aus Schritt 2 des Plans liegen die Punkte auf der gerechneten Fläche; dann prüfen, ob
 * es das Beruhigen noch braucht.)
 */
function feldBeruhigen(S: Stufe, F: Float64Array, runden: number): void {
  const { n, K, sum, gewAB, gewBA, gewSumme } = S;
  const E = K.a.length;
  for (let r = 0; r < runden; r++) {
    sum.fill(0);
    gewSumme.fill(0);
    for (let i = 0; i < E; i++) {
      const a = 3 * K.a[i]!;
      const b = 3 * K.b[i]!;
      const gleich = F[a]! * F[b]! + F[a + 1]! * F[b + 1]! + F[a + 2]! * F[b + 2]!;
      if (gleich <= RUHE_GRENZE) continue;
      const nah = gleich >= RUHE_VOLL ? 1 : (gleich - RUHE_GRENZE) / (RUHE_VOLL - RUHE_GRENZE);
      const wa = nah * gewAB[i]!;
      const wb = nah * gewBA[i]!;
      sum[a] = sum[a]! + wa * F[b]!;
      sum[a + 1] = sum[a + 1]! + wa * F[b + 1]!;
      sum[a + 2] = sum[a + 2]! + wa * F[b + 2]!;
      sum[b] = sum[b]! + wb * F[a]!;
      sum[b + 1] = sum[b + 1]! + wb * F[a + 1]!;
      sum[b + 2] = sum[b + 2]! + wb * F[a + 2]!;
      gewSumme[K.a[i]!] = gewSumme[K.a[i]!]! + wa;
      gewSumme[K.b[i]!] = gewSumme[K.b[i]!]! + wb;
    }
    for (let v = 0; v < n; v++) {
      const g = gewSumme[v]!;
      if (!(g > 0)) continue;
      const o = 3 * v;
      const x = 0.5 * F[o]! + (0.5 * sum[o]!) / g;
      const y = 0.5 * F[o + 1]! + (0.5 * sum[o + 1]!) / g;
      const z = 0.5 * F[o + 2]! + (0.5 * sum[o + 2]!) / g;
      const l = Math.sqrt(x * x + y * y + z * z) || 1;
      F[o] = x / l;
      F[o + 1] = y / l;
      F[o + 2] = z / l;
    }
  }
}

/**
 * Das Normalenfeld eine Stufe verfeinern, passend zu den Lagen (`verfeinernIn`): Die alten Punkte behalten ihre Normale, ein neuer
 * Punkt bekommt das Mittel der beiden Enden seiner Kante. (Verfeinert nach den Regeln der gewöhnlichen Unterteilung, säße das Feld
 * dort, wohin jene Unterteilung die Punkte längs der Fläche schiebt, an der Startkugel bis zu einer halben Kante neben den gezeigten
 * Punkten: Die Farbstufen wellten deshalb weiter.)
 */
function feldVerfeinernIn(S: Stufe, F: Float64Array): void {
  const { n, K, feldFein } = S;
  feldFein.set(F.subarray(0, 3 * n));
  const E = K.a.length;
  for (let i = 0; i < E; i++) {
    const a = 3 * K.a[i]!;
    const b = 3 * K.b[i]!;
    const m = 3 * (n + i);
    feldFein[m] = 0.5 * (F[a]! + F[b]!);
    feldFein[m + 1] = 0.5 * (F[a + 1]! + F[b + 1]!);
    feldFein[m + 2] = 0.5 * (F[a + 2]! + F[b + 2]!);
  }
}

/**
 * Die glatte Anzeige für einen Netzstand. Angelegt aus dem Netz der Anzeige (Dreiecke, Punkte auf harten Linien schon je Seite
 * doppelt), den festen Punkten und den Kanten auf Linien; die Stufen der Verfeinerung entstehen erst, wenn sie gebraucht werden.
 */
export class GlattPlan {
  private readonly st: Stufe[] = [];
  private readonly drehen: Uint8Array;
  private readonly aus = new Map<number, { pos: Float32Array; nor: Float32Array }>();
  readonly linien: number;

  constructor(tri: Uint32Array, n: number, fest: Uint8Array, linien: readonly LinienKante[]) {
    const m = linien.length;
    this.linien = m;
    const sa = new Int32Array(m);
    const sb = new Int32Array(m);
    const hart = new Uint8Array(m);
    this.drehen = new Uint8Array(m);
    linien.forEach((l, i) => {
      sa[i] = Math.min(l.a, l.b);
      sb[i] = Math.max(l.a, l.b);
      hart[i] = l.hart ? 1 : 0;
      this.drehen[i] = l.a > l.b ? 1 : 0;
    });
    this.st.push(stufeBauen(tri, n, fest, sa, sb, hart));
  }

  /** die Stufen bis `stufen` anlegen (jede weitere vervierfacht die Dreiecke) */
  private sichern(stufen: number): void {
    while (this.st.length < stufen) {
      const S = this.st[this.st.length - 1]!;
      const hart = new Uint8Array(2 * S.stuecke);
      for (let j = 0; j < S.stuecke; j++) hart[2 * j] = hart[2 * j + 1] = S.hart[j]!;
      this.st.push(stufeBauen(S.triFein, S.n + S.K.a.length, S.festFein, S.kindA, S.kindB, hart));
    }
  }

  /** Punkte nach `stufen` Stufen */
  punkte(stufen: number): number {
    this.sichern(Math.max(1, stufen));
    if (stufen === 0) return this.st[0]!.n;
    const S = this.st[stufen - 1]!;
    return S.n + S.K.a.length;
  }

  /** Dreiecke nach `stufen` Stufen (ein Feld je Stufe, bleibt dasselbe) */
  index(stufen: number): Uint32Array {
    this.sichern(Math.max(1, stufen));
    return stufen === 0 ? this.st[0]!.tri : this.st[stufen - 1]!.triFein;
  }

  /**
   * Ein Wert je Rechenpunkt auf die feinen Punkte weitergereicht (für die Seite der Spiegelung): Ein neuer Punkt nimmt den Wert des
   * ersten Endes seiner Kante, der nicht null ist.
   */
  weiterreichen(stufen: number, werte: ArrayLike<number>): Float32Array {
    this.sichern(Math.max(1, stufen));
    const aus = new Float32Array(this.punkte(stufen));
    for (let v = 0; v < this.st[0]!.n; v++) aus[v] = werte[v]!;
    for (let s = 0; s < stufen; s++) {
      const S = this.st[s]!;
      for (let i = 0; i < S.K.a.length; i++) {
        const a = aus[S.K.a[i]!]!;
        aus[S.n + i] = a !== 0 ? a : aus[S.K.b[i]!]!;
      }
    }
    return aus;
  }

  /**
   * Lagen und Normalen der feinen Punkte (`stufen` = 0: der Rechenpunkte selbst, nur mit den ruhigen Normalen). `lagen`: 3 je Rechenpunkt; `pfade`: 12 je Linienkante in der Reihenfolge von `linien`
   * (Kontrollpunkte von `a` nach `b`); `ruhe`: die Normalen als beruhigtes Feld, so viele Durchgänge (−1: Normalen der gewöhnlich
   * unterteilten Fläche). Die Felder im Ergebnis gehören dem Plan und werden beim nächsten Aufruf mit derselben Zahl an Stufen
   * überschrieben.
   */
  rechnen(lagen: Float64Array, pfade: Float64Array, stufen: number, ruhe = -1): { pos: Float32Array; nor: Float32Array } {
    this.sichern(Math.max(1, stufen));
    const S0 = this.st[0]!;
    // Pfadstücke der ersten Stufe vom kleineren zum größeren Punkt
    for (let i = 0; i < this.linien; i++) {
      const o = 12 * i;
      if (this.drehen[i]) for (let q = 0; q < 4; q++) for (let x = 0; x < 3; x++) S0.pfad[o + 3 * q + x] = pfade[o + 3 * (3 - q) + x]!;
      else for (let x = 0; x < 12; x++) S0.pfad[o + x] = pfade[o + x]!;
    }
    // Normalen: mit `ruhe` ≥ 0 als Feld (je Rechenpunkt die Normale nach Max, `ruhe`-mal beruhigt, dann mit den Lagen verfeinert);
    // sonst die Normalen der gewöhnlich unterteilten Fläche (Vergleichsbild vom 12.11.)
    const feld = ruhe >= 0;
    let P = lagen;
    let L = lagen;
    let F = S0.feld;
    if (feld) {
      normalenUndGewichte(S0, P);
      feldBeruhigen(S0, F, ruhe);
    }
    for (let s = 0; s < stufen; s++) {
      const S = this.st[s]!;
      const naechste = s + 1 < this.st.length ? this.st[s + 1]! : null;
      if (feld) {
        // das Feld gibt auch die Wölbung der Kanten (`verfeinernIn` liest `S.nor`)
        if (s === 0) S.nor.set(F);
        else {
          const nor = S.nor;
          for (let v = 0; v < 3 * S.n; v += 3) {
            const l = Math.sqrt(F[v]! * F[v]! + F[v + 1]! * F[v + 1]! + F[v + 2]! * F[v + 2]!) || 1;
            nor[v] = F[v]! / l;
            nor[v + 1] = F[v + 1]! / l;
            nor[v + 2] = F[v + 2]! / l;
          }
        }
        verfeinernIn(S, P, naechste ? naechste.pfad : null);
        feldVerfeinernIn(S, F);
        F = S.feldFein;
      } else {
        ruhigeNormalenIn(S, P);
        verfeinernIn(S, P, naechste ? naechste.pfad : null);
        unterteilenIn(S, L);
        L = S.ruhig;
      }
      P = S.lagen;
    }
    const N = this.punkte(stufen);
    let aus = this.aus.get(stufen);
    if (!aus) {
      aus = { pos: new Float32Array(3 * N), nor: new Float32Array(3 * N) };
      this.aus.set(stufen, aus);
    }
    for (let i = 0; i < 3 * N; i++) aus.pos[i] = P[i]!;
    if (feld)
      for (let v = 0; v < 3 * N; v += 3) {
        const l = Math.sqrt(F[v]! * F[v]! + F[v + 1]! * F[v + 1]! + F[v + 2]! * F[v + 2]!) || 1;
        aus.nor[v] = F[v]! / l;
        aus.nor[v + 1] = F[v + 1]! / l;
        aus.nor[v + 2] = F[v + 2]! / l;
      }
    else normalenIn(L, this.index(stufen), aus.nor);
    return aus;
  }
}
