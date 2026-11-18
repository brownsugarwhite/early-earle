// Wesen-Editor 2, Beweis 4 „Look live“ (14.10.2026): Zonen-Atlas auf dem Käfig (Plan 8.2, Ptex-Prinzip).
//
// Jede Käfigfläche bekommt eine Kachel im Atlas. Die Unterteilung erzeugt je Stufe aus jeder Fläche je Ecke ein Kind
// [Eckpunkt, Kantenpunkt, Flächenpunkt, Kantenpunkt] (catmullClark.ts, Z. 142), die Kinder einer Fläche liegen am Stück.
// So lässt sich jeder feinen Fläche ihre Käfigfläche und jeder Ecke ihre (u, v) in deren Einheitsquadrat zuordnen; die
// feinen Punkte liegen bei Stufe L genau auf dem (2^L + 1)²-Gitter der Kachel. Eine Zone ist eine Vektorform in einer
// Ansicht (Seite, Top, Front); sie wird je feinem Punkt in der Ruhelage als signierter Abstand (+ innen) und örtlicher
// Weichheit ausgewertet und in die Kacheln geschrieben. Gemeinsame Punkte benachbarter Kacheln bekommen denselben Wert,
// die Kacheln stoßen nahtlos aneinander; der Shader liest zwischen den Texelmitten einer Kachel, nie über den Rand.

import type { Ableitung } from './ableiten';

export type AtlasKachelung = {
  /** Unterteilungsstufe L, Texel je Kachelkante (2^L + 1), Kacheln je Zeile/Spalte, Atlasmaße in Texeln */
  stufe: number;
  kante: number;
  spalten: number;
  zeilen: number;
  breite: number;
  hoehe: number;
  /** je feiner Fläche: Käfigfläche (Kachel) */
  flaecheVon: Int32Array;
  /** je feiner Fläche: Ecken (u, v) in der Kachel, 4 Ecken (Dreiecke: 3, die vierte 0) */
  eckenUV: Float32Array;
  eckenZahl: Uint8Array;
};

/** Kachelung aus der Unterteilung der Ableitung: Kinder je Ecke, (u, v) je Stufe halbiert. */
export function kachelung(abl: Ableitung): AtlasKachelung {
  const k0 = abl.kaefig;
  const stufen = abl.unterteilung.stufen;
  const L = stufen.length;
  // Stufe 0: Käfigflächen mit Einheitsquadrat (Dreiecke: drei Ecken)
  let flaecheVon = new Int32Array(k0.nF);
  let eckenUV = new Float32Array(8 * k0.nF);
  let eckenZahl = new Uint8Array(k0.nF);
  for (let f = 0; f < k0.nF; f++) {
    const m = k0.fStart[f + 1]! - k0.fStart[f]!;
    flaecheVon[f] = f;
    eckenZahl[f] = m;
    const uv = m === 3 ? [0, 0, 1, 0, 1, 1] : [0, 0, 1, 0, 1, 1, 0, 1];
    eckenUV.set(uv, 8 * f);
  }
  let eltern = k0;
  for (let s = 0; s < L; s++) {
    const kind = stufen[s]!.kaefig;
    const nF = kind.nF;
    const flaecheVonNeu = new Int32Array(nF);
    const eckenUVNeu = new Float32Array(8 * nF);
    const eckenZahlNeu = new Uint8Array(nF).fill(4);
    let c = 0;
    for (let f = 0; f < eltern.nF; f++) {
      const m = eckenZahl[f]!;
      // Mitte
      let cu = 0;
      let cv = 0;
      for (let i = 0; i < m; i++) {
        cu += eckenUV[8 * f + 2 * i]! / m;
        cv += eckenUV[8 * f + 2 * i + 1]! / m;
      }
      for (let i = 0; i < m; i++) {
        const u0 = eckenUV[8 * f + 2 * i]!;
        const v0 = eckenUV[8 * f + 2 * i + 1]!;
        const u1 = eckenUV[8 * f + 2 * ((i + 1) % m)]!;
        const v1 = eckenUV[8 * f + 2 * ((i + 1) % m) + 1]!;
        const u2 = eckenUV[8 * f + 2 * ((i + m - 1) % m)]!;
        const v2 = eckenUV[8 * f + 2 * ((i + m - 1) % m) + 1]!;
        flaecheVonNeu[c] = flaecheVon[f]!;
        eckenUVNeu.set([u0, v0, (u0 + u1) / 2, (v0 + v1) / 2, cu, cv, (u0 + u2) / 2, (v0 + v2) / 2], 8 * c);
        c++;
      }
    }
    if (c !== nF) throw new Error(`Atlas: Kinderzahl ${c} passt nicht zur Stufe (${nF})`);
    flaecheVon = flaecheVonNeu;
    eckenUV = eckenUVNeu;
    eckenZahl = eckenZahlNeu;
    eltern = kind;
  }
  const kante = (1 << L) + 1;
  const spalten = Math.max(1, Math.ceil(Math.sqrt(k0.nF)));
  const zeilen = Math.ceil(k0.nF / spalten);
  return { stufe: L, kante, spalten, zeilen, breite: spalten * kante, hoehe: zeilen * kante, flaecheVon, eckenUV, eckenZahl };
}

/** Kachelursprung (Texel) der Käfigfläche f. */
export function kachelUrsprung(k: AtlasKachelung, f: number): [number, number] {
  return [(f % k.spalten) * k.kante, Math.floor(f / k.spalten) * k.kante];
}

/**
 * Atlas-Koordinaten (0 … 1) je Dreiecksecke in der Reihenfolge von `zuDreiecken` (Fächer je Fläche): die Ecke (u, v)
 * liegt auf der Texelmitte Ursprung + (0,5 + u · 2^L, 0,5 + v · 2^L).
 */
export function atlasEcken(k: AtlasKachelung): Float32Array {
  let ecken = 0;
  for (let f = 0; f < k.flaecheVon.length; f++) ecken += 3 * Math.max(0, k.eckenZahl[f]! - 2);
  const out = new Float32Array(2 * ecken);
  const n = 1 << k.stufe;
  let o = 0;
  for (let f = 0; f < k.flaecheVon.length; f++) {
    const m = k.eckenZahl[f]!;
    const [ox, oy] = kachelUrsprung(k, k.flaecheVon[f]!);
    const ecke = (i: number) => {
      out[o++] = (ox + 0.5 + k.eckenUV[8 * f + 2 * i]! * n) / k.breite;
      out[o++] = (oy + 0.5 + k.eckenUV[8 * f + 2 * i + 1]! * n) / k.hoehe;
    };
    for (let i = 1; i < m - 1; i++) {
      ecke(0);
      ecke(i);
      ecke(i + 1);
    }
  }
  return out;
}

/** Je feinem Punkt eine Atlas-Koordinate (0 … 1; irgendeine Kachel, die ihn enthält) — für angesetzte Klingen, die die Werte ihres Fußpunkts übernehmen. */
export function punktAtlas(k: AtlasKachelung, flaechen: readonly (readonly number[])[], nPunkte: number): Float32Array {
  const out = new Float32Array(2 * nPunkte);
  const gesetzt = new Uint8Array(nPunkte);
  const n = 1 << k.stufe;
  for (let f = 0; f < k.flaecheVon.length; f++) {
    const [ox, oy] = kachelUrsprung(k, k.flaecheVon[f]!);
    for (let i = 0; i < k.eckenZahl[f]!; i++) {
      const v = flaechen[f]![i]!;
      if (gesetzt[v]) continue;
      gesetzt[v] = 1;
      out[2 * v] = (ox + 0.5 + k.eckenUV[8 * f + 2 * i]! * n) / k.breite;
      out[2 * v + 1] = (oy + 0.5 + k.eckenUV[8 * f + 2 * i + 1]! * n) / k.hoehe;
    }
  }
  return out;
}

/** Zone als Vektorform in einer Ansicht (Welt): geschlossenes Polygon, Weichheit je Punkt (Welt; 0 = pixelscharf). */
export type ZonenForm = { ansicht: 'seite' | 'top' | 'front'; punkte: { x: number; y: number; weich: number }[] };

/** Signierter Abstand (+ innen) zum Polygon und örtliche Weichheit (vom nächsten Kantenstück, linear zwischen den Punkten). */
export function polygonAbstand(form: ZonenForm, x: number, y: number): { d: number; weich: number } {
  const P = form.punkte;
  const n = P.length;
  let best = Infinity;
  let weich = 0;
  let innen = false;
  for (let i = 0; i < n; i++) {
    const a = P[i]!;
    const b = P[(i + 1) % n]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const l2 = ex * ex + ey * ey || 1e-18;
    const t = Math.min(1, Math.max(0, ((x - a.x) * ex + (y - a.y) * ey) / l2));
    const dx = a.x + ex * t - x;
    const dy = a.y + ey * t - y;
    const d = Math.hypot(dx, dy);
    if (d < best) {
      best = d;
      weich = a.weich + (b.weich - a.weich) * t;
    }
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y || 1e-12) + a.x) innen = !innen;
  }
  return { d: innen ? best : -best, weich };
}

/** Lage eines Ruhepunkts in der Ansicht der Form. */
function projektion(form: ZonenForm, p: readonly [number, number, number]): [number, number] {
  return form.ansicht === 'seite' ? [p[0], p[1]] : form.ansicht === 'top' ? [p[0], p[2]] : [p[2], p[1]];
}

/**
 * Zonen in den Atlas rastern: je Texel (= feiner Punkt in der Ruhelage) der signierte Abstand je Zone (R, G, B; Welt,
 * + innen) und die örtliche Weichheit je Zone (zweites Feld). Gemeinsame Punkte benachbarter Kacheln erhalten denselben
 * Wert. Höchstens drei Zonen.
 */
export function zonenRastern(k: AtlasKachelung, flaechen: readonly (readonly number[])[], ruhe: Float64Array | Float32Array, zonen: readonly ZonenForm[]): { abstand: Float32Array; weich: Float32Array } {
  const abstand = new Float32Array(4 * k.breite * k.hoehe);
  const weichheit = new Float32Array(4 * k.breite * k.hoehe);
  const n = 1 << k.stufe;
  const wert = new Map<number, [number, number, number, number, number, number]>();
  const werte = (v: number): [number, number, number, number, number, number] => {
    let w = wert.get(v);
    if (!w) {
      const p: [number, number, number] = [ruhe[3 * v]!, ruhe[3 * v + 1]!, ruhe[3 * v + 2]!];
      w = [0, 0, 0, 0, 0, 0];
      zonen.slice(0, 3).forEach((z, i) => {
        const [x, y] = projektion(z, p);
        const r = polygonAbstand(z, x, y);
        w![i] = r.d;
        w![3 + i] = r.weich;
      });
      wert.set(v, w);
    }
    return w;
  };
  for (let f = 0; f < k.flaecheVon.length; f++) {
    const m = k.eckenZahl[f]!;
    const [ox, oy] = kachelUrsprung(k, k.flaecheVon[f]!);
    const fl = flaechen[f]!;
    for (let i = 0; i < m; i++) {
      const tx = ox + Math.round(k.eckenUV[8 * f + 2 * i]! * n);
      const ty = oy + Math.round(k.eckenUV[8 * f + 2 * i + 1]! * n);
      const w = werte(fl[i]!);
      const o = 4 * (ty * k.breite + tx);
      abstand[o] = w[0];
      abstand[o + 1] = w[1];
      abstand[o + 2] = w[2];
      abstand[o + 3] = 1;
      weichheit[o] = w[3];
      weichheit[o + 1] = w[4];
      weichheit[o + 2] = w[5];
      weichheit[o + 3] = 1;
    }
  }
  return { abstand, weich: weichheit };
}
