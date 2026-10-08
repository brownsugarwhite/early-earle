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
  /**
   * Interpolierte Unterrand-Vertices (Zeile m der Tasche bei zwei Rändern) mit ihren beiden Elternpunkten auf dem echten
   * Unterrand und dem Mischanteil f: Gewichte und Felder dieser Vertices müssen die Mischung der Eltern sein, sonst
   * öffnet sich der (in Ruhe entartete) Reißverschluss in der Pose zu Splittern.
   */
  interpEltern: Array<{ v: number; a: number; b: number; f: number }>;
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
  /** Feld einer Randkurve am Vertex: f = h − h_Kurve(φ), Fenster g (Mundwinkel und Radius der Kurve), Winkel φ, r. */
  const feld = (v: number, kurve: (phiC: number) => number, rKurve: (phiC: number) => number): { f: number; g: number; phi: number; r: number } => {
    const q: Vec3 = [pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!];
    const { h, phi, r } = mouth.local(q);
    const phiC = clamp(phi, -theta, theta);
    let f = h - kurve(phiC);
    if (Math.abs(f) < EPS) f = EPS;
    // Maulbereich: innerhalb der Mundwinkel **und** nahe am Radius der Kurve — Schwanz, Beine oder Rumpf auf gleicher Höhe
    // (versunkener Kopf, weit hinten liegende Winkel) liegen außerhalb des Fensters und bleiben ungeschnitten; das
    // Fenster ist stetig, der Schlitz endet darin wie an einer Spitze
    const lr = rKurve(phiC);
    const fenster = lr > 1e-6 ? Math.min((r - 0.6 * lr) / lr, (1.5 * lr - r) / lr) * 2 : 1;
    return { f, g: Math.min(theta - Math.abs(phi), fenster), phi, r };
  };
  interface Rand { phi: number; oben: number; unten: number; pos: Vec3 }
  /**
   * Schneidet das aktuelle Netz entlang einer Randkurve: jede gekreuzte Kante bekommt einen Schnittpunkt, der zweimal
   * eingefügt wird (Kopie oben mit Seite/Klasse sO/kO, Kopie unten mit sU/kU); an den Mundwinkeln endet der Schlitz in
   * einem gemeinsamen Spitzenvertex. Liefert den Rand nach φ sortiert, Spitzen an den Enden.
   */
  const schneide = (kurve: (phiC: number) => number, rKurve: (phiC: number) => number, sO: number, sU: number, kO: number, kU: number): Rand[] => {
    const n = pos.length / 3;
    const F = new Float32Array(n), G = new Float32Array(n), PHI = new Float32Array(n);
    for (let v = 0; v < n; v++) {
      const e = feld(v, kurve, rKurve);
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
    const r = schneide(mouth.lipHAt, mouth.lipRAt, 1, -1, 1, -1);
    randO = r;
    randU = r;
  } else {
    randO = schneide(mouth.lipHObenAt, mouth.lipRObenAt, 1, 0, 1, 2);
    randU = schneide(mouth.lipHUntenAt, mouth.lipRUntenAt, 0, -1, 2, -1);
    // Haut zwischen den Rändern entfernen: unter der oberen, über der unteren Kurve, innerhalb der Winkel und im
    // Radiusfenster **beider** Kurven (beim Maulspalt bis zur Brust liegt der untere Rand auf einem breiteren Rumpf)
    for (let v = 0; v < n0; v++) {
      const eo = feld(v, mouth.lipHObenAt, mouth.lipRObenAt), eu = feld(v, mouth.lipHUntenAt, mouth.lipRUntenAt);
      if (!(eo.f < 0 && eu.f > 0)) continue;
      if (Math.abs(eo.phi) > theta) continue;
      const phiC = clamp(eo.phi, -theta, theta);
      const rO = mouth.lipRObenAt(phiC), rU = mouth.lipRUntenAt(phiC);
      const rMin = Math.min(rO, rU), rMax = Math.max(rO, rU);
      if (eo.r >= 0.6 * rMin && eo.r <= 1.5 * rMax) klasse[v] = 2;
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
    const { h, phi } = mouth.local(r.pos);
    const axisPt = hostCenter(host, h);
    let wA = sub(axisPt, r.pos);
    const wl = Math.hypot(wA[0], wA[1], wA[2]) || 1;
    wA = [wA[0] / wl, wA[1] / wl, wA[2] / wl];
    // Richtung in den Rachen: vorn zur Achse (= nach hinten), seitlich und hinter der Achse zunehmend geradeaus nach
    // hinten — Randpunkte hinter der Achse (weite Keilmäuler: Goldie, Rex) zeigten sonst nach **vorn**, die Spalten
    // kreuzten die vorderen, das Gitter faltete sich und zeigte seine Rückseite (weiße Tasche)
    const nachHinten = 1 - clamp(Math.cos(phi), -1, 1);
    const w = normalize([wA[0] - host.forward[0] * nachHinten, wA[1] - host.forward[1] * nachHinten, wA[2] - host.forward[2] * nachHinten]);
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
  const interpU = (phi: number): { pos: Vec3; a: number; b: number; f: number } => {
    if (randU.length === 1) return { pos: randU[0]!.pos, a: randU[0]!.unten, b: randU[0]!.unten, f: 0 };
    let i = 0;
    while (i < randU.length - 2 && randU[i + 1]!.phi < phi) i++;
    const a = randU[i]!, b = randU[i + 1]!;
    const f = clamp((phi - a.phi) / Math.max(1e-9, b.phi - a.phi), 0, 1);
    return { pos: add(a.pos, scale(sub(b.pos, a.pos), f)), a: a.unten, b: b.unten, f };
  };
  const unten: number[] = [];
  const interpEltern: MundSchnitt['interpEltern'] = [];
  for (let i = 0; i < nR; i++) {
    if (!zweiRaender) unten.push(randU[i]!.unten);
    else if (i === 0) unten.push(randU[0]!.unten);
    else if (i === nR - 1) unten.push(randU[randU.length - 1]!.unten);
    else {
      const e = interpU(randO[i]!.phi);
      const v = addVertex(e.pos, -1, -1);
      unten.push(v);
      interpEltern.push({ v, a: e.a, b: e.b, f: e.f });
    }
  }
  // Tasche: Gitter nR × (zeilen+1); Zeile 0 = Oberrand, Zeile m = (interpolierter) Unterrand
  const m = Math.max(4, opt.zeilen ?? 10);
  const tascheStart = pos.length / 3;
  const grid = new Int32Array(nR * (m + 1));
  // ideales (glattes) Gitter: Zeilen 0 und m aus den geglätteten Randkurven statt der gezackten Schnittvertices — daraus
  // kommen die Normalen, nach denen die echten Dreiecke gewickelt werden; dazu je Spalte das Höhlenzentrum (Mitte
  // zwischen den Rändern, halbe Tiefe), zu dem die Innenseite zeigen muss
  const ideal = new Float64Array(nR * (m + 1) * 3);
  const hoehlenZentrum = new Float64Array(nR * 3);
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
    hoehlenZentrum[i * 3] = 0.5 * (uS[0] + lS[0]) + r.w[0] * r.d * 0.5;
    hoehlenZentrum[i * 3 + 1] = 0.5 * (uS[1] + lS[1]) + r.w[1] * r.d * 0.5;
    hoehlenZentrum[i * 3 + 2] = 0.5 * (uS[2] + lS[2]) + r.w[2] * r.d * 0.5;
    for (let k = 0; k <= m; k++) {
      const gi = i * (m + 1) + k;
      // ideale Lage: Ränder glatt, Spitzen auf dem glatten Oberrand (Zeile m auf dem glatten Unterrand)
      const idl: Vec3 = k === m ? lS : uS;
      ideal[gi * 3] = idl[0];
      ideal[gi * 3 + 1] = idl[1];
      ideal[gi * 3 + 2] = idl[2];
      if (k === 0) {
        grid[gi] = rl.oben;
        continue;
      }
      if (k === m) {
        grid[gi] = unten[i]!;
        continue;
      }
      // Spitze (Mundwinkel): die ganze Spalte ist derselbe Vertex — keine Nullkanten, das Netz bleibt geschlossen
      if (rl.oben === unten[i] || r.d < 1e-6) {
        grid[gi] = rl.oben;
        continue;
      }
      const sK = k / m;
      const x = r.d * Math.pow(Math.sin(Math.PI * sK), 0.8);
      // Gaumen nach oben, Boden nach unten, jeweils begrenzt durch die Kieferhöhe und die lokale Tiefe
      const amp = Math.min(sK < 0.5 ? opt.wölbungOben : opt.wölbungUnten, 0.6 * r.d);
      const y = amp * Math.sin(2 * Math.PI * sK);
      // Grundpunkt zwischen Ober- und Unterrand (bei zwei Rändern spannt die Tasche den Spalt auf) — ideal auf den
      // glatten Kurven; die echten Vertices der ersten drei Zeilen tragen das Voxel-Zickzack des Schnittrands
      // ausklingend mit (⅔, ⅓, 0): sonst sind die Vierecke zwischen glatter Zeile und gezacktem Rand verdreht und ihre
      // Splitter kippen bei flacher Sicht auf die Lippe weg (weiße Zacken entlang des Unterrands)
      const bx = r.p[0] + (pU[0] - r.p[0]) * sK, by = r.p[1] + (pU[1] - r.p[1]) * sK, bz = r.p[2] + (pU[2] - r.p[2]) * sK;
      ideal[gi * 3] = bx + r.w[0] * x + r.u[0] * y;
      ideal[gi * 3 + 1] = by + r.w[1] * x + r.u[1] * y;
      ideal[gi * 3 + 2] = bz + r.w[2] * x + r.u[2] * y;
      const zO = Math.max(0, 1 - k / 3), zU = Math.max(0, 1 - (m - k) / 3);
      const ox = (uAct[0] - uS[0]) * zO * (1 - sK) + (lAct[0] - lS[0]) * zU * sK;
      const oy = (uAct[1] - uS[1]) * zO * (1 - sK) + (lAct[1] - lS[1]) * zU * sK;
      const oz = (uAct[2] - uS[2]) * zO * (1 - sK) + (lAct[2] - lS[2]) * zU * sK;
      const q: Vec3 = [ideal[gi * 3]! + ox, ideal[gi * 3 + 1]! + oy, ideal[gi * 3 + 2]! + oz];
      // Seite als Verlauf (Rand oben +1 … Rand unten −1): die Rachenwand mischt Ober- und Unterkieferbewegung weich
      const sd = 1 - 2 * sK;
      const idx = addVertex(q, Math.abs(sd) < 0.05 ? (sd < 0 ? -0.05 : 0.05) : sd, 0);
      grid[i * (m + 1) + k] = idx;
      tascheTiefe.push(Math.sin(Math.PI * sK));
    }
  }
  // Orientierung: jedes Gitterviereck bekommt eine **ideale Normale** aus dem glatten Gitter (Spaltenrichtung × Zeilen-
  // richtung am Viereckmittel), mit Vorzeichen zum Höhlenzentrum der beiden Spalten. Die echten Dreiecke (mit den
  // gezackten Schnittvertices der Ränder, extrem gestreckt: Spaltenabstand ≈ ¼ Zelle, Zeilenabstand bis zur halben
  // Tiefe) werden dann so gewickelt, dass ihre Normale mit der idealen übereinstimmt. Je Dreieck geometrisch zu
  // entscheiden (gegen die ungewölbte Bahn oder ein Zentrum) kippte an diesen Splittern die Hälfte: beide Dreiecke eines
  // Vierecks fielen unter verschiedene Regeln, am Drachen zeigten Rand- und Bodenband weiße Streifen (Fächer am
  // Mundwinkel, Fransen am Brustrand)
  const PI = (ii: number, kk: number): Vec3 => {
    const gi = Math.max(0, Math.min(nR - 1, ii)) * (m + 1) + Math.max(0, Math.min(m, kk));
    return [ideal[gi * 3]!, ideal[gi * 3 + 1]!, ideal[gi * 3 + 2]!];
  };
  const nPaar = Math.max(0, nR - 1);
  const nStern = new Float64Array(nPaar * m * 3);
  const nOk = new Uint8Array(nPaar * m);
  for (let i = 0; i < nPaar; i++) {
    for (let k = 0; k < m; k++) {
      const p00 = PI(i, k), p10 = PI(i + 1, k), p11 = PI(i + 1, k + 1), p01 = PI(i, k + 1);
      const ei: Vec3 = [p10[0] + p11[0] - p00[0] - p01[0], p10[1] + p11[1] - p00[1] - p01[1], p10[2] + p11[2] - p00[2] - p01[2]];
      const ek: Vec3 = [p01[0] + p11[0] - p00[0] - p10[0], p01[1] + p11[1] - p00[1] - p10[1], p01[2] + p11[2] - p00[2] - p10[2]];
      const nx = ei[1] * ek[2] - ei[2] * ek[1], ny = ei[2] * ek[0] - ei[0] * ek[2], nz = ei[0] * ek[1] - ei[1] * ek[0];
      const nl = Math.hypot(nx, ny, nz);
      const li = Math.hypot(ei[0], ei[1], ei[2]), lk = Math.hypot(ek[0], ek[1], ek[2]);
      // entartet (Spitze, flache Winkelspalte): Richtung unbestimmt → von der nächsten gültigen Spalte erben
      if (nl < 1e-3 * li * lk || nl < 1e-12) continue;
      const cx = (p00[0] + p10[0] + p11[0] + p01[0]) / 4, cy = (p00[1] + p10[1] + p11[1] + p01[1]) / 4, cz = (p00[2] + p10[2] + p11[2] + p01[2]) / 4;
      const zx = 0.5 * (hoehlenZentrum[i * 3]! + hoehlenZentrum[(i + 1) * 3]!) - cx;
      const zy = 0.5 * (hoehlenZentrum[i * 3 + 1]! + hoehlenZentrum[(i + 1) * 3 + 1]!) - cy;
      const zz = 0.5 * (hoehlenZentrum[i * 3 + 2]! + hoehlenZentrum[(i + 1) * 3 + 2]!) - cz;
      const sg = nx * zx + ny * zy + nz * zz >= 0 ? 1 : -1;
      const q = (i * m + k) * 3;
      nStern[q] = (nx / nl) * sg;
      nStern[q + 1] = (ny / nl) * sg;
      nStern[q + 2] = (nz / nl) * sg;
      nOk[i * m + k] = 1;
    }
  }
  for (let i = 0; i < nPaar; i++) {
    for (let k = 0; k < m; k++) {
      if (nOk[i * m + k]) continue;
      for (let dlt = 1; dlt < nPaar; dlt++) {
        const j = nOk[(i - dlt) * m + k] && i - dlt >= 0 ? i - dlt : i + dlt < nPaar && nOk[(i + dlt) * m + k] ? i + dlt : -1;
        if (j < 0) continue;
        const q = (i * m + k) * 3, qj = (j * m + k) * 3;
        nStern[q] = nStern[qj]!;
        nStern[q + 1] = nStern[qj + 1]!;
        nStern[q + 2] = nStern[qj + 2]!;
        nOk[i * m + k] = 2;
        break;
      }
    }
  }
  const sternBei = (i: number, k: number): Vec3 | null => {
    const ii = Math.max(0, Math.min(nPaar - 1, i)), kk = Math.max(0, Math.min(m - 1, k));
    if (!nOk[ii * m + kk]) return null;
    const q = (ii * m + kk) * 3;
    return [nStern[q]!, nStern[q + 1]!, nStern[q + 2]!];
  };
  // Glatte Normalen des Taschengitters aus den idealen Gitterrichtungen, Vorzeichen zum Höhlenzentrum der Spalte
  const taschenNormalen = new Float32Array(pos.length);
  for (let i = 0; i < nR; i++) {
    for (let k = 1; k < m; k++) {
      const gi = i * (m + 1) + k;
      const v = grid[gi]!;
      if (v < tascheStart) continue;
      const di = sub(PI(i + 1, k), PI(i - 1, k)), dk = sub(PI(i, k + 1), PI(i, k - 1));
      let nx = di[1] * dk[2] - di[2] * dk[1], ny = di[2] * dk[0] - di[0] * dk[2], nz = di[0] * dk[1] - di[1] * dk[0];
      const nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-12) {
        // entartet: Normale des Nachbarvierecks
        const n = sternBei(i < nPaar ? i : i - 1, k < m ? k : k - 1);
        if (n) {
          taschenNormalen[v * 3] = n[0];
          taschenNormalen[v * 3 + 1] = n[1];
          taschenNormalen[v * 3 + 2] = n[2];
        }
        continue;
      }
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const zx = hoehlenZentrum[i * 3]! - pos[v * 3]!, zy = hoehlenZentrum[i * 3 + 1]! - pos[v * 3 + 1]!, zz = hoehlenZentrum[i * 3 + 2]! - pos[v * 3 + 2]!;
      const sg = nx * zx + ny * zy + nz * zz >= 0 ? 1 : -1;
      taschenNormalen[v * 3] = nx * sg;
      taschenNormalen[v * 3 + 1] = ny * sg;
      taschenNormalen[v * 3 + 2] = nz * sg;
    }
  }
  const newTris = tris;
  const windNormal = (x: number, y: number, z: number): Vec3 => {
    const e1 = [pos[y * 3]! - pos[x * 3]!, pos[y * 3 + 1]! - pos[x * 3 + 1]!, pos[y * 3 + 2]! - pos[x * 3 + 2]!];
    const e2 = [pos[z * 3]! - pos[x * 3]!, pos[z * 3 + 1]! - pos[x * 3 + 1]!, pos[z * 3 + 2]! - pos[x * 3 + 2]!];
    return [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!];
  };
  // Dreieck so wickeln, dass seine Normale mit der Bezugsnormalen übereinstimmt (ohne Bezug: Gitterreihenfolge)
  const triRef = (x: number, y: number, z: number, ref: Vec3 | null): void => {
    if (x === y || y === z || x === z) return;
    if (!ref) {
      newTris.push(x, y, z);
      return;
    }
    const n = windNormal(x, y, z);
    if (n[0] * ref[0] + n[1] * ref[1] + n[2] * ref[2] >= 0) newTris.push(x, y, z);
    else newTris.push(x, z, y);
  };
  for (let i = 0; i < nPaar; i++) {
    for (let k = 0; k < m; k++) {
      const a = i * (m + 1) + k, b = (i + 1) * (m + 1) + k, c = (i + 1) * (m + 1) + k + 1, d = i * (m + 1) + k + 1;
      const ref = sternBei(i, k);
      triRef(grid[a]!, grid[b]!, grid[c]!, ref);
      triRef(grid[a]!, grid[c]!, grid[d]!, ref);
    }
  }
  // Zwei Ränder: Reißverschluss zwischen der interpolierten Unterreihe (Zeile m) und den echten Unterrand-Vertices
  if (zweiRaender) {
    // jedes Dreieck in der Wicklung des Bodenbands darüber (ideale Normale der letzten Gitterzeile)
    let i = 0, j = 0;
    while (i < nR - 1 || j < randU.length - 1) {
      const phiI = i < nR - 1 ? randO[i + 1]!.phi : Infinity;
      const phiJ = j < randU.length - 1 ? randU[j + 1]!.phi : Infinity;
      const ref = sternBei(i, m - 1);
      if (phiI <= phiJ) {
        triRef(unten[i]!, unten[i + 1]!, randU[j]!.unten, ref);
        i++;
      } else {
        triRef(unten[i]!, randU[j + 1]!.unten, randU[j]!.unten, ref);
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
    const e = feld(v, mouth.lipHAt, mouth.lipRAt);
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
    interpEltern,
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
