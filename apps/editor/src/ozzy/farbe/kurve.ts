/**
 * Ozzy, Paint-Modus, Etappe 2 (19.11.2026): Punkte und Richtungen einer Farblinie, und die Kurve zwischen zwei Punkten.
 *
 * Eine Farblinie ist weiter eine dichte Folge von Orten auf der Haut (`stuetzen`). Zum Anfassen hat sie Punkte: einzelne ihrer Orte,
 * jeder mit zwei Richtungen (wie ein Punkt einer Linie der Form: „ein“ zum Stück davor, „aus“ zum Stück danach) und der Angabe, ob
 * die zwei geknickt sind. Eine Richtung steht im Maß des Dreiecks ihres Orts: drei Zahlen zu seinen drei Ecken, Summe null. Der
 * Vektor ist die so gewichtete Summe der Ecken; er dreht und dehnt sich mit dem Dreieck, und beim Netzwechsel gehen die Zahlen wie
 * die Gewichte mit ihren Ecken.
 *
 * Die Kurve zwischen zwei Punkten wird nur gerechnet, wenn ein Punkt oder eine Richtung angefasst wird; danach gehen ihre Orte
 * mit der Haut mit wie alle anderen. Sind beide Punkte zu sehen, wird sie im Bild gelegt (`stueckImBild`: die Kurve, wie man sie
 * zieht, längs des Blicks auf die Haut). Sonst im Raum (`stueckLegen`; die Idee ist `aufHautLegen` in der Vorlage
 * `src/linien/raum.ts`): die Bézier-Kurve aus den zwei Lagen und ihren Richtungen, auf die Haut gelegt.
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
 * (`gA` verlässt A, `gB` kommt in B an; Vektoren in den Einheiten der Lagen, null: keine).
 *
 * Gelegt wird sie durch Halbieren: Die Kurve wird in der Mitte geteilt (de Casteljau), ihr Teilpunkt an den nächsten Ort der Haut
 * gelegt, seine zwei inneren Griffe gehen mit ihm und in die Ebene der Haut dort; dann jede Hälfte für sich, bis die Orte höchstens
 * `weit` auseinander liegen. So liegt jede Probe nah an der Haut, bevor sie auf sie gelegt wird. (Die ganze Kurve Probe für Probe
 * auf die Haut zu legen, wie die Vorlage es tut, gibt bei langen Stücken Zacken: Die Sehne läuft tief unter der Haut, und der
 * nächste Ort springt an jeder Kante des Netzes.) Die Orte stehen gleichmäßig im Parameter der Kurve (ihre Zahl ist 2^n − 1).
 * Gesucht wird auf der Seite der Haut, die die Enden zeigen: An einem dünnen Teil springt die Kurve nicht auf die Rückseite.
 */
export function stueckLegen(netz: Netz, naechster: Naechster, A: Ort, gA: V3 | null, B: Ort, gB: V3 | null, weit = 1.5): Ort[] {
  const p0 = ortLage(netz.pos, A);
  const p3 = ortLage(netz.pos, B);
  const p1: V3 = gA ? [p0[0] + gA[0], p0[1] + gA[1], p0[2] + gA[2]] : [p0[0], p0[1], p0[2]];
  const p2: V3 = gB ? [p3[0] + gB[0], p3[1] + gB[1], p3[2] + gB[2]] : [p3[0], p3[1], p3[2]];
  const ab = (a: V3, b: V3): number => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  // die Länge der Kurve liegt zwischen der Sehne und dem Zug der Kontrollpunkte
  const laenge = (ab(p0, p1) + ab(p1, p2) + ab(p2, p3) + ab(p0, p3)) / 2;
  const tiefe = Math.max(0, Math.min(12, Math.ceil(Math.log2(Math.max(1e-9, laenge / weit)))));
  const mitte = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const aus: Ort[] = [];
  const teilen = (a: V3, b: V3, c: V3, d: V3, na: V3, nd: V3, k: number): void => {
    if (k <= 0) return;
    const q0 = mitte(a, b);
    const q1 = mitte(b, c);
    const q2 = mitte(c, d);
    const r0 = mitte(q0, q1);
    const r1 = mitte(q1, q2);
    const m = mitte(r0, r1);
    const r = naechster(m[0], m[1], m[2], na[0] + nd[0], na[1] + nd[1], na[2] + nd[2]);
    const o = ortIn(netz, r.t, r.wa, r.wb, r.wc);
    const mp = ortLage(netz.pos, o);
    const nm = dreieckNormale(netz.pos, netz.tri, o.t);
    /** ein innerer Griff: mit dem Teilpunkt auf die Haut, sein Anteil aus der Haut heraus fällt weg */
    const inHaut = (g: V3): V3 => {
      const v: V3 = [g[0] - m[0], g[1] - m[1], g[2] - m[2]];
      const vn = v[0] * nm[0] + v[1] * nm[1] + v[2] * nm[2];
      return [mp[0] + v[0] - vn * nm[0], mp[1] + v[1] - vn * nm[1], mp[2] + v[2] - vn * nm[2]];
    };
    teilen(a, q0, inHaut(r0), mp, na, nm, k - 1);
    aus.push(o);
    teilen(mp, inHaut(r1), q2, d, nm, nd, k - 1);
  };
  teilen(p0, p1, p2, p3, dreieckNormale(netz.pos, netz.tri, A.t), dreieckNormale(netz.pos, netz.tri, B.t), tiefe);
  return aus;
}

/**
 * Die Orte der Kurve von A nach B, im Bild gelegt (ohne A und B selbst): die Bézier-Kurve aus vier Kontrollpunkten im Bild, jede
 * Probe längs des Blicks auf die Haut. So liegt die Farblinie dort, wo man sie zieht, auch an einer steilen Stelle der Form (dort
 * ist eine Richtung im Raum viel länger als ihr Bild; im Raum gelegt, verliefe sich die Kurve über die Haut).
 *
 * `unter`: der Ort der Haut unter einem Bildpunkt (null: daneben). `lage`: seine Lage (in den Einheiten von `weit`). Abgetastet
 * wird so dicht, dass zwei Orte höchstens `weit` auseinander liegen; wo das im Bild nicht geht (die Kurve läuft über den Rand der
 * Form oder springt von einem Teil auf einen anderen), führt `bruecke` über die Haut vom einen Ort zum anderen. Sie bekommt dazu
 * die Stelle im Bild und die Richtung, in der die Kurve dort läuft (Länge 1): Daraus folgt der Vorhang längs des Blicks.
 */
export function stueckImBild(
  k: readonly [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]],
  A: Ort,
  B: Ort,
  unter: (x: number, y: number) => Ort | null,
  lage: (o: Ort) => V3,
  bruecke: (von: Ort, nach: Ort, x: number, y: number, tx: number, ty: number) => Ort[],
  weit = 1.5,
): Ort[] {
  type Probe = { t: number; x: number; y: number; o: Ort | null; p: V3 | null };
  const probe = (t: number): Probe => {
    const u = 1 - t;
    const b0 = u * u * u;
    const b1 = 3 * u * u * t;
    const b2 = 3 * u * t * t;
    const b3 = t * t * t;
    const x = b0 * k[0][0] + b1 * k[1][0] + b2 * k[2][0] + b3 * k[3][0];
    const y = b0 * k[0][1] + b1 * k[1][1] + b2 * k[2][1] + b3 * k[3][1];
    const o = unter(x, y);
    return { t, x, y, o, p: o ? lage(o) : null };
  };
  const ab = (a: readonly [number, number], b: readonly [number, number]): number => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
  const lang = (ab(k[0], k[1]) + ab(k[1], k[2]) + ab(k[2], k[3]) + ab(k[0], k[3])) / 2;
  const n = Math.max(1, Math.min(64, Math.ceil(lang / 4)));
  let S: Probe[] = [{ t: 0, x: k[0][0], y: k[0][1], o: A, p: lage(A) }];
  for (let i = 1; i < n; i++) S.push(probe(i / n));
  S.push({ t: 1, x: k[3][0], y: k[3][1], o: B, p: lage(B) });
  const fern = (u: Probe, v: Probe, mal: number): boolean => !u.p || !v.p || (u.p[0] - v.p[0]) ** 2 + (u.p[1] - v.p[1]) ** 2 + (u.p[2] - v.p[2]) ** 2 > (mal * weit) ** 2;
  // dichter, wo zwei Nachbarn im Raum zu weit auseinander liegen (bis sie im Bild fast am selben Punkt stehen)
  for (let runde = 0; runde < 12; runde++) {
    const neu: Probe[] = [S[0]!];
    let etwas = false;
    for (let i = 1; i < S.length; i++) {
      const u = S[i - 1]!;
      const v = S[i]!;
      if (fern(u, v, 1) && (v.x - u.x) ** 2 + (v.y - u.y) ** 2 > 0.1 && neu.length + S.length - i < 4000) {
        neu.push(probe((u.t + v.t) / 2));
        etwas = true;
      }
      neu.push(v);
    }
    S = neu;
    if (!etwas) break;
  }
  const gut = S.filter((q) => q.o);
  const aus: Ort[] = [];
  for (let i = 1; i < gut.length; i++) {
    const u = gut[i - 1]!;
    const v = gut[i]!;
    if (fern(u, v, 2)) {
      // die Richtung der Kurve im Bild an dieser Stelle: von der einen Probe zur anderen; stehen sie fast am selben Punkt, ihre Ableitung
      let tx = v.x - u.x;
      let ty = v.y - u.y;
      if (tx * tx + ty * ty < 1) {
        const t = (u.t + v.t) / 2;
        const w = 1 - t;
        tx = 3 * w * w * (k[1][0] - k[0][0]) + 6 * w * t * (k[2][0] - k[1][0]) + 3 * t * t * (k[3][0] - k[2][0]);
        ty = 3 * w * w * (k[1][1] - k[0][1]) + 6 * w * t * (k[2][1] - k[1][1]) + 3 * t * t * (k[3][1] - k[2][1]);
        if (tx * tx + ty * ty < 1e-12) {
          tx = k[3][0] - k[0][0];
          ty = k[3][1] - k[0][1];
        }
      }
      const tl = Math.sqrt(tx * tx + ty * ty);
      for (const o of bruecke(u.o!, v.o!, (u.x + v.x) / 2, (u.y + v.y) / 2, tl > 1e-9 ? tx / tl : 1, tl > 1e-9 ? ty / tl : 0)) aus.push(o);
    }
    if (i < gut.length - 1) aus.push(v.o!);
  }
  return aus;
}

/**
 * Aus einer Spur (`spur` in `ort.ts`: Stücke je Dreieck) die Orte dazwischen: je Stück seine Mitte, bei langen Stücken mehrere, höchstens
 * `weit` auseinander. Die Enden der Spur selbst kommen nicht vor.
 */
export function orteAusSpur(netz: Netz, st: readonly { t: number; b0: number; c0: number; b1: number; c1: number }[], weit = 1.5): Ort[] {
  const aus: Ort[] = [];
  for (const s of st) {
    const e: [number, number, number] = [netz.tri[3 * s.t]!, netz.tri[3 * s.t + 1]!, netz.tri[3 * s.t + 2]!];
    const p = ortLage(netz.pos, { t: s.t, e, w: [1 - s.b0 - s.c0, s.b0, s.c0] });
    const q = ortLage(netz.pos, { t: s.t, e, w: [1 - s.b1 - s.c1, s.b1, s.c1] });
    const l = Math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);
    const n = Math.max(1, Math.ceil(l / weit));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const b = s.b0 + u * (s.b1 - s.b0);
      const c = s.c0 + u * (s.c1 - s.c0);
      aus.push(ortIn(netz, s.t, 1 - b - c, b, c));
    }
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
