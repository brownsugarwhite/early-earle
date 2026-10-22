// Teil G, G2: Enden der Wirbelsäule. Bisher waren es der vorderste und der hinterste Punkt der Seite; ragt der Bauch
// weiter vor als die Nase (Florians Giraffe, seine Ente mit der Brust vor dem Schnabel), wurde der Bauch zum Anfang und
// die Röhre klappte um. Jetzt:
// 1. **Eingefroren:** Die Enden sind Kurvenparameter (Segment k, Parameter t) des Seitenumrisses, gespeichert mit den
//    Stationen. Sie gelten, solange die Knotenzahl gleich ist; ein Zug am Bauch kann sie nicht mehr umwerfen.
// 2. **Automatisch** (erster Bau, neues oder nachgezeichnetes Profil, andere Knotenzahl): Wege im Inneren. Liegt
//    der vorderste (hinterste) Punkt auf einem Seitenast des Skeletts und weit entlang des Umrisses vom Ende der
//    Hauptachse, wird das Ende der Hauptachse zum Anfang (Ende); sonst bleibt es beim vordersten (hintersten) Punkt —
//    alle Körper, die heute richtig bauen, bauen bitgleich weiter.
import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { type Profil, pfadAbtasten, segmente, vollerPfad } from '../../profil';
import { innenWege } from './mittelachse';

export type EndAnker = { k: number; t: number; p: V2 };
/** Enden der Wirbelsäule auf dem Seitenumriss (Profil-Einheiten), mit der Knotenzahl, für die die Anker gelten. */
export type Enden = { vorn: EndAnker; hinten: EndAnker; knoten: number };
export type EndenQuelle = 'eingefroren' | 'achse' | 'spitzen';

/** Anteil des Umfangs, ab dem ein Seitenast-Ende als anderes Ende gilt (darunter bleibt der vorderste Punkt) */
const SEITENAST_ANTEIL = 0.08;

function bezier(seg: readonly V2[], t: number): V2 {
  const s = 1 - t;
  const [p0, p1, p2, p3] = seg as [V2, V2, V2, V2];
  const a = s * s * s;
  const b = 3 * s * s * t;
  const c = 3 * s * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** Punkt des geschlossenen Profils auf Segment k bei t. */
export function profilPunkt(pr: Profil, k: number, t: number): V2 {
  const segs = segmente(pr);
  return bezier(segs[((k % segs.length) + segs.length) % segs.length]!, t);
}

/** Nächster Punkt des Profils zu p als Anker (dicht abgetastet, dann je Segment fein nachgesucht). */
export function profilAnker(pr: Profil, p: V2): EndAnker {
  const segs = segmente(pr);
  let bk = 0;
  let bt = 0;
  let bd = Infinity;
  segs.forEach((seg, k) => {
    for (let i = 0; i <= 64; i++) {
      const q = bezier(seg, i / 64);
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (d < bd) {
        bd = d;
        bk = k;
        bt = i / 64;
      }
    }
  });
  // Goldener Schnitt im Nachbarintervall
  let a = Math.max(0, bt - 1 / 64);
  let b = Math.min(1, bt + 1 / 64);
  const f = (t: number) => {
    const q = bezier(segs[bk]!, t);
    return (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
  };
  for (let it = 0; it < 40; it++) {
    const m1 = a + (b - a) * 0.382;
    const m2 = a + (b - a) * 0.618;
    if (f(m1) < f(m2)) b = m2;
    else a = m1;
  }
  const t = (a + b) / 2;
  return { k: bk, t, p: bezier(segs[bk]!, t) };
}

/** Höchstens so weit (Profil-Einheiten) darf ein eingefrorenes Ende neben dem Umriss liegen, um neu verankert zu werden. */
const AUF_UMRISS = 1e-7;

/** Eingefrorene Enden auf einem Profil mit anderer Knotenzahl neu verankern — nur, wenn beide genau auf ihm liegen. */
function neuVerankert(seite: Profil, g: Enden): Enden | null {
  const vorn = profilAnker(seite, g.vorn.p);
  const hinten = profilAnker(seite, g.hinten.p);
  const ab = (a: EndAnker, p: V2) => Math.hypot(a.p.x - p.x, a.p.y - p.y);
  if (!(ab(vorn, g.vorn.p) <= AUF_UMRISS && ab(hinten, g.hinten.p) <= AUF_UMRISS)) return null;
  return { vorn, hinten, knoten: seite.knoten.length };
}

/** Umriss der Seite (Profil-Einheiten) mit Bogenlänge je Punkt. */
function umriss(seite: Profil): { pts: V2[]; s: number[]; umfang: number } {
  const pts = pfadAbtasten(vollerPfad(seite), 40);
  if (pts.length > 1 && Math.hypot(pts[0]!.x - pts[pts.length - 1]!.x, pts[0]!.y - pts[pts.length - 1]!.y) < 1e-12) pts.pop();
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  const umfang = s[s.length - 1]! + Math.hypot(pts[0]!.x - pts[pts.length - 1]!.x, pts[0]!.y - pts[pts.length - 1]!.y);
  return { pts, s, umfang };
}

export type EndenWahl = { vorn: V2; hinten: V2; quelle: EndenQuelle };

/** um so viel muss das andere Ende weiter (Weg innen) liegen als der vorderste bzw. hinterste Punkt */
const WEITER = 1.15;

/** Verlässt die Strecke a → b das Polygon? (Proben auf der Strecke, ohne die Enden) */
function verlaesst(poly: readonly V2[], a: V2, b: V2): boolean {
  for (let k = 1; k < 40; k++) {
    const t = k / 40;
    const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    let drin = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const p1 = poly[i]!;
      const p2 = poly[j]!;
      if (p1.y > q.y !== p2.y > q.y && q.x < ((p2.x - p1.x) * (q.y - p1.y)) / (p2.y - p1.y || 1e-12) + p1.x) drin = !drin;
    }
    if (!drin) return true;
  }
  return false;
}

/**
 * Automatische Enden (Profil-Einheiten). Vorn ist der vorderste Punkt A, hinten der hinterste B — außer der Punkt, der
 * vom anderen Ende innen am weitesten entfernt liegt, ist ein anderer, liegt hinter einer Biegung (die Luftlinie verlässt
 * die Form: ein Hals) und innen um 15 % weiter als A bzw. B. So wird bei Florians Giraffe mit Bauch vor der
 * Nase und seiner Ente die Nase bzw. der Schnabel zum Anfang; konvexe Körper (Kugel, Turm, Birne) behalten A und B.
 */
const wahlMerk = new WeakMap<Profil, EndenWahl>();

export function endenAutomatisch(seite: Profil): EndenWahl {
  // je Profil-Objekt gemerkt (der Bau ruft die Leiter mehrfach auf; Profile werden nie verändert, nur ersetzt)
  const gemerkt = wahlMerk.get(seite);
  if (gemerkt) return gemerkt;
  const w = endenWaehlen(seite);
  wahlMerk.set(seite, w);
  return w;
}

function endenWaehlen(seite: Profil): EndenWahl {
  const { pts, s, umfang } = umriss(seite);
  let iA = 0;
  let iB = 0;
  pts.forEach((p, i) => {
    if (p.x < pts[iA]!.x) iA = i;
    if (p.x > pts[iB]!.x) iB = i;
  });
  const bogen = (i: number, j: number) => {
    const d = Math.abs(s[i]! - s[j]!);
    return Math.min(d, umfang - d) / umfang;
  };
  // fernster Punkt (Weg innen) vom anderen Ende; unter den fast gleich fernen (≥ 95 %) der vorderste bzw. hinterste
  // (Giraffe: die Nase statt des Scheitels, beide liegen gleich weit hinter dem Hals)
  const anderes = (iVon: number, iAlt: number, richtung: -1 | 1): number => {
    const weg = innenWege(pts, pts[iVon]!);
    const d = pts.map((p) => weg(p));
    const dAlt = d[iAlt]!;
    let dMax = dAlt;
    for (const x of d) if (x > dMax) dMax = x;
    let iF = iAlt;
    d.forEach((x, i) => {
      if (x >= 0.95 * dMax && (iF === iAlt ? x > dAlt : richtung * pts[i]!.x > richtung * pts[iF]!.x)) iF = i;
    });
    if (iF === iAlt || bogen(iF, iAlt) <= SEITENAST_ANTEIL) return iAlt;
    // nur hinter einer Biegung (die Luftlinie verlässt die Form: ein Hals) und deutlich weiter als der alte Punkt
    return d[iF]! > WEITER * dAlt && verlaesst(pts, pts[iVon]!, pts[iF]!) ? iF : iAlt;
  };
  const iV = anderes(iB, iA, -1);
  const iH = anderes(iV, iB, 1);
  if (iV === iA && iH === iB) return { vorn: pts[iA]!, hinten: pts[iB]!, quelle: 'spitzen' };
  return { vorn: pts[iV]!, hinten: pts[iH]!, quelle: 'achse' };
}

/** Eingefrorene Enden gelten, solange ihr Abstand mindestens diesen Anteil des Durchmessers der Seite hat (schnelle Probe) … */
const TRAGEN_SCHNELL = 0.9;
/** … oder ihr Weg innen mindestens diesen Anteil des Wegs zwischen den automatischen Enden (volle Probe) */
const TRAGEN_WEG = 0.9;

/** Größter Abstand zweier Punkte des Umrisses (grob, auf ≤ 120 Punkten). */
function durchmesser(pts: readonly V2[]): number {
  const schritt = Math.max(1, Math.floor(pts.length / 120));
  let d = 0;
  for (let i = 0; i < pts.length; i += schritt)
    for (let j = i + schritt; j < pts.length; j += schritt) d = Math.max(d, Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y));
  return d;
}

/**
 * Tragen eingefrorene Enden die Form noch? Florian (16.10.): Aus der Startkugel gezogen, blieben die eingefrorenen Enden
 * links und rechts der Kugel, während Hals und Kopf nach oben wuchsen (Δ 84 px). Schnell: Liegen die Enden fast so weit
 * auseinander wie der Durchmesser der Seite, bleiben sie (ein Zug am Bauch wirft sie nicht um). Sonst der Weg innen gegen
 * den zwischen den automatischen Enden.
 */
function endenTragen(seite: Profil, vorn: V2, hinten: V2): boolean {
  const { pts } = umriss(seite);
  if (Math.hypot(vorn.x - hinten.x, vorn.y - hinten.y) >= TRAGEN_SCHNELL * durchmesser(pts)) return true;
  const w = endenAutomatisch(seite);
  const dAuto = innenWege(pts, w.vorn)(w.hinten);
  const dEig = innenWege(pts, vorn)(hinten);
  return dEig >= TRAGEN_WEG * dAuto;
}

/**
 * Enden für den Bau. Liefert die Punkte (Profil-Einheiten) und die Anker zum Einfrieren.
 * - Mit Maul (gezeichnet, markierte Lippenknoten oder aus der Ausstattung): der vorderste und der hinterste Punkt wie vor G2 (Florian 16.10.: Seit G2 blieben
 *   die an der Startkugel eingefrorenen Enden nach dem Zeichnen des Mauls an der alten Kugelstelle statt an der
 *   Schnabelspitze; der Unterbiss zerriss, Δ 20 px und 822 Durchdringungen statt Δ 0,8 px und 0). Der Maulbau ist mit
 *   diesen Enden geprüft.
 * - Eingefroren (`dok.kaefig.stationen.enden`, gleiche Knotenzahl der Seite), solange sie die Form tragen (`endenTragen`).
 * - Sonst automatisch: neue oder andere Knotenzahl (Einfügen, Löschen, Maul gezeichnet, Bogen nachgezogen) oder stark
 *   umgeformt. Das alte Ende „in der Nähe“ zu suchen, setzte es nach dem Umformen an eine Kerbe oder mitten in die Flanke.
 */
export function endenFuer(dok: Dokument): { vorn: V2; hinten: V2; enden: Enden; quelle: EndenQuelle } {
  const seite = dok.profile.seite;
  const anker = (vorn: V2, hinten: V2): Enden => ({ vorn: profilAnker(seite, vorn), hinten: profilAnker(seite, hinten), knoten: seite.knoten.length });
  // Maul: markierte Lippenknoten (Prüfreihe, Versuche), gezeichnete Linien (Editor in der Bauweise Kern setzt keine Marken)
  // oder ein Maul aus der Ausstattung
  const mitMaul = seite.knoten.some((k) => k.marke) || !!dok.maul || (!!dok.ausstattung?.maul && dok.ausstattung.maul !== 'aus');
  if (mitMaul) {
    const { pts } = umriss(seite);
    let iA = 0;
    let iB = 0;
    pts.forEach((p, i) => {
      if (p.x < pts[iA]!.x) iA = i;
      if (p.x > pts[iB]!.x) iB = i;
    });
    return { vorn: pts[iA]!, hinten: pts[iB]!, enden: anker(pts[iA]!, pts[iB]!), quelle: 'spitzen' };
  }
  const g0 = dok.kaefig?.stationen?.enden;
  // Andere Knotenzahl: Liegen beide Enden noch genau auf dem Umriss, ist die Kurve dort dieselbe (Knoten formneutral
  // eingefügt oder exakt gelöscht: Stift, Kopplung, Loop) — die Anker werden neu gesucht. Vorher wurden die Enden dann
  // automatisch neu bestimmt, und schon ein eingefügter Punkt verschob den Körper (Langhals 1,8 px).
  const g = g0 && g0.knoten !== seite.knoten.length ? neuVerankert(seite, g0) : g0;
  if (g && g.knoten === seite.knoten.length) {
    const vorn = profilPunkt(seite, g.vorn.k, g.vorn.t);
    const hinten = profilPunkt(seite, g.hinten.k, g.hinten.t);
    if (endenTragen(seite, vorn, hinten)) return { vorn, hinten, enden: { vorn: { ...g.vorn, p: vorn }, hinten: { ...g.hinten, p: hinten }, knoten: g.knoten }, quelle: 'eingefroren' };
  }
  const w = endenAutomatisch(seite);
  return { vorn: w.vorn, hinten: w.hinten, enden: anker(w.vorn, w.hinten), quelle: w.quelle };
}
