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

/**
 * Enden für den Bau: eingefroren (`dok.kaefig.stationen.enden`, gleiche Knotenzahl der Seite) oder automatisch. Liefert
 * die Punkte (Profil-Einheiten) und die Anker zum Einfrieren.
 */
export function endenFuer(dok: Dokument): { vorn: V2; hinten: V2; enden: Enden; quelle: EndenQuelle } {
  const seite = dok.profile.seite;
  const g = dok.kaefig?.stationen?.enden;
  if (g && g.knoten === seite.knoten.length) {
    const vorn = profilPunkt(seite, g.vorn.k, g.vorn.t);
    const hinten = profilPunkt(seite, g.hinten.k, g.hinten.t);
    return { vorn, hinten, enden: { vorn: { ...g.vorn, p: vorn }, hinten: { ...g.hinten, p: hinten }, knoten: g.knoten }, quelle: 'eingefroren' };
  }
  const w = endenAutomatisch(seite);
  // eine andere Knotenzahl mit alten Ankern: das alte Ende in der Nähe suchen (Einfügen, Löschen), sonst automatisch
  const vornAlt = g ? profilAnker(seite, g.vorn.p) : null;
  const hintenAlt = g ? profilAnker(seite, g.hinten.p) : null;
  const vorn = vornAlt ?? profilAnker(seite, w.vorn);
  const hinten = hintenAlt ?? profilAnker(seite, w.hinten);
  return { vorn: vornAlt ? vornAlt.p : w.vorn, hinten: hintenAlt ? hintenAlt.p : w.hinten, enden: { vorn, hinten, knoten: seite.knoten.length }, quelle: g ? 'eingefroren' : w.quelle };
}
