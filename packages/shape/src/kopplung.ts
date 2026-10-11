// Kopplung der drei Ansichten: Sie zeigen ein und dasselbe Objekt (Florian, 11.10.2026).
//
// Je zwei Ansichten teilen eine Weltachse: Seite ↔ Front die Höhe (y), Seite ↔ Top die Länge (x),
// Front ↔ Top die Breite (z). Ändert sich in einer Ansicht die Ausdehnung auf einer geteilten Achse,
// folgt die andere Ansicht sofort: Ihr äußerster Punkt geht genau mit, die übrigen Punkte abgestuft
// (wie proportionales Bearbeiten in Blender, quadratischer Abfall zum gegenüberliegenden Rand).

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

function abbilden(pr: Profil, k: Koord, anker: number, L: number, delta: number): Profil {
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
 * Verformt ein Profil so, dass seine Ausdehnung entlang `k` am Ende `ende` den Wert `ziel` erreicht.
 * Der gegenüberliegende Rand (bzw. bei Halbprofilen die Spiegelachse) bleibt stehen.
 */
export function verformen(pr: Profil, k: Koord, ende: 'min' | 'max', ziel: number): Profil {
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
    ergebnis = abbilden(pr, k, anker, L, delta);
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
export function abgleichen(profile: Profile, quelle: Ansicht, basis: Profile = profile): Profile {
  const ergebnis: Profile = { ...basis, [quelle]: profile[quelle] };
  for (const [a, b, achse] of GETEILT) {
    if (a !== quelle && b !== quelle) continue;
    const andere = a === quelle ? b : a;
    const kq = ZUORDNUNG[quelle][achse]!;
    const ka = ZUORDNUNG[andere][achse]!;
    const q = profile[quelle];
    if (achse === 'z') {
      const [lo, hi] = ausdehnung(q, kq);
      ergebnis[andere] = verformen(ergebnis[andere], ka, 'max', Math.max(Math.abs(lo), Math.abs(hi)));
    } else {
      const [lo, hi] = ausdehnung(q, kq);
      ergebnis[andere] = verformen(verformen(ergebnis[andere], ka, 'max', hi), ka, 'min', lo);
    }
  }
  return ergebnis;
}

/** Macht ein (z. B. geladenes) Dokument stimmig: Seite gibt Höhe und Länge vor, Front die Breite. */
export function angleichen(profile: Profile): Profile {
  return abgleichen(abgleichen(profile, 'seite'), 'front');
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
