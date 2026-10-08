import { add, clamp, clamp01, normalize, scale, sub, type Vec3 } from '../math/vec';
import { hostCenter } from '../mouth/mouth';
import type { MouthGeometry } from '../mouth/mouth';

/**
 * **Lippenschnitt** — das Maul, wie ein Modeller es baut. Die Haut wird geschlossen vermascht und dann entlang der
 * Maullinie (Nullmenge des Felds F = h − h_Lippe(φ) im Trägerrahmen, nur zwischen den Mundwinkeln |φ| ≤ θ)
 * aufgeschnitten: Jede gekreuzte Kante bekommt einen Schnittpunkt, der **zweimal** eingefügt wird (Rand oben, Rand unten,
 * in Ruhe dieselbe Position); die Dreiecke werden entsprechend geteilt, an den Mundwinkeln endet der Schlitz in einem
 * gemeinsamen Spitzenvertex. Dahinter wird eine **Maultasche** (Gaumen, Rachen, Boden) als Gitter zwischen oberem und
 * unterem Rand angefügt. Geschlossen ist das Maul damit per Konstruktion perfekt (die Ränder sind dieselbe Kurve), die
 * Kante ist exakt die Kurve (kein Gitter-Treppen), beide Seiten haben eigene Normalen und Regionen — scharf und sauber
 * bei jeder Netzdichte. Öffnen = Unterkieferknochen dreht die untere Hautseite samt Taschenboden.
 */
export interface MundSchnitt {
  positions: Float32Array;
  index: Uint32Array;
  vertexCount: number;
  /** Quelle je Vertex: alter Index oder −1 (neu: Schnittpunkte, Spitzen, Tasche). */
  quelle: Int32Array;
  /** Taschentiefe je Vertex: 0 Haut, (0…1] in der Tasche (1 = ganz hinten). */
  tasche: Float32Array;
  /** Abstand zur Maulkante (Körpereinheiten) je Vertex, für das Lippenband; groß = weit weg. */
  kantenAbstand: Float32Array;
  /** Seite je Vertex: +1 oben (Oberkiefer/Gaumen), −1 unten (Unterkiefer/Boden), 0 außerhalb. */
  seite: Float32Array;
  /** Randvertices oben und unten von −θ nach +θ (an den Enden die gemeinsamen Spitzen). */
  randOben: Uint32Array;
  randUnten: Uint32Array;
  /** Randpunkte: Position, φ, Einwärtsrichtung (zur Trägerachse), orthogonalisiertes „oben“. */
  rand: Array<{ p: Vec3; phi: number; w: Vec3; u: Vec3; d: number }>;
  /** Index des ersten Taschenvertex (alle Vertices ab hier liegen in der Tasche). */
  tascheStart: number;
}

export interface SchnittOptionen {
  /** Tiefe der Tasche vorn (Körpereinheiten). */
  tiefe: number;
  /** Höhe des Gaumenbogens (Körpereinheiten) — muss in den Oberkiefer passen. */
  wölbungOben: number;
  /** Tiefe der Bodenmulde (Körpereinheiten) — muss in den Unterkiefer passen. */
  wölbungUnten: number;
  /** Zeilen des Taschengitters (Gaumen → Rachen → Boden). */
  zeilen?: number;
}

const EPS = 1e-6;

export function cutMouth(positions: Float32Array, index: Uint32Array, mouth: MouthGeometry, opt: SchnittOptionen): MundSchnitt {
  const n0 = positions.length / 3;
  const host = mouth.host;
  const theta = mouth.theta;
  // Felder je Vertex
  const F = new Float32Array(n0);
  const G = new Float32Array(n0);
  const PHI = new Float32Array(n0);
  const p: Vec3 = [0, 0, 0];
  for (let v = 0; v < n0; v++) {
    p[0] = positions[v * 3]!;
    p[1] = positions[v * 3 + 1]!;
    p[2] = positions[v * 3 + 2]!;
    const { h, phi, r } = mouth.local(p);
    const phiC = clamp(phi, -theta, theta);
    let f = h - mouth.lipHAt(phiC);
    if (Math.abs(f) < EPS) f = EPS;
    F[v] = f;
    // Maulbereich: innerhalb der Mundwinkel **und** nahe am Lippenradius — Schwanz, Beine oder Rumpf auf gleicher Höhe
    // (versunkener Kopf, weit hinten liegende Winkel) liegen außerhalb des Fensters und bleiben ungeschnitten; das
    // Fenster ist stetig, der Schlitz endet darin wie an einer Spitze
    const lr = mouth.lipRAt(phiC);
    const fenster = lr > 1e-6 ? Math.min((r - 0.6 * lr) / lr, (1.5 * lr - r) / lr) * 2 : 1;
    G[v] = Math.min(theta - Math.abs(phi), fenster);
    PHI[v] = phi;
  }
  const pos: number[] = Array.from(positions);
  const quelle: number[] = [];
  for (let v = 0; v < n0; v++) quelle.push(v);
  const seite: number[] = new Array(n0).fill(0);
  const newTris: number[] = [];
  // Schnittpunkte je Kante (Schlüssel min*n0+max)
  interface Kreuz { pos: Vec3; phi: number; g: number; oben: number; unten: number }
  const kreuz = new Map<number, Kreuz>();
  const kreuzung = (a: number, b: number): Kreuz | null => {
    const key = a < b ? a * n0 + b : b * n0 + a;
    const had = kreuz.get(key);
    if (had) return had;
    const fa = F[a]!, fb = F[b]!;
    if (fa < 0 === fb < 0) return null;
    if (Math.abs(PHI[a]! - PHI[b]!) > Math.PI) return null; // Kante über die Rückseite
    const t = fa / (fa - fb);
    const q: Vec3 = [
      positions[a * 3]! + (positions[b * 3]! - positions[a * 3]!) * t,
      positions[a * 3 + 1]! + (positions[b * 3 + 1]! - positions[a * 3 + 1]!) * t,
      positions[a * 3 + 2]! + (positions[b * 3 + 2]! - positions[a * 3 + 2]!) * t,
    ];
    const g = G[a]! + (G[b]! - G[a]!) * t;
    const phi = PHI[a]! + (PHI[b]! - PHI[a]!) * t;
    const k: Kreuz = { pos: q, phi, g, oben: -1, unten: -1 };
    kreuz.set(key, k);
    return k;
  };
  const addVertex = (q: Vec3, s: number): number => {
    pos.push(q[0], q[1], q[2]);
    quelle.push(-1);
    seite.push(s);
    return pos.length / 3 - 1;
  };
  const kopieOben = (k: Kreuz): number => (k.oben >= 0 ? k.oben : (k.oben = addVertex(k.pos, 1)));
  const kopieUnten = (k: Kreuz): number => (k.unten >= 0 ? k.unten : (k.unten = addVertex(k.pos, -1)));
  // Spitzen (Mundwinkel): gemeinsamer Vertex je Seite des Schlitzes, gefunden im Spitzendreieck
  const spitzen: Array<{ idx: number; phi: number; pos: Vec3 }> = [];

  for (let t = 0; t < index.length; t += 3) {
    const a = index[t]!, b = index[t + 1]!, c = index[t + 2]!;
    const sa = F[a]! < 0, sb = F[b]! < 0, sc = F[c]! < 0;
    if (sa === sb && sb === sc) {
      newTris.push(a, b, c);
      continue;
    }
    // Kanten mit Vorzeichenwechsel (genau zwei), welche davon im Maulbereich (g ≥ 0)?
    const edges: Array<[number, number]> = [];
    if (sa !== sb) edges.push([a, b]);
    if (sb !== sc) edges.push([b, c]);
    if (sc !== sa) edges.push([c, a]);
    const kr = edges.map(([x, y]) => kreuzung(x, y));
    const cut = kr.map((k) => !!k && k.g >= 0);
    const nCut = cut.filter(Boolean).length;
    if (nCut === 0 || !kr[0] || !kr[1]) {
      newTris.push(a, b, c);
      continue;
    }
    // der einzelne Vertex (anderes Vorzeichen als die beiden anderen)
    const lone = sa !== sb && sa !== sc ? a : sb !== sa && sb !== sc ? b : c;
    const others = lone === a ? [b, c] : lone === b ? [c, a] : [a, b]; // in Umlaufrichtung nach lone
    const loneUp = F[lone]! > 0;
    // Kreuzungen auf den Kanten lone–others[0] und others[1]–lone (in Umlaufrichtung): k1 auf (lone, o0), k2 auf (o1, lone)
    const kAt = (x: number, y: number): Kreuz | null => {
      for (let e = 0; e < edges.length; e++) {
        const [ex, ey] = edges[e]!;
        if ((ex === x && ey === y) || (ex === y && ey === x)) return kr[e]!;
      }
      return null;
    };
    const k1 = kAt(lone, others[0]!)!, k2 = kAt(others[1]!, lone)!;
    const cut1 = k1.g >= 0, cut2 = k2.g >= 0;
    if (cut1 && cut2) {
      // beide Kanten geschnitten: lone-Seite = Dreieck (lone, k1, k2), andere Seite = Viereck (k1, o0, o1, k2)
      const l1 = loneUp ? kopieOben(k1) : kopieUnten(k1), l2 = loneUp ? kopieOben(k2) : kopieUnten(k2);
      const m1 = loneUp ? kopieUnten(k1) : kopieOben(k1), m2 = loneUp ? kopieUnten(k2) : kopieOben(k2);
      newTris.push(lone, l1, l2);
      newTris.push(m1, others[0]!, others[1]!, m1, others[1]!, m2);
    } else {
      // Spitzendreieck: der Schlitz kommt über die geschnittene Kante herein und endet im Dreieck bei g = 0
      const kc = cut1 ? k1 : k2, ko = cut1 ? k2 : k1;
      const s = kc.g / Math.max(1e-9, kc.g - ko.g);
      const tp: Vec3 = [kc.pos[0] + (ko.pos[0] - kc.pos[0]) * s, kc.pos[1] + (ko.pos[1] - kc.pos[1]) * s, kc.pos[2] + (ko.pos[2] - kc.pos[2]) * s];
      const tphi = kc.phi + (ko.phi - kc.phi) * s;
      // dieselbe Spitze kann in einem Nachbardreieck schon entstanden sein (Schlitz endet genau auf einer Kante)
      let tIdx = -1;
      for (const sp of spitzen) if (Math.abs(sp.phi - tphi) < 0.02 && Math.hypot(sp.pos[0] - tp[0], sp.pos[1] - tp[1], sp.pos[2] - tp[2]) < 1e-3) tIdx = sp.idx;
      if (tIdx < 0) {
        tIdx = addVertex(tp, 0);
        spitzen.push({ idx: tIdx, phi: tphi, pos: tp });
      }
      const cUp = kopieOben(kc), cLo = kopieUnten(kc);
      // Umlauf des Dreiecks mit eingesetztem Schlitz: Fächer um die Spitze
      // Kante mit Schnitt: cut1 → zwischen lone und o0; cut2 → zwischen o1 und lone
      if (cut1) {
        const lc = loneUp ? cUp : cLo, oc = loneUp ? cLo : cUp;
        // Polygon: lone → lc → T → oc → o0 → o1 → lone
        newTris.push(tIdx, oc, others[0]!, tIdx, others[0]!, others[1]!, tIdx, others[1]!, lone, tIdx, lone, lc);
      } else {
        const lc = loneUp ? cUp : cLo, oc = loneUp ? cLo : cUp;
        // Schnitt auf (o1, lone): Polygon: lone → o0 → o1 → oc → T → lc → lone
        newTris.push(tIdx, lc, lone, tIdx, lone, others[0]!, tIdx, others[0]!, others[1]!, tIdx, others[1]!, oc);
      }
    }
  }
  // Rand sortiert nach φ, Spitzen an den Enden
  const randListe: Array<{ phi: number; oben: number; unten: number; pos: Vec3 }> = [];
  for (const k of kreuz.values()) if (k.oben >= 0 && k.unten >= 0) randListe.push({ phi: k.phi, oben: k.oben, unten: k.unten, pos: k.pos });
  randListe.sort((x, y) => x.phi - y.phi);
  spitzen.sort((x, y) => x.phi - y.phi);
  const tipL = spitzen.find((s) => s.phi < 0), tipR = spitzen.find((s) => s.phi > 0);
  if (tipL) randListe.unshift({ phi: tipL.phi, oben: tipL.idx, unten: tipL.idx, pos: tipL.pos });
  if (tipR) randListe.push({ phi: tipR.phi, oben: tipR.idx, unten: tipR.idx, pos: tipR.pos });
  const nR = randListe.length;
  // Randrahmen: Einwärtsrichtung zur Trägerachse, „oben“ orthogonalisiert, Tiefe elliptisch zu den Winkeln auslaufend
  const rand: MundSchnitt['rand'] = randListe.map((r) => {
    const { h } = mouth.local(r.pos);
    const axisPt = hostCenter(host, h);
    let w = sub(axisPt, r.pos);
    const wl = Math.hypot(w[0], w[1], w[2]) || 1;
    w = [w[0] / wl, w[1] / wl, w[2] / wl];
    const uw = host.up[0] * w[0] + host.up[1] * w[1] + host.up[2] * w[2];
    const u = normalize([host.up[0] - w[0] * uw, host.up[1] - w[1] * uw, host.up[2] - w[2] * uw]);
    const t = clamp(r.phi / theta, -1, 1);
    const d = opt.tiefe * Math.sqrt(Math.max(0, 1 - t * t));
    return { p: r.pos, phi: r.phi, w, u, d };
  });
  // Tasche: Gitter nR × (zeilen+1); Zeile 0 = Rand oben, Zeile m = Rand unten
  const m = Math.max(4, opt.zeilen ?? 10);
  const tascheStart = pos.length / 3;
  const grid = new Int32Array(nR * (m + 1));
  const tascheTiefe: number[] = new Array(tascheStart).fill(0);
  for (let i = 0; i < nR; i++) {
    const r = rand[i]!, rl = randListe[i]!;
    for (let k = 0; k <= m; k++) {
      if (k === 0) {
        grid[i * (m + 1)] = rl.oben;
        continue;
      }
      if (k === m) {
        grid[i * (m + 1) + m] = rl.unten;
        continue;
      }
      // Spitze (Mundwinkel): die ganze Spalte ist derselbe Vertex — keine Nullkanten, das Netz bleibt geschlossen
      if (rl.oben === rl.unten || r.d < 1e-6) {
        grid[i * (m + 1) + k] = rl.oben;
        continue;
      }
      const s = k / m;
      const x = r.d * Math.pow(Math.sin(Math.PI * s), 0.8);
      // Gaumen nach oben, Boden nach unten, jeweils begrenzt durch die Kieferhöhe und die lokale Tiefe
      const amp = Math.min(s < 0.5 ? opt.wölbungOben : opt.wölbungUnten, 0.6 * r.d);
      const y = amp * Math.sin(2 * Math.PI * s);
      const q: Vec3 = [r.p[0] + r.w[0] * x + r.u[0] * y, r.p[1] + r.w[1] * x + r.u[1] * y, r.p[2] + r.w[2] * x + r.u[2] * y];
      // Seite als Verlauf (Rand oben +1 … Rand unten −1): die Rachenwand mischt Ober- und Unterkieferbewegung weich
      const sd = 1 - 2 * s;
      const idx = addVertex(q, Math.abs(sd) < 0.05 ? (sd < 0 ? -0.05 : 0.05) : sd);
      grid[i * (m + 1) + k] = idx;
      tascheTiefe.push(Math.sin(Math.PI * s));
    }
  }
  // Taschendreiecke, Normalen zur Höhle (zum Taschenzentrum der Spalte) orientiert
  for (let i = 0; i < nR - 1; i++) {
    const r0 = rand[i]!, r1 = rand[i + 1]!;
    const c0 = add(r0.p, scale(r0.w, r0.d * 0.5)), c1 = add(r1.p, scale(r1.w, r1.d * 0.5));
    const centre: Vec3 = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2, (c0[2] + c1[2]) / 2];
    for (let k = 0; k < m; k++) {
      const a = grid[i * (m + 1) + k]!, b = grid[(i + 1) * (m + 1) + k]!, c = grid[(i + 1) * (m + 1) + k + 1]!, d = grid[i * (m + 1) + k + 1]!;
      const tri = (x: number, y: number, z: number): void => {
        if (x === y || y === z || x === z) return;
        const px = pos[x * 3]!, py = pos[x * 3 + 1]!, pz = pos[x * 3 + 2]!;
        const e1 = [pos[y * 3]! - px, pos[y * 3 + 1]! - py, pos[y * 3 + 2]! - pz];
        const e2 = [pos[z * 3]! - px, pos[z * 3 + 1]! - py, pos[z * 3 + 2]! - pz];
        const nx = e1[1]! * e2[2]! - e1[2]! * e2[1]!, ny = e1[2]! * e2[0]! - e1[0]! * e2[2]!, nz = e1[0]! * e2[1]! - e1[1]! * e2[0]!;
        const cx = (px + pos[y * 3]! + pos[z * 3]!) / 3, cy = (py + pos[y * 3 + 1]! + pos[z * 3 + 1]!) / 3, cz = (pz + pos[y * 3 + 2]! + pos[z * 3 + 2]!) / 3;
        const toC = [centre[0] - cx, centre[1] - cy, centre[2] - cz];
        if (nx * toC[0]! + ny * toC[1]! + nz * toC[2]! >= 0) newTris.push(x, y, z);
        else newTris.push(x, z, y);
      };
      tri(a, b, c);
      tri(a, c, d);
    }
  }
  const vertexCount = pos.length / 3;
  const positionsOut = new Float32Array(pos);
  // Taschentiefe und Seite auffüllen
  const tasche = new Float32Array(vertexCount);
  for (let v = tascheStart; v < vertexCount; v++) tasche[v] = tascheTiefe[v] ?? 0;
  while (seite.length < vertexCount) seite.push(0);
  // Seite der Hautvertices im Maulbereich aus F (nur nahe der Lippe nötig, hier für alle)
  for (let v = 0; v < n0; v++) seite[v] = G[v]! > -0.6 ? (F[v]! > 0 ? 1 : -1) : 0;
  // Kantenabstand: Abstand zum nächsten Randpunkt (für Haut und Tasche)
  const kantenAbstand = new Float32Array(vertexCount).fill(1e3);
  const rp = rand.map((r) => r.p);
  for (let v = 0; v < vertexCount; v++) {
    const x = positionsOut[v * 3]!, y = positionsOut[v * 3 + 1]!, z = positionsOut[v * 3 + 2]!;
    // grobe Vorauswahl: nur Vertices im Umkreis der Maulzone
    if (v < n0 && G[v]! < -0.9) continue;
    let best = 1e9;
    for (let i = 0; i < rp.length; i++) {
      const q = rp[i]!;
      const dx = x - q[0], dy = y - q[1], dz = z - q[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < best) best = d2;
    }
    kantenAbstand[v] = Math.sqrt(best);
  }
  return {
    positions: positionsOut,
    index: new Uint32Array(newTris),
    vertexCount,
    quelle: Int32Array.from(quelle),
    tasche,
    kantenAbstand,
    seite: Float32Array.from(seite),
    randOben: Uint32Array.from(randListe.map((r) => r.oben)),
    randUnten: Uint32Array.from(randListe.map((r) => r.unten)),
    rand,
    tascheStart,
  };
}

/** Flächennormalen (winkelgewichtet) für die angegebenen Vertices aus den Dreiecken, die sie enthalten. */
export function faceNormalsFor(positions: Float32Array, index: Uint32Array, which: Set<number> | null, normals: Float32Array): void {
  const acc = new Float32Array(positions.length);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t]!, b = index[t + 1]!, c = index[t + 2]!;
    if (which && !which.has(a) && !which.has(b) && !which.has(c)) continue;
    const ax = positions[a * 3]!, ay = positions[a * 3 + 1]!, az = positions[a * 3 + 2]!;
    const e1 = [positions[b * 3]! - ax, positions[b * 3 + 1]! - ay, positions[b * 3 + 2]! - az];
    const e2 = [positions[c * 3]! - ax, positions[c * 3 + 1]! - ay, positions[c * 3 + 2]! - az];
    const nx = e1[1]! * e2[2]! - e1[2]! * e2[1]!, ny = e1[2]! * e2[0]! - e1[0]! * e2[2]!, nz = e1[0]! * e2[1]! - e1[1]! * e2[0]!;
    for (const v of [a, b, c]) {
      if (which && !which.has(v)) continue;
      acc[v * 3] = acc[v * 3]! + nx;
      acc[v * 3 + 1] = acc[v * 3 + 1]! + ny;
      acc[v * 3 + 2] = acc[v * 3 + 2]! + nz;
    }
  }
  for (let v = 0; v < positions.length / 3; v++) {
    if (which && !which.has(v)) continue;
    const l = Math.hypot(acc[v * 3]!, acc[v * 3 + 1]!, acc[v * 3 + 2]!) || 1;
    normals[v * 3] = acc[v * 3]! / l;
    normals[v * 3 + 1] = acc[v * 3 + 1]! / l;
    normals[v * 3 + 2] = acc[v * 3 + 2]! / l;
  }
}

/** Hilfswert 0…1 (für Tests): Anteil der Randpaare, die in Ruhe exakt zusammenfallen. */
export function randGeschlossen(ms: MundSchnitt): number {
  let ok = 0;
  for (let i = 0; i < ms.randOben.length; i++) {
    const a = ms.randOben[i]!, b = ms.randUnten[i]!;
    const d = Math.hypot(ms.positions[a * 3]! - ms.positions[b * 3]!, ms.positions[a * 3 + 1]! - ms.positions[b * 3 + 1]!, ms.positions[a * 3 + 2]! - ms.positions[b * 3 + 2]!);
    if (d < 1e-6) ok++;
  }
  return ms.randOben.length ? ok / ms.randOben.length : 0;
}

export const _intern = { clamp01 };
