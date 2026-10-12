// VERSUCH (11.10.2026): Subdivision-Käfig statt Platzhalter-Loft, mit verjüngten Kanten.
// Aufruf: ?versuch=subd&fall=glatt|ring|laengs|beide&form=kugel|ei, Vergleich: ?versuch=loft&form=ei (nur zum Prüfen).

import { type Dokument, angleichen, bewegeKnoten } from '@ee/shape';
import { kaefigAnpassen, kaefigAusProfilen, kastenKaefig, laengsKante, ringKante, unterteilenMehrfach, zuDreiecken } from '@ee/shape/versuch';

export function versuchAktiv(): { modus: 'subd' | 'loft' | 'tiger' | 'tigerkaefig'; fall: string; form: string; zustand: string; schritt: number } | null {
  const q = new URLSearchParams(location.search);
  const v = q.get('versuch');
  if (v !== 'subd' && v !== 'loft' && v !== 'tiger' && v !== 'tigerkaefig') return null;
  return { modus: v, fall: q.get('fall') ?? 'glatt', form: q.get('form') ?? 'kugel', zustand: q.get('zustand') ?? 'zu', schritt: Number(q.get('schritt') ?? 5) };
}

/** Testformen für Vergleichsbilder (`&form=ei`). */
export function versuchForm(dok: Dokument, form: string): Dokument {
  if (form !== 'ei') return dok;
  const p = dok.profile;
  let seite = bewegeKnoten(p.seite, 1, { x: 0.42, y: 0.24 });
  seite = bewegeKnoten(seite, 3, { x: -0.3, y: 0.3 });
  seite = bewegeKnoten(seite, 0, { x: -0.05, y: 0.52 });
  const front = bewegeKnoten(p.front, 1, { x: 0.22, y: 0.22 });
  return { ...dok, profile: angleichen({ seite, front, top: p.top }) };
}

/** Schnauzenkasten: Kasten, dessen Kanten scharf, rund oder verjüngt sind (unabhängig von den Profilen). */
function kasten(fall: string) {
  const halb: [number, number, number] = [0.24, 0.2, 0.2];
  const kanteAn = (m: [number, number, number], achse: 0 | 1 | 2) => {
    // liegt der Kantenmittelpunkt auf einer Kastenkante (zwei Koordinaten am Rand)?
    const rand = [Math.abs(Math.abs(m[0]) - halb[0]) < 1e-6, Math.abs(m[1] - 2 * halb[1]) < 1e-6 || Math.abs(m[1]) < 1e-6, Math.abs(Math.abs(m[2]) - halb[2]) < 1e-6];
    return rand.filter((r, i) => r && i !== achse).length === 2;
  };
  return kastenKaefig(6, halb, (m, a, b) => {
    const achse = (a[0] !== b[0] ? 0 : a[1] !== b[1] ? 1 : 2) as 0 | 1 | 2;
    if (!kanteAn(m, achse)) return 0;
    if (fall === 'kasten-rund') return 0;
    if (fall === 'kasten-scharf') return 4;
    // verjüngt: vorn oben scharf; nach hinten (x) und nach unten (y) läuft die Schärfe auf 0 aus
    const vorn = 1 - (m[0] + halb[0]) / (2 * halb[0]);
    const oben = m[1] / (2 * halb[1]);
    return Math.max(0, 4 * Math.min(1, 1.6 * vorn) * Math.min(1, 1.6 * oben) - 0.2);
  });
}

export function versuchNetz(dok: Dokument, fall: string) {
  if (fall.startsWith('kasten')) return zuDreiecken(unterteilenMehrfach(kasten(fall), 3), 40);
  let k = kaefigAnpassen(kaefigAusProfilen(dok, 9, 12), dok, 6, 3);
  const R = k.ring;
  if (fall === 'ring' || fall === 'beide') {
    // Querkante vorn: oben scharf (3), zu den Flanken verjüngt bis rund (0)
    k = ringKante(k, 3, (j) => {
      const d = Math.min(j % R, R - (j % R));
      return Math.max(0, 3 * (1 - d / (R / 4)));
    });
  }
  if (fall === 'laengs' || fall === 'beide') {
    // Rückenkante: in der Mitte scharf, nach vorn und hinten verjüngt
    k = laengsKante(k, 0, (i) => 3 * Math.sin((Math.PI * (i - 1)) / (k.ringe - 1)));
  }
  return zuDreiecken(unterteilenMehrfach(k, 3), 40);
}
