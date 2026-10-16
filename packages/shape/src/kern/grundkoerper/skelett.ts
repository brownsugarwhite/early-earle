// Teil G, G4 neu (Florian 16.10.: „Man erkennt an den 3 Shapes genau, welche Wirbelsäulen gebraucht werden. Sobald ein
// Vektorshape aus einer Ansicht einen Bauch bekommt, muss die Wirbelsäule in diese Richtung automatisch entstehen!“):
// Mittelachse (Skelett) einer Silhouette. Raster (Zellmitten), exakter Abstand zum Rand, Ausdünnen auf eine Linie
// (Zhang–Suen), Graph aus Enden und Abzweigen, kleine Äste weg (ein Ast zählt, wenn er weiter als `ANTEIL` seines
// Abzweig-Radius aus dem Kreis am Abzweig herausragt — eine echte Ausbuchtung, kein Randrauschen). Danach der Baum: die
// Rumpfachse läuft durch die dickste Stelle und an jedem Abzweig in den dickeren Weg weiter; alles andere sind Äste,
// rekursiv (jeder Ast wählt seinen eigenen Weg ebenso). DOM-frei.
import type { V2 } from '../../bezier';
import { type Raster, rastern } from './teile';

/** Ein Weg im Skelett: Punkte (Welt) und Radius (Abstand zum Rand) je Punkt. */
export type SkelettWeg = { punkte: V2[]; radius: number[] };

/** Ast des Baums: Weg ab dem Abzweig (erster Punkt = Abzweig auf dem Eltern-Weg), Eltern-Ast (−1 = Rumpf) und Stelle dort. */
export type SkelettAst = SkelettWeg & { eltern: number; abzweig: number; ueberstand: number };

export type Skelett = {
  raster: Raster;
  /** Abstand je Zelle zum Rand (Welt) */
  abstand: Float64Array;
  /** Zellen des ausgedünnten, beschnittenen Skeletts */
  zellen: Uint8Array;
  /** Ast 0 = Rumpfachse (eltern −1), dann die Äste */
  aeste: SkelettAst[];
};

/** Ein Ast zählt, wenn er weiter als dieser Anteil des Abzweig-Radius aus dem Kreis am Abzweig herausragt. */
const ANTEIL = 0.45;
/** … und mindestens so viele Zellen (Rauschen an glatten Rändern) */
const MIN_ZELLEN = 4;

/** Exakter euklidischer Abstand (in Zellen) jeder Innenzelle zur nächsten Außenzelle (Felzenszwalb, zwei Durchgänge). */
function abstandZumRand(R: Raster): Float64Array {
  const { W, H } = R;
  const INF = 1e20;
  const d = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = R.innen[i] ? INF : 0;
  const eins = (f: Float64Array, n: number): Float64Array => {
    const out = new Float64Array(n);
    const v = new Int32Array(n);
    const z = new Float64Array(n + 1);
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      while (s <= z[k]!) {
        k--;
        s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1]! < q) k++;
      out[q] = (q - v[k]!) * (q - v[k]!) + f[v[k]!]!;
    }
    return out;
  };
  const spalte = new Float64Array(H);
  for (let c = 0; c < W; c++) {
    for (let r = 0; r < H; r++) spalte[r] = d[r * W + c]!;
    const o = eins(spalte, H);
    for (let r = 0; r < H; r++) d[r * W + c] = o[r]!;
  }
  const zeile = new Float64Array(W);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) zeile[c] = d[r * W + c]!;
    const o = eins(zeile, W);
    for (let c = 0; c < W; c++) d[r * W + c] = Math.sqrt(o[c]!);
  }
  return d;
}

/** Zhang–Suen-Ausdünnung (8er-Nachbarschaft): eine Zelle breite Mittellinie, Zusammenhang bleibt. */
function ausduennen(R: Raster): Uint8Array {
  const { W, H } = R;
  const a = new Uint8Array(R.innen);
  const P = (r: number, c: number) => (r >= 0 && c >= 0 && r < H && c < W ? a[r * W + c]! : 0);
  let geaendert = true;
  const weg: number[] = [];
  while (geaendert) {
    geaendert = false;
    for (let schritt = 0; schritt < 2; schritt++) {
      weg.length = 0;
      for (let r = 0; r < H; r++)
        for (let c = 0; c < W; c++) {
          if (!a[r * W + c]) continue;
          // Nachbarn p2 … p9 im Uhrzeigersinn ab oben
          const p = [P(r - 1, c), P(r - 1, c + 1), P(r, c + 1), P(r + 1, c + 1), P(r + 1, c), P(r + 1, c - 1), P(r, c - 1), P(r - 1, c - 1)];
          let b = 0;
          for (const x of p) b += x;
          if (b < 2 || b > 6) continue;
          let wechsel = 0;
          for (let k = 0; k < 8; k++) if (p[k] === 0 && p[(k + 1) % 8] === 1) wechsel++;
          if (wechsel !== 1) continue;
          if (schritt === 0 ? p[0]! * p[2]! * p[4]! !== 0 || p[2]! * p[4]! * p[6]! !== 0 : p[0]! * p[2]! * p[6]! !== 0 || p[0]! * p[4]! * p[6]! !== 0) continue;
          weg.push(r * W + c);
        }
      if (weg.length) geaendert = true;
      for (const i of weg) a[i] = 0;
    }
  }
  return a;
}

type Graph = { nachbarn: (i: number) => number[]; uebergaenge: (i: number) => number };

function graphVon(R: Raster, z: Uint8Array): Graph {
  const { W, H } = R;
  const P = (r: number, c: number) => (r >= 0 && c >= 0 && r < H && c < W ? z[r * W + c]! : 0);
  return {
    /** Kreuzungszahl: Wechsel 0 → 1 im Kreis der 8 Nachbarn (1 = Ende, 2 = Weg, ≥ 3 = Abzweig) — robuster als die Nachbarzahl an Treppen */
    uebergaenge: (i: number) => {
      const r = Math.floor(i / W);
      const c = i - r * W;
      const p = [P(r - 1, c), P(r - 1, c + 1), P(r, c + 1), P(r + 1, c + 1), P(r + 1, c), P(r + 1, c - 1), P(r, c - 1), P(r - 1, c - 1)];
      let w = 0;
      for (let k = 0; k < 8; k++) if (p[k] === 0 && p[(k + 1) % 8] === 1) w++;
      return w;
    },
    nachbarn: (i: number) => {
      const r = Math.floor(i / W);
      const c = i - r * W;
      const out: number[] = [];
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && cc >= 0 && rr < H && cc < W && z[rr * W + cc]) out.push(rr * W + cc);
        }
      return out;
    },
  };
}

/** Zellmitte (Welt). */
function welt(R: Raster, i: number): V2 {
  const r = Math.floor(i / R.W);
  return { x: R.ox + (i - r * R.W + 0.5) * R.h, y: R.oy + (r + 0.5) * R.h };
}

/**
 * Enden-Äste wiederholt beschneiden: ein Weg vom Ende bis zum nächsten Abzweig fällt weg, wenn er weniger als
 * ANTEIL · Radius(Abzweig) (und mindestens MIN_ZELLEN) aus dem Kreis am Abzweig herausragt.
 */
function beschneiden(R: Raster, z: Uint8Array, d: Float64Array): void {
  const g = graphVon(R, z);
  for (let runde = 0; runde < 50; runde++) {
    let weg = 0;
    const enden: number[] = [];
    for (let i = 0; i < z.length; i++) if (z[i] && g.nachbarn(i).length === 1) enden.push(i);
    for (const e of enden) {
      if (g.uebergaenge(e) !== 1) continue;
      if (!z[e]) continue;
      // vom Ende bis zum Abzweig (≥ 3 Nachbarn) laufen
      const pfad = [e];
      let vor = -1;
      let jetzt = e;
      let abzweig = -1;
      for (let schritt = 0; schritt < z.length; schritt++) {
        const nb = g.nachbarn(jetzt).filter((q) => q !== vor && !pfad.includes(q));
        if (g.uebergaenge(jetzt) >= 3 && jetzt !== e) {
          abzweig = jetzt;
          break;
        }
        if (!nb.length) break;
        vor = jetzt;
        jetzt = nb[0]!;
        pfad.push(jetzt);
      }
      if (abzweig < 0) continue; // ein einzelner Weg ohne Abzweig bleibt
      const a = welt(R, abzweig);
      const p = welt(R, e);
      const ueber = Math.hypot(p.x - a.x, p.y - a.y) / R.h + d[e]! - d[abzweig]!;
      if (ueber < Math.max(MIN_ZELLEN, ANTEIL * d[abzweig]!)) {
        for (const q of pfad) if (q !== abzweig) z[q] = 0;
        weg++;
      }
    }
    if (!weg) break;
  }
}

/**
 * Skelett-Graph: Abzweigzellen (Kreuzungszahl ≥ 3) bilden Knoten (benachbarte zu einem Knoten zusammengefasst), die
 * übrigen Zellen zerfallen in Linienstücke (Kanten), je als geordnete Kette. Wege werden auf dem Graphen gesucht, nicht
 * Zelle für Zelle — an Treppen im Raster brach das Ablaufen sonst ab.
 */
type Kante = { zellen: number[]; a: number; b: number };
type SkelettGraph = { knotenZellen: number[][]; kanten: Kante[]; knotenKanten: number[][] };

function skelettGraph(z: Uint8Array, g: Graph): SkelettGraph {
  const n = z.length;
  const knotenVon = new Int32Array(n).fill(-1);
  const knotenZellen: number[][] = [];
  const knotenKanten: number[][] = [];
  // Abzweige zu Knoten zusammenfassen
  for (let i = 0; i < n; i++) {
    if (!z[i] || knotenVon[i]! >= 0 || g.uebergaenge(i) < 3) continue;
    const k = knotenZellen.length;
    const liste = [i];
    knotenVon[i] = k;
    for (let t = 0; t < liste.length; t++)
      for (const q of g.nachbarn(liste[t]!))
        if (knotenVon[q]! < 0 && g.uebergaenge(q) >= 3) {
          knotenVon[q] = k;
          liste.push(q);
        }
    knotenZellen.push(liste);
    knotenKanten.push([]);
  }
  const kanten: Kante[] = [];
  const inKante = new Uint8Array(n);
  const neuerKnoten = (zelle: number) => {
    const k = knotenZellen.length;
    knotenZellen.push([zelle]);
    knotenKanten.push([]);
    return k;
  };
  for (let i = 0; i < n; i++) {
    if (!z[i] || inKante[i] || knotenVon[i]! >= 0) continue;
    // Komponente der Nicht-Knoten-Zellen
    const komp = [i];
    inKante[i] = 1;
    for (let t = 0; t < komp.length; t++)
      for (const q of g.nachbarn(komp[t]!))
        if (!inKante[q] && knotenVon[q]! < 0) {
          inKante[q] = 1;
          komp.push(q);
        }
    const inKomp = new Set(komp);
    // längster Weg in der Komponente (zweimal Breitensuche): die Kette
    const bfs = (von: number) => {
      const dist = new Map<number, number>([[von, 0]]);
      const vor = new Map<number, number>();
      const schlange = [von];
      for (let t = 0; t < schlange.length; t++) {
        const q = schlange[t]!;
        for (const x of g.nachbarn(q))
          if (inKomp.has(x) && !dist.has(x)) {
            dist.set(x, dist.get(q)! + 1);
            vor.set(x, q);
            schlange.push(x);
          }
      }
      let fern = von;
      for (const q of komp) if (dist.get(q)! > dist.get(fern)!) fern = q;
      return { fern, vor };
    };
    const a0 = bfs(komp[0]!).fern;
    const { fern, vor } = bfs(a0);
    const kette: number[] = [];
    for (let q: number | undefined = fern; q !== undefined; q = vor.get(q)) kette.push(q);
    kette.reverse();
    // Knoten an den Enden (angrenzende Abzweige), sonst ein eigener End-Knoten
    const knotenAn = (zelle: number) => {
      for (const q of g.nachbarn(zelle)) if (knotenVon[q]! >= 0) return knotenVon[q]!;
      return -1;
    };
    let a = knotenAn(kette[0]!);
    let b = knotenAn(kette[kette.length - 1]!);
    if (a < 0) a = neuerKnoten(kette[0]!);
    if (b < 0) b = kette.length > 1 ? neuerKnoten(kette[kette.length - 1]!) : a;
    const e = kanten.length;
    kanten.push({ zellen: kette, a, b });
    knotenKanten[a]!.push(e);
    if (b !== a) knotenKanten[b]!.push(e);
  }
  return { knotenZellen, kanten, knotenKanten };
}

/** Zellen einer Kante ab dem Knoten `von` (umgedreht, wenn sie dort endet). */
function kanteAb(k: Kante, von: number): number[] {
  return k.a === von ? k.zellen : k.zellen.slice().reverse();
}

/** Mittlerer Radius der ersten `weit` Zellen einer Kante ab dem Knoten `von` (Vorschau an einem Abzweig). */
function vorschauRadius(k: Kante, von: number, d: Float64Array, weit: number): number {
  const z = kanteAb(k, von);
  let s = 0;
  let m = 0;
  for (let t = 0; t < Math.min(z.length, weit); t++) {
    s += d[z[t]!]!;
    m++;
  }
  return m ? s / m : 0;
}

/** Am Knoten in die dickere freie Kante (Vorschau über einen Abzweig-Radius); −1, wenn keine frei ist. */
function dickereKante(G: SkelettGraph, d: Float64Array, knoten: number, benutzt: Uint8Array): number {
  const frei = G.knotenKanten[knoten]!.filter((x) => !benutzt[x]);
  if (!frei.length) return -1;
  let rKnoten = 0;
  for (const c of G.knotenZellen[knoten]!) rKnoten = Math.max(rKnoten, d[c]!);
  const weit = Math.max(6, Math.round(rKnoten));
  let best = frei[0]!;
  for (const x of frei) if (vorschauRadius(G.kanten[x]!, knoten, d, weit) > vorschauRadius(G.kanten[best]!, knoten, d, weit)) best = x;
  return best;
}

/** Weg ab dem Knoten `von` über die Kante `e`, an jedem weiteren Knoten in die dickere Fortsetzung. */
function wegAufGraph(G: SkelettGraph, d: Float64Array, von: number, e: number, benutzt: Uint8Array): number[] {
  const out: number[] = [];
  let knoten = von;
  let kante = e;
  for (;;) {
    benutzt[kante] = 1;
    const k = G.kanten[kante]!;
    out.push(...kanteAb(k, knoten));
    const weiter = k.a === knoten ? k.b : k.a;
    if (weiter === knoten) break;
    const naechste = dickereKante(G, d, weiter, benutzt);
    if (naechste < 0) break;
    out.push(...G.knotenZellen[weiter]!);
    knoten = weiter;
    kante = naechste;
  }
  return out;
}

/**
 * Skelett einer geschlossenen Silhouette (Welt). `zellen` = Rasterauflösung über die größere Ausdehnung; `spiegel` für
 * Front (Achse x = 0) und Top (Achse y = 0). Liefert die Rumpfachse (durch die dickste Stelle, an Abzweigen in die
 * dickere Fortsetzung) und die Äste mit Abzweig und Überstand (wie weit der Ast aus dem Kreis am Abzweig herausragt, Welt).
 */
export function skelett(poly: readonly V2[], zellen = 240, spiegel?: 'x' | 'y'): Skelett {
  const R = rastern(poly, zellen);
  const dz = abstandZumRand(R);
  const z = ausduennen(R);
  beschneiden(R, z, dz);
  const g = graphVon(R, z);
  const abstand = new Float64Array(dz.length);
  for (let i = 0; i < dz.length; i++) abstand[i] = dz[i]! * R.h;
  const weg = (pfad: number[]): SkelettWeg => ({ punkte: pfad.map((i) => welt(R, i)), radius: pfad.map((i) => abstand[i]!) });
  if (spiegel) return skelettGespiegelt(R, z, dz, abstand, g, spiegel, weg);
  const G = skelettGraph(z, g);
  const aeste: SkelettAst[] = [];
  if (!G.kanten.length) {
    // ganz ausgedünnt (Kreis) oder nur ein Abzweig-Klumpen: die tiefste Zelle ist die Achse
    let mitte = -1;
    for (let i = 0; i < dz.length; i++) if (mitte < 0 || dz[i]! > dz[mitte]!) mitte = i;
    if (mitte >= 0) aeste.push({ ...weg([mitte]), eltern: -1, abzweig: 0, ueberstand: 0 });
    return { raster: R, abstand, zellen: z, aeste };
  }
  // Rumpf: die Kante mit der dicksten Zelle, von dort zu beiden Enden und über die Knoten weiter
  let eMitte = 0;
  let tMitte = 0;
  let rMax = -1;
  G.kanten.forEach((k, e) =>
    k.zellen.forEach((c, t) => {
      if (dz[c]! > rMax) {
        rMax = dz[c]!;
        eMitte = e;
        tMitte = t;
      }
    }),
  );
  const benutzt = new Uint8Array(G.kanten.length);
  const km = G.kanten[eMitte]!;
  benutzt[eMitte] = 1;
  const fortsetzen = (knoten: number): number[] => {
    const e = dickereKante(G, dz, knoten, benutzt);
    return e < 0 ? [] : [...G.knotenZellen[knoten]!, ...wegAufGraph(G, dz, knoten, e, benutzt)];
  };
  const vorwaerts = [...km.zellen.slice(tMitte), ...(km.b !== km.a ? fortsetzen(km.b) : [])];
  const rueckwaerts = [...km.zellen.slice(0, tMitte + 1).reverse(), ...fortsetzen(km.a)];
  const rumpf = [...rueckwaerts.slice().reverse(), ...vorwaerts.slice(1)];
  aeste.push({ ...weg(rumpf), eltern: -1, abzweig: 0, ueberstand: 0 });
  // Äste: an jedem Knoten auf einem Weg beginnen die unbenutzten Kanten einen Ast (rekursiv)
  const pfade: number[][] = [rumpf];
  for (let a = 0; a < pfade.length; a++) {
    const pfad = pfade[a]!;
    const lage = new Map<number, number>();
    pfad.forEach((c, t) => lage.set(c, t));
    for (let kn = 0; kn < G.knotenZellen.length; kn++) {
      const t = G.knotenZellen[kn]!.map((c) => lage.get(c)).find((x) => x !== undefined);
      if (t === undefined) continue;
      for (const e of G.knotenKanten[kn]!) {
        if (benutzt[e]) continue;
        const ast = [pfad[t]!, ...wegAufGraph(G, dz, kn, e, benutzt)];
        const p0 = welt(R, pfad[t]!);
        let ueber = 0;
        for (const c of ast) {
          const p = welt(R, c);
          ueber = Math.max(ueber, Math.hypot(p.x - p0.x, p.y - p0.y) + abstand[c]! - abstand[pfad[t]!]!);
        }
        if (ast.length - 1 < MIN_ZELLEN || ueber < Math.max(MIN_ZELLEN * R.h, ANTEIL * abstand[pfad[t]!]!)) continue;
        pfade.push(ast);
        aeste.push({ ...weg(ast), eltern: a, abzweig: t, ueberstand: ueber });
      }
    }
  }
  return { raster: R, abstand, zellen: z, aeste };
}

/**
 * Spiegelgleiche Ansicht (Front: Achse x = 0, Top: Achse y = 0): Der Rumpf liegt in der Mittelebene, seine Achse ist die
 * Spiegelachse — von der vordersten bis zur hintersten Innenzelle auf der Achse. Äste sind die Skelettwege auf der
 * positiven Seite, die von der Achse weg nach außen laufen (gespiegelte Paare entstehen beim Bau), mit Abzweig an der
 * nächsten Achsstelle; kurze Wege (Überstand unter ANTEIL · Radius am Abzweig) fallen weg.
 */
function skelettGespiegelt(R: Raster, z: Uint8Array, dz: Float64Array, abstand: Float64Array, g: Graph, spiegel: 'x' | 'y', weg: (p: number[]) => SkelettWeg): Skelett {
  const { W, H } = R;
  const achse: number[] = [];
  // Achszellen: die Zellreihe, die der Achse am nächsten liegt
  if (spiegel === 'x') {
    const c = Math.max(0, Math.min(W - 1, Math.floor((0 - R.ox) / R.h)));
    for (let r = 0; r < H; r++) if (R.innen[r * W + c]) achse.push(r * W + c);
    achse.sort((a, b) => b - a); // oben → unten (Zeilen absteigend = y absteigend)
  } else {
    const r = Math.max(0, Math.min(H - 1, Math.floor((0 - R.oy) / R.h)));
    for (let c = 0; c < W; c++) if (R.innen[r * W + c]) achse.push(r * W + c);
  }
  const aeste: SkelettAst[] = [];
  if (!achse.length) return { raster: R, abstand, zellen: z, aeste };
  aeste.push({ ...weg(achse), eltern: -1, abzweig: 0, ueberstand: 0 });
  const ap = achse.map((i) => welt(R, i));
  const seitlich = (i: number) => {
    const p = welt(R, i);
    return spiegel === 'x' ? p.x : p.y;
  };
  // Skelettzellen auf der positiven Seite (deutlich neben der Achse), in Komponenten
  const gesehen = new Uint8Array(z.length);
  for (let i = 0; i < z.length; i++) {
    if (!z[i] || gesehen[i] || seitlich(i) <= 1.5 * R.h) continue;
    const komp: number[] = [];
    const stapel = [i];
    gesehen[i] = 1;
    while (stapel.length) {
      const q = stapel.pop()!;
      komp.push(q);
      for (const n of g.nachbarn(q)) if (!gesehen[n] && seitlich(n) > 1.5 * R.h) {
        gesehen[n] = 1;
        stapel.push(n);
      }
    }
    // Weg: von der achsnächsten Zelle der Komponente zur achsfernsten (Abstand im Inneren über die Komponente)
    let start = komp[0]!;
    for (const q of komp) if (seitlich(q) < seitlich(start)) start = q;
    const dist = new Map<number, number>([[start, 0]]);
    const vor = new Map<number, number>();
    const schlange = [start];
    for (let k = 0; k < schlange.length; k++) {
      const q = schlange[k]!;
      for (const n of g.nachbarn(q)) {
        if (!komp.includes(n) || dist.has(n)) continue;
        dist.set(n, dist.get(q)! + 1);
        vor.set(n, q);
        schlange.push(n);
      }
    }
    let ende = start;
    for (const q of komp) if ((dist.get(q) ?? -1) > (dist.get(ende) ?? -1)) ende = q;
    const pfad: number[] = [];
    for (let q: number | undefined = ende; q !== undefined; q = vor.get(q)) pfad.push(q);
    pfad.reverse();
    // Abzweig: nächste Achszelle zum Wegbeginn
    const p0 = welt(R, pfad[0]!);
    let k = 0;
    for (let t = 1; t < ap.length; t++) if (Math.hypot(ap[t]!.x - p0.x, ap[t]!.y - p0.y) < Math.hypot(ap[k]!.x - p0.x, ap[k]!.y - p0.y)) k = t;
    const pa = ap[k]!;
    let ueber = 0;
    for (const q of pfad) {
      const p = welt(R, q);
      ueber = Math.max(ueber, Math.hypot(p.x - pa.x, p.y - pa.y) + abstand[q]! - abstand[achse[k]!]!);
    }
    if (pfad.length < MIN_ZELLEN || ueber < Math.max(MIN_ZELLEN * R.h, ANTEIL * abstand[achse[k]!]!)) continue;
    const w = weg([achse[k]!, ...pfad]);
    aeste.push({ ...w, eltern: 0, abzweig: k, ueberstand: ueber });
  }
  void dz;
  return { raster: R, abstand, zellen: z, aeste };
}
