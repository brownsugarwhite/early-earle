// PCHIP: monotone kubische Interpolation (Fritsch–Carlson) durch die Stützstellen (xs, ys), eine Regel für ganz Studio (Befund 1).
//
// Die Rechenschritte folgen genau `pchip` des Prototyps (apps/editor/src/ozzy-figur/form.ts:308–338), damit jeder Wert bitgleich
// ist: innen das gewichtete harmonische Mittel der beiden Nachbarsekanten (0, wenn sie das Vorzeichen wechseln oder eine flach ist),
// an den Enden die einseitige Sekante, außerhalb festgehalten. Anders als im Prototyp werden die Steigungen einmal vorab gerechnet
// (`pchipSteigungen`, im Bauplan) und die Werte je Bild ohne Speicher (`pchipWert`).
//
// Kreisregler: Beide Funktionen nehmen dieselbe optionale Periode. Steigungen, die mit `periode` gerechnet sind, gehören zu
// `pchipWert(…, periode)`; ohne Periode hielte der Wert hinter dem letzten Schlüssel fest, statt über die Naht zu laufen.
//
// Stützstellen steigen streng (zwei Schlüssel an derselben Stelle meldet die Prüfung, 3.6 Nr. 11). Für nicht fallende xs, auch mit
// gleichen Stellen, liefern beide Funktionen ohne Periode dieselben Zahlen wie der Prototyp, NaN und ±∞ eingeschlossen.

/** Steigung an einer inneren Stelle aus den Breiten und Sekanten links (hVor, a) und rechts (h, b); Rechenfolge des Prototyps */
function steigungInnen(hVor: number, a: number, h: number, b: number): number {
  if (a * b <= 0) return 0;
  const w1 = 2 * h + hVor;
  const w2 = h + 2 * hVor;
  return (w1 + w2) / (w1 / a + w2 / b);
}

/** kubische Hermite-Form im Stück ab x0 der Breite h; Rechenfolge des Prototyps */
function hermite(x0: number, h: number, y0: number, y1: number, m0: number, m1: number, x: number): number {
  const t = (x - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m1;
}

/**
 * Steigungen der n = xs.length Stützstellen nach aus[0 … n − 1].
 *
 * Ohne `periode` wie der Prototyp. Mit `periode` P (Kreisregler) gelten die Stützstellen als fortgesetzt
 * (… xₙ₋₂ − P, xₙ₋₁ − P | x₀ … xₙ₋₁ | x₀ + P, x₁ + P …, mindestens zwei je Seite): Jede Stelle hat dann innen zwei Nachbarn, auch
 * über die Naht, und bekommt die Steigung einer inneren Stelle. Das Nahtstück reicht von xₙ₋₁ bis x₀ + P; seine Breite
 * h = (x₀ + P) − xₙ₋₁ und Sekante zählen rechts von xₙ₋₁ und links von x₀ gleich, so ist die Steigung an der Naht auf beiden Seiten
 * dieselbe Zahl. Ausgewertet wird dann mit `pchipWert(xs, ys, aus, x, P)`, derselben Periode. Verlangt P > 0 und xₙ₋₁ − x₀ < P.
 *
 * Eine einzige Stützstelle hat die Steigung 0.
 */
export function pchipSteigungen(xs: ArrayLike<number>, ys: ArrayLike<number>, aus: Float64Array, periode?: number): void {
  const n = xs.length;
  if (ys.length < n) throw new RangeError(`pchipSteigungen: ${ys.length} Werte für ${n} Stützstellen`);
  if (aus.length < n) throw new RangeError(`pchipSteigungen: Platz für ${aus.length} Steigungen, gebraucht ${n}`);
  if (periode !== undefined) {
    if (!(periode > 0) || !Number.isFinite(periode))
      throw new RangeError(`pchipSteigungen: Periode ${String(periode)} ist nicht positiv und endlich`);
    if (n >= 2 && !(xs[n - 1]! - xs[0]! < periode))
      throw new RangeError(`pchipSteigungen: Stützstellen ${String(xs[0])} bis ${String(xs[n - 1])} passen nicht in die Periode ${periode}`);
  }
  if (n === 0) return;
  if (n === 1) {
    aus[0] = 0;
    return;
  }
  if (periode === undefined) {
    // an den Enden die einseitige Sekante
    const h0 = xs[1]! - xs[0]!;
    const d0 = (ys[1]! - ys[0]!) / h0;
    aus[0] = d0;
    aus[n - 1] = (ys[n - 1]! - ys[n - 2]!) / (xs[n - 1]! - xs[n - 2]!);
    // innen, Stelle für Stelle mit der Sekante links und rechts
    let hVor = h0;
    let dVor = d0;
    for (let k = 1; k < n - 1; k++) {
      const h = xs[k + 1]! - xs[k]!;
      const d = (ys[k + 1]! - ys[k]!) / h;
      aus[k] = steigungInnen(hVor, dVor, h, d);
      hVor = h;
      dVor = d;
    }
    return;
  }
  // periodisch: das Nahtstück ist der linke Nachbar von x₀ und der rechte von xₙ₋₁
  const hNaht = xs[0]! + periode - xs[n - 1]!;
  const dNaht = (ys[0]! - ys[n - 1]!) / hNaht;
  let hVor = hNaht;
  let dVor = dNaht;
  for (let k = 0; k < n; k++) {
    let h = hNaht;
    let d = dNaht;
    if (k < n - 1) {
      h = xs[k + 1]! - xs[k]!;
      d = (ys[k + 1]! - ys[k]!) / h;
    }
    aus[k] = steigungInnen(hVor, dVor, h, d);
    hVor = h;
    dVor = d;
  }
}

/**
 * Wert bei x aus Stützstellen und Steigungen (`pchipSteigungen`). Legt keinen Speicher an. Ohne Stützstellen NaN (wie der Prototyp).
 *
 * Ohne `periode` bitgleich zu `pchip` des Prototyps, außerhalb festgehalten; das Stück wird binär gesucht, bei nicht fallenden xs
 * dasselbe Stück wie die lineare Suche des Prototyps.
 *
 * Mit `periode` P (Kreisregler; die Steigungen aus `pchipSteigungen(xs, ys, m, P)`): x wird nach [x₀, x₀ + P) geholt; zwischen x₀ und
 * xₙ₋₁ gilt der Wert ohne Periode, dahinter das Nahtstück von xₙ₋₁ bis x₀ + P mit den Steigungen mₙ₋₁ und m₀. So ist die Kurve stetig
 * mit stetiger Steigung über die Naht, periodisch und an jeder Stützstelle exakt. P wird hier nicht geprüft (Bildtakt): Es muss die
 * Periode sein, mit der die Steigungen gerechnet sind.
 */
export function pchipWert(xs: ArrayLike<number>, ys: ArrayLike<number>, m: ArrayLike<number>, x: number, periode?: number): number {
  if (periode !== undefined) return wertPeriodisch(xs, ys, m, x, periode);
  const n = xs.length;
  if (n === 0) return NaN;
  if (n === 1 || x <= xs[0]!) return ys[0]!;
  if (x >= xs[n - 1]!) return ys[n - 1]!;
  // das erste Stück k mit x ≤ xs[k + 1]
  let k = 0;
  let bis = n - 2;
  while (k < bis) {
    const mitte = (k + bis) >>> 1;
    if (x > xs[mitte + 1]!) k = mitte + 1;
    else bis = mitte;
  }
  const x0 = xs[k]!;
  return hermite(x0, xs[k + 1]! - x0, ys[k]!, ys[k + 1]!, m[k]!, m[k + 1]!, x);
}

/** `pchipWert` mit Periode: Umlauf holen, innen wie ohne Periode, dahinter das Nahtstück */
function wertPeriodisch(xs: ArrayLike<number>, ys: ArrayLike<number>, m: ArrayLike<number>, x: number, periode: number): number {
  const n = xs.length;
  if (n === 0) return NaN;
  if (n === 1) return ys[0]!;
  const x0 = xs[0]!;
  let u = x - Math.floor((x - x0) / periode) * periode;
  // Rundung beim Holen: höchstens eine Periode daneben
  if (u < x0) u += periode;
  else if (u >= x0 + periode) u -= periode;
  const xl = xs[n - 1]!;
  if (u <= xl) return pchipWert(xs, ys, m, u);
  return hermite(xl, x0 + periode - xl, ys[n - 1]!, ys[0]!, m[n - 1]!, m[0]!, u);
}
