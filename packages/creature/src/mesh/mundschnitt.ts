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
/**
 * Ungleich große Kiefer (Kieferstufe): es gibt **zwei** Ränder — der Oberkieferrand liegt auf der Oberform, der
 * Unterkieferrand auf der Unterform, die Haut der Stufe dazwischen entfällt und die Tasche spannt den Spalt auf. So
 * schließt das Maul geschlossen nicht bündig (Hauer, Drache ohne Unterkiefer), zu den Mundwinkeln laufen beide Ränder
 * zusammen.
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
  /** Randvertices oben und unten von −θ nach +θ (an den Enden die Spitzen); bei zwei Rändern verschieden lang. */
  randOben: Uint32Array;
  randUnten: Uint32Array;
  /** Randpunkte des Oberkieferrands: Position, φ, Einwärtsrichtung (zur Trägerachse), orthogonalisiertes „oben“. */
  rand: Array<{ p: Vec3; phi: number; w: Vec3; u: Vec3; d: number }>;
  /** Randpunkte des Unterkieferrands (bei bündigem Maul dieselben Punkte). */
  randU: Array<{ p: Vec3; phi: number; w: Vec3; u: Vec3; d: number }>;
  /** Index des ersten Taschenvertex (alle Vertices ab hier liegen in der Tasche). */
  tascheStart: number;
  /** Glatte Normalen der Taschenvertices (xyz je Vertex, 0 außerhalb der Tasche) — aus dem Gitter statt aus den Facetten. */
  taschenNormalen: Float32Array;
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
  const pos: number[] = Array.from(positions);
  const quelle: number[] = [];
  for (let v = 0; v < n0; v++) quelle.push(v);
  const seite: number[] = new Array(n0).fill(0);
  // Klasse je Vertex: 1 Oberkieferhaut, −1 Unterkieferhaut, 2 Stufe zwischen den Rändern (wird entfernt), 0 sonst
  const klasse: number[] = new Array(n0).fill(0);
  let tris: number[] = Array.from(index);
  const addVertex = (q: Readonly<Vec3>, s: number, k: number): number => {
    pos.push(q[0], q[1], q[2]);
    quelle.push(-1);
    seite.push(s);
    klasse.push(k);
    return pos.length / 3 - 1;
  };
  /** Feld einer Randkurve am Vertex: f = h − h_Kurve(φ), Fenster g (Mundwinkel und Lippenradius), Winkel φ. */
  const feld = (v: number, kurve: (phiC: number) => number): { f: number; g: number; phi: number } => {
    const q: Vec3 = [pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!];
    const { h, phi, r } = mouth.local(q);
    const phiC = clamp(phi, -theta, theta);
    let f = h - kurve(phiC);
    if (Math.abs(f) < EPS) f = EPS;
    // Maulbereich: innerhalb der Mundwinkel **und** nahe am Lippenradius — Schwanz, Beine oder Rumpf auf gleicher Höhe
    // (versunkener Kopf, weit hinten liegende Winkel) liegen außerhalb des Fensters und bleiben ungeschnitten; das
    // Fenster ist stetig, der Schlitz endet darin wie an einer Spitze
    const lr = mouth.lipRAt(phiC);
    const fenster = lr > 1e-6 ? Math.min((r - 0.6 * lr) / lr, (1.5 * lr - r) / lr) * 2 : 1;
    return { f, g: Math.min(theta - Math.abs(phi), fenster), phi };
  };
  interface Rand { phi: number; oben: number; unten: number; pos: Vec3 }
  /**
   * Schneidet das aktuelle Netz entlang einer Randkurve: jede gekreuzte Kante bekommt einen Schnittpunkt, der zweimal
   * eingefügt wird (Kopie oben mit Seite/Klasse sO/kO, Kopie unten mit sU/kU); an den Mundwinkeln endet der Schlitz in
   * einem gemeinsamen Spitzenvertex. Liefert den Rand nach φ sortiert, Spitzen an den Enden.
   */
  const schneide = (kurve: (phiC: number) => number, sO: number, sU: number, kO: number, kU: number): Rand[] => {
    const n = pos.length / 3;
    const F = new Float32Array(n), G = new Float32Array(n), PHI = new Float32Array(n);
    for (let v = 0; v < n; v++) {
      const e = feld(v, kurve);
      F[v] = e.f;
      G[v] = e.g;
      PHI[v] = e.phi;
    }
    const newTris: number[] = [];
    interface Kreuz { pos: Vec3; phi: number; g: number; oben: number; unten: number }
    const kreuz = new Map<number, Kreuz>();
    const kreuzung = (a: number, b: number): Kreuz | null => {
      const key = a < b ? a * n + b : b * n + a;
      const had = kreuz.get(key);
      if (had) return had;
      const fa = F[a]!, fb = F[b]!;
      if (fa < 0 === fb < 0) return null;
      if (Math.abs(PHI[a]! - PHI[b]!) > Math.PI) return null; // Kante über die Rückseite
      const t = fa / (fa - fb);
      const q: Vec3 = [pos[a * 3]! + (pos[b * 3]! - pos[a * 3]!) * t, pos[a * 3 + 1]! + (pos[b * 3 + 1]! - pos[a * 3 + 1]!) * t, pos[a * 3 + 2]! + (pos[b * 3 + 2]! - pos[a * 3 + 2]!) * t];
      const g = G[a]! + (G[b]! - G[a]!) * t;
      const phi = PHI[a]! + (PHI[b]! - PHI[a]!) * t;
      const k: Kreuz = { pos: q, phi, g, oben: -1, unten: -1 };
      kreuz.set(key, k);
      return k;
    };
    const kopieOben = (k: Kreuz): number => (k.oben >= 0 ? k.oben : (k.oben = addVertex(k.pos, sO, kO)));
    const kopieUnten = (k: Kreuz): number => (k.unten >= 0 ? k.unten : (k.unten = addVertex(k.pos, sU, kU)));
    const spitzen: Array<{ idx: number; phi: number; pos: Vec3 }> = [];
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t]!, b = tris[t + 1]!, c = tris[t + 2]!;
      const sa = F[a]! < 0, sb = F[b]! < 0, sc = F[c]! < 0;
      if (sa === sb && sb === sc) {
        newTris.push(a, b, c);
        continue;
      }
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
      const lone = sa !== sb && sa !== sc ? a : sb !== sa && sb !== sc ? b : c;
      const others = lone === a ? [b, c] : lone === b ? [c, a] : [a, b];
      const loneUp = F[lone]! > 0;
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
        const l1 = loneUp ? kopieOben(k1) : kopieUnten(k1), l2 = loneUp ? kopieOben(k2) : kopieUnten(k2);
        const m1 = loneUp ? kopieUnten(k1) : kopieOben(k1), m2 = loneUp ? kopieUnten(k2) : kopieOben(k2);
        newTris.push(lone, l1, l2);
        newTris.push(m1, others[0]!, others[1]!, m1, others[1]!, m2);
      } else {
        // Spitzendreieck: der Schlitz kommt über die geschnittene Kante herein und endet im Dreieck bei g = 0
        const kc = cut1 ? k1 : k2, ko = cut1 ? k2 : k1;
        const sT = kc.g / Math.max(1e-9, kc.g - ko.g);
        const tp: Vec3 = [kc.pos[0] + (ko.pos[0] - kc.pos[0]) * sT, kc.pos[1] + (ko.pos[1] - kc.pos[1]) * sT, kc.pos[2] + (ko.pos[2] - kc.pos[2]) * sT];
        const tphi = kc.phi + (ko.phi - kc.phi) * sT;
        let tIdx = -1;
        for (const sp of spitzen) if (Math.abs(sp.phi - tphi) < 0.02 && Math.hypot(sp.pos[0] - tp[0], sp.pos[1] - tp[1], sp.pos[2] - tp[2]) < 1e-3) tIdx = sp.idx;
        if (tIdx < 0) {
          tIdx = addVertex(tp, 0, 0);
          spitzen.push({ idx: tIdx, phi: tphi, pos: tp });
        }
        const cUp = kopieOben(kc), cLo = kopieUnten(kc);
        if (cut1) {
          const lc = loneUp ? cUp : cLo, oc = loneUp ? cLo : cUp;
          newTris.push(tIdx, oc, others[0]!, tIdx, others[0]!, others[1]!, tIdx, others[1]!, lone, tIdx, lone, lc);
        } else {
          const lc = loneUp ? cUp : cLo, oc = loneUp ? cLo : cUp;
          newTris.push(tIdx, lc, lone, tIdx, lone, others[0]!, tIdx, others[0]!, others[1]!, tIdx, others[1]!, oc);
        }
      }
    }
    tris = newTris;
    const randListe: Rand[] = [];
    for (const k of kreuz.values()) if (k.oben >= 0 && k.unten >= 0) randListe.push({ phi: k.phi, oben: k.oben, unten: k.unten, pos: k.pos });
    randListe.sort((x, y) => x.phi - y.phi);
    spitzen.sort((x, y) => x.phi - y.phi);
    const tipL = spitzen.find((sp) => sp.phi < 0), tipR = spitzen.find((sp) => sp.phi > 0);
    if (tipL) randListe.unshift({ phi: tipL.phi, oben: tipL.idx, unten: tipL.idx, pos: tipL.pos });
    if (tipR) randListe.push({ phi: tipR.phi, oben: tipR.idx, unten: tipR.idx, pos: tipR.pos });
    return randListe;
  };

  // Ein Rand (gleich große Kiefer, bündig) oder zwei Ränder (Kieferstufe): Oberkieferrand und Unterkieferrand; die
  // Haut der Stufe dazwischen wird entfernt — geschlossen bleibt dort das Maul sichtbar offen (Florian: „darf dann nicht
  // mehr bündig schließen“, Hauer wachsen in die freie Stelle; Drache, Bild 5 rechts)
  const zweiRaender = mouth.kieferStufeMax > 1e-4;
  let randO: Rand[], randU: Rand[];
  if (!zweiRaender) {
    const r = schneide(mouth.lipHAt, 1, -1, 1, -1);
    randO = r;
    randU = r;
  } else {
    randO = schneide(mouth.lipHObenAt, 1, 0, 1, 2);
    randU = schneide(mouth.lipHUntenAt, 0, -1, 2, -1);
    for (let v = 0; v < n0; v++) {
      const eo = feld(v, mouth.lipHObenAt), eu = feld(v, mouth.lipHUntenAt);
      if (eo.f < 0 && eu.f > 0 && eo.g >= 0) klasse[v] = 2;
    }
    const kept: number[] = [];
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t]!, b = tris[t + 1]!, c = tris[t + 2]!;
      if (klasse[a] === 2 && klasse[b] === 2 && klasse[c] === 2) continue;
      kept.push(a, b, c);
    }
    tris = kept;
  }
  const nR = randO.length;
  // Randrahmen: Einwärtsrichtung zur Trägerachse, „oben“ orthogonalisiert, Tiefe elliptisch zu den Winkeln auslaufend
  const rahmen = (r: { phi: number; pos: Vec3 }): { p: Vec3; phi: number; w: Vec3; u: Vec3; d: number } => {
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
  };
  const rand: MundSchnitt['rand'] = randO.map(rahmen);
  const randUnt: MundSchnitt['rand'] = randU.map(rahmen);
  // Glatte Randkurven (Gauß-Kern über φ): die Schnittpunkte liegen unregelmäßig auf dem Gitter; würde jede Taschenspalte
  // vom eigenen Randpunkt ausgehen, bekäme die Höhle Rippen und Fransen („Blume mit ausgefransten Blüten“). Die Ränder
  // selbst bleiben exakt, die Tasche dahinter folgt der geglätteten Kurve — eine runde glatte Höhle mit scharfer Kante
  const glatt = (liste: ReadonlyArray<{ phi: number; pos: Vec3 }>): ((phi: number) => Vec3) => {
    const sig = Math.max(theta / 9, 0.04);
    return (phi: number): Vec3 => {
      let sx = 0, sy = 0, sz = 0, sw = 0;
      for (const q of liste) {
        const w = Math.exp(-Math.pow((q.phi - phi) / sig, 2));
        sx += w * q.pos[0];
        sy += w * q.pos[1];
        sz += w * q.pos[2];
        sw += w;
      }
      return sw > 1e-12 ? [sx / sw, sy / sw, sz / sw] : liste[0]!.pos;
    };
  };
  const glattO = glatt(randO), glattU = glatt(randU);
  // Unterrand auf die Spalten des Oberrands: bei zwei Rändern neue Vertices (nach φ interpoliert), Enden = Spitzen
  const interpU = (phi: number): Vec3 => {
    if (randU.length === 1) return randU[0]!.pos;
    let i = 0;
    while (i < randU.length - 2 && randU[i + 1]!.phi < phi) i++;
    const a = randU[i]!, b = randU[i + 1]!;
    const f = clamp((phi - a.phi) / Math.max(1e-9, b.phi - a.phi), 0, 1);
    return add(a.pos, scale(sub(b.pos, a.pos), f));
  };
  const unten: number[] = [];
  for (let i = 0; i < nR; i++) {
    if (!zweiRaender) unten.push(randU[i]!.unten);
    else if (i === 0) unten.push(randU[0]!.unten);
    else if (i === nR - 1) unten.push(randU[randU.length - 1]!.unten);
    else unten.push(addVertex(interpU(randO[i]!.phi), -1, -1));
  }
  // Tasche: Gitter nR × (zeilen+1); Zeile 0 = Oberrand, Zeile m = (interpolierter) Unterrand
  const m = Math.max(4, opt.zeilen ?? 10);
  const tascheStart = pos.length / 3;
  const grid = new Int32Array(nR * (m + 1));
  const tascheTiefe: number[] = new Array(tascheStart).fill(0);
  for (let i = 0; i < nR; i++) {
    const rl = randO[i]!;
    // Spalte aus der glatten Kurve (Rahmen daraus), die Randvertices selbst bleiben die echten Schnittpunkte; zu den
    // Mundwinkeln hin läuft die Glättung aus (dort zöge sie die Basis seitlich vom Rand weg — verdrehte Vierecke, Löcher)
    const tS = clamp((theta - Math.abs(rl.phi)) / (0.35 * theta), 0, 1);
    const wS = tS * tS * (3 - 2 * tS);
    const uAct: Vec3 = [pos[rl.oben * 3]!, pos[rl.oben * 3 + 1]!, pos[rl.oben * 3 + 2]!];
    const lAct: Vec3 = [pos[unten[i]! * 3]!, pos[unten[i]! * 3 + 1]!, pos[unten[i]! * 3 + 2]!];
    const uG = glattO(rl.phi), lG = glattU(rl.phi);
    const uS: Vec3 = add(uAct, scale(sub(uG, uAct), wS));
    const lS: Vec3 = add(lAct, scale(sub(lG, lAct), wS));
    const r = rahmen({ phi: rl.phi, pos: uS });
    const pU: Vec3 = lS;
    for (let k = 0; k <= m; k++) {
      if (k === 0) {
        grid[i * (m + 1)] = rl.oben;
        continue;
      }
      if (k === m) {
        grid[i * (m + 1) + m] = unten[i]!;
        continue;
      }
      // Spitze (Mundwinkel): die ganze Spalte ist derselbe Vertex — keine Nullkanten, das Netz bleibt geschlossen
      if (rl.oben === unten[i] || r.d < 1e-6) {
        grid[i * (m + 1) + k] = rl.oben;
        continue;
      }
      const sK = k / m;
      const x = r.d * Math.pow(Math.sin(Math.PI * sK), 0.8);
      // Gaumen nach oben, Boden nach unten, jeweils begrenzt durch die Kieferhöhe und die lokale Tiefe
      const amp = Math.min(sK < 0.5 ? opt.wölbungOben : opt.wölbungUnten, 0.6 * r.d);
      const y = amp * Math.sin(2 * Math.PI * sK);
      // Grundpunkt zwischen Ober- und Unterrand (bei zwei Rändern spannt die Tasche den Spalt auf)
      const bx = r.p[0] + (pU[0] - r.p[0]) * sK, by = r.p[1] + (pU[1] - r.p[1]) * sK, bz = r.p[2] + (pU[2] - r.p[2]) * sK;
      const q: Vec3 = [bx + r.w[0] * x + r.u[0] * y, by + r.w[1] * x + r.u[1] * y, bz + r.w[2] * x + r.u[2] * y];
      // Seite als Verlauf (Rand oben +1 … Rand unten −1): die Rachenwand mischt Ober- und Unterkieferbewegung weich
      const sd = 1 - 2 * sK;
      const idx = addVertex(q, Math.abs(sd) < 0.05 ? (sd < 0 ? -0.05 : 0.05) : sd, 0);
      grid[i * (m + 1) + k] = idx;
      tascheTiefe.push(Math.sin(Math.PI * sK));
    }
  }
  // Ein gemeinsames Vorzeichen für das ganze Taschengitter (Spalte × Zeile zeigt in die Höhle oder heraus — am tiefsten
  // Punkt in der Mitte entschieden): Wicklung und Normalen folgen ihm, statt je Dreieck gegen ein Zentrum zu raten (das
  // kippte nahe den Mundwinkeln, wo die Tasche flach wird — weggeklappte Dreiecke, weiße Löcher)
  const PG = (ii: number, kk: number): Vec3 => {
    const q = grid[Math.max(0, Math.min(nR - 1, ii)) * (m + 1) + Math.max(0, Math.min(m, kk))]!;
    return [pos[q * 3]!, pos[q * 3 + 1]!, pos[q * 3 + 2]!];
  };
  let gitterZeichen = 1;
  {
    const i0 = Math.floor(nR / 2), k0 = Math.floor(m / 2);
    const di = sub(PG(i0 + 1, k0), PG(i0 - 1, k0)), dk = sub(PG(i0, k0 + 1), PG(i0, k0 - 1));
    const n0: Vec3 = [di[1] * dk[2] - di[2] * dk[1], di[2] * dk[0] - di[0] * dk[2], di[0] * dk[1] - di[1] * dk[0]];
    const r0 = rand[i0]!;
    const c0 = add(r0.p, scale(r0.w, r0.d * 0.5));
    const toC = sub(c0, PG(i0, k0));
    gitterZeichen = n0[0] * toC[0] + n0[1] * toC[1] + n0[2] * toC[2] >= 0 ? 1 : -1;
  }
  // Glatte Normalen des Taschengitters aus den Gitterrichtungen (Spalte × Zeile) mit dem gemeinsamen Vorzeichen
  const taschenNormalen = new Float32Array(pos.length);
  for (let i = 0; i < nR; i++) {
    for (let k = 1; k < m; k++) {
      const v = grid[i * (m + 1) + k]!;
      if (v < tascheStart) continue;
      const di = sub(PG(i + 1, k), PG(i - 1, k)), dk = sub(PG(i, k + 1), PG(i, k - 1));
      let nx = di[1] * dk[2] - di[2] * dk[1], ny = di[2] * dk[0] - di[0] * dk[2], nz = di[0] * dk[1] - di[1] * dk[0];
      const nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-12) continue;
      nx = (nx / nl) * gitterZeichen;
      ny = (ny / nl) * gitterZeichen;
      nz = (nz / nl) * gitterZeichen;
      taschenNormalen[v * 3] = nx;
      taschenNormalen[v * 3 + 1] = ny;
      taschenNormalen[v * 3 + 2] = nz;
    }
  }
  const newTris = tris;
  const triZu = (x: number, y: number, z: number, centre: Readonly<Vec3>): void => {
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
  // Taschendreiecke: Wicklung aus dem Gitter (a,b,c / a,c,d entspricht +Spalte × Zeile), mit dem gemeinsamen Vorzeichen
  const triG = (x: number, y: number, z: number): void => {
    if (x === y || y === z || x === z) return;
    if (gitterZeichen > 0) newTris.push(x, y, z);
    else newTris.push(x, z, y);
  };
  for (let i = 0; i < nR - 1; i++) {
    for (let k = 0; k < m; k++) {
      const a = grid[i * (m + 1) + k]!, b = grid[(i + 1) * (m + 1) + k]!, c = grid[(i + 1) * (m + 1) + k + 1]!, d = grid[i * (m + 1) + k + 1]!;
      triG(a, b, c);
      triG(a, c, d);
    }
  }
  // Zwei Ränder: Reißverschluss zwischen der interpolierten Unterreihe und den echten Unterrand-Vertices
  if (zweiRaender) {
    let i = 0, j = 0;
    const cen = (): Vec3 => {
      const r = rand[Math.min(nR - 1, Math.max(0, i))]!;
      return add(r.p, scale(r.w, r.d * 0.5));
    };
    while (i < nR - 1 || j < randU.length - 1) {
      const phiI = i < nR - 1 ? randO[i + 1]!.phi : Infinity;
      const phiJ = j < randU.length - 1 ? randU[j + 1]!.phi : Infinity;
      if (phiI <= phiJ) {
        triZu(unten[i]!, unten[i + 1]!, randU[j]!.unten, cen());
        i++;
      } else {
        triZu(unten[i]!, randU[j + 1]!.unten, randU[j]!.unten, cen());
        j++;
      }
    }
  }
  const vertexCount = pos.length / 3;
  const positionsOut = new Float32Array(pos);
  // Taschentiefe und Seite auffüllen
  const tasche = new Float32Array(vertexCount);
  for (let v = tascheStart; v < vertexCount; v++) tasche[v] = tascheTiefe[v] ?? 0;
  while (seite.length < vertexCount) seite.push(0);
  // Seite der Hautvertices im Maulbereich aus der Maullinie (nur nahe der Lippe nötig, hier für alle)
  for (let v = 0; v < n0; v++) {
    const e = feld(v, mouth.lipHAt);
    seite[v] = e.g > -0.6 ? (e.f > 0 ? 1 : -1) : 0;
  }
  // Kantenabstand: Abstand zum nächsten Randpunkt (beide Ränder) — für **alle** Vertices stetig berechnet: ein
  // Vorgabewert außerhalb der Maulzone sprang an deren Rand, und die ableitungsbasierte Kantenglättung des Lippenbands
  // zeichnete den Sprung als haarfeine helle Linie über Hinterkopf und Schulter
  const kantenAbstand = new Float32Array(vertexCount).fill(1e3);
  const rp = rand.map((r) => r.p).concat(zweiRaender ? randUnt.map((r) => r.p) : []);
  for (let v = 0; v < vertexCount; v++) {
    const x = positionsOut[v * 3]!, y = positionsOut[v * 3 + 1]!, z = positionsOut[v * 3 + 2]!;
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
    randOben: Uint32Array.from(randO.map((r) => r.oben)),
    randUnten: Uint32Array.from(randU.map((r) => r.unten)),
    rand,
    randU: randUnt,
    tascheStart,
    taschenNormalen,
  };
}

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
  const nPaar = Math.min(ms.randOben.length, ms.randUnten.length);
  for (let i = 0; i < nPaar; i++) {
    const a = ms.randOben[i]!, b = ms.randUnten[i]!;
    const d = Math.hypot(ms.positions[a * 3]! - ms.positions[b * 3]!, ms.positions[a * 3 + 1]! - ms.positions[b * 3 + 1]!, ms.positions[a * 3 + 2]! - ms.positions[b * 3 + 2]!);
    if (d < 1e-6) ok++;
  }
  return ms.randOben.length ? ok / ms.randOben.length : 0;
}

export const _intern = { clamp01 };
