// Kopplung der drei Ansichten: Sie zeigen ein und dasselbe Objekt (Florian, 11.10.2026).
//
// Je zwei Ansichten teilen eine Weltachse: Seite ↔ Front die Höhe (y), Seite ↔ Top die Länge (x),
// Front ↔ Top die Breite (z). Ändert sich in einer Ansicht die Ausdehnung auf einer geteilten Achse,
// folgt die andere Ansicht sofort.
//
// Beim Bearbeiten (`abgleichen`) geht nur der entsprechende Punkt mit: der äußerste Teil der Kurve samt seinen
// Griffen, Punkte knapp darunter (Band 5 % der Ausdehnung) anteilig, alles andere bleibt stehen. Der oberste Punkt
// der Front und der oberste Punkt der Seite sind derselbe Punkt des Körpers (Florian 12.10.: „Ich würde erwarten,
// dass im Sideview auch nur der oberste Punkt nach oben wandert“). Vorher (11.10.) folgte die ganze andere Ansicht
// mit quadratischem Abfall; das bleibt für `angleichen` (widersprüchliche Dokumente beim Laden glatt verteilt
// reparieren).

import type { V2 } from './bezier';
import type { Ansicht, Dokument } from './dokument';
import { type Profil, achsenRegeln, pfadAbtasten, vollerPfad } from './profil';

type Weltachse = 'x' | 'y' | 'z';
type Koord = 'x' | 'y';
export type Profile = Dokument['profile'];

/** Welche Ansichtskoordinate (u = x, v = y) trägt welche Weltachse. */
const ZUORDNUNG: Record<Ansicht, Partial<Record<Weltachse, Koord>>> = {
  seite: { x: 'x', y: 'y' },
  front: { z: 'x', y: 'y' },
  top: { x: 'x', z: 'y' },
};

const GETEILT: readonly [Ansicht, Ansicht, Weltachse][] = [
  ['seite', 'front', 'y'],
  ['seite', 'top', 'x'],
  ['front', 'top', 'z'],
];

const EPS = 1e-7;

/** Ausdehnung der Kurve (abgetastet, nicht nur die Knoten) entlang einer Ansichtskoordinate. */
export function ausdehnung(pr: Profil, k: Koord): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of pfadAbtasten(vollerPfad(pr), 32)) {
    lo = Math.min(lo, p[k]);
    hi = Math.max(hi, p[k]);
  }
  return [lo, hi];
}

/** Liegt die Koordinate quer zur Spiegelachse (dann zählt nur die Halbbreite ab der Achse)? */
function querZurSpiegelachse(pr: Profil, k: Koord): boolean {
  return pr.art === 'halb' && ((pr.achse === 'senkrecht' && k === 'x') || (pr.achse === 'waagerecht' && k === 'y'));
}

/** Band unter dem äußersten Punkt, in dem Punkte anteilig mitgehen (Anteil der Ausdehnung). */
export const KOPPEL_BAND = 0.05;

export type Kopplungsart = 'punkt' | 'verteilt';

/**
 * Nur der äußerste Teil wandert: Kontrollpunkte (Knoten und Griff-Enden) im Abstand e vom Anker werden auf
 * e + Δ·w(e) abgebildet, w = 0 unterhalb des Bands, 1 am äußersten Punkt und darüber (Griff-Enden außerhalb der
 * Kurve). Beim Schrumpfen liegt das Band unter dem Ziel, Höheres wird darauf zusammengedrückt (monoton).
 */
function abbildenPunkt(pr: Profil, k: Koord, anker: number, richtung: 1 | -1, L: number, delta: number): Profil {
  const s = Math.max(0, (delta >= 0 ? L : L + delta) - KOPPEL_BAND * L);
  // Verschiebung je Koordinate (0 außerhalb des Bands: unberührte Punkte und Griffe bleiben bitgenau)
  const v = (c: number) => {
    const w = Math.min(1, Math.max(0, (richtung * (c - anker) - s) / (L - s)));
    return w > 0 ? richtung * delta * w : 0;
  };
  const knoten = pr.knoten.map((kn) => {
    const c = kn.p[k];
    const vp = v(c);
    const griff = (h: V2): V2 => {
      const vh = v(c + h[k]) - vp;
      return vh === 0 ? h : k === 'x' ? { x: h.x + vh, y: h.y } : { x: h.x, y: h.y + vh };
    };
    const p = vp === 0 ? kn.p : k === 'x' ? { x: c + vp, y: kn.p.y } : { x: kn.p.x, y: c + vp };
    return { ...kn, p, ein: griff(kn.ein), aus: griff(kn.aus) };
  });
  return achsenRegeln({ ...pr, knoten });
}

/** Ganze Ansicht mit quadratischem Abfall zum Anker (Verfahren vom 11.10., jetzt nur noch für `angleichen`). */
function abbildenVerteilt(pr: Profil, k: Koord, anker: number, L: number, delta: number): Profil {
  // Exponent 2 (lokaler Abfall); beim Schrumpfen kleiner, damit die Abbildung monoton bleibt
  let exp = 2;
  if (delta / L < 0) exp = Math.max(1, Math.min(2, (0.85 * L) / -delta));
  const d = delta / L < 0 ? Math.sign(delta) * Math.min(Math.abs(delta), 0.85 * Math.abs(L)) : delta;
  const f = (c: number) => {
    const t = Math.min(1, Math.max(0, (c - anker) / L));
    return c + d * Math.pow(t, exp);
  };
  const fStrich = (c: number) => {
    const t = Math.min(1, Math.max(0, (c - anker) / L));
    return 1 + (d * exp * Math.pow(t, exp - 1)) / L;
  };
  const knoten = pr.knoten.map((kn) => {
    const s = fStrich(kn.p[k]);
    const skal = (v: V2): V2 => (k === 'x' ? { x: v.x * s, y: v.y } : { x: v.x, y: v.y * s });
    const p = k === 'x' ? { x: f(kn.p.x), y: kn.p.y } : { x: kn.p.x, y: f(kn.p.y) };
    return { ...kn, p, ein: skal(kn.ein), aus: skal(kn.aus) };
  });
  return achsenRegeln({ ...pr, knoten });
}

/**
 * Verformt ein Profil so, dass seine Ausdehnung entlang `k` am Ende `ende` den Wert `ziel` erreicht (bei Halbprofilen
 * quer zur Achse: den Abstand `ziel` von der Achse). Der gegenüberliegende Rand bzw. die Spiegelachse bleibt stehen.
 * `punkt`: nur der äußerste Teil wandert; `verteilt`: die ganze Ansicht mit quadratischem Abfall.
 */
export function verformen(pr: Profil, k: Koord, ende: 'min' | 'max', ziel: number, art: Kopplungsart = 'punkt'): Profil {
  if (art === 'verteilt') return verformenVerteilt(pr, k, ende, ziel);
  const halb = querZurSpiegelachse(pr, k);
  const [lo, hi] = ausdehnung(pr, k);
  const anker = halb ? 0 : ende === 'max' ? lo : hi;
  const richtung: 1 | -1 = halb ? (Math.abs(hi) >= Math.abs(lo) ? 1 : -1) : ende === 'max' ? 1 : -1;
  const L = halb ? Math.max(Math.abs(lo), Math.abs(hi)) : hi - lo;
  const zielAbstand = halb ? ziel : richtung * (ziel - anker);
  if (L < EPS || Math.abs(zielAbstand - L) < EPS) return pr;
  const messen = (p: Profil) => {
    const [l2, h2] = ausdehnung(p, k);
    return halb ? Math.max(Math.abs(l2), Math.abs(h2)) : richtung * ((ende === 'max' ? h2 : l2) - anker);
  };
  // Die Kurve folgt dem Zug nicht immer 1:1 (äußerster Punkt zwischen zwei Knoten) → Ziel per Sekante nachführen
  let delta = zielAbstand - L;
  let ergebnis = pr;
  let vorher: { d: number; fehler: number } | null = null;
  for (let i = 0; i < 8; i++) {
    const d = Math.max(delta, -0.95 * L);
    ergebnis = abbildenPunkt(pr, k, anker, richtung, L, d);
    const fehler = zielAbstand - messen(ergebnis);
    if (Math.abs(fehler) < 1e-7) break;
    const steigung = vorher && Math.abs(d - vorher.d) > 1e-12 ? (vorher.fehler - fehler) / (d - vorher.d) : 1;
    vorher = { d, fehler };
    delta = d + fehler / (steigung > 0.05 ? steigung : 1);
  }
  return ergebnis;
}

function verformenVerteilt(pr: Profil, k: Koord, ende: 'min' | 'max', ziel: number): Profil {
  const halb = querZurSpiegelachse(pr, k);
  const [lo, hi] = ausdehnung(pr, k);
  const ext = halb ? Math.max(Math.abs(lo), Math.abs(hi)) : ende === 'max' ? hi : lo;
  const anker = halb ? 0 : ende === 'max' ? lo : hi;
  const L = ext - anker;
  if (Math.abs(L) < EPS || Math.abs(ziel - ext) < EPS) return pr;
  // die Kurve kann zwischen den Knoten über sie hinausragen → Zielwert in wenigen Schritten nachführen
  let delta = ziel - ext;
  let ergebnis = pr;
  for (let i = 0; i < 4; i++) {
    ergebnis = abbildenVerteilt(pr, k, anker, L, delta);
    const [l2, h2] = ausdehnung(ergebnis, k);
    const ext2 = halb ? Math.max(Math.abs(l2), Math.abs(h2)) : ende === 'max' ? h2 : l2;
    const fehler = ziel - ext2;
    if (Math.abs(fehler) < 1e-6) break;
    delta += fehler;
  }
  return ergebnis;
}

/**
 * Gleicht die beiden anderen Ansichten an die Ansicht `quelle` an. `basis` liefert die Ausgangsform der
 * anderen Ansichten (beim Ziehen der Stand vom Gestenbeginn, damit sich nichts aufschaukelt).
 */
export function abgleichen(profile: Profile, quelle: Ansicht, basis: Profile = profile, art: Kopplungsart = 'punkt'): Profile {
  const ergebnis: Profile = { ...basis, [quelle]: profile[quelle] };
  for (const [a, b, achse] of GETEILT) {
    if (a !== quelle && b !== quelle) continue;
    const andere = a === quelle ? b : a;
    const kq = ZUORDNUNG[quelle][achse]!;
    const ka = ZUORDNUNG[andere][achse]!;
    const q = profile[quelle];
    if (achse === 'z') {
      const [lo, hi] = ausdehnung(q, kq);
      ergebnis[andere] = verformen(ergebnis[andere], ka, 'max', Math.max(Math.abs(lo), Math.abs(hi)), art);
    } else {
      const [lo, hi] = ausdehnung(q, kq);
      ergebnis[andere] = verformen(verformen(ergebnis[andere], ka, 'max', hi, art), ka, 'min', lo, art);
    }
  }
  return ergebnis;
}

/**
 * Macht ein (z. B. geladenes) Dokument stimmig: Seite gibt Höhe und Länge vor, Front die Breite. Die Korrektur
 * verteilt sich über die ganze Ansicht, damit größere Widersprüche keine Beule an einem Punkt machen.
 */
export function angleichen(profile: Profile): Profile {
  return abgleichen(abgleichen(profile, 'seite', profile, 'verteilt'), 'front', undefined, 'verteilt');
}

/** Abweichung der geteilten Ausdehnungen (0 = stimmig); für Tests und Prüfungen. */
export function abweichung(profile: Profile): number {
  let max = 0;
  for (const [a, b, achse] of GETEILT) {
    const ea = ausdehnung(profile[a], ZUORDNUNG[a][achse]!);
    const eb = ausdehnung(profile[b], ZUORDNUNG[b][achse]!);
    if (achse === 'z') {
      max = Math.max(max, Math.abs(Math.max(Math.abs(ea[0]), Math.abs(ea[1])) - Math.max(Math.abs(eb[0]), Math.abs(eb[1]))));
    } else {
      max = Math.max(max, Math.abs(ea[0] - eb[0]), Math.abs(ea[1] - eb[1]));
    }
  }
  return max;
}
