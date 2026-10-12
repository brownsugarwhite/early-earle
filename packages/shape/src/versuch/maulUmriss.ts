// VERSUCH (12.10.2026 abends): Maul an der Umrisslinie. Florian: „Das Maul muss an der Umrisslinie direkt sitzen und
// ein Maulspalt muss entstehen, so wie bei der Fressen-Pose. Nur so kann ich sauber einen Über- oder Unterbiss
// erstellen.“
//
// Die Maulanfänge (erster Knoten der Ober- und der Unterlinie im geschlossenen Zustand) sind Knoten des Seitenumrisses,
// also gemeinsame Punkte. Zieht man einen, geht der Umriss mit: Unterkiefer-Anfang nach vorn = das Kinn kommt mit
// (Unterbiss), Oberkiefer-Anfang nach vorn = die Schnauze kommt mit (Überbiss). Zwischen den beiden Anfängen zeigt der
// Umriss den Maulspalt: vom Oberlippen-Anfang die Oberlippe entlang zum Mundwinkel und die Unterlippe zurück.

import type { V2 } from '../bezier';
import type { Linie3, V3T } from '../dokument';
import { type Profil, einfuegen, naechsterAufProfil, segment, segmente } from '../profil';

/** Ein Maulanfang gilt als Knoten des Umrisses, wenn er höchstens so weit entfernt liegt (≈ 0,5 px). */
export const MAUL_KNOTEN_TOLERANZ = 0.5 / 461;

type LippenZu = { oben: Linie3; unten?: Linie3 };

/** Index des Umrissknotens, der auf p liegt, sonst null. */
export function knotenBei(pr: Profil, p: V2, tol = MAUL_KNOTEN_TOLERANZ): number | null {
  let best: number | null = null;
  let d = tol;
  pr.knoten.forEach((k, i) => {
    const e = Math.hypot(k.p.x - p.x, k.p.y - p.y);
    if (e <= d) {
      d = e;
      best = i;
    }
  });
  return best;
}

const start2 = (l: Linie3): V2 => ({ x: l.knoten[0]!.p[0], y: l.knoten[0]!.p[1] });
const mitStart = (l: Linie3, p: V2): Linie3 => ({ knoten: l.knoten.map((k, i) => (i === 0 ? { ...k, p: [p.x, p.y, 0] as V3T } : k)) });

/** Punkt auf dem Umriss, `strecke` (Kachel) entlang der Kurve vom Knoten i aus; Richtung +1 = zum nächsten Knoten. */
function entlang(pr: Profil, i: number, richtung: 1 | -1, strecke: number): { segment: number; t: number; p: V2 } | null {
  const n = pr.knoten.length;
  const s = richtung === 1 ? i : (i - 1 + n) % n;
  if (pr.art !== 'geschlossen' && (s < 0 || s >= n - 1)) return null;
  const seg = segment(pr, s);
  // Bogenlänge grob abtasten
  let laenge = 0;
  let vorher = seg[0];
  const proben: { t: number; l: number }[] = [{ t: 0, l: 0 }];
  for (let k = 1; k <= 64; k++) {
    const t = k / 64;
    const u = 1 - t;
    const q = {
      x: u * u * u * seg[0].x + 3 * u * u * t * seg[1].x + 3 * u * t * t * seg[2].x + t * t * t * seg[3].x,
      y: u * u * u * seg[0].y + 3 * u * u * t * seg[1].y + 3 * u * t * t * seg[2].y + t * t * t * seg[3].y,
    };
    laenge += Math.hypot(q.x - vorher.x, q.y - vorher.y);
    proben.push({ t, l: laenge });
    vorher = q;
  }
  const ziel = Math.min(strecke, laenge * 0.45);
  const von = richtung === 1 ? ziel : laenge - ziel;
  let t = proben[proben.length - 1]!.t;
  for (let k = 1; k < proben.length; k++) {
    if (proben[k]!.l >= von) {
      const a = proben[k - 1]!;
      const b = proben[k]!;
      t = a.t + ((b.t - a.t) * (von - a.l)) / (b.l - a.l || 1);
      break;
    }
  }
  const u = 1 - t;
  const p = {
    x: u * u * u * seg[0].x + 3 * u * u * t * seg[1].x + 3 * u * t * t * seg[2].x + t * t * t * seg[3].x,
    y: u * u * u * seg[0].y + 3 * u * u * t * seg[1].y + 3 * u * t * t * seg[2].y + t * t * t * seg[3].y,
  };
  return { segment: s, t, p };
}

/**
 * Baut die Maulanfänge in den Seitenumriss ein (formtreu eingefügte Knoten, Anfänge rasten exakt darauf). Der Anfang der
 * Unterlinie liegt auf der Kinnseite neben dem Oberlinien-Anfang (mindestens `abstand`), damit ein Spalt entsteht.
 * Unverändert, wenn die Knoten schon da sind.
 */
export function maulAnfaengeEinbauen(seite: Profil, zu: LippenZu, abstand = 3 / 461): { seite: Profil; zu: LippenZu; oben: number; unten: number | null } {
  let pr = seite;
  let oben = knotenBei(pr, start2(zu.oben));
  let lippen: LippenZu = zu;
  if (oben === null) {
    const tr = naechsterAufProfil(pr, start2(zu.oben));
    if (!tr) return { seite, zu, oben: -1, unten: null };
    const r = einfuegen(pr, tr.segment, tr.t);
    pr = r.profil;
    oben = r.index;
    lippen = { ...lippen, oben: mitStart(lippen.oben, pr.knoten[oben]!.p) };
  } else lippen = { ...lippen, oben: mitStart(lippen.oben, pr.knoten[oben]!.p) };
  if (!lippen.unten) return { seite: pr, zu: lippen, oben, unten: null };

  let unten = knotenBei(pr, start2(lippen.unten));
  if (unten === null || unten === oben) {
    // Kinnseite: die Richtung entlang des Umrisses, in der es vom Oberlinien-Anfang nach unten geht
    const o = pr.knoten[oben]!.p;
    const vor = entlang(pr, oben, 1, abstand);
    const rueck = entlang(pr, oben, -1, abstand);
    const kand = [vor, rueck].filter((x): x is NonNullable<typeof x> => !!x);
    const gewuenscht = start2(lippen.unten);
    // nahe am gewünschten Anfang? Dann dort einfügen, sonst auf der Kinnseite neben dem Oberlinien-Anfang
    const tr = naechsterAufProfil(pr, gewuenscht);
    let wahl: { segment: number; t: number; p: V2 } | null = null;
    if (tr && Math.hypot(tr.punkt.x - o.x, tr.punkt.y - o.y) >= abstand * 0.9) wahl = { segment: tr.segment, t: tr.t, p: tr.punkt };
    else wahl = kand.sort((a, b) => a.p.y - b.p.y)[0] ?? null;
    if (!wahl) return { seite: pr, zu: lippen, oben, unten: null };
    const r = einfuegen(pr, wahl.segment, wahl.t);
    pr = r.profil;
    unten = r.index;
    if (r.index <= oben) oben++;
  }
  lippen = { ...lippen, unten: mitStart(lippen.unten!, pr.knoten[unten]!.p) };
  return { seite: pr, zu: lippen, oben, unten };
}

/** Sind zwei Knoten Nachbarn im (geschlossenen) Umriss? Dann das Segment zwischen ihnen. */
function segmentZwischen(pr: Profil, a: number, b: number): number | null {
  const n = pr.knoten.length;
  if ((a + 1) % n === b) return a;
  if ((b + 1) % n === a) return b;
  return null;
}

/**
 * Umriss mit Maulspalt (Seitenansicht, geschlossener Zustand, Kiefer getrennt): die Segmente des Umrisses ohne das
 * Stück zwischen den beiden Maulanfängen, dazu Ober- und Unterlippe bis zum Mundwinkel. null, wenn die Anfänge keine
 * benachbarten Knoten sind (dann bleibt die Anzeige wie bisher).
 */
export function umrissMitSpalt(seite: Profil, zu: LippenZu): { segmente: ReturnType<typeof segmente>; spaltSegment: number; oben: number; unten: number } | null {
  if (!zu.unten || seite.art !== 'geschlossen') return null;
  const oben = knotenBei(seite, start2(zu.oben));
  const unten = knotenBei(seite, start2(zu.unten));
  if (oben === null || unten === null || oben === unten) return null;
  const s = segmentZwischen(seite, oben, unten);
  if (s === null) return null;
  // offener Pfad: beginnt hinter dem Spalt und läuft einmal herum bis vor den Spalt
  const alle = segmente(seite);
  const n = alle.length;
  const offen = Array.from({ length: n - 1 }, (_, k) => alle[(s + 1 + k) % n]!);
  return { segmente: offen, spaltSegment: s, oben, unten };
}
