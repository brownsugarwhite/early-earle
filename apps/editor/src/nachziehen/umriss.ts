// Nachzeichnen (M4.1b): Silhouette aus Pixeln — Tinte (dunkel oder deckend), Außenraum von den Rändern füllen, größte
// Figur, Umriss per Moore-Verfolgung, auf ≈ 2 px Abstand abgetastet (Port der Idee aus `scripts/nachziehen/segment.py`,
// ohne Florians Punkte und Strichmitten). Koordinaten: Pixel, y nach unten; `umrissPunkte` liefert y nach oben.

export type Maske = { w: number; h: number; tinte: Uint8Array };

/** Tintenmaske aus RGBA-Pixeln: deckend und dunkler als `schwelle` (Helligkeit 0 … 255) oder nur deckend bei Transparenz. */
export function tinteAusPixeln(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number, schwelle = 215): Maske {
  const tinte = new Uint8Array(w * h);
  let transparent = false;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i]! < 250) {
    transparent = true;
    break;
  }
  for (let p = 0; p < w * h; p++) {
    const a = rgba[4 * p + 3]!;
    if (transparent) {
      tinte[p] = a > 40 ? 1 : 0;
      continue;
    }
    const lum = (299 * rgba[4 * p]! + 587 * rgba[4 * p + 1]! + 114 * rgba[4 * p + 2]!) / 1000;
    tinte[p] = lum < schwelle ? 1 : 0;
  }
  return { w, h, tinte };
}

/** Tinte um 1 px erweitern (gegen Haarlücken im Umriss). */
export function erweitern(m: Maske): Maske {
  const { w, h, tinte } = m;
  const out = new Uint8Array(tinte);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!tinte[y * w + x]) continue;
      if (x > 0) out[y * w + x - 1] = 1;
      if (x + 1 < w) out[y * w + x + 1] = 1;
      if (y > 0) out[(y - 1) * w + x] = 1;
      if (y + 1 < h) out[(y + 1) * w + x] = 1;
    }
  }
  return { w, h, tinte: out };
}

/** Figur = alles, was vom Rand aus nicht über Nicht-Tinte erreichbar ist; davon die größte zusammenhängende Fläche. */
export function groessteFigur(m: Maske): { figur: Uint8Array; flaeche: number; box: [number, number, number, number] } {
  const { w, h, tinte } = m;
  const aussen = new Uint8Array(w * h);
  const stapel: number[] = [];
  const schieben = (p: number) => {
    if (!aussen[p] && !tinte[p]) {
      aussen[p] = 1;
      stapel.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    schieben(x);
    schieben((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    schieben(y * w);
    schieben(y * w + w - 1);
  }
  while (stapel.length) {
    const p = stapel.pop()!;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) schieben(p - 1);
    if (x + 1 < w) schieben(p + 1);
    if (y > 0) schieben(p - w);
    if (y + 1 < h) schieben(p + w);
  }
  // Komponenten der Nicht-Außen-Pixel
  const marke = new Int32Array(w * h).fill(-1);
  let best = -1;
  let bestFlaeche = 0;
  let bestBox: [number, number, number, number] = [0, 0, 0, 0];
  let k = 0;
  for (let start = 0; start < w * h; start++) {
    if (aussen[start] || marke[start] !== -1) continue;
    let flaeche = 0;
    let x0 = w;
    let y0 = h;
    let x1 = -1;
    let y1 = -1;
    marke[start] = k;
    stapel.push(start);
    while (stapel.length) {
      const p = stapel.pop()!;
      const x = p % w;
      const y = (p - x) / w;
      flaeche++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const q of [x > 0 ? p - 1 : -1, x + 1 < w ? p + 1 : -1, y > 0 ? p - w : -1, y + 1 < h ? p + w : -1]) {
        if (q >= 0 && !aussen[q] && marke[q] === -1) {
          marke[q] = k;
          stapel.push(q);
        }
      }
    }
    if (flaeche > bestFlaeche) {
      bestFlaeche = flaeche;
      best = k;
      bestBox = [x0, y0, x1, y1];
    }
    k++;
  }
  const figur = new Uint8Array(w * h);
  if (best >= 0) for (let p = 0; p < w * h; p++) if (marke[p] === best) figur[p] = 1;
  return { figur, flaeche: bestFlaeche, box: bestBox };
}

/** Umriss der Figur per Moore-Nachbarschaft (8er), beginnend am obersten linken Figurpixel; Pixel, y nach unten. */
export function umrissVerfolgen(figur: Uint8Array, w: number, h: number): [number, number][] {
  const drin = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && figur[y * w + x] === 1;
  let sx = -1;
  let sy = -1;
  for (let y = 0; y < h && sx < 0; y++) for (let x = 0; x < w; x++) if (figur[y * w + x]) {
    sx = x;
    sy = y;
    break;
  }
  if (sx < 0) return [];
  // Richtungen im Uhrzeigersinn (Bildkoordinaten): O, SO, S, SW, W, NW, N, NO
  const DX = [1, 1, 0, -1, -1, -1, 0, 1];
  const DY = [0, 1, 1, 1, 0, -1, -1, -1];
  const out: [number, number][] = [[sx, sy]];
  let x = sx;
  let y = sy;
  let richtung = 6; // zuletzt aus Norden gekommen → Suche beginnt bei NW
  for (let schritt = 0; schritt < 4 * (w + h) * 4; schritt++) {
    let gefunden = false;
    const start = (richtung + 6) % 8; // eine Position zurück (gegen den Uhrzeigersinn) vom Vorgänger
    for (let k = 0; k < 8; k++) {
      const r = (start + k) % 8;
      const nx = x + DX[r]!;
      const ny = y + DY[r]!;
      if (drin(nx, ny)) {
        x = nx;
        y = ny;
        richtung = r;
        gefunden = true;
        break;
      }
    }
    if (!gefunden) break;
    if (x === sx && y === sy) break;
    out.push([x, y]);
  }
  return out;
}

/** Punktfolge auf gleichmäßigen Abstand abtasten (geschlossen), y nach oben gekippt (H − y), im Uhrzeigersinn. */
export function umrissPunkte(umriss: readonly [number, number][], h: number, abstand = 2): [number, number][] {
  if (umriss.length < 3) return [];
  const pts: [number, number][] = [];
  let rest = 0;
  for (let i = 0; i < umriss.length; i++) {
    const a = umriss[i]!;
    const b = umriss[(i + 1) % umriss.length]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let s = rest;
    while (s <= l) {
      const t = l > 0 ? s / l : 0;
      pts.push([a[0] + (b[0] - a[0]) * t, h - (a[1] + (b[1] - a[1]) * t)]);
      s += abstand;
    }
    rest = s - l;
  }
  // Umlaufsinn: Uhrzeigersinn bei y nach oben = negative Fläche (Shoelace)
  let flaeche = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    flaeche += a[0] * b[1] - b[0] * a[1];
  }
  if (flaeche > 0) pts.reverse();
  return pts;
}
