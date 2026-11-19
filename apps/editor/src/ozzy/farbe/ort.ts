/**
 * Ozzy, Paint-Modus, Etappe 1 (19.11.2026; Plan `docs/plans/2026-11-19-ozzy-paint-modus.md`): der Ort auf der Haut.
 *
 * Alles Gemalte hängt an der Haut selbst: Ein Ort ist ein Dreieck des Rechennetzes und eine Lage darin (drei Gewichte). Bewegt sich
 * die Haut, bewegt sich der Ort mit, ohne Rechnung. Wird neu vernetzt, bleibt ein Ort in seinem Dreieck, wenn es das im neuen Netz
 * noch gibt (die Punkte des Netzes sind das Material der Haut: `punkteZuordnen`); sonst geht er an die Stelle der neuen Haut, die
 * ihm am nächsten liegt (`orteUebergeben`). Am Rechenkern und am Werk ändert dieses Modul nichts: Es liest nur Lagen und Dreiecke.
 *
 * Dazu die Spur: der gerade Weg zwischen zwei nahen Orten über die Dreiecke hinweg (der Schnitt der Haut mit der Ebene durch beide
 * Orte und ihre mittlere Normale, wie `abzweigen` im Kern ihn für Linien der Form nimmt). Sie liefert je Dreieck ein gerades Stück
 * in dessen Gewichten: Jedes Stück einer Farblinie liegt damit in genau einem Dreieck, und die Anzeige rechnet je Dreieck für sich.
 *
 * Ohne DOM und ohne three: Die Tests laufen in Node.
 */

/** was ein Ort von der Haut braucht (die Haut des Werks erfüllt es) */
export type Netz = { pos: ArrayLike<number>; tri: ArrayLike<number>; n: number; spiegel?: ArrayLike<number> };

/**
 * Ein Ort auf der Haut: sein Dreieck (Nummer in `tri`), dessen drei Punkte in ihrer Reihenfolge und die Gewichte dazu. Die Punkte
 * stehen mit im Ort, weil die Nummer eines Dreiecks einen Netzwechsel nicht überlebt.
 */
export type Ort = { t: number; e: [number, number, number]; w: [number, number, number] };

/** so weit bleibt ein Ort im Inneren seines Dreiecks und eine Kreuzung im Inneren ihrer Kante (in Gewichten) */
export const RAND = 1e-4;

export type V3 = [number, number, number];

/** die Lage eines Orts (in den Einheiten der Lagen) */
export function ortLage(pos: ArrayLike<number>, o: Ort, aus: V3 = [0, 0, 0]): V3 {
  const [a, b, c] = o.e;
  const [wa, wb, wc] = o.w;
  aus[0] = wa * pos[3 * a]! + wb * pos[3 * b]! + wc * pos[3 * c]!;
  aus[1] = wa * pos[3 * a + 1]! + wb * pos[3 * b + 1]! + wc * pos[3 * c + 1]!;
  aus[2] = wa * pos[3 * a + 2]! + wb * pos[3 * b + 2]! + wc * pos[3 * c + 2]!;
  return aus;
}

/** ein Ort im Dreieck `t` mit diesen Gewichten, ein Stück vom Rand weg ins Innere gerückt (damit kein Stück auf einer Kante läuft) */
export function ortIn(netz: Netz, t: number, wa: number, wb: number, wc: number): Ort {
  let a = Math.max(RAND, wa);
  let b = Math.max(RAND, wb);
  let c = Math.max(RAND, wc);
  const s = a + b + c;
  a /= s;
  b /= s;
  c /= s;
  return { t, e: [netz.tri[3 * t]!, netz.tri[3 * t + 1]!, netz.tri[3 * t + 2]!], w: [a, b, c] };
}

/**
 * Was je Netz einmal gerechnet wird: zu jeder Kante eines Dreiecks das Dreieck gegenüber, und (für gespiegelte Formen) zu jedem
 * Dreieck sein Spiegelbild.
 */
export type Karte = {
  netz: Netz;
  /** Zahl der Dreiecke */
  T: number;
  /** je Dreieck und Kante e (von Ecke e zu Ecke e + 1): 3 · Nachbar + dessen Kante, oder −1 */
  nachbar: Int32Array;
  /** das Dreieck mit diesen drei Punkten (in beliebiger Reihenfolge) oder −1 */
  dreieck(a: number, b: number, c: number): number;
  /** je Dreieck sein Spiegelbild (−1: keins, etwa an einer freien Form); null, wenn die Form keine Spiegelpaare hat */
  spiegel: Int32Array | null;
};

export function karteVon(netz: Netz): Karte {
  const tri = netz.tri;
  const n = netz.n;
  const T = tri.length / 3;
  const nachbar = new Int32Array(3 * T).fill(-1);
  const erste = new Map<number, number>();
  const nr = (a: number, b: number): number => (a < b ? a * n + b : b * n + a);
  for (let t = 0; t < T; t++)
    for (let e = 0; e < 3; e++) {
      const k = nr(tri[3 * t + e]!, tri[3 * t + ((e + 1) % 3)]!);
      const g = erste.get(k);
      if (g === undefined) erste.set(k, 3 * t + e);
      else {
        nachbar[3 * t + e] = g;
        nachbar[g] = 3 * t + e;
      }
    }
  const dreieck = (a: number, b: number, c: number): number => {
    const g = erste.get(nr(a, b));
    if (g === undefined) return -1;
    for (const h of [g, nachbar[g]!]) {
      if (h < 0) continue;
      const t = Math.floor(h / 3);
      const x = tri[3 * t]!;
      const y = tri[3 * t + 1]!;
      const z = tri[3 * t + 2]!;
      if ((x === c || y === c || z === c) && (x === a || y === a || z === a) && (x === b || y === b || z === b)) return t;
    }
    return -1;
  };
  let spiegel: Int32Array | null = null;
  const sp = netz.spiegel;
  if (sp) {
    let paare = false;
    for (let v = 0; v < n && !paare; v++) if (sp[v]! >= 0) paare = true;
    if (paare) {
      spiegel = new Int32Array(T).fill(-1);
      for (let t = 0; t < T; t++) {
        const a = sp[tri[3 * t]!]!;
        const b = sp[tri[3 * t + 1]!]!;
        const c = sp[tri[3 * t + 2]!]!;
        if (a < 0 || b < 0 || c < 0) continue;
        // (ein Dreieck ganz in der Mittelebene gibt es nicht: Dort liegen nur Kanten)
        spiegel[t] = dreieck(a, b, c);
      }
    }
  }
  return { netz, T, nachbar, dreieck, spiegel };
}

/** der Ort eines Orts im Spiegelbild seines Dreiecks (dieselben Gewichte an den gespiegelten Punkten) oder null */
export function ortGespiegelt(k: Karte, o: Ort): Ort | null {
  const sp = k.netz.spiegel;
  if (!sp || !k.spiegel) return null;
  const t = k.spiegel[o.t]!;
  if (t < 0) return null;
  const tri = k.netz.tri;
  const e: [number, number, number] = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
  const w: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const v = sp[o.e[i]!]!;
    const j = e.indexOf(v);
    if (j < 0) return null;
    w[j] = w[j]! + o.w[i]!;
  }
  return { t, e, w };
}

/**
 * Ein gerades Stück einer Farblinie in einem Dreieck: von (b0, c0) nach (b1, c1), in den Gewichten der zweiten und dritten Ecke.
 * `ein`, `aus`: die Kante des Dreiecks (von Ecke e zu Ecke e + 1), auf der Anfang und Ende liegen, oder −1 (im Inneren).
 */
export type Stueck = { t: number; b0: number; c0: number; b1: number; c1: number; ein: number; aus: number };

const EPS = 1e-12;

/**
 * Die Spur von `A` nach `B`: die Stücke je Dreieck auf dem geraden Weg über die Haut (Schnitt mit der Ebene durch beide Orte, die
 * die mittlere Normale ihrer Dreiecke enthält). Liegen beide im selben Dreieck, ist es ein Stück. Die Orte sollen nah beieinander
 * liegen (eine Farblinie ist dicht abgetastet); findet der Weg `B` nicht in `schritte` Dreiecken, null.
 */
export function spur(k: Karte, A: Ort, B: Ort, schritte = 400): Stueck[] | null {
  if (A.t === B.t) return [{ t: A.t, b0: A.w[1], c0: A.w[2], b1: B.w[1], c1: B.w[2], ein: -1, aus: -1 }];
  const P = k.netz.pos;
  const tri = k.netz.tri;
  const pa = ortLage(P, A);
  const pb = ortLage(P, B);
  const d: V3 = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]];
  const dl = Math.hypot(d[0], d[1], d[2]);
  if (dl < EPS) return null;
  const na = dreieckNormale(P, tri, A.t);
  const nb = dreieckNormale(P, tri, B.t);
  let n: V3 = [na[0] + nb[0], na[1] + nb[1], na[2] + nb[2]];
  // (zwei Flächen, die sich genau entgegenstehen: die eine nehmen)
  if (Math.hypot(n[0], n[1], n[2]) < 1e-9) n = na;
  // die Ebene: enthält d und n; ihr Maß quer dazu
  let m: V3 = [d[1] * n[2] - d[2] * n[1], d[2] * n[0] - d[0] * n[2], d[0] * n[1] - d[1] * n[0]];
  const ml = Math.hypot(m[0], m[1], m[2]);
  if (ml < EPS) {
    // d längs der Normalen (zwei Orte übereinander): irgendeine Ebene durch d
    const h: V3 = Math.abs(d[0]) < 0.9 * dl ? [1, 0, 0] : [0, 1, 0];
    m = [d[1] * h[2] - d[2] * h[1], d[2] * h[0] - d[0] * h[2], d[0] * h[1] - d[1] * h[0]];
  }
  const mn = Math.hypot(m[0], m[1], m[2]);
  m = [m[0] / mn, m[1] / mn, m[2] / mn];
  const klein = 1e-9 * (1 + dl);
  /** Abstand eines Punkts von der Ebene; genau auf ihr zählt als knapp davor (für jeden Punkt gleich, also in jedem Dreieck gleich) */
  const seite = (v: number): number => {
    const s = (P[3 * v]! - pa[0]) * m[0] + (P[3 * v + 1]! - pa[1]) * m[1] + (P[3 * v + 2]! - pa[2]) * m[2];
    return Math.abs(s) < klein ? klein : s;
  };
  /** wie weit ein Punkt längs des Wegs liegt */
  const laengs = (x: number, y: number, z: number): number => ((x - pa[0]) * d[0] + (y - pa[1]) * d[1] + (z - pa[2]) * d[2]) / dl;
  const aus: Stueck[] = [];
  let t = A.t;
  let kommt = -1;
  let b0 = A.w[1];
  let c0 = A.w[2];
  for (let schritt = 0; schritt < schritte; schritt++) {
    if (t === B.t) {
      aus.push({ t, b0, c0, b1: B.w[1], c1: B.w[2], ein: kommt, aus: -1 });
      return aus;
    }
    // die Kante, durch die der Weg das Dreieck nach vorn verlässt
    let beste = -1;
    let besteLam = 0;
    let besteWeit = -Infinity;
    for (let e = 0; e < 3; e++) {
      if (e === kommt) continue;
      const i = tri[3 * t + e]!;
      const j = tri[3 * t + ((e + 1) % 3)]!;
      const si = seite(i);
      const sj = seite(j);
      if (si * sj > 0) continue;
      const lam = Math.min(1 - RAND, Math.max(RAND, si / (si - sj)));
      const x = P[3 * i]! + lam * (P[3 * j]! - P[3 * i]!);
      const y = P[3 * i + 1]! + lam * (P[3 * j + 1]! - P[3 * i + 1]!);
      const z = P[3 * i + 2]! + lam * (P[3 * j + 2]! - P[3 * i + 2]!);
      const w = laengs(x, y, z);
      // im ersten Dreieck schneidet die Ebene zwei Kanten: die in Richtung des Ziels; danach gibt es nur noch eine andere
      if (w > besteWeit) {
        besteWeit = w;
        beste = e;
        besteLam = lam;
      }
    }
    if (beste < 0 || (kommt < 0 && besteWeit <= 0)) return null;
    // die Kreuzung in den Gewichten dieses Dreiecks: auf der Kante von Ecke e nach e + 1
    const w: [number, number, number] = [0, 0, 0];
    w[beste] = 1 - besteLam;
    w[(beste + 1) % 3] = besteLam;
    aus.push({ t, b0, c0, b1: w[1], c1: w[2], ein: kommt, aus: beste });
    const g = k.nachbar[3 * t + beste]!;
    if (g < 0) return null;
    const u = Math.floor(g / 3);
    const f = g % 3;
    // dieselbe Stelle in den Gewichten des Nachbarn: Seine Kante f läuft andersherum
    const wu: [number, number, number] = [0, 0, 0];
    wu[f] = besteLam;
    wu[(f + 1) % 3] = 1 - besteLam;
    b0 = wu[1];
    c0 = wu[2];
    t = u;
    kommt = f;
  }
  return null;
}

export function dreieckNormale(P: ArrayLike<number>, tri: ArrayLike<number>, t: number): V3 {
  const a = 3 * tri[3 * t]!;
  const b = 3 * tri[3 * t + 1]!;
  const c = 3 * tri[3 * t + 2]!;
  const ux = P[b]! - P[a]!;
  const uy = P[b + 1]! - P[a + 1]!;
  const uz = P[b + 2]! - P[a + 2]!;
  const vx = P[c]! - P[a]!;
  const vy = P[c + 1]! - P[a + 1]!;
  const vz = P[c + 2]! - P[a + 2]!;
  const n: V3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const l = Math.hypot(n[0], n[1], n[2]);
  if (l > 0) {
    n[0] /= l;
    n[1] /= l;
    n[2] /= l;
  }
  return n;
}

/**
 * Der nächste Ort auf einem Netz zu einem Punkt: (x, y, z) → Dreieck und Gewichte; `d2`: Abstand im Quadrat. Mit einer Normalen
 * (nx, ny, nz) zählen nur Dreiecke, die auf dieselbe Seite zeigen (an einem dünnen Teil nicht die Rückseite); findet sich so
 * keines, gilt die Suche ohne sie.
 */
export type Naechster = (x: number, y: number, z: number, nx?: number, ny?: number, nz?: number) => { t: number; wa: number; wb: number; wc: number; d2: number };

/**
 * Netzwechsel, erster Teil: Welcher Punkt der neuen Haut ist ein Punkt der alten? Die Punkte des Netzes sind das Material der Haut.
 * Das Werk lässt beim Wechsel fast alle stehen und ordnet sie so: Die gebliebenen stehen vorn, in ihrer alten Reihenfolge
 * (`netzGewachsen` in `werk.ts`), neue dahinter. Die zwei Reihen werden deshalb nebeneinander abgeschritten:
 *
 * - Liegt der neue Punkt am Ort des alten (näher als ein Viertel seiner kürzesten Kante), ist es derselbe.
 * - Sonst fehlt vielleicht der alte (zusammengelegt): Dann passt der neue zu einem der nächsten alten, und der danach auch.
 *   Oder der neue ist dazugekommen (zurück auf ein älteres Netz): dasselbe von der anderen Seite.
 * - Weder noch: Der Punkt hat sich in diesem Bild weiter bewegt (ein schneller Zug). Er bleibt ohne Zuordnung, die Reihe läuft
 *   weiter. (Ihn nur nach der Reihenfolge zuzuordnen wäre geraten: Ein falscher Punkt gäbe einen Zacken in der Farblinie.)
 *
 * Die Reihenfolge sagt also nur, welcher neue Punkt in Frage kommt; ob er es ist, entscheidet der Ort. Zurück: je altem Punkt der
 * neue oder −1; null, wenn die zwei Netze nichts miteinander zu tun haben (weniger als ein Fünftel zugeordnet: eine geladene
 * Form, ein Schnitt zweier Objekte). Dann wird jeder Ort gesucht.
 */
export function punkteZuordnen(altPos: ArrayLike<number>, nAlt: number, neu: Netz): Int32Array | null {
  const Q = neu.pos;
  const I = neu.tri;
  const n = neu.n;
  if (!n || !nAlt) return null;
  // je neuem Punkt das Quadrat seiner kürzesten Kante
  const kurz = new Float64Array(n).fill(Infinity);
  for (let t = 0; t < I.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = I[t + e]!;
      const b = I[t + ((e + 1) % 3)]!;
      const l2 = (Q[3 * a]! - Q[3 * b]!) ** 2 + (Q[3 * a + 1]! - Q[3 * b + 1]!) ** 2 + (Q[3 * a + 2]! - Q[3 * b + 2]!) ** 2;
      if (l2 < kurz[a]!) kurz[a] = l2;
      if (l2 < kurz[b]!) kurz[b] = l2;
    }
  const nah = (a: number, i: number): boolean => {
    if (a >= nAlt || i >= n) return false;
    const d2 = (Q[3 * i]! - altPos[3 * a]!) ** 2 + (Q[3 * i + 1]! - altPos[3 * a + 1]!) ** 2 + (Q[3 * i + 2]! - altPos[3 * a + 2]!) ** 2;
    return d2 <= kurz[i]! / 16;
  };
  /** ein Sprung im Versatz gilt nur, wenn auch das Paar danach passt (oder es keins mehr gibt) */
  const zweiNah = (a: number, i: number): boolean => nah(a, i) && (a + 1 >= nAlt || i + 1 >= n || nah(a + 1, i + 1));
  const zu = new Int32Array(nAlt).fill(-1);
  const VORAUS = 32;
  let a = 0;
  let i = 0;
  let zahl = 0;
  while (a < nAlt && i < n) {
    if (nah(a, i)) {
      zu[a] = i;
      zahl++;
      a++;
      i++;
      continue;
    }
    let k = 1;
    while (k <= VORAUS && !zweiNah(a + k, i)) k++;
    if (k <= VORAUS) {
      a += k;
      continue;
    }
    k = 1;
    while (k <= VORAUS && !zweiNah(a, i + k)) k++;
    if (k <= VORAUS) {
      i += k;
      continue;
    }
    a++;
    i++;
  }
  return zahl >= 0.2 * Math.min(nAlt, n) ? zu : null;
}

/**
 * Netzwechsel, zweiter Teil: Jeder Ort geht an seine Stelle auf der neuen Haut. `altPos`: die Lagen der alten Haut im Moment des
 * Wechsels (ihre Punkte stehen im Ort); `zu`: je altem Punkt der neue (`punkteZuordnen`; ohne: alle werden gesucht).
 *
 * Gibt es das Dreieck eines Orts im neuen Netz noch (seine drei Punkte sind geblieben und bilden wieder ein Dreieck), bleibt er darin
 * mit denselben Gewichten: Die Bemalung sitzt am Material und rührt sich bei einem Netzwechsel nicht, auch wenn sich die Haut im
 * selben Bild bewegt hat. Sonst (das Dreieck wurde geteilt, gedreht oder zusammengelegt) geht er an die Stelle der neuen Haut, die
 * ihm am nächsten liegt, von der Lage aus, die seine gebliebenen Punkte jetzt haben.
 *
 * Zurück: wie viele Orte in ihrem Dreieck blieben (`gehalten`), wie viele gesucht wurden und wie weit der fernste von ihnen neben der
 * neuen Haut lag (`weit`).
 */
export function orteUebergeben(altPos: ArrayLike<number>, neu: Karte, naechster: Naechster, orte: Iterable<Ort>, zu: Int32Array | null = null): { weit: number; gehalten: number; gesucht: number } {
  const netz = neu.netz;
  const Q = netz.pos;
  const tri = netz.tri;
  let weit = 0;
  let gehalten = 0;
  let gesucht = 0;
  const j: [number, number, number] = [-1, -1, -1];
  for (const o of orte) {
    if (zu) {
      j[0] = zu[o.e[0]] ?? -1;
      j[1] = zu[o.e[1]] ?? -1;
      j[2] = zu[o.e[2]] ?? -1;
    } else j[0] = j[1] = j[2] = -1;
    if (j[0] >= 0 && j[1] >= 0 && j[2] >= 0) {
      const t = neu.dreieck(j[0], j[1], j[2]);
      if (t >= 0) {
        // dasselbe Dreieck, vielleicht mit anderer Reihenfolge der Ecken: Die Gewichte gehen mit ihren Punkten
        const e: [number, number, number] = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
        const w: [number, number, number] = [0, 0, 0];
        for (let i = 0; i < 3; i++) w[e.indexOf(j[i]!)] = o.w[i]!;
        o.t = t;
        o.e = e;
        o.w = w;
        gehalten++;
        continue;
      }
    }
    // die Lage aus den gebliebenen Punkten, wie sie jetzt liegen; ein verschwundener Punkt geht mit ihrer mittleren Verschiebung mit
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let m = 0;
    for (let i = 0; i < 3; i++) {
      if (j[i]! < 0) continue;
      sx += Q[3 * j[i]!]! - altPos[3 * o.e[i]!]!;
      sy += Q[3 * j[i]! + 1]! - altPos[3 * o.e[i]! + 1]!;
      sz += Q[3 * j[i]! + 2]! - altPos[3 * o.e[i]! + 2]!;
      m++;
    }
    if (m) {
      sx /= m;
      sy /= m;
      sz /= m;
    }
    let x = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < 3; i++) {
      const g = o.w[i]!;
      if (j[i]! >= 0) {
        x += g * Q[3 * j[i]!]!;
        y += g * Q[3 * j[i]! + 1]!;
        z += g * Q[3 * j[i]! + 2]!;
      } else {
        x += g * (altPos[3 * o.e[i]!]! + sx);
        y += g * (altPos[3 * o.e[i]! + 1]! + sy);
        z += g * (altPos[3 * o.e[i]! + 2]! + sz);
      }
    }
    const r = naechster(x, y, z);
    const g = ortIn(netz, r.t, r.wa, r.wb, r.wc);
    o.t = g.t;
    o.e = g.e;
    o.w = g.w;
    weit = Math.max(weit, r.d2);
    gesucht++;
  }
  return { weit: Math.sqrt(weit), gehalten, gesucht };
}

/** Gehört der Ort noch zu diesem Netz (seine drei Punkte bilden das Dreieck mit seiner Nummer)? */
export function ortGilt(netz: Netz, o: Ort): boolean {
  const tri = netz.tri;
  if (!(o.t >= 0) || 3 * o.t + 2 >= tri.length) return false;
  return tri[3 * o.t] === o.e[0] && tri[3 * o.t + 1] === o.e[1] && tri[3 * o.t + 2] === o.e[2];
}
