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

/**
 * Nachbarmaske einer Zelle: Bit k = Nachbar p(k+2) im Uhrzeigersinn ab oben (oben, oben rechts, rechts, unten rechts,
 * unten, unten links, links, oben links). Zellen außerhalb des Rasters zählen leer.
 */
function maske(a: Uint8Array, W: number, H: number, i: number): number {
  const r = Math.floor(i / W);
  const c = i - r * W;
  const P = (rr: number, cc: number) => (rr >= 0 && cc >= 0 && rr < H && cc < W ? a[rr * W + cc]! : 0);
  return P(r - 1, c) | (P(r - 1, c + 1) << 1) | (P(r, c + 1) << 2) | (P(r + 1, c + 1) << 3) | (P(r + 1, c) << 4) | (P(r + 1, c - 1) << 5) | (P(r, c - 1) << 6) | (P(r - 1, c - 1) << 7);
}

/**
 * Zhang–Suen je Maske, vorab für alle 256 Nachbarschaften: Bit 0 = im ersten Teilschritt entfernbar, Bit 1 = im zweiten
 * (2 ≤ Nachbarn ≤ 6, genau ein Wechsel 0 → 1 im Kreis, Produktbedingungen des Teilschritts).
 */
function zsTafel(bMin: number): Uint8Array {
  const t = new Uint8Array(256);
  for (let m = 0; m < 256; m++) {
    const p = (k: number) => (m >> k) & 1;
    let b = 0;
    for (let k = 0; k < 8; k++) b += p(k);
    if (b < bMin || b > 6) continue;
    let wechsel = 0;
    for (let k = 0; k < 8; k++) if (p(k) === 0 && p((k + 1) % 8) === 1) wechsel++;
    if (wechsel !== 1) continue;
    if (p(0) * p(2) * p(4) === 0 && p(2) * p(4) * p(6) === 0) t[m]! |= 1;
    if (p(0) * p(2) * p(6) === 0 && p(0) * p(4) * p(6) === 0) t[m]! |= 2;
  }
  return t;
}
const ZS = zsTafel(2);
/**
 * Lü–Wang (1986): wie Zhang–Suen, aber erst ab drei Nachbarn entfernbar. Zhang–Suen löscht schräge, zwei Zellen breite
 * Linien ganz — der Flügelhaken der Ente verschwand dadurch bei manchen Zügen aus dem Top-Skelett (S4).
 */
const LW = zsTafel(3);
export type Ausduennung = 'zhang-suen' | 'lue-wang';

/**
 * Zhang–Suen-Ausdünnung (8er-Nachbarschaft): eine Zelle breite Mittellinie, Zusammenhang bleibt. Geprüft werden nur
 * Randzellen (mit leerem 4er-Nachbarn) — nur sie erfüllen die Produktbedingungen; Teilschritte entfernen wie bisher alle
 * Zellen gleichzeitig nach dem Stand zu Beginn (bitgleich zur vollen Abtastung, S4: 5–10-mal schneller).
 */
function ausduennen(R: Raster, art: Ausduennung = 'zhang-suen'): Uint8Array {
  const tafel = art === 'lue-wang' ? LW : ZS;
  const { W, H } = R;
  const a = new Uint8Array(R.innen);
  const n = W * H;
  const leer4 = (i: number) => {
    const r = Math.floor(i / W);
    const c = i - r * W;
    return r === 0 || c === 0 || r === H - 1 || c === W - 1 || !a[i - W] || !a[i + W] || !a[i - 1] || !a[i + 1];
  };
  const imRand = new Uint8Array(n);
  let rand: number[] = [];
  for (let i = 0; i < n; i++)
    if (a[i] && leer4(i)) {
      imRand[i] = 1;
      rand.push(i);
    }
  const weg: number[] = [];
  let geaendert = true;
  while (geaendert) {
    geaendert = false;
    for (let schritt = 0; schritt < 2; schritt++) {
      weg.length = 0;
      for (const i of rand) if (a[i] && tafel[maske(a, W, H, i)]! & (1 << schritt)) weg.push(i);
      if (!weg.length) continue;
      geaendert = true;
      for (const i of weg) a[i] = 0;
      // neue Randzellen: volle 4er-Nachbarn der entfernten; die alten bleiben Rand
      const neu: number[] = [];
      for (const i of rand) if (a[i]) neu.push(i);
      else imRand[i] = 0;
      for (const i of weg) {
        const r = Math.floor(i / W);
        const c = i - r * W;
        for (const j of [r > 0 ? i - W : -1, r < H - 1 ? i + W : -1, c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1])
          if (j >= 0 && a[j] && !imRand[j]) {
            imRand[j] = 1;
            neu.push(j);
          }
      }
      // Reihenfolge wie die volle Abtastung (zeilenweise): die Teilschritte sind ordnungsfrei, die Liste nur der Ordnung halber
      neu.sort((p, q) => p - q);
      rand = neu;
    }
  }
  return a;
}

/** Bleibt der Kreis der Nachbarn (Maske) ohne die Mitte zusammenhängend (8er-Nachbarschaft im 3 × 3-Ring), bei ≥ 2 Nachbarn? */
const EINFACH = (() => {
  const t = new Uint8Array(256);
  // Nachbarschaft im Ring: aufeinanderfolgende, dazu die Kantenmitten zwei weiter (oben–rechts usw.)
  const nb = (k: number, l: number) => (k - l + 8) % 8 === 1 || (l - k + 8) % 8 === 1 || (k % 2 === 0 && l % 2 === 0 && ((k - l + 8) % 8 === 2 || (l - k + 8) % 8 === 2));
  for (let m = 0; m < 256; m++) {
    const an: number[] = [];
    for (let k = 0; k < 8; k++) if ((m >> k) & 1) an.push(k);
    if (an.length < 2) continue;
    const gesehen = new Set([an[0]!]);
    const stapel = [an[0]!];
    while (stapel.length) {
      const k = stapel.pop()!;
      for (const l of an) if (!gesehen.has(l) && nb(k, l)) {
        gesehen.add(l);
        stapel.push(l);
      }
    }
    if (gesehen.size === an.length) t[m] = 1;
  }
  return t;
})();

type Graph = { nachbarn: (i: number) => number[]; uebergaenge: (i: number) => number; raster: { W: number; H: number } };

function graphVon(R: Raster, z: Uint8Array): Graph {
  const { W, H } = R;
  const P = (r: number, c: number) => (r >= 0 && c >= 0 && r < H && c < W ? z[r * W + c]! : 0);
  return {
    raster: { W, H },
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
function beschneiden(R: Raster, z: Uint8Array, d: Float64Array, anteil = ANTEIL): void {
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
      if (ueber < Math.max(MIN_ZELLEN, anteil * d[abzweig]!)) {
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
  // Überzählige Zellen weg (einfache Punkte): eine Zelle, deren Nachbarn auch ohne sie zusammenhängen (8er-Nachbarschaft
  // innerhalb des 3 × 3-Rings), trägt nichts zum Zusammenhang bei; Enden (ein Nachbar) bleiben. Danach ist das Skelett
  // überall eine Zelle breit: Wegzellen haben zwei Nachbarn, Enden einen, Abzweige drei und mehr. Das Ausdünnen ließ
  // stellenweise zwei Zellen breite Schrägen, deren Zellen drei Nachbarn hatten und wie Abzweige aussahen. (Probe je
  // Maske über die Tafel `EINFACH`, der Reihe nach wie bisher.)
  const { W: RW, H: RH } = g.raster;
  for (let geaendert = true; geaendert; ) {
    geaendert = false;
    for (let i = 0; i < n; i++) {
      if (!z[i]) continue;
      if (EINFACH[maske(z, RW, RH, i)]) {
        z[i] = 0;
        geaendert = true;
      }
    }
  }
  const knotenVon = new Int32Array(n).fill(-1);
  const knotenZellen: number[][] = [];
  const knotenKanten: number[][] = [];
  // Knoten: Enden (1 Nachbar) und Abzweige (≥ 3), benachbarte Abzweige zusammengefasst
  for (let i = 0; i < n; i++) {
    if (!z[i] || knotenVon[i]! >= 0) continue;
    const grad = g.nachbarn(i).length;
    if (grad === 2) continue;
    const k = knotenZellen.length;
    const liste = [i];
    knotenVon[i] = k;
    if (grad >= 3)
      for (let t = 0; t < liste.length; t++)
        for (const q of g.nachbarn(liste[t]!))
          if (knotenVon[q]! < 0 && g.nachbarn(q).length >= 3) {
            knotenVon[q] = k;
            liste.push(q);
          }
    knotenZellen.push(liste);
    knotenKanten.push([]);
  }
  const kanten: Kante[] = [];
  const inKante = new Uint8Array(n);
  // Kanten: von jedem Knoten über jede angrenzende Wegzelle bis zum nächsten Knoten verfolgen
  for (let k = 0; k < knotenZellen.length; k++) {
    for (const c0 of knotenZellen[k]!) {
      for (const start of g.nachbarn(c0)) {
        if (knotenVon[start]! === k) continue;
        if (knotenVon[start]! >= 0) {
          // zwei Knoten direkt benachbart: Kante ohne eigene Zellen (einmal)
          const b = knotenVon[start]!;
          if (b > k && !kanten.some((e) => (e.a === k && e.b === b) || (e.a === b && e.b === k))) {
            kanten.push({ zellen: [], a: k, b });
            knotenKanten[k]!.push(kanten.length - 1);
            knotenKanten[b]!.push(kanten.length - 1);
          }
          continue;
        }
        if (inKante[start]) continue;
        const kette = [start];
        inKante[start] = 1;
        let vor = c0;
        let jetzt = start;
        let ende = -1;
        for (;;) {
          const weiter = g.nachbarn(jetzt).filter((q) => q !== vor && !kette.includes(q) && !(knotenVon[q]! === k && kette.length === 1 && q === c0));
          const zuKnoten = weiter.find((q) => knotenVon[q]! >= 0 && !(knotenVon[q] === k && kette.length < 2));
          if (zuKnoten !== undefined) {
            ende = knotenVon[zuKnoten]!;
            break;
          }
          const frei = weiter.filter((q) => !inKante[q] && knotenVon[q]! < 0);
          if (!frei.length) break;
          vor = jetzt;
          jetzt = frei[0]!;
          inKante[jetzt] = 1;
          kette.push(jetzt);
        }
        if (ende < 0) ende = k; // Schleife zurück (sollte bei Silhouetten ohne Loch nicht vorkommen)
        const e = kanten.length;
        kanten.push({ zellen: kette, a: k, b: ende });
        knotenKanten[k]!.push(e);
        if (ende !== k) knotenKanten[ende]!.push(e);
      }
    }
  }
  // einzelne Linie ohne Knoten (kann nach dem Ausdünnen vorkommen, wenn alles eine Schleife wäre): nichts
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

/** Richtung (Rasterzellen) vom Anfang eines Zellzugs über `weit` Zellen. */
function zugRichtung(W: number, z: readonly number[], weit: number): [number, number] {
  const a = z[0]!;
  const b = z[Math.min(z.length - 1, weit)]!;
  const ra = Math.floor(a / W);
  const rb = Math.floor(b / W);
  return [b - rb * W - (a - ra * W), rb - ra];
}

/**
 * Am Knoten die Fortsetzung wählen: dicker (mittlerer Radius über einen Abzweig-Radius) und gerader (Fisch: in den
 * Schwanz, nicht in die Rückenflosse, deren Ansatz auch breit ist). Bewertung = Radius · (1 + cos Knick) / 2; ohne
 * Ankunftsrichtung nur der Radius. −1, wenn keine Kante frei ist.
 */
function dickereKante(G: SkelettGraph, d: Float64Array, knoten: number, benutzt: Uint8Array, W = 0, ankunft?: [number, number]): number {
  const frei = G.knotenKanten[knoten]!.filter((x) => !benutzt[x]);
  if (!frei.length) return -1;
  let rKnoten = 0;
  for (const c of G.knotenZellen[knoten]!) rKnoten = Math.max(rKnoten, d[c]!);
  const weit = Math.max(6, Math.round(rKnoten));
  const wert = (x: number) => {
    const r = vorschauRadius(G.kanten[x]!, knoten, d, weit);
    if (!ankunft || !W) return r;
    const [ax, ay] = ankunft;
    const [bx, by] = zugRichtung(W, kanteAb(G.kanten[x]!, knoten), weit);
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    const cos = la > 0 && lb > 0 ? (ax * bx + ay * by) / (la * lb) : 0;
    return (r * (1 + cos)) / 2;
  };
  let best = frei[0]!;
  for (const x of frei) if (wert(x) > wert(best)) best = x;
  return best;
}

/** Weg ab dem Knoten `von` über die Kante `e`, an jedem weiteren Knoten in die dickere, gerade Fortsetzung. */
function wegAufGraph(G: SkelettGraph, d: Float64Array, von: number, e: number, benutzt: Uint8Array, W = 0): number[] {
  const out: number[] = [];
  let knoten = von;
  let kante = e;
  for (;;) {
    benutzt[kante] = 1;
    const k = G.kanten[kante]!;
    const z = kanteAb(k, knoten);
    out.push(...z);
    const weiter = k.a === knoten ? k.b : k.a;
    if (weiter === knoten) break;
    // Ankunftsrichtung: die letzten Zellen bis zum Knoten (umgedreht gelesen)
    const ende = out.slice(-Math.max(6, Math.round(d[out[out.length - 1]!]!))).reverse();
    const [rx, ry] = W ? zugRichtung(W, ende, ende.length - 1) : [0, 0];
    const naechste = dickereKante(G, d, weiter, benutzt, W, W ? [-rx, -ry] : undefined);
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
 * `anteil` (S4): kleinere Werte behalten auch schwächere Äste als Kandidaten (die Teilerkennung entscheidet mit Hysterese);
 * `art`: Ausdünnung (S4 nimmt Lü–Wang, die Versuche bleiben bei Zhang–Suen).
 */
export function skelett(poly: readonly V2[], zellen = 240, spiegel?: 'x' | 'y', anteil = ANTEIL, art: Ausduennung = 'zhang-suen'): Skelett {
  const R = rastern(poly, zellen);
  const dz = abstandZumRand(R);
  const z = ausduennen(R, art);
  beschneiden(R, z, dz, anteil);
  const g = graphVon(R, z);
  const abstand = new Float64Array(dz.length);
  for (let i = 0; i < dz.length; i++) abstand[i] = dz[i]! * R.h;
  const weg = (pfad: number[]): SkelettWeg => ({ punkte: pfad.map((i) => welt(R, i)), radius: pfad.map((i) => abstand[i]!) });
  if (spiegel) return skelettGespiegelt(R, z, dz, abstand, g, spiegel, weg, anteil);
  const G = skelettGraph(z, g);
  const aeste: SkelettAst[] = [];
  if (!G.kanten.length) {
    // ganz ausgedünnt (Kreis) oder nur ein Abzweig-Klumpen: die tiefste Zelle ist die Achse
    let mitte = -1;
    for (let i = 0; i < dz.length; i++) if (mitte < 0 || dz[i]! > dz[mitte]!) mitte = i;
    if (mitte >= 0) aeste.push({ ...weg([mitte]), eltern: -1, abzweig: 0, ueberstand: 0 });
    return { raster: R, abstand, zellen: z, aeste };
  }
  // Rumpf: Start an der dicksten Stelle. Liegt sie an einem Abzweig (innerhalb seines Radius), beginnt der Rumpf am
  // Knoten mit dem geradesten, dicksten Kantenpaar (Fisch: Kopf–Schwanz statt Rückenflosse–Kopf, deren Ansatz im dicken
  // Körper liegt); sonst läuft er von der dicksten Zelle ihrer Kante in beide Richtungen.
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
  let kMax = -1;
  let rK = -1;
  G.knotenZellen.forEach((zs, k) => {
    if (G.knotenKanten[k]!.length < 3) return;
    for (const c of zs) if (dz[c]! > rK) {
      rK = dz[c]!;
      kMax = k;
    }
  });
  const W = R.W;
  const benutzt = new Uint8Array(G.kanten.length);
  // Ankunftsrichtung am Knoten: die letzten Zellen vor dem Knoten
  const fortsetzen = (knoten: number, zuletzt: number[]): number[] => {
    const ende = zuletzt.slice(-Math.max(6, Math.round(dz[zuletzt[zuletzt.length - 1]!]!))).reverse();
    const [rx, ry] = zugRichtung(W, ende, ende.length - 1);
    const e = dickereKante(G, dz, knoten, benutzt, W, [-rx, -ry]);
    return e < 0 ? [] : [...G.knotenZellen[knoten]!, ...wegAufGraph(G, dz, knoten, e, benutzt, W)];
  };
  const pMax = welt(R, G.kanten[eMitte]!.zellen[tMitte]!);
  const amKnoten = kMax >= 0 && G.knotenZellen[kMax]!.some((c) => {
    const q = welt(R, c);
    return Math.hypot(q.x - pMax.x, q.y - pMax.y) <= rMax * R.h;
  });
  let rumpf: number[];
  if (amKnoten) {
    // bestes Paar: (Radius a + Radius b) · (1 − cos Winkel) / 2 — gegenüberliegend und dick
    const ks = G.knotenKanten[kMax]!;
    let rKn = 0;
    for (const c of G.knotenZellen[kMax]!) rKn = Math.max(rKn, dz[c]!);
    const weit = Math.max(6, Math.round(rKn));
    let bestPaar: [number, number] = [ks[0]!, ks[1]!];
    let bestWert = -Infinity;
    for (let i = 0; i < ks.length; i++)
      for (let j = i + 1; j < ks.length; j++) {
        const [ax, ay] = zugRichtung(W, kanteAb(G.kanten[ks[i]!]!, kMax), weit);
        const [bx, by] = zugRichtung(W, kanteAb(G.kanten[ks[j]!]!, kMax), weit);
        const la = Math.hypot(ax, ay);
        const lb = Math.hypot(bx, by);
        const cos = la > 0 && lb > 0 ? (ax * bx + ay * by) / (la * lb) : 0;
        const wert = ((vorschauRadius(G.kanten[ks[i]!]!, kMax, dz, weit) + vorschauRadius(G.kanten[ks[j]!]!, kMax, dz, weit)) * (1 - cos)) / 2;
        if (wert > bestWert) {
          bestWert = wert;
          bestPaar = [ks[i]!, ks[j]!];
        }
      }
    const a = wegAufGraph(G, dz, kMax, bestPaar[0], benutzt, W);
    const b = wegAufGraph(G, dz, kMax, bestPaar[1], benutzt, W);
    rumpf = [...a.slice().reverse(), ...G.knotenZellen[kMax]!, ...b];
  } else {
    const km = G.kanten[eMitte]!;
    benutzt[eMitte] = 1;
    const vorwaerts = [...km.zellen.slice(tMitte), ...(km.b !== km.a ? fortsetzen(km.b, km.zellen) : [])];
    const rueckwaerts = [...km.zellen.slice(0, tMitte + 1).reverse(), ...fortsetzen(km.a, km.zellen.slice().reverse())];
    rumpf = [...rueckwaerts.slice().reverse(), ...vorwaerts.slice(1)];
  }
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
        const ast = [pfad[t]!, ...wegAufGraph(G, dz, kn, e, benutzt, W)];
        const p0 = welt(R, pfad[t]!);
        let ueber = 0;
        for (const c of ast) {
          const p = welt(R, c);
          ueber = Math.max(ueber, Math.hypot(p.x - p0.x, p.y - p0.y) + abstand[c]! - abstand[pfad[t]!]!);
        }
        if (ast.length - 1 < MIN_ZELLEN || ueber < Math.max(MIN_ZELLEN * R.h, anteil * abstand[pfad[t]!]!)) continue;
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
function skelettGespiegelt(R: Raster, z: Uint8Array, dz: Float64Array, abstand: Float64Array, g: Graph, spiegel: 'x' | 'y', weg: (p: number[]) => SkelettWeg, anteil = ANTEIL): Skelett {
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
    if (pfad.length < MIN_ZELLEN || ueber < Math.max(MIN_ZELLEN * R.h, anteil * abstand[achse[k]!]!)) continue;
    const w = weg([achse[k]!, ...pfad]);
    aeste.push({ ...w, eltern: 0, abzweig: k, ueberstand: ueber });
  }
  void dz;
  return { raster: R, abstand, zellen: z, aeste };
}

/**
 * S4 „Teile erkennen“: seitliche Äste einer gespiegelten Ansicht (Front: Achse x = 0, Top: Achse y = 0), robust gegen kleine
 * Züge. Wie `skelettGespiegelt`, aber ohne das Beschneiden der Enden (dessen Maß hängt am Abzweig, an dem das Ablaufen
 * gerade endet — verschwand eine winzige Nebenspur, maß der Haken der Ente plötzlich gegen den dicken Rumpf und fiel weg).
 * Je Komponente neben der Achse ist die Spitze die Zelle, die am weitesten aus dem Kreis der Achse herausragt
 * (Überstand), nicht die entfernteste; weitere Spitzen derselben Komponente zählen, wenn sie außerhalb der Kreise der schon
 * gefundenen Äste liegen (Randrauschen liegt immer darin).
 */
export function seitlicheAeste(poly: readonly V2[], zellen: number, spiegel: 'x' | 'y', anteil = ANTEIL, minZellen = MIN_ZELLEN): Skelett {
  const R = rastern(poly, zellen);
  const dz = abstandZumRand(R);
  const z = ausduennen(R, 'lue-wang');
  const { W, H } = R;
  const abstand = new Float64Array(dz.length);
  for (let i = 0; i < dz.length; i++) abstand[i] = dz[i]! * R.h;
  const weg = (pfad: number[]): SkelettWeg => ({ punkte: pfad.map((i) => welt(R, i)), radius: pfad.map((i) => abstand[i]!) });
  const achse: number[] = [];
  if (spiegel === 'x') {
    const c = Math.max(0, Math.min(W - 1, Math.floor((0 - R.ox) / R.h)));
    for (let r = 0; r < H; r++) if (R.innen[r * W + c]) achse.push(r * W + c);
    achse.sort((a, b) => b - a);
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
  const nachbarn = (i: number, an: (j: number) => boolean): number[] => {
    const r = Math.floor(i / W);
    const c = i - r * W;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < H && cc < W && an(rr * W + cc)) out.push(rr * W + cc);
      }
    return out;
  };
  const neben = (i: number) => !!z[i] && seitlich(i) > 1.5 * R.h;
  const gesehen = new Uint8Array(z.length);
  for (let s = 0; s < z.length; s++) {
    if (gesehen[s] || !neben(s)) continue;
    const komp: number[] = [];
    const inKomp = new Set<number>();
    const stapel = [s];
    gesehen[s] = 1;
    while (stapel.length) {
      const q = stapel.pop()!;
      komp.push(q);
      inKomp.add(q);
      for (const n of nachbarn(q, neben))
        if (!gesehen[n]) {
          gesehen[n] = 1;
          stapel.push(n);
        }
    }
    let start = komp[0]!;
    for (const q of komp) if (seitlich(q) < seitlich(start)) start = q;
    const p0 = welt(R, start);
    let k = 0;
    for (let t = 1; t < ap.length; t++) if (Math.hypot(ap[t]!.x - p0.x, ap[t]!.y - p0.y) < Math.hypot(ap[k]!.x - p0.x, ap[k]!.y - p0.y)) k = t;
    const pa = ap[k]!;
    const ra = abstand[achse[k]!]!;
    const ueber = (q: number) => {
      const p = welt(R, q);
      return Math.hypot(p.x - pa.x, p.y - pa.y) + abstand[q]! - ra;
    };
    // kürzeste Wege vom Anfang aus (Schritte im Skelett)
    const vor = new Map<number, number>([[start, -1]]);
    const schlange = [start];
    for (let t = 0; t < schlange.length; t++)
      for (const n of nachbarn(schlange[t]!, (j) => inKomp.has(j)))
        if (!vor.has(n)) {
          vor.set(n, schlange[t]!);
          schlange.push(n);
        }
    const schwelle = Math.max(minZellen * R.h, anteil * ra);
    // Spitzen: Zellen nach Überstand (nicht nur Endzellen — Lü–Wang lässt an Enden manchmal zwei Zellen breite Stellen,
    // dann hatte die Spitze zwei Nachbarn und die einfache Form verlor ihre Spitzen bei jedem dritten Zugschritt)
    const spitzen = komp.filter((q) => ueber(q) >= schwelle).sort((a, b) => ueber(b) - ueber(a));
    const gefunden: number[][] = [];
    for (const e of spitzen) {
      const pe = welt(R, e);
      // Randrauschen desselben Teils: der Kreis der Spitze liegt (bis auf 2 Zellen) in einem Kreis eines gefundenen Asts.
      // Nur die Spitze im Kreis zu prüfen, verschluckte kleine Wülste neben einem breiten Ast (Rex-Front oben)
      const re = abstand[e]!;
      if (gefunden.some((pf) => pf.some((q) => Math.hypot(welt(R, q).x - pe.x, welt(R, q).y - pe.y) + re <= abstand[q]! + 2 * R.h))) continue;
      const pfad: number[] = [];
      for (let q = e; q !== -1 && q !== undefined; q = vor.get(q)!) pfad.push(q);
      pfad.reverse();
      if (pfad.length < minZellen) continue;
      gefunden.push(pfad);
      aeste.push({ ...weg([achse[k]!, ...pfad]), eltern: 0, abzweig: k, ueberstand: ueber(e) });
    }
  }
  return { raster: R, abstand, zellen: z, aeste };
}
