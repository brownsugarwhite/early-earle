// VERSUCH (12.10.2026 abends): Maul an der Umrisslinie. Florian: „Das Maul muss an der Umrisslinie direkt sitzen und
// ein Maulspalt muss entstehen, so wie bei der Fressen-Pose. Nur so kann ich sauber einen Über- oder Unterbiss
// erstellen.“
//
// Die Maulanfänge (erster Knoten der Ober- und der Unterlinie im geschlossenen Zustand) sind Knoten des Seitenumrisses,
// also gemeinsame Punkte. Zieht man einen, geht der Umriss mit: Unterkiefer-Anfang nach vorn = das Kinn kommt mit
// (Unterbiss), Oberkiefer-Anfang nach vorn = die Schnauze kommt mit (Überbiss). Zwischen den beiden Anfängen zeigt der
// Umriss den Maulspalt: vom Oberlippen-Anfang die Oberlippe entlang zum Mundwinkel und die Unterlippe zurück.

import type { V2 } from '../bezier';
import type { Dokument, Linie3, V3T } from '../dokument';
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

/** Maulrichtung in der Seite: vom Anfang zum Mundwinkel (liegt im Körper), ersatzweise zum zweiten Knoten. */
export function maulRichtung(l: Linie3): V2 {
  const a = l.knoten[0]!.p;
  for (const k of [l.knoten[l.knoten.length - 1], l.knoten[1]]) {
    if (!k) continue;
    const d = { x: k.p[0] - a[0], y: k.p[1] - a[1] };
    if (Math.hypot(d.x, d.y) > 1e-6) return d;
  }
  return { x: 1, y: 0 };
}

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

/** Richtung des Umrisses vom Knoten i aus (kurzes Stück entlang der Kurve), null bei einem Segment ohne Länge. */
function richtungBei(pr: Profil, i: number, richtung: 1 | -1): V2 | null {
  const e = entlang(pr, i, richtung, 2 / 461);
  if (!e) return null;
  const o = pr.knoten[i]!.p;
  const d = { x: e.p.x - o.x, y: e.p.y - o.y };
  return Math.hypot(d.x, d.y) > 1e-9 ? d : null;
}

/** Winkel gegen den Uhrzeigersinn von m nach d (0 … 2π). */
function linksWinkel(m: V2, d: V2): number {
  const a = Math.atan2(m.x * d.y - m.y * d.x, m.x * d.x + m.y * d.y);
  return a < 0 ? a + 2 * Math.PI : a;
}

/**
 * Liegt die Oberkieferseite vom Knotenpaar lo, hi = lo + 1 aus in Richtung kleinerer Nummern (vor lo)? Von der
 * Maulrichtung m (in den Körper hinein) aus erreicht man die Oberkieferseite zuerst gegen den Uhrzeigersinn, wenn das
 * Maul nach +x läuft (Schnauze links), sonst im Uhrzeigersinn. Das gilt an jeder Stelle des Umrisses, auch an der
 * Unterseite des Kopfes, wo beide Nachbarn gleich hoch liegen (12.10. nachts: dort hing offen die Schnauze am Kinn).
 */
function oberseiteVorn(pr: Profil, lo: number, hi: number, m: V2): boolean {
  const vor = richtungBei(pr, lo, -1);
  const nach = richtungBei(pr, hi, 1);
  if (!vor || !nach) return true;
  const a = linksWinkel(m, vor);
  const b = linksWinkel(m, nach);
  return m.x >= 0 ? a < b : a > b;
}

/** Richtung entlang des Umrisses (vom Knoten i aus), in der der Unterkiefer liegt: +1 = zum nächsten Knoten. */
export function kinnRichtung(pr: Profil, i: number, m: V2): 1 | -1 {
  return oberseiteVorn(pr, i, i, m) ? 1 : -1;
}

/** Zwei benachbarte Knoten als Ober- und Unterlippen-Anfang ordnen (Oberkieferseite zuerst). */
function paarOrdnen(pr: Profil, a: number, b: number, m: V2): { oben: number; unten: number } {
  const n = pr.knoten.length;
  const [lo, hi] = (a + 1) % n === b ? [a, b] : [b, a];
  return oberseiteVorn(pr, lo, hi, m) ? { oben: lo, unten: hi } : { oben: hi, unten: lo };
}

/** Benachbarte Maulanfänge, die nahe beieinander in falscher Reihenfolge liegen (Unterlippe auf der Oberkieferseite)? */
function vertauscht(pr: Profil, oben: number, unten: number, m: V2, nah: number): boolean {
  const n = pr.knoten.length;
  if ((oben + 1) % n !== unten && (unten + 1) % n !== oben) return false;
  const a = pr.knoten[oben]!.p;
  const b = pr.knoten[unten]!.p;
  if (Math.hypot(a.x - b.x, a.y - b.y) > nah) return false;
  return paarOrdnen(pr, oben, unten, m).oben !== oben;
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
  const m = maulRichtung(lippen.oben);
  if (unten === null || unten === oben) {
    // Kinnseite: die Richtung entlang des Umrisses, in der der Unterkiefer liegt (über den Winkel zur Maulrichtung)
    const n = pr.knoten.length;
    const o = pr.knoten[oben]!.p;
    const kinn = kinnRichtung(pr, oben, m);
    const kinnSegment = kinn === 1 ? oben : (oben - 1 + n) % n;
    // nahe am gewünschten Anfang auf der Kinnseite? Dann dort einfügen, sonst auf der Kinnseite neben dem Oberlinien-Anfang
    const tr = naechsterAufProfil(pr, start2(lippen.unten));
    const wahl =
      tr && tr.segment === kinnSegment && Math.hypot(tr.punkt.x - o.x, tr.punkt.y - o.y) >= abstand * 0.9 ? { segment: tr.segment, t: tr.t } : entlang(pr, oben, kinn, abstand);
    if (!wahl) return { seite: pr, zu: lippen, oben, unten: null };
    const r = einfuegen(pr, wahl.segment, wahl.t);
    pr = r.profil;
    unten = r.index;
    if (r.index <= oben) oben++;
  } else if (vertauscht(pr, oben, unten, m, 4 * abstand)) {
    // eingebaut, aber in falscher Reihenfolge (ältere Fassung, Unterseite des Kopfes): Anfänge tauschen ihre Knoten
    [oben, unten] = [unten, oben];
    lippen = { ...lippen, oben: mitStart(lippen.oben, pr.knoten[oben]!.p) };
  }
  lippen = { ...lippen, unten: mitStart(lippen.unten!, pr.knoten[unten]!.p) };
  return { seite: pr, zu: lippen, oben, unten };
}

/**
 * Indizes der Maulanfänge im geschlossenen Umriss (die Knoten, auf denen sie liegen). Bei Kiefer gleich zählt ein
 * deckungsgleicher Nachbarknoten als Anfang der Unterlippe (er trennt sich erst offen, siehe Pose-Form); welcher der
 * beiden oben ist, entscheidet die Lage im Umriss (Oberkieferseite zuerst), nicht die Nummer.
 */
export function maulAnfangIndizes(seite: Profil, zu: LippenZu): { oben: number | null; unten: number | null } {
  const oben = knotenBei(seite, start2(zu.oben));
  if (oben === null) return { oben, unten: null };
  if (zu.unten) {
    const unten = knotenBei(seite, start2(zu.unten));
    if (unten !== oben) return { oben, unten };
  }
  const n = seite.knoten.length;
  const o = seite.knoten[oben]!.p;
  for (const k of [(oben + 1) % n, (oben - 1 + n) % n]) {
    const q = seite.knoten[k]!.p;
    if (k !== oben && Math.hypot(q.x - o.x, q.y - o.y) <= MAUL_KNOTEN_TOLERANZ) return paarOrdnen(seite, oben, k, maulRichtung(zu.oben));
  }
  return { oben, unten: null };
}

/**
 * Umriss mit Maulspalt (Seitenansicht): die Segmente des Umrisses ohne das Stück zwischen den beiden Maulanfängen; dazu
 * zeichnet die Anzeige Ober- und Unterlippe bis zum Mundwinkel. Die Anfänge über ihre Lage oder fest über `indizes`
 * (Pose-Form: dieselben Knotennummern wie im Umriss). Liegen Knoten dazwischen, fällt der kürzere Weg weg.
 */
export function umrissMitSpalt(
  seite: Profil,
  zu: LippenZu,
  indizes?: { oben: number; unten: number } | null,
): { segmente: ReturnType<typeof segmente>; spaltSegment: number; oben: number; unten: number } | null {
  if (!zu.unten || seite.art !== 'geschlossen') return null;
  const oben = indizes ? indizes.oben : knotenBei(seite, start2(zu.oben));
  const unten = indizes ? indizes.unten : knotenBei(seite, start2(zu.unten));
  const n = seite.knoten.length;
  if (oben === null || unten === null || oben === unten || oben >= n || unten >= n) return null;
  // Weg vom einen Anfang zum anderen über die wenigsten Segmente: das ist der Spalt
  const vor = (unten - oben + n) % n;
  const [von, schritte] = vor <= n - vor ? [oben, vor] : [unten, n - vor];
  const alle = segmente(seite);
  // offener Pfad: beginnt hinter dem Spalt und läuft einmal herum bis vor den Spalt
  const offen = Array.from({ length: n - schritte }, (_, k) => alle[(von + schritte + k) % n]!);
  return { segmente: offen, spaltSegment: von, oben, unten };
}

/**
 * Pose-Form mit den Maulanfängen genau auf den offenen Lippen (gemeinsame Punkte über die Knotennummern). So bleiben die
 * Kiefer mit der Form verbunden, egal, wie die Lippen gezogen wurden.
 */
export function poseMitAnfaengen(pose: Profil, indizes: { oben: number | null; unten: number | null }, auf: LippenZu): Profil {
  const setze: [number | null, Linie3 | undefined][] = [
    [indizes.oben, auf.oben],
    [indizes.unten, auf.unten],
  ];
  let knoten = pose.knoten;
  for (const [i, l] of setze) {
    if (i === null || !l || i >= knoten.length) continue;
    const p = start2(l);
    const k = knoten[i]!;
    if (Math.hypot(k.p.x - p.x, k.p.y - p.y) < 1e-12) continue;
    if (knoten === pose.knoten) knoten = knoten.slice();
    knoten[i] = { ...k, p };
  }
  return knoten === pose.knoten ? pose : { ...pose, knoten };
}

/**
 * Knoten, die in den Umriss eingefügt wurden (Positionen im Vergleich), in einer zweiten Form gleicher Struktur an
 * derselben Stelle einfügen (formtreu). So bleibt die Punktstruktur der Pose-Form gleich.
 */
export function einfuegungenNachziehen(alt: Profil, neu: Profil, andere: Profil): Profil {
  if (neu.knoten.length <= alt.knoten.length || andere.knoten.length !== alt.knoten.length) return andere;
  let a = alt;
  let b = andere;
  for (let k = 0; k < neu.knoten.length && a.knoten.length < neu.knoten.length; k++) {
    const p = neu.knoten[k]!.p;
    const q = a.knoten[k];
    if (q && Math.hypot(q.p.x - p.x, q.p.y - p.y) < 1e-12) continue;
    // neuer Knoten an Stelle k: liegt auf dem alten Segment k − 1 → k
    const s = (k - 1 + a.knoten.length) % a.knoten.length;
    const tr = naechsterAufProfil(a, p);
    const t = tr && tr.segment === s ? tr.t : 0.5;
    a = einfuegen(a, s, t).profil;
    b = einfuegen(b, s, t).profil;
  }
  return b;
}

/**
 * Maulanfänge im Umriss sichern (Laden, Lippen bearbeiten): fehlen die Knoten, werden sie eingebaut, die Anfänge rasten
 * darauf, eine gespeicherte Pose-Form bekommt dieselben Knoten; liegen sie vertauscht, tauschen die Anfänge ihre Knoten.
 * Unverändert, wenn alles stimmt.
 */
export function maulImUmrissSichern(dok: Dokument): Dokument {
  if (!dok.maul) return dok;
  const ind = maulAnfangIndizes(dok.profile.seite, dok.maul.zu);
  if (ind.oben !== null && !dok.maul.zu.unten) return dok;
  if (ind.oben !== null && ind.unten !== null && !vertauscht(dok.profile.seite, ind.oben, ind.unten, maulRichtung(dok.maul.zu.oben), 12 / 461)) return dok;
  const r = maulAnfaengeEinbauen(dok.profile.seite, dok.maul.zu);
  if (r.seite === dok.profile.seite && r.zu === dok.maul.zu) return dok;
  const pose = dok.posenProfile?.fressen?.seite;
  const poseNeu = pose ? einfuegungenNachziehen(dok.profile.seite, r.seite, pose) : undefined;
  return {
    ...dok,
    profile: { ...dok.profile, seite: r.seite },
    maul: { ...dok.maul, zu: r.zu },
    ...(pose && poseNeu ? { posenProfile: { ...dok.posenProfile, fressen: { ...dok.posenProfile!.fressen, seite: poseNeu } } } : {}),
  };
}
