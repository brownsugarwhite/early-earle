// Versuch 12.10. nachts: Form im Fressen-Tab (Florian: „In der Fressenpose muss ich auch den Shape bearbeiten können!“)
//
// Die Pose hat eine eigene Seitenform (`dok.posenProfile.fressen.seite`) mit derselben Punktstruktur wie der geschlossene
// Umriss. Solange sie fehlt, zeigt der Tab die Form, der der Körper mit dem Kiefer folgt: Jeder Knoten wird über das 3D
// vom geschlossenen auf den offenen Körper abgebildet (gleiche Topologie), die Griffe drehen und strecken sich mit. Beim
// ersten Bearbeiten wird sie gespeichert. Die offenen Maulanfänge sind Knoten dieser Form (gemeinsame Punkte).

import { type Ansicht, type Dokument, type Lippen, type Linie3, type Profil, type V2, type V3T, bewegeKnoten, einfuegen, loeschen, naechsterAufProfil, segment } from '@ee/shape';
import { type Netz, bereichUnterteilen, knotenBei, mundwinkelVerbinden, offenVorschlag, unterteilen } from '@ee/shape/versuch';
import { type Modus, useEditor } from '../state/editorStore';
import { flaechenBereiche } from '../versuch/maulVersuch';
import { maulZuletzt } from './maulKoerper';

/** Bearbeitet diese Ansicht im aktuellen Modus die Pose-Form? (Fressen, Seite) */
export function istPose(modus: Modus, ansicht: Ansicht): boolean {
  return modus === 'fressen' && ansicht === 'seite';
}

/** Gespeicherte Seitenform der Pose, wenn sie zur Punktstruktur des Umrisses passt. */
export function poseSeiteGespeichert(dok: Dokument): Profil | null {
  const p = dok.posenProfile?.fressen?.seite;
  return p && p.knoten.length === dok.profile.seite.knoten.length ? p : null;
}

/** Offene Lippen (gespeichert oder Vorschlag aus „zu“). */
function offeneLippen(dok: Dokument): Lippen | null {
  if (!dok.maul) return null;
  return mundwinkelVerbinden(dok.maul.auf ?? offenVorschlag(dok.maul.zu));
}

/** Einschub für den zweiten Maulanfang (Kiefer gleich): Segment und t, gleich im geschlossenen Umriss nachzutragen. */
type Einschub = { segment: number; t: 0 | 1 };
type Ableitung = { seite: Profil; bau: unknown; maul: Dokument['maul']; ergebnis: Profil; einschub: Einschub | null };
let ableitung: Ableitung | null = null;
const haut = new WeakMap<Netz, { zu: Netz; auf: Netz; mitte: number[] }>();

/** Haut (ohne Tasche) des geschlossenen und offenen Körpers, zwei Unterteilungen, dazu die Punkte der Mittelebene. */
function hautPaar(zu: Netz, auf: Netz, mk: Parameters<typeof flaechenBereiche>[0]): { zu: Netz; auf: Netz; mitte: number[] } {
  let h = haut.get(auf);
  if (h) return h;
  let a = zu;
  let b = auf;
  let bereich = flaechenBereiche(mk, 0);
  for (let s = 0; s < 2; s++) {
    bereich = bereichUnterteilen(a, bereich);
    a = unterteilen(a);
    b = unterteilen(b);
  }
  const inHaut = new Set<number>();
  a.flaechen.forEach((f, i) => {
    if (bereich[i] !== 'tasche') for (const v of f) inHaut.add(v);
  });
  const mitte = [...inHaut].filter((v) => Math.abs(a.punkte[v]![2]) < 1e-6);
  h = { zu: a, auf: b, mitte };
  haut.set(auf, h);
  return h;
}

function punktAufSegment(s: readonly [V2, V2, V2, V2], t: number): V2 {
  const u = 1 - t;
  return {
    x: u * u * u * s[0].x + 3 * u * u * t * s[1].x + 3 * u * t * t * s[2].x + t * t * t * s[3].x,
    y: u * u * u * s[0].y + 3 * u * u * t * s[1].y + 3 * u * t * t * s[2].y + t * t * t * s[3].y,
  };
}

/**
 * Seitenform, der der Körper beim Öffnen folgt: Knoten über das 3D abgebildet (nächster Hautpunkt der Mittelebene,
 * geschlossen → offen), Griffe mit der örtlichen Drehung und Streckung; die Maulanfänge rasten auf die offenen Lippen.
 * Bei Kiefer gleich kommt ein zweiter Anfang dazu (Unterlippe).
 */
function ableiten(dok: Dokument): Ableitung | null {
  const seite = dok.profile.seite;
  const b = maulZuletzt(dok);
  if (!b || !dok.maul) return null;
  if (ableitung && ableitung.seite === seite && ableitung.bau === b && ableitung.maul === dok.maul) return ableitung;
  const h = hautPaar(b.zu, b.auf, b.mk);
  const abbilden = (q: V2): V2 => {
    let best = -1;
    let d = Infinity;
    for (const v of h.mitte) {
      const p = h.zu.punkte[v]!;
      const e = Math.hypot(p[0] - q.x, p[1] - q.y);
      if (e < d) {
        d = e;
        best = v;
      }
    }
    if (best < 0) return q;
    const z = h.zu.punkte[best]!;
    const a = h.auf.punkte[best]!;
    return { x: a[0] + (q.x - z[0]), y: a[1] + (q.y - z[1]) };
  };
  const n = seite.knoten.length;
  const knoten = seite.knoten.map((k, i) => {
    const p = abbilden(k.p);
    // örtliche Drehung und Streckung aus zwei Nachbarpunkten auf der Kurve
    const pv = punktAufSegment(segment(seite, (i - 1 + n) % n), 0.85);
    const pn = punktAufSegment(segment(seite, i), 0.15);
    const qv = abbilden(pv);
    const qn = abbilden(pn);
    const t0 = { x: pn.x - pv.x, y: pn.y - pv.y };
    const t1 = { x: qn.x - qv.x, y: qn.y - qv.y };
    const l0 = Math.hypot(t0.x, t0.y) || 1;
    const l1 = Math.hypot(t1.x, t1.y) || 1;
    const w = Math.atan2(t1.y, t1.x) - Math.atan2(t0.y, t0.x);
    const sk = Math.min(3, Math.max(0.33, l1 / l0));
    const dreh = (v: V2): V2 => ({ x: (v.x * Math.cos(w) - v.y * Math.sin(w)) * sk, y: (v.x * Math.sin(w) + v.y * Math.cos(w)) * sk });
    return { ...k, p, ein: dreh(k.ein), aus: dreh(k.aus) };
  });
  // Maulanfänge exakt auf die offenen Lippen
  const auf = offeneLippen(dok);
  const zu = dok.maul.zu;
  const anfang = (l: Linie3) => knotenBei(seite, { x: l.knoten[0]!.p[0], y: l.knoten[0]!.p[1] });
  const iO = anfang(zu.oben);
  if (iO !== null && auf) knoten[iO] = { ...knoten[iO]!, p: { x: auf.oben.knoten[0]!.p[0], y: auf.oben.knoten[0]!.p[1] } };
  const iU = zu.unten ? anfang(zu.unten) : null;
  if (iU !== null && auf?.unten) knoten[iU] = { ...knoten[iU]!, p: { x: auf.unten.knoten[0]!.p[0], y: auf.unten.knoten[0]!.p[1] } };
  let ergebnis: Profil = { ...seite, knoten };
  let einschub: Einschub | null = null;
  if (!zu.unten && iO !== null && auf?.unten) {
    // Kiefer gleich: zweiter Anfang auf der Kinnseite (der tiefere Nachbar), an derselben Stelle eingefügt
    const naechster = seite.knoten[(iO + 1) % n]!.p.y;
    const vorheriger = seite.knoten[(iO - 1 + n) % n]!.p.y;
    einschub = naechster <= vorheriger ? { segment: iO, t: 0 } : { segment: (iO - 1 + n) % n, t: 1 };
    const r = einfuegen(ergebnis, einschub.segment, einschub.t);
    ergebnis = bewegeKnoten(r.profil, r.index, { x: auf.unten.knoten[0]!.p[0], y: auf.unten.knoten[0]!.p[1] });
  }
  ableitung = { seite, bau: b, maul: dok.maul, ergebnis, einschub };
  return ableitung;
}

/** Seitenform der Pose: gespeichert oder abgeleitet (ohne Maul: der geschlossene Umriss). */
export function poseSeite(dok: Dokument): Profil {
  return poseSeiteGespeichert(dok) ?? ableiten(dok)?.ergebnis ?? dok.profile.seite;
}

/** Offene Maulanfänge folgen den Knoten der Pose-Form (gemeinsame Punkte). */
function aufAnPose(maul: NonNullable<Dokument['maul']>, alt: Profil, neu: Profil): NonNullable<Dokument['maul']> {
  if (alt.knoten.length !== neu.knoten.length) return maul;
  const auf = mundwinkelVerbinden(maul.auf ?? offenVorschlag(maul.zu));
  const folgen = (l: Linie3 | undefined): Linie3 | undefined => {
    if (!l) return l;
    const s = l.knoten[0]!.p;
    const i = knotenBei(alt, { x: s[0], y: s[1] });
    if (i === null) return l;
    const p = neu.knoten[i]!.p;
    if (Math.hypot(p.x - s[0], p.y - s[1]) < 1e-12) return l;
    return { knoten: l.knoten.map((k, j) => (j === 0 ? { ...k, p: [p.x, p.y, 0] as V3T } : k)) };
  };
  const oben = folgen(auf.oben)!;
  const unten = folgen(auf.unten);
  if (maul.auf && oben === auf.oben && unten === auf.unten) return maul;
  return { ...maul, auf: unten ? { oben, unten } : { oben } };
}

/**
 * Seitenform der Pose setzen (ein Undo-Schritt). Punkt eingefügt oder gelöscht: im geschlossenen Umriss ebenso (gleiche
 * Punktstruktur). Die offenen Maulanfänge folgen ihren Knoten.
 */
export function poseSeiteSetzen(neu: Profil) {
  const ed = useEditor.getState();
  const dok = ed.dok;
  let seite = dok.profile.seite;
  const gespeichert = poseSeiteGespeichert(dok);
  const alt = poseSeite(dok);
  if (!gespeichert) {
    // erstes Speichern: zweiten Maulanfang (Kiefer gleich) auch im geschlossenen Umriss nachtragen
    const a = ableiten(dok);
    if (a?.einschub && alt.knoten.length === seite.knoten.length + 1) seite = einfuegen(seite, a.einschub.segment, a.einschub.t).profil;
  }
  if (neu.knoten.length === alt.knoten.length + 1) {
    // eingefügt: an derselben Stelle im geschlossenen Umriss
    const k = neu.knoten.findIndex((kn, i) => i >= alt.knoten.length || Math.hypot(kn.p.x - alt.knoten[i]!.p.x, kn.p.y - alt.knoten[i]!.p.y) > 1e-12);
    const s = (k - 1 + alt.knoten.length) % alt.knoten.length;
    const tr = naechsterAufProfil(alt, neu.knoten[k]!.p);
    seite = einfuegen(seite, s, tr && tr.segment === s ? tr.t : 0.5).profil;
  } else if (neu.knoten.length === alt.knoten.length - 1) {
    const k = alt.knoten.findIndex((kn, i) => i >= neu.knoten.length || Math.hypot(kn.p.x - neu.knoten[i]!.p.x, kn.p.y - neu.knoten[i]!.p.y) > 1e-12);
    seite = loeschen(seite, k);
  } else if (neu.knoten.length !== alt.knoten.length) return;
  const maul = dok.maul ? aufAnPose(dok.maul, alt, neu) : undefined;
  ed.setzeDokument({
    ...dok,
    profile: { ...dok.profile, seite },
    ...(maul ? { maul } : {}),
    posenProfile: { ...(dok.posenProfile ?? {}), fressen: { ...(dok.posenProfile?.fressen ?? {}), seite: neu } },
  });
}

/** Pose-Form verwerfen: Der Fressen-Tab folgt wieder dem Kiefer. */
export function poseSeiteVerwerfen() {
  const ed = useEditor.getState();
  const dok = ed.dok;
  if (!dok.posenProfile?.fressen?.seite) return;
  const rest = { ...dok.posenProfile };
  delete rest.fressen;
  const neu = { ...dok };
  if (Object.keys(rest).length) neu.posenProfile = rest;
  else delete neu.posenProfile;
  ed.setzeDokument(neu);
}
