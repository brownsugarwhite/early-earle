/**
 * Haut aus dem Umriss (Probe „Anfang einer Form“, 15.11.2026).
 *
 * Aus dem gezeichneten Loop wird ein flaches Dreiecksnetz (Rand, Reihen am Rand, Gitter innen, Delaunay), darauf die Wölbung wie
 * bei Monster Mash: h löst −Δh = 4 mit h = 0 am Rand, die Höhe ist √h (ein Kreis wird zur Kugel, ein Schlauch rund). Der Körper hat
 * zwei Seiten (vorn +z, hinten −z, spiegelgleich), die sich am Umriss treffen; jede Seite hat ihre eigenen Randpunkte, damit die
 * Haut am Anfang eine einzige Fläche sein kann, die sich erst beim Aufblasen in zwei teilt.
 *
 * Warum Reihen am Rand: √h steht am Rand senkrecht. Ein gleichmäßiges Gitter hätte dort im Raum riesige Dreiecke, und der Umriss
 * wäre von schräg eckig. Die Reihen liegen so, dass ihr Abstand im Raum (längs des Bogens) etwa gleich bleibt.
 *
 * Einheiten: Welt = CSS-Pixel des Blatts, y nach oben, Mitte des Fensters im Ursprung.
 */

export interface Umriss {
  /** dicht abgetasteter Loop (Welt), geschlossen (letzter Punkt ≠ erster) */
  x: number[];
  y: number[];
  /** Index der Anker in x/y (in Umlaufrichtung) */
  anker: number[];
}

export interface FlachNetz {
  n: number;
  /** die ersten nb Punkte sind der Rand, in Umlaufrichtung gegen den Uhrzeiger */
  nb: number;
  x: Float64Array;
  y: Float64Array;
  /** Wölbung √h (0 am Rand) und ihr Größtwert */
  q: Float64Array;
  qMax: number;
  /** Dreiecke, gegen den Uhrzeiger (Normale +z) */
  tri: Uint32Array;
  /** Randpunkt je Anker (in der Reihenfolge der Anker des Umrisses) */
  anker: number[];
  /** Schwerpunkt, Fläche, halbe Diagonale des Rahmens */
  cx: number;
  cy: number;
  flaeche: number;
  radius: number;
  /** Fläche je Punkt im flachen Netz (ein Drittel der Nachbardreiecke) */
  punktFlaeche: Float64Array;
  /** fehlende Randkanten nach Delaunay (sollte 0 sein), Zeit in ms, Schritte des Lösers */
  stat: { fehlendeRandkanten: number; ms: number; schritte: number; punkte: number; dreiecke: number };
}

// ---------- kleine Geometrie ----------

function orient(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function polygonFlaeche(x: ArrayLike<number>, y: ArrayLike<number>, n: number): number {
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) a += x[j]! * y[i]! - x[i]! * y[j]!;
  return a / 2;
}

function innen(px: number, py: number, x: ArrayLike<number>, y: ArrayLike<number>, n: number): boolean {
  let c = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = y[i]!;
    const yj = y[j]!;
    if (yi > py !== yj > py && px < ((x[j]! - x[i]!) * (py - yi)) / (yj - yi) + x[i]!) c = !c;
  }
  return c;
}

/** Abstand zum Rand (Strecken i → i+1) und nächster Randpunkt (Index der Strecke) */
function randAbstand(px: number, py: number, x: ArrayLike<number>, y: ArrayLike<number>, n: number): { d: number; i: number } {
  let best = Infinity;
  let bi = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = x[i]!;
    const ay = y[i]!;
    const ex = x[j]! - ax;
    const ey = y[j]! - ay;
    const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - ax - ex * t;
    const dy = py - ay - ey * t;
    const d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      bi = t < 0.5 ? i : j;
    }
  }
  return { d: Math.sqrt(best), i: bi };
}

// ---------- Delaunay (Bowyer–Watson, Gehen zum Dreieck, Höhle per Breitensuche) ----------

export function delaunay(px: ArrayLike<number>, py: ArrayLike<number>, n: number): Uint32Array {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    x0 = Math.min(x0, px[i]!);
    x1 = Math.max(x1, px[i]!);
    y0 = Math.min(y0, py[i]!);
    y1 = Math.max(y1, py[i]!);
  }
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const s = Math.max(x1 - x0, y1 - y0) || 1;
  // auf Einheitsgröße (gut für die Kreistests), dazu drei Punkte eines großen Dreiecks
  const X = new Float64Array(n + 3);
  const Y = new Float64Array(n + 3);
  for (let i = 0; i < n; i++) {
    X[i] = (px[i]! - mx) / s;
    Y[i] = (py[i]! - my) / s;
  }
  X[n] = -30;
  Y[n] = -30;
  X[n + 1] = 30;
  Y[n + 1] = -30;
  X[n + 2] = 0;
  Y[n + 2] = 30;
  const kap = 2 * n + 64;
  const V = new Int32Array(kap * 3);
  const N = new Int32Array(kap * 3).fill(-1);
  const lebt = new Uint8Array(kap);
  const marke = new Int32Array(kap);
  const frei: number[] = [];
  let anzahl = 0;
  const neu = (a: number, b: number, c: number): number => {
    const t = frei.length ? frei.pop()! : anzahl++;
    V[t * 3] = a;
    V[t * 3 + 1] = b;
    V[t * 3 + 2] = c;
    N[t * 3] = N[t * 3 + 1] = N[t * 3 + 2] = -1;
    lebt[t] = 1;
    marke[t] = 0;
    return t;
  };
  neu(n, n + 1, n + 2);
  const imKreis = (t: number, qx: number, qy: number): boolean => {
    const a = V[t * 3]!;
    const b = V[t * 3 + 1]!;
    const c = V[t * 3 + 2]!;
    const adx = X[a]! - qx;
    const ady = Y[a]! - qy;
    const bdx = X[b]! - qx;
    const bdy = Y[b]! - qy;
    const cdx = X[c]! - qx;
    const cdy = Y[c]! - qy;
    const det =
      (adx * adx + ady * ady) * (bdx * cdy - cdx * bdy) - (bdx * bdx + bdy * bdy) * (adx * cdy - cdx * ady) + (cdx * cdx + cdy * cdy) * (adx * bdy - bdx * ady);
    return det > 0;
  };
  // Reihenfolge: Schlangenlinie über ein grobes Raster (kurze Wege beim Suchen)
  const reihen = Math.max(1, Math.round(Math.sqrt(n / 4)));
  const ord = Array.from({ length: n }, (_, i) => i);
  const zeile = (i: number): number => Math.min(reihen - 1, Math.floor((Y[i]! + 0.5) * reihen));
  ord.sort((a, b) => {
    const za = zeile(a);
    const zb = zeile(b);
    if (za !== zb) return za - zb;
    return za % 2 === 0 ? X[a]! - X[b]! : X[b]! - X[a]!;
  });
  let letzte = 0;
  let stempel = 0;
  const hoehle: number[] = [];
  const randA: number[] = [];
  const randB: number[] = [];
  const randAussen: number[] = [];
  const startBei = new Int32Array(n + 3).fill(-1);
  const endeBei = new Int32Array(n + 3).fill(-1);
  for (const p of ord) {
    const qx = X[p]!;
    const qy = Y[p]!;
    // gehen
    let t = letzte;
    let schritte = 0;
    let gefunden = false;
    while (schritte++ < 4 * n + 100) {
      const a = V[t * 3]!;
      const b = V[t * 3 + 1]!;
      const c = V[t * 3 + 2]!;
      const o = schritte % 3;
      let weiter = -1;
      for (let k = 0; k < 3; k++) {
        const i = (k + o) % 3;
        const u = i === 0 ? b : i === 1 ? c : a;
        const v = i === 0 ? c : i === 1 ? a : b;
        if (orient(X[u]!, Y[u]!, X[v]!, Y[v]!, qx, qy) < 0) {
          weiter = N[t * 3 + i]!;
          break;
        }
      }
      if (weiter < 0) {
        gefunden = true;
        break;
      }
      t = weiter;
    }
    if (!gefunden) {
      // Notweg: alle Dreiecke prüfen
      for (let k = 0; k < anzahl; k++) {
        if (!lebt[k]) continue;
        const a = V[k * 3]!;
        const b = V[k * 3 + 1]!;
        const c = V[k * 3 + 2]!;
        if (orient(X[b]!, Y[b]!, X[c]!, Y[c]!, qx, qy) >= 0 && orient(X[c]!, Y[c]!, X[a]!, Y[a]!, qx, qy) >= 0 && orient(X[a]!, Y[a]!, X[b]!, Y[b]!, qx, qy) >= 0) {
          t = k;
          break;
        }
      }
    }
    // Höhle
    stempel++;
    hoehle.length = 0;
    hoehle.push(t);
    marke[t] = stempel;
    for (let h = 0; h < hoehle.length; h++) {
      const u = hoehle[h]!;
      for (let i = 0; i < 3; i++) {
        const nb = N[u * 3 + i]!;
        if (nb >= 0 && marke[nb] !== stempel && imKreis(nb, qx, qy)) {
          marke[nb] = stempel;
          hoehle.push(nb);
        }
      }
    }
    randA.length = 0;
    randB.length = 0;
    randAussen.length = 0;
    for (const u of hoehle)
      for (let i = 0; i < 3; i++) {
        const nb = N[u * 3 + i]!;
        if (nb < 0 || marke[nb] !== stempel) {
          randA.push(V[u * 3 + ((i + 1) % 3)]!);
          randB.push(V[u * 3 + ((i + 2) % 3)]!);
          randAussen.push(nb);
        }
      }
    for (const u of hoehle) {
      lebt[u] = 0;
      marke[u] = -1;
      frei.push(u);
    }
    const neue: number[] = [];
    for (let k = 0; k < randA.length; k++) {
      const a = randA[k]!;
      const b = randB[k]!;
      const aussen = randAussen[k]!;
      const tn = neu(a, b, p);
      N[tn * 3 + 2] = aussen;
      if (aussen >= 0)
        for (let j = 0; j < 3; j++)
          if (V[aussen * 3 + ((j + 1) % 3)] === b && V[aussen * 3 + ((j + 2) % 3)] === a) {
            N[aussen * 3 + j] = tn;
            break;
          }
      startBei[a] = tn;
      endeBei[b] = tn;
      neue.push(tn);
    }
    for (const tn of neue) {
      const a = V[tn * 3]!;
      const b = V[tn * 3 + 1]!;
      N[tn * 3] = startBei[b]!;
      N[tn * 3 + 1] = endeBei[a]!;
    }
    letzte = neue[0] ?? letzte;
  }
  const aus: number[] = [];
  for (let t = 0; t < anzahl; t++) {
    if (!lebt[t]) continue;
    const a = V[t * 3]!;
    const b = V[t * 3 + 1]!;
    const c = V[t * 3 + 2]!;
    if (a >= n || b >= n || c >= n) continue;
    aus.push(a, b, c);
  }
  return Uint32Array.from(aus);
}

// ---------- Rand abtasten ----------

/** Loop gleichmäßig mit Abstand etwa `h` abtasten; Anker bleiben Randpunkte */
function randAbtasten(u: Umriss, h: number): { x: number[]; y: number[]; anker: number[] } {
  const n = u.x.length;
  const x: number[] = [];
  const y: number[] = [];
  const anker: number[] = [];
  const A = u.anker.length >= 1 ? u.anker : [0];
  for (let k = 0; k < A.length; k++) {
    const i0 = A[k]!;
    const i1 = A[(k + 1) % A.length]!;
    // Stück von i0 bis i1 (im Kreis)
    const st: number[] = [];
    let i = i0;
    st.push(i);
    do {
      i = (i + 1) % n;
      st.push(i);
    } while (i !== i1 && st.length <= n + 1);
    if (A.length === 1) st.pop();
    const lang: number[] = [0];
    for (let j = 1; j < st.length; j++) lang.push(lang[j - 1]! + Math.hypot(u.x[st[j]!]! - u.x[st[j - 1]!]!, u.y[st[j]!]! - u.y[st[j - 1]!]!));
    const L = lang[lang.length - 1]!;
    const m = Math.max(1, Math.round(L / h));
    anker.push(x.length);
    x.push(u.x[i0]!);
    y.push(u.y[i0]!);
    let j = 0;
    for (let s = 1; s < m; s++) {
      const z = (s / m) * L;
      while (j < lang.length - 2 && lang[j + 1]! < z) j++;
      const f = (z - lang[j]!) / Math.max(1e-9, lang[j + 1]! - lang[j]!);
      x.push(u.x[st[j]!]! + (u.x[st[j + 1]!]! - u.x[st[j]!]!) * f);
      y.push(u.y[st[j]!]! + (u.y[st[j + 1]!]! - u.y[st[j]!]!) * f);
    }
  }
  return { x, y, anker };
}

// ---------- das flache Netz ----------

export function netzAusUmriss(u: Umriss, opts: { punkte?: number } = {}): FlachNetz {
  const t0 = performance.now();
  // Umlaufsinn gegen den Uhrzeiger (Welt, y oben)
  let ux = u.x.slice();
  let uy = u.y.slice();
  let ua = u.anker.slice();
  if (polygonFlaeche(ux, uy, ux.length) < 0) {
    const n = ux.length;
    ux = ux.map((_, i) => u.x[(n - i) % n]!);
    uy = uy.map((_, i) => u.y[(n - i) % n]!);
    ua = ua.map((a) => (n - a) % n);
    // Anker in neuer Reihenfolge, aber ihre Zuordnung behalten wir über `ankerOrdnung`
  }
  const ankerOrdnung = ua.map((a, k) => ({ a, k })).sort((p, q) => p.a - q.a);
  const sortiert: Umriss = { x: ux, y: uy, anker: ankerOrdnung.map((o) => o.a) };
  const flaecheRoh = Math.abs(polygonFlaeche(ux, uy, ux.length));
  let laenge = 0;
  for (let i = 0; i < ux.length; i++) laenge += Math.hypot(ux[(i + 1) % ux.length]! - ux[i]!, uy[(i + 1) % ux.length]! - uy[i]!);
  // Abstände: Rand etwa 1/300 des Umfangs, höchstens so, dass innen etwa `punkte` Gitterpunkte liegen
  const ziel = opts.punkte ?? 2600;
  const hGitter = Math.sqrt((2 * flaecheRoh) / (Math.sqrt(3) * ziel));
  const hb = Math.max(2.5, Math.min(9, Math.min(laenge / 300, hGitter * 0.9)));
  const hi = Math.max(hb * 1.1, hGitter);
  const R = randAbtasten(sortiert, hb);
  const nb = R.x.length;
  const px: number[] = R.x.slice();
  const py: number[] = R.y.slice();
  // Normalen nach innen (links der Laufrichtung), Krümmung
  const nx = new Float64Array(nb);
  const ny = new Float64Array(nb);
  const kr = new Float64Array(nb);
  for (let i = 0; i < nb; i++) {
    const a = (i - 1 + nb) % nb;
    const b = (i + 1) % nb;
    const e1x = R.x[i]! - R.x[a]!;
    const e1y = R.y[i]! - R.y[a]!;
    const e2x = R.x[b]! - R.x[i]!;
    const e2y = R.y[b]! - R.y[i]!;
    const l1 = Math.hypot(e1x, e1y) || 1;
    const l2 = Math.hypot(e2x, e2y) || 1;
    let mxn = -e1y / l1 - e2y / l2;
    let myn = e1x / l1 + e2x / l2;
    const l = Math.hypot(mxn, myn);
    if (l < 1e-6) {
      mxn = -e1y / l1;
      myn = e1x / l1;
    } else {
      mxn /= l;
      myn /= l;
    }
    nx[i] = mxn;
    ny[i] = myn;
    const quer = (e1x / l1) * (e2y / l2) - (e1y / l1) * (e2x / l2);
    const laengs = (e1x / l1) * (e2x / l2) + (e1y / l1) * (e2y / l2);
    kr[i] = Math.atan2(quer, laengs) / ((l1 + l2) / 2);
  }
  // Krümmung glätten (positiv = nach außen gewölbt)
  const krG = new Float64Array(nb);
  for (let i = 0; i < nb; i++) {
    let s = 0;
    let w = 0;
    for (let k = -3; k <= 3; k++) {
      const g = 1 - Math.abs(k) / 4;
      s += kr[(i + k + nb) % nb]! * g;
      w += g;
    }
    krG[i] = s / w;
  }
  // halbe Breite je Randpunkt: Strahl nach innen bis zum Rand gegenüber
  const halb = new Float64Array(nb);
  for (let i = 0; i < nb; i++) {
    const ox = R.x[i]! + nx[i]! * 1e-3;
    const oy = R.y[i]! + ny[i]! * 1e-3;
    let tMin = Infinity;
    for (let j = 0; j < nb; j++) {
      const k = (j + 1) % nb;
      if (j === i || k === i || j === (i - 1 + nb) % nb) continue;
      const ax = R.x[j]!;
      const ay = R.y[j]!;
      const ex = R.x[k]! - ax;
      const ey = R.y[k]! - ay;
      const den = nx[i]! * ey - ny[i]! * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((ax - ox) * ey - (ay - oy) * ex) / den;
      const s = ((ax - ox) * ny[i]! - (ay - oy) * nx[i]!) / den;
      if (t > 0 && s >= 0 && s <= 1 && t < tMin) tMin = t;
    }
    halb[i] = Number.isFinite(tMin) ? tMin / 2 : hb;
  }
  // glätten (Mittel mit Nachbarn, das Kleinere zählt mehr)
  for (let pass = 0; pass < 6; pass++) {
    const alt = halb.slice();
    for (let i = 0; i < nb; i++) {
      const a = alt[(i - 1 + nb) % nb]!;
      const b = alt[(i + 1) % nb]!;
      halb[i] = Math.min(alt[i]!, 0.25 * a + 0.5 * alt[i]! + 0.25 * b);
    }
  }
  // Reihen am Rand: Abstand d_k = a (1 − cos kΔθ), Δθ so, dass der Bogen im Raum etwa 1,4 hb misst; bis 62°
  const tiefe = new Float64Array(nb);
  const ZIEL_WINKEL = (62 * Math.PI) / 180;
  for (let i = 0; i < nb; i++) {
    const a = Math.max(halb[i]!, hb);
    let D = a * (1 - Math.cos(ZIEL_WINKEL));
    D = Math.min(D, 0.85 * a);
    if (krG[i]! > 1e-9) D = Math.min(D, 0.6 / krG[i]!);
    tiefe[i] = Math.max(0, D);
    const dTh = Math.min(0.5, (1.4 * hb) / a);
    for (let k = 1; k < 200; k++) {
      const d = a * (1 - Math.cos(k * dTh));
      if (d > D) break;
      const qx = R.x[i]! + nx[i]! * d;
      const qy = R.y[i]! + ny[i]! * d;
      const echt = randAbstand(qx, qy, R.x, R.y, nb).d;
      if (echt < 0.8 * d) break;
      px.push(qx);
      py.push(qy);
    }
  }
  // Gitter innen (gleichseitig), nur jenseits der Reihen
  let bx0 = Infinity;
  let by0 = Infinity;
  let bx1 = -Infinity;
  let by1 = -Infinity;
  for (let i = 0; i < nb; i++) {
    bx0 = Math.min(bx0, R.x[i]!);
    bx1 = Math.max(bx1, R.x[i]!);
    by0 = Math.min(by0, R.y[i]!);
    by1 = Math.max(by1, R.y[i]!);
  }
  const dy = (hi * Math.sqrt(3)) / 2;
  let reihe = 0;
  for (let gy = by0 + dy / 2; gy < by1; gy += dy, reihe++) {
    for (let gx = bx0 + (reihe % 2 ? hi / 2 : 0); gx < bx1; gx += hi) {
      if (!innen(gx, gy, R.x, R.y, nb)) continue;
      const ra = randAbstand(gx, gy, R.x, R.y, nb);
      if (ra.d < tiefe[ra.i]! + 0.55 * hi || ra.d < 0.6 * hi) continue;
      px.push(gx);
      py.push(gy);
    }
  }
  const n = px.length;
  // Delaunay, dann nur die Dreiecke innen
  const alle = delaunay(px, py, n);
  const tri: number[] = [];
  for (let t = 0; t < alle.length; t += 3) {
    const a = alle[t]!;
    const b = alle[t + 1]!;
    const c = alle[t + 2]!;
    const sx = (px[a]! + px[b]! + px[c]!) / 3;
    const sy = (py[a]! + py[b]! + py[c]!) / 3;
    // Dreiecke aus lauter Randpunkten: Mitte prüfen; sonst genügt die Mitte ebenso
    if (!innen(sx, sy, R.x, R.y, nb)) continue;
    if (Math.abs(orient(px[a]!, py[a]!, px[b]!, py[b]!, px[c]!, py[c]!)) < 1e-12) continue;
    tri.push(a, b, c);
  }
  // fehlende Randkanten zählen
  const kanten = new Set<number>();
  for (let t = 0; t < tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = tri[t + k]!;
      const b = tri[t + ((k + 1) % 3)]!;
      kanten.add(a * 1000003 + b);
    }
  let fehlend = 0;
  for (let i = 0; i < nb; i++) if (!kanten.has(i * 1000003 + ((i + 1) % nb))) fehlend++;
  const X = Float64Array.from(px);
  const Y = Float64Array.from(py);
  const T = Uint32Array.from(tri);
  // Poisson: −Δh = 4, h = 0 am Rand (Kotangens-Gewichte, PCG mit Diagonale)
  const { h, schritte, flaecheJe } = poisson(X, Y, T, n, nb);
  const q = new Float64Array(n);
  let qMax = 0;
  for (let i = 0; i < n; i++) {
    q[i] = i < nb ? 0 : Math.sqrt(Math.max(0, h[i]!));
    qMax = Math.max(qMax, q[i]!);
  }
  let cx = 0;
  let cy = 0;
  let A = 0;
  for (let t = 0; t < T.length; t += 3) {
    const a = T[t]!;
    const b = T[t + 1]!;
    const c = T[t + 2]!;
    const f = orient(X[a]!, Y[a]!, X[b]!, Y[b]!, X[c]!, Y[c]!) / 2;
    cx += ((X[a]! + X[b]! + X[c]!) / 3) * f;
    cy += ((Y[a]! + Y[b]! + Y[c]!) / 3) * f;
    A += f;
  }
  cx /= A || 1;
  cy /= A || 1;
  // Anker zurück in die Reihenfolge des Umrisses
  const anker = new Array<number>(ua.length);
  ankerOrdnung.forEach((o, s) => {
    anker[o.k] = R.anker[s]!;
  });
  return {
    n,
    nb,
    x: X,
    y: Y,
    q,
    qMax,
    tri: T,
    anker,
    cx,
    cy,
    flaeche: A,
    radius: Math.hypot(bx1 - bx0, by1 - by0) / 2,
    punktFlaeche: flaecheJe,
    stat: { fehlendeRandkanten: fehlend, ms: performance.now() - t0, schritte, punkte: n, dreiecke: T.length / 3 },
  };
}

/** Kotangens-Laplace des flachen Netzes (dünn besetzt) und Fläche je Punkt */
interface Laplace {
  zahl: Int32Array;
  nach: Int32Array;
  w: Float64Array;
  diag: Float64Array;
  flaecheJe: Float64Array;
}

function laplaceBauen(X: ArrayLike<number>, Y: ArrayLike<number>, T: Uint32Array, n: number): Laplace {
  const gew = new Map<number, number>();
  const flaecheJe = new Float64Array(n);
  const add = (i: number, j: number, w: number): void => {
    const k = i < j ? i * n + j : j * n + i;
    gew.set(k, (gew.get(k) ?? 0) + w);
  };
  for (let t = 0; t < T.length; t += 3) {
    const v = [T[t]!, T[t + 1]!, T[t + 2]!];
    const f = Math.abs(orient(X[v[0]!]!, Y[v[0]!]!, X[v[1]!]!, Y[v[1]!]!, X[v[2]!]!, Y[v[2]!]!)) / 2;
    for (let k = 0; k < 3; k++) {
      flaecheJe[v[k]!]! += f / 3;
      const i = v[(k + 1) % 3]!;
      const j = v[(k + 2) % 3]!;
      const o = v[k]!;
      const ux = X[i]! - X[o]!;
      const uy = Y[i]! - Y[o]!;
      const wx = X[j]! - X[o]!;
      const wy = Y[j]! - Y[o]!;
      const kreuz = Math.abs(ux * wy - uy * wx);
      const cot = kreuz > 1e-14 ? (ux * wx + uy * wy) / kreuz : 0;
      add(i, j, 0.5 * cot);
    }
  }
  const zahl = new Int32Array(n + 1);
  for (const k of gew.keys()) {
    const i = Math.floor(k / n);
    const j = k - i * n;
    zahl[i + 1]!++;
    zahl[j + 1]!++;
  }
  for (let i = 0; i < n; i++) zahl[i + 1]! += zahl[i]!;
  const nach = new Int32Array(zahl[n]!);
  const w = new Float64Array(zahl[n]!);
  const fuell = zahl.slice(0, n);
  for (const [k, g] of gew) {
    const i = Math.floor(k / n);
    const j = k - i * n;
    nach[fuell[i]!] = j;
    w[fuell[i]!++] = g;
    nach[fuell[j]!] = i;
    w[fuell[j]!++] = g;
  }
  const diag = new Float64Array(n);
  for (let i = 0; i < n; i++) for (let e = zahl[i]!; e < zahl[i + 1]!; e++) diag[i]! += w[e]!;
  return { zahl, nach, w, diag, flaecheJe };
}

/**
 * Löst Σ w_ij (x_i − x_j) = rechts_i für die inneren Punkte (i ≥ nb), am Rand x = rand (PCG mit Diagonale). Ergebnis: x für alle
 * Punkte und die Zahl der Schritte.
 */
function dirichletLoesen(L: Laplace, n: number, nb: number, rechts: Float64Array, rand: Float64Array | null): { x: Float64Array; schritte: number } {
  const { zahl, nach, w, diag } = L;
  const x = new Float64Array(n);
  const b = new Float64Array(n);
  for (let i = 0; i < nb; i++) x[i] = rand ? rand[i]! : 0;
  for (let i = nb; i < n; i++) {
    let s = rechts[i]!;
    if (rand)
      for (let e = zahl[i]!; e < zahl[i + 1]!; e++) {
        const j = nach[e]!;
        if (j < nb) s += w[e]! * rand[j]!;
      }
    b[i] = s;
  }
  const mul = (v: Float64Array, aus: Float64Array): void => {
    for (let i = nb; i < n; i++) {
      let s = diag[i]! * v[i]!;
      for (let e = zahl[i]!; e < zahl[i + 1]!; e++) {
        const j = nach[e]!;
        if (j >= nb) s -= w[e]! * v[j]!;
      }
      aus[i] = s;
    }
  };
  const r = new Float64Array(n);
  const z = new Float64Array(n);
  const p = new Float64Array(n);
  const Ap = new Float64Array(n);
  const y = new Float64Array(n);
  mul(y, Ap);
  let bn = 0;
  for (let i = nb; i < n; i++) {
    r[i] = b[i]! - Ap[i]!;
    z[i] = r[i]! / (diag[i]! || 1);
    p[i] = z[i]!;
    bn += b[i]! * b[i]!;
  }
  bn = Math.sqrt(bn) || 1;
  let rz = 0;
  for (let i = nb; i < n; i++) rz += r[i]! * z[i]!;
  let schritte = 0;
  for (; schritte < 4000; schritte++) {
    mul(p, Ap);
    let pAp = 0;
    for (let i = nb; i < n; i++) pAp += p[i]! * Ap[i]!;
    if (Math.abs(pAp) < 1e-300) break;
    const alpha = rz / pAp;
    let rn = 0;
    for (let i = nb; i < n; i++) {
      y[i]! += alpha * p[i]!;
      r[i]! -= alpha * Ap[i]!;
      rn += r[i]! * r[i]!;
    }
    if (Math.sqrt(rn) / bn < 1e-7) break;
    let rzNeu = 0;
    for (let i = nb; i < n; i++) {
      z[i] = r[i]! / (diag[i]! || 1);
      rzNeu += r[i]! * z[i]!;
    }
    const beta = rzNeu / rz;
    rz = rzNeu;
    for (let i = nb; i < n; i++) p[i] = z[i]! + beta * p[i]!;
  }
  for (let i = nb; i < n; i++) x[i] = y[i]!;
  return { x, schritte };
}

function poisson(X: Float64Array, Y: Float64Array, T: Uint32Array, n: number, nb: number): { h: Float64Array; schritte: number; flaecheJe: Float64Array } {
  const L = laplaceBauen(X, Y, T, n);
  const rechts = new Float64Array(n);
  for (let i = nb; i < n; i++) rechts[i] = 4 * L.flaecheJe[i]!;
  const { x, schritte } = dirichletLoesen(L, n, nb, rechts, null);
  return { h: x, schritte, flaecheJe: L.flaecheJe };
}

// ---------- der Körper im Raum ----------

/**
 * Wie weit die Haut gerade ist (aus der Zeit des Aufblasens, siehe `aufblasen.ts`; Runde 5: Entstehung von der Mitte aus).
 *
 * Vier Flächen: vorn die Blase (Kuppel, auf demselben flachen Netz, am Anfang klein in der Mitte, `fuss` wächst bis 1), hinten
 * ihre Rückseite (erst nach dem Abriss: Trichter zum Abrisspunkt, dann rund), der Rest im Rahmen (im Blatt die ganze flache Haut,
 * nach dem Abriss Trichter zum Abrisspunkt, der flach in den Rahmen schnappt) und dazwischen der Schlauch (eigenes Netz: Ring ×
 * Länge vom Umfang der Blase zum Rahmen; am Anfang ein flacher Rock um die kleine Kuppel, dann ein Schlauch, der sich zum runden
 * Hals einschnürt). Beim Abriss gehen die Hälften des Schlauchs in die Rückseite und den Rest im Rahmen über (kurz überblendet).
 */
export interface Lage {
  /** im Blatt (vor ↩): nur die flache Haut im Rahmen */
  imBlatt: boolean;
  /** Umfang der Blase in der Tiefe; Höhe der Kuppel (1 = Form); Rückseite (0 = Trichter, 1 = rund) */
  ze: number;
  vorn: number;
  hinten: number;
  /** Größe der Blase um ihre Mitte (am Anfang klein, 1 = ganz) */
  fuss: number;
  /** in der Ebene gestaucht (+) oder gedehnt (−) um den Schwerpunkt; Welle über die Haut (Stärke, Phase) */
  quer: number;
  welle: number;
  phase: number;
  /** wie weit Vorder- und Rückseite am Umfang eine gemeinsame Normale haben (0..1) */
  zu: number;
  /** Rahmen in der Tiefe; Hals des Schlauchs: wie eng (0 offen, 1 zu) und wo (0 an der Blase, 1 am Rahmen) */
  zf: number;
  eng: number;
  halsOrt: number;
  /** Zeit seit dem Abriss (s; < 0 davor); Rest im Rahmen flach (1) oder noch Trichter (0); Abrisspunkt und Rahmen beim Abriss (Tiefe) */
  seitRiss: number;
  rahmen: number;
  hz: number;
  zfRiss: number;
  /** rund wie eine Seifenblase (1) oder die gezeichnete Form (0; darunter überschwingt sie), länglich in der Tiefe, seitliches Schwappen, Welle vom Abrisspunkt */
  rund: number;
  zStreck: number;
  schwapp: number;
  riesel: number;
  rieselOrt: number;
}

export const FLACH: Lage = {
  imBlatt: true,
  ze: 0,
  vorn: 0,
  hinten: 0,
  fuss: 1,
  quer: 0,
  welle: 0,
  phase: 0,
  zu: 1,
  zf: 0,
  eng: 0,
  halsOrt: 0.5,
  seitRiss: -1,
  rahmen: 1,
  hz: 0,
  zfRiss: 0,
  rund: 0,
  zStreck: 1,
  schwapp: 0,
  riesel: 0,
  rieselOrt: 0,
};

/** Profil eines Trichters vom Rand (v = 0) zum Abrisspunkt (v = 1): dort läuft die Haut längs der Tiefe */
function trichter(v: number): number {
  return 1 - Math.sqrt(Math.max(0, 1 - v));
}

/** Zeilen des Schlauchs (Länge); Spalten = Punkte des Rands */
export const SCHLAUCH_ZEILEN = 44;

export class Koerper {
  readonly flach: FlachNetz;
  /** Punkte: vorn 0..n−1, hinten n..2n−1, Rahmen 2n..3n−1 (je dieselbe Reihenfolge wie das flache Netz) */
  readonly anzahl: number;
  readonly pos: Float32Array;
  readonly normal: Float32Array;
  /** Dreiecke der Blase (vorn, hinten umgekehrt) und des Rahmens (lokal 0..n−1) */
  readonly index: Uint32Array;
  readonly indexRahmen: Uint32Array;
  /** Wölbung 0..1 (oben 1), Seite (+1 vorn, −1 hinten, 0 Rahmen), Lage im Blatt beim Start (für Muster, um 0, Radius 1) */
  readonly hoehe: Float32Array;
  readonly seite: Float32Array;
  readonly blatt: Float32Array;
  /** Dehnung der Haut gegen den Bezug (1 = ungedehnt); Sichtbarkeit */
  readonly dehnung: Float32Array;
  readonly sicht: Float32Array;
  private flaeche: Float64Array;
  private bezug: Float64Array;
  /** Schlauch: (Zeilen + 1) × nb Punkte, eigene Puffer wie die Haut */
  readonly schlauch: {
    pos: Float32Array;
    normal: Float32Array;
    hoehe: Float32Array;
    seite: Float32Array;
    blatt: Float32Array;
    dehnung: Float32Array;
    sicht: Float32Array;
    index: Uint32Array;
    flaeche: Float64Array;
    bezug: Float64Array;
  };
  /** Fülle: Höhe = fuelle · √h */
  fuelle = 0.72;
  /** Verformung durch Ziehen (Welt), je Punkt der flachen Seite; die Rückseite gespiegelt */
  readonly versatz: Float32Array;
  /** Kanten der Blase mit ihren zwei Dreiecken (für Umrisse an den Wänden) */
  private kanten: Int32Array | null = null;
  /** die runde Blase: Lage je Punkt im Blatt (Rand geglättet, Inneres harmonisch), Fläche wie die Form */
  private xr: Float64Array;
  private yr: Float64Array;
  /** Mitte des Rahmens (Mittel der Randpunkte) */
  private rmx: number;
  private rmy: number;

  constructor(flach: FlachNetz) {
    this.flach = flach;
    const n = flach.n;
    const nb = flach.nb;
    this.anzahl = 3 * n;
    this.pos = new Float32Array(this.anzahl * 3);
    this.normal = new Float32Array(this.anzahl * 3);
    this.hoehe = new Float32Array(this.anzahl);
    this.seite = new Float32Array(this.anzahl);
    this.blatt = new Float32Array(this.anzahl * 2);
    this.dehnung = new Float32Array(this.anzahl).fill(1);
    this.sicht = new Float32Array(this.anzahl).fill(1);
    this.flaeche = new Float64Array(this.anzahl);
    this.bezug = new Float64Array(this.anzahl);
    this.versatz = new Float32Array(n * 3);
    const T = flach.tri;
    const idx = new Uint32Array(T.length * 2);
    for (let t = 0; t < T.length; t += 3) {
      idx[t] = T[t]!;
      idx[t + 1] = T[t + 1]!;
      idx[t + 2] = T[t + 2]!;
      idx[T.length + t] = n + T[t]!;
      idx[T.length + t + 1] = n + T[t + 2]!;
      idx[T.length + t + 2] = n + T[t + 1]!;
    }
    this.index = idx;
    this.indexRahmen = Uint32Array.from(T);
    const rund = runderUmriss(flach);
    this.xr = rund.x;
    this.yr = rund.y;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < nb; i++) {
      mx += flach.x[i]!;
      my += flach.y[i]!;
    }
    this.rmx = mx / nb;
    this.rmy = my / nb;
    const r = flach.radius || 1;
    for (let s = 0; s < 3; s++)
      for (let i = 0; i < n; i++) {
        const v = s * n + i;
        this.hoehe[v] = flach.qMax > 0 ? flach.q[i]! / flach.qMax : 0;
        this.seite[v] = s === 0 ? 1 : s === 1 ? -1 : 0;
        this.blatt[v * 2] = (flach.x[i]! - flach.cx) / r;
        this.blatt[v * 2 + 1] = (flach.y[i]! - flach.cy) / r;
        this.bezug[v] = flach.punktFlaeche[i]!;
      }
    // Schlauch: Ring × Länge, Dreiecke mit der Außenseite nach außen
    const K = SCHLAUCH_ZEILEN;
    const m = (K + 1) * nb;
    const sx: number[] = [];
    for (let j = 0; j < K; j++)
      for (let i = 0; i < nb; i++) {
        const a = j * nb + i;
        const b = j * nb + ((i + 1) % nb);
        const c = (j + 1) * nb + i;
        const d = (j + 1) * nb + ((i + 1) % nb);
        sx.push(a, c, b, b, c, d);
      }
    this.schlauch = {
      pos: new Float32Array(m * 3),
      normal: new Float32Array(m * 3),
      hoehe: new Float32Array(m),
      seite: new Float32Array(m),
      blatt: new Float32Array(m * 2),
      dehnung: new Float32Array(m).fill(1),
      sicht: new Float32Array(m),
      index: Uint32Array.from(sx),
      flaeche: new Float64Array(m),
      bezug: new Float64Array(m).fill(1),
    };
  }

  /** Lage setzen: Punkte, Normalen, Fläche je Punkt, Sichtbarkeit; danach `dehnungRechnen` */
  setzen(l: Lage): void {
    const F = this.flach;
    const n = F.n;
    const P = this.pos;
    const S = this.sicht;
    const s = this.fuelle;
    const V = this.versatz;
    const qm = F.qMax || 1;
    // runde Blase: geglättete Lage, praller (Höhe × (1 + 0,3 · rund)); länglich in der Tiefe, die Breite gleicht es aus. Unter 0
    // überschwingt die Form (die Flossen schießen etwas über ihr Ziel hinaus)
    const ru = Math.min(1, l.rund);
    const hoch = (1 + 0.3 * Math.max(0, ru)) * l.zStreck;
    const breit = 1 / Math.sqrt(Math.max(0.2, l.zStreck));
    const k = (1 + l.quer) * breit * l.fuss;
    const kx = k * (1 + l.schwapp);
    const ky = k * (1 - l.schwapp);
    const kz = l.fuss;
    const nach = l.seitRiss >= 0;
    const ueb = nach ? weich(0, 0.08, l.seitRiss) : 0;
    // Abrisspunkt: auf der Achse des Schlauchs beim Hals
    const hx = F.cx + (this.rmx - F.cx) * l.halsOrt;
    const hy = F.cy + (this.rmy - F.cy) * l.halsOrt;
    for (let i = 0; i < n; i++) {
      const qi = F.q[i]!;
      const u = qi / qm;
      const x = F.x[i]!;
      const y = F.y[i]!;
      const xb = x + (this.xr[i]! - x) * ru;
      const yb = y + (this.yr[i]! - y) * ru;
      const xs = F.cx + (xb - F.cx) * kx + V[i * 3]!;
      const ys = F.cy + (yb - F.cy) * ky + V[i * 3 + 1]!;
      const welle = 1 + l.welle * Math.sin(6.2832 * (1.25 * (1 - u) - l.phase)) * (1 - u * 0.5);
      // Welle vom Abrisspunkt: läuft über die Rückseite (Ort 0 … 1), den Umfang (1) und die Vorderseite (1 … 2) bis nach vorn
      const rv = l.riesel > 0 ? 1 + l.riesel * Math.exp(-(((1 + u - l.rieselOrt) / 0.28) ** 2)) : 1;
      const rh = l.riesel > 0 ? 1 + l.riesel * Math.exp(-(((1 - u - l.rieselOrt) / 0.28) ** 2)) : 1;
      const h = n + i;
      const r = 2 * n + i;
      // vorn: Kuppel (wächst mit dem Fuß, eine kleine Blase ist auch flacher)
      P[i * 3] = xs;
      P[i * 3 + 1] = ys;
      P[i * 3 + 2] = l.ze + l.vorn * kz * s * qi * welle * hoch * rv + V[i * 3 + 2]!;
      // hinten: erst nach dem Abriss (Trichter zum Abrisspunkt, dann rund)
      const tv = trichter(u);
      const zum = tv * (1 - Math.min(1, Math.max(0, l.hinten)));
      P[h * 3] = xs + (hx - xs) * zum;
      P[h * 3 + 1] = ys + (hy - ys) * zum;
      P[h * 3 + 2] = l.ze - ((1 - l.hinten) * (l.ze - l.hz) * tv + l.hinten * kz * s * qi * welle * hoch * rh) - V[i * 3 + 2]!;
      // Rest im Rahmen: im Blatt flach; nach dem Abriss Trichter zum Abrisspunkt, der flach in den Rahmen schnappt
      const zr = l.imBlatt ? 0 : nach ? tv * (1 - l.rahmen) : 0;
      P[r * 3] = x + (hx - x) * zr;
      P[r * 3 + 1] = y + (hy - y) * zr;
      P[r * 3 + 2] = l.zf + (l.hz - l.zfRiss) * zr;
      S[i] = l.imBlatt ? 0 : 1;
      S[h] = l.imBlatt ? 0 : ueb;
      S[r] = l.imBlatt ? 1 : ueb;
    }
    this.normalenUndFlaeche(l.zu);
    this.schlauchSetzen(l, nach ? 1 - ueb : l.imBlatt ? 0 : 1);
  }

  /**
   * Schlauch vom Umfang der Blase (Zeile 0, die Randpunkte der Vorderseite) zum Rahmen (letzte Zeile, gezeichnete Form in der Tiefe
   * des Rahmens). Längs: die Lage im Blatt ändert sich an der Blase langsam (die Haut verlässt die Kuppel längs der Tiefe), die Tiefe
   * gleichmäßig. Am Hals zieht sich der Querschnitt zur Achse und wird dabei rund (wie echte Seifenhaut).
   */
  private schlauchSetzen(l: Lage, sicht: number): void {
    const F = this.flach;
    const nb = F.nb;
    const K = SCHLAUCH_ZEILEN;
    const S = this.schlauch;
    const P = this.pos;
    let ex = 0;
    let ey = 0;
    for (let i = 0; i < nb; i++) {
      ex += P[i * 3]!;
      ey += P[i * 3 + 1]!;
    }
    ex /= nb;
    ey /= nb;
    const vn = Math.min(0.92, Math.max(0.08, l.halsOrt));
    const glocke = (v: number): number => Math.sin(Math.PI * v) ** 2 * Math.exp(-(((v - vn) / 0.3) ** 2));
    const g0 = glocke(vn) || 1;
    const dx = new Float64Array(nb);
    const dy = new Float64Array(nb);
    for (let j = 0; j <= K; j++) {
      const v = j / K;
      const a = v * v * (3 - 2 * v);
      const cx = ex + (this.rmx - ex) * a;
      const cy = ey + (this.rmy - ey) * a;
      const z = l.ze + (l.zf - l.ze) * v;
      const b = (l.eng * glocke(v)) / g0;
      let rm = 0;
      for (let i = 0; i < nb; i++) {
        const bx = P[i * 3]! + (F.x[i]! - P[i * 3]!) * a;
        const by = P[i * 3 + 1]! + (F.y[i]! - P[i * 3 + 1]!) * a;
        dx[i] = bx - cx;
        dy[i] = by - cy;
        rm += Math.hypot(dx[i]!, dy[i]!);
      }
      rm /= nb;
      const runden = Math.min(1, 1.25 * b);
      const zieh = 1 - Math.min(1, b);
      for (let i = 0; i < nb; i++) {
        const r = Math.hypot(dx[i]!, dy[i]!) || 1;
        const qx = dx[i]! + ((dx[i]! / r) * rm - dx[i]!) * runden;
        const qy = dy[i]! + ((dy[i]! / r) * rm - dy[i]!) * runden;
        const o = (j * nb + i) * 3;
        S.pos[o] = cx + qx * zieh;
        S.pos[o + 1] = cy + qy * zieh;
        S.pos[o + 2] = z;
      }
    }
    S.sicht.fill(sicht);
    // Normalen und Fläche aus dem Gitter
    const N = S.normal;
    const Q = S.pos;
    const at = (i: number, j: number, c: number): number => Q[(Math.min(K, Math.max(0, j)) * nb + ((i + nb) % nb)) * 3 + c]!;
    for (let j = 0; j <= K; j++)
      for (let i = 0; i < nb; i++) {
        const tix = at(i + 1, j, 0) - at(i - 1, j, 0);
        const tiy = at(i + 1, j, 1) - at(i - 1, j, 1);
        const tiz = at(i + 1, j, 2) - at(i - 1, j, 2);
        const tvx = at(i, j + 1, 0) - at(i, j - 1, 0);
        const tvy = at(i, j + 1, 1) - at(i, j - 1, 1);
        const tvz = at(i, j + 1, 2) - at(i, j - 1, 2);
        let nx = tvy * tiz - tvz * tiy;
        let ny = tvz * tix - tvx * tiz;
        let nz = tvx * tiy - tvy * tix;
        const l2 = Math.hypot(nx, ny, nz);
        const o = (j * nb + i) * 3;
        if (l2 > 1e-12) {
          nx /= l2;
          ny /= l2;
          nz /= l2;
        } else {
          nx = 0;
          ny = 0;
          nz = -1;
        }
        N[o] = nx;
        N[o + 1] = ny;
        N[o + 2] = nz;
        S.flaeche[j * nb + i] = l2 / 4 + 1e-9;
      }
  }

  /**
   * Dehnung gegen den Bezug; der Bezug folgt der Fläche mit der Zeitkonstante `beruhigen` (s; 0 = gar nicht): So zeigt die Haut
   * Dehnung, solange sie neu ist, und beruhigt sich danach. Ergebnis: die größte Abweichung des Bezugs (0 = ruhig).
   */
  dehnungRechnen(dt = 0, beruhigen = 0): number {
    let rest = 0;
    const f = dt > 0 && beruhigen > 0 ? 1 - Math.exp(-dt / beruhigen) : 0;
    const folgen = (fl: Float64Array, bz: Float64Array, de: Float32Array): void => {
      for (let v = 0; v < fl.length; v++) {
        if (f > 0) {
          const d = fl[v]! - bz[v]!;
          bz[v]! += d * f;
          rest = Math.max(rest, Math.abs(d) / Math.max(1e-9, fl[v]!));
        }
        de[v] = fl[v]! / Math.max(1e-9, bz[v]!);
      }
    };
    folgen(this.flaeche, this.bezug, this.dehnung);
    folgen(this.schlauch.flaeche, this.schlauch.bezug, this.schlauch.dehnung);
    return rest;
  }

  /** Die Blase in Ruhe ist der Bezug ihrer Farben (vorher gesetzt: die Lage am Ende): Beim Wachsen blühen die Farben auf und kommen dort an */
  bezugRuhe(): void {
    const n = this.flach.n;
    for (let v = 0; v < 2 * n; v++) this.bezug[v] = this.flaeche[v]!;
  }

  /**
   * Beim Start des Aufblasens (vorher gesetzt: die Lage am Anfang): die Lage im Blatt für die Muster (so fließen die Farben der flachen
   * Haut ohne Sprung weiter) und der Bezug des Schlauchs (der flache Rock ist ungedehnt; was sich danach dehnt, färbt sich).
   */
  bezugJetzt(): void {
    const F = this.flach;
    const r = F.radius || 1;
    const n = F.n;
    for (let v = 0; v < 2 * n; v++) {
      this.blatt[v * 2] = (this.pos[v * 3]! - F.cx) / r;
      this.blatt[v * 2 + 1] = (this.pos[v * 3 + 1]! - F.cy) / r;
    }
    for (let i = 0; i < n; i++) this.bezug[2 * n + i] = F.punktFlaeche[i]!;
    const S = this.schlauch;
    for (let v = 0; v < S.flaeche.length; v++) {
      S.bezug[v] = S.flaeche[v]!;
      S.blatt[v * 2] = (S.pos[v * 3]! - F.cx) / r;
      S.blatt[v * 2 + 1] = (S.pos[v * 3 + 1]! - F.cy) / r;
    }
  }

  /** Bezug auf die flache Haut zurücksetzen (im Blatt) */
  bezugFlach(): void {
    const n = this.flach.n;
    for (let s = 0; s < 3; s++) for (let i = 0; i < n; i++) this.bezug[s * n + i] = this.flach.punktFlaeche[i]!;
  }

  private dreiecke(I: Uint32Array, versatz: number): void {
    const N = this.normal;
    const P = this.pos;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t]! + versatz;
      const b = I[t + 1]! + versatz;
      const c = I[t + 2]! + versatz;
      const ux = P[b * 3]! - P[a * 3]!;
      const uy = P[b * 3 + 1]! - P[a * 3 + 1]!;
      const uz = P[b * 3 + 2]! - P[a * 3 + 2]!;
      const vx = P[c * 3]! - P[a * 3]!;
      const vy = P[c * 3 + 1]! - P[a * 3 + 1]!;
      const vz = P[c * 3 + 2]! - P[a * 3 + 2]!;
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const l2 = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (l2 < 1e-20) continue;
      const f = l2 / 6;
      // nach dem Winkel an der Ecke gewichtet (nach der Fläche kippen die Normalen auf ungleichem Netz zur dichteren Seite)
      const wx = P[c * 3]! - P[b * 3]!;
      const wy = P[c * 3 + 1]! - P[b * 3 + 1]!;
      const wz = P[c * 3 + 2]! - P[b * 3 + 2]!;
      const lu = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
      const lv = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
      const lw = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
      const wa = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy + uz * vz) / (lu * lv))));
      const wb = Math.acos(Math.max(-1, Math.min(1, (-ux * wx - uy * wy - uz * wz) / (lu * lw))));
      const wc = Math.PI - wa - wb;
      const ex = nx / l2;
      const ey = ny / l2;
      const ez = nz / l2;
      N[a * 3]! += ex * wa;
      N[a * 3 + 1]! += ey * wa;
      N[a * 3 + 2]! += ez * wa;
      N[b * 3]! += ex * wb;
      N[b * 3 + 1]! += ey * wb;
      N[b * 3 + 2]! += ez * wb;
      N[c * 3]! += ex * wc;
      N[c * 3 + 1]! += ey * wc;
      N[c * 3 + 2]! += ez * wc;
      this.flaeche[a]! += f;
      this.flaeche[b]! += f;
      this.flaeche[c]! += f;
    }
  }

  private normalenUndFlaeche(zu: number): void {
    const N = this.normal;
    N.fill(0);
    this.flaeche.fill(0);
    this.dreiecke(this.index, 0);
    this.dreiecke(this.indexRahmen, 2 * this.flach.n);
    // Umfang: Vorder- und Rückseite treffen sich; sind sie eine Haut, gilt die gemeinsame Normale
    const F = this.flach;
    const n = F.n;
    for (let i = 0; i < F.nb; i++) {
      const v = i;
      const w = n + i;
      const ax = N[v * 3]!;
      const ay = N[v * 3 + 1]!;
      const az = N[v * 3 + 2]!;
      const bx = N[w * 3]!;
      const by = N[w * 3 + 1]!;
      const bz = N[w * 3 + 2]!;
      N[v * 3] = ax + zu * bx;
      N[v * 3 + 1] = ay + zu * by;
      N[v * 3 + 2] = az + zu * bz;
      N[w * 3] = bx + zu * ax;
      N[w * 3 + 1] = by + zu * ay;
      N[w * 3 + 2] = bz + zu * az;
    }
    for (let v = 0; v < this.anzahl; v++) {
      const x = N[v * 3]!;
      const y = N[v * 3 + 1]!;
      const z = N[v * 3 + 2]!;
      const l = Math.sqrt(x * x + y * y + z * z);
      if (l > 1e-12) {
        N[v * 3] = x / l;
        N[v * 3 + 1] = y / l;
        N[v * 3 + 2] = z / l;
      } else {
        N[v * 3] = 0;
        N[v * 3 + 1] = 0;
        N[v * 3 + 2] = v < n ? 1 : v < 2 * n ? -1 : 1;
      }
    }
  }

  /**
   * Umriss der Blase von der Achse `achse` (0 x, 1 y, 2 z) aus: Kanten, an denen die Haut von der Achse weg- und wieder herkippt.
   * Ergebnis: je Kante sechs Zahlen (Anfang und Ende, Welt).
   */
  umriss(achse: 0 | 1 | 2): Float32Array {
    const I = this.index;
    const P = this.pos;
    if (!this.kanten) {
      const karte = new Map<number, number>();
      const liste: number[] = [];
      const m = this.anzahl;
      for (let t = 0; t < I.length / 3; t++)
        for (let k = 0; k < 3; k++) {
          const a = I[t * 3 + k]!;
          const b = I[t * 3 + ((k + 1) % 3)]!;
          const s = Math.min(a, b) * m + Math.max(a, b);
          const vorher = karte.get(s);
          if (vorher === undefined) {
            karte.set(s, liste.length / 4);
            liste.push(a, b, t, -1);
          } else liste[vorher * 4 + 3] = t;
        }
      this.kanten = Int32Array.from(liste);
    }
    const nT = I.length / 3;
    const seite = new Float32Array(nT);
    for (let t = 0; t < nT; t++) {
      const a = I[t * 3]! * 3;
      const b = I[t * 3 + 1]! * 3;
      const c = I[t * 3 + 2]! * 3;
      const ux = P[b]! - P[a]!;
      const uy = P[b + 1]! - P[a + 1]!;
      const uz = P[b + 2]! - P[a + 2]!;
      const vx = P[c]! - P[a]!;
      const vy = P[c + 1]! - P[a + 1]!;
      const vz = P[c + 2]! - P[a + 2]!;
      seite[t] = achse === 0 ? uy * vz - uz * vy : achse === 1 ? uz * vx - ux * vz : ux * vy - uy * vx;
    }
    const aus: number[] = [];
    const K = this.kanten;
    for (let e = 0; e < K.length; e += 4) {
      const t1 = K[e + 2]!;
      const t2 = K[e + 3]!;
      if (t2 < 0) continue;
      if (seite[t1]! > 0 === seite[t2]! > 0) continue;
      const a = K[e]! * 3;
      const b = K[e + 1]! * 3;
      aus.push(P[a]!, P[a + 1]!, P[a + 2]!, P[b]!, P[b + 1]!, P[b + 2]!);
    }
    return Float32Array.from(aus);
  }

  /** Strahl gegen die Blase, Ergebnis: Abstand, Punkt, Dreieck; null = vorbei */
  treffen(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): { t: number; x: number; y: number; z: number; tri: number } | null {
    const P = this.pos;
    const I = this.index;
    let best = Infinity;
    let bt = -1;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t]! * 3;
      const b = I[t + 1]! * 3;
      const c = I[t + 2]! * 3;
      const e1x = P[b]! - P[a]!;
      const e1y = P[b + 1]! - P[a + 1]!;
      const e1z = P[b + 2]! - P[a + 2]!;
      const e2x = P[c]! - P[a]!;
      const e2y = P[c + 1]! - P[a + 1]!;
      const e2z = P[c + 2]! - P[a + 2]!;
      const px = dy * e2z - dz * e2y;
      const py = dz * e2x - dx * e2z;
      const pz = dx * e2y - dy * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det;
      const sx = ox - P[a]!;
      const sy = oy - P[a + 1]!;
      const sz = oz - P[a + 2]!;
      const u = (sx * px + sy * py + sz * pz) * inv;
      if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y;
      const qy = sz * e1x - sx * e1z;
      const qz = sx * e1y - sy * e1x;
      const w = (dx * qx + dy * qy + dz * qz) * inv;
      if (w < 0 || u + w > 1) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (tt > 1e-6 && tt < best) {
        best = tt;
        bt = t / 3;
      }
    }
    if (bt < 0) return null;
    return { t: best, x: ox + dx * best, y: oy + dy * best, z: oz + dz * best, tri: bt };
  }
}

function weich(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Die runde Blase zur Form: der Rand wird längs des Rands geglättet (viele Durchgänge, dünne Teile wie Flossen ziehen sich ein) und
 * auf die Fläche der Form vergrößert; das Innere folgt harmonisch (Laplace-Gleichung mit dem Versatz des Rands). So faltet das Netz
 * nicht, und jede Stelle der Form hat ihre Stelle in der runden Blase.
 */
function runderUmriss(F: FlachNetz): { x: Float64Array; y: Float64Array } {
  const n = F.n;
  const nb = F.nb;
  let bx = Float64Array.from(F.x.subarray(0, nb));
  let by = Float64Array.from(F.y.subarray(0, nb));
  const flaeche = (px: Float64Array, py: Float64Array): number => {
    let s = 0;
    for (let i = 0, j = nb - 1; i < nb; j = i++) s += px[j]! * py[i]! - px[i]! * py[j]!;
    return Math.abs(s / 2);
  };
  const A0 = flaeche(bx, by);
  for (let pass = 0; pass < 140; pass++) {
    const nx = new Float64Array(nb);
    const ny = new Float64Array(nb);
    for (let i = 0; i < nb; i++) {
      const a = (i - 1 + nb) % nb;
      const c = (i + 1) % nb;
      nx[i] = bx[i]! + 0.5 * ((bx[a]! + bx[c]!) / 2 - bx[i]!);
      ny[i] = by[i]! + 0.5 * ((by[a]! + by[c]!) / 2 - by[i]!);
    }
    bx = nx;
    by = ny;
  }
  let mx = 0;
  let my = 0;
  for (let i = 0; i < nb; i++) {
    mx += bx[i]!;
    my += by[i]!;
  }
  mx /= nb;
  my /= nb;
  const s = Math.sqrt(A0 / Math.max(1e-9, flaeche(bx, by)));
  const dx = new Float64Array(nb);
  const dy = new Float64Array(nb);
  for (let i = 0; i < nb; i++) {
    dx[i] = F.cx + (bx[i]! - mx) * s - F.x[i]!;
    dy[i] = F.cy + (by[i]! - my) * s - F.y[i]!;
  }
  const L = laplaceBauen(F.x, F.y, F.tri, n);
  const null0 = new Float64Array(n);
  const vx = dirichletLoesen(L, n, nb, null0, dx).x;
  const vy = dirichletLoesen(L, n, nb, null0, dy).x;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = F.x[i]! + vx[i]!;
    y[i] = F.y[i]! + vy[i]!;
  }
  return { x, y };
}

