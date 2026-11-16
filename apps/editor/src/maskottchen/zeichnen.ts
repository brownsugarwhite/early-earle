// Zeichnen: Bézier-Teile direkt aus Ankern und Griffen (wie in Illustrator), Vielecke (Gips, Fenster) als Linienzug.
// Dasselbe als SVG für die Ausgabe.
import type { Zeichenteil } from './figur';

export interface Farben {
  schwarz: string;
  weiss: string;
}
export const LOGO_FARBEN: Farben = { schwarz: '#000000', weiss: '#ffffff' };

type Ziel = { moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; bezierCurveTo(a: number, b: number, c: number, d: number, e: number, f: number): void; closePath(): void };

export function pfadAus(t: Zeichenteil, ziel: Ziel): void {
  const { p, n } = t;
  if (n < 2) return;
  if (t.art === 'vieleck') {
    ziel.moveTo(p[0]!, p[1]!);
    for (let i = 1; i < n; i++) ziel.lineTo(p[i * 2]!, p[i * 2 + 1]!);
    ziel.closePath();
    return;
  }
  ziel.moveTo(p[0]!, p[1]!);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = p[i * 6]!;
    const ay = p[i * 6 + 1]!;
    const bx = p[j * 6]!;
    const by = p[j * 6 + 1]!;
    ziel.bezierCurveTo(ax + p[i * 6 + 4]!, ay + p[i * 6 + 5]!, bx + p[j * 6 + 2]!, by + p[j * 6 + 3]!, bx, by);
  }
  ziel.closePath();
}

export function zeichneTeile(ctx: CanvasRenderingContext2D, teile: Zeichenteil[], farben: Farben = LOGO_FARBEN): void {
  for (const t of teile) {
    ctx.beginPath();
    pfadAus(t, ctx);
    ctx.fillStyle = t.farbe === 'schwarz' ? farben.schwarz : farben.weiss;
    ctx.fill('nonzero');
  }
}

/** SVG-Pfad (d) eines Teils */
export function svgPfad(t: Zeichenteil): string {
  const teile: string[] = [];
  const r = (v: number) => Math.round(v * 10) / 10;
  pfadAus(t, {
    moveTo: (x, y) => teile.push(`M${r(x)} ${r(y)}`),
    lineTo: (x, y) => teile.push(`L${r(x)} ${r(y)}`),
    bezierCurveTo: (a, b, c, d, e, f) => teile.push(`C${r(a)} ${r(b)} ${r(c)} ${r(d)} ${r(e)} ${r(f)}`),
    closePath: () => teile.push('Z'),
  });
  return teile.join('');
}

export function svgAus(teile: Zeichenteil[], rahmen: [number, number, number, number], farben: Farben = LOGO_FARBEN, hintergrund: string | null = '#ffffff'): string {
  const [x, y, w, h] = rahmen;
  const grund = hintergrund ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${hintergrund}"/>` : '';
  const pfade = teile.map((t) => `<path fill="${t.farbe === 'schwarz' ? farben.schwarz : farben.weiss}" d="${svgPfad(t)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${grund}${pfade}</svg>`;
}
