// Zeichnen: jedes Teil als geschlossener Pfad. Glatte Stellen als Catmull-Rom (in kubische Bézier-Stücke umgerechnet),
// an Ecken knickt der Pfad (einseitige Tangenten). Dasselbe als SVG für die Ausgabe.
import type { Zeichenteil } from './figur';

export interface Farben {
  schwarz: string;
  weiss: string;
}
export const LOGO_FARBEN: Farben = { schwarz: '#000000', weiss: '#ffffff' };

type Ziel = { moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; bezierCurveTo(a: number, b: number, c: number, d: number, e: number, f: number): void; closePath(): void };

export function pfadAus(t: Zeichenteil, ziel: Ziel): void {
  const { p, n, ecken } = t;
  if (n < 2) return;
  if (ecken === 'alle') {
    ziel.moveTo(p[0]!, p[1]!);
    for (let i = 1; i < n; i++) ziel.lineTo(p[i * 2]!, p[i * 2 + 1]!);
    ziel.closePath();
    return;
  }
  const x = (i: number) => p[((i + n) % n) * 2]!;
  const y = (i: number) => p[((i + n) % n) * 2 + 1]!;
  // Tangenten (ein- und ausgehend): glatt nach Catmull-Rom; an Ecken (Stärke g) zur Hälfte der Nachbarstrecke gezogen,
  // damit eine Spitze spitz bleibt. Die Stärke geht beim Morphen stetig mit, Knicke blenden also ein und aus.
  const tin = new Float32Array(n * 2);
  const tout = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const tx = (x(i + 1) - x(i - 1)) / 2;
    const ty = (y(i + 1) - y(i - 1)) / 2;
    const g = ecken ? ecken[i]! : 0;
    if (g > 0) {
      tin[i * 2] = tx + ((x(i) - x(i - 1)) * 0.5 - tx) * g;
      tin[i * 2 + 1] = ty + ((y(i) - y(i - 1)) * 0.5 - ty) * g;
      tout[i * 2] = tx + ((x(i + 1) - x(i)) * 0.5 - tx) * g;
      tout[i * 2 + 1] = ty + ((y(i + 1) - y(i)) * 0.5 - ty) * g;
    } else {
      tin[i * 2] = tout[i * 2] = tx;
      tin[i * 2 + 1] = tout[i * 2 + 1] = ty;
    }
  }
  ziel.moveTo(x(0), y(0));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = x(j) - x(i);
    const dy = y(j) - y(i);
    if (dx * dx + dy * dy < 1e-4) continue;
    ziel.bezierCurveTo(x(i) + tout[i * 2]! / 3, y(i) + tout[i * 2 + 1]! / 3, x(j) - tin[j * 2]! / 3, y(j) - tin[j * 2 + 1]! / 3, x(j), y(j));
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
