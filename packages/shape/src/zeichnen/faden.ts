// Zeichnen (08.11.2026): Glättung des Bleistifts wie Photoshops „Glättung“.
//
// Faden (Standard, wie Photoshops „Faden-Modus“ und Affinitys Seil): Der Pinsel hängt an einem Faden der Länge R am Zeiger. Er folgt
// erst, wenn der Faden gespannt ist, und rückt dann genau so weit nach, dass der Faden wieder R lang ist. Zittern innerhalb von R
// hinterlässt nichts, und wer den Zeiger im Kreis neu ansetzt, lenkt den Faden um: so entsteht eine bewusste Ecke. Die Abweichung
// von der gemeinten Form hängt nicht vom Tempo ab (Recherche Teil B3: 1,4–5 px bei 12–20 px Faden).
//
// Nachlauf (zum Vergleich, näher an Photoshops Standardmodus): Der Pinsel läuft dem Zeiger mit einer Zeitkonstante nach und holt in
// Pausen auf. Er verformt umso mehr, je schneller man zeichnet (4–24 px bei 140 ms).
//
// Beide liefern die Punkte des Pinsels; beim Loslassen holt der Strich bis zum Zeiger auf (Photoshop: „Nachziehen am Strichende“).
// Längen in den Einheiten des Aufrufers (das Fenster rechnet Bildschirm-Pixel in Welteinheiten um, damit sich der Strich bei jedem
// Zoom gleich anfühlt). DOM-frei.

import type { V2 } from '../bezier';

export interface Glaettung {
  /** Pinsel an den Anfang setzen (genau dort beginnt der Strich, auch an einem Fangpunkt) */
  anfang(p: V2, t: number): V2;
  /** neue Zeigerlage; Ergebnis: neue Pinselpunkte (leer, wenn der Pinsel steht) */
  folge(p: V2, t: number): V2[];
  /** ohne neue Zeigerlage (für den Nachlauf in Pausen, je Bild aufrufen) */
  takt(t: number): V2[];
  /** Loslassen bei p: Punkte bis zum Zeiger (Abstand höchstens `schritt`) */
  ende(p: V2, schritt: number): V2[];
  /** wo der Pinsel gerade ist */
  readonly pinsel: V2 | null;
}

/** gerade Punkte von a bis b im Abstand höchstens h (ohne a, mit b) */
function strecke(a: V2, b: V2, h: number): V2[] {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d < 1e-9) return [];
  const n = Math.max(1, Math.ceil(d / Math.max(h, 1e-9)));
  const aus: V2[] = [];
  for (let k = 1; k <= n; k++) aus.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  return aus;
}

export class Faden implements Glaettung {
  private b: V2 | null = null;
  constructor(public laenge: number) {}
  get pinsel(): V2 | null {
    return this.b ? { ...this.b } : null;
  }
  anfang(p: V2): V2 {
    this.b = { x: p.x, y: p.y };
    return { ...this.b };
  }
  folge(p: V2): V2[] {
    const b = this.b;
    if (!b) return [this.anfang(p)];
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d <= this.laenge) return [];
    const k = (d - this.laenge) / d;
    b.x += dx * k;
    b.y += dy * k;
    return [{ ...b }];
  }
  takt(): V2[] {
    return [];
  }
  ende(p: V2, schritt: number): V2[] {
    const b = this.b;
    if (!b) return [];
    const aus = strecke(b, p, schritt);
    this.b = { x: p.x, y: p.y };
    return aus;
  }
}

/**
 * Nachlauf mit Zeitkonstante `tau` (ms): je Ereignis rückt der Pinsel um den Anteil 1 − e^(−Δt/τ) zum Zeiger, in Pausen über `takt`
 * weiter (holt auf).
 */
export class Nachlauf implements Glaettung {
  private b: V2 | null = null;
  private ziel: V2 | null = null;
  private zeit = 0;
  constructor(public tau: number) {}
  get pinsel(): V2 | null {
    return this.b ? { ...this.b } : null;
  }
  anfang(p: V2, t: number): V2 {
    this.b = { x: p.x, y: p.y };
    this.ziel = { x: p.x, y: p.y };
    this.zeit = t;
    return { ...this.b };
  }
  private ruecken(t: number): V2[] {
    const b = this.b;
    const z = this.ziel;
    if (!b || !z) return [];
    const dt = Math.max(0, t - this.zeit);
    this.zeit = t;
    const a = this.tau > 1e-9 ? 1 - Math.exp(-dt / this.tau) : 1;
    const nx = b.x + (z.x - b.x) * a;
    const ny = b.y + (z.y - b.y) * a;
    if (Math.hypot(nx - b.x, ny - b.y) < 1e-6) return [];
    b.x = nx;
    b.y = ny;
    return [{ ...b }];
  }
  folge(p: V2, t: number): V2[] {
    if (!this.b) return [this.anfang(p, t)];
    this.ziel = { x: p.x, y: p.y };
    return this.ruecken(t);
  }
  takt(t: number): V2[] {
    return this.ruecken(t);
  }
  ende(p: V2, schritt: number): V2[] {
    const b = this.b;
    if (!b) return [];
    const aus = strecke(b, p, schritt);
    this.b = { x: p.x, y: p.y };
    return aus;
  }
}

/**
 * Faden über einen geschlossenen Strich ohne Naht: Beim Zeichnen beginnt der Pinsel am Anfang und holt am Schluss gerade auf; an
 * dieser Naht knickt eine runde Form (am Blob als Ecke erkannt). Hier läuft der Faden erst eine Runde zum Einschwingen, die Spur
 * der zweiten Runde ist die Form — überall gleich geglättet, auch an der Naht.
 */
export function fadenRund(zeiger: readonly V2[], laenge: number): V2[] {
  if (zeiger.length < 3) return zeiger.map((p) => ({ x: p.x, y: p.y }));
  const f = new Faden(laenge);
  f.anfang(zeiger[0]!);
  for (const p of zeiger) f.folge(p);
  const spur: V2[] = [f.pinsel!];
  for (const p of zeiger) spur.push(...f.folge(p));
  return spur;
}
