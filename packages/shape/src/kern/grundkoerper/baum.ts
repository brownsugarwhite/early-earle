// Teil G, G4 neu, Schritt 2 (Beweis): Rumpf und Äste der Seite als getrennte Netze. Jeder Teil bekommt den eigenen
// Seitenumriss aus der Zerlegung (mit der Schnittsehne am Ansatz) und damit seine eigene Wirbelsäule; der Rumpf dazu Front
// und Top ohne seitliche Teile (`rumpfDokument`). So lässt sich prüfen, dass der Fächer im Körper weg ist, bevor die Äste
// nahtlos angesetzt werden (Schritt 3). DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { knotenNachWelt, profilGeschlossen } from '../../fit';
import { type Profil, pfadAbtasten, vollerPfad } from '../../profil';
import { type AbleitOptionen, type Ableitung, ableiten } from '../ableiten';
import { rumpfDokument } from './teilBau';
import { type Zerlegung, seiteZerlegen } from './zerlegung';

const PX = 461;

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
