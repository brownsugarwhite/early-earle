// Maulschlitz im Seitenumriss (Planseite „Ruhiges Netz und Maulschlitz“, Block 2): Die Lippenanfänge sind markierte
// Knoten (`maulOben` rot, `maulUnten` blau); das Segment zwischen ihnen ist der Schlitz. Für die Ableitung wird er zur
// Sehne (der Körper bekommt keine Kerbe mit gekrümmtem Rand), für die Naht fällt er weg (die Naht hängt an der schwarzen
// Linie ohne Schlitz und endet an den beiden Knoten).
import type { Dokument } from '../dokument';
import type { Profil } from '../profil';

/** Schlitz: Knotennummern der Lippenanfänge und das Segment dazwischen (Segment `segment` läuft von Knoten `segment` zu `segment + 1`). */
export type Schlitz = { oben: number; unten: number; segment: number };

/** Schlitz im Seitenumriss, wenn die Kiefer getrennt sind und die beiden Lippenknoten benachbart liegen; sonst null. */
export function schlitzIm(pr: Profil): Schlitz | null {
  if (pr.art !== 'geschlossen') return null;
  const o = pr.knoten.findIndex((k) => k.marke === 'maulOben');
  const u = pr.knoten.findIndex((k) => k.marke === 'maulUnten');
  if (o < 0 || u < 0 || o === u) return null;
  const n = pr.knoten.length;
  if ((o + 1) % n === u) return { oben: o, unten: u, segment: o };
  if ((u + 1) % n === o) return { oben: o, unten: u, segment: u };
  return null;
}

/** Seitenumriss mit dem Schlitz als Sehne: gerades Segment zwischen den Lippenknoten, beide Knoten als Ecken (ihre Marke
 * nimmt sie aus der Ecken-Logik, sie werden keine Ringfalte). */
export function seiteMitSehne(pr: Profil, s: Schlitz): Profil {
  const n = pr.knoten.length;
  const a = s.segment;
  const b = (a + 1) % n;
  const pa = pr.knoten[a]!.p;
  const pb = pr.knoten[b]!.p;
  const d = { x: (pb.x - pa.x) / 3, y: (pb.y - pa.y) / 3 };
  return {
    ...pr,
    knoten: pr.knoten.map((k, i) => (i === a ? { ...k, art: 'ecke' as const, aus: d } : i === b ? { ...k, art: 'ecke' as const, ein: { x: -d.x, y: -d.y } } : k)),
  };
}

/** Dokument für die Ableitung: mit getrennten Kiefern der Seitenumriss mit Sehne statt Schlitz. */
export function dokFuerKern(dok: Dokument): { dok: Dokument; schlitz: Schlitz | null } {
  const s = schlitzIm(dok.profile.seite);
  if (!s) return { dok, schlitz: null };
  return { dok: { ...dok, profile: { ...dok.profile, seite: seiteMitSehne(dok.profile.seite, s) } }, schlitz: s };
}
