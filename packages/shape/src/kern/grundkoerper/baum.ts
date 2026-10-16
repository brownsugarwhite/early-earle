// Teil G, G4 neu, Schritt 2 (Beweis): Rumpf und Äste der Seite als getrennte Netze. Jeder Teil bekommt den eigenen
// Seitenumriss aus der Zerlegung (mit der Schnittsehne am Ansatz) und damit seine eigene Wirbelsäule; der Rumpf dazu Front
// und Top ohne seitliche Teile (`rumpfDokument`). So lässt sich prüfen, dass der Fächer im Körper weg ist, bevor die Äste
// nahtlos angesetzt werden (Schritt 3). DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { knotenNachWelt, profilGeschlossen } from '../../fit';
import { type Profil, pfadAbtasten, vollerPfad } from '../../profil';
import { type V3, alleFlaechen, kaefigAusFlaechen, kanteZwischen, pruefeKaefig } from '../../kaefig/halbkanten';
import { type Roehre, roehre } from '../../kaefig/roehre';
import { ABLEIT_STANDARD, type AbleitOptionen, type Ableitung, ableiten, faltenSetzen, fertigstellen, kernLeiter, stationenWaehlen, zieleBerechnen } from '../ableiten';
import { silhouettenBreite } from '../breite';
import { rumpfDokument } from './teilBau';
import { type Zerlegung, seiteZerlegen } from './zerlegung';

const PX = 461;
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Geschlossenes Seitenprofil aus einem Umriss (Welt), gleichmäßig nach Bogenlänge abgetastet und angepasst (Profil-Einheiten = Welt / Maßstab). */
export function profilAusUmriss(umriss: readonly V2[], massstab: number, abstand = 0.004): Profil {
  const n = umriss.length;
  const L: number[] = [0];
  for (let i = 1; i <= n; i++) L.push(L[i - 1]! + Math.hypot(umriss[i % n]!.x - umriss[i - 1]!.x, umriss[i % n]!.y - umriss[i - 1]!.y));
  const gesamt = L[n]!;
  const m = Math.max(24, Math.round(gesamt / abstand));
  const px: [number, number][] = [];
  let k = 0;
  for (let s = 0; s < m; s++) {
    const t = (gesamt * s) / m;
    while (k + 1 < n && L[k + 1]! < t) k++;
    const a = umriss[k]!;
    const b = umriss[(k + 1) % n]!;
    const f = (t - L[k]!) / (L[k + 1]! - L[k]! || 1);
    px.push([((a.x + (b.x - a.x) * f) / massstab) * PX, ((a.y + (b.y - a.y) * f) / massstab) * PX]);
  }
  return { art: 'geschlossen', knoten: knotenNachWelt(profilGeschlossen(px, 1.2), (p) => ({ x: p[0] / PX, y: p[1] / PX }), 1 / PX) };
}

/**
 * Brücke statt Sehne: Wo der Ast abgeschnitten ist, setzt sich der Umriss glatt fort — eine kubische Hermite-Kurve von A
 * nach B mit den Richtungen des Umrisses an beiden Enden (wie ein Körper ohne Hals). Eine gerade Sehne wurde im Profil zu
 * zwei Ecken und damit zu Ringfalten um den ganzen Rumpf; glatte Knoten an den Ecken schossen über (gemessen).
 */
export function brueckeEinsetzen(poly: readonly V2[], A: V2, B: V2): V2[] {
  const n = poly.length;
  const gleich = (p: V2, q: V2) => Math.abs(p.x - q.x) < 1e-12 && Math.abs(p.y - q.y) < 1e-12;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    let a = -1;
    let b = -1;
    if (gleich(poly[i]!, A) && gleich(poly[j]!, B)) [a, b] = [i, j];
    else if (gleich(poly[i]!, B) && gleich(poly[j]!, A)) [a, b] = [i, j];
    if (a < 0) continue;
    const P0 = poly[a]!;
    const P1 = poly[b]!;
    const vor = poly[(a - 1 + n) % n]!;
    const nach = poly[(b + 1) % n]!;
    const L = Math.hypot(P1.x - P0.x, P1.y - P0.y);
    const richt = (p: V2, q: V2) => {
      const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      return { x: ((q.x - p.x) / l) * L, y: ((q.y - p.y) / l) * L };
    };
    const m0 = richt(vor, P0);
    const m1 = richt(P1, nach);
    const kurve: V2[] = [];
    const m = Math.max(8, Math.round(L / 0.004));
    for (let t = 1; t < m; t++) {
      const u = t / m;
      const h00 = 2 * u * u * u - 3 * u * u + 1;
      const h10 = u * u * u - 2 * u * u + u;
      const h01 = -2 * u * u * u + 3 * u * u;
      const h11 = u * u * u - u * u;
      kurve.push({ x: h00 * P0.x + h10 * m0.x + h01 * P1.x + h11 * m1.x, y: h00 * P0.y + h10 * m0.y + h01 * P1.y + h11 * m1.y });
    }
    return [...poly.slice(0, a + 1), ...kurve, ...poly.slice(a + 1)];
  }
  return poly.slice();
}

/** Dokument eines Teils: eigener Seitenumriss, ohne eingefrorene Stationen und Pinsel (die gehören zum ganzen Wesen). */
function teilDokument(basis: Dokument, seite: Profil): Dokument {
  const d: Dokument = { ...basis, profile: { ...basis.profile, seite } };
  delete d.kaefig;
  return d;
}

export type BaumTeile = { zerlegung: Zerlegung; rumpf: Ableitung; aeste: Ableitung[]; dokumente: Dokument[] };

/** Rumpf und Äste der Seite getrennt ableiten. Ohne Äste: das ganze Wesen wie bisher (`ableiten`). */
export function baumTeile(dok: Dokument, optionen: Partial<AbleitOptionen> = {}): BaumTeile {
  const sk = dok.skalierung;
  const poly = pfadAbtasten(vollerPfad(dok.profile.seite), 32).map((p) => ({ x: p.x * sk, y: p.y * sk }));
  const zerlegung = seiteZerlegen(poly);
  if (!zerlegung.aeste.length) return { zerlegung, rumpf: ableiten(dok, optionen), aeste: [], dokumente: [dok] };
  const rumpfBasis = rumpfDokument(dok);
  // Sehnenenden ausrunden (Radius ein Viertel der Sehne): kein Knick am Ansatz
  let rumpfUmriss = zerlegung.rumpf.umriss;
  for (const a of zerlegung.aeste) rumpfUmriss = brueckeEinsetzen(rumpfUmriss, a.schnitt[0], a.schnitt[1]);
  const rumpfDok = teilDokument(rumpfBasis, profilAusUmriss(rumpfUmriss, sk));
  const astDoks = zerlegung.aeste.map((a) => teilDokument(dok, profilAusUmriss(brueckeEinsetzen(a.umriss, a.schnitt[0], a.schnitt[1]), sk)));
  return { zerlegung, rumpf: ableiten(rumpfDok, optionen), aeste: astDoks.map((d) => ableiten(d, optionen)), dokumente: [rumpfDok, ...astDoks] };
}

// ---------- Schritt 3: Äste nahtlos ansetzen ----------

/** Rand eines Rechteckfelds der Röhre (Ringe i0 … i1, Spalten j0 … j1, Spalten zyklisch) im Umlauf und seine Innenpunkte. */
function feldRechteck(v: Roehre, i0: number, i1: number, j0: number, j1: number): { rand: number[]; innen: { punkt: number; a: number; b: number }[]; flaechen: Set<string> } {
  const p = v.ringPunkt;
  const rand: number[] = [];
  for (let j = j0; j < j1; j++) rand.push(p(i0, j));
  for (let i = i0; i < i1; i++) rand.push(p(i, j1));
  for (let j = j1; j > j0; j--) rand.push(p(i1, j));
  for (let i = i1; i > i0; i--) rand.push(p(i, j0));
  const innen: { punkt: number; a: number; b: number }[] = [];
  for (let i = i0 + 1; i < i1; i++) for (let j = j0 + 1; j < j1; j++) innen.push({ punkt: p(i, j), a: i - i0, b: j - j0 });
  const flaechen = new Set<string>();
  for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) flaechen.add([p(i, j), p(i, j + 1), p(i + 1, j + 1), p(i + 1, j)].sort((x, y) => x - y).join(','));
  return { rand, innen, flaechen };
}

const innenPoly = (pts: readonly V2[], q: V2) => {
  let drin = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!;
    const b = pts[j]!;
    if (a.y > q.y !== b.y > q.y && q.x < a.x + ((q.y - a.y) / (b.y - a.y)) * (b.x - a.x)) drin = !drin;
  }
  return drin;
};

export type AstInfo = { art: 'gabel' | 'knick'; feld: { i0: number; i1: number; spalte: number; b: number }; punkteJeRing: number; ringe: number; ab: number; diagnose?: { schnitt: [V2, V2]; randNaht: V3[]; ersterRingNaht: V3[]; ringIndizes: number[][]; rand: number[] } };
export type BaumErgebnis = Ableitung & { zerlegung: Zerlegung; astInfo: AstInfo[] };

/**
 * Wirbelsäulen-Baum (G4 neu, Schritt 3): Rumpf mit eigener Wirbelsäule (Seitenumriss ohne Äste, Brücke unter jedem Ast),
 * jeder Ast der Seite wächst nahtlos aus einem symmetrischen Feld auf der Rumpfnaht (Ringe i0 … i1 unter der Schnittsehne,
 * b Spalten je Seite der Naht). Der Ast wird mit so vielen Punkten je Ring abgeleitet, wie der Feldrand hat; seine Ringe
 * ab dem ersten außerhalb des Rumpfs folgen auf den Feldrand, die Feldflächen werden die Kappe an der Spitze (wie die Beine
 * aus Beweis 3). Gelöst wird das ganze Netz mit der Naht auf dem vollen Seitenumriss. Ohne Äste: `ableiten`.
 */
export function baumAbleiten(dok: Dokument, optionen: Partial<AbleitOptionen> = {}): BaumErgebnis {
  const sk = dok.skalierung;
  const poly = pfadAbtasten(vollerPfad(dok.profile.seite), 32).map((p) => ({ x: p.x * sk, y: p.y * sk }));
  const zerlegung = seiteZerlegen(poly);
  if (!zerlegung.aeste.length) return { ...ableiten(dok, optionen), zerlegung, astInfo: [] };
  const opt = { ...ABLEIT_STANDARD, ...optionen };
  const t0 = jetzt();
  let rumpfUmriss = zerlegung.rumpf.umriss;
  for (const a of zerlegung.aeste) rumpfUmriss = brueckeEinsetzen(rumpfUmriss, a.schnitt[0], a.schnitt[1]);
  const rumpfDok = teilDokument(rumpfDokument(dok), profilAusUmriss(rumpfUmriss, sk));
  const l = kernLeiter(rumpfDok);
  const t1 = jetzt();
  const breiten = silhouettenBreite(rumpfDok);
  const t2 = jetzt();
  const v = roehre(opt.ringe, opt.ring);
  const st = stationenWaehlen(l, opt, rumpfDok);
  faltenSetzen(v, st, l, rumpfDok, breiten, opt);
  const roh = zieleBerechnen(v, l, st, breiten, rumpfDok, opt);
  const { N } = v;
  const flaechenAlt = alleFlaechen(v.kaefig).map((f) => [...f]);
  const schluessel = (f: readonly number[]) => [...f].sort((x, y) => x - y).join(',');
  const entfernen = new Set<string>();
  const neueFlaechen: number[][] = [];
  const zielNeu: V3[] = [];
  const hoeheNeu: number[] = [];
  const zielSetzen = new Map<number, V3>();
  let naechster = v.kaefig.n;
  const P = (i: number): V3 => [roh.ziele[3 * i]!, roh.ziele[3 * i + 1]!, roh.ziele[3 * i + 2]!];
  const astInfo: AstInfo[] = [];
  const scharfAst: { a: number; b: number; s: number }[] = [];
  const ohneHaut = new Set<number>();
  for (const ast of zerlegung.aeste) {
    const A = ast.schnitt[0];
    const B = ast.schnitt[1];
    const mitte = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    // Naht-Spalte: oben (0) oder unten (N/2), je nachdem, welche Naht der Sehne näher liegt
    let dOben = Infinity;
    let dUnten = Infinity;
    for (let i = 0; i < v.R; i++) {
      const o = P(v.ringPunkt(i, 0));
      const u = P(v.ringPunkt(i, N / 2));
      dOben = Math.min(dOben, Math.hypot(o[0] - mitte.x, o[1] - mitte.y));
      dUnten = Math.min(dUnten, Math.hypot(u[0] - mitte.x, u[1] - mitte.y));
    }
    const spalte = dOben <= dUnten ? 0 : N / 2;
    // Feldringe: Nahtpunkt projiziert auf die Sehne zwischen den Enden
    const ab = { x: B.x - A.x, y: B.y - A.y };
    const L2 = ab.x * ab.x + ab.y * ab.y || 1;
    const imFeld: number[] = [];
    for (let i = 1; i < v.R - 1; i++) {
      const q = P(v.ringPunkt(i, spalte));
      const t = ((q[0] - A.x) * ab.x + (q[1] - A.y) * ab.y) / L2;
      if (t >= 0 && t <= 1) imFeld.push(i);
    }
    if (imFeld.length < 2) continue;
    let i0 = imFeld[0]!;
    let i1 = imFeld[imFeld.length - 1]!;
    const b = ast.dicke < 0.45 ? 1 : 2;
    // Punkte je Ring durch 8 teilbar (die Kappe der Ast-Röhre braucht eine gerade Kantenzahl c = M/4): Δi + 2b durch 4
    // teilbar — das Feld wächst dafür abwechselnd um einen Ring nach hinten und vorn
    for (let k = 0; (i1 - i0 + 2 * b) % 4 !== 0 && k < 6; k++) {
      if (k % 2 === 0 && i1 + 1 < v.R - 1) i1++;
      else if (i0 - 1 > 0) i0--;
      else if (i1 + 1 < v.R - 1) i1++;
    }
    const M = 2 * (i1 - i0 + 2 * b);
    const feld = feldRechteck(v, i0, i1, spalte - b, spalte + b);
    for (const k of feld.flaechen) entfernen.add(k);
    // Ast mit M Punkten je Ring ableiten (Rohziele)
    const astDok = teilDokument(dok, profilAusUmriss(brueckeEinsetzen(ast.umriss, A, B), sk));
    const optA = { ...opt, ring: M };
    const lA = kernLeiter(astDok);
    const brA = silhouettenBreite(astDok);
    const vA = roehre(optA.ringe, M);
    const stA = stationenWaehlen(lA, optA, astDok);
    faltenSetzen(vA, stA, lA, astDok, brA, optA);
    const rohA = zieleBerechnen(vA, lA, stA, brA, astDok, optA);
    const PA = (i: number): V3 => [rohA.ziele[3 * i]!, rohA.ziele[3 * i + 1]!, rohA.ziele[3 * i + 2]!];
    const mitteRing = (r: number): V2 => {
      let x = 0;
      let y = 0;
      for (let j = 0; j < M; j++) {
        x += PA(vA.ringPunkt(r, j))[0];
        y += PA(vA.ringPunkt(r, j))[1];
      }
      return { x: x / M, y: y / M };
    };
    const d0 = Math.hypot(mitteRing(0).x - mitte.x, mitteRing(0).y - mitte.y);
    const dR = Math.hypot(mitteRing(vA.R - 1).x - mitte.x, mitteRing(vA.R - 1).y - mitte.y);
    const basisVorn = d0 <= dR;
    const folge = Array.from({ length: vA.R }, (_, k) => (basisVorn ? k : vA.R - 1 - k));
    // erster Astring: beide Nahtpunkte deutlich auf der Astseite der Sehne (die Mitte allein reichte nicht — ein schräger
    // Ring lag vorn noch unter dem Feldrand, das Viereck dazwischen klappte um)
    const sehneN = { x: -(B.y - A.y), y: B.x - A.x };
    const sehneL = Math.hypot(sehneN.x, sehneN.y) || 1;
    const spitzeA = mitteRing(folge[folge.length - 1]!);
    const astSeite = Math.sign((spitzeA.x - A.x) * sehneN.x + (spitzeA.y - A.y) * sehneN.y) || 1;
    const ueberSehne = (q: V3) => (astSeite * ((q[0] - A.x) * sehneN.x + (q[1] - A.y) * sehneN.y)) / sehneL;
    let kStart = 1;
    while (kStart < folge.length - 2) {
      const r = folge[kStart]!;
      const tief = Math.min(ueberSehne(PA(vA.ringPunkt(r, 0))), ueberSehne(PA(vA.ringPunkt(r, M / 2))));
      if (tief >= 0.15 * sehneL && !innenPoly(rumpfUmriss, mitteRing(r))) break;
      kStart++;
    }
    const behalten = folge.slice(kStart);
    // Ausrichtung: Nahtpunkt des Feldrands (i0, Spalte) ↔ Nahtpunkt des Astrings (0 oder M/2), Umlauf nach der z-Seite
    const iS0 = b; // Index von (i0, spalte) im Rand
    const r0 = behalten[0]!;
    const nahtA = [vA.ringPunkt(r0, 0), vA.ringPunkt(r0, M / 2)];
    const randS0 = P(feld.rand[iS0]!);
    const jS = Math.hypot(PA(nahtA[0]!)[0] - randS0[0], PA(nahtA[0]!)[1] - randS0[1]) <= Math.hypot(PA(nahtA[1]!)[0] - randS0[0], PA(nahtA[1]!)[1] - randS0[1]) ? 0 : M / 2;
    const zR = P(feld.rand[(iS0 + 1) % M]!)[2];
    const zA = PA(vA.ringPunkt(r0, jS + 1))[2];
    const s = Math.sign(zR) === Math.sign(zA) ? 1 : -1;
    const astIndex = (q: number) => (((jS + s * (q - iS0)) % M) + M) % M; // Randindex q → Astring-Spalte
    // Bogenlängen-Anteile des Feldrands ab dem Nahtpunkt (die kurzen Seiten haben 2b, die langen Δi Punkte, beide sind etwa
    // gleich lang): Die Astringe werden mit denselben Anteilen neu verteilt, sonst verdrehen sich die Vierecke am Ansatz
    const anteileVon = (pos: V3[]): number[] => {
      const L: number[] = [0];
      for (let k = 1; k <= M; k++) {
        const a = pos[(iS0 + k - 1) % M]!;
        const c = pos[(iS0 + k) % M]!;
        L.push(L[k - 1]! + Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]));
      }
      const g = L[M]! || 1;
      const out = new Array<number>(M);
      for (let k = 0; k < M; k++) out[(iS0 + k) % M] = L[k]! / g;
      return out;
    };
    const randAnteile = anteileVon(feld.rand.map((i) => P(i)));
    // neue Punkte: je behaltenem Ring M Punkte in Randreihenfolge, längs des Rings nach den Anteilen des Feldrands
    const ringeNeu: number[][] = [];
    const AUSLAUF = 4; // Ringe, über die die Verteilung des Feldrands in die eigene des Asts übergeht (die Spitzenkappe passt zu ihr)
    for (const [kr, r] of behalten.entries()) {
      const roh0 = Array.from({ length: M }, (_, q) => PA(vA.ringPunkt(r, astIndex(q))));
      const eigen = anteileVon(roh0);
      const wRand = Math.max(0, 1 - kr / AUSLAUF);
      const ring: number[] = [];
      for (let q = 0; q < M; q++) {
        // Punkt bei Anteil (Rand ↔ eigen überblendet) auf dem geschlossenen Zug roh0 (Reihenfolge ab iS0)
        const f = wRand * randAnteile[q]! + (1 - wRand) * eigen[q]!;
        let k = 0;
        while (k < M - 1 && eigen[(iS0 + k + 1) % M]! <= f && eigen[(iS0 + k + 1) % M]! > 0) k++;
        const a0 = (iS0 + k) % M;
        const a1 = (iS0 + k + 1) % M;
        const fa = eigen[a0]!;
        const fb = a1 === iS0 % M ? 1 : eigen[a1]!;
        const t = fb > fa ? Math.min(1, Math.max(0, (f - fa) / (fb - fa))) : 0;
        const pa = roh0[a0]!;
        const pb = roh0[a1]!;
        const idx = naechster++;
        ring.push(idx);
        zielNeu.push([pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, pa[2] + (pb[2] - pa[2]) * t]);
        hoeheNeu.push(rohA.hoehe[vA.ringPunkt(r, astIndex(q))] ?? 0);
      }
      ringeNeu.push(ring);
    }
    // Falten des Asts (Längsfalten an Ecken) auf die neuen Kanten übertragen
    for (let k = 0; k + 1 < behalten.length; k++)
      for (let q = 0; q < M; q++) {
        const e = kanteZwischen(vA.kaefig, vA.ringPunkt(behalten[k]!, astIndex(q)), vA.ringPunkt(behalten[k + 1]!, astIndex(q)));
        const sch = e >= 0 ? vA.kaefig.eSchaerfe[e]! : 0;
        if (sch > 0) scharfAst.push({ a: ringeNeu[k]![q]!, b: ringeNeu[k + 1]![q]!, s: sch });
      }
    // Umlaufsinn aus der Rumpffläche am Rand
    let richtung = 1;
    for (const f of flaechenAlt) {
      if (entfernen.has(schluessel(f))) continue;
      const a0 = f.indexOf(feld.rand[0]!);
      const a1 = f.indexOf(feld.rand[1]!);
      if (a0 < 0 || a1 < 0) continue;
      richtung = (a0 + 1) % f.length === a1 ? -1 : 1;
      break;
    }
    const Rg = (k: number, q: number) => (k === 0 ? feld.rand[q % M]! : ringeNeu[k - 1]![q % M]!);
    for (let k = 0; k < ringeNeu.length; k++)
      for (let q = 0; q < M; q++) {
        const f = [Rg(k, q), Rg(k, q + 1), Rg(k + 1, q + 1), Rg(k + 1, q)];
        neueFlaechen.push(richtung > 0 ? f : f.reverse());
      }
    // Kappe an der Spitze: die eigene Kappe des Asts (quadratisch, c × c), ihr Rand ist der letzte Ring. Die Innenpunkte
    // des Felds bleiben ohne Flächen (Punkte ohne Haut, damit die Vorlagen-Nummern des Rumpfs gültig bleiben); als Kappe
    // gefaltet hätte sich das lange Feld (z. B. 12 × 4) über den runden Kopf gelegt (gemessen: Falten bis 180°)
    const letzter = ringeNeu[ringeNeu.length - 1]!;
    const spitzeRing = behalten[behalten.length - 1]!;
    const spitzeSeite: 'vorn' | 'hinten' = spitzeRing === 0 ? 'vorn' : 'hinten';
    const ringZuQ = (j: number) => (((iS0 + s * (j - jS)) % M) + M) % M; // Astring-Spalte → Randindex
    const kappeNeu = new Map<number, number>();
    for (let a = 1; a < vA.c; a++)
      for (let c = 1; c < vA.c; c++) {
        const alt = vA.kappe(spitzeSeite, a, c);
        const idx = naechster++;
        kappeNeu.set(alt, idx);
        zielNeu.push(PA(alt));
        hoeheNeu.push(rohA.hoehe[alt] ?? 0);
      }
    const abbild = (alt: number): number => {
      const k = kappeNeu.get(alt);
      if (k !== undefined) return k;
      const ring = Math.floor(alt / M);
      if (ring === spitzeRing && alt < vA.R * M) return letzter[ringZuQ(alt - ring * M)]!;
      return -1;
    };
    const kappenFlaechen: number[][] = [];
    for (const f of alleFlaechen(vA.kaefig)) {
      if (!f.some((x) => kappeNeu.has(x))) continue;
      const g = f.map(abbild);
      if (g.some((x) => x < 0)) continue;
      kappenFlaechen.push(g);
    }
    // Umlaufsinn der Kappe gegen die letzten Röhrenflächen prüfen (gemeinsame Kante gegenläufig)
    const roehrenKante = new Set<string>();
    for (let q = 0; q < M; q++) {
      const f = [Rg(ringeNeu.length - 1, q), Rg(ringeNeu.length - 1, q + 1), Rg(ringeNeu.length, q + 1), Rg(ringeNeu.length, q)];
      const g = richtung > 0 ? f : f.slice().reverse();
      for (let t = 0; t < 4; t++) roehrenKante.add(`${g[t]},${g[(t + 1) % 4]}`);
    }
    let gleichlaeufig = false;
    for (const f of kappenFlaechen) for (let t = 0; t < f.length; t++) if (roehrenKante.has(`${f[t]},${f[(t + 1) % f.length]}`)) gleichlaeufig = true;
    for (const f of kappenFlaechen) neueFlaechen.push(gleichlaeufig ? f.slice().reverse() : f);
    for (const { punkt } of feld.innen) ohneHaut.add(punkt);
    astInfo.push({ art: ast.art, feld: { i0, i1, spalte, b }, punkteJeRing: M, ringe: behalten.length, ab: kStart, diagnose: { schnitt: [A, B], randNaht: [P(feld.rand[iS0]!), P(feld.rand[(iS0 + M / 2) % M]!)], ersterRingNaht: [zielNeu[ringeNeu[0]![iS0]! - v.kaefig.n]!, zielNeu[ringeNeu[0]![(iS0 + M / 2) % M]! - v.kaefig.n]!], ringIndizes: ringeNeu, rand: feld.rand } });
  }
  const n = naechster;
  const ziele = new Float64Array(3 * n);
  ziele.set(roh.ziele);
  zielNeu.forEach((p, k) => ziele.set(p, 3 * (v.kaefig.n + k)));
  for (const [punkt, p] of zielSetzen) ziele.set(p, 3 * punkt);
  const hoehe = new Float64Array(n);
  hoehe.set(roh.hoehe);
  hoeheNeu.forEach((h, k) => (hoehe[v.kaefig.n + k] = h));
  const koerper = flaechenAlt.filter((f) => !entfernen.has(schluessel(f)));
  const kaefig = kaefigAusFlaechen(ziele, [...koerper, ...neueFlaechen]);
  const pr = pruefeKaefig(kaefig);
  if (!pr.ok) throw new Error(`Baum: Käfig nicht konsistent: ${pr.fehler.slice(0, 3).join('; ')}`);
  for (let e = 0; e < v.kaefig.nE; e++) {
    const sch = v.kaefig.eSchaerfe[e]!;
    if (sch <= 0) continue;
    const ke = kanteZwischen(kaefig, v.kaefig.eA[e]!, v.kaefig.eB[e]!);
    if (ke >= 0) kaefig.eSchaerfe[ke] = sch;
  }
  for (const { a, b, s } of scharfAst) {
    const ke = kanteZwischen(kaefig, a, b);
    if (ke >= 0) kaefig.eSchaerfe[ke] = s;
  }
  for (let i = 0; i < v.kaefig.n; i++) if (v.kaefig.vSchaerfe[i]! > 0) kaefig.vSchaerfe[i] = v.kaefig.vSchaerfe[i]!;
  // Naht auf dem vollen Seitenumriss (Rumpf und Äste in einem Rundgang)
  const haut = new Uint8Array(n).fill(1);
  for (const p of ohneHaut) haut[p] = 0;
  const abl = fertigstellen({ opt, vorlage: v, kaefig, ziele, hoehe, l, st, breiten, dok, haut, zeiten: { t0, t1, t2 } });
  return { ...abl, zerlegung, astInfo };
}
