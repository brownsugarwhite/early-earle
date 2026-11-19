/**
 * Ozzy, Paint-Modus, Etappe 2 (19.11.2026): Punkte und Richtungen einer Farblinie, und die Kurve zwischen zwei Punkten.
 *
 * Eine Farblinie ist weiter eine dichte Folge von Orten auf der Haut (`stuetzen`). Zum Anfassen hat sie Punkte: einzelne ihrer Orte,
 * jeder mit zwei Richtungen (wie ein Punkt einer Linie der Form: „ein“ zum Stück davor, „aus“ zum Stück danach) und der Angabe, ob
 * die zwei geknickt sind. Eine Richtung steht im Maß des Dreiecks ihres Orts: drei Zahlen zu seinen drei Ecken, Summe null. Der
 * Vektor ist die so gewichtete Summe der Ecken; er dreht und dehnt sich mit dem Dreieck, und beim Netzwechsel gehen die Zahlen wie
 * die Gewichte mit ihren Ecken.
 *
 * Die Kurve zwischen zwei Punkten (`stueckLegen`, wie `aufHautLegen` in der Vorlage `src/linien/raum.ts`): die Bézier-Kurve im Raum
 * aus den zwei Punkten und ihren Richtungen, Probe für Probe auf die Haut gelegt (an den nächsten Ort der Haut, auf der Seite, die
 * die zwei Punkte zeigen). Gerechnet wird sie nur, wenn ein Punkt oder eine Richtung angefasst wird; danach gehen ihre Orte mit der
 * Haut mit wie alle anderen.
 *
 * Ohne DOM und ohne three: Die Tests laufen in Node.
 */
import { type Naechster, type Netz, type Ort, type V3, dreieckNormale, ortIn, ortLage } from './ort';

/** eine Richtung im Maß des Dreiecks ihres Orts: Gewichte zu seinen drei Ecken, Summe null */
export type Richtung = [number, number, number];

/** ein Punkt einer Farblinie: die Nummer seines Orts in `stuetzen`, seine zwei Richtungen (null: keine, eine Ecke), geknickt oder rund */
export type FarbPunkt = { i: number; ein: Richtung | null; aus: Richtung | null; knick: boolean };

/** die Richtung als Vektor (in den Einheiten der Lagen) */
export function richtungVektor(pos: ArrayLike<number>, o: Ort, g: Richtung): V3 {
  const a = 3 * o.e[0];
  const b = 3 * o.e[1];
  const c = 3 * o.e[2];
  return [g[0] * pos[a]! + g[1] * pos[b]! + g[2] * pos[c]!, g[0] * pos[a + 1]! + g[1] * pos[b + 1]! + g[2] * pos[c + 1]!, g[0] * pos[a + 2]! + g[1] * pos[b + 2]! + g[2] * pos[c + 2]!];
}

/** ein Vektor als Richtung im Maß des Dreiecks von `o`: sein Anteil in der Ebene des Dreiecks */
export function richtungAus(pos: ArrayLike<number>, o: Ort, v: V3): Richtung {
  const a = 3 * o.e[0];
  const b = 3 * o.e[1];
  const c = 3 * o.e[2];
  const ux = pos[b]! - pos[a]!;
  const uy = pos[b + 1]! - pos[a + 1]!;
  const uz = pos[b + 2]! - pos[a + 2]!;
  const wx = pos[c]! - pos[a]!;
  const wy = pos[c + 1]! - pos[a + 1]!;
  const wz = pos[c + 2]! - pos[a + 2]!;
  const uu = ux * ux + uy * uy + uz * uz;
  const uw = ux * wx + uy * wy + uz * wz;
  const ww = wx * wx + wy * wy + wz * wz;
  const det = uu * ww - uw * uw;
  if (!(det > 1e-30)) return [0, 0, 0];
  const vu = v[0] * ux + v[1] * uy + v[2] * uz;
  const vw = v[0] * wx + v[1] * wy + v[2] * wz;
  const al = (vu * ww - vw * uw) / det;
  const be = (vw * uu - vu * uw) / det;
  return [-al - be, al, be];
}

/** die Richtung eines Orts, dessen Ecken jetzt in anderer Reihenfolge stehen (`vorher`: die Ecken, zu denen `g` gehört) */
export function richtungUmordnen(g: Richtung, vorher: readonly number[], jetzt: readonly number[]): Richtung {
  const aus: Richtung = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const k = jetzt.indexOf(vorher[i]!);
    if (k >= 0) aus[k] = g[i]!;
  }
  return aus;
}

/**
 * Die Orte der Kurve von A nach B auf der Haut, ohne A und B selbst: die Bézier-Kurve aus den zwei Lagen und ihren Richtungen
 * (`gA` verlässt A, `gB` kommt in B an; Vektoren in den Einheiten der Lagen, null: keine), gleichmäßig im Parameter abgetastet
 * (höchstens `weit` auseinander), jede Probe an den nächsten Ort der Haut gelegt. Gesucht wird auf der Seite der Haut, die A und B
 * zeigen (zwischen ihren Normalen gemischt): An einem dünnen Teil springt die Kurve so nicht auf die Rückseite.
 */
export function stueckLegen(netz: Netz, naechster: Naechster, A: Ort, gA: V3 | null, B: Ort, gB: V3 | null, weit = 1.5): Ort[] {
  const p0 = ortLage(netz.pos, A);
  const p3 = ortLage(netz.pos, B);
  const p1: V3 = gA ? [p0[0] + gA[0], p0[1] + gA[1], p0[2] + gA[2]] : p0;
  const p2: V3 = gB ? [p3[0] + gB[0], p3[1] + gB[1], p3[2] + gB[2]] : p3;
  const ab = (a: V3, b: V3): number => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  // die Länge der Kurve liegt zwischen der Sehne und dem Zug der Kontrollpunkte
  const laenge = (ab(p0, p1) + ab(p1, p2) + ab(p2, p3) + ab(p0, p3)) / 2;
  const n = Math.max(1, Math.ceil(laenge / weit));
  const nA = dreieckNormale(netz.pos, netz.tri, A.t);
  const nB = dreieckNormale(netz.pos, netz.tri, B.t);
  const aus: Ort[] = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const u = 1 - t;
    const b0 = u * u * u;
    const b1 = 3 * u * u * t;
    const b2 = 3 * u * t * t;
    const b3 = t * t * t;
    const x = b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0];
    const y = b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1];
    const z = b0 * p0[2] + b1 * p1[2] + b2 * p2[2] + b3 * p3[2];
    const r = naechster(x, y, z, u * nA[0] + t * nB[0], u * nA[1] + t * nB[1], u * nA[2] + t * nB[2]);
    aus.push(ortIn(netz, r.t, r.wa, r.wb, r.wc));
  }
  return aus;
}

/** das Stück k einer Farblinie: von welchem Ort bis zu welchem (Nummern in `stuetzen`; geschlossen endet das letzte bei der Länge) */
export function stueckGrenzen(punkte: readonly FarbPunkt[], zu: boolean, laenge: number, k: number): [number, number] | null {
  const m = punkte.length;
  if (k < 0 || k >= (zu ? m : m - 1)) return null;
  return [punkte[k]!.i, k + 1 < m ? punkte[k + 1]!.i : laenge];
}

/** Zahl der Stücke einer Farblinie */
export const stueckZahl = (punkte: readonly FarbPunkt[], zu: boolean): number => (zu ? punkte.length : Math.max(0, punkte.length - 1));

/**
 * Punkte für eine Farblinie, die nur ihre Orte hat (aus Etappe 1 gesichert): an jeder Ecke (die Linie dreht dort um mehr als
 * `eckeGrad`) ein geknickter Punkt ohne Richtungen, dazwischen etwa alle `abstand` Einheiten ein runder, seine Richtungen längs
 * der Linie, ein Drittel des Wegs zum Nachbarn lang. Die Orte selbst bleiben, wie sie sind.
 */
export function punkteSchaetzen(netz: Netz, stuetzen: readonly Ort[], zu: boolean, abstand = 30, eckeGrad = 25): FarbPunkt[] {
  const n = stuetzen.length;
  if (n < 2) return n ? [{ i: 0, ein: null, aus: null, knick: true }] : [];
  const P = stuetzen.map((o) => ortLage(netz.pos, o));
  const d = (a: V3, b: V3): number => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  const cosEcke = Math.cos((eckeGrad * Math.PI) / 180);
  const ecke = (i: number): boolean => {
    if (!zu && (i === 0 || i === n - 1)) return true;
    const a = P[(i - 1 + n) % n]!;
    const b = P[i]!;
    const c = P[(i + 1) % n]!;
    const l1 = d(a, b);
    const l2 = d(b, c);
    if (l1 < 1e-9 || l2 < 1e-9) return false;
    return ((b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) + (b[2] - a[2]) * (c[2] - b[2])) / (l1 * l2) < cosEcke;
  };
  // zuerst die Ecken; geschlossen ohne Ecke beginnt die Linie bei ihrem ersten Ort
  const fest: number[] = [];
  for (let i = 0; i < n; i++) if (ecke(i)) fest.push(i);
  const rund = fest.length === 0;
  if (rund) fest.push(0);
  if (fest[0] !== 0) {
    // (die Punkte beginnen beim Ort 0: Er wird ein runder Punkt)
    fest.unshift(0);
  }
  // zwischen zwei festen Punkten runde in gleichen Abständen
  const nummern: { i: number; ecke: boolean }[] = [];
  for (let f = 0; f < fest.length; f++) {
    const von = fest[f]!;
    const bis = f + 1 < fest.length ? fest[f + 1]! : zu ? n : n - 1;
    nummern.push({ i: von, ecke: !(rund && f === 0) && ecke(von) });
    let lang = 0;
    for (let i = von; i < bis; i++) lang += d(P[i % n]!, P[(i + 1) % n]!);
    const teile = Math.max(1, Math.round(lang / abstand));
    let weg = 0;
    let naechst = 1;
    for (let i = von; i < bis - 1 && naechst < teile; i++) {
      weg += d(P[i % n]!, P[(i + 1) % n]!);
      if (weg >= (lang * naechst) / teile) {
        nummern.push({ i: i + 1, ecke: false });
        naechst++;
      }
    }
  }
  if (!zu && nummern[nummern.length - 1]!.i !== n - 1) nummern.push({ i: n - 1, ecke: true });
  const m = nummern.length;
  return nummern.map((q, k) => {
    if (q.ecke) return { i: q.i, ein: null, aus: null, knick: true };
    // rund: die Richtung längs der Linie (aus den Nachbarorten), ein Drittel des Wegs zum nächsten Punkt lang
    const a = P[(q.i - 1 + n) % n]!;
    const c = P[(q.i + 1) % n]!;
    const tl = Math.max(1e-9, d(a, c));
    const t: V3 = [(c[0] - a[0]) / tl, (c[1] - a[1]) / tl, (c[2] - a[2]) / tl];
    /** der Weg längs der Linie vom Ort `von` zum Ort `bis` (`bis` darf über das Ende hinaus zählen: einmal herum) */
    const weit = (von: number, bis: number): number => {
      let s = 0;
      for (let i = von; i < bis; i++) s += d(P[i % n]!, P[(i + 1) % n]!);
      return s;
    };
    const lVor = k > 0 ? weit(nummern[k - 1]!.i, q.i) : weit(nummern[m - 1]!.i, q.i + n);
    const lNach = k + 1 < m ? weit(q.i, nummern[k + 1]!.i) : weit(q.i, nummern[0]!.i + n);
    const o = stuetzen[q.i]!;
    const hatVor = zu || k > 0;
    const hatNach = zu || k + 1 < m;
    return {
      i: q.i,
      ein: hatVor ? richtungAus(netz.pos, o, [(-t[0] * lVor) / 3, (-t[1] * lVor) / 3, (-t[2] * lVor) / 3]) : null,
      aus: hatNach ? richtungAus(netz.pos, o, [(t[0] * lNach) / 3, (t[1] * lNach) / 3, (t[2] * lNach) / 3]) : null,
      knick: false,
    };
  });
}
