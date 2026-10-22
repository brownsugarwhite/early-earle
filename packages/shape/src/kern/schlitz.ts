// Maulschlitz im Seitenumriss (Planseite „Ruhiges Netz und Maulschlitz“, Block 2): Die Lippenanfänge sind markierte
// Knoten (`maulOben` rot, `maulUnten` blau); das Segment zwischen ihnen ist der Schlitz. Für die Ableitung wird er zur
// Sehne (der Körper bekommt keine Kerbe mit gekrümmtem Rand), für die Naht fällt er weg (die Naht hängt an der schwarzen
// Linie ohne Schlitz und endet an den beiden Knoten).
import { type Kubik, minus, plus, punktAuf, teilen } from '../bezier';
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

/** Kubik eines Profilsegments (Segment i läuft von Knoten i zu i + 1). */
function segmentKubik(pr: Profil, i: number): Kubik {
  const n = pr.knoten.length;
  const a = pr.knoten[i]!;
  const b = pr.knoten[(i + 1) % n]!;
  return [a.p, plus(a.p, a.aus), plus(b.p, b.ein), b.p];
}

/**
 * Seitenumriss für die Leiter (14.10. spätnachts): mit Sehne statt Schlitz und ohne Rückknick. Beginnt der kürzere Kiefer
 * auf der Seite des längeren (Überbiss: blauer Anfang über dem roten; Unterbiss: roter unter dem blauen), läuft die Sehne
 * vom vorderen Anfang zurück nach oben bzw. unten, und die Leiter faltet sich vorn: Ring 0 schrumpfte zu einer Sprosse am
 * Pol, die Kappenspalten der Oberlippe drängten sich (Kugel, blauer Anfang 0,2 % hinter dem roten: Lippe 45–65°,
 * geschlossen stach die Unterlippe durch). Die Leiter nimmt deshalb die sichtbare Silhouette: Der hintere Anfang rückt
 * auf seinem eigenen Bogen bis auf die Höhe des vorderen (der Bogen dahinter bleibt exakt, geteilt nach de Casteljau);
 * dazwischen liegt er verdeckt im längeren Kiefer. Naht und Kieferumriss behalten die echte Linie.
 */
export function seiteFuerLeiter(pr: Profil, s: Schlitz): Profil {
  const sehne = seiteMitSehne(pr, s);
  const n = sehne.knoten.length;
  const pO = sehne.knoten[s.oben]!.p;
  const pU = sehne.knoten[s.unten]!.p;
  // längerer Kiefer = Anfang weiter vorn (die Schnauze liegt bei kleinerem x)
  const unterbiss = pU.x < pO.x;
  const iA = unterbiss ? s.unten : s.oben;
  const iB = unterbiss ? s.oben : s.unten;
  const A = sehne.knoten[iA]!.p;
  const B = sehne.knoten[iB]!.p;
  if (!(unterbiss ? B.y < A.y : B.y > A.y)) return sehne;
  // Bogen des kürzeren Kiefers vom Schlitz weg: vorwärts, wenn B auf A folgt, sonst rückwärts
  const vorwaerts = iB === (iA + 1) % n;
  const seg = vorwaerts ? iB : (iB - 1 + n) % n;
  const k = segmentKubik(sehne, seg);
  const tBei = (u: number) => (vorwaerts ? u : 1 - u);
  const N = 64;
  let tC = -1;
  for (let i = 1; i <= N && tC < 0; i++) {
    const t0 = tBei((i - 1) / N);
    const t1 = tBei(i / N);
    const y0 = punktAuf(k, t0).y - A.y;
    const y1 = punktAuf(k, t1).y - A.y;
    if ((y0 < 0) === (y1 < 0)) continue;
    let lo = t0;
    let hi = t1;
    for (let it = 0; it < 40; it++) {
      const mitte = (lo + hi) / 2;
      if ((punktAuf(k, mitte).y - A.y < 0) === (y0 < 0)) lo = mitte;
      else hi = mitte;
    }
    tC = (lo + hi) / 2;
  }
  // keine Kreuzung im ersten Segment hinter dem Anfang: Sehne wie bisher
  if (tC <= 1e-6 || tC >= 1 - 1e-6) return sehne;
  const [links, rechts] = teilen(k, tC);
  const knoten = sehne.knoten.map((kn) => ({ ...kn }));
  if (vorwaerts) {
    const C = rechts[0];
    const nach = (iB + 1) % n;
    knoten[iB] = { ...knoten[iB]!, p: C, aus: minus(rechts[1], C) };
    knoten[nach] = { ...knoten[nach]!, ein: minus(rechts[2], rechts[3]) };
  } else {
    const C = links[3];
    const vor = (iB - 1 + n) % n;
    knoten[iB] = { ...knoten[iB]!, p: C, ein: minus(links[2], C) };
    knoten[vor] = { ...knoten[vor]!, aus: minus(links[1], links[0]) };
  }
  // die Sehne zum gerückten Anfang wieder gerade
  const a = s.segment;
  const b = (a + 1) % n;
  const d = { x: (knoten[b]!.p.x - knoten[a]!.p.x) / 3, y: (knoten[b]!.p.y - knoten[a]!.p.y) / 3 };
  knoten[a] = { ...knoten[a]!, aus: d };
  knoten[b] = { ...knoten[b]!, ein: { x: -d.x, y: -d.y } };
  return { ...sehne, knoten };
}
