// Erzeugte Matcap im hellen „Blender-Solid“-Look: weiches, an die Ansicht gebundenes Licht.
// Kein Bild aus Blender (Lizenz), sondern eine quadratische Funktion der Blicknormalen, per kleinster
// Quadrate an die Kugel in Florians Vorlage angepasst (RMS 1,1 Graustufen; hellste Stelle links der Mitte,
// unten rechts am dunkelsten, ganz leicht kühl).

import { DataTexture, LinearFilter, RGBAFormat, SRGBColorSpace } from 'three/webgpu';

const K = [223.0, -6.61, 14.86, 18.43, -11.22, -16.71, 7.81, -2.21, -8.68];

function grau(nx: number, ny: number, nz: number): number {
  const m = [1, nx, ny, nz, nx * nx, ny * ny, nx * ny, nx * nz, ny * nz];
  let v = 0;
  for (let i = 0; i < K.length; i++) v += K[i]! * m[i]!;
  return v;
}

export function blenderMatcap(groesse = 256): DataTexture {
  const daten = new Uint8Array(groesse * groesse * 4);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      let nx = ((x + 0.5) / groesse) * 2 - 1;
      // Zeile 0 = unten (v = 0)
      let ny = ((y + 0.5) / groesse) * 2 - 1;
      const r = Math.hypot(nx, ny);
      if (r > 1) {
        nx /= r;
        ny /= r;
      }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const g = Math.min(255, Math.max(0, grau(nx, ny, nz)));
      const o = (y * groesse + x) * 4;
      daten[o] = Math.round(Math.max(0, g - 2));
      daten[o + 1] = Math.round(g);
      daten[o + 2] = Math.round(Math.min(255, g + 1));
      daten[o + 3] = 255;
    }
  }
  const t = new DataTexture(daten, groesse, groesse, RGBAFormat);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = LinearFilter;
  t.minFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * Zebra-Matcap (Prüfwerkzeug aus der Recherche 12.10.): waagerechte Streifen über der Blicknormalen. Auf dem Körper
 * zeigen sie, wie Flächen ineinander übergehen: Streifen springen an einem Knick, knicken an einer weichen Kante und
 * fließen über glatte Flächen (wie die Zebra-Kontrolle im Autodesign).
 */
export function zebraMatcap(groesse = 256, streifen = 9): DataTexture {
  const daten = new Uint8Array(groesse * groesse * 4);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      const ny = ((y + 0.5) / groesse) * 2 - 1;
      // weiche Streifenkante (Kantenglättung), etwas Grundhelligkeit nach der Blender-Matcap
      const s = Math.sin(Math.PI * streifen * ny);
      const t = Math.min(1, Math.max(0, 0.5 + 2.5 * s));
      const g = 28 + t * 214;
      const o = (y * groesse + x) * 4;
      daten[o] = Math.round(g);
      daten[o + 1] = Math.round(g);
      daten[o + 2] = Math.round(Math.min(255, g + 4));
      daten[o + 3] = 255;
    }
  }
  const t = new DataTexture(daten, groesse, groesse, RGBAFormat);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = LinearFilter;
  t.minFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}
