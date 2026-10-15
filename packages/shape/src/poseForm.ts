// Fressen wie Editor (Florian 15.10.: „Die komplette Grundidee des Editors basiert darauf, Blendshapes und Bones zu
// kombinieren“; Plan docs/plans/2026-10-15-fressen-wie-editor.md). Eine Pose hat eigene Griffe — drei Umrisse, Spanten,
// Maullinien — mit derselben Punktstruktur wie die Grundform (`Dokument.posenForm`).
// - `poseDokument`: Sicht für die Werkzeuge im Pose-Modus (Grundform mit den Griffen der Pose).
// - `poseZurueck`: Was die Werkzeuge in der Sicht ändern, kommt zurück — Griffe in die Pose, alles andere in die
//   Grundform; eingefügte oder gelöschte Kurvenpunkte gelten formtreu auch in der Grundform (gleiche Struktur).
// - `poseMitfuehren`: Ändert sich die Grundform, wandert jede Pose um dieselbe Verschiebung mit (Knoten und Griffe,
//   Spanten, Maullinien); eingefügte oder gelöschte Punkte gelten formtreu auch in der Pose.
// Rein und DOM-frei; der Editor-Speicher ruft es bei jeder Änderung.

import { type Kubik, type V2, minus, naechsterAufKubik, plus } from './bezier';
import type { Dokument, Knoten3, Linie3, Lippen, Maul, PoseForm, Spant } from './dokument';
import { type Profil, einfuegen, loeschen, segment, segmentAnzahl } from './profil';
import { spantenAngleichen } from './spanten';

type Profile = Dokument['profile'];
const ANSICHTEN = ['seite', 'front', 'top'] as const;
/** gleiche Lage (Kachel): darunter gelten zwei Knoten als derselbe Punkt */
const GLEICH = 1e-9;

const gleicheLage = (a: V2, b: V2) => Math.abs(a.x - b.x) < GLEICH && Math.abs(a.y - b.y) < GLEICH;

/** Pose-Form des Dokuments (oder null). */
export function poseForm(dok: Dokument, name: string): PoseForm | null {
  return dok.posenForm?.[name] ?? null;
}

/** Griffe der Grundform als Pose-Form (Start einer neuen Pose: die Pose ist zunächst die Grundform). */
export function formAusGrundform(dok: Dokument): PoseForm {
  return { profile: dok.profile, ...(dok.spanten ? { spanten: dok.spanten } : {}), ...(dok.maul ? { maul: dok.maul } : {}) };
}

/** Sicht der Werkzeuge im Pose-Modus: die Grundform mit den Griffen der Pose; ohne eigene Pose-Form die Grundform selbst. */
export function poseDokument(dok: Dokument, name: string): Dokument {
  const f = dok.posenForm?.[name];
  if (!f) return dok;
  const d: Dokument = { ...dok, profile: f.profile };
  if (f.spanten) d.spanten = f.spanten;
  else delete d.spanten;
  if (f.maul) d.maul = f.maul;
  else delete d.maul;
  return d;
}

// ---------- Struktur: ein Punkt eingefügt oder gelöscht ----------

/** Änderung der Punktstruktur zwischen zwei Fassungen derselben Kurve. */
export type StrukturAenderung = { art: 'gleich' } | { art: 'eingefuegt'; segment: number; t: number; index: number } | { art: 'geloescht'; index: number } | { art: 'unbekannt' };

/**
 * Ein Punkt eingefügt oder gelöscht? Erkannt an den Lagen der übrigen Knoten (Einfügen und Löschen ändern nur Griffe der
 * Nachbarn, nie ihre Lage). Eingefügt: Segment und t auf der alten Kurve (nächster Punkt), damit dasselbe formtreu in
 * einer anderen Kurve derselben Struktur geschehen kann.
 */
export function strukturAenderung(alt: Profil, neu: Profil): StrukturAenderung {
  const a = alt.knoten;
  const b = neu.knoten;
  if (a.length === b.length) return { art: 'gleich' };
  if (b.length === a.length + 1) {
    let k = 0;
    while (k < a.length && gleicheLage(a[k]!.p, b[k]!.p)) k++;
    for (let i = k; i < a.length; i++) if (!gleicheLage(a[i]!.p, b[i + 1]!.p)) return { art: 'unbekannt' };
    // neuer Knoten bei Index k liegt im alten Segment k − 1 (geschlossen: k = 0 → letztes Segment)
    const s = k > 0 ? k - 1 : alt.art === 'geschlossen' ? a.length - 1 : -1;
    if (s < 0 || s >= segmentAnzahl(alt)) return { art: 'unbekannt' };
    const tr = naechsterAufKubik(segment(alt, s), b[k]!.p);
    return { art: 'eingefuegt', segment: s, t: tr.t, index: k };
  }
  if (b.length === a.length - 1) {
    let k = 0;
    while (k < b.length && gleicheLage(a[k]!.p, b[k]!.p)) k++;
    for (let i = k; i < b.length; i++) if (!gleicheLage(a[i + 1]!.p, b[i]!.p)) return { art: 'unbekannt' };
    return { art: 'geloescht', index: k };
  }
  return { art: 'unbekannt' };
}

/** Dieselbe Strukturänderung auf eine Kurve gleicher Struktur anwenden (formtreu); null, wenn es nicht geht. */
export function strukturAnwenden(ziel: Profil, aenderung: StrukturAenderung, quelleNeu?: Profil): Profil | null {
  if (aenderung.art === 'gleich') return ziel;
  if (aenderung.art === 'unbekannt') return null;
  if (aenderung.art === 'eingefuegt') {
    const r = einfuegen(ziel, aenderung.segment, aenderung.t);
    if (r.index !== aenderung.index && !(aenderung.index === 0 && r.index === ziel.knoten.length)) return null;
    // Rolle des neuen Knotens (Ecke, Marke) wie in der Quelle
    const kq = quelleNeu?.knoten[aenderung.index];
    if (!kq || r.index !== aenderung.index) return r.profil;
    const knoten = r.profil.knoten.slice();
    knoten[r.index] = { ...knoten[r.index]!, art: kq.art, ...(kq.marke ? { marke: kq.marke } : {}), ...(kq.haerte !== undefined ? { haerte: kq.haerte } : {}) };
    return { ...r.profil, knoten } as Profil;
  }
  if (aenderung.index < 0 || aenderung.index >= ziel.knoten.length) return null;
  const neu = loeschen(ziel, aenderung.index);
  return neu.knoten.length === ziel.knoten.length - 1 ? neu : null;
}

// ---------- Mitführen: Grundform geändert → Pose wandert mit ----------

/**
 * Kurve der Pose mitführen, wenn die Grundform-Kurve von `alt` nach `neu` geändert wurde: gleiche Struktur → jeder Knoten
 * der Pose um die Verschiebung seines Grundform-Knotens (Lage und Griffe, Art und Marke wie die Grundform); ein Punkt
 * eingefügt/gelöscht → dasselbe formtreu in der Pose. Passt die Pose nicht zur alten Struktur, wird sie die neue Grundform.
 */
export function kurveMitfuehren(pose: Profil, alt: Profil, neu: Profil): Profil {
  if (alt === neu) return pose;
  let p = pose;
  if (pose.knoten.length !== alt.knoten.length) return neu;
  const ae = strukturAenderung(alt, neu);
  let altGleich = alt;
  if (ae.art === 'unbekannt') return neu;
  if (ae.art !== 'gleich') {
    const r = strukturAnwenden(p, ae, neu);
    const ra = strukturAnwenden(alt, ae, neu);
    if (!r || !ra) return neu;
    p = r;
    altGleich = ra;
  }
  // jetzt gleiche Struktur: Verschiebung je Knoten (die formtreue Änderung der Grundform ist in `altGleich` schon enthalten)
  const knoten = p.knoten.map((k, i) => {
    const a = altGleich.knoten[i]!;
    const b = neu.knoten[i]!;
    const d = minus(b.p, a.p);
    const out = { ...k, p: plus(k.p, d), ein: plus(k.ein, minus(b.ein, a.ein)), aus: plus(k.aus, minus(b.aus, a.aus)), art: b.art };
    if (b.marke) out.marke = b.marke;
    else delete out.marke;
    if (b.haerte !== undefined) out.haerte = b.haerte;
    else delete out.haerte;
    return out;
  });
  return { ...p, knoten } as Profil;
}

const plus3 = (a: readonly [number, number, number], b: readonly [number, number, number], c: readonly [number, number, number]): [number, number, number] => [a[0] + b[0] - c[0], a[1] + b[1] - c[1], a[2] + b[2] - c[2]];

/** 3D-Linie (Maul) mitführen: gleiche Knotenzahl → Verschiebung je Knoten; sonst die neue Linie der Grundform. */
function linieMitfuehren(pose: Linie3 | undefined, alt: Linie3 | undefined, neu: Linie3 | undefined): Linie3 | undefined {
  if (!neu) return undefined;
  if (!pose || !alt || alt === neu) return pose ?? neu;
  if (pose.knoten.length !== alt.knoten.length || alt.knoten.length !== neu.knoten.length) return neu;
  return {
    knoten: pose.knoten.map(
      (k, i): Knoten3 => ({ p: plus3(k.p, neu.knoten[i]!.p, alt.knoten[i]!.p), ein: plus3(k.ein, neu.knoten[i]!.ein, alt.knoten[i]!.ein), aus: plus3(k.aus, neu.knoten[i]!.aus, alt.knoten[i]!.aus), art: neu.knoten[i]!.art }),
    ),
  };
}

function lippenMitfuehren(pose: Lippen | undefined, alt: Lippen | undefined, neu: Lippen | undefined): Lippen | undefined {
  if (!neu) return undefined;
  if (!pose || !alt) return neu;
  const oben = linieMitfuehren(pose.oben, alt.oben, neu.oben)!;
  const unten = linieMitfuehren(pose.unten, alt.unten, neu.unten);
  return unten ? { oben, unten } : { oben };
}

function maulMitfuehren(pose: Maul | undefined, alt: Maul | undefined, neu: Maul | undefined): Maul | undefined {
  if (!neu) return undefined;
  if (!pose || !alt) return neu;
  if (alt === neu) return pose;
  const zu = lippenMitfuehren(pose.zu, alt.zu, neu.zu)!;
  const auf = lippenMitfuehren(pose.auf, alt.auf, neu.auf);
  return auf ? { zu, auf } : { zu };
}

/** Spanten mitführen: je Spant (über die Lage f zugeordnet) Lage und Kurven; neue Spanten der Grundform kommen dazu. */
function spantenMitfuehren(pose: Spant[] | undefined, alt: Spant[] | undefined, neu: Spant[] | undefined): Spant[] | undefined {
  if (!neu?.length) return undefined;
  if (alt === neu && pose) return pose;
  const altListe = alt ?? [];
  const poseListe = pose ?? [];
  return neu.map((sn) => {
    // derselbe Spant: gleiche Nummer bei gleicher Anzahl, sonst die nächste Lage f in der alten Liste
    let ia = altListe.length === neu.length ? neu.indexOf(sn) : -1;
    if (ia < 0) {
      let best = Infinity;
      altListe.forEach((sa, i) => {
        const d = Math.abs(sa.f - sn.f);
        if (d < best && d < 0.02) {
          best = d;
          ia = i;
        }
      });
    }
    const sa = ia >= 0 ? altListe[ia] : undefined;
    const sp = ia >= 0 && poseListe.length === altListe.length ? poseListe[ia] : undefined;
    if (!sa || !sp) return sn;
    const out: Spant = { ...sp, f: sp.f + (sn.f - sa.f), profil: kurveMitfuehren(sp.profil, sa.profil, sn.profil) };
    if (sn.unten) out.unten = sp.unten && sa.unten ? kurveMitfuehren(sp.unten, sa.unten, sn.unten) : sn.unten;
    else delete out.unten;
    return out;
  });
}

/** Eine Pose-Form mit der Grundform mitführen (alt → neu). */
export function formMitfuehren(f: PoseForm, alt: Dokument, neu: Dokument): PoseForm {
  const profile = { ...f.profile } as Profile;
  for (const a of ANSICHTEN) if (alt.profile[a] !== neu.profile[a]) profile[a] = kurveMitfuehren(f.profile[a], alt.profile[a], neu.profile[a]);
  const out: PoseForm = { profile };
  const spanten = alt.spanten === neu.spanten ? f.spanten : spantenMitfuehren(f.spanten, alt.spanten, neu.spanten);
  // Spanten haben die Punktstruktur der Front: Front der Pose geändert → Spanten der Pose angleichen
  if (spanten?.length) out.spanten = f.profile.front.knoten.length !== profile.front.knoten.length ? spantenAngleichen(f.profile.front, profile.front, spanten) : spanten;
  const maul = alt.maul === neu.maul ? f.maul : maulMitfuehren(f.maul, alt.maul, neu.maul);
  if (maul) out.maul = maul;
  return out;
}

/** Grundform geändert (alt → neu): jede Pose-Form wandert mit (außer `ausser`, die gerade selbst bearbeitet wird). */
export function poseMitfuehren(alt: Dokument, neu: Dokument, ausser?: string): Dokument {
  if (!neu.posenForm) return neu;
  if (alt.profile === neu.profile && alt.spanten === neu.spanten && alt.maul === neu.maul) return neu;
  const posenForm: Record<string, PoseForm> = {};
  for (const [name, f] of Object.entries(neu.posenForm)) posenForm[name] = name === ausser ? f : formMitfuehren(f, alt, neu);
  return { ...neu, posenForm };
}

// ---------- Rückweg: Sicht im Pose-Modus geändert ----------

/**
 * Änderung der Sicht im Pose-Modus zurück ins Dokument: Griffe (Umrisse, Spanten, Maullinien) in die Pose `name`, alles
 * andere (Ausstattung, Zähne, Käfig, Name, Kanten …) in die Grundform. Wurde in einer Pose-Kurve ein Punkt eingefügt oder
 * gelöscht, geschieht dasselbe formtreu in der Grundform (gleiche Punktstruktur); andere Posen wandern mit.
 */
export function poseZurueck(basis: Dokument, altSicht: Dokument, neuSicht: Dokument, name: string): Dokument {
  const griffe = neuSicht.profile !== altSicht.profile || neuSicht.spanten !== altSicht.spanten || neuSicht.maul !== altSicht.maul;
  let b: Dokument = { ...neuSicht, profile: basis.profile };
  if (basis.spanten) b.spanten = basis.spanten;
  else delete b.spanten;
  if (basis.maul) b.maul = basis.maul;
  else delete b.maul;
  if (basis.posenForm) b.posenForm = basis.posenForm;
  else delete b.posenForm;
  if (!griffe) return b;
  // Struktur der Grundform-Umrisse an die Pose angleichen (ein Punkt eingefügt oder gelöscht)
  const profile = { ...basis.profile } as Profile;
  for (const a of ANSICHTEN) {
    if (neuSicht.profile[a] === altSicht.profile[a]) continue;
    const ae = strukturAenderung(altSicht.profile[a], neuSicht.profile[a]);
    if (ae.art === 'gleich') continue;
    const r = basis.profile[a].knoten.length === altSicht.profile[a].knoten.length ? strukturAnwenden(basis.profile[a], ae, neuSicht.profile[a]) : null;
    if (r) profile[a] = r;
  }
  if (ANSICHTEN.some((a) => profile[a] !== basis.profile[a])) {
    const alt = b;
    b = { ...b, profile };
    if (b.spanten?.length && basis.profile.front.knoten.length !== profile.front.knoten.length) b.spanten = spantenAngleichen(basis.profile.front, profile.front, b.spanten);
    // andere Posen erleben dieselbe Strukturänderung der Grundform
    b = poseMitfuehren(alt, b, name);
  }
  const form: PoseForm = { profile: neuSicht.profile, ...(neuSicht.spanten ? { spanten: neuSicht.spanten } : {}), ...(neuSicht.maul ? { maul: neuSicht.maul } : {}) };
  b.posenForm = { ...(b.posenForm ?? {}), [name]: form };
  return b;
}

/** Pose verwerfen: die Pose ist wieder die Grundform. */
export function poseVerwerfen(dok: Dokument, name: string): Dokument {
  if (!dok.posenForm?.[name]) return dok;
  const posenForm = { ...dok.posenForm };
  delete posenForm[name];
  const d = { ...dok, posenForm };
  if (!Object.keys(posenForm).length) delete (d as Partial<Dokument>).posenForm;
  return d;
}

/** Hat die Pose eigene Griffe, die sich von der Grundform unterscheiden? */
export function poseHatForm(dok: Dokument, name: string): boolean {
  const f = dok.posenForm?.[name];
  if (!f) return false;
  return f.profile !== dok.profile || f.spanten !== dok.spanten || f.maul !== dok.maul;
}

/** Kubik-Helfer für Tests: Punkt einer Kurve bei (Segment, t). */
export function kurvenPunkt(p: Profil, s: number, t: number): V2 {
  const k: Kubik = segment(p, s);
  const u = 1 - t;
  return {
    x: u * u * u * k[0].x + 3 * u * u * t * k[1].x + 3 * u * t * t * k[2].x + t * t * t * k[3].x,
    y: u * u * u * k[0].y + 3 * u * u * t * k[1].y + 3 * u * t * t * k[2].y + t * t * t * k[3].y,
  };
}
