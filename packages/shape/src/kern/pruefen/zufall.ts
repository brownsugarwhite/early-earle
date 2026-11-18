// Zufallsreihe (Plan Teil V): reproduzierbarer Zufall (mulberry32) mit festem Startwert — derselbe Startwert liefert
// dieselben Fälle, damit Ausgangslage und neue Bauweise an genau denselben Wesen gemessen werden.

export type Zufall = {
  /** gleichverteilt in [0, 1) */
  zahl(): number;
  /** gleichverteilt in [a, b) */
  zwischen(a: number, b: number): number;
  /** Faktor 1 ± spanne (gleichverteilt) */
  faktor(spanne: number): number;
  /** ein Element der Liste */
  wahl<T>(liste: readonly T[]): T;
  /** Unterzufall mit eigenem Startwert (stabil, auch wenn später andere Ziehungen hinzukommen) */
  ableger(name: string): Zufall;
};

function mulberry32(start: number): () => number {
  let a = start >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a über einen Text (Startwert für Ableger). */
export function textHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function zufall(start: number): Zufall {
  const r = mulberry32(start);
  const z: Zufall = {
    zahl: r,
    zwischen: (a, b) => a + (b - a) * r(),
    faktor: (spanne) => 1 + spanne * (2 * r() - 1),
    wahl: (liste) => liste[Math.min(liste.length - 1, Math.floor(r() * liste.length))]!,
    ableger: (name) => zufall((start ^ textHash(name)) >>> 0),
  };
  return z;
}
