// Ozzy im Raum (Beweis 3D): das Weiß aus Florians Zeichnungen. Je Ansicht (Front, Seite, Rücken) das sichtbare Weiß seiner Zeichnung
// (Teile in Malreihenfolge, später gezeichnetes Schwarz deckt), als Abstandsfeld (innen negativ). Der Zeichner legt es aus der Richtung
// der Ansicht auf die Oberfläche; zwischen zwei Ansichten mischt er die Felder (keine Anker, die aneinander vorbeilaufen).
import { verschieben } from '../form';
import { koerperUrsprung } from '../raster';
import type { AnsichtName, FigurDaten } from '../vorlagen/import';
import { abstandsfeld, fuellen, type Gitter, gitterUm, linienzug } from './gitter';

export interface Maske {
  g: Gitter;
  /** Abstand zum sichtbaren Weiß (innen negativ), Einheiten */
  feld: Float32Array;
}

const RASTER = 0.5;

export function maskeVon(d: FigurDaten, n: AnsichtName): Maske {
  const a = d.ansichten[n];
  const u = koerperUrsprung(a);
  const zuege = a.teile.map((t) => linienzug(verschieben(t.form, -u[0], -u[1])));
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const z of zuege)
    for (let k = 0; k < z.length; k += 2) {
      x0 = Math.min(x0, z[k]!);
      x1 = Math.max(x1, z[k]!);
      y0 = Math.min(y0, z[k + 1]!);
      y1 = Math.max(y1, z[k + 1]!);
    }
  const g = gitterUm([x0, y0, x1, y1], RASTER, 24);
  const art = new Uint8Array(g.b * g.h);
  a.teile.forEach((t, i) => {
    const m = fuellen([zuege[i]!], g);
    for (let k = 0; k < m.length; k++) if (m[k]) art[k] = t.weiss ? 2 : 1;
  });
  const weiss = new Uint8Array(art.length);
  for (let k = 0; k < art.length; k++) weiss[k] = art[k] === 2 ? 1 : 0;
  return { g, feld: abstandsfeld(weiss, g) };
}
