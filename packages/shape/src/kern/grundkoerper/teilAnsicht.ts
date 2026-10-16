// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 „Teile erkennen“ (nur Anzeige): Welches Teil sieht man in jeder Ansicht,
// und wo liegen Umrisse von Teilen verdeckt hinter anderen (die Bauchlinien unter der Nase im Top)? Grundlage ist die
// Sichthülle (S0) mit den erkannten Teilen:
// - Ein Punkt der Hülle gehört einem seitlichen Paar, wenn er in jeder Ansicht, in der das Paar erkannt wurde, in dessen
//   Umriss liegt (Seite (x, y), Front (|z|, y), Top (x, |z|)); sonst dem Mittelteil, dessen Seitenumriss (x, y) enthält.
// - Je Ansicht und Rasterzelle laufen Strahlen durch die Hülle (Intervalle, kein Voxelgitter): sichtbar ist das Teil am
//   vordersten Punkt (Seite von +z, Front von −x, Back von +x, Top von +y, Bottom von −y), vorhanden alle Teile auf dem Strahl.
// - Flächen der sichtbaren Teile und die verdeckten Stücke der Teilumrisse werden als Züge ausgegeben (Marching Squares,
//   geglättet); was auf dem Rand der Silhouette liegt, ist die schwarze Linie und fehlt hier.
// Die Genauigkeit ist die des Rasters (Standard 160 Zellen über die größte Ausdehnung, ≈ 1,5–2 px) — es ist eine Anzeige.
// DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { type Huelle, type Intervalle, huelle, schneiden, schnittIntervalle } from './huelle';
import { type BlattName, type Teilbaum, teilbaum } from './teilbaum';
import type { GefrorenerTeilbaum } from '../../dokument';

export type AnsichtName = 'seite' | 'front' | 'hinten' | 'top' | 'unten';

/** Ein Blatt: sichtbare Flächen je Teil und verdeckte Umrissstücke je Teil (Züge in Blattkoordinaten). */
export type BlattTeile = {
  /** je Teil die geschlossenen Ränder seiner sichtbaren Fläche (x, y je Punkt; NaN, NaN trennt Züge) */
  flaechen: { teil: number; zuege: Float32Array }[];
  /** je Teil die Stücke seines Umrisses, die hinter einem anderen Teil liegen (x, y; NaN, NaN trennt) */
  verdeckt: { teil: number; zuege: Float32Array }[];
};
export type TeilAnsichten = Record<AnsichtName, BlattTeile>;

// ---------- Intervalle ----------

function vereinigen(iv: Intervalle): Intervalle {
  const s = iv.slice().sort((a, b) => a[0] - b[0]);
  const out: Intervalle = [];
  for (const [lo, hi] of s) {
    const l = out[out.length - 1];
    if (l && lo <= l[1]) l[1] = Math.max(l[1], hi);
    else out.push([lo, hi]);
  }
  return out;
}

function abziehen(a: Intervalle, b: Intervalle): Intervalle {
  let out = a.slice();
  for (const [lo, hi] of b) {
    const neu: Intervalle = [];
    for (const [p, q] of out) {
      if (hi <= p || lo >= q) neu.push([p, q]);
      else {
        if (lo > p) neu.push([p, lo]);
        if (hi < q) neu.push([hi, q]);
      }
    }
    out = neu;
  }
  return out;
}

/** Spiegeln einer Intervallmenge der positiven Hälfte auf beide Seiten. */
function gespiegelt(iv: Intervalle): Intervalle {
  return vereinigen([...iv.map(([lo, hi]) => [-hi, -lo] as [number, number]), ...iv]);
}

// ---------- Marching Squares ----------

/**
 * Ränder einer Maske (W × H, Zellmitten bei ox + (c + ½)h, oy + (r + ½)h) als geschlossene Züge; die Ecken liegen auf den
 * Kantenmitten zwischen Zellen. Danach zweimal nach Chaikin geglättet (Rasterstufen weg).
 */
export function maskenRaender(an: (r: number, c: number) => boolean, W: number, H: number, ox: number, oy: number, h: number): V2[][] {
  // Zellen außerhalb zählen als leer. Kantenmitten als Ganzzahlen: Gitter der Quadrate (r, c) für r, c ∈ [−1, H] × [−1, W];
  // waagerechte Mitte (r, c)–(r, c+1) → 2·k, senkrechte (r, c)–(r+1, c) → 2·k + 1 mit k = (r+1)·(W+2) + (c+1)
  const B = W + 2;
  const n = 2 * B * (H + 2);
  const nb1 = new Int32Array(n).fill(-1);
  const nb2 = new Int32Array(n).fill(-1);
  const maske = new Uint8Array((W + 2) * (H + 2));
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (an(r, c)) maske[(r + 1) * B + (c + 1)] = 1;
  const A = (r: number, c: number) => maske[(r + 1) * B + (c + 1)]!;
  const kante = (a: number, b: number) => {
    if (nb1[a] === -1) nb1[a] = b;
    else nb2[a] = b;
    if (nb1[b] === -1) nb1[b] = a;
    else nb2[b] = a;
  };
  const waag = (r: number, c: number) => 2 * ((r + 1) * B + (c + 1));
  const senk = (r: number, c: number) => 2 * ((r + 1) * B + (c + 1)) + 1;
  for (let r = -1; r < H; r++)
    for (let c = -1; c < W; c++) {
      const fall = A(r, c) | (A(r, c + 1) << 1) | (A(r + 1, c + 1) << 2) | (A(r + 1, c) << 3);
      if (fall === 0 || fall === 15) continue;
      // Quadrat zwischen den Zellmitten (r, c), (r, c+1), (r+1, c+1), (r+1, c): unten, rechts, oben, links
      const U = waag(r, c);
      const Rt = senk(r, c + 1);
      const O = waag(r + 1, c);
      const L = senk(r, c);
      switch (fall) {
        case 1:
        case 14:
          kante(L, U);
          break;
        case 2:
        case 13:
          kante(U, Rt);
          break;
        case 3:
        case 12:
          kante(L, Rt);
          break;
        case 4:
        case 11:
          kante(Rt, O);
          break;
        case 6:
        case 9:
          kante(U, O);
          break;
        case 7:
        case 8:
          kante(L, O);
          break;
        case 5:
          kante(L, O);
          kante(U, Rt);
          break;
        case 10:
          kante(L, U);
          kante(Rt, O);
          break;
      }
    }
  const punkt = (id: number): V2 => {
    const k = id >> 1;
    const r = Math.floor(k / B) - 1;
    const c = (k % B) - 1;
    const x0 = ox + (c + 0.5) * h;
    const y0 = oy + (r + 0.5) * h;
    return id & 1 ? { x: x0, y: y0 + h / 2 } : { x: x0 + h / 2, y: y0 };
  };
  const gesehen = new Uint8Array(n);
  const zuege: V2[][] = [];
  for (let start = 0; start < n; start++) {
    if (nb1[start] === -1 || gesehen[start]) continue;
    const zug: V2[] = [];
    let vor = -1;
    let jetzt = start;
    for (;;) {
      gesehen[jetzt] = 1;
      zug.push(punkt(jetzt));
      const a = nb1[jetzt]!;
      const b = nb2[jetzt]!;
      const weiter = a !== -1 && a !== vor && !gesehen[a] ? a : b !== -1 && b !== vor && !gesehen[b] ? b : -1;
      if (weiter === -1) break;
      vor = jetzt;
      jetzt = weiter;
    }
    if (zug.length >= 4) zuege.push(chaikin(chaikin(zug)));
  }
  return zuege;
}

function chaikin(p: V2[]): V2[] {
  const n = p.length;
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = p[i]!;
    const b = p[(i + 1) % n]!;
    out.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y }, { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
  }
  return out;
}

function flachZuege(zuege: V2[][], geschlossen: boolean): Float32Array {
  const out: number[] = [];
  for (const z of zuege) {
    for (const p of z) out.push(p.x, p.y);
    if (geschlossen && z.length) out.push(z[0]!.x, z[0]!.y);
    out.push(Number.NaN, Number.NaN);
  }
  return Float32Array.from(out);
}

// ---------- Teile je Ansicht ----------

/** Schnittlinien eines Polygons, einmal je Gitterlinie gerechnet. */
function scanZeilen(poly: readonly V2[] | undefined, quer: 'x' | 'y', werte: readonly number[]): Intervalle[] | null {
  if (!poly) return null;
  return werte.map((w) => schnittIntervalle(poly, quer, w));
}

/**
 * Teile je Ansicht (Blattkoordinaten wie die Zeichnungen, Kern-Einheiten). `zellen` = Rasterzellen über die größte
 * Ausdehnung des Körpers.
 */
export function teilAnsichten(dok: Dokument, b: Teilbaum, zellen = 160, h0?: Huelle): TeilAnsichten {
  const h = h0 ?? huelle(dok);
  const n = b.teile.length;
  // Ausdehnung: x und y aus der Seite, z aus Front und Top
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let z1 = 0;
  for (const p of h.seite) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  for (const p of h.front) z1 = Math.max(z1, Math.abs(p.x));
  for (const p of h.top) z1 = Math.max(z1, Math.abs(p.y));
  const g = Math.max(x1 - x0, y1 - y0, 2 * z1) / zellen;
  const linien = (a: number, e: number) => {
    const out: number[] = [];
    for (let v = a + g / 2; v < e; v += g) out.push(v);
    return out;
  };
  const xs = linien(x0, x1);
  const ys = linien(y0, y1);
  const zsPos = linien(0, z1);
  // Gitter je Blatt: Seite (x, y), Front (z, y) über ±z, Top (x, z) über ±z
  const zs = [...zsPos.map((z) => -z).reverse(), ...zsPos];
  // Mittelteile: Seitenumriss je Teil (Rumpf = Rest nach den Schnitten)
  const seitenUmriss: (V2[] | undefined)[] = b.teile.map((t, i) => (i === 0 ? b.rumpf.umriss : t.erkannt.seite?.umriss));
  const paar = b.teile.map((t) => t.art === 'paar');
  // Schnittlinien: Seite (Zeilen y → x, Spalten x → y), Front (Zeilen y → z, Spalten z → y), Top (Spalten x → z, Zeilen z → x)
  const seiteY = scanZeilen(h.seite, 'y', ys)!;
  const seiteX = scanZeilen(h.seite, 'x', xs)!;
  const frontY = scanZeilen(h.front, 'y', ys)!;
  const frontZ = scanZeilen(h.front, 'x', zs)!;
  const topX = scanZeilen(h.top, 'x', xs)!;
  const topZ = scanZeilen(h.top, 'y', zs)!;
  const sY = seitenUmriss.map((u) => scanZeilen(u, 'y', ys));
  const sX = seitenUmriss.map((u) => scanZeilen(u, 'x', xs));
  const fY = b.teile.map((t) => scanZeilen(t.erkannt.front?.umriss, 'y', ys));
  const fZ = b.teile.map((t) => scanZeilen(t.erkannt.front?.umriss, 'x', zsPos));
  const tX = b.teile.map((t) => scanZeilen(t.erkannt.top?.umriss, 'x', xs));
  const tZ = b.teile.map((t) => scanZeilen(t.erkannt.top?.umriss, 'y', zsPos));
  const zIndex = (z: number) => Math.min(zsPos.length - 1, Math.max(0, Math.floor(Math.abs(z) / g)));
  const inIv = (iv: Intervalle, v: number) => iv.some(([lo, hi]) => v >= lo && v <= hi);

  // Ein Blatt rastern: je Zelle die Intervalle jedes Teils längs des Strahls
  type Raster = { W: number; H: number; ox: number; oy: number; sicht: Int16Array[]; deckung: Uint32Array };
  const rastern = (W: number, H: number, ox: number, oy: number, strahl: (c: number, r: number) => (Intervalle | null)[], richtungen: (1 | -1)[]): Raster => {
    const sicht = richtungen.map(() => new Int16Array(W * H).fill(-1));
    const deckung = new Uint32Array(W * H);
    for (let r = 0; r < H; r++)
      for (let c = 0; c < W; c++) {
        const iv = strahl(c, r);
        if (iv === leer) continue;
        let m = 0;
        for (let k = 0; k < richtungen.length; k++) {
          const s = richtungen[k]!;
          let best = -1;
          let bv = -Infinity;
          for (let i = 0; i < iv.length; i++) {
            const x = iv[i];
            if (!x || !x.length) continue;
            const v = s > 0 ? x[x.length - 1]![1] : -x[0]![0];
            if (v > bv) {
              bv = v;
              best = i;
            }
          }
          sicht[k]![r * W + c] = best;
        }
        for (let i = 0; i < iv.length; i++) if (iv[i]?.length) m |= 1 << i;
        deckung[r * W + c] = m;
      }
    return { W, H, ox, oy, sicht, deckung };
  };
  // Strahl je Teil: seitliche Paare zuerst (sie nehmen ihre Stücke), der Rest gehört dem Mittelteil des Seitenumrisses
  const verteilen = (hull: Intervalle, paarIv: (i: number) => Intervalle | null, mitteIn: (i: number) => Intervalle | null): (Intervalle | null)[] => {
    const out: (Intervalle | null)[] = new Array(n).fill(null);
    let rest = hull;
    for (let i = 1; i < n; i++) {
      if (!paar[i]) continue;
      const q = paarIv(i);
      if (!q || !q.length) continue;
      const s = schneiden(rest, vereinigen(q));
      if (s.length) {
        out[i] = s;
        rest = abziehen(rest, s);
      }
    }
    for (let i = 0; i < n; i++) {
      if (paar[i]) continue;
      const m = mitteIn(i);
      if (!m || !m.length) continue;
      const s = schneiden(rest, m);
      if (s.length) out[i] = s;
    }
    return out;
  };
  const alle: Intervalle = [[-Infinity, Infinity]];
  /** Strahl außerhalb der Silhouette (geteilt, nie verändert) */
  const leer: (Intervalle | null)[] = new Array(n).fill(null);

  // Seite: Zelle (x, y), Strahl längs z (sichtbar = größtes z)
  const seite = rastern(xs.length, ys.length, xs[0]! - g / 2, ys[0]! - g / 2, (c, r) => {
    const x = xs[c]!;
    if (!inIv(seiteY[r]!, x)) return leer;
    const hull = schneiden(frontY[r]!, topX[c]!);
    return verteilen(
      hull,
      (i) => {
        let q: Intervalle = alle;
        if (sY[i]) q = inIv(sY[i]![r]!, x) ? q : [];
        if (fY[i]) q = schneiden(q, gespiegelt(fY[i]![r]!));
        if (tX[i]) q = schneiden(q, gespiegelt(tX[i]![c]!));
        return q;
      },
      (i) => (sY[i] && inIv(sY[i]![r]!, x) ? alle : null),
    );
  }, [1]);
  // Front/Back: Zelle (z, y), Strahl längs x (Front sieht das kleinste x, Back das größte)
  const front = rastern(zs.length, ys.length, zs[0]! - g / 2, ys[0]! - g / 2, (c, r) => {
    const z = zs[c]!;
    if (!inIv(frontY[r]!, z)) return leer;
    const hull = schneiden(seiteY[r]!, topZ[c]!);
    const zi = zIndex(z);
    return verteilen(
      hull,
      (i) => {
        let q: Intervalle = alle;
        if (fY[i]) q = inIv(fY[i]![r]!, Math.abs(z)) ? q : [];
        if (sY[i]) q = schneiden(q, sY[i]![r]!);
        if (tZ[i]) q = schneiden(q, tZ[i]![zi]!);
        return q;
      },
      (i) => (sY[i] ? sY[i]![r]! : null),
    );
  }, [-1, 1]);
  // Top/Bottom: Zelle (x, z), Strahl längs y (Top sieht das größte y, Bottom das kleinste)
  const top = rastern(xs.length, zs.length, xs[0]! - g / 2, zs[0]! - g / 2, (c, r) => {
    const z = zs[r]!;
    if (!inIv(topX[c]!, z)) return leer;
    const hull = schneiden(seiteX[c]!, frontZ[r]!);
    const zi = zIndex(z);
    return verteilen(
      hull,
      (i) => {
        let q: Intervalle = alle;
        if (tX[i]) q = inIv(tX[i]![c]!, Math.abs(z)) ? q : [];
        if (sX[i]) q = schneiden(q, sX[i]![c]!);
        if (fZ[i]) q = schneiden(q, fZ[i]![zi]!);
        return q;
      },
      (i) => (sX[i] ? sX[i]![c]! : null),
    );
  }, [1, -1]);

  // Züge eines Rasters: Flächen je sichtbarem Teil; verdeckte Umrissstücke je Teil (Rand seiner Deckung, wo dort ein
  // anderes Teil sichtbar ist und der Rand nicht auf dem Rand der Silhouette liegt)
  // Ränder der Deckung je Teil (für Front/Back bzw. Top/Bottom dieselben)
  const deckungsRaender = (R: Raster): V2[][][] => {
    const { W, H, ox, oy } = R;
    return Array.from({ length: n }, (_, i) => maskenRaender((r, c) => ((R.deckung[r * W + c]! >> i) & 1) === 1, W, H, ox, oy, g));
  };
  const blatt = (R: Raster, k: number, raenderJeTeil: V2[][][]): BlattTeile => {
    const { W, H, ox, oy } = R;
    const sicht = R.sicht[k]!;
    const flaechen: BlattTeile['flaechen'] = [];
    const verdeckt: BlattTeile['verdeckt'] = [];
    const sichtbar = new Uint8Array(n);
    for (let q = 0; q < W * H; q++) if (sicht[q]! >= 0) sichtbar[sicht[q]!] = 1;
    for (let i = 0; i < n; i++) {
      if (sichtbar[i]) flaechen.push({ teil: i, zuege: flachZuege(maskenRaender((r, c) => sicht[r * W + c] === i, W, H, ox, oy, g), true) });
      // Rand der Deckung: verdeckt, wo die Zelle auf der Innenseite ein anderes Teil zeigt; nicht am Silhouettenrand
      const deckt = (r: number, c: number) => r >= 0 && c >= 0 && r < H && c < W && ((R.deckung[r * W + c]! >> i) & 1) === 1;
      const raender = raenderJeTeil[i]!;
      const stuecke: V2[][] = [];
      for (const z of raender) {
        let lauf: V2[] = [];
        for (const p of z) {
          const c = Math.floor((p.x - ox) / g);
          const r = Math.floor((p.y - oy) / g);
          let innenAnders = false;
          let aussen = false;
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
              const rr = r + dr;
              const cc = c + dc;
              if (rr < 0 || cc < 0 || rr >= H || cc >= W || R.deckung[rr * W + cc] === 0) aussen = true;
              else if (deckt(rr, cc) && sicht[rr * W + cc] !== i) innenAnders = true;
            }
          if (innenAnders && !aussen) lauf.push(p);
          else {
            if (lauf.length > 2) stuecke.push(lauf);
            lauf = [];
          }
        }
        if (lauf.length > 2) stuecke.push(lauf);
      }
      if (stuecke.length) verdeckt.push({ teil: i, zuege: flachZuege(stuecke, false) });
    }
    return { flaechen, verdeckt };
  };
  const rSeite = deckungsRaender(seite);
  const rFront = deckungsRaender(front);
  const rTop = deckungsRaender(top);
  return { seite: blatt(seite, 0, rSeite), front: blatt(front, 0, rFront), hinten: blatt(front, 1, rFront), top: blatt(top, 0, rTop), unten: blatt(top, 1, rTop) };
}

export type { BlattName };

/** Was der Editor von den Teilen zeigt (Worker → Blätter): Baum, Wirbelsäulen, Flächen je Ansicht, eingefrorener Stand. */
export type TeilAnzeige = {
  teile: { id: string; art: 'rumpf' | 'mitte' | 'paar'; eltern: number; richtung: string; knoten: Float32Array; achse: Float32Array; erkannt: BlattName[]; mass: number }[];
  ansichten: TeilAnsichten;
  gefroren: GefrorenerTeilbaum;
  /** ms: Erkennung und Ansichten */
  zeit: { erkennen: number; ansichten: number };
};

/** Teile erkennen (mit dem eingefrorenen Baum) und für die Anzeige aufbereiten. */
export function teilAnzeige(dok: Dokument, vorher?: GefrorenerTeilbaum | null): TeilAnzeige {
  const b = teilbaum(dok, vorher);
  const uhr = (globalThis as { performance?: { now(): number } }).performance;
  const t0 = uhr ? uhr.now() : Date.now();
  const ansichten = teilAnsichten(dok, b);
  const t1 = uhr ? uhr.now() : Date.now();
  const flach = (ps: readonly [number, number, number][]) => Float32Array.from(ps.flatMap((p) => p));
  return {
    teile: b.teile.map((t) => ({ id: t.id, art: t.art, eltern: t.eltern, richtung: t.richtung, knoten: flach(t.knoten), achse: flach(t.achse), erkannt: Object.keys(t.erkannt) as BlattName[], mass: t.mass })),
    ansichten,
    gefroren: b.gefroren,
    zeit: { erkennen: b.zeit, ansichten: t1 - t0 },
  };
}
